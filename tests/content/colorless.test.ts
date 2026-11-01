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
import { answerChoice } from '../answer-choice';

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
  'clean_manifest', 'salvage_kiln', 'prism_resonance', 'shard_cache', 'mirror_tether', 'grav_clamp',
  // shared v2 (docs/v2/shared-design.md §4)
  'blood_tithe', 'vent_plasma', 'scar_tissue', 'last_light', 'spare_capacitor', 'shrapnel_charge', 'black_box', 'strip_for_parts',
  'scrapheap_colossus', 'burn_bright', 'arc_discharge', 'capacitor_bank', 'starfall_lance', 'stasis_bolt', 'encore', 'second_verse', 'bait_flare', 'fuse'];
const STATUS_IDS = ['status_jitter', 'status_backlash', 'status_tangle', 'status_drift'];
const CURSE_IDS = ['curse_burden', 'curse_seized_joint', 'curse_static_ghost', 'curse_guilt', 'curse_vacuum_chill',
  'curse_debt_mark', 'curse_hollow_echo', 'curse_parasite_vine'];
const POWER_IDS = ['guard_lock', 'salvage_kiln', 'prism_resonance', 'drift_energy', 'backlash_cards', 'reserve', 'reprise', 'reprise_big', 'scar_tissue', 'burn_bright'];
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
    version: 1, seed: 'colorless', classId: SANDBOX_CLASS.id, rng, act: 1, ascent: 0, difficulty: 'standard', floor: 1, phase: 'combat',
    player: { hp: 5000, maxHp: 5000, gold: 99, deck: [], relics: [], potions: [], potionSlots: 3, counters: { shards: 5 } },
    map: { act: 1, rows: [], bossEncounter: '' }, mapPos: null, mapPath: [], room: 'monster', reward: null, shop: null, event: null,
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
    answerChoice(g, choice.choices.slice(0, Math.max(choice.min, 1)));
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
  expect(COLORLESS_CARDS).toHaveLength(COLORLESS_IDS.length);
  expect(STATUS_CARDS).toHaveLength(4);
  expect(CURSES).toHaveLength(8);
  expect(COLORLESS_STATUSES).toHaveLength(POWER_IDS.length);
  expect(COLORLESS_CARDS.map((d) => d.id)).toEqual(COLORLESS_IDS);
  expect(STATUS_CARDS.map((d) => d.id)).toEqual(STATUS_IDS);
  expect(CURSES.map((d) => d.id)).toEqual(CURSE_IDS);
  expect(COLORLESS_STATUSES.map((d) => d.id)).toEqual(POWER_IDS);
  // RULINGS 60: 21 uncommon / 14 rare (Medbay Voucher cut in Phase C).
  expect(COLORLESS_CARDS.filter((d) => d.rarity === 'uncommon')).toHaveLength(23); // + Second Verse (RULINGS 70 follow-up), + Encore (Phase F)
  expect(COLORLESS_CARDS.filter((d) => d.rarity === 'rare')).toHaveLength(13);
  expect(COLORLESS_CARDS.filter((d) => d.rarity === 'special').map((d) => d.id)).toEqual(['fuse']);
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
    if (d.salvage) validateEffects(d.salvage, { ...where, hasTarget: false }, errors);
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
    answerChoice(g, [option]);
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
  expect(combat(g).enemies.map((e) => e.hp)).toEqual([4958, 4984, 4984]); // Phase F: 7 + 3 per living enemy
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

it('Salvage Kiln (Phase F): at your turn end, 1 damage to ALL enemies per Scrapheap card; played Powers are not in the heap', () => {
  const g = sandbox(2);
  const hps = (): number[] => combat(g).enemies.map((e) => e.hp);
  hand(g, ['salvage_kiln', 'prism_resonance', 'shard_cache', 'status_jitter']);
  play(g, cardInHand(g, 'salvage_kiln'));
  play(g, cardInHand(g, 'prism_resonance'));
  expect(combat(g).exhaust).toHaveLength(0);
  play(g, cardInHand(g, 'shard_cache'));
  play(g, cardInHand(g, 'status_jitter'));
  expect(hps()).toEqual([5000, 5000]); // nothing on the Scrap itself
  expect(combat(g).exhaust).toHaveLength(2);
  g.apply({ type: 'end_turn' });
  expect(hps()).toEqual([4998, 4998]);
});

it.each([false, true])('Fault Beacon applies Exposed now and more on the next Timeline step (upgraded=%s)', (upgraded) => {
  const g = sandbox(2);
  hand(g, ['fault_beacon'], upgraded);
  play(g, cardInHand(g, 'fault_beacon'));
  const n = upgraded ? 3 : 2;
  expect(combat(g).timeline).toHaveLength(1);
  expect(combat(g).enemies.map((e) => e.statuses.exposed)).toEqual([n, n]);
  g.apply({ type: 'end_turn' });
  expect(combat(g).timeline).toHaveLength(0);
  // n decays by 1 at each enemy's turn end, then n more lands at your turn start
  expect(combat(g).enemies.map((e) => e.statuses.exposed)).toEqual([2 * n - 1, 2 * n - 1]);
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

it('Cutting Torch removes a chosen deck card in hand (no Max HP cost), skips Bound/generated cards and shares the cap (Phase C)', () => {
  const g = sandbox();
  const c = combat(g);
  hand(g, ['cutting_torch', 'curse_guilt', 'curse_burden']);
  c.hand.push(makeCard(g.state, 'status_jitter'));
  const victim = cardInHand(g, 'curse_guilt');
  play(g, cardInHand(g, 'cutting_torch'));
  expect(c.pendingChoice?.choices).toEqual([victim.uid]);
  answerChoice(g, [victim.uid]);
  expect(g.state.player.deck.some((card) => card.uid === victim.uid)).toBe(false);
  expect(c.exhaust.some((card) => card.uid === victim.uid)).toBe(true);
  expect(g.state.player.maxHp).toBe(5000);
  expect(c.counters.pruneAway).toBe(1);
  const remaining = g.state.player.deck.length;
  effect(g, [{ type: 'remove_card', random: true }]);
  expect(g.state.player.deck).toHaveLength(remaining);
});

it('Cutting Torch with no eligible target does nothing', () => {
  const g = sandbox();
  hand(g, ['cutting_torch', 'curse_burden']);
  play(g, cardInHand(g, 'cutting_torch'));
  expect(combat(g).pendingChoice).toBeNull();
  expect(g.state.player.deck.some((c) => c.id === 'curse_burden')).toBe(true);
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

it('Stress Fracture Strains 2 and applies 4 Exposed (Phase C)', () => {
  const g = sandbox();
  hand(g, ['stress_fracture']);
  play(g, cardInHand(g, 'stress_fracture'));
  expect(g.state.player.hp).toBe(4998);
  expect(combat(g).player.statuses.exposed).toBeUndefined();
  expect(combat(g).enemies[0]!.statuses.exposed).toBe(4);
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
  answerChoice(g, [card.uid]);
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
  answerChoice(g, [card.uid]);
  expect(combat(g).exhaust.map((copy) => copy.uid)).toContain(card.uid);
  expect(g.state.player.deck.some((copy) => copy.uid === card.uid)).toBe(true);
});

// ---------------------------------------------------------------------------
// Shared v2 colourless cards (docs/v2/shared-design.md §4)

describe('shared v2 colourless cards', () => {
  it('blood_tithe: Strain 2 (HP lost, counted), draw 3 (Phase F)', () => {
    const g = sandbox();
    hand(g, ['blood_tithe']);
    play(g, cardInHand(g, 'blood_tithe'));
    expect(g.state.player.hp).toBe(4998);
    expect(combat(g).counters.strained).toBe(2);
    expect(combat(g).hand).toHaveLength(3);
  });

  it('vent_plasma: Strain 2 and AoE damage', () => {
    const g = sandbox(2);
    hand(g, ['vent_plasma']);
    play(g, cardInHand(g, 'vent_plasma'));
    expect(combat(g).enemies.map((e) => e.hp)).toEqual([4990, 4990]); // Phase F: 10
    expect(g.state.player.hp).toBe(4998);
  });

  it('scar_tissue: each Strain gives that much Guard and draws 1, at most 2 draws a turn', () => {
    const g = sandbox();
    hand(g, ['scar_tissue']);
    play(g, cardInHand(g, 'scar_tissue'));
    for (let i = 0; i < 3; i++) effect(g, [{ type: 'strain', amount: 2 }]);
    expect(combat(g).player.guard).toBe(6);
    expect(combat(g).hand).toHaveLength(2);
  });

  it('last_light: damage = 2 per missing HP; Scrapped', () => {
    const g = sandbox();
    g.state.player.hp = 4980;
    hand(g, ['last_light']);
    play(g, cardInHand(g, 'last_light'));
    expect(combat(g).enemies[0]?.hp).toBe(4960);
    expect(combat(g).exhaust.map((c) => c.id)).toEqual(['last_light']);
  });

  it('spare_capacitor: Guard, Scrap, Salvage +1 energy and draw 1 (Phase F)', () => {
    const g = sandbox();
    hand(g, ['spare_capacitor']);
    const e = combat(g).energy;
    play(g, cardInHand(g, 'spare_capacitor'));
    expect(combat(g).player.guard).toBe(4);
    expect(combat(g).energy).toBe(e + 1);
    expect(combat(g).hand).toHaveLength(1);
  });

  it('shrapnel_charge / black_box: Salvage fires when another card Scraps them; off-turn draw/energy bank', () => {
    const g = sandbox(2);
    hand(g, ['shrapnel_charge', 'black_box']);
    const e = combat(g).energy;
    effect(g, [{ type: 'exhaust', from: 'hand', all: true }]);
    expect(combat(g).enemies.map((x) => x.hp)).toEqual([4992, 4992]);
    expect(combat(g).energy).toBe(e + 1);
    expect(combat(g).hand).toHaveLength(2);
    // Scrapped during the turn-end steps: the Black Box's draw / energy wait for next turn.
    hand(g, ['black_box']);
    combat(g).counters.turnEnding = 1;
    effect(g, [{ type: 'exhaust', from: 'hand', all: true }]);
    delete combat(g).counters.turnEnding;
    expect(combat(g).counters.bankDraw).toBe(2);
    expect(combat(g).counters.bankEnergy).toBe(1);
  });

  it('black_box (Phase F): costs 0, Scraps itself, and its Salvage gains 1 energy and draws 2 (3 upgraded)', () => {
    for (const [upgraded, draws] of [[false, 2], [true, 3]] as const) {
      const g = sandbox();
      const [box] = hand(g, ['black_box'], upgraded);
      if (!box) throw new Error('no black box');
      const e = combat(g).energy;
      play(g, box);
      expect(combat(g).exhaust.map((c) => c.id)).toEqual(['black_box']);
      expect(combat(g).energy).toBe(e + 1);
      expect(combat(g).hand).toHaveLength(draws);
    }
  });

  it('an upgrade\'s Salvage replaces the base Salvage (getCardDef merged it from Phase E on)', () => {
    expect(content.getCardDef('shrapnel_charge', true).salvage).toEqual([{ type: 'damage', amount: 11, target: 'all_enemies', key: 'sdamage' }]);
    expect(content.getCardDef('shrapnel_charge').salvage).toEqual([{ type: 'damage', amount: 8, target: 'all_enemies', key: 'sdamage' }]);
  });

  it('encore (Phase F): no longer Scraps itself; it goes to the discard pile', () => {
    const g = sandbox();
    const [enc] = hand(g, ['encore', 'shrapnel_charge']);
    if (!enc) throw new Error('no encore');
    play(g, enc);
    expect(combat(g).exhaust.map((c) => c.id)).not.toContain('encore');
    expect(combat(g).discard.map((c) => c.id)).toContain('encore');
    expect(combat(g).player.statuses.reprise).toBe(1);
  });

  it('relay_ping (Phase F): draws 3 (4 upgraded) and adds one Jitter', () => {
    for (const [upgraded, n] of [[false, 3], [true, 4]] as const) {
      const g = sandbox();
      const [ping] = hand(g, ['relay_ping'], upgraded);
      if (!ping) throw new Error('no ping');
      play(g, ping);
      // The sandbox draw pile is all Jitters, so count: n drawn + the one added.
      expect(combat(g).hand).toHaveLength(n + 1);
      expect(combat(g).draw).toHaveLength(12 - n);
    }
  });

  it('strip_for_parts: Scrap up to 2, 5 Guard each (may pick none; Phase F)', () => {
    const g = sandbox();
    hand(g, ['strip_for_parts', 'curse_guilt', 'status_jitter']);
    play(g, cardInHand(g, 'strip_for_parts'));
    expect(combat(g).pendingChoice?.min).toBe(0);
    answerChoice(g, combat(g).hand.map((c) => c.uid));
    expect(combat(g).player.guard).toBe(10);
    expect(combat(g).hand).toHaveLength(1); // then draws 1 (Phase F)
  });

  it('shrapnel_charge (Phase F): +1 damage per Scrapheap card', () => {
    const g = sandbox();
    hand(g, ['shrapnel_charge', 'curse_guilt', 'status_jitter']);
    effect(g, [{ type: 'exhaust', from: 'hand', choose: true, n: 2 }]);
    answerChoice(g, combat(g).hand.filter((c) => c.id !== 'shrapnel_charge').map((c) => c.uid));
    play(g, cardInHand(g, 'shrapnel_charge'));
    expect(combat(g).enemies[0]?.hp).toBe(5000 - 10);
  });

  it('scrapheap_colossus: +3 per card in the Scrapheap (Phase F)', () => {
    const g = sandbox();
    hand(g, ['scrapheap_colossus', 'curse_guilt', 'status_jitter']);
    effect(g, [{ type: 'exhaust', from: 'hand', choose: true, n: 2 }]);
    answerChoice(g, combat(g).hand.filter((c) => c.id !== 'scrapheap_colossus').map((c) => c.uid));
    play(g, cardInHand(g, 'scrapheap_colossus'));
    expect(combat(g).enemies[0]?.hp).toBe(5000 - 14); // Phase F: 8 + 3 per Scrapheap card
  });

  it('burn_bright: Scrap cards cost 1 less', () => {
    const g = sandbox();
    hand(g, ['burn_bright', 'mirror_tether']);
    play(g, cardInHand(g, 'burn_bright'));
    expect(getCardCost(g.state, cardInHand(g, 'mirror_tether'))).toBe(1);
  });

  it('capacitor_bank + arc_discharge: Reserve adds to X; Reserve caps at 5', () => {
    const g = sandbox();
    hand(g, ['capacitor_bank', 'arc_discharge']);
    play(g, cardInHand(g, 'capacitor_bank'));
    expect(combat(g).player.statuses.reserve).toBe(2);
    effect(g, [{ type: 'status', target: 'self', id: 'reserve', amount: 10 }]);
    expect(combat(g).player.statuses.reserve).toBe(5);
    combat(g).energy = 2;
    const hp = combat(g).enemies[0]?.hp ?? 0;
    play(g, cardInHand(g, 'arc_discharge'));
    expect(hp - (combat(g).enemies[0]?.hp ?? 0)).toBe(6 * 8); // X = 2 + 5, X+1 hits of 6 (Phase F)
    expect(combat(g).player.statuses.reserve).toBeUndefined();
  });

  it('starfall_lance / stasis_bolt: X AoE now; X stamped on the Timeline', () => {
    const g = sandbox(2);
    hand(g, ['starfall_lance', 'stasis_bolt']);
    combat(g).energy = 2;
    play(g, cardInHand(g, 'starfall_lance'));
    expect(combat(g).enemies.map((e) => e.hp)).toEqual([4984, 4984]);
    combat(g).energy = 3;
    play(g, cardInHand(g, 'stasis_bolt'));
    expect(combat(g).timeline[0]?.x).toBe(3);
  });

  it('encore: the next card resolves twice, once only', () => {
    const g = sandbox();
    hand(g, ['encore', 'shardfall', 'shardfall']);
    play(g, cardInHand(g, 'encore'));
    const hp0 = combat(g).enemies[0]?.hp ?? 0;
    const shards = combat(g).hand.filter((c) => c.id === 'shardfall');
    const [a, b] = shards;
    if (!a || !b) throw new Error('setup');
    play(g, a);
    const one = hp0 - (combat(g).enemies[0]?.hp ?? 0);
    play(g, b);
    const two = hp0 - one - (combat(g).enemies[0]?.hp ?? 0);
    expect(one).toBe(2 * two);
  });

  it('bait_flare: Goad 3 and draw', () => {
    const g = sandbox();
    hand(g, ['bait_flare']);
    play(g, cardInHand(g, 'bait_flare'));
    expect(combat(g).enemies[0]?.statuses.goaded).toBe(3);
    expect(combat(g).hand).toHaveLength(1);
  });
});

describe('Second Verse (RULINGS 70 follow-up)', () => {
  it('gives Reprise to the next card if it costs 2 or more; a cheaper next card uses it up without Reprise', () => {
    const g = sandbox();
    hand(g, ['second_verse', 'shardfall', 'second_verse', 'jettison_pod', 'shardfall']);
    combat(g).energy = 20;
    const hp = (): number => combat(g).enemies[0]!.hp;
    play(g, combat(g).hand[0]!);
    expect(combat(g).player.block).toBe(7); // Phase F
    expect(combat(g).player.statuses.reprise_big).toBe(1);
    const h0 = hp();
    play(g, cardInHand(g, 'shardfall'));
    const twice = h0 - hp();
    expect(combat(g).player.statuses.reprise_big).toBeUndefined();
    play(g, cardInHand(g, 'second_verse'));
    play(g, cardInHand(g, 'jettison_pod')); // costs 0: uses Second Verse up, no Reprise
    expect(combat(g).player.statuses.reprise_big).toBeUndefined();
    const h1 = hp();
    play(g, cardInHand(g, 'shardfall'));
    expect(twice).toBe(2 * (h1 - hp()));
  });
});
