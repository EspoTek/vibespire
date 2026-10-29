import '../testpack';
// The Breaker class pool (docs/cards/breaker.md): ids, starters, every card played, Riposte triggers,
// Onslaught scaling, spend finishers, Guard carry-over, every Power status hook, and every card text.
import { describe, expect, it } from 'vitest';
import { getCardDef, getStatusDef } from '../../src/content';
import { BREAKER_CARDS, BREAKER_STATUSES } from '../../src/content/cards/breaker';
import { Game, computeIntent, renderCardText, renderStatusText, type Action, type CardInstance, type GameEvent } from '../../src/engine';
import { makeCard } from '../../src/engine/cards';
import { refreshIntents, startCombat } from '../../src/engine/combat';
import { makeEnv } from '../../src/engine/core';
import { drain } from '../../src/engine/queue';
import { combatOf, enemyUids, eventsOf, pacify, sandbox } from '../engine/helpers';

const IDS = {
  starter: ['hew', 'bulwark', 'shoulder_check', 'brace'],
  common: [
    'piston_jab', 'chain_driver', 'overhand_drive', 'breach_hammer', 'thresher_arc', 'fault_line', 'rivet_flurry',
    'counterweight', 'plate_ram', 'return_stroke', 'gauntlet_tap', 'catch_blade', 'cool_the_steel', 'find_the_seam',
    'read_the_line', 'pivot_sweep', 'rivet_wall', 'planted_feet', 'loaded_spring', 'sabre_rattle',
  ],
  uncommon: [
    'hammerfall', 'piston_volley', 'answering_steel', 'rampart_crash', 'coiled_strike', 'seam_ripper', 'quake_hammer',
    'prism_edge', 'feint_step', 'bind_the_blade', 'anneal', 'quench', 'ride_the_surge', 'hairline_mark', 'read_the_blow',
    'cinder_heart', 'crossed_blades', 'parry_ledger', 'anvil_heart', 'fault_reader',
  ],
  rare: [
    'jackhammer', 'steal_the_swing', 'iron_avalanche', 'endless_maul', 'forge_oath', 'en_garde', 'vent_pressure',
    'iron_rhythm', 'shed_plating', 'smouldering_core', 'recoil_spring', 'reactive_plate',
  ],
} as const;

const STRIKES = Array.from({ length: 12 }, () => 'test_strike');

function settle(g: Game): void {
  for (let i = 0; i < 20; i++) {
    if (!combatOf(g).pendingChoice) return;
    g.apply(g.legalActions()[0] as Action);
  }
  throw new Error('choices never settled');
}

/** A sturdy sandbox (no relics, enemies at 999 HP) with plenty of energy. */
function arena(seed: string, encounter = 'test_enc_slime'): Game {
  const g = sandbox({ seed, encounter, deck: STRIKES, relics: [] });
  pacify(g);
  combatOf(g).energy = 10;
  return g;
}

function put(g: Game, id: string, upgraded = false): CardInstance {
  const card = makeCard(g.state, id, upgraded);
  combatOf(g).hand.push(card);
  return card;
}

/** Play a card from hand (enemy-targeted cards hit the first living enemy). */
function playCard(g: Game, card: CardInstance): GameEvent[] {
  const def = getCardDef(card.id, card.upgraded);
  const target = enemyUids(g)[0];
  if (target === undefined) throw new Error('no enemy');
  const ev = g.apply(def.target === 'enemy' ? { type: 'play_card', uid: card.uid, target } : { type: 'play_card', uid: card.uid });
  settle(g);
  return ev;
}

function setIntent(g: Game, index: number, move: string): void {
  const e = combatOf(g).enemies[index];
  if (!e) throw new Error(`no enemy ${index}`);
  e.intent = computeIntent(g.state, e, move);
}

const playerHits = (ev: GameEvent[]) => eventsOf(ev, 'damage').filter((d) => d.kind === 'attack' && d.source === 'player');
const onslaught = (g: Game) => combatOf(g).player.statuses.onslaught ?? 0;

describe('Breaker pool: ids', () => {
  it('has 56 cards: 4 starters, 20 common, 20 uncommon, 12 rare', () => {
    expect(BREAKER_CARDS).toHaveLength(56);
    for (const rarity of ['starter', 'common', 'uncommon', 'rare'] as const) {
      expect(BREAKER_CARDS.filter((c) => c.rarity === rarity).map((c) => c.id)).toEqual([...IDS[rarity]]);
    }
    expect(BREAKER_CARDS.every((c) => c.cls === 'breaker')).toBe(true);
    // registered by src/content/index.ts (lookups by id; listings may be restricted to the test pack)
    for (const c of BREAKER_CARDS) expect(getCardDef(c.id)).toBe(c);
    for (const s of BREAKER_STATUSES) expect(getStatusDef(s.id)).toBe(s);
  });

  it('ruling 32: the Power is cinder_heart, not furnace_heart', () => {
    expect(getCardDef('cinder_heart').name).toBe('Cinder Heart');
    expect(() => getCardDef('furnace_heart')).toThrow(/unknown card/);
    expect(getCardDef('cinder_heart', true).keywords).toEqual(['innate']);
  });

  it('starters match GDD §4.1', () => {
    const t = (id: string, up: boolean) => renderCardText({ id, upgraded: up }, null);
    expect([t('hew', false), t('hew', true)]).toEqual(['Deal 6 damage.', 'Deal 9 damage.']);
    expect([t('bulwark', false), t('bulwark', true)]).toEqual(['Gain 5 Block.', 'Gain 8 Block.']);
    expect([t('brace', false), t('brace', true)]).toEqual(['Gain 6 Guard.', 'Gain 9 Guard.']);
    expect(t('shoulder_check', false)).toBe('Deal 6 damage, +2 per Onslaught. Riposte: deal 6 damage to the attacker.');
    expect(t('shoulder_check', true)).toBe('Deal 8 damage, +2 per Onslaught. Riposte: deal 9 damage to the attacker.');
    for (const id of IDS.starter) expect(getCardDef(id).cost).toBe(1);
    expect(getCardDef('hew').type).toBe('attack');
    expect(getCardDef('shoulder_check').type).toBe('attack');
    expect(getCardDef('bulwark').type).toBe('skill');
    expect(getCardDef('brace').type).toBe('skill');
  });
});

describe('Breaker pool: text', () => {
  for (const def of BREAKER_CARDS) {
    it(`${def.id} renders base and upgraded with no placeholder or typed digit`, () => {
      const g = arena(`text-${def.id}`);
      for (const upgraded of [false, true]) {
        const merged = getCardDef(def.id, upgraded);
        expect(merged.text.replace(/\{[a-zA-Z0-9_]+\}/g, ''), 'typed digit in the template').not.toMatch(/\d/);
        const card = makeCard(g.state, def.id, upgraded);
        combatOf(g).hand.push(card);
        expect(renderCardText(card, null)).not.toMatch(/[{}]/);
        expect(renderCardText(card, g.state, enemyUids(g)[0] ?? null)).not.toMatch(/[{}]/);
      }
    });
  }
  it('rendered examples', () => {
    const t = (id: string, up = false) => renderCardText({ id, upgraded: up }, null);
    expect(t('breach_hammer')).toBe('Deal 6 damage. Spend 2 Onslaught: deal 12 instead.');
    expect(t('catch_blade', true)).toBe('Gain 8 Block. Riposte: gain 5 Guard for each hit of its attack.');
    expect(t('jackhammer')).toBe('Spend all Onslaught: deal 4 damage, +1 hit per Onslaught spent.');
    expect(t('shed_plating')).toBe('If you have 8+ Guard: lose 8, gain 1 energy, draw 2 cards.');
    expect(t('forge_oath', true)).toBe('Scrap. Gain 3 Onslaught. Remove this from your deck. Later combats start with 3 more Onslaught.');
    expect(t('steal_the_swing', true)).toBe('Scrap. Deal 14 damage. Riposte: cancel the attack, then deal 8 damage to it.');
    expect(t('en_garde', true)).toBe('Draw 1 card. Prime up to 2 Riposte cards from your hand now, past capacity.');
    expect(t('plate_ram', true)).toBe('Deal 7 damage. If your defence ≥ 10: deal 12 instead.');
  });
  it('status texts render for 1..3 stacks', () => {
    for (const s of BREAKER_STATUSES) for (const n of [1, 2, 3]) expect(renderStatusText(s.id, n)).not.toMatch(/[{}]/);
  });
});

describe('Breaker pool: every card plays', () => {
  for (const def of BREAKER_CARDS) {
    for (const upgraded of [false, true]) {
      it(`${def.id}${upgraded ? '+' : ''} plays in a sandbox combat (0 and 5 Onslaught, 12 Guard)`, () => {
        for (const ons of [0, 5]) {
          const g = arena(`play-${def.id}-${ons}`, 'test_enc_jaw_slime');
          g.state.player.counters.shards = 3;
          combatOf(g).player.guard = 12;
          combatOf(g).player.statuses.onslaught = ons;
          combatOf(g).hand = [];
          const card = put(g, def.id, upgraded);
          put(g, 'feint_step');
          put(g, 'counterweight');
          put(g, 'hew');
          expect(() => playCard(g, card)).not.toThrow();
          expect(combatOf(g).hand.some((x) => x.uid === card.uid)).toBe(false);
          g.apply({ type: 'end_turn' });
          settle(g);
        }
      });
    }
  }
});

// Expected Riposte outcomes against Test Jaw's Flurry (3 hits of 3), [base, upgraded].
interface RiposteExpect {
  dmg?: number;
  aoe?: boolean;
  stagger?: number;
  guard?: number;
  onslaught?: number;
  cancel?: boolean;
}
const RIPOSTES: Record<string, [RiposteExpect, RiposteExpect]> = {
  shoulder_check: [{ dmg: 6 }, { dmg: 9 }],
  counterweight: [{ stagger: 3 }, { stagger: 4 }],
  return_stroke: [{ dmg: 6, onslaught: 1 }, { dmg: 8, onslaught: 1 }],
  catch_blade: [{ guard: 12 }, { guard: 15 }],
  pivot_sweep: [{ dmg: 6, aoe: true }, { dmg: 8, aoe: true }],
  loaded_spring: [{ guard: 4, onslaught: 2 }, { guard: 5, onslaught: 3 }],
  answering_steel: [{ dmg: 15 }, { dmg: 18 }],
  coiled_strike: [{ dmg: 16 }, { dmg: 20 }],
  feint_step: [{ dmg: 5 }, { dmg: 7 }],
  bind_the_blade: [{ stagger: 2, onslaught: 2 }, { stagger: 3, onslaught: 3 }],
  steal_the_swing: [{ cancel: true }, { cancel: true, dmg: 8 }],
};

describe('Breaker pool: Riposte', () => {
  it('covers every Riposte card', () => {
    expect(Object.keys(RIPOSTES).sort()).toEqual(BREAKER_CARDS.filter((c) => c.riposte).map((c) => c.id).sort());
  });
  for (const [id, pair] of Object.entries(RIPOSTES)) {
    pair.forEach((exp, i) => {
      const upgraded = i === 1;
      it(`${id}${upgraded ? '+' : ''} primes at turn end and fires at the attacker`, () => {
        const g = arena(`rip-${id}-${i}`, 'test_enc_jaw_slime');
        setIntent(g, 0, 'flurry');
        setIntent(g, 1, 'lick');
        const [jaw, slime] = enemyUids(g) as [number, number];
        combatOf(g).hand = [];
        const card = put(g, id, upgraded);
        const ev = g.apply({ type: 'end_turn' });
        expect(eventsOf(ev, 'card_primed')).toEqual([{ t: 'card_primed', uid: card.uid }]);
        expect(eventsOf(ev, 'riposte_triggered')).toEqual([{ t: 'riposte_triggered', uid: card.uid, attacker: jaw }]);
        const firstEnemyHit = ev.findIndex((e) => e.t === 'damage' && e.target === 'player');
        if (exp.dmg !== undefined) {
          const hit = ev.findIndex((e) => e.t === 'damage' && e.source === 'player' && e.target === jaw);
          expect(hit).toBeGreaterThanOrEqual(0);
          const d = ev[hit];
          expect(d?.t === 'damage' && d.amount).toBe(exp.dmg);
          if (!exp.cancel) expect(hit).toBeLessThan(firstEnemyHit);
          if (exp.aoe) expect(playerHits(ev).find((h) => h.target === slime)?.amount).toBe(exp.dmg);
        }
        if (exp.stagger !== undefined) {
          const stagger = exp.stagger;
          expect(eventsOf(ev, 'status').find((s) => s.target === jaw && s.status === 'stagger')?.delta).toBe(exp.stagger);
          // applies to the attack that triggered it: 3 per hit minus the Stagger
          expect(eventsOf(ev, 'damage').filter((d) => d.target === 'player').map((d) => d.amount)).toEqual([0, 0, 0].map(() => Math.max(0, 3 - stagger)));
        }
        if (exp.guard !== undefined) {
          expect(eventsOf(ev, 'block').find((b) => b.target === 'player' && b.pool === 'guard')?.amount).toBe(exp.guard);
          expect(ev.findIndex((e) => e.t === 'block' && e.pool === 'guard')).toBeLessThan(firstEnemyHit);
        }
        if (exp.onslaught !== undefined) expect(onslaught(g)).toBe(exp.onslaught); // carries into the next turn
        if (exp.cancel) {
          expect(eventsOf(ev, 'attack_cancelled')).toEqual([{ t: 'attack_cancelled', uid: jaw }]);
          expect(eventsOf(ev, 'damage').filter((d) => d.target === 'player')).toHaveLength(0);
          expect(combatOf(g).exhaust.some((x) => x.uid === card.uid)).toBe(true); // Scrap
        } else {
          expect(combatOf(g).discard.some((x) => x.uid === card.uid)).toBe(true);
        }
      });
    });
  }
});

describe('Breaker pool: Onslaught', () => {
  it('each finished Attack adds 1, so the second Attack hits harder', () => {
    const g = arena('ons-scale');
    combatOf(g).hand = [];
    const a = put(g, 'shoulder_check');
    const b = put(g, 'shoulder_check');
    const j = put(g, 'piston_jab');
    expect(playerHits(playCard(g, a)).map((h) => h.amount)).toEqual([6]);
    expect(playerHits(playCard(g, b)).map((h) => h.amount)).toEqual([8]);
    expect(playerHits(playCard(g, j)).map((h) => h.amount)).toEqual([4]);
    expect(onslaught(g)).toBe(3);
  });

  it('Skills read Onslaught without adding it (Cool the Steel)', () => {
    const g = arena('ons-skill');
    combatOf(g).player.statuses.onslaught = 3;
    const ev = playCard(g, put(g, 'cool_the_steel', true));
    expect(eventsOf(ev, 'block')).toEqual([{ t: 'block', target: 'player', amount: 13, pool: 'guard' }]);
    expect(onslaught(g)).toBe(3);
  });

  it('spend-all finishers still hit at 0 (ruling 33) and scale with what is spent', () => {
    const h0 = arena('hammer-0');
    expect(playerHits(playCard(h0, put(h0, 'hammerfall'))).map((x) => x.amount)).toEqual([8]);
    expect(onslaught(h0)).toBe(1);
    const h4 = arena('hammer-4');
    combatOf(h4).player.statuses.onslaught = 4;
    expect(playerHits(playCard(h4, put(h4, 'hammerfall', true))).map((x) => x.amount)).toEqual([28]);
    expect(onslaught(h4)).toBe(1); // spent all, then +1 for the Attack itself

    const j0 = arena('jack-0');
    expect(playerHits(playCard(j0, put(j0, 'jackhammer'))).map((x) => x.amount)).toEqual([4]);
    const j3 = arena('jack-3');
    combatOf(j3).player.statuses.onslaught = 3;
    expect(playerHits(playCard(j3, put(j3, 'jackhammer'))).map((x) => x.amount)).toEqual([4, 4, 4, 4]);
  });

  it('"Spend N … instead" skips below N and spends at N', () => {
    const b1 = arena('breach-1');
    combatOf(b1).player.statuses.onslaught = 1;
    expect(playerHits(playCard(b1, put(b1, 'breach_hammer'))).map((x) => x.amount)).toEqual([6]);
    expect(onslaught(b1)).toBe(2);
    const b2 = arena('breach-2');
    combatOf(b2).player.statuses.onslaught = 2;
    expect(playerHits(playCard(b2, put(b2, 'breach_hammer'))).map((x) => x.amount)).toEqual([12]);
    expect(onslaught(b2)).toBe(1);

    const q = arena('quake-3', 'test_enc_slimes');
    combatOf(q).player.statuses.onslaught = 3;
    expect(playerHits(playCard(q, put(q, 'quake_hammer'))).map((x) => x.amount)).toEqual([12, 12]);

    const v3 = arena('vent-3');
    combatOf(v3).player.statuses.onslaught = 3;
    playCard(v3, put(v3, 'vent_pressure'));
    expect([combatOf(v3).energy, onslaught(v3)]).toEqual([9, 3]);
    const v4 = arena('vent-4');
    combatOf(v4).player.statuses.onslaught = 4;
    const hand = combatOf(v4).hand.length;
    playCard(v4, put(v4, 'vent_pressure'));
    expect([combatOf(v4).energy, onslaught(v4), combatOf(v4).hand.length]).toEqual([11, 0, hand + 2]);
  });

  it('If-Onslaught riders: Endless Maul copies itself at 4, not at 3', () => {
    for (const [ons, copies] of [[3, 0], [4, 1]] as const) {
      const g = arena(`maul-${ons}`);
      combatOf(g).hand = [];
      combatOf(g).player.statuses.onslaught = ons;
      const ev = playCard(g, put(g, 'endless_maul', true));
      expect(playerHits(ev).map((x) => x.amount)).toEqual([8 + 2 * ons]);
      expect(combatOf(g).hand.filter((x) => x.id === 'endless_maul' && x.upgraded)).toHaveLength(copies);
    }
  });
});

describe('Breaker pool: Guard', () => {
  it('Guard halves at turn start; Anneal skips exactly one halving', () => {
    const g = arena('guard-carry');
    combatOf(g).hand = [];
    playCard(g, put(g, 'brace'));
    expect(combatOf(g).player.guard).toBe(6);
    setIntent(g, 0, 'lick');
    g.apply({ type: 'end_turn' });
    expect(combatOf(g).player.guard).toBe(3);

    playCard(g, put(g, 'anneal', true));
    expect(combatOf(g).player.guard).toBe(9);
    expect(combatOf(g).player.statuses.guard_hold).toBe(1);
    setIntent(g, 0, 'lick');
    g.apply({ type: 'end_turn' });
    expect(combatOf(g).player.guard).toBe(9);
    expect(combatOf(g).player.statuses.guard_hold).toBeUndefined();
    setIntent(g, 0, 'lick');
    g.apply({ type: 'end_turn' });
    expect(combatOf(g).player.guard).toBe(4);
  });

  it('defence payoffs: Plate Ram, Rampart Crash, Iron Avalanche, Shed Plating', () => {
    const g = arena('defence', 'test_enc_slimes');
    combatOf(g).player.block = 4;
    combatOf(g).player.guard = 6;
    expect(playerHits(playCard(g, put(g, 'plate_ram'))).map((x) => x.amount)).toEqual([9]);
    expect(playerHits(playCard(g, put(g, 'rampart_crash'))).map((x) => x.amount)).toEqual([10]);
    expect(playerHits(playCard(g, put(g, 'iron_avalanche', true))).map((x) => x.amount)).toEqual([10, 10]);
    expect([combatOf(g).player.guard, combatOf(g).player.block]).toEqual([0, 12]);

    const s = arena('shed');
    combatOf(s).player.guard = 7;
    const e0 = combatOf(s).energy;
    playCard(s, put(s, 'shed_plating'));
    expect([combatOf(s).player.guard, combatOf(s).energy]).toEqual([7, e0]);
    combatOf(s).player.guard = 9;
    const hand = combatOf(s).hand.length;
    playCard(s, put(s, 'shed_plating'));
    expect([combatOf(s).player.guard, combatOf(s).energy, combatOf(s).hand.length]).toEqual([1, e0 + 1, hand + 2]);
  });
});

describe('Breaker pool: Powers and rule-breakers', () => {
  it('Cinder Heart: +1 Onslaught at turn start', () => {
    const g = arena('cinder');
    playCard(g, put(g, 'cinder_heart'));
    setIntent(g, 0, 'lick');
    g.apply({ type: 'end_turn' });
    expect(onslaught(g)).toBe(1);
  });

  it('Parry Ledger: a Riposte trigger draws 1 more next turn', () => {
    const g = arena('ledger', 'test_enc_jaw');
    playCard(g, put(g, 'parry_ledger'));
    combatOf(g).hand = [];
    put(g, 'feint_step');
    setIntent(g, 0, 'flurry');
    const ev = g.apply({ type: 'end_turn' });
    expect(eventsOf(ev, 'riposte_triggered')).toHaveLength(1);
    expect(combatOf(g).hand).toHaveLength(6);
    expect(combatOf(g).player.statuses.parry_ledger_draw).toBeUndefined();
  });

  it('Anvil Heart: a fully absorbed attack gives Onslaught for your turn; HP lost gives none', () => {
    for (const [guard, gain] of [[20, 1], [0, 0]] as const) {
      const g = arena(`anvil-${guard}`);
      playCard(g, put(g, 'anvil_heart'));
      combatOf(g).player.guard = guard;
      setIntent(g, 0, 'tackle');
      g.apply({ type: 'end_turn' });
      expect(onslaught(g)).toBe(gain);
    }
  });

  it('Fault Reader: Exposed on the lowest-HP enemy at turn start', () => {
    const g = arena('reader', 'test_enc_slimes');
    const [a, b] = combatOf(g).enemies;
    if (!a || !b) throw new Error('setup');
    a.hp = 40;
    b.hp = 30;
    playCard(g, put(g, 'fault_reader'));
    setIntent(g, 0, 'lick');
    setIntent(g, 1, 'lick');
    g.apply({ type: 'end_turn' });
    expect([combatOf(g).enemies[0]?.statuses.exposed, combatOf(g).enemies[1]?.statuses.exposed]).toEqual([undefined, 1]);
  });

  it('Recoil Spring: the fired card returns to hand next turn; a Scrap card does not', () => {
    const g = arena('recoil', 'test_enc_jaw');
    playCard(g, put(g, 'recoil_spring'));
    combatOf(g).hand = [];
    const feint = put(g, 'feint_step');
    setIntent(g, 0, 'flurry');
    g.apply({ type: 'end_turn' });
    expect(combatOf(g).hand.filter((x) => x.uid === feint.uid)).toHaveLength(1);
    expect(combatOf(g).hand).toHaveLength(6);
    expect(Object.keys(combatOf(g).counters).filter((k) => k.startsWith('recoil_spring'))).toEqual([]);

    combatOf(g).hand = [];
    const steal = put(g, 'steal_the_swing');
    setIntent(g, 0, 'flurry');
    g.apply({ type: 'end_turn' });
    expect(combatOf(g).hand.some((x) => x.uid === steal.uid)).toBe(false);
    expect(combatOf(g).exhaust.some((x) => x.uid === steal.uid)).toBe(true);
  });

  it('Reactive Plate: Guard-absorbed damage is dealt back to the attacker', () => {
    const g = arena('plate');
    playCard(g, put(g, 'reactive_plate'));
    combatOf(g).player.block = 2;
    combatOf(g).player.guard = 10;
    setIntent(g, 0, 'tackle');
    const slime = enemyUids(g)[0];
    const ev = g.apply({ type: 'end_turn' });
    expect(playerHits(ev).map((h) => [h.target, h.amount])).toEqual([[slime, 4]]);
  });

  it('Iron Rhythm: Skills add Onslaught this turn, itself included', () => {
    const g = arena('rhythm');
    playCard(g, put(g, 'iron_rhythm'));
    expect(onslaught(g)).toBe(1);
    playCard(g, put(g, 'bulwark'));
    expect(onslaught(g)).toBe(2);
    playCard(g, put(g, 'hew'));
    expect(onslaught(g)).toBe(3);
    setIntent(g, 0, 'lick');
    g.apply({ type: 'end_turn' });
    expect(combatOf(g).player.statuses.iron_rhythm).toBeUndefined();
  });

  it('Smouldering Core keeps up to 4 Onslaught; Crossed Blades primes 2', () => {
    const g = arena('core', 'test_enc_jaw_slime');
    playCard(g, put(g, 'smouldering_core'));
    playCard(g, put(g, 'crossed_blades'));
    combatOf(g).player.statuses.onslaught = 6;
    combatOf(g).hand = [];
    put(g, 'feint_step');
    put(g, 'coiled_strike');
    setIntent(g, 0, 'flurry');
    setIntent(g, 1, 'tackle');
    const ev = g.apply({ type: 'end_turn' });
    expect(eventsOf(ev, 'card_primed')).toHaveLength(2);
    expect(eventsOf(ev, 'riposte_triggered')).toHaveLength(2);
    expect(onslaught(g)).toBe(4);
  });

  it('En Garde primes up to 2 Riposte cards mid-turn, beyond capacity (capacity 1 + En Garde = 3 primed)', () => {
    const g = arena('garde', 'test_enc_jaw_slime');
    combatOf(g).hand = [];
    const garde = put(g, 'en_garde', true);
    const a = put(g, 'feint_step');
    const b = put(g, 'counterweight');
    const r = put(g, 'return_stroke');
    g.apply({ type: 'play_card', uid: garde.uid });
    expect(combatOf(g).pendingChoice).toMatchObject({ min: 0, max: 2, from: 'hand', resume: { op: 'prime', step: false } });
    g.apply({ type: 'resolve_choice', uids: [a.uid, b.uid] });
    expect(combatOf(g).primed.map((p) => p.card.uid)).toEqual([a.uid, b.uid]);
    expect(combatOf(g).hand.some((x) => x.uid === r.uid)).toBe(true);
    setIntent(g, 0, 'flurry');
    setIntent(g, 1, 'tackle');
    const ev = g.apply({ type: 'end_turn' });
    // the end-of-turn prime step still has its own capacity of 1
    expect(eventsOf(ev, 'card_primed').map((x) => x.uid)).toEqual([r.uid]);
    expect(eventsOf(ev, 'riposte_triggered').map((x) => x.uid)).toEqual([a.uid, b.uid]);
    expect(eventsOf(ev, 'prime_fizzled').map((x) => x.uid)).toEqual([r.uid]);
  });

  it('En Garde is "up to": you may prime fewer, and 2 or fewer Riposte cards are primed without a choice', () => {
    const g = arena('garde-few', 'test_enc_jaw_slime');
    combatOf(g).hand = [];
    const garde = put(g, 'en_garde');
    const a = put(g, 'feint_step');
    const b = put(g, 'counterweight');
    const r = put(g, 'return_stroke');
    g.apply({ type: 'play_card', uid: garde.uid });
    g.apply({ type: 'resolve_choice', uids: [b.uid] });
    expect(combatOf(g).primed.map((p) => p.card.uid)).toEqual([b.uid]);
    expect(combatOf(g).hand.map((x) => x.uid).sort()).toEqual([a.uid, r.uid].sort());

    const h = arena('garde-auto', 'test_enc_jaw_slime');
    combatOf(h).hand = [];
    const g2 = put(h, 'en_garde');
    const x = put(h, 'feint_step');
    h.apply({ type: 'play_card', uid: g2.uid });
    expect(combatOf(h).pendingChoice).toBeNull();
    expect(combatOf(h).primed.map((p) => p.card.uid)).toEqual([x.uid]);
  });

  it('Forge Oath: Onslaught now, leaves the deck, later combats start with more Onslaught', () => {
    const g = sandbox({ seed: 'oath', deck: ['forge_oath', ...STRIKES], relics: [] });
    pacify(g);
    const deckUid = g.state.player.deck.find((x) => x.id === 'forge_oath')?.uid;
    const copy = [...combatOf(g).draw, ...combatOf(g).hand].find((x) => x.uid === deckUid);
    if (!copy) throw new Error('no forge_oath combat copy');
    combatOf(g).draw = combatOf(g).draw.filter((x) => x.uid !== deckUid);
    combatOf(g).hand = [copy];
    const ev = playCard(g, copy);
    expect(onslaught(g)).toBe(2);
    expect(eventsOf(ev, 'card_removed')).toEqual([{ t: 'card_removed', uid: deckUid }]);
    expect(g.state.player.deck.some((x) => x.id === 'forge_oath')).toBe(false);
    expect(combatOf(g).exhaust.some((x) => x.uid === deckUid)).toBe(true);
    expect(g.state.player.counters['combat_start_status:onslaught']).toBe(2);

    // the next combat
    g.state.combat = null;
    g.state.phase = 'map';
    const env = makeEnv(g.state);
    startCombat(env, { encounterId: 'test_enc_slime', kind: 'monster' });
    drain(env);
    refreshIntents(env);
    expect(combatOf(g).player.statuses.onslaught).toBe(2);
  });

  it('Forge Oath: when cap_prune_away cuts the removal, no permanent Onslaught is granted', () => {
    const g = sandbox({ seed: 'oath-cap', deck: ['forge_oath', ...STRIKES], relics: [] });
    pacify(g);
    const deckUid = g.state.player.deck.find((x) => x.id === 'forge_oath')?.uid;
    const copy = [...combatOf(g).draw, ...combatOf(g).hand].find((x) => x.uid === deckUid);
    if (!copy) throw new Error('no forge_oath combat copy');
    combatOf(g).draw = combatOf(g).draw.filter((x) => x.uid !== deckUid);
    combatOf(g).hand = [copy];
    combatOf(g).counters.pruneAway = 1; // this turn's in-combat removal is already used
    const ev = playCard(g, copy);
    expect(onslaught(g)).toBe(2);
    expect(eventsOf(ev, 'card_removed')).toEqual([]);
    expect(g.state.player.deck.some((x) => x.uid === deckUid)).toBe(true);
    expect(g.state.player.counters['combat_start_status:onslaught']).toBeUndefined();
  });

  it('Read the Blow: Guard + Stagger against an attack, draw otherwise', () => {
    const g = arena('blow');
    setIntent(g, 0, 'tackle');
    const ev = playCard(g, put(g, 'read_the_blow'));
    expect(eventsOf(ev, 'block')).toEqual([{ t: 'block', target: 'player', amount: 8, pool: 'guard' }]);
    expect(combatOf(g).enemies[0]?.statuses.stagger).toBe(1);
    setIntent(g, 0, 'lick');
    const hand = combatOf(g).hand.length;
    playCard(g, put(g, 'read_the_blow', true));
    expect(combatOf(g).hand.length).toBe(hand + 3);
  });

  it('Prism Edge scales with Shards held', () => {
    const g = arena('prism');
    g.state.player.counters.shards = 3;
    expect(playerHits(playCard(g, put(g, 'prism_edge'))).map((x) => x.amount)).toEqual([11]);
  });
});
