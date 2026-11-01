// Graft v2 mechanics (docs/v2/graft-design.md §2, §7; RULINGS 51–54): Spill, Ripe, Harvest, Chaff,
// Clear-Cut, Deep Rot, Rootstock, Perennial, Second Flush and the reworked Ripe cards.
import { describe, expect, it } from 'vitest';
import { getCardDef } from '../../src/content';
import { Game, renderCardText } from '../../src/engine';
import { addBloom } from '../../src/engine/bloom';
import { canPlayCard, effectiveBloomOf, getCardCost, isRipe, makeCard } from '../../src/engine/cards';
import { makeEnv } from '../../src/engine/core';
import { newFloorRecord } from '../../src/engine/history';
import { classCardPool } from '../../src/engine/items';
import { drain } from '../../src/engine/queue';
import { createStreams } from '../../src/engine/rng';
import { dispatch } from '../../src/engine/statuses';
import { applyTuningOverrides, TUNING } from '../../src/engine/tuning';
import { ENGINE_VERSION } from '../../src/engine/version';
import type { CardInstance, CombatState, GameEvent, RunState } from '../../src/engine/types';
import { answerChoice } from '../answer-choice';

function combat(g: Game): CombatState {
  if (!g.state.combat) throw new Error('expected combat');
  return g.state.combat;
}

/** Plain sandbox combat against two big Gnashers (same shape as tests/content/graft.test.ts). */
function sandbox(enemyHp = 10000): Game {
  const state: RunState = {
    version: ENGINE_VERSION, seed: 'graft-v2', classId: 'graft', rng: createStreams('graft-v2'),
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
      uid, id: 'gnasher', hp: enemyHp, maxHp: enemyHp, block: 0, guard: 0, statuses: {},
      intent: { kind: 'attack', damage: 3, hits: 2, moveId: 'nip' }, intentTurn: 1, forecast: [],
      moveHistory: [], aiState: {}, alive: true, fled: false, leaderUid: null, withLeader: null,
      rng: createStreams(`graft-v2-enemy-${uid}`).enemy,
    })),
    queue: [], pendingChoice: null, cardsPlayedThisTurn: [], attacksPlayedThisTurn: 0, cardsPlayedThisCombat: 0,
    reducedThisTurn: [], resolvedThisTurn: [], lastPrune: null, damageTaken: 0, counters: {}, nextEnemyUid: 3,
  };
  const g = new Game(state);
  for (let i = 0; i < 12; i++) addCard(g, 'lash', 'draw');
  state.history.floors.push(newFloorRecord(state, 'monster'));
  return g;
}

/** A deck card with its combat copy in `zone` (zone 'deck' = run deck only, in no combat pile). */
function addCard(g: Game, id: string, zone: 'hand' | 'draw' | 'discard' | 'exhaust' | 'deck' = 'hand', upgraded = false, bloom = 0): CardInstance {
  const card = makeCard(g.state, id, upgraded);
  if (getCardDef(id, upgraded).keywords?.includes('bloom')) card.vars = { bloom };
  g.state.player.deck.push(structuredClone(card));
  if (zone === 'deck') return g.state.player.deck[g.state.player.deck.length - 1] as CardInstance;
  combat(g)[zone].push(card);
  return card;
}
function find(g: Game, uid: number): CardInstance {
  const c = combat(g);
  const card = [...c.hand, ...c.draw, ...c.discard, ...c.exhaust, ...c.inPlay].find((x) => x.uid === uid) ?? g.state.player.deck.find((x) => x.uid === uid);
  if (!card) throw new Error(`card ${uid} not found`);
  return card;
}
function bloom(g: Game, uid: number): number {
  return find(g, uid).vars?.bloom ?? 0; // ungrown copies hold no var
}
function play(g: Game, card: CardInstance, target?: number): GameEvent[] {
  const action = g.legalActions().find((a) => a.type === 'play_card' && a.uid === card.uid && (target === undefined || a.target === target));
  if (!action) throw new Error(`${card.id} cannot play: ${String(canPlayCard(g.state, card))}`);
  return g.apply(action);
}
function choose(g: Game, ...uids: number[]): GameEvent[] {
  return answerChoice(g, uids);
}
function enemy(g: Game, i: number) {
  const e = combat(g).enemies[i];
  if (!e) throw new Error(`no enemy ${i}`);
  return e;
}

describe('Spill (RULINGS 51)', () => {
  it('Bloom over a cap spills once to the least-grown uncapped Bloom card in the deck', () => {
    const g = sandbox();
    const deep = addCard(g, 'deep_graft'), fodder = addCard(g, 'lash');
    const tall = addCard(g, 'seed_bite', 'hand', false, 9);
    const small = addCard(g, 'sap_shell', 'draw', false, 1);
    addCard(g, 'thornwhirl', 'discard', false, 4);
    const events = play(g, deep);
    events.push(...choose(g, fodder.uid));
    expect(bloom(g, tall.uid)).toBe(10);
    expect(bloom(g, small.uid)).toBe(2);
    expect(events.some((e) => e.t === 'bloom' && e.uid === small.uid && e.spill === true)).toBe(true);
  });

  it('a Prune with no eligible card in hand or piles spills into the deck (Scrapheap or deck-only copies)', () => {
    const g = sandbox();
    const hide = addCard(g, 'graft_hide'), fodder = addCard(g, 'lash');
    const scrapped = addCard(g, 'barb_flick', 'exhaust', false, 3);
    play(g, hide); choose(g, fodder.uid);
    expect(bloom(g, scrapped.uid)).toBe(4);
  });

  it('with Spill off (bloomSpill = 0) the overflow is lost and counted as a cap hit', () => {
    const undo = applyTuningOverrides({ bloomSpill: 0 });
    try {
      const g = sandbox();
      const card = addCard(g, 'seed_bite', 'hand', false, 9);
      const small = addCard(g, 'sap_shell', 'draw', false, 0);
      const env = makeEnv(g.state);
      addBloom(env, card, 3);
      drain(env);
      expect(bloom(g, card.uid)).toBe(10);
      expect(bloom(g, small.uid)).toBe(0);
      expect(combat(g).counters['cap:cap_stacks']).toBe(1);
    } finally {
      undo();
    }
  });

  it('when every Bloom card is capped the spill is lost (cap_stacks), never looping', () => {
    const g = sandbox();
    const a = addCard(g, 'seed_bite', 'hand', false, 10);
    addCard(g, 'sap_shell', 'draw', false, 10);
    const env = makeEnv(g.state);
    addBloom(env, a, 2);
    drain(env);
    expect(combat(g).counters['cap:cap_stacks']).toBe(1);
  });
});

describe('Ripe', () => {
  it('a copy is Ripe at TUNING.bloomRipe and onRipe fires once, on the crossing', () => {
    const g = sandbox();
    const seed = addCard(g, 'seed_bite', 'hand', false, TUNING.bloomRipe - 1);
    expect(isRipe(g.state, seed)).toBe(false);
    const env = makeEnv(g.state);
    let fired = 0;
    const before = env.events.length;
    addBloom(env, seed, 1);
    addBloom(env, seed, -1);
    addBloom(env, seed, 1);
    drain(env);
    for (const e of env.events.slice(before)) if (e.t === 'bloom' && e.now === TUNING.bloomRipe && e.delta > 0) fired += 1;
    expect(fired).toBe(2); // each upward crossing (onRipe is dispatched on these same crossings)
    expect(isRipe(g.state, seed)).toBe(true);
    expect(isRipe(g.state, addCard(g, 'lash'))).toBe(false); // only Bloom cards ripen
  });

  it('Seed Bite Prunes only when Ripe', () => {
    const g = sandbox();
    const green = addCard(g, 'seed_bite', 'hand', false, 9);
    addCard(g, 'lash');
    play(g, green);
    expect(combat(g).pendingChoice).toBeNull();
    const ripe = addCard(g, 'seed_bite', 'hand', false, 10);
    const target = addCard(g, 'sap_shell', 'hand', false, 0);
    const fodder = addCard(g, 'lash');
    play(g, ripe);
    expect(combat(g).pendingChoice?.choices).toContain(fodder.uid);
    choose(g, fodder.uid);
    expect(bloom(g, target.uid)).toBe(1);
  });

  it('Barb Flick draws, Twin Thorn hits once more and Heartwood Spear costs 2 less when Ripe', () => {
    const g = sandbox();
    const flick = addCard(g, 'barb_flick', 'hand', false, 10);
    const hand = combat(g).hand.length;
    play(g, flick);
    expect(combat(g).hand.length).toBe(hand); // played one, drew one
    const thorn = addCard(g, 'twin_thorn', 'hand', false, 10);
    const hp = enemy(g, 0).hp;
    play(g, thorn, 1);
    expect(hp - enemy(g, 0).hp).toBe(24 * 3); // base 4 (+2 per Bloom) at Bloom 10, three hits
    const spear = addCard(g, 'heartwood_spear', 'hand', false, 10);
    expect(getCardCost(g.state, spear)).toBe(0);
    const green = addCard(g, 'heartwood_spear', 'hand', false, 9);
    expect(getCardCost(g.state, green)).toBe(2);
    expect(renderCardText(spear, g.state, 1)).toContain('Ripe: costs 2 less');
  });
});

describe('Harvest', () => {
  it('Burst Pod: sows 2 Rot, then HP loss of 2 × Rot through Block and Guard, then the Rot halves (round down)', () => {
    const g = sandbox();
    const e = enemy(g, 0);
    e.statuses.rot = 9; e.block = 50; e.guard = 50;
    play(g, addCard(g, 'burst_pod'), 1);
    expect(enemy(g, 0)).toMatchObject({ hp: 10000 - 33, block: 50, guard: 50, statuses: { rot: 5 } }); // Harvest 3 (Phase E2)
  });

  it('Harvest does nothing to an enemy without Rot; Burst Pod sows first, so it is never dead (Phase E)', () => {
    const g = sandbox();
    play(g, addCard(g, 'reap'), 1);
    expect(enemy(g, 0).hp).toBe(10000 - 10);
    expect(enemy(g, 0).statuses.rot).toBeUndefined();
    play(g, addCard(g, 'burst_pod'), 1);
    expect(enemy(g, 0).hp).toBe(10000 - 10 - 6);
    expect(enemy(g, 0).statuses.rot).toBe(1);
  });

  it('a Harvest kill spreads the full pre-halving stack (RULINGS 53)', () => {
    const g = sandbox(30);
    enemy(g, 0).statuses.rot = 15;
    play(g, addCard(g, 'burst_pod'), 1);
    expect(enemy(g, 0).alive).toBe(false);
    expect(enemy(g, 1).statuses.rot).toBe(7); // floor(15 / 2), not floor(7 / 2)
  });

  it('Reap hits first, then Harvests 3; Grim Harvest Keeps, sows and Harvests 4 (5 upgraded)', () => {
    const g = sandbox();
    enemy(g, 0).statuses.rot = 6;
    play(g, addCard(g, 'reap'), 1);
    expect(enemy(g, 0)).toMatchObject({ hp: 10000 - 10 - 18, statuses: { rot: 3 } });
    expect(getCardDef('grim_harvest').keywords).toContain('retain');
    enemy(g, 0).statuses.rot = 10;
    const hp = enemy(g, 0).hp;
    play(g, addCard(g, 'grim_harvest', 'hand', true), 1);
    expect(hp - enemy(g, 0).hp).toBe(65); // sows 3 first: 13 × 5 (Phase E2)
    expect(enemy(g, 0).statuses.rot).toBe(6);
  });

  it('Harvest text renders its multiplier and the Harvest keyword', () => {
    const g = sandbox();
    expect(renderCardText(addCard(g, 'burst_pod'), g.state, 1)).toBe('Apply 2 Rot. Harvest 3. Scrap.');
  });
});

describe('Chaff and Clear-Cut', () => {
  it('Molt adds two Chaff (Status cards); Chaff is 0-cost Block that Scraps; Shed Husk draws when it Prunes Chaff', () => {
    const g = sandbox();
    play(g, addCard(g, 'molt'));
    const chaff = combat(g).hand.filter((c) => c.id === 'chaff');
    expect(chaff).toHaveLength(2); // Phase F: 3 -> 2
    expect(getCardDef('chaff').type).toBe('status');
    const first = chaff[0] as CardInstance, second = chaff[1] as CardInstance;
    const block = combat(g).player.block;
    play(g, first);
    expect(combat(g).player.block).toBe(block + 3);
    expect(combat(g).exhaust.some((c) => c.uid === first.uid)).toBe(true);
    const shed = addCard(g, 'shed_husk');
    const hand = combat(g).hand.length;
    play(g, shed); choose(g, second.uid);
    expect(combat(g).hand.length).toBe(hand - 2 + 1); // Phase D: Shed Husk draws 1
    // Chaff is created in combat: it never joins the run deck.
    expect(g.state.player.deck.some((c) => c.id === 'chaff')).toBe(false);
  });

  it('Clear-Cut (Phase E): Pruning a Status card Prunes again; a real card ends the chain', () => {
    const g = sandbox();
    play(g, addCard(g, 'clear_cut'));
    play(g, addCard(g, 'decomposer'));
    const target = addCard(g, 'seed_bite', 'hand', false, 0);
    const c1 = makeCard(g.state, 'chaff'), c2 = makeCard(g.state, 'chaff');
    combat(g).hand.push(c1, c2);
    const lash = addCard(g, 'lash');
    play(g, addCard(g, 'graft_hide'));
    expect(combat(g).pendingChoice?.max).toBe(1);
    choose(g, c1.uid);
    expect(combat(g).pendingChoice?.choices).toContain(c2.uid); // the Status Prune opened another
    choose(g, c2.uid);
    choose(g, lash.uid);
    expect(combat(g).pendingChoice).toBeNull(); // Lash is not a Status: no further Prune
    expect(combat(g).counters.prunes).toBe(3);
    expect(bloom(g, target.uid)).toBe(3);
    const rot = (enemy(g, 0).statuses.rot ?? 0) + (enemy(g, 1).statuses.rot ?? 0);
    expect(rot).toBe(3); // Decomposer: 1 Rot per Prune
  });

  it('Chaff is never offered: it is in no class pool of any rarity', () => {
    for (const rarity of ['starter', 'common', 'uncommon', 'rare', 'special'] as const) {
      expect(classCardPool('graft', rarity).some((c) => c.id === 'chaff')).toBe(false);
    }
  });

  it('without Clear-Cut a Prune still Scraps at most one card', () => {
    const g = sandbox();
    addCard(g, 'lash'); addCard(g, 'husk');
    play(g, addCard(g, 'graft_hide'));
    expect(combat(g).pendingChoice?.max).toBe(1);
  });
});

describe('Deep Rot, Rootstock, Perennial, Second Flush', () => {
  it('Deep Rot lifts the Rot cap on enemies only', () => {
    const g = sandbox();
    enemy(g, 0).statuses.rot = 15;
    play(g, addCard(g, 'deep_rot'));
    play(g, addCard(g, 'death_cap'), 1);
    expect(enemy(g, 0).statuses.rot).toBe(30);
  });

  it('Rootstock: Bloom numbers and Ripe use the deck maximum; real Bloom, growth and counts do not change', () => {
    const g = sandbox();
    addCard(g, 'seed_bite', 'deck', false, 10);
    const flick = addCard(g, 'barb_flick', 'hand', false, 0);
    expect(effectiveBloomOf(g.state, flick)).toBe(0);
    play(g, addCard(g, 'rootstock'));
    const live = find(g, flick.uid);
    expect(effectiveBloomOf(g.state, live)).toBe(10);
    expect(isRipe(g.state, live)).toBe(true);
    expect(renderCardText(live, g.state, 1)).toContain('Deal 12');
    const hp = enemy(g, 0).hp;
    play(g, flick, 1);
    expect(hp - enemy(g, 0).hp).toBe(12); // Phase D: Barb Flick base 2
    expect(bloom(g, flick.uid)).toBe(0);
  });

  it('Perennial lifts every Bloom card by 2 (numbers and Ripe) without changing real Bloom', () => {
    const g = sandbox();
    const flick = addCard(g, 'barb_flick', 'hand', false, 8);
    expect(isRipe(g.state, flick)).toBe(false);
    play(g, addCard(g, 'perennial'));
    const live = find(g, flick.uid);
    expect(effectiveBloomOf(g.state, live)).toBe(10);
    expect(isRipe(g.state, live)).toBe(true);
    expect(bloom(g, flick.uid)).toBe(8);
  });

  it('Perennial returns a Ripe card once per card per turn, and never a green one', () => {
    const g = sandbox();
    play(g, addCard(g, 'perennial'));
    const ripe = addCard(g, 'barb_flick', 'hand', false, 10);
    const green = addCard(g, 'barb_flick', 'hand', false, 2); // 4 effective with Perennial: still green
    play(g, ripe, 1);
    expect(combat(g).hand.some((c) => c.uid === ripe.uid)).toBe(true);
    play(g, ripe, 1);
    expect(combat(g).discard.some((c) => c.uid === ripe.uid)).toBe(true);
    play(g, green, 1);
    expect(combat(g).discard.some((c) => c.uid === green.uid)).toBe(true);
    // A new turn resets it.
    combat(g).turn += 1;
    combat(g).hand.push(combat(g).discard.splice(combat(g).discard.findIndex((c) => c.uid === ripe.uid), 1)[0] as CardInstance);
    play(g, ripe, 1);
    expect(combat(g).hand.some((c) => c.uid === ripe.uid)).toBe(true);
  });

  it('Second Flush fetches the most-grown Bloom card from the discard pile, free only if Ripe', () => {
    const g = sandbox();
    const spear = addCard(g, 'heartwood_spear', 'discard', false, 10);
    addCard(g, 'seed_bite', 'discard', false, 3);
    addCard(g, 'lash', 'discard');
    play(g, addCard(g, 'second_flush'));
    expect(combat(g).hand.some((c) => c.uid === spear.uid)).toBe(true);
    expect(getCardCost(g.state, find(g, spear.uid))).toBe(0); // Game.apply clones state: re-find
    const g2 = sandbox();
    const seed = addCard(g2, 'seed_bite', 'discard', false, 4);
    play(g2, addCard(g2, 'second_flush'));
    expect(getCardCost(g2.state, find(g2, seed.uid))).toBe(1);
    const g3 = sandbox();
    play(g3, addCard(g3, 'second_flush')); // empty: no Bloom card in the discard pile
    expect(combat(g3).pendingChoice).toBeNull();
  });

  it('Thornstorm hits every enemy X times', () => {
    const g = sandbox();
    combat(g).energy = 3;
    play(g, addCard(g, 'thornstorm', 'hand', false, 2));
    expect(10000 - enemy(g, 0).hp).toBe(21);
    expect(10000 - enemy(g, 1).hp).toBe(21);
  });
});

describe('hooks are wired', () => {
  it('onRipe and onHarvest are dispatchable hook names', () => {
    const g = sandbox();
    const env = makeEnv(g.state);
    const card = addCard(g, 'seed_bite', 'hand', false, 10);
    dispatch(env, 'onRipe', 'player', { card });
    dispatch(env, 'onHarvest', 'player', { uid: 1, rot: 4, hpLost: 8 });
    drain(env);
    expect(combat(g).outcome).toBeNull();
  });
});
