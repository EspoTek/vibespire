/**
 * Web Audio PSG, SN76489-style: 3 persistent square-wave tone channels + 1 noise channel (16-bit
 * LFSR, white or periodic), 4-bit volume in 2 dB steps, all stepped per 60 Hz frame. SFX are
 * written in the envelope language in psg.ts. Like the real chip, a channel plays one thing: a new
 * SFX on a channel cuts off what was there (no pile-up when the cursor moves fast). No audio assets.
 *
 * Browsers start an AudioContext suspended until a user activation (keydown/pointerdown).
 * `unlock()` must run inside such a handler (the gate screen does it). Before that, `play()` is a
 * documented no-op: gamepad-only players get silence until they press a key or click once.
 */
import { CHANNELS, compileSfx, FRAME_S, lfsrBits, noiseShiftHz, SFX, volumeGain, type Channel, type Segment, type SfxName } from './psg.ts';

interface ToneVoice { osc: OscillatorNode; gain: GainNode }
interface NoiseVoice { white: AudioBufferSourceNode; periodic: AudioBufferSourceNode; whiteGain: GainNode; periodicGain: GainNode }

const compiled = new Map<SfxName, Partial<Record<Channel, Segment[]>>>();
function compiledSfx(name: SfxName): Partial<Record<Channel, Segment[]>> {
  let c = compiled.get(name);
  if (!c) { c = compileSfx(SFX[name]); compiled.set(name, c); }
  return c;
}

export class Sfx {
  private ac: AudioContext | null = null;
  private master: GainNode | null = null;
  private tones: Record<'t0' | 't1' | 't2', ToneVoice> | null = null;
  private noise: NoiseVoice | null = null;
  private _volume: number;
  /** Per-channel gain scale so three squares at full volume don't clip. */
  private static readonly CHANNEL_GAIN = 0.22;

  constructor(volume: number) {
    this._volume = volume;
  }

  get unlocked(): boolean { return this.ac !== null && this.ac.state === 'running'; }

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
    this.ac = ac;
    this.master = master;
    this.tones = { t0: tone(), t1: tone(), t2: tone() };
    this.noise = { white, periodic, whiteGain, periodicGain };
  }

  /** Play a named SFX. No-op until unlocked (see header). Unknown names are a type error. */
  play(name: SfxName): void {
    if (!this.unlocked) return; // documented: silence before the first user gesture
    const ac = this.ac as AudioContext;
    const t0 = ac.currentTime + 0.005;
    const sfx = compiledSfx(name);
    for (const ch of CHANNELS) {
      const segs = sfx[ch];
      if (segs) this.schedule(ch, segs, t0);
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
