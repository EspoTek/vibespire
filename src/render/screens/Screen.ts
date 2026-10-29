/**
 * Screens and the ScreenManager.
 *
 * A Screen owns a THREE.Group root (the only Group in its subtree: three's groupOrder rule) and a
 * FocusManager. The ScreenManager keeps a stack: only the top screen receives input/update; screens
 * below stay rendered unless the top is `opaque`. push/pop/replace run a palette fade: the image
 * steps down through the SMS levels to black (FADE_MS), the stack changes, then it steps back up.
 */
import * as THREE from 'three';
import type { App } from '../app.ts';
import { FocusManager } from '../focus.ts';
import { disposeMesh } from '../gfx.ts';
import { Widget } from '../ui/Widget.ts';

export const FADE_MS = 150;

export abstract class Screen {
  readonly name: string;
  readonly root = new THREE.Group();
  readonly focus: FocusManager;
  protected readonly app: App;
  /** Hide the screens below while this one is on top. */
  opaque = true;
  private readonly widgets: Widget[] = [];

  constructor(app: App, name: string) {
    this.app = app;
    this.name = name;
    this.root.name = `screen:${name}`;
    this.focus = new FocusManager(this.root, { input: app.input, sfx: app.sfx, announce: app.announce });
  }

  /** Add a top-level widget to this screen's scene (does NOT register it for focus). */
  add<T extends Widget>(w: T): T {
    this.widgets.push(w);
    this.root.add(w.node);
    return w;
  }

  removeWidget(w: Widget): void {
    const i = this.widgets.indexOf(w);
    if (i < 0) throw new Error(`${this.name}: removeWidget(${w.id}) not added to this screen`);
    this.widgets.splice(i, 1);
    w.dispose();
  }

  /**
   * Open a modal: pushes a focus scope (cancel closes it unless `cancellable` is false: a modal that
   * must be answered, e.g. an engine PendingChoice), adds the widgets `build` returns, focuses the
   * first focusable one. Returns `close`, which pops the scope and disposes those widgets.
   */
  openModal(name: string, build: (close: () => void) => Widget[], onClose?: () => void, cancellable = true): () => void {
    let open = true;
    let widgets: Widget[] = [];
    const close = () => {
      if (!open) return;
      open = false;
      this.focus.popScope(scope);
      for (const w of widgets) this.removeWidget(w);
      onClose?.();
    };
    const scope = this.focus.pushScope(name, cancellable ? close : null);
    widgets = build(close);
    for (const w of widgets) { this.add(w); scope.add(w); }
    this.focus.ensureFocus();
    return close;
  }

  /** Called once after the root joins the scene, before the fade-in. */
  enter(): void { /* optional */ }
  /** Called when a screen pushed on top of this one is popped. */
  resume(): void { /* optional */ }
  /** Called once before removal. */
  exit(): void { /* optional */ }
  /** Per frame while this is the top screen and no transition runs (after focus handling). */
  update(_dtMs: number): void { /* optional */ }

  /** Run every widget's per-frame hook (animations, live readouts). Called by ScreenManager. */
  updateWidgets(dtMs: number): void {
    for (const w of [...this.widgets]) for (const d of w.descendants()) d.update(dtMs);
  }

  dispose(): void {
    for (const w of [...this.widgets]) w.dispose();
    this.widgets.length = 0;
    this.root.traverse((o) => { if (o instanceof THREE.Mesh) disposeMesh(o); });
    this.root.removeFromParent();
  }
}

export class ScreenManager {
  private readonly stack: Screen[] = [];
  private readonly app: App;
  private busy = false;
  /** Transitions run strictly one after another (a key pressed during a fade queues, never throws). */
  private chain: Promise<void> = Promise.resolve();

  constructor(app: App) { this.app = app; }

  get top(): Screen | null { return this.stack[this.stack.length - 1] ?? null; } // null = empty stack (startup)
  get transitioning(): boolean { return this.busy; }
  get depth(): number { return this.stack.length; }

  push(s: Screen): Promise<void> {
    return this.transition(() => {
      this.stack.push(s);
      this.mount(s);
      s.enter();
    });
  }

  pop(): Promise<void> {
    return this.transition(() => {
      const s = this.stack.pop();
      if (!s) throw new Error('ScreenManager.pop: stack is empty');
      s.exit();
      s.dispose();
      this.top?.resume();
    });
  }

  replace(s: Screen): Promise<void> {
    return this.transition(() => {
      const old = this.stack.pop();
      if (old) { old.exit(); old.dispose(); }
      this.stack.push(s);
      this.mount(s);
      s.enter();
    });
  }

  private mount(s: Screen): void {
    const groups = this.findGroups(s.root);
    if (groups.length) throw new Error(`Screen ${s.name}: nested THREE.Group(s) ${groups.map((g) => `"${g.name}"`).join(', ')} break renderOrder (use Object3D)`);
    this.app.display.scene.add(s.root);
  }

  private findGroups(root: THREE.Object3D): THREE.Object3D[] {
    const out: THREE.Object3D[] = [];
    root.traverse((o) => { if (o !== root && (o as THREE.Group).isGroup) out.push(o); });
    return out;
  }

  private restack(): void {
    let hidden = false;
    for (let i = this.stack.length - 1; i >= 0; i--) {
      const s = this.stack[i] as Screen;
      s.root.renderOrder = i * 10;
      s.root.visible = !hidden;
      if (s.opaque) hidden = true;
    }
  }

  private transition(change: () => void): Promise<void> {
    const run = this.chain.then(() => this.runTransition(change));
    // the chain survives a failed transition; the failure itself still rejects `run` for the caller
    this.chain = run.catch(() => undefined);
    return run;
  }

  private async runTransition(change: () => void): Promise<void> {
    this.busy = true;
    const d = this.app.display;
    const step = FADE_MS / 3;
    try {
      if (this.stack.length > 0) {
        for (const lv of [-1, -2, -3]) { d.setFade(lv); await this.app.tweens.delay(step); }
      } else {
        d.setFade(-3);
      }
      change();
      this.restack();
      for (const lv of [-2, -1, 0]) { d.setFade(lv); await this.app.tweens.delay(step); }
      d.setFade(0);
    } finally {
      this.busy = false;
    }
  }

  update(dtMs: number): void {
    const s = this.top;
    if (!s || this.busy) return;
    s.focus.update(dtMs);
    if (this.busy || this.top !== s) return; // an activation started a transition: s is on its way out
    s.update(dtMs);
    s.updateWidgets(dtMs);
  }
}
