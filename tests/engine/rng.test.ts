import '../testpack-only';
import { describe, expect, it } from 'vitest';
import { createStreams, hashString, nextFloat, nextInt, nextU32, shuffleInPlace, weightedPick } from '../../src/engine/rng';

describe('rng', () => {
  it('sfc32 is deterministic per seed and differs across seeds', () => {
    const a = hashString('seed');
    const b = hashString('seed');
    const c = hashString('seeD');
    const seqA = Array.from({ length: 20 }, () => nextU32(a));
    const seqB = Array.from({ length: 20 }, () => nextU32(b));
    const seqC = Array.from({ length: 20 }, () => nextU32(c));
    expect(seqA).toEqual(seqB);
    expect(seqA).not.toEqual(seqC);
    for (const v of seqA) {
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(2 ** 32);
    }
  });

  it('state is a plain 4-tuple of uint32 that round-trips through JSON', () => {
    const s = hashString('x');
    nextU32(s);
    const copy = JSON.parse(JSON.stringify(s)) as [number, number, number, number];
    expect(nextU32(copy)).toBe(nextU32(s));
    for (const w of s) expect(w >>> 0).toBe(w);
  });

  it('named streams are independent', () => {
    const a = createStreams('run');
    const b = createStreams('run');
    // drawing from 'map' does not change what 'shuffle' produces
    for (let i = 0; i < 50; i++) nextU32(a.map);
    expect(nextU32(a.shuffle)).toBe(nextU32(b.shuffle));
    expect(a.map).not.toEqual(a.shuffle);
  });

  it('int stays in range and covers it; float in [0,1)', () => {
    const s = hashString('range');
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const v = nextInt(s, -2, 3);
      expect(v).toBeGreaterThanOrEqual(-2);
      expect(v).toBeLessThanOrEqual(3);
      seen.add(v);
      const f = nextFloat(s);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
    }
    expect(seen.size).toBe(6);
    expect(() => nextInt(s, 3, 2)).toThrow();
  });

  it('shuffle is a permutation; weighted respects zero weights', () => {
    const s = hashString('shuf');
    const xs = Array.from({ length: 30 }, (_, i) => i);
    const sh = shuffleInPlace(s, [...xs]);
    expect([...sh].sort((p, q) => p - q)).toEqual(xs);
    expect(sh).not.toEqual(xs);
    for (let i = 0; i < 200; i++) expect(weightedPick(s, [['a', 0], ['b', 1]])).toBe('b');
    expect(() => weightedPick(s, [['a', 0]])).toThrow();
  });
});
