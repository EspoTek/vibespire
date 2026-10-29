// runOne: play one full run with a policy and summarise it from the run history.

import { Game, hashString, nextU32 } from '../src/engine';
import { TelemetryCollector } from './telemetry';
import type { CombatRecord, Policy, RunResult } from './types';

export interface RunOptions {
  /** Throw if the run has not ended after this many actions (a stuck run is an engine/policy bug). */
  maxActions?: number;
  /** Copy state per action (slower; default false in the simulator). */
  atomic?: boolean;
  /** Throw unless the policy returns one of the exact Action objects in legalActions() (policy tests). */
  strict?: boolean;
  /**
   * End the run as a loss (endCause 'stalemate') when one combat lasts more than this many player turns.
   * A stalemate is a policy or content bug; the report counts them separately. Default 100.
   */
  maxCombatTurns?: number;
}

export function runOne(seed: string, classId: string, policy: Policy, opts: RunOptions = {}): RunResult {
  const t0 = performance.now();
  const maxActions = opts.maxActions ?? 50_000;
  const maxTurns = opts.maxCombatTurns ?? 100;
  const game = Game.newRun(seed, classId, { atomic: opts.atomic ?? false });
  const prng = hashString(`policy:${policy.name}:${seed}`);
  let actions = 0;
  const tele = new TelemetryCollector();
  let stalemate: string | null = null;
  while (game.state.phase !== 'victory' && game.state.phase !== 'defeat') {
    const legal = game.legalActions();
    if (legal.length === 0) throw new Error(`run ${seed}: no legal actions in phase ${game.state.phase}`);
    const action = policy.choose(game, legal, nextU32(prng));
    if (opts.strict && !legal.includes(action)) throw new Error(`run ${seed}: policy ${policy.name} returned an action not in legalActions: ${JSON.stringify(action)}`);
    const before = { phase: game.state.phase, act: game.state.act, bossRelicChoices: game.state.bossRelicChoices ? [...game.state.bossRelicChoices] : null };
    const events = game.apply(action);
    tele.observe(before, action, events, game.state);
    actions += 1;
    if (game.state.combat && game.state.combat.turn > maxTurns) {
      stalemate = game.state.combat.encounterId;
      break;
    }
    if (actions > maxActions) throw new Error(`run ${seed}: exceeded ${maxActions} actions (stuck in phase ${game.state.phase})`);
  }
  const s = game.state;
  const floors = s.history.floors;
  const last = floors[floors.length - 1];
  if (!last) throw new Error(`run ${seed}: empty history`);
  const combats = floors.filter((f) => f.encounterId !== null);
  const deckSizeByAct: number[] = [];
  const shardsEarnedByAct = [0, 0, 0];
  const shardsSpentByAct = [0, 0, 0];
  const capHits: Record<string, number> = {};
  const upgradesByAct = [0, 0, 0];
  const goldEarnedByAct = [0, 0, 0];
  const goldSpentByAct = [0, 0, 0];
  for (const f of floors) {
    upgradesByAct[f.act - 1] = (upgradesByAct[f.act - 1] ?? 0) + f.cardsUpgraded.length;
    const dg = f.goldAfter - f.goldBefore;
    if (dg > 0) goldEarnedByAct[f.act - 1] = (goldEarnedByAct[f.act - 1] ?? 0) + dg;
    else goldSpentByAct[f.act - 1] = (goldSpentByAct[f.act - 1] ?? 0) - dg;
    deckSizeByAct[f.act - 1] = f.deckSize;
    shardsEarnedByAct[f.act - 1] = (shardsEarnedByAct[f.act - 1] ?? 0) + f.shardsGained;
    shardsSpentByAct[f.act - 1] = (shardsSpentByAct[f.act - 1] ?? 0) + f.shardsSpent;
    for (const [k, v] of Object.entries(f.capHits)) capHits[k] = (capHits[k] ?? 0) + v;
  }
  // finish() closes an unfinished combat (stalemate), so per-combat telemetry exists for every combat.
  const telemetry = tele.finish(s);
  const result: RunResult = {
    seed,
    classId,
    policy: policy.name,
    won: s.phase === 'victory',
    endCause: s.phase === 'victory' ? 'victory' : stalemate !== null ? 'stalemate' : 'defeat',
    floorReached: s.floor,
    act: s.act,
    hpByFloor: floors.map((f) => f.hpAfter),
    deckEnd: s.player.deck.map((c) => c.id),
    relics: s.player.relics.map((r) => r.id),
    cardsOffered: floors.flatMap((f) => f.cardsOffered),
    cardsPicked: floors.flatMap((f) => (f.cardPicked === null ? [] : [f.cardPicked])),
    cardsSkipped: floors.flatMap((f) => (f.cardSkipped ? f.cardsOffered : [])),
    turnsPerCombat: combats.map((f) => f.turns),
    damageTakenPerCombat: combats.map((f) => f.damageTaken),
    deckSizeByAct: Array.from(deckSizeByAct, (v) => v ?? 0),
    shardsEarnedByAct,
    shardsSpentByAct,
    capHits,
    turns: combats.reduce((a, f) => a + f.turns, 0) + (s.combat ? s.combat.turn : 0),
    actions,
    elapsedMs: performance.now() - t0,
    combats: combats.map((f, i): CombatRecord => {
      if (f.encounterId === null) throw new Error('combat floor without encounter');
      const lost = (s.phase === 'defeat' || stalemate !== null) && i === combats.length - 1 && f === last;
      const prunes = tele.prunesPerCombat[i];
      if (prunes === undefined) throw new Error(`run ${seed}: no prune count for combat ${i}`);
      const turns = tele.turnsPerCombat[i];
      const hpLost = tele.hpLostPerCombat[i];
      if (turns === undefined || hpLost === undefined) throw new Error(`run ${seed}: no event telemetry for combat ${i}`);
      return { encounterId: f.encounterId, room: f.room, act: f.act, floor: f.floor, turns, damageTaken: hpLost, hpBefore: f.hpBefore, maxHp: f.maxHp, won: !lost, prunes };
    }),
    screens: floors.filter((f) => f.cardsOffered.length > 0).map((f) => ({ floor: f.floor, act: f.act, offered: f.cardsOffered, picked: f.cardPicked })),
    cardsBought: floors.flatMap((f) => (f.room === 'shop' ? f.cardsAdded.map((card) => ({ floor: f.floor, card })) : [])),
    relicsGained: floors.flatMap((f) => f.relicsGained.map((relic) => ({ floor: f.floor, relic }))),
    bossRelicScreens: tele.bossRelicScreens,
    pact: floors[0]?.boonId ?? null,
    events: floors.flatMap((f) => (f.eventId === null ? [] : [{ floor: f.floor, event: f.eventId, choice: f.eventChoice }])),
    removals: floors.flatMap((f) => f.cardsRemoved.map((card) => ({ floor: f.floor, act: f.act, room: f.room, card }))),
    upgradesByAct,
    goldEarnedByAct,
    goldSpentByAct,
    telemetry,
  };
  if (stalemate !== null) result.deathEncounter = stalemate;
  else if (s.phase === 'defeat' && s.combat && last.encounterId !== null) result.deathEncounter = last.encounterId;
  return result;
}
