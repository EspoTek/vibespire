/**
 * SN76489-style PSG model + a tiny envelope language for SFX. Pure (no Web Audio): audio.ts
 * schedules the compiled segments onto 3 square channels + 1 noise channel.
 *
 * Track language (whitespace-separated tokens, time unit = one 60 Hz frame):
 *   @F96         volume envelope: one hex digit (0 = silent .. F = loudest) per frame; the last
 *                value is held. Applies to every following note until the next @. Default @F.
 *   C5:4         note C5 for 4 frames. Note names: C D E F G A B, optional # or b, octave 0..8.
 *   A4~A3:8      glide from A4 to A3 over the note (linear in period, like a register sweep).
 *   r:3          rest (silence) for 3 frames.
 *   w0:6 p1:4    noise channel only: w = white noise, p = periodic ("buzz"); digit = shift rate
 *                0..2 (SN76489 rates clock/512, /1024, /2048).
 * Example: { t0: '@FC8 C6:2 G6:4', n: '@C84 w1:3' }.
 */

export const PSG_CLOCK = 3579545; // NTSC master clock / 1
export const FRAME_S = 1 / 60;

export type ToneChannel = 't0' | 't1' | 't2';
export type Channel = ToneChannel | 'n';
export const CHANNELS: readonly Channel[] = ['t0', 't1', 't2', 'n'];

export type NoiseMode = 'white' | 'periodic';

export interface Segment {
  startFrame: number;
  frames: number;
  /** null = rest */
  sound:
    | { kind: 'tone'; from: number; to: number }
    | { kind: 'noise'; mode: NoiseMode; rate: 0 | 1 | 2 }
    | null;
  /** 4-bit volume per frame of this segment (length = frames). */
  volumes: number[];
}

const NOTE_OFFSETS: Readonly<Record<string, number>> = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };

/** Equal-tempered frequency of a note name like "A4", "C#5", "Bb3". Throws on bad input. */
export function noteHz(name: string): number {
  const m = /^([A-G])([#b]?)([0-8])$/.exec(name);
  if (!m) throw new Error(`noteHz: bad note "${name}"`);
  const base = NOTE_OFFSETS[m[1] as string] as number;
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  const octave = Number(m[3]);
  const semis = base + acc + (octave - 4) * 12;
  return 440 * 2 ** (semis / 12);
}

/** Quantise a frequency to what the SN76489's 10-bit tone register can produce. */
export function psgQuantize(hz: number): number {
  const n = Math.min(1023, Math.max(1, Math.round(PSG_CLOCK / (32 * hz))));
  return PSG_CLOCK / (32 * n);
}

/** 4-bit volume -> linear gain: 2 dB per step like the chip's attenuator; 0 = silent. */
export function volumeGain(v: number): number {
  if (!Number.isInteger(v) || v < 0 || v > 15) throw new Error(`volumeGain: bad volume ${v}`);
  return v === 0 ? 0 : 10 ** (-(15 - v) / 10);
}

/** Noise shift-register rate (Hz) for rate 0..2. */
export function noiseShiftHz(rate: 0 | 1 | 2): number {
  return PSG_CLOCK / (16 * 32 * 2 ** rate);
}

function parseEnvelope(tok: string): number[] {
  const digits = tok.slice(1);
  if (!/^[0-9A-Fa-f]+$/.test(digits)) throw new Error(`psg: bad envelope "${tok}"`);
  return [...digits].map((d) => parseInt(d, 16));
}

/** Parse + compile one track into time-positioned segments. */
export function compileTrack(src: string, channel: Channel): Segment[] {
  const out: Segment[] = [];
  let env = [15];
  let frame = 0;
  for (const tok of src.trim().split(/\s+/)) {
    if (tok === '') continue;
    if (tok.startsWith('@')) { env = parseEnvelope(tok); continue; }
    const m = /^([^:]+):(\d+)$/.exec(tok);
    if (!m) throw new Error(`psg ${channel}: bad token "${tok}" in "${src}"`);
    const what = m[1] as string;
    const frames = Number(m[2]);
    if (frames <= 0) throw new Error(`psg ${channel}: zero-length "${tok}"`);
    const volumes = Array.from({ length: frames }, (_, i) => env[Math.min(i, env.length - 1)] as number);
    let sound: Segment['sound'];
    if (what === 'r') {
      sound = null;
    } else if (channel === 'n') {
      const nm = /^([wp])([0-2])$/.exec(what);
      if (!nm) throw new Error(`psg noise: bad noise token "${tok}" (want w0..w2 / p0..p2)`);
      sound = { kind: 'noise', mode: nm[1] === 'w' ? 'white' : 'periodic', rate: Number(nm[2]) as 0 | 1 | 2 };
    } else {
      const [a, b, extra] = what.split('~');
      if (a === undefined || extra !== undefined) throw new Error(`psg ${channel}: bad note "${tok}"`);
      const from = psgQuantize(noteHz(a));
      const to = b === undefined ? from : psgQuantize(noteHz(b));
      sound = { kind: 'tone', from, to };
    }
    out.push({ startFrame: frame, frames, sound, volumes });
    frame += frames;
  }
  return out;
}

export type SfxName = 'confirm' | 'cancel' | 'move' | 'hit' | 'block' | 'draw' | 'hurt' | 'win' | 'lose';
export type SfxDef = Partial<Record<Channel, string>>;

export const SFX: Readonly<Record<SfxName, SfxDef>> = {
  move: { t0: '@B84 A5:3' },
  confirm: { t0: '@FC8 C6:2 G6:5', t1: '@9 r:2 E6:5' },
  cancel: { t0: '@FC96 G5~C5:7' },
  hit: { n: '@FDB97531 w1:8', t0: '@FA6 A3~A2:5' },
  block: { n: '@CA8 p0:4', t0: '@FB74 C5:2 C4:4' },
  draw: { n: '@8530 w0:4', t0: '@A6 E6:1 B6:2' },
  hurt: { t0: '@FFDB9 E3~A2:12', n: '@DB97 w2:10' },
  win: {
    t0: '@D C5:6 E5:6 G5:6 @DDCCBBAA99887766 C6:20',
    t1: '@9 E4:6 G4:6 B4:6 @99887766554433 E5:20',
    t2: '@A C3:18 @AA998877665544 C3:20',
  },
  lose: {
    t0: '@C C5:10 B4:10 Bb4:10 @CCBBAA9988776655443322 A4~F4:36',
    t2: '@A A2:30 @AA9988776655443322 F2:36',
  },
};

export const SFX_NAMES: readonly SfxName[] = Object.keys(SFX) as SfxName[];

/** Compile a whole SFX (all channels). */
export function compileSfx(def: SfxDef): Partial<Record<Channel, Segment[]>> {
  const out: Partial<Record<Channel, Segment[]>> = {};
  for (const ch of CHANNELS) {
    const src = def[ch];
    if (src !== undefined) out[ch] = compileTrack(src, ch);
  }
  return out;
}

/** Total length of an SFX in frames. */
export function sfxFrames(def: SfxDef): number {
  let n = 0;
  for (const segs of Object.values(compileSfx(def))) {
    const last = segs[segs.length - 1];
    if (last) n = Math.max(n, last.startFrame + last.frames);
  }
  return n;
}

/** 16-bit LFSR noise, Sega taps (bits 0 and 3 for white; bit 0 only for periodic). One bit per shift. */
export function lfsrBits(count: number, mode: NoiseMode): Uint8Array {
  const out = new Uint8Array(count);
  let lfsr = 0x8000;
  for (let i = 0; i < count; i++) {
    out[i] = lfsr & 1;
    const fb = mode === 'white' ? (lfsr ^ (lfsr >> 3)) & 1 : lfsr & 1;
    lfsr = (lfsr >> 1) | (fb << 15);
  }
  return out;
}
