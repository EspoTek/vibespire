// Delay and the Timeline (GDD §2.8): adding entries, Advance / Postpone, resolution.

import { capHit, takeBudget } from './caps';
import { cardDef } from './cards';
import { emit, enqueue, isAlive, livingEnemies, requireCombat, type Env } from './core';
import { effectItems } from './ctx';
import { dispatch } from './statuses';
import { TUNING } from './tuning';
import type { CardInstance, EntityRef, QueueItem, TimelineEntry } from './types';

/** Put a just-played Delay card onto the Timeline. Returns false when the Timeline is full (cap). */
export function addToTimeline(env: Env, card: CardInstance, target: EntityRef | null, x: number, onBeat: boolean): boolean {
  const c = requireCombat(env.state, 'timeline add');
  const def = cardDef(card);
  if (!def.delay) throw new Error(`card ${card.id} has no delay`);
  if (c.timeline.length >= TUNING.caps.timeline) {
    capHit(env, 'cap_timeline');
    return false;
  }
  const seq = c.counters.timelineSeq ?? 0;
  c.counters.timelineSeq = seq + 1;
  const turns = Math.min(def.delay.turns, TUNING.caps.delayMax);
  const entry: TimelineEntry = { card, dueTurn: c.turn + turns, seq, onBeat, target, x, advancedThisTurn: false };
  c.timeline.push(entry);
  emit(env, { t: 'timeline_added', uid: card.uid, dueTurn: entry.dueTurn, onBeat });
  dispatch(env, 'onTimelineAdd', 'player', { entry, onBeat }, null, onBeat);
  return true;
}

/** Steps resolving every due entry (dueTurn <= turn) in seq order. */
export function dueEntrySteps(env: Env): QueueItem[] {
  const c = requireCombat(env.state, 'timeline due');
  return c.timeline
    .filter((e) => e.dueTurn <= c.turn)
    .sort((a, b) => a.seq - b.seq)
    .map((e): QueueItem => ({ kind: 'step', step: { op: 'timeline_entry', seq: e.seq } }));
}

/** Resolve one entry: its delay effects with the stamped target (dead → leftmost living enemy), x and onBeat. */
export function resolveEntry(env: Env, seq: number): void {
  const c = requireCombat(env.state, 'timeline resolve');
  const i = c.timeline.findIndex((e) => e.seq === seq);
  if (i < 0) return; // already resolved (e.g. by an Advance this turn)
  const [entry] = c.timeline.splice(i, 1);
  if (!entry) throw new Error('timeline entry vanished');
  const card = entry.card;
  const def = cardDef(card);
  if (!def.delay) throw new Error(`timeline card ${card.id} has no delay`);
  let target = entry.target;
  if (target !== null && target !== 'player' && !isAlive(env.state, target)) target = livingEnemies(c)[0]?.uid ?? null;
  c.inPlay.push(card);
  if (entry.target !== null && target === null) {
    // Its stamped enemy is dead and none is left (the fight is ending): the card fizzles to its pile without resolving.
    emit(env, { t: 'timeline_resolved', uid: card.uid });
    enqueue(env, [{ kind: 'finish_card', uid: card.uid, target: null, via: 'timeline', onBeat: entry.onBeat, depth: 0, x: entry.x }]);
    return;
  }
  c.resolvedThisTurn.push(card.uid);
  c.counters.curCardUid = card.uid;
  c.counters.curCardDmg = 0;
  emit(env, { t: 'timeline_resolved', uid: card.uid });
  enqueue(env, [
    ...effectItems(def.delay.effects, {
      src: { kind: 'card', uid: card.uid, id: card.id, upgraded: card.upgraded }, self: 'player', target, x: entry.x, onBeat: entry.onBeat, delayed: true, depth: 0,
    }),
    { kind: 'finish_card', uid: card.uid, target, via: 'timeline', onBeat: entry.onBeat, depth: 0, x: entry.x },
  ]);
}

/** Advance n (cap advancePerTurn per turn); entries now due resolve at once, in seq order. */
export function advance(env: Env, n: number): void {
  const c = requireCombat(env.state, 'advance');
  if (c.timeline.length === 0 || n <= 0) return;
  const granted = takeBudget(env, 'advance', TUNING.caps.advancePerTurn, 'cap_advance', n);
  if (granted <= 0) return;
  for (const e of c.timeline) {
    e.dueTurn -= granted;
    e.advancedThisTurn = true;
  }
  emit(env, { t: 'timeline_shifted', delta: -granted });
  enqueue(env, dueEntrySteps(env));
}

export function postpone(env: Env, n: number): void {
  const c = requireCombat(env.state, 'postpone');
  const m = Math.min(Math.max(0, n), TUNING.caps.postponeMax);
  if (c.timeline.length === 0 || m === 0) return;
  for (const e of c.timeline) e.dueTurn += m;
  emit(env, { t: 'timeline_shifted', delta: m });
}
