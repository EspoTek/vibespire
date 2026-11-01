import '../testpack-only';
import { describe, expect, it } from 'vitest';
import { allCards } from '../../src/content';
import { Game, type CardInstance, type PendingChoice } from '../../src/engine';
import { greedyPolicy } from '../../sim/policies/greedy';
import { infoOf } from '../../sim/policies/lib/cards';
import { answerChoice, scarceDamageBonus } from '../../sim/policies/lib/choices';

// Phase E item 7: the Triage keep (and exhaust) heuristic protects the last damage cards of a fight.

function combatGame(): Game {
  const g = Game.newRun('triage-keep', 'test_class', { atomic: false });
  while (g.state.phase !== 'combat') g.apply(greedyPolicy.choose(g, g.legalActions(), 1));
  return g;
}

const worth = (c: CardInstance): number => infoOf(c).value - infoOf(c).costNum * 1.5;

describe('triage keep heuristic', () => {
  it('keeps the damage card over a stronger non-damage card only when damage is scarce', () => {
    const g = combatGame();
    const c = g.state.combat;
    if (!c) throw new Error('no combat');
    const all = [...c.hand, ...c.draw, ...c.discard];
    const attack = all.find((x) => infoOf(x).damage > 0);
    const filler = all.find((x) => infoOf(x).damage === 0);
    if (!attack || !filler) throw new Error('starter deck lacks an attack or a non-damage card');
    // The strongest non-damage class card: outranks the attack on plain hand worth.
    const star = allCards()
      .filter((d) => d.cls === 'test_class')
      .map((d): CardInstance => ({ uid: 900, id: d.id, upgraded: false }))
      .filter((x) => infoOf(x).damage === 0)
      .sort((a, b) => worth(b) - worth(a))[0];
    if (!star) throw new Error('no non-damage test_class card');
    expect(worth(star)).toBeGreaterThan(worth(attack));

    const hand = [{ ...attack, uid: 901 }, star, { ...filler, uid: 902 }];
    const pc: PendingChoice = { kind: 'cards', prompt: 'Keep up to 1 card.', from: 'hand', choices: hand.map((x) => x.uid), labels: [], offers: [], min: 0, max: 1, picked: [], resume: { op: 'triage' } };

    // Scarce: no damage left outside the hand.
    c.hand = hand;
    c.draw = [{ ...filler, uid: 910 }, { ...filler, uid: 911 }];
    c.discard = [{ ...attack, uid: 912 }];
    expect(scarceDamageBonus(g.state)).toBeGreaterThan(0);
    expect(answerChoice(g.state, pc)).toEqual([901]);
    // The same scarcity steers an exhaust away from the attack.
    expect(answerChoice(g.state, { ...pc, min: 1, resume: { op: 'exhaust', from: 'hand' } })).not.toContain(901);

    // Plenty: four attacks still in the piles, so plain worth wins.
    c.draw = [0, 1, 2, 3].map((i) => ({ ...attack, uid: 920 + i }));
    expect(scarceDamageBonus(g.state)).toBe(0);
    expect(answerChoice(g.state, pc)).toEqual([900]);
  });
});
