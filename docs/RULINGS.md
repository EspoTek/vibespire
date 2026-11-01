# Rulings (lead's decisions on GDD ambiguities)

These resolve questions raised by the card/enemy designers. They override `docs/GDD.md` where they conflict; the GDD will be patched to match. Implementers follow these.

## From the colourless pool review (2026-10-29)

1. **Colourless rarity split is 12 uncommon / 8 rare** (GDD §4.2 said 14/6; it is wrong).
2. **Colourless pricing**: cards are priced at −10% of class rate AND shops charge 120% gold for them. Both are intended: colourless cards are always available to every class, so the premium is paid twice (slightly weaker, slightly dearer). Put a line in GDD §8.5.
3. **Guard pricing**: the *rate table* wins (starter 6 / common 7 / uncommon 8 / rare 10 Guard per energy, i.e. 1 Guard ≈ 1 damage-equivalent). Delete the "Guard N = 1.2 × Block N" row from §8.5's conversion table.
4. **Missing prices**: AoE = price at 1.6 expected targets; one-combat Augury for a non-Chronist ≈ 2 d.
5. **Played Powers** leave play entirely: they are not discarded and not Scrapped, so "when a card is Scrapped" never fires for a Power you play.
6. **"Gain N Max HP" also heals N** (as `pact_hardy` does), unless the text says otherwise.
7. **`cap_prune_away` covers every in-combat permanent card removal** (Prune away, `torch_excise`, any `custom` removal): at most 1 per turn in total.
8. **Halt** (`pot_halt_ampoule`, `grav_clamp`): apply status `halted 1` to the enemy; a halted enemy's next move is skipped (its intent shows "HALTED"), then the status is removed and the enemy chooses its next intent normally. **Bosses are immune** (text greyed, "immune" on hover); elites are not. One `halt_enemy` custom/primitive shared by both.
9. **Self-applied Exposed/Stagger** on your own turn decays at the end of that same turn (GDD §2.10 decay rule). Designers must apply ≥2 to themselves for it to matter during the enemy phase. Add the note to §2.10.
10. **Cards added to hand by effects** (status cards such as Jitter/Drift included) count toward `cap_to_hand`.
11. **Deck-size payoffs**: lean-deck payoffs are the preferred shape; "damage per card in deck" is reserved for Graft "Mass" cards only.

## Enemy roster review (2026-10-29)

12. **Act 1 baseline damage**: the designer's own estimate says Act 1 costs ~141 HP for a baseline deck, 15–25 too many for the Chronist. Implement the roster as written and expose `TUNING.enemyDamagePct` (per act, default 100). The first simulator pass will sweep Act 1 at 85–100; do not pre-nerf individual moves.
13. **Status cards in Act 3**: `echo_cantor`'s punish move shuffles 1 `status_drift` into the draw pile (corrected: there is no Vacuum Chill status card; Vacuum Chill is a curse).
14. **Elite relics** drop by the normal elite roll; `EncounterDef.relicBias` is optional and may be ignored in v1.

## From the Graft pool review (2026-10-29)

15. **AoE pricing**: 0.8 × rate per target, assuming ~2 targets (consistent with ruling 4's 1.6 expected targets).
16. **Prune pricing additions**: Spread Prune = 5 d (same as Prune 2); a plain "a Bloom card gains 1 Bloom" effect = 3 d; Rot on a card is priced at the mean of its first-application and stacked values.
17. **`onPrune` fires only when a card was actually Scrapped** by the Prune; a declined Prune fires nothing. Prune away counts as a Prune. Spread Prune fires one `onPrune` and one `onBloomGained` per card that grew.
18. **Bloom Powers** lock in the Bloom value the copy had when played.
19. **Moving Bloom between copies** (Transplant) and **creating a run-deck copy at Bloom 0 mid-combat** (Propagate; joins the deck immediately, not in any pile this combat) are legal.
20. **Negative `shards` amounts spend Shards**; a card that spends Shards is unplayable (`canPlay` reason "no Shards") when the player has none.
21. **Hooks may open choices**: an end-of-turn Prune (Dusk Pruning) is legal — hooks enqueue effects (`ctx.queue`) rather than running them synchronously, so a `pendingChoice` can open from a hook. The engine must support this.
22. **Text placeholders `{<key>_per}`** render a scaled amount's `per` value ("+{damage_per} per Bloom") so no digits are typed into card text.
23. **Prune is a tag/effect, not a keyword**: `keywords` lists only engine keywords (`exhaust`, `retain`, `innate`, `unplayable`, `riposte`, `bloom`, `delay`); `prune` goes in `tags`.

## From the Chronist pool review (2026-10-29)

24. **Forecast-gated payloads** are priced at face ÷ 1.4 (the GDD's "+40%").
25. **Conditions and amounts inside `delay.effects` are evaluated at resolution time** (GDD §2.8); a Delay 1 card's "if the enemy intends to attack" therefore reads what was the forecast at play time. Energy and draw from Timeline resolutions count toward `cap_bonus_energy` / `cap_draw`.
26. **`cap_relay`**: a card that resolved from the Timeline this turn is unplayable for the rest of that turn.
27. **Forecast scales**: `forecast_damage {who}` sums every *forecast* attack move (depth ≥ 1; Prophet Glass therefore raises it); the engine also provides a built-in `intent_damage {who}` scale for the *current* intent's total attack damage (replaces the designers' `target_intent_total` named function). **Hidden ("?") forecast entries count as not-an-attack and 0 damage.**
28. **On-beat inside triggers**: hook/trigger info carries `onBeat` so a Power's "when you play a card on the beat" can read it. Repeat effects such as Offbeat Drum + Polyrhythm add one repeat each, at most 3 runs of an on-beat clause.
29. **AoE price is consistent across pools**: an all-enemies card's per-target number is 0.8× the single-target rate (equivalently, AoE damage is valued at 1.25× per target and ~2 targets are expected).
30. **Glue counts as an archetype** for the "≥30% of commons fit two" check.
31. **Bosses telegraph their charge cycles** (ENEMIES.md already gives fixed schedules for Bramble Ram and Furnace Heart), so Delay 2 cards can be aimed with Augury + pattern knowledge.

## From the Breaker pool review (2026-10-29)

32. **Id collision**: the Breaker power `furnace_heart` collides with the Act 2 boss `furnace_heart`. The **card** is renamed `cinder_heart` ("Cinder Heart"); the boss keeps its id. Ids are unique across all registries and asset folders.
33. **"Spend all Onslaught" at 0 Onslaught** still runs its clause with 0 spent (so a base hit still lands). "Spend N" with fewer than N skips the clause (GDD §2.1).
34. **`attacks_played_this_turn`** counts Attacks whose play has *finished*; the card being played is not counted (same convention as Onslaught).
35. **Onslaught gained before your turn** (start-of-turn Powers, Riposte on the enemy phase) is priced at 3 d per point.
36. **Attack cancellation cards** (Steal the Swing: cancel one enemy attack at declaration, Scrap) work on bosses; this is distinct from Halt (ruling 8), which skips a whole move.
37. **`onslaught_keep` with a halving relic**: Onslaught at reset = max(floor(half), min(Onslaught, keep)).
38. **Exposed pricing stays at 3 d for now**; the simulator's Exposed telemetry (GDD §8.6 item 5) decides whether its decay rule changes. Designers cap self-applied stacks per card at 2–3 and multi-hit cards at 4 hits.
39. **Card text over 70 characters** is allowed up to ~100 for Riposte cards and run-effect rares; the renderer shows the full text on the enlarged focused card and the tooltip.

## From the first real-content simulator baseline (2026-10-29)

40. **Chitin Cocoon loses Keep.** At Bloom 10 the upgraded copy gave 34 Block every turn for 1 energy and stalled the Act 1 boss for 100 turns. Without Keep it is drawn like any other card.
41. **Echo Cantor** adds `status_drift` (ruling 13 corrected).
42. **Timeline entries whose stamped enemy is dead with no enemy left** fizzle to their pile without resolving (engine fix in `timeline.ts`).
43. **Standard Prune never wastes its Bloom.** If no eligible Bloom card is in your hand, a random eligible Bloom card in your draw or discard pile gains it (reverses GDD override 2; the simulator showed Bloom engines starving: average max Bloom 3.8 at run end). Choosing the copy in hand stays the skill expression.
44. **Global balance levers (simulator-tuned, 2026-10-29):** `TUNING.enemyDamagePct` and `TUNING.enemyHpPct` are 85 in every act. Tests run them at 100 (`tests/setup-neutral-tuning.ts`), so content tests check the designers' raw numbers.
45. **Graft starting HP 78** (was 70; simulator: 5.5% → 10% win with greedy).
46. **Binding Contract** also makes every later card reward offer one card fewer (simulator: win delta +45 with the old drawback, the largest of any relic).

## v2 rulings (2026-10-30)

47. **Embers cap** (Breaker v2): `TUNING.caps.embers = 10`.
48. **Shed** (amended after implementation). Shed N needs N Guard; with less, the Shed clause is skipped, like Spend N. "Shed all" at 0 Guard still plays and sheds 0. A 0 Shed does not fire `onGuardShed` or `guard_shed`. Why: with "Shed what you have", Shed Plating and Loosen Straps became free energy and draw at 0 Guard, and the hold-then-spend choice disappeared.
49. **Off-turn draw and energy** (Answer in Kind, and any effect that draws or gains energy during the enemy turn) are banked to the start of your next turn. They don't count toward the current turn's caps. The engine keeps a generic next-turn bank for this.
50. **Prism Edge cut.** The Breaker has no class Shards card; Shards interactions come from the shared pool.
51. **Spill** (Graft v2) supersedes GDD §2.4's "excess Bloom is lost". Overflow Bloom, and a Prune with no eligible target, go to the least-grown uncapped Bloom card in the deck (ties: random from `rng.misc`, the combat-random stream the Bloom code uses). Sim A/B switch: `TUNING.bloomSpill`.
52. **v2 starters may change.** v2 designs may edit GDD §4.1 starters (Seed Bite gains "Ripe: Prune"). The v2 design docs supersede the GDD where they conflict.
53. **Harvest kill spreads the full stack.** If Harvest's HP loss kills the enemy, death-spread uses the Rot the enemy held when it died, i.e. before the halving. The sim watches Rot Censer combos for this.
54. **Chaff is a Status card.** Status synergies (Scrap Magnet, Shed Husk and the like) apply to it.
55. **Phase-B cuts wait for the data.** Designers implement new and reworked cards first. Cuts and numeric retunes of existing cards wait for `docs/balance/report-v2-baseline.md`.
56. **Chronist v2 drops Stagger and Exposed from its class pool.** They stay shared mechanics, reachable through colourless cards and relics.
57. **Whistle for Wind (0-cost Goad + draw) is allowed at common.** The GDD bans only energy gain, card return and cost reduction on commons.
58. **Schedule ignores "only on the beat".** Scheduling a beat-only card such as Zenith is an intended Johnny discovery.
59. **The Chronist v2 pool is 58 cards** (4/20/20/14).
60. **The v2 shared pool.**
    - Apply the §8.3 trim, which leaves about 101 relics.
    - Colourless rarity is 21 uncommon / 14 rare. This supersedes ruling 1's 12/8.
    - Cut Assay Scale.
61. **The shop stocks `TUNING.shopColorless` colourless cards**, default 3. Fall back to 2 if `ShopScreen` can't lay out 3 cleanly at 640x360; the UI decides, and the lead is told.
62. **Strain can't take you below 1 HP.** Strain payments stop at 1 HP: the HP is lost, but the floor is 1.
63. **Salvage outside your turn** (for example a Scrap during the enemy phase) is deferred to the start of your next turn, through the next-turn bank (ruling 49).
64. **Reprise and "Spend all" cards.** The second resolution spends whatever is left at that point, usually 0. The card text makes this clear.
65. **The "a card resolves at most twice" rule holds for every source.** Reprise, Total Eclipse and Answer in Kind all follow it, and they don't stack past two resolutions.
66. **Repeat resolutions re-pay Shard costs, or are skipped.** A repeat or non-play resolution of a card's effect list (Reprise, Total Eclipse's second run, Answer in Kind's played list) pays the list's Shard cost again: the negative `shards` effects at the top of the list. If you can't pay it in full when that resolution starts, the whole resolution is skipped: nothing resolves and nothing is paid, and a text event says why. Spend N, Shed N and Strain need no gate, because they never fail (Spend N with too few skips its clause, ruling 33; Shed N with too little Guard skips its clause, ruling 48 as amended; Strain stops at 1 HP, ruling 62). The engine implements this in one place, the `repeat_resolution` step (`runRepeatResolution` in `src/engine/cards.ts`).
67. **Phase D: parity first, then global levers.** Final tuning happens in two steps.
    - First, class designers bring each class to spike 55–62% at the current levers (`enemyDamagePct` 85 / `enemyHpPct` 85).
    - Then the sim agent sweeps `enemyHpPct`, holding damage at 85, until spike is 30–45% for every class.
    - No designer changes the global levers.
68. **Fixed Star must not switch off Crescendo.** The shared designer reworks it. It keeps its identity (rewarding a fixed, predictable turn shape) but drops any clause that suppresses Crescendo, Cadence or beat timing. The Chronist designer reviews the new text.
69. **Colourless cards can appear in card rewards.** A card reward has a `TUNING.rewardColorlessChance` chance (default 0.12; 0.25 from elites) to replace one class card with a colourless card of the same rarity roll. The shop still stocks `TUNING.shopColorless`. Owner: the shared designer.
70. **Colourless reward and shop rolls lean toward engines you've started.** When a card reward rolls a colourless card (ruling 69), or a shop fills one of its colourless slots (each slot independently), it picks from colourless cards of shared engines you've started with probability `TUNING.colorlessEngineBias` (default 0.5). A shared engine counts as started when you own one of its cards or relics. Otherwise the pick is uniform. The sim counts engine relics, as well as deck cards, toward shared-engine assembly. Owner: the shared designer.
71. **Two difficulty tiers, chosen at run start.** One HP lever can't serve both the planner bot and casual players: at HP 110, timmy and novice win 0–5%.
    - **Standard** is the default. It uses `TUNING.difficulty.standard.enemyHpPct`. The sim agent sets the value as the highest HP at which timmy averages at least 15% and novice at least 8% across the classes.
    - **Heroic** uses `enemyHpPct` 110, the Phase D sweep value that puts spike at 30–45%.
    - Enemy damage stays at 85 in both tiers.
    - The tier is stored in the run state, shown on the run HUD and the run summary, and selectable on the class-select screen. Heroic is always available.
    - PHASE_C's spike and johnny targets apply to Heroic. Its timmy and novice targets apply to Standard.
72. **Scrap has a floor.** Scrap can't reduce your combat deck (draw + discard + hand) below 8 cards. A Scrap that would go below the floor does nothing, and a text event says why. This is enforced once in the engine for every source (Gravity Loom, Triage Locker, cards). Owner: the shared designer.
73. **Every non-play resolution goes through the ruling 66 Shard gate.** That covers Timeline and Schedule resolutions, Delay, autoplay and duplicates.
    - The card's Shard cost (the negative `shards` effects at the top of its list) must be paid in full, or the whole resolution is skipped, with a text event.
    - Other `canPlay` conditions (such as "needs a Bloom card") are not re-checked for non-play resolutions. They gate playing the card from hand, not effects that are already scheduled.
    - Implemented once, in `runRepeatResolution` or a shared helper, for every source.
74. **Amends ruling 71: enemy damage is set per tier.** The Phase E sweep found that no HP value alone gets casual play to its targets, because novice runs are decided by incoming damage.
    - `TUNING.difficulty.<tier>` now holds both `enemyHpPct` and `enemyDamagePct`.
    - **Standard:** HP 85, damage 75. Timmy 22%, novice 10.7%.
    - **Heroic:** HP 110, damage 85.
    - The final confirm run also tests HP 90 / damage 75 for Standard. If that still meets the timmy and novice targets, Standard moves to HP 90.
75. **Phase F is the last content round.** After it, content is frozen. The sim agent regenerates priors from a full v2-measure pass and runs one final scorecard, and after that only crash or soft-lock fixes are allowed. Phase F scope:
    - Graft: Molt (+39), Canopy;
    - Breaker: the negative E5 cards;
    - Chronist: novice at Standard;
    - shared: the shared engines, Scrapheap in particular.
76. **Standard gives classes a starting max-HP bonus, per class.** `TUNING.difficulty.standard.classMaxHpBonus` defaults to `{ breaker: 0, graft: 0, chronist: 10 }`. Heroic has no bonus.
    - Phase F found that novice Chronist loses because it starts with a small HP pool (66). No card change could help it without making Heroic spike much stronger.
    - The bonus is applied once, when the run is created, and the class-select screen shows the tier's starting HP.
    - The final scorecard checks that novice Chronist reaches at least 8% on Standard.
77. **Shared-engine extra offer, and Salvage when the floor keeps a card.** Phase F, shared designer.
    - **Extra offer.** Once you've started a shared engine (ruling 70), a card reward has a `TUNING.colorlessEngineExtra` chance (0.3) to also offer one of that engine's colourless cards. The card is added, not swapped for a class card, up to `TUNING.rewardMaxCards` (4). This doesn't apply to fixed-rarity screens.
    - **Salvage on the floor.** When the ruling 72 floor keeps a card, its Salvage still fires. The card doesn't count as Scrapped, so it fires no onExhaust or onCardExhausted, and Scrap-count payoffs ignore it.
78. **Content is frozen. Breaker F7 ships.** Cheap Breaker build-around Powers that replace themselves (they draw when played) beat costlier versions that measure as deck-negative.
    - Spike Breaker at about 47% on Heroic is accepted if the final scorecard confirms it is within a few points of the 30–45 band.
    - Molten Shell ships as is ("8 Guard, draw 1" at cost 1). Its negative counterfactual is attributed to how the bot drafts around it, not the card itself.
    - From here on, only crash and soft-lock fixes are allowed.
