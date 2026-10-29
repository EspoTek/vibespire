// No pack registration: index.ts registers the assigned content. These two lookup spies
// supply an isolated sandbox class/enemy while the other implementers' packs are incomplete.
import { afterAll, describe, expect, it, vi } from 'vitest';
import * as content from '../../src/content';
import { COLORLESS_CARDS, COLORLESS_STATUSES } from '../../src/content/cards/colorless';
import { STATUS_CARDS } from '../../src/content/cards/status_cards';
import { CURSES } from '../../src/content/cards/curses';
import { Game, renderCardText, renderStatusText } from '../../src/engine';
import { canPlayCard, drawCards, getCardCost, makeCard, runCardHook } from '../../src/engine/cards';
import { makeEnv } from '../../src/engine/core';
import { dealDamage } from '../../src/engine/damage';
import { execEffect } from '../../src/engine/effects';
import { newFloorRecord } from '../../src/engine/history';
import { drain } from '../../src/engine/queue';
import { createStreams } from '../../src/engine/rng';
import { decayPhase, playerRule } from '../../src/engine/statuses';
import { validateEffects } from '../../src/engine/validate';
import type { CardDef, CardInstance, ClassDef, EnemyDef, EnemyState, RunState } from '../../src/engine/types';

const SANDBOX_CLASS: ClassDef = { id: '__colorless_class', name: 'Sandbox', maxHp: 5000, startingGold: 99,
  maxEnergy: 3, potionSlots: 3, startingDeck: [], startingRelics: [], icon: '' };
const SANDBOX_ENEMY: EnemyDef = { id: '__colorless_enemy', name: 'Sandbox', hp: [5000, 5000],
  chooseMove: () => 'attack', moves: { attack: { name: 'Attack', intent: 'attack', effects: [{ type: 'damage', amount: 5, times: 2, target: 'target' }] } }, icon: '' };
const realEnemy = content.getEnemyDef;
const realClass = content.getClassDef;
const enemyLookup = vi.spyOn(content, 'getEnemyDef').mockImplementation((id) =>
  id === SANDBOX_ENEMY.id ? SANDBOX_ENEMY : id === '__colorless_boss' ? { ...SANDBOX_ENEMY, id, boss: true } : realEnemy(id));
const classLookup = vi.spyOn(content, 'getClassDef').mockImplementation((id) => id === SANDBOX_CLASS.id ? SANDBOX_CLASS : realClass(id));
afterAll(() => { enemyLookup.mockRestore(); classLookup.mockRestore(); });

const COLORLESS_IDS = ['relay_ping', 'shardfall', 'arc_lattice', 'salvage_kit', 'stress_fracture', 'gyro_jammer',
  'ballast_lock', 'jettison_pod', 'overdraft_cell', 'star_survey', 'fault_beacon', 'snare_line', 'cutting_torch',
  'medbay_voucher', 'clean_manifest', 'salvage_kiln', 'prism_resonance', 'shard_cache', 'mirror_tether', 'grav_clamp'];
const STATUS_IDS = ['status_jitter', 'status_backlash', 'status_tangle', 'status_drift'];
const CURSE_IDS = ['curse_burden', 'curse_seized_joint', 'curse_static_ghost', 'curse_guilt', 'curse_vacuum_chill',
  'curse_debt_mark', 'curse_hollow_echo', 'curse_parasite_vine'];
const POWER_IDS = ['guard_lock', 'salvage_kiln', 'prism_resonance', 'drift_energy', 'backlash_cards'];
const CARDS = [...COLORLESS_CARDS, ...STATUS_CARDS, ...CURSES];

function combat(g: Game) {
  if (!g.state.combat) throw new Error('Missing sandbox combat');
  return g.state.combat;
}
function sandbox(enemyCount = 1): Game {
  const rng = createStreams('colorless');
  const enemies: EnemyState[] = Array.from({ length: enemyCount }, (_, i) => ({ uid: i + 1, id: SANDBOX_ENEMY.id,
    hp: 5000, maxHp: 5000, block: 0, guard: 0, statuses: {}, intent: { kind: 'attack', moveId: 'attack', damage: 5, hits: 2 },
    intentTurn: 1, forecast: [], moveHistory: [], aiState: {}, alive: true, fled: false, leaderUid: null, withLeader: null, rng: [...rng.enemy] }));
  const state: RunState = {
    version: 1, seed: 'colorless', classId: SANDBOX_CLASS.id, rng, act: 1, ascent: 0, floor: 1, phase: 'combat',
    player: { hp: 5000, maxHp: 5000, gold: 99, deck: [], relics: [], potions: [], potionSlots: 3, counters: { shards: 5 } },
    map: { act: 1, rows: [], bossEncounter: '' }, mapPos: null, room: 'monster', reward: null, shop: null, event: null,
    rest: null, treasure: null, startChoices: null, bossRelicChoices: null, queue: [], pendingChoice: null,
    history: { floors: [] }, counters: { encounters: [], monstersThisAct: 0, eventsSeen: [], rarePity: 0, potionChance: 40, shopRemovals: 0 }, nextUid: 1,
    combat: { encounterId: '__colorless_encounter', kind: 'monster', isElite: false, isBoss: false, eventId: null, onWin: [],
      turn: 1, turnPhase: 'player', outcome: null, energy: 10, maxEnergy: 3, drawPerTurn: 5, handLimit: 10,
      hand: [], draw: [], discard: [], exhaust: [], inPlay: [], primed: [], timeline: [], player: { block: 0, guard: 0, statuses: {} },
      enemies, queue: [], pendingChoice: null, cardsPlayedThisTurn: [], attacksPlayedThisTurn: 0, cardsPlayedThisCombat: 0,
      reducedThisTurn: [], resolvedThisTurn: [], lastPrune: null, damageTaken: 0, counters: {}, nextEnemyUid: enemyCount + 1 },
  };
  state.history.floors.push(newFloorRecord(state, 'monster'));
  const g = new Game(state, { atomic: false });
  for (let i = 0; i < 12; i++) combat(g).draw.push(deckCard(g, 'status_jitter'));
  return g;
}
function deckCard(g: Game, id: string, upgraded = false): CardInstance {
  const card = makeCard(g.state, id, upgraded);
  g.state.player.deck.push({ ...card });
  return card;
}
function hand(g: Game, ids: string[], upgraded = false): CardInstance[] {
  combat(g).hand = ids.map((id) => deckCard(g, id, upgraded));
  return combat(g).hand;
}
function cardInHand(g: Game, id: string): CardInstance {
  const card = combat(g).hand.find((copy) => copy.id === id);
  if (!card) throw new Error(`Missing hand card ${id}`);
  return card;
}
function play(g: Game, card: CardInstance): void {
  const def = content.getCardDef(card.id, card.upgraded);
  g.apply(def.target === 'enemy' ? { type: 'play_card', uid: card.uid, target: 1 } : { type: 'play_card', uid: card.uid });
}
function settle(g: Game): void {
  for (let i = 0; i < 20; i++) {
    const choice = combat(g).pendingChoice;
    if (!choice) return;
    g.apply({ type: 'resolve_choice', uids: choice.choices.slice(0, Math.max(choice.min, 1)) });
  }
  throw new Error('Choices never settled');
}
function drawOne(g: Game, id: string): CardInstance {
  const card = deckCard(g, id);
  combat(g).draw.push(card);
  const env = makeEnv(g.state);
  drawCards(env, 1, false);
  drain(env);
  return card;
}
function effect(g: Game, effects: Parameters<typeof execEffect>[1][]): void {
  const env = makeEnv(g.state);
  for (const e of effects) execEffect(env, e, { src: { kind: 'system' }, self: 'player', target: null, x: 0 });
  drain(env);
}

it('exports the complete assigned ids/counts, registered by index.ts', () => {
  expect(COLORLESS_CARDS).toHaveLength(20);
  expect(STATUS_CARDS).toHaveLength(4);
  expect(CURSES).toHaveLength(8);
  expect(COLORLESS_STATUSES).toHaveLength(5);
  expect(COLORLESS_CARDS.map((d) => d.id)).toEqual(COLORLESS_IDS);
  expect(STATUS_CARDS.map((d) => d.id)).toEqual(STATUS_IDS);
  expect(CURSES.map((d) => d.id)).toEqual(CURSE_IDS);
  expect(COLORLESS_STATUSES.map((d) => d.id)).toEqual(POWER_IDS);
  expect(COLORLESS_CARDS.filter((d) => d.rarity === 'uncommon')).toHaveLength(12);
  expect(COLORLESS_CARDS.filter((d) => d.rarity === 'rare')).toHaveLength(8);
  for (const d of CARDS) expect(content.getCardDef(d.id)).toBe(d);
  for (const d of COLORLESS_STATUSES) expect(content.getStatusDef(d.id)).toBe(d);
});

it('validates every assigned card variant, delayed/riposte list and status trigger with engine validators', () => {
  const errors: string[] = [];
  for (const base of CARDS) for (const upgraded of [false, true]) {
    const d = content.getCardDef(base.id, upgraded);
    const where = { label: `${d.id}${upgraded ? '+' : ''}`, tables: d, hasTarget: d.target === 'enemy', combat: true, run: false, enemy: false };
    validateEffects(d.effects, where, errors);
    if (d.delay) validateEffects(d.delay.effects, where, errors);
    if (d.riposte) validateEffects(d.riposte, { ...where, hasTarget: true, riposte: true }, errors);
    if (d.cost === null) expect(d.keywords).toContain('unplayable');
    expect(d.keywords?.includes('delay') ?? false).toBe(d.delay !== undefined);
    expect(d.keywords?.includes('riposte') ?? false).toBe(d.riposte !== undefined);
    expect(d.text.replace(/\{[^}]+\}/g, '')).not.toMatch(/\d/);
  }
  for (const d of COLORLESS_STATUSES) {
    for (const [hook, effects] of Object.entries(d.triggers ?? {})) validateEffects(effects, {
      label: `${d.id}.${hook}`, tables: d, hasTarget: false, combat: true, run: false, enemy: false,
    }, errors);
    expect(d.text.replace(/\{[^}]+\}/g, '')).not.toMatch(/\d/);
    for (const stacks of [1, 2, 3]) expect(renderStatusText(d.id, stacks)).not.toMatch(/[{}]/);
  }
  expect(errors).toEqual([]);
});

describe('all assigned cards', () => {
  for (const base of CARDS) for (const upgraded of [false, true]) {
    it(`${base.id}${upgraded ? '+' : ''} renders and plays, or resolves its unplayable hand/draw hooks`, () => {
      const g = sandbox();
      const cards = hand(g, [base.id, 'curse_guilt', 'status_jitter'], upgraded);
      const card = cards[0];
      if (!card) throw new Error('setup');
      const def = content.getCardDef(base.id, upgraded);
      expect(renderCardText(card, null)).not.toMatch(/[{}]/);
      expect(renderCardText(card, g.state, 1)).not.toMatch(/[{}]/);
      if (def.cost === null) {
        expect(canPlayCard(g.state, card)).not.toBe(true);
        const env = makeEnv(g.state);
        runCardHook(env, card, 'onDraw');
        drain(env);
        g.apply({ type: 'end_turn' });
        settle(g);
      } else {
        expect(canPlayCard(g.state, card)).toBe(true);
        expect(() => { play(g, card); settle(g); }).not.toThrow();
        if (def.delay || def.type === 'power') {
          g.apply({ type: 'end_turn' });
          settle(g);
        }
      }
    });
  }
});

it('executes every custom function at least once via card play/draw', () => {
  for (const def of CARDS) {
    if (!def.custom) continue;
    const spies = Object.keys(def.custom).map((key) => ({ key, spy: vi.spyOn(def.custom as NonNullable<CardDef['custom']>, key) }));
    try {
      const g = sandbox();
      hand(g, [def.id, 'curse_guilt']);
      const card = cardInHand(g, def.id);
      if (def.cost === null) {
        const env = makeEnv(g.state);
        runCardHook(env, card, 'onDraw');
        drain(env);
      } else { play(g, card); settle(g); }
      for (const { key, spy } of spies) expect(spy, `${def.id}.${key}`).toHaveBeenCalled();
    } finally { for (const { spy } of spies) spy.mockRestore(); }
  }
});

it.each([false, true])('resolves every Salvage Kit branch (upgraded=%s)', (upgraded) => {
  for (const option of [0, 1, 2]) {
    const g = sandbox(2);
    hand(g, ['salvage_kit'], upgraded);
    play(g, cardInHand(g, 'salvage_kit'));
    expect(combat(g).pendingChoice?.labels.join(' ')).not.toMatch(/[{}]/);
    g.apply({ type: 'resolve_choice', uids: [option] });
    if (option === 0) expect(combat(g).player.block).toBe(upgraded ? 10 : 7);
    if (option === 1) expect(combat(g).hand).toHaveLength(upgraded ? 3 : 2);
    if (option === 2) expect(combat(g).enemies.map((e) => e.hp)).toEqual([5000 - (upgraded ? 8 : 5), 5000 - (upgraded ? 8 : 5)]);
  }
});

it('Gyro Jammer reads live attack hits, clamps to its limit, and ignores nonattacks', () => {
  for (const [kind, hits, expected] of [['attack', 1, 1], ['attack_buff', 6, 3], ['defend', 6, 0]] as const) {
    const g = sandbox();
    const enemy = combat(g).enemies[0];
    if (!enemy) throw new Error('setup');
    enemy.intent = { kind, moveId: 'attack', hits, damage: 5 };
    hand(g, ['gyro_jammer']);
    play(g, cardInHand(g, 'gyro_jammer'));
    expect(enemy.statuses.stagger ?? 0).toBe(expected);
  }
});

it('Clean Manifest counts only the permanent run deck and clamps above its threshold', () => {
  for (const [size, expected] of [[12, 22], [20, 6], [24, 6]] as const) {
    const g = sandbox();
    const c = combat(g);
    g.state.player.deck = [];
    c.draw = [];
    const card = deckCard(g, 'clean_manifest');
    while (g.state.player.deck.length < size) c.draw.push(deckCard(g, 'status_jitter'));
    c.hand = [card, makeCard(g.state, 'status_jitter')];
    c.exhaust.push(c.draw.pop()!);
    const before = c.enemies[0]!.hp;
    play(g, card);
    expect(before - c.enemies[0]!.hp).toBe(expected);
  }
});

it('Shardfall reads held Shards and Arc Lattice reads living enemy count', () => {
  const g = sandbox(3);
  hand(g, ['shardfall', 'arc_lattice']);
  play(g, cardInHand(g, 'shardfall'));
  expect(combat(g).enemies[0]!.hp).toBe(4974);
  expect(g.state.player.counters.shards).toBe(5);
  play(g, cardInHand(g, 'arc_lattice'));
  expect(combat(g).enemies.map((e) => e.hp)).toEqual([4964, 4990, 4990]);
});

it('Mirror Tether uses displayed current damage, including its upgrade base', () => {
  for (const upgraded of [false, true]) {
    const g = sandbox();
    hand(g, ['mirror_tether'], upgraded);
    play(g, cardInHand(g, 'mirror_tether'));
    expect(combat(g).enemies[0]!.hp).toBe(5000 - 10 - (upgraded ? 8 : 0));
  }
});

it('Ballast Lock skips one Guard halving, then expires before future turns', () => {
  const g = sandbox();
  combat(g).enemies[0]!.intent = { kind: 'defend', moveId: 'attack' };
  hand(g, ['ballast_lock']);
  play(g, cardInHand(g, 'ballast_lock'));
  // The enemy still deals ten damage; bank enough Guard to observe the start-of-turn hold.
  combat(g).player.guard = 30;
  g.apply({ type: 'end_turn' });
  expect(combat(g).player.guard).toBe(20);
  expect(combat(g).player.statuses.guard_lock).toBeUndefined();
  g.apply({ type: 'end_turn' });
  expect(combat(g).player.guard).toBe(5);
});

it('Prism Resonance adds Guard after halving, and stacks', () => {
  const g = sandbox();
  combat(g).player.guard = 30;
  combat(g).player.statuses.prism_resonance = 2;
  g.apply({ type: 'end_turn' });
  expect(combat(g).player.guard).toBe(20); // (30 - 10) / 2 + 2 * 5
});

it('Salvage Kiln ignores played Powers and reacts to Scrap including Shard Cache', () => {
  const g = sandbox();
  const c = combat(g);
  hand(g, ['salvage_kiln', 'prism_resonance', 'shard_cache', 'status_jitter']);
  play(g, cardInHand(g, 'salvage_kiln'));
  play(g, cardInHand(g, 'prism_resonance'));
  expect(c.exhaust).toHaveLength(0);
  expect(c.enemies[0]!.statuses.exposed).toBeUndefined();
  play(g, cardInHand(g, 'shard_cache'));
  expect(c.enemies[0]!.statuses.exposed).toBe(1);
  play(g, cardInHand(g, 'status_jitter'));
  expect(c.enemies[0]!.statuses.exposed).toBe(2);
});

it.each([false, true])('Fault Beacon resolves on the next Timeline step (upgraded=%s)', (upgraded) => {
  const g = sandbox(2);
  hand(g, ['fault_beacon'], upgraded);
  play(g, cardInHand(g, 'fault_beacon'));
  expect(combat(g).timeline).toHaveLength(1);
  expect(combat(g).enemies.every((e) => !e.statuses.exposed)).toBe(true);
  g.apply({ type: 'end_turn' });
  expect(combat(g).timeline).toHaveLength(0);
  expect(combat(g).enemies.map((e) => e.statuses.exposed)).toEqual([upgraded ? 3 : 2, upgraded ? 3 : 2]);
});

it.each([false, true])('Snare Line Ripostes before the enemy hits (upgraded=%s)', (upgraded) => {
  const g = sandbox();
  hand(g, ['snare_line'], upgraded);
  const hp = g.state.player.hp;
  g.apply({ type: 'end_turn' });
  expect(g.state.player.hp).toBe(hp - (upgraded ? 2 : 4));
  expect(combat(g).enemies[0]!.statuses.stagger).toBe(upgraded ? 3 : 2);
  expect(combat(g).primed).toHaveLength(0);
});

it('Grav Clamp halts ordinary enemies for one move, while bosses are immune', () => {
  for (const boss of [false, true]) {
    const g = sandbox();
    if (boss) combat(g).enemies[0]!.id = '__colorless_boss';
    hand(g, ['grav_clamp']);
    play(g, cardInHand(g, 'grav_clamp'));
    expect(combat(g).enemies[0]!.statuses.halted ?? 0).toBe(boss ? 0 : 1);
    const hp = g.state.player.hp;
    g.apply({ type: 'end_turn' });
    expect(g.state.player.hp).toBe(hp - (boss ? 10 : 0));
    expect(combat(g).enemies[0]!.statuses.halted).toBeUndefined();
  }
});

it('Star Survey applies Augury and generated Jitter/Drift share cap_to_hand', () => {
  const g = sandbox();
  hand(g, ['star_survey', 'relay_ping', 'overdraft_cell']);
  combat(g).counters.toHand = 3;
  play(g, cardInHand(g, 'star_survey'));
  expect(combat(g).player.statuses.augury).toBe(1);
  play(g, cardInHand(g, 'relay_ping'));
  expect(combat(g).counters.toHand).toBe(4);
  play(g, cardInHand(g, 'overdraft_cell'));
  expect(combat(g).hand.some((card) => card.id === 'status_drift')).toBe(false);
});

it('Cutting Torch excludes Bound/generated cards, charges only a successful removal, and shares the cap', () => {
  const g = sandbox();
  const c = combat(g);
  hand(g, ['cutting_torch', 'curse_guilt', 'curse_burden']);
  c.hand.push(makeCard(g.state, 'status_jitter'));
  const victim = cardInHand(g, 'curse_guilt');
  const maxHp = g.state.player.maxHp;
  play(g, cardInHand(g, 'cutting_torch'));
  g.apply({ type: 'resolve_choice', uids: [0] });
  expect(c.pendingChoice?.choices).toEqual([victim.uid]);
  g.apply({ type: 'resolve_choice', uids: [victim.uid] });
  expect(g.state.player.deck.some((card) => card.uid === victim.uid)).toBe(false);
  expect(c.exhaust.some((card) => card.uid === victim.uid)).toBe(true);
  expect(g.state.player.maxHp).toBe(maxHp - 3);
  expect(c.counters.pruneAway).toBe(1);
  // A second removal, from any source, cannot remove a deck card.
  const remaining = g.state.player.deck.length;
  effect(g, [{ type: 'remove_card', random: true }]);
  expect(g.state.player.deck).toHaveLength(remaining);
  const torch = deckCard(g, 'cutting_torch');
  c.hand.push(torch);
  play(g, torch);
  expect(c.pendingChoice).toBeNull();
  expect(g.state.player.maxHp).toBe(maxHp - 3);
});

it('Cutting Torch can be declined, and no eligible target costs no Max HP', () => {
  for (const decline of [false, true]) {
    const g = sandbox();
    hand(g, decline ? ['cutting_torch', 'curse_guilt'] : ['cutting_torch', 'curse_burden']);
    play(g, cardInHand(g, 'cutting_torch'));
    g.apply({ type: 'resolve_choice', uids: [decline ? 1 : 0] });
    expect(combat(g).pendingChoice).toBeNull();
    expect(g.state.player.maxHp).toBe(5000);
  }
});

it.each([false, true])('Cutting Torch and Prune away consume the same slot (Prune first=%s)', (pruneFirst) => {
  const g = sandbox();
  hand(g, ['cutting_torch', 'curse_guilt', 'status_drift']);
  if (pruneFirst) {
    effect(g, [{ type: 'prune', variant: 'away' }]);
    g.apply({ type: 'resolve_choice', uids: [cardInHand(g, 'curse_guilt').uid] });
    play(g, cardInHand(g, 'cutting_torch'));
  } else {
    play(g, cardInHand(g, 'cutting_torch'));
    settle(g);
    effect(g, [{ type: 'prune', variant: 'away' }]);
  }
  expect(combat(g).pendingChoice).toBeNull();
  expect(combat(g).counters.pruneAway).toBe(1);
  expect(g.state.history.floors[0]!.cardsRemoved).toHaveLength(1);
  expect(g.state.player.maxHp).toBe(pruneFirst ? 5000 : 4997);
});

it.each([false, true])('Shard Cache removes itself once, Scraps, and grants resources (upgraded=%s)', (upgraded) => {
  const g = sandbox();
  hand(g, ['shard_cache'], upgraded);
  const card = cardInHand(g, 'shard_cache');
  play(g, card);
  expect(g.state.player.deck.some((copy) => copy.uid === card.uid)).toBe(false);
  expect(combat(g).exhaust.map((copy) => copy.uid)).toContain(card.uid);
  expect(combat(g).discard.map((copy) => copy.uid)).not.toContain(card.uid);
  expect(g.state.player.counters.shards).toBe(upgraded ? 8 : 7);
  expect(combat(g).energy).toBe(12);
  expect(combat(g).counters.pruneAway).toBe(1);
});

it('Shard Cache obeys a spent removal cap and still Scraps its combat copy', () => {
  const g = sandbox();
  hand(g, ['shard_cache']);
  const card = cardInHand(g, 'shard_cache');
  combat(g).counters.pruneAway = 1;
  play(g, card);
  expect(g.state.player.deck.some((copy) => copy.uid === card.uid)).toBe(true);
  expect(combat(g).exhaust.map((copy) => copy.uid)).toContain(card.uid);
  expect(combat(g).counters.pruneAway).toBe(1);
  expect(g.state.history.floors[0]!.capHits.cap_prune_away).toBe(1);
});

it('Medbay Voucher spends only affordable gold, and Max HP gain heals', () => {
  for (const gold of [34, 35]) {
    const g = sandbox();
    g.state.player.gold = gold;
    g.state.player.hp = 4000;
    hand(g, ['medbay_voucher']);
    play(g, cardInHand(g, 'medbay_voucher'));
    expect(g.state.player.gold).toBe(gold === 35 ? 0 : 34);
    expect(g.state.player.maxHp).toBe(gold === 35 ? 5003 : 5000);
    expect(g.state.player.hp).toBe(gold === 35 ? 4003 : 4000);
  }
});

it('Jitter taxes only the next play and its tax expires at turn end', () => {
  const g = sandbox();
  hand(g, ['status_jitter', 'curse_guilt', 'status_drift']);
  play(g, cardInHand(g, 'status_jitter'));
  expect(getCardCost(g.state, cardInHand(g, 'curse_guilt'))).toBe(3);
  play(g, cardInHand(g, 'curse_guilt'));
  expect(getCardCost(g.state, cardInHand(g, 'status_drift'))).toBe(1);
  combat(g).player.statuses.cost_tax = 2;
  g.apply({ type: 'end_turn' });
  expect(combat(g).player.statuses.cost_tax).toBeUndefined();
});

it('Tangle taxes only true adjacent hand positions, including stacked neighbours', () => {
  const g = sandbox();
  hand(g, ['status_drift', 'status_tangle', 'curse_guilt', 'status_tangle', 'status_drift', 'jettison_pod']);
  expect(combat(g).hand.map((card) => getCardCost(g.state, card))).toEqual([2, null, 4, null, 2, 0]);
  combat(g).hand.splice(1, 1);
  expect(getCardCost(g.state, cardInHand(g, 'curse_guilt'))).toBe(3);
});

it('Drift can be paid now or costs next-turn energy once and Scraps', () => {
  for (const paid of [false, true]) {
    const g = sandbox();
    hand(g, ['status_drift']);
    const card = cardInHand(g, 'status_drift');
    if (paid) play(g, card);
    g.apply({ type: 'end_turn' });
    expect(combat(g).energy).toBe(paid ? 3 : 2);
    expect(combat(g).exhaust.map((copy) => copy.uid)).toContain(card.uid);
    expect(combat(g).player.statuses.drift_energy).toBeUndefined();
    g.apply({ type: 'end_turn' });
    expect(combat(g).energy).toBe(3);
  }
});

it('Backlash uses no Riposte capacity and Scraps only after the next enemy hit', () => {
  const g = sandbox();
  hand(g, ['status_backlash', 'snare_line']);
  const card = cardInHand(g, 'status_backlash');
  const env = makeEnv(g.state);
  runCardHook(env, card, 'onTurnEndInHand');
  drain(env);
  expect(combat(g).primed).toHaveLength(0);
  expect(combat(g).inPlay.map((copy) => copy.uid)).toContain(card.uid);
  expect(combat(g).exhaust).toHaveLength(0);
  dealDamage(env, { source: 1, target: 'player', base: 5, card: null, tags: [], ignoreBlock: false });
  drain(env);
  expect(g.state.player.hp).toBe(4991);
  expect(combat(g).exhaust.map((copy) => copy.uid)).toContain(card.uid);
  dealDamage(env, { source: 1, target: 'player', base: 5, card: null, tags: [], ignoreBlock: false });
  expect(g.state.player.hp).toBe(4986);
});

it('unfired Backlash expires and Scraps at next turn start', () => {
  const g = sandbox();
  hand(g, ['status_backlash']);
  const card = cardInHand(g, 'status_backlash');
  const env = makeEnv(g.state);
  runCardHook(env, card, 'onTurnEndInHand');
  drain(env);
  decayPhase(env, 'start_player_turn');
  drain(env);
  expect(combat(g).exhaust.map((copy) => copy.uid)).toContain(card.uid);
  expect(combat(g).inPlay).toHaveLength(0);
  expect(combat(g).player.statuses.backlash_cards).toBeUndefined();
});

it('multiple Backlashes leave Riposte free and Scrap before the following enemy moves', () => {
  const g = sandbox(2);
  hand(g, ['status_backlash', 'status_backlash', 'snare_line']);
  const uids = combat(g).hand.filter((card) => card.id === 'status_backlash').map((card) => card.uid);
  const events = g.apply({ type: 'end_turn' });
  expect(events.filter((event) => event.t === 'riposte_triggered')).toHaveLength(1);
  // First hit: five - three Stagger + eight Backlash. Then two, then the other enemy's ten.
  expect(g.state.player.hp).toBe(4978);
  const nextEnemy = events.findIndex((event) => event.t === 'enemy_move' && event.uid === 2);
  for (const uid of uids) {
    const scrapped = events.findIndex((event) => event.t === 'exhaust' && event.uids.includes(uid));
    expect(scrapped).toBeGreaterThanOrEqual(0);
    expect(scrapped).toBeLessThan(nextEnemy);
  }
});

it('Stress Fracture self-Exposed decays before the enemy phase and still adds damage', () => {
  const g = sandbox();
  hand(g, ['stress_fracture']);
  play(g, cardInHand(g, 'stress_fracture'));
  expect(combat(g).player.statuses.exposed).toBe(2);
  expect(combat(g).enemies[0]!.statuses.exposed).toBe(3);
  g.apply({ type: 'end_turn' });
  expect(g.state.player.hp).toBe(4988);
  expect(combat(g).player.statuses.exposed).toBe(1);
  expect(combat(g).enemies[0]!.statuses.exposed).toBe(2);
});

it('Seized Joint taxes only the first play, Vacuum Chill reduces opening draw while kept', () => {
  const g = sandbox();
  hand(g, ['curse_seized_joint', 'curse_guilt', 'status_drift', 'curse_vacuum_chill']);
  expect(getCardCost(g.state, cardInHand(g, 'curse_guilt'))).toBe(3);
  play(g, cardInHand(g, 'curse_guilt'));
  expect(getCardCost(g.state, cardInHand(g, 'status_drift'))).toBe(1);
  expect(playerRule(g.state, 5, (mods, ctx, n) => mods.drawPerTurn ? mods.drawPerTurn(ctx, n) : n)).toBe(4);
  g.apply({ type: 'end_turn' });
  expect(combat(g).hand.filter((card) => card.id === 'status_jitter')).toHaveLength(4);
  expect(combat(g).hand.some((card) => card.id === 'curse_vacuum_chill')).toBe(true);
});

it('draw curses add Jitter, spend gold, guard the lowest-HP enemy, and lose HP/draw', () => {
  const g = sandbox(2);
  const c = combat(g);
  drawOne(g, 'curse_static_ghost');
  expect(c.hand.map((card) => card.id)).toEqual(['curse_static_ghost', 'status_jitter']);
  expect(c.counters.toHand).toBe(1);
  drawOne(g, 'curse_debt_mark');
  expect(g.state.player.gold).toBe(94);
  c.enemies[1]!.hp = 4000;
  drawOne(g, 'curse_hollow_echo');
  expect(c.enemies.map((enemy) => enemy.guard)).toEqual([0, 4]);
  const before = c.hand.length;
  drawOne(g, 'curse_parasite_vine');
  expect(g.state.player.hp).toBe(4998);
  expect(c.hand).toHaveLength(before + 2);
  expect(c.counters.effectDraw).toBe(1);
});

it('Burden is unplayable, filtered from normal removal and Transmute, but Purge can remove it', () => {
  const g = sandbox();
  g.state.player.deck = [];
  combat(g).draw = [];
  hand(g, ['curse_burden']);
  const card = cardInHand(g, 'curse_burden');
  expect(canPlayCard(g.state, card)).not.toBe(true);
  expect(content.getCardDef(card.id).bound).toBe(true);
  effect(g, [{ type: 'remove_card', all: true }]);
  expect(g.state.player.deck.map((copy) => copy.id)).toEqual(['curse_burden']);
  // Run-level transform/transmute filter Bound copies before offering them.
  g.state.phase = 'map';
  g.state.combat = null;
  const env = makeEnv(g.state);
  for (const e of [{ type: 'transform_card', choose: true }, { type: 'transmute' }] as const) execEffect(env, e, { src: { kind: 'system' }, self: 'player', target: null, x: 0 });
  expect(g.state.pendingChoice).toBeNull();
  execEffect(env, { type: 'remove_card', choose: true, allowBound: true }, { src: { kind: 'system' }, self: 'player', target: null, x: 0 });
  expect(g.state.pendingChoice?.choices).toEqual([card.uid]);
  g.apply({ type: 'resolve_choice', uids: [card.uid] });
  expect(g.state.player.deck).toHaveLength(0);
});

it('Burden can be Scrapped by ordinary Prune, but is excluded from Prune away', () => {
  const g = sandbox();
  hand(g, ['curse_burden']);
  const card = cardInHand(g, 'curse_burden');
  effect(g, [{ type: 'prune', variant: 'away' }]);
  expect(combat(g).pendingChoice).toBeNull();
  effect(g, [{ type: 'prune' }]);
  expect(combat(g).pendingChoice?.choices).toEqual([card.uid]);
  g.apply({ type: 'resolve_choice', uids: [card.uid] });
  expect(combat(g).exhaust.map((copy) => copy.uid)).toContain(card.uid);
  expect(g.state.player.deck.some((copy) => copy.uid === card.uid)).toBe(true);
});
