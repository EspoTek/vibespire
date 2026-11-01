/// <reference types="node" />
// Content hash of a tree's src/ (sorted relative paths and file bytes, sha256, first 16 hex chars).
// Printed by sim/snapshot.sh and stamped into every report header (sim/attribution.ts), so a report
// names exactly the content it measured even without a commit.
// Usage: npx tsx sim/srchash.ts [dir]   (default: ./src)

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

export function srcHash(dir = 'src'): string {
  const files: string[] = [];
  const walk = (d: string): void => {
    for (const name of readdirSync(d).sort()) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else files.push(p);
    }
  };
  walk(dir);
  const h = createHash('sha256');
  for (const f of files) {
    h.update(relative(dir, f));
    h.update('\0');
    h.update(readFileSync(f));
    h.update('\0');
  }
  return `${h.digest('hex').slice(0, 16)} (${files.length} files)`;
}

/** Set by sim/bundle.ts (esbuild define) in a bundled entry point; undefined under tsx. */
declare const __SIM_BUNDLE_SRC_HASH__: string | undefined;

/**
 * The src/ hash of the content this process runs. Under tsx that is ./src. A bundle baked src/ in at build
 * time, so it THROWS when ./src has changed since: a stale bundle would otherwise measure old content
 * while every log says "current tree" (rebuild with `npx tsx sim/bundle.ts`).
 */
export function runningSrcHash(): string {
  const live = srcHash('src');
  const baked = typeof __SIM_BUNDLE_SRC_HASH__ === 'string' ? __SIM_BUNDLE_SRC_HASH__ : null;
  if (baked !== null && baked !== live) throw new Error(`stale sim bundle: built from src/ ${baked}, but ./src is now ${live}. Rebuild with \`npx tsx sim/bundle.ts\` (or run under tsx).`);
  return live;
}

const entry = process.argv[1];
// Bundled into other entry points, import.meta.url is the bundle itself: match the script name too.
if (entry !== undefined && /srchash\.(ts|mjs)$/.test(entry) && import.meta.url === pathToFileURL(entry).href) console.log(srcHash(process.argv[2] ?? 'src'));
