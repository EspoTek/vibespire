/// <reference types="node" />
// Batch runner: N seeds x classes with one policy; prints progress every ~2s and an aggregate JSON.
// Usage: npx tsx sim/batch.ts --runs 200 --class test_class --content test [--policy random]
//        [--seed-prefix sim] [--workers 4] [--out file.json] [--set key=value ...]
// --content test uses the test pack only (sim/content.ts); 'real' (default) uses only the real packs.
// --workers N > 1 fans runs out over worker_threads (same results as sequential: each run is pure).
// --set applies balance overrides (TUNING paths, class stats; see sim/overrides.ts) in every worker.

import { writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { allClasses } from '../src/content';
import { useTestPack } from './content';
import { aggregate, type Aggregate } from './aggregate';
import { applyOverrides, describeOverrides, parseSets, type Overrides } from './overrides';
import { greedyPolicy } from './policies/greedy';
import { greedy2Policy } from './policies/greedy2';
import { randomPolicy } from './policies/random';
import { runOne } from './run';
import type { Policy, RunResult } from './types';

export const POLICIES: Record<string, Policy> = { random: randomPolicy, greedy: greedyPolicy, greedy2: greedy2Policy };

export interface BatchProgress {
  done: number;
  total: number;
  wins: number;
  classId: string;
  elapsedMs: number;
}

interface Job {
  seed: string;
  classId: string;
}

function jobsFor(seeds: readonly string[], classIds: readonly string[]): Job[] {
  return classIds.flatMap((classId) => seeds.map((seed) => ({ seed: `${seed}-${classId}`, classId })));
}

/** Run every seed for every class (sequentially) and aggregate. `onProgress` is called at most every `progressMs`. */
export function batch(
  seeds: readonly string[],
  classIds: readonly string[],
  policy: Policy,
  onProgress: (p: BatchProgress) => void = () => {},
  progressMs = 2000,
): { results: RunResult[]; aggregate: Aggregate } {
  const t0 = Date.now();
  let lastLog = t0;
  const results: RunResult[] = [];
  const jobs = jobsFor(seeds, classIds);
  for (const job of jobs) {
    results.push(runOne(job.seed, job.classId, policy));
    const now = Date.now();
    if (now - lastLog >= progressMs) {
      lastLog = now;
      onProgress({ done: results.length, total: jobs.length, wins: results.filter((r) => r.won).length, classId: job.classId, elapsedMs: now - t0 });
    }
  }
  return { results, aggregate: aggregate(results, Date.now() - t0) };
}

interface WorkerInput {
  jobs: Job[];
  policy: string;
  content: 'test' | 'real';
  overrides: Overrides;
  strict: boolean;
}

type WorkerMsg = { kind: 'result'; result: RunResult } | { kind: 'done' };

/** Parallel batch over worker_threads. Results are re-ordered to the sequential order. */
export async function batchParallel(
  seeds: readonly string[],
  classIds: readonly string[],
  policyName: string,
  content: 'test' | 'real',
  workers: number,
  onProgress: (p: BatchProgress) => void = () => {},
  progressMs = 2000,
  overrides: Overrides = {},
  strict = false,
): Promise<{ results: RunResult[]; aggregate: Aggregate }> {
  const t0 = Date.now();
  let lastLog = t0;
  const jobs = jobsFor(seeds, classIds);
  const order = new Map(jobs.map((j, i) => [j.seed, i]));
  const results: RunResult[] = [];
  const chunks: Job[][] = Array.from({ length: workers }, () => []);
  jobs.forEach((j, i) => chunks[i % workers]?.push(j));
  const self = fileURLToPath(import.meta.url);
  // Workers load this .ts file: keep the tsx loader even when the parent runs under another loader (vitest).
  const execArgv = process.execArgv.some((x) => x.includes('tsx')) ? process.execArgv : [...process.execArgv, '--import', 'tsx'];
  await Promise.all(
    chunks
      .filter((c) => c.length > 0)
      .map(
        (chunk) =>
          new Promise<void>((resolve, reject) => {
            const input: WorkerInput = { jobs: chunk, policy: policyName, content, overrides, strict };
            const w = new Worker(self, { workerData: input, execArgv });
            w.on('message', (m: WorkerMsg) => {
              if (m.kind === 'done') return;
              results.push(m.result);
              const now = Date.now();
              if (now - lastLog >= progressMs) {
                lastLog = now;
                onProgress({ done: results.length, total: jobs.length, wins: results.filter((r) => r.won).length, classId: m.result.classId, elapsedMs: now - t0 });
              }
            });
            w.on('error', reject);
            w.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`sim worker exited with code ${code}`))));
          }),
      ),
  );
  results.sort((a, b) => (order.get(a.seed) ?? 0) - (order.get(b.seed) ?? 0));
  return { results, aggregate: aggregate(results, Date.now() - t0) };
}

function workerMain(): void {
  const input = workerData as WorkerInput;
  if (input.content === 'test') useTestPack();
  applyOverrides(input.overrides);
  const policy = POLICIES[input.policy];
  if (!policy) throw new Error(`unknown policy '${input.policy}'`);
  for (const job of input.jobs) {
    const msg: WorkerMsg = { kind: 'result', result: runOne(job.seed, job.classId, policy, { strict: input.strict }) };
    parentPort?.postMessage(msg);
  }
  parentPort?.postMessage({ kind: 'done' } satisfies WorkerMsg);
}

function arg(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0) return null;
  const v = process.argv[i + 1];
  if (v === undefined || v.startsWith('--')) throw new Error(`--${name} needs a value`);
  return v;
}

async function main(): Promise<void> {
  const runsArg = arg('runs');
  const runs = runsArg === null ? 100 : Number(runsArg);
  if (!Number.isInteger(runs) || runs <= 0) throw new Error(`--runs must be a positive integer, got ${runsArg}`);
  const contentArg = arg('content') ?? 'real';
  if (contentArg !== 'test' && contentArg !== 'real') throw new Error(`--content must be 'test' or 'real', got ${contentArg}`);
  if (contentArg === 'test') useTestPack();
  const clsArg = arg('class');
  const classes = clsArg === null ? allClasses().map((c) => c.id) : clsArg.split(',');
  if (classes.length === 0) throw new Error(`no classes registered for --content ${contentArg} (use --content test until the real packs land)`);
  const policyName = arg('policy') ?? 'random';
  const policy = POLICIES[policyName];
  if (!policy) throw new Error(`unknown policy '${policyName}' (have: ${Object.keys(POLICIES).join(', ')})`);
  const prefix = arg('seed-prefix') ?? 'sim';
  const out = arg('out');
  const workersArg = arg('workers');
  const workers = workersArg === null ? 1 : workersArg === 'auto' ? Math.max(1, cpus().length - 1) : Number(workersArg);
  if (!Number.isInteger(workers) || workers <= 0) throw new Error(`--workers must be a positive integer or 'auto', got ${workersArg}`);
  const seeds = Array.from({ length: runs }, (_, i) => `${prefix}-${i}`);
  const overrides = parseSets(process.argv);
  if (workers === 1) applyOverrides(overrides);

  console.error(`[sim] ${runs * classes.length} runs: classes=${classes.join(',')} policy=${policy.name} content=${contentArg} workers=${workers} overrides=${describeOverrides(overrides)}`);
  const progress = (p: BatchProgress): void => {
    const rate = p.done / (p.elapsedMs / 1000);
    console.error(`[sim] ${p.done}/${p.total} runs (${p.classId}) wins=${p.wins} ${rate.toFixed(1)} runs/s elapsed=${(p.elapsedMs / 1000).toFixed(1)}s`);
  };
  const { aggregate: agg } =
    workers > 1 ? await batchParallel(seeds, classes, policyName, contentArg, workers, progress, 2000, overrides) : batch(seeds, classes, policy, progress);
  const json = JSON.stringify({ ...agg, meta: { content: contentArg, seedPrefix: prefix, overrides } }, null, 2);
  if (out) writeFileSync(out, json);
  console.log(json);
  console.error(`[sim] done: ${agg.runs} runs in ${(agg.elapsedMs / 1000).toFixed(1)}s`);
}

if (!isMainThread) workerMain();
else {
  const entry = process.argv[1];
  if (entry !== undefined && import.meta.url === pathToFileURL(entry).href) {
    main().catch((e: unknown) => {
      // Report and exit non-zero; the error itself is printed in full.
      console.error(e);
      process.exitCode = 1;
    });
  }
}
