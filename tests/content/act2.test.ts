// Use only index.ts's real content; importing tests/engine/helpers would register the test pack.
import { describe, expect, it } from 'vitest';
import { getEncounterDef, getEnemyDef, getStatusDef } from '../../src/content';
import { ACT2_ENCOUNTERS, ACT2_ENEMIES, ACT2_STATUSES } from '../../src/content/enemies/act2';
import { enqueue, makeEnv, type Env } from '../../src/engine/core';
import { effectItems } from '../../src/engine/ctx';
import { aiCtx, chooseNextMove, computeForecast, computeIntent, refreshIntents, runOnSpawn, spawnEnemy } from '../../src/engine/enemies';
import { dealDamage, loseHp } from '../../src/engine/damage';
import { drain } from '../../src/engine/queue';
import { newFloorRecord } from '../../src/engine/history';
import { createStreams } from '../../src/engine/rng';
import { applyStatus, tickEntity, tickPhase } from '../../src/engine/statuses';
import { renderMoveText, renderStatusText } from '../../src/engine/text';
import { validateEffects } from '../../src/engine/validate';
import type { EnemyState, RunState, TimelineEntry } from '../../src/engine/types';

const ENEMY_IDS = ['furnace_drone', 'rivet_gnasher', 'cog_acolyte', 'riveter', 'slag_golem', 'loom_oracle', 'the_auditor', 'anvil_warden', 'hammer_warden', 'boiler_tyrant'];
const STATUS_IDS = ['scour_rite', 'sealed_pattern', 'inventory', 'bonded', 'overpressure'];
// Exact roster order, pools, HP sums, weights and action order (independent of implementation).
const ENCOUNTERS = [
  ['enc_a2_rivet_pair', 'easy', 56, 64, 1, ['rivet_gnasher', 'rivet_gnasher']],
  ['enc_a2_drone_gnasher', 'easy', 62, 72, 1, ['furnace_drone', 'rivet_gnasher']],
  ['enc_a2_riveter', 'easy', 64, 70, 1, ['riveter']],
  ['enc_a2_drone_riveter', 'hard', 98, 110, 14, ['furnace_drone', 'riveter']],
  ['enc_a2_acolyte_golem', 'hard', 126, 138, 16, ['cog_acolyte', 'slag_golem']],
  ['enc_a2_oracle_pack', 'hard', 114, 128, 11, ['loom_oracle', 'rivet_gnasher', 'rivet_gnasher']],
  ['enc_a2_drone_trio', 'hard', 102, 120, 16, ['furnace_drone', 'furnace_drone', 'furnace_drone']],
  ['enc_a2_acolyte_pack', 'hard', 102, 116, 16, ['cog_acolyte', 'rivet_gnasher', 'rivet_gnasher']],
  ['enc_a2_golem_riveter', 'hard', 144, 156, 14, ['slag_golem', 'riveter']],
  ['enc_a2_oracle_golem', 'hard', 138, 150, 13, ['loom_oracle', 'slag_golem']],
  ['enc_a2_auditor', 'elite', 150, 158, 1, ['the_auditor']],
  ['enc_a2_anvil_hammer', 'elite', 160, 172, 1, ['anvil_warden', 'hammer_warden']],
  ['enc_a2_boiler', 'elite', 150, 158, 1, ['boiler_tyrant']],
] as const;

/** Fully typed combat fixture: no class, cards, relics or encounters are registered by this test. */
function sandbox(ids: readonly string[], seed = 'act2') {
  const state: RunState = {
    version: 1, seed, classId: 'breaker', rng: createStreams(seed), act: 2, ascent: 0, difficulty: 'standard', floor: 1,
    phase: 'combat', player: { hp: 100000, maxHp: 100000, gold: 0, deck: [], relics: [], potions: [], potionSlots: 3, counters: { shards: 0 } },
    map: { act: 2, rows: [], bossEncounter: 'unused' }, mapPos: null, mapPath: [], room: 'monster',
    reward: null, shop: null, event: null, rest: null, treasure: null, startChoices: null, bossRelicChoices: null,
    queue: [], pendingChoice: null, history: { floors: [] },
    counters: { encounters: [], monstersThisAct: 0, eventsSeen: [], rarePity: 0, potionChance: 40, shopRemovals: 0 }, nextUid: 1,
    combat: {
      encounterId: 'act2_sandbox', kind: 'monster', isElite: false, isBoss: false, eventId: null, onWin: [],
      turn: 1, turnPhase: 'player', outcome: null, energy: 3, maxEnergy: 3, drawPerTurn: 5, handLimit: 10,
      hand: [], draw: [], discard: [], exhaust: [], inPlay: [], primed: [], timeline: [],
      player: { block: 0, guard: 0, statuses: {} }, enemies: [], queue: [], pendingChoice: null,
      cardsPlayedThisTurn: [], attacksPlayedThisTurn: 0, cardsPlayedThisCombat: 0, reducedThisTurn: [], resolvedThisTurn: [], lastPrune: null,
      damageTaken: 0, counters: {}, nextEnemyUid: 1,
    },
  };
  const env = makeEnv(state);
  state.history.floors.push(newFloorRecord(state, 'monster'));
  const c = state.combat;
  if (!c) throw new Error('fixture combat missing');
  const enemies = ids.map((id) => spawnEnemy(env, c, id, { leaderUid: null, withLeader: null }));
  for (const enemy of enemies) runOnSpawn(env, enemy);
  for (const enemy of enemies) chooseNextMove(env, enemy, 1);
  const e = enemies[0];
  if (!e) throw new Error('fixture needs an enemy');
  return { env, state, c, e };
}

/** Run the actual enemy turn steps, without advancing into an unrelated class's player turn. */
function move(env: Env, e: EnemyState, moveId: string) {
  const c = env.state.combat;
  if (!c) throw new Error('move outside combat');
  c.turnPhase = 'enemy';
  e.intent = computeIntent(env.state, e, moveId);
  const offset = env.events.length;
  enqueue(env, [
    { kind: 'step', step: { op: 'enemy_turn_start', uid: e.uid } },
    { kind: 'step', step: { op: 'enemy_move', uid: e.uid } },
    { kind: 'step', step: { op: 'own_tick', who: e.uid } },
    { kind: 'step', step: { op: 'own_decay', who: e.uid } },
    { kind: 'step', step: { op: 'enemy_choose', uid: e.uid } },
  ]);
  drain(env);
  return env.events.slice(offset);
}

function partner(id: string): string {
  return id === 'hammer_warden' ? 'anvil_warden' : id === 'anvil_warden' ? 'hammer_warden' : 'rivet_gnasher';
}

function hit(env: Env, e: EnemyState, amount: number): void {
  dealDamage(env, { source: 'player', target: e.uid, card: null, tags: [], base: amount, ignoreBlock: false });
  drain(env);
}

describe('Act 2 roster and validators', () => {
  it('contains exactly the assigned enemies, statuses and non-boss encounters', () => {
    expect(ACT2_ENEMIES).toHaveLength(10);
    expect(ACT2_ENEMIES.map((d) => d.id)).toEqual(ENEMY_IDS);
    expect(ACT2_STATUSES).toHaveLength(5);
    expect(ACT2_STATUSES.map((d) => d.id)).toEqual(STATUS_IDS);
    expect(ACT2_ENCOUNTERS).toHaveLength(13);
    expect(ACT2_ENCOUNTERS.map((d) => d.id)).toEqual(ENCOUNTERS.map(([id]) => id));
  });

  for (const def of ACT2_ENEMIES) it(`validates ${def.id}, every move and its spawn statuses`, () => {
    expect(getEnemyDef(def.id)).toBe(def);
    expect(def.hp[0]).toBeGreaterThan(0);
    expect(def.hp[1]).toBeGreaterThanOrEqual(def.hp[0]);
    expect(def.boss).not.toBe(true);
    const errors: string[] = [];
    for (const [id, m] of Object.entries(def.moves)) {
      validateEffects(m.effects, { label: `${def.id}.${id}`, tables: def, hasTarget: true, combat: true, run: false, enemy: true }, errors);
      expect(m.text).toBeTypeOf('string');
      expect(m.text?.replace(/\{[^}]+\}/g, '')).not.toMatch(/\d/);
    }
    // Seething (shared, bosses.ts) carries its HP threshold as stacks; every other passive is a flag.
    for (const sid of Object.keys(def.spawnStatuses ?? {})) expect(getStatusDef(sid).stacks).toBe(sid === 'seething' ? 'amount' : 'flag');
    expect(errors).toEqual([]);
  });

  for (const def of ACT2_STATUSES) it(`validates and renders ${def.id}`, () => {
    expect(getStatusDef(def.id)).toBe(def);
    const errors: string[] = [];
    for (const [hook, effects] of Object.entries(def.triggers ?? {})) {
      validateEffects(effects, { label: `${def.id}.${hook}`, tables: def, hasTarget: false, combat: true, run: false, enemy: true }, errors);
    }
    expect(errors).toEqual([]);
    expect(def.text).not.toMatch(/\d/);
    for (const n of [1, 2, 3]) expect(renderStatusText(def.id, n)).not.toMatch(/[{}]/);
  });

  for (const [id, pool, min, max, weight, ids] of ENCOUNTERS) it(`${id} matches HP, weight, pool and action order`, () => {
    const enc = getEncounterDef(id);
    expect(enc.acts).toEqual([2]);
    expect(enc.pool).toBe(pool);
    expect(enc.weight).toBe(weight);
    expect(enc.enemies).toEqual(ids);
    expect(ids.reduce((n, eid) => n + getEnemyDef(eid).hp[0], 0)).toBe(min);
    expect(ids.reduce((n, eid) => n + getEnemyDef(eid).hp[1], 0)).toBe(max);
    const { c } = sandbox(ids, id);
    expect(c.enemies.reduce((n, e) => n + e.hp, 0)).toBeGreaterThanOrEqual(min);
    expect(c.enemies.reduce((n, e) => n + e.hp, 0)).toBeLessThanOrEqual(max);
  });

  it('has three uniform easy fights, three uniform elites, and hard weights summing to a hundred', () => {
    for (const pool of ['easy', 'elite']) expect(ACT2_ENCOUNTERS.filter((e) => e.pool === pool).map((e) => e.weight)).toEqual([1, 1, 1]);
    expect(ACT2_ENCOUNTERS.filter((e) => e.pool === 'hard').reduce((n, e) => n + (e.weight ?? 1), 0)).toBe(100);
  });
});

describe('every Act 2 move', () => {
  for (const def of ACT2_ENEMIES) for (const moveId of Object.keys(def.moves)) {
    it(`${def.id}.${moveId} resolves, renders, and previews exact hit numbers`, () => {
      const { env, state, c, e } = sandbox([def.id, partner(def.id)], `${def.id}.${moveId}`);
      e.intent = computeIntent(state, e, moveId);
      const before = { ...e.intent };
      const text = renderMoveText(state, e.uid, moveId);
      expect(text).toBeTypeOf('string');
      expect(text).not.toMatch(/[{}]/);
      const events = move(env, e, moveId);
      expect(e.moveHistory).toEqual([moveId]);
      expect(Object.keys(def.moves)).toContain(e.intent.moveId);
      expect(c.queue).toEqual([]);
      const hits = events.filter((ev) => ev.t === 'damage' && ev.kind === 'attack' && ev.target === 'player');
      if (before.damage !== undefined) {
        expect(hits).toHaveLength(before.hits ?? 1);
        for (const h of hits) if (h.t === 'damage') expect(h.amount).toBe(before.damage);
      } else expect(hits).toHaveLength(0);
      expect(e.forecast).toHaveLength(1);
      if (def.id === 'loom_oracle') expect(e.forecast[0]).toEqual({ kind: 'unknown', moveId: '', hidden: true });
      else expect(e.forecast[0]?.kind).not.toBe('unknown');
    });
  }
});

describe('seeded AI contract', () => {
  for (const id of ENEMY_IDS) for (const paired of [false, true]) {
    it(`${id} ${paired ? 'with allies' : 'alone'} follows its pattern for 200 seeded turns`, () => {
      for (const seed of ['foundry', 'iron', 'slag']) {
        const { state, c, env, e } = sandbox(paired ? [id, partner(id)] : [id], `${seed}-${id}`);
        const def = getEnemyDef(id);
        for (let t = 1; t <= 200; t++) {
          c.turn = t;
          c.turnPhase = 'player';
          const chosen = e.intent.moveId;
          const history = [...e.moveHistory];
          const last = history.at(-1);
          // Frozen enemy-side snapshots and cloned streams make AI repeatable without mutations.
          const before = structuredClone(e);
          const a = def.chooseMove(aiCtx(c, e, [...e.rng], history, t + 1));
          const b = def.chooseMove(aiCtx(c, e, [...e.rng], history, t + 1));
          expect(a).toBe(b);
          expect(e).toEqual(before);
          if (id === 'rivet_gnasher') expect(history.slice(-2).every((m) => m === chosen) && history.length >= 2).toBe(false);
          if (['furnace_drone', 'riveter', 'slag_golem', 'the_auditor', 'hammer_warden', 'boiler_tyrant'].includes(id)) expect(chosen).not.toBe(last);
          if (id === 'furnace_drone') {
            if (!paired) expect(chosen).not.toBe('overclock');
            if (t === 1) expect(chosen).toBe('scorch');
            if (t === 2 && paired) expect(chosen).toBe('target_lock');
          }
          if (id === 'cog_acolyte') {
            if (!paired) expect(chosen).toBe(t % 2 ? 'censer' : 'litany');
            else if (t % 4 === 1) expect(chosen).toBe('litany');
            else expect(chosen).not.toBe(last);
          }
          if (id === 'riveter' && (t === 1 || last === 'reload')) expect(chosen).toBe('rivet_burst');
          if (id === 'slag_golem' && chosen === 'pour_slag') expect(history.slice(-2)).not.toContain(chosen);
          if (id === 'the_auditor') {
            if (t === 1) expect(chosen).toBe('requisition');
            if (t === 2) expect(chosen).toBe('ledger_lash');
            if (chosen === 'requisition') expect(history.slice(-2)).not.toContain(chosen);
          }
          if (id === 'loom_oracle') expect(t % 2 ? ['shuttle_strike', 'unravel'] : ['weave_ward', 'thread_snare']).toContain(chosen);
          if (id === 'anvil_warden') expect(chosen).toBe(paired ? (t % 2 ? 'temper' : 'ring_out') : (t % 2 ? 'crush' : 'bulwark'));
          if (id === 'hammer_warden') {
            if (paired && t === 1) expect(chosen).toBe('wind_up');
            if (!paired) expect(chosen).toBe(t % 2 ? 'rapid_strikes' : 'hammerfall');
            if (chosen === 'wind_up') expect(history.slice(-3)).not.toContain(chosen);
          }
          if (id === 'boiler_tyrant') {
            expect(chosen).not.toBe('blowout');
            if (t === 1) expect(chosen).toBe('stoke');
            if (chosen === 'stoke') expect(history.slice(-3)).not.toContain(chosen);
          }
          // Forecasting consumes no live RNG and is independent of the player's future decisions.
          const rng = [...e.rng];
          const forecast = computeForecast(state, e);
          expect(e.rng).toEqual(rng);
          state.player.hp -= 1;
          c.player.guard = t % 10;
          expect(computeForecast(state, e)).toEqual(forecast);
          c.player.guard = 0;
          move(env, e, chosen);
          expect(e.forecast[0]?.kind).toBe(id === 'loom_oracle' ? 'unknown' : getEnemyDef(id).moves[e.forecast[0]?.moveId ?? '']?.intent);
        }
      }
    });
  }
});

describe('Act 2 mechanics and custom tables', () => {
  for (const [id, moveId, damage, hits] of [
    ['furnace_drone', 'scorch', 10, 1],
    ['rivet_gnasher', 'nip', 3, 3], ['rivet_gnasher', 'lunge', 9, 1],
    ['cog_acolyte', 'censer', 9, 1],
    ['riveter', 'rivet_burst', 3, 4], ['riveter', 'pin_down', 7, 1],
    ['slag_golem', 'ingot_slam', 15, 1], ['slag_golem', 'spatter', 6, 2],
    ['loom_oracle', 'shuttle_strike', 6, 2], ['loom_oracle', 'unravel', 14, 1],
    ['the_auditor', 'ledger_lash', 5, 2], ['the_auditor', 'stamp', 16, 1],
    ['anvil_warden', 'ring_out', 10, 1], ['anvil_warden', 'crush', 18, 1],
    ['hammer_warden', 'hammerfall', 18, 1], ['hammer_warden', 'rapid_strikes', 4, 4],
    ['boiler_tyrant', 'piston_punch', 14, 1], ['boiler_tyrant', 'steam_jet', 5, 3], ['boiler_tyrant', 'blowout', 24, 1],
  ] as const) it(`${id}.${moveId} matches the roster's base attack numbers`, () => {
    const { e, state } = sandbox([id, partner(id)]);
    expect(computeIntent(state, e, moveId)).toMatchObject({ damage, hits });
  });

  for (const [id, moveId, status, stacks] of [
    ['furnace_drone', 'target_lock', 'exposed', 2],
    ['riveter', 'pin_down', 'stagger', 2],
    ['loom_oracle', 'thread_snare', 'stagger', 2],
    ['loom_oracle', 'thread_snare', 'exposed', 2],
    ['the_auditor', 'stamp', 'exposed', 2],
    ['anvil_warden', 'ring_out', 'stagger', 2],
    ['anvil_warden', 'crush', 'exposed', 2],
  ] as const) it(`${id}.${moveId} applies ${stacks} ${status} after its hits`, () => {
    const { env, e, c } = sandbox([id]);
    const events = move(env, e, moveId);
    expect(c.player.statuses[status]).toBe(stacks);
    const lastHit = events.reduce((last, ev, index) => ev.t === 'damage' ? index : last, -1);
    expect(events.findIndex((ev) => ev.t === 'status' && ev.status === status)).toBeGreaterThan(lastHit);
  });

  for (const [id, moveId, card, zone, count] of [
    ['slag_golem', 'pour_slag', 'status_backlash', 'draw', 2],
    ['slag_golem', 'spatter', 'status_jitter', 'discard', 1],
    ['the_auditor', 'requisition', 'status_jitter', 'draw', 3],
  ] as const) it(`${id}.${moveId} adds exactly the roster's junk to ${zone}`, () => {
    const { env, e, c, state } = sandbox([id]);
    move(env, e, moveId);
    expect(c[zone].map((x) => x.id)).toEqual(Array.from({ length: count }, () => card));
    expect(state.player.deck).toEqual([]); // Junk is combat-only.
  });

  for (const [id, moveId, block] of [
    ['cog_acolyte', 'litany', 9], ['loom_oracle', 'weave_ward', 6],
  ] as const) it(`${id}.${moveId} shields every living ally`, () => {
    const { env, e, c } = sandbox([id, 'rivet_gnasher']);
    move(env, e, moveId);
    expect(c.enemies.map((a) => a.block)).toEqual([block, block]);
  });

  it('Weave Ward reacts to the Timeline: +2 Block per card waiting on it, live in its text', () => {
    const { env, e, c, state } = sandbox(['loom_oracle', 'rivet_gnasher']);
    expect(renderStatusText('sealed_pattern', 1)).toContain('Weave Ward gives 2 more Block per card on your Timeline.');
    expect(renderMoveText(state, e.uid, 'weave_ward')).toBe('Every living enemy gains 6 Block (6 + 2 per card on your Timeline).');
    c.timeline = [1, 2, 3].map((i): TimelineEntry => ({
      card: { uid: 900 + i, id: 'status_jitter', upgraded: false }, dueTurn: 2, seq: i, onBeat: false, target: null, x: 0, advancedThisTurn: false,
    }));
    expect(renderMoveText(state, e.uid, 'weave_ward')).toBe('Every living enemy gains 12 Block (6 + 2 per card on your Timeline).');
    move(env, e, 'weave_ward');
    expect(c.enemies.map((a) => a.block)).toEqual([12, 12]);
  });

  for (const [id, moveId, pool, amount] of [
    ['slag_golem', 'pour_slag', 'block', 8], ['slag_golem', 'cool_harden', 'block', 18],
    ['the_auditor', 'recount', 'block', 20], ['anvil_warden', 'bulwark', 'guard', 20],
  ] as const) it(`${id}.${moveId} gains exactly ${amount} ${pool}`, () => {
    const { env, e } = sandbox([id]);
    move(env, e, moveId);
    expect(e[pool]).toBe(amount);
  });

  it('offsets the three Drone openings and locks slot zero on turn two', () => {
    const { c, env } = sandbox(['furnace_drone', 'furnace_drone', 'furnace_drone']);
    expect(c.enemies.map((e) => e.aiState.slot)).toEqual([0, 1, 2]);
    expect(c.enemies.map((e) => e.intent.moveId)).toEqual(['scorch', 'overclock', 'target_lock']);
    const first = c.enemies[0];
    if (!first) throw new Error('missing drone');
    move(env, first, 'scorch');
    expect(first.intent.moveId).toBe('target_lock');
  });

  for (const [id, buff] of [['furnace_drone', 'overclock'], ['cog_acolyte', 'zeal']] as const) {
    it(`${id} buffs only the highest current-HP living ally, breaking ties leftmost`, () => {
      const { env, c, e, state } = sandbox([id, 'rivet_gnasher', 'riveter', 'slag_golem']);
      const [, left, right, dead] = c.enemies;
      if (!left || !right || !dead) throw new Error('missing allies');
      e.hp = e.maxHp = 1000; // Never buff self, even if it has the most HP.
      left.hp = right.hp = 20;
      dead.alive = false;
      move(env, e, buff);
      expect(left.statuses.might).toBe(2);
      expect(right.statuses.might).toBeUndefined();
      expect(dead.statuses.might).toBeUndefined();
      expect(e.statuses.might).toBeUndefined();
      expect(computeIntent(state, left, 'nip').damage).toBe(5);
      left.hp = 5;
      move(env, e, buff);
      expect(right.statuses.might).toBe(2);
      left.alive = right.alive = false;
      expect(() => move(env, e, buff)).not.toThrow();
    });
  }

  it('Anoint heals every other living enemy, caps at max HP and excludes self and dead allies', () => {
    const { env, c, e } = sandbox(['cog_acolyte', 'rivet_gnasher', 'riveter', 'slag_golem']);
    const [, a, b, dead] = c.enemies;
    if (!a || !b || !dead) throw new Error('missing allies');
    e.hp -= 10;
    const ownHp = e.hp;
    a.hp = a.maxHp - 12;
    b.hp = b.maxHp - 3;
    dead.alive = false;
    dead.hp = 0;
    move(env, e, 'anoint');
    expect(e.hp).toBe(ownHp);
    expect(a.hp).toBe(a.maxHp - 6);
    expect(b.hp).toBe(b.maxHp);
    expect(dead.hp).toBe(0);
  });

  it('Anoint scours up to 4 Rot off every other enemy, never off the Acolyte itself (Scour Rite)', () => {
    const { env, c, e, state } = sandbox(['cog_acolyte', 'rivet_gnasher', 'riveter']);
    const [, a, b] = c.enemies;
    if (!a || !b) throw new Error('missing allies');
    expect(e.statuses.scour_rite).toBe(1);
    expect(renderStatusText('scour_rite', 1)).toBe('Its Anoint washes up to 4 Rot off every other enemy. It never scours itself: Rot it first.');
    expect(renderMoveText(state, e.uid, 'anoint')).toBe('Every other living enemy loses up to 4 Rot and heals 6 HP.');
    applyStatus(env, e.uid, 'rot', 6);
    applyStatus(env, a.uid, 'rot', 6);
    applyStatus(env, b.uid, 'rot', 3);
    drain(env);
    move(env, e, 'anoint');
    expect(a.statuses.rot).toBe(2);
    expect(b.statuses.rot ?? 0).toBe(0);
    expect(e.statuses.rot).toBeGreaterThanOrEqual(6); // its own Rot ticked, never scoured
  });

  it('Reload increases the next Burst to seven hits, then clears loaded', () => {
    const { env, e, state } = sandbox(['riveter']);
    move(env, e, 'reload');
    expect(e.block).toBe(12);
    expect(e.aiState.loaded).toBe(2);
    expect(computeIntent(state, e, 'rivet_burst')).toMatchObject({ damage: 3, hits: 6 });
    move(env, e, 'rivet_burst');
    expect(e.aiState.loaded).toBe(0);
    expect(computeIntent(state, e, 'rivet_burst')).toMatchObject({ damage: 3, hits: 4 });
  });

  it('Ledger Lash clamps and floors the live draw-pile count, independent of AI selection', () => {
    const { env, c, e, state } = sandbox(['the_auditor']);
    delete e.statuses.seething; // isolate Inventory: an unhurt Auditor would otherwise gain Might every move
    for (const [cards, hits] of [[0, 2], [3, 2], [4, 2], [7, 2], [8, 2], [20, 5], [31, 7], [32, 8], [100, 8]]) {
      if (cards === undefined || hits === undefined) throw new Error('bad case');
      // Real registered status cards; this does not add a content pack.
      c.draw = Array.from({ length: cards }, (_, i) => ({ uid: i + 1000, id: 'status_jitter', upgraded: false }));
      expect(computeIntent(state, e, 'ledger_lash')).toMatchObject({ damage: 5, hits });
      const hp = state.player.hp;
      move(env, e, 'ledger_lash');
      expect(hp - state.player.hp).toBe(5 * hits);
    }
  });

  it('the Warden pair banks Guard, escalates rage and changes only future moves when a partner dies', () => {
    const { env, c, e: anvil, state } = sandbox(['anvil_warden', 'hammer_warden']);
    const hammer = c.enemies[1];
    if (!hammer) throw new Error('missing hammer');
    move(env, anvil, 'temper');
    expect([anvil.guard, hammer.guard]).toEqual([10, 10]);
    move(env, hammer, 'wind_up');
    expect(hammer.guard).toBe(5);
    expect(hammer.aiState.rage).toBe(2);
    expect(computeIntent(state, hammer, 'hammerfall').damage).toBe(20);
    expect(computeIntent(state, hammer, 'rapid_strikes')).toMatchObject({ damage: 6, hits: 4 });
    const current = hammer.intent.moveId;
    loseHp(env, anvil.uid, 1000, 'player');
    refreshIntents(env);
    expect(hammer.intent.moveId).toBe(current);
    expect(computeIntent(state, hammer, 'rapid_strikes')).toMatchObject({ damage: 6, hits: 6 });
    chooseNextMove(env, hammer, 3);
    expect(hammer.intent.moveId).not.toBe('wind_up');
    expect(hammer.forecast[0]?.moveId).toBe(hammer.intent.moveId === 'rapid_strikes' ? 'hammerfall' : 'rapid_strikes');
    const other = sandbox(['anvil_warden', 'hammer_warden']);
    const otherHammer = other.c.enemies[1];
    if (!otherHammer) throw new Error('missing hammer');
    loseHp(other.env, otherHammer.uid, 1000, 'player');
    chooseNextMove(other.env, other.e, 2);
    expect(other.e.intent.moveId).toBe('crush');
  });

  it('Overpressure counts only actual HP lost on player turns and overrides immediately, once per turn', () => {
    const { env, c, e, state } = sandbox(['boiler_tyrant']);
    e.hp = e.maxHp = 1000;
    e.block = 10;
    hit(env, e, 10);
    expect(e.aiState.pressure).toBeUndefined();
    hit(env, e, 29);
    expect(e.intent.moveId).toBe('stoke');
    hit(env, e, 1);
    expect(e.intent).toMatchObject({ moveId: 'blowout', damage: 24, hits: 1 });
    expect(e.aiState.pressure).toBe(30);
    const overrides = () => env.events.filter((ev) => ev.t === 'enemy_intent' && ev.intent.moveId === 'blowout').length;
    expect(overrides()).toBe(1);
    hit(env, e, 40);
    expect(overrides()).toBe(1);
    c.turnPhase = 'enemy';
    applyStatus(env, e.uid, 'rot', 5);
    tickEntity(env, e.uid, 'end_own_turn');
    drain(env);
    expect(e.aiState.pressure).toBe(70);
    c.turnPhase = 'player';
    tickPhase(env, 'start_player_turn');
    drain(env);
    expect(e.aiState.pressure).toBe(0);
    expect(e.aiState.blown).toBe(0);
    // Same source/tag as a Timeline hit, after the reset and before the normal draw.
    enqueue(env, effectItems([{ type: 'damage', target: 'target', amount: 30, tags: ['delayed'] }], { src: { kind: 'system' }, self: 'player', target: e.uid, x: 0 }));
    drain(env);
    expect(overrides()).toBe(2);
    expect(e.aiState.pressure).toBe(30);
    move(env, e, 'stoke');
    expect(computeIntent(state, e, 'blowout').damage).toBe(26);
  });
});
