// KeywordBoxes placement (conveyance): beside the inspected rect, never over it or the avoid rects
// when a clear side exists, and always fully on the 640x360 screen.
import { describe, expect, it } from 'vitest';
import { KEYWORDS } from '../../src/content';
import { initFonts } from '../../src/render/fonts.ts';
import { H, rect, W, type Rect } from '../../src/render/layout.ts';
import { KeywordBoxes, keywordIdsInMarkup, plainText } from '../../src/render/ui/KeywordBoxes.ts';

initFonts();

const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe('keyword boxes', () => {
  it('markup helpers strip colour tags and find glossary terms', () => {
    expect(plainText('Deal [yellow]6[/] damage. [[x]')).toBe('Deal 6 damage. [x]');
    expect(keywordIdsInMarkup('Gain [yellow]5[/] Guard. [pink]Riposte[/]: apply 1 Exposed.')).toEqual(['guard', 'riposte', 'exposed']);
  });

  it('stays on screen and off the anchor for anchors all over the screen', () => {
    const ids = ['riposte', 'onslaught', 'guard'];
    const kb = new KeywordBoxes();
    for (const [x, y] of [[0, 0], [300, 150], [576, 272], [128, 262], [4, 24], [560, 300]] as const) {
      const anchor = rect(x, y, 64, 88);
      kb.show(ids, anchor, 'right');
      const b = kb.bounds;
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.x + b.w).toBeLessThanOrEqual(W);
      expect(b.y + b.h).toBeLessThanOrEqual(H);
      expect(overlaps(b, anchor)).toBe(false);
    }
  });

  it('every glossary entry renders as a box', () => {
    const kb = new KeywordBoxes();
    for (const k of KEYWORDS) {
      kb.show([k.id], rect(10, 10, 64, 88), 'right');
      expect(kb.shownIds).toEqual([k.id]);
      expect(kb.bounds.h).toBeGreaterThan(12);
    }
  });

  it('flows into more columns instead of running off the bottom', () => {
    const kb = new KeywordBoxes();
    kb.show(KEYWORDS.slice(0, 6).map((k) => k.id), rect(0, 0, 10, 10), 'right');
    expect(kb.bounds.y + kb.bounds.h).toBeLessThanOrEqual(H);
  });
});
