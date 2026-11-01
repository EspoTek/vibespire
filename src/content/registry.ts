// Generic content registries. Lookups THROW on unknown ids; registering a duplicate id throws.
// Content modules only `import type` from src/engine (no runtime imports), so the engine can
// import this module without a cycle.

import type {
  Act,
  CardDef,
  CardId,
  ClassDef,
  EncounterDef,
  EnemyDef,
  EventDef,
  PotionDef,
  RelicDef,
  RestOptionDef,
  StartBoonDef,
  StatusDef,
} from '../engine/types';

export interface ContentPack {
  classes?: ClassDef[];
  cards?: CardDef[];
  relics?: RelicDef[];
  enemies?: EnemyDef[];
  encounters?: EncounterDef[];
  events?: EventDef[];
  potions?: PotionDef[];
  statuses?: StatusDef[];
  boons?: StartBoonDef[];
  restOptions?: RestOptionDef[];
}

interface Registry<T extends { id: string }> {
  kind: string;
  byId: Record<string, T>;
  order: T[];
  /** Pack tag of each id (see registerPack). */
  tags: Record<string, string>;
}

function registry<T extends { id: string }>(kind: string): Registry<T> {
  return { kind, byId: Object.create(null) as Record<string, T>, order: [], tags: Object.create(null) as Record<string, string> };
}

function add<T extends { id: string }>(reg: Registry<T>, defs: readonly T[] | undefined, tag: string): void {
  if (!defs) return;
  for (const def of defs) {
    if (Object.prototype.hasOwnProperty.call(reg.byId, def.id)) throw new Error(`duplicate ${reg.kind} id '${def.id}'`);
    reg.byId[def.id] = def;
    reg.order.push(def);
    reg.tags[def.id] = tag;
  }
}

function get<T extends { id: string }>(reg: Registry<T>, id: string): T {
  if (!Object.prototype.hasOwnProperty.call(reg.byId, id)) throw new Error(`unknown ${reg.kind} id '${id}'`);
  const def = reg.byId[id];
  if (!def) throw new Error(`unknown ${reg.kind} id '${id}'`);
  return def;
}

const classes = registry<ClassDef>('class');
const cards = registry<CardDef>('card');
const relics = registry<RelicDef>('relic');
const enemies = registry<EnemyDef>('enemy');
const encounters = registry<EncounterDef>('encounter');
const events = registry<EventDef>('event');
const potions = registry<PotionDef>('potion');
const statuses = registry<StatusDef>('status');
const boons = registry<StartBoonDef>('start boon');
const restOptions = registry<RestOptionDef>('rest option');

const upgradedCache: Record<CardId, CardDef> = Object.create(null) as Record<CardId, CardDef>;

/** Register a pack. `tag` labels its definitions for restrictListingsTo ('real' content, 'core' rules content, 'test'). */
export function registerPack(pack: ContentPack, tag = 'real'): void {
  add(classes, pack.classes, tag);
  add(cards, pack.cards, tag);
  add(relics, pack.relics, tag);
  add(enemies, pack.enemies, tag);
  add(encounters, pack.encounters, tag);
  add(events, pack.events, tag);
  add(potions, pack.potions, tag);
  add(statuses, pack.statuses, tag);
  add(boons, pack.boons, tag);
  add(restOptions, pack.restOptions, tag);
}

export type DefKind = 'class' | 'card' | 'relic' | 'enemy' | 'encounter' | 'event' | 'potion' | 'status' | 'boon' | 'rest option';

/**
 * Whether `id` names a registered definition of `kind`. "No" is an expected answer here: save
 * validation asks it about ids from older builds (removed cards, relics, statuses...) before loading.
 * Gameplay code uses the throwing get*Def lookups.
 */
export function isRegisteredId(kind: DefKind, id: string): boolean {
  const reg: Registry<{ id: string }> = ({ class: classes, card: cards, relic: relics, enemy: enemies, encounter: encounters, event: events, potion: potions, status: statuses, boon: boons, 'rest option': restOptions } as const)[kind];
  return Object.prototype.hasOwnProperty.call(reg.byId, id);
}

export function getClassDef(id: string): ClassDef {
  return get(classes, id);
}

/** Card definition; with `upgraded` the upgrade is merged in (cached). */
export function getCardDef(id: CardId, upgraded = false): CardDef {
  const base = get(cards, id);
  if (!upgraded) return base;
  const cached = upgradedCache[id];
  if (cached) return cached;
  const u = base.upgrade;
  const merged: CardDef = {
    ...base,
    name: u.name ?? `${base.name}+`,
    cost: u.cost !== undefined ? u.cost : base.cost,
    text: u.text ?? base.text,
    effects: u.effects ?? base.effects,
    target: u.target ?? base.target,
  };
  const riposte = u.riposte ?? base.riposte;
  if (riposte) merged.riposte = riposte;
  const delay = u.delay ?? base.delay;
  if (delay) merged.delay = delay;
  // An upgrade's Salvage replaces the base one (CardDef.upgrade allowed it, but it was never merged).
  const salvage = u.salvage ?? base.salvage;
  if (salvage) merged.salvage = salvage;
  const kw = u.keywords ?? base.keywords;
  if (kw) merged.keywords = kw;
  upgradedCache[id] = merged;
  return merged;
}

export function getRelicDef(id: string): RelicDef {
  return get(relics, id);
}
export function getEnemyDef(id: string): EnemyDef {
  return get(enemies, id);
}
export function getEncounterDef(id: string): EncounterDef {
  return get(encounters, id);
}
export function getEventDef(id: string): EventDef {
  return get(events, id);
}
export function getPotionDef(id: string): PotionDef {
  return get(potions, id);
}
export function getStatusDef(id: string): StatusDef {
  return get(statuses, id);
}
export function getBoonDef(id: string): StartBoonDef {
  return get(boons, id);
}
export function getRestOptionDef(id: string): RestOptionDef {
  return get(restOptions, id);
}

// Listings (registration order, so deterministic).
/**
 * Listing restriction (tests): when set, the pool listings (classes, cards, relics, enemies, encounters,
 * events, potions, boons; so every random pool) only return definitions whose pack tag is in the list.
 * Lookups by id, statuses and rest options are never restricted. null = no restriction.
 */
let listingTags: readonly string[] | null = null;
export function restrictListingsTo(tags: readonly string[] | null): void {
  listingTags = tags;
}

function listed<T extends { id: string }>(reg: Registry<T>): readonly T[] {
  const tags = listingTags;
  if (tags === null) return reg.order;
  return reg.order.filter((d) => {
    const tag = reg.tags[d.id];
    if (tag === undefined) throw new Error(`${reg.kind} '${d.id}' has no pack tag`);
    return tags.includes(tag);
  });
}

export const allClasses = (): readonly ClassDef[] => listed(classes);
export const allCards = (): readonly CardDef[] => listed(cards);
export const allRelics = (): readonly RelicDef[] => listed(relics);
export const allEnemies = (): readonly EnemyDef[] => listed(enemies);
export const allEncounters = (): readonly EncounterDef[] => listed(encounters);
export const allEvents = (): readonly EventDef[] => listed(events);
export const allPotions = (): readonly PotionDef[] => listed(potions);
// Statuses and rest options are rules content (looked up by id; Purge/Transmute must stay on offer):
// never restricted.
export const allStatuses = (): readonly StatusDef[] => statuses.order;
export const allBoons = (): readonly StartBoonDef[] => listed(boons);
export const allRestOptions = (): readonly RestOptionDef[] => restOptions.order;

export function encountersFor(act: Act, pool: EncounterDef['pool']): EncounterDef[] {
  return listed(encounters).filter((e) => e.pool === pool && e.acts.includes(act));
}

export function eventsFor(act: Act): EventDef[] {
  return listed(events).filter((e) => e.acts.includes(act));
}

/**
 * Cross-reference check: every id a definition references exists. Throws listing all problems.
 * Run by tests/content; call it after registering a new pack.
 */
export function validateRegistries(): void {
  const problems: string[] = [];
  const need = (reg: Registry<{ id: string }>, id: string, where: string): void => {
    if (!Object.prototype.hasOwnProperty.call(reg.byId, id)) problems.push(`${where}: unknown ${reg.kind} '${id}'`);
  };
  for (const c of listed(classes)) {
    for (const id of c.startingDeck) need(cards, id, `class ${c.id} deck`);
    for (const id of c.startingRelics) need(relics, id, `class ${c.id} relics`);
  }
  for (const e of listed(encounters)) {
    if (e.enemies.length === 0) problems.push(`encounter ${e.id}: no enemies`);
    e.enemies.forEach((slot, i) => {
      const s = typeof slot === 'string' ? { id: slot } : slot;
      need(enemies, s.id, `encounter ${e.id}`);
      if (typeof slot !== 'string' && slot.leader !== undefined && !(slot.leader >= 0 && slot.leader < i)) problems.push(`encounter ${e.id}: slot ${i} leader must be an earlier slot`);
    });
  }
  for (const e of listed(enemies)) {
    if (Object.keys(e.moves).length === 0) problems.push(`enemy ${e.id}: no moves`);
    if (e.hp[0] > e.hp[1] || e.hp[0] <= 0) problems.push(`enemy ${e.id}: bad hp range`);
  }
  for (const r of listed(relics)) {
    if (r.cls !== undefined) need(classes, r.cls, `relic ${r.id} cls`);
  }
  if (problems.length) throw new Error(`content validation failed:\n  ${problems.join('\n  ')}`);
}
