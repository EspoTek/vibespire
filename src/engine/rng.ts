// Seeded randomness: sfc32 generators seeded by an xmur3 string hash.
// Every random draw in the engine goes through a named stream stored in RunState.rng,
// so the same seed + the same actions always produce the same run.

import type { RngApi, RngState, RngStream, RngStreams, SingleRng } from './types';

export const RNG_STREAMS: readonly RngStream[] = ['map', 'shuffle', 'enemy', 'reward', 'event', 'misc'];

/** xmur3 string hash; returns a generator of uint32 seeds. */
export function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

/** Hash a string to a fresh, warmed-up sfc32 state. */
export function hashString(seed: string): RngState {
  const h = xmur3(seed);
  const s: RngState = [h(), h(), h(), h()];
  for (let i = 0; i < 12; i++) nextU32(s);
  return s;
}

/** sfc32 step: advances `s` in place and returns a uint32. */
export function nextU32(s: RngState): number {
  let [a, b, c, d] = s;
  const t = (((a + b) | 0) + d) | 0;
  d = (d + 1) | 0;
  a = b ^ (b >>> 9);
  b = (c + (c << 3)) | 0;
  c = (c << 21) | (c >>> 11);
  c = (c + t) | 0;
  s[0] = a >>> 0;
  s[1] = b >>> 0;
  s[2] = c >>> 0;
  s[3] = d >>> 0;
  return t >>> 0;
}

export function nextFloat(s: RngState): number {
  return nextU32(s) / 4294967296;
}

/** Integer in [min, max] inclusive. */
export function nextInt(s: RngState, min: number, max: number): number {
  if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
    throw new Error(`rng int: bad range [${min}, ${max}]`);
  }
  return min + Math.floor(nextFloat(s) * (max - min + 1));
}

export function nextChance(s: RngState, p: number): boolean {
  if (!(p >= 0 && p <= 1)) throw new Error(`rng chance: p must be in [0,1], got ${p}`);
  return nextFloat(s) < p;
}

export function pickFrom<T>(s: RngState, items: readonly T[]): T {
  if (items.length === 0) throw new Error('rng pick: empty list');
  const i = nextInt(s, 0, items.length - 1);
  // i is in range by construction; elements may legitimately be undefined.
  return items[i] as T;
}

export function shuffleInPlace<T>(s: RngState, items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = nextInt(s, 0, i);
    const a = items[i] as T;
    items[i] = items[j] as T;
    items[j] = a;
  }
  return items;
}

export function weightedPick<T>(s: RngState, items: readonly (readonly [T, number])[]): T {
  let total = 0;
  for (const [, w] of items) {
    if (!(w >= 0)) throw new Error(`rng weighted: negative/NaN weight ${w}`);
    total += w;
  }
  if (total <= 0) throw new Error('rng weighted: weights sum to 0');
  let r = nextFloat(s) * total;
  for (const [v, w] of items) {
    if (r < w) return v;
    r -= w;
  }
  // Floating point edge: return the last positive-weight entry.
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    if (it && it[1] > 0) return it[0];
  }
  throw new Error('rng weighted: unreachable');
}

/** Fresh streams for a run seed: each stream is seeded from `${seed}/${name}`. */
export function createStreams(seed: string): RngStreams {
  return {
    map: hashString(`${seed}/map`),
    shuffle: hashString(`${seed}/shuffle`),
    enemy: hashString(`${seed}/enemy`),
    reward: hashString(`${seed}/reward`),
    event: hashString(`${seed}/event`),
    misc: hashString(`${seed}/misc`),
  };
}

/** Derive a child state from a stream (used for per-enemy AI streams). */
export function deriveState(parent: RngState): RngState {
  const s: RngState = [nextU32(parent), nextU32(parent), nextU32(parent), (nextU32(parent) | 1) >>> 0];
  for (let i = 0; i < 12; i++) nextU32(s);
  return s;
}

export function rngApi(streams: RngStreams): RngApi {
  return {
    int: (stream, min, max) => nextInt(streams[stream], min, max),
    float: (stream) => nextFloat(streams[stream]),
    chance: (stream, p) => nextChance(streams[stream], p),
    pick: (stream, items) => pickFrom(streams[stream], items),
    shuffle: (stream, items) => shuffleInPlace(streams[stream], items),
  };
}

export function singleRng(s: RngState): SingleRng {
  return {
    int: (min, max) => nextInt(s, min, max),
    float: () => nextFloat(s),
    chance: (p) => nextChance(s, p),
    pick: (items) => pickFrom(s, items),
    weighted: (items) => weightedPick(s, items),
  };
}

