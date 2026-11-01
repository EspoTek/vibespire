// Effect DSL interpreter.
//
// execEffect runs ONE effect. Compound effects (multi-hit damage, repeat, conditional, on_beat,
// spend_status) expand by queueing their parts, which land at the front of the queue (they resolve
// before anything queued earlier). Effects that need a player decision open a PendingChoice and the
// queue suspends. Amounts are resolved at execution time with resolveAmount(preview=false); text
// uses the same resolver with preview=true.

import {
  getBoonDef,
  getCardDef,
  getEnemyDef,
  getEventDef,
  getPotionDef,
  getRelicDef,
  getRestOptionDef,
  getStatusDef,
} from '../content';
import { execBloom, deckBloomCards, execPrune } from './bloom';
import { capHit, takeBudget } from './caps';
import {
  addCardToCombat,
  bloomCapFor,
  bloomOf,
  cardDef,
  discardFromHand,
  drawCards,
  effectiveBloomOf,
  exhaustCards,
  findCardAnywhere,
  isBloomCard,
  isRipe,
  isUpgradable,
  matchesFilter,
  putIntoHand,
  takeFrom,
  upgradeCard,
} from './cards';
import { autoplayCard, nextBeat, triageKeepKey } from './combat';
import {
  alliesOf,
  blockOf,
  emit,
  enqueue,
  getEnemy,
  guardOf,
  hpOf,
  isAlive,
  livingEnemies,
  opponentsOf,
  requireCombat,
  setBlock,
  setGuard,
  stacksOf,
  type Env,
} from './core';
import { effectItems, makeEffectCtx } from './ctx';
import { dealDamage, gainDefence, heal, loseHp } from './damage';
import { addToDeck, isBound, removeFromDeck, transformInDeck, upgradableDeckCards, upgradeInDeck } from './deck';
import { computeIntent, haltEnemy, isAttackIntent, rerollForecasts, riposteWillTrigger, summon, transformEnemy } from './enemies';
import { classCardPool, colorlessPool, gainPotion, gainRelic, rollPotion, rollRelicOrNull } from './items';
import { openChoice } from './queue';
import { primeFromHand } from './riposte';
import {
  execDuplicate,
  execGamble,
  execLosePotion,
  execLoseRelic,
  execOfferCards,
  execStartCombat,
  execTransmute,
  gainShards,
  runFlag,
  shardsOf,
} from './runeffects';
import { pickFrom, shuffleInPlace } from './rng';
import { applyStatus, dispatch, playerRule, setStatusStacks } from './statuses';
import { advance, chorusPreview, gather, postpone, scheduleFromHand } from './timeline';
import { renderTemplate, effectTextValues } from './text';
import { TUNING } from './tuning';
import type {
  Amount,
  AmountCtx,
  AmountScale,
  CardInstance,
  Condition,
  DslTables,
  Effect,
  EffectFrame,
  EffectSource,
  EnemyState,
  EntityRef,
  Intent,
  RelicState,
  RunState,
  TargetSpec,
} from './types';

// ---------------------------------------------------------------------------
// Amounts, conditions, sources

export function amountCtx(state: RunState, frame: EffectFrame, preview: boolean): AmountCtx {
  return { state, combat: state.combat, frame, preview, nextBeat: () => nextBeat(state) };
}

/** value = floor(base + per * scale). 'X' = frame.x. */
export function resolveAmount(ctx: AmountCtx, a: Amount): number {
  if (typeof a === 'number') return a;
  if (a === 'X') return ctx.frame.x;
  // base/per are optional with documented defaults 0 / 1.
  return Math.floor((a.base ?? 0) + (a.per ?? 1) * scaleValue(ctx, a.scale));
}

function targetEnemyUid(ctx: AmountCtx, what: string): number {
  const t = ctx.frame.target;
  if (t === null || t === 'player') throw new Error(`${what} needs an enemy target`);
  return t;
}

function intentDamage(i: Intent): number {
  return !i.hidden && isAttackIntent(i) && i.damage !== undefined ? i.damage * (i.hits ?? 1) : 0;
}

/** The enemy's current intent with numbers re-computed from the current state (stored intents refresh only between actions). */
function liveIntent(state: RunState, e: EnemyState): Intent {
  if (e.intent.hidden === true || !isAttackIntent(e.intent) || e.intent.moveId === '') return e.intent;
  return computeIntent(state, e, e.intent.moveId);
}

/** RULINGS 27: attack damage of the current intent / of all forecast entries (hidden = 0), for the target or all enemies. */
function enemyDamageScale(ctx: AmountCtx, which: 'intent' | 'forecast', who: 'target' | 'all'): number {
  const c = requireCombat(ctx, `${which}_damage`);
  const enemies = who === 'all' ? livingEnemies(c) : [getEnemy(c, targetEnemyUid(ctx, `${which}_damage`))];
  let total = 0;
  for (const e of enemies) {
    if (!e.alive) continue;
    // The current intent is re-computed live, so a status applied earlier in this action (Goad) counts.
    total += which === 'intent' ? intentDamage(liveIntent(ctx.state, e)) : e.forecast.reduce((a, i) => a + intentDamage(i), 0);
  }
  return total;
}

/** Status cards in hand + draw + discard (not the Scrapheap). */
function statusCardCount(ctx: AmountCtx): number {
  const c = requireCombat(ctx, 'player_status_cards');
  return [...c.hand, ...c.draw, ...c.discard].filter((x) => cardDef(x).type === 'status').length;
}

/** Shared v2 H21: extra beats the beat_index scale counts on the beat (Conductor's Baton). */
function beatIndexBonus(state: RunState): number {
  return playerRule(state, 0, (m, c, a) => a + (m.beatIndexBonus ? m.beatIndexBonus(c) : 0));
}

export function scaleValue(ctx: AmountCtx, scale: AmountScale): number {
  const { state, frame } = ctx;
  if (typeof scale === 'object') {
    if ('status' in scale) {
      const who = scale.of === 'target' ? frame.target : frame.self;
      if (who === null) throw new Error(`amount scale {status:${scale.status}} of target, but no target`);
      return stacksOf(state, who, scale.status);
    }
    if ('cardVar' in scale) {
      if (frame.src.kind !== 'card') throw new Error(`amount scale cardVar '${scale.cardVar}' outside a card`);
      const card = findCardAnywhere(ctx, frame.src.uid);
      if (!card) throw new Error(`amount scale cardVar: card ${frame.src.uid} not found`);
      // Bloom numbers read the effective Bloom (Rootstock); Graft v2 §7 H6.
      if (scale.cardVar === 'bloom') return effectiveBloomOf(state, card);
      // A var that was never set is 0 (vars start empty).
      return card.vars?.[scale.cardVar] ?? 0;
    }
    if ('forecast_damage' in scale) return enemyDamageScale(ctx, 'forecast', scale.forecast_damage);
    if ('intent_damage' in scale) return enemyDamageScale(ctx, 'intent', scale.intent_damage);
    if ('ai' in scale) {
      if (typeof frame.self !== 'number') throw new Error(`amount scale ai:${scale.ai} outside an enemy`);
      // An aiState key that was never set is 0.
      return getEnemy(requireCombat(ctx, 'ai scale'), frame.self).aiState[scale.ai] ?? 0;
    }
    const fn = sourceTables(frame.src).amounts?.[scale.fn];
    if (!fn) throw new Error(`amount fn '${scale.fn}' not defined on ${describeSource(frame.src)}`);
    return fn(ctx);
  }
  switch (scale) {
    case 'x':
      return frame.x;
    case 'stacks': {
      if (frame.src.kind !== 'status') throw new Error(`amount scale 'stacks' outside a status (${describeSource(frame.src)})`);
      return stacksOf(state, frame.src.owner, frame.src.id);
    }
    case 'cards_in_hand':
      return requireCombat(ctx, 'cards_in_hand').hand.length;
    case 'cards_in_draw':
    case 'player_draw_pile':
      return requireCombat(ctx, 'cards_in_draw').draw.length;
    case 'cards_in_discard':
      return requireCombat(ctx, 'cards_in_discard').discard.length;
    case 'cards_in_exhaust':
      return requireCombat(ctx, 'cards_in_exhaust').exhaust.length;
    case 'cards_played_this_turn':
      return requireCombat(ctx, 'cards_played_this_turn').cardsPlayedThisTurn.length;
    case 'attacks_played_this_turn':
      return requireCombat(ctx, 'attacks_played_this_turn').attacksPlayedThisTurn;
    case 'beat_count': {
      const c = requireCombat(ctx, 'beat_count');
      return c.cardsPlayedThisTurn.length + (c.counters.beatOffset ?? 0);
    }
    case 'enemies_alive':
      return livingEnemies(requireCombat(ctx, 'enemies_alive')).length;
    case 'block':
      return blockOf(state, frame.self);
    case 'guard':
      return guardOf(state, frame.self);
    case 'defence':
      return blockOf(state, frame.self) + guardOf(state, frame.self);
    case 'gold':
      return state.player.gold;
    case 'shards':
      return shardsOf(state);
    case 'hp':
      return hpOf(state, frame.self).hp;
    case 'max_hp':
      return hpOf(state, frame.self).maxHp;
    case 'missing_hp': {
      const h = hpOf(state, frame.self);
      return h.maxHp - h.hp;
    }
    case 'deck_size':
      return state.player.deck.length;
    case 'timeline_count':
      return requireCombat(ctx, 'timeline_count').timeline.length;
    case 'chorus': {
      // H1: stamped on the frame by resolveEntry. Card text previews count the entries landing with it.
      if (frame.chorus !== undefined) return frame.chorus;
      if (!ctx.preview) throw new Error(`amount scale 'chorus' outside a Timeline resolution (${describeSource(frame.src)})`);
      if (frame.src.kind !== 'card') return 0;
      return chorusPreview(state, frame.src.uid, getCardDef(frame.src.id, frame.src.upgraded));
    }
    case 'beat_index': {
      // H4: stamped on the play's frame (Crescendo). Previews ask where the next play would land.
      if (frame.beatIndex !== undefined) return frame.onBeat === true && frame.beatIndex > 0 ? frame.beatIndex + beatIndexBonus(state) : 0;
      if (!ctx.preview) {
        if (frame.onBeat === true) throw new Error(`amount scale 'beat_index' on an on-beat frame without a stamped index (${describeSource(frame.src)})`);
        return 0;
      }
      const nb = nextBeat(state);
      return nb.onBeat ? nb.positions.indexOf(nb.count) + 1 + beatIndexBonus(state) : 0;
    }
    case 'primed_count':
      return requireCombat(ctx, 'primed_count').primed.length;
    case 'trigger_hits':
      if (frame.hits === undefined) throw new Error("amount scale 'trigger_hits' outside a Riposte trigger");
      return frame.hits;
    case 'spent':
      if (frame.spent === undefined) throw new Error("amount scale 'spent' outside spend_status");
      return frame.spent;
    case 'shed':
      if (frame.shed === undefined) throw new Error("amount scale 'shed' outside a shed effect");
      return frame.shed;
    case 'scrapped':
      if (frame.scrapped === undefined) throw new Error("amount scale 'scrapped' outside an exhaust `then` list");
      return frame.scrapped;
    case 'strained_this_combat':
      // Nothing Strained yet this combat = 0 (the counter starts absent).
      return requireCombat(ctx, 'strained_this_combat').counters.strained ?? 0;
    case 'energy':
      return requireCombat(ctx, 'energy scale').energy;
    case 'bloom_cards_in_deck':
      return deckBloomCards(state).length;
    case 'bloom_total_in_deck':
      return deckBloomCards(state).reduce((a, c) => a + bloomOf(c), 0);
    case 'bloom_max_in_deck':
      return Math.max(0, ...deckBloomCards(state).map(bloomOf));
    case 'forecast_damage':
      return enemyDamageScale(ctx, 'forecast', 'target');
    case 'intent_damage':
      return enemyDamageScale(ctx, 'intent', 'target');
    case 'rot_on_target':
      return stacksOf(state, targetEnemyUid(ctx, 'rot_on_target'), 'rot');
    case 'player_status_cards':
      return statusCardCount(ctx);
    case 'best_card_damage_this_turn':
      return requireCombat(ctx, 'best_card_damage_this_turn').counters.bestCardDamage ?? 0;
    case 'triggered_riposte': {
      if (typeof frame.self !== 'number') throw new Error("amount scale 'triggered_riposte' outside an enemy");
      const c = requireCombat(ctx, 'triggered_riposte');
      if (ctx.preview && c.turnPhase === 'player') return riposteWillTrigger(state, frame.self) ? 1 : 0;
      return c.counters.riposteThisMove ?? 0;
    }
  }
}

export function evalCondition(ctx: AmountCtx, cond: Condition): boolean {
  const { state, frame } = ctx;
  switch (cond.type) {
    case 'has_status': {
      const who = cond.who === 'target' ? frame.target : frame.self;
      if (who === null) throw new Error(`condition has_status(${cond.id}) on target, but no target`);
      return stacksOf(state, who, cond.id) >= (cond.min ?? 1);
    }
    case 'target_intends_attack': {
      const e = getEnemy(requireCombat(ctx, 'target_intends_attack'), targetEnemyUid(ctx, 'target_intends_attack'));
      return e.alive && isAttackIntent(e.intent);
    }
    case 'target_dead': {
      if (frame.target === null) throw new Error('condition target_dead without a target');
      return !isAlive(state, frame.target);
    }
    case 'hp_below_pct': {
      const who = cond.who === 'target' ? frame.target : frame.self;
      if (who === null) throw new Error('condition hp_below_pct on target, but no target');
      const { hp, maxHp } = hpOf(state, who);
      return hp * 100 < cond.pct * maxHp;
    }
    case 'compare': {
      const l = resolveAmount(ctx, cond.left);
      const r = resolveAmount(ctx, cond.right);
      switch (cond.op) {
        case '>=':
          return l >= r;
        case '<=':
          return l <= r;
        case '>':
          return l > r;
        case '<':
          return l < r;
        case '==':
          return l === r;
        case '!=':
          return l !== r;
      }
      throw new Error('unreachable compare op');
    }
    case 'on_beat':
      return frame.onBeat === true;
    case 'forecast_is_attack': {
      const c = requireCombat(ctx, 'forecast_is_attack');
      const at = (uid: number): boolean => {
        const e = getEnemy(c, uid);
        const intent = cond.depth === 0 ? e.intent : e.forecast[cond.depth - 1];
        return e.alive && intent !== undefined && !intent.hidden && isAttackIntent(intent);
      };
      if (cond.who === 'target') return at(targetEnemyUid(ctx, 'forecast_is_attack'));
      const uids = livingEnemies(c).map((e) => e.uid);
      return cond.who === 'any' ? uids.some(at) : uids.length > 0 && uids.every(at);
    }
    case 'pruned_type': {
      const last = requireCombat(ctx, 'pruned_type').lastPrune;
      if (!last) return false;
      return Array.isArray(cond.cardType) ? cond.cardType.includes(last.type) : last.type === cond.cardType;
    }
    case 'timeline_nonempty':
      return requireCombat(ctx, 'timeline_nonempty').timeline.length > 0;
    case 'removed_self': {
      if (frame.src.kind !== 'card') throw new Error('condition removed_self outside a card');
      const uid = frame.src.uid;
      return !state.player.deck.some((c) => c.uid === uid);
    }
    case 'is_class':
      return state.classId === cond.cls;
    case 'ripe': {
      if (frame.src.kind !== 'card') throw new Error('condition ripe outside a card');
      const card = findCardAnywhere(ctx, frame.src.uid);
      if (!card) throw new Error(`condition ripe: card ${frame.src.uid} not found`);
      return isRipe(state, card);
    }
    case 'not':
      return !evalCondition(ctx, cond.cond);
    case 'all':
      return cond.conds.every((c) => evalCondition(ctx, c));
    case 'any':
      return cond.conds.some((c) => evalCondition(ctx, c));
    case 'fn': {
      const fn = sourceTables(frame.src).conditions?.[cond.fn];
      if (!fn) throw new Error(`condition fn '${cond.fn}' not defined on ${describeSource(frame.src)}`);
      return fn(ctx);
    }
  }
}

/** The definition (with its custom/amounts/conditions/values tables) behind an effect source. */
export function sourceTables(src: EffectSource): DslTables {
  switch (src.kind) {
    case 'card':
      return getCardDef(src.id, src.upgraded);
    case 'relic':
      return getRelicDef(src.id);
    case 'potion':
      return getPotionDef(src.id);
    case 'enemy':
      return getEnemyDef(src.id);
    case 'status':
      return getStatusDef(src.id);
    case 'event':
      return getEventDef(src.id);
    case 'boon':
      return getBoonDef(src.id);
    case 'rest': {
      if (src.relic === undefined) return getRestOptionDef(src.id);
      const opt = getRelicDef(src.relic).restOption;
      if (!opt || opt.id !== src.id) throw new Error(`relic ${src.relic} has no rest option '${src.id}'`);
      return opt;
    }
    case 'system':
      return {};
  }
}

export function describeSource(src: EffectSource): string {
  switch (src.kind) {
    case 'card':
      return `card ${src.id}#${src.uid}`;
    case 'enemy':
      return `enemy ${src.id}#${src.uid}`;
    case 'status':
      return `status ${src.id}`;
    case 'system':
      return 'system';
    default:
      return `${src.kind} ${src.id}`;
  }
}

function liveSource(state: RunState, src: EffectSource): { stacks: number; relic: RelicState | null } {
  if (src.kind === 'status') return { stacks: stacksOf(state, src.owner, src.id), relic: null };
  if (src.kind === 'relic') return { stacks: 0, relic: state.player.relics.find((r) => r.id === src.id) ?? null };
  return { stacks: 0, relic: null };
}

function sourceCard(state: RunState, src: EffectSource): CardInstance | null {
  if (src.kind !== 'card') return null;
  return findCardAnywhere({ state, combat: state.combat }, src.uid);
}

function frameTags(frame: EffectFrame, extra: readonly string[] = []): string[] {
  const tags = [...extra];
  if (frame.delayed) tags.push('delayed');
  if (frame.riposte) tags.push('riposte');
  return tags;
}

// ---------------------------------------------------------------------------
// Targets

export function resolveTargets(env: Env, spec: TargetSpec, frame: EffectFrame): EntityRef[] {
  const s = env.state;
  switch (spec) {
    case 'self':
      return isAlive(s, frame.self) || frame.self === 'player' ? [frame.self] : [];
    case 'target':
    case 'attacker':
      if (frame.target === null) throw new Error(`effect targets '${spec}' but ${describeSource(frame.src)} has no target`);
      return isAlive(s, frame.target) ? [frame.target] : [];
    case 'all_enemies':
      return opponentsOf(s, frame.self);
    case 'random_enemy': {
      const opp = opponentsOf(s, frame.self);
      return opp.length ? [pickFrom(s.rng.misc, opp)] : [];
    }
    case 'all_allies':
      return alliesOf(s, frame.self);
    case 'leftmost_enemy': {
      const opp = opponentsOf(s, frame.self);
      return opp.length ? [opp[0] as EntityRef] : [];
    }
    case 'lowest_hp_enemy': {
      const opp = opponentsOf(s, frame.self);
      if (!opp.length) return [];
      let best = opp[0] as EntityRef;
      for (const o of opp) if (hpOf(s, o).hp < hpOf(s, best).hp) best = o;
      return [best];
    }
  }
}

/** Exactly one of the mode flags must be set. */
function modeOf<M extends 'random' | 'choose' | 'all' | 'self'>(e: Partial<Record<M, boolean>>, allowed: readonly M[], what: string): M {
  const set = allowed.filter((m) => e[m] === true);
  if (set.length !== 1) throw new Error(`${what}: exactly one of ${allowed.join('/')} must be true`);
  const m = set[0];
  if (m === undefined) throw new Error('unreachable');
  return m;
}

function pickRandom<T>(state: RunState, items: readonly T[], n: number): T[] {
  return shuffleInPlace(state.rng.misc, [...items]).slice(0, n);
}

function selfEnemy(frame: EffectFrame, what: string): number {
  if (typeof frame.self !== 'number') throw new Error(`${what} must come from an enemy`);
  return frame.self;
}

// ---------------------------------------------------------------------------
// Interpreter

export function execEffect(env: Env, effect: Effect, frame: EffectFrame): void {
  const s = env.state;
  const amt = (a: Amount): number => resolveAmount(amountCtx(s, frame, false), a);
  switch (effect.type) {
    case 'damage': {
      requireCombat(s, 'damage effect');
      const times = effect.times === undefined ? 1 : amt(effect.times);
      if (times <= 0) return;
      if (times > 1) {
        const hit: Effect = { ...effect, times: 1 };
        enqueue(env, effectItems(Array.from({ length: times }, () => hit), frame));
        return;
      }
      const card = sourceCard(s, frame.src);
      const tags = frameTags(frame, effect.tags);
      const targets = resolveTargets(env, effect.target, frame);
      // H9 perTarget: each hit enemy is the frame target for its own amount (Eye of the Storm reads each intent).
      const shared = effect.perTarget === true ? 0 : amt(effect.amount);
      for (const target of targets) {
        const base = effect.perTarget === true ? resolveAmount(amountCtx(s, { ...frame, target }, false), effect.amount) : shared;
        dealDamage(env, { source: frame.self, target, base, card, tags, ignoreBlock: effect.ignoreBlock === true });
      }
      return;
    }
    case 'block':
    case 'guard': {
      const base = amt(effect.amount);
      const targets = effect.target === 'all_allies' ? alliesOf(s, frame.self) : resolveTargets(env, 'self', frame);
      for (const t of targets) gainDefence(env, t, base, effect.type, frameTags(frame));
      return;
    }
    case 'lose_defence': {
      requireCombat(s, 'lose_defence');
      const who = frame.self;
      const take = (have: number): number => (effect.amount === 'all' ? have : Math.min(have, Math.max(0, amt(effect.amount))));
      if (effect.pool !== 'guard') {
        const b = blockOf(s, who);
        const lost = take(b);
        if (lost > 0) {
          setBlock(s, who, b - lost);
          emit(env, { t: 'block_lost', target: who, amount: lost });
        }
      }
      if (effect.pool !== 'block') {
        const g = guardOf(s, who);
        const lost = take(g);
        if (lost > 0) {
          setGuard(s, who, g - lost);
          emit(env, { t: 'guard_decay', target: who, lost, now: g - lost });
        }
      }
      return;
    }
    case 'lose_guard': {
      requireCombat(s, 'lose_guard');
      const g = guardOf(s, frame.self);
      const lost = effect.amount === 'all' ? g : effect.amount === 'half' ? Math.floor(g / 2) : Math.min(g, Math.max(0, amt(effect.amount)));
      if (lost > 0) {
        setGuard(s, frame.self, g - lost);
        emit(env, { t: 'guard_decay', target: frame.self, lost, now: g - lost });
      }
      return;
    }
    case 'draw': {
      const n = Math.max(0, amt(effect.n));
      if (effect.nextTurn === true || requireCombat(s, 'draw effect').turnPhase !== 'player') return bankNextTurn(env, n, 0);
      drawCards(env, n, true);
      return;
    }
    case 'discard': {
      const combat = requireCombat(s, 'discard effect');
      const mode = modeOf(effect, ['random', 'choose', 'all'], 'discard');
      const hand = combat.hand.map((c) => c.uid);
      if (mode === 'all') return discardFromHand(env, hand);
      const n = Math.min(amt(effect.n ?? 1), hand.length);
      if (n <= 0) return;
      if (mode === 'random') return discardFromHand(env, pickRandom(s, hand, n));
      if (n >= hand.length) return discardFromHand(env, hand);
      openChoice(env, { kind: 'cards', prompt: `Discard ${n} card${n > 1 ? 's' : ''}.`, from: 'hand', choices: hand, labels: [], offers: [], min: n, max: n, resume: { op: 'discard' } });
      return;
    }
    case 'exhaust': {
      const combat = requireCombat(s, 'exhaust effect');
      const mode = modeOf(effect, ['random', 'choose', 'all', 'self'], 'exhaust');
      if (mode === 'self') {
        if (frame.src.kind !== 'card') throw new Error('exhaust self outside a card');
        const uid = frame.src.uid;
        if (combat.hand.some((c) => c.uid === uid)) exhaustCards(env, 'hand', [uid]);
        else if (combat.inPlay.some((c) => c.uid === uid)) exhaustCards(env, 'inPlay', [uid]);
        return;
      }
      const pile = (effect.from === 'hand' ? combat.hand : combat.discard).filter((c) => matchesFilter(cardDef(c), effect.filter)).map((c) => c.uid);
      // Shared v2: a `then` list runs after the Scrap, with scale 'scrapped'.
      const scrapThen = (uids: readonly number[]): void => {
        const done = exhaustCards(env, effect.from, uids);
        if (effect.then) enqueue(env, effectItems(effect.then, { ...frame, scrapped: done.length }));
      };
      if (mode === 'all') return scrapThen(pile);
      const n = Math.min(amt(effect.n ?? 1), pile.length);
      if (n <= 0) return scrapThen([]);
      if (mode === 'random') return scrapThen(pickRandom(s, pile, n));
      if (n >= pile.length && effect.upTo !== true) return scrapThen(pile);
      const resume = effect.then ? { op: 'exhaust_then' as const, from: effect.from, then: effect.then, frame } : { op: 'exhaust' as const, from: effect.from };
      openChoice(env, { kind: 'cards', prompt: `Scrap ${effect.upTo === true ? 'up to ' : ''}${n} card${n > 1 ? 's' : ''}.`, from: effect.from, choices: pile, labels: [], offers: [], min: effect.upTo === true ? 0 : n, max: n, resume });
      return;
    }
    case 'energy': {
      const combat = requireCombat(s, 'energy effect');
      let n = amt(effect.n);
      // Gains outside the player's turn (or marked nextTurn) are banked; losses always apply now.
      if (n > 0 && (effect.nextTurn === true || combat.turnPhase !== 'player')) return bankNextTurn(env, 0, n);
      if (n > 0) n = takeBudget(env, 'bonusEnergy', TUNING.caps.bonusEnergy, 'cap_bonus_energy', n);
      const before = combat.energy;
      combat.energy = Math.max(0, combat.energy + n);
      if (combat.energy !== before) emit(env, { t: 'energy', delta: combat.energy - before, now: combat.energy });
      return;
    }
    case 'status': {
      const shared = effect.perTarget === true ? 0 : amt(effect.amount);
      for (const t of resolveTargets(env, effect.target, frame)) {
        // Shared v2 perTarget: each target is the frame target for its own amount (Fracture Serum doubles each enemy's Exposed).
        const n = effect.perTarget === true ? resolveAmount(amountCtx(s, { ...frame, target: t }, false), effect.amount) : shared;
        const before = stacksOf(s, t, effect.id);
        applyStatus(env, t, effect.id, n);
        // H10: the player's statuses and relics hear about stacks they put on an enemy (Squall Line).
        const gained = stacksOf(s, t, effect.id) - before;
        if (frame.self === 'player' && t !== 'player' && gained > 0) dispatch(env, 'onStatusInflicted', 'player', { target: t, id: effect.id, amount: gained }, t);
      }
      return;
    }
    case 'heal': {
      const n = amt(effect.amount);
      for (const t of resolveTargets(env, effect.target ?? 'self', frame)) heal(env, t, n);
      return;
    }
    case 'lose_hp': {
      const n = amt(effect.amount);
      for (const t of resolveTargets(env, effect.target ?? 'self', frame)) loseHp(env, t, n, frame.self);
      return;
    }
    case 'max_hp': {
      const n = amt(effect.amount);
      const p = s.player;
      const before = p.maxHp;
      p.maxHp = Math.max(1, p.maxHp + n);
      if (n > 0) p.hp += p.maxHp - before;
      p.hp = Math.min(p.hp, p.maxHp);
      if (p.maxHp !== before) emit(env, { t: 'max_hp', delta: p.maxHp - before, now: p.maxHp });
      return;
    }
    case 'add_card': {
      const n = amt(effect.n ?? 1);
      for (let i = 0; i < n; i++) {
        if (effect.to === 'deck') {
          const added = addToDeck(env, effect.card, effect.upgraded === true, 'other');
          if (effect.bloom !== undefined) setNewCopyBloom(env, added, amt(effect.bloom));
        } else addCardToCombat(env, effect.card, effect.to, { upgraded: effect.upgraded === true, costThisTurn: effect.costThisTurn, position: effect.position ?? 'random' });
      }
      return;
    }
    case 'upgrade':
      return execUpgrade(env, effect, amt(effect.n ?? 1));
    case 'scry': {
      const combat = requireCombat(s, 'scry effect');
      const k = Math.min(amt(effect.n), combat.draw.length);
      if (k <= 0) return;
      const top = combat.draw.slice(-k).reverse().map((c) => c.uid);
      openChoice(env, { kind: 'cards', prompt: `Scry ${k}: choose cards to discard.`, from: 'draw', choices: top, labels: [], offers: [], min: 0, max: k, resume: { op: 'scry' } });
      return;
    }
    case 'gold': {
      // "Lose N gold" effects (curses, enemy thefts) take what you have: a loss clamps at 0 gold.
      // Costs the player chooses (shop prices, event options) are gated by legality/`available` and use gainGold directly.
      const n = amt(effect.amount);
      gainGold(env, n < 0 ? -Math.min(-n, env.state.player.gold) : n);
      return;
    }
    case 'remove_card':
      return execRemove(env, effect, frame, amt(effect.n ?? 1));
    case 'transform_card': {
      const mode = modeOf(effect, ['random', 'choose'], 'transform_card');
      const deck = s.player.deck.filter((c) => !isBound(c)).map((c) => c.uid);
      const n = Math.min(amt(effect.n ?? 1), deck.length);
      if (n <= 0) return;
      if (mode === 'random') {
        for (const uid of pickRandom(s, deck, n)) transformInDeck(env, uid);
        return;
      }
      openChoice(env, { kind: 'cards', prompt: `Transform ${n} card${n > 1 ? 's' : ''}.`, from: 'deck', choices: deck, labels: [], offers: [], min: n, max: n, resume: { op: 'transform_deck' } });
      return;
    }
    case 'gain_relic': {
      if (effect.id !== undefined) return gainRelic(env, effect.id);
      const id = rollRelicOrNull(s, s.rng.reward, effect.rarity);
      if (id === null) emit(env, { t: 'text', text: 'No relic left to find.' });
      else gainRelic(env, id);
      return;
    }
    case 'gain_potion':
      gainPotion(env, effect.id ?? rollPotion(s, s.rng.reward));
      return;
    case 'potion_slots': {
      const p = s.player;
      p.potionSlots = Math.max(0, p.potionSlots + effect.n);
      if (p.potions.length > p.potionSlots) p.potions.length = p.potionSlots;
      return;
    }
    case 'choose': {
      if (effect.options.length === 0) throw new Error(`choose with no options (${describeSource(frame.src)})`);
      const ctx = amountCtx(s, frame, false);
      const offered = effect.options.map((o, i) => ({ o, i })).filter(({ o }) => o.if === undefined || evalCondition(ctx, o.if));
      if (offered.length === 0) return;
      const values = sourceTables(frame.src).values;
      openChoice(env, {
        kind: 'options',
        prompt: effect.prompt,
        from: null,
        choices: offered.map(({ i }) => i),
        labels: offered.map(({ o }) => renderTemplate(o.label, effectTextValues({ state: s, frame }, o.effects, values))),
        offers: [],
        min: 1,
        max: 1,
        resume: { op: 'options', options: effect.options.map((o) => o.effects), frame },
      });
      return;
    }
    case 'repeat': {
      const n = amt(effect.times);
      const items = [];
      for (let i = 0; i < n; i++) items.push(...effectItems(effect.effects, frame));
      enqueue(env, items);
      return;
    }
    case 'conditional': {
      const ok = evalCondition(amountCtx(s, frame, false), effect.if);
      enqueue(env, effectItems(ok ? effect.then : (effect.else ?? []), frame));
      return;
    }
    case 'custom': {
      const fn = sourceTables(frame.src).custom?.[effect.fn];
      if (!fn) throw new Error(`custom fn '${effect.fn}' not defined on ${describeSource(frame.src)}`);
      const live = liveSource(s, frame.src);
      fn(makeEffectCtx(env, { source: frame.src, owner: frame.self, stacks: live.stacks, relic: live.relic, target: frame.target, card: sourceCard(s, frame.src), x: frame.x }));
      return;
    }
    // --- GDD §9.8
    case 'spend_status': {
      const have = stacksOf(s, frame.self, effect.id);
      const n = effect.n === 'all' ? Math.max(0, have) : effect.n;
      if (effect.n !== 'all' && (n <= 0 || have < n)) return;
      if (n > 0) setStatusStacks(env, frame.self, effect.id, have - n);
      // Clause first (it lands at the front of the queue), then the onStatusSpent listeners' effects.
      enqueue(env, effectItems(effect.effects, { ...frame, spent: n }));
      if (n > 0) dispatch(env, 'onStatusSpent', frame.self, { id: effect.id, amount: n });
      return;
    }
    case 'shed': {
      requireCombat(s, 'shed');
      if (frame.self !== 'player') throw new Error(`shed is player-only (${describeSource(frame.src)})`);
      const g = guardOf(s, 'player');
      const n = effect.n === 'all' ? g : effect.n;
      if (effect.n !== 'all' && (n <= 0 || g < n)) return;
      if (n > 0) {
        setGuard(s, 'player', g - n);
        emit(env, { t: 'guard_shed', target: 'player', amount: n, now: g - n });
      }
      enqueue(env, effectItems(effect.effects, { ...frame, shed: n }));
      if (n > 0) dispatch(env, 'onGuardShed', 'player', { amount: n });
      return;
    }
    case 'bloom':
      execBloom(env, amt(effect.amount), effect.target, sourceCard(s, frame.src));
      return;
    case 'prune':
      execPrune(env, { bloom: effect.bloom ?? 1, variant: effect.variant ?? 'standard', bonusIf: effect.bonusIf ?? null }, frame);
      return;
    case 'advance':
      advance(env, effect.n);
      return;
    case 'postpone':
      postpone(env, effect.n);
      return;
    case 'on_beat': {
      if (frame.onBeat !== true) return;
      const card = sourceCard(s, frame.src);
      const repeats = Math.min(TUNING.caps.onBeatRuns, Math.max(1, playerRule(s, 1, (m, c, a) => (m.onBeatRepeats ? m.onBeatRepeats(c, card, a) : a), false)));
      const items = [];
      for (let i = 0; i < repeats; i++) items.push(...effectItems(effect.effects, frame));
      enqueue(env, items);
      return;
    }
    case 'fetch_card':
      return execFetch(env, effect, amt(effect.n ?? 1));
    case 'shards':
      gainShards(env, amt(effect.amount));
      return;
    case 'transmute':
      execTransmute(env, effect.n ?? 1, effect.upTo === true, effect.offers ?? TUNING.transmute.offers, effect.rarity ?? null, effect.upgrade === true);
      return;
    case 'offer_cards':
      execOfferCards(env, effect.pool, effect.rarity, effect.n, effect.upgraded === true);
      return;
    case 'duplicate_card':
      execDuplicate(env, effect.from ?? 'deck', effect.filter);
      return;
    case 'lose_potion':
      execLosePotion(env);
      return;
    case 'lose_relic':
      execLoseRelic(env, effect.notStarter === true);
      return;
    case 'start_combat':
      execStartCombat(env, effect.encounterId, effect.onWin ?? []);
      return;
    case 'gamble':
      execGamble(env, effect.outcomes, frame);
      return;
    case 'run_flag':
      runFlag(env, effect.key, effect.delta);
      return;
    case 'autoplay': {
      const n = amt(effect.n ?? 1);
      for (let i = 0; i < n; i++) autoplayCard(env, effect.from, frame);
      return;
    }
    // --- ENEMIES §5
    case 'summon':
      summon(env, selfEnemy(frame, 'summon'), effect);
      return;
    case 'transform':
      transformEnemy(env, selfEnemy(frame, 'transform'), effect.into);
      return;
    case 'reroll_forecast':
      rerollForecasts(env, selfEnemy(frame, 'reroll_forecast'), effect.target);
      return;
    case 'ai_state': {
      const e = getEnemy(requireCombat(s, 'ai_state'), selfEnemy(frame, 'ai_state'));
      // An aiState key that was never set is 0.
      const was = e.aiState[effect.key] ?? 0;
      e.aiState[effect.key] = effect.set !== undefined ? effect.set : was + (effect.delta ?? 1);
      // 'phase' is the boss-phase convention (content/enemies/bosses.ts): tell the renderer
      if (effect.key === 'phase' && e.aiState[effect.key] !== was) emit(env, { t: 'enemy_phase', uid: e.uid, phase: e.aiState[effect.key] as number });
      return;
    }
    case 'halt_enemy':
      for (const t of resolveTargets(env, effect.target, frame)) if (t !== 'player') haltEnemy(env, t);
      return;
    case 'harvest':
      return execHarvest(env, effect, frame, amt(effect.mult));
    case 'prime':
      primeFromHand(env, effect.n ?? 1);
      return;
    // --- Chronist v2
    case 'gather':
      gather(env);
      return;
    case 'quicken': {
      const combat = requireCombat(s, 'quicken');
      if (effect.n < 1) throw new Error(`quicken n must be >= 1 (got ${effect.n})`);
      combat.counters.beatOffset = (combat.counters.beatOffset ?? 0) + effect.n; // no offset yet this turn = 0
      emit(env, { t: 'beat_shift', delta: effect.n, now: combat.cardsPlayedThisTurn.length + combat.counters.beatOffset });
      return;
    }
    case 'schedule':
      scheduleFromHand(env, effect.turns, frame.target);
      return;
    // --- Shared v2
    case 'strain':
      return execStrain(env, amt(effect.amount));
    case 'triage': {
      const combat = requireCombat(s, 'triage');
      const cands = combat.hand.filter((c) => !hasCardKeyword(c, 'retain')).map((c) => c.uid);
      if (cands.length === 0) return;
      if (cands.length <= effect.keep) {
        for (const uid of cands) combat.counters[triageKeepKey(uid)] = 1;
        return;
      }
      openChoice(env, { kind: 'cards', prompt: `Keep up to ${effect.keep} card${effect.keep > 1 ? 's' : ''}. The rest of your hand is Scrapped.`, from: 'hand', choices: cands, labels: [], offers: [], min: 0, max: effect.keep, resume: { op: 'triage' } });
      return;
    }
    case 'copy_card': {
      const combat = requireCombat(s, 'copy_card');
      const cands = combat.hand.map((c) => c.uid);
      if (cands.length === 0) return;
      const costThisTurn = effect.costThisTurn ?? null; // no cost change unless given
      const only = cands[0];
      if (cands.length === 1 && only !== undefined) return copyHandCard(env, only, costThisTurn);
      openChoice(env, { kind: 'cards', prompt: 'Choose a card to copy.', from: 'hand', choices: cands, labels: [], offers: [], min: 1, max: 1, resume: { op: 'copy_card', costThisTurn } });
      return;
    }
    case 'add_random_card': {
      requireCombat(s, 'add_random_card');
      const n = amt(effect.n ?? 1);
      const rarities = ['common', 'uncommon', 'rare'] as const;
      const pool = rarities.flatMap((r) => (effect.pool === 'colorless' ? colorlessPool(r) : classCardPool(s.classId, r))).filter((d) => matchesFilter(d, effect.filter));
      if (pool.length === 0) throw new Error(`add_random_card: no ${effect.pool} card matches the filter (${describeSource(frame.src)})`);
      for (let i = 0; i < n; i++) {
        const d = pickFrom(s.rng.misc, pool);
        addCardToCombat(env, d.id, effect.to, { upgraded: false, costThisTurn: effect.costThisTurn, position: 'random' });
      }
      return;
    }
    case 'cancel_attack': {
      const combat = requireCombat(s, 'cancel_attack');
      const t = frame.target;
      if (typeof t !== 'number' || combat.turnPhase !== 'enemy') throw new Error('cancel_attack outside an enemy attack declaration');
      combat.counters.cancelMove = t;
      return;
    }
  }
}

function execUpgrade(env: Env, effect: Extract<Effect, { type: 'upgrade' }>, n: number): void {
  const s = env.state;
  if (n <= 0) return;
  const ok = (c: CardInstance): boolean => isUpgradable(c) && matchesFilter(cardDef(c), effect.filter);
  if (effect.where === 'deck') {
    const cands = upgradableDeckCards(s.player.deck).filter(ok).map((c) => c.uid);
    const k = Math.min(n, cands.length);
    if (k === 0) return;
    if (effect.choose === true && k < cands.length) {
      openChoice(env, { kind: 'cards', prompt: `Upgrade ${k} card${k > 1 ? 's' : ''}.`, from: 'deck', choices: cands, labels: [], offers: [], min: k, max: k, resume: { op: 'upgrade_deck' } });
      return;
    }
    const picked = effect.choose === true ? cands : pickRandom(s, cands, k);
    for (const uid of picked) upgradeInDeck(env, uid);
    return;
  }
  const combat = requireCombat(s, 'upgrade effect');
  const cands = combat.hand.filter(ok);
  if (effect.where === 'all_hand') {
    for (const c of cands) upgradeCard(env, c);
    return;
  }
  const k = Math.min(n, cands.length);
  if (k === 0) return;
  if (effect.choose === true && k < cands.length) {
    openChoice(env, { kind: 'cards', prompt: `Upgrade ${k} card${k > 1 ? 's' : ''} in your hand.`, from: 'hand', choices: cands.map((c) => c.uid), labels: [], offers: [], min: k, max: k, resume: { op: 'upgrade_combat' } });
    return;
  }
  const picked = effect.choose === true ? cands : pickRandom(s, cands, k);
  for (const c of picked) upgradeCard(env, c);
}

/** add_card {to: 'deck', bloom}: the new deck copy starts with that Bloom (clamped to its cap); not growth, so no onBloomGained. */
function setNewCopyBloom(env: Env, card: CardInstance, bloom: number): void {
  if (!isBloomCard(card)) throw new Error(`add_card bloom: ${card.id} is not a Bloom card`);
  const now = Math.max(0, Math.min(bloomCapFor(env.state, card), bloom));
  if (now === 0) return;
  card.vars = { ...(card.vars ?? {}), bloom: now };
  emit(env, { t: 'bloom', uid: card.uid, delta: now, now });
}

/**
 * Graft v2 Harvest (docs/v2/graft-design.md §2.3): each target with Rot loses mult × Rot HP, then its Rot
 * is halved (round down) if it is still alive. A kill spreads the full stack through Rot's onDeath (RULINGS 53).
 */
function execHarvest(env: Env, effect: Extract<Effect, { type: 'harvest' }>, frame: EffectFrame, mult: number): void {
  const s = env.state;
  requireCombat(s, 'harvest');
  for (const t of resolveTargets(env, effect.target, frame)) {
    if (t === 'player') throw new Error('harvest targets the player');
    const rot = stacksOf(s, t, 'rot');
    if (rot <= 0) continue;
    const before = hpOf(s, t).hp;
    loseHp(env, t, rot * Math.max(0, mult), frame.self);
    const hpLost = before - hpOf(s, t).hp;
    emit(env, { t: 'harvest', enemyUid: t, rot, loss: hpLost });
    if (isAlive(s, t)) setStatusStacks(env, t, 'rot', Math.floor(rot / 2));
    dispatch(env, 'onHarvest', 'player', { uid: t, rot, hpLost });
  }
}

/** In-combat permanent removals share cap_prune_away (RULINGS 7). */
export function removeDeckCardChecked(env: Env, uid: number): boolean {
  const s = env.state;
  if (s.phase === 'combat' && s.combat) {
    if (takeBudget(env, 'pruneAway', TUNING.caps.pruneAwayPerTurn, 'cap_prune_away', 1) === 0) return false;
  }
  removeFromDeck(env, uid);
  return true;
}

function execRemove(env: Env, effect: Extract<Effect, { type: 'remove_card' }>, frame: EffectFrame, n: number): void {
  const s = env.state;
  const mode = modeOf(effect, ['random', 'choose', 'all', 'self'], 'remove_card');
  const okDef = (c: CardInstance): boolean => (effect.allowBound === true || !isBound(c)) && matchesFilter(cardDef(c), effect.filter);
  if (mode === 'self') {
    if (frame.src.kind !== 'card') throw new Error('remove_card self outside a card');
    const uid = frame.src.uid;
    if (s.player.deck.some((c) => c.uid === uid)) removeDeckCardChecked(env, uid);
    return;
  }
  if (effect.from === 'hand') {
    const combat = requireCombat(s, 'remove_card from hand');
    if (mode !== 'choose') throw new Error("remove_card from 'hand' needs choose");
    const deckUids = new Set(s.player.deck.map((c) => c.uid));
    const cands = combat.hand.filter((c) => deckUids.has(c.uid) && okDef(c)).map((c) => c.uid);
    if (cands.length === 0) return;
    openChoice(env, { kind: 'cards', prompt: 'Remove a card in your hand from your deck.', from: 'hand', choices: cands, labels: [], offers: [], min: 1, max: 1, resume: { op: 'remove_deck' } });
    return;
  }
  const deck = s.player.deck.filter(okDef).map((c) => c.uid);
  if (mode === 'all') {
    for (const uid of deck) removeDeckCardChecked(env, uid);
    return;
  }
  const k = Math.min(n, deck.length);
  if (k <= 0) return;
  if (mode === 'random') {
    for (const uid of pickRandom(s, deck, k)) removeDeckCardChecked(env, uid);
    return;
  }
  openChoice(env, { kind: 'cards', prompt: `Remove ${k} card${k > 1 ? 's' : ''} from your deck.`, from: 'deck', choices: deck, labels: [], offers: [], min: k, max: k, resume: { op: 'remove_deck' } });
}

function execFetch(env: Env, effect: Extract<Effect, { type: 'fetch_card' }>, n: number): void {
  const s = env.state;
  const combat = requireCombat(s, 'fetch_card');
  const pile = effect.from === 'draw' ? combat.draw : effect.from === 'discard' ? combat.discard : combat.exhaust;
  // Shared v2: filter.ripe needs the instance (matchesFilter is def-only), so it is checked here.
  const ripe = effect.filter?.ripe;
  const defFilter = effect.filter && ripe !== undefined ? { ...effect.filter, ripe: undefined } : effect.filter;
  const cands = pile.filter(
    (c) =>
      (effect.uid === undefined || c.uid === effect.uid) &&
      matchesFilter(cardDef(c), defFilter) &&
      (ripe === undefined || isRipe(s, c) === ripe) &&
      (effect.select === 'max_bloom' || effect.select === 'min_bloom' ? isBloomCard(c) : true),
  );
  if (cands.length === 0 || n <= 0) return;
  const resume = { op: 'fetch' as const, from: effect.from, to: effect.to, costThisTurn: effect.costThisTurn ?? null, countsAsDraw: effect.countsAsDraw === true };
  if (effect.select === 'choose') {
    const k = Math.min(n, cands.length);
    openChoice(env, { kind: 'cards', prompt: `Choose ${k === 1 ? 'a card' : `up to ${k} cards`}.`, from: effect.from, choices: cands.map((c) => c.uid), labels: [], offers: [], min: effect.upTo === true ? 0 : k, max: k, resume });
    return;
  }
  const picked: CardInstance[] = [];
  const pool = [...cands];
  for (let i = 0; i < n && pool.length > 0; i++) {
    let c: CardInstance;
    if (effect.select === 'top') c = pool[pool.length - 1] as CardInstance;
    else if (effect.select === 'random') c = pickFrom(s.rng.misc, pool);
    else if (effect.select === 'max_cost') {
      const costs = pool.map(printedCostOf);
      const best = Math.max(...costs);
      c = pickFrom(s.rng.misc, pool.filter((x) => printedCostOf(x) === best));
    } else {
      const vals = pool.map(bloomOf);
      const best = effect.select === 'max_bloom' ? Math.max(...vals) : Math.min(...vals);
      c = pickFrom(s.rng.misc, pool.filter((x) => bloomOf(x) === best));
    }
    picked.push(c);
    pool.splice(pool.indexOf(c), 1);
  }
  moveFetched(env, picked.map((c) => c.uid), resume);
}

export function moveFetched(env: Env, uids: readonly number[], r: { from: 'draw' | 'discard' | 'exhaust'; to: 'hand' | 'draw_top' | 'primed'; costThisTurn: number | null; countsAsDraw: boolean }): void {
  const combat = requireCombat(env.state, 'fetch move');
  const pile = r.from === 'draw' ? combat.draw : r.from === 'discard' ? combat.discard : combat.exhaust;
  for (const uid of uids) {
    const card = pile.find((c) => c.uid === uid);
    if (!card) throw new Error(`fetch: card ${uid} not in ${r.from}`);
    if (r.to === 'hand') {
      takeFrom(pile, uid, r.from);
      const where = putIntoHand(env, card, r.countsAsDraw);
      if (where === null) {
        pile.push(card); // cut by a cap: stays where it was
        continue;
      }
      if (r.costThisTurn !== null) card.tempCost = r.costThisTurn;
      emit(env, { t: 'draw', uids: [uid] });
    } else if (r.to === 'draw_top') {
      takeFrom(pile, uid, r.from);
      combat.draw.push(card);
    } else {
      if (combat.primed.length >= TUNING.caps.primeCapacity) {
        capHit(env, 'cap_primes');
        continue;
      }
      takeFrom(pile, uid, r.from);
      combat.primed.push({ card, charges: TUNING.riposte.charges });
      emit(env, { t: 'card_primed', uid });
    }
  }
}

/** Printed numeric cost (X and unplayable = 0); fetch select 'max_cost'. */
function printedCostOf(card: CardInstance): number {
  const cost = cardDef(card).cost;
  return typeof cost === 'number' ? cost : 0;
}

function hasCardKeyword(card: CardInstance, kw: 'retain'): boolean {
  return (cardDef(card).keywords ?? []).includes(kw);
}

/**
 * Strain (shared v2 H1, RULINGS 62): the player loses up to n HP but stops at 1 HP. The HP actually lost
 * goes into combat.counters.strained and fires onStrain (when > 0). Not a hit, so nothing reduces it.
 */
export function execStrain(env: Env, n: number): void {
  const s = env.state;
  const combat = requireCombat(s, 'strain');
  const lose = Math.min(Math.max(0, n), s.player.hp - 1);
  if (lose <= 0) {
    if (n > 0) emit(env, { t: 'text', text: 'Strain: you are at 1 HP.' });
    return;
  }
  loseHp(env, 'player', lose, 'player');
  combat.counters.strained = (combat.counters.strained ?? 0) + lose;
  dispatch(env, 'onStrain', 'player', { amount: lose });
}

/** copy_card (shared v2 H17): a combat-only copy of a hand card goes into the hand (cap_to_hand). */
export function copyHandCard(env: Env, uid: number, costThisTurn: number | null): void {
  const combat = requireCombat(env.state, 'copy_card');
  const src = combat.hand.find((c) => c.uid === uid);
  if (!src) throw new Error(`copy_card: card ${uid} not in hand`);
  const copy = addCardToCombat(env, src.id, 'hand', { upgraded: src.upgraded, costThisTurn: costThisTurn ?? undefined, position: 'random' });
  if (copy && src.vars) copy.vars = { ...src.vars };
}

/** Gold change; throws if it would go negative (content must gate costs with `available`). */
/**
 * Next-turn bank (generic; Breaker v2 ruling 3): draw / energy that arrives outside the player's turn
 * (e.g. a Riposte's played effects via Answer in Kind) or is marked `nextTurn` is paid at the start of
 * the player's next turn: energy right after the refill (step 3), cards with the turn-start draw
 * (step 6). Neither counts toward this turn's or next turn's effect caps (cap_draw, cap_bonus_energy).
 */
export function bankNextTurn(env: Env, draw: number, energy: number): void {
  const c = requireCombat(env.state, 'next-turn bank');
  if (draw <= 0 && energy <= 0) return;
  c.counters.bankDraw = (c.counters.bankDraw ?? 0) + Math.max(0, draw);
  c.counters.bankEnergy = (c.counters.bankEnergy ?? 0) + Math.max(0, energy);
  emit(env, { t: 'next_turn_bank', draw: c.counters.bankDraw, energy: c.counters.bankEnergy });
}

export function gainGold(env: Env, amount: number): void {
  if (amount === 0) return;
  const p = env.state.player;
  if (p.gold + amount < 0) throw new Error(`gold would go negative (${p.gold} + ${amount})`);
  p.gold += amount;
  emit(env, { t: 'gold', delta: amount, now: p.gold });
  if (amount > 0) dispatch(env, 'onGoldGain', 'player', { amount });
}
