// Game: the only entry point that changes a run. A pure, deterministic state machine:
// `apply(action)` validates against `legalActions()` (exact), mutates a copy of the state,
// drains the effect queue and returns the ordered events.

import { usePotion, potionActions, runLegalActions, applyRunAction, createRun } from './run';
import { combatLegalActions, endTurn, playCard, refreshIntents } from './combat';
import { makeEnv, queueHost, type Env } from './core';
import { syncFloorRecord } from './history';
import { drain, resolveChoice } from './queue';
import { deserialize, serialize } from './serialize';
import type { Action, GameEvent, RunState } from './types';

export class IllegalActionError extends Error {
  readonly action: Action;
  constructor(action: Action, phase: string) {
    super(`illegal action ${actionKey(action)} in phase '${phase}'`);
    this.name = 'IllegalActionError';
    this.action = action;
  }
}

export interface GameOptions {
  /**
   * Copy the state before applying so a throwing action leaves `state` untouched (default true).
   * The simulator turns this off for speed.
   */
  atomic?: boolean;
}

export class Game {
  state: RunState;
  private readonly atomic: boolean;
  /** Events produced while creating the run (starting relic pickups etc.). */
  readonly initialEvents: GameEvent[];

  constructor(state: RunState, opts: GameOptions = {}, initialEvents: GameEvent[] = []) {
    this.state = state;
    this.atomic = opts.atomic ?? true;
    this.initialEvents = initialEvents;
  }

  static newRun(seed: string, classId: string, opts: GameOptions = {}): Game {
    const { state, events } = createRun(seed, classId);
    return new Game(state, opts, events);
  }

  static load(json: string, opts: GameOptions = {}): Game {
    return new Game(deserialize(json), opts);
  }

  save(): string {
    return serialize(this.state);
  }

  legalActions(): Action[] {
    return legalActions(this.state);
  }

  isLegal(action: Action): boolean {
    const key = actionKey(action);
    return this.legalActions().some((a) => actionKey(a) === key);
  }

  apply(action: Action): GameEvent[] {
    if (!this.isLegal(action)) throw new IllegalActionError(action, this.state.phase);
    const state = this.atomic ? structuredClone(this.state) : this.state;
    const env = makeEnv(state);
    handleAction(env, action);
    drain(env);
    settle(env);
    this.state = state;
    return env.events;
  }
}

export function legalActions(state: RunState): Action[] {
  if (state.phase === 'combat') {
    const combat = state.combat;
    if (!combat) throw new Error('combat phase without combat state');
    const actions = combatLegalActions(state);
    if (combat.pendingChoice || combat.outcome !== null) return actions;
    return [...actions, ...potionActions(state)];
  }
  return runLegalActions(state);
}

function handleAction(env: Env, a: Action): void {
  switch (a.type) {
    case 'resolve_choice':
      resolveChoice(env, a.uids);
      return;
    case 'use_potion':
      usePotion(env, a.index, a.target ?? null);
      return;
    case 'play_card':
      playCard(env, a.uid, a.target ?? null);
      return;
    case 'end_turn':
      endTurn(env);
      return;
    default:
      applyRunAction(env, a);
  }
}

function settle(env: Env): void {
  const s = env.state;
  refreshIntents(env);
  syncFloorRecord(s);
  if (s.phase === 'victory' || s.phase === 'defeat') return;
  const host = queueHost(s);
  if (!host.pendingChoice && host.queue.length > 0) throw new Error('effect queue not empty after apply');
}

/** Canonical string for an action (sorted keys, undefined dropped) used for legality checks. */
export function actionKey(a: Action): string {
  return JSON.stringify(canonical(a));
}

function canonical(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonical);
  if (v !== null && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v).sort()) {
      const val: unknown = (v as Record<string, unknown>)[k];
      if (val !== undefined) out[k] = canonical(val);
    }
    return out;
  }
  return v;
}
