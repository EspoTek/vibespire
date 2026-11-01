/**
 * Chiptune loops for the PSG (3 squares + noise), written as note data: one song for the title, one
 * per act, and one per act boss. Pure: `compileSong` turns the step notation below into psg.ts track
 * strings, so the same compiler and envelope language as the SFX drive the music (audio.ts plays
 * them on their own voices, under the music volume).
 *
 * Step notation (one token per step; a song fixes the step length in frames; 8 steps = 1 bar):
 *   E5   note on this step       .   hold the previous note one more step     -   rest
 *   noise channel:  k  kick (periodic, low)   s  snare (white)   h  hat (short white)
 *                   K  heartbeat "lub"        d  heartbeat "dub"
 * Each channel's steps must add up to the song length exactly (checked), so loops stay in sync.
 *
 * Reactive music (audio.ts schedules bar by bar, so all of this switches on bar lines):
 *   - `chords`: the harmony of each bar; in-key stingers (Cadence beats) are built from it.
 *   - intense layer: driving drums + the arpeggio an octave up (enemies threaten lethal damage).
 *   - danger layer: a heartbeat replaces the drums and the melody drops back (low HP).
 */
import { attenuateSegments, compileTrack, transposeSegments, type Channel, type Segment, type SfxDef } from './psg.ts';

export type SongName = 'title' | 'act1' | 'act2' | 'act3' | 'boss1' | 'boss2' | 'boss3';

/** A bar's chord as four arpeggio tones: root, third, fifth, octave (any voicing). */
export type Chord = readonly [string, string, string, string];

export interface SongDef {
  /** Frames per step (60 Hz frames): 15 = eighth notes at 120 BPM. A beat is 2 steps, a bar 8. */
  step: number;
  /** Volume envelopes per channel (psg.ts `@` digits). */
  env: { t0: string; t1: string; t2: string };
  /** One chord per bar (drives t1's arpeggio and the in-key stingers). */
  chords: readonly Chord[];
  t0: string;
  t1: string;
  t2: string;
  n: string;
  /** One bar of drums for the intense layer. */
  intense: string;
}

export const STEPS_PER_BAR = 8;
export const STEPS_PER_BEAT = 2;

const rep = (s: string, n: number): string => Array.from({ length: n }, () => s).join(' ');

/** Eight-step bar arpeggio over a triad: root third fifth third, octave up, back. */
const arp = (c: Chord): string => `${c[0]} ${c[1]} ${c[2]} ${c[1]} ${c[3]} ${c[2]} ${c[1]} ${c[2]}`;
/** Eight-step bass bar: root on 1 and 3, fifth on the off-beats. */
const bass = (r: string, f: string): string => `${r} . ${f} - ${r} . ${f} ${r}`;
/** Driving eighth-note bass with an octave kick on the off-beats (boss themes). */
const drive = (r: string, o: string): string => `${r} ${r} ${o} ${r} ${r} ${o} ${r} ${o}`;

const ch = (s: string): Chord => {
  const [a, b, c, d, ...rest] = s.split(' ');
  if (a === undefined || b === undefined || c === undefined || d === undefined || rest.length > 0) throw new Error(`music: chord "${s}" needs 4 tones`);
  return [a, b, c, d];
};

const chords = (list: string): Chord[] => list.split('|').map((c) => ch(c.trim()));

/** Build a song: t1 is the bar-by-bar arpeggio of `chords`. */
function song(d: Omit<SongDef, 't1' | 'intense'> & { intense?: string }): SongDef {
  return { ...d, t1: d.chords.map(arp).join(' '), intense: d.intense ?? 'k h s h k k s h' };
}

export const SONGS: Readonly<Record<SongName, SongDef>> = {
  // Title: A minor, heroic and slow (100 BPM eighths), 16 bars.
  title: song({
    step: 18,
    env: { t0: '@DCCBBAA99', t1: '@8776655', t2: '@B' },
    chords: chords('A3 C4 E4 A4 | E3 G#3 B3 E4 | F3 A3 C4 F4 | E3 G#3 B3 E4 | A3 C4 E4 A4 | C4 E4 G4 C5 | G3 B3 D4 G4 | A3 C4 E4 A4 | '
      + 'C4 E4 G4 C5 | A3 C4 E4 A4 | F3 A3 C4 F4 | E3 G#3 B3 E4 | A3 C4 E4 A4 | G3 B3 D4 G4 | F3 A3 C4 F4 | A3 C4 E4 A4'),
    t0: [
      'A4 . C5 . E5 . . D5', 'C5 . B4 . A4 . . -', 'F4 . A4 . C5 . . D5', 'E5 . . . . . - -',
      'A4 . C5 . E5 . A5 .', 'G5 . E5 . D5 . C5 .', 'D5 . . C5 B4 . G4 .', 'A4 . . . . . - -',
      'C5 . E5 . G5 . . F5', 'E5 . D5 . C5 . . -', 'F5 . E5 . D5 . C5 .', 'B4 . . . E5 . . -',
      'A5 . G5 . E5 . C5 .', 'D5 . C5 . B4 . G4 .', 'A4 . B4 . C5 . E5 .', 'A4 . . . . . - -',
    ].join(' '),
    t2: [
      bass('A2', 'E3'), bass('E3', 'B2'), bass('F3', 'C3'), bass('E3', 'B2'),
      bass('A2', 'E3'), bass('C3', 'G3'), bass('G3', 'D3'), bass('A2', 'E3'),
      bass('C3', 'G3'), bass('A2', 'E3'), bass('F3', 'C3'), bass('E3', 'B2'),
      bass('A2', 'E3'), bass('G3', 'D3'), bass('F3', 'C3'), bass('A2', 'E3'),
    ].join(' '),
    n: rep('k - - - s - - -', 14) + ' k - k - s - s s k - - - s - h h',
  }),
  // Act 1, The Verdant Decks: D dorian, pastoral and bouncy (112 BPM), 16 bars.
  act1: song({
    step: 16,
    env: { t0: '@CBBA998', t1: '@766554', t2: '@A9' },
    chords: chords('D4 F4 A4 D5 | C4 E4 G4 C5 | D4 F4 A4 D5 | G3 B3 D4 G4 | F3 A3 C4 F4 | C4 E4 G4 C5 | D4 F4 A4 D5 | A3 C4 E4 A4 | '
      + 'D4 F4 A4 D5 | Bb3 D4 F4 Bb4 | G3 B3 D4 G4 | C4 E4 G4 C5 | F3 A3 C4 F4 | G3 B3 D4 G4 | A3 C#4 E4 A4 | D4 F4 A4 D5'),
    t0: [
      'D5 . F5 . A5 . G5 F5', 'E5 . C5 . D5 . . -', 'D5 . F5 . A5 . C6 .', 'B5 . A5 . G5 . . -',
      'F5 . G5 . A5 . F5 .', 'G5 . E5 . C5 . . -', 'D5 E5 F5 G5 A5 . G5 F5', 'E5 . . . D5 . . -',
      'A5 . . G5 F5 . E5 .', 'D5 . E5 . F5 . . -', 'G5 . . F5 E5 . D5 .', 'C5 . D5 . E5 . . -',
      'F5 . A5 . C6 . A5 .', 'B5 . G5 . E5 . C5 .', 'D5 . F5 . E5 . C5 .', 'D5 . . . . . - -',
    ].join(' '),
    t2: [
      bass('D3', 'A2'), bass('C3', 'G3'), bass('D3', 'A2'), bass('G3', 'D3'),
      bass('F3', 'C3'), bass('C3', 'G3'), bass('D3', 'A2'), bass('A2', 'E3'),
      bass('D3', 'A2'), bass('Bb2', 'F3'), bass('G3', 'D3'), bass('C3', 'G3'),
      bass('F3', 'C3'), bass('G3', 'D3'), bass('A2', 'E3'), bass('D3', 'A2'),
    ].join(' '),
    n: rep('k - h - s - h -', 15) + ' k - h - s s s s',
    intense: 'k h s h k k s h',
  }),
  // Act 2, The Foundry: E minor, driving (132 BPM) with a periodic-noise hammer, 16 bars.
  act2: song({
    step: 14,
    env: { t0: '@EDCBA98', t1: '@9876', t2: '@CB' },
    chords: chords('E4 G4 B4 E5 | D4 F#4 A4 D5 | C4 E4 G4 C5 | B3 D#4 F#4 B4 | E4 G4 B4 E5 | G3 B3 D4 G4 | A3 C4 E4 A4 | B3 D#4 F#4 B4 | '
      + 'C4 E4 G4 C5 | A3 C4 E4 A4 | D4 F#4 A4 D5 | B3 D#4 F#4 B4 | E4 G4 B4 E5 | G3 B3 D4 G4 | B3 D#4 F#4 B4 | E4 G4 B4 E5'),
    t0: [
      'E5 . . E5 G5 . E5 .', 'D5 . B4 . D5 . E5 .', 'E5 . . E5 G5 . A5 .', 'B5 . A5 . G5 . F#5 .',
      'E5 . . E5 G5 . E5 .', 'D5 . B4 . G4 . A4 .', 'B4 . . A4 G4 . F#4 .', 'E4 . . . . . - -',
      'G5 . . F#5 E5 . D5 .', 'C5 . . D5 E5 . . -', 'A5 . . G5 F#5 . E5 .', 'D#5 . F#5 . B5 . . -',
      'E5 . G5 . B5 . E6 .', 'D6 . B5 . G5 . A5 .', 'B5 . A5 . G5 . F#5 .', 'E5 . . . . . - -',
    ].join(' '),
    t2: rep('E3 E3 E3 E3 E3 E3 D3 E3', 4) + ' ' + rep('C3 C3 C3 C3 A2 A2 A2 A2', 2) + ' ' + rep('D3 D3 D3 D3 B2 B2 B2 B2', 2)
      + ' ' + rep('E3 E3 E3 E3 G3 G3 G3 G3', 2) + ' ' + rep('B2 B2 B2 B2 E3 E3 E3 E3', 2) + ' ' + rep('E3 E3 E3 E3 B2 B2 B2 B2', 2)
      + ' ' + rep('E3 E3 E3 E3 E3 E3 D3 E3', 2),
    n: rep('k h s h k k s h', 15) + ' k s k s s s s s',
    intense: 'k k s k k k s s',
  }),
  // Act 3, The Crown: B minor with a harmonic-minor edge, eerie and spacious (96 BPM), 16 bars.
  act3: song({
    step: 19,
    env: { t0: '@BBAA99887766', t1: '@6655443', t2: '@9' },
    chords: chords('B3 D4 F#4 B4 | A3 C#4 E4 A4 | G3 B3 D4 G4 | F#3 A#3 C#4 F#4 | E3 G3 B3 E4 | F#3 A#3 C#4 F#4 | B3 D4 F#4 B4 | F#3 A#3 C#4 F#4 | '
      + 'G3 B3 D4 G4 | F#3 A#3 C#4 F#4 | E3 G3 B3 E4 | F#3 A#3 C#4 F#4 | B3 D4 F#4 B4 | F#3 A#3 C#4 F#4 | B3 D4 F#4 B4 | B3 D4 F#4 B4'),
    t0: [
      'B4 . . . D5 . F#5 .', 'E5 . . D5 C#5 . . -', 'B4 . . . D5 . G5 .', 'F#5 . . . . . - -',
      'G5 . F#5 . E5 . D5 .', 'C#5 . . . A#4 . . -', 'B4 . C#5 . D5 . E5 .', 'F#5 . . . . . - -',
      'D6 . . C#6 B5 . . -', 'A#5 . . B5 C#6 . . -', 'B5 . . A5 G5 . F#5 .', 'E5 . . . F#5 . . -',
      'B4 . D5 . F#5 . B5 .', 'A#5 . F#5 . C#5 . A#4 .', 'B4 . . . . . . .', '- - - - - - - -',
    ].join(' '),
    t2: [
      'B2 . . . . . . .', 'A2 . . . . . . .', 'G3 . . . . . . .', 'F#3 . . . . . . .',
      'E3 . . . . . . .', 'F#3 . . . . . . .', 'B2 . . . . . . .', 'F#3 . . . . . . .',
      'G3 . . . . . . .', 'F#3 . . . . . . .', 'E3 . . . . . . .', 'F#3 . . . . . . .',
      'B2 . . . . . . .', 'F#3 . . . . . . .', 'B2 . . . . . . .', 'B2 . . . . . . .',
    ].join(' '),
    n: rep('k - - - - - h -', 16),
    intense: 'k - h k s - h h',
  }),
  // Act 1 boss: D minor, urgent (138 BPM), a thumping eighth-note bass under a leaping lead.
  boss1: song({
    step: 13,
    env: { t0: '@EDCBA98', t1: '@9876', t2: '@CB' },
    chords: chords('D4 F4 A4 D5 | D4 F4 A4 D5 | Bb3 D4 F4 Bb4 | C4 E4 G4 C5 | D4 F4 A4 D5 | G3 Bb3 D4 G4 | A3 C#4 E4 A4 | A3 C#4 E4 A4 | '
      + 'D4 F4 A4 D5 | F3 A3 C4 F4 | Bb3 D4 F4 Bb4 | C4 E4 G4 C5 | G3 Bb3 D4 G4 | A3 C#4 E4 A4 | D4 F4 A4 D5 | A3 C#4 E4 A4'),
    t0: [
      'D5 . D5 F5 A5 . G5 F5', 'E5 . F5 . D5 . . -', 'D5 . D5 F5 Bb5 . A5 G5', 'A5 . G5 . E5 . C5 .',
      'D5 . F5 . A5 . D6 .', 'C6 . Bb5 . G5 . Bb5 .', 'A5 . . G5 F5 . E5 .', 'C#5 . E5 . A5 . . -',
      'D6 . . C6 A5 . F5 .', 'C6 . . A5 F5 . C5 .', 'D5 . F5 . Bb5 . D6 .', 'C6 . E5 . G5 . C6 .',
      'Bb5 . A5 . G5 . D5 .', 'E5 . A4 . C#5 . E5 .', 'F5 . E5 . D5 . C#5 .', 'D5 . . . A4 . . -',
    ].join(' '),
    t2: [
      drive('D3', 'D4'), drive('D3', 'D4'), drive('Bb2', 'Bb3'), drive('C3', 'C4'),
      drive('D3', 'D4'), drive('G3', 'G4'), drive('A2', 'A3'), drive('A2', 'A3'),
      drive('D3', 'D4'), drive('F3', 'F4'), drive('Bb2', 'Bb3'), drive('C3', 'C4'),
      drive('G3', 'G4'), drive('A2', 'A3'), drive('D3', 'D4'), drive('A2', 'A3'),
    ].join(' '),
    n: rep('k h s h k k s h', 7) + ' k s k s s s s s ' + rep('k h s h k k s h', 7) + ' k s s k s s s s',
    intense: 'k k s k k k s s',
  }),
  // Act 2 boss: E phrygian, relentless (150 BPM), the foundry hammer doubled.
  boss2: song({
    step: 12,
    env: { t0: '@EDCBA98', t1: '@A987', t2: '@DC' },
    chords: chords('E4 G4 B4 E5 | F4 A4 C5 F5 | E4 G4 B4 E5 | D4 F#4 A4 D5 | A3 C4 E4 A4 | B3 D#4 F#4 B4 | E4 G4 B4 E5 | B3 D#4 F#4 B4 | '
      + 'E4 G4 B4 E5 | G3 B3 D4 G4 | A3 C4 E4 A4 | B3 D#4 F#4 B4 | C4 E4 G4 C5 | D4 F#4 A4 D5 | B3 D#4 F#4 B4 | E4 G4 B4 E5'),
    t0: [
      'E5 . E5 . F5 . E5 .', 'G5 . F5 . E5 . D5 .', 'E5 . B4 . E5 . G5 .', 'F#5 . . E5 D5 . . -',
      'C6 . B5 . A5 . G5 .', 'F#5 . . D#5 B4 . . -', 'E5 . G5 . B5 . E6 .', 'D#6 . B5 . F#5 . D#5 .',
      'E6 . . D6 B5 . G5 .', 'D6 . . B5 G5 . D5 .', 'C6 . . B5 A5 . E5 .', 'B5 . . A5 F#5 . D#5 .',
      'C6 . B5 . A5 . G5 .', 'A5 . G5 . F#5 . D5 .', 'D#5 . F#5 . A5 . B5 .', 'E6 . . . B5 . - -',
    ].join(' '),
    t2: [
      drive('E3', 'E4'), drive('F3', 'F4'), drive('E3', 'E4'), drive('D3', 'D4'),
      drive('A2', 'A3'), drive('B2', 'B3'), drive('E3', 'E4'), drive('B2', 'B3'),
      drive('E3', 'E4'), drive('G3', 'G4'), drive('A2', 'A3'), drive('B2', 'B3'),
      drive('C3', 'C4'), drive('D3', 'D4'), drive('B2', 'B3'), drive('E3', 'E4'),
    ].join(' '),
    n: rep('k h k s k h k s', 7) + ' k k s k k s s s ' + rep('k h k s k h k s', 7) + ' k s k s s s s s',
    intense: 'k k k s k k k s',
  }),
  // Act 3 boss: B harmonic minor, regal and dreadful (120 BPM).
  boss3: song({
    step: 15,
    env: { t0: '@EEDDCCBBAA99', t1: '@98877665', t2: '@CB' },
    chords: chords('B3 D4 F#4 B4 | F#3 A#3 C#4 F#4 | E3 G3 B3 E4 | F#3 A#3 C#4 F#4 | B3 D4 F#4 B4 | G3 B3 D4 G4 | C#4 E4 G4 C#5 | F#3 A#3 C#4 F#4 | '
      + 'B3 D4 F#4 B4 | G3 B3 D4 G4 | E3 G3 B3 E4 | F#3 A#3 C#4 F#4 | B3 D4 F#4 B4 | E3 G3 B3 E4 | F#3 A#3 C#4 F#4 | B3 D4 F#4 B4'),
    t0: [
      'B4 . D5 . F#5 . B5 .', 'A#5 . . B5 G5 . D5 .', 'E5 . G5 . B5 . E6 .', 'D6 . C#6 . A#5 . F#5 .',
      'B5 . . A5 F#5 . D5 .', 'G5 . . F#5 E5 . D5 .', 'C#5 . E5 . G5 . A#5 .', 'F#5 . . . C#5 . - -',
      'B5 . . C#6 D6 . . B5', 'G5 . . A5 B5 . . G5', 'E5 . . F#5 G5 . E5 .', 'F#5 . A#5 . C#6 . F#6 .',
      'D6 . C#6 . B5 . A5 .', 'G5 . F#5 . E5 . D5 .', 'C#5 . . D5 E5 . A#4 .', 'B4 . . . . . - -',
    ].join(' '),
    t2: [
      drive('B2', 'B3'), drive('F#3', 'F#4'), drive('E3', 'E4'), drive('F#3', 'F#4'),
      drive('B2', 'B3'), drive('G3', 'G4'), drive('C#3', 'C#4'), drive('F#3', 'F#4'),
      drive('B2', 'B3'), drive('G3', 'G4'), drive('E3', 'E4'), drive('F#3', 'F#4'),
      drive('B2', 'B3'), drive('E3', 'E4'), drive('F#3', 'F#4'), drive('B2', 'B3'),
    ].join(' '),
    n: rep('k - s - k k s -', 7) + ' k s k s s s s s ' + rep('k - s h k k s h', 7) + ' k s s s s s s s',
    intense: 'k h s h k k s h',
  }),
};

const NOISE: Readonly<Record<string, string>> = {
  k: '@FB7 p2', s: '@DA74 w1', h: '@963 w0',
  K: '@FEC9 p2', d: '@B97 p2',
};

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
      if (!d) throw new Error(`music noise: unknown hit "${t}" (k s h K d - .)`);
      const [envTok, noise] = d.split(' ');
      out.push(`${envTok} ${noise}:${frames}`);
    } else out.push(`${env} ${t}:${frames}`);
    i += n;
  }
  return out.join(' ');
}

const trackLen = (segs: readonly Segment[]): number => { const l = segs[segs.length - 1]; return l ? l.startFrame + l.frames : 0; };

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
  const frames = trackLen(channels.t0);
  for (const c of ['t1', 't2', 'n'] as const) {
    if (trackLen(channels[c]) !== frames) throw new Error(`music ${name}: channel ${c} is ${trackLen(channels[c])} frames, t0 is ${frames}`);
  }
  const bars = frames / (s.step * STEPS_PER_BAR);
  if (!Number.isInteger(bars)) throw new Error(`music ${name}: ${frames} frames is not a whole number of bars`);
  if (s.chords.length !== bars) throw new Error(`music ${name}: ${s.chords.length} chords for ${bars} bars`);
  return { channels, frames };
}

/**
 * Cut a channel into bars (segment times become bar-relative). A note held over a bar line is
 * split into pieces marked `tie` so the scheduler does not re-articulate it.
 */
export function sliceBars(segs: readonly Segment[], barFrames: number, bars: number): Segment[][] {
  const out: Segment[][] = Array.from({ length: bars }, () => []);
  for (const s of segs) {
    let start = s.startFrame, left = s.frames, off = 0;
    while (left > 0) {
      const bar = Math.floor(start / barFrames);
      const into = out[bar];
      if (!into) throw new Error(`sliceBars: segment at frame ${start} is past bar ${bars}`);
      const n = Math.min(left, (bar + 1) * barFrames - start);
      const piece: Segment = { startFrame: start - bar * barFrames, frames: n, sound: s.sound, volumes: s.volumes.slice(off, off + n) };
      if (n < left || s.tie) piece.tie = true;
      into.push(piece);
      start += n; left -= n; off += n;
    }
  }
  return out;
}

/** A song cut into bars, with the reactive layers pre-built. */
export interface SongBars {
  name: SongName;
  stepFrames: number;
  barFrames: number;
  bars: number;
  chords: readonly Chord[];
  base: Record<Channel, Segment[][]>;
  /** Intense layer: one bar of driving drums; the arpeggio an octave up. */
  intenseN: Segment[];
  intenseT1: Segment[][];
  /** Danger layer (low HP): one bar of heartbeat; the melody attenuated. */
  dangerN: Segment[];
  dangerT0: Segment[][];
}

const barsCache = new Map<SongName, SongBars>();

export function compileSongBars(name: SongName): SongBars {
  const hit = barsCache.get(name);
  if (hit) return hit;
  const s = SONGS[name];
  const { channels, frames } = compileSong(name);
  const barFrames = s.step * STEPS_PER_BAR;
  const bars = frames / barFrames;
  const base = {
    t0: sliceBars(channels.t0, barFrames, bars), t1: sliceBars(channels.t1, barFrames, bars),
    t2: sliceBars(channels.t2, barFrames, bars), n: sliceBars(channels.n, barFrames, bars),
  };
  const oneBar = (steps: string): Segment[] => {
    const segs = compileTrack(stepsToTrack(steps, s.step, 'n', ''), 'n');
    if (trackLen(segs) !== barFrames) throw new Error(`music ${name}: layer drums "${steps}" are not one bar`);
    return segs;
  };
  const out: SongBars = {
    name, stepFrames: s.step, barFrames, bars, chords: s.chords, base,
    intenseN: oneBar(s.intense),
    intenseT1: base.t1.map((b) => transposeSegments(b, 12)),
    dangerN: oneBar('K d - - h - - -'),
    dangerT0: base.t0.map((b) => attenuateSegments(b, 3)),
  };
  barsCache.set(name, out);
  return out;
}

export const SONG_NAMES: readonly SongName[] = Object.keys(SONGS) as SongName[];

export function actSong(act: 1 | 2 | 3): SongName { return act === 1 ? 'act1' : act === 2 ? 'act2' : 'act3'; }
export function bossSong(act: 1 | 2 | 3): SongName { return act === 1 ? 'boss1' : act === 2 ? 'boss2' : 'boss3'; }

// ------------------------------------------------------------------ in-key stingers

/** "C#5" -> "C#6" for `octaves` = 1. Throws on a bad note. */
export function octaveShift(note: string, octaves: number): string {
  const m = /^([A-G][#b]?)([0-8])$/.exec(note);
  if (!m) throw new Error(`octaveShift: bad note "${note}"`);
  const o = Number(m[2]) + octaves;
  if (o < 0 || o > 8) throw new Error(`octaveShift: ${note} + ${octaves} octaves is out of range`);
  return `${m[1] as string}${o}`;
}

/** Frame lengths of `n` sixteenth notes on a `stepFrames` eighth grid (alternating to stay on grid). */
function sixteenths(n: number, stepFrames: number): number[] {
  const at = (i: number) => Math.round((i * stepFrames) / 2);
  return Array.from({ length: n }, (_, i) => Math.max(1, at(i + 1) - at(i)));
}

/**
 * The Cadence beat stinger (plays 3 / 6 / 9 of a turn), built in the key of the bar it lands in
 * and on the music's sixteenth-note grid: beat 1 a rising triad, beat 2 climbs higher, beat 3 a
 * full two-octave run with a crash. t1 echoes the lead a sixteenth late (the classic PSG echo).
 */
export function cadenceStinger(chord: Chord, beat: 1 | 2 | 3, stepFrames: number): SfxDef {
  const [r, t, f, o] = chord;
  const up = (n: string, k: number) => octaveShift(n, k);
  const runs: Record<1 | 2 | 3, string[]> = {
    1: [up(r, 1), up(t, 1), up(f, 1), up(o, 1)],
    2: [up(t, 1), up(f, 1), up(o, 1), up(t, 2)],
    3: [up(r, 1), up(t, 1), up(f, 1), up(o, 1), up(t, 2), up(f, 2), up(o, 2)],
  };
  const notes = runs[beat];
  const lens = sixteenths(notes.length + 2, stepFrames);
  const tail = (lens[notes.length] as number) + (lens[notes.length + 1] as number);
  const lead = notes.map((n, i) => (i === notes.length - 1 ? `@EDDCCBBAA99887766 ${n}:${tail + (lens[i] as number)}` : `@E ${n}:${lens[i] as number}`)).join(' ');
  const echo = `@7 r:${lens[0] as number} ` + notes.map((n, i) => (i === notes.length - 1 ? `@776655443322 ${n}:${tail}` : `@7 ${n}:${lens[i + 1] as number}`)).join(' ');
  const def: SfxDef = { t0: lead, t1: echo };
  if (beat === 3) {
    def.n = '@FEDCBA9876543210 w0:16';
    def.t2 = `@C ${r}:${(lens[0] as number) * 2} @CBA98765 ${f}:${tail + (lens[1] as number)}`;
  } else def.n = '@B85 w0:3';
  return def;
}
