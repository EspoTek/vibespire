// The effect queue: drain loop, synchronous execution (HookCtx.now), pending choices, and the
// death / victory checks that run after every queue item.
//
// Ordering: items queued while an item executes go to the FRONT of the queue, in the order they
// were queued (depth-first, like STS addToTop). Items queued by an action handler (no item
// executing) go to the back.

import { cardDef, discardFromHand, exhaustCards, isUpgradable, takeFrom, upgradeCard } from './cards';
import { combatStep, finishCardItem, triageKeepKey } from './combat';
import { emit, enqueue, getEnemy, queueHost, requireCombat, type Env } from './core';
import { resolveBloomPick, resolvePruneScrap } from './bloom';
import { addToDeck, transformInDeck, upgradeInDeck } from './deck';
import { copyHandCard, execEffect, moveFetched, removeDeckCardChecked } from './effects';
import { gainPotion } from './items';
import { finishPrime, primeCards } from './riposte';
import { duplicateCard, losePotionAt, loseRelic, transmutePick } from './runeffects';
import { effectItems } from './ctx';
import { runStep } from './run';
import { scheduleCards } from './timeline';
import { dispatch } from './statuses';
import type { Action, PendingChoice, QueueItem, TurnStep } from './types';

const MAX_ITEMS_PER_APPLY = 200_000;

export function drain(env: Env): void {
  for (let n = 0; ; n++) {
    if (n > MAX_ITEMS_PER_APPLY) throw new Error(`effect queue did not settle after ${MAX_ITEMS_PER_APPLY} items (infinite loop?)`);
    const s = env.state;
    if (s.phase === 'defeat' || s.phase === 'victory') return;
    const host = queueHost(s);
    if (host.pendingChoice) return;
    const item = host.queue.shift();
    if (!item) return;
    const sink = runItem(env, item);
    queueHost(env.state).queue.unshift(...sink);
    afterItem(env);
  }
}

function runItem(env: Env, item: QueueItem): QueueItem[] {
  const sink: QueueItem[] = [];
  env.sinks.push(sink);
  execItem(env, item);
  if (env.sinks.pop() !== sink) throw new Error('queue sink stack corrupted');
  return sink;
}

/** Run items to completion right now (depth-first). Opening a choice inside throws. */
export function runNow(env: Env, items: QueueItem[]): void {
  env.noChoice += 1;
  const local = [...items];
  for (let n = 0; local.length > 0; n++) {
    if (n > MAX_ITEMS_PER_APPLY) throw new Error('runNow did not settle (infinite loop?)');
    const item = local.shift();
    if (!item) break;
    local.unshift(...runItem(env, item));
  }
  env.noChoice -= 1;
}

function execItem(env: Env, item: QueueItem): void {
  switch (item.kind) {
    case 'effect': {
      const src = item.frame.src;
      // A dead enemy's remaining move effects fizzle (its death hooks still resolve).
      if (src.kind === 'enemy' && src.moveId !== null && env.state.combat && !getEnemy(env.state.combat, src.uid).alive) return;
      execEffect(env, item.effect, item.frame);
      return;
    }
    case 'finish_card':
      finishCardItem(env, item);
      return;
    case 'step':
      execStep(env, item.step);
      return;
  }
}

function execStep(env: Env, step: TurnStep): void {
  switch (step.op) {
    case 'start_boon_done':
    case 'event_option_done':
    case 'enter_room':
    case 'next_act':
    case 'transmute_offer':
      runStep(env, step);
      return;
    default:
      combatStep(env, step);
  }
}

function afterItem(env: Env): void {
  const s = env.state;
  if (s.phase === 'defeat' || s.phase === 'victory') return;
  if (s.phase === 'combat') {
    const c = requireCombat(s, 'afterItem');
    if (c.outcome === 'lost') return;
    if (s.player.hp <= 0) {
      handlePlayerDeath(env);
      return;
    }
    if (c.outcome === null && c.enemies.every((e) => !e.alive)) declareWin(env);
    return;
  }
  if (s.player.hp <= 0) handlePlayerDeath(env);
}

function handlePlayerDeath(env: Env): void {
  const s = env.state;
  const sink: QueueItem[] = [];
  env.sinks.push(sink);
  dispatch(env, 'onDeath', 'player', {});
  env.sinks.pop();
  runNow(env, sink);
  if (s.player.hp > 0) return; // revived
  if (s.combat) {
    s.combat.outcome = 'lost';
    s.combat.queue.length = 0;
    s.combat.pendingChoice = null;
  }
  s.queue.length = 0;
  s.pendingChoice = null;
  emit(env, { t: 'player_died' });
  s.phase = 'defeat';
  emit(env, { t: 'phase', phase: 'defeat' });
}

/** All enemies dead: drop turn structure, let queued effects finish, then end-of-combat hooks and rewards. */
function declareWin(env: Env): void {
  const c = requireCombat(env.state, 'declareWin');
  c.outcome = 'won';
  c.queue = c.queue.filter((i) => i.kind !== 'step');
  c.queue.push({ kind: 'step', step: { op: 'combat_end_hooks' } }, { kind: 'step', step: { op: 'combat_finalize' } });
}

// ---------------------------------------------------------------------------
// Pending choices

export function openChoice(env: Env, choice: Omit<PendingChoice, 'picked'>): void {
  if (env.noChoice > 0) throw new Error(`an effect run synchronously (ctx.now) tried to open a choice: "${choice.prompt}"`);
  const s = env.state;
  // Once the fight is decided, choices that would follow are dropped.
  if (s.phase === 'combat' && s.combat && s.combat.outcome !== null) return;
  if (choice.choices.length === 0) return;
  const host = queueHost(s);
  if (host.pendingChoice) throw new Error('a choice is already pending');
  host.pendingChoice = { ...choice, picked: [] };
  emit(env, { t: 'choice', prompt: choice.prompt });
}

/** The choice is answered one pick at a time (see PendingChoice.picked). */
export function isMultiPick(pc: PendingChoice): boolean { return pc.max > 1; }

/**
 * Every legal answer step, linear in the number of choices:
 *  - single-pick: resolve_choice with each choice (and [] when min is 0);
 *  - multi-pick: resolve_choice with `picked` once its size is within min..max, then choice_toggle for
 *    each unpicked choice (while there is room) and each picked one.
 */
export function choiceActions(pc: PendingChoice): Action[] {
  const out: Action[] = [];
  if (!isMultiPick(pc)) {
    if (pc.min === 0) out.push({ type: 'resolve_choice', uids: [] });
    if (pc.max >= 1) for (const id of pc.choices) out.push({ type: 'resolve_choice', uids: [id] });
    return out;
  }
  // order: confirm (when valid), then select, then deselect, so "take the first legal action" always
  // makes progress instead of toggling one card on and off
  if (pc.picked.length >= pc.min && pc.picked.length <= pc.max) out.push({ type: 'resolve_choice', uids: [...pc.picked] });
  if (pc.picked.length < pc.max) for (const id of pc.choices) if (!pc.picked.includes(id)) out.push({ type: 'choice_toggle', uid: id });
  for (const id of pc.picked) out.push({ type: 'choice_toggle', uid: id });
  return out;
}

/** Select / deselect one choice of the pending multi-pick choice (keeps `picked` in choices order). */
export function toggleChoice(env: Env, uid: number): void {
  const pc = queueHost(env.state).pendingChoice;
  if (!pc) throw new Error('choice_toggle without a pending choice');
  if (!isMultiPick(pc)) throw new Error(`choice_toggle on single-pick choice "${pc.prompt}"`);
  const on = !pc.picked.includes(uid);
  const next = on ? [...pc.picked, uid] : pc.picked.filter((x) => x !== uid);
  pc.picked = pc.choices.filter((c) => next.includes(c));
}

/**
 * The next legal step toward answering `pc` with `uids` (a subset of choices): for a multi-pick choice,
 * deselect what isn't wanted, select what's missing, then resolve; for a single pick, the answer itself.
 * Policies and the UI answer a choice by applying steps until this returns a resolve_choice.
 */
export function choiceStep(pc: PendingChoice, uids: readonly number[]): Action {
  const want = pc.choices.filter((c) => uids.includes(c));
  if (want.length !== uids.length) throw new Error(`choiceStep: [${uids.join(', ')}] is not a subset of the choices of "${pc.prompt}"`);
  if (!isMultiPick(pc)) return { type: 'resolve_choice', uids: want };
  const extra = pc.picked.find((p) => !want.includes(p));
  if (extra !== undefined) return { type: 'choice_toggle', uid: extra };
  const missing = want.find((w) => !pc.picked.includes(w));
  if (missing !== undefined) return { type: 'choice_toggle', uid: missing };
  return { type: 'resolve_choice', uids: want };
}

export function resolveChoice(env: Env, uids: readonly number[]): void {
  const host = queueHost(env.state);
  const pc = host.pendingChoice;
  if (!pc) throw new Error('no pending choice');
  host.pendingChoice = null;
  const sink: QueueItem[] = [];
  env.sinks.push(sink);
  applyResume(env, pc, uids);
  env.sinks.pop();
  queueHost(env.state).queue.unshift(...sink);
  afterItem(env);
}

function applyResume(env: Env, pc: PendingChoice, uids: readonly number[]): void {
  const r = pc.resume;
  switch (r.op) {
    case 'discard':
      discardFromHand(env, uids);
      return;
    case 'exhaust':
      exhaustCards(env, r.from, uids);
      return;
    case 'upgrade_combat': {
      const combat = requireCombat(env.state, 'upgrade choice');
      for (const uid of uids) {
        const card = combat.hand.find((c) => c.uid === uid);
        if (!card || !isUpgradable(card)) throw new Error(`card ${uid} not an upgradable card in hand`);
        upgradeCard(env, card);
      }
      return;
    }
    case 'upgrade_deck':
      for (const uid of uids) upgradeInDeck(env, uid);
      return;
    case 'remove_deck': {
      const combat = env.state.phase === 'combat' ? env.state.combat : null;
      for (const uid of uids) {
        // A hand card chosen for permanent removal is also Scrapped (remove_card from 'hand').
        if (combat && combat.hand.some((c) => c.uid === uid)) exhaustCards(env, 'hand', [uid]);
        removeDeckCardChecked(env, uid);
      }
      return;
    }
    case 'transform_deck':
      for (const uid of uids) transformInDeck(env, uid);
      return;
    case 'scry': {
      const combat = requireCombat(env.state, 'scry choice');
      if (uids.length === 0) return;
      const cards = uids.map((uid) => takeFrom(combat.draw, uid, 'draw pile'));
      combat.discard.push(...cards);
      emit(env, { t: 'discard', uids: [...uids] });
      return;
    }
    case 'options': {
      const effects = r.options[one(uids)];
      if (!effects) throw new Error(`option index ${one(uids)} out of range`);
      enqueue(env, effectItems(effects, r.frame));
      return;
    }
    case 'prime':
      primeCards(env, uids, !r.step);
      if (r.step) finishPrime(env);
      return;
    case 'prune_scrap':
      resolvePruneScrap(env, r.spec, uids);
      return;
    case 'prune_bloom':
      resolveBloomPick(env, one(uids), r.amount, 'combat');
      return;
    case 'bloom_pick':
      resolveBloomPick(env, one(uids), r.amount, r.where);
      return;
    case 'fetch':
      moveFetched(env, uids, r);
      return;
    case 'transmute_choose':
      enqueue(env, uids.map((uid) => ({ kind: 'step' as const, step: { op: 'transmute_offer' as const, uid, offers: r.offers, rarity: r.rarity, upgrade: r.upgrade } })));
      return;
    case 'transmute_pick': {
      const offer = pc.offers[one(uids)];
      if (!offer) throw new Error('transmute pick out of range');
      transmutePick(env, r.uid, offer);
      return;
    }
    case 'offer_pick': {
      const offer = pc.offers[one(uids)];
      if (!offer) throw new Error('offer pick out of range');
      addToDeck(env, offer.id, offer.upgraded, 'event');
      return;
    }
    case 'duplicate':
      duplicateCard(env, one(uids));
      return;
    case 'lose_potion':
      losePotionAt(env, one(uids));
      return;
    case 'lose_relic': {
      const id = r.ids[one(uids)];
      if (id === undefined) throw new Error('lose_relic index out of range');
      loseRelic(env, id);
      return;
    }
    case 'potion_swap': {
      const i = one(uids);
      if (i < env.state.player.potions.length) {
        losePotionAt(env, i);
        gainPotion(env, r.potion);
      } else emit(env, { t: 'text', text: 'You leave the potion.' });
      return;
    }
    case 'schedule':
      scheduleCards(env, uids, r.turns, r.target);
      return;
    // --- Shared v2
    case 'exhaust_then': {
      const done = exhaustCards(env, r.from, uids);
      enqueue(env, effectItems(r.then, { ...r.frame, scrapped: done.length }));
      return;
    }
      return;
    case 'triage': {
      const combat = requireCombat(env.state, 'triage choice');
      for (const uid of uids) combat.counters[triageKeepKey(uid)] = 1;
      const kept = new Set(uids);
      const rest = combat.hand.filter((c) => !kept.has(c.uid) && !(cardDef(c).keywords ?? []).includes('retain')).map((c) => c.uid);
      exhaustCards(env, 'hand', rest);
      return;
    }
    case 'copy_card':
      copyHandCard(env, one(uids), r.costThisTurn);
      return;
  }
}

function one(uids: readonly number[]): number {
  const v = uids[0];
  if (v === undefined || uids.length !== 1) throw new Error('this choice needs exactly one selection');
  return v;
}
