// Act map generation (ENGINE_SPEC section 9), STS-style.
//
// 15 rows x 7 columns, 6 random-walk paths from row 0 to row 14. Each step goes up,
// up-left or up-right and never crosses an existing edge. The union of the paths is the
// map. Row 15 holds the single boss node, connected from every row-14 node.
//
// Type rules (GDD §4.9): row 0 monster, row 8 treasure, row 14 rest; weights by row band
// (rows 1-4 / 5-7 and 9-12 / 13, TUNING.map.weights); elite/shop/rest never directly follows a
// parent of the same type; >= 1 shop and >= 2 elites (re-rolled otherwise).
// Elite nodes get a pre-assigned encounter (map stream): the act's elite pool shuffled and cycled,
// so no elite repeats until all have appeared (ENEMIES §4.2).

import { nextInt, shuffleInPlace, weightedPick } from './rng';
import { TUNING } from './tuning';
import type { Act, ActMap, EncounterId, MapNode, MapPos, NodeType, RngState } from './types';

const M = TUNING.map;

export function generateMap(rng: RngState, act: Act, bossEncounter: EncounterId, elitePool: readonly EncounterId[]): ActMap {
  if (elitePool.length === 0) throw new Error('generateMap: empty elite pool');
  for (let attempt = 0; attempt < M.maxAttempts; attempt++) {
    const adj = buildPaths(rng);
    const rows = buildNodes(adj);
    assignTypes(rng, rows);
    if (countType(rows, 'shop') >= M.minShops && countType(rows, 'elite') >= M.minElites) {
      let cycle: EncounterId[] = [];
      for (const row of rows) {
        for (const node of row) {
          if (node.type !== 'elite') continue;
          if (cycle.length === 0) cycle = shuffleInPlace(rng, [...elitePool]);
          const id = cycle.shift();
          if (id === undefined) throw new Error('elite cycle empty');
          node.encounterId = id;
        }
      }
      return { act, rows, bossEncounter };
    }
  }
  throw new Error(`generateMap: no valid map after ${M.maxAttempts} attempts`);
}

/** adj[r][c] = sorted list of columns in row r+1 that (r, c) connects to. */
function buildPaths(rng: RngState): number[][][] {
  const adj: number[][][] = [];
  for (let r = 0; r < M.rows - 1; r++) {
    const row: number[][] = [];
    for (let c = 0; c < M.cols; c++) row.push([]);
    adj.push(row);
  }
  let firstStart = -1;
  for (let p = 0; p < M.paths; p++) {
    let c = nextInt(rng, 0, M.cols - 1);
    if (p === 0) firstStart = c;
    // The first two paths start on different columns so every map has a real choice.
    while (p === 1 && c === firstStart) c = nextInt(rng, 0, M.cols - 1);
    for (let r = 0; r < M.rows - 1; r++) {
      const options = [c - 1, c, c + 1].filter((n) => n >= 0 && n < M.cols && !crosses(adj, r, c, n));
      const next = options[nextInt(rng, 0, options.length - 1)];
      if (next === undefined) throw new Error('buildPaths: no move (straight is always legal)');
      const out = cell(adj, r, c);
      if (!out.includes(next)) {
        out.push(next);
        out.sort((a, b) => a - b);
      }
      c = next;
    }
  }
  return adj;
}

function cell(adj: number[][][], r: number, c: number): number[] {
  const v = adj[r]?.[c];
  if (!v) throw new Error(`map adjacency out of range (${r},${c})`);
  return v;
}

/** Would the edge (r,a)->(r+1,b) cross an existing edge? */
function crosses(adj: number[][][], r: number, a: number, b: number): boolean {
  if (b === a + 1) return a + 1 < M.cols && cell(adj, r, a + 1).includes(a);
  if (b === a - 1) return a - 1 >= 0 && cell(adj, r, a - 1).includes(a);
  return false;
}

function buildNodes(adj: number[][][]): MapNode[][] {
  const present: boolean[][] = [];
  for (let r = 0; r < M.rows; r++) present.push(new Array<boolean>(M.cols).fill(false));
  for (let r = 0; r < M.rows - 1; r++) {
    for (let c = 0; c < M.cols; c++) {
      const out = cell(adj, r, c);
      if (out.length === 0) continue;
      setPresent(present, r, c);
      for (const n of out) setPresent(present, r + 1, n);
    }
  }
  const rows: MapNode[][] = [];
  for (let r = 0; r < M.rows; r++) {
    const row: MapNode[] = [];
    for (let c = 0; c < M.cols; c++) {
      if (!present[r]?.[c]) continue;
      const edges = r === M.rows - 1 ? [M.bossCol] : [...cell(adj, r, c)];
      row.push({ row: r, col: c, type: 'monster', edges });
    }
    rows.push(row);
  }
  rows.push([{ row: M.rows, col: M.bossCol, type: 'boss', edges: [] }]);
  return rows;
}

function setPresent(present: boolean[][], r: number, c: number): void {
  const row = present[r];
  if (!row) throw new Error(`map row out of range ${r}`);
  row[c] = true;
}

function assignTypes(rng: RngState, rows: MapNode[][]): void {
  for (let r = 0; r < M.rows; r++) {
    const row = rows[r];
    if (!row) throw new Error(`assignTypes: missing row ${r}`);
    for (const node of row) {
      if (r === 0) node.type = 'monster';
      else if (r === M.treasureRow) node.type = 'treasure';
      else if (r === M.rows - 1) node.type = 'rest';
      else {
        const parentTypes = parentsOf(rows, node).map((p) => p.type);
        const band = r <= 4 ? M.weights.early : r === M.rows - 2 ? M.weights.late : M.weights.mid;
        const options: [NodeType, number][] = [];
        for (const [type, w] of Object.entries(band) as [NodeType, number][]) {
          if (w <= 0) continue;
          if ((type === 'elite' || type === 'rest' || type === 'shop') && parentTypes.includes(type)) continue;
          options.push([type, w]);
        }
        node.type = weightedPick(rng, options);
      }
    }
  }
}

function countType(rows: MapNode[][], type: NodeType): number {
  let n = 0;
  for (const row of rows) for (const node of row) if (node.type === type) n++;
  return n;
}

// ---------------------------------------------------------------------------
// Queries

export function findNode(map: ActMap, pos: MapPos): MapNode | null {
  const row = map.rows[pos.row];
  if (!row) return null;
  return row.find((n) => n.col === pos.col) ?? null;
}

export function getNode(map: ActMap, pos: MapPos): MapNode {
  const n = findNode(map, pos);
  if (!n) throw new Error(`no map node at row ${pos.row} col ${pos.col}`);
  return n;
}

export function parentsOf(map: ActMap | MapNode[][], node: MapPos): MapNode[] {
  const rows = Array.isArray(map) ? map : map.rows;
  const prev = rows[node.row - 1];
  if (!prev) return [];
  return prev.filter((p) => p.edges.includes(node.col));
}

/** Nodes the player may travel to from `pos` (null = start of act: all row-0 nodes). */
export function nextNodes(map: ActMap, pos: MapPos | null): MapNode[] {
  if (pos === null) {
    const first = map.rows[0];
    if (!first) throw new Error('map has no row 0');
    return first;
  }
  const node = getNode(map, pos);
  return node.edges.map((col) => getNode(map, { row: pos.row + 1, col }));
}

export function bossNode(map: ActMap): MapNode {
  const row = map.rows[M.rows];
  const boss = row?.[0];
  if (!boss || boss.type !== 'boss') throw new Error('map has no boss node');
  return boss;
}
