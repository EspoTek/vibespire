/// <reference types="node" />
// Sweep balance knobs: run N seeds per setting and print a comparison table.
// Usage:
//   npx tsx sim/sweep.ts --runs 200 --class breaker,graft,chronist --policy greedy --workers auto \
//     --knob enemyDamagePct.1=85,90,95,100 [--knob class.maxHpDelta=-5,0,5] [--mode each|grid] \
//     [--set restHealPct=35] [--content test|real] [--seed-prefix sweep] [--out sweep.json]
// --knob key=v1,v2,... : values to try (keys as in sim/overrides.ts: TUNING paths or class.* stats).
// --mode each (default): vary one knob at a time, the others at their current value; grid: every combination.
// --set: fixed overrides applied to every setting. Same seeds for every setting (paired comparison).

import { writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { allClasses } from '../src/content';
import { useTestPack } from './content';
import type { Aggregate } from './aggregate';
import { batch, batchParallel, POLICIES, type BatchProgress } from './batch';
import { applyOverrides, argsAll, describeOverrides, parseSets, type Overrides } from './overrides';

function arg(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0) return null;
  const v = process.argv[i + 1];
  if (v === undefined || v.startsWith('--')) throw new Error(`--${name} needs a value`);
  return v;
}

interface Knob {
  key: string;
  values: number[];
}

function parseKnob(spec: string): Knob {
  const i = spec.indexOf('=');
  if (i <= 0) throw new Error(`--knob expects key=v1,v2,..., got '${spec}'`);
  const key = spec.slice(0, i);
  const values = spec
    .slice(i + 1)
    .split(',')
    .map((x) => {
      const n = Number(x);
      if (!Number.isFinite(n)) throw new Error(`--knob ${key}: '${x}' is not a number`);
      return n;
    });
  if (values.length === 0) throw new Error(`--knob ${key}: no values`);
  return { key, values };
}

export function settings(knobs: readonly Knob[], mode: 'each' | 'grid'): Overrides[] {
  if (knobs.length === 0) return [{}];
  if (mode === 'each') return knobs.flatMap((k) => k.values.map((v) => ({ [k.key]: v })));
  let acc: Overrides[] = [{}];
  for (const k of knobs) acc = acc.flatMap((o) => k.values.map((v) => ({ ...o, [k.key]: v })));
  return acc;
}

export interface SweepRow {
  overrides: Overrides;
  classId: string;
  runs: number;
  winRate: number;
  beatA1Boss: number;
  beatA2Boss: number;
  avgFloor: number;
  dmgPerCombat: number;
  turnsPerCombat: number;
  hpAtA1Boss: number;
  skipRate: number;
}

export function rowsOf(o: Overrides, agg: Aggregate): SweepRow[] {
  return Object.entries(agg.metrics).map(([cls, m]) => {
    const combats = Object.values(m.encounters);
    const fights = combats.reduce((a, e) => a + e.fights, 0);
    const w = (f: (e: (typeof combats)[number]) => number): number => (fights ? combats.reduce((a, e) => a + f(e) * e.fights, 0) / fights : 0);
    const byClass = agg.byClass[cls];
    if (!byClass) throw new Error(`aggregate lacks byClass.${cls}`);
    return {
      overrides: o,
      classId: cls,
      runs: m.runs,
      winRate: m.winRate,
      beatA1Boss: m.milestones.beatA1Boss,
      beatA2Boss: m.milestones.beatA2Boss,
      avgFloor: byClass.avgFloor,
      dmgPerCombat: w((e) => e.avgDamage),
      turnsPerCombat: w((e) => e.avgTurns),
      hpAtA1Boss: m.bossEntryHp[0]?.avgHpPct ?? 0,
      skipRate: m.skipRate,
    };
  });
}

function printTable(rows: readonly SweepRow[]): void {
  const pct = (x: number): string => `${(x * 100).toFixed(1)}%`;
  const head = ['setting', 'class', 'runs', 'win', 'beat A1 boss', 'beat A2 boss', 'avg floor', 'HP lost/combat', 'turns/combat', 'HP% at A1 boss'];
  const body = rows.map((r) => [
    describeOverrides(r.overrides),
    r.classId,
    String(r.runs),
    pct(r.winRate),
    pct(r.beatA1Boss),
    pct(r.beatA2Boss),
    r.avgFloor.toFixed(1),
    r.dmgPerCombat.toFixed(1),
    r.turnsPerCombat.toFixed(2),
    pct(r.hpAtA1Boss),
  ]);
  const widths = head.map((h, i) => Math.max(h.length, ...body.map((b) => (b[i] ?? '').length)));
  const line = (cells: readonly string[]): string => cells.map((c, i) => c.padEnd(widths[i] ?? 0)).join('  ');
  console.log(line(head));
  console.log(widths.map((w) => '-'.repeat(w)).join('  '));
  for (const b of body) console.log(line(b));
}

async function main(): Promise<void> {
  const runs = Number(arg('runs') ?? '200');
  if (!Number.isInteger(runs) || runs <= 0) throw new Error('--runs must be a positive integer');
  const content = arg('content') ?? 'real';
  if (content !== 'test' && content !== 'real') throw new Error(`--content must be 'test' or 'real'`);
  if (content === 'test') useTestPack();
  const clsArg = arg('class');
  const classes = clsArg === null ? allClasses().map((c) => c.id) : clsArg.split(',');
  if (classes.length === 0) throw new Error('no classes');
  const policyName = arg('policy') ?? 'greedy';
  const policy = POLICIES[policyName];
  if (!policy) throw new Error(`unknown policy '${policyName}'`);
  const workersArg = arg('workers');
  const workers = workersArg === null ? 1 : workersArg === 'auto' ? Math.max(1, cpus().length - 1) : Number(workersArg);
  if (!Number.isInteger(workers) || workers <= 0) throw new Error('--workers must be a positive integer or auto');
  const mode = arg('mode') ?? 'each';
  if (mode !== 'each' && mode !== 'grid') throw new Error(`--mode must be each or grid`);
  const knobs = argsAll(process.argv, 'knob').map(parseKnob);
  const fixed = parseSets(process.argv);
  const prefix = arg('seed-prefix') ?? 'sweep';
  const seeds = Array.from({ length: runs }, (_, i) => `${prefix}-${i}`);
  const list = settings(knobs, mode);
  console.error(`[sweep] ${list.length} settings x ${runs} runs x ${classes.length} classes, policy=${policyName} content=${content} workers=${workers} fixed=${describeOverrides(fixed)}`);
  const rows: SweepRow[] = [];
  const t0 = Date.now();
  for (const [i, setting] of list.entries()) {
    const o = { ...fixed, ...setting };
    const progress = (p: BatchProgress): void => {
      console.error(`[sweep] setting ${i + 1}/${list.length} (${describeOverrides(o)}): ${p.done}/${p.total} runs, wins=${p.wins}, ${(p.elapsedMs / 1000).toFixed(1)}s`);
    };
    let agg: Aggregate;
    if (workers > 1) agg = (await batchParallel(seeds, classes, policyName, content, workers, progress, 3000, o)).aggregate;
    else {
      const undo = applyOverrides(o);
      agg = batch(seeds, classes, policy, progress, 3000).aggregate;
      undo();
    }
    rows.push(...rowsOf(o, agg));
    console.error(`[sweep] setting ${i + 1}/${list.length} done, total ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
  printTable(rows);
  const out = arg('out');
  if (out) writeFileSync(out, JSON.stringify(rows, null, 2));
}

main().catch((e: unknown) => {
  console.error(e);
  process.exitCode = 1;
});
