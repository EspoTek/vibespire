# Balance changelog

## 2026-10-29 — first card/relic pass (greedy bot, real content)

**Brief.** Every class 22–32% bot win, class spread ≤ 8 points, Act 1 boss beaten ≥ 85%, Act 2 boss beaten ≥ 40%, with
the global levers left alone (`enemyDamagePct` / `enemyHpPct` 85 in every act, RULINGS 44; Graft HP 78, RULINGS 45).
Only card and relic numbers changed. No keywords were added, no text was hand-written, and every card keeps its
archetype tags and role.

**Method.** `sim/batch.ts --policy greedy --runs 300 --workers auto`, one class per batch. Tuning used seed prefix
`tune` (the Graft also ran 600-run batches on it). Two more prefixes, `hold` and `final`, were each played once with the
nearly finished numbers. They are not clean held-out sets: the Chronist's Storm Warning was checked on `hold`, and
one Graft package was checked on `hold` and `final`. The held-out result in `report-tuned.md` uses a fourth prefix,
`val`, which no change saw. The batch outputs are in `sim/out/tune/` (git-ignored scratch).

**Noise.** One 300-run batch has a standard error of about 2.5 points at 25%. The same configuration on different
seed sets gave the Graft 19.3 / 22.3 / 28.3 (see "Seed-set spread" below), so read a single batch as ±5 points.
Several single changes below are "not measurable": the change was smaller than the noise.

### Baseline (prefix `tune`, before any change)

| class | win | beat A1 boss | beat A2 boss | deaths A1/A2/A3 |
|---|---|---|---|---|
| Breaker | 38.0% | 96.0% | 53.0% | 7 / 69 / 24 |
| Graft | 7.3% | 86.0% | 26.0% | 15 / 65 / 20 |
| Chronist | 16.7% | 87.7% | 28.3% | 15 / 71 / 14 |

All three classes die mostly in the Act 2 hard hallways (`enc_a2_oracle_pack`, `enc_a2_oracle_golem`,
`enc_a2_golem_riveter`, `enc_a2_drone_riveter`): multi-enemy fights with multi-hit attacks and Exposed on the player.

### Changes

"Batch" names the `sim/out/tune/<batch>-<class>.json` run that first included the change; "effect" is the win-rate
move of that batch against the previous one on the same seeds (several changes share one batch).

#### Breaker (nerf: 38% → about 30%)

| card / relic | change (base / upgraded) | reason | batch → effect |
|---|---|---|---|
| `riven_gauntlet` (starter relic) | Guard per Riposte trigger 3 → 2 | Guard was 59% of the Breaker's damage prevented and the relic fires ~59 times a run, so it is the class's largest Guard source. The relic keeps its job (the +1 Onslaught Duellist→Swing bridge). | i2: 38.0 → 30.7 (with Kept Fury). Guard 1 was also tried (i10: 24.7, A2 boss 38.3%, too far) and rejected. |
| `kept_fury` (uncommon relic) | keep 2 → 1 Onslaught | Baseline relic outlier (+25.7 win Δ in the brief). Against other Breaker relics it is mid-pack (survivorship), so this is a small trim, not the main lever. | i2 (shared with the Gauntlet) |
| `brace` (starter) | 6 / 9 → 5 / 8 Guard | The second step of the Guard trim. Tuning runs had the Breaker at 30.7–33% with the Gauntlet change alone, too close to the 32% ceiling and 8+ points above the Graft. | i11: 30.7–33.0 (i2, i9) → 27.3 |
| `thresher_arc` (common) | 4 / 6 → 5 / 7 base AoE | Bottom-5% pick rate (5.5%), and the Breaker dies in Act 2 width fights. It offsets some of Brace's Act 2 loss (i11 had the Act 2 boss at exactly 40%). 6.5 per target is now above the 5.6 AoE cap of RULINGS 29. | measured only inside the held-out runs |

`binding_contract` was **not** changed: see "Needs a design change".

#### Graft (buff: 7% → about 24%)

Its weakness is defence: it kills fastest (4.0 turns a fight) but loses the most HP (10.9 a fight against the
Breaker's 7.2). Prune Scraps Husks, so the Prune cards have to carry the Block. The bot's Graft decks are mostly Prune
cards and Powers, with Bloom concentrated in Seed Bite.

| card | change (base / upgraded) | reason | batch → effect |
|---|---|---|---|
| `husk` (starter) | 5 / 8 → 6 / 9 Block | The Graft's Defend is the one Block card in every deck. | j5 (600 runs): 21.0 → 22.3, Act 2 boss 42.2 → 45.8 |
| `shed_husk` | 3 / 6 → 5 / 8 Block (two steps) | Most-picked common (84%); Prune + Block. | g1 (+1) and i4 (+1). A third step (6 / 9) was tried and reverted: over rate, and not measurable. |
| `deep_graft` | 2 / 5 → 3 / 6 Block | Prune card Block | g1 |
| `windblown_seed` | 3 / 6 → 4 / 7 Block | Prune card Block, 6.6% pick | g1 |
| `seed_rain` | 3 / 6 → 4 / 7 Block | Prune card Block | g1 |
| `chitin_ram` | Block 3 → 4 (both) | Block on a Bloom attack, 13% pick | g1 |
| `tendril_reach` | base Block 2 → 4 (two steps) | Block + draw, deck Δ +21 | g1 (+1), final package (+1) |
| `sap_shell` | base Block 4 → 6 (two steps) | The common Bloom wall, 8.7% pick | g1 (+1), i6 (+1) |
| `root_mesh` | 2 / 5 → 4 / 7 base Block | Bottom 5% (3.6%): 3 Block on floor 1 was a trap | g1 |
| `mire_carapace` | 4 / 6 → 6 / 8 base Block (two steps) | Bottom 5% (1.1%) | g1 (+1), i2 (+1) |
| `burl_wall` | base 8 → 10 Block | Uncommon Bloom wall | g1. A further step (12) was not measurable (j3) and was reverted. |
| `chitin_cocoon` | base 4 → 5 Block | Rare Bloom wall | i3 |
| `living_hedge` | cost 2 / 1 → 1 / 0 | The Graft's scaling defence (Block per Bloom card at turn start). Pick 20% → 73%, deck Δ +16. | i4 (with Shed Husk +1 and Choking Spores): 12.3 → 20.3 |
| `choking_spores` | Stagger 1 / 2 → 2 / 3 | The Graft's only Stagger; Act 2 deaths are multi-hit packs | i4 |
| `thornwhirl` | base 7 → 9 AoE (two steps) | Common AoE, 8% pick | g1 (+1), i6 (+1) |
| `miasma_sweep` | base 4 → 5 AoE | Act 2 width | i3. A further step (6) was not measurable (j3) and was reverted. |
| `thresher` | base 3 → 5 AoE (two steps) | 85% pick; fires on every Prune | i3 (+1), final package (+1) |
| `decomposer` | 1 → 2 Rot per Prune | 84% pick but ~1.3 Prunes a combat: a near-blank | i3 |
| `thorn_halo` | base 3 → 4 | | i3 |
| `hyphal_web` | wide-draw threshold 8 → 6 Bloom cards | The bot's decks end with about 6 Bloom cards, so the second draw never came online | i6 |
| `barb_flick` | base 2 → 3 | Bottom 5% (1.4%) | g1 |
| `hivestrike` | 3 / 6 → 4 / 7 | Bottom 5% (4.1%) | g1 |
| `spore_lash` | damage 3 → 4 (both) | Bottom 5% (1.0%) | g1 |
| `canker_bite` | 3 / 6 → 5 / 8 (two steps) | Bottom 5% (0.6%) | g1 (+1), i2 (+1) |
| `mulch_maul` | 4 / 7 → 5 / 8 | Bottom 5% (0.8%) | g1 |
| `verdant_tide` | 3 / 4 → 4 / 5 per hit | 0% pick | i2 |

Effects by batch: g1 (16 first steps: Shed Husk, Deep Graft, Windblown Seed, Seed Rain, Chitin Ram, Tendril Reach, Sap Shell, Root Mesh, Mire Carapace, Burl Wall, Thornwhirl, Barb Flick, Hivestrike, Spore Lash, Canker Bite, Mulch Maul): 7.3 → 13.3. i2: 13.3 → 14.0. i3: 14.0 → 12.3 (noise). i4: 12.3
→ 20.3. i6: 20.3 → 22.0. j5 (600 runs, Husk): 21.0 → 22.3.

#### Chronist (buff: 17% → about 27%)

| card | change (base / upgraded) | reason | batch → effect |
|---|---|---|---|
| `storm_warning` | Stagger 1 → 2 | Act 2 deaths are multi-hit packs; the Oracle's Stagger Power | `tune` 25.0 → 27.0 (Act 2 boss 44.0 → 50.0); `hold` 24.3 → 24.0 (Act 2 boss 38.7 → 42.3) |
| `heave_to` | base Guard 2 / 5 → 4 / 7 (two steps) | 51% → 63% pick, deck Δ +23 | i3 (+1), i6 (+1) |
| `breakwater` | 7 + 10 / 9 + 13 → 8 + 11 / 10 + 14 Block | Act 2 defence, 55% pick | i3 |
| `storm_glass` | delayed Block 7 / 9 → 8 / 10 | Act 2 defence | i3 |
| `weather_eye` | 5 / 7 → 6 / 8 Guard | Act 2 defence | i3 |
| `lighthouse` | 10 / 10 → 11 / 11 (upgraded 13 / 13 → 14 / 14) | Act 2 defence | i6 |
| `knell` | immediate AoE 3 / 4 → 4 / 5 | Act 2 width | i3 |
| `spring_tide` | 14 / 18 → 16 / 20 AoE | Act 2 width | i3 |
| `striking_train` | 2 / 3 → 3 / 4 AoE per beat play | Act 2 width | i5 |
| `carillon` | 2 / 3 → 3 / 4 AoE | Act 2 width | i5 |
| `watch_bell` | Block per resolution 2 → 3 | Deck Δ +27 at 24% pick | i5 |
| `sweep_hand` | 8 / 11 → 9 / 12 | Act 2 width, 12% pick | i2 |
| `downbeat` | 11 / 14 → 13 / 16 | Bottom 5% (0.5%) | i2 |
| `pinion_jab` | 2 / 3 → 3 / 4 | Bottom 5% (0.8%) | i2 |
| `slack_water` | 6 / 8 → 7 / 9 (upgraded 8 / 11 → 9 / 12) | Bottom 5% | i2 |
| `turn_the_tide` | base 3 / 6 → 4 / 7 | Bottom 5% (3.2%) | i2 |
| `balance_wheel` | 5 / 7 → 6 / 8 Block | Bottom 5% | i2 |
| `dead_reckoning` | base 0 / 1 → 1 / 2 | Bottom 5% (0.6%) | i2 |
| `logbook` | base 4 / 6 → 5 / 7 | Bottom 5% (1.2%) | i2 |
| `reef_the_sails` | 4 / 6 → 5 / 7 Block | Bottom 5% (0.6%) | i2 |
| `wind_forward` | fallback Block 3 / 5 → 4 / 6 | Bottom 5% (1.0%) | i2 |

Effects by batch: i2 (the bottom-5% commons): 16.7 → 16.0, not measurable. Their pick rates barely moved (Downbeat
0.5% → 1.3%), because the bot's reward model ranks them below the Powers and Delay rares whatever their numbers. i3:
16.0 → 20.7. i5: 20.7 → 23.0. i6: 23.0 → 25.0. i12 (Storm Warning): 25.0 → 27.0.

#### Tried and reverted (no measurable effect, or a worse trade)

| change | result |
|---|---|
| `fungal_aegis` cost 2 / 1 → 1 / 0 | 300 runs: +3.4; 600 runs: 21.0 → 21.5. Not worth a rule-breaking 0-cost "Block = Rot" Power. |
| `graft_hide` 5 / 7 → 6 / 8 | 22.0 → 19.0 (noise) |
| `deep_graft`, `windblown_seed` +1 more Block; `spore_haze` Rot 2 / 3 → 3 / 4 | 22.0 → 19.7 |
| `burl_wall` base 12, `miasma_sweep` base 6 | 600 runs: 21.0 → 21.2 |
| `ripening_rot` 1 → 2, `leaf_litter` Rot 1 / 2 → 2 / 3 | 600 runs: 21.0 → 19.2 |
| `recoil_spring` cost 1 / 0 → 2 / 1 | Breaker 30.7 → 33.0 (no nerf visible) |
| `riven_gauntlet` Guard 1 | Breaker 24.7 and Act 2 boss 38.3%: too far |
| `shed_husk` 6 / 9 (a third step) | `hold` 28.3 → 25.0, `final` 19.3 → 24.7 (with the Tendril Reach and Thresher steps). Reverted because it takes a common Prune card 50% over rate for a gain inside the noise. |

### Results

Held-out prefix `val` (no change was ever tested on it), 300 runs per class: `docs/balance/report-tuned.md`.

| class | win | reach A1 boss | beat A1 boss | beat A2 boss | deaths A1/A2/A3 | target |
|---|---|---|---|---|---|---|
| Breaker | **30.7%** | 99.3% | **94.3%** | **45.3%** | 8 / 71 / 21 | met |
| Graft | **24.0%** | 99.7% | **96.7%** | **49.3%** | 4 / 62 / 33 | met |
| Chronist | **27.3%** | 96.0% | **93.0%** | **47.0%** | 10 / 63 / 27 | met |

Spread 6.7 points (target ≤ 8). Every class is inside 22–32%, beats the Act 1 boss ≥ 85% and the Act 2 boss ≥ 40%.

**Seed-set spread** (the final numbers on the other seed sets they were played on):

| class | `tune` | `hold` | `final` | `val` |
|---|---|---|---|---|
| Breaker | 27.3 (before the Thresher Arc step) | 31.0 | 30.7 | 30.7 |
| Graft | 22.3 (600 runs, before the last Tendril Reach / Thresher steps) | 28.3 (same) | 19.3 (same) | 24.0 |
| Chronist | 27.0 | 24.0 | 31.0 | 27.3 |

The Graft is the class closest to the floor. Its pooled estimate is about 23–24%, so a different 300-run batch can
land under 22%. Use 1000-run batches before signing off a smaller move.

Still outside the GDD §8.4 bot targets, which this pass did not aim at: the Act 2 death share is 62–71% (target ≈ 40%),
and the Graft's cap hits are 46.9% of turns (`cap_stacks`: Bloom overflow at the cap of 10 and Rot at the cap of 15;
the baseline was already 32.6%).

### Needs a design change rather than numbers

1. **The Act 2 hard hallway pool is the real problem.** On the held-out seeds, all three classes die 62–71% in Act 2 (target ≈ 40%), to the
   same four encounters: `enc_a2_oracle_pack`, `enc_a2_oracle_golem`, `enc_a2_golem_riveter`, `enc_a2_drone_riveter`.
   Each is two or three enemies with multi-hit attacks and Exposed on the player, back to back with no healing. The
   card buffs here (Block, Stagger, AoE) treat the symptom. The enemy owner should look at their HP and damage, or at
   how many hard fights an Act 2 path can chain together.
2. **Binding Contract has no numeric lever.** Its win Δ is +44.7 (Breaker) and +41.3 (Chronist), against +32 for Ghost
   Lantern and −33.5 for Cracked Hourglass, and every boss relic carries the same survivorship. The bot almost never
   suffers from "you must take a card": it skips about 25% of rewards, and every pick is still a card it rated. The
   only number is the energy, which cannot drop below 1. It needs a drawback that bites, such as a curse on pickup or
   a cost on the forced pick. Cracked Hourglass ("enemies act first") is the outlier in the other direction, and the
   bot still takes it 40–67% of the time.
3. **A bot blind spot penalises the Graft.** When surviving the enemy turn needs two or more Block cards, each card on
   its own scores 0 (the bot dies either way), so the bot plays damage instead. An example is `tune-12-graft` against
   Leukarch, turn 13: 52 HP, 66 incoming, and the bot ended the turn with 3 energy and Husk, Husk, Shed Husk in hand.
   `continueTurn` in `sim/policies/lib/combat.ts` skips any card whose own gain is ≤ EPS. This hurts classes whose
   Block comes in small pieces (Graft), and it is probably part of why the Graft wins only 42–54% of the runs that
   reach Act 3, against the Breaker's 62–69%. It belongs to the simulator owner. Re-tune after it is fixed: several Graft
   buffs here may then be too strong for humans.
4. **The bot's card-reward model distorts the pick-rate suspects.** Powers get a flat 5 + 1.5 × rarity, and every
   `custom` effect counts 4 d, so the Graft fills up on Dusk Pruning, Decomposer and Shed Husk (80–87% picks). Cards
   that scale with the deck or with an `fn` value are undervalued: Fungal Aegis is picked 10% with a deck Δ of +25, and
   Transplant and Propagate were never picked in any run. Bottom-5% commons barely respond to numbers (Downbeat at 13
   damage is still picked 1.3%). Treat "bottom 5% pick rate" as a bot-model signal, not proof that a card is weak.
   Transplant and Propagate need a human playtest, not numbers.
5. **Bloom and Rot overflow** (`cap_stacks` in 46.9% of Graft turns) is wasted resource, not a loop. Standard Prune
   (RULINGS 43) and the bot's Prune targeting keep feeding a copy that is already capped. A rule that Prune skips capped
   copies would turn the waste back into value without changing any number.
6. **Over-rate after tuning.** Recheck these once points 1 and 3 are fixed. Thresher Arc deals 6.5 per target against
   the 5.6 AoE cap (RULINGS 29). Living Hedge at 1 energy is about 1.8× the Power formula (GDD §8.5). Tendril Reach (4)
   and Sap Shell (6) are above the common Block rate at Bloom 2. Mire Carapace is above it with Rot up.
7. **Out-of-scope docs to update.** GDD §4.1 lists the starters verbatim: Husk is now 6 / 9 Block and Brace 5 / 8
   Guard. The GDD relic tables (the `riven_gauntlet` and `kept_fury` rows, around lines 494 and 528) still read
   "3 Guard" and "keep up to 2". The relic texts in the game render from the numbers, so only the GDD prose is stale.
8. **Stalemates.** There were 2 Breaker stalemates on `val` (`enc_a1_orchid`, `enc_a2_assembler`). The same kind
   was already in the baseline (`enc_a1_orchid`). This is a policy or content bug to trace, not a balance number.
