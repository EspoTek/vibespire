// RULINGS 73: every non-play resolution of a card goes through the Shard gate (ruling 66). The sim
// found Set the Hour scheduling Crystal Graft; at 0 Shards its `shards -1` threw "shards would go
// negative" in end_turn (seed v2-98-graft, novice). Now the resolution is skipped with a text event,
// or, with the Shard, pays and resolves.
import { describe, expect, it } from 'vitest';
import { Game, type Action, type GameEvent } from '../../src/engine';
import { makeCard } from '../../src/engine/cards';

function inFight(): Game {
  const g = Game.newRun('shard-gate', 'graft', { atomic: false });
  for (let i = 0; i < 80 && g.state.phase !== 'combat'; i++) g.apply(g.legalActions()[0] as Action);
  const c = g.state.combat;
  if (g.state.phase !== 'combat' || !c || c.pendingChoice) throw new Error('no clean fight start');
  for (const e of c.enemies) { e.hp = 999; e.maxHp = 999; }
  return g;
}

/** Crystal Graft put on the Timeline by a Schedule effect, due at the start of the next turn. */
function scheduleCrystalGraft(g: Game, shards: number): number {
  const c = g.state.combat;
  if (!c) throw new Error('no combat');
  const card = makeCard(g.state, 'crystal_graft');
  c.timeline.push({ card, dueTurn: c.turn + 1, seq: 9999, onBeat: false, target: null, x: 0, advancedThisTurn: false, scheduled: true });
  g.state.player.counters['shards'] = shards;
  return card.uid;
}

const texts = (ev: GameEvent[]) => ev.flatMap((e) => (e.t === 'text' ? [e.text] : []));

describe('RULINGS 73: Timeline / Schedule resolutions pay their Shard cost or are skipped', () => {
  it('Crystal Graft scheduled at 0 Shards: skipped with a text event, no crash, Shards stay 0', () => {
    const g = inFight();
    const uid = scheduleCrystalGraft(g, 0);
    const ev = g.apply({ type: 'end_turn' });
    expect(texts(ev)).toContain('Crystal Graft: the Scheduled resolution skipped (needs 1 Shard).');
    expect(g.state.player.counters['shards']).toBe(0);
    expect(ev.some((e) => e.t === 'timeline_resolved' && e.uid === uid)).toBe(true);
    expect(g.state.combat?.timeline.some((e) => e.card.uid === uid)).toBe(false);
  });

  it('Crystal Graft scheduled with 1 Shard: pays it and resolves', () => {
    const g = inFight();
    scheduleCrystalGraft(g, 1);
    const ev = g.apply({ type: 'end_turn' });
    expect(texts(ev).some((t) => t.includes('skipped'))).toBe(false);
    expect(g.state.player.counters['shards']).toBe(0);
    expect(ev.some((e) => e.t === 'shards' && e.delta === -1)).toBe(true);
  });
});
