/**
 * Every character the content can put on screen must exist in both bitmap fonts: a missing glyph
 * throws at render time (a crash mid-run). Scans the registered definitions (all string fields,
 * JSON-reachable) and the string literals in the content / engine sources (text built in code).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  allBoons, allCards, allClasses, allEncounters, allEnemies, allEvents, allPotions, allRelics, allRestOptions, allStatuses,
} from '../../src/content/index.ts';
import { FONT_4X6, FONT_8X8 } from '../../src/render/textLayout.ts';

function stringsIn(v: unknown, out: string[]): void {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) for (const x of v) stringsIn(x, out);
  else if (v !== null && typeof v === 'object') for (const x of Object.values(v)) stringsIn(x, out);
}

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...sourceFiles(p));
    else if (p.endsWith('.ts')) out.push(p);
  }
  return out;
}

/** Non-ASCII characters inside string literals ('', "", ``) of a source file, comments stripped. */
function literalChars(src: string): Set<string> {
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
  const chars = new Set<string>();
  for (const m of code.matchAll(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g)) {
    for (const ch of m[0]) if (ch.charCodeAt(0) > 0x7e) chars.add(ch);
  }
  return chars;
}

const missingIn = (chars: Iterable<string>) => [...chars].filter((ch) => !FONT_8X8.glyphs.has(ch) || !FONT_4X6.glyphs.has(ch))
  .map((ch) => `${ch} (U+${(ch.codePointAt(0) ?? 0).toString(16)}) 8x8:${FONT_8X8.glyphs.has(ch)} 4x6:${FONT_4X6.glyphs.has(ch)}`);

describe('content glyph coverage', () => {
  it('every character in the registered definitions is in both fonts', () => {
    const strings: string[] = [];
    for (const list of [allClasses(), allCards(), allRelics(), allEnemies(), allEncounters(), allEvents(), allPotions(), allStatuses(), allBoons(), allRestOptions()]) {
      stringsIn(list, strings);
    }
    const chars = new Set<string>();
    for (const s of strings) for (const ch of s) if (ch !== '\n' && ch !== '\t') chars.add(ch);
    expect(strings.length).toBeGreaterThan(500);
    expect(missingIn(chars)).toEqual([]);
  });

  it('every non-ASCII character in content / engine / renderer string literals is in both fonts', () => {
    const chars = new Set<string>();
    // a11y.ts writes to a DOM live region (screen readers), not the bitmap fonts
    const files = [...sourceFiles('src/content'), ...sourceFiles('src/engine'), ...sourceFiles('src/render'), 'src/main.ts'].filter((f) => !f.endsWith('a11y.ts'));
    for (const f of files) for (const ch of literalChars(readFileSync(f, 'utf8'))) chars.add(ch);
    expect(missingIn(chars)).toEqual([]);
  });
});
