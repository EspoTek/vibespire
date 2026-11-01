// Delay and the Timeline (GDD §2.8): adding entries, Advance / Postpone, resolution.
// Chronist v2 (docs/v2/chronist-design.md §6): batches + Chorus (H1), Gather (H2), Schedule (H6),
// timelineResolutions (H7, Total Eclipse) and recurDelay (H8, Eternal Return, in combat.ts finishCardItem).

import { capHit, takeBudget } from './caps';
import { cardDef } from './cards';
import { emit, enqueue, isAlive, livingEnemies, requireCombat, type Env } from './core';
import { openChoice } from './queue';
import { dispatch, playerRule } from './statuses';
import { TUNING } from './tuning';
import type { CardDef, CardInstance, EntityRef, QueueItem, RunState, TimelineEntry } from './types';

export interface TimelineAddOpts {
  /** Delay override (Schedule, recurrence); default the card's delay.turns. */
  turns?: number;
  /** A Scheduled (non-Delay) card: it resolves its `effects`. */
  scheduled?: boolean;
  /** Beat index stamped at play (scale 'beat_index'). */
  beatIndex?: number;
}

/** Put a just-played Delay card (or a Scheduled / recurring card) onto the Timeline. Returns false when the Timeline is full (cap). */
export function addToTimeline(env: Env, card: CardInstance, target: EntityRef | null, x: number, onBeat: boolean, opts: TimelineAddOpts = {}): boolean {
  const c = requireCombat(env.state, 'timeline add');
  const def = cardDef(card);
  if (!def.delay && opts.scheduled !== true) throw new Error(`card ${card.id} has no delay`);
  if (c.timeline.length >= TUNING.caps.timeline) {
    capHit(env, 'cap_timeline');
    return false;
  }
  const baseTurns = opts.turns ?? def.delay?.turns;
  if (baseTurns === undefined || baseTurns < 1) throw new Error(`timeline add: ${card.id} needs a delay of at least 1 turn`);
  const seq = c.counters.timelineSeq ?? 0;
  c.counters.timelineSeq = seq + 1;
  const turns = Math.min(baseTurns, TUNING.caps.delayMax);
  const entry: TimelineEntry = { card, dueTurn: c.turn + turns, seq, onBeat, target, x, advancedThisTurn: false };
  if (opts.scheduled === true) entry.scheduled = true;
  if (opts.beatIndex !== undefined && opts.beatIndex > 0) entry.beatIndex = opts.beatIndex;
  c.timeline.push(entry);
  emit(env, { t: 'timeline_added', uid: card.uid, dueTurn: entry.dueTurn, onBeat });
  dispatch(env, 'onTimelineAdd', 'player', { entry, onBeat }, null, onBeat);
  return true;
}

/** Steps resolving every due entry (dueTurn <= turn) in seq order. They form one batch (Chorus counts the others). */
export function dueEntrySteps(env: Env): QueueItem[] {
  const c = requireCombat(env.state, 'timeline due');
  const due = c.timeline.filter((e) => e.dueTurn <= c.turn).sort((a, b) => a.seq - b.seq);
  return due.map((e): QueueItem => ({ kind: 'step', step: { op: 'timeline_entry', seq: e.seq, batch: due.length } }));
}

/**
 * Chorus preview (H1) for card text: the other entries that would resolve with this card. A card on the
 * Timeline counts the other entries due on its turn; a Delay card elsewhere counts the entries due on the
 * turn it would land if played now. 0 outside combat or for other cards.
 */
export function chorusPreview(state: RunState, uid: number, def: CardDef): number {
  const c = state.combat;
  if (!c) return 0;
  const own = c.timeline.find((e) => e.card.uid === uid);
  if (own) return c.timeline.filter((e) => e !== own && e.dueTurn === own.dueTurn).length;
  if (!def.delay) return 0;
  const due = c.turn + Math.min(def.delay.turns, TUNING.caps.delayMax);
  return c.timeline.filter((e) => e.dueTurn === due).length;
}

/** Resolve one entry: its delay effects (a Scheduled card: its effects) with the stamped target (dead → leftmost living enemy), x and onBeat. */
export function resolveEntry(env: Env, seq: number, batch = 1): void {
  const c = requireCombat(env.state, 'timeline resolve');
  const i = c.timeline.findIndex((e) => e.seq === seq);
  if (i < 0) return; // already resolved (e.g. by an Advance this turn)
  const [entry] = c.timeline.splice(i, 1);
  if (!entry) throw new Error('timeline entry vanished');
  const card = entry.card;
  const def = cardDef(card);
  const scheduled = entry.scheduled === true;
  if (!def.delay && !scheduled) throw new Error(`timeline card ${card.id} has no delay`);
  const extra = { scheduled, beatIndex: entry.beatIndex };
  let target = entry.target;
  if (target !== null && target !== 'player' && !isAlive(env.state, target)) target = livingEnemies(c)[0]?.uid ?? null;
  c.inPlay.push(card);
  if (entry.target !== null && target === null) {
    // Its stamped enemy is dead and none is left (the fight is ending): the card fizzles to its pile without resolving.
    emit(env, { t: 'timeline_resolved', uid: card.uid });
    enqueue(env, [{ kind: 'finish_card', uid: card.uid, target: null, via: 'timeline', onBeat: entry.onBeat, depth: 0, x: entry.x, ...extra, batch }]);
    return;
  }
  c.resolvedThisTurn.push(card.uid);
  c.counters.curCardUid = card.uid;
  c.counters.curCardDmg = 0;
  emit(env, { t: 'timeline_resolved', uid: card.uid });
  const effects = scheduled ? def.effects : (def.delay?.effects ?? []);
  const frame = {
    src: { kind: 'card' as const, uid: card.uid, id: card.id, upgraded: card.upgraded }, self: 'player' as const, target, x: entry.x, onBeat: entry.onBeat, delayed: true, depth: 0,
    chorus: Math.max(0, batch - 1), beatIndex: entry.beatIndex ?? 0,
  };
  const wanted = playerRule(env.state, 1, (m, ctx, a) => (m.timelineResolutions ? m.timelineResolutions(ctx, batch, entry, a) : a), false);
  const runs = Math.max(1, Math.min(TUNING.caps.timelineResolutions, Math.floor(wanted)));
  const items: QueueItem[] = [];
  // RULINGS 73: the resolution pays its Shard cost when it starts, or is skipped (Set the Hour + Crystal
  // Graft at 0 Shards used to throw "shards would go negative" at end of turn).
  const list = scheduled ? 'effects' : 'delay';
  items.push({ kind: 'step', step: { op: 'repeat_resolution', uid: card.uid, list, frame, why: scheduled ? 'the Scheduled resolution' : 'the Delay resolution' } });
  // RULINGS 66: a second run (Total Eclipse) pays any Shard cost again when it starts, or is skipped.
  for (let r = 1; r < runs; r++) items.push({ kind: 'step', step: { op: 'repeat_resolution', uid: card.uid, list, frame, why: 'the second resolution' } });
  enqueue(env, [...items, { kind: 'finish_card', uid: card.uid, target, via: 'timeline', onBeat: entry.onBeat, depth: 0, x: entry.x, ...extra, runs, batch }]);
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

/** Gather (H2): every entry now resolves on the latest entry's turn. It only delays, so no cap applies. */
export function gather(env: Env): void {
  const c = requireCombat(env.state, 'gather');
  if (c.timeline.length < 2) return;
  const latest = Math.max(...c.timeline.map((e) => e.dueTurn));
  if (c.timeline.every((e) => e.dueTurn === latest)) return;
  for (const e of c.timeline) e.dueTurn = latest;
  emit(env, { t: 'timeline_gathered', dueTurn: latest });
}

/** Cards in hand that Schedule (H6) may take: Attacks/Skills without Delay, with a numeric cost, not Unplayable. */
export function schedulable(state: RunState): CardInstance[] {
  const c = requireCombat(state, 'schedule');
  return c.hand.filter((card) => {
    const def = cardDef(card);
    return (def.type === 'attack' || def.type === 'skill') && !def.delay && typeof def.cost === 'number' && !(def.keywords ?? []).includes('unplayable');
  });
}

/** Schedule (H6): choose one eligible hand card (picked automatically when there is only one) for the Timeline. */
export function scheduleFromHand(env: Env, turns: number, target: EntityRef | null): void {
  const cands = schedulable(env.state);
  if (cands.length === 0) {
    emit(env, { t: 'text', text: 'Nothing to Schedule.' });
    return;
  }
  const only = cands[0];
  if (cands.length === 1 && only) {
    scheduleCards(env, [only.uid], turns, target);
    return;
  }
  openChoice(env, {
    kind: 'cards', prompt: 'Schedule a card.', from: 'hand', choices: cands.map((c) => c.uid), labels: [], offers: [], min: 1, max: 1,
    resume: { op: 'schedule', turns, target },
  });
}

/** Move the chosen hand cards onto the Timeline as Scheduled entries (a full Timeline leaves them in hand). */
export function scheduleCards(env: Env, uids: readonly number[], turns: number, target: EntityRef | null): void {
  const c = requireCombat(env.state, 'schedule');
  for (const uid of uids) {
    const card = c.hand.find((x) => x.uid === uid);
    if (!card) throw new Error(`schedule: card ${uid} not in hand`);
    if (c.timeline.length >= TUNING.caps.timeline) {
      capHit(env, 'cap_timeline');
      continue;
    }
    c.hand.splice(c.hand.indexOf(card), 1);
    const def = cardDef(card);
    const t = def.target === 'enemy' ? target : null;
    if (!addToTimeline(env, card, t, 0, false, { turns, scheduled: true })) throw new Error('schedule: Timeline full after the cap check');
  }
}
