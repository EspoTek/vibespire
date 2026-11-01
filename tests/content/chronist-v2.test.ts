import '../testpack';
// Chronist v2 mechanics (docs/v2/chronist-design.md §2, §6): Chorus batches (H1), Gather (H2), Quicken (H3),
// Crescendo / beat_index (H4), Goad and the forecast tag (H5), Schedule (H6), Total Eclipse (H7),
// Eternal Return (H8), per-target damage (H9) and onStatusInflicted (H10), plus the reworked payoffs.
import { describe, expect, it } from 'vitest';
import { keywordsFor } from '../../src/content/keywords';
import { getCardDef } from '../../src/content';
import { Game, renderCardText, type Action, type CardId, type GameEvent } from '../../src/engine';
import { makeCard } from '../../src/engine/cards';
import type { CardInstance, EntityRef } from '../../src/engine/types';
import { combatOf, enemy, enemyUids, eventsOf, play, sandbox, setHand } from '../engine/helpers';
import { answerChoice } from '../answer-choice';

const FILLER: CardId[] = Array.from({ length: 20 }, () => 'ward');

function fresh(encounter = 'test_enc_slime', seed = 'chronist-v2'): Game {
  const g = sandbox({ seed, encounter, deck: FILLER });
  for (const e of combatOf(g).enemies) e.hp = e.maxHp = 999;
  g.state.player.hp = g.state.player.maxHp = 999;
  combatOf(g).energy = 10;
  return g;
}

function settle(g: Game): void {
  for (let i = 0; i < 20; i++) {
    const pc = g.state.phase === 'combat' ? g.state.combat?.pendingChoice : g.state.pendingChoice;
    if (!pc) return;
    g.apply(g.legalActions()[0] as Action);
  }
  throw new Error('choices never settled');
}

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

/** Put a card straight onto the Timeline, due `inTurns` turns from now. */
function onTimeline(g: Game, id: CardId, inTurns: number, target: EntityRef | null, seq: number): CardInstance {
  const c = combatOf(g);
  const card = makeCard(g.state, id);
  c.timeline.push({ card, dueTurn: c.turn + inTurns, seq, onBeat: false, target, x: 0, advancedThisTurn: false });
  return card;
}

const intentTotal = (g: Game, uid: number): number => {
  const i = enemy(g, uid).intent;
  return (i.damage ?? 0) * (i.hits ?? 1);
};

describe('Chorus (H1): cards resolving in the same batch boost each other', () => {
  it('three Ripples landing together each get +3 per other card (Phase E); one alone gets nothing', () => {
    const g = fresh();
    const t = enemyUids(g)[0] as number;
    const uids = setHand(g, ['ripple', 'ripple', 'ripple']);
    for (const u of uids) play(g, u, t);
    expect(playerHits(endTurn(g), t)).toEqual([4 + 3 * 2, 4 + 3 * 2, 4 + 3 * 2]);

    const h = fresh();
    const [r] = setHand(h, ['ripple']);
    play(h, r as number, enemyUids(h)[0]);
    expect(playerHits(endTurn(h))).toEqual([4]);
  });

  it('batches are per resolution step: cards due on different turns do not count each other', () => {
    const g = fresh();
    const t = enemyUids(g)[0] as number;
    onTimeline(g, 'ripple', 1, t, 900);
    onTimeline(g, 'ripple', 2, t, 901);
    expect(playerHits(endTurn(g), t)).toEqual([4]);
    expect(playerHits(endTurn(g), t)).toEqual([4]);
  });

  it('card text previews the Chorus from the entries already due on the turn it would land', () => {
    const g = fresh();
    const t = enemyUids(g)[0] as number;
    const [r] = setHand(g, ['ripple']);
    const card = combatOf(g).hand[0];
    if (!card || r === undefined) throw new Error('setup');
    expect(renderCardText(card, g.state, t)).toBe('Delay 1: deal 4 damage, Chorus +3.');
    onTimeline(g, 'noon_gun', 1, t, 900);
    onTimeline(g, 'almanac', 1, null, 901);
    expect(renderCardText(card, g.state, t)).toBe('Delay 1: deal 10 damage, Chorus +3.');
    expect(renderCardText({ id: 'syzygy', upgraded: false }, null)).toBe('Delay 2: deal 24 damage, Chorus +6.');
  });
});

describe('Gather (H2)', () => {
  it('moves every entry to the latest due turn, then one Advance fires them as one batch', () => {
    const g = fresh();
    const t = enemyUids(g)[0] as number;
    const turn = combatOf(g).turn;
    onTimeline(g, 'ripple', 1, t, 900);
    onTimeline(g, 'noon_gun', 2, t, 901);
    const [h] = setHand(g, ['hold_the_hour']);
    const ev = play(g, h as number);
    expect(eventsOf(ev, 'timeline_gathered')).toEqual([{ t: 'timeline_gathered', dueTurn: turn + 2 }]);
    expect(combatOf(g).timeline.map((e) => e.dueTurn)).toEqual([turn + 2, turn + 2]);
    expect(combatOf(g).player.block).toBe(4);
    expect(playerHits(endTurn(g))).toEqual([]);
    const [w] = setHand(g, ['wind_forward']);
    // Ripple 4 + 3, Noon Gun 14 + 4: each counts the other.
    expect(playerHits(play(g, w as number), t)).toEqual([7, 18]);
  });

  it('is a no-op with fewer than two entries or when they already share a turn', () => {
    const g = fresh();
    const [h1, h2] = setHand(g, ['hold_the_hour', 'hold_the_hour']);
    expect(eventsOf(play(g, h1 as number), 'timeline_gathered')).toEqual([]);
    onTimeline(g, 'ripple', 1, null, 900);
    onTimeline(g, 'almanac', 1, null, 901);
    expect(eventsOf(play(g, h2 as number), 'timeline_gathered')).toEqual([]);
  });

  it('Confluence (Phase D) counts the Timeline and no longer Gathers', () => {
    const g = fresh();
    const t = enemyUids(g)[0] as number;
    onTimeline(g, 'ripple', 1, t, 900);
    onTimeline(g, 'spring_tide', 3, null, 901);
    const [c] = setHand(g, ['confluence']);
    expect(playerHits(play(g, c as number, t))).toEqual([2 + 3 * 2]);
    expect(new Set(combatOf(g).timeline.map((e) => e.dueTurn)).size).toBe(2);
  });
});

describe('Quicken (H3) and Crescendo (H4)', () => {
  it('Quicken on the first card makes the second card the beat; on the second card it skips beat 3', () => {
    const g = fresh();
    const t = enemyUids(g)[0] as number;
    const [pj, tk] = setHand(g, ['pinion_jab', 'tick']);
    const ev = play(g, pj as number, t);
    expect(eventsOf(ev, 'beat_shift')).toEqual([{ t: 'beat_shift', delta: 1, now: 2 }]);
    expect(eventsOf(play(g, tk as number, t), 'card_played')[0]?.onBeat).toBe(true);

    const h = fresh();
    const u = enemyUids(h)[0] as number;
    const [a, b, c] = setHand(h, ['pulse_shot', 'pinion_jab', 'tick']);
    play(h, a as number, u);
    play(h, b as number, u); // count 2 -> 3: beat 3 is jumped over
    expect(eventsOf(play(h, c as number, u), 'card_played')[0]?.onBeat).toBe(false);
  });

  it('Dead Reckoning reads the beat count (plays + Quicken, this card included)', () => {
    const g = fresh();
    const [u, d] = setHand(g, ['upbeat', 'dead_reckoning']);
    play(g, u as number); // 3 Block, count 1 + 1
    play(g, d as number); // count 3: 0 + 3
    expect(combatOf(g).player.block).toBe(3 + 3);
  });

  it('Crescendo runs once per beat reached: Downbeat on beats 1 / 2 / 3, doubled by Polyrhythm', () => {
    for (const [already, beat] of [[1, 0], [2, 1], [5, 2], [8, 3]] as const) {
      const g = fresh();
      const t = enemyUids(g)[0] as number;
      playedAlready(g, already);
      const [d] = setHand(g, ['downbeat']);
      expect(playerHits(play(g, d as number, t))).toEqual([8, ...Array.from({ length: beat }, () => 6)]);
    }
    const g = fresh();
    const t = enemyUids(g)[0] as number;
    combatOf(g).player.statuses.polyrhythm = 1;
    playedAlready(g, 8);
    const [d] = setHand(g, ['downbeat']);
    expect(playerHits(play(g, d as number, t))).toHaveLength(1 + 3 * 2);
  });

  it('Accelerando Quickens at the start of each turn, so the 2nd card is on the beat', () => {
    const g = fresh();
    const t = enemyUids(g)[0] as number;
    const [ac] = setHand(g, ['accelerando']);
    play(g, ac as number);
    endTurn(g);
    expect(combatOf(g).counters.beatOffset).toBe(1);
    const [a, b] = setHand(g, ['pulse_shot', 'tick']);
    play(g, a as number, t);
    expect(eventsOf(play(g, b as number, t), 'card_played')[0]?.onBeat).toBe(true);
  });

  it('Accelerando (Phase C) costs 0; upgraded it is Opening', () => {
    expect(getCardDef('accelerando').cost).toBe(0);
    expect(renderCardText({ id: 'accelerando', upgraded: true }, null)).toBe('Opening. At the start of your turn, Quicken 1.');
  });

  it('Mainspring (Phase C): off the beat it Quickens toward the next beat; on the beat it also gains energy', () => {
    const g = fresh();
    const [m1] = setHand(g, ['mainspring']);
    const e0 = combatOf(g).energy;
    play(g, m1 as number); // count 1, off the beat: no energy, Quicken -> 2
    expect(combatOf(g).energy).toBe(e0);
    expect(combatOf(g).counters.beatOffset).toBe(1);
    const [m2] = setHand(g, ['mainspring']);
    const ev = play(g, m2 as number); // count 3: on the beat
    expect(eventsOf(ev, 'card_played')[0]?.onBeat).toBe(true);
    expect(combatOf(g).energy).toBe(e0 + 1);
    expect(combatOf(g).counters.beatOffset).toBe(2);
    expect(renderCardText({ id: 'mainspring', upgraded: false }, null)).toBe('On beat: gain 1 energy. Quicken 1.');
    expect(renderCardText({ id: 'mainspring', upgraded: true }, null)).toBe('On beat: gain 1 energy. Quicken 1. Draw 1 card.');
  });

  it('Culmination deals 3 per beat count', () => {
    const g = fresh();
    const t = enemyUids(g)[0] as number;
    playedAlready(g, 5);
    const [c] = setHand(g, ['culmination']);
    expect(playerHits(play(g, c as number, t))).toEqual([3 * 6]);
  });
});

describe('Goad (H5) and the Storm Reader payoffs', () => {
  it('Goad adds its stacks to every hit of the current intent, not to the forecast, and wears off after the enemy acts', () => {
    const g = fresh('test_enc_jaw');
    const jaw = enemyUids(g)[0] as number;
    const before = enemy(g, jaw).intent;
    const forecastBefore = JSON.stringify(enemy(g, jaw).forecast);
    const [w] = setHand(g, ['whistle_for_wind']);
    play(g, w as number, jaw);
    expect(enemy(g, jaw).statuses.goaded).toBe(3);
    expect(enemy(g, jaw).intent.damage).toBe((before.damage ?? 0) + 3);
    expect(JSON.stringify(enemy(g, jaw).forecast)).toBe(forecastBefore);
    endTurn(g);
    expect(enemy(g, jaw).statuses.goaded).toBeUndefined();
  });

  it('Gathering Storm Goads first, then gains Block from the bigger intent', () => {
    const g = fresh('test_enc_jaw');
    const jaw = enemyUids(g)[0] as number;
    const hits = enemy(g, jaw).intent.hits ?? 1;
    const total = intentTotal(g, jaw) + 2 * hits;
    const [gs] = setHand(g, ['gathering_storm']);
    play(g, gs as number, jaw);
    expect(combatOf(g).player.block).toBe(2 + Math.floor(total / 2));
  });

  it('Undertow deals 3 + half the damage it intends; Squall Line deals its stacks per Goad applied', () => {
    const g = fresh('test_enc_jaw');
    const jaw = enemyUids(g)[0] as number;
    const total = intentTotal(g, jaw);
    const [u, sl, rs] = setHand(g, ['undertow', 'squall_line', 'red_sky']);
    expect(playerHits(play(g, u as number, jaw))).toEqual([3 + Math.floor(total / 2)]);
    play(g, sl as number);
    expect(playerHits(play(g, rs as number, jaw))).toEqual([3 * 2]);
  });

  it('Eye of the Storm: at the end of your turn each enemy takes half of its own intent', () => {
    const g = fresh('test_enc_jaw_slime');
    const [jaw, slime] = enemyUids(g) as [number, number];
    const [eye] = setHand(g, ['eye_of_the_storm']);
    play(g, eye as number);
    const expectJaw = Math.floor(intentTotal(g, jaw) / 2);
    const expectSlime = Math.floor(intentTotal(g, slime) / 2);
    const ev = endTurn(g);
    expect(playerHits(ev, jaw).slice(0, 1)).toEqual(expectJaw > 0 ? [expectJaw] : [0]);
    expect(playerHits(ev, slime).slice(0, 1)).toEqual(expectSlime > 0 ? [expectSlime] : [0]);
  });

  it('Reckoning resolves for twice the damage it then intends, and Scraps', () => {
    const g = fresh('test_enc_jaw');
    const jaw = enemyUids(g)[0] as number;
    const [r] = setHand(g, ['reckoning']);
    play(g, r as number, jaw);
    const ev = endTurn(g);
    const resolvedAt = eventsOf(ev, 'timeline_resolved').length;
    expect(resolvedAt).toBe(1);
    // The resolution reads the intent chosen for this turn (the after-next move when it was played).
    expect(playerHits(ev, jaw)).toEqual([2 * intentTotal(g, jaw)]);
    expect(combatOf(g).exhaust.some((x) => x.uid === r)).toBe(true);
  });

  it('Lighthouse gains Guard equal to half the damage every enemy intends after next', () => {
    const g = fresh('test_enc_slimes');
    for (const e of combatOf(g).enemies) e.forecast = [{ kind: 'attack', moveId: 'tackle', damage: 6, hits: 1 }];
    const [l] = setHand(g, ['lighthouse']);
    play(g, l as number);
    expect(combatOf(g).player.block).toBe(4);
    expect(combatOf(g).player.guard).toBe(6);
  });
});

describe('Schedule (H6)', () => {
  it('puts the only eligible hand card on the Timeline; it resolves its effects for free next turn, not on the beat', () => {
    const g = fresh();
    const t = enemyUids(g)[0] as number;
    const [st, ps, tk] = setHand(g, ['set_the_hour', 'pulse_shot', 'tock']);
    combatOf(g).draw = [];
    combatOf(g).discard = [];
    play(g, st as number, t);
    // Tock has Delay: only Pulse Shot is eligible, so no choice opens.
    expect(combatOf(g).pendingChoice).toBeNull();
    expect(combatOf(g).timeline).toEqual([expect.objectContaining({ scheduled: true, target: t, onBeat: false })]);
    expect(combatOf(g).timeline[0]?.card.uid).toBe(ps);
    expect(combatOf(g).hand.map((c) => c.uid)).toEqual([tk]);
    const ev = endTurn(g);
    expect(playerHits(ev, t)).toEqual([6]);
    // Free: no energy was paid for it after the turn-start refill.
    expect(combatOf(g).energy).toBe(combatOf(g).maxEnergy);
    expect([...combatOf(g).discard, ...combatOf(g).hand, ...combatOf(g).draw].some((c) => c.uid === ps)).toBe(true);
  });

  it('opens a choice when several cards qualify; Powers and Delay cards never qualify', () => {
    const g = fresh();
    const t = enemyUids(g)[0] as number;
    const [st, , , ps2] = setHand(g, ['set_the_hour', 'polyrhythm', 'noon_gun', 'pulse_shot', 'ward']);
    play(g, st as number, t);
    const pc = combatOf(g).pendingChoice;
    expect(pc?.choices).toHaveLength(2);
    answerChoice(g, [ps2 as number]);
    expect(combatOf(g).timeline.map((e) => e.card.id)).toEqual(['pulse_shot']);
  });

  it('Paradox Coil returns a Scheduled card as a Scheduled entry (it resolves its effects again)', () => {
    const g = sandbox({ seed: 'chronist-v2-coil', encounter: 'test_enc_slime', deck: FILLER, relics: ['paradox_coil'] });
    for (const e of combatOf(g).enemies) e.hp = e.maxHp = 999;
    g.state.player.hp = g.state.player.maxHp = 999;
    combatOf(g).energy = 10;
    const t = enemyUids(g)[0] as number;
    const [st, ps] = setHand(g, ['set_the_hour', 'pulse_shot']);
    play(g, st as number, t);
    setHand(g, []);
    g.apply({ type: 'end_turn' });
    const pc = combatOf(g).pendingChoice;
    expect(pc?.labels[0]).toMatch(/^Return it/);
    answerChoice(g, [pc?.choices[0] as number]);
    expect(combatOf(g).timeline).toEqual([expect.objectContaining({ scheduled: true })]);
    expect(combatOf(g).timeline[0]?.card.uid).toBe(ps);
    endTurn(g);
    expect(playerHits(endTurn(g), t)).toEqual([6]);
  });

  it('RULINGS 58: a Scheduled Zenith ignores "only on the beat"', () => {
    const g = fresh();
    const t = enemyUids(g)[0] as number;
    const [st] = setHand(g, ['set_the_hour', 'zenith']);
    play(g, st as number, t);
    expect(combatOf(g).timeline.map((e) => e.card.id)).toEqual(['zenith']);
    expect(playerHits(endTurn(g), t)).toEqual([10]);
  });
});

describe('Total Eclipse (H7) and Eternal Return (H8)', () => {
  it('a batch of two or more (Phase D) resolves twice; Tide Table draws for each resolution; a lone card does not', () => {
    const g = fresh();
    const t = enemyUids(g)[0] as number;
    combatOf(g).player.statuses.total_eclipse = 1;
    combatOf(g).player.statuses.tide_table = 1;
    for (let i = 0; i < 3; i++) onTimeline(g, 'ripple', 1, t, 900 + i);
    const ev = endTurn(g);
    expect(playerHits(ev, t)).toEqual(Array.from({ length: 6 }, () => 10));
    expect(eventsOf(ev, 'draw')[0]?.uids).toHaveLength(1);
    expect(eventsOf(ev, 'draw').slice(0, 6).every((d) => d.uids.length === 1)).toBe(true);

    const h = fresh();
    const u = enemyUids(h)[0] as number;
    combatOf(h).player.statuses.total_eclipse = 1;
    for (let i = 0; i < 2; i++) onTimeline(h, 'ripple', 1, u, 900 + i);
    expect(playerHits(endTurn(h), u)).toEqual([7, 7, 7, 7]);

    const k = fresh();
    const v = enemyUids(k)[0] as number;
    combatOf(k).player.statuses.total_eclipse = 1;
    onTimeline(k, 'ripple', 1, v, 900);
    expect(playerHits(endTurn(k), v)).toEqual([4]);
  });

  it('Eternal Return sends the first resolving card back with Delay 1 (Phase E); the rest go to the discard pile; Scrap cards never return', () => {
    const g = fresh();
    const t = enemyUids(g)[0] as number;
    combatOf(g).player.statuses.eternal_return = 1;
    const first = onTimeline(g, 'ripple', 1, t, 900);
    const second = onTimeline(g, 'noon_gun', 1, t, 901);
    endTurn(g);
    const turn = combatOf(g).turn;
    expect(combatOf(g).timeline.map((e) => [e.card.uid, e.dueTurn])).toEqual([[first.uid, turn + 1]]);
    expect(combatOf(g).discard.some((c) => c.uid === second.uid) || combatOf(g).hand.some((c) => c.uid === second.uid)).toBe(true);
    expect(combatOf(g).counters.recurs).toBe(1);

    const h = fresh('test_enc_jaw');
    const jaw = enemyUids(h)[0] as number;
    combatOf(h).player.statuses.eternal_return = 1;
    const r = onTimeline(h, 'reckoning', 1, jaw, 900);
    endTurn(h);
    expect(combatOf(h).timeline).toEqual([]);
    expect(combatOf(h).exhaust.some((c) => c.uid === r.uid)).toBe(true);
  });
});

describe('v2 keywords (src/content/keywords.ts)', () => {
  it('each new mechanic shows its glossary box on the cards that use it', () => {
    const has = (id: string, kw: string) => expect(keywordsFor(getCardDef(id), false), `${id} → ${kw}`).toContain(kw);
    has('ripple', 'chorus');
    has('syzygy', 'chorus');
    has('hold_the_hour', 'gather');
    has('pinion_jab', 'quicken');
    has('accelerando', 'quicken');
    has('gear_train', 'crescendo');
    has('downbeat', 'crescendo');
    has('whistle_for_wind', 'goaded');
    has('squall_line', 'goaded');
    has('set_the_hour', 'schedule');
    has('dead_reckoning', 'beat_count');
  });
});
