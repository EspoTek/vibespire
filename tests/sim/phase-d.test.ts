import '../testpack-only';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Game, TUNING } from '../../src/engine';
import { applyOverrides } from '../../sim/overrides';
import { greedyPolicy } from '../../sim/policies/greedy';
import { progressOf, progressValue } from '../../sim/policies/lib/planner';
import { cloneForSim } from '../../sim/policies/lib/clone';

describe('boolean TUNING levers', () => {
  it('maps 0/1 onto a boolean switch, restores it, and rejects other values', () => {
    const t = TUNING as unknown as Record<string, unknown>;
    t.simTestFlag = true;
    try {
      const undo = applyOverrides({ simTestFlag: 0 });
      expect(t.simTestFlag).toBe(false);
      undo();
      expect(t.simTestFlag).toBe(true);
      expect(() => applyOverrides({ simTestFlag: 2 })).toThrow(/0 or 1/);
    } finally {
      delete t.simTestFlag;
    }
  });

  it('sets every act at once with .all and restores it (enemyHpPct: both difficulty tiers)', () => {
    const tiers = TUNING.difficulty;
    const before = { standard: { ...tiers.standard.enemyHpPct }, heroic: { ...tiers.heroic.enemyHpPct } };
    const undo = applyOverrides({ 'enemyHpPct.all': 123 });
    for (const t of [tiers.standard, tiers.heroic]) expect([t.enemyHpPct[1], t.enemyHpPct[2], t.enemyHpPct[3]]).toEqual([123, 123, 123]);
    undo();
    expect({ standard: { ...tiers.standard.enemyHpPct }, heroic: { ...tiers.heroic.enemyHpPct } }).toEqual(before);
    const undoHeroic = applyOverrides({ 'difficulty.heroic.enemyHpPct.all': 120 });
    expect(tiers.heroic.enemyHpPct[2]).toBe(120);
    expect(tiers.standard.enemyHpPct[2]).toBe(before.standard[2]);
    undoHeroic();
  });
});

describe('planner progress terms', () => {
  it('credits enemy HP removed only after the stall turn', () => {
    const g = Game.newRun('stall-1', 'test_class', { atomic: false });
    while (g.state.phase !== 'combat') g.apply(greedyPolicy.choose(g, g.legalActions(), 1));
    const c = g.state.combat;
    if (!c) throw new Error('no combat');
    const early = progressOf(c);
    const hurt = cloneForSim(g.state);
    const e = hurt.combat?.enemies.find((x) => x.alive);
    if (!e) throw new Error('no enemy');
    e.hp -= 5;
    expect(progressValue(hurt, early)).toBe(0);
    c.turn = 32;
    const late = progressOf(c);
    expect(late.w).toBe(1);
    expect(progressValue(hurt, late)).toBeCloseTo(5, 6);
  });
});

describe('prior files', () => {
  it('prefer the newest file and age a prior found only in an older one', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'priors-'));
    const { cardDefHash } = await import('../../sim/policies/lib/priors');
    const { getCardDef } = await import('../../src/content');
    const h = cardDefHash(getCardDef('test_bash'));
    const stat = (prog: number) => ({ n: 50, prog, progCi: 1, win: 0.1 });
    writeFileSync(join(dir, 'new.json'), JSON.stringify({ label: 'new', generated: '', cards: { test_bash: { hash: h, byClass: { test_class: stat(2) } } }, relics: {} }));
    writeFileSync(join(dir, 'old.json'), JSON.stringify({ label: 'old', generated: '', cards: { test_bash: { hash: h, byClass: { test_class: stat(9) } }, test_strike: { hash: cardDefHash(getCardDef('test_strike')), byClass: { test_class: stat(4) } } }, relics: {} }));
    process.env.SIM_PRIORS = `${join(dir, 'new.json')},${join(dir, 'old.json')}`;
    // The prior files are read on first lookup; this test file is its own module instance, so nothing has read them yet.
    const { cardPriorOrNull } = await import('../../sim/policies/lib/priors');
    expect(cardPriorOrNull('test_class', 'test_bash')?.prog).toBe(2);
    const aged = cardPriorOrNull('test_class', 'test_strike');
    expect(aged?.prog).toBe(2);
    expect(aged?.progCi).toBe(2);
    delete process.env.SIM_PRIORS;
  });
});
