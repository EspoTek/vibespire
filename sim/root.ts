/// <reference types="node" />
// The tree being measured: the current working directory, resolved at RUN time.
//
// Data the bots read from the repo (prior files in docs/balance, archetype matrices in docs/cards) must
// come from the tree being measured, never from wherever the code was loaded. An esbuild bundle's
// import.meta.url is the bundle file, so a bundle built in one snapshot and run from another read the
// first snapshot's prior files (2026-10-31). The src/ freshness check (srchash.ts) already hashes ./src,
// so cwd is the one root every check agrees on.

import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** Absolute path of the measured tree. Throws unless the working directory is a repo root (package.json and src/). */
export function measuredRoot(): string {
  const root = resolve(process.cwd());
  if (!existsSync(join(root, 'package.json')) || !existsSync(join(root, 'src'))) {
    throw new Error(`sim: run from the root of the tree you measure (no package.json + src/ in ${root}); cd into the repo or snapshot first`);
  }
  return root;
}
