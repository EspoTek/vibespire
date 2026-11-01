import '../testpack-only';
// Test helpers: build sandboxes directly from engine internals. State is plain data, so tests
// may set up exact situations by editing it (hands, hp, statuses) before applying actions.

import { makeCard } from '../../src/engine/cards';
import { refreshIntents, startCombat } from '../../src/engine/combat';
import { makeEnv } from '../../src/engine/core';
import { Game, type GameEvent, type RunState, type Action, type CardId } from '../../src/engine';
import { newFloorRecord } from '../../src/engine/history';
import { drain } from '../../src/engine/queue';

export interface SandboxOpts {
  seed?: string;
  deck?: CardId[];
  encounter?: string;
  relics?: string[];
  elite?: boolean;
  boss?: boolean;
}

/** A game already in combat (turn 1, hand drawn) against `encounter`. */
export function sandbox(opts: SandboxOpts = {}): Game {
  const g = Game.newRun(opts.seed ?? 'sandbox', 'test_class');
  const s = g.state;
  s.startChoices = null;
  s.phase = 'map';
  if (opts.deck) s.player.deck = opts.deck.map((id) => makeCard(s, id));
  if (opts.relics) s.player.relics = opts.relics.map((id) => ({ id, counter: 0 }));
  const first = s.map.rows[0]?.[0];
  if (!first) throw new Error('map has no row 0');
  s.mapPos = { row: 0, col: first.col };
  s.floor = 1;
  s.room = opts.boss ? 'boss' : opts.elite ? 'elite' : 'monster';
  s.history.floors.push(newFloorRecord(s, s.room));
  const env = makeEnv(s);
  startCombat(env, { encounterId: opts.encounter ?? 'test_enc_slime', kind: opts.boss ? 'boss' : opts.elite ? 'elite' : 'monster' });
  drain(env);
  refreshIntents(env);
  return g;
}

export function combatOf(g: Game) {
  const c = g.state.combat;
  if (!c) throw new Error('not in combat');
  return c;
}

/** Replace the hand with fresh cards; returns their uids. */
export function setHand(g: Game, ids: CardId[], upgraded = false): number[] {
  const c = combatOf(g);
  c.hand = ids.map((id) => makeCard(g.state, id, upgraded));
  return c.hand.map((x) => x.uid);
}

/** RULINGS 72: Scrap can't take the combat deck below 8. Tests that Scrap from a small sandbox deck pad the draw pile. */
export function padDraw(g: Game, n = 10, id: CardId = 'test_block'): void {
  const c = combatOf(g);
  for (let i = 0; i < n; i++) c.draw.push(makeCard(g.state, id));
}

export function enemyUids(g: Game): number[] {
  return combatOf(g).enemies.filter((e) => e.alive).map((e) => e.uid);
}

export function enemy(g: Game, uid: number) {
  const e = combatOf(g).enemies.find((x) => x.uid === uid);
  if (!e) throw new Error(`no enemy ${uid}`);
  return e;
}

export function play(g: Game, uid: number, target?: number): GameEvent[] {
  const a: Action = target === undefined ? { type: 'play_card', uid } : { type: 'play_card', uid, target };
  return g.apply(a);
}

export function clone(state: RunState): RunState {
  return structuredClone(state);
}

export function eventsOf<T extends GameEvent['t']>(events: GameEvent[], t: T): Extract<GameEvent, { t: T }>[] {
  return events.filter((e): e is Extract<GameEvent, { t: T }> => e.t === t);
}

/** Make every enemy harmless & sturdy so tests control the pace (huge hp, no block). */
export function pacify(g: Game, hp = 999): void {
  for (const e of combatOf(g).enemies) {
    e.hp = hp;
    e.maxHp = hp;
  }
}
