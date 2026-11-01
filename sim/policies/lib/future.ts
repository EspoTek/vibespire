// Value the planner's evaluate() cannot see at the next decision point (phase 2 evaluator gaps):
//
// - Banked next-turn resources: energy / draw stored in combat.counters.bankEnergy / bankDraw (paid
//   out at the next player turn start), and the surplus energy and cards at the next decision point
//   after the bank paid out (energy above maxEnergy, hand above the turn's draw).
// - Pile composition: cards generated this combat (tokens, Status fodder like Graft's Chaff) sitting in
//   the hand, draw or discard. Junk is a cost unless the deck can Prune / Scrap it for value.
// - The Timeline priced through the engine: in a copy, every remaining entry resolves in its due-turn
//   batch (so Chorus, Gather and Schedule count as they will), and the enemy HP, Block / Guard and
//   debuff stacks it produces are scored, discounted per batch. This replaces evaluate()'s static
//   price for entries, which reads `custom` effects as a flat 4.

import { getStatusDef } from '../../../src/content';
import { Game, type CardInstance, type QueueItem, type RunState } from '../../../src/engine';
import { enqueue, makeEnv } from '../../../src/engine/core';
import { drain } from '../../../src/engine/queue';
import { effectsValue, infoOf } from './cards';
import { cloneForSim } from './clone';
import { combatOver, effHp, settle } from './combat';

/** d per banked or surplus energy, and per banked or surplus card. */
const ENERGY_D = 4.5;
const CARD_D = 2.5;

/** Banked next-turn resources still waiting in the counters (mid-turn and post-turn states). */
export function bankValue(s: RunState): number {
  const c = s.combat;
  if (!c) return 0;
  return ENERGY_D * (c.counters.bankEnergy ?? 0) + CARD_D * (c.counters.bankDraw ?? 0);
}

/** Surplus energy and cards at a decision point right after a turn start (only meaningful there). */
export function surplusValue(s: RunState): number {
  const c = s.combat;
  if (!c || combatOver(s)) return 0;
  return ENERGY_D * Math.max(0, c.energy - c.maxEnergy) + CARD_D * Math.max(0, c.hand.length - c.drawPerTurn);
}

function deckCanUseJunk(s: RunState): boolean {
  for (const card of s.player.deck) {
    const i = infoOf(card);
    if (i.tags.includes('engine:compost') || i.tags.includes('prune')) return true;
    if ((i.def.keywords ?? []).includes('bloom') && i.def.effects.some((e) => e.type === 'prune')) return true;
  }
  return false;
}

/** Cards generated this combat (not copies of deck cards) in the hand, draw and discard piles. */
export function pileValue(s: RunState): number {
  const c = s.combat;
  if (!c || combatOver(s)) return 0;
  const deck = new Set(s.player.deck.map((x) => x.uid));
  const fodder = deckCanUseJunk(s);
  let v = 0;
  const each = (x: CardInstance): void => {
    if (deck.has(x.uid)) return;
    const i = infoOf(x);
    if (i.junk) v += i.def.type === 'curse' ? -4 : fodder ? 0.8 : -1.5;
    else v += 0.3 * Math.max(-5, Math.min(8, i.value));
  };
  for (const x of c.hand) each(x);
  for (const x of c.draw) each(x);
  for (const x of c.discard) each(x);
  return v;
}

/** d per point of Guard carried into the next turn when the deck can Shed it (hold-then-Shed). */
const SHED_GUARD_D = 0.4;

/**
 * Carried Guard is a resource for Shed cards (Breaker Bastion): value it at the next decision point
 * when the deck holds a Shed card, so the planner holds Guard instead of only weighing it against the
 * next attack.
 */
export function shedStockValue(s: RunState): number {
  const c = s.combat;
  if (!c || combatOver(s) || c.player.guard <= 0) return 0;
  return s.player.deck.some((x) => infoOf(x).sheds) ? SHED_GUARD_D * c.player.guard : 0;
}

/** evaluate()'s static price of the Timeline (subtracted when the engine price replaces it). */
export function staticTimeline(s: RunState): number {
  const c = s.combat;
  if (!c) return 0;
  let v = 0;
  for (const t of c.timeline) {
    const def = infoOf(t.card).def;
    if (def.delay) v += 0.6 * effectsValue(def.delay.effects, t.card.vars?.bloom ?? 0);
  }
  return v;
}

function debuffStacks(s: RunState): number {
  const c = s.combat;
  if (!c) return 0;
  let n = 0;
  for (const e of c.enemies) {
    if (!e.alive) continue;
    for (const [id, k] of Object.entries(e.statuses)) if (k > 0 && getStatusDef(id).isDebuff) n += Math.min(k, 15);
  }
  return n;
}

/** Discount per future batch (one per distinct due turn). */
const BATCH_DISCOUNT = 0.85;

/**
 * The Timeline resolved through the engine in a copy: per due-turn batch, enemy HP removed + 0.6 ×
 * Block/Guard gained + 2 per debuff stack, discounted per batch; a batch that ends the fight scores
 * the enemies' remaining effective HP. Returns 0 for an empty Timeline.
 */
export function timelineValue(s: RunState): number {
  const c0 = s.combat;
  if (!c0 || c0.timeline.length === 0 || combatOver(s)) return 0;
  const g = new Game(cloneForSim(s), { atomic: false });
  const turns = [...new Set(c0.timeline.map((e) => e.dueTurn))].sort((a, b) => a - b);
  let v = 0;
  let w = 1;
  for (const due of turns) {
    const st = g.state;
    const c = st.combat;
    if (!c || combatOver(st)) break;
    const batch = c.timeline.filter((e) => e.dueTurn === due).sort((a, b) => a.seq - b.seq);
    if (batch.length === 0) continue;
    const hp0 = effHp(c);
    const def0 = c.player.block + c.player.guard;
    const deb0 = debuffStacks(st);
    const env = makeEnv(st);
    const steps: QueueItem[] = batch.map((e) => ({ kind: 'step', step: { op: 'timeline_entry', seq: e.seq, batch: batch.length } }));
    enqueue(env, steps);
    drain(env);
    settle(g);
    const after = g.state.combat;
    if (!after || combatOver(g.state)) {
      v += w * hp0;
      break;
    }
    v += w * (hp0 - effHp(after) + 0.6 * Math.max(0, after.player.block + after.player.guard - def0) + 2 * Math.max(0, debuffStacks(g.state) - deb0));
    w *= BATCH_DISCOUNT;
  }
  return v;
}
