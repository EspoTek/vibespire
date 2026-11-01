// Every engine GameEvent type must have a handler in CombatScreen's animator (a matched visual +
// sound). The animator's default branch is also an exhaustive `never` check, so typecheck fails
// first; this test names the missing types in plain words.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '../..');
const read = (p: string): string => fs.readFileSync(path.join(ROOT, p), 'utf8');

function gameEventTypes(): string[] {
  const src = read('src/engine/types.ts');
  const start = src.indexOf('export type GameEvent =');
  if (start < 0) throw new Error('types.ts: no GameEvent union');
  const end = src.indexOf('\n\n', start); // the union ends at the first blank line
  const union = src.slice(start, end);
  const types = [...union.matchAll(/\bt: '([a-z_]+)'/g)].map((m) => m[1] as string);
  if (types.length < 40) throw new Error(`GameEvent union parse found only ${types.length} types`);
  return [...new Set(types)].sort();
}

function animatorCases(): Set<string> {
  const src = read('src/render/game/screens/CombatScreen.ts');
  const start = src.indexOf('private async animateEvent(');
  if (start < 0) throw new Error('CombatScreen: no animateEvent');
  return new Set([...src.slice(start).matchAll(/case '([a-z_]+)':/g)].map((m) => m[1] as string));
}

describe('combat animator coverage', () => {
  it('handles every GameEvent type', () => {
    const cases = animatorCases();
    const missing = gameEventTypes().filter((t) => !cases.has(t));
    expect(missing, `GameEvent types with no CombatScreen handler: ${missing.join(', ')}`).toEqual([]);
  });
  it('drives the inferred v2 cues from dedicated engine events (no guessing from text or numbers)', () => {
    const types = gameEventTypes();
    const cases = animatorCases();
    for (const t of ['embers_converted', 'harvest', 'salvage', 'reprise']) {
      expect(types, `GameEvent union lacks ${t}`).toContain(t);
      expect(cases.has(t), `no CombatScreen handler for ${t}`).toBe(true);
    }
    const src = read('src/render/game/screens/CombatScreen.ts');
    expect(src).not.toMatch(/Salvage\\\.|Reprise\\\.|turnStarting|% rot === 0/);
  });
  it('has no catch-all that would hide a new event', () => {
    const src = read('src/render/game/screens/CombatScreen.ts');
    expect(src).toMatch(/const unhandled: never = e;/);
    expect(src).not.toMatch(/warnUnhandled/);
  });
});
