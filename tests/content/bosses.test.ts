import '../testpack';
// All nine bosses (ENEMIES §1.3, §2.4, §3.3) and their minions: roster numbers, every move, telegraphed
// schedules and phases, minion rules, forecasts, and each boss's question mechanic.
import { describe, expect, it } from 'vitest';
import { getCardDef, getEncounterDef, getEnemyDef, getStatusDef } from '../../src/content';
import { BOSS_ENCOUNTERS, BOSS_STATUSES, BOSSES } from '../../src/content/enemies/bosses';
import { aiCtx, computeIntent, renderMoveText, renderStatusText, validateEffects, type Effect, type EnemyState, type GameEvent, type RngState } from '../../src/engine';
import { exhaustCards, makeCard, shuffleDiscardIntoDraw } from '../../src/engine/cards';
import { refreshIntents } from '../../src/engine/combat';
import { enqueue, makeEnv } from '../../src/engine/core';
import { Game } from '../../src/engine/game';
import { drain } from '../../src/engine/queue';
import { combatOf, eventsOf, padDraw, sandbox, setHand } from '../engine/helpers';

// --- helpers ---------------------------------------------------------------------------------------------

/** Status cards other content packs still owe (GDD §7.2). Anything else missing is a typo. */
const PENDING_CARDS = new Set<string>([]);

function addedCards(effects: readonly Effect[]): string[] {
  return effects.flatMap((e) => {
    if (e.type === 'add_card') return [e.card];
    if (e.type === 'conditional') return [...addedCards(e.then), ...addedCards(e.else ?? [])];
    if (e.type === 'repeat') return addedCards(e.effects);
    return [];
  });
}
/** Registered at all? (Listings are restricted to the test pack by tests/testpack-only, so look the id up.) */
function registered(id: string): boolean {
  try {
    getCardDef(id);
    return true;
  } catch (e) {
    if (e instanceof Error && /unknown card/.test(e.message)) return false;
    throw e;
  }
}
/** Missing cards a move adds every time it resolves. */
const blockingCards = (effects: readonly Effect[]): string[] => effects.flatMap((e) => (e.type === 'add_card' && !registered(e.card) ? [e.card] : []));
const blockingFor = (ids: readonly string[]): string[] =>
  [...new Set(ids.flatMap((id) => Object.values(getEnemyDef(id).moves).flatMap((m) => blockingCards(m.effects))))];

function fight(encounter: string, seed: string): Game {
  const g = sandbox({ encounter, seed, boss: true, deck: Array.from({ length: 10 }, () => 'test_block') });
  g.state.player.hp = g.state.player.maxHp = 1_000_000;
  // Non-atomic so enemy references held by a test stay live across actions.
  return new Game(g.state, { atomic: false });
}

function pass(g: Game): GameEvent[] {
  setHand(g, []);
  return g.apply({ type: 'end_turn' });
}

/** Run effects now as if from `src` (a card-less player hit, or an enemy's own effect), then refresh intents. */
function run(g: Game, effect: Effect, self: 'player' | number, target: 'player' | number): GameEvent[] {
  const env = makeEnv(g.state);
  const src = self === 'player' ? { kind: 'system' as const } : (() => {
    const e = byUid(g, self);
    return { kind: 'enemy' as const, uid: e.uid, id: e.id, moveId: null };
  })();
  enqueue(env, [{ kind: 'effect', effect, frame: { src, self, target, x: 0 } }]);
  drain(env);
  refreshIntents(env);
  return env.events;
}
const hit = (g: Game, uid: number, amount: number): GameEvent[] => run(g, { type: 'damage', amount, target: 'target' }, 'player', uid);

function byUid(g: Game, uid: number): EnemyState {
  const e = combatOf(g).enemies.find((x) => x.uid === uid);
  if (!e) throw new Error(`no enemy ${uid}`);
  return e;
}
function enemyOf(g: Game, id: string, nth = 0): EnemyState {
  const e = combatOf(g).enemies.filter((x) => x.id === id)[nth];
  if (!e) throw new Error(`no ${id} #${nth} in combat`);
  return e;
}
const alive = (g: Game, id: string): EnemyState[] => combatOf(g).enemies.filter((e) => e.alive && e.id === id);

/** Pure AI run for rounds 1..turns; `aiAt(t)` overlays aiState (e.g. a phase reached at round k). */
function simulate(g: Game, e: EnemyState, turns: number, aiAt: (t: number) => Record<string, number> = () => ({})): string[] {
  const def = getEnemyDef(e.id);
  const rng: RngState = [...e.rng];
  const hist: string[] = [];
  for (let t = 1; t <= turns; t++) {
    const m = def.chooseMove(aiCtx(combatOf(g), { ...e, aiState: { ...e.aiState, ...aiAt(t) } }, rng, hist, t));
    expect(Object.keys(def.moves)).toContain(m);
    hist.push(m);
  }
  return hist;
}
const choose = (g: Game, e: EnemyState, history: string[], forTurn: number, aiState: Record<string, number> = {}): string =>
  getEnemyDef(e.id).chooseMove(aiCtx(combatOf(g), { ...e, aiState: { ...e.aiState, ...aiState } }, [...e.rng], history, forTurn));

/** Phase overlay: phase `p` reached with its first choice at round `at`. */
const phaseFrom = (p2: number, p3 = Infinity) => (t: number): Record<string, number> => {
  if (t >= p3) return { phase: 3, p2: 1, p3: 1, p2_turn: Math.min(p2, p3), p3_turn: p3 };
  if (t >= p2) return { phase: 2, p2: 1, p2_turn: p2 };
  return {};
};

function expectCycle(seq: readonly string[], cycle: readonly string[], from = 0): void {
  seq.slice(from).forEach((m, i) => expect(m, `choice ${from + i + 1}`).toBe(cycle[i % cycle.length]));
}

/** Expected next move given the previous one, for by-last machines. */
function expectByLast(seq: readonly string[], rules: Record<string, string>, from = 1): void {
  for (let i = Math.max(1, from); i < seq.length; i++) {
    const want = rules[seq[i - 1] as string];
    if (want !== undefined) expect(seq[i], `choice ${i + 1} after ${seq[i - 1]}`).toBe(want);
  }
}

const TURNS = 200;
const SEEDS = Array.from({ length: 5 }, (_, i) => `boss-ai-${i}`);

const BOSS_IDS = ['bramble_ram', 'mother_orchid', 'gloam_empress', 'grand_assembler', 'furnace_heart', 'trihammer', 'tether_sovereign', 'star_archivist', 'leukarch'];
const MINION_IDS = ['orchid_bud', 'assembly_frame', 'welded_horror', 'trihammer_arm', 'antibody'];
const ROSTER_HP: Record<string, [number, number]> = {
  bramble_ram: [200, 210], mother_orchid: [165, 175], orchid_bud: [8, 10], gloam_empress: [205, 215],
  grand_assembler: [290, 300], assembly_frame: [18, 22], welded_horror: [38, 42], furnace_heart: [340, 360],
  trihammer: [240, 250], trihammer_arm: [32, 36], tether_sovereign: [530, 550], star_archivist: [510, 530],
  leukarch: [450, 470], antibody: [20, 24],
};
const ENCOUNTER_OF: Record<string, { id: string; act: number; extra: string[] }> = {
  bramble_ram: { id: 'enc_a1_ram', act: 1, extra: [] },
  mother_orchid: { id: 'enc_a1_orchid', act: 1, extra: ['orchid_bud'] },
  gloam_empress: { id: 'enc_a1_empress', act: 1, extra: [] },
  grand_assembler: { id: 'enc_a2_assembler', act: 2, extra: ['assembly_frame', 'welded_horror'] },
  furnace_heart: { id: 'enc_a2_furnace', act: 2, extra: [] },
  trihammer: { id: 'enc_a2_trihammer', act: 2, extra: ['trihammer_arm'] },
  tether_sovereign: { id: 'enc_a3_sovereign', act: 3, extra: [] },
  star_archivist: { id: 'enc_a3_archivist', act: 3, extra: [] },
  leukarch: { id: 'enc_a3_leukarch', act: 3, extra: ['antibody'] },
};

// --- roster -------------------------------------------------------------------------------------------------

describe('boss roster', () => {
  it('nine bosses plus their five minions, HP per ENEMIES', () => {
    expect(BOSSES.map((b) => b.id).sort()).toEqual([...BOSS_IDS, ...MINION_IDS].sort());
    for (const d of BOSSES) {
      expect(d.hp, d.id).toEqual(ROSTER_HP[d.id]);
      expect(d.boss === true, d.id).toBe(BOSS_IDS.includes(d.id));
    }
    for (const id of MINION_IDS) expect(getEnemyDef(id).onLeaderDeath, id).toBe('die');
    expect(BOSS_STATUSES.map((s) => s.id).sort()).toEqual([
      'archive_page', 'assembly_line', 'brace_transfer', 'catalogue', 'catalogue_watch', 'charge_meter', 'crown_rage', 'furnace_core', 'furnace_vent', 'heat', 'overflow', 'overflow_stored', 'progress', 'ripening', 'seed_bank', 'seething', 'white_fever',
    ]);
    for (const s of BOSS_STATUSES) expect(renderStatusText(s.id, 1)).not.toMatch(/[{}]/);
  });

  it('one boss encounter per boss, in its act; Trihammer is body + 3 arms led by the body', () => {
    expect(BOSS_ENCOUNTERS).toHaveLength(9);
    for (const [boss, want] of Object.entries(ENCOUNTER_OF)) {
      const enc = BOSS_ENCOUNTERS.find((e) => e.id === want.id);
      if (!enc) throw new Error(want.id);
      expect(enc.pool).toBe('boss');
      expect(enc.acts).toEqual([want.act]);
      expect(enc.weight).toBe(1);
      expect(typeof enc.enemies[0] === 'string' ? enc.enemies[0] : enc.enemies[0]?.id).toBe(boss);
    }
    for (const act of [1, 2, 3]) expect(BOSS_ENCOUNTERS.filter((e) => e.acts.includes(act as 1 | 2 | 3))).toHaveLength(3);
    const tri = BOSS_ENCOUNTERS.find((e) => e.id === 'enc_a2_trihammer');
    expect(tri?.enemies.slice(1)).toEqual([0, 1, 2].map(() => ({ id: 'trihammer_arm', leader: 0, withLeader: 'die' })));
    const defs = (tri?.enemies ?? []).map((s) => getEnemyDef(typeof s === 'string' ? s : s.id));
    expect([defs.reduce((a, d) => a + d.hp[0], 0), defs.reduce((a, d) => a + d.hp[1], 0)]).toEqual([336, 358]); // "about 350"
  });

  it('only the known pending status cards are unregistered', () => {
    for (const def of BOSSES) for (const m of Object.values(def.moves)) for (const id of addedCards(m.effects).filter((x) => !registered(x))) expect(PENDING_CARDS).toContain(id);
  });

  it('registered, and every move / passive trigger passes the DSL validator', () => {
    const out: string[] = [];
    for (const def of BOSSES) {
      expect(getEnemyDef(def.id)).toBe(def);
      for (const sid of Object.keys(def.spawnStatuses ?? {})) getStatusDef(sid);
      for (const [id, m] of Object.entries(def.moves)) {
        validateEffects(m.effects, { label: `enemy ${def.id}.${id}`, tables: def, hasTarget: true, combat: true, run: false, enemy: true }, out);
      }
    }
    for (const s of BOSS_STATUSES) {
      expect(getStatusDef(s.id)).toBe(s);
      for (const [hook, effects] of Object.entries(s.triggers ?? {})) {
        validateEffects(effects ?? [], { label: `status ${s.id}.${hook}`, tables: s, hasTarget: false, combat: true, run: false, enemy: true }, out);
      }
    }
    for (const enc of BOSS_ENCOUNTERS) expect(getEncounterDef(enc.id)).toBe(enc);
    expect(out).toEqual([]);
  });

  it('chooseMove never mentions player state (GDD §2.9)', () => {
    for (const def of BOSSES) expect(def.chooseMove.toString(), def.id).not.toMatch(/\b(state|combat|player)\b/);
  });
});

// --- every move ---------------------------------------------------------------------------------------------

/** A fight in which `id` is on the field (minions are summoned / built first). */
function fightWith(id: string, seed: string): Game {
  const home = Object.entries(ENCOUNTER_OF).find(([boss, e]) => boss === id || e.extra.includes(id));
  if (!home) throw new Error(`no encounter for ${id}`);
  const g = fight(home[1].id, seed);
  if (['orchid_bud', 'assembly_frame', 'welded_horror', 'antibody'].includes(id)) pass(g); // Sow / Lay Frame / Muster on turn 1
  if (id === 'welded_horror') {
    const f = enemyOf(g, 'assembly_frame');
    run(g, { type: 'transform', into: 'welded_horror' }, f.uid, 'player');
  }
  return g;
}

describe('every boss and minion move resolves against a sandbox player', () => {
  for (const def of BOSSES) {
    for (const [moveId, move] of Object.entries(def.moves)) {
      const missing = blockingCards(move.effects);
      it.skipIf(missing.length > 0)(`${def.id}.${moveId}${missing.length ? ` (blocked on ${missing.join(', ')})` : ''}`, () => {
        const g = fightWith(def.id, `move-${def.id}-${moveId}`);
        const e = enemyOf(g, def.id);
        // Isolate the move: everyone else skips (set directly; bosses are only immune to the halt_enemy effect).
        for (const o of combatOf(g).enemies) if (o.uid !== e.uid && o.alive) o.statuses.halted = 1;
        e.intent = computeIntent(g.state, e, moveId);
        expect(renderMoveText(g.state, e.uid, moveId)).not.toMatch(/[{}]/);
        pass(g);
        expect(e.moveHistory[e.moveHistory.length - 1]).toBe(moveId);
        expect(Object.keys(def.moves)).toContain(e.intent.moveId);
      });
    }
  }
});

// --- telegraphed schedules (pure chooseMove, 200 seeded rounds) ------------------------------------------

describe('boss schedules over 200 rounds', () => {
  it('bramble_ram: Stomp → Volley → Lower Head → Charge; phase 2 Lower Head → Charge → Volley; Stumble resumes', () => {
    for (const seed of SEEDS) {
      const g = fight('enc_a1_ram', seed);
      const ram = enemyOf(g, 'bramble_ram');
      const s = simulate(g, ram, TURNS, phaseFrom(101));
      expectCycle(s.slice(0, 100), ['stomp', 'thorn_volley', 'lower_head', 'bramble_charge']);
      // Phase 2 continues by last move: Charge (the 100th move) -> Volley -> Lower Head -> Charge ...
      expectCycle(s.slice(100), ['thorn_volley', 'lower_head', 'bramble_charge']);
      // Lower Head is always the current intent the turn before a Charge (the telegraph).
      s.forEach((m, i) => { if (m === 'bramble_charge') expect(s[i - 1]).toBe('lower_head'); });
    }
    const g = fight('enc_a1_ram', 'stumble');
    const ram = enemyOf(g, 'bramble_ram');
    expect(choose(g, ram, ['stomp', 'thorn_volley', 'lower_head', 'stumble'], 5)).toBe('stomp');
    expect(choose(g, ram, ['stomp', 'thorn_volley', 'lower_head', 'stumble'], 5, { phase: 2, p2: 1, p2_turn: 5 })).toBe('thorn_volley');
  });

  it('mother_orchid: Sow → Crush → Storm → Nectar → Sow (≤2 Buds); phase 2 opens with Full Bloom once and drops Nectar', () => {
    const g = fight('enc_a1_orchid', 'orchid');
    const o = enemyOf(g, 'mother_orchid');
    const s = simulate(g, o, TURNS, phaseFrom(50));
    expectCycle(s.slice(0, 49), ['sow', 'vine_crush', 'pollen_storm', 'nectar']);
    expect(s[49]).toBe('full_bloom');
    expect(s.filter((m) => m === 'full_bloom')).toHaveLength(1);
    expect(s.slice(50)).not.toContain('nectar');
    expectCycle(s.slice(50), ['vine_crush', 'pollen_storm', 'sow']); // no Buds alive in the pure run
    // With 3+ Buds alive she skips Sow.
    const full = fight('enc_a1_orchid', 'orchid-full');
    pass(full);
    pass(full);
    run(full, { type: 'summon', enemy: 'orchid_bud', n: 2, cap: 4, withLeader: 'die' }, enemyOf(full, 'mother_orchid').uid, 'player');
    expect(choose(full, enemyOf(full, 'mother_orchid'), ['sow', 'vine_crush', 'pollen_storm', 'nectar'], 5)).toBe('vine_crush');
  });

  it('orchid_bud: Ripening twice, then Ripe Lash forever', () => {
    const g = fightWith('orchid_bud', 'bud');
    const bud = enemyOf(g, 'orchid_bud');
    for (const e of combatOf(g).enemies) if (e.uid !== bud.uid) e.statuses.halted = 1;
    const seen: string[] = [];
    for (let i = 0; i < 6; i++) {
      seen.push(bud.intent.moveId);
      expect(bud.forecast[0]?.moveId).toBe(i < 1 ? 'ripen' : 'ripe_lash');
      for (const e of combatOf(g).enemies) if (e.uid !== bud.uid) e.statuses.halted = 1;
      pass(g);
    }
    expect(seen).toEqual(['ripen', 'ripen', 'ripe_lash', 'ripe_lash', 'ripe_lash', 'ripe_lash']);
  });

  it('gloam_empress: Dust → Buffet → Mothlight → Cocoon; phase 2 Dust Storm → Mothlight → Buffet', () => {
    const g = fight('enc_a1_empress', 'empress');
    const s = simulate(g, enemyOf(g, 'gloam_empress'), TURNS, phaseFrom(101));
    expectCycle(s.slice(0, 100), ['scale_dust', 'wing_buffet', 'mothlight', 'silk_cocoon']);
    expectCycle(s.slice(100), ['dust_storm', 'mothlight', 'wing_buffet']);
  });

  it('grand_assembler: Lay → Sweep → Weld → Girder → (≤1 minion ? Lay : Weld); phase 2 Rush Order once, then Weld → Sweep → Girder', () => {
    const g = fight('enc_a2_assembler', 'assembler');
    const s = simulate(g, enemyOf(g, 'grand_assembler'), TURNS, phaseFrom(101));
    expectCycle(s.slice(0, 100), ['lay_frame', 'torch_sweep', 'weld', 'girder_drop']);
    expect(s[100]).toBe('rush_order');
    expectCycle(s.slice(101), ['weld', 'torch_sweep', 'girder_drop']);
    expect(s.filter((m) => m === 'rush_order')).toHaveLength(1);
    const two = fightWith('assembly_frame', 'assembler-2');
    expect(choose(two, enemyOf(two, 'grand_assembler'), ['lay_frame', 'torch_sweep', 'weld', 'girder_drop'], 5)).toBe('weld');
  });

  it('assembly_frame idles; welded_horror alternates Weld Claw / Sear starting with Weld Claw', () => {
    const g = fightWith('welded_horror', 'horror');
    expect(new Set(simulate(g, enemyOf(g, 'assembly_frame'), 50))).toEqual(new Set(['idle']));
    const h = simulate(g, enemyOf(g, 'welded_horror'), 50);
    expectCycle(h, ['weld_claw', 'sear']);
  });

  it('furnace_heart: fixed 5-cycle ending in Meltdown; phase 2 restarts a 4-cycle on the next choice', () => {
    const g = fight('enc_a2_furnace', 'furnace');
    const s = simulate(g, enemyOf(g, 'furnace_heart'), TURNS, phaseFrom(103));
    expectCycle(s.slice(0, 102), ['slag_tide', 'crucible_swing', 'bellows_blast', 'crucible_swing', 'meltdown']);
    expectCycle(s.slice(102), ['slag_tide', 'crucible_swing', 'bellows_blast', 'meltdown']);
  });

  it('trihammer: Overtime turn 1 → Trip-Hammer → Quake → Overtime; no Arms: Grapple / Steam Vent; Arm (T+slot)%3', () => {
    const g = fight('enc_a2_trihammer', 'tri');
    const body = enemyOf(g, 'trihammer');
    expectCycle(simulate(g, body, TURNS), ['overtime', 'trip_hammer', 'ground_quake']);
    const arms = alive(g, 'trihammer_arm');
    expect(arms.map((a) => a.aiState.slot)).toEqual([0, 1, 2]);
    for (const a of arms) {
      const seq = simulate(g, a, 60);
      seq.forEach((m, i) => expect(m).toBe((i + 1 + (a.aiState.slot ?? -99)) % 3 === 0 ? 'brace_frame' : 'piston'));
    }
    // Each round exactly one Arm braces and two hammer.
    for (let t = 1; t <= 30; t++) expect(arms.filter((a) => (t + (a.aiState.slot ?? -99)) % 3 === 0)).toHaveLength(1);
    for (const a of arms) a.alive = false;
    expectCycle(simulate(g, body, 40), ['grapple', 'steam_vent']);
  });

  it('tether_sovereign: Decree → Lash → Anchor → Crownlight; phase 2 4-cycle from Starfall; phase 3 Starfall / Anchor', () => {
    const g = fight('enc_a3_sovereign', 'sov');
    const s = simulate(g, enemyOf(g, 'tether_sovereign'), TURNS, phaseFrom(61, 141));
    expectCycle(s.slice(0, 60), ['decree', 'tether_lash', 'anchor_drop', 'crownlight']);
    expectCycle(s.slice(60, 140), ['starfall', 'anchor_drop', 'decree', 'tether_lash']);
    expectCycle(s.slice(140), ['starfall', 'anchor_drop']);
    expect(s.slice(60)).not.toContain('crownlight');
  });

  it('star_archivist: Redact → Barrage → Footnote; phase 2 cycle Redact, Barrage, Errata, Barrage', () => {
    const g = fight('enc_a3_archivist', 'arch');
    const s = simulate(g, enemyOf(g, 'star_archivist'), TURNS, phaseFrom(100));
    expectCycle(s.slice(0, 99), ['redact', 'index_barrage', 'footnote']);
    expectCycle(s.slice(99), ['redact', 'index_barrage', 'errata', 'index_barrage']);
    expect(s.slice(0, 99)).not.toContain('errata');
  });

  it('leukarch: P1 Muster → Storm → Engulf → (Muster|Storm); P2 Calcify → Storm → Engulf → (Muster|Calcify); P3 Consume once, then Pitch → Storm → Engulf', () => {
    const g = fight('enc_a3_leukarch', 'leuk');
    const l = enemyOf(g, 'leukarch');
    const s = simulate(g, l, TURNS, phaseFrom(61, 141));
    expectCycle(s.slice(0, 60), ['muster', 'cilia_storm', 'engulf']); // no Antibodies alive in the pure run
    expectByLast(s.slice(60, 140), { calcify: 'cilia_storm', cilia_storm: 'engulf', engulf: 'muster', muster: 'calcify' });
    expect(s.slice(60, 140)).toContain('calcify');
    expect(s[140]).toBe('consume');
    expect(s.filter((m) => m === 'consume')).toHaveLength(1);
    expectCycle(s.slice(141), ['fever_pitch', 'cilia_storm', 'engulf']);
    // With the Antibodies at strength it skips Muster.
    pass(g);
    expect(alive(g, 'antibody')).toHaveLength(2);
    expect(choose(g, l, ['muster', 'cilia_storm', 'engulf'], 4)).toBe('cilia_storm');
    run(g, { type: 'summon', enemy: 'antibody', fillTo: 3, cap: 3, withLeader: 'die' }, l.uid, 'player');
    expect(choose(g, l, ['calcify', 'cilia_storm', 'engulf'], 4, { phase: 2, p2: 1, p2_turn: 2 })).toBe('calcify');
  });

  it('antibody alternates Tag / Opsonize starting with Tag', () => {
    const g = fightWith('antibody', 'ab');
    expectCycle(simulate(g, enemyOf(g, 'antibody'), 40), ['tag', 'opsonize']);
  });
});

// --- phase transitions at HP thresholds (live engine) ------------------------------------------------------

describe('phase transitions at HP thresholds never rewrite the current intent', () => {
  const CASES: { boss: string; at: (e: EnemyState) => number; first: string }[] = [
    { boss: 'bramble_ram', at: (e) => Math.floor(e.maxHp / 2), first: 'lower_head' },
    { boss: 'mother_orchid', at: (e) => Math.floor(e.maxHp / 2), first: 'full_bloom' },
    { boss: 'gloam_empress', at: (e) => Math.floor(e.maxHp / 2), first: 'dust_storm' },
    { boss: 'grand_assembler', at: (e) => Math.floor(e.maxHp / 2), first: 'rush_order' },
    { boss: 'furnace_heart', at: (e) => Math.floor(e.maxHp / 2), first: 'slag_tide' },
    { boss: 'tether_sovereign', at: (e) => Math.floor(e.maxHp / 2), first: 'starfall' },
    { boss: 'star_archivist', at: (e) => Math.floor(e.maxHp / 2), first: 'redact' },
    { boss: 'leukarch', at: () => 320, first: 'calcify' },
  ];
  for (const k of CASES) {
    it(`${k.boss}: crossing into phase 2 changes only the forecast (next: ${k.first})`, () => {
      const g = fight(ENCOUNTER_OF[k.boss]?.id ?? '', `phase-${k.boss}`);
      const b = enemyOf(g, k.boss);
      // Leukarch round 1 is Muster, whose phase-2 successor is Calcify; others: any current intent.
      const intent = b.intent.moveId;
      b.hp = k.at(b) + 2;
      b.block = 0;
      hit(g, b.uid, 1);
      expect(b.hp).toBe(k.at(b) + 1); // one above the line: still phase 1
      expect(b.aiState.phase ?? 1).toBe(1);
      hit(g, b.uid, 1);
      expect(b.aiState.phase).toBe(2);
      expect(b.aiState.p2_turn).toBe(b.intentTurn + 1);
      expect(b.intent.moveId).toBe(intent);
      expect(b.forecast[0]?.moveId).toBe(k.first);
    });
  }

  it('leukarch: 320 → phase 2, 160 → phase 3; a big hit can skip phase 2 (both markers set)', () => {
    const g = fight('enc_a3_leukarch', 'leuk-phase');
    const l = enemyOf(g, 'leukarch');
    l.hp = 330;
    hit(g, l.uid, 30);
    expect([l.aiState.phase, l.aiState.p2]).toEqual([2, 1]);
    hit(g, l.uid, 140);
    expect([l.aiState.phase, l.aiState.p3, l.aiState.p3_turn]).toEqual([3, 1, l.intentTurn + 1]);
    expect(l.forecast[0]?.moveId).toBe('consume');
    const g2 = fight('enc_a3_leukarch', 'leuk-skip');
    const l2 = enemyOf(g2, 'leukarch');
    l2.hp = 330;
    hit(g2, l2.uid, 200);
    expect([l2.aiState.phase, l2.aiState.p2, l2.aiState.p3, l2.aiState.p2_turn, l2.aiState.p3_turn]).toEqual([3, 1, 1, 2, 2]);
  });

  it('tether_sovereign: 20% → phase 3 (line 40, Starfall / Anchor alternation)', () => {
    const g = fight('enc_a3_sovereign', 'sov-p3');
    const s = enemyOf(g, 'tether_sovereign');
    s.hp = Math.floor(s.maxHp / 5) + 1;
    hit(g, s.uid, 1);
    expect([s.aiState.phase, s.aiState.p2, s.aiState.p3]).toEqual([3, 1, 1]);
    expect(s.forecast[0]?.moveId).toBe('starfall');
  });

  it('live: the Ram enters phase 2 mid-fight and follows the phase-2 machine from its next choice', () => {
    const g = fight('enc_a1_ram', 'ram-live');
    const ram = enemyOf(g, 'bramble_ram');
    pass(g); // stomp
    combatOf(g).player.statuses = {};
    ram.hp = Math.floor(ram.maxHp / 2) + 5;
    hit(g, ram.uid, 5);
    expect(ram.intent.moveId).toBe('thorn_volley'); // unchanged
    expect(ram.intent.damage).toBe(4 + 2); // rage 2 shows live
    expect(ram.aiState.break_at).toBe(24);
    const seen: string[] = [];
    for (let i = 0; i < 7; i++) {
      seen.push(ram.intent.moveId);
      pass(g);
    }
    expect(seen).toEqual(['thorn_volley', 'lower_head', 'bramble_charge', 'thorn_volley', 'lower_head', 'bramble_charge', 'thorn_volley']);
  });
});

// --- forecasts in live fights ------------------------------------------------------------------------------

describe('boss forecasts in live fights (30 passive rounds)', () => {
  for (const [boss, enc] of Object.entries(ENCOUNTER_OF)) {
    const blocked = blockingFor([boss, ...enc.extra]);
    it.skipIf(blocked.length > 0)(`${enc.id}: every forecast is known, and exact unless enemy-side state changed${blocked.length ? ` (blocked on ${blocked.join(', ')})` : ''}`, () => {
      const g = fight(enc.id, `forecast-${enc.id}`);
      let predicted = new Map<number, { id: string; move: string }>();
      let nectar = false;
      for (let t = 0; t < 30; t++) {
        const c = combatOf(g);
        for (const e of c.enemies.filter((x) => x.alive)) {
          const p = predicted.get(e.uid);
          // Nectar lowers Ripening during the enemy phase (a visible, telegraphed enemy-side change).
          const exempt = p === undefined || p.id !== e.id || (nectar && e.id === 'orchid_bud');
          if (!exempt) expect(e.intent.moveId, `${e.id} round ${c.turn}`).toBe(p.move);
          expect(e.forecast).toHaveLength(1);
          for (const f of e.forecast) {
            expect(f.kind).not.toBe('unknown');
            expect(f.hidden).toBeUndefined();
          }
        }
        nectar = c.enemies.some((e) => e.alive && e.intent.moveId === 'nectar');
        predicted = new Map(c.enemies.filter((e) => e.alive).map((e) => [e.uid, { id: e.id, move: e.forecast[0]?.moveId ?? '' }]));
        pass(g);
      }
    });
  }
});

// --- the questions -----------------------------------------------------------------------------------------

describe('Bramble Ram: "Can you hit hard on cue?"', () => {
  function toCharge(seed: string): { g: Game; ram: EnemyState } {
    const g = fight('enc_a1_ram', seed);
    const ram = enemyOf(g, 'bramble_ram');
    for (let i = 0; i < 3; i++) pass(g);
    expect(ram.intent.moveId).toBe('bramble_charge');
    combatOf(g).player.statuses = {};
    refreshIntents(makeEnv(g.state));
    return { g, ram };
  }

  it('the charge breaks at 20 HP lost in the window: intent becomes Stumble at once', () => {
    const { g, ram } = toCharge('break');
    expect(ram.intent.damage).toBe(27);
    ram.block = 0;
    hit(g, ram.uid, 19);
    expect([ram.intent.moveId, ram.aiState.meter]).toEqual(['bramble_charge', 19]);
    const ev = hit(g, ram.uid, 1);
    expect(ram.intent.moveId).toBe('stumble');
    expect(eventsOf(ev, 'enemy_intent').some((i) => i.uid === ram.uid && i.intent.moveId === 'stumble')).toBe(true);
    expect([ram.aiState.broken, ram.aiState.meter]).toEqual([1, 0]);
    expect(ram.forecast[0]?.moveId).toBe('stomp');
    const ev2 = pass(g);
    expect(eventsOf(ev2, 'damage').filter((d) => d.source === ram.uid)).toHaveLength(0);
    expect(ram.intent.moveId).toBe('stomp');
    expect(ram.aiState.unbroken ?? 0).toBe(0);
  });

  it('Block-absorbed damage does not count, and the meter resets when the window closes', () => {
    const { g, ram } = toCharge('block');
    ram.block = 10;
    hit(g, ram.uid, 25);
    expect(ram.aiState.meter).toBe(15);
    expect(ram.intent.moveId).toBe('bramble_charge');
    pass(g); // the Charge lands
    expect(ram.aiState.meter).toBe(0);
    expect(ram.aiState.unbroken).toBe(1);
    hit(g, ram.uid, 30); // not in a window: Stomp is the intent
    expect(ram.aiState.meter).toBe(0);
    expect(ram.intent.moveId).toBe('stomp');
  });

  it('each unbroken Charge grows by 4 (27, 31, ...)', () => {
    const { g, ram } = toCharge('grow');
    const ev = pass(g);
    expect(eventsOf(ev, 'damage').find((d) => d.source === ram.uid)?.amount).toBe(27);
    for (let i = 0; i < 3; i++) pass(g);
    combatOf(g).player.statuses = {};
    refreshIntents(makeEnv(g.state));
    expect(ram.intent.moveId).toBe('bramble_charge');
    expect(ram.intent.damage).toBe(31);
    expect(renderMoveText(g.state, ram.uid, 'bramble_charge')).toBe(
      'Deal 31 damage; +4 for each Charge you did not break. Breaks if it loses 20 HP during your turn (24 in phase 2).',
    );
  });

  it('phase 2 raises the break line to 24', () => {
    const { g, ram } = toCharge('p2-break');
    ram.block = 0;
    ram.hp = Math.floor(ram.maxHp / 2) + 1;
    hit(g, ram.uid, 22); // crosses 50% and fills 22 of 24
    expect(ram.aiState.phase).toBe(2);
    expect(ram.intent.moveId).toBe('bramble_charge');
    hit(g, ram.uid, 2);
    expect(ram.intent.moveId).toBe('stumble');
  });
});

describe('Mother Orchid: "Can you keep the garden mowed while you cut the root?"', () => {
  it('Vine Crush grows +1 per use (a stall breaker that never punishes mowing the Buds)', () => {
    const g = fight('enc_a1_orchid', 'crush');
    const o = enemyOf(g, 'mother_orchid');
    expect(computeIntent(g.state, o, 'vine_crush').damage).toBe(15);
    o.intent = computeIntent(g.state, o, 'vine_crush');
    pass(g);
    combatOf(g).player.statuses = {};
    expect(computeIntent(g.state, o, 'vine_crush').damage).toBe(16);
    expect(renderMoveText(g.state, o.uid, 'vine_crush')).toBe('Deal 16 damage (+1 each use).');
  });

  it('Sow, Nectar ripens Buds, Full Bloom buds ripen after 1, cap 4, Buds die with her', () => {
    const g = fight('enc_a1_orchid', 'garden');
    const o = enemyOf(g, 'mother_orchid');
    pass(g); // sow
    let buds = alive(g, 'orchid_bud');
    expect(buds).toHaveLength(2);
    for (const b of buds) {
      expect([b.leaderUid, b.withLeader, b.statuses.ripening]).toEqual([o.uid, 'die', 2]);
    }
    o.intent = computeIntent(g.state, o, 'nectar');
    o.hp -= 20;
    const ev = pass(g);
    expect(eventsOf(ev, 'heal').find((h) => h.target === o.uid)?.amount).toBe(10);
    // Nectar (-1) then each Bud's own Ripening (-1): both ripe, attacking next.
    for (const b of buds) {
      expect(b.statuses.ripening ?? 0).toBe(0);
      expect(b.intent.moveId).toBe('ripe_lash');
    }
    run(g, { type: 'custom', fn: 'full_bloom' }, o.uid, 'player');
    buds = alive(g, 'orchid_bud');
    expect(buds).toHaveLength(4); // cap 4: only 2 of 3 fit
    const fresh = buds.slice(2);
    for (const b of fresh) {
      expect(b.statuses.ripening).toBe(1);
      expect(b.intent.moveId).toBe('ripen');
      expect(b.forecast[0]?.moveId).toBe('ripe_lash');
    }
    o.hp = 1;
    o.block = 0;
    const kill = hit(g, o.uid, 5);
    expect(eventsOf(kill, 'enemy_died')).toHaveLength(5);
    expect(eventsOf(kill, 'combat_won')).toHaveLength(1);
  });
});

describe('Gloam Empress: "Can your damage survive being blunted?"', () => {
  it('every Silk Cocoon adds a Wing Buffet hit for the rest of the fight (a scaling attack)', () => {
    const g = fight('enc_a1_empress', 'cocoon');
    const e = enemyOf(g, 'gloam_empress');
    expect(computeIntent(g.state, e, 'wing_buffet').hits).toBe(3);
    e.intent = computeIntent(g.state, e, 'silk_cocoon');
    pass(g);
    expect(computeIntent(g.state, e, 'wing_buffet').hits).toBe(4);
    e.intent = computeIntent(g.state, e, 'wing_buffet');
    const ev = pass(g);
    expect(eventsOf(ev, 'damage').filter((d) => d.source === e.uid)).toHaveLength(4);
    expect(computeIntent(g.state, e, 'wing_buffet').hits).toBe(4);
    e.intent = computeIntent(g.state, e, 'silk_cocoon');
    pass(g);
    expect(computeIntent(g.state, e, 'wing_buffet').hits).toBe(5);
    expect(renderMoveText(g.state, e.uid, 'silk_cocoon')).toBe('Gain 18 Block. Wing Buffet hits 1 more time for the rest of the fight.');
  });
});

describe('Grand Assembler: "Can you scrap the line while cutting the foreman?"', () => {
  it('three Welds turn a Frame into a Welded Horror at the end of the Weld; phase 2 Welds add 2; Rush Order fills to 3', () => {
    const g = fight('enc_a2_assembler', 'line');
    const a = enemyOf(g, 'grand_assembler');
    pass(g); // lay_frame
    const frames = alive(g, 'assembly_frame');
    expect(frames).toHaveLength(2);
    const f = frames[0] as EnemyState;
    expect([f.leaderUid, f.withLeader]).toEqual([a.uid, 'die']);
    for (let i = 1; i <= 3; i++) {
      for (const o of combatOf(g).enemies) if (o.uid !== a.uid) o.statuses.halted = 1;
      a.intent = computeIntent(g.state, a, 'weld');
      const ev = pass(g);
      if (i < 3) expect(f.statuses.progress).toBe(i);
      else {
        expect(eventsOf(ev, 'enemy_transformed').map((x) => [x.uid, x.to])).toEqual(frames.map((x) => [x.uid, 'welded_horror']));
        expect(f.id).toBe('welded_horror');
        expect(f.hp).toBe(f.maxHp);
        expect(f.hp).toBeGreaterThanOrEqual(38);
        expect(f.statuses.progress).toBeUndefined();
        expect(f.intent.moveId).toBe('weld_claw');
        expect(f.withLeader).toBe('die');
      }
    }
    a.hp = Math.floor(a.maxHp / 2) + 1;
    a.block = 0;
    hit(g, a.uid, 1);
    expect(a.forecast[0]?.moveId).toBe('rush_order');
    a.intent = computeIntent(g.state, a, 'rush_order');
    for (const o of combatOf(g).enemies) if (o.uid !== a.uid) o.statuses.halted = 1;
    pass(g);
    const fresh = alive(g, 'assembly_frame');
    expect(fresh.length + alive(g, 'welded_horror').length).toBe(3);
    a.intent = computeIntent(g.state, a, 'weld');
    for (const o of combatOf(g).enemies) if (o.uid !== a.uid) o.statuses.halted = 1;
    pass(g);
    expect(fresh[0]?.statuses.progress).toBe(2);
    a.hp = 1;
    a.block = 0;
    const kill = hit(g, a.uid, 50);
    expect(eventsOf(kill, 'enemy_died')).toHaveLength(4);
  });
});

describe('Furnace Heart: "Can your deck run hot?"', () => {
  function furnace(seed: string): { g: Game; f: EnemyState } {
    const g = fight('enc_a2_furnace', seed);
    const f = enemyOf(g, 'furnace_heart');
    delete f.statuses.seething; // isolate Heat: these passes never hurt it (Seething has its own test)
    return { g, f };
  }
  /** Keep Slag Tide (blocked on pending status cards) off the schedule while testing Heat. */
  const swing = (g: Game, f: EnemyState): void => { f.intent = computeIntent(g.state, f, 'crucible_swing'); };

  it('Heat +2 at the end of each of its turns (+3 in phase 2), capped at 15; Meltdown = 3 × Heat, then 0', () => {
    const { g, f } = furnace('heat');
    const heats: number[] = [];
    for (let i = 0; i < 3; i++) {
      swing(g, f);
      pass(g);
      heats.push(f.statuses.heat ?? 0);
    }
    expect(heats).toEqual([2, 4, 6]);
    f.intent = computeIntent(g.state, f, 'bellows_blast');
    pass(g);
    expect(f.statuses.heat).toBe(10); // +2 Bellows, +2 turn end
    combatOf(g).player.statuses = {};
    f.intent = computeIntent(g.state, f, 'meltdown');
    expect(f.intent.damage).toBe(30);
    const ev = pass(g);
    expect(eventsOf(ev, 'damage').find((d) => d.source === f.uid)?.amount).toBe(30);
    expect(f.statuses.heat).toBe(2); // 0 after Meltdown, then its turn-end +2
    f.hp = Math.floor(f.maxHp / 2);
    hit(g, f.uid, 1);
    for (let i = 0; i < 5; i++) {
      swing(g, f);
      pass(g);
    }
    expect(f.statuses.heat).toBe(15);
    expect(computeIntent(g.state, f, 'meltdown').damage).toBeGreaterThanOrEqual(45);
  });

  it('Scrapping a Status card vents 1 Heat (once per card)', () => {
    const { g, f } = furnace('vent');
    swing(g, f);
    pass(g);
    swing(g, f);
    pass(g);
    expect(f.statuses.heat).toBe(4);
    const c = combatOf(g);
    const burn = makeCard(g.state, 'test_burn'); // a test-pack card of type 'status'
    const strike = makeCard(g.state, 'test_strike');
    c.hand = [burn, strike];
    padDraw(g); // RULINGS 72 Scrap floor
    const env = makeEnv(g.state);
    exhaustCards(env, 'hand', [burn.uid, strike.uid]);
    drain(env);
    expect(f.statuses.heat).toBe(3);
    expect(combatOf(g).player.statuses.furnace_vent).toBe(1);
    // Playing Jitter (it Scraps itself) vents once, not twice.
    const [jitter] = setHand(g, ['status_jitter']);
    combatOf(g).energy = 3;
    g.apply({ type: 'play_card', uid: jitter as number });
    expect(f.statuses.heat).toBe(2);
    expect(combatOf(g).exhaust.some((x) => x.uid === jitter)).toBe(true);
  });

  it('phase 2 numbers: Slag Tide 3 Backlash + 1 Jitter, Crucible Swing 11 x 2', () => {
    const { g, f } = furnace('white-hot');
    f.hp = Math.floor(f.maxHp / 2) + 1;
    hit(g, f.uid, 1);
    combatOf(g).player.statuses = {};
    expect(computeIntent(g.state, f, 'crucible_swing').damage).toBe(11);
    f.intent = computeIntent(g.state, f, 'slag_tide');
    const ev = pass(g);
    const added = eventsOf(ev, 'card_added').map((a) => [a.card.id, a.where]);
    expect(added.filter(([id]) => id === 'status_backlash')).toEqual([0, 1, 2].map(() => ['status_backlash', 'draw']));
    expect(added.filter(([id]) => id === 'status_jitter')).toEqual([['status_jitter', 'hand']]);
  });
});

describe('Trihammer: "Disarm or decapitate?"', () => {
  it('Overtime arms the Arms, one Arm braces the body each round, Trip-Hammer hits 1 + living Arms; Arms die with the body', () => {
    const g = fight('enc_a2_trihammer', 'tri-live');
    const body = enemyOf(g, 'trihammer');
    const arms = alive(g, 'trihammer_arm');
    expect(arms.map((a) => [a.leaderUid, a.withLeader])).toEqual(arms.map(() => [body.uid, 'die']));
    expect(body.intent.moveId).toBe('overtime');
    pass(g);
    for (const a of arms) expect(a.statuses.might).toBe(1);
    expect(body.block).toBe(10 + 8); // Overtime, then slot 2's Brace Frame after the body's own turn
    expect(body.intent.moveId).toBe('trip_hammer');
    expect(body.intent.hits).toBe(4);
    const arm0 = arms[0] as EnemyState;
    arm0.hp = 1;
    arm0.block = 0;
    hit(g, arm0.uid, 5);
    expect(body.intent.hits).toBe(3);
    body.hp = 1;
    body.block = 0;
    const kill = hit(g, body.uid, 50);
    expect(eventsOf(kill, 'enemy_died')).toHaveLength(3);
    expect(eventsOf(kill, 'combat_won')).toHaveLength(1);
  });
});

describe('Tether Sovereign: "Can you finish what you start?"', () => {
  it('defers HP loss beyond 60 per turn and loses it at the end of its next turn, after its move and Rot', () => {
    const g = fight('enc_a3_sovereign', 'overflow');
    const s = enemyOf(g, 'tether_sovereign');
    const start = s.hp;
    hit(g, s.uid, 100);
    expect(start - s.hp).toBe(60);
    expect(s.statuses.overflow_stored).toBe(40);
    hit(g, s.uid, 30);
    expect(start - s.hp).toBe(60);
    expect(s.statuses.overflow_stored).toBe(70);
    s.statuses.rot = 3;
    const ev = pass(g);
    const order = ev.filter((e) => e.t === 'enemy_move' || (e.t === 'damage' && e.target === s.uid)).map((e) => (e.t === 'enemy_move' ? 'move' : e.t === 'damage' ? `${e.kind}:${e.hpLost}` : ''));
    expect(order).toEqual(['move', 'hp_loss:3', 'hp_loss:70']);
    expect(start - s.hp).toBe(60 + 3 + 70); // nothing was deleted
    expect(s.statuses.overflow_stored).toBeUndefined();
    // A fresh turn has a fresh line (Decree's Stagger on you would blunt the test hits).
    s.block = 0;
    combatOf(g).player.statuses = {};
    const before = s.hp;
    hit(g, s.uid, 60);
    expect(before - s.hp).toBe(60);
    hit(g, s.uid, 1);
    expect(before - s.hp).toBe(60);
  });

  it('phase 3 lowers the line to 40; Block still absorbs before the line', () => {
    const g = fight('enc_a3_sovereign', 'overflow-p3');
    const s = enemyOf(g, 'tether_sovereign');
    s.hp = Math.floor(s.maxHp / 5);
    hit(g, s.uid, 1);
    expect(s.aiState.p3).toBe(1);
    s.block = 10;
    const before = s.hp;
    hit(g, s.uid, 70); // 10 blocked; 40 lost (1 already counted this turn => 39); the rest stored
    expect(before - s.hp).toBe(39);
    expect(s.statuses.overflow_stored).toBe(70 - 10 - 39);
  });

  it('Crownlight rage shows per hit in the intents', () => {
    const g = fight('enc_a3_sovereign', 'rage');
    const s = enemyOf(g, 'tether_sovereign');
    s.intent = computeIntent(g.state, s, 'crownlight');
    pass(g);
    combatOf(g).player.statuses = {};
    expect(computeIntent(g.state, s, 'tether_lash').damage).toBe(9);
    expect(computeIntent(g.state, s, 'anchor_drop').damage).toBe(28);
    // Phase D: Rage is a visible status, capped at 12.
    expect(s.statuses.crown_rage).toBe(3);
    expect(renderStatusText('crown_rage', 3, s.uid, g.state)).toBe('Each hit of its attacks deals 3 more damage. Crownlight adds 3 (phase 1); in phase 3 each Anchor Drop adds 2. At most 12.');
    for (let i = 0; i < 5; i++) run(g, { type: 'status', target: 'self', id: 'crown_rage', amount: 3 }, s.uid, 'player');
    expect(s.statuses.crown_rage).toBe(12);
  });
});

describe('Star Archivist: "Can your deck afford to loop?"', () => {
  it('each reshuffle (not the combat-start one) writes a Page, max 6 (8 in phase 2); Barrage hits 2 + Pages', () => {
    const g = fight('enc_a3_archivist', 'pages');
    const a = enemyOf(g, 'star_archivist');
    expect(a.statuses.archive_page).toBeUndefined();
    expect(computeIntent(g.state, a, 'index_barrage').hits).toBe(2);
    const env = makeEnv(g.state);
    for (let i = 0; i < 7; i++) shuffleDiscardIntoDraw(env);
    drain(env);
    expect(a.statuses.archive_page).toBe(6);
    expect(computeIntent(g.state, a, 'index_barrage').hits).toBe(8);
    a.hp = Math.floor(a.maxHp / 2) + 1;
    hit(g, a.uid, 1);
    const env2 = makeEnv(g.state);
    for (let i = 0; i < 4; i++) shuffleDiscardIntoDraw(env2);
    drain(env2);
    expect(a.statuses.archive_page).toBe(8);
    expect(computeIntent(g.state, a, 'index_barrage').hits).toBe(10);
  });

  it('every Redact writes a Page too (the archive grows even if you never reshuffle), within the cap', () => {
    const g = fight('enc_a3_archivist', 'redact');
    const a = enemyOf(g, 'star_archivist');
    expect(a.intent.moveId).toBe('redact');
    expect(renderMoveText(g.state, a.uid, 'redact')).toBe('Apply 2 Exposed to you. Gain 20 Block. Write 1 Page.');
    pass(g);
    expect(a.statuses.archive_page).toBe(1);
    combatOf(g).player.statuses = {};
    expect(computeIntent(g.state, a, 'index_barrage').hits).toBe(3);
    a.statuses.archive_page = 6;
    run(g, { type: 'custom', fn: 'write_page' }, a.uid, 'player');
    expect(a.statuses.archive_page).toBe(6);
  });

  it('a real reshuffle during play writes a Page', () => {
    const g = fight('enc_a3_archivist', 'pages-live');
    const a = enemyOf(g, 'star_archivist');
    // Keep the hand so it is discarded: a 10-card deck drawing 5 reshuffles on turn 3.
    for (let i = 0; i < 3; i++) g.apply({ type: 'end_turn' });
    expect(a.statuses.archive_page ?? 0).toBeGreaterThanOrEqual(1);
  });
});

describe('Leukarch: "Can your scaling outpace the response?"', () => {
  it('Muster fills to 2 (3 in phase 2); Calcify Guard grows by 5; Consume kills the Antibodies for Fever; Storm hits 3 + phase', () => {
    const g = fight('enc_a3_leukarch', 'response');
    const l = enemyOf(g, 'leukarch');
    delete l.statuses.seething; // isolate the phase machine: these passes never hurt it (Seething has its own test)
    expect(l.intent.moveId).toBe('muster');
    pass(g);
    expect(alive(g, 'antibody')).toHaveLength(2);
    for (const ab of alive(g, 'antibody')) expect([ab.leaderUid, ab.withLeader]).toEqual([l.uid, 'die']);
    combatOf(g).player.statuses = {};
    expect(computeIntent(g.state, l, 'cilia_storm').hits).toBe(4);
    l.hp = 321;
    l.block = 0;
    hit(g, l.uid, 1);
    expect(computeIntent(g.state, l, 'cilia_storm').hits).toBe(5);
    l.intent = computeIntent(g.state, l, 'muster');
    pass(g);
    expect(alive(g, 'antibody')).toHaveLength(3);
    const guards: number[] = [];
    for (let i = 0; i < 2; i++) {
      l.intent = computeIntent(g.state, l, 'calcify');
      const ev = pass(g);
      guards.push(eventsOf(ev, 'block').find((b) => b.target === l.uid && b.pool === 'guard')?.amount ?? -1);
    }
    expect(guards).toEqual([20, 25]);
    const n = alive(g, 'antibody').length;
    l.hp = 161;
    l.block = 0;
    l.guard = 0;
    hit(g, l.uid, 1);
    expect(computeIntent(g.state, l, 'cilia_storm').hits).toBe(6);
    expect(l.forecast[0]?.moveId).toBe('consume');
    const ev = run(g, { type: 'custom', fn: 'consume' }, l.uid, 'player');
    expect(eventsOf(ev, 'enemy_died')).toHaveLength(n);
    expect(l.statuses.white_fever).toBe(2 * n);
    combatOf(g).player.statuses = {};
    expect(computeIntent(g.state, l, 'engulf').damage).toBe(24 + 2 * n);
  });

  it('Opsonize strips up to 4 debuff stacks from the Leukarch, largest first; Antibodies die with it', () => {
    const g = fight('enc_a3_leukarch', 'opsonize');
    const l = enemyOf(g, 'leukarch');
    pass(g);
    const ab = alive(g, 'antibody')[0] as EnemyState;
    l.statuses = { stagger: 1, rot: 3, exposed: 2, might: 5 };
    run(g, { type: 'custom', fn: 'opsonize' }, ab.uid, 'player');
    expect(l.statuses).toEqual({ stagger: 1, exposed: 1, might: 5 });
    l.hp = 1;
    l.block = 0;
    l.guard = 0;
    const kill = hit(g, l.uid, 10);
    expect(eventsOf(kill, 'enemy_died')).toHaveLength(3);
  });
});

describe('v2 encounter pass: the Frame timer and Seething', () => {
  it('a Frame left alone builds itself: +1 Progress each of its turns, a Welded Horror at 3 (a visible timer)', () => {
    const g = fight('enc_a2_assembler', 'frame-timer');
    const a = enemyOf(g, 'grand_assembler');
    pass(g); // lay_frame
    const frames = alive(g, 'assembly_frame');
    expect(frames).toHaveLength(2);
    const f = frames[0] as EnemyState;
    expect(f.intent).toMatchObject({ kind: 'buff', moveId: 'idle' });
    expect(renderMoveText(g.state, f.uid, 'idle')).toBe('It assembles itself: +1 Progress.');
    expect(renderStatusText('assembly_line', 1)).toBe('It gains 1 Progress on each of its turns, and Weld adds more. At 3 Progress it becomes a Welded Horror at full HP, at the end of that move.');
    // Keep the Assembler from Welding, so only the Frames' own turns count.
    a.statuses.halted = 1;
    pass(g);
    expect(f.statuses.progress).toBe(1);
    a.statuses.halted = 1;
    pass(g);
    expect(f.statuses.progress).toBe(2);
    a.statuses.halted = 1;
    const ev = pass(g);
    expect(eventsOf(ev, 'enemy_transformed').map((x) => [x.uid, x.to])).toEqual(frames.map((x) => [x.uid, 'welded_horror']));
    expect(f.id).toBe('welded_horror');
    expect(f.intent.moveId).toBe('weld_claw');
  });

  it('Seething: a calm enemy turn (less damage taken than its stacks) gains Might; a hit one does not, even into Block; Rot counts', () => {
    const g = fight('enc_a3_leukarch', 'seethe');
    const l = enemyOf(g, 'leukarch');
    expect(l.statuses.seething).toBe(12);
    expect(renderStatusText('seething', 12, l.uid, g.state)).toBe('At the end of its turn, if it took less than 12 damage since its last turn, it gains 1 Might. Hits soaked by its Block or Guard still count.');
    pass(g); // nothing hits it
    expect(l.statuses.might).toBe(1);
    combatOf(g).player.statuses = {};
    expect(computeIntent(g.state, l, 'engulf').damage).toBe(24 + 1); // Might shows live in its intents
    l.block = 0;
    l.guard = 0;
    hit(g, l.uid, 11); // one short of the line
    pass(g);
    expect(l.statuses.might).toBe(2);
    l.block = 0;
    l.guard = 0;
    hit(g, l.uid, 12);
    pass(g);
    expect(l.statuses.might).toBe(2);
    // Rot is HP loss too: it counts toward the next window.
    l.block = 0;
    l.guard = 0;
    hit(g, l.uid, 7);
    l.statuses.rot = 5;
    pass(g); // 7 this window, then its Rot tick (after Seething's own check) seeds the next window with 5
    expect(l.statuses.might).toBe(3);
    l.block = 0;
    l.guard = 0;
    hit(g, l.uid, 7);
    l.statuses.rot = 0;
    pass(g); // 5 (last Rot tick) + 7
    expect(l.statuses.might).toBe(3);
    // Phase D: hits soaked by its Block still count, so its own Block turns never feed it.
    l.block = 50;
    hit(g, l.uid, 12);
    pass(g);
    expect(l.statuses.might).toBe(3);
  });

  it('Seething sits on the anti-stall elites and Leukarch, with its threshold as stacks', () => {
    expect(getEnemyDef('leukarch').spawnStatuses).toMatchObject({ seething: 12 });
    expect(getEnemyDef('the_auditor').spawnStatuses).toMatchObject({ seething: 15 });
    expect(getEnemyDef('boiler_tyrant').spawnStatuses).toMatchObject({ seething: 12 });
    expect(getEnemyDef('mirror_knight').spawnStatuses).toMatchObject({ seething: 22 });
    expect(getEnemyDef('phage_mother').spawnStatuses).toMatchObject({ seething: 10 });
    // Summoner bosses never seethe: mowing their minions is a legitimate answer (v2 sim: Seething there doubled deaths).
    for (const id of ['mother_orchid', 'grand_assembler', 'trihammer', 'furnace_heart', 'star_archivist']) expect(getEnemyDef(id).spawnStatuses?.seething, id).toBeUndefined();
    expect(getStatusDef('seething').stacks).toBe('amount');
  });
});

describe('Phase D fairness passes', () => {
  it('Mother Orchid: a finite Seed Bank (10) pays for Sow and Full Bloom; empty, she stops sowing; Nectar wilts by 3 a Feast', () => {
    const g = fight('enc_a1_orchid', 'seedbank');
    const o = enemyOf(g, 'mother_orchid');
    expect(o.statuses.seed_bank).toBe(10);
    expect(renderStatusText('seed_bank', 10, o.uid, g.state)).toBe('10 Buds left to sow. Each Bud she summons spends one; once the bank is empty she sows no more. Each Nectar Feast heals 3 less.');
    pass(g); // Sow
    expect(alive(g, 'orchid_bud')).toHaveLength(2);
    expect(o.statuses.seed_bank).toBe(8);
    // Nectar heals 10, 7, 4, 1, 0: the text shows the live number.
    const heals: number[] = [];
    for (let i = 0; i < 5; i++) {
      o.hp = o.maxHp - 20;
      o.intent = computeIntent(g.state, o, 'nectar');
      heals.push(eventsOf(pass(g), 'heal').find((h) => h.target === o.uid)?.amount ?? 0);
    }
    expect(heals).toEqual([10, 7, 4, 1, 0]); // a 0-heal Feast emits no heal event (counted as 0)
    expect(renderMoveText(g.state, o.uid, 'nectar')).toBe('Heal 0 HP (3 less each Feast). Every Bud is 1 turn closer to ripe.');
    // Kill the Buds and drain the bank: Sow only spends what is left, then the AI never picks it again.
    o.statuses.seed_bank = 1;
    for (const b of alive(g, 'orchid_bud')) { b.hp = 1; b.block = 0; hit(g, b.uid, 5); }
    run(g, { type: 'custom', fn: 'sow' }, o.uid, 'player');
    expect(alive(g, 'orchid_bud')).toHaveLength(1);
    expect(o.statuses.seed_bank ?? 0).toBe(0);
    const s = simulate(g, o, 60);
    expect(s).not.toContain('sow');
    expect(s).not.toContain('full_bloom');
  });

  it('Leukarch: Fever is a visible status capped at 9, so its peak storm is telegraphed and bounded', () => {
    const g = fight('enc_a3_leukarch', 'fever-cap');
    const l = enemyOf(g, 'leukarch');
    delete l.statuses.seething; // isolate Fever (Seething is the separate stall breaker)
    for (let i = 0; i < 5; i++) run(g, { type: 'status', target: 'self', id: 'white_fever', amount: 3 }, l.uid, 'player');
    expect(l.statuses.white_fever).toBe(9);
    expect(renderStatusText('white_fever', 9, l.uid, g.state)).toBe('Each hit of its attacks deals 9 more damage. It rises 2 per Antibody consumed and 3 per pitch. At most 9.');
    combatOf(g).player.statuses = {};
    expect(computeIntent(g.state, l, 'engulf').damage).toBe(33);
    expect(renderMoveText(g.state, l.uid, 'fever_pitch')).toBe('Fever +3 (at most 9). Gain 20 Block.');
  });
});
