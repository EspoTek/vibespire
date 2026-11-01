// Failure artifacts under tests/e2e/out/ (gitignored): screenshot, action log + seed (replayable with
// `npm run e2e -- --replay <dir>`), the last snapshot, the engine state (loadable as a save) and the
// console tail.

import fs from 'node:fs';
import path from 'node:path';
import type { Action } from '../../../src/engine/index.ts';
import { REPO } from './env.ts';
import type { VibePage } from './vibe.ts';

/** Artifacts dir. A --snapshot run executes from a frozen copy of the tree but writes here (VIBE_E2E_OUT). */
export const OUT = process.env.VIBE_E2E_OUT ?? path.join(REPO, 'tests/e2e/out'); // optional override, documented in the README

export interface FailureRecord {
  kind: string;
  seed: string;
  classId: string;
  /** Actions dispatched so far, in order (the replay input). */
  actions: Action[];
  /** Fixture save the run started from (scenarios), or null for a fresh run. */
  startSave: string | null;
  reason: string;
  violations: { code: string; msg: string }[];
}

export async function saveFailure(vp: VibePage, rec: FailureRecord): Promise<string> {
  const dir = path.join(OUT, `${new Date().toISOString().replace(/[:.]/g, '-')}-${rec.kind}-${rec.classId}-${rec.seed}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'failure.json'), JSON.stringify(rec, null, 1));
  fs.writeFileSync(path.join(dir, 'console.txt'), [...vp.errors.map((e) => `ERROR ${e}`), '', ...vp.consoleTail].join('\n'));
  // the page may be dead (crash): every capture below is best effort, and says so in the folder
  const notes: string[] = [];
  try { await vp.page.screenshot({ path: path.join(dir, 'screen.png') }); } catch (e) { notes.push(`screenshot failed: ${String(e)}`); }
  try { fs.writeFileSync(path.join(dir, 'snapshot.json'), JSON.stringify(await vp.snapshot(), null, 1)); } catch (e) { notes.push(`snapshot failed: ${String(e)}`); }
  try {
    const st = await vp.stateJson();
    if (st !== null) fs.writeFileSync(path.join(dir, 'state.json'), st);
  } catch (e) { notes.push(`state failed: ${String(e)}`); }
  if (notes.length) fs.writeFileSync(path.join(dir, 'capture-notes.txt'), notes.join('\n'));
  return dir;
}
