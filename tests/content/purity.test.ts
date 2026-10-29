import '../testpack';
/// <reference types="node" />
// src/engine and src/content must stay Node-safe and deterministic.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : p.endsWith('.ts') ? [p] : [];
  });
}

const FORBIDDEN: [RegExp, string][] = [
  [/from\s+['"]three/, 'three.js import'],
  [/from\s+['"][./]*\/render\//, 'render import'],
  [/\bdocument\./, 'DOM document'],
  [/\bwindow\./, 'DOM window'],
  [/\blocalStorage\b/, 'localStorage'],
  [/Math\.random\s*\(/, 'Math.random'],
  [/Date\.now\s*\(/, 'Date.now'],
  [/performance\.now\s*\(/, 'performance.now'],
  [/:\s*any\b|<any>|as any\b/, 'any'],
  [/@ts-ignore|@ts-expect-error|as unknown as/, 'type escape hatch'],
];

describe('engine/content purity', () => {
  for (const dir of ['src/engine', 'src/content']) {
    it(`${dir} has no DOM/three/nondeterminism/any`, () => {
      const problems: string[] = [];
      for (const f of files(dir)) {
        const src = readFileSync(f, 'utf8');
        for (const [re, what] of FORBIDDEN) if (re.test(src)) problems.push(`${f}: ${what}`);
      }
      expect(problems).toEqual([]);
    });
  }

  it('content modules only import types from the engine', () => {
    const problems: string[] = [];
    for (const f of files('src/content')) {
      for (const line of readFileSync(f, 'utf8').split('\n')) {
        if (/^import\s+(?!type\b).*from\s+['"][./]*engine/.test(line)) problems.push(`${f}: ${line.trim()}`);
      }
    }
    expect(problems).toEqual([]);
  });
});
