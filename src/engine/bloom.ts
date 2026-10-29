// Bloom (GDD §2.4) and Prune (GDD §2.5, RULINGS 7/17).
//
// Bloom lives on the copy (`vars.bloom`), capped per copy (TUNING.caps.bloom, bloomCap modifier),
// never below 0. In combat it changes the combat copy (synced to the deck copy at combat end);
// out of combat it changes the deck copy.
// Prune: step 1 "you may Scrap another card from your hand" (choice min 0 / max 1); if a card was
// Scrapped: onPrune, prunes += 1 (Prune away: the deck copy is also removed, cap_prune_away);
// step 2: the Bloom target per variant gains the amount (+bonusIf, modifyPruneBloom).

import { capHit, takeBudget } from './caps';
import { bloomCapFor, bloomOf, cardDef, exhaustCards, isBloomCard } from './cards';
import { emit, liveDeckCards, requireCombat, type Env } from './core';
import { removeFromDeck } from './deck';
import { openChoice } from './queue';
import { pickFrom } from './rng';
import { dispatch, playerRule } from './statuses';
import { TUNING } from './tuning';
import type { CardInstance, CardType, EffectFrame, PruneSpec, RunState } from './types';

/** Change a copy's Bloom (clamped to [0, cap]; overflow is lost and recorded as cap_stacks). */
export function addBloom(env: Env, card: CardInstance, delta: number): void {
  if (!isBloomCard(card)) throw new Error(`card ${card.id} is not a Bloom card`);
  const cap = bloomCapFor(env.state, card);
  const old = bloomOf(card);
  const raw = old + delta;
  const now = Math.max(0, Math.min(cap, raw));
  if (raw > cap) capHit(env, 'cap_stacks');
  if (now === old) return;
  card.vars = { ...(card.vars ?? {}), bloom: now };
  emit(env, { t: 'bloom', uid: card.uid, delta: now - old, now });
  if (now > old) dispatch(env, 'onBloomGained', 'player', { card, delta: now - old });
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
      return;
    }
    case 'choose_deck': {
      const pool = deckBloomCards(s).filter((c) => isBloomEligible(s, c));
      if (pool.length === 0) return;
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
        for (const c of combat.hand.filter((x) => isBloomEligible(s, x))) addBloom(env, c, amount);
        return;
      }
      if (target === 'random_bloom_in_piles') {
        const pool = [...combat.hand, ...combat.draw, ...combat.discard].filter((x) => isBloomEligible(s, x));
        if (pool.length) addBloom(env, pickFrom(s.rng.misc, pool), amount);
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
  if (pool.length === 0) return;
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

export function execPrune(env: Env, spec: PruneSpec, frame: EffectFrame): void {
  const s = env.state;
  const combat = requireCombat(s, 'prune');
  if (spec.variant === 'away' && (combat.counters.pruneAway ?? 0) >= TUNING.caps.pruneAwayPerTurn) {
    capHit(env, 'cap_prune_away');
    return;
  }
  const cands = combat.hand.filter((c) => !(spec.variant === 'away' && cardDef(c).bound === true));
  if (cands.length === 0) return;
  openChoice(env, {
    kind: 'cards',
    prompt: spec.variant === 'away' ? 'Prune away: you may Scrap a card (it is removed from your deck).' : 'Prune: you may Scrap another card.',
    from: 'hand', choices: cands.map((c) => c.uid), labels: [], offers: [], min: 0, max: 1,
    resume: { op: 'prune_scrap', spec, frame },
  });
}

function typeMatches(t: CardType, want: CardType | CardType[]): boolean {
  return Array.isArray(want) ? want.includes(t) : t === want;
}

export function resolvePruneScrap(env: Env, spec: PruneSpec, uids: readonly number[]): void {
  const s = env.state;
  const combat = requireCombat(s, 'prune scrap');
  const uid = uids[0];
  if (uid === undefined) return; // declined: nothing happens (RULINGS 17)
  const scrapped = combat.hand.find((c) => c.uid === uid);
  if (!scrapped) throw new Error(`prune: card ${uid} not in hand`);
  const def = cardDef(scrapped);
  exhaustCards(env, 'hand', [uid]);
  combat.lastPrune = { uid, cardId: scrapped.id, type: def.type };
  combat.counters.prunes = (combat.counters.prunes ?? 0) + 1;
  if (spec.variant === 'away' && s.player.deck.some((c) => c.uid === uid)) {
    if (takeBudget(env, 'pruneAway', TUNING.caps.pruneAwayPerTurn, 'cap_prune_away', 1) === 1) removeFromDeck(env, uid);
  }
  dispatch(env, 'onPrune', 'player', { scrapped });
  let amount = spec.bloom + (spec.bonusIf && typeMatches(def.type, spec.bonusIf.type) ? spec.bonusIf.bloom : 0);
  amount = playerRule(s, amount, (m, c, a) => (m.modifyPruneBloom ? m.modifyPruneBloom(c, a, scrapped) : a), false);
  if (amount <= 0) return;
  if (spec.variant === 'wild') {
    const pool = [...combat.hand, ...combat.draw, ...combat.discard].filter((x) => isBloomEligible(s, x));
    if (pool.length) addBloom(env, pickFrom(s.rng.misc, pool), amount);
    return;
  }
  if (spec.variant === 'spread') {
    for (const c of combat.hand.filter((x) => isBloomEligible(s, x))) addBloom(env, c, amount);
    return;
  }
  chooseBloomInHand(env, amount, { op: 'prune_bloom', amount });
}

