import '../testpack-only';
import { describe, expect, it } from 'vitest';
import { bossNode, generateMap, nextNodes, parentsOf } from '../../src/engine/map';
import { hashString } from '../../src/engine/rng';
import { TUNING } from '../../src/engine/tuning';
import type { ActMap, MapNode } from '../../src/engine/types';

const M = TUNING.map;
const ELITES = ['elite_a', 'elite_b', 'elite_c'];

function allNodes(map: ActMap): MapNode[] {
  return map.rows.flat();
}

function checkInvariants(map: ActMap, seed: string): void {
  const ctx = `seed ${seed}`;
  expect(map.rows.length, ctx).toBe(M.rows + 1);
  const boss = bossNode(map);
  expect(boss.row).toBe(M.rows);

  for (let r = 0; r < M.rows; r++) {
    const row = map.rows[r] ?? [];
    expect(row.length, `${ctx} row ${r} empty`).toBeGreaterThan(0);
    for (const n of row) {
      expect(n.row).toBe(r);
      expect(n.col).toBeGreaterThanOrEqual(0);
      expect(n.col).toBeLessThan(M.cols);
      // every node connects up and (except row 0) has a parent
      expect(n.edges.length, `${ctx} dead end at ${r},${n.col}`).toBeGreaterThan(0);
      if (r > 0) expect(parentsOf(map, n).length, `${ctx} orphan ${r},${n.col}`).toBeGreaterThan(0);
      for (const e of n.edges) {
        if (r === M.rows - 1) expect(e).toBe(M.bossCol);
        else expect(Math.abs(e - n.col)).toBeLessThanOrEqual(1);
      }
      // row rules
      if (r === 0) expect(n.type).toBe('monster');
      if (r === M.treasureRow) expect(n.type).toBe('treasure');
      if (r === M.rows - 1) expect(n.type).toBe('rest');
      if (r < 5) expect(['elite', 'rest']).not.toContain(n.type);
      if (r === M.rows - 2) expect(n.type).not.toBe('rest');
      if (n.type === 'elite') expect(ELITES).toContain(n.encounterId);
      else expect(n.encounterId).toBeUndefined();
      expect(n.type).not.toBe('boss');
      for (const p of parentsOf(map, n)) {
        if (['elite', 'rest', 'shop'].includes(n.type)) expect(p.type, `${ctx} ${n.type} twice in a row`).not.toBe(n.type);
      }
    }
    // no crossings between row r and r+1
    if (r < M.rows - 1) {
      const edges: [number, number][] = row.flatMap((n) => n.edges.map((e): [number, number] => [n.col, e]));
      for (const [a, b] of edges) {
        for (const [c, d] of edges) {
          expect(a < c && b > d, `${ctx} crossing at row ${r}: ${a}->${b} x ${c}->${d}`).toBe(false);
        }
      }
    }
  }

  // reachability: every node reachable from row 0, boss reachable from every node
  const reach = new Set<string>();
  const stack = [...nextNodes(map, null)];
  while (stack.length) {
    const n = stack.pop() as MapNode;
    const key = `${n.row}:${n.col}`;
    if (reach.has(key)) continue;
    reach.add(key);
    stack.push(...nextNodes(map, n));
  }
  expect(reach.size).toBe(allNodes(map).length);
  expect(reach.has(`${M.rows}:${M.bossCol}`)).toBe(true);

  const nodes = allNodes(map);
  // elites cycle through the pool: no repeat until all have appeared
  const elites = nodes.filter((n) => n.type === 'elite').map((n) => n.encounterId);
  for (let i = 0; i + ELITES.length <= elites.length; i += ELITES.length) expect(new Set(elites.slice(i, i + ELITES.length)).size).toBe(ELITES.length);
  expect(nodes.filter((n) => n.type === 'shop').length).toBeGreaterThanOrEqual(M.minShops);
  expect(nodes.filter((n) => n.type === 'elite').length).toBeGreaterThanOrEqual(M.minElites);
}

describe('map generation', () => {
  it('holds invariants over 1000 seeds', () => {
    for (let i = 0; i < 1000; i++) {
      const seed = `map-${i}`;
      checkInvariants(generateMap(hashString(seed), 1, 'boss_x', ELITES), seed);
    }
  });

  it('is deterministic per seed and varies across seeds', () => {
    const a = generateMap(hashString('same'), 1, 'b', ELITES);
    const b = generateMap(hashString('same'), 1, 'b', ELITES);
    const c = generateMap(hashString('other'), 1, 'b', ELITES);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(c));
  });

  it('has a sensible type mix on average', () => {
    const counts: Record<string, number> = {};
    let total = 0;
    for (let i = 0; i < 200; i++) {
      for (const n of allNodes(generateMap(hashString(`mix-${i}`), 1, 'b', ELITES))) {
        counts[n.type] = (counts[n.type] ?? 0) + 1;
        total++;
      }
    }
    expect((counts.monster ?? 0) / total).toBeGreaterThan(0.3);
    expect(counts.event ?? 0).toBeGreaterThan(0);
  });
});
