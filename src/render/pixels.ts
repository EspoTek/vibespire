/**
 * PixelBuffer: an RGBA8 image in top-down row order that only accepts SMS palette colours.
 * All procedural art (backdrops, panels, card frames, bars, icons, glyph atlases) is rasterised
 * here, then uploaded by `gfx.ts` (`textureFromPixels`). Pure: no DOM, no three.js.
 *
 * Colours are 0xRRGGBB palette numbers; `TRANSPARENT` (-1) clears a pixel to alpha 0.
 * Dithering is ordered (4x4 Bayer), never a smooth gradient.
 */
import { assertPaletteColor } from './palette.ts';
import { glyphRows, type FontData } from './textLayout.ts';

export const TRANSPARENT = -1;

/** 4x4 Bayer matrix, values 0..15. */
const BAYER4: readonly number[] = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** True if the ordered-dither threshold at (x, y) is below `level` (0..16): level 8 = 50% checker-ish. */
export function bayer(x: number, y: number, level: number): boolean {
  return (BAYER4[(y & 3) * 4 + (x & 3)] as number) < level;
}

export class PixelBuffer {
  readonly w: number;
  readonly h: number;
  readonly data: Uint8ClampedArray;

  constructor(w: number, h: number, fill: number = TRANSPARENT) {
    if (!Number.isInteger(w) || !Number.isInteger(h) || w <= 0 || h <= 0) {
      throw new Error(`PixelBuffer: bad size ${w}x${h}`);
    }
    this.w = w;
    this.h = h;
    this.data = new Uint8ClampedArray(w * h * 4);
    if (fill !== TRANSPARENT) this.fill(fill);
  }

  /** Set one pixel; off-buffer writes are clipped (drawing primitives rely on clipping). */
  set(x: number, y: number, c: number): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    if (c === TRANSPARENT) {
      this.data[i] = 0; this.data[i + 1] = 0; this.data[i + 2] = 0; this.data[i + 3] = 0;
      return;
    }
    assertPaletteColor(c, 'PixelBuffer.set');
    this.data[i] = (c >> 16) & 0xff;
    this.data[i + 1] = (c >> 8) & 0xff;
    this.data[i + 2] = c & 0xff;
    this.data[i + 3] = 0xff;
  }

  /** Colour at (x, y), or TRANSPARENT. Throws outside the buffer. */
  get(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) throw new Error(`PixelBuffer.get(${x},${y}) outside ${this.w}x${this.h}`);
    const i = (y * this.w + x) * 4;
    if ((this.data[i + 3] as number) === 0) return TRANSPARENT;
    return ((this.data[i] as number) << 16) | ((this.data[i + 1] as number) << 8) | (this.data[i + 2] as number);
  }

  fill(c: number): void { this.rect(0, 0, this.w, this.h, c); }

  rect(x: number, y: number, w: number, h: number, c: number): void {
    if (c !== TRANSPARENT) assertPaletteColor(c, 'PixelBuffer.rect');
    const x0 = Math.max(0, x), y0 = Math.max(0, y);
    const x1 = Math.min(this.w, x + w), y1 = Math.min(this.h, y + h);
    for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) this.set(xx, yy, c);
  }

  hline(x: number, y: number, len: number, c: number): void { this.rect(x, y, len, 1, c); }
  vline(x: number, y: number, len: number, c: number): void { this.rect(x, y, 1, len, c); }

  /** 1px rectangle outline. */
  strokeRect(x: number, y: number, w: number, h: number, c: number): void {
    this.hline(x, y, w, c); this.hline(x, y + h - 1, w, c);
    this.vline(x, y, h, c); this.vline(x + w - 1, y, h, c);
  }

  /**
   * Ordered dither between `a` (level 0) and `b` (level 16) over a rect. `level` may be a function
   * of the pixel position for patterned ramps (still dithered, never blended).
   */
  dither(x: number, y: number, w: number, h: number, a: number, b: number, level: number | ((x: number, y: number) => number)): void {
    const x0 = Math.max(0, x), y0 = Math.max(0, y);
    const x1 = Math.min(this.w, x + w), y1 = Math.min(this.h, y + h);
    for (let yy = y0; yy < y1; yy++) {
      for (let xx = x0; xx < x1; xx++) {
        const lv = typeof level === 'number' ? level : level(xx, yy);
        this.set(xx, yy, bayer(xx, yy, lv) ? b : a);
      }
    }
  }

  /** Bresenham line, inclusive of both ends. */
  line(x0: number, y0: number, x1: number, y1: number, c: number): void {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) return;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  /** Filled circle (pixel centres within r of (cx, cy)). */
  disc(cx: number, cy: number, r: number, c: number): void {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
        if (dx * dx + dy * dy <= r * r) this.set(x, y, c);
      }
    }
  }

  /**
   * Phantasy Star box: `fill` interior, `border`-coloured frame `thickness` px wide (2 for PS) with
   * rounded corners (outer corner pixels transparent, inner corner pixel filled with border).
   */
  roundBox(x: number, y: number, w: number, h: number, fill: number, border: number, thickness = 2): void {
    if (w < 2 * thickness + 2 || h < 2 * thickness + 2) throw new Error(`roundBox: ${w}x${h} too small for border ${thickness}`);
    this.rect(x, y, w, h, border);
    this.rect(x + thickness, y + thickness, w - 2 * thickness, h - 2 * thickness, fill);
    // outer corners: cut a staircase of `thickness` pixels
    for (let i = 0; i < thickness; i++) {
      const n = thickness - i; // pixels to cut on row i
      for (let k = 0; k < n; k++) {
        this.set(x + k, y + i, TRANSPARENT);
        this.set(x + w - 1 - k, y + i, TRANSPARENT);
        this.set(x + k, y + h - 1 - i, TRANSPARENT);
        this.set(x + w - 1 - k, y + h - 1 - i, TRANSPARENT);
      }
    }
    // inner corners: one border pixel diagonally inside, so the inside reads rounded too
    const t = thickness;
    this.set(x + t, y + t, border);
    this.set(x + w - 1 - t, y + t, border);
    this.set(x + t, y + h - 1 - t, border);
    this.set(x + w - 1 - t, y + h - 1 - t, border);
  }

  /** Stamp a string in `font` at (x, y), single line, no wrapping. */
  text(font: FontData, s: string, x: number, y: number, c: number): void {
    let cx = x;
    for (const ch of s) {
      if (ch !== ' ') this.glyph(font, ch, cx, y, c);
      cx += font.advance;
    }
  }

  glyph(font: FontData, ch: string, x: number, y: number, c: number, scale = 1): void {
    const rows = glyphRows(font, ch);
    rows.forEach((bits, ry) => {
      for (let rx = 0; rx < font.cellW; rx++) {
        if ((bits >> rx) & 1) this.rect(x + rx * scale, y + ry * scale, scale, scale, c);
      }
    });
  }

  /** Copy another buffer in, skipping its transparent pixels. */
  blit(src: PixelBuffer, dx: number, dy: number): void {
    for (let y = 0; y < src.h; y++) {
      for (let x = 0; x < src.w; x++) {
        const c = src.get(x, y);
        if (c !== TRANSPARENT) this.set(dx + x, dy + y, c);
      }
    }
  }

  /** Every distinct opaque colour in the buffer (tests use this to check palette use). */
  colors(): Set<number> {
    const out = new Set<number>();
    for (let i = 0; i < this.data.length; i += 4) {
      if ((this.data[i + 3] as number) === 0) continue;
      out.add(((this.data[i] as number) << 16) | ((this.data[i + 1] as number) << 8) | (this.data[i + 2] as number));
    }
    return out;
  }
}

/**
 * Deterministic cosmetic PRNG for procedural art (mulberry32 is fine for decoration; game logic
 * uses the engine's seeded streams, never this).
 */
export function artRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Glyph atlas for a font: white glyphs on transparent, `cols` cells per row in `font.chars` order. */
export function buildGlyphAtlas(font: FontData, cols = 16): { pixels: PixelBuffer; cols: number; index: ReadonlyMap<string, number> } {
  const rows = Math.ceil(font.chars.length / cols);
  const pixels = new PixelBuffer(cols * font.cellW, rows * font.cellH);
  const index = new Map<string, number>();
  font.chars.forEach((ch, i) => {
    index.set(ch, i);
    pixels.glyph(font, ch, (i % cols) * font.cellW, Math.floor(i / cols) * font.cellH, 0xffffff);
  });
  return { pixels, cols, index };
}
