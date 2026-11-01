/**
 * Frame-driven, promise-based animation: Tweener (numeric props of plain objects), delays,
 * whole-pixel shake, hard-blink flash, and a Scheduler that runs animation steps one after another
 * (phase 2 feeds engine GameEvents through it). Pure: driven by `update(dtMs)`, no timers, no DOM.
 * `speed` scales every duration (2 = double-speed animations; 0 would freeze, so it must be > 0).
 */

export type Ease = (t: number) => number;

export const ease = {
  linear: ((t) => t) as Ease,
  inQuad: ((t) => t * t) as Ease,
  outQuad: ((t) => 1 - (1 - t) * (1 - t)) as Ease,
  inOutQuad: ((t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)) as Ease,
  outCubic: ((t) => 1 - (1 - t) ** 3) as Ease,
  inOutCubic: ((t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)) as Ease,
  inBack: ((t) => { const c = 1.70158; return (c + 1) * t * t * t - c * t * t; }) as Ease,
  outBack: ((t) => { const c = 1.70158; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; }) as Ease,
  inOutBack: ((t) => {
    const c = 1.70158 * 1.525;
    return t < 0.5 ? ((2 * t) ** 2 * ((c + 1) * 2 * t - c)) / 2 : ((2 * t - 2) ** 2 * ((c + 1) * (t * 2 - 2) + c) + 2) / 2;
  }) as Ease,
};

/** Quantise an ease into `steps` visible steps (8-bit "chunky" motion). */
export const stepped = (e: Ease, steps: number): Ease => (t) => (t >= 1 ? 1 : Math.floor(e(t) * steps) / steps);

interface Run {
  target: Record<string, number>;
  key: string;
  from: number;
  to: number;
  t: number;
  dur: number;
  ease: Ease;
  done: () => void;
}

interface Timer { left: number; done: () => void }

interface Ticker { tick: (dtMs: number) => boolean } // return false when finished

export class Tweener {
  private runs: Run[] = [];
  private timers: Timer[] = [];
  private tickers: Ticker[] = [];
  /** Tickers that keep running through hit-stop (the impact flash must end while the pose is frozen). */
  private rawTickers: Ticker[] = [];
  private _speed = 1;
  /** Hit-stop time left (speed-scaled ms): while > 0 every tween, timer and ticker is frozen. */
  private freezeLeft = 0;

  get speed(): number { return this._speed; }
  set speed(s: number) {
    if (!(s > 0)) throw new Error(`Tweener.speed must be > 0, got ${s}`);
    this._speed = s;
  }

  /**
   * Tween numeric props of `target` to `props` over `ms`. A new tween on the same target+key
   * replaces the running one (its promise resolves immediately, so awaiting code never hangs).
   */
  to<K extends string>(target: Record<K, number>, props: Partial<Record<K, number>>, ms: number, e: Ease = ease.outCubic): Promise<void> {
    const keys = Object.keys(props) as K[];
    const replaced = this.runs.filter((r) => r.target === target && (keys as string[]).includes(r.key));
    this.runs = this.runs.filter((r) => !replaced.includes(r));
    for (const r of replaced) r.done();
    return Promise.all(keys.map((key) => new Promise<void>((done) => {
      const to = props[key] as number;
      if (ms <= 0) { target[key] = to; done(); return; }
      this.runs.push({ target: target as Record<string, number>, key, from: target[key], to, t: 0, dur: ms, ease: e, done });
    }))).then(() => undefined);
  }

  /** Resolve after `ms` of (speed-scaled) frame time. */
  delay(ms: number): Promise<void> {
    return new Promise((done) => {
      if (ms <= 0) { done(); return; }
      this.timers.push({ left: ms, done });
    });
  }

  /** Run `fn(dtMs)` every frame until it returns false. */
  every(fn: (dtMs: number) => boolean): void { this.tickers.push({ tick: fn }); }

  /** Like every(), but not frozen by hit-stop (still speed-scaled). */
  everyUnfrozen(fn: (dtMs: number) => boolean): void { this.rawTickers.push({ tick: fn }); }

  /** Finish nothing, drop everything targeting `target` (e.g. when a widget is disposed). */
  cancel(target: object): void {
    const gone = this.runs.filter((r) => r.target === target);
    this.runs = this.runs.filter((r) => r.target !== target);
    for (const r of gone) r.done();
  }

  get active(): number { return this.runs.length + this.timers.length + this.tickers.length + this.rawTickers.length; }

  /**
   * Hit-stop: freeze everything driven by this Tweener (tweens, delays, tickers: flashes hold, shakes
   * pause, awaiting animation steps wait) for `ms` of speed-scaled time. Overlapping stops keep the
   * longest remaining one; they do not add up.
   */
  hitStop(ms: number): void {
    if (!(ms >= 0)) throw new Error(`Tweener.hitStop: bad ms ${ms}`);
    this.freezeLeft = Math.max(this.freezeLeft, ms);
  }

  get frozen(): boolean { return this.freezeLeft > 0; }

  update(dtMsRaw: number): void {
    let dt = dtMsRaw * this._speed;
    if (this.rawTickers.length > 0) {
      const raw = this.rawTickers;
      this.rawTickers = [];
      const keptRaw = raw.filter((tk) => tk.tick(dt));
      this.rawTickers = keptRaw.concat(this.rawTickers);
    }
    if (this.freezeLeft > 0) {
      const used = Math.min(this.freezeLeft, dt);
      this.freezeLeft -= used;
      dt -= used;
      if (dt <= 0) return;
    }
    for (const r of this.runs) {
      r.t = Math.min(r.t + dt, r.dur);
      r.target[r.key] = r.from + (r.to - r.from) * r.ease(r.t / r.dur);
    }
    const finished = this.runs.filter((r) => r.t >= r.dur);
    this.runs = this.runs.filter((r) => r.t < r.dur);
    for (const r of finished) { r.target[r.key] = r.to; r.done(); }

    for (const tm of this.timers) tm.left -= dt;
    const fired = this.timers.filter((tm) => tm.left <= 0);
    this.timers = this.timers.filter((tm) => tm.left > 0);
    for (const tm of fired) tm.done();

    // a ticker may register new tickers (a cue key spawning particles): those must survive this pass
    const running = this.tickers;
    this.tickers = [];
    const kept = running.filter((tk) => tk.tick(dt));
    this.tickers = kept.concat(this.tickers);
  }
}

/** Anything with a mutable 2D position (THREE.Object3D satisfies this). */
export interface Positioned { position: { x: number; y: number } }

/**
 * Shake `obj` by whole-pixel random offsets with linearly decaying amplitude, then restore its
 * position exactly. Don't move `obj` yourself while it shakes: shake a container.
 * Math.random is fine: cosmetic only, never game logic.
 */
export function shake(tw: Tweener, obj: Positioned, px: number, ms: number): Promise<void> {
  const bx = obj.position.x, by = obj.position.y;
  let t = 0;
  return new Promise((done) => {
    tw.every((dt) => {
      t += dt;
      if (t >= ms) { obj.position.x = bx; obj.position.y = by; done(); return false; }
      const a = px * (1 - t / ms);
      obj.position.x = bx + Math.round((Math.random() * 2 - 1) * a);
      obj.position.y = by + Math.round((Math.random() * 2 - 1) * a);
      return true;
    });
  });
}

/** Anything that can be flashed white (Sprite in sprite.ts). */
export interface Flashable { setFlash(on: boolean): void }

/** SMS-style hit flash: hard on/off blink at `hz` for `ms`, ends off. `startOff`: begin with the normal sprite (after an impact flash). */
export function flash(tw: Tweener, target: Flashable, ms = 240, hz = 15, startOff = false): Promise<void> {
  let t = 0;
  return new Promise((done) => {
    tw.every((dt) => {
      t += dt;
      if (t >= ms) { target.setFlash(false); done(); return false; }
      target.setFlash(Math.floor((t / 1000) * hz * 2) % 2 === (startOff ? 1 : 0));
      return true;
    });
  });
}

/**
 * Sequential animation queue. `enqueue` adds a step; steps run strictly one at a time, in order.
 * `busy` is true while anything is queued or running (input layers can lock on it).
 * A step that throws rejects its own promise and is reported to `onError`; it does not wedge the queue.
 */
export class Scheduler {
  private chain: Promise<void> = Promise.resolve();
  private pending = 0;
  private readonly tw: Tweener;
  private readonly onError: (e: unknown) => void;

  constructor(tw: Tweener, onError: (e: unknown) => void) {
    this.tw = tw;
    this.onError = onError;
  }

  get busy(): boolean { return this.pending > 0; }

  enqueue(step: () => Promise<void> | void): Promise<void> {
    this.pending++;
    const run = this.chain.then(async () => {
      try {
        await step();
      } finally {
        this.pending--;
      }
    });
    // keep the chain alive past a failing step, but surface the failure
    this.chain = run.catch((e: unknown) => { this.onError(e); });
    return run;
  }

  /** Enqueue a pause. */
  wait(ms: number): Promise<void> { return this.enqueue(() => this.tw.delay(ms)); }

  /** Resolves when everything currently queued has finished. */
  idle(): Promise<void> { return this.chain; }
}
