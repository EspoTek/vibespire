import '../testpack-only';
import { describe, expect, it } from 'vitest';
import { ENGINE_VERSION, Game, deserialize, hashString, nextU32, serialize } from '../../src/engine';
import { randomPolicy } from '../../sim/policies/random';

describe('save / load', () => {
  it('round-trips mid-combat and both copies continue identically', () => {
    const g = Game.newRun('save-mid', 'test_class');
    const prng = hashString('save-mid');
    let guard = 0;
    // play until we are a few turns into a combat
    while (!(g.state.phase === 'combat' && (g.state.combat?.turn ?? 0) >= 2)) {
      g.apply(randomPolicy.choose(g, g.legalActions(), nextU32(prng)));
      if (++guard > 500) throw new Error('never reached combat turn 2');
    }
    const json = serialize(g.state);
    const copy = Game.load(json);
    expect(serialize(copy.state)).toBe(json);
    expect(JSON.stringify(deserialize(json))).toBe(json);
    const ended = (gm: Game): boolean => gm.state.phase === 'defeat' || gm.state.phase === 'victory';
    for (let i = 0; i < 200 && !ended(g); i++) {
      const a = randomPolicy.choose(g, g.legalActions(), nextU32(prng));
      const e1 = g.apply(a);
      const e2 = copy.apply(a);
      expect(e2).toEqual(e1);
    }
    expect(serialize(copy.state)).toBe(serialize(g.state));
  });

  it('state is plain JSON (no functions / undefined survive a round trip unchanged)', () => {
    const g = Game.newRun('plain', 'test_class');
    expect(JSON.parse(serialize(g.state))).toEqual(JSON.parse(JSON.stringify(structuredClone(g.state))));
  });

  it('rejects other versions and malformed saves', () => {
    const g = Game.newRun('ver', 'test_class');
    const raw = JSON.parse(serialize(g.state)) as Record<string, unknown>;
    expect(() => deserialize(JSON.stringify({ ...raw, version: ENGINE_VERSION + 1 }))).toThrow(/version/);
    const { rng: _rng, ...noRng } = raw;
    expect(() => deserialize(JSON.stringify(noRng))).toThrow(/malformed save.*rng/);
    expect(() => deserialize('[]')).toThrow();
    expect(() => deserialize('not json')).toThrow();
  });
});
