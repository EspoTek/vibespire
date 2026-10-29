// Fast state copies for one-ply look-ahead. RunState is plain JSON data (ENGINE_SPEC §1), so a
// hand-written recursive copy is several times faster than structuredClone. The act map is shared
// (combat and run actions never mutate it) and only the current floor record is copied (the engine
// only ever writes the last record). tests/sim/greedy.test.ts checks that a look-ahead leaves the
// real state untouched.

import { Game, type Action, type RunState } from '../../../src/engine';

export function deepClone<T>(v: T): T {
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) {
    const out: unknown[] = new Array(v.length);
    for (let i = 0; i < v.length; i++) out[i] = deepClone(v[i]);
    return out as T;
  }
  const out: Record<string, unknown> = {};
  for (const k in v) out[k] = deepClone((v as Record<string, unknown>)[k]);
  return out as T;
}

export function cloneForSim(s: RunState): RunState {
  const floors = s.history.floors;
  const last = floors[floors.length - 1];
  if (!last) throw new Error('cloneForSim: empty history');
  return {
    ...s,
    rng: deepClone(s.rng),
    player: deepClone(s.player),
    combat: deepClone(s.combat),
    reward: deepClone(s.reward),
    shop: deepClone(s.shop),
    event: deepClone(s.event),
    rest: deepClone(s.rest),
    treasure: deepClone(s.treasure),
    startChoices: deepClone(s.startChoices),
    bossRelicChoices: deepClone(s.bossRelicChoices),
    queue: deepClone(s.queue),
    pendingChoice: deepClone(s.pendingChoice),
    counters: deepClone(s.counters),
    history: { floors: [...floors.slice(0, -1), deepClone(last)] },
  };
}

/** A throwaway Game over a copy of `s` (mutating, non-atomic). */
export function simGame(s: RunState): Game {
  return new Game(cloneForSim(s), { atomic: false });
}

export function sameAction(a: Action, b: Action): boolean {
  if (a.type !== b.type) return false;
  const ra = a as Record<string, unknown>;
  const rb = b as Record<string, unknown>;
  for (const k of new Set([...Object.keys(ra), ...Object.keys(rb)])) {
    const x = ra[k];
    const y = rb[k];
    if (Array.isArray(x) && Array.isArray(y)) {
      if (x.length !== y.length || x.some((v, i) => v !== y[i])) return false;
    } else if (x !== y) return false;
  }
  return true;
}
