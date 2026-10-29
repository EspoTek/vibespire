import { describe, expect, it } from 'vitest';
import { compileSfx, compileTrack, lfsrBits, noteHz, psgQuantize, SFX, SFX_NAMES, sfxFrames, volumeGain } from '../../src/render/psg.ts';

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

  it('every named SFX compiles and is short', () => {
    expect([...SFX_NAMES].sort()).toEqual(['block', 'cancel', 'confirm', 'draw', 'hit', 'hurt', 'lose', 'move', 'win']);
    for (const name of SFX_NAMES) {
      expect(() => compileSfx(SFX[name])).not.toThrow();
      expect(sfxFrames(SFX[name])).toBeLessThan(120);
    }
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
