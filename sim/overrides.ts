// Balance overrides applied before runs (`--set key=value`, repeatable; sim/sweep.ts knobs).
//   TUNING leaves by dotted path:      enemyDamagePct.1=90  cardOdds.monster.rare=5  restHealPct=35
//   class stats (ClassDef, all classes): class.maxHpDelta=-5  class.goldDelta=50
//   one class:                          class.breaker.maxHp=75
// Overrides are process-local: batch.ts re-applies them inside every worker.

import { allClasses, getClassDef } from '../src/content';
import { applyTuningOverrides } from '../src/engine/tuning';

export type Overrides = Record<string, number>;

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
  for (const [key, value] of Object.entries(o)) {
    if (!key.startsWith('class.')) {
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

export function describeOverrides(o: Readonly<Overrides>): string {
  const e = Object.entries(o);
  return e.length ? e.map(([k, v]) => `${k}=${v}`).join(' ') : '(none)';
}
