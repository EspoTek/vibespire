/**
 * Pure rasterisers for UI chrome (no three.js): PS-style panels, card frames, segmented bars and
 * the procedural UI icon sheet. Widgets upload the results with gfx.textureFromPixels.
 */
import { C } from '../palette.ts';
import { bayer, PixelBuffer } from '../pixels.ts';
import { ICON_ALIASES, ICON_KEYS, ICON_SIZE, ICONS } from './iconArt.ts';

export { ICON_SIZE };

export interface PanelArt {
  fill?: number;
  border?: number;
  /** Border thickness (PS boxes: 2). */
  thickness?: number;
  /** If set, draw a separator line under a title bar of this height (px from the top edge). */
  titleBar?: number;
}

export function rasterizePanel(w: number, h: number, art: PanelArt = {}): PixelBuffer {
  const fill = art.fill ?? C.boxBg, border = art.border ?? C.border, t = art.thickness ?? 2;
  const b = new PixelBuffer(w, h);
  b.roundBox(0, 0, w, h, fill, border, t);
  if (art.titleBar !== undefined) b.rect(t, art.titleBar, w - 2 * t, t, border);
  return b;
}

// ------------------------------------------------------------------ card frame

export type CardKind = 'attack' | 'skill' | 'power' | 'curse' | 'status';

/** Card face geometry (64x88), exported so phase-2 layout and tests agree with the art. */
export const CARD = {
  W: 64,
  H: 88,
  cost: { x: 1, y: 1, size: 13 },
  /** Up to 2 lines of the 4x6 font (11 chars each) beside the cost bubble. */
  name: { x: 15, y: 2, w: 46, h: 12, lines: 2, lineHeight: 6 },
  art: { x: 16, y: 17, w: 32, h: 24 },
  type: { y: 44 },
  /** 5 lines of 14 chars at a 7 px pitch. */
  body: { x: 4, y: 51, w: 56, h: 34, lines: 5, lineHeight: 7 },
} as const;

export const CARD_COLORS: Readonly<Record<CardKind, { fill: number; band: number; trim: number }>> = {
  attack: { fill: C.maroon, band: C.darkRed, trim: C.pink },
  skill: { fill: C.navy, band: C.darkBlue, trim: C.skyBlue },
  power: { fill: C.violet, band: C.purple, trim: C.magenta },
  curse: { fill: C.black, band: C.darkGrey, trim: C.purple },
  status: { fill: C.darkGrey, band: C.black, trim: C.grey },
};

export function rasterizeCardFrame(kind: CardKind): PixelBuffer {
  const { W, H } = CARD;
  const col = CARD_COLORS[kind];
  const b = new PixelBuffer(W, H);
  b.roundBox(0, 0, W, H, col.fill, C.border, 2);
  // subtle dithered texture on the face
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) if (bayer(x, y, 3)) b.set(x, y, col.band);
  // name strip (black, under the name text)
  b.rect(CARD.name.x - 1, CARD.name.y, CARD.name.w + 1, CARD.name.h, C.black);
  // art slot frame: 1px black around the 32x24 window, window filled black (art drawn on top)
  b.rect(CARD.art.x - 1, CARD.art.y - 1, CARD.art.w + 2, CARD.art.h + 2, C.black);
  b.strokeRect(CARD.art.x - 2, CARD.art.y - 2, CARD.art.w + 4, CARD.art.h + 4, col.trim);
  // body text area
  b.rect(CARD.body.x - 1, CARD.body.y - 1, CARD.body.w + 2, CARD.body.h + 2, C.black);
  // cost bubble: PS-blue disc with white rim, top-left
  const c = CARD.cost;
  const r = c.size / 2;
  b.disc(c.x + r, c.y + r, r, C.border);
  b.disc(c.x + r, c.y + r, r - 1, C.psBlue);
  return b;
}

/** Placeholder art for the 32x24 slot: a dithered diagonal pattern in the card's colours. */
export function rasterizePlaceholderArt(kind: CardKind, seed: number): PixelBuffer {
  const col = CARD_COLORS[kind];
  const b = new PixelBuffer(CARD.art.w, CARD.art.h, C.black);
  for (let y = 0; y < b.h; y++) {
    for (let x = 0; x < b.w; x++) {
      const v = ((x + y + seed * 5) >> 2) & 3;
      b.set(x, y, v === 0 ? col.trim : v === 1 ? col.band : bayer(x, y, 6) ? col.fill : C.black);
    }
  }
  return b;
}

// ------------------------------------------------------------------ bars

export interface BarArt {
  fill: number;
  back?: number;
  /** Frame colour (default black). */
  border?: number;
  /** Optional 1px highlight along the top of the fill. */
  hi?: number;
  /** Draw a 1px black gap every `segment` px of fill (segmented bars), or per unit when 'unit'. */
  segment?: number | 'unit';
}

/** Horizontal bar w x h: 1px border, fill proportional to value/max, rounded down to whole px. */
export function rasterizeBar(w: number, h: number, value: number, max: number, art: BarArt): PixelBuffer {
  if (max <= 0) throw new Error(`rasterizeBar: max must be > 0, got ${max}`);
  if (w < 3 || h < 3) throw new Error(`rasterizeBar: ${w}x${h} too small`);
  const b = new PixelBuffer(w, h, art.border ?? C.black);
  const iw = w - 2, ih = h - 2;
  b.rect(1, 1, iw, ih, art.back ?? C.hpBack);
  const v = Math.max(0, Math.min(max, value));
  const filled = Math.floor((iw * v) / max);
  b.rect(1, 1, filled, ih, art.fill);
  if (art.hi !== undefined && ih > 2) b.hline(1, 1, filled, art.hi);
  const seg = art.segment === 'unit' ? iw / max : art.segment;
  if (seg !== undefined) {
    for (let k = 1; k * seg < iw; k++) {
      const x = 1 + Math.round(k * seg);
      if (x < 1 + iw) b.vline(x, 1, ih, art.border ?? C.black);
    }
  }
  return b;
}

// ------------------------------------------------------------------ icons

export const ICON_NAMES: readonly string[] = Object.keys(ICONS);

/** All icons in one sheet, 8 per row; aliases (ICON_ALIASES) become extra frames on the same cells. */
export function rasterizeIconSheet(): { pixels: PixelBuffer; frames: Map<string, { x: number; y: number; w: number; h: number }> } {
  const cols = 8, n = ICON_NAMES.length;
  const pixels = new PixelBuffer(cols * ICON_SIZE, Math.ceil(n / cols) * ICON_SIZE);
  const frames = new Map<string, { x: number; y: number; w: number; h: number }>();
  ICON_NAMES.forEach((name, i) => {
    const rows = ICONS[name] as readonly string[];
    if (rows.length !== ICON_SIZE) throw new Error(`icon ${name}: ${rows.length} rows, want ${ICON_SIZE}`);
    const ox = (i % cols) * ICON_SIZE, oy = Math.floor(i / cols) * ICON_SIZE;
    rows.forEach((row, y) => {
      if (row.length !== ICON_SIZE) throw new Error(`icon ${name} row ${y}: ${row.length} px, want ${ICON_SIZE}`);
      [...row].forEach((ch, x) => {
        if (ch === '.') return;
        const c = ICON_KEYS[ch];
        if (c === undefined) throw new Error(`icon ${name}: unknown colour key "${ch}"`);
        pixels.set(ox + x, oy + y, c);
      });
    });
    frames.set(name, { x: ox, y: oy, w: ICON_SIZE, h: ICON_SIZE });
  });
  for (const [alias, target] of Object.entries(ICON_ALIASES)) {
    const f = frames.get(target);
    if (!f) throw new Error(`icon alias ${alias} -> unknown icon ${target}`);
    if (frames.has(alias)) throw new Error(`icon alias ${alias} shadows a real icon`);
    frames.set(alias, f);
  }
  return { pixels, frames };
}

// ------------------------------------------------------------------ combat bars

/**
 * HP bar with the GDD §2.3 defence overlay: HP fill (red), then a 2px strip along the top showing
 * Block (blue) followed by Guard (gold), each scaled to max HP and clipped to the bar.
 */
export function rasterizeHpBar(w: number, h: number, hp: number, maxHp: number, block: number, guard: number): PixelBuffer {
  if (maxHp <= 0) throw new Error(`rasterizeHpBar: maxHp ${maxHp}`);
  const b = new PixelBuffer(w, h, C.black);
  const iw = w - 2, ih = h - 2;
  b.rect(1, 1, iw, ih, C.hpBack);
  const hpW = Math.max(hp > 0 ? 1 : 0, Math.floor((iw * Math.max(0, Math.min(hp, maxHp))) / maxHp));
  b.rect(1, 1, hpW, ih, C.hp);
  const px = (v: number) => (v <= 0 ? 0 : Math.max(1, Math.floor((iw * v) / maxHp)));
  const bw = Math.min(iw, px(block));
  const gw = Math.min(iw - bw, px(guard));
  const strip = Math.min(2, ih);
  b.rect(1, 1, bw, strip, C.block);
  b.rect(1 + bw, 1, gw, strip, C.amber);
  return b;
}

/** Energy orb: a 26px amber disc with a dark rim (number drawn on top by the widget). */
export function rasterizeEnergyOrb(lit: boolean): PixelBuffer {
  const s = 26;
  const b = new PixelBuffer(s, s);
  b.disc(s / 2, s / 2, s / 2, C.black);
  b.disc(s / 2, s / 2, s / 2 - 1, lit ? C.amber : C.brown);
  b.disc(s / 2, s / 2, s / 2 - 4, lit ? C.yellow : C.rust);
  b.disc(s / 2 - 3, s / 2 - 4, 3, lit ? C.white : C.amber);
  return b;
}
