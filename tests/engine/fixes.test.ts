import '../testpack-only';
import { beforeAll, describe, expect, it } from 'vitest';
import { canPlayCard, computeIntent } from '../../src/engine';
import { combatOf, enemyUids, eventsOf, pacify, play, sandbox, setHand } from './helpers';
import { registerFixtures } from './fixtures';

beforeAll(registerFixtures);

describe('engine fixes (implementer reports)', () => {
  it('a card that Scraps itself mid-resolution still finishes: Onslaught, afterCardPlayed, Cadence', () => {
    const g = sandbox();
    pacify(g);
    const [a] = setHand(g, ['fx_self_scrap']);
    const t = enemyUids(g)[0] as number;
    const ev = play(g, a as number, t);
    expect(eventsOf(ev, 'exhaust')).toEqual([{ t: 'exhaust', uids: [a] }]);
    const c = combatOf(g);
    expect(c.exhaust.filter((x) => x.uid === a)).toHaveLength(1);
    expect(c.inPlay).toHaveLength(0);
    expect(c.player.statuses.onslaught).toBe(1);
    expect(c.attacksPlayedThisTurn).toBe(1);
    expect(c.cardsPlayedThisTurn).toEqual(['fx_self_scrap']);
  });

  it('onTimelineAdd triggers see the entry onBeat (declarative on_beat works there)', () => {
    const g = sandbox({ deck: Array.from({ length: 15 }, () => 'test_strike') });
    pacify(g);
    combatOf(g).player.statuses.fx_tl_watch = 1;
    const [b1, d1, b2, d2] = setHand(g, ['test_beat', 'fx_delay_beat', 'test_beat', 'fx_delay_beat']);
    const t = enemyUids(g)[0] as number;
    play(g, b1 as number, t);
    const off = play(g, d1 as number); // 2nd play: not on the beat
    expect(eventsOf(off, 'block')).toHaveLength(0);
    play(g, b2 as number, t);
    combatOf(g).cardsPlayedThisTurn = ['x', 'x']; // next play is the 3rd
    const on = play(g, d2 as number);
    expect(eventsOf(on, 'block')).toEqual([{ t: 'block', target: 'player', amount: 7, pool: 'block' }]);
  });

  it('prime {n} primes up to n beyond capacity; the prime step does not count them', () => {
    const g = sandbox();
    pacify(g);
    const e = combatOf(g).enemies[0];
    if (!e) throw new Error('setup');
    e.intent = computeIntent(g.state, e, 'lick');
    const [p, r1, r2, r3, r4] = setHand(g, ['fx_prime2', 'test_parry', 'test_parry', 'test_parry', 'test_parry']);
    play(g, p as number);
    const pc = combatOf(g).pendingChoice;
    expect(pc).toMatchObject({ min: 0, max: 2, resume: { op: 'prime', step: false } });
    g.apply({ type: 'resolve_choice', uids: [r1 as number, r2 as number] });
    expect(combatOf(g).primed.map((x) => x.card.uid)).toEqual([r1, r2]);
    g.apply({ type: 'end_turn' });
    // capacity 1 still available at the prime step: 2 Riposte cards left > 1 → choice
    expect(combatOf(g).pendingChoice).toMatchObject({ min: 1, max: 1, resume: { op: 'prime', step: true } });
    const ev = g.apply({ type: 'resolve_choice', uids: [r3 as number] });
    expect(eventsOf(ev, 'card_primed')).toEqual([{ t: 'card_primed', uid: r3 }]);
    // 3 primed this turn (1 capacity + 2 by effect); nothing attacked, so all 3 fizzle at the next turn start
    expect(eventsOf(ev, 'prime_fizzled').map((x) => x.uid)).toEqual([r1, r2, r3]);
    expect(combatOf(g).discard.some((x) => x.uid === r4)).toBe(true);
  });

  it('remove_card {self} + removed_self: the second removal in a turn hits the cap and its payoff does not run', () => {
    const g = sandbox({ deck: ['fx_self_remove', 'fx_self_remove', ...Array.from({ length: 8 }, () => 'test_strike')] });
    pacify(g);
    const c = combatOf(g);
    const mine = [...c.hand, ...c.draw].filter((x) => x.id === 'fx_self_remove');
    c.draw = c.draw.filter((x) => x.id !== 'fx_self_remove');
    c.hand = [...c.hand.filter((x) => x.id !== 'fx_self_remove'), ...mine];
    const gold = g.state.player.gold;
    play(g, mine[0]?.uid as number);
    expect(g.state.player.gold).toBe(gold + 10);
    expect(g.state.player.deck).toHaveLength(9);
    const ev = play(g, mine[1]?.uid as number);
    expect(eventsOf(ev, 'cap_hit')).toEqual([{ t: 'cap_hit', cap: 'cap_prune_away' }]);
    expect(g.state.player.gold).toBe(gold + 10);
    expect(g.state.player.deck).toHaveLength(9);
  });

  it('ctx.nextBeat(): a canPlay "only on the beat" card becomes playable as the 3rd play', () => {
    const g = sandbox();
    pacify(g);
    const [ob, b1, b2] = setHand(g, ['fx_only_beat', 'test_beat', 'test_beat']);
    const card = () => combatOf(g).hand.find((x) => x.uid === ob);
    const t = enemyUids(g)[0] as number;
    const first = card();
    if (!first) throw new Error('setup');
    expect(canPlayCard(g.state, first)).toBe('Only on the beat.');
    play(g, b1 as number, t);
    play(g, b2 as number, t);
    const c = card();
    if (!c) throw new Error('lost card');
    expect(canPlayCard(g.state, c)).toBe(true);
  });
});
