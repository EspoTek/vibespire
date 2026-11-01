// Static validation of content definitions against the DSL rules. Throws listing every problem.
// tests/content runs validateAllContent(); run it after adding content.

import {
  allBoons,
  allCards,
  allEncounters,
  allEnemies,
  allEvents,
  allPotions,
  allRelics,
  allRestOptions,
  allStatuses,
  getCardDef,
  getEncounterDef,
  getEnemyDef,
  getStatusDef,
  validateRegistries,
} from '../content';
import { TUNING } from './tuning';
import type { Amount, Condition, DslTables, Effect, EventOptionDef, RestOptionDef } from './types';

/** Hooks whose declarative triggers get a frame target (see statuses.ts). */
const TARGETED_HOOKS: readonly string[] = [
  'onCardPlayed', 'afterCardPlayed', 'onDamageTaken', 'onHpLost', 'onDamageDealt', 'onEnemyAttackDeclared', 'onRiposteTriggered', 'onEnemySpawn',
];
const RUN_HOOKS: readonly string[] = ['onPickup', 'onRest', 'onShopEnter', 'onFloorEnter', 'onActStart', 'onGoldGain', 'onShardGain', 'onRewardSkipped', 'onCardAdded'];

/** Effects that only make sense inside combat. */
const COMBAT_ONLY: ReadonlySet<Effect['type']> = new Set([
  'damage', 'block', 'guard', 'lose_defence', 'lose_guard', 'draw', 'discard', 'exhaust', 'energy', 'status', 'scry', 'prune', 'advance', 'postpone',
  'on_beat', 'fetch_card', 'spend_status', 'shed', 'autoplay', 'harvest', 'summon', 'transform', 'reroll_forecast', 'ai_state', 'halt_enemy', 'prime', 'cancel_attack',
  'gather', 'quicken', 'schedule',
  'strain', 'triage', 'copy_card', 'add_random_card',
]);
/** Effects only an enemy (self) may use. */
const ENEMY_ONLY: ReadonlySet<Effect['type']> = new Set(['summon', 'transform', 'reroll_forecast', 'ai_state']);
/** Effects that only make sense outside combat (they open run-level choices or change rooms). */
const RUN_ONLY: ReadonlySet<Effect['type']> = new Set(['transmute', 'offer_cards', 'start_combat', 'lose_relic']);

interface Where {
  label: string;
  tables: DslTables;
  /** Can effects reference 'target'? */
  hasTarget: boolean;
  /** Are combat-only effects allowed? */
  combat: boolean;
  /** Are run-only effects allowed? */
  run: boolean;
  enemy: boolean;
  /** Inside a Riposte list (trigger_hits, cancel_attack allowed). */
  riposte?: boolean;
}

export function validateEffects(effects: readonly Effect[], w: Where, out: string[]): void {
  const bad = (msg: string): void => {
    out.push(`${w.label}: ${msg}`);
  };
  const exists = (f: () => unknown, what: string): void => {
    try {
      f();
    } catch (e) {
      // Re-reported as a validation problem (collected, then thrown together by the caller).
      bad(`${what}: ${e instanceof Error ? e.message : String(e)}`);
    }
  };
  /** targeted: the amount is resolved with a frame target (perTarget effects) even if the source has none. */
  const amount = (a: Amount | 'all' | undefined, targeted = w.hasTarget): void => {
    if (a === undefined || a === 'all' || typeof a === 'number' || a === 'X') return;
    const s = a.scale;
    if (typeof s === 'object' && 'fn' in s && !w.tables.amounts?.[s.fn]) bad(`amount fn '${s.fn}' missing`);
    if (typeof s === 'object' && 'status' in s) {
      exists(() => getStatusDef(s.status), 'amount status');
      if (s.of === 'target' && !targeted) bad(`amount of target status but no target`);
    }
    if (typeof s === 'object' && 'ai' in s && !w.enemy) bad(`amount scale ai:${s.ai} outside an enemy`);
    if (s === 'trigger_hits' && !w.riposte) bad("amount scale 'trigger_hits' outside a Riposte list");
    if (s === 'triggered_riposte' && !w.enemy) bad("amount scale 'triggered_riposte' outside an enemy move");
  };
  const cond = (c: Condition): void => {
    switch (c.type) {
      case 'fn':
        if (!w.tables.conditions?.[c.fn]) bad(`condition fn '${c.fn}' missing`);
        return;
      case 'not':
        cond(c.cond);
        return;
      case 'all':
      case 'any':
        c.conds.forEach(cond);
        return;
      case 'compare':
        amount(c.left);
        amount(c.right);
        return;
      case 'has_status':
        exists(() => getStatusDef(c.id), 'condition status');
        if (c.who === 'target' && !w.hasTarget) bad('condition on target but no target');
        return;
      case 'target_dead':
      case 'target_intends_attack':
        if (!w.hasTarget) bad(`condition ${c.type} but no target`);
        return;
      case 'forecast_is_attack':
        if (c.who === 'target' && !w.hasTarget) bad('forecast_is_attack on target but no target');
        if (c.depth < 0) bad('forecast_is_attack depth must be >= 0');
        return;
      case 'hp_below_pct':
        if (c.who === 'target' && !w.hasTarget) bad('condition on target but no target');
        return;
      case 'on_beat':
      case 'pruned_type':
      case 'timeline_nonempty':
      case 'is_class':
      case 'removed_self':
      case 'ripe':
        return;
    }
  };
  const oneMode = (e: { random?: boolean; choose?: boolean; all?: boolean; self?: boolean }, modes: readonly ('random' | 'choose' | 'all' | 'self')[]): void => {
    const n = modes.filter((m) => e[m] === true).length;
    if (n !== 1) bad(`exactly one of ${modes.join('/')} must be true`);
  };
  for (const e of effects) {
    if (!w.combat && COMBAT_ONLY.has(e.type)) bad(`combat-only effect '${e.type}' outside combat`);
    if (!w.run && RUN_ONLY.has(e.type)) bad(`run-only effect '${e.type}' inside combat`);
    if (!w.enemy && ENEMY_ONLY.has(e.type)) bad(`enemy-only effect '${e.type}'`);
    switch (e.type) {
      case 'damage':
        amount(e.amount);
        amount(e.times);
        if ((e.target === 'target' || e.target === 'attacker') && !w.hasTarget) bad(`damage targets '${e.target}' but the source has no target`);
        break;
      case 'status':
        exists(() => getStatusDef(e.id), 'status');
        // perTarget (shared v2): each target is the frame target for its own amount.
        amount(e.amount, w.hasTarget || e.perTarget === true);
        if ((e.target === 'target' || e.target === 'attacker') && !w.hasTarget) bad(`status targets '${e.target}' but the source has no target`);
        break;
      case 'halt_enemy':
        if ((e.target === 'target' || e.target === 'attacker') && !w.hasTarget) bad('halt_enemy targets a target but the source has no target');
        break;
      case 'harvest':
        amount(e.mult);
        if ((e.target === 'target' || e.target === 'attacker') && !w.hasTarget) bad('harvest targets a target but the source has no target');
        break;
      case 'discard':
        oneMode(e, ['random', 'choose', 'all']);
        amount(e.n);
        break;
      case 'exhaust':
        oneMode(e, ['random', 'choose', 'all', 'self']);
        amount(e.n);
        if (e.upTo === true && e.choose !== true) bad('exhaust upTo needs choose');
        if (e.self === true && (e.then !== undefined || e.filter !== undefined)) bad('exhaust self takes no then / filter');
        if (e.filter?.ripe !== undefined) bad("exhaust filter 'ripe' is not supported (fetch_card only)");
        if (e.then) validateEffects(e.then, w, out);
        break;
      // --- Shared v2
      case 'strain':
        amount(e.amount);
        break;
      case 'triage':
        if (!Number.isInteger(e.keep) || e.keep < 0) bad('triage keep must be a non-negative integer');
        break;
      case 'copy_card':
        break;
      case 'add_random_card':
        amount(e.n);
        if (e.filter?.ripe !== undefined) bad("add_random_card filter 'ripe' is not supported");
        break;
      case 'remove_card':
        oneMode(e, ['random', 'choose', 'all', 'self']);
        if (e.from === 'hand' && e.choose !== true) bad("remove_card from 'hand' needs choose");
        amount(e.n);
        break;
      case 'transform_card':
        oneMode(e, ['random', 'choose']);
        amount(e.n);
        break;
      case 'add_card':
        exists(() => getCardDef(e.card), 'add_card');
        amount(e.n);
        if (!w.combat && e.to !== 'deck') bad(`add_card to '${e.to}' outside combat`);
        break;
      case 'upgrade':
        amount(e.n);
        if (!w.combat && e.where !== 'deck') bad(`upgrade '${e.where}' outside combat`);
        break;
      case 'choose':
        if (e.options.length === 0) bad('choose with no options');
        for (const o of e.options) {
          if (o.if) cond(o.if);
          validateEffects(o.effects, w, out);
        }
        break;
      case 'repeat':
        amount(e.times);
        validateEffects(e.effects, w, out);
        break;
      case 'conditional':
        cond(e.if);
        validateEffects(e.then, w, out);
        if (e.else) validateEffects(e.else, w, out);
        break;
      case 'custom':
        if (!w.tables.custom?.[e.fn]) bad(`custom fn '${e.fn}' missing`);
        break;
      case 'block':
      case 'guard':
      case 'heal':
      case 'lose_hp':
      case 'max_hp':
      case 'gold':
      case 'shards':
      case 'bloom':
        amount(e.amount);
        break;
      case 'lose_defence':
        amount(e.amount);
        break;
      case 'lose_guard':
        amount(e.amount === 'half' ? undefined : e.amount);
        break;
      case 'draw':
      case 'energy':
      case 'scry':
        amount(e.n);
        break;
      case 'spend_status':
        exists(() => getStatusDef(e.id), 'spend_status');
        validateEffects(e.effects, w, out);
        break;
      case 'shed':
        if (w.enemy) bad('shed is player-only');
        if (typeof e.n === 'number' && e.n <= 0) bad('shed n must be > 0');
        validateEffects(e.effects, w, out);
        break;
      case 'on_beat':
        validateEffects(e.effects, w, out);
        break;
      case 'prune':
        if (e.bloom !== undefined && e.bloom < 0) bad('prune bloom must be >= 0');
        break;
      case 'advance':
      case 'postpone':
      case 'quicken':
        if (e.n <= 0) bad(`${e.type} n must be > 0`);
        break;
      case 'schedule':
        if (e.turns < 1 || e.turns > TUNING.caps.delayMax) bad(`schedule turns must be 1..${TUNING.caps.delayMax}`);
        break;
      case 'fetch_card':
        amount(e.n);
        break;
      case 'offer_cards':
        if (e.n <= 0) bad('offer_cards n must be > 0');
        break;
      case 'start_combat':
        exists(() => getEncounterDef(e.encounterId), 'start_combat');
        validateEffects(e.onWin ?? [], { ...w, label: `${w.label} onWin`, combat: false, run: true }, out);
        break;
      case 'gamble':
        if (e.outcomes.length === 0 || e.outcomes.some((o) => o.weight < 0)) bad('gamble needs outcomes with weight >= 0');
        for (const o of e.outcomes) validateEffects(o.effects, w, out);
        break;
      case 'summon':
        exists(() => getEnemyDef(e.enemy), 'summon');
        break;
      case 'transform':
        exists(() => getEnemyDef(e.into), 'transform');
        break;
      case 'cancel_attack':
        if (!w.riposte && !w.hasTarget) bad('cancel_attack outside a Riposte list / attack-declared trigger');
        break;
      case 'autoplay':
        amount(e.n);
        break;
      case 'gain_relic':
      case 'gain_potion':
      case 'potion_slots':
      case 'transmute':
      case 'duplicate_card':
      case 'lose_potion':
      case 'lose_relic':
      case 'run_flag':
      case 'reroll_forecast':
      case 'ai_state':
      case 'prime':
        break;
    }
  }
}

function restOpt(o: RestOptionDef, label: string, out: string[]): void {
  validateEffects(o.effects, { label, tables: o, hasTarget: false, combat: false, run: true, enemy: false }, out);
}

function eventOptions(id: string, options: readonly EventOptionDef[], pages: readonly string[], tables: DslTables, out: string[], page: string): void {
  options.forEach((o, i) => {
    validateEffects(o.effects, { label: `event ${id}${page}[${i}]`, tables, hasTarget: false, combat: false, run: true, enemy: false }, out);
    if (o.next !== undefined && !pages.includes(o.next)) out.push(`event ${id}[${i}]: next page '${o.next}' does not exist`);
  });
}

/** Validate every registered definition. Throws with the full list of problems. */
export function validateAllContent(): void {
  validateRegistries();
  const out: string[] = [];
  for (const base of allCards()) {
    for (const def of [base, getCardDef(base.id, true)]) {
      const label = `card ${def.id}${def === base ? '' : '+'}`;
      const hasTarget = def.target === 'enemy';
      validateEffects(def.effects, { label, tables: def, hasTarget, combat: true, run: false, enemy: false }, out);
      if (def.riposte) validateEffects(def.riposte, { label: `${label} riposte`, tables: def, hasTarget: true, combat: true, run: false, enemy: false, riposte: true }, out);
      if (def.delay) {
        if (def.type === 'power') out.push(`${label}: Powers cannot have Delay`);
        if (def.delay.turns < 1 || def.delay.turns > TUNING.caps.delayMax) out.push(`${label}: delay turns must be 1-${TUNING.caps.delayMax}`);
        validateEffects(def.delay.effects, { label: `${label} delay`, tables: def, hasTarget, combat: true, run: false, enemy: false }, out);
      }
      // Shared v2 H2: Salvage runs with no chosen target (single-target effects must say random_enemy).
      if (def.salvage) validateEffects(def.salvage, { label: `${label} salvage`, tables: def, hasTarget: false, combat: true, run: false, enemy: false }, out);
      if (def.cost === null && !def.keywords?.includes('unplayable')) out.push(`${label}: cost null but no 'unplayable' keyword`);
      if ((def.keywords ?? []).includes('riposte') !== (def.riposte !== undefined)) out.push(`${label}: 'riposte' keyword and riposte list must go together`);
      if ((def.keywords ?? []).includes('delay') !== (def.delay !== undefined)) out.push(`${label}: 'delay' keyword and delay block must go together`);
    }
  }
  for (const r of allRelics()) {
    for (const [hook, effects] of Object.entries(r.triggers ?? {})) {
      const combat = !RUN_HOOKS.includes(hook);
      validateEffects(effects ?? [], { label: `relic ${r.id}.${hook}`, tables: r, hasTarget: TARGETED_HOOKS.includes(hook), combat, run: !combat, enemy: false }, out);
    }
    if (r.restOption) restOpt(r.restOption, `relic ${r.id} rest option`, out);
  }
  for (const s of allStatuses()) {
    for (const [hook, effects] of Object.entries(s.triggers ?? {})) {
      validateEffects(effects ?? [], { label: `status ${s.id}.${hook}`, tables: s, hasTarget: TARGETED_HOOKS.includes(hook), combat: true, run: false, enemy: true }, out);
    }
  }
  for (const p of allPotions()) {
    validateEffects(p.effects, { label: `potion ${p.id}`, tables: p, hasTarget: p.target === 'enemy', combat: p.combatOnly, run: !p.combatOnly, enemy: false }, out);
    if (p.target === 'enemy' && !p.combatOnly) out.push(`potion ${p.id}: enemy-targeted potions must be combatOnly`);
  }
  for (const e of allEnemies()) {
    for (const [id, m] of Object.entries(e.moves)) {
      if (id === '__flee') out.push(`enemy ${e.id}: move id '__flee' is reserved`);
      validateEffects(m.effects, { label: `enemy ${e.id}.${id}`, tables: e, hasTarget: true, combat: true, run: false, enemy: true }, out);
    }
    for (const sid of Object.keys(e.spawnStatuses ?? {})) {
      try {
        getStatusDef(sid);
      } catch (err) {
        out.push(`enemy ${e.id} spawnStatuses: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }
  for (const enc of allEncounters()) if (enc.relicBias !== undefined && !allRelics().some((r) => r.id === enc.relicBias)) out.push(`encounter ${enc.id}: unknown relicBias`);
  for (const ev of allEvents()) {
    if (ev.options.length === 0) out.push(`event ${ev.id}: no options`);
    const pages = Object.keys(ev.pages ?? {});
    eventOptions(ev.id, ev.options, pages, ev, out, '');
    for (const [p, page] of Object.entries(ev.pages ?? {})) eventOptions(ev.id, page.options, pages, ev, out, `.${p}`);
  }
  for (const b of allBoons()) validateEffects(b.effects, { label: `boon ${b.id}`, tables: b, hasTarget: false, combat: false, run: true, enemy: false }, out);
  for (const o of allRestOptions()) restOpt(o, `rest option ${o.id}`, out);
  if (out.length) throw new Error(`content validation failed:\n  ${out.join('\n  ')}`);
}
