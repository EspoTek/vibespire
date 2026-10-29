/**
 * Backdrop: a full-screen 640x360 quad showing one texture from a keyed set (the generated
 * backdrops in app.assets.backdrops, or the procedural dev set).
 */
import * as THREE from 'three';
import { quadGeometry, spriteMaterial, type SpriteMaterial } from '../gfx.ts';
import { H, SCREEN, W } from '../layout.ts';
import { Widget, Z } from './Widget.ts';

export class Backdrop<K extends string = string> extends Widget {
  private readonly mesh: THREE.Mesh<THREE.BufferGeometry, SpriteMaterial>;
  private readonly textures: Readonly<Record<K, THREE.Texture>>;
  private _id: K;

  constructor(textures: Readonly<Record<K, THREE.Texture>>, id: K) {
    super(SCREEN, 'backdrop');
    this.textures = textures;
    this._id = id;
    this.mesh = this.addPart(new THREE.Mesh(quadGeometry(W, H), spriteMaterial(textures[id])), 0);
    this.setZ(Z.BACKDROP);
  }

  get backdropId(): K { return this._id; }

  set(id: K): void {
    this._id = id;
    this.mesh.material.uniforms.map.value = this.textures[id];
  }

  /**
   * Darken by whole SMS levels (0..3) behind modals. Palette-safe, unlike a tint multiply, which
   * would produce off-palette colours.
   */
  setDim(levels: number): void {
    if (!Number.isInteger(levels) || levels < 0 || levels > 3) throw new Error(`Backdrop.setDim: 0..3, got ${levels}`);
    this.mesh.material.uniforms.uDim.value = levels;
  }
}
