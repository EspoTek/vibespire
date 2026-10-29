/**
 * InputManager: keyboard, gamepad (standard mapping) and mouse all feed one set of semantic
 * actions (actions.ts). Call `update(dtMs)` once at the start of each frame; all edges (pressed,
 * released, pointer.pressed, wheel) then hold for exactly that frame. Game/UI code asks `pressed('confirm')`, `repeated('down')`, `held('info')`, and
 * reads `pointer` (logical px) / `wheel` (notches this frame).
 *
 * Mouse model: moving the pointer sets hover focus (FocusManager), a left click activates the widget
 * under the pointer (pointer events, NOT the global `confirm` action, so clicking empty space does
 * nothing), right click is `cancel`, the wheel scrolls lists.
 * Gamepads cannot unlock Web Audio (they are not a user activation); the gate screen handles that.
 */
import {
  ActionTracker, KEY_BINDINGS, PAD_BINDINGS, stickDirectionOrNull, WheelAccumulator,
  type Action, type Device, type NavAction,
} from './actions.ts';
import type { Point } from './layout.ts';

export interface PointerState {
  /** Logical px (integer, may be outside 0..W/H when over the letterbox). */
  x: number;
  y: number;
  inside: boolean;
  /** The pointer moved this frame (gate hover-focus on this so a resting cursor never steals focus). */
  moved: boolean;
  /** Left button currently down. */
  down: boolean;
  /** Left button went down / up this frame. */
  pressed: boolean;
  released: boolean;
}

export class InputManager {
  private readonly tracker = new ActionTracker<Action>();
  private readonly keysDown = new Map<string, Action>(); // code -> action
  private readonly keysTapped = new Set<Action>(); // went down since last update (latches sub-frame taps)
  private readonly wheelAcc = new WheelAccumulator();
  private rightClicked = false;
  private pointerMoved = false;
  private pointerDownEdge = false;
  private pointerUpEdge = false;
  private pointerDown = false;
  private lastClient: { x: number; y: number } | null = null;
  private anyInputPending = false;
  /** Text entry (seed field): printable keys go here instead of becoming actions. */
  private textSink: ((ev: { char: string } | { backspace: true }) => void) | null = null;
  private readonly warnedPads = new Set<string>();
  private readonly toLogical: (cx: number, cy: number) => Point & { inside: boolean };

  readonly pointer: PointerState = { x: -1, y: -1, inside: false, moved: false, down: false, pressed: false, released: false };
  /** Signed wheel notches this frame (+ = down/away). */
  wheel = 0;
  lastDevice: Device = 'mouse';
  /** Number of connected standard-mapping pads seen in the last poll. */
  padCount = 0;
  /** Any key / button / click this frame (gate screen, "press any key"). */
  anyInput = false;

  constructor(target: HTMLElement, toLogical: (cx: number, cy: number) => Point & { inside: boolean }) {
    this.toLogical = toLogical;
    window.addEventListener('keydown', (e) => {
      this.anyInputPending = true;
      if (e.ctrlKey || e.metaKey || e.altKey) return; // leave browser shortcuts alone
      if (this.textSink) {
        if (e.code === 'Backspace') { e.preventDefault(); this.textSink({ backspace: true }); return; }
        if (e.key.length === 1 && /[A-Za-z0-9 _-]/.test(e.key)) { e.preventDefault(); this.textSink({ char: e.key.toUpperCase() }); return; }
      }
      const a = KEY_BINDINGS[e.code];
      if (!a) return;
      e.preventDefault(); // stop Tab/Space/arrows from scrolling or moving DOM focus
      this.lastDevice = 'keyboard';
      if (!e.repeat) this.keysTapped.add(a); // OS key-repeat is ignored: we do our own
      this.keysDown.set(e.code, a);
    });
    window.addEventListener('keyup', (e) => { this.keysDown.delete(e.code); });
    window.addEventListener('blur', () => { this.keysDown.clear(); this.pointerDown = false; });
    window.addEventListener('pointermove', (e) => {
      if (this.lastClient && this.lastClient.x === e.clientX && this.lastClient.y === e.clientY) return;
      this.lastClient = { x: e.clientX, y: e.clientY };
      this.pointerMoved = true;
      this.lastDevice = 'mouse';
    });
    target.addEventListener('pointerdown', (e) => {
      this.anyInputPending = true;
      this.lastDevice = 'mouse';
      this.lastClient = { x: e.clientX, y: e.clientY };
      if (e.button === 0) { this.pointerDown = true; this.pointerDownEdge = true; }
      if (e.button === 2) this.rightClicked = true;
    });
    window.addEventListener('pointerup', (e) => {
      if (e.button === 0 && this.pointerDown) { this.pointerDown = false; this.pointerUpEdge = true; }
    });
    target.addEventListener('contextmenu', (e) => e.preventDefault());
    target.addEventListener('wheel', (e) => {
      this.wheelAcc.add(e.deltaY, e.deltaMode);
      this.lastClient = { x: e.clientX, y: e.clientY }; // the wheel targets what is under the pointer
      this.lastDevice = 'mouse';
    }, { passive: true });
    window.addEventListener('gamepadconnected', (e) => {
      console.info(`[input] gamepad ${e.gamepad.index} connected: "${e.gamepad.id}" mapping="${e.gamepad.mapping}"`);
    });
  }

  /** Poll devices and advance edge/repeat state. Call once per frame before UI logic. */
  update(dtMs: number): void {
    const down = new Set<Action>(this.keysDown.values());
    for (const a of this.keysTapped) down.add(a);
    this.keysTapped.clear();
    if (this.rightClicked) { down.add('cancel'); this.rightClicked = false; }

    let padActive = false;
    let pads = 0;
    for (const gp of navigator.getGamepads()) {
      if (!gp || !gp.connected) continue;
      if (gp.mapping !== 'standard') {
        if (!this.warnedPads.has(gp.id)) {
          this.warnedPads.add(gp.id);
          console.warn(`[input] ignoring gamepad "${gp.id}": mapping "${gp.mapping}" is not "standard"`);
        }
        continue;
      }
      pads++;
      gp.buttons.forEach((b, i) => {
        const a = PAD_BINDINGS[i];
        if (a && b.pressed) { down.add(a); padActive = true; }
      });
      const ax = gp.axes[0], ay = gp.axes[1];
      if (ax === undefined || ay === undefined) throw new Error(`gamepad "${gp.id}" has standard mapping but no left-stick axes`);
      const dir: NavAction | null = stickDirectionOrNull(ax, ay);
      if (dir) { down.add(dir); padActive = true; }
    }
    this.padCount = pads;
    this.tracker.step(down, dtMs);
    if (padActive && this.tracker.anyPressed()) this.lastDevice = 'gamepad';

    // pointer
    if (this.lastClient) {
      const p = this.toLogical(this.lastClient.x, this.lastClient.y);
      this.pointer.x = p.x;
      this.pointer.y = p.y;
      this.pointer.inside = p.inside;
    }
    this.pointer.moved = this.pointerMoved;
    this.pointer.pressed = this.pointerDownEdge;
    this.pointer.released = this.pointerUpEdge;
    this.pointer.down = this.pointerDown;
    this.pointerMoved = this.pointerDownEdge = this.pointerUpEdge = false;
    this.wheel = this.wheelAcc.take();
    this.anyInput = this.anyInputPending || this.tracker.anyPressed();
    this.anyInputPending = false;
  }

  /**
   * Route printable keys (and Backspace) to `sink` until endTextCapture. Enter, Escape, arrows and
   * Tab keep working as actions so the field can be confirmed or left.
   */
  beginTextCapture(sink: (ev: { char: string } | { backspace: true }) => void): void { this.textSink = sink; }
  endTextCapture(): void { this.textSink = null; }
  get capturingText(): boolean { return this.textSink !== null; }

  pressed(a: Action): boolean { return this.tracker.pressed(a); }
  released(a: Action): boolean { return this.tracker.released(a); }
  held(a: Action): boolean { return this.tracker.held(a); }
  /** Rising edge, then auto-repeat (350 ms delay, every 120 ms) while held. */
  repeated(a: Action): boolean { return this.tracker.repeated(a); }
  heldFor(a: Action): number { return this.tracker.heldFor(a); }
  downActions(): ReadonlySet<Action> { return this.tracker.downSet(); }
}
