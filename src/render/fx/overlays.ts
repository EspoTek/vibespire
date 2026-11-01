/**
 * Persistent combat overlays for v2 mechanics. All of them animate from `update()` (the screen's
 * per-frame widget pass), never from Tweener tickers: they live as long as their state does, and a
 * permanent ticker would keep the e2e harness from ever seeing the animator idle.
 *   - EmberGlow: Embers as coals on the player plate, flickering hotter with more stacks.
 *   - ReserveMeter: Reserve pips beside the energy orb (only X-cost cards drain them).
 *   - BankLabel: energy / cards banked for the start of next turn.
 *   - RipeRim: the gold rim of a Ripe Bloom card (child of its CardFrame, moves with it).
 *   - SpriteMarks: a crack over Exposed enemies while Crazing is held; Goad's red taunt mark.
 * Palette only, hard pixels, no alpha: flicker is a colour swap, blinking is visibility.
 */
import * as THREE from 'three';
import { fonts } from '../fonts.ts';
import { quadGeometry, solidRect, spriteMaterial, textureFromPixels, type SpriteMaterial } from '../gfx.ts';
import { rect } from '../layout.ts';
import { C } from '../palette.ts';
import { PixelBuffer } from '../pixels.ts';
import type { Sprite } from '../sprite.ts';
import { Label } from '../ui/Label.ts';
import { Widget } from '../ui/Widget.ts';

const tinted = (m: THREE.Mesh<THREE.BufferGeometry, SpriteMaterial>, color: number): void => { m.material.uniforms.uTint.value.setHex(color); };

/** Hotter = further up this ramp. */
const COAL_RAMP = [C.maroon, C.darkRed, C.red, C.orange, C.amber, C.yellow] as const;

/** Coal heap slots, bottom row first: 4, 3, 2, 1 (10 = the Embers cap). */
const HEAP: readonly [number, number][] = [[0, 12], [5, 12], [10, 12], [15, 12], [2, 8], [7, 8], [12, 8], [5, 4], [10, 4], [7, 0]];

/** Embers: one 4x3 coal per stack, piled into a heap, each flickering on the coal ramp. */
export class EmberGlow extends Widget {
  private readonly coals: THREE.Mesh<THREE.BufferGeometry, SpriteMaterial>[] = [];
  private readonly phase: number[] = [];
  private stacks = 0;
  private t = 0;
  /** Flare: every coal at white-hot for a moment (the turn-start conversion). */
  private flareT = 0;
  static readonly MAX = 10;

  constructor(x: number, y: number) {
    super(rect(x, y, 19, 15), 'embers');
    for (let i = 0; i < EmberGlow.MAX; i++) {
      const m = solidRect(4, 3, C.darkRed);
      const [hx, hy] = HEAP[i] as [number, number];
      m.position.set(hx, hy, 0);
      m.visible = false;
      this.addPart(m, 1);
      this.coals.push(m);
      this.phase.push(Math.random() * 1000); // cosmetic only
    }
    this.label = 'Embers';
  }

  get count(): number { return this.stacks; }

  /** Centre of coal `i` (sparks leave from here). */
  coalPos(i: number): { x: number; y: number } {
    const [hx, hy] = HEAP[Math.max(0, Math.min(EmberGlow.MAX - 1, i))] as [number, number];
    return { x: this.rect.x + hx + 2, y: this.rect.y + hy + 1 };
  }

  set(stacks: number): void {
    this.stacks = Math.max(0, Math.min(EmberGlow.MAX, stacks));
    this.coals.forEach((m, i) => { m.visible = i < this.stacks; });
  }

  flare(ms = 260): void { this.flareT = ms; }

  override update(dtMs: number): void {
    if (this.stacks === 0) return;
    this.t += dtMs;
    this.flareT = Math.max(0, this.flareT - dtMs);
    // more stacks burn hotter: the flicker centre climbs the ramp
    const base = Math.min(3, 1 + Math.floor(this.stacks / 3));
    for (let i = 0; i < this.stacks; i++) {
      const m = this.coals[i] as THREE.Mesh<THREE.BufferGeometry, SpriteMaterial>;
      if (this.flareT > 0) { tinted(m, Math.floor(this.flareT / 50) % 2 === 0 ? C.white : C.yellow); continue; }
      const step = Math.floor((this.t + (this.phase[i] as number)) / 110);
      const k = Math.min(COAL_RAMP.length - 1, base + ((step * 7 + i * 3) % 3) - 1);
      tinted(m, COAL_RAMP[Math.max(0, k)] as number);
    }
  }
}

function diamond(on: boolean): PixelBuffer {
  const b = new PixelBuffer(5, 5);
  const c = on ? C.amber : C.darkGrey;
  b.set(2, 0, c); b.rect(1, 1, 3, 1, c); b.rect(0, 2, 5, 1, c); b.rect(1, 3, 3, 1, c); b.set(2, 4, c);
  if (on) b.set(2, 1, C.yellow);
  return b;
}

/** Reserve: amber diamonds (lit = stored) beside the energy orb; hidden while empty. */
export class ReserveMeter extends Widget {
  private readonly pips: THREE.Mesh<THREE.BufferGeometry, SpriteMaterial>[] = [];
  private readonly onTex = textureFromPixels(diamond(true));
  private readonly offTex = textureFromPixels(diamond(false));
  private readonly title: Label;
  private n = 0;
  private flashT = 0;

  constructor(x: number, y: number, cap: number) {
    super(rect(x, y, 12 + cap * 6, 7), 'reserve');
    this.title = this.addChild(new Label(x, y + 1, 'RES', { font: fonts.small, color: C.amber }), 1);
    for (let i = 0; i < cap; i++) {
      const m = new THREE.Mesh(quadGeometry(5, 5), spriteMaterial(this.offTex));
      m.position.set(14 + i * 6, 1, 0);
      this.addPart(m, 1);
      this.pips.push(m);
    }
    this.visible = false;
  }

  get stored(): number { return this.n; }
  pipPos(i: number): { x: number; y: number } { return { x: this.rect.x + 16 + i * 6, y: this.rect.y + 3 }; }

  set(n: number): void {
    if (n > this.n) this.flashT = 240;
    this.n = n;
    this.pips.forEach((m, i) => { m.material.uniforms.map.value = i < n ? this.onTex : this.offTex; });
    this.visible = n > 0;
    this.label = `Reserve ${n}`;
  }

  override update(dtMs: number): void {
    if (this.flashT <= 0) return;
    this.flashT -= dtMs;
    const on = this.flashT > 0 && Math.floor(this.flashT / 60) % 2 === 0;
    this.pips.forEach((m, i) => { m.material.uniforms.uFlash.value = on && i < this.n ? 1 : 0; });
  }

  override dispose(): void { super.dispose(); this.onTex.dispose(); this.offTex.dispose(); }
}

/** "NEXT TURN +2 EN +1 CARD": what the next-turn bank pays out; blinks gently, hidden while empty. */
export class BankLabel extends Widget {
  private readonly text: Label;
  private t = 0;
  energy = 0;
  draw = 0;

  constructor(x: number, y: number) {
    super(rect(x, y, 80, 7), 'bank');
    this.text = this.addChild(new Label(x, y, '', { font: fonts.small, color: C.amber, outline: C.black }), 1);
    this.visible = false;
  }

  set(energy: number, draw: number): void {
    this.energy = energy;
    this.draw = draw;
    const parts = [energy > 0 ? `+${energy} EN` : '', draw > 0 ? `+${draw} CARD${draw === 1 ? '' : 'S'}` : ''].filter((s) => s !== '');
    this.text.setText(parts.length ? `NEXT TURN ${parts.join(' ')}` : '');
    this.visible = parts.length > 0;
    this.label = this.visible ? `Banked for next turn: ${parts.join(', ')}` : '';
  }

  override update(dtMs: number): void {
    if (!this.visible) return;
    this.t += dtMs;
    this.text.setColor(Math.floor(this.t / 500) % 2 === 0 ? C.amber : C.yellow);
  }
}

/** A Ripe Bloom card's gold rim: 2px gold frame, a sparkle walking round it. Child of the CardFrame. */
export class RipeRim extends Widget {
  private readonly spark: THREE.Mesh<THREE.BufferGeometry, SpriteMaterial>;
  private t = 0;

  constructor(x: number, y: number, w = 64, h = 88) {
    super(rect(x - 2, y - 2, w + 4, h + 4), 'ripe');
    const W = w + 4, H = h + 4;
    // 2px gold: amber outside, yellow inside
    for (const [inset, color] of [[0, C.amber], [1, C.yellow]] as const) {
      const iw = W - 2 * inset, ih = H - 2 * inset;
      for (const [px, py, pw, ph] of [[0, 0, iw, 1], [0, ih - 1, iw, 1], [0, 0, 1, ih], [iw - 1, 0, 1, ih]] as const) {
        const m = solidRect(pw, ph, color);
        m.position.set(px + inset, py + inset, 0);
        this.addPart(m, 0);
      }
    }
    this.spark = solidRect(2, 2, C.white);
    this.addPart(this.spark, 1);
  }

  override update(dtMs: number): void {
    this.t += dtMs;
    const W = this.rect.w, H = this.rect.h, per = 2 * (W + H);
    const d = Math.floor(this.t / 12) % per;
    const [x, y] = d < W ? [d, 0] : d < W + H ? [W - 1, d - W] : d < 2 * W + H ? [W - 1 - (d - W - H), H - 1] : [0, H - 1 - (d - 2 * W - H)];
    this.spark.position.set(Math.min(W - 2, x), Math.min(H - 2, y), 0);
    tinted(this.spark, Math.floor(this.t / 80) % 2 === 0 ? C.white : C.yellow);
  }
}

function crackArt(): PixelBuffer {
  // a starburst crack: bright split, dark edge (art texels; drawn at the enemy's pixel scale)
  const b = new PixelBuffer(24, 24);
  const lines: [number, number, number, number][] = [[12, 12, 3, 4], [12, 12, 21, 6], [12, 12, 18, 21], [12, 12, 5, 19], [12, 12, 12, 1], [3, 4, 1, 7], [21, 6, 23, 3], [18, 21, 16, 23]];
  const c = (v: number) => Math.max(0, Math.min(23, v));
  // dark edge under, then a 2-texel bright split: bold enough to read over busy sprite art
  for (const [x0, y0, x1, y1] of lines) for (const [dx, dy] of [[1, 1], [2, 1], [1, 2]] as const) b.line(c(x0 + dx), c(y0 + dy), c(x1 + dx), c(y1 + dy), C.black);
  for (const [x0, y0, x1, y1] of lines) { b.line(x0, y0, x1, y1, C.white); b.line(c(x0 + 1), y0, c(x1 + 1), y1, C.white); }
  b.rect(11, 11, 2, 2, C.iceBlue);
  return b;
}

function goadArt(): PixelBuffer {
  // a red "!" taunt mark, black outlined
  const b = new PixelBuffer(7, 13, -1);
  b.rect(1, 0, 5, 9, C.black); b.rect(1, 10, 5, 3, C.black);
  b.rect(2, 1, 3, 7, C.red); b.rect(2, 11, 3, 1, C.red);
  b.rect(3, 1, 1, 2, C.pink);
  return b;
}

let crackTex: THREE.DataTexture | null = null;
let goadTex: THREE.DataTexture | null = null;

/** Marks drawn on an enemy sprite (children of the sprite mesh: they bob and shake with it). */
export class SpriteMarks {
  private readonly crack: THREE.Mesh<THREE.BufferGeometry, SpriteMaterial>;
  private readonly goad: THREE.Mesh<THREE.BufferGeometry, SpriteMaterial>;
  private readonly sprite: Sprite;
  private t = 0;
  private goadOn = false;
  private crackOn = false;
  private crackT = 0;

  constructor(sprite: Sprite) {
    this.sprite = sprite;
    crackTex ??= textureFromPixels(crackArt());
    goadTex ??= textureFromPixels(goadArt());
    const s = sprite.pixelScale;
    this.crack = new THREE.Mesh(quadGeometry(24 * s, 24 * s), spriteMaterial(crackTex));
    this.goad = new THREE.Mesh(quadGeometry(7 * s, 13 * s), spriteMaterial(goadTex));
    for (const m of [this.crack, this.goad]) { m.visible = false; sprite.add(m); }
    this.layout();
  }

  /** Re-centre after the sprite's scale changed. */
  layout(): void {
    const s = this.sprite.pixelScale;
    this.crack.geometry = quadGeometry(24 * s, 24 * s);
    this.goad.geometry = quadGeometry(7 * s, 13 * s);
    this.crack.position.set(Math.round(this.sprite.w / 2 - 12 * s), Math.round(this.sprite.h / 3 - 12 * s), 0);
    this.goad.position.set(Math.round(this.sprite.w / 2 + 14 * s), -2 * s, 0);
  }

  set(crack: boolean, goad: boolean): void {
    if (crack && !this.crackOn) this.crackT = 200; // the crack spreads in (blinks) when it first appears
    this.crackOn = crack;
    this.goadOn = goad;
    this.crack.visible = crack;
    this.goad.visible = goad;
  }

  get cracked(): boolean { return this.crackOn; }
  get goaded(): boolean { return this.goadOn; }

  update(dtMs: number): void {
    this.t += dtMs;
    const ro = this.sprite.renderOrder + 1;
    this.crack.renderOrder = ro;
    this.goad.renderOrder = ro;
    if (this.crackT > 0) { this.crackT -= dtMs; this.crack.visible = this.crackOn && (this.crackT <= 0 || Math.floor(this.crackT / 50) % 2 === 0); }
    if (this.goadOn) {
      // the taunt mark bounces a pixel and flashes white once a second (palette-exact: a flash, not a tint)
      const s = this.sprite.pixelScale;
      this.goad.position.y = -2 * s - (Math.floor(this.t / 250) % 2) * s;
      this.goad.material.uniforms.uFlash.value = this.t % 1000 < 80 ? 1 : 0;
    }
  }

  dispose(): void {
    for (const m of [this.crack, this.goad]) { m.removeFromParent(); m.material.dispose(); }
  }
}
