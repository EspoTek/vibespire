/**
 * Widget: a plain object with an absolute layout rect in logical px (y down) and a THREE.Object3D
 * `node` holding its meshes. Hit-testing and focus navigation use `rect` (via `hitRect()`), never
 * raycasting.
 *
 * Scene-graph rules:
 *  - `node` is a plain Object3D (never a Group: a nested Group resets three's groupOrder, see
 *    tech.md §0). Only Screen roots are Groups.
 *  - Child widgets are added with `addChild`; their nodes hang under this node, positioned relative
 *    to it, while their `rect`s stay absolute. `moveTo` shifts the whole subtree's rects.
 *  - Layering: each mesh gets `renderOrder = widget.z + part offset` (see `addPart`). Meshes inside
 *    one screen sort by renderOrder; screens sort by their Group's renderOrder.
 */
import * as THREE from 'three';
import type { ListMembership, NavNode } from '../focusNav.ts';
import type { Dir } from '../focusNav.ts';
import { disposeMesh } from '../gfx.ts';
import type { Rect } from '../layout.ts';

/** Standard z bands within a screen. */
export const Z = {
  BACKDROP: 0,
  WORLD: 100, // enemies, effects
  PANEL: 200,
  CARD: 300, // hand cards: CARD + index*4, focused card raised to CARD_TOP
  CARD_TOP: 380,
  MODAL: 500,
  TOOLTIP: 800,
  FOCUS: 900,
  TOAST: 950,
} as const;

let nextId = 1;

export abstract class Widget implements NavNode {
  readonly id: string;
  readonly node = new THREE.Object3D();
  rect: Rect;
  enabled = true;
  /** Can take focus (buttons, list items, cards). Panels and labels can't. */
  focusable = false;
  /** Draw the global focus ring around this widget when focused (list items use a cursor instead). */
  showRing = true;
  /** List-order navigation override (hands, menus); see focusNav.ts. */
  list?: ListMembership | undefined;
  /** Spoken by screen readers when focused. */
  label = '';
  onFocus: (() => void) | null = null;
  onBlur: (() => void) | null = null;
  onActivate: (() => void) | null = null;
  /** Play the confirm SFX on activation (FocusManager does it). */
  activateSound = true;

  private _z = 0;
  private _focused = false;
  private _parent: Widget | null = null;
  private readonly _children: Widget[] = [];
  private readonly parts = new Set<THREE.Object3D>();

  constructor(rect: Rect, idPrefix = 'w') {
    this.id = `${idPrefix}${nextId++}`;
    this.rect = { ...rect };
    this.node.name = this.id;
    this.syncNode();
  }

  get visible(): boolean {
    for (let w: Widget | null = this; w; w = w._parent) if (!w.node.visible) return false;
    return true;
  }
  set visible(v: boolean) { this.node.visible = v; }

  get focused(): boolean { return this._focused; }
  get parent(): Widget | null { return this._parent; }
  get children(): readonly Widget[] { return this._children; }
  get z(): number { return this._z; }

  /** Offset of this widget's z relative to its parent's (set by addChild). */
  private _childDz = 0;

  /** Set the base renderOrder for this widget's meshes; children follow at their own offsets. */
  setZ(z: number): this {
    this._z = z;
    for (const p of this.parts) this.applyZ(p);
    for (const c of this._children) c.setZ(z + c._childDz);
    return this;
  }

  private applyZ(obj: THREE.Object3D): void {
    const dz = obj.userData.dz as number;
    obj.traverse((o) => { o.renderOrder = this._z + dz; });
  }

  /** Add a mesh (or Object3D of meshes) as part of this widget, drawn at z + dz. */
  protected addPart<T extends THREE.Object3D>(obj: T, dz = 0): T {
    obj.userData.dz = dz;
    this.parts.add(obj);
    this.node.add(obj);
    this.applyZ(obj);
    return obj;
  }

  protected removePart(obj: THREE.Object3D): void {
    if (!this.parts.delete(obj)) throw new Error(`${this.id}: removePart of an object that is not a part`);
    this.node.remove(obj);
    obj.traverse((o) => { if (o instanceof THREE.Mesh) disposeMesh(o); });
  }

  /** Adopt `child` (its rect stays absolute); it is drawn at this.z + dz. */
  addChild<T extends Widget>(child: T, dz = 0): T {
    if (child._parent) throw new Error(`${child.id} already has a parent (${child._parent.id})`);
    child._parent = this;
    child._childDz = dz;
    this._children.push(child);
    this.node.add(child.node);
    child.syncNode();
    child.setZ(this._z + dz);
    return child;
  }

  removeChild(child: Widget): void {
    const i = this._children.indexOf(child);
    if (i < 0) throw new Error(`${child.id} is not a child of ${this.id}`);
    this._children.splice(i, 1);
    this.node.remove(child.node);
    child._parent = null;
  }

  /** This widget and all descendants, depth-first. */
  descendants(): Widget[] {
    const out: Widget[] = [this];
    for (const c of this._children) out.push(...c.descendants());
    return out;
  }

  /** Move to absolute (x, y), shifting every descendant's rect by the same delta. */
  moveTo(x: number, y: number): this {
    const dx = Math.round(x) - this.rect.x, dy = Math.round(y) - this.rect.y;
    if (dx === 0 && dy === 0) return this;
    for (const w of this.descendants()) { w.rect = { ...w.rect, x: w.rect.x + dx, y: w.rect.y + dy }; }
    this.syncNode();
    return this;
  }

  /** Node position = rect relative to the parent's rect (integers only). */
  protected syncNode(): void {
    const px = this._parent ? this._parent.rect.x : 0;
    const py = this._parent ? this._parent.rect.y : 0;
    this.node.position.set(this.rect.x - px, this.rect.y - py, 0);
  }

  /** Rect used for pointer hit-testing (default: rect). */
  hitRect(): Rect { return this.rect; }
  /** Rect the focus ring is drawn around (default: rect). */
  ringRect(): Rect { return this.rect; }

  /** Called by FocusManager. Subclasses override renderFocus for visuals. */
  setFocused(on: boolean): void {
    if (on === this._focused) return;
    this._focused = on;
    this.renderFocus(on);
    if (on) this.onFocus?.();
    else this.onBlur?.();
  }
  protected renderFocus(_on: boolean): void { /* default: ring only */ }

  activate(): void { this.onActivate?.(); }

  /** Offered every repeated direction while focused; return true to consume it (sliders, selectors). */
  handleNav(_dir: Dir): boolean { return false; }
  /** Offered wheel notches while focused/hovered; return true to consume. */
  handleWheel(_notches: number): boolean { return false; }

  /** Per-frame hook for widgets that animate themselves. */
  update(_dtMs: number): void { /* optional */ }

  /** Dispose this widget's meshes and its children. Detaches from parent. */
  dispose(): void {
    for (const c of [...this._children]) c.dispose();
    for (const p of [...this.parts]) this.removePart(p);
    if (this._parent) this._parent.removeChild(this);
    this.node.removeFromParent();
  }
}
