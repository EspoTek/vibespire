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
