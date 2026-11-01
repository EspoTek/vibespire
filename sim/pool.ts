/// <reference types="node" />
// Worker pool for v2 batches: a dynamic job queue over worker_threads (runs vary 10x in length, so
// workers pull the next job when they finish). Every job is a pure function of (seed, class, policy,
// grant), so results do not depend on the worker count or the order they arrive in.
// Progress (done / total, runs/s, ETA, a caller label) goes to stderr every `progressMs`.

import { cpus } from 'node:os';
import { fileURLToPath } from 'node:url';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { applyOverrides, type Overrides } from './overrides';
import { policyByName } from './policies/personas';
import { runOne, type Grant } from './run';
import type { Difficulty } from '../src/engine/types';
import type { Policy, RunResult } from './types';

export interface PoolJob {
  id: number;
  seed: string;
  classId: string;
  policy: string;
  grant?: Grant;
  /** 'full': the whole RunResult; 'compact': the CompactResult summary (counterfactual batches). */
  mode: 'full' | 'compact';
  /** Difficulty tier of the run (rulings 71, 74); absent = standard. */
  difficulty?: Difficulty;
}

export interface CompactResult {
  won: boolean;
  floor: number;
  act: number;
  endCause: RunResult['endCause'];
  /** HP at the end of the run (0 on a death). */
  hp: number;
  /** relic_trigger events of the granted relic. */
  relicTriggers: number;
  /** Plays and draws of the granted card id (all copies). */
  cardPlays: number;
  cardDraws: number;
  /** Uses of the granted potion. */
  potionUses: number;
}

/**
 * A run that threw (an engine or policy bug) comes back as `error` instead of a result: it is printed
 * at once, counted, and the caller writes it to its errors file and the report. The batch goes on.
 */
export type PoolOut = { id: number; full?: RunResult; compact?: CompactResult; error?: { seed: string; classId: string; policy: string; message: string; stack: string } };

type ToWorker = { kind: 'job'; job: PoolJob } | { kind: 'stop' };
type FromWorker = { kind: 'ready' } | { kind: 'out'; out: PoolOut };

export function defaultWorkers(): number {
  return Math.max(1, cpus().length - 1);
}

export function compactOf(r: RunResult, grant: Grant | undefined): CompactResult {
  const card = grant?.cards?.[0];
  const cs = card !== undefined ? r.detail.cards[card] : undefined;
  return {
    won: r.won,
    floor: r.floorReached,
    act: r.act,
    endCause: r.endCause,
    hp: r.won ? (r.hpByFloor[r.hpByFloor.length - 1] ?? 0) : 0,
    relicTriggers: grant?.relic !== undefined ? (r.detail.relicTriggers[grant.relic] ?? 0) : 0,
    cardPlays: cs?.played ?? 0,
    cardDraws: cs?.drawn ?? 0,
    potionUses: grant?.potion !== undefined ? (r.detail.potions[grant.potion]?.used ?? 0) : 0,
  };
}

const policyCache = new Map<string, Policy>();

export function runJob(job: PoolJob): PoolOut {
  const key = `${job.policy}|${job.classId}`;
  let policy = policyCache.get(key);
  if (!policy) {
    policy = policyByName(job.policy, job.classId);
    policyCache.set(key, policy);
  }
  const r = runOne(job.seed, job.classId, policy, { ...(job.grant ? { grant: job.grant } : {}), ...(job.difficulty ? { difficulty: job.difficulty } : {}) });
  return job.mode === 'full' ? { id: job.id, full: r } : { id: job.id, compact: compactOf(r, job.grant) };
}

export interface PoolOpts {
  workers?: number;
  overrides?: Overrides;
  label?: string;
  progressMs?: number;
}

/** Run every job over worker threads; `onOut` receives results as they finish (any order). */
export async function runPool(jobs: readonly PoolJob[], onOut: (o: PoolOut) => void, opts: PoolOpts = {}): Promise<void> {
  const n = Math.min(opts.workers ?? defaultWorkers(), Math.max(1, jobs.length));
  const label = opts.label ?? 'pool';
  const progressMs = opts.progressMs ?? 3000;
  const t0 = Date.now();
  let lastLog = t0;
  let next = 0;
  let done = 0;
  let wins = 0;
  let errors = 0;
  const self = fileURLToPath(import.meta.url);
  // A .ts worker needs the tsx loader; the esbuild bundle (sim/bundle.ts) is plain JS.
  const execArgv = !self.endsWith('.ts') || process.execArgv.some((x) => x.includes('tsx')) ? process.execArgv : [...process.execArgv, '--import', 'tsx'];
  const log = (force: boolean): void => {
    const now = Date.now();
    if (!force && now - lastLog < progressMs) return;
    lastLog = now;
    const el = (now - t0) / 1000;
    const rate = done / Math.max(el, 1e-3);
    const eta = rate > 0 ? (jobs.length - done) / rate : 0;
    console.error(`[${label}] ${done}/${jobs.length} runs  wins=${wins}  errors=${errors}  ${rate.toFixed(1)} runs/s  elapsed=${el.toFixed(0)}s  eta=${eta.toFixed(0)}s`);
  };
  await Promise.all(
    Array.from(
      { length: n },
      () =>
        new Promise<void>((resolve, reject) => {
          const w = new Worker(self, { workerData: { overrides: opts.overrides ?? {} }, execArgv });
          const feed = (): void => {
            const job = jobs[next];
            if (job === undefined) {
              w.postMessage({ kind: 'stop' } satisfies ToWorker);
              return;
            }
            next += 1;
            w.postMessage({ kind: 'job', job } satisfies ToWorker);
          };
          w.on('message', (m: FromWorker) => {
            if (m.kind === 'ready') {
              feed();
              feed();
              return;
            }
            done += 1;
            if (m.out.full?.won || m.out.compact?.won) wins += 1;
            if (m.out.error) {
              errors += 1;
              console.error(`[${label}] RUN ERROR #${errors} seed=${m.out.error.seed} class=${m.out.error.classId} policy=${m.out.error.policy}: ${m.out.error.message}`);
            }
            onOut(m.out);
            log(false);
            feed();
          });
          w.on('error', reject);
          w.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${label} worker exited with code ${code}`))));
        }),
    ),
  );
  log(true);
  if (done !== jobs.length) throw new Error(`${label}: ${done} of ${jobs.length} jobs finished`);
}

function workerMain(): void {
  const { overrides } = workerData as { overrides: Overrides };
  applyOverrides(overrides);
  let stopping = false;
  let busy = 0;
  parentPort?.on('message', (m: ToWorker) => {
    if (m.kind === 'stop') {
      stopping = true;
      if (busy === 0) parentPort?.close();
      return;
    }
    busy += 1;
    let out: PoolOut;
    try {
      out = runJob(m.job);
    } catch (e: unknown) {
      // Not swallowed: the main thread prints it, and the batch's errors file and report list it.
      const err = e instanceof Error ? e : new Error(String(e));
      out = { id: m.job.id, error: { seed: m.job.seed, classId: m.job.classId, policy: m.job.policy, message: err.message, stack: err.stack ?? '' } };
    }
    busy -= 1;
    parentPort?.postMessage({ kind: 'out', out } satisfies FromWorker);
    if (stopping && busy === 0) parentPort?.close();
  });
  parentPort?.postMessage({ kind: 'ready' } satisfies FromWorker);
}

if (!isMainThread && (workerData as { overrides?: Overrides } | null)?.overrides !== undefined) workerMain();
