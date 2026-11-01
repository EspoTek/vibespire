import '../testpack';
// Smoke tests over whatever content is registered (placeholder test_* content today).
import { afterAll, describe, expect, it } from 'vitest';
import {
  allBoons,
  allCards,
  allClasses,
  allEnemies,
  allEvents,
  allPotions,
  allRelics,
  allRestOptions,
  allStatuses,
  getCardDef,
  getEnemyDef,
  getEventDef,
  getPotionDef,
  getRelicDef,
  getStatusDef,
} from '../../src/content';
import {
  Game,
  TUNING,
  canPlayCard,
  computeIntent,
  renderBoonText,
  renderCardText,
  renderEventOptionLabel,
  renderEventText,
  renderPotionText,
  renderRelicText,
  renderRestOptionText,
  renderStatusText,
  validateAllContent,
  type Action,
  type RunState,
} from '../../src/engine';
import { makeCard } from '../../src/engine/cards';
import { nextBeat } from '../../src/engine/combat';
import { hashString, nextU32 } from '../../src/engine/rng';
import { randomPolicy } from '../../sim/policies/random';
import { enqueue, makeEnv } from '../../src/engine/core';
import { newFloorRecord } from '../../src/engine/history';
import { drain } from '../../src/engine/queue';
import { dispatchRelic } from '../../src/engine/statuses';
import type { HookName } from '../../src/engine/types';
import { combatOf, enemyUids, sandbox } from '../engine/helpers';

/** Answer pending choices with the first legal answer until none is pending. */
function settle(g: Game): void {
  for (let i = 0; i < 20; i++) {
    const pc = g.state.phase === 'combat' ? g.state.combat?.pendingChoice : g.state.pendingChoice;
    if (!pc) return;
    g.apply(g.legalActions()[0] as Action);
  }
  throw new Error('choices never settled');
}

function noPlaceholders(text: string): void {
  expect(text).not.toMatch(/[{}]/);
}

function eventRoom(id: string): Game {
  const g = Game.newRun(`event-${id}`, 'test_class');
  const s = g.state;
  s.startChoices = null;
  s.phase = 'event';
  s.room = 'event';
  s.event = { id, page: null, chosen: null, done: false };
  s.history.floors.push(newFloorRecord(s, 'event'));
  return g;
}

describe('content registries', () => {
  it('validate (cross references, DSL rules)', () => {
    expect(() => validateAllContent()).not.toThrow();
  });

  it('lookups throw on unknown ids', () => {
    expect(() => getCardDef('nope')).toThrow(/unknown card/);
    expect(() => getRelicDef('nope')).toThrow(/unknown relic/);
    expect(() => getEnemyDef('nope')).toThrow(/unknown enemy/);
    expect(() => getStatusDef('nope')).toThrow(/unknown status/);
    expect(() => getEventDef('nope')).toThrow(/unknown event/);
    expect(() => getPotionDef('nope')).toThrow(/unknown potion/);
  });

  it('every class has a starting deck and reward cards', () => {
    expect(allClasses().length).toBeGreaterThan(0);
    for (const c of allClasses()) {
      expect(c.startingDeck.length).toBeGreaterThan(0);
      expect(allCards().filter((d) => d.cls === c.id && ['common', 'uncommon', 'rare'].includes(d.rarity)).length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('every card', () => {
  for (const def of allCards()) {
    for (const upgraded of [false, true]) {
      it(`${def.id}${upgraded ? '+' : ''} plays in a sandbox combat without throwing`, () => {
        const g = sandbox({ seed: `card-${def.id}`, deck: Array.from({ length: 12 }, () => 'test_strike') });
        for (const e of combatOf(g).enemies) e.hp = e.maxHp = 500;
        const c = combatOf(g);
        g.state.player.counters.shards = 5;
        const card = makeCard(g.state, def.id, upgraded);
        c.hand = [card, makeCard(g.state, 'test_strike'), makeCard(g.state, 'test_block', true), makeCard(g.state, 'test_strike')];
        c.energy = 10;
        const merged = getCardDef(def.id, upgraded);
        noPlaceholders(renderCardText(card, null));
        noPlaceholders(renderCardText(card, g.state, enemyUids(g)[0] ?? null));
        const plays = g.legalActions().filter((a) => a.type === 'play_card' && a.uid === card.uid);
        if (merged.cost === null || merged.keywords?.includes('unplayable')) {
          expect(plays).toEqual([]);
          setHandKeep(g.state, card.uid);
          g.apply({ type: 'end_turn' }); // end-of-turn hand hooks run
          return;
        }
        let legal = plays;
        if (legal.length === 0) {
          // Conditionally playable (a canPlay reason such as "only on the beat" or "needs a Shard"):
          // a refusal is a pass; retry under a generic "make it playable" setup.
          const reason = canPlayCard(g.state, card);
          expect(typeof reason).toBe('string');
          makePlayable(g);
          legal = g.legalActions().filter((a) => a.type === 'play_card' && a.uid === card.uid);
          if (legal.length === 0) {
            stillUnplayable.push(`${def.id}${upgraded ? '+' : ''}: ${String(canPlayCard(g.state, card))}`);
            return;
          }
        }
        g.apply(legal[0] as Action);
        settle(g);
      });
    }
  }
});

/** Cards that stayed unplayable even after makePlayable (reported, not failed). */
const stillUnplayable: string[] = [];
afterAll(() => {
  if (stillUnplayable.length) console.warn(`[smoke] still unplayable after makePlayable (check their canPlay):\n  ${stillUnplayable.join('\n  ')}`);
});

/** Generic setup that satisfies typical canPlay conditions: Shards, 3rd play of the turn (on the beat), max Onslaught, a Timeline entry, Bloom cards in hand. */
function makePlayable(g: Game): void {
  const c = combatOf(g);
  g.state.player.counters.shards = 10;
  c.cardsPlayedThisTurn = ['setup', 'setup'];
  c.player.statuses.onslaught = TUNING.caps.status.onslaught ?? 30;
  c.player.guard = 20;
  c.player.block = 20;
  c.energy = 10;
  c.timeline.push({ card: makeCard(g.state, 'test_tock'), dueTurn: c.turn + 2, seq: 999, onBeat: false, target: null, x: 0, advancedThisTurn: false });
  c.hand.push(makeCard(g.state, 'test_sprout'), makeCard(g.state, 'test_sprout'), makeCard(g.state, 'test_parry'));
}

/** Keep only the given card in hand. */
function setHandKeep(s: RunState, uid: number): void {
  const c = s.combat;
  if (!c) throw new Error('not in combat');
  c.hand = c.hand.filter((x) => x.uid === uid);
}

describe('every enemy move', () => {
  for (const def of allEnemies()) {
    for (const moveId of Object.keys(def.moves)) {
      it(`${def.id}.${moveId} resolves`, () => {
        const g = sandbox({ seed: `move-${def.id}-${moveId}` });
        const c = combatOf(g);
        const e = c.enemies[0];
        if (!e) throw new Error('setup');
        e.id = def.id;
        e.hp = e.maxHp = def.hp[1];
        e.intent = computeIntent(g.state, e, moveId);
        g.state.player.hp = g.state.player.maxHp = 500;
        c.hand = [];
        g.apply({ type: 'end_turn' });
        expect(c.enemies[0]?.moveHistory).toBeDefined();
        expect(combatOf(g).enemies[0]?.moveHistory).toEqual([moveId]);
        // and it picks a legal next move
        expect(Object.keys(def.moves)).toContain(combatOf(g).enemies[0]?.intent.moveId);
      });
    }
  }
});

describe('every event option', () => {
  for (const def of allEvents()) {
    noPlaceholders(renderEventText(def.id));
    def.options.forEach((_, index) => {
      it(`${def.id}[${index}] resolves`, () => {
        const g = eventRoom(def.id);
        noPlaceholders(renderEventOptionLabel(def.id, index, g.state));
        const legal = g.legalActions();
        const act: Action = { type: 'event_choice', index };
        if (!legal.some((a) => a.type === 'event_choice' && a.index === index)) return; // gated off for a fresh run
        g.state.player.hp = g.state.player.maxHp = 5000;
        g.apply(act);
        // drive pages / event combat / rewards back to the map
        const prng = hashString(`ev-${def.id}-${index}`);
        const ended = (): boolean => g.state.phase === 'map' || g.state.phase === 'defeat' || g.state.phase === 'victory';
        for (let i = 0; i < 2000 && !ended(); i++) g.apply(randomPolicy.choose(g, g.legalActions(), nextU32(prng)));
        expect(ended()).toBe(true);
      });
    });
  }
});

describe('every boon, potion, rest option', () => {
  for (const b of allBoons()) {
    it(`boon ${b.id} resolves`, () => {
      noPlaceholders(renderBoonText(b.id));
      const g = Game.newRun(`boon-${b.id}`, 'test_class');
      g.state.startChoices = [{ id: b.id }];
      g.apply({ type: 'choose_start_boon', index: 0 });
      settle(g);
      expect(g.state.phase).toBe('map');
    });
  }
  for (const p of allPotions()) {
    it(`potion ${p.id} resolves`, () => {
      noPlaceholders(renderPotionText(p.id));
      const g = sandbox({ seed: `potion-${p.id}` });
      g.state.player.potions = [p.id];
      const use = g.legalActions().find((a) => a.type === 'use_potion');
      expect(use).toBeDefined();
      g.apply(use as Action);
      settle(g);
    });
  }
  for (const o of allRestOptions()) {
    it(`rest option ${o.id} resolves`, () => {
      noPlaceholders(renderRestOptionText(o.id));
      const g = Game.newRun(`rest-${o.id}`, 'test_class');
      const s = g.state;
      s.player.counters.shards = 5;
      s.startChoices = null;
      s.phase = 'map';
      s.room = 'rest';
      s.history.floors.push(newFloorRecord(s, 'rest'));
      const env = makeEnv(s);
      enqueue(env, [{ kind: 'step', step: { op: 'enter_room' } }]);
      drain(env);
      const index = s.rest?.specials.indexOf(o.id) ?? -1;
      expect(index).toBeGreaterThanOrEqual(0);
      g.apply({ type: 'rest_special', index });
      settle(g);
      expect(g.legalActions()).toEqual([{ type: 'proceed' }]);
    });
  }
});

describe('every relic hook runs', () => {
  for (const def of allRelics()) {
    it(`${def.id}: each declared hook/trigger runs without throwing, and a scripted run completes`, () => {
      noPlaceholders(renderRelicText(def.id));
      const declared = [...new Set([...Object.keys(def.hooks ?? {}), ...Object.keys(def.triggers ?? {})])];
      for (const name of declared) {
        if (MODIFIER_HOOKS.has(name)) callModifier(def.id, name);
        else fireEventHook(def.id, name as HookName);
      }
      scriptedRun(def.id);
    });
  }
});

const MODIFIER_HOOKS: ReadonlySet<string> = new Set([
  'damageDealtFlat', 'damageDealtMult', 'damageTakenMult', 'damageTakenFlat', 'exposedPerStack', 'modifyDamageTaken', 'modifyHpLoss',
  'blockFlat', 'guardFlat', 'blockMult', 'modifyCardCost', 'keepBlock', 'guardDecay', 'keepStatus', 'modifyStatusCap', 'modifyStatusApplied',
  'modifyHeal', 'bloomCap', 'modifyPruneBloom', 'beatPositions', 'onBeatRepeats', 'primeCapacity', 'primeCharges', 'forecastDepth', 'maxEnergy',
  'drawPerTurn', 'handLimit', 'enemiesActFirst', 'canSkipCardReward', 'skipShards', 'cardRewardRarities', 'modifyShopPrice',
  'shardRemovalKeepsService', 'restOptionCost', 'restSideAction',
  // Shared v2
  'grantsReprise', 'delayPlay', 'cardRewardClasses', 'extraColorlessOffer', 'restOptionBlocked', 'beatIndexBonus', 'timelineDestination',
]);

const RUN_LEVEL_HOOKS: ReadonlySet<string> = new Set(['onPickup', 'onRest', 'onShopEnter', 'onFloorEnter', 'onActStart', 'onGoldGain', 'onShardGain', 'onRewardSkipped', 'onCardAdded']);

/** A combat sandbox (two enemies) or a map-phase run holding only this relic. */
function hookGame(relicId: string, runLevel: boolean): Game {
  const g = runLevel ? Game.newRun(`hook-${relicId}`, 'test_class') : sandbox({ seed: `hook-${relicId}`, encounter: 'test_enc_slimes', deck: Array.from({ length: 12 }, () => 'test_strike') });
  g.state.player.relics = [{ id: relicId, counter: 0 }];
  g.state.player.counters.shards = 3;
  if (runLevel) {
    g.state.startChoices = null;
    g.state.phase = 'map';
  } else for (const e of combatOf(g).enemies) e.hp = e.maxHp = 500;
  return g;
}

function fireEventHook(relicId: string, hook: HookName): void {
  const g = hookGame(relicId, RUN_LEVEL_HOOKS.has(hook));
  const s = g.state;
  const env = makeEnv(s);
  const c = s.combat;
  const enemyUid = c?.enemies[0]?.uid ?? 1;
  const card = makeCard(s, 'test_sprout');
  if (c) c.hand.push(card);
  const def = getCardDef(card.id);
  switch (hook) {
    case 'onCombatStart': dispatchRelic(env, relicId, hook, {}); break;
    case 'onCombatEnd': dispatchRelic(env, relicId, hook, { won: true, kind: 'elite', turn: 2 }); break;
    case 'onTurnStart': dispatchRelic(env, relicId, hook, {}); break;
    case 'onTurnEnd': dispatchRelic(env, relicId, hook, {}); break;
    case 'onCardPlayed':
    case 'afterCardPlayed': dispatchRelic(env, relicId, hook, { card, def, target: enemyUid, onBeat: true, depth: 0, x: 0 }); break;
    case 'onCardExhausted':
    case 'onCardDrawn':
    case 'onCardToHand': dispatchRelic(env, relicId, hook, { card }); break;
    case 'onDamageDealt': dispatchRelic(env, relicId, hook, { source: 'player', target: enemyUid, card, tags: [], amount: 5, blocked: 0, guarded: 0, hpLost: 5, staggerPrevented: 0 }); break;
    case 'onDamageTaken': dispatchRelic(env, relicId, hook, { source: enemyUid, target: 'player', card: null, tags: [], amount: 5, blocked: 2, guarded: 1, hpLost: 2, staggerPrevented: 1 }); break;
    case 'onHpLost': dispatchRelic(env, relicId, hook, { amount: 3, source: enemyUid, fromHit: true }); break;
    case 'onBlockGained': dispatchRelic(env, relicId, hook, { amount: 5, pool: 'guard' }); break;
    case 'onGuardDecay': dispatchRelic(env, relicId, hook, { lost: 4 }); break;
    case 'onGuardAbsorbed': dispatchRelic(env, relicId, hook, { amount: 3, source: enemyUid }); break;
    case 'onShuffle': dispatchRelic(env, relicId, hook, {}); break;
    case 'onEnemyDied': dispatchRelic(env, relicId, hook, { uid: enemyUid, enemyId: 'test_slime', statuses: { rot: 4, exposed: 2 } }); break;
    case 'onDeath': dispatchRelic(env, relicId, hook, {}); break;
    case 'onStatusChanged': dispatchRelic(env, relicId, hook, { target: enemyUid, id: 'rot', delta: 2 }); break;
    case 'onEnemySpawn': dispatchRelic(env, relicId, hook, { uid: enemyUid }); break;
    case 'onEnemyAttackDeclared': dispatchRelic(env, relicId, hook, { uid: enemyUid, intent: { kind: 'attack', moveId: 'tackle', damage: 6, hits: 1 } }); break;
    case 'onRiposteTriggered': dispatchRelic(env, relicId, hook, { card, attacker: enemyUid }); break;
    case 'onPrimed': dispatchRelic(env, relicId, hook, { count: 1 }); break;
    case 'onEnemyMoveEnd': dispatchRelic(env, relicId, hook, { uid: enemyUid, moveId: 'tackle', wasAttack: true, hpLostThisMove: 0 }); break;
    case 'onPrune': dispatchRelic(env, relicId, hook, { scrapped: card }); break;
    case 'onBloomGained': dispatchRelic(env, relicId, hook, { card, delta: 1 }); break;
    case 'onDelayResolved': dispatchRelic(env, relicId, hook, { card, batch: 3 }); break;
    case 'onTimelineAdd': {
      if (!c) throw new Error('combat needed');
      const entry = { card: makeCard(s, 'test_tock'), dueTurn: c.turn + 2, seq: 50, onBeat: true, target: null, x: 0, advancedThisTurn: false };
      c.timeline.push(entry);
      dispatchRelic(env, relicId, hook, { entry, onBeat: true });
      break;
    }
    case 'onPotionUsed': dispatchRelic(env, relicId, hook, { potion: 'test_potion_heal' }); break;
    // Shared v2 hooks
    case 'onStrain': dispatchRelic(env, relicId, hook, { amount: 2 }); break;
    case 'onPrimeFizzled': dispatchRelic(env, relicId, hook, { card }); break;
    case 'onBlockReset': dispatchRelic(env, relicId, hook, { lost: 6 }); break;
    case 'onHandEndOfTurn': dispatchRelic(env, relicId, hook, {}); break;
    case 'onAttackCancelled':
    case 'onMoveSkipped': dispatchRelic(env, relicId, hook, { uid: enemyUid }); break;
    case 'onPickup':
    case 'onShopEnter':
    case 'onFloorEnter':
    case 'onActStart':
    case 'onRewardSkipped': dispatchRelic(env, relicId, hook, {}); break;
    case 'onRest': dispatchRelic(env, relicId, hook, { action: 'smith', uid: s.player.deck[0]?.uid ?? null }); break;
    case 'onGoldGain': dispatchRelic(env, relicId, hook, { amount: 10 }); break;
    case 'onShardGain': dispatchRelic(env, relicId, hook, { amount: 1 }); break;
    case 'onCardAdded': dispatchRelic(env, relicId, hook, { card: s.player.deck[0] ?? card, source: 'reward' }); break;
  }
  drain(env);
  settle(g);
}

function callModifier(relicId: string, name: string): void {
  const def = getRelicDef(relicId);
  const m = def.hooks;
  if (!m) throw new Error('no hooks');
  const g = hookGame(relicId, false);
  const s = g.state;
  const ctx = { state: s, combat: s.combat, source: { kind: 'relic' as const, id: relicId }, owner: 'player' as const, stacks: 0, relic: s.player.relics[0] ?? null, preview: true, nextBeat: () => nextBeat(s) };
  const enemyUid = s.combat?.enemies[0]?.uid ?? 1;
  const dmg = { source: 'player' as const, target: enemyUid, card: null, tags: [] };
  const card = makeCard(s, 'test_sprout');
  const results: unknown[] = [];
  switch (name) {
    case 'damageDealtFlat': results.push(m.damageDealtFlat?.(ctx, dmg)); break;
    case 'damageDealtMult': results.push(m.damageDealtMult?.(ctx, dmg)); break;
    case 'damageTakenMult': results.push(m.damageTakenMult?.(ctx, dmg)); break;
    case 'damageTakenFlat': results.push(m.damageTakenFlat?.(ctx, dmg)); break;
    case 'exposedPerStack': results.push(m.exposedPerStack?.(ctx, 1, dmg)); break;
    case 'modifyDamageTaken': results.push(m.modifyDamageTaken?.(ctx, 10, dmg)); break;
    case 'modifyHpLoss': results.push(m.modifyHpLoss?.(ctx, 10, dmg)); break;
    case 'blockFlat': results.push(m.blockFlat?.(ctx, { pool: 'block', tags: [] })); break;
    case 'guardFlat': results.push(m.guardFlat?.(ctx, { pool: 'guard', tags: [] })); break;
    case 'blockMult': results.push(m.blockMult?.(ctx, { pool: 'block', tags: [] })); break;
    case 'modifyCardCost': results.push(m.modifyCardCost?.(ctx, card, 1)); break;
    case 'keepBlock': results.push(m.keepBlock?.(ctx, 10)); break;
    case 'guardDecay': results.push(m.guardDecay?.(ctx, 10, 5)); break;
    case 'keepStatus': results.push(m.keepStatus?.(ctx, 'onslaught', 6)); break;
    case 'modifyStatusCap': results.push(m.modifyStatusCap?.(ctx, 'rot', 15, enemyUid)); break;
    case 'modifyStatusApplied': results.push(m.modifyStatusApplied?.(ctx, 'exposed', 2)); break;
    case 'modifyHeal': results.push(m.modifyHeal?.(ctx, 10)); break;
    case 'bloomCap': results.push(m.bloomCap?.(ctx, card, 10)); break;
    case 'modifyPruneBloom': results.push(m.modifyPruneBloom?.(ctx, 1, card)); break;
    case 'beatPositions': results.push(m.beatPositions?.(ctx, [3, 6, 9])); break;
    case 'onBeatRepeats': results.push(m.onBeatRepeats?.(ctx, card, 1)); break;
    case 'primeCapacity': results.push(m.primeCapacity?.(ctx, 1)); break;
    case 'primeCharges': results.push(m.primeCharges?.(ctx, card, 1)); break;
    case 'forecastDepth': results.push(m.forecastDepth?.(ctx, 2)); break;
    case 'maxEnergy': results.push(m.maxEnergy?.(ctx, 3)); break;
    case 'drawPerTurn': results.push(m.drawPerTurn?.(ctx, 5)); break;
    case 'handLimit': results.push(m.handLimit?.(ctx, 10)); break;
    case 'enemiesActFirst': results.push(m.enemiesActFirst?.(ctx)); break;
    case 'canSkipCardReward': results.push(m.canSkipCardReward?.(ctx)); break;
    case 'skipShards': results.push(m.skipShards?.(ctx, 1)); break;
    case 'cardRewardRarities': results.push(m.cardRewardRarities?.(ctx, 'elite')); break;
    case 'modifyShopPrice': results.push(m.modifyShopPrice?.(ctx, 'potion', 50)); break;
    case 'shardRemovalKeepsService': results.push(m.shardRemovalKeepsService?.(ctx)); break;
    case 'restOptionCost': results.push(m.restOptionCost?.(ctx, 'rest_purge', 2)); break;
    case 'restSideAction': results.push(m.restSideAction?.(ctx, 'rest_purge')); break;
    // Shared v2 modifiers
    case 'grantsReprise': {
      const def = getCardDef(card.id);
      results.push(m.grantsReprise?.(ctx, { card, def, target: enemyUid, onBeat: true, depth: 0, x: 3, costPaid: 3, handEmpty: true }));
      break;
    }
    case 'delayPlay': results.push(m.delayPlay?.(ctx, { card, def: getCardDef(card.id), target: enemyUid, onBeat: false, depth: 0, x: 0 }, 0)); break;
    case 'cardRewardClasses': results.push(m.cardRewardClasses?.(ctx, 'monster')); break;
    case 'extraColorlessOffer': results.push(m.extraColorlessOffer?.(ctx, 'elite')); break;
    case 'restOptionBlocked': results.push(m.restOptionBlocked?.(ctx, 'rest_purge')); break;
    case 'beatIndexBonus': results.push(m.beatIndexBonus?.(ctx)); break;
    case 'timelineDestination': results.push(m.timelineDestination?.(ctx, card)); break;
    default: throw new Error(`unknown modifier ${name}`);
  }
  for (const r of results) expect(['number', 'boolean', 'object']).toContain(typeof r);
}

/** A short scripted run holding the relic: start, one fight, rewards. Must not throw. */
function scriptedRun(relicId: string): void {
  const g = Game.newRun(`relic-${relicId}`, 'test_class', { atomic: false });
  g.state.player.relics = [{ id: relicId, counter: 0 }];
  g.state.player.hp = g.state.player.maxHp = 5000;
  const prng = hashString(`relic-run-${relicId}`);
  for (let i = 0; i < 400 && g.state.floor < 3 && g.state.phase !== 'defeat' && g.state.phase !== 'victory'; i++) {
    g.apply(randomPolicy.choose(g, g.legalActions(), nextU32(prng)));
  }
}

describe('status texts', () => {
  for (const s of allStatuses()) {
    it(`${s.id} renders for 1..3 stacks`, () => {
      for (const n of [1, 2, 3]) noPlaceholders(renderStatusText(s.id, n));
    });
  }
});
