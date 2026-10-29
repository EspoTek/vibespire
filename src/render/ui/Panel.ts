/**
 * Panel: the Phantasy Star box. Black fill, 2px white rounded border, optional title with a
 * separator. One textured quad (rasterised at its exact size) + optional title Text.
 */
import * as THREE from 'three';
import { fonts } from '../fonts.ts';
import { quadGeometry, spriteMaterial, textureFromPixels, type SpriteMaterial } from '../gfx.ts';
import { rect, type Rect } from '../layout.ts';
import { C } from '../palette.ts';
import { Text } from '../text.ts';
import { rasterizePanel } from './art.ts';
import { Widget } from './Widget.ts';

export interface PanelOptions {
  title?: string;
  fill?: number;
  border?: number;
  thickness?: number;
  /** Inner padding between the border and contentRect (default 4). */
  padding?: number;
}

/** Height reserved for a title row (title text + separator). */
export const PANEL_TITLE_H = 14;

export class Panel extends Widget {
  private readonly opts: PanelOptions;
  private mesh: THREE.Mesh<THREE.BufferGeometry, SpriteMaterial> | null = null;
  private tex: THREE.DataTexture | null = null;
  private titleText: Text | null = null;

  constructor(r: Rect, opts: PanelOptions = {}) {
    super(r, 'panel');
    this.opts = { ...opts };
    this.label = opts.title ?? '';
    this.redraw();
  }

  get thickness(): number { return this.opts.thickness ?? 2; }

  /** Absolute rect inside the border, padding and title row. */
  get contentRect(): Rect {
    const t = this.thickness, p = this.opts.padding ?? 4;
    const top = this.opts.title !== undefined ? PANEL_TITLE_H + t : 0;
    return rect(this.rect.x + t + p, this.rect.y + t + p + top, this.rect.w - 2 * (t + p), this.rect.h - 2 * (t + p) - top);
  }

  resize(w: number, h: number): void {
    if (w === this.rect.w && h === this.rect.h) return;
    this.rect = { ...this.rect, w, h };
    this.redraw();
  }

  setTitle(title: string | undefined): void {
    if (title === undefined) delete this.opts.title;
    else this.opts.title = title;
    this.redraw();
  }

  setColors(fill: number, border: number): void {
    this.opts.fill = fill;
    this.opts.border = border;
    this.redraw();
  }

  private redraw(): void {
    const { w, h } = this.rect;
    const t = this.thickness;
    const pixels = rasterizePanel(w, h, {
      fill: this.opts.fill ?? C.boxBg,
      border: this.opts.border ?? C.border,
      thickness: t,
      ...(this.opts.title !== undefined ? { titleBar: t + PANEL_TITLE_H - 2 } : {}),
    });
    if (this.mesh) this.removePart(this.mesh);
    this.tex?.dispose();
    this.tex = textureFromPixels(pixels);
    this.mesh = this.addPart(new THREE.Mesh(quadGeometry(w, h), spriteMaterial(this.tex)), 0);
    if (this.titleText) { this.removePart(this.titleText); this.titleText = null; }
    if (this.opts.title !== undefined) {
      this.titleText = this.addPart(new Text(fonts.ui, this.opts.title, { color: C.text, maxWidth: w - 2 * t - 8, align: 'center' }), 1);
      this.titleText.place(t + 4, t + 3);
    }
  }

  override dispose(): void {
    super.dispose();
    this.tex?.dispose();
  }
}
