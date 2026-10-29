import { describe, expect, it } from 'vitest';
import { compileSong, SONG_NAMES, SONGS, stepsToTrack } from '../../src/render/music.ts';
import { noteHz, PSG_CLOCK } from '../../src/render/psg.ts';

describe('chiptune loops', () => {
  for (const name of SONG_NAMES) {
    it(`${name}: channels line up, 16-32 bars, every note inside the SN76489 tone range`, () => {
      const { channels, frames } = compileSong(name);
      const bars = frames / (SONGS[name].step * 8);
      expect(Number.isInteger(bars)).toBe(true);
      expect(bars).toBeGreaterThanOrEqual(16);
      expect(bars).toBeLessThanOrEqual(32);
      const lowest = PSG_CLOCK / (32 * 1023);
      for (const ch of ['t0', 't1', 't2'] as const) {
        for (const s of channels[ch]) if (s.sound?.kind === 'tone') expect(s.sound.from).toBeGreaterThanOrEqual(lowest);
      }
      expect(channels.n.some((s) => s.sound?.kind === 'noise')).toBe(true);
    });
  }
  it('step notation: holds merge, rests and hits compile', () => {
    expect(stepsToTrack('A4 . . -', 10, 't0', '@F')).toBe('@F A4:30 r:10');
    expect(stepsToTrack('k - s', 5, 'n', '')).toBe('@FB7 p2:5 r:5 @DA74 w1:5');
    expect(() => stepsToTrack('. A4', 10, 't0', '@F')).toThrow(/nothing to hold/);
    expect(noteHz('A2')).toBeGreaterThan(PSG_CLOCK / (32 * 1023));
  });
});
