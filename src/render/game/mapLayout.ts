/**
 * Act map layout (pure). Row 0 is at the bottom, the boss (row 15) at the top; columns spread
 * across the map panel. A small deterministic x jitter per node keeps it from looking like graph
 * paper, while staying on integer pixels.
 */

export interface MapNodeLike { row: number; col: number; type: string; edges: readonly number[] }

export interface MapLayoutOptions {
  /** Map panel width in px; nodes are centred in it. */
  width: number;
  /** Distance between rows. */
  rowGap: number;
  /** Distance between columns. */
  colGap: number;
  /** Padding above the boss row and below row 0. */
  pad: number;
  /** Highest column index the generator uses (STS-style maps: 6). */
  maxCol: number;
}

export interface PlacedNode { row: number; col: number; x: number; y: number }

export interface MapLayout {
  nodes: PlacedNode[];
  /** Total content height. */
  height: number;
  at(row: number, col: number): PlacedNode;
}

/**
 * Node boxes on the map screen (icon + 2 px focus margin): bosses are 28 px (2x icon), others 16 px.
 * The pad keeps the whole boss box inside the content: MapScreen hides any node that pokes out of the
 * view, and with pad 14 the boss (y = pad - 4 = 10, half 14) was never drawn, so mouse players had
 * no boss to click (docs/v2/bugs.md, BUG-1).
 */
export const MAP_NODE_BOX = { boss: 28, node: 16 } as const;

export const DEFAULT_MAP_LAYOUT: MapLayoutOptions = { width: 300, rowGap: 24, colGap: 42, pad: 18, maxCol: 6 };

function jitter(row: number, col: number): number {
  const h = Math.imul(row * 73856093 ^ col * 19349663, 0x5bd1e995) >>> 0;
  return (h % 7) - 3; // -3..3
}

export function layoutMap(rows: readonly (readonly MapNodeLike[])[], opts: MapLayoutOptions = DEFAULT_MAP_LAYOUT): MapLayout {
  const lastRow = rows.length - 1;
  const span = opts.maxCol * opts.colGap;
  const x0 = Math.floor((opts.width - span) / 2);
  const nodes: PlacedNode[] = [];
  rows.forEach((row, r) => {
    for (const n of row) {
      if (n.row !== r) throw new Error(`layoutMap: node in rows[${r}] says row ${n.row}`);
      const isBoss = r === lastRow && row.length === 1;
      const x = isBoss ? Math.floor(opts.width / 2) : x0 + n.col * opts.colGap + jitter(r, n.col);
      const y = opts.pad + (lastRow - r) * opts.rowGap + (isBoss ? -4 : 0);
      nodes.push({ row: r, col: n.col, x, y: Math.max(0, y) });
    }
  });
  const height = opts.pad * 2 + lastRow * opts.rowGap;
  const at = (row: number, col: number): PlacedNode => {
    const n = nodes.find((p) => p.row === row && p.col === col);
    if (!n) throw new Error(`layoutMap: no node at row ${row} col ${col}`);
    return n;
  };
  return { nodes, height, at };
}

/**
 * Scroll offset (px from the top of the content) that shows `focusY` inside a viewport of height
 * `viewH`, keeping `margin` px around it; clamped to the content.
 */
export function scrollToShow(current: number, focusY: number, viewH: number, contentH: number, margin = 40): number {
  const max = Math.max(0, contentH - viewH);
  let s = current;
  if (focusY - margin < s) s = focusY - margin;
  if (focusY + margin > s + viewH) s = focusY + margin - viewH;
  return Math.max(0, Math.min(max, Math.round(s)));
}
