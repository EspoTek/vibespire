// Conveyance polish: one-time tip flags (storage), Ripe clause greying, end-of-turn tags.
import { describe, expect, it } from 'vitest';
import { KeyValueStorage, type StorageLike } from '../../src/render/storage.ts';
import { TIP_IDS, TIP_MARGIN, tipHits, tipPosition, tipsCodec, TipsStore, tipText, TIPS_KEY } from '../../src/render/game/tips.ts';
import { rect, type Rect } from '../../src/render/layout.ts';
import { partsToMarkup } from '../../src/render/game/view.ts';
import { endOfTurnTag } from '../../src/render/game/explain.ts';
import { allCards } from '../../src/content';
import { FONT_4X6, layoutText } from '../../src/render/textLayout.ts';
import type { TextPart } from '../../src/engine/index.ts';

function memory(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => { data.set(k, v); }, removeItem: (k) => { data.delete(k); } };
}

describe('tips', () => {
  it('persist seen flags and the on/off switch; reset forgets them', () => {
    const be = memory();
    const a = new TipsStore(new KeyValueStorage(be));
    expect(a.enabled).toBe(true);
    a.markSeen('riposte');
    a.setEnabled(false);
    const b = new TipsStore(new KeyValueStorage(be));
    expect(b.seen('riposte')).toBe(true);
    expect(b.enabled).toBe(false);
    b.reset();
    expect(new TipsStore(new KeyValueStorage(be)).seen('riposte')).toBe(false);
    expect(JSON.parse(be.data.get(TIPS_KEY) ?? 'null')).toMatchObject({ version: 1 });
  });
  it('the codec rejects unknown tips and bad shapes (no silent reset)', () => {
    expect(() => tipsCodec({ version: 1, enabled: true, seen: ['nope'] }, 'k')).toThrow(/unknown tip/);
    expect(() => tipsCodec({ version: 2, enabled: true, seen: [] }, 'k')).toThrow(/version/);
    expect(() => tipsCodec({ version: 1, seen: [] }, 'k')).toThrow(/enabled/);
  });
  it('every tip is short: at most 4 lines in the tip box', () => {
    for (const id of TIP_IDS) {
      const t = tipText(id);
      expect(layoutText(FONT_4X6, t.text, { maxWidth: 194 }).lines.length, id).toBeLessThanOrEqual(4);
    }
  });
});

describe('Ripe clause', () => {
  const parts: TextPart[] = [
    { kind: 'text', text: 'Deal ' }, { kind: 'value', key: 'damage', value: 6, base: 6 },
    { kind: 'text', text: ' damage. Ripe: draw ' }, { kind: 'value', key: 'ripe_draw', value: 1, base: 1 }, { kind: 'text', text: ' card. Bloom.' },
  ];
  it('greys the whole clause (numbers too) when not Ripe', () => {
    expect(partsToMarkup(parts, false, false)).toBe('Deal [yellow]6[/] damage. [grey]Ripe:[/][grey] draw [/][grey]1[/][grey] card.[/] Bloom.');
  });
  it('lights "Ripe:" when Ripe and leaves unknown cards alone', () => {
    expect(partsToMarkup(parts, false, true)).toContain('[lime]Ripe:[/] draw [yellow]1[/] card.');
    expect(partsToMarkup(parts, false, null)).toBe('Deal [yellow]6[/] damage. Ripe: draw [yellow]1[/] card. Bloom.');
  });
});

describe('end-of-turn tags', () => {
  it('Riposte cards about to prime, Keep cards, and plain cards', () => {
    const rip = allCards().find((c) => c.riposte !== undefined);
    const keep = allCards().find((c) => c.keywords?.includes('retain') && c.riposte === undefined);
    const plain = allCards().find((c) => !c.keywords?.length && c.riposte === undefined && !c.hooks?.onTurnEndInHand);
    if (!rip || !keep || !plain) throw new Error('content lacks a Riposte / Keep / plain card');
    expect(endOfTurnTag({ id: rip.id, upgraded: false, uid: 1 }, { uids: [1], choose: false })?.text).toBe('PRIMES AT END');
    expect(endOfTurnTag({ id: rip.id, upgraded: false, uid: 1 }, { uids: [1], choose: true })?.text).toBe('MAY PRIME');
    expect(endOfTurnTag({ id: keep.id, upgraded: false, uid: 2 }, { uids: [], choose: false })?.text).toBe('STAYS IN HAND');
    expect(endOfTurnTag({ id: plain.id, upgraded: false, uid: 3 }, { uids: [], choose: false })).toBeNull();
  });
});

describe('tip placement', () => {
  const tipW = 210, tipH = 46;
  // intent boxes (with Augury's NEXT chips) as combat lays them out for 1-4 enemies, plus the Timeline window
  const timeline = rect(158, 1, 316, 45);
  const layouts: Record<number, Rect[]> = {
    1: [rect(282, 46, 110, 16)],
    2: [rect(174, 57, 120, 16), rect(350, 57, 120, 16)], // the reported bug: tip butted under the right one
    3: [rect(100, 100, 96, 16), rect(272, 100, 96, 16), rect(444, 100, 96, 16)],
    4: [rect(40, 118, 96, 16), rect(196, 118, 96, 16), rect(352, 118, 96, 16), rect(508, 118, 96, 16)],
  };
  for (const [n, intents] of Object.entries(layouts)) {
    it(`never covers or touches an intent or the Timeline with ${n} enemies`, () => {
      const avoid = [...intents, timeline];
      const p = tipPosition(tipW, tipH, avoid, 40);
      expect(tipHits(p.x, p.y, tipW, tipH, avoid)).toBe(false);
      for (const r of avoid) {
        const gapX = Math.max(r.x - (p.x + tipW), p.x - (r.x + r.w));
        const gapY = Math.max(r.y - (p.y + tipH), p.y - (r.y + r.h));
        expect(Math.max(gapX, gapY), `${n} enemies: tip at ${p.x},${p.y}`).toBeGreaterThanOrEqual(TIP_MARGIN);
      }
    });
  }
  it('with no clear spot above the hand it sits over the right column, below every intent', () => {
    const wall = [rect(0, 40, 640, 200)];
    expect(tipPosition(tipW, tipH, wall, 40)).toEqual({ x: 640 - tipW - 6, y: 236 });
  });
});
