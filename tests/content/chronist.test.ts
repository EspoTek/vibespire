import '../testpack';
// Chronist pool (docs/cards/chronist.md): roster, starters, every card played base + upgraded, and the
// class mechanics the pool leans on (Cadence, Delay / Timeline, Advance, Augury reads, the named fns).
import { describe, expect, it } from 'vitest';
import { getCardDef, getStatusDef } from '../../src/content';
import { CHRONIST_CARDS, CHRONIST_STATUSES } from '../../src/content/cards/chronist';
import { Game, TUNING, canPlayCard, getCardCost, nextBeat, renderCardText, renderStatusText, type Action, type CardId, type GameEvent } from '../../src/engine';
import { makeCard } from '../../src/engine/cards';
import { combatOf, enemy, enemyUids, eventsOf, play, sandbox, setHand } from '../engine/helpers';

const IDS = {
  starter: ['pulse_shot', 'ward', 'tick', 'tock'],
  common: [
    'pinion_jab', 'gear_train', 'downbeat', 'slack_water', 'parallax', 'noon_gun', 'afterpeal', 'spring_tide', 'carillon', 'storm_glass',
    'almanac', 'ephemeris', 'upbeat', 'weather_eye', 'balance_wheel', 'detent', 'dead_reckoning', 'logbook', 'reef_the_sails', 'wind_forward',
  ],
  uncommon: [
    'sweep_hand', 'fermata', 'appointed_hour', 'knell', 'turn_the_tide', 'confluence', 'second_hand', 'mainspring', 'quarter_chime', 'hasten',
    'banked_hours', 'breakwater', 'heave_to', 'batten_down', 'mark_the_lull', 'glance_ahead', 'striking_train', 'tide_table', 'storm_warning', 'escapement',
  ],
  rare: ['zenith', 'syzygy', 'culmination', 'toll_the_hours', 'seen_it_coming', 'star_tithe', 'tourbillon', 'lighthouse', 'polyrhythm', 'portents', 'watch_bell', 'perpetual_motion'],
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
  it('has 56 cards: 4 starters, 20 commons, 20 uncommons, 12 rares, in pool order', () => {
    expect(CHRONIST_CARDS).toHaveLength(56);
    for (const rarity of ['starter', 'common', 'uncommon', 'rare'] as const) {
      expect(CHRONIST_CARDS.filter((c) => c.rarity === rarity).map((c) => c.id)).toEqual([...IDS[rarity]]);
    }
    expect(CHRONIST_CARDS.every((c) => c.cls === 'chronist')).toBe(true);
    // Types and Delay counts from chronist.md §6.
    expect(CHRONIST_CARDS.filter((c) => c.type === 'attack')).toHaveLength(22);
    expect(CHRONIST_CARDS.filter((c) => c.type === 'skill')).toHaveLength(26);
    expect(CHRONIST_CARDS.filter((c) => c.type === 'power')).toHaveLength(8);
    expect(CHRONIST_CARDS.filter((c) => c.delay !== undefined)).toHaveLength(16);
    expect(CHRONIST_CARDS.filter((c) => c.cost === 0)).toHaveLength(19);
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
    expect(renderCardText({ id: 'watch_bell', upgraded: false }, null)).toBe('Whenever a card on your Timeline resolves, gain 3 Block, +3 if any enemy intends to attack.');
    expect(renderStatusText('watch_bell', 2)).toBe('Whenever a card on your Timeline resolves, gain 6 Block, +6 if any enemy intends to attack.');
    expect(renderCardText({ id: 'toll_the_hours', upgraded: true }, null)).toBe('Deal 8 damage X times. Delay 1: deal 8 damage X times.');
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
          if (def.id === 'upbeat' && beat) return void expect(ok).toBe("Can't be played on the beat.");
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
  it("an on-beat clause fires only as the 3rd / 6th / 9th play (Pinion Jab's Exposed)", () => {
    const g = fresh();
    const t = enemyUids(g)[0] as number;
    const uids = setHand(g, Array.from({ length: 9 }, () => 'pinion_jab'));
    const exposedOn: number[] = [];
    uids.forEach((uid, i) => {
      const ev = play(g, uid, t);
      if (eventsOf(ev, 'status').some((s) => s.status === 'exposed' && s.delta > 0)) exposedOn.push(i + 1);
    });
    expect(exposedOn).toEqual([3, 6, 9]);
    expect(enemy(g, t).statuses.exposed).toBe(3);
  });

  it('Sweep Hand branches on the beat: single target off it, ALL enemies on it', () => {
    const g = fresh('test_enc_slimes');
    const [a, b] = enemyUids(g) as [number, number];
    const [s1, s2] = setHand(g, ['sweep_hand', 'sweep_hand']);
    expect(playerHits(play(g, s1 as number, a))).toEqual([9]);
    playedAlready(g, 2);
    const ev = play(g, s2 as number, a);
    expect(playerHits(ev, a)).toEqual([9]);
    expect(playerHits(ev, b)).toEqual([9]);
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
    const t = enemyUids(h)[0] as number;
    const [sy, ha] = setHand(h, ['syzygy', 'hasten']);
    play(h, sy as number, t);
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
    expect(playerHits(play(g, x as number, t), t)).toEqual([6, 6, 6]);
    expect(combatOf(g).timeline[0]?.x).toBe(3);
    expect(playerHits(endTurn(g), t)).toEqual([6, 6, 6]);
  });
});

describe('Augury reads', () => {
  it('forecast_is_attack at depth 1: Slack Water and Culmination pay their window; a hidden forecast is not an attack', () => {
    // Cultist: intent Incantation (buff), forecast Stab (attack).
    const g = fresh('test_enc_cultist');
    const t = enemyUids(g)[0] as number;
    expect(enemy(g, t).forecast[0]?.kind).toBe('attack');
    const [s, cu] = setHand(g, ['slack_water', 'culmination']);
    expect(playerHits(play(g, s as number, t))).toEqual([7]);
    expect(playerHits(play(g, cu as number, t))).toEqual([14]);
    // Mystic: intent Hex, forecast Veiled Strike (hidden) => counts as not an attack (RULINGS 27).
    const m = fresh('test_enc_mystic');
    const mystic = combatOf(m).enemies.find((e) => e.id === 'test_mystic');
    if (!mystic) throw new Error('setup');
    expect(mystic.forecast[0]?.hidden).toBe(true);
    const [s2] = setHand(m, ['slack_water']);
    expect(playerHits(play(m, s2 as number, mystic.uid))).toEqual([9]);
  });

  it('forecast_damage scales Turn the Tide and Heave To; intent_damage feeds Seen It Coming at resolution', () => {
    for (const [id, check] of [
      ['turn_the_tide', (g: Game, ev: GameEvent[]) => expect(playerHits(ev)).toEqual([4 + 10])],
      ['heave_to', (g: Game) => expect(combatOf(g).player.guard).toBe(4 + 10)],
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

  it('Batten Down (delayed depth-0 read) staggers only an attacking target; Mark the Lull adds Exposed in a lull', () => {
    const g = fresh('test_enc_jaw');
    const jaw = enemyUids(g)[0] as number;
    const [bd] = setHand(g, ['batten_down']);
    play(g, bd as number, jaw);
    endTurn(g);
    expect(enemy(g, jaw).statuses.stagger).toBe(3);

    const c = fresh('test_enc_cultist');
    const cultist = enemyUids(c)[0] as number;
    const [ml] = setHand(c, ['mark_the_lull']);
    play(c, ml as number, cultist); // forecast Stab is an attack: no extra
    expect(enemy(c, cultist).statuses.exposed).toBe(1);
    const m = fresh('test_enc_mystic');
    const mystic = combatOf(m).enemies.find((e) => e.id === 'test_mystic');
    if (!mystic) throw new Error('setup');
    const [ml2] = setHand(m, ['mark_the_lull']);
    play(m, ml2 as number, mystic.uid); // hidden forecast: the lull bonus applies
    expect(enemy(m, mystic.uid).statuses.exposed).toBe(2);
  });
});

describe('named functions and Power hooks', () => {
  it('Zenith, Upbeat and the Perpetual Motion discount follow the engine nextBeat (offset, beatPositions modifier)', () => {
    const g = fresh();
    const c = combatOf(g);
    const [zUid, uUid, sUid] = setHand(g, ['zenith', 'upbeat', 'pulse_shot']);
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
        expect(canPlayCard(g.state, inHand(uUid as number)) === true).toBe(!engine);
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

  it('Zenith only on the beat; Upbeat never on it', () => {
    const g = fresh();
    const t = enemyUids(g)[0] as number;
    const [z, u] = setHand(g, ['zenith', 'upbeat']);
    const zc = combatOf(g).hand[0];
    const uc = combatOf(g).hand[1];
    if (!zc || !uc) throw new Error('setup');
    expect(canPlayCard(g.state, zc)).toBe('Only on the beat.');
    expect(canPlayCard(g.state, uc)).toBe(true);
    playedAlready(g, 2);
    expect(canPlayCard(g.state, zc)).toBe(true);
    expect(canPlayCard(g.state, uc)).toBe("Can't be played on the beat.");
    expect(playerHits(play(g, z as number, t))).toEqual([10]);
    expect(canPlayCard(g.state, uc)).toBe(true);
    play(g, u as number);
    expect(combatOf(g).player.block).toBe(4);
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

  it('Perpetual Motion: the first on-beat play each turn costs 1 less, then the discount is used up', () => {
    const g = fresh();
    const t = enemyUids(g)[0] as number;
    const [pm] = setHand(g, ['perpetual_motion']);
    play(g, pm as number);
    const shots = setHand(g, ['pulse_shot', 'pulse_shot']);
    const card = (uid: number) => {
      const x = combatOf(g).hand.find((h) => h.uid === uid);
      if (!x) throw new Error('not in hand');
      return x;
    };
    // 1 play so far: the next is beat 2 -> full cost.
    expect(getCardCost(g.state, card(shots[0] as number))).toBe(1);
    playedAlready(g, 2);
    expect(getCardCost(g.state, card(shots[0] as number))).toBe(0);
    const energy = combatOf(g).energy;
    play(g, shots[0] as number, t);
    expect(combatOf(g).energy).toBe(energy);
    expect(combatOf(g).player.statuses.perpetual_motion_used).toBe(1);
    playedAlready(g, 5);
    expect(getCardCost(g.state, card(shots[1] as number))).toBe(1);
    // Next turn the discount is back.
    endTurn(g);
    expect(combatOf(g).player.statuses.perpetual_motion_used).toBeUndefined();
    const [s3] = setHand(g, ['pulse_shot']);
    playedAlready(g, 2);
    expect(getCardCost(g.state, card(s3 as number))).toBe(0);
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
    // Tock's 5 + Watch Bell 3 + 3 (Jaw always intends to attack); Tide Table draws 1 before the turn's 5.
    expect(combatOf(g).player.block).toBe(5 + 3 + 3);
    const draws = eventsOf(ev, 'draw').map((d) => d.uids.length);
    expect(draws[0]).toBe(1);
  });

  it('Storm Warning and Portents act at turn start, reading intents and forecasts', () => {
    const g = fresh('test_enc_jaw');
    const jaw = enemyUids(g)[0] as number;
    const [sw, po] = setHand(g, ['storm_warning', 'portents']);
    play(g, sw as number);
    play(g, po as number);
    endTurn(g);
    expect(enemy(g, jaw).statuses.stagger).toBe(2);
    expect(enemy(g, jaw).statuses.exposed).toBe(1); // every forecast is an attack: no lull stack

    const m = fresh('test_enc_mystic');
    const [po2] = setHand(m, ['portents']);
    play(m, po2 as number);
    endTurn(m); // turn 2: the mystic intends Veiled Strike, its forecast is Hex (not an attack)
    for (const e of combatOf(m).enemies) expect(e.statuses.exposed).toBe(2);
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
