// BUG-9 (docs/v2/bugs.md): card text is drawn outside combat too (reward, shop, deck view, rest site),
// and a card whose text amount needed a combat crashed the reward screen. Every card and status
// must render its text with no combat, with a run state and without one.
import { describe, expect, it } from 'vitest';
import { allCards } from '../../src/content';
import { Game, renderCardTextParts } from '../../src/engine';

describe('BUG-9: card text renders outside combat', () => {
  const state = Game.newRun('text-contexts', 'graft').state;
  for (const def of allCards()) {
    for (const upgraded of [false, true]) {
      it(`${def.id}${upgraded ? '+' : ''}`, () => {
        expect(() => renderCardTextParts({ id: def.id, upgraded }, state, null)).not.toThrow();
        expect(() => renderCardTextParts({ id: def.id, upgraded }, null, null)).not.toThrow();
      });
    }
  }
});
