// Permanent deck operations (run-level). All emit events and record history.

import { emit, type Env } from './core';
import { cardDef, isUpgradable, makeCard, takeFrom, upgradeCard } from './cards';
import { currentFloor } from './history';
import { classCardPool } from './items';
import { pickFrom } from './rng';
import { dispatch } from './statuses';
import { REWARD_RARITIES } from './tuning';
import type { CardId, CardInstance } from './types';

export type CardSource = 'reward' | 'shop' | 'event' | 'other';

export function addToDeck(env: Env, id: CardId, upgraded: boolean, source: CardSource = 'other', vars?: Record<string, number>): CardInstance {
  const card = makeCard(env.state, id, upgraded && isUpgradable({ uid: -1, id, upgraded: false }));
  if (vars && Object.keys(vars).length) card.vars = { ...vars };
  env.state.player.deck.push(card);
  emit(env, { t: 'card_added', card: { ...card }, where: 'deck' });
  currentFloor(env.state).cardsAdded.push(id);
  dispatch(env, 'onCardAdded', 'player', { card, source });
  return card;
}

export function removeFromDeck(env: Env, uid: number): CardInstance {
  const card = takeFrom(env.state.player.deck, uid, 'deck');
  emit(env, { t: 'card_removed', uid });
  currentFloor(env.state).cardsRemoved.push(card.id);
  return card;
}

export function isBound(card: CardInstance): boolean {
  return cardDef(card).bound === true;
}

export function upgradeInDeck(env: Env, uid: number): void {
  const card = env.state.player.deck.find((c) => c.uid === uid);
  if (!card) throw new Error(`card uid ${uid} not in deck`);
  upgradeCard(env, card);
  currentFloor(env.state).cardsUpgraded.push(card.id);
}

/** STS transform: replace a deck card with a random different card from the class reward pool ('misc'). */
export function transformInDeck(env: Env, uid: number): CardInstance {
  const old = removeFromDeck(env, uid);
  const pool = REWARD_RARITIES.flatMap((r) => classCardPool(env.state.classId, r)).filter((d) => d.id !== old.id);
  if (pool.length === 0) throw new Error(`transform: class ${env.state.classId} has no other reward cards`);
  const def = pickFrom(env.state.rng.misc, pool);
  return addToDeck(env, def.id, false, 'event');
}

export function upgradableDeckCards(cards: readonly CardInstance[]): CardInstance[] {
  return cards.filter(isUpgradable);
}
