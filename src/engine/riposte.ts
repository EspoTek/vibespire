// Riposte (GDD §2.2): prime step at player turn end, firing on enemy attack declaration, fizzle.

import { capHit } from './caps';
import { cardDef, takeFrom } from './cards';
import { emit, enqueue, requireCombat, stacksOf, type Env } from './core';
import { effectItems } from './ctx';
import { openChoice } from './queue';
import { dispatch, playerRule } from './statuses';
import { TUNING } from './tuning';
import type { CardInstance, RunState } from './types';

export const STATUS_RIPOSTE_CAPACITY = 'riposte_capacity';

export function isRiposteCard(card: CardInstance): boolean {
  return cardDef(card).riposte !== undefined;
}

/** Prime capacity: base + riposte_capacity stacks, primeCapacity modifiers, capped at TUNING.caps.primeCapacity. */
export function primeCapacity(state: RunState): { capacity: number; raw: number } {
  const base = TUNING.riposte.baseCapacity + stacksOf(state, 'player', STATUS_RIPOSTE_CAPACITY);
  const raw = Math.max(0, playerRule(state, base, (m, c, a) => (m.primeCapacity ? m.primeCapacity(c, a) : a), false));
  return { capacity: Math.min(raw, TUNING.caps.primeCapacity), raw };
}

/** Player turn end step 2. */
export function primeStep(env: Env): void {
  const c = requireCombat(env.state, 'prime');
  const ripostes = c.hand.filter(isRiposteCard);
  const { capacity, raw } = primeCapacity(env.state);
  // Cards primed by the `prime` effect this turn do not use capacity (still bounded by the rack size).
  const byEffect = c.counters.primedByEffect ?? 0;
  const room = Math.max(0, Math.min(capacity - (c.primed.length - byEffect), TUNING.caps.primeCapacity - c.primed.length));
  if (ripostes.length === 0 || room === 0) return finishPrime(env);
  if (raw > TUNING.caps.primeCapacity && ripostes.length > capacity) capHit(env, 'cap_primes');
  if (ripostes.length <= room) {
    primeCards(env, ripostes.map((x) => x.uid));
    return finishPrime(env);
  }
  openChoice(env, {
    kind: 'cards', prompt: 'Prime which Riposte cards?', from: 'hand', choices: ripostes.map((x) => x.uid), labels: [], offers: [],
    min: room, max: room, resume: { op: 'prime', step: true },
  });
}

/** Move cards from hand to the primed rack (in order). byEffect: primed by the `prime` effect (outside capacity). */
export function primeCards(env: Env, uids: readonly number[], byEffect = false): void {
  const c = requireCombat(env.state, 'primeCards');
  if (byEffect) c.counters.primedByEffect = (c.counters.primedByEffect ?? 0) + uids.length;
  for (const uid of uids) {
    const card = takeFrom(c.hand, uid, 'hand');
    const charges = Math.max(1, playerRule(env.state, TUNING.riposte.charges, (m, ctx, a) => (m.primeCharges ? m.primeCharges(ctx, card, a) : a), false));
    c.primed.push({ card, charges });
    emit(env, { t: 'card_primed', uid });
  }
}

export function finishPrime(env: Env): void {
  const c = requireCombat(env.state, 'finishPrime');
  dispatch(env, 'onPrimed', 'player', { count: c.primed.length });
}

/**
 * `prime {n}` effect: prime up to n Riposte cards from hand now, BEYOND this turn's capacity (the
 * end-of-turn prime step does not count them). More than n in hand: a choice of up to n (min 0).
 * The rack never holds more than TUNING.caps.primeCapacity cards.
 */
export function primeFromHand(env: Env, n: number): void {
  const c = requireCombat(env.state, 'prime effect');
  const ripostes = c.hand.filter(isRiposteCard);
  if (ripostes.length === 0 || n <= 0) return;
  const room = Math.max(0, Math.min(n, TUNING.caps.primeCapacity - c.primed.length));
  if (room === 0) return capHit(env, 'cap_primes');
  if (ripostes.length <= room) return primeCards(env, ripostes.map((x) => x.uid), true);
  openChoice(env, {
    kind: 'cards', prompt: `Prime up to ${room} Riposte card${room > 1 ? 's' : ''}.`, from: 'hand', choices: ripostes.map((x) => x.uid), labels: [], offers: [],
    min: 0, max: room, resume: { op: 'prime', step: false },
  });
}

/** Player turn start step 2: unfired primed cards go to the discard pile. */
export function fizzlePrimed(env: Env): void {
  const c = requireCombat(env.state, 'fizzle');
  for (const p of c.primed.splice(0)) {
    c.discard.push(p.card);
    emit(env, { t: 'prime_fizzled', uid: p.card.uid });
  }
}

/** Enemy attack declared: the leftmost primed card fires at the attacker (one per attack). */
export function fireRiposte(env: Env, attacker: number, hits: number): void {
  const c = requireCombat(env.state, 'fireRiposte');
  const entry = c.primed[0];
  if (!entry) return;
  entry.charges -= 1;
  const card = entry.card;
  const done = entry.charges <= 0;
  if (done) {
    c.primed.shift();
    c.inPlay.push(card);
  }
  c.counters.riposteThisMove = 1;
  emit(env, { t: 'riposte_triggered', uid: card.uid, attacker });
  dispatch(env, 'onRiposteTriggered', 'player', { card, attacker }, attacker);
  const def = cardDef(card);
  enqueue(env, effectItems(def.riposte ?? [], { src: { kind: 'card', uid: card.uid, id: card.id, upgraded: card.upgraded }, self: 'player', target: attacker, x: 0, hits, riposte: true, depth: 0 }));
  if (done) enqueue(env, [{ kind: 'finish_card', uid: card.uid, target: attacker, via: 'riposte', onBeat: false, depth: 0, x: 0 }]);
}
