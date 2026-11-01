import '../testpack';
// The 16 potions of GDD §7.1 (src/content/potions.ts): roster, text, and each potion used in a
// sandbox with its effect asserted. Registers no extra packs.
import { describe, expect, it } from 'vitest';
import { getPotionDef } from '../../src/content';
import { POTIONS, POTION_STATUSES } from '../../src/content/potions';
import { Game, nextBeat, renderPotionText, validateEffects, type Action, type CombatKind, type GameEvent, type PotionDef, type RunState } from '../../src/engine';
import { makeCard } from '../../src/engine/cards';
import { refreshIntents, startCombat } from '../../src/engine/combat';
import { makeEnv } from '../../src/engine/core';
import { newFloorRecord } from '../../src/engine/history';
import { choiceStep, drain } from '../../src/engine/queue';
import { combatOf, eventsOf, pacify, setHand } from '../engine/helpers';
import { answerChoice } from '../answer-choice';

const IDS: Record<PotionDef['rarity'], string[]> = {
  common: ['pot_flare_cell', 'pot_shield_gel', 'pot_bastion_tonic', 'pot_quicksilver', 'pot_charge_cell', 'pot_fault_dust', 'pot_concussion_gas', 'pot_shard_tincture',
    'pot_riposte_salts'],
  uncommon: ['pot_blight_vial', 'pot_seers_draught', 'pot_fury_draught', 'pot_growth_sap', 'pot_tempo_draught',
    'pot_blood_ampoule', 'pot_surge_flask', 'pot_kiln_salts', 'pot_fracture_serum', 'pot_ember_tonic', 'pot_fester_draught', 'pot_hourglass_tonic'],
  rare: ['pot_mending_ampoule', 'pot_rewind_phial', 'pot_echo_draught', 'pot_mimic_gel', 'pot_halt_ampoule'],
};
const ANYWHERE = ['pot_shard_tincture', 'pot_mending_ampoule'];
const ENEMY_TARGETED = ['pot_flare_cell', 'pot_blight_vial', 'pot_halt_ampoule', 'pot_fester_draught'];
const CLASS_POTIONS: Record<string, string> = {
  pot_fury_draught: 'breaker', pot_growth_sap: 'graft', pot_tempo_draught: 'chronist',
  pot_riposte_salts: 'breaker', pot_ember_tonic: 'breaker', pot_fester_draught: 'graft', pot_hourglass_tonic: 'chronist',
};

const STRIKES = Array.from({ length: 12 }, () => 'test_strike');

function mapRun(seed = 'potion-map', setup?: (s: RunState) => void): Game {
  const g = Game.newRun(seed, 'test_class');
  const s = g.state;
  s.startChoices = null;
  s.phase = 'map';
  s.player.hp = s.player.maxHp = 300;
  s.player.deck = STRIKES.map((id) => makeCard(s, id));
  if (setup) setup(s);
  return g;
}

/** In combat (turn 1 drawn) against `encounter`. */
function arena(encounter = 'test_enc_slimes', kind: CombatKind = 'monster'): Game {
  const g = mapRun(`potion-${encounter}`);
  const s = g.state;
  const first = s.map.rows[0]?.[0];
  if (!first) throw new Error('map has no row 0');
  s.mapPos = { row: 0, col: first.col };
  s.floor = 1;
  s.room = kind === 'event' ? 'event' : kind;
  s.history.floors.push(newFloorRecord(s, s.room));
  const env = makeEnv(s);
  startCombat(env, { encounterId: encounter, kind });
  drain(env);
  refreshIntents(env);
  pacify(g, 200);
  return g;
}

/** Hold only `id` and use it (on enemy `target` for targeted potions). */
function use(g: Game, id: string, target?: number): GameEvent[] {
  g.state.player.potions = [id];
  const a: Action = target === undefined ? { type: 'use_potion', index: 0 } : { type: 'use_potion', index: 0, target };
  const ev = g.apply(a);
  expect(g.state.player.potions).toEqual([]);
  return ev;
}

/** Answer the pending choice with `uids` (multi-pick choices take toggle steps first). */
function answer(g: Game, uids: readonly number[]): void {
  for (let i = 0; i < 20; i++) {
    const pc = combatOf(g).pendingChoice;
    if (!pc) return;
    g.apply(choiceStep(pc, uids));
  }
  throw new Error('choice never resolved');
}

function enemy(g: Game, i: number) {
  const e = combatOf(g).enemies[i];
  if (!e) throw new Error(`no enemy #${i}`);
  return e;
}

describe('potion roster', () => {
  it('has the 16 GDD potions plus the 10 shared-v2 potions by rarity, all registered', () => {
    expect(POTIONS).toHaveLength(26);
    expect(POTION_STATUSES).toEqual([]);
    for (const [rarity, ids] of Object.entries(IDS)) expect(POTIONS.filter((p) => p.rarity === rarity).map((p) => p.id)).toEqual(ids);
    for (const p of POTIONS) {
      expect(getPotionDef(p.id)).toBe(p);
      expect(p.id.startsWith('pot_')).toBe(true);
      expect(p.combatOnly, p.id).toBe(!ANYWHERE.includes(p.id));
      expect(p.target, p.id).toBe(ENEMY_TARGETED.includes(p.id) ? 'enemy' : 'none');
      expect(p.cls, p.id).toBe(CLASS_POTIONS[p.id]);
    }
  });

  it('every text renders with no placeholder (out of combat, and in combat with a target) and types no digits', () => {
    const g = arena();
    const t = enemy(g, 0).uid;
    for (const p of POTIONS) {
      expect(p.text, p.id).not.toMatch(/\d/);
      for (const text of [renderPotionText(p.id), renderPotionText(p.id, g.state, p.target === 'enemy' ? t : null)]) expect(text, p.id).not.toMatch(/[{}]/);
    }
    expect(renderPotionText('pot_flare_cell')).toBe('Deal 20 damage.');
    expect(renderPotionText('pot_mending_ampoule')).toBe('Heal 25% of your Max HP.');
    expect(renderPotionText('pot_rewind_phial')).toBe('Put up to 3 cards from your discard pile into your hand. They cost 0 this turn.');
  });

  it('effects pass the DSL validator (same rules as validateAllContent)', () => {
    const out: string[] = [];
    for (const p of POTIONS) validateEffects(p.effects, { label: `potion ${p.id}`, tables: p, hasTarget: p.target === 'enemy', combat: p.combatOnly, run: !p.combatOnly, enemy: false }, out);
    expect(out).toEqual([]);
  });

  it('only the anywhere potions can be used outside combat', () => {
    for (const p of POTIONS) {
      const g = mapRun(`map-${p.id}`);
      g.state.player.potions = [p.id];
      expect(g.legalActions().some((a) => a.type === 'use_potion'), p.id).toBe(!p.combatOnly);
    }
  });
});

describe('each potion', () => {
  it('pot_flare_cell deals 20 damage to the target', () => {
    const g = arena();
    use(g, 'pot_flare_cell', enemy(g, 1).uid);
    expect([enemy(g, 0).hp, enemy(g, 1).hp]).toEqual([200, 180]);
  });

  it('pot_shield_gel gains 12 Block', () => {
    const g = arena();
    use(g, 'pot_shield_gel');
    expect(combatOf(g).player.block).toBe(12);
  });

  it('pot_bastion_tonic gains 10 Guard', () => {
    const g = arena();
    use(g, 'pot_bastion_tonic');
    expect(combatOf(g).player.guard).toBe(10);
  });

  it('pot_quicksilver draws 3', () => {
    const g = arena();
    setHand(g, []);
    use(g, 'pot_quicksilver');
    expect(combatOf(g).hand).toHaveLength(3);
  });

  it('pot_charge_cell gains 2 energy (counted toward cap_bonus_energy)', () => {
    const g = arena();
    use(g, 'pot_charge_cell');
    expect(combatOf(g).energy).toBe(5);
    expect(combatOf(g).counters.bonusEnergy).toBe(2);
  });

  it('pot_fault_dust / pot_concussion_gas apply 3 Exposed / 3 Stagger to ALL enemies', () => {
    const g = arena();
    use(g, 'pot_fault_dust');
    use(g, 'pot_concussion_gas');
    for (const e of combatOf(g).enemies) expect([e.statuses.exposed, e.statuses.stagger]).toEqual([3, 3]);
  });

  it('pot_shard_tincture gains 1 Shard, in combat or on the map', () => {
    const g = arena();
    use(g, 'pot_shard_tincture');
    expect(g.state.player.counters.shards).toBe(1);
    const m = mapRun();
    use(m, 'pot_shard_tincture');
    expect(m.state.player.counters.shards).toBe(1);
  });

  it('pot_blight_vial applies 6 Rot to the target', () => {
    const g = arena();
    use(g, 'pot_blight_vial', enemy(g, 0).uid);
    expect([enemy(g, 0).statuses.rot, enemy(g, 1).statuses.rot]).toEqual([6, undefined]);
  });

  it("pot_seers_draught grants Augury for the combat and draws 2", () => {
    const g = arena();
    delete combatOf(g).player.statuses.augury; // the test class has it as a trait
    setHand(g, []);
    use(g, 'pot_seers_draught');
    expect(combatOf(g).player.statuses.augury).toBe(1);
    expect(combatOf(g).hand).toHaveLength(2);
  });

  it('pot_fury_draught gains 4 Onslaught', () => {
    const g = arena();
    use(g, 'pot_fury_draught');
    expect(combatOf(g).player.statuses.onslaught).toBe(4);
  });

  it('pot_growth_sap: the chosen Bloom card in hand gains 2 Bloom, kept after the fight', () => {
    const g = mapRun('sap', (s) => {
      s.player.deck = ['test_sprout', 'test_sprout', ...STRIKES].map((id) => makeCard(s, id));
    });
    const s = g.state;
    const first = s.map.rows[0]?.[0];
    if (!first) throw new Error('setup');
    s.mapPos = { row: 0, col: first.col };
    s.floor = 1;
    s.room = 'monster';
    s.history.floors.push(newFloorRecord(s, 'monster'));
    const env = makeEnv(s);
    startCombat(env, { encounterId: 'test_enc_slime', kind: 'monster' });
    drain(env);
    const c = combatOf(g);
    const sprouts = [...c.draw, ...c.hand].filter((x) => x.id === 'test_sprout');
    c.hand = sprouts;
    c.draw = c.draw.filter((x) => x.id !== 'test_sprout');
    use(g, 'pot_growth_sap');
    const pc = combatOf(g).pendingChoice;
    expect(pc?.resume.op).toBe('bloom_pick');
    const pick = sprouts[1]?.uid;
    if (pick === undefined) throw new Error('setup');
    answerChoice(g, [pick]);
    expect(combatOf(g).hand.map((x) => x.vars?.bloom)).toEqual([undefined, 2]);
    for (const e of combatOf(g).enemies) {
      e.hp = 1;
      e.block = 0;
    }
    const strike = makeCard(g.state, 'test_strike'); // keep the grown copy in hand so combat end syncs it to the deck
    combatOf(g).hand.push(strike);
    const target = combatOf(g).enemies[0]?.uid;
    if (target === undefined) throw new Error('setup');
    g.apply({ type: 'play_card', uid: strike.uid, target });
    expect(g.state.phase).toBe('reward');
    expect(g.state.player.deck.find((x) => x.uid === pick)?.vars?.bloom).toBe(2);
  });

  it('pot_tempo_draught moves the beat one position later', () => {
    const g = arena();
    combatOf(g).cardsPlayedThisTurn = ['test_strike'];
    expect(nextBeat(g.state)).toMatchObject({ count: 2, onBeat: false });
    use(g, 'pot_tempo_draught');
    expect(combatOf(g).counters.beatOffset).toBe(1);
    expect(nextBeat(g.state)).toMatchObject({ count: 3, onBeat: true });
  });

  it('pot_mending_ampoule heals 25% of Max HP, in combat or on the map', () => {
    const m = mapRun();
    m.state.player.hp = 100;
    use(m, 'pot_mending_ampoule');
    expect(m.state.player.hp).toBe(175);
    const g = arena();
    g.state.player.hp = 290;
    use(g, 'pot_mending_ampoule');
    expect(g.state.player.hp).toBe(300);
  });

  it('pot_rewind_phial returns up to 3 discarded cards to hand at cost 0 this turn', () => {
    const g = arena();
    const c = combatOf(g);
    c.discard = ['test_bash', 'test_bash', 'test_strike', 'test_block'].map((id) => makeCard(g.state, id));
    setHand(g, []);
    use(g, 'pot_rewind_phial');
    const pc = combatOf(g).pendingChoice;
    expect([pc?.min, pc?.max]).toEqual([0, 3]);
    const uids = combatOf(g).discard.slice(0, 3).map((x) => x.uid);
    answer(g, uids);
    expect(combatOf(g).hand.map((x) => [x.uid, x.tempCost])).toEqual(uids.map((u) => [u, 0]));
    expect(combatOf(g).discard).toHaveLength(1);
    combatOf(g).energy = 0;
    const bash = combatOf(g).hand[0];
    if (!bash) throw new Error('setup');
    expect(g.legalActions().some((a) => a.type === 'play_card' && a.uid === bash.uid)).toBe(true);
  });

  it('pot_halt_ampoule: the target skips its next move; bosses are immune', () => {
    const g = arena('test_enc_jaw');
    use(g, 'pot_halt_ampoule', enemy(g, 0).uid);
    expect(enemy(g, 0).statuses.halted).toBe(1);
    setHand(g, []);
    expect(eventsOf(g.apply({ type: 'end_turn' }), 'enemy_move')).toHaveLength(0);
    expect(enemy(g, 0).statuses.halted).toBeUndefined();

    const b = arena('test_enc_boss', 'boss');
    const ev = use(b, 'pot_halt_ampoule', enemy(b, 0).uid);
    expect(enemy(b, 0).statuses.halted).toBeUndefined();
    expect(ev.some((e) => e.t === 'text' && /immune/i.test(e.text))).toBe(true);
  });
});

describe('shared v2 potions', () => {
  it('pot_blood_ampoule: Strain 3, gain 2 energy', () => {
    const g = arena();
    const e = combatOf(g).energy;
    use(g, 'pot_blood_ampoule');
    expect(g.state.player.hp).toBe(297);
    expect(combatOf(g).energy).toBe(e + 2);
    expect(combatOf(g).counters.strained).toBe(3);
  });

  it('pot_surge_flask: 3 Reserve', () => {
    const g = arena();
    use(g, 'pot_surge_flask');
    expect(combatOf(g).player.statuses.reserve).toBe(3);
  });

  it('pot_kiln_salts: Scrap up to 3 chosen hand cards, draw that many', () => {
    const g = arena();
    setHand(g, ['test_strike', 'test_strike', 'test_block']);
    use(g, 'pot_kiln_salts');
    const pc = combatOf(g).pendingChoice;
    expect(pc?.min).toBe(0);
    answer(g, combatOf(g).hand.slice(0, 2).map((c) => c.uid));
    expect(combatOf(g).exhaust).toHaveLength(2);
    expect(combatOf(g).hand).toHaveLength(3);
  });

  it('pot_fracture_serum: doubles each enemy\'s own Exposed', () => {
    const g = arena();
    combatOf(g).enemies.forEach((e, i) => { e.statuses.exposed = i + 2; });
    use(g, 'pot_fracture_serum');
    expect(combatOf(g).enemies.map((e) => e.statuses.exposed)).toEqual([4, 6]);
  });

  it('pot_fester_draught: doubles the target\'s Rot', () => {
    const g = arena();
    enemy(g, 0).statuses.rot = 5;
    use(g, 'pot_fester_draught', enemy(g, 0).uid);
    expect(enemy(g, 0).statuses.rot).toBe(10);
  });

  it('pot_echo_draught: the next card resolves twice', () => {
    const g = arena();
    setHand(g, ['test_strike']);
    use(g, 'pot_echo_draught');
    const strike = combatOf(g).hand[0];
    if (!strike) throw new Error('setup');
    g.apply({ type: 'play_card', uid: strike.uid, target: enemy(g, 0).uid });
    expect(enemy(g, 0).hp).toBe(188);
  });

  it('pot_mimic_gel: a copy of the chosen hand card costs 0 this turn', () => {
    const g = arena();
    setHand(g, ['test_bash', 'test_strike']);
    use(g, 'pot_mimic_gel');
    const bash = combatOf(g).hand.find((c) => c.id === 'test_bash');
    if (!bash) throw new Error('setup');
    answerChoice(g, [bash.uid]);
    const copies = combatOf(g).hand.filter((c) => c.id === 'test_bash');
    expect(copies).toHaveLength(2);
    expect(copies[1]?.tempCost).toBe(0);
  });

  it('pot_riposte_salts primes Riposte cards now; pot_ember_tonic gains 2 Embers; pot_hourglass_tonic Gathers then Advances', () => {
    const g = arena('test_enc_jaw');
    setHand(g, ['test_parry']);
    use(g, 'pot_riposte_salts');
    expect(combatOf(g).primed).toHaveLength(1);
    use(g, 'pot_ember_tonic');
    expect(combatOf(g).player.statuses.embers).toBe(2);
    setHand(g, ['test_tock']);
    const tock = combatOf(g).hand[0];
    if (!tock) throw new Error('setup');
    g.apply({ type: 'play_card', uid: tock.uid });
    use(g, 'pot_hourglass_tonic');
    expect(combatOf(g).timeline).toHaveLength(0);
  });
});

describe('RULINGS 66 regression (sim repro)', () => {
  it('Echo Draught + Crystal Graft with exactly 1 Shard: pays once, the Reprise is skipped, nothing throws', () => {
    const g = arena();
    g.state.player.counters.shards = 1;
    setHand(g, ['crystal_graft', 'seed_bite']); // Crystal Graft counts only Graft Bloom cards
    use(g, 'pot_echo_draught');
    const graft = combatOf(g).hand.find((c) => c.id === 'crystal_graft');
    if (!graft) throw new Error('setup');
    const ev = g.apply({ type: 'play_card', uid: graft.uid });
    expect(g.state.player.counters.shards).toBe(0);
    expect(combatOf(g).hand.find((c) => c.id === 'seed_bite')?.vars?.bloom).toBe(3); // one resolution's +3 only
    expect(ev.some((e) => e.t === 'text' && /Reprise skipped/.test(e.text))).toBe(true);
  });
});
