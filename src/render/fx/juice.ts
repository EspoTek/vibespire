/**
 * Juice: the combat screen's (or any screen's) game-feel kit, bound to one App and one screen
 * root. Every effect honours the accessibility settings (screen shake off / low / full; full-screen
 * flashes on / off) and runs on the Tweener clock, so hit-stop and speed scaling apply to sound and
 * picture alike.
 *   - shake / hitStop / screenFlash / borderBlink
 *   - pop numbers that scale with the damage
 *   - card trails per card type, bursts, rings (fx/particles.ts)
 *   - beat quantising: `beatLead()` gives the wait until the music's next beat, and `cadence()`
 *     plays the in-key Cadence stinger on it.
 */
import * as THREE from 'three';
import type { App } from '../app.ts';
import { fonts } from '../fonts.ts';
import { solidRect } from '../gfx.ts';
import { H, W } from '../layout.ts';
import { cadenceStinger, octaveShift, STEPS_PER_BEAT } from '../music.ts';
import { C } from '../palette.ts';
import type { SfxDef, SfxName } from '../psg.ts';
import { Text } from '../text.ts';
import { shake, type Positioned } from '../tween.ts';
import { Z } from '../ui/Widget.ts';
import { logCue } from './cue.ts';
import { Particles, type Shape } from './particles.ts';

export type TrailKind = 'attack' | 'skill' | 'power' | 'status' | 'curse';

const TRAILS: Readonly<Record<TrailKind, { colors: readonly number[]; shapes: readonly Shape[] }>> = {
  attack: { colors: [C.red, C.orange, C.yellow], shapes: ['px2', 'px2', 'px1'] },
  skill: { colors: [C.skyBlue, C.iceBlue, C.white], shapes: ['px1', 'plus'] },
  power: { colors: [C.yellow, C.amber, C.white], shapes: ['plus', 'px2'] },
  status: { colors: [C.grey, C.darkGrey], shapes: ['px1'] },
  curse: { colors: [C.lilac, C.purple], shapes: ['px1', 'px2'] },
};

/** Above this tween speed (hold-confirm x4 on top of 2x+, or e2e time scaling) beat waits are skipped. */
const MAX_QUANTISE_SPEED = 4;

export class Juice {
  readonly app: App;
  readonly root: THREE.Object3D;
  readonly particles: Particles;

  constructor(app: App, root: THREE.Object3D) {
    this.app = app;
    this.root = root;
    this.particles = new Particles(root, app.tweens);
  }

  /** Shake intensity factor from the settings (0 off, 0.5 low, 1 full). */
  get shakeScale(): number { return this.app.settings.shake === 0 ? 0 : this.app.settings.shake === 1 ? 0.5 : 1; }

  /** Whole-pixel shake of `obj` scaled by the setting (resolves at once when shake is off). */
  shake(obj: Positioned, px: number, ms: number): Promise<void> {
    const p = Math.round(px * this.shakeScale);
    if (p <= 0) return Promise.resolve();
    return shake(this.app.tweens, obj, p, ms);
  }

  hitStop(ms: number): void { if (ms > 0) this.app.tweens.hitStop(ms); }

  /**
   * The impact silhouette: `color` fill for ~2 frames (SMS/NES hit flashes are 2-4 frames), ended on
   * real frame time so a hit-stop freezes the visible pose, not a solid fill.
   */
  impactFlash(sprite: { setFlash(on: boolean): void; setFlashColor(c: number): void }, color: number, ms = 34): void {
    sprite.setFlashColor(color);
    sprite.setFlash(true);
    let t = 0;
    this.app.tweens.everyUnfrozen((dt) => {
      t += dt;
      if (t < ms) return true;
      sprite.setFlash(false);
      return false;
    });
  }

  /**
   * Full-screen palette flash toward white (+) or black (-) in whole SMS levels, one level per
   * frame-ish step. With flashes off this becomes a border blink in `fallback`.
   */
  async screenFlash(peak: 1 | 2 | 3 | -1 | -2 | -3, fallback: number = C.white): Promise<void> {
    if (!this.app.settings.flashes) { await this.borderBlink(fallback, 120); return; }
    const d = this.app.display;
    const sign = Math.sign(peak), top = Math.abs(peak);
    const levels: number[] = [];
    for (let l = 1; l <= top; l++) levels.push(l * sign);
    for (let l = top - 1; l >= 0; l--) levels.push(l * sign);
    for (const lv of levels) { d.setFade(lv); await this.app.tweens.delay(34); }
    d.setFade(0);
  }

  /** A 2px frame around the screen that blinks (the gentle flash). */
  async borderBlink(color: number, ms: number): Promise<void> {
    const g = new THREE.Group();
    const parts = [solidRect(W, 2, color), solidRect(W, 2, color), solidRect(2, H, color), solidRect(2, H, color)];
    parts[1]?.position.set(0, H - 2, 0);
    parts[3]?.position.set(W - 2, 0, 0);
    for (const p of parts) { p.renderOrder = Z.TOAST - 5; g.add(p); }
    this.root.add(g);
    let t = 0;
    await new Promise<void>((done) => {
      this.app.tweens.every((dt) => {
        t += dt;
        g.visible = Math.floor(t / 40) % 2 === 0;
        if (t >= ms) { done(); return false; }
        return true;
      });
    });
    g.removeFromParent();
    for (const p of parts) p.material.dispose();
  }

  /**
   * A number that punches in (one frame white, then its colour), rises in whole pixels and blinks
   * out. `size` 1..3 is the glyph magnification: damage numbers grow with the hit.
   */
  pop(x: number, y: number, text: string, color: number, size: 1 | 2 | 3 = 1, ms = 620, small = false): Promise<void> {
    const t = new Text(small ? fonts.small : fonts.ui, text, { color: C.white, outline: C.black, align: 'center', scale: size });
    t.renderOrder = Z.TOAST - 10;
    this.root.add(t);
    const rise = 10 + size * 4;
    let age = 0;
    const top = y - Math.round(t.height / 2);
    t.place(x, top - 2 * size);
    return new Promise((done) => {
      this.app.tweens.every((dt) => {
        age += dt;
        if (age > 50 && t.style.color === C.white && color !== C.white) t.setColor(color);
        const k = Math.min(1, age / ms);
        // overshoot up then settle (stepped), then rise
        const punch = age < 60 ? -2 * size : 0;
        t.place(x, top + punch - Math.round(Math.floor(k * 8) / 8 * rise));
        t.visible = ms - age > 140 || Math.floor((ms - age) / 45) % 2 === 0;
        if (age >= ms) { t.removeFromParent(); t.dispose(); done(); return false; }
        return true;
      });
    });
  }

  /** Damage-number size for an amount. */
  static sizeFor(amount: number): 1 | 2 | 3 { return amount >= 20 ? 3 : amount >= 6 ? 2 : 1; }

  /** Emit a trail behind `getPos()` every ~18 ms until the returned stop() is called. */
  trail(getPos: () => { x: number; y: number }, kind: TrailKind): () => void {
    const style = TRAILS[kind];
    let live = true, acc = 0;
    this.app.tweens.every((dt) => {
      if (!live) return false;
      acc += dt;
      while (acc >= 18) {
        acc -= 18;
        const p = getPos();
        this.particles.burst(p.x, p.y, { n: kind === 'attack' ? 2 : 1, colors: style.colors, shapes: style.shapes, speed: [5, 25], life: [180, 320], jitter: 5, gravity: kind === 'attack' ? 60 : -20 });
      }
      return true;
    });
    return () => { live = false; };
  }

  // ---------------------------------------------------------------- music sync

  /**
   * Wait (in tween ms) until the music's next beat at least `minLeadMs` (real ms) away, and that
   * beat's audio time. Null when there is nothing to snap to (audio locked, no song, or animations
   * running too fast for a real-time wait to make sense).
   */
  beatLead(minLeadMs: number): { waitMs: number; at: number } | null {
    const speed = this.app.tweens.speed;
    if (speed > MAX_QUANTISE_SPEED || this.app.sfx.muted) return null;
    const at = this.app.music.nextBeatAt(minLeadMs / 1000);
    const now = this.app.sfx.nowOrNull();
    if (at === null || now === null) return null;
    // the picture waits for the sound to come out of the speakers, not for it to be scheduled
    return { waitMs: (at + this.app.sfx.latencyS() - now) * 1000 * speed, at };
  }

  /**
   * Index of the music beat the player is HEARING now (scheduled time minus output latency), or
   * null with no song. Beat-meter pulses key off its changes.
   */
  heardBeatOrNull(): number | null {
    const c = this.app.music.beatClock();
    if (!c) return null;
    return Math.floor((c.now - this.app.sfx.latencyS() - c.origin) / c.beatS);
  }

  /** Play a named SFX on the next beat (or now). Returns the tween ms until it sounds. */
  playOnBeat(name: SfxName, minLeadMs = 0): number {
    const q = this.beatLead(minLeadMs);
    this.app.sfx.play(name, q ? { at: q.at } : {});
    return q ? q.waitMs : 0;
  }

  /**
   * The Cadence stinger for beat 1..3 of the turn, in the key of the bar it lands in, on the
   * music's sixteenth grid; `at` = audio time (a beat from beatLead), or now.
   */
  cadence(beat: 1 | 2 | 3, at: number | null): void {
    const music = this.app.music;
    const t = at ?? this.app.sfx.nowOrNull();
    const chord = t === null ? null : music.chordAt(t);
    const step = music.stepFramesOrNull() ?? 16; // no song playing: a 112 BPM grid
    const def = cadenceStinger(chord ?? ['C4', 'E4', 'G4', 'C5'], beat, step);
    this.app.sfx.playDef(`cadence${beat}`, def, at === null ? {} : { at });
    logCue('cadence', `beat${beat}`);
  }

  /**
   * The Timeline resolve chord: the bar's chord voiced on 1-3 channels (more voices for bigger
   * batches), climbing `semis` with the cascade. Falls back to C major with no song playing.
   */
  resolveChord(voices: 1 | 2 | 3, semis: number): void {
    const now = this.app.sfx.nowOrNull();
    const chord = now === null ? null : this.app.music.chordAt(now);
    const [r, t, f] = chord ?? ['C4', 'E4', 'G4', 'C5'];
    const up = (n: string) => octaveShift(n, 1);
    const def: SfxDef = { t0: `@E ${up(r)}:2 @EDCBA98765 ${octaveShift(r, 2)}:12`, n: '@A863 w0:4' };
    if (voices >= 2) def.t1 = `@B r:1 @BA9876543 ${up(t)}:13`;
    if (voices >= 3) def.t2 = `@C r:2 @CBA98765 ${up(f)}:12`;
    this.app.sfx.playDef(`chord${voices}`, def, { semis, priority: 2 });
    logCue('chord', `voices${voices}`);
  }

  /** Beats per bar of the playing song's grid (constant 4: 8 eighth steps / 2). */
  static readonly BEATS_PER_BAR = 8 / STEPS_PER_BEAT;
}
