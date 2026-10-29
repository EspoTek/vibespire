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
    expect(s.set({ version: 2, volume: 0.5, musicVolume: 0.3, animSpeed: 2 })).toBe(true);
    expect(s.getOrNull()).toEqual({ version: 2, volume: 0.5, musicVolume: 0.3, animSpeed: 2 });
  });

  it('v1 settings (before music) migrate to the default music volume; v2 without it is invalid', () => {
    const fake = new FakeStorage();
    const s = new Stored(new KeyValueStorage(fake), 'k', settingsCodec);
    fake.map.set('k', JSON.stringify({ version: 1, volume: 0.7, animSpeed: 1 }));
    expect(s.getOrNull()).toEqual({ version: 2, volume: 0.7, musicVolume: DEFAULT_MUSIC_VOLUME, animSpeed: 1 });
    fake.map.set('k', JSON.stringify({ version: 2, volume: 0.7, animSpeed: 1 }));
    expect(() => s.getOrNull()).toThrow(/musicVolume/);
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
    fake.map.set('k', JSON.stringify({ version: 3, volume: 1, animSpeed: 1 }));
    expect(() => s.getOrNull()).toThrow(/unsupported version/);
    fake.map.set('k', JSON.stringify({ version: 1, volume: 3, animSpeed: 1 }));
    expect(() => s.getOrNull()).toThrow(/volume/);
  });
});
