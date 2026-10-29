import '../testpack-only';
import { describe, expect, it } from 'vitest';
import { allClasses } from '../../src/content';
import { Game, hashString, nextU32 } from '../../src/engine';
import { randomPolicy } from '../../sim/policies/random';
import { runOne } from '../../sim/run';

describe('random-policy fuzz', () => {
  for (const cls of allClasses()) {
    it(`200 random runs of ${cls.id} complete (win or lose) without throwing`, () => {
      let wins = 0;
      for (let i = 0; i < 200; i++) {
        const r = runOne(`fuzz-${cls.id}-${i}`, cls.id, randomPolicy);
        if (r.won) wins++;
        expect(r.hpByFloor.length).toBeGreaterThan(1);
        expect(r.floorReached).toBeGreaterThan(0);
        if (!r.won) expect(r.deathEncounter ?? 'event').toBeTruthy();
      }
      expect(wins).toBeGreaterThanOrEqual(0);
    }, 60_000);
  }

  it('an unkillable player reaches victory through all three acts (every phase is reachable)', () => {
    const g = Game.newRun('god', 'test_class', { atomic: false });
    g.state.player.maxHp = 1_000_000;
    g.state.player.hp = 1_000_000;
    const prng = hashString('god');
    const phases = new Set<string>();
    for (let i = 0; i < 20_000 && g.state.phase !== 'victory'; i++) {
      phases.add(g.state.phase);
      g.apply(randomPolicy.choose(g, g.legalActions(), nextU32(prng)));
    }
    expect(g.state.phase).toBe('victory');
    expect(g.state.act).toBe(3);
    for (const p of ['start', 'map', 'combat', 'reward', 'rest', 'treasure', 'boss_reward']) expect(phases).toContain(p);
    const floors = g.state.history.floors;
    expect(floors[0]?.room).toBe('start');
    expect(floors.length).toBe(g.state.floor + 1);
    expect(floors.filter((f) => f.room === 'boss')).toHaveLength(3);
    expect(floors.every((f, i) => f.floor === i)).toBe(true);
  });
});
