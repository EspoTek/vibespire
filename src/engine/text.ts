// Description templating. Every number shown comes from the same resolvers the engine uses
// (resolveAmount, computeDamage, computeBlock) with preview = true.
//
// PLACEHOLDER NAMES. The walk visits a card's `effects`, then its `riposte` list, then
// `delay.effects` (recursing into repeat, conditional then/else, choose options, on_beat,
// spend_status and gamble outcomes). Each effect contributes one value under its `key`, or by
// default the effect type name:
//   damage -> {damage} (pipeline steps 1-5 in combat) and {times} if set
//   block / guard -> {block} / {guard} (with block modifiers in combat)
//   draw, energy, scry, discard, exhaust, upgrade, remove_card, transform_card, add_card, transmute,
//   offer_cards, advance, postpone, prime -> the effect type name ({draw}, {advance}, ...)
//   status, heal, lose_hp, max_hp, gold, shards, bloom, lose_defence -> the type name
//   prune -> {prune} (its Bloom amount)   spend_status -> {spend} (its n)   repeat -> {repeat}
//   run_flag -> {run_flag} (delta)   potion_slots -> {potion_slots}
//   summon -> {summon} (n or fillTo)   ai_state -> {ai_state} (delta or set)
//   gamble -> {gamble_1}, {gamble_2}, ... (percent chance of each outcome)
// A name already taken gets a numeric suffix: the second damage effect is {damage2}, and so on.
// Derived placeholders for every value: {<key>_abs} (absolute value: "Spend {shards_abs} Shard");
// for scaled amounts {<key>_per} (the `per`) and {<key>_base}; and {per}, {per2}, ... = the `per`
// of the 1st, 2nd, ... scaled amount in walk order.
// {n} is an alias for the first value that is not damage/block/guard/times (unless an effect uses key 'n').
// Definition `values` are available by name; status text also gets {stacks}.
// X amounts render as "X" outside combat and as the current energy in combat. Scaled amounts that
// need combat or a trigger context (trigger_hits, spent, ...) render their `base` when unavailable.
// renderTemplate THROWS on any placeholder it cannot fill.

import { CARD_KEYWORD_PREFIX, getBoonDef, getCardDef, getEnemyDef, getEventDef, getKeyword, getPotionDef, getRelicDef, getRestOptionDef, getStatusDef } from '../content';
import { TUNING } from './tuning';
import { findCardAnywhere } from './cards';
import { getEnemy, isAlive } from './core';
import { computeBlock, computeDamage } from './damage';
import { amountCtx, resolveAmount } from './effects';
import type { Amount, AmountScale, CardInstance, Effect, EffectFrame, EntityRef, RunState, Triggers } from './types';

export type TextValue = number | string;

export type TextPart =
  | { kind: 'text'; text: string }
  /** `value` is what to show; `base` is the unmodified value (renderer colours value > base / < base). */
  | { kind: 'value'; key: string; value: TextValue; base: TextValue };

export interface TextCtx {
  state: RunState;
  frame: EffectFrame;
}

const PLACEHOLDER = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;

export function renderTemplate(template: string, values: Readonly<Record<string, TextValue>>): string {
  return template.replace(PLACEHOLDER, (_, key: string) => {
    const v = values[key];
    if (v === undefined) throw new Error(`text template "${template}" uses {${key}} but only {${Object.keys(values).join('}, {')}} exist`);
    return String(v);
  });
}

export function templateParts(template: string, values: Readonly<Record<string, TextValue>>, base: Readonly<Record<string, TextValue>>): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const m of template.matchAll(PLACEHOLDER)) {
    const key = m[1];
    if (key === undefined || m.index === undefined) throw new Error('template match without group');
    if (m.index > last) parts.push({ kind: 'text', text: template.slice(last, m.index) });
    const v = values[key];
    const b = base[key];
    if (v === undefined || b === undefined) throw new Error(`text template "${template}" uses {${key}} which has no value`);
    parts.push({ kind: 'value', key, value: v, base: b });
    last = m.index + m[0].length;
  }
  if (last < template.length) parts.push({ kind: 'text', text: template.slice(last) });
  return parts;
}

function inCombat(ctx: TextCtx | null): ctx is TextCtx {
  return ctx !== null && ctx.state.phase === 'combat' && ctx.state.combat !== null;
}

/** Scales that only exist in a trigger/frame context or in combat. */
function scaleAvailable(ctx: TextCtx, scale: AmountScale): boolean {
  const f = ctx.frame;
  if (scale === 'trigger_hits') return f.hits !== undefined;
  if (scale === 'spent') return f.spent !== undefined;
  if (scale === 'shed') return f.shed !== undefined;
  if (scale === 'scrapped') return f.scrapped !== undefined;
  if (scale === 'stacks') return f.src.kind === 'status';
  if (typeof scale === 'object' && 'cardVar' in scale) return cardKnown(ctx);
  if (typeof scale === 'object' && 'ai' in scale) return typeof f.self === 'number';
  const needsTarget =
    scale === 'forecast_damage' || scale === 'intent_damage' || scale === 'rot_on_target' ||
    (typeof scale === 'object' && (('forecast_damage' in scale && scale.forecast_damage === 'target') || ('intent_damage' in scale && scale.intent_damage === 'target') || ('status' in scale && scale.of === 'target')));
  if (needsTarget) return f.target !== null && f.target !== 'player' && isAlive(ctx.state, f.target);
  if (scale === 'triggered_riposte') return typeof f.self === 'number';
  return true;
}

const OUT_OF_COMBAT_SCALES: ReadonlySet<string> = new Set(['gold', 'shards', 'deck_size', 'hp', 'max_hp', 'missing_hp', 'bloom_cards_in_deck', 'bloom_total_in_deck', 'bloom_max_in_deck']);

function amountValue(ctx: TextCtx | null, a: Amount, stacks: number | undefined): TextValue {
  if (typeof a === 'number') return a;
  if (a === 'X') return inCombat(ctx) ? ctx.frame.x : 'X';
  const scale = a.scale;
  const base = a.base ?? 0;
  const per = a.per ?? 1;
  if (scale === 'x' && !inCombat(ctx)) return base === 0 && per === 1 ? 'X' : `${base}+X`;
  if (scale === 'stacks' && stacks !== undefined) return Math.floor(base + per * stacks);
  if (ctx === null || !scaleAvailable(ctx, scale)) return base;
  if (!inCombat(ctx)) {
    const ok = (typeof scale === 'string' && OUT_OF_COMBAT_SCALES.has(scale)) || (typeof scale === 'object' && ('fn' in scale || 'cardVar' in scale));
    if (!ok) return base;
  }
  return resolveAmount(amountCtx(ctx.state, ctx.frame, true), a);
}

function cardKnown(ctx: TextCtx): boolean {
  const src = ctx.frame.src;
  return src.kind === 'card' && findCardAnywhere({ state: ctx.state, combat: ctx.state.combat }, src.uid) !== null;
}

function previewTarget(ctx: TextCtx): EntityRef | null {
  const t = ctx.frame.target;
  return t !== null && isAlive(ctx.state, t) ? t : null;
}

function damageValue(ctx: TextCtx | null, e: Extract<Effect, { type: 'damage' }>, stacks: number | undefined): TextValue {
  const base = amountValue(ctx, e.amount, stacks);
  if (typeof base !== 'number' || !inCombat(ctx)) return base;
  const card = ctx.frame.src.kind === 'card' ? findCardAnywhere({ state: ctx.state, combat: ctx.state.combat }, ctx.frame.src.uid) : null;
  const target = e.target === 'self' ? ctx.frame.self : e.target === 'target' || e.target === 'attacker' || e.target === 'all_enemies' ? previewTarget(ctx) : null;
  const tags = [...(e.tags ?? []), ...(ctx.frame.delayed ? ['delayed'] : []), ...(ctx.frame.riposte ? ['riposte'] : [])];
  return computeDamage(ctx.state, { source: ctx.frame.self, target, card, tags }, base, true);
}

function defenceValue(ctx: TextCtx | null, e: Extract<Effect, { type: 'block' | 'guard' }>, stacks: number | undefined): TextValue {
  const base = amountValue(ctx, e.amount, stacks);
  if (typeof base !== 'number' || !inCombat(ctx)) return base;
  return computeBlock(ctx.state, ctx.frame.self, base, true, { pool: e.type, tags: ctx.frame.delayed ? ['delayed'] : [] });
}

/** Values for every placeholder the effects provide (see header for naming). */
export function effectTextValues(
  ctx: TextCtx | null,
  effects: readonly Effect[],
  extra?: Readonly<Record<string, number>>,
  /** Value for 'stacks' scaling (status descriptions). */
  stacks?: number,
): Record<string, TextValue> {
  const out: Record<string, TextValue> = { ...(extra ?? {}) };
  let aliasFree = !('n' in out) && !usesKeyN(effects);
  let perCount = 0;
  const notePer = (key: string, a: Amount | undefined): void => {
    if (a === undefined || typeof a === 'number' || a === 'X') return;
    const per = a.per ?? 1;
    out[`${key}_per`] = per;
    out[`${key}_base`] = a.base ?? 0;
    perCount += 1;
    out[perCount === 1 ? 'per' : `per${perCount}`] = per;
  };
  const put = (key: string, v: TextValue, aliasable: boolean, a?: Amount): void => {
    let k = key;
    for (let i = 2; k in out; i++) k = `${key}${i}`;
    out[k] = v;
    if (typeof v === 'number') out[`${k}_abs`] = Math.abs(v);
    notePer(k, a);
    if (aliasable && aliasFree) {
      out.n = v;
      aliasFree = false;
    }
  };
  const av = (a: Amount): TextValue => amountValue(ctx, a, stacks);
  const visit = (list: readonly Effect[]): void => {
    for (const e of list) {
      switch (e.type) {
        case 'damage':
          put(e.key ?? 'damage', damageValue(ctx, e, stacks), false, e.amount);
          if (e.times !== undefined) put('times', av(e.times), false, e.times);
          break;
        case 'block':
        case 'guard':
          put(e.key ?? e.type, defenceValue(ctx, e, stacks), false, e.amount);
          break;
        case 'draw':
        case 'energy':
        case 'scry':
          put(e.key ?? e.type, av(e.n), true, e.n);
          break;
        case 'exhaust':
          put(e.key ?? e.type, av(e.n ?? 1), true, e.n);
          if (e.then) visit(e.then);
          break;
        case 'discard':
        case 'upgrade':
        case 'remove_card':
        case 'transform_card':
        case 'add_card':
          put(e.key ?? e.type, av(e.n ?? 1), true, e.n);
          break;
        case 'status':
        case 'heal':
        case 'lose_hp':
        case 'max_hp':
        case 'gold':
        case 'shards':
        case 'bloom':
          put(e.key ?? e.type, av(e.amount), true, e.amount);
          break;
        case 'lose_guard':
          put(e.key ?? 'lose_guard', e.amount === 'all' || e.amount === 'half' ? e.amount : av(e.amount), true, e.amount === 'all' || e.amount === 'half' ? undefined : e.amount);
          break;
        case 'lose_defence':
          put(e.key ?? 'lose_defence', e.amount === 'all' ? 'all' : av(e.amount), true, e.amount === 'all' ? undefined : e.amount);
          break;
        case 'advance':
        case 'postpone':
        case 'quicken':
          put(e.key ?? e.type, e.n, true);
          break;
        case 'schedule':
          put(e.key ?? 'schedule', e.turns, true);
          break;
        case 'prime':
          put('prime', e.n ?? 1, true);
          break;
        case 'transmute':
          put(e.key ?? 'transmute', e.n ?? 1, true);
          break;
        case 'offer_cards':
          put(e.key ?? 'offer_cards', e.n, true);
          break;
        case 'prune':
          put(e.key ?? 'prune', e.bloom ?? 1, true);
          break;
        case 'harvest':
          put(e.key ?? 'harvest', av(e.mult), true, e.mult);
          break;
        // Shared v2
        case 'strain':
          put(e.key ?? 'strain', av(e.amount), true, e.amount);
          break;
        case 'triage':
          put(e.key ?? 'triage', e.keep, true);
          break;
        case 'add_random_card':
          put(e.key ?? 'add_random_card', av(e.n ?? 1), true, e.n);
          break;
        case 'copy_card':
          break;
        case 'spend_status':
          put(e.key ?? 'spend', e.n === 'all' ? 'all' : e.n, true);
          visit(e.effects);
          break;
        case 'shed':
          put(e.key ?? 'shed', e.n === 'all' ? 'all' : e.n, true);
          visit(e.effects);
          break;
        case 'repeat':
          put(e.key ?? 'repeat', av(e.times), true, e.times);
          visit(e.effects);
          break;
        case 'conditional':
          visit(e.then);
          if (e.else) visit(e.else);
          break;
        case 'choose':
          for (const o of e.options) visit(o.effects);
          break;
        case 'on_beat':
          visit(e.effects);
          break;
        case 'gamble': {
          const total = e.outcomes.reduce((a, o) => a + o.weight, 0);
          e.outcomes.forEach((o, i) => {
            out[`gamble_${i + 1}`] = total > 0 ? Math.round((o.weight * 100) / total) : 0;
          });
          for (const o of e.outcomes) visit(o.effects);
          break;
        }
        case 'potion_slots':
          put('potion_slots', e.n, true);
          break;
        case 'run_flag':
          put('run_flag', e.delta, true);
          break;
        case 'summon':
          put('summon', e.fillTo ?? e.n ?? 1, true);
          break;
        case 'ai_state':
          put('ai_state', e.set ?? e.delta ?? 1, true);
          break;
        case 'fetch_card':
          put(e.key ?? 'fetch_card', av(e.n ?? 1), true, e.n);
          break;
        case 'autoplay':
          put(e.key ?? 'autoplay', av(e.n ?? 1), true, e.n);
          break;
        case 'gain_relic':
        case 'gain_potion':
        case 'custom':
        case 'duplicate_card':
        case 'lose_potion':
        case 'lose_relic':
        case 'start_combat':
        case 'transform':
        case 'reroll_forecast':
        case 'halt_enemy':
        case 'cancel_attack':
          break;
      }
    }
  };
  visit(effects);
  return out;
}

function usesKeyN(effects: readonly Effect[]): boolean {
  for (const e of effects) {
    if ('key' in e && e.key === 'n') return true;
    if ((e.type === 'repeat' || e.type === 'on_beat' || e.type === 'spend_status' || e.type === 'shed') && usesKeyN(e.effects)) return true;
    if (e.type === 'conditional' && (usesKeyN(e.then) || (e.else !== undefined && usesKeyN(e.else)))) return true;
    if (e.type === 'choose' && e.options.some((o) => usesKeyN(o.effects))) return true;
    if (e.type === 'gamble' && e.outcomes.some((o) => usesKeyN(o.effects))) return true;
  }
  return false;
}

function triggerEffects(triggers: Triggers | undefined): Effect[] {
  if (!triggers) return [];
  return Object.values(triggers).flatMap((list) => list ?? []);
}

// ---------------------------------------------------------------------------
// Cards

export type CardRef = Pick<CardInstance, 'id' | 'upgraded'> & { uid?: number };

function cardTextCtx(card: CardRef, state: RunState | null, target: number | null): TextCtx | null {
  if (!state) return null;
  // X previews include Reserve (shared v2 H3): an X-cost card would add it to X.
  const x = state.phase === 'combat' && state.combat ? state.combat.energy + (state.combat.player.statuses.reserve ?? 0) : 0;
  return { state, frame: { src: { kind: 'card', uid: card.uid ?? -1, id: card.id, upgraded: card.upgraded }, self: 'player', target, x } };
}

/** The full walk list of a card: effects, then riposte, then delay.effects. */
function cardWalk(card: CardRef): Effect[] {
  const def = getCardDef(card.id, card.upgraded);
  return [...def.effects, ...(def.riposte ?? []), ...(def.delay?.effects ?? []), ...(def.salvage ?? [])];
}

/** Placeholder values for a card. With `state` in combat they include all current modifiers (and `target`'s). */
export function cardTextValues(card: CardRef, state: RunState | null, target: number | null = null): Record<string, TextValue> {
  const def = getCardDef(card.id, card.upgraded);
  const values = { ...(def.values ?? {}) };
  if (def.delay) values.delay_turns = def.delay.turns;
  return effectTextValues(cardTextCtx(card, state, target), cardWalk(card), values);
}

export function renderCardText(card: CardRef, state: RunState | null, target: number | null = null): string {
  return renderTemplate(getCardDef(card.id, card.upgraded).text, cardTextValues(card, state, target));
}

export function renderCardTextParts(card: CardRef, state: RunState | null, target: number | null = null): TextPart[] {
  const def = getCardDef(card.id, card.upgraded);
  const values = { ...(def.values ?? {}) };
  if (def.delay) values.delay_turns = def.delay.turns;
  const base = effectTextValues(null, cardWalk(card), values);
  return templateParts(def.text, cardTextValues(card, state, target), base);
}

/** Per-hit damage numbers of a card's damage effects (effects, riposte, delay), as the card text shows them. */
export function computeDamagePreview(state: RunState, cardUid: number, target: number | null = null): number[] {
  const card = findCardAnywhere({ state, combat: state.combat }, cardUid);
  if (!card) throw new Error(`computeDamagePreview: no card ${cardUid}`);
  const values = cardTextValues(card, state, target);
  const keys: string[] = [];
  const collect = (list: readonly Effect[]): void => {
    for (const e of list) {
      if (e.type === 'damage') keys.push(e.key ?? 'damage');
      if (e.type === 'repeat' || e.type === 'on_beat' || e.type === 'spend_status' || e.type === 'shed') collect(e.effects);
      if (e.type === 'conditional') {
        collect(e.then);
        if (e.else) collect(e.else);
      }
      if (e.type === 'choose') for (const o of e.options) collect(o.effects);
    }
  };
  collect(cardWalk(card));
  const seen: Record<string, number> = {};
  return keys.map((k) => {
    const i = (seen[k] = (seen[k] ?? 0) + 1);
    const v = values[i === 1 ? k : `${k}${i}`];
    if (typeof v !== 'number') throw new Error(`damage preview for ${card.id}: value ${k} is ${String(v)}`);
    return v;
  });
}

// ---------------------------------------------------------------------------
// Other definitions

const playerFrame = (src: EffectFrame['src']): EffectFrame => ({ src, self: 'player', target: null, x: 0 });

export function renderRelicText(id: string, state: RunState | null = null): string {
  const def = getRelicDef(id);
  const ctx = state ? { state, frame: playerFrame({ kind: 'relic', id }) } : null;
  return renderTemplate(def.text, effectTextValues(ctx, triggerEffects(def.triggers), def.values));
}

export function renderStatusText(id: string, stacks: number, owner: EntityRef = 'player', state: RunState | null = null): string {
  const def = getStatusDef(id);
  const ctx: TextCtx | null = state ? { state, frame: { src: { kind: 'status', id, owner }, self: owner, target: null, x: 0 } } : null;
  return renderTemplate(def.text, effectTextValues(ctx, triggerEffects(def.triggers), { ...def.values, stacks }, stacks));
}

export function renderPotionText(id: string, state: RunState | null = null, target: number | null = null): string {
  const def = getPotionDef(id);
  const ctx = state ? { state, frame: { src: { kind: 'potion' as const, id }, self: 'player' as const, target, x: 0 } } : null;
  return renderTemplate(def.text, effectTextValues(ctx, def.effects, def.values));
}

export function renderEventText(eventId: string, page: string | null = null): string {
  const def = getEventDef(eventId);
  const text = page === null ? def.text : def.pages?.[page]?.text;
  if (text === undefined) throw new Error(`event ${eventId} has no page '${String(page)}'`);
  return renderTemplate(text, { ...(def.values ?? {}) });
}

export function renderEventOptionLabel(eventId: string, index: number, state: RunState | null = null, page: string | null = null): string {
  const def = getEventDef(eventId);
  const options = page === null ? def.options : def.pages?.[page]?.options;
  if (!options) throw new Error(`event ${eventId} has no page '${String(page)}'`);
  const opt = options[index];
  if (!opt) throw new Error(`event ${eventId} has no option ${index}`);
  const ctx = state ? { state, frame: playerFrame({ kind: 'event', id: eventId }) } : null;
  return renderTemplate(opt.label, effectTextValues(ctx, opt.effects, def.values));
}

export interface EventOptionView {
  label: string;
  enabled: boolean;
  /** Why it is disabled (null when enabled). */
  reason: string | null;
}

export function getEventOptions(state: RunState): EventOptionView[] {
  const ev = state.event;
  if (!ev) throw new Error('getEventOptions: no current event');
  const def = getEventDef(ev.id);
  const options = ev.page === null ? def.options : def.pages?.[ev.page]?.options;
  if (!options) throw new Error(`event ${ev.id} has no page '${ev.page}'`);
  return options.map((o, i) => {
    const r = o.available ? o.available({ state, combat: null }) : true;
    return { label: renderEventOptionLabel(ev.id, i, state, ev.page), enabled: r === true, reason: r === true ? null : r };
  });
}

export function renderBoonText(id: string, state: RunState | null = null): string {
  const def = getBoonDef(id);
  const ctx = state ? { state, frame: playerFrame({ kind: 'boon', id }) } : null;
  return renderTemplate(def.text, effectTextValues(ctx, def.effects, def.values));
}

export function renderRestOptionText(id: string): string {
  const def = getRestOptionDef(id);
  return renderTemplate(def.text, effectTextValues(null, def.effects, { ...(def.values ?? {}), shards: def.shardCost ?? 0 }));
}

/** Intent tooltip (MoveDef.text) with live numbers; null when the move has no text. */
export function renderMoveText(state: RunState, enemyUid: number, moveId: string): string | null {
  const combat = state.combat;
  if (!combat) throw new Error('renderMoveText outside combat');
  const e = getEnemy(combat, enemyUid);
  const def = getEnemyDef(e.id);
  const move = def.moves[moveId];
  if (!move) throw new Error(`enemy ${e.id} has no move '${moveId}'`);
  if (move.text === undefined) return null;
  const ctx: TextCtx = { state, frame: { src: { kind: 'enemy', uid: e.uid, id: e.id, moveId }, self: e.uid, target: 'player', x: 0 } };
  return renderTemplate(move.text, effectTextValues(ctx, move.effects, def.values));
}

// ---------------------------------------------------------------------------
// Keyword glossary (src/content/keywords.ts): rule numbers come from TUNING and the content
// tables at call time, so simulator overrides show up too.

/** Placeholder values available to keyword rules text. */
export function keywordTextValues(): Record<string, TextValue> {
  const beats = TUNING.cadence.beats;
  const beatList = beats.length <= 1 ? beats.join('') : `${beats.slice(0, -1).join(', ')} or ${beats[beats.length - 1] ?? ''}`;
  return {
    draw_per_turn: TUNING.drawPerTurn,
    hand_limit: TUNING.handLimit,
    onslaught_per_attack: TUNING.onslaught.perAttack,
    onslaught_cap: statusCap('onslaught'),
    embers_cap: statusCap('embers'),
    reserve_cap: statusCap('reserve'),
    reprise_max: TUNING.caps.reprise,
    exposed_cap: statusCap('exposed'),
    stagger_cap: statusCap('stagger'),
    rot_cap: statusCap('rot'),
    prime_base: TUNING.riposte.baseCapacity,
    prime_cap: TUNING.caps.primeCapacity,
    guard_cap: TUNING.caps.guard,
    bloom_cap: TUNING.caps.bloom,
    bloom_ripe: TUNING.bloomRipe,
    prune_away_cap: TUNING.caps.pruneAwayPerTurn,
    beats: beatList,
    timeline_cap: TUNING.caps.timeline,
    advance_cap: TUNING.caps.advancePerTurn,
    delay_max: TUNING.caps.delayMax,
    augury_depth: TUNING.augury.depth,
    shard_cap: TUNING.shards.cap,
    skip_shards: TUNING.shards.skipReward,
    skip_boss_shards: TUNING.shards.skipBossRelic,
    backlash_per: TUNING.backlashPerStack,
    purge_shards: restShardCost('rest_purge'),
    transmute_shards: restShardCost('rest_transmute'),
    transmute_offers: TUNING.transmute.offers,
  };
}

function statusCap(id: string): number {
  const cap = TUNING.caps.status[id];
  if (cap === undefined) throw new Error(`keyword text: TUNING.caps.status has no '${id}'`);
  return cap;
}

function restShardCost(id: string): number {
  const cost = getRestOptionDef(id).shardCost;
  if (cost === undefined) throw new Error(`keyword text: rest option '${id}' has no shardCost`);
  return cost;
}

/** A glossary entry's rules text with live rule numbers. Throws on an unknown keyword or placeholder. */
export function renderKeywordText(id: string): string {
  const k = getKeyword(id);
  if (id.startsWith(CARD_KEYWORD_PREFIX)) return renderCardText({ id: id.slice(CARD_KEYWORD_PREFIX.length), upgraded: false }, null);
  return renderTemplate(k.text, keywordTextValues());
}
