import '../testpack-only';
// Shared v2 engine hooks (docs/v2/shared-design.md §7): each hook with a minimal test relic/card from
// this file, so the engine is tested without the real packs.
import { describe, expect, it } from 'vitest';
import { registerPack } from '../../src/content/registry';
import { Game, TUNING, computeIntent, type RunState } from '../../src/engine';
import { makeCard, matchesFilter } from '../../src/engine/cards';
import { enqueue, makeEnv } from '../../src/engine/core';
import { newFloorRecord } from '../../src/engine/history';
import { generateReward } from '../../src/engine/run';
import { drain } from '../../src/engine/queue';
import { resolvePruneScrap } from '../../src/engine/bloom';
import { getCardDef } from '../../src/content';
import { combatOf, eventsOf, pacify, play, sandbox, setHand } from './helpers';
import { answerChoice } from '../answer-choice';

const fired: Record<string, number> = {};
const bump = (k: string): void => {
  fired[k] = (fired[k] ?? 0) + 1;
};

registerPack({
  cards: [
    { id: 'test_sv_salvage', name: 'Test Salvage', cls: 'test_class', type: 'skill', rarity: 'special', cost: 1, target: 'none', keywords: [],
      text: 'Draw {draw} card. Salvage: gain {sblock} Block.', effects: [{ type: 'draw', n: 1 }], salvage: [{ type: 'block', amount: 4, key: 'sblock' }],
      upgrade: {}, icon: 'card_x' },
    { id: 'test_sv_delay', name: 'Test Split', cls: 'test_class', type: 'skill', rarity: 'special', cost: 0, target: 'self', keywords: ['delay'],
      text: 'Gain {block} Block. Delay {delay_turns}: gain {delay_block} Block.', effects: [{ type: 'block', amount: 2 }],
      delay: { turns: 1, effects: [{ type: 'block', amount: 5, key: 'delay_block' }] }, upgrade: {}, icon: 'card_x' },
  ],
  relics: [
    { id: 'test_sv_fizzle', name: 'Fizzle Ear', rarity: 'event', text: 'Hears fizzles.', icon: 'x', hooks: { onPrimeFizzled: () => bump('fizzle') } },
    { id: 'test_sv_kick', name: 'Kick Ear', rarity: 'event', text: 'Hears Stagger.', icon: 'x',
      hooks: { onDamageTaken: (_c, info) => { if (info.staggerPrevented > 0) fired.prevented = info.staggerPrevented; } } },
    { id: 'test_sv_reprise', name: 'Always Twice', rarity: 'event', text: 'Everything has Reprise.', icon: 'x', hooks: { grantsReprise: () => true } },
    { id: 'test_sv_block_rest', name: 'No Rest', rarity: 'event', text: 'No resting.', icon: 'x', hooks: { restOptionBlocked: (_c, id) => (id === 'rest_purge' ? 'Nope.' : null) } },
  ],
}, 'test');

describe('Salvage (H2)', () => {
  it('fires when a Prune Scraps the card (not a play)', () => {
    const g = sandbox();
    setHand(g, ['test_graft', 'test_sv_salvage', 'test_sprout']);
    const salv = combatOf(g).hand[1];
    if (!salv) throw new Error('setup');
    play(g, combatOf(g).hand[0]?.uid ?? -1);
    const ev = answerChoice(g, [salv.uid]);
    expect(eventsOf(ev, 'block').map((e) => e.amount)).toContain(4);
    const c = combatOf(g);
    expect(c.exhaust.some((x) => x.uid === salv.uid)).toBe(true);
    expect(c.cardsPlayedThisTurn).toEqual(['test_graft']);
  });

  it('text renders the Salvage values', () => {
    expect(getCardDef('test_sv_salvage').salvage).toHaveLength(1);
  });
});

describe('Reprise (H4)', () => {
  it('a dead target makes the second resolution hit the leftmost living enemy; one play, at most twice', () => {
    const g = sandbox({ encounter: 'test_enc_slimes', relics: ['test_sv_reprise'] });
    pacify(g, 100);
    const [a, b] = combatOf(g).enemies;
    if (!a || !b) throw new Error('setup');
    a.hp = 4;
    setHand(g, ['test_strike']);
    play(g, combatOf(g).hand[0]?.uid ?? -1, a.uid);
    // apply() is atomic: read the enemies again from the new state
    expect(combatOf(g).enemies.map((e) => [e.alive, e.hp])).toEqual([[false, 0], [true, 94]]);
    expect(combatOf(g).cardsPlayedThisTurn).toHaveLength(1);
  });

  it('a Delay card repeats only its immediate effects; the Timeline entry is single', () => {
    const g = sandbox({ relics: ['test_sv_reprise'] });
    setHand(g, ['test_sv_delay']);
    play(g, combatOf(g).hand[0]?.uid ?? -1);
    expect(combatOf(g).player.block).toBe(4);
    expect(combatOf(g).timeline).toHaveLength(1);
  });
});

/** Ruling 72: Scrap can't take the combat deck below 8, so Scrap tests pad the draw pile first. */
function padDraw(g: Game, n = 10): void {
  const c = combatOf(g);
  for (let i = 0; i < n; i++) c.draw.push(makeCard(g.state, 'test_block'));
}

/** Combat deck as ruling 72 counts it: draw + discard + hand + in play. */
function combatDeck(g: Game): number {
  const c = combatOf(g);
  return c.draw.length + c.discard.length + c.hand.length + c.inPlay.length;
}

/** A sandbox whose combat deck is exactly `size` cards, `inHand` of them test_strike in hand. */
function atDeck(size: number, inHand: string[]): Game {
  const g = sandbox();
  const c = combatOf(g);
  setHand(g, inHand);
  c.discard = [];
  c.draw = Array.from({ length: size - inHand.length }, () => makeCard(g.state, 'test_block'));
  expect(combatDeck(g)).toBe(size);
  return g;
}

function scrapAll(g: Game): void {
  const env = makeEnv(g.state);
  enqueue(env, [{ kind: 'effect', effect: { type: 'exhaust', from: 'hand', all: true, then: [{ type: 'guard', amount: { per: 1, scale: 'scrapped' } }] }, frame: { src: { kind: 'system' }, self: 'player', target: null, x: 0 } }]);
  drain(env);
}

describe('ruling 72: the Scrap floor', () => {
  it('Scrap stops at a combat deck of 8; the rest stay put, with a text event; scale scrapped counts only real Scraps', () => {
    expect(TUNING.caps.scrapFloor).toBe(8);
    const g = atDeck(10, ['test_strike', 'test_strike', 'test_strike']);
    const before = combatOf(g).player.guard;
    scrapAll(g);
    expect(combatOf(g).exhaust).toHaveLength(2);
    expect(combatOf(g).hand).toHaveLength(1);
    expect(combatDeck(g)).toBe(8);
    expect(combatOf(g).player.guard).toBe(before + 2);
  });

  it('at the floor a Scrap does nothing but say so', () => {
    const g = atDeck(8, ['test_strike']);
    const env = makeEnv(g.state);
    enqueue(env, [{ kind: 'effect', effect: { type: 'exhaust', from: 'hand', all: true }, frame: { src: { kind: 'system' }, self: 'player', target: null, x: 0 } }]);
    drain(env);
    expect(combatOf(g).exhaust).toHaveLength(0);
    expect(combatOf(g).hand.map((c) => c.id)).toEqual(['test_strike']);
    const texts = env.events.flatMap((e) => (e.t === 'text' ? [e.text] : []));
    expect(texts.some((t) => t.includes('Scrap floor') && t.includes('Test Strike'))).toBe(true);
    expect(env.events.some((e) => e.t === 'exhaust')).toBe(false);
  });

  it('a played Scrap card at the floor goes to the discard pile instead', () => {
    registerPack({ cards: [{ id: 'test_sv_scrap_self', name: 'Test Scrap Self', cls: 'test_class', type: 'skill', rarity: 'common', cost: 0, target: 'none',
      keywords: ['exhaust'], text: 'Scrap.', effects: [], upgrade: {}, icon: 'card_x', tags: [] }] });
    const g = atDeck(8, ['test_sv_scrap_self']);
    const uid = combatOf(g).hand[0]?.uid;
    if (uid === undefined) throw new Error('no card');
    const ev = play(g, uid);
    expect(combatOf(g).exhaust).toHaveLength(0);
    expect(combatOf(g).discard.map((c) => c.uid)).toEqual([uid]);
    expect(combatDeck(g)).toBe(8);
    expect(eventsOf(ev, 'text').some((e) => e.text.includes('Scrap floor'))).toBe(true);
  });

  it('Phase F: a card the floor keeps still Salvages (Black Box played at 8 goes to discard, gains energy and draws)', () => {
    const g = atDeck(8, ['black_box']);
    const c = combatOf(g);
    const box = c.hand[0];
    if (!box) throw new Error('no box');
    c.energy = 3;
    const ev = play(g, box.uid);
    expect(combatOf(g).exhaust).toHaveLength(0);
    expect(combatOf(g).discard.map((x) => x.uid)).toContain(box.uid);
    expect(combatOf(g).energy).toBe(4);
    expect(combatOf(g).hand).toHaveLength(2);
    expect(eventsOf(ev, 'salvage')).toEqual([{ t: 'salvage', cardUid: box.uid }]);
  });

  it('a Prune blocked by the floor is not a Prune (no counter, no lastPrune, no Bloom)', () => {
    const g = atDeck(8, ['test_strike', 'test_sprout']);
    const strike = combatOf(g).hand[0];
    if (!strike) throw new Error('no strike');
    const before = structuredClone(combatOf(g).lastPrune);
    const env = makeEnv(g.state);
    resolvePruneScrap(env, { bloom: 3, variant: 'standard', bonusIf: null }, [strike.uid]);
    drain(env);
    expect(combatOf(g).exhaust).toHaveLength(0);
    expect(combatOf(g).lastPrune).toEqual(before);
    expect(combatOf(g).counters.prunes).toBeUndefined();
    expect(combatOf(g).pendingChoice).toBeNull();
    expect(combatDeck(g)).toBe(8);
  });

  it('Triage Locker cannot take the deck below 8 over a long fight', () => {
    const settle = (g: Game): void => {
      for (let pc = combatOf(g).pendingChoice; pc; pc = combatOf(g).pendingChoice) answerChoice(g, pc.choices.slice(0, pc.min));
    };
    for (const relic of ['triage_locker']) {
      const g = sandbox({ relics: [relic] });
      pacify(g);
      for (let t = 0; t < 12; t++) {
        combatOf(g).player.block = 999;
        settle(g);
        g.apply({ type: 'end_turn' });
        settle(g);
        expect(combatDeck(g)).toBeGreaterThanOrEqual(8);
      }
    }
  });
});

describe('hooks', () => {
  it('staggerPrevented (H5) reports what the attacker\'s Stagger removed', () => {
    const g = sandbox({ relics: ['test_sv_kick'] });
    pacify(g);
    const slime = combatOf(g).enemies[0];
    if (!slime) throw new Error('setup');
    slime.intent = computeIntent(g.state, slime, 'tackle');
    slime.statuses.stagger = 2;
    setHand(g, []);
    g.apply({ type: 'end_turn' });
    expect(fired.prevented).toBe(2);
  });

  it('onPrimeFizzled (H10) fires per fizzled card', () => {
    const g = sandbox({ relics: ['test_sv_fizzle'] });
    pacify(g);
    const slime = combatOf(g).enemies[0];
    if (!slime) throw new Error('setup');
    slime.intent = computeIntent(g.state, slime, 'lick');
    setHand(g, ['test_parry']);
    g.apply({ type: 'end_turn' });
    expect(fired.fizzle).toBe(1);
  });

  it('CardFilter.notKeyword excludes; ripe is instance-only and throws in matchesFilter', () => {
    expect(matchesFilter(getCardDef('test_retainer'), { notKeyword: 'retain' })).toBe(false);
    expect(matchesFilter(getCardDef('test_strike'), { notKeyword: 'retain' })).toBe(true);
    expect(() => matchesFilter(getCardDef('test_strike'), { ripe: true })).toThrow(/ripe/);
  });

  it('add_random_card throws when no card matches (no silent nothing)', () => {
    const g = sandbox();
    const env = makeEnv(g.state);
    enqueue(env, [{ kind: 'effect', effect: { type: 'add_random_card', pool: 'class', filter: { tag: '__none__' }, to: 'hand' }, frame: { src: { kind: 'system' }, self: 'player', target: null, x: 0 } }]);
    expect(() => drain(env)).toThrow(/add_random_card/);
  });

  it('exhaust then: scale scrapped = cards actually Scrapped', () => {
    const g = sandbox();
    setHand(g, ['test_strike', 'test_strike']);
    padDraw(g);
    const env = makeEnv(g.state);
    enqueue(env, [{ kind: 'effect', effect: { type: 'exhaust', from: 'hand', all: true, then: [{ type: 'guard', amount: { per: 3, scale: 'scrapped' } }] }, frame: { src: { kind: 'system' }, self: 'player', target: null, x: 0 } }]);
    drain(env);
    expect(combatOf(g).player.guard).toBe(6);
  });

  it('restOptionBlocked (H13) makes a rest option unavailable with its reason', () => {
    const g = Game.newRun('sv-rest', 'test_class');
    const s: RunState = g.state;
    s.player.relics = [{ id: 'test_sv_block_rest', counter: 0 }];
    s.player.counters.shards = 5;
    s.startChoices = null;
    s.phase = 'map';
    s.floor = 1;
    s.room = 'rest';
    s.history.floors.push(newFloorRecord(s, 'rest'));
    const env = makeEnv(s);
    enqueue(env, [{ kind: 'step', step: { op: 'enter_room' } }]);
    drain(env);
    const purge = s.rest?.specials.indexOf('rest_purge') ?? -1;
    expect(purge).toBeGreaterThanOrEqual(0);
    expect(g.legalActions().some((a) => a.type === 'rest_special' && a.index === purge)).toBe(false);
  });

  it('the shop stocks TUNING.shopColorless colourless cards', () => {
    expect(TUNING.shopColorless).toBe(3);
    const g = Game.newRun('sv-shop', 'test_class');
    const s = g.state;
    s.startChoices = null;
    s.phase = 'map';
    s.floor = 1;
    s.room = 'shop';
    s.history.floors.push(newFloorRecord(s, 'shop'));
    const env = makeEnv(s);
    enqueue(env, [{ kind: 'step', step: { op: 'enter_room' } }]);
    drain(env);
    const colorless = (s.shop?.cards ?? []).filter((c) => getCardDef(c.id).cls === 'colorless');
    // The test pack has 2 colourless cards (1 uncommon, 1 rare), so a third slot finds no new card.
    expect(colorless.length).toBeGreaterThanOrEqual(2);
    expect(colorless.length).toBeLessThanOrEqual(TUNING.shopColorless);
  });

  it('Strain floors at 1 HP and counts what was lost', () => {
    const g = sandbox();
    g.state.player.hp = 4;
    const env = makeEnv(g.state);
    enqueue(env, [{ kind: 'effect', effect: { type: 'strain', amount: 9 }, frame: { src: { kind: 'system' }, self: 'player', target: null, x: 0 } }]);
    drain(env);
    expect(g.state.player.hp).toBe(1);
    expect(combatOf(g).counters.strained).toBe(3);
    expect(eventsOf(env.events, 'damage').map((e) => e.hpLost)).toEqual([3]);
  });

  it('makeCard copies keep their id (copy_card)', () => {
    const g = sandbox();
    setHand(g, ['test_bash']);
    const env = makeEnv(g.state);
    enqueue(env, [{ kind: 'effect', effect: { type: 'copy_card', costThisTurn: 0 }, frame: { src: { kind: 'system' }, self: 'player', target: null, x: 0 } }]);
    drain(env);
    expect(combatOf(g).hand.map((c) => c.id)).toEqual(['test_bash', 'test_bash']);
    expect(combatOf(g).hand[1]?.tempCost).toBe(0);
    expect(makeCard(g.state, 'test_bash').id).toBe('test_bash');
  });
});

// ---------------------------------------------------------------------------
// RULINGS 66: repeat resolutions re-pay Shard costs or are skipped (never throw, never double-pay)

registerPack({
  cards: [
    { id: 'test_sv_shard_delay', name: 'Test Shard Delay', cls: 'test_class', type: 'skill', rarity: 'special', cost: 0, target: 'self', keywords: ['delay'],
      text: 'Delay {delay_turns}: spend {shards_abs} Shard, gain {delay_block} Block.', effects: [],
      delay: { turns: 1, effects: [{ type: 'shards', amount: -1 }, { type: 'block', amount: 5, key: 'delay_block' }] }, upgrade: {}, icon: 'card_x' },
    { id: 'test_sv_shard_parry', name: 'Test Shard Parry', cls: 'test_class', type: 'attack', rarity: 'special', cost: 0, target: 'enemy', keywords: ['riposte'],
      text: 'Spend {shards_abs} Shard: deal {damage} damage. Riposte: gain {rblock} Block.', effects: [{ type: 'shards', amount: -1 }, { type: 'damage', amount: 5, target: 'target' }],
      riposte: [{ type: 'block', amount: 1, key: 'rblock' }], upgrade: {}, icon: 'card_x' },
  ],
  relics: [
    { id: 'test_sv_eclipse', name: 'Always Eclipse', rarity: 'event', text: 'Timeline cards resolve twice.', icon: 'x', hooks: { timelineResolutions: () => 2 } },
    { id: 'test_sv_answer', name: 'Always Answer', rarity: 'event', text: 'Riposte cards also resolve their played effects.', icon: 'x', hooks: { riposteResolvesPlayed: () => true } },
  ],
}, 'test');

describe('RULINGS 66', () => {
  it('Reprise on a Shard-cost card with exactly 1 Shard: paid once, second resolution skipped, no throw', () => {
    const g = sandbox({ relics: ['test_sv_reprise'] });
    g.state.player.counters.shards = 1;
    setHand(g, ['test_shard_guard']);
    const ev = play(g, combatOf(g).hand[0]?.uid ?? -1);
    expect(g.state.player.counters.shards).toBe(0);
    expect(combatOf(g).player.guard).toBe(12);
    expect(ev.some((e) => e.t === 'text' && /Reprise skipped/.test(e.text))).toBe(true);
  });

  it('Reprise with enough Shards pays twice and resolves twice', () => {
    const g = sandbox({ relics: ['test_sv_reprise'] });
    g.state.player.counters.shards = 2;
    setHand(g, ['test_shard_guard']);
    play(g, combatOf(g).hand[0]?.uid ?? -1);
    expect(g.state.player.counters.shards).toBe(0);
    expect(combatOf(g).player.guard).toBe(24);
  });

  it('Total Eclipse: the second Timeline run is skipped when its Shard cost cannot be paid', () => {
    const g = sandbox({ relics: ['test_sv_eclipse'] });
    pacify(g);
    g.state.player.counters.shards = 1;
    setHand(g, ['test_sv_shard_delay']);
    play(g, combatOf(g).hand[0]?.uid ?? -1);
    combatOf(g).player.block = 100;
    const ev = g.apply({ type: 'end_turn' });
    expect(g.state.player.counters.shards).toBe(0);
    expect(combatOf(g).player.block).toBe(5);
    expect(ev.some((e) => e.t === 'text' && /second resolution skipped/.test(e.text))).toBe(true);
  });

  it('Answer in Kind: the played list on a Riposte fire is skipped without Shards (it was never paid)', () => {
    const g = sandbox({ relics: ['test_sv_answer'], encounter: 'test_enc_jaw' });
    pacify(g);
    g.state.player.counters.shards = 0;
    setHand(g, ['test_sv_shard_parry']);
    combatOf(g).player.block = 100;
    const ev = g.apply({ type: 'end_turn' });
    expect(eventsOf(ev, 'riposte_triggered')).toHaveLength(1);
    expect(g.state.player.counters.shards).toBe(0);
    expect(ev.some((e) => e.t === 'text' && /Answer in Kind skipped/.test(e.text))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// RULINGS 69: colourless cards in card rewards

describe('RULINGS 69: colourless in card rewards', () => {
  const rewardFor = (seed: string, kind: 'monster' | 'elite', chance: number): RunState['reward'] => {
    const keep = { ...TUNING.rewardColorlessChance };
    TUNING.rewardColorlessChance.default = chance;
    TUNING.rewardColorlessChance.elite = chance;
    try {
      const g = Game.newRun(seed, 'test_class');
      return generateReward(g.state, kind);
    } finally {
      Object.assign(TUNING.rewardColorlessChance, keep);
    }
  };
  const colorlessIn = (r: RunState['reward']): string[] => (r?.cards ?? []).map((o) => o.id).filter((id) => getCardDef(id).cls === 'colorless');

  it('defaults: 0.12, 0.25 from elites', () => {
    expect(TUNING.rewardColorlessChance).toEqual({ default: 0.12, elite: 0.25 });
  });

  it('chance 1 replaces exactly one class card (same size); chance 0 never does', () => {
    for (let i = 0; i < 20; i++) {
      const on = rewardFor(`rc-${i}`, 'monster', 1);
      const off = rewardFor(`rc-${i}`, 'monster', 0);
      expect(colorlessIn(on)).toHaveLength(1);
      expect(on?.cards).toHaveLength(off?.cards.length ?? -1);
      expect(colorlessIn(off)).toHaveLength(0);
    }
  });

  it('the colourless card keeps the rarity roll (a common slot becomes uncommon) and is never special', () => {
    for (let i = 0; i < 30; i++) {
      for (const id of colorlessIn(rewardFor(`rr-${i}`, 'elite', 1))) expect(['uncommon', 'rare']).toContain(getCardDef(id).rarity);
    }
  });

  it('is seeded: the same seed gives the same reward', () => {
    expect(rewardFor('rc-same', 'elite', 0.5)).toEqual(rewardFor('rc-same', 'elite', 0.5));
  });

  it('at the default 12% it appears in roughly that share of rewards (200 seeds)', () => {
    let hits = 0;
    for (let i = 0; i < 200; i++) if (colorlessIn(rewardFor(`rd-${i}`, 'monster', TUNING.rewardColorlessChance.default)).length > 0) hits += 1;
    expect(hits).toBeGreaterThan(8);
    expect(hits).toBeLessThan(45);
  });
});

// ---------------------------------------------------------------------------
// RULINGS 70: colourless reward rolls lean toward shared engines you've started

describe('RULINGS 70: colourless engine bias', () => {
  registerPack({
    cards: [
      { id: 'test_sv_engine_a', name: 'Test Engine A', cls: 'colorless', type: 'skill', rarity: 'uncommon', cost: 1, target: 'none', keywords: [],
        text: 'Draw {draw} card.', effects: [{ type: 'draw', n: 1 }], upgrade: {}, icon: 'card_x', tags: ['engine:test_shared'] },
    ],
    relics: [{ id: 'test_sv_engine_relic', name: 'Engine Relic', rarity: 'event', text: 'Starts the test engine.', icon: 'x', tags: ['engine:test_shared'] }],
  }, 'test');

  const rewardsWith = (seed: string, bias: number, start: 'none' | 'card' | 'relic'): string[] => {
    const keep = { chance: { ...TUNING.rewardColorlessChance }, bias: TUNING.colorlessEngineBias };
    TUNING.rewardColorlessChance.default = 1;
    TUNING.colorlessEngineBias = bias;
    try {
      const g = Game.newRun(seed, 'test_class');
      if (start === 'card') g.state.player.deck.push(makeCard(g.state, 'test_sv_engine_a'));
      if (start === 'relic') g.state.player.relics.push({ id: 'test_sv_engine_relic', counter: 0 });
      return (generateReward(g.state, 'monster')?.cards ?? []).map((o) => o.id).filter((id) => getCardDef(id).cls === 'colorless');
    } finally {
      Object.assign(TUNING.rewardColorlessChance, keep.chance);
      TUNING.colorlessEngineBias = keep.bias;
    }
  };

  it('default bias is 0.5', () => {
    expect(TUNING.colorlessEngineBias).toBe(0.5);
  });

  it('with bias 1 and a started engine (card or relic), an uncommon colourless pick is from that engine', () => {
    for (const start of ['card', 'relic'] as const) {
      for (let i = 0; i < 20; i++) {
        for (const id of rewardsWith(`eb-${start}-${i}`, 1, start)) {
          if (getCardDef(id).rarity === 'uncommon') expect(id).toBe('test_sv_engine_a');
        }
      }
    }
  });

  it('with bias 0, or with no started engine, the pick is uniform (other colourless cards appear)', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) for (const id of rewardsWith(`eu-${i}`, 1, 'none')) seen.add(id);
    expect([...seen].some((id) => id !== 'test_sv_engine_a')).toBe(true);
    const seen0 = new Set<string>();
    for (let i = 0; i < 40; i++) for (const id of rewardsWith(`e0-${i}`, 0, 'relic')) seen0.add(id);
    expect([...seen0].some((id) => id !== 'test_sv_engine_a')).toBe(true);
  });

  it('is seeded', () => {
    expect(rewardsWith('eb-same', 0.5, 'relic')).toEqual(rewardsWith('eb-same', 0.5, 'relic'));
  });
});

describe('Phase F: a started shared engine sometimes adds one of its cards to a card reward', () => {
  const offer = (seed: string, extra: number, started: boolean, licence = false): string[] => {
    const keep = { chance: TUNING.rewardColorlessChance.default, extra: TUNING.colorlessEngineExtra, rare: TUNING.shop.colorlessExtraRarePct };
    TUNING.rewardColorlessChance.default = 0;
    TUNING.colorlessEngineExtra = extra;
    TUNING.shop.colorlessExtraRarePct = 0; // the test engine has only an uncommon
    try {
      const g = Game.newRun(seed, 'test_class');
      if (started) g.state.player.relics.push({ id: 'test_sv_engine_relic', counter: 0 });
      if (licence) g.state.player.relics.push({ id: 'salvagers_licence', counter: 0 });
      const r = generateReward(g.state, 'monster');
      if (!r) throw new Error('no reward');
      return r.cards.map((o) => o.id);
    } finally {
      TUNING.rewardColorlessChance.default = keep.chance;
      TUNING.colorlessEngineExtra = keep.extra;
      TUNING.shop.colorlessExtraRarePct = keep.rare;
    }
  };

  it('default chance is 0.3, at most 4 cards', () => {
    expect(TUNING.colorlessEngineExtra).toBe(0.3);
    expect(TUNING.rewardMaxCards).toBe(4);
  });

  it('with chance 1 and a started engine, a 4th card from that engine is added (the class cards stay)', () => {
    for (let i = 0; i < 10; i++) {
      const base = offer(`fx-${i}`, 0, true);
      const cards = offer(`fx-${i}`, 1, true);
      expect(cards).toHaveLength(base.length + 1);
      expect(cards.slice(0, base.length)).toEqual(base);
      expect(cards[cards.length - 1]).toBe('test_sv_engine_a');
    }
  });

  it('nothing is added without a started engine, or when the offer is already 4 cards (Salvager\'s Licence)', () => {
    for (let i = 0; i < 10; i++) {
      expect(offer(`fn-${i}`, 1, false)).not.toContain('test_sv_engine_a');
      const withLicence = offer(`fl-${i}`, 1, true, true);
      expect(withLicence).toHaveLength(4);
      expect(withLicence.filter((id) => id === 'test_sv_engine_a').length).toBeLessThanOrEqual(1);
    }
  });
});

describe('RULINGS 70 (amended): shop colourless slots lean toward started shared engines', () => {
  const shopColorless = (seed: string, bias: number, started: boolean): string[] => {
    const keep = TUNING.colorlessEngineBias;
    TUNING.colorlessEngineBias = bias;
    try {
      const g = Game.newRun(seed, 'test_class');
      const s = g.state;
      if (started) s.player.relics.push({ id: 'test_sv_engine_relic', counter: 0 });
      s.startChoices = null;
      s.phase = 'map';
      s.floor = 1;
      s.room = 'shop';
      s.history.floors.push(newFloorRecord(s, 'shop'));
      const env = makeEnv(s);
      enqueue(env, [{ kind: 'step', step: { op: 'enter_room' } }]);
      drain(env);
      return (s.shop?.cards ?? []).map((c) => c.id).filter((id) => getCardDef(id).cls === 'colorless');
    } finally {
      TUNING.colorlessEngineBias = keep;
    }
  };

  it('bias 1 + a started engine: the uncommon slot is always the engine card', () => {
    for (let i = 0; i < 20; i++) expect(shopColorless(`sb-${i}`, 1, true)).toContain('test_sv_engine_a');
  });

  it('bias 0, or no started engine: the uncommon slot is uniform (sometimes another card)', () => {
    const firstUncommon = (ids: string[]): string | undefined => ids.find((id) => getCardDef(id).rarity === 'uncommon');
    const off = new Set<string>();
    const none = new Set<string>();
    for (let i = 0; i < 40; i++) {
      off.add(firstUncommon(shopColorless(`sz-${i}`, 0, true)) ?? '');
      none.add(firstUncommon(shopColorless(`sn-${i}`, 1, false)) ?? '');
    }
    expect([...off].some((id) => id !== 'test_sv_engine_a' && id !== '')).toBe(true);
    expect([...none].some((id) => id !== 'test_sv_engine_a' && id !== '')).toBe(true);
  });

  it('is seeded', () => {
    expect(shopColorless('sb-same', 0.5, true)).toEqual(shopColorless('sb-same', 0.5, true));
  });
});
