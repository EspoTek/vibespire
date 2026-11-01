// Relics, potions, card pools and the random rolls over them.

import { allCards, allPotions, allRelics, getPotionDef, getRelicDef } from '../content';
import { emit, type Env } from './core';
import { currentFloor } from './history';
import { nextInt, pickFrom, weightedPick } from './rng';
import { dispatchRelic, playerRule } from './statuses';
import { offerPotionSwap } from './runeffects';
import { TUNING } from './tuning';
import type { CardDef, CardRarity, PotionId, PotionRarity, RelicId, RelicRarity, RngState, RunState } from './types';

// ---------------------------------------------------------------------------
// Relics

export function hasRelic(state: RunState, id: RelicId): boolean {
  return state.player.relics.some((r) => r.id === id);
}

export function gainRelic(env: Env, id: RelicId): void {
  getRelicDef(id);
  if (hasRelic(env.state, id)) throw new Error(`already have relic ${id}`);
  env.state.player.relics.push({ id, counter: 0 });
  emit(env, { t: 'relic_gained', relic: id });
  currentFloor(env.state).relicsGained.push(id);
  dispatchRelic(env, id, 'onPickup', {});
  if (env.state.phase === 'shop') repriceShopForRelic(env.state, id);
}

/**
 * A relic gained while a shop is open re-prices everything still for sale (docs/v2/bugs.md BUG-2).
 * Shop prices are fixed when the shop is generated, so Shard Writ or Vial Rack bought in a shop
 * used to take effect only at the next shop. This runs the new relic's own `modifyShopPrice` over
 * the current prices: the same fold generateShop applies (shopPrice in run.ts), with the new relic
 * last in the modifier order, as it is now.
 */
function repriceShopForRelic(s: RunState, relic: RelicId): void {
  const sh = s.shop;
  if (!sh) throw new Error(`repriceShopForRelic(${relic}): phase shop without shop state`);
  type Item = 'card' | 'relic' | 'potion' | 'remove_gold' | 'remove_shard_gold';
  const by = (item: Item, price: number): number =>
    Math.max(0, Math.floor(playerRule(s, price, (m, c, a) => (c.relic?.id === relic && m.modifyShopPrice ? m.modifyShopPrice(c, item, a) : a))));
  for (const it of sh.cards) if (!it.sold) it.price = by('card', it.price);
  for (const it of sh.relics) if (!it.sold) it.price = by('relic', it.price);
  for (const it of sh.potions) if (!it.sold) it.price = by('potion', it.price);
  sh.removePrice = by('remove_gold', sh.removePrice);
  sh.removeShardGold = by('remove_shard_gold', sh.removeShardGold);
}

/** Relics that can still drop at `rarity` (not owned, not class-locked to another class, not excluded). */
export function relicPool(state: RunState, rarity: RelicRarity, exclude: readonly RelicId[] = []): RelicId[] {
  return allRelics()
    .filter((r) => r.rarity === rarity && (r.cls === undefined || r.cls === state.classId) && !(r.excludeClasses ?? []).includes(state.classId))
    .map((r) => r.id)
    .filter((id) => !hasRelic(state, id) && !exclude.includes(id));
}

/**
 * Roll a relic id. With no rarity, rolls TUNING.relicRarityOdds. If that rarity's pool is empty it
 * falls back common -> uncommon -> rare. Returns null when every pool is exhausted (an expected
 * late-run outcome; callers show "nothing").
 */
export function rollRelicOrNull(
  state: RunState,
  rng: RngState,
  rarity?: RelicRarity,
  exclude: readonly RelicId[] = [],
  odds: Partial<Record<RelicRarity, number>> = TUNING.relicRarityOdds,
): RelicId | null {
  const chosen = rarity ?? weightedPick(rng, Object.entries(odds) as [RelicRarity, number][]);
  const order: RelicRarity[] = [chosen, ...(['common', 'uncommon', 'rare'] as RelicRarity[]).filter((r) => r !== chosen)];
  for (const r of order) {
    const pool = relicPool(state, r, exclude);
    if (pool.length) return pickFrom(rng, pool);
    if (rarity === 'boss' || rarity === 'shop' || rarity === 'event' || rarity === 'starter') return null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Potions

export function hasPotionSlot(state: RunState): boolean {
  return state.player.potions.length < state.player.potionSlots;
}

/** Adds a potion. With full slots the player chooses one to discard or leaves the new one (GDD §4.3). */
export function gainPotion(env: Env, id: PotionId): boolean {
  getPotionDef(id);
  if (!hasPotionSlot(env.state)) {
    if (env.state.player.potionSlots === 0) {
      emit(env, { t: 'text', text: 'No potion slots.' });
      return false;
    }
    offerPotionSwap(env, id);
    return false;
  }
  env.state.player.potions.push(id);
  emit(env, { t: 'potion_gained', potion: id });
  currentFloor(env.state).potionsGained.push(id);
  return true;
}

/** A random potion for this class (class potions only drop for their class). */
export function rollPotion(state: RunState, rng: RngState): PotionId {
  const rarity = weightedPick(rng, Object.entries(TUNING.potionRarityOdds) as [PotionRarity, number][]);
  const everything = allPotions().filter((p) => p.cls === undefined || p.cls === state.classId);
  const pool = everything.filter((p) => p.rarity === rarity);
  if (everything.length === 0) throw new Error('no potions registered');
  // A rarity with no potions falls back to the whole pool (small/placeholder pools).
  return pickFrom(rng, pool.length ? pool : everything).id;
}

// ---------------------------------------------------------------------------
// Cards

/** Reward-eligible cards of a class at a rarity (registration order). */
export function classCardPool(classId: string, rarity: CardRarity): CardDef[] {
  return allCards().filter((c) => c.cls === classId && c.rarity === rarity);
}

export function colorlessPool(rarity: CardRarity): CardDef[] {
  return allCards().filter((c) => c.cls === 'colorless' && c.rarity === rarity);
}

export type OddsTable = { common: number; uncommon: number; rare: number };

/** Roll a rarity using odds (percent) and the rare pity offset (percent points moved from common to rare). */
export function rollRarity(rng: RngState, odds: OddsTable, pity: number): 'common' | 'uncommon' | 'rare' {
  if (odds.rare >= 100) return 'rare';
  const rare = Math.max(0, odds.rare + pity);
  const common = Math.max(0, odds.common - (rare - odds.rare));
  const roll = nextInt(rng, 0, 99);
  if (roll < rare) return 'rare';
  if (roll < rare + odds.uncommon || common <= 0) return 'uncommon';
  return 'common';
}

/**
 * Pick up to `n` distinct cards. Each slot rolls a rarity; if that rarity has no unused card the
 * slot falls back to the other rarities (rare -> uncommon -> common, else upwards). Throws if the
 * pool has no reward cards at all.
 */
export function pickCards(
  rng: RngState,
  pool: (rarity: CardRarity) => CardDef[],
  n: number,
  roll: () => 'common' | 'uncommon' | 'rare',
  what: string,
): CardDef[] {
  const out: CardDef[] = [];
  const order: Record<'common' | 'uncommon' | 'rare', CardRarity[]> = {
    rare: ['rare', 'uncommon', 'common'],
    uncommon: ['uncommon', 'common', 'rare'],
    common: ['common', 'uncommon', 'rare'],
  };
  for (let i = 0; i < n; i++) {
    const rarity = roll();
    let picked: CardDef | null = null;
    for (const r of order[rarity]) {
      const options = pool(r).filter((c) => !out.includes(c));
      if (options.length) {
        picked = pickFrom(rng, options);
        break;
      }
    }
    if (!picked) break;
    out.push(picked);
  }
  if (out.length === 0) throw new Error(`no cards available for ${what}`);
  return out;
}
