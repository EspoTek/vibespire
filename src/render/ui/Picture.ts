/**
 * Picture: a widget showing a procedurally drawn PixelBuffer (portraits, swatches, previews) at an
 * integer scale. Owns its texture.
 */
import * as THREE from 'three';
import { quadGeometry, spriteMaterial, textureFromPixels, updateTexturePixels } from '../gfx.ts';
import { rect } from '../layout.ts';
import type { PixelBuffer } from '../pixels.ts';
import { Widget } from './Widget.ts';

export class Picture extends Widget {
  private readonly tex: THREE.DataTexture;

  constructor(x: number, y: number, pixels: PixelBuffer, scale = 1) {
    if (!Number.isInteger(scale) || scale < 1) throw new Error(`Picture: scale must be a positive integer, got ${scale}`);
    super(rect(x, y, pixels.w * scale, pixels.h * scale), 'pic');
    this.tex = textureFromPixels(pixels);
    this.addPart(new THREE.Mesh(quadGeometry(pixels.w * scale, pixels.h * scale), spriteMaterial(this.tex)), 0);
  }

  /** Replace the image with a same-sized buffer. */
  redraw(pixels: PixelBuffer): void { updateTexturePixels(this.tex, pixels); }

  override dispose(): void {
    super.dispose();
    this.tex.dispose();
  }
}
