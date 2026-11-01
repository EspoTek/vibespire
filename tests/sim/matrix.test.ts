// Real content: the johnny bots read the archetype matrices in docs/cards/<class>.md.
import { describe, expect, it } from 'vitest';
import { getCardDef } from '../../src/content';
import { archetypesFor } from '../../sim/policies/lib/matrix';
import { engineNames, johnnyArchetypes, personaNames, personaFor } from '../../sim/policies/personas';
import { assembled, enginesFor } from '../../sim/policies/lib/engines';
import { cardDefHash } from '../../sim/policies/lib/priors';
import { variantsFor } from '../../sim/counterfactual';

describe('archetype matrices', () => {
  it('parse for every class with at least 3 deck archetypes of real cards', () => {
    for (const cls of ['breaker', 'graft', 'chronist']) {
      const arch = archetypesFor(cls);
      expect(johnnyArchetypes(cls).length).toBeGreaterThanOrEqual(3);
      for (const a of arch) {
        expect(a.cards.size).toBeGreaterThanOrEqual(5);
        for (const id of a.cards.keys()) expect(getCardDef(id).cls).toBe(cls);
      }

    }
  });

  it('counterfactual variant lists cover class cards, colourless cards and droppable relics', () => {
    const cards = variantsFor('card', 'breaker');
    expect(cards.some((id) => getCardDef(id).cls === 'colorless')).toBe(true);
    expect(cards.every((id) => getCardDef(id).rarity !== 'starter')).toBe(true);
    const relics = variantsFor('relic', 'graft');
    expect(relics).not.toContain('heartseed');
    expect(relics.length).toBeGreaterThan(30);
  });
});

describe('v2 engines', () => {
  it('every class has at least 3 class engines and a johnny-<engine> persona for each', () => {
    for (const cls of ['breaker', 'graft', 'chronist']) {
      const own = enginesFor(cls).filter((e) => e.scope === 'class');
      expect(own.length).toBeGreaterThanOrEqual(3);
      for (const e of own) {
        expect(e.cards.size).toBeGreaterThanOrEqual(5);
        expect(personaNames(cls)).toContain(`johnny-${e.name}`);
        expect(personaFor(`johnny-${e.name}`, cls).name).toBe(`johnny-${e.name}`);
      }
      expect(engineNames(cls).length).toBe(enginesFor(cls).length);
    }
  });

  it('assembly needs the pieces of the engine', () => {
    const e = enginesFor('graft').find((x) => x.scope === 'class' && x.hasMultiplier);
    if (!e) throw new Error('no graft engine with a multiplier');
    const ids = [...e.cards.entries()];
    const mult = ids.find(([, r]) => r === 'multiplier')?.[0];
    const others = ids.filter(([, r]) => r !== 'multiplier').map(([id]) => id).slice(0, 2);
    if (!mult || others.length < 2) throw new Error('engine too small for the test');
    const card = (id: string, uid: number) => ({ uid, id, upgraded: false });
    expect(assembled(e, [card(mult, 1), card(others[0] ?? '', 2)], [])).toBe(false);
    expect(assembled(e, [card(mult, 1), card(others[0] ?? '', 2), card(others[1] ?? '', 3)], [])).toBe(true);
  });

  it('RULINGS 70: owned engine relics count toward shared-engine assembly', () => {
    const e = enginesFor('chronist').find((x) => x.name === 'reprise');
    if (!e) throw new Error('no shared reprise engine');
    expect(e.scope).toBe('shared');
    const card = (id: string, uid: number) => ({ uid, id, upgraded: false });
    // Encore (multiplier card) alone is not assembled; with Echo Bell and Orbital Hammer (engine relics) it is.
    expect(assembled(e, [card('encore', 1)], [])).toBe(false);
    expect(assembled(e, [card('encore', 1)], ['echo_bell', 'orbital_hammer'])).toBe(true);
  });

  it('card definition hashes ignore wording but not numbers', () => {
    const def = getCardDef('hew');
    const h = cardDefHash(def);
    expect(cardDefHash({ ...def, text: 'other words', name: 'Other' })).toBe(h);
    expect(cardDefHash({ ...def, cost: def.cost === 1 ? 2 : 1 })).not.toBe(h);
  });
});
