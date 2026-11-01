import '../testpack-only';
import { cpus } from 'node:os';
import { describe, expect, it } from 'vitest';
import { Game, hashString, nextU32, TUNING } from '../../src/engine';
import { applyTuningOverrides } from '../../src/engine/tuning';
import { batchParallel } from '../../sim/batch';
import { applyOverrides, parseSet } from '../../sim/overrides';
import { greedyPolicy } from '../../sim/policies/greedy';
import { randomPolicy } from '../../sim/policies/random';
import { renderReport } from '../../sim/report';
import { runOne } from '../../sim/run';
import { aggregate } from '../../sim/aggregate';
import type { RunResult } from '../../sim/types';

const CLS = 'test_class';
const WORKERS = Math.max(2, Math.min(8, cpus().length - 1));
/**
 * CPU seconds (all threads) for 200 greedy test-pack runs, worker start-up included: measured 332 s on
 * 2026-11-01 (8 workers, 44 s wall, M-series). The budget is about 1.8× that, so it catches a performance
 * regression without flaking on a slower or busier machine.
 */
const CPU_BUDGET_S = 600;

const strip = (r: RunResult): Omit<RunResult, 'elapsedMs'> => {
  const { elapsedMs: _ignored, ...rest } = r;
  return rest;
};

describe('greedy policy', () => {
  it('is deterministic: same seed, same run', () => {
    for (const seed of ['det-1', 'det-2']) {
      const a = runOne(seed, CLS, greedyPolicy, { strict: true });
      const b = runOne(seed, CLS, greedyPolicy, { strict: true });
      expect(strip(b)).toEqual(strip(a));
    }
  }, 60_000);

  it('look-ahead never mutates the real state', () => {
    const g = Game.newRun('lookahead-1', CLS, { atomic: false });
    const prng = hashString('lookahead');
    let checked = 0;
    for (let i = 0; i < 400 && g.state.phase !== 'victory' && g.state.phase !== 'defeat'; i++) {
      const legal = g.legalActions();
      const before = JSON.stringify(g.state);
      const a = greedyPolicy.choose(g, legal, nextU32(prng));
      if (g.state.phase === 'combat') checked++;
      expect(JSON.stringify(g.state)).toBe(before);
      expect(legal).toContain(a);
      g.apply(a);
    }
    expect(checked).toBeGreaterThan(20);
  }, 60_000);

  it('never picks an illegal action over 50 runs (strict mode)', async () => {
    const seeds = Array.from({ length: 50 }, (_, i) => `legal-${i}`);
    const { results } = await batchParallel(seeds, [CLS], 'greedy', 'test', WORKERS, () => {}, 2000, {}, true);
    expect(results).toHaveLength(50);
  }, 120_000);

  it('beats the random policy decisively and plays 200 runs within a CPU budget', async () => {
    const seeds = Array.from({ length: 200 }, (_, i) => `wr-${i}`);
    // CPU time, not wall time: worker_threads share this process, so process.cpuUsage() counts them, and
    // CPU time does not stretch when other jobs load the machine (the 60 s wall-clock check flaked at
    // load 190 on 2026-10-30).
    const cpu0 = process.cpuUsage();
    const greedy = await batchParallel(seeds, [CLS], 'greedy', 'test', WORKERS, () => {}, 2000, {}, true);
    const cpu = process.cpuUsage(cpu0);
    const cpuSeconds = (cpu.user + cpu.system) / 1e6;
    const random = seeds.map((s) => runOne(`${s}-${CLS}`, CLS, randomPolicy));
    const gWin = greedy.results.filter((r) => r.won).length / seeds.length;
    const rWin = random.filter((r) => r.won).length / seeds.length;
    expect(gWin).toBeGreaterThanOrEqual(0.8);
    // The test pack got easier for every player under the v2 engine rules (Bloom Spill, the next-turn
    // bank, Shed, Timeline batches; 1300+ engine lines since v1): on 2026-11-01 random won 0.430, and
    // v1's committed random policy won 0.395 on the same 200 seeds, so the rise is the rules, not the
    // policy. The HP lever cannot move it (tests run at neutral tuning). What this test guards is that
    // greedy beats random decisively: the 0.4 gap stays; the absolute random cap moves from 0.35 to 0.5.
    expect(rWin).toBeLessThanOrEqual(0.5);
    expect(gWin - rWin).toBeGreaterThanOrEqual(0.4);
    expect(cpuSeconds).toBeLessThan(CPU_BUDGET_S);
  }, 300_000);
});

describe('stalemate guard', () => {
  it('records a combat over the turn limit as a loss and returns normally', () => {
    const r = runOne('stale-1', CLS, greedyPolicy, { maxCombatTurns: 1 });
    expect(r.endCause).toBe('stalemate');
    expect(r.won).toBe(false);
    expect(r.deathEncounter).toBeTruthy();
    expect(r.combats[r.combats.length - 1]?.won).toBe(false);
    const m = aggregate([r], 1).metrics[CLS];
    expect(m?.stalemates).toBe(1);
  });
});

describe('balance overrides', () => {
  it('sets TUNING leaves by path and restores them', () => {
    const before = TUNING.difficulty.standard.enemyDamagePct[1];
    const rare = TUNING.cardOdds.monster.rare;
    const undo = applyTuningOverrides({ 'difficulty.standard.enemyDamagePct.1': 85, 'cardOdds.monster.rare': 9 });
    expect(TUNING.difficulty.standard.enemyDamagePct[1]).toBe(85);
    expect(TUNING.cardOdds.monster.rare).toBe(9);
    undo();
    expect(TUNING.difficulty.standard.enemyDamagePct[1]).toBe(before);
    expect(TUNING.cardOdds.monster.rare).toBe(rare);
  });

  it('throws on unknown paths and non-number leaves', () => {
    expect(() => applyTuningOverrides({ 'nope.x': 1 })).toThrow(/not a TUNING group/);
    expect(() => applyTuningOverrides({ 'caps.nope': 1 })).toThrow(/no such key/);
    expect(() => applyTuningOverrides({ caps: 1 })).toThrow(/not a number/);
    expect(() => parseSet('restHealPct=abc')).toThrow(/not a number/);
  });

  it('changes class stats and the engine sees them', () => {
    const base = Game.newRun('ovr-1', CLS).state.player.maxHp;
    const undo = applyOverrides({ 'class.maxHpDelta': 10 });
    expect(Game.newRun('ovr-1', CLS).state.player.maxHp).toBe(base + 10);
    undo();
    expect(Game.newRun('ovr-1', CLS).state.player.maxHp).toBe(base);
  });
});

describe('balance report', () => {
  it('renders every GDD §8.6 section and a suspects table', () => {
    const results = Array.from({ length: 6 }, (_, i) => runOne(`rep-${i}`, CLS, randomPolicy));
    const agg = aggregate(results, 1);
    const md = renderReport('unit', [{ file: 'mem.json', agg }], null);
    for (const h of ['## Summary', '## Suspects', '### Death heatmap', '### HP at boss entry', '### Floor of death', '### Card rewards', '### Relics', '### Economy per act', '### Turns and damage per encounter', '### Mechanic telemetry', '### Cap hits']) {
      expect(md).toContain(h);
    }
  }, 30_000);
});
