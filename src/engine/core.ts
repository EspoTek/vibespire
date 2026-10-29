// Execution environment shared by the engine modules, plus small entity helpers.
// An Env wraps the (cloned) RunState being mutated by one apply() call and collects events.

import type {
  CardInstance,
  CombatState,
  EnemyState,
  EntityRef,
  GameEvent,
  PendingChoice,
  QueueItem,
  ReadCtx,
  RunState,
  StatusMap,
} from './types';

export interface Env {
  state: RunState;
  events: GameEvent[];
  /**
   * Stack of collectors. While a queue item executes, newly queued items go to the top
   * collector and are then placed at the FRONT of the queue (depth-first resolution).
   * With no collector active, items are appended to the back of the current queue host.
   */
  sinks: QueueItem[][];
  /** > 0 while running effects synchronously (HookCtx.now): opening a choice throws. */
  noChoice: number;
}

export function makeEnv(state: RunState): Env {
  return { state, events: [], sinks: [], noChoice: 0 };
}

export function emit(env: Env, e: GameEvent): void {
  env.events.push(e);
}

export interface QueueHost {
  queue: QueueItem[];
  pendingChoice: PendingChoice | null;
}

/** The queue currently being drained: the combat's while in combat, otherwise the run's. */
export function queueHost(state: RunState): QueueHost {
  if (state.phase === 'combat') {
    if (!state.combat) throw new Error('phase is combat but state.combat is null');
    return state.combat;
  }
  return state;
}

export function enqueue(env: Env, items: QueueItem[]): void {
  const sink = env.sinks[env.sinks.length - 1];
  if (sink) sink.push(...items);
  else queueHost(env.state).queue.push(...items);
}

export function inCombat(state: RunState): boolean {
  return state.phase === 'combat' && state.combat !== null;
}

export function requireCombat(read: ReadCtx | RunState, what: string): CombatState {
  const combat = read.combat;
  if (!combat) throw new Error(`${what} requires combat`);
  return combat;
}

export function getEnemy(combat: CombatState, uid: number): EnemyState {
  const e = combat.enemies.find((x) => x.uid === uid);
  if (!e) throw new Error(`no enemy with uid ${uid}`);
  return e;
}

export function livingEnemies(combat: CombatState): EnemyState[] {
  return combat.enemies.filter((e) => e.alive);
}

export function isAlive(state: RunState, ref: EntityRef): boolean {
  if (ref === 'player') return state.player.hp > 0;
  const combat = state.combat;
  if (!combat) return false;
  return getEnemy(combat, ref).alive;
}

export function statusesOf(state: RunState, ref: EntityRef): StatusMap {
  const combat = requireCombat(state, 'statusesOf');
  return ref === 'player' ? combat.player.statuses : getEnemy(combat, ref).statuses;
}

/** Stacks of a status on an entity; 0 when absent (absence means 0 stacks). Out of combat: 0. */
export function stacksOf(state: RunState, ref: EntityRef, id: string): number {
  if (!state.combat) return 0;
  return statusesOf(state, ref)[id] ?? 0;
}

export function blockOf(state: RunState, ref: EntityRef): number {
  const combat = state.combat;
  if (!combat) return 0;
  return ref === 'player' ? combat.player.block : getEnemy(combat, ref).block;
}

export function guardOf(state: RunState, ref: EntityRef): number {
  const combat = state.combat;
  if (!combat) return 0;
  return ref === 'player' ? combat.player.guard : getEnemy(combat, ref).guard;
}

export function setBlock(state: RunState, ref: EntityRef, value: number): void {
  const combat = requireCombat(state, 'setBlock');
  if (ref === 'player') combat.player.block = value;
  else getEnemy(combat, ref).block = value;
}

export function setGuard(state: RunState, ref: EntityRef, value: number): void {
  const combat = requireCombat(state, 'setGuard');
  if (ref === 'player') combat.player.guard = value;
  else getEnemy(combat, ref).guard = value;
}

export function hpOf(state: RunState, ref: EntityRef): { hp: number; maxHp: number } {
  if (ref === 'player') return { hp: state.player.hp, maxHp: state.player.maxHp };
  const e = getEnemy(requireCombat(state, 'hpOf'), ref);
  return { hp: e.hp, maxHp: e.maxHp };
}

export function setHp(state: RunState, ref: EntityRef, hp: number): void {
  if (ref === 'player') state.player.hp = hp;
  else getEnemy(requireCombat(state, 'setHp'), ref).hp = hp;
}

/** Living opponents of `ref`, in list order. */
export function opponentsOf(state: RunState, ref: EntityRef): EntityRef[] {
  const combat = requireCombat(state, 'opponentsOf');
  if (ref === 'player') return livingEnemies(combat).map((e) => e.uid);
  return state.player.hp > 0 ? ['player'] : [];
}

/** `ref` and its living allies, in list order. */
export function alliesOf(state: RunState, ref: EntityRef): EntityRef[] {
  const combat = requireCombat(state, 'alliesOf');
  if (ref === 'player') return state.player.hp > 0 ? ['player'] : [];
  return livingEnemies(combat).map((e) => e.uid);
}

export function readCtx(state: RunState): ReadCtx {
  return { state, combat: state.combat };
}

export function describeRef(ref: EntityRef): string {
  return ref === 'player' ? 'player' : `enemy#${ref}`;
}

/** Every combat copy, wherever it is (piles, in play, primed rack, Timeline). */
export function allCombatCards(combat: CombatState): CardInstance[] {
  return [
    ...combat.hand,
    ...combat.draw,
    ...combat.discard,
    ...combat.exhaust,
    ...combat.inPlay,
    ...combat.primed.map((p) => p.card),
    ...combat.timeline.map((t) => t.card),
  ];
}

/**
 * "In your deck" (GDD §0.1): the run deck, using each card's live combat copy during combat
 * (so in-combat Bloom growth is visible). Cards created in combat are not included.
 */
export function liveDeckCards(state: RunState): CardInstance[] {
  const combat = state.combat;
  if (!combat) return state.player.deck;
  const byUid: Record<number, CardInstance> = {};
  for (const c of allCombatCards(combat)) byUid[c.uid] = c;
  return state.player.deck.map((c) => byUid[c.uid] ?? c);
}

/** Read an engine counter (absent = 0: counters start empty each combat/turn). */
export function counter(combat: CombatState, key: string): number {
  return combat.counters[key] ?? 0;
}

export function bumpCounter(combat: CombatState, key: string, by = 1): void {
  combat.counters[key] = counter(combat, key) + by;
}
