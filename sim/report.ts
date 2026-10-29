/// <reference types="node" />
// Balance report: renders batch aggregates (sim/batch.ts --out) as docs/balance/report-<label>.md
// with the GDD §8.6 metrics and a "suspects" section.
// Usage: npx tsx sim/report.ts --in a.json[,b.json,...] --label baseline [--out-dir docs/balance] [--note "text"]

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Aggregate } from './aggregate';
import { BOT_TARGETS, ENCOUNTER_EXPECTATIONS } from './expectations';
import type { BalanceMetrics } from './metrics';

export interface ReportInput {
  file: string;
  agg: Aggregate & { meta?: { content: string; seedPrefix: string; overrides: Record<string, number> } };
}

const pct = (x: number, d = 1): string => `${(x * 100).toFixed(d)}%`;
const num = (x: number, d = 1): string => x.toFixed(d);
const sign = (x: number): string => `${x >= 0 ? '+' : ''}${(x * 100).toFixed(1)}`;

function table(head: readonly string[], rows: readonly (readonly string[])[]): string {
  if (rows.length === 0) return '_(none)_\n';
  const line = (r: readonly string[]): string => `| ${r.join(' | ')} |`;
  return [line(head), line(head.map(() => '---')), ...rows.map(line)].join('\n') + '\n';
}

function bar(n: number, max: number, width = 40): string {
  return '█'.repeat(Math.max(n > 0 ? 1 : 0, Math.round((n / Math.max(1, max)) * width)));
}

/** Percentile threshold (0..1) of a sorted ascending list. */
function quantile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) return 0;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.floor(q * (sorted.length - 1))));
  const v = sorted[i];
  if (v === undefined) throw new Error('quantile index');
  return v;
}

export interface Suspect {
  cls: string;
  kind: 'card' | 'relic' | 'encounter' | 'milestone' | 'stalemate' | 'cap';
  id: string;
  why: string;
  /** For ranking: bigger = more suspicious. */
  weight: number;
}

export function findSuspects(cls: string, m: BalanceMetrics): Suspect[] {
  const out: Suspect[] = [];
  const minOffers = Math.max(10, Math.round(m.screens * 0.01));
  const offered = Object.entries(m.cards).filter(([, c]) => c.offered >= minOffers);
  const rates = offered.map(([, c]) => c.pickRate).sort((a, b) => a - b);
  if (offered.length >= 10) {
    const lo = quantile(rates, 0.05);
    const hi = quantile(rates, 0.95);
    for (const [id, c] of offered) {
      if (c.pickRate <= lo) out.push({ cls, kind: 'card', id, why: `pick rate ${pct(c.pickRate)} (bottom 5%, offered ${c.offered})`, weight: 2 + (lo - c.pickRate) * 10 + c.offered / 1000 });
      else if (c.pickRate >= hi) out.push({ cls, kind: 'card', id, why: `pick rate ${pct(c.pickRate)} (top 5%, offered ${c.offered}, deck win Δ ${sign(c.deckWinDelta)} pts)`, weight: 2 + (c.pickRate - hi) * 10 + c.offered / 1000 });
    }
  }
  const minRuns = Math.max(20, Math.round(m.runs * 0.05));
  for (const [id, r] of Object.entries(m.relics)) {
    if (r.runs >= minRuns && r.runs < m.runs && Math.abs(r.winDelta) > 0.1) out.push({ cls, kind: 'relic', id, why: `win Δ ${sign(r.winDelta)} pts (${r.runs} runs)`, weight: 3 + Math.abs(r.winDelta) * 10 });
  }
  for (const [id, e] of Object.entries(m.encounters)) {
    const x = ENCOUNTER_EXPECTATIONS[id];
    if (!x || e.fights < 10) continue;
    if (e.avgDamage > x.lost * 1.3) out.push({ cls, kind: 'encounter', id, why: `HP lost ${num(e.avgDamage)} vs expected ${x.lost} (×${num(e.avgDamage / x.lost, 2)}; ${e.fights} fights, ${e.deaths} deaths)`, weight: 1 + e.avgDamage / x.lost + e.deaths / Math.max(1, e.fights) * 5 });
  }
  for (const [id, n] of Object.entries(m.stalematesByEncounter)) out.push({ cls, kind: 'stalemate', id, why: `${n} run(s) ended in a stalemate (combat over the turn limit; counted as losses)`, weight: 6 + n });
  if (m.capHitsPerTurn > BOT_TARGETS.capHitsPerTurn) {
    const top = Object.entries(m.capHits).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} ${v}`).join(', ');
    out.push({ cls, kind: 'cap', id: 'cap_hits', why: `caps hit in ${pct(m.capHitsPerTurn, 2)} of turns (target < 1%): ${top}`, weight: 4 + m.capHitsPerTurn * 50 });
  }
  const ms = m.milestones;
  if (ms.reachA1Boss < BOT_TARGETS.reachA1Boss) out.push({ cls, kind: 'milestone', id: 'reach_a1_boss', why: `${pct(ms.reachA1Boss)} reach the act 1 boss (target ≥ ${pct(BOT_TARGETS.reachA1Boss, 0)})`, weight: 5 });
  if (ms.reachA1Boss > 0 && ms.beatA1Boss < BOT_TARGETS.beatA1Boss) out.push({ cls, kind: 'milestone', id: 'beat_a1_boss', why: `${pct(ms.beatA1Boss)} beat the act 1 boss (target ≥ ${pct(BOT_TARGETS.beatA1Boss, 0)})`, weight: 4 });
  if (ms.beatA2Boss < BOT_TARGETS.beatA2Boss) out.push({ cls, kind: 'milestone', id: 'beat_a2_boss', why: `${pct(ms.beatA2Boss)} beat the act 2 boss (target ≥ ${pct(BOT_TARGETS.beatA2Boss, 0)})`, weight: 3 });
  return out.sort((a, b) => b.weight - a.weight);
}

function classSection(cls: string, m: BalanceMetrics): string {
  const parts: string[] = [];
  const ms = m.milestones;
  parts.push(`## ${cls}\n`);
  parts.push(
    table(
      ['runs', 'win', 'stalemates', 'reach A1 boss', 'beat A1 boss', 'reach A2 boss', 'beat A2 boss', 'reach A3 boss', 'deaths A1/A2/A3', 'actions (wins)'],
      [[String(m.runs), pct(m.winRate), String(m.stalemates), pct(ms.reachA1Boss), pct(ms.beatA1Boss), pct(ms.reachA2Boss), pct(ms.beatA2Boss), pct(ms.reachA3Boss), m.deathShareByAct.map((x) => pct(x, 0)).join(' / '), `${num(m.avgActions, 0)} (${num(m.avgWinActions, 0)})`]],
    ),
  );
  parts.push('GDD §8.4 bot targets: win 25–35%, reach A1 boss ≥ 90%, beat A1 boss ≥ 75%, beat A2 boss ≥ 50%, death share by act ≈ 30/40/30.\n');

  // Deaths
  parts.push('### Death heatmap (encounter × act)\n');
  const deaths = Object.entries(m.deathsByEncounter).sort((a, b) => b[1].deaths - a[1].deaths);
  const totalDeaths = Math.max(1, m.runs - m.wins);
  parts.push(
    table(
      ['encounter', 'act', 'deaths', 'share of deaths', 'fights', 'death rate per fight'],
      deaths.map(([id, d]) => {
        const e = m.encounters[id];
        return [id, String(d.act), String(d.deaths), pct(d.deaths / totalDeaths), String(e?.fights ?? 0), e ? pct(e.deaths / Math.max(1, e.fights)) : '–'];
      }),
    ),
  );
  parts.push('### HP at boss entry\n');
  parts.push(table(['act', 'boss fights', 'avg HP', 'avg HP %'], m.bossEntryHp.map((b) => [String(b.act), String(b.n), num(b.avgHp), pct(b.avgHpPct)])));
  parts.push('### Floor of death\n');
  const floors = Object.entries(m.floorOfDeath).map(([f, n]) => [Number(f), n] as const).sort((a, b) => a[0] - b[0]);
  const maxD = Math.max(1, ...floors.map(([, n]) => n));
  parts.push('```\n' + (floors.length ? floors.map(([f, n]) => `F${String(f).padStart(2, '0')} ${String(n).padStart(4)} ${bar(n, maxD)}`).join('\n') : '(no deaths)') + '\n```\n');

  // Cards
  parts.push('### Card rewards\n');
  parts.push(`${m.screens} reward screens, skip rate ${pct(m.skipRate)}. Δwin = win rate of runs that picked the card in that act minus the class win rate (n = runs). Deck Δ = runs ending with it in the deck vs without.\n\n`);
  const cards = Object.entries(m.cards).filter(([, c]) => c.offered > 0).sort((a, b) => b[1].pickRate - a[1].pickRate || b[1].offered - a[1].offered);
  const bucket = (c: (typeof cards)[number][1], b: string): string => {
    const x = c.winDeltaByBucket[b];
    return x ? `${sign(x.delta)} (${x.picks})` : '–';
  };
  parts.push(
    table(
      ['card', 'offered', 'picked', 'pick %', 'on skipped screens', 'bought', 'Δwin A1', 'Δwin A2', 'Δwin A3', 'deck Δwin', 'dmg/combat with'],
      cards.map(([id, c]) => [id, String(c.offered), String(c.picked), pct(c.pickRate), pct(c.offered ? c.skippedScreens / c.offered : 0), String(c.bought), bucket(c, 'a1'), bucket(c, 'a2'), bucket(c, 'a3'), sign(c.deckWinDelta), num(c.dmgPerCombatWith)]),
    ),
  );
  parts.push('### Relics\n');
  const relics = Object.entries(m.relics).sort((a, b) => b[1].winDelta - a[1].winDelta);
  parts.push(table(['relic', 'runs holding', 'win Δ (pts)'], relics.map(([id, r]) => [id, String(r.runs), sign(r.winDelta)])));
  const boss = Object.entries(m.bossRelics).sort((a, b) => b[1].picked - a[1].picked);
  parts.push(`Boss relic screens: skip rate ${pct(m.bossRelicSkipRate)}.\n\n`);
  parts.push(table(['boss relic', 'offered', 'picked', 'pick %'], boss.map(([id, b]) => [id, String(b.offered), String(b.picked), pct(b.offered ? b.picked / b.offered : 0)])));
  parts.push('### Pacts and events\n');
  parts.push(table(['pact', 'picked', 'win Δ (pts)'], Object.entries(m.pacts).map(([id, p]) => [id, String(p.picked), sign(p.winDelta)])));
  parts.push(table(['event', 'seen', 'option picks'], Object.entries(m.events).map(([id, e]) => [id, String(e.seen), Object.entries(e.choices).map(([k, v]) => `#${k}: ${v}`).join(', ')])));

  // Economy
  parts.push('### Economy per act\n');
  parts.push(
    table(
      ['act', 'Shards earned', 'Shards spent', 'deck size (end of act)', 'gold earned', 'gold spent', 'removals shop/rest/event/other', 'upgrades'],
      [0, 1, 2].map((a) => {
        const r = m.removalsByAct[a];
        return [
          String(a + 1),
          num(m.shardsEarnedByAct[a] ?? 0, 2),
          num(m.shardsSpentByAct[a] ?? 0, 2),
          num(m.deckSizeByAct[a] ?? 0),
          num(m.goldEarnedByAct[a] ?? 0, 0),
          num(m.goldSpentByAct[a] ?? 0, 0),
          r ? `${num(r.shop, 2)} / ${num(r.rest, 2)} / ${num(r.event, 2)} / ${num(r.other, 2)}` : '–',
          num(m.upgradesByAct[a] ?? 0, 2),
        ];
      }),
    ),
  );
  parts.push(`Shard target (GDD §4.5): ${BOT_TARGETS.shardsPerAct[0]}–${BOT_TARGETS.shardsPerAct[1]} earned per act. Per-act averages are over all runs (runs that died earlier count 0 for later acts).\n`);

  // Encounters
  parts.push('### Turns and damage per encounter vs ENEMIES §4.1\n');
  const encs = Object.entries(m.encounters).sort((a, b) => a[1].act - b[1].act || a[0].localeCompare(b[0]));
  parts.push(
    table(
      ['encounter', 'act', 'room', 'fights', 'deaths', 'avg turns', 'expected phases', 'avg HP lost', 'expected lost', 'ratio'],
      encs.map(([id, e]) => {
        const x = ENCOUNTER_EXPECTATIONS[id];
        const ratio = x ? e.avgDamage / x.lost : NaN;
        return [id, String(e.act), e.room, String(e.fights), String(e.deaths), num(e.avgTurns), x ? `${x.phases[0]}–${x.phases[1]}` : '–', num(e.avgDamage), x ? String(x.lost) : '–', x ? `${num(ratio, 2)}${ratio > 1.3 ? ' ⚠' : ''}` : '–'];
      }),
    ),
  );

  // Mechanics
  const d = m.derived;
  const t = m.telemetry;
  parts.push('### Mechanic telemetry\n');
  const ons = Object.entries(t.onslaughtAtAttack).map(([k, v]) => [Number(k), v] as const).sort((a, b) => a[0] - b[0]);
  const onsTotal = ons.reduce((a, [, v]) => a + v, 0);
  parts.push(
    table(
      ['metric', 'value'],
      [
        ['Onslaught at Attack play (mean)', num(d.onslaughtAtAttackMean, 2)],
        ['Onslaught distribution', ons.length ? ons.map(([k, v]) => `${k}: ${pct(v / Math.max(1, onsTotal), 0)}`).join(', ') : '–'],
        ['Riposte: primed / triggers / fizzles / attack cancels', `${t.primed} / ${t.riposteTriggers} / ${t.primeFizzles} / ${t.attackCancels}`],
        ['Riposte triggers per primed card · fizzle rate', `${num(d.riposteTriggersPerPrime, 2)} · ${pct(d.primeFizzleRate)}`],
        ['Guard share of damage prevented (Block+Guard)', pct(d.guardShareOfPrevented)],
        ['Guard absorbed / Block absorbed / HP lost to hits', `${t.guardAbsorbed} / ${t.blockAbsorbed} / ${t.hitHpLost}`],
        ['Bloom at end: max · total · Bloom cards (per run)', `${num(d.bloomMaxAtEnd, 2)} · ${num(d.bloomTotalAtEnd, 2)} · ${num(d.bloomCardsAtEnd, 2)}`],
        ['Prunes per combat', num(d.prunesPerCombat, 2)],
        ["Rot's share of damage dealt", pct(d.rotShareOfDamage)],
        ['Beats per turn (on-beat plays / player turns)', num(d.beatsPerTurn, 2)],
        ['Timeline resolutions per combat (added / resolved)', `${num(d.timelinePerCombat, 2)} (${t.timelineAdded} / ${t.timelineResolved})`],
        ['Exposed bonus damage per combat', num(d.exposedBonusPerCombat, 2)],
        ['Stagger damage prevented per combat (upper bound)', num(d.staggerPreventedPerCombat, 2)],
        ['Potions used per run', num(t.potionsUsed / Math.max(1, t.runs), 2)],
      ],
    ),
  );
  parts.push('### Cap hits\n');
  parts.push(`Cap hits per player turn: ${pct(m.capHitsPerTurn, 2)} (healthy < 1%).\n\n`);
  parts.push(table(['cap', 'hits'], Object.entries(m.capHits).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, String(v)])));
  return parts.join('\n');
}

export function renderReport(label: string, inputs: readonly ReportInput[], note: string | null): string {
  const byClass = new Map<string, { m: BalanceMetrics; input: ReportInput }>();
  for (const input of inputs) {
    for (const [cls, m] of Object.entries(input.agg.metrics)) {
      if (byClass.has(cls)) throw new Error(`class ${cls} appears in more than one input (${input.file})`);
      byClass.set(cls, { m, input });
    }
  }
  if (byClass.size === 0) throw new Error('report: no class metrics in the inputs');
  const out: string[] = [];
  out.push(`# Balance report: ${label}\n`);
  out.push(`Generated ${new Date().toISOString().slice(0, 10)} by \`sim/report.ts\` from ${inputs.map((i) => `\`${i.file}\``).join(', ')}.\n`);
  if (note) out.push(`${note}\n`);
  out.push(
    table(
      ['class', 'policy', 'content', 'runs', 'seed prefix', 'overrides', 'sim time'],
      [...byClass].map(([cls, { m, input }]) => [
        cls,
        input.agg.policy.join(','),
        input.agg.meta?.content ?? '?',
        String(m.runs),
        input.agg.meta?.seedPrefix ?? '?',
        input.agg.meta ? Object.entries(input.agg.meta.overrides).map(([k, v]) => `${k}=${v}`).join(' ') || 'none' : '?',
        `${num(input.agg.elapsedMs / 1000)} s`,
      ]),
    ),
  );
  out.push('## Summary\n');
  const rates = [...byClass].map(([, { m }]) => m.winRate);
  const spread = Math.max(...rates) - Math.min(...rates);
  out.push(
    table(
      ['class', 'win rate', 'stalemates', 'reach A1 boss', 'beat A1 boss', 'beat A2 boss', 'HP at A1 boss', 'skip rate', 'Shards earned A1/A2/A3', 'deck size A1/A2/A3', 'cap hits / turn'],
      [...byClass].map(([cls, { m }]) => [
        cls,
        pct(m.winRate),
        String(m.stalemates),
        pct(m.milestones.reachA1Boss),
        pct(m.milestones.beatA1Boss),
        pct(m.milestones.beatA2Boss),
        pct(m.bossEntryHp[0]?.avgHpPct ?? 0),
        pct(m.skipRate),
        m.shardsEarnedByAct.map((x) => num(x, 1)).join(' / '),
        m.deckSizeByAct.map((x) => num(x, 0)).join(' / '),
        pct(m.capHitsPerTurn, 2),
      ]),
    ),
  );
  if (byClass.size > 1) out.push(`Win-rate spread between classes: ${pct(spread)} (target ≤ ${pct(BOT_TARGETS.classSpread, 0)}).\n`);
  out.push('## Suspects\n');
  out.push('Cards with a pick rate in the bottom or top 5% of their class (offered ≥ max(10, 1% of screens)), relics with |win Δ| > 10 points (held in ≥ 5% of runs), encounters whose HP lost exceeds ENEMIES §4.1 by > 30% (≥ 10 fights), missed GDD §8.4 milestones, and stalemates (a combat over the turn limit, counted as a loss), and cap-hit rates over 1% of turns. Ranked by severity. Relic and card win deltas carry survivorship bias: runs that live longer collect more relics and cards, so with a low win rate most positive deltas mean \"held by runs that got far\". Compare them with each other, not with zero.\n\n');
  const suspects = [...byClass].flatMap(([cls, { m }]) => findSuspects(cls, m)).sort((a, b) => b.weight - a.weight);
  out.push(table(['class', 'kind', 'id', 'why'], suspects.map((x) => [x.cls, x.kind, `\`${x.id}\``, x.why])));
  for (const [cls, { m }] of byClass) out.push(classSection(cls, m));
  return out.join('\n');
}

function arg(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0) return null;
  const v = process.argv[i + 1];
  if (v === undefined || v.startsWith('--')) throw new Error(`--${name} needs a value`);
  return v;
}

function main(): void {
  const ins = arg('in');
  if (!ins) throw new Error('usage: npx tsx sim/report.ts --in a.json[,b.json] --label <label> [--out-dir docs/balance] [--note text]');
  const label = arg('label');
  if (!label) throw new Error('--label is required');
  if (!/^[a-z0-9_-]+$/i.test(label)) throw new Error(`--label must be [a-z0-9_-], got '${label}'`);
  const inputs: ReportInput[] = ins.split(',').map((file) => {
    const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'));
    if (typeof parsed !== 'object' || parsed === null || !('metrics' in parsed)) throw new Error(`${file}: not a batch aggregate with metrics (re-run sim/batch.ts --out)`);
    return { file, agg: parsed as ReportInput['agg'] };
  });
  const dir = arg('out-dir') ?? 'docs/balance';
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `report-${label}.md`);
  writeFileSync(path, renderReport(label, inputs, arg('note')));
  console.error(`[report] wrote ${path}`);
}

const entry = process.argv[1];
if (entry !== undefined && import.meta.url === pathToFileURL(entry).href) main();
