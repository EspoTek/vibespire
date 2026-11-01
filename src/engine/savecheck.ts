// Save compatibility: whether a parsed save can run on this build's content. Content changes between
// builds (v2 removed cards, relics and statuses that v1 saves still hold), and a save naming an id
// this build doesn't register would crash the moment anything looks it up. So before a save is loaded,
// every id it holds is resolved against the registries; any miss makes it incompatible, and the
// renderer discards it with a notice instead of crashing (RunSession.loadOrIncompatible).
//
// The walk is generic where the shape allows (every card instance or offer anywhere in the state,
// every `statuses` map) and field by field for the other id kinds.

import { isRegisteredId, allRelics, type DefKind } from '../content';
import type { RunState } from './types';

type Json = unknown;

const isObj = (v: Json): v is Record<string, Json> => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Every unresolvable id in `state`, as "kind 'id' at path" (empty = compatible). */
export function unresolvedIds(state: RunState): string[] {
  const out: string[] = [];
  const relicRestOptions = new Set(allRelics().flatMap((r) => (r.restOption ? [r.restOption.id] : [])));
  const check = (kind: DefKind, id: Json, path: string) => {
    if (typeof id !== 'string') { out.push(`${kind} id at ${path} is not a string (${JSON.stringify(id)})`); return; }
    const ok = kind === 'rest option' ? isRegisteredId(kind, id) || relicRestOptions.has(id) : isRegisteredId(kind, id);
    if (!ok) out.push(`${kind} '${id}' at ${path}`);
  };
  const list = (kind: DefKind, v: Json, path: string) => {
    if (v === null || v === undefined) return;
    if (!Array.isArray(v)) { out.push(`${path} is not a list`); return; }
    v.forEach((id, i) => check(kind, id, `${path}[${i}]`));
  };

  // generic: card instances / offers and status maps wherever they sit (piles, timeline, rack, queue, choices)
  const walk = (v: Json, path: string) => {
    if (Array.isArray(v)) { v.forEach((x, i) => walk(x, `${path}[${i}]`)); return; }
    if (!isObj(v)) return;
    if (typeof v.id === 'string' && typeof v.upgraded === 'boolean') check('card', v.id, path);
    for (const [k, x] of Object.entries(v)) {
      if (k === 'statuses' && isObj(x)) for (const sid of Object.keys(x)) check('status', sid, `${path}.statuses`);
      walk(x, `${path}.${k}`);
    }
  };
  walk(state, '$');

  check('class', state.classId, '$.classId');
  const p = state.player;
  p.relics.forEach((r, i) => check('relic', r.id, `$.player.relics[${i}]`));
  list('potion', p.potions, '$.player.potions');
  for (const k of Object.keys(p.counters)) {
    const m = /^combat_start_status:(.+)$/.exec(k);
    if (m) check('status', m[1], `$.player.counters`);
  }
  check('encounter', state.map.bossEncounter, '$.map.bossEncounter');
  state.map.rows.forEach((row, r) => row.forEach((n, c) => { if (n.encounterId !== undefined) check('encounter', n.encounterId, `$.map.rows[${r}][${c}]`); }));
  list('encounter', state.counters.encounters, '$.counters.encounters');
  list('event', state.counters.eventsSeen, '$.counters.eventsSeen');
  const c = state.combat;
  if (c) {
    c.enemies.forEach((e, i) => check('enemy', e.id, `$.combat.enemies[${i}]`));
    check('encounter', c.encounterId, '$.combat.encounterId');
    if (c.eventId !== null) check('event', c.eventId, '$.combat.eventId');
  }
  if (state.event) check('event', state.event.id, '$.event.id');
  if (state.reward) {
    if (state.reward.potion !== null) check('potion', state.reward.potion, '$.reward.potion');
    if (state.reward.relic !== null) check('relic', state.reward.relic, '$.reward.relic');
  }
  if (state.shop) {
    state.shop.relics.forEach((it, i) => check('relic', it.id, `$.shop.relics[${i}]`));
    state.shop.potions.forEach((it, i) => check('potion', it.id, `$.shop.potions[${i}]`));
  }
  if (state.treasure?.relic) check('relic', state.treasure.relic, '$.treasure.relic');
  if (state.rest) { list('rest option', state.rest.specials, '$.rest.specials'); list('rest option', state.rest.sideUsed, '$.rest.sideUsed'); }
  list('relic', state.bossRelicChoices, '$.bossRelicChoices');
  state.startChoices?.forEach((b, i) => check('boon', b.id, `$.startChoices[${i}]`));
  state.history.floors.forEach((f, i) => {
    const at = `$.history.floors[${i}]`;
    if (f.encounterId !== null) check('encounter', f.encounterId, `${at}.encounterId`);
    list('enemy', f.enemies, `${at}.enemies`);
    for (const k of ['cardsOffered', 'cardsAdded', 'cardsRemoved', 'cardsUpgraded'] as const) list('card', f[k], `${at}.${k}`);
    if (f.cardPicked !== null) check('card', f.cardPicked, `${at}.cardPicked`);
    list('relic', f.relicsGained, `${at}.relicsGained`);
    list('potion', f.potionsGained, `${at}.potionsGained`);
    list('potion', f.potionsUsed, `${at}.potionsUsed`);
    if (f.eventId !== null) check('event', f.eventId, `${at}.eventId`);
    if (f.boonId !== null) check('boon', f.boonId, `${at}.boonId`);
  });
  return out;
}
