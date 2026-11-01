/// <reference types="node" />
// Measured priors (sim/priors.ts writes them from a baseline's counterfactual CSVs).
//
// A prior applies only while the card or relic definition still hashes as it did in the measured
// tree. Text, name, icon and tags are left out of the hash (wording changes do not change power);
// effects, cost, keywords, Riposte / Delay lists, upgrade, values and hooks' names are in it. Custom
// function bodies are reduced to their names, so the same code hashes the same under tsx and the
// esbuild bundle.

import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { measuredRoot } from '../../root';
import { getCardDef, getRelicDef } from '../../../src/content';
import type { CardDef, RelicDef } from '../../../src/engine';

export interface PriorStat {
  /** Paired seeds. */
  n: number;
  /** Counterfactual progress delta (floors; a win counts +3) and its 95% half-width. */
  prog: number;
  progCi: number;
  /** Counterfactual win delta (fraction). */
  win: number;
}

export interface PriorFile {
  label: string;
  generated: string;
  cards: Record<string, { hash: string; byClass: Record<string, PriorStat> }>;
  relics: Record<string, { hash: string; byClass: Record<string, PriorStat> }>;
}

function stable(v: unknown): string {
  if (typeof v === 'function') return '"fn"';
  if (v === undefined) return 'null';
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stable(o[k])}`)
    .join(',')}}`;
}

function fnv(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16);
}

const OMIT = new Set(['text', 'name', 'icon', 'tags', 'flavor']);

function strip(def: object): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(def)) {
    if (OMIT.has(k)) continue;
    // Hook / custom tables: keep the names, not the bodies.
    if ((k === 'custom' || k === 'hooks' || k === 'triggers' || k === 'fns') && v !== null && typeof v === 'object' && !Array.isArray(v)) out[k] = Object.keys(v).sort();
    else out[k] = v;
  }
  return out;
}

export function cardDefHash(def: CardDef): string {
  return fnv(stable(strip(def)));
}

export function relicDefHash(def: RelicDef): string {
  return fnv(stable(strip(def)));
}


let loaded: PriorFile[] | undefined;

/** Default prior files, newest measurement first (docs/balance/). */
export const DEFAULT_PRIORS = ['v2-priors.json', 'v2-baseline-priors.json'];

/** Absolute path and sha256 (first 16 hex) of every loaded prior file, in lookup order. */
let loadedFiles: { path: string; sha256: string }[] = [];

/**
 * Prior files, newest measurement first: $SIM_PRIORS (comma-separated paths; 'none' = no priors on
 * purpose), else DEFAULT_PRIORS under the repo's docs/balance. A lookup takes the first file whose entry
 * still hashes like the live definition, so a card re-measured in v2 uses its v2 numbers and an untouched
 * one falls back (aged) to the baseline.
 *
 * A missing file THROWS. The prior files are untracked, so a git worktree or a copy without them used to
 * fall back silently to heuristic drafting, which put spike Chronist 25 points apart between two agents'
 * runs on the same tree (2026-10-31). Use sim/snapshot.sh, or set SIM_PRIORS explicitly.
 */
export function priorFiles(): PriorFile[] {
  if (loaded) return loaded;
  const env = process.env.SIM_PRIORS;
  if (env === 'none') {
    loadedFiles = [];
    loaded = [];
    return loaded;
  }
  // Resolved at run time against the measured tree (sim/root.ts), never the code's own location.
  const paths = (env ? env.split(',') : DEFAULT_PRIORS.map((n) => join(measuredRoot(), 'docs', 'balance', n))).map((p) => resolve(p));
  const missing = paths.filter((p) => !existsSync(p));
  if (missing.length) throw new Error(`priors: missing ${missing.join(', ')} (untracked files: run from sim/snapshot.sh or a full copy of the repo, or set SIM_PRIORS=<paths> / SIM_PRIORS=none on purpose)`);
  const texts = paths.map((p) => readFileSync(p, 'utf8'));
  loadedFiles = paths.map((path, i) => ({ path, sha256: createHash('sha256').update(texts[i] ?? '').digest('hex').slice(0, 16) }));
  loaded = texts.map((x) => JSON.parse(x) as PriorFile);
  return loaded;
}

/** What spike drafts with, for logs and report headers: label, generation time and path of each prior file. */
export function priorsDescription(): string {
  const files = priorFiles();
  if (files.length === 0) return 'none (SIM_PRIORS=none)';
  return files.map((p, i) => `${p.label} (generated ${p.generated.slice(0, 16)}, sha256 ${loadedFiles[i]?.sha256 ?? '?'}, ${loadedFiles[i]?.path ?? '?'})`).join('; ');
}

/** Loaded prior files for meta-*.json: absolute path, sha256, label and generation time, in lookup order. */
export function priorsMeta(): { path: string; sha256: string; label: string; generated: string }[] {
  const files = priorFiles();
  return files.map((p, i) => ({ path: loadedFiles[i]?.path ?? '?', sha256: loadedFiles[i]?.sha256 ?? '?', label: p.label, generated: p.generated }));
}

/** The newest prior file (what sim/v2-ids.ts compares "changed since" against), or null when there is none. */
export function priorFile(): PriorFile | null {
  return priorFiles()[0] ?? null;
}

/**
 * A prior found only in an older file was measured against a different card pool (Fixed Star's v1
 * prior predates Crescendo, which it switches off): halve the effect and double the interval, so
 * drafting and relic choices lean more on the heuristic.
 */
function aged(s: PriorStat): PriorStat {
  return { n: s.n, prog: s.prog / 2, progCi: s.progCi * 2, win: s.win / 2 };
}

/** Measured prior for a card in a class, or null (no measurement, or the card changed since every one). */
export function cardPriorOrNull(cls: string, id: string): PriorStat | null {
  const h = cardDefHash(getCardDef(id));
  const files = priorFiles();
  for (let i = 0; i < files.length; i++) {
    const s = files[i]?.cards[id]?.hash === h ? files[i]?.cards[id]?.byClass[cls] : undefined;
    if (s) return i === 0 ? s : aged(s);
  }
  return null;
}

/** Measured prior for a relic in a class, or null (no measurement, or the relic changed since every one). */
export function relicPriorOrNull(cls: string, id: string): PriorStat | null {
  const h = relicDefHash(getRelicDef(id));
  const files = priorFiles();
  for (let i = 0; i < files.length; i++) {
    const s = files[i]?.relics[id]?.hash === h ? files[i]?.relics[id]?.byClass[cls] : undefined;
    if (s) return i === 0 ? s : aged(s);
  }
  return null;
}
