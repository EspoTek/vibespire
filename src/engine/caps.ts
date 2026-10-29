// Infinite-prevention caps (GDD §3). A cut effect does nothing beyond the cap and emits
// `cap_hit` + a `text` event; hits are tallied in combat.counters (capHits, cap:<id>) and in the
// current floor record (FloorRecord.capHits) for the simulator.

import { emit, type Env } from './core';
import { currentFloor } from './history';
import { CAP_NAMES } from './tuning';

export function capHit(env: Env, cap: string): void {
  const name = CAP_NAMES[cap];
  if (name === undefined) throw new Error(`unknown cap id '${cap}'`);
  emit(env, { t: 'cap_hit', cap });
  emit(env, { t: 'text', text: `${name} reached` });
  const c = env.state.combat;
  if (c) {
    c.counters.capHits = (c.counters.capHits ?? 0) + 1;
    c.counters[`cap:${cap}`] = (c.counters[`cap:${cap}`] ?? 0) + 1;
  }
  const rec = currentFloor(env.state);
  rec.capHits[cap] = (rec.capHits[cap] ?? 0) + 1;
}

/**
 * Take up to `want` from a per-turn budget stored in combat.counters[key] with limit `cap`.
 * Returns the granted amount; records a cap hit when anything is cut.
 */
export function takeBudget(env: Env, key: string, cap: number, capId: string, want: number): number {
  const c = env.state.combat;
  if (!c || want <= 0) return Math.max(0, want);
  const used = c.counters[key] ?? 0;
  const granted = Math.max(0, Math.min(want, cap - used));
  c.counters[key] = used + granted;
  if (granted < want) capHit(env, capId);
  return granted;
}
