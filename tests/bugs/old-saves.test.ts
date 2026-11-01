// Old saves (docs/v2/bugs.md BUG-11): a save from the live v1 build, or one naming content that a later
// build removed, must never crash the game. parseSaveOrIncompatible reports it as incompatible; the
// title then deletes it and tells the player (RunSession.open).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ENGINE_VERSION, Game, hashString, nextU32, parseSaveOrIncompatible, deserialize, unresolvedIds } from '../../src/engine';
import { greedyPolicy } from '../../sim/policies/greedy';

/** Real saves written by the live v1 build (git HEAD at v2 start), mid-combat on floor 4, one per class. */
const V1: Record<string, string> = JSON.parse(readFileSync('tests/bugs/fixtures/v1-saves.json', 'utf8')) as Record<string, string>;

function midCombatSave(): string {
  const g = Game.newRun('old-saves', 'breaker', { atomic: false });
  const prng = hashString('old-saves');
  while (!(g.state.phase === 'combat' && g.state.floor >= 2 && !g.state.combat?.pendingChoice)) g.apply(greedyPolicy.choose(g, g.legalActions(), nextU32(prng)));
  return g.save();
}

describe('BUG-11: old saves are incompatible, never a crash', () => {
  for (const [cls, save] of Object.entries(V1)) {
    it(`a real v1 ${cls} save mid-combat is reported incompatible (version ${JSON.parse(save).version} vs ${ENGINE_VERSION})`, () => {
      const r = parseSaveOrIncompatible(save);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toMatch(/version/);
      expect(() => deserialize(save)).toThrow(/incompatible save/);
    });
  }

  it('a current save loads and every id in it resolves', () => {
    const save = midCombatSave();
    const r = parseSaveOrIncompatible(save);
    expect(r.ok).toBe(true);
    if (r.ok) expect(unresolvedIds(r.state)).toEqual([]);
  });

  it('a current-version save naming a removed card, status or relic is incompatible, with the ids named', () => {
    const raw = JSON.parse(midCombatSave()) as Game['state'];
    const card = raw.player.deck[0];
    if (!card || !raw.combat) throw new Error('fixture');
    card.id = 'overhand_drive'; // cut in the v2 redesign
    raw.combat.player.statuses['cinder_heart'] = 2; // status cut in the v2 redesign
    raw.player.relics.push({ id: 'relic_from_the_future', counter: 0 });
    const r = parseSaveOrIncompatible(JSON.stringify(raw));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toContain("card 'overhand_drive'");
      expect(r.reason).toContain('3 id(s)');
    }
    expect(unresolvedIds(raw).join('\n')).toMatch(/status 'cinder_heart'[\s\S]*relic 'relic_from_the_future'|relic 'relic_from_the_future'[\s\S]*status 'cinder_heart'/);
  });

  it('a corrupt save of this version still throws (a bug or corruption, not an old build)', () => {
    expect(() => parseSaveOrIncompatible('not json')).toThrow();
    expect(() => parseSaveOrIncompatible(JSON.stringify({ version: ENGINE_VERSION }))).toThrow(/malformed/);
  });
});
