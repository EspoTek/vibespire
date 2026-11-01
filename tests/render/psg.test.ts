import { describe, expect, it } from 'vitest';
import { attenuateSegments, compileSfx, compileTrack, lfsrBits, noteHz, psgQuantize, SFX, SFX_NAMES, SFX_PRIORITY, sfxFrames, sfxPriority, transposeSegments, volumeGain } from '../../src/render/psg.ts';

describe('PSG model', () => {
  it('tunes notes to A4 = 440 Hz', () => {
    expect(noteHz('A4')).toBeCloseTo(440, 6);
    expect(noteHz('C4')).toBeCloseTo(261.626, 2);
    expect(noteHz('A#4')).toBeCloseTo(noteHz('Bb4'), 9);
    expect(() => noteHz('H2')).toThrow();
  });

  it('quantises to the 10-bit tone register', () => {
    const q = psgQuantize(440);
    expect(Math.abs(q - 440)).toBeLessThan(2);
    expect(psgQuantize(1)).toBeCloseTo(3579545 / (32 * 1023), 6); // clamps at N = 1023
  });

  it('maps 4-bit volume in 2 dB steps', () => {
    expect(volumeGain(0)).toBe(0);
    expect(volumeGain(15)).toBe(1);
    expect(20 * Math.log10(volumeGain(14))).toBeCloseTo(-2, 9);
    expect(() => volumeGain(16)).toThrow();
  });
});

describe('envelope language', () => {
  it('lays notes out in frames with held envelopes', () => {
    const segs = compileTrack('@F84 C5:2 r:1 E5~G5:5', 't0');
    expect(segs.map((s) => [s.startFrame, s.frames])).toEqual([[0, 2], [2, 1], [3, 5]]);
    expect(segs[2]?.volumes).toEqual([15, 8, 4, 4, 4]);
    expect(segs[1]?.sound).toBeNull();
    const glide = segs[2]?.sound;
    if (!glide || glide.kind !== 'tone') throw new Error('expected a tone');
    expect(glide.to).toBeGreaterThan(glide.from);
  });

  it('parses noise tokens and rejects bad input', () => {
    const [n] = compileTrack('w2:3', 'n');
    expect(n?.sound).toEqual({ kind: 'noise', mode: 'white', rate: 2 });
    expect(() => compileTrack('C5:3', 'n')).toThrow(/noise/);
    expect(() => compileTrack('C5', 't0')).toThrow(/bad token/);
    expect(() => compileTrack('@XYZ C5:1', 't1')).toThrow(/envelope/);
    expect(() => compileTrack('C5:0', 't1')).toThrow(/zero-length/);
  });

  it('every named SFX compiles, is short, and stays inside the tone range', () => {
    for (const must of ['hit', 'hitHeavy', 'overkill', 'parry', 'bloom', 'snip', 'rot', 'delay', 'resolve', 'death', 'bossIntro', 'fanfareBoss', 'gold', 'purchase', 'step', 'rare'] as const) {
      expect(SFX_NAMES).toContain(must);
    }
    const lowest = 3579545 / (32 * 1023);
    for (const name of SFX_NAMES) {
      const segs = compileSfx(SFX[name]);
      expect(sfxFrames(SFX[name])).toBeLessThan(120);
      for (const ch of ['t0', 't1', 't2'] as const) {
        for (const sg of segs[ch] ?? []) if (sg.sound?.kind === 'tone') expect(sg.sound.from, `${name} ${ch}`).toBeGreaterThan(lowest);
      }
    }
  });

  it('priorities: big moments outrank UI chatter; unknown = 1', () => {
    expect(sfxPriority('parry')).toBeGreaterThan(sfxPriority('draw'));
    expect(sfxPriority('confirm')).toBe(1);
    for (const k of Object.keys(SFX_PRIORITY)) expect(SFX_NAMES).toContain(k);
  });

  it('transposes tone segments (noise untouched) and attenuates without silencing', () => {
    const segs = compileTrack('A4:2 r:1 A4~A5:2', 't0');
    const up = transposeSegments(segs, 12);
    const a = up[0]?.sound, g = up[2]?.sound;
    if (a?.kind !== 'tone' || g?.kind !== 'tone') throw new Error('expected tones');
    expect(a.from).toBeCloseTo(psgQuantize(880), 3);
    expect(g.to).toBeCloseTo(psgQuantize(1760), 3);
    expect(up[1]?.sound).toBeNull();
    const n = compileTrack('w1:2', 'n');
    expect(transposeSegments(n, 7)[0]?.sound).toEqual(n[0]?.sound);
    const quiet = attenuateSegments(compileTrack('@F21 C5:3', 't0'), 3);
    expect(quiet[0]?.volumes).toEqual([12, 1, 1]);
    expect(() => attenuateSegments(segs, -1)).toThrow();
  });

  it('LFSR: periodic noise has period 16, white noise is not trivially periodic', () => {
    const p = lfsrBits(64, 'periodic');
    expect([...p.slice(0, 16)]).toEqual([...p.slice(16, 32)]);
    expect(p.slice(0, 16).reduce((a, b) => a + b, 0)).toBe(1);
    const w = lfsrBits(4096, 'white');
    const ones = w.reduce((a, b) => a + b, 0);
    expect(ones).toBeGreaterThan(1500);
    expect(ones).toBeLessThan(2600);
  });
});
