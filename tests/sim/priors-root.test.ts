// The prior files must come from the tree being measured (the working directory), not from wherever the
// sim code was loaded: a bundle built in one snapshot used to read another snapshot's priors (2026-10-31).
// Each case runs a child process from a temporary "snapshot" so cwd resolution is exercised for real.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

const repo = resolve(__dirname, '../..');
const tsx = pathToFileURL(createRequire(join(repo, 'package.json')).resolve('tsx')).href;
const priorsModule = pathToFileURL(join(repo, 'sim/policies/lib/priors.ts')).href;

function snapshot(withPriors: boolean, label: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'sim-root-'));
  writeFileSync(join(dir, 'package.json'), '{}');
  mkdirSync(join(dir, 'src'));
  mkdirSync(join(dir, 'docs', 'balance'), { recursive: true });
  if (withPriors) {
    for (const f of ['v2-priors.json', 'v2-baseline-priors.json']) {
      writeFileSync(join(dir, 'docs', 'balance', f), JSON.stringify({ label: `${label}-${f}`, generated: '2026-10-31T00:00', cards: {}, relics: {} }));
    }
  }
  return dir;
}

function runIn(cwd: string): string {
  const code = `const m = await import(${JSON.stringify(priorsModule)}); console.log(JSON.stringify(m.priorsMeta()));`;
  return execFileSync(process.execPath, ['--import', tsx, '--input-type=module', '-e', code], { cwd, env: { ...process.env, SIM_PRIORS: '' }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

describe('prior files resolve against the measured tree', () => {
  it('reads the priors of the working directory, with absolute paths and file hashes', () => {
    const a = snapshot(true, 'A');
    const b = snapshot(true, 'B');
    const metaA = JSON.parse(runIn(a)) as { path: string; sha256: string; label: string }[];
    const metaB = JSON.parse(runIn(b)) as { path: string; sha256: string; label: string }[];
    expect(metaA.map((m) => m.label)).toEqual(['A-v2-priors.json', 'A-v2-baseline-priors.json']);
    expect(metaB.map((m) => m.label)).toEqual(['B-v2-priors.json', 'B-v2-baseline-priors.json']);
    for (const m of metaA) {
      // cwd reports the real path (macOS: /var -> /private/var).
      expect(m.path.startsWith(realpathSync(a))).toBe(true);
      expect(m.sha256).toMatch(/^[0-9a-f]{16}$/);
    }
    expect(metaA[0]?.sha256).not.toBe(metaB[0]?.sha256);
  }, 60_000);

  it('throws when the measured tree has no prior files (no silent fallback to the code location)', () => {
    expect(() => runIn(snapshot(false, 'C'))).toThrow(/priors: missing/);
  }, 60_000);

  it('throws when the working directory is not a repo root', () => {
    expect(() => runIn(mkdtempSync(join(tmpdir(), 'sim-noroot-')))).toThrow(/run from the root of the tree/);
  }, 60_000);
});
