import '../testpack';
// Act 3 non-boss enemies (ENEMIES §3.1, §3.2, §3.4): roster numbers, every move, AI patterns, forecasts,
// minions, and each elite's question mechanic.
import { describe, expect, it } from 'vitest';
import { getCardDef, getEncounterDef, getEnemyDef, getStatusDef } from '../../src/content';
import { ACT3_ENCOUNTERS, ACT3_ENEMIES, ACT3_STATUSES } from '../../src/content/enemies/act3';
import { aiCtx, computeIntent, renderMoveText, renderStatusText, validateEffects, type Effect, type EnemyState, type GameEvent, type RngState } from '../../src/engine';
import { refreshIntents } from '../../src/engine/combat';
import { enqueue, makeEnv } from '../../src/engine/core';
import { drain } from '../../src/engine/queue';
import { Game } from '../../src/engine/game';
import { combatOf, eventsOf, play, sandbox, setHand } from '../engine/helpers';

// --- helpers ---------------------------------------------------------------------------------------------

/** Status cards other content packs still owe (GDD §7.2 / RULINGS 13). Anything else missing is a typo. */
const PENDING_CARDS = new Set(['status_vacuum_chill']);

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
const missingCards = (effects: readonly Effect[]): string[] => addedCards(effects).filter((id) => !registered(id));
/** Missing cards a move adds every time it resolves (conditional additions are reached only by their condition). */
const blockingCards = (effects: readonly Effect[]): string[] =>
  effects.flatMap((e) => (e.type === 'add_card' && !registered(e.card) ? [e.card] : []));

function fight(encounter: string, seed: string): Game {
  const g = sandbox({ encounter, seed, deck: Array.from({ length: 10 }, () => 'test_block') });
  g.state.player.hp = g.state.player.maxHp = 1_000_000;
  // Non-atomic so enemy references held by a test stay live across actions.
  return new Game(g.state, { atomic: false });
}

/** End the player turn with an empty hand (the enemy phase runs, then the next player turn starts). */
function pass(g: Game): GameEvent[] {
  setHand(g, []);
  return g.apply({ type: 'end_turn' });
}

/** A card-less player hit (pipeline steps 1-7) during the player's turn, then the post-action intent refresh. */
function hit(g: Game, uid: number, amount: number): GameEvent[] {
  const env = makeEnv(g.state);
  enqueue(env, [{ kind: 'effect', effect: { type: 'damage', amount, target: 'target' }, frame: { src: { kind: 'system' }, self: 'player', target: uid, x: 0 } }]);
  drain(env);
  refreshIntents(env);
  return env.events;
}

function enemyOf(g: Game, id: string, nth = 0): EnemyState {
  const e = combatOf(g).enemies.filter((x) => x.id === id)[nth];
  if (!e) throw new Error(`no ${id} #${nth} in combat`);
  return e;
}

/** Pure AI run: chooseMove for rounds 1..turns on a clone of the enemy's own rng (no moves resolve). */
function simulate(g: Game, e: EnemyState, turns: number): string[] {
  const def = getEnemyDef(e.id);
  const rng: RngState = [...e.rng];
  const hist: string[] = [];
  for (let t = 1; t <= turns; t++) {
    const m = def.chooseMove(aiCtx(combatOf(g), e, rng, hist, t));
    expect(Object.keys(def.moves)).toContain(m);
    hist.push(m);
  }
  return hist;
}

function noRepeats(seq: readonly string[], moves?: readonly string[]): void {
  for (let i = 1; i < seq.length; i++) {
    if (moves && !moves.includes(seq[i] as string)) continue;
    expect(seq[i], `turn ${i + 1}`).not.toBe(seq[i - 1]);
  }
}

function homeEncounter(id: string): string {
  if (id === 'phage') return 'enc_a3_phage_mother';
  const enc = ACT3_ENCOUNTERS.find((x) => x.enemies.some((s) => (typeof s === 'string' ? s : s.id) === id));
  if (!enc) throw new Error(`${id} is in no Act 3 encounter`);
  return enc.id;
}

const SEEDS = Array.from({ length: 10 }, (_, i) => `a3-ai-${i}`);
const TURNS = 200;

// --- roster -------------------------------------------------------------------------------------------------

const ROSTER_HP: Record<string, [number, number]> = {
  void_mote: [34, 40], shardling: [44, 50], prism_seer: [76, 82], echo_cantor: [110, 118], lymph_warden: [66, 72],
  pyrexia_node: [52, 58], void_geometer: [130, 140], mirror_knight: [190, 200], phage_mother: [190, 200], phage: [18, 21],
  event_horizon: [200, 210],
};
const ROSTER_ENCOUNTERS: Record<string, { pool: string; hp: [number, number]; weight: number }> = {
  enc_a3_mote_pair: { pool: 'easy', hp: [68, 80], weight: 1 },
  enc_a3_shard_mote: { pool: 'easy', hp: [78, 90], weight: 1 },
  enc_a3_seer: { pool: 'easy', hp: [76, 82], weight: 1 },
  enc_a3_cantor: { pool: 'hard', hp: [110, 118], weight: 15 },
  enc_a3_geometer: { pool: 'hard', hp: [130, 140], weight: 15 },
  enc_a3_fever_pack: { pool: 'hard', hp: [130, 148], weight: 14 },
  enc_a3_warden_geometer: { pool: 'hard', hp: [196, 212], weight: 14 },
  enc_a3_warden_cantor: { pool: 'hard', hp: [176, 190], weight: 14 },
  enc_a3_prism_motes: { pool: 'hard', hp: [144, 162], weight: 14 },
  enc_a3_warden_shard: { pool: 'hard', hp: [110, 122], weight: 14 },
  enc_a3_mirror_knight: { pool: 'elite', hp: [190, 200], weight: 1 },
  enc_a3_phage_mother: { pool: 'elite', hp: [190, 200], weight: 1 },
  enc_a3_event_horizon: { pool: 'elite', hp: [200, 210], weight: 1 },
};

describe('Act 3 roster', () => {
  it('ids, counts and HP ranges match ENEMIES §3', () => {
    expect(ACT3_ENEMIES.map((e) => e.id).sort()).toEqual(Object.keys(ROSTER_HP).sort());
    expect(ACT3_ENEMIES).toHaveLength(11); // 7 normal + 3 elites + the Phage minion
    for (const e of ACT3_ENEMIES) {
      expect(e.hp, e.id).toEqual(ROSTER_HP[e.id]);
      expect(e.boss, e.id).toBeUndefined();
    }
    expect(ACT3_STATUSES.map((s) => s.id).sort()).toEqual(['facets', 'horizon_drain', 'horizon_pull', 'phage_age', 'reflection', 'replicating', 'resonance']);
    for (const s of ACT3_STATUSES) expect(renderStatusText(s.id, 1)).not.toMatch(/[{}]/);
  });

  it('encounters: pools, acts, weights (hard sums to 100), HP sums, at most one Shardling', () => {
    expect(ACT3_ENCOUNTERS.map((e) => e.id).sort()).toEqual(Object.keys(ROSTER_ENCOUNTERS).sort());
    let hard = 0;
    for (const enc of ACT3_ENCOUNTERS) {
      const want = ROSTER_ENCOUNTERS[enc.id];
      if (!want) throw new Error(enc.id);
      expect(enc.acts).toEqual([3]);
      expect(enc.pool).toBe(want.pool);
      expect(enc.weight).toBe(want.weight);
      if (enc.pool === 'hard') hard += want.weight;
      const defs = enc.enemies.map((s) => getEnemyDef(typeof s === 'string' ? s : s.id));
      expect([defs.reduce((a, d) => a + d.hp[0], 0), defs.reduce((a, d) => a + d.hp[1], 0)], enc.id).toEqual(want.hp);
      expect(defs.filter((d) => d.id === 'shardling').length).toBeLessThanOrEqual(1);
    }
    expect(hard).toBe(100);
  });

  it('only the known pending status cards are unregistered', () => {
    for (const def of ACT3_ENEMIES) {
      for (const m of Object.values(def.moves)) for (const id of missingCards(m.effects)) expect(PENDING_CARDS).toContain(id);
    }
  });

  it('registered, and every move / passive trigger passes the DSL validator', () => {
    const out: string[] = [];
    for (const def of ACT3_ENEMIES) {
      expect(getEnemyDef(def.id)).toBe(def);
      for (const sid of Object.keys(def.spawnStatuses ?? {})) getStatusDef(sid);
      for (const [id, m] of Object.entries(def.moves)) {
        validateEffects(m.effects, { label: `enemy ${def.id}.${id}`, tables: def, hasTarget: true, combat: true, run: false, enemy: true }, out);
      }
    }
    for (const s of ACT3_STATUSES) {
      expect(getStatusDef(s.id)).toBe(s);
      for (const [hook, effects] of Object.entries(s.triggers ?? {})) {
        validateEffects(effects ?? [], { label: `status ${s.id}.${hook}`, tables: s, hasTarget: false, combat: true, run: false, enemy: true }, out);
      }
    }
    for (const enc of ACT3_ENCOUNTERS) expect(getEncounterDef(enc.id)).toBe(enc);
    // The only allowed problem: RULINGS 13's Vacuum Chill status card is not defined yet.
    expect(out.filter((p) => !(PENDING_CARDS.has('status_vacuum_chill') && /add_card: unknown card id 'status_vacuum_chill'/.test(p)))).toEqual([]);
  });

  it('chooseMove never mentions player state (GDD §2.9)', () => {
    for (const def of ACT3_ENEMIES) expect(def.chooseMove.toString(), def.id).not.toMatch(/\b(state|combat|player)\b/);
  });
});

// --- every move ---------------------------------------------------------------------------------------------

describe('every Act 3 move resolves against a sandbox player', () => {
  for (const def of ACT3_ENEMIES) {
    for (const [moveId, move] of Object.entries(def.moves)) {
      const missing = blockingCards(move.effects);
      it.skipIf(missing.length > 0)(`${def.id}.${moveId}${missing.length ? ` (blocked on ${missing.join(', ')})` : ''}`, () => {
        const g = fight(homeEncounter(def.id), `move-${def.id}-${moveId}`);
        if (def.id === 'phage') pass(g); // the Mother buds on turn 1
        const c = combatOf(g);
        const e = enemyOf(g, def.id);
        for (const o of c.enemies) if (o.uid !== e.uid && o.alive) o.statuses.halted = 1;
        e.intent = computeIntent(g.state, e, moveId);
        expect(renderMoveText(g.state, e.uid, moveId)).not.toMatch(/[{}]/);
        pass(g);
        expect(e.moveHistory[e.moveHistory.length - 1]).toBe(moveId);
        expect(Object.keys(def.moves)).toContain(e.intent.moveId);
      });
    }
  }
});

// --- AI patterns (200 seeded turns, pure chooseMove) --------------------------------------------------------

describe('Act 3 AI patterns over 200 seeded turns', () => {
  it('void_mote: Null Pulse turn 1 and after Fold; never the same move twice', () => {
    for (const seed of SEEDS) {
      const g = fight('enc_a3_mote_pair', seed);
      for (const e of combatOf(g).enemies) {
        const s = simulate(g, e, TURNS);
        expect(s[0]).toBe('null_pulse');
        s.forEach((m, i) => { if (i > 0 && s[i - 1] === 'fold') expect(m).toBe('null_pulse'); });
        noRepeats(s);
        expect(new Set(s)).toEqual(new Set(['null_pulse', 'flicker', 'fold']));
      }
    }
  });

  it('shardling: Lance turn 1, then never the same move twice', () => {
    for (const seed of SEEDS) {
      const g = fight('enc_a3_shard_mote', seed);
      const s = simulate(g, enemyOf(g, 'shardling'), TURNS);
      expect(s[0]).toBe('lance');
      noRepeats(s);
      expect(new Set(s)).toEqual(new Set(['lance', 'splinter_storm', 'refract']));
    }
  });

  it('prism_seer: Glare turn 1, Refraction every 3rd turn, Lance/Burst never repeat', () => {
    for (const seed of SEEDS) {
      const g = fight('enc_a3_seer', seed);
      const s = simulate(g, enemyOf(g, 'prism_seer'), TURNS);
      s.forEach((m, i) => {
        const t = i + 1;
        if (t === 1) expect(m).toBe('glare');
        else if (t % 3 === 0) expect(m).toBe('refraction');
        else {
          expect(['prism_lance', 'spectrum_burst']).toContain(m);
          expect(m).not.toBe(s[i - 1]);
        }
      });
    }
  });

  it('echo_cantor: Chime on odd turns; even turns alternate Toll / Hush', () => {
    for (const seed of SEEDS) {
      const g = fight('enc_a3_cantor', seed);
      const s = simulate(g, enemyOf(g, 'echo_cantor'), TURNS);
      const evens = s.filter((_, i) => (i + 1) % 2 === 0);
      s.forEach((m, i) => { if ((i + 1) % 2 === 1) expect(m).toBe('chime'); });
      evens.forEach((m, i) => {
        expect(['toll', 'hush']).toContain(m);
        if (i > 0) expect(m).not.toBe(evens[i - 1]);
      });
    }
  });

  it('lymph_warden: with allies Membrane turn 1, Cleanse every 3rd turn, no repeats; alone it alternates', () => {
    for (const seed of SEEDS) {
      const g = fight('enc_a3_warden_geometer', seed);
      const w = enemyOf(g, 'lymph_warden');
      const s = simulate(g, w, TURNS);
      s.forEach((m, i) => {
        const t = i + 1;
        if (t === 1) expect(m).toBe('membrane');
        else if (t % 3 === 0) expect(m).toBe('cleanse');
        else expect(['antigen_tag', 'mend', 'membrane']).toContain(m);
      });
      noRepeats(s);
      enemyOf(g, 'void_geometer').alive = false;
      const alone = simulate(g, w, 20);
      alone.forEach((m, i) => expect(m).toBe(i % 2 === 0 ? 'antigen_tag' : 'membrane'));
    }
  });

  it('pyrexia_node: Fever every turn while an ally lives; alone it alternates starting with Fever Spike', () => {
    const g = fight('enc_a3_fever_pack', 'pyrexia');
    const p = enemyOf(g, 'pyrexia_node');
    expect(new Set(simulate(g, p, TURNS))).toEqual(new Set(['fever']));
    for (const e of combatOf(g).enemies) if (e.uid !== p.uid) e.alive = false;
    simulate(g, p, 20).forEach((m, i) => expect(m).toBe(i % 2 === 0 ? 'fever_spike' : 'fever'));
  });

  it('void_geometer: Acute Angle turn 1, Hyperedge after Fold Space, never Hyperedge twice', () => {
    for (const seed of SEEDS) {
      const g = fight('enc_a3_geometer', seed);
      const s = simulate(g, enemyOf(g, 'void_geometer'), TURNS);
      expect(s[0]).toBe('acute_angle');
      s.forEach((m, i) => { if (i > 0 && s[i - 1] === 'fold_space') expect(m).toBe('hyperedge'); });
      noRepeats(s, ['hyperedge']);
    }
  });

  it('mirror_knight: Lunge turn 1, Mirror Slash on even turns, Lunge/Guard on odd turns', () => {
    for (const seed of SEEDS) {
      const g = fight('enc_a3_mirror_knight', seed);
      const s = simulate(g, enemyOf(g, 'mirror_knight'), TURNS);
      s.forEach((m, i) => {
        const t = i + 1;
        if (t === 1) expect(m).toBe('shatter_lunge');
        else if (t % 2 === 0) expect(m).toBe('mirror_slash');
        else expect(['shatter_lunge', 'silvered_guard']).toContain(m);
      });
      expect(s).toContain('silvered_guard');
    }
  });

  it('event_horizon: Tidal Pull turn 1, no repeats, Accrete only from turn 3 and never within 3 moves of the last', () => {
    for (const seed of SEEDS) {
      const g = fight('enc_a3_event_horizon', seed);
      const s = simulate(g, enemyOf(g, 'event_horizon'), TURNS);
      expect(s[0]).toBe('tidal_pull');
      noRepeats(s);
      s.forEach((m, i) => {
        if (m !== 'accrete') return;
        expect(i + 1).toBeGreaterThanOrEqual(3);
        expect(s.slice(Math.max(0, i - 3), i)).not.toContain('accrete');
      });
      expect(s).toContain('accrete');
    }
  });
});

// --- live engine runs: forecasts ---------------------------------------------------------------------------

describe('Act 3 forecasts in live fights (40 passive turns)', () => {
  for (const enc of ACT3_ENCOUNTERS) {
    const blocked = [...new Set(enc.enemies.flatMap((s) => Object.values(getEnemyDef(typeof s === 'string' ? s : s.id).moves).flatMap((m) => missingCards(m.effects))))];
    // Echo Cantor's Vacuum Chill only lands when Resonance > 0, which a passive player never builds.
    const hardBlocked = blocked.filter((id) => id !== 'status_vacuum_chill');
    it.skipIf(hardBlocked.length > 0)(`${enc.id}: every forecast is known, and it is the move the enemy then chooses`, () => {
      const g = fight(enc.id, `forecast-${enc.id}`);
      let predicted = new Map<number, string>();
      let reroller: number | null = null;
      for (let t = 0; t < 40; t++) {
        const c = combatOf(g);
        for (const e of c.enemies.filter((x) => x.alive)) {
          const p = predicted.get(e.uid);
          if (p !== undefined && (reroller === null || reroller === e.uid)) expect(e.intent.moveId, `${e.id} round ${c.turn}`).toBe(p);
          expect(e.forecast).toHaveLength(1);
          for (const f of e.forecast) {
            expect(f.kind).not.toBe('unknown');
            expect(f.hidden).toBeUndefined();
          }
        }
        const seer = c.enemies.find((e) => e.alive && e.intent.moveId === 'refraction');
        reroller = seer ? seer.uid : null;
        predicted = new Map(c.enemies.filter((e) => e.alive).map((e) => [e.uid, e.forecast[0]?.moveId ?? '']));
        pass(g);
      }
    });
  }
});

// --- mechanics ---------------------------------------------------------------------------------------------

describe('Act 3 mechanics', () => {
  it('void_mote / void_geometer: Fold escalates the next big hit in the intent', () => {
    const g = fight('enc_a3_geometer', 'fold');
    const geo = enemyOf(g, 'void_geometer');
    geo.intent = computeIntent(g.state, geo, 'fold_space');
    pass(g);
    expect(geo.aiState.folded).toBe(6);
    expect(geo.intent.moveId).toBe('hyperedge');
    expect(geo.intent.damage).toBe(33);
    pass(g);
    expect(geo.aiState.folded).toBe(0);
  });

  it('prism_seer: Refraction re-draws other enemies’ forecasts but never their current intents', () => {
    const g = fight('enc_a3_prism_motes', 'refraction');
    const c = combatOf(g);
    const seer = enemyOf(g, 'prism_seer');
    seer.intent = computeIntent(g.state, seer, 'refraction');
    const motes = c.enemies.filter((e) => e.id === 'void_mote');
    const rngBefore = motes.map((m) => [...m.rng]);
    const intents = motes.map((m) => m.intent.moveId);
    const env = makeEnv(g.state);
    enqueue(env, [{ kind: 'effect', effect: { type: 'reroll_forecast', target: 'other_enemies' }, frame: { src: { kind: 'enemy', uid: seer.uid, id: seer.id, moveId: 'refraction' }, self: seer.uid, target: 'player', x: 0 } }]);
    drain(env);
    motes.forEach((m, i) => {
      expect(m.rng).not.toEqual(rngBefore[i]);
      expect(m.intent.moveId).toBe(intents[i]);
    });
  });

  it('echo_cantor: cards after the 5th add Chime hits live (max 5 extra); Hush/Toll turns are free', () => {
    const g = fight('enc_a3_cantor', 'resonance');
    const cantor = enemyOf(g, 'echo_cantor');
    expect(cantor.intent.moveId).toBe('chime');
    expect(cantor.intent.hits).toBe(1);
    const c = combatOf(g);
    const uids = setHand(g, Array.from({ length: 12 }, () => 'test_beat'));
    c.energy = 99;
    const hits: number[] = [];
    for (const uid of uids) {
      play(g, uid, cantor.uid);
      hits.push(cantor.intent.hits ?? 0);
    }
    expect(hits).toEqual([1, 1, 1, 1, 1, 2, 3, 4, 5, 6, 6, 6]);
    expect(cantor.intent.damage).toBe(6);
    expect(renderMoveText(g.state, cantor.uid, 'chime')).toContain('6 damage 6 times');
  });

  it.skipIf(!registered('status_drift'))('echo_cantor: a resonant Chime adds 1 Drift to the draw pile and resets (RULINGS 13)', () => {
    const g = fight('enc_a3_cantor', 'chill');
    const cantor = enemyOf(g, 'echo_cantor');
    const c = combatOf(g);
    const uids = setHand(g, Array.from({ length: 7 }, () => 'test_beat'));
    c.energy = 99;
    for (const uid of uids) play(g, uid, cantor.uid);
    expect(cantor.intent.hits).toBe(3);
    const ev = pass(g);
    expect(eventsOf(ev, 'damage').filter((d) => d.source === cantor.uid)).toHaveLength(3);
    expect(eventsOf(ev, 'card_added').filter((a) => a.card.id === 'status_drift')).toHaveLength(1);
    expect(cantor.aiState.resonance).toBe(0);
  });

  it('lymph_warden: Cleanse halves each debuff on the others (round down) then heals; Mend heals the lowest', () => {
    const g = fight('enc_a3_warden_geometer', 'cleanse');
    const w = enemyOf(g, 'lymph_warden');
    const geo = enemyOf(g, 'void_geometer');
    geo.statuses = { rot: 7, exposed: 3, stagger: 1 };
    geo.hp = geo.maxHp - 30;
    geo.statuses.halted = 1;
    w.intent = computeIntent(g.state, w, 'cleanse');
    const ev = pass(g);
    const deltas = eventsOf(ev, 'status').filter((s) => s.target === geo.uid && s.delta < 0 && s.status !== 'halted');
    expect(deltas.slice(0, 2).map((s) => [s.status, s.delta])).toEqual([['rot', -3], ['exposed', -1]]);
    expect(eventsOf(ev, 'heal').find((h) => h.target === geo.uid)?.amount).toBe(10);

    const hpBefore = geo.hp;
    geo.statuses.halted = 1;
    w.intent = computeIntent(g.state, w, 'mend');
    const ev2 = pass(g);
    expect(eventsOf(ev2, 'heal').find((h) => h.target === geo.uid)?.amount).toBe(18);
    expect(geo.hp).toBeGreaterThan(hpBefore);
  });

  it('pyrexia_node: Fever gives every enemy (itself too) 1 Might, shown per hit in their intents', () => {
    const g = fight('enc_a3_fever_pack', 'fever');
    const shard = enemyOf(g, 'shardling');
    const storm = computeIntent(g.state, shard, 'splinter_storm');
    pass(g);
    for (const e of combatOf(g).enemies) expect(e.statuses.might, e.id).toBe(1);
    combatOf(g).player.statuses = {}; // drop Lance's Exposed so only Might shows
    expect(computeIntent(g.state, shard, 'splinter_storm').damage).toBe((storm.damage ?? 0) + 1);
  });

  it('mirror_knight: Mirror Slash = the best single card this turn, clamped to 12..40', () => {
    const g = fight('enc_a3_mirror_knight', 'mirror');
    const k = enemyOf(g, 'mirror_knight');
    k.intent = computeIntent(g.state, k, 'mirror_slash');
    expect(k.intent.damage).toBe(12);
    const c = combatOf(g);
    c.energy = 99;
    c.player.statuses.test_strength = 24; // test Strike: 6 + 24 = 30
    const [s1] = setHand(g, ['test_strike']);
    play(g, s1 as number, k.uid);
    expect(k.intent.damage).toBe(30);
    c.player.statuses.test_strength = 94;
    const [s2] = setHand(g, ['test_strike']);
    play(g, s2 as number, k.uid);
    expect(k.intent.damage).toBe(40);
    hit(g, k.uid, 100); // not a card: does not count
    expect(k.intent.damage).toBe(40);
  });

  it('phage_mother: Buds 2 Phages turn 1; Latch grows 5, 8, 11 with Age; Incubate ages; Phages die with her', () => {
    const g = fight('enc_a3_phage_mother', 'phage');
    const mother = enemyOf(g, 'phage_mother');
    expect(mother.intent.moveId).toBe('bud_phages');
    pass(g);
    const phages = combatOf(g).enemies.filter((e) => e.id === 'phage');
    expect(phages).toHaveLength(2);
    for (const p of phages) expect([p.leaderUid, p.withLeader]).toEqual([mother.uid, 'die']);
    const latch: number[] = [];
    for (let i = 0; i < 3; i++) {
      combatOf(g).player.statuses = {}; // Enzyme Wash's Exposed would add to the preview
      refreshIntents(makeEnv(g.state));
      latch.push(phages[0]?.intent.damage ?? -1);
      pass(g);
    }
    expect(latch).toEqual([5, 8, 11]);
    const age = phages[0]?.statuses.phage_age ?? 0;
    mother.intent = computeIntent(g.state, mother, 'incubate');
    pass(g);
    expect(phages[0]?.statuses.phage_age).toBe(age + 2); // Incubate + its own end-of-turn replication
    mother.hp = 1;
    mother.block = 0;
    const phageUids = combatOf(g).enemies.filter((e) => e.alive && e.id === 'phage').map((p) => p.uid);
    const ev = hit(g, mother.uid, 5);
    expect(eventsOf(ev, 'enemy_died').map((d) => d.uid).sort((a, b) => a - b)).toEqual([mother.uid, ...phageUids].sort((a, b) => a - b));
    expect(eventsOf(ev, 'combat_won')).toHaveLength(1);
    expect(eventsOf(ev, 'enemy_fled')).toHaveLength(0);
  });

  it('phage_mother AI: Bud → Lyse → Enzyme Wash → (≤2 Phages ? Bud : Incubate), Incubate → Lyse', () => {
    const g = fight('enc_a3_phage_mother', 'phage-ai');
    const mother = enemyOf(g, 'phage_mother');
    for (let t = 0; t < 30; t++) {
      const last = mother.moveHistory[mother.moveHistory.length - 1];
      const phages = combatOf(g).enemies.filter((e) => e.alive && e.id === 'phage').length;
      const want = last === undefined ? 'bud_phages'
        : last === 'bud_phages' || last === 'incubate' ? 'lyse'
          : last === 'lyse' ? 'enzyme_wash' : phages <= 2 ? 'bud_phages' : 'incubate';
      expect(mother.intent.moveId, `round ${combatOf(g).turn}`).toBe(want);
      pass(g);
    }
    expect(combatOf(g).enemies.filter((e) => e.alive && e.id === 'phage').length).toBe(4); // cap 4
  });

  it('event_horizon: pulls your Block + Guard above 15 (Guard first) into its own Block', () => {
    const g = fight('enc_a3_event_horizon', 'horizon');
    const h = enemyOf(g, 'event_horizon');
    const c = combatOf(g);
    h.intent = computeIntent(g.state, h, 'accrete'); // a non-attack, so the player's defence is easy to read
    setHand(g, []);
    c.player.block = 20;
    c.player.guard = 10;
    const ev = g.apply({ type: 'end_turn' });
    const gained = eventsOf(ev, 'block').find((b) => b.target === h.uid);
    expect(gained?.amount).toBe(15);
    expect(eventsOf(ev, 'guard_decay').find((d) => d.target === 'player')?.lost).toBe(10);
    expect(eventsOf(ev, 'block_lost').find((d) => d.target === 'player')?.amount).toBe(5);
    expect(h.block).toBe(15);
    expect(h.aiState.mass).toBe(2);
    expect(computeIntent(g.state, h, 'tidal_pull').damage).toBe(7);
  });
});

describe('v2 encounter pass: Shardling Facets (armour that Shards off)', () => {
  it('each Facet blunts every hit by 1; a hit that still deals 10+ shatters one and pays 1 Shard', () => {
    const g = fight('enc_a3_shard_mote', 'facets');
    const sh = enemyOf(g, 'shardling');
    expect(sh.statuses.facets).toBe(2);
    expect(renderStatusText('facets', 2)).toBe('Each hit on it deals 2 less damage. A hit of yours that still deals 10 or more shatters a Facet, and you gain 1 Shard.');
    sh.block = 0;
    const shards = g.state.player.counters.shards ?? 0;
    let hp = sh.hp;
    hit(g, sh.uid, 6); // 6 - 2 = 4: no shatter
    expect(hp - sh.hp).toBe(4);
    expect(sh.statuses.facets).toBe(2);
    hp = sh.hp;
    hit(g, sh.uid, 12); // 12 - 2 = 10: shatters
    expect(hp - sh.hp).toBe(10);
    expect(sh.statuses.facets).toBe(1);
    expect(g.state.player.counters.shards).toBe(shards + 1);
    hp = sh.hp;
    hit(g, sh.uid, 11); // 11 - 1 = 10: the last Facet goes
    expect(hp - sh.hp).toBe(10);
    expect(sh.statuses.facets ?? 0).toBe(0);
    expect(g.state.player.counters.shards).toBe(shards + 2);
    hp = sh.hp;
    hit(g, sh.uid, 12); // bare crystal: full damage, nothing left to shatter
    expect(hp - sh.hp).toBe(12);
    expect(g.state.player.counters.shards).toBe(shards + 2);
  });
});
