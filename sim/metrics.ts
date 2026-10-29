// GDD §8.6 balance metrics per class, computed from RunResults (aggregate.ts embeds them as
// `metrics[classId]`; report.ts renders them).

import type { RunResult, Telemetry } from './types';

const mean = (xs: readonly number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const r3 = (x: number): number => Math.round(x * 1000) / 1000;
const winRate = (rs: readonly RunResult[]): number => (rs.length ? rs.filter((r) => r.won).length / rs.length : 0);

/** Floor buckets for "win-rate delta bucketed by floor picked" (one per act). */
export const FLOOR_BUCKETS = [
  { id: 'a1', from: 0, to: 16 },
  { id: 'a2', from: 17, to: 33 },
  { id: 'a3', from: 34, to: 99 },
] as const;

function bucketOf(floor: number): string {
  const b = FLOOR_BUCKETS.find((x) => floor >= x.from && floor <= x.to);
  if (!b) throw new Error(`floor ${floor} in no bucket`);
  return b.id;
}

export interface CardMetrics {
  offered: number;
  picked: number;
  /** Times it was on a screen the player skipped. */
  skippedScreens: number;
  pickRate: number;
  bought: number;
  /** Win rate of runs that picked it (in each act bucket) minus the class win rate. */
  winDeltaByBucket: Record<string, { picks: number; delta: number }>;
  /** Win rate of runs whose final deck holds it minus runs whose deck does not. */
  deckWinDelta: number;
  /** Mean damage taken per combat in runs whose final deck holds it. */
  dmgPerCombatWith: number;
}

export interface EncounterMetrics {
  act: number;
  room: string;
  fights: number;
  deaths: number;
  avgTurns: number;
  avgDamage: number;
  /** Mean HP lost as a share of max HP. */
  avgDamagePct: number;
}

export interface BalanceMetrics {
  runs: number;
  wins: number;
  winRate: number;
  /** Milestones (GDD §8.4): reached / beat the act 1 boss, beat the act 2 boss, won. */
  milestones: { reachA1Boss: number; beatA1Boss: number; reachA2Boss: number; beatA2Boss: number; reachA3Boss: number; win: number };
  deathShareByAct: number[];
  /** Runs ended by the stalemate guard (counted as losses), total and by encounter. */
  stalemates: number;
  stalematesByEncounter: Record<string, number>;
  deathsByEncounter: Record<string, { act: number; deaths: number }>;
  floorOfDeath: Record<string, number>;
  avgActions: number;
  avgWinActions: number;
  bossEntryHp: { act: number; n: number; avgHp: number; avgHpPct: number }[];
  screens: number;
  skipRate: number;
  cards: Record<string, CardMetrics>;
  relics: Record<string, { runs: number; winDelta: number }>;
  bossRelics: Record<string, { offered: number; picked: number }>;
  bossRelicSkipRate: number;
  pacts: Record<string, { picked: number; winDelta: number }>;
  events: Record<string, { seen: number; choices: Record<string, number> }>;
  shardsEarnedByAct: number[];
  shardsSpentByAct: number[];
  deckSizeByAct: number[];
  goldEarnedByAct: number[];
  goldSpentByAct: number[];
  removalsByAct: { act: number; shop: number; rest: number; event: number; other: number }[];
  upgradesByAct: number[];
  encounters: Record<string, EncounterMetrics>;
  telemetry: Telemetry & { runs: number };
  derived: {
    onslaughtAtAttackMean: number;
    riposteTriggersPerPrime: number;
    primeFizzleRate: number;
    guardShareOfPrevented: number;
    rotShareOfDamage: number;
    beatsPerTurn: number;
    timelinePerCombat: number;
    prunesPerCombat: number;
    exposedBonusPerCombat: number;
    staggerPreventedPerCombat: number;
    bloomMaxAtEnd: number;
    bloomTotalAtEnd: number;
    bloomCardsAtEnd: number;
  };
  capHits: Record<string, number>;
  capHitsPerTurn: number;
}

function sumTelemetry(rs: readonly RunResult[]): Telemetry & { runs: number } {
  const out: Telemetry & { runs: number } = {
    runs: rs.length,
    onslaughtAtAttack: {},
    primed: 0,
    riposteTriggers: 0,
    primeFizzles: 0,
    attackCancels: 0,
    blockAbsorbed: 0,
    guardAbsorbed: 0,
    hitHpLost: 0,
    hitDamage: 0,
    rotDamage: 0,
    otherHpLoss: 0,
    exposedBonus: 0,
    staggerPrevented: 0,
    playerTurns: 0,
    onBeatPlays: 0,
    cardsPlayed: 0,
    timelineAdded: 0,
    timelineResolved: 0,
    bloomGained: 0,
    bloomMax: 0,
    bloomTotal: 0,
    bloomCards: 0,
    potionsUsed: 0,
  };
  for (const r of rs) {
    const t = r.telemetry;
    for (const [k, v] of Object.entries(t.onslaughtAtAttack)) out.onslaughtAtAttack[k] = (out.onslaughtAtAttack[k] ?? 0) + v;
    out.primed += t.primed;
    out.riposteTriggers += t.riposteTriggers;
    out.primeFizzles += t.primeFizzles;
    out.attackCancels += t.attackCancels;
    out.blockAbsorbed += t.blockAbsorbed;
    out.guardAbsorbed += t.guardAbsorbed;
    out.hitHpLost += t.hitHpLost;
    out.hitDamage += t.hitDamage;
    out.rotDamage += t.rotDamage;
    out.otherHpLoss += t.otherHpLoss;
    out.exposedBonus += t.exposedBonus;
    out.staggerPrevented += t.staggerPrevented;
    out.playerTurns += t.playerTurns;
    out.onBeatPlays += t.onBeatPlays;
    out.cardsPlayed += t.cardsPlayed;
    out.timelineAdded += t.timelineAdded;
    out.timelineResolved += t.timelineResolved;
    out.bloomGained += t.bloomGained;
    out.bloomMax += t.bloomMax;
    out.bloomTotal += t.bloomTotal;
    out.bloomCards += t.bloomCards;
    out.potionsUsed += t.potionsUsed;
  }
  return out;
}

function reachedBoss(r: RunResult, act: number): boolean {
  return r.combats.some((c) => c.act === act && c.room === 'boss');
}

function beatBoss(r: RunResult, act: number): boolean {
  return r.combats.some((c) => c.act === act && c.room === 'boss' && c.won);
}

/** Metrics for one class's runs. */
export function balanceMetrics(rs: readonly RunResult[]): BalanceMetrics {
  if (rs.length === 0) throw new Error('balanceMetrics: no runs');
  const n = rs.length;
  const base = winRate(rs);
  const losses = rs.filter((r) => !r.won);
  const deathsByEncounter: BalanceMetrics['deathsByEncounter'] = {};
  const floorOfDeath: Record<string, number> = {};
  const deathByAct = [0, 0, 0];
  for (const r of losses) {
    floorOfDeath[String(r.floorReached)] = (floorOfDeath[String(r.floorReached)] ?? 0) + 1;
    deathByAct[r.act - 1] = (deathByAct[r.act - 1] ?? 0) + 1;
    const enc = r.deathEncounter ?? '(no combat)';
    const d = (deathsByEncounter[enc] ??= { act: r.act, deaths: 0 });
    d.deaths += 1;
  }
  const stalematesByEncounter: Record<string, number> = {};
  for (const r of rs) if (r.endCause === 'stalemate') stalematesByEncounter[r.deathEncounter ?? '?'] = (stalematesByEncounter[r.deathEncounter ?? '?'] ?? 0) + 1;
  const bossEntryHp = [1, 2, 3].map((act) => {
    const entries = rs.flatMap((r) => r.combats.filter((c) => c.act === act && c.room === 'boss'));
    return { act, n: entries.length, avgHp: r3(mean(entries.map((c) => c.hpBefore))), avgHpPct: r3(mean(entries.map((c) => c.hpBefore / c.maxHp))) };
  });
  // Cards
  const cards: Record<string, CardMetrics> = {};
  const card = (id: string): CardMetrics =>
    (cards[id] ??= { offered: 0, picked: 0, skippedScreens: 0, pickRate: 0, bought: 0, winDeltaByBucket: {}, deckWinDelta: 0, dmgPerCombatWith: 0 });
  let screens = 0;
  let skips = 0;
  const pickRuns = new Map<string, Map<string, Set<number>>>();
  rs.forEach((r, ri) => {
    for (const sc of r.screens) {
      screens += 1;
      if (sc.picked === null) skips += 1;
      for (const id of sc.offered) {
        const c = card(id);
        c.offered += 1;
        if (sc.picked === null) c.skippedScreens += 1;
      }
      if (sc.picked !== null) {
        card(sc.picked).picked += 1;
        const b = bucketOf(sc.floor);
        const m = pickRuns.get(sc.picked) ?? new Map<string, Set<number>>();
        const set = m.get(b) ?? new Set<number>();
        set.add(ri);
        m.set(b, set);
        pickRuns.set(sc.picked, m);
      }
    }
    for (const b of r.cardsBought) card(b.card).bought += 1;
  });
  for (const [id, c] of Object.entries(cards)) {
    c.pickRate = r3(c.offered ? c.picked / c.offered : 0);
    for (const [b, set] of pickRuns.get(id) ?? []) {
      const picked = [...set].map((i) => rs[i]).filter((x): x is RunResult => x !== undefined);
      c.winDeltaByBucket[b] = { picks: set.size, delta: r3(winRate(picked) - base) };
    }
    const withIt = rs.filter((r) => r.deckEnd.includes(id));
    const without = rs.filter((r) => !r.deckEnd.includes(id));
    c.deckWinDelta = withIt.length && without.length ? r3(winRate(withIt) - winRate(without)) : 0;
    c.dmgPerCombatWith = r3(mean(withIt.flatMap((r) => r.damageTakenPerCombat)));
  }
  // Relics
  const relics: BalanceMetrics['relics'] = {};
  for (const id of new Set(rs.flatMap((r) => r.relics))) {
    const withIt = rs.filter((r) => r.relics.includes(id));
    const without = rs.filter((r) => !r.relics.includes(id));
    relics[id] = { runs: withIt.length, winDelta: withIt.length && without.length ? r3(winRate(withIt) - winRate(without)) : 0 };
  }
  const bossRelics: BalanceMetrics['bossRelics'] = {};
  let bossScreens = 0;
  let bossSkips = 0;
  for (const r of rs) {
    for (const sc of r.bossRelicScreens) {
      bossScreens += 1;
      if (sc.picked === null) bossSkips += 1;
      for (const id of sc.offered) (bossRelics[id] ??= { offered: 0, picked: 0 }).offered += 1;
      if (sc.picked !== null) (bossRelics[sc.picked] ??= { offered: 0, picked: 0 }).picked += 1;
    }
  }
  const pacts: BalanceMetrics['pacts'] = {};
  for (const id of new Set(rs.map((r) => r.pact).filter((x): x is string => x !== null))) {
    const withIt = rs.filter((r) => r.pact === id);
    const without = rs.filter((r) => r.pact !== id);
    pacts[id] = { picked: withIt.length, winDelta: withIt.length && without.length ? r3(winRate(withIt) - winRate(without)) : 0 };
  }
  const events: BalanceMetrics['events'] = {};
  for (const r of rs) {
    for (const e of r.events) {
      const ev = (events[e.event] ??= { seen: 0, choices: {} });
      ev.seen += 1;
      const k = e.choice === null ? 'none' : String(e.choice);
      ev.choices[k] = (ev.choices[k] ?? 0) + 1;
    }
  }
  const perAct = (f: (r: RunResult) => readonly number[]): number[] => [0, 1, 2].map((a) => r3(mean(rs.map((r) => f(r)[a] ?? 0))));
  const removalsByAct = [1, 2, 3].map((act) => {
    const rec = { act, shop: 0, rest: 0, event: 0, other: 0 };
    for (const r of rs) {
      for (const x of r.removals) {
        if (x.act !== act) continue;
        if (x.room === 'shop') rec.shop += 1;
        else if (x.room === 'rest') rec.rest += 1;
        else if (x.room === 'event') rec.event += 1;
        else rec.other += 1;
      }
    }
    return { act, shop: r3(rec.shop / n), rest: r3(rec.rest / n), event: r3(rec.event / n), other: r3(rec.other / n) };
  });
  // Encounters
  const encounters: Record<string, EncounterMetrics> = {};
  const encAcc = new Map<string, { act: number; room: string; turns: number[]; dmg: number[]; pct: number[]; deaths: number }>();
  for (const r of rs) {
    for (const c of r.combats) {
      const e = encAcc.get(c.encounterId) ?? { act: c.act, room: c.room, turns: [], dmg: [], pct: [], deaths: 0 };
      e.turns.push(c.turns);
      e.dmg.push(c.damageTaken);
      e.pct.push(c.damageTaken / Math.max(1, c.maxHp));
      if (!c.won) e.deaths += 1;
      encAcc.set(c.encounterId, e);
    }
  }
  for (const [id, e] of encAcc) {
    encounters[id] = { act: e.act, room: e.room, fights: e.turns.length, deaths: e.deaths, avgTurns: r3(mean(e.turns)), avgDamage: r3(mean(e.dmg)), avgDamagePct: r3(mean(e.pct)) };
  }
  const tele = sumTelemetry(rs);
  const combats = rs.reduce((a, r) => a + r.combats.length, 0);
  const prunes = rs.flatMap((r) => r.combats.map((c) => c.prunes));
  let attackPlays = 0;
  let onsSum = 0;
  for (const [k, v] of Object.entries(tele.onslaughtAtAttack)) {
    attackPlays += v;
    onsSum += Number(k) * v;
  }
  const prevented = tele.blockAbsorbed + tele.guardAbsorbed;
  const dealt = tele.hitDamage + tele.rotDamage + tele.otherHpLoss;
  const capHits: Record<string, number> = {};
  for (const r of rs) for (const [k, v] of Object.entries(r.capHits)) capHits[k] = (capHits[k] ?? 0) + v;
  const turns = rs.reduce((a, r) => a + r.turns, 0);
  return {
    runs: n,
    wins: rs.filter((r) => r.won).length,
    winRate: r3(base),
    milestones: {
      reachA1Boss: r3(rs.filter((r) => reachedBoss(r, 1)).length / n),
      beatA1Boss: r3(rs.filter((r) => beatBoss(r, 1)).length / n),
      reachA2Boss: r3(rs.filter((r) => reachedBoss(r, 2)).length / n),
      beatA2Boss: r3(rs.filter((r) => beatBoss(r, 2)).length / n),
      reachA3Boss: r3(rs.filter((r) => reachedBoss(r, 3)).length / n),
      win: r3(base),
    },
    deathShareByAct: deathByAct.map((d) => r3(losses.length ? d / losses.length : 0)),
    stalemates: rs.filter((r) => r.endCause === 'stalemate').length,
    stalematesByEncounter,
    deathsByEncounter,
    floorOfDeath,
    avgActions: r3(mean(rs.map((r) => r.actions))),
    avgWinActions: r3(mean(rs.filter((r) => r.won).map((r) => r.actions))),
    bossEntryHp,
    screens,
    skipRate: r3(screens ? skips / screens : 0),
    cards,
    relics,
    bossRelics,
    bossRelicSkipRate: r3(bossScreens ? bossSkips / bossScreens : 0),
    pacts,
    events,
    shardsEarnedByAct: perAct((r) => r.shardsEarnedByAct),
    shardsSpentByAct: perAct((r) => r.shardsSpentByAct),
    deckSizeByAct: [0, 1, 2].map((a) => r3(mean(rs.flatMap((r) => (r.deckSizeByAct[a] ? [r.deckSizeByAct[a] ?? 0] : []))))),
    goldEarnedByAct: perAct((r) => r.goldEarnedByAct),
    goldSpentByAct: perAct((r) => r.goldSpentByAct),
    removalsByAct,
    upgradesByAct: perAct((r) => r.upgradesByAct),
    encounters,
    telemetry: tele,
    derived: {
      onslaughtAtAttackMean: r3(attackPlays ? onsSum / attackPlays : 0),
      riposteTriggersPerPrime: r3(tele.primed ? tele.riposteTriggers / tele.primed : 0),
      primeFizzleRate: r3(tele.primed ? tele.primeFizzles / tele.primed : 0),
      guardShareOfPrevented: r3(prevented ? tele.guardAbsorbed / prevented : 0),
      rotShareOfDamage: r3(dealt ? tele.rotDamage / dealt : 0),
      beatsPerTurn: r3(tele.playerTurns ? tele.onBeatPlays / tele.playerTurns : 0),
      timelinePerCombat: r3(combats ? tele.timelineResolved / combats : 0),
      prunesPerCombat: r3(mean(prunes)),
      exposedBonusPerCombat: r3(combats ? tele.exposedBonus / combats : 0),
      staggerPreventedPerCombat: r3(combats ? tele.staggerPrevented / combats : 0),
      bloomMaxAtEnd: r3(tele.bloomMax / n),
      bloomTotalAtEnd: r3(tele.bloomTotal / n),
      bloomCardsAtEnd: r3(tele.bloomCards / n),
    },
    capHits,
    capHitsPerTurn: r3(Object.values(capHits).reduce((a, b) => a + b, 0) / Math.max(1, turns)),
  };
}
