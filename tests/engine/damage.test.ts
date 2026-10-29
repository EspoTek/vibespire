import '../testpack-only';
import { beforeAll, describe, expect, it } from 'vitest';
import { computeDamagePreview, computeIntent, renderCardText, renderCardTextParts } from '../../src/engine';
import { combatOf, enemy, enemyUids, eventsOf, pacify, play, sandbox, setHand } from './helpers';
import { registerFixtures } from './fixtures';

beforeAll(registerFixtures);

describe('damage pipeline', () => {
  it('applies flat modifiers before percent multipliers, then floors', () => {
    const g = sandbox();
    pacify(g);
    const [uid] = setHand(g, ['test_strike']);
    const [t] = enemyUids(g);
    if (uid === undefined || t === undefined) throw new Error('setup');
    combatOf(g).player.statuses.test_strength = 2;
    enemy(g, t).statuses.test_vulnerable = 2;
    const ev = eventsOf(play(g, uid, t), 'damage');
    // (6 + 2) * 1.5 = 12 ; the wrong order would give 6 * 1.5 + 2 = 11
    expect(ev).toEqual([{ t: 'damage', kind: 'attack', source: 'player', target: t, amount: 12, blocked: 0, guarded: 0, hpLost: 12 }]);
  });

  it('target modifyDamageTaken runs after the floor; block absorbs before hp', () => {
    const g = sandbox();
    pacify(g);
    const [uid] = setHand(g, ['fx_hit7']);
    const [t] = enemyUids(g);
    if (uid === undefined || t === undefined) throw new Error('setup');
    const e = enemy(g, t);
    e.statuses.test_vulnerable = 1;
    e.statuses.fx_exposed = 1;
    e.block = 4;
    const hpBefore = e.hp;
    const [d] = eventsOf(play(g, uid, t), 'damage');
    // floor(7 * 1.5) = 10, + 1 exposed = 11; (7+1)*1.5 would be 12
    expect(d).toMatchObject({ amount: 11, blocked: 4, hpLost: 7 });
    expect(enemy(g, t).block).toBe(0);
    expect(enemy(g, t).hp).toBe(hpBefore - 7);
  });

  it('negative strength clamps damage at 0; ignoreBlock skips block', () => {
    const g = sandbox();
    pacify(g);
    const [weak, pierce] = setHand(g, ['test_strike', 'fx_pierce']);
    const [t] = enemyUids(g);
    if (weak === undefined || pierce === undefined || t === undefined) throw new Error('setup');
    combatOf(g).player.statuses.test_strength = -10;
    expect(eventsOf(play(g, weak, t), 'damage')[0]).toMatchObject({ amount: 0, hpLost: 0 });
    combatOf(g).player.statuses.test_strength = 0;
    delete combatOf(g).player.statuses.test_strength;
    enemy(g, t).block = 50;
    expect(eventsOf(play(g, pierce, t), 'damage')[0]).toMatchObject({ amount: 6, blocked: 0, hpLost: 6 });
    expect(enemy(g, t).block).toBe(50);
  });

  it('card text and damage preview use the same numbers as the hit', () => {
    const g = sandbox();
    pacify(g);
    const [uid] = setHand(g, ['test_strike']);
    const [t] = enemyUids(g);
    if (uid === undefined || t === undefined) throw new Error('setup');
    const card = combatOf(g).hand[0];
    if (!card) throw new Error('setup');
    expect(renderCardText(card, null)).toBe('Deal 6 damage.');
    expect(renderCardText({ id: 'test_strike', upgraded: true }, null)).toBe('Deal 9 damage.');
    combatOf(g).player.statuses.test_strength = 3;
    expect(renderCardText(card, g.state)).toBe('Deal 9 damage.');
    enemy(g, t).statuses.test_vulnerable = 1;
    expect(renderCardText(card, g.state, t)).toBe('Deal 13 damage.');
    expect(computeDamagePreview(g.state, uid, t)).toEqual([13]);
    const parts = renderCardTextParts(card, g.state, t);
    expect(parts).toContainEqual({ kind: 'value', key: 'damage', value: 13, base: 6 });
    const [d] = eventsOf(play(g, uid, t), 'damage');
    expect(d?.amount).toBe(13);
  });

  it('enemy intents include the player-side and enemy-side modifiers, and match the real hit', () => {
    const g = sandbox({ encounter: 'test_enc_cultist' });
    const c = combatOf(g);
    const [t] = enemyUids(g);
    if (t === undefined) throw new Error('setup');
    const e = enemy(g, t);
    expect(computeIntent(g.state, e, 'stab').damage).toBe(4);
    e.statuses.test_strength = 2;
    c.player.statuses.test_vulnerable = 3;
    expect(computeIntent(g.state, e, 'stab')).toMatchObject({ kind: 'attack', damage: 9, hits: 1 }); // (4+2)*1.5
    // Force the stab intent, refresh via an action, then check the real hit equals the shown intent.
    e.intent = computeIntent(g.state, e, 'stab');
    setHand(g, []);
    c.player.block = 0;
    const hp = g.state.player.hp;
    const events = g.apply({ type: 'end_turn' });
    const hits = eventsOf(events, 'damage').filter((d) => d.target === 'player' && d.kind === 'attack');
    expect(hits.map((h) => h.amount)).toEqual([9]);
    expect(g.state.player.hp).toBe(hp - 9);
  });

  it('refreshIntents emits enemy_intent when a debuff changes the number', () => {
    const g = sandbox({ encounter: 'test_enc_cultist' });
    const [t] = enemyUids(g);
    const [bash] = setHand(g, ['test_bash']);
    if (t === undefined || bash === undefined) throw new Error('setup');
    const e = enemy(g, t);
    e.intent = computeIntent(g.state, e, 'stab');
    combatOf(g).player.statuses.test_vulnerable = 1; // player vulnerable: next refresh shows 6
    combatOf(g).energy = 3;
    const events = play(g, bash, t);
    const intents = eventsOf(events, 'enemy_intent');
    expect(intents.some((i) => i.uid === t && i.intent.damage === 6)).toBe(true);
  });

  it('a multi-hit stops hitting a dead target; random_enemy re-rolls per hit', () => {
    const g = sandbox();
    const [twin] = setHand(g, ['test_twin']);
    const [t] = enemyUids(g);
    if (twin === undefined || t === undefined) throw new Error('setup');
    enemy(g, t).hp = 5;
    const ev = play(g, twin, t);
    expect(eventsOf(ev, 'damage')).toHaveLength(1);
    expect(eventsOf(ev, 'enemy_died')).toHaveLength(1);
    expect(eventsOf(ev, 'combat_won')).toHaveLength(1);
    expect(g.state.phase).toBe('reward');

    const g2 = sandbox({ encounter: 'test_enc_slimes' });
    pacify(g2);
    const [rnd] = setHand(g2, ['fx_random']);
    if (rnd === undefined) throw new Error('setup');
    const hits = eventsOf(play(g2, rnd), 'damage');
    expect(hits).toHaveLength(6);
    expect(new Set(hits.map((h) => h.target)).size).toBe(2);
  });

  it('thorns-style trigger targets the attacker', () => {
    const g = sandbox();
    pacify(g);
    const [uid] = setHand(g, ['test_strike']);
    const [t] = enemyUids(g);
    if (uid === undefined || t === undefined) throw new Error('setup');
    enemy(g, t).statuses.fx_thorns = 3;
    const hpBefore = g.state.player.hp;
    const ev = eventsOf(play(g, uid, t), 'damage');
    expect(ev.map((d) => [d.source, d.target, d.amount])).toEqual([
      ['player', t, 6],
      [t, 'player', 3],
    ]);
    expect(g.state.player.hp).toBe(hpBefore - 3);
  });
});
