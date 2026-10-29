import { describe, expect, it } from 'vitest';
import { deserialize, ENGINE_VERSION } from '../../src/engine/serialize.ts';
import { RNG_STREAMS } from '../../src/engine/rng.ts';
import { formatIntent, hpAfterHits } from '../../src/render/game/intents.ts';
import { layoutMap, scrollToShow, type MapNodeLike } from '../../src/render/game/mapLayout.ts';
import { battleScale, enemyCenters, HAND, handSlots, PLATE_W, timelineSlots, TIMELINE } from '../../src/render/game/handLayout.ts';
import { formatDamageDealt, summarizeRun, type SummaryFloor, type SummaryInput } from '../../src/render/game/summary.ts';

describe('intent formatting (GDD §2.9-2.11)', () => {
  it('single and multi hits', () => {
    expect(formatIntent({ kind: 'attack', damage: 6 }, 6).label).toBe('6');
    const m = formatIntent({ kind: 'attack', damage: 4, hits: 4 }, 4);
    expect([m.label, m.total, m.adjusted]).toEqual(['4×4', 16, false]);
  });
  it('shows Stagger / Exposed adjustments against the printed number', () => {
    expect(formatIntent({ kind: 'attack', damage: 1, hits: 4 }, 4).label).toBe('4×4 → 1×4');
    const ex = formatIntent({ kind: 'attack_debuff', damage: 7, hits: 3 }, 5);
    expect(ex.label).toBe('5×3 → 7×3');
    expect(ex.icon2).toBe('intent_debuff');
    expect(ex.adjusted).toBe(true);
  });
  it('unknown base shows the live number only', () => {
    expect(formatIntent({ kind: 'attack', damage: 9 }, null).label).toBe('9');
  });
  it('non-attacks and hidden forecasts', () => {
    expect(formatIntent({ kind: 'defend' }, null)).toMatchObject({ icon: 'intent_defend', label: '', isAttack: false });
    expect(formatIntent({ kind: 'unknown' }, null).label).toBe('?');
    expect(formatIntent({ kind: 'attack', damage: 30, hidden: true }, 30)).toMatchObject({ icon: 'unknown', label: '?' });
    expect(() => formatIntent({ kind: 'attack' }, null)).toThrow(/without damage/);
  });
});

describe('hand layout', () => {
  for (let n = 1; n <= 10; n++) {
    it(`${n} card(s) stay inside the hand area, in order, on integer pixels`, () => {
      const s = handSlots(n);
      expect(s).toHaveLength(n);
      for (let i = 0; i < n; i++) {
        const c = s[i];
        if (!c) throw new Error('slot');
        expect(Number.isInteger(c.x) && Number.isInteger(c.y)).toBe(true);
        expect(c.x).toBeGreaterThanOrEqual(HAND.left);
        expect(c.x + HAND.cardW).toBeLessThanOrEqual(HAND.right);
        if (i > 0) expect(c.x).toBeGreaterThan((s[i - 1] as { x: number }).x);
      }
      const first = s[0], last = s[n - 1];
      if (!first || !last) throw new Error('slot');
      expect(first.y).toBe(last.y); // symmetric arc
    });
  }
  it('rejects more than 10', () => { expect(() => handSlots(11)).toThrow(); });
  it('enemy centres are symmetric about the screen centre', () => {
    expect(enemyCenters(1, [128])).toEqual([320]);
    const two = enemyCenters(2, [128, 128]);
    expect(((two[0] as number) + (two[1] as number)) / 2).toBe(320);
    expect(enemyCenters(4, [128, 128, 128, 128]).every((x) => x - 64 >= 0 && x + 64 <= 640)).toBe(true);
  });
  it('battle scale: 2x while the line fits, 1x for crowded fights; slots never overlap', () => {
    expect(battleScale([64])).toBe(2);
    expect(battleScale([96, 64, 64])).toBe(2); // boss + 2 adds
    expect(battleScale([64, 64, 64, 64])).toBe(2);
    expect(battleScale([96, 64, 64, 64])).toBe(2); // boss + 3 adds: 192 + 3*128 + 3*8 = 600
    expect(battleScale([96, 96, 64, 64])).toBe(1); // 2*192 + 2*128 + 24 > 632
    expect(battleScale([64, 64, 64, 64, 64])).toBe(1);
    for (let n = 1; n <= 6; n++) {
      const art = Array.from({ length: n }, (_, i) => (i === 0 ? 96 : 64));
      const k = battleScale(art);
      const widths = art.map((w) => Math.max(w * k, PLATE_W));
      const cs = enemyCenters(n, widths);
      cs.forEach((c, i) => {
        const w = widths[i] as number;
        expect(c - w / 2).toBeGreaterThanOrEqual(0);
        expect(c + w / 2).toBeLessThanOrEqual(640);
        if (i > 0) expect(c - w / 2).toBeGreaterThanOrEqual((cs[i - 1] as number) + (widths[i - 1] as number) / 2);
      });
    }
  });
});

describe('timeline layout (GDD §2.8)', () => {
  it('columns by turns until resolution, seq order within a column', () => {
    const s = timelineSlots([
      { uid: 10, dueTurn: 4, seq: 2 }, { uid: 11, dueTurn: 2, seq: 1 }, { uid: 12, dueTurn: 2, seq: 0 }, { uid: 13, dueTurn: 9, seq: 3 },
    ], 1);
    const by = new Map(s.map((x) => [x.uid, x]));
    expect(by.get(12)?.col).toBe(0);
    expect(by.get(11)?.col).toBe(0);
    expect((by.get(12)?.x ?? 0) < (by.get(11)?.x ?? 0)).toBe(true);
    expect(by.get(10)?.col).toBe(2);
    expect(by.get(13)?.col).toBe(2); // clamped to +3
    expect(by.get(12)?.y).toBe(TIMELINE.y + TIMELINE.headerH);
  });
});

const grid = (): MapNodeLike[][] => {
  const rows: MapNodeLike[][] = [];
  for (let r = 0; r < 15; r++) rows.push([0, 3, 6].map((col) => ({ row: r, col, type: 'monster', edges: [col] })));
  rows.push([{ row: 15, col: 3, type: 'boss', edges: [] }]);
  return rows;
};

describe('map layout', () => {
  it('row 0 at the bottom, boss on top and centred, inside the panel', () => {
    const l = layoutMap(grid());
    const boss = l.at(15, 3), bottom = l.at(0, 0);
    expect(boss.y).toBeLessThan(bottom.y);
    expect(boss.x).toBe(150);
    for (const n of l.nodes) {
      expect(n.x).toBeGreaterThanOrEqual(0);
      expect(n.x).toBeLessThanOrEqual(300);
      expect(n.y).toBeLessThanOrEqual(l.height);
    }
    expect(() => l.at(3, 1)).toThrow();
  });
  it('scrollToShow keeps the focus in view and clamps', () => {
    expect(scrollToShow(0, 300, 200, 400)).toBe(140);
    expect(scrollToShow(140, 160, 200, 400)).toBe(120);
    expect(scrollToShow(0, 10, 200, 400)).toBe(0);
    expect(scrollToShow(0, 399, 200, 400)).toBe(200);
  });
});

describe('run summary', () => {
  const input: SummaryInput = {
    phase: 'defeat', classId: 'graft', seed: 'ABC', act: 1, floor: 7, hp: 0, maxHp: 70, gold: 12,
    deck: [{ id: 'lash', upgraded: false }, { id: 'lash', upgraded: false }, { id: 'seed_bite', upgraded: true, vars: { bloom: 4 } }],
    relics: [{ id: 'heartseed' }],
    floors: [
      { floor: 1, act: 1, room: 'monster', encounterId: 'enc_a', enemies: ['x'], turns: 4, damageTaken: 6, damageDealt: 30, shardsGained: 1, shardsSpent: 0 },
      { floor: 2, act: 1, room: 'rest', encounterId: null, enemies: [], turns: 0, damageTaken: 0, damageDealt: 0, shardsGained: 0, shardsSpent: 1 },
      { floor: 3, act: 1, room: 'elite', encounterId: 'enc_b', enemies: ['y'], turns: 5, damageTaken: 70, damageDealt: 41, shardsGained: 0, shardsSpent: 0 },
    ],
  };
  const names = {
    className: (id: string) => id.toUpperCase(), cardName: (id: string, u: boolean) => `${id}${u ? '+' : ''}`,
    relicName: (id: string) => id, encounterName: (id: string) => `E:${id}`,
  };
  it('totals the history and names the killer', () => {
    const s = summarizeRun(input, names);
    const row = (k: string) => s.rows.find((r) => r[0] === k)?.[1];
    expect(s.title).toBe('DEFEAT');
    expect(row('FELL TO')).toBe('E:enc_b');
    expect(row('TURNS')).toBe('9');
    expect(row('DAMAGE TAKEN')).toBe('76');
    expect(row('SHARDS')).toBe('+1 / -1');
    expect(row('DAMAGE DEALT')).toBe('71');
    expect(s.deck).toEqual(['2× lash', 'seed_bite+ ✿4']);
    expect(s.deckCards).toEqual([{ id: 'lash', upgraded: false, bloom: 0, count: 2 }, { id: 'seed_bite', upgraded: true, bloom: 4, count: 1 }]);
  });
  it('damage dealt: partial after a migrated (v1) save, n/a when nothing was tracked', () => {
    const f = input.floors;
    expect(formatDamageDealt([{ ...(f[0] as SummaryFloor), damageDealt: null }, ...f.slice(1)])).toBe('41+');
    expect(formatDamageDealt(f.map((x) => ({ ...x, damageDealt: null })))).toBe('n/a');
  });
  it('victory shows HP left', () => {
    expect(summarizeRun({ ...input, phase: 'victory', hp: 40 }, names).rows.find((r) => r[0] === 'HP LEFT')?.[1]).toBe('40/70');
  });
});

describe('save migration v1 -> v2 (renderer depends on mapPath / damageDealt)', () => {
  const v1 = () => ({
    version: 1, seed: 'S', classId: 'c', phase: 'map', floor: 2, act: 1, nextUid: 1,
    rng: Object.fromEntries(RNG_STREAMS.map((k) => [k, [1, 2, 3, 4]])),
    player: { hp: 1, maxHp: 1, gold: 0, potionSlots: 3, deck: [], relics: [], potions: [] },
    map: { rows: [] }, history: { floors: [{ floor: 0 }, { floor: 1 }] }, queue: [], counters: {},
    combat: null, reward: null, shop: null, event: null, rest: null, treasure: null, pendingChoice: null,
    mapPos: { row: 1, col: 3 }, startChoices: null, bossRelicChoices: null,
  });
  it('adds the known path (current node) and marks old floors untracked', () => {
    const s = deserialize(JSON.stringify(v1()));
    expect(s.version).toBe(ENGINE_VERSION);
    expect(s.mapPath).toEqual([{ row: 1, col: 3 }]);
    expect(s.history.floors.map((f) => f.damageDealt)).toEqual([null, null]);
  });
  it('a v2 save without mapPath is malformed', () => {
    const raw = { ...v1(), version: ENGINE_VERSION };
    expect(() => deserialize(JSON.stringify(raw))).toThrow(/mapPath/);
  });
});

describe('damage preview HP (targeting)', () => {
  it('Block soaks first, then Guard, across hits', () => {
    expect(hpAfterHits(30, 0, 0, [6])).toBe(24);
    expect(hpAfterHits(30, 5, 0, [6])).toBe(29);
    expect(hpAfterHits(30, 5, 4, [3, 3, 3, 3])).toBe(27); // 5 block + 4 guard absorb 9 of 12
    expect(hpAfterHits(4, 0, 0, [5, 5])).toBe(0);
  });
});
