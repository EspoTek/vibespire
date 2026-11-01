/**
 * Web Audio PSG, SN76489-style: 3 persistent square-wave tone channels + 1 noise channel (16-bit
 * LFSR, white or periodic), 4-bit volume in 2 dB steps, all stepped per 60 Hz frame. SFX are
 * written in the envelope language in psg.ts. Like the real chip, a channel plays one thing: a new
 * SFX on a channel cuts off what was there, unless what is there is of higher priority and still
 * sounding (SFX_PRIORITY: big hits are not cut by a card-draw tick). No audio assets.
 *
 * Browsers start an AudioContext suspended until a user activation (keydown/pointerdown).
 * `unlock()` must run inside such a handler (the gate screen does it). Before that, `play()` is a
 * documented no-op: gamepad-only players get silence until they press a key or click once.
 *
 * Every play is recorded in `SFX_LOG` (name, audio time, wall time, frame) so automated checks can
 * line sounds up against animation frames (fx/cue.ts records the visual side).
 */
import { compileSongBars, STEPS_PER_BAR, STEPS_PER_BEAT, type Chord, type SongBars, type SongName } from './music.ts';
import {
  CHANNELS, compileSfx, FRAME_S, lfsrBits, noiseShiftHz, SFX, sfxPriority, transposeSegments, volumeGain,
  type Channel, type Segment, type SfxDef, type SfxName,
} from './psg.ts';

interface ToneVoice { osc: OscillatorNode; gain: GainNode }
interface NoiseVoice { white: AudioBufferSourceNode; periodic: AudioBufferSourceNode; whiteGain: GainNode; periodicGain: GainNode }
type Compiled = Partial<Record<Channel, Segment[]>>;

/** One line per SFX play (ring buffer), for automated timing checks. */
export interface SfxLogEntry { name: string; audioAt: number; wallMs: number; frame: number }
export const SFX_LOG: SfxLogEntry[] = [];
const LOG_MAX = 400;
/** The renderer's frame counter, set by the app loop (so logs can name the frame a sound fired on). */
export const audioClock = { frame: 0 };

function logSfx(name: string, audioAt: number): void {
  SFX_LOG.push({ name, audioAt, wallMs: performance.now(), frame: audioClock.frame });
  if (SFX_LOG.length > LOG_MAX) SFX_LOG.splice(0, SFX_LOG.length - LOG_MAX);
}

const compiled = new Map<string, Compiled>();
function compiledSfx(key: string, def: SfxDef, semis: number): Compiled {
  let c = compiled.get(key);
  if (!c) {
    const base = compileSfx(def);
    c = {};
    for (const ch of CHANNELS) { const segs = base[ch]; if (segs) c[ch] = ch === 'n' ? segs : transposeSegments(segs, semis); }
    compiled.set(key, c);
  }
  return c;
}

function buildVoices(ac: AudioContext, master: GainNode): { tones: Record<'t0' | 't1' | 't2', ToneVoice>; noise: NoiseVoice } {
  const tone = (): ToneVoice => {
    const osc = ac.createOscillator();
    osc.type = 'square'; // SN76489 tone channels are fixed 50% duty
    const gain = ac.createGain();
    gain.gain.value = 0;
    osc.connect(gain).connect(master);
    osc.start();
    return { osc, gain };
  };
  // Noise buffers: one LFSR bit per shift at rate 0; rates 1/2 play them slower.
  const shiftHz = noiseShiftHz(0);
  const makeNoise = (mode: 'white' | 'periodic'): [AudioBufferSourceNode, GainNode] => {
    const seconds = 2;
    const buf = ac.createBuffer(1, Math.round(ac.sampleRate * seconds), ac.sampleRate);
    const d = buf.getChannelData(0);
    const bits = lfsrBits(Math.ceil(shiftHz * seconds) + 1, mode);
    for (let i = 0; i < d.length; i++) d[i] = bits[Math.floor((i * shiftHz) / ac.sampleRate)] ? 1 : -1;
    const src = ac.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const gain = ac.createGain();
    gain.gain.value = 0;
    src.connect(gain).connect(master);
    src.start();
    return [src, gain];
  };
  const [white, whiteGain] = makeNoise('white');
  const [periodic, periodicGain] = makeNoise('periodic');
  return { tones: { t0: tone(), t1: tone(), t2: tone() }, noise: { white, periodic, whiteGain, periodicGain } };
}

export interface PlayOpts {
  /** Transpose tone channels by this many semitones (Onslaught climbs, cascades). Default 0. */
  semis?: number;
  /** AudioContext time to start at (beat-quantised stingers). Default: now. Past times play now. */
  at?: number;
  /** Override the table priority. */
  priority?: number;
}

export class Sfx {
  private ac: AudioContext | null = null;
  private master: GainNode | null = null;
  private tones: Record<'t0' | 't1' | 't2', ToneVoice> | null = null;
  private noise: NoiseVoice | null = null;
  private _volume: number;
  /** Per channel: until when (audio time) the last SFX sounds, and its priority. */
  private readonly busy: Record<Channel, { until: number; prio: number }> = {
    t0: { until: 0, prio: 0 }, t1: { until: 0, prio: 0 }, t2: { until: 0, prio: 0 }, n: { until: 0, prio: 0 },
  };
  /** Mute everything (e2e runs at superhuman speed). Plays are still logged. */
  muted = false;
  /** Per-channel gain scale so three squares at full volume don't clip. */
  private static readonly CHANNEL_GAIN = 0.22;

  constructor(volume: number) {
    this._volume = volume;
  }

  get unlocked(): boolean { return this.ac !== null && this.ac.state === 'running'; }

  /** The running AudioContext, or null before the first user gesture (Music shares it). */
  get contextOrNull(): AudioContext | null { return this.unlocked ? this.ac : null; }

  /** Current audio time, or null while locked. */
  nowOrNull(): number | null { return this.unlocked ? (this.ac as AudioContext).currentTime : null; }

  /**
   * Seconds between scheduling a sound and hearing it (base + output latency). Visuals that must
   * land WITH a scheduled sound wait this much longer. Safari has no outputLatency: base only.
   */
  latencyS(): number {
    const ac = this.ac;
    if (!ac) return 0;
    const out = typeof ac.outputLatency === 'number' ? ac.outputLatency : 0; // absent in Safari (documented gap)
    return ac.baseLatency + out;
  }

  get volume(): number { return this._volume; }
  set volume(v: number) {
    if (!(v >= 0 && v <= 1)) throw new Error(`Sfx.volume must be in 0..1, got ${v}`);
    this._volume = v;
    if (this.master && this.ac) this.master.gain.setValueAtTime(v, this.ac.currentTime);
  }

  /** Create/resume the AudioContext. Call from inside a keydown/pointerdown handler. */
  unlock(): void {
    if (!this.ac) this.build();
    const ac = this.ac as AudioContext;
    if (ac.state === 'suspended') {
      ac.resume().catch((e: unknown) => { console.error('[audio] AudioContext.resume() failed', e); });
    }
  }

  private build(): void {
    const ac = new AudioContext();
    const master = ac.createGain();
    master.gain.value = this._volume;
    master.connect(ac.destination);
    const v = buildVoices(ac, master);
    this.ac = ac;
    this.master = master;
    this.tones = v.tones;
    this.noise = v.noise;
  }

  /** Play a named SFX. No-op until unlocked (see header). Unknown names are a type error. */
  play(name: SfxName, opts: PlayOpts = {}): void {
    const semis = opts.semis ?? 0;
    this.playCompiled(name, compiledSfx(`${name}@${semis}`, SFX[name], semis), opts.priority ?? sfxPriority(name), opts.at);
  }

  /** Play an SFX built at runtime (in-key stingers). `key` names it in the log and the compile cache. */
  playDef(key: string, def: SfxDef, opts: PlayOpts = {}): void {
    const semis = opts.semis ?? 0;
    this.playCompiled(key, compiledSfx(`def:${key}:${JSON.stringify(def)}@${semis}`, def, semis), opts.priority ?? 2, opts.at);
  }

  private playCompiled(name: string, sfx: Compiled, prio: number, at: number | undefined): void {
    if (!this.unlocked) return; // documented: silence before the first user gesture
    const ac = this.ac as AudioContext;
    const t0 = Math.max(ac.currentTime + 0.005, at ?? 0);
    logSfx(name, t0);
    if (this.muted) return;
    for (const ch of CHANNELS) {
      const segs = sfx[ch];
      if (!segs) continue;
      const last = segs[segs.length - 1];
      if (!last) continue;
      const b = this.busy[ch];
      if (b.until > t0 && b.prio > prio) continue; // a bigger sound still owns this channel
      b.until = t0 + (last.startFrame + last.frames) * FRAME_S;
      b.prio = prio;
      this.schedule(ch, segs, t0);
    }
  }

  private schedule(ch: Channel, segs: readonly Segment[], t0: number): void {
    const g = Sfx.CHANNEL_GAIN;
    const end = (s: Segment) => t0 + (s.startFrame + s.frames) * FRAME_S;
    const last = segs[segs.length - 1];
    if (!last) return;
    if (ch === 'n') {
      const nv = this.noise as NoiseVoice;
      for (const gn of [nv.whiteGain, nv.periodicGain]) { gn.gain.cancelScheduledValues(t0); gn.gain.setValueAtTime(0, t0); }
      for (const s of segs) {
        const st = t0 + s.startFrame * FRAME_S;
        if (!s.sound || s.sound.kind !== 'noise') continue; // rests stay silent
        const node = s.sound.mode === 'white' ? nv.white : nv.periodic;
        const gn = s.sound.mode === 'white' ? nv.whiteGain : nv.periodicGain;
        node.playbackRate.setValueAtTime(1 / 2 ** s.sound.rate, st);
        s.volumes.forEach((v, i) => gn.gain.setValueAtTime(volumeGain(v) * g, st + i * FRAME_S));
        gn.gain.setValueAtTime(0, end(s));
      }
      return;
    }
    const tv = (this.tones as Record<'t0' | 't1' | 't2', ToneVoice>)[ch];
    tv.gain.gain.cancelScheduledValues(t0);
    tv.osc.frequency.cancelScheduledValues(t0);
    tv.gain.gain.setValueAtTime(0, t0);
    for (const s of segs) {
      const st = t0 + s.startFrame * FRAME_S;
      if (!s.sound) { tv.gain.gain.setValueAtTime(0, st); continue; }
      if (s.sound.kind !== 'tone') throw new Error(`audio: noise segment on tone channel ${ch}`);
      tv.osc.frequency.setValueAtTime(s.sound.from, st);
      if (s.sound.to !== s.sound.from) tv.osc.frequency.linearRampToValueAtTime(s.sound.to, end(s));
      s.volumes.forEach((v, i) => tv.gain.gain.setValueAtTime(volumeGain(v) * g, st + i * FRAME_S));
    }
    tv.gain.gain.setValueAtTime(0, end(last));
  }
}

/** Music layers the combat screen drives (applied from the next bar line). */
export interface MusicLayers {
  /** Enemies threaten (near-)lethal damage: driving drums, arpeggio an octave up. */
  intense: boolean;
  /** Low HP: heartbeat drums, melody drops back. */
  danger: boolean;
}

/** A bar already handed to Web Audio. */
interface ScheduledBar { song: SongName; bar: number; at: number; barS: number; stepS: number; chord: Chord }

/** The beat grid of the song that is playing, in AudioContext time. */
export interface BeatClock {
  now: number;
  stepS: number;
  beatS: number;
  barS: number;
  /** A bar line of the playing song (all its bars are origin + k * barS). */
  origin: number;
}

/**
 * Music: the title / act / boss loops (music.ts) on their own 3 squares + noise, under their own
 * volume (Options), sharing the SFX AudioContext. Scheduled one BAR at a time, ~0.35 s ahead, by
 * `update()` (call per frame), which is what lets it react:
 *  - song changes land on the next bar line (from silence they start at once),
 *  - `setLayers` (intense / danger) switch in on the next bar line,
 *  - `beatClock()` / `nextBeatAt()` let stingers and visuals snap to the beat,
 *  - `cutFor()` drops out for a fanfare and restarts the song from the top afterwards.
 * Silent until the SFX context is unlocked; the wanted song starts then.
 */
export class Music {
  private readonly sfx: Sfx;
  private voices: { master: GainNode; tones: Record<'t0' | 't1' | 't2', ToneVoice>; noise: NoiseVoice } | null = null;
  private _volume: number;
  private wanted: SongName | null = null;
  private playing: { song: SongBars; nextBar: number; nextBarAt: number; origin: number } | null = null;
  private layers: MusicLayers = { intense: false, danger: false };
  private recent: ScheduledBar[] = [];
  /** cutFor(): silent until this audio time, then the wanted song restarts from bar 0. */
  private restartAt: number | null = null;
  private static readonly CHANNEL_GAIN = 0.16;
  private static readonly AHEAD_S = 0.35;

  constructor(sfx: Sfx, volume: number) {
    this.sfx = sfx;
    this._volume = volume;
  }

  get volume(): number { return this._volume; }
  set volume(v: number) {
    if (!(v >= 0 && v <= 1)) throw new Error(`Music.volume must be in 0..1, got ${v}`);
    this._volume = v;
    this.applyGain();
  }

  private applyGain(): void {
    const ac = this.sfx.contextOrNull;
    if (this.voices && ac) this.voices.master.gain.setValueAtTime(this.sfx.muted ? 0 : this._volume, ac.currentTime);
  }

  get current(): SongName | null { return this.playing?.song.name ?? null; }
  get currentLayers(): Readonly<MusicLayers> { return this.layers; }

  /** Ask for a song (null = silence). A change lands on the next bar line; the same song keeps playing. */
  want(name: SongName | null): void { this.wanted = name; }

  /** Set the reactive layers; they take effect from the next bar not yet scheduled. */
  setLayers(l: MusicLayers): void { this.layers = { ...l }; }

  /** The beat grid of the playing song, or null (locked, silent, or between songs). */
  beatClock(): BeatClock | null {
    const ac = this.sfx.contextOrNull;
    const p = this.playing;
    if (!ac || !p || this.restartAt !== null) return null;
    const stepS = p.song.stepFrames * FRAME_S;
    return { now: ac.currentTime, stepS, beatS: stepS * STEPS_PER_BEAT, barS: stepS * STEPS_PER_BAR, origin: p.origin };
  }

  /** The first beat at least `minLeadS` from now (null when there is no beat to snap to). */
  nextBeatAt(minLeadS = 0): number | null {
    const c = this.beatClock();
    if (!c) return null;
    const k = Math.ceil((c.now + minLeadS - c.origin) / c.beatS - 1e-6);
    return c.origin + k * c.beatS;
  }

  /** Index of the beat (0-based, from the song's origin) at audio time `t`. */
  beatIndexAt(t: number): number | null {
    const c = this.beatClock();
    return c ? Math.floor((t - c.origin) / c.beatS + 1e-6) : null;
  }

  /** The chord sounding at audio time `t` (falls back to the playing song's next bar). */
  chordAt(t: number): Chord | null {
    for (let i = this.recent.length - 1; i >= 0; i--) {
      const b = this.recent[i] as ScheduledBar;
      if (t >= b.at - 1e-6 && t < b.at + b.barS) return b.chord;
    }
    const p = this.playing;
    return p ? (p.song.chords[p.nextBar % p.song.bars] as Chord) : null;
  }

  /** Step length of the playing song in frames (stingers ride its sixteenth grid). */
  stepFramesOrNull(): number | null { return this.playing?.song.stepFrames ?? null; }

  /**
   * Drop out from audio time `at` for `seconds` (a fanfare plays over the gap), then restart the
   * wanted song from its first bar.
   */
  cutFor(at: number, seconds: number): void {
    const ac = this.sfx.contextOrNull;
    if (!ac || !this.voices) return;
    const t = Math.max(at, ac.currentTime);
    this.silence(t);
    this.recent = this.recent.filter((b) => b.at < t);
    this.restartAt = t + seconds;
    this.playing = null;
  }

  update(): void {
    const ac = this.sfx.contextOrNull;
    if (!ac) return; // documented: silent until the first user gesture unlocks audio
    if (!this.voices) { this.voices = this.build(ac); this.applyGain(); }
    this.applyMute();
    const now = ac.currentTime;
    if (this.restartAt !== null) {
      if (now < this.restartAt - Music.AHEAD_S) return;
      const at = this.restartAt;
      this.restartAt = null;
      if (this.wanted !== null) this.start(this.wanted, Math.max(at, now + 0.02));
      return;
    }
    const p = this.playing;
    if (!p) {
      if (this.wanted !== null) this.start(this.wanted, now + 0.05);
      return;
    }
    if (this.wanted === null) { this.silence(now); this.playing = null; this.recent = []; return; }
    // the tab slept: skip whole bars we missed instead of cramming them in
    if (p.nextBarAt < now) {
      const barS = p.song.barFrames * FRAME_S;
      const missed = Math.ceil((now - p.nextBarAt) / barS);
      p.nextBar += missed;
      p.nextBarAt += missed * barS;
    }
    while (p.nextBarAt < now + Music.AHEAD_S) {
      if (this.wanted !== p.song.name) { this.start(this.wanted, p.nextBarAt); return; } // song change on the bar line
      this.scheduleBar(p.song, p.nextBar % p.song.bars, p.nextBarAt);
      p.nextBar += 1;
      p.nextBarAt += p.song.barFrames * FRAME_S;
    }
  }

  private mutedApplied = false;
  private applyMute(): void {
    if (this.sfx.muted !== this.mutedApplied) { this.mutedApplied = this.sfx.muted; this.applyGain(); }
  }

  private start(name: SongName, at: number): void {
    const song = compileSongBars(name);
    this.silence(at);
    this.playing = { song, nextBar: 0, nextBarAt: at, origin: at };
    this.recent = this.recent.filter((b) => b.at < at);
  }

  private scheduleBar(song: SongBars, bar: number, at: number): void {
    const L = this.layers;
    const pick = <T>(arr: readonly T[], i: number): T => { const v = arr[i]; if (v === undefined) throw new Error(`music ${song.name}: no bar ${i}`); return v; };
    this.schedule('t0', L.danger ? pick(song.dangerT0, bar) : pick(song.base.t0, bar), at);
    this.schedule('t1', L.intense ? pick(song.intenseT1, bar) : pick(song.base.t1, bar), at);
    this.schedule('t2', pick(song.base.t2, bar), at);
    this.schedule('n', L.danger ? song.dangerN : L.intense ? song.intenseN : pick(song.base.n, bar), at);
    const stepS = song.stepFrames * FRAME_S;
    this.recent.push({ song: song.name, bar, at, barS: song.barFrames * FRAME_S, stepS, chord: pick(song.chords, bar) });
    if (this.recent.length > 8) this.recent.shift();
  }

  private build(ac: AudioContext): NonNullable<Music['voices']> {
    const master = ac.createGain();
    master.gain.value = this._volume;
    master.connect(ac.destination);
    return { master, ...buildVoices(ac, master) };
  }

  /** Cut every scheduled value from `t` (song change / stop / fanfare). */
  private silence(t: number): void {
    const v = this.voices;
    if (!v) return;
    for (const g of [v.tones.t0.gain, v.tones.t1.gain, v.tones.t2.gain, v.noise.whiteGain, v.noise.periodicGain]) {
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(0, t);
    }
    for (const tn of [v.tones.t0, v.tones.t1, v.tones.t2]) tn.osc.frequency.cancelScheduledValues(t);
  }

  /** Schedule one bar of one channel starting at t0 (bars are appended back to back). */
  private schedule(ch: Channel, segs: readonly Segment[], t0: number): void {
    const v = this.voices;
    if (!v) throw new Error('Music.schedule before build');
    const g = Music.CHANNEL_GAIN;
    const end = (s: Segment) => t0 + (s.startFrame + s.frames) * FRAME_S;
    if (ch === 'n') {
      for (const s of segs) {
        if (!s.sound || s.sound.kind !== 'noise') continue;
        const st = t0 + s.startFrame * FRAME_S;
        const node = s.sound.mode === 'white' ? v.noise.white : v.noise.periodic;
        const gn = s.sound.mode === 'white' ? v.noise.whiteGain : v.noise.periodicGain;
        node.playbackRate.setValueAtTime(1 / 2 ** s.sound.rate, st);
        s.volumes.forEach((vol, i) => gn.gain.setValueAtTime(volumeGain(vol) * g, st + i * FRAME_S));
        gn.gain.setValueAtTime(0, end(s));
      }
      return;
    }
    const tv = v.tones[ch];
    for (const s of segs) {
      const st = t0 + s.startFrame * FRAME_S;
      if (!s.sound) { tv.gain.gain.setValueAtTime(0, st); continue; }
      if (s.sound.kind !== 'tone') throw new Error(`music: noise segment on tone channel ${ch}`);
      tv.osc.frequency.setValueAtTime(s.sound.from, st);
      s.volumes.forEach((vol, i) => tv.gain.gain.setValueAtTime(volumeGain(vol) * g, st + i * FRAME_S));
      // a 1-frame gap between notes so repeated pitches re-articulate (not inside a tied note)
      if (!s.tie) tv.gain.gain.setValueAtTime(0, end(s) - FRAME_S / 2);
    }
  }
}
