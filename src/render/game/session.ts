/**
 * RunSession: the renderer's only door into the engine.
 *  - enables exactly what `game.legalActions()` lists (helpers below filter that list; nothing is
 *    ever synthesised),
 *  - `apply()` asserts legality, applies, re-reads `game.state` (apply swaps the object), and saves
 *    `game.save()` under the engine's SAVE_KEY after every apply (deleted on victory/defeat),
 */
import { actionKey, choiceStep, Game, parseSaveOrIncompatible, SAVE_KEY, type Action, type Difficulty, type GameEvent, type RunState } from '../../engine/index.ts';
import type { KeyValueStorage } from '../storage.ts';

type ActionOf<T extends Action['type']> = Extract<Action, { type: T }>;

export type SaveSlot = { kind: 'none' } | { kind: 'run'; session: RunSession } | { kind: 'incompatible'; reason: string };

/** What a player is told when an old save is discarded. */
export const INCOMPATIBLE_SAVE_TEXT = "This run was saved by an older version of Vibespire and can't be continued. Start a new run!";

export class RunSession {
  private game: Game;
  private readonly storage: KeyValueStorage;
  private legalCache: { state: RunState; actions: Action[]; keys: Set<string> } | null = null;
  /** Events produced by Game.newRun (starter relic pickups...). */
  readonly initialEvents: readonly GameEvent[];
  /** Listeners run after every apply with the events (HUD refresh, relic flashes, a11y). */
  private readonly listeners = new Set<(events: readonly GameEvent[]) => void>();

  private constructor(game: Game, storage: KeyValueStorage) {
    this.game = game;
    this.storage = storage;
    this.initialEvents = game.initialEvents;
  }

  static newRun(storage: KeyValueStorage, seed: string, classId: string, difficulty: Difficulty): RunSession {
    const s = new RunSession(Game.newRun(seed, classId, { difficulty }), storage);
    s.save();
    return s;
  }

  /**
   * The saved run, if any. `none`: no save (fresh install, or the last run ended). `incompatible`: the
   * save was written by another engine version or names content this build doesn't have (v1 saves
   * after the v2 redesign); it is deleted here and the caller tells the player. A corrupt save of this
   * version still throws.
   */
  static open(storage: KeyValueStorage): SaveSlot {
    const raw = storage.getRawOrNull(SAVE_KEY);
    if (raw === null) return { kind: 'none' };
    const r = parseSaveOrIncompatible(raw);
    if (!r.ok) {
      console.warn(`[run] discarding an incompatible save: ${r.reason}`);
      storage.remove(SAVE_KEY);
      return { kind: 'incompatible', reason: r.reason };
    }
    return { kind: 'run', session: new RunSession(new Game(r.state), storage) };
  }

  static hasSave(storage: KeyValueStorage): boolean { return storage.getRawOrNull(SAVE_KEY) !== null; }

  get state(): RunState { return this.game.state; }

  onApplied(fn: (events: readonly GameEvent[]) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  legal(): readonly Action[] {
    const st = this.game.state;
    if (!this.legalCache || this.legalCache.state !== st) {
      const actions = this.game.legalActions();
      this.legalCache = { state: st, actions, keys: new Set(actions.map(actionKey)) };
    }
    return this.legalCache.actions;
  }

  isLegal(a: Action): boolean {
    this.legal();
    return (this.legalCache as { keys: Set<string> }).keys.has(actionKey(a));
  }

  /** All legal actions of one type. */
  legalOf<T extends Action['type']>(type: T): ActionOf<T>[] {
    return this.legal().filter((a): a is ActionOf<T> => a.type === type);
  }

  /** The first legal action matching `pred`, or null when none is legal (callers grey the control out). */
  findOrNull<T extends Action['type']>(type: T, pred: (a: ActionOf<T>) => boolean = () => true): ActionOf<T> | null {
    return this.legalOf(type).find(pred) ?? null;
  }

  apply(a: Action): GameEvent[] {
    if (!this.isLegal(a)) throw new Error(`RunSession.apply: ${actionKey(a)} is not legal in phase '${this.state.phase}'`);
    const events = this.game.apply(a);
    this.save();
    for (const fn of this.listeners) fn(events);
    return events;
  }

  /**
   * Answer the pending choice with `uids`: for a multi-pick choice, apply the choice_toggle steps that
   * make the engine's selection equal `uids` (they change nothing on screen), and return the confirming
   * resolve_choice for the caller to apply through its normal path (act / perform), so the screen
   * animates and refreshes as for any answer.
   */
  answerChoice(uids: readonly number[]): Extract<Action, { type: 'resolve_choice' }> {
    for (let i = 0; i <= uids.length * 2 + 1; i++) {
      const pc = this.state.combat?.pendingChoice ?? this.state.pendingChoice;
      if (!pc) throw new Error('answerChoice: no pending choice');
      const step = choiceStep(pc, uids);
      if (step.type === 'resolve_choice') return step;
      this.apply(step);
    }
    throw new Error(`answerChoice: [${uids.join(', ')}] not reached`);
  }

  private save(): void {
    const p = this.game.state.phase;
    if (p === 'victory' || p === 'defeat') this.storage.remove(SAVE_KEY);
    else this.storage.setRaw(SAVE_KEY, this.game.save());
  }

  /** Abandon the run: delete the save. */
  abandon(): void { this.storage.remove(SAVE_KEY); }
}
