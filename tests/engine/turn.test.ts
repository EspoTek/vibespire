import '../testpack-only';
import { beforeAll, describe, expect, it } from 'vitest';
import { computeIntent } from '../../src/engine';
import { makeCard } from '../../src/engine/cards';
import { combatOf, enemy, enemyUids, eventsOf, pacify, padDraw, play, sandbox, setHand } from './helpers';
import { registerFixtures } from './fixtures';

beforeAll(registerFixtures);

/** Make the slime use its non-attacking move ('lick') next. */
function harmless(g: ReturnType<typeof sandbox>): void {
  for (const e of combatOf(g).enemies) e.intent = computeIntent(g.state, e, 'lick');
}

describe('turn structure', () => {
  it('turn 1: 3 energy, 5 cards, intents chosen', () => {
    const g = sandbox();
    const c = combatOf(g);
    expect(c.turn).toBe(1);
    expect(c.energy).toBe(3);
    expect(c.hand).toHaveLength(5);
    expect(c.draw).toHaveLength(7);
    for (const e of c.enemies) expect(e.intent.moveId).not.toBe('');
  });

  it('player block resets at the start of the player turn; keepBlock keeps it', () => {
    const g = sandbox();
    pacify(g);
    harmless(g);
    const [b] = setHand(g, ['test_block']);
    if (b === undefined) throw new Error('setup');
    play(g, b);
    expect(combatOf(g).player.block).toBe(5);
    const ev = g.apply({ type: 'end_turn' });
    expect(eventsOf(ev, 'block_lost')).toEqual([{ t: 'block_lost', target: 'player', amount: 5 }]);
    expect(combatOf(g).player.block).toBe(0);
    expect(combatOf(g).turn).toBe(2);
    expect(combatOf(g).energy).toBe(3);

    harmless(g);
    combatOf(g).player.statuses.fx_barricade = 1;
    const [b2] = setHand(g, ['test_block']);
    if (b2 === undefined) throw new Error('setup');
    play(g, b2);
    g.apply({ type: 'end_turn' });
    expect(combatOf(g).player.block).toBe(5);
  });

  it('enemy block resets at the start of its own turn', () => {
    const g = sandbox({ encounter: 'test_enc_jaw' });
    pacify(g);
    const [t] = enemyUids(g);
    if (t === undefined) throw new Error('setup');
    const e = enemy(g, t);
    e.intent = computeIntent(g.state, e, 'brace');
    setHand(g, []);
    g.apply({ type: 'end_turn' });
    expect(enemy(g, t).block).toBe(6); // braced during its turn, kept through the player's turn
    expect(enemy(g, t).moveHistory).toEqual(['brace']);
    setHand(g, []);
    const ev = g.apply({ type: 'end_turn' });
    expect(eventsOf(ev, 'block_lost')).toContainEqual({ t: 'block_lost', target: t, amount: 6 });
  });

  it('enemy multi-hit attacks resolve hit by hit against block', () => {
    const g = sandbox({ encounter: 'test_enc_jaw' });
    const [t] = enemyUids(g);
    if (t === undefined) throw new Error('setup');
    const e = enemy(g, t);
    e.intent = computeIntent(g.state, e, 'flurry');
    expect(e.intent).toMatchObject({ damage: 3, hits: 3 });
    setHand(g, []);
    combatOf(g).player.block = 4;
    const hits = eventsOf(g.apply({ type: 'end_turn' }), 'damage').filter((d) => d.target === 'player');
    expect(hits.map((h) => [h.amount, h.blocked, h.hpLost])).toEqual([
      [3, 3, 0],
      [3, 1, 2],
      [3, 0, 3],
    ]);
  });

  it('hand size caps at 10: extra draws stay in the draw pile; created cards go to discard', () => {
    const g = sandbox({ deck: Array.from({ length: 20 }, () => 'test_strike') });
    const c = combatOf(g);
    const hand = setHand(g, ['test_draw', ...Array.from({ length: 9 }, () => 'test_strike')]);
    const drawBefore = c.draw.length;
    const ev = play(g, hand[0] as number);
    expect(combatOf(g).hand).toHaveLength(10);
    expect(eventsOf(ev, 'draw').flatMap((d) => d.uids)).toHaveLength(1);
    expect(combatOf(g).draw).toHaveLength(drawBefore - 1);

    const gen = makeCard(g.state, 'fx_gen');
    combatOf(g).hand[9] = gen; // replace a strike with the generator (hand stays 10)
    const discardBefore = combatOf(g).discard.length;
    const ev2 = play(g, gen.uid);
    const added = eventsOf(ev2, 'card_added');
    expect(added.map((a) => a.where)).toEqual(['hand', 'discard']);
    expect(combatOf(g).hand).toHaveLength(10);
    // the generator itself (cost 0, not exhaust) also lands in discard
    expect(combatOf(g).discard.length).toBe(discardBefore + 2);
  });

  it('end of turn: retain stays, ethereal exhausts, the rest is discarded; tempCost clears', () => {
    const g = sandbox();
    pacify(g);
    harmless(g);
    const [keep, ghost, strike] = setHand(g, ['test_retainer', 'test_ghost', 'test_strike']);
    const s = combatOf(g).hand[2];
    if (!s) throw new Error('setup');
    s.tempCost = 0;
    const ev = g.apply({ type: 'end_turn' });
    const c = combatOf(g);
    expect(eventsOf(ev, 'exhaust')).toContainEqual({ t: 'exhaust', uids: [ghost] });
    expect(c.hand.map((x) => x.uid)).toContain(keep);
    expect(c.exhaust.map((x) => x.uid)).toContain(ghost);
    const all = [...c.hand, ...c.draw, ...c.discard];
    const st = all.find((x) => x.uid === strike);
    expect(st).toBeDefined();
    expect(st?.tempCost).toBeUndefined();
  });

  it('innate cards are always in the opening hand', () => {
    for (let i = 0; i < 25; i++) {
      const g = sandbox({ seed: `innate-${i}`, deck: ['test_jab', ...Array.from({ length: 14 }, () => 'test_strike')] });
      expect(combatOf(g).hand.map((c) => c.id)).toContain('test_jab');
    }
  });

  it('X cost spends all energy and repeats X times; powers leave play', () => {
    const g = sandbox();
    pacify(g);
    const [whirl, ritual] = setHand(g, ['test_whirl', 'test_ritual']);
    if (whirl === undefined || ritual === undefined) throw new Error('setup');
    combatOf(g).energy = 3;
    const ev = play(g, whirl);
    expect(eventsOf(ev, 'damage').map((d) => d.amount)).toEqual([5, 5, 5]);
    expect(combatOf(g).energy).toBe(0);
    expect(g.legalActions().some((a) => a.type === 'play_card' && a.uid === ritual)).toBe(false);
    combatOf(g).energy = 1;
    play(g, ritual);
    const c = combatOf(g);
    expect(c.energy).toBe(0);
    expect([...c.hand, ...c.draw, ...c.discard, ...c.exhaust].some((x) => x.uid === ritual)).toBe(false);
    expect(c.player.statuses.test_strength).toBe(2);
  });

  it('exhaust keyword cards go to the exhaust pile when played', () => {
    const g = sandbox();
    pacify(g);
    const [ghost] = setHand(g, ['test_ghost']);
    if (ghost === undefined) throw new Error('setup');
    padDraw(g); // RULINGS 72 Scrap floor
    const ev = play(g, ghost);
    expect(eventsOf(ev, 'exhaust')).toEqual([{ t: 'exhaust', uids: [ghost] }]);
    expect(combatOf(g).player.block).toBe(15);
  });

  it('a card var persists to the deck copy after combat', () => {
    const g = sandbox({ deck: ['fx_dagger', 'test_strike', 'test_strike', 'test_strike', 'test_strike'] });
    const dagger = combatOf(g).hand.find((x) => x.id === 'fx_dagger');
    const [t] = enemyUids(g);
    if (!dagger || t === undefined) throw new Error('setup');
    enemy(g, t).hp = 999;
    expect(eventsOf(play(g, dagger.uid, t), 'damage')[0]?.amount).toBe(3);
    // second play next turn shows growth
    const c = combatOf(g);
    c.hand.push(c.discard.splice(c.discard.findIndex((x) => x.uid === dagger.uid), 1)[0] as typeof dagger);
    expect(eventsOf(play(g, dagger.uid, t), 'damage')[0]?.amount).toBe(5);
    enemy(g, t).hp = 1;
    const [s] = setHand(g, ['test_strike']);
    play(g, s as number, t);
    expect(g.state.phase).toBe('reward');
    expect(g.state.player.deck.find((x) => x.uid === dagger.uid)?.vars).toEqual({ growth: 2 });
  });
});
