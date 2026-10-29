import '../testpack-only';
import { beforeAll, describe, expect, it } from 'vitest';
import { computeIntent, renderStatusText } from '../../src/engine';
import { combatOf, enemy, enemyUids, eventsOf, pacify, play, sandbox, setHand } from './helpers';
import { registerFixtures } from './fixtures';

beforeAll(registerFixtures);

function quietTurn(g: ReturnType<typeof sandbox>) {
  for (const e of combatOf(g).enemies) if (e.alive) e.intent = computeIntent(g.state, e, e.id === 'test_slime' ? 'lick' : 'stab');
  setHand(g, []);
  return g.apply({ type: 'end_turn' });
}

describe('statuses', () => {
  it('test_strength (amount, never decays) stacks and persists across turns', () => {
    const g = sandbox();
    pacify(g);
    const [r] = setHand(g, ['test_ritual']);
    const ev = play(g, r as number);
    expect(eventsOf(ev, 'status')).toEqual([{ t: 'status', target: 'player', status: 'test_strength', delta: 2, now: 2 }]);
    quietTurn(g);
    quietTurn(g);
    expect(combatOf(g).player.statuses.test_strength).toBe(2);
    const [r2] = setHand(g, ['test_ritual']);
    play(g, r2 as number);
    expect(combatOf(g).player.statuses.test_strength).toBe(4);
  });

  it('test_vulnerable (duration) decays by 1 at the end of the player turn and is removed at 0', () => {
    const g = sandbox();
    pacify(g);
    const [t] = enemyUids(g);
    const [bash] = setHand(g, ['test_bash']);
    if (t === undefined || bash === undefined) throw new Error('setup');
    play(g, bash, t);
    expect(enemy(g, t).statuses.test_vulnerable).toBe(2);
    const ev1 = quietTurn(g);
    expect(eventsOf(ev1, 'status')).toContainEqual({ t: 'status', target: t, status: 'test_vulnerable', delta: -1, now: 1 });
    expect(enemy(g, t).statuses.test_vulnerable).toBe(1);
    quietTurn(g);
    expect('test_vulnerable' in enemy(g, t).statuses).toBe(false);
  });

  it('test_burning ticks (lose hp = stacks) at end of player turn, then decays', () => {
    const g = sandbox();
    pacify(g, 50);
    const [t] = enemyUids(g);
    if (t === undefined) throw new Error('setup');
    enemy(g, t).statuses.test_burning = 3;
    combatOf(g).player.statuses.test_burning = 2;
    const hp = g.state.player.hp;
    const ev = quietTurn(g);
    const losses = eventsOf(ev, 'damage').filter((d) => d.kind === 'hp_loss');
    expect(losses.map((d) => [d.target, d.amount])).toEqual([
      ['player', 2],
      [t, 3],
    ]);
    expect(g.state.player.hp).toBe(hp - 2);
    expect(enemy(g, t).hp).toBe(47);
    expect(enemy(g, t).statuses.test_burning).toBe(2);
    expect(combatOf(g).player.statuses.test_burning).toBe(1);
    quietTurn(g);
    expect(enemy(g, t).hp).toBe(45);
    expect(combatOf(g).player.statuses.test_burning).toBeUndefined();
  });

  it('a status tick can win the fight', () => {
    const g = sandbox();
    const [t] = enemyUids(g);
    if (t === undefined) throw new Error('setup');
    enemy(g, t).hp = 2;
    enemy(g, t).statuses.test_burning = 5;
    const ev = quietTurn(g);
    expect(eventsOf(ev, 'enemy_died')).toHaveLength(1);
    expect(eventsOf(ev, 'combat_won')).toHaveLength(1);
    expect(eventsOf(ev, 'enemy_move')).toHaveLength(0);
    expect(g.state.phase).toBe('reward');
  });

  it('enemies apply statuses with their moves; artifact-like interception negates', () => {
    const g = sandbox();
    const [t] = enemyUids(g);
    if (t === undefined) throw new Error('setup');
    enemy(g, t).intent = computeIntent(g.state, enemy(g, t), 'lick');
    setHand(g, []);
    g.apply({ type: 'end_turn' });
    expect(combatOf(g).player.statuses.test_vulnerable).toBe(1);

    const g2 = sandbox();
    const [t2] = enemyUids(g2);
    if (t2 === undefined) throw new Error('setup');
    enemy(g2, t2).intent = computeIntent(g2.state, enemy(g2, t2), 'lick');
    combatOf(g2).player.statuses.fx_artifact = 1;
    setHand(g2, []);
    g2.apply({ type: 'end_turn' });
    expect(combatOf(g2).player.statuses.test_vulnerable).toBeUndefined();
  });

  it('status text renders from stacks and trigger values', () => {
    expect(renderStatusText('test_burning', 4)).toBe('At the end of your turn, lose 4 HP. Then Burning decreases by 1.');
    expect(renderStatusText('test_vulnerable', 2)).toBe('Takes 50% more attack damage for 2 turn(s).');
    expect(renderStatusText('test_strength', 3)).toBe('Attacks deal 3 additional damage.');
  });
});
