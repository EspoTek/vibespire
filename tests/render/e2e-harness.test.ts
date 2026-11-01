// The e2e harness (tests/e2e) must send page-side code as source text, never as a Node function:
// tsx's keepNames rewrites functions to call a Node-only `__name` helper, which throws
// "__name is not defined" in the page (see VibePage.hook in tests/e2e/lib/vibe.ts).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (n === 'out') return [];
    return statSync(p).isDirectory() ? files(p) : p.endsWith('.ts') ? [p] : [];
  });
}

describe('e2e harness', () => {
  it('passes no functions to page.evaluate / waitForFunction / addInitScript', () => {
    const bad: string[] = [];
    for (const f of files('tests/e2e')) {
      readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
        if (/\.(evaluate|evaluateHandle|waitForFunction|addInitScript)\(\s*(async\s*)?(\(|function\b|[A-Za-z_$][\w$]*\s*=>)/.test(line)) bad.push(`${f}:${i + 1}: ${line.trim()}`);
      });
    }
    expect(bad).toEqual([]);
  });
});
