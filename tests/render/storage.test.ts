import { describe, expect, it } from 'vitest';
import { DEFAULT_MUSIC_VOLUME, KeyValueStorage, settingsCodec, Stored, type StorageLike } from '../../src/render/storage.ts';

class FakeStorage implements StorageLike {
  readonly map = new Map<string, string>();
  failWith: DOMException | Error | null = null;
  getItem(k: string): string | null { if (this.failWith) throw this.failWith; return this.map.get(k) ?? null; }
  setItem(k: string, v: string): void { if (this.failWith) throw this.failWith; this.map.set(k, v); }
  removeItem(k: string): void { if (this.failWith) throw this.failWith; this.map.delete(k); }
}

describe('KeyValueStorage / Stored', () => {
  it('round-trips typed values; absent = null', () => {
    const kv = new KeyValueStorage(new FakeStorage());
    const s = new Stored(kv, 'k', settingsCodec);
    expect(s.getOrNull()).toBeNull();
    expect(s.set({ version: 3, volume: 0.5, musicVolume: 0.3, animSpeed: 2, shake: 1, flashes: false })).toBe(true);
    expect(s.getOrNull()).toEqual({ version: 3, volume: 0.5, musicVolume: 0.3, animSpeed: 2, shake: 1, flashes: false });
  });

  it('v1 settings (before music) and v2 (before shake/flash options) migrate to the defaults; missing fields of the current version are invalid', () => {
    const fake = new FakeStorage();
    const s = new Stored(new KeyValueStorage(fake), 'k', settingsCodec);
    fake.map.set('k', JSON.stringify({ version: 1, volume: 0.7, animSpeed: 1 }));
    expect(s.getOrNull()).toEqual({ version: 3, volume: 0.7, musicVolume: DEFAULT_MUSIC_VOLUME, animSpeed: 1, shake: 2, flashes: true });
    fake.map.set('k', JSON.stringify({ version: 2, volume: 0.7, animSpeed: 1 }));
    expect(() => s.getOrNull()).toThrow(/musicVolume/);
    fake.map.set('k', JSON.stringify({ version: 2, volume: 0.7, musicVolume: 0.2, animSpeed: 1 }));
    expect(s.getOrNull()).toEqual({ version: 3, volume: 0.7, musicVolume: 0.2, animSpeed: 1, shake: 2, flashes: true });
    fake.map.set('k', JSON.stringify({ version: 3, volume: 0.7, musicVolume: 0.2, animSpeed: 1, flashes: true }));
    expect(() => s.getOrNull()).toThrow(/shake/);
  });

  it('quota errors refuse the write and are reported once', () => {
    const fake = new FakeStorage();
    const kv = new KeyValueStorage(fake);
    const reports: string[] = [];
    kv.onProblem = (k) => reports.push(k);
    fake.failWith = new DOMException('full', 'QuotaExceededError');
    expect(kv.setRaw('a', '1')).toBe(false);
    expect(kv.setRaw('a', '2')).toBe(false);
    expect(reports).toEqual(['quota']);
  });

  it('security errors fall back to memory for the session', () => {
    const fake = new FakeStorage();
    const kv = new KeyValueStorage(fake);
    const reports: string[] = [];
    kv.onProblem = (k) => reports.push(k);
    fake.failWith = new DOMException('denied', 'SecurityError');
    expect(kv.setRaw('a', '1')).toBe(true);
    expect(kv.getRawOrNull('a')).toBe('1');
    expect(reports).toEqual(['unavailable']);
  });

  it('re-throws anything that is not a quota/security error', () => {
    const fake = new FakeStorage();
    const kv = new KeyValueStorage(fake);
    fake.failWith = new TypeError('bug');
    expect(() => kv.getRawOrNull('a')).toThrow('bug');
    fake.failWith = new DOMException('weird', 'InvalidStateError');
    expect(() => kv.setRaw('a', '1')).toThrow('weird');
  });

  it('corrupt JSON and codec failures throw instead of resetting', () => {
    const fake = new FakeStorage();
    const kv = new KeyValueStorage(fake);
    const s = new Stored(kv, 'k', settingsCodec);
    fake.map.set('k', '{nope');
    expect(() => s.getOrNull()).toThrow(/invalid JSON/);
    fake.map.set('k', JSON.stringify({ version: 4, volume: 1, animSpeed: 1 }));
    expect(() => s.getOrNull()).toThrow(/unsupported version/);
    fake.map.set('k', JSON.stringify({ version: 1, volume: 3, animSpeed: 1 }));
    expect(() => s.getOrNull()).toThrow(/volume/);
  });
});
