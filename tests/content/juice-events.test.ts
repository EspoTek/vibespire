// Embers (Breaker v2 content status) announces its turn-start conversion for the renderer's cue.
import { describe, expect, it } from 'vitest';
import '../../src/content';
import { Game } from '../../src/engine';
import { refreshIntents, startCombat } from '../../src/engine/combat';
import { makeEnv } from '../../src/engine/core';
import { newFloorRecord } from '../../src/engine/history';
import { drain } from '../../src/engine/queue';

function breakerCombat(): Game {
  const g = Game.newRun('juice-embers', 'breaker');
  const s = g.state;
  s.startChoices = null;
  s.phase = 'map';
  const first = s.map.rows[0]?.[0];
  if (!first) throw new Error('map has no row 0');
  s.mapPos = { row: 0, col: first.col };
  s.floor = 1;
  s.room = 'monster';
  s.history.floors.push(newFloorRecord(s, s.room));
  const env = makeEnv(s);
  startCombat(env, { encounterId: 'enc_a1_thornback', kind: 'monster' });
  drain(env);
  refreshIntents(env);
  return g;
}

describe('embers_converted', () => {
  it('fires at the player turn start with the Embers stacks, right before the Onslaught gain', () => {
    const g = breakerCombat();
    const c = g.state.combat;
    if (!c) throw new Error('no combat');
    g.state.player.hp = 999;
    g.state.player.maxHp = 999;
    c.player.statuses['embers'] = 3;
    const ev = g.apply({ type: 'end_turn' });
    const conv = ev.filter((e) => e.t === 'embers_converted');
    expect(conv).toEqual([{ t: 'embers_converted', amount: 3 }]);
    const iConv = ev.findIndex((e) => e.t === 'embers_converted');
    const iTurn = ev.findIndex((e) => e.t === 'turn_start');
    const iOns = ev.findIndex((e, i) => i > iConv && e.t === 'status' && e.target === 'player' && e.status === 'onslaught' && e.delta === 3);
    expect(iConv).toBeGreaterThan(iTurn);
    expect(iOns).toBeGreaterThan(iConv);
  });

  it('is silent without Embers', () => {
    const g = breakerCombat();
    g.state.player.hp = 999;
    g.state.player.maxHp = 999;
    expect(g.apply({ type: 'end_turn' }).filter((e) => e.t === 'embers_converted')).toEqual([]);
  });
});
