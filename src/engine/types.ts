// Vibespire engine API types. This file is the contract between engine, content,
// renderer and simulator (docs/ENGINE_SPEC.md; rules: docs/GDD.md). It imports nothing.
//
// Conventions
// - All *State types are plain JSON data (no functions, classes, Maps, Sets, undefined-valued keys).
// - All *Def types live in src/content registries and may carry functions (hooks).
// - EntityRef: 'player' or an enemy uid (number).
// - Draw pile order: the TOP of the draw pile is the LAST element of `CombatState.draw`.
// - Hand order: drawn/created cards are appended at the right (end of `CombatState.hand`).
// - Multipliers are integer percentages (75 = x0.75, 150 = x1.5) so damage maths stays integer.
// - GDD terms: Scrap = keyword 'exhaust' (Scrapheap = `CombatState.exhaust`), Keep = 'retain',
//   Opening = 'innate'.

// ---------------------------------------------------------------------------
// Ids

export type ClassId = string;
export type CardId = string;
export type RelicId = string;
export type EnemyId = string;
export type StatusId = string;
export type EventId = string;
export type PotionId = string;
export type EncounterId = string;
export type BoonId = string;
export type RestOptionId = string;

export type Act = 1 | 2 | 3;
export type EntityRef = 'player' | number;

// ---------------------------------------------------------------------------
// RNG

export type RngStream = 'map' | 'shuffle' | 'enemy' | 'reward' | 'event' | 'misc';
/** sfc32 state: four uint32 words. */
export type RngState = [number, number, number, number];
export type RngStreams = Record<RngStream, RngState>;

/** Stream-addressed RNG helpers handed to hooks. All draws advance `state.rng[stream]`. */
export interface RngApi {
  /** Integer in [min, max] inclusive. */
  int(stream: RngStream, min: number, max: number): number;
  /** Float in [0, 1). */
  float(stream: RngStream): number;
  chance(stream: RngStream, p: number): boolean;
  pick<T>(stream: RngStream, items: readonly T[]): T;
  /** Fisher-Yates in place; returns the same array. */
  shuffle<T>(stream: RngStream, items: T[]): T[];
}

/** RNG bound to a single stream (an enemy's own AI stream). */
export interface SingleRng {
  int(min: number, max: number): number;
  float(): number;
  chance(p: number): boolean;
  pick<T>(items: readonly T[]): T;
  /** Weighted pick; weights must be >= 0 and sum > 0. */
  weighted<T>(items: readonly (readonly [T, number])[]): T;
}

// ---------------------------------------------------------------------------
// Run state

export type Phase =
  | 'start' // Ascent Pact choice
  | 'map'
  | 'combat'
  | 'reward'
  | 'shop'
  | 'rest'
  | 'event'
  | 'treasure'
  | 'boss_reward' // choose 1 of up to 3 boss relics, or skip_boss_relic (+2 Shards)
  | 'victory'
  | 'defeat';

/** Ruling 71: Standard (default) and Heroic (enemies have more HP). */
export type Difficulty = 'standard' | 'heroic';
export const DIFFICULTIES: readonly Difficulty[] = ['standard', 'heroic'];

export interface RunState {
  version: number;
  seed: string;
  classId: ClassId;
  rng: RngStreams;
  act: Act;
  /** Ascent level 0-10 (GDD §4.12). Levers are data in TUNING.ascent; only 0 is played today. */
  ascent: number;
  /** Difficulty tier chosen at run start (ruling 71): its levers are TUNING.difficulty[tier]. */
  difficulty: Difficulty;
  /** Counts up across the whole run. 0 = before the first node. */
  floor: number;
  phase: Phase;
  player: PlayerState;
  map: ActMap;
  /** Current node, null at the start of an act (before the first travel). */
  mapPos: MapPos | null;
  /** Nodes travelled this act, oldest first (the last one is mapPos); reset at each act start. */
  mapPath: MapPos[];
  /** What the current node resolved to ('?' nodes resolve on entry). */
  room: RoomType | null;
  combat: CombatState | null;
  reward: RewardState | null;
  shop: ShopState | null;
  event: EventState | null;
  rest: RestState | null;
  treasure: TreasureState | null;
  startChoices: StartBoon[] | null;
  bossRelicChoices: RelicId[] | null;
  /** Run-level effect queue (used outside combat: pacts, events, potions, pickups). */
  queue: QueueItem[];
  /** Run-level pending choice. In combat see CombatState.pendingChoice. */
  pendingChoice: PendingChoice | null;
  history: RunHistory;
  counters: RunCounters;
  /** Next card instance uid. */
  nextUid: number;
}

/**
 * Engine-owned keys of PlayerState.counters (content may add its own keys):
 * shards (cap TUNING.shards.cap), lean_rewards, wide_rewards, augury_combats, hunted_pending,
 * augury_rest_of_act, forecast_depth_3_rest_of_act (keys ending in `_rest_of_act` reset at act start),
 * combat_start_status:<statusId> (stacks applied at every combat start).
 */
export type PlayerCounterKey =
  /** `combat_start_status:<statusId>`: that many stacks applied to the player at every combat start. */
  | `combat_start_status:${string}`
  | 'shards'
  | 'lean_rewards'
  | 'wide_rewards'
  | 'augury_combats'
  | 'hunted_pending'
  | 'augury_rest_of_act'
  | 'forecast_depth_3_rest_of_act';

export interface PlayerState {
  hp: number;
  maxHp: number;
  gold: number;
  deck: CardInstance[];
  relics: RelicState[];
  /** Held potions, compact (length <= potionSlots). */
  potions: PotionId[];
  potionSlots: number;
  /** Run-persistent counters. `shards` always exists. See PlayerCounterKey. */
  counters: Record<string, number>;
}

export interface RunCounters {
  /** Encounter ids fought this run, oldest first. */
  encounters: EncounterId[];
  /** Normal (non-elite) monster fights this act, drives the easy-pool rule. */
  monstersThisAct: number;
  eventsSeen: EventId[];
  /** Rare pity in percent points (GDD §4.2: starts 0, +1 per normal/elite/event screen without a rare). */
  rarePity: number;
  /** Current potion drop chance in percent. */
  potionChance: number;
  /** Gold card removals bought at shops (drives the gold removal price). */
  shopRemovals: number;
}

export interface CardInstance {
  uid: number;
  id: CardId;
  upgraded: boolean;
  /** Cost for the rest of this combat (clamped to printed - TUNING.caps.costReductionMax). */
  costOverride?: number;
  /** Cost until end of this turn (wins over costOverride). */
  tempCost?: number;
  /**
   * Permanent per-instance counters. `bloom` is the Bloom value (GDD §2.4). Combat copies share
   * the deck card's uid; at combat end each deck card's `vars` are synced from its combat copy.
   */
  vars?: Record<string, number>;
}

export interface RelicState {
  id: RelicId;
  counter: number;
  /** Free-form per-relic data for content hooks. */
  data?: Record<string, number>;
}

export interface StartBoon {
  id: BoonId;
}

// ---------------------------------------------------------------------------
// Map

export type NodeType = 'monster' | 'elite' | 'rest' | 'shop' | 'event' | 'treasure' | 'boss';
export type RoomType = NodeType | 'start';

export interface MapPos {
  row: number;
  col: number;
}

export interface MapNode {
  row: number;
  col: number;
  type: NodeType;
  /** Columns of connected nodes in row + 1. */
  edges: number[];
  /** Elite nodes: the elite encounter pre-assigned at map generation (GDD §4.9). */
  encounterId?: EncounterId;
}

export interface ActMap {
  act: Act;
  /** rows[r] = existing nodes of row r sorted by col. rows[0..14] are the act, rows[15] holds the single boss node. */
  rows: MapNode[][];
  bossEncounter: EncounterId;
}

// ---------------------------------------------------------------------------
// Combat

export type StatusMap = Record<StatusId, number>;

export interface CombatPlayerState {
  block: number;
  /** Second defence pool: absorbs after Block, halves at the owner's turn start (GDD §2.3). */
  guard: number;
  statuses: StatusMap;
}

/** A primed Riposte card (GDD §2.2). `charges` = remaining triggers (1; Duelist's Oath 2). */
export interface PrimedEntry {
  card: CardInstance;
  charges: number;
}

/** A Delay card waiting on the Timeline (GDD §2.8). */
export interface TimelineEntry {
  card: CardInstance;
  /** Resolves at the start of the player turn whose number is >= dueTurn. */
  dueTurn: number;
  /** Play order; entries resolve in seq order. */
  seq: number;
  /** On-beat status stamped when played. */
  onBeat: boolean;
  target: EntityRef | null;
  x: number;
  advancedThisTurn: boolean;
  /** Chronist v2 Schedule: a non-Delay card put here by `schedule`; it resolves its `effects` (not `delay.effects`). */
  scheduled?: boolean;
  /** Chronist v2: 1-based beat index stamped at play time (0/absent = not on the beat). Scale 'beat_index'. */
  beatIndex?: number;
}

export type CombatKind = 'monster' | 'elite' | 'boss' | 'event';

/**
 * Engine-owned keys of CombatState.counters. Per-turn keys reset at player turn start step 3.
 * Per combat: prunes, beatOffset (Tempo Draught), capHits (total), `cap:<capId>` (per cap),
 *   timelineSeq.
 * Per turn: bonusEnergy, toHand, effectDraw, advance, pruneAway, plays, bestCardDamage, primedByEffect.
 * Per enemy move: riposteThisMove (0/1), moveDamageStart, declaringUid, cancelMove.
 * Per card resolution: curCardUid, curCardDmg (feed bestCardDamage).
 */
export type CombatCounterKey =
  | 'prunes'
  | 'beatOffset'
  | 'capHits'
  | 'timelineSeq'
  | 'bonusEnergy'
  | 'toHand'
  | 'effectDraw'
  | 'advance'
  | 'pruneAway'
  | 'plays'
  | 'bestCardDamage'
  | 'riposteThisMove'
  | 'moveDamageStart'
  /** Chronist v2 (per turn): Timeline cards re-added by the recurDelay modifier this turn (Eternal Return). */
  | 'recurs'
  /** Next-turn bank (Breaker v2): cards drawn / energy gained at the start of the player's next turn. */
  | 'bankDraw'
  | 'bankEnergy';

export interface CombatState {
  encounterId: EncounterId;
  kind: CombatKind;
  isElite: boolean;
  isBoss: boolean;
  /** Event combats: the event and the extra effects run when the fight is won. */
  eventId: EventId | null;
  onWin: Effect[];
  turn: number;
  turnPhase: 'player' | 'enemy';
  /** Set when the fight is decided. 'won' still drains queued effects before rewards. */
  outcome: 'won' | 'lost' | null;
  energy: number;
  maxEnergy: number;
  drawPerTurn: number;
  handLimit: number;
  hand: CardInstance[];
  /** Top of the draw pile is the LAST element. */
  draw: CardInstance[];
  discard: CardInstance[];
  /** The Scrapheap. */
  exhaust: CardInstance[];
  /** Cards currently resolving (played, riposting or resolving from the Timeline). */
  inPlay: CardInstance[];
  /** The primed rack, leftmost first. Cards here are in no pile. */
  primed: PrimedEntry[];
  /** The Timeline. Cards here are in no pile. */
  timeline: TimelineEntry[];
  player: CombatPlayerState;
  enemies: EnemyState[];
  queue: QueueItem[];
  pendingChoice: PendingChoice | null;
  /** Counted plays this turn (Cadence), appended at pay-cost time; depth > playDepth plays are not counted. */
  cardsPlayedThisTurn: CardId[];
  /** Attacks whose play has finished this turn (the one being played is not counted; RULINGS 34). */
  attacksPlayedThisTurn: number;
  cardsPlayedThisCombat: number;
  /** cap_cost_reduction: uids already played below printed cost this turn. */
  reducedThisTurn: number[];
  /** cap_relay: uids that resolved from the Timeline this turn. */
  resolvedThisTurn: number[];
  /**
   * The last Prune that Scrapped a card (pruned_type condition). `types`: every card type that Prune
   * Scrapped (Clear-Cut lets one Prune Scrap several; absent = just `type`).
   */
  lastPrune: { uid: number; cardId: CardId; type: CardType; types?: CardType[] } | null;
  /** HP the player lost this combat. */
  damageTaken: number;
  /** Engine-owned keys: see CombatCounterKey. Content may add its own keys. */
  counters: Record<string, number>;
  nextEnemyUid: number;
}

export type IntentKind =
  | 'attack'
  | 'attack_defend'
  | 'attack_buff'
  | 'attack_debuff'
  | 'defend'
  | 'defend_buff'
  | 'buff'
  | 'debuff'
  | 'unknown'
  | 'sleep'
  | 'escape'
  | 'special';

export interface Intent {
  kind: IntentKind;
  /** '' for a hidden forecast entry. */
  moveId: string;
  /** Per-hit damage against the player, computed with all current modifiers (pipeline steps 1-5). */
  damage?: number;
  hits?: number;
  /** Forecast entry of a move with augury 'hidden': show "?". */
  hidden?: boolean;
}

export interface EnemyState {
  uid: number;
  id: EnemyId;
  hp: number;
  maxHp: number;
  block: number;
  guard: number;
  statuses: StatusMap;
  intent: Intent;
  /** The round (combat.turn) in which `intent` will be used. */
  intentTurn: number;
  /** The next intents after `intent` (length = forecast depth - 1). Always computed (GDD §2.9). */
  forecast: Intent[];
  moveHistory: string[];
  aiState: Record<string, number>;
  /** false when dead or fled. */
  alive: boolean;
  /** Left combat (not a death: no onDeath, no Rot spread). */
  fled: boolean;
  /** Minions: uid of the leader, and what happens when it dies. */
  leaderUid: number | null;
  withLeader: 'die' | 'flee' | null;
  /** This enemy's own AI rng stream (seeded from the 'enemy' stream at spawn). */
  rng: RngState;
}

// ---------------------------------------------------------------------------
// Effect queue (plain data; resumable)

export type EffectSource =
  | { kind: 'card'; uid: number; id: CardId; upgraded: boolean }
  | { kind: 'relic'; id: RelicId }
  | { kind: 'potion'; id: PotionId }
  | { kind: 'enemy'; uid: number; id: EnemyId; moveId: string | null }
  | { kind: 'status'; id: StatusId; owner: EntityRef }
  | { kind: 'event'; id: EventId }
  | { kind: 'boon'; id: BoonId }
  /** A rest-site option; `relic` is set when the option comes from a held relic's restOption. */
  | { kind: 'rest'; id: RestOptionId; relic?: RelicId }
  | { kind: 'system' };

export interface EffectFrame {
  src: EffectSource;
  /** Acting entity ('self'). */
  self: EntityRef;
  /** Chosen target ('target'), if any. */
  target: EntityRef | null;
  /** X value for X-cost cards (energy spent), else 0. */
  x: number;
  /** Riposte: hit count of the triggering enemy attack (scale 'trigger_hits'). */
  hits?: number;
  /** spend_status: stacks spent (scale 'spent'). */
  spent?: number;
  /** shed: Guard Shed (scale 'shed'). */
  shed?: number;
  /** Shared v2: exhaust `then` list: cards actually Scrapped (scale 'scrapped'). */
  scrapped?: number;
  /** The play (or stamped Timeline entry) is on the beat. */
  onBeat?: boolean;
  /** Resolving from the Timeline (damage/block info gets tag 'delayed'). */
  delayed?: boolean;
  /** A Riposte trigger (damage info gets tag 'riposte'). */
  riposte?: boolean;
  /** Play depth: 0 = played from hand by the player, 1 = played by a depth-0 card's effect, ... */
  depth?: number;
  /** Chronist v2: 1-based index of this play's beat among the beat positions (scale 'beat_index'; Crescendo). */
  beatIndex?: number;
  /** Chronist v2: other cards resolving from the Timeline in the same batch (scale 'chorus'). */
  chorus?: number;
}

export type TurnStep =
  | { op: 'combat_start' }
  | { op: 'combat_intents' }
  | { op: 'player_turn_start' }
  | { op: 'timeline_resolve' }
  /** batch = entries made due by the same dueEntrySteps call (Chorus counts the others). */
  | { op: 'timeline_entry'; seq: number; batch?: number }
  | { op: 'player_draw' }
  | { op: 'player_turn_end' }
  | { op: 'prime' }
  | { op: 'tick'; phase: RoundPhase }
  | { op: 'hand_end_of_turn' }
  | { op: 'discard_hand' }
  | { op: 'decay'; phase: RoundPhase }
  /** end_own_turn tick/decay for one entity. */
  | { op: 'own_tick'; who: EntityRef }
  | { op: 'own_decay'; who: EntityRef }
  | { op: 'enemy_phase' }
  | { op: 'enemy_turn_start'; uid: number }
  | { op: 'enemy_move'; uid: number }
  | { op: 'enemy_riposte'; uid: number }
  | { op: 'enemy_move_effects'; uid: number }
  | { op: 'enemy_move_end'; uid: number }
  | { op: 'enemy_choose'; uid: number }
  | { op: 'round_end' }
  | { op: 'combat_end_hooks' }
  | { op: 'combat_finalize' }
  | { op: 'enter_room' }
  | { op: 'next_act' }
  | { op: 'start_boon_done' }
  | { op: 'event_option_done'; next: string | null }
  | { op: 'transmute_offer'; uid: number; offers: number; rarity: CardRarity | null; upgrade: boolean }
  /** Shared v2 H4 Reprise: run a played card's effects a second time (dead target → leftmost living enemy). */
  | { op: 'reprise_card'; uid: number; target: EntityRef | null; x: number; onBeat: boolean; depth: number; beatIndex: number }
  /**
   * RULINGS 66: a repeat (or non-play) resolution of a card's effect list (Reprise, Total Eclipse's second
   * run, Answer in Kind's played list). It pays the list's Shard cost again; if that can't be paid in full
   * when the step runs, the whole resolution is skipped (text event). list: 'effects' = def.effects,
   * 'delay' = def.delay.effects.
   */
  /** RULINGS 66/73: every non-play resolution of a card's list (Timeline, Schedule, autoplay, Riposte, repeats) goes through the Shard gate here. */
  | { op: 'repeat_resolution'; uid: number; list: 'effects' | 'delay' | 'riposte'; frame: EffectFrame; why: string }
  /** Shared v2 H6: onHandEndOfTurn listeners (between the in-hand card hooks and the discard). */
  | { op: 'hand_end_relics' };

export type QueueItem =
  | { kind: 'effect'; effect: Effect; frame: EffectFrame }
  /** Moves a resolving card on: played → discard/Scrapheap/Timeline; riposte → discard/Scrapheap/back to rack; timeline → discard/Scrapheap. */
  | {
      kind: 'finish_card';
      uid: number;
      target: EntityRef | null;
      via: 'play' | 'riposte' | 'timeline';
      onBeat: boolean;
      depth: number;
      x: number;
      /** Chronist v2: beat index of the play (stamped onto the Timeline entry). */
      beatIndex?: number;
      /** Chronist v2: via 'timeline' only: the entry was Scheduled (kept if it recurs). */
      scheduled?: boolean;
      /** Chronist v2: via 'timeline' only: how many times it resolved (onDelayResolved fires once per run). Default 1. */
      runs?: number;
      /** Shared v2: via 'timeline' only: the size of the batch it resolved in (onDelayResolved info). */
      batch?: number;
      /** Shared v2 H7: via 'play' only: the effects were not run; the card goes on the Timeline as a scheduled entry with this Delay. */
      delayPlay?: number;
    }
  | { kind: 'step'; step: TurnStep };

export interface PruneSpec {
  bloom: number;
  variant: 'standard' | 'wild' | 'spread' | 'away';
  bonusIf: { type: CardType | CardType[]; bloom: number } | null;
}

export type ChoiceResume =
  | { op: 'discard' }
  | { op: 'exhaust'; from: 'hand' | 'discard' }
  | { op: 'upgrade_combat' }
  | { op: 'upgrade_deck' }
  | { op: 'remove_deck' }
  | { op: 'transform_deck' }
  /** Selected cards from the top of the draw pile are discarded. */
  | { op: 'scry' }
  | { op: 'options'; options: Effect[][]; frame: EffectFrame }
  /** Selected Riposte cards in hand are primed (step: from the end-of-turn prime step, which then fires onPrimed). */
  | { op: 'prime'; step: boolean }
  | { op: 'prune_scrap'; spec: PruneSpec; frame: EffectFrame }
  | { op: 'prune_bloom'; amount: number }
  | { op: 'bloom_pick'; amount: number; where: 'combat' | 'deck' }
  | { op: 'fetch'; from: 'draw' | 'discard' | 'exhaust'; to: 'hand' | 'draw_top' | 'primed'; costThisTurn: number | null; countsAsDraw: boolean }
  | { op: 'transmute_choose'; offers: number; rarity: CardRarity | null; upgrade: boolean }
  | { op: 'transmute_pick'; uid: number; upgrade: boolean }
  | { op: 'offer_pick' }
  | { op: 'duplicate' }
  | { op: 'lose_potion' }
  | { op: 'lose_relic'; ids: RelicId[] }
  /** Full potion slots: choose a held potion to discard for `potion`, or the last option to leave it. */
  | { op: 'potion_swap'; potion: PotionId }
  /** Chronist v2 Schedule: the chosen hand card goes on the Timeline (stamped target). */
  | { op: 'schedule'; turns: number; target: EntityRef | null }
  /** Shared v2: exhaust with a `then` list (scale 'scrapped'). */
  | { op: 'exhaust_then'; from: 'hand' | 'discard'; then: Effect[]; frame: EffectFrame }
  /** Shared v2 Triage: the chosen hand cards are kept this turn; every other non-Keep hand card is Scrapped. */
  | { op: 'triage' }
  /** Shared v2 copy_card: a copy of the chosen hand card is added to the hand. */
  | { op: 'copy_card'; costThisTurn: number | null };

export interface PendingChoice {
  /** cards: pick card uids; options: pick an option index; offers: pick an index into `offers`. */
  kind: 'cards' | 'options' | 'offers';
  prompt: string;
  /** Where the selectable cards live (kind 'cards'). 'deck' = run deck. */
  from: 'hand' | 'draw' | 'discard' | 'exhaust' | 'deck' | null;
  /** Selectable ids: card uids, or indices for 'options' / 'offers'. */
  choices: number[];
  /** For 'options': labels[i] belongs to choices[i]. */
  labels: string[];
  /** For 'offers': the cards on offer (choices are indices into this). */
  offers: CardOffer[];
  /**
   * Single-pick (max <= 1): resolve_choice.uids is [] or one choice. Multi-pick (max > 1): the answer is
   * built one choice at a time with choice_toggle (into `picked`), then resolve_choice confirms it with
   * uids = picked. Enumerating every subset exploded (e.g. 3 of 33 cards is 5,456 answers).
   */
  min: number;
  max: number;
  /** Multi-pick selection so far, in `choices` order (always [] for single-pick choices). */
  picked: number[];
  resume: ChoiceResume;
}

// ---------------------------------------------------------------------------
// Rewards / rooms

export interface CardOffer {
  id: CardId;
  upgraded: boolean;
}

export interface RewardState {
  kind: CombatKind;
  gold: number | null;
  goldTaken: boolean;
  cards: CardOffer[];
  /** 'pending' until the player picks or skips; proceeding with 'pending' counts as a skip (+1 Shard). */
  cardStatus: 'pending' | 'picked' | 'skipped' | 'none';
  potion: PotionId | null;
  potionTaken: boolean;
  relic: RelicId | null;
  relicTaken: boolean;
}

export interface ShopItem<T extends string> {
  id: T;
  price: number;
  sold: boolean;
}

export interface ShopState {
  cards: (ShopItem<CardId> & { upgraded: boolean; sale: boolean })[];
  relics: ShopItem<RelicId>[];
  potions: ShopItem<PotionId>[];
  /** Gold removal price (75 + 25 per previous gold removal). */
  removePrice: number;
  /** Shard removal: 1 Shard + this much gold (no escalation). */
  removeShardGold: number;
  /** The shop's one removal service has been used. */
  removeUsed: boolean;
}

export interface EventState {
  id: EventId;
  /** Current page: null = the event's main options; else a key of EventDef.pages. */
  page: string | null;
  /** Index of the chosen option on the current page once picked. */
  chosen: number | null;
  done: boolean;
}

export interface RestState {
  /** The main rest action has been used. */
  done: boolean;
  /** Extra rest options on offer (global rest options + relic options), index = rest_special index. */
  specials: RestOptionId[];
  /** Side actions used this visit (options that do not use the rest action, e.g. with Shard Crucible). */
  sideUsed: RestOptionId[];
}

export interface TreasureState {
  opened: boolean;
  relic: RelicId | null;
  gold: number;
}

// ---------------------------------------------------------------------------
// History (consumed by the simulator)

export interface FloorRecord {
  floor: number;
  act: Act;
  room: RoomType;
  hpBefore: number;
  hpAfter: number;
  maxHp: number;
  goldBefore: number;
  goldAfter: number;
  encounterId: EncounterId | null;
  enemies: EnemyId[];
  turns: number;
  damageTaken: number;
  /** Enemy HP lost on this floor (hits and HP loss from any source). null: not recorded (a save migrated from engine v1). */
  damageDealt: number | null;
  cardsOffered: CardId[];
  cardPicked: CardId | null;
  cardSkipped: boolean;
  cardsAdded: CardId[];
  cardsRemoved: CardId[];
  cardsUpgraded: CardId[];
  relicsGained: RelicId[];
  potionsGained: PotionId[];
  potionsUsed: PotionId[];
  eventId: EventId | null;
  eventChoice: number | null;
  boonId: BoonId | null;
  deckSize: number;
  shardsGained: number;
  shardsSpent: number;
  /** Cap hits by cap id on this floor (GDD §3; the simulator aggregates them). */
  capHits: Record<string, number>;
}

export interface RunHistory {
  /** floors[0] is the run start (floor 0); then one record per node entered. */
  floors: FloorRecord[];
}

// ---------------------------------------------------------------------------
// Actions and events

export type Action =
  | { type: 'choose_start_boon'; index: number }
  | { type: 'travel'; to: MapPos }
  | { type: 'play_card'; uid: number; target?: number }
  | { type: 'use_potion'; index: number; target?: number }
  | { type: 'end_turn' }
  | { type: 'resolve_choice'; uids: number[] }
  /** Multi-pick choices (max > 1): select / deselect one choice; resolve_choice then confirms `picked`. */
  | { type: 'choice_toggle'; uid: number }
  | { type: 'pick_reward'; kind: 'card' | 'gold' | 'potion' | 'relic'; index?: number }
  | { type: 'skip_reward'; kind: 'card' }
  | { type: 'proceed' }
  | { type: 'shop_buy'; kind: 'card' | 'relic' | 'potion'; index: number }
  | { type: 'shop_remove'; uid: number; pay: 'gold' | 'shard' }
  | { type: 'rest' }
  | { type: 'smith'; uid: number }
  | { type: 'rest_special'; index: number }
  | { type: 'event_choice'; index: number }
  | { type: 'choose_boss_relic'; index: number }
  | { type: 'skip_boss_relic' }
  | { type: 'open_treasure' };

export type CardZone = 'deck' | 'hand' | 'draw' | 'discard';

export type GameEvent =
  | { t: 'phase'; phase: Phase }
  | { t: 'turn_start'; turn: number }
  | { t: 'turn_end' }
  | { t: 'enemy_turn_start' }
  | { t: 'draw'; uids: number[] }
  | { t: 'discard'; uids: number[] }
  | { t: 'exhaust'; uids: number[] }
  | { t: 'shuffle' }
  | { t: 'card_played'; uid: number; cardId: CardId; target?: number; onBeat: boolean }
  | {
      t: 'damage';
      /** 'attack' went through the damage pipeline; 'hp_loss' bypassed it. */
      kind: 'attack' | 'hp_loss';
      source: EntityRef | null;
      target: EntityRef;
      amount: number;
      /** Absorbed by Block. */
      blocked: number;
      /** Absorbed by Guard. */
      guarded: number;
      hpLost: number;
    }
  | { t: 'block'; target: EntityRef; amount: number; pool: 'block' | 'guard' }
  | { t: 'block_lost'; target: EntityRef; amount: number }
  | { t: 'guard_decay'; target: EntityRef; lost: number; now: number }
  /** Breaker v2: Guard spent by a Shed clause (not damage, not halving). */
  | { t: 'guard_shed'; target: EntityRef; amount: number; now: number }
  /** Draw / energy banked for the start of the player's next turn (totals now banked). */
  | { t: 'next_turn_bank'; draw: number; energy: number }
  | { t: 'heal'; target: EntityRef; amount: number }
  | { t: 'max_hp'; delta: number; now: number }
  | { t: 'status'; target: EntityRef; status: StatusId; delta: number; now: number }
  | { t: 'energy'; delta: number; now: number }
  | { t: 'enemy_intent'; uid: number; intent: Intent }
  | { t: 'enemy_forecast'; uid: number; forecast: Intent[] }
  | { t: 'enemy_move'; uid: number; moveId: string; name: string }
  | { t: 'attack_cancelled'; uid: number }
  | { t: 'enemy_spawned'; uid: number; enemyId: EnemyId }
  | { t: 'enemy_transformed'; uid: number; from: EnemyId; to: EnemyId }
  /** aiState.phase changed (boss phases). */
  | { t: 'enemy_phase'; uid: number; phase: number }
  | { t: 'enemy_died'; uid: number }
  | { t: 'enemy_fled'; uid: number }
  | { t: 'player_died' }
  | { t: 'combat_won' }
  | { t: 'card_primed'; uid: number }
  | { t: 'riposte_triggered'; uid: number; attacker: number }
  | { t: 'prime_fizzled'; uid: number }
  | { t: 'timeline_added'; uid: number; dueTurn: number; onBeat: boolean }
  | { t: 'timeline_shifted'; delta: number }
  | { t: 'timeline_resolved'; uid: number }
  /** Chronist v2 Gather: every Timeline entry now resolves on dueTurn. */
  | { t: 'timeline_gathered'; dueTurn: number }
  /** Chronist v2 Quicken: the beat count jumped by delta (now = the beat count after it). */
  | { t: 'beat_shift'; delta: number; now: number }
  /** spill: Graft v2 Spill (RULINGS 51) moved this Bloom here from a card that couldn't hold it. */
  | { t: 'bloom'; uid: number; delta: number; now: number; spill?: true }
  /** Breaker v2: Embers converted at the player's turn start (the Onslaught gain follows as a status event). */
  | { t: 'embers_converted'; amount: number }
  /** Graft v2 Harvest: `rot` Rot was harvested from enemyUid for `loss` HP (emitted after the HP loss). */
  | { t: 'harvest'; enemyUid: number; rot: number; loss: number }
  /** Shared v2 Salvage: a Scrapped card's Salvage is about to resolve. */
  | { t: 'salvage'; cardUid: number }
  /** Shared v2 Reprise: a played card's effects are about to resolve a second time. */
  | { t: 'reprise'; cardUid: number }
  | { t: 'shards'; delta: number; now: number }
  | { t: 'cap_hit'; cap: string }
  | { t: 'relic_trigger'; relic: RelicId }
  | { t: 'relic_gained'; relic: RelicId }
  | { t: 'relic_lost'; relic: RelicId }
  | { t: 'potion_used'; potion: PotionId }
  | { t: 'potion_gained'; potion: PotionId }
  | { t: 'potion_lost'; potion: PotionId }
  | { t: 'gold'; delta: number; now: number }
  | { t: 'card_added'; card: CardInstance; where: CardZone }
  | { t: 'card_removed'; uid: number }
  | { t: 'card_upgraded'; uid: number }
  | { t: 'choice'; prompt: string }
  | { t: 'text'; text: string };

// ---------------------------------------------------------------------------
// Effect DSL

export type TargetSpec =
  /** The chosen target (card/potion target; for enemy moves: the player). */
  | 'target'
  | 'self'
  /** All living opponents of `self`. */
  | 'all_enemies'
  /** A random living opponent of `self` ('misc' stream), re-rolled per hit. */
  | 'random_enemy'
  /** `self` and its living allies. */
  | 'all_allies'
  /** The living opponent with the lowest HP (ties: leftmost). */
  | 'lowest_hp_enemy'
  /** The leftmost living opponent. */
  | 'leftmost_enemy'
  /** Alias of 'target' for Riposte lists and damage-taken triggers (the attacker is the frame target). */
  | 'attacker';

export type AmountScale =
  /** X: energy spent on an X-cost card. */
  | 'x'
  /** Stacks of the status this effect comes from. */
  | 'stacks'
  | 'cards_in_hand'
  | 'cards_in_draw'
  /** Alias of cards_in_draw for enemy moves (ENEMIES §5.7). */
  | 'player_draw_pile'
  | 'cards_in_discard'
  | 'cards_in_exhaust'
  | 'cards_played_this_turn'
  | 'attacks_played_this_turn'
  /** cardsPlayedThisTurn + beatOffset. */
  | 'beat_count'
  | 'enemies_alive'
  /** Block of `self`. */
  | 'block'
  /** Guard of `self`. */
  | 'guard'
  /** Block + Guard of `self`. */
  | 'defence'
  | 'gold'
  | 'shards'
  | 'hp'
  | 'max_hp'
  | 'missing_hp'
  /** Run deck size (incl. cards on the Timeline / primed rack / Scrapheap). */
  | 'deck_size'
  | 'timeline_count'
  /** Chronist v2 Chorus: other cards resolving in the same Timeline batch (preview: entries due on the same turn). */
  | 'chorus'
  /** Chronist v2 Crescendo: which beat this play is (1st/2nd/3rd...), 0 when not on the beat. */
  | 'beat_index'
  | 'primed_count'
  /** Riposte: hits of the triggering attack. */
  | 'trigger_hits'
  /** spend_status: stacks spent. */
  | 'spent'
  /** shed: Guard Shed. */
  | 'shed'
  /** Shared v2: inside an exhaust `then` list: cards actually Scrapped. */
  | 'scrapped'
  /** Shared v2: HP you have Strained this combat (combat.counters.strained). */
  | 'strained_this_combat'
  /** The player's unspent energy right now. */
  | 'energy'
  | 'bloom_cards_in_deck'
  | 'bloom_total_in_deck'
  | 'bloom_max_in_deck'
  /** Total attack damage in the target enemy's forecast (per-hit x hits over forecast entries; hidden = 0). = { forecast_damage: 'target' } */
  | 'forecast_damage'
  /** Total attack damage of the target enemy's current intent (per-hit x hits; 0 if not an attack). = { intent_damage: 'target' } */
  | 'intent_damage'
  /** Rot on the chosen target. */
  | 'rot_on_target'
  /** Status cards in the player's hand + draw + discard (not the Scrapheap). */
  | 'player_status_cards'
  /** HP lost to the best single card this turn (all hits/targets of one play or Timeline resolution). */
  | 'best_card_damage_this_turn'
  /** 1 if this enemy's current attack triggered (or, in a preview, will trigger) a Riposte. */
  | 'triggered_riposte'
  | { status: StatusId; of?: 'self' | 'target' }
  /** A var on the source card instance (CardInstance.vars), e.g. 'bloom'. Missing = 0. */
  | { cardVar: string }
  /** The source enemy's aiState[key]. Missing = 0. */
  | { ai: string }
  /** RULINGS 27: forecast / current-intent attack damage of the target, or summed over all living enemies. */
  | { forecast_damage: 'target' | 'all' }
  | { intent_damage: 'target' | 'all' }
  /** def.amounts[fn](ctx) on the source definition. */
  | { fn: string };

/** value = floor(base + per * scale)  (base defaults to 0, per to 1). 'X' is shorthand for { scale: 'x' }. */
export interface ScaledAmount {
  base?: number;
  per?: number;
  scale: AmountScale;
}

export type Amount = number | 'X' | ScaledAmount;

export type CompareOp = '>=' | '<=' | '>' | '<' | '==' | '!=';

export type Condition =
  | { type: 'has_status'; who: 'self' | 'target'; id: StatusId; min?: number }
  | { type: 'target_intends_attack' }
  /** True when the chosen target is dead (use after a damage effect for "if this kills"). */
  | { type: 'target_dead' }
  | { type: 'hp_below_pct'; who: 'self' | 'target'; pct: number }
  | { type: 'compare'; left: Amount; op: CompareOp; right: Amount }
  /** The current play / stamped Timeline entry is on the beat. */
  | { type: 'on_beat' }
  /** depth 0 = current intent, 1 = the intent after next (forecast[0]), ... */
  | { type: 'forecast_is_attack'; who: 'target' | 'any' | 'all'; depth: number }
  /** The last Prune this combat Scrapped a card of this type. */
  | { type: 'pruned_type'; cardType: CardType | CardType[] }
  | { type: 'timeline_nonempty' }
  /** The source card's run-deck copy is gone (after `remove_card {self}`; false if a cap stopped the removal). */
  | { type: 'removed_self' }
  | { type: 'is_class'; cls: ClassId }
  /** Graft v2: the source card is Ripe (effective Bloom >= TUNING.bloomRipe). */
  | { type: 'ripe' }
  | { type: 'not'; cond: Condition }
  | { type: 'all'; conds: Condition[] }
  | { type: 'any'; conds: Condition[] }
  | { type: 'fn'; fn: string };

export interface ChooseOption {
  /** Template (values from this option's effects). */
  label: string;
  effects: Effect[];
  /** Option is only offered when this holds. */
  if?: Condition;
}

/** Filter over card definitions. All given fields must match. */
export interface CardFilter {
  type?: CardType | CardType[];
  keyword?: Keyword | Keyword[];
  rarity?: CardRarity | CardRarity[];
  tag?: string;
  /** Has a `delay` block / a `riposte` list. */
  delay?: boolean;
  riposte?: boolean;
  /** Shared v2: has none of these keywords (e.g. not Keep cards). */
  notKeyword?: Keyword | Keyword[];
  /** Shared v2 (Trellis): is Ripe. Needs the card instance, so only fetch_card honours it; matchesFilter throws. */
  ripe?: boolean;
}

export interface GambleOutcome {
  weight: number;
  effects: Effect[];
  /** Short result text emitted as a `text` event. */
  label?: string;
}

/** `key` overrides the text placeholder name for the effect's value (see text.ts). */
export type Effect =
  /** perTarget (Chronist v2): with several targets, resolve `amount` once per hit enemy, with it as the frame target. */
  | { type: 'damage'; amount: Amount; times?: Amount; target: TargetSpec; ignoreBlock?: boolean; tags?: string[]; key?: string; perTarget?: boolean }
  | { type: 'block'; amount: Amount; target?: 'self' | 'all_allies'; key?: string }
  | { type: 'guard'; amount: Amount; target?: 'self' | 'all_allies'; key?: string }
  /** nextTurn: bank the draw for the start of the player's next turn (draws outside the player's turn always bank). */
  | { type: 'draw'; n: Amount; nextTurn?: boolean; key?: string }
  /** Exactly one of random / choose / all. */
  | { type: 'discard'; n?: Amount; random?: boolean; choose?: boolean; all?: boolean; key?: string }
  /** Exactly one of random / choose / all / self (self = this card from hand, e.g. a status card's own hook). */
  | {
      type: 'exhaust';
      n?: Amount;
      from: 'hand' | 'discard';
      random?: boolean;
      choose?: boolean;
      all?: boolean;
      self?: boolean;
      /** Shared v2: only cards matching this filter are candidates (random / choose / all). */
      filter?: CardFilter;
      /** Shared v2: with choose, the player may Scrap fewer (min 0). */
      upTo?: boolean;
      /** Shared v2: run after the Scrap with scale 'scrapped' = cards actually Scrapped (Strip for Parts, Kiln Salts). */
      then?: Effect[];
      key?: string;
    }
  /** nextTurn: bank the energy for the player's next turn (gains outside the player's turn always bank). */
  | { type: 'energy'; n: Amount; nextTurn?: boolean; key?: string }
  /** perTarget (shared v2, like damage's): with several targets, resolve `amount` once per target, with it as the frame target. */
  | { type: 'status'; target: TargetSpec; id: StatusId; amount: Amount; key?: string; perTarget?: boolean }
  | { type: 'heal'; amount: Amount; target?: TargetSpec; key?: string }
  | { type: 'lose_hp'; amount: Amount; target?: TargetSpec; key?: string }
  | { type: 'max_hp'; amount: Amount; key?: string }
  | {
      type: 'add_card';
      card: CardId;
      to: 'hand' | 'draw' | 'discard' | 'deck';
      n?: Amount;
      upgraded?: boolean;
      costThisTurn?: number;
      /** For 'draw': default 'random'. */
      position?: 'top' | 'random';
      /** Graft v2 (Propagate): only with to 'deck': the new deck copy starts with this much Bloom (clamped to its cap). */
      bloom?: Amount;
      key?: string;
    }
  /** 'hand' + choose: pick; 'hand' without choose: random upgradable; 'all_hand': all; 'deck' (permanent): choose or random. */
  | { type: 'upgrade'; where: 'hand' | 'all_hand' | 'deck'; choose?: boolean; n?: Amount; filter?: CardFilter; key?: string }
  /** Look at the top n of the draw pile; discard any of them. */
  | { type: 'scry'; n: Amount; key?: string }
  | { type: 'gold'; amount: Amount; key?: string }
  /**
   * Permanent deck removal. Exactly one of choose / random / all / self (self = the source card's deck copy).
   * from 'hand' (combat, with choose): pick a hand card that is a deck card; it is Scrapped and its deck copy removed.
   * Bound cards are skipped unless allowBound. In combat every removal counts toward cap_prune_away (RULINGS 7).
   */
  | {
      type: 'remove_card';
      n?: Amount;
      choose?: boolean;
      random?: boolean;
      all?: boolean;
      self?: boolean;
      from?: 'deck' | 'hand';
      filter?: CardFilter;
      allowBound?: boolean;
      key?: string;
    }
  /** Permanent: replace with a random card of the class pool (STS transform). Exactly one of choose / random. */
  | { type: 'transform_card'; n?: Amount; choose?: boolean; random?: boolean; key?: string }
  /** Specific relic, or a random one of `rarity` (default: rolled with TUNING.relicRarityOdds). */
  | { type: 'gain_relic'; id?: RelicId; rarity?: RelicRarity }
  /** Specific potion, or random. With full slots the player chooses one to discard (or leaves it). */
  | { type: 'gain_potion'; id?: PotionId }
  | { type: 'potion_slots'; n: number }
  | { type: 'choose'; prompt: string; options: ChooseOption[] }
  | { type: 'repeat'; times: Amount; effects: Effect[]; key?: string }
  | { type: 'conditional'; if: Condition; then: Effect[]; else?: Effect[] }
  /** Named function in the source def's `custom` table. Last resort; must be unit-tested. */
  | { type: 'custom'; fn: string }
  // --- GDD §9.8
  /** n: if self has >= n stacks, lose n and run effects (else skip). 'all': lose all and run effects, even with 0 (RULINGS 33). Scale 'spent' = stacks lost. */
  | { type: 'spend_status'; id: StatusId; n: number | 'all'; effects: Effect[]; key?: string }
  /**
   * Breaker v2 Shed (player only). n: if your Guard >= n, lose n Guard and run effects, else skip.
   * 'all': lose all your Guard and run effects, even with 0. Scale 'shed' = Guard lost. A Shed of
   * more than 0 emits guard_shed and fires onGuardShed. Not damage and not halving.
   */
  | { type: 'shed'; n: number | 'all'; effects: Effect[]; key?: string }
  /** Bloom (GDD §2.4): grow Bloom cards. Capped per copy (TUNING.caps.bloom, bloomCap modifier). */
  | {
      type: 'bloom';
      amount: Amount;
      target: 'choose_hand' | 'random_bloom_in_piles' | 'all_hand' | 'self' | 'min_in_deck' | 'max_in_deck' | 'choose_deck';
      key?: string;
    }
  /** Prune (GDD §2.5): two-step choice (Scrap another card from hand, then a Bloom card gains `bloom`). */
  | { type: 'prune'; bloom?: number; variant?: 'standard' | 'wild' | 'spread' | 'away'; bonusIf?: { type: CardType | CardType[]; bloom: number }; key?: string }
  /** Timeline entries resolve n turns sooner (cap TUNING.caps.advancePerTurn per turn); due entries resolve at once. */
  | { type: 'advance'; n: number; key?: string }
  /** Timeline entries resolve n turns later (max 3). */
  | { type: 'postpone'; n: number; key?: string }
  /** Runs effects only if this play is on the beat (repeated per the onBeatRepeats modifier). */
  | { type: 'on_beat'; effects: Effect[] }
  /** Move cards between zones. select 'max_bloom'/'min_bloom' ties break randomly ('misc'). */
  | {
      type: 'fetch_card';
      from: 'draw' | 'discard' | 'exhaust';
      /** max_cost (shared v2): highest printed numeric cost (X and unplayable count as 0); ties random ('misc'). */
      select: 'top' | 'random' | 'choose' | 'max_bloom' | 'min_bloom' | 'max_cost';
      to: 'hand' | 'draw_top' | 'primed';
      n?: Amount;
      /** With select 'choose': allow choosing fewer (min 0). */
      upTo?: boolean;
      filter?: CardFilter;
      costThisTurn?: number;
      /** Counts toward cap_draw instead of cap_to_hand. */
      countsAsDraw?: boolean;
      /** Graft v2: only this card instance is a candidate (Perennial, Second Flush). */
      uid?: number;
      key?: string;
    }
  /**
   * Graft v2 Harvest N: each target loses HP equal to mult × its Rot, then (if alive) its Rot is halved,
   * round down. HP loss: no hit, Block/Guard don't help. A kill spreads the full stack (RULINGS 53).
   */
  | { type: 'harvest'; mult: Amount; target: TargetSpec; key?: string }
  /** Shards (run currency, cap TUNING.shards.cap). Negative spends; going below 0 throws (gate with `available`). */
  | { type: 'shards'; amount: Amount; key?: string }
  /** Transmute (GDD §4.8): choose deck card(s), then pick 1 of `offers` same-rarity class cards for each. */
  | { type: 'transmute'; offers?: number; n?: number; upTo?: boolean; rarity?: CardRarity; upgrade?: boolean; key?: string }
  /** Show n distinct cards; the player picks 1 into the deck. */
  | {
      type: 'offer_cards';
      pool: 'class' | 'colorless';
      rarity?: 'common' | 'uncommon' | 'rare' | ('common' | 'uncommon' | 'rare')[];
      n: number;
      upgraded?: boolean;
      key?: string;
    }
  /** Choose a deck card (or, in combat, a hand card that is a deck card); add a run-deck copy at 0 Bloom. */
  | { type: 'duplicate_card'; from?: 'deck' | 'hand'; filter?: CardFilter }
  | { type: 'lose_potion' }
  | { type: 'lose_relic'; notStarter?: boolean }
  /** Event combat: fight `encounterId`; event-combat rewards, then `onWin` effects, then the map. */
  | { type: 'start_combat'; encounterId: EncounterId; onWin?: Effect[] }
  /** Weighted roll on the 'event' stream. Text values: {gamble_1}, {gamble_2}, ... = percent per outcome. */
  | { type: 'gamble'; outcomes: GambleOutcome[] }
  /** player.counters[key] += delta. */
  | { type: 'run_flag'; key: string; delta: number }
  /** Play cards for free at depth + 1 (from the top of the draw pile, or a random hand card). */
  | { type: 'autoplay'; from: 'draw' | 'hand'; n?: Amount; key?: string }
  // --- Shared v2 (docs/v2/shared-design.md §7)
  /**
   * Strain N (H1): the player loses N HP (not a hit; Block and Guard don't help), but never below 1 HP
   * (RULINGS 62). Adds the HP actually lost to combat.counters.strained and fires onStrain when > 0.
   */
  | { type: 'strain'; amount: Amount; key?: string }
  /** Triage (H6): choose up to `keep` hand cards (not Keep cards) to keep this turn; every other non-Keep hand card is Scrapped. */
  | { type: 'triage'; keep: number; key?: string }
  /** H17: choose a card in hand; a combat-only copy of it is added to your hand (cap_to_hand), costing costThisTurn this turn. */
  | { type: 'copy_card'; costThisTurn?: number; key?: string }
  /** H19: n random cards from the class (or colourless) reward pool, filtered; combat-only created cards (to hand: cap_to_hand). */
  | { type: 'add_random_card'; pool: 'class' | 'colorless'; filter?: CardFilter; to: 'hand' | 'draw' | 'discard'; n?: Amount; costThisTurn?: number; key?: string }
  // --- ENEMIES §5
  /** Summon minions led by self (appended; they act from the next enemy phase). n, or fillTo living of this id; cap = max living minions of self. */
  | { type: 'summon'; enemy: EnemyId; n?: number; fillTo?: number; cap?: number; withLeader?: 'die' | 'flee' }
  /** Self becomes `into` (same uid/position), full HP of the new form, new intent. */
  | { type: 'transform'; into: EnemyId }
  /** Advance each target's AI rng by one draw, then recompute forecasts. */
  | { type: 'reroll_forecast'; target: 'other_enemies' | 'all_enemies' }
  /** Self enemy's aiState[key] += delta (or = set). For move escalation. */
  | { type: 'ai_state'; key: string; delta?: number; set?: number }
  /** RULINGS 8: apply `halted 1` (the enemy skips its next move, then chooses normally). Bosses are immune. */
  | { type: 'halt_enemy'; target: TargetSpec }
  /** Lose Block / Guard / both (amount or 'all'). */
  | { type: 'lose_defence'; pool: 'block' | 'guard' | 'both'; amount: Amount | 'all'; key?: string }
  /** Lose Guard: an amount, half (round down), or all. */
  | { type: 'lose_guard'; amount: Amount | 'half' | 'all'; key?: string }
  /** Prime up to n Riposte cards from hand now, beyond this turn's capacity (choice, min 0, when more than n are in hand; the rack holds at most TUNING.caps.primeCapacity). */
  | { type: 'prime'; n?: number }
  /** Cancel the enemy attack currently being declared (Riposte lists / onEnemyAttackDeclared only). */
  | { type: 'cancel_attack' }
  // --- Chronist v2
  /** Gather: every Timeline entry's dueTurn becomes the latest dueTurn (only ever delays). */
  | { type: 'gather' }
  /** Quicken n: add n (>= 1) to this turn's beat count (combat.counters.beatOffset). Not a play. */
  | { type: 'quicken'; n: number; key?: string }
  /** Schedule: choose a hand Attack/Skill without Delay (numeric cost, playable) and put it on the Timeline for `turns`; it resolves its `effects` for free. */
  | { type: 'schedule'; turns: number; key?: string };

export type EffectType = Effect['type'];

// ---------------------------------------------------------------------------
// Hook contexts

/** Read-only view. Hooks must not mutate state through a ReadCtx. */
export interface ReadCtx {
  readonly state: RunState;
  readonly combat: CombatState | null;
}

/** Cadence helper on contexts: the next counted play's beat position (throws outside combat). */
export interface BeatInfo {
  /** Beat count the next counted play would have. */
  readonly count: number;
  readonly onBeat: boolean;
  /** Beat positions after modifiers (TUNING.cadence.beats + beatPositions hooks). */
  readonly positions: readonly number[];
}

export interface AmountCtx extends ReadCtx {
  readonly frame: EffectFrame;
  readonly preview: boolean;
  nextBeat(): BeatInfo;
}

/** Context for event-style hooks (may change state through the helpers). */
export interface HookCtx extends ReadCtx {
  /** The definition this hook belongs to. */
  readonly source: EffectSource;
  /** Entity holding the status / 'player' for relics and cards / enemy uid for enemy defs. */
  readonly owner: EntityRef;
  /** Stacks of the status (status hooks only, else 0). */
  readonly stacks: number;
  /** The relic's state (relic hooks only). */
  readonly relic: RelicState | null;
  readonly rng: RngApi;
  emit(e: GameEvent): void;
  /** Enqueue effects to run right after the current item (source = this def, self = owner). */
  queue(effects: Effect[], opts?: { target?: EntityRef | null }): void;
  /** Run effects immediately (synchronously). Effects that need a player choice throw here. */
  now(effects: Effect[], opts?: { target?: EntityRef | null }): void;
  /** Emit relic_trigger for this relic (no-op for non-relic sources). */
  flash(): void;
  nextBeat(): BeatInfo;
  /**
   * Replace the owner enemy's current intent (ENEMIES §5.4: only for the telegraphed overrides).
   * Throws if the owner is not a living enemy or the move does not exist.
   */
  setIntent(moveId: string): void;
  /** Graft v2: is this Bloom card Ripe right now (effective Bloom >= TUNING.bloomRipe)? */
  isRipe(card: CardInstance): boolean;
}

/** Context for `custom` effect functions. */
export interface EffectCtx extends HookCtx {
  readonly frame: EffectFrame;
  readonly card: CardInstance | null;
}

/** Pure context for modifier hooks: no emit/queue/rng. Called for previews too. */
export interface ModifierCtx extends ReadCtx {
  readonly source: EffectSource;
  readonly owner: EntityRef;
  readonly stacks: number;
  readonly relic: RelicState | null;
  readonly preview: boolean;
  /** Beat info for the next play (combat only); lets cost modifiers ask "would the next play be on the beat?". */
  nextBeat(): BeatInfo;
}

/**
 * Enemy AI context. PURITY CONTRACT (GDD §2.9): chooseMove is a pure function of this context only.
 * There is deliberately no access to player state. `self` is a frozen snapshot: mutating it throws.
 * Change aiState from move effects (`ai_state`) or hooks instead.
 */
export interface EnemyAiCtx {
  readonly self: Readonly<EnemyState>;
  /** The round in which the chosen move will be used (1 = the first enemy phase of the combat). */
  readonly forTurn: number;
  /** Same as forTurn (v1 name). */
  readonly turn: number;
  /** Moves this enemy has used (plus planned moves when computing the forecast), oldest first. */
  readonly history: readonly string[];
  readonly aiState: Readonly<Record<string, number>>;
  /** Living allies (excluding self), list order. HP is deliberately not exposed. */
  readonly allies: readonly { readonly uid: number; readonly id: EnemyId }[];
  /** The enemy's own rng stream (a clone when computing the forecast). */
  readonly rng: SingleRng;
  lastMove(): string | null;
  /** How many times `moveId` was used consecutively at the end of history. */
  timesInARow(moveId: string): number;
  /** Living allies with this id (any id when omitted). */
  alliesAlive(id?: EnemyId): number;
}

export interface CardReadCtx extends ReadCtx {
  readonly card: CardInstance;
  nextBeat(): BeatInfo;
  /** Graft v2: is this card Ripe right now (effective Bloom >= TUNING.bloomRipe)? */
  isRipe(): boolean;
}

// ---------------------------------------------------------------------------
// Hook signatures

export interface DamageInfo {
  readonly source: EntityRef | null;
  readonly target: EntityRef | null;
  readonly card: CardInstance | null;
  /** Includes 'delayed' for Timeline resolutions and 'riposte' for Riposte triggers. */
  readonly tags: readonly string[];
}

export interface BlockInfo {
  readonly pool: 'block' | 'guard';
  readonly tags: readonly string[];
}

export interface DamageResult {
  readonly source: EntityRef | null;
  readonly target: EntityRef;
  readonly card: CardInstance | null;
  readonly tags: readonly string[];
  readonly amount: number;
  readonly blocked: number;
  readonly guarded: number;
  readonly hpLost: number;
  /** Shared v2 H5: damage the attacker's Stagger removed from this hit (pipeline step 4). */
  readonly staggerPrevented: number;
}

export interface CardPlayedInfo {
  readonly card: CardInstance;
  readonly def: CardDef;
  readonly target: EntityRef | null;
  readonly onBeat: boolean;
  readonly depth: number;
  /** X of the play (X-cost cards: energy spent + Reserve; others 0). Shared v2 H12. */
  readonly x: number;
}

/** Shared v2 H4: what grantsReprise sees about a play (at pay-cost time, before its effects). */
export interface RepriseInfo extends CardPlayedInfo {
  /** Energy actually paid (X cards: X). Free plays: 0. */
  readonly costPaid: number;
  /** The hand was empty once this card left it (Echo Bell). */
  readonly handEmpty: boolean;
}

export type NoInfo = Record<string, never>;

/** Event-style hooks and the info each receives. Dispatch order is documented in src/engine/statuses.ts. */
export interface HookInfoMap {
  onCombatStart: NoInfo;
  onCombatEnd: { readonly won: boolean; readonly kind: CombatKind; readonly turn: number };
  onTurnStart: NoInfo;
  onTurnEnd: NoInfo;
  onCardPlayed: CardPlayedInfo;
  afterCardPlayed: CardPlayedInfo;
  onCardExhausted: { readonly card: CardInstance };
  onCardDrawn: { readonly card: CardInstance };
  /** A card put into hand by an effect (not a draw). */
  onCardToHand: { readonly card: CardInstance };
  onDamageDealt: DamageResult;
  onDamageTaken: DamageResult;
  onHpLost: { readonly amount: number; readonly source: EntityRef | null; readonly fromHit: boolean };
  onBlockGained: { readonly amount: number; readonly pool: 'block' | 'guard' };
  onGuardDecay: { readonly lost: number };
  /** Guard absorbed part of a hit on this entity. */
  onGuardAbsorbed: { readonly amount: number; readonly source: EntityRef | null };
  onShuffle: NoInfo;
  onEnemyDied: { readonly uid: number; readonly enemyId: EnemyId; readonly statuses: Readonly<StatusMap> };
  /** Fires for the dying entity (its statuses first) before its statuses are cleared. */
  onDeath: NoInfo;
  /** Any stack change on the entity (apply, decay, removal); delta may be negative. */
  onStatusChanged: { readonly target: EntityRef; readonly id: StatusId; readonly delta: number };
  /** Chronist v2 (player-scoped): a player-sourced `status` effect raised an enemy's stacks by `amount` (> 0). Trigger target = that enemy. */
  onStatusInflicted: { readonly target: number; readonly id: StatusId; readonly amount: number };
  onEnemySpawn: { readonly uid: number };
  onEnemyAttackDeclared: { readonly uid: number; readonly intent: Intent };
  onRiposteTriggered: { readonly card: CardInstance; readonly attacker: number };
  onPrimed: { readonly count: number };
  onEnemyMoveEnd: { readonly uid: number; readonly moveId: string; readonly wasAttack: boolean; readonly hpLostThisMove: number };
  onPrune: { readonly scrapped: CardInstance };
  onBloomGained: { readonly card: CardInstance; readonly delta: number };
  /** Graft v2: a copy's real Bloom reached TUNING.bloomRipe (fires once per crossing). */
  onRipe: { readonly card: CardInstance };
  /** Graft v2: a Harvest resolved on an enemy that had Rot. rot = the stack before halving. */
  onHarvest: { readonly uid: number; readonly rot: number; readonly hpLost: number };
  /** batch = entries resolving in the same Timeline batch (turn start, or one Advance); shared v2 Astrolabe. */
  onDelayResolved: { readonly card: CardInstance; readonly batch: number };
  // --- Shared v2 (docs/v2/shared-design.md §7)
  /** H1: the player Strained (amount = HP actually lost, > 0). */
  onStrain: { readonly amount: number };
  /** H10: a primed card fizzled at player turn start step 2. */
  onPrimeFizzled: { readonly card: CardInstance };
  /** H9: the player's Block reset at turn start (lost = Block removed, > 0). */
  onBlockReset: { readonly lost: number };
  /** H6: player turn end, after the prime step and the in-hand card hooks, before the hand is discarded. */
  onHandEndOfTurn: NoInfo;
  /** H20: an enemy's attack was cancelled (it died to a Riposte, or cancel_attack). */
  onAttackCancelled: { readonly uid: number };
  /** H20: a halted enemy skipped its move. */
  onMoveSkipped: { readonly uid: number };
  /** onBeat = the entry's stamped on-beat flag (also stamped on trigger frames, so `on_beat` works). */
  onTimelineAdd: { readonly entry: TimelineEntry; readonly onBeat: boolean };
  onPotionUsed: { readonly potion: PotionId };
  /** Breaker v2: a spend_status removed `amount` (> 0) stacks of `id` from this entity. */
  onStatusSpent: { readonly id: StatusId; readonly amount: number };
  /** Breaker v2: the player Shed `amount` (> 0) Guard. */
  onGuardShed: { readonly amount: number };
  // run-level (relics; player statuses only exist in combat)
  onPickup: NoInfo;
  onRest: { readonly action: 'rest' | 'smith' | RestOptionId; readonly uid: number | null };
  onShopEnter: NoInfo;
  onFloorEnter: NoInfo;
  onActStart: NoInfo;
  onGoldGain: { readonly amount: number };
  onShardGain: { readonly amount: number };
  onRewardSkipped: NoInfo;
  onCardAdded: { readonly card: CardInstance; readonly source: 'reward' | 'shop' | 'event' | 'other' };
}

export type HookName = keyof HookInfoMap;

export type EventHooks = {
  [K in HookName]?: (ctx: HookCtx, info: HookInfoMap[K]) => void;
};

/** Declarative triggers: effects queued when the hook fires (also feed text values). */
export type Triggers = { [K in HookName]?: Effect[] };

/** Pure modifier hooks. See statuses.ts for which entity's listeners each one visits. */
export interface ModifierHooks {
  /** Flat bonus added to damage dealt by the owner (pipeline step 2). */
  damageDealtFlat?(ctx: ModifierCtx, info: DamageInfo): number;
  /** Percent multiplier on damage dealt by the owner (step 3). */
  damageDealtMult?(ctx: ModifierCtx, info: DamageInfo): number;
  /** Percent multiplier on damage taken by the owner (step 3). */
  damageTakenMult?(ctx: ModifierCtx, info: DamageInfo): number;
  /** Flat bonus to damage taken by the owner per hit, in step 4 with Exposed (e.g. a soft-underbelly passive). */
  damageTakenFlat?(ctx: ModifierCtx, info: DamageInfo): number;
  /** Attacker side: damage per Exposed stack on the target (default 1; Fracture Engine 2 for player hits). */
  exposedPerStack?(ctx: ModifierCtx, perStack: number, info: DamageInfo): number;
  /** Final adjustment to damage taken by the owner, step 5. */
  modifyDamageTaken?(ctx: ModifierCtx, amount: number, info: DamageInfo): number;
  /** Step 7: HP the owner actually loses from a hit (e.g. deferred damage). */
  modifyHpLoss?(ctx: ModifierCtx, amount: number, info: DamageInfo): number;
  /** Flat bonus to Block AND Guard gained by the owner. */
  blockFlat?(ctx: ModifierCtx, info: BlockInfo): number;
  /** Flat bonus to Guard gained by the owner only. */
  guardFlat?(ctx: ModifierCtx, info: BlockInfo): number;
  /** Percent multiplier on Block and Guard gained by the owner. */
  blockMult?(ctx: ModifierCtx, info: BlockInfo): number;
  /** Player: modify a card's cost. */
  modifyCardCost?(ctx: ModifierCtx, card: CardInstance, cost: number): number;
  /** Block the owner keeps when its block would reset (max over all hooks; default 0). */
  keepBlock?(ctx: ModifierCtx, block: number): number;
  /** Guard lost at the owner's turn start (default guard - floor(guard / 2)). */
  guardDecay?(ctx: ModifierCtx, guard: number, lost: number): number;
  /** Stacks kept when a status decays (max over hooks, never more than current). Onslaught banking. */
  keepStatus?(ctx: ModifierCtx, id: StatusId, stacks: number): number;
  /** Status stack cap for `target` (visited on the target's and the player's listeners). */
  modifyStatusCap?(ctx: ModifierCtx, id: StatusId, cap: number, target: EntityRef): number;
  /** Adjust an incoming status application on the owner (Artifact-like negation: return 0). */
  modifyStatusApplied?(ctx: ModifierCtx, id: StatusId, amount: number): number;
  /** Adjust healing received by the owner. */
  modifyHeal?(ctx: ModifierCtx, amount: number): number;
  // player-side rules
  bloomCap?(ctx: ModifierCtx, card: CardInstance, cap: number): number;
  modifyPruneBloom?(ctx: ModifierCtx, amount: number, scrapped: CardInstance): number;
  /** Graft v2 (Clear-Cut): how many cards one Prune may Scrap (max over hooks; default 1). */
  pruneScrapMax?(ctx: ModifierCtx, max: number): number;
  /**
   * Graft v2 (Rootstock): the Bloom a card's numbers and Ripe use (max over hooks; default its own Bloom).
   * deckMax = the highest real Bloom in your deck. Growth, caps, Spill and deck counts always use real Bloom.
   */
  effectiveBloom?(ctx: ModifierCtx, card: CardInstance, bloom: number, deckMax: number): number;
  beatPositions?(ctx: ModifierCtx, positions: readonly number[]): number[];
  onBeatRepeats?(ctx: ModifierCtx, card: CardInstance | null, repeats: number): number;
  /** Chronist v2: how many times a Timeline entry resolves, given its batch size (default 1; the engine clamps to 1..2). Total Eclipse. */
  timelineResolutions?(ctx: ModifierCtx, batch: number, entry: TimelineEntry, runs: number): number;
  /** Chronist v2: a non-Scrap card that just resolved from the Timeline goes back on it with this Delay instead of to its pile (null = no). First non-null wins. Eternal Return. */
  recurDelay?(ctx: ModifierCtx, card: CardInstance, recursThisTurn: number): number | null;
  primeCapacity?(ctx: ModifierCtx, capacity: number): number;
  primeCharges?(ctx: ModifierCtx, card: CardInstance, charges: number): number;
  /** Breaker v2 (Answer in Kind): when this primed card fires, also resolve its played `effects` (true from any hook). */
  riposteResolvesPlayed?(ctx: ModifierCtx, card: CardInstance): boolean;
  /** Breaker v2 (Crazing): stacks an enemy keeps when its status decays (player listeners; max with the enemy's keepStatus). */
  keepEnemyStatus?(ctx: ModifierCtx, enemyUid: number, id: StatusId, stacks: number): number;
  forecastDepth?(ctx: ModifierCtx, depth: number): number;
  maxEnergy?(ctx: ModifierCtx, energy: number): number;
  drawPerTurn?(ctx: ModifierCtx, n: number): number;
  handLimit?(ctx: ModifierCtx, n: number): number;
  /** true: enemies take a full turn before your first turn (Cracked Hourglass). */
  enemiesActFirst?(ctx: ModifierCtx): boolean;
  // run-level rules (relics)
  canSkipCardReward?(ctx: ModifierCtx): boolean;
  skipShards?(ctx: ModifierCtx, shards: number): number;
  /** Fixed rarities for a card reward screen (Void Compass), or null to roll. */
  cardRewardRarities?(ctx: ModifierCtx, kind: CombatKind): ('common' | 'uncommon' | 'rare')[] | null;
  modifyShopPrice?(ctx: ModifierCtx, item: 'card' | 'relic' | 'potion' | 'remove_gold' | 'remove_shard_gold', price: number): number;
  /** true: a Shard removal does not use the shop's removal service (Shard Writ). */
  shardRemovalKeepsService?(ctx: ModifierCtx): boolean;
  restOptionCost?(ctx: ModifierCtx, id: RestOptionId, shards: number): number;
  /** true: this rest option does not use the rest action (once per visit; Shard Crucible). */
  restSideAction?(ctx: ModifierCtx, id: RestOptionId): boolean;
  // --- Shared v2 (docs/v2/shared-design.md §7)
  /** H4: this play has Reprise (its effects resolve twice). OR over listeners. */
  grantsReprise?(ctx: ModifierCtx, info: RepriseInfo): boolean;
  /**
   * H7: turns to Delay this play's effects onto the Timeline as a scheduled entry (0 = resolve now; max over
   * listeners). Asked only for non-Power, non-Delay cards played from hand; eligibleIndex = how many such
   * plays came before it this turn (Cracked Hourglass uses 0).
   */
  delayPlay?(ctx: ModifierCtx, info: CardPlayedInfo, eligibleIndex: number): number;
  /** H8: card rewards offer one card from each listed class instead of the class pool (first non-null wins). */
  cardRewardClasses?(ctx: ModifierCtx, kind: CombatKind): ClassId[] | null;
  /** H8: this card reward also offers one colourless card. */
  extraColorlessOffer?(ctx: ModifierCtx, kind: CombatKind): boolean;
  /** H13: a reason string makes this rest option unavailable (null = no objection). */
  restOptionBlocked?(ctx: ModifierCtx, id: RestOptionId): string | null;
  /** H21: added to the 'beat_index' scale when the play is on the beat (Conductor's Baton). Summed. */
  beatIndexBonus?(ctx: ModifierCtx): number;
  /** H22: where a card that resolved from the Timeline goes instead of the discard pile (null = no change; first non-null wins). */
  timelineDestination?(ctx: ModifierCtx, card: CardInstance): 'draw_bottom' | null;
}

export type Hooks = EventHooks & ModifierHooks;

/** Optional named functions referenced by the DSL from a definition. */
export interface DslTables {
  custom?: Record<string, (ctx: EffectCtx) => void>;
  amounts?: Record<string, (ctx: AmountCtx) => number>;
  conditions?: Record<string, (ctx: AmountCtx) => boolean>;
  /** Extra named numbers for text templates (and for hooks to read, so text never drifts). */
  values?: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Content definitions

export type CardType = 'attack' | 'skill' | 'power' | 'status' | 'curse';
export type CardRarity = 'starter' | 'common' | 'uncommon' | 'rare' | 'special';
export type CardTarget = 'enemy' | 'all_enemies' | 'self' | 'none';
/** exhaust = Scrap, innate = Opening, retain = Keep. riposte/bloom/delay are display keywords; Prune is a tag (RULINGS 23). */
export type Keyword = 'exhaust' | 'ethereal' | 'innate' | 'retain' | 'unplayable' | 'riposte' | 'bloom' | 'delay';

export interface CardHooks {
  onDraw?(ctx: EffectCtx): void;
  onDiscard?(ctx: EffectCtx): void;
  onExhaust?(ctx: EffectCtx): void;
  onRetain?(ctx: EffectCtx): void;
  /** Fires at end of the player's turn while the card is in hand (after the prime step). */
  onTurnEndInHand?(ctx: EffectCtx): void;
  /** Returns the new cost given the current cost. */
  costModifier?(ctx: CardReadCtx, cost: number): number;
  /** true/false or a reason string (= not playable). */
  canPlay?(ctx: CardReadCtx): boolean | string;
  /** Player modifier hooks active while this card is in hand (Tangle, Seized Joint, Vacuum Chill). ctx.source is this card. */
  handModifiers?: ModifierHooks;
}

export interface CardDef extends DslTables {
  id: CardId;
  name: string;
  cls: ClassId | 'colorless' | 'curse' | 'status';
  type: CardType;
  rarity: CardRarity;
  /** null = unplayable. */
  cost: number | 'X' | null;
  target: CardTarget;
  keywords?: Keyword[];
  /** Template; see src/engine/text.ts for placeholder names. */
  text: string;
  effects: Effect[];
  /** Riposte (GDD §2.2): effects when it fires from the primed rack (target = the attacker). */
  riposte?: Effect[];
  /** Delay (GDD §2.8): after `effects`, the card goes onto the Timeline; `delay.effects` resolve `turns` later. */
  delay?: { turns: 1 | 2 | 3; effects: Effect[] };
  /** Salvage (shared v2 H2): effects that run whenever this card is Scrapped in combat, from any source (not a play). */
  salvage?: Effect[];
  /** Bound (Burden): never removed except by effects with allowBound; cannot be Transmuted or Pruned away. */
  bound?: boolean;
  /** Applied when upgraded. Empty object = cannot be upgraded. */
  upgrade: Partial<Pick<CardDef, 'cost' | 'text' | 'effects' | 'keywords' | 'name' | 'target' | 'riposte' | 'delay' | 'salvage'>>;
  hooks?: CardHooks;
  icon: string;
  tags?: string[];
}

export type RelicRarity = 'starter' | 'common' | 'uncommon' | 'rare' | 'boss' | 'shop' | 'event';

export interface RestOptionDef extends DslTables {
  id: RestOptionId;
  label: string;
  /** Template for the description. */
  text: string;
  effects: Effect[];
  /** Shards paid when used (before the restOptionCost modifier). Unavailable with fewer. */
  shardCost?: number;
  /** true or a reason string why it is not available. */
  available?(ctx: ReadCtx): true | string;
}

export interface RelicDef extends DslTables {
  id: RelicId;
  name: string;
  rarity: RelicRarity;
  /** Class-locked relic. */
  cls?: ClassId;
  /** Never offered to these classes ("any (not chronist)"). */
  excludeClasses?: ClassId[];
  text: string;
  hooks?: Hooks;
  triggers?: Triggers;
  counterMax?: number;
  /** Extra rest-site option granted while held. */
  restOption?: RestOptionDef;
  icon: string;
  tags?: string[];
}

/**
 * Round phases for StatusDef.tick / decay.
 * Global points (every entity holding the status): start_player_turn, end_player_turn, end_enemy_turn.
 * Per entity: end_own_turn = at the end of the holder's own turn (player: turn end step 1 tick /
 * step 5 decay; enemy: right after its move, Rot ticks then Exposed/Stagger decay).
 */
export type RoundPhase = 'start_player_turn' | 'end_player_turn' | 'end_enemy_turn' | 'end_own_turn' | 'never';

export interface StatusDef extends DslTables {
  id: StatusId;
  name: string;
  /** amount: additive stacks; duration: turns left; flag: on/off (stacks = 1); max: keeps the highest application (max-of-sources). */
  stacks: 'amount' | 'duration' | 'flag' | 'max';
  /** When stacks decay (see decayBy). */
  decay: RoundPhase;
  /** How much decays: 'one' (default), 'all', or 'half' (round down). keepStatus modifiers can keep stacks. */
  decayBy?: 'one' | 'all' | 'half';
  /** When onTick / triggers.onTick fire (before decay in the same phase). */
  tick: RoundPhase;
  isDebuff: boolean;
  /** 'amount' statuses may go negative. Default false (clamped at 0). */
  allowNegative?: boolean;
  /** Stack cap (TUNING.caps.status[id] wins when present; modifyStatusCap adjusts). */
  maxStacks?: number;
  /** Not shown as an icon (e.g. onslaught_keep). */
  hidden?: boolean;
  /** Template; {stacks} plus values/trigger values. */
  text: string;
  hooks?: Hooks & {
    onApplied?(ctx: HookCtx, info: { delta: number }): void;
    onRemoved?(ctx: HookCtx): void;
    onTick?(ctx: HookCtx): void;
  };
  triggers?: Triggers & { onTick?: Effect[] };
  icon: string;
}

export interface MoveDef {
  name: string;
  intent: IntentKind;
  effects: Effect[];
  /** 'hidden': this move shows as "?" in forecasts (the current intent is always shown). */
  augury?: 'hidden';
  /** Intent tooltip template, filled from the move's effects like card text. */
  text?: string;
}

export interface EnemyDef extends DslTables {
  id: EnemyId;
  name: string;
  hp: [number, number];
  moves: Record<string, MoveDef>;
  /** PURE: see EnemyAiCtx. */
  chooseMove(ctx: EnemyAiCtx): string;
  /** Statuses (passives) applied at spawn, before onSpawn. */
  spawnStatuses?: Record<StatusId, number>;
  /** Default minion behaviour when its leader dies (a summon/encounter slot may override). */
  onLeaderDeath?: 'die' | 'flee';
  /** Bosses are immune to halt_enemy (RULINGS 8). */
  boss?: boolean;
  onSpawn?(ctx: HookCtx): void;
  onTurnStart?(ctx: HookCtx): void;
  onDamaged?(ctx: HookCtx, info: DamageResult): void;
  onDeath?(ctx: HookCtx): void;
  hooks?: Hooks;
  icon: string;
  tags?: string[];
}

/** An encounter slot: an enemy, optionally led by an earlier slot (index into the same list). */
export interface EncounterSlot {
  id: EnemyId;
  leader?: number;
  withLeader?: 'die' | 'flee';
}

export interface EncounterDef {
  id: EncounterId;
  name: string;
  acts: Act[];
  /** easy: first TUNING.easyFights normal fights of an act; hard: later normal fights; event: only via start_combat. */
  pool: 'easy' | 'hard' | 'elite' | 'boss' | 'event';
  /** Action order = list order. */
  enemies: (EnemyId | EncounterSlot)[];
  /** Weight within its pool (default 1). */
  weight?: number;
  /** Informational (ENEMIES §5.9). */
  relicBias?: RelicId;
}

export interface EventOptionDef {
  /** Template rendered with values from this option's effects. */
  label: string;
  effects: Effect[];
  /** true or a reason string why it is disabled. */
  available?(ctx: ReadCtx): true | string;
  /** After resolving, go to this page of EventDef.pages instead of finishing. */
  next?: string;
}

export interface EventPageDef {
  text: string;
  options: EventOptionDef[];
}

export interface EventDef extends DslTables {
  id: EventId;
  name: string;
  acts: Act[];
  text: string;
  options: EventOptionDef[];
  /** Follow-up pages reached through EventOptionDef.next. */
  pages?: Record<string, EventPageDef>;
  /** Whether the event can be picked for a `?` room now (default: always). */
  eligible?(ctx: ReadCtx): boolean;
  /** Backdrop key for the renderer (e.g. 'event_generic'); absent: the renderer picks by act. */
  backdrop?: string;
  icon: string;
}

export type PotionRarity = 'common' | 'uncommon' | 'rare';

export interface PotionDef extends DslTables {
  id: PotionId;
  name: string;
  rarity: PotionRarity;
  /** Class potion: only drops for this class. */
  cls?: ClassId;
  text: string;
  target: 'enemy' | 'none';
  effects: Effect[];
  /** false = also usable on the map / in shops / at rests / in events ("anywhere"). */
  combatOnly: boolean;
  icon: string;
}

export interface StartBoonDef extends DslTables {
  id: BoonId;
  /** Ascent Pact list (GDD §4.11): the run offers 1 safe + 2 trade. */
  list: 'safe' | 'trade';
  text: string;
  effects: Effect[];
}

export interface ClassDef {
  id: ClassId;
  name: string;
  maxHp: number;
  startingGold: number;
  maxEnergy: number;
  potionSlots: number;
  startingDeck: CardId[];
  startingRelics: RelicId[];
  /** Class traits applied at every combat start (Chronist: { augury: 1 }). */
  combatStartStatuses?: Record<StatusId, number>;
  /** Class trait: each Attack you play grants +1 Onslaught (GDD §2.1). Only the Breaker has it. */
  onslaughtFromAttacks?: boolean;
  icon: string;
}
