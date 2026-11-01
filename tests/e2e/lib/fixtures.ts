// Fixture saves for scenarios, built headless in Node with the real engine: play the greedy policy
// (optionally "god mode": huge HP so it reaches any act) until a predicate holds, then mutate the
// state for the scenario (force a boss, stock a shop...). The page then loads the save through the
// title's CONTINUE, which is also the path a player resuming a run takes.

import { Game, hashString, nextU32, type RunState } from '../../../src/engine/index.ts';
import { greedyPolicy } from '../../../sim/policies/greedy.ts';

export interface PlayUntil {
  seed: string;
  classId: string;
  until: (s: RunState) => boolean;
  /** Keep HP topped up at a huge max so the run survives to any act. */
  god?: boolean;
  maxActions?: number;
}

/** Play greedy headless until `until(state)`; returns the game (throws if the run ends first). */
export function playUntil(o: PlayUntil): Game {
  const g = Game.newRun(o.seed, o.classId, { atomic: false });
  const prng = hashString(`fixture:${o.seed}`);
  const max = o.maxActions ?? 20_000;
  for (let i = 0; i < max; i++) {
    const s = g.state;
    if (o.god) { s.player.maxHp = 5000; s.player.hp = 5000; }
    if (o.until(s)) return g;
    if (s.phase === 'victory' || s.phase === 'defeat') throw new Error(`fixture ${o.classId} ${o.seed}: the run ended (${s.phase}, act ${s.act} floor ${s.floor}) before the scenario point`);
    g.apply(greedyPolicy.choose(g, g.legalActions(), nextU32(prng)));
  }
  throw new Error(`fixture ${o.classId} ${o.seed}: scenario point not reached in ${max} actions`);
}

/** A save string of `g` after `mutate` (the save is what the page loads, so it goes through deserialize). */
export function saveOf(g: Game, mutate: (s: RunState) => void = () => {}): string {
  mutate(g.state);
  return g.save();
}

/** Back to sane numbers after a god-mode fixture (the page plays the rest for real). */
export function normalHp(s: RunState, hp = 300): void {
  s.player.maxHp = hp;
  s.player.hp = hp;
}
