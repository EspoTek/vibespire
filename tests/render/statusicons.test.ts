// Every visible status (player powers, debuffs, enemy passives, from every registered pack) has a
// dedicated, distinct 12x12 icon in the iconArt style. Hidden statuses never show an icon.
import { describe, expect, it } from 'vitest';
import { allStatuses } from '../../src/content';
import { ICON_KEYS, ICONS } from '../../src/render/ui/iconArt.ts';
import { STATUS_ICON_ART } from '../../src/render/ui/statusIconArt.ts';

describe('status icons', () => {
  it('every visible status has a dedicated icon', () => {
    const missing = allStatuses().filter((s) => !s.hidden && !Object.prototype.hasOwnProperty.call(ICONS, s.id)).map((s) => `${s.id} (${s.name})`);
    expect(missing, 'add a 12x12 icon to src/render/ui/statusIconArt.ts').toEqual([]);
  });

  it('status icons are 12x12, use palette keys, have a black outline, and are all different', () => {
    const seen = new Map<string, string>();
    for (const s of allStatuses().filter((x) => !x.hidden)) {
      const rows = ICONS[s.id];
      if (!rows) throw new Error(`no icon ${s.id}`);
      expect(rows.length, s.id).toBe(12);
      for (const r of rows) {
        expect(r.length, `${s.id}: "${r}"`).toBe(12);
        for (const ch of r) if (ch !== '.') expect(ICON_KEYS[ch], `${s.id}: key ${ch}`).toBeDefined();
      }
      const ink = rows.join('');
      expect(ink.includes('k'), `${s.id} has no black outline`).toBe(true);
      expect(ink.replace(/\./g, '').length, `${s.id} is nearly empty`).toBeGreaterThan(20);
      const dup = seen.get(ink);
      expect(dup, `${s.id} reuses ${dup ?? ''}'s art`).toBeUndefined();
      seen.set(ink, s.id);
    }
  });

  it('hand-authored status art does not shadow another icon', () => {
    for (const id of Object.keys(STATUS_ICON_ART)) expect(ICONS[id]).toBe(STATUS_ICON_ART[id]);
  });
});
