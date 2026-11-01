import '../testpack-only';
import { describe, expect, it } from 'vitest';
import { Game, hashString, nextU32 } from '../../src/engine';
import { cardValue } from '../../sim/detail';
import { paired, stratifiedDelta } from '../../sim/attribution';
import { NOVICE, SPIKE, TIMMY, TURTLE, personaPolicy } from '../../sim/policies/personas';
import { planTurn, SPIKE_PLANNER, stateKey } from '../../sim/policies/lib/planner';
import { greedyPolicy } from '../../sim/policies/greedy';
import { runOne } from '../../sim/run';
import type { RunResult } from '../../sim/types';

const CLS = 'test_class';
const strip = (r: RunResult): Omit<RunResult, 'elapsedMs'> => {
  const { elapsedMs: _ignored, ...rest } = r;
  return rest;
};

describe('whole-turn planner', () => {
  it('is deterministic: same seed, same run', () => {
    const p = personaPolicy(SPIKE);
    const a = runOne('plan-det-1', CLS, p, { strict: true });
    const b = runOne('plan-det-1', CLS, personaPolicy(SPIKE), { strict: true });
    expect(strip(b)).toEqual(strip(a));
  }, 60_000);

  it('never mutates the real state while searching', () => {
    const g = Game.newRun('plan-mut-1', CLS, { atomic: false });
    const p = personaPolicy(SPIKE);
    const prng = hashString('plan-mut');
    let searched = 0;
    for (let i = 0; i < 500 && g.state.phase !== 'victory' && g.state.phase !== 'defeat'; i++) {
      const legal = g.legalActions();
      const before = JSON.stringify(g.state);
      const a = p.choose(g, legal, nextU32(prng));
      if (g.state.phase === 'combat') searched++;
      expect(JSON.stringify(g.state)).toBe(before);
      expect(legal).toContain(a);
      g.apply(a);
    }
    expect(searched).toBeGreaterThan(20);
  }, 60_000);

  it('plans a line whose keys match the states the engine reaches', () => {
    const g = Game.newRun('plan-keys-1', CLS, { atomic: false });
    while (g.state.phase !== 'combat') g.apply(greedyPolicy.choose(g, g.legalActions(), 1));
    const { line, keys } = planTurn(g.state, SPIKE_PLANNER);
    expect(line.length).toBe(keys.length);
    expect(line.length).toBeGreaterThan(0);
    for (let i = 0; i < line.length; i++) {
      const a = line[i];
      if (!a) throw new Error('missing planned action');
      g.apply(a);
      // The test pack has no pending choices on these plays, so the key is the state right after.
      expect(stateKey(g.state)).toBe(keys[i]);
    }
  }, 30_000);

  it('every persona finishes runs with only legal actions and wins some on the test pack', () => {
    for (const p of [SPIKE, TIMMY, TURTLE, NOVICE]) {
      const rs = Array.from({ length: 4 }, (_, i) => runOne(`persona-${p.name}-${i}`, CLS, personaPolicy(p), { strict: true }));
      expect(rs.every((r) => r.endCause !== 'stalemate')).toBe(true);
      expect(rs.some((r) => r.won)).toBe(true);
    }
  }, 120_000);

  it('novice never skips a card reward and never removes at a shop', () => {
    const rs = Array.from({ length: 4 }, (_, i) => runOne(`novice-${i}`, CLS, personaPolicy(NOVICE), { strict: true }));
    for (const r of rs) {
      expect(r.screens.every((s) => s.picked !== null)).toBe(true);
      expect(r.removals.filter((x) => x.room === 'shop')).toHaveLength(0);
    }
  }, 60_000);
});

describe('counterfactual grants', () => {
  it('a granted relic is held from floor 1 and its triggers are counted', () => {
    const r = runOne('grant-1', CLS, personaPolicy(SPIKE), { grant: { relic: 'test_relic_counter' }, strict: true });
    expect(r.relics).toContain('test_relic_counter');
    expect(r.relicsGained.some((x) => x.relic === 'test_relic_counter' && x.floor === 0)).toBe(true);
  }, 30_000);

  it('a granted card is in the starting deck and gets drawn and played', () => {
    const r = runOne('grant-2', CLS, personaPolicy(SPIKE), { grant: { cards: ['test_bash'] }, strict: true });
    const base = runOne('grant-2', CLS, personaPolicy(SPIKE), { strict: true });
    const deckCount = (x: RunResult): number => x.deckEnd.filter((id) => id === 'test_bash').length;
    expect(deckCount(r)).toBeGreaterThanOrEqual(1);
    const c = r.detail.cards.test_bash;
    expect(c?.drawn ?? 0).toBeGreaterThan(0);
    expect(c?.played ?? 0).toBeGreaterThan(0);
    expect(base.seed).toBe(r.seed);
  }, 30_000);
});

describe('attribution telemetry', () => {
  it('attributes enemy HP lost to played cards without exceeding the total', () => {
    const r = runOne('detail-1', CLS, personaPolicy(SPIKE), { strict: true });
    let dmg = 0;
    let plays = 0;
    for (const c of Object.values(r.detail.cards)) {
      dmg += c.dmg;
      plays += c.played;
      expect(c.played).toBeLessThanOrEqual(c.drawn + 5);
      expect(cardValue(c)).toBeGreaterThanOrEqual(0);
    }
    const total = r.telemetry.hitDamage + r.telemetry.rotDamage + r.telemetry.otherHpLoss;
    expect(dmg).toBeGreaterThan(0);
    expect(dmg).toBeLessThanOrEqual(total);
    expect(plays).toBe(r.telemetry.cardsPlayed);
    const moveHp = Object.values(r.detail.moveDamage).reduce((a, b) => a + b, 0);
    expect(moveHp).toBe(r.combats.reduce((a, c) => a + c.damageTaken, 0));
  }, 30_000);
});

describe('attribution statistics', () => {
  it('paired differences: mean and a 95% half-width', () => {
    const p = paired([1, 0, 0, -1, 1, 0, 1, 0], [3, 0, 1, -2, 4, 0, 2, 0]);
    expect(p.n).toBe(8);
    expect(p.win).toBeCloseTo(0.25, 6);
    expect(p.winCi).toBeGreaterThan(0);
    expect(p.prog).toBeCloseTo(1, 6);
  });

  it('floor-stratified pick delta removes a pure floor effect', () => {
    // Late picks win more, but within each floor bucket picking changes nothing: delta ~ 0.
    const obs: { floor: number; picked: boolean; won: boolean }[] = [];
    for (let i = 0; i < 200; i++) {
      const floor = i % 2 === 0 ? 3 : 40;
      const won = floor === 40 ? i % 4 !== 1 : i % 4 === 0;
      obs.push({ floor, picked: i % 3 === 0, won });
    }
    const raw = (p: boolean): number => obs.filter((o) => o.picked === p && o.won).length / obs.filter((o) => o.picked === p).length;
    const s = stratifiedDelta(obs);
    expect(Math.abs(s.d)).toBeLessThan(Math.abs(raw(true) - raw(false)) + 0.1);
    expect(Math.abs(s.d)).toBeLessThan(0.15);
    expect(s.ci).toBeGreaterThan(0);
  });
});

describe('attribution of vanished cards', () => {
  it('attributes a Timeline card that resolves on the fight-winning action and ends in no pile', async () => {
    const { DetailCollector } = await import('../../sim/detail');
    const { cloneForSim } = await import('../../sim/policies/lib/clone');
    const g = Game.newRun('vanish-1', CLS, { atomic: false });
    while (g.state.phase !== 'combat') g.apply(greedyPolicy.choose(g, g.legalActions(), 1));
    const before = cloneForSim(g.state);
    const c = before.combat;
    if (!c) throw new Error('no combat');
    const ghost = { uid: 99_999, id: 'test_strike', upgraded: false };
    c.timeline.push({ card: ghost, dueTurn: c.turn + 1, seq: 0, onBeat: false, target: null } as (typeof c.timeline)[number]);
    const d = new DetailCollector();
    const pre = d.pre(before, { type: 'end_turn' });
    const after = cloneForSim(g.state);
    after.combat = null;
    d.observe(pre, { type: 'end_turn' }, [{ t: 'timeline_resolved', uid: 99_999 }, { t: 'damage', kind: 'attack', source: 'player', target: 1, amount: 6, blocked: 0, guarded: 0, hpLost: 6 }], after);
    expect(d.d.cards.test_strike?.triggers).toBe(1);
    expect(d.d.cards.test_strike?.dmg).toBe(6);
    expect(() => d.observe(pre, { type: 'end_turn' }, [{ t: 'timeline_resolved', uid: 12_345 }], after)).toThrow(/not found/);
  });
});

describe('rollout drafting', () => {
  it('picks a legal offer or skips, the same way twice, and rolls out the contenders', async () => {
    const { draftWithRollouts, SPIKE_DRAFT } = await import('../../sim/policies/lib/draft');
    const g = Game.newRun('draft-1', CLS, { atomic: false });
    for (let i = 0; i < 2000 && !(g.state.phase === 'reward' && g.state.reward?.cardStatus === 'pending'); i++) g.apply(greedyPolicy.choose(g, g.legalActions(), 1));
    const r = g.state.reward;
    if (!r) throw new Error('never reached a card reward');
    const before = JSON.stringify(g.state);
    const opts = { ...SPIKE_DRAFT, margin: 100, maxContenders: 10 };
    const a = draftWithRollouts(g.state, r.cards, true, opts, 'draft-1');
    const b = draftWithRollouts(g.state, r.cards, true, opts, 'draft-1');
    expect(JSON.stringify(g.state)).toBe(before);
    expect(a).toEqual(b);
    expect(a.index === null || (a.index >= 0 && a.index < r.cards.length)).toBe(true);
    expect(a.scores.filter((s) => s.rollout !== null).length).toBe(r.cards.length + 1);
    const forced = draftWithRollouts(g.state, r.cards, false, opts, 'draft-1');
    expect(forced.index).not.toBeNull();
  }, 120_000);
});

describe('evaluator future terms', () => {
  it('banked next-turn resources and Timeline value are 0 without them', async () => {
    const { bankValue, timelineValue } = await import('../../sim/policies/lib/future');
    const g = Game.newRun('future-1', CLS, { atomic: false });
    while (g.state.phase !== 'combat') g.apply(greedyPolicy.choose(g, g.legalActions(), 1));
    expect(bankValue(g.state)).toBe(0);
    expect(timelineValue(g.state)).toBe(0);
    const c = g.state.combat;
    if (!c) throw new Error('no combat');
    c.counters.bankEnergy = 1;
    c.counters.bankDraw = 2;
    expect(bankValue(g.state)).toBeCloseTo(4.5 + 5, 6);
  });
});
