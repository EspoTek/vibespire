// Generic status system + hook dispatch + modifier folds.
//
// HOOK DISPATCH ORDER (the contract content relies on)
// ---------------------------------------------------
// Entity-scoped hooks (dispatch(env, hook, <entity>, info)) visit, in order:
//   1. statuses on that entity, in insertion order of its StatusMap;
//   2. if the entity is the player: relics, in acquisition order;
//   3. if the entity is an enemy: its EnemyDef.hooks[hook], then the EnemyDef top-level alias
//      (onTurnStart -> def.onTurnStart, onDamageTaken -> def.onDamaged, onDeath -> def.onDeath).
// Global hooks (dispatch(env, hook, 'global', info)) visit:
//   1. statuses on the player; 2. relics; 3. for each living enemy in list order:
//      its statuses, then its EnemyDef hooks.
// The listener list is snapshotted when dispatch starts. A status removed (or a relic lost)
// by an earlier listener is skipped; stacks are read live at call time.
// For each listener, declarative `triggers[hook]` effects are queued first, then `hooks[hook]` runs.
//
// Which scope each engine hook uses:
//   entity: onTurnStart, onTurnEnd, onDamageDealt (attacker), onDamageTaken / onHpLost (victim),
//           onBlockGained, onGuardDecay, onDeath (the dying entity, statuses still present),
//           onStatusChanged (the entity whose stacks changed);
//           player-scoped: onCardExhausted, onCardDrawn, onCardToHand, onShuffle, onEnemySpawn,
//           onRiposteTriggered, onPrimed, onPrune, onBloomGained, onDelayResolved, onTimelineAdd,
//           onPotionUsed, and the run-level relic hooks onPickup (that relic only), onRest,
//           onShopEnter, onFloorEnter, onActStart, onGoldGain, onShardGain, onRewardSkipped,
//           onCardAdded.
//   global: onCombatStart, onCombatEnd, onCardPlayed, afterCardPlayed, onEnemyDied,
//           onEnemyAttackDeclared, onEnemyMoveEnd.
//
// Trigger targets: declarative trigger effects get frame.target = the attacker for
// onDamageTaken/onHpLost, the victim for onDamageDealt, the card's target for
// onCardPlayed/afterCardPlayed, the attacker for onEnemyAttackDeclared/onRiposteTriggered,
// the spawned enemy for onEnemySpawn, otherwise null.
//
// MODIFIERS (pure, preview-safe) visit the OWNING entity's listeners only, in the same order:
// statuses on the entity, then relics (player) or the EnemyDef hooks (enemy); for the player,
// then the `handModifiers` of cards in hand (left to right). Exceptions: modifyStatusCap visits
// the target's listeners and then the player's (a relic can raise enemy caps); an enemy's status
// decay also folds the player's keepEnemyStatus after the enemy's own keepStatus.
// Breaker v2 hooks: onStatusSpent (the spender, after spend_status), onGuardShed (player).
//
// ROUND PHASES (StatusDef.tick / decay):
//   start_player_turn: global, after onTurnStart hooks (player turn start step 4).
//   end_player_turn:   global, ticks at player turn end step 1, decays at step 5.
//   end_enemy_turn:    global, after every enemy has acted.
//   end_own_turn:      per entity: the player at turn end steps 1 (tick) / 5 (decay); each
//                      enemy right after its move (tick, its queued effects, then decay).
// In each phase all ticks fire, their queued effects resolve, then decays apply.
// Decay: duration/amount lose 1 (decayBy 'one'), all, or half; flags are removed. The keepStatus
// modifier (max over hooks) keeps up to that many stacks.

import { getCardDef, getEnemyDef, getRelicDef, getStatusDef } from '../content';
import { emit, enqueue, livingEnemies, statusesOf, type Env } from './core';
import { capHit } from './caps';
import { effectItems, makeEffectCtx, makeModifierCtx } from './ctx';
import { TUNING } from './tuning';
import type {
  BlockInfo,
  CardInstance,
  DamageInfo,
  EffectSource,
  EnemyDef,
  EntityRef,
  EventHooks,
  HookCtx,
  HookInfoMap,
  HookName,
  ModifierCtx,
  ModifierHooks,
  RelicState,
  RoundPhase,
  RunState,
  StatusDef,
  StatusId,
  Triggers,
} from './types';

interface Listener {
  source: EffectSource;
  owner: EntityRef;
  events: EventHooks | undefined;
  mods: ModifierHooks | undefined;
  triggers: Triggers | undefined;
}

function statusListeners(state: RunState, owner: EntityRef): Listener[] {
  if (!state.combat) return [];
  return Object.keys(statusesOf(state, owner)).map((id) => {
    const def = getStatusDef(id);
    return { source: { kind: 'status', id, owner }, owner, events: def.hooks, mods: def.hooks, triggers: def.triggers };
  });
}

function relicListeners(state: RunState): Listener[] {
  return state.player.relics.map((r) => {
    const def = getRelicDef(r.id);
    return { source: { kind: 'relic', id: r.id }, owner: 'player', events: def.hooks, mods: def.hooks, triggers: def.triggers };
  });
}

function enemyListener(state: RunState, uid: number): Listener {
  const combat = state.combat;
  if (!combat) throw new Error('enemyListener outside combat');
  const e = combat.enemies.find((x) => x.uid === uid);
  if (!e) throw new Error(`enemyListener: no enemy ${uid}`);
  const def = getEnemyDef(e.id);
  return { source: { kind: 'enemy', uid, id: e.id, moveId: null }, owner: uid, events: enemyEvents(def), mods: def.hooks, triggers: undefined };
}

function handModListeners(state: RunState): Listener[] {
  const combat = state.combat;
  if (!combat || state.phase !== 'combat') return [];
  const out: Listener[] = [];
  for (const card of combat.hand) {
    const mods = getCardDef(card.id, card.upgraded).hooks?.handModifiers;
    if (mods) out.push({ source: { kind: 'card', uid: card.uid, id: card.id, upgraded: card.upgraded }, owner: 'player', events: undefined, mods, triggers: undefined });
  }
  return out;
}

type Hook<I> = ((ctx: HookCtx, info: I) => void) | undefined;

function chain<I>(a: Hook<I>, b: Hook<I>): Hook<I> {
  if (!a) return b;
  if (!b) return a;
  return (ctx, info) => {
    a(ctx, info);
    b(ctx, info);
  };
}

const enemyEventsCache: Record<string, EventHooks> = Object.create(null) as Record<string, EventHooks>;

/** EnemyDef.hooks with the top-level aliases (onTurnStart, onDamaged, onDeath) chained after. */
function enemyEvents(def: EnemyDef): EventHooks {
  const cached = enemyEventsCache[def.id];
  if (cached) return cached;
  const h = def.hooks ?? {};
  const merged: EventHooks = {
    ...h,
    onTurnStart: chain<HookInfoMap['onTurnStart']>(h.onTurnStart, def.onTurnStart),
    onDamageTaken: chain<HookInfoMap['onDamageTaken']>(h.onDamageTaken, def.onDamaged),
    onDeath: chain<HookInfoMap['onDeath']>(h.onDeath, def.onDeath),
  };
  enemyEventsCache[def.id] = merged;
  return merged;
}

/** Listeners for an entity-scoped hook, in dispatch order. */
export function entityListeners(state: RunState, ref: EntityRef): Listener[] {
  const out = statusListeners(state, ref);
  if (ref === 'player') out.push(...relicListeners(state));
  else out.push(enemyListener(state, ref));
  return out;
}

function modListeners(state: RunState, ref: EntityRef): Listener[] {
  const out = entityListeners(state, ref);
  if (ref === 'player') out.push(...handModListeners(state));
  return out;
}

export function globalListeners(state: RunState): Listener[] {
  const out = [...statusListeners(state, 'player'), ...relicListeners(state)];
  if (state.combat) {
    for (const e of livingEnemies(state.combat)) {
      out.push(...statusListeners(state, e.uid), enemyListener(state, e.uid));
    }
  }
  return out;
}

/** Live state for a listener, or null if it is gone (status removed / relic lost / card left hand). */
function liveState(state: RunState, l: Listener): { stacks: number; relic: RelicState | null } | null {
  const src = l.source;
  if (src.kind === 'status') {
    if (!state.combat) return null;
    const v = statusesOf(state, src.owner)[src.id];
    return v === undefined ? null : { stacks: v, relic: null };
  }
  if (src.kind === 'relic') {
    const relic = state.player.relics.find((r) => r.id === src.id);
    return relic ? { stacks: 0, relic } : null;
  }
  return { stacks: 0, relic: null };
}

export function dispatch<K extends HookName>(
  env: Env,
  hook: K,
  scope: 'global' | EntityRef,
  info: HookInfoMap[K],
  triggerTarget: EntityRef | null = null,
  onBeat = false,
): void {
  const listeners = scope === 'global' ? globalListeners(env.state) : entityListeners(env.state, scope);
  runListeners(env, listeners, hook, info, triggerTarget, onBeat);
}

/** Dispatch a hook to one relic only (onPickup). */
export function dispatchRelic<K extends HookName>(env: Env, relicId: string, hook: K, info: HookInfoMap[K]): void {
  const l = relicListeners(env.state).filter((x) => x.source.kind === 'relic' && x.source.id === relicId);
  runListeners(env, l, hook, info, null, false);
}

function runListeners<K extends HookName>(env: Env, listeners: Listener[], hook: K, info: HookInfoMap[K], triggerTarget: EntityRef | null, onBeat: boolean): void {
  for (const l of listeners) {
    const live = liveState(env.state, l);
    if (!live) continue;
    const trig = l.triggers?.[hook];
    const fn = l.events?.[hook];
    if (!trig && !fn) continue;
    const ctx = makeEffectCtx(env, { source: l.source, owner: l.owner, stacks: live.stacks, relic: live.relic, target: triggerTarget, card: null, x: 0, onBeat });
    if (trig && trig.length > 0) {
      if (l.source.kind === 'relic') emit(env, { t: 'relic_trigger', relic: l.source.id });
      enqueue(env, effectItems(trig, ctx.frame));
    }
    if (fn) fn(ctx, info);
  }
}

// ---------------------------------------------------------------------------
// Modifiers (pure)

/** Fold a modifier over the owner's modifier listeners. */
export function foldMods<T>(state: RunState, owner: EntityRef, preview: boolean, init: T, f: (mods: ModifierHooks, ctx: ModifierCtx, acc: T) => T): T {
  let acc = init;
  for (const l of modListeners(state, owner)) {
    if (!l.mods) continue;
    const live = liveState(state, l);
    if (!live) continue;
    acc = f(l.mods, makeModifierCtx(state, { source: l.source, owner: l.owner, stacks: live.stacks, relic: live.relic }, preview), acc);
  }
  return acc;
}

export const sumDamageDealtFlat = (s: RunState, owner: EntityRef, info: DamageInfo, preview: boolean): number =>
  foldMods(s, owner, preview, 0, (m, c, a) => (m.damageDealtFlat ? a + m.damageDealtFlat(c, info) : a));

export const damageDealtPcts = (s: RunState, owner: EntityRef, info: DamageInfo, preview: boolean): number[] =>
  foldMods<number[]>(s, owner, preview, [], (m, c, a) => (m.damageDealtMult ? [...a, m.damageDealtMult(c, info)] : a));

export const damageTakenPcts = (s: RunState, owner: EntityRef, info: DamageInfo, preview: boolean): number[] =>
  foldMods<number[]>(s, owner, preview, [], (m, c, a) => (m.damageTakenMult ? [...a, m.damageTakenMult(c, info)] : a));

export const sumDamageTakenFlat = (s: RunState, owner: EntityRef, info: DamageInfo, preview: boolean): number =>
  foldMods(s, owner, preview, 0, (m, c, a) => (m.damageTakenFlat ? a + m.damageTakenFlat(c, info) : a));

export const exposedPerStack = (s: RunState, attacker: EntityRef, info: DamageInfo, preview: boolean): number =>
  foldMods(s, attacker, preview, 1, (m, c, a) => (m.exposedPerStack ? m.exposedPerStack(c, a, info) : a));

export const foldDamageTaken = (s: RunState, owner: EntityRef, amount: number, info: DamageInfo, preview: boolean): number =>
  foldMods(s, owner, preview, amount, (m, c, a) => (m.modifyDamageTaken ? Math.max(0, Math.floor(m.modifyDamageTaken(c, a, info))) : a));

export const foldHpLoss = (s: RunState, owner: EntityRef, amount: number, info: DamageInfo): number =>
  foldMods(s, owner, false, amount, (m, c, a) => (m.modifyHpLoss ? Math.max(0, Math.floor(m.modifyHpLoss(c, a, info))) : a));

export const sumBlockFlat = (s: RunState, owner: EntityRef, info: BlockInfo, preview: boolean): number =>
  foldMods(s, owner, preview, 0, (m, c, a) => a + (m.blockFlat ? m.blockFlat(c, info) : 0) + (info.pool === 'guard' && m.guardFlat ? m.guardFlat(c, info) : 0));

export const blockPcts = (s: RunState, owner: EntityRef, info: BlockInfo, preview: boolean): number[] =>
  foldMods<number[]>(s, owner, preview, [], (m, c, a) => (m.blockMult ? [...a, m.blockMult(c, info)] : a));

export const foldCardCost = (s: RunState, card: CardInstance, cost: number): number =>
  foldMods(s, 'player', true, cost, (m, c, a) => (m.modifyCardCost ? m.modifyCardCost(c, card, a) : a));

export function keptBlock(state: RunState, owner: EntityRef, block: number): number {
  const keep = foldMods(state, owner, false, 0, (m, c, a) => (m.keepBlock ? Math.max(a, m.keepBlock(c, block)) : a));
  return Math.min(block, Math.max(0, keep));
}

/** Guard lost at the owner's turn start (default: halve, round down). */
export function guardDecayLoss(state: RunState, owner: EntityRef, guard: number): number {
  const base = guard - Math.floor(guard / 2);
  const lost = foldMods(state, owner, false, base, (m, c, a) => (m.guardDecay ? m.guardDecay(c, guard, a) : a));
  return Math.max(0, Math.min(guard, Math.floor(lost)));
}

export function keptStatus(state: RunState, owner: EntityRef, id: StatusId, stacks: number): number {
  let keep = foldMods(state, owner, false, 0, (m, c, a) => (m.keepStatus ? Math.max(a, m.keepStatus(c, id, stacks)) : a));
  // Breaker v2 (Crazing): the player's keepEnemyStatus modifiers can keep an enemy's stacks too.
  if (owner !== 'player') keep = foldMods(state, 'player', false, keep, (m, c, a) => (m.keepEnemyStatus ? Math.max(a, m.keepEnemyStatus(c, owner, id, stacks)) : a));
  return Math.max(0, Math.min(Math.abs(stacks), keep));
}

export const foldStatusApplied = (s: RunState, owner: EntityRef, id: StatusId, amount: number): number =>
  foldMods(s, owner, false, amount, (m, c, a) => (m.modifyStatusApplied ? m.modifyStatusApplied(c, id, a) : a));

export function foldHeal(state: RunState, owner: EntityRef, amount: number): number {
  if (!state.combat && owner !== 'player') throw new Error('foldHeal: enemy outside combat');
  return foldMods(state, owner, false, amount, (m, c, a) => (m.modifyHeal ? Math.max(0, Math.floor(m.modifyHeal(c, a))) : a));
}

/** Player-side rule modifier: fold `key` with the given reducer over the player's modifier listeners. */
export function playerRule<T>(state: RunState, init: T, f: (m: ModifierHooks, c: ModifierCtx, acc: T) => T, preview = true): T {
  return foldMods(state, 'player', preview, init, f);
}

/** Effective stack cap for a status on `target` (Infinity when uncapped). */
export function statusCap(state: RunState, target: EntityRef, id: StatusId): number {
  const def = getStatusDef(id);
  const base = TUNING.caps.status[id] ?? def.maxStacks ?? Number.POSITIVE_INFINITY;
  let cap = foldMods(state, target, true, base, (m, c, a) => (m.modifyStatusCap ? m.modifyStatusCap(c, id, a, target) : a));
  if (target !== 'player') cap = foldMods(state, 'player', true, cap, (m, c, a) => (m.modifyStatusCap ? m.modifyStatusCap(c, id, a, target) : a));
  return cap;
}

/** Apply integer percent multipliers with a single floor at the end. */
export function applyPcts(value: number, pcts: readonly number[]): number {
  let num = Math.max(0, value);
  let den = 1;
  for (const p of pcts) {
    if (!Number.isInteger(p) || p < 0) throw new Error(`percent multiplier must be a non-negative integer, got ${p}`);
    num *= p;
    den *= 100;
  }
  return Math.floor(num / den);
}

// ---------------------------------------------------------------------------
// Applying statuses

/** Apply/increase a status (stacking rules, caps, Artifact-like interception, events, hooks). */
export function applyStatus(env: Env, target: EntityRef, id: StatusId, amount: number): void {
  const state = env.state;
  if (!state.combat) throw new Error(`applyStatus(${id}) outside combat`);
  const def = getStatusDef(id);
  if (target !== 'player' && !state.combat.enemies.find((e) => e.uid === target)?.alive) return;
  if (target === 'player' && state.player.hp <= 0) return;
  if (amount === 0) return;
  const adjusted = foldStatusApplied(state, target, id, amount);
  if (adjusted === 0) return;
  const prev = statusesOf(state, target)[id] ?? 0;
  let next: number;
  if (def.stacks === 'flag') next = adjusted > 0 ? 1 : 0;
  else if (def.stacks === 'max') next = Math.max(prev, adjusted);
  else {
    next = prev + adjusted;
    if (!(def.stacks === 'amount' && def.allowNegative)) next = Math.max(0, next);
    const cap = statusCap(state, target, id);
    if (next > cap) {
      next = Math.max(prev, cap);
      capHit(env, 'cap_stacks');
    }
  }
  setStatusStacks(env, target, id, next);
}

/** Set stacks directly (0 removes). Emits the status event and fires onApplied / onRemoved / onStatusChanged. */
export function setStatusStacks(env: Env, target: EntityRef, id: StatusId, next: number): void {
  const def = getStatusDef(id);
  const map = statusesOf(env.state, target);
  const prev = map[id] ?? 0;
  if (next === prev) return;
  if (next === 0) delete map[id];
  else map[id] = next;
  emit(env, { t: 'status', target, status: id, delta: next - prev, now: next });
  const ctxFor = (stacks: number) =>
    makeEffectCtx(env, { source: { kind: 'status', id, owner: target }, owner: target, stacks, relic: null, target: null, card: null, x: 0 });
  if (prev === 0 && next !== 0) def.hooks?.onApplied?.(ctxFor(next), { delta: next - prev });
  if (next === 0) def.hooks?.onRemoved?.(ctxFor(0));
  dispatch(env, 'onStatusChanged', target, { target, id, delta: next - prev });
}

// ---------------------------------------------------------------------------
// Round phases

function holders(state: RunState): EntityRef[] {
  const combat = state.combat;
  if (!combat) throw new Error('round phase outside combat');
  return ['player', ...livingEnemies(combat).map((e) => e.uid)];
}

/** Global phase tick (every holder). */
export function tickPhase(env: Env, phase: RoundPhase): void {
  for (const ref of holders(env.state)) tickEntity(env, ref, phase);
}

export function decayPhase(env: Env, phase: RoundPhase): void {
  for (const ref of holders(env.state)) decayEntity(env, ref, phase);
}

export function tickEntity(env: Env, ref: EntityRef, phase: RoundPhase): void {
  if (ref !== 'player' && !env.state.combat?.enemies.find((e) => e.uid === ref)?.alive) return;
  for (const id of Object.keys(statusesOf(env.state, ref))) {
    const def = getStatusDef(id);
    if (def.tick !== phase) continue;
    const stacks = statusesOf(env.state, ref)[id];
    if (stacks === undefined) continue; // removed by an earlier tick this phase
    const ctx = makeEffectCtx(env, { source: { kind: 'status', id, owner: ref }, owner: ref, stacks, relic: null, target: null, card: null, x: 0 });
    const trig = def.triggers?.onTick;
    if (trig) enqueue(env, effectItems(trig, ctx.frame));
    def.hooks?.onTick?.(ctx);
  }
}

export function decayEntity(env: Env, ref: EntityRef, phase: RoundPhase): void {
  if (ref !== 'player' && !env.state.combat?.enemies.find((e) => e.uid === ref)?.alive) return;
  for (const id of Object.keys(statusesOf(env.state, ref))) {
    const def = getStatusDef(id);
    if (def.decay !== phase) continue;
    const stacks = statusesOf(env.state, ref)[id];
    if (stacks === undefined) continue;
    const base = decayed(def, stacks);
    const kept = keptStatus(env.state, ref, id, stacks);
    const next = stacks >= 0 ? Math.max(base, kept) : Math.min(base, -kept);
    setStatusStacks(env, ref, id, next);
  }
}

function decayed(def: StatusDef, stacks: number): number {
  if (def.stacks === 'flag') return 0;
  const by = def.decayBy ?? 'one';
  if (by === 'all') return 0;
  if (by === 'half') return stacks < 0 ? -Math.floor(-stacks / 2) : Math.floor(stacks / 2);
  return stacks > 0 ? stacks - 1 : stacks + 1;
}
