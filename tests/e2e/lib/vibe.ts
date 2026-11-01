// VibePage: one game tab driven through window.__vibe (src/render/debug/e2e.ts), with console /
// page-error capture, idle waits and failure artifacts.

import type { Browser, BrowserContext, Page } from 'playwright';
import type { Action, Difficulty, RunState } from '../../../src/engine/index.ts';
import type { Snapshot, VibeE2E, WidgetInfo } from '../../../src/render/debug/e2e.ts';

declare global {
  interface Window { __vibe: VibeE2E }
}

export interface PageOptions {
  /** Fixed sim ticks per animation frame (1 = real time, 0 = the real-time loop). */
  timeScale: number;
  /** CSS viewport; 640x360 = scale 1 (cheapest), 1280x720 = scale 2. */
  viewport?: { width: number; height: number };
  /** Install a virtual standard-mapping gamepad (window.__pad) before the game loads. */
  gamepad?: boolean;
}

/**
 * Console noise that is not an error of the game. Failed loads are reported by URL from the
 * 'response' listener instead (the console line has no URL).
 */
const IGNORED_CONSOLE = [/\[vite\]/, /^Failed to load resource/];
/** Requests whose failure doesn't matter (the browser asks for a favicon by itself). */
const IGNORED_URLS = [/\/favicon\.ico$/];

/** The game itself does not start (broken build, content registry error...): nothing to test. */
export class BootError extends Error {}

export class VibePage {
  readonly page: Page;
  readonly context: BrowserContext;
  readonly url: string;
  readonly errors: string[] = [];
  readonly consoleTail: string[] = [];
  private readonly opts: PageOptions;

  private constructor(context: BrowserContext, page: Page, url: string, opts: PageOptions) {
    this.context = context;
    this.page = page;
    this.url = url;
    this.opts = opts;
    page.on('console', (m) => {
      const text = `[${m.type()}] ${m.text()}`;
      this.consoleTail.push(text);
      if (this.consoleTail.length > 200) this.consoleTail.shift();
      if (m.type() === 'error' && !IGNORED_CONSOLE.some((r) => r.test(m.text()))) this.errors.push(text);
    });
    page.on('pageerror', (e) => { this.errors.push(`[pageerror] ${e.name}: ${e.message}\n${e.stack ?? ''}`); });
    page.on('crash', () => { this.errors.push('[crash] the page crashed'); });
    page.on('response', (r) => {
      if (r.status() >= 400 && !IGNORED_URLS.some((u) => u.test(r.url()))) this.errors.push(`[http ${r.status()}] ${r.url()}`);
    });
    page.on('requestfailed', (r) => {
      if (!IGNORED_URLS.some((u) => u.test(r.url()))) this.errors.push(`[request failed] ${r.url()}: ${r.failure()?.errorText ?? 'unknown'}`);
    });
  }

  static async open(browser: Browser, baseUrl: string, opts: PageOptions): Promise<VibePage> {
    const context = await browser.newContext({ viewport: opts.viewport ?? { width: 640, height: 360 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    if (opts.gamepad) await page.addInitScript(VIRTUAL_PAD);
    const vp = new VibePage(context, page, baseUrl, opts);
    await vp.boot();
    return vp;
  }

  /** (Re)load the game with ?e2e=1 and wait for the hook. Keeps localStorage (the save slot). */
  async boot(extraQuery = ''): Promise<void> {
    await this.page.goto(`${this.url}/?e2e=1${extraQuery}`, { waitUntil: 'load', timeout: 180_000 }); // first loads transform every module: slow on a busy machine
    // the hook, or a loud failure: an error while booting (content registry, assets) fails fast
    const t0 = Date.now();
    for (;;) {
      const state = await this.page.evaluate(`(() => { const f = document.getElementById('fatal'); return window.__vibe !== undefined ? 'ready' : f && !f.hidden ? 'fatal:' + f.textContent : 'wait'; })()`);
      if (state === 'ready') break;
      if (typeof state === 'string' && state.startsWith('fatal:')) throw new BootError(`the game crashed while booting: ${state.slice(6, 600)}`);
      if (this.errors.length) throw new BootError(`the game failed to boot: ${this.errors[0] ?? ''}`);
      if (Date.now() - t0 > 60_000) throw new BootError('the game did not boot within 60 s (no window.__vibe)');
      await this.page.waitForTimeout(50);
    }
    await this.hook('setTimeScale', this.opts.timeScale);
  }

  async close(): Promise<void> { await this.context.close(); }

  /**
   * Call `window.__vibe[method](...args)` in the page. Page-side code is always sent as source text
   * built here, never as a Node function: Playwright serialises a function with Function.toString(),
   * and tsx/esbuild's keepNames rewrites functions in Node to call a `__name` helper that exists only
   * in Node, so any function with a named inner function or const arrow fails in the page with
   * "__name is not defined" (how often depends on the caller's tsconfig). Arguments travel as JSON.
   */
  private hook<R>(method: keyof VibeE2E, ...args: unknown[]): Promise<R> {
    return this.page.evaluate(`window.__vibe.${String(method)}(${args.map((a) => JSON.stringify(a)).join(', ')})`) as Promise<R>;
  }

  snapshot(): Promise<Snapshot> { return this.hook('snapshot'); }
  legal(): Promise<Action[]> { return this.hook('legal'); }
  widgets(): Promise<WidgetInfo[]> { return this.hook('widgets'); }
  /** The run state as JSON (null = no run seen yet). */
  stateJson(): Promise<string | null> { return this.hook('stateJson'); }
  async state(): Promise<RunState | null> {
    const json = await this.stateJson();
    return json === null ? null : (JSON.parse(json) as RunState);
  }
  takeApplied(): Promise<Action[]> { return this.hook('takeApplied'); }
  idle(): Promise<boolean> { return this.hook('idle'); }
  dispatch(a: Action): Promise<void> { return this.hook('dispatch', a); }
  activate(id: string): Promise<void> { return this.hook('activate', id); }
  startRun(seed: string, classId: string, difficulty: Difficulty): Promise<void> { return this.hook('startRun', seed, classId, difficulty); }
  writeSave(json: string): Promise<void> { return this.hook('writeSave', json); }
  fatalText(): Promise<string | null> {
    return this.page.evaluate(`(() => { const el = document.getElementById('fatal'); return el && !el.hidden ? el.textContent : null; })()`) as Promise<string | null>;
  }

  /**
   * Wait until the game is idle (no screen transition, no animation step, no tween) on two consecutive
   * checks. Measured in game time, so a loaded machine doesn't fail runs: not idle after
   * `gameMs` of simulated time is a soft-lock (an animation that never ends); no game time passing
   * for `wallMs` of real time means the page is starved or hung.
   */
  async waitIdle(gameMs = 120_000, wallMs = 300_000): Promise<void> {
    let streak = 0;
    let start: number | null = null;
    let lastSim = -1;
    let lastProgress = Date.now();
    let lastPoll = Date.now();
    for (;;) {
      if (this.errors.length) return; // the caller reports errors first
      // the harness itself was suspended (machine asleep, process starved): that's not the page's fault
      if (Date.now() - lastPoll > 30_000) lastProgress = Date.now();
      lastPoll = Date.now();
      const ok = await this.idle();
      streak = ok ? streak + 1 : 0;
      if (streak >= 2) return;
      if (!ok) {
        const s = await this.snapshot();
        start ??= s.simMs;
        if (s.simMs !== lastSim) { lastSim = s.simMs; lastProgress = Date.now(); }
        const why = `screen ${s.screen?.name ?? '(none)'} (transitioning ${String(s.screen?.transitioning)}, screen busy ${String(s.screen?.busy)}, ${s.busy.tweens} tweens/timers, scheduler busy ${String(s.busy.scheduler)})`;
        if (s.simMs - start > gameMs) throw new Error(`waitIdle: not idle after ${Math.round(gameMs / 1000)} s of game time on ${why}`);
        if (Date.now() - lastProgress > wallMs) throw new Error(`waitIdle: no game time passed for ${Math.round(wallMs / 1000)} s of real time (page starved or hung) on ${why}`);
      }
      await this.page.waitForTimeout(ok ? 5 : 15);
    }
  }

  // ------------------------------------------------------------------ input helpers (real events)

  async press(key: string): Promise<void> { await this.page.keyboard.press(key); await this.frames(2); }
  async click(p: { x: number; y: number }): Promise<void> {
    await this.page.mouse.move(p.x, p.y);
    await this.frames(1);
    await this.page.mouse.down();
    await this.frames(1);
    await this.page.mouse.up();
    await this.frames(2);
  }
  async hover(p: { x: number; y: number }): Promise<void> { await this.page.mouse.move(p.x, p.y); await this.frames(2); }
  /** Tap a standard-mapping pad button (index): pressed for exactly 2 game ticks. */
  async padPress(button: number): Promise<void> {
    if (!Number.isInteger(button)) throw new Error(`padPress: button index ${button}`);
    await this.page.evaluate(`window.__pad.taps[${button}] = 2`);
    await this.frames(2);
  }
  /** Let `n` animation frames pass (each runs timeScale ticks). */
  frames(n: number): Promise<void> {
    // source text, not a function (see hook())
    return this.page.evaluate(`new Promise((resolve) => { let left = ${Math.max(1, Math.floor(n))}; function f() { if (--left <= 0) resolve(); else requestAnimationFrame(f); } requestAnimationFrame(f); })`);
  }
}

export interface VirtualPad { buttons: boolean[]; taps: number[]; axes: number[] }

/**
 * Init script (source text: see hook()): a virtual standard-mapping gamepad behind
 * navigator.getGamepads; window.__pad.buttons[i] / axes drive it.
 */
const VIRTUAL_PAD = `(() => {
  // taps[i] > 0: button i reads pressed for that many more polls (the game polls once per tick), so a
  // tap lasts 2 ticks whatever the time scale (holding it across frames would trigger key repeat)
  const pad = { buttons: new Array(17).fill(false), taps: new Array(17).fill(0), axes: [0, 0, 0, 0] };
  window.__pad = pad;
  function snapshot() {
    const down = pad.buttons.map(function (b, i) { const t = pad.taps[i] > 0; if (t) pad.taps[i]--; return b || t; });
    return { id: 'Vibespire e2e virtual pad', index: 0, connected: true, mapping: 'standard', timestamp: performance.now(),
      axes: pad.axes.slice(), buttons: down.map(function (p) { return { pressed: p, touched: p, value: p ? 1 : 0 }; }),
      vibrationActuator: null, hapticActuators: [] };
  }
  Object.defineProperty(navigator, 'getGamepads', { value: function () { return [snapshot(), null, null, null]; }, configurable: true });
})();`;
