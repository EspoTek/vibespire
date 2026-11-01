// Vibespire real-browser e2e runner. See tests/e2e/README.md.
//
//   npx tsx tests/e2e/run.ts [suite] [--runs N] [--class a,b] [--pages P] [--speed S] [--seed-prefix X]
//                            [--headed] [--replay <failure dir>] [--steps N]
//
// Suites: smoke (default), full, actions, input, bosses, scenarios. Exit code 1 if anything failed.

import fs from 'node:fs';
import path from 'node:path';
import type { Browser } from 'playwright';
import type { Action } from '../../src/engine/index.ts';
import { playRun, type RunJob, type RunOutcome } from './drivers/action.ts';
import { playInputRun, type InputJob } from './drivers/input.ts';
import { OUT, type FailureRecord } from './lib/artifacts.ts';
import { launchBrowser, startServer } from './lib/env.ts';
import { BootError, VibePage } from './lib/vibe.ts';
import { scenarioJobs, type Scenario } from './scenarios.ts';

const CLASSES = ['breaker', 'graft', 'chronist'] as const;

interface Args {
  suite: string;
  runs: number | null;
  classes: string[];
  pages: number;
  speed: number;
  seedPrefix: string;
  headed: boolean;
  replay: string | null;
  steps: number | null;
  /** Keep only jobs whose label contains this (e.g. "orchid", "shop-", "input"). */
  only: string | null;
  /** Stop starting new jobs after this many minutes (the rest are reported as not run). */
  budgetMin: number;
}

/** docs/v2/BRIEF.md "Resource limits": one browser with at most 2 pages on the shared 16 GB machine. */
const MAX_PAGES = 2;

function parseArgs(argv: string[]): Args {
  const a: Args = { suite: 'smoke', runs: null, classes: [...CLASSES], pages: MAX_PAGES, speed: 40, seedPrefix: 'E2E', headed: false, replay: null, steps: null, only: null, budgetMin: 45 };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i] as string;
    const val = (): string => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`${k} needs a value`);
      return v;
    };
    if (k === '--runs') a.runs = Number(val());
    else if (k === '--class') a.classes = val().split(',');
    else if (k === '--pages') a.pages = Number(val());
    else if (k === '--speed') a.speed = Number(val());
    else if (k === '--seed-prefix') a.seedPrefix = val();
    else if (k === '--headed') a.headed = true;
    else if (k === '--replay') a.replay = val();
    else if (k === '--steps') a.steps = Number(val());
    else if (k === '--only') a.only = val();
    else if (k === '--budget-min') a.budgetMin = Number(val());
    else if (k.startsWith('--')) throw new Error(`unknown flag ${k}`);
    else a.suite = k;
  }
  for (const c of a.classes) if (!(CLASSES as readonly string[]).includes(c)) throw new Error(`unknown class ${c} (have ${CLASSES.join(', ')})`);
  if (!Number.isInteger(a.pages) || a.pages < 1) throw new Error('--pages must be a positive integer');
  if (a.pages > MAX_PAGES) throw new Error(`--pages ${a.pages}: at most ${MAX_PAGES} (docs/v2/BRIEF.md "Resource limits": one browser, 2 pages; the machine is shared)`);
  if (!(a.budgetMin > 0)) throw new Error('--budget-min must be > 0');
  return a;
}

type Job = { driver: 'action'; job: RunJob } | { driver: 'input'; job: InputJob } | { driver: 'scenario'; scenario: Scenario };

function actionJobs(n: number, a: Args, kind: string, extra: Partial<RunJob> = {}): Job[] {
  const out: Job[] = [];
  for (let i = 0; i < n; i++) {
    const classId = a.classes[i % a.classes.length] as string;
    // tiers alternate (ruling 71): odd runs are Heroic
    out.push({ driver: 'action', job: { kind, seed: `${a.seedPrefix}${i}`, classId, difficulty: i % 2 === 1 ? 'heroic' : 'standard', ...(a.steps ? { maxSteps: a.steps } : {}), ...extra } });
  }
  return out;
}

function inputJobs(n: number, a: Args, maxSteps: number): Job[] {
  const devices = ['mouse', 'keyboard', 'gamepad'] as const;
  const out: Job[] = [];
  for (let i = 0; i < n; i++) {
    out.push({ driver: 'input', job: { kind: 'input', seed: `${a.seedPrefix}I${i}`, classId: a.classes[i % a.classes.length] as string, device: devices[i % devices.length] as InputJob['device'], difficulty: i % 2 === 1 ? 'heroic' : 'standard', maxSteps: a.steps ?? maxSteps } });
  }
  return out;
}

function buildJobs(a: Args): Job[] {
  if (a.replay) {
    const rec = JSON.parse(fs.readFileSync(path.join(a.replay, 'failure.json'), 'utf8')) as FailureRecord;
    console.log(`[e2e] replaying ${rec.actions.length} actions of ${rec.kind} ${rec.classId} ${rec.seed}: ${rec.reason}`);
    return [{ driver: 'action', job: { kind: `replay-${rec.kind}`, seed: rec.seed, classId: rec.classId, replay: rec.actions as Action[], ...(rec.startSave ? { startSave: rec.startSave } : {}) } }];
  }
  switch (a.suite) {
    case 'smoke': // ~2 min: one short run per class, the boss scenarios of act 1, one input run per device
      return [
        ...actionJobs(a.runs ?? 3, a, 'smoke', { maxSteps: a.steps ?? 120 }),
        ...scenarioJobs({ acts: [1], classes: a.classes.slice(0, 1) }).map((scenario): Job => ({ driver: 'scenario', scenario })),
        ...inputJobs(3, a, 60),
      ];
    case 'actions': return actionJobs(a.runs ?? 30, a, 'run', {});
    case 'input': return inputJobs(a.runs ?? 3, a, 400);
    case 'bosses': return scenarioJobs({ acts: [1, 2, 3], classes: a.classes, everyClass: true }).filter((s) => s.kind.startsWith('boss')).map((scenario): Job => ({ driver: 'scenario', scenario }));
    case 'scenarios': return scenarioJobs({ acts: [1, 2, 3], classes: a.classes }).map((scenario): Job => ({ driver: 'scenario', scenario }));
    case 'full':
      return [
        ...scenarioJobs({ acts: [1, 2, 3], classes: a.classes }).map((scenario): Job => ({ driver: 'scenario', scenario })),
        ...actionJobs(a.runs ?? 30, a, 'run', {}),
        ...actionJobs(Math.max(3, Math.floor((a.runs ?? 30) / 10)), { ...a, seedPrefix: `${a.seedPrefix}R` }, 'reload', { reloadEvery: 37 }),
        ...inputJobs(3, a, 400),
      ];
    default: throw new Error(`unknown suite ${a.suite} (smoke, full, actions, input, bosses, scenarios)`);
  }
}

/** Failures caused by the test machine (network change, page navigated away), retried once. */
const INFRA = [/ERR_NETWORK_CHANGED/, /ERR_NETWORK_IO_SUSPENDED/, /Execution context was destroyed/, /Target page, context or browser has been closed/, /^boot: page\.goto: Timeout/];
function isInfra(error: string | null): boolean { return error !== null && INFRA.some((r) => r.test(error)); }

function label(j: Job): string {
  if (j.driver === 'scenario') return `${j.scenario.kind} ${j.scenario.classId}`;
  return `${j.job.kind} ${j.job.classId} ${j.job.seed}`;
}

async function runJob(browser: Browser, url: string, a: Args, j: Job, progress: (s: string) => void): Promise<RunOutcome> {
  let vp: VibePage;
  try {
    vp = await VibePage.open(browser, url, {
      timeScale: a.speed,
      viewport: j.driver === 'input' ? { width: 1280, height: 720 } : { width: 640, height: 360 },
      gamepad: j.driver === 'input' && j.job.device === 'gamepad',
    });
  } catch (e) {
    const job = j.driver === 'scenario' ? { kind: j.scenario.kind, seed: '-', classId: j.scenario.classId } : j.job;
    return { job, status: 'failed', act: 0, floor: 0, steps: 0, ms: 0, bossFights: [], violations: [], error: `boot: ${e instanceof Error ? e.message : String(e)}`, artifacts: null };
  }
  try {
    if (j.driver === 'action') return await playRun(vp, j.job, (n, s) => progress(`${label(j)}: step ${n}, act ${s.act} floor ${s.floor} ${s.phase}`));
    if (j.driver === 'input') return await playInputRun(vp, j.job, (n, s) => progress(`${label(j)}: step ${n}, act ${s.act} floor ${s.floor} ${s.phase}`));
    return await j.scenario.run(vp, (msg) => progress(`${label(j)}: ${msg}`));
  } finally {
    await vp.close();
  }
}

async function main(): Promise<void> {
  const a = parseArgs(process.argv.slice(2));
  const jobs = buildJobs(a).filter((j) => a.only === null || label(j).includes(a.only));
  if (jobs.length === 0) throw new Error(`no jobs match --only ${a.only ?? ''}`);
  fs.mkdirSync(OUT, { recursive: true });
  const t0 = Date.now();
  console.log(`[e2e] suite ${a.replay ? 'replay' : a.suite}: ${jobs.length} jobs, ${a.pages} pages, speed x${a.speed}`);
  const server = await startServer();
  const browser = await launchBrowser(a.headed);
  // a killed run must not leave a browser or a vite server behind (Ctrl-C, kill, a closed terminal)
  let shuttingDown = false;
  const shutdown = (sig: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[e2e] ${sig}: closing the browser and the vite server`);
    void Promise.allSettled([browser.close(), server.close()]).then(() => process.exit(130));
  };
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) process.once(sig, () => shutdown(sig));
  console.log(`[e2e] vite ${server.url}, chromium ${browser.version()} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  // preflight: if the game doesn't boot at all (another agent mid-edit, a broken content pack), say so once
  try {
    const probe = await VibePage.open(browser, server.url, { timeScale: 1 });
    await probe.close();
  } catch (e) {
    await browser.close();
    await server.close();
    console.log(`[e2e] ABORT: ${e instanceof BootError ? e.message : `preflight failed: ${String(e)}`}`);
    process.exitCode = 2;
    return;
  }
  console.log(`[e2e] preflight boot ok (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  const results: RunOutcome[] = [];
  const live = new Map<number, string>();
  let next = 0;
  let retried = 0;
  let skipped = 0;
  const tick = setInterval(() => {
    const done = results.length;
    const failed = results.filter((r) => r.status === 'failed').length;
    const wins = results.filter((r) => r.status === 'victory').length;
    console.log(`[e2e] ${((Date.now() - t0) / 1000).toFixed(0)} s: ${done}/${jobs.length} done (${failed} failed, ${wins} won) | ${[...live.values()].join(' | ')}`);
  }, 5000);
  const worker = async (slot: number): Promise<void> => {
    for (;;) {
      if (Date.now() - t0 > a.budgetMin * 60_000) {
        if (next < jobs.length) console.log(`[e2e] budget of ${a.budgetMin} min used: ${jobs.length - next} job(s) not started`);
        skipped = Math.max(skipped, jobs.length - next);
        return;
      }
      const i = next++;
      const j = jobs[i];
      if (!j) return;
      live.set(slot, `${label(j)}: starting`);
      let r = await runJob(browser, server.url, a, j, (s) => live.set(slot, s));
      if (r.status === 'failed' && isInfra(r.error)) {
        // the machine, not the game: a network change dropped requests, the page was navigated away
        console.log(`[e2e] RETRY ${label(j)} (environment, not the game): ${r.error?.split('\n')[0] ?? ''}`);
        retried++;
        r = await runJob(browser, server.url, a, j, (s) => live.set(slot, s));
      }
      results.push(r);
      const tag = r.status === 'failed' ? 'FAIL' : 'ok  ';
      console.log(`[e2e] ${tag} ${label(j)} → ${r.status} act ${r.act} floor ${r.floor}, ${r.steps} steps, ${(r.ms / 1000).toFixed(1)} s${r.bossFights.length ? `, bosses ${r.bossFights.join(' ')}` : ''}${r.error ? `\n       ${r.error.split('\n')[0] ?? ''}${r.violations.map((v) => `\n       - ${v.code}: ${v.msg}`).join('')}\n       artifacts: ${r.artifacts ?? '-'}` : ''}`);
      live.delete(slot);
    }
  };
  try {
    await Promise.all(Array.from({ length: Math.min(a.pages, jobs.length) }, (_, k) => worker(k)));
  } finally {
    clearInterval(tick);
    await browser.close();
    await server.close();
  }
  const failed = results.filter((r) => r.status === 'failed');
  const byStatus = new Map<string, number>();
  for (const r of results) byStatus.set(r.status, (byStatus.get(r.status) ?? 0) + 1);
  const reachedAct3 = results.filter((r) => r.act === 3).length;
  const bosses = results.flatMap((r) => r.bossFights);
  const summary = {
    suite: a.replay ? 'replay' : a.suite, jobs: jobs.length, retriedForEnvironment: retried, notStarted: skipped, seconds: Math.round((Date.now() - t0) / 1000),
    status: Object.fromEntries(byStatus), reachedAct3, bossFights: bosses.length, distinctBosses: [...new Set(bosses)].sort(),
    failures: failed.map((r) => ({ job: `${r.job.kind} ${r.job.classId} ${r.job.seed}`, error: r.error?.split('\n')[0], violations: r.violations, artifacts: r.artifacts })),
  };
  fs.writeFileSync(path.join(OUT, `summary-${summary.suite}.json`), JSON.stringify(summary, null, 1));
  console.log(`[e2e] ${summary.suite}: ${results.length} jobs in ${summary.seconds} s: ${[...byStatus].map(([k, v]) => `${v} ${k}`).join(', ')}; reached act 3 in ${reachedAct3}; ${bosses.length} boss fights (${summary.distinctBosses.length} distinct)`);
  if (failed.length) {
    console.log(`[e2e] ${failed.length} FAILED (artifacts under ${OUT})`);
    process.exitCode = 1;
  }
}

await main();
