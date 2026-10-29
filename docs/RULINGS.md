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
