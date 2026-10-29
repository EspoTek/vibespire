/**
 * Chiptune loops for the PSG (3 squares + noise), written as note data: one song for the title and
 * one per act. Pure: `compileSong` turns the step notation below into psg.ts track strings, so the
 * same compiler and envelope language as the SFX drive the music (audio.ts plays them on their own
 * voices, under the music volume).
 *
 * Step notation (one token per step; a song fixes the step length in frames):
 *   E5   note on this step       .   hold the previous note one more step     -   rest
 *   noise channel:  k  kick (periodic, low)   s  snare (white)   h  hat (short white)
 * Each channel's steps must add up to the song length exactly (checked), so loops stay in sync.
 */
import { compileTrack, type Channel, type Segment } from './psg.ts';

export type SongName = 'title' | 'act1' | 'act2' | 'act3';

export interface SongDef {
  /** Frames per step (60 Hz frames): 15 = eighth notes at 120 BPM. */
  step: number;
  /** Volume envelopes per channel (psg.ts `@` digits). */
  env: { t0: string; t1: string; t2: string };
  t0: string;
  t1: string;
  t2: string;
  n: string;
}

const rep = (s: string, n: number): string => Array.from({ length: n }, () => s).join(' ');

/** Eight-step bar arpeggio over a triad: root third fifth third, octave up, back. */
const arp = (r: string, t: string, f: string, o: string): string => `${r} ${t} ${f} ${t} ${o} ${f} ${t} ${f}`;
/** Eight-step bass bar: root on 1 and 3, fifth on the off-beats. */
const bass = (r: string, f: string): string => `${r} . ${f} - ${r} . ${f} ${r}`;

export const SONGS: Readonly<Record<SongName, SongDef>> = {
  // Title: A minor, heroic and slow (100 BPM eighths), 16 bars.
  title: {
    step: 18,
    env: { t0: '@DCCBBAA99', t1: '@8776655', t2: '@B' },
    t0: [
      'A4 . C5 . E5 . . D5', 'C5 . B4 . A4 . . -', 'F4 . A4 . C5 . . D5', 'E5 . . . . . - -',
      'A4 . C5 . E5 . A5 .', 'G5 . E5 . D5 . C5 .', 'D5 . . C5 B4 . G4 .', 'A4 . . . . . - -',
      'C5 . E5 . G5 . . F5', 'E5 . D5 . C5 . . -', 'F5 . E5 . D5 . C5 .', 'B4 . . . E5 . . -',
      'A5 . G5 . E5 . C5 .', 'D5 . C5 . B4 . G4 .', 'A4 . B4 . C5 . E5 .', 'A4 . . . . . - -',
    ].join(' '),
    t1: [
      arp('A3', 'C4', 'E4', 'A4'), arp('E3', 'G#3', 'B3', 'E4'), arp('F3', 'A3', 'C4', 'F4'), arp('E3', 'G#3', 'B3', 'E4'),
      arp('A3', 'C4', 'E4', 'A4'), arp('C4', 'E4', 'G4', 'C5'), arp('G3', 'B3', 'D4', 'G4'), arp('A3', 'C4', 'E4', 'A4'),
      arp('C4', 'E4', 'G4', 'C5'), arp('A3', 'C4', 'E4', 'A4'), arp('F3', 'A3', 'C4', 'F4'), arp('E3', 'G#3', 'B3', 'E4'),
      arp('A3', 'C4', 'E4', 'A4'), arp('G3', 'B3', 'D4', 'G4'), arp('F3', 'A3', 'C4', 'F4'), arp('A3', 'C4', 'E4', 'A4'),
    ].join(' '),
    t2: [
      bass('A2', 'E3'), bass('E3', 'B2'), bass('F3', 'C3'), bass('E3', 'B2'),
      bass('A2', 'E3'), bass('C3', 'G3'), bass('G3', 'D3'), bass('A2', 'E3'),
      bass('C3', 'G3'), bass('A2', 'E3'), bass('F3', 'C3'), bass('E3', 'B2'),
      bass('A2', 'E3'), bass('G3', 'D3'), bass('F3', 'C3'), bass('A2', 'E3'),
    ].join(' '),
    n: rep('k - - - s - - -', 14) + ' k - k - s - s s k - - - s - h h',
  },
  // Act 1, The Verdant Decks: D dorian, pastoral and bouncy (112 BPM), 16 bars.
  act1: {
    step: 16,
    env: { t0: '@CBBA998', t1: '@766554', t2: '@A9' },
    t0: [
      'D5 . F5 . A5 . G5 F5', 'E5 . C5 . D5 . . -', 'D5 . F5 . A5 . C6 .', 'B5 . A5 . G5 . . -',
      'F5 . G5 . A5 . F5 .', 'G5 . E5 . C5 . . -', 'D5 E5 F5 G5 A5 . G5 F5', 'E5 . . . D5 . . -',
      'A5 . . G5 F5 . E5 .', 'D5 . E5 . F5 . . -', 'G5 . . F5 E5 . D5 .', 'C5 . D5 . E5 . . -',
      'F5 . A5 . C6 . A5 .', 'B5 . G5 . E5 . C5 .', 'D5 . F5 . E5 . C5 .', 'D5 . . . . . - -',
    ].join(' '),
    t1: [
      arp('D4', 'F4', 'A4', 'D5'), arp('C4', 'E4', 'G4', 'C5'), arp('D4', 'F4', 'A4', 'D5'), arp('G3', 'B3', 'D4', 'G4'),
      arp('F3', 'A3', 'C4', 'F4'), arp('C4', 'E4', 'G4', 'C5'), arp('D4', 'F4', 'A4', 'D5'), arp('A3', 'C4', 'E4', 'A4'),
      arp('D4', 'F4', 'A4', 'D5'), arp('Bb3', 'D4', 'F4', 'Bb4'), arp('G3', 'B3', 'D4', 'G4'), arp('C4', 'E4', 'G4', 'C5'),
      arp('F3', 'A3', 'C4', 'F4'), arp('G3', 'B3', 'D4', 'G4'), arp('A3', 'C#4', 'E4', 'A4'), arp('D4', 'F4', 'A4', 'D5'),
    ].join(' '),
    t2: [
      bass('D3', 'A2'), bass('C3', 'G3'), bass('D3', 'A2'), bass('G3', 'D3'),
      bass('F3', 'C3'), bass('C3', 'G3'), bass('D3', 'A2'), bass('A2', 'E3'),
      bass('D3', 'A2'), bass('Bb2', 'F3'), bass('G3', 'D3'), bass('C3', 'G3'),
      bass('F3', 'C3'), bass('G3', 'D3'), bass('A2', 'E3'), bass('D3', 'A2'),
    ].join(' '),
    n: rep('k - h - s - h -', 15) + ' k - h - s s s s',
  },
  // Act 2, The Foundry: E minor, driving (132 BPM) with a periodic-noise hammer, 16 bars.
  act2: {
    step: 14,
    env: { t0: '@EDCBA98', t1: '@9876', t2: '@CB' },
    t0: [
      'E5 . . E5 G5 . E5 .', 'D5 . B4 . D5 . E5 .', 'E5 . . E5 G5 . A5 .', 'B5 . A5 . G5 . F#5 .',
      'E5 . . E5 G5 . E5 .', 'D5 . B4 . G4 . A4 .', 'B4 . . A4 G4 . F#4 .', 'E4 . . . . . - -',
      'G5 . . F#5 E5 . D5 .', 'C5 . . D5 E5 . . -', 'A5 . . G5 F#5 . E5 .', 'D#5 . F#5 . B5 . . -',
      'E5 . G5 . B5 . E6 .', 'D6 . B5 . G5 . A5 .', 'B5 . A5 . G5 . F#5 .', 'E5 . . . . . - -',
    ].join(' '),
    t1: [
      arp('E4', 'G4', 'B4', 'E5'), arp('D4', 'F#4', 'A4', 'D5'), arp('C4', 'E4', 'G4', 'C5'), arp('B3', 'D#4', 'F#4', 'B4'),
      arp('E4', 'G4', 'B4', 'E5'), arp('G3', 'B3', 'D4', 'G4'), arp('A3', 'C4', 'E4', 'A4'), arp('B3', 'D#4', 'F#4', 'B4'),
      arp('C4', 'E4', 'G4', 'C5'), arp('A3', 'C4', 'E4', 'A4'), arp('D4', 'F#4', 'A4', 'D5'), arp('B3', 'D#4', 'F#4', 'B4'),
      arp('E4', 'G4', 'B4', 'E5'), arp('G3', 'B3', 'D4', 'G4'), arp('B3', 'D#4', 'F#4', 'B4'), arp('E4', 'G4', 'B4', 'E5'),
    ].join(' '),
    t2: rep('E3 E3 E3 E3 E3 E3 D3 E3', 4) + ' ' + rep('C3 C3 C3 C3 A2 A2 A2 A2', 2) + ' ' + rep('D3 D3 D3 D3 B2 B2 B2 B2', 2)
      + ' ' + rep('E3 E3 E3 E3 G3 G3 G3 G3', 2) + ' ' + rep('B2 B2 B2 B2 E3 E3 E3 E3', 2) + ' ' + rep('E3 E3 E3 E3 B2 B2 B2 B2', 2)
      + ' ' + rep('E3 E3 E3 E3 E3 E3 D3 E3', 2),
    n: rep('k h s h k k s h', 15) + ' k s k s s s s s',
  },
  // Act 3, The Crown: B minor with a harmonic-minor edge, eerie and spacious (96 BPM), 16 bars.
  act3: {
    step: 19,
    env: { t0: '@BBAA99887766', t1: '@6655443', t2: '@9' },
    t0: [
      'B4 . . . D5 . F#5 .', 'E5 . . D5 C#5 . . -', 'B4 . . . D5 . G5 .', 'F#5 . . . . . - -',
      'G5 . F#5 . E5 . D5 .', 'C#5 . . . A#4 . . -', 'B4 . C#5 . D5 . E5 .', 'F#5 . . . . . - -',
      'D6 . . C#6 B5 . . -', 'A#5 . . B5 C#6 . . -', 'B5 . . A5 G5 . F#5 .', 'E5 . . . F#5 . . -',
      'B4 . D5 . F#5 . B5 .', 'A#5 . F#5 . C#5 . A#4 .', 'B4 . . . . . . .', '- - - - - - - -',
    ].join(' '),
    t1: [
      arp('B3', 'D4', 'F#4', 'B4'), arp('A3', 'C#4', 'E4', 'A4'), arp('G3', 'B3', 'D4', 'G4'), arp('F#3', 'A#3', 'C#4', 'F#4'),
      arp('E3', 'G3', 'B3', 'E4'), arp('F#3', 'A#3', 'C#4', 'F#4'), arp('B3', 'D4', 'F#4', 'B4'), arp('F#3', 'A#3', 'C#4', 'F#4'),
      arp('G3', 'B3', 'D4', 'G4'), arp('F#3', 'A#3', 'C#4', 'F#4'), arp('E3', 'G3', 'B3', 'E4'), arp('F#3', 'A#3', 'C#4', 'F#4'),
      arp('B3', 'D4', 'F#4', 'B4'), arp('F#3', 'A#3', 'C#4', 'F#4'), arp('B3', 'D4', 'F#4', 'B4'), arp('B3', 'D4', 'F#4', 'B4'),
    ].join(' '),
    t2: [
      'B2 . . . . . . .', 'A2 . . . . . . .', 'G3 . . . . . . .', 'F#3 . . . . . . .',
      'E3 . . . . . . .', 'F#3 . . . . . . .', 'B2 . . . . . . .', 'F#3 . . . . . . .',
      'G3 . . . . . . .', 'F#3 . . . . . . .', 'E3 . . . . . . .', 'F#3 . . . . . . .',
      'B2 . . . . . . .', 'F#3 . . . . . . .', 'B2 . . . . . . .', 'B2 . . . . . . .',
    ].join(' '),
    n: rep('k - - - - - h -', 16),
  },
};

const NOISE: Readonly<Record<string, string>> = { k: '@FB7 p2', s: '@DA74 w1', h: '@963 w0' };

/** Steps -> a psg.ts track string; `.` extends the previous note or rest. */
export function stepsToTrack(steps: string, stepFrames: number, channel: Channel, env: string): string {
  const toks = steps.trim().split(/\s+/);
  const out: string[] = [];
  let i = 0;
  while (i < toks.length) {
    const t = toks[i] as string;
    if (t === '.') throw new Error(`music ${channel}: "." at step ${i} has nothing to hold`);
    let n = 1;
    while (toks[i + n] === '.') n++;
    const frames = n * stepFrames;
    if (t === '-') out.push(`r:${frames}`);
    else if (channel === 'n') {
      const d = NOISE[t];
      if (!d) throw new Error(`music noise: unknown hit "${t}" (k s h - .)`);
      const [envTok, noise] = d.split(' ');
      out.push(`${envTok} ${noise}:${frames}`);
    } else out.push(`${env} ${t}:${frames}`);
    i += n;
  }
  return out.join(' ');
}

/** A song's compiled channels and its loop length in frames (all channels must match). */
export function compileSong(name: SongName): { channels: Record<Channel, Segment[]>; frames: number } {
  const s = SONGS[name];
  const tracks: Record<Channel, string> = {
    t0: stepsToTrack(s.t0, s.step, 't0', s.env.t0),
    t1: stepsToTrack(s.t1, s.step, 't1', s.env.t1),
    t2: stepsToTrack(s.t2, s.step, 't2', s.env.t2),
    n: stepsToTrack(s.n, s.step, 'n', ''),
  };
  const channels = {
    t0: compileTrack(tracks.t0, 't0'), t1: compileTrack(tracks.t1, 't1'), t2: compileTrack(tracks.t2, 't2'), n: compileTrack(tracks.n, 'n'),
  };
  const len = (segs: readonly Segment[]) => { const l = segs[segs.length - 1]; return l ? l.startFrame + l.frames : 0; };
  const frames = len(channels.t0);
  for (const ch of ['t1', 't2', 'n'] as const) {
    if (len(channels[ch]) !== frames) throw new Error(`music ${name}: channel ${ch} is ${len(channels[ch])} frames, t0 is ${frames}`);
  }
  return { channels, frames };
}

export const SONG_NAMES: readonly SongName[] = Object.keys(SONGS) as SongName[];

export function actSong(act: 1 | 2 | 3): SongName { return act === 1 ? 'act1' : act === 2 ? 'act2' : 'act3'; }
