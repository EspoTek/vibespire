/**
 * Sprite: a quad showing one atlas frame at an integer scale, with tint, white hit-flash, flip
 * and opacity as per-mesh uniforms (one shared program; see gfx.ts). Position with `place()`,
 * which rounds to the logical pixel grid.
 */
import * as THREE from 'three';
import { Atlas, quadGeometry, setFrameUv, spriteMaterial, type FrameRect, type SpriteMaterial } from './gfx.ts';
import type { Flashable } from './tween.ts';

export class Sprite extends THREE.Mesh<THREE.BufferGeometry, SpriteMaterial> implements Flashable {
  readonly atlas: Atlas;
  private _frame: FrameRect;
  private _frameName: string;
  private _scale: number;

  constructor(atlas: Atlas, frameName: string, scale = 1) {
    if (!Number.isInteger(scale) || scale < 1) throw new Error(`Sprite: scale must be a positive integer, got ${scale}`);
    const f = atlas.frame(frameName);
    super(quadGeometry(f.w * scale, f.h * scale), spriteMaterial(atlas.texture));
    this.atlas = atlas;
    this._frame = f;
    this._frameName = frameName;
    this._scale = scale;
    setFrameUv(this.material, f, atlas.width, atlas.height);
    this.material.uniforms.uTexSize.value.set(atlas.width, atlas.height);
  }

  get frameName(): string { return this._frameName; }
  /** Integer magnification of the frame. */
  get pixelScale(): number { return this._scale; }
  /** Drawn size in logical px. */
  get w(): number { return this._frame.w * this._scale; }
  get h(): number { return this._frame.h * this._scale; }

  setFrame(name: string): void {
    const f = this.atlas.frame(name);
    this._frame = f;
    this._frameName = name;
    this.geometry = quadGeometry(f.w * this._scale, f.h * this._scale);
    setFrameUv(this.material, f, this.atlas.width, this.atlas.height);
  }

  setScale(scale: number): void {
    if (!Number.isInteger(scale) || scale < 1) throw new Error(`Sprite.setScale: positive integer required, got ${scale}`);
    this._scale = scale;
    this.geometry = quadGeometry(this._frame.w * scale, this._frame.h * scale);
  }

  /** Top-left in logical px (rounded: the only place floats become pixels). */
  place(x: number, y: number): this {
    this.position.set(Math.round(x), Math.round(y), 0);
    return this;
  }

  /** Multiply colour. Only exact for white source pixels (solid rects); use setDim to darken art. */
  setTint(color: number): void { this.material.uniforms.uTint.value.setHex(color); }
  /** Step colours down by whole SMS levels (0..3): palette-safe darkening. */
  setDim(levels: number): void { this.material.uniforms.uDim.value = levels; }
  setFlash(on: boolean): void { this.material.uniforms.uFlash.value = on ? 1 : 0; }
  /** Colour of the flash silhouette (palette flashes: white, red, yellow...). Default white. */
  setFlashColor(color: number): void { this.material.uniforms.uFlashColor.value.setHex(color); }
  /** Ordered-dither dissolve, 0 (whole) .. 1 (gone), in whole source pixels. */
  setDissolve(k: number): void {
    if (!(k >= 0 && k <= 1)) throw new Error(`Sprite.setDissolve: k must be in 0..1, got ${k}`);
    this.material.uniforms.uDissolve.value = k;
  }
  setFlipX(on: boolean): void { this.material.uniforms.uFlip.value.x = on ? -1 : 1; }
  setOpacity(a: number): void { this.material.uniforms.uOpacity.value = a; }

  override dispose(): void {
    this.material.dispose();
    super.dispose();
  }
}
