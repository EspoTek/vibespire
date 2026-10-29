// Damage / block / hp pipeline (GDD §2.15, authoritative). Per hit from attacker A to target T:
//   1. base (the resolved amount)
//   2. + A's damageDealtFlat
//   3. x A's damageDealtMult x T's damageTakenMult (x TUNING.enemyDamagePct[act] for enemy hits), floor
//   4. max(0, d - A.stagger + T.exposed * exposedPerStack(A) + T.backlash_primed * 4 (enemy hits on the
//      player) + T's damageTakenFlat)
//   5. T's modifyDamageTaken
//   6. absorb: T's Block, then T's Guard (ignoreBlock skips both)
//   7. HP loss (T's modifyHpLoss) -> onDamageDealt / onDamageTaken / onHpLost -> death check
// lose_hp skips steps 1-6. computeDamage(preview=true) runs steps 1-5 (card text, intents, Timeline).
// Block / Guard gain: (base + blockFlat [+ guardFlat for Guard]) x blockMult, floor; Guard capped.

import { capHit } from './caps';
import { blockOf, emit, getEnemy, guardOf, hpOf, isAlive, requireCombat, setBlock, setGuard, setHp, stacksOf, type Env } from './core';
import {
  applyPcts,
  blockPcts,
  damageDealtPcts,
  damageTakenPcts,
  dispatch,
  exposedPerStack,
  foldDamageTaken,
  foldHeal,
  foldHpLoss,
  setStatusStacks,
  sumBlockFlat,
  sumDamageDealtFlat,
  sumDamageTakenFlat,
} from './statuses';
import { currentFloor } from './history';
import { TUNING } from './tuning';
import type { BlockInfo, CardInstance, DamageInfo, DamageResult, EntityRef, RunState } from './types';

/** Engine-known status ids used by the built-in pipeline step 4. */
export const STATUS_EXPOSED = 'exposed';
export const STATUS_STAGGER = 'stagger';
export const STATUS_BACKLASH = 'backlash_primed';
/** Reserved move id: a minion fleeing because its leader died. */
export const FLEE_MOVE = '__flee';

function backlashBonus(state: RunState, info: DamageInfo): number {
  if (info.target !== 'player' || info.source === null || info.source === 'player') return 0;
  return stacksOf(state, 'player', STATUS_BACKLASH) * TUNING.backlashPerStack;
}

export function computeDamage(state: RunState, info: DamageInfo, base: number, preview: boolean): number {
  let dmg = base;
  if (info.source !== null) dmg += sumDamageDealtFlat(state, info.source, info, preview);
  const pcts: number[] = [];
  if (info.source !== null) pcts.push(...damageDealtPcts(state, info.source, info, preview));
  if (info.target !== null) pcts.push(...damageTakenPcts(state, info.target, info, preview));
  if (typeof info.source === 'number') {
    const pct = TUNING.enemyDamagePct[state.act];
    if (pct !== 100) pcts.push(pct);
  }
  dmg = applyPcts(dmg, pcts);
  // step 4
  const stagger = info.source !== null ? stacksOf(state, info.source, STATUS_STAGGER) : 0;
  let step4 = -stagger;
  if (info.target !== null) {
    const per = info.source !== null ? exposedPerStack(state, info.source, info, preview) : 1;
    step4 += stacksOf(state, info.target, STATUS_EXPOSED) * per;
    step4 += backlashBonus(state, info);
    step4 += sumDamageTakenFlat(state, info.target, info, preview);
  }
  dmg = Math.max(0, dmg + step4);
  if (info.target !== null) dmg = foldDamageTaken(state, info.target, dmg, info, preview);
  return Math.max(0, dmg);
}

export function computeBlock(state: RunState, owner: EntityRef, base: number, preview: boolean, info: BlockInfo = { pool: 'block', tags: [] }): number {
  const flat = base + sumBlockFlat(state, owner, info, preview);
  return applyPcts(flat, blockPcts(state, owner, info, preview));
}

export interface DealDamageArgs {
  source: EntityRef | null;
  target: EntityRef;
  base: number;
  card: CardInstance | null;
  tags: readonly string[];
  ignoreBlock: boolean;
}

/** Runs the full pipeline. Skips (no event) if the target is already dead. */
/** Enemy HP lost counts toward the current floor's damageDealt (run summary). */
function addDamageDealt(state: RunState, hpLost: number): void {
  const rec = currentFloor(state);
  // null = this floor was entered under engine v1 (migrated save): its total is unknown and stays so
  if (rec.damageDealt !== null) rec.damageDealt += hpLost;
}

export function dealDamage(env: Env, a: DealDamageArgs): void {
  const state = env.state;
  const combat = requireCombat(state, 'dealDamage');
  if (!isAlive(state, a.target)) return;
  const info: DamageInfo = { source: a.source, target: a.target, card: a.card, tags: a.tags };
  const amount = computeDamage(state, info, a.base, false);
  const usedBacklash = backlashBonus(state, info) > 0;
  const block = blockOf(state, a.target);
  const blocked = a.ignoreBlock ? 0 : Math.min(block, amount);
  if (blocked > 0) setBlock(state, a.target, block - blocked);
  const guard = guardOf(state, a.target);
  const guarded = a.ignoreBlock ? 0 : Math.min(guard, amount - blocked);
  if (guarded > 0) setGuard(state, a.target, guard - guarded);
  const loss = foldHpLoss(state, a.target, amount - blocked - guarded, info);
  const { hp } = hpOf(state, a.target);
  const newHp = Math.max(0, hp - loss);
  const hpLost = hp - newHp;
  setHp(state, a.target, newHp);
  if (a.target === 'player') combat.damageTaken += hpLost;
  else addDamageDealt(state, hpLost);
  if (a.source === 'player' && a.card && !a.tags.includes('riposte') && combat.counters.curCardUid === a.card.uid) {
    combat.counters.curCardDmg = (combat.counters.curCardDmg ?? 0) + hpLost;
    combat.counters.bestCardDamage = Math.max(combat.counters.bestCardDamage ?? 0, combat.counters.curCardDmg);
  }
  emit(env, { t: 'damage', kind: 'attack', source: a.source, target: a.target, amount, blocked, guarded, hpLost });
  if (usedBacklash) setStatusStacks(env, 'player', STATUS_BACKLASH, 0);
  const result: DamageResult = { ...info, target: a.target, amount, blocked, guarded, hpLost };
  if (a.source !== null) dispatch(env, 'onDamageDealt', a.source, result, a.target);
  dispatch(env, 'onDamageTaken', a.target, result, a.source);
  if (guarded > 0) dispatch(env, 'onGuardAbsorbed', a.target, { amount: guarded, source: a.source }, a.source);
  if (hpLost > 0) dispatch(env, 'onHpLost', a.target, { amount: hpLost, source: a.source, fromHit: true }, a.source);
  checkEnemyDeath(env, a.target);
}

/** HP loss that bypasses the whole pipeline. Works out of combat for the player. */
export function loseHp(env: Env, target: EntityRef, amount: number, source: EntityRef | null): void {
  const state = env.state;
  if (amount <= 0) return;
  if (!isAlive(state, target)) return;
  const { hp } = hpOf(state, target);
  const newHp = Math.max(0, hp - amount);
  const hpLost = hp - newHp;
  setHp(state, target, newHp);
  if (target === 'player' && state.combat && state.phase === 'combat') state.combat.damageTaken += hpLost;
  if (target !== 'player') addDamageDealt(state, hpLost);
  emit(env, { t: 'damage', kind: 'hp_loss', source, target, amount, blocked: 0, guarded: 0, hpLost });
  if (hpLost > 0 && state.phase === 'combat') dispatch(env, 'onHpLost', target, { amount: hpLost, source, fromHit: false }, source);
  if (state.phase === 'combat') checkEnemyDeath(env, target);
}

/** Gain Block or Guard (pool). Guard is capped at TUNING.caps.guard. */
export function gainDefence(env: Env, target: EntityRef, base: number, pool: 'block' | 'guard', tags: readonly string[]): void {
  const state = env.state;
  requireCombat(state, 'gainDefence');
  if (!isAlive(state, target)) return;
  let amount = computeBlock(state, target, base, false, { pool, tags });
  if (amount <= 0) return;
  if (pool === 'block') setBlock(state, target, blockOf(state, target) + amount);
  else {
    const cur = guardOf(state, target);
    const room = Math.max(0, TUNING.caps.guard - cur);
    if (amount > room) {
      capHit(env, 'cap_stacks');
      amount = room;
    }
    if (amount <= 0) return;
    setGuard(state, target, cur + amount);
  }
  emit(env, { t: 'block', target, amount, pool });
  dispatch(env, 'onBlockGained', target, { amount, pool });
}

export function heal(env: Env, target: EntityRef, base: number): void {
  const state = env.state;
  if (base <= 0) return;
  if (target !== 'player' && !isAlive(state, target)) return;
  const amount = foldHeal(state, target, base);
  const { hp, maxHp } = hpOf(state, target);
  const healed = Math.min(amount, maxHp - hp);
  if (healed <= 0) return;
  setHp(state, target, hp + healed);
  emit(env, { t: 'heal', target, amount: healed });
}

/** Enemy death: onDeath (its statuses first), onEnemyDied (with final statuses), then minions die or flee. */
export function checkEnemyDeath(env: Env, target: EntityRef): void {
  if (target === 'player') return; // player death is resolved by the queue after the current item
  const combat = requireCombat(env.state, 'checkEnemyDeath');
  const e = getEnemy(combat, target);
  if (!e.alive || e.hp > 0) return;
  e.alive = false;
  e.block = 0;
  e.guard = 0;
  emit(env, { t: 'enemy_died', uid: e.uid });
  if (combat.counters.declaringUid === e.uid) {
    delete combat.counters.declaringUid;
    emit(env, { t: 'attack_cancelled', uid: e.uid });
  }
  dispatch(env, 'onDeath', e.uid, {});
  dispatch(env, 'onEnemyDied', 'global', { uid: e.uid, enemyId: e.id, statuses: { ...e.statuses } });
  for (const m of combat.enemies) {
    if (!m.alive || m.leaderUid !== e.uid) continue;
    if (m.withLeader === 'die') {
      m.hp = 0;
      checkEnemyDeath(env, m.uid);
    } else if (m.withLeader === 'flee') {
      m.intent = { kind: 'escape', moveId: FLEE_MOVE };
      m.forecast = [];
      emit(env, { t: 'enemy_intent', uid: m.uid, intent: { ...m.intent } });
    }
  }
}
