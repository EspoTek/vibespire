# Balance report: v2-final-e

Generated 2026-10-31 by `sim/attribution.ts` from `sim/out/v2-final-e/`. Personas: johnny-bastion, johnny-calendar, johnny-canopy, johnny-clockwork, johnny-compost, johnny-conjunction, johnny-counter, johnny-crazing, johnny-furnace, johnny-harvest, johnny-overflow, johnny-redline, johnny-reprise, johnny-ripe, johnny-scrapheap, johnny-storm, spike, turtle. Reference persona for card and encounter tables: **spike**. Real `TUNING` levers (no neutral-tuning setup). Report rendered from `src/` `9c9eea790ec3c309 (146 files)` (`/Users/chrises/git/vibespire`). Batches: src/ 9c9eea790ec3c309 (146 files), priors v2 eb1898ba2112aeeb + v2-baseline f31bca429f34b1d5, tier heroic. Re-run: `sh sim/v2-baseline.sh` (see docs/balance/README.md).

Persona batches: 30 (60/300/150 runs each, seeds `v2-<i>-<class>`, paired across personas). Counterfactual relics: 10 relic x class variants on 40 paired seeds (policy spike). Counterfactual cards: 58 card x class variants on 40 paired seeds.

Counterfactual Δs are corrected for each baseline arm's sampling luck against the spike rate (every variant of a class shares its arm): relic graft: baseline arm 27.5% vs spike 31.3% over 300 runs (each Δ corrected by -3.8 win, -2.9 floors); relic breaker: baseline arm 35.0% vs spike 43.7% over 300 runs (each Δ corrected by -8.7 win, -2.2 floors); relic chronist: baseline arm 47.5% vs spike 40.0% over 300 runs (each Δ corrected by +7.5 win, +2.6 floors); card breaker: baseline arm 35.0% vs spike 43.7% over 300 runs (each Δ corrected by -8.7 win, -2.2 floors); card graft: baseline arm 27.5% vs spike 31.3% over 300 runs (each Δ corrected by -3.8 win, -2.9 floors); card chronist: baseline arm 47.5% vs spike 40.0% over 300 runs (each Δ corrected by +7.5 win, +2.6 floors).

**spike win rate**: breaker 43.7%, chronist 40.0%, graft 31.3%.

## PHASE_C scorecard

Targets from `docs/v2/PHASE_C.md`; ± is the 95% half-width. Tier split (ruling 71): timmy and novice rows are scored on tier standard (`sim/out/v2-final-e-std85`); every other row on tier heroic.

| metric | target | measured | status |
| --- | --- | --- | --- |
| spike win, breaker | 30-45% | 43.7% ±5.6 | met |
| spike win, chronist | 30-45% | 40.0% ±5.5 | met |
| spike win, graft | 30-45% | 31.3% ±5.2 | met |
| class spread under spike | <= 8 pts | 12.3 pts | **MISSED** |
| johnny engines, breaker | each >= 25% | bastion 23%, counter 33%, crazing 20%, furnace 22%, overflow 17%, redline 20%, reprise 15%, scrapheap 8% | **MISSED** |
| johnny engines, chronist | each >= 25% | calendar 20%, clockwork 27%, conjunction 25%, overflow 13%, redline 13%, reprise 13%, scrapheap 10%, storm 20% | **MISSED** |
| johnny engines, graft | each >= 25% | canopy 12%, compost 20%, harvest 23%, overflow 22%, redline 22%, reprise 20%, ripe 25%, scrapheap 18% | **MISSED** |
| timmy (tier standard) | >= 15% (pooled; every class) | pooled 22.2% ±3.8; breaker 31%, chronist 15%, graft 20% | pooled met; every class met |
| novice (tier standard) | >= 8% (pooled; every class) | pooled 10.7% ±2.9; breaker 11%, chronist 3%, graft 17% | pooled met; every class **MISSED** |
| turtle above spike | <= 10 pts | breaker -15, chronist -4, graft -1 | met |
| stalemates | 0 in 1000 runs per class | 0 in 2790 runs | met |
| non-boss relic Δwin | none > +12 | refrain_pin +15 | **MISSED** |
| relic traps | none < -8 | none | met |
| cards significantly negative (cf) | none | loosen_straps (breaker), iron_rhythm (breaker), bellows (breaker), crazing (breaker), black_box (breaker), molten_shell (breaker), clear_cut (graft) | **MISSED** |
| never-played cards | none | none | met |

## Findings and recommendations

### Phase E final confirm run (2026-11-01, sim agent)

**Run.** Snapshot `v2-final-e`, `src/` `9c9eea790ec3c309`, 4 workers, one batch at a time, about 75 minutes of wall time. Every batch's tier is stamped in its `meta-*.json`.

| Tier | Data | Location |
|---|---|---|
| Heroic (HP 110 / damage 85) | spike 300 per class; turtle 150; every johnny engine 60 per class (24 engine × class combinations); relic and card counterfactuals at 40 paired seeds | `sim/out/v2-final-e/` |
| Heroic top-up | the outliers on seeds 40–99, with their own baseline arm | `sim/out/v2-final-e-top/` |
| Standard 85/75 (the default) | timmy, novice and spike, 150 per class each | `sim/out/v2-final-e-std85/` |
| Standard 90/75 | the same three | `sim/out/v2-final-e-std90/` |

No run threw. The run had **0 stalemates in 5,490 runs**: 2,790 Heroic and 2,700 Standard. Phase D had 2, both from Scrap floods.

#### Targets, by tier

**Heroic: spike.**
- All three classes are in the 30–45% band: Breaker 43.7, Chronist 40.0, Graft 31.3, each ±5.5.
- Compared with Phase D at the same levers: Breaker +11.4, Chronist −5.7, Graft −2.4.
- Breaker now sits near the top of the band, and Graft near the bottom.
- The class spread is 12.3 points against a target of ≤ 8, so it misses. Lifting Graft is the cheaper fix.

**Heroic: turtle.** Within 10 points of spike in every class (Breaker −15, Chronist −4, Graft −1), so it is met.

**Heroic: johnny engines** (≥ 25% each; 60 seeds, so each rate is about ±11 points).

| Class | Meets 25% | Under 25% | Change since Phase D |
|---|---|---|---|
| Breaker | counter 33 | bastion 23, furnace 22, crazing 20, redline 20, overflow 17, reprise 15, scrapheap 8 | every engine but scrapheap went up |
| Chronist | clockwork 27, conjunction 25 | calendar 20, storm 20, redline 13, reprise 13, overflow 13, scrapheap 10 | mixed |
| Graft | ripe 25 | harvest 23, overflow 22, redline 22, compost 20, reprise 20, scrapheap 18, canopy 12 | compost (3) and harvest (0) recovered; canopy, overflow, redline and reprise fell |

- The shared engines are the weakest group in every class: Scrapheap is 8–18%, and Overflow, Redline and Reprise are 13–22%.
- The ruling 72 Scrap floor likely cost Scrapheap its payoff.
- **Shared engines are now the biggest johnny gap.** Graft canopy (12%) is the weakest class engine.

**Standard: timmy and novice** (scored on the shipped 85/75).

| Persona | Pooled | Breaker | Chronist | Graft | Target |
|---|---|---|---|---|---|
| timmy | 22.2 ±3.8 | 31.3 | 15.3 | 20.0 | ≥ 15: met in every class |
| novice | 10.7 ±2.9 | 11.3 | **3.3** | 17.3 | ≥ 8: met pooled, missed for Chronist |

Spike at Standard is 81.6%.

#### Standard 85/75 vs 90/75: keep 85/75

| Persona | 85/75 | 90/75 |
|---|---|---|
| timmy | 22.2 ±3.8 | 17.6 ±3.5 |
| novice | 10.7 ±2.9 | **5.8 ±2.2** |

- At 90/75, timmy still passes, but novice's whole interval sits below 8%. The difference from 85/75 is −4.9 points, about 2σ.
- Only 85/75 meets both targets, and novice's lower bound there (7.8%) only just reaches 8.
- **Do not switch to 90/75.**
- If 85/75 should become more robust, the lever is damage, not HP. In the earlier pass, damage moved novice far more than HP did, for example 80→75 damage at HP 85 took novice from 3.8 to 10.7.

**Chronist is the novice outlier:** 3.3% at 85/75 and 1.3% at 90/75. The class plays well at spike's skill level (88% Standard, 40% Heroic) but punishes misplays. That is a class-design question, not a tier lever.

#### Relics (Heroic counterfactuals, paired)

| Relic | Δwin (points) | Δprogress (floors) | Seeds | Verdict |
|---|---|---|---|---|
| Refrain Pin | +6 ±11 | +0.4 | 100 | back under the +12 target. The 40-seed pass read +15 ±18. |
| Star Pip (Chronist) | +7 ±13 | +3.5 ±3.2 | 100 | strong for its rarity (a common), not out of line |
| Exposed Core (boss) | −1 ±14 | +4.1 ±3.5 | 40 | fine |
| Fracture Engine | +5.8 ±8 | +0.5 | 40 | fixed (Phase D +13) |
| Slow-Temper Alloy | +2.5 ±9 | +0.4 | 40 | fixed (Phase D +18) |
| Gravity Loom | +10.6 ±9.1 (raw paired, pooled) | — | 60 | on the edge of the +12 target |

- Gravity Loom's figure comes from the shared designer's `sim/out/shared-e/cf-loom5.jsonl`, measured on this same `src/` hash at Heroic, so I did not re-run it.
- Gravity Loom by class: Breaker +15 ±16, Graft +10 ±16, Chronist +7 ±15.
- The relic CSV covers only these relics. The other relics were unchanged in Phase E (definition hashes match the Phase D snapshot).

#### Cards (Heroic counterfactuals: one extra copy in the starting deck)

The pass covered all **54 cards changed in Phase E** plus Heave To. A card counts as changed when its definition hash differs between the Phase D final snapshot and this tree. No designer had run card counterfactuals.

Results that held up on 100 paired seeds (raw paired Δ):

| Card | Δwin (points) | Δprogress (floors) | Verdict |
|---|---|---|---|
| **Molt (Graft)** | **+39 ±11.5** | **+12.2 ±3.3** | **the strongest card measured in v2** (see below) |
| Breaker Loosen Straps | −19 ±13 | −5.5 ±3.2 | significantly negative |
| Breaker Crazing | −18 ±11 | −6.0 ±2.9 | significantly negative |
| Breaker Bellows | −17 ±12 | −6.2 ±3.3 | significantly negative |
| Breaker Molten Shell | −16 ±11 | −5.3 ±3.4 | significantly negative |
| Breaker Iron Rhythm | −11 ±12 | −5.3 ±3.3 | significantly negative (floors) |
| Breaker Black Box | −10 ±11 | −3.0 ±2.7 | significantly negative (floors) |
| Black Box (Graft) | +13 ±12 | +5.1 ±3.5 | positive |
| Black Box (Chronist) | −2 ±14 | — | neutral |

Not significant at 100 seeds: Kindle (−1), Shed Plating (−5), Clear Cut (−2).

**Molt.** It costs 1 energy and gives 4 Block, 3 Chaff and a draw. Phase E2 raised Chaff from 2 to 3 Block, so one Molt is now 13 Block plus three free Scrap-fuel cards.
- The extra copy took Graft from 27% to 66% win on the same seeds.
- Spike picks it only 10% of the time because Molt has no usable prior, so spike Graft is underselling the class.
- **Recommendation:** cut Chaff back to 2 Block, or make Molt add 2 Chaff.

**The Breaker group.** All six are Phase E (Breaker E5) cards around Shed, Onslaught and Exposed. Other changed Breaker cards are neutral to positive (Fault Line +1.7 floors, Read the Blow +2.1, Answer in Kind +2.1), so this is not general deck dilution.
- An early extra copy of a Power (Bellows, Crazing, Molten Shell) costs tempo against Act 1 attackers. Loosen Straps' Shed may strip Guard the bot needed.
- Either way, these cards make the starting deck worse with the bot as it is. The Breaker designer should look at them, starting with Loosen Straps: a 0-cost draw card should not be −5 floors.
- Spike's real picks of these cards (pick rates 6–75%) carry the same risk.

**Never picked** (offered ≥ 20 times, all personas): mostly colourless. Bait Flare (changed in Phase E; 0% pick in all classes), Relay Ping, Shardfall, Arc Lattice, Gyro Jammer, Overdraft Cell, Clean Manifest, Prism Resonance, Mirror Tether, Encore.

**Zero-value flags** for Salvage Kit, Encore and Propagate predate Phase E (they are in both Phase D reports). The value accounting cannot credit a modal choice or a buff on the next card, so these are not new bugs.

#### Priors: regenerate them

- 44.8% of spike's card offers and **51.6% of its picks** had no usable prior: the drafter scored them by the heuristic alone.
- 14.9% of screens were pure-heuristic picks.
- The cost is visible: Molt (+39 win as one copy) is picked only 10% of the time.
- **Recommendation:** once content is frozen, regenerate the priors with a full `sim/v2-measure.sh` pass, then `sim/priors.ts`. It needs card counterfactuals on every card, not only the changed ones.
- Expect the spike numbers to move after regeneration, Graft up in particular. Re-check the Heroic band and the class spread after that, not before.

## 1. Win rate by personality

Win rate with its 95% half-width. "Beat A1/A2" = runs past the act boss. Deaths by act are shares of the losses. Every persona plays the same seeds.

### breaker

| persona | runs | win | beat A1 | beat A2 | deaths A1/A2/A3 | HP lost / fight | skip rate | deck at end | elites / run | removals / run | stalemates | top death encounters |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| spike | 300 | 43.7% ±5.6 | 90% | 58% | 17% / 57% / 26% | 8.9 | 30% | 24.8 | 2.0 | 2.8 | 0 | a2_assembler 8%, a2_oracle_pack 8%, a1_ram 7% |
| johnny-counter | 60 | 33.3% ±11.9 | 88% | 55% | 18% / 50% / 33% | 9.0 | 18% | 30.1 | 2.0 | 2.6 | 0 | a3_leukarch 15%, a2_assembler 10%, a1_ram 10% |
| turtle | 150 | 28.7% ±7.2 | 92% | 51% | 11% / 58% / 31% | 8.5 | 32% | 24.0 | 1.2 | 2.4 | 0 | a3_leukarch 14%, a2_drone_trio 10%, a2_assembler 9% |
| johnny-bastion | 60 | 23.3% ±10.7 | 73% | 32% | 35% / 54% / 11% | 9.6 | 12% | 27.1 | 1.6 | 2.2 | 0 | a1_alpha 11%, a1_ram 11%, a2_assembler 11% |
| johnny-furnace | 60 | 21.7% ±10.4 | 82% | 35% | 23% / 60% / 17% | 10.0 | 6% | 29.8 | 1.6 | 2.1 | 0 | a2_oracle_golem 13%, a2_oracle_pack 11%, a1_ram 9% |
| johnny-crazing | 60 | 20.0% ±10.1 | 80% | 32% | 25% / 60% / 15% | 10.5 | 16% | 26.8 | 1.3 | 2.2 | 0 | a2_oracle_golem 13%, a1_ram 8%, a2_trihammer 8% |
| johnny-redline | 60 | 20.0% ±10.1 | 67% | 28% | 42% / 48% / 10% | 10.5 | 40% | 21.1 | 1.4 | 2.0 | 0 | a1_ram 15%, a2_assembler 15%, a1_orchid 13% |
| johnny-overflow | 60 | 16.7% ±9.4 | 63% | 22% | 44% / 50% / 6% | 10.2 | 40% | 19.9 | 1.2 | 2.0 | 0 | a2_assembler 18%, a1_ram 16%, a1_empress 12% |
| johnny-reprise | 60 | 15.0% ±9.0 | 65% | 28% | 41% / 43% / 16% | 10.1 | 41% | 19.9 | 1.4 | 2.2 | 0 | a1_ram 16%, a2_assembler 14%, a2_oracle_pack 12% |
| johnny-scrapheap | 60 | 8.3% ±7.0 | 67% | 18% | 36% / 53% / 11% | 10.4 | 41% | 19.6 | 1.2 | 2.1 | 0 | a1_ram 13%, a2_oracle_pack 9%, a1_empress 7% |

Damage sources (share of all HP lost, top 3 enemy moves) per persona:

| persona | top moves |
| --- | --- |
| johnny-bastion | thornback:gore 7%, gnasher:lunge 5%, gnasher:nip 5% |
| johnny-counter | thornback:gore 6%, slag_golem:ingot_slam 5%, bramble_ram:bramble_charge 4% |
| johnny-crazing | thornback:gore 7%, gnasher:nip 5%, slag_golem:ingot_slam 4% |
| johnny-furnace | thornback:gore 7%, riveter:rivet_burst 5%, gnasher:nip 5% |
| johnny-overflow | thornback:gore 8%, bramble_ram:bramble_charge 6%, gnasher:nip 5% |
| johnny-redline | self 15%, thornback:gore 7%, gnasher:nip 5% |
| johnny-reprise | thornback:gore 7%, bramble_ram:bramble_charge 6%, gnasher:nip 5% |
| johnny-scrapheap | thornback:gore 8%, bramble_ram:bramble_charge 6%, gnasher:nip 6% |
| spike | thornback:gore 7%, rivet_gnasher:lunge 4%, gnasher:nip 4% |
| turtle | furnace_drone:scorch 6%, thornback:gore 6%, rivet_gnasher:lunge 5% |

### chronist

| persona | runs | win | beat A1 | beat A2 | deaths A1/A2/A3 | HP lost / fight | skip rate | deck at end | elites / run | removals / run | stalemates | top death encounters |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| spike | 300 | 40.0% ±5.5 | 87% | 53% | 22% / 56% / 22% | 8.2 | 31% | 26.2 | 1.6 | 0.2 | 0 | a2_oracle_pack 16%, a1_ram 7%, a2_golem_riveter 7% |
| turtle | 150 | 36.0% ±7.7 | 89% | 62% | 18% / 42% / 41% | 8.2 | 39% | 25.2 | 1.2 | 0.1 | 0 | a3_fever_pack 10%, a3_sovereign 9%, a2_acolyte_pack 7% |
| johnny-clockwork | 60 | 26.7% ±11.2 | 87% | 47% | 18% / 55% / 27% | 7.9 | 11% | 32.3 | 1.5 | 0.9 | 0 | a2_oracle_pack 16%, a2_golem_riveter 9%, a3_prism_motes 9% |
| johnny-conjunction | 60 | 25.0% ±11.0 | 90% | 48% | 13% / 56% / 31% | 9.0 | 13% | 32.2 | 1.4 | 0.3 | 0 | a2_acolyte_pack 13%, a2_oracle_pack 9%, a3_fever_pack 9% |
| johnny-calendar | 60 | 20.0% ±10.1 | 70% | 38% | 38% / 40% / 23% | 9.5 | 36% | 23.5 | 1.3 | 0.0 | 0 | a2_oracle_pack 13%, a3_fever_pack 13%, a1_thornback_drone 8% |
| johnny-storm | 60 | 20.0% ±10.1 | 77% | 27% | 29% / 63% / 8% | 9.3 | 14% | 27.5 | 1.2 | 1.1 | 0 | a2_oracle_pack 17%, a2_assembler 10%, a2_drone_riveter 8% |
| johnny-overflow | 60 | 13.3% ±8.6 | 67% | 33% | 38% / 38% / 23% | 9.7 | 47% | 21.5 | 1.3 | 0.0 | 0 | a2_oracle_pack 12%, a3_fever_pack 10%, a1_ram 10% |
| johnny-redline | 60 | 13.3% ±8.6 | 58% | 23% | 48% / 40% / 12% | 9.8 | 39% | 21.4 | 1.1 | 0.0 | 0 | a1_ram 12%, a2_oracle_pack 12%, a2_oracle_golem 8% |
| johnny-reprise | 60 | 13.3% ±8.6 | 65% | 33% | 40% / 37% / 23% | 9.4 | 46% | 21.1 | 1.3 | 0.1 | 0 | a2_oracle_pack 13%, a1_ram 10%, a3_sovereign 6% |
| johnny-scrapheap | 60 | 10.0% ±7.6 | 62% | 25% | 43% / 41% / 17% | 9.6 | 42% | 21.5 | 1.1 | 0.3 | 0 | a2_oracle_pack 13%, a1_ram 9%, a1_orchid 7% |

Damage sources (share of all HP lost, top 3 enemy moves) per persona:

| persona | top moves |
| --- | --- |
| johnny-calendar | thornback:gore 10%, gnasher:lunge 6%, rivet_gnasher:lunge 6% |
| johnny-clockwork | thornback:gore 8%, rivet_gnasher:lunge 5%, riveter:rivet_burst 5% |
| johnny-conjunction | thornback:gore 9%, rivet_gnasher:nip 7%, rivet_gnasher:lunge 6% |
| johnny-overflow | thornback:gore 9%, gnasher:lunge 6%, rivet_gnasher:lunge 5% |
| johnny-redline | self 11%, thornback:gore 11%, gnasher:lunge 7% |
| johnny-reprise | thornback:gore 10%, gnasher:lunge 7%, gnasher:nip 6% |
| johnny-scrapheap | thornback:gore 11%, gnasher:lunge 7%, rivet_gnasher:nip 6% |
| johnny-storm | thornback:gore 10%, gnasher:lunge 6%, gnasher:nip 6% |
| spike | thornback:gore 9%, rivet_gnasher:nip 6%, rivet_gnasher:lunge 5% |
| turtle | thornback:gore 7%, self 6%, rivet_gnasher:nip 6% |

### graft

| persona | runs | win | beat A1 | beat A2 | deaths A1/A2/A3 | HP lost / fight | skip rate | deck at end | elites / run | removals / run | stalemates | top death encounters |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| spike | 300 | 31.3% ±5.2 | 86% | 54% | 20% / 46% / 33% | 10.4 | 32% | 21.8 | 1.5 | 4.6 | 0 | a2_oracle_pack 10%, a3_sovereign 9%, a2_trihammer 7% |
| turtle | 150 | 30.7% ±7.4 | 88% | 57% | 17% / 44% / 38% | 10.1 | 37% | 21.6 | 1.1 | 3.9 | 0 | a3_sovereign 13%, a1_ram 9%, a2_trihammer 7% |
| johnny-ripe | 60 | 25.0% ±11.0 | 80% | 57% | 27% / 31% / 42% | 10.5 | 20% | 29.0 | 1.5 | 4.2 | 0 | a3_sovereign 18%, a1_ram 11%, a2_acolyte_golem 11% |
| johnny-harvest | 60 | 23.3% ±10.7 | 82% | 47% | 24% / 46% / 30% | 11.1 | 21% | 26.2 | 1.4 | 3.1 | 0 | a3_fever_pack 11%, a2_oracle_pack 9%, a1_ram 9% |
| johnny-overflow | 60 | 21.7% ±10.4 | 77% | 47% | 30% / 38% / 32% | 10.7 | 45% | 18.9 | 1.3 | 4.2 | 0 | a2_oracle_pack 15%, a1_ram 11%, a3_sovereign 11% |
| johnny-redline | 60 | 21.7% ±10.4 | 78% | 52% | 28% / 34% / 38% | 10.9 | 41% | 20.0 | 1.4 | 4.5 | 0 | a1_ram 11%, a3_sovereign 11%, a2_trihammer 11% |
| johnny-compost | 60 | 20.0% ±10.1 | 85% | 52% | 19% / 42% / 40% | 10.7 | 18% | 25.4 | 1.6 | 5.1 | 0 | a2_oracle_pack 15%, a2_trihammer 8%, a3_geometer 8% |
| johnny-reprise | 60 | 20.0% ±10.1 | 82% | 57% | 23% / 31% / 46% | 11.0 | 45% | 19.0 | 1.3 | 4.5 | 0 | a3_warden_geometer 13%, a3_sovereign 10%, a3_archivist 8% |
| johnny-scrapheap | 60 | 18.3% ±9.8 | 77% | 50% | 29% / 33% / 39% | 11.2 | 42% | 19.3 | 1.3 | 4.6 | 0 | a3_sovereign 10%, a2_oracle_pack 10%, a1_ram 8% |
| johnny-canopy | 60 | 11.7% ±8.1 | 60% | 23% | 45% / 42% / 13% | 11.5 | 8% | 25.8 | 1.0 | 2.6 | 0 | a1_ram 11%, a1_drone_pack 9%, a2_oracle_golem 8% |

Damage sources (share of all HP lost, top 3 enemy moves) per persona:

| persona | top moves |
| --- | --- |
| johnny-canopy | thornback:gore 11%, gnasher:nip 6%, gnasher:lunge 6% |
| johnny-compost | thornback:gore 7%, rivet_gnasher:nip 5%, gnasher:nip 4% |
| johnny-harvest | thornback:gore 8%, rivet_gnasher:lunge 5%, gnasher:lunge 5% |
| johnny-overflow | thornback:gore 8%, gnasher:lunge 6%, gnasher:nip 5% |
| johnny-redline | thornback:gore 7%, self 5%, gnasher:nip 5% |
| johnny-reprise | thornback:gore 7%, gnasher:nip 5%, gnasher:lunge 5% |
| johnny-ripe | thornback:gore 8%, gnasher:nip 4%, gnasher:lunge 4% |
| johnny-scrapheap | thornback:gore 8%, gnasher:nip 5%, gnasher:lunge 5% |
| spike | thornback:gore 8%, gnasher:lunge 5%, rivet_gnasher:lunge 5% |
| turtle | thornback:gore 7%, rivet_gnasher:lunge 5%, rivet_gnasher:nip 5% |

## 1b. Engines

Per class engine, over every persona except greedy: share of runs that drafted a piece (starters excluded), share that assembled it (a multiplier + 2 pieces; 3 pieces with a payoff when no multiplier is tagged; 3 pieces without role tags; tagged starter cards count, per the class design docs), median assembly floor, and win rate of runs that took a piece and assembled it vs took a piece and did not. **johnny** = the johnny-<engine> bot's win rate. Target (PHASE_C): every engine viable, johnny >= 25%; assembled engines win clearly more (class design docs: +10 to +25 points).

### breaker

| engine | drafted a piece | assembled | median floor | win assembled | win piece, not assembled | Δ | johnny |
| --- | --- | --- | --- | --- | --- | --- | --- |
| bastion | 96% | 20% | 17 | 45.6% (182) | 25.6% | +20.0 | 23.3% ±10.7 |
| counter | 98% | 34% | 17 | 47.2% (316) | 20.2% | +26.9 | 33.3% ±11.9 |
| crazing | 88% | 24% | 20 | 49.6% (226) | 24.7% | +24.8 | 20.0% ±10.1 |
| furnace | 98% | 61% | 14 | 35.3% (564) | 20.2% | +15.1 | 21.7% ±10.4 |
| overflow | 12% | 0% | - | - | 36.0% | - | 16.7% ±9.4 |
| redline | 28% | 2% | 24 | 31.6% (19) | 38.0% | -6.4 | 20.0% ±10.1 |
| reprise | 12% | 0% | 37 | 33.3% (3) | 51.9% | -18.6 | 15.0% ±9.0 |
| scrapheap | 39% | 1% | 25 | 28.6% (7) | 42.8% | -14.2 | 8.3% ±7.0 |

### chronist

| engine | drafted a piece | assembled | median floor | win assembled | win piece, not assembled | Δ | johnny |
| --- | --- | --- | --- | --- | --- | --- | --- |
| calendar | 94% | 16% | 17 | 43.5% (147) | 26.2% | +17.3 | 20.0% ±10.1 |
| clockwork | 97% | 37% | 17 | 43.5% (347) | 19.5% | +24.1 | 26.7% ±11.2 |
| conjunction | 99% | 22% | 17 | 42.1% (209) | 23.9% | +18.2 | 25.0% ±11.0 |
| overflow | 6% | 0% | - | - | 30.5% | - | 13.3% ±8.6 |
| redline | 28% | 1% | 23.5 | 40.0% (10) | 43.1% | -3.1 | 13.3% ±8.6 |
| reprise | 11% | 1% | 39 | 40.0% (5) | 40.9% | -0.9 | 13.3% ±8.6 |
| scrapheap | 37% | 1% | 19.5 | 25.0% (8) | 42.4% | -17.4 | 10.0% ±7.6 |
| storm | 64% | 2% | 17 | 28.6% (21) | 33.7% | -5.1 | 20.0% ±10.1 |

### graft

| engine | drafted a piece | assembled | median floor | win assembled | win piece, not assembled | Δ | johnny |
| --- | --- | --- | --- | --- | --- | --- | --- |
| canopy | 90% | 5% | 33 | 35.6% (45) | 27.5% | +8.0 | 11.7% ±8.1 |
| compost | 100% | 39% | 17 | 28.2% (365) | 23.9% | +4.3 | 20.0% ±10.1 |
| harvest | 96% | 8% | 17 | 45.1% (71) | 24.7% | +20.4 | 23.3% ±10.7 |
| overflow | 8% | 0% | 22 | 0.0% (2) | 22.1% | -22.1 | 21.7% ±10.4 |
| redline | 20% | 2% | 34 | 47.1% (17) | 36.5% | +10.5 | 21.7% ±10.4 |
| reprise | 13% | 1% | 33 | 33.3% (9) | 37.7% | -4.4 | 20.0% ±10.1 |
| ripe | 88% | 24% | 17 | 39.6% (222) | 22.7% | +16.9 | 25.0% ±11.0 |
| scrapheap | 35% | 1% | 35.5 | 50.0% (8) | 37.4% | +12.6 | 18.3% ±9.8 |

### Mechanic telemetry (spike)

Per run: event counts for the v2 mechanics, the mean per-combat peak of each player status, the largest single-turn damage and the floor of the first 60-damage turn (an engine "pop").

**breaker**: events per run: guard_shed 18.6, next_turn_bank 1.0, timeline_resolved 2.5, riposte_triggered 64.1, cap_hit 7.2. Largest single-turn damage: median 83, p90 167. Runs with a 60-damage turn: 67%, first at floor 30 (median).

| player status | combats | mean peak | max |
| --- | --- | --- | --- |
| onslaught | 6738 | 6.0 | 24 |
| embers | 3606 | 3.7 | 10 |
| exposed | 2748 | 2.5 | 16 |
| spark_gap | 2336 | 1.2 | 3 |
| iron_patience | 2117 | 1.2 | 4 |
| stagger | 1899 | 2.2 | 10 |
| anvil_heart | 1842 | 1.1 | 4 |
| recoil_spring | 1427 | 1.0 | 1 |
| bellows | 1373 | 1.1 | 3 |
| riposte_capacity | 1265 | 1.2 | 3 |
| parry_ledger | 1202 | 1.1 | 2 |
| parry_ledger_draw | 1105 | 1.2 | 4 |

**chronist**: events per run: next_turn_bank 0.6, timeline_gathered 1.1, beat_shift 20.3, timeline_resolved 112.0, riposte_triggered 0.1, cap_hit 15.0. Largest single-turn damage: median 109.5, p90 226. Runs with a 60-damage turn: 82%, first at floor 16 (median).

| player status | combats | mean peak | max |
| --- | --- | --- | --- |
| augury | 6340 | 1.0 | 1 |
| tide_table | 2422 | 1.2 | 3 |
| exposed | 2180 | 2.3 | 7 |
| escapement | 1873 | 1.1 | 3 |
| striking_train | 1832 | 3.2 | 10 |
| stagger | 1574 | 2.2 | 6 |
| perpetual_motion | 1350 | 1.1 | 2 |
| squall_line | 1029 | 3.1 | 7 |
| total_eclipse | 975 | 1.0 | 3 |
| eternal_return | 717 | 1.0 | 2 |
| polyrhythm | 481 | 1.0 | 3 |
| backlash_primed | 465 | 1.6 | 4 |

**graft**: events per run: next_turn_bank 0.4, timeline_resolved 6.9, riposte_triggered 0.1, bloom 36.6, cap_hit 24.1. Largest single-turn damage: median 101, p90 190. Runs with a 60-damage turn: 80%, first at floor 20 (median).

| player status | combats | mean peak | max |
| --- | --- | --- | --- |
| exposed | 2209 | 2.4 | 19 |
| decomposer | 1705 | 1.1 | 3 |
| dusk_pruning | 1696 | 1.2 | 4 |
| stagger | 1548 | 2.2 | 5 |
| thorn_halo | 1281 | 5.5 | 28 |
| ripening_rot | 1245 | 2.1 | 6 |
| clear_cut | 1025 | 1.0 | 1 |
| perennial | 774 | 1.0 | 1 |
| hyphal_web | 628 | 1.0 | 2 |
| thresher | 555 | 7.8 | 30 |
| augury | 283 | 1.0 | 1 |
| backlash_primed | 206 | 1.4 | 4 |

## 2. Encounter difficulty (spike)

Per fight: deaths per fight, mean HP lost (and as % of max HP, and per class), and mean turns. Sorted by act, then deaths per fight.

| encounter | act | room | fights | deaths / fight | HP lost | HP lost % max | HP lost breaker | HP lost chronist | HP lost graft | turns |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| a1_ram | 1 | boss | 293 | 12.6% | 29.9 | 38% | 32.0 | 26.3 | 31.1 | 10.2 |
| a1_alpha | 1 | elite | 255 | 4.7% | 22.1 | 28% | 24.8 | 19.7 | 20.9 | 7.2 |
| a1_orchid | 1 | boss | 284 | 3.5% | 21.2 | 27% | 27.8 | 13.6 | 22.9 | 12.4 |
| a1_empress | 1 | boss | 268 | 3.4% | 20.0 | 27% | 17.1 | 23.9 | 19.4 | 12.7 |
| a1_drone_pack | 1 | monster | 600 | 1.8% | 11.0 | 14% | 9.6 | 11.0 | 12.4 | 3.9 |
| a1_thornback_drone | 1 | monster | 645 | 1.6% | 11.8 | 15% | 10.7 | 11.0 | 13.9 | 4.7 |
| a1_titan | 1 | elite | 267 | 1.5% | 11.2 | 15% | 6.5 | 10.3 | 17.5 | 5.7 |
| a1_thornback_wisp | 1 | monster | 595 | 1.3% | 9.9 | 13% | 8.6 | 10.1 | 11.4 | 5.0 |
| a1_dreadcap | 1 | elite | 246 | 1.2% | 11.3 | 15% | 12.6 | 11.2 | 9.8 | 7.9 |
| a1_mantis | 1 | monster | 612 | 0.7% | 4.4 | 6% | 3.5 | 4.2 | 5.6 | 3.8 |
| a1_spore_cluster | 1 | monster | 506 | 0.2% | 3.8 | 5% | 3.3 | 3.8 | 4.5 | 5.0 |
| a1_flitter_gnasher | 1 | monster | 635 | 0.2% | 4.2 | 5% | 2.8 | 3.7 | 5.9 | 3.5 |
| a1_vine_puff | 1 | monster | 651 | 0.2% | 6.9 | 9% | 6.3 | 6.5 | 8.0 | 6.1 |
| a1_thornback | 1 | monster | 898 | 0.0% | 7.0 | 9% | 5.0 | 6.4 | 9.7 | 4.2 |
| a1_drone_puff | 1 | monster | 899 | 0.0% | 3.6 | 5% | 3.0 | 3.3 | 4.5 | 3.5 |
| a1_gnasher_pair | 1 | monster | 903 | 0.0% | 5.5 | 7% | 4.7 | 4.8 | 7.0 | 3.2 |
| event_spore_choir | 1 | event | 147 | 0.0% | 8.9 | 12% | 7.9 | 8.6 | 10.5 | 7.4 |
| a2_oracle_pack | 2 | monster | 340 | 17.9% | 16.5 | 22% | 16.8 | 17.9 | 14.8 | 4.6 |
| a2_trihammer | 2 | boss | 205 | 16.6% | 26.5 | 34% | 28.3 | 19.4 | 30.8 | 9.1 |
| a2_assembler | 2 | boss | 188 | 12.8% | 20.6 | 26% | 28.7 | 10.0 | 22.6 | 12.1 |
| a2_anvil_hammer | 2 | elite | 152 | 10.5% | 17.3 | 22% | 20.0 | 14.1 | 17.1 | 6.9 |
| a2_furnace | 2 | boss | 181 | 10.5% | 20.3 | 26% | 20.8 | 16.8 | 22.9 | 10.6 |
| a2_oracle_golem | 2 | monster | 401 | 8.2% | 14.2 | 18% | 17.3 | 12.2 | 13.2 | 6.2 |
| a2_golem_riveter | 2 | monster | 413 | 5.8% | 11.9 | 16% | 11.7 | 12.7 | 11.3 | 6.5 |
| a2_drone_trio | 2 | monster | 448 | 4.7% | 8.7 | 11% | 11.7 | 6.1 | 8.0 | 4.7 |
| a2_acolyte_golem | 2 | monster | 431 | 4.6% | 8.6 | 11% | 10.5 | 7.5 | 7.8 | 6.0 |
| a2_drone_riveter | 2 | monster | 406 | 4.4% | 7.9 | 10% | 8.0 | 7.3 | 8.6 | 4.7 |
| a2_acolyte_pack | 2 | monster | 469 | 3.6% | 7.0 | 9% | 6.2 | 6.7 | 8.0 | 4.9 |
| a2_boiler | 2 | elite | 157 | 2.5% | 13.1 | 17% | 11.0 | 11.7 | 17.3 | 6.5 |
| a2_auditor | 2 | elite | 149 | 0.7% | 5.6 | 7% | 7.0 | 3.4 | 5.6 | 6.9 |
| a2_riveter | 2 | monster | 787 | 0.0% | 2.3 | 3% | 0.8 | 2.6 | 3.6 | 4.3 |
| a2_rivet_pair | 2 | monster | 789 | 0.0% | 6.7 | 9% | 5.2 | 7.1 | 8.0 | 3.6 |
| a2_drone_gnasher | 2 | monster | 790 | 0.0% | 7.1 | 9% | 5.5 | 7.1 | 8.9 | 3.9 |
| event_engine_cult | 2 | event | 149 | 0.0% | 2.9 | 4% | 3.5 | 1.7 | 3.6 | 7.1 |
| a3_sovereign | 3 | boss | 142 | 23.2% | 26.7 | 34% | 21.9 | 19.2 | 37.9 | 12.2 |
| a3_leukarch | 3 | boss | 135 | 15.6% | 22.2 | 28% | 27.7 | 6.0 | 32.1 | 10.3 |
| a3_archivist | 3 | boss | 139 | 12.2% | 15.5 | 20% | 6.7 | 13.5 | 27.6 | 9.7 |
| a3_fever_pack | 3 | monster | 329 | 6.4% | 12.8 | 17% | 14.6 | 12.6 | 10.8 | 4.4 |
| a3_warden_geometer | 3 | monster | 347 | 6.1% | 12.5 | 16% | 12.8 | 9.3 | 15.2 | 6.4 |
| a3_prism_motes | 3 | monster | 318 | 4.1% | 9.6 | 12% | 11.1 | 8.1 | 9.3 | 4.6 |
| a3_mirror_knight | 3 | elite | 97 | 3.1% | 7.5 | 10% | 5.3 | 6.0 | 12.5 | 5.1 |
| a3_phage_mother | 3 | elite | 98 | 3.1% | 9.2 | 11% | 12.1 | 3.5 | 10.3 | 6.7 |
| a3_event_horizon | 3 | elite | 120 | 2.5% | 14.4 | 19% | 9.0 | 15.4 | 21.3 | 5.4 |
| a3_warden_shard | 3 | monster | 328 | 1.5% | 5.0 | 7% | 4.2 | 6.3 | 4.4 | 4.3 |
| a3_warden_cantor | 3 | monster | 309 | 1.3% | 5.1 | 7% | 3.5 | 6.4 | 5.3 | 5.7 |
| event_echo | 3 | event | 105 | 1.0% | 4.9 | 6% | 1.5 | 5.2 | 7.4 | 4.4 |
| event_antibodies | 3 | event | 106 | 0.9% | 6.3 | 8% | 5.8 | 6.8 | 6.3 | 3.5 |
| a3_cantor | 3 | monster | 338 | 0.9% | 2.6 | 3% | 1.2 | 3.4 | 3.0 | 4.0 |
| a3_geometer | 3 | monster | 357 | 0.8% | 6.3 | 8% | 5.4 | 4.3 | 9.1 | 4.8 |
| a3_shard_mote | 3 | monster | 332 | 0.0% | 9.9 | 13% | 9.9 | 10.3 | 9.5 | 3.9 |
| a3_mote_pair | 3 | monster | 331 | 0.0% | 5.1 | 7% | 3.3 | 6.4 | 5.7 | 3.5 |
| a3_seer | 3 | monster | 331 | 0.0% | 1.1 | 1% | 0.6 | 0.8 | 2.0 | 3.5 |

Top 20 enemy moves by HP dealt (spike, all classes; share of all HP lost; HP per run):

| move | share | HP / run |
| --- | --- | --- |
| `thornback:gore` | 7.8% | 15.5 |
| `rivet_gnasher:lunge` | 4.8% | 9.6 |
| `gnasher:nip` | 4.5% | 9.0 |
| `rivet_gnasher:nip` | 4.5% | 8.9 |
| `gnasher:lunge` | 4.4% | 8.7 |
| `void_mote:null_pulse` | 3.5% | 6.9 |
| `riveter:rivet_burst` | 3.5% | 6.9 |
| `furnace_drone:scorch` | 3.3% | 6.7 |
| `slag_golem:ingot_slam` | 3.0% | 6.0 |
| `sporepuff:sting` | 2.7% | 5.3 |
| `void_geometer:hyperedge` | 2.7% | 5.3 |
| `thornback:trample` | 2.5% | 5.0 |
| `bramble_ram:thorn_volley` | 2.3% | 4.6 |
| `bramble_ram:bramble_charge` | 2.2% | 4.4 |
| `mother_orchid:vine_crush` | 2.1% | 4.3 |
| `gloam_empress:wing_buffet` | 2.1% | 4.2 |
| `slag_golem:spatter` | 2.1% | 4.2 |
| `trihammer_arm:piston` | 2.0% | 3.9 |
| `self` | 1.8% | 3.6 |
| `vinelash:lash` | 1.6% | 3.1 |

Floor of death (spike), 3-floor buckets, share of losses per class:

| class | 1-3 | 4-6 | 7-9 | 10-12 | 13-15 | 16-18 | 19-21 | 22-24 | 25-27 | 28-30 | 31-33 | 34-36 | 37-39 | 40-42 | 43-45 | 46-48 | 49-51 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| breaker | 0% | 1% | 2% | 2% | 1% | 12% | 3% | 15% | 8% | 13% | 18% | 2% | 7% | 2% | 4% | 12% | 0% |
| chronist | 0% | 3% | 3% | 3% | 3% | 11% | 7% | 14% | 11% | 13% | 11% | 2% | 5% | 3% | 2% | 9% | 0% |
| graft | 0% | 1% | 5% | 4% | 2% | 8% | 2% | 15% | 4% | 12% | 13% | 1% | 4% | 3% | 3% | 21% | 0% |

## 3. Cards

Columns: **cf Δwin / Δprog**: counterfactual, one extra copy in the starting deck vs the same seeds without it (spike; Δprog = floors gained, a win counts +3), with 95% half-widths; ** marks an interval that excludes 0. **pick Δ**: win rate of runs that picked the card minus runs offered it that did not, stratified by persona × 6-floor bucket (all personas but greedy; still selection-biased, compare with cf). **plays/draw**: plays per copy drawn (low = dead card). **value/E**: realised value per energy paid (0-cost plays count 0.5 energy; damage + 0.9 Block + Guard + debuff stacks + 3 per card drawn + 4.5 per energy gained; Powers and Rot appliers are under-credited because later ticks belong to no card). Pick rates are per persona; "all" pools every persona except greedy.

### breaker: 15 weakest

| card | arch | cf Δwin | cf Δprog | pick Δ | offer/run | pick spike | pick turtle | plays/draw | value/E | value/play |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Loosen Straps (`loosen_straps`, C skill 0) | - | -31.2 ±19 ** | -10.8 ±4.9 ** | +7.3 ±17 | 1.34 | 2% | 0% | 0.67 | 13.9 | 7.0 |
| Bellows (`bellows`, R power 1) | - | -21.2 ±19 ** | -8.0 ±5.6 ** | -7.6 ±11 | 0.47 | 81% | 86% | 0.95 | 1.5 | 0.8 |
| Molten Shell (`molten_shell`, R power 2) | - | -21.2 ±17 ** | -7.2 ±5.3 ** | -1.7 ±11 | 0.43 | 41% | 78% | 0.86 | 4.6 | 6.9 |
| Iron Rhythm (`iron_rhythm`, R skill 1) | SB | -16.2 ±19 | -7.0 ±4.8 ** | -0.9 ±11 | 0.42 | 41% | 53% | 0.75 | 3.2 | 3.2 |
| Crazing (`crazing`, R power 2) | - | -21.2 ±19 ** | -5.4 ±4.5 ** | +1.4 ±11 | 0.41 | 73% | 63% | 0.73 | 4.6 | 7.1 |
| Shed Plating (`shed_plating`, U skill 0) | SB | -8.7 ±16 | -4.2 ±4.4 | +7.0 ±12 | 0.75 | 10% | 5% | 0.70 | 20.4 | 10.2 |
| Kindle (`kindle`, U skill 1) | - | -11.2 ±20 | -3.7 ±5.0 | +4.9 ±10 | 0.84 | 21% | 16% | 0.53 | 12.1 | 6.0 |
| Recoil Spring (`recoil_spring`, R power 1) | D | -11.2 ±19 | -3.2 ±5.1 | -2.4 ±16 | 0.40 | 85% | 83% | 0.85 | 7.7 | 3.8 |
| Stoke (`stoke`, C skill 1) | - | -6.2 ±22 | -1.9 ±5.0 | +0.7 ±7 | 1.26 | 14% | 28% | 0.68 | 5.2 | 5.2 |
| Spark Gap (`spark_gap`, U power 1) | - | - | - | -9.8 ±8 | 0.76 | 77% | 76% | 0.77 | 1.7 | 0.8 |
| Jackhammer (`jackhammer`, R attack 1) | SG | - | - | -9.6 ±13 | 0.41 | 30% | 22% | 0.80 | 21.6 | 21.6 |
| Smouldering Core (`smouldering_core`, R power 2) | S | - | - | -8.0 ±14 | 0.41 | 21% | 21% | 0.61 | 0.9 | 1.2 |
| Sabre Rattle (`sabre_rattle`, C skill 1) | G | - | - | -7.7 ±8 | 1.44 | 6% | 6% | 0.60 | 11.4 | 11.5 |
| En Garde (`en_garde`, U skill 1) | D | - | - | -6.1 ±8 | 0.83 | 48% | 1% | 0.37 | 3.5 | 3.5 |
| Parry Ledger (`parry_ledger`, U power 1) | DG | - | - | -4.6 ±8 | 0.78 | 33% | 68% | 0.84 | 1.5 | 0.8 |

### breaker: 15 strongest

| card | arch | cf Δwin | cf Δprog | pick Δ | offer/run | pick spike | pick turtle | plays/draw | value/E | value/play |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Answer in Kind (`answer_in_kind`, R power 2) | - | +3.8 ±20 | +2.1 ±4.5 | +20.5 ±15 | 0.32 | 24% | 20% | 0.72 | 0.6 | 0.8 |
| Read the Blow (`read_the_blow`, U skill 1) | DB | +3.8 ±22 | +2.1 ±5.6 | -3.1 ±8 | 0.85 | 50% | 85% | 0.65 | 8.1 | 8.2 |
| Fault Line (`fault_line`, C attack 1) | DG | +8.8 ±20 | +1.7 ±4.5 | +5.0 ±7 | 1.27 | 24% | 6% | 0.88 | 11.6 | 11.7 |
| Forge Oath (`forge_oath`, R skill 0) | S | - | - | +15.7 ±24 | 0.43 | 6% | 2% | 0.93 | 0.2 | 0.1 |
| Bind the Blade (`bind_the_blade`, U skill 1) | SD | - | - | +14.0 ±7 | 0.83 | 55% | 54% | 0.15 | 54.8 | 39.5 |
| Anvil Heart (`anvil_heart`, U power 1) | SB | - | - | +13.1 ±8 | 0.72 | 51% | 77% | 0.85 | 1.3 | 0.7 |
| Endless Maul (`endless_maul`, R attack 1) | S | - | - | +13.0 ±11 | 0.41 | 45% | 29% | 1.48 | 16.4 | 16.4 |
| Quake Hammer (`quake_hammer`, U attack 1) | S | - | - | +10.5 ±9 | 0.80 | 28% | 12% | 0.83 | 14.7 | 14.7 |
| Read the Line (`read_the_line`, C skill 0) | SG | - | - | +10.4 ±10 | 1.39 | 6% | 10% | 0.73 | 17.2 | 8.6 |
| Counterweight (`counterweight`, C attack 1) | D | - | - | +7.6 ±11 | 1.35 | 11% | 1% | 0.68 | 10.8 | 10.2 |
| Turnabout (`turnabout`, R skill 2) | - | - | - | +7.2 ±15 | 0.35 | 16% | 33% | 0.27 | 18.9 | 32.4 |
| Plate Ram (`plate_ram`, C attack 1) | B | - | - | +5.8 ±18 | 1.41 | 1% | 0% | 0.79 | 10.2 | 10.3 |
| Hammerfall (`hammerfall`, U attack 2) | S | - | - | +5.8 ±21 | 0.77 | 4% | 1% | 0.95 | 11.3 | 22.6 |
| Pivot Sweep (`pivot_sweep`, C skill 1) | D | - | - | +5.2 ±7 | 1.27 | 30% | 38% | 0.25 | 33.1 | 27.9 |
| Anneal (`anneal`, U skill 1) | B | - | - | +4.8 ±8 | 0.73 | 33% | 64% | 0.72 | 3.6 | 3.6 |

### chronist: 15 weakest

| card | arch | cf Δwin | cf Δprog | pick Δ | offer/run | pick spike | pick turtle | plays/draw | value/E | value/play |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Eye of the Storm (`eye_of_the_storm`, R power 2) | S | - | - | -47.5 ±45 | 0.48 | 1% | 0% | 0.53 | 0.7 | 0.9 |
| Squall Line (`squall_line`, U power 0) | S | -7.5 ±17 | -2.4 ±5.0 | -11.4 ±9 | 0.91 | 24% | 29% | 0.97 | 1.9 | 0.9 |
| Total Eclipse (`total_eclipse`, R power 1) | J | -5.0 ±17 | -2.2 ±4.9 | -0.3 ±11 | 0.43 | 57% | 46% | 0.84 | 2.7 | 1.3 |
| Polyrhythm (`polyrhythm`, R power 1) | K | - | - | -17.2 ±10 | 0.45 | 38% | 48% | 0.81 | 2.3 | 1.1 |
| Syzygy (`syzygy`, R attack 2) | J | - | - | -16.9 ±17 | 0.49 | 11% | 16% | 0.73 | 20.0 | 35.7 |
| Noon Gun (`noon_gun`, C attack 1) | J | -10.0 ±17 | -1.3 ±4.1 | -7.1 ±8 | 1.32 | 21% | 2% | 0.81 | 23.3 | 22.8 |
| Toll the Hours (`toll_the_hours`, R attack X) | P | - | - | -7.3 ±10 | 0.48 | 51% | 41% | 0.90 | 13.0 | 34.3 |
| Accelerando (`accelerando`, U power 0) | K | - | - | -7.2 ±13 | 0.90 | 2% | 30% | 0.95 | 2.2 | 1.1 |
| Seen It Coming (`seen_it_coming`, R skill 1) | S | - | - | -7.0 ±13 | 0.47 | 18% | 53% | 0.75 | 31.5 | 18.3 |
| Escapement (`escapement`, U power 1) | K | - | - | -6.3 ±8 | 0.75 | 56% | 58% | 0.75 | 1.4 | 1.3 |
| Gear Train (`gear_train`, C attack 1) | K | - | - | -6.2 ±10 | 1.23 | 9% | 5% | 0.78 | 18.3 | 14.7 |
| Whistle for Wind (`whistle_for_wind`, C skill 0) | S | - | - | -5.5 ±16 | 1.30 | 0% | 0% | 0.40 | 34.5 | 17.3 |
| Wind Forward (`wind_forward`, C skill 0) | J | - | - | -3.1 ±10 | 1.47 | 10% | 8% | 0.73 | 4.1 | 2.1 |
| Ephemeris (`ephemeris`, C skill 1) | K | - | - | -1.8 ±5 | 1.60 | 39% | 41% | 0.45 | 11.0 | 10.1 |
| Heave To (`heave_to`, U skill 1) | S | +2.5 ±19 | -0.1 ±4.9 | -0.9 ±8 | 0.94 | 30% | 47% | 0.55 | 9.0 | 8.4 |

### chronist: 15 strongest

| card | arch | cf Δwin | cf Δprog | pick Δ | offer/run | pick spike | pick turtle | plays/draw | value/E | value/play |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Mainspring (`mainspring`, U skill 0) | K | +5.0 ±16 | +4.0 ±4.6 | -4.5 ±8 | 0.86 | 30% | 27% | 0.67 | 13.1 | 6.6 |
| Knell (`knell`, U attack 1) | J | +15.0 ±18 | +3.6 ±5.0 | +1.1 ±8 | 0.90 | 39% | 35% | 0.85 | 29.0 | 28.4 |
| Pinion Jab (`pinion_jab`, C attack 0) | K | +2.5 ±21 | +3.6 ±5.2 | +3.2 ±9 | 1.30 | 9% | 35% | 0.90 | 13.8 | 6.9 |
| Eternal Return (`eternal_return`, R power 1) | P | +12.5 ±17 | +3.4 ±4.1 | +16.1 ±10 | 0.51 | 42% | 31% | 0.85 | 2.4 | 1.2 |
| Hold the Hour (`hold_the_hour`, C skill 0) | J | +10.0 ±19 | +3.0 ±4.6 | +0.0 ±6 | 1.44 | 23% | 28% | 0.68 | 9.3 | 4.6 |
| Gathering Storm (`gathering_storm`, U skill 1) | S | - | - | +19.9 ±23 | 0.89 | 2% | 1% | 0.48 | 20.0 | 19.8 |
| Lighthouse (`lighthouse`, R skill 2) | S | +10.0 ±19 | +1.6 ±5.6 | +4.3 ±11 | 0.48 | 25% | 48% | 0.45 | 7.5 | 13.2 |
| Spring Tide (`spring_tide`, C attack 1) | J | +2.5 ±16 | +1.4 ±3.7 | -7.7 ±6 | 1.37 | 29% | 19% | 0.84 | 24.6 | 24.0 |
| Watch Bell (`watch_bell`, R power 2) | J | - | - | +10.9 ±17 | 0.48 | 5% | 13% | 0.59 | 0.8 | 1.0 |
| Perpetual Motion (`perpetual_motion`, R power 1) | K | - | - | +10.1 ±10 | 0.47 | 64% | 64% | 0.91 | 1.8 | 0.9 |
| Bell Choir (`bell_choir`, U attack 1) | J | -2.5 ±20 | +1.0 ±5.5 | -0.0 ±10 | 0.88 | 15% | 6% | 0.77 | 23.2 | 22.2 |
| Balance Wheel (`balance_wheel`, C skill 1) | K | - | - | +10.0 ±9 | 1.42 | 11% | 16% | 0.61 | 14.1 | 11.5 |
| Turn the Tide (`turn_the_tide`, U attack 1) | S | - | - | +9.8 ±14 | 0.89 | 5% | 14% | 0.77 | 14.7 | 14.3 |
| Second Hand (`second_hand`, U attack 0) | K | - | - | +7.7 ±7 | 0.84 | 45% | 26% | 0.86 | 31.8 | 15.9 |
| Dead Reckoning (`dead_reckoning`, C skill 0) | K | - | - | +6.7 ±8 | 1.38 | 40% | 1% | 0.69 | 12.0 | 6.0 |

### graft: 15 weakest

| card | arch | cf Δwin | cf Δprog | pick Δ | offer/run | pick spike | pick turtle | plays/draw | value/E | value/play |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Clear-Cut (`clear_cut`, R power 1) | C | -11.3 ±18 | -5.6 ±5.1 ** | -10.7 ±13 | 0.60 | 89% | 94% | 0.62 | 1.4 | 0.8 |
| Verdant Tide (`verdant_tide`, R attack 2) | M | - | - | -33.5 ±52 | 0.54 | 0% | 0% | 0.61 | 13.0 | 26.1 |
| Thorn Halo (`thorn_halo`, U power 1) | G | -11.3 ±19 | -2.7 ±6.0 | -1.2 ±7 | 0.98 | 60% | 62% | 0.44 | 0.5 | 0.5 |
| Ripening Rot (`ripening_rot`, U power 1) | B | +3.7 ±18 | -2.3 ±5.5 | -3.4 ±7 | 0.86 | 40% | 45% | 0.85 | 0.8 | 0.5 |
| Thresher (`thresher`, U power 2) | C | -3.8 ±19 | -1.6 ±6.5 | +1.2 ±7 | 0.85 | 40% | 48% | 0.30 | 0.3 | 0.6 |
| Canopy Crush (`canopy_crush`, U attack 2) | M | - | - | -12.0 ±15 | 0.94 | 5% | 0% | 0.57 | 11.0 | 21.9 |
| Mire Carapace (`mire_carapace`, C skill 1) | B | -1.3 ±16 | -1.2 ±5.7 | +0.2 ±12 | 1.31 | 6% | 6% | 0.59 | 12.8 | 12.9 |
| Puffball (`puffball`, U skill 2) | B | - | - | -10.4 ±9 | 0.89 | 23% | 19% | 0.43 | 30.4 | 60.8 |
| Death Cap (`death_cap`, R attack 2) | B | +1.2 ±19 | -1.0 ±5.4 | -17.2 ±9 | 0.52 | 67% | 51% | 0.41 | 15.3 | 30.4 |
| Canker Bite (`canker_bite`, C attack 1) | B | -1.3 ±15 | -1.0 ±4.6 | +4.4 ±16 | 1.41 | 2% | 0% | 0.79 | 14.8 | 14.8 |
| Rootstock (`rootstock`, R power 2) | M | - | - | -5.3 ±18 | 0.54 | 4% | 16% | 0.49 | 0.4 | 0.6 |
| Seed Rain (`seed_rain`, U skill 1) | M | - | - | -3.6 ±8 | 0.88 | 24% | 37% | 0.44 | 3.4 | 3.5 |
| Humus Rite (`humus_rite`, R skill 1) | C | - | - | -3.2 ±15 | 0.49 | 12% | 6% | 0.35 | 0.8 | 0.5 |
| Blightcap (`blightcap`, C skill 1) | B | - | - | -3.1 ±9 | 1.30 | 1% | 70% | 0.58 | 30.3 | 30.3 |
| Propagate (`propagate`, U skill 1) | M | - | - | -2.5 ±24 | 0.82 | 0% | 0% | 0.32 | 0.0 | 0.0 |

### graft: 15 strongest

| card | arch | cf Δwin | cf Δprog | pick Δ | offer/run | pick spike | pick turtle | plays/draw | value/E | value/play |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Molt (`molt`, C skill 1) | C | +41.2 ±16 ** | +9.6 ±5.2 ** | +18.1 ±10 | 1.38 | 10% | 8% | 0.82 | 8.6 | 8.6 |
| Pollen Sting (`pollen_sting`, U attack 1) | G | +8.7 ±20 | +5.1 ±5.5 | +3.3 ±13 | 0.88 | 9% | 1% | 0.84 | 10.8 | 10.7 |
| Choking Spores (`choking_spores`, U skill 1) | B | +16.2 ±19 | +4.9 ±5.6 | +11.8 ±7 | 0.97 | 53% | 36% | 0.64 | 12.9 | 12.9 |
| Patient Thorn (`patient_thorn`, U attack 1) | G | +11.2 ±21 | +4.4 ±5.8 | +11.8 ±8 | 0.92 | 29% | 14% | 0.90 | 21.9 | 21.6 |
| Mulch Maul (`mulch_maul`, C attack 1) | C | +11.2 ±21 | +4.4 ±5.1 | +1.0 ±7 | 1.30 | 28% | 17% | 0.79 | 14.2 | 14.2 |
| Dusk Pruning (`dusk_pruning`, U power 1) | C | +8.7 ±21 | +3.7 ±5.4 | +3.0 ±7 | 0.91 | 64% | 73% | 0.70 | 1.1 | 0.7 |
| Shed Husk (`shed_husk`, C skill 1) | C | +13.7 ±22 | +3.5 ±6.2 | -1.0 ±6 | 1.49 | 78% | 91% | 0.53 | 4.7 | 4.8 |
| Grafting Cut (`grafting_cut`, C attack 1) | C | +13.7 ±21 | +2.4 ±5.7 | +2.2 ±7 | 1.43 | 19% | 6% | 0.75 | 11.7 | 11.7 |
| Deep Graft (`deep_graft`, C skill 1) | G | +6.2 ±18 | +2.2 ±4.9 | +1.1 ±6 | 1.40 | 33% | 44% | 0.50 | 4.0 | 4.0 |
| Second Flush (`second_flush`, U skill 1) | G | +11.2 ±18 | +2.1 ±5.0 | +7.6 ±19 | 0.81 | 4% | 2% | 0.65 | 7.8 | 5.8 |
| Heartwood Spear (`heartwood_spear`, R attack 2) | G | - | - | +19.8 ±13 | 0.58 | 24% | 9% | 0.82 | 39.8 | 39.8 |
| Spore Lash (`spore_lash`, C attack 1) | B | +1.2 ±20 | +1.9 ±5.6 | -1.9 ±8 | 1.34 | 20% | 6% | 0.70 | 10.7 | 10.8 |
| Sap Drip (`sap_drip`, C skill 0) | G | - | - | +18.0 ±11 | 1.29 | 7% | 1% | 0.79 | 5.7 | 2.8 |
| Sporeburst (`sporeburst`, U skill 1) | B | +8.7 ±20 | +1.7 ±5.8 | +5.0 ±7 | 0.94 | 43% | 34% | 0.81 | 24.6 | 24.7 |
| Root Mesh (`root_mesh`, C skill 1) | M | - | - | +17.0 ±14 | 1.35 | 2% | 5% | 0.44 | 7.3 | 7.3 |

### Colourless (cf pooled over the classes; per-class columns in the CSV)

| card | cf Δwin (pooled) | cf Δprog (pooled) | Δprog breaker | Δprog chronist | Δprog graft | offer/run | pick (all) | plays/draw | value/E |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Arc Discharge (`arc_discharge`, U attack X) | - | - | - | - | - | 0.12 | 13% | 0.85 | 12.1 |
| Spare Capacitor (`spare_capacitor`, U skill 0) | - | - | - | - | - | 0.12 | 6% | 0.90 | 16.6 |
| Scrapheap Colossus (`scrapheap_colossus`, R attack 2) | - | - | - | - | - | 0.02 | 12% | 0.55 | 8.0 |
| Star Survey (`star_survey`, U skill 0) | - | - | - | - | - | 0.06 | 3% | 0.63 | 7.2 |
| Jettison Pod (`jettison_pod`, U skill 0) | - | - | - | - | - | 0.09 | 9% | 0.88 | 14.3 |
| Ballast Lock (`ballast_lock`, U skill 2) | - | - | - | - | - | 0.06 | 17% | 0.73 | 5.8 |
| Last Light (`last_light`, R attack 3) | - | - | - | - | - | 0.03 | 16% | 0.72 | 20.9 |
| Stress Fracture (`stress_fracture`, U skill 1) | - | - | - | - | - | 0.14 | 13% | 0.61 | 14.1 |
| Second Verse (`second_verse`, U skill 1) | - | - | - | - | - | 0.14 | 11% | 0.69 | 5.2 |
| Black Box (`black_box`, U skill 1) | -4.2 ±12 | -1.0 ±3.1 | -3.8 | +0.1 | +0.7 | 0.12 | 7% | 0.65 | 13.0 |
| Scar Tissue (`scar_tissue`, R power 1) | - | - | - | - | - | 0.03 | 30% | 0.76 | 1.0 |
| Bait Flare (`bait_flare`, U skill 0) | -0.0 ±11 | -0.2 ±3.1 | +0.4 | -1.3 | +0.3 | 0.08 | 0% | - | 0.0 |
| Relay Ping (`relay_ping`, U skill 0) | - | - | - | - | - | 0.07 | 0% | - | 0.0 |
| Shardfall (`shardfall`, U attack 2) | - | - | - | - | - | 0.10 | 0% | 0.71 | 13.8 |
| Arc Lattice (`arc_lattice`, U attack 2) | - | - | - | - | - | 0.07 | 0% | 0.00 | 0.0 |
| Gyro Jammer (`gyro_jammer`, U skill 1) | - | - | - | - | - | 0.10 | 0% | 0.30 | 6.4 |
| Clean Manifest (`clean_manifest`, R attack 2) | - | - | - | - | - | 0.02 | 0% | 0.67 | 2.5 |
| Salvage Kiln (`salvage_kiln`, R power 1) | - | - | - | - | - | 0.03 | 8% | 0.80 | 0.8 |
| Prism Resonance (`prism_resonance`, R power 2) | - | - | - | - | - | 0.02 | 2% | 0.66 | 0.4 |
| Shard Cache (`shard_cache`, R skill 0) | - | - | - | - | - | 0.02 | 49% | 0.08 | 21.2 |
| Mirror Tether (`mirror_tether`, R attack 2) | - | - | - | - | - | 0.02 | 0% | 0.39 | 8.1 |
| Grav Clamp (`grav_clamp`, R skill 2) | - | - | - | - | - | 0.01 | 0% | 0.42 | 5.5 |
| Vent Plasma (`vent_plasma`, U attack 1) | - | - | - | - | - | 0.11 | 11% | 0.67 | 19.7 |
| Burn Bright (`burn_bright`, R power 2) | - | - | - | - | - | 0.02 | 5% | 0.45 | 0.8 |
| Encore (`encore`, R skill 1) | - | - | - | - | - | 0.03 | 7% | 0.72 | 0.1 |
| Fuse (`fuse`, S skill 0) | - | - | - | - | - | 0.00 | - | - | 0.0 |
| Blood Tithe (`blood_tithe`, U skill 0) | - | - | - | - | - | 0.12 | 12% | 0.50 | 16.8 |
| Capacitor Bank (`capacitor_bank`, U skill 1) | - | - | - | - | - | 0.09 | 11% | 0.71 | 3.3 |
| Salvage Kit (`salvage_kit`, U skill 1) | - | - | - | - | - | 0.10 | 11% | 0.72 | 0.1 |
| Shrapnel Charge (`shrapnel_charge`, U attack 1) | - | - | - | - | - | 0.12 | 8% | 0.73 | 8.8 |
| Strip for Parts (`strip_for_parts`, U skill 1) | - | - | - | - | - | 0.12 | 9% | 0.07 | 0.3 |
| Fault Beacon (`fault_beacon`, U skill 1) | - | - | - | - | - | 0.07 | 36% | 0.83 | 35.0 |
| Overdraft Cell (`overdraft_cell`, U skill 0) | - | - | - | - | - | 0.08 | 3% | 0.90 | 19.4 |
| Stasis Bolt (`stasis_bolt`, R attack X) | - | - | - | - | - | 0.02 | 10% | 0.81 | 22.8 |
| Snare Line (`snare_line`, U skill 1) | - | - | - | - | - | 0.08 | 14% | 0.33 | 22.1 |
| Cutting Torch (`cutting_torch`, R attack 1) | - | - | - | - | - | 0.02 | 17% | 0.83 | 10.2 |
| Starfall Lance (`starfall_lance`, R attack X) | - | - | - | - | - | 0.01 | 17% | 0.70 | 17.6 |

Weakest colourless: Arc Discharge, Spare Capacitor, Scrapheap Colossus, Star Survey, Jettison Pod, Ballast Lock, Last Light, Stress Fracture, Second Verse, Black Box, Scar Tissue, Bait Flare, Relay Ping, Shardfall, Arc Lattice. Strongest: Starfall Lance, Cutting Torch, Snare Line, Stasis Bolt, Overdraft Cell, Fault Beacon, Strip for Parts, Shrapnel Charge, Salvage Kit, Capacitor Bank, Blood Tithe, Fuse, Encore, Burn Bright, Vent Plasma.

## 4. Relics (counterfactual: granted on floor 1)

Each relic is granted before the Ascent Pact and the run is replayed on the same seeds as the no-relic baseline (spike). Pooled = every class the relic can drop for. **triggers/run**: `relic_trigger` events in the treated runs (0 = never flashed: a passive modifier or a relic that never fires; check). **held Δ**: the v1-style observational delta (runs ending with the relic minus runs without, spike), shown to expose its survivorship bias.

### 15 most overpowered

| relic | cf Δwin pooled | cf Δprog pooled | Δwin breaker | Δwin chronist | Δwin graft | triggers/run | held Δ (spike) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Star Pip (`star_pip`, common, chronist) | +7.5 ±20 | +5.2 ±4.4 ** | - | +7 ±20 | - | 62.4 | +25.0 |
| Exposed Core (`exposed_core`, boss) | -1.3 ±14 | +4.1 ±3.5 ** | -4 ±22 | - | +1 ±19 | 40.6 | -0.7 |
| Refrain Pin (`refrain_pin`, rare, chronist) | +15.0 ±18 | +2.1 ±3.2 | - | +15 ±18 | - | 36.5 | +42.6 |
| Fracture Engine (`fracture_engine`, rare) | +5.8 ±8 | +0.5 ±1.7 | +4 ±17 | +10 ±15 | +4 ±11 | 0.0 | +16.2 |
| Slow-Temper Alloy (`slow_temper`, uncommon) | +2.5 ±9 | +0.4 ±2.0 | -1 ±19 | +5 ±15 | +4 ±11 | 0.0 | +28.8 |

### 15 weakest

| relic | cf Δwin pooled | cf Δprog pooled | Δwin breaker | Δwin chronist | Δwin graft | triggers/run | held Δ (spike) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Slow-Temper Alloy (`slow_temper`, uncommon) | +2.5 ±9 | +0.4 ±2.0 | -1 ±19 | +5 ±15 | +4 ±11 | 0.0 | +28.8 |
| Fracture Engine (`fracture_engine`, rare) | +5.8 ±8 | +0.5 ±1.7 | +4 ±17 | +10 ±15 | +4 ±11 | 0.0 | +16.2 |
| Refrain Pin (`refrain_pin`, rare, chronist) | +15.0 ±18 | +2.1 ±3.2 | - | +15 ±18 | - | 36.5 | +42.6 |
| Exposed Core (`exposed_core`, boss) | -1.3 ±14 | +4.1 ±3.5 ** | -4 ±22 | - | +1 ±19 | 40.6 | -0.7 |
| Star Pip (`star_pip`, common, chronist) | +7.5 ±20 | +5.2 ±4.4 ** | - | +7 ±20 | - | 62.4 | +25.0 |

Baseline arm win rate: graft 27.5% (40 seeds), breaker 35.0% (40 seeds), chronist 47.5% (40 seeds).

CI achieved: per relic x class Δwin 95% half-width median 17.6 pts; pooled over classes median 14.4 pts; Δprog pooled median ±3.2 floors.

Relics with 0 triggers in every treated run: `fracture_engine`, `slow_temper`.

Card counterfactual CI achieved: Δwin 95% half-width median 18.8 pts per card x class; Δprog median ±5.1 floors.

## 5. Potions (spike, observational)

Gained and used per 100 runs, the share used in boss / elite / hallway fights, and the share of gained potions that were used.

| potion | gained / 100 runs | used / 100 runs | used / gained | boss / elite / monster |
| --- | --- | --- | --- | --- |
| Fault Dust (`pot_fault_dust`) | 88.8 | 88.7 | 100% | 24% / 18% / 57% |
| Flare Cell (`pot_flare_cell`) | 88.4 | 88.3 | 100% | 17% / 16% / 60% |
| Shield Gel (`pot_shield_gel`) | 88.1 | 88.1 | 100% | 20% / 19% / 59% |
| Quicksilver (`pot_quicksilver`) | 87.9 | 86.8 | 99% | 31% / 23% / 45% |
| Charge Cell (`pot_charge_cell`) | 88.4 | 86.4 | 98% | 30% / 21% / 48% |
| Concussion Gas (`pot_concussion_gas`) | 84.3 | 83.9 | 99% | 33% / 16% / 51% |
| Bastion Tonic (`pot_bastion_tonic`) | 81.7 | 81.3 | 100% | 21% / 18% / 59% |
| Shard Tincture (`pot_shard_tincture`) | 87.0 | 65.8 | 76% | 90% / 7% / 4% |
| Surge Flask (`pot_surge_flask`) | 34.4 | 33.9 | 98% | 19% / 16% / 63% |
| Seer's Draught (`pot_seers_draught`) | 33.1 | 32.6 | 98% | 32% / 21% / 46% |
| Blight Vial (`pot_blight_vial`) | 30.8 | 30.6 | 99% | 24% / 21% / 55% |
| Blood Ampoule (`pot_blood_ampoule`) | 31.9 | 30.1 | 94% | 34% / 20% / 45% |
| Riposte Salts (`pot_riposte_salts`) | 28.2 | 24.4 | 87% | 59% / 17% / 25% |
| Fracture Serum (`pot_fracture_serum`) | 34.9 | 23.0 | 66% | 47% / 16% / 36% |
| Mending Ampoule (`pot_mending_ampoule`) | 23.0 | 23.0 | 100% | 15% / 16% / 44% |
| Halt Ampoule (`pot_halt_ampoule`) | 20.7 | 20.1 | 97% | 9% / 23% / 67% |
| Echo Draught (`pot_echo_draught`) | 20.1 | 19.7 | 98% | 25% / 19% / 56% |
| Rewind Phial (`pot_rewind_phial`) | 19.6 | 19.6 | 100% | 22% / 15% / 64% |
| Mimic Gel (`pot_mimic_gel`) | 19.7 | 19.6 | 99% | 28% / 15% / 56% |
| Kiln Salts (`pot_kiln_salts`) | 31.0 | 15.3 | 49% | 43% / 19% / 37% |
| Ember Tonic (`pot_ember_tonic`) | 13.4 | 13.1 | 98% | 17% / 19% / 64% |
| Fester Draught (`pot_fester_draught`) | 12.8 | 12.2 | 96% | 46% / 17% / 36% |
| Fury Draught (`pot_fury_draught`) | 11.1 | 10.9 | 98% | 26% / 28% / 47% |
| Hourglass Tonic (`pot_hourglass_tonic`) | 10.6 | 10.2 | 97% | 35% / 10% / 46% |
| Growth Sap (`pot_growth_sap`) | 10.8 | 10.1 | 94% | 25% / 13% / 58% |
| Tempo Draught (`pot_tempo_draught`) | 10.9 | 8.6 | 79% | 64% / 12% / 25% |

## 6. Bug flags

- Cards played ≥ 20 times with zero realised value per play (not Powers): `salvage_kit` (breaker, 346 plays), `encore` (breaker, 70 plays), `propagate` (graft, 202 plays), `salvage_kit` (graft, 233 plays), `encore` (graft, 98 plays).
- Cards drawn ≥ 30 times and never played: none.
- Cards whose counterfactual changed no run at all (identical outcomes on every seed): none.
- Relics that never triggered: see section 4.
- Stalemates (a combat over 100 turns, counted as a loss): none.
- Runs that threw (engine or policy errors; excluded from every number above): none.

- Cards offered ≥ 20 times (all personas) and never picked: `relay_ping` (breaker, 65 offers), `shardfall` (breaker, 87 offers), `arc_lattice` (breaker, 51 offers), `clean_manifest` (breaker, 24 offers), `mirror_tether` (breaker, 22 offers), `encore` (breaker, 22 offers), `bait_flare` (breaker, 62 offers), `relay_ping` (chronist, 58 offers), `shardfall` (chronist, 91 offers), `arc_lattice` (chronist, 70 offers), `gyro_jammer` (chronist, 104 offers), `prism_resonance` (chronist, 22 offers), `bait_flare` (chronist, 58 offers), `relay_ping` (graft, 80 offers), `shardfall` (graft, 89 offers), `arc_lattice` (graft, 80 offers), `gyro_jammer` (graft, 89 offers), `overdraft_cell` (graft, 77 offers), `clean_manifest` (graft, 20 offers), `prism_resonance` (graft, 24 offers), `mirror_tether` (graft, 21 offers), `bait_flare` (graft, 100 offers).

## 7. Standard tier

Sections 1-6 are tier heroic. These batches played the Standard tier (same seeds `v2-<i>-<class>`). "mean" is the mean of the class rates; "pooled" is every run of the persona, with its 95% half-width.

| tier | persona | breaker | chronist | graft | mean | pooled | stalemates |
| --- | --- | --- | --- | --- | --- | --- | --- |
| tier standard | novice | 11.3% (150) | 3.3% (150) | 17.3% (150) | 10.7% | 10.7% ±2.9 | 0 |
| tier standard | spike | 80.7% (150) | 88.0% (150) | 76.0% (150) | 81.6% | 81.6% ±3.6 | 0 |
| tier standard | timmy | 31.3% (150) | 15.3% (150) | 20.0% (150) | 22.2% | 22.2% ±3.8 | 0 |
| tier standard + difficulty.standard.enemyHpPct.all=90 | novice | 4.0% (150) | 1.3% (150) | 12.0% (150) | 5.8% | 5.8% ±2.2 | 0 |
| tier standard + difficulty.standard.enemyHpPct.all=90 | spike | 72.0% (150) | 79.3% (150) | 72.0% (150) | 74.4% | 74.4% ±4.0 | 0 |
| tier standard + difficulty.standard.enemyHpPct.all=90 | timmy | 22.7% (150) | 10.0% (150) | 20.0% (150) | 17.6% | 17.6% ±3.5 | 0 |

## 8. spike drafting: prior coverage

A card offer has a usable prior when a prior file measured this exact definition for the class (n ≥ 10); otherwise the drafter scores it by the heuristic alone. Over 900 spike runs: 18521 card screens, 54255 offers.

- Offers without a usable prior: 24294 (44.8%).
- Screens where no offer had one (pure heuristic pick): 2756 (14.9%).
- Picks of a card without a usable prior: 6587 of 12757 (51.6%).
- Most-offered cards without one: `ephemeris (chronist)` 499, `loaded_spring (breaker)` 469, `hold_the_hour (chronist)` 457, `stoke (breaker)` 453, `catch_blade (breaker)` 452, `spring_tide (chronist)` 450, `grafting_cut (graft)` 448, `sap_shell (graft)` 447, `fault_line (breaker)` 445, `shear (graft)` 443, `loosen_straps (breaker)` 440, `canker_bite (graft)` 440, `ripple (chronist)` 439, `shed_husk (graft)` 437, `barb_flick (graft)` 435.
