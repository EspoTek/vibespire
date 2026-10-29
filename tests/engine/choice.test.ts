import '../testpack-only';
import { beforeAll, describe, expect, it } from 'vitest';
import { registerFixtures } from './fixtures';
import { Game, deserialize, serialize, type Action } from '../../src/engine';
import { makeCard } from '../../src/engine/cards';
import { combatOf, eventsOf, pacify, play, sandbox, setHand } from './helpers';

beforeAll(registerFixtures);

function onlyChoices(g: Game): Extract<Action, { type: 'resolve_choice' }>[] {
  const legal = g.legalActions();
  expect(legal.every((a) => a.type === 'resolve_choice')).toBe(true);
  return legal.filter((a): a is Extract<Action, { type: 'resolve_choice' }> => a.type === 'resolve_choice');
}

describe('pending choices', () => {
  it('discard-choose suspends the card; legalActions lists exactly the answers; resolving resumes', () => {
    const g = sandbox({ deck: Array.from({ length: 12 }, () => 'test_strike') });
    pacify(g);
    const [sift, a, b] = setHand(g, ['test_sift', 'test_strike', 'test_strike']);
    if (sift === undefined || a === undefined || b === undefined) throw new Error('setup');
    const ev = play(g, sift);
    expect(eventsOf(ev, 'draw').flatMap((d) => d.uids)).toHaveLength(2);
    expect(eventsOf(ev, 'choice')).toHaveLength(1);
    const pc = combatOf(g).pendingChoice;
    expect(pc).toMatchObject({ kind: 'cards', from: 'hand', min: 1, max: 1 });
    expect(pc?.choices).toHaveLength(4);
    const answers = onlyChoices(g);
    expect(answers.map((x) => x.uids)).toEqual(pc?.choices.map((u) => [u]));
    // sift is still resolving (in play), not yet discarded
    expect(combatOf(g).inPlay.map((c) => c.uid)).toEqual([sift]);
    expect(() => g.apply({ type: 'end_turn' })).toThrow(/illegal/);
    expect(() => g.apply({ type: 'resolve_choice', uids: [a, b] })).toThrow(/illegal/);
    expect(() => g.apply({ type: 'resolve_choice', uids: [99999] })).toThrow(/illegal/);
    const ev2 = g.apply({ type: 'resolve_choice', uids: [a] });
    expect(eventsOf(ev2, 'discard').map((d) => d.uids)).toEqual([[a], [sift]]);
    const c = combatOf(g);
    expect(c.pendingChoice).toBeNull();
    expect(c.hand).toHaveLength(3);
    expect(c.inPlay).toHaveLength(0);
    expect(g.legalActions().some((x) => x.type === 'end_turn')).toBe(true);
  });

  it('modal choose renders option labels from numbers and runs the picked branch', () => {
    const g = sandbox();
    pacify(g);
    const [m] = setHand(g, ['test_modal']);
    play(g, m as number);
    const pc = combatOf(g).pendingChoice;
    expect(pc).toMatchObject({ kind: 'options', choices: [0, 1], labels: ['Gain 9 Block.', 'Draw 2 cards.'] });
    g.apply({ type: 'resolve_choice', uids: [0] });
    expect(combatOf(g).player.block).toBe(9);
  });

  it('scry: choose any subset of the top cards to discard (min 0)', () => {
    const g = sandbox({ deck: Array.from({ length: 12 }, () => 'test_block') });
    pacify(g);
    const [sc] = setHand(g, ['test_scry']);
    const drawBefore = combatOf(g).draw.map((c) => c.uid);
    play(g, sc as number);
    const pc = combatOf(g).pendingChoice;
    const top3 = drawBefore.slice(-3).reverse();
    expect(pc?.choices).toEqual(top3);
    const answers = onlyChoices(g);
    expect(answers).toHaveLength(8); // all subsets of 3
    expect(answers[0]).toEqual({ type: 'resolve_choice', uids: [] });
    expect(() => g.apply({ type: 'resolve_choice', uids: [top3[2] as number, top3[0] as number] })).toThrow(/illegal/);
    g.apply({ type: 'resolve_choice', uids: [top3[0] as number, top3[2] as number] });
    const c = combatOf(g);
    expect(c.draw.map((x) => x.uid)).toEqual(drawBefore.filter((u) => u !== top3[0] && u !== top3[2]));
    expect(c.discard.map((x) => x.uid)).toEqual(expect.arrayContaining([top3[0], top3[2]]));
  });

  it('exhaust-choose and upgrade-choose resume their cards', () => {
    const g = sandbox();
    pacify(g);
    const [purge, x, armory, y] = setHand(g, ['test_purge', 'test_strike', 'test_armory', 'test_block']);
    if (purge === undefined || x === undefined || armory === undefined || y === undefined) throw new Error('setup');
    play(g, purge);
    g.apply({ type: 'resolve_choice', uids: [x] });
    expect(combatOf(g).exhaust.map((c) => c.uid)).toEqual([x]);
    expect(combatOf(g).energy).toBe(4);
    play(g, armory);
    // only y is upgradable and left in hand -> auto-upgraded without a prompt
    expect(combatOf(g).pendingChoice).toBeNull();
    expect(combatOf(g).hand.find((c) => c.uid === y)?.upgraded).toBe(true);
  });

  it('a pending choice survives save/load mid-combat', () => {
    const g = sandbox({ deck: Array.from({ length: 12 }, () => 'test_strike') });
    pacify(g);
    const [sift] = setHand(g, ['test_sift', 'test_strike']);
    play(g, sift as number);
    const json = serialize(g.state);
    const loaded = new Game(deserialize(json));
    expect(loaded.legalActions()).toEqual(g.legalActions());
    const pick = g.legalActions()[1] as Action;
    g.apply(pick);
    loaded.apply(pick);
    expect(serialize(loaded.state)).toBe(serialize(g.state));
  });

  it('run-level choices: a start boon that removes a card from the deck', () => {
    const g = Game.newRun('boon', 'test_class');
    g.state.startChoices = [{ id: 'test_boon_remove' }, { id: 'test_boon_gold' }];
    g.apply({ type: 'choose_start_boon', index: 0 });
    expect(g.state.phase).toBe('start');
    expect(g.state.pendingChoice).toMatchObject({ from: 'deck', min: 1, max: 1 });
    const answers = onlyChoices(g);
    expect(answers).toHaveLength(12);
    const ev = g.apply(answers[0] as Action);
    expect(eventsOf(ev, 'card_removed')).toHaveLength(1);
    expect(g.state.player.deck).toHaveLength(11);
    expect(g.state.phase).toBe('map');
    expect(g.state.history.floors[0]?.boonId).toBe('test_boon_remove');
    expect(g.state.history.floors[0]?.cardsRemoved).toHaveLength(1);
  });

  it('custom fn via ctx.now runs synchronously (test_double)', () => {
    const g = sandbox();
    const card = makeCard(g.state, 'test_double');
    combatOf(g).hand = [card];
    combatOf(g).player.block = 3;
    play(g, card.uid);
    expect(combatOf(g).player.block).toBe(6);
  });

  it('ctx.now refuses to open a choice, and the failed action leaves state untouched', () => {
    const g = sandbox();
    const [bad] = setHand(g, ['fx_bad_now', 'test_strike', 'test_strike']);
    const before = serialize(g.state);
    expect(() => play(g, bad as number)).toThrow(/tried to open a choice/);
    expect(serialize(g.state)).toBe(before);
  });
});
