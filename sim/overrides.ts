// Balance overrides applied before runs (`--set key=value`, repeatable; sim/sweep.ts knobs).
//   TUNING leaves by dotted path:      enemyDamagePct.1=90  cardOdds.monster.rare=5  restHealPct=35
//   boolean switches (0/1):            bloomSpill=0
//   every act at once:                 enemyDamagePct.all=100  enemyHpPct.all=110 (both difficulty tiers)
//   one difficulty tier:               difficulty.heroic.enemyHpPct.all=110  difficulty.standard.enemyDamagePct.2=80
//   (the tier a batch plays is --difficulty standard|heroic, difficultyArg below)
//   class stats (ClassDef, all classes): class.maxHpDelta=-5  class.goldDelta=50
//   one class:                          class.breaker.maxHp=75
// Overrides are process-local: batch.ts re-applies them inside every worker.

import { allClasses, getClassDef } from '../src/content';
import { applyTuningOverrides, TUNING } from '../src/engine/tuning';
import { DIFFICULTIES, type Difficulty } from '../src/engine/types';

export type Overrides = Record<string, number>;

/** Enemy levers set per difficulty tier (TUNING.difficulty.<tier>.<lever>). */
const TIER_LEVERS = ['enemyHpPct', 'enemyDamagePct'] as const;

/**
 * `--difficulty standard|heroic` (default standard, the game's default tier): which tier the batch's runs
 * play (rulings 71 and 74). Stamped into the batch's meta / header.
 */
export function difficultyArg(argv: readonly string[]): Difficulty {
  const i = argv.indexOf('--difficulty');
  if (i < 0) return 'standard';
  const v = argv[i + 1];
  if (v !== 'standard' && v !== 'heroic') throw new Error(`--difficulty must be standard or heroic, got ${String(v)}`);
  return v;
}

export function parseSet(spec: string): [string, number] {
  const i = spec.indexOf('=');
  if (i <= 0) throw new Error(`--set expects key=value, got '${spec}'`);
  const key = spec.slice(0, i);
  const value = Number(spec.slice(i + 1));
  if (!Number.isFinite(value)) throw new Error(`--set ${key}: '${spec.slice(i + 1)}' is not a number`);
  return [key, value];
}

/** Every value of a repeatable `--name v` flag. */
export function argsAll(argv: readonly string[], name: string): string[] {
  const out: string[] = [];
  argv.forEach((a, i) => {
    if (a !== `--${name}`) return;
    const v = argv[i + 1];
    if (v === undefined || v.startsWith('--')) throw new Error(`--${name} needs a value`);
    out.push(v);
  });
  return out;
}

export function parseSets(argv: readonly string[]): Overrides {
  return Object.fromEntries(argsAll(argv, 'set').map(parseSet));
}

/** Apply overrides; returns a function restoring the previous values. */
export function applyOverrides(o: Readonly<Overrides>): () => void {
  const tuning: Overrides = {};
  const undo: (() => void)[] = [];
  for (const [rawKey, value] of Object.entries(o)) {
    // The enemy levers live in the difficulty tiers (rulings 71, 74): the bare key sets both tiers;
    // difficulty.<tier>.<lever>.<act|all> sets one.
    const lever = TIER_LEVERS.find((l) => rawKey.startsWith(`${l}.`));
    if (lever) {
      const rest = rawKey.slice(lever.length + 1);
      for (const tier of DIFFICULTIES) {
        if (rest === 'all') for (const act of [1, 2, 3]) tuning[`difficulty.${tier}.${lever}.${act}`] = value;
        else tuning[`difficulty.${tier}.${lever}.${rest}`] = value;
      }
      continue;
    }
    const key = rawKey;
    // <path>.all: the same value for acts 1, 2 and 3 (difficulty.heroic.enemyHpPct.all).
    if (key.endsWith('.all')) {
      for (const act of [1, 2, 3]) tuning[`${key.slice(0, -'.all'.length)}.${act}`] = value;
      continue;
    }
    if (!key.startsWith('class.')) {
      // Boolean TUNING switches (bloomSpill): 0 = false, 1 = true. applyTuningOverrides takes numbers only.
      const leaf = tuningLeaf(key);
      if (typeof leaf.holder[leaf.name] === 'boolean') {
        if (value !== 0 && value !== 1) throw new Error(`--set ${key}: a boolean switch takes 0 or 1, got ${value}`);
        const old = leaf.holder[leaf.name];
        leaf.holder[leaf.name] = value === 1;
        undo.push(() => {
          leaf.holder[leaf.name] = old;
        });
        continue;
      }
      tuning[key] = value;
      continue;
    }
    const parts = key.split('.');
    if (parts.length === 2 && (parts[1] === 'maxHpDelta' || parts[1] === 'goldDelta')) {
      const field = parts[1] === 'maxHpDelta' ? 'maxHp' : 'startingGold';
      for (const cls of allClasses()) {
        const def = getClassDef(cls.id);
        const old = def[field];
        def[field] = old + value;
        undo.push(() => {
          def[field] = old;
        });
      }
    } else if (parts.length === 3 && parts[1] !== undefined && (parts[2] === 'maxHp' || parts[2] === 'startingGold' || parts[2] === 'maxEnergy')) {
      const def = getClassDef(parts[1]);
      const field = parts[2];
      const old = def[field];
      def[field] = value;
      undo.push(() => {
        def[field] = old;
      });
    } else throw new Error(`unknown class override '${key}' (use class.maxHpDelta, class.goldDelta or class.<id>.maxHp|startingGold|maxEnergy)`);
  }
  const undoTuning = applyTuningOverrides(tuning);
  return () => {
    undoTuning();
    for (const f of undo.reverse()) f();
  };
}

/** The object holding a TUNING leaf by dotted path (throws on an unknown path). */
function tuningLeaf(path: string): { holder: Record<string, unknown>; name: string } {
  const parts = path.split('.');
  let holder: unknown = TUNING;
  for (const p of parts.slice(0, -1)) {
    if (holder === null || typeof holder !== 'object' || !(p in holder)) throw new Error(`unknown TUNING path '${path}'`);
    holder = (holder as Record<string, unknown>)[p];
  }
  const name = parts[parts.length - 1] ?? '';
  if (holder === null || typeof holder !== 'object' || !(name in holder)) throw new Error(`unknown TUNING path '${path}'`);
  return { holder: holder as Record<string, unknown>, name };
}

export function describeOverrides(o: Readonly<Overrides>): string {
  const e = Object.entries(o);
  return e.length ? e.map(([k, v]) => `${k}=${v}`).join(' ') : '(none)';
}
