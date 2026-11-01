// Combat loop (GDD §2.0, authoritative order). Every step is a queue item, so any step can suspend
// on a pending choice and save/load mid-step works.
//
// Combat start: shuffle deck into draw pile (Opening cards on top) -> class traits
//   (ClassDef.combatStartStatuses, run flags augury_combats / augury_rest_of_act /
//   combat_start_status:<id>) -> onCombatStart (global: player statuses, relics, enemies) ->
//   EnemyDef.onSpawn + onEnemySpawn per enemy -> first intents and forecasts -> player turn 1
//   (or an enemy phase first when an enemiesActFirst modifier says so).
// Player turn start: 1 turn++, Block -> keepBlock, Guard halves (turn > 1); 2 primed cards fizzle;
//   3 energy = max energy, per-turn counters reset; 4 onTurnStart (statuses, relics), tick/decay
//   'start_player_turn'; 5 Timeline resolution (due entries in seq order); 6 draw drawPerTurn.
// Player turn end (end_turn): 1 onTurnEnd, tick 'end_player_turn' + 'end_own_turn' (player);
//   2 prime step; 3 onTurnEndInHand; 4 discard the rest (Keep stays); 5 decay 'end_player_turn' and
//   'end_own_turn' (player).
// Enemy phase, each living enemy in list order: 1 Block -> 0 (keepBlock), Guard halves, onTurnStart
//   (fleeing minions leave here); 2 its move: for an enemy attack, onEnemyAttackDeclared then the
//   Riposte check (leftmost primed card fires at it) before any effect; a dead attacker's move is
//   cancelled (as is one hit by cancel_attack); then onEnemyMoveEnd; 3 its turn end: onTurnEnd,
//   tick 'end_own_turn' (Rot), decay 'end_own_turn' (Exposed/Stagger), next intent + forecast.
//   Then tick/decay 'end_enemy_turn', round end -> next player turn.

import { getClassDef, getEncounterDef, getEnemyDef } from '../content';
import { capHit } from './caps';
import { canPlayCard, cardDef, drawCards, exhaustCards, findCombatCard, getCardCost, hasKeyword, runCardHook, runRepeatResolution, takeFrom } from './cards';
import { emit, enqueue, livingEnemies, requireCombat, stacksOf, type Env } from './core';
import { effectItems } from './ctx';
import { FLEE_MOVE } from './damage';
import { chooseNextMove, isAttackIntent, nextEnemyRound, runOnSpawn, spawnEnemy, STATUS_HALTED } from './enemies';
import { choiceActions } from './queue';
import { fireRiposte, fizzlePrimed, primeStep } from './riposte';
import { pickFrom, shuffleInPlace } from './rng';
import { finishCombatWin } from './run';
import { applyStatus, decayEntity, decayPhase, dispatch, guardDecayLoss, keptBlock, playerRule, setStatusStacks, tickEntity, tickPhase } from './statuses';
import { addToTimeline, dueEntrySteps, resolveEntry } from './timeline';
import { TUNING } from './tuning';
import type { Action, CardInstance, CardPlayedInfo, CombatKind, CombatState, Effect, EncounterId, EntityRef, EffectFrame, EventId, QueueItem, RepriseInfo, RunState, TurnStep } from './types';

const step = (s: TurnStep): QueueItem => ({ kind: 'step', step: s });

export const STATUS_ONSLAUGHT = 'onslaught';
export const STATUS_AUGURY = 'augury';

export interface CombatSetup {
  encounterId: EncounterId;
  kind: CombatKind;
  onWin?: Effect[];
  eventId?: EventId | null;
}

function combatCopy(c: CardInstance): CardInstance {
  const copy: CardInstance = { uid: c.uid, id: c.id, upgraded: c.upgraded };
  if (c.vars) copy.vars = { ...c.vars };
  return copy;
}

/** Per-turn engine counters (GDD §3), reset at player turn start step 3. */
const PER_TURN_COUNTERS = ['primedByEffect', 'bonusEnergy', 'toHand', 'effectDraw', 'advance', 'pruneAway', 'plays', 'bestCardDamage', 'curCardUid', 'curCardDmg', 'beatOffset', 'recurs', 'delayEligible'];

function effectiveStats(state: RunState): { maxEnergy: number; drawPerTurn: number; handLimit: number } {
  const cls = getClassDef(state.classId);
  return {
    maxEnergy: Math.max(0, playerRule(state, cls.maxEnergy, (m, c, a) => (m.maxEnergy ? m.maxEnergy(c, a) : a), false)),
    drawPerTurn: Math.max(0, playerRule(state, TUNING.drawPerTurn, (m, c, a) => (m.drawPerTurn ? m.drawPerTurn(c, a) : a), false)),
    handLimit: Math.max(1, playerRule(state, TUNING.handLimit, (m, c, a) => (m.handLimit ? m.handLimit(c, a) : a), false)),
  };
}

export function startCombat(env: Env, setup: CombatSetup): void {
  const s = env.state;
  const enc = getEncounterDef(setup.encounterId);
  const draw = shuffleInPlace(s.rng.shuffle, s.player.deck.map(combatCopy));
  const innate = draw.filter((c) => hasKeyword(cardDef(c), 'innate'));
  const combat: CombatState = {
    encounterId: setup.encounterId,
    kind: setup.kind,
    isElite: setup.kind === 'elite',
    isBoss: setup.kind === 'boss',
    eventId: setup.eventId ?? null,
    onWin: setup.onWin ?? [],
    turn: 0,
    turnPhase: 'player',
    outcome: null,
    energy: 0,
    maxEnergy: getClassDef(s.classId).maxEnergy,
    drawPerTurn: TUNING.drawPerTurn,
    handLimit: TUNING.handLimit,
    hand: [],
    // Opening (innate) cards go on top (end of the array) so the first draw takes them
    draw: [...draw.filter((c) => !innate.includes(c)), ...innate],
    discard: [],
    exhaust: [],
    inPlay: [],
    primed: [],
    timeline: [],
    player: { block: 0, guard: 0, statuses: {} },
    enemies: [],
    queue: [step({ op: 'combat_start' })],
    pendingChoice: null,
    cardsPlayedThisTurn: [],
    attacksPlayedThisTurn: 0,
    cardsPlayedThisCombat: 0,
    reducedThisTurn: [],
    resolvedThisTurn: [],
    lastPrune: null,
    damageTaken: 0,
    counters: {},
    nextEnemyUid: 1,
  };
  s.combat = combat;
  s.phase = 'combat';
  emit(env, { t: 'phase', phase: 'combat' });
  Object.assign(combat, effectiveStats(s));
  const uids: number[] = [];
  enc.enemies.forEach((slot) => {
    const spec = typeof slot === 'string' ? { id: slot } : slot;
    const leaderUid = spec.leader === undefined ? null : uids[spec.leader];
    if (leaderUid === undefined) throw new Error(`encounter ${enc.id}: slot leader ${String(spec.leader)} is not an earlier slot`);
    const e = spawnEnemy(env, combat, spec.id, { leaderUid, withLeader: spec.withLeader ?? null });
    uids.push(e.uid);
  });
  if (setup.kind === 'elite' && (s.player.counters.hunted_pending ?? 0) > 0) {
    s.player.counters.hunted_pending = (s.player.counters.hunted_pending ?? 0) - 1;
    for (const e of combat.enemies) applyStatus(env, e.uid, 'elite_hunted', 1);
  }
}

function resetDefence(env: Env, ref: EntityRef): void {
  const c = requireCombat(env.state, 'resetDefence');
  const e = ref === 'player' ? null : c.enemies.find((x) => x.uid === ref);
  if (ref !== 'player' && !e) throw new Error(`no enemy ${ref}`);
  const block = e ? e.block : c.player.block;
  let blockLost = 0;
  if (block > 0) {
    const keep = keptBlock(env.state, ref, block);
    if (keep !== block) {
      if (e) e.block = keep;
      else c.player.block = keep;
      blockLost = block - keep;
      emit(env, { t: 'block_lost', target: ref, amount: block - keep });
    }
  }
  const guard = e ? e.guard : c.player.guard;
  if (guard > 0) {
    const lost = guardDecayLoss(env.state, ref, guard);
    if (lost > 0) {
      if (e) e.guard = guard - lost;
      else c.player.guard = guard - lost;
      emit(env, { t: 'guard_decay', target: ref, lost, now: guard - lost });
      dispatch(env, 'onGuardDecay', ref, { lost });
    }
  }
  // Shared v2 H9 (Bulwark Rivets): after the Guard halving, so Guard gained from it is not halved.
  if (ref === 'player' && blockLost > 0) dispatch(env, 'onBlockReset', 'player', { lost: blockLost });
}

function applyCombatStartTraits(env: Env): void {
  const s = env.state;
  const cls = getClassDef(s.classId);
  for (const [id, n] of Object.entries(cls.combatStartStatuses ?? {})) applyStatus(env, 'player', id, n);
  const pc = s.player.counters;
  if ((pc.augury_combats ?? 0) > 0) {
    pc.augury_combats = (pc.augury_combats ?? 0) - 1;
    applyStatus(env, 'player', STATUS_AUGURY, 1);
  }
  if ((pc.augury_rest_of_act ?? 0) > 0) applyStatus(env, 'player', STATUS_AUGURY, 1);
  for (const [key, n] of Object.entries(pc)) {
    if (key.startsWith('combat_start_status:') && n !== 0) applyStatus(env, 'player', key.slice('combat_start_status:'.length), n);
  }
}

export function combatStep(env: Env, st: TurnStep): void {
  const s = env.state;
  const c = requireCombat(s, `combat step ${st.op}`);
  switch (st.op) {
    case 'combat_start': {
      applyCombatStartTraits(env);
      dispatch(env, 'onCombatStart', 'global', {});
      for (const e of livingEnemies(c)) runOnSpawn(env, e);
      enqueue(env, [step({ op: 'combat_intents' })]);
      return;
    }
    case 'combat_intents': {
      for (const e of livingEnemies(c)) chooseNextMove(env, e, 1);
      const first = playerRule(s, false, (m, ctx, a) => a || (m.enemiesActFirst ? m.enemiesActFirst(ctx) : false), false);
      enqueue(env, [step(first ? { op: 'enemy_phase' } : { op: 'player_turn_start' })]);
      return;
    }
    case 'player_turn_start': {
      // 1
      c.turn += 1;
      c.turnPhase = 'player';
      emit(env, { t: 'turn_start', turn: c.turn });
      if (c.turn > 1) resetDefence(env, 'player');
      // 2
      fizzlePrimed(env);
      // 3
      Object.assign(c, effectiveStats(s));
      const before = c.energy;
      c.energy = c.maxEnergy;
      if (c.energy !== before) emit(env, { t: 'energy', delta: c.energy - before, now: c.energy });
      // Next-turn bank (effects.ts bankNextTurn): banked energy lands on top of the refill, outside cap_bonus_energy.
      const bankedEnergy = c.counters.bankEnergy ?? 0;
      delete c.counters.bankEnergy;
      if (bankedEnergy > 0) {
        c.energy += bankedEnergy;
        emit(env, { t: 'energy', delta: bankedEnergy, now: c.energy });
      }
      for (const k of PER_TURN_COUNTERS) delete c.counters[k];
      c.cardsPlayedThisTurn = [];
      c.attacksPlayedThisTurn = 0;
      c.reducedThisTurn = [];
      c.resolvedThisTurn = [];
      for (const e of c.timeline) e.advancedThisTurn = false;
      // 4, 5, 6
      dispatch(env, 'onTurnStart', 'player', {});
      enqueue(env, [
        step({ op: 'tick', phase: 'start_player_turn' }),
        step({ op: 'decay', phase: 'start_player_turn' }),
        step({ op: 'timeline_resolve' }),
        step({ op: 'player_draw' }),
      ]);
      return;
    }
    case 'timeline_resolve':
      enqueue(env, dueEntrySteps(env));
      return;
    case 'timeline_entry':
      resolveEntry(env, st.seq, st.batch ?? 1);
      return;
    case 'player_draw': {
      let n = c.drawPerTurn;
      if (c.turn === 1) {
        const innateOnTop = c.draw.filter((card) => hasKeyword(cardDef(card), 'innate')).length;
        n = Math.max(n, innateOnTop);
      }
      // Next-turn bank: banked cards come with the turn-start draw (not effect draws, so not cap_draw).
      n += c.counters.bankDraw ?? 0;
      delete c.counters.bankDraw;
      drawCards(env, n, false);
      return;
    }
    case 'player_turn_end': {
      emit(env, { t: 'turn_end' });
      // Shared v2 (RULINGS 63): from here to the enemy phase, Salvage draw / energy go to the next-turn bank.
      c.counters.turnEnding = 1;
      dispatch(env, 'onTurnEnd', 'player', {});
      enqueue(env, [
        step({ op: 'tick', phase: 'end_player_turn' }),
        step({ op: 'own_tick', who: 'player' }),
        step({ op: 'prime' }),
        step({ op: 'hand_end_of_turn' }),
        step({ op: 'hand_end_relics' }),
        step({ op: 'discard_hand' }),
        step({ op: 'decay', phase: 'end_player_turn' }),
        step({ op: 'own_decay', who: 'player' }),
        step({ op: 'enemy_phase' }),
      ]);
      return;
    }
    case 'prime':
      primeStep(env);
      return;
    case 'tick':
      tickPhase(env, st.phase);
      return;
    case 'decay':
      decayPhase(env, st.phase);
      return;
    case 'own_tick':
      if (st.who !== 'player') {
        const e = c.enemies.find((x) => x.uid === st.who);
        if (!e?.alive) return;
        dispatch(env, 'onTurnEnd', st.who, {});
      }
      tickEntity(env, st.who, 'end_own_turn');
      return;
    case 'own_decay':
      decayEntity(env, st.who, 'end_own_turn');
      return;
    case 'hand_end_of_turn':
      for (const card of [...c.hand]) runCardHook(env, card, 'onTurnEndInHand');
      return;
    case 'hand_end_relics':
      // Shared v2 H6 (Triage Locker, Gravity Loom).
      dispatch(env, 'onHandEndOfTurn', 'player', {});
      return;
    case 'reprise_card':
      repriseCard(env, st);
      return;
    case 'repeat_resolution':
      runRepeatResolution(env, st);
      return;
    case 'discard_hand': {
      const ethereal: number[] = [];
      const discard: CardInstance[] = [];
      const retained: CardInstance[] = [];
      for (const card of c.hand) {
        const def = cardDef(card);
        // Shared v2 Triage: chosen cards are kept this turn (flag set by the triage effect, cleared here).
        const triaged = c.counters[triageKeepKey(card.uid)] === 1;
        if (triaged) delete c.counters[triageKeepKey(card.uid)];
        if (hasKeyword(def, 'retain') || triaged) retained.push(card);
        else if (hasKeyword(def, 'ethereal')) ethereal.push(card.uid);
        else discard.push(card);
      }
      exhaustCards(env, 'hand', ethereal);
      for (const card of discard) c.discard.push(takeFrom(c.hand, card.uid, 'hand'));
      if (discard.length) emit(env, { t: 'discard', uids: discard.map((x) => x.uid) });
      for (const card of retained) runCardHook(env, card, 'onRetain');
      for (const pile of [c.hand, c.draw, c.discard, c.exhaust]) for (const card of pile) delete card.tempCost;
      return;
    }
    case 'enemy_phase': {
      c.turnPhase = 'enemy';
      delete c.counters.turnEnding;
      emit(env, { t: 'enemy_turn_start' });
      const items: QueueItem[] = [];
      for (const e of livingEnemies(c)) {
        items.push(
          step({ op: 'enemy_turn_start', uid: e.uid }),
          step({ op: 'enemy_move', uid: e.uid }),
          step({ op: 'own_tick', who: e.uid }),
          step({ op: 'own_decay', who: e.uid }),
          step({ op: 'enemy_choose', uid: e.uid }),
        );
      }
      items.push(step({ op: 'tick', phase: 'end_enemy_turn' }), step({ op: 'decay', phase: 'end_enemy_turn' }), step({ op: 'round_end' }));
      enqueue(env, items);
      return;
    }
    case 'enemy_turn_start': {
      const e = enemyByUid(c, st.uid);
      if (!e.alive) return;
      if (e.intent.moveId === FLEE_MOVE) {
        e.alive = false;
        e.fled = true;
        emit(env, { t: 'enemy_fled', uid: e.uid });
        return;
      }
      resetDefence(env, e.uid);
      dispatch(env, 'onTurnStart', e.uid, {});
      return;
    }
    case 'enemy_move': {
      const e = enemyByUid(c, st.uid);
      if (!e.alive) return;
      if (stacksOf(s, e.uid, STATUS_HALTED) > 0) {
        emit(env, { t: 'text', text: `${getEnemyDef(e.id).name} is halted.` });
        setStatusStacks(env, e.uid, STATUS_HALTED, 0);
        dispatch(env, 'onMoveSkipped', 'player', { uid: e.uid });
        return;
      }
      const def = getEnemyDef(e.id);
      const move = def.moves[e.intent.moveId];
      if (!move) throw new Error(`enemy ${e.id} has no move '${e.intent.moveId}'`);
      emit(env, { t: 'enemy_move', uid: e.uid, moveId: e.intent.moveId, name: move.name });
      e.moveHistory.push(e.intent.moveId);
      c.counters.riposteThisMove = 0;
      c.counters.moveDamageStart = c.damageTaken;
      delete c.counters.cancelMove;
      if (isAttackIntent(e.intent)) {
        c.counters.declaringUid = e.uid;
        dispatch(env, 'onEnemyAttackDeclared', 'global', { uid: e.uid, intent: { ...e.intent } }, e.uid);
        enqueue(env, [step({ op: 'enemy_riposte', uid: e.uid })]);
      }
      enqueue(env, [step({ op: 'enemy_move_effects', uid: e.uid }), step({ op: 'enemy_move_end', uid: e.uid })]);
      return;
    }
    case 'enemy_riposte': {
      const e = enemyByUid(c, st.uid);
      if (!e.alive || c.counters.cancelMove === e.uid) return;
      fireRiposte(env, e.uid, e.intent.hits ?? 1);
      return;
    }
    case 'enemy_move_effects': {
      const e = enemyByUid(c, st.uid);
      const cancelled = c.counters.cancelMove === e.uid;
      delete c.counters.cancelMove;
      delete c.counters.declaringUid;
      if (!e.alive) return; // its attack_cancelled was emitted when it died mid-declaration
      if (cancelled) {
        emit(env, { t: 'attack_cancelled', uid: e.uid });
        dispatch(env, 'onAttackCancelled', 'player', { uid: e.uid });
        return;
      }
      const moveId = e.moveHistory[e.moveHistory.length - 1];
      if (moveId === undefined) throw new Error('enemy_move_effects without a move');
      const move = getEnemyDef(e.id).moves[moveId];
      if (!move) throw new Error(`enemy ${e.id} has no move '${moveId}'`);
      enqueue(env, effectItems(move.effects, { src: { kind: 'enemy', uid: e.uid, id: e.id, moveId }, self: e.uid, target: 'player', x: 0 }));
      return;
    }
    case 'enemy_move_end': {
      const e = enemyByUid(c, st.uid);
      if (!e.alive) return;
      const moveId = e.moveHistory[e.moveHistory.length - 1] ?? '';
      dispatch(env, 'onEnemyMoveEnd', 'global', {
        uid: e.uid,
        moveId,
        wasAttack: isAttackIntent(e.intent),
        hpLostThisMove: c.damageTaken - (c.counters.moveDamageStart ?? c.damageTaken),
      }, e.uid);
      return;
    }
    case 'enemy_choose': {
      const e = enemyByUid(c, st.uid);
      if (!e.alive) return;
      chooseNextMove(env, e, c.turn + 1);
      return;
    }
    case 'round_end':
      enqueue(env, [step({ op: 'player_turn_start' })]);
      return;
    case 'combat_end_hooks':
      emit(env, { t: 'combat_won' });
      dispatch(env, 'onCombatEnd', 'global', { won: true, kind: c.kind, turn: c.turn });
      return;
    case 'combat_finalize':
      finishCombatWin(env);
      return;
    case 'start_boon_done':
    case 'event_option_done':
    case 'enter_room':
    case 'next_act':
    case 'transmute_offer':
      throw new Error(`run step ${st.op} routed to combat`);
  }
}

function enemyByUid(combat: CombatState, uid: number) {
  const e = combat.enemies.find((x) => x.uid === uid);
  if (!e) throw new Error(`no enemy uid ${uid}`);
  return e;
}

// ---------------------------------------------------------------------------
// Playing cards

function beatPositions(state: RunState): number[] {
  return playerRule(state, [...TUNING.cadence.beats], (m, ctx, a) => (m.beatPositions ? m.beatPositions(ctx, a) : a));
}

/** Beat position the next counted play would land on, whether it is on the beat, and the beat positions after modifiers. */
export function nextBeat(state: RunState): { count: number; onBeat: boolean; positions: number[] } {
  const c = requireCombat(state, 'nextBeat');
  const count = c.cardsPlayedThisTurn.length + 1 + (c.counters.beatOffset ?? 0);
  const positions = beatPositions(state);
  return { count, onBeat: positions.includes(count), positions };
}

/** Player plays a card from hand. */
export function playCard(env: Env, uid: number, target: number | null): void {
  const s = env.state;
  const c = requireCombat(s, 'playCard');
  const card = c.hand.find((x) => x.uid === uid);
  if (!card) throw new Error(`card ${uid} not in hand`);
  const ok = canPlayCard(s, card);
  if (ok !== true) throw new Error(`cannot play ${card.id}: ${ok}`);
  const cost = getCardCost(s, card);
  if (cost === null) throw new Error(`card ${card.id} is unplayable`);
  takeFrom(c.hand, uid, 'hand');
  resolvePlay(env, card, target, cost, 0, false);
}

/**
 * The play itself (also used by autoplay). Pays cost (free plays pay 0), appends to
 * cardsPlayedThisTurn at pay-cost time when depth <= TUNING.caps.playDepth, stamps on-beat, fires
 * onCardPlayed, queues the effects and the finish item.
 */
function resolvePlay(env: Env, card: CardInstance, target: number | null, cost: number | 'X', depth: number, free: boolean): void {
  const s = env.state;
  const c = requireCombat(s, 'resolvePlay');
  const def = cardDef(card);
  // Shared v2 H3: an X-cost card adds your Reserve to X and empties it.
  const reserve = cost === 'X' && !free ? stacksOf(s, 'player', STATUS_RESERVE) : 0;
  if (reserve > 0) setStatusStacks(env, 'player', STATUS_RESERVE, 0);
  const x = cost === 'X' && !free ? c.energy + reserve : 0;
  const spend = free ? 0 : cost === 'X' ? c.energy : cost;
  if (spend > 0) {
    c.energy -= spend;
    emit(env, { t: 'energy', delta: -spend, now: c.energy });
  }
  if (!free && typeof def.cost === 'number' && typeof cost === 'number' && cost < def.cost) c.reducedThisTurn.push(card.uid);
  c.counters.plays = (c.counters.plays ?? 0) + 1;
  let onBeat = false;
  let beatIndex = 0;
  if (depth <= TUNING.caps.playDepth) {
    const beat = nextBeat(s);
    c.cardsPlayedThisTurn.push(card.id);
    onBeat = beat.onBeat;
    // Chronist v2 Crescendo: which beat this is (1st, 2nd, ...), scale 'beat_index'.
    if (onBeat) beatIndex = beat.positions.indexOf(beat.count) + 1;
  }
  c.inPlay.push(card);
  emit(env, target === null ? { t: 'card_played', uid: card.uid, cardId: card.id, onBeat } : { t: 'card_played', uid: card.uid, cardId: card.id, target, onBeat });
  c.cardsPlayedThisCombat += 1;
  c.counters.curCardUid = card.uid;
  c.counters.curCardDmg = 0;
  const info = { card, def, target, onBeat, depth, x };
  dispatch(env, 'onCardPlayed', 'global', info, target, onBeat);
  // Shared v2 H7 (Cracked Hourglass): the play's effects may go onto the Timeline instead.
  const delayTurns = playDelayTurns(env, info, free);
  if (delayTurns > 0) {
    enqueue(env, [{ kind: 'finish_card', uid: card.uid, target, via: 'play', onBeat, depth, x, beatIndex, delayPlay: delayTurns }]);
    return;
  }
  const frame = { src: { kind: 'card' as const, uid: card.uid, id: card.id, upgraded: card.upgraded }, self: 'player' as const, target, x, onBeat, depth, beatIndex };
  // A hand play already passed canPlayCard (Shards included). A free play (autoplay) is a non-play
  // resolution: RULINGS 73, it pays its Shard cost when it starts or is skipped.
  if (free) enqueue(env, [step({ op: 'repeat_resolution', uid: card.uid, list: 'effects', frame, why: 'the autoplay' })]);
  else enqueue(env, effectItems(def.effects, frame));
  // Shared v2 H4 Reprise: the effects resolve a second time (never more: RULINGS 65).
  if (hasReprise(env, { ...info, costPaid: spend, handEmpty: c.hand.length === 0 })) {
    enqueue(env, [step({ op: 'reprise_card', uid: card.uid, target, x, onBeat, depth, beatIndex })]);
  }
  enqueue(env, [{ kind: 'finish_card', uid: card.uid, target, via: 'play', onBeat, depth, x, beatIndex }]);
}

export const STATUS_RESERVE = 'reserve';
export const STATUS_REPRISE = 'reprise';

/** counters key: Triage chose this hand card to keep this turn. */
export function triageKeepKey(uid: number): string {
  return `triage:keep:${uid}`;
}

/** H4: a relic grants Reprise, or a Reprise status stack is used (only when no relic granted it). */
function hasReprise(env: Env, info: RepriseInfo): boolean {
  const s = env.state;
  if (TUNING.caps.reprise < 2) return false;
  const byRule = playerRule(s, false, (m, ctx, a) => a || (m.grantsReprise ? m.grantsReprise(ctx, info) : false), false);
  if (byRule) return true;
  const stacks = stacksOf(s, 'player', STATUS_REPRISE);
  if (stacks <= 0) return false;
  setStatusStacks(env, 'player', STATUS_REPRISE, stacks - 1);
  return true;
}

/** H7: Delay for a play's effects (0 = now). Only non-Power, non-Delay cards played from hand. */
function playDelayTurns(env: Env, info: CardPlayedInfo, free: boolean): number {
  const s = env.state;
  const c = requireCombat(s, 'delayPlay');
  if (free || info.depth !== 0 || info.def.type === 'power' || info.def.delay) return 0;
  const index = c.counters.delayEligible ?? 0; // no eligible play yet this turn = 0
  c.counters.delayEligible = index + 1;
  const turns = playerRule(s, 0, (m, ctx, a) => Math.max(a, m.delayPlay ? m.delayPlay(ctx, info, index) : 0), false);
  if (turns <= 0) return 0;
  if (c.timeline.length >= TUNING.caps.timeline) {
    capHit(env, 'cap_timeline');
    return 0;
  }
  return Math.min(turns, TUNING.caps.delayMax);
}

/** H4: the second resolution of a played card (same frame; a dead target becomes the leftmost living enemy). */
function repriseCard(env: Env, st: Extract<TurnStep, { op: 'reprise_card' }>): void {
  const s = env.state;
  const c = requireCombat(s, 'reprise');
  if (c.outcome !== null) return;
  const card = findCombatCard(c, st.uid);
  if (!card) throw new Error(`reprise: card ${st.uid} is nowhere in combat`);
  let target = st.target;
  if (typeof target === 'number' && !c.enemies.some((e) => e.uid === target && e.alive)) {
    const left = livingEnemies(c)[0];
    if (!left) return;
    target = left.uid;
  }
  emit(env, { t: 'reprise', cardUid: card.uid });
  emit(env, { t: 'text', text: `${cardDef(card).name}: Reprise.` });
  // RULINGS 66: the second resolution pays the Shard cost again, or is skipped.
  runRepeatResolution(env, { uid: card.uid, list: 'effects', why: 'Reprise', frame: { src: { kind: 'card', uid: card.uid, id: card.id, upgraded: card.upgraded }, self: 'player', target, x: st.x, onBeat: st.onBeat, depth: st.depth, beatIndex: st.beatIndex } });
}

/** autoplay effect: play the top card of the draw pile / a random hand card for free at depth + 1. */
export function autoplayCard(env: Env, from: 'draw' | 'hand', frame: EffectFrame): void {
  const s = env.state;
  const c = requireCombat(s, 'autoplay');
  let card: CardInstance | undefined;
  if (from === 'draw') {
    if (c.draw.length === 0 && c.discard.length > 0) drawShuffle(env);
    card = c.draw.pop();
  } else if (c.hand.length > 0) {
    card = pickFrom(s.rng.misc, c.hand);
    takeFrom(c.hand, card.uid, 'hand');
  }
  if (!card) return;
  const def = cardDef(card);
  if (def.cost === null || hasKeyword(def, 'unplayable')) {
    c.discard.push(card);
    emit(env, { t: 'discard', uids: [card.uid] });
    return;
  }
  let target: number | null = null;
  if (def.target === 'enemy') {
    const t = frame.target;
    const alive = livingEnemies(c);
    if (alive.length === 0) {
      c.discard.push(card);
      return;
    }
    target = typeof t === 'number' && alive.some((e) => e.uid === t) ? t : pickFrom(s.rng.misc, alive).uid;
  }
  resolvePlay(env, card, target, 0, (frame.depth ?? 0) + 1, true);
}

function drawShuffle(env: Env): void {
  const c = requireCombat(env.state, 'shuffle');
  const moved = c.discard.splice(0);
  shuffleInPlace(env.state.rng.shuffle, moved);
  c.draw.unshift(...moved);
  emit(env, { t: 'shuffle' });
  dispatch(env, 'onShuffle', 'player', {});
}

/** finish_card: move the resolving card on, then the post-play rules. */
export function finishCardItem(env: Env, item: Extract<QueueItem, { kind: 'finish_card' }>): void {
  const s = env.state;
  const c = requireCombat(s, 'finishCard');
  // A card may have moved itself out of play during resolution (e.g. `exhaust {self}`): it is then
  // already where it belongs; skip the pile move but still run the post-play rules.
  const inPlay = c.inPlay.some((x) => x.uid === item.uid);
  const card = inPlay ? c.inPlay.find((x) => x.uid === item.uid) : findCombatCard(c, item.uid);
  if (!card) throw new Error(`finishCard: card ${item.uid} is neither in play nor anywhere in combat`);
  const def = cardDef(card);
  const toPile = (): void => {
    if (!inPlay) return;
    if (hasKeyword(def, 'exhaust')) exhaustCards(env, 'inPlay', [card.uid]);
    else {
      c.discard.push(takeFrom(c.inPlay, card.uid, 'in play'));
      emit(env, { t: 'discard', uids: [card.uid] });
    }
  };
  if (item.via === 'riposte') {
    toPile();
    return;
  }
  if (item.via === 'timeline') {
    // Chronist v2 H8 (Eternal Return): a non-Scrap card may go back on the Timeline instead of its pile.
    // Exempt from cap_relay (that rule only gates playing a resolved card again).
    const recurs = c.counters.recurs ?? 0;
    const again =
      inPlay && c.outcome === null && !hasKeyword(def, 'exhaust')
        ? playerRule<number | null>(s, null, (m, ctx, a) => (a === null && m.recurDelay ? m.recurDelay(ctx, card, recurs) : a), false)
        : null;
    // Shared v2 H22 (Perpetual Calendar): a card that would be discarded goes to the bottom of the draw pile.
    const dest = inPlay && again === null && c.outcome === null && !hasKeyword(def, 'exhaust')
      ? playerRule<'draw_bottom' | null>(s, null, (m, ctx, a) => (a === null && m.timelineDestination ? m.timelineDestination(ctx, card) : a), false)
      : null;
    if (again !== null && c.timeline.length < TUNING.caps.timeline) {
      takeFrom(c.inPlay, card.uid, 'in play');
      c.counters.recurs = recurs + 1;
      const opts = { turns: again, scheduled: item.scheduled === true, ...(item.beatIndex !== undefined ? { beatIndex: item.beatIndex } : {}) };
      if (!addToTimeline(env, card, item.target, item.x, item.onBeat, opts)) throw new Error('recur: Timeline full after the cap check');
    } else if (dest === 'draw_bottom') {
      c.draw.unshift(takeFrom(c.inPlay, card.uid, 'in play'));
      emit(env, { t: 'text', text: `${def.name} goes to the bottom of your draw pile.` });
    } else toPile();
    if (c.counters.curCardUid === card.uid) delete c.counters.curCardUid;
    // Total Eclipse (H7): a card that resolved twice fires onDelayResolved twice.
    const runs = item.runs ?? 1;
    for (let r = 0; r < runs; r++) dispatch(env, 'onDelayResolved', 'player', { card, batch: item.batch ?? 1 });
    return;
  }
  // via 'play'
  if (!inPlay) {
    // moved itself: nothing to place
  } else if (item.delayPlay !== undefined) {
    // Shared v2 H7: its effects wait on the Timeline (a scheduled entry). The play itself counted.
    takeFrom(c.inPlay, card.uid, 'in play');
    const opts = { turns: item.delayPlay, scheduled: true, ...(item.beatIndex !== undefined ? { beatIndex: item.beatIndex } : {}) };
    if (!addToTimeline(env, card, item.target, item.x, item.onBeat, opts)) {
      c.discard.push(card);
      emit(env, { t: 'discard', uids: [card.uid] });
    }
  } else if (def.type === 'power') takeFrom(c.inPlay, card.uid, 'in play');
  else if (def.delay) {
    takeFrom(c.inPlay, card.uid, 'in play');
    if (!addToTimeline(env, card, item.target, item.x, item.onBeat, item.beatIndex !== undefined ? { beatIndex: item.beatIndex } : {})) {
      c.discard.push(card);
      emit(env, { t: 'discard', uids: [card.uid] });
    }
  } else toPile();
  if (c.counters.curCardUid === card.uid) delete c.counters.curCardUid;
  if (def.type === 'attack') {
    c.attacksPlayedThisTurn += 1;
    if (c.outcome === null && getClassDef(env.state.classId).onslaughtFromAttacks === true) applyStatus(env, 'player', STATUS_ONSLAUGHT, TUNING.onslaught.perAttack);
  }
  dispatch(env, 'afterCardPlayed', 'global', { card, def, target: item.target, onBeat: item.onBeat, depth: item.depth, x: item.x }, item.target, item.onBeat);
}

export function endTurn(env: Env): void {
  enqueue(env, [step({ op: 'player_turn_end' })]);
}

// ---------------------------------------------------------------------------
// Legal actions (combat part; potions are added by game.ts)

export function combatLegalActions(state: RunState): Action[] {
  const c = requireCombat(state, 'combatLegalActions');
  if (c.pendingChoice) return choiceActions(c.pendingChoice);
  if (c.outcome !== null) return [];
  if (c.queue.length > 0) throw new Error('combat queue not drained between actions');
  if (c.turnPhase !== 'player') throw new Error('combat settled outside the player turn');
  const out: Action[] = [];
  for (const card of c.hand) {
    if (canPlayCard(state, card) !== true) continue;
    if (cardDef(card).target === 'enemy') {
      for (const e of livingEnemies(c)) out.push({ type: 'play_card', uid: card.uid, target: e.uid });
    } else out.push({ type: 'play_card', uid: card.uid });
  }
  out.push({ type: 'end_turn' });
  return out;
}

// re-exports kept for v1 callers
export { computeIntent, aiCtx, refreshIntents, summon as summonEnemy, nextEnemyRound } from './enemies';
