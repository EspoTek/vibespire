// Out-of-combat decisions for the greedy policy: Ascent Pact, map path, rewards, shop, rest,
// events, treasure, boss relics, potions on the map.

import { getBoonDef, getCardDef, getPotionDef, getRelicDef } from '../../../src/content';
import {
  currentEventOptions,
  getNode,
  nextNodes,
  restOptionFor,
  restOptionShardCost,
  type Action,
  type Amount,
  type Effect,
  type MapNode,
  type RunState,
  type SingleRng,
} from '../../../src/engine';
import { bestOffer, deckProfile, offerScore, skipThreshold } from './archetype';
import { effectsValue, estAmount, keepValue, upgradeGain, worstDeckCard } from './cards';

const of = <T extends Action['type']>(legal: readonly Action[], t: T): Extract<Action, { type: T }>[] =>
  legal.filter((a): a is Extract<Action, { type: T }> => a.type === t);

function need<T>(x: T | undefined, what: string): T {
  if (x === undefined) throw new Error(`greedy: no legal ${what}`);
  return x;
}

const hpFrac = (s: RunState): number => s.player.hp / s.player.maxHp;

/** Value of removing the worst card in the deck (d). */
function removalValue(s: RunState): number {
  const pool = s.player.deck.filter((c) => getCardDef(c.id).bound !== true);
  if (pool.length <= 5) return 0;
  return 4 + (4 - keepValue(worstDeckCard(s, pool))) * 1.2;
}

function bestUpgrade(s: RunState): { uid: number; gain: number } | null {
  let best: { uid: number; gain: number } | null = null;
  for (const c of s.player.deck) {
    const g = upgradeGain(c);
    if (g > 0 && (!best || g > best.gain)) best = { uid: c.uid, gain: g };
  }
  return best;
}

/** Resolve an amount against run-level scales (gold, HP, Shards); other scales use the static guess. */
function runAmount(s: RunState, a: Amount | undefined): number {
  if (a === undefined || typeof a === 'number' || a === 'X') return estAmount(a);
  const per = a.per ?? 1;
  const base = a.base ?? 0;
  switch (a.scale) {
    case 'gold':
      return base + per * s.player.gold;
    case 'hp':
      return base + per * s.player.hp;
    case 'max_hp':
      return base + per * s.player.maxHp;
    case 'missing_hp':
      return base + per * (s.player.maxHp - s.player.hp);
    case 'shards':
      return base + per * (s.player.counters.shards ?? 0);
    case 'deck_size':
      return base + per * s.player.deck.length;
    default:
      return estAmount(a);
  }
}

/** Out-of-combat value of an effect list (events, pacts, rest options). */
export function runEffectsValue(s: RunState, effects: readonly Effect[]): number {
  let v = 0;
  const frac = hpFrac(s);
  for (const e of effects) {
    switch (e.type) {
      case 'lose_hp': {
        const n = runAmount(s, e.amount);
        v -= n * (frac < 0.4 ? 2.5 : 1.2);
        if (s.player.hp - n <= 5) v -= 100;
        break;
      }
      case 'heal':
        v += Math.min(runAmount(s, e.amount), s.player.maxHp - s.player.hp) * 0.8;
        break;
      case 'max_hp':
        v += runAmount(s, e.amount) * 1.5;
        break;
      case 'gold': {
        const n = runAmount(s, e.amount);
        v += 0.1 * n;
        break;
      }
      case 'add_card': {
        const def = getCardDef(e.card);
        const n = estAmount(e.n);
        v += (def.type === 'curse' ? -15 : def.type === 'status' ? -3 : 3) * n;
        break;
      }
      case 'remove_card':
        v += removalValue(s) * estAmount(e.n);
        break;
      case 'transform_card':
        v += 2;
        break;
      case 'upgrade':
        v += e.where === 'deck' ? (3 + 1.5 * Math.min(bestUpgrade(s)?.gain ?? 0, 5)) * runAmount(s, e.n) : 2;
        break;
      case 'gain_relic':
        v += 15;
        break;
      case 'gain_potion':
        v += s.player.potions.length < s.player.potionSlots ? 5 : 1;
        break;
      case 'shards':
        v += 3 * runAmount(s, e.amount);
        break;
      case 'start_combat':
        v += -10 + 25 * (frac - 0.5) + runEffectsValue(s, e.onWin ?? []) + 6;
        break;
      case 'gamble': {
        const total = e.outcomes.reduce((a, o) => a + o.weight, 0);
        if (total <= 0) throw new Error('gamble with no weight');
        v += e.outcomes.reduce((a, o) => a + (o.weight / total) * runEffectsValue(s, o.effects), 0);
        break;
      }
      case 'offer_cards':
        v += 7;
        break;
      case 'transmute':
        v += 3 + Math.max(0, removalValue(s) - 4) * 0.5;
        break;
      case 'duplicate_card':
        v += 4;
        break;
      case 'lose_relic':
        v -= 15;
        break;
      case 'lose_potion':
        v -= 4;
        break;
      case 'run_flag':
        if (e.key === 'hunted_pending') v -= 6 * e.delta;
        else if (e.key === 'lean_rewards') v -= 2 * e.delta;
        else if (e.key === 'wide_rewards') v += 1.5 * e.delta;
        else v += e.delta;
        break;
      case 'choose': {
        let best = -Infinity;
        for (const o of e.options) best = Math.max(best, runEffectsValue(s, o.effects));
        v += best === -Infinity ? 0 : best;
        break;
      }
      case 'conditional':
        v += 0.5 * runEffectsValue(s, e.then) + 0.5 * runEffectsValue(s, e.else ?? []);
        break;
      default:
        v += effectsValue([e]);
    }
  }
  return v;
}

// ---------------------------------------------------------------------------
// Map: enumerate paths to the end of the act and score them with a crude HP/gold model.

interface PathModel {
  h: number;
  gold: number;
  v: number;
}

function nodeStep(s: RunState, m: PathModel, n: MapNode, strong: boolean): void {
  const dmg = 0.07 + 0.02 * (s.act - 1);
  switch (n.type) {
    case 'monster':
      m.v += 3;
      m.h -= dmg;
      m.gold += 15;
      break;
    case 'elite':
      if (m.h >= 0.7 && strong) m.v += 10;
      else if (m.h >= 0.5) m.v += 2;
      else m.v -= 12;
      m.h -= 0.22 + 0.02 * s.act;
      m.gold += 30;
      break;
    case 'rest':
      if (m.h < 0.55) {
        m.v += 8;
        m.h += 0.3;
      } else m.v += 4;
      break;
    case 'shop':
      m.v += Math.min(m.gold, 320) / 45;
      m.gold = Math.max(0, m.gold - 150);
      break;
    case 'event':
      m.v += 3;
      m.h -= 0.02;
      break;
    case 'treasure':
      m.v += 6;
      m.gold += 30;
      break;
    case 'boss':
      break;
  }
  m.h = Math.min(1, m.h);
  if (m.h < 0.25) m.v -= (0.25 - m.h) * 60;
}

function bestPathValue(s: RunState, n: MapNode, m: PathModel, strong: boolean, depth: number): number {
  const next: PathModel = { ...m };
  nodeStep(s, next, n, strong);
  if (n.edges.length === 0 || n.row >= 14 || depth > 16) return next.v;
  let best = -Infinity;
  for (const col of n.edges) {
    const child = getNode(s.map, { row: n.row + 1, col });
    if (child.type === 'boss') return next.v;
    best = Math.max(best, bestPathValue(s, child, next, strong, depth + 1));
  }
  return best;
}

function chooseTravel(s: RunState, legal: readonly Action[], rng: SingleRng): Action {
  const travels = of(legal, 'travel');
  if (travels.length === 1) return need(travels[0], 'travel');
  const p = deckProfile(s);
  const strong = p.nonStarter >= 2 || s.act >= 2;
  const nodes = nextNodes(s.map, s.mapPos);
  let best: Action[] = [];
  let bestV = -Infinity;
  for (const a of travels) {
    const n = nodes.find((x) => x.row === a.to.row && x.col === a.to.col);
    if (!n) throw new Error('travel target not among next nodes');
    const v = bestPathValue(s, n, { h: hpFrac(s), gold: s.player.gold, v: 0 }, strong, 0);
    if (v > bestV + 1e-9) {
      bestV = v;
      best = [a];
    } else if (Math.abs(v - bestV) <= 1e-9) best.push(a);
  }
  return rng.pick(best);
}

// ---------------------------------------------------------------------------
// Rooms

function chooseReward(s: RunState, legal: readonly Action[]): Action {
  const r = s.reward;
  if (!r) throw new Error('reward phase without reward');
  for (const kind of ['gold', 'relic'] as const) {
    const a = legal.find((x) => x.type === 'pick_reward' && x.kind === kind);
    if (a) return a;
  }
  const pot = legal.find((x) => x.type === 'pick_reward' && x.kind === 'potion');
  if (pot && s.player.potions.length < s.player.potionSlots) return pot;
  if (r.cardStatus === 'pending' && r.cards.length > 0) {
    const { index, score } = bestOffer(s, r.cards);
    const pick = legal.find((x) => x.type === 'pick_reward' && x.kind === 'card' && x.index === index);
    const skip = legal.find((x) => x.type === 'skip_reward');
    if (pick && (score >= skipThreshold(s) || !skip)) return pick;
    if (skip) return skip;
  }
  return need(of(legal, 'proceed')[0], 'proceed');
}

function chooseShop(s: RunState, legal: readonly Action[]): Action {
  const sh = s.shop;
  if (!sh) throw new Error('shop phase without shop');
  const deck = s.player.deck;
  const junk = deck.filter((c) => keepValue(c) < 4).length;
  const removes = of(legal, 'shop_remove');
  if (removes.length && junk >= 2) {
    const target = worstDeckCard(s, deck.filter((c) => removes.some((a) => a.uid === c.uid)));
    const shards = s.player.counters.shards ?? 0;
    const viaShard = removes.find((a) => a.uid === target.uid && a.pay === 'shard');
    const viaGold = removes.find((a) => a.uid === target.uid && a.pay === 'gold');
    if (viaShard && (shards >= 3 || !viaGold)) return viaShard;
    if (viaGold) return viaGold;
    if (viaShard) return viaShard;
  }
  // Relics: always worth it; prefer rarer.
  const rank: Record<string, number> = { rare: 4, uncommon: 3, shop: 2, common: 2, boss: 0, starter: 0, event: 1 };
  let relicBuy: Action | null = null;
  let relicV = 0;
  for (const a of of(legal, 'shop_buy')) {
    if (a.kind !== 'relic') continue;
    const it = sh.relics[a.index];
    if (!it) throw new Error('shop relic index');
    const v = rank[getRelicDef(it.id).rarity] ?? 1;
    if (v > relicV) {
      relicV = v;
      relicBuy = a;
    }
  }
  if (relicBuy) return relicBuy;
  const p = deckProfile(s);
  let cardBuy: Action | null = null;
  let cardV = skipThreshold(s) + 1;
  for (const a of of(legal, 'shop_buy')) {
    if (a.kind !== 'card') continue;
    const it = sh.cards[a.index];
    if (!it) throw new Error('shop card index');
    const v = offerScore(s, { id: it.id, upgraded: it.upgraded }, p) - it.price / 60;
    if (v > cardV) {
      cardV = v;
      cardBuy = a;
    }
  }
  if (cardBuy) return cardBuy;
  if (s.player.potions.length < s.player.potionSlots) {
    const pot = of(legal, 'shop_buy').find((a) => a.kind === 'potion');
    if (pot) return pot;
  }
  return need(of(legal, 'proceed')[0], 'proceed');
}

function chooseRest(s: RunState, legal: readonly Action[]): Action {
  const r = s.rest;
  if (!r) throw new Error('rest phase without rest');
  const frac = hpFrac(s);
  const bossNext = s.mapPos !== null && s.mapPos.row >= 14;
  const shards = s.player.counters.shards ?? 0;
  const shardCost = shards >= 4 ? 1.5 : 3;
  const options: { a: Action; v: number }[] = [];
  const restA = of(legal, 'rest')[0];
  if (restA) {
    const heal = Math.min(Math.floor((s.player.maxHp * 30) / 100), s.player.maxHp - s.player.hp);
    let v = heal * 0.45;
    if (frac < 0.5) v += 20;
    else if (bossNext && frac < 0.75) v += 15;
    options.push({ a: restA, v });
  }
  const up = bestUpgrade(s);
  if (up) {
    const a = of(legal, 'smith').find((x) => x.uid === up.uid);
    if (a) options.push({ a, v: 4 + 2 * Math.min(up.gain, 5) });
  }
  for (const a of of(legal, 'rest_special')) {
    const id = r.specials[a.index];
    if (id === undefined) throw new Error('rest special index');
    const { def } = restOptionFor(s, id);
    const v = runEffectsValue(s, def.effects) - shardCost * restOptionShardCost(s, def);
    options.push({ a, v });
  }
  options.sort((x, y) => y.v - x.v);
  const best = options[0];
  if (r.done) {
    if (best && best.v > 5) return best.a;
    return need(of(legal, 'proceed')[0], 'proceed');
  }
  return need(best, 'rest option').a;
}

function chooseEvent(s: RunState, legal: readonly Action[]): Action {
  const ev = s.event;
  if (!ev) throw new Error('event phase without event');
  const choices = of(legal, 'event_choice');
  if (choices.length === 0) return need(of(legal, 'proceed')[0], 'proceed');
  const opts = currentEventOptions(s);
  let best = need(choices[0], 'event choice');
  let bestV = -Infinity;
  for (const a of choices) {
    const o = opts[a.index];
    if (!o) throw new Error('event option index');
    // Default to the safe option: risk-free options get a small bonus.
    const v = runEffectsValue(s, o.effects) + (o.effects.length === 0 ? 0.5 : 0) + (o.next ? 1 : 0);
    if (v > bestV) {
      bestV = v;
      best = a;
    }
  }
  return best;
}

/** Known boss-relic drawbacks (GDD §5.5), as a value adjustment given the current deck. */
function bossRelicValue(s: RunState, id: string): number {
  const def = getRelicDef(id);
  const tags = def.tags ?? [];
  const energy = tags.includes('energy') || def.hooks?.maxEnergy !== undefined;
  let v = energy ? 12 : 6;
  const p = deckProfile(s);
  const count = (pred: (t: readonly string[]) => boolean): number => s.player.deck.filter((c) => pred(getCardDef(c.id).tags ?? [])).length;
  switch (id) {
    case 'binding_contract':
      v -= 3;
      break;
    case 'cracked_hourglass':
      v -= 3;
      break;
    case 'exposed_core':
      v -= 4;
      break;
    case 'stasis_engine':
      v -= p.draw >= 3 ? 2 : 4;
      break;
    case 'tender_plating':
      v -= 4;
      break;
    case 'fixed_star':
      if (count((t) => t.includes('on_beat')) >= 4) v -= 10;
      break;
    case 'heavy_heart':
      if (count((t) => t.includes('riposte')) >= 3) v -= 12;
      break;
    case 'gravity_loom':
      v += 2;
      break;
    case 'ascendant_prism':
      v = 7;
      break;
  }
  return v;
}

function chooseBossRelic(s: RunState, legal: readonly Action[]): Action {
  const choices = s.bossRelicChoices ?? [];
  let best: Action = need(of(legal, 'skip_boss_relic')[0], 'skip_boss_relic');
  let bestV = 5; // 2 Shards
  for (const a of of(legal, 'choose_boss_relic')) {
    const id = choices[a.index];
    if (id === undefined) throw new Error('boss relic index');
    const v = bossRelicValue(s, id);
    if (v > bestV) {
      bestV = v;
      best = a;
    }
  }
  return best;
}

function chooseStart(s: RunState, legal: readonly Action[]): Action {
  const choices = s.startChoices ?? [];
  let best = need(of(legal, 'choose_start_boon')[0], 'start boon');
  let bestV = -Infinity;
  for (const a of of(legal, 'choose_start_boon')) {
    const c = choices[a.index];
    if (!c) throw new Error('start boon index');
    const def = getBoonDef(c.id);
    // Safe option unless the trade is clearly better.
    const v = runEffectsValue(s, def.effects) + (def.list === 'safe' ? 5 : 0);
    if (v > bestV) {
      bestV = v;
      best = a;
    }
  }
  return best;
}

/** Use a non-combat healing potion on the map when HP is low. */
function mapPotion(s: RunState, legal: readonly Action[]): Action | null {
  if (hpFrac(s) >= 0.4) return null;
  for (const a of of(legal, 'use_potion')) {
    const id = s.player.potions[a.index];
    if (id === undefined) throw new Error('potion index');
    if (getPotionDef(id).effects.some((e) => e.type === 'heal' || e.type === 'max_hp')) return a;
  }
  return null;
}

export function chooseRun(s: RunState, legal: readonly Action[], rng: SingleRng): Action {
  const pot = mapPotion(s, legal);
  if (pot) return pot;
  switch (s.phase) {
    case 'start':
      return chooseStart(s, legal);
    case 'map':
      return chooseTravel(s, legal, rng);
    case 'reward':
      return chooseReward(s, legal);
    case 'shop':
      return chooseShop(s, legal);
    case 'rest':
      return chooseRest(s, legal);
    case 'event':
      return chooseEvent(s, legal);
    case 'treasure':
      return need(of(legal, 'open_treasure')[0] ?? of(legal, 'proceed')[0], 'treasure action');
    case 'boss_reward':
      return chooseBossRelic(s, legal);
    case 'combat':
    case 'victory':
    case 'defeat':
      throw new Error(`chooseRun in phase ${s.phase}`);
  }
}
