// The action-level brain: the simulator's greedy policy (sim/policies/greedy.ts), run in Node on the
// page's own RunState. Seeded exactly like sim/run.ts, so a browser run makes the same choices as
// `npm run sim` for the same seed (the drivers check that the outcome matches too).

import { actionKey, Game, hashString, nextU32, type Action, type RngState, type RunState } from '../../../src/engine/index.ts';
import { greedyPolicy } from '../../../sim/policies/greedy.ts';

export class Brain {
  private readonly prng: RngState;
  constructor(seed: string) { this.prng = hashString(`policy:${greedyPolicy.name}:${seed}`); }

  /** The policy's pick, returned as the page's own action object (matched by actionKey). */
  choose(state: RunState, pageLegal: readonly Action[]): Action {
    const g = new Game(structuredClone(state), { atomic: false });
    const legal = g.legalActions();
    const a = greedyPolicy.choose(g, legal, nextU32(this.prng));
    const key = actionKey(a);
    const page = pageLegal.find((x) => actionKey(x) === key);
    if (!page) throw new Error(`policy chose ${key}, which the page does not list as legal`);
    return page;
  }
}

export function describe(a: Action): string { return actionKey(a); }
