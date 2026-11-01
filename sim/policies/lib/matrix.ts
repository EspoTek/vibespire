/// <reference types="node" />
// Archetype matrices from the card docs (docs/cards/<class>.md, the "Archetype matrix" table).
// Rows are keyed by card id or card name; archetype columns are the header cells that start with a
// one-letter code ("S", "G", "M Metronome"). ● = built for the archetype (weight 1), ○ = secondary
// (weight 0.5). Archetype names come from the column header or the legend above the table
// ("S = Swing", "**G** Gardener:"). Parsed at run time so the johnny bots follow the docs after a
// content redesign. Rows naming no current card are collected in `unresolvedRows` and printed (doc drift).

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { measuredRoot } from '../../root';
import { allCards } from '../../../src/content';

export interface Archetype {
  code: string;
  /** Lower-case name (johnny-<name>). */
  name: string;
  /** card id -> weight (1 = ●, 0.5 = ○). */
  cards: Map<string, number>;
}

const cache = new Map<string, Archetype[]>();
/** Matrix rows that name no current card of the class (doc drift during a redesign), by class. Printed once and listed in the report. */
export const unresolvedRows = new Map<string, string[]>();


function docPath(classId: string): string {
  return join(measuredRoot(), 'docs', 'cards', `${classId}.md`);
}

function cells(line: string): string[] {
  const t = line.trim();
  if (!t.startsWith('|')) return [];
  return t.slice(1, t.endsWith('|') ? -1 : undefined).split('|').map((x) => x.trim());
}

const norm = (x: string): string => x.replace(/[`*]/g, '').trim().toLowerCase();

/** The class's archetypes, parsed from its card doc. Throws if the matrix is missing or a row does not resolve. */
export function archetypesFor(classId: string): Archetype[] {
  const hit = cache.get(classId);
  if (hit) return hit;
  const text = readFileSync(docPath(classId), 'utf8');
  const lines = text.split('\n');
  const head = lines.findIndex((l) => /^##\s.*archetype matrix/i.test(l));
  if (head < 0) throw new Error(`docs/cards/${classId}.md: no "Archetype matrix" heading`);
  let t = head + 1;
  while (t < lines.length && !(lines[t] ?? '').trim().startsWith('|')) t++;
  const legend = lines.slice(head + 1, t).join(' ');
  const header = cells(lines[t] ?? '');
  if (header.length === 0) throw new Error(`docs/cards/${classId}.md: archetype matrix has no table`);
  const byKey = new Map<string, string>();
  for (const c of allCards()) {
    if (c.cls !== classId) continue;
    byKey.set(c.id.toLowerCase(), c.id);
    byKey.set(c.name.toLowerCase(), c.id);
  }
  const cols: { idx: number; arch: Archetype }[] = [];
  header.forEach((h, idx) => {
    const m = /^([A-Z])(?:\s+(.+))?$/.exec(h.replace(/\*/g, '').trim());
    if (!m || idx === 0) return;
    const code = m[1] ?? '';
    let name = m[2];
    if (!name) {
      const eq = new RegExp(`\\b${code}\\s*=\\s*([A-Za-z]+)`).exec(legend) ?? new RegExp(`\\*\\*${code}\\*\\*\\s*([A-Za-z]+)`).exec(legend);
      if (!eq || !eq[1]) throw new Error(`docs/cards/${classId}.md: no legend name for archetype column '${code}'`);
      name = eq[1];
    }
    cols.push({ idx, arch: { code, name: name.toLowerCase().split(/\s+/)[0] ?? name.toLowerCase(), cards: new Map() } });
  });
  if (cols.length === 0) throw new Error(`docs/cards/${classId}.md: no archetype columns in '${lines[t] ?? ''}'`);
  for (let i = t + 2; i < lines.length; i++) {
    const row = cells(lines[i] ?? '');
    if (row.length === 0) break;
    const key = norm(row[0] ?? '');
    if (key === 'total' || key === '') continue;
    const id = byKey.get(key);
    if (!id) {
      const list = unresolvedRows.get(classId) ?? [];
      list.push(row[0] ?? '');
      unresolvedRows.set(classId, list);
      continue;
    }
    for (const { idx, arch } of cols) {
      const cell = row[idx] ?? '';
      if (cell.includes('●')) arch.cards.set(id, 1);
      else if (cell.includes('○')) arch.cards.set(id, 0.5);
    }
  }
  const out = cols.map((c) => c.arch);
  const missing = unresolvedRows.get(classId);
  if (missing) console.error(`[matrix] docs/cards/${classId}.md: ${missing.length} archetype-matrix row(s) name no current ${classId} card (doc drift): ${missing.join(', ')}`);
  cache.set(classId, out);
  return out;
}

export function getArchetype(classId: string, name: string): Archetype {
  const a = archetypesFor(classId).find((x) => x.name === name);
  if (!a) throw new Error(`no archetype '${name}' for ${classId} (have: ${archetypesFor(classId).map((x) => x.name).join(', ')})`);
  return a;
}
