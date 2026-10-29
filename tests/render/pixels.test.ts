import { describe, expect, it } from 'vitest';
import { BACKDROP_IDS, drawBackdrop } from '../../src/render/backdrops.ts';
import { C, isPaletteColor } from '../../src/render/palette.ts';
import { bayer, buildGlyphAtlas, PixelBuffer, TRANSPARENT } from '../../src/render/pixels.ts';
import { FONT_8X8 } from '../../src/render/textLayout.ts';
import { CARD, rasterizeBar, rasterizeCardFrame, rasterizeIconSheet, rasterizePanel, ICON_NAMES } from '../../src/render/ui/art.ts';
import { ICON_ALIASES } from '../../src/render/ui/iconArt.ts';

describe('PixelBuffer', () => {
  it('refuses off-palette colours', () => {
    const b = new PixelBuffer(4, 4);
    expect(() => b.set(0, 0, 0x808080)).toThrow(/not an SMS palette colour/);
    expect(() => b.rect(0, 0, 2, 2, 0x010101)).toThrow();
  });

  it('clips writes, throws on out-of-range reads', () => {
    const b = new PixelBuffer(4, 4);
    b.set(-1, 9, C.white);
    expect(() => b.get(4, 0)).toThrow();
    expect(b.get(0, 0)).toBe(TRANSPARENT);
  });

  it('ordered dither levels 0 and 16 are solid, 8 is half', () => {
    let n = 0;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      expect(bayer(x, y, 0)).toBe(false);
      expect(bayer(x, y, 16)).toBe(true);
      if (bayer(x, y, 8)) n++;
    }
    expect(n).toBe(8);
  });

  it('roundBox draws the PS rounded 2px border', () => {
    const b = rasterizePanel(10, 10);
    const row = (y: number) => Array.from({ length: 10 }, (_, x) => {
      const c = b.get(x, y);
      return c === TRANSPARENT ? '.' : c === C.white ? 'W' : 'k';
    }).join('');
    expect(row(0)).toBe('..WWWWWW..');
    expect(row(1)).toBe('.WWWWWWWW.');
    expect(row(2)).toBe('WWWkkkkWWW');
    expect(row(3)).toBe('WWkkkkkkWW');
    expect(row(9)).toBe('..WWWWWW..');
  });

  it('builds a glyph atlas with every character in order', () => {
    const a = buildGlyphAtlas(FONT_8X8);
    expect(a.index.size).toBe(FONT_8X8.chars.length);
    expect(a.pixels.w).toBe(128);
    const i = a.index.get('A');
    if (i === undefined) throw new Error('no A');
    const ox = (i % 16) * 8, oy = Math.floor(i / 16) * 8;
    expect(a.pixels.get(ox + 2, oy)).toBe(C.white); // '..##....'
    expect(a.pixels.get(ox, oy)).toBe(TRANSPARENT);
  });
});

describe('procedural backdrops', () => {
  for (const id of BACKDROP_IDS) {
    it(`${id}: 640x360, fully opaque, palette only, dithered (several colours)`, () => {
      const b = drawBackdrop(id);
      expect([b.w, b.h]).toEqual([640, 360]);
      for (let i = 3; i < b.data.length; i += 4) if (b.data[i] !== 255) throw new Error(`transparent pixel at ${(i - 3) / 4}`);
      const cols = b.colors();
      for (const c of cols) expect(isPaletteColor(c)).toBe(true);
      expect(cols.size).toBeGreaterThanOrEqual(8);
    });
  }
});

describe('UI art', () => {
  it('card frame is 64x88 with the cost bubble and art window', () => {
    const f = rasterizeCardFrame('attack');
    expect([f.w, f.h]).toEqual([CARD.W, CARD.H]);
    expect(f.get(CARD.art.x + 5, CARD.art.y + 5)).toBe(C.black);
    expect(f.get(CARD.cost.x + 6, CARD.cost.y + 6)).toBe(C.psBlue);
  });

  it('bars fill proportionally and segment', () => {
    const b = rasterizeBar(12, 4, 5, 10, { fill: C.red, back: C.navy, segment: 'unit' });
    let red = 0;
    for (let x = 0; x < 12; x++) if (b.get(x, 2) === C.red) red++;
    expect(red).toBeGreaterThan(0);
    expect(red).toBeLessThanOrEqual(5);
    expect(() => rasterizeBar(10, 4, 1, 0, { fill: C.red })).toThrow();
  });

  it('icon sheet has every icon at 12x12', () => {
    const s = rasterizeIconSheet();
    expect(s.frames.size).toBe(ICON_NAMES.length + Object.keys(ICON_ALIASES).length);
    for (const f of s.frames.values()) expect([f.w, f.h]).toEqual([12, 12]);
  });
});

describe('card text capacity', () => {
  it('fits a 14-char starter name in the 2-line name area and 5 body lines', async () => {
    const { layoutText, FONT_4X6: F } = await import('../../src/render/textLayout.ts');
    const name = layoutText(F, 'SHOULDER CHECK', { maxWidth: CARD.name.w, maxLines: CARD.name.lines, lineHeight: CARD.name.lineHeight });
    expect(name.lines).toEqual(['SHOULDER', 'CHECK']);
    expect(name.height).toBeLessThanOrEqual(CARD.name.h);
    const body = layoutText(F, "See each enemy's next two intents. Start of turn: Delay 1.", { maxWidth: CARD.body.w, maxLines: CARD.body.lines, lineHeight: CARD.body.lineHeight });
    expect(body.height).toBeLessThanOrEqual(CARD.body.h);
    expect(() => layoutText(F, 'A VERY LONG CARD NAME THAT CANNOT FIT', { maxWidth: CARD.name.w, maxLines: CARD.name.lines })).toThrow(/maxLines/);
  });
});
