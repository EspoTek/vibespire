/**
 * Hand and strip layouts for the combat screen (pure).
 */
import { fanLayout, type FanSlot } from '../layout.ts';

/** The hand area: between the player box (left) and the energy/end-turn column (right). */
export const HAND = { left: 128, right: 512, baseY: 270, cardW: 64, gap: 3, arc: 5 } as const;

/** Top-left of each card for a hand of n (0..10): spread, squeezed to the hand area, fanned. */
export function handSlots(n: number): FanSlot[] {
  if (!Number.isInteger(n) || n < 0 || n > 10) throw new Error(`handSlots: hand of ${n} (0..10)`);
  return fanLayout(n, HAND.cardW, {
    centerX: Math.floor((HAND.left + HAND.right) / 2),
    baseY: HAND.baseY,
    maxWidth: HAND.right - HAND.left,
    gap: HAND.gap,
    arc: HAND.arc,
  });
}

export interface TimelineEntryLike { uid: number; dueTurn: number; seq: number }

export interface TimelineSlot { uid: number; /** 0 = next turn, 1 = +2, 2 = +3 */ col: number; row: number; x: number; y: number }

/**
 * Timeline window geometry (GDD §2.8): a PS window at the top centre, three columns "NEXT TURN /
 * IN 2 / IN 3" with one mini-card chip per row; `rows` rows show (more: the header counts them).
 * The window stays clear of the relic strip (x < 156), the card detail (x < 154) and the intents (y >= 46).
 */
export const TIMELINE = { x: 162, y: 5, colW: 100, gapX: 4, chipW: 96, chipH: 12, headerH: 11, perRow: 1, rows: 2 } as const;

/** The Timeline window's frame (black fill, white 2 px border) around the columns. */
export function timelineWindowRect(): { x: number; y: number; w: number; h: number } {
  return { x: TIMELINE.x - 4, y: TIMELINE.y - 4, w: 3 * TIMELINE.colW + 2 * TIMELINE.gapX + 8, h: TIMELINE.headerH + TIMELINE.rows * (TIMELINE.chipH + 1) + 7 };
}

/**
 * Place entries by turns-until-resolution (dueTurn - turn, clamped to 1..3), in seq order within
 * a column; TIMELINE.perRow chips per row. Entries already due (<= turn) sit in the first column.
 */
export function timelineSlots(entries: readonly TimelineEntryLike[], turn: number): TimelineSlot[] {
  const cols: TimelineEntryLike[][] = [[], [], []];
  for (const e of [...entries].sort((a, b) => a.seq - b.seq)) {
    const c = Math.min(3, Math.max(1, e.dueTurn - turn)) - 1;
    (cols[c] as TimelineEntryLike[]).push(e);
  }
  const out: TimelineSlot[] = [];
  cols.forEach((list, col) => {
    list.forEach((e, i) => {
      const row = Math.floor(i / TIMELINE.perRow);
      out.push({
        uid: e.uid, col, row,
        x: TIMELINE.x + col * (TIMELINE.colW + TIMELINE.gapX) + 2 + (i % TIMELINE.perRow) * (TIMELINE.chipW + 2),
        y: TIMELINE.y + TIMELINE.headerH + row * (TIMELINE.chipH + 1),
      });
    });
  });
  return out;
}

/** Enemy plate width: six of them plus gaps still fit the 640 px battle line. */
export const PLATE_W = 96;
/** Widest the battle line may get (640 minus a margin each side). */
const BATTLE_LINE_W = 632;

const enemyGap = (n: number): number => (n <= 2 ? 40 : n === 3 ? 20 : 8);

/**
 * Integer scale for every enemy in a fight, from their art widths at 1x: 2x (bosses 96 -> 192)
 * while the whole line (each slot as wide as its sprite or plate) fits, else 1x.
 */
export function battleScale(artWidths: readonly number[]): 1 | 2 {
  const n = artWidths.length;
  const at2 = artWidths.reduce((a, w) => a + Math.max(w * 2, PLATE_W), 0) + enemyGap(n) * Math.max(0, n - 1);
  return at2 <= BATTLE_LINE_W ? 2 : 1;
}

/** Centre x of each of `n` enemies (1..6) across the battle line. */
export function enemyCenters(n: number, widths: readonly number[]): number[] {
  if (n === 0) return [];
  if (widths.length !== n) throw new Error(`enemyCenters: ${widths.length} widths for ${n} enemies`);
  const gap = enemyGap(n);
  const total = widths.reduce((a, b) => a + b, 0) + gap * (n - 1);
  let x = Math.floor(320 - total / 2);
  return widths.map((w) => {
    const c = x + Math.floor(w / 2);
    x += w + gap;
    return c;
  });
}
