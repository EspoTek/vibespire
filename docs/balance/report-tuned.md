# Balance report: tuned

Generated 2026-10-29 by `sim/report.ts` from `sim/out/tune/v1-breaker.json`, `sim/out/tune/v1-graft.json`, `sim/out/tune/v1-chronist.json`.

Held-out seeds (prefix val) after the 2026-10-29 card/relic pass; see docs/balance/changelog.md. Tuning used prefix tune; hold and final were also seen once.

| class | policy | content | runs | seed prefix | overrides | sim time |
| --- | --- | --- | --- | --- | --- | --- |
| breaker | greedy | real | 300 | val | none | 186.2 s |
| graft | greedy | real | 300 | val | none | 99.2 s |
| chronist | greedy | real | 300 | val | none | 156.6 s |

## Summary

| class | win rate | stalemates | reach A1 boss | beat A1 boss | beat A2 boss | HP at A1 boss | skip rate | Shards earned A1/A2/A3 | deck size A1/A2/A3 | cap hits / turn |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| breaker | 30.7% | 2 | 99.3% | 94.3% | 45.3% | 85.3% | 28.1% | 3.3 / 2.6 / 1.1 | 19 / 22 / 27 | 5.10% |
| graft | 24.0% | 0 | 99.7% | 96.7% | 49.3% | 78.5% | 25.1% | 3.4 / 2.1 / 1.1 | 18 / 21 / 25 | 46.90% |
| chronist | 27.3% | 0 | 96.0% | 93.0% | 47.0% | 77.8% | 27.0% | 3.1 / 2.3 / 1.3 | 19 / 23 / 27 | 7.00% |

Win-rate spread between classes: 6.7% (target ≤ 8%).

## Suspects

Cards with a pick rate in the bottom or top 5% of their class (offered ≥ max(10, 1% of screens)), relics with |win Δ| > 10 points (held in ≥ 5% of runs), encounters whose HP lost exceeds ENEMIES §4.1 by > 30% (≥ 10 fights), missed GDD §8.4 milestones, and stalemates (a combat over the turn limit, counted as a loss), and cap-hit rates over 1% of turns. Ranked by severity. Relic and card win deltas carry survivorship bias: runs that live longer collect more relics and cards, so with a low win rate most positive deltas mean "held by runs that got far". Compare them with each other, not with zero.


| class | kind | id | why |
| --- | --- | --- | --- |
| graft | cap | `cap_hits` | caps hit in 46.90% of turns (target < 1%): cap_stacks 11380, cap_hand 596, cap_prune_away 4 |
| graft | relic | `gravity_loom` | win Δ +58.0 pts (36 runs) |
| chronist | relic | `crown_fragment` | win Δ +53.4 pts (32 runs) |
| breaker | relic | `crown_fragment` | win Δ +52.8 pts (28 runs) |
| breaker | relic | `stormbreak_gem` | win Δ +45.7 pts (51 runs) |
| chronist | cap | `cap_hits` | caps hit in 7.00% of turns (target < 1%): cap_hand 1590, cap_stacks 159, cap_draw 107 |
| graft | relic | `crown_fragment` | win Δ +43.1 pts (32 runs) |
| breaker | relic | `bulwark_rivets` | win Δ +42.8 pts (93 runs) |
| breaker | relic | `binding_contract` | win Δ +40.9 pts (77 runs) |
| breaker | relic | `gravity_loom` | win Δ +40.7 pts (25 runs) |
| breaker | relic | `notched_buckler` | win Δ +40.0 pts (82 runs) |
| breaker | stalemate | `enc_a1_orchid` | 1 run(s) ended in a stalemate (combat over the turn limit; counted as losses) |
| breaker | stalemate | `enc_a2_assembler` | 1 run(s) ended in a stalemate (combat over the turn limit; counted as losses) |
| graft | relic | `stim_patch` | win Δ +38.9 pts (73 runs) |
| chronist | relic | `paradox_coil` | win Δ +38.4 pts (36 runs) |
| chronist | relic | `timeline_spool` | win Δ +37.7 pts (61 runs) |
| chronist | relic | `geode_heart` | win Δ +36.4 pts (75 runs) |
| chronist | relic | `wayfinder_needle` | win Δ +35.6 pts (59 runs) |
| breaker | cap | `cap_hits` | caps hit in 5.10% of turns (target < 1%): cap_hand 1128, cap_stacks 550, cap_to_hand 91 |
| chronist | relic | `star_pip` | win Δ +34.5 pts (73 runs) |
| breaker | relic | `bastion_core` | win Δ +33.6 pts (33 runs) |
| chronist | relic | `tuning_fork` | win Δ +33.1 pts (77 runs) |
| chronist | relic | `glass_spurs` | win Δ +32.9 pts (75 runs) |
| breaker | relic | `tally_stick` | win Δ +32.0 pts (86 runs) |
| chronist | relic | `ghost_lantern` | win Δ +31.8 pts (104 runs) |
| chronist | relic | `cracked_hourglass` | win Δ -31.7 pts (78 runs) |
| breaker | relic | `tender_plating` | win Δ +31.2 pts (38 runs) |
| breaker | relic | `ghost_lantern` | win Δ +31.1 pts (109 runs) |
| breaker | relic | `duelists_oath` | win Δ +30.4 pts (52 runs) |
| breaker | relic | `chain_wraps` | win Δ +29.3 pts (102 runs) |
| graft | relic | `elder_seed` | win Δ +29.1 pts (32 runs) |
| chronist | relic | `stim_patch` | win Δ +29.1 pts (73 runs) |
| chronist | relic | `shard_writ` | win Δ +29.0 pts (26 runs) |
| breaker | relic | `cracked_hourglass` | win Δ -28.9 pts (88 runs) |
| chronist | relic | `void_compass` | win Δ +28.9 pts (30 runs) |
| chronist | relic | `metronome_heart` | win Δ +28.9 pts (34 runs) |
| graft | relic | `tender_plating` | win Δ +28.5 pts (26 runs) |
| graft | relic | `cracked_hourglass` | win Δ -27.9 pts (97 runs) |
| chronist | relic | `stasis_engine` | win Δ +27.9 pts (56 runs) |
| graft | relic | `binding_contract` | win Δ +27.7 pts (87 runs) |
| chronist | relic | `fixed_star` | win Δ +27.6 pts (54 runs) |
| breaker | relic | `practice_dummy` | win Δ +26.7 pts (35 runs) |
| breaker | relic | `scrap_magnet` | win Δ +26.3 pts (97 runs) |
| chronist | relic | `shard_lens` | win Δ +25.7 pts (63 runs) |
| chronist | relic | `overwatch_drone` | win Δ +25.7 pts (63 runs) |
| breaker | relic | `concussion_rig` | win Δ +25.5 pts (63 runs) |
| chronist | relic | `sandglass_bead` | win Δ +25.4 pts (73 runs) |
| breaker | relic | `glass_spurs` | win Δ +25.1 pts (99 runs) |
| graft | relic | `seed_pouch` | win Δ +24.5 pts (84 runs) |
| graft | relic | `fracture_engine` | win Δ +24.1 pts (33 runs) |
| chronist | relic | `scrap_magnet` | win Δ +24.1 pts (80 runs) |
| breaker | relic | `shard_lens` | win Δ +24.0 pts (58 runs) |
| chronist | relic | `prophet_glass` | win Δ +24.0 pts (35 runs) |
| chronist | relic | `cracked_prism` | win Δ +23.8 pts (83 runs) |
| chronist | relic | `fracture_engine` | win Δ +23.5 pts (31 runs) |
| breaker | relic | `pocket_star_chart` | win Δ +23.4 pts (52 runs) |
| graft | relic | `pocket_star_chart` | win Δ +23.1 pts (51 runs) |
| graft | relic | `scrap_magnet` | win Δ +22.9 pts (81 runs) |
| chronist | relic | `concussion_rig` | win Δ +22.9 pts (59 runs) |
| breaker | relic | `slow_temper` | win Δ +22.8 pts (57 runs) |
| chronist | relic | `bulwark_rivets` | win Δ +22.8 pts (82 runs) |
| breaker | relic | `overwatch_drone` | win Δ +22.6 pts (64 runs) |
| breaker | relic | `parry_charm` | win Δ +22.6 pts (55 runs) |
| chronist | relic | `seers_veil` | win Δ +22.6 pts (57 runs) |
| breaker | relic | `void_compass` | win Δ +22.5 pts (42 runs) |
| chronist | relic | `shard_crucible` | win Δ +22.5 pts (25 runs) |
| chronist | relic | `timeline_clamp` | win Δ +22.5 pts (25 runs) |
| breaker | relic | `surveyor_ink` | win Δ +22.3 pts (81 runs) |
| graft | relic | `heartwood_ring` | win Δ +21.9 pts (42 runs) |
| graft | relic | `tally_stick` | win Δ +21.8 pts (83 runs) |
| graft | relic | `hollow_bough` | win Δ +21.4 pts (45 runs) |
| breaker | relic | `stasis_engine` | win Δ +21.3 pts (54 runs) |
| graft | relic | `dampener_coil` | win Δ +21.2 pts (81 runs) |
| chronist | relic | `tally_stick` | win Δ +21.1 pts (74 runs) |
| chronist | relic | `binding_contract` | win Δ +20.9 pts (64 runs) |
| breaker | relic | `field_dressing` | win Δ +20.6 pts (107 runs) |
| breaker | relic | `dampener_coil` | win Δ +20.6 pts (81 runs) |
| chronist | relic | `dampener_coil` | win Δ +20.6 pts (94 runs) |
| breaker | relic | `geode_heart` | win Δ +20.4 pts (94 runs) |
| graft | relic | `crystal_spine` | win Δ +20.2 pts (57 runs) |
| graft | relic | `bulwark_rivets` | win Δ +20.1 pts (80 runs) |
| graft | relic | `surveyor_ink` | win Δ +20.1 pts (86 runs) |
| breaker | relic | `shard_debt` | win Δ +20.0 pts (33 runs) |
| graft | relic | `overwatch_drone` | win Δ +19.8 pts (44 runs) |
| graft | relic | `field_dressing` | win Δ +19.6 pts (81 runs) |
| chronist | encounter | `enc_a3_shard_mote` | HP lost 19.2 vs expected 5 (×3.83; 85 fights, 2 deaths) |
| chronist | relic | `field_dressing` | win Δ +19.3 pts (85 runs) |
| graft | relic | `geode_heart` | win Δ +19.0 pts (76 runs) |
| graft | encounter | `enc_a3_shard_mote` | HP lost 18.6 vs expected 5 (×3.72; 105 fights, 3 deaths) |
| graft | relic | `pollen_sac` | win Δ +18.5 pts (83 runs) |
| graft | relic | `nursery_tray` | win Δ +18.4 pts (27 runs) |
| graft | relic | `concussion_rig` | win Δ +18.3 pts (51 runs) |
| chronist | relic | `gravity_loom` | win Δ +18.2 pts (25 runs) |
| chronist | relic | `hairline_saw` | win Δ +17.9 pts (60 runs) |
| graft | relic | `compost_heap` | win Δ +17.8 pts (63 runs) |
| breaker | relic | `fracture_engine` | win Δ +17.7 pts (46 runs) |
| chronist | relic | `slow_temper` | win Δ +17.7 pts (55 runs) |
| chronist | encounter | `enc_a3_mote_pair` | HP lost 10.9 vs expected 3 (×3.65; 98 fights, 2 deaths) |
| graft | encounter | `enc_a3_mote_pair` | HP lost 11.2 vs expected 3 (×3.72; 97 fights, 0 deaths) |
| breaker | relic | `cracked_prism` | win Δ +16.9 pts (92 runs) |
| breaker | relic | `hairline_saw` | win Δ +16.6 pts (69 runs) |
| breaker | relic | `wayfinder_needle` | win Δ +16.4 pts (52 runs) |
| chronist | relic | `offbeat_drum` | win Δ +16.4 pts (54 runs) |
| graft | relic | `void_compass` | win Δ +16.0 pts (51 runs) |
| graft | relic | `ghost_lantern` | win Δ +15.7 pts (116 runs) |
| breaker | relic | `oracle_pebble` | win Δ +15.3 pts (41 runs) |
| breaker | encounter | `enc_a3_shard_mote` | HP lost 16.5 vs expected 5 (×3.30; 98 fights, 3 deaths) |
| graft | relic | `shard_writ` | win Δ +14.3 pts (27 runs) |
| chronist | relic | `crystal_spine` | win Δ +14.2 pts (65 runs) |
| breaker | relic | `kept_fury` | win Δ +13.7 pts (55 runs) |
| graft | relic | `mycelial_net` | win Δ +13.6 pts (51 runs) |
| breaker | encounter | `enc_a3_mote_pair` | HP lost 9.7 vs expected 3 (×3.24; 90 fights, 1 deaths) |
| breaker | relic | `stim_patch` | win Δ +12.9 pts (77 runs) |
| graft | relic | `shard_debt` | win Δ +12.9 pts (28 runs) |
| graft | relic | `stasis_engine` | win Δ +12.7 pts (46 runs) |
| chronist | relic | `vial_rack` | win Δ +12.7 pts (31 runs) |
| graft | relic | `rot_censer` | win Δ +11.9 pts (47 runs) |
| graft | relic | `cracked_prism` | win Δ +11.8 pts (83 runs) |
| graft | relic | `vial_rack` | win Δ +11.6 pts (29 runs) |
| breaker | relic | `shard_writ` | win Δ +11.1 pts (27 runs) |
| graft | encounter | `enc_a2_rivet_pair` | HP lost 10.2 vs expected 4 (×2.56; 178 fights, 1 deaths) |
| breaker | card | `iron_rhythm` | pick rate 92.0% (top 5%, offered 213, deck win Δ +20.0 pts) |
| chronist | encounter | `enc_a2_rivet_pair` | HP lost 10.0 vs expected 4 (×2.50; 182 fights, 0 deaths) |
| chronist | card | `tide_table` | pick rate 86.4% (top 5%, offered 339, deck win Δ +12.6 pts) |
| chronist | card | `toll_the_hours` | pick rate 86.9% (top 5%, offered 221, deck win Δ +11.7 pts) |
| breaker | card | `anvil_heart` | pick rate 86.3% (top 5%, offered 307, deck win Δ +19.1 pts) |
| graft | card | `thresher` | pick rate 87.9% (top 5%, offered 206, deck win Δ +11.0 pts) |
| breaker | encounter | `enc_a2_rivet_pair` | HP lost 8.0 vs expected 4 (×2.01; 194 fights, 0 deaths) |
| breaker | milestone | `beat_a2_boss` | 45.3% beat the act 2 boss (target ≥ 50%) |
| graft | milestone | `beat_a2_boss` | 49.3% beat the act 2 boss (target ≥ 50%) |
| chronist | milestone | `beat_a2_boss` | 47.0% beat the act 2 boss (target ≥ 50%) |
| chronist | card | `zenith` | pick rate 83.1% (top 5%, offered 189, deck win Δ +16.5 pts) |
| breaker | card | `recoil_spring` | pick rate 84.7% (top 5%, offered 189, deck win Δ +9.3 pts) |
| graft | card | `living_hedge` | pick rate 81.9% (top 5%, offered 298, deck win Δ +21.8 pts) |
| chronist | card | `reef_the_sails` | pick rate 0.0% (bottom 5%, offered 452) |
| graft | encounter | `enc_a2_riveter` | HP lost 7.7 vs expected 5 (×1.54; 203 fights, 0 deaths) |
| graft | encounter | `enc_a3_seer` | HP lost 3.0 vs expected 2 (×1.51; 94 fights, 0 deaths) |
| graft | card | `decomposer` | pick rate 81.0% (top 5%, offered 321, deck win Δ +7.0 pts) |
| graft | card | `mire_carapace` | pick rate 1.0% (bottom 5%, offered 489) |
| breaker | card | `find_the_seam` | pick rate 0.0% (bottom 5%, offered 458) |
| chronist | card | `downbeat` | pick rate 1.0% (bottom 5%, offered 485) |
| graft | card | `propagate` | pick rate 0.0% (bottom 5%, offered 324) |
| graft | card | `transplant` | pick rate 0.0% (bottom 5%, offered 224) |
| breaker | card | `prism_edge` | pick rate 0.3% (bottom 5%, offered 313) |
| chronist | card | `banked_hours` | pick rate 76.6% (top 5%, offered 290, deck win Δ +13.3 pts) |
| breaker | card | `en_garde` | pick rate 0.0% (bottom 5%, offered 210) |
| chronist | card | `perpetual_motion` | pick rate 0.6% (bottom 5%, offered 167) |
| breaker | card | `forge_oath` | pick rate 78.4% (top 5%, offered 199, deck win Δ -11.6 pts) |
| graft | card | `hyphal_web` | pick rate 79.2% (top 5%, offered 183, deck win Δ +12.3 pts) |

## breaker

| runs | win | stalemates | reach A1 boss | beat A1 boss | reach A2 boss | beat A2 boss | reach A3 boss | deaths A1/A2/A3 | actions (wins) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 300 | 30.7% | 2 | 99.3% | 94.3% | 50.7% | 45.3% | 32.3% | 8% / 71% / 21% | 615 (941) |

GDD §8.4 bot targets: win 25–35%, reach A1 boss ≥ 90%, beat A1 boss ≥ 75%, beat A2 boss ≥ 50%, death share by act ≈ 30/40/30.

### Death heatmap (encounter × act)

| encounter | act | deaths | share of deaths | fights | death rate per fight |
| --- | --- | --- | --- | --- | --- |
| enc_a2_oracle_golem | 2 | 30 | 14.4% | 183 | 16.4% |
| enc_a2_oracle_pack | 2 | 30 | 14.4% | 183 | 16.4% |
| enc_a2_golem_riveter | 2 | 19 | 9.1% | 143 | 13.3% |
| enc_a2_drone_riveter | 2 | 19 | 9.1% | 155 | 12.3% |
| enc_a3_fever_pack | 3 | 13 | 6.3% | 91 | 14.3% |
| enc_a2_furnace | 2 | 13 | 6.3% | 49 | 26.5% |
| enc_a1_ram | 1 | 13 | 6.3% | 96 | 13.5% |
| enc_a2_drone_trio | 2 | 12 | 5.8% | 138 | 8.7% |
| enc_a2_acolyte_pack | 2 | 10 | 4.8% | 154 | 6.5% |
| enc_a2_acolyte_golem | 2 | 9 | 4.3% | 158 | 5.7% |
| enc_a3_warden_geometer | 3 | 5 | 2.4% | 86 | 5.8% |
| enc_a3_prism_motes | 3 | 5 | 2.4% | 68 | 7.4% |
| enc_a3_sovereign | 3 | 4 | 1.9% | 31 | 12.9% |
| enc_a3_geometer | 3 | 4 | 1.9% | 88 | 4.5% |
| enc_a3_shard_mote | 3 | 3 | 1.4% | 98 | 3.1% |
| enc_a3_event_horizon | 3 | 3 | 1.4% | 36 | 8.3% |
| enc_a3_warden_shard | 3 | 3 | 1.4% | 81 | 3.7% |
| enc_a1_orchid | 1 | 2 | 1.0% | 109 | 1.8% |
| enc_a2_trihammer | 2 | 2 | 1.0% | 48 | 4.2% |
| enc_a1_alpha | 1 | 1 | 0.5% | 118 | 0.8% |
| enc_a3_mote_pair | 3 | 1 | 0.5% | 90 | 1.1% |
| enc_event_echo | 3 | 1 | 0.5% | 38 | 2.6% |
| enc_a3_warden_cantor | 3 | 1 | 0.5% | 77 | 1.3% |
| enc_a2_assembler | 2 | 1 | 0.5% | 55 | 1.8% |
| enc_a2_anvil_hammer | 2 | 1 | 0.5% | 38 | 2.6% |
| enc_a1_thornback_drone | 1 | 1 | 0.5% | 205 | 0.5% |
| enc_a2_drone_gnasher | 2 | 1 | 0.5% | 196 | 0.5% |
| enc_a3_archivist | 3 | 1 | 0.5% | 35 | 2.9% |

### HP at boss entry

| act | boss fights | avg HP | avg HP % |
| --- | --- | --- | --- |
| 1 | 298 | 70.3 | 85.3% |
| 2 | 152 | 61.7 | 74.4% |
| 3 | 97 | 69.0 | 82.7% |

### Floor of death

```
F12    1 █
F14    1 █
F16   15 █████████████████████
F18    1 █
F19   12 █████████████████
F20   17 ███████████████████████
F21   29 ████████████████████████████████████████
F22   14 ███████████████████
F23    7 ██████████
F24   12 █████████████████
F26   14 ███████████████████
F27    7 ██████████
F28    6 ████████
F29    6 ████████
F30    6 ████████
F32   16 ██████████████████████
F33    1 █
F34    3 ████
F35    4 ██████
F36    5 ███████
F37    5 ███████
F38    3 ████
F39    4 ██████
F40    2 ███
F42    2 ███
F43    2 ███
F44    3 ████
F45    3 ████
F46    2 ███
F48    5 ███████
```

### Card rewards

5868 reward screens, skip rate 28.1%. Δwin = win rate of runs that picked the card in that act minus the class win rate (n = runs). Deck Δ = runs ending with it in the deck vs without.


| card | offered | picked | pick % | on skipped screens | bought | Δwin A1 | Δwin A2 | Δwin A3 | deck Δwin | dmg/combat with |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| iron_rhythm | 213 | 196 | 92.0% | 0.5% | 2 | -2.1 (98) | +27.1 (64) | +69.3 (13) | +20.0 | 6.6 |
| anvil_heart | 307 | 265 | 86.3% | 4.6% | 24 | -5.2 (110) | +8.8 (81) | +38.6 (26) | +19.1 | 6.6 |
| recoil_spring | 189 | 160 | 84.7% | 1.6% | 1 | -6.0 (81) | +22.2 (53) | +33.6 (14) | +9.3 | 6.7 |
| forge_oath | 199 | 156 | 78.4% | 3.0% | 1 | -2.8 (79) | +11.9 (47) | +62.2 (14) | -11.6 | 7.0 |
| cinder_heart | 302 | 221 | 73.2% | 10.6% | 17 | -1.4 (106) | +5.7 (55) | +40.8 (28) | +15.5 | 6.8 |
| parry_ledger | 297 | 216 | 72.7% | 12.5% | 18 | +1.1 (107) | +15.7 (69) | +69.3 (18) | +16.5 | 6.7 |
| read_the_blow | 299 | 175 | 58.5% | 16.7% | 3 | +4.8 (107) | +17.2 (46) | +69.3 (13) | +25.9 | 6.4 |
| feint_step | 312 | 177 | 56.7% | 15.7% | 6 | +0.6 (99) | +20.4 (45) | +47.9 (14) | +15.9 | 6.5 |
| anneal | 322 | 170 | 52.8% | 18.9% | 3 | -1.9 (87) | +18.3 (47) | +56.8 (24) | +17.9 | 6.4 |
| rampart_crash | 309 | 162 | 52.4% | 18.4% | 2 | -1.2 (78) | +18.4 (53) | +50.6 (16) | +14.4 | 6.6 |
| bind_the_blade | 315 | 157 | 49.8% | 21.3% | 4 | +7.1 (90) | +34.2 (37) | +69.3 (16) | +30.5 | 6.3 |
| vent_pressure | 187 | 90 | 48.1% | 9.1% | 0 | -8.6 (59) | +1.2 (22) | +69.3 (8) | +1.0 | 6.8 |
| smouldering_core | 203 | 95 | 46.8% | 5.9% | 0 | +2.1 (64) | +17.2 (23) | +36.0 (6) | +5.9 | 7.1 |
| crossed_blades | 309 | 136 | 44.0% | 21.0% | 10 | -2.6 (82) | +25.2 (34) | +56.0 (15) | +16.5 | 6.6 |
| endless_maul | 202 | 81 | 40.1% | 11.9% | 0 | +5.5 (47) | +23.2 (26) | +69.3 (5) | +19.6 | 6.5 |
| ride_the_surge | 302 | 117 | 38.7% | 25.2% | 3 | -7.4 (73) | +21.7 (21) | +63.5 (17) | +12.4 | 6.8 |
| catch_blade | 431 | 164 | 38.1% | 26.5% | 1 | +8.2 (103) | +19.3 (32) | +45.5 (21) | +22.9 | 6.3 |
| fault_reader | 323 | 118 | 36.5% | 24.1% | 7 | -7.9 (79) | +26.5 (21) | +44.3 (12) | +3.6 | 6.6 |
| loaded_spring | 475 | 173 | 36.4% | 28.0% | 8 | +3.3 (103) | +15.5 (39) | +44.3 (16) | +11.6 | 6.5 |
| jackhammer | 201 | 73 | 36.3% | 13.9% | 0 | +9.0 (53) | +19.3 (14) | +69.3 (3) | +16.6 | 6.3 |
| piston_volley | 332 | 112 | 33.7% | 25.6% | 1 | +4.9 (59) | +25.6 (32) | +56.8 (16) | +26.0 | 6.4 |
| answering_steel | 328 | 101 | 30.8% | 28.0% | 2 | -6.6 (54) | +31.8 (24) | +36.0 (18) | +19.8 | 6.3 |
| quake_hammer | 318 | 91 | 28.6% | 26.4% | 4 | -0.4 (66) | +9.3 (20) | +19.3 (2) | +7.0 | 6.4 |
| quench | 335 | 76 | 22.7% | 34.6% | 0 | +6.6 (51) | +11.4 (19) | +52.7 (6) | +13.3 | 6.6 |
| pivot_sweep | 472 | 96 | 20.3% | 32.4% | 2 | +10.8 (70) | -2.1 (14) | +69.3 (9) | +16.9 | 6.4 |
| steal_the_swing | 211 | 42 | 19.9% | 14.2% | 0 | +21.7 (21) | +38.1 (16) | +69.3 (5) | +36.7 | 5.8 |
| return_stroke | 444 | 77 | 17.3% | 31.5% | 1 | -0.7 (50) | +25.6 (16) | +58.2 (9) | +13.1 | 6.2 |
| coiled_strike | 292 | 46 | 15.8% | 34.2% | 1 | +19.3 (28) | +38.6 (13) | +49.3 (5) | +30.5 | 5.9 |
| iron_avalanche | 180 | 28 | 15.6% | 18.9% | 0 | +2.7 (18) | +36.0 (9) | +69.3 (1) | +17.4 | 6.8 |
| shed_plating | 201 | 31 | 15.4% | 18.9% | 0 | -1.3 (17) | +5.7 (11) | +36.0 (3) | +5.4 | 5.9 |
| cool_the_steel | 452 | 67 | 14.8% | 36.9% | 0 | +0.1 (39) | +26.5 (21) | +69.3 (5) | +17.4 | 6.2 |
| hairline_mark | 321 | 35 | 10.9% | 32.1% | 0 | -7.1 (17) | +36.0 (6) | +60.2 (11) | +23.4 | 6.8 |
| gauntlet_tap | 463 | 46 | 9.9% | 36.1% | 0 | +2.7 (18) | +30.4 (18) | +47.1 (9) | +25.3 | 5.8 |
| thresher_arc | 468 | 44 | 9.4% | 37.0% | 1 | -1.5 (24) | +25.6 (16) | +44.3 (4) | +12.0 | 6.4 |
| sabre_rattle | 435 | 35 | 8.0% | 36.6% | 1 | +8.2 (18) | +5.0 (14) | +69.3 (3) | +10.6 | 7.0 |
| reactive_plate | 204 | 13 | 6.4% | 27.9% | 0 | -2.1 (7) | -5.7 (4) | +69.3 (2) | +8.1 | 6.3 |
| chain_driver | 446 | 27 | 6.1% | 35.2% | 0 | +2.7 (9) | -0.7 (10) | +69.3 (7) | +21.2 | 6.0 |
| read_the_line | 440 | 24 | 5.5% | 36.1% | 0 | -14.0 (6) | +31.8 (8) | +59.3 (10) | +37.4 | 6.1 |
| seam_ripper | 292 | 16 | 5.5% | 33.9% | 0 | +2.7 (3) | -2.1 (7) | +52.7 (6) | +20.4 | 6.7 |
| rivet_wall | 488 | 24 | 4.9% | 40.0% | 0 | +7.8 (13) | +49.3 (5) | +69.3 (5) | +36.4 | 6.5 |
| piston_jab | 444 | 20 | 4.5% | 34.5% | 0 | +2.7 (3) | +2.7 (9) | +69.3 (7) | +29.1 | 6.0 |
| hammerfall | 299 | 11 | 3.7% | 36.8% | 0 | +19.3 (4) | +19.3 (4) | +69.3 (3) | +28.8 | 7.3 |
| counterweight | 456 | 15 | 3.3% | 35.1% | 1 | +12.2 (7) | +19.3 (4) | +69.3 (4) | +29.8 | 5.6 |
| fault_line | 477 | 13 | 2.7% | 40.3% | 0 | -30.7 (3) | +9.3 (5) | +69.3 (5) | +20.3 | 5.2 |
| planted_feet | 463 | 12 | 2.6% | 33.0% | 0 | -16.4 (7) | +36.0 (3) | +69.3 (2) | +11.5 | 6.9 |
| rivet_flurry | 429 | 5 | 1.2% | 36.6% | 0 | – | +36.0 (3) | +69.3 (2) | +36.7 | 5.6 |
| plate_ram | 454 | 4 | 0.9% | 36.8% | 0 | -30.7 (1) | +69.3 (1) | +69.3 (2) | +29.8 | 6.4 |
| overhand_drive | 472 | 3 | 0.6% | 41.5% | 0 | -30.7 (1) | -30.7 (2) | – | -5.7 | 6.5 |
| breach_hammer | 465 | 3 | 0.6% | 35.9% | 0 | – | -30.7 (1) | +69.3 (2) | +36.4 | 5.7 |
| prism_edge | 313 | 1 | 0.3% | 40.6% | 0 | – | – | +69.3 (1) | +69.6 | 8.0 |
| find_the_seam | 458 | 0 | 0.0% | 38.6% | 0 | – | – | – | +0.0 | 0.0 |
| en_garde | 210 | 0 | 0.0% | 27.6% | 0 | – | – | – | +0.0 | 0.0 |

### Relics

| relic | runs holding | win Δ (pts) |
| --- | --- | --- |
| crown_fragment | 28 | +52.8 |
| stormbreak_gem | 51 | +45.7 |
| bulwark_rivets | 93 | +42.8 |
| binding_contract | 77 | +40.9 |
| gravity_loom | 25 | +40.7 |
| notched_buckler | 82 | +40.0 |
| bastion_core | 33 | +33.6 |
| tally_stick | 86 | +32.0 |
| tender_plating | 38 | +31.2 |
| ghost_lantern | 109 | +31.1 |
| duelists_oath | 52 | +30.4 |
| chain_wraps | 102 | +29.3 |
| practice_dummy | 35 | +26.7 |
| scrap_magnet | 97 | +26.3 |
| concussion_rig | 63 | +25.5 |
| glass_spurs | 99 | +25.1 |
| shard_lens | 58 | +24.0 |
| pocket_star_chart | 52 | +23.4 |
| slow_temper | 57 | +22.8 |
| overwatch_drone | 64 | +22.6 |
| parry_charm | 55 | +22.6 |
| void_compass | 42 | +22.5 |
| surveyor_ink | 81 | +22.3 |
| stasis_engine | 54 | +21.3 |
| field_dressing | 107 | +20.6 |
| dampener_coil | 81 | +20.6 |
| geode_heart | 94 | +20.4 |
| shard_debt | 33 | +20.0 |
| fracture_engine | 46 | +17.7 |
| cracked_prism | 92 | +16.9 |
| hairline_saw | 69 | +16.6 |
| wayfinder_needle | 52 | +16.4 |
| oracle_pebble | 41 | +15.3 |
| kept_fury | 55 | +13.7 |
| stim_patch | 77 | +12.9 |
| shard_writ | 27 | +11.1 |
| shard_crucible | 46 | +10.0 |
| vial_rack | 28 | +9.5 |
| ascendant_prism | 5 | +9.5 |
| crowd_breaker | 58 | +6.9 |
| crystal_spine | 44 | +6.7 |
| riven_gauntlet | 300 | +0.0 |
| exposed_core | 23 | -5.0 |
| engine_tooth | 4 | -5.7 |
| cracked_hourglass | 88 | -28.9 |

Boss relic screens: skip rate 0.0%.


| boss relic | offered | picked | pick % |
| --- | --- | --- | --- |
| ghost_lantern | 109 | 109 | 100.0% |
| cracked_hourglass | 137 | 88 | 64.2% |
| binding_contract | 120 | 77 | 64.2% |
| stasis_engine | 147 | 54 | 36.7% |
| tender_plating | 139 | 38 | 27.3% |
| gravity_loom | 116 | 25 | 21.6% |
| exposed_core | 107 | 23 | 21.5% |
| ascendant_prism | 130 | 5 | 3.8% |
| star_atlas | 117 | 0 | 0.0% |
| heavy_heart | 135 | 0 | 0.0% |

### Pacts and events

| pact | picked | win Δ (pts) |
| --- | --- | --- |
| pact_shards | 108 | -4.5 |
| pact_purse | 102 | -15.3 |
| pact_hardy | 90 | +21.3 |

| event | seen | option picks |
| --- | --- | --- |
| ev_quiet_bench | 88 | #0: 76, #1: 12 |
| ev_assembly_line | 57 | #0: 57 |
| ev_hydroponic_bay | 55 | #0: 55 |
| ev_memory_pool | 112 | #0: 2, #1: 110 |
| ev_wandering_artificer | 108 | #0: 18, #1: 90 |
| ev_lost_climber | 99 | #0: 14, #1: 85 |
| ev_smelter | 37 | #0: 1, #1: 29, #2: 7 |
| ev_tether_merchant | 31 | #0: 27, #3: 4 |
| ev_prism_garden | 20 | #1: 20 |
| ev_crown_vault | 28 | #1: 28 |
| ev_rigged_conveyor | 52 | #0: 48, #1: 4 |
| ev_engine_cult | 45 | #0: 4, #1: 41 |
| ev_salvage_heap | 43 | #1: 9, #2: 34 |
| ev_singing_geode | 48 | #1: 15, #2: 33 |
| ev_drowned_shrine | 46 | #1: 3, #2: 43 |
| ev_oracle_terminal | 49 | #0: 41, #3: 8 |
| ev_flickering_medpod | 36 | #0: 7, #1: 22, #2: 7 |
| ev_spore_choir | 54 | #0: 54 |
| ev_void_lens | 21 | #2: 21 |
| ev_scavenger_drone | 49 | #0: 46, #2: 3 |
| ev_your_echo | 38 | #0: 38 |
| ev_immune_scan | 20 | #1: 16, #2: 4 |

### Economy per act

| act | Shards earned | Shards spent | deck size (end of act) | gold earned | gold spent | removals shop/rest/event/other | upgrades |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 3.33 | 0.54 | 18.8 | 324 | 198 | 1.02 / 0.00 / 0.04 / 0.02 | 2.06 |
| 2 | 2.60 | 0.88 | 22.2 | 191 | 205 | 0.97 / 0.01 / 0.02 / 0.15 | 0.98 |
| 3 | 1.06 | 0.99 | 26.9 | 121 | 138 | 0.54 / 0.00 / 0.01 / 0.08 | 1.00 |

Shard target (GDD §4.5): 3–5 earned per act. Per-act averages are over all runs (runs that died earlier count 0 for later acts).

### Turns and damage per encounter vs ENEMIES §4.1

| encounter | act | room | fights | deaths | avg turns | expected phases | avg HP lost | expected lost | ratio |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| enc_a1_alpha | 1 | elite | 118 | 1 | 6.5 | 2–3 | 11.2 | 24 | 0.46 |
| enc_a1_dreadcap | 1 | elite | 132 | 0 | 8.0 | 5–5 | 7.4 | 20 | 0.37 |
| enc_a1_drone_pack | 1 | monster | 197 | 0 | 3.2 | 2–3 | 5.0 | 9 | 0.56 |
| enc_a1_drone_puff | 1 | monster | 300 | 0 | 2.3 | 1–2 | 0.1 | 2 | 0.07 |
| enc_a1_empress | 1 | boss | 93 | 0 | 11.3 | 11–11 | 4.7 | 39 | 0.12 |
| enc_a1_flitter_gnasher | 1 | monster | 194 | 0 | 2.9 | 2–3 | 4.4 | 15 | 0.29 |
| enc_a1_gnasher_pair | 1 | monster | 301 | 0 | 2.4 | 1–2 | 1.2 | 3 | 0.39 |
| enc_a1_mantis | 1 | monster | 225 | 0 | 3.5 | 2–2 | 2.8 | 9 | 0.31 |
| enc_a1_orchid | 1 | boss | 109 | 2 | 14.8 | 10–10 | 9.9 | 35 | 0.28 |
| enc_a1_ram | 1 | boss | 96 | 13 | 8.7 | 9–9 | 28.6 | 40 | 0.72 |
| enc_a1_spore_cluster | 1 | monster | 182 | 0 | 3.1 | 2–2 | 0.3 | 4 | 0.08 |
| enc_a1_thornback | 1 | monster | 298 | 0 | 3.7 | 2–2 | 4.6 | 11 | 0.42 |
| enc_a1_thornback_drone | 1 | monster | 205 | 1 | 4.4 | 3–3 | 10.6 | 12 | 0.89 |
| enc_a1_thornback_wisp | 1 | monster | 232 | 0 | 4.8 | 3–4 | 7.8 | 20 | 0.39 |
| enc_a1_titan | 1 | elite | 131 | 0 | 5.0 | 4–4 | 2.2 | 17 | 0.13 |
| enc_a1_vine_puff | 1 | monster | 209 | 0 | 5.7 | 4–4 | 3.9 | 17 | 0.23 |
| enc_event_spore_choir | 1 | event | 54 | 0 | 6.5 | – | 5.3 | – | – |
| enc_a2_acolyte_golem | 2 | monster | 158 | 9 | 7.8 | 5–5 | 12.4 | 14 | 0.88 |
| enc_a2_acolyte_pack | 2 | monster | 154 | 10 | 5.6 | 4–4 | 7.5 | 20 | 0.37 |
| enc_a2_anvil_hammer | 2 | elite | 38 | 1 | 8.3 | 5–6 | 12.2 | 28 | 0.44 |
| enc_a2_assembler | 2 | boss | 55 | 1 | 18.9 | 10–10 | 2.1 | 35 | 0.06 |
| enc_a2_auditor | 2 | elite | 42 | 0 | 7.5 | 4–4 | 1.8 | 15 | 0.12 |
| enc_a2_boiler | 2 | elite | 54 | 0 | 7.3 | 5–6 | 4.7 | 24 | 0.20 |
| enc_a2_drone_gnasher | 2 | monster | 196 | 1 | 4.1 | 2–2 | 9.0 | 10 | 0.90 |
| enc_a2_drone_riveter | 2 | monster | 155 | 19 | 5.0 | 3–4 | 12.9 | 18 | 0.72 |
| enc_a2_drone_trio | 2 | monster | 138 | 12 | 5.0 | 4–4 | 11.0 | 16 | 0.69 |
| enc_a2_furnace | 2 | boss | 49 | 13 | 14.8 | 11–11 | 23.6 | 38 | 0.62 |
| enc_a2_golem_riveter | 2 | monster | 143 | 19 | 7.6 | 5–5 | 16.6 | 24 | 0.69 |
| enc_a2_oracle_golem | 2 | monster | 183 | 30 | 7.6 | 5–5 | 17.2 | 20 | 0.86 |
| enc_a2_oracle_pack | 2 | monster | 183 | 30 | 5.4 | 4–4 | 19.6 | 20 | 0.98 |
| enc_a2_rivet_pair | 2 | monster | 194 | 0 | 3.9 | 1–2 | 8.0 | 4 | 2.01 ⚠ |
| enc_a2_riveter | 2 | monster | 175 | 0 | 4.4 | 2–2 | 4.2 | 5 | 0.85 |
| enc_a2_trihammer | 2 | boss | 48 | 2 | 10.4 | 10–10 | 9.4 | 40 | 0.23 |
| enc_event_engine_cult | 2 | event | 41 | 0 | 9.1 | – | 3.8 | – | – |
| enc_a3_archivist | 3 | boss | 35 | 1 | 13.0 | 9–9 | 2.2 | 30 | 0.07 |
| enc_a3_cantor | 3 | monster | 77 | 0 | 5.1 | 2–2 | 1.3 | 6 | 0.21 |
| enc_a3_event_horizon | 3 | elite | 36 | 3 | 7.1 | 4–4 | 18.0 | 36 | 0.50 |
| enc_a3_fever_pack | 3 | monster | 91 | 13 | 4.9 | 3–3 | 14.4 | 15 | 0.96 |
| enc_a3_geometer | 3 | monster | 88 | 4 | 6.0 | 3–3 | 7.6 | 18 | 0.42 |
| enc_a3_leukarch | 3 | boss | 31 | 0 | 13.4 | 10–10 | 6.3 | 37 | 0.17 |
| enc_a3_mirror_knight | 3 | elite | 31 | 0 | 6.1 | 3–3 | 1.4 | 15 | 0.09 |
| enc_a3_mote_pair | 3 | monster | 90 | 1 | 3.9 | 1–1 | 9.7 | 3 | 3.24 ⚠ |
| enc_a3_phage_mother | 3 | elite | 29 | 0 | 8.7 | 3–4 | 1.9 | 18 | 0.11 |
| enc_a3_prism_motes | 3 | monster | 68 | 5 | 4.9 | 3–3 | 11.1 | 12 | 0.93 |
| enc_a3_seer | 3 | monster | 83 | 0 | 4.5 | 1–1 | 1.6 | 2 | 0.80 |
| enc_a3_shard_mote | 3 | monster | 98 | 3 | 4.4 | 1–2 | 16.5 | 5 | 3.30 ⚠ |
| enc_a3_sovereign | 3 | boss | 31 | 4 | 13.0 | 10–10 | 19.7 | 58 | 0.34 |
| enc_a3_warden_cantor | 3 | monster | 77 | 1 | 7.6 | 4–4 | 2.6 | 18 | 0.14 |
| enc_a3_warden_geometer | 3 | monster | 86 | 5 | 8.7 | 5–5 | 11.5 | 25 | 0.46 |
| enc_a3_warden_shard | 3 | monster | 81 | 3 | 5.5 | 3–3 | 5.6 | 12 | 0.47 |
| enc_event_antibodies | 3 | event | 16 | 0 | 4.1 | – | 9.4 | – | – |
| enc_event_echo | 3 | event | 38 | 1 | 5.3 | – | 4.0 | – | – |

### Mechanic telemetry

| metric | value |
| --- | --- |
| Onslaught at Attack play (mean) | 2.68 |
| Onslaught distribution | 0: 18%, 1: 23%, 2: 17%, 3: 12%, 4: 9%, 5: 7%, 6: 5%, 7: 4%, 8: 2%, 9: 1%, 10: 1%, 11: 0%, 12: 0%, 13: 0%, 14: 0%, 15: 0%, 16: 0%, 17: 0%, 18: 0%, 19: 0%, 20: 0%, 21: 0%, 23: 0% |
| Riposte: primed / triggers / fizzles / attack cancels | 21804 / 16205 / 5359 / 1812 |
| Riposte triggers per primed card · fizzle rate | 0.74 · 24.6% |
| Guard share of damage prevented (Block+Guard) | 54.7% |
| Guard absorbed / Block absorbed / HP lost to hits | 113380 / 93792 / 47717 |
| Bloom at end: max · total · Bloom cards (per run) | 0.00 · 0.00 · 0.00 |
| Prunes per combat | 0.00 |
| Rot's share of damage dealt | 1.7% |
| Beats per turn (on-beat plays / player turns) | 0.80 |
| Timeline resolutions per combat (added / resolved) | 0.01 (50 / 50) |
| Exposed bonus damage per combat | 4.88 |
| Stagger damage prevented per combat (upper bound) | 6.98 |
| Potions used per run | 7.69 |

### Cap hits

Cap hits per player turn: 5.10% (healthy < 1%).


| cap | hits |
| --- | --- |
| cap_hand | 1128 |
| cap_stacks | 550 |
| cap_to_hand | 91 |
| cap_prune_away | 1 |
| cap_primes | 1 |
| cap_bonus_energy | 1 |

## graft

| runs | win | stalemates | reach A1 boss | beat A1 boss | reach A2 boss | beat A2 boss | reach A3 boss | deaths A1/A2/A3 | actions (wins) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 300 | 24.0% | 0 | 99.7% | 96.7% | 51.3% | 49.3% | 27.0% | 4% / 62% / 33% | 510 (761) |

GDD §8.4 bot targets: win 25–35%, reach A1 boss ≥ 90%, beat A1 boss ≥ 75%, beat A2 boss ≥ 50%, death share by act ≈ 30/40/30.

### Death heatmap (encounter × act)

| encounter | act | deaths | share of deaths | fights | death rate per fight |
| --- | --- | --- | --- | --- | --- |
| enc_a2_oracle_pack | 2 | 34 | 14.9% | 182 | 18.7% |
| enc_a2_oracle_golem | 2 | 25 | 11.0% | 155 | 16.1% |
| enc_a2_golem_riveter | 2 | 23 | 10.1% | 154 | 14.9% |
| enc_a3_fever_pack | 3 | 20 | 8.8% | 89 | 22.5% |
| enc_a2_drone_riveter | 2 | 19 | 8.3% | 164 | 11.6% |
| enc_a2_drone_trio | 2 | 12 | 5.3% | 155 | 7.7% |
| enc_a3_prism_motes | 3 | 11 | 4.8% | 74 | 14.9% |
| enc_a2_acolyte_golem | 2 | 10 | 4.4% | 184 | 5.4% |
| enc_a3_warden_geometer | 3 | 10 | 4.4% | 76 | 13.2% |
| enc_a3_geometer | 3 | 9 | 3.9% | 91 | 9.9% |
| enc_a1_ram | 1 | 9 | 3.9% | 107 | 8.4% |
| enc_a3_warden_shard | 3 | 8 | 3.5% | 81 | 9.9% |
| enc_a2_acolyte_pack | 2 | 7 | 3.1% | 152 | 4.6% |
| enc_a3_sovereign | 3 | 5 | 2.2% | 20 | 25.0% |
| enc_a3_event_horizon | 3 | 5 | 2.2% | 19 | 26.3% |
| enc_a2_trihammer | 2 | 4 | 1.8% | 43 | 9.3% |
| enc_a3_leukarch | 3 | 4 | 1.8% | 33 | 12.1% |
| enc_a3_shard_mote | 3 | 3 | 1.3% | 105 | 2.9% |
| enc_a2_anvil_hammer | 2 | 3 | 1.3% | 33 | 9.1% |
| enc_a2_furnace | 2 | 2 | 0.9% | 59 | 3.4% |
| enc_a2_rivet_pair | 2 | 1 | 0.4% | 178 | 0.6% |
| enc_a2_auditor | 2 | 1 | 0.4% | 38 | 2.6% |
| enc_a2_boiler | 2 | 1 | 0.4% | 35 | 2.9% |
| enc_a1_mantis | 1 | 1 | 0.4% | 207 | 0.5% |
| enc_a3_warden_cantor | 3 | 1 | 0.4% | 78 | 1.3% |

### HP at boss entry

| act | boss fights | avg HP | avg HP % |
| --- | --- | --- | --- |
| 1 | 299 | 63.2 | 78.5% |
| 2 | 154 | 56.7 | 70.3% |
| 3 | 81 | 57.7 | 71.5% |

### Floor of death

```
F12    1 ██
F16    9 ██████████████
F18    1 ██
F19   10 ████████████████
F20   24 ██████████████████████████████████████
F21   25 ████████████████████████████████████████
F22   18 █████████████████████████████
F23   10 ████████████████
F24    8 █████████████
F26   10 ████████████████
F27    8 █████████████
F28    8 █████████████
F29    6 ██████████
F30    8 █████████████
F32    6 ██████████
F34    2 ███
F35    4 ██████
F36    7 ███████████
F37   17 ███████████████████████████
F38    9 ██████████████
F39    6 ██████████
F40    4 ██████
F42    4 ██████
F43    3 █████
F44    5 ████████
F45    2 ███
F46    4 ██████
F48    9 ██████████████
```

### Card rewards

5832 reward screens, skip rate 25.1%. Δwin = win rate of runs that picked the card in that act minus the class win rate (n = runs). Deck Δ = runs ending with it in the deck vs without.


| card | offered | picked | pick % | on skipped screens | bought | Δwin A1 | Δwin A2 | Δwin A3 | deck Δwin | dmg/combat with |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| thresher | 206 | 181 | 87.9% | 1.0% | 0 | -3.4 (102) | +16.4 (57) | +56.0 (15) | +11.0 | 8.9 |
| living_hedge | 298 | 244 | 81.9% | 3.7% | 32 | +5.1 (117) | +10.4 (64) | +47.4 (28) | +21.8 | 8.4 |
| decomposer | 321 | 260 | 81.0% | 5.3% | 39 | -2.1 (105) | +10.1 (88) | +36.0 (30) | +7.0 | 8.5 |
| hyphal_web | 183 | 145 | 79.2% | 3.8% | 1 | -0.7 (90) | +23.4 (38) | +38.5 (8) | +12.3 | 8.3 |
| shed_husk | 429 | 339 | 79.0% | 7.7% | 21 | +7.4 (156) | +6.3 (99) | +31.6 (27) | +20.3 | 8.4 |
| puffball | 297 | 234 | 78.8% | 5.7% | 12 | +2.4 (121) | +12.8 (68) | +54.3 (23) | +16.5 | 8.4 |
| dusk_pruning | 333 | 248 | 74.5% | 6.3% | 22 | +0.2 (120) | +11.6 (73) | +32.0 (25) | +12.3 | 8.5 |
| death_cap | 203 | 146 | 71.9% | 2.5% | 2 | -1.8 (72) | +18.2 (64) | +56.0 (5) | +11.9 | 8.4 |
| miasma_sweep | 296 | 205 | 69.3% | 9.1% | 9 | -1.5 (111) | +7.6 (57) | +45.6 (23) | +11.1 | 8.5 |
| ripening_rot | 316 | 169 | 53.5% | 12.0% | 14 | -5.7 (82) | +9.3 (60) | +52.5 (17) | +5.5 | 8.5 |
| heartwood_spear | 196 | 102 | 52.0% | 10.7% | 0 | +4.1 (57) | +6.6 (36) | +38.5 (8) | +11.3 | 8.5 |
| choking_spores | 290 | 147 | 50.7% | 16.9% | 4 | +0.0 (96) | +12.8 (38) | +76.0 (6) | +13.3 | 8.1 |
| leaf_litter | 467 | 219 | 46.9% | 19.7% | 9 | -4.9 (131) | +20.4 (45) | +41.0 (20) | +7.6 | 8.5 |
| crystal_graft | 214 | 93 | 43.5% | 8.9% | 0 | -6.7 (52) | +11.7 (28) | +26.0 (10) | +1.4 | 8.3 |
| uproot | 270 | 109 | 40.4% | 17.0% | 4 | +2.4 (53) | +5.0 (31) | +39.6 (22) | +15.6 | 8.4 |
| chitin_cocoon | 206 | 80 | 38.8% | 13.1% | 1 | +7.9 (47) | +1.0 (24) | +59.3 (6) | +14.8 | 8.1 |
| thorn_halo | 299 | 111 | 37.1% | 24.4% | 11 | -4.6 (72) | +4.0 (25) | +21.5 (11) | -2.3 | 8.5 |
| burl_wall | 336 | 120 | 35.7% | 23.5% | 1 | -6.5 (57) | +4.6 (42) | +59.3 (18) | +12.9 | 8.3 |
| twin_thorn | 281 | 76 | 27.0% | 28.8% | 2 | +0.3 (37) | -3.3 (29) | +42.7 (9) | +3.6 | 8.6 |
| seed_rain | 296 | 78 | 26.4% | 24.7% | 4 | +0.4 (41) | +23.8 (23) | +39.6 (11) | +10.4 | 8.4 |
| reaping_vine | 205 | 53 | 25.9% | 21.5% | 0 | -2.6 (28) | +9.3 (21) | +26.0 (4) | +5.9 | 8.4 |
| tendril_reach | 468 | 113 | 24.1% | 27.8% | 4 | +10.5 (58) | -2.1 (32) | +44.8 (16) | +16.5 | 8.3 |
| spore_haze | 464 | 111 | 23.9% | 25.6% | 2 | -5.1 (74) | +16.9 (22) | +39.6 (11) | +3.7 | 8.4 |
| quickening_sap | 177 | 39 | 22.0% | 15.8% | 0 | -11.0 (23) | +9.3 (12) | +1.0 (4) | -3.4 | 8.9 |
| blightcap | 427 | 88 | 20.6% | 25.5% | 0 | -6.2 (45) | -4.8 (26) | +40.3 (14) | +0.5 | 8.8 |
| patient_thorn | 266 | 45 | 16.9% | 30.8% | 0 | +1.9 (27) | -14.9 (11) | +26.0 (6) | +1.2 | 8.5 |
| deep_graft | 491 | 80 | 16.3% | 33.2% | 0 | +3.8 (36) | +24.1 (27) | +34.3 (12) | +19.0 | 8.3 |
| excise | 316 | 51 | 16.1% | 30.7% | 0 | -3.3 (29) | +18.9 (14) | +33.1 (7) | +9.8 | 8.5 |
| canopy_crush | 309 | 44 | 14.2% | 29.8% | 2 | +7.3 (16) | -4.0 (20) | +47.4 (7) | +7.3 | 8.6 |
| sap_shell | 472 | 60 | 12.7% | 31.8% | 0 | +0.2 (33) | +13.5 (16) | +30.5 (11) | +10.0 | 8.0 |
| humus_rite | 189 | 22 | 11.6% | 16.4% | 0 | -12.9 (9) | +12.4 (11) | +26.0 (2) | +4.9 | 8.9 |
| chitin_ram | 466 | 50 | 10.7% | 34.8% | 0 | +4.6 (21) | -6.4 (17) | +56.0 (10) | +12.8 | 8.4 |
| thornwhirl | 445 | 45 | 10.1% | 31.7% | 2 | +3.8 (36) | +26.0 (6) | +76.0 (3) | +11.9 | 8.1 |
| barb_flick | 464 | 45 | 9.7% | 34.1% | 0 | +7.6 (19) | +1.0 (16) | +36.0 (10) | +14.5 | 8.3 |
| thicket_crash | 319 | 24 | 7.5% | 32.9% | 0 | +6.8 (13) | +13.5 (8) | +76.0 (3) | +19.2 | 8.2 |
| prism_thorn | 309 | 23 | 7.4% | 33.3% | 1 | -5.8 (11) | -9.7 (7) | +56.0 (5) | +5.6 | 7.9 |
| hivestrike | 461 | 31 | 6.7% | 33.0% | 0 | -0.9 (13) | +20.4 (9) | +20.4 (9) | +14.1 | 8.8 |
| root_mesh | 447 | 28 | 6.3% | 35.3% | 0 | -7.3 (6) | +12.4 (11) | +36.0 (10) | +18.4 | 8.0 |
| windblown_seed | 449 | 21 | 4.7% | 32.1% | 0 | -4.0 (5) | +16.0 (10) | -7.3 (6) | +4.9 | 8.2 |
| grafting_cut | 479 | 21 | 4.4% | 33.4% | 0 | +4.6 (7) | -4.0 (5) | +42.7 (9) | +18.2 | 8.3 |
| fungal_aegis | 196 | 7 | 3.6% | 24.5% | 0 | -24.0 (3) | +42.7 (3) | +76.0 (1) | +19.3 | 8.6 |
| sap_drip | 435 | 13 | 3.0% | 32.6% | 0 | +76.0 (1) | +16.0 (5) | +47.4 (7) | +39.2 | 9.1 |
| spore_lash | 465 | 12 | 2.6% | 34.6% | 0 | +76.0 (1) | +26.0 (6) | +16.0 (5) | +27.1 | 7.5 |
| shear | 432 | 10 | 2.3% | 32.4% | 0 | – | +26.0 (4) | +42.7 (6) | +31.7 | 7.7 |
| pollen_sting | 274 | 6 | 2.2% | 36.5% | 0 | +1.0 (4) | -24.0 (1) | +76.0 (1) | +4.7 | 8.2 |
| verdant_tide | 198 | 3 | 1.5% | 25.3% | 0 | -24.0 (1) | -24.0 (1) | -24.0 (1) | -24.2 | 9.6 |
| mulch_maul | 473 | 6 | 1.3% | 34.9% | 0 | -24.0 (1) | -24.0 (1) | +76.0 (3) | +36.6 | 9.2 |
| sporeburst | 310 | 4 | 1.3% | 31.0% | 0 | – | +9.3 (3) | +76.0 (1) | +26.4 | 7.6 |
| canker_bite | 450 | 5 | 1.1% | 36.0% | 0 | – | +1.0 (4) | -24.0 (1) | -4.1 | 9.2 |
| mire_carapace | 489 | 5 | 1.0% | 33.1% | 0 | – | +9.3 (3) | -24.0 (2) | -4.1 | 7.7 |
| propagate | 324 | 0 | 0.0% | 34.3% | 0 | – | – | – | +0.0 | 0.0 |
| transplant | 224 | 0 | 0.0% | 24.1% | 0 | – | – | – | +0.0 | 0.0 |

### Relics

| relic | runs holding | win Δ (pts) |
| --- | --- | --- |
| ascendant_prism | 1 | +76.3 |
| gravity_loom | 36 | +58.0 |
| crown_fragment | 32 | +43.1 |
| stim_patch | 73 | +38.9 |
| elder_seed | 32 | +29.1 |
| tender_plating | 26 | +28.5 |
| binding_contract | 87 | +27.7 |
| seed_pouch | 84 | +24.5 |
| fracture_engine | 33 | +24.1 |
| pocket_star_chart | 51 | +23.1 |
| scrap_magnet | 81 | +22.9 |
| heartwood_ring | 42 | +21.9 |
| tally_stick | 83 | +21.8 |
| hollow_bough | 45 | +21.4 |
| dampener_coil | 81 | +21.2 |
| crystal_spine | 57 | +20.2 |
| bulwark_rivets | 80 | +20.1 |
| surveyor_ink | 86 | +20.1 |
| overwatch_drone | 44 | +19.8 |
| field_dressing | 81 | +19.6 |
| geode_heart | 76 | +19.0 |
| pollen_sac | 83 | +18.5 |
| nursery_tray | 27 | +18.4 |
| concussion_rig | 51 | +18.3 |
| compost_heap | 63 | +17.8 |
| void_compass | 51 | +16.0 |
| ghost_lantern | 116 | +15.7 |
| shard_writ | 27 | +14.3 |
| mycelial_net | 51 | +13.6 |
| shard_debt | 28 | +12.9 |
| stasis_engine | 46 | +12.7 |
| rot_censer | 47 | +11.9 |
| cracked_prism | 83 | +11.8 |
| vial_rack | 29 | +11.6 |
| shard_lens | 50 | +9.6 |
| grafting_knife | 38 | +8.7 |
| glass_spurs | 70 | +7.8 |
| wayfinder_needle | 33 | +7.1 |
| oracle_pebble | 37 | +6.5 |
| slow_temper | 42 | +5.3 |
| engine_tooth | 7 | +4.7 |
| hairline_saw | 43 | +4.6 |
| plague_bloom | 43 | +4.6 |
| shard_crucible | 38 | +2.7 |
| heartseed | 300 | +0.0 |
| exposed_core | 29 | -7.5 |
| cracked_hourglass | 97 | -27.9 |

Boss relic screens: skip rate 0.0%.


| boss relic | offered | picked | pick % |
| --- | --- | --- | --- |
| ghost_lantern | 116 | 116 | 100.0% |
| cracked_hourglass | 129 | 97 | 75.2% |
| binding_contract | 136 | 87 | 64.0% |
| stasis_engine | 142 | 46 | 32.4% |
| gravity_loom | 120 | 36 | 30.0% |
| exposed_core | 137 | 29 | 21.2% |
| tender_plating | 137 | 26 | 19.0% |
| ascendant_prism | 150 | 1 | 0.7% |
| wild_growth | 125 | 0 | 0.0% |
| star_atlas | 122 | 0 | 0.0% |

### Pacts and events

| pact | picked | win Δ (pts) |
| --- | --- | --- |
| pact_purse | 105 | -3.2 |
| pact_shards | 98 | -5.3 |
| pact_hardy | 97 | +8.7 |

| event | seen | option picks |
| --- | --- | --- |
| ev_quiet_bench | 103 | #0: 94, #1: 9 |
| ev_singing_geode | 50 | #1: 22, #2: 28 |
| ev_spore_choir | 43 | #0: 43 |
| ev_scavenger_drone | 42 | #0: 39, #2: 3 |
| ev_flickering_medpod | 35 | #0: 18, #1: 14, #2: 3 |
| ev_rigged_conveyor | 52 | #0: 43, #1: 9 |
| ev_lost_climber | 104 | #0: 17, #1: 86, #2: 1 |
| ev_wandering_artificer | 106 | #0: 24, #1: 82 |
| ev_immune_scan | 30 | #1: 24, #2: 6 |
| ev_void_lens | 23 | #2: 23 |
| ev_prism_garden | 27 | #1: 27 |
| ev_assembly_line | 53 | #0: 53 |
| ev_your_echo | 36 | #0: 36 |
| ev_crown_vault | 32 | #1: 32 |
| ev_memory_pool | 103 | #1: 103 |
| ev_oracle_terminal | 53 | #0: 37, #3: 16 |
| ev_hydroponic_bay | 45 | #0: 45 |
| ev_salvage_heap | 47 | #1: 14, #2: 33 |
| ev_smelter | 46 | #0: 2, #1: 34, #2: 10 |
| ev_engine_cult | 50 | #0: 7, #1: 43 |
| ev_drowned_shrine | 48 | #1: 2, #2: 46 |
| ev_tether_merchant | 24 | #0: 22, #3: 2 |

### Economy per act

| act | Shards earned | Shards spent | deck size (end of act) | gold earned | gold spent | removals shop/rest/event/other | upgrades |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 3.35 | 0.74 | 17.6 | 318 | 199 | 1.05 / 0.00 / 0.06 / 1.08 | 1.81 |
| 2 | 2.14 | 1.12 | 20.9 | 193 | 201 | 0.72 / 0.01 / 0.03 / 0.95 | 0.90 |
| 3 | 1.05 | 0.86 | 25.2 | 110 | 135 | 0.20 / 0.00 / 0.02 / 0.38 | 0.71 |

Shard target (GDD §4.5): 3–5 earned per act. Per-act averages are over all runs (runs that died earlier count 0 for later acts).

### Turns and damage per encounter vs ENEMIES §4.1

| encounter | act | room | fights | deaths | avg turns | expected phases | avg HP lost | expected lost | ratio |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| enc_a1_alpha | 1 | elite | 111 | 0 | 5.7 | 2–3 | 13.8 | 24 | 0.57 |
| enc_a1_dreadcap | 1 | elite | 115 | 0 | 6.0 | 5–5 | 5.0 | 20 | 0.25 |
| enc_a1_drone_pack | 1 | monster | 211 | 0 | 3.1 | 2–3 | 6.6 | 9 | 0.74 |
| enc_a1_drone_puff | 1 | monster | 300 | 0 | 2.4 | 1–2 | 0.3 | 2 | 0.14 |
| enc_a1_empress | 1 | boss | 102 | 0 | 8.2 | 11–11 | 8.9 | 39 | 0.23 |
| enc_a1_flitter_gnasher | 1 | monster | 196 | 0 | 3.0 | 2–3 | 6.7 | 15 | 0.45 |
| enc_a1_gnasher_pair | 1 | monster | 299 | 0 | 2.7 | 1–2 | 2.3 | 3 | 0.76 |
| enc_a1_mantis | 1 | monster | 207 | 1 | 3.4 | 2–2 | 4.3 | 9 | 0.48 |
| enc_a1_orchid | 1 | boss | 90 | 0 | 7.4 | 10–10 | 11.1 | 35 | 0.32 |
| enc_a1_ram | 1 | boss | 107 | 9 | 7.6 | 9–9 | 27.5 | 40 | 0.69 |
| enc_a1_spore_cluster | 1 | monster | 200 | 0 | 2.8 | 2–2 | 0.9 | 4 | 0.23 |
| enc_a1_thornback | 1 | monster | 300 | 0 | 4.2 | 2–2 | 6.8 | 11 | 0.62 |
| enc_a1_thornback_drone | 1 | monster | 215 | 0 | 4.1 | 3–3 | 13.2 | 12 | 1.10 |
| enc_a1_thornback_wisp | 1 | monster | 231 | 0 | 4.4 | 3–4 | 12.9 | 20 | 0.65 |
| enc_a1_titan | 1 | elite | 91 | 0 | 5.3 | 4–4 | 6.2 | 17 | 0.37 |
| enc_a1_vine_puff | 1 | monster | 219 | 0 | 4.8 | 4–4 | 4.9 | 17 | 0.29 |
| enc_event_spore_choir | 1 | event | 43 | 0 | 6.0 | – | 7.4 | – | – |
| enc_a2_acolyte_golem | 2 | monster | 184 | 10 | 4.6 | 5–5 | 8.9 | 14 | 0.63 |
| enc_a2_acolyte_pack | 2 | monster | 152 | 7 | 3.8 | 4–4 | 8.0 | 20 | 0.40 |
| enc_a2_anvil_hammer | 2 | elite | 33 | 3 | 5.3 | 5–6 | 13.2 | 28 | 0.47 |
| enc_a2_assembler | 2 | boss | 52 | 0 | 8.4 | 10–10 | 6.1 | 35 | 0.17 |
| enc_a2_auditor | 2 | elite | 38 | 1 | 4.8 | 4–4 | 4.0 | 15 | 0.26 |
| enc_a2_boiler | 2 | elite | 35 | 1 | 5.7 | 5–6 | 12.9 | 24 | 0.54 |
| enc_a2_drone_gnasher | 2 | monster | 199 | 0 | 3.2 | 2–2 | 10.5 | 10 | 1.05 |
| enc_a2_drone_riveter | 2 | monster | 164 | 19 | 3.6 | 3–4 | 11.8 | 18 | 0.66 |
| enc_a2_drone_trio | 2 | monster | 155 | 12 | 3.4 | 4–4 | 9.0 | 16 | 0.56 |
| enc_a2_furnace | 2 | boss | 59 | 2 | 9.4 | 11–11 | 21.3 | 38 | 0.56 |
| enc_a2_golem_riveter | 2 | monster | 154 | 23 | 4.7 | 5–5 | 13.3 | 24 | 0.55 |
| enc_a2_oracle_golem | 2 | monster | 155 | 25 | 4.7 | 5–5 | 15.5 | 20 | 0.78 |
| enc_a2_oracle_pack | 2 | monster | 182 | 34 | 3.3 | 4–4 | 19.2 | 20 | 0.96 |
| enc_a2_rivet_pair | 2 | monster | 178 | 1 | 3.0 | 1–2 | 10.2 | 4 | 2.56 ⚠ |
| enc_a2_riveter | 2 | monster | 203 | 0 | 3.5 | 2–2 | 7.7 | 5 | 1.54 ⚠ |
| enc_a2_trihammer | 2 | boss | 43 | 4 | 8.0 | 10–10 | 17.0 | 40 | 0.42 |
| enc_event_engine_cult | 2 | event | 43 | 0 | 4.7 | – | 4.9 | – | – |
| enc_a3_archivist | 3 | boss | 28 | 0 | 10.1 | 9–9 | 5.8 | 30 | 0.19 |
| enc_a3_cantor | 3 | monster | 79 | 0 | 3.5 | 2–2 | 3.7 | 6 | 0.61 |
| enc_a3_event_horizon | 3 | elite | 19 | 5 | 4.9 | 4–4 | 33.6 | 36 | 0.93 |
| enc_a3_fever_pack | 3 | monster | 89 | 20 | 3.1 | 3–3 | 13.8 | 15 | 0.92 |
| enc_a3_geometer | 3 | monster | 91 | 9 | 4.0 | 3–3 | 12.9 | 18 | 0.72 |
| enc_a3_leukarch | 3 | boss | 33 | 4 | 10.9 | 10–10 | 19.8 | 37 | 0.53 |
| enc_a3_mirror_knight | 3 | elite | 28 | 0 | 5.1 | 3–3 | 12.4 | 15 | 0.83 |
| enc_a3_mote_pair | 3 | monster | 97 | 0 | 2.6 | 1–1 | 11.2 | 3 | 3.72 ⚠ |
| enc_a3_phage_mother | 3 | elite | 14 | 0 | 5.0 | 3–4 | 5.6 | 18 | 0.31 |
| enc_a3_prism_motes | 3 | monster | 74 | 11 | 3.4 | 3–3 | 14.4 | 12 | 1.20 |
| enc_a3_seer | 3 | monster | 94 | 0 | 2.6 | 1–1 | 3.0 | 2 | 1.51 ⚠ |
| enc_a3_shard_mote | 3 | monster | 105 | 3 | 2.9 | 1–2 | 18.6 | 5 | 3.72 ⚠ |
| enc_a3_sovereign | 3 | boss | 20 | 5 | 10.4 | 10–10 | 28.2 | 58 | 0.49 |
| enc_a3_warden_cantor | 3 | monster | 78 | 1 | 4.7 | 4–4 | 7.7 | 18 | 0.43 |
| enc_a3_warden_geometer | 3 | monster | 76 | 10 | 4.9 | 5–5 | 16.9 | 25 | 0.68 |
| enc_a3_warden_shard | 3 | monster | 81 | 8 | 3.3 | 3–3 | 6.0 | 12 | 0.50 |
| enc_event_antibodies | 3 | event | 24 | 0 | 2.3 | – | 10.3 | – | – |
| enc_event_echo | 3 | event | 36 | 0 | 4.1 | – | 9.6 | – | – |

### Mechanic telemetry

| metric | value |
| --- | --- |
| Onslaught at Attack play (mean) | 0.00 |
| Onslaught distribution | 0: 100% |
| Riposte: primed / triggers / fizzles / attack cancels | 487 / 24 / 12 / 56 |
| Riposte triggers per primed card · fizzle rate | 0.05 · 2.5% |
| Guard share of damage prevented (Block+Guard) | 2.8% |
| Guard absorbed / Block absorbed / HP lost to hits | 3578 / 123616 / 56975 |
| Bloom at end: max · total · Bloom cards (per run) | 9.16 · 35.39 · 6.55 |
| Prunes per combat | 1.29 |
| Rot's share of damage dealt | 30.2% |
| Beats per turn (on-beat plays / player turns) | 0.62 |
| Timeline resolutions per combat (added / resolved) | 0.00 (19 / 19) |
| Exposed bonus damage per combat | 0.30 |
| Stagger damage prevented per combat (upper bound) | 2.71 |
| Potions used per run | 7.82 |

### Cap hits

Cap hits per player turn: 46.90% (healthy < 1%).


| cap | hits |
| --- | --- |
| cap_stacks | 11380 |
| cap_hand | 596 |
| cap_prune_away | 4 |

## chronist

| runs | win | stalemates | reach A1 boss | beat A1 boss | reach A2 boss | beat A2 boss | reach A3 boss | deaths A1/A2/A3 | actions (wins) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 300 | 27.3% | 0 | 96.0% | 93.0% | 47.3% | 47.0% | 27.7% | 10% / 63% / 27% | 508 (794) |

GDD §8.4 bot targets: win 25–35%, reach A1 boss ≥ 90%, beat A1 boss ≥ 75%, beat A2 boss ≥ 50%, death share by act ≈ 30/40/30.

### Death heatmap (encounter × act)

| encounter | act | deaths | share of deaths | fights | death rate per fight |
| --- | --- | --- | --- | --- | --- |
| enc_a2_oracle_pack | 2 | 32 | 14.7% | 154 | 20.8% |
| enc_a2_drone_riveter | 2 | 28 | 12.8% | 167 | 16.8% |
| enc_a2_oracle_golem | 2 | 25 | 11.5% | 162 | 15.4% |
| enc_a2_golem_riveter | 2 | 22 | 10.1% | 156 | 14.1% |
| enc_a3_fever_pack | 3 | 20 | 9.2% | 86 | 23.3% |
| enc_a3_prism_motes | 3 | 13 | 6.0% | 71 | 18.3% |
| enc_a2_drone_trio | 2 | 12 | 5.5% | 130 | 9.2% |
| enc_a2_acolyte_pack | 2 | 9 | 4.1% | 161 | 5.6% |
| enc_a3_warden_geometer | 3 | 7 | 3.2% | 81 | 8.6% |
| enc_a1_ram | 1 | 7 | 3.2% | 79 | 8.9% |
| enc_a2_acolyte_golem | 2 | 6 | 2.8% | 139 | 4.3% |
| enc_a3_geometer | 3 | 5 | 2.3% | 70 | 7.1% |
| enc_a3_warden_shard | 3 | 4 | 1.8% | 68 | 5.9% |
| enc_a3_event_horizon | 3 | 4 | 1.8% | 27 | 14.8% |
| enc_a1_flitter_gnasher | 1 | 3 | 1.4% | 215 | 1.4% |
| enc_a1_thornback_drone | 1 | 3 | 1.4% | 209 | 1.4% |
| enc_a3_shard_mote | 3 | 2 | 0.9% | 85 | 2.4% |
| enc_a1_drone_pack | 1 | 2 | 0.9% | 206 | 1.0% |
| enc_a3_mote_pair | 3 | 2 | 0.9% | 98 | 2.0% |
| enc_a2_anvil_hammer | 2 | 2 | 0.9% | 42 | 4.8% |
| enc_a1_alpha | 1 | 2 | 0.9% | 111 | 1.8% |
| enc_a1_empress | 1 | 1 | 0.5% | 132 | 0.8% |
| enc_a1_thornback_wisp | 1 | 1 | 0.5% | 211 | 0.5% |
| enc_a2_furnace | 2 | 1 | 0.5% | 46 | 2.2% |
| enc_a3_mirror_knight | 3 | 1 | 0.5% | 30 | 3.3% |
| enc_event_spore_choir | 1 | 1 | 0.5% | 50 | 2.0% |
| enc_a2_boiler | 2 | 1 | 0.5% | 43 | 2.3% |
| enc_a3_sovereign | 3 | 1 | 0.5% | 34 | 2.9% |
| enc_a1_orchid | 1 | 1 | 0.5% | 77 | 1.3% |

### HP at boss entry

| act | boss fights | avg HP | avg HP % |
| --- | --- | --- | --- |
| 1 | 288 | 53.5 | 77.8% |
| 2 | 142 | 50.6 | 73.2% |
| 3 | 83 | 53.0 | 76.6% |

### Floor of death

```
F05    1 █
F06    1 █
F07    1 █
F08    1 █
F10    1 █
F11    1 █
F12    2 ███
F13    2 ███
F14    2 ███
F16    9 █████████████
F19    8 ███████████
F20   15 █████████████████████
F21   26 █████████████████████████████████████
F22   28 ████████████████████████████████████████
F23   17 ████████████████████████
F24   15 █████████████████████
F26    7 ██████████
F27    5 ███████
F28    6 █████████
F29    3 ████
F30    7 ██████████
F32    1 █
F34    3 ████
F35    4 ██████
F36    9 █████████████
F37   12 █████████████████
F38    5 ███████
F39    4 ██████
F40    6 █████████
F42    3 ████
F43    4 ██████
F44    3 ████
F45    3 ████
F46    2 ███
F48    1 █
```

### Card rewards

5644 reward screens, skip rate 27.0%. Δwin = win rate of runs that picked the card in that act minus the class win rate (n = runs). Deck Δ = runs ending with it in the deck vs without.


| card | offered | picked | pick % | on skipped screens | bought | Δwin A1 | Δwin A2 | Δwin A3 | deck Δwin | dmg/combat with |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| toll_the_hours | 221 | 192 | 86.9% | 0.9% | 2 | -3.0 (119) | +24.7 (50) | +53.9 (16) | +11.7 | 7.1 |
| tide_table | 339 | 293 | 86.4% | 6.5% | 44 | -3.1 (132) | +9.0 (88) | +49.6 (26) | +12.6 | 6.9 |
| zenith | 189 | 157 | 83.1% | 2.1% | 1 | +1.4 (87) | +13.5 (49) | +65.0 (13) | +16.5 | 6.8 |
| banked_hours | 290 | 222 | 76.6% | 6.2% | 11 | +0.2 (98) | +5.6 (79) | +47.7 (24) | +13.3 | 6.9 |
| syzygy | 194 | 138 | 71.1% | 0.5% | 1 | -8.4 (74) | +27.6 (51) | +44.1 (7) | +10.2 | 7.0 |
| appointed_hour | 306 | 216 | 70.6% | 7.8% | 9 | -0.3 (111) | +7.1 (58) | +48.7 (25) | +14.7 | 6.9 |
| heave_to | 319 | 224 | 70.2% | 9.7% | 13 | +5.0 (99) | +7.3 (75) | +51.2 (28) | +19.1 | 6.8 |
| tourbillon | 190 | 124 | 65.3% | 2.1% | 0 | +0.2 (69) | +23.8 (43) | +12.7 (5) | +9.7 | 6.6 |
| escapement | 318 | 201 | 63.2% | 12.9% | 30 | -2.1 (107) | +16.0 (60) | +35.2 (16) | +10.1 | 6.9 |
| lighthouse | 208 | 129 | 62.0% | 3.8% | 0 | +11.0 (73) | +21.6 (45) | +61.6 (9) | +25.7 | 6.6 |
| breakwater | 297 | 157 | 52.9% | 15.2% | 6 | +6.5 (71) | +16.5 (57) | +47.7 (20) | +22.2 | 6.8 |
| second_hand | 300 | 157 | 52.3% | 16.3% | 4 | +4.6 (94) | +13.1 (42) | +36.3 (11) | +16.7 | 6.7 |
| knell | 310 | 154 | 49.7% | 18.1% | 4 | -2.8 (106) | +4.9 (31) | +72.7 (7) | +4.9 | 7.1 |
| striking_train | 280 | 137 | 48.9% | 22.1% | 11 | -6.2 (85) | +15.5 (35) | +58.4 (7) | +6.3 | 6.8 |
| storm_warning | 298 | 111 | 37.2% | 22.5% | 7 | +6.5 (74) | +28.7 (25) | +56.0 (6) | +25.7 | 6.4 |
| spring_tide | 448 | 155 | 34.6% | 27.2% | 8 | -2.6 (113) | +8.7 (25) | +52.7 (5) | +1.7 | 7.2 |
| weather_eye | 393 | 134 | 34.1% | 22.4% | 7 | +1.4 (80) | +10.9 (34) | +39.3 (15) | +13.9 | 6.5 |
| almanac | 396 | 127 | 32.1% | 24.7% | 3 | +1.1 (81) | +20.8 (27) | +62.7 (10) | +14.8 | 6.5 |
| storm_glass | 393 | 122 | 31.0% | 22.6% | 4 | -1.5 (58) | -1.1 (42) | +41.9 (13) | +7.1 | 7.0 |
| seen_it_coming | 195 | 58 | 29.7% | 10.3% | 0 | +14.0 (29) | +16.7 (25) | +22.7 (4) | +18.2 | 6.7 |
| portents | 202 | 56 | 27.7% | 6.4% | 0 | -14.8 (32) | +13.8 (17) | +58.4 (7) | +4.4 | 6.9 |
| watch_bell | 175 | 46 | 26.3% | 17.7% | 0 | +10.2 (24) | +11.6 (18) | +22.7 (4) | +14.9 | 6.7 |
| carillon | 401 | 85 | 21.2% | 28.9% | 5 | +1.4 (73) | +15.5 (7) | +72.7 (2) | +3.6 | 6.7 |
| culmination | 173 | 29 | 16.8% | 17.3% | 0 | +11.6 (18) | +22.7 (8) | +72.7 (3) | +25.0 | 6.3 |
| noon_gun | 465 | 76 | 16.3% | 32.3% | 0 | +5.3 (49) | +0.4 (18) | +29.8 (7) | +9.8 | 7.0 |
| ephemeris | 436 | 71 | 16.3% | 33.7% | 2 | -11.6 (51) | +14.3 (12) | +56.0 (6) | -3.5 | 6.9 |
| sweep_hand | 301 | 44 | 14.6% | 37.2% | 0 | +1.2 (35) | +60.2 (8) | +72.7 (1) | +13.2 | 6.5 |
| quarter_chime | 314 | 45 | 14.3% | 33.4% | 2 | -21.1 (16) | +6.0 (21) | +60.2 (8) | +8.0 | 6.6 |
| mark_the_lull | 306 | 39 | 12.7% | 31.0% | 1 | +6.0 (30) | +12.7 (5) | +6.0 (3) | +7.9 | 6.8 |
| balance_wheel | 459 | 56 | 12.2% | 33.6% | 0 | +22.7 (24) | +4.2 (19) | +54.5 (11) | +24.8 | 6.4 |
| slack_water | 467 | 50 | 10.7% | 34.5% | 0 | -2.3 (32) | +12.7 (10) | +44.1 (7) | +9.6 | 6.7 |
| gear_train | 459 | 39 | 8.5% | 36.8% | 0 | +17.1 (27) | +17.1 (9) | +39.3 (3) | +24.3 | 6.5 |
| glance_ahead | 261 | 22 | 8.4% | 36.4% | 0 | +10.2 (16) | +12.7 (5) | +72.7 (1) | +12.8 | 6.4 |
| mainspring | 298 | 24 | 8.1% | 33.2% | 0 | +29.8 (7) | +22.7 (14) | +72.7 (3) | +31.3 | 6.0 |
| hasten | 273 | 22 | 8.1% | 35.9% | 0 | +22.7 (2) | +15.5 (14) | +56.0 (6) | +29.4 | 6.5 |
| pinion_jab | 436 | 32 | 7.3% | 37.8% | 2 | +18.8 (26) | -27.3 (1) | +52.7 (5) | +20.4 | 6.5 |
| turn_the_tide | 303 | 21 | 6.9% | 33.7% | 0 | +17.1 (9) | -5.1 (9) | +6.0 (3) | +9.7 | 6.8 |
| upbeat | 441 | 26 | 5.9% | 37.0% | 0 | -9.2 (11) | +22.7 (10) | +52.7 (5) | +16.4 | 7.0 |
| fermata | 304 | 18 | 5.9% | 39.1% | 0 | -0.1 (11) | +39.3 (3) | +6.0 (3) | +8.4 | 6.1 |
| afterpeal | 462 | 26 | 5.6% | 33.5% | 0 | +6.0 (12) | +39.3 (9) | +72.7 (5) | +29.0 | 6.5 |
| confluence | 308 | 15 | 4.9% | 39.3% | 0 | +1.2 (7) | +29.8 (7) | +72.7 (1) | +20.4 | 6.8 |
| polyrhythm | 194 | 9 | 4.6% | 19.1% | 0 | -7.3 (5) | -27.3 (1) | +39.3 (3) | +6.2 | 6.5 |
| dead_reckoning | 451 | 11 | 2.4% | 37.0% | 0 | -27.3 (1) | +22.7 (8) | +72.7 (2) | +28.2 | 6.2 |
| parallax | 428 | 10 | 2.3% | 38.1% | 0 | -2.3 (4) | +22.7 (6) | – | +13.1 | 7.2 |
| star_tithe | 185 | 4 | 2.2% | 21.1% | 0 | -27.3 (1) | -27.3 (3) | – | -27.7 | 7.7 |
| logbook | 420 | 9 | 2.1% | 39.0% | 0 | -2.3 (4) | +72.7 (1) | +22.7 (4) | +17.6 | 7.4 |
| batten_down | 284 | 6 | 2.1% | 42.3% | 0 | +22.7 (4) | – | +72.7 (2) | +40.1 | 5.6 |
| wind_forward | 402 | 8 | 2.0% | 34.6% | 0 | -27.3 (1) | -27.3 (2) | +52.7 (5) | +23.3 | 6.9 |
| detent | 441 | 7 | 1.6% | 36.1% | 0 | -27.3 (2) | -27.3 (1) | +72.7 (4) | +30.5 | 5.8 |
| downbeat | 485 | 5 | 1.0% | 37.3% | 0 | +72.7 (1) | +72.7 (2) | +72.7 (2) | +73.9 | 5.6 |
| perpetual_motion | 167 | 1 | 0.6% | 24.6% | 0 | -27.3 (1) | – | – | -27.4 | 7.6 |
| reef_the_sails | 452 | 0 | 0.0% | 36.9% | 0 | – | – | – | -27.4 | 7.8 |

### Relics

| relic | runs holding | win Δ (pts) |
| --- | --- | --- |
| crown_fragment | 32 | +53.4 |
| paradox_coil | 36 | +38.4 |
| tender_plating | 19 | +38.2 |
| timeline_spool | 61 | +37.7 |
| geode_heart | 75 | +36.4 |
| wayfinder_needle | 59 | +35.6 |
| star_pip | 73 | +34.5 |
| tuning_fork | 77 | +33.1 |
| glass_spurs | 75 | +32.9 |
| ghost_lantern | 104 | +31.8 |
| stim_patch | 73 | +29.1 |
| shard_writ | 26 | +29.0 |
| void_compass | 30 | +28.9 |
| metronome_heart | 34 | +28.9 |
| stasis_engine | 56 | +27.9 |
| fixed_star | 54 | +27.6 |
| shard_lens | 63 | +25.7 |
| overwatch_drone | 63 | +25.7 |
| sandglass_bead | 73 | +25.4 |
| scrap_magnet | 80 | +24.1 |
| prophet_glass | 35 | +24.0 |
| cracked_prism | 83 | +23.8 |
| fracture_engine | 31 | +23.5 |
| concussion_rig | 59 | +22.9 |
| bulwark_rivets | 82 | +22.8 |
| seers_veil | 57 | +22.6 |
| shard_crucible | 25 | +22.5 |
| timeline_clamp | 25 | +22.5 |
| tally_stick | 74 | +21.1 |
| binding_contract | 64 | +20.9 |
| dampener_coil | 94 | +20.6 |
| field_dressing | 85 | +19.3 |
| gravity_loom | 25 | +18.2 |
| hairline_saw | 60 | +17.9 |
| slow_temper | 55 | +17.7 |
| offbeat_drum | 54 | +16.4 |
| crystal_spine | 65 | +14.2 |
| vial_rack | 31 | +12.7 |
| surveyor_ink | 82 | +7.7 |
| shard_debt | 27 | +2.5 |
| chrono_lens | 300 | +0.0 |
| engine_tooth | 8 | -2.4 |
| exposed_core | 20 | -2.5 |
| cracked_hourglass | 78 | -31.7 |

Boss relic screens: skip rate 0.0%.


| boss relic | offered | picked | pick % |
| --- | --- | --- | --- |
| ghost_lantern | 111 | 104 | 93.7% |
| cracked_hourglass | 160 | 78 | 48.8% |
| binding_contract | 116 | 64 | 55.2% |
| stasis_engine | 136 | 56 | 41.2% |
| fixed_star | 134 | 54 | 40.3% |
| gravity_loom | 168 | 25 | 14.9% |
| exposed_core | 165 | 20 | 12.1% |
| tender_plating | 126 | 19 | 15.1% |
| ascendant_prism | 144 | 0 | 0.0% |

### Pacts and events

| pact | picked | win Δ (pts) |
| --- | --- | --- |
| pact_hardy | 107 | +5.5 |
| pact_shards | 98 | +3.4 |
| pact_purse | 95 | -9.2 |

| event | seen | option picks |
| --- | --- | --- |
| ev_spore_choir | 50 | #0: 50 |
| ev_wandering_artificer | 96 | #0: 14, #1: 82 |
| ev_immune_scan | 23 | #1: 21, #2: 2 |
| ev_drowned_shrine | 57 | #1: 3, #2: 54 |
| ev_lost_climber | 92 | #0: 11, #1: 78, #2: 3 |
| ev_singing_geode | 52 | #1: 25, #2: 27 |
| ev_oracle_terminal | 50 | #3: 50 |
| ev_smelter | 49 | #1: 37, #2: 12 |
| ev_quiet_bench | 105 | #0: 96, #1: 9 |
| ev_assembly_line | 58 | #0: 58 |
| ev_void_lens | 41 | #2: 41 |
| ev_crown_vault | 32 | #1: 32 |
| ev_scavenger_drone | 50 | #0: 48, #2: 2 |
| ev_memory_pool | 94 | #0: 1, #1: 93 |
| ev_flickering_medpod | 37 | #0: 15, #1: 21, #2: 1 |
| ev_your_echo | 25 | #0: 25 |
| ev_prism_garden | 37 | #1: 37 |
| ev_salvage_heap | 50 | #1: 15, #2: 35 |
| ev_tether_merchant | 22 | #0: 22 |
| ev_hydroponic_bay | 41 | #0: 41 |
| ev_engine_cult | 51 | #0: 8, #1: 43 |
| ev_rigged_conveyor | 44 | #0: 41, #1: 3 |

### Economy per act

| act | Shards earned | Shards spent | deck size (end of act) | gold earned | gold spent | removals shop/rest/event/other | upgrades |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 3.08 | 0.55 | 18.8 | 312 | 183 | 0.98 / 0.00 / 0.03 / 0.00 | 1.54 |
| 2 | 2.30 | 0.79 | 22.8 | 184 | 197 | 0.84 / 0.01 / 0.01 / 0.01 | 1.07 |
| 3 | 1.26 | 0.77 | 26.8 | 115 | 131 | 0.42 / 0.00 / 0.01 / 0.00 | 0.66 |

Shard target (GDD §4.5): 3–5 earned per act. Per-act averages are over all runs (runs that died earlier count 0 for later acts).

### Turns and damage per encounter vs ENEMIES §4.1

| encounter | act | room | fights | deaths | avg turns | expected phases | avg HP lost | expected lost | ratio |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| enc_a1_alpha | 1 | elite | 111 | 2 | 5.4 | 2–3 | 11.5 | 24 | 0.48 |
| enc_a1_dreadcap | 1 | elite | 99 | 0 | 6.8 | 5–5 | 6.7 | 20 | 0.34 |
| enc_a1_drone_pack | 1 | monster | 206 | 2 | 3.3 | 2–3 | 7.6 | 9 | 0.84 |
| enc_a1_drone_puff | 1 | monster | 301 | 0 | 2.2 | 1–2 | 0.1 | 2 | 0.06 |
| enc_a1_empress | 1 | boss | 132 | 1 | 9.8 | 11–11 | 7.0 | 39 | 0.18 |
| enc_a1_flitter_gnasher | 1 | monster | 215 | 3 | 3.0 | 2–3 | 7.4 | 15 | 0.49 |
| enc_a1_gnasher_pair | 1 | monster | 299 | 0 | 2.4 | 1–2 | 2.4 | 3 | 0.80 |
| enc_a1_mantis | 1 | monster | 229 | 0 | 3.4 | 2–2 | 3.5 | 9 | 0.39 |
| enc_a1_orchid | 1 | boss | 77 | 1 | 7.9 | 10–10 | 6.2 | 35 | 0.18 |
| enc_a1_ram | 1 | boss | 79 | 7 | 7.9 | 9–9 | 18.2 | 40 | 0.46 |
| enc_a1_spore_cluster | 1 | monster | 185 | 0 | 3.4 | 2–2 | 1.3 | 4 | 0.33 |
| enc_a1_thornback | 1 | monster | 300 | 0 | 3.8 | 2–2 | 6.4 | 11 | 0.58 |
| enc_a1_thornback_drone | 1 | monster | 209 | 3 | 4.0 | 3–3 | 12.2 | 12 | 1.02 |
| enc_a1_thornback_wisp | 1 | monster | 211 | 1 | 4.4 | 3–4 | 10.2 | 20 | 0.51 |
| enc_a1_titan | 1 | elite | 93 | 0 | 4.7 | 4–4 | 4.0 | 17 | 0.24 |
| enc_a1_vine_puff | 1 | monster | 209 | 0 | 5.3 | 4–4 | 5.4 | 17 | 0.32 |
| enc_event_spore_choir | 1 | event | 50 | 1 | 6.5 | – | 7.7 | – | – |
| enc_a2_acolyte_golem | 2 | monster | 139 | 6 | 5.6 | 5–5 | 7.2 | 14 | 0.51 |
| enc_a2_acolyte_pack | 2 | monster | 161 | 9 | 4.6 | 4–4 | 7.7 | 20 | 0.39 |
| enc_a2_anvil_hammer | 2 | elite | 42 | 2 | 6.7 | 5–6 | 9.5 | 28 | 0.34 |
| enc_a2_assembler | 2 | boss | 60 | 0 | 8.5 | 10–10 | 1.6 | 35 | 0.05 |
| enc_a2_auditor | 2 | elite | 33 | 0 | 5.6 | 4–4 | 1.4 | 15 | 0.09 |
| enc_a2_boiler | 2 | elite | 43 | 1 | 5.7 | 5–6 | 5.7 | 24 | 0.24 |
| enc_a2_drone_gnasher | 2 | monster | 178 | 0 | 3.8 | 2–2 | 10.1 | 10 | 1.01 |
| enc_a2_drone_riveter | 2 | monster | 167 | 28 | 4.3 | 3–4 | 12.5 | 18 | 0.69 |
| enc_a2_drone_trio | 2 | monster | 130 | 12 | 4.1 | 4–4 | 7.6 | 16 | 0.48 |
| enc_a2_furnace | 2 | boss | 46 | 1 | 11.0 | 11–11 | 11.2 | 38 | 0.29 |
| enc_a2_golem_riveter | 2 | monster | 156 | 22 | 5.8 | 5–5 | 12.9 | 24 | 0.54 |
| enc_a2_oracle_golem | 2 | monster | 162 | 25 | 5.8 | 5–5 | 12.4 | 20 | 0.62 |
| enc_a2_oracle_pack | 2 | monster | 154 | 32 | 4.1 | 4–4 | 16.5 | 20 | 0.82 |
| enc_a2_rivet_pair | 2 | monster | 182 | 0 | 3.6 | 1–2 | 10.0 | 4 | 2.50 ⚠ |
| enc_a2_riveter | 2 | monster | 198 | 0 | 3.8 | 2–2 | 5.6 | 5 | 1.12 |
| enc_a2_trihammer | 2 | boss | 36 | 0 | 8.9 | 10–10 | 10.7 | 40 | 0.27 |
| enc_event_engine_cult | 2 | event | 43 | 0 | 5.8 | – | 2.2 | – | – |
| enc_a3_archivist | 3 | boss | 26 | 0 | 9.8 | 9–9 | 0.6 | 30 | 0.02 |
| enc_a3_cantor | 3 | monster | 72 | 0 | 4.1 | 2–2 | 1.8 | 6 | 0.30 |
| enc_a3_event_horizon | 3 | elite | 27 | 4 | 5.5 | 4–4 | 27.6 | 36 | 0.77 |
| enc_a3_fever_pack | 3 | monster | 86 | 20 | 3.7 | 3–3 | 12.7 | 15 | 0.85 |
| enc_a3_geometer | 3 | monster | 70 | 5 | 4.6 | 3–3 | 7.0 | 18 | 0.39 |
| enc_a3_leukarch | 3 | boss | 23 | 0 | 10.0 | 10–10 | 1.5 | 37 | 0.04 |
| enc_a3_mirror_knight | 3 | elite | 30 | 1 | 5.0 | 3–3 | 9.4 | 15 | 0.62 |
| enc_a3_mote_pair | 3 | monster | 98 | 2 | 3.6 | 1–1 | 10.9 | 3 | 3.65 ⚠ |
| enc_a3_phage_mother | 3 | elite | 19 | 0 | 5.1 | 3–4 | 2.0 | 18 | 0.11 |
| enc_a3_prism_motes | 3 | monster | 71 | 13 | 4.0 | 3–3 | 11.5 | 12 | 0.96 |
| enc_a3_seer | 3 | monster | 99 | 0 | 3.3 | 1–1 | 2.3 | 2 | 1.16 |
| enc_a3_shard_mote | 3 | monster | 85 | 2 | 3.8 | 1–2 | 19.2 | 5 | 3.83 ⚠ |
| enc_a3_sovereign | 3 | boss | 34 | 1 | 10.5 | 10–10 | 8.3 | 58 | 0.14 |
| enc_a3_warden_cantor | 3 | monster | 74 | 0 | 5.7 | 4–4 | 3.1 | 18 | 0.17 |
| enc_a3_warden_geometer | 3 | monster | 81 | 7 | 6.8 | 5–5 | 9.8 | 25 | 0.39 |
| enc_a3_warden_shard | 3 | monster | 68 | 4 | 4.1 | 3–3 | 7.1 | 12 | 0.59 |
| enc_event_antibodies | 3 | event | 21 | 0 | 4.0 | – | 7.7 | – | – |
| enc_event_echo | 3 | event | 25 | 0 | 4.2 | – | 5.9 | – | – |

### Mechanic telemetry

| metric | value |
| --- | --- |
| Onslaught at Attack play (mean) | 0.00 |
| Onslaught distribution | 0: 100% |
| Riposte: primed / triggers / fizzles / attack cancels | 1347 / 8 / 3 / 41 |
| Riposte triggers per primed card · fizzle rate | 0.01 · 0.2% |
| Guard share of damage prevented (Block+Guard) | 18.7% |
| Guard absorbed / Block absorbed / HP lost to hits | 28376 / 123045 / 45341 |
| Bloom at end: max · total · Bloom cards (per run) | 0.00 · 0.00 · 0.00 |
| Prunes per combat | 0.00 |
| Rot's share of damage dealt | 1.6% |
| Beats per turn (on-beat plays / player turns) | 0.79 |
| Timeline resolutions per combat (added / resolved) | 3.81 (25996 / 22630) |
| Exposed bonus damage per combat | 3.32 |
| Stagger damage prevented per combat (upper bound) | 4.75 |
| Potions used per run | 7.41 |

### Cap hits

Cap hits per player turn: 7.00% (healthy < 1%).


| cap | hits |
| --- | --- |
| cap_hand | 1590 |
| cap_stacks | 159 |
| cap_draw | 107 |
| cap_advance | 24 |
| cap_bonus_energy | 7 |
