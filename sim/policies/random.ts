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

    // multi-pick choices are built with choice_toggle; confirm half the time once that is legal
    const choices = of('resolve_choice');
    const toggles = of('choice_toggle');
    if (choices.length && (toggles.length === 0 || r.chance(0.5))) return pick(choices);
    if (toggles.length) return pick(toggles);

    switch (s.phase) {
      case 'combat': {
        const potions = of('use_potion');
        if (potions.length && r.chance(0.1)) return pick(potions);
        const plays = of('play_card');
        if (plays.length) return pick(plays);
        // No end_turn while a fight is resolving or a choice is open: any legal action.
        const end = of('end_turn');
        return pick(end.length ? end : legal);
      }
      case 'reward': {
        const free = legal.filter((a) => a.type === 'pick_reward' && a.kind !== 'card');
        if (free.length) return pick(free);
        const cards = legal.filter((a) => a.type === 'pick_reward' && a.kind === 'card');
        // Skipping can be illegal (Binding Contract: you must take a card).
        const skip = of('skip_reward');
        if (cards.length) return skip.length && !r.chance(0.8) ? pick(skip) : pick(cards);
        const proceed = of('proceed');
        return pick(proceed.length ? proceed : legal);
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
