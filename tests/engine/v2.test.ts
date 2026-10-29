import '../testpack-only';
import { beforeAll, describe, expect, it } from 'vitest';
import { Game, TUNING, canPlayCard, computeIntent, type Action, type RunState } from '../../src/engine';
import { makeCard } from '../../src/engine/cards';
import { enqueue, makeEnv } from '../../src/engine/core';
import { refreshIntents, summon } from '../../src/engine/enemies';
import { newFloorRecord } from '../../src/engine/history';
import { drain } from '../../src/engine/queue';
import { transmutePick } from '../../src/engine/runeffects';
import { combatOf, enemy, enemyUids, eventsOf, pacify, play, sandbox, setHand } from './helpers';
import { registerFixtures, spy } from './fixtures';

beforeAll(registerFixtures);

const deckOf = (n: number, id = 'test_strike') => Array.from({ length: n }, () => id);

function inRoom(room: 'shop' | 'rest' | 'treasure' | 'elite', seed: string, prep: (s: RunState) => void = () => {}): Game {
  const g = Game.newRun(seed, 'test_class');
  const s = g.state;
  prep(s);
  s.startChoices = null;
  s.phase = 'map';
  s.floor = 1;
  s.room = room;
  s.history.floors.push(newFloorRecord(s, room));
  const env = makeEnv(s);
  enqueue(env, [{ kind: 'step', step: { op: 'enter_room' } }]);
  drain(env);
  return g;
}

describe('Guard (GDD §2.3)', () => {
  it('worked example: 6 Block + 10 Guard vs 3 x 5 → no HP lost; next turn Block 0, Guard 1 → 0', () => {
    const g = sandbox({ encounter: 'fx_enc_hitter' });
    const c = combatOf(g);
    c.player.block = 6;
    c.player.guard = 10;
    setHand(g, []);
    const hp = g.state.player.hp;
    const ev = g.apply({ type: 'end_turn' });
    const hits = eventsOf(ev, 'damage').filter((d) => d.target === 'player');
    expect(hits.map((h) => [h.amount, h.blocked, h.guarded, h.hpLost])).toEqual([
      [5, 5, 0, 0],
      [5, 1, 4, 0],
      [5, 0, 5, 0],
    ]);
    expect(g.state.player.hp).toBe(hp);
    expect(eventsOf(ev, 'guard_decay')).toContainEqual({ t: 'guard_decay', target: 'player', lost: 1, now: 0 });
    expect(combatOf(g).player.guard).toBe(0);
    expect(combatOf(g).player.block).toBe(0);
  });

  it('Guard halves at the owner turn start (13 → 6), is capped at 50, and Block modifiers apply', () => {
    const g = sandbox({ encounter: 'fx_enc_hitter' });
    const c = combatOf(g);
    c.enemies[0] && (c.enemies[0].intent = computeIntent(g.state, c.enemies[0], 'wait'));
    c.player.guard = 13;
    setHand(g, []);
    g.apply({ type: 'end_turn' });
    expect(combatOf(g).player.guard).toBe(6);
    combatOf(g).player.guard = 48;
    const [b] = setHand(g, ['test_brace']);
    const ev = play(g, b as number);
    expect(combatOf(g).player.guard).toBe(TUNING.caps.guard);
    expect(eventsOf(ev, 'cap_hit')).toEqual([{ t: 'cap_hit', cap: 'cap_stacks' }]);
    expect(eventsOf(ev, 'block')).toEqual([{ t: 'block', target: 'player', amount: 2, pool: 'guard' }]);
  });
});

describe('Riposte (GDD §2.2)', () => {
  it('primes at turn end and fires before the first hit; a kill cancels the attack', () => {
    const g = sandbox({ encounter: 'fx_enc_hitter' });
    enemy(g, enemyUids(g)[0] as number).hp = 3;
    const [parry] = setHand(g, ['test_parry']);
    const ev = g.apply({ type: 'end_turn' });
    expect(eventsOf(ev, 'card_primed')).toEqual([{ t: 'card_primed', uid: parry }]);
    expect(eventsOf(ev, 'riposte_triggered')).toHaveLength(1);
    expect(eventsOf(ev, 'attack_cancelled')).toHaveLength(1);
    expect(eventsOf(ev, 'damage').filter((d) => d.target === 'player')).toHaveLength(0);
    expect(g.state.phase).toBe('reward');
  });

  it('one primed card per enemy attack; leftover primed cards fizzle at the next turn start', () => {
    const g = sandbox({ encounter: 'fx_enc_two_hitters' });
    pacify(g);
    combatOf(g).player.statuses.riposte_capacity = 1;
    setHand(g, ['test_parry', 'test_parry']);
    const ev = g.apply({ type: 'end_turn' });
    const fired = eventsOf(ev, 'riposte_triggered');
    expect(fired.map((f) => f.attacker)).toEqual(enemyUids(g));

    const h = sandbox({ encounter: 'fx_enc_hitter' });
    pacify(h);
    h.state.combat && (h.state.combat.player.statuses.riposte_capacity = 1);
    setHand(h, ['test_parry', 'test_parry']);
    const ev2 = h.apply({ type: 'end_turn' });
    expect(eventsOf(ev2, 'riposte_triggered')).toHaveLength(1);
    expect(eventsOf(ev2, 'prime_fizzled')).toHaveLength(1);
    expect(combatOf(h).primed).toHaveLength(0);
  });

  it('more Riposte cards than capacity raises the prime choice; non-attacks never trigger', () => {
    const g = sandbox({ encounter: 'fx_enc_hitter' });
    pacify(g);
    const e = combatOf(g).enemies[0];
    if (!e) throw new Error('setup');
    e.intent = computeIntent(g.state, e, 'wait');
    const [a, b] = setHand(g, ['test_parry', 'test_parry']);
    g.apply({ type: 'end_turn' });
    const pc = combatOf(g).pendingChoice;
    expect(pc).toMatchObject({ min: 1, max: 1, from: 'hand', resume: { op: 'prime', step: true } });
    const ev = g.apply({ type: 'resolve_choice', uids: [b as number] });
    expect(combatOf(g).primed).toHaveLength(0); // fizzled at the new turn start
    expect(eventsOf(ev, 'riposte_triggered')).toHaveLength(0);
    expect(eventsOf(ev, 'prime_fizzled')).toEqual([{ t: 'prime_fizzled', uid: b }]);
    expect(eventsOf(ev, 'discard').some((d) => d.uids.includes(a as number))).toBe(true);
  });
});

describe('Onslaught (GDD §2.1)', () => {
  it('+1 after each played Attack finishes (the first sees 0), resets at turn end unless kept', () => {
    const g = sandbox();
    pacify(g);
    const [s1, s2] = setHand(g, ['test_cashin', 'test_strike']);
    const t = enemyUids(g)[0] as number;
    combatOf(g).energy = 5;
    expect(eventsOf(play(g, s2 as number, t), 'damage')[0]?.amount).toBe(6);
    expect(combatOf(g).player.statuses.onslaught).toBe(1);
    expect(combatOf(g).attacksPlayedThisTurn).toBe(1);
    combatOf(g).player.statuses.onslaught = 2;
    // Spend 2: the clause fires and spends
    const ev = play(g, s1 as number, t);
    expect(eventsOf(ev, 'damage').map((d) => d.amount)).toEqual([4, 8]);
    expect(combatOf(g).player.statuses.onslaught).toBe(1);
    combatOf(g).player.statuses.onslaught = 5;
    combatOf(g).player.statuses.onslaught_keep = 2;
    setHand(g, []);
    g.apply({ type: 'end_turn' });
    expect(combatOf(g).player.statuses.onslaught).toBe(2);
  });
});

describe('Rot (GDD §2.6)', () => {
  it('ticks at the end of its own turn (between enemies), then +1; spreads floor(Rot/2) on death', () => {
    const g = sandbox({ encounter: 'test_enc_slimes' });
    pacify(g, 50);
    const [a, b] = enemyUids(g) as [number, number];
    enemy(g, a).statuses.rot = 3;
    setHand(g, []);
    const ev = g.apply({ type: 'end_turn' });
    const rotTick = ev.findIndex((e) => e.t === 'damage' && e.kind === 'hp_loss' && e.target === a);
    const bMove = ev.findIndex((e) => e.t === 'enemy_move' && e.uid === b);
    expect(rotTick).toBeGreaterThan(-1);
    expect(rotTick).toBeLessThan(bMove);
    expect(enemy(g, a).hp).toBe(47);
    expect(enemy(g, a).statuses.rot).toBe(4);
    enemy(g, a).statuses.rot = 7;
    enemy(g, a).hp = 1;
    const [st] = setHand(g, ['test_strike']);
    play(g, st as number, a);
    expect(enemy(g, b).statuses.rot).toBe(3);
  });

  it('caps at 15', () => {
    const g = sandbox();
    const t = enemyUids(g)[0] as number;
    enemy(g, t).statuses.rot = 14;
    enemy(g, t).hp = 999;
    setHand(g, []);
    g.apply({ type: 'end_turn' });
    g.apply({ type: 'end_turn' });
    expect(enemy(g, t).statuses.rot).toBe(15);
  });
});

describe('Cadence (GDD §2.7)', () => {
  it('the 3rd counted play is on the beat (counted at pay-cost time)', () => {
    const g = sandbox({ deck: deckOf(15) });
    pacify(g);
    const uids = setHand(g, ['test_beat', 'test_beat', 'test_beat']);
    const t = enemyUids(g)[0] as number;
    const beats = uids.map((u) => eventsOf(play(g, u, t), 'card_played')[0]?.onBeat);
    expect(beats).toEqual([false, false, true]);
    expect(combatOf(g).hand.length).toBe(1); // the on-beat Tick drew 1
  });

  it('plays two levels deep by effects do not count (playDepth 1)', () => {
    const g = sandbox({ deck: deckOf(10) });
    pacify(g);
    const [ap] = setHand(g, ['fx_autoplay']);
    const c = combatOf(g);
    c.draw.push(makeCard(g.state, 'test_beat'), makeCard(g.state, 'fx_autoplay')); // top = autoplay, then Beat
    const ev = play(g, ap as number);
    const played = eventsOf(ev, 'card_played');
    expect(played.map((p) => p.cardId)).toEqual(['fx_autoplay', 'fx_autoplay', 'test_beat']);
    expect(combatOf(g).cardsPlayedThisTurn).toHaveLength(2);
    expect(played[2]?.onBeat).toBe(false);
  });

  it('a Delay card stamps on-beat at play and resolves with it next turn', () => {
    const g = sandbox({ encounter: 'fx_enc_hitter', deck: deckOf(15) });
    const e = combatOf(g).enemies[0];
    if (!e) throw new Error('setup');
    e.intent = computeIntent(g.state, e, 'wait');
    const [b1, b2, d] = setHand(g, ['test_beat', 'test_beat', 'fx_delay_beat']);
    const t = e.uid;
    play(g, b1 as number, t);
    play(g, b2 as number, t);
    const ev = play(g, d as number);
    expect(eventsOf(ev, 'timeline_added')).toEqual([{ t: 'timeline_added', uid: d, dueTurn: 2, onBeat: true }]);
    setHand(g, []);
    g.apply({ type: 'end_turn' });
    expect(combatOf(g).player.block).toBe(10);
  });
});

describe('Delay and the Timeline (GDD §2.8)', () => {
  it('resolves before the draw in seq order; a dead stamped target retargets to the leftmost', () => {
    const g = sandbox({ encounter: 'test_enc_slimes', deck: deckOf(15) });
    pacify(g);
    const [a, b] = enemyUids(g) as [number, number];
    for (const e of combatOf(g).enemies) e.intent = computeIntent(g.state, e, 'lick');
    const [d1, d2] = setHand(g, ['fx_delay_hit', 'fx_delay_hit']);
    play(g, d1 as number, b);
    play(g, d2 as number, a);
    enemy(g, b).alive = false;
    enemy(g, b).hp = 0;
    setHand(g, []);
    const ev = g.apply({ type: 'end_turn' });
    const resolved = ev.flatMap((e, i) => (e.t === 'timeline_resolved' ? [i] : []));
    const drawAt = ev.findIndex((e) => e.t === 'draw');
    expect(eventsOf(ev, 'timeline_resolved').map((r) => r.uid)).toEqual([d1, d2]);
    expect(Math.max(...resolved)).toBeLessThan(drawAt);
    const hits = eventsOf(ev, 'damage').filter((x) => x.source === 'player');
    expect(hits.map((h) => h.target)).toEqual([a, a]);
  });

  it('Advance is capped at 2 per turn; due entries resolve at once; relay and full Timeline block plays', () => {
    const g = sandbox({ deck: deckOf(15) });
    pacify(g);
    const [n, a1, a2, a3] = setHand(g, ['test_noon', 'fx_advance1', 'fx_advance1', 'fx_advance1']);
    const t = enemyUids(g)[0] as number;
    play(g, n as number, t);
    const entry = combatOf(g).timeline[0];
    if (!entry) throw new Error('setup');
    entry.dueTurn = combatOf(g).turn + 3;
    play(g, a1 as number);
    play(g, a2 as number);
    const ev3 = play(g, a3 as number);
    expect(eventsOf(ev3, 'cap_hit')).toEqual([{ t: 'cap_hit', cap: 'cap_advance' }]);
    expect(combatOf(g).timeline[0]?.dueTurn).toBe(combatOf(g).turn + 1);

    // relay: a card that resolved this turn is unplayable
    const r = sandbox({ deck: deckOf(15) });
    pacify(r);
    const [d, adv] = setHand(r, ['fx_delay_hit', 'fx_advance1']);
    play(r, d as number, enemyUids(r)[0] as number);
    const ev = play(r, adv as number);
    expect(eventsOf(ev, 'timeline_resolved')).toHaveLength(1);
    const card = combatOf(r).discard.find((x) => x.uid === d);
    if (!card) throw new Error('relayed card not in discard');
    combatOf(r).discard = combatOf(r).discard.filter((x) => x.uid !== d);
    combatOf(r).hand.push(card);
    expect(canPlayCard(r.state, card)).toBe('Already resolved from the Timeline this turn.');

    // full Timeline
    const f = sandbox({ deck: deckOf(15) });
    const [fd] = setHand(f, ['fx_delay_hit']);
    const fc = combatOf(f);
    for (let i = 0; i < TUNING.caps.timeline; i++) fc.timeline.push({ card: makeCard(f.state, 'fx_delay_hit'), dueTurn: 5, seq: 100 + i, onBeat: false, target: null, x: 0, advancedThisTurn: false });
    expect(f.legalActions().some((x) => x.type === 'play_card' && x.uid === fd)).toBe(false);
  });
});

describe('Augury forecast (GDD §2.9)', () => {
  it('chooseMove sees no player state and a frozen snapshot', () => {
    sandbox({ encounter: 'fx_enc_spy' });
    const ctx = spy.ctx;
    if (!ctx) throw new Error('spy never chosen');
    expect('state' in ctx).toBe(false);
    expect('combat' in ctx).toBe(false);
    expect(() => {
      (ctx.self as { hp: number }).hp = 1;
    }).toThrow();
  });

  it('forecast[0] is exactly the next chosen move (cloned rng), hidden moves show "?"', () => {
    for (let i = 0; i < 20; i++) {
      const g = sandbox({ seed: `fc-${i}`, encounter: 'test_enc_mystic' });
      pacify(g);
      const [mystic, slime] = combatOf(g).enemies;
      if (!mystic || !slime) throw new Error('setup');
      expect(mystic.intent.moveId).toBe('hex');
      expect(mystic.forecast).toEqual([{ kind: 'unknown', moveId: '', hidden: true }]);
      const predicted = slime.forecast[0]?.moveId;
      setHand(g, []);
      g.apply({ type: 'end_turn' });
      expect(combatOf(g).enemies[1]?.intent.moveId).toBe(predicted);
    }
  });

  it('recomputes when enemy-side state changes (an ally dies)', () => {
    const g = sandbox({ encounter: 'test_enc_pack' });
    const c = combatOf(g);
    const leader = c.enemies[0];
    if (!leader) throw new Error('setup');
    const env = makeEnv(g.state);
    summon(env, leader.uid, { enemy: 'test_minion', n: 1 });
    leader.moveHistory = ['call'];
    leader.intent = computeIntent(g.state, leader, 'whip');
    refreshIntents(env);
    expect(leader.forecast[0]?.moveId).toBe('whip'); // 2 minions alive
    const minion = c.enemies.find((e) => e.id === 'test_minion');
    if (!minion) throw new Error('no minion');
    minion.hp = 1;
    const [s] = setHand(g, ['test_strike']);
    const ev = play(g, s as number, minion.uid);
    expect(combatOf(g).enemies[0]?.forecast[0]?.moveId).toBe('call');
    expect(eventsOf(ev, 'enemy_forecast').some((f) => f.uid === leader.uid)).toBe(true);
  });
});

describe('Pipeline step 4 (GDD §2.10-2.11, §2.15)', () => {
  it('max(0, d − attacker Stagger + target Exposed), in previews and hits; decays at end of own turn', () => {
    const g = sandbox();
    pacify(g);
    const t = enemyUids(g)[0] as number;
    const e = enemy(g, t);
    combatOf(g).player.statuses.stagger = 2;
    e.statuses.exposed = 3;
    const [s] = setHand(g, ['test_strike']);
    expect(eventsOf(play(g, s as number, t), 'damage')[0]?.amount).toBe(7);
    enemy(g, t).statuses.stagger = 2;
    enemy(g, t).statuses.exposed = 3;
    combatOf(g).player.statuses.exposed = 1;
    expect(computeIntent(g.state, enemy(g, t), 'tackle').damage).toBe(5);
    setHand(g, []);
    g.apply({ type: 'end_turn' });
    expect(enemy(g, t).statuses.exposed).toBe(2);
    expect(enemy(g, t).statuses.stagger).toBe(1);
    expect(combatOf(g).player.statuses.exposed).toBeUndefined();
  });

  it('TUNING.enemyDamagePct scales enemy hits in step 3 (previews too)', () => {
    const g = sandbox();
    const e = combatOf(g).enemies[0];
    if (!e) throw new Error('setup');
    const before = TUNING.enemyDamagePct[1];
    TUNING.enemyDamagePct[1] = 50;
    expect(computeIntent(g.state, e, 'tackle').damage).toBe(3);
    TUNING.enemyDamagePct[1] = before;
    expect(computeIntent(g.state, e, 'tackle').damage).toBe(6);
  });
});

describe('Caps (GDD §3)', () => {
  it('bonus energy, cards to hand, effect draw, stacks, plays — each records a cap hit', () => {
    const g = sandbox({ deck: deckOf(30) });
    pacify(g);
    const [en, gen, dr] = setHand(g, ['fx_energy5', 'fx_gen5', 'fx_draw20']);
    const e1 = play(g, en as number);
    expect(combatOf(g).energy).toBe(3 + TUNING.caps.bonusEnergy);
    expect(eventsOf(e1, 'cap_hit')).toEqual([{ t: 'cap_hit', cap: 'cap_bonus_energy' }]);
    const e2 = play(g, gen as number);
    expect(eventsOf(e2, 'card_added')).toHaveLength(TUNING.caps.toHand);
    combatOf(g).hand = combatOf(g).hand.filter((c) => c.uid === dr);
    combatOf(g).handLimit = 40;
    const e3 = play(g, dr as number);
    expect(eventsOf(e3, 'draw').flatMap((d) => d.uids)).toHaveLength(TUNING.caps.effectDraw);
    expect(eventsOf(e3, 'cap_hit')).toEqual([{ t: 'cap_hit', cap: 'cap_draw' }]);
    expect(combatOf(g).counters.capHits).toBe(3);
    expect(g.state.history.floors.at(-1)?.capHits).toEqual({ cap_bonus_energy: 1, cap_to_hand: 1, cap_draw: 1 });
    combatOf(g).counters.plays = TUNING.caps.playsPerTurn;
    expect(g.legalActions().filter((a) => a.type === 'play_card')).toEqual([]);
  });

  it('a card instance pays printed cost after one reduced play this turn', () => {
    const g = sandbox({ deck: deckOf(10) });
    pacify(g);
    const [s, f] = setHand(g, ['test_strike', 'fx_fetch']);
    const card = combatOf(g).hand[0];
    if (!card) throw new Error('setup');
    card.tempCost = 0;
    const t = enemyUids(g)[0] as number;
    play(g, s as number, t);
    expect(combatOf(g).energy).toBe(3);
    play(g, f as number);
    const back = combatOf(g).hand.find((x) => x.uid === s);
    if (!back) throw new Error('not fetched');
    expect(back.tempCost).toBe(0);
    play(g, s as number, t);
    expect(combatOf(g).energy).toBe(2);
  });

  it('Prune away: at most one in-combat permanent removal per turn', () => {
    const g = sandbox({ deck: deckOf(12) });
    pacify(g);
    const c = combatOf(g);
    const deckCards = c.draw.splice(-2);
    const [p1, p2] = setHand(g, ['fx_prune_away', 'fx_prune_away']);
    combatOf(g).hand.push(...deckCards);
    play(g, p1 as number);
    const ev = g.apply({ type: 'resolve_choice', uids: [deckCards[0]?.uid as number] });
    expect(eventsOf(ev, 'card_removed')).toHaveLength(1);
    expect(g.state.player.deck).toHaveLength(11);
    const ev2 = play(g, p2 as number);
    expect(eventsOf(ev2, 'cap_hit')).toEqual([{ t: 'cap_hit', cap: 'cap_prune_away' }]);
  });
});

describe('Shards, Transmute, shop, potions, elites (GDD §4)', () => {
  it('skip reward +1 Shard; skip boss relic +2; cap 10', () => {
    const g = sandbox();
    for (const e of combatOf(g).enemies) e.hp = 1;
    const [s] = setHand(g, ['test_strike']);
    play(g, s as number, enemyUids(g)[0] as number);
    const ev = g.apply({ type: 'skip_reward', kind: 'card' });
    expect(eventsOf(ev, 'shards')).toEqual([{ t: 'shards', delta: 1, now: 1 }]);
    expect(g.state.history.floors.at(-1)?.shardsGained).toBe(1);

    const b = sandbox({ encounter: 'test_enc_boss', boss: true });
    b.state.room = 'boss';
    for (const e of combatOf(b).enemies) e.hp = 1;
    const [bs] = setHand(b, ['test_strike']);
    play(b, bs as number, enemyUids(b)[0] as number);
    b.state.player.counters.shards = 9;
    b.apply({ type: 'pick_reward', kind: 'card', index: 0 });
    b.apply({ type: 'proceed' });
    expect(b.legalActions()).toContainEqual({ type: 'skip_boss_relic' });
    const ev2 = b.apply({ type: 'skip_boss_relic' });
    expect(b.state.player.counters.shards).toBe(10);
    expect(eventsOf(ev2, 'cap_hit')).toEqual([{ t: 'cap_hit', cap: 'cap_stacks' }]);
    expect(b.state.act).toBe(2);
  });

  it('shop removal by Shard: 1 Shard + 25 gold, no price escalation', () => {
    const g = inRoom('shop', 'shardshop', (s) => {
      s.player.gold = 500;
      s.player.counters.shards = 2;
    });
    const uid = g.state.player.deck[0]?.uid as number;
    g.apply({ type: 'shop_remove', uid, pay: 'shard' });
    expect(g.state.player.counters.shards).toBe(1);
    expect(g.state.player.gold).toBe(475);
    expect(g.state.counters.shopRemovals).toBe(0);
    expect(g.legalActions().some((a) => a.type === 'shop_remove')).toBe(false);
  });

  it('rest Transmute: pay 1 Shard, 2 same-rarity offers, upgrade kept; Bloom carries between Bloom cards', () => {
    const g = inRoom('rest', 'transmute', (s) => {
      s.player.counters.shards = 1;
      const sprout = s.player.deck.find((c) => c.id === 'test_sprout');
      if (!sprout) throw new Error('setup');
      sprout.upgraded = true;
      sprout.vars = { bloom: 4 };
    });
    const idx = g.state.rest?.specials.indexOf('rest_transmute') ?? -1;
    g.apply({ type: 'rest_special', index: idx });
    expect(g.state.player.counters.shards).toBe(0);
    const sprout = g.state.player.deck.find((c) => c.id === 'test_sprout');
    if (!sprout) throw new Error('setup');
    g.apply({ type: 'resolve_choice', uids: [sprout.uid] });
    const pc = g.state.pendingChoice;
    expect(pc?.kind).toBe('offers');
    expect(pc?.offers).toHaveLength(2);
    expect(pc?.offers.every((o) => o.id !== 'test_sprout' && o.upgraded)).toBe(true);
    g.apply({ type: 'resolve_choice', uids: [0] });
    expect(g.state.player.deck.some((c) => c.uid === sprout.uid)).toBe(false);

    const h = Game.newRun('carry', 'test_class');
    const card = h.state.player.deck.find((c) => c.id === 'test_sprout');
    if (!card) throw new Error('setup');
    card.vars = { bloom: 4 };
    const env = makeEnv(h.state);
    transmutePick(env, card.uid, { id: 'fx_bloom_common', upgraded: false });
    expect(h.state.player.deck.find((c) => c.id === 'fx_bloom_common')?.vars).toEqual({ bloom: 4 });
  });

  it('full potion slots: choose one to discard (or leave it)', () => {
    const g = sandbox();
    g.state.player.potions = ['test_potion_heal', 'test_potion_heal', 'test_potion_heal'];
    for (const e of combatOf(g).enemies) e.hp = 1;
    const [s] = setHand(g, ['test_strike']);
    play(g, s as number, enemyUids(g)[0] as number);
    g.state.reward && (g.state.reward.potion = 'test_potion_fire');
    g.apply({ type: 'pick_reward', kind: 'potion' });
    expect(g.state.pendingChoice?.labels).toHaveLength(4);
    g.apply({ type: 'resolve_choice', uids: [0] });
    expect(g.state.player.potions).toEqual(['test_potion_heal', 'test_potion_heal', 'test_potion_fire']);
  });

  it('elite nodes carry pre-assigned encounters; Hunted (pact_hunted) applies to the first elite', () => {
    const g = inRoom('elite', 'elite-node', (s) => {
      const node = s.map.rows.flat().find((n) => n.type === 'elite');
      if (!node) throw new Error('no elite');
      s.mapPos = { row: node.row, col: node.col };
      s.player.counters.hunted_pending = 1;
    });
    const node = g.state.mapPos ? g.state.map.rows.flat().find((n) => n.row === g.state.mapPos?.row && n.col === g.state.mapPos?.col) : undefined;
    expect(combatOf(g).encounterId).toBe(node?.encounterId);
    for (const e of combatOf(g).enemies) expect(e.statuses.elite_hunted).toBe(1);
    expect(g.state.player.counters.hunted_pending).toBe(0);
  });

  it('halt: a normal enemy skips its move; bosses are immune', () => {
    const b = sandbox({ encounter: 'test_enc_boss', boss: true });
    b.state.player.potions = ['test_potion_halt'];
    const ev = b.apply({ type: 'use_potion', index: 0, target: enemyUids(b)[0] as number });
    expect(eventsOf(ev, 'text')).toEqual([{ t: 'text', text: 'Immune to Halt.' }]);
    expect(combatOf(b).enemies[0]?.statuses.halted).toBeUndefined();
  });

  it('a hook may queue a choice (RULINGS 21) and spend-all at 0 still runs (RULINGS 33)', () => {
    const g = sandbox();
    pacify(g);
    const env = makeEnv(g.state);
    enqueue(env, [{ kind: 'effect', effect: { type: 'spend_status', id: 'onslaught', n: 'all', effects: [{ type: 'block', amount: 4 }] }, frame: { src: { kind: 'system' }, self: 'player', target: null, x: 0 } }]);
    drain(env);
    expect(combatOf(g).player.block).toBe(4);
    const actions: Action[] = g.legalActions();
    expect(actions.length).toBeGreaterThan(0);
  });
});
