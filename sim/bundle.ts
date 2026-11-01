/// <reference types="node" />
// Bundle the long-running v2 sim entry points with esbuild into sim/out/bundle/*.mjs. The bundle is
// plain JS without tsx's keepNames wrappers, which cost ~15% of a run's CPU under tsx. Workers of
// a bundled entry load the bundle itself. Run it again after any change to src/ or sim/.
// Usage: npx tsx sim/bundle.ts   then   node sim/out/bundle/personas-batch.mjs ...

import { existsSync } from 'node:fs';
import { build } from 'esbuild';
import { srcHash } from './srchash';

// Default: every v2 entry point. Pass names to rebuild only those (e.g. `npx tsx sim/bundle.ts attribution`).
const ALL = ['personas-batch', 'counterfactual', 'attribution'];
const asked = process.argv.slice(2);
const entries = asked.length ? asked : ALL.filter((e) => existsSync(`sim/${e}.ts`));
for (const e of entries) if (!ALL.includes(e)) throw new Error(`bundle: unknown entry '${e}' (have ${ALL.join(', ')})`);
const t0 = Date.now();
await build({
  entryPoints: entries.map((e) => `sim/${e}.ts`),
  outdir: 'sim/out/bundle',
  outExtension: { '.js': '.mjs' },
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  keepNames: false,
  // The bundle bakes in src/ as it is now: stamp its hash so a stale bundle refuses to run (srchash.ts).
  define: { __SIM_BUNDLE_SRC_HASH__: JSON.stringify(srcHash('src')) },
  sourcemap: 'linked',
  logLevel: 'warning',
});
console.error(`[bundle] ${entries.length} entry points -> sim/out/bundle/ in ${Date.now() - t0} ms (src/ ${srcHash('src')})`);
