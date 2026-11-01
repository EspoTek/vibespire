import '../testpack-only';
import { beforeAll, describe, expect, it } from 'vitest';
import { registerPack } from '../../src/content';
import { Game, computeIntent, renderCardText, renderMoveText, renderRelicText, validateAllContent, type Action } from '../../src/engine';
import { makeCard } from '../../src/engine/cards';
import { newFloorRecord } from '../../src/engine/history';
import { hashString, nextU32 } from '../../src/engine/rng';
import { randomPolicy } from '../../sim/policies/random';
import { combatOf, eventsOf, play, sandbox, setHand } from '../engine/helpers';
import * as ex from './guide_examples';
import { answerChoice } from '../answer-choice';

beforeAll(() => {
  registerPack({
    cards: [ex.exParry, ex.exTock, ex.exGraftingCut, ex.exDownbeat, ex.exDuskPruning],
    statuses: [ex.exDuskPruningStatus],
    relics: [ex.exRelic],
    enemies: [ex.exLeader, ex.exMinion],
    encounters: [ex.exEncounter, ex.exEventEncounter],
    events: [ex.exEvent],
    potions: [ex.exPotion],
    boons: [ex.exPact],
  }, 'test');
});

describe('CONTENT_GUIDE examples', () => {
  it('validate and render', () => {
    expect(() => validateAllContent()).not.toThrow();
    expect(renderCardText({ id: 'ex_return_stroke', upgraded: false }, null)).toBe('Deal 7 damage. Riposte: deal 6 damage to the attacker and gain 1 Onslaught.');
    expect(renderCardText({ id: 'ex_tock', upgraded: true }, null)).toBe('Gain 4 Block. Delay 1: gain 7 Block.');
    expect(renderCardText({ id: 'ex_grafting_cut', upgraded: true }, null)).toBe('Bloom. Deal 2 (+2 per Bloom) damage. Prune.');
    expect(renderCardText({ id: 'ex_downbeat', upgraded: false }, null)).toBe('Deal 11 damage. On beat: deal 6 more.');
    expect(renderRelicText('ex_bulwark_rivets')).toBe('Whenever you gain Guard, gain 1 more. At the start of each combat, gain 3 Block.');
  });

  it('the leader encounter: summon, escalation, hidden forecast, minions flee when the leader dies', () => {
    const g = sandbox({ encounter: 'ex_enc_alpha', elite: true });
    const c = combatOf(g);
    const [alpha, m1, m2] = c.enemies;
    if (!alpha || !m1 || !m2) throw new Error('setup');
    expect([m1.leaderUid, m1.withLeader]).toEqual([alpha.uid, 'flee']);
    alpha.intent = computeIntent(g.state, alpha, 'maul');
    expect(alpha.intent.damage).toBe(9);
    alpha.aiState.mauls = 2;
    expect(computeIntent(g.state, alpha, 'maul').damage).toBe(13);
    expect(renderMoveText(g.state, alpha.uid, 'maul')).toBe('Deal 13 damage. +2 each use.');
    // kill the leader: minions' intents become escape and they leave at their slot
    alpha.hp = 1;
    const [s] = setHand(g, ['test_strike']);
    combatOf(g).energy = 3;
    play(g, s as number, alpha.uid);
    for (const m of combatOf(g).enemies.slice(1)) expect(m.intent.kind).toBe('escape');
    setHand(g, []);
    const ev = g.apply({ type: 'end_turn' });
    expect(eventsOf(ev, 'enemy_fled')).toHaveLength(2);
    expect(g.state.phase).toBe('reward');
  });

  it('the event: gamble then a page, the event combat, the gated option', () => {
    for (const index of [0, 1, 2]) {
      const g = Game.newRun(`ex-ev-${index}`, 'test_class');
      const s = g.state;
      s.startChoices = null;
      s.phase = 'event';
      s.room = 'event';
      s.event = { id: 'ex_flickering_medpod', page: null, chosen: null, done: false };
      s.floor = 1;
      s.history.floors.push(newFloorRecord(s, 'event'));
      s.player.hp = 5000;
      s.player.maxHp = 5000;
      g.apply({ type: 'event_choice', index });
      if (index === 0) expect(g.state.event?.page).toBe('after');
      if (index === 1) expect(g.state.phase).toBe('combat');
      const prng = hashString(`ex-ev-${index}`);
      for (let i = 0; i < 2000 && g.state.phase !== 'map'; i++) g.apply(randomPolicy.choose(g, g.legalActions(), nextU32(prng)));
      expect(g.state.phase).toBe('map');
    }
  });

  it('the potion halts a normal enemy; the pact resolves', () => {
    const g = sandbox();
    g.state.player.potions = ['ex_pot_halt_ampoule'];
    const t = combatOf(g).enemies[0]?.uid as number;
    g.apply({ type: 'use_potion', index: 0, target: t });
    expect(combatOf(g).enemies[0]?.statuses.halted).toBe(1);
    setHand(g, []);
    const ev = g.apply({ type: 'end_turn' });
    expect(eventsOf(ev, 'enemy_move')).toHaveLength(0);

    const p = Game.newRun('ex-pact', 'test_class');
    p.state.startChoices = [{ id: 'ex_pact_lean_start' }];
    p.apply({ type: 'choose_start_boon', index: 0 });
    const pc = p.state.pendingChoice;
    if (!pc) throw new Error('the pact should ask which cards to remove');
    answerChoice(p, pc.choices.slice(0, pc.min));
    expect(p.state.player.deck).toHaveLength(10);
    expect(p.state.player.gold).toBe(0);
  });

  it('the Power queues a Prune choice from an end-of-turn trigger', () => {
    const g = sandbox();
    const [dp] = setHand(g, ['ex_dusk_pruning']);
    play(g, dp as number);
    combatOf(g).hand = [makeCard(g.state, 'test_strike'), makeCard(g.state, 'test_sprout')];
    g.apply({ type: 'end_turn' });
    expect(combatOf(g).pendingChoice?.resume.op).toBe('prune_scrap');
  });
});
