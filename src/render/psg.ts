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
  /**
   * The note continues in the next segment (a held note split at a bar line by the music
   * scheduler): no re-articulation gap at its end. Absent = a normal note end.
   */
  tie?: boolean;
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

export type SfxDef = Partial<Record<Channel, string>>;

/**
 * The SFX table. Each entry is a few frames of PSG writes; the channel use matters (a new SFX on
 * a channel cuts what was there, unless that was higher priority: see SFX_PRIORITY).
 * Pitchable ones (onslaught, resolve, draw, rot) are played transposed by audio.ts.
 */
export const SFX = {
  // ---- UI
  move: { t0: '@B84 A5:3' },
  confirm: { t0: '@FC8 C6:2 G6:5', t1: '@9 r:2 E6:5' },
  cancel: { t0: '@FC96 G5~C5:7' },
  // ---- hits (light / medium / heavy / overkill) and defence
  hitLight: { n: '@EB963 w1:5', t0: '@D96 E4~B3:4' },
  hit: { n: '@FDB97531 w1:8', t0: '@FA6 A3~A2:5' },
  hitHeavy: { n: '@FFED p1:3 @EDCBA987654 w2:11', t0: '@FFDB97 C3~A2:10', t1: '@C96 G3~C3:6' },
  overkill: { n: '@FFFEEDDCCBBAA99887766 w2:20', t0: '@F A5:2 @FEDCBA98765 A6~A3:14', t1: '@D r:2 C3~A2:14' },
  block: { n: '@CA8 p0:4', t0: '@FB74 C5:2 C4:4' },
  blockBreak: { n: '@FDB975 w0:7', t0: '@EC97 C7~C5:6', t1: '@A86 r:1 G6~G4:5' },
  blockLost: { t0: '@964 E5~B4:4' },
  guard: { n: '@C96 p0:3', t0: '@FB8 F4:2 C4:5', t1: '@9 r:2 A4:5' },
  guardDecay: { t0: '@B975 A4~E4:6' },
  hurt: { t0: '@FFDB9 E3~A2:12', n: '@DB97 w2:10' },
  hurtLight: { t0: '@DB97 C4~G3:6', n: '@B97 w1:5' },
  // ---- card motion
  draw: { n: '@8530 w0:4', t0: '@A6 E6:1 B6:2' },
  discard: { n: '@7530 w0:5', t0: '@853 B5~E5:4' },
  scrap: { n: '@DB975310 p1:8', t0: '@C962 C3~A2:6' },
  snip: { n: '@F w0:1 r:2 @E8 w0:2', t0: '@B6 E7:1 r:2 @A5 G7:2' },
  shuffle: {
    n: '@A w0:1 r:1 @9 w0:1 r:1 @A w0:1 r:1 @9 w0:1 r:1 @B w0:1 r:1 @A8 w0:2',
    t0: '@6 C6:1 r:1 D6:1 r:1 E6:1 r:1 F6:1 r:1 G6:1 r:1 @64 C7:2',
  },
  playAttack: { n: '@68ACA864 w0:8', t0: '@8A86 C4~C6:6' },
  playSkill: { t0: '@A86 E5:2 B5:2 E6:3', t1: '@64 r:1 G#5:2 E6:3' },
  playPower: { t0: '@C A4:3 C#5:3 E5:3 @CBA9876 A5:10', t1: '@8 r:3 E4:3 A4:3 @8765 C#5:10' },
  cardAdd: { t0: '@A E6:2 A6:4' },
  upgrade: { t0: '@C C5:2 G5:2 C6:2 @CBA9 E6:6' },
  energy: { t0: '@C A5:2 E6:2 A6:3' },
  // ---- class signatures
  onslaught: { n: '@A6 w0:2', t0: '@E C5:2 @DCA G5:4' },
  parry: { t0: '@FFEDCBA98765 B6:12', t1: '@FEDCBA98765 C7:11', t2: '@D A5~A4:8', n: '@FC96 w0:5' },
  prime: { n: '@8 w0:2', t0: '@D C6:2 G6:2 @DCBA C7:6' },
  fizzle: { n: '@9876543 w1:7', t0: '@964 C5~F4:7' },
  bloom: { t0: '@D C6:2 E6:2 G6:2 @DCBA98765 C7:9', t1: '@8 r:2 G5:2 C6:2 @87654 E6:9' },
  rot: { n: '@ACA86 p2:6', t0: '@CA864 D3~A2:8' },
  rotSpread: { n: '@9A9A87 p2:6', t0: '@A8 F3~C4:3 @A86 C4~F3:5' },
  delay: {
    t0: '@C A5:2 r:3 @A E5:2 r:3 @C A5:2 r:3 @D E6~A6:5',
    n: '@A w0:1 r:4 @8 w0:1 r:4 @A w0:1 r:4 @C8 w0:2',
  },
  tick: { t0: '@B A6:1 r:1 @6 A6:1', n: '@9 w0:1' },
  resolve: { t0: '@E E6:2 B6:2 @EDCBA9 E7:8', t1: '@9 r:2 G#6:2 @98765 B6:8', n: '@C964 w0:4' },
  // ---- statuses, healing, items
  heal: { t0: '@B C5:3 E5:3 G5:3 @BA987 C6:8', t1: '@7 r:3 G4:3 C5:3 @7654 E5:8' },
  buff: { t0: '@C C5~C6:6 @A8 C6:3' },
  debuff: { t0: '@C C5~C4:8', n: '@8642 w1:4' },
  relic: { t0: '@C E6:2 A6:3', n: '@6 w0:1' },
  potion: { t0: '@B C4~G4:3 r:1 @B D4~A4:3 r:1 @A E4~B4:4' },
  gold: { t0: '@D B5:2 @DCBA E6:6' },
  purchase: { t0: '@E C6:3 E6:3 G6:3 @EDCBA9 C7:10', t1: '@A r:3 G5:3 C6:3 @A987 E6:10', n: '@A6 w0:2' },
  step: { n: '@B85 p1:3', t0: '@7 C3:2' },
  // ---- reward reveals by rarity
  common: { t0: '@A G5:2 C6:4' },
  uncommon: { t0: '@C C6:2 E6:2 @CBA987 G6:8', t1: '@7 r:2 G5:2 @7654 C6:8' },
  rare: {
    t0: '@C E6:2 G#6:2 B6:2 E7:2 @CBA98765 G#7:12', t1: '@8 r:1 B5:2 E6:2 G#6:2 @876 B6:12', n: '@6543 w0:6',
  },
  // ---- v2 mechanics
  /** Shed: armour plates clank off. */
  shed: { n: '@FC96 p0:3 r:3 @DA7 p0:3 r:2 @B85 p0:3', t0: '@EB8 G4:2 D4:4 r:2 @C96 F4:2 C4:4' },
  /** Embers convert to Onslaught: a coal crackle. */
  crackle: { n: '@C0C09 w0:2 r:1 @A07 w0:2 r:2 @C0 w0:1 r:1 @B86 w0:3', t0: '@A8 C5~G5:4' },
  /** Strain: a heavy heartbeat thump. */
  thump: { n: '@FEC9 p2:5 r:4 @C96 p2:4', t0: '@FDA7 A2:5 r:4 @C96 A2:4' },
  /** Salvage: scrap sparks and a pick-up chime. */
  salvage: { n: '@DB97 p1:5', t0: '@C r:3 E6:2 @CBA9 B6:6' },
  /** Reprise: the play sound's ghost, up a fifth. */
  reprise: { t0: '@9 r:2 @8765 G5:3 D6:3 G6:5', t1: '@5 r:4 @54 G5:3 D6:3 G6:4' },
  /** A token puff (Chaff added). */
  puff: { n: '@9A8642 w1:6', t0: '@6 C6~G5:3' },
  /** Gather: Timeline chips slide together and lock. */
  gather: { n: '@4689A w0:5 @E p0:2', t0: '@8 E5~A5:5 @D A5:3' },
  /** Total Eclipse: a dark doubled bell. */
  eclipse: { t0: '@E E4:3 @EDCBA9876 E5:12', t1: '@B r:2 B3:3 @BA98765 B4:12', t2: '@C E3:15', n: '@A8 p2:4' },
  /** Goad applied: a sharp taunt. */
  taunt: { t0: '@F E5:2 r:1 E5:2 @FDB9 A5~E5:6', n: '@C8 w1:3' },
  /** A Bloom card ripens: a golden bell. */
  ripe: { t0: '@E G5:3 B5:3 D6:3 @EDCBA98765 G6:14', t1: '@9 r:3 D5:3 G5:3 @98765432 B5:14', n: '@85 w0:2' },
  /** Harvest: Rot is ripped out of the enemy. */
  harvest: { n: '@FDDBB97 p2:7', t0: '@F A3~A4:4 @EC A4~C3:8' },
  /** The next-turn bank pays out. */
  bank: { t0: '@C E5:2 A5:2 @CBA E6:5', n: '@6 w0:2' },
  // ---- enemies
  enemyAttack: { n: '@46ACA w1:5', t0: '@89A G3~D4:5' },
  enemyBuff: { t0: '@A G4:2 C5:2 G5:4' },
  cancelled: { t0: '@D G5~C4:10', n: '@A8 w1:4' },
  spawn: { t0: '@A C4~C5:6', n: '@6 w0:3' },
  flee: { t0: '@C C5~C7:10', n: '@8642 w0:5' },
  death: {
    t0: '@F C5:2 A4:2 F4:2 D4:2 @FEDCBA987654321 C4~C3:16',
    t1: '@B r:1 A4:2 F4:2 D4:2 B3:2',
    n: '@FEDCBA9876543210 w1:16',
  },
  bossDeath: {
    t0: '@F E5:3 C5:3 A4:3 E4:3 @F E5:3 C5:3 A4:3 E4:3 @FFEEDDCCBBAA99887766554433221 C4~A2:30',
    t1: '@C r:1 C5:3 A4:3 E4:3 C4:3 C5:3 A4:3 E4:3 C4:2',
    n: '@FFFFEEEEDDDDCCCCBBBBAAAA9999888877776666 w2:40',
  },
  phase: { t0: '@F E4:4 @FEDCBA98 F4:14', t1: '@E Bb3:4 @EDCBA98 B3:14', t2: '@F A2:18', n: '@FDB97 p2:8' },
  bossIntro: {
    t0: '@F A4:4 r:2 A4:4 r:2 @FEDCBA9 C5:6 B4:6 @FFEEDDCCBBAA99887766 A4:30',
    t1: '@C E4:6 r:6 @C F4:12 @CCBBAA9988776655 E4:30',
    t2: '@F A2:24 @FFEEDDCCBBAA99887766 A2:30',
    n: '@FDB9 p2:6 r:6 @FDB9 p2:6 r:36',
  },
  eliteIntro: { t0: '@E E5:3 r:1 E5:3 @EDCBA987 G5:12', t2: '@D E3:7 @DCBA98 E3:12', n: '@DB9 p2:4 r:3 @DB9 p2:4' },
  // ---- turns and fanfares
  turnPlayer: { t0: '@D C5:3 G5:6', t1: '@8 E4:3 E5:6' },
  turnEnemy: { t0: '@D E4:3 B3:6', t1: '@9 G3:3 E3:6' },
  win: {
    t0: '@D C5:6 E5:6 G5:6 @DDCCBBAA99887766 C6:20',
    t1: '@9 E4:6 G4:6 B4:6 @99887766554433 E5:20',
    t2: '@A C3:18 @AA998877665544 C3:20',
  },
  fanfareElite: {
    t0: '@E G4:5 C5:5 E5:5 G5:5 @E E5:4 G5:4 @EEDDCCBBAA99887766 C6:28',
    t1: '@A E4:5 G4:5 C5:5 E5:5 @A C5:4 E5:4 @AA998877665544 G5:28',
    t2: '@B C3:10 G3:10 C3:8 @BBAA99887766 C3:28',
    n: '@C96 w0:3 r:7 @C96 w0:3 r:7 @C96 w0:3 r:5 @EDCBA98765 w1:10',
  },
  fanfareBoss: {
    t0: '@E C5:4 C5:4 C5:4 @E G5:12 @E F5:4 E5:4 D5:4 @E C6:12 @E B5:4 A5:4 B5:4 @EEDDCCBBAA9988776655 C6:36',
    t1: '@A E4:12 @A E5:12 @A A4:12 @A G5:12 @A G4:12 @AA99887766554433 E5:36',
    t2: '@C C3:12 C3:12 F3:12 E3:12 G3:12 @CCBBAA99887766 C3:36',
    n: '@D9 w0:4 r:8 @D9 w0:4 r:8 @D9 w0:4 r:8 @D9 w0:4 r:8 @D9 w0:4 r:8 @FEDCBA9876543 w1:36',
  },
  lose: {
    t0: '@C C5:10 B4:10 Bb4:10 @CCBBAA9988776655443322 A4~F4:36',
    t2: '@A A2:30 @AA9988776655443322 F3:36', // F2 is below the tone register's floor (~109 Hz)
  },
} as const satisfies Readonly<Record<string, SfxDef>>;

export type SfxName = keyof typeof SFX;

export const SFX_NAMES: readonly SfxName[] = Object.keys(SFX) as SfxName[];

/**
 * Channel priority (SMS sound drivers did this): a new SFX takes a channel only if nothing of
 * HIGHER priority is still sounding on it. Absent = 1. 0 = UI chatter, 3 = big moments.
 */
export const SFX_PRIORITY: Readonly<Partial<Record<SfxName, number>>> = {
  move: 0, draw: 0, discard: 0, tick: 0, gold: 0, step: 0, blockLost: 0,
  hitHeavy: 2, overkill: 3, parry: 3, death: 2, bossDeath: 3, phase: 3, bossIntro: 3, eliteIntro: 3,
  eclipse: 2, ripe: 2, thump: 2, harvest: 2,
  win: 3, fanfareElite: 3, fanfareBoss: 3, lose: 3, hurt: 2, blockBreak: 2, rare: 2,
};

export function sfxPriority(name: SfxName): number { return SFX_PRIORITY[name] ?? 1; }

/**
 * Transpose compiled segments by `semis` semitones (tone channels only; noise is unchanged),
 * re-quantised to the tone register. Pure: returns new segments.
 */
export function transposeSegments(segs: readonly Segment[], semis: number): Segment[] {
  if (semis === 0) return segs.map((s) => ({ ...s }));
  const k = 2 ** (semis / 12);
  return segs.map((s) => (s.sound?.kind === 'tone'
    ? { ...s, sound: { kind: 'tone', from: psgQuantize(s.sound.from * k), to: psgQuantize(s.sound.to * k) } }
    : { ...s }));
}

/** Attenuate a segment list by `steps` volume steps (2 dB each); a sounding frame never drops below 1. */
export function attenuateSegments(segs: readonly Segment[], steps: number): Segment[] {
  if (!Number.isInteger(steps) || steps < 0) throw new Error(`attenuateSegments: bad steps ${steps}`);
  return segs.map((s) => ({ ...s, volumes: s.volumes.map((v) => (v === 0 ? 0 : Math.max(1, v - steps))) }));
}

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
