/**
 * FocusManager: one per Screen. Holds a stack of focus scopes (modal stack: only the top scope is
 * navigable and hit-testable), routes keyboard/pad/mouse to widgets, and draws the focus ring.
 * Keyboard, gamepad and mouse share one model: hovering moves focus, clicking activates the
 * widget under the pointer, arrows/D-pad/stick move focus (list order, then spatial; focusNav.ts).
 */
import * as THREE from 'three';
import type { Sfx } from './audio.ts';
import { firstFocusableOrNull, pickNextOrNull, type Dir } from './focusNav.ts';
import { solidRect } from './gfx.ts';
import type { InputManager } from './input.ts';
import { contains, type Rect } from './layout.ts';
import { C } from './palette.ts';
import { Z, type Widget } from './ui/Widget.ts';

export class FocusScope {
  readonly name: string;
  readonly widgets: Widget[] = [];
  focused: Widget | null = null;
  onCancel: (() => void) | null;
  /** Remembered focus of the scope below, restored on pop. */
  constructor(name: string, onCancel: (() => void) | null) {
    this.name = name;
    this.onCancel = onCancel;
  }
  /** Register a widget and all its descendants (only focusable ones are ever picked). */
  add(...ws: Widget[]): void {
    for (const w of ws) for (const d of w.descendants()) if (!this.widgets.includes(d)) this.widgets.push(d);
  }
  remove(w: Widget): void {
    for (const d of w.descendants()) {
      const i = this.widgets.indexOf(d);
      if (i >= 0) this.widgets.splice(i, 1);
      // a removed widget is about to be disposed: forget it without calling its blur hooks
      if (this.focused === d) this.focused = null;
    }
  }
  candidates(): Widget[] { return this.widgets.filter((w) => w.focusable); }
}

/** 1px outline that blinks between two palette colours (hard steps, never blended). */
class FocusRing {
  readonly node = new THREE.Object3D();
  private readonly top = solidRect(1, 1, C.focusA);
  private readonly bottom = solidRect(1, 1, C.focusA);
  private readonly left = solidRect(1, 1, C.focusA);
  private readonly right = solidRect(1, 1, C.focusA);
  private readonly sides = [this.top, this.bottom, this.left, this.right];
  private t = 0;
  private static readonly PERIOD_MS = 266; // 16 frames per colour

  constructor() {
    for (const s of this.sides) { s.renderOrder = Z.FOCUS; this.node.add(s); }
    this.node.visible = false;
  }

  show(r: Rect | null): void {
    if (!r) { this.node.visible = false; return; }
    this.node.visible = true;
    // 1px gap between the widget and the ring so it never merges into a PS border
    const x = r.x - 2, y = r.y - 2, w = r.w + 4, h = r.h + 4;
    const { top, bottom, left, right } = this;
    top.position.set(x, y, 0); top.scale.set(w, 1, 1);
    bottom.position.set(x, y + h - 1, 0); bottom.scale.set(w, 1, 1);
    left.position.set(x, y, 0); left.scale.set(1, h, 1);
    right.position.set(x + w - 1, y, 0); right.scale.set(1, h, 1);
  }

  update(dtMs: number): void {
    this.t += dtMs;
    const phase = Math.floor(this.t / FocusRing.PERIOD_MS) % 2;
    for (const s of this.sides) s.material.uniforms.uTint.value.setHex(phase === 0 ? C.focusA : C.focusB);
  }
}

export interface FocusDeps {
  input: InputManager;
  sfx: Sfx;
  announce: (text: string) => void;
}

export class FocusManager {
  private readonly scopes: FocusScope[] = [];
  private readonly ring = new FocusRing();
  private readonly deps: FocusDeps;
  private pressTarget: Widget | null = null;
  /** When true, navigation/activation is ignored (e.g. while the Scheduler plays animations). */
  locked = false;

  constructor(root: THREE.Object3D, deps: FocusDeps) {
    this.deps = deps;
    root.add(this.ring.node);
  }

  get top(): FocusScope {
    const s = this.scopes[this.scopes.length - 1];
    if (!s) throw new Error('FocusManager: no scope pushed (call pushScope first)');
    return s;
  }
  get depth(): number { return this.scopes.length; }
  get focused(): Widget | null { return this.scopes.length ? this.top.focused : null; }

  pushScope(name: string, onCancel: (() => void) | null = null): FocusScope {
    const below = this.scopes[this.scopes.length - 1];
    below?.focused?.setFocused(false);
    const s = new FocusScope(name, onCancel);
    this.scopes.push(s);
    return s;
  }

  /** Pop `scope` (must be the top one) and restore focus in the scope below. */
  popScope(scope: FocusScope): void {
    if (this.top !== scope) throw new Error(`FocusManager.popScope: "${scope.name}" is not the top scope ("${this.top.name}")`);
    scope.focused?.setFocused(false);
    this.scopes.pop();
    const below = this.scopes[this.scopes.length - 1];
    if (below?.focused) { below.focused.setFocused(true); this.deps.announce(below.focused.label); }
  }

  /** Focus `w` in the top scope. `w` must be registered there. */
  focus(w: Widget | null, opts: { sound?: boolean } = {}): void {
    const s = this.top;
    if (w && !s.widgets.includes(w)) throw new Error(`FocusManager.focus: ${w.id} is not in scope "${s.name}"`);
    if (w && (!w.focusable || !w.enabled)) throw new Error(`FocusManager.focus: ${w.id} is not focusable/enabled`);
    if (s.focused === w) return;
    s.focused?.setFocused(false);
    s.focused = w;
    if (w) {
      w.setFocused(true);
      if (w.label) this.deps.announce(w.label);
      if (opts.sound) this.deps.sfx.play('move');
    }
  }

  /** Focus the first focusable widget (reading order) if nothing is focused. */
  ensureFocus(): void {
    const s = this.top;
    if (s.focused && s.focused.enabled && s.focused.focusable && s.widgets.includes(s.focused)) return;
    this.focus(firstFocusableOrNull(s.candidates()));
  }

  /** Topmost focusable, enabled, visible widget under (x, y) in the top scope, or null. */
  hitTestOrNull(x: number, y: number): Widget | null {
    let best: Widget | null = null;
    for (const w of this.top.candidates()) {
      if (!w.enabled || !w.visible || !contains(w.hitRect(), x, y)) continue;
      if (!best || w.z >= best.z) best = w;
    }
    return best;
  }

  move(dir: Dir): void {
    const s = this.top;
    const cur = s.focused;
    if (!cur) { this.ensureFocus(); return; }
    if (cur.handleNav(dir)) return;
    const next = pickNextOrNull(cur, dir, s.candidates());
    if (next) this.focus(next, { sound: true });
  }

  private activate(w: Widget): void {
    if (w.activateSound) this.deps.sfx.play('confirm');
    w.activate();
  }

  update(dtMs: number): void {
    this.ring.update(dtMs);
    if (!this.scopes.length) { this.ring.show(null); return; }
    const { input } = this.deps;
    const s = this.top;

    if (!this.locked) {
      // pointer: hover focuses, click (press+release on the same widget) activates
      if (input.pointer.moved) {
        const hit = this.hitTestOrNull(input.pointer.x, input.pointer.y);
        if (hit && hit !== s.focused) this.focus(hit, { sound: true });
      }
      if (input.pointer.pressed) this.pressTarget = this.hitTestOrNull(input.pointer.x, input.pointer.y);
      if (input.pointer.released) {
        const hit = this.hitTestOrNull(input.pointer.x, input.pointer.y);
        const target = this.pressTarget;
        this.pressTarget = null;
        if (hit && hit === target) {
          if (s.focused !== hit) this.focus(hit);
          this.activate(hit);
        }
      }
      if (input.wheel !== 0) {
        // bubble from the widget under the pointer (else the focused one) up its parent chain
        const bubble = (w: Widget | null): boolean => {
          for (let cur = w; cur; cur = cur.parent) if (cur.handleWheel(input.wheel)) return true;
          return false;
        };
        if (!bubble(this.hitTestOrNull(input.pointer.x, input.pointer.y))) bubble(s.focused);
      }
      for (const d of ['up', 'down', 'left', 'right'] as const) if (input.repeated(d)) this.move(d);
      if (input.pressed('confirm') && s.focused) this.activate(s.focused);
      if (input.pressed('cancel') && s.onCancel) {
        this.deps.sfx.play('cancel');
        s.onCancel();
      }
    }

    // the cancel handler may have popped this scope
    const f = this.scopes.length ? this.top.focused : null;
    this.ring.show(f && f.showRing && f.visible ? f.ringRect() : null);
  }
}
