// Enemies: spawning, minions, transform, intents and the Augury forecast (GDD §2.9, ENEMIES §0.6/§5).
//
// PURITY CONTRACT: EnemyDef.chooseMove(ctx) sees only EnemyAiCtx (its own frozen snapshot, rng,
// history, forTurn, aiState and which allies are alive). The forecast calls chooseMove on a CLONE
// of the enemy's rng with history + [current intent] (and +1 per further step), so the forecast is
// exactly what the enemy will choose unless enemy-side state changes. It is recomputed after every
// action (refreshIntents) and whenever an intent is (re)chosen.

import { getEnemyDef } from '../content';
import { emit, getEnemy, livingEnemies, requireCombat, stacksOf, type Env } from './core';
import { makeEffectCtx } from './ctx';
import { computeDamage, FLEE_MOVE } from './damage';
import { amountCtx, resolveAmount } from './effects';
import { deriveState, nextInt, nextU32, singleRng } from './rng';
import { applyStatus, dispatch, playerRule } from './statuses';
import { TUNING } from './tuning';
import type { CombatState, EffectFrame, EnemyAiCtx, EnemyId, EnemyState, Intent, RngState, RunState } from './types';

export const STATUS_HALTED = 'halted';

const ATTACK_KINDS: ReadonlySet<string> = new Set(['attack', 'attack_defend', 'attack_buff', 'attack_debuff']);

export function isAttackIntent(intent: Intent): boolean {
  return ATTACK_KINDS.has(intent.kind);
}

/** The round whose enemy phase comes next. */
export function nextEnemyRound(combat: CombatState): number {
  return combat.turnPhase === 'player' ? Math.max(1, combat.turn) : combat.turn + 1;
}

function deepFreeze<T>(v: T): T {
  if (v !== null && typeof v === 'object') {
    for (const k of Object.keys(v)) deepFreeze((v as Record<string, unknown>)[k]);
    Object.freeze(v);
  }
  return v;
}

export function aiCtx(combat: CombatState, e: EnemyState, rng: RngState, history: readonly string[], forTurn: number): EnemyAiCtx {
  const snapshot = deepFreeze(structuredClone(e));
  const allies = deepFreeze(livingEnemies(combat).filter((x) => x.uid !== e.uid).map((x) => ({ uid: x.uid, id: x.id })));
  const hist = deepFreeze([...history]);
  return {
    self: snapshot,
    forTurn,
    turn: forTurn,
    history: hist,
    aiState: snapshot.aiState,
    allies,
    rng: singleRng(rng),
    lastMove: () => hist[hist.length - 1] ?? null,
    timesInARow: (moveId) => {
      let n = 0;
      for (let i = hist.length - 1; i >= 0 && hist[i] === moveId; i--) n++;
      return n;
    },
    alliesAlive: (id) => allies.filter((a) => id === undefined || a.id === id).length,
  };
}

function choose(combat: CombatState, e: EnemyState, rng: RngState, history: readonly string[], forTurn: number): string {
  const def = getEnemyDef(e.id);
  const moveId = def.chooseMove(aiCtx(combat, e, rng, history, forTurn));
  if (!def.moves[moveId]) throw new Error(`enemy ${e.id}.chooseMove returned unknown move '${moveId}'`);
  return moveId;
}

/** Choose the enemy's next intent (consumes its AI rng), then recompute its forecast. */
export function chooseNextMove(env: Env, e: EnemyState, forTurn: number): void {
  const c = requireCombat(env.state, 'chooseNextMove');
  const moveId = choose(c, e, e.rng, e.moveHistory, forTurn);
  e.intent = computeIntent(env.state, e, moveId);
  e.intentTurn = forTurn;
  emit(env, { t: 'enemy_intent', uid: e.uid, intent: { ...e.intent } });
  updateForecast(env, e);
}

/** Replace an enemy's current intent (HookCtx.setIntent). */
export function setEnemyIntent(env: Env, uid: number, moveId: string): void {
  const c = requireCombat(env.state, 'setIntent');
  const e = getEnemy(c, uid);
  if (!e.alive) throw new Error(`setIntent: enemy ${uid} is not alive`);
  if (!getEnemyDef(e.id).moves[moveId]) throw new Error(`setIntent: enemy ${e.id} has no move '${moveId}'`);
  e.intent = computeIntent(env.state, e, moveId);
  emit(env, { t: 'enemy_intent', uid: e.uid, intent: { ...e.intent } });
  updateForecast(env, e);
}

function enemyFrame(e: EnemyState, moveId: string): EffectFrame {
  return { src: { kind: 'enemy', uid: e.uid, id: e.id, moveId }, self: e.uid, target: 'player', x: 0 };
}

/** Intent for a move; damage per hit and hits are computed with all current modifiers (preview). */
export function computeIntent(state: RunState, e: EnemyState, moveId: string): Intent {
  const move = getEnemyDef(e.id).moves[moveId];
  if (!move) throw new Error(`enemy ${e.id} has no move '${moveId}'`);
  const intent: Intent = { kind: move.intent, moveId };
  const dmg = move.effects.find((x) => x.type === 'damage');
  if (dmg && dmg.type === 'damage') {
    const ctx = amountCtx(state, enemyFrame(e, moveId), true);
    const base = resolveAmount(ctx, dmg.amount);
    intent.damage = computeDamage(state, { source: e.uid, target: 'player', card: null, tags: dmg.tags ?? [] }, base, true);
    intent.hits = dmg.times === undefined ? 1 : resolveAmount(ctx, dmg.times);
  }
  return intent;
}

export function forecastDepth(state: RunState): number {
  let depth = TUNING.augury.depth;
  if ((state.player.counters.forecast_depth_3_rest_of_act ?? 0) > 0) depth = Math.max(depth, 3);
  return playerRule(state, depth, (m, c, a) => (m.forecastDepth ? m.forecastDepth(c, a) : a));
}

export function computeForecast(state: RunState, e: EnemyState): Intent[] {
  const c = requireCombat(state, 'computeForecast');
  const n = forecastDepth(state) - 1;
  if (n <= 0 || !e.alive || e.intent.moveId === '' || e.intent.moveId === FLEE_MOVE) return [];
  const def = getEnemyDef(e.id);
  const rng: RngState = [...e.rng];
  const halted = stacksOf(state, e.uid, STATUS_HALTED) > 0;
  const history = halted ? [...e.moveHistory] : [...e.moveHistory, e.intent.moveId];
  const out: Intent[] = [];
  for (let k = 1; k <= n; k++) {
    const moveId = choose(c, e, rng, history, e.intentTurn + k);
    const move = def.moves[moveId];
    if (!move) throw new Error(`enemy ${e.id} has no move '${moveId}'`);
    out.push(move.augury === 'hidden' ? { kind: 'unknown', moveId: '', hidden: true } : computeIntent(state, e, moveId));
    history.push(moveId);
  }
  return out;
}

function updateForecast(env: Env, e: EnemyState): void {
  const next = computeForecast(env.state, e);
  if (JSON.stringify(next) !== JSON.stringify(e.forecast)) {
    e.forecast = next;
    emit(env, { t: 'enemy_forecast', uid: e.uid, forecast: next.map((i) => ({ ...i })) });
  }
}

/** Re-compute every living enemy's intent numbers and forecast; emits events for those that changed. */
export function refreshIntents(env: Env): void {
  const c = env.state.combat;
  if (!c || env.state.phase !== 'combat') return;
  for (const e of livingEnemies(c)) {
    if (e.intent.moveId !== '' && e.intent.moveId !== FLEE_MOVE) {
      const next = computeIntent(env.state, e, e.intent.moveId);
      if (next.damage !== e.intent.damage || next.hits !== e.intent.hits || next.kind !== e.intent.kind) {
        e.intent = next;
        emit(env, { t: 'enemy_intent', uid: e.uid, intent: { ...next } });
      }
    }
    updateForecast(env, e);
  }
}

// ---------------------------------------------------------------------------
// Spawning

export interface SpawnOpts {
  leaderUid: number | null;
  withLeader: 'die' | 'flee' | null;
}

/** Balance lever: TUNING.enemyHpPct[act] (default 100) scales every rolled enemy HP, minimum 1. */
function scaledEnemyHp(s: RunState, hp: number): number {
  return Math.max(1, Math.round((hp * TUNING.enemyHpPct[s.act]) / 100));
}

/** Create an enemy (hp from the 'enemy' stream, own AI stream derived from it) and apply spawnStatuses. */
export function spawnEnemy(env: Env, combat: CombatState, id: EnemyId, o: SpawnOpts): EnemyState {
  const s = env.state;
  const def = getEnemyDef(id);
  const hp = scaledEnemyHp(s, nextInt(s.rng.enemy, def.hp[0], def.hp[1]));
  const e: EnemyState = {
    uid: combat.nextEnemyUid,
    id,
    hp,
    maxHp: hp,
    block: 0,
    guard: 0,
    statuses: {},
    intent: { kind: 'unknown', moveId: '' },
    intentTurn: 0,
    forecast: [],
    moveHistory: [],
    aiState: {},
    alive: true,
    fled: false,
    leaderUid: o.leaderUid,
    withLeader: o.withLeader ?? def.onLeaderDeath ?? null,
    rng: deriveState(s.rng.enemy),
  };
  combat.nextEnemyUid += 1;
  combat.enemies.push(e);
  emit(env, { t: 'enemy_spawned', uid: e.uid, enemyId: id });
  for (const [sid, n] of Object.entries(def.spawnStatuses ?? {})) applyStatus(env, e.uid, sid, n);
  return e;
}

export function runOnSpawn(env: Env, e: EnemyState): void {
  const def = getEnemyDef(e.id);
  if (def.onSpawn) def.onSpawn(enemyHookCtx(env, e));
  dispatch(env, 'onEnemySpawn', 'player', { uid: e.uid }, e.uid);
}

function enemyHookCtx(env: Env, e: EnemyState): ReturnType<typeof makeEffectCtx> {
  return makeEffectCtx(env, { source: { kind: 'enemy', uid: e.uid, id: e.id, moveId: null }, owner: e.uid, stacks: 0, relic: null, target: 'player', card: null, x: 0 });
}

/** summon effect: minions led by `leader`, appended (they act from the next enemy phase). */
export function summon(env: Env, leader: number, spec: { enemy: EnemyId; n?: number; fillTo?: number; cap?: number; withLeader?: 'die' | 'flee' }): void {
  const c = requireCombat(env.state, 'summon');
  getEnemyDef(spec.enemy);
  const minions = () => c.enemies.filter((m) => m.alive && m.leaderUid === leader);
  let n = spec.n ?? 1;
  if (spec.fillTo !== undefined) n = Math.max(0, spec.fillTo - minions().filter((m) => m.id === spec.enemy).length);
  if (spec.cap !== undefined) n = Math.min(n, Math.max(0, spec.cap - minions().length));
  for (let i = 0; i < n; i++) {
    const e = spawnEnemy(env, c, spec.enemy, { leaderUid: leader, withLeader: spec.withLeader ?? null });
    chooseNextMove(env, e, nextEnemyRound(c));
    runOnSpawn(env, e);
  }
}

/** transform effect: same uid/position, the new form at full HP (own AI stream), new intent. */
export function transformEnemy(env: Env, uid: number, into: EnemyId): void {
  const c = requireCombat(env.state, 'transform');
  const e = getEnemy(c, uid);
  if (!e.alive) return;
  const def = getEnemyDef(into);
  const from = e.id;
  e.id = into;
  e.hp = e.maxHp = scaledEnemyHp(env.state, nextInt(e.rng, def.hp[0], def.hp[1]));
  e.moveHistory = [];
  e.aiState = {};
  emit(env, { t: 'enemy_transformed', uid, from, to: into });
  for (const [sid, n] of Object.entries(def.spawnStatuses ?? {})) applyStatus(env, uid, sid, n);
  chooseNextMove(env, e, nextEnemyRound(c));
}

/** reroll_forecast: advance each target's AI rng by one draw, then recompute forecasts. */
export function rerollForecasts(env: Env, self: number, target: 'other_enemies' | 'all_enemies'): void {
  const c = requireCombat(env.state, 'reroll_forecast');
  for (const e of livingEnemies(c)) {
    if (target === 'other_enemies' && e.uid === self) continue;
    nextU32(e.rng);
    updateForecast(env, e);
  }
}

/** halt_enemy (RULINGS 8): bosses are immune. */
export function haltEnemy(env: Env, uid: number): void {
  const c = requireCombat(env.state, 'halt_enemy');
  const e = getEnemy(c, uid);
  if (!e.alive) return;
  if (getEnemyDef(e.id).boss === true) {
    emit(env, { t: 'text', text: 'Immune to Halt.' });
    return;
  }
  applyStatus(env, uid, STATUS_HALTED, 1);
  updateForecast(env, e);
}

/** For previews of the 'triggered_riposte' scale: will this enemy's current attack fire a primed card? */
export function riposteWillTrigger(state: RunState, uid: number): boolean {
  const c = requireCombat(state, 'riposteWillTrigger');
  let charges = c.primed.reduce((a, p) => a + p.charges, 0);
  for (const e of livingEnemies(c)) {
    if (!isAttackIntent(e.intent) || stacksOf(state, e.uid, STATUS_HALTED) > 0) continue;
    if (charges <= 0) return false;
    if (e.uid === uid) return true;
    charges -= 1;
  }
  return false;
}
