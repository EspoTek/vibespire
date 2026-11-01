// Determinism / save-path check: replay every action the page applied (policy- and UI-initiated)
// in a headless engine from the same start and compare the final RunState with the page's.

import { actionKey, Game, type Action, type Difficulty, type RunState } from '../../../src/engine/index.ts';
import type { Violation } from './invariants.ts';

/** First path where two JSON values differ, or null when equal (object key order ignored). */
export function firstDiff(a: unknown, b: unknown, path = '$'): string | null {
  if (a === b) return null;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return `${path}: ${JSON.stringify(a)?.slice(0, 80)} vs ${JSON.stringify(b)?.slice(0, 80)}`;
  if (Array.isArray(a) !== Array.isArray(b)) return `${path}: array vs object`;
  const ka = Object.keys(a as object), kb = Object.keys(b as object);
  for (const k of new Set([...ka, ...kb])) {
    const d = firstDiff((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${path}.${k}`);
    if (d) return d;
  }
  return null;
}

export interface Start { save: string | null; seed: string; classId: string; difficulty: Difficulty }

export function replayParity(start: Start, applied: readonly Action[], pageState: RunState): Violation[] {
  const g = start.save !== null ? Game.load(start.save) : Game.newRun(start.seed, start.classId, { difficulty: start.difficulty });
  for (const [i, a] of applied.entries()) {
    try {
      g.apply(a);
    } catch (e) {
      return [{ code: 'replay-parity', msg: `headless replay of the page's actions: #${i} ${actionKey(a)} threw ${e instanceof Error ? e.message : String(e)}` }];
    }
  }
  const d = firstDiff(JSON.parse(JSON.stringify(g.state)), pageState);
  return d ? [{ code: 'replay-parity', msg: `page state differs from a headless replay of its ${applied.length} actions at ${d}` }] : [];
}
