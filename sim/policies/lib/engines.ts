// v2 engines from the card tags (docs/v2/<class>-design.md): every class card carries `engine:<name>`
// (one or two) and `role:enabler | payoff | multiplier | bridge | glue`. Shared engines are the
// `engine:*` tags on colourless cards and relics; they are offered to every class.
//
// A class whose cards carry no `engine:` tags falls back to the bare engine names its design doc
// lists (BARE_ENGINES), and says so on stderr: ask the designer to add the prefix.
//
// "Assembled" (graft-design §10, used for every class): the deck holds a multiplier of the engine
// plus at least 2 other engine cards; an engine without a tagged multiplier needs 3 cards including a
// payoff; an engine with no role tags at all needs 3 cards.

import { allCards, allRelics, getCardDef } from '../../../src/content';
import type { CardInstance } from '../../../src/engine';

export type Role = 'enabler' | 'payoff' | 'multiplier' | 'bridge' | 'glue' | 'none';

export interface Engine {
  name: string;
  /** 'class' (this class's pool) or 'shared' (colourless cards and relics). */
  scope: 'class' | 'shared';
  /** card id -> role in this engine. */
  cards: Map<string, Role>;
  relics: Set<string>;
  /** RULINGS 70: relic id -> role (role:* tag, else 'none'); owned engine relics count toward assembly. */
  relicRoles: Map<string, Role>;
  hasMultiplier: boolean;
  /** Whether any of its cards carries a role:* tag (Chronist v2 has none yet). */
  hasRoles: boolean;
}

/** Bare-tag fallbacks for classes not yet tagged `engine:*` (chronist-design §10). */
const BARE_ENGINES: Record<string, string[]> = { chronist: ['conjunction', 'clockwork', 'storm', 'calendar'] };

const cache = new Map<string, Engine[]>();
const warned = new Set<string>();

function roleOf(tags: readonly string[]): Role {
  for (const r of ['multiplier', 'payoff', 'enabler', 'bridge', 'glue'] as const) if (tags.includes(`role:${r}`)) return r;
  return 'none';
}

function enginesOfTags(tags: readonly string[], bare: readonly string[]): string[] {
  const out = tags.filter((t) => t.startsWith('engine:')).map((t) => t.slice('engine:'.length));
  for (const b of bare) if (tags.includes(b)) out.push(b);
  return out;
}

/** The class's engines and the shared engines. Throws if a class has none at all. */
export function enginesFor(classId: string): Engine[] {
  const hit = cache.get(classId);
  if (hit) return hit;
  const byName = new Map<string, Engine>();
  const get = (name: string, scope: Engine['scope']): Engine => {
    let e = byName.get(name);
    if (!e) {
      e = { name, scope, cards: new Map(), relics: new Set(), relicRoles: new Map(), hasMultiplier: false, hasRoles: false };
      byName.set(name, e);
    }
    return e;
  };
  const classCards = allCards().filter((c) => c.cls === classId);
  const tagged = classCards.some((c) => (c.tags ?? []).some((t) => t.startsWith('engine:')));
  const bare = tagged ? [] : (BARE_ENGINES[classId] ?? []);
  if (!tagged && bare.length && !warned.has(classId)) {
    warned.add(classId);
    console.error(`[engines] ${classId}: no engine:* tags on its cards; using the bare tags ${bare.join(', ')} (ask the designer to add the engine: prefix)`);
  }
  for (const c of classCards) for (const n of enginesOfTags(c.tags ?? [], bare)) get(n, 'class').cards.set(c.id, roleOf(c.tags ?? []));
  for (const c of allCards().filter((x) => x.cls === 'colorless')) for (const n of enginesOfTags(c.tags ?? [], [])) get(n, byName.get(n)?.scope ?? 'shared').cards.set(c.id, roleOf(c.tags ?? []));
  // Status tokens (Graft's Chaff) join only an engine the class already has.
  for (const c of allCards().filter((x) => x.cls === 'status')) for (const n of enginesOfTags(c.tags ?? [], [])) byName.get(n)?.cards.set(c.id, roleOf(c.tags ?? []));
  for (const r of allRelics()) {
    if (r.cls !== undefined && r.cls !== classId) continue;
    for (const n of enginesOfTags(r.tags ?? [], [])) {
      const e = get(n, byName.get(n)?.scope ?? 'shared');
      e.relics.add(r.id);
      e.relicRoles.set(r.id, roleOf(r.tags ?? []));
    }
  }
  for (const e of byName.values()) {
    const roles = [...e.cards.values(), ...e.relicRoles.values()];
    e.hasMultiplier = roles.includes('multiplier');
    e.hasRoles = roles.some((r) => r !== 'none');
  }
  const out = [...byName.values()].filter((e) => e.cards.size > 0 || e.relics.size > 0);
  if (!out.some((e) => e.scope === 'class')) throw new Error(`enginesFor(${classId}): no class engines (no engine:* tags and no bare-tag fallback)`);
  cache.set(classId, out);
  return out;
}

/** Whether the class has engines (engine:* tags or a bare-tag fallback). False for the test pack. */
export function classHasEngines(classId: string): boolean {
  const cards = allCards().filter((c) => c.cls === classId);
  return cards.some((c) => (c.tags ?? []).some((t) => t.startsWith('engine:'))) || (BARE_ENGINES[classId] ?? []).some((b) => cards.some((c) => (c.tags ?? []).includes(b)));
}

export function getEngine(classId: string, name: string): Engine {
  const e = enginesFor(classId).find((x) => x.name === name);
  if (!e) throw new Error(`no engine '${name}' for ${classId} (have: ${enginesFor(classId).map((x) => x.name).join(', ')})`);
  return e;
}

/** Whether the deck (plus the engine relics held, RULINGS 70) has assembled the engine (see the header). */
export function assembled(e: Engine, deck: readonly CardInstance[], relics: readonly string[]): boolean {
  let pieces = 0;
  let mult = 0;
  let payoff = 0;
  const roles = [...deck.map((c) => e.cards.get(c.id)), ...relics.map((id) => e.relicRoles.get(id))];
  for (const r of roles) {
    if (r === undefined) continue;
    pieces += 1;
    if (r === 'multiplier') mult += 1;
    if (r === 'payoff') payoff += 1;
  }
  if (e.hasMultiplier) return mult >= 1 && pieces >= 3;
  if (!e.hasRoles) return pieces >= 3;
  return pieces >= 3 && payoff >= 1;
}

/** Draft weight of a card for an engine bot (multipliers most, glue least, 0 off-engine). */
export function engineWeight(e: Engine, id: string): number {
  const r = e.cards.get(id);
  if (r === undefined) return 0;
  return { multiplier: 1.6, payoff: 1.3, enabler: 1.1, bridge: 0.9, glue: 0.5, none: 0.8 }[r];
}

/** Whether a card belongs to any engine (for reports). */
export function enginesOfCard(classId: string, id: string): string[] {
  getCardDef(id);
  return enginesFor(classId)
    .filter((e) => e.cards.has(id))
    .map((e) => e.name);
}
