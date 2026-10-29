/**
 * Bitmap text in three.js. A BitmapFont owns one glyph-atlas texture (generated at startup from
 * the embedded bit data, pixel exact, no canvas text) and ONE shared material. A Text is one mesh
 * whose geometry has a quad per glyph (plus per shadow/outline copy) with a per-vertex colour, so
 * any number of Texts in any colours cost one program and one draw call each.
 *
 * Layout (wrapping, alignment, markup) is pure and lives in textLayout.ts.
 */
import * as THREE from 'three';
import { textureFromPixels } from './gfx.ts';
import { C } from './palette.ts';
import { buildGlyphAtlas } from './pixels.ts';
import { layoutText, type Align, type FontData, type TextLayout } from './textLayout.ts';

const textVertex = /* glsl */ `
attribute vec3 aColor;
varying vec2 vUv;
varying vec3 vColor;
void main() {
  vUv = uv;
  vColor = aColor;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const textFragment = /* glsl */ `
uniform sampler2D map;
varying vec2 vUv;
varying vec3 vColor;
void main() {
  if (texture2D(map, vUv).a < 0.5) discard;
  gl_FragColor = vec4(vColor, 1.0);
  #include <colorspace_fragment>
}`;

export class BitmapFont {
  readonly data: FontData;
  readonly texture: THREE.DataTexture;
  /** Shared by every Text in this font. Never dispose per-Text. */
  readonly material: THREE.ShaderMaterial;
  private readonly cols: number;
  private readonly index: ReadonlyMap<string, number>;
  private readonly texW: number;
  private readonly texH: number;

  constructor(data: FontData) {
    const atlas = buildGlyphAtlas(data);
    this.data = data;
    this.cols = atlas.cols;
    this.index = atlas.index;
    this.texW = atlas.pixels.w;
    this.texH = atlas.pixels.h;
    this.texture = textureFromPixels(atlas.pixels);
    this.material = new THREE.ShaderMaterial({
      uniforms: { map: { value: this.texture } },
      vertexShader: textVertex,
      fragmentShader: textFragment,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.material.userData.shared = true;
  }

  /** UV rect (u0, v0 bottom, u1, v1 top) of a glyph's cell. Throws on unknown characters. */
  uv(ch: string): [number, number, number, number] {
    const i = this.index.get(ch);
    if (i === undefined) throw new Error(`${this.data.name}: no glyph for ${JSON.stringify(ch)}`);
    const x = (i % this.cols) * this.data.cellW;
    const y = Math.floor(i / this.cols) * this.data.cellH;
    const u0 = x / this.texW, u1 = (x + this.data.cellW) / this.texW;
    const vTop = 1 - y / this.texH, vBot = 1 - (y + this.data.cellH) / this.texH;
    return [u0, vBot, u1, vTop];
  }
}

export interface TextEffect { dx: number; dy: number; color: number }

export interface TextStyle {
  color?: number;
  align?: Align;
  /** Wrap width in logical px; also the alignment box. */
  maxWidth?: number;
  lineHeight?: number;
  /** Throw if wrapping needs more lines than this (or truncate with overflow 'ellipsis'). */
  maxLines?: number;
  overflow?: 'throw' | 'ellipsis';
  /** Parse `[colour]...[/]` markup (palette names from `C`). */
  markup?: boolean;
  /** 1px drop shadow (down-right) in this colour. */
  shadow?: number;
  /** 1px outline (8 neighbours) in this colour. */
  outline?: number;
  /** Extra offset copies drawn under the text (e.g. a two-tone logo shadow). In unscaled glyph px. */
  effects?: readonly TextEffect[];
  /** Integer magnification of glyph pixels (title logo = 3). */
  scale?: number;
}

const OUTLINE_OFFSETS: readonly [number, number][] = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
const tmpColor = new THREE.Color();

/**
 * A block of bitmap text. Origin = top-left of the layout box (for `center`/`right` without
 * `maxWidth`, the anchor x; see textLayout). Changing text/style rebuilds the small geometry.
 */
export class Text extends THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial> {
  readonly font: BitmapFont;
  private _text: string;
  private _style: TextStyle;
  private _layout: TextLayout;

  constructor(font: BitmapFont, text = '', style: TextStyle = {}) {
    super(new THREE.BufferGeometry(), font.material);
    this.font = font;
    this._text = text;
    this._style = { ...style };
    this._layout = this.rebuild();
  }

  get text(): string { return this._text; }
  get style(): Readonly<TextStyle> { return this._style; }
  get layout(): TextLayout { return this._layout; }
  /** Ink size of the laid-out text, in logical px (scaled). */
  get width(): number { return this._layout.width * (this._style.scale ?? 1); }
  get height(): number { return this._layout.height * (this._style.scale ?? 1); }

  setText(text: string): this {
    if (text !== this._text) { this._text = text; this._layout = this.rebuild(); }
    return this;
  }

  setStyle(patch: TextStyle): this {
    this._style = { ...this._style, ...patch };
    this._layout = this.rebuild();
    return this;
  }

  setColor(color: number): this {
    if (color !== this._style.color) this.setStyle({ color });
    return this;
  }

  place(x: number, y: number): this {
    this.position.set(Math.round(x), Math.round(y), 0);
    return this;
  }

  private rebuild(): TextLayout {
    const st = this._style;
    const scale = st.scale ?? 1;
    if (!Number.isInteger(scale) || scale < 1) throw new Error(`Text: scale must be a positive integer, got ${scale}`);
    const layout = layoutText(this.font.data, this._text, {
      ...(st.maxWidth !== undefined ? { maxWidth: Math.floor(st.maxWidth / scale) } : {}),
      ...(st.align !== undefined ? { align: st.align } : {}),
      ...(st.lineHeight !== undefined ? { lineHeight: st.lineHeight } : {}),
      ...(st.maxLines !== undefined ? { maxLines: st.maxLines } : {}),
      ...(st.overflow !== undefined ? { overflow: st.overflow } : {}),
      ...(st.markup !== undefined ? { markup: st.markup } : {}),
    });
    const base = st.color ?? C.text;
    const passes: TextEffect[] = [...(st.effects ?? [])];
    if (st.outline !== undefined) for (const [dx, dy] of OUTLINE_OFFSETS) passes.push({ dx, dy, color: st.outline });
    if (st.shadow !== undefined) passes.push({ dx: 1, dy: 1, color: st.shadow });

    const n = layout.glyphs.length * (passes.length + 1);
    const pos = new Float32Array(n * 12);
    const uv = new Float32Array(n * 8);
    const col = new Float32Array(n * 12);
    const idx = new Uint32Array(n * 6);
    const cw = this.font.data.cellW * scale, chh = this.font.data.cellH * scale;
    let q = 0;
    const emit = (gx: number, gy: number, ch: string, color: number) => {
      const x0 = gx * scale, y0 = gy * scale, x1 = x0 + cw, y1 = y0 + chh;
      pos.set([x0, y0, 0, x1, y0, 0, x0, y1, 0, x1, y1, 0], q * 12);
      const [u0, vb, u1, vt] = this.font.uv(ch);
      uv.set([u0, vt, u1, vt, u0, vb, u1, vb], q * 8);
      tmpColor.setHex(color); // sRGB hex -> linear working space
      for (let k = 0; k < 4; k++) col.set([tmpColor.r, tmpColor.g, tmpColor.b], q * 12 + k * 3);
      const v = q * 4;
      idx.set([v, v + 2, v + 1, v + 2, v + 3, v + 1], q * 6);
      q++;
    };
    // effects first (underneath), then the text itself
    for (const p of passes) for (const g of layout.glyphs) emit(g.x + p.dx, g.y + p.dy, g.ch, p.color);
    for (const g of layout.glyphs) emit(g.x, g.y, g.ch, g.color ?? base);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    this.geometry.dispose();
    this.geometry = geo;
    return layout;
  }

  override dispose(): void {
    this.geometry.dispose();
    super.dispose();
  }
}
