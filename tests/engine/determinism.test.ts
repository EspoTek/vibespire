import '../testpack-only';
import { describe, expect, it } from 'vitest';
import { Game, hashString, nextU32, serialize, type Action } from '../../src/engine';
import { randomPolicy } from '../../sim/policies/random';

function playRecorded(seed: string, maxActions = 400): { actions: Action[]; game: Game } {
  const game = Game.newRun(seed, 'test_class');
  const prng = hashString(`det:${seed}`);
  const actions: Action[] = [];
  while (actions.length < maxActions && game.state.phase !== 'victory' && game.state.phase !== 'defeat') {
    const a = randomPolicy.choose(game, game.legalActions(), nextU32(prng));
    actions.push(a);
    game.apply(a);
  }
  return { actions, game };
}

describe('determinism', () => {
  it('same seed + same actions => identical serialized state and events', () => {
    for (const seed of ['alpha', 'beta', 'gamma']) {
      const { actions, game } = playRecorded(seed);
      const replay = Game.newRun(seed, 'test_class');
      const replayEvents = [];
      const origEvents = [];
      const fresh = Game.newRun(seed, 'test_class');
      for (const a of actions) {
        replayEvents.push(replay.apply(a));
        origEvents.push(fresh.apply(a));
      }
      expect(serialize(replay.state)).toBe(serialize(game.state));
      expect(JSON.stringify(replayEvents)).toBe(JSON.stringify(origEvents));
    }
  });

  it('different seeds produce different runs', () => {
    const a = Game.newRun('seed-a', 'test_class');
    const b = Game.newRun('seed-b', 'test_class');
    expect(serialize(a.state)).not.toBe(serialize(b.state));
    expect(JSON.stringify(a.state.map)).not.toBe(JSON.stringify(b.state.map));
  });

  it('atomic and non-atomic games stay identical', () => {
    const { actions } = playRecorded('atomic', 300);
    const atomic = Game.newRun('atomic', 'test_class');
    const fast = Game.newRun('atomic', 'test_class', { atomic: false });
    for (const a of actions) {
      atomic.apply(a);
      fast.apply(a);
    }
    expect(serialize(fast.state)).toBe(serialize(atomic.state));
  });

  it('an illegal action leaves an atomic game untouched', () => {
    const g = Game.newRun('untouched', 'test_class');
    const before = serialize(g.state);
    expect(() => g.apply({ type: 'end_turn' })).toThrow(/illegal action/);
    expect(serialize(g.state)).toBe(before);
  });
});
