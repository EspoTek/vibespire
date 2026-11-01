# Vibespire engine specification (v1)

This is the contract between four work streams: **engine** (`src/engine`), **content** (`src/content`), **renderer** (`src/render`), **simulator** (`sim/`). Change it only with a note in your report.

## 1. Principles

1. The engine is a **pure, deterministic state machine**. `Game` owns a `RunState` (plain JSON data). The only way to change it is `game.apply(action)`. The renderer and the simulator are both just clients of this API.
2. **No DOM, no three.js** in `src/engine` or `src/content`. They run under Node for vitest and the simulator.
3. **Seeded randomness.** `RunState.rng` holds named PRNG streams (`map`, `shuffle`, `enemy`, `reward`, `event`, `misc`), each a 4x32-bit sfc32 state. Same seed + same actions ⇒ identical run. Seeds are strings; a run's URL/share code is its seed.
4. **Events, not polling.** `apply()` returns an ordered `GameEvent[]` describing everything that happened (damage numbers, draws, status changes, deaths, phase changes). The renderer animates events; it never diffs state. `Game.state` after `apply()` is the post-event truth.
5. **Content is data + hooks.** Card/relic/enemy/status/event definitions live in `src/content` registries keyed by id. State references ids only. Definitions may carry functions (hooks); state never does.
6. **Text comes from numbers.** Card descriptions are templates (`"Deal {damage} damage. Apply {n} Brittle."`); the engine fills them from the computed values (including Strength-like modifiers for the current combat), so previews are always right.

## 2. Directory and module map

```
src/engine/
  rng.ts          sfc32, hashString(seed), RngStreams helpers: int(stream,min,max), pick, shuffle, chance
  types.ts        every shared type (this file is the API; keep it dependency-free)
  game.ts         class Game { state; legalActions(); apply(action): GameEvent[]; static newRun(seed, classId) }
  run.ts          run-level reducers: start bonus, map travel, rewards, shop, rest, treasure, boss reward, act transition
  combat.ts       combat loop: start/end turn, play card, enemy turn, damage/block pipeline, status ticks, win/lose
  effects.ts      Effect DSL interpreter (section 6)
  statuses.ts     generic status/power system with hook dispatch (section 7)
  map.ts          act map generation (section 9)
  text.ts         description templating
  serialize.ts    save/load (JSON), version stamp
  index.ts        re-exports
src/content/
  cards/<class>.ts, cards/colorless.ts, cards/curses.ts, cards/statuses_cards.ts
  relics.ts  enemies/act1.ts act2.ts act3.ts bosses.ts  events.ts  potions.ts  statuses.ts  classes.ts  index.ts (registries)
sim/
  policies/*.ts   Policy implementations
  run.ts          runOne(seed, classId, policy) → RunResult
  batch.ts        parallel batch runner (worker_threads) → aggregate JSON + markdown report
tests/            vitest
```

## 3. Core types (authoritative sketch — `src/engine/types.ts` is the real thing)

```ts
export type ClassId = string;             // 3 classes, ids defined in src/content/classes.ts
export type CardId = string; export type RelicId = string; export type EnemyId = string;
export type StatusId = string; export type EventId = string; export type PotionId = string;

export type Phase =
  | 'start'        // run-start boon choice (our Neow equivalent)
  | 'map'          // choose next node
  | 'combat'
  | 'reward'       // post-combat: card choice (3 + skip), gold, maybe potion/relic
  | 'shop' | 'rest' | 'event' | 'treasure'
  | 'boss_reward'  // choose 1 of 3 boss relics
  | 'victory' | 'defeat';

export interface RunState {
  version: number; seed: string; classId: ClassId;
  rng: Record<RngStream, [number, number, number, number]>;
  act: 1 | 2 | 3; floor: number;            // floor counts up across the whole run
  phase: Phase;
  player: PlayerState;                      // hp, maxHp, gold, deck (CardInstance[]), relics (RelicState[]), potions, potionSlots, ...
  map: ActMap; mapPos: MapPos | null;       // current node
  combat: CombatState | null;
  reward: RewardState | null; shop: ShopState | null; event: EventState | null; rest: RestState | null;
  startChoices: StartBoon[] | null; bossRelicChoices: RelicId[] | null;
  history: RunHistory;                      // per-floor summary for the simulator/stats (cards picked/skipped, hp, etc.)
  turnLog?: never;                          // (events are returned, not stored)
}

export interface CardInstance { uid: number; id: CardId; upgraded: boolean; /* per-instance mutable fields e.g. cost overrides */ costOverride?: number; tempCost?: number; }

export interface CombatState {
  enemies: EnemyState[]; turn: number; energy: number; maxEnergy: number;
  hand: CardInstance[]; draw: CardInstance[]; discard: CardInstance[]; exhaust: CardInstance[];
  player: { block: number; statuses: StatusMap; ...per-combat counters... };
  cardsPlayedThisTurn: CardId[]; attacksPlayedThisTurn: number; ...
  pendingChoice: PendingChoice | null;      // when a card needs a follow-up decision (choose a card to exhaust, etc.)
  encounterId: string; isElite: boolean; isBoss: boolean;
}

export interface EnemyState { uid: number; id: EnemyId; hp: number; maxHp: number; block: number; statuses: StatusMap; intent: Intent; moveHistory: string[]; aiState: Record<string, number>; alive: boolean; }
export type StatusMap = Record<StatusId, number>;
export interface Intent { kind: 'attack' | 'attack_defend' | 'defend' | 'buff' | 'debuff' | 'unknown' | 'sleep' | 'escape' | 'special'; damage?: number; hits?: number; moveId: string; }

export type Action =
  | { type: 'choose_start_boon'; index: number }
  | { type: 'travel'; to: MapPos }
  | { type: 'play_card'; uid: number; target?: number /* enemy uid */ }
  | { type: 'use_potion'; index: number; target?: number }
  | { type: 'end_turn' }
  | { type: 'resolve_choice'; uids: number[] }        // answer a pendingChoice
  | { type: 'pick_reward'; kind: 'card' | 'gold' | 'potion' | 'relic'; index?: number }
  | { type: 'skip_reward'; kind: 'card' }
  | { type: 'proceed' }                               // leave reward / finish event, go back to map
  | { type: 'shop_buy'; kind: 'card' | 'relic' | 'potion'; index: number }
  | { type: 'shop_remove'; uid: number }
  | { type: 'rest' } | { type: 'smith'; uid: number } | { type: 'rest_special'; index: number }
  | { type: 'event_choice'; index: number }
  | { type: 'choose_boss_relic'; index: number }
  | { type: 'open_treasure' };

export type GameEvent =
  | { t: 'phase'; phase: Phase }
  | { t: 'turn_start'; turn: number } | { t: 'turn_end' }
  | { t: 'draw'; uids: number[] } | { t: 'discard'; uids: number[] } | { t: 'exhaust'; uids: number[] } | { t: 'shuffle' }
  | { t: 'card_played'; uid: number; cardId: CardId; target?: number }
  | { t: 'damage'; source: 'player' | number; target: 'player' | number; amount: number; blocked: number; hpLost: number }
  | { t: 'block'; target: 'player' | number; amount: number }
  | { t: 'heal'; target: 'player' | number; amount: number }
  | { t: 'status'; target: 'player' | number; status: StatusId; delta: number; now: number }
  | { t: 'energy'; delta: number; now: number }
  | { t: 'enemy_intent'; uid: number; intent: Intent }
  | { t: 'enemy_move'; uid: number; moveId: string; name: string }
  | { t: 'enemy_died'; uid: number } | { t: 'player_died' }
  | { t: 'combat_won' } | { t: 'relic_trigger'; relic: RelicId } | { t: 'potion_used'; potion: PotionId }
  | { t: 'gold'; delta: number; now: number } | { t: 'card_added'; card: CardInstance; where: 'deck' | 'hand' | 'draw' | 'discard' }
  | { t: 'card_removed'; uid: number } | { t: 'card_upgraded'; uid: number }
  | { t: 'text'; text: string };          // one-line narrative for events/log
```

`Game.legalActions()` must be exact: the simulator only ever picks from it, and the renderer only ever enables what it lists. `apply()` throws on an illegal action (never silently ignores).

## 4. Run flow

1. `Game.newRun(seed, classId)` → phase `start` with 3 start boons generated from the `reward` stream (our Neow: e.g. "+1 potion slot", "remove a card", "transform 2 cards", "100 gold", "random common relic", "a curse for a rare relic" style trade-offs; exact list in GDD).
2. `map`: act map of 15 floors (section 9). `travel` moves to a connected node, sets phase by node type and sets up that node (encounter chosen from the act's pool with "no repeat of last 2 encounters"; elite pool; event pool with one-shot removal; shop inventory; etc.). Floor 16 of each act is the boss node → `combat` with `isBoss`.
3. `combat` (section 5) → on win `reward` → `proceed` → `map`. On loss → `defeat`.
4. Boss win → `boss_reward` (3 boss relics; acts 1 and 2 only) → act transition: heal per GDD, new map → `map`. After act 3 boss → `victory`.
5. `history` records one entry per floor: node type, hp before/after, gold, cards offered/picked/skipped, relics gained, turns taken in combat, damage taken, enemies.

## 5. Combat rules (STS-shaped baseline; GDD may adjust numbers)

- Combat start: shuffle deck into draw pile (`shuffle` stream), `innate` cards to hand, relics' `onCombatStart`, enemies' `onSpawn`, choose first intents.
- Turn start: energy = maxEnergy (base 3), `onTurnStart` hooks (statuses, relics), draw 5 (hand max 10; extra draws are discarded… no: cards that would exceed 10 stay in draw pile, STS-style), player block resets to 0 at start of player turn **unless** a hook keeps it.
- Play card: must be in hand, cost payable (X cost = all energy), target legal, not `unplayable`. Pay cost, move card to "in play", run effects in order, then card goes to discard (or exhaust if `exhaust`/power/status-with-exhaust). Powers are removed from play. Hooks: `onCardPlayed` (relics/statuses/enemies), `afterCardPlayed`.
- Damage pipeline (attacker→target): base → + flat modifiers (Strength-like) → × multiplicative modifiers (Vulnerable-like, Weak-like) → floor → target `onDamageTaken` modifiers → block absorbs → hp loss → `onHpLost` hooks → death check. Expose `computeDamage(preview=true)` so card text and intents show the real number.
- End turn: `onTurnEnd` hooks, discard hand (except `retain` cards), ethereal cards in hand exhaust, then enemies act in list order: each resolves its chosen move (effects DSL), then chooses next intent (`enemy` stream). Enemy block resets at start of its own turn. Then `turn++`, player turn start.
- Status tick order is defined in `src/content/statuses.ts` per status (`tick: 'end_player_turn' | 'end_enemy_turn' | 'start_player_turn' | 'never'`).
- Win: all enemies dead → `combat_won`, `onCombatEnd` hooks, rewards generated: gold (per encounter type, `reward` stream), card reward (3 cards, class pool, rarity odds per GDD with rare pity counter; colourless rate per GDD), potion chance (40% base, STS-style floating), elite → relic, boss → handled in boss_reward.
- Lose: player hp ≤ 0 after `onDeath` hooks (a relic may revive once) → `defeat`.
- `pendingChoice`: when an effect needs a decision (choose N cards from hand/discard/draw-preview, choose a target for a secondary effect, choose one of two options), the engine sets `combat.pendingChoice = { kind, uids/options, min, max, prompt }`, `legalActions()` returns only `resolve_choice`, and the effect resumes on resolution. Effect execution must therefore be resumable: implement as an **effect queue** on `CombatState` (`queue: QueuedEffect[]`), drained by `apply()` until empty or blocked by a choice.

## 6. Effect DSL

Cards, relics, potions, enemy moves and event options all express what they do as `Effect[]`. Interpreter in `src/engine/effects.ts`. Minimum primitive set (extend as the GDD needs, keep each primitive small and tested):

```
damage { amount, times?, target: 'target'|'all_enemies'|'random_enemy'|'self', ignoreBlock?, tags? }
block { amount, target?: 'self'|'all_allies' }
draw { n }   discard { n, random?: boolean, choose?: boolean }   exhaust { n, from: 'hand'|'discard', choose?: boolean, random?: boolean, all?: boolean }
energy { n }
status { target, id, amount }                 // apply/increase status
heal { amount, target? }   lose_hp { amount, target? }   max_hp { amount }
add_card { card: CardId, to: 'hand'|'draw'|'discard', n?, upgraded?, costThisTurn?, position?: 'top'|'random' }
upgrade { where: 'hand'|'all_hand'|'deck', choose? }
scry-like / peek primitives as the GDD defines
gold { amount }
choose { prompt, options: {label, effects}[] }        // modal choice card
repeat { times | 'X' | fn, effects }
conditional { if: Condition, then: Effect[], else?: Effect[] }
custom { fn: string }                           // named hook in the content def (last resort; must be unit-tested)
```

Amounts may be numbers or `{ base, scale: 'strength'|'per_card_in_hand'|... }` resolved by `resolveAmount(ctx)`. Every amount shown in text goes through the same resolver with `preview: true`.

Hooks (functions in definitions, all optional), with a `Ctx` giving read/write access to state, the event sink, the rng, and helper functions:

```
CardDef.hooks?: { onDraw, onDiscard, onExhaust, onRetain, costModifier(ctx) → number, canPlay(ctx) → boolean | string }
RelicDef.hooks?: { onPickup, onCombatStart, onCombatEnd, onTurnStart, onTurnEnd, onCardPlayed, onDamageDealt, onDamageTaken, onHpLost, onShuffle, onRest, onShopEnter, onEnemyDied, onDeath, modifyDamageDealt, modifyBlock, modifyCardCost, onFloorEnter, onGoldGain }
StatusDef: { stacks: 'amount'|'duration'|'flag', decay: 'end_player_turn'|'end_enemy_turn'|'never', isDebuff, hooks (same list as relics, plus onApplied/onRemoved) }
EnemyDef: { hp: [min,max], moves: Record<string, MoveDef>, chooseMove(ctx) → moveId, onSpawn, onTurnStart, onDamaged, onDeath, hooks }
```

Hook dispatch order: statuses on the acting entity → relics → enemies/other entities, stable by insertion order. Document it in `statuses.ts`.

## 7. Statuses

A single generic system covers buffs, debuffs, powers and the new mechanics: `StatusDef` registry + `StatusMap` on each entity. `applyStatus(target, id, amount)` handles stacking rule, `Artifact`-like negation if the GDD has one, emits `status` events, and calls `onApplied`. Status removal when stacks hit 0. The intent preview must apply the player's current status modifiers (so a Weak-like debuff changes the displayed number).

## 8. Cards and relics data shape

```ts
interface CardDef {
  id: CardId; name: string; cls: ClassId | 'colorless' | 'curse' | 'status';
  type: 'attack' | 'skill' | 'power' | 'status' | 'curse';
  rarity: 'starter' | 'common' | 'uncommon' | 'rare' | 'special';
  cost: number | 'X' | null;                 // null = unplayable
  target: 'enemy' | 'all_enemies' | 'self' | 'none';
  keywords?: ('exhaust' | 'ethereal' | 'innate' | 'retain' | 'unplayable' | ...GDD keywords)[];
  text: string;                              // template; {damage} {block} {n} {times} etc.
  effects: Effect[];
  upgrade: Partial<Pick<CardDef, 'cost' | 'text' | 'effects' | 'keywords' | 'name'>>;   // applied when upgraded
  hooks?: CardHooks; icon: string;           // sprite key
  tags?: string[];                           // for simulator heuristics & synergy stats: 'aoe','scaling','draw','block','debuff', ...
}
interface RelicDef { id; name; rarity: 'starter'|'common'|'uncommon'|'rare'|'boss'|'shop'|'event'; cls?: ClassId; text: string; hooks; counterMax?: number; icon; tags? }
```

Upgrades: `getCardDef(id, upgraded)` returns the merged def (cached). Card text rendering: `renderCardText(def, ctx|null)`.

## 9. Map generation

STS-like: 15 rows × 7 columns per act, 6 random-walk paths from row 0 to row 14 (connect up/up-left/up-right, no crossings), merged; node types assigned with rules: row 0 always monster, row 8 always treasure, row 14 always rest, elites and rests not before row 5, no rest two in a row, shops/elites not adjacent to same type, at least 1 shop and ≥2 elites reachable; type weights per GDD. Boss node at row 15 reachable from every row-14 node. Node = `{ row, col, type, edges: col[] }`. The whole map is visible; `?` nodes resolve to event (60%) / monster / shop / treasure per STS odds when entered.

## 10. Simulator contract

```ts
interface Policy { name: string; choose(game: Game, legal: Action[], rngSeedForPolicy: number): Action; }
runOne(seed, classId, policy, opts) → RunResult { won, floorReached, act, deathEncounter?, hpByFloor, deckEnd: CardId[], relics, cardsOffered/Picked/Skipped, turnsPerCombat, damageTakenPerCombat, elapsedMs }
batch(seeds, classIds, policy, concurrency) → aggregate: win rate by class, death heatmap by encounter, average HP by floor, card pick/skip rates, card win-rate delta (runs containing card vs not), relic win-rate delta, average deck size by act, combat length.
```

The playtest policy is the balance oracle. It must be **competent**, not random: a one-ply greedy with hand-crafted evaluation (lethal check, block vs incoming damage, play 0-cost first, prefer debuff then attack, don't overblock, value scaling early in a fight), card-reward heuristic by archetype tags, and path choice preferring elites when hp high. Determinism: the policy takes its own seeded rng.

## 11. Save / load

`serialize(state)` → JSON string with `version`. `deserialize(json)` validates version and throws otherwise. Renderer persists to `localStorage['vibespire.run']` after every `apply()`; a run resumes at the current phase (mid-combat resume is supported because combat state is fully in `RunState`).

## 12. Testing bar

- `tests/engine/*.test.ts`: rng determinism, damage pipeline order, block/turn structure, pending choice resumption, every status's tick & decay, map invariants (1000 seeds), save-load round trip mid-combat, legalActions exactness (fuzz: every legal action applies without throwing; random illegal ones throw).
- `tests/content/*.test.ts`: every card plays in a sandbox combat without throwing (upgraded too), every enemy's every move resolves, every event option resolves, every relic hook fires at least once in a scripted combat, all text templates resolve with no `{placeholder}` left.
- Fuzz: 200 full random-policy runs per class complete (win or lose) without throwing.

---

## v2 (GDD alignment)

This section supersedes §3 to §11 wherever they differ. The authoritative shapes are in `src/engine/types.ts`, and the authoring guide is `docs/CONTENT_GUIDE.md`. Rules come from `docs/GDD.md` §2 to §4, overridden by `docs/RULINGS.md`.

**State additions**
- `RunState.ascent` (always 0 for now; the levers are data in `TUNING.ascent`).
- `PlayerState.counters`: the engine owns `shards` (cap 10) and the run flags `lean_rewards`, `wide_rewards`, `augury_combats`, `hunted_pending`, `*_rest_of_act`, and `combat_start_status:<id>`.
- `MapNode.encounterId` holds a pre-assigned elite. The act's elite pool is shuffled and cycled, so no elite repeats until all have appeared.
- `CombatState` gains:
  - zones: `primed: {card, charges}[]` (the Riposte rack) and `timeline: TimelineEntry[]` (`{card, dueTurn, seq, onBeat, target, x, advancedThisTurn}`);
  - fight context: `kind` (`'monster' | 'elite' | 'boss' | 'event'`), `eventId`, `onWin`;
  - per-turn tracking: `reducedThisTurn`, `resolvedThisTurn`, `lastPrune`;
  - `player.guard`;
  - engine `counters` (see `CombatCounterKey`): per-turn cap budgets, `prunes`, `beatOffset`, `capHits`, `cap:<id>`.
- `EnemyState` gains `guard`, `forecast: Intent[]`, `intentTurn`, `fled`, `leaderUid`, `withLeader`.
- `Intent.hidden` marks a `'?'` forecast entry.
- `RewardState.kind`; `ShopState.removeShardGold` and `cards[].sale`; `RestState.sideUsed`; `EventState.page`.
- `FloorRecord` gains `shardsGained`, `shardsSpent`, `capHits`.

**Definition additions**
- `CardDef`: `riposte`, `delay {turns, effects}`, `bound`, `hooks.handModifiers`; `upgrade` may replace `riposte` and `delay`.
- `Keyword` adds `riposte`, `bloom`, `delay`. Prune is a tag (ruling 23).
- `MoveDef`: `augury: 'hidden'`, `text`.
- `EnemyDef`: `spawnStatuses`, `onLeaderDeath`, `boss`.
- `EncounterDef`: `enemies` accepts `{id, leader?, withLeader?}` slots; `pool` adds `'event'`; `relicBias` (informational).
- `EventDef`: `pages`, `eligible`; `EventOptionDef.next`.
- `PotionDef.cls`, `StartBoonDef.list` (`'safe' | 'trade'`), `RestOptionDef.shardCost`, `RelicDef.excludeClasses`, `ClassDef.combatStartStatuses`.
- `StatusDef.stacks` adds `'max'`. `RoundPhase` adds `'end_own_turn'`. `StatusDef.hidden`.

**Turn order** follows GDD §2.0 exactly (see the header of `src/engine/combat.ts`). Every step is a queue item, so any step can suspend on a choice, including the prime step and a Prune triggered from a hook.

**Damage pipeline** follows GDD §2.15 (see the header of `src/engine/damage.ts`):
- Step 3 includes `TUNING.enemyDamagePct[act]` for enemy hits.
- Step 4 is built in: `−stagger + exposed × exposedPerStack + backlash_primed × 4 + damageTakenFlat`.
- Absorption is Block, then Guard.
- Step 7 applies `modifyHpLoss`.
- `computeDamage(preview)` runs steps 1 to 5.
- The Riposte check runs before an attack's first hit. If the attacker dies, or `cancel_attack` is used, the move is cancelled (event `attack_cancelled`).

**Enemy AI purity**: `EnemyAiCtx` has no `state` or `combat`. It provides a frozen `self`, `forTurn`, `history`, `aiState`, the living `allies` (ids only), the enemy's own `rng`, and the helpers `lastMove`, `timesInARow` and `alliesAlive`. The forecast runs `chooseMove` on a cloned rng with the history extended by the current move. It is recomputed after every action, and `enemy_forecast` is emitted when it changes.

**New effects, scales, conditions and hooks**: the full list is in `docs/CONTENT_GUIDE.md` §2. The new effects are GDD §9.8 plus `lose_guard`, `lose_defence`, `autoplay`, `prime`, `cancel_attack`, `halt_enemy`, `summon`, `transform`, `reroll_forecast` and `ai_state`.

**Actions**: `skip_boss_relic` (+2 Shards) replaces `proceed` on the boss relic screen. `shop_remove {uid, pay: 'gold' | 'shard'}`.

**Multi-pick choices (v2.1)**:
- A PendingChoice with `max > 1` is answered step by step, so `legalActions()` stays linear. It used
  to list every subset, and "upgrade 3 of 33 cards" was 5,456 answers.
- `{type: 'choice_toggle', uid}` selects or deselects one choice into `PendingChoice.picked`, which
  is kept in `choices` order.
- `resolve_choice {uids: picked}` confirms once `min <= picked.length <= max`.
- Single-pick choices (`max <= 1`) are unchanged: one `resolve_choice` per choice, plus `[]` when
  `min` is 0.
- `choiceStep(pc, uids)` gives the next step toward a wanted answer. Policies, the UI
  (`RunSession.answerChoice`) and tests (`tests/answer-choice.ts`) use it.
- Order of the legal list: confirm, then selects, then deselects.

**Saves (v2.1)**:
- `ENGINE_VERSION` 3. There are no migrations.
- `parseSaveOrIncompatible(json)` reports a save as incompatible, without throwing, in two cases:
  - its version differs (the live v1 build wrote version 2);
  - any id in it doesn't resolve in the registries (`unresolvedIds`, `src/engine/savecheck.ts`):
    cards, relics, statuses, potions, enemies, encounters, events, boons, rest options, class,
    history included.
- The title deletes an incompatible save and tells the player.
- `deserialize` throws on all of these. A malformed save of the current version, or non-JSON, also
  throws.

**Difficulty tiers (rulings 71, 74)**:
- `RunState.difficulty: 'standard' | 'heroic'` is set at run start:
  `Game.newRun(seed, classId, { difficulty })`; absent means `'standard'`.
- `TUNING.difficulty[tier]` holds both enemy levers per act, and they have no other source:
  - `enemyHpPct` scales rolled enemy HP;
  - `enemyDamagePct` is damage pipeline step 3 on enemy hits, so intents, forecasts and move text show
    the tier-scaled number.
- The levers today:
  | tier | HP | damage |
  |---|---|---|
  | Standard | 85 | 75 |
  | Heroic | 110 | 85 |
- Sim:
  - `--set enemyHpPct.all=N` and `--set enemyDamagePct.all=N` set both tiers;
    `difficulty.<tier>.<lever>.<act|all>` sets one;
  - `--difficulty standard|heroic` picks the tier for `personas-batch`, `counterfactual` and `trace`.
- `ENGINE_VERSION` 4: a version 3 save migrates to `difficulty: 'standard'`. Ruling 74 doesn't change
  the save shape, so there is no new bump.

**AI purity**: `AI_PURITY.mode` selects how strictly `chooseMove` is checked.
- `'frozen'`: a deep-frozen clone. Tests and dev builds use it.
- `'copied'`: a cheap unfrozen copy. The default, used by the simulator and production.

**Events (additions)**:
- `damage` gains `guarded`; `block` gains `pool`; `card_played` gains `onBeat`.
- New events: `guard_decay`, `enemy_forecast`, `attack_cancelled`, `enemy_transformed`, `enemy_fled`, `card_primed`, `riposte_triggered`, `prime_fizzled`, `timeline_added`, `timeline_shifted`, `timeline_resolved`, `bloom`, `shards`, `cap_hit`, `relic_lost`, `potion_lost`.

**Renames**:
- `onStatusApplied` became `onStatusChanged` (in v1).
- `StatusDef`'s v1 `decay: 'end_enemy_turn'` is now `'end_own_turn'` for Exposed and Stagger.
- `finish_card` queue items carry `via`, `onBeat`, `depth` and `x`.

**Content registration**:
- The real packs are registered by `src/content/index.ts`. `CLASSES` and `PACTS` are behind `REAL_CLASSES_READY`.
- The test pack (`src/content/testpack`, `registerTestPack()`) is opt-in. It is used by tests, by `sim --content test`, and by renderer dev builds.

**Simulator**: `npx tsx sim/batch.ts --runs N [--class ids] [--content test|real] [--workers N|auto] [--out file]`. `RunResult` adds `shardsEarnedByAct`, `shardsSpentByAct`, `capHits` and `turns`. The aggregate adds Shard averages per act, `capHits` and `capHitsPerTurn`.
