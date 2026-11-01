/**
 * Pixel particles: hard-edged squares and tiny sprites (plus, star, leaf, card back) in palette
 * colours, at whole logical pixels, with no alpha: they end by blinking out, SMS style. One ticker
 * per system, driven by the Tweener, so hit-stop freezes them mid-air and speed scaling applies.
 * Math.random is fine here: cosmetic only, never game logic.
 */
import * as THREE from 'three';
import { quadGeometry, spriteMaterial, textureFromPixels, type SpriteMaterial } from '../gfx.ts';
import { C } from '../palette.ts';
import { PixelBuffer } from '../pixels.ts';
import type { Tweener } from '../tween.ts';
import { Z } from '../ui/Widget.ts';

export type Shape = 'px1' | 'px2' | 'px3' | 'plus' | 'star' | 'leaf' | 'cardback' | 'ring';

function shapeBuffer(shape: Shape): PixelBuffer {
  const W = C.white;
  switch (shape) {
    case 'px1': return new PixelBuffer(1, 1, W);
    case 'px2': return new PixelBuffer(2, 2, W);
    case 'px3': return new PixelBuffer(3, 3, W);
    case 'plus': { const b = new PixelBuffer(3, 3); b.set(1, 0, W); b.rect(0, 1, 3, 1, W); b.set(1, 2, W); return b; }
    case 'star': { const b = new PixelBuffer(5, 5); b.rect(2, 0, 1, 5, W); b.rect(0, 2, 5, 1, W); b.set(1, 1, W); b.set(3, 1, W); b.set(1, 3, W); b.set(3, 3, W); return b; }
    case 'leaf': { const b = new PixelBuffer(4, 3); b.rect(1, 0, 3, 1, W); b.rect(0, 1, 4, 1, W); b.rect(0, 2, 2, 1, W); return b; }
    case 'cardback': { const b = new PixelBuffer(6, 8, C.navy); b.strokeRect(0, 0, 6, 8, C.white); b.rect(2, 3, 2, 2, C.skyBlue); return b; }
    case 'ring': { const b = new PixelBuffer(7, 7); b.rect(2, 0, 3, 1, W); b.rect(2, 6, 3, 1, W); b.rect(0, 2, 1, 3, W); b.rect(6, 2, 1, 3, W); b.set(1, 1, W); b.set(5, 1, W); b.set(1, 5, W); b.set(5, 5, W); return b; }
  }
}

const shapeTex = new Map<Shape, { tex: THREE.DataTexture; w: number; h: number }>();
function shapeTexture(shape: Shape): { tex: THREE.DataTexture; w: number; h: number } {
  let t = shapeTex.get(shape);
  if (!t) { const b = shapeBuffer(shape); t = { tex: textureFromPixels(b), w: b.w, h: b.h }; shapeTex.set(shape, t); }
  return t;
}

interface P {
  mesh: THREE.Mesh<THREE.BufferGeometry, SpriteMaterial>;
  x: number; y: number; vx: number; vy: number;
  /** px/s² (positive = falls). */
  g: number;
  /** Velocity kept per second (1 = no drag). */
  drag: number;
  life: number; age: number;
  /** Sideways flutter amplitude (leaves). */
  wobble: number;
  /** Cycle through these colours while alive (palette flicker); one entry = steady. */
  colors: readonly number[];
  hw: number; hh: number;
}

export interface BurstOpts {
  n: number;
  colors: readonly number[];
  shapes?: readonly Shape[];
  /** Speed range px/s. */
  speed?: [number, number];
  /** Emission angle centre (radians; 0 = right, -PI/2 = up) and spread (full width). Default all round. */
  angle?: number;
  spread?: number;
  gravity?: number;
  drag?: number;
  life?: [number, number];
  /** Random start offset radius. */
  jitter?: number;
  wobble?: number;
  /** Each particle flickers through the colour list instead of picking one. */
  flicker?: boolean;
}

export class Particles {
  private readonly root: THREE.Object3D;
  private readonly tw: Tweener;
  private ps: P[] = [];
  private ticking = false;
  /** Hard cap so a runaway combo can't tank the frame rate. */
  private static readonly MAX = 260;

  constructor(root: THREE.Object3D, tw: Tweener) {
    this.root = root;
    this.tw = tw;
  }

  get count(): number { return this.ps.length; }

  burst(x: number, y: number, o: BurstOpts): void {
    const [s0, s1] = o.speed ?? [40, 120];
    const [l0, l1] = o.life ?? [300, 600];
    for (let i = 0; i < o.n; i++) {
      if (this.ps.length >= Particles.MAX) break;
      const shape = (o.shapes ?? ['px2'])[Math.floor(Math.random() * (o.shapes?.length ?? 1))] as Shape;
      const a = (o.angle ?? 0) + (o.spread ?? Math.PI * 2) * (Math.random() - 0.5);
      const v = s0 + (s1 - s0) * Math.random();
      const j = o.jitter ?? 2;
      const colors = o.flicker ? o.colors : [o.colors[Math.floor(Math.random() * o.colors.length)] as number];
      this.spawn(shape, x + (Math.random() * 2 - 1) * j, y + (Math.random() * 2 - 1) * j, Math.cos(a) * v, Math.sin(a) * v, {
        g: o.gravity ?? 0, drag: o.drag ?? 1, life: l0 + (l1 - l0) * Math.random(), wobble: o.wobble ?? 0, colors,
      });
    }
  }

  /** A ring of particles flying straight out (shockwave). */
  ring(x: number, y: number, n: number, speed: number, colors: readonly number[], shape: Shape = 'px2', life = 380): void {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      this.spawn(shape, x, y, Math.cos(a) * speed, Math.sin(a) * speed, { g: 0, drag: 0.15, life, wobble: 0, colors });
    }
  }

  /** A 1-3 frame slash over a target (PS attack effect): a diagonal line of pixels that blinks off. */
  slash(x: number, y: number, len: number, colors: readonly number[], life = 90): void {
    // a black cut with a bright edge: reads on a white / yellow hit silhouette and on dark art alike
    for (let i = 0; i < len; i += 1) {
      const sx = x + len / 2 - i, sy = y - len / 2 + i;
      this.spawn('px2', sx, sy, 0, 0, { g: 0, drag: 1, life, wobble: 0, colors: [C.black] });
      this.spawn('px1', sx + 2, sy + 1, 0, 0, { g: 0, drag: 1, life, wobble: 0, colors });
    }
  }

  /** One particle (trails). */
  spawn(shape: Shape, x: number, y: number, vx: number, vy: number, o: { g: number; drag: number; life: number; wobble: number; colors: readonly number[] }): void {
    if (this.ps.length >= Particles.MAX) return;
    const t = shapeTexture(shape);
    const mat = spriteMaterial(t.tex);
    mat.uniforms.uTint.value.setHex(o.colors[0] as number);
    const mesh = new THREE.Mesh(quadGeometry(t.w, t.h), mat);
    mesh.renderOrder = Z.TOAST - 15;
    this.root.add(mesh);
    const p: P = { mesh, x, y, vx, vy, g: o.g, drag: o.drag, life: o.life, age: 0, wobble: o.wobble, colors: o.colors, hw: t.w / 2, hh: t.h / 2 };
    this.place(p);
    this.ps.push(p);
    this.ensureTicking();
  }

  clear(): void {
    for (const p of this.ps) this.kill(p);
    this.ps = [];
  }

  private place(p: P): void {
    const wob = p.wobble ? Math.sin(p.age / 90) * p.wobble : 0;
    p.mesh.position.set(Math.round(p.x - p.hw + wob), Math.round(p.y - p.hh), 0);
  }

  private kill(p: P): void {
    p.mesh.removeFromParent();
    p.mesh.material.dispose();
  }

  private ensureTicking(): void {
    if (this.ticking) return;
    this.ticking = true;
    this.tw.every((dtMs) => {
      const dt = dtMs / 1000;
      const alive: P[] = [];
      for (const p of this.ps) {
        p.age += dtMs;
        if (p.age >= p.life || p.mesh.parent === null) { this.kill(p); continue; }
        p.vy += p.g * dt;
        const k = p.drag === 1 ? 1 : p.drag ** dt;
        p.vx *= k; p.vy *= k;
        p.x += p.vx * dt; p.y += p.vy * dt;
        this.place(p);
        const left = p.life - p.age;
        // SMS-style end of life: hard blink, never a fade
        p.mesh.visible = left > 120 || Math.floor(left / 40) % 2 === 0;
        if (p.colors.length > 1) p.mesh.material.uniforms.uTint.value.setHex(p.colors[Math.floor(p.age / 50) % p.colors.length] as number);
        alive.push(p);
      }
      this.ps = alive;
      if (alive.length === 0) { this.ticking = false; return false; }
      return true;
    });
  }
}
