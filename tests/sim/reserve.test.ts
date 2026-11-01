import '../testpack-only';
import { describe, expect, it } from 'vitest';
import { Game } from '../../src/engine';
import { greedyPolicy } from '../../sim/policies/greedy';
import { combatHasXCard, evaluate, rankCombat } from '../../sim/policies/lib/combat';

// Release item 3: Reserve only feeds X-cost cards, so the evaluator prices it at 0 without one in the fight
// (it used to be a generic buff, and the planner banked energy under Reserve Coil instead of playing cards).

function combatGame(): Game {
  const g = Game.newRun('reserve-value', 'test_class', { atomic: false });
  while (g.state.phase !== 'combat') g.apply(greedyPolicy.choose(g, g.legalActions(), 1));
  return g;
}

describe('Reserve valuation', () => {
  it('is worth nothing without an X-cost card in the fight, and positive with one', () => {
    const g = combatGame();
    const c = g.state.combat;
    if (!c) throw new Error('no combat');
    const { ctx } = rankCombat(g, g.legalActions());
    const xless = (x: { id: string }): boolean => x.id !== 'test_whirl';
    c.hand = c.hand.filter(xless);
    c.draw = c.draw.filter(xless);
    c.discard = c.discard.filter(xless);
    expect(combatHasXCard(c)).toBe(false);
    const before = evaluate(g.state, ctx);
    c.player.statuses.reserve = 3;
    expect(evaluate(g.state, ctx)).toBe(before);

    c.hand = [...c.hand, { uid: 990, id: 'test_whirl', upgraded: false }];
    expect(combatHasXCard(c)).toBe(true);
    const withX = evaluate(g.state, ctx);
    delete c.player.statuses.reserve;
    expect(withX).toBeGreaterThan(evaluate(g.state, ctx));
  });
});
