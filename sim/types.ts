// Simulator contract (ENGINE_SPEC section 10).
import type { Action, Act, CardId, EncounterId, RelicId } from '../src/engine';
import type { Game } from '../src/engine';
import type { RunDetail } from './detail';

export interface Policy {
  name: string;
  /** Must return one of `legal`. `rngSeedForPolicy` is a fresh uint32 per call from the policy's own seeded stream. */
  choose(game: Game, legal: Action[], rngSeedForPolicy: number): Action;
}

export interface RunResult {
  seed: string;
  classId: string;
  policy: string;
  won: boolean;
  /** How the run ended: 'stalemate' = a combat exceeded RunOptions.maxCombatTurns (counted as a loss). */
  endCause: 'victory' | 'defeat' | 'stalemate';
  floorReached: number;
  act: Act;
  deathEncounter?: EncounterId;
  hpByFloor: number[];
  deckEnd: CardId[];
  relics: RelicId[];
  cardsOffered: CardId[];
  cardsPicked: CardId[];
  cardsSkipped: CardId[];
  turnsPerCombat: number[];
  damageTakenPerCombat: number[];
  /** Deck size at the end of each act reached (index 0 = act 1). */
  deckSizeByAct: number[];
  /** Shards earned / spent per act (index 0 = act 1). */
  shardsEarnedByAct: number[];
  shardsSpentByAct: number[];
  /** Cap hits by cap id over the whole run (GDD §3). */
  capHits: Record<string, number>;
  /** Player turns played (for the cap-hit rate). */
  turns: number;
  actions: number;
  elapsedMs: number;
  /** One entry per combat entered (from the run history), in order. */
  combats: CombatRecord[];
  /** Card reward / offer screens (combat rewards; shop buys are in cardsBought). */
  screens: { floor: number; act: Act; offered: CardId[]; picked: CardId | null }[];
  cardsBought: { floor: number; card: CardId }[];
  relicsGained: { floor: number; relic: RelicId }[];
  bossRelicScreens: { act: Act; offered: RelicId[]; picked: RelicId | null }[];
  pact: string | null;
  events: { floor: number; event: string; choice: number | null }[];
  removals: { floor: number; act: Act; room: string; card: CardId }[];
  upgradesByAct: number[];
  goldEarnedByAct: number[];
  goldSpentByAct: number[];
  telemetry: Telemetry;
  /** Attribution telemetry (sim/detail.ts). */
  detail: RunDetail;
  /** v2 engines (lib/engines.ts): first floor the deck held a drafted (non-starter) piece of each engine / assembled it (starters count toward assembly). Empty without engines. */
  engines: { firstPiece: Record<string, number>; assembled: Record<string, number> };
}

export interface CombatRecord {
  encounterId: EncounterId;
  room: string;
  act: Act;
  floor: number;
  turns: number;
  damageTaken: number;
  hpBefore: number;
  maxHp: number;
  won: boolean;
  /** Prunes that Scrapped a card in this combat. */
  prunes: number;
}

/** Mechanic telemetry (GDD §8.6 item 5), summed over the run. */
export interface Telemetry {
  /** Onslaught when an Attack card was played: histogram value -> count. */
  onslaughtAtAttack: Record<string, number>;
  primed: number;
  riposteTriggers: number;
  primeFizzles: number;
  attackCancels: number;
  /** Damage of enemy hits on the player absorbed by Block / Guard / taken as HP. */
  blockAbsorbed: number;
  guardAbsorbed: number;
  hitHpLost: number;
  /** Player-caused HP loss on enemies: by hits, by Rot ticks, by other HP loss. */
  hitDamage: number;
  rotDamage: number;
  otherHpLoss: number;
  /** Bonus damage from Exposed on enemies (min(hit, stacks) per player hit). */
  exposedBonus: number;
  /** Stagger stacks on the attacker summed per enemy hit (upper bound of damage prevented). */
  staggerPrevented: number;
  playerTurns: number;
  onBeatPlays: number;
  cardsPlayed: number;
  timelineAdded: number;
  timelineResolved: number;
  bloomGained: number;
  /** At the end of the run (deck copies). */
  bloomMax: number;
  bloomTotal: number;
  bloomCards: number;
  potionsUsed: number;
}
