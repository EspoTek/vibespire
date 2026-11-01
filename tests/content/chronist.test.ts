import '../testpack';
// Chronist pool (docs/cards/chronist.md, v2: docs/v2/chronist-design.md): roster, starters, every card played
// base + upgraded, and the class mechanics the pool leans on (Cadence, Delay / Timeline, Advance, Augury reads,
// the named fns). The v2 mechanics (Chorus, Gather, Quicken, Crescendo, Goad, Schedule, ...) are in chronist-v2.test.ts.
import { describe, expect, it } from 'vitest';
import { getCardDef, getStatusDef } from '../../src/content';
import { CHRONIST_CARDS, CHRONIST_STATUSES } from '../../src/content/cards/chronist';
import { Game, TUNING, canPlayCard, getCardCost, nextBeat, renderCardText, renderStatusText, type Action, type CardId, type GameEvent } from '../../src/engine';
import { makeCard } from '../../src/engine/cards';
import { combatOf, enemy, enemyUids, eventsOf, play, sandbox, setHand } from '../engine/helpers';

// Pool order (v1 order with the 12 v2 cuts removed, then the v2 additions).
const IDS = {
  starter: ['pulse_shot', 'ward', 'tick', 'tock'],
  common: [
    'pinion_jab', 'gear_train', 'downbeat', 'noon_gun', 'afterpeal', 'spring_tide', 'carillon', 'storm_glass',
    'almanac', 'ephemeris', 'upbeat', 'weather_eye', 'balance_wheel', 'dead_reckoning', 'wind_forward',
    'hold_the_hour', 'ripple', 'whistle_for_wind', 'red_sky', 'undertow',
  ],
  uncommon: [
    'fermata', 'appointed_hour', 'knell', 'turn_the_tide', 'confluence', 'second_hand', 'mainspring', 'quarter_chime', 'hasten',
    'banked_hours', 'breakwater', 'heave_to', 'striking_train', 'tide_table', 'escapement',
    'accelerando', 'bell_choir', 'set_the_hour', 'gathering_storm', 'squall_line',
  ],
  rare: [
    'zenith', 'syzygy', 'culmination', 'toll_the_hours', 'seen_it_coming', 'tourbillon', 'lighthouse', 'polyrhythm', 'watch_bell', 'perpetual_motion',
    'total_eclipse', 'eternal_return', 'reckoning', 'eye_of_the_storm',
  ],
} as const;

const FILLER: CardId[] = Array.from({ length: 20 }, () => 'ward');

/** A sandbox combat with sturdy enemies, a sturdy player and plenty of energy. */
function fresh(encounter = 'test_enc_slime', seed = 'chronist'): Game {
  const g = sandbox({ seed, encounter, deck: FILLER });
  for (const e of combatOf(g).enemies) e.hp = e.maxHp = 999;
  g.state.player.hp = g.state.player.maxHp = 999;
  combatOf(g).energy = 10;
  return g;
}

/** Answer pending choices with the first legal answer until none is pending. */
function settle(g: Game): void {
  for (let i = 0; i < 20; i++) {
    const pc = g.state.phase === 'combat' ? g.state.combat?.pendingChoice : g.state.pendingChoice;
    if (!pc) return;
    g.apply(g.legalActions()[0] as Action);
  }
  throw new Error('choices never settled');
}

/** Pretend `n` counted plays already happened this turn (the next play is beat n + 1). */
function playedAlready(g: Game, n: number): void {
  combatOf(g).cardsPlayedThisTurn = Array.from({ length: n }, () => 'ward');
}

function endTurn(g: Game): GameEvent[] {
  setHand(g, []);
  const ev = g.apply({ type: 'end_turn' });
  settle(g);
  return ev;
}

const playerHits = (ev: GameEvent[], target?: number) =>
  eventsOf(ev, 'damage').filter((d) => d.source === 'player' && (target === undefined || d.target === target)).map((d) => d.amount);

describe('Chronist roster', () => {
  it('v2 pool: 58 cards (4 / 20 / 20 / 14, RULINGS 59), in pool order', () => {
    expect(CHRONIST_CARDS).toHaveLength(58);
    for (const rarity of ['starter', 'common', 'uncommon', 'rare'] as const) {
      expect(CHRONIST_CARDS.filter((c) => c.rarity === rarity).map((c) => c.id)).toEqual([...IDS[rarity]]);
    }
    expect(CHRONIST_CARDS.every((c) => c.cls === 'chronist')).toBe(true);
    const v2 = CHRONIST_CARDS;
    expect(['starter', 'common', 'uncommon', 'rare'].map((r) => v2.filter((c) => c.rarity === r).length)).toEqual([4, 20, 20, 14]);
    // Types, Delay and 0-cost counts from chronist-design.md §4.5.
    expect(v2.filter((c) => c.type === 'attack')).toHaveLength(23);
    expect(v2.filter((c) => c.type === 'skill')).toHaveLength(24);
    expect(v2.filter((c) => c.type === 'power')).toHaveLength(11);
    expect(v2.filter((c) => c.delay !== undefined)).toHaveLength(17);
    expect(v2.filter((c) => c.cost === 0)).toHaveLength(19); // 17 in §4.5, + Accelerando (Phase C, §15) and Squall Line (Phase D, §16)
    // Every card carries exactly one role:* tag, and every non-glue card at least one engine:* tag (sim johnny bots).
    for (const c of v2) {
      const tags = c.tags ?? [];
      const roles = tags.filter((t) => t.startsWith('role:'));
      expect(roles, c.id).toHaveLength(1);
      expect(['role:enabler', 'role:payoff', 'role:multiplier', 'role:glue']).toContain(roles[0]);
      if (roles[0] !== 'role:glue') expect(tags.some((t) => t.startsWith('engine:')), c.id).toBe(true);
    }
    // Each engine has exactly the multipliers chronist-design.md §2 names.
    const mult = (e: string) => v2.filter((c) => c.tags?.includes(`engine:${e}`) && c.tags.includes('role:multiplier')).map((c) => c.id);
    expect(mult('clockwork')).toEqual(['polyrhythm', 'perpetual_motion']);
    expect(mult('conjunction')).toEqual(['total_eclipse']);
    expect(mult('storm')).toEqual(['eye_of_the_storm']);
    expect(mult('calendar')).toEqual(['eternal_return']);
    // Every Power applies its own status (status id = card id) and that status is registered.
    for (const c of CHRONIST_CARDS.filter((x) => x.type === 'power')) {
      expect(c.effects).toEqual([{ type: 'status', target: 'self', id: c.id, amount: expect.any(Number) }]);
      expect(getStatusDef(c.id)).toBe(CHRONIST_STATUSES.find((s) => s.id === c.id));
    }
  });

  it('starters match GDD §4.1 exactly', () => {
    const t = (id: string, up: boolean) => renderCardText({ id, upgraded: up }, null);
    expect([t('pulse_shot', false), t('pulse_shot', true)]).toEqual(['Deal 6 damage.', 'Deal 9 damage.']);
    expect([t('ward', false), t('ward', true)]).toEqual(['Gain 5 Block.', 'Gain 8 Block.']);
    expect([t('tick', false), t('tick', true)]).toEqual(['Deal 3 damage. On beat: draw 1 card.', 'Deal 4 damage. On beat: draw 2 cards.']);
    expect([t('tock', false), t('tock', true)]).toEqual(['Gain 3 Block. Delay 1: gain 5 Block.', 'Gain 4 Block. Delay 1: gain 7 Block.']);
    const shape = (id: string) => {
      const d = getCardDef(id);
      return [d.type, d.cost, d.rarity];
    };
    expect(['pulse_shot', 'ward', 'tick', 'tock'].map(shape)).toEqual([
      ['attack', 1, 'starter'], ['skill', 1, 'starter'], ['attack', 0, 'starter'], ['skill', 1, 'starter'],
    ]);
  });

  it('every text renders base and upgraded with no unresolved placeholder and no typed digit', () => {
    const g = fresh('test_enc_jaw_slime');
    const target = enemyUids(g)[0] as number;
    for (const def of CHRONIST_CARDS) {
      for (const upgraded of [false, true]) {
        const merged = getCardDef(def.id, upgraded);
        expect(merged.text.replace(/\{[a-z_0-9]+\}/g, ''), `${def.id}${upgraded ? '+' : ''} text`).not.toMatch(/\d/);
        const card = makeCard(g.state, def.id, upgraded);
        combatOf(g).hand = [card];
        for (const s of [renderCardText(card, null), renderCardText(card, g.state, target), renderCardText(card, g.state, null)]) {
          expect(s, `${def.id}${upgraded ? '+' : ''}`).not.toMatch(/[{}]/);
        }
      }
    }
    for (const s of CHRONIST_STATUSES) {
      expect(s.text.replace(/\{[a-z_0-9]+\}/g, '')).not.toMatch(/\d/);
      for (const n of [1, 2, 3]) expect(renderStatusText(s.id, n)).not.toMatch(/[{}]/);
    }
    expect(renderCardText({ id: 'watch_bell', upgraded: false }, null)).toBe('Whenever a card on your Timeline resolves, gain 2 Block, +2 if any enemy intends to attack.');
    expect(renderStatusText('watch_bell', 2)).toBe('Whenever a card on your Timeline resolves, gain 4 Block, +4 if any enemy intends to attack.');
    expect(renderCardText({ id: 'toll_the_hours', upgraded: true }, null)).toBe('Deal 7 damage X times. Delay 1: deal 7 damage X times.');
  });
});

describe('every Chronist card plays base and upgraded, off and on the beat', () => {
  for (const def of CHRONIST_CARDS) {
    for (const upgraded of [false, true]) {
      for (const beat of [false, true]) {
        it(`${def.id}${upgraded ? '+' : ''} ${beat ? 'on' : 'off'} the beat`, () => {
          const g = fresh('test_enc_jaw_slime', `play-${def.id}-${upgraded}-${beat}`);
          const c = combatOf(g);
          g.state.player.counters.shards = 3;
          // On-beat runs also start with a Timeline entry (Advance / Timeline-count branches).
          if (beat) {
            playedAlready(g, 2);
            c.timeline.push({ card: makeCard(g.state, 'noon_gun'), dueTurn: c.turn + 2, seq: 900, onBeat: false, target: enemyUids(g)[0] ?? null, x: 0, advancedThisTurn: false });
          }
          const card = makeCard(g.state, def.id, upgraded);
          c.hand = [card, makeCard(g.state, 'pulse_shot'), makeCard(g.state, 'ward')];
          const ok = canPlayCard(g.state, card);
          if (def.id === 'zenith' && !beat) return void expect(ok).toBe('Only on the beat.');
          expect(ok).toBe(true);
          const action = g.legalActions().find((a) => a.type === 'play_card' && a.uid === card.uid);
          if (!action) throw new Error('no play action');
          const ev = g.apply(action);
          settle(g);
          expect(eventsOf(ev, 'card_played')[0]?.onBeat).toBe(beat);
          if (def.delay) expect(eventsOf(ev, 'timeline_added').map((x) => x.uid)).toEqual([card.uid]);
          // Run the turns out so every delayed payload resolves.
          for (let i = 0; i < 4 && g.state.phase === 'combat'; i++) endTurn(g);
          expect(g.state.phase).toBe('combat');
        });
      }
    }
  }
});

describe('Cadence', () => {
  it("an on-beat clause fires only as the 3rd / 6th / 9th play (Tick's draw)", () => {
    const g = fresh();
    const t = enemyUids(g)[0] as number;
    const uids = setHand(g, Array.from({ length: 9 }, () => 'tick'));
    const drewOn: number[] = [];
    uids.forEach((uid, i) => {
      const ev = play(g, uid, t);
      if (eventsOf(ev, 'draw').length > 0) drewOn.push(i + 1);
    });
    expect(drewOn).toEqual([3, 6, 9]);
  });

  it('a Delay card stamps the beat at play and pays it on resolution (Second Hand)', () => {
    const g = fresh();
    const t = enemyUids(g)[0] as number;
    const [off] = setHand(g, ['second_hand']);
    play(g, off as number, t);
    playedAlready(g, 2);
    const [on] = setHand(g, ['second_hand']);
    play(g, on as number, t);
    expect(combatOf(g).timeline.map((e) => [e.card.uid, e.onBeat])).toEqual([[off, false], [on, true]]);
    const ev = endTurn(g);
    expect(playerHits(ev, t)).toEqual([4, 4, 5]);
  });
});

describe('Delay and the Timeline', () => {
  it('Noon Gun lands on the Timeline and resolves on the due turn against the stamped target', () => {
    const g = fresh('test_enc_slimes');
    const [, b] = enemyUids(g) as [number, number];
    const turn = combatOf(g).turn;
    const [n] = setHand(g, ['noon_gun']);
    const ev = play(g, n as number, b);
    expect(eventsOf(ev, 'timeline_added')).toEqual([{ t: 'timeline_added', uid: n, dueTurn: turn + 2, onBeat: false }]);
    expect(combatOf(g).timeline[0]).toMatchObject({ target: b, dueTurn: turn + 2 });
    expect(combatOf(g).discard.some((x) => x.uid === n)).toBe(false);
    const ev1 = endTurn(g);
    expect(eventsOf(ev1, 'timeline_resolved')).toEqual([]);
    expect(combatOf(g).timeline).toHaveLength(1);
    const ev2 = endTurn(g);
    expect(combatOf(g).turn).toBe(turn + 2);
    expect(eventsOf(ev2, 'timeline_resolved').map((r) => r.uid)).toEqual([n]);
    expect(eventsOf(ev2, 'damage').filter((d) => d.source === 'player')).toEqual([expect.objectContaining({ target: b, amount: 14 })]);
    expect(combatOf(g).timeline).toEqual([]);
    expect(combatOf(g).discard.some((x) => x.uid === n) || combatOf(g).hand.some((x) => x.uid === n)).toBe(true);
  });

  it('Tock is a split card: Block now, more Block at the next turn start', () => {
    const g = fresh();
    const [t] = setHand(g, ['tock']);
    play(g, t as number);
    expect(combatOf(g).player.block).toBe(3);
    endTurn(g);
    expect(combatOf(g).player.block).toBe(5);
  });

  it('Advance resolves a due entry mid-turn; the relayed card is then unplayable this turn', () => {
    const g = fresh();
    const t = enemyUids(g)[0] as number;
    const [n, h, w] = setHand(g, ['noon_gun', 'hasten', 'wind_forward']);
    play(g, n as number, t);
    const evH = play(g, h as number); // 2nd play: Advance 1, off the beat
    expect(eventsOf(evH, 'timeline_resolved')).toEqual([]);
    expect(combatOf(g).timeline[0]?.dueTurn).toBe(combatOf(g).turn + 1);
    const evW = play(g, w as number); // Advance 1 more: due now
    expect(eventsOf(evW, 'timeline_resolved').map((r) => r.uid)).toEqual([n]);
    expect(playerHits(evW, t)).toEqual([14]);
    expect(combatOf(g).timeline).toEqual([]);
    const relayed = combatOf(g).discard.find((x) => x.uid === n);
    if (!relayed) throw new Error('resolved Noon Gun not in discard');
    combatOf(g).discard = combatOf(g).discard.filter((x) => x.uid !== n);
    combatOf(g).hand.push(relayed);
    expect(canPlayCard(g.state, relayed)).toBe('Already resolved from the Timeline this turn.');
  });

  it('Wind Forward falls back to Block on an empty Timeline; on-beat Hasten uses the whole Advance allowance', () => {
    const g = fresh();
    const [w] = setHand(g, ['wind_forward']);
    play(g, w as number);
    expect(combatOf(g).player.block).toBe(4);

    const h = fresh();
    const [sy, ha] = setHand(h, ['spring_tide', 'hasten']);
    play(h, sy as number);
    playedAlready(h, 2);
    play(h, ha as number);
    expect(combatOf(h).timeline[0]?.dueTurn).toBe(combatOf(h).turn + 1);
    expect(combatOf(h).counters.advance).toBe(TUNING.caps.advancePerTurn);
  });

  it('Toll the Hours stamps X on the Timeline entry', () => {
    const g = fresh();
    const t = enemyUids(g)[0] as number;
    combatOf(g).energy = 3;
    const [x] = setHand(g, ['toll_the_hours']);
    expect(playerHits(play(g, x as number, t), t)).toEqual([5, 5, 5]);
    expect(combatOf(g).timeline[0]?.x).toBe(3);
    expect(playerHits(endTurn(g), t)).toEqual([5, 5, 5]);
  });
});

describe('Augury reads', () => {
  it('forecast_damage scales Turn the Tide and Heave To; intent_damage feeds Seen It Coming at resolution', () => {
    for (const [id, check] of [
      ['turn_the_tide', (g: Game, ev: GameEvent[]) => expect(playerHits(ev)).toEqual([3 + 20])], // v2: the full forecast
      ['heave_to', (g: Game) => expect(combatOf(g).player.guard).toBe(1 + 10)],
    ] as const) {
      const g = fresh('test_enc_slime');
      const e = combatOf(g).enemies[0];
      if (!e) throw new Error('setup');
      e.forecast = [{ kind: 'attack', moveId: 'tackle', damage: 10, hits: 2 }]; // 20 forecast damage: +half = 10
      const [uid] = setHand(g, [id]);
      check(g, play(g, uid as number, e.uid));
    }

    // Seen It Coming reads the stamped target's current intent when it resolves (Jaw always attacks).
    const j = fresh('test_enc_jaw');
    const jaw = combatOf(j).enemies[0];
    if (!jaw) throw new Error('setup');
    const [sic] = setHand(j, ['seen_it_coming']);
    play(j, sic as number, jaw.uid);
    endTurn(j);
    const intent = combatOf(j).enemies[0]?.intent;
    if (!intent?.damage) throw new Error('jaw should intend an attack');
    expect(combatOf(j).player.block).toBe(intent.damage * (intent.hits ?? 1));
    expect(combatOf(j).exhaust.some((x) => x.uid === sic)).toBe(true);
  });

});

describe('named functions and Power hooks', () => {
  it('Zenith and the Perpetual Motion price follow the engine nextBeat (offset, beatPositions modifier)', () => {
    const g = fresh();
    const c = combatOf(g);
    const [zUid, sUid] = setHand(g, ['zenith', 'pulse_shot']);
    c.player.statuses.perpetual_motion = 1;
    const inHand = (uid: number) => {
      const x = combatOf(g).hand.find((h) => h.uid === uid);
      if (!x) throw new Error('not in hand');
      return x;
    };
    const sample = (): boolean[] =>
      Array.from({ length: 13 }, (_, n) => {
        playedAlready(g, n);
        const engine = nextBeat(g.state).onBeat;
        expect(getCardCost(g.state, inHand(sUid as number))).toBe(engine ? 0 : 1);
        expect(canPlayCard(g.state, inHand(zUid as number)) === true).toBe(engine);
        return engine;
      });
    expect(sample().flatMap((b, i) => (b ? [i + 1] : []))).toEqual([3, 6, 9]);
    c.counters.beatOffset = 1;
    expect(sample().flatMap((b, i) => (b ? [i + 1] : []))).toEqual([2, 5, 8]);
    delete c.counters.beatOffset;
    // A player-status beatPositions modifier (as Metronome Heart adds 12): patch one of this pack's statuses.
    const st = getStatusDef('polyrhythm');
    const hooks = st.hooks;
    if (!hooks) throw new Error('polyrhythm has hooks');
    hooks.beatPositions = (_ctx, p) => [...p, 12];
    try {
      c.player.statuses.polyrhythm = 1;
      expect(sample().flatMap((b, i) => (b ? [i + 1] : []))).toEqual([3, 6, 9, 12]);
    } finally {
      delete hooks.beatPositions;
    }
  });

  it('Zenith only on the beat', () => {
    const g = fresh();
    const t = enemyUids(g)[0] as number;
    const [z] = setHand(g, ['zenith']);
    const zc = combatOf(g).hand[0];
    if (!zc) throw new Error('setup');
    expect(canPlayCard(g.state, zc)).toBe('Only on the beat.');
    playedAlready(g, 2);
    expect(canPlayCard(g.state, zc)).toBe(true);
    expect(playerHits(play(g, z as number, t))).toEqual([10]);
  });

  it('Polyrhythm repeats on-beat lists (onBeatRepeats), at most three runs in all', () => {
    const g = fresh();
    const t = enemyUids(g)[0] as number;
    const [p, tk] = setHand(g, ['polyrhythm', 'tick']);
    play(g, p as number);
    expect(combatOf(g).player.statuses.polyrhythm).toBe(1);
    playedAlready(g, 2);
    expect(eventsOf(play(g, tk as number, t), 'draw').flatMap((d) => d.uids)).toHaveLength(2);
    combatOf(g).player.statuses.polyrhythm = 5;
    playedAlready(g, 5);
    const [tk2] = setHand(g, ['tick']);
    expect(eventsOf(play(g, tk2 as number, t), 'draw').flatMap((d) => d.uids)).toHaveLength(TUNING.caps.onBeatRuns);
  });

  it('Perpetual Motion (v2): every card played on the beat costs 0; X costs and off-beat plays pay in full', () => {
    const g = fresh();
    const t = enemyUids(g)[0] as number;
    const [pm] = setHand(g, ['perpetual_motion']);
    play(g, pm as number);
    const [d1, d2, x] = setHand(g, ['downbeat', 'downbeat', 'toll_the_hours']);
    const card = (uid: number) => {
      const c = combatOf(g).hand.find((h) => h.uid === uid);
      if (!c) throw new Error('not in hand');
      return c;
    };
    // 1 play so far: the next is beat 2 -> full cost.
    expect(getCardCost(g.state, card(d1 as number))).toBe(1);
    playedAlready(g, 2);
    expect(getCardCost(g.state, card(d1 as number))).toBe(0);
    expect(getCardCost(g.state, card(x as number))).toBe('X');
    const energy = combatOf(g).energy;
    play(g, d1 as number, t);
    expect(combatOf(g).energy).toBe(energy);
    // Not just the first: the next beat is free too.
    playedAlready(g, 5);
    expect(getCardCost(g.state, card(d2 as number))).toBe(0);
  });

  it('Escapement Advances when a Delay card goes on the Timeline on the beat, not off it', () => {
    const g = fresh();
    const t = enemyUids(g)[0] as number;
    const [es, sh1] = setHand(g, ['escapement', 'second_hand']);
    play(g, es as number);
    const evOff = play(g, sh1 as number, t); // 2nd play
    expect(eventsOf(evOff, 'timeline_resolved')).toEqual([]);
    expect(combatOf(g).timeline).toHaveLength(1);
    const [sh2] = setHand(g, ['second_hand']);
    const evOn = play(g, sh2 as number, t); // 3rd play: on the beat -> Advance 1 -> both entries due now
    expect(eventsOf(evOn, 'timeline_resolved').map((r) => r.uid)).toEqual([sh1, sh2]);
    expect(playerHits(evOn, t)).toEqual([4, 4, 5]);
  });

  it('Striking Train deals its stacks to ALL enemies after each on-beat play only', () => {
    const g = fresh('test_enc_slimes');
    const [a, b] = enemyUids(g) as [number, number];
    const [st, w1, w2] = setHand(g, ['striking_train', 'ward', 'ward']);
    play(g, st as number);
    expect(playerHits(play(g, w1 as number))).toEqual([]);
    const ev = play(g, w2 as number); // 3rd play
    expect(playerHits(ev, a)).toEqual([3]);
    expect(playerHits(ev, b)).toEqual([3]);
  });

  it('Tide Table and Watch Bell fire when a Timeline entry resolves', () => {
    const g = fresh('test_enc_jaw');
    const [tt, wb, tk] = setHand(g, ['tide_table', 'watch_bell', 'tock']);
    play(g, tt as number);
    play(g, wb as number);
    play(g, tk as number);
    const ev = endTurn(g);
    // Tock's 5 + Watch Bell 2 + 2 (Jaw always intends to attack); Tide Table draws 1 before the turn's 5.
    expect(combatOf(g).player.block).toBe(5 + 2 + 2);
    const draws = eventsOf(ev, 'draw').map((d) => d.uids.length);
    expect(draws[0]).toBe(1);
  });

  it('Tourbillon on the beat gains energy, then Scraps itself; off the beat it goes to the discard pile', () => {
    const g = fresh();
    const [off] = setHand(g, ['tourbillon']);
    const e0 = combatOf(g).energy;
    play(g, off as number);
    expect(combatOf(g).energy).toBe(e0);
    expect(combatOf(g).discard.some((x) => x.uid === off)).toBe(true);
    expect(combatOf(g).exhaust.some((x) => x.uid === off)).toBe(false);
    playedAlready(g, 2);
    const [on] = setHand(g, ['tourbillon']);
    const energy = combatOf(g).energy;
    play(g, on as number);
    expect(combatOf(g).energy).toBe(energy + 2);
    expect(combatOf(g).exhaust.some((x) => x.uid === on)).toBe(true);
    expect(combatOf(g).discard.some((x) => x.uid === on)).toBe(false);
    expect(combatOf(g).inPlay).toEqual([]);
  });
});
