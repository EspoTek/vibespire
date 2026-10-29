// Greedy policy (ENGINE_SPEC §10, GDD §8.4 `greedy_v1`): the competent, deterministic balance oracle.
//
// Combat: one-ply look-ahead with an exact enemy response (lib/combat.ts): every distinct play is
// simulated, then the turn is ended in the copy and the next decision point is scored (HP, enemy
// HP weighted by threat, Block/Guard against the next intents, Rot/Exposed/Stagger horizons, Powers
// by expected fight length, Bloom growth, Timeline value, potions held). Lethal search first;
// potions only in boss/elite fights or when the end-turn copy shows heavy damage.
// Choices: lib/choices.ts (Scrap/remove the worst card, Prune into the best Bloom copy, ...).
// Out of combat: lib/run.ts (path scoring, archetype card-reward model with skip threshold,
// shop removal first, rest vs smith, event option scoring, energy boss relics).
// Determinism: the only randomness is the policy's own seeded rng (map tie-breaks).

import { hashString, singleRng, type Action, type Game } from '../../src/engine';
import type { Policy } from '../types';
import { chooseCombat, pendingOf } from './lib/combat';
import { choiceAction } from './lib/choices';
import { chooseRun } from './lib/run';

export function greedyChoose(game: Game, legal: Action[], seed: number): Action {
  if (legal.length === 0) throw new Error('greedy policy: no legal actions');
  const s = game.state;
  if (s.phase === 'combat') return chooseCombat(game, legal);
  const pc = pendingOf(s);
  if (pc) return choiceAction(s, pc, legal);
  return chooseRun(s, legal, singleRng(hashString(`greedy:${seed}`)));
}

export const greedyPolicy: Policy = { name: 'greedy', choose: greedyChoose };
