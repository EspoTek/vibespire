// Static card / effect valuation for the greedy policy (reward picks, removals, upgrades, choices).
// Units are GDD §8.5 "d" (common damage-equivalents): 1 damage = 1, 1 Block ≈ 0.9, draw 1 = 3,
// energy 1 = 6. Scaled amounts use the expected scale values below (GDD §8.3 / card docs §0.3).
// This is a heuristic, not the truth: in combat the policy measures cards by simulating them.

import { getCardDef, getStatusDef } from '../../../src/content';
import type { Amount, AmountScale, CardDef, CardInstance, Condition, Effect, RunState } from '../../../src/engine';

/** Expected value of a scale when nothing better is known. */
function scaleGuess(scale: AmountScale, bloom: number): number {
  if (typeof scale === 'string') {
    switch (scale) {
      case 'x':
        return 3;
      case 'cards_in_hand':
        return 4;
      case 'cards_in_draw':
      case 'player_draw_pile':
        return 8;
      case 'cards_in_discard':
        return 5;
      case 'cards_in_exhaust':
        return 3;
      case 'cards_played_this_turn':
      case 'beat_count':
        return 2;
      case 'attacks_played_this_turn':
        return 1.5;
      case 'enemies_alive':
        return 1.6;
      case 'block':
      case 'defence':
        return 6;
      case 'guard':
        return 5;
      case 'gold':
        return 100;
      case 'shards':
        return 2;
      case 'hp':
        return 45;
      case 'max_hp':
        return 70;
      case 'missing_hp':
        return 20;
      case 'deck_size':
        return 18;
      case 'timeline_count':
      case 'primed_count':
        return 1;
      case 'trigger_hits':
        return 2;
      case 'spent':
        return 3;
      case 'stacks':
        return 2;
      case 'bloom_cards_in_deck':
        return 3;
      case 'bloom_total_in_deck':
        return 8;
      case 'bloom_max_in_deck':
        return 5;
      case 'forecast_damage':
      case 'intent_damage':
        return 10;
      case 'rot_on_target':
        return 4;
      case 'player_status_cards':
        return 1;
      case 'best_card_damage_this_turn':
        return 8;
      case 'triggered_riposte':
        return 0.5;
    }
  }
  if ('cardVar' in scale) return scale.cardVar === 'bloom' ? bloom : 1;
  if ('status' in scale) return scale.status === 'onslaught' ? 1.5 : 2;
  if ('forecast_damage' in scale || 'intent_damage' in scale) return 10;
  return 2;
}

export function estAmount(a: Amount | 'all' | 'half' | undefined, bloom = 2): number {
  if (a === undefined) return 1;
  if (typeof a === 'number') return a;
  if (a === 'X') return 3;
  if (a === 'all' || a === 'half') return 5;
  return (a.base ?? 0) + (a.per ?? 1) * scaleGuess(a.scale, bloom);
}

const STATUS_ON_ENEMY: Record<string, (n: number) => number> = {
  rot: (n) => 3 * n + 3,
  exposed: (n) => 3 * n,
  stagger: (n) => 2.4 * n,
  halted: () => 8,
};

function statusValue(id: string, n: number, onEnemy: boolean): number {
  if (onEnemy) {
    const f = STATUS_ON_ENEMY[id];
    if (f) return f(n);
    return getStatusDef(id).isDebuff ? 2.5 * n : -2 * n;
  }
  if (id === 'onslaught') return 2 * n;
  if (id === 'riposte_capacity') return 5 * n;
  if (id === 'augury') return 3;
  const def = getStatusDef(id);
  if (def.isDebuff) return -2.5 * n;
  // A self-buff (usually a Power's status): its hooks are opaque, so price it like a Power setup.
  return 4 + 1.5 * Math.min(n, 6);
}

function condProb(c: Condition): number {
  switch (c.type) {
    case 'target_dead':
      return 0.35;
    case 'on_beat':
      return 0.35;
    case 'not':
      return 1 - condProb(c.cond);
    default:
      return 0.5;
  }
}

/** Static value of an effect list (d). `bloom` is the copy's Bloom (for cardVar bloom scales). */
export function effectsValue(effects: readonly Effect[], bloom = 2): number {
  let v = 0;
  for (const e of effects) v += effectValue(e, bloom);
  return v;
}

function effectValue(e: Effect, bloom: number): number {
  switch (e.type) {
    case 'damage': {
      const per = estAmount(e.amount, bloom) * estAmount(e.times, bloom);
      if (e.target === 'all_enemies') return per * 1.25;
      if (e.target === 'self') return -per * 1.2;
      return per;
    }
    case 'block':
      return estAmount(e.amount, bloom) * 0.9;
    case 'guard':
      return estAmount(e.amount, bloom) * 1.0;
    case 'draw':
      return estAmount(e.n, bloom) * 3;
    case 'energy':
      return estAmount(e.n, bloom) * 4.5;
    case 'discard':
      return e.all ? -4 : -0.8 * estAmount(e.n, bloom);
    case 'exhaust':
      return e.self ? 0 : e.all ? -3 : (e.choose ? -1 : -1.5) * estAmount(e.n, bloom);
    case 'status': {
      const onEnemy = e.target !== 'self' && e.target !== 'all_allies';
      const mult = e.target === 'all_enemies' ? 1.5 : 1;
      return statusValue(e.id, estAmount(e.amount, bloom), onEnemy) * mult;
    }
    case 'heal':
      return estAmount(e.amount, bloom) * 0.8;
    case 'lose_hp':
      return e.target === undefined || e.target === 'self' ? -1.5 * estAmount(e.amount, bloom) : estAmount(e.amount, bloom);
    case 'max_hp':
      return 2 * estAmount(e.amount, bloom);
    case 'add_card': {
      const def = getCardDef(e.card);
      const n = estAmount(e.n, bloom);
      if (def.type === 'curse') return -8 * n;
      if (def.type === 'status') return -3 * n;
      return (e.to === 'hand' ? 3 : 2) * n;
    }
    case 'upgrade':
      return e.where === 'all_hand' ? 5 : e.where === 'deck' ? 6 : 2;
    case 'scry':
      return estAmount(e.n, bloom);
    case 'gold':
      return estAmount(e.amount, bloom) * 0.1;
    case 'choose': {
      let best = 0;
      for (const o of e.options) best = Math.max(best, effectsValue(o.effects, bloom));
      return best + 1;
    }
    case 'repeat':
      return estAmount(e.times, bloom) * effectsValue(e.effects, bloom);
    case 'conditional': {
      const p = condProb(e.if);
      return p * effectsValue(e.then, bloom) + (1 - p) * effectsValue(e.else ?? [], bloom);
    }
    case 'spend_status':
      return 0.55 * effectsValue(e.effects, bloom);
    case 'bloom':
      return 3 * estAmount(e.amount, bloom);
    case 'prune':
      return e.variant === 'away' ? 9 : 3 * (e.bloom ?? 1) + (e.variant === 'spread' ? 2 : 0);
    case 'advance':
      return 2 * e.n;
    case 'postpone':
      return -1;
    case 'on_beat':
      return 0.6 * effectsValue(e.effects, bloom);
    case 'fetch_card':
      return 3 * estAmount(e.n, bloom);
    case 'shards':
      return 3 * estAmount(e.amount, bloom);
    case 'transmute':
      return 4;
    case 'offer_cards':
      return 8;
    case 'duplicate_card':
      return 6;
    case 'remove_card':
      return 6 * estAmount(e.n, bloom);
    case 'transform_card':
      return 2;
    case 'gain_relic':
      return 15;
    case 'gain_potion':
      return 5;
    case 'potion_slots':
      return 4 * e.n;
    case 'autoplay':
      return 5 * estAmount(e.n, bloom);
    case 'prime':
      return 3;
    case 'cancel_attack':
      return 9;
    case 'halt_enemy':
      return 9;
    case 'lose_defence':
    case 'lose_guard':
      return -2;
    case 'run_flag':
      return 0;
    case 'custom':
      return 4;
    case 'lose_potion':
      return -5;
    case 'lose_relic':
      return -12;
    case 'gamble': {
      const total = e.outcomes.reduce((a, o) => a + o.weight, 0);
      if (total <= 0) throw new Error('gamble with no weight');
      return e.outcomes.reduce((a, o) => a + (o.weight / total) * effectsValue(o.effects, bloom), 0);
    }
    case 'start_combat':
      return -6 + effectsValue(e.onWin ?? [], bloom);
    case 'summon':
    case 'transform':
    case 'reroll_forecast':
    case 'ai_state':
      return 0;
  }
}

const SLOT = 2;

const RARITY_RATE: Record<string, number> = { starter: 6, common: 7, uncommon: 8.5, rare: 10, special: 7 };

export interface CardInfo {
  def: CardDef;
  /** Face value of one play (d), including Riposte / Delay / keyword adjustments. */
  value: number;
  /** Value per energy net of the card slot (0-cost counts as 0.5 energy, X as 3). */
  efficiency: number;
  costNum: number;
  draws: boolean;
  onBeatValue: number;
  /** Sum of `per` of damage amounts scaled by Onslaught (× hits). */
  perOnslaught: number;
  spendsOnslaught: boolean;
  /** Per-Bloom increment value of this card (d per Bloom point per play). */
  perBloom: number;
  hits: number;
  /** Static damage / Block+Guard of one play (incl. Delay and Riposte lists). */
  damage: number;
  defense: number;
  riposteValue: number;
  junk: boolean;
  basic: boolean;
  tags: readonly string[];
}

const infoCache = new Map<string, CardInfo>();

function walk(effects: readonly Effect[], f: (e: Effect) => void): void {
  for (const e of effects) {
    f(e);
    if (e.type === 'repeat' || e.type === 'on_beat' || e.type === 'spend_status') walk(e.effects, f);
    else if (e.type === 'conditional') {
      walk(e.then, f);
      if (e.else) walk(e.else, f);
    } else if (e.type === 'choose') for (const o of e.options) walk(o.effects, f);
  }
}

function perOf(a: Amount, pred: (s: AmountScale) => boolean): number {
  if (typeof a === 'number' || a === 'X') return 0;
  return pred(a.scale) ? (a.per ?? 1) : 0;
}

const isOnslaughtScale = (s: AmountScale): boolean => typeof s === 'object' && 'status' in s && s.status === 'onslaught';
const isBloomScale = (s: AmountScale): boolean => typeof s === 'object' && 'cardVar' in s && s.cardVar === 'bloom';

export function cardInfo(id: string, upgraded: boolean): CardInfo {
  const key = `${id}|${upgraded ? 1 : 0}`;
  const hit = infoCache.get(key);
  if (hit) return hit;
  const def = getCardDef(id, upgraded);
  const kws = def.keywords ?? [];
  const costNum = def.cost === null ? 0 : def.cost === 'X' ? 3 : def.cost;
  let draws = false;
  let onBeat = 0;
  let perOnslaught = 0;
  let spends = false;
  let perBloom = 0;
  let hits = 0;
  let damage = 0;
  let defense = 0;
  const all = [...def.effects, ...(def.delay?.effects ?? [])];
  walk(all, (e) => {
    if (e.type === 'draw' || e.type === 'fetch_card') draws = true;
    if (e.type === 'on_beat') onBeat += effectsValue(e.effects);
    if (e.type === 'conditional' && e.if.type === 'on_beat') onBeat += effectsValue(e.then);
    if (e.type === 'spend_status' && e.id === 'onslaught') spends = true;
    if (e.type === 'damage') {
      const times = estAmount(e.times);
      hits += times;
      if (e.target !== 'self') damage += estAmount(e.amount) * times;
      perOnslaught += perOf(e.amount, isOnslaughtScale) * times;
      perBloom += perOf(e.amount, isBloomScale) * times * (e.target === 'all_enemies' ? 1.5 : 1);
    }
    if (e.type === 'block' || e.type === 'guard') defense += estAmount(e.amount);
    if (e.type === 'block' || e.type === 'guard') perBloom += perOf(e.amount, isBloomScale) * 0.9;
    if (e.type === 'status') perBloom += perOf(e.amount, isBloomScale) * 3;
    if (e.type === 'draw') perBloom += perOf(e.n, isBloomScale) * 3;
  });
  let value: number;
  if (def.type === 'curse') value = -12;
  else if (def.type === 'status') value = -5;
  else {
    value = effectsValue(def.effects);
    if (def.delay) value += 0.9 * effectsValue(def.delay.effects);
    if (def.type === 'power') value = Math.max(value, 0) + 5 + 1.5 * (['common', 'uncommon', 'rare'].indexOf(def.rarity) + 1);
    if (kws.includes('exhaust') && def.type !== 'power') value *= 0.75;
    if (kws.includes('retain')) value += 1;
    if (kws.includes('innate')) value += 1;
  }
  const riposteValue = def.riposte ? effectsValue(def.riposte) : 0;
  if (def.riposte) value = Math.max(value, riposteValue * 0.9) + 2;
  if (def.cost === null || kws.includes('unplayable')) value = Math.min(value, def.type === 'curse' ? -12 : -5);
  const tags = def.tags ?? [];
  const info: CardInfo = {
    def,
    value,
    // Every card also costs a draw slot (~2 d): 0-cost cards are not free.
    efficiency: (value - SLOT) / Math.max(0.5, costNum) + SLOT,
    costNum,
    draws,
    onBeatValue: onBeat * 0.6,
    perOnslaught,
    spendsOnslaught: spends,
    perBloom,
    hits,
    damage,
    defense,
    riposteValue,
    junk: def.type === 'curse' || def.type === 'status',
    basic: def.rarity === 'starter' && !def.riposte && !kws.includes('bloom') && !def.delay && tags.length <= 2 && def.effects.length <= 1,
    tags,
  };
  infoCache.set(key, info);
  return info;
}

export function infoOf(c: Pick<CardInstance, 'id' | 'upgraded'>): CardInfo {
  return cardInfo(c.id, c.upgraded);
}

/** Value of keeping this copy in the run deck (higher = keep; negative = remove it). */
export function keepValue(c: CardInstance, includeBloom = true): number {
  const i = infoOf(c);
  if (i.def.bound) return 100;
  if (i.junk) return i.def.type === 'curse' ? -20 : -8;
  const bloom = c.vars?.bloom ?? 0;
  let v = i.efficiency + (includeBloom ? bloom * i.perBloom * 0.8 : 0);
  if (i.basic) v -= i.def.type === 'attack' ? 3 : 1;
  if (c.upgraded) v += 1;
  return v;
}

/** Value gained by upgrading this copy (0 when not upgradable). */
export function upgradeGain(c: CardInstance): number {
  if (c.upgraded || Object.keys(getCardDef(c.id).upgrade).length === 0) return 0;
  const base = infoOf(c);
  const up = cardInfo(c.id, true);
  const bloom = c.vars?.bloom ?? 0;
  let g = up.efficiency - base.efficiency + (up.perBloom - base.perBloom) * Math.max(bloom, 2);
  if (up.costNum < base.costNum) g += 2;
  if (base.junk) g = 0.1;
  if (!base.basic) g += 0.5;
  return g;
}

/** The deck copy with the lowest keep value (a removal target), honouring Bound. */
export function worstDeckCard(s: RunState, cands?: readonly CardInstance[]): CardInstance {
  const pool = (cands ?? s.player.deck).filter((c) => getCardDef(c.id).bound !== true);
  let best: CardInstance | null = null;
  let bestV = Infinity;
  for (const c of pool) {
    const v = keepValue(c);
    if (v < bestV) {
      bestV = v;
      best = c;
    }
  }
  if (!best) throw new Error('worstDeckCard: no removable card');
  return best;
}

export function rarityRate(r: string): number {
  const v = RARITY_RATE[r];
  if (v === undefined) throw new Error(`unknown rarity ${r}`);
  return v;
}
