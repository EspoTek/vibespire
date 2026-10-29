// Run-level effect primitives (GDD §9.8): shards, transmute, offer_cards, duplicate_card,
// lose_potion, lose_relic, start_combat, gamble, run_flag, and the full-slots potion swap.

import { getPotionDef, getRelicDef } from '../content';
import { capHit } from './caps';
import { bloomCapFor, bloomOf, cardDef, isBloomCard, isUpgradable, matchesFilter } from './cards';
import { startCombat } from './combat';
import { emit, enqueue, liveDeckCards, type Env } from './core';
import { effectItems } from './ctx';
import { addToDeck, isBound, removeFromDeck } from './deck';
import { currentFloor } from './history';
import { classCardPool, colorlessPool } from './items';
import { openChoice } from './queue';
import { shuffleInPlace, weightedPick } from './rng';
import { dispatch } from './statuses';
import { TUNING } from './tuning';
import type { CardFilter, CardOffer, CardRarity, Effect, EffectFrame, GambleOutcome, PotionId, RunState } from './types';

// ---------------------------------------------------------------------------
// Shards

export function shardsOf(state: RunState): number {
  return state.player.counters.shards ?? 0;
}

/** Gain (cap TUNING.shards.cap, excess lost) or spend Shards (throws below 0: gate with available/canPlay). */
export function gainShards(env: Env, amount: number): void {
  if (amount === 0) return;
  const p = env.state.player;
  const cur = shardsOf(env.state);
  const rec = currentFloor(env.state);
  if (amount < 0) {
    if (cur + amount < 0) throw new Error(`shards would go negative (${cur} + ${amount})`);
    p.counters.shards = cur + amount;
    rec.shardsSpent += -amount;
    emit(env, { t: 'shards', delta: amount, now: p.counters.shards });
    return;
  }
  const granted = Math.min(amount, Math.max(0, TUNING.shards.cap - cur));
  if (granted < amount) capHit(env, 'cap_stacks');
  if (granted === 0) return;
  p.counters.shards = cur + granted;
  rec.shardsGained += granted;
  emit(env, { t: 'shards', delta: granted, now: p.counters.shards });
  dispatch(env, 'onShardGain', 'player', { amount: granted });
}

// ---------------------------------------------------------------------------
// Transmute (GDD §4.8)

export function execTransmute(env: Env, n: number, upTo: boolean, offers: number, rarity: CardRarity | null, upgrade: boolean): void {
  const s = env.state;
  const cands = s.player.deck.filter((c) => !isBound(c)).map((c) => c.uid);
  const k = Math.min(n, cands.length);
  if (k <= 0) return;
  openChoice(env, {
    kind: 'cards', prompt: k > 1 ? `Transmute up to ${k} cards.` : 'Transmute a card.', from: 'deck', choices: cands, labels: [], offers: [],
    min: upTo ? 1 : k, max: k, resume: { op: 'transmute_choose', offers, rarity, upgrade },
  });
}

function transmuteRarity(r: CardRarity): 'common' | 'uncommon' | 'rare' {
  if (r === 'uncommon' || r === 'rare') return r;
  return 'common'; // starter / special (curse, status) -> common (GDD §4.8)
}

/** Step: generate the offers for one chosen card. */
export function transmuteOffer(env: Env, uid: number, offers: number, rarity: CardRarity | null, upgrade: boolean): void {
  const s = env.state;
  const card = s.player.deck.find((c) => c.uid === uid);
  if (!card) throw new Error(`transmute: card ${uid} not in deck`);
  const def = cardDef(card);
  const r = rarity ? transmuteRarity(rarity) : transmuteRarity(def.rarity);
  const pool = (def.cls === 'colorless' ? colorlessPool(r) : classCardPool(s.classId, r)).filter((d) => d.id !== def.id);
  if (pool.length === 0) throw new Error(`transmute: no ${r} cards to offer for ${def.id}`);
  const picks = shuffleInPlace(s.rng.reward, [...pool]).slice(0, offers);
  const keepUpgrade = card.upgraded || upgrade;
  openChoice(env, {
    kind: 'offers', prompt: `Transmute ${def.name} into:`, from: null, choices: picks.map((_, i) => i), labels: picks.map((d) => d.name),
    offers: picks.map((d) => ({ id: d.id, upgraded: keepUpgrade && isUpgradable({ uid: -1, id: d.id, upgraded: false }) })),
    min: 1, max: 1, resume: { op: 'transmute_pick', uid, upgrade: keepUpgrade },
  });
}

export function transmutePick(env: Env, uid: number, offer: CardOffer): void {
  const s = env.state;
  const old = s.player.deck.find((c) => c.uid === uid);
  if (!old) throw new Error(`transmute pick: card ${uid} not in deck`);
  const carry = isBloomCard(old) && isBloomCard(offer) ? bloomOf(old) : 0;
  removeFromDeck(env, uid);
  const added = addToDeck(env, offer.id, offer.upgraded, 'event');
  if (carry > 0) added.vars = { ...(added.vars ?? {}), bloom: Math.min(carry, bloomCapFor(s, added)) };
}

// ---------------------------------------------------------------------------
// Offers / duplicates / losses

export function execOfferCards(env: Env, pool: 'class' | 'colorless', rarity: Extract<Effect, { type: 'offer_cards' }>['rarity'], n: number, upgraded: boolean): void {
  const s = env.state;
  const rarities = rarity === undefined ? (pool === 'colorless' ? ['uncommon', 'rare'] : ['common', 'uncommon', 'rare']) : Array.isArray(rarity) ? rarity : [rarity];
  const defs = rarities.flatMap((r) => (pool === 'colorless' ? colorlessPool(r as CardRarity) : classCardPool(s.classId, r as CardRarity)));
  if (defs.length === 0) throw new Error(`offer_cards: no ${pool} cards of rarity ${rarities.join('/')}`);
  const picks = shuffleInPlace(s.rng.reward, [...defs]).slice(0, n);
  openChoice(env, {
    kind: 'offers', prompt: 'Choose a card.', from: null, choices: picks.map((_, i) => i), labels: picks.map((d) => d.name),
    offers: picks.map((d) => ({ id: d.id, upgraded: upgraded && isUpgradable({ uid: -1, id: d.id, upgraded: false }) })),
    min: 1, max: 1, resume: { op: 'offer_pick' },
  });
}

export function execDuplicate(env: Env, from: 'deck' | 'hand', filter: CardFilter | undefined): void {
  const s = env.state;
  const deckUids = new Set(s.player.deck.map((c) => c.uid));
  const pool =
    from === 'hand'
      ? (s.combat?.hand ?? []).filter((c) => deckUids.has(c.uid))
      : liveDeckCards(s);
  const cands = pool.filter((c) => matchesFilter(cardDef(c), filter)).map((c) => c.uid);
  if (cands.length === 0) return;
  openChoice(env, {
    kind: 'cards', prompt: 'Choose a card to duplicate.', from: from === 'hand' ? 'hand' : 'deck', choices: cands, labels: [], offers: [],
    min: 1, max: 1, resume: { op: 'duplicate' },
  });
}

export function duplicateCard(env: Env, uid: number): void {
  const s = env.state;
  const card = liveDeckCards(s).find((c) => c.uid === uid);
  if (!card) throw new Error(`duplicate: card ${uid} not in deck`);
  addToDeck(env, card.id, card.upgraded, 'event');
}

export function execLosePotion(env: Env): void {
  const potions = env.state.player.potions;
  if (potions.length === 0) return;
  openChoice(env, {
    kind: 'options', prompt: 'Lose which potion?', from: null, choices: potions.map((_, i) => i), labels: potions.map((p) => getPotionDef(p).name), offers: [],
    min: 1, max: 1, resume: { op: 'lose_potion' },
  });
}

export function losePotionAt(env: Env, index: number): void {
  const p = env.state.player.potions;
  const id = p[index];
  if (id === undefined) throw new Error(`no potion at ${index}`);
  p.splice(index, 1);
  emit(env, { t: 'potion_lost', potion: id });
}

export function execLoseRelic(env: Env, notStarter: boolean): void {
  const ids = env.state.player.relics.map((r) => r.id).filter((id) => !(notStarter && getRelicDef(id).rarity === 'starter'));
  if (ids.length === 0) return;
  openChoice(env, {
    kind: 'options', prompt: 'Lose which relic?', from: null, choices: ids.map((_, i) => i), labels: ids.map((id) => getRelicDef(id).name), offers: [],
    min: 1, max: 1, resume: { op: 'lose_relic', ids },
  });
}

export function loseRelic(env: Env, id: string): void {
  const rs = env.state.player.relics;
  const i = rs.findIndex((r) => r.id === id);
  if (i < 0) throw new Error(`relic ${id} not held`);
  rs.splice(i, 1);
  emit(env, { t: 'relic_lost', relic: id });
}

/** Full potion slots: choose a held potion to discard for the new one, or leave the new one. */
export function offerPotionSwap(env: Env, potion: PotionId): void {
  const held = env.state.player.potions;
  const labels = [...held.map((p) => `Discard ${getPotionDef(p).name}`), `Leave ${getPotionDef(potion).name}`];
  openChoice(env, {
    kind: 'options', prompt: 'Potion slots are full.', from: null, choices: labels.map((_, i) => i), labels, offers: [],
    min: 1, max: 1, resume: { op: 'potion_swap', potion },
  });
}

// ---------------------------------------------------------------------------
// Event combat / gamble / flags

export function execStartCombat(env: Env, encounterId: string, onWin: Effect[]): void {
  const s = env.state;
  if (s.phase === 'combat') throw new Error('start_combat during combat');
  const rec = currentFloor(s);
  rec.encounterId = encounterId;
  startCombat(env, { encounterId, kind: 'event', onWin, eventId: s.event?.id ?? null });
  rec.enemies = (s.combat?.enemies ?? []).map((e) => e.id);
}

export function execGamble(env: Env, outcomes: readonly GambleOutcome[], frame: EffectFrame): void {
  if (outcomes.length === 0) throw new Error('gamble with no outcomes');
  const i = weightedPick(env.state.rng.event, outcomes.map((o, idx): [number, number] => [idx, o.weight]));
  const o = outcomes[i];
  if (!o) throw new Error('gamble: bad outcome index');
  if (o.label) emit(env, { t: 'text', text: o.label });
  enqueue(env, effectItems(o.effects, frame));
}

export function runFlag(env: Env, key: string, delta: number): void {
  const c = env.state.player.counters;
  // A flag that was never set is 0.
  c[key] = (c[key] ?? 0) + delta;
}
