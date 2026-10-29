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

  it('beats the random policy decisively and finishes 200 runs in under 60 s', async () => {
    const seeds = Array.from({ length: 200 }, (_, i) => `wr-${i}`);
    const t0 = Date.now();
    const greedy = await batchParallel(seeds, [CLS], 'greedy', 'test', WORKERS, () => {}, 2000, {}, true);
    const elapsed = Date.now() - t0;
    const random = seeds.map((s) => runOne(`${s}-${CLS}`, CLS, randomPolicy));
    const gWin = greedy.results.filter((r) => r.won).length / seeds.length;
    const rWin = random.filter((r) => r.won).length / seeds.length;
    // Measured 2026-10-29 on the test pack: greedy 100%, random 15-28%.
    expect(gWin).toBeGreaterThanOrEqual(0.8);
    expect(rWin).toBeLessThanOrEqual(0.35);
    expect(gWin - rWin).toBeGreaterThanOrEqual(0.4);
    expect(elapsed).toBeLessThan(60_000);
  }, 180_000);
});

describe('balance overrides', () => {
  it('sets TUNING leaves by path and restores them', () => {
    const before = TUNING.enemyDamagePct[1];
    const rare = TUNING.cardOdds.monster.rare;
    const undo = applyTuningOverrides({ 'enemyDamagePct.1': 85, 'cardOdds.monster.rare': 9 });
    expect(TUNING.enemyDamagePct[1]).toBe(85);
    expect(TUNING.cardOdds.monster.rare).toBe(9);
    undo();
    expect(TUNING.enemyDamagePct[1]).toBe(before);
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
