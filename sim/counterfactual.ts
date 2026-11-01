/// <reference types="node" />
// Counterfactual power tests (paired seeds). For every relic (granted on floor 1, before the Ascent
// Pact) or every card (one extra copy in the starting deck), play the same seeds as a baseline run
// with nothing added. Each seed plays the same map, pacts and encounters in both arms, so the
// per-seed difference isolates the item's power from selection bias (who picks it, and when).
//
// Usage: npx tsx sim/counterfactual.ts --kind relic|card|potion [--class breaker,graft,chronist]
//        [--runs 200] [--from 0] [--policy spike] [--seed-prefix cf] [--ids a,b,...] [--skip-baseline] [--out sim/out/v2/cf-<kind>.jsonl]
//        [--workers N] [--set key=value ...] [--difficulty standard|heroic] (default standard; in the header line)
// Output: JSONL, one line per run: {cls, variant, i, r: CompactResult}. The baseline arm is variant
// '' (one per class and seed, shared by every variant). Seeds are ordered seed-major, so a batch
// stopped early still has every variant on the same first k seeds. sim/attribution.ts reads it.

import { createWriteStream, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { isMainThread } from 'node:worker_threads';
import { allCards, allClasses, allPotions, allRelics, getClassDef } from '../src/content';
import { difficultyArg, parseSets } from './overrides';
import { priorsDescription, priorsMeta } from './policies/lib/priors';
import { measuredRoot } from './root';
import { runningSrcHash } from './srchash';
import { defaultWorkers, runPool, type PoolJob } from './pool';
import type { Grant } from './run';

export type CfKind = 'relic' | 'card' | 'potion';

/** Variant ids tested for a class. */
export function variantsFor(kind: CfKind, classId: string): string[] {
  const cls = getClassDef(classId);
  switch (kind) {
    case 'relic':
      return allRelics()
        .filter((r) => r.rarity !== 'starter' && (r.cls === undefined || r.cls === classId) && !(r.excludeClasses ?? []).includes(classId) && !cls.startingRelics.includes(r.id))
        .map((r) => r.id);
    case 'card':
      return allCards()
        .filter((c) => (c.cls === classId || c.cls === 'colorless') && (c.rarity === 'common' || c.rarity === 'uncommon' || c.rarity === 'rare'))
        .map((c) => c.id);
    case 'potion':
      return allPotions().map((p) => p.id);
  }
}

export function grantFor(kind: CfKind, id: string): Grant {
  switch (kind) {
    case 'relic':
      return { relic: id };
    case 'card':
      return { cards: [id] };
    case 'potion':
      return { potion: id };
  }
}

function arg(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0) return null;
  const v = process.argv[i + 1];
  if (v === undefined || v.startsWith('--')) throw new Error(`--${name} needs a value`);
  return v;
}

async function main(): Promise<void> {
  const kind = arg('kind');
  if (kind !== 'relic' && kind !== 'card' && kind !== 'potion') throw new Error(`--kind must be relic, card or potion (got ${String(kind)})`);
  const runs = Number(arg('runs') ?? 200);
  // --from k: seeds k..runs-1 only (top up an earlier batch on the same seed set; append to its file).
  const from = Number(arg('from') ?? 0);
  if (!Number.isInteger(from) || from < 0 || from >= runs) throw new Error('--from must be an integer in [0, runs)');
  if (!Number.isInteger(runs) || runs <= 0) throw new Error('--runs must be a positive integer');
  const classes = (arg('class') ?? allClasses().map((c) => c.id).join(',')).split(',');
  const policy = arg('policy') ?? 'spike';
  const prefix = arg('seed-prefix') ?? 'cf';
  const idsArg = arg('ids');
  // --skip-baseline: re-measure variants against the baseline arm of an earlier file on the same seeds.
  const skipBaseline = process.argv.includes('--skip-baseline');
  const out = arg('out') ?? `sim/out/v2/cf-${kind}.jsonl`;
  const workersArg = arg('workers');
  const workers = workersArg === null ? defaultWorkers() : Number(workersArg);
  const overrides = parseSets(process.argv);
  const difficulty = difficultyArg(process.argv);
  const jobs: PoolJob[] = [];
  const meta: { cls: string; variant: string; i: number }[] = [];
  let variantCount = 0;
  for (const cls of classes) {
    const all = variantsFor(kind, cls);
    const vs = idsArg === null ? all : idsArg.split(',').filter((id) => all.includes(id));
    variantCount += vs.length;
    for (let i = from; i < runs; i++) {
      for (const v of skipBaseline ? vs : ['', ...vs]) {
        meta.push({ cls, variant: v, i });
        const job: PoolJob = { id: jobs.length, seed: `${prefix}-${i}-${cls}`, classId: cls, policy, mode: 'compact', difficulty };
        if (v !== '') job.grant = grantFor(kind, v);
        jobs.push(job);
      }
    }
  }
  // Seed-major across classes too: run seed i of every class before seed i+1.
  const order = jobs.map((j, k) => ({ j, m: meta[k] })).sort((a, b) => (a.m?.i ?? 0) - (b.m?.i ?? 0) || a.j.id - b.j.id).map((x) => x.j);
  mkdirSync(dirname(out), { recursive: true });
  const f = createWriteStream(out, { flags: from > 0 ? 'a' : 'w' });
  const srcHash = runningSrcHash();
  const priors = priorsDescription();
  console.error(`[cf-${kind}] src/ ${srcHash}; priors: ${priors}`);
  f.write(`${JSON.stringify({ header: true, kind, policy, difficulty, prefix, from, runs, classes, overrides, root: measuredRoot(), srcHash, priors, priorFiles: priorsMeta() })}\n`);
  console.error(`[cf-${kind}] ${jobs.length} runs: ${variantCount} variants + baseline over ${runs} paired seeds x ${classes.length} classes, policy ${policy}, ${workers} workers -> ${out}`);
  await runPool(
    order,
    (o) => {
      const m = meta[o.id];
      if (!m) throw new Error(`cf: no meta for job ${o.id}`);
      if (o.error) {
        f.write(`${JSON.stringify({ cls: m.cls, variant: m.variant, i: m.i, error: o.error })}\n`);
        return;
      }
      if (!o.compact) throw new Error(`cf: job ${o.id} returned no result`);
      f.write(`${JSON.stringify({ cls: m.cls, variant: m.variant, i: m.i, r: o.compact })}\n`);
    },
    { workers, overrides, label: `cf-${kind}` },
  );
  await new Promise<void>((res) => f.end(res));
}

const entry = process.argv[1];
if (isMainThread && entry !== undefined && /counterfactual\.(ts|mjs)$/.test(entry)) {
  main().catch((e: unknown) => {
    console.error(e);
    process.exitCode = 1;
  });
}
