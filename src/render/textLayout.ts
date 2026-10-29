/**
 * Pure bitmap-font model and text layout: glyph lookup, measuring, word wrapping, colour markup
 * and glyph placement. No DOM / three.js, so it is unit-tested in Node. `text.ts` turns the
 * placed glyphs into a three.js mesh; `pixels.ts` can stamp them into a PixelBuffer.
 */
import { EXTRA_8X8, FONT8X8_BASIC, FONT8X8_FIRST } from './font8x8.ts';
import { EXTRA_SMALL, FONT_SMALL, FONT_SMALL_FIRST } from './fontSmall.ts';
import { namedColor } from './palette.ts';

export interface FontData {
  readonly name: string;
  /** Cell size in pixels (glyph bitmap size). */
  readonly cellW: number;
  readonly cellH: number;
  /** Horizontal advance per character (monospace). */
  readonly advance: number;
  /** Default distance between baselines of consecutive lines. */
  readonly lineHeight: number;
  /**
   * Blank columns at the right of a typical glyph, subtracted from measured width so that
   * centring/right-alignment is by ink, not by cell (8x8 glyphs leave their right column empty).
   */
  readonly trailing: number;
  /** Row bitmaps per character, LSB = leftmost pixel. */
  readonly glyphs: ReadonlyMap<string, readonly number[]>;
  /** Characters in atlas order (index = atlas cell). */
  readonly chars: readonly string[];
}

function decodeRows(hex: string, rows: number, digitsPerRow: number, where: string): number[] {
  if (hex.length !== rows * digitsPerRow || !/^[0-9a-f]+$/.test(hex)) {
    throw new Error(`${where}: bad glyph hex "${hex}" (want ${rows * digitsPerRow} hex digits)`);
  }
  const out: number[] = [];
  for (let r = 0; r < rows; r++) out.push(parseInt(hex.slice(r * digitsPerRow, (r + 1) * digitsPerRow), 16));
  return out;
}

function buildFont(spec: {
  name: string; cellW: number; cellH: number; advance: number; lineHeight: number; trailing: number;
  first: number; table: readonly string[]; extra: Readonly<Record<string, string>>; digitsPerRow: number;
}): FontData {
  const glyphs = new Map<string, readonly number[]>();
  const chars: string[] = [];
  spec.table.forEach((hex, i) => {
    const ch = String.fromCharCode(spec.first + i);
    glyphs.set(ch, decodeRows(hex, spec.cellH, spec.digitsPerRow, `${spec.name} ${JSON.stringify(ch)}`));
    chars.push(ch);
  });
  for (const [ch, hex] of Object.entries(spec.extra)) {
    if (glyphs.has(ch)) throw new Error(`${spec.name}: extra glyph ${JSON.stringify(ch)} duplicates a base glyph`);
    glyphs.set(ch, decodeRows(hex, spec.cellH, spec.digitsPerRow, `${spec.name} extra ${JSON.stringify(ch)}`));
    chars.push(ch);
  }
  return {
    name: spec.name, cellW: spec.cellW, cellH: spec.cellH, advance: spec.advance,
    lineHeight: spec.lineHeight, trailing: spec.trailing, glyphs, chars,
  };
}

/** The 8x8 UI font (PS dialogue/menu text). */
export const FONT_8X8: FontData = buildFont({
  name: 'font8x8', cellW: 8, cellH: 8, advance: 8, lineHeight: 10, trailing: 1,
  first: FONT8X8_FIRST, table: FONT8X8_BASIC, extra: EXTRA_8X8, digitsPerRow: 2,
});

/** The 4x6 small font (card bodies, dense labels). */
export const FONT_4X6: FontData = buildFont({
  name: 'tomthumb4x6', cellW: 4, cellH: 6, advance: 4, lineHeight: 7, trailing: 1,
  first: FONT_SMALL_FIRST, table: FONT_SMALL, extra: EXTRA_SMALL, digitsPerRow: 1,
});

/** Row bitmaps for `ch`; throws on a character the font does not have. */
export function glyphRows(font: FontData, ch: string): readonly number[] {
  const g = font.glyphs.get(ch);
  if (!g) throw new Error(`${font.name}: no glyph for ${JSON.stringify(ch)} (U+${(ch.codePointAt(0) ?? 0).toString(16)})`);
  return g;
}

/** Is pixel (x, y) of glyph `ch` set? */
export function glyphPixel(font: FontData, ch: string, x: number, y: number): boolean {
  const rows = glyphRows(font, ch);
  const row = rows[y];
  if (row === undefined) throw new Error(`${font.name}: row ${y} out of range`);
  return ((row >> x) & 1) === 1;
}

/** Width in pixels of one line (no newlines), measured by ink: n*advance - trailing. */
export function measureLine(font: FontData, line: string): number {
  const n = [...line].length;
  return n === 0 ? 0 : n * font.advance - font.trailing;
}

/** A run of same-coloured text. `color` undefined = the Text's default colour. */
export interface TextRun { text: string; color?: number }

/**
 * Parse colour markup: `[name]...[/]` switches to a named palette colour (see palette.ts `C`) and
 * `[/]` returns to the default; `[[` is a literal `[`. Unknown colour names throw.
 */
export function parseMarkup(src: string): TextRun[] {
  const runs: TextRun[] = [];
  let cur = '';
  let color: number | undefined;
  const flush = () => { if (cur) runs.push(color === undefined ? { text: cur } : { text: cur, color }); cur = ''; };
  for (let i = 0; i < src.length; i++) {
    const ch = src[i] as string;
    if (ch !== '[') { cur += ch; continue; }
    if (src[i + 1] === '[') { cur += '['; i++; continue; }
    const end = src.indexOf(']', i);
    if (end < 0) throw new Error(`parseMarkup: unclosed "[" at ${i} in ${JSON.stringify(src)}`);
    const tag = src.slice(i + 1, end);
    flush();
    color = tag === '/' ? undefined : namedColor(tag);
    i = end;
  }
  flush();
  return runs;
}

/** A character with its resolved colour (undefined = default). */
interface StyledChar { ch: string; color: number | undefined }

function toStyled(runs: readonly TextRun[]): StyledChar[] {
  const out: StyledChar[] = [];
  for (const r of runs) for (const ch of r.text) out.push({ ch, color: r.color });
  return out;
}

/**
 * Greedy word wrap of styled chars. Explicit `\n` always breaks. Words longer than `maxWidth` are
 * hard-broken at the character limit. Leading spaces of wrapped lines are dropped.
 */
function wrapStyled(font: FontData, chars: readonly StyledChar[], maxWidth: number | undefined): StyledChar[][] {
  const lines: StyledChar[][] = [];
  const paragraphs: StyledChar[][] = [[]];
  for (const c of chars) {
    if (c.ch === '\n') paragraphs.push([]);
    else (paragraphs[paragraphs.length - 1] as StyledChar[]).push(c);
  }
  if (maxWidth === undefined) return paragraphs;
  // characters that fit: n*advance - trailing <= maxWidth
  const maxChars = Math.floor((maxWidth + font.trailing) / font.advance);
  if (maxChars < 1) throw new Error(`wrapText: maxWidth ${maxWidth} is narrower than one ${font.name} glyph`);
  for (const para of paragraphs) {
    let line: StyledChar[] = [];
    let continuation = false; // wrapped lines drop the spaces they broke on
    let i = 0;
    while (i < para.length) {
      // the spaces before the next word, then the word (non-space run)
      const start = i;
      let j = i;
      while (j < para.length && (para[j] as StyledChar).ch === ' ') j++;
      let k = j;
      while (k < para.length && (para[k] as StyledChar).ch !== ' ') k++;
      i = k;
      let word = para.slice(j, k);
      if (word.length === 0) break; // trailing spaces: ignore
      const lead = line.length === 0 && continuation ? [] : para.slice(start, j);
      if (line.length + lead.length + word.length <= maxChars) {
        line.push(...lead, ...word);
        continue;
      }
      if (line.length > 0) { lines.push(line); line = []; continuation = true; }
      while (word.length > maxChars) { lines.push(word.slice(0, maxChars)); word = word.slice(maxChars); continuation = true; }
      line = word;
    }
    lines.push(line);
  }
  return lines;
}

/** Plain-string word wrap (no markup). */
export function wrapText(font: FontData, text: string, maxWidth?: number): string[] {
  return wrapStyled(font, toStyled([{ text }]), maxWidth).map((l) => l.map((c) => c.ch).join(''));
}

export type Align = 'left' | 'center' | 'right';

export interface LayoutOptions {
  /** Wrap width in px. Also the alignment box width when given. */
  maxWidth?: number;
  align?: Align;
  lineHeight?: number;
  /** Throw if the wrapped text needs more lines than this (catches card-text overflow loudly). */
  maxLines?: number;
  /**
   * What to do past maxLines: 'throw' (default) or 'ellipsis' (keep maxLines lines, end the last
   * with …, and report `truncated` so the caller shows the full text elsewhere).
   */
  overflow?: 'throw' | 'ellipsis';
  /** Parse `[colour]...[/]` markup. */
  markup?: boolean;
}

export interface PlacedGlyph { ch: string; x: number; y: number; color: number | undefined }

export interface TextLayout {
  glyphs: PlacedGlyph[];
  lines: string[];
  /** Ink width of the widest line and total height (lines * lineHeight, last line by cell). */
  width: number;
  height: number;
  /** Left edge of the ink box relative to the text origin (non-zero for center/right without maxWidth). */
  left: number;
  /** Lines were dropped (overflow 'ellipsis'). */
  truncated: boolean;
}

/**
 * Lay text out in integer pixels relative to the origin (top-left of the box).
 * With `maxWidth`, lines align inside [0, maxWidth]. Without it, `center` centres lines on x=0 and
 * `right` ends them at x=0. Spaces produce no glyphs. Unknown characters throw.
 */
export function layoutText(font: FontData, text: string, opts: LayoutOptions = {}): TextLayout {
  const runs = opts.markup ? parseMarkup(text) : [{ text }];
  let lines = wrapStyled(font, toStyled(runs), opts.maxWidth);
  const lineH = opts.lineHeight ?? font.lineHeight;
  let truncated = false;
  if (opts.maxLines !== undefined && lines.length > opts.maxLines) {
    if ((opts.overflow ?? 'throw') === 'throw') {
      throw new Error(`layoutText: ${JSON.stringify(text)} needs ${lines.length} lines, maxLines is ${opts.maxLines}`);
    }
    truncated = true;
    lines = lines.slice(0, opts.maxLines);
    const last = lines[lines.length - 1] as StyledChar[];
    const maxChars = opts.maxWidth === undefined ? last.length + 1 : Math.floor((opts.maxWidth + font.trailing) / font.advance);
    const kept = last.slice(0, Math.max(0, Math.min(last.length, maxChars - 1)));
    lines[lines.length - 1] = [...kept, { ch: '\u2026', color: undefined }];
  }
  const align = opts.align ?? 'left';
  const glyphs: PlacedGlyph[] = [];
  let width = 0;
  let left = Infinity;
  lines.forEach((line, li) => {
    const w = line.length === 0 ? 0 : line.length * font.advance - font.trailing;
    width = Math.max(width, w);
    let x0: number;
    if (opts.maxWidth !== undefined) {
      x0 = align === 'left' ? 0 : align === 'center' ? Math.floor((opts.maxWidth - w) / 2) : opts.maxWidth - w;
    } else {
      x0 = align === 'left' ? 0 : align === 'center' ? -Math.floor(w / 2) : -w;
    }
    left = Math.min(left, x0);
    line.forEach((c, ci) => {
      if (c.ch === ' ') return;
      glyphRows(font, c.ch); // throw early on unknown characters
      glyphs.push({ ch: c.ch, x: x0 + ci * font.advance, y: li * lineH, color: c.color });
    });
  });
  const height = lines.length === 0 ? 0 : (lines.length - 1) * lineH + font.cellH;
  return {
    glyphs,
    lines: lines.map((l) => l.map((c) => c.ch).join('')),
    width,
    height,
    left: left === Infinity ? 0 : left,
    truncated,
  };
}
