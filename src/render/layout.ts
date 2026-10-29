/**
 * Layout maths in logical pixels (y down, top-left origin). Pure: no DOM, no three.js.
 * Everything returned here is an integer so meshes land exactly on the 640x360 grid.
 */

/** Logical resolution of the "VDP framebuffer". */
export const W = 640;
export const H = 360;

export interface Rect { x: number; y: number; w: number; h: number }
export interface Size { w: number; h: number }
export interface Point { x: number; y: number }

export const rect = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });
export const SCREEN: Readonly<Rect> = Object.freeze(rect(0, 0, W, H));

export function contains(r: Rect, x: number, y: number): boolean {
  return x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
}
export const centerX = (r: Rect): number => r.x + r.w / 2;
export const centerY = (r: Rect): number => r.y + r.h / 2;

export function inset(r: Rect, dx: number, dy: number = dx): Rect {
  return rect(r.x + dx, r.y + dy, r.w - 2 * dx, r.h - 2 * dy);
}
export function union(a: Rect, b: Rect): Rect {
  const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
  return rect(x, y, Math.max(a.x + a.w, b.x + b.w) - x, Math.max(a.y + a.h, b.y + b.h) - y);
}
export function rectsEqual(a: Rect, b: Rect): boolean {
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}

/** Centre a box of `size` inside `outer`, floored to integers. */
export function centerIn(outer: Rect, size: Size): Rect {
  return rect(outer.x + Math.floor((outer.w - size.w) / 2), outer.y + Math.floor((outer.h - size.h) / 2), size.w, size.h);
}

export type Anchor =
  | 'top-left' | 'top' | 'top-right'
  | 'left' | 'center' | 'right'
  | 'bottom-left' | 'bottom' | 'bottom-right';

/** Place a box of `size` at an anchor of `outer`, offset inward by `margin`. */
export function anchorIn(outer: Rect, size: Size, anchor: Anchor, margin = 0): Rect {
  const [v, hz] = anchor === 'center' ? ['center', 'center']
    : anchor === 'top' || anchor === 'bottom' ? [anchor, 'center']
    : anchor === 'left' || anchor === 'right' ? ['center', anchor]
    : (anchor.split('-') as [string, string]);
  const x = hz === 'left' ? outer.x + margin
    : hz === 'right' ? outer.x + outer.w - size.w - margin
    : outer.x + Math.floor((outer.w - size.w) / 2);
  const y = v === 'top' ? outer.y + margin
    : v === 'bottom' ? outer.y + outer.h - size.h - margin
    : outer.y + Math.floor((outer.h - size.h) / 2);
  return rect(x, y, size.w, size.h);
}

/** `n` boxes of width `itemW` in a row of total width `totalW`, `gap` apart, centred; returns x offsets. */
export function rowPositions(n: number, itemW: number, gap: number, totalW: number): number[] {
  const used = n * itemW + Math.max(0, n - 1) * gap;
  const x0 = Math.floor((totalW - used) / 2);
  return Array.from({ length: n }, (_, i) => x0 + i * (itemW + gap));
}

/** Split `r` into `n` equal-ish columns (remainder px go to the leftmost columns). */
export function columns(r: Rect, n: number, gap = 0): Rect[] {
  if (n <= 0) throw new Error(`columns: n=${n}`);
  const avail = r.w - gap * (n - 1);
  const base = Math.floor(avail / n), extra = avail - base * n;
  const out: Rect[] = [];
  let x = r.x;
  for (let i = 0; i < n; i++) {
    const w = base + (i < extra ? 1 : 0);
    out.push(rect(x, r.y, w, r.h));
    x += w + gap;
  }
  return out;
}

// ---------------------------------------------------------------- display / viewport

export interface Viewport {
  /** Integer scale from logical to device pixels (>= 1). */
  scale: number;
  /** Device-pixel offsets of the 640x360 image inside the canvas backing store. */
  left: number;
  top: number;
  /** Same gap measured from the bottom (WebGL viewport origin is bottom-left). */
  bottom: number;
}

/**
 * Largest integer scale that fits `backingW x backingH` device pixels, centred with integer
 * letterbox offsets. Never below 1 (a tiny window crops rather than going fractional).
 */
export function computeViewport(backingW: number, backingH: number, w = W, h = H): Viewport {
  const scale = Math.max(1, Math.floor(Math.min(backingW / w, backingH / h)));
  const left = Math.floor((backingW - w * scale) / 2);
  const bottom = Math.floor((backingH - h * scale) / 2);
  const top = backingH - bottom - h * scale;
  return { scale, left, top, bottom };
}

/**
 * Browser client coords -> logical pixel (integer, y down). `canvasRect` is the canvas's CSS box,
 * `backingW/H` its device-pixel backing store size.
 */
export function clientToLogical(
  clientX: number, clientY: number,
  canvasRect: { left: number; top: number; width: number; height: number },
  backingW: number, backingH: number, view: Viewport,
): Point & { inside: boolean } {
  const dx = (clientX - canvasRect.left) * (backingW / canvasRect.width);
  const dy = (clientY - canvasRect.top) * (backingH / canvasRect.height);
  const x = Math.floor((dx - view.left) / view.scale);
  const y = Math.floor((dy - view.top) / view.scale);
  return { x, y, inside: x >= 0 && y >= 0 && x < W && y < H };
}

// ---------------------------------------------------------------- tooltips

export type Side = 'above' | 'below' | 'right' | 'left';

/**
 * Position a tooltip of `size` next to `anchor`, trying `prefer` first, then the opposite side,
 * then the remaining sides; the chosen position is clamped so the box stays fully on `bounds`
 * (with `margin`). Returns integer coords.
 */
export function placeTooltip(anchor: Rect, size: Size, prefer: Side = 'above', bounds: Rect = SCREEN, gap = 2, margin = 2): Point & { side: Side } {
  const opposite: Record<Side, Side> = { above: 'below', below: 'above', left: 'right', right: 'left' };
  const order: Side[] = [prefer, opposite[prefer], ...(['above', 'below', 'right', 'left'] as Side[]).filter((s) => s !== prefer && s !== opposite[prefer])];
  const at = (s: Side): Point => {
    switch (s) {
      case 'above': return { x: Math.floor(centerX(anchor) - size.w / 2), y: anchor.y - gap - size.h };
      case 'below': return { x: Math.floor(centerX(anchor) - size.w / 2), y: anchor.y + anchor.h + gap };
      case 'right': return { x: anchor.x + anchor.w + gap, y: Math.floor(centerY(anchor) - size.h / 2) };
      case 'left': return { x: anchor.x - gap - size.w, y: Math.floor(centerY(anchor) - size.h / 2) };
    }
  };
  const minX = bounds.x + margin, maxX = bounds.x + bounds.w - margin - size.w;
  const minY = bounds.y + margin, maxY = bounds.y + bounds.h - margin - size.h;
  const fits = (p: Point, s: Side): boolean =>
    s === 'above' || s === 'below' ? p.y >= minY && p.y <= maxY : p.x >= minX && p.x <= maxX;
  const clamp = (v: number, lo: number, hi: number) => (hi < lo ? lo : Math.min(hi, Math.max(lo, v)));
  for (const s of order) {
    const p = at(s);
    if (fits(p, s)) return { x: clamp(p.x, minX, maxX), y: clamp(p.y, minY, maxY), side: s };
  }
  const p = at(prefer); // nothing fits on its axis: clamp the preferred placement onto the screen
  return { x: clamp(p.x, minX, maxX), y: clamp(p.y, minY, maxY), side: prefer };
}

// ---------------------------------------------------------------- hand fan

export interface FanSlot { x: number; y: number }

/**
 * Flat overlapping "fan" for a hand of `n` cards (no rotation: rotated pixel art goes jaggy at
 * 640x360). Cards are spread up to `gap` px apart, squeezed to fit `maxWidth`, centred on
 * `centerX`, and dropped by a shallow parabola (`arc` px at the ends) so the row reads as a fan.
 * Returns the top-left of each card.
 */
export function fanLayout(n: number, cardW: number, opts: { centerX: number; baseY: number; maxWidth: number; gap?: number; arc?: number }): FanSlot[] {
  if (n === 0) return [];
  const gap = opts.gap ?? 4;
  const arc = opts.arc ?? 6;
  const natural = n * cardW + (n - 1) * gap;
  const step = n === 1 ? 0 : natural <= opts.maxWidth ? cardW + gap : Math.floor((opts.maxWidth - cardW) / (n - 1));
  const total = (n - 1) * step + cardW;
  const x0 = Math.floor(opts.centerX - total / 2);
  const mid = (n - 1) / 2;
  return Array.from({ length: n }, (_, i) => {
    const t = mid === 0 ? 0 : (i - mid) / mid; // -1..1
    return { x: x0 + i * step, y: opts.baseY + Math.round(arc * t * t) };
  });
}
