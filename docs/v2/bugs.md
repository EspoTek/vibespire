# Vibespire v2: bugs found by the real-browser harness

Found with `tests/e2e` (see `tests/e2e/README.md`): the game played in headless Chromium at ~40x speed
by an action-level driver (greedy policy through the screens' own dispatch path), an input-level
driver (mouse, keyboard and gamepad only) and fixture scenarios (every boss forced, shop and reward
relics). Each entry: symptom, cause, fix, test.

**The user's two reports:**
- "the first boss did not spawn": fixed (BUG-1). The boss node was never drawn on the map, so with the
  mouse there was nothing to click. Every boss of every act is now clicked from row 14 in e2e.
- "the shard-removal relic only costs zero at the next shop": fixed (BUG-2). A relic bought in a shop
  re-prices that shop at once.

**Batches run:**

| batch | jobs | result | failures |
|---|---|---|---|
| first 150-run batch | 253 jobs | 83 won, 113 lost, 46 failed | Found BUG-4, BUG-7, BUG-8, BUG-9 and BUG-10, plus the harness's environment failures (a page reload on network change, frozen tick yields). |
| scenario batches | | all 9 bosses spawned and were visible, every time | |
| 194-job batch | ran on 6 pages, before the resource limits | killed by the lead after 7 hours (RAM); about 25 jobs done, 6 won, 1 failed | The failure was the machine suspending (now handled), not the game. |

| final batch | `npm run e2e`: 50 jobs on 1 browser and 2 pages, 726 s | 17 won, 20 lost, 13 stopped (scenarios and capped runs); 27 reached act 3; 84 boss fights over all 9 bosses | 0 failures, 0 environment retries |

The batch before the final one found BUG-13 and BUG-14 (mouse input run). Both are fixed and verified
by a rerun of the input suite and the final batch.

## BUG-1 (major): the act boss never appeared on the map, so mouse players could not reach it

*User report: "the first boss did not spawn."*

- **Symptom.** After the row-14 rest site, the map showed a lime edge leading off the top of the map
  column with no boss node at its end. Clicking did nothing, so with the mouse the run could not go
  on. Keyboard and pad still worked, because focus landed on the (invisible) boss node and confirm
  travelled. The engine was fine: the boss node existed, `travel` to it was legal, and travelling
  started the boss fight.
- **Cause.** `src/render/game/mapLayout.ts` placed the boss at `y = pad - 4 = 10`, with `pad = 14`.
  The boss node box is 28 px (2x icon plus margin), so its top edge was 4 px above the content. The
  map screen hides every node widget that pokes out of the view (`MapScreen.applyScroll`), and hidden
  widgets are skipped by hit-testing, so the boss was never drawn or clickable at any scroll offset.
- **Fix.** `DEFAULT_MAP_LAYOUT.pad` is now 18, so the whole boss box lies inside the content.
  `MAP_NODE_BOX` (boss 28, node 16) is exported and used by `MapScreen` for the node sizes, so the
  layout and the screen agree.
- **Tests.** `tests/render/game.test.ts`, "every node box, the 28 px boss included, lies inside the
  content". In e2e: the `map-node-hidden` / `map-node-unclickable` invariant runs on every map step
  (it caught this on the first run), and the `boss-a<act>-<boss>` scenarios click every boss of every
  act from row 14, check the fight and the boss sprite, reload and CONTINUE mid-fight, then play it out.
  The save/continue path was verified too: no separate bug there.

## BUG-2 (minor): Shard Writ (and Vial Rack) bought in a shop only applied at the next shop

*User report: "the relic that makes the shard removal free not actually reducing the gold cost to
zero when you purchase it from the shop; only on the next shop does it cost zero."*

- **Cause.** Shop prices are computed once in `generateShop` through each relic's `modifyShopPrice`.
  Buying a price-changing relic in that shop did not re-price it. Shard Writ's free Shard removal and
  Vial Rack's 25% potion discount (and the new potion slot's purchases) waited for the next shop.
- **Fix.** `gainRelic` (`src/engine/items.ts`) calls `repriceShopForRelic` when a relic is gained in
  the shop phase. It runs that relic's own `modifyShopPrice` over every unsold price and both removal
  prices. That is the fold `generateShop` uses, with the new relic last in the modifier order, as it
  now is. Sold items keep their price. It applies once, so there is no double discount. The screen
  already redraws after every action, so the new prices show at once.
- **Tests.** `tests/bugs/shop-reprice.test.ts`: Shard Writ makes the Shard removal 0 gold at once,
  keeps the service, and the gold removal stays available. Vial Rack makes unsold potions exactly 25%
  cheaper and changes nothing else. A later purchase does not discount again. In e2e: the
  `shop-modifier` invariant (both removal prices equal what the current relics make them) on every shop
  step, and the `shop-writ` / `shop-rack` scenarios (buy with the mouse, check the price labels,
  remove a card with a Shard, buy a potion into the new slot).
- **Not covered.** Losing a price-changing relic while in a shop (no content does that today) would not
  raise the prices back.

## BUG-3: the reward screen's skip button printed TUNING's Shards, not what a skip pays

- **Symptom.** The button, its hint, the PROCEED note and the "CARD SKIPPED" line always said +1 ◆.
  A `skipShards` modifier changes what a skip pays: v1's Ascendant Prism made it 0. This breaks the
  rule that text is generated from the engine's numbers. Since the v2 relic rework no current relic
  has `skipShards`, so the bug is latent today, but the hook still exists.
- **Cause.** `RewardScreen` printed `TUNING.shards.skipReward`, not the modified amount.
- **Fix.** The engine exports `skipRewardShards(state)` (`src/engine/run.ts`; `skipCards` uses it too),
  and `RewardScreen` prints that number everywhere it mentions the skip.
- **Tests.** `tests/bugs/skip-shards.test.ts` uses a test-registered `skipShards` relic, so it does not
  depend on content churn. In e2e: the `reward-skip-text` invariant on every reward screen, and the
  `reward-skip` scenario, which clicks SKIP and checks that the Shards paid equal what the button said.

## BUG-4: crash at the end of a fight when the animator explains something that reads combat numbers

- **Symptom.** The crash screen on the winning blow, with either error:
  - `iron_patience outside combat`: the new Breaker power's status text;
  - `explain: no combat`: the new primed-chip tooltip, when a Riposte card was primed during the batch
    that ended the fight. This was the most common failure of the first 150-run batch: breaker seeds
    E2E0, E2E3, E2E6, E2E9, E2E12, E2E15 and E2E18.
- **Cause.** The combat animator plays an action's events after the engine has applied all of them.
  When that action ended the fight, `state.combat` is already `null`. Status rows and rack chips
  built during that last animation were explained against `this.state`.
- **Fix.** `CombatScreen.animState` is the current state, or the pre-action state that is being
  animated once the combat is gone. `statusViews` and `addRackChip` (its card lookup and
  `primedHint`) explain against it. This fixes the whole class for those two paths, whoever adds a
  combat-reading text next.
- **Test.** The e2e full runs and boss scenarios. It is a renderer bug, so there is no engine unit test.

## BUG-5: crash on hover/refresh when a minion flees after its leader dies

- **Symptom.** `Error: intent move __flee not on enemy gnasher` from the new combat tooltips
  (`src/render/game/explain.ts`, conveyance, in progress) when a leader died and its minion's intent
  became the engine's flee intent.
- **Cause.** `intentLine` looked up `intent.moveId` in the enemy's moves. The engine's `FLEE_MOVE`
  (`'__flee'`) is not one of them.
- **Fix.** `intentLine` describes `FLEE_MOVE` itself. The same line's `’` became an ASCII `'`, because
  the 4x6 font has no glyph for it (see BUG-6).
- **Test.** e2e (found by the mouse input run on graft, seed INP1). `tests/render/glyphs.test.ts`
  already guards the glyph part.

## BUG-6: crash on the first keyword tooltip (curly apostrophes in the glossary)

- **Symptom.** `tomthumb4x6: no glyph for "’"` as soon as a keyword box was drawn (the second action of
  every run).
- **Cause.** `src/content/keywords.ts` (conveyance, new) used `’` in six glossary texts. The bitmap fonts
  have no such glyph.
- **Fix.** Replaced with escaped ASCII apostrophes. `tests/render/glyphs.test.ts` (existing) fails on
  this class of bug, so `npm test` catches it too.

## BUG-7: crash when an enemy is summoned in the same batch that ends the fight

- **Symptom.** `CombatScreen: no combat state`, then (once that was fixed) `animator: unknown enemy 7`.
  Seen in the Mother Orchid fight: she Sows Buds on the enemy turn, and Rot or a Riposte kills her in
  the same end-turn batch. Also seen in 5 chronist / graft runs.
- **Cause.** The `enemy_spawned` / `enemy_transformed` animation called `sync()`, which needs
  `state.combat`. The later events for that Bud (Ripening, its death with its leader) looked it up in
  the live model, which only knew enemies from the pre-action or post-action combat. The Bud is in
  neither.
- **Fix.** Both handlers sync only while the combat exists. Otherwise the spawned enemy is registered
  in the live model with no on-screen numbers: it never gets a view, because it was born and removed
  within the final batch. `timeline_shifted` guards its re-sync the same way. `liveOf` stays strict
  for truly unknown enemies.
- **Test.** The `boss-a1-enc_a1_orchid` scenario (graft) reproduces it deterministically.

## BUG-8: a screen that failed to build left a silent black screen

- **Symptom.** After the bugs above, some runs ended on a black screen with no error. The reward
  screen's widgets stopped after "CHOOSE A CARD", and the input was dead. The harness reported it as
  "reward screen shows 0 cards".
- **Cause.** `ScreenManager.transition` chains transitions with `this.chain = run.catch(() => undefined)`.
  That handler marks `run` handled, and every caller `void`s the promise, so an exception thrown by a
  screen's `enter()`/`build()` was swallowed. The fade also stayed at black.
- **Fix.** The chain's catch logs the error and rethrows it in a task, so it reaches the crash screen
  (`main.ts`'s window `error` handler) and the harness. This follows the project rule: never suppress
  errors.
- **Test.** e2e: every hidden build error now fails with its real message (it unmasked BUG-9).

## BUG-9: the reward screen crashed (black screen, BUG-8) when it offered Reaping Vine

- **Symptom.** `Graft effect requires combat` while drawing the reward cards.
- **Cause.** Card text is rendered outside combat (reward, shop, deck view, rest). The engine's text
  resolver evaluates `fn` scales out of combat by design. Reaping Vine's `prunes_this_combat` threw
  when there was no combat.
- **Fix.** It returns 0 outside combat (no Prunes this combat yet).
- **Test.** `tests/bugs/card-text-contexts.test.ts` renders every card (and its upgrade) with a run state
  that has no combat, and with no state. It covers the whole class for new cards too.

## BUG-10: crash when a card made in the fight-ending batch is drawn

- **Symptom.** `CombatScreen: card 38 not found in any zone`, on the last end-turn of a fight
  (chronist seeds E2E17, E2E41 and E2E68 of the 200-run batch).
- **Cause.** An enemy shuffled a Backlash status card into the draw pile, it was drawn, and the fight
  ended, all in one action. The card is in neither the pre-action state nor the final one, which has no
  combat. The animator's `findCard` only looked there. This is the same class as BUG-7, for cards.
- **Fix.** The animator remembers every `card_added` card of the batch it plays (the event carries the
  card), and `findCard` falls back to those. It still throws for a truly unknown uid.
- **Test.** The e2e full runs. A headless replay of the failure's action log
  (`tests/e2e/out/<dir>/failure.json`) shows the event sequence.

## BUG-11: an old save would crash the game (live v1 players)

- **Symptom.** The v2 redesign removes cards (`overhand_drive`, `find_the_seam`, `planted_feet`,
  `prism_edge`, and more Graft / Chronist / shared cards), relics and statuses (`cinder_heart`). A
  live v1 player's save, or one from mid-combat on any older build, names those ids. CONTINUE, or any
  lookup in the save, would have thrown `unknown card id`.
- **Cause.** The save carried only an engine version. v1 and v2 shared version 2, and nothing checked
  that a save's ids still exist.
- **Fix.**
  - `ENGINE_VERSION` is 3. The v1 to v2 migration is removed, since no pre-v3 save can run on the new
    content.
  - `parseSaveOrIncompatible` (`src/engine/serialize.ts`) reports a save as incompatible, without
    throwing, when its version differs or when any id in it fails to resolve.
  - `unresolvedIds` (`src/engine/savecheck.ts`) checks the ids. It is generic: every card instance or
    offer anywhere in the state, every `statuses` map, plus relics, potions, enemies, encounters,
    events, boons, rest options, the class and the run history. A hand-maintained list of removed ids
    is not needed: cutting any id later is caught the same way.
  - `RunSession.open` deletes an incompatible save. The title checks the slot on entry and says "This
    run was saved by an older version of Vibespire and can't be continued. Start a new run!", and
    CONTINUE goes grey.
  - A malformed save of the current version still throws, because that is a bug or corruption.
- **Tests.**
  - `tests/bugs/old-saves.test.ts` uses **real v1 saves**: `tests/bugs/fixtures/v1-saves.json`, written
    by a `git worktree` of HEAD (the live v1 build), one per class, mid-combat on floor 4. It also
    covers a current save with removed card, status and relic ids injected, a clean current save, and
    corrupt saves.
  - The e2e `old-save` scenario puts the v1 save in the browser's save slot and boots. It checks:
    no error, the notice shown, the slot emptied, CONTINUE grey, and NEW RUN still working.

## BUG-12: a multi-card choice could explode the legal-action list (Overhaul, Clear-Cut...)

- **Symptom.** Overhaul ("upgrade 3 chosen cards", `src/content/events.ts`) with 33 or more
  upgradable cards made `choiceActions` list over 5,000 subsets and throw, and `Game.apply` validates
  against that list. Every multi-pick choice had the same shape: Clear-Cut's multi-Prune, Scry, Kiln
  Salts, Rewind Phial, Strip for Parts, Prism Garden, the lean-start pact...
- **Fix.** Multi-pick choices (`max > 1`) are answered step by step:
  - `choice_toggle {uid}` builds `PendingChoice.picked`;
  - `resolve_choice {uids: picked}` confirms;
  - the legal list is linear: confirm, then selects, then deselects;
  - single-pick choices are unchanged.

  Around it:
  - `choiceStep(pc, uids)` gives the next step toward an answer. The sim's `choiceAction` (all
    policies), the random policy, `RunSession.answerChoice` (UI modals: the steps are applied at
    confirm), the e2e drivers and `tests/answer-choice.ts` use it.
  - The tests that answered multi-picks directly now use `answerChoice(g, uids)`. These are in
    breaker, colorless, events, graft, graft_v2, potions, relics, chronist-v2, choice, fixes, v2,
    shared-v2 and guide_examples. `ENGINE_SPEC.md` documents the model.
- **Tests.** `tests/engine/choice.test.ts`: the scry answers step by step, `picked` stays in choices
  order, and a 3-of-40 pick lists 40 actions (not 9,880).

## BUG-13: a long treasure relic text covered PROCEED (mouse players stuck)

- **Symptom.** The input-level mouse run (breaker E2EI0) found Overture Engine's 6-line text on the
  treasure screen. The text ran over PROCEED, and the relic text's tooltip area (z above the button)
  took every click, so a mouse player could not leave.
- **Cause.** `TreasureScreen` used a fixed 150 px panel with PROCEED at y 234.
- **Fix.** PROCEED sits below the text (at least 6 px under it), and the panel grows to fit.
- **Test.** A new e2e `covered` invariant runs on every step of every run: every visible, enabled
  Button / ChoiceRow / ListRow must have a point where a click reaches it.

## BUG-14: crash when clicking a card that a relic put in the opening hand ("tryPlay: 18 not in hand")

- **Symptom.** Overture Engine puts a Power into the opening hand. After it was played and Scrapped, a
  later mouse click on a hand card crashed the game.
- **Cause.** On entering combat, the opening sync builds (hidden) frames for the final hand,
  including the added card. Then the `card_added` animation built a second frame for the same uid and
  overwrote the map entry. The first frame stayed in the focus scope, wired to that uid, and later
  caught a click.
- **Fix.** `card_added` to hand reuses the frame for that uid if one exists, and doesn't push the uid
  into the hand order twice.
- **Test.** The e2e `hand-stale` invariant: the number of navigable hand frames must equal the hand
  size on every player-turn step. The input runs replay the case.

## PERF: enemy AI purity check

- **Cause.** `aiCtx` deep-froze a `structuredClone` of the enemy for every `chooseMove` (every action,
  every forecast).
- **Fix.** `AI_PURITY.mode` (`src/engine/enemies.ts`):
  - `'frozen'` (deep-frozen clone: any write throws) in every vitest run (via
    `tests/setup-neutral-tuning.ts`) and in the dev build (`src/main.ts`, so the e2e harness too);
  - `'copied'` (the default: the simulator and production) gives an unfrozen copy with its own
    aiState, statuses, history, forecast, intent and rng. A write still can't reach the real state.
- **Result.** Same outcomes in both modes: 11 greedy runs reached the same 405 floors. Back to back on
  a heavily loaded machine (load average about 200), the 11 runs took 99 s frozen and 85 s copied,
  about 15% less.

## BUG-15: "shards would go negative" when a scheduled or replayed Crystal Graft resolved at 0 Shards (RULINGS 73)

- **Symptom.** The game crashed in `gainShards` during end_turn. The sim reproduced it with seed
  `v2-98-graft` (novice; `enemyHpPct.all=95`, `enemyDamagePct.all=75`) and earlier with seed
  `BENCH10` (greedy, graft). Set the Hour (Schedule) put Crystal Graft on the Timeline, and it came due
  with 0 Shards.
- **Cause.** Only repeat resolutions went through the ruling 66 Shard gate (`runRepeatResolution`).
  These resolutions enqueued the card's effects with no gate:
  - a Timeline resolution's first run (Delay, and Schedule including Cracked Hourglass delayed plays);
  - an autoplay's free play;
  - a Riposte list.

  Crystal Graft's `canPlay` checks Shards only when it is played from hand.
- **Fix (ruling 73).** Every non-play resolution is now queued as a `repeat_resolution` step:
  Timeline and Schedule (`resolveEntry`), autoplay (`resolvePlay` with `free`), Riposte
  (`fireRiposte`, new `list: 'riposte'`), and the existing Reprise, Total Eclipse and Answer in Kind. The
  gate runs once, in `runRepeatResolution` (`src/engine/cards.ts`), when the resolution starts. So it
  sees the Shards left by everything before it, even when several entries come due together. If the
  card's Shard cost can't be paid in full, the whole resolution is skipped with a text event, for example
  "Crystal Graft: the Scheduled resolution skipped (needs 1 Shard)." Other `canPlay` conditions are
  not re-checked. Hand plays are unchanged: `canPlayCard` already requires the Shards.
- **Audit.**
  - Covered by the gate: hand play (`canPlayCard`), autoplay, Timeline (Delay and Schedule), Cracked
    Hourglass delayed plays, Riposte, Reprise, Total Eclipse and Answer in Kind.
  - Not new resolutions: modal `choose` branches and `repeat` / on-beat repeats run inside the current
    resolution.
  - No content hook replays a card's effect list itself.
- **Tests.**
  - `tests/bugs/shard-gate.test.ts`: Crystal Graft scheduled at 0 Shards is skipped (text event, Shards
    stay 0, the entry leaves the Timeline); with 1 Shard it pays and resolves.
  - Both repro seeds now run to the end: `v2-98-graft` novice wins on floor 48, and `BENCH10` greedy loses
    on floor 30.

## Harness reliability fixes (not game bugs)

These came up while running hundreds of runs on a machine shared with several simulator batches.

- **Page-side code is sent as source text.** `VibePage.hook()` does this, with JSON arguments. A Node
  function serialised by Playwright carries tsx/esbuild's `__name` helper calls, which throw in the
  page. `tests/render/e2e-harness.test.ts` fails if a function is ever passed to
  `evaluate` / `waitForFunction` / `addInitScript` again. No `window.__name` shim is needed.
- **A dropped vite socket is an environment failure.** Vite's client reloads the page when its socket
  drops: a network change navigated every page of a batch at once ("Execution context was destroyed").
  The socket can't simply be turned off, because vite 8's client forwards logs over it and errors
  without it. Such runs are retried (below).
- **Fixed-step loop yields through one persistent MessageChannel.** A channel per tick could be
  garbage-collected before its message arrived, which froze the game loop ("no game time passed").
- **The idle timeout is in game time** (120 s of game time; 5 real minutes with no game time passing
  means a hung page). A loaded machine slows runs down but does not fail them.
- **Environment failures are retried once.** These are a dropped request (`ERR_NETWORK_CHANGED`), a
  navigated-away page and a boot timeout. The summary counts them (`retriedForEnvironment`).
- **`--snapshot`** runs from a copy of the tree, so other agents' edits can't change the code half-way
  through a batch.
- **The machine suspending is not a hang.** A gap of more than 30 s between the harness's own polls
  (the laptop slept, or the process was starved at load average 200 or more) resets the "no game time
  passed" clock. A batch did stall twice for about 17 minutes, then every page reloaded on wake.
- **Stalemates.** A fight past 100 turns ends the run as `stalemate`, the simulator's limit. One
  breaker seed fought the act 1 boss for 3,300 actions. That is a balance/policy matter, not a UI bug.

## Navigation note (not fixed: conveyance's area, in progress)

- In the deck view, the new ` VIEW UPGRADE (RT)` button sits under the bottom-left of the card grid
  (y about 335, partly covered by the third card row). From the last card, keyboard and pad "down" and
  "right" lead back into the grid. The REMOVE / CANCEL buttons are still reachable by going up and
  right, so this is not a trap: the input driver explores the focus graph and gets there. It reads
  as a layout overlap, though.

## Audit: "state changed but the open screen didn't refresh"

Checked with the per-step invariants (HUD, potion belt, relic strip, shop prices, reward contents,
hand/energy/HP in combat) across the runs, plus targeted scenarios:

| case | result |
|---|---|
| price-changing relic bought in a shop (Shard Writ, Vial Rack) | **BUG-2**, fixed |
| potion-slot change in a shop (Vial Rack with a full belt) | OK: the belt grows at once and potions become buyable |
| max-HP changes (pacts, events, cards) | OK: the HUD refreshes after every action |
| relic picked on the reward screen (elite relic) | OK: the HUD strip updates at once (`reward-relic`) |
| skip-Shard modifiers on the reward screen | **BUG-3**, fixed |
| card reward contents after taking a relic on the same screen | OK by design: rewards are rolled at combat end (as in STS) |
| rest heal preview vs. heal modifiers | OK today: no content uses `modifyHeal` (the preview would ignore it) |
| statuses / primed chips explained after the fight ended | **BUG-4**, fixed |
| enemy summoned in the batch that ends the fight | **BUG-7**, fixed |
| card created and drawn in the batch that ends the fight | **BUG-10**, fixed |
| a screen whose build throws | **BUG-8**, fixed (was a silent black screen) |
| boss relic → act transition → new map | OK (heal shown, new act's map and boss) |
| save + CONTINUE: map row 14, mid-boss-fight, every 37 actions of full runs | OK: the final states match a headless replay exactly |
