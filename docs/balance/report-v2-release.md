# Balance report: v2-release

Generated 2026-11-01 by `sim/attribution.ts` from `sim/out/v2-release/`. Personas: johnny-bastion, johnny-calendar, johnny-canopy, johnny-clockwork, johnny-compost, johnny-conjunction, johnny-counter, johnny-crazing, johnny-furnace, johnny-harvest, johnny-overflow, johnny-redline, johnny-reprise, johnny-ripe, johnny-scrapheap, johnny-storm, spike, turtle. Reference persona for card and encounter tables: **spike**. Real `TUNING` levers (no neutral-tuning setup). Report rendered from `src/` `a78e6da3297bcdc6 (146 files)` (`/Users/chrises/git/vibespire`). Batches: src/ a78e6da3297bcdc6 (146 files), priors v2-release-cf 34bcefe0628caf0b + v2-baseline f31bca429f34b1d5, tier heroic. Re-run: `sh sim/v2-baseline.sh` (see docs/balance/README.md).

Persona batches: 30 (60/300/150 runs each, seeds `v2-<i>-<class>`, paired across personas). Counterfactual relics: 0 relic x class variants on 0 paired seeds (policy n/a). Counterfactual cards: 0 card x class variants on 0 paired seeds.

**spike win rate**: breaker 58.7%, chronist 37.0%, graft 65.0%.

## PHASE_C scorecard

Targets from `docs/v2/PHASE_C.md`; ± is the 95% half-width. Tier split (ruling 71): timmy and novice rows are scored on tier standard (`sim/out/v2-release-std`); every other row on tier heroic.

| metric | target | measured | status |
| --- | --- | --- | --- |
| spike win, breaker | 30-45% | 58.7% ±5.6 | **MISSED** |
| spike win, chronist | 30-45% | 37.0% ±5.5 | met |
| spike win, graft | 30-45% | 65.0% ±5.4 | **MISSED** |
| class spread under spike | <= 8 pts | 28.0 pts | **MISSED** |
| johnny engines, breaker | each >= 25% | bastion 43%, counter 32%, crazing 28%, furnace 30%, overflow 42%, redline 32%, reprise 35%, scrapheap 27% | met |
| johnny engines, chronist | each >= 25% | calendar 15%, clockwork 27%, conjunction 17%, overflow 27%, redline 33%, reprise 32%, scrapheap 17%, storm 27% | **MISSED** |
| johnny engines, graft | each >= 25% | canopy 38%, compost 30%, harvest 32%, overflow 57%, redline 60%, reprise 60%, ripe 43%, scrapheap 60% | met |
| timmy (tier standard) | >= 15% (pooled; every class) | pooled 31.8% ±4.3; breaker 42%, chronist 27%, graft 26% | pooled met; every class met |
| novice (tier standard) | >= 8% (pooled; every class) | pooled 10.7% ±2.9; breaker 14%, chronist 7%, graft 11% | pooled met; every class **MISSED** |
| turtle above spike | <= 10 pts | breaker -15, chronist -0, graft -23 | met |
| stalemates | 0 in 1000 runs per class | 0 in 2790 runs | met |
| never-played cards | none | none | met |

## Findings and recommendations

### v2 release balance report (2026-11-01, sim agent; content frozen, ruling 78)

#### Summary

**Heroic** (HP 110 / damage 85; spike 300 per class, turtle 150, johnny 60):

| Class | spike win | In the 30–45% band? |
|---|---|---|
| Breaker | 58.7% ±5.6 | above |
| Chronist | 37.0% ±5.5 | met |
| Graft | 65.0% ±5.4 | above |

- **The class spread is 28 points** (target ≤ 8).
- Breaker and Graft are now far too easy for a skilled player. The jump comes from the bot fixes plus the new priors: the drafter now knows what Molt, Heartwood Spear and Thornstorm are worth.
  - On the old priors with the fixed drafter, the same tier measured Breaker 52.3, Chronist 37.0, Graft 33.3 (`report-v2-release-cf.md`).
  - So the priors moved Graft by +32 points and Breaker by +6.
- Turtle is met (within 10 of spike in every class).
- **Johnny engines:**

| Class | Engines (win %) | Target ≥ 25% |
|---|---|---|
| Breaker | bastion 43, counter 32, crazing 28, furnace 30, overflow 42, redline 32, reprise 35, scrapheap 27 | all met |
| Graft | canopy 38, compost 30, harvest 32, overflow 57, redline 60, reprise 60, ripe 43, scrapheap 60 | all met |
| Chronist | clockwork 27, overflow 27, storm 27, redline 33, reprise 32 | met |
| Chronist | calendar 15, conjunction 17, scrapheap 17 | missed |

- **Stalemates: 0 in 2,790 Heroic runs.** No runs threw.

**Standard** (85/75, Chronist +10 HP; 150 per class):

| Persona | Pooled | Breaker | Chronist | Graft | Target |
|---|---|---|---|---|---|
| timmy | 31.8 ±4.3 | 42 | 27 | 26 | ≥ 15: met in every class |
| novice | 10.7 ±2.9 | 14.0 | **6.7** | 11.3 | ≥ 8: met pooled, missed for Chronist |
| spike | 91.6 | | | | |

- Chronist novice rose from 3.3% (Phase E) to 6.7% with the +10 HP.
- Stalemates: 0 in 1,350 runs.

**What the numbers say for balance** (content is frozen, so these are for the next patch):
- Heroic needs to be harder for Breaker and Graft, or Chronist needs a lift; at the moment it is the hard class at both tiers.
- An HP-only Heroic lever would close the gap to Chronist only if it were per class. A global +10% HP would push Chronist below 30%.
- The relic outliers below (Tuning Fork first) are the cheapest content fixes.

#### Hashes and data

| Item | Value |
|---|---|
| `src/` | `a78e6da3297bcdc6` (146 files), snapshot `vibespire-snap-v2-release` |
| New priors | `docs/balance/v2-priors.json`, label `v2-release-cf`, sha256 `34bcefe0628caf0b` |
| Aged fallback priors | `v2-baseline-priors.json` (sha256 `f31bca429f34b1d5`) |
| Previous v2 priors | kept, not loaded, as `v2-priors-pre-release.json` (sha256 `eb1898ba2112aeeb`) |
| Heroic scorecard (sections 1–6) | `sim/out/v2-release/` |
| Standard (section 7) | `sim/out/v2-release-std/` |
| Priors measurement | `sim/out/v2-release-cf/`, report `report-v2-release-cf.md`, CSVs `v2-release-cf-{cards,relics}.csv` |
| Progress log | `sim/out/v2-release.log` |

The `src/` hash differs from the first snapshot (`4984438b`) only by `src/render/game/tips.ts`, a renderer-only change the lead requested at 13:20. The sim never loads it.

#### Methods notes (read before using any older card verdict)

**1. Skip-threshold artifact (fixed before this run).**
- The drafter's skip bar was the mean quality of the deck's non-starter cards + 1.5.
- In a card counterfactual, the deck is a starter deck plus the one tested card. So a strong rare set the bar at its own quality, and the bot skipped every reward after it.
- Traced on `cf-6-breaker` with one extra Molten Shell: it skipped every card through Act 1, bought nothing, and died on floor 32 with 11 cards. The same seed with the fix drafts 18 cards and reaches floor 48.
- **Every card counterfactual before this release (v2, v2-final, v2-final-e) is biased against strong cards, rares most of all.** Phase E's "significantly negative" Breaker rares (Loosen Straps, Crazing, Bellows, Molten Shell, Iron Rhythm, Black Box) were this artifact.
- Real runs were affected too: an early rare pick made the bot skip the rewards after it.
- Fix: `sim/policies/lib/archetype.ts` shrinks the deck mean toward the floor by 6 pseudo-cards. Test: `tests/sim/skip-threshold.test.ts`.

**2. Reserve valuation (fixed).**
- The planner priced Reserve as a generic buff, about 9 per stack, but Reserve only feeds X-cost cards.
- Under Reserve Coil, the planner banked energy instead of playing cards. On `cf-0-breaker`: 3.4 plays per turn and a floor-30 loss, against 4.2 plays per turn and a floor-48 win without the Coil.
- That was the Coil's "−12 to −27 trap": the bot, not the relic.
- Fix: `sim/policies/lib/combat.ts` makes Reserve worth 2 per stack, and only while an X-cost card is in the fight. With the fix, the Coil arm wins that seed on floor 48. Test: `tests/sim/reserve.test.ts`.

**3. Seeds were cut.**
- The laptop lid was closed twice: clamshell sleep from 14:42 to 15:55, and again from 16:23, with only dark wakes in between. Batches paused or crawled.
- To stay inside the 4.5 h budget:

| Counterfactual | Planned seeds | Seeds per arm |
|---|---|---|
| Relic | 50 | 45–46 |
| Card | 25 | 17–18 |

- Seed order is seed-major, so every arm has the same first seeds.
- With 17–18 seeds, a card's interval is about ±25 win points and ±7 floors. **Single card verdicts in `report-v2-release-cf.md` are weak evidence.** As priors they enter with a low weight, shrunk toward the heuristic.
- The Chronist card baseline arm was unlucky (16.7% on 18 seeds against 37.0% over 300 spike runs), so its Δs carry a −20 win correction.

#### Priors

- Every card × class (275) and relic × class (189) the drafter can see now has a measured prior with n ≥ 10.
- **Prior coverage of spike's picks** (all 900 Heroic runs):

| Priors | Picks with a usable prior | Offers without one | Pure-heuristic screens |
|---|---|---|---|
| Old (pre-release) | 47.4% (52.6% of 14,397 had none) | — | — |
| New | **99.2%** (113 of 14,909 had none) | 8.0% | 0 |

- The remaining offers without a usable prior are off-class offers (cards of another class from events and shops), which the measurement doesn't cover by design.
- Recommendation: regenerate once more at higher card seeds (50+) if there's time before a balance patch. The machinery is `sim/v2-measure.sh`-style stages: spike 300, then `counterfactual --kind relic|card` with no `--ids`, then `attribution`, then `priors.ts`.

#### Relic outliers (Heroic counterfactual, 45–46 paired seeds, from `report-v2-release-cf.md`)

These were measured with the old priors in the drafter and the fixed bot.

**Above the +12 non-boss target** (pooled Δwin, points):
- Tuning Fork (Chronist common) **+39 ±19**
- Reaper's Sickle (Graft) +28
- Offbeat Drum (Chronist) +24
- Conductor's Baton (Chronist) +22
- Husk Sac (Graft) +21
- Trellis (Graft) +21
- Antenna Wire +19
- Spare Fuse +18
- Engine Tooth +17
- Seed Pouch +17
- Refrain Pin +16
- Overture Engine +15

Eleven more sit at +12 to +14: Dampener Coil, Chain Wraps, Compost Heap, Pollen Sac, Rot Censer, Heartwood Ring, Grafting Knife, Plague Bloom, Hollow Bough, Borrowed Time and Timeline Clamp.

Most of these intervals are ±15–19. Only Tuning Fork's interval lies wholly above +12; the rest are "probably strong", not proven over the cap.

Boss relics are not capped, but are high: Cracked Hourglass +25 (+37 Chronist), Binding Contract +20, Triage Locker +21, Ghost Lantern +18, Tender Plating +18.

**Traps under −8:**
- Undertow Reliquary −11 pooled (Breaker −26 ±14)
- Blood Rivets −9
- Twin Scabbard −9
- Momentum Flywheel −9
- Stasis Engine is −24 ±21 on Breaker (boss).

#### Card outliers (Heroic counterfactual, 17–18 paired seeds: noisy)

**Negative.** 20 Breaker cards read significantly negative in floors, among them:
- Burn Bright −41 win
- En Garde −36
- Iron Avalanche −30
- Sabre Rattle −30
- Stress Fracture −30
- Overdraft Cell −30
- Capacitor Bank −25
- Gyro Jammer −25

Graft Thorn Halo is −12 floors and Propagate −10 floors.

When nearly a whole class reads negative at 18 seeds, it points to a class-level effect: the Breaker card baseline correction was −3.1 floors, and Breaker spike already wins 52%, so any extra card dilutes a strong starter deck. Do not act on single verdicts. Re-measure Breaker at 50+ seeds first.

**Positive.**
- Chronist Snare Line +41 win / +11.9 floors
- Chronist Fault Beacon +30 / +10
- Graft Thornstorm +28 / +9.4
- Chronist Dead Reckoning +30 / +9.2
- Graft Heartwood Spear +39 / +8.6
- Graft Molt +28 / +7.7 (it was +39 in Phase E)

**Never picked** (offered ≥ 20 times, all personas): Plate Ram (Breaker, 487 offers), Black Box (Breaker and Graft), Gyro Jammer, Encore, Bait Flare, Shardfall, Spare Capacitor, Strip for Parts, Burn Bright, Arc Discharge, Arc Lattice.

#### Trace results (item 3)

- **Reserve Coil (Breaker):** a bot valuation bug, fixed (methods note 2). Not a content issue.
- **Molten Shell (Breaker):** the skip-threshold artifact, fixed (methods note 1). Not a content issue.
- No engine crash or soft-lock was found in either trace. No runs threw in this release run.

## 1. Win rate by personality

Win rate with its 95% half-width. "Beat A1/A2" = runs past the act boss. Deaths by act are shares of the losses. Every persona plays the same seeds.

### breaker

| persona | runs | win | beat A1 | beat A2 | deaths A1/A2/A3 | HP lost / fight | skip rate | deck at end | elites / run | removals / run | stalemates | top death encounters |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| spike | 300 | 58.7% ±5.6 | 93% | 71% | 18% / 53% / 29% | 7.8 | 28% | 26.8 | 2.3 | 2.9 | 0 | a2_assembler 12%, a3_leukarch 9%, a2_oracle_pack 8% |
| turtle | 150 | 44.0% ±7.9 | 94% | 63% | 11% / 55% / 35% | 8.1 | 29% | 25.7 | 1.3 | 2.7 | 0 | a2_oracle_pack 14%, a2_assembler 10%, a3_leukarch 10% |
| johnny-bastion | 60 | 43.3% ±12.5 | 85% | 53% | 26% / 56% / 18% | 8.1 | 12% | 30.9 | 2.0 | 2.5 | 0 | a2_assembler 15%, a1_ram 9%, a2_oracle_pack 6% |
| johnny-overflow | 60 | 41.7% ±12.5 | 80% | 52% | 34% / 49% / 17% | 9.0 | 34% | 23.8 | 1.8 | 2.5 | 0 | a1_ram 17%, a2_assembler 11%, a2_trihammer 9% |
| johnny-reprise | 60 | 35.0% ±12.1 | 78% | 42% | 33% / 56% / 10% | 9.1 | 35% | 22.8 | 1.8 | 2.3 | 0 | a2_assembler 18%, a1_ram 15%, a2_trihammer 8% |
| johnny-counter | 60 | 31.7% ±11.8 | 93% | 58% | 10% / 51% / 39% | 8.7 | 14% | 31.8 | 2.0 | 2.7 | 0 | a3_leukarch 17%, a2_assembler 10%, a2_furnace 10% |
| johnny-redline | 60 | 31.7% ±11.8 | 83% | 43% | 24% / 59% / 17% | 10.3 | 32% | 24.1 | 1.6 | 2.4 | 0 | a2_assembler 15%, a1_ram 12%, a2_golem_riveter 10% |
| johnny-furnace | 60 | 30.0% ±11.6 | 88% | 43% | 17% / 64% / 19% | 9.7 | 7% | 31.7 | 1.7 | 2.4 | 0 | a2_drone_trio 12%, a1_ram 10%, a2_golem_riveter 10% |
| johnny-crazing | 60 | 28.3% ±11.4 | 88% | 42% | 16% / 65% / 19% | 9.9 | 17% | 28.3 | 1.5 | 2.4 | 0 | a2_golem_riveter 14%, a2_trihammer 14%, a2_oracle_pack 9% |
| johnny-scrapheap | 60 | 26.7% ±11.2 | 78% | 42% | 30% / 50% / 20% | 9.4 | 32% | 24.0 | 1.7 | 2.5 | 0 | a1_ram 18%, a2_assembler 11%, a2_golem_riveter 11% |

Damage sources (share of all HP lost, top 3 enemy moves) per persona:

| persona | top moves |
| --- | --- |
| johnny-bastion | thornback:gore 7%, gnasher:nip 5%, gnasher:lunge 5% |
| johnny-counter | thornback:gore 5%, bramble_ram:bramble_charge 5%, gnasher:nip 4% |
| johnny-crazing | thornback:gore 7%, gnasher:nip 4%, rivet_gnasher:lunge 4% |
| johnny-furnace | thornback:gore 7%, slag_golem:ingot_slam 5%, riveter:rivet_burst 5% |
| johnny-overflow | thornback:gore 7%, gnasher:nip 5%, slag_golem:ingot_slam 4% |
| johnny-redline | self 26%, thornback:gore 6%, gnasher:nip 4% |
| johnny-reprise | thornback:gore 7%, gnasher:nip 5%, slag_golem:ingot_slam 5% |
| johnny-scrapheap | thornback:gore 7%, gnasher:nip 4%, bramble_ram:bramble_charge 4% |
| spike | thornback:gore 7%, gnasher:nip 5%, gnasher:lunge 4% |
| turtle | thornback:gore 5%, slag_golem:ingot_slam 5%, self 4% |

### chronist

| persona | runs | win | beat A1 | beat A2 | deaths A1/A2/A3 | HP lost / fight | skip rate | deck at end | elites / run | removals / run | stalemates | top death encounters |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| spike | 300 | 37.0% ±5.5 | 91% | 59% | 14% / 51% / 34% | 8.1 | 24% | 28.7 | 1.7 | 0.3 | 0 | a2_oracle_pack 13%, a3_fever_pack 11%, a2_golem_riveter 7% |
| turtle | 150 | 36.7% ±7.7 | 87% | 56% | 21% / 48% / 31% | 8.1 | 32% | 26.4 | 1.2 | 0.1 | 0 | a3_fever_pack 12%, a2_oracle_pack 12%, a3_sovereign 7% |
| johnny-redline | 60 | 33.3% ±11.9 | 83% | 48% | 25% / 53% / 23% | 9.4 | 27% | 28.7 | 1.4 | 0.1 | 0 | a2_oracle_golem 13%, a2_drone_riveter 10%, a2_oracle_pack 10% |
| johnny-reprise | 60 | 31.7% ±11.8 | 82% | 38% | 27% / 63% / 10% | 8.4 | 27% | 27.5 | 1.6 | 0.1 | 0 | a2_oracle_pack 15%, a2_oracle_golem 12%, a2_trihammer 10% |
| johnny-clockwork | 60 | 26.7% ±11.2 | 95% | 55% | 7% / 55% / 39% | 8.4 | 13% | 33.8 | 1.5 | 0.9 | 0 | a2_oracle_golem 18%, a3_archivist 11%, a2_oracle_pack 7% |
| johnny-overflow | 60 | 26.7% ±11.2 | 87% | 43% | 18% / 59% / 23% | 8.6 | 29% | 27.8 | 1.4 | 0.1 | 0 | a2_oracle_pack 14%, a2_oracle_golem 11%, a2_trihammer 11% |
| johnny-storm | 60 | 26.7% ±11.2 | 82% | 40% | 25% / 57% / 18% | 8.7 | 15% | 29.1 | 1.3 | 1.1 | 0 | a2_oracle_pack 27%, a2_trihammer 11%, a1_drone_pack 9% |
| johnny-conjunction | 60 | 16.7% ±9.4 | 83% | 37% | 20% / 56% / 24% | 8.9 | 9% | 31.9 | 1.0 | 0.4 | 0 | a2_oracle_pack 20%, a2_oracle_golem 12%, a3_fever_pack 10% |
| johnny-scrapheap | 60 | 16.7% ±9.4 | 87% | 28% | 16% / 70% / 14% | 9.1 | 19% | 27.8 | 1.2 | 0.8 | 0 | a2_oracle_pack 22%, a2_oracle_golem 12%, a2_golem_riveter 8% |
| johnny-calendar | 60 | 15.0% ±9.0 | 80% | 32% | 24% / 57% / 20% | 9.0 | 23% | 27.5 | 1.2 | 0.0 | 0 | a2_oracle_pack 22%, a3_fever_pack 10%, a2_oracle_golem 8% |

Damage sources (share of all HP lost, top 3 enemy moves) per persona:

| persona | top moves |
| --- | --- |
| johnny-calendar | thornback:gore 11%, rivet_gnasher:nip 7%, rivet_gnasher:lunge 7% |
| johnny-clockwork | thornback:gore 7%, rivet_gnasher:nip 5%, rivet_gnasher:lunge 4% |
| johnny-conjunction | thornback:gore 10%, rivet_gnasher:nip 8%, gnasher:lunge 6% |
| johnny-overflow | thornback:gore 8%, rivet_gnasher:nip 6%, rivet_gnasher:lunge 6% |
| johnny-redline | self 23%, thornback:gore 8%, rivet_gnasher:nip 5% |
| johnny-reprise | thornback:gore 10%, rivet_gnasher:lunge 6%, gnasher:lunge 5% |
| johnny-scrapheap | thornback:gore 10%, rivet_gnasher:nip 6%, rivet_gnasher:lunge 6% |
| johnny-storm | thornback:gore 9%, gnasher:nip 6%, gnasher:lunge 6% |
| spike | thornback:gore 8%, rivet_gnasher:nip 6%, rivet_gnasher:lunge 5% |
| turtle | thornback:gore 7%, rivet_gnasher:nip 6%, rivet_gnasher:lunge 6% |

### graft

| persona | runs | win | beat A1 | beat A2 | deaths A1/A2/A3 | HP lost / fight | skip rate | deck at end | elites / run | removals / run | stalemates | top death encounters |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| spike | 300 | 65.0% ±5.4 | 95% | 77% | 15% / 50% / 34% | 8.4 | 30% | 25.8 | 2.1 | 4.5 | 0 | a3_sovereign 10%, a2_trihammer 10%, a3_warden_geometer 8% |
| johnny-redline | 60 | 60.0% ±12.4 | 87% | 72% | 33% / 38% / 29% | 9.2 | 34% | 24.4 | 1.8 | 4.9 | 0 | a1_ram 13%, a3_sovereign 13%, a2_drone_trio 13% |
| johnny-reprise | 60 | 60.0% ±12.4 | 88% | 77% | 29% / 29% / 42% | 7.7 | 39% | 22.9 | 2.1 | 5.5 | 0 | a1_ram 17%, a3_sovereign 17%, a2_oracle_pack 13% |
| johnny-scrapheap | 60 | 60.0% ±12.4 | 88% | 77% | 29% / 29% / 42% | 8.5 | 29% | 25.4 | 1.9 | 5.7 | 0 | a2_oracle_pack 17%, a1_ram 13%, a3_warden_geometer 13% |
| johnny-overflow | 60 | 56.7% ±12.5 | 90% | 77% | 23% / 31% / 46% | 8.3 | 33% | 24.8 | 1.9 | 5.1 | 0 | a3_sovereign 15%, a3_geometer 12%, a2_oracle_pack 12% |
| johnny-ripe | 60 | 43.3% ±12.5 | 87% | 60% | 24% / 47% / 29% | 9.5 | 23% | 30.4 | 1.6 | 4.0 | 0 | a2_trihammer 18%, a3_sovereign 12%, a1_ram 9% |
| turtle | 150 | 42.0% ±7.9 | 91% | 60% | 16% / 53% / 31% | 9.9 | 29% | 24.3 | 1.1 | 3.7 | 0 | a2_trihammer 10%, a1_ram 8%, a2_oracle_pack 8% |
| johnny-canopy | 60 | 38.3% ±12.3 | 78% | 55% | 35% / 38% / 27% | 10.1 | 16% | 30.7 | 1.6 | 3.3 | 0 | a3_warden_geometer 11%, a1_ram 11%, a2_drone_trio 8% |
| johnny-harvest | 60 | 31.7% ±11.8 | 87% | 60% | 20% / 39% / 41% | 10.3 | 18% | 28.8 | 1.5 | 3.8 | 0 | a3_sovereign 10%, a2_oracle_pack 7%, a3_fever_pack 7% |
| johnny-compost | 60 | 30.0% ±11.6 | 85% | 57% | 21% / 40% / 38% | 10.1 | 21% | 26.3 | 1.6 | 5.2 | 0 | a3_geometer 10%, a2_trihammer 10%, a2_oracle_pack 10% |

Damage sources (share of all HP lost, top 3 enemy moves) per persona:

| persona | top moves |
| --- | --- |
| johnny-canopy | thornback:gore 8%, gnasher:nip 5%, gnasher:lunge 5% |
| johnny-compost | thornback:gore 8%, gnasher:nip 5%, rivet_gnasher:lunge 5% |
| johnny-harvest | thornback:gore 7%, gnasher:nip 5%, gnasher:lunge 5% |
| johnny-overflow | thornback:gore 8%, gnasher:nip 5%, gnasher:lunge 4% |
| johnny-redline | self 17%, thornback:gore 7%, gnasher:nip 5% |
| johnny-reprise | thornback:gore 8%, gnasher:nip 5%, gnasher:lunge 5% |
| johnny-ripe | thornback:gore 7%, gnasher:lunge 5%, gnasher:nip 5% |
| johnny-scrapheap | thornback:gore 7%, gnasher:lunge 5%, gnasher:nip 5% |
| spike | thornback:gore 8%, gnasher:lunge 5%, gnasher:nip 4% |
| turtle | thornback:gore 7%, rivet_gnasher:lunge 5%, rivet_gnasher:nip 5% |

## 1b. Engines

Per class engine, over every persona except greedy: share of runs that drafted a piece (starters excluded), share that assembled it (a multiplier + 2 pieces; 3 pieces with a payoff when no multiplier is tagged; 3 pieces without role tags; tagged starter cards count, per the class design docs), median assembly floor, and win rate of runs that took a piece and assembled it vs took a piece and did not. **johnny** = the johnny-<engine> bot's win rate. Target (PHASE_C): every engine viable, johnny >= 25%; assembled engines win clearly more (class design docs: +10 to +25 points).

### breaker

| engine | drafted a piece | assembled | median floor | win assembled | win piece, not assembled | Δ | johnny |
| --- | --- | --- | --- | --- | --- | --- | --- |
| bastion | 98% | 31% | 17 | 61.2% (291) | 35.9% | +25.3 | 43.3% ±12.5 |
| counter | 98% | 33% | 17 | 61.4% (311) | 35.0% | +26.4 | 31.7% ±11.8 |
| crazing | 90% | 25% | 21 | 61.1% (234) | 40.2% | +20.9 | 28.3% ±11.4 |
| furnace | 100% | 64% | 14 | 49.8% (598) | 31.8% | +18.0 | 30.0% ±11.6 |
| overflow | 16% | 0% | 46 | 100.0% (1) | 61.4% | +38.6 | 41.7% ±12.5 |
| redline | 34% | 7% | 28 | 57.1% (63) | 48.2% | +8.9 | 31.7% ±11.8 |
| reprise | 12% | 1% | 20 | 20.0% (10) | 54.7% | -34.7 | 35.0% ±12.1 |
| scrapheap | 45% | 2% | 29 | 47.8% (23) | 56.1% | -8.2 | 26.7% ±11.2 |

### chronist

| engine | drafted a piece | assembled | median floor | win assembled | win piece, not assembled | Δ | johnny |
| --- | --- | --- | --- | --- | --- | --- | --- |
| calendar | 95% | 22% | 17 | 40.2% (209) | 28.6% | +11.6 | 15.0% ±9.0 |
| clockwork | 98% | 45% | 17 | 43.0% (423) | 20.2% | +22.9 | 26.7% ±11.2 |
| conjunction | 100% | 18% | 17 | 50.3% (169) | 25.9% | +24.4 | 16.7% ±9.4 |
| overflow | 11% | 0% | - | - | 41.4% | - | 26.7% ±11.2 |
| redline | 31% | 4% | 21 | 44.1% (34) | 44.0% | +0.1 | 33.3% ±11.9 |
| reprise | 12% | 1% | 23 | 50.0% (12) | 45.8% | +4.2 | 31.7% ±11.8 |
| scrapheap | 37% | 2% | 24 | 26.3% (19) | 47.9% | -21.5 | 16.7% ±9.4 |
| storm | 75% | 2% | 17 | 47.6% (21) | 35.0% | +12.6 | 26.7% ±11.2 |

### graft

| engine | drafted a piece | assembled | median floor | win assembled | win piece, not assembled | Δ | johnny |
| --- | --- | --- | --- | --- | --- | --- | --- |
| canopy | 99% | 6% | 27 | 69.1% (55) | 51.6% | +17.5 | 38.3% ±12.3 |
| compost | 99% | 34% | 17 | 59.1% (318) | 49.5% | +9.6 | 30.0% ±11.6 |
| harvest | 98% | 10% | 17 | 55.3% (94) | 52.5% | +2.9 | 31.7% ±11.8 |
| overflow | 12% | 0% | 28 | 75.0% (4) | 60.7% | +14.3 | 56.7% ±12.5 |
| redline | 24% | 4% | 29 | 73.5% (34) | 64.5% | +9.0 | 60.0% ±12.4 |
| reprise | 15% | 2% | 29 | 72.2% (18) | 68.0% | +4.2 | 60.0% ±12.4 |
| ripe | 92% | 15% | 17 | 65.9% (135) | 52.8% | +13.2 | 43.3% ±12.5 |
| scrapheap | 43% | 3% | 29 | 74.1% (27) | 69.3% | +4.8 | 60.0% ±12.4 |

### Mechanic telemetry (spike)

Per run: event counts for the v2 mechanics, the mean per-combat peak of each player status, the largest single-turn damage and the floor of the first 60-damage turn (an engine "pop").

**breaker**: events per run: guard_shed 11.9, next_turn_bank 1.1, timeline_resolved 24.0, riposte_triggered 67.3, cap_hit 8.8. Largest single-turn damage: median 96, p90 156. Runs with a 60-damage turn: 80%, first at floor 32 (median).

| player status | combats | mean peak | max |
| --- | --- | --- | --- |
| onslaught | 7351 | 6.6 | 30 |
| embers | 4053 | 3.2 | 10 |
| exposed | 2964 | 2.3 | 9 |
| stagger | 2059 | 2.2 | 6 |
| iron_patience | 2032 | 1.2 | 4 |
| spark_gap | 1933 | 1.1 | 3 |
| riposte_capacity | 1815 | 1.2 | 3 |
| guard_hold | 1759 | 1.0 | 1 |
| iron_rhythm | 1757 | 1.2 | 7 |
| anvil_heart | 1706 | 1.1 | 3 |
| crazing | 1529 | 1.0 | 1 |
| parry_ledger | 1525 | 1.1 | 3 |

**chronist**: events per run: next_turn_bank 0.3, timeline_gathered 0.5, beat_shift 34.5, timeline_resolved 120.9, riposte_triggered 0.7, cap_hit 11.1. Largest single-turn damage: median 116.5, p90 235. Runs with a 60-damage turn: 89%, first at floor 16 (median).

| player status | combats | mean peak | max |
| --- | --- | --- | --- |
| augury | 6563 | 1.0 | 1 |
| tide_table | 2341 | 1.2 | 3 |
| exposed | 2283 | 2.3 | 9 |
| striking_train | 1962 | 3.1 | 7 |
| stagger | 1617 | 2.2 | 6 |
| perpetual_motion | 1519 | 1.1 | 3 |
| escapement | 1486 | 1.0 | 2 |
| eternal_return | 803 | 1.1 | 3 |
| squall_line | 697 | 3.1 | 9 |
| total_eclipse | 649 | 1.0 | 2 |
| polyrhythm | 556 | 1.0 | 3 |
| backlash_primed | 481 | 1.5 | 5 |

**graft**: events per run: next_turn_bank 0.4, beat_shift 0.0, timeline_resolved 6.6, riposte_triggered 0.2, bloom 46.5, cap_hit 44.4. Largest single-turn damage: median 133, p90 205. Runs with a 60-damage turn: 93%, first at floor 19 (median).

| player status | combats | mean peak | max |
| --- | --- | --- | --- |
| exposed | 2564 | 2.2 | 15 |
| dusk_pruning | 2138 | 1.2 | 3 |
| stagger | 1749 | 2.2 | 5 |
| living_hedge | 1646 | 1.1 | 3 |
| decomposer | 1635 | 1.1 | 3 |
| clear_cut | 1074 | 1.0 | 1 |
| hyphal_web | 858 | 1.1 | 2 |
| ripening_rot | 809 | 2.1 | 4 |
| perennial | 456 | 1.0 | 1 |
| thresher | 417 | 7.4 | 32 |
| backlash_primed | 239 | 1.3 | 4 |
| backlash_cards | 239 | 1.3 | 4 |

## 2. Encounter difficulty (spike)

Per fight: deaths per fight, mean HP lost (and as % of max HP, and per class), and mean turns. Sorted by act, then deaths per fight.

| encounter | act | room | fights | deaths / fight | HP lost | HP lost % max | HP lost breaker | HP lost chronist | HP lost graft | turns |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| a1_ram | 1 | boss | 297 | 5.1% | 25.7 | 33% | 27.4 | 19.8 | 28.9 | 9.5 |
| a1_alpha | 1 | elite | 265 | 3.0% | 21.4 | 28% | 25.2 | 17.8 | 20.5 | 6.8 |
| a1_empress | 1 | boss | 275 | 2.5% | 16.4 | 22% | 16.0 | 17.7 | 15.6 | 12.2 |
| a1_dreadcap | 1 | elite | 247 | 2.0% | 9.1 | 12% | 10.5 | 9.3 | 7.3 | 7.4 |
| a1_orchid | 1 | boss | 290 | 1.7% | 19.1 | 24% | 25.3 | 13.6 | 19.3 | 11.4 |
| event_spore_choir | 1 | event | 140 | 1.4% | 8.5 | 11% | 7.0 | 9.6 | 9.6 | 7.1 |
| a1_thornback_drone | 1 | monster | 649 | 1.2% | 11.2 | 15% | 10.6 | 10.9 | 12.3 | 4.5 |
| a1_thornback_wisp | 1 | monster | 584 | 0.7% | 8.8 | 11% | 7.9 | 8.6 | 10.2 | 4.8 |
| a1_spore_cluster | 1 | monster | 522 | 0.6% | 3.5 | 5% | 3.2 | 3.7 | 3.5 | 4.5 |
| a1_drone_pack | 1 | monster | 595 | 0.5% | 10.5 | 14% | 9.3 | 10.6 | 11.5 | 3.7 |
| a1_titan | 1 | elite | 271 | 0.4% | 10.3 | 13% | 7.2 | 9.4 | 14.8 | 5.5 |
| a1_flitter_gnasher | 1 | monster | 640 | 0.3% | 4.0 | 5% | 2.9 | 4.0 | 4.9 | 3.3 |
| a1_vine_puff | 1 | monster | 653 | 0.3% | 6.2 | 8% | 5.4 | 6.8 | 6.2 | 5.8 |
| a1_thornback | 1 | monster | 899 | 0.0% | 6.8 | 9% | 5.0 | 6.3 | 9.1 | 4.2 |
| a1_drone_puff | 1 | monster | 899 | 0.0% | 3.5 | 5% | 2.9 | 3.2 | 4.4 | 3.5 |
| a1_gnasher_pair | 1 | monster | 902 | 0.0% | 5.4 | 7% | 4.8 | 4.6 | 6.8 | 3.1 |
| a1_mantis | 1 | monster | 623 | 0.0% | 4.1 | 5% | 3.5 | 3.8 | 5.1 | 3.6 |
| a2_assembler | 2 | boss | 209 | 11.0% | 18.6 | 23% | 28.7 | 10.6 | 16.5 | 10.4 |
| a2_oracle_pack | 2 | monster | 379 | 10.8% | 14.7 | 19% | 15.5 | 16.3 | 12.5 | 4.4 |
| a2_trihammer | 2 | boss | 258 | 9.7% | 22.4 | 29% | 19.3 | 20.8 | 26.8 | 9.2 |
| a2_furnace | 2 | boss | 216 | 7.4% | 18.6 | 24% | 19.2 | 17.4 | 19.0 | 11.0 |
| a2_oracle_golem | 2 | monster | 445 | 5.6% | 11.4 | 15% | 12.5 | 12.6 | 9.6 | 6.0 |
| a2_golem_riveter | 2 | monster | 474 | 4.9% | 10.2 | 13% | 11.4 | 11.5 | 8.0 | 6.0 |
| a2_anvil_hammer | 2 | elite | 181 | 3.9% | 16.3 | 21% | 18.6 | 16.9 | 13.7 | 6.6 |
| a2_drone_riveter | 2 | monster | 477 | 3.4% | 6.8 | 9% | 5.2 | 8.3 | 6.9 | 4.4 |
| a2_acolyte_golem | 2 | monster | 512 | 2.7% | 7.4 | 10% | 9.6 | 7.2 | 5.7 | 5.7 |
| a2_acolyte_pack | 2 | monster | 514 | 2.1% | 6.1 | 8% | 4.9 | 7.3 | 6.0 | 4.6 |
| a2_drone_trio | 2 | monster | 516 | 2.1% | 5.9 | 8% | 5.9 | 6.6 | 5.4 | 4.2 |
| a2_boiler | 2 | elite | 187 | 1.6% | 9.8 | 13% | 7.3 | 10.1 | 13.0 | 6.2 |
| a2_auditor | 2 | elite | 201 | 0.5% | 6.1 | 8% | 7.1 | 4.1 | 6.3 | 6.7 |
| a2_drone_gnasher | 2 | monster | 840 | 0.0% | 6.0 | 8% | 3.9 | 7.5 | 6.5 | 3.5 |
| a2_riveter | 2 | monster | 832 | 0.0% | 2.0 | 3% | 0.7 | 2.4 | 2.8 | 3.8 |
| a2_rivet_pair | 2 | monster | 833 | 0.0% | 5.1 | 7% | 3.6 | 5.9 | 5.7 | 3.3 |
| event_engine_cult | 2 | event | 157 | 0.0% | 3.6 | 5% | 3.5 | 2.5 | 4.6 | 6.9 |
| a3_sovereign | 3 | boss | 175 | 16.0% | 27.5 | 36% | 24.8 | 29.8 | 28.1 | 12.4 |
| a3_fever_pack | 3 | monster | 382 | 8.6% | 11.7 | 15% | 12.9 | 15.8 | 7.7 | 4.0 |
| a3_leukarch | 3 | boss | 175 | 6.9% | 17.7 | 22% | 22.4 | 7.1 | 18.1 | 10.5 |
| a3_warden_geometer | 3 | monster | 418 | 5.3% | 11.7 | 15% | 13.1 | 11.0 | 10.8 | 6.3 |
| a3_archivist | 3 | boss | 180 | 4.4% | 12.8 | 17% | 6.1 | 12.1 | 19.6 | 9.9 |
| a3_phage_mother | 3 | elite | 142 | 3.5% | 7.1 | 9% | 10.7 | 2.7 | 5.5 | 5.9 |
| a3_prism_motes | 3 | monster | 395 | 3.0% | 7.6 | 10% | 7.8 | 9.6 | 5.8 | 4.2 |
| a3_event_horizon | 3 | elite | 147 | 2.0% | 11.9 | 16% | 7.2 | 16.6 | 14.0 | 5.3 |
| a3_mirror_knight | 3 | elite | 170 | 1.8% | 5.0 | 6% | 3.8 | 5.5 | 5.9 | 5.0 |
| a3_warden_cantor | 3 | monster | 429 | 0.7% | 4.6 | 6% | 4.1 | 6.8 | 3.5 | 5.5 |
| a3_geometer | 3 | monster | 432 | 0.7% | 5.3 | 7% | 3.9 | 5.1 | 6.6 | 4.5 |
| a3_cantor | 3 | monster | 437 | 0.7% | 2.2 | 3% | 1.1 | 3.5 | 2.3 | 3.9 |
| a3_warden_shard | 3 | monster | 435 | 0.5% | 3.6 | 5% | 2.0 | 6.7 | 2.8 | 4.2 |
| a3_shard_mote | 3 | monster | 418 | 0.0% | 8.2 | 11% | 7.9 | 9.9 | 7.3 | 3.5 |
| a3_mote_pair | 3 | monster | 407 | 0.0% | 4.2 | 6% | 3.0 | 5.3 | 4.5 | 3.2 |
| a3_seer | 3 | monster | 413 | 0.0% | 1.0 | 1% | 0.5 | 1.2 | 1.3 | 3.2 |
| event_echo | 3 | event | 148 | 0.0% | 3.4 | 4% | 0.6 | 4.2 | 4.6 | 4.1 |
| event_antibodies | 3 | event | 135 | 0.0% | 4.6 | 6% | 6.7 | 6.6 | 2.1 | 3.0 |

Top 20 enemy moves by HP dealt (spike, all classes; share of all HP lost; HP per run):

| move | share | HP / run |
| --- | --- | --- |
| `thornback:gore` | 7.6% | 14.8 |
| `gnasher:nip` | 4.5% | 8.7 |
| `gnasher:lunge` | 4.4% | 8.4 |
| `rivet_gnasher:nip` | 4.4% | 8.4 |
| `rivet_gnasher:lunge` | 4.3% | 8.3 |
| `void_mote:null_pulse` | 3.8% | 7.3 |
| `riveter:rivet_burst` | 3.5% | 6.8 |
| `void_geometer:hyperedge` | 2.9% | 5.6 |
| `slag_golem:ingot_slam` | 2.9% | 5.6 |
| `furnace_drone:scorch` | 2.8% | 5.4 |
| `self` | 2.6% | 5.0 |
| `sporepuff:sting` | 2.5% | 4.9 |
| `thornback:trample` | 2.4% | 4.7 |
| `bramble_ram:thorn_volley` | 2.2% | 4.2 |
| `slag_golem:spatter` | 2.1% | 4.1 |
| `trihammer_arm:piston` | 2.0% | 4.0 |
| `mother_orchid:vine_crush` | 2.0% | 3.9 |
| `bramble_ram:bramble_charge` | 1.9% | 3.7 |
| `gloam_empress:wing_buffet` | 1.8% | 3.6 |
| `scrap_drone:zap` | 1.5% | 2.9 |

Floor of death (spike), 3-floor buckets, share of losses per class:

| class | 1-3 | 4-6 | 7-9 | 10-12 | 13-15 | 16-18 | 19-21 | 22-24 | 25-27 | 28-30 | 31-33 | 34-36 | 37-39 | 40-42 | 43-45 | 46-48 | 49-51 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| breaker | 0% | 0% | 1% | 2% | 1% | 14% | 1% | 9% | 7% | 12% | 24% | 1% | 6% | 1% | 6% | 15% | 0% |
| chronist | 0% | 3% | 4% | 3% | 2% | 3% | 5% | 12% | 14% | 11% | 10% | 3% | 10% | 5% | 5% | 12% | 0% |
| graft | 0% | 3% | 2% | 3% | 4% | 4% | 2% | 11% | 8% | 14% | 15% | 1% | 10% | 0% | 7% | 16% | 0% |

## 3. Cards

Columns: **cf Δwin / Δprog**: counterfactual, one extra copy in the starting deck vs the same seeds without it (n/a; Δprog = floors gained, a win counts +3), with 95% half-widths; ** marks an interval that excludes 0. **pick Δ**: win rate of runs that picked the card minus runs offered it that did not, stratified by persona × 6-floor bucket (all personas but greedy; still selection-biased, compare with cf). **plays/draw**: plays per copy drawn (low = dead card). **value/E**: realised value per energy paid (0-cost plays count 0.5 energy; damage + 0.9 Block + Guard + debuff stacks + 3 per card drawn + 4.5 per energy gained; Powers and Rot appliers are under-credited because later ticks belong to no card). Pick rates are per persona; "all" pools every persona except greedy.

### breaker: 15 weakest

| card | arch | cf Δwin | cf Δprog | pick Δ | offer/run | pick spike | pick turtle | plays/draw | value/E | value/play |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Worldbreaker (`worldbreaker`, R attack X) | - | - | - | -17.9 ±24 | 0.42 | 3% | 0% | 0.73 | 12.1 | 31.4 |
| Jackhammer (`jackhammer`, R attack 1) | SG | - | - | -16.5 ±18 | 0.45 | 5% | 21% | 0.78 | 21.6 | 21.6 |
| Sabre Rattle (`sabre_rattle`, C skill 1) | G | - | - | -14.2 ±13 | 1.56 | 2% | 5% | 0.59 | 10.7 | 10.8 |
| Molten Shell (`molten_shell`, R power 1) | - | - | - | -11.7 ±11 | 0.47 | 88% | 84% | 0.97 | 24.1 | 12.0 |
| Smouldering Core (`smouldering_core`, R power 2) | S | - | - | -7.4 ±16 | 0.43 | 10% | 35% | 0.66 | 0.8 | 1.1 |
| Forge Oath (`forge_oath`, R skill 0) | S | - | - | -5.0 ±17 | 0.48 | 11% | 1% | 0.93 | 0.1 | 0.1 |
| Quake Hammer (`quake_hammer`, U attack 1) | S | - | - | -3.2 ±8 | 0.92 | 46% | 17% | 0.81 | 15.9 | 16.0 |
| Thresher Arc (`thresher_arc`, C attack 1) | S | - | - | -2.9 ±8 | 1.41 | 20% | 2% | 0.84 | 14.2 | 14.2 |
| Crossed Blades (`crossed_blades`, U power 1) | D | - | - | -2.8 ±8 | 0.85 | 28% | 32% | 0.67 | 1.7 | 0.8 |
| Feint Step (`feint_step`, U skill 0) | D | - | - | -2.5 ±8 | 0.83 | 70% | 65% | 0.44 | 17.9 | 9.0 |
| Iron Patience (`iron_patience`, U power 1) | - | - | - | -1.6 ±8 | 0.78 | 57% | 63% | 0.73 | 0.9 | 0.9 |
| Spark Gap (`spark_gap`, U power 1) | - | - | - | -1.2 ±7 | 0.85 | 46% | 75% | 0.82 | 1.9 | 0.9 |
| Bellows (`bellows`, R power 0) | - | - | - | -1.2 ±10 | 0.51 | 74% | 62% | 0.97 | 7.6 | 3.8 |
| Piston Jab (`piston_jab`, C attack 0) | SG | - | - | -1.1 ±9 | 1.57 | 8% | 5% | 0.92 | 18.5 | 9.3 |
| Parry Ledger (`parry_ledger`, U power 1) | DG | - | - | -0.4 ±7 | 0.86 | 36% | 59% | 0.84 | 1.5 | 0.8 |

### breaker: 15 strongest

| card | arch | cf Δwin | cf Δprog | pick Δ | offer/run | pick spike | pick turtle | plays/draw | value/E | value/play |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Hairline Mark (`hairline_mark`, U skill 1) | G | - | - | +15.8 ±8 | 0.84 | 22% | 29% | 0.77 | 14.2 | 14.2 |
| Reactive Plate (`reactive_plate`, R power 2) | B | - | - | +14.5 ±18 | 0.48 | 7% | 4% | 0.69 | 0.7 | 1.0 |
| En Garde (`en_garde`, U skill 1) | D | - | - | +13.4 ±17 | 0.90 | 2% | 2% | 0.53 | 3.7 | 3.7 |
| Read the Line (`read_the_line`, C skill 0) | SG | - | - | +12.8 ±8 | 1.47 | 8% | 14% | 0.77 | 17.2 | 8.6 |
| Vent Pressure (`vent_pressure`, R skill 1) | S | - | - | +12.5 ±12 | 0.47 | 9% | 27% | 0.36 | 11.0 | 11.0 |
| Ride the Surge (`ride_the_surge`, U skill 1) | SG | - | - | +11.1 ±8 | 0.87 | 12% | 26% | 0.56 | 9.9 | 10.0 |
| Pivot Sweep (`pivot_sweep`, C skill 1) | D | - | - | +11.1 ±6 | 1.41 | 36% | 38% | 0.27 | 28.5 | 25.8 |
| Counterweight (`counterweight`, C attack 1) | D | - | - | +10.7 ±8 | 1.53 | 25% | 3% | 0.68 | 12.5 | 12.0 |
| Iron Avalanche (`iron_avalanche`, R attack 2) | B | - | - | +9.6 ±26 | 0.47 | 1% | 11% | 0.93 | 12.7 | 25.4 |
| Iron Rhythm (`iron_rhythm`, R skill 0) | SB | - | - | +9.0 ±15 | 0.51 | 95% | 96% | 0.91 | 13.7 | 6.8 |
| Coiled Strike (`coiled_strike`, U attack 2) | D | - | - | +8.9 ±9 | 0.84 | 35% | 5% | 0.61 | 14.0 | 25.5 |
| Hammerfall (`hammerfall`, U attack 2) | S | - | - | +8.9 ±10 | 0.87 | 25% | 0% | 0.96 | 12.1 | 24.2 |
| Shed Plating (`shed_plating`, U skill 0) | SB | - | - | +8.0 ±13 | 0.83 | 7% | 8% | 0.77 | 24.1 | 12.1 |
| Answer in Kind (`answer_in_kind`, R power 2) | - | - | - | +8.0 ±13 | 0.41 | 30% | 18% | 0.76 | 0.8 | 1.1 |
| Chain Driver (`chain_driver`, C attack 1) | SG | - | - | +7.9 ±13 | 1.48 | 3% | 1% | 0.79 | 9.8 | 9.8 |

### chronist: 15 weakest

| card | arch | cf Δwin | cf Δprog | pick Δ | offer/run | pick spike | pick turtle | plays/draw | value/E | value/play |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Accelerando (`accelerando`, U power 0) | K | - | - | -11.1 ±10 | 0.86 | 10% | 32% | 0.95 | 2.6 | 1.3 |
| Undertow (`undertow`, C attack 1) | S | - | - | -10.8 ±26 | 1.32 | 0% | 0% | 0.67 | 9.9 | 9.4 |
| Reckoning (`reckoning`, R attack 1) | S | - | - | -10.5 ±10 | 0.54 | 31% | 61% | 0.85 | 24.7 | 24.1 |
| Fermata (`fermata`, U attack 1) | K | - | - | -9.0 ±12 | 0.92 | 12% | 2% | 0.91 | 22.0 | 18.0 |
| Syzygy (`syzygy`, R attack 2) | J | - | - | -7.1 ±13 | 0.42 | 32% | 21% | 0.73 | 17.3 | 32.2 |
| Eternal Return (`eternal_return`, R power 1) | P | - | - | -7.0 ±10 | 0.55 | 59% | 28% | 0.83 | 2.5 | 1.3 |
| Whistle for Wind (`whistle_for_wind`, C skill 0) | S | - | - | -5.8 ±17 | 1.27 | 0% | 0% | 0.38 | 34.9 | 17.4 |
| Noon Gun (`noon_gun`, C attack 1) | J | - | - | -5.8 ±8 | 1.28 | 16% | 5% | 0.81 | 22.7 | 22.3 |
| Weather Eye (`weather_eye`, C skill 1) | S | - | - | -5.7 ±9 | 1.27 | 11% | 22% | 0.69 | 8.1 | 7.6 |
| Knell (`knell`, U attack 1) | J | - | - | -5.3 ±8 | 0.84 | 60% | 36% | 0.88 | 28.2 | 27.5 |
| Upbeat (`upbeat`, C skill 0) | K | - | - | -4.4 ±6 | 1.36 | 36% | 34% | 0.70 | 7.4 | 3.7 |
| Squall Line (`squall_line`, U power 0) | S | - | - | -3.9 ±9 | 0.84 | 19% | 33% | 0.96 | 1.7 | 0.8 |
| Ripple (`ripple`, C attack 0) | J | - | - | -3.7 ±6 | 1.26 | 46% | 14% | 0.86 | 33.5 | 16.8 |
| Confluence (`confluence`, U attack 0) | J | - | - | -3.6 ±7 | 0.89 | 32% | 12% | 0.89 | 15.1 | 7.5 |
| Gear Train (`gear_train`, C attack 1) | K | - | - | -3.4 ±6 | 1.28 | 52% | 7% | 0.77 | 18.8 | 15.1 |

### chronist: 15 strongest

| card | arch | cf Δwin | cf Δprog | pick Δ | offer/run | pick spike | pick turtle | plays/draw | value/E | value/play |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Culmination (`culmination`, R attack 2) | K | - | - | +21.1 ±36 | 0.48 | 1% | 0% | 0.77 | 9.5 | 17.5 |
| Red Sky (`red_sky`, C skill 1) | S | - | - | +16.3 ±10 | 1.25 | 8% | 15% | 0.53 | 19.2 | 18.6 |
| Total Eclipse (`total_eclipse`, R power 1) | J | - | - | +12.3 ±11 | 0.44 | 47% | 54% | 0.85 | 2.5 | 1.3 |
| Perpetual Motion (`perpetual_motion`, R power 1) | K | - | - | +10.5 ±14 | 0.44 | 96% | 70% | 0.89 | 2.3 | 1.2 |
| Hasten (`hasten`, U skill 0) | J | - | - | +10.5 ±15 | 0.86 | 5% | 8% | 0.74 | 5.3 | 2.6 |
| Tourbillon (`tourbillon`, R skill 0) | K | - | - | +9.5 ±13 | 0.41 | 90% | 80% | 0.63 | 18.8 | 9.4 |
| Dead Reckoning (`dead_reckoning`, C skill 0) | K | - | - | +9.4 ±8 | 1.27 | 26% | 1% | 0.67 | 12.1 | 6.0 |
| Breakwater (`breakwater`, U skill 2) | P | - | - | +9.1 ±8 | 0.86 | 29% | 58% | 0.62 | 12.0 | 21.0 |
| Escapement (`escapement`, U power 1) | K | - | - | +7.0 ±8 | 0.83 | 33% | 61% | 0.77 | 1.4 | 1.3 |
| Lighthouse (`lighthouse`, R skill 2) | S | - | - | +6.4 ±13 | 0.48 | 13% | 49% | 0.43 | 8.0 | 13.5 |
| Set the Hour (`set_the_hour`, U skill 1) | J | - | - | +6.2 ±8 | 0.81 | 25% | 23% | 0.53 | 2.9 | 1.4 |
| Watch Bell (`watch_bell`, R power 2) | J | - | - | +5.7 ±17 | 0.47 | 8% | 16% | 0.57 | 1.0 | 1.1 |
| Hold the Hour (`hold_the_hour`, C skill 0) | J | - | - | +5.5 ±8 | 1.31 | 12% | 29% | 0.66 | 9.3 | 4.6 |
| Eye of the Storm (`eye_of_the_storm`, R power 2) | S | - | - | +5.3 ±37 | 0.48 | 2% | 0% | 0.54 | 0.7 | 0.9 |
| Almanac (`almanac`, C skill 0) | J | - | - | +4.4 ±6 | 1.27 | 62% | 21% | 0.84 | 32.8 | 16.4 |

### graft: 15 weakest

| card | arch | cf Δwin | cf Δprog | pick Δ | offer/run | pick spike | pick turtle | plays/draw | value/E | value/play |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Verdant Tide (`verdant_tide`, R attack 2) | M | - | - | -14.1 ±27 | 0.63 | 1% | 0% | 0.74 | 14.2 | 28.1 |
| Spore Lash (`spore_lash`, C attack 1) | B | - | - | -10.0 ±10 | 1.49 | 9% | 8% | 0.69 | 10.4 | 10.4 |
| Clear-Cut (`clear_cut`, R power 1) | C | - | - | -9.5 ±10 | 0.55 | 74% | 95% | 0.68 | 1.3 | 0.7 |
| Reaping Vine (`reaping_vine`, R attack 2) | C | - | - | -6.8 ±14 | 0.61 | 9% | 16% | 0.35 | 0.2 | 0.4 |
| Leaf Litter (`leaf_litter`, C skill 1) | C | - | - | -5.8 ±7 | 1.46 | 10% | 41% | 0.46 | 0.1 | 0.1 |
| Ripening Rot (`ripening_rot`, U power 1) | B | - | - | -5.5 ±8 | 0.90 | 26% | 50% | 0.84 | 1.3 | 0.7 |
| Decomposer (`decomposer`, U power 1) | C | - | - | -5.2 ±7 | 0.91 | 48% | 75% | 0.73 | 1.5 | 0.8 |
| Puffball (`puffball`, U skill 2) | B | - | - | -5.1 ±9 | 0.88 | 19% | 18% | 0.44 | 32.1 | 63.7 |
| Spore Haze (`spore_haze`, C skill 1) | B | - | - | -5.0 ±9 | 1.48 | 11% | 16% | 0.31 | 12.4 | 12.3 |
| Miasma Sweep (`miasma_sweep`, U attack 2) | B | - | - | -4.5 ±7 | 0.88 | 58% | 48% | 0.63 | 15.0 | 29.7 |
| Perennial (`perennial`, R power 1) | G | - | - | -3.2 ±11 | 0.53 | 29% | 75% | 0.76 | 1.9 | 1.2 |
| Propagate (`propagate`, U skill 1) | M | - | - | -2.9 ±22 | 0.82 | 0% | 0% | 0.33 | 0.0 | 0.0 |
| Grim Harvest (`grim_harvest`, R skill 2) | B | - | - | -2.4 ±9 | 0.53 | 66% | 56% | 0.93 | 23.6 | 47.0 |
| Hivestrike (`hivestrike`, C attack 1) | M | - | - | -2.3 ±8 | 1.38 | 18% | 5% | 0.69 | 9.6 | 9.7 |
| Blightcap (`blightcap`, C skill 1) | B | - | - | -2.1 ±6 | 1.35 | 64% | 67% | 0.61 | 30.6 | 30.3 |

### graft: 15 strongest

| card | arch | cf Δwin | cf Δprog | pick Δ | offer/run | pick spike | pick turtle | plays/draw | value/E | value/play |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Twin Thorn (`twin_thorn`, U attack 2) | G | - | - | +11.2 ±8 | 0.85 | 26% | 23% | 0.78 | 25.8 | 50.3 |
| Molt (`molt`, C skill 1) | C | - | - | +11.2 ±6 | 1.54 | 31% | 0% | 0.78 | 6.9 | 6.9 |
| Sap Shell (`sap_shell`, C skill 1) | M | - | - | +9.0 ±7 | 1.47 | 18% | 28% | 0.52 | 10.7 | 10.7 |
| Tendril Reach (`tendril_reach`, C skill 1) | M | - | - | +8.9 ±5 | 1.40 | 42% | 48% | 0.59 | 12.8 | 12.8 |
| Burl Wall (`burl_wall`, U skill 2) | M | - | - | +8.4 ±8 | 0.94 | 22% | 55% | 0.39 | 10.1 | 20.1 |
| Patient Thorn (`patient_thorn`, U attack 1) | G | - | - | +8.2 ±7 | 0.99 | 41% | 16% | 0.90 | 20.4 | 20.3 |
| Sap Drip (`sap_drip`, C skill 0) | G | - | - | +8.0 ±11 | 1.39 | 5% | 1% | 0.82 | 5.3 | 2.7 |
| Canker Bite (`canker_bite`, C attack 1) | B | - | - | +7.3 ±15 | 1.41 | 2% | 0% | 0.81 | 15.3 | 15.3 |
| Thornstorm (`thornstorm`, R attack X) | M | - | - | +6.5 ±10 | 0.54 | 84% | 26% | 0.84 | 20.4 | 61.2 |
| Mire Carapace (`mire_carapace`, C skill 1) | B | - | - | +6.4 ±10 | 1.34 | 8% | 6% | 0.54 | 12.8 | 12.8 |
| Canopy Crush (`canopy_crush`, U attack 2) | M | - | - | +6.3 ±16 | 0.92 | 4% | 3% | 0.63 | 12.3 | 24.6 |
| Heartwood Spear (`heartwood_spear`, R attack 2) | G | - | - | +5.9 ±9 | 0.56 | 63% | 12% | 0.82 | 37.8 | 39.2 |
| Humus Rite (`humus_rite`, R skill 1) | C | - | - | +5.4 ±17 | 0.52 | 6% | 12% | 0.32 | 0.7 | 0.6 |
| Second Flush (`second_flush`, U skill 1) | G | - | - | +5.4 ±16 | 0.88 | 5% | 2% | 0.60 | 8.5 | 5.9 |
| Rootstock (`rootstock`, R power 2) | M | - | - | +4.4 ±15 | 0.51 | 9% | 16% | 0.57 | 0.9 | 1.0 |

### Colourless (cf pooled over the classes; per-class columns in the CSV)

| card | cf Δwin (pooled) | cf Δprog (pooled) | Δprog breaker | Δprog chronist | Δprog graft | offer/run | pick (all) | plays/draw | value/E |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Shard Cache (`shard_cache`, R skill 0) | - | - | - | - | - | 0.03 | 38% | 0.09 | 21.5 |
| Strip for Parts (`strip_for_parts`, U skill 1) | - | - | - | - | - | 0.34 | 9% | 0.33 | 0.4 |
| Arc Lattice (`arc_lattice`, U attack 2) | - | - | - | - | - | 0.08 | 1% | 0.74 | 13.2 |
| Ballast Lock (`ballast_lock`, U skill 2) | - | - | - | - | - | 0.09 | 10% | 0.70 | 5.8 |
| Cutting Torch (`cutting_torch`, R attack 1) | - | - | - | - | - | 0.03 | 16% | 0.84 | 10.8 |
| Scar Tissue (`scar_tissue`, R power 1) | - | - | - | - | - | 0.16 | 42% | 0.74 | 1.0 |
| Stasis Bolt (`stasis_bolt`, R attack X) | - | - | - | - | - | 0.08 | 22% | 0.84 | 24.0 |
| Spare Capacitor (`spare_capacitor`, U skill 0) | - | - | - | - | - | 0.34 | 14% | 0.92 | 24.2 |
| Encore (`encore`, U skill 1) | - | - | - | - | - | 0.22 | 13% | 0.77 | 0.6 |
| Arc Discharge (`arc_discharge`, U attack X) | - | - | - | - | - | 0.21 | 20% | 0.87 | 13.3 |
| Capacitor Bank (`capacitor_bank`, U skill 0) | - | - | - | - | - | 0.23 | 29% | 0.70 | 6.5 |
| Stress Fracture (`stress_fracture`, U skill 0) | - | - | - | - | - | 0.36 | 20% | 0.76 | 30.8 |
| Relay Ping (`relay_ping`, U skill 0) | - | - | - | - | - | 0.08 | 8% | 0.84 | 20.4 |
| Vent Plasma (`vent_plasma`, U attack 1) | - | - | - | - | - | 0.29 | 12% | 0.70 | 23.4 |
| Last Light (`last_light`, R attack 3) | - | - | - | - | - | 0.13 | 22% | 0.68 | 21.9 |
| Second Verse (`second_verse`, U skill 1) | - | - | - | - | - | 0.22 | 22% | 0.73 | 7.7 |
| Gyro Jammer (`gyro_jammer`, U skill 1) | - | - | - | - | - | 0.09 | 0% | 0.28 | 4.2 |
| Star Survey (`star_survey`, U skill 0) | - | - | - | - | - | 0.07 | 3% | 0.68 | 8.5 |
| Clean Manifest (`clean_manifest`, R attack 2) | - | - | - | - | - | 0.03 | 0% | 0.40 | 3.8 |
| Prism Resonance (`prism_resonance`, R power 2) | - | - | - | - | - | 0.02 | 0% | 0.66 | 0.4 |
| Mirror Tether (`mirror_tether`, R attack 2) | - | - | - | - | - | 0.02 | 2% | 0.50 | 11.5 |
| Grav Clamp (`grav_clamp`, R skill 2) | - | - | - | - | - | 0.02 | 0% | 0.62 | 4.2 |
| Bait Flare (`bait_flare`, U skill 0) | - | - | - | - | - | 0.09 | 0% | - | 0.0 |
| Fuse (`fuse`, S skill 0) | - | - | - | - | - | 0.00 | - | - | 0.0 |
| Blood Tithe (`blood_tithe`, U skill 0) | - | - | - | - | - | 0.29 | 15% | 0.64 | 25.1 |
| Snare Line (`snare_line`, U skill 1) | - | - | - | - | - | 0.09 | 34% | 0.34 | 25.5 |
| Jettison Pod (`jettison_pod`, U skill 0) | - | - | - | - | - | 0.09 | 8% | 0.89 | 13.5 |
| Salvage Kit (`salvage_kit`, U skill 1) | - | - | - | - | - | 0.10 | 14% | 0.72 | 0.1 |
| Scrapheap Colossus (`scrapheap_colossus`, R attack 1) | - | - | - | - | - | 0.14 | 17% | 0.89 | 15.4 |
| Shardfall (`shardfall`, U attack 2) | - | - | - | - | - | 0.08 | 9% | 0.83 | 12.1 |
| Burn Bright (`burn_bright`, R power 2) | - | - | - | - | - | 0.15 | 12% | 0.55 | 1.0 |
| Starfall Lance (`starfall_lance`, R attack X) | - | - | - | - | - | 0.08 | 27% | 0.69 | 16.2 |
| Black Box (`black_box`, U skill 0) | - | - | - | - | - | 0.32 | 9% | 0.90 | 22.3 |
| Salvage Kiln (`salvage_kiln`, R power 1) | - | - | - | - | - | 0.15 | 21% | 0.79 | 1.2 |
| Overdraft Cell (`overdraft_cell`, U skill 0) | - | - | - | - | - | 0.09 | 3% | 0.85 | 22.4 |
| Fault Beacon (`fault_beacon`, U skill 1) | - | - | - | - | - | 0.08 | 44% | 0.84 | 34.7 |
| Shrapnel Charge (`shrapnel_charge`, U attack 1) | - | - | - | - | - | 0.34 | 12% | 0.81 | 10.2 |

Weakest colourless: Shard Cache, Strip for Parts, Arc Lattice, Ballast Lock, Cutting Torch, Scar Tissue, Stasis Bolt, Spare Capacitor, Encore, Arc Discharge, Capacitor Bank, Stress Fracture, Relay Ping, Vent Plasma, Last Light. Strongest: Shrapnel Charge, Fault Beacon, Overdraft Cell, Salvage Kiln, Black Box, Starfall Lance, Burn Bright, Shardfall, Scrapheap Colossus, Salvage Kit, Jettison Pod, Snare Line, Blood Tithe, Fuse, Bait Flare.

## 4. Relics (counterfactual: granted on floor 1)

Each relic is granted before the Ascent Pact and the run is replayed on the same seeds as the no-relic baseline (n/a). Pooled = every class the relic can drop for. **triggers/run**: `relic_trigger` events in the treated runs (0 = never flashed: a passive modifier or a relic that never fires; check). **held Δ**: the v1-style observational delta (runs ending with the relic minus runs without, spike), shown to expose its survivorship bias.

### 15 most overpowered

_none_

### 15 weakest

_none_

CI achieved: per relic x class Δwin 95% half-width median n/a pts; pooled over classes median n/a pts; Δprog pooled median ±n/a floors.

Relics with 0 triggers in every treated run: none.

## 5. Potions (spike, observational)

Gained and used per 100 runs, the share used in boss / elite / hallway fights, and the share of gained potions that were used.

| potion | gained / 100 runs | used / 100 runs | used / gained | boss / elite / monster |
| --- | --- | --- | --- | --- |
| Shield Gel (`pot_shield_gel`) | 98.1 | 98.1 | 100% | 25% / 17% / 58% |
| Fault Dust (`pot_fault_dust`) | 94.8 | 94.3 | 100% | 28% / 17% / 53% |
| Quicksilver (`pot_quicksilver`) | 92.0 | 90.7 | 99% | 34% / 21% / 44% |
| Charge Cell (`pot_charge_cell`) | 92.7 | 90.2 | 97% | 31% / 22% / 46% |
| Flare Cell (`pot_flare_cell`) | 90.4 | 90.1 | 100% | 18% / 18% / 56% |
| Bastion Tonic (`pot_bastion_tonic`) | 90.2 | 89.7 | 99% | 22% / 20% / 57% |
| Concussion Gas (`pot_concussion_gas`) | 88.1 | 86.8 | 98% | 36% / 17% / 46% |
| Shard Tincture (`pot_shard_tincture`) | 91.8 | 70.3 | 77% | 92% / 5% / 3% |
| Blight Vial (`pot_blight_vial`) | 34.8 | 34.6 | 99% | 28% / 24% / 47% |
| Seer's Draught (`pot_seers_draught`) | 34.7 | 34.1 | 98% | 38% / 17% / 44% |
| Blood Ampoule (`pot_blood_ampoule`) | 35.0 | 32.4 | 93% | 40% / 18% / 41% |
| Fracture Serum (`pot_fracture_serum`) | 40.1 | 25.3 | 63% | 49% / 18% / 33% |
| Riposte Salts (`pot_riposte_salts`) | 27.4 | 25.1 | 91% | 58% / 23% / 19% |
| Mending Ampoule (`pot_mending_ampoule`) | 23.9 | 23.9 | 100% | 15% / 18% / 48% |
| Rewind Phial (`pot_rewind_phial`) | 22.3 | 22.0 | 99% | 22% / 17% / 60% |
| Mimic Gel (`pot_mimic_gel`) | 22.4 | 21.6 | 96% | 32% / 17% / 50% |
| Echo Draught (`pot_echo_draught`) | 21.2 | 20.7 | 97% | 35% / 18% / 47% |
| Halt Ampoule (`pot_halt_ampoule`) | 19.9 | 18.6 | 93% | 7% / 23% / 68% |
| Kiln Salts (`pot_kiln_salts`) | 35.1 | 18.3 | 52% | 55% / 15% / 30% |
| Fester Draught (`pot_fester_draught`) | 14.6 | 14.0 | 96% | 56% / 17% / 26% |
| Ember Tonic (`pot_ember_tonic`) | 11.9 | 11.8 | 99% | 16% / 21% / 62% |
| Growth Sap (`pot_growth_sap`) | 13.0 | 11.7 | 90% | 31% / 19% / 50% |
| Hourglass Tonic (`pot_hourglass_tonic`) | 11.4 | 11.2 | 98% | 29% / 18% / 40% |
| Fury Draught (`pot_fury_draught`) | 11.2 | 10.9 | 97% | 35% / 19% / 44% |
| Surge Flask (`pot_surge_flask`) | 31.9 | 8.7 | 27% | 50% / 28% / 22% |
| Tempo Draught (`pot_tempo_draught`) | 11.3 | 8.0 | 71% | 71% / 10% / 19% |

## 6. Bug flags

- Cards played ≥ 20 times with zero realised value per play (not Powers): `salvage_kit` (breaker, 576 plays), `propagate` (graft, 273 plays), `salvage_kit` (graft, 329 plays), `encore` (graft, 400 plays).
- Cards drawn ≥ 30 times and never played: none.
- Cards whose counterfactual changed no run at all (identical outcomes on every seed): none.
- Relics that never triggered: see section 4.
- Stalemates (a combat over 100 turns, counted as a loss): none.
- Runs that threw (engine or policy errors; excluded from every number above): none.

- Cards offered ≥ 20 times (all personas) and never picked: `gyro_jammer` (breaker, 73 offers), `overdraft_cell` (breaker, 65 offers), `clean_manifest` (breaker, 33 offers), `prism_resonance` (breaker, 24 offers), `mirror_tether` (breaker, 22 offers), `grav_clamp` (breaker, 25 offers), `bait_flare` (breaker, 81 offers), `shardfall` (chronist, 73 offers), `gyro_jammer` (chronist, 95 offers), `clean_manifest` (chronist, 20 offers), `bait_flare` (chronist, 63 offers), `arc_lattice` (graft, 90 offers), `gyro_jammer` (graft, 89 offers), `overdraft_cell` (graft, 51 offers), `clean_manifest` (graft, 28 offers), `grav_clamp` (graft, 25 offers), `bait_flare` (graft, 121 offers).

## 7. Standard tier

Sections 1-6 are tier heroic. These batches played the Standard tier (same seeds `v2-<i>-<class>`). "mean" is the mean of the class rates; "pooled" is every run of the persona, with its 95% half-width.

| tier | persona | breaker | chronist | graft | mean | pooled | stalemates |
| --- | --- | --- | --- | --- | --- | --- | --- |
| tier standard | novice | 14.0% (150) | 6.7% (150) | 11.3% (150) | 10.7% | 10.7% ±2.9 | 0 |
| tier standard | spike | 91.3% (150) | 88.0% (150) | 95.3% (150) | 91.6% | 91.6% ±2.6 | 0 |
| tier standard | timmy | 42.0% (150) | 27.3% (150) | 26.0% (150) | 31.8% | 31.8% ±4.3 | 0 |

## 8. spike drafting: prior coverage

A card offer has a usable prior when a prior file measured this exact definition for the class (n ≥ 10); otherwise the drafter scores it by the heuristic alone. Over 900 spike runs: 20520 card screens, 61580 offers.

- Offers without a usable prior: 4943 (8.0%).
- Screens where no offer had one (pure heuristic pick): 0 (0.0%).
- Picks of a card without a usable prior: 113 of 14909 (0.8%).
- Most-offered cards without one: `stoke (graft)` 58, `fault_line (graft)` 55, `upbeat (graft)` 55, `wind_forward (graft)` 52, `chain_driver (graft)` 51, `weather_eye (graft)` 50, `dead_reckoning (graft)` 47, `counterweight (graft)` 46, `noon_gun (graft)` 46, `ephemeris (graft)` 45, `breach_hammer (graft)` 43, `spring_tide (graft)` 42, `loaded_spring (graft)` 42, `blightcap (chronist)` 40, `thresher_arc (graft)` 40.
