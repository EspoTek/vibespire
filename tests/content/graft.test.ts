// Importing the content entry point registers this pack. No test pack or extra registrations.
import { afterAll, describe, expect, it } from 'vitest';
import { getCardDef, getStatusDef } from '../../src/content';
import { GRAFT_CARDS, GRAFT_STATUSES } from '../../src/content/cards/graft';
import { Game, renderCardText, renderStatusText } from '../../src/engine';
import { addBloom } from '../../src/engine/bloom';
import { canPlayCard, getCardCost, makeCard } from '../../src/engine/cards';
import { makeEnv } from '../../src/engine/core';
import { effectItems } from '../../src/engine/ctx';
import { newFloorRecord } from '../../src/engine/history';
import { drain } from '../../src/engine/queue';
import { createStreams } from '../../src/engine/rng';
import { dispatch, tickEntity } from '../../src/engine/statuses';
import { validateEffects } from '../../src/engine/validate';
import { ENGINE_VERSION } from '../../src/engine/version';
import type { CardInstance, CombatState, Effect, EffectFrame, GameEvent, RunState } from '../../src/engine/types';
import { answerChoice } from '../answer-choice';

const IDS = [
  'lash', 'husk', 'seed_bite', 'graft_hide', 'thornwhirl', 'barb_flick', 'grafting_cut',
  'hivestrike', 'shear', 'spore_lash', 'canker_bite', 'mulch_maul', 'sap_shell', 'blightcap',
  'tendril_reach', 'root_mesh', 'deep_graft', 'spore_haze', 'mire_carapace',
  'shed_husk', 'sap_drip', 'leaf_litter', 'molt', 'burst_pod', 'twin_thorn', 'canopy_crush', 'miasma_sweep', 'uproot',
  'pollen_sting', 'patient_thorn', 'burl_wall', 'choking_spores',
  'propagate', 'seed_rain', 'puffball', 'sporeburst', 'decomposer', 'dusk_pruning',
  'living_hedge', 'thorn_halo', 'ripening_rot', 'reap', 'second_flush', 'heartwood_spear', 'death_cap', 'reaping_vine',
  'verdant_tide', 'humus_rite', 'crystal_graft',
  'thresher', 'hyphal_web',
  // Graft v2 (docs/v2/graft-design.md); the v1 cuts wait for the v2 baseline (RULINGS 55).
  'thornstorm', 'grim_harvest', 'clear_cut', 'deep_rot', 'rootstock', 'perennial', 'chaff',
];
const STATUS_IDS = [
  'decomposer', 'dusk_pruning', 'living_hedge', 'thorn_halo', 'ripening_rot',
  'thresher', 'hyphal_web', 'clear_cut', 'deep_rot', 'rootstock', 'perennial',
];

// Record execution through the actual definitions, including all serializable
// custom functions. The final assertion catches an unexercised table entry.
const expectedFns = new Set<string>();
const calledFns = new Set<string>();
for (const def of [...GRAFT_CARDS, ...GRAFT_STATUSES]) {
  for (const [name, fn] of Object.entries(def.custom ?? {})) {
    const key = `${def.id}.custom.${name}`;
    expectedFns.add(key);
    if (!def.custom) throw new Error('missing custom table');
    def.custom[name] = (ctx) => { calledFns.add(key); fn(ctx); };
  }
  for (const [name, fn] of Object.entries(def.amounts ?? {})) {
    const key = `${def.id}.amounts.${name}`;
    expectedFns.add(key);
    if (!def.amounts) throw new Error('missing amount table');
    def.amounts[name] = (ctx) => { calledFns.add(key); return fn(ctx); };
  }
  for (const [name, fn] of Object.entries(def.conditions ?? {})) {
    const key = `${def.id}.conditions.${name}`;
    expectedFns.add(key);
    if (!def.conditions) throw new Error('missing condition table');
    def.conditions[name] = (ctx) => { calledFns.add(key); return fn(ctx); };
  }
}
afterAll(() => expect([...calledFns].sort()).toEqual([...expectedFns].sort()));

function combat(g: Game): CombatState {
  if (!g.state.combat) throw new Error('expected combat');
  return g.state.combat;
}

/** Classes are still gated by REAL_CLASSES_READY. Build a plain sandbox state,
 * then use the real Game actions, queue, enemies and content registry. */
function sandbox(): Game {
  const state: RunState = {
    version: ENGINE_VERSION, seed: 'graft-content', classId: 'graft', rng: createStreams('graft-content'),
    act: 1, ascent: 0, difficulty: 'standard', floor: 1, phase: 'combat',
    player: { hp: 1000, maxHp: 1000, gold: 99, deck: [], relics: [], potions: [], potionSlots: 3, counters: { shards: 5 } },
    map: { act: 1, rows: [], bossEncounter: 'enc_a1_orchid' }, mapPos: null, mapPath: [], room: 'monster',
    combat: null, reward: null, shop: null, event: null, rest: null, treasure: null,
    startChoices: null, bossRelicChoices: null, queue: [], pendingChoice: null, history: { floors: [] },
    counters: { encounters: [], monstersThisAct: 0, eventsSeen: [], rarePity: 0, potionChance: 40, shopRemovals: 0 },
    nextUid: 1,
  };
  state.combat = {
    encounterId: 'enc_a1_ram', kind: 'monster', isElite: false, isBoss: false, eventId: null, onWin: [],
    turn: 1, turnPhase: 'player', outcome: null, energy: 30, maxEnergy: 3, drawPerTurn: 5, handLimit: 10,
    hand: [], draw: [], discard: [], exhaust: [], inPlay: [], primed: [], timeline: [],
    player: { block: 0, guard: 0, statuses: {} },
    enemies: [1, 2].map((uid) => ({
      uid, id: 'gnasher', hp: 10000, maxHp: 10000, block: 0, guard: 0, statuses: {},
      intent: { kind: 'attack', damage: 3, hits: 2, moveId: 'nip' }, intentTurn: 1, forecast: [],
      moveHistory: [], aiState: {}, alive: true, fled: false, leaderUid: null, withLeader: null,
      rng: createStreams(`graft-enemy-${uid}`).enemy,
    })),
    queue: [], pendingChoice: null, cardsPlayedThisTurn: [], attacksPlayedThisTurn: 0, cardsPlayedThisCombat: 0,
    reducedThisTurn: [], resolvedThisTurn: [], lastPrune: null, damageTaken: 0, counters: {}, nextEnemyUid: 3,
  };
  const g = new Game(state);
  for (let i = 0; i < 12; i++) addCard(g, 'lash', 'draw');
  state.history.floors.push(newFloorRecord(state, 'monster'));
  return g;
}

function addCard(g: Game, id: string, zone: 'hand' | 'draw' | 'discard' | 'exhaust' = 'hand', upgraded = false, bloom = 0): CardInstance {
  const card = makeCard(g.state, id, upgraded);
  if (getCardDef(id, upgraded).keywords?.includes('bloom')) card.vars = { bloom };
  g.state.player.deck.push(structuredClone(card));
  combat(g)[zone].push(card);
  return card;
}
function inHand(g: Game, uid: number): CardInstance {
  const card = combat(g).hand.find((x) => x.uid === uid);
  if (!card) throw new Error(`card ${uid} not in hand`);
  return card;
}
function play(g: Game, card: CardInstance): GameEvent[] {
  const action = g.legalActions().find((a) => a.type === 'play_card' && a.uid === card.uid);
  if (!action) throw new Error(`${card.id} cannot play: ${String(canPlayCard(g.state, card))}`);
  return g.apply(action);
}
function choose(g: Game, uid: number): GameEvent[] {
  return answerChoice(g, [uid]);
}
function settle(g: Game): GameEvent[] {
  const events: GameEvent[] = [];
  for (let i = 0; i < 40; i++) {
    if (!combat(g).pendingChoice) return events;
    const actions = g.legalActions();
    // Exercise optional Prunes by accepting the Scrap rather than declining.
    const action = actions.find((a) => a.type === 'resolve_choice' && a.uids.length > 0);
    if (!action) throw new Error('pending choice has no positive answer');
    events.push(...g.apply(action));
  }
  throw new Error('Graft choices did not settle');
}
function fire(g: Game, hook: 'onTurnStart' | 'onTurnEnd'): GameEvent[] {
  const env = makeEnv(g.state);
  dispatch(env, hook, 'player', {});
  drain(env);
  return env.events;
}
function frame(card: CardInstance): EffectFrame {
  return { src: { kind: 'card', uid: card.uid, id: card.id, upgraded: card.upgraded }, self: 'player', target: null, x: 0 };
}
function bloomPayload(effects: readonly Effect[]): { base: number; per: number }[] {
  return effects.flatMap((effect) => {
    if ('amount' in effect && typeof effect.amount === 'object' && typeof effect.amount.scale === 'object' && 'cardVar' in effect.amount.scale) {
      return [{ base: effect.amount.base ?? 0, per: effect.amount.per ?? 1 }];
    }
    return [];
  });
}

describe('Graft inventory and validation', () => {
  it('contains the full designer id list, rarity/type split, Bloom cards and Power statuses', () => {
    // v2 pool (docs/v2/graft-design.md §5): 57 cards + the Chaff token.
    expect(GRAFT_CARDS).toHaveLength(58);
    expect(GRAFT_CARDS.map((def) => def.id)).toEqual(IDS);
    expect(GRAFT_STATUSES.map((def) => def.id)).toEqual(STATUS_IDS);
    expect(['starter', 'common', 'uncommon', 'rare'].map((r) => GRAFT_CARDS.filter((c) => c.rarity === r).length)).toEqual([4, 20, 20, 13]);
    expect(['attack', 'skill', 'power', 'status'].map((t) => GRAFT_CARDS.filter((c) => c.type === t).length)).toEqual([22, 24, 11, 1]);
    expect(GRAFT_CARDS.filter((c) => c.keywords?.includes('bloom'))).toHaveLength(17);
    for (const def of GRAFT_CARDS) expect(getCardDef(def.id)).toBe(def);
    for (const def of GRAFT_STATUSES) expect(getStatusDef(def.id)).toBe(def);
  });

  it('validates every base/upgrade and every status trigger through the engine validator', () => {
    const problems: string[] = [];
    for (const base of GRAFT_CARDS) for (const upgraded of [false, true]) {
      const def = getCardDef(base.id, upgraded);
      validateEffects(def.effects, { label: def.id, tables: def, hasTarget: def.target === 'enemy', combat: true, run: false, enemy: false }, problems);
      expect(def.keywords).not.toContain('prune');
      expect(def.text.replace(/\{[^}]+\}/g, '')).not.toMatch(/\d/);
      expect(renderCardText({ id: def.id, upgraded }, null)).not.toMatch(/[{}]/);
    }
    for (const def of GRAFT_STATUSES) {
      for (const [hook, effects] of Object.entries(def.triggers ?? {})) {
        validateEffects(effects, { label: `${def.id}.${hook}`, tables: def, hasTarget: false, combat: true, run: false, enemy: true }, problems);
      }
      expect(def.text.replace(/\{[^}]+\}/g, '')).not.toMatch(/\d/);
      for (const stacks of [1, 2, 3]) expect(renderStatusText(def.id, stacks)).not.toMatch(/[{}]/);
    }
    expect(problems).toEqual([]);
  });

  it('matches the four GDD starters exactly and upgrades only Bloom increments', () => {
    for (const [id, type, base, up] of [
      ['lash', 'damage', 6, 9], ['husk', 'block', 5, 8], ['graft_hide', 'block', 5, 7],
    ] as const) {
      const a = getCardDef(id), b = getCardDef(id, true);
      expect(a.cost).toBe(1);
      expect(a.effects[0]).toMatchObject({ type, amount: base });
      expect(b.effects[0]).toMatchObject({ type, amount: up });
    }
    expect(getCardDef('graft_hide').effects[1]).toEqual({ type: 'prune', bloom: 1, variant: 'standard' });
    expect(bloomPayload(getCardDef('seed_bite').effects)).toEqual([{ base: 4, per: 1 }]); // Phase D: +2 -> +1 per Bloom
    for (const def of GRAFT_CARDS.filter((d) => d.keywords?.includes('bloom'))) {
      const base = bloomPayload(def.effects), upgrade = bloomPayload(getCardDef(def.id, true).effects);
      expect(base.length, def.id).toBeGreaterThan(0);
      expect(upgrade, def.id).toEqual(base.map(({ base: n, per }) => ({ base: n, per: per + 1 })));
    }
  });
});

describe('every Graft card plays base and upgraded', () => {
  for (const def of GRAFT_CARDS) for (const upgraded of [false, true]) {
    it(`${def.id}${upgraded ? '+' : ''}`, () => {
      const g = sandbox();
      const card = addCard(g, def.id, 'hand', upgraded, 2);
      addCard(g, 'lash'); addCard(g, 'seed_bite', 'hand', false, 2); addCard(g, 'sap_shell');
      for (const enemy of combat(g).enemies) enemy.statuses.rot = 3;
      combat(g).counters.prunes = 3;
      expect(renderCardText(card, g.state, 1)).not.toMatch(/[{}]/);
      play(g, card);
      settle(g);
      expect(combat(g).inPlay).toHaveLength(0);
      if (def.type === 'power') {
        expect(combat(g).discard.some((c) => c.uid === card.uid)).toBe(false);
        expect(combat(g).exhaust.some((c) => c.uid === card.uid)).toBe(false);
        // Resolve the Power's real event hooks without requiring gated class registration.
        fire(g, 'onTurnStart'); settle(g);
        fire(g, 'onTurnEnd'); settle(g);
      }
    });
  }
});

describe('Prune and Bloom rules', () => {
  it('standard Prune grows another copy, and v2 Shear brings its own Chaff to Prune', () => {
    const g = sandbox();
    const shear = addCard(g, 'shear'), scrap = addCard(g, 'lash'), seed = addCard(g, 'seed_bite');
    play(g, shear);
    expect(combat(g).pendingChoice?.choices).not.toContain(shear.uid);
    expect(combat(g).hand.filter((c) => c.id === 'chaff')).toHaveLength(1);
    choose(g, scrap.uid);
    expect(inHand(g, seed.uid).vars?.bloom).toBe(1);
    expect(combat(g).exhaust.map((x) => x.uid)).toContain(scrap.uid);
    expect(combat(g).counters.prunes).toBe(1);
    expect(g.state.player.deck.find((x) => x.uid === scrap.uid)).toBeDefined();
  });

  it('declining a Prune triggers nothing, and empty hands do not throw', () => {
    const g = sandbox();
    combat(g).player.statuses = { decomposer: 2, thresher: 4 };
    const hide = addCard(g, 'graft_hide'), seed = addCard(g, 'seed_bite');
    play(g, hide);
    answerChoice(g, []);
    expect(combat(g).counters.prunes ?? 0).toBe(0);
    expect(inHand(g, seed.uid).vars?.bloom).toBe(0);
    expect(combat(g).enemies.map((e) => [e.hp, e.statuses.rot ?? 0])).toEqual([[10000, 0], [10000, 0]]);
    combat(g).hand = [];
    play(g, addCard(g, 'graft_hide'));
    expect(combat(g).pendingChoice).toBeNull();
  });

  it('Prune without a hand Bloom card still Scraps and grows a pile copy (RULINGS 43)', () => {
    for (const id of ['graft_hide']) {
      const g = sandbox();
      const prune = addCard(g, id), scrap = addCard(g, 'lash'), seed = addCard(g, 'seed_bite', 'draw');
      play(g, prune); choose(g, scrap.uid);
      expect(combat(g).counters.prunes).toBe(1);
      expect(combat(g).draw.find((x) => x.uid === seed.uid)?.vars?.bloom).toBe(1);
    }
  });

  it('Spread Prune fires one Prune payoff and growth hooks for every receiving copy', () => {
    const g = sandbox();
    combat(g).player.statuses = { decomposer: 1, thresher: 3 };
    const rain = addCard(g, 'seed_rain'), scrap = addCard(g, 'lash');
    const a = addCard(g, 'seed_bite'), b = addCard(g, 'sap_shell');
    play(g, rain); choose(g, scrap.uid);
    expect(combat(g).enemies.map((e) => e.hp)).toEqual([9997, 9997]);
    expect(combat(g).enemies.reduce((sum, e) => sum + (e.statuses.rot ?? 0), 0)).toBe(1);
    expect(combat(g).counters.prunes).toBe(1);
    for (const card of [a, b]) {
      expect(inHand(g, card.uid).vars?.bloom).toBe(1);
    }
  });

  it('Prune away removes the selected deck copy, grows another, and respects the shared cap', () => {
    const g = sandbox();
    const excise = addCard(g, 'uproot'), lash = addCard(g, 'lash'), seed = addCard(g, 'seed_bite');
    play(g, excise); choose(g, lash.uid);
    expect(g.state.player.deck.some((c) => c.uid === lash.uid)).toBe(false);
    expect(inHand(g, seed.uid).vars?.bloom).toBe(1);
    const another = addCard(g, 'uproot');
    const before = g.state.player.deck.length;
    const events = play(g, another);
    expect(combat(g).pendingChoice).toBeNull();
    expect(g.state.player.deck).toHaveLength(before);
    expect(events).toContainEqual({ t: 'cap_hit', cap: 'cap_prune_away' });
    expect(combat(g).exhaust.map((c) => c.uid)).toEqual(expect.arrayContaining([excise.uid, another.uid]));
  });

  it('Bound cards can be Scrapped by standard Prune but cannot be Pruned away', () => {
    for (const away of [false, true]) {
      const g = sandbox();
      const prune = addCard(g, away ? 'uproot' : 'graft_hide');
      const burden = addCard(g, 'curse_burden'), seed = addCard(g, 'seed_bite');
      play(g, prune);
      if (away) expect(combat(g).pendingChoice?.choices).not.toContain(burden.uid);
      else {
        choose(g, burden.uid);
        expect(inHand(g, seed.uid).vars?.bloom).toBe(1);
        expect(combat(g).exhaust.some((card) => card.uid === burden.uid)).toBe(true);
        expect(g.state.player.deck.some((card) => card.uid === burden.uid)).toBe(true);
      }
    }
  });

  it('growth is permanent on the live deck copy, capped, and never caused by playing Bloom', () => {
    const g = sandbox();
    const seed = addCard(g, 'seed_bite', 'hand', false, 9);
    const sap = addCard(g, 'sap_drip', 'hand', true);
    play(g, sap); settle(g);
    expect(inHand(g, seed.uid).vars?.bloom).toBe(10);
    const target = combat(g).enemies[0];
    if (!target) throw new Error('missing target');
    const before = target.hp;
    play(g, inHand(g, seed.uid));
    expect(combat(g).enemies[0]?.hp).toBe(before - 14); // Phase D: 4 + 1 per Bloom at Bloom 10
    // v2: Seed Bite is Ripe at 10, so its Prune opens; decline it.
    answerChoice(g, []);
    expect(combat(g).discard.find((c) => c.uid === seed.uid)?.vars?.bloom).toBe(10);
    // Engine deck-count scales use this live combat var before final persistence sync.
    const canopy = addCard(g, 'canopy_crush');
    expect(renderCardText(canopy, g.state, 1)).toContain('(11)'); // Phase D: 6 + half of 10 Bloom
  });
});

describe('custom effects and Power hooks', () => {
  for (const upgraded of [false, true]) for (const sourceUpgraded of [false, true]) {
    it(`Propagate${upgraded ? '+' : ''} copies ${sourceUpgraded ? 'upgraded' : 'base'} Bloom into only the run deck with half its Bloom`, () => {
      const g = sandbox();
      const propagate = addCard(g, 'propagate', 'hand', upgraded);
      const seed = addCard(g, 'seed_bite', 'hand', sourceUpgraded, 7);
      const before = g.state.player.deck.length;
      play(g, propagate); settle(g);
      const copy = g.state.player.deck.at(-1);
      expect(g.state.player.deck).toHaveLength(before + 1);
      expect(copy).toMatchObject({ id: 'seed_bite', upgraded: upgraded || sourceUpgraded });
      expect(copy?.uid).not.toBe(seed.uid);
      expect(copy?.vars?.bloom).toBe(3); // v2: half of 7, round down
      const c = combat(g);
      expect([...c.hand, ...c.draw, ...c.discard, ...c.exhaust, ...c.inPlay].some((card) => card.uid === copy?.uid)).toBe(false);
      const hive = addCard(g, 'hivestrike');
      expect(renderCardText(hive, g.state, 1)).toContain('(8)'); // Phase F: 7 + half of 2 Bloom cards
      expect(inHand(g, seed.uid).vars?.bloom).toBe(7);
    });
  }

  it('Propagate can make a permanent copy of a temporary Bloom card, and does nothing without a Bloom target', () => {
    const g = sandbox();
    const propagate = addCard(g, 'propagate');
    const temp = makeCard(g.state, 'seed_bite');
    temp.vars = { bloom: 4 };
    combat(g).hand.push(temp);
    play(g, propagate); settle(g);
    expect(g.state.player.deck.at(-1)).toMatchObject({ id: 'seed_bite', upgraded: false });
    expect(g.state.player.deck.at(-1)?.vars?.bloom).toBe(2); // v2: half of 4
    combat(g).hand = [];
    const empty = addCard(g, 'propagate', 'hand', true);
    const before = g.state.player.deck.length;
    play(g, empty);
    expect(combat(g).pendingChoice).toBeNull();
    expect(g.state.player.deck).toHaveLength(before);
  });

  it('Crystal Graft spends exactly one Shard and checks eligible copies', () => {
    const g = sandbox();
    const crystal = addCard(g, 'crystal_graft'), seed = addCard(g, 'seed_bite');
    g.state.player.counters.shards = 0;
    expect(canPlayCard(g.state, crystal)).toMatch(/Shard/);
    g.state.player.counters.shards = 2;
    inHand(g, seed.uid).vars = { bloom: 10 };
    expect(canPlayCard(g.state, crystal)).toBe('Needs a Shard and a Bloom card');
    inHand(g, seed.uid).vars = { bloom: 0 };
    play(g, crystal); settle(g);
    expect(g.state.player.counters.shards).toBe(1);
    expect(inHand(g, seed.uid).vars?.bloom).toBe(3);
  });

  it('Ripening Rot grows only living rotting enemies, stacks additively, and obeys the Rot cap', () => {
    const g = sandbox();
    play(g, addCard(g, 'ripening_rot'));
    play(g, addCard(g, 'ripening_rot', 'hand', true));
    const [a, b] = combat(g).enemies;
    if (!a || !b) throw new Error('missing enemies');
    a.statuses.rot = 14;
    const dead = structuredClone(a); dead.uid = 3; dead.alive = false; dead.statuses.rot = 4;
    combat(g).enemies.push(dead);
    fire(g, 'onTurnStart');
    expect(combat(g).enemies.map((enemy) => enemy.statuses.rot ?? 0)).toEqual([15, 0, 4]);
  });

  for (const id of ['thorn_halo', 'thresher']) for (const upgraded of [false, true]) {
    it(`${id}${upgraded ? '+' : ''} snapshots Bloom on play and adds another copy's independent snapshot`, () => {
      const g = sandbox();
      const power = addCard(g, id, 'hand', upgraded, 4);
      play(g, power);
      // Base 4 (Thorn Halo) / 5 (Thresher, Phase E) at Bloom 4: +1 per Bloom, +2 upgraded. The second copy is Bloom 2.
      const first = (upgraded ? 12 : 8) + (id === 'thresher' ? 2 : 0); // Thresher base 6 (Phase E2)
      const second = 6 + (id === 'thresher' ? 2 : 0);
      expect(combat(g).player.statuses[id]).toBe(first);
      // A future deck-copy edit cannot change the already running Power.
      const deckCopy = g.state.player.deck.find((c) => c.uid === power.uid);
      if (!deckCopy) throw new Error('missing power deck copy');
      deckCopy.vars = { bloom: 10 };
      play(g, addCard(g, id, 'hand', false, 2));
      expect(combat(g).player.statuses[id]).toBe(first + second);
      const before = combat(g).enemies.reduce((sum, enemy) => sum + enemy.hp, 0);
      if (id === 'thorn_halo') fire(g, 'onTurnStart');
      else {
        const prune = addCard(g, 'graft_hide'), scrap = addCard(g, 'lash');
        play(g, prune); choose(g, scrap.uid);
      }
      const after = combat(g).enemies.reduce((sum, enemy) => sum + enemy.hp, 0);
      expect(before - after).toBe((first + second) * (id === 'thresher' ? 2 : 1));
    });
  }

  it('Dusk Pruning queues optional choices at turn end before the hand is discarded', () => {
    const g = sandbox();
    play(g, addCard(g, 'dusk_pruning'));
    const lash = addCard(g, 'lash'), thorn = addCard(g, 'patient_thorn');
    fire(g, 'onTurnEnd');
    expect(combat(g).pendingChoice?.resume.op).toBe('prune_scrap');
    expect(combat(g).hand.map((c) => c.uid)).toEqual([lash.uid, thorn.uid]);
    choose(g, lash.uid);
    expect(inHand(g, thorn.uid).vars?.bloom).toBe(1);
    expect(combat(g).pendingChoice).toBeNull();
  });

  it('the actual end-turn action suspends on Dusk Pruning and can be saved mid-choice', () => {
    const g = sandbox();
    play(g, addCard(g, 'dusk_pruning'));
    const lash = addCard(g, 'lash'), thorn = addCard(g, 'patient_thorn');
    g.apply({ type: 'end_turn' });
    const loaded = Game.load(g.save());
    expect(combat(loaded).pendingChoice?.resume.op).toBe('prune_scrap');
    expect(combat(loaded).hand.map((card) => card.uid)).toEqual([lash.uid, thorn.uid]);
    expect(combat(loaded).queue.length).toBeGreaterThan(0);
  });

  it('Living Hedge and Hyphal Web count Bloom deck copies at zero Bloom and in the Scrapheap', () => {
    for (const n of [9, 10]) { // Phase D: Hedge gives half the Bloom cards; Hyphal's wide draw needs 10
      const g = sandbox();
      play(g, addCard(g, 'living_hedge'));
      play(g, addCard(g, 'hyphal_web', 'hand', true));
      for (let i = 0; i < n; i++) addCard(g, 'seed_bite', 'exhaust');
      fire(g, 'onTurnStart');
      expect(combat(g).player.block).toBe(Math.floor(n / 2));
      expect(combat(g).hand).toHaveLength(n >= 10 ? 2 : 1);
      expect(combat(g).counters.effectDraw).toBe(n >= 10 ? 2 : 1);
    }
  });

  it('Humus Rite counts the Scrapheap before its own Scrap', () => {
    const g = sandbox();
    for (let i = 0; i < 4; i++) addCard(g, 'lash', 'exhaust');
    const seed = addCard(g, 'seed_bite');
    play(g, addCard(g, 'humus_rite')); settle(g);
    expect(inHand(g, seed.uid).vars?.bloom).toBe(4);
    expect(combat(g).exhaust).toHaveLength(5);
  });

  it('Reaping Vine counts its own successful Prune but does not count a declined one', () => {
    for (const accept of [false, true]) {
      const g = sandbox();
      combat(g).counters.prunes = 2;
      const vine = addCard(g, 'reaping_vine'), scrap = addCard(g, 'lash');
      play(g, vine);
      answerChoice(g, accept ? [scrap.uid] : []);
      expect(combat(g).enemies[0]?.hp).toBe(10000 - (accept ? 15 : 10)); // 5 per Prune (Phase E2)
      expect(combat(g).counters.prunes).toBe(accept ? 3 : 2);
    }
  });

  it('Shed Husk cannot reuse the type of an earlier Prune after declining its own Scrap', () => {
    const g = sandbox();
    combat(g).lastPrune = { uid: 9999, cardId: 'status_jitter', type: 'status' };
    combat(g).counters.prunes = 1;
    const shed = addCard(g, 'shed_husk'); addCard(g, 'seed_bite');
    const before = combat(g).draw.length;
    play(g, shed); answerChoice(g, []);
    expect(combat(g).draw).toHaveLength(before);
  });

  for (const id of ['status_jitter', 'curse_guilt']) {
    it(`Shed Husk draws when its own Prune Scraps ${id}`, () => {
      const g = sandbox();
      const shed = addCard(g, 'shed_husk'), scrap = addCard(g, id), seed = addCard(g, 'seed_bite');
      const before = combat(g).draw.length;
      play(g, shed); choose(g, scrap.uid);
      expect(inHand(g, seed.uid).vars?.bloom).toBe(1);
      expect(combat(g).draw).toHaveLength(before - 1); // Phase D: draw 2 -> 1
    });
  }
});

describe('Rot and deck-scaled effects', () => {
  it('v2 Sporeburst Harvests 2 on every enemy through Block and Guard, then re-sows Rot', () => {
    const g = sandbox();
    const target = combat(g).enemies[0];
    if (!target) throw new Error('missing target');
    target.statuses = { rot: 5, exposed: 3 }; target.block = 20; target.guard = 20;
    play(g, addCard(g, 'sporeburst', 'hand', true));
    // 10 HP lost, Rot 5 -> 2 (halved) -> 5 (+3). The clean enemy is not Harvested, only sown.
    expect(combat(g).enemies[0]).toMatchObject({ hp: 9990, block: 20, guard: 20, statuses: { rot: 5 } });
    expect(combat(g).enemies[1]).toMatchObject({ hp: 10000, statuses: { rot: 3 } });
  });

  it('Death Cap applies 15 Rot to a rotting enemy (6 to a clean one), a capped normal status', () => {
    for (const rotting of [false, true]) {
      const g = sandbox();
      const target = combat(g).enemies[0];
      if (!target) throw new Error('missing target');
      if (rotting) target.statuses.rot = 2;
      play(g, addCard(g, 'death_cap'));
      expect(combat(g).enemies[0]?.statuses.rot ?? 0).toBe(rotting ? 15 : 6); // Phase E: a clean enemy gets 6
    }
  });

  it('Rot granted by the pack ticks after only its holder, ignores defence, and grows', () => {
    const g = sandbox();
    play(g, addCard(g, 'spore_haze'));
    const [a, b] = combat(g).enemies;
    if (!a || !b) throw new Error('missing enemies');
    a.block = a.guard = 100;
    const env = makeEnv(g.state);
    tickEntity(env, a.uid, 'end_own_turn'); drain(env);
    expect(a.hp).toBe(9998); expect(a.statuses.rot).toBe(3);
    expect(b.hp).toBe(10000); expect(b.statuses.rot).toBe(2);
  });

  it('deck-size and Bloom counts include Scrapped copies and see Prune away immediately', () => {
    const g = sandbox();
    addCard(g, 'seed_bite', 'exhaust', false, 4);
    addCard(g, 'sap_shell', 'draw', false, 3);
    const hive = addCard(g, 'hivestrike'), canopy = addCard(g, 'canopy_crush');
    expect(renderCardText(hive, g.state, 1)).toContain('(8)'); // Phase F: 7 + half of 2 Bloom cards
    expect(renderCardText(canopy, g.state, 1)).toContain('(9)'); // Phase D: 6 + half of 7 Bloom
    const excise = addCard(g, 'uproot'), victim = addCard(g, 'barb_flick');
    const n = g.state.player.deck.length;
    play(g, excise); choose(g, victim.uid); settle(g);
    expect(g.state.player.deck).toHaveLength(n - 1);
  });

});
