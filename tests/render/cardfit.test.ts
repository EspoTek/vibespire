// Card faces never truncate rules (conveyance): every card's text, base and upgraded, fits one of
// the face layouts (CARD_FACE_LAYOUTS: the art and type line give way before text is cut). Numbers
// are padded to two digits, since combat modifiers can grow them.
import { describe, expect, it } from 'vitest';
import { allCards } from '../../src/content';
import { renderCardText } from '../../src/engine/text';
import { allCards as allCardDefs, getCardDef } from '../../src/content';
import { CARD, CARD_FACE_LAYOUTS, cardNameLayout, faceLayoutFor, FONT_4X6_TIGHT, type CardFaceLayout } from '../../src/render/ui/art.ts';
import { FONT_4X6, layoutText } from '../../src/render/textLayout.ts';

const last = CARD_FACE_LAYOUTS[CARD_FACE_LAYOUTS.length - 1] as CardFaceLayout;

function fits(text: string, l: CardFaceLayout): boolean {
  return layoutText(FONT_4X6, text, { maxWidth: l.body.w, lineHeight: l.body.lineHeight }).lines.length <= l.body.lines;
}

describe('card face fit', () => {
  it('layouts get roomier in order and stay inside the 64x88 card', () => {
    for (let i = 1; i < CARD_FACE_LAYOUTS.length; i++) {
      const a = CARD_FACE_LAYOUTS[i - 1] as CardFaceLayout, b = CARD_FACE_LAYOUTS[i] as CardFaceLayout;
      expect(b.body.lines).toBeGreaterThanOrEqual(a.body.lines);
    }
    for (const l of CARD_FACE_LAYOUTS) {
      expect(l.body.x).toBeGreaterThanOrEqual(2);
      expect(l.body.x + l.body.w).toBeLessThanOrEqual(62);
      expect(l.body.y + (l.body.lines - 1) * l.body.lineHeight + 6).toBeLessThanOrEqual(86);
    }
  });

  it('short text keeps the art', () => {
    expect(faceLayoutFor('Deal [yellow]6[/] damage.')).toBe(0);
  });

  it('card names never split a word (base and upgraded)', () => {
    const tight: string[] = [];
    for (const c of allCardDefs()) {
      for (const up of [false, true]) {
        const name = getCardDef(c.id, up).name.toUpperCase();
        const l = cardNameLayout(name); // throws when no layout keeps every word whole
        const lines = layoutText(l.tight ? FONT_4X6_TIGHT : FONT_4X6, l.text, { maxWidth: CARD.name.w }).lines;
        expect(lines.length, name).toBeLessThanOrEqual(CARD.name.lines);
        for (const line of lines) for (const w of line.split(' ')) if (w) expect(l.text.split(' '), `${name}: "${w}" is a broken word`).toContain(w);
        if (l.tight) tight.push(name);
      }
    }
    // tight spacing is the last resort; keep it rare (names it lists are rename candidates)
    expect(tight.length, `tight names: ${tight.join(', ')}`).toBeLessThanOrEqual(6);
  });

  it('every card (base and upgraded) fits a face layout without truncation', () => {
    const over: string[] = [];
    for (const c of allCards()) {
      for (const up of [false, true]) {
        const text = renderCardText({ id: c.id, upgraded: up }, null).replace(/\b\d\b/g, '99');
        if (!fits(text, last)) over.push(`${c.id}${up ? '+' : ''} (${layoutText(FONT_4X6, text, { maxWidth: last.body.w }).lines.length} lines > ${last.body.lines}): ${text}`);
      }
    }
    expect(over).toEqual([]);
  });
});
