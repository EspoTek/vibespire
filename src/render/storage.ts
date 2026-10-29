/**
 * Typed localStorage wrapper.
 *
 * Error policy: try/catch wraps ONLY the Storage access itself, and only two failure kinds are
 * handled, because they are environmental rather than bugs:
 *  - 'unavailable': SecurityError (storage disabled, sandboxed iframe, some private modes). The store
 *    falls back to an in-memory map for this session so the game still runs; saves won't persist.
 *  - 'quota': QuotaExceededError on write. The write is not performed.
 * Both are reported once per kind through `onProblem` (the app shows a toast) and as console.warn.
 * Anything else is re-thrown. Corrupt JSON or a value that fails its codec throws (a loud failure
 * beats silently resetting someone's run).
 */

export type StorageProblem = 'unavailable' | 'quota';

/** Validates/decodes a parsed JSON value into T; must throw on anything malformed. */
export type Codec<T> = (raw: unknown, key: string) => T;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function errorKind(e: unknown): StorageProblem | null {
  if (!(e instanceof DOMException)) return null;
  if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') return 'quota';
  if (e.name === 'SecurityError') return 'unavailable';
  return null;
}

export class KeyValueStorage {
  private backend: StorageLike | null;
  private readonly memory = new Map<string, string>();
  private readonly reported = new Set<StorageProblem>();
  onProblem: ((kind: StorageProblem, error: DOMException) => void) | null = null;

  /** `backend` defaults to window.localStorage, resolved lazily (accessing it can itself throw). */
  constructor(backend?: StorageLike) {
    this.backend = backend ?? null;
  }

  private store(): StorageLike | null {
    if (this.backend) return this.backend;
    let ls: StorageLike;
    try {
      ls = globalThis.localStorage;
    } catch (e) {
      this.handle(e);
      return null;
    }
    this.backend = ls;
    return ls;
  }

  private handle(e: unknown): StorageProblem {
    const kind = errorKind(e);
    if (kind === null) throw e;
    if (!this.reported.has(kind)) {
      this.reported.add(kind);
      console.warn(`[storage] ${kind}: ${(e as DOMException).name}: ${(e as DOMException).message}`);
      this.onProblem?.(kind, e as DOMException);
    }
    return kind;
  }

  /** Raw string or null when the key is absent (null is the documented "no value" outcome). */
  getRawOrNull(key: string): string | null {
    const s = this.store();
    if (!s) return this.memory.get(key) ?? null; // memory fallback: absent = null
    try {
      return s.getItem(key);
    } catch (e) {
      this.handle(e);
      return this.memory.get(key) ?? null;
    }
  }

  /** Returns false if the write was refused (quota / unavailable), true otherwise. */
  setRaw(key: string, value: string): boolean {
    const s = this.store();
    if (!s) { this.memory.set(key, value); return true; }
    try {
      s.setItem(key, value);
      return true;
    } catch (e) {
      const kind = this.handle(e);
      if (kind === 'unavailable') { this.memory.set(key, value); return true; }
      return false;
    }
  }

  remove(key: string): void {
    this.memory.delete(key);
    const s = this.store();
    if (!s) return;
    try {
      s.removeItem(key);
    } catch (e) {
      this.handle(e);
    }
  }
}

/** One typed value under one key. */
export class Stored<T> {
  readonly key: string;
  private readonly kv: KeyValueStorage;
  private readonly codec: Codec<T>;

  constructor(kv: KeyValueStorage, key: string, codec: Codec<T>) {
    this.kv = kv;
    this.key = key;
    this.codec = codec;
  }

  /** The stored value, or null if nothing is stored. Corrupt JSON / codec failures throw. */
  getOrNull(): T | null {
    const raw = this.kv.getRawOrNull(this.key);
    if (raw === null) return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      throw new Error(`storage: "${this.key}" holds invalid JSON`, { cause: e });
    }
    return this.codec(parsed, this.key);
  }

  has(): boolean { return this.kv.getRawOrNull(this.key) !== null; }

  /** False if the browser refused the write (quota). */
  set(value: T): boolean { return this.kv.setRaw(this.key, JSON.stringify(value)); }

  remove(): void { this.kv.remove(this.key); }
}

// ------------------------------------------------------------------ renderer-owned keys

export interface Settings {
  version: 2;
  /** Master SFX volume 0..1. */
  volume: number;
  /** Music volume 0..1 (separate from SFX). */
  musicVolume: number;
  /** Animation speed multiplier (1 = normal). */
  animSpeed: number;
}

/** Music default for new players and for v1 settings (saved before music existed). */
export const DEFAULT_MUSIC_VOLUME = 0.4;

export const DEFAULT_SETTINGS: Settings = { version: 2, volume: 0.6, musicVolume: DEFAULT_MUSIC_VOLUME, animSpeed: 1 };

export const settingsCodec: Codec<Settings> = (raw, key) => {
  if (typeof raw !== 'object' || raw === null) throw new Error(`storage: "${key}" is not an object`);
  const r = raw as Record<string, unknown>;
  if (r['version'] !== 1 && r['version'] !== 2) throw new Error(`storage: "${key}" has unsupported version ${String(r['version'])}`);
  const volume = r['volume'], animSpeed = r['animSpeed'];
  // v1 had no music setting: migrate to the default; v2 must carry it
  const musicVolume = r['version'] === 1 ? DEFAULT_MUSIC_VOLUME : r['musicVolume'];
  if (typeof volume !== 'number' || volume < 0 || volume > 1) throw new Error(`storage: "${key}".volume invalid: ${String(volume)}`);
  if (typeof musicVolume !== 'number' || musicVolume < 0 || musicVolume > 1) throw new Error(`storage: "${key}".musicVolume invalid: ${String(musicVolume)}`);
  if (typeof animSpeed !== 'number' || !(animSpeed > 0)) throw new Error(`storage: "${key}".animSpeed invalid: ${String(animSpeed)}`);
  return { version: 2, volume, musicVolume, animSpeed };
};

export const SETTINGS_KEY = 'vibespire.settings.v1';
/** The engine's run save key (ENGINE_SPEC §11); the renderer only checks for its presence in phase 1. */
export const RUN_SAVE_KEY = 'vibespire.run';
