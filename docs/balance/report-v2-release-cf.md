# Balance report: v2-release-cf

Generated 2026-11-01 by `sim/attribution.ts` from `sim/out/v2-release-cf/`. Personas: spike. Reference persona for card and encounter tables: **spike**. Real `TUNING` levers (no neutral-tuning setup). Report rendered from `src/` `a78e6da3297bcdc6 (146 files)` (`/Users/chrises/git/vibespire`). Batches: src/ a78e6da3297bcdc6 (146 files), priors v2 eb1898ba2112aeeb + v2-baseline f31bca429f34b1d5, tier heroic. Re-run: `sh sim/v2-baseline.sh` (see docs/balance/README.md).

Persona batches: 3 (300 runs each, seeds `v2-<i>-<class>`, paired across personas). Counterfactual relics: 189 relic x class variants on 46 paired seeds (policy spike). Counterfactual cards: 275 card x class variants on 18 paired seeds.

Counterfactual Δs are corrected for each baseline arm's sampling luck against the spike rate (every variant of a class shares its arm): relic breaker: baseline arm 45.7% vs spike 52.3% over 300 runs (each Δ corrected by -6.7 win, -2.7 floors); relic graft: baseline arm 32.6% vs spike 33.3% over 300 runs (each Δ corrected by -0.7 win, -0.3 floors); relic chronist: baseline arm 34.8% vs spike 37.0% over 300 runs (each Δ corrected by -2.2 win, +0.9 floors); card breaker: baseline arm 50.0% vs spike 52.3% over 300 runs (each Δ corrected by -2.3 win, -3.1 floors); card graft: baseline arm 27.8% vs spike 33.3% over 300 runs (each Δ corrected by -5.6 win, -4.6 floors); card chronist: baseline arm 16.7% vs spike 37.0% over 300 runs (each Δ corrected by -20.3 win, -2.1 floors).

**spike win rate**: breaker 52.3%, chronist 37.0%, graft 33.3%.

## PHASE_C scorecard

Targets from `docs/v2/PHASE_C.md`; ± is the 95% half-width. Every row: tier heroic.

| metric | target | measured | status |
| --- | --- | --- | --- |
| spike win, breaker | 30-45% | 52.3% ±5.7 | **MISSED** |
| spike win, chronist | 30-45% | 37.0% ±5.5 | met |
| spike win, graft | 30-45% | 33.3% ±5.3 | met |
| class spread under spike | <= 8 pts | 19.0 pts | **MISSED** |
| stalemates | 0 in 1000 runs per class | 0 in 900 runs | met |
| non-boss relic Δwin | none > +12 | dampener_coil +13, spare_fuse +18, antenna_wire +19, chain_wraps +13, overture_engine +15, engine_tooth +17, seed_pouch +17, compost_heap +14, pollen_sac +12, rot_censer +12, heartwood_ring +14, grafting_knife +12, husk_sac +21, reapers_sickle +28, plague_bloom +14, hollow_bough +12, trellis +21, tuning_fork +39, offbeat_drum +24, borrowed_time +13, refrain_pin +16, conductors_baton +22, timeline_clamp +13 | **MISSED** |
| relic traps | none < -8 | blood_rivets -9, undertow_reliquary -11, twin_scabbard -9, momentum_flywheel -9 | **MISSED** |
| cards significantly negative (cf) | none | plate_ram (breaker), chain_driver (breaker), sabre_rattle (breaker), loosen_straps (breaker), ride_the_surge (breaker), en_garde (breaker), fault_reader (breaker), jackhammer (breaker), iron_avalanche (breaker), smouldering_core (breaker), worldbreaker (breaker), overdraft_cell (breaker), stress_fracture (breaker), gyro_jammer (breaker), jettison_pod (breaker), prism_resonance (breaker), salvage_kiln (breaker), vent_plasma (breaker), burn_bright (breaker), capacitor_bank (breaker), propagate (graft), thorn_halo (graft), prism_resonance (graft), undertow (chronist), clean_manifest (chronist) | **MISSED** |
| never-played cards | none | none | met |

## Findings and recommendations

_No analyst notes yet: write them in `docs/balance/notes-v2-release-cf.md`._

## 1. Win rate by personality

Win rate with its 95% half-width. "Beat A1/A2" = runs past the act boss. Deaths by act are shares of the losses. Every persona plays the same seeds.

### breaker

| persona | runs | win | beat A1 | beat A2 | deaths A1/A2/A3 | HP lost / fight | skip rate | deck at end | elites / run | removals / run | stalemates | top death encounters |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| spike | 300 | 52.3% ±5.7 | 94% | 66% | 13% / 59% / 28% | 8.6 | 25% | 27.2 | 2.1 | 2.9 | 0 | a2_assembler 10%, a3_sovereign 8%, a2_oracle_pack 8% |

Damage sources (share of all HP lost, top 3 enemy moves) per persona:

| persona | top moves |
| --- | --- |
| spike | thornback:gore 6%, self 5%, gnasher:nip 4% |

### chronist

| persona | runs | win | beat A1 | beat A2 | deaths A1/A2/A3 | HP lost / fight | skip rate | deck at end | elites / run | removals / run | stalemates | top death encounters |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| spike | 300 | 37.0% ±5.5 | 88% | 50% | 20% / 59% / 21% | 8.3 | 25% | 27.6 | 1.6 | 0.2 | 0 | a2_oracle_pack 16%, a2_oracle_golem 10%, a2_golem_riveter 6% |

Damage sources (share of all HP lost, top 3 enemy moves) per persona:

| persona | top moves |
| --- | --- |
| spike | thornback:gore 9%, rivet_gnasher:nip 6%, rivet_gnasher:lunge 6% |

### graft

| persona | runs | win | beat A1 | beat A2 | deaths A1/A2/A3 | HP lost / fight | skip rate | deck at end | elites / run | removals / run | stalemates | top death encounters |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| spike | 300 | 33.3% ±5.3 | 88% | 56% | 18% / 48% / 35% | 10.2 | 22% | 24.6 | 1.5 | 4.5 | 0 | a2_oracle_pack 7%, a2_trihammer 7%, a3_sovereign 7% |

Damage sources (share of all HP lost, top 3 enemy moves) per persona:

| persona | top moves |
| --- | --- |
| spike | thornback:gore 8%, rivet_gnasher:lunge 5%, gnasher:nip 4% |

## 1b. Engines

Per class engine, over every persona except greedy: share of runs that drafted a piece (starters excluded), share that assembled it (a multiplier + 2 pieces; 3 pieces with a payoff when no multiplier is tagged; 3 pieces without role tags; tagged starter cards count, per the class design docs), median assembly floor, and win rate of runs that took a piece and assembled it vs took a piece and did not. **johnny** = the johnny-<engine> bot's win rate. Target (PHASE_C): every engine viable, johnny >= 25%; assembled engines win clearly more (class design docs: +10 to +25 points).

### breaker

| engine | drafted a piece | assembled | median floor | win assembled | win piece, not assembled | Δ | johnny |
| --- | --- | --- | --- | --- | --- | --- | --- |
| bastion | 100% | 31% | 17 | 71.0% (93) | 44.2% | +26.8 | - |
| counter | 100% | 40% | 17 | 62.8% (121) | 45.3% | +17.6 | - |
| crazing | 97% | 39% | 24 | 72.9% (118) | 40.7% | +32.2 | - |
| furnace | 100% | 79% | 14 | 54.4% (237) | 44.4% | +10.0 | - |
| overflow | 18% | 0% | - | - | 63.0% | - | - |
| redline | 31% | 7% | 30 | 76.2% (21) | 61.6% | +14.5 | - |
| reprise | 12% | 0% | - | - | 71.4% | - | - |
| scrapheap | 53% | 1% | 34.5 | 25.0% (4) | 61.3% | -36.3 | - |

### chronist

| engine | drafted a piece | assembled | median floor | win assembled | win piece, not assembled | Δ | johnny |
| --- | --- | --- | --- | --- | --- | --- | --- |
| calendar | 96% | 22% | 19.5 | 62.1% (66) | 30.9% | +31.2 | - |
| clockwork | 98% | 39% | 17 | 47.0% (117) | 31.5% | +15.5 | - |
| conjunction | 100% | 33% | 17 | 50.0% (100) | 30.5% | +19.5 | - |
| overflow | 7% | 1% | 33.5 | 100.0% (2) | 55.6% | +44.4 | - |
| redline | 30% | 3% | 32 | 60.0% (10) | 54.4% | +5.6 | - |
| reprise | 15% | 0% | - | - | 47.7% | - | - |
| scrapheap | 42% | 1% | 46 | 100.0% (2) | 56.0% | +44.0 | - |
| storm | 83% | 0% | 34 | 0.0% (1) | 40.6% | -40.6 | - |

### graft

| engine | drafted a piece | assembled | median floor | win assembled | win piece, not assembled | Δ | johnny |
| --- | --- | --- | --- | --- | --- | --- | --- |
| canopy | 100% | 2% | 39 | 60.0% (5) | 33.0% | +27.0 | - |
| compost | 100% | 41% | 17 | 44.7% (123) | 25.6% | +19.1 | - |
| harvest | 100% | 2% | 33 | 20.0% (5) | 33.7% | -13.7 | - |
| overflow | 7% | 0% | - | - | 55.0% | - | - |
| redline | 22% | 0% | 42 | 100.0% (1) | 43.8% | +56.3 | - |
| reprise | 15% | 0% | 33 | 100.0% (1) | 53.5% | +46.5 | - |
| ripe | 96% | 29% | 20 | 43.7% (87) | 30.2% | +13.5 | - |
| scrapheap | 42% | 0% | - | - | 46.4% | - | - |

### Mechanic telemetry (spike)

Per run: event counts for the v2 mechanics, the mean per-combat peak of each player status, the largest single-turn damage and the floor of the first 60-damage turn (an engine "pop").

**breaker**: events per run: guard_shed 22.5, next_turn_bank 0.9, timeline_resolved 2.4, riposte_triggered 65.3, cap_hit 7.7. Largest single-turn damage: median 94.5, p90 176. Runs with a 60-damage turn: 75%, first at floor 29 (median).

| player status | combats | mean peak | max |
| --- | --- | --- | --- |
| onslaught | 7167 | 6.4 | 30 |
| embers | 3873 | 3.6 | 10 |
| exposed | 3053 | 2.6 | 20 |
| spark_gap | 2471 | 1.2 | 3 |
| iron_patience | 2204 | 1.3 | 4 |
| stagger | 1997 | 2.2 | 12 |
| anvil_heart | 1827 | 1.1 | 3 |
| riposte_capacity | 1549 | 1.3 | 4 |
| crazing | 1499 | 1.0 | 1 |
| iron_rhythm | 1460 | 1.2 | 7 |
| bellows | 1441 | 1.1 | 4 |
| parry_ledger | 1311 | 1.1 | 2 |

**chronist**: events per run: next_turn_bank 0.5, timeline_gathered 1.6, beat_shift 21.4, timeline_resolved 107.9, riposte_triggered 0.1, cap_hit 13.8. Largest single-turn damage: median 108.5, p90 230. Runs with a 60-damage turn: 88%, first at floor 16 (median).

| player status | combats | mean peak | max |
| --- | --- | --- | --- |
| augury | 6233 | 1.0 | 1 |
| tide_table | 2251 | 1.2 | 4 |
| exposed | 2088 | 2.3 | 7 |
| escapement | 1867 | 1.1 | 3 |
| striking_train | 1676 | 3.2 | 11 |
| stagger | 1498 | 2.2 | 6 |
| squall_line | 1180 | 3.2 | 9 |
| total_eclipse | 1018 | 1.0 | 2 |
| perpetual_motion | 1002 | 1.1 | 3 |
| eternal_return | 792 | 1.0 | 3 |
| backlash_primed | 439 | 1.5 | 4 |
| backlash_cards | 439 | 1.5 | 4 |

**graft**: events per run: next_turn_bank 0.2, beat_shift 0.0, timeline_resolved 8.7, riposte_triggered 0.1, bloom 38.7, cap_hit 22.9. Largest single-turn damage: median 98, p90 182. Runs with a 60-damage turn: 80%, first at floor 21 (median).

| player status | combats | mean peak | max |
| --- | --- | --- | --- |
| exposed | 2262 | 2.3 | 20 |
| decomposer | 1756 | 1.2 | 3 |
| stagger | 1618 | 2.2 | 6 |
| dusk_pruning | 1565 | 1.1 | 3 |
| living_hedge | 1550 | 1.2 | 4 |
| ripening_rot | 1393 | 2.1 | 6 |
| thorn_halo | 1263 | 5.5 | 34 |
| clear_cut | 970 | 1.0 | 1 |
| thresher | 782 | 7.5 | 36 |
| perennial | 733 | 1.0 | 1 |
| hyphal_web | 685 | 1.0 | 2 |
| backlash_primed | 218 | 1.3 | 5 |

## 2. Encounter difficulty (spike)

Per fight: deaths per fight, mean HP lost (and as % of max HP, and per class), and mean turns. Sorted by act, then deaths per fight.

| encounter | act | room | fights | deaths / fight | HP lost | HP lost % max | HP lost breaker | HP lost chronist | HP lost graft | turns |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| a1_ram | 1 | boss | 290 | 9.0% | 27.4 | 35% | 30.8 | 21.2 | 29.4 | 9.7 |
| a1_alpha | 1 | elite | 260 | 5.4% | 22.4 | 29% | 26.6 | 18.6 | 21.5 | 7.0 |
| a1_empress | 1 | boss | 275 | 2.5% | 19.4 | 25% | 17.5 | 21.0 | 20.1 | 12.7 |
| a1_drone_pack | 1 | monster | 589 | 2.2% | 10.7 | 14% | 9.1 | 11.1 | 11.9 | 3.9 |
| a1_orchid | 1 | boss | 283 | 2.1% | 19.9 | 26% | 25.5 | 14.7 | 20.2 | 11.8 |
| a1_thornback_drone | 1 | monster | 637 | 1.9% | 12.0 | 16% | 11.1 | 11.3 | 13.9 | 4.7 |
| a1_thornback_wisp | 1 | monster | 596 | 0.7% | 10.0 | 13% | 8.2 | 9.8 | 12.3 | 5.0 |
| a1_vine_puff | 1 | monster | 649 | 0.5% | 6.9 | 9% | 7.1 | 6.6 | 7.0 | 6.0 |
| a1_dreadcap | 1 | elite | 231 | 0.4% | 10.3 | 14% | 11.6 | 10.0 | 9.0 | 7.7 |
| a1_titan | 1 | elite | 277 | 0.4% | 11.2 | 15% | 7.8 | 10.5 | 15.6 | 5.7 |
| a1_mantis | 1 | monster | 622 | 0.3% | 4.4 | 6% | 3.5 | 4.2 | 5.6 | 3.7 |
| a1_spore_cluster | 1 | monster | 522 | 0.2% | 4.0 | 5% | 3.3 | 4.4 | 4.2 | 4.8 |
| a1_flitter_gnasher | 1 | monster | 644 | 0.2% | 4.2 | 5% | 2.7 | 3.8 | 6.0 | 3.5 |
| a1_thornback | 1 | monster | 898 | 0.0% | 7.0 | 9% | 4.9 | 6.4 | 9.7 | 4.2 |
| a1_drone_puff | 1 | monster | 899 | 0.0% | 3.6 | 5% | 2.9 | 3.3 | 4.6 | 3.5 |
| a1_gnasher_pair | 1 | monster | 903 | 0.0% | 5.5 | 7% | 4.6 | 4.8 | 7.0 | 3.1 |
| event_spore_choir | 1 | event | 148 | 0.0% | 8.5 | 11% | 7.4 | 9.2 | 9.7 | 7.4 |
| a2_trihammer | 2 | boss | 216 | 16.2% | 26.5 | 34% | 25.6 | 24.0 | 29.4 | 9.4 |
| a2_oracle_pack | 2 | monster | 373 | 15.0% | 17.9 | 23% | 19.0 | 17.7 | 16.9 | 4.8 |
| a2_assembler | 2 | boss | 186 | 14.5% | 19.9 | 25% | 28.4 | 9.2 | 21.5 | 11.3 |
| a2_furnace | 2 | boss | 197 | 10.2% | 19.8 | 26% | 20.9 | 17.1 | 21.2 | 10.6 |
| a2_oracle_golem | 2 | monster | 393 | 8.4% | 13.7 | 18% | 14.9 | 12.4 | 13.8 | 6.2 |
| a2_anvil_hammer | 2 | elite | 154 | 7.8% | 18.0 | 23% | 20.4 | 15.4 | 16.7 | 7.4 |
| a2_golem_riveter | 2 | monster | 431 | 7.4% | 11.5 | 15% | 12.3 | 11.0 | 11.1 | 6.1 |
| a2_drone_trio | 2 | monster | 491 | 4.5% | 7.3 | 9% | 8.5 | 5.9 | 7.4 | 4.5 |
| a2_drone_riveter | 2 | monster | 416 | 4.1% | 8.0 | 10% | 6.8 | 8.8 | 8.6 | 4.7 |
| a2_acolyte_pack | 2 | monster | 471 | 4.0% | 6.6 | 9% | 5.1 | 7.4 | 7.6 | 4.8 |
| a2_acolyte_golem | 2 | monster | 427 | 3.7% | 8.8 | 11% | 11.0 | 7.6 | 7.6 | 6.0 |
| a2_auditor | 2 | elite | 155 | 1.3% | 5.2 | 7% | 4.2 | 4.5 | 6.9 | 6.6 |
| a2_boiler | 2 | elite | 159 | 0.6% | 11.0 | 14% | 11.3 | 7.0 | 14.1 | 6.2 |
| a2_drone_gnasher | 2 | monster | 816 | 0.0% | 7.3 | 10% | 4.5 | 8.3 | 9.3 | 3.9 |
| a2_riveter | 2 | monster | 805 | 0.0% | 2.3 | 3% | 0.6 | 2.7 | 3.6 | 4.1 |
| a2_rivet_pair | 2 | monster | 805 | 0.0% | 6.7 | 9% | 4.0 | 8.1 | 8.2 | 3.6 |
| event_engine_cult | 2 | event | 148 | 0.0% | 4.3 | 5% | 6.0 | 1.2 | 5.5 | 7.2 |
| a3_sovereign | 3 | boss | 147 | 21.8% | 27.0 | 34% | 27.7 | 19.0 | 33.1 | 12.3 |
| a3_leukarch | 3 | boss | 144 | 10.4% | 19.1 | 24% | 23.3 | 7.2 | 23.3 | 9.8 |
| a3_archivist | 3 | boss | 135 | 8.1% | 17.1 | 22% | 17.4 | 12.3 | 21.9 | 10.0 |
| a3_fever_pack | 3 | monster | 344 | 6.7% | 12.3 | 16% | 11.7 | 13.6 | 11.9 | 4.3 |
| a3_warden_geometer | 3 | monster | 359 | 5.8% | 12.4 | 16% | 12.4 | 9.0 | 15.5 | 6.4 |
| a3_prism_motes | 3 | monster | 355 | 4.5% | 9.4 | 12% | 9.0 | 8.4 | 10.5 | 4.5 |
| a3_warden_shard | 3 | monster | 328 | 3.4% | 4.9 | 6% | 3.1 | 7.1 | 5.0 | 4.4 |
| a3_geometer | 3 | monster | 339 | 2.7% | 6.2 | 8% | 4.7 | 4.2 | 10.1 | 4.6 |
| a3_phage_mother | 3 | elite | 110 | 1.8% | 8.8 | 11% | 9.4 | 4.2 | 10.7 | 6.8 |
| a3_event_horizon | 3 | elite | 115 | 1.7% | 14.2 | 19% | 10.2 | 14.9 | 20.2 | 5.5 |
| a3_warden_cantor | 3 | monster | 335 | 0.9% | 5.4 | 7% | 4.4 | 6.6 | 5.9 | 5.7 |
| a3_cantor | 3 | monster | 346 | 0.9% | 2.6 | 3% | 2.0 | 2.9 | 2.9 | 4.0 |
| a3_mirror_knight | 3 | elite | 124 | 0.8% | 7.6 | 10% | 3.8 | 8.6 | 12.9 | 5.0 |
| a3_seer | 3 | monster | 332 | 0.0% | 1.5 | 2% | 0.9 | 1.2 | 2.2 | 3.4 |
| a3_mote_pair | 3 | monster | 351 | 0.0% | 4.5 | 6% | 3.0 | 5.4 | 5.4 | 3.4 |
| a3_shard_mote | 3 | monster | 351 | 0.0% | 9.9 | 13% | 8.3 | 10.9 | 10.8 | 3.7 |
| event_echo | 3 | event | 120 | 0.0% | 3.2 | 4% | 1.7 | 3.0 | 5.2 | 4.3 |
| event_antibodies | 3 | event | 107 | 0.0% | 6.2 | 8% | 4.5 | 9.0 | 5.1 | 3.3 |

Top 20 enemy moves by HP dealt (spike, all classes; share of all HP lost; HP per run):

| move | share | HP / run |
| --- | --- | --- |
| `thornback:gore` | 7.8% | 15.6 |
| `rivet_gnasher:lunge` | 4.9% | 9.8 |
| `rivet_gnasher:nip` | 4.7% | 9.5 |
| `gnasher:nip` | 4.5% | 9.1 |
| `gnasher:lunge` | 4.3% | 8.6 |
| `riveter:rivet_burst` | 3.5% | 7.0 |
| `void_mote:null_pulse` | 3.4% | 6.8 |
| `furnace_drone:scorch` | 3.1% | 6.3 |
| `self` | 3.1% | 6.1 |
| `slag_golem:ingot_slam` | 2.9% | 5.9 |
| `sporepuff:sting` | 2.7% | 5.4 |
| `void_geometer:hyperedge` | 2.6% | 5.3 |
| `thornback:trample` | 2.5% | 5.0 |
| `bramble_ram:thorn_volley` | 2.2% | 4.3 |
| `trihammer_arm:piston` | 2.1% | 4.2 |
| `gloam_empress:wing_buffet` | 2.0% | 4.1 |
| `mother_orchid:vine_crush` | 2.0% | 4.0 |
| `slag_golem:spatter` | 2.0% | 3.9 |
| `bramble_ram:bramble_charge` | 1.9% | 3.8 |
| `scrap_drone:zap` | 1.5% | 3.1 |

Floor of death (spike), 3-floor buckets, share of losses per class:

| class | 1-3 | 4-6 | 7-9 | 10-12 | 13-15 | 16-18 | 19-21 | 22-24 | 25-27 | 28-30 | 31-33 | 34-36 | 37-39 | 40-42 | 43-45 | 46-48 | 49-51 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| breaker | 0% | 1% | 1% | 3% | 0% | 8% | 3% | 15% | 8% | 8% | 25% | 1% | 3% | 1% | 4% | 20% | 0% |
| chronist | 0% | 1% | 3% | 5% | 3% | 8% | 10% | 17% | 9% | 13% | 10% | 4% | 5% | 4% | 4% | 5% | 0% |
| graft | 0% | 2% | 4% | 4% | 3% | 6% | 4% | 13% | 8% | 9% | 14% | 3% | 6% | 6% | 7% | 14% | 0% |

## 3. Cards

Columns: **cf Δwin / Δprog**: counterfactual, one extra copy in the starting deck vs the same seeds without it (spike; Δprog = floors gained, a win counts +3), with 95% half-widths; ** marks an interval that excludes 0. **pick Δ**: win rate of runs that picked the card minus runs offered it that did not, stratified by persona × 6-floor bucket (all personas but greedy; still selection-biased, compare with cf). **plays/draw**: plays per copy drawn (low = dead card). **value/E**: realised value per energy paid (0-cost plays count 0.5 energy; damage + 0.9 Block + Guard + debuff stacks + 3 per card drawn + 4.5 per energy gained; Powers and Rot appliers are under-credited because later ticks belong to no card). Pick rates are per persona; "all" pools every persona except greedy.

### breaker: 15 weakest

| card | arch | cf Δwin | cf Δprog | pick Δ | offer/run | pick spike | plays/draw | value/E | value/play |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Iron Avalanche (`iron_avalanche`, R attack 2) | B | -30.1 ±27 ** | -10.3 ±6.4 ** | -26.7 ±35 | 0.51 | 4% | 0.87 | 13.0 | 26.5 |
| En Garde (`en_garde`, U skill 1) | D | -35.7 ±27 ** | -9.3 ±8.4 ** | -1.3 ±11 | 0.99 | 44% | 0.43 | 3.7 | 3.7 |
| Sabre Rattle (`sabre_rattle`, C skill 1) | G | -30.1 ±27 ** | -9.2 ±7.3 ** | +10.9 ±14 | 1.78 | 7% | 0.66 | 11.8 | 11.8 |
| Plate Ram (`plate_ram`, C attack 1) | B | -19.0 ±24 | -8.6 ±6.2 ** | - | 1.62 | 0% | n/a | n/a | n/a |
| Smouldering Core (`smouldering_core`, R power 2) | S | -7.9 ±30 | -7.9 ±7.2 ** | -21.6 ±20 | 0.54 | 19% | 0.59 | 0.6 | 0.9 |
| Fault Reader (`fault_reader`, U power 1) | G | -24.6 ±30 | -7.3 ±5.8 ** | +5.5 ±14 | 0.88 | 20% | 0.84 | 0.8 | 0.8 |
| Iron Patience (`iron_patience`, U power 1) | - | -30.1 ±27 ** | -7.3 ±8.8 | -0.6 ±15 | 0.88 | 73% | 0.70 | 0.9 | 0.9 |
| Ride the Surge (`ride_the_surge`, U skill 1) | SG | -19.0 ±24 | -7.0 ±6.1 ** | +3.7 ±12 | 0.92 | 25% | 0.53 | 10.2 | 10.2 |
| Loosen Straps (`loosen_straps`, C skill 1) | - | -13.4 ±27 | -6.9 ±5.5 ** | +4.5 ±16 | 1.57 | 7% | 0.54 | 12.6 | 12.7 |
| Read the Line (`read_the_line`, C skill 0) | SG | -13.4 ±31 | -6.8 ±7.0 | +14.2 ±13 | 1.77 | 7% | 0.79 | 17.7 | 8.8 |
| Anvil Heart (`anvil_heart`, U power 1) | SB | -19.0 ±29 | -6.6 ±6.9 | +8.0 ±12 | 0.82 | 54% | 0.86 | 1.8 | 0.9 |
| Jackhammer (`jackhammer`, R attack 1) | SG | -19.0 ±24 | -6.5 ±6.2 ** | +8.6 ±16 | 0.54 | 28% | 0.76 | 26.9 | 27.1 |
| Hair Trigger (`hair_trigger`, C skill 0) | - | -19.0 ±33 | -6.2 ±7.5 | +7.6 ±10 | 1.61 | 25% | 0.47 | 11.9 | 6.0 |
| Worldbreaker (`worldbreaker`, R attack X) | - | -24.6 ±25 | -6.2 ±5.6 ** | -2.9 ±16 | 0.48 | 35% | 0.80 | 11.7 | 31.7 |
| Chain Driver (`chain_driver`, C attack 1) | SG | -30.1 ±27 ** | -6.0 ±5.9 ** | +7.4 ±18 | 1.62 | 5% | 0.78 | 9.7 | 9.7 |

### breaker: 15 strongest

| card | arch | cf Δwin | cf Δprog | pick Δ | offer/run | pick spike | plays/draw | value/E | value/play |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Bind the Blade (`bind_the_blade`, U skill 1) | SD | +19.9 ±30 | +5.2 ±7.7 | +12.5 ±13 | 0.89 | 57% | 0.16 | 47.7 | 36.8 |
| Counterweight (`counterweight`, C attack 1) | D | -2.3 ±27 | +3.2 ±7.8 | +6.2 ±11 | 1.68 | 15% | 0.64 | 12.6 | 12.0 |
| Turnabout (`turnabout`, R skill 2) | - | +8.8 ±27 | +1.4 ±7.9 | +9.4 ±20 | 0.57 | 13% | 0.28 | 21.8 | 36.6 |
| Hammerfall (`hammerfall`, U attack 2) | S | -2.3 ±27 | +1.3 ±6.8 | -10.1 ±33 | 0.88 | 3% | 0.95 | 11.0 | 21.8 |
| Quake Hammer (`quake_hammer`, U attack 1) | S | +8.8 ±27 | +1.2 ±7.4 | +9.1 ±13 | 0.84 | 29% | 0.79 | 14.7 | 14.7 |
| Feint Step (`feint_step`, U skill 0) | D | +3.2 ±30 | +0.8 ±9.1 | +5.9 ±12 | 0.87 | 59% | 0.45 | 17.4 | 8.7 |
| Answering Steel (`answering_steel`, U attack 1) | D | +14.3 ±24 | +0.8 ±5.8 | +3.6 ±11 | 0.95 | 42% | 0.69 | 15.2 | 14.5 |
| Molten Shell (`molten_shell`, R power 1) | - | -2.3 ±22 | +0.8 ±8.0 | +7.5 ±16 | 0.48 | 67% | 0.97 | 23.6 | 11.8 |
| Breach Hammer (`breach_hammer`, C attack 1) | S | -2.3 ±32 | +0.7 ±7.8 | +0.2 ±17 | 1.63 | 4% | 0.72 | 12.3 | 12.4 |
| Bellows (`bellows`, R power 0) | - | -13.4 ±31 | +0.2 ±7.3 | -0.8 ±18 | 0.57 | 78% | 0.99 | 7.9 | 4.0 |
| Steal the Swing (`steal_the_swing`, R attack 1) | D | -2.3 ±22 | +0.1 ±7.5 | -0.5 ±14 | 0.59 | 45% | 0.52 | 15.2 | 15.2 |
| Stoke (`stoke`, C skill 1) | - | -2.3 ±27 | -0.1 ±7.7 | +1.8 ±11 | 1.64 | 20% | 0.72 | 5.4 | 5.4 |
| Pivot Sweep (`pivot_sweep`, C skill 1) | D | -2.3 ±27 | -0.2 ±5.6 | +12.3 ±10 | 1.60 | 30% | 0.26 | 31.0 | 26.6 |
| Thresher Arc (`thresher_arc`, C attack 1) | S | +3.2 ±25 | -0.4 ±6.1 | -1.1 ±13 | 1.55 | 12% | 0.85 | 14.4 | 14.4 |
| Catch Blade (`catch_blade`, C skill 1) | DB | +3.2 ±19 | -1.2 ±4.7 | +4.3 ±10 | 1.56 | 27% | 0.31 | 15.6 | 14.5 |

### chronist: 15 weakest

| card | arch | cf Δwin | cf Δprog | pick Δ | offer/run | pick spike | plays/draw | value/E | value/play |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Undertow (`undertow`, C attack 1) | S | -20.3 ±27 | -6.4 ±6.0 ** | -14.9 ±24 | 1.50 | 2% | 0.59 | 8.3 | 8.0 |
| Banked Hours (`banked_hours`, U skill 1) | P | -9.2 ±22 | -3.9 ±7.1 | -4.4 ±11 | 0.99 | 65% | 0.72 | 20.9 | 19.7 |
| Hasten (`hasten`, U skill 0) | J | -9.2 ±27 | -3.3 ±7.1 | +2.5 ±18 | 0.90 | 11% | 0.72 | 4.5 | 2.2 |
| Whistle for Wind (`whistle_for_wind`, C skill 0) | S | -14.8 ±25 | -3.3 ±8.5 | +46.3 ±86 | 1.47 | 0% | n/a | n/a | n/a |
| Accelerando (`accelerando`, U power 0) | K | -3.7 ±24 | -2.6 ±6.7 | +19.5 ±31 | 0.94 | 3% | 0.97 | 3.3 | 1.7 |
| Reckoning (`reckoning`, R attack 1) | S | -9.2 ±27 | -2.3 ±6.6 | -10.8 ±20 | 0.47 | 18% | 0.85 | 25.4 | 25.3 |
| Turn the Tide (`turn_the_tide`, U attack 1) | S | -9.2 ±22 | -1.8 ±6.2 | +14.6 ±27 | 0.96 | 4% | 0.78 | 14.4 | 13.9 |
| Watch Bell (`watch_bell`, R power 2) | J | +7.4 ±21 | -1.8 ±8.7 | +7.8 ±30 | 0.51 | 6% | 0.72 | 1.8 | 2.1 |
| Ephemeris (`ephemeris`, C skill 1) | K | -9.2 ±27 | -1.4 ±6.7 | +1.3 ±9 | 1.60 | 44% | 0.50 | 10.2 | 9.5 |
| Escapement (`escapement`, U power 1) | K | +1.9 ±30 | -1.2 ±7.1 | +3.0 ±11 | 1.00 | 51% | 0.77 | 1.7 | 1.5 |
| Hold the Hour (`hold_the_hour`, C skill 0) | J | -3.7 ±18 | -0.8 ±6.3 | -0.6 ±10 | 1.48 | 34% | 0.70 | 9.0 | 4.5 |
| Quarter Chime (`quarter_chime`, U skill 0) | K | +7.4 ±31 | -0.8 ±9.8 | +16.4 ±15 | 0.91 | 18% | 0.63 | 16.0 | 8.0 |
| Lighthouse (`lighthouse`, R skill 2) | S | -3.7 ±24 | -0.7 ±5.7 | +3.7 ±17 | 0.55 | 30% | 0.51 | 6.9 | 12.5 |
| Eye of the Storm (`eye_of_the_storm`, R power 2) | S | +1.9 ±20 | -0.6 ±4.4 | -76.5 ±86 | 0.48 | 1% | 0.67 | 0.0 | 0.0 |
| Culmination (`culmination`, R attack 2) | K | -3.7 ±24 | -0.4 ±6.2 | +0.0 ±90 | 0.48 | 1% | 0.50 | 7.5 | 15.0 |

### chronist: 15 strongest

| card | arch | cf Δwin | cf Δprog | pick Δ | offer/run | pick spike | plays/draw | value/E | value/play |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dead Reckoning (`dead_reckoning`, C skill 0) | K | +29.7 ±29 ** | +9.2 ±7.4 ** | -2.5 ±10 | 1.46 | 30% | 0.70 | 12.1 | 6.0 |
| Perpetual Motion (`perpetual_motion`, R power 1) | K | +18.6 ±23 | +6.7 ±4.8 ** | +6.2 ±15 | 0.57 | 61% | 0.88 | 2.2 | 1.1 |
| Tourbillon (`tourbillon`, R skill 0) | K | +13.0 ±22 | +6.1 ±6.2 | -6.6 ±17 | 0.52 | 71% | 0.68 | 17.3 | 8.7 |
| Wind Forward (`wind_forward`, C skill 0) | J | +7.4 ±31 | +5.9 ±5.6 ** | -0.5 ±11 | 1.53 | 17% | 0.75 | 3.6 | 1.8 |
| Balance Wheel (`balance_wheel`, C skill 1) | K | +24.1 ±28 | +5.7 ±6.8 | +8.2 ±12 | 1.48 | 17% | 0.61 | 13.1 | 10.7 |
| Appointed Hour (`appointed_hour`, U attack 2) | P | +18.6 ±23 | +5.5 ±5.3 ** | -5.1 ±14 | 0.85 | 63% | 0.77 | 20.1 | 36.7 |
| Knell (`knell`, U attack 1) | J | +13.0 ±32 | +5.3 ±8.3 | +1.3 ±13 | 0.94 | 47% | 0.89 | 27.6 | 27.0 |
| Eternal Return (`eternal_return`, R power 1) | P | +18.6 ±32 | +5.0 ±8.5 | +11.7 ±16 | 0.52 | 51% | 0.85 | 2.5 | 1.3 |
| Gear Train (`gear_train`, C attack 1) | K | -9.2 ±27 | +5.0 ±5.6 | -5.8 ±15 | 1.43 | 9% | 0.73 | 17.4 | 14.2 |
| Second Hand (`second_hand`, U attack 0) | K | +13.0 ±22 | +4.2 ±7.0 | +1.9 ±11 | 1.02 | 44% | 0.87 | 32.5 | 16.3 |
| Almanac (`almanac`, C skill 0) | J | +13.0 ±22 | +4.1 ±5.0 | -0.6 ±10 | 1.33 | 29% | 0.84 | 33.4 | 16.7 |
| Ripple (`ripple`, C attack 0) | J | +13.0 ±27 | +3.6 ±6.3 | +2.2 ±10 | 1.46 | 32% | 0.86 | 35.6 | 17.8 |
| Seen It Coming (`seen_it_coming`, R skill 1) | S | +13.0 ±22 | +2.9 ±7.1 | -11.8 ±18 | 0.53 | 21% | 0.73 | 27.5 | 16.0 |
| Set the Hour (`set_the_hour`, U skill 1) | J | +13.0 ±27 | +2.7 ±8.2 | -0.1 ±28 | 0.84 | 4% | 0.52 | 1.7 | 1.2 |
| Storm Glass (`storm_glass`, C skill 1) | J | +7.4 ±27 | +2.7 ±7.1 | -8.2 ±19 | 1.44 | 6% | 0.71 | 19.9 | 19.1 |

### graft: 15 weakest

| card | arch | cf Δwin | cf Δprog | pick Δ | offer/run | pick spike | plays/draw | value/E | value/play |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Thorn Halo (`thorn_halo`, U power 1) | G | -22.2 ±24 | -11.8 ±7.2 ** | -1.1 ±12 | 0.96 | 58% | 0.48 | 0.6 | 0.6 |
| Propagate (`propagate`, U skill 1) | M | -16.7 ±27 | -9.6 ±8.8 ** | -28.5 ±61 | 0.90 | 1% | 0.40 | 0.0 | 0.0 |
| Deep Rot (`deep_rot`, R power 1) | B | -5.6 ±32 | -8.7 ±8.7 | -33.2 ±33 | 0.60 | 3% | 0.85 | 0.0 | 0.0 |
| Thresher (`thresher`, U power 2) | C | -5.6 ±22 | -7.3 ±8.5 | -4.1 ±12 | 0.94 | 45% | 0.37 | 0.2 | 0.4 |
| Spore Lash (`spore_lash`, C attack 1) | B | +0.0 ±34 | -6.4 ±8.9 | -4.8 ±10 | 1.47 | 25% | 0.69 | 10.8 | 10.8 |
| Leaf Litter (`leaf_litter`, C skill 1) | C | -16.7 ±27 | -6.2 ±6.5 | +2.7 ±10 | 1.38 | 38% | 0.51 | 0.2 | 0.2 |
| Spore Haze (`spore_haze`, C skill 1) | B | +0.0 ±25 | -6.0 ±8.4 | -8.6 ±15 | 1.43 | 10% | 0.38 | 12.2 | 12.2 |
| Thornwhirl (`thornwhirl`, C attack 2) | M | +5.6 ±35 | -5.4 ±10.3 | +13.5 ±27 | 1.44 | 3% | 0.55 | 12.1 | 23.9 |
| Ripening Rot (`ripening_rot`, U power 1) | B | +0.0 ±30 | -5.1 ±8.7 | -18.5 ±11 | 0.92 | 43% | 0.85 | 1.2 | 0.6 |
| Perennial (`perennial`, R power 1) | G | +0.0 ±19 | -5.1 ±7.4 | -2.2 ±15 | 0.54 | 57% | 0.76 | 1.5 | 0.9 |
| Decomposer (`decomposer`, U power 1) | C | -11.1 ±25 | -4.3 ±8.8 | -0.3 ±13 | 0.95 | 69% | 0.71 | 1.1 | 0.6 |
| Canopy Crush (`canopy_crush`, U attack 2) | M | -5.6 ±27 | -4.3 ±7.5 | -12.5 ±22 | 0.86 | 7% | 0.60 | 12.7 | 25.4 |
| Burl Wall (`burl_wall`, U skill 2) | M | -5.6 ±27 | -4.2 ±9.3 | +16.9 ±13 | 0.87 | 31% | 0.39 | 10.5 | 20.8 |
| Verdant Tide (`verdant_tide`, R attack 2) | M | -11.1 ±34 | -4.1 ±8.9 | +78.6 ±88 | 0.59 | 1% | 0.28 | 8.0 | 16.0 |
| Humus Rite (`humus_rite`, R skill 1) | C | -5.6 ±27 | -4.1 ±10.0 | -3.8 ±18 | 0.52 | 24% | 0.41 | 0.9 | 0.7 |

### graft: 15 strongest

| card | arch | cf Δwin | cf Δprog | pick Δ | offer/run | pick spike | plays/draw | value/E | value/play |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Thornstorm (`thornstorm`, R attack X) | M | +27.8 ±27 ** | +9.4 ±8.4 ** | +24.1 ±16 | 0.51 | 36% | 0.85 | 21.8 | 56.5 |
| Heartwood Spear (`heartwood_spear`, R attack 2) | G | +38.9 ±24 ** | +8.6 ±8.9 | +18.7 ±19 | 0.49 | 24% | 0.81 | 40.0 | 41.1 |
| Molt (`molt`, C skill 1) | C | +27.8 ±27 ** | +7.7 ±7.5 ** | +8.5 ±22 | 1.55 | 3% | 0.80 | 7.0 | 7.1 |
| Root Mesh (`root_mesh`, C skill 1) | M | +0.0 ±34 | +4.5 ±8.8 | +10.0 ±13 | 1.52 | 13% | 0.53 | 7.8 | 7.9 |
| Shear (`shear`, C attack 1) | C | +11.1 ±29 | +3.2 ±8.4 | +6.8 ±11 | 1.37 | 20% | 0.83 | 6.1 | 6.1 |
| Crystal Graft (`crystal_graft`, R skill 0) | G | +11.1 ±24 | +3.0 ±9.3 | -9.8 ±17 | 0.55 | 20% | 0.29 | 1.0 | 0.5 |
| Grim Harvest (`grim_harvest`, R skill 2) | B | +11.1 ±33 | +2.3 ±9.8 | +7.7 ±15 | 0.58 | 54% | 0.93 | 21.1 | 42.3 |
| Burst Pod (`burst_pod`, C skill 0) | B | +5.6 ±31 | +2.3 ±9.0 | +0.5 ±10 | 1.31 | 30% | 0.91 | 55.1 | 27.6 |
| Choking Spores (`choking_spores`, U skill 1) | B | +11.1 ±33 | +1.8 ±11.3 | +1.6 ±12 | 1.00 | 53% | 0.63 | 12.8 | 12.8 |
| Deep Graft (`deep_graft`, C skill 1) | G | +5.6 ±31 | +1.4 ±9.5 | +2.0 ±9 | 1.45 | 32% | 0.51 | 4.0 | 4.0 |
| Patient Thorn (`patient_thorn`, U attack 1) | G | +0.0 ±25 | +1.1 ±8.7 | +14.8 ±12 | 0.97 | 31% | 0.92 | 20.6 | 20.4 |
| Uproot (`uproot`, U attack 2) | C | +5.6 ±31 | +1.0 ±8.6 | +4.0 ±12 | 0.99 | 28% | 0.43 | 5.7 | 11.3 |
| Tendril Reach (`tendril_reach`, C skill 1) | M | +5.6 ±31 | +0.8 ±10.1 | +4.8 ±9 | 1.43 | 42% | 0.59 | 12.4 | 12.4 |
| Barb Flick (`barb_flick`, C attack 0) | M | +5.6 ±27 | +0.2 ±8.7 | +11.0 ±10 | 1.56 | 25% | 0.84 | 23.1 | 11.6 |
| Miasma Sweep (`miasma_sweep`, U attack 2) | B | +0.0 ±25 | +0.1 ±7.4 | -6.3 ±11 | 1.02 | 46% | 0.64 | 15.1 | 30.0 |

### Colourless (cf pooled over the classes; per-class columns in the CSV)

| card | cf Δwin (pooled) | cf Δprog (pooled) | Δprog breaker | Δprog chronist | Δprog graft | offer/run | pick (all) | plays/draw | value/E |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Burn Bright (`burn_bright`, R power 2) | -20.5 ±16 | -6.2 ±4.6 | -11.7 | -4.7 | -2.3 | 0.16 | 1% | 0.33 | 0.0 |
| Prism Resonance (`prism_resonance`, R power 2) | -9.4 ±15 | -6.2 ±4.4 | -7.1 | -2.1 | -9.4 | 0.03 | 4% | 0.27 | 0.4 |
| Clean Manifest (`clean_manifest`, R attack 2) | -16.8 ±16 | -6.0 ±4.4 | -4.2 | -8.3 | -5.3 | 0.02 | 0% | - | 0.0 |
| Blood Tithe (`blood_tithe`, U skill 0) | -14.9 ±14 | -5.0 ±4.8 | -7.8 | -2.3 | -4.8 | 0.29 | 3% | 0.73 | 28.6 |
| Mirror Tether (`mirror_tether`, R attack 2) | -9.4 ±15 | -4.9 ±4.8 | -5.4 | -5.3 | -4.1 | 0.02 | 0% | - | 0.0 |
| Gyro Jammer (`gyro_jammer`, U skill 1) | -11.3 ±15 | -4.7 ±4.5 | -10.3 | +1.2 | -4.9 | 0.09 | 0% | - | 0.0 |
| Scar Tissue (`scar_tissue`, R power 1) | -11.3 ±16 | -4.6 ±4.9 | -4.8 | -1.4 | -7.6 | 0.14 | 16% | 0.78 | 1.3 |
| Vent Plasma (`vent_plasma`, U attack 1) | -9.4 ±13 | -3.8 ±3.7 | -8.3 | +0.8 | -3.9 | 0.28 | 4% | 0.76 | 19.7 |
| Stress Fracture (`stress_fracture`, U skill 0) | -13.1 ±15 | -3.7 ±4.2 | -9.0 | +1.4 | -3.6 | 0.27 | 16% | 0.79 | 28.1 |
| Scrapheap Colossus (`scrapheap_colossus`, R attack 1) | -11.3 ±14 | -3.5 ±4.1 | -7.2 | -3.4 | +0.1 | 0.14 | 16% | 0.87 | 14.1 |
| Ballast Lock (`ballast_lock`, U skill 2) | -5.7 ±16 | -3.2 ±4.8 | -6.1 | -0.5 | -3.2 | 0.07 | 18% | 0.72 | 5.7 |
| Strip for Parts (`strip_for_parts`, U skill 1) | -5.4 ±16 | -3.2 ±5.2 | -5.8 | +1.4 | -5.1 | 0.35 | 0% | 0.30 | 0.0 |
| Arc Lattice (`arc_lattice`, U attack 2) | -9.4 ±17 | -2.8 ±5.0 | -2.5 | +1.3 | -7.1 | 0.06 | 2% | 0.65 | 11.0 |
| Grav Clamp (`grav_clamp`, R skill 2) | -3.9 ±16 | -2.7 ±4.2 | -5.6 | -0.7 | -1.7 | 0.03 | 0% | - | 0.0 |
| Encore (`encore`, U skill 1) | -3.5 ±16 | -2.6 ±4.3 | -6.1 | +1.4 | -2.8 | 0.22 | 1% | 1.00 | 0.7 |
| Shrapnel Charge (`shrapnel_charge`, U attack 1) | -7.3 ±14 | -2.3 ±4.0 | -3.5 | -2.1 | -1.2 | 0.34 | 5% | 0.83 | 11.2 |
| Salvage Kit (`salvage_kit`, U skill 1) | -5.7 ±17 | -2.2 ±5.2 | -3.6 | +0.6 | -3.6 | 0.09 | 18% | 0.73 | 0.1 |
| Stasis Bolt (`stasis_bolt`, R attack X) | -9.2 ±16 | -2.0 ±4.6 | -6.0 | +2.8 | -2.4 | 0.06 | 24% | 0.86 | 31.0 |
| Shard Cache (`shard_cache`, R skill 0) | -3.9 ±19 | -1.8 ±5.4 | -3.3 | +2.3 | -4.4 | 0.02 | 25% | 0.13 | 19.0 |
| Overdraft Cell (`overdraft_cell`, U skill 0) | -2.0 ±17 | -1.7 ±4.8 | -10.8 | +4.0 | +1.7 | 0.09 | 5% | 0.94 | 21.9 |
| Capacitor Bank (`capacitor_bank`, U skill 0) | -2.0 ±15 | -1.7 ±4.3 | -9.5 | +4.7 | -0.2 | 0.18 | 16% | 0.69 | 6.1 |
| Salvage Kiln (`salvage_kiln`, R power 1) | -5.7 ±14 | -1.6 ±3.9 | -7.6 | +0.2 | +2.7 | 0.16 | 11% | 0.76 | 1.1 |
| Second Verse (`second_verse`, U skill 1) | -3.5 ±15 | -1.4 ±4.4 | -2.1 | -0.9 | -1.2 | 0.20 | 12% | 0.73 | 7.1 |
| Bait Flare (`bait_flare`, U skill 0) | -5.4 ±17 | -1.3 ±4.6 | -1.6 | -2.2 | -0.1 | 0.08 | 0% | - | 0.0 |
| Black Box (`black_box`, U skill 0) | +1.7 ±14 | -0.9 ±3.9 | -7.1 | +5.2 | -0.7 | 0.34 | 0% | 1.00 | 33.0 |
| Relay Ping (`relay_ping`, U skill 0) | +5.4 ±17 | -0.7 ±4.7 | -3.1 | +1.0 | +0.0 | 0.08 | 4% | 0.85 | 20.3 |
| Cutting Torch (`cutting_torch`, R attack 1) | -2.0 ±15 | -0.6 ±4.5 | -1.3 | +0.5 | -1.2 | 0.02 | 27% | 0.84 | 10.1 |
| Fuse (`fuse`, S skill 0) | - | - | - | - | - | 0.00 | - | - | 0.0 |
| Shardfall (`shardfall`, U attack 2) | -3.9 ±16 | +0.3 ±4.1 | +3.3 | +0.5 | -2.9 | 0.09 | 6% | 0.77 | 11.1 |
| Arc Discharge (`arc_discharge`, U attack X) | -3.5 ±16 | +0.3 ±4.3 | -0.4 | +0.5 | +0.8 | 0.17 | 2% | 1.00 | 11.5 |
| Jettison Pod (`jettison_pod`, U skill 0) | +3.6 ±16 | +0.5 ±4.8 | -6.3 | +5.0 | +2.7 | 0.09 | 11% | 0.88 | 13.8 |
| Star Survey (`star_survey`, U skill 0) | +7.3 ±16 | +0.7 ±4.6 | -4.9 | +4.3 | +2.9 | 0.10 | 6% | 0.59 | 7.4 |
| Fault Beacon (`fault_beacon`, U skill 1) | +5.4 ±14 | +1.1 ±4.1 | +0.1 | +10.1 | -6.9 | 0.07 | 64% | 0.83 | 36.2 |
| Starfall Lance (`starfall_lance`, R attack X) | +7.3 ±15 | +1.7 ±3.9 | -0.5 | +1.6 | +4.1 | 0.05 | 23% | 0.71 | 15.5 |
| Spare Capacitor (`spare_capacitor`, U skill 0) | +12.8 ±16 | +3.6 ±4.3 | +1.1 | +4.1 | +5.7 | 0.36 | 1% | 0.87 | 26.0 |
| Last Light (`last_light`, R attack 3) | +14.7 ±18 | +4.2 ±4.9 | +4.2 | +2.4 | +6.1 | 0.15 | 43% | 0.68 | 18.9 |
| Snare Line (`snare_line`, U skill 1) | +29.5 ±14 | +7.4 ±4.3 | +6.2 | +11.9 | +4.1 | 0.09 | 16% | 0.34 | 19.1 |

Weakest colourless: Burn Bright, Prism Resonance, Clean Manifest, Blood Tithe, Mirror Tether, Gyro Jammer, Scar Tissue, Vent Plasma, Stress Fracture, Scrapheap Colossus, Ballast Lock, Strip for Parts, Arc Lattice, Grav Clamp, Encore. Strongest: Snare Line, Last Light, Spare Capacitor, Starfall Lance, Fault Beacon, Star Survey, Jettison Pod, Arc Discharge, Shardfall, Fuse, Cutting Torch, Relay Ping, Black Box, Bait Flare, Second Verse.

## 4. Relics (counterfactual: granted on floor 1)

Each relic is granted before the Ascent Pact and the run is replayed on the same seeds as the no-relic baseline (spike). Pooled = every class the relic can drop for. **triggers/run**: `relic_trigger` events in the treated runs (0 = never flashed: a passive modifier or a relic that never fires; check). **held Δ**: the v1-style observational delta (runs ending with the relic minus runs without, spike), shown to expose its survivorship bias.

### 15 most overpowered

| relic | cf Δwin pooled | cf Δprog pooled | Δwin breaker | Δwin chronist | Δwin graft | triggers/run | held Δ (spike) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Tuning Fork (`tuning_fork`, common, chronist) | +39.1 ±19 ** | +10.6 ±4.8 ** | - | +39 ±19 | - | 45.2 | +29.6 |
| Husk Sac (`husk_sac`, uncommon, graft) | +21.0 ±18 ** | +7.0 ±4.8 ** | - | - | +21 ±18 | 36.8 | +16.9 |
| Cracked Hourglass (`cracked_hourglass`, boss) | +25.1 ±11 ** | +7.0 ±2.7 ** | +22 ±18 | +37 ±17 | +17 ±20 | 0.0 | +18.0 |
| Offbeat Drum (`offbeat_drum`, uncommon, chronist) | +23.9 ±18 ** | +6.3 ±4.3 ** | - | +24 ±18 | - | 0.0 | +20.4 |
| Triage Locker (`triage_locker`, boss) | +20.9 ±10 ** | +6.2 ±2.5 ** | +17 ±19 | +22 ±19 | +23 ±15 | 95.9 | +17.6 |
| Binding Contract (`binding_contract`, boss) | +20.0 ±11 ** | +6.1 ±2.9 ** | +19 ±19 | +22 ±19 | +19 ±20 | 0.0 | +34.5 |
| Fixed Star (`fixed_star`, boss, chronist) | +11.1 ±20 | +6.1 ±4.8 ** | - | +11 ±20 | - | 37.9 | -4.6 |
| Conductor's Baton (`conductors_baton`, rare, chronist) | +21.7 ±15 ** | +5.9 ±3.3 ** | - | +22 ±15 | - | 0.0 | +5.9 |
| Ghost Lantern (`ghost_lantern`, boss) | +18.0 ±10 ** | +5.7 ±2.7 ** | +9 ±17 | +18 ±19 | +28 ±18 | 53.6 | +18.7 |
| Reaper's Sickle (`reapers_sickle`, uncommon, graft) | +27.5 ±18 ** | +5.3 ±3.5 ** | - | - | +28 ±18 | 35.3 | +9.4 |
| Wanderer's Compact (`wanderers_compact`, boss) | +15.8 ±11 ** | +5.2 ±2.8 ** | -9 ±19 | +18 ±19 | +38 ±20 | 0.0 | +16.8 |
| Tender Plating (`tender_plating`, boss) | +18.0 ±11 ** | +4.9 ±3.0 ** | +9 ±19 | +27 ±19 | +19 ±20 | 0.0 | +10.7 |
| Star Pip (`star_pip`, common, chronist) | +10.8 ±22 | +4.8 ±5.2 | - | +11 ±22 | - | 61.5 | +12.3 |
| Trellis (`trellis`, rare, graft) | +21.0 ±16 ** | +4.5 ±3.2 ** | - | - | +21 ±16 | 99.5 | +5.3 |
| Seed Pouch (`seed_pouch`, common, graft) | +16.7 ±18 | +4.4 ±4.5 | - | - | +17 ±18 | 5.2 | +4.0 |

### 15 weakest

| relic | cf Δwin pooled | cf Δprog pooled | Δwin breaker | Δwin chronist | Δwin graft | triggers/run | held Δ (spike) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Crowd Breaker (`crowd_breaker`, uncommon, breaker) | -6.7 ±17 | -3.1 ±3.6 | -7 ±17 | - | - | 8.1 | +17.3 |
| Slag Bucket (`slag_bucket`, common, breaker) | -6.7 ±15 | -2.9 ±2.8 ** | -7 ±15 | - | - | 18.2 | +27.3 |
| Undertow Reliquary (`undertow_reliquary`, rare) | -11.2 ±10 ** | -2.7 ±3.0 | -26 ±14 | -13 ±19 | +6 ±19 | 8.2 | +9.0 |
| Momentum Flywheel (`momentum_flywheel`, rare, breaker) | -8.9 ±16 | -2.4 ±4.4 | -9 ±16 | - | - | 5.5 | +37.6 |
| Perpetual Calendar (`perpetual_calendar`, boss, chronist) | -6.7 ±21 | -2.3 ±5.3 | - | -7 ±21 | - | 0.0 | - |
| Wild Growth (`wild_growth`, boss, graft) | +8.0 ±19 | -2.2 ±5.6 | - | - | +8 ±19 | 20.3 | - |
| Blood Rivets (`blood_rivets`, uncommon, breaker) | -8.9 ±19 | -2.1 ±4.7 | -9 ±19 | - | - | 22.3 | +20.0 |
| Parry Charm (`parry_charm`, uncommon, breaker) | -4.5 ±16 | -1.4 ±2.9 | -5 ±16 | - | - | 23.5 | +15.4 |
| Surveyor's Ink (`surveyor_ink`, common) | -3.9 ±7 | -1.2 ±1.3 | -7 ±14 | -7 ±14 | +1 ±10 | 1.7 | +23.9 |
| Stasis Engine (`stasis_engine`, boss) | -7.6 ±12 | -1.2 ±2.9 | -24 ±21 | +4 ±20 | -3 ±19 | 0.0 | - |
| Cracked Prism (`cracked_prism`, common) | -1.0 ±9 | -1.1 ±2.1 | -2 ±16 | -2 ±16 | +1 ±17 | 6.8 | +23.0 |
| Field Dressing (`field_dressing`, common) | -0.3 ±7 | -0.9 ±1.3 | -7 ±12 | -4 ±11 | +10 ±11 | 1.0 | +20.7 |
| Oracle Pebble (`oracle_pebble`, event) | -1.5 ±3 | -0.9 ±0.8 ** | -5 ±4 | - | +1 ±4 | 3.0 | +13.8 |
| Void Compass (`void_compass`, rare) | -3.2 ±10 | -0.5 ±2.0 | -9 ±18 | -4 ±16 | +4 ±18 | 0.0 | +18.8 |
| Hairline Saw (`hairline_saw`, uncommon) | +0.4 ±7 | -0.5 ±1.4 | -2 ±12 | +2 ±14 | +1 ±10 | 9.1 | +15.6 |

Baseline arm win rate: breaker 45.7% (46 seeds), graft 32.6% (46 seeds), chronist 34.8% (46 seeds).

CI achieved: per relic x class Δwin 95% half-width median 17.4 pts; pooled over classes median 13.4 pts; Δprog pooled median ±3.0 floors.

Relics with 0 triggers in every treated run: `slow_temper`, `shard_crucible`, `fracture_engine`, `void_compass`, `orbital_hammer`, `binding_contract`, `stasis_engine`, `tender_plating`, `heavy_heart`, `wanderers_compact`, `gravity_loom`, `cracked_hourglass`, `ascendant_prism`, `salvagers_licence`, `shard_writ`, `shard_debt`, `rot_censer`, `grafting_knife`, `mycelial_net`, `elder_seed`, `offbeat_drum`, `metronome_heart`, `prophet_glass`, `conductors_baton`, `perpetual_calendar`, `timeline_clamp`.

Card counterfactual CI achieved: Δwin 95% half-width median 27.4 pts per card x class; Δprog median ±7.6 floors.

## 5. Potions (spike, observational)

Gained and used per 100 runs, the share used in boss / elite / hallway fights, and the share of gained potions that were used.

| potion | gained / 100 runs | used / 100 runs | used / gained | boss / elite / monster |
| --- | --- | --- | --- | --- |
| Shield Gel (`pot_shield_gel`) | 89.3 | 89.3 | 100% | 23% / 19% / 57% |
| Fault Dust (`pot_fault_dust`) | 84.8 | 84.4 | 100% | 23% / 19% / 57% |
| Flare Cell (`pot_flare_cell`) | 84.3 | 84.0 | 100% | 19% / 15% / 59% |
| Bastion Tonic (`pot_bastion_tonic`) | 82.8 | 82.6 | 100% | 21% / 19% / 59% |
| Charge Cell (`pot_charge_cell`) | 84.1 | 81.8 | 97% | 27% / 19% / 52% |
| Quicksilver (`pot_quicksilver`) | 82.3 | 81.7 | 99% | 33% / 21% / 45% |
| Concussion Gas (`pot_concussion_gas`) | 79.7 | 79.1 | 99% | 31% / 18% / 51% |
| Shard Tincture (`pot_shard_tincture`) | 86.7 | 65.6 | 76% | 88% / 7% / 5% |
| Blight Vial (`pot_blight_vial`) | 33.8 | 33.7 | 100% | 26% / 20% / 53% |
| Seer's Draught (`pot_seers_draught`) | 31.0 | 30.1 | 97% | 32% / 23% / 44% |
| Blood Ampoule (`pot_blood_ampoule`) | 31.0 | 28.9 | 93% | 29% / 21% / 50% |
| Fracture Serum (`pot_fracture_serum`) | 35.9 | 24.9 | 69% | 39% / 16% / 45% |
| Riposte Salts (`pot_riposte_salts`) | 27.4 | 24.0 | 87% | 51% / 20% / 28% |
| Mending Ampoule (`pot_mending_ampoule`) | 22.3 | 22.2 | 100% | 12% / 16% / 46% |
| Mimic Gel (`pot_mimic_gel`) | 21.3 | 20.6 | 96% | 28% / 15% / 56% |
| Halt Ampoule (`pot_halt_ampoule`) | 20.2 | 19.9 | 98% | 8% / 22% / 70% |
| Rewind Phial (`pot_rewind_phial`) | 18.7 | 18.4 | 99% | 19% / 15% / 65% |
| Echo Draught (`pot_echo_draught`) | 18.3 | 18.1 | 99% | 25% / 21% / 53% |
| Kiln Salts (`pot_kiln_salts`) | 30.6 | 15.2 | 50% | 44% / 20% / 34% |
| Fester Draught (`pot_fester_draught`) | 12.6 | 12.3 | 98% | 43% / 14% / 42% |
| Fury Draught (`pot_fury_draught`) | 11.3 | 11.0 | 97% | 25% / 21% / 51% |
| Growth Sap (`pot_growth_sap`) | 11.6 | 10.8 | 93% | 27% / 10% / 63% |
| Ember Tonic (`pot_ember_tonic`) | 11.0 | 10.7 | 97% | 15% / 26% / 59% |
| Surge Flask (`pot_surge_flask`) | 36.6 | 10.2 | 28% | 49% / 20% / 30% |
| Hourglass Tonic (`pot_hourglass_tonic`) | 9.7 | 9.4 | 98% | 29% / 20% / 36% |
| Tempo Draught (`pot_tempo_draught`) | 9.1 | 7.3 | 80% | 73% / 8% / 20% |

## 6. Bug flags

- Cards played ≥ 20 times with zero realised value per play (not Powers): `forge_oath` (breaker, 108 plays), `salvage_kit` (breaker, 166 plays), `salvage_kit` (graft, 32 plays).
- Cards drawn ≥ 30 times and never played: none.
- Cards whose counterfactual changed no run at all (identical outcomes on every seed): none.
- Relics that never triggered: see section 4.
- Stalemates (a combat over 100 turns, counted as a loss): none.
- Runs that threw (engine or policy errors; excluded from every number above): none.

- Cards offered ≥ 20 times (all personas) and never picked: `plate_ram` (breaker, 487 offers), `gyro_jammer` (breaker, 26 offers), `black_box` (breaker, 110 offers), `encore` (breaker, 66 offers), `bait_flare` (breaker, 25 offers), `shardfall` (chronist, 29 offers), `gyro_jammer` (chronist, 30 offers), `spare_capacitor` (chronist, 83 offers), `strip_for_parts` (chronist, 99 offers), `burn_bright` (chronist, 38 offers), `arc_discharge` (chronist, 39 offers), `bait_flare` (chronist, 22 offers), `arc_lattice` (graft, 23 offers), `gyro_jammer` (graft, 22 offers), `black_box` (graft, 102 offers), `strip_for_parts` (graft, 100 offers), `burn_bright` (graft, 44 offers), `arc_discharge` (graft, 40 offers), `encore` (graft, 77 offers), `bait_flare` (graft, 27 offers).

## 7. spike drafting: prior coverage

A card offer has a usable prior when a prior file measured this exact definition for the class (n ≥ 10); otherwise the drafter scores it by the heuristic alone. Over 900 spike runs: 18908 card screens, 57134 offers.

- Offers without a usable prior: 26717 (46.8%).
- Screens where no offer had one (pure heuristic pick): 2503 (13.2%).
- Picks of a card without a usable prior: 7571 of 14397 (52.6%).
- Most-offered cards without one: `stoke (breaker)` 491, `fault_line (breaker)` 484, `hair_trigger (breaker)` 484, `ephemeris (chronist)` 481, `loaded_spring (breaker)` 471, `loosen_straps (breaker)` 470, `catch_blade (breaker)` 469, `barb_flick (graft)` 469, `molt (graft)` 465, `root_mesh (graft)` 456, `grafting_cut (graft)` 453, `mulch_maul (graft)` 448, `hold_the_hour (chronist)` 445, `noon_gun (chronist)` 442, `hivestrike (graft)` 442.
