// Save / load. The save is the RunState as JSON; `version` must match ENGINE_VERSION, and every id
// in it must resolve in this build's content (savecheck.ts). The one migration is v3 -> v4 (difficulty
// tiers: an older v2 run loads as Standard). The v2 content redesign removed cards, relics and statuses,
// so a save from the v1 build (version 2) is "incompatible" and the renderer discards it with a notice
// (parseSaveOrIncompatible) instead of crashing.

import { RNG_STREAMS } from './rng';
import { DIFFICULTIES } from './types';
import { unresolvedIds } from './savecheck';
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
  if (typeof v.difficulty !== 'string' || !(DIFFICULTIES as readonly string[]).includes(v.difficulty)) p.push('difficulty');
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
  if (!Array.isArray(v.mapPath)) p.push('mapPath');
  for (const k of ['combat', 'reward', 'shop', 'event', 'rest', 'treasure', 'pendingChoice', 'mapPos', 'startChoices', 'bossRelicChoices']) {
    if (!(k in v)) p.push(k);
  }
  return p;
}

function isRunState(v: unknown): v is RunState {
  return problems(v).length === 0;
}

/** v3 -> v4: runs started before difficulty tiers existed are Standard runs (ruling 71). */
function migrateV3(raw: Record<string, unknown>): void {
  if ('difficulty' in raw) throw new Error('v3 save already has a difficulty');
  raw.difficulty = 'standard';
  raw.version = 4;
}

export type SaveCheck = { ok: true; state: RunState } | { ok: false; reason: string };

/**
 * Parse a save for loading. "Incompatible" is an expected outcome, not an error: a save written by
 * another engine version, or naming any card / relic / status / enemy / event... id this build doesn't
 * register (content removed or renamed since), gives `ok: false` with the reason. A save of this
 * version that is malformed, or not JSON at all, still throws: that is a bug or corruption.
 */
export function parseSaveOrIncompatible(json: string): SaveCheck {
  const raw: unknown = JSON.parse(json);
  if (!isObj(raw)) throw new Error('save is not a JSON object');
  if (raw.version === 3) migrateV3(raw);
  if (raw.version !== ENGINE_VERSION) return { ok: false, reason: `saved by engine version ${String(raw.version)}, this build is version ${ENGINE_VERSION}` };
  if (!isRunState(raw)) throw new Error(`malformed save: bad/missing ${problems(raw).join(', ')}`);
  const missing = unresolvedIds(raw);
  if (missing.length) return { ok: false, reason: `${missing.length} id(s) this build doesn't have, e.g. ${missing.slice(0, 3).join('; ')}` };
  return { ok: true, state: raw };
}

/** Parse a save that must load (tests, tools): throws on anything parseSaveOrIncompatible rejects. */
export function deserialize(json: string): RunState {
  const r = parseSaveOrIncompatible(json);
  if (!r.ok) throw new Error(`incompatible save: ${r.reason}`);
  return r.state;
}
