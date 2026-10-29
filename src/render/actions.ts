/**
 * Semantic input actions and the pure edge/repeat tracker behind InputManager (input.ts).
 * No DOM here, so edge detection, repeat timing, stick dead zone and wheel quantising are
 * unit-tested in Node.
 */

export const CARD_SLOTS = ['cardSlot1', 'cardSlot2', 'cardSlot3', 'cardSlot4', 'cardSlot5',
  'cardSlot6', 'cardSlot7', 'cardSlot8', 'cardSlot9', 'cardSlot10'] as const;

export const ACTIONS = [
  'up', 'down', 'left', 'right',
  'confirm', 'cancel', 'endTurn', 'menu',
  'nextTarget', 'prevTarget', 'info',
  'help', 'deck',
  ...CARD_SLOTS,
] as const;

export type Action = (typeof ACTIONS)[number];
export type CardSlotAction = (typeof CARD_SLOTS)[number];
export type NavAction = 'up' | 'down' | 'left' | 'right';
export type Device = 'keyboard' | 'mouse' | 'gamepad';

/** KeyboardEvent.code -> action (physical keys, so WASD works on any layout). */
export const KEY_BINDINGS: Readonly<Record<string, Action>> = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  Enter: 'confirm', NumpadEnter: 'confirm', Space: 'confirm',
  Escape: 'cancel', Backspace: 'cancel',
  KeyE: 'endTurn',
  Tab: 'nextTarget', KeyQ: 'prevTarget',
  KeyI: 'info',
  KeyM: 'menu',
  Slash: 'help', F1: 'help',
  KeyV: 'deck',
  Digit1: 'cardSlot1', Digit2: 'cardSlot2', Digit3: 'cardSlot3', Digit4: 'cardSlot4', Digit5: 'cardSlot5',
  Digit6: 'cardSlot6', Digit7: 'cardSlot7', Digit8: 'cardSlot8', Digit9: 'cardSlot9', Digit0: 'cardSlot10',
  Numpad1: 'cardSlot1', Numpad2: 'cardSlot2', Numpad3: 'cardSlot3', Numpad4: 'cardSlot4', Numpad5: 'cardSlot5',
  Numpad6: 'cardSlot6', Numpad7: 'cardSlot7', Numpad8: 'cardSlot8', Numpad9: 'cardSlot9', Numpad0: 'cardSlot10',
};

/** W3C "standard" gamepad button index -> action. */
export const PAD_BINDINGS: Readonly<Record<number, Action>> = {
  0: 'confirm', // A
  1: 'cancel', // B
  2: 'endTurn', // X
  3: 'info', // Y
  4: 'prevTarget', // LB
  5: 'nextTarget', // RB
  8: 'help', // Back / Select
  9: 'menu', // Start
  12: 'up', 13: 'down', 14: 'left', 15: 'right', // D-pad
};

export type PromptAction = 'confirm' | 'cancel' | 'endTurn' | 'menu' | 'nextTarget' | 'prevTarget' | 'info' | 'help' | 'deck';

/** Human-readable prompt for an action per device (button glyph swapping in phase 2). */
export const PROMPTS: Readonly<Record<Device, Readonly<Record<PromptAction, string>>>> = {
  keyboard: { confirm: 'ENTER', cancel: 'ESC', endTurn: 'E', menu: 'M', nextTarget: 'TAB', prevTarget: 'Q', info: 'I', help: '?', deck: 'V' },
  mouse: { confirm: 'CLICK', cancel: 'R-CLICK', endTurn: 'E', menu: 'M', nextTarget: 'TAB', prevTarget: 'Q', info: 'I', help: '?', deck: 'V' },
  gamepad: { confirm: 'A', cancel: 'B', endTurn: 'X', menu: 'START', nextTarget: 'RB', prevTarget: 'LB', info: 'Y', help: 'BACK', deck: 'START' },
};

export const STICK_DEAD_ZONE = 0.35;
export const REPEAT_DELAY_MS = 350;
export const REPEAT_RATE_MS = 120;

/**
 * Left-stick direction: radial dead zone, then the dominant axis wins. Null inside the dead zone
 * (an expected "stick at rest" outcome).
 */
export function stickDirectionOrNull(x: number, y: number, deadZone = STICK_DEAD_ZONE): NavAction | null {
  if (Math.hypot(x, y) < deadZone) return null;
  if (Math.abs(x) >= Math.abs(y)) return x < 0 ? 'left' : 'right';
  return y < 0 ? 'up' : 'down'; // standard mapping: +y is down
}

/**
 * Per-action edge + auto-repeat tracker. Feed it the set of actions that are down this frame;
 * query pressed (rising edge), released (falling edge), held, and repeated (rising edge, then
 * after `delayMs` once every `rateMs` while held).
 */
export class ActionTracker<A extends string = Action> {
  private now = new Set<A>();
  private before = new Set<A>();
  private heldMs = new Map<A, number>();
  private repeatFired = new Set<A>();
  private nextRepeatAt = new Map<A, number>();
  private readonly delayMs: number;
  private readonly rateMs: number;

  constructor(delayMs = REPEAT_DELAY_MS, rateMs = REPEAT_RATE_MS) {
    this.delayMs = delayMs;
    this.rateMs = rateMs;
  }

  /** Advance one frame. `dtMs` is the time since the previous step. */
  step(down: ReadonlySet<A>, dtMs: number): void {
    this.before = this.now;
    this.now = new Set(down);
    this.repeatFired.clear();
    for (const a of this.now) {
      if (!this.before.has(a)) {
        this.heldMs.set(a, 0);
        this.nextRepeatAt.set(a, this.delayMs);
        this.repeatFired.add(a);
        continue;
      }
      const t = (this.heldMs.get(a) as number) + dtMs;
      this.heldMs.set(a, t);
      let next = this.nextRepeatAt.get(a) as number;
      if (t >= next) {
        this.repeatFired.add(a);
        // one repeat per frame at most, but keep the schedule from drifting
        while (next <= t) next += this.rateMs;
        this.nextRepeatAt.set(a, next);
      }
    }
    for (const a of this.before) {
      if (!this.now.has(a)) { this.heldMs.delete(a); this.nextRepeatAt.delete(a); }
    }
  }

  pressed(a: A): boolean { return this.now.has(a) && !this.before.has(a); }
  released(a: A): boolean { return !this.now.has(a) && this.before.has(a); }
  held(a: A): boolean { return this.now.has(a); }
  repeated(a: A): boolean { return this.repeatFired.has(a); }
  /** How long `a` has been held, in ms (0 if not held). */
  heldFor(a: A): number { return this.heldMs.get(a) ?? 0; } // absent = not held: documented 0
  anyPressed(): boolean { for (const a of this.now) if (!this.before.has(a)) return true; return false; }
  downSet(): ReadonlySet<A> { return this.now; }
}

/**
 * Wheel quantiser: accumulates WheelEvent deltas (normalised to px) and emits whole "notches",
 * so a trackpad's stream of tiny deltas scrolls at a sane rate. Returns signed notches.
 */
export class WheelAccumulator {
  private acc = 0;
  private readonly pxPerNotch: number;
  constructor(pxPerNotch = 100) { this.pxPerNotch = pxPerNotch; }
  /** deltaMode: 0 = pixels, 1 = lines, 2 = pages (WheelEvent.DOM_DELTA_*). */
  add(deltaY: number, deltaMode: number): void {
    const px = deltaMode === 1 ? deltaY * 16 : deltaMode === 2 ? deltaY * 360 : deltaY;
    this.acc += px;
  }
  /** Whole notches since the last take (remainder carries over). */
  take(): number {
    const n = Math.trunc(this.acc / this.pxPerNotch);
    if (n === 0) return 0; // also normalises -0
    this.acc -= n * this.pxPerNotch;
    return n;
  }
  reset(): void { this.acc = 0; }
}
