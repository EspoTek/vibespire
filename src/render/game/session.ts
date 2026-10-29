/**
 * RunSession: the renderer's only door into the engine.
 *  - enables exactly what `game.legalActions()` lists (helpers below filter that list; nothing is
 *    ever synthesised),
 *  - `apply()` asserts legality, applies, re-reads `game.state` (apply swaps the object), and saves
 *    `game.save()` under the engine's SAVE_KEY after every apply (deleted on victory/defeat),
 */
import { actionKey, Game, SAVE_KEY, type Action, type GameEvent, type RunState } from '../../engine/index.ts';
import type { KeyValueStorage } from '../storage.ts';

type ActionOf<T extends Action['type']> = Extract<Action, { type: T }>;

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

  static newRun(storage: KeyValueStorage, seed: string, classId: string): RunSession {
    const s = new RunSession(Game.newRun(seed, classId), storage);
    s.save();
    return s;
  }

  /** null = no save (expected: fresh install or the last run ended). A corrupt save throws. */
  static loadOrNull(storage: KeyValueStorage): RunSession | null {
    const raw = storage.getRawOrNull(SAVE_KEY);
    if (raw === null) return null;
    return new RunSession(Game.load(raw), storage);
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

  private save(): void {
    const p = this.game.state.phase;
    if (p === 'victory' || p === 'defeat') this.storage.remove(SAVE_KEY);
    else this.storage.setRaw(SAVE_KEY, this.game.save());
  }

  /** Abandon the run: delete the save. */
  abandon(): void { this.storage.remove(SAVE_KEY); }
}
