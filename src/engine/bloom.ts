// Bloom (GDD §2.4) and Prune (GDD §2.5, RULINGS 7/17), with the Graft v2 rules
// (docs/v2/graft-design.md §2, RULINGS 51): Spill, Ripe and multi-card Prunes (Clear-Cut).
//
// Bloom lives on the copy (`vars.bloom`), capped per copy (TUNING.caps.bloom, bloomCap modifier),
// never below 0. In combat it changes the combat copy (synced to the deck copy at combat end);
// out of combat it changes the deck copy.
// Spill (RULINGS 51): Bloom a card can't hold (over its cap), and Bloom with no eligible target, goes
// once to the least-grown uncapped Bloom card in your deck (ties random); what that card can't hold is
// lost (cap_stacks). Lever: TUNING.bloomSpill.
// Ripe: a copy whose real Bloom crosses TUNING.bloomRipe fires onRipe (effective Bloom, for numbers and
// Ripe clauses, is cards.ts effectiveBloomOf).
// Prune: step 1 "you may Scrap another card from your hand" (choice min 0 / max pruneScrapMax, default 1);
// each Scrapped card: onPrune, prunes += 1 (Prune away: only the first card's deck copy is also removed,
// cap_prune_away); step 2: the summed Bloom goes to the variant's target once (+bonusIf, modifyPruneBloom
// per card).

import { capHit, takeBudget } from './caps';
import { bloomCapFor, bloomOf, cardDef, exhaustCards, isBloomCard } from './cards';
import { emit, liveDeckCards, requireCombat, type Env } from './core';
import { removeFromDeck } from './deck';
import { openChoice } from './queue';
import { pickFrom } from './rng';
import { dispatch, playerRule } from './statuses';
import { TUNING } from './tuning';
import type { CardInstance, CardType, EffectFrame, PruneSpec, RunState } from './types';

/** Change a copy's Bloom (clamped to [0, cap]). Overflow spills once (RULINGS 51) or is lost (cap_stacks). */
export function addBloom(env: Env, card: CardInstance, delta: number, opts: { spill?: boolean } = {}): void {
  if (!isBloomCard(card)) throw new Error(`card ${card.id} is not a Bloom card`);
  const cap = bloomCapFor(env.state, card);
  const old = bloomOf(card);
  const raw = old + delta;
  const now = Math.max(0, Math.min(cap, raw));
  const overflow = delta > 0 ? Math.max(0, Math.min(delta, raw - cap)) : 0;
  if (now !== old) {
    card.vars = { ...(card.vars ?? {}), bloom: now };
    emit(env, opts.spill === true ? { t: 'bloom', uid: card.uid, delta: now - old, now, spill: true } : { t: 'bloom', uid: card.uid, delta: now - old, now });
    if (now > old) dispatch(env, 'onBloomGained', 'player', { card, delta: now - old });
    if (old < TUNING.bloomRipe && now >= TUNING.bloomRipe) dispatch(env, 'onRipe', 'player', { card });
  }
  if (overflow > 0) {
    if (opts.spill !== true && TUNING.bloomSpill === 1) spillBloom(env, overflow, card.uid);
    else capHit(env, 'cap_stacks');
  }
}

/**
 * Spill (RULINGS 51): `amount` Bloom goes to the least-grown uncapped Bloom card in your deck (not
 * `excludeUid`; ties random). With none, or with Spill off, it is lost (cap_stacks).
 */
export function spillBloom(env: Env, amount: number, excludeUid: number | null): void {
  if (amount <= 0) return;
  const s = env.state;
  const pool = TUNING.bloomSpill === 1 ? deckBloomCards(s).filter((c) => c.uid !== excludeUid && isBloomEligible(s, c)) : [];
  const card = pickExtreme(s, pool, 'min');
  if (!card) {
    capHit(env, 'cap_stacks');
    return;
  }
  addBloom(env, card, amount, { spill: true });
}

export function isBloomEligible(state: RunState, card: CardInstance): boolean {
  return isBloomCard(card) && bloomOf(card) < bloomCapFor(state, card);
}

/** Deck view (live copies in combat) of Bloom cards. */
export function deckBloomCards(state: RunState): CardInstance[] {
  return liveDeckCards(state).filter(isBloomCard);
}

function pickExtreme(state: RunState, cards: CardInstance[], which: 'min' | 'max'): CardInstance | null {
  if (cards.length === 0) return null;
  const vals = cards.map(bloomOf);
  const best = which === 'min' ? Math.min(...vals) : Math.max(...vals);
  return pickFrom(state.rng.misc, cards.filter((c) => bloomOf(c) === best));
}

export type BloomTarget = 'choose_hand' | 'random_bloom_in_piles' | 'all_hand' | 'self' | 'min_in_deck' | 'max_in_deck' | 'choose_deck';

export function execBloom(env: Env, amount: number, target: BloomTarget, sourceCard: CardInstance | null): void {
  const s = env.state;
  if (amount === 0) return;
  switch (target) {
    case 'self': {
      if (!sourceCard) throw new Error("bloom target 'self' without a source card");
      addBloom(env, sourceCard, amount);
      return;
    }
    case 'min_in_deck':
    case 'max_in_deck': {
      const pool = deckBloomCards(s).filter((c) => amount < 0 || isBloomEligible(s, c));
      const card = pickExtreme(s, pool, target === 'min_in_deck' ? 'min' : 'max');
      if (card) addBloom(env, card, amount);
      else if (amount > 0) capHit(env, 'cap_stacks'); // every Bloom card is capped: nowhere to spill
      return;
    }
    case 'choose_deck': {
      const pool = deckBloomCards(s).filter((c) => isBloomEligible(s, c));
      if (pool.length === 0) {
        if (amount > 0) capHit(env, 'cap_stacks');
        return;
      }
      if (pool.length === 1) return addBloom(env, pool[0] as CardInstance, amount);
      openChoice(env, {
        kind: 'cards', prompt: 'Choose a Bloom card in your deck.', from: 'deck', choices: pool.map((c) => c.uid), labels: [], offers: [],
        min: 1, max: 1, resume: { op: 'bloom_pick', amount, where: 'deck' },
      });
      return;
    }
    default: {
      const combat = requireCombat(s, `bloom ${target}`);
      if (target === 'all_hand') {
        const cards = combat.hand.filter((x) => isBloomEligible(s, x));
        if (cards.length === 0 && amount > 0) return spillBloom(env, amount, null);
        for (const c of cards) addBloom(env, c, amount);
        return;
      }
      if (target === 'random_bloom_in_piles') {
        const pool = [...combat.hand, ...combat.draw, ...combat.discard].filter((x) => isBloomEligible(s, x));
        if (pool.length) addBloom(env, pickFrom(s.rng.misc, pool), amount);
        else if (amount > 0) spillBloom(env, amount, null);
        return;
      }
      chooseBloomInHand(env, amount, { op: 'bloom_pick', amount, where: 'combat' });
    }
  }
}

function chooseBloomInHand(env: Env, amount: number, resume: { op: 'bloom_pick'; amount: number; where: 'combat' } | { op: 'prune_bloom'; amount: number }): void {
  const s = env.state;
  const combat = requireCombat(s, 'bloom choice');
  const pool = combat.hand.filter((x) => isBloomEligible(s, x));
  if (pool.length === 0) {
    if (amount > 0) spillBloom(env, amount, null);
    return;
  }
  if (pool.length === 1) return addBloom(env, pool[0] as CardInstance, amount);
  openChoice(env, {
    kind: 'cards', prompt: `Choose a Bloom card to gain ${amount} Bloom.`, from: 'hand', choices: pool.map((c) => c.uid), labels: [], offers: [],
    min: 1, max: 1, resume,
  });
}

/** Resolve a bloom_pick / prune_bloom choice. */
export function resolveBloomPick(env: Env, uid: number, amount: number, where: 'combat' | 'deck'): void {
  const s = env.state;
  const card = where === 'deck' ? liveDeckCards(s).find((c) => c.uid === uid) : requireCombat(s, 'bloom pick').hand.find((c) => c.uid === uid);
  if (!card) throw new Error(`bloom pick: card ${uid} not found`);
  addBloom(env, card, amount);
}

// ---------------------------------------------------------------------------
// Prune

/** How many cards one Prune may Scrap (Clear-Cut: pruneScrapMax hooks; default 1). */
export function pruneScrapMax(state: RunState): number {
  return Math.max(1, playerRule(state, 1, (m, c, a) => (m.pruneScrapMax ? Math.max(a, m.pruneScrapMax(c, a)) : a), false));
}

export function execPrune(env: Env, spec: PruneSpec, frame: EffectFrame): void {
  const s = env.state;
  const combat = requireCombat(s, 'prune');
  if (spec.variant === 'away' && (combat.counters.pruneAway ?? 0) >= TUNING.caps.pruneAwayPerTurn) {
    capHit(env, 'cap_prune_away');
    return;
  }
  const cands = combat.hand.filter((c) => !(spec.variant === 'away' && cardDef(c).bound === true));
  if (cands.length === 0) return;
  const max = Math.min(cands.length, pruneScrapMax(s));
  const prompt =
    spec.variant === 'away'
      ? 'Prune away: you may Scrap a card (it is removed from your deck).'
      : max > 1
        ? 'Prune (Clear-Cut): you may Scrap any number of cards; each is a Prune.'
        : 'Prune: you may Scrap another card.';
  openChoice(env, {
    kind: 'cards',
    prompt,
    from: 'hand', choices: cands.map((c) => c.uid), labels: [], offers: [], min: 0, max,
    resume: { op: 'prune_scrap', spec, frame },
  });
}

function typeMatches(t: CardType, want: CardType | CardType[]): boolean {
  return Array.isArray(want) ? want.includes(t) : t === want;
}

export function resolvePruneScrap(env: Env, spec: PruneSpec, uids: readonly number[]): void {
  const s = env.state;
  const combat = requireCombat(s, 'prune scrap');
  if (uids.length === 0) return; // declined: nothing happens (RULINGS 17)
  let amount = 0;
  const types: CardType[] = [];
  uids.forEach((uid, i) => {
    const scrapped = combat.hand.find((c) => c.uid === uid);
    if (!scrapped) throw new Error(`prune: card ${uid} not in hand`);
    const def = cardDef(scrapped);
    // RULINGS 72: a Scrap blocked by the floor is not a Prune (no counter, no onPrune, no Bloom).
    if (exhaustCards(env, 'hand', [uid]).length === 0) return;
    types.push(def.type);
    combat.lastPrune = { uid, cardId: scrapped.id, type: def.type, types: [...types] };
    combat.counters.prunes = (combat.counters.prunes ?? 0) + 1;
    // Clear-Cut: only the first Scrapped card of a Prune away leaves the deck.
    if (i === 0 && spec.variant === 'away' && s.player.deck.some((c) => c.uid === uid)) {
      if (takeBudget(env, 'pruneAway', TUNING.caps.pruneAwayPerTurn, 'cap_prune_away', 1) === 1) removeFromDeck(env, uid);
    }
    dispatch(env, 'onPrune', 'player', { scrapped });
    let per = spec.bloom + (spec.bonusIf && typeMatches(def.type, spec.bonusIf.type) ? spec.bonusIf.bloom : 0);
    per = playerRule(s, per, (m, c, a) => (m.modifyPruneBloom ? m.modifyPruneBloom(c, a, scrapped) : a), false);
    amount += Math.max(0, per);
  });
  if (amount <= 0) return;
  if (spec.variant === 'wild') {
    const pool = [...combat.hand, ...combat.draw, ...combat.discard].filter((x) => isBloomEligible(s, x));
    if (pool.length) addBloom(env, pickFrom(s.rng.misc, pool), amount);
    else spillBloom(env, amount, null);
    return;
  }
  if (spec.variant === 'spread') {
    const cards = combat.hand.filter((x) => isBloomEligible(s, x));
    if (cards.length === 0) return spillBloom(env, amount, null);
    for (const c of cards) addBloom(env, c, amount);
    return;
  }
  // Standard Prune: you choose a Bloom card in hand; with none in hand, the Bloom goes to a random Bloom card
  // in your draw or discard pile instead, so a Prune is never wasted (RULINGS 43); with none there, it spills.
  if (!combat.hand.some((x) => isBloomEligible(s, x))) {
    const pool = [...combat.draw, ...combat.discard].filter((x) => isBloomEligible(s, x));
    if (pool.length) addBloom(env, pickFrom(s.rng.misc, pool), amount);
    else spillBloom(env, amount, null);
    return;
  }
  chooseBloomInHand(env, amount, { op: 'prune_bloom', amount });
}
