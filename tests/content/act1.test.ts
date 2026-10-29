import { describe, expect, it } from 'vitest';
// Importing the real entry point registers this pack. No additional packs are registered here.
import { getEncounterDef, getEnemyDef, getStatusDef } from '../../src/content';
import { ACT1_ENCOUNTERS, ACT1_ENEMIES, ACT1_STATUSES } from '../../src/content/enemies/act1';
import { makeCard } from '../../src/engine/cards';
import { enqueue, makeEnv, type Env } from '../../src/engine/core';
import { dealDamage, loseHp } from '../../src/engine/damage';
import { aiCtx, chooseNextMove, computeForecast, computeIntent, refreshIntents, runOnSpawn, spawnEnemy } from '../../src/engine/enemies';
import { newFloorRecord } from '../../src/engine/history';
import { drain, runNow } from '../../src/engine/queue';
import { createStreams, hashString } from '../../src/engine/rng';
import { applyStatus, tickEntity } from '../../src/engine/statuses';
import { renderMoveText, renderStatusText } from '../../src/engine/text';
import { validateEffects } from '../../src/engine/validate';
import { ENGINE_VERSION } from '../../src/engine/version';
import type { CombatState, EnemyState, GameEvent, RunState, TurnStep } from '../../src/engine/types';

const ENEMY_IDS = [
  'gnasher', 'sporepuff', 'scrap_drone', 'thornback', 'vinelash', 'flitterfang',
  'sickle_mantis', 'pollen_wisp', 'gnasher_alpha', 'dreadcap', 'shellback_titan',
];
const STATUS_IDS = ['shrill', 'reads_the_guard', 'mycelial_bond', 'soft_underbelly'];
const BASE_ATTACKS: Record<string, Record<string, readonly [number, number]>> = {
  gnasher: { nip: [3, 2], lunge: [7, 1] },
  sporepuff: { sting: [5, 1] },
  scrap_drone: { zap: [6, 1] },
  thornback: { gore: [13, 1], trample: [5, 2] },
  vinelash: { lash: [4, 3], strangle: [11, 1] },
  flitterfang: { frenzied_bite: [3, 3], swoop: [7, 1] },
  sickle_mantis: { twin_sickle: [5, 2], scissor_cut: [14, 1] },
  pollen_wisp: { seed_flick: [4, 1] },
  gnasher_alpha: { rend: [5, 2], maul: [14, 1] },
  dreadcap: { cap_crush: [8, 1], gill_lash: [3, 3] },
  shellback_titan: { clamp: [6, 1], grind: [8, 2] },
};
// Independent roster transcription: id, pool, exact action order, HP sum and weight.
const ROSTER = [
  ['enc_a1_gnasher_pair', 'easy', ['gnasher', 'gnasher'], [26, 34], 1],
  ['enc_a1_drone_puff', 'easy', ['scrap_drone', 'sporepuff'], [25, 32], 1],
  ['enc_a1_thornback', 'easy', ['thornback'], [42, 46], 1],
  ['enc_a1_mantis', 'hard', ['sickle_mantis'], [40, 44], 15],
  ['enc_a1_vine_puff', 'hard', ['sporepuff', 'vinelash'], [58, 67], 15],
  ['enc_a1_flitter_gnasher', 'hard', ['flitterfang', 'gnasher'], [37, 45], 15],
  ['enc_a1_drone_pack', 'hard', ['scrap_drone', 'gnasher', 'gnasher'], [41, 53], 14],
  ['enc_a1_thornback_wisp', 'hard', ['pollen_wisp', 'thornback'], [62, 70], 14],
  ['enc_a1_spore_cluster', 'hard', ['sporepuff', 'sporepuff', 'sporepuff'], [30, 39], 12],
  ['enc_a1_thornback_drone', 'hard', ['scrap_drone', 'thornback'], [57, 65], 15],
  ['enc_a1_alpha', 'elite', ['gnasher_alpha', 'gnasher', 'gnasher'], [88, 100], 1],
  ['enc_a1_dreadcap', 'elite', ['dreadcap'], [90, 96], 1],
  ['enc_a1_titan', 'elite', ['shellback_titan'], [80, 86], 1],
] as const;

/** A combat fixture with real registered enemies, without depending on a registered class/test pack.
 * Run only enemy-turn steps: a new player turn would require the still-independent class pack.
 */
function sandbox(encounterId = 'enc_a1_gnasher_pair', seed = encounterId) {
  const combat: CombatState = {
    encounterId, kind: 'monster', isElite: false, isBoss: false, eventId: null, onWin: [],
    turn: 1, turnPhase: 'player', outcome: null, energy: 3, maxEnergy: 3, drawPerTurn: 5, handLimit: 10,
    hand: [], draw: [], discard: [], exhaust: [], inPlay: [], primed: [], timeline: [],
    player: { block: 0, guard: 0, statuses: {} }, enemies: [], queue: [], pendingChoice: null,
    cardsPlayedThisTurn: [], attacksPlayedThisTurn: 0, cardsPlayedThisCombat: 0,
    reducedThisTurn: [], resolvedThisTurn: [], lastPrune: null, damageTaken: 0, counters: {}, nextEnemyUid: 1,
  };
  const state: RunState = {
    version: ENGINE_VERSION, seed, classId: 'breaker', rng: createStreams(seed), act: 1, ascent: 0,
    floor: 1, phase: 'combat', player: { hp: 100000, maxHp: 100000, gold: 0, deck: [], relics: [],
      potions: [], potionSlots: 3, counters: { shards: 0 } },
    map: { act: 1, rows: [], bossEncounter: 'enc_a1_titan' }, mapPos: null, mapPath: [], room: 'monster', combat,
    reward: null, shop: null, event: null, rest: null, treasure: null, startChoices: null,
    bossRelicChoices: null, queue: [], pendingChoice: null, history: { floors: [] },
    counters: { encounters: [], monstersThisAct: 0, eventsSeen: [], rarePity: 0, potionChance: 40, shopRemovals: 0 },
    nextUid: 1,
  };
  state.history.floors.push(newFloorRecord(state, 'monster'));
  const env = makeEnv(state);
  const enc = getEncounterDef(encounterId);
  for (const slot of enc.enemies) {
    const spec = typeof slot === 'string' ? { id: slot } : slot;
    const leader = spec.leader === undefined ? null : combat.enemies[spec.leader];
    if (leader === undefined) throw new Error('Missing encounter leader');
    spawnEnemy(env, combat, spec.id, { leaderUid: leader?.uid ?? null, withLeader: spec.withLeader ?? null });
  }
  for (const e of combat.enemies) runOnSpawn(env, e);
  for (const e of combat.enemies) chooseNextMove(env, e, 1);
  return { state, combat, env };
}

function firstEnemy(c: CombatState): EnemyState {
  const e = c.enemies[0];
  if (!e) throw new Error('Empty sandbox');
  return e;
}

function addEnemy(env: Env, id: string): EnemyState {
  const c = env.state.combat;
  if (!c) throw new Error('Missing combat');
  const e = spawnEnemy(env, c, id, { leaderUid: null, withLeader: null });
  runOnSpawn(env, e);
  chooseNextMove(env, e, c.turn);
  return e;
}

/** Run the actual declaration/Riposte/effects/end-of-own-turn/next-intent pipeline. */
function resolveMove(env: Env, e: EnemyState, id: string): GameEvent[] {
  const c = env.state.combat;
  if (!c) throw new Error('Missing combat');
  c.turnPhase = 'player';
  e.intent = computeIntent(env.state, e, id);
  const start = env.events.length;
  c.turnPhase = 'enemy';
  const steps: TurnStep[] = [
    { op: 'enemy_turn_start', uid: e.uid }, { op: 'enemy_move', uid: e.uid },
    { op: 'own_tick', who: e.uid }, { op: 'own_decay', who: e.uid }, { op: 'enemy_choose', uid: e.uid },
  ];
  enqueue(env, steps.map((step) => ({ kind: 'step', step })));
  drain(env);
  expect(c.queue).toEqual([]);
  expect(c.pendingChoice).toBeNull();
  return env.events.slice(start);
}

function hits(events: GameEvent[], source: number) {
  return events.filter((e) => e.t === 'damage' && e.source === source && e.target === 'player');
}

describe('Act 1 roster and validation', () => {
  it('contains exactly the assigned enemies, passives and encounters, all automatically registered', () => {
    expect(ACT1_ENEMIES).toHaveLength(11);
    expect(ACT1_ENEMIES.map((e) => e.id)).toEqual(ENEMY_IDS);
    expect(ACT1_STATUSES).toHaveLength(4);
    expect(ACT1_STATUSES.map((s) => s.id)).toEqual(STATUS_IDS);
    expect(ACT1_ENCOUNTERS).toHaveLength(13);
    expect(ACT1_ENCOUNTERS.map((e) => e.id)).toEqual(ROSTER.map(([id]) => id));
    for (const def of ACT1_ENEMIES) expect(getEnemyDef(def.id)).toBe(def);
    for (const def of ACT1_STATUSES) expect(getStatusDef(def.id)).toBe(def);
    for (const def of ACT1_ENCOUNTERS) expect(getEncounterDef(def.id)).toBe(def);
  });

  it('passes the engine effect validator for every definition and cross reference in this pack', () => {
    // The global registry validator is covered by smoke.test.ts; it also checks other
    // implementers' incomplete packs. Validate our definitions and references directly.
    const problems: string[] = [];
    for (const def of ACT1_ENEMIES) {
      for (const [id, move] of Object.entries(def.moves)) {
        validateEffects(move.effects, { label: `${def.id}.${id}`, tables: def,
          hasTarget: true, combat: true, run: false, enemy: true }, problems);
      }
      validateEffects(Object.entries(def.spawnStatuses ?? {}).map(([id, amount]) => ({
        type: 'status', target: 'self', id, amount,
      })), { label: `${def.id} spawn`, tables: def,
        hasTarget: false, combat: true, run: false, enemy: true }, problems);
    }
    for (const def of ACT1_STATUSES) {
      validateEffects([], { label: def.id, tables: def, hasTarget: false, combat: true, run: false, enemy: true }, problems);
      for (const [hook, effects] of Object.entries(def.triggers ?? {})) {
        validateEffects(effects, { label: `${def.id}.${hook}`, tables: def,
          hasTarget: false, combat: true, run: false, enemy: true }, problems);
      }
      expect(renderStatusText(def.id, 1)).not.toMatch(/[{}]/);
      expect(def.text.replace(/\{[^}]+\}/g, '')).not.toMatch(/\d/);
    }
    for (const enc of ACT1_ENCOUNTERS) {
      // summon uses the engine's enemy-reference validation for the same slot ids.
      validateEffects(enc.enemies.map((slot) => ({ type: 'summon', enemy: typeof slot === 'string' ? slot : slot.id })),
        { label: enc.id, tables: {}, hasTarget: false, combat: true, run: false, enemy: true }, problems);
      enc.enemies.forEach((slot, i) => {
        if (typeof slot !== 'string' && slot.leader !== undefined) {
          expect(slot.leader).toBeGreaterThanOrEqual(0);
          expect(slot.leader).toBeLessThan(i);
        }
      });
    }
    expect(problems).toEqual([]);
  });

  for (const [id, pool, ids, hp, weight] of ROSTER) {
    it(`${id}: exact order, HP range, pool, weight and spawn ranges`, () => {
      const enc = getEncounterDef(id);
      expect(enc.acts).toEqual([1]);
      expect(enc.pool).toBe(pool);
      expect(enc.weight).toBe(weight);
      expect(enc.enemies.map((e) => typeof e === 'string' ? e : e.id)).toEqual(ids);
      const sum = [0, 0];
      for (const slot of enc.enemies) {
        const def = getEnemyDef(typeof slot === 'string' ? slot : slot.id);
        sum[0] = sum[0]! + def.hp[0];
        sum[1] = sum[1]! + def.hp[1];
      }
      expect(sum).toEqual(hp);
      for (const seed of ['low', 'middle', 'high']) {
        const { combat } = sandbox(id, seed);
        const total = combat.enemies.reduce((n, e) => n + e.hp, 0);
        expect(total).toBeGreaterThanOrEqual(hp[0]);
        expect(total).toBeLessThanOrEqual(hp[1]);
        for (const e of combat.enemies) {
          expect(e.hp).toBeGreaterThanOrEqual(getEnemyDef(e.id).hp[0]);
          expect(e.hp).toBeLessThanOrEqual(getEnemyDef(e.id).hp[1]);
        }
      }
      expect(ids.filter((e) => e === 'flitterfang').length).toBeLessThanOrEqual(1);
    });
  }

  it('has uniform easy/elite pools and hard weights summing to a hundred', () => {
    expect(ACT1_ENCOUNTERS.filter((e) => e.pool === 'easy').map((e) => e.weight)).toEqual([1, 1, 1]);
    expect(ACT1_ENCOUNTERS.filter((e) => e.pool === 'elite').map((e) => e.weight)).toEqual([1, 1, 1]);
    expect(ACT1_ENCOUNTERS.filter((e) => e.pool === 'hard').reduce((n, e) => n + e.weight!, 0)).toBe(100);
  });
});

describe('every Act 1 move', () => {
  for (const def of ACT1_ENEMIES) {
    for (const [id, move] of Object.entries(def.moves)) {
      it(`${def.id}.${id} renders, resolves and forecasts without throwing`, () => {
        const { state, combat, env } = sandbox();
        // A genuine spawn applies passives and onSpawn, unlike changing only an enemy id.
        const e = addEnemy(env, def.id);
        e.intent = computeIntent(state, e, id);
        expect(move.text).toBeDefined();
        expect(move.text!.replace(/\{[^}]+\}/g, '')).not.toMatch(/\d/);
        expect(renderMoveText(state, e.uid, id)).not.toMatch(/[{}]/);
        const expectedAttack = BASE_ATTACKS[def.id]?.[id];
        expect(e.intent).toEqual(expectedAttack
          ? { kind: move.intent, moveId: id, damage: expectedAttack[0], hits: expectedAttack[1] }
          : { kind: move.intent, moveId: id });
        const events = resolveMove(env, e, id);
        expect(e.moveHistory).toEqual([id]);
        expect(events).toContainEqual(expect.objectContaining({ t: 'enemy_move', uid: e.uid, moveId: id }));
        expect(def.moves[e.intent.moveId]).toBeDefined();
        expect(e.forecast).toHaveLength(1);
        for (const forecast of e.forecast) {
          expect(forecast.kind).not.toBe('unknown');
          expect(forecast.hidden).not.toBe(true);
          expect(def.moves[forecast.moveId]).toBeDefined();
          if (forecast.kind.startsWith('attack')) expect(forecast.damage).toBeTypeOf('number');
        }
        expect(combat.outcome).toBeNull();
      });
    }
  }
});

describe('AI contract over two hundred seeded turns', () => {
  for (const def of ACT1_ENEMIES) {
    it(`${def.id}: deterministic, pure, respects opening and repeat restrictions`, () => {
      for (const seed of ['pattern-a', 'pattern-b', 'pattern-c', 'pattern-d', 'pattern-e']) {
        const { state, combat, env } = sandbox('enc_a1_alpha', seed);
        const e = addEnemy(env, def.id);
        const history: string[] = [];
        const rng = hashString(`${seed}/${def.id}`);
        const seen = new Set<string>();
        for (let turn = 1; turn <= 200; turn++) {
          const before = structuredClone(e);
          const initialRng = [...rng] as typeof rng;
          const rngCopy = [...rng] as typeof rng;
          const move = def.chooseMove(aiCtx(combat, e, rng, history, turn));
          // Identical enemy-side inputs produce identical choices and RNG consumption.
          expect(def.chooseMove(aiCtx(combat, e, rngCopy, history, turn))).toBe(move);
          expect(rngCopy).toEqual(rng);
          expect(e).toEqual(before);
          // Alter every relevant player field: choosing still receives the same enemy snapshot.
          state.player.hp = turn;
          combat.player.block = turn;
          combat.player.guard = turn;
          combat.player.statuses.exposed = turn;
          expect(def.chooseMove(aiCtx(combat, e, initialRng, history, turn))).toBe(move);
          const last = history.at(-1);
          expect(def.moves[move]).toBeDefined();
          if (['sporepuff', 'sickle_mantis', 'pollen_wisp', 'gnasher_alpha', 'dreadcap'].includes(def.id)) expect(move).not.toBe(last);
          if (def.id === 'gnasher' && history.at(-2) === last) expect(move).not.toBe(last);
          if (def.id === 'scrap_drone' && last === 'target_lock') expect(move).toBe('zap');
          if (def.id === 'thornback') {
            if (turn === 1 || last === 'bristle') expect(move).toBe('gore');
            if (last === 'gore') expect(move).not.toBe('gore');
          }
          if (def.id === 'vinelash') {
            if (turn === 1) expect(move).toBe('ensnare');
            if (last === 'ensnare') expect(move).not.toBe('ensnare');
            if (last === 'lash' && history.at(-2) === 'lash') expect(move).not.toBe('lash');
          }
          if (def.id === 'flitterfang' && (turn === 1 || last === 'swoop')) expect(move).toBe('frenzied_bite');
          if (def.id === 'sickle_mantis' && turn === 1) expect(move).toBe('twin_sickle');
          if (def.id === 'pollen_wisp' && turn === 1) expect(move).toBe('pollinate');
          if (def.id === 'gnasher_alpha' && turn === 1) expect(move).toBe('rally_howl');
          if (def.id === 'dreadcap') {
            if (turn === 1) expect(move).toBe('sporefall');
            if (turn === 2) expect(move).toBe('cap_crush');
            if (history.slice(-2).includes('sporefall')) expect(move).not.toBe('sporefall');
          }
          if (def.id === 'shellback_titan') expect(move).toBe(turn % 2 ? 'clamp' : 'grind');
          history.push(move);
          seen.add(move);
        }
        expect(seen.size).toBeGreaterThanOrEqual(2);
      }
    });
  }

  it('uses encounter slot order for Sporepuff openings and ally presence for the Drone/Wisp', () => {
    const cluster = sandbox('enc_a1_spore_cluster');
    expect(cluster.combat.enemies.map((e) => e.aiState.slot)).toEqual([0, 1, 2]);
    expect(cluster.combat.enemies.map((e) => e.intent.moveId)).toEqual(['puff', 'sting', 'dust']);
    const solo = sandbox('enc_a1_gnasher_pair');
    solo.combat.enemies.forEach((e) => { e.alive = false; });
    const puff = addEnemy(solo.env, 'sporepuff');
    expect(puff.intent.moveId).toBe('puff');
    puff.alive = false;
    const drone = addEnemy(solo.env, 'scrap_drone');
    expect(drone.intent.moveId).toBe('zap');
    drone.alive = false;
    const wisp = addEnemy(solo.env, 'pollen_wisp');
    for (let turn = 1; turn <= 200; turn++) {
      expect(getEnemyDef(wisp.id).chooseMove(aiCtx(solo.combat, wisp, wisp.rng, [], turn))).toBe('seed_flick');
    }
    expect(firstEnemy(sandbox('enc_a1_drone_pack').combat).intent.moveId).toBe('target_lock');
  });

  it('calls the pack only once, after turn three, when every Gnasher is gone', () => {
    const { combat } = sandbox('enc_a1_alpha');
    const alpha = firstEnemy(combat);
    combat.enemies.slice(1).forEach((e) => { e.alive = false; });
    const history = ['rally_howl'];
    for (let turn = 2; turn <= 200; turn++) {
      const move = getEnemyDef(alpha.id).chooseMove(aiCtx(combat, alpha, alpha.rng, history, turn));
      expect(move === 'call_pack').toBe(turn === 4);
      history.push(move);
    }
  });

  it('computing forecasts neither consumes live RNG nor mutates enemy state', () => {
    for (const encounter of ACT1_ENCOUNTERS) {
      const { state, combat } = sandbox(encounter.id);
      for (const e of combat.enemies) {
        const before = structuredClone(e);
        expect(computeForecast(state, e)).toEqual(e.forecast);
        expect(e).toEqual(before);
        const next = getEnemyDef(e.id).chooseMove(aiCtx(combat, e, [...e.rng], [...e.moveHistory, e.intent.moveId], e.intentTurn + 1));
        expect(e.forecast[0]?.moveId).toBe(next);
      }
    }
  });
});

describe('Act 1 mechanics and custom effects', () => {
  it('Bristle boosts Gore once; Preen boosts either Mantis attack once', () => {
    const { state, combat, env } = sandbox('enc_a1_thornback');
    const thorn = firstEnemy(combat);
    resolveMove(env, thorn, 'bristle');
    expect(thorn.block).toBe(9);
    expect(computeIntent(state, thorn, 'gore').damage).toBe(18);
    expect(hits(resolveMove(env, thorn, 'gore'), thorn.uid)).toEqual([expect.objectContaining({ amount: 18 })]);
    expect(thorn.aiState.bristle).toBe(0);
    expect(computeIntent(state, thorn, 'gore').damage).toBe(13);
    const mantis = addEnemy(env, 'sickle_mantis');
    for (const [attack, amount, count] of [['twin_sickle', 7, 2], ['scissor_cut', 16, 1]] as const) {
      resolveMove(env, mantis, 'preen');
      expect(mantis.block).toBe(10);
      expect(computeIntent(state, mantis, attack).damage).toBe(amount);
      const damage = hits(resolveMove(env, mantis, attack), mantis.uid);
      expect(damage).toHaveLength(count);
      for (const hit of damage) expect(hit).toMatchObject({ amount });
      expect(mantis.aiState.honed).toBe(0);
    }
  });

  it('Twin Sickle adds a hit at declaration if Riposte fired, even when no card remains primed', () => {
    const { state, combat, env } = sandbox('enc_a1_mantis');
    const mantis = firstEnemy(combat);
    // Use a real Riposte card; no test definitions are registered.
    combat.hand = [makeCard(state, 'snare_line')];
    expect(renderMoveText(state, mantis.uid, 'twin_sickle')).toBe('Deal 5 damage × 2 (5 × 3 if parried). Consume Honed.');
    combat.hand = [];
    combat.primed = [{ card: makeCard(state, 'snare_line'), charges: 1 }];
    expect(computeIntent(state, mantis, 'twin_sickle')).toMatchObject({ damage: 5, hits: 3 });
    const ev = resolveMove(env, mantis, 'twin_sickle');
    expect(ev.filter((e) => e.t === 'riposte_triggered')).toHaveLength(1);
    expect(hits(ev, mantis.uid)).toHaveLength(3);
    for (const hit of hits(ev, mantis.uid)) expect(hit).toMatchObject({ amount: 2 });
    expect(combat.primed).toHaveLength(0);
    combat.turnPhase = 'player';
    expect(computeIntent(state, mantis, 'twin_sickle').hits).toBe(2);
  });

  it('Shrill increases Exposed once per own turn, boosts later allies and stops on death', () => {
    const { state, combat, env } = sandbox('enc_a1_flitter_gnasher');
    const flitter = firstEnemy(combat);
    const ally = combat.enemies[1]!;
    expect(computeIntent(state, flitter, 'frenzied_bite')).toMatchObject({ damage: 3, hits: 3 });
    resolveMove(env, flitter, 'frenzied_bite');
    expect(combat.player.statuses.exposed).toBe(2);
    expect(computeIntent(state, ally, 'nip').damage).toBe(5);
    // End the player's following turn: Exposed decays to one, then Shrill adds two again.
    runNow(env, [{ kind: 'step', step: { op: 'own_decay', who: 'player' } }]);
    expect(combat.player.statuses.exposed).toBe(1);
    resolveMove(env, flitter, 'swoop');
    expect(combat.player.statuses.exposed).toBe(3);
    loseHp(env, flitter.uid, flitter.hp, 'player');
    runNow(env, [{ kind: 'step', step: { op: 'own_tick', who: flitter.uid } }]);
    expect(combat.player.statuses.exposed).toBe(3);
  });

  it('Pollinate excludes self/dead allies; Dewdrop chooses lowest absolute HP with leftmost ties', () => {
    const { combat, env } = sandbox('enc_a1_thornback_wisp');
    const wisp = firstEnemy(combat);
    const thorn = combat.enemies[1]!;
    const gnasher = addEnemy(env, 'gnasher');
    const dead = addEnemy(env, 'scrap_drone');
    dead.alive = false;
    wisp.hp = 1;
    resolveMove(env, wisp, 'pollinate');
    expect(wisp.statuses.might).toBeUndefined();
    expect(thorn.statuses.might).toBe(1);
    expect(gnasher.statuses.might).toBe(1);
    expect(dead.statuses.might).toBeUndefined();
    thorn.hp = gnasher.hp = 5;
    resolveMove(env, wisp, 'dewdrop');
    expect(thorn.hp).toBe(13);
    expect(gnasher.hp).toBe(5);
    resolveMove(env, wisp, 'dewdrop');
    expect(gnasher.hp).toBe(13);
    expect(wisp.hp).toBe(1);
    thorn.alive = gnasher.alive = false;
    expect(() => resolveMove(env, wisp, 'dewdrop')).not.toThrow();
    expect(() => resolveMove(env, wisp, 'pollinate')).not.toThrow();
  });

  it('Rally Howl buffs only living Gnashers; both initial and summoned pups flee with Alpha', () => {
    const { state, combat, env } = sandbox('enc_a1_alpha');
    const alpha = firstEnemy(combat);
    const pups = combat.enemies.slice(1);
    const other = addEnemy(env, 'sporepuff');
    expect(pups.map((e) => [e.leaderUid, e.withLeader])).toEqual([[alpha.uid, 'flee'], [alpha.uid, 'flee']]);
    resolveMove(env, alpha, 'rally_howl');
    expect(alpha.block).toBe(8);
    expect(pups.map((e) => e.statuses.might)).toEqual([1, 1]);
    expect(alpha.statuses.might).toBeUndefined();
    expect(other.statuses.might).toBeUndefined();
    expect(computeIntent(state, pups[0]!, 'nip').damage).toBe(4);
    pups.forEach((e) => { e.alive = false; });
    const summonEvents = resolveMove(env, alpha, 'call_pack');
    const summoned = combat.enemies.filter((e) => e.alive && e.id === 'gnasher');
    expect(summoned).toHaveLength(2);
    expect(summoned.map((e) => [e.leaderUid, e.withLeader])).toEqual([[alpha.uid, 'flee'], [alpha.uid, 'flee']]);
    expect(summonEvents.filter((e) => e.t === 'enemy_move' && e.uid !== alpha.uid)).toHaveLength(0);
    resolveMove(env, alpha, 'call_pack');
    expect(combat.enemies.filter((e) => e.alive && e.id === 'gnasher')).toHaveLength(2);
    loseHp(env, alpha.uid, alpha.hp, 'player');
    for (const pup of summoned) {
      expect(pup.intent.kind).toBe('escape');
      runNow(env, [{ kind: 'step', step: { op: 'enemy_turn_start', uid: pup.uid } }]);
      expect(pup.alive).toBe(false);
      expect(pup.fled).toBe(true);
    }
    expect(env.events.filter((e) => e.t === 'enemy_died' && summoned.some((p) => p.uid === e.uid))).toHaveLength(0);
    expect(env.events.filter((e) => e.t === 'enemy_fled')).toHaveLength(2);
  });

  it('Dreadcap counts only Status cards in hand/draw/discard and updates its exact intent', () => {
    const { state, combat, env } = sandbox('enc_a1_dreadcap');
    const cap = firstEnemy(combat);
    resolveMove(env, cap, 'sporefall');
    expect(combat.draw.map((c) => c.id)).toEqual(['status_tangle', 'status_tangle']);
    expect(computeIntent(state, cap, 'cap_crush').damage).toBe(10);
    expect(computeIntent(state, cap, 'gill_lash')).toMatchObject({ damage: 4, hits: 3 });
    combat.hand.push(combat.draw.pop()!);
    combat.discard.push(combat.draw.pop()!);
    expect(computeIntent(state, cap, 'cap_crush').damage).toBe(10);
    combat.exhaust.push(combat.hand.pop()!);
    cap.intent = computeIntent(state, cap, 'cap_crush');
    refreshIntents(env);
    expect(cap.intent.damage).toBe(9);
    expect(hits(resolveMove(env, cap, 'gill_lash'), cap.uid)).toEqual(Array.from({ length: 3 }, () => expect.objectContaining({ amount: 3 })));
    resolveMove(env, cap, 'hunker');
    expect(cap.block).toBe(14);
    expect(combat.discard).toHaveLength(2);
    expect(computeIntent(state, cap, 'cap_crush').damage).toBe(10);
  });

  it('Titan escalates Clamp Block, exposes its underbelly mid-volley, and Rot ignores its shell', () => {
    const { state, combat, env } = sandbox('enc_a1_titan');
    const titan = firstEnemy(combat);
    for (const block of [16, 20, 24]) {
      resolveMove(env, titan, 'clamp');
      expect(titan.block).toBe(block);
    }
    const hp = titan.hp;
    const hit = (base: number) => dealDamage(env, { source: 'player', target: titan.uid, base, card: null, tags: [], ignoreBlock: false });
    hit(24);
    expect(titan.block).toBe(0);
    expect(titan.hp).toBe(hp);
    hit(2);
    expect(titan.hp).toBe(hp - 5);
    resolveMove(env, titan, 'clamp');
    const shell = titan.block;
    applyStatus(env, titan.uid, 'rot', 3);
    tickEntity(env, titan.uid, 'end_own_turn');
    drain(env);
    expect(titan.block).toBe(shell);
    expect(titan.hp).toBe(hp - 8);
    expect(titan.statuses.rot).toBe(4);
    resolveMove(env, titan, 'grind');
    expect(titan.block).toBe(0);
    expect(computeIntent(state, titan, 'clamp')).toMatchObject({ damage: 6, hits: 1 });
  });

  it('all three named custom functions have been exercised by move tests', () => {
    expect(ACT1_ENEMIES.flatMap((e) => Object.keys(e.custom ?? {}))).toEqual(['pollinate', 'dewdrop', 'rally_howl']);
    expect(ACT1_ENEMIES.flatMap((e) => Object.keys(e.amounts ?? {}))).toEqual([]);
    expect(ACT1_ENEMIES.flatMap((e) => Object.keys(e.conditions ?? {}))).toEqual([]);
  });
});
