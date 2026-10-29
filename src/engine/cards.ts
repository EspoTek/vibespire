// Card instances, piles, costs, playability, Bloom values and card filters.

import { getCardDef } from '../content';
import { capHit, takeBudget } from './caps';
import { allCombatCards, emit, requireCombat, type Env } from './core';
import { makeEffectCtx } from './ctx';
import { nextInt, shuffleInPlace } from './rng';
import { dispatch, foldCardCost, playerRule } from './statuses';
import { TUNING } from './tuning';
import { nextBeat } from './combat';
import type { CardDef, CardFilter, CardHooks, CardId, CardInstance, CardReadCtx, CombatState, Effect, EffectCtx, ReadCtx, RunState } from './types';

export function cardDef(card: Pick<CardInstance, 'id' | 'upgraded'>): CardDef {
  return getCardDef(card.id, card.upgraded);
}

export function makeCard(state: RunState, id: CardId, upgraded = false): CardInstance {
  getCardDef(id); // throws on unknown id
  const card: CardInstance = { uid: state.nextUid, id, upgraded };
  state.nextUid += 1;
  return card;
}

export function hasKeyword(def: CardDef, kw: NonNullable<CardDef['keywords']>[number]): boolean {
  return def.keywords?.includes(kw) ?? false;
}

export function isUpgradable(card: CardInstance): boolean {
  return !card.upgraded && Object.keys(getCardDef(card.id).upgrade).length > 0;
}

export function isBloomCard(card: Pick<CardInstance, 'id' | 'upgraded'>): boolean {
  return hasKeyword(cardDef(card), 'bloom');
}

/** Bloom value of a copy (a copy that never grew has none: 0). */
export function bloomOf(card: CardInstance): number {
  return card.vars?.bloom ?? 0;
}

export function bloomCapFor(state: RunState, card: CardInstance): number {
  return playerRule(state, TUNING.caps.bloom, (m, c, a) => (m.bloomCap ? m.bloomCap(c, card, a) : a));
}

/** Does a card definition match a filter? (all given fields must match) */
export function matchesFilter(def: CardDef, f: CardFilter | undefined): boolean {
  if (!f) return true;
  const inList = <T>(v: T, want: T | T[] | undefined): boolean => want === undefined || (Array.isArray(want) ? want.includes(v) : want === v);
  if (!inList(def.type, f.type)) return false;
  if (!inList(def.rarity, f.rarity)) return false;
  if (f.keyword !== undefined) {
    const kws = Array.isArray(f.keyword) ? f.keyword : [f.keyword];
    if (!kws.some((k) => hasKeyword(def, k))) return false;
  }
  if (f.tag !== undefined && !(def.tags ?? []).includes(f.tag)) return false;
  if (f.delay !== undefined && (def.delay !== undefined) !== f.delay) return false;
  if (f.riposte !== undefined && (def.riposte !== undefined) !== f.riposte) return false;
  return true;
}

/**
 * Effective cost right now: null = unplayable, 'X', or a number >= 0.
 * cap_cost_reduction: costOverride is never more than costReductionMax below printed, and an instance
 * already played below printed cost this turn pays printed cost.
 */
export function getCardCost(state: RunState, card: CardInstance): number | 'X' | null {
  const def = cardDef(card);
  if (def.cost === null) return null;
  if (def.cost === 'X') return 'X';
  const printed = def.cost;
  const override = card.costOverride === undefined ? undefined : Math.max(card.costOverride, printed - TUNING.caps.costReductionMax);
  let cost = card.tempCost ?? override ?? printed;
  if (def.hooks?.costModifier) cost = def.hooks.costModifier(cardReadCtx(state, card), cost);
  if (state.combat) cost = foldCardCost(state, card, cost);
  cost = Math.max(0, cost);
  if (state.combat && cost < printed && state.combat.reducedThisTurn.includes(card.uid)) cost = printed;
  return cost;
}

function cardReadCtx(state: RunState, card: CardInstance): CardReadCtx {
  return { state, combat: state.combat, card, nextBeat: () => nextBeat(state) };
}

/** Shards a card's top-level effects spend (negative literal `shards` amounts). */
function shardsNeeded(effects: readonly Effect[]): number {
  let need = 0;
  for (const e of effects) {
    if (e.type === 'shards' && typeof e.amount === 'number' && e.amount < 0) need += -e.amount;
  }
  return need;
}

/** true, or the reason the card cannot be played now. */
export function canPlayCard(state: RunState, card: CardInstance): true | string {
  const combat = state.combat;
  if (!combat || state.phase !== 'combat') return 'Not in combat.';
  if (combat.turnPhase !== 'player' || combat.outcome !== null) return 'Not your turn.';
  if (combat.pendingChoice) return 'Resolve the current choice first.';
  if (!combat.hand.some((c) => c.uid === card.uid)) return 'Card is not in your hand.';
  const def = cardDef(card);
  const cost = getCardCost(state, card);
  if (cost === null || hasKeyword(def, 'unplayable')) return 'Unplayable.';
  if (cost !== 'X' && cost > combat.energy) return 'Not enough energy.';
  if ((combat.counters.plays ?? 0) >= TUNING.caps.playsPerTurn) return 'Play limit reached this turn.';
  if (def.target === 'enemy' && !combat.enemies.some((e) => e.alive)) return 'No target.';
  if (def.delay) {
    if (combat.timeline.length >= TUNING.caps.timeline) return 'The Timeline is full.';
    if (combat.resolvedThisTurn.includes(card.uid)) return 'Already resolved from the Timeline this turn.';
  }
  const shards = shardsNeeded(def.effects);
  if (shards > 0 && (state.player.counters.shards ?? 0) < shards) return 'Not enough Shards.';
  if (def.hooks?.canPlay) {
    const r = def.hooks.canPlay(cardReadCtx(state, card));
    if (r === false) return 'Cannot be played right now.';
    if (typeof r === 'string') return r;
  }
  return true;
}

/** uids of cards in hand that can be played right now. */
export function getPlayableCards(state: RunState): number[] {
  const combat = state.combat;
  if (!combat) return [];
  return combat.hand.filter((c) => canPlayCard(state, c) === true).map((c) => c.uid);
}

export function cardCtx(env: Env, card: CardInstance): EffectCtx {
  return makeEffectCtx(env, {
    source: { kind: 'card', uid: card.uid, id: card.id, upgraded: card.upgraded },
    owner: 'player',
    stacks: 0,
    relic: null,
    target: null,
    card,
    x: 0,
  });
}

export function runCardHook(env: Env, card: CardInstance, hook: 'onDraw' | 'onDiscard' | 'onExhaust' | 'onRetain' | 'onTurnEndInHand'): void {
  const fn: CardHooks[typeof hook] = cardDef(card).hooks?.[hook];
  if (fn) fn(cardCtx(env, card));
}

// ---------------------------------------------------------------------------
// Piles

export function shuffleDiscardIntoDraw(env: Env): void {
  const combat = requireCombat(env.state, 'shuffle');
  const moved = combat.discard.splice(0, combat.discard.length);
  shuffleInPlace(env.state.rng.shuffle, moved);
  // Existing draw pile cards stay on top.
  combat.draw.unshift(...moved);
  emit(env, { t: 'shuffle' });
  dispatch(env, 'onShuffle', 'player', {});
}

/**
 * Draw up to n cards; stops at the hand limit (cards stay in the draw pile; cap_hand) or when both
 * piles are empty. Draws by effects during the player's turn count toward cap_draw.
 */
export function drawCards(env: Env, n: number, byEffect: boolean): void {
  const combat = requireCombat(env.state, 'draw');
  const want = byEffect && combat.turnPhase === 'player' ? takeBudget(env, 'effectDraw', TUNING.caps.effectDraw, 'cap_draw', n) : n;
  const drawn: CardInstance[] = [];
  for (let i = 0; i < want; i++) {
    if (combat.hand.length >= combat.handLimit) {
      capHit(env, 'cap_hand');
      break;
    }
    if (combat.draw.length === 0) {
      if (combat.discard.length === 0) break;
      if (drawn.length) emit(env, { t: 'draw', uids: drawn.splice(0).map((c) => c.uid) });
      shuffleDiscardIntoDraw(env);
    }
    const card = combat.draw.pop();
    if (!card) throw new Error('drawCards: draw pile unexpectedly empty');
    combat.hand.push(card);
    drawn.push(card);
    runCardHook(env, card, 'onDraw');
    dispatch(env, 'onCardDrawn', 'player', { card });
  }
  if (drawn.length) emit(env, { t: 'draw', uids: drawn.map((c) => c.uid) });
}

export function takeFrom(pile: CardInstance[], uid: number, where: string): CardInstance {
  const i = pile.findIndex((c) => c.uid === uid);
  if (i < 0) throw new Error(`card uid ${uid} not in ${where}`);
  const [card] = pile.splice(i, 1);
  if (!card) throw new Error(`card uid ${uid} not in ${where}`);
  return card;
}

/** Manual discard from hand (fires onDiscard). */
export function discardFromHand(env: Env, uids: readonly number[]): void {
  const combat = requireCombat(env.state, 'discard');
  if (uids.length === 0) return;
  const cards = uids.map((uid) => takeFrom(combat.hand, uid, 'hand'));
  combat.discard.push(...cards);
  emit(env, { t: 'discard', uids: [...uids] });
  for (const c of cards) runCardHook(env, c, 'onDiscard');
}

export function exhaustCards(env: Env, from: 'hand' | 'discard' | 'draw' | 'inPlay', uids: readonly number[]): void {
  const combat = requireCombat(env.state, 'exhaust');
  if (uids.length === 0) return;
  const pile = pileOf(combat, from);
  const cards = uids.map((uid) => takeFrom(pile, uid, from));
  combat.exhaust.push(...cards);
  emit(env, { t: 'exhaust', uids: [...uids] });
  for (const c of cards) {
    runCardHook(env, c, 'onExhaust');
    dispatch(env, 'onCardExhausted', 'player', { card: c });
  }
}

export function pileOf(combat: CombatState, from: 'hand' | 'discard' | 'draw' | 'exhaust' | 'inPlay'): CardInstance[] {
  switch (from) {
    case 'hand':
      return combat.hand;
    case 'discard':
      return combat.discard;
    case 'draw':
      return combat.draw;
    case 'exhaust':
      return combat.exhaust;
    case 'inPlay':
      return combat.inPlay;
  }
}

export function upgradeCard(env: Env, card: CardInstance): void {
  if (!isUpgradable(card)) throw new Error(`card ${card.id}#${card.uid} cannot be upgraded`);
  card.upgraded = true;
  emit(env, { t: 'card_upgraded', uid: card.uid });
}

/** Find a combat copy of a card anywhere in combat (piles, in play, primed rack, Timeline). */
export function findCombatCard(combat: CombatState, uid: number): CardInstance | null {
  return allCombatCards(combat).find((x) => x.uid === uid) ?? null;
}

export function findCardAnywhere(read: ReadCtx, uid: number): CardInstance | null {
  if (read.combat) {
    const c = findCombatCard(read.combat, uid);
    if (c) return c;
  }
  return read.state.player.deck.find((c) => c.uid === uid) ?? null;
}

/**
 * Put a card instance into the hand by an effect (not a draw): cap_to_hand (or cap_draw when
 * countsAsDraw), hand limit (a full hand sends it to discard, STS rule). Returns where it went,
 * or null when the cap cut it (the caller keeps the card where it was).
 */
export function putIntoHand(env: Env, card: CardInstance, countsAsDraw: boolean): 'hand' | 'discard' | null {
  const combat = requireCombat(env.state, 'putIntoHand');
  const granted = countsAsDraw
    ? takeBudget(env, 'effectDraw', TUNING.caps.effectDraw, 'cap_draw', 1)
    : takeBudget(env, 'toHand', TUNING.caps.toHand, 'cap_to_hand', 1);
  if (granted === 0) return null;
  if (combat.hand.length >= combat.handLimit) {
    combat.discard.push(card);
    return 'discard';
  }
  combat.hand.push(card);
  dispatch(env, 'onCardToHand', 'player', { card });
  return 'hand';
}

/** Create a card in a combat pile. To hand: cap_to_hand (RULINGS 10); a full hand sends it to discard. */
export function addCardToCombat(
  env: Env,
  id: CardId,
  to: 'hand' | 'draw' | 'discard',
  o: { upgraded: boolean; costThisTurn: number | undefined; position: 'top' | 'random' },
): CardInstance | null {
  const combat = requireCombat(env.state, 'add_card');
  if (to === 'hand') {
    const probe = takeBudget(env, 'toHand', TUNING.caps.toHand, 'cap_to_hand', 1);
    if (probe === 0) return null;
  }
  const card = makeCard(env.state, id, o.upgraded);
  if (o.costThisTurn !== undefined) card.tempCost = o.costThisTurn;
  const where = to === 'hand' && combat.hand.length >= combat.handLimit ? 'discard' : to;
  if (where === 'hand') combat.hand.push(card);
  else if (where === 'discard') combat.discard.push(card);
  else if (o.position === 'top') combat.draw.push(card);
  else combat.draw.splice(nextInt(env.state.rng.misc, 0, combat.draw.length), 0, card);
  emit(env, { t: 'card_added', card: { ...card }, where });
  if (where === 'hand') dispatch(env, 'onCardToHand', 'player', { card });
  return card;
}
