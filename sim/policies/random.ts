// Random policy: uniform over sensible subsets of legalActions. A smoke-test opponent for the
// engine, NOT the balance oracle (that is the greedy policy the spec asks for).
// Bias: always plays a card while one is playable (end turn only when nothing is playable),
// takes free rewards, picks a card reward 80% of the time, rarely shops.

import { hashString, singleRng, type Action, type Game } from '../../src/engine';
import type { Policy } from '../types';

export const randomPolicy: Policy = {
  name: 'random',
  choose(game: Game, legal: Action[], seed: number): Action {
    if (legal.length === 0) throw new Error('random policy: no legal actions');
    const r = singleRng(hashString(`random:${seed}`));
    const s = game.state;
    const of = <T extends Action['type']>(t: T): Extract<Action, { type: T }>[] =>
      legal.filter((a): a is Extract<Action, { type: T }> => a.type === t);
    const pick = <T>(xs: readonly T[]): T => r.pick(xs);

    const choices = of('resolve_choice');
    if (choices.length) return pick(choices);

    switch (s.phase) {
      case 'combat': {
        const potions = of('use_potion');
        if (potions.length && r.chance(0.1)) return pick(potions);
        const plays = of('play_card');
        if (plays.length) return pick(plays);
        return pick(of('end_turn'));
      }
      case 'reward': {
        const free = legal.filter((a) => a.type === 'pick_reward' && a.kind !== 'card');
        if (free.length) return pick(free);
        const cards = legal.filter((a) => a.type === 'pick_reward' && a.kind === 'card');
        if (cards.length) return r.chance(0.8) ? pick(cards) : pick(of('skip_reward'));
        return pick(of('proceed'));
      }
      case 'shop': {
        const buys = legal.filter((a) => a.type === 'shop_buy' || a.type === 'shop_remove');
        if (buys.length && r.chance(0.3)) return pick(buys);
        return pick(of('proceed'));
      }
      default: {
        const potions = of('use_potion');
        if (potions.length && s.player.hp * 2 < s.player.maxHp) return pick(potions);
        const rest = legal.filter((a) => a.type !== 'use_potion');
        return pick(rest.length ? rest : legal);
      }
    }
  },
};
