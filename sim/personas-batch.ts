/// <reference types="node" />
// Personality batch (v2 baseline): every persona x class over the same seeds, written as JSONL
// (one RunResult per line) to <out>/<persona>-<class>.jsonl for sim/attribution.ts.
// Usage: npx tsx sim/personas-batch.ts [--runs 300] [--class breaker,graft,chronist]
//        [--personas spike,timmy,...|all] [--seed-prefix v2] [--out sim/out/v2] [--workers N] [--from k]
//        [--set key=value ...] [--difficulty standard|heroic]  (default standard; stamped in meta-*.json)
// Seeds are <prefix>-<i>-<class>: every persona plays the same maps, so persona deltas are paired.

import { createWriteStream, mkdirSync, writeFileSync, type WriteStream } from 'node:fs';
import { priorsDescription, priorsMeta } from './policies/lib/priors';
import { measuredRoot } from './root';
import { runningSrcHash } from './srchash';
import { isMainThread } from 'node:worker_threads';
import { allClasses } from '../src/content';
import { difficultyArg, parseSets } from './overrides';
import { engineNames, johnnyArchetypes, personaNames } from './policies/personas';
import { defaultWorkers, runPool, type PoolJob } from './pool';

function arg(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0) return null;
  const v = process.argv[i + 1];
  if (v === undefined || v.startsWith('--')) throw new Error(`--${name} needs a value`);
  return v;
}

/**
 * Whether a persona name applies to a class: non-johnny personas always; johnny-<engine> and
 * johnny-legacy-<engine> when the class has that engine; johnny-v1-<arch> when its matrix has that
 * archetype. Lists span classes (johnny-furnace is Breaker only), so other names are skipped per class.
 */
function johnnyFitsClass(name: string, cls: string): boolean {
  if (name.startsWith('johnny-v1-')) return johnnyArchetypes(cls).includes(name.slice('johnny-v1-'.length));
  if (name.startsWith('johnny-legacy-')) return engineNames(cls).includes(name.slice('johnny-legacy-'.length));
  if (name.startsWith('johnny-')) return engineNames(cls).includes(name.slice('johnny-'.length));
  return true;
}

async function main(): Promise<void> {
  const runs = Number(arg('runs') ?? 300);
  if (!Number.isInteger(runs) || runs <= 0) throw new Error(`--runs must be a positive integer`);
  const classes = (arg('class') ?? allClasses().map((c) => c.id).join(',')).split(',');
  const prefix = arg('seed-prefix') ?? 'v2';
  // --from k: seeds k..runs-1 only, appended to the existing files (top up one persona on the same seeds).
  const from = Number(arg('from') ?? 0);
  if (!Number.isInteger(from) || from < 0 || from >= runs) throw new Error('--from must be an integer in [0, runs)');
  const out = arg('out') ?? 'sim/out/v2';
  const workersArg = arg('workers');
  const workers = workersArg === null ? defaultWorkers() : Number(workersArg);
  const personaArg = arg('personas') ?? 'all';
  const overrides = parseSets(process.argv);
  const difficulty = difficultyArg(process.argv);
  mkdirSync(out, { recursive: true });
  // What this batch measures: the content hash (throws on a stale bundle) and the priors spike drafts with
  // (throws on missing files). Written next to the results and printed in every report header.
  const meta = { root: measuredRoot(), srcHash: runningSrcHash(), difficulty, overrides, priors: priorsDescription(), priorFiles: priorsMeta(), argv: process.argv.slice(2).join(' '), started: new Date().toISOString() };
  writeFileSync(`${out}/meta-${Date.now()}.json`, `${JSON.stringify(meta, null, 2)}\n`);
  console.error(`[personas] src/ ${meta.srcHash}; ${difficulty}; priors: ${meta.priors}`);
  const errorsFile = createWriteStream(`${out}/errors.jsonl`, { flags: 'a' });
  const jobs: PoolJob[] = [];
  const files = new Map<string, WriteStream>();
  const keyOf: string[] = [];
  for (const cls of classes) {
    const names = personaArg === 'all' ? [...personaNames(cls), 'spike-v1'] : personaArg.split(',').filter((n) => johnnyFitsClass(n, cls));
    for (const p of names) {
      const key = `${p}-${cls}`;
      files.set(key, createWriteStream(`${out}/${key}.jsonl`, { flags: from > 0 ? 'a' : 'w' }));
      for (let i = from; i < runs; i++) {
        keyOf.push(key);
        jobs.push({ id: jobs.length, seed: `${prefix}-${i}-${cls}`, classId: cls, policy: p, mode: 'full', difficulty });
      }
    }
  }
  // Interleave personas so partial progress covers every persona.
  const span = runs - from;
  const order = [...jobs].sort((a, b) => (a.id % span) - (b.id % span) || a.id - b.id);
  console.error(`[personas] ${jobs.length} runs: ${files.size} persona-class batches x ${runs} seeds (prefix ${prefix}) on ${workers} workers -> ${out}/`);
  await runPool(
    order,
    (o) => {
      if (o.error) {
        errorsFile.write(`${JSON.stringify(o.error)}\n`);
        return;
      }
      const key = keyOf[o.id];
      const f = key === undefined ? undefined : files.get(key);
      if (!f || !o.full) throw new Error(`personas: no file for job ${o.id}`);
      f.write(`${JSON.stringify(o.full)}\n`);
    },
    { workers, overrides, label: 'personas' },
  );
  await Promise.all([...files.values(), errorsFile].map((f) => new Promise<void>((res) => f.end(res))));
  console.error(`[personas] wrote ${files.size} files to ${out}/`);
}

if (isMainThread) {
  main().catch((e: unknown) => {
    console.error(e);
    process.exitCode = 1;
  });
}
