// Entry point for `npm run e2e*` (see tests/e2e/README.md). No static engine/content imports here, so
// --snapshot works even while another agent has the live tree half-edited:
//   --snapshot  copy the tree (src, public, sim, tests, config; node_modules linked) to a
//               temp dir outside the repo, wait until that copy loads (content registry + engine import
//               cleanly, retrying every 20 s for up to 10 minutes), then run the suite from the copy.
//               Other agents' edits during a long batch then can't change the code under test.
//               Artifacts still land in tests/e2e/out (VIBE_E2E_OUT).

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const REPO = path.resolve(import.meta.dirname, '../..');
const OUT = path.join(REPO, 'tests/e2e/out');
const TSX = path.join(REPO, 'node_modules/.bin/tsx');

function copyTree(tree: string): void {
  fs.rmSync(tree, { recursive: true, force: true });
  fs.mkdirSync(tree, { recursive: true });
  const skip = [path.join(REPO, 'sim/out'), OUT];
  for (const f of ['src', 'public', 'sim', 'tests', 'index.html', 'vite.config.ts', 'tsconfig.json', 'tsconfig.engine.json', 'package.json']) {
    fs.cpSync(path.join(REPO, f), path.join(tree, f), { recursive: true, filter: (p) => !skip.some((s) => p === s || p.startsWith(`${s}${path.sep}`)) });
  }
  fs.symlinkSync(path.join(REPO, 'node_modules'), path.join(tree, 'node_modules'), 'dir');
}

/** null = the copy loads; else the error text. */
function loadError(tree: string): string | null {
  const check = path.join(tree, 'e2e-load-check.mts'); // a module file: tsx -e would compile top-level await as CJS
  fs.writeFileSync(check, "await import('./src/content/index.ts');\nawait import('./src/engine/index.ts');\nawait import('./sim/policies/greedy.ts');\n");
  const r = spawnSync(TSX, [check], { cwd: tree, encoding: 'utf8' });
  return r.status === 0 ? null : `${r.stderr}`.split('\n').filter((l) => /Error|error/.test(l)).slice(0, 3).join(' | ');
}

const argv = process.argv.slice(2);
if (argv.includes('--snapshot')) {
  // outside the repo: vitest and tsc would otherwise pick up the copy's tests
  const tree = path.join(os.tmpdir(), `vibespire-e2e-tree-${process.pid}`);
  const t0 = Date.now();
  for (let attempt = 1; ; attempt++) {
    copyTree(tree);
    const err = loadError(tree);
    if (err === null) break;
    if (Date.now() - t0 > 10 * 60_000) { console.log(`[e2e] ABORT: the tree never loaded cleanly in 10 minutes: ${err}`); process.exit(2); }
    console.log(`[e2e] snapshot attempt ${attempt}: the tree does not load (${err}); retrying in 20 s`);
    spawnSync('sleep', ['20']);
  }
  console.log(`[e2e] running from a snapshot of the tree (${tree})`);
  // async, so a signal sent to this process reaches the runner, which closes its browser and server
  const child = spawn(TSX, [path.join(tree, 'tests/e2e/run.ts'), ...argv.filter((x) => x !== '--snapshot')], { cwd: tree, stdio: 'inherit', env: { ...process.env, VIBE_E2E_OUT: OUT } });
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) process.on(sig, () => { child.kill(sig); });
  const code = await new Promise<number>((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (c, sig) => resolve(c ?? (sig ? 130 : 1)));
  });
  fs.rmSync(tree, { recursive: true, force: true });
  process.exit(code);
} else {
  await import('./run.ts');
}
