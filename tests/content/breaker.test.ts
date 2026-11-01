import '../testpack';
// The Breaker class pool (docs/cards/breaker.md): ids, starters, every card played, Riposte triggers,
// Onslaught scaling, spend finishers, Guard carry-over, every Power status hook, and every card text.
import { describe, expect, it } from 'vitest';
import { getCardDef, getStatusDef } from '../../src/content';
import { BREAKER_CARDS, BREAKER_STATUSES } from '../../src/content/cards/breaker';
import { Game, computeIntent, renderCardText, renderStatusText, type Action, type CardInstance, type Effect, type GameEvent } from '../../src/engine';
import { getCardCost, makeCard } from '../../src/engine/cards';
import { enqueue, makeEnv } from '../../src/engine/core';
import { drain } from '../../src/engine/queue';
import { combatOf, enemyUids, eventsOf, pacify, sandbox } from '../engine/helpers';
import { answerChoice } from '../answer-choice';

const IDS = {
  starter: ['hew', 'bulwark', 'shoulder_check', 'brace'],
  common: [
    'piston_jab', 'chain_driver', 'breach_hammer', 'thresher_arc', 'fault_line', 'rivet_flurry',
    'counterweight', 'plate_ram', 'return_stroke', 'gauntlet_tap', 'catch_blade', 'cool_the_steel',
    'read_the_line', 'pivot_sweep', 'rivet_wall', 'loaded_spring', 'sabre_rattle',
    'stoke', 'hair_trigger', 'loosen_straps',
  ],
  uncommon: [
    'hammerfall', 'piston_volley', 'answering_steel', 'rampart_crash', 'coiled_strike', 'seam_ripper', 'quake_hammer',
    'feint_step', 'bind_the_blade', 'anneal', 'quench', 'ride_the_surge', 'hairline_mark', 'read_the_blow',
    'cinder_heart', 'crossed_blades', 'parry_ledger', 'anvil_heart', 'fault_reader',
    'en_garde', 'shed_plating', 'kindle', 'spark_gap', 'iron_patience',
  ],
  rare: [
    'jackhammer', 'steal_the_swing', 'iron_avalanche', 'endless_maul', 'forge_oath', 'vent_pressure',
    'iron_rhythm', 'smouldering_core', 'recoil_spring', 'reactive_plate',
    'worldbreaker', 'turnabout', 'bellows', 'crazing', 'answer_in_kind', 'molten_shell',
  ],
} as const;

const STRIKES = Array.from({ length: 20 }, () => 'test_strike');

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
  // v2 final pool (docs/v2/breaker-design.md §5, Phase C cuts applied).
  it('has 64 cards: 4 starters, 20 common, 24 uncommon, 16 rare', () => {
    expect(BREAKER_CARDS).toHaveLength(64);
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
    expect([t('brace', false), t('brace', true)]).toEqual(['Gain 5 Guard.', 'Gain 8 Guard.']);
    expect(t('shoulder_check', false)).toBe('Deal 6 damage, +2 per Onslaught. Riposte: deal 6 damage to the attacker.');
    expect(t('shoulder_check', true)).toBe('Deal 8 damage, +3 per Onslaught. Riposte: deal 9 damage to the attacker.');
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
    expect(t('breach_hammer')).toBe('Deal 7 damage. Spend 2 Onslaught: draw 2 cards.');
    expect(t('cinder_heart', true)).toBe('Opening. Gain 1 Ember.');
    expect(t('kindle')).toBe('Draw 2 cards. Spend all Onslaught: gain an Ember for every 2 Onslaught spent.');
    expect(t('bellows')).toBe('Gain 1 Ember. Draw 1 card. Whenever you Spend 4 or more Onslaught at once, gain another Ember.');
    expect(t('loosen_straps', true)).toBe('Gain 4 Guard. Shed 4: draw 3 cards.');
    expect(t('iron_avalanche', true)).toBe('Keep. Shed all Guard: deal 5 damage plus the Guard Shed to ALL enemies. Gain 8 Block.');
    expect(t('worldbreaker', true)).toBe('Spend all Onslaught: deal 4 damage, +3 per Onslaught spent, X times.');
    expect(t('iron_patience', true)).toBe('At the end of your turn, gain 2 Guard for each unspent energy.');
    expect(t('anvil_heart')).toBe('At the start of your turn, if you lost no HP since your last turn, gain 1 Ember.');
    expect(t('hair_trigger', true)).toBe('Draw 1 card. Riposte: deal 4 damage to the attacker.');
    expect(t('catch_blade', true)).toBe('Gain 8 Block. Riposte: gain 4 Guard for each hit of its attack.');
    expect(t('jackhammer')).toBe('Spend all Onslaught: deal 4 damage, +1 hit per Onslaught spent.');
    expect(t('shed_plating')).toBe('Draw 1 card. Shed 6: gain 1 energy and draw 1 more.');
    expect(t('forge_oath', true)).toBe('Scrap. Gain 1 Ember and 2 Onslaught.');
    expect(t('vent_pressure')).toBe('Draw 2 cards. If Onslaught ≥ 3: Spend all of it and gain 2 energy.');
    expect(t('recoil_spring')).toBe('Draw 1 card. When a primed card fires, it comes back to your hand next turn and is free to play that turn.');
    expect(t('steal_the_swing', true)).toBe('Scrap. Deal 14 damage. Riposte: cancel the attack, then deal 8 damage to it.');
    expect(t('en_garde', true)).toBe('Prime up to 2 Riposte cards from your hand. Draw 2 cards.');
    expect(t('plate_ram', true)).toBe('Deal 8 damage. Shed 4: deal 15 instead.');
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
  catch_blade: [{ guard: 9 }, { guard: 12 }], // Phase D: 3 / 4 per hit
  pivot_sweep: [{ dmg: 6, aoe: true }, { dmg: 8, aoe: true }],
  loaded_spring: [{ guard: 3, onslaught: 2 }, { guard: 4, onslaught: 3 }], // Phase D: Riposte Guard 4/5 -> 3/4
  answering_steel: [{ dmg: 15 }, { dmg: 18 }],
  coiled_strike: [{ dmg: 16 }, { dmg: 20 }],
  feint_step: [{ dmg: 5 }, { dmg: 7 }],
  bind_the_blade: [{ stagger: 2, onslaught: 2 }, { stagger: 3, onslaught: 3 }],
  steal_the_swing: [{ cancel: true }, { cancel: true, dmg: 8 }],
  hair_trigger: [{ dmg: 2 }, { dmg: 4 }], // Phase F 3/5 -> 2/4
  // Turnabout reflects the attack's total: Flurry is 3 hits of 3.
  turnabout: [{ dmg: 9 }, { dmg: 9 }],
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
    expect(playerHits(playCard(g, b)).map((h) => h.amount)).toEqual([8]); // base +2 per Onslaught (upgraded +3)
    expect(playerHits(playCard(g, j)).map((h) => h.amount)).toEqual([5]); // Piston Jab 3 + 2 (Phase C: base 2 -> 3)
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
    expect(playerHits(playCard(h4, put(h4, 'hammerfall', true))).map((x) => x.amount)).toEqual([32]); // Phase D: 8 + 6 x 4
    expect(onslaught(h4)).toBe(1); // spent all, then +1 for the Attack itself

    const j0 = arena('jack-0');
    expect(playerHits(playCard(j0, put(j0, 'jackhammer'))).map((x) => x.amount)).toEqual([4]);
    const j3 = arena('jack-3');
    combatOf(j3).player.statuses.onslaught = 3;
    expect(playerHits(playCard(j3, put(j3, 'jackhammer'))).map((x) => x.amount)).toEqual([4, 4, 4, 4]);
  });

  it('"Spend N" skips below N and spends at N (Breach Hammer: Onslaught for cards)', () => {
    const b1 = arena('breach-1');
    combatOf(b1).player.statuses.onslaught = 1;
    const h1 = combatOf(b1).hand.length;
    expect(playerHits(playCard(b1, put(b1, 'breach_hammer'))).map((x) => x.amount)).toEqual([7]);
    expect([onslaught(b1), combatOf(b1).hand.length]).toEqual([2, h1]);
    const b2 = arena('breach-2');
    combatOf(b2).player.statuses.onslaught = 2;
    const h2 = combatOf(b2).hand.length;
    expect(playerHits(playCard(b2, put(b2, 'breach_hammer'))).map((x) => x.amount)).toEqual([7]);
    expect([onslaught(b2), combatOf(b2).hand.length]).toEqual([1, h2 + 2]);

    const q = arena('quake-3', 'test_enc_slimes');
    combatOf(q).player.statuses.onslaught = 3;
    expect(playerHits(playCard(q, put(q, 'quake_hammer'))).map((x) => x.amount)).toEqual([12, 12]);

    const v3 = arena('vent-3');
    combatOf(v3).player.statuses.onslaught = 3;
    const hand = combatOf(v3).hand.length;
    playCard(v3, put(v3, 'vent_pressure'));
    expect([combatOf(v3).energy, onslaught(v3), combatOf(v3).hand.length]).toEqual([11, 0, hand + 2]);
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
    expect(combatOf(g).player.guard).toBe(5);
    setIntent(g, 0, 'lick');
    g.apply({ type: 'end_turn' });
    expect(combatOf(g).player.guard).toBe(2);

    playCard(g, put(g, 'anneal', true));
    expect(combatOf(g).player.guard).toBe(8);
    expect(combatOf(g).player.statuses.guard_hold).toBe(1);
    setIntent(g, 0, 'lick');
    g.apply({ type: 'end_turn' });
    expect(combatOf(g).player.guard).toBe(8);
    expect(combatOf(g).player.statuses.guard_hold).toBeUndefined();
    setIntent(g, 0, 'lick');
    g.apply({ type: 'end_turn' });
    expect(combatOf(g).player.guard).toBe(4);
  });

  it('Shed N skips below N and Sheds exactly N at or above it (Plate Ram), then Rampart Crash reads what is left', () => {
    const g = arena('shed-ram', 'test_enc_slimes');
    combatOf(g).player.guard = 3;
    let ev = playCard(g, put(g, 'plate_ram'));
    expect(playerHits(ev).map((x) => x.amount)).toEqual([6]);
    expect(eventsOf(ev, 'guard_shed')).toEqual([]);
    expect(combatOf(g).player.guard).toBe(3);
    combatOf(g).player.guard = 6;
    ev = playCard(g, put(g, 'plate_ram'));
    expect(playerHits(ev).map((x) => x.amount)).toEqual([12]);
    expect(eventsOf(ev, 'guard_shed')).toEqual([{ t: 'guard_shed', target: 'player', amount: 4, now: 2 }]);
    expect(eventsOf(ev, 'guard_decay')).toEqual([]); // Shedding is not halving
    expect(playerHits(playCard(g, put(g, 'rampart_crash'))).map((x) => x.amount)).toEqual([6]);
  });

  it('Shed all Guard scales with the Guard Shed (Iron Avalanche); at 0 Guard it still plays, with no Shed event (ruling 2)', () => {
    const g = arena('shed-avalanche', 'test_enc_slimes');
    combatOf(g).player.block = 4;
    combatOf(g).player.guard = 10;
    let ev = playCard(g, put(g, 'iron_avalanche', true));
    expect(playerHits(ev).map((x) => x.amount)).toEqual([15, 15]);
    expect([combatOf(g).player.guard, combatOf(g).player.block]).toEqual([0, 12]); // Block is not Shed
    ev = playCard(g, put(g, 'iron_avalanche'));
    expect(playerHits(ev).map((x) => x.amount)).toEqual([5, 5]);
    expect(eventsOf(ev, 'guard_shed')).toEqual([]);
  });

  it('Shed Plating and Loosen Straps: Guard for energy and cards', () => {
    const s = arena('shed');
    combatOf(s).player.guard = 5;
    const e0 = combatOf(s).energy;
    const h0 = combatOf(s).hand.length;
    playCard(s, put(s, 'shed_plating'));
    expect([combatOf(s).player.guard, combatOf(s).energy, combatOf(s).hand.length]).toEqual([5, e0, h0 + 1]); // Phase E: draws 1 regardless
    combatOf(s).player.guard = 9;
    playCard(s, put(s, 'shed_plating'));
    expect([combatOf(s).player.guard, combatOf(s).energy, combatOf(s).hand.length]).toEqual([3, e0 + 1, h0 + 3]);
    // Phase F: Loosen Straps brings its own Guard, so it is Guard-neutral: 3 + 4 − 4 = 3.
    playCard(s, put(s, 'loosen_straps'));
    expect([combatOf(s).player.guard, combatOf(s).hand.length]).toEqual([3, h0 + 5]);
    combatOf(s).player.guard = 0;
    combatOf(s).hand = [];
    playCard(s, put(s, 'loosen_straps'));
    expect([combatOf(s).player.guard, combatOf(s).hand.length]).toEqual([0, 2]); // works from 0 Guard
  });
});

describe('Breaker pool: Powers and rule-breakers', () => {
  it('Cinder Heart: 1 Ember = +1 Onslaught at every turn start; Embers stack and cap at 10', () => {
    const g = arena('cinder');
    playCard(g, put(g, 'cinder_heart'));
    expect(combatOf(g).player.statuses.embers).toBe(1);
    setIntent(g, 0, 'lick');
    g.apply({ type: 'end_turn' });
    expect(onslaught(g)).toBe(1);
    combatOf(g).energy = 10;
    playCard(g, put(g, 'cinder_heart'));
    setIntent(g, 0, 'lick');
    g.apply({ type: 'end_turn' });
    expect(onslaught(g)).toBe(2);
    combatOf(g).player.statuses.embers = 9;
    combatOf(g).energy = 10;
    playCard(g, put(g, 'cinder_heart'));
    playCard(g, put(g, 'cinder_heart'));
    expect(combatOf(g).player.statuses.embers).toBe(10);
  });

  it('Kindle: Spend all Onslaught for an Ember per 3 spent (floored)', () => {
    // per = 1/every must floor exactly like spent / every for every Onslaught value up to the cap.
    const every = getCardDef('kindle').values?.every;
    if (every === undefined) throw new Error('kindle has no values.every');
    for (let n = 0; n <= 30; n++) expect(Math.floor((1 / every) * n)).toBe(Math.floor(n / every));
    for (const [ons, embers] of [[1, 0], [3, 1], [8, 4]] as const) { // Phase D: an Ember per 2 spent
      const g = arena(`kindle-${ons}`);
      combatOf(g).player.statuses.onslaught = ons;
      playCard(g, put(g, 'kindle'));
      expect([onslaught(g), combatOf(g).player.statuses.embers ?? 0]).toEqual([0, embers]);
    }
  });

  it('Bellows: every Spend of 4+ Onslaught at once gains an Ember; smaller Spends do not', () => {
    const g = arena('bellows');
    playCard(g, put(g, 'bellows'));
    combatOf(g).player.statuses.onslaught = 3;
    playCard(g, put(g, 'hammerfall'));
    expect(combatOf(g).player.statuses.embers).toBe(1); // Phase E: Bellows gives 1 Ember on play
    combatOf(g).player.statuses.onslaught = 4;
    playCard(g, put(g, 'vent_pressure'));
    expect(combatOf(g).player.statuses.embers).toBe(2);
    combatOf(g).player.statuses.onslaught = 6;
    playCard(g, put(g, 'hammerfall'));
    expect(combatOf(g).player.statuses.embers).toBe(3);
  });

  it('Worldbreaker: X hits of base + per Onslaught spent', () => {
    const g = arena('worldbreaker');
    combatOf(g).energy = 3;
    combatOf(g).player.statuses.onslaught = 4;
    const ev = playCard(g, put(g, 'worldbreaker'));
    expect(playerHits(ev).map((x) => x.amount)).toEqual([12, 12, 12]);
    expect(combatOf(g).energy).toBe(0);
    expect(onslaught(g)).toBe(1); // spent all, then +1 for the Attack itself
  });

  it('Crazing: Exposed on enemies stops decaying; it still decays without Crazing', () => {
    for (const crazing of [false, true]) {
      const g = arena(`crazing-${String(crazing)}`);
      if (crazing) playCard(g, put(g, 'crazing'));
      const jaw = enemyUids(g)[0] as number;
      playCard(g, put(g, 'hairline_mark'));
      setIntent(g, 0, 'lick');
      g.apply({ type: 'end_turn' });
      expect(combatOf(g).enemies.find((e) => e.uid === jaw)?.statuses.exposed).toBe(crazing ? 3 : 1); // Phase E: Crazing applies 1 Exposed to ALL on play
    }
  });

  it('Answer in Kind: a firing Riposte also resolves its played effects; draws are banked for next turn (ruling 3)', () => {
    const g = arena('aik', 'test_enc_jaw');
    playCard(g, put(g, 'answer_in_kind'));
    combatOf(g).hand = [];
    put(g, 'return_stroke');
    setIntent(g, 0, 'flurry');
    const jaw = enemyUids(g)[0] as number;
    const ev = g.apply({ type: 'end_turn' });
    // Riposte list (6) then the played list (7), both before Flurry's first hit.
    const firstEnemyHit = ev.findIndex((e) => e.t === 'damage' && e.target === 'player');
    const hits = ev.map((e, i) => ({ e, i })).filter(({ e }) => e.t === 'damage' && e.source === 'player' && e.target === jaw);
    expect(hits.map(({ e }) => e.t === 'damage' && e.amount)).toEqual([6, 7]);
    expect(hits.every(({ i }) => i < firstEnemyHit)).toBe(true);
    // Played effects are not a play: only the Riposte list's +1 Onslaught.
    expect(onslaught(g)).toBe(1);

    const h = arena('aik-draw', 'test_enc_jaw');
    playCard(h, put(h, 'answer_in_kind'));
    combatOf(h).hand = [];
    put(h, 'hair_trigger');
    setIntent(h, 0, 'flurry');
    const ev2 = h.apply({ type: 'end_turn' });
    expect(eventsOf(ev2, 'next_turn_bank')).toEqual([{ t: 'next_turn_bank', draw: 1, energy: 0 }]);
    // The banked card comes with the turn-start draw: 5 + 1.
    expect(combatOf(h).hand.length).toBe(6);
    expect(combatOf(h).counters.bankDraw).toBeUndefined();
  });

  it('Molten Shell and Spark Gap: each Shed deals that much to the lowest-HP enemy and gives Onslaught', () => {
    const g = arena('molten', 'test_enc_slimes');
    playCard(g, put(g, 'molten_shell'));
    playCard(g, put(g, 'spark_gap'));
    const [a, b] = combatOf(g).enemies;
    if (!a || !b) throw new Error('need two slimes');
    b.hp = a.hp - 1;
    combatOf(g).player.guard = 8;
    const before = onslaught(g);
    const ev = playCard(g, put(g, 'loosen_straps'));
    expect(playerHits(ev)).toEqual([expect.objectContaining({ target: b.uid, amount: 4 })]); // Phase F: Loosen Straps Sheds 4
    expect(onslaught(g)).toBe(before + 1); // Phase D: Spark Gap 1 per Shed
    // Shed all at 0 Guard triggers neither.
    combatOf(g).player.guard = 0;
    const ev0 = playCard(g, put(g, 'iron_avalanche'));
    expect(playerHits(ev0).map((x) => x.amount)).toEqual([5, 5]);
    expect(onslaught(g)).toBe(before + 2); // +1 for the Attack only
  });

  it('Iron Patience: Guard per unspent energy at the end of your turn', () => {
    const g = arena('patience');
    playCard(g, put(g, 'iron_patience', true));
    combatOf(g).energy = 2;
    setIntent(g, 0, 'lick');
    const ev = g.apply({ type: 'end_turn' });
    expect(eventsOf(ev, 'block')).toContainEqual({ t: 'block', target: 'player', amount: 4, pool: 'guard' }); // Phase D: 2 per energy upgraded
  });

  it('Stoke: Onslaught without an Attack, for Spend cards', () => {
    const g = arena('stoke');
    playCard(g, put(g, 'stoke', true));
    expect(onslaught(g)).toBe(3);
  });

  it('next-turn bank: banked energy lands on top of the refill', () => {
    const g = arena('bank-energy');
    combatOf(g).counters.bankEnergy = 2;
    setIntent(g, 0, 'lick');
    g.apply({ type: 'end_turn' });
    expect(combatOf(g).energy).toBe(combatOf(g).maxEnergy + 2);
    expect(combatOf(g).counters.bankEnergy).toBeUndefined();
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

  it('Anvil Heart (Phase D): a turn that starts with no HP lost since your last turn gains an Ember', () => {
    for (const [guard, embers] of [[20, 1], [0, 0]] as const) {
      const g = arena(`anvil-${guard}`);
      playCard(g, put(g, 'anvil_heart'));
      combatOf(g).player.guard = guard;
      setIntent(g, 0, 'tackle');
      g.apply({ type: 'end_turn' });
      expect(combatOf(g).player.statuses.embers ?? 0).toBe(embers);
      // The Ember is gained during this turn-start, after Embers' own payout, so it first pays next turn.
      expect(onslaught(g)).toBe(0);
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
    const feint = put(g, 'counterweight');
    setIntent(g, 0, 'flurry');
    g.apply({ type: 'end_turn' });
    expect(combatOf(g).hand.filter((x) => x.uid === feint.uid)).toHaveLength(1);
    const back = combatOf(g).hand.find((x) => x.uid === feint.uid);
    if (!back) throw new Error('Recoil Spring did not return the card');
    expect(getCardCost(g.state, back)).toBe(0); // Phase C: free the turn it comes back
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
    answerChoice(g, [a.uid, b.uid]);
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
    answerChoice(g, [b.uid]);
    expect(combatOf(g).primed.map((p) => p.card.uid)).toEqual([b.uid]);
    expect(combatOf(g).hand.filter((x) => x.id !== 'test_strike').map((x) => x.uid).sort()).toEqual([a.uid, r.uid].sort());
    expect(combatOf(g).hand.filter((x) => x.id === 'test_strike')).toHaveLength(1); // then draws 1 (v2)

    const h = arena('garde-auto', 'test_enc_jaw_slime');
    combatOf(h).hand = [];
    const g2 = put(h, 'en_garde');
    const x = put(h, 'feint_step');
    h.apply({ type: 'play_card', uid: g2.uid });
    expect(combatOf(h).pendingChoice).toBeNull();
    expect(combatOf(h).primed.map((p) => p.card.uid)).toEqual([x.uid]);
  });

  it('Forge Oath (Phase C): 0-cost Scrap for an Ember; upgraded also 2 Onslaught', () => {
    const g = arena('oath');
    const card = put(g, 'forge_oath');
    playCard(g, card);
    expect(combatOf(g).player.statuses.embers).toBe(1);
    expect(combatOf(g).exhaust.some((x) => x.uid === card.uid)).toBe(true);
    const h = arena('oath-up');
    playCard(h, put(h, 'forge_oath', true));
    expect([combatOf(h).player.statuses.embers, onslaught(h)]).toEqual([1, 2]);
  });

  it('Vent Pressure (Phase C): always draws; at 3+ Onslaught it Spends all for energy (a Bellows trigger at 4+)', () => {
    const v2 = arena('vent-2');
    combatOf(v2).player.statuses.onslaught = 2;
    const h2 = combatOf(v2).hand.length;
    playCard(v2, put(v2, 'vent_pressure'));
    expect([combatOf(v2).energy, onslaught(v2), combatOf(v2).hand.length]).toEqual([9, 2, h2 + 2]);
    const v5 = arena('vent-5');
    playCard(v5, put(v5, 'bellows'));
    combatOf(v5).player.statuses.onslaught = 5;
    playCard(v5, put(v5, 'vent_pressure'));
    expect([combatOf(v5).energy, onslaught(v5), combatOf(v5).player.statuses.embers]).toEqual([11, 0, 2]); // Bellows is free (Phase F); 1 Ember on play + 1 from the Spend
  });

  it('Read the Line (Phase C): 0-cost draw 1, +2 more at Onslaught 3', () => {
    for (const [ons, drawn] of [[2, 1], [3, 3]] as const) {
      const g = arena(`line-${ons}`);
      combatOf(g).player.statuses.onslaught = ons;
      const hand = combatOf(g).hand.length;
      const energy = combatOf(g).energy;
      playCard(g, put(g, 'read_the_line'));
      expect([combatOf(g).hand.length, combatOf(g).energy]).toEqual([hand + drawn, energy]);
    }
  });

  it('Parry Ledger (Phase D) costs 1; upgraded it is free', () => {
    expect([getCardDef('parry_ledger').cost, getCardDef('parry_ledger', true).cost]).toEqual([1, 0]);
    const g = arena('ledger-up');
    const energy = combatOf(g).energy;
    playCard(g, put(g, 'parry_ledger', true));
    expect([combatOf(g).energy, combatOf(g).player.statuses.parry_ledger]).toEqual([energy, 1]);
  });
  it('Read the Blow: Guard + Stagger against an attack, draw otherwise', () => {
    const g = arena('blow');
    setIntent(g, 0, 'tackle');
    const ev = playCard(g, put(g, 'read_the_blow'));
    expect(eventsOf(ev, 'block')).toEqual([{ t: 'block', target: 'player', amount: 6, pool: 'guard' }]); // Phase D 8 -> 7, Phase E 7 -> 6
    expect(combatOf(g).enemies[0]?.statuses.stagger).toBe(1);
    setIntent(g, 0, 'lick');
    const hand = combatOf(g).hand.length;
    playCard(g, put(g, 'read_the_blow', true));
    expect(combatOf(g).hand.length).toBe(hand + 3);
  });

});

describe('Breaker v2: engine hooks (docs/v2/breaker-design.md §7)', () => {
  const run = (g: Game, effect: Effect): void => {
    const env = makeEnv(g.state);
    enqueue(env, [{ kind: 'effect', effect, frame: { src: { kind: 'system' }, self: 'player', target: null, x: 0 } }]);
    drain(env);
  };

  it('next-turn bank: draw / energy marked nextTurn wait for the next turn start and skip this turn\'s caps', () => {
    const g = arena('bank-flag');
    const hand = combatOf(g).hand.length;
    const energy = combatOf(g).energy;
    run(g, { type: 'draw', n: 2, nextTurn: true });
    run(g, { type: 'energy', n: 1, nextTurn: true });
    expect([combatOf(g).hand.length, combatOf(g).energy]).toEqual([hand, energy]);
    expect([combatOf(g).counters.bankDraw, combatOf(g).counters.bankEnergy]).toEqual([2, 1]);
    expect(combatOf(g).counters.effectDraw).toBeUndefined();
    setIntent(g, 0, 'lick');
    g.apply({ type: 'end_turn' });
    expect(combatOf(g).hand.length).toBe(combatOf(g).drawPerTurn + 2);
    expect(combatOf(g).energy).toBe(combatOf(g).maxEnergy + 1);
  });

  it('onStatusSpent fires only when stacks were actually spent', () => {
    const g = arena('spent-hook');
    playCard(g, put(g, 'bellows'));
    combatOf(g).player.statuses.onslaught = 5;
    run(g, { type: 'spend_status', id: 'onslaught', n: 9, effects: [] }); // fewer than 9: skipped
    expect(combatOf(g).player.statuses.embers).toBe(1); // Bellows on play (Phase E)
    run(g, { type: 'spend_status', id: 'onslaught', n: 'all', effects: [] });
    expect(combatOf(g).player.statuses.embers).toBe(2);
  });

  it('every card carries engine:* and role:* tags for the simulator', () => {
    for (const def of BREAKER_CARDS) {
      expect(def.tags?.filter((t) => t.startsWith('role:')), def.id).toHaveLength(1);
    }
    const engines = (id: string) => getCardDef(id).tags?.filter((t) => t.startsWith('engine:'));
    expect(engines('kindle')).toEqual(['engine:furnace']);
    expect(engines('molten_shell')).toEqual(['engine:bastion']);
    expect(engines('answer_in_kind')).toEqual(['engine:counter']);
    expect(engines('crazing')).toEqual(['engine:crazing']);
  });

  it('no Breaker Riposte card gains energy in its played effects (Answer in Kind banks it, so the text never lies)', () => {
    const hasEnergy = (list: readonly Effect[]): boolean =>
      list.some((e) => e.type === 'energy' || (e.type === 'conditional' && (hasEnergy(e.then) || hasEnergy(e.else ?? []))));
    for (const def of BREAKER_CARDS.filter((c) => c.riposte)) {
      for (const up of [false, true]) expect(hasEnergy(getCardDef(def.id, up).effects), def.id).toBe(false);
    }
  });
});
