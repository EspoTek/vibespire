/// <reference types="node" />
// Measured priors for the v2 bots, from a baseline report's CSVs.
//
//   npx tsx sim/priors.ts [--label v2-baseline] [--docs docs/balance]
//
// Run it in the tree (or worktree) whose content the baseline measured: it stores a hash of every
// card and relic definition next to its counterfactual numbers, and `lib/priors.ts` uses a prior only
// while the current definition still hashes the same. A reworked card's v1 numbers say nothing about
// the new version (docs/v2/PHASE_C.md), so it falls back to the heuristic.
// Output: <docs>/<label>-priors.json.

import { readFileSync, writeFileSync } from 'node:fs';
import { getCardDef, getRelicDef } from '../src/content';
import { cardDefHash, relicDefHash, type PriorFile } from './policies/lib/priors';

function arg(name: string, dflt: string): string {
  const i = process.argv.indexOf(`--${name}`);
  const v = i >= 0 ? process.argv[i + 1] : undefined;
  return v === undefined ? dflt : v;
}

function csv(path: string): Record<string, string>[] {
  const lines = readFileSync(path, 'utf8').trim().split('\n');
  const head = (lines[0] ?? '').split(',');
  return lines.slice(1).map((l) => {
    const cells = l.match(/("[^"]*"|[^,]*)(,|$)/g)?.map((x) => x.replace(/,$/, '')) ?? [];
    const o: Record<string, string> = {};
    head.forEach((h, i) => {
      o[h] = cells[i] ?? '';
    });
    return o;
  });
}

function main(): void {
  const label = arg('label', 'v2-baseline');
  const docs = arg('docs', 'docs/balance');
  const out: PriorFile = { label, generated: new Date().toISOString(), cards: {}, relics: {} };
  for (const r of csv(`${docs}/${label}-cards.csv`)) {
    const id = r.card;
    const cls = r.class;
    if (!id || !cls || r.persona !== 'all' || r.cf_n === '' || r.cf_n === undefined) continue;
    const entry = (out.cards[id] ??= { hash: cardDefHash(getCardDef(id)), byClass: {} });
    entry.byClass[cls] = { n: Number(r.cf_n), prog: Number(r.cf_progress), progCi: Number(r.cf_progress_ci), win: Number(r.cf_win_pts) / 100 };
  }
  for (const r of csv(`${docs}/${label}-relics.csv`)) {
    const id = r.relic;
    const cls = r.class;
    if (!id || !cls) continue;
    const entry = (out.relics[id] ??= { hash: relicDefHash(getRelicDef(id)), byClass: {} });
    entry.byClass[cls] = { n: Number(r.n), prog: Number(r.cf_progress), progCi: Number(r.cf_progress_ci), win: Number(r.cf_win_pts) / 100 };
  }
  const path = `${docs}/${label}-priors.json`;
  writeFileSync(path, `${JSON.stringify(out)}\n`);
  console.error(`[priors] ${Object.keys(out.cards).length} cards, ${Object.keys(out.relics).length} relics -> ${path}`);
}

main();
