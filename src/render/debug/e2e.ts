/**
 * e2e test hook: `window.__vibe`, installed by main.ts only with the `?e2e=1` URL flag (dynamic
 * import, so without the flag none of this is even loaded). Contract in tests/e2e/README.md.
 *
 *  - snapshot():  engine truth (phase, HP, gold, enemies, hand, shop prices...) side by side with what
 *                 the screen shows (HUD label texts, enemy views + sprite checks, hand frames, every
 *                 visible label/button, the focused widget). The harness compares the two.
 *  - legal() / stateJson(): the engine's legal actions and the full RunState (JSON).
 *  - dispatch(a): RunScreen.uiDispatch → the exact act()/perform() path the screen's controls use, so
 *                 the screen animates and refreshes as for a player.
 *  - setTimeScale(n): replace the frame loop with one that runs n fixed 1/60 s ticks per animation
 *                 frame (a macrotask yield between ticks lets every tween/animation promise chain
 *                 advance), then renders once: tweens, animations, timers and the audio calls all run
 *                 through the real code, n times faster. 0 restores the real-time loop.
 *  - widgets():   every navigable widget of the top focus scope with bounds, label, a point where a
 *                 click really lands on it (hit-tested), and that point in client (CSS) pixels.
 */
import { SAVE_KEY, type Action, type Difficulty } from '../../engine/index.ts';
import type { App } from '../app.ts';
import { EnergyOrb } from '../game/combatWidgets.ts';
import { HintIcon, TopBar } from '../game/hud.ts';
import { RunScreen } from '../game/RunScreen.ts';
import { screenFor } from '../game/router.ts';
import { CombatScreen } from '../game/screens/CombatScreen.ts';
import { RunSession } from '../game/session.ts';
import { contains, H, W, type Rect } from '../layout.ts';
import type { Screen } from '../screens/Screen.ts';
import { TitleScreen } from '../screens/TitleScreen.ts';
import type { Sprite } from '../sprite.ts';
import { Button } from '../ui/Button.ts';
import { Label } from '../ui/Label.ts';
import type { Widget } from '../ui/Widget.ts';

const FIXED_DT = 1000 / 60;

export interface WidgetInfo {
  id: string;
  kind: string;
  label: string;
  rect: Rect;
  enabled: boolean;
  visible: boolean;
  focusable: boolean;
  focused: boolean;
  /** In the top focus scope's candidates (keyboard / pad navigation can reach it). */
  navigable: boolean;
  /** List-order navigation membership (hand, map-next, targets, offers...), or null. */
  list: { key: string; index: number; axis: 'x' | 'y' } | null;
  /** A logical point inside the widget where a click hit-tests to this widget, or null (covered / off-screen). */
  click: { x: number; y: number } | null;
  /** `click` in client (CSS) pixels, for page.mouse. */
  clientClick: { x: number; y: number } | null;
}

export interface SpriteCheck {
  frame: string;
  /** Opaque pixels in the sprite's atlas frame (0 = an empty / missing texture). */
  opaquePixels: number;
  textureW: number;
  textureH: number;
  /** The sprite mesh and every ancestor up to the scene are visible, opacity > 0, not fully dimmed. */
  drawn: boolean;
}

export interface EnemyViewInfo {
  uid: number;
  enemyId: string;
  rect: Rect;
  visible: boolean;
  inBounds: boolean;
  sprite: SpriteCheck;
  plateText: string[];
}

export interface Snapshot {
  frames: number;
  simMs: number;
  idle: boolean;
  /** What idle() waits on: running tweens/timers/tickers, a queued animation step. */
  busy: { tweens: number; scheduler: boolean };
  screen: { name: string; cls: string; stackDepth: number; modalDepth: number; transitioning: boolean; busy: boolean } | null;
  /** The engine phase (null before any run was seen). */
  phase: string | null;
  focused: WidgetInfo | null;
  /** Visible label texts (markup stripped) of the top screen, top-level reading order. */
  labels: string[];
  /** Visible buttons: caption + enabled. */
  buttons: { label: string; enabled: boolean }[];
  /** Visible relic / potion / status icons (HintIcon): atlas frame name, position, label. */
  icons: { frame: string; x: number; y: number; label: string }[];
  /** The TopBar's summary label and child label texts, or null (no HUD on this screen). */
  hud: { summary: string; texts: string[] } | null;
  combat: {
    enemies: EnemyViewInfo[];
    hand: { uid: number; name: string; visible: boolean; rect: Rect }[];
    energyLabel: string | null;
  } | null;
}

const stripMarkup = (s: string): string => s.replace(/\[\[/g, '\u0000').replace(/\[[^\]]*\]/g, '').replace(/\u0000/g, '[');

/**
 * Yield one macrotask (all pending microtasks run first). One long-lived channel: a per-call
 * MessageChannel can be garbage-collected before its message arrives, which froze the fixed-step
 * loop for good (seen as "no game time passed" under memory pressure).
 */
const yieldChannel = new MessageChannel();
const yieldWaiters: (() => void)[] = [];
yieldChannel.port1.onmessage = () => {
  const w = yieldWaiters.shift();
  if (!w) throw new Error('e2e: a tick yield arrived with nobody waiting');
  w();
};
function macrotask(): Promise<void> {
  return new Promise((resolve) => {
    yieldWaiters.push(resolve);
    yieldChannel.port2.postMessage(0);
  });
}

function allWidgets(screen: Screen): Widget[] {
  return screen.topWidgets.flatMap((w) => w.descendants());
}

/** Count opaque pixels of an atlas frame (cached per texture+frame). */
const opaqueCache = new Map<string, { n: number; w: number; h: number }>();
function opaquePixels(sprite: Sprite): { n: number; w: number; h: number } {
  const atlas = sprite.atlas;
  const key = `${atlas.source}#${sprite.frameName}`;
  const hit = opaqueCache.get(key);
  if (hit) return hit;
  const f = atlas.frame(sprite.frameName);
  const img: unknown = atlas.texture.image;
  let n = 0;
  if (img && typeof img === 'object' && 'data' in img && 'width' in img) {
    // DataTexture (procedural atlases): RGBA bytes
    const d = img as { data: Uint8Array; width: number; height: number };
    for (let y = f.y; y < f.y + f.h; y++) for (let x = f.x; x < f.x + f.w; x++) if ((d.data[(y * d.width + x) * 4 + 3] ?? 0) > 0) n++;
  } else if (img instanceof HTMLImageElement || img instanceof ImageBitmap || img instanceof HTMLCanvasElement) {
    const c = new OffscreenCanvas(f.w, f.h);
    const g = c.getContext('2d');
    if (!g) throw new Error('e2e: no 2d context for the sprite check');
    g.drawImage(img, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
    const px = g.getImageData(0, 0, f.w, f.h).data;
    for (let i = 3; i < px.length; i += 4) if ((px[i] ?? 0) > 0) n++;
  } else {
    throw new Error(`e2e: texture of ${key} has no readable image (${String(img)})`);
  }
  const out = { n, w: atlas.width, h: atlas.height };
  opaqueCache.set(key, out);
  return out;
}

function spriteDrawn(sprite: Sprite): boolean {
  for (let o: import('three').Object3D | null = sprite; o; o = o.parent) if (!o.visible) return false;
  const u = sprite.material.uniforms;
  const opacity = u.uOpacity?.value as number | undefined;
  const dim = u.uDim?.value as number | undefined;
  return (opacity === undefined || opacity > 0) && (dim === undefined || dim < 3);
}

export interface VibeE2E {
  version: 1;
  setTimeScale(stepsPerFrame: number): void;
  readonly timeScale: number;
  idle(): boolean;
  snapshot(): Snapshot;
  legal(): Action[];
  /** The current RunState as JSON, or null (no run seen yet). */
  stateJson(): string | null;
  dispatch(a: Action): void;
  widgets(): WidgetInfo[];
  /** Focus and activate a navigable widget of the top scope (what confirm does). */
  activate(id: string): void;
  /** From the gate/title (or a finished run's summary): start a run as BEGIN CLIMB does. */
  startRun(seed: string, classId: string, difficulty: Difficulty): Promise<void>;
  /** Write a save (engine save JSON) to the run slot; CONTINUE on the title then resumes it. */
  writeSave(json: string): void;
  logicalToClient(x: number, y: number): { x: number; y: number };
  /** Every action any screen applied since the last call (UI-initiated ones too, e.g. the reward's gold pickup). */
  takeApplied(): Action[];
}

export function installE2E(app: App): VibeE2E {
  let stepsPerFrame = 0;
  let stepping = false;
  let simMs = 0;
  let lastSession: RunSession | null = null;
  // record every applied action, whoever applied it (the harness replays them headless to check determinism)
  const applied: Action[] = [];
  const apply = RunSession.prototype.apply;
  RunSession.prototype.apply = function (this: RunSession, a: Action) {
    const events = apply.call(this, a); // an illegal action throws here and is not recorded
    applied.push(structuredClone(a));
    return events;
  };

  const top = (): Screen => {
    const s = app.screens.top;
    if (!s) throw new Error('e2e: the screen stack is empty');
    return s;
  };
  const session = (): RunSession | null => {
    const s = app.screens.top;
    if (s instanceof RunScreen) lastSession = s.runSession;
    return lastSession;
  };

  async function fastFrame(): Promise<void> {
    stepping = true;
    try {
      for (let i = 0; i < stepsPerFrame; i++) {
        app.tick(FIXED_DT);
        simMs += FIXED_DT;
        await macrotask(); // let promise chains (tweens → scheduler → screen) run between ticks
      }
      app.display.render();
      app.frames++;
    } finally {
      stepping = false;
    }
  }

  const logicalToClient = (x: number, y: number): { x: number; y: number } => {
    const r = app.display.canvas.getBoundingClientRect();
    const b = app.display.backing;
    const v = app.display.view;
    return { x: r.left + ((v.left + (x + 0.5) * v.scale) * r.width) / b.w, y: r.top + ((v.top + (y + 0.5) * v.scale) * r.height) / b.h };
  };

  const idle = (): boolean => {
    const s = app.screens.top;
    if (!s || app.screens.transitioning || app.scheduler.busy || app.tweens.active > 0) return false;
    return !(s instanceof RunScreen && s.busy);
  };

  const info = (screen: Screen, w: Widget, navigable: Set<Widget>): WidgetInfo => {
    let click: { x: number; y: number } | null = null;
    if (navigable.has(w) && w.enabled && w.visible) {
      const r = w.hitRect();
      // centre first, then a coarse grid: overlapping widgets (fanned hand cards) are hit where they show
      const pts: [number, number][] = [[r.x + Math.floor(r.w / 2), r.y + Math.floor(r.h / 2)]];
      for (let fy = 1; fy < 6; fy++) for (let fx = 1; fx < 6; fx++) pts.push([r.x + Math.floor((r.w * fx) / 6), r.y + Math.floor((r.h * fy) / 6)]);
      for (const [x, y] of pts) {
        if (x < 0 || y < 0 || x >= W || y >= H || !contains(r, x, y)) continue;
        if (screen.focus.hitTestOrNull(x, y) === w) { click = { x, y }; break; }
      }
    }
    return {
      id: w.id, kind: w.constructor.name, label: stripMarkup(w.label), rect: { ...w.rect },
      enabled: w.enabled, visible: w.visible, focusable: w.focusable, focused: screen.focus.focused === w,
      navigable: navigable.has(w), list: w.list ? { key: w.list.key, index: w.list.index, axis: w.list.axis } : null, click, clientClick: click ? logicalToClient(click.x, click.y) : null,
    };
  };

  const widgets = (): WidgetInfo[] => {
    const screen = top();
    if (screen.focus.depth === 0) return [];
    const nav = new Set(screen.focus.top.candidates());
    return allWidgets(screen).filter((w) => nav.has(w)).map((w) => info(screen, w, nav));
  };

  const snapshot = (): Snapshot => {
    const s = app.screens.top;
    const sess = session();
    if (!s) return { frames: app.frames, simMs, idle: false, busy: { tweens: app.tweens.active, scheduler: app.scheduler.busy }, screen: null, phase: null, focused: null, labels: [], buttons: [], icons: [], hud: null, combat: null };
    const nav = new Set(s.focus.depth > 0 ? s.focus.top.candidates() : []);
    const ws = allWidgets(s);
    const labels = ws.filter((w): w is Label => w instanceof Label && w.visible && w.label !== '').map((w) => stripMarkup(w.label));
    const buttons = ws.filter((w): w is Button => w instanceof Button && w.visible).map((w) => ({ label: stripMarkup(w.label), enabled: w.enabled }));
    const icons = ws.filter((w): w is HintIcon => w instanceof HintIcon && w.visible).map((w) => ({ frame: w.sprite.frameName, x: w.rect.x, y: w.rect.y, label: stripMarkup(w.label) }));
    const bar = ws.find((w): w is TopBar => w instanceof TopBar);
    const hud = bar ? { summary: bar.label, texts: bar.descendants().filter((w): w is Label => w instanceof Label).map((w) => stripMarkup(w.label)) } : null;
    let combat: Snapshot['combat'] = null;
    if (s instanceof CombatScreen) {
      const enemies: EnemyViewInfo[] = [];
      for (const [uid, u] of s.unitViews) {
        const op = opaquePixels(u.view.sprite);
        const r = u.view.rect;
        enemies.push({
          uid, enemyId: u.enemyId, rect: { ...r }, visible: u.view.visible,
          inBounds: r.x >= 0 && r.y >= 0 && r.x + r.w <= W && r.y + r.h <= H,
          sprite: { frame: u.view.sprite.frameName, opaquePixels: op.n, textureW: op.w, textureH: op.h, drawn: spriteDrawn(u.view.sprite) },
          plateText: u.plate.descendants().filter((w): w is Label => w instanceof Label).map((w) => stripMarkup(w.label)),
        });
      }
      const hand = s.handViews.map(({ uid, frame }) => ({ uid, name: frame.cardFace.name, visible: frame.visible, rect: { ...frame.rect } }));
      const orb = ws.find((w): w is EnergyOrb => w instanceof EnergyOrb);
      combat = { enemies, hand, energyLabel: orb ? orb.label : null };
    }
    const f = s.focus.depth > 0 ? s.focus.focused : null;
    return {
      frames: app.frames, simMs, idle: idle(), busy: { tweens: app.tweens.active, scheduler: app.scheduler.busy },
      screen: { name: s.name, cls: s.constructor.name, stackDepth: app.screens.depth, modalDepth: s.focus.depth, transitioning: app.screens.transitioning, busy: s instanceof RunScreen && s.busy },
      phase: sess ? sess.state.phase : null,
      focused: f ? info(s, f, nav) : null,
      labels, buttons, icons, hud, combat,
    };
  };

  const api: VibeE2E = {
    version: 1,
    setTimeScale(n: number): void {
      if (!Number.isInteger(n) || n < 0) throw new Error(`setTimeScale: want an integer >= 0, got ${n}`);
      stepsPerFrame = n;
      app.sfx.muted = n > 1; // audio runs on the real clock: at n x speed it would pile up (juice agent)
      if (n === 0) { app.start(); return; }
      app.display.renderer.setAnimationLoop(() => { if (!stepping) void fastFrame(); });
    },
    get timeScale(): number { return stepsPerFrame; },
    idle,
    snapshot,
    legal(): Action[] {
      const sess = session();
      if (!sess) throw new Error('e2e.legal: no run yet');
      return [...sess.legal()];
    },
    stateJson(): string | null {
      const sess = session();
      return sess ? JSON.stringify(sess.state) : null;
    },
    dispatch(a: Action): void {
      const s = top();
      if (!(s instanceof RunScreen)) throw new Error(`e2e.dispatch(${a.type}): top screen "${s.name}" is not a run screen`);
      if (!idle()) throw new Error(`e2e.dispatch(${a.type}): not idle (wait for __vibe.idle())`);
      s.uiDispatch(a);
    },
    widgets,
    activate(id: string): void {
      const s = top();
      const w = s.focus.top.candidates().find((x) => x.id === id);
      if (!w) throw new Error(`e2e.activate: no navigable widget ${id} on "${s.name}"`);
      if (!w.enabled || !w.visible) throw new Error(`e2e.activate: ${id} (${w.label}) is disabled or hidden`);
      s.focus.focus(w);
      w.activate();
    },
    async startRun(seed: string, classId: string, difficulty: Difficulty): Promise<void> {
      if (difficulty !== 'standard' && difficulty !== 'heroic') throw new Error(`e2e.startRun: unknown difficulty ${String(difficulty)}`);
      // unwind to the title (gate → title; a run's summary/screens → pop), then push the run like BEGIN CLIMB
      for (let s = app.screens.top; s && !(s instanceof TitleScreen); s = app.screens.top) {
        if (app.screens.depth === 1) await app.screens.replace(new TitleScreen(app));
        else await app.screens.pop();
      }
      const sess = RunSession.newRun(app.storage, seed, classId, difficulty);
      lastSession = sess;
      console.info(`[e2e] new run: class ${classId}, seed ${seed}, ${difficulty}`);
      await app.screens.push(screenFor(app, sess));
    },
    writeSave(json: string): void {
      if (!app.storage.setRaw(SAVE_KEY, json)) throw new Error('e2e.writeSave: storage refused the save');
    },
    logicalToClient,
    takeApplied(): Action[] { return applied.splice(0, applied.length); },
  };
  Object.assign(window, { __vibe: api });
  console.info('[e2e] window.__vibe installed');
  return api;
}
