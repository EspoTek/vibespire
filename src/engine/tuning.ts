// Rule numbers the engine owns, keyed as docs/GDD.md's `[TUNING.*]` brackets say.
// Keep every engine-owned rule number here so the simulator can sweep it.

import type { Act, CardRarity, PotionRarity, RelicRarity } from './types';

type Range = [number, number];
type Odds = { common: number; uncommon: number; rare: number };
type MapWeights = { monster: number; event: number; elite: number; rest: number; shop: number };

export const TUNING = {
  handLimit: 10,
  drawPerTurn: 5,

  /** GDD §3. Per-turn caps reset at player turn start step 3. */
  caps: {
    bonusEnergy: 4,
    toHand: 4,
    effectDraw: 15,
    costReductionMax: 2,
    playDepth: 1,
    /** RULINGS 28: an on-beat clause runs at most this many times. */
    onBeatRuns: 3,
    advancePerTurn: 2,
    timeline: 10,
    delayMax: 3,
    postponeMax: 3,
    primeCapacity: 3,
    pruneAwayPerTurn: 1,
    playsPerTurn: 40,
    guard: 50,
    bloom: 10,
    /** Status stack caps by status id (win over StatusDef.maxStacks). */
    status: { onslaught: 30, exposed: 20, stagger: 20, rot: 15 } as Record<string, number>,
  },

  /** GDD §2.7. */
  cadence: { beats: [3, 6, 9] as number[] },
  /** GDD §2.1: Onslaught gained after each played Attack finishes. */
  onslaught: { perAttack: 1 },
  /** GDD §2.2: base prime capacity. */
  riposte: { baseCapacity: 1, charges: 1 },
  /** GDD §2.9: intents shown = depth (forecast length = depth - 1). */
  augury: { depth: 2 },
  /** GDD §2.14 backlash_primed: +4 per stack on the next enemy hit. */
  backlashPerStack: 4,
  /** Pipeline step 3 multiplier on enemy-sourced hits, per act (simulator lever). */
  enemyDamagePct: { 1: 100, 2: 100, 3: 100 } as Record<Act, number>,

  map: {
    rows: 15,
    cols: 7,
    paths: 6,
    bossCol: 3,
    treasureRow: 8,
    /** GDD §4.9 weights by row band (rows 0, 8, 14 are fixed). */
    weights: {
      early: { monster: 62, event: 30, elite: 0, rest: 0, shop: 8 } as MapWeights, // rows 1-4
      mid: { monster: 45, event: 22, elite: 13, rest: 12, shop: 8 } as MapWeights, // rows 5-7, 9-12
      late: { monster: 52, event: 25, elite: 15, rest: 0, shop: 8 } as MapWeights, // row 13
    },
    minShops: 1,
    minElites: 2,
    maxAttempts: 200,
  },

  /** '?' node resolution, percent (GDD §4.9). */
  unknownRoomOdds: { event: 65, monster: 20, shop: 8, treasure: 7 },

  /** First N normal fights of an act use the 'easy' pool. */
  easyFights: { 1: 3, 2: 2, 3: 2 } as Record<Act, number>,
  /** Do not repeat any of the last N encounters. */
  encounterNoRepeat: 2,

  /** GDD §4.4, per act. */
  gold: {
    monster: { 1: [10, 18], 2: [13, 21], 3: [16, 24] } as Record<Act, Range>,
    elite: { 1: [25, 35], 2: [30, 40], 3: [35, 45] } as Record<Act, Range>,
    boss: { 1: [90, 110], 2: [90, 110], 3: [90, 110] } as Record<Act, Range>,
    event: { 1: [20, 30], 2: [25, 35], 3: [30, 40] } as Record<Act, Range>,
    treasure: [25, 40] as Range,
  },

  /** GDD §4.2 card reward odds, percent. Pity adds to rare, taken from common. */
  cardOdds: {
    monster: { common: 60, uncommon: 37, rare: 3 } as Odds,
    elite: { common: 50, uncommon: 40, rare: 10 } as Odds,
    boss: { common: 0, uncommon: 0, rare: 100 } as Odds,
    event: { common: 50, uncommon: 40, rare: 10 } as Odds,
    shop: { common: 54, uncommon: 37, rare: 9 } as Odds,
  },
  rarePityStart: 0,
  rarePityStep: 1,
  cardRewardSize: 3,
  /** Upgraded offer chance (percent) for non-rare offers per act; rares at half. */
  upgradedOffer: { 1: 0, 2: 15, 3: 30 } as Record<Act, number>,

  /** GDD §4.3. */
  potion: { start: 40, step: 10, min: 10, max: 90 },
  potionRarityOdds: { common: 65, uncommon: 25, rare: 10 } as Record<PotionRarity, number>,

  /** General relic drop odds (elites, shop general slots). */
  relicRarityOdds: { common: 50, uncommon: 33, rare: 17 } as Partial<Record<RelicRarity, number>>,
  /** GDD §4.9 treasure relic odds. */
  treasureRelicOdds: { common: 50, uncommon: 35, rare: 15 } as Partial<Record<RelicRarity, number>>,
  bossRelicChoices: 3,

  /** GDD §2.12 / §4.5. */
  shards: { cap: 10, skipReward: 1, skipBossRelic: 2 },

  restHealPct: 30,
  /** Heal this percent of MISSING hp on act transition (acts 1-2 bosses). */
  actHealMissingPct: 75,

  /** GDD §4.6. */
  shop: {
    classCards: { attack: 2, skill: 2, power: 1 },
    salePct: 50,
    colorlessRarities: ['uncommon', 'rare'] as ('uncommon' | 'rare')[],
    relics: 3,
    potions: 3,
    cardPrice: { common: [45, 55], uncommon: [68, 82], rare: [135, 165] } as Record<'common' | 'uncommon' | 'rare', Range>,
    colorlessMarkupPct: 120,
    relicPrice: { common: [143, 158], uncommon: [238, 262], rare: [285, 315], shop: [143, 158] } as Record<
      'common' | 'uncommon' | 'rare' | 'shop',
      Range
    >,
    potionPrice: { common: [48, 53], uncommon: [71, 79], rare: [95, 105] } as Record<PotionRarity, Range>,
    removeBase: 75,
    removeStep: 25,
    removeShardGold: 25,
    removeShardCost: 1,
  },

  /** GDD §4.8. */
  transmute: { offers: 2 },

  /** GDD §4.12 Ascent levers (data only; RunState.ascent stays 0 for now). */
  ascent: [
    { level: 1, id: 'asc_elite_surge', lever: 'eliteMapWeightPct', value: 160 },
    { level: 2, id: 'asc_sharp_foes', lever: 'normalEnemyHitPct', value: 110 },
    { level: 3, id: 'asc_lean_purse', lever: 'goldGainPct', value: 75 },
    { level: 4, id: 'asc_tight_belt', lever: 'potionSlots', value: -1 },
    { level: 5, id: 'asc_burden', lever: 'startCurse', value: 'curse_burden' },
    { level: 6, id: 'asc_weary', lever: 'actHealMissingPct', value: 50 },
    { level: 7, id: 'asc_scarcity', lever: 'rareAndUpgradePct', value: 50 },
    { level: 8, id: 'asc_tough_foes', lever: 'enemyMaxHpPct', value: 110 },
    { level: 9, id: 'asc_deadly_foes', lever: 'eliteBossHitPct', value: 110 },
    { level: 10, id: 'asc_twin_crown', lever: 'act3DoubleBoss', value: 1 },
  ] as const,
};

export const REWARD_RARITIES: readonly CardRarity[] = ['common', 'uncommon', 'rare'];

/** Cap ids (GDD §3) used in cap_hit events and counters. */
export const CAP_NAMES: Record<string, string> = {
  cap_bonus_energy: 'Bonus energy limit',
  cap_to_hand: 'Cards-to-hand limit',
  cap_draw: 'Draw limit',
  cap_cost_reduction: 'Cost reduction limit',
  cap_beats: 'Beat limit',
  cap_advance: 'Advance limit',
  cap_relay: 'Relay limit',
  cap_timeline: 'Timeline full',
  cap_primes: 'Prime limit',
  cap_prune_away: 'Prune away limit',
  cap_plays: 'Play limit',
  cap_stacks: 'Stack limit',
  cap_hand: 'Hand full',
};

/**
 * Simulator sweep hook (sim/sweep.ts, `sim/batch.ts --set`): set numeric TUNING leaves by dotted path,
 * e.g. `enemyDamagePct.1`, `cardOdds.monster.rare`, `caps.bloom`. Throws on an unknown path or a
 * leaf that is not a number. Returns a function that restores the previous values.
 */
export function applyTuningOverrides(overrides: Readonly<Record<string, number>>): () => void {
  const undo: (() => void)[] = [];
  for (const [path, value] of Object.entries(overrides)) {
    if (!Number.isFinite(value)) throw new Error(`TUNING override ${path}: ${value} is not a finite number`);
    const keys = path.split('.');
    const leaf = keys.pop();
    if (leaf === undefined || leaf === '') throw new Error(`TUNING override: empty path`);
    let node: object = TUNING;
    for (const k of keys) {
      const next: unknown = Reflect.get(node, k);
      if (typeof next !== 'object' || next === null) throw new Error(`TUNING override ${path}: '${k}' is not a TUNING group`);
      node = next;
    }
    if (!Object.prototype.hasOwnProperty.call(node, leaf)) throw new Error(`TUNING override ${path}: no such key '${leaf}'`);
    const old: unknown = Reflect.get(node, leaf);
    if (typeof old !== 'number') throw new Error(`TUNING override ${path}: current value is not a number`);
    const target = node;
    Reflect.set(target, leaf, value);
    undo.push(() => Reflect.set(target, leaf, old));
  }
  return () => {
    for (const f of undo.reverse()) f();
  };
}
