/**
 * Focus navigation picking (pure; FocusManager in focus.ts applies it to widgets).
 *
 * Two layers:
 *  1. List order: a focusable that belongs to a list (a hand of cards, a vertical menu) moves to
 *     the previous/next enabled member when the pressed direction runs along the list's axis,
 *     regardless of geometry (fanned/overlapping cards would confuse a spatial search). At an end,
 *     `wrap` lists wrap; non-wrapping lists fall through to spatial navigation.
 *  2. Spatial: the nearest enabled+visible candidate in the half-plane of the direction, scored
 *     `along + 2*|across|` between rect centres, so aligned targets beat merely close ones.
 */
import type { Rect } from './layout.ts';

export type Dir = 'up' | 'down' | 'left' | 'right';

export interface ListMembership {
  /** Identity of the list; members share it. */
  key: string;
  index: number;
  axis: 'x' | 'y';
  wrap: boolean;
}

export interface NavNode {
  rect: Rect;
  /** Disabled nodes are skipped by every kind of navigation. */
  enabled: boolean;
  /** Invisible nodes (e.g. scrolled out of a list window) are reachable by list order only. */
  visible: boolean;
  list?: ListMembership | undefined;
}

const cx = (r: Rect) => r.x + r.w / 2;
const cy = (r: Rect) => r.y + r.h / 2;

function alongAxis(dir: Dir): 'x' | 'y' { return dir === 'left' || dir === 'right' ? 'x' : 'y'; }
function stepOf(dir: Dir): 1 | -1 { return dir === 'right' || dir === 'down' ? 1 : -1; }

/** Next member of `cur`'s list in `dir`, or null at a non-wrapping end (caller falls back to spatial). */
export function listNextOrNull<T extends NavNode>(cur: T, dir: Dir, all: readonly T[]): T | null {
  const list = cur.list;
  if (!list) throw new Error('listNextOrNull: current node is not in a list');
  if (alongAxis(dir) !== list.axis) return null;
  const members = all
    .filter((n) => n.list?.key === list.key && (n.enabled || n === cur))
    .sort((a, b) => (a.list as ListMembership).index - (b.list as ListMembership).index);
  const i = members.indexOf(cur);
  if (i < 0) throw new Error(`listNextOrNull: node not found among members of list "${list.key}"`);
  const step = stepOf(dir);
  const j = i + step;
  if (j >= 0 && j < members.length) return members[j] as T;
  if (!list.wrap || members.length < 2) return null;
  return members[(j + members.length) % members.length] as T;
}

/** Nearest enabled, visible node in `dir` from `cur`, or null when nothing lies that way (stay put). */
export function spatialNextOrNull<T extends NavNode>(cur: T, dir: Dir, all: readonly T[]): T | null {
  let best: T | null = null;
  let bestScore = Infinity;
  for (const n of all) {
    if (n === cur || !n.enabled || !n.visible) continue;
    const dx = cx(n.rect) - cx(cur.rect);
    const dy = cy(n.rect) - cy(cur.rect);
    const along = dir === 'left' ? -dx : dir === 'right' ? dx : dir === 'up' ? -dy : dy;
    const across = dir === 'left' || dir === 'right' ? dy : dx;
    if (along <= 0) continue;
    const score = along + 2 * Math.abs(across);
    if (score < bestScore) { bestScore = score; best = n; }
  }
  return best;
}

/**
 * Where focus goes when `dir` is pressed on `cur`. Null = nowhere to go (an expected outcome: the
 * focus stays put at the edge of the layout).
 */
export function pickNextOrNull<T extends NavNode>(cur: T, dir: Dir, all: readonly T[]): T | null {
  if (cur.list) {
    const inList = listNextOrNull(cur, dir, all);
    if (inList) return inList;
    // Leaving a list spatially: don't land on another member of the same list.
    const others = all.filter((n) => n.list?.key !== cur.list?.key || n === cur);
    return spatialNextOrNull(cur, dir, others);
  }
  return spatialNextOrNull(cur, dir, all);
}

/** First enabled+visible node in reading order (top-to-bottom, left-to-right), or null if none. */
export function firstFocusableOrNull<T extends NavNode>(all: readonly T[]): T | null {
  let best: T | null = null;
  for (const n of all) {
    if (!n.enabled || !n.visible) continue;
    if (!best || n.rect.y < best.rect.y || (n.rect.y === best.rect.y && n.rect.x < best.rect.x)) best = n;
  }
  return best;
}
