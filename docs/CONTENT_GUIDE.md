# Content authoring guide (engine v2)

How to turn the designers' markdown (`docs/cards/*.md`, `docs/ENEMIES.md`, `docs/GDD.md` §5–§7) into TypeScript. Rules: `docs/GDD.md`; overrides: `docs/RULINGS.md`; types: `src/engine/types.ts`. Every example below is copied verbatim from `tests/content/guide_examples.ts`, which a test registers and plays, so the examples are known to work.

## 1. Files, registration, rules

| File (already exists, export the array) | Array | Type |
|---|---|---|
| `src/content/cards/{breaker,graft,chronist,colorless,curses,status_cards}.ts` | `BREAKER_CARDS`, `GRAFT_CARDS`, `CHRONIST_CARDS`, `COLORLESS_CARDS`, `CURSES`, `STATUS_CARDS` | `CardDef[]` |
| `src/content/relics.ts` · `potions.ts` · `events.ts` | `RELICS` · `POTIONS` · `EVENTS` | `RelicDef[]` · `PotionDef[]` · `EventDef[]` |
| `src/content/enemies/{act1,act2,act3,bosses}.ts` · `enemies/encounters.ts` | `ACT1_ENEMIES` … `BOSSES` · `ENCOUNTERS` | `EnemyDef[]` · `EncounterDef[]` |
| `src/content/statuses.ts` (GDD statuses are done; append power statuses and enemy passives) | `STATUSES` | `StatusDef[]` |
| `src/content/classes.ts`, `boons.ts`, `rest.ts` (done) | `CLASSES`, `PACTS`, `REST_OPTIONS` | |

`src/content/index.ts` already calls `registerPack({ cards, relics, enemies, encounters, events, potions, statuses, restOptions })` with these arrays. When the starter cards, starter relics, curses and class rares exist, set `REAL_CLASSES_READY = true` there; that registers `CLASSES` and `PACTS`. The shape is `ContentPack` in `src/content/registry.ts`: every field is an optional array, and a duplicate id throws. `registerPack(pack, tag = 'real')`: engine tests call `restrictListingsTo(['test'])` so their random pools ignore packs that are still being written. Lookups by id, statuses and rest options are never restricted.

**Rules.** Content files may only `import type` from `../engine/types` (a test enforces this). Lookups throw on unknown ids. Never type a number into `text`: every number comes from a placeholder (§3). Ids follow GDD §0.2. Played Powers leave play; they are neither discarded nor Scrapped (ruling 5).

**Checking your work.** Run `npm test`. It covers `validateAllContent()`, every card played base and upgraded, every enemy move, every event option, potion, pact and rest option, every relic hook, and every text template. Run `npx tsx sim/batch.ts --runs 200` (add `--content test` for the test pack).

**Designer YAML → TS.** A one-key map `damage: { amount: 6, target: target }` becomes `{ type: 'damage', amount: 6, target: 'target' }`. Conditions work the same way: `on_beat: {}` becomes `{ type: 'on_beat' }`. Wherever the designers wrote a named fn, prefer the built-in scale; for example `target_intent_total` becomes `{ intent_damage: 'target' }`.

## 2. DSL reference (full shapes in `types.ts`)

**Targets.** `target` (the chosen enemy; for enemy moves, the player) · `attacker` (alias of `target` in Riposte lists and damage-taken triggers) · `self` · `all_enemies` · `random_enemy` · `all_allies` · `leftmost_enemy` · `lowest_hp_enemy`.

**Amounts.** An amount is a number, `'X'`, or `{ base?, per?, scale }`, valued as `floor(base + per × scale)`; `per: 0.5` means "+1 per 2". Scales:
- turn and hand: `x` · `stacks` (inside a status) · `cards_in_hand|draw|discard|exhaust` (exhaust is the Scrapheap) · `cards_played_this_turn` · `attacks_played_this_turn` (finished Attack plays; the card being played is not counted, ruling 34) · `beat_count` · `enemies_alive`
- your stats: `block` · `guard` · `defence` (Block + Guard) · `hp` · `max_hp` · `missing_hp` · `gold` · `shards`
- deck and zones: `deck_size` · `timeline_count` · `primed_count`
- trigger context: `trigger_hits` (Riposte only) · `spent` (inside `spend_status`)
- Bloom: `bloom_cards_in_deck|total_in_deck|max_in_deck`
- enemies: `forecast_damage` / `intent_damage` (the target's), or `{forecast_damage|intent_damage: 'target'|'all'}` (hidden entries count 0) · `rot_on_target`
- enemy moves only: `player_draw_pile` · `player_status_cards` · `best_card_damage_this_turn` · `triggered_riposte` · `{ai: key}` (own `aiState`)
- other: `{status: id, of?: 'self'|'target'}` · `{cardVar: 'bloom'}` · `{fn: name}` (from the def's `amounts` table).

**Conditions.** `has_status {who, id, min?}` · `target_intends_attack` · `target_dead` (use after a hit for "if this kills") · `hp_below_pct {who, pct}` · `compare {left, op, right}` (covers hand size, enemy count, Onslaught, Shards and so on) · `on_beat` · `forecast_is_attack {who: target|any|all, depth}` (depth 0 is the current intent, 1 the intent after next) · `pruned_type {cardType}` · `timeline_nonempty` · `removed_self` (the source card's deck copy is gone; put it after `remove_card {self}` and gate the payoff with it, because a `cap_prune_away` cut leaves the card in the deck) · `is_class {cls}` · `not` / `all` / `any` · `fn`.

**Effects.**
- Combat basics: `damage {amount, times?, target, ignoreBlock?, tags?}` · `block` / `guard {amount, target?: self|all_allies}` · `lose_guard {amount|'half'|'all'}` · `lose_defence {pool: block|guard|both, amount|'all'}` · `draw {n}` · `discard` / `exhaust {n?, from, one of random|choose|all|self}` · `energy {n}` · `status {target, id, amount}` (a negative amount removes) · `heal` / `lose_hp {amount, target?}` · `max_hp {amount}` (a gain also heals) · `add_card {card, to, n?, upgraded?, costThisTurn?, position?}` · `upgrade {where: hand|all_hand|deck, choose?, n?, filter?}` · `scry {n}`.
- Flow: `choose {prompt, options: [{label, effects, if?}]}` · `repeat {times, effects}` · `conditional {if, then, else?}` · `custom {fn}` (last resort; unit-test it).
- Mechanics:
  - Onslaught: `spend_status {id, n|'all', effects}`. "Spend N" with fewer than N skips the clause; "spend all" at 0 still runs it with `spent` = 0 (ruling 33).
  - Bloom: `bloom {amount, target: choose_hand|random_bloom_in_piles|all_hand|self|min_in_deck|max_in_deck|choose_deck}`.
  - Prune: `prune {bloom?=1, variant?: standard|wild|spread|away, bonusIf?: {type, bloom}}`.
  - Timeline: `advance {n}` · `postpone {n}`.
  - Cadence: `on_beat {effects}`.
  - Card moves: `fetch_card {from: draw|discard|exhaust, select: top|random|choose|max_bloom|min_bloom, to: hand|draw_top|primed, n?, upTo?, filter?, costThisTurn?, countsAsDraw?}` · `autoplay {from: draw|hand, n?}` (a free play at depth + 1).
  - Riposte: `prime {n?}` (primes up to n Riposte cards from hand now, beyond this turn's capacity; the end-of-turn prime step doesn't count them; a choice of up to n, min 0, when more are in hand) · `cancel_attack` (Riposte lists only).
  - Enemies: `halt_enemy {target}` (bosses are immune).
- Run level: `gold` / `shards {amount}` (negative spends) · `gain_relic {id?|rarity?}` · `gain_potion {id?}` · `potion_slots {n}` · `remove_card {n?, one of choose|random|all|self, from?: deck|hand, filter?, allowBound?}` · `transform_card` · `transmute {offers?=2, n?, upTo?, rarity?, upgrade?}` · `offer_cards {pool: class|colorless, rarity?, n, upgraded?}` · `duplicate_card {from?, filter?}` · `lose_potion` · `lose_relic {notStarter?}` · `run_flag {key, delta}` · `start_combat {encounterId, onWin?}` (events only) · `gamble {outcomes: [{weight, effects, label?}]}`.
- Enemy moves only: `summon {enemy, n?|fillTo?, cap?, withLeader?: die|flee}` · `transform {into}` · `reroll_forecast {target}` · `ai_state {key, delta?|set?}`.

**Run flags** (`player.counters`) that the engine reads: `lean_rewards`, `wide_rewards`, `augury_combats`, `hunted_pending`, `augury_rest_of_act`, `forecast_depth_3_rest_of_act`, and `combat_start_status:<statusId>` (that many stacks are applied at every combat start). For example, the Breaker's oath card stores its Onslaught as `run_flag {key: 'combat_start_status:onslaught', delta: 2}` instead of an `oath_onslaught` counter.

**Hooks** live on relics, statuses and enemies; the info each one receives is in `HookInfoMap`. Two forms:
- Event hooks `(ctx, info) => void`: `onCombatStart`, `onCombatEnd`, `onTurnStart`, `onTurnEnd`, `onCardPlayed` / `afterCardPlayed` (info has `onBeat` and `depth`), `onCardExhausted`, `onCardDrawn`, `onCardToHand`, `onDamageDealt`, `onDamageTaken`, `onHpLost`, `onBlockGained`, `onGuardAbsorbed`, `onGuardDecay`, `onShuffle`, `onEnemyDied` (info has the dead enemy's statuses), `onDeath` (the dying creature's statuses see it first), `onStatusChanged`, `onEnemySpawn`, `onEnemyAttackDeclared`, `onRiposteTriggered`, `onPrimed`, `onEnemyMoveEnd`, `onPrune` (only when a card was Scrapped), `onBloomGained`, `onDelayResolved`, `onTimelineAdd`, `onPotionUsed`, plus the run-level `onPickup`, `onRest`, `onShopEnter`, `onFloorEnter`, `onActStart`, `onGoldGain`, `onShardGain`, `onRewardSkipped` and `onCardAdded`. Declarative `triggers: {hook: Effect[]}` are preferred, because text can read their values. Inside a hook, `ctx.queue(effects)` may open a choice; `ctx.now(effects)` runs synchronously and throws on a choice. Enemies also have `ctx.setIntent(moveId)` (telegraphed overrides only). `ctx.nextBeat()` returns `{count, onBeat, positions}` for the next counted play, with Cadence modifiers applied; it is available on hook and effect contexts, amount and condition fns, and `costModifier`/`canPlay` (combat only). Use it instead of copying `TUNING.cadence.beats`. `onTimelineAdd` info and trigger frames carry the entry's `onBeat`, so `on_beat` works there. A card may Scrap itself mid-resolution (`exhaust {from: 'hand', self: true}`); it still counts as finished (Onslaught, `afterCardPlayed`).
- Pure modifier hooks that return a value:
  - damage: `damageDealtFlat`, `damageDealtMult` (integer %), `damageTakenMult`, `damageTakenFlat`, `exposedPerStack`, `modifyDamageTaken`, `modifyHpLoss`
  - defence: `blockFlat`, `guardFlat`, `blockMult`, `keepBlock`, `guardDecay`
  - statuses and costs: `keepStatus`, `modifyStatusCap`, `modifyStatusApplied`, `modifyHeal`, `modifyCardCost`
  - class mechanics: `bloomCap`, `modifyPruneBloom`, `beatPositions`, `onBeatRepeats` (at most 3 runs), `primeCapacity`, `primeCharges`, `forecastDepth`
  - turn stats: `maxEnergy`, `drawPerTurn`, `handLimit`, `enemiesActFirst`
  - run economy: `canSkipCardReward`, `skipShards`, `cardRewardRarities`, `modifyShopPrice`, `shardRemovalKeepsService`, `restOptionCost`, `restSideAction`
  - Cards in hand can carry `hooks.handModifiers`, which is how Tangle, Seized Joint and Vacuum Chill work.

**Status fields.**
- `stacks`: `amount`, `duration`, `flag`, or `max` (max-of-sources).
- `decay` and `tick`: one of `start_player_turn`, `end_player_turn`, `end_enemy_turn`, `end_own_turn` (the holder's own turn end: Rot ticks there and Exposed/Stagger decay there), or `never`.
- `decayBy`: `one`, `all` or `half`.

**Built-in rules** that need no content: the turn order of GDD §2.0; pipeline step 4 (Stagger/Exposed/Backlash); Onslaught +1 after each played Attack; priming and fizzle; Timeline resolution and retarget; Guard halving; all caps (GDD §3, with a Delay card unplayable on a full Timeline or after relaying, and every in-combat removal sharing `cap_prune_away`); cost tax and halt via their statuses. Bosses need `boss: true`.

## 3. Text placeholders

`text`, option `label`s and `MoveDef.text` are templates, and an unknown `{name}` throws.
- Values come from the effects in walk order: `effects`, then `riposte`, then `delay.effects`, recursing into `on_beat`, `choose`, `conditional`, `repeat`, `spend_status` and `gamble`.
- Each value is named after its effect type (`{damage}`, `{block}`, `{guard}`, `{lose_guard}`, `{draw}`, `{status}`, `{advance}`, `{prune}`, `{shards}`, `{bloom}`, `{offer_cards}`, `{run_flag}`, `{summon}`, …), or after its `key`. The exceptions: `spend_status` gives `{spend}`, a damage effect's `times` gives `{times}`, and `gamble` gives `{gamble_1}`, `{gamble_2}`, … in percent.
- Repeats get suffixes: `{damage2}`, `{damage3}`.
- Derived values: `{<key>_abs}` for every number ("Spend {shards_abs} Shard"); `{<key>_per}` and `{<key>_base}` for scaled amounts ("Deal {damage} (+{damage_per} per Bloom)"); `{per}` and `{per2}` for the 1st and 2nd scaled `per`; `{delay_turns}` on Delay cards.
- `{n}` is the first value that isn't damage, block or guard. The def's `values` table is available, and statuses get `{stacks}`.
- Give Riposte, Delay and on-beat values explicit keys (`rdamage`, `delay_block`, `beat_damage`).
- In combat, text shows the live numbers (modifiers, the hovered target, X = energy).

## 4. Examples

```ts
// Riposte card
{ id: 'return_stroke', name: 'Return Stroke', cls: 'breaker', type: 'attack', rarity: 'common', cost: 1, target: 'enemy',
  keywords: ['riposte'],
  text: 'Deal {damage} damage. Riposte: deal {rdamage} damage to the attacker and gain {rstatus} Onslaught.',
  effects: [{ type: 'damage', amount: 7, target: 'target' }],
  riposte: [{ type: 'damage', amount: 6, target: 'attacker', key: 'rdamage' },
            { type: 'status', target: 'self', id: 'onslaught', amount: 1, key: 'rstatus' }],
  upgrade: { effects: [{ type: 'damage', amount: 9, target: 'target' }],
             riposte: [{ type: 'damage', amount: 8, target: 'attacker', key: 'rdamage' },
                       { type: 'status', target: 'self', id: 'onslaught', amount: 1, key: 'rstatus' }] },
  icon: 'card_return_stroke', tags: ['riposte', 'onslaught'] }
// Delay (split) card: `effects` now, `delay.effects` N turns later (amounts/conditions evaluated then)
{ id: 'tock', /* … */ type: 'skill', cost: 1, target: 'self', keywords: ['delay'],
  text: 'Gain {block} Block. Delay {delay_turns}: gain {delay_block} Block.',
  effects: [{ type: 'block', amount: 3 }],
  delay: { turns: 1, effects: [{ type: 'block', amount: 5, key: 'delay_block' }] },
  upgrade: { effects: [{ type: 'block', amount: 4 }], delay: { turns: 1, effects: [{ type: 'block', amount: 7, key: 'delay_block' }] } } }
// Bloom + Prune card (upgrades raise `per`, never `base`; 'prune' is a tag, not a keyword)
{ id: 'grafting_cut', /* … */ type: 'attack', cost: 1, target: 'enemy', keywords: ['bloom'],
  text: 'Bloom. Deal {damage} (+{damage_per} per Bloom) damage. Prune.',
  effects: [{ type: 'damage', amount: { base: 2, per: 1, scale: { cardVar: 'bloom' } }, target: 'target' },
            { type: 'prune', bloom: 1, variant: 'standard' }],
  upgrade: { effects: [{ type: 'damage', amount: { base: 2, per: 2, scale: { cardVar: 'bloom' } }, target: 'target' },
                       { type: 'prune', bloom: 1, variant: 'standard' }] }, tags: ['bloom', 'prune'] }
// On-beat card
{ id: 'downbeat', /* … */ cost: 2, target: 'enemy', text: 'Deal {damage} damage. On beat: deal {beat_damage} more.',
  effects: [{ type: 'damage', amount: 11, target: 'target' },
            { type: 'on_beat', effects: [{ type: 'damage', amount: 6, target: 'target', key: 'beat_damage' }] }] }
// Power: the card applies a status whose id = the card id; the status carries the behaviour.
// STATUS: { id: 'dusk_pruning', name: 'Dusk Pruning', stacks: 'amount', decay: 'never', tick: 'never', isDebuff: false,
//   text: 'At the end of your turn, Prune {stacks} time(s).', icon: 'status_dusk_pruning',
//   triggers: { onTurnEnd: [{ type: 'repeat', times: { scale: 'stacks' }, effects: [{ type: 'prune', bloom: 1 }] }] } }
// CARD:   { id: 'dusk_pruning', type: 'power', cost: 1, target: 'self', text: 'At the end of your turn, Prune.',
//   effects: [{ type: 'status', target: 'self', id: 'dusk_pruning', amount: 1 }], upgrade: { cost: 0 }, … }

// Relic: a declarative trigger + a modifier hook; numbers shared with text through `values`
const RIVETS = { guard: 1 };
{ id: 'bulwark_rivets', name: 'Bulwark Rivets', rarity: 'common', values: RIVETS,
  text: 'Whenever you gain Guard, gain {guard} more. At the start of each combat, gain {block} Block.',
  triggers: { onCombatStart: [{ type: 'block', amount: 3 }] }, hooks: { guardFlat: () => RIVETS.guard },
  icon: 'relic_bulwark_rivets' }

// Enemy leader + minion. chooseMove is PURE: it sees only its own frozen snapshot (hp, statuses, aiState),
// history, forTurn, rng and which allies are alive (never player state). Escalate through `ai_state` in
// move effects; reacting to the player belongs in move effects/amounts at resolve time.
{ id: 'gnasher_alpha', name: 'Gnasher Alpha', hp: [62, 66],
  moves: {
    call_pack: { name: 'Call the Pack', intent: 'special', text: 'Summons Gnashers until {summon} are alive.',
                 effects: [{ type: 'summon', enemy: 'gnasher', fillTo: 2, cap: 2, withLeader: 'flee' }] },
    maul: { name: 'Maul', intent: 'attack', text: 'Deal {damage} damage. +{damage_per} each use.',
            effects: [{ type: 'damage', amount: { base: 9, per: 2, scale: { ai: 'mauls' } }, target: 'target' },
                      { type: 'ai_state', key: 'mauls', delta: 1 }] },
    howl: { name: 'Howl', intent: 'buff', augury: 'hidden', effects: [{ type: 'status', target: 'all_allies', id: 'might', amount: 1 }] },
  },
  chooseMove: (c) => {
    if (c.alliesAlive('gnasher') < 2 && c.lastMove() !== 'call_pack') return 'call_pack';
    if (c.timesInARow('maul') >= 2) return 'howl';
    return c.rng.weighted([['maul', 70], ['howl', 30]]);
  }, icon: 'enemy_gnasher_alpha' }
{ id: 'gnasher', name: 'Gnasher', hp: [13, 17], onLeaderDeath: 'die', chooseMove: () => 'bite',
  moves: { bite: { name: 'Bite', intent: 'attack', effects: [{ type: 'damage', amount: 3, times: 2, target: 'target' }] } } }
// Encounter: list order = action order; a slot may name an earlier slot as leader and override withLeader.
{ id: 'enc_a1_alpha', name: 'Gnasher Alpha', acts: [1], pool: 'elite',
  enemies: ['gnasher_alpha', { id: 'gnasher', leader: 0, withLeader: 'flee' }, { id: 'gnasher', leader: 0, withLeader: 'flee' }] }
// pools: easy | hard | elite | boss | event (event = only via start_combat). Passives: EnemyDef.spawnStatuses.

// Event: gamble (odds rendered), a follow-up page, an event combat, a gated option
{ id: 'ev_flickering_medpod', name: 'Flickering Med-Pod', acts: [1], text: '…', icon: 'event_medpod',
  options: [
    { label: 'Full cycle ({gamble_1}% heal to full / {gamble_2}% lose {max_hp_abs} Max HP).', next: 'after',
      effects: [{ type: 'gamble', outcomes: [
        { weight: 65, label: 'You feel whole.', effects: [{ type: 'heal', amount: { scale: 'missing_hp' } }] },
        { weight: 35, label: 'Something burns.', effects: [{ type: 'max_hp', amount: -6 }] }] }] },
    { label: 'Smash it (fight; win a common relic).',
      effects: [{ type: 'start_combat', encounterId: 'enc_event_choir', onWin: [{ type: 'gain_relic', rarity: 'common' }] }] },
    { label: 'Pay {gold_abs} gold: heal {heal} HP.', effects: [{ type: 'gold', amount: -30 }, { type: 'heal', amount: 12 }],
      available: (c) => (c.state.player.gold >= 30 ? true : 'Not enough gold.') } ],
  pages: { after: { text: 'The pod powers down.', options: [{ label: 'Leave.', effects: [] }] } } }

// Potion ("anywhere" potions set combatOnly: false and target 'none'; class potions set cls)
{ id: 'pot_halt_ampoule', name: 'Halt Ampoule', rarity: 'rare', target: 'enemy', combatOnly: true,
  text: 'That enemy skips its next move. Bosses are immune.', effects: [{ type: 'halt_enemy', target: 'target' }], icon: 'potion_halt' }
// Start boon (Ascent Pact): list 'safe' | 'trade'
{ id: 'pact_lean_start', list: 'trade', text: 'Remove {remove_card} cards from your deck. Lose all your gold.',
  effects: [{ type: 'remove_card', n: 2, choose: true }, { type: 'gold', amount: { per: -1, scale: 'gold' } }] }
```

**Gotchas.**
- A card that spends Shards (`shards: -n`) is unplayable without them.
- `ignoreBlock` skips Guard too.
- `ctx.now` throws on choices; use `queue`.
- Set `bound: true` on Burden: only `allowBound` removal (Purge) takes it, and it can't be Transmuted or Pruned away.
- Status ids `onslaught`, `exposed`, `stagger`, `rot`, `augury`, `halted`, `might`, `riposte_capacity`, `onslaught_keep`, `elite_hunted`, `backlash_primed` and `cost_tax` already exist; don't redefine them.
- The move id `__flee` is reserved.
