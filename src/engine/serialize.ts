// Save / load. The save is the RunState as JSON; `version` must match ENGINE_VERSION.

import { RNG_STREAMS } from './rng';
import type { RunState } from './types';
import { ENGINE_VERSION } from './version';

export { ENGINE_VERSION };

export const SAVE_KEY = 'vibespire.run';

export function serialize(state: RunState): string {
  return JSON.stringify(state);
}

const PHASES = ['start', 'map', 'combat', 'reward', 'shop', 'rest', 'event', 'treasure', 'boss_reward', 'victory', 'defeat'];

function isObj(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function problems(v: unknown): string[] {
  const p: string[] = [];
  if (!isObj(v)) return ['not an object'];
  if (typeof v.seed !== 'string') p.push('seed');
  if (typeof v.classId !== 'string') p.push('classId');
  if (typeof v.phase !== 'string' || !PHASES.includes(v.phase)) p.push('phase');
  if (typeof v.floor !== 'number') p.push('floor');
  if (v.act !== 1 && v.act !== 2 && v.act !== 3) p.push('act');
  if (typeof v.nextUid !== 'number') p.push('nextUid');
  const rng = v.rng;
  if (!isObj(rng)) p.push('rng');
  else for (const s of RNG_STREAMS) {
    const st = rng[s];
    if (!Array.isArray(st) || st.length !== 4 || !st.every((n) => typeof n === 'number')) p.push(`rng.${s}`);
  }
  const player = v.player;
  if (!isObj(player)) p.push('player');
  else for (const k of ['hp', 'maxHp', 'gold', 'potionSlots']) if (typeof player[k] !== 'number') p.push(`player.${k}`);
  if (isObj(player)) for (const k of ['deck', 'relics', 'potions']) if (!Array.isArray(player[k])) p.push(`player.${k}`);
  if (!isObj(v.map) || !Array.isArray(v.map.rows)) p.push('map');
  if (!isObj(v.history) || !Array.isArray(v.history.floors)) p.push('history');
  if (!Array.isArray(v.queue)) p.push('queue');
  if (!isObj(v.counters)) p.push('counters');
  for (const k of ['combat', 'reward', 'shop', 'event', 'rest', 'treasure', 'pendingChoice', 'mapPos', 'startChoices', 'bossRelicChoices']) {
    if (!(k in v)) p.push(k);
  }
  return p;
}

function isRunState(v: unknown): v is RunState {
  return problems(v).length === 0;
}

/** Parse a save. Throws on a version mismatch or a malformed save (never returns a partial state). */
export function deserialize(json: string): RunState {
  const raw: unknown = JSON.parse(json);
  if (!isObj(raw)) throw new Error('save is not a JSON object');
  if (raw.version !== ENGINE_VERSION) throw new Error(`save version ${String(raw.version)} does not match engine version ${ENGINE_VERSION}`);
  if (!isRunState(raw)) throw new Error(`malformed save: bad/missing ${problems(raw).join(', ')}`);
  return raw;
}
