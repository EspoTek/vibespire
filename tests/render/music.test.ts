import { describe, expect, it } from 'vitest';
import {
  bossSong, cadenceStinger, compileSong, compileSongBars, octaveShift, sliceBars, SONG_NAMES, SONGS, stepsToTrack, type Chord,
} from '../../src/render/music.ts';
import { compileSfx, compileTrack, noteHz, psgQuantize, PSG_CLOCK } from '../../src/render/psg.ts';

const lowest = PSG_CLOCK / (32 * 1023);

describe('chiptune loops', () => {
  for (const name of SONG_NAMES) {
    it(`${name}: channels line up, 16-32 bars, a chord per bar, every note inside the SN76489 tone range`, () => {
      const { channels, frames } = compileSong(name);
      const bars = frames / (SONGS[name].step * 8);
      expect(Number.isInteger(bars)).toBe(true);
      expect(bars).toBeGreaterThanOrEqual(16);
      expect(bars).toBeLessThanOrEqual(32);
      expect(SONGS[name].chords).toHaveLength(bars);
      for (const ch of ['t0', 't1', 't2'] as const) {
        for (const s of channels[ch]) if (s.sound?.kind === 'tone') expect(s.sound.from, `${name} ${ch}`).toBeGreaterThan(lowest);
      }
      expect(channels.n.some((s) => s.sound?.kind === 'noise')).toBe(true);
    });
  }
  it('step notation: holds merge, rests and hits compile', () => {
    expect(stepsToTrack('A4 . . -', 10, 't0', '@F')).toBe('@F A4:30 r:10');
    expect(stepsToTrack('k - s', 5, 'n', '')).toBe('@FB7 p2:5 r:5 @DA74 w1:5');
    expect(() => stepsToTrack('. A4', 10, 't0', '@F')).toThrow(/nothing to hold/);
    expect(() => stepsToTrack('x', 10, 'n', '')).toThrow(/unknown hit/);
    expect(noteHz('A2')).toBeGreaterThan(lowest);
  });
  it('every act has its own boss theme', () => {
    expect(new Set([bossSong(1), bossSong(2), bossSong(3)]).size).toBe(3);
  });
});

describe('bar scheduling', () => {
  it('slices a channel into bars; a note held over a bar line is split and tied, volumes continue', () => {
    const segs = compileTrack('@FEDC C5:6 r:2', 't0'); // 6-frame note over a 4-frame bar
    const bars = sliceBars(segs, 4, 2);
    expect(bars[0]?.map((s) => [s.startFrame, s.frames, s.tie ?? false])).toEqual([[0, 4, true]]);
    expect(bars[1]?.map((s) => [s.startFrame, s.frames, s.tie ?? false])).toEqual([[0, 2, false], [2, 2, false]]);
    expect(bars[0]?.[0]?.volumes).toEqual([15, 14, 13, 12]);
    expect(bars[1]?.[0]?.volumes).toEqual([12, 12]);
    expect(() => sliceBars(segs, 4, 1)).toThrow(/past bar/);
  });

  for (const name of SONG_NAMES) {
    it(`${name}: every bar of every layer is exactly one bar long`, () => {
      const b = compileSongBars(name);
      const len = (segs: readonly { startFrame: number; frames: number }[]) => { const l = segs[segs.length - 1]; return l ? l.startFrame + l.frames : 0; };
      for (const ch of ['t0', 't1', 't2', 'n'] as const) for (const bar of b.base[ch]) expect(len(bar)).toBe(b.barFrames);
      expect(len(b.intenseN)).toBe(b.barFrames);
      expect(len(b.dangerN)).toBe(b.barFrames);
      expect(b.intenseT1).toHaveLength(b.bars);
      expect(b.dangerT0).toHaveLength(b.bars);
    });
  }

  it('intense layer raises the arpeggio an octave; danger drops the melody back', () => {
    const b = compileSongBars('act1');
    const base = b.base.t1[0]?.[0]?.sound, hi = b.intenseT1[0]?.[0]?.sound;
    if (base?.kind !== 'tone' || hi?.kind !== 'tone') throw new Error('expected tones');
    expect(hi.from).toBeCloseTo(psgQuantize(base.from * 2), 3);
    const v0 = b.base.t0[0]?.[0]?.volumes[0] as number, v1 = b.dangerT0[0]?.[0]?.volumes[0] as number;
    expect(v1).toBe(v0 - 3);
  });
});

describe('in-key Cadence stinger', () => {
  const dMinor: Chord = ['D4', 'F4', 'A4', 'D5'];
  const notesOf = (track: string | undefined): string[] => (track ?? '').split(/\s+/).filter((t) => /^[A-G]/.test(t)).map((t) => t.split(':')[0] as string);

  it('uses only the bar chord\'s tones, climbing with the beat number', () => {
    const pcs = (n: string) => n.replace(/[0-8]$/, '');
    for (const beat of [1, 2, 3] as const) {
      const def = cadenceStinger(dMinor, beat, 16);
      const lead = notesOf(def.t0);
      expect(lead.length).toBeGreaterThanOrEqual(4);
      for (const n of lead) expect(['D', 'F', 'A']).toContain(pcs(n));
      expect(() => compileSfx(def)).not.toThrow();
    }
    const top = (b: 1 | 2 | 3) => Math.max(...notesOf(cadenceStinger(dMinor, b, 16).t0).map(noteHz));
    expect(top(2)).toBeGreaterThan(top(1));
    expect(top(3)).toBeGreaterThan(top(2));
  });

  it('rides the song\'s sixteenth grid (odd step lengths alternate to stay on it)', () => {
    const def = cadenceStinger(dMinor, 1, 19);
    const segs = compileSfx(def).t0 ?? [];
    // notes start on 0, 10, 19, 29 frames: round(i * 19 / 2)
    expect(segs.slice(0, 4).map((s) => s.startFrame)).toEqual([0, 10, 19, 29]);
    expect(cadenceStinger(dMinor, 3, 16).n).toBeDefined();
  });

  it('octaveShift is checked', () => {
    expect(octaveShift('C#5', 1)).toBe('C#6');
    expect(() => octaveShift('C8', 1)).toThrow();
    expect(() => octaveShift('H2', 0)).toThrow();
  });
});
