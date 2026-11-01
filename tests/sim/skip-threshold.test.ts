import '../testpack-only';
import { describe, expect, it } from 'vitest';
import { allCards } from '../../src/content';
import { Game } from '../../src/engine';
import { cardQuality, SKIP_THRESHOLD, skipThreshold } from '../../sim/policies/lib/archetype';

// Release item 3: one strong card in a starter deck must not raise the skip bar to that card's quality
// (the bot then skipped every reward: the Molten Shell counterfactual "trap"); a deck full of them still does.

describe('skip threshold', () => {
  it('barely moves for one strong card and rises for a deck of them', () => {
    const g = Game.newRun('skip-bar', 'test_class', { atomic: false });
    const s = g.state;
    expect(skipThreshold(s)).toBe(SKIP_THRESHOLD);
    const best = allCards()
      .filter((d) => d.cls === 'test_class' && d.rarity !== 'starter')
      .sort((a, b) => cardQuality(b.id, false) - cardQuality(a.id, false))[0];
    if (!best) throw new Error('no non-starter test_class card');
    const q = cardQuality(best.id, false);
    expect(q).toBeGreaterThan(SKIP_THRESHOLD + 2);
    const starter = [...s.player.deck];
    s.player.deck = [...starter, { uid: 900, id: best.id, upgraded: false }];
    const one = skipThreshold(s);
    expect(one).toBeLessThan(SKIP_THRESHOLD + 1.5);
    s.player.deck = [...starter, ...Array.from({ length: 20 }, (_, i) => ({ uid: 900 + i, id: best.id, upgraded: false }))];
    const many = skipThreshold(s);
    expect(many).toBeGreaterThan(one + 2);
    expect(many).toBeLessThanOrEqual(q + 1.5);
  });
});
