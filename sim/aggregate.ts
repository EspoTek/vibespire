// Aggregate RunResults into the balance summary of ENGINE_SPEC section 10.

import { balanceMetrics, type BalanceMetrics } from './metrics';
import type { RunResult } from './types';

export interface Aggregate {
  runs: number;
  elapsedMs: number;
  policy: string[];
  byClass: Record<string, { runs: number; wins: number; winRate: number; avgFloor: number; avgActions: number }>;
  deathsByEncounter: Record<string, number>;
  avgHpByFloor: number[];
  cards: Record<string, { offered: number; picked: number; skipped: number; pickRate: number }>;
  /** Win rate of runs whose final deck contains the card minus win rate of runs without it. */
  cardWinDelta: Record<string, number>;
  relicWinDelta: Record<string, number>;
  avgDeckSizeByAct: number[];
  avgCombatTurns: number;
  avgDamagePerCombat: number;
  avgShardsEarnedByAct: number[];
  avgShardsSpentByAct: number[];
  /** Cap hits by cap id, and the share of player turns with a cap hit (healthy < 1%). */
  capHits: Record<string, number>;
  capHitsPerTurn: number;
  /** GDD §8.6 metrics per class (sim/metrics.ts; rendered by sim/report.ts). */
  metrics: Record<string, BalanceMetrics>;
}

const mean = (xs: readonly number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const round = (x: number): number => Math.round(x * 1000) / 1000;

function winDelta(results: readonly RunResult[], has: (r: RunResult) => boolean): number {
  const withIt = results.filter(has);
  const without = results.filter((r) => !has(r));
  if (!withIt.length || !without.length) return 0;
  return round(mean(withIt.map((r) => (r.won ? 1 : 0))) - mean(without.map((r) => (r.won ? 1 : 0))));
}

export function aggregate(results: readonly RunResult[], elapsedMs: number): Aggregate {
  const byClass: Aggregate['byClass'] = {};
  for (const cls of [...new Set(results.map((r) => r.classId))]) {
    const rs = results.filter((r) => r.classId === cls);
    const wins = rs.filter((r) => r.won).length;
    byClass[cls] = { runs: rs.length, wins, winRate: round(wins / rs.length), avgFloor: round(mean(rs.map((r) => r.floorReached))), avgActions: round(mean(rs.map((r) => r.actions))) };
  }
  const deathsByEncounter: Record<string, number> = {};
  for (const r of results) if (r.deathEncounter) deathsByEncounter[r.deathEncounter] = (deathsByEncounter[r.deathEncounter] ?? 0) + 1;
  const maxFloors = Math.max(0, ...results.map((r) => r.hpByFloor.length));
  const avgHpByFloor: number[] = [];
  for (let f = 0; f < maxFloors; f++) {
    const hs = results.flatMap((r) => (f < r.hpByFloor.length ? [r.hpByFloor[f] ?? 0] : []));
    avgHpByFloor.push(round(mean(hs)));
  }
  const cards: Aggregate['cards'] = {};
  const bump = (id: string, k: 'offered' | 'picked' | 'skipped'): void => {
    const c = (cards[id] ??= { offered: 0, picked: 0, skipped: 0, pickRate: 0 });
    c[k] += 1;
  };
  for (const r of results) {
    r.cardsOffered.forEach((id) => bump(id, 'offered'));
    r.cardsPicked.forEach((id) => bump(id, 'picked'));
    r.cardsSkipped.forEach((id) => bump(id, 'skipped'));
  }
  for (const c of Object.values(cards)) c.pickRate = round(c.offered ? c.picked / c.offered : 0);
  const cardWinDelta: Record<string, number> = {};
  for (const id of new Set(results.flatMap((r) => r.deckEnd))) cardWinDelta[id] = winDelta(results, (r) => r.deckEnd.includes(id));
  const relicWinDelta: Record<string, number> = {};
  for (const id of new Set(results.flatMap((r) => r.relics))) relicWinDelta[id] = winDelta(results, (r) => r.relics.includes(id));
  const avgDeckSizeByAct = [0, 1, 2].map((a) => round(mean(results.flatMap((r) => (r.deckSizeByAct[a] ? [r.deckSizeByAct[a] ?? 0] : [])))));
  return {
    runs: results.length,
    elapsedMs,
    policy: [...new Set(results.map((r) => r.policy))],
    byClass,
    deathsByEncounter,
    avgHpByFloor,
    cards,
    cardWinDelta,
    relicWinDelta,
    avgDeckSizeByAct,
    avgCombatTurns: round(mean(results.flatMap((r) => r.turnsPerCombat))),
    avgDamagePerCombat: round(mean(results.flatMap((r) => r.damageTakenPerCombat))),
    avgShardsEarnedByAct: [0, 1, 2].map((a) => round(mean(results.map((r) => r.shardsEarnedByAct[a] ?? 0)))),
    avgShardsSpentByAct: [0, 1, 2].map((a) => round(mean(results.map((r) => r.shardsSpentByAct[a] ?? 0)))),
    capHits: results.reduce<Record<string, number>>((acc, r) => {
      for (const [k, v] of Object.entries(r.capHits)) acc[k] = (acc[k] ?? 0) + v;
      return acc;
    }, {}),
    metrics: Object.fromEntries([...new Set(results.map((r) => r.classId))].map((cls) => [cls, balanceMetrics(results.filter((r) => r.classId === cls))])),
    capHitsPerTurn: round(
      results.reduce((a, r) => a + Object.values(r.capHits).reduce((x, y) => x + y, 0), 0) / Math.max(1, results.reduce((a, r) => a + r.turns, 0)),
    ),
  };
}
