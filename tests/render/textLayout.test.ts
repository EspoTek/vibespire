import { describe, expect, it } from 'vitest';
import { FONT8X8_BASIC } from '../../src/render/font8x8.ts';
import { FONT_SMALL } from '../../src/render/fontSmall.ts';
import { FONT_4X6, FONT_8X8, glyphPixel, layoutText, measureLine, parseMarkup, wrapText } from '../../src/render/textLayout.ts';
import { C } from '../../src/render/palette.ts';

const art = (font: typeof FONT_8X8, ch: string) =>
  Array.from({ length: font.cellH }, (_, y) => Array.from({ length: font.cellW }, (_, x) => (glyphPixel(font, ch, x, y) ? '#' : '.')).join(''));

describe('font data', () => {
  it('covers printable ASCII in both fonts', () => {
    expect(FONT8X8_BASIC).toHaveLength(95);
    expect(FONT_SMALL).toHaveLength(95);
    for (let c = 0x20; c <= 0x7e; c++) {
      expect(FONT_8X8.glyphs.has(String.fromCharCode(c))).toBe(true);
      expect(FONT_4X6.glyphs.has(String.fromCharCode(c))).toBe(true);
    }
  });

  it('decodes font8x8 LSB-left rows (the README example "A")', () => {
    expect(art(FONT_8X8, 'A')).toEqual(['..##....', '.####...', '##..##..', '##..##..', '######..', '##..##..', '##..##..', '........']);
  });

  it('decodes Tom Thumb into 4x6 cells with descenders on row 5', () => {
    expect(art(FONT_4X6, 'A')).toEqual(['.#..', '#.#.', '###.', '#.#.', '#.#.', '....']);
    expect(art(FONT_4X6, 'g')[5]).toBe('.#..');
  });

  it('throws on characters the font lacks', () => {
    expect(() => layoutText(FONT_8X8, 'café')).toThrow(/no glyph/);
  });
});

describe('measuring and wrapping', () => {
  it('measures by ink (n*advance - trailing)', () => {
    expect(measureLine(FONT_8X8, '')).toBe(0);
    expect(measureLine(FONT_8X8, 'HP')).toBe(15);
    expect(measureLine(FONT_4X6, 'ABC')).toBe(11);
  });

  it('wraps greedily on spaces and drops the break space', () => {
    // 8x8: maxWidth 47 fits floor((47+1)/8) = 6 chars
    expect(wrapText(FONT_8X8, 'DEAL 6 DAMAGE NOW', 47)).toEqual(['DEAL 6', 'DAMAGE', 'NOW']);
  });

  it('hard-breaks words longer than the line', () => {
    expect(wrapText(FONT_4X6, 'SUPERCALIFRAGILISTIC', 23)).toEqual(['SUPERC', 'ALIFRA', 'GILIST', 'IC']);
  });

  it('honours explicit newlines and ignores trailing spaces', () => {
    expect(wrapText(FONT_8X8, 'A\nB C   ', 100)).toEqual(['A', 'B C']);
    expect(wrapText(FONT_8X8, 'A\n\nB')).toEqual(['A', '', 'B']);
  });

  it('rejects a box narrower than one glyph', () => {
    expect(() => wrapText(FONT_8X8, 'X', 3)).toThrow(/narrower/);
  });
});

describe('layoutText', () => {
  it('places glyphs on integer pixels, skipping spaces', () => {
    const l = layoutText(FONT_8X8, 'A B');
    expect(l.glyphs.map((g) => [g.ch, g.x, g.y])).toEqual([['A', 0, 0], ['B', 16, 0]]);
    expect(l.width).toBe(23);
    expect(l.height).toBe(8);
  });

  it('aligns inside maxWidth and about the anchor without it', () => {
    const c = layoutText(FONT_8X8, 'AB', { maxWidth: 41, align: 'center' });
    expect(c.glyphs[0]?.x).toBe(Math.floor((41 - 15) / 2));
    const r = layoutText(FONT_8X8, 'AB', { maxWidth: 41, align: 'right' });
    expect(r.glyphs[0]?.x).toBe(41 - 15);
    const a = layoutText(FONT_8X8, 'AB', { align: 'center' });
    expect(a.glyphs[0]?.x).toBe(-7);
    expect(a.left).toBe(-7);
  });

  it('stacks lines by lineHeight', () => {
    const l = layoutText(FONT_4X6, 'A\nB', { lineHeight: 7 });
    expect(l.glyphs.map((g) => g.y)).toEqual([0, 7]);
    expect(l.height).toBe(13);
  });

  it('throws when wrapped text exceeds maxLines', () => {
    expect(() => layoutText(FONT_4X6, 'ONE TWO THREE FOUR', { maxWidth: 15, maxLines: 2 })).toThrow(/maxLines/);
  });

  it('applies colour markup per glyph', () => {
    const l = layoutText(FONT_8X8, 'A[yellow]6[/]B', { markup: true });
    expect(l.glyphs.map((g) => g.color)).toEqual([undefined, C.yellow, undefined]);
    expect(parseMarkup('[[x')).toEqual([{ text: '[x' }]);
    expect(() => parseMarkup('[nope]x')).toThrow(/unknown colour/);
    expect(() => parseMarkup('a[b')).toThrow(/unclosed/);
  });
});

describe('overflow ellipsis', () => {
  it('keeps maxLines lines, ends with … and reports truncation', () => {
    const l = layoutText(FONT_4X6, 'ONE TWO THREE FOUR FIVE SIX', { maxWidth: 15, maxLines: 2, overflow: 'ellipsis' });
    expect(l.truncated).toBe(true);
    expect(l.lines).toHaveLength(2);
    expect(l.lines[1]?.endsWith('…')).toBe(true);
    expect(layoutText(FONT_4X6, 'ONE', { maxWidth: 15, maxLines: 2, overflow: 'ellipsis' }).truncated).toBe(false);
  });
});
