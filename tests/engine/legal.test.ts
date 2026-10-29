import '../testpack-only';
import { describe, expect, it } from 'vitest';
import { Game, IllegalActionError, actionKey, hashString, nextU32, singleRng, type Action, type RunState, type SingleRng } from '../../src/engine';
import { randomPolicy } from '../../sim/policies/random';

function knownUids(s: RunState): number[] {
  const c = s.combat;
  const piles = c ? [c.hand, c.draw, c.discard, c.exhaust, c.inPlay] : [];
  return [...new Set([...s.player.deck, ...piles.flat()].map((x) => x.uid)), 0, 99999];
}

/** A random action of any shape that is NOT in `legal`. */
function randomIllegal(s: RunState, legal: Action[], r: SingleRng): Action {
  const keys = new Set(legal.map(actionKey));
  const uids = knownUids(s);
  const targets: (number | undefined)[] = [undefined, 0, 99999, ...(s.combat?.enemies.map((e) => e.uid) ?? [])];
  const idx = (): number => r.int(-1, 5);
  const gens: (() => Action)[] = [
    () => ({ type: 'end_turn' }),
    () => ({ type: 'proceed' }),
    () => ({ type: 'rest' }),
    () => ({ type: 'open_treasure' }),
    () => ({ type: 'skip_reward', kind: 'card' }),
    () => {
      const target = r.pick(targets);
      const uid = r.pick(uids);
      return target === undefined ? { type: 'play_card', uid } : { type: 'play_card', uid, target };
    },
    () => {
      const target = r.pick(targets);
      return target === undefined ? { type: 'use_potion', index: idx() } : { type: 'use_potion', index: idx(), target };
    },
    () => ({ type: 'resolve_choice', uids: r.chance(0.5) ? [] : [r.pick(uids), r.pick(uids)].slice(0, r.int(1, 2)) }),
    () => ({ type: 'travel', to: { row: r.int(-1, 16), col: r.int(-1, 7) } }),
    () => ({ type: 'pick_reward', kind: r.pick(['card', 'gold', 'potion', 'relic'] as const), index: idx() }),
    () => ({ type: 'shop_buy', kind: r.pick(['card', 'relic', 'potion'] as const), index: idx() }),
    () => ({ type: 'shop_remove', uid: r.pick(uids), pay: r.pick(['gold', 'shard'] as const) }),
    () => ({ type: 'skip_boss_relic' }),
    () => ({ type: 'smith', uid: r.pick(uids) }),
    () => ({ type: 'rest_special', index: idx() }),
    () => ({ type: 'event_choice', index: idx() }),
    () => ({ type: 'choose_boss_relic', index: idx() }),
    () => ({ type: 'choose_start_boon', index: idx() }),
  ];
  for (let i = 0; i < 1000; i++) {
    const a = r.pick(gens)();
    if (!keys.has(actionKey(a))) return a;
  }
  throw new Error('could not generate an illegal action');
}

describe('legalActions exactness (fuzz)', () => {
  it('every legal action applies without throwing; random illegal ones throw', () => {
    let checkedLegal = 0;
    let checkedIllegal = 0;
    for (let i = 0; i < 4; i++) {
      const seed = `legal-${i}`;
      const g = Game.newRun(seed, 'test_class', { atomic: false });
      const prng = hashString(seed);
      const r = singleRng(hashString(`illegal-${seed}`));
      for (let step = 0; step < 600 && g.state.phase !== 'victory' && g.state.phase !== 'defeat'; step++) {
        const legal = g.legalActions();
        expect(legal.length).toBeGreaterThan(0);
        expect(new Set(legal.map(actionKey)).size).toBe(legal.length);
        for (const a of legal) {
          new Game(structuredClone(g.state), { atomic: false }).apply(a);
          checkedLegal++;
        }
        for (let k = 0; k < 20; k++) {
          const bad = randomIllegal(g.state, legal, r);
          const copy = new Game(structuredClone(g.state), { atomic: false });
          expect(() => copy.apply(bad), `${seed} step ${step} phase ${g.state.phase}: ${actionKey(bad)}`).toThrow(IllegalActionError);
          checkedIllegal++;
        }
        g.apply(randomPolicy.choose(g, legal, nextU32(prng)));
      }
    }
    expect(checkedLegal).toBeGreaterThan(1000);
    expect(checkedIllegal).toBeGreaterThan(1000);
  }, 120_000);
});
