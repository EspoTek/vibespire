// Run-level reducers (GDD §4): run creation, Ascent Pacts, map travel and room entry, rewards,
// Shards, shop, rest, events, treasure, boss relics, act transitions, potions.

import {
  allBoons,
  allRestOptions,
  encountersFor,
  eventsFor,
  getBoonDef,
  getCardDef,
  getClassDef,
  getEventDef,
  getPotionDef,
  getRelicDef,
  getRestOptionDef,
} from '../content';
import { cardDef, findCombatCard, isUpgradable, makeCard } from './cards';
import { emit, enqueue, makeEnv, requireCombat, type Env } from './core';
import { effectItems } from './ctx';
import { addToDeck, removeFromDeck, upgradeInDeck } from './deck';
import { gainGold } from './effects';
import { heal } from './damage';
import { currentFloor, newFloorRecord } from './history';
import { classCardPool, colorlessPool, gainPotion, gainRelic, hasPotionSlot, pickCards, relicPool, rollPotion, rollRarity, rollRelicOrNull } from './items';
import { generateMap, getNode, nextNodes } from './map';
import { choiceActions, drain } from './queue';
import { startCombat } from './combat';
import { createStreams, nextInt, pickFrom, shuffleInPlace, weightedPick } from './rng';
import { gainShards, shardsOf, transmuteOffer } from './runeffects';
import { ENGINE_VERSION } from './version';
import { dispatch, playerRule } from './statuses';
import { TUNING } from './tuning';
import type {
  Act,
  Action,
  CardDef,
  CardOffer,
  CombatKind,
  EffectSource,
  EncounterId,
  EventOptionDef,
  GameEvent,
  MapPos,
  Phase,
  QueueItem,
  RestOptionDef,
  RestOptionId,
  RewardState,
  RngState,
  RoomType,
  RunState,
  ShopState,
  TurnStep,
} from './types';

const step = (s: TurnStep): QueueItem => ({ kind: 'step', step: s });

export function setPhase(env: Env, phase: Phase): void {
  env.state.phase = phase;
  emit(env, { t: 'phase', phase });
}

function pickBoss(rng: RngState, act: Act): EncounterId {
  const pool = encountersFor(act, 'boss');
  if (pool.length === 0) throw new Error(`no boss encounters for act ${act}`);
  return pickFrom(rng, pool).id;
}

function newActMap(rng: RngState, act: Act) {
  const elites = encountersFor(act, 'elite').map((e) => e.id);
  if (elites.length === 0) throw new Error(`no elite encounters for act ${act}`);
  return generateMap(rng, act, pickBoss(rng, act), elites);
}

// ---------------------------------------------------------------------------
// New run

export function createRun(seed: string, classId: string): { state: RunState; events: GameEvent[] } {
  const cls = getClassDef(classId);
  const rng = createStreams(seed);
  const map = newActMap(rng.map, 1);
  const state: RunState = {
    version: ENGINE_VERSION,
    seed,
    classId,
    rng,
    act: 1,
    ascent: 0,
    floor: 0,
    phase: 'start',
    player: {
      hp: cls.maxHp,
      maxHp: cls.maxHp,
      gold: cls.startingGold,
      deck: [],
      relics: [],
      potions: [],
      potionSlots: cls.potionSlots,
      counters: { shards: 0 },
    },
    map,
    mapPos: null,
    mapPath: [],
    room: 'start',
    combat: null,
    reward: null,
    shop: null,
    event: null,
    rest: null,
    treasure: null,
    startChoices: null,
    bossRelicChoices: null,
    queue: [],
    pendingChoice: null,
    history: { floors: [] },
    counters: {
      encounters: [],
      monstersThisAct: 0,
      eventsSeen: [],
      rarePity: TUNING.rarePityStart,
      potionChance: TUNING.potion.start,
      shopRemovals: 0,
    },
    nextUid: 1,
  };
  state.player.deck = cls.startingDeck.map((id) => makeCard(state, id));
  state.history.floors.push(newFloorRecord(state, 'start'));
  const env = makeEnv(state);
  for (const id of cls.startingRelics) gainRelic(env, id);
  dispatch(env, 'onActStart', 'player', {});
  drain(env);
  state.startChoices = rollPacts(state);
  return { state, events: env.events };
}

/** GDD §4.11: 1 pact from the safe list and 2 from the trade list (reward stream, no duplicates). */
function rollPacts(state: RunState): { id: string }[] {
  const safe = allBoons().filter((b) => b.list === 'safe').map((b) => b.id);
  const trade = allBoons().filter((b) => b.list === 'trade').map((b) => b.id);
  if (safe.length < 1 || trade.length < 2) throw new Error(`need >= 1 safe and >= 2 trade pacts (have ${safe.length} / ${trade.length})`);
  const s = pickFrom(state.rng.reward, safe);
  const t = shuffleInPlace(state.rng.reward, [...trade]).slice(0, 2);
  return [s, ...t].map((id) => ({ id }));
}

// ---------------------------------------------------------------------------
// Steps queued by run-level handlers

export function runStep(env: Env, st: TurnStep): void {
  const s = env.state;
  switch (st.op) {
    case 'start_boon_done':
      setPhase(env, 'map');
      return;
    case 'event_option_done': {
      const ev = s.event;
      if (!ev) throw new Error('event_option_done without an event');
      if (st.next !== null) {
        ev.page = st.next;
        ev.chosen = null;
      } else ev.done = true;
      return;
    }
    case 'enter_room':
      enterRoom(env);
      return;
    case 'next_act':
      nextAct(env);
      return;
    case 'transmute_offer':
      transmuteOffer(env, st.uid, st.offers, st.rarity, st.upgrade);
      return;
    default:
      throw new Error(`combat step ${st.op} routed to run`);
  }
}

// ---------------------------------------------------------------------------
// Map travel and rooms

function travel(env: Env, to: MapPos): void {
  const s = env.state;
  const node = getNode(s.map, to);
  s.mapPos = { row: to.row, col: to.col };
  s.mapPath.push({ row: to.row, col: to.col });
  s.floor += 1;
  const room: RoomType = node.type === 'event' ? resolveUnknown(s) : node.type;
  s.room = room;
  s.history.floors.push(newFloorRecord(s, room));
  dispatch(env, 'onFloorEnter', 'player', {});
  enqueue(env, [step({ op: 'enter_room' })]);
}

function resolveUnknown(s: RunState): RoomType {
  const odds = Object.entries(TUNING.unknownRoomOdds) as [RoomType, number][];
  return weightedPick(s.rng.event, odds);
}

function eventPool(s: RunState) {
  const seen = s.counters.eventsSeen;
  return eventsFor(s.act).filter((e) => !seen.includes(e.id) && (!e.eligible || e.eligible({ state: s, combat: null })));
}

function enterRoom(env: Env): void {
  const s = env.state;
  const rec = currentFloor(s);
  switch (s.room) {
    case 'monster':
    case 'elite':
    case 'boss': {
      const kind = s.room;
      let encounterId: EncounterId;
      if (kind === 'boss') encounterId = s.map.bossEncounter;
      else if (kind === 'elite') {
        const node = s.mapPos ? getNode(s.map, s.mapPos) : null;
        encounterId = node?.encounterId ?? pickEncounter(s, 'elite');
        s.counters.encounters.push(encounterId);
      } else encounterId = pickEncounter(s, 'monster');
      rec.encounterId = encounterId;
      startCombat(env, { encounterId, kind });
      rec.enemies = requireCombat(s, 'enterRoom').enemies.map((e) => e.id);
      return;
    }
    case 'event': {
      const pool = eventPool(s);
      if (pool.length === 0) {
        // Event pools exhausted: the '?' becomes a normal fight (GDD §4.9).
        s.room = 'monster';
        rec.room = 'monster';
        enterRoom(env);
        return;
      }
      const ev = pickFrom(s.rng.event, pool);
      s.counters.eventsSeen.push(ev.id);
      rec.eventId = ev.id;
      s.event = { id: ev.id, page: null, chosen: null, done: false };
      setPhase(env, 'event');
      return;
    }
    case 'shop':
      s.shop = generateShop(s);
      setPhase(env, 'shop');
      dispatch(env, 'onShopEnter', 'player', {});
      return;
    case 'rest':
      s.rest = { done: false, specials: restSpecials(s), sideUsed: [] };
      setPhase(env, 'rest');
      return;
    case 'treasure':
      s.treasure = { opened: false, relic: null, gold: 0 };
      setPhase(env, 'treasure');
      return;
    case 'start':
    case null:
      throw new Error(`cannot enter room ${String(s.room)}`);
  }
}

function pickEncounter(s: RunState, kind: 'monster' | 'elite'): EncounterId {
  const poolName = kind === 'elite' ? 'elite' : s.counters.monstersThisAct < TUNING.easyFights[s.act] ? 'easy' : 'hard';
  const pool = encountersFor(s.act, poolName);
  if (pool.length === 0) throw new Error(`no '${poolName}' encounters for act ${s.act}`);
  const history = s.counters.encounters;
  const recent = history.slice(-TUNING.encounterNoRepeat);
  const last = history[history.length - 1];
  // Prefer not repeating the last N encounters; tiny pools relax to "not the last one", then allow repeats.
  let cands = pool.filter((e) => !recent.includes(e.id));
  if (cands.length === 0) cands = pool.filter((e) => e.id !== last);
  if (cands.length === 0) cands = pool;
  // weight is optional; documented default 1
  const id = weightedPick(s.rng.enemy, cands.map((e): [EncounterId, number] => [e.id, e.weight ?? 1]));
  history.push(id);
  if (kind === 'monster') s.counters.monstersThisAct += 1;
  return id;
}

/** Called by the combat_finalize step once a fight is won and its queue has drained. */
export function finishCombatWin(env: Env): void {
  const s = env.state;
  const c = requireCombat(s, 'finishCombatWin');
  for (const card of s.player.deck) {
    const copy = findCombatCard(c, card.uid);
    if (copy?.vars) card.vars = { ...copy.vars };
  }
  const rec = currentFloor(s);
  rec.turns = c.turn;
  rec.damageTaken = c.damageTaken;
  const kind = c.kind;
  const onWin = c.onWin;
  const eventId = c.eventId;
  s.combat = null;
  if (kind === 'boss' && s.act === 3) {
    setPhase(env, 'victory');
    return;
  }
  s.reward = generateReward(s, kind);
  rec.cardsOffered = s.reward.cards.map((o) => o.id);
  setPhase(env, 'reward');
  if (onWin.length) {
    if (eventId === null) throw new Error('event combat without an event id');
    enqueue(env, effectItems(onWin, { src: { kind: 'event', id: eventId }, self: 'player', target: null, x: 0 }));
  }
}

// ---------------------------------------------------------------------------
// Rewards (GDD §4.2-4.4)

function rewardSize(s: RunState): number {
  let n = TUNING.cardRewardSize;
  const pc = s.player.counters;
  if ((pc.wide_rewards ?? 0) > 0) {
    pc.wide_rewards = (pc.wide_rewards ?? 0) - 1;
    n += 1;
  }
  if ((pc.lean_rewards ?? 0) > 0) {
    pc.lean_rewards = (pc.lean_rewards ?? 0) - 1;
    n -= 1;
  }
  return Math.max(1, n);
}

function upgradedOffer(s: RunState, def: CardDef): boolean {
  const pct = TUNING.upgradedOffer[s.act] / (def.rarity === 'rare' ? 2 : 1);
  if (pct <= 0) return false;
  return nextInt(s.rng.reward, 0, 99) < pct && isUpgradable({ uid: -1, id: def.id, upgraded: false });
}

export function generateReward(s: RunState, kind: CombatKind): RewardState {
  const rng = s.rng.reward;
  const [gMin, gMax] = TUNING.gold[kind][s.act];
  const gold = nextInt(rng, gMin, gMax);
  const odds = TUNING.cardOdds[kind];
  const movesPity = kind === 'monster' || kind === 'elite' || kind === 'event';
  const fixed = playerRule(s, null as ('common' | 'uncommon' | 'rare')[] | null, (m, c, a) => a ?? (m.cardRewardRarities ? m.cardRewardRarities(c, kind) : null));
  const size = fixed ? fixed.length : rewardSize(s);
  const queueRar = fixed ? [...fixed] : null;
  const roll = (): 'common' | 'uncommon' | 'rare' => queueRar?.shift() ?? rollRarity(rng, odds, movesPity ? s.counters.rarePity : 0);
  const defs = pickCards(rng, (r) => classCardPool(s.classId, r), size, roll, `class ${s.classId} card reward`);
  if (movesPity) {
    if (defs.some((d) => d.rarity === 'rare')) s.counters.rarePity = TUNING.rarePityStart;
    else s.counters.rarePity += TUNING.rarePityStep;
  }
  const cards: CardOffer[] = defs.map((d) => ({ id: d.id, upgraded: upgradedOffer(s, d) }));
  const p = TUNING.potion;
  let potion: string | null = null;
  if (nextInt(rng, 0, 99) < s.counters.potionChance) {
    potion = rollPotion(s, rng);
    s.counters.potionChance = Math.max(p.min, s.counters.potionChance - p.step);
  } else s.counters.potionChance = Math.min(p.max, s.counters.potionChance + p.step);
  const relic = kind === 'elite' ? rollRelicOrNull(s, rng) : null;
  return { kind, gold, goldTaken: false, cards, cardStatus: 'pending', potion, potionTaken: false, relic, relicTaken: false };
}

function canSkipCards(s: RunState): boolean {
  return playerRule(s, true, (m, c, a) => a && (m.canSkipCardReward ? m.canSkipCardReward(c) : true));
}

/** Skipping a card reward screen: +1 Shard (skipShards modifier), onRewardSkipped. */
function skipCards(env: Env): void {
  const s = env.state;
  const r = s.reward;
  if (!r) throw new Error('no reward');
  r.cardStatus = 'skipped';
  currentFloor(s).cardSkipped = true;
  const n = playerRule(s, TUNING.shards.skipReward, (m, c, a) => (m.skipShards ? m.skipShards(c, a) : a), false);
  if (n > 0) gainShards(env, n);
  dispatch(env, 'onRewardSkipped', 'player', {});
}

function leaveToMap(env: Env): void {
  const s = env.state;
  s.reward = null;
  s.shop = null;
  s.event = null;
  s.rest = null;
  s.treasure = null;
  setPhase(env, 'map');
}

function proceedFromReward(env: Env): void {
  const s = env.state;
  const r = s.reward;
  if (!r) throw new Error('no reward state');
  if (r.cardStatus === 'pending') skipCards(env);
  if (s.room === 'boss') {
    s.reward = null;
    const pool = shuffleInPlace(s.rng.reward, relicPool(s, 'boss'));
    s.bossRelicChoices = pool.slice(0, TUNING.bossRelicChoices);
    setPhase(env, 'boss_reward');
    return;
  }
  leaveToMap(env);
}

function nextAct(env: Env): void {
  const s = env.state;
  if (s.act === 3) throw new Error('nextAct after act 3');
  const act: Act = s.act === 1 ? 2 : 3;
  s.act = act;
  const missing = s.player.maxHp - s.player.hp;
  heal(env, 'player', Math.floor((missing * TUNING.actHealMissingPct) / 100));
  for (const k of Object.keys(s.player.counters)) if (k.endsWith('_rest_of_act')) delete s.player.counters[k];
  s.map = newActMap(s.rng.map, act);
  s.mapPos = null;
  s.mapPath = [];
  s.room = null;
  s.bossRelicChoices = null;
  s.counters.monstersThisAct = 0;
  dispatch(env, 'onActStart', 'player', {});
  setPhase(env, 'map');
}

// ---------------------------------------------------------------------------
// Shop (GDD §4.6)

function shopPrice(s: RunState, item: 'card' | 'relic' | 'potion' | 'remove_gold' | 'remove_shard_gold', base: number): number {
  return Math.max(0, Math.floor(playerRule(s, base, (m, c, a) => (m.modifyShopPrice ? m.modifyShopPrice(c, item, a) : a))));
}

function priceIn(rng: RngState, range: readonly [number, number], pct = 100): number {
  return Math.floor((nextInt(rng, range[0], range[1]) * pct) / 100);
}

function shopRarity(r: string): 'common' | 'uncommon' | 'rare' {
  if (r === 'common' || r === 'uncommon' || r === 'rare') return r;
  throw new Error(`card rarity ${r} cannot be sold`);
}

export function generateShop(s: RunState): ShopState {
  const rng = s.rng.reward;
  const sh = TUNING.shop;
  const cards: ShopState['cards'] = [];
  const taken: CardDef[] = [];
  const roll = () => rollRarity(rng, TUNING.cardOdds.shop, 0);
  for (const [type, count] of Object.entries(sh.classCards) as ['attack' | 'skill' | 'power', number][]) {
    for (let i = 0; i < count; i++) {
      const pool = (r: Parameters<typeof classCardPool>[1]) => classCardPool(s.classId, r).filter((d) => d.type === type && !taken.includes(d));
      const any = (['common', 'uncommon', 'rare'] as const).some((r) => pool(r).length > 0);
      if (!any) continue; // a class pool without cards of this type yet (small/placeholder pools)
      const [d] = pickCards(rng, pool, 1, roll, `shop ${type}`);
      if (!d) throw new Error('shop pick');
      taken.push(d);
      cards.push({ id: d.id, upgraded: false, price: shopPrice(s, 'card', priceIn(rng, sh.cardPrice[shopRarity(d.rarity)])), sold: false, sale: false });
    }
  }
  if (cards.length > 0) {
    const i = nextInt(rng, 0, cards.length - 1);
    const it = cards[i];
    if (!it) throw new Error('shop sale index');
    it.price = Math.floor((it.price * sh.salePct) / 100);
    it.sale = true;
  }
  for (const r of sh.colorlessRarities) {
    const opts = colorlessPool(r).filter((d) => !cards.some((c) => c.id === d.id));
    if (opts.length === 0) continue;
    const d = pickFrom(rng, opts);
    cards.push({ id: d.id, upgraded: false, price: shopPrice(s, 'card', priceIn(rng, sh.cardPrice[r], sh.colorlessMarkupPct)), sold: false, sale: false });
  }
  const relics: ShopState['relics'] = [];
  for (let i = 0; i < sh.relics; i++) {
    const exclude = relics.map((r) => r.id);
    const last = i === sh.relics - 1;
    const id = (last ? rollRelicOrNull(s, rng, 'shop', exclude) : null) ?? rollRelicOrNull(s, rng, undefined, exclude);
    if (id === null) break;
    const rar = getRelicDef(id).rarity;
    if (rar !== 'common' && rar !== 'uncommon' && rar !== 'rare' && rar !== 'shop') throw new Error(`relic ${id} of rarity ${rar} rolled for shop`);
    relics.push({ id, price: shopPrice(s, 'relic', priceIn(rng, sh.relicPrice[rar])), sold: false });
  }
  const potions: ShopState['potions'] = [];
  for (let i = 0; i < sh.potions; i++) {
    const id = rollPotion(s, rng);
    potions.push({ id, price: shopPrice(s, 'potion', priceIn(rng, sh.potionPrice[getPotionDef(id).rarity])), sold: false });
  }
  return {
    cards,
    relics,
    potions,
    removePrice: shopPrice(s, 'remove_gold', sh.removeBase + sh.removeStep * s.counters.shopRemovals),
    removeShardGold: shopPrice(s, 'remove_shard_gold', sh.removeShardGold),
    removeUsed: false,
  };
}

function shardRemovalKeepsService(s: RunState): boolean {
  return playerRule(s, false, (m, c, a) => a || (m.shardRemovalKeepsService ? m.shardRemovalKeepsService(c) : false));
}

// ---------------------------------------------------------------------------
// Rest (GDD §4.7)

function restSpecials(s: RunState): RestOptionId[] {
  const ids = allRestOptions().map((o) => o.id);
  for (const r of s.player.relics) {
    const opt = getRelicDef(r.id).restOption;
    if (opt) ids.push(opt.id);
  }
  return ids;
}

export function restOptionFor(s: RunState, id: RestOptionId): { def: RestOptionDef; src: EffectSource } {
  for (const r of s.player.relics) {
    const opt = getRelicDef(r.id).restOption;
    if (opt && opt.id === id) return { def: opt, src: { kind: 'rest', id, relic: r.id } };
  }
  return { def: getRestOptionDef(id), src: { kind: 'rest', id } };
}

export function restOptionShardCost(s: RunState, def: RestOptionDef): number {
  return Math.max(0, playerRule(s, def.shardCost ?? 0, (m, c, a) => (m.restOptionCost ? m.restOptionCost(c, def.id, a) : a)));
}

function isRestSide(s: RunState, id: RestOptionId): boolean {
  return playerRule(s, false, (m, c, a) => a || (m.restSideAction ? m.restSideAction(c, id) : false));
}

/** true, or why the rest option is not available. */
export function restOptionAvailable(s: RunState, index: number): true | string {
  const r = s.rest;
  if (!r) throw new Error('no rest');
  const id = r.specials[index];
  if (id === undefined) throw new Error(`no rest option ${index}`);
  const { def } = restOptionFor(s, id);
  const side = isRestSide(s, id);
  if (side ? r.sideUsed.includes(id) : r.done) return 'Already used.';
  const cost = restOptionShardCost(s, def);
  if (shardsOf(s) < cost) return `Needs ${cost} Shard${cost === 1 ? '' : 's'}.`;
  return def.available ? def.available({ state: s, combat: null }) : true;
}

// ---------------------------------------------------------------------------
// Potions

export function usePotion(env: Env, index: number, target: number | null): void {
  const s = env.state;
  const id = s.player.potions[index];
  if (id === undefined) throw new Error(`no potion in slot ${index}`);
  const def = getPotionDef(id);
  s.player.potions.splice(index, 1);
  emit(env, { t: 'potion_used', potion: id });
  currentFloor(s).potionsUsed.push(id);
  if (s.phase === 'combat') dispatch(env, 'onPotionUsed', 'player', { potion: id });
  enqueue(env, effectItems(def.effects, { src: { kind: 'potion', id }, self: 'player', target, x: 0 }));
}

export function potionActions(s: RunState): Action[] {
  const out: Action[] = [];
  const combat = s.phase === 'combat' ? s.combat : null;
  if (s.phase === 'combat') {
    if (!combat || combat.turnPhase !== 'player' || combat.outcome !== null || combat.pendingChoice) return out;
  } else if (!['map', 'reward', 'shop', 'rest', 'event', 'treasure', 'boss_reward'].includes(s.phase)) return out;
  s.player.potions.forEach((id, index) => {
    const def = getPotionDef(id);
    if (!combat) {
      if (def.combatOnly) return;
      if (def.target !== 'none') throw new Error(`potion ${id} targets an enemy but is not combatOnly`);
      out.push({ type: 'use_potion', index });
      return;
    }
    if (def.target === 'enemy') {
      for (const e of combat.enemies) if (e.alive) out.push({ type: 'use_potion', index, target: e.uid });
    } else out.push({ type: 'use_potion', index });
  });
  return out;
}

// ---------------------------------------------------------------------------
// Events

export function currentEventOptions(s: RunState): EventOptionDef[] {
  const ev = s.event;
  if (!ev) throw new Error('no current event');
  const def = getEventDef(ev.id);
  if (ev.page === null) return def.options;
  const page = def.pages?.[ev.page];
  if (!page) throw new Error(`event ${ev.id} has no page '${ev.page}'`);
  return page.options;
}

// ---------------------------------------------------------------------------
// Legal actions outside combat

export function runLegalActions(s: RunState): Action[] {
  if (s.pendingChoice) return choiceActions(s.pendingChoice);
  if (s.queue.length > 0) throw new Error('run queue not drained between actions');
  const out: Action[] = [];
  switch (s.phase) {
    case 'start':
      if (!s.startChoices) throw new Error('start phase without start choices');
      s.startChoices.forEach((_, index) => out.push({ type: 'choose_start_boon', index }));
      return out;
    case 'map':
      for (const n of nextNodes(s.map, s.mapPos)) out.push({ type: 'travel', to: { row: n.row, col: n.col } });
      break;
    case 'reward': {
      const r = s.reward;
      if (!r) throw new Error('reward phase without reward state');
      if (r.gold !== null && !r.goldTaken) out.push({ type: 'pick_reward', kind: 'gold' });
      const skippable = canSkipCards(s);
      if (r.cardStatus === 'pending') {
        r.cards.forEach((_, index) => out.push({ type: 'pick_reward', kind: 'card', index }));
        if (skippable) out.push({ type: 'skip_reward', kind: 'card' });
      }
      if (r.potion !== null && !r.potionTaken) out.push({ type: 'pick_reward', kind: 'potion' });
      if (r.relic !== null && !r.relicTaken) out.push({ type: 'pick_reward', kind: 'relic' });
      if (r.cardStatus !== 'pending' || skippable) out.push({ type: 'proceed' });
      break;
    }
    case 'shop': {
      const sh = s.shop;
      if (!sh) throw new Error('shop phase without shop state');
      const gold = s.player.gold;
      sh.cards.forEach((it, index) => {
        if (!it.sold && gold >= it.price) out.push({ type: 'shop_buy', kind: 'card', index });
      });
      sh.relics.forEach((it, index) => {
        if (!it.sold && gold >= it.price) out.push({ type: 'shop_buy', kind: 'relic', index });
      });
      sh.potions.forEach((it, index) => {
        if (!it.sold && gold >= it.price && hasPotionSlot(s)) out.push({ type: 'shop_buy', kind: 'potion', index });
      });
      const removable = s.player.deck.filter((c) => cardDef(c).bound !== true);
      if (!sh.removeUsed && gold >= sh.removePrice) for (const c of removable) out.push({ type: 'shop_remove', uid: c.uid, pay: 'gold' });
      const shardOk = (!sh.removeUsed || shardRemovalKeepsService(s)) && shardsOf(s) >= TUNING.shop.removeShardCost && gold >= sh.removeShardGold;
      if (shardOk) for (const c of removable) out.push({ type: 'shop_remove', uid: c.uid, pay: 'shard' });
      out.push({ type: 'proceed' });
      break;
    }
    case 'rest': {
      const r = s.rest;
      if (!r) throw new Error('rest phase without rest state');
      if (!r.done) {
        out.push({ type: 'rest' });
        for (const c of s.player.deck) if (isUpgradable(c)) out.push({ type: 'smith', uid: c.uid });
      }
      r.specials.forEach((_, index) => {
        if (restOptionAvailable(s, index) === true) out.push({ type: 'rest_special', index });
      });
      if (r.done) out.push({ type: 'proceed' });
      break;
    }
    case 'event': {
      const ev = s.event;
      if (!ev) throw new Error('event phase without event state');
      if (ev.done) out.push({ type: 'proceed' });
      else if (ev.chosen === null) {
        currentEventOptions(s).forEach((o, index) => {
          if (!o.available || o.available({ state: s, combat: null }) === true) out.push({ type: 'event_choice', index });
        });
      }
      break;
    }
    case 'treasure': {
      const t = s.treasure;
      if (!t) throw new Error('treasure phase without treasure state');
      out.push(t.opened ? { type: 'proceed' } : { type: 'open_treasure' });
      break;
    }
    case 'boss_reward': {
      const choices = s.bossRelicChoices;
      if (choices) {
        choices.forEach((_, index) => out.push({ type: 'choose_boss_relic', index }));
        out.push({ type: 'skip_boss_relic' });
      }
      break;
    }
    case 'victory':
    case 'defeat':
      return [];
    case 'combat':
      throw new Error('runLegalActions called in combat');
  }
  out.push(...potionActions(s));
  return out;
}

// ---------------------------------------------------------------------------
// Action handlers outside combat (legality is checked by Game.apply before these run)

export function applyRunAction(env: Env, a: Action): void {
  const s = env.state;
  switch (a.type) {
    case 'choose_start_boon': {
      const choice = s.startChoices?.[a.index];
      if (!choice) throw new Error(`no start boon ${a.index}`);
      const def = getBoonDef(choice.id);
      s.startChoices = null;
      currentFloor(s).boonId = def.id;
      enqueue(env, [...effectItems(def.effects, { src: { kind: 'boon', id: def.id }, self: 'player', target: null, x: 0 }), step({ op: 'start_boon_done' })]);
      return;
    }
    case 'travel':
      travel(env, a.to);
      return;
    case 'pick_reward': {
      const r = s.reward;
      if (!r) throw new Error('no reward');
      if (a.kind === 'gold') {
        if (r.gold === null) throw new Error('no gold reward');
        r.goldTaken = true;
        gainGold(env, r.gold);
      } else if (a.kind === 'card') {
        const offer = a.index === undefined ? undefined : r.cards[a.index];
        if (!offer) throw new Error(`no card reward ${String(a.index)}`);
        r.cardStatus = 'picked';
        addToDeck(env, offer.id, offer.upgraded, 'reward');
        currentFloor(s).cardPicked = offer.id;
      } else if (a.kind === 'potion') {
        if (r.potion === null) throw new Error('no potion reward');
        r.potionTaken = true;
        gainPotion(env, r.potion);
      } else {
        if (r.relic === null) throw new Error('no relic reward');
        r.relicTaken = true;
        gainRelic(env, r.relic);
      }
      return;
    }
    case 'skip_reward':
      skipCards(env);
      return;
    case 'proceed':
      switch (s.phase) {
        case 'reward':
          return proceedFromReward(env);
        case 'shop':
        case 'rest':
        case 'event':
        case 'treasure':
          return leaveToMap(env);
        default:
          throw new Error(`proceed in phase ${s.phase}`);
      }
    case 'shop_buy': {
      const sh = s.shop;
      if (!sh) throw new Error('no shop');
      const list = a.kind === 'card' ? sh.cards : a.kind === 'relic' ? sh.relics : sh.potions;
      const item = list[a.index];
      if (!item || item.sold) throw new Error(`shop item ${a.kind}[${a.index}] unavailable`);
      item.sold = true;
      gainGold(env, -item.price);
      if (a.kind === 'card') {
        getCardDef(item.id);
        addToDeck(env, item.id, false, 'shop');
      } else if (a.kind === 'relic') gainRelic(env, item.id);
      else gainPotion(env, item.id);
      return;
    }
    case 'shop_remove': {
      const sh = s.shop;
      if (!sh) throw new Error('no shop');
      if (a.pay === 'gold') {
        gainGold(env, -sh.removePrice);
        sh.removeUsed = true;
        s.counters.shopRemovals += 1;
      } else {
        gainShards(env, -TUNING.shop.removeShardCost);
        gainGold(env, -sh.removeShardGold);
        if (!shardRemovalKeepsService(s)) sh.removeUsed = true;
      }
      removeFromDeck(env, a.uid);
      return;
    }
    case 'rest': {
      const r = s.rest;
      if (!r) throw new Error('no rest');
      r.done = true;
      heal(env, 'player', Math.floor((s.player.maxHp * TUNING.restHealPct) / 100));
      dispatch(env, 'onRest', 'player', { action: 'rest', uid: null });
      return;
    }
    case 'smith': {
      const r = s.rest;
      if (!r) throw new Error('no rest');
      r.done = true;
      upgradeInDeck(env, a.uid);
      dispatch(env, 'onRest', 'player', { action: 'smith', uid: a.uid });
      return;
    }
    case 'rest_special': {
      const r = s.rest;
      if (!r) throw new Error('no rest');
      const id = r.specials[a.index];
      if (id === undefined) throw new Error(`no rest option ${a.index}`);
      const { def, src } = restOptionFor(s, id);
      const cost = restOptionShardCost(s, def);
      if (isRestSide(s, id)) r.sideUsed.push(id);
      else r.done = true;
      if (cost > 0) gainShards(env, -cost);
      enqueue(env, effectItems(def.effects, { src, self: 'player', target: null, x: 0 }));
      dispatch(env, 'onRest', 'player', { action: id, uid: null });
      return;
    }
    case 'event_choice': {
      const ev = s.event;
      if (!ev) throw new Error('no event');
      const opt = currentEventOptions(s)[a.index];
      if (!opt) throw new Error(`no event option ${a.index}`);
      ev.chosen = a.index;
      if (ev.page === null) currentFloor(s).eventChoice = a.index;
      enqueue(env, [...effectItems(opt.effects, { src: { kind: 'event', id: ev.id }, self: 'player', target: null, x: 0 }), step({ op: 'event_option_done', next: opt.next ?? null })]);
      return;
    }
    case 'choose_boss_relic': {
      const id = s.bossRelicChoices?.[a.index];
      if (id === undefined) throw new Error(`no boss relic ${a.index}`);
      s.bossRelicChoices = null;
      gainRelic(env, id);
      enqueue(env, [step({ op: 'next_act' })]);
      return;
    }
    case 'skip_boss_relic': {
      s.bossRelicChoices = null;
      gainShards(env, TUNING.shards.skipBossRelic);
      enqueue(env, [step({ op: 'next_act' })]);
      return;
    }
    case 'open_treasure': {
      const t = s.treasure;
      if (!t) throw new Error('no treasure');
      t.opened = true;
      t.gold = nextInt(s.rng.reward, TUNING.gold.treasure[0], TUNING.gold.treasure[1]);
      gainGold(env, t.gold);
      t.relic = rollRelicOrNull(s, s.rng.reward, undefined, [], TUNING.treasureRelicOdds);
      if (t.relic === null) emit(env, { t: 'text', text: 'The chest is empty.' });
      else gainRelic(env, t.relic);
      return;
    }
    case 'play_card':
    case 'use_potion':
    case 'end_turn':
    case 'resolve_choice':
      throw new Error(`${a.type} is not a run-level action`);
  }
}

/** Every reward-eligible card for a class (used by tests and tools). */
export function rewardPool(classId: string): string[] {
  return (['common', 'uncommon', 'rare'] as const).flatMap((r) => classCardPool(classId, r)).map((d) => d.id);
}
