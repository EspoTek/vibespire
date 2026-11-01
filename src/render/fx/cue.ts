/**
 * Cue timelines: an animation declares its keyframes (windup, impact, settle...) and hangs sounds
 * and screen effects off them, so a sound fires on the frame its visual lands instead of when the
 * engine event arrived. Driven by the Tweener clock: speed scaling (hold-confirm x4, animation speed
 * setting, e2e time scale) and hit-stop move sound and picture together.
 *
 *   const c = new Cue(tw, 'strike').at(0, 'windup', lift).at(90, 'impact', () => { sfx.play('hit'); flash(); });
 *   await c.play();            // or: void c.play(); await c.reached('impact');
 *
 * Every key that fires is recorded in CUE_LOG with the renderer frame (audioClock.frame), so an
 * automated check can show the impact sound and the impact visual landed on the same frame.
 */
import { audioClock } from '../audio.ts';
import type { Tweener } from '../tween.ts';

export interface CueLogEntry { cue: string; key: string; frame: number; wallMs: number; atMs: number }
export const CUE_LOG: CueLogEntry[] = [];
const LOG_MAX = 400;

/** Record a cue key that fired outside a Cue timeline (one-shot impacts). */
export function logCue(cue: string, key: string, atMs = 0): void {
  CUE_LOG.push({ cue, key, frame: audioClock.frame, wallMs: performance.now(), atMs });
  if (CUE_LOG.length > LOG_MAX) CUE_LOG.splice(0, CUE_LOG.length - LOG_MAX);
}

interface Key { at: number; key: string; fns: (() => void)[] }

export class Cue {
  private readonly tw: Tweener;
  readonly name: string;
  private readonly keys: Key[] = [];
  private readonly fired = new Set<string>();
  private readonly waiters = new Map<string, (() => void)[]>();
  private started = false;

  constructor(tw: Tweener, name: string) {
    this.tw = tw;
    this.name = name;
  }

  /** Add (or extend) keyframe `key` at `ms` after the start. Keys fire in time order. */
  at(ms: number, key: string, fn?: () => void): this {
    if (this.started) throw new Error(`Cue ${this.name}: at() after play()`);
    if (!(ms >= 0)) throw new Error(`Cue ${this.name}: bad time ${ms} for ${key}`);
    let k = this.keys.find((x) => x.key === key);
    if (k && k.at !== ms) throw new Error(`Cue ${this.name}: key ${key} declared at ${k.at} and ${ms} ms`);
    if (!k) { k = { at: ms, key, fns: [] }; this.keys.push(k); }
    if (fn) k.fns.push(fn);
    return this;
  }

  /** Time of `key` in ms from the start (throws if undeclared). */
  timeOf(key: string): number {
    const k = this.keys.find((x) => x.key === key);
    if (!k) throw new Error(`Cue ${this.name}: no key ${key} (have ${this.keys.map((x) => x.key).join(', ')})`);
    return k.at;
  }

  /** Run the timeline; resolves when the last key has fired. Keys at 0 fire synchronously. */
  play(): Promise<void> {
    if (this.started) throw new Error(`Cue ${this.name}: played twice`);
    this.started = true;
    const order = [...this.keys].sort((a, b) => a.at - b.at);
    let t = 0;
    let i = 0;
    const fireDue = () => {
      while (i < order.length && (order[i] as Key).at <= t) this.fire(order[i++] as Key);
    };
    return new Promise((done) => {
      fireDue();
      if (i >= order.length) { done(); return; }
      this.tw.every((dt) => {
        t += dt;
        fireDue();
        if (i >= order.length) { done(); return false; }
        return true;
      });
    });
  }

  /** Resolves when `key` has fired (immediately if it already did). */
  reached(key: string): Promise<void> {
    this.timeOf(key);
    if (this.fired.has(key)) return Promise.resolve();
    return new Promise((res) => {
      const list = this.waiters.get(key) ?? []; // absent = nobody waiting yet
      list.push(res);
      this.waiters.set(key, list);
    });
  }

  private fire(k: Key): void {
    logCue(this.name, k.key, k.at);
    for (const fn of k.fns) fn();
    this.fired.add(k.key);
    for (const res of this.waiters.get(k.key) ?? []) res(); // absent = nobody waited for this key
    this.waiters.delete(k.key);
  }
}
