// greedy2: the greedy policy with a deeper combat search, to measure how much a smarter player
// changes the win rate. Out of combat it is identical to greedy.
//
// Combat: rank the plays one-ply exactly like greedy, keep the top K (plus "end the turn now"), and
// for each one play it, finish the turn with greedy's own one-ply choices, end the turn and score
// the next decision point. Pick the line with the best score. This sees combos the one-ply search
// misses (break thresholds, Exposed then multi-hit, Onslaught chains into finishers, lethal setups).

import type { Action, Game } from '../../src/engine';
import type { Policy } from '../types';
import { greedyChoose } from './greedy';
import { chooseCombat, combatOver, evaluate, pendingOf, rankCombat, settle, type CombatCtx } from './lib/combat';
import { choiceAction } from './lib/choices';
import { simGame } from './lib/clone';

const TOP_K = 4;
const MAX_STEPS = 15;

/** Play `first` in a copy, let greedy finish the turn, end it; score the result. */
function rollout(game: Game, first: Action, ctx: CombatCtx): number {
  const g = simGame(game.state);
  g.apply(first);
  settle(g);
  if (first.type === 'end_turn') return evaluate(g.state, ctx);
  for (let i = 0; i < MAX_STEPS && !combatOver(g.state); i++) {
    const a = chooseCombat(g, g.legalActions());
    g.apply(a);
    settle(g);
    if (a.type === 'end_turn') return evaluate(g.state, ctx);
  }
  if (!combatOver(g.state)) {
    g.apply({ type: 'end_turn' });
    settle(g);
  }
  return evaluate(g.state, ctx);
}

function chooseCombat2(game: Game, legal: Action[]): Action {
  const s = game.state;
  const pc = pendingOf(s);
  if (pc) return choiceAction(s, pc, legal);
  const { ranked, ctx } = rankCombat(game, legal);
  const top = ranked.filter((r) => r.net > 0.3).slice(0, TOP_K);
  if (top.length === 0) return chooseCombat(game, legal);
  if (top.length === 1 && top[0] && top[0].net >= 1e5) return top[0].action;
  const end = legal.find((a) => a.type === 'end_turn');
  if (!end) throw new Error('greedy2: no end_turn in combat');
  let best: Action = end;
  let bestV = rollout(game, end, ctx);
  for (const r of top) {
    const v = rollout(game, r.action, ctx);
    if (v > bestV + 1e-9) {
      bestV = v;
      best = r.action;
    }
  }
  return best;
}

export const greedy2Policy: Policy = {
  name: 'greedy2',
  choose(game: Game, legal: Action[], seed: number): Action {
    if (game.state.phase === 'combat') return chooseCombat2(game, legal);
    return greedyChoose(game, legal, seed);
  },
};
