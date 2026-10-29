# Balance report: final

Generated 2026-10-29 by `sim/report.ts` from `sim/out/final-breaker.json`, `sim/out/final-graft.json`, `sim/out/final-chronist.json`.

| class | policy | content | runs | seed prefix | overrides | sim time |
| --- | --- | --- | --- | --- | --- | --- |
| breaker | greedy | real | 1000 | final | none | 637.2 s |
| graft | greedy | real | 1000 | final | none | 323.4 s |
| chronist | greedy | real | 1000 | final | none | 535.4 s |

## Summary

| class | win rate | stalemates | reach A1 boss | beat A1 boss | beat A2 boss | HP at A1 boss | skip rate | Shards earned A1/A2/A3 | deck size A1/A2/A3 | cap hits / turn |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| breaker | 31.6% | 1 | 99.1% | 95.1% | 45.6% | 85.7% | 28.8% | 3.3 / 2.7 / 1.2 | 19 / 22 / 26 | 5.70% |
| graft | 23.7% | 1 | 99.4% | 96.4% | 50.1% | 79.3% | 23.3% | 3.1 / 2.1 / 1.0 | 18 / 21 / 26 | 45.10% |
| chronist | 30.4% | 1 | 96.2% | 94.0% | 48.9% | 77.5% | 27.4% | 3.2 / 2.4 / 1.3 | 19 / 23 / 27 | 5.40% |

Win-rate spread between classes: 7.9% (target ≤ 8%).

## Suspects

Cards with a pick rate in the bottom or top 5% of their class (offered ≥ max(10, 1% of screens)), relics with |win Δ| > 10 points (held in ≥ 5% of runs), encounters whose HP lost exceeds ENEMIES §4.1 by > 30% (≥ 10 fights), missed GDD §8.4 milestones, and stalemates (a combat over the turn limit, counted as a loss), and cap-hit rates over 1% of turns. Ranked by severity. Relic and card win deltas carry survivorship bias: runs that live longer collect more relics and cards, so with a low win rate most positive deltas mean "held by runs that got far". Compare them with each other, not with zero.


| class | kind | id | why |
| --- | --- | --- | --- |
| graft | cap | `cap_hits` | caps hit in 45.10% of turns (target < 1%): cap_stacks 36550, cap_hand 1421, cap_prune_away 19 |
| chronist | relic | `crown_fragment` | win Δ +53.9 pts (96 runs) |
| breaker | relic | `crown_fragment` | win Δ +53.0 pts (101 runs) |
| breaker | relic | `gravity_loom` | win Δ +47.9 pts (99 runs) |
| graft | relic | `gravity_loom` | win Δ +46.9 pts (105 runs) |
| graft | relic | `crown_fragment` | win Δ +46.4 pts (96 runs) |
| chronist | relic | `ghost_lantern` | win Δ +40.6 pts (397 runs) |
| breaker | stalemate | `enc_a1_orchid` | 1 run(s) ended in a stalemate (combat over the turn limit; counted as losses) |
| graft | stalemate | `enc_a2_assembler` | 1 run(s) ended in a stalemate (combat over the turn limit; counted as losses) |
| chronist | stalemate | `enc_a1_vine_puff` | 1 run(s) ended in a stalemate (combat over the turn limit; counted as losses) |
| chronist | relic | `star_pip` | win Δ +39.0 pts (266 runs) |
| breaker | cap | `cap_hits` | caps hit in 5.70% of turns (target < 1%): cap_hand 4774, cap_stacks 1627, cap_to_hand 308 |
| chronist | cap | `cap_hits` | caps hit in 5.40% of turns (target < 1%): cap_hand 4111, cap_stacks 548, cap_draw 256 |
| breaker | relic | `notched_buckler` | win Δ +36.9 pts (291 runs) |
| chronist | relic | `binding_contract` | win Δ +36.7 pts (238 runs) |
| breaker | relic | `binding_contract` | win Δ +35.5 pts (257 runs) |
| breaker | relic | `chain_wraps` | win Δ +33.9 pts (325 runs) |
| chronist | relic | `cracked_hourglass` | win Δ -33.3 pts (246 runs) |
| breaker | relic | `bulwark_rivets` | win Δ +32.4 pts (307 runs) |
| chronist | relic | `geode_heart` | win Δ +31.6 pts (269 runs) |
| chronist | relic | `timeline_clamp` | win Δ +31.6 pts (79 runs) |
| breaker | relic | `ghost_lantern` | win Δ +30.6 pts (387 runs) |
| breaker | relic | `fracture_engine` | win Δ +29.1 pts (151 runs) |
| graft | relic | `binding_contract` | win Δ +28.9 pts (292 runs) |
| breaker | relic | `bastion_core` | win Δ +28.8 pts (144 runs) |
| breaker | relic | `shard_writ` | win Δ +28.8 pts (90 runs) |
| breaker | relic | `geode_heart` | win Δ +28.7 pts (302 runs) |
| chronist | relic | `timeline_spool` | win Δ +28.5 pts (195 runs) |
| breaker | relic | `glass_spurs` | win Δ +28.1 pts (305 runs) |
| breaker | relic | `stim_patch` | win Δ +28.0 pts (308 runs) |
| chronist | relic | `hairline_saw` | win Δ +28.0 pts (186 runs) |
| breaker | relic | `tender_plating` | win Δ +27.8 pts (97 runs) |
| chronist | relic | `tuning_fork` | win Δ +26.8 pts (282 runs) |
| graft | relic | `stim_patch` | win Δ +26.6 pts (277 runs) |
| breaker | relic | `kept_fury` | win Δ +26.4 pts (195 runs) |
| chronist | relic | `bulwark_rivets` | win Δ +26.2 pts (266 runs) |
| chronist | relic | `tender_plating` | win Δ +25.8 pts (51 runs) |
| graft | relic | `cracked_hourglass` | win Δ -25.4 pts (309 runs) |
| chronist | relic | `shard_lens` | win Δ +25.3 pts (193 runs) |
| breaker | relic | `scrap_magnet` | win Δ +25.1 pts (275 runs) |
| breaker | relic | `surveyor_ink` | win Δ +24.8 pts (310 runs) |
| breaker | relic | `practice_dummy` | win Δ +24.7 pts (83 runs) |
| breaker | relic | `dampener_coil` | win Δ +24.6 pts (273 runs) |
| breaker | relic | `cracked_hourglass` | win Δ -24.4 pts (269 runs) |
| chronist | relic | `paradox_coil` | win Δ +24.4 pts (138 runs) |
| chronist | relic | `tally_stick` | win Δ +24.3 pts (258 runs) |
| graft | relic | `concussion_rig` | win Δ +24.0 pts (162 runs) |
| chronist | relic | `offbeat_drum` | win Δ +23.9 pts (211 runs) |
| chronist | relic | `slow_temper` | win Δ +23.7 pts (194 runs) |
| chronist | relic | `seers_veil` | win Δ +23.6 pts (181 runs) |
| chronist | relic | `scrap_magnet` | win Δ +23.3 pts (253 runs) |
| graft | relic | `scrap_magnet` | win Δ +23.0 pts (275 runs) |
| chronist | relic | `cracked_prism` | win Δ +22.9 pts (255 runs) |
| chronist | relic | `stim_patch` | win Δ +22.8 pts (287 runs) |
| breaker | relic | `wayfinder_needle` | win Δ +22.7 pts (188 runs) |
| graft | relic | `geode_heart` | win Δ +22.5 pts (296 runs) |
| breaker | relic | `concussion_rig` | win Δ +22.0 pts (206 runs) |
| chronist | relic | `field_dressing` | win Δ +21.7 pts (268 runs) |
| graft | relic | `bulwark_rivets` | win Δ +21.5 pts (290 runs) |
| chronist | relic | `surveyor_ink` | win Δ +21.5 pts (269 runs) |
| breaker | relic | `overwatch_drone` | win Δ +21.4 pts (199 runs) |
| chronist | relic | `vial_rack` | win Δ +21.4 pts (105 runs) |
| chronist | relic | `concussion_rig` | win Δ +21.3 pts (198 runs) |
| breaker | relic | `field_dressing` | win Δ +21.1 pts (307 runs) |
| breaker | relic | `shard_crucible` | win Δ +21.0 pts (122 runs) |
| chronist | relic | `dampener_coil` | win Δ +20.8 pts (245 runs) |
| chronist | relic | `overwatch_drone` | win Δ +20.6 pts (189 runs) |
| chronist | relic | `fixed_star` | win Δ +20.6 pts (189 runs) |
| breaker | relic | `shard_lens` | win Δ +20.3 pts (176 runs) |
| graft | relic | `tender_plating` | win Δ +20.3 pts (105 runs) |
| breaker | relic | `stormbreak_gem` | win Δ +20.2 pts (141 runs) |
| graft | relic | `elder_seed` | win Δ +20.2 pts (131 runs) |
| graft | encounter | `enc_a3_mote_pair` | HP lost 11.9 vs expected 3 (×3.96; 334 fights, 4 deaths) |
| breaker | relic | `cracked_prism` | win Δ +20.1 pts (285 runs) |
| breaker | relic | `void_compass` | win Δ +20.1 pts (137 runs) |
| breaker | relic | `tally_stick` | win Δ +19.9 pts (301 runs) |
| chronist | relic | `sandglass_bead` | win Δ +19.9 pts (249 runs) |
| graft | relic | `pocket_star_chart` | win Δ +19.7 pts (159 runs) |
| graft | relic | `ghost_lantern` | win Δ +19.6 pts (372 runs) |
| graft | relic | `field_dressing` | win Δ +19.6 pts (271 runs) |
| breaker | relic | `crowd_breaker` | win Δ +19.5 pts (192 runs) |
| breaker | relic | `pocket_star_chart` | win Δ +19.4 pts (197 runs) |
| graft | relic | `compost_heap` | win Δ +19.3 pts (270 runs) |
| breaker | relic | `vial_rack` | win Δ +19.2 pts (111 runs) |
| breaker | relic | `hairline_saw` | win Δ +19.1 pts (180 runs) |
| breaker | relic | `duelists_oath` | win Δ +18.9 pts (129 runs) |
| graft | relic | `wayfinder_needle` | win Δ +18.8 pts (165 runs) |
| graft | relic | `shard_lens` | win Δ +18.5 pts (158 runs) |
| chronist | relic | `glass_spurs` | win Δ +18.5 pts (251 runs) |
| graft | relic | `tally_stick` | win Δ +18.4 pts (282 runs) |
| chronist | relic | `shard_writ` | win Δ +18.4 pts (109 runs) |
| graft | relic | `heartwood_ring` | win Δ +18.3 pts (164 runs) |
| breaker | relic | `crystal_spine` | win Δ +18.2 pts (190 runs) |
| breaker | relic | `slow_temper` | win Δ +18.1 pts (209 runs) |
| chronist | relic | `gravity_loom` | win Δ +17.9 pts (55 runs) |
| chronist | relic | `crystal_spine` | win Δ +17.9 pts (170 runs) |
| chronist | encounter | `enc_a3_shard_mote` | HP lost 18.1 vs expected 5 (×3.61; 312 fights, 11 deaths) |
| graft | relic | `shard_writ` | win Δ +17.8 pts (114 runs) |
| graft | relic | `grafting_knife` | win Δ +17.8 pts (152 runs) |
| chronist | relic | `prophet_glass` | win Δ +17.5 pts (134 runs) |
| breaker | relic | `stasis_engine` | win Δ +17.2 pts (196 runs) |
| graft | relic | `void_compass` | win Δ +17.2 pts (143 runs) |
| graft | relic | `surveyor_ink` | win Δ +17.0 pts (278 runs) |
| graft | relic | `mycelial_net` | win Δ +17.0 pts (158 runs) |
| chronist | relic | `void_compass` | win Δ +16.3 pts (149 runs) |
| breaker | encounter | `enc_a3_shard_mote` | HP lost 17.5 vs expected 5 (×3.49; 302 fights, 8 deaths) |
| graft | relic | `rot_censer` | win Δ +16.1 pts (170 runs) |
| graft | relic | `crystal_spine` | win Δ +16.0 pts (150 runs) |
| graft | encounter | `enc_a3_shard_mote` | HP lost 17.5 vs expected 5 (×3.49; 333 fights, 7 deaths) |
| graft | relic | `seed_pouch` | win Δ +15.6 pts (271 runs) |
| graft | relic | `overwatch_drone` | win Δ +15.4 pts (138 runs) |
| graft | relic | `cracked_prism` | win Δ +15.1 pts (287 runs) |
| graft | relic | `pollen_sac` | win Δ +15.1 pts (271 runs) |
| breaker | relic | `parry_charm` | win Δ +15.0 pts (192 runs) |
| chronist | relic | `wayfinder_needle` | win Δ +15.0 pts (193 runs) |
| breaker | card | `iron_rhythm` | pick rate 91.7% (top 5%, offered 640, deck win Δ +23.5 pts) |
| graft | relic | `hairline_saw` | win Δ +14.2 pts (160 runs) |
| graft | relic | `nursery_tray` | win Δ +13.6 pts (106 runs) |
| chronist | encounter | `enc_a3_mote_pair` | HP lost 9.6 vs expected 3 (×3.19; 334 fights, 9 deaths) |
| chronist | relic | `shard_crucible` | win Δ +13.2 pts (124 runs) |
| graft | relic | `plague_bloom` | win Δ +12.8 pts (132 runs) |
| chronist | relic | `stasis_engine` | win Δ +12.6 pts (195 runs) |
| graft | relic | `vial_rack` | win Δ +12.3 pts (83 runs) |
| breaker | encounter | `enc_a3_mote_pair` | HP lost 9.6 vs expected 3 (×3.19; 297 fights, 2 deaths) |
| graft | relic | `dampener_coil` | win Δ +12.2 pts (273 runs) |
| graft | relic | `glass_spurs` | win Δ +11.8 pts (266 runs) |
| graft | relic | `fracture_engine` | win Δ +11.5 pts (143 runs) |
| graft | relic | `slow_temper` | win Δ +11.4 pts (175 runs) |
| breaker | card | `recoil_spring` | pick rate 88.2% (top 5%, offered 643, deck win Δ +16.0 pts) |
| breaker | relic | `oracle_pebble` | win Δ +10.5 pts (120 runs) |
| breaker | card | `anvil_heart` | pick rate 83.4% (top 5%, offered 940, deck win Δ +7.8 pts) |
| chronist | card | `tide_table` | pick rate 88.2% (top 5%, offered 934, deck win Δ +19.5 pts) |
| graft | card | `shed_husk` | pick rate 82.4% (top 5%, offered 1504, deck win Δ +17.9 pts) |
| breaker | card | `find_the_seam` | pick rate 0.9% (bottom 5%, offered 1500) |
| graft | encounter | `enc_a2_rivet_pair` | HP lost 10.1 vs expected 4 (×2.52; 659 fights, 0 deaths) |
| chronist | card | `toll_the_hours` | pick rate 88.3% (top 5%, offered 624, deck win Δ +12.0 pts) |
| chronist | card | `detent` | pick rate 2.4% (bottom 5%, offered 1485) |
| chronist | card | `reef_the_sails` | pick rate 2.0% (bottom 5%, offered 1432) |
| breaker | card | `plate_ram` | pick rate 1.5% (bottom 5%, offered 1454) |
| chronist | card | `downbeat` | pick rate 2.2% (bottom 5%, offered 1414) |
| graft | card | `canker_bite` | pick rate 1.7% (bottom 5%, offered 1410) |
| graft | card | `decomposer` | pick rate 85.0% (top 5%, offered 940, deck win Δ +3.3 pts) |
| chronist | encounter | `enc_a2_rivet_pair` | HP lost 9.5 vs expected 4 (×2.38; 631 fights, 1 deaths) |
| graft | encounter | `enc_a3_prism_motes` | HP lost 15.7 vs expected 12 (×1.31; 272 fights, 46 deaths) |
| graft | card | `propagate` | pick rate 0.3% (bottom 5%, offered 927) |
| breaker | encounter | `enc_a2_rivet_pair` | HP lost 8.3 vs expected 4 (×2.06; 649 fights, 0 deaths) |
| breaker | milestone | `beat_a2_boss` | 45.6% beat the act 2 boss (target ≥ 50%) |
| chronist | milestone | `beat_a2_boss` | 48.9% beat the act 2 boss (target ≥ 50%) |
| breaker | card | `prism_edge` | pick rate 1.5% (bottom 5%, offered 985) |
| graft | card | `thresher` | pick rate 83.4% (top 5%, offered 675, deck win Δ +4.8 pts) |
| graft | encounter | `enc_a3_seer` | HP lost 3.9 vs expected 2 (×1.96; 331 fights, 1 deaths) |
| graft | card | `puffball` | pick rate 80.4% (top 5%, offered 953, deck win Δ +8.2 pts) |
| chronist | card | `zenith` | pick rate 82.8% (top 5%, offered 604, deck win Δ +13.3 pts) |
| breaker | card | `en_garde` | pick rate 0.3% (bottom 5%, offered 659) |
| graft | card | `transplant` | pick rate 0.7% (bottom 5%, offered 594) |
| breaker | card | `forge_oath` | pick rate 73.4% (top 5%, offered 677, deck win Δ -8.1 pts) |
| chronist | card | `syzygy` | pick rate 79.5% (top 5%, offered 609, deck win Δ +13.7 pts) |
| graft | encounter | `enc_a2_riveter` | HP lost 7.8 vs expected 5 (×1.57; 637 fights, 1 deaths) |

## breaker

| runs | win | stalemates | reach A1 boss | beat A1 boss | reach A2 boss | beat A2 boss | reach A3 boss | deaths A1/A2/A3 | actions (wins) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1000 | 31.6% | 1 | 99.1% | 95.1% | 49.9% | 45.6% | 33.7% | 7% / 72% / 21% | 625 (969) |

GDD §8.4 bot targets: win 25–35%, reach A1 boss ≥ 90%, beat A1 boss ≥ 75%, beat A2 boss ≥ 50%, death share by act ≈ 30/40/30.

### Death heatmap (encounter × act)

| encounter | act | deaths | share of deaths | fights | death rate per fight |
| --- | --- | --- | --- | --- | --- |
| enc_a2_oracle_pack | 2 | 102 | 14.9% | 590 | 17.3% |
| enc_a2_oracle_golem | 2 | 83 | 12.1% | 567 | 14.6% |
| enc_a2_drone_riveter | 2 | 77 | 11.3% | 542 | 14.2% |
| enc_a2_golem_riveter | 2 | 72 | 10.5% | 544 | 13.2% |
| enc_a3_fever_pack | 3 | 41 | 6.0% | 264 | 15.5% |
| enc_a2_acolyte_golem | 2 | 41 | 6.0% | 514 | 8.0% |
| enc_a2_drone_trio | 2 | 40 | 5.8% | 480 | 8.3% |
| enc_a2_furnace | 2 | 36 | 5.3% | 170 | 21.2% |
| enc_a1_ram | 1 | 31 | 4.5% | 328 | 9.5% |
| enc_a3_prism_motes | 3 | 27 | 3.9% | 292 | 9.2% |
| enc_a3_sovereign | 3 | 18 | 2.6% | 116 | 15.5% |
| enc_a2_acolyte_pack | 2 | 16 | 2.3% | 513 | 3.1% |
| enc_a2_anvil_hammer | 2 | 14 | 2.0% | 128 | 10.9% |
| enc_a3_warden_shard | 3 | 11 | 1.6% | 286 | 3.8% |
| enc_a3_geometer | 3 | 10 | 1.5% | 271 | 3.7% |
| enc_a1_orchid | 1 | 9 | 1.3% | 341 | 2.6% |
| enc_a3_warden_geometer | 3 | 9 | 1.3% | 267 | 3.4% |
| enc_a3_shard_mote | 3 | 8 | 1.2% | 302 | 2.6% |
| enc_a2_trihammer | 2 | 7 | 1.0% | 159 | 4.4% |
| enc_event_echo | 3 | 5 | 0.7% | 100 | 5.0% |
| enc_a2_boiler | 2 | 4 | 0.6% | 169 | 2.4% |
| enc_a3_leukarch | 3 | 3 | 0.4% | 104 | 2.9% |
| enc_a1_spore_cluster | 1 | 3 | 0.4% | 610 | 0.5% |
| enc_event_antibodies | 3 | 2 | 0.3% | 86 | 2.3% |
| enc_a1_vine_puff | 1 | 2 | 0.3% | 712 | 0.3% |
| enc_event_engine_cult | 2 | 2 | 0.3% | 144 | 1.4% |
| enc_a3_event_horizon | 3 | 2 | 0.3% | 107 | 1.9% |
| enc_a3_mote_pair | 3 | 2 | 0.3% | 297 | 0.7% |
| enc_a1_flitter_gnasher | 1 | 2 | 0.3% | 675 | 0.3% |
| enc_a3_warden_cantor | 3 | 2 | 0.3% | 287 | 0.7% |
| enc_a1_drone_pack | 1 | 1 | 0.1% | 647 | 0.2% |
| enc_a2_drone_gnasher | 2 | 1 | 0.1% | 633 | 0.2% |
| enc_event_spore_choir | 1 | 1 | 0.1% | 134 | 0.7% |

### HP at boss entry

| act | boss fights | avg HP | avg HP % |
| --- | --- | --- | --- |
| 1 | 991 | 70.9 | 85.7% |
| 2 | 499 | 62.4 | 75.5% |
| 3 | 337 | 67.4 | 81.5% |

### Floor of death

```
F06    1 █
F08    1 █
F10    2 █
F11    3 ██
F14    2 █
F16   40 █████████████████████
F18    1 █
F19   39 ████████████████████
F20   61 ████████████████████████████████
F21   77 ████████████████████████████████████████
F22   61 ████████████████████████████████
F23   57 ██████████████████████████████
F24   46 ████████████████████████
F26   33 █████████████████
F27   22 ███████████
F28   22 ███████████
F29   18 █████████
F30   15 ████████
F32   43 ██████████████████████
F33    2 █
F34    4 ██
F35   18 █████████
F36   10 █████
F37   26 ██████████████
F38   13 ███████
F39    4 ██
F40    8 ████
F42    5 ███
F43   13 ███████
F44    4 ██
F45    6 ███
F46    6 ███
F48   21 ███████████
```

### Card rewards

19649 reward screens, skip rate 28.8%. Δwin = win rate of runs that picked the card in that act minus the class win rate (n = runs). Deck Δ = runs ending with it in the deck vs without.


| card | offered | picked | pick % | on skipped screens | bought | Δwin A1 | Δwin A2 | Δwin A3 | deck Δwin | dmg/combat with |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| iron_rhythm | 640 | 587 | 91.7% | 0.9% | 2 | +2.1 (335) | +27.7 (177) | +57.9 (38) | +23.5 | 6.7 |
| recoil_spring | 643 | 567 | 88.2% | 1.9% | 2 | -1.7 (314) | +27.7 (172) | +44.6 (42) | +16.0 | 6.8 |
| anvil_heart | 940 | 784 | 83.4% | 6.8% | 93 | -6.7 (377) | +9.7 (223) | +51.0 (86) | +7.8 | 6.9 |
| forge_oath | 677 | 497 | 73.4% | 3.0% | 4 | -2.5 (282) | +19.4 (145) | +59.0 (32) | -8.1 | 7.2 |
| parry_ledger | 1009 | 735 | 72.8% | 12.2% | 59 | -2.9 (387) | +15.6 (199) | +50.7 (62) | +13.1 | 6.9 |
| cinder_heart | 1007 | 706 | 70.1% | 15.4% | 51 | -3.4 (362) | +7.0 (210) | +51.2 (64) | +12.0 | 6.9 |
| feint_step | 984 | 586 | 59.6% | 17.8% | 13 | +2.2 (334) | +12.4 (141) | +46.2 (54) | +13.7 | 6.7 |
| read_the_blow | 1007 | 584 | 58.0% | 19.8% | 18 | +5.9 (344) | +18.4 (124) | +48.7 (66) | +23.8 | 6.5 |
| bind_the_blade | 1008 | 540 | 53.6% | 18.3% | 11 | +11.4 (305) | +15.5 (138) | +51.7 (54) | +28.3 | 6.4 |
| rampart_crash | 948 | 507 | 53.5% | 20.0% | 10 | +0.6 (276) | +11.8 (129) | +44.3 (58) | +15.5 | 6.8 |
| anneal | 986 | 521 | 52.8% | 22.5% | 13 | +0.0 (291) | +13.9 (132) | +55.9 (56) | +14.5 | 6.8 |
| crossed_blades | 989 | 477 | 48.2% | 24.2% | 29 | -4.4 (287) | +14.4 (124) | +44.9 (34) | +7.8 | 6.8 |
| vent_pressure | 660 | 307 | 46.5% | 12.0% | 2 | -1.3 (208) | +27.3 (73) | +55.9 (16) | +11.7 | 6.7 |
| endless_maul | 606 | 271 | 44.7% | 12.0% | 0 | +8.9 (153) | +23.6 (87) | +56.9 (26) | +24.0 | 6.7 |
| smouldering_core | 623 | 275 | 44.1% | 10.4% | 1 | -2.7 (173) | +30.9 (72) | +39.2 (24) | +12.5 | 7.0 |
| ride_the_surge | 1035 | 403 | 38.9% | 25.2% | 6 | +1.9 (233) | +16.9 (101) | +55.1 (45) | +16.9 | 6.8 |
| loaded_spring | 1463 | 552 | 37.7% | 29.8% | 15 | +5.1 (324) | +17.7 (138) | +53.8 (48) | +19.5 | 6.6 |
| fault_reader | 956 | 353 | 36.9% | 26.3% | 19 | +1.0 (215) | +3.8 (82) | +61.9 (31) | +10.2 | 7.0 |
| catch_blade | 1367 | 496 | 36.3% | 30.0% | 17 | +3.1 (320) | +17.9 (97) | +52.2 (37) | +13.6 | 6.5 |
| answering_steel | 987 | 350 | 35.5% | 24.7% | 8 | +9.6 (204) | +14.6 (91) | +52.5 (44) | +23.8 | 6.4 |
| piston_volley | 952 | 315 | 33.1% | 25.9% | 3 | +2.3 (165) | +16.7 (89) | +51.4 (47) | +16.8 | 6.9 |
| jackhammer | 671 | 216 | 32.2% | 14.9% | 0 | +0.4 (122) | +22.9 (66) | +58.4 (20) | +14.8 | 6.8 |
| quake_hammer | 974 | 258 | 26.5% | 30.2% | 3 | +4.0 (160) | -0.5 (61) | +59.0 (32) | +11.0 | 6.6 |
| steal_the_swing | 677 | 173 | 25.6% | 16.7% | 0 | +12.5 (102) | +28.4 (45) | +60.4 (25) | +25.6 | 6.1 |
| return_stroke | 1508 | 357 | 23.7% | 34.2% | 1 | +5.2 (212) | +8.6 (82) | +59.3 (44) | +18.3 | 6.6 |
| quench | 985 | 221 | 22.4% | 33.9% | 4 | +0.0 (136) | +20.5 (48) | +50.2 (33) | +14.7 | 6.5 |
| pivot_sweep | 1500 | 316 | 21.1% | 35.1% | 5 | +2.0 (217) | +16.8 (62) | +61.0 (27) | +15.0 | 6.7 |
| iron_avalanche | 652 | 127 | 19.5% | 21.3% | 0 | +2.5 (88) | +24.4 (25) | +53.0 (13) | +13.1 | 6.7 |
| shed_plating | 655 | 116 | 17.7% | 21.1% | 0 | -11.3 (64) | +25.5 (35) | +30.9 (16) | +6.6 | 6.6 |
| coiled_strike | 920 | 162 | 17.6% | 33.8% | 0 | +10.7 (97) | +35.1 (33) | +47.0 (28) | +24.4 | 6.1 |
| cool_the_steel | 1456 | 205 | 14.1% | 39.8% | 7 | +9.1 (123) | +8.0 (48) | +60.7 (26) | +19.6 | 6.5 |
| thresher_arc | 1437 | 184 | 12.8% | 37.2% | 5 | +7.0 (101) | +9.4 (61) | +58.9 (21) | +14.9 | 6.8 |
| hairline_mark | 957 | 109 | 11.4% | 38.1% | 1 | +18.4 (40) | +29.8 (44) | +59.3 (22) | +34.9 | 6.4 |
| reactive_plate | 666 | 63 | 9.5% | 23.1% | 1 | -6.6 (24) | +33.6 (23) | +61.3 (14) | +24.0 | 6.5 |
| gauntlet_tap | 1529 | 141 | 9.2% | 40.7% | 0 | +1.7 (63) | +14.4 (50) | +52.4 (25) | +15.8 | 6.7 |
| sabre_rattle | 1469 | 130 | 8.8% | 38.2% | 1 | -1.6 (50) | +12.3 (57) | +54.8 (22) | +16.7 | 6.6 |
| rivet_wall | 1506 | 102 | 6.8% | 39.2% | 1 | +11.0 (54) | +25.5 (28) | +47.3 (19) | +25.4 | 6.3 |
| read_the_line | 1413 | 93 | 6.6% | 40.8% | 2 | -11.6 (20) | +29.5 (36) | +65.0 (29) | +32.9 | 6.5 |
| chain_driver | 1432 | 91 | 6.4% | 40.0% | 0 | -1.6 (30) | +21.7 (30) | +51.2 (29) | +21.4 | 6.8 |
| fault_line | 1451 | 89 | 6.1% | 39.2% | 1 | -14.0 (17) | +21.5 (32) | +56.3 (33) | +28.0 | 6.3 |
| seam_ripper | 1003 | 52 | 5.2% | 41.2% | 0 | +8.4 (10) | +32.0 (22) | +53.4 (20) | +37.0 | 6.4 |
| counterweight | 1490 | 70 | 4.7% | 40.5% | 0 | +16.2 (23) | +22.9 (22) | +64.2 (24) | +34.5 | 6.2 |
| hammerfall | 976 | 41 | 4.2% | 39.3% | 0 | +4.8 (11) | +32.7 (14) | +55.9 (16) | +34.8 | 6.3 |
| planted_feet | 1540 | 60 | 3.9% | 41.4% | 0 | +5.2 (19) | +32.0 (22) | +44.9 (17) | +27.7 | 6.5 |
| piston_jab | 1426 | 50 | 3.5% | 40.9% | 0 | +8.4 (10) | +9.3 (22) | +50.8 (17) | +25.7 | 6.7 |
| rivet_flurry | 1447 | 39 | 2.7% | 41.9% | 0 | – | +12.2 (16) | +38.4 (20) | +24.9 | 6.1 |
| overhand_drive | 1463 | 29 | 2.0% | 39.0% | 0 | +43.4 (4) | +21.7 (15) | +38.4 (10) | +32.7 | 6.4 |
| breach_hammer | 1472 | 23 | 1.6% | 41.6% | 0 | – | +8.4 (15) | +55.9 (8) | +23.1 | 6.0 |
| plate_ram | 1454 | 22 | 1.5% | 39.5% | 0 | -14.9 (6) | +39.8 (7) | +57.3 (9) | +32.8 | 5.9 |
| prism_edge | 985 | 15 | 1.5% | 41.9% | 0 | -31.6 (3) | +43.4 (4) | +55.9 (8) | +35.6 | 6.4 |
| find_the_seam | 1500 | 14 | 0.9% | 38.7% | 0 | – | +48.4 (5) | +68.4 (9) | +62.1 | 6.2 |
| en_garde | 659 | 2 | 0.3% | 29.4% | 0 | – | +68.4 (1) | +68.4 (1) | +68.5 | 7.6 |

### Relics

| relic | runs holding | win Δ (pts) |
| --- | --- | --- |
| crown_fragment | 101 | +53.0 |
| gravity_loom | 99 | +47.9 |
| notched_buckler | 291 | +36.9 |
| binding_contract | 257 | +35.5 |
| chain_wraps | 325 | +33.9 |
| ascendant_prism | 14 | +33.1 |
| bulwark_rivets | 307 | +32.4 |
| ghost_lantern | 387 | +30.6 |
| fracture_engine | 151 | +29.1 |
| bastion_core | 144 | +28.8 |
| shard_writ | 90 | +28.8 |
| geode_heart | 302 | +28.7 |
| glass_spurs | 305 | +28.1 |
| stim_patch | 308 | +28.0 |
| tender_plating | 97 | +27.8 |
| kept_fury | 195 | +26.4 |
| scrap_magnet | 275 | +25.1 |
| surveyor_ink | 310 | +24.8 |
| practice_dummy | 83 | +24.7 |
| dampener_coil | 273 | +24.6 |
| wayfinder_needle | 188 | +22.7 |
| concussion_rig | 206 | +22.0 |
| overwatch_drone | 199 | +21.4 |
| field_dressing | 307 | +21.1 |
| shard_crucible | 122 | +21.0 |
| shard_lens | 176 | +20.3 |
| stormbreak_gem | 141 | +20.2 |
| cracked_prism | 285 | +20.1 |
| void_compass | 137 | +20.1 |
| tally_stick | 301 | +19.9 |
| crowd_breaker | 192 | +19.5 |
| pocket_star_chart | 197 | +19.4 |
| vial_rack | 111 | +19.2 |
| hairline_saw | 180 | +19.1 |
| duelists_oath | 129 | +18.9 |
| crystal_spine | 190 | +18.2 |
| slow_temper | 209 | +18.1 |
| stasis_engine | 196 | +17.2 |
| parry_charm | 192 | +15.0 |
| oracle_pebble | 120 | +10.5 |
| riven_gauntlet | 1000 | +0.0 |
| shard_debt | 139 | -2.4 |
| exposed_core | 88 | -4.7 |
| engine_tooth | 23 | -5.6 |
| cracked_hourglass | 269 | -24.4 |

Boss relic screens: skip rate 0.0%.


| boss relic | offered | picked | pick % |
| --- | --- | --- | --- |
| ghost_lantern | 387 | 387 | 100.0% |
| cracked_hourglass | 427 | 269 | 63.0% |
| binding_contract | 390 | 257 | 65.9% |
| stasis_engine | 429 | 196 | 45.7% |
| gravity_loom | 421 | 99 | 23.5% |
| tender_plating | 422 | 97 | 23.0% |
| exposed_core | 436 | 88 | 20.2% |
| ascendant_prism | 440 | 14 | 3.2% |
| star_atlas | 413 | 0 | 0.0% |
| heavy_heart | 456 | 0 | 0.0% |

### Pacts and events

| pact | picked | win Δ (pts) |
| --- | --- | --- |
| pact_hardy | 348 | +3.5 |
| pact_purse | 334 | +2.5 |
| pact_shards | 318 | -6.2 |

| event | seen | option picks |
| --- | --- | --- |
| ev_singing_geode | 169 | #1: 30, #2: 139 |
| ev_flickering_medpod | 162 | #0: 44, #1: 95, #2: 23 |
| ev_drowned_shrine | 161 | #1: 21, #2: 140 |
| ev_wandering_artificer | 350 | #0: 79, #1: 271 |
| ev_lost_climber | 318 | #0: 34, #1: 284 |
| ev_rigged_conveyor | 153 | #0: 139, #1: 14 |
| ev_your_echo | 100 | #0: 100 |
| ev_crown_vault | 101 | #1: 101 |
| ev_quiet_bench | 319 | #0: 272, #1: 47 |
| ev_memory_pool | 332 | #0: 1, #1: 331 |
| ev_assembly_line | 167 | #0: 167 |
| ev_engine_cult | 167 | #0: 23, #1: 144 |
| ev_tether_merchant | 94 | #0: 93, #3: 1 |
| ev_spore_choir | 134 | #0: 134 |
| ev_oracle_terminal | 149 | #0: 120, #3: 29 |
| ev_smelter | 146 | #0: 2, #1: 111, #2: 33 |
| ev_prism_garden | 101 | #1: 101 |
| ev_salvage_heap | 168 | #1: 37, #2: 131 |
| ev_immune_scan | 100 | #0: 1, #1: 86, #2: 13 |
| ev_hydroponic_bay | 152 | #0: 152 |
| ev_scavenger_drone | 149 | #0: 139, #2: 10 |
| ev_void_lens | 94 | #2: 94 |

### Economy per act

| act | Shards earned | Shards spent | deck size (end of act) | gold earned | gold spent | removals shop/rest/event/other | upgrades |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 3.27 | 0.49 | 18.8 | 323 | 185 | 0.97 / 0.00 / 0.06 / 0.03 | 1.99 |
| 2 | 2.73 | 0.94 | 22.0 | 191 | 208 | 0.99 / 0.01 / 0.02 / 0.13 | 1.05 |
| 3 | 1.15 | 1.04 | 26.4 | 127 | 132 | 0.56 / 0.00 / 0.01 / 0.09 | 0.81 |

Shard target (GDD §4.5): 3–5 earned per act. Per-act averages are over all runs (runs that died earlier count 0 for later acts).

### Turns and damage per encounter vs ENEMIES §4.1

| encounter | act | room | fights | deaths | avg turns | expected phases | avg HP lost | expected lost | ratio |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| enc_a1_alpha | 1 | elite | 402 | 0 | 6.6 | 2–3 | 10.5 | 24 | 0.44 |
| enc_a1_dreadcap | 1 | elite | 456 | 0 | 8.0 | 5–5 | 6.5 | 20 | 0.32 |
| enc_a1_drone_pack | 1 | monster | 647 | 1 | 3.3 | 2–3 | 4.9 | 9 | 0.54 |
| enc_a1_drone_puff | 1 | monster | 1001 | 0 | 2.3 | 1–2 | 0.1 | 2 | 0.06 |
| enc_a1_empress | 1 | boss | 322 | 0 | 11.7 | 11–11 | 5.3 | 39 | 0.14 |
| enc_a1_flitter_gnasher | 1 | monster | 675 | 2 | 2.9 | 2–3 | 4.2 | 15 | 0.28 |
| enc_a1_gnasher_pair | 1 | monster | 1002 | 0 | 2.4 | 1–2 | 1.1 | 3 | 0.37 |
| enc_a1_mantis | 1 | monster | 753 | 0 | 3.5 | 2–2 | 2.8 | 9 | 0.31 |
| enc_a1_orchid | 1 | boss | 341 | 9 | 14.6 | 10–10 | 12.1 | 35 | 0.34 |
| enc_a1_ram | 1 | boss | 328 | 31 | 9.2 | 9–9 | 31.5 | 40 | 0.79 |
| enc_a1_spore_cluster | 1 | monster | 610 | 3 | 3.5 | 2–2 | 0.6 | 4 | 0.16 |
| enc_a1_thornback | 1 | monster | 997 | 0 | 3.7 | 2–2 | 4.7 | 11 | 0.43 |
| enc_a1_thornback_drone | 1 | monster | 702 | 0 | 4.3 | 3–3 | 10.9 | 12 | 0.91 |
| enc_a1_thornback_wisp | 1 | monster | 696 | 0 | 4.8 | 3–4 | 8.1 | 20 | 0.41 |
| enc_a1_titan | 1 | elite | 439 | 0 | 5.0 | 4–4 | 1.9 | 17 | 0.11 |
| enc_a1_vine_puff | 1 | monster | 712 | 2 | 5.6 | 4–4 | 4.1 | 17 | 0.24 |
| enc_event_spore_choir | 1 | event | 134 | 1 | 7.0 | – | 7.8 | – | – |
| enc_a2_acolyte_golem | 2 | monster | 514 | 41 | 8.0 | 5–5 | 10.7 | 14 | 0.77 |
| enc_a2_acolyte_pack | 2 | monster | 513 | 16 | 5.8 | 4–4 | 7.5 | 20 | 0.38 |
| enc_a2_anvil_hammer | 2 | elite | 128 | 14 | 9.0 | 5–6 | 15.7 | 28 | 0.56 |
| enc_a2_assembler | 2 | boss | 170 | 0 | 19.5 | 10–10 | 2.5 | 35 | 0.07 |
| enc_a2_auditor | 2 | elite | 142 | 0 | 7.8 | 4–4 | 1.8 | 15 | 0.12 |
| enc_a2_boiler | 2 | elite | 169 | 4 | 7.3 | 5–6 | 4.1 | 24 | 0.17 |
| enc_a2_drone_gnasher | 2 | monster | 633 | 1 | 4.3 | 2–2 | 9.7 | 10 | 0.97 |
| enc_a2_drone_riveter | 2 | monster | 542 | 77 | 5.2 | 3–4 | 13.2 | 18 | 0.73 |
| enc_a2_drone_trio | 2 | monster | 480 | 40 | 5.2 | 4–4 | 10.7 | 16 | 0.67 |
| enc_a2_furnace | 2 | boss | 170 | 36 | 15.1 | 11–11 | 26.9 | 38 | 0.71 |
| enc_a2_golem_riveter | 2 | monster | 544 | 72 | 7.8 | 5–5 | 15.3 | 24 | 0.64 |
| enc_a2_oracle_golem | 2 | monster | 567 | 83 | 7.8 | 5–5 | 18.2 | 20 | 0.91 |
| enc_a2_oracle_pack | 2 | monster | 590 | 102 | 5.4 | 4–4 | 19.0 | 20 | 0.95 |
| enc_a2_rivet_pair | 2 | monster | 649 | 0 | 3.9 | 1–2 | 8.3 | 4 | 2.06 ⚠ |
| enc_a2_riveter | 2 | monster | 620 | 0 | 4.6 | 2–2 | 4.2 | 5 | 0.84 |
| enc_a2_trihammer | 2 | boss | 159 | 7 | 11.3 | 10–10 | 11.7 | 40 | 0.29 |
| enc_event_engine_cult | 2 | event | 144 | 2 | 9.8 | – | 3.3 | – | – |
| enc_a3_archivist | 3 | boss | 117 | 0 | 12.6 | 9–9 | 1.5 | 30 | 0.05 |
| enc_a3_cantor | 3 | monster | 293 | 0 | 5.0 | 2–2 | 1.3 | 6 | 0.22 |
| enc_a3_event_horizon | 3 | elite | 107 | 2 | 7.2 | 4–4 | 17.8 | 36 | 0.49 |
| enc_a3_fever_pack | 3 | monster | 264 | 41 | 4.7 | 3–3 | 15.4 | 15 | 1.02 |
| enc_a3_geometer | 3 | monster | 271 | 10 | 6.0 | 3–3 | 6.6 | 18 | 0.37 |
| enc_a3_leukarch | 3 | boss | 104 | 3 | 14.4 | 10–10 | 7.0 | 37 | 0.19 |
| enc_a3_mirror_knight | 3 | elite | 102 | 0 | 6.5 | 3–3 | 2.5 | 15 | 0.17 |
| enc_a3_mote_pair | 3 | monster | 297 | 2 | 4.2 | 1–1 | 9.6 | 3 | 3.19 ⚠ |
| enc_a3_phage_mother | 3 | elite | 97 | 0 | 8.5 | 3–4 | 1.5 | 18 | 0.08 |
| enc_a3_prism_motes | 3 | monster | 292 | 27 | 5.2 | 3–3 | 13.1 | 12 | 1.10 |
| enc_a3_seer | 3 | monster | 310 | 0 | 4.5 | 1–1 | 1.6 | 2 | 0.81 |
| enc_a3_shard_mote | 3 | monster | 302 | 8 | 4.3 | 1–2 | 17.5 | 5 | 3.49 ⚠ |
| enc_a3_sovereign | 3 | boss | 116 | 18 | 13.7 | 10–10 | 20.2 | 58 | 0.35 |
| enc_a3_warden_cantor | 3 | monster | 287 | 2 | 7.2 | 4–4 | 2.6 | 18 | 0.15 |
| enc_a3_warden_geometer | 3 | monster | 267 | 9 | 8.8 | 5–5 | 11.0 | 25 | 0.44 |
| enc_a3_warden_shard | 3 | monster | 286 | 11 | 5.4 | 3–3 | 5.6 | 12 | 0.47 |
| enc_event_antibodies | 3 | event | 86 | 2 | 4.2 | – | 9.7 | – | – |
| enc_event_echo | 3 | event | 100 | 5 | 5.2 | – | 4.3 | – | – |

### Mechanic telemetry

| metric | value |
| --- | --- |
| Onslaught at Attack play (mean) | 2.67 |
| Onslaught distribution | 0: 18%, 1: 23%, 2: 17%, 3: 12%, 4: 9%, 5: 7%, 6: 5%, 7: 3%, 8: 2%, 9: 1%, 10: 1%, 11: 0%, 12: 0%, 13: 0%, 14: 0%, 15: 0%, 16: 0%, 17: 0%, 18: 0%, 19: 0%, 20: 0%, 21: 0% |
| Riposte: primed / triggers / fizzles / attack cancels | 75476 / 55683 / 17580 / 6254 |
| Riposte triggers per primed card · fizzle rate | 0.74 · 23.3% |
| Guard share of damage prevented (Block+Guard) | 55.3% |
| Guard absorbed / Block absorbed / HP lost to hits | 390548 / 315054 / 162589 |
| Bloom at end: max · total · Bloom cards (per run) | 0.00 · 0.00 · 0.00 |
| Prunes per combat | 0.00 |
| Rot's share of damage dealt | 1.9% |
| Beats per turn (on-beat plays / player turns) | 0.81 |
| Timeline resolutions per combat (added / resolved) | 0.01 (109 / 108) |
| Exposed bonus damage per combat | 4.73 |
| Stagger damage prevented per combat (upper bound) | 7.76 |
| Potions used per run | 7.78 |

### Cap hits

Cap hits per player turn: 5.70% (healthy < 1%).


| cap | hits |
| --- | --- |
| cap_hand | 4774 |
| cap_stacks | 1627 |
| cap_to_hand | 308 |
| cap_bonus_energy | 15 |
| cap_prune_away | 3 |
| cap_draw | 3 |
| cap_primes | 1 |

## graft

| runs | win | stalemates | reach A1 boss | beat A1 boss | reach A2 boss | beat A2 boss | reach A3 boss | deaths A1/A2/A3 | actions (wins) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1000 | 23.7% | 1 | 99.4% | 96.4% | 53.8% | 50.1% | 27.4% | 5% / 61% / 35% | 505 (729) |

GDD §8.4 bot targets: win 25–35%, reach A1 boss ≥ 90%, beat A1 boss ≥ 75%, beat A2 boss ≥ 50%, death share by act ≈ 30/40/30.

### Death heatmap (encounter × act)

| encounter | act | deaths | share of deaths | fights | death rate per fight |
| --- | --- | --- | --- | --- | --- |
| enc_a2_oracle_pack | 2 | 99 | 13.0% | 529 | 18.7% |
| enc_a2_drone_riveter | 2 | 78 | 10.2% | 557 | 14.0% |
| enc_a2_oracle_golem | 2 | 71 | 9.3% | 572 | 12.4% |
| enc_a2_golem_riveter | 2 | 63 | 8.3% | 562 | 11.2% |
| enc_a3_prism_motes | 3 | 46 | 6.0% | 272 | 16.9% |
| enc_a3_fever_pack | 3 | 37 | 4.8% | 272 | 13.6% |
| enc_a3_warden_geometer | 3 | 37 | 4.8% | 267 | 13.9% |
| enc_a3_geometer | 3 | 35 | 4.6% | 301 | 11.6% |
| enc_a2_drone_trio | 2 | 32 | 4.2% | 506 | 6.3% |
| enc_a1_ram | 1 | 30 | 3.9% | 306 | 9.8% |
| enc_a2_acolyte_pack | 2 | 30 | 3.9% | 534 | 5.6% |
| enc_a2_acolyte_golem | 2 | 28 | 3.7% | 565 | 5.0% |
| enc_a3_sovereign | 3 | 24 | 3.1% | 91 | 26.4% |
| enc_a2_trihammer | 2 | 19 | 2.5% | 172 | 11.0% |
| enc_a3_event_horizon | 3 | 19 | 2.5% | 66 | 28.8% |
| enc_a2_furnace | 2 | 17 | 2.2% | 174 | 9.8% |
| enc_a3_warden_shard | 3 | 16 | 2.1% | 261 | 6.1% |
| enc_a2_anvil_hammer | 2 | 16 | 2.1% | 139 | 11.5% |
| enc_a3_leukarch | 3 | 12 | 1.6% | 90 | 13.3% |
| enc_a3_cantor | 3 | 8 | 1.0% | 281 | 2.8% |
| enc_a3_warden_cantor | 3 | 8 | 1.0% | 280 | 2.9% |
| enc_a3_shard_mote | 3 | 7 | 0.9% | 333 | 2.1% |
| enc_a2_boiler | 2 | 6 | 0.8% | 135 | 4.4% |
| enc_event_echo | 3 | 6 | 0.8% | 85 | 7.1% |
| enc_a3_mote_pair | 3 | 4 | 0.5% | 334 | 1.2% |
| enc_event_spore_choir | 1 | 2 | 0.3% | 180 | 1.1% |
| enc_a2_auditor | 2 | 2 | 0.3% | 140 | 1.4% |
| enc_a3_mirror_knight | 3 | 2 | 0.3% | 56 | 3.6% |
| enc_a1_thornback_drone | 1 | 2 | 0.3% | 676 | 0.3% |
| enc_a2_riveter | 2 | 1 | 0.1% | 637 | 0.2% |
| enc_a1_flitter_gnasher | 1 | 1 | 0.1% | 721 | 0.1% |
| enc_a3_seer | 3 | 1 | 0.1% | 331 | 0.3% |
| enc_a3_phage_mother | 3 | 1 | 0.1% | 64 | 1.6% |
| enc_a2_assembler | 2 | 1 | 0.1% | 192 | 0.5% |
| enc_a1_thornback_wisp | 1 | 1 | 0.1% | 653 | 0.2% |
| enc_a3_archivist | 3 | 1 | 0.1% | 93 | 1.1% |

### HP at boss entry

| act | boss fights | avg HP | avg HP % |
| --- | --- | --- | --- |
| 1 | 994 | 63.8 | 79.3% |
| 2 | 538 | 56.0 | 69.6% |
| 3 | 274 | 58.9 | 73.1% |

### Floor of death

```
F07    2 █
F10    1 █
F11    2 █
F14    1 █
F16   30 ████████████████
F18    1 █
F19   30 ████████████████
F20   49 ██████████████████████████
F21   76 ████████████████████████████████████████
F22   56 █████████████████████████████
F23   38 ████████████████████
F24   48 █████████████████████████
F26   25 █████████████
F27   23 ████████████
F28   32 █████████████████
F29   16 ████████
F30   32 █████████████████
F32   37 ███████████████████
F33    3 ██
F34    7 ████
F35   17 █████████
F36   30 ████████████████
F37   46 ████████████████████████
F38   22 ████████████
F39   25 █████████████
F40   18 █████████
F42   13 ███████
F43   11 ██████
F44   11 ██████
F45   11 ██████
F46   13 ███████
F48   37 ███████████████████
```

### Card rewards

19403 reward screens, skip rate 23.3%. Δwin = win rate of runs that picked the card in that act minus the class win rate (n = runs). Deck Δ = runs ending with it in the deck vs without.


| card | offered | picked | pick % | on skipped screens | bought | Δwin A1 | Δwin A2 | Δwin A3 | deck Δwin | dmg/combat with |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| decomposer | 940 | 799 | 85.0% | 4.6% | 104 | -1.6 (367) | +1.2 (261) | +38.1 (76) | +3.3 | 8.5 |
| thresher | 675 | 563 | 83.4% | 3.6% | 2 | -3.9 (324) | +12.4 (166) | +32.2 (34) | +4.8 | 8.6 |
| shed_husk | 1504 | 1239 | 82.4% | 7.4% | 86 | +1.3 (517) | +6.2 (374) | +38.3 (100) | +17.9 | 8.5 |
| puffball | 953 | 766 | 80.4% | 5.0% | 36 | -2.0 (391) | +10.2 (227) | +37.2 (64) | +8.2 | 8.5 |
| living_hedge | 907 | 716 | 78.9% | 4.5% | 79 | +3.1 (336) | +8.5 (239) | +43.0 (69) | +15.7 | 8.5 |
| dusk_pruning | 951 | 742 | 78.0% | 5.4% | 89 | -0.9 (377) | +2.8 (223) | +42.4 (62) | +6.1 | 8.6 |
| hyphal_web | 662 | 504 | 76.1% | 4.1% | 0 | +5.2 (294) | +27.9 (153) | +55.1 (33) | +22.6 | 8.4 |
| miasma_sweep | 976 | 685 | 70.2% | 8.8% | 30 | -0.8 (362) | +7.8 (197) | +47.0 (58) | +10.5 | 8.5 |
| death_cap | 648 | 447 | 69.0% | 4.6% | 4 | -3.4 (266) | +11.8 (141) | +45.5 (26) | +6.2 | 8.6 |
| ripening_rot | 955 | 536 | 56.1% | 11.5% | 40 | -8.7 (273) | +9.2 (164) | +40.6 (56) | +1.8 | 8.5 |
| heartwood_spear | 648 | 326 | 50.3% | 8.8% | 1 | +6.4 (186) | +19.0 (103) | +40.6 (28) | +19.1 | 8.3 |
| leaf_litter | 1374 | 678 | 49.3% | 17.9% | 28 | -1.4 (421) | +5.5 (161) | +35.6 (54) | +4.9 | 8.5 |
| thorn_halo | 929 | 430 | 46.3% | 17.7% | 21 | -3.3 (265) | +13.9 (93) | +26.3 (52) | +6.1 | 8.7 |
| chitin_cocoon | 634 | 288 | 45.4% | 11.8% | 0 | +4.0 (184) | +27.5 (82) | +48.5 (18) | +17.1 | 8.2 |
| choking_spores | 937 | 419 | 44.7% | 20.0% | 14 | +3.4 (291) | +15.9 (91) | +54.6 (23) | +14.7 | 8.2 |
| uproot | 967 | 408 | 42.2% | 18.8% | 6 | +1.5 (230) | +12.3 (111) | +36.3 (40) | +11.0 | 8.5 |
| crystal_graft | 632 | 261 | 41.3% | 10.6% | 0 | +0.8 (139) | +15.3 (100) | +46.9 (17) | +12.0 | 8.3 |
| burl_wall | 973 | 364 | 37.4% | 22.9% | 17 | +3.9 (192) | +20.6 (115) | +59.3 (47) | +20.1 | 8.4 |
| seed_rain | 1008 | 322 | 31.9% | 26.2% | 5 | +3.2 (160) | +4.9 (98) | +38.6 (53) | +10.2 | 8.1 |
| quickening_sap | 623 | 174 | 27.9% | 16.4% | 0 | -9.7 (107) | +21.2 (49) | +49.6 (15) | +3.9 | 8.5 |
| tendril_reach | 1431 | 387 | 27.0% | 27.6% | 6 | +10.4 (208) | +14.2 (103) | +41.8 (55) | +21.7 | 8.2 |
| twin_thorn | 956 | 255 | 26.7% | 26.4% | 0 | +11.3 (157) | +19.6 (67) | +36.3 (25) | +19.8 | 8.2 |
| spore_haze | 1402 | 363 | 25.9% | 27.4% | 8 | -4.7 (232) | +9.6 (81) | +38.8 (32) | +2.8 | 8.6 |
| reaping_vine | 592 | 145 | 24.5% | 14.4% | 1 | +9.6 (81) | +19.2 (56) | +38.8 (8) | +15.9 | 8.3 |
| blightcap | 1440 | 311 | 21.6% | 28.5% | 6 | -2.7 (143) | +5.8 (95) | +34.9 (58) | +7.9 | 8.5 |
| deep_graft | 1395 | 289 | 20.7% | 30.3% | 1 | +3.6 (121) | +20.1 (105) | +34.8 (53) | +19.1 | 8.4 |
| excise | 979 | 188 | 19.2% | 29.3% | 0 | -1.4 (94) | +12.4 (61) | +48.2 (32) | +14.3 | 8.3 |
| patient_thorn | 964 | 174 | 18.0% | 28.2% | 2 | +0.6 (103) | +13.5 (43) | +47.1 (24) | +11.9 | 8.3 |
| canopy_crush | 972 | 172 | 17.7% | 28.2% | 4 | +7.8 (73) | +28.7 (63) | +53.4 (35) | +28.7 | 8.0 |
| humus_rite | 708 | 116 | 16.4% | 19.5% | 0 | +1.3 (52) | +28.5 (46) | +38.8 (16) | +19.6 | 8.2 |
| thornwhirl | 1417 | 188 | 13.3% | 31.6% | 8 | +12.5 (138) | +16.3 (30) | +58.7 (17) | +18.9 | 8.2 |
| sap_shell | 1435 | 185 | 12.9% | 34.0% | 3 | -5.1 (70) | +17.1 (71) | +48.5 (36) | +15.6 | 8.0 |
| chitin_ram | 1411 | 171 | 12.1% | 31.1% | 0 | +3.4 (70) | +11.5 (71) | +48.7 (29) | +16.6 | 8.2 |
| thicket_crash | 925 | 112 | 12.1% | 32.1% | 0 | +15.0 (75) | +11.3 (20) | +38.8 (16) | +18.9 | 8.5 |
| prism_thorn | 932 | 107 | 11.5% | 32.1% | 1 | -4.6 (47) | +2.1 (31) | +54.1 (27) | +14.3 | 8.4 |
| fungal_aegis | 608 | 65 | 10.7% | 18.8% | 0 | -2.9 (24) | +12.0 (28) | +60.9 (13) | +16.4 | 8.0 |
| barb_flick | 1437 | 144 | 10.0% | 32.5% | 0 | -1.5 (54) | +22.1 (59) | +34.9 (29) | +16.8 | 8.2 |
| hivestrike | 1500 | 140 | 9.3% | 34.1% | 0 | +4.6 (53) | +13.6 (59) | +38.8 (24) | +14.9 | 8.3 |
| pollen_sting | 932 | 67 | 7.2% | 31.8% | 0 | -1.5 (18) | +4.9 (28) | +31.9 (18) | +11.4 | 7.8 |
| root_mesh | 1398 | 99 | 7.1% | 30.8% | 1 | +0.1 (21) | +27.3 (49) | +32.3 (25) | +26.2 | 8.1 |
| windblown_seed | 1405 | 96 | 6.8% | 33.0% | 0 | +6.3 (20) | +25.1 (43) | +45.3 (29) | +28.3 | 8.1 |
| grafting_cut | 1460 | 85 | 5.8% | 35.3% | 0 | -9.4 (28) | +14.5 (34) | +50.2 (23) | +16.1 | 8.4 |
| sporeburst | 931 | 54 | 5.8% | 32.8% | 0 | +20.7 (9) | +16.3 (25) | +65.8 (19) | +34.7 | 8.4 |
| spore_lash | 1435 | 68 | 4.7% | 32.1% | 0 | -9.4 (7) | +14.8 (39) | +52.5 (21) | +23.5 | 8.3 |
| sap_drip | 1438 | 65 | 4.5% | 34.7% | 0 | +26.3 (4) | +28.7 (42) | +28.9 (19) | +28.2 | 8.0 |
| mulch_maul | 1447 | 47 | 3.2% | 38.1% | 0 | -23.7 (4) | +1.3 (24) | +34.2 (19) | +12.4 | 8.1 |
| shear | 1455 | 45 | 3.1% | 34.0% | 0 | -23.7 (5) | +18.0 (24) | +49.6 (15) | +25.1 | 8.0 |
| verdant_tide | 624 | 16 | 2.6% | 21.2% | 0 | -23.7 (1) | +21.8 (11) | +76.3 (4) | +33.1 | 7.2 |
| mire_carapace | 1449 | 31 | 2.1% | 35.4% | 0 | +76.3 (1) | +17.5 (17) | +22.5 (13) | +23.7 | 7.7 |
| canker_bite | 1410 | 24 | 1.7% | 35.7% | 0 | – | +1.3 (12) | +59.6 (12) | +31.2 | 7.6 |
| transplant | 594 | 4 | 0.7% | 25.1% | 0 | +76.3 (1) | +9.6 (3) | – | +26.4 | 8.6 |
| propagate | 927 | 3 | 0.3% | 34.6% | 0 | – | -23.7 (2) | +76.3 (1) | +9.7 | 7.9 |

### Relics

| relic | runs holding | win Δ (pts) |
| --- | --- | --- |
| gravity_loom | 105 | +46.9 |
| crown_fragment | 96 | +46.4 |
| binding_contract | 292 | +28.9 |
| stim_patch | 277 | +26.6 |
| concussion_rig | 162 | +24.0 |
| scrap_magnet | 275 | +23.0 |
| geode_heart | 296 | +22.5 |
| bulwark_rivets | 290 | +21.5 |
| tender_plating | 105 | +20.3 |
| elder_seed | 131 | +20.2 |
| pocket_star_chart | 159 | +19.7 |
| ghost_lantern | 372 | +19.6 |
| field_dressing | 271 | +19.6 |
| compost_heap | 270 | +19.3 |
| wayfinder_needle | 165 | +18.8 |
| shard_lens | 158 | +18.5 |
| tally_stick | 282 | +18.4 |
| heartwood_ring | 164 | +18.3 |
| ascendant_prism | 12 | +18.2 |
| shard_writ | 114 | +17.8 |
| grafting_knife | 152 | +17.8 |
| void_compass | 143 | +17.2 |
| surveyor_ink | 278 | +17.0 |
| mycelial_net | 158 | +17.0 |
| rot_censer | 170 | +16.1 |
| crystal_spine | 150 | +16.0 |
| seed_pouch | 271 | +15.6 |
| overwatch_drone | 138 | +15.4 |
| cracked_prism | 287 | +15.1 |
| pollen_sac | 271 | +15.1 |
| hairline_saw | 160 | +14.2 |
| nursery_tray | 106 | +13.6 |
| plague_bloom | 132 | +12.8 |
| vial_rack | 83 | +12.3 |
| dampener_coil | 273 | +12.2 |
| glass_spurs | 266 | +11.8 |
| fracture_engine | 143 | +11.5 |
| slow_temper | 175 | +11.4 |
| hollow_bough | 132 | +5.9 |
| stasis_engine | 145 | +5.4 |
| shard_crucible | 145 | +3.7 |
| exposed_core | 125 | +3.1 |
| oracle_pebble | 154 | +2.7 |
| shard_debt | 109 | +0.2 |
| heartseed | 1000 | +0.0 |
| engine_tooth | 46 | -11.2 |
| cracked_hourglass | 309 | -25.4 |

Boss relic screens: skip rate 0.0%.


| boss relic | offered | picked | pick % |
| --- | --- | --- | --- |
| ghost_lantern | 372 | 372 | 100.0% |
| cracked_hourglass | 423 | 309 | 73.0% |
| binding_contract | 433 | 292 | 67.4% |
| stasis_engine | 450 | 145 | 32.2% |
| exposed_core | 449 | 125 | 27.8% |
| gravity_loom | 425 | 105 | 24.7% |
| tender_plating | 472 | 105 | 22.2% |
| ascendant_prism | 447 | 12 | 2.7% |
| star_atlas | 474 | 0 | 0.0% |
| wild_growth | 450 | 0 | 0.0% |

### Pacts and events

| pact | picked | win Δ (pts) |
| --- | --- | --- |
| pact_hardy | 326 | +4.4 |
| pact_shards | 342 | -0.5 |
| pact_purse | 332 | -3.9 |

| event | seen | option picks |
| --- | --- | --- |
| ev_spore_choir | 180 | #0: 180 |
| ev_quiet_bench | 353 | #0: 317, #1: 36 |
| ev_singing_geode | 168 | #1: 59, #2: 109 |
| ev_lost_climber | 382 | #0: 54, #1: 324, #2: 4 |
| ev_wandering_artificer | 354 | #0: 86, #1: 268 |
| ev_smelter | 164 | #0: 3, #1: 133, #2: 28 |
| ev_crown_vault | 96 | #1: 96 |
| ev_memory_pool | 371 | #0: 2, #1: 369 |
| ev_rigged_conveyor | 171 | #0: 148, #1: 23 |
| ev_hydroponic_bay | 156 | #0: 156 |
| ev_assembly_line | 182 | #0: 182 |
| ev_salvage_heap | 186 | #1: 58, #2: 128 |
| ev_immune_scan | 88 | #1: 66, #2: 22 |
| ev_flickering_medpod | 165 | #0: 84, #1: 68, #2: 13 |
| ev_scavenger_drone | 163 | #0: 153, #2: 10 |
| ev_oracle_terminal | 207 | #0: 154, #3: 53 |
| ev_prism_garden | 92 | #1: 92 |
| ev_engine_cult | 198 | #0: 46, #1: 152 |
| ev_tether_merchant | 100 | #0: 81, #3: 19 |
| ev_your_echo | 85 | #0: 85 |
| ev_void_lens | 99 | #2: 99 |
| ev_drowned_shrine | 168 | #1: 12, #2: 156 |

### Economy per act

| act | Shards earned | Shards spent | deck size (end of act) | gold earned | gold spent | removals shop/rest/event/other | upgrades |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 3.11 | 0.68 | 17.7 | 318 | 188 | 0.99 / 0.00 / 0.07 / 1.15 | 1.78 |
| 2 | 2.10 | 0.98 | 21.1 | 198 | 220 | 0.68 / 0.01 / 0.04 / 1.04 | 0.99 |
| 3 | 1.00 | 0.83 | 25.6 | 112 | 128 | 0.17 / 0.00 / 0.01 / 0.37 | 0.60 |

Shard target (GDD §4.5): 3–5 earned per act. Per-act averages are over all runs (runs that died earlier count 0 for later acts).

### Turns and damage per encounter vs ENEMIES §4.1

| encounter | act | room | fights | deaths | avg turns | expected phases | avg HP lost | expected lost | ratio |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| enc_a1_alpha | 1 | elite | 380 | 0 | 5.6 | 2–3 | 13.4 | 24 | 0.56 |
| enc_a1_dreadcap | 1 | elite | 347 | 0 | 6.0 | 5–5 | 5.0 | 20 | 0.25 |
| enc_a1_drone_pack | 1 | monster | 660 | 0 | 3.1 | 2–3 | 6.7 | 9 | 0.75 |
| enc_a1_drone_puff | 1 | monster | 996 | 0 | 2.4 | 1–2 | 0.3 | 2 | 0.13 |
| enc_a1_empress | 1 | boss | 361 | 0 | 8.3 | 11–11 | 11.3 | 39 | 0.29 |
| enc_a1_flitter_gnasher | 1 | monster | 721 | 1 | 2.9 | 2–3 | 6.7 | 15 | 0.45 |
| enc_a1_gnasher_pair | 1 | monster | 1003 | 0 | 2.7 | 1–2 | 2.1 | 3 | 0.71 |
| enc_a1_mantis | 1 | monster | 714 | 0 | 3.5 | 2–2 | 4.5 | 9 | 0.50 |
| enc_a1_orchid | 1 | boss | 327 | 0 | 7.1 | 10–10 | 11.0 | 35 | 0.31 |
| enc_a1_ram | 1 | boss | 306 | 30 | 7.4 | 9–9 | 29.5 | 40 | 0.74 |
| enc_a1_spore_cluster | 1 | monster | 609 | 0 | 2.6 | 2–2 | 0.7 | 4 | 0.18 |
| enc_a1_thornback | 1 | monster | 1001 | 0 | 4.2 | 2–2 | 7.1 | 11 | 0.65 |
| enc_a1_thornback_drone | 1 | monster | 676 | 2 | 4.1 | 3–3 | 14.0 | 12 | 1.17 |
| enc_a1_thornback_wisp | 1 | monster | 653 | 1 | 4.4 | 3–4 | 12.3 | 20 | 0.62 |
| enc_a1_titan | 1 | elite | 332 | 0 | 5.2 | 4–4 | 6.5 | 17 | 0.38 |
| enc_a1_vine_puff | 1 | monster | 737 | 0 | 4.9 | 4–4 | 5.3 | 17 | 0.31 |
| enc_event_spore_choir | 1 | event | 180 | 2 | 5.5 | – | 7.9 | – | – |
| enc_a2_acolyte_golem | 2 | monster | 565 | 28 | 4.5 | 5–5 | 8.2 | 14 | 0.58 |
| enc_a2_acolyte_pack | 2 | monster | 534 | 30 | 3.8 | 4–4 | 8.3 | 20 | 0.42 |
| enc_a2_anvil_hammer | 2 | elite | 139 | 16 | 5.0 | 5–6 | 16.7 | 28 | 0.60 |
| enc_a2_assembler | 2 | boss | 192 | 1 | 9.0 | 10–10 | 6.0 | 35 | 0.17 |
| enc_a2_auditor | 2 | elite | 140 | 2 | 5.0 | 4–4 | 3.1 | 15 | 0.20 |
| enc_a2_boiler | 2 | elite | 135 | 6 | 5.2 | 5–6 | 13.3 | 24 | 0.55 |
| enc_a2_drone_gnasher | 2 | monster | 632 | 0 | 3.3 | 2–2 | 11.0 | 10 | 1.10 |
| enc_a2_drone_riveter | 2 | monster | 557 | 78 | 3.5 | 3–4 | 13.3 | 18 | 0.74 |
| enc_a2_drone_trio | 2 | monster | 506 | 32 | 3.4 | 4–4 | 8.7 | 16 | 0.54 |
| enc_a2_furnace | 2 | boss | 174 | 17 | 9.0 | 11–11 | 19.1 | 38 | 0.50 |
| enc_a2_golem_riveter | 2 | monster | 562 | 63 | 4.8 | 5–5 | 13.8 | 24 | 0.58 |
| enc_a2_oracle_golem | 2 | monster | 572 | 71 | 4.6 | 5–5 | 15.0 | 20 | 0.75 |
| enc_a2_oracle_pack | 2 | monster | 529 | 99 | 3.3 | 4–4 | 19.1 | 20 | 0.95 |
| enc_a2_rivet_pair | 2 | monster | 659 | 0 | 2.9 | 1–2 | 10.1 | 4 | 2.52 ⚠ |
| enc_a2_riveter | 2 | monster | 637 | 1 | 3.5 | 2–2 | 7.8 | 5 | 1.57 ⚠ |
| enc_a2_trihammer | 2 | boss | 172 | 19 | 7.8 | 10–10 | 21.4 | 40 | 0.54 |
| enc_event_engine_cult | 2 | event | 152 | 0 | 4.7 | – | 3.6 | – | – |
| enc_a3_archivist | 3 | boss | 93 | 1 | 9.9 | 9–9 | 7.4 | 30 | 0.25 |
| enc_a3_cantor | 3 | monster | 281 | 8 | 3.2 | 2–2 | 4.5 | 6 | 0.74 |
| enc_a3_event_horizon | 3 | elite | 66 | 19 | 5.0 | 4–4 | 38.0 | 36 | 1.05 |
| enc_a3_fever_pack | 3 | monster | 272 | 37 | 3.0 | 3–3 | 14.4 | 15 | 0.96 |
| enc_a3_geometer | 3 | monster | 301 | 35 | 3.8 | 3–3 | 12.3 | 18 | 0.68 |
| enc_a3_leukarch | 3 | boss | 90 | 12 | 10.0 | 10–10 | 17.2 | 37 | 0.47 |
| enc_a3_mirror_knight | 3 | elite | 56 | 2 | 4.6 | 3–3 | 14.1 | 15 | 0.94 |
| enc_a3_mote_pair | 3 | monster | 334 | 4 | 2.5 | 1–1 | 11.9 | 3 | 3.96 ⚠ |
| enc_a3_phage_mother | 3 | elite | 64 | 1 | 4.6 | 3–4 | 5.2 | 18 | 0.29 |
| enc_a3_prism_motes | 3 | monster | 272 | 46 | 3.2 | 3–3 | 15.7 | 12 | 1.31 ⚠ |
| enc_a3_seer | 3 | monster | 331 | 1 | 2.6 | 1–1 | 3.9 | 2 | 1.96 ⚠ |
| enc_a3_shard_mote | 3 | monster | 333 | 7 | 2.7 | 1–2 | 17.5 | 5 | 3.49 ⚠ |
| enc_a3_sovereign | 3 | boss | 91 | 24 | 9.4 | 10–10 | 31.9 | 58 | 0.55 |
| enc_a3_warden_cantor | 3 | monster | 280 | 8 | 4.6 | 4–4 | 6.6 | 18 | 0.37 |
| enc_a3_warden_geometer | 3 | monster | 267 | 37 | 4.9 | 5–5 | 15.3 | 25 | 0.61 |
| enc_a3_warden_shard | 3 | monster | 261 | 16 | 3.5 | 3–3 | 6.5 | 12 | 0.54 |
| enc_event_antibodies | 3 | event | 66 | 0 | 2.4 | – | 9.4 | – | – |
| enc_event_echo | 3 | event | 85 | 6 | 3.8 | – | 8.7 | – | – |

### Mechanic telemetry

| metric | value |
| --- | --- |
| Onslaught at Attack play (mean) | 0.00 |
| Onslaught distribution | 0: 100% |
| Riposte: primed / triggers / fizzles / attack cancels | 1513 / 61 / 23 / 144 |
| Riposte triggers per primed card · fizzle rate | 0.04 · 1.5% |
| Guard share of damage prevented (Block+Guard) | 3.2% |
| Guard absorbed / Block absorbed / HP lost to hits | 13368 / 403556 / 192020 |
| Bloom at end: max · total · Bloom cards (per run) | 9.23 · 35.98 · 6.70 |
| Prunes per combat | 1.31 |
| Rot's share of damage dealt | 29.3% |
| Beats per turn (on-beat plays / player turns) | 0.61 |
| Timeline resolutions per combat (added / resolved) | 0.00 (25 / 25) |
| Exposed bonus damage per combat | 0.34 |
| Stagger damage prevented per combat (upper bound) | 2.41 |
| Potions used per run | 7.86 |

### Cap hits

Cap hits per player turn: 45.10% (healthy < 1%).


| cap | hits |
| --- | --- |
| cap_stacks | 36550 |
| cap_hand | 1421 |
| cap_prune_away | 19 |
| cap_bonus_energy | 1 |

## chronist

| runs | win | stalemates | reach A1 boss | beat A1 boss | reach A2 boss | beat A2 boss | reach A3 boss | deaths A1/A2/A3 | actions (wins) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1000 | 30.4% | 1 | 96.2% | 94.0% | 51.5% | 48.9% | 30.9% | 9% / 65% / 27% | 526 (809) |

GDD §8.4 bot targets: win 25–35%, reach A1 boss ≥ 90%, beat A1 boss ≥ 75%, beat A2 boss ≥ 50%, death share by act ≈ 30/40/30.

### Death heatmap (encounter × act)

| encounter | act | deaths | share of deaths | fights | death rate per fight |
| --- | --- | --- | --- | --- | --- |
| enc_a2_oracle_pack | 2 | 113 | 16.2% | 579 | 19.5% |
| enc_a2_drone_riveter | 2 | 82 | 11.8% | 554 | 14.8% |
| enc_a2_oracle_golem | 2 | 78 | 11.2% | 550 | 14.2% |
| enc_a2_golem_riveter | 2 | 60 | 8.6% | 533 | 11.3% |
| enc_a3_fever_pack | 3 | 50 | 7.2% | 267 | 18.7% |
| enc_a3_prism_motes | 3 | 35 | 5.0% | 304 | 11.5% |
| enc_a2_acolyte_golem | 2 | 29 | 4.2% | 501 | 5.8% |
| enc_a2_drone_trio | 2 | 26 | 3.7% | 489 | 5.3% |
| enc_a2_acolyte_pack | 2 | 22 | 3.2% | 499 | 4.4% |
| enc_a3_warden_geometer | 3 | 19 | 2.7% | 266 | 7.1% |
| enc_a1_ram | 1 | 19 | 2.7% | 318 | 6.0% |
| enc_a2_trihammer | 2 | 15 | 2.2% | 190 | 7.9% |
| enc_a3_warden_shard | 3 | 14 | 2.0% | 270 | 5.2% |
| enc_a3_event_horizon | 3 | 14 | 2.0% | 90 | 15.6% |
| enc_a3_shard_mote | 3 | 11 | 1.6% | 312 | 3.5% |
| enc_a2_furnace | 2 | 11 | 1.6% | 143 | 7.7% |
| enc_a3_geometer | 3 | 10 | 1.4% | 296 | 3.4% |
| enc_a3_mote_pair | 3 | 9 | 1.3% | 334 | 2.7% |
| enc_a3_warden_cantor | 3 | 8 | 1.1% | 282 | 2.8% |
| enc_a2_anvil_hammer | 2 | 8 | 1.1% | 132 | 6.1% |
| enc_a1_thornback_wisp | 1 | 7 | 1.0% | 662 | 1.1% |
| enc_a1_thornback_drone | 1 | 7 | 1.0% | 725 | 1.0% |
| enc_event_echo | 3 | 6 | 0.9% | 97 | 6.2% |
| enc_a1_flitter_gnasher | 1 | 5 | 0.7% | 715 | 0.7% |
| enc_a1_spore_cluster | 1 | 4 | 0.6% | 614 | 0.7% |
| enc_a1_vine_puff | 1 | 4 | 0.6% | 702 | 0.6% |
| enc_a1_alpha | 1 | 4 | 0.6% | 319 | 1.3% |
| enc_a1_orchid | 1 | 3 | 0.4% | 320 | 0.9% |
| enc_a1_drone_pack | 1 | 3 | 0.4% | 638 | 0.5% |
| enc_a2_boiler | 2 | 3 | 0.4% | 134 | 2.2% |
| enc_a3_sovereign | 3 | 3 | 0.4% | 100 | 3.0% |
| enc_a3_cantor | 3 | 3 | 0.4% | 285 | 1.1% |
| enc_a3_leukarch | 3 | 2 | 0.3% | 99 | 2.0% |
| enc_a2_drone_gnasher | 2 | 2 | 0.3% | 626 | 0.3% |
| enc_a1_mantis | 1 | 2 | 0.3% | 693 | 0.3% |
| enc_event_antibodies | 3 | 1 | 0.1% | 73 | 1.4% |
| enc_a1_thornback | 1 | 1 | 0.1% | 1003 | 0.1% |
| enc_a2_auditor | 2 | 1 | 0.1% | 140 | 0.7% |
| enc_a2_rivet_pair | 2 | 1 | 0.1% | 631 | 0.2% |
| enc_event_spore_choir | 1 | 1 | 0.1% | 179 | 0.6% |

### HP at boss entry

| act | boss fights | avg HP | avg HP % |
| --- | --- | --- | --- |
| 1 | 962 | 53.0 | 77.5% |
| 2 | 515 | 48.1 | 70.3% |
| 3 | 309 | 52.9 | 77.2% |

### Floor of death

```
F03    1 █
F04    1 █
F05    2 █
F06    1 █
F07    7 ████
F08    4 ██
F10    5 ███
F11    2 █
F12    5 ███
F13    1 █
F14    9 █████
F16   22 ████████████
F18    2 █
F19   43 ███████████████████████
F20   64 ██████████████████████████████████
F21   76 ████████████████████████████████████████
F22   63 █████████████████████████████████
F23   36 ███████████████████
F24   27 ██████████████
F26   23 ████████████
F27   27 ██████████████
F28   30 ████████████████
F29   13 ███████
F30   21 ███████████
F32   26 ██████████████
F33    4 ██
F34   11 ██████
F35   16 ████████
F36   27 ██████████████
F37   21 ███████████
F38   25 █████████████
F39   15 ████████
F40   11 ██████
F42   14 ███████
F43    6 ███
F44   16 ████████
F45    7 ████
F46    7 ████
F48    5 ███
```

### Card rewards

19166 reward screens, skip rate 27.4%. Δwin = win rate of runs that picked the card in that act minus the class win rate (n = runs). Deck Δ = runs ending with it in the deck vs without.


| card | offered | picked | pick % | on skipped screens | bought | Δwin A1 | Δwin A2 | Δwin A3 | deck Δwin | dmg/combat with |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| toll_the_hours | 624 | 551 | 88.3% | 0.5% | 8 | +0.0 (309) | +13.6 (168) | +44.6 (36) | +12.0 | 7.1 |
| tide_table | 934 | 824 | 88.2% | 4.8% | 140 | -1.0 (381) | +10.8 (245) | +49.8 (86) | +19.5 | 6.9 |
| zenith | 604 | 500 | 82.8% | 1.3% | 4 | +0.1 (275) | +14.5 (158) | +52.5 (41) | +13.3 | 6.9 |
| syzygy | 609 | 484 | 79.5% | 1.0% | 7 | -1.6 (267) | +17.0 (152) | +54.2 (39) | +13.7 | 7.0 |
| banked_hours | 956 | 738 | 77.2% | 6.5% | 28 | -0.6 (363) | +7.2 (218) | +56.5 (61) | +11.7 | 7.0 |
| appointed_hour | 975 | 704 | 72.2% | 8.5% | 52 | +3.2 (336) | +10.8 (226) | +44.6 (64) | +16.8 | 6.9 |
| heave_to | 917 | 658 | 71.8% | 10.0% | 41 | +7.3 (297) | +18.5 (229) | +48.7 (67) | +23.2 | 6.7 |
| escapement | 1013 | 686 | 67.7% | 9.3% | 82 | +0.3 (332) | +10.3 (221) | +51.7 (56) | +15.2 | 7.0 |
| lighthouse | 653 | 430 | 65.8% | 4.9% | 3 | +8.3 (248) | +21.4 (139) | +62.5 (28) | +22.3 | 6.7 |
| tourbillon | 639 | 417 | 65.3% | 3.9% | 3 | +0.6 (232) | +24.9 (123) | +41.0 (42) | +15.8 | 6.5 |
| second_hand | 962 | 551 | 57.3% | 14.3% | 12 | +0.1 (318) | +15.2 (136) | +50.7 (53) | +15.3 | 6.8 |
| knell | 968 | 546 | 56.4% | 17.4% | 24 | -2.1 (353) | +13.0 (113) | +62.1 (40) | +8.7 | 7.1 |
| breakwater | 913 | 500 | 54.8% | 13.8% | 19 | +3.8 (237) | +16.1 (172) | +44.2 (71) | +24.6 | 6.9 |
| striking_train | 962 | 478 | 49.7% | 20.7% | 41 | -1.6 (312) | +12.0 (99) | +58.9 (28) | +6.6 | 7.0 |
| storm_warning | 940 | 363 | 38.6% | 23.3% | 32 | +5.5 (223) | +10.0 (94) | +62.9 (30) | +18.2 | 6.6 |
| spring_tide | 1403 | 531 | 37.8% | 27.4% | 30 | -0.2 (371) | +14.2 (101) | +66.4 (31) | +9.1 | 7.0 |
| weather_eye | 1471 | 517 | 35.1% | 26.0% | 16 | +1.1 (286) | +6.0 (140) | +47.9 (60) | +12.4 | 6.8 |
| almanac | 1382 | 456 | 33.0% | 29.5% | 8 | +4.0 (285) | +10.0 (99) | +58.5 (45) | +14.9 | 6.8 |
| storm_glass | 1461 | 438 | 30.0% | 25.9% | 12 | -3.9 (189) | +9.1 (185) | +56.6 (46) | +13.2 | 6.9 |
| portents | 634 | 178 | 28.1% | 13.4% | 0 | +2.9 (117) | +28.7 (44) | +56.3 (15) | +14.3 | 6.9 |
| seen_it_coming | 625 | 175 | 28.0% | 13.1% | 1 | +4.4 (89) | +22.6 (66) | +64.0 (18) | +18.4 | 6.9 |
| carillon | 1458 | 327 | 22.4% | 34.5% | 9 | +0.1 (259) | +6.2 (41) | +50.8 (16) | +5.4 | 6.7 |
| watch_bell | 613 | 116 | 18.9% | 17.0% | 0 | +3.5 (62) | +24.6 (40) | +61.3 (12) | +18.1 | 6.8 |
| culmination | 644 | 120 | 18.6% | 20.0% | 0 | +1.5 (72) | +24.1 (33) | +62.9 (15) | +15.9 | 6.8 |
| ephemeris | 1435 | 258 | 18.0% | 35.3% | 3 | -5.0 (169) | +26.1 (46) | +52.9 (36) | +9.5 | 6.7 |
| quarter_chime | 950 | 169 | 17.8% | 33.7% | 0 | -7.4 (74) | +18.7 (57) | +45.4 (33) | +14.8 | 6.8 |
| sweep_hand | 999 | 161 | 16.1% | 34.0% | 1 | -1.6 (118) | +28.9 (27) | +32.1 (16) | +9.7 | 6.4 |
| noon_gun | 1416 | 226 | 16.0% | 34.5% | 1 | -5.2 (139) | +14.0 (45) | +51.4 (33) | +8.9 | 6.9 |
| mark_the_lull | 946 | 138 | 14.6% | 37.8% | 0 | -6.0 (82) | +18.1 (33) | +56.6 (23) | +11.2 | 6.8 |
| balance_wheel | 1461 | 172 | 11.8% | 34.4% | 0 | -9.3 (57) | +13.0 (76) | +46.1 (34) | +12.3 | 6.6 |
| glance_ahead | 989 | 109 | 11.0% | 38.3% | 1 | -1.1 (58) | +21.6 (25) | +61.6 (25) | +19.5 | 6.6 |
| gear_train | 1439 | 143 | 9.9% | 38.6% | 1 | -10.4 (75) | +22.4 (36) | +59.6 (30) | +14.2 | 6.8 |
| mainspring | 984 | 96 | 9.8% | 36.5% | 1 | +1.6 (25) | +2.3 (49) | +50.6 (21) | +14.1 | 6.7 |
| hasten | 978 | 93 | 9.5% | 36.9% | 0 | -16.1 (7) | +14.0 (54) | +46.3 (30) | +24.0 | 6.4 |
| slack_water | 1523 | 140 | 9.2% | 38.5% | 1 | -8.1 (94) | +33.2 (22) | +51.4 (22) | +7.9 | 6.7 |
| polyrhythm | 677 | 57 | 8.4% | 18.6% | 0 | +9.6 (20) | +6.0 (22) | +62.9 (15) | +21.7 | 6.6 |
| turn_the_tide | 888 | 68 | 7.7% | 38.2% | 1 | -7.3 (26) | -7.7 (22) | +59.6 (20) | +13.1 | 6.9 |
| pinion_jab | 1447 | 107 | 7.4% | 38.8% | 3 | +0.4 (65) | +30.3 (28) | +38.8 (13) | +11.8 | 6.6 |
| upbeat | 1407 | 103 | 7.3% | 38.0% | 0 | -18.6 (17) | +15.2 (57) | +53.6 (25) | +21.1 | 6.7 |
| afterpeal | 1405 | 100 | 7.1% | 37.5% | 2 | -6.2 (33) | +23.3 (41) | +57.1 (24) | +22.3 | 6.7 |
| fermata | 947 | 55 | 5.8% | 37.9% | 0 | +12.5 (21) | +32.1 (16) | +40.2 (17) | +27.5 | 6.8 |
| confluence | 932 | 44 | 4.7% | 38.2% | 0 | -9.6 (24) | +7.1 (8) | +60.5 (11) | +12.0 | 6.6 |
| batten_down | 921 | 42 | 4.6% | 38.5% | 0 | +0.4 (13) | +33.9 (14) | +49.6 (15) | +31.9 | 6.1 |
| star_tithe | 610 | 25 | 4.1% | 26.6% | 0 | -13.7 (6) | +33.2 (11) | +57.1 (8) | +30.4 | 6.6 |
| perpetual_motion | 683 | 27 | 4.0% | 23.6% | 0 | -21.3 (11) | +36.3 (9) | +69.6 (7) | +22.0 | 6.7 |
| logbook | 1460 | 52 | 3.6% | 40.3% | 0 | +11.3 (12) | +2.9 (21) | +53.8 (19) | +23.7 | 6.5 |
| parallax | 1418 | 51 | 3.6% | 39.3% | 1 | +0.4 (13) | +25.9 (16) | +41.0 (21) | +27.9 | 6.3 |
| wind_forward | 1493 | 52 | 3.5% | 39.5% | 0 | – | +26.0 (39) | +61.9 (13) | +35.6 | 6.5 |
| dead_reckoning | 1433 | 50 | 3.5% | 39.6% | 0 | +7.1 (8) | +21.8 (23) | +52.9 (18) | +31.2 | 6.7 |
| detent | 1485 | 36 | 2.4% | 40.3% | 0 | +32.1 (8) | +24.1 (11) | +63.4 (16) | +46.3 | 6.3 |
| downbeat | 1414 | 31 | 2.2% | 39.3% | 0 | +49.6 (5) | +8.1 (13) | +69.6 (13) | +41.9 | 6.1 |
| reef_the_sails | 1432 | 28 | 2.0% | 38.5% | 0 | – | +16.7 (17) | +39.6 (10) | +25.9 | 6.8 |

### Relics

| relic | runs holding | win Δ (pts) |
| --- | --- | --- |
| crown_fragment | 96 | +53.9 |
| ghost_lantern | 397 | +40.6 |
| star_pip | 266 | +39.0 |
| binding_contract | 238 | +36.7 |
| geode_heart | 269 | +31.6 |
| timeline_clamp | 79 | +31.6 |
| timeline_spool | 195 | +28.5 |
| hairline_saw | 186 | +28.0 |
| tuning_fork | 282 | +26.8 |
| bulwark_rivets | 266 | +26.2 |
| tender_plating | 51 | +25.8 |
| shard_lens | 193 | +25.3 |
| paradox_coil | 138 | +24.4 |
| tally_stick | 258 | +24.3 |
| offbeat_drum | 211 | +23.9 |
| slow_temper | 194 | +23.7 |
| seers_veil | 181 | +23.6 |
| scrap_magnet | 253 | +23.3 |
| cracked_prism | 255 | +22.9 |
| stim_patch | 287 | +22.8 |
| field_dressing | 268 | +21.7 |
| surveyor_ink | 269 | +21.5 |
| vial_rack | 105 | +21.4 |
| concussion_rig | 198 | +21.3 |
| dampener_coil | 245 | +20.8 |
| overwatch_drone | 189 | +20.6 |
| fixed_star | 189 | +20.6 |
| sandglass_bead | 249 | +19.9 |
| glass_spurs | 251 | +18.5 |
| shard_writ | 109 | +18.4 |
| gravity_loom | 55 | +17.9 |
| crystal_spine | 170 | +17.9 |
| prophet_glass | 134 | +17.5 |
| void_compass | 149 | +16.3 |
| wayfinder_needle | 193 | +15.0 |
| shard_crucible | 124 | +13.2 |
| stasis_engine | 195 | +12.6 |
| metronome_heart | 129 | +9.6 |
| fracture_engine | 127 | +9.4 |
| chrono_lens | 1000 | +0.0 |
| engine_tooth | 23 | +0.0 |
| exposed_core | 58 | -3.0 |
| shard_debt | 94 | -6.5 |
| cracked_hourglass | 246 | -33.3 |

Boss relic screens: skip rate 0.0%.


| boss relic | offered | picked | pick % |
| --- | --- | --- | --- |
| ghost_lantern | 423 | 397 | 93.9% |
| cracked_hourglass | 495 | 246 | 49.7% |
| binding_contract | 463 | 238 | 51.4% |
| stasis_engine | 491 | 195 | 39.7% |
| fixed_star | 461 | 189 | 41.0% |
| exposed_core | 489 | 58 | 11.9% |
| gravity_loom | 503 | 55 | 10.9% |
| tender_plating | 489 | 51 | 10.4% |
| ascendant_prism | 473 | 0 | 0.0% |

### Pacts and events

| pact | picked | win Δ (pts) |
| --- | --- | --- |
| pact_hardy | 311 | +3.9 |
| pact_purse | 355 | -0.8 |
| pact_shards | 334 | -2.9 |

| event | seen | option picks |
| --- | --- | --- |
| ev_smelter | 146 | #0: 2, #1: 119, #2: 25 |
| ev_salvage_heap | 183 | #1: 61, #2: 122 |
| ev_quiet_bench | 358 | #0: 325, #1: 33 |
| ev_lost_climber | 350 | #0: 43, #1: 302, #2: 5 |
| ev_assembly_line | 186 | #0: 186 |
| ev_singing_geode | 172 | #1: 78, #2: 94 |
| ev_spore_choir | 179 | #0: 179 |
| ev_drowned_shrine | 166 | #1: 11, #2: 155 |
| ev_wandering_artificer | 320 | #0: 61, #1: 259 |
| ev_oracle_terminal | 134 | #3: 134 |
| ev_immune_scan | 103 | #1: 73, #2: 30 |
| ev_memory_pool | 371 | #0: 5, #1: 366 |
| ev_scavenger_drone | 165 | #0: 149, #2: 16 |
| ev_hydroponic_bay | 177 | #0: 177 |
| ev_void_lens | 93 | #2: 93 |
| ev_prism_garden | 96 | #1: 96 |
| ev_tether_merchant | 89 | #0: 87, #3: 2 |
| ev_flickering_medpod | 149 | #0: 56, #1: 82, #2: 11 |
| ev_your_echo | 97 | #0: 97 |
| ev_engine_cult | 149 | #0: 23, #1: 126 |
| ev_rigged_conveyor | 165 | #0: 150, #1: 15 |
| ev_crown_vault | 96 | #1: 96 |

### Economy per act

| act | Shards earned | Shards spent | deck size (end of act) | gold earned | gold spent | removals shop/rest/event/other | upgrades |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 3.21 | 0.62 | 18.6 | 313 | 194 | 1.01 / 0.00 / 0.04 / 0.00 | 1.75 |
| 2 | 2.38 | 0.83 | 22.5 | 194 | 200 | 0.92 / 0.01 / 0.02 / 0.01 | 0.89 |
| 3 | 1.33 | 0.88 | 27.1 | 123 | 129 | 0.38 / 0.00 / 0.00 / 0.00 | 0.71 |

Shard target (GDD §4.5): 3–5 earned per act. Per-act averages are over all runs (runs that died earlier count 0 for later acts).

### Turns and damage per encounter vs ENEMIES §4.1

| encounter | act | room | fights | deaths | avg turns | expected phases | avg HP lost | expected lost | ratio |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| enc_a1_alpha | 1 | elite | 319 | 4 | 5.3 | 2–3 | 11.0 | 24 | 0.46 |
| enc_a1_dreadcap | 1 | elite | 304 | 0 | 7.1 | 5–5 | 6.8 | 20 | 0.34 |
| enc_a1_drone_pack | 1 | monster | 638 | 3 | 3.3 | 2–3 | 7.9 | 9 | 0.88 |
| enc_a1_drone_puff | 1 | monster | 998 | 0 | 2.3 | 1–2 | 0.2 | 2 | 0.09 |
| enc_a1_empress | 1 | boss | 324 | 0 | 10.2 | 11–11 | 8.0 | 39 | 0.20 |
| enc_a1_flitter_gnasher | 1 | monster | 715 | 5 | 3.1 | 2–3 | 8.1 | 15 | 0.54 |
| enc_a1_gnasher_pair | 1 | monster | 998 | 0 | 2.4 | 1–2 | 2.3 | 3 | 0.77 |
| enc_a1_mantis | 1 | monster | 693 | 2 | 3.5 | 2–2 | 3.8 | 9 | 0.42 |
| enc_a1_orchid | 1 | boss | 320 | 3 | 8.2 | 10–10 | 6.3 | 35 | 0.18 |
| enc_a1_ram | 1 | boss | 318 | 19 | 8.1 | 9–9 | 19.1 | 40 | 0.48 |
| enc_a1_spore_cluster | 1 | monster | 614 | 4 | 3.6 | 2–2 | 1.3 | 4 | 0.32 |
| enc_a1_thornback | 1 | monster | 1003 | 1 | 3.9 | 2–2 | 6.3 | 11 | 0.57 |
| enc_a1_thornback_drone | 1 | monster | 725 | 7 | 4.2 | 3–3 | 12.5 | 12 | 1.04 |
| enc_a1_thornback_wisp | 1 | monster | 662 | 7 | 4.5 | 3–4 | 10.2 | 20 | 0.51 |
| enc_a1_titan | 1 | elite | 337 | 0 | 4.8 | 4–4 | 4.4 | 17 | 0.26 |
| enc_a1_vine_puff | 1 | monster | 702 | 4 | 5.7 | 4–4 | 4.9 | 17 | 0.29 |
| enc_event_spore_choir | 1 | event | 179 | 1 | 7.1 | – | 9.0 | – | – |
| enc_a2_acolyte_golem | 2 | monster | 501 | 29 | 5.7 | 5–5 | 7.5 | 14 | 0.54 |
| enc_a2_acolyte_pack | 2 | monster | 499 | 22 | 4.5 | 4–4 | 7.5 | 20 | 0.37 |
| enc_a2_anvil_hammer | 2 | elite | 132 | 8 | 6.5 | 5–6 | 9.5 | 28 | 0.34 |
| enc_a2_assembler | 2 | boss | 182 | 0 | 8.4 | 10–10 | 1.8 | 35 | 0.05 |
| enc_a2_auditor | 2 | elite | 140 | 1 | 5.5 | 4–4 | 1.9 | 15 | 0.13 |
| enc_a2_boiler | 2 | elite | 134 | 3 | 5.6 | 5–6 | 6.3 | 24 | 0.26 |
| enc_a2_drone_gnasher | 2 | monster | 626 | 2 | 3.7 | 2–2 | 11.0 | 10 | 1.10 |
| enc_a2_drone_riveter | 2 | monster | 554 | 82 | 4.4 | 3–4 | 11.8 | 18 | 0.66 |
| enc_a2_drone_trio | 2 | monster | 489 | 26 | 4.2 | 4–4 | 7.7 | 16 | 0.48 |
| enc_a2_furnace | 2 | boss | 143 | 11 | 10.2 | 11–11 | 12.5 | 38 | 0.33 |
| enc_a2_golem_riveter | 2 | monster | 533 | 60 | 6.0 | 5–5 | 11.1 | 24 | 0.46 |
| enc_a2_oracle_golem | 2 | monster | 550 | 78 | 5.8 | 5–5 | 12.7 | 20 | 0.63 |
| enc_a2_oracle_pack | 2 | monster | 579 | 113 | 4.2 | 4–4 | 15.5 | 20 | 0.78 |
| enc_a2_rivet_pair | 2 | monster | 631 | 1 | 3.6 | 1–2 | 9.5 | 4 | 2.38 ⚠ |
| enc_a2_riveter | 2 | monster | 623 | 0 | 3.9 | 2–2 | 5.4 | 5 | 1.08 |
| enc_a2_trihammer | 2 | boss | 190 | 15 | 8.7 | 10–10 | 11.9 | 40 | 0.30 |
| enc_event_engine_cult | 2 | event | 126 | 0 | 5.8 | – | 1.9 | – | – |
| enc_a3_archivist | 3 | boss | 110 | 0 | 9.6 | 9–9 | 2.4 | 30 | 0.08 |
| enc_a3_cantor | 3 | monster | 285 | 3 | 4.2 | 2–2 | 2.2 | 6 | 0.37 |
| enc_a3_event_horizon | 3 | elite | 90 | 14 | 5.1 | 4–4 | 25.7 | 36 | 0.71 |
| enc_a3_fever_pack | 3 | monster | 267 | 50 | 3.9 | 3–3 | 15.2 | 15 | 1.01 |
| enc_a3_geometer | 3 | monster | 296 | 10 | 4.9 | 3–3 | 5.6 | 18 | 0.31 |
| enc_a3_leukarch | 3 | boss | 99 | 2 | 9.1 | 10–10 | 3.8 | 37 | 0.10 |
| enc_a3_mirror_knight | 3 | elite | 101 | 0 | 5.1 | 3–3 | 6.1 | 15 | 0.41 |
| enc_a3_mote_pair | 3 | monster | 334 | 9 | 3.6 | 1–1 | 9.6 | 3 | 3.19 ⚠ |
| enc_a3_phage_mother | 3 | elite | 71 | 0 | 5.4 | 3–4 | 1.4 | 18 | 0.08 |
| enc_a3_prism_motes | 3 | monster | 304 | 35 | 4.3 | 3–3 | 11.8 | 12 | 0.99 |
| enc_a3_seer | 3 | monster | 328 | 0 | 3.4 | 1–1 | 2.4 | 2 | 1.21 |
| enc_a3_shard_mote | 3 | monster | 312 | 11 | 3.8 | 1–2 | 18.1 | 5 | 3.61 ⚠ |
| enc_a3_sovereign | 3 | boss | 100 | 3 | 11.1 | 10–10 | 8.4 | 58 | 0.14 |
| enc_a3_warden_cantor | 3 | monster | 282 | 8 | 5.4 | 4–4 | 3.4 | 18 | 0.19 |
| enc_a3_warden_geometer | 3 | monster | 266 | 19 | 6.4 | 5–5 | 8.2 | 25 | 0.33 |
| enc_a3_warden_shard | 3 | monster | 270 | 14 | 4.2 | 3–3 | 5.9 | 12 | 0.49 |
| enc_event_antibodies | 3 | event | 73 | 1 | 3.7 | – | 10.7 | – | – |
| enc_event_echo | 3 | event | 97 | 6 | 4.1 | – | 4.9 | – | – |

### Mechanic telemetry

| metric | value |
| --- | --- |
| Onslaught at Attack play (mean) | 0.00 |
| Onslaught distribution | 0: 100% |
| Riposte: primed / triggers / fizzles / attack cancels | 4860 / 228 / 78 / 109 |
| Riposte triggers per primed card · fizzle rate | 0.05 · 1.6% |
| Guard share of damage prevented (Block+Guard) | 18.0% |
| Guard absorbed / Block absorbed / HP lost to hits | 97197 / 443718 / 154578 |
| Bloom at end: max · total · Bloom cards (per run) | 0.00 · 0.00 · 0.00 |
| Prunes per combat | 0.00 |
| Rot's share of damage dealt | 1.2% |
| Beats per turn (on-beat plays / player turns) | 0.80 |
| Timeline resolutions per combat (added / resolved) | 3.99 (92144 / 80458) |
| Exposed bonus damage per combat | 3.87 |
| Stagger damage prevented per combat (upper bound) | 4.73 |
| Potions used per run | 7.85 |

### Cap hits

Cap hits per player turn: 5.40% (healthy < 1%).


| cap | hits |
| --- | --- |
| cap_hand | 4111 |
| cap_stacks | 548 |
| cap_draw | 256 |
| cap_advance | 129 |
| cap_bonus_energy | 56 |
