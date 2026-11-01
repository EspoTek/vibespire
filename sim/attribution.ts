/// <reference types="node" />
// v2 attribution analytics and report. Reads the persona batches (sim/personas-batch.ts JSONL) and
// the counterfactual tests (sim/counterfactual.ts JSONL) from one directory and writes
//   docs/balance/report-<label>.md      the report (hand-written notes spliced in, see below)
//   docs/balance/<label>-cards.csv      every card x class x persona metric
//   docs/balance/<label>-relics.csv     every relic x class counterfactual
// Hand-written findings live in docs/balance/notes-<label>.md and are inserted after the summary,
// so re-running the generator never overwrites them.
// Usage: npx tsx sim/attribution.ts [--in sim/out/v2] [--label v2-baseline] [--ref spike] [--docs docs/balance]
//        [--standard sim/out/<std-a>[,sim/out/<std-b>]]  (Standard-tier batches: timmy/novice targets scored on the first)

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { isMainThread } from 'node:worker_threads';
import { allCards, allPotions, getCardDef, getEncounterDef, getPotionDef, getRelicDef } from '../src/content';
import { cardValue, type CardStat } from './detail';
import { runningSrcHash } from './srchash';
import { unresolvedRows, archetypesFor } from './policies/lib/matrix';
import { usableCardPriorOrNull } from './policies/lib/draft';
import type { CompactResult } from './pool';
import type { RunResult } from './types';

// ---------------------------------------------------------------------------
// Stats helpers

const mean = (xs: readonly number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
function sd(xs: readonly number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
}
const pct = (x: number, d = 1): string => `${(100 * x).toFixed(d)}%`;
const pts = (x: number, d = 1): string => `${x >= 0 ? '+' : ''}${(100 * x).toFixed(d)}`;
const num = (x: number, d = 1): string => (Number.isFinite(x) ? x.toFixed(d) : 'n/a');
const sgn = (x: number, d = 1): string => `${x >= 0 ? '+' : ''}${x.toFixed(d)}`;

/** 95% half-width of a proportion. */
const ci95p = (p: number, n: number): number => (n > 0 ? 1.96 * Math.sqrt((p * (1 - p)) / n) : NaN);

interface Paired {
  n: number;
  /** Mean paired win difference (fraction) and its 95% half-width. */
  win: number;
  winCi: number;
  /** Mean paired progress difference (floors; a win counts +3) and its 95% half-width. */
  prog: number;
  progCi: number;
}

export function paired(diffWin: readonly number[], diffProg: readonly number[]): Paired {
  const n = diffWin.length;
  return { n, win: mean(diffWin), winCi: n > 1 ? (1.96 * sd(diffWin)) / Math.sqrt(n) : NaN, prog: mean(diffProg), progCi: n > 1 ? (1.96 * sd(diffProg)) / Math.sqrt(n) : NaN };
}

/** ' **' when the 95% interval excludes 0. */
const sig = (x: number, ci: number): string => (Number.isFinite(ci) && Math.abs(x) > ci ? ' **' : '');

const progress = (r: { won: boolean; floor: number }): number => r.floor + (r.won ? 3 : 0);

function table(head: readonly string[], rows: readonly (readonly string[])[]): string {
  if (rows.length === 0) return '_none_\n';
  return [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// Loading

/** The src/ hash and priors each batch recorded (meta-*.json; batches from before 2026-10-31 have none). */
function batchMeta(dir: string): string {
  const files = readdirSync(dir).filter((x) => /^meta-\d+\.json$/.test(x)).sort();
  if (files.length === 0) return 'no meta files (batches predate src/priors stamping)';
  const metas = files.map((x) => JSON.parse(readFileSync(`${dir}/${x}`, 'utf8')) as BatchMetaFile);
  // Compare content, not paths: the same files in two snapshot folders are the same measurement.
  const kinds = new Set(metas.map((m) => `src/ ${m.srcHash}, priors ${m.priorFiles ? m.priorFiles.map((p) => `${p.label} ${p.sha256}`).join(' + ') : m.priors}, ${tierText(m)}`));
  const warn = kinds.size > 1 ? ' **WARNING: batches measured different content, priors or tiers**' : '';
  return `${[...kinds].join(' | ')}${warn}`;
}

interface BatchMetaFile {
  srcHash: string;
  priors: string;
  priorFiles?: { label: string; sha256: string }[];
  /** Difficulty tier the runs played (ruling 71); absent before the tiers existed. */
  difficulty?: string;
  overrides?: Record<string, number>;
}

function tierText(m: BatchMetaFile): string {
  const o = Object.entries(m.overrides ?? {}).map(([k, v]) => `${k}=${v}`);
  return `tier ${m.difficulty ?? 'none (pre-tier batch)'}${o.length ? ` + ${o.join(' ')}` : ''}`;
}

/** The one tier (and overrides) every batch in `dir` played; throws when the batches disagree or have no meta. */
function dirTier(dir: string): string {
  const files = readdirSync(dir).filter((x) => /^meta-\d+\.json$/.test(x));
  if (files.length === 0) throw new Error(`attribution: ${dir} has no meta-*.json, so its tier is unknown`);
  const tiers = new Set(files.map((x) => tierText(JSON.parse(readFileSync(`${dir}/${x}`, 'utf8')) as BatchMetaFile)));
  if (tiers.size > 1) throw new Error(`attribution: ${dir} mixes tiers: ${[...tiers].join(' | ')}`);
  return [...tiers][0] as string;
}

/** Reference runs per class needed to correct a counterfactual baseline arm. */
const REF_MIN = 300;

function readJsonl<T>(path: string): T[] {
  const text = readFileSync(path, 'utf8');
  const out: T[] = [];
  for (const line of text.split('\n')) if (line.trim()) out.push(JSON.parse(line) as T);
  return out;
}

interface CfLine {
  header?: true;
  cls: string;
  variant: string;
  i: number;
  r: CompactResult;
  error?: RunError;
}

interface RunError {
  seed: string;
  classId: string;
  policy: string;
  message: string;
}

interface CfVariant {
  cls: string;
  id: string;
  pairs: Paired;
  /** Mean relic triggers / card plays / card draws per run in the treated arm. */
  triggers: number;
  plays: number;
  draws: number;
  /** Treated-arm win rate. */
  winRate: number;
  /** Treated runs that threw (dropped: the estimate is biased when this is large). */
  errors: number;
}

/**
 * Load a counterfactual file. `supersede` (optional): a re-measure file on the same seeds (no baseline
 * arm, see --skip-baseline); its variants replace the main file's lines for the same class and id.
 */
function loadCf(path: string, supersede?: string): { variants: CfVariant[]; base: Map<string, { n: number; win: number; prog: number }>; seeds: number; policy: string; errors: RunError[] } {
  if (!existsSync(path)) return { variants: [], base: new Map(), seeds: 0, policy: '', errors: [] };
  const errors: RunError[] = [];
  const errorsByVariant = new Map<string, number>();
  let lines = readJsonl<CfLine>(path);
  if (supersede !== undefined && existsSync(supersede)) {
    // Only variants the re-measure has covered on at least 100 seeds replace the originals.
    const all = readJsonl<CfLine>(supersede).filter((l) => !l.header);
    const seedsOf = new Map<string, number>();
    for (const l of all) seedsOf.set(`${l.cls}|${l.variant}`, (seedsOf.get(`${l.cls}|${l.variant}`) ?? 0) + 1);
    const extra = all.filter((l) => (seedsOf.get(`${l.cls}|${l.variant}`) ?? 0) >= 100);
    const replaced = new Set(extra.map((l) => `${l.cls}|${l.variant}`));
    lines = [...lines.filter((l) => l.header || !replaced.has(`${l.cls}|${l.variant}`)), ...extra];
  }
  const header = lines.find((l) => l.header) as unknown as { policy: string } | undefined;
  const base = new Map<string, Map<number, CompactResult>>();
  const arms = new Map<string, Map<number, CompactResult>>();
  for (const l of lines) {
    if (l.header) continue;
    if (l.error) {
      errors.push(l.error);
      if (l.variant !== '') errorsByVariant.set(`${l.cls}|${l.variant}`, (errorsByVariant.get(`${l.cls}|${l.variant}`) ?? 0) + 1);
      continue;
    }
    if (l.variant === '') {
      const m = base.get(l.cls) ?? new Map<number, CompactResult>();
      m.set(l.i, l.r);
      base.set(l.cls, m);
    } else {
      const k = `${l.cls}|${l.variant}`;
      const m = arms.get(k) ?? new Map<number, CompactResult>();
      m.set(l.i, l.r);
      arms.set(k, m);
    }
  }
  const variants: CfVariant[] = [];
  let seeds = 0;
  for (const [k, m] of arms) {
    const [cls, id] = k.split('|') as [string, string];
    const b = base.get(cls);
    if (!b) throw new Error(`cf ${path}: variant ${k} without a baseline arm`);
    const dw: number[] = [];
    const dp: number[] = [];
    const tr: CompactResult[] = [];
    for (const [i, r] of m) {
      const br = b.get(i);
      if (!br) continue;
      dw.push((r.won ? 1 : 0) - (br.won ? 1 : 0));
      dp.push(progress(r) - progress(br));
      tr.push(r);
    }
    seeds = Math.max(seeds, dw.length);
    variants.push({
      cls,
      id,
      pairs: paired(dw, dp),
      triggers: mean(tr.map((r) => r.relicTriggers)),
      plays: mean(tr.map((r) => r.cardPlays)),
      draws: mean(tr.map((r) => r.cardDraws)),
      winRate: mean(tr.map((r) => (r.won ? 1 : 0))),
      errors: errorsByVariant.get(k) ?? 0,
    });
  }
  const baseOut = new Map([...base].map(([cls, m]) => [cls, { n: m.size, win: mean([...m.values()].map((r) => (r.won ? 1 : 0))), prog: mean([...m.values()].map(progress)) }]));
  return { variants, base: baseOut, seeds, policy: header?.policy ?? '', errors };
}

/** Pool a variant across classes (pairs concatenated by n-weighted means; half-widths combined). */
function pooled(vs: readonly CfVariant[]): Paired {
  const n = vs.reduce((a, v) => a + v.pairs.n, 0);
  if (n === 0) return { n: 0, win: NaN, winCi: NaN, prog: NaN, progCi: NaN };
  const w = (f: (p: Paired) => number): number => vs.reduce((a, v) => a + f(v.pairs) * v.pairs.n, 0) / n;
  const c = (f: (p: Paired) => number): number => Math.sqrt(vs.reduce((a, v) => a + (f(v.pairs) * v.pairs.n) ** 2, 0)) / n;
  return { n, win: w((p) => p.win), winCi: c((p) => p.winCi), prog: w((p) => p.prog), progCi: c((p) => p.progCi) };
}

// ---------------------------------------------------------------------------
// Persona runs

interface Batch {
  persona: string;
  cls: string;
  runs: RunResult[];
}

function loadBatches(dir: string): Batch[] {
  const out: Batch[] = [];
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.jsonl') && !x.startsWith('cf-') && x !== 'errors.jsonl').sort()) {
    // Persona names contain dashes (johnny-swing): the class is the last dash-separated token.
    const base = f.slice(0, -'.jsonl'.length);
    const cut = base.lastIndexOf('-');
    if (cut <= 0) throw new Error(`attribution: cannot parse batch file name ${f} (want <persona>-<class>.jsonl)`);
    out.push({ persona: base.slice(0, cut), cls: base.slice(cut + 1), runs: readJsonl<RunResult>(`${dir}/${f}`) });
  }
  return out;
}

const winRate = (rs: readonly RunResult[]): number => mean(rs.map((r) => (r.won ? 1 : 0)));
const actOf = (floor: number): number => (floor <= 17 ? 1 : floor <= 34 ? 2 : 3);

interface PersonaRow {
  persona: string;
  cls: string;
  n: number;
  win: number;
  floor: number;
  beatA1: number;
  beatA2: number;
  deathAct: number[];
  topDeaths: string;
  dmgPerFight: number;
  skip: number;
  deck: number;
  elites: number;
  removals: number;
  stalemates: number;
  topMoves: string;
}

function encName(id: string): string {
  return getEncounterDef(id).id.replace(/^enc_/, '');
}

function personaRow(b: Batch): PersonaRow {
  const rs = b.runs;
  const n = rs.length;
  const deaths = rs.filter((r) => !r.won);
  const deathAct = [1, 2, 3].map((a) => (deaths.length ? deaths.filter((r) => r.act === a).length / deaths.length : 0));
  const de = new Map<string, number>();
  for (const r of deaths) if (r.deathEncounter) de.set(r.deathEncounter, (de.get(r.deathEncounter) ?? 0) + 1);
  const topDeaths = [...de.entries()].sort((a, c) => c[1] - a[1]).slice(0, 3).map(([e, k]) => `${encName(e)} ${pct(k / Math.max(1, deaths.length), 0)}`).join(', ');
  const mv = new Map<string, number>();
  for (const r of rs) for (const [k, v] of Object.entries(r.detail.moveDamage)) mv.set(k, (mv.get(k) ?? 0) + v);
  const totalDmg = [...mv.values()].reduce((a, c) => a + c, 0);
  const topMoves = [...mv.entries()].sort((a, c) => c[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} ${pct(v / Math.max(1, totalDmg), 0)}`).join(', ');
  const screens = rs.reduce((a, r) => a + r.screens.length, 0);
  const skipped = rs.reduce((a, r) => a + r.screens.filter((s) => s.picked === null).length, 0);
  return {
    persona: b.persona,
    cls: b.cls,
    n,
    win: winRate(rs),
    floor: mean(rs.map((r) => r.floorReached)),
    beatA1: mean(rs.map((r) => (r.won || r.floorReached > 17 ? 1 : 0))),
    beatA2: mean(rs.map((r) => (r.won || r.floorReached > 34 ? 1 : 0))),
    deathAct,
    topDeaths,
    dmgPerFight: mean(rs.flatMap((r) => r.combats.map((c) => c.damageTaken))),
    skip: screens ? skipped / screens : 0,
    deck: mean(rs.map((r) => r.deckEnd.length)),
    elites: mean(rs.map((r) => r.combats.filter((c) => c.room === 'elite').length)),
    removals: mean(rs.map((r) => r.removals.length)),
    stalemates: rs.filter((r) => r.endCause === 'stalemate').length,
    topMoves,
  };
}

// ---------------------------------------------------------------------------
// Card attribution

interface CardRow {
  id: string;
  cls: string;
  persona: string;
  runs: number;
  offerRate: number;
  offers: number;
  pickRate: number;
  /** Floor-stratified win delta, picked vs offered-and-not-picked (fraction) and its 95% half-width. */
  pickDelta: number;
  pickDeltaCi: number;
  drawn: number;
  played: number;
  playsPerDraw: number;
  valuePerPlay: number;
  valuePerEnergy: number;
}

/** Mantel-Haenszel style stratified difference of win rates (strata: persona x 6-floor bucket). */
export function stratifiedDelta(obs: readonly { floor: number; picked: boolean; won: boolean; persona?: string }[]): { d: number; ci: number } {
  const strata = new Map<string, { n1: number; w1: number; n0: number; w0: number }>();
  for (const o of obs) {
    // Strata: persona x 6-floor bucket, so a card that losing personas favour does not look weak.
    const k = `${o.persona ?? ''}|${Math.floor(o.floor / 6)}`;
    const s = strata.get(k) ?? { n1: 0, w1: 0, n0: 0, w0: 0 };
    if (o.picked) {
      s.n1 += 1;
      s.w1 += o.won ? 1 : 0;
    } else {
      s.n0 += 1;
      s.w0 += o.won ? 1 : 0;
    }
    strata.set(k, s);
  }
  let num0 = 0;
  let den = 0;
  let varSum = 0;
  for (const s of strata.values()) {
    if (s.n1 === 0 || s.n0 === 0) continue;
    const w = (s.n1 * s.n0) / (s.n1 + s.n0);
    const p1 = s.w1 / s.n1;
    const p0 = s.w0 / s.n0;
    num0 += w * (p1 - p0);
    den += w;
    // Add-half smoothing so an all-win or all-loss stratum still carries variance.
    const q1 = (s.w1 + 0.5) / (s.n1 + 1);
    const q0 = (s.w0 + 0.5) / (s.n0 + 1);
    varSum += w * w * ((q1 * (1 - q1)) / s.n1 + (q0 * (1 - q0)) / s.n0);
  }
  if (den === 0) return { d: NaN, ci: NaN };
  return { d: num0 / den, ci: (1.96 * Math.sqrt(varSum)) / den };
}

function cardRows(batches: readonly Batch[], persona: string | null): CardRow[] {
  const rows: CardRow[] = [];
  const byCls = new Map<string, { r: RunResult; persona: string }[]>();
  for (const b of batches) {
    if (persona !== null && b.persona !== persona) continue;
    if (b.persona === 'greedy') continue;
    byCls.set(b.cls, [...(byCls.get(b.cls) ?? []), ...b.runs.map((r) => ({ r, persona: b.persona }))]);
  }
  for (const [cls, tagged] of byCls) {
    const rs = tagged.map((x) => x.r);
    const ids = allCards().filter((c) => (c.cls === cls || c.cls === 'colorless') && c.rarity !== 'starter' && c.rarity !== 'special').map((c) => c.id);
    const starters = allCards().filter((c) => c.cls === cls && c.rarity === 'starter').map((c) => c.id);
    for (const id of [...starters, ...ids]) {
      const obs: { floor: number; picked: boolean; won: boolean; persona: string }[] = [];
      let offers = 0;
      let picks = 0;
      const agg: CardStat = { drawn: 0, played: 0, energy: 0, dmg: 0, block: 0, guard: 0, debuff: 0, cardsDrawn: 0, energyGained: 0, triggers: 0 };
      for (const { r, persona: who } of tagged) {
        for (const s of r.screens) {
          if (!s.offered.includes(id)) continue;
          offers += 1;
          const picked = s.picked === id;
          if (picked) picks += 1;
          obs.push({ floor: s.floor, picked, won: r.won, persona: who });
        }
        const c = r.detail.cards[id];
        if (c) for (const k of Object.keys(agg) as (keyof CardStat)[]) agg[k] += c[k];
      }
      const { d, ci } = stratifiedDelta(obs);
      rows.push({
        id,
        cls,
        persona: persona ?? 'all',
        runs: rs.length,
        offers,
        offerRate: offers / rs.length,
        pickRate: offers ? picks / offers : NaN,
        pickDelta: d,
        pickDeltaCi: ci,
        drawn: agg.drawn,
        played: agg.played,
        playsPerDraw: agg.drawn ? agg.played / agg.drawn : NaN,
        valuePerPlay: agg.played ? cardValue(agg) / agg.played : NaN,
        // 0-cost plays count 0.5 energy (a card slot is not free), so 0-cost cards stay comparable.
        valuePerEnergy: agg.played ? cardValue(agg) / Math.max(agg.energy, 0.5 * agg.played) : NaN,
      });
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Report

function cardLabel(id: string): string {
  const d = getCardDef(id);
  return `${d.name} (\`${id}\`, ${d.rarity[0]?.toUpperCase() ?? ''} ${d.type} ${d.cost === null ? '-' : String(d.cost)})`;
}

function relicLabel(id: string): string {
  const d = getRelicDef(id);
  return `${d.name} (\`${id}\`, ${d.rarity}${d.cls ? `, ${d.cls}` : ''})`;
}

function archOf(cls: string, id: string): string {
  if (getCardDef(id).cls === 'colorless') return 'colourless';
  const names = archetypesFor(cls)
    .filter((a) => (a.cards.get(id) ?? 0) >= 1)
    .map((a) => a.code);
  return names.join('') || '-';
}

function main(): void {
  const arg = (name: string, dflt: string): string => {
    const i = process.argv.indexOf(`--${name}`);
    const v = i >= 0 ? process.argv[i + 1] : undefined;
    return v === undefined ? dflt : v;
  };
  const dir = arg('in', 'sim/out/v2');
  const label = arg('label', 'v2-baseline');
  const ref = arg('ref', 'spike');
  // --docs: where the report, CSVs and notes live (default docs/balance of the current directory).
  const docs = arg('docs', 'docs/balance');
  // --standard dirA[,dirB]: persona batches played on the Standard tier (ruling 71). The timmy and novice
  // targets are scored on dirA (the shipped Standard values); every dir gets a row in the Standard table.
  const standardDirs = arg('standard', '').split(',').filter(Boolean);
  const t0 = Date.now();
  console.error(`[attribution] loading persona batches from ${dir}/`);
  const batches = loadBatches(dir);
  if (batches.length === 0) throw new Error(`attribution: no persona batches in ${dir}`);
  console.error(`[attribution] ${batches.length} batches, ${batches.reduce((a, b) => a + b.runs.length, 0)} runs (${((Date.now() - t0) / 1000).toFixed(1)}s); loading counterfactuals`);
  const cfRelic = loadCf(`${dir}/cf-relic.jsonl`, `${dir}/cf-relic-event.jsonl`);
  const cfCard = loadCf(`${dir}/cf-card.jsonl`);
  // Baseline-arm correction. Every variant of a class is paired against the same baseline arm, so
  // that arm's sampling luck shifts every Δ of the class together (v2: the Chronist arm won 64% on
  // 25 seeds against 52.6% over 1000 spike runs, which made every Chronist card look 11 points
  // worse). When the reference persona has at least REF_MIN runs of a class, each variant's Δwin
  // and Δprog are corrected by (baseline arm − reference rate). The offsets are listed in the report.
  const refStats = new Map<string, { n: number; win: number; prog: number }>();
  for (const b of batches) {
    if (b.persona !== ref || b.runs.length < REF_MIN) continue;
    refStats.set(b.cls, { n: b.runs.length, win: winRate(b.runs), prog: mean(b.runs.map((r) => progress({ won: r.won, floor: r.floorReached }))) });
  }
  const offsets: string[] = [];
  for (const [name, cf] of [['relic', cfRelic], ['card', cfCard]] as const) {
    for (const [cls, b] of cf.base) {
      const r = refStats.get(cls);
      if (!r) continue;
      const dw = b.win - r.win;
      const dp = b.prog - r.prog;
      for (const v of cf.variants) {
        if (v.cls !== cls) continue;
        v.pairs.win += dw;
        v.pairs.prog += dp;
      }
      offsets.push(`${name} ${cls}: baseline arm ${pct(b.win)} vs ${ref} ${pct(r.win)} over ${r.n} runs (each Δ corrected by ${pts(dw)} win, ${sgn(dp)} floors)`);
    }
  }
  console.error(`[attribution] cf relic: ${cfRelic.variants.length} variants x ${cfRelic.seeds} seeds; cf card: ${cfCard.variants.length} variants x ${cfCard.seeds} seeds`);
  const classes = [...new Set(batches.map((b) => b.cls))];
  const personas = [...new Set(batches.map((b) => b.persona))];
  const out: string[] = [];
  const P = (s: string): void => {
    out.push(s);
  };
  const date = new Date().toISOString().slice(0, 10);
  P(`# Balance report: ${label}\n`);
  P(`Generated ${date} by \`sim/attribution.ts\` from \`${dir}/\`. Personas: ${personas.join(', ')}. Reference persona for card and encounter tables: **${ref}**. Real \`TUNING\` levers (no neutral-tuning setup). Report rendered from \`src/\` \`${runningSrcHash()}\` (\`${process.cwd()}\`). Batches: ${batchMeta(dir)}. Re-run: \`sh sim/v2-baseline.sh\` (see docs/balance/README.md).\n`);
  const runsPer = new Map(batches.map((b) => [`${b.persona}|${b.cls}`, b.runs.length]));
  P(`Persona batches: ${batches.length} (${[...new Set(runsPer.values())].join('/')} runs each, seeds \`v2-<i>-<class>\`, paired across personas). Counterfactual relics: ${cfRelic.variants.length} relic x class variants on ${cfRelic.seeds} paired seeds (policy ${cfRelic.policy || 'n/a'}). Counterfactual cards: ${cfCard.variants.length} card x class variants on ${cfCard.seeds} paired seeds.\n`);
  const drift = [...unresolvedRows.entries()].map(([c, rows]) => `${c}: ${rows.join(', ')}`);
  if (drift.length) P(`Archetype-matrix rows that name no current card (doc drift, ignored by the johnny bots): ${drift.join('; ')}.\n`);
  if (offsets.length) P(`Counterfactual Δs are corrected for each baseline arm's sampling luck against the ${ref} rate (every variant of a class shares its arm): ${offsets.join('; ')}.\n`);

  // --- personas
  P(`## 1. Win rate by personality\n`);
  P(`Win rate with its 95% half-width. "Beat A1/A2" = runs past the act boss. Deaths by act are shares of the losses. Every persona plays the same seeds.\n`);
  const prows = batches.map(personaRow);
  for (const cls of classes) {
    P(`### ${cls}\n`);
    P(
      table(
        ['persona', 'runs', 'win', 'beat A1', 'beat A2', 'deaths A1/A2/A3', 'HP lost / fight', 'skip rate', 'deck at end', 'elites / run', 'removals / run', 'stalemates', 'top death encounters'],
        prows
          .filter((r) => r.cls === cls)
          .sort((a, b) => b.win - a.win)
          .map((r) => [r.persona, String(r.n), `${pct(r.win)} ±${num(100 * ci95p(r.win, r.n))}`, pct(r.beatA1, 0), pct(r.beatA2, 0), r.deathAct.map((x) => pct(x, 0)).join(' / '), num(r.dmgPerFight), pct(r.skip, 0), num(r.deck), num(r.elites), num(r.removals), String(r.stalemates), r.topDeaths]),
      ),
    );
    P(`Damage sources (share of all HP lost, top 3 enemy moves) per persona:\n`);
    P(table(['persona', 'top moves'], prows.filter((r) => r.cls === cls).map((r) => [r.persona, r.topMoves])));
  }

  // --- engines (v2 runs carry RunResult.engines; v1-era files do not)
  const engineRuns = batches.filter((b) => b.runs.some((r) => hasEngines(r)));
  if (engineRuns.length) {
    P(`## 1b. Engines\n`);
    P(`Per class engine, over every persona except greedy: share of runs that drafted a piece (starters excluded), share that assembled it (a multiplier + 2 pieces; 3 pieces with a payoff when no multiplier is tagged; 3 pieces without role tags; tagged starter cards count, per the class design docs), median assembly floor, and win rate of runs that took a piece and assembled it vs took a piece and did not. **johnny** = the johnny-<engine> bot's win rate. Target (PHASE_C): every engine viable, johnny >= 25%; assembled engines win clearly more (class design docs: +10 to +25 points).\n`);
    for (const cls of classes) {
      const rs = batches.filter((b) => b.cls === cls && b.persona !== 'greedy').flatMap((b) => b.runs).filter(hasEngines);
      if (rs.length === 0) continue;
      const names = [...new Set(rs.flatMap((r) => [...Object.keys(r.engines.firstPiece), ...Object.keys(r.engines.assembled)]))].sort();
      P(`### ${cls}\n`);
      P(
        table(
          ['engine', 'drafted a piece', 'assembled', 'median floor', 'win assembled', 'win piece, not assembled', 'Δ', 'johnny'],
          names.map((n) => {
            const piece = rs.filter((r) => r.engines.firstPiece[n] !== undefined);
            const asm = piece.filter((r) => r.engines.assembled[n] !== undefined);
            const not = piece.filter((r) => r.engines.assembled[n] === undefined);
            const floors = asm.map((r) => r.engines.assembled[n] ?? 0);
            const jb = batches.find((b) => b.cls === cls && b.persona === `johnny-${n}`);
            return [n, pct(piece.length / rs.length, 0), pct(asm.length / rs.length, 0), floors.length ? String(median(floors)) : '-', asm.length ? `${pct(winRate(asm))} (${asm.length})` : '-', not.length ? pct(winRate(not)) : '-', asm.length && not.length ? pts(winRate(asm) - winRate(not)) : '-', jb ? `${pct(winRate(jb.runs))} ±${num(100 * ci95p(winRate(jb.runs), jb.runs.length))}` : '-'];
          }),
        ),
      );
    }
    P(`### Mechanic telemetry (${ref})\n`);
    P(`Per run: event counts for the v2 mechanics, the mean per-combat peak of each player status, the largest single-turn damage and the floor of the first 60-damage turn (an engine "pop").\n`);
    for (const cls of classes) {
      const rs = batches.filter((b) => b.cls === cls && b.persona === ref).flatMap((b) => b.runs).filter(hasEngines);
      if (rs.length === 0) continue;
      const ev = new Map<string, number>();
      const peaks = new Map<string, { sum: number; combats: number; max: number }>();
      for (const r of rs) {
        for (const [k, v] of Object.entries(r.detail.eventCounts)) ev.set(k, (ev.get(k) ?? 0) + v);
        for (const [k, v] of Object.entries(r.detail.statusPeaks)) {
          const p = peaks.get(k) ?? { sum: 0, combats: 0, max: 0 };
          p.sum += v.sum;
          p.combats += v.combats;
          p.max = Math.max(p.max, v.max);
          peaks.set(k, p);
        }
      }
      const pop = rs.filter((r) => r.detail.firstFloor60 !== null).map((r) => r.detail.firstFloor60 ?? 0);
      const mech = ['guard_shed', 'next_turn_bank', 'timeline_gathered', 'beat_shift', 'timeline_resolved', 'riposte_triggered', 'bloom', 'cap_hit'].filter((k) => ev.has(k));
      P(`**${cls}**: events per run: ${mech.map((k) => `${k} ${num((ev.get(k) ?? 0) / rs.length)}`).join(', ') || 'none'}. Largest single-turn damage: median ${median(rs.map((r) => r.detail.maxTurnDamage))}, p90 ${quantile(rs.map((r) => r.detail.maxTurnDamage), 0.9)}. Runs with a 60-damage turn: ${pct(pop.length / rs.length, 0)}, first at floor ${pop.length ? median(pop) : '-'} (median).\n`);
      P(table(['player status', 'combats', 'mean peak', 'max'], [...peaks.entries()].sort((a, b) => b[1].combats - a[1].combats).slice(0, 12).map(([k, p]) => [k, String(p.combats), num(p.sum / Math.max(1, p.combats)), String(p.max)])));
    }
  }

  // --- encounters
  P(`## 2. Encounter difficulty (${ref})\n`);
  P(`Per fight: deaths per fight, mean HP lost (and as % of max HP, and per class), and mean turns. Sorted by act, then deaths per fight.\n`);
  const refRuns = batches.filter((b) => b.persona === ref).flatMap((b) => b.runs);
  interface EncAgg {
    act: number;
    room: string;
    fights: number;
    deaths: number;
    dmg: number[];
    pct: number[];
    turns: number[];
    byCls: Map<string, number[]>;
  }
  const enc = new Map<string, EncAgg>();
  for (const r of refRuns) {
    r.combats.forEach((c) => {
      const e: EncAgg = enc.get(c.encounterId) ?? { act: c.act, room: c.room, fights: 0, deaths: 0, dmg: [], pct: [], turns: [], byCls: new Map<string, number[]>() };
      e.fights += 1;
      if (!c.won) e.deaths += 1;
      e.dmg.push(c.damageTaken);
      e.pct.push(c.damageTaken / c.maxHp);
      e.turns.push(c.turns);
      e.byCls.set(r.classId, [...(e.byCls.get(r.classId) ?? []), c.damageTaken]);
      enc.set(c.encounterId, e);
    });
  }
  P(
    table(
      ['encounter', 'act', 'room', 'fights', 'deaths / fight', 'HP lost', 'HP lost % max', ...classes.map((c) => `HP lost ${c}`), 'turns'],
      [...enc.entries()]
        .sort((a, b) => a[1].act - b[1].act || b[1].deaths / b[1].fights - a[1].deaths / a[1].fights)
        .map(([id, e]) => [encName(id), String(e.act), e.room, String(e.fights), pct(e.deaths / e.fights), num(mean(e.dmg)), pct(mean(e.pct), 0), ...classes.map((c) => num(mean(e.byCls.get(c) ?? []))), num(mean(e.turns))]),
    ),
  );
  const mv = new Map<string, number>();
  for (const r of refRuns) for (const [k, v] of Object.entries(r.detail.moveDamage)) mv.set(k, (mv.get(k) ?? 0) + v);
  const mvTotal = [...mv.values()].reduce((a, c) => a + c, 0);
  P(`Top 20 enemy moves by HP dealt (${ref}, all classes; share of all HP lost; HP per run):\n`);
  P(table(['move', 'share', 'HP / run'], [...mv.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([k, v]) => [`\`${k}\``, pct(v / mvTotal), num(v / refRuns.length)])));
  P(`Floor of death (${ref}), 3-floor buckets, share of losses per class:\n`);
  const buckets = Array.from({ length: 17 }, (_, i) => i);
  P(
    table(
      ['class', ...buckets.map((b) => `${b * 3 + 1}-${b * 3 + 3}`)],
      classes.map((c) => {
        const ls = refRuns.filter((r) => r.classId === c && !r.won);
        return [c, ...buckets.map((b) => (ls.length ? pct(ls.filter((r) => Math.floor((r.floorReached - 1) / 3) === b).length / ls.length, 0) : '-'))];
      }),
    ),
  );

  // --- cards
  const pooledRows = cardRows(batches, null);
  const refRows = cardRows(batches, ref);
  const perPersona = personas.filter((p) => p !== 'greedy').flatMap((p) => cardRows(batches, p));
  const cfCardBy = new Map(cfCard.variants.map((v) => [`${v.cls}|${v.id}`, v]));
  const csv: string[] = ['class,card,name,rarity,type,cost,archetypes,persona,runs,offers,offer_rate,pick_rate,pick_delta_pts,pick_delta_ci,drawn,played,plays_per_draw,value_per_play,value_per_energy,cf_n,cf_win_pts,cf_win_ci,cf_progress,cf_progress_ci,cf_plays_per_run'];
  for (const r of [...pooledRows, ...perPersona]) {
    const d = getCardDef(r.id);
    const cf = cfCardBy.get(`${r.cls}|${r.id}`);
    csv.push([r.cls, r.id, JSON.stringify(d.name), d.rarity, d.type, String(d.cost), archOf(r.cls, r.id), r.persona, r.runs, r.offers, r.offerRate.toFixed(3), num(r.pickRate, 3), num(100 * r.pickDelta, 1), num(100 * r.pickDeltaCi, 1), r.drawn, r.played, num(r.playsPerDraw, 3), num(r.valuePerPlay, 2), num(r.valuePerEnergy, 2), cf?.pairs.n ?? '', cf ? num(100 * cf.pairs.win, 1) : '', cf ? num(100 * cf.pairs.winCi, 1) : '', cf ? num(cf.pairs.prog, 2) : '', cf ? num(cf.pairs.progCi, 2) : '', cf ? num(cf.plays, 2) : ''].join(','));
  }
  writeFileSync(`${docs}/${label}-cards.csv`, `${csv.join('\n')}\n`);

  P(`## 3. Cards\n`);
  P(`Columns: **cf Δwin / Δprog**: counterfactual, one extra copy in the starting deck vs the same seeds without it (${cfCard.policy || 'n/a'}; Δprog = floors gained, a win counts +3), with 95% half-widths; ** marks an interval that excludes 0. **pick Δ**: win rate of runs that picked the card minus runs offered it that did not, stratified by persona × 6-floor bucket (all personas but greedy; still selection-biased, compare with cf). **plays/draw**: plays per copy drawn (low = dead card). **value/E**: realised value per energy paid (0-cost plays count 0.5 energy; damage + 0.9 Block + Guard + debuff stacks + 3 per card drawn + 4.5 per energy gained; Powers and Rot appliers are under-credited because later ticks belong to no card). Pick rates are per persona; "all" pools every persona except greedy.\n`);
  const pickBy = (persona: string, cls: string, id: string): string => {
    const r = perPersona.find((x) => x.persona === persona && x.cls === cls && x.id === id);
    return r && r.offers > 0 ? pct(r.pickRate, 0) : '-';
  };
  const cardTable = (cls: string, ids: readonly string[]): string => {
    const shown = ['spike', 'timmy', 'turtle', 'novice'].filter((p) => personas.includes(p));
    return table(
      ['card', 'arch', 'cf Δwin', 'cf Δprog', 'pick Δ', 'offer/run', ...shown.map((p) => `pick ${p}`), 'plays/draw', 'value/E', 'value/play'],
      ids.map((id) => {
        const r = pooledRows.find((x) => x.cls === cls && x.id === id);
        const cf = cfCardBy.get(`${cls}|${id}`);
        if (!r) throw new Error(`no pooled row for ${cls} ${id}`);
        return [
          cardLabel(id),
          archOf(cls, id),
          cf ? `${pts(cf.pairs.win)} ±${num(100 * cf.pairs.winCi, 0)}${sig(cf.pairs.win, cf.pairs.winCi)}` : '-',
          cf ? `${sgn(cf.pairs.prog)} ±${num(cf.pairs.progCi)}${sig(cf.pairs.prog, cf.pairs.progCi)}` : '-',
          Number.isFinite(r.pickDelta) ? `${pts(r.pickDelta)} ±${num(100 * r.pickDeltaCi, 0)}` : '-',
          num(r.offerRate, 2),
          ...shown.map((p) => pickBy(p, cls, id)),
          num(r.playsPerDraw, 2),
          num(r.valuePerEnergy),
          num(r.valuePerPlay),
        ];
      }),
    );
  };
  /** Rank key: counterfactual progress delta when measured, else the pick delta (scaled). */
  const power = (cls: string, id: string): number => {
    const cf = cfCardBy.get(`${cls}|${id}`);
    if (cf && cf.pairs.n >= 10) return cf.pairs.prog;
    const r = pooledRows.find((x) => x.cls === cls && x.id === id);
    return r && Number.isFinite(r.pickDelta) ? 10 * r.pickDelta : 0;
  };
  for (const cls of classes) {
    const ids = allCards().filter((c) => c.cls === cls && c.rarity !== 'starter').map((c) => c.id);
    const ranked = [...ids].sort((a, b) => power(cls, a) - power(cls, b));
    P(`### ${cls}: 15 weakest\n`);
    P(cardTable(cls, ranked.slice(0, 15)));
    P(`### ${cls}: 15 strongest\n`);
    P(cardTable(cls, ranked.slice(-15).reverse()));
  }
  const colorless = allCards().filter((c) => c.cls === 'colorless').map((c) => c.id);
  const colPower = (id: string): number => mean(classes.map((c) => power(c, id)));
  const colRanked = [...colorless].sort((a, b) => colPower(a) - colPower(b));
  P(`### Colourless (cf pooled over the classes; per-class columns in the CSV)\n`);
  P(
    table(
      ['card', 'cf Δwin (pooled)', 'cf Δprog (pooled)', ...classes.map((c) => `Δprog ${c}`), 'offer/run', 'pick (all)', 'plays/draw', 'value/E'],
      colRanked.map((id) => {
        const vs = classes.map((c) => cfCardBy.get(`${c}|${id}`)).filter((v): v is CfVariant => v !== undefined);
        const p = pooled(vs);
        const rs = pooledRows.filter((x) => x.id === id);
        const offers = rs.reduce((a, r) => a + r.offers, 0);
        const picks = rs.reduce((a, r) => a + (Number.isFinite(r.pickRate) ? r.pickRate * r.offers : 0), 0);
        const drawn = rs.reduce((a, r) => a + r.drawn, 0);
        const played = rs.reduce((a, r) => a + r.played, 0);
        return [
          cardLabel(id),
          vs.length ? `${pts(p.win)} ±${num(100 * p.winCi, 0)}` : '-',
          vs.length ? `${sgn(p.prog)} ±${num(p.progCi)}` : '-',
          ...classes.map((c) => {
            const v = cfCardBy.get(`${c}|${id}`);
            return v ? sgn(v.pairs.prog) : '-';
          }),
          num(offers / Math.max(1, rs.reduce((a, r) => a + r.runs, 0)), 2),
          offers ? pct(picks / offers, 0) : '-',
          drawn ? num(played / drawn, 2) : '-',
          num(mean(rs.map((r) => r.valuePerEnergy).filter(Number.isFinite))),
        ];
      }),
    ),
  );
  P(`Weakest colourless: ${colRanked.slice(0, 15).map((id) => getCardDef(id).name).join(', ')}. Strongest: ${colRanked.slice(-15).reverse().map((id) => getCardDef(id).name).join(', ')}.\n`);

  // --- relics
  P(`## 4. Relics (counterfactual: granted on floor 1)\n`);
  P(`Each relic is granted before the Ascent Pact and the run is replayed on the same seeds as the no-relic baseline (${cfRelic.policy || 'n/a'}). Pooled = every class the relic can drop for. **triggers/run**: \`relic_trigger\` events in the treated runs (0 = never flashed: a passive modifier or a relic that never fires; check). **held Δ**: the v1-style observational delta (runs ending with the relic minus runs without, ${ref}), shown to expose its survivorship bias.\n`);
  const relicIds = [...new Set(cfRelic.variants.map((v) => v.id))];
  const held = (id: string): number => {
    const w = refRuns.filter((r) => r.relics.includes(id));
    const wo = refRuns.filter((r) => !r.relics.includes(id));
    return w.length && wo.length ? winRate(w) - winRate(wo) : NaN;
  };
  const relicRows = relicIds.map((id) => {
    const vs = cfRelic.variants.filter((v) => v.id === id);
    return { id, vs, p: pooled(vs), trig: mean(vs.map((v) => v.triggers)) };
  });
  const relicTable = (rows: typeof relicRows): string =>
    table(
      ['relic', 'cf Δwin pooled', 'cf Δprog pooled', ...classes.map((c) => `Δwin ${c}`), 'triggers/run', `held Δ (${ref})`],
      rows.map((r) => [
        relicLabel(r.id),
        `${pts(r.p.win)} ±${num(100 * r.p.winCi, 0)}${sig(r.p.win, r.p.winCi)}`,
        `${sgn(r.p.prog)} ±${num(r.p.progCi)}${sig(r.p.prog, r.p.progCi)}`,
        ...classes.map((c) => {
          const v = r.vs.find((x) => x.cls === c);
          return v ? `${pts(v.pairs.win, 0)} ±${num(100 * v.pairs.winCi, 0)}` : '-';
        }),
        `${num(r.trig)}${r.vs.some((v) => v.errors > 0) ? ` (⚠ ${r.vs.reduce((a, v) => a + v.errors, 0)} runs threw)` : ''}`,
        Number.isFinite(held(r.id)) ? pts(held(r.id)) : '-',
      ]),
    );
  const byPower = [...relicRows].sort((a, b) => b.p.prog - a.p.prog);
  P(`### 15 most overpowered\n`);
  P(relicTable(byPower.slice(0, 15)));
  P(`### 15 weakest\n`);
  P(relicTable(byPower.slice(-15).reverse()));
  if (cfRelic.base.size) P(`Baseline arm win rate: ${[...cfRelic.base.entries()].map(([c, b]) => `${c} ${pct(b.win)} (${b.n} seeds)`).join(', ')}.\n`);
  const rcsv = ['relic,name,rarity,cls,class,n,cf_win_pts,cf_win_ci,cf_progress,cf_progress_ci,triggers_per_run,treated_win_rate'];
  for (const v of cfRelic.variants) {
    const d = getRelicDef(v.id);
    rcsv.push([v.id, JSON.stringify(d.name), d.rarity, d.cls ?? 'any', v.cls, v.pairs.n, num(100 * v.pairs.win, 1), num(100 * v.pairs.winCi, 1), num(v.pairs.prog, 2), num(v.pairs.progCi, 2), num(v.triggers, 2), num(v.winRate, 3)].join(','));
  }
  writeFileSync(`${docs}/${label}-relics.csv`, `${rcsv.join('\n')}\n`);
  const allRelicCi = relicRows.map((r) => r.p.winCi).filter(Number.isFinite);
  const perClassCi = cfRelic.variants.map((v) => v.pairs.winCi).filter(Number.isFinite);
  P(`CI achieved: per relic x class Δwin 95% half-width median ${num(100 * median(perClassCi))} pts; pooled over classes median ${num(100 * median(allRelicCi))} pts; Δprog pooled median ±${num(median(relicRows.map((r) => r.p.progCi).filter(Number.isFinite)))} floors.\n`);
  const neverRelics = relicRows.filter((r) => r.trig === 0);
  P(`Relics with 0 triggers in every treated run: ${neverRelics.length ? neverRelics.map((r) => `\`${r.id}\``).join(', ') : 'none'}.\n`);
  const cfCardCi = cfCard.variants.map((v) => v.pairs.winCi).filter(Number.isFinite);
  if (cfCardCi.length) P(`Card counterfactual CI achieved: Δwin 95% half-width median ${num(100 * median(cfCardCi))} pts per card x class; Δprog median ±${num(median(cfCard.variants.map((v) => v.pairs.progCi).filter(Number.isFinite)))} floors.\n`);

  // --- potions
  P(`## 5. Potions (${ref}, observational)\n`);
  P(`Gained and used per 100 runs, the share used in boss / elite / hallway fights, and the share of gained potions that were used.\n`);
  const potRows = allPotions().map((pd) => {
    let gained = 0;
    let used = 0;
    const kind: Record<string, number> = {};
    for (const r of refRuns) {
      gained += r.detail.potionsGained[pd.id] ?? 0;
      const u = r.detail.potions[pd.id];
      if (u) {
        used += u.used;
        for (const [k, v] of Object.entries(u.byKind)) kind[k] = (kind[k] ?? 0) + (v ?? 0);
      }
    }
    return { id: pd.id, gained, used, kind };
  });
  P(
    table(
      ['potion', 'gained / 100 runs', 'used / 100 runs', 'used / gained', 'boss / elite / monster'],
      potRows
        .sort((a, b) => b.used - a.used)
        .map((r) => [`${getPotionDef(r.id).name} (\`${r.id}\`)`, num((100 * r.gained) / refRuns.length), num((100 * r.used) / refRuns.length), r.gained ? pct(r.used / r.gained, 0) : '-', `${pct((r.kind.boss ?? 0) / Math.max(1, r.used), 0)} / ${pct((r.kind.elite ?? 0) / Math.max(1, r.used), 0)} / ${pct((r.kind.monster ?? 0) / Math.max(1, r.used), 0)}`]),
    ),
  );

  // --- flags
  P(`## 6. Bug flags\n`);
  const zeroCards = pooledRows.filter((r) => r.played >= 20 && r.valuePerPlay === 0 && getCardDef(r.id).type !== 'power');
  P(`- Cards played ≥ 20 times with zero realised value per play (not Powers): ${zeroCards.length ? zeroCards.map((r) => `\`${r.id}\` (${r.cls}, ${r.played} plays)`).join(', ') : 'none'}.`);
  const neverPlayed = pooledRows.filter((r) => r.drawn >= 30 && r.played === 0);
  P(`- Cards drawn ≥ 30 times and never played: ${neverPlayed.length ? neverPlayed.map((r) => `\`${r.id}\` (${r.cls}, ${r.drawn} draws)`).join(', ') : 'none'}.`);
  const flatCf = cfCard.variants.filter((v) => v.pairs.n >= 20 && v.plays > 0.5 && Math.abs(v.pairs.prog) < 1e-9 && v.pairs.progCi < 1e-9);
  P(`- Cards whose counterfactual changed no run at all (identical outcomes on every seed): ${flatCf.length ? flatCf.map((v) => `\`${v.id}\` (${v.cls})`).join(', ') : 'none'}.`);
  P(`- Relics that never triggered: see section 4.`);
  const stale = batches.flatMap((b) => b.runs.filter((r) => r.endCause === 'stalemate').map((r) => `${b.persona}/${r.classId} \`${r.deathEncounter ?? '?'}\` (${r.seed})`));
  P(`- Stalemates (a combat over 100 turns, counted as a loss): ${stale.length ? stale.join(', ') : 'none'}.`);
  const errPath = `${dir}/errors.jsonl`;
  const runErrors = [...(existsSync(errPath) ? readJsonl<RunError>(errPath) : []), ...cfRelic.errors, ...cfCard.errors];
  const byMsg = new Map<string, RunError[]>();
  for (const e of runErrors) byMsg.set(e.message, [...(byMsg.get(e.message) ?? []), e]);
  P(`- Runs that threw (engine or policy errors; excluded from every number above): ${runErrors.length ? [...byMsg.entries()].map(([msg, es]) => `${es.length}x "${msg}" (e.g. ${es.slice(0, 3).map((e) => `${e.policy}/${e.seed}`).join(', ')})`).join('; ') : 'none'}.\n`);

  const neverPicked = pooledRows.filter((r) => r.offers >= 20 && r.pickRate === 0);
  P(`- Cards offered ≥ 20 times (all personas) and never picked: ${neverPicked.length ? neverPicked.map((r) => `\`${r.id}\` (${r.cls}, ${r.offers} offers)`).join(', ') : 'none'}.\n`);

  // --- Standard tier (ruling 71): persona batches played on Standard, one row per --standard dir.
  const mainTier = dirTier(dir);
  const standard = standardDirs.map((d) => ({ dir: d, tier: dirTier(d), batches: loadBatches(d) }));
  if (standard.length) {
    P(`## 7. Standard tier\n`);
    P(`Sections 1-6 are ${mainTier}. These batches played the Standard tier (same seeds \`v2-<i>-<class>\`). "mean" is the mean of the class rates; "pooled" is every run of the persona, with its 95% half-width.\n`);
    const srows: string[][] = [];
    for (const s of standard) {
      for (const p of [...new Set(s.batches.map((b) => b.persona))]) {
        const bs = s.batches.filter((b) => b.persona === p);
        const all = bs.flatMap((b) => b.runs);
        const w = winRate(all);
        const stale = all.filter((r) => r.endCause === 'stalemate').length;
        srows.push([s.tier, p, ...classes.map((c) => {
          const b = bs.find((x) => x.cls === c);
          return b ? `${pct(winRate(b.runs))} (${b.runs.length})` : '-';
        }), pct(mean(bs.map((b) => winRate(b.runs)))), `${pct(w)} ±${num(100 * ci95p(w, all.length))}`, String(stale)]);
      }
    }
    P(table(['tier', 'persona', ...classes, 'mean', 'pooled', 'stalemates'], srows));
  }

  // --- How much of the reference persona's drafting ran on measured priors (lib/draft.ts usableCardPriorOrNull).
  {
    const refRunsAll = batches.filter((b) => b.persona === ref).flatMap((b) => b.runs);
    let screens = 0;
    let bare = 0;
    let offers = 0;
    let offersBare = 0;
    let picks = 0;
    let picksBare = 0;
    const missing = new Map<string, number>();
    for (const r of refRunsAll) {
      for (const s of r.screens) {
        screens += 1;
        const has = s.offered.map((id) => usableCardPriorOrNull(r.classId, id) !== null);
        offers += has.length;
        offersBare += has.filter((x) => !x).length;
        if (has.every((x) => !x)) bare += 1;
        s.offered.forEach((id, i) => {
          if (!has[i]) missing.set(`${id} (${r.classId})`, (missing.get(`${id} (${r.classId})`) ?? 0) + 1);
        });
        if (s.picked !== null) {
          picks += 1;
          if (usableCardPriorOrNull(r.classId, s.picked) === null) picksBare += 1;
        }
      }
    }
    P(`## ${standard.length ? 8 : 7}. ${ref} drafting: prior coverage\n`);
    P(`A card offer has a usable prior when a prior file measured this exact definition for the class (n ≥ 10); otherwise the drafter scores it by the heuristic alone. Over ${refRunsAll.length} ${ref} runs: ${screens} card screens, ${offers} offers.\n`);
    P(`- Offers without a usable prior: ${offersBare} (${pct(offersBare / Math.max(1, offers))}).`);
    P(`- Screens where no offer had one (pure heuristic pick): ${bare} (${pct(bare / Math.max(1, screens))}).`);
    P(`- Picks of a card without a usable prior: ${picksBare} of ${picks} (${pct(picksBare / Math.max(1, picks))}).`);
    const top = [...missing.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
    P(`- Most-offered cards without one: ${top.length ? top.map(([k, n]) => `\`${k}\` ${n}`).join(', ') : 'none'}.\n`);
  }

  // --- PHASE_C scorecard (docs/v2/PHASE_C.md targets)
  function scorecard(): string {
    const rows: string[][] = [];
    const ok = (b: boolean): string => (b ? 'met' : '**MISSED**');
    const wrIn = (bs: readonly Batch[], persona: string, cls: string): { w: number; n: number } | null => {
      const b = bs.find((x) => x.persona === persona && x.cls === cls);
      return b ? { w: winRate(b.runs), n: b.runs.length } : null;
    };
    const wr = (persona: string, cls: string): { w: number; n: number } | null => wrIn(batches, persona, cls);
    const spikes = classes.map((c) => wr(ref, c)).filter((x): x is { w: number; n: number } => x !== null);
    for (const cls of classes) {
      const s = wr(ref, cls);
      if (s) rows.push([`${ref} win, ${cls}`, '30-45%', `${pct(s.w)} ±${num(100 * ci95p(s.w, s.n))}`, ok(s.w >= 0.3 && s.w <= 0.45)]);
    }
    if (spikes.length > 1) {
      const spread = Math.max(...spikes.map((x) => x.w)) - Math.min(...spikes.map((x) => x.w));
      rows.push([`class spread under ${ref}`, '<= 8 pts', `${num(100 * spread)} pts`, ok(spread <= 0.08)]);
    }
    for (const cls of classes) {
      const js = batches.filter((b) => b.cls === cls && b.persona.startsWith('johnny-') && !b.persona.startsWith('johnny-v1-'));
      if (!js.length) continue;
      const low = js.filter((b) => winRate(b.runs) < 0.25);
      rows.push([`johnny engines, ${cls}`, 'each >= 25%', js.map((b) => `${b.persona.slice(7)} ${pct(winRate(b.runs), 0)}`).join(', '), ok(low.length === 0)]);
    }
    // Tier split (ruling 71): timmy and novice are scored on the first --standard dir when there is one.
    const easy = standard[0];
    const tnBatches = easy ? easy.batches : batches;
    const tnTier = easy ? easy.tier : mainTier;
    for (const [p, lo, label] of [['timmy', 0.15, '>= 15%'], ['novice', 0.08, '>= 8%']] as const) {
      const vs = classes.map((c) => wrIn(tnBatches, p, c)).filter((x): x is { w: number; n: number } => x !== null);
      if (!vs.length) continue;
      const n = vs.reduce((a, x) => a + x.n, 0);
      const pooled = vs.reduce((a, x) => a + x.w * x.n, 0) / n;
      const each = classes.map((c) => {
        const x = wrIn(tnBatches, p, c);
        return `${c} ${x ? pct(x.w, 0) : '-'}`;
      });
      rows.push([`${p} (${tnTier})`, `${label} (pooled; every class)`, `pooled ${pct(pooled)} ±${num(100 * ci95p(pooled, n))}; ${each.join(', ')}`, `pooled ${ok(pooled >= lo)}; every class ${ok(vs.every((x) => x.w >= lo))}`]);
    }
    const tgap = classes.map((c) => ({ c, t: wr('turtle', c), s: wr(ref, c) })).filter((x) => x.t && x.s);
    if (tgap.length) rows.push([`turtle above ${ref}`, '<= 10 pts', tgap.map((x) => `${x.c} ${pts((x.t?.w ?? 0) - (x.s?.w ?? 0), 0)}`).join(', '), ok(tgap.every((x) => (x.t?.w ?? 0) - (x.s?.w ?? 0) <= 0.1))]);
    const stale = batches.reduce((a, b) => a + b.runs.filter((r) => r.endCause === 'stalemate').length, 0);
    const allRuns = batches.reduce((a, b) => a + b.runs.length, 0);
    rows.push(['stalemates', '0 in 1000 runs per class', `${stale} in ${allRuns} runs`, ok(stale === 0)]);
    if (relicRows.length) {
      const hot = relicRows.filter((r) => getRelicDef(r.id).rarity !== 'boss' && r.p.win > 0.12);
      const trap = relicRows.filter((r) => r.p.win < -0.08);
      rows.push(['non-boss relic Δwin', 'none > +12', hot.length ? hot.map((r) => `${r.id} ${pts(r.p.win, 0)}`).join(', ') : 'none', ok(hot.length === 0)]);
      rows.push(['relic traps', 'none < -8', trap.length ? trap.map((r) => `${r.id} ${pts(r.p.win, 0)}`).join(', ') : 'none', ok(trap.length === 0)]);
    }
    if (cfCard.variants.length) {
      const neg = cfCard.variants.filter((v) => v.pairs.prog + v.pairs.progCi < 0);
      rows.push(['cards significantly negative (cf)', 'none', neg.length ? neg.map((v) => `${v.id} (${v.cls})`).join(', ') : 'none', ok(neg.length === 0)]);
    }
    const never = pooledRows.filter((r) => r.drawn >= 30 && r.played === 0);
    rows.push(['never-played cards', 'none', never.length ? never.map((r) => `${r.id} (${r.cls})`).join(', ') : 'none', ok(never.length === 0)]);
    const tierNote = easy ? ` Tier split (ruling 71): timmy and novice rows are scored on ${easy.tier} (\`${easy.dir}\`); every other row on ${mainTier}.` : ` Every row: ${mainTier}.`;
    return `## PHASE_C scorecard\n\nTargets from \`docs/v2/PHASE_C.md\`; ± is the 95% half-width.${tierNote}\n\n${table(['metric', 'target', 'measured', 'status'], rows)}`;
  }

  // --- notes splice
  const notesPath = `${docs}/notes-${label}.md`;
  const notes = existsSync(notesPath) ? readFileSync(notesPath, 'utf8') : `_No analyst notes yet: write them in \`${notesPath}\`._\n`;
  const summary = prows
    .filter((r) => r.persona === ref)
    .map((r) => `${r.cls} ${pct(r.win)}`)
    .join(', ');
  const cut = out.findIndex((s) => s.startsWith('## 1.'));
  if (cut < 0) throw new Error('attribution: section 1 missing');
  const header = out.slice(0, cut);
  const body = out.slice(cut);
  const doc = [...header, `**${ref} win rate**: ${summary}.\n`, scorecard(), `## Findings and recommendations\n`, notes, ...body].join('\n');
  writeFileSync(`${docs}/report-${label}.md`, doc);
  console.error(`[attribution] wrote ${docs}/report-${label}.md, ${docs}/${label}-cards.csv, ${docs}/${label}-relics.csv in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

function quantile(xs: readonly number[], q: number): number {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))] ?? NaN;
}

/** Runs written before phase 2 have no engine or extended telemetry fields. */
function hasEngines(r: RunResult): boolean {
  return (r as Partial<RunResult>).engines !== undefined && (r.detail as Partial<RunResult['detail']>).eventCounts !== undefined;
}

function median(xs: readonly number[]): number {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? (s[m] ?? NaN) : ((s[m - 1] ?? 0) + (s[m] ?? 0)) / 2;
}

const entry = process.argv[1];
if (isMainThread && entry !== undefined && /attribution\.(ts|mjs)$/.test(entry)) main();
