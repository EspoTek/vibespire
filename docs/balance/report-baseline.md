# Balance report: baseline

Generated 2026-10-29 by `sim/report.ts` from `sim/out/baseline-breaker.json`, `sim/out/baseline-graft.json`, `sim/out/baseline-chronist.json`.

Policy greedy, real content, 300 seeds per class (sim-0..299). Chronist: 299 runs; seed sim-137-chronist was excluded because it crashes the engine (paradox_coil: 'card 26 is not in the discard pile or Scrapheap', src/content/relics.ts:215) and aborts `sim/batch.ts`; its aggregate was built from per-seed runOne results (sim time not recorded). Stalemates (a combat over 100 turns) count as losses and are listed separately.

| class | policy | content | runs | seed prefix | overrides | sim time |
| --- | --- | --- | --- | --- | --- | --- |
| breaker | greedy | real | 300 | sim | none | 45.6 s |
| graft | greedy | real | 300 | sim | none | 11.4 s |
| chronist | greedy | real | 299 | sim | none | 0.0 s |

## Summary

| class | win rate | stalemates | reach A1 boss | beat A1 boss | beat A2 boss | HP at A1 boss | skip rate | Shards earned A1/A2/A3 | deck size A1/A2/A3 | cap hits / turn |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| breaker | 4.7% | 0 | 73.3% | 58.0% | 11.0% | 75.0% | 20.5% | 3.0 / 0.9 / 0.2 | 18 / 21 / 27 | 2.70% |
| graft | 0.0% | 0 | 33.3% | 16.7% | 0.0% | 61.3% | 14.0% | 2.0 / 0.1 / 0.0 | 16 / 19 / 0 | 5.80% |
| chronist | 0.0% | 0 | 47.2% | 35.5% | 2.3% | 66.5% | 22.3% | 2.7 / 0.4 / 0.0 | 16 / 20 / 24 | 0.60% |

Win-rate spread between classes: 4.7% (target ≤ 8%).

## Suspects

Cards with a pick rate in the bottom or top 5% of their class (offered ≥ max(10, 1% of screens)), relics with |win Δ| > 10 points (held in ≥ 5% of runs), encounters whose HP lost exceeds ENEMIES §4.1 by > 30% (≥ 10 fights), missed GDD §8.4 milestones, and stalemates (a combat over the turn limit, counted as a loss), and cap-hit rates over 1% of turns. Ranked by severity. Relic and card win deltas carry survivorship bias: runs that live longer collect more relics and cards, so with a low win rate most positive deltas mean "held by runs that got far". Compare them with each other, not with zero.


| class | kind | id | why |
| --- | --- | --- | --- |
| graft | cap | `cap_hits` | caps hit in 5.80% of turns (target < 1%): cap_stacks 548, cap_hand 2 |
| graft | encounter | `enc_a2_rivet_pair` | HP lost 20.3 vs expected 4 (×5.09; 35 fights, 3 deaths) |
| breaker | encounter | `enc_a3_shard_mote` | HP lost 22.5 vs expected 5 (×4.50; 23 fights, 3 deaths) |
| chronist | encounter | `enc_a2_rivet_pair` | HP lost 18.3 vs expected 4 (×4.56; 79 fights, 5 deaths) |
| breaker | encounter | `enc_a3_mote_pair` | HP lost 13.8 vs expected 3 (×4.60; 24 fights, 0 deaths) |
| breaker | relic | `kept_fury` | win Δ +25.7 pts (21 runs) |
| chronist | encounter | `enc_a1_dreadcap` | HP lost 34.8 vs expected 20 (×1.74; 54 fights, 29 deaths) |
| breaker | encounter | `enc_a1_dreadcap` | HP lost 43.9 vs expected 20 (×2.19; 85 fights, 37 deaths) |
| breaker | cap | `cap_hits` | caps hit in 2.70% of turns (target < 1%): cap_hand 311, cap_stacks 204, cap_to_hand 50 |
| breaker | relic | `binding_contract` | win Δ +20.6 pts (40 runs) |
| graft | encounter | `enc_a1_alpha` | HP lost 33.3 vs expected 24 (×1.39; 45 fights, 24 deaths) |
| breaker | milestone | `reach_a1_boss` | 73.3% reach the act 1 boss (target ≥ 90%) |
| graft | milestone | `reach_a1_boss` | 33.3% reach the act 1 boss (target ≥ 90%) |
| chronist | milestone | `reach_a1_boss` | 47.2% reach the act 1 boss (target ≥ 90%) |
| graft | encounter | `enc_a2_riveter` | HP lost 17.2 vs expected 5 (×3.45; 39 fights, 4 deaths) |
| breaker | relic | `chain_wraps` | win Δ +18.2 pts (39 runs) |
| breaker | encounter | `enc_a2_rivet_pair` | HP lost 14.7 vs expected 4 (×3.67; 122 fights, 3 deaths) |
| breaker | relic | `parry_charm` | win Δ +17.7 pts (29 runs) |
| breaker | relic | `stormbreak_gem` | win Δ +16.7 pts (25 runs) |
| breaker | relic | `overwatch_drone` | win Δ +16.7 pts (25 runs) |
| breaker | relic | `hairline_saw` | win Δ +15.8 pts (32 runs) |
| breaker | relic | `bulwark_rivets` | win Δ +15.6 pts (51 runs) |
| breaker | encounter | `enc_a3_prism_motes` | HP lost 19.6 vs expected 12 (×1.63; 21 fights, 8 deaths) |
| breaker | relic | `dampener_coil` | win Δ +15.3 pts (52 runs) |
| breaker | relic | `ghost_lantern` | win Δ +15.0 pts (60 runs) |
| breaker | relic | `notched_buckler` | win Δ +13.6 pts (50 runs) |
| graft | encounter | `enc_a1_thornback_drone` | HP lost 22.2 vs expected 12 (×1.85; 151 fights, 43 deaths) |
| breaker | relic | `cracked_prism` | win Δ +11.5 pts (41 runs) |
| breaker | relic | `void_compass` | win Δ +11.1 pts (20 runs) |
| breaker | milestone | `beat_a1_boss` | 58.0% beat the act 1 boss (target ≥ 75%) |
| graft | milestone | `beat_a1_boss` | 16.7% beat the act 1 boss (target ≥ 75%) |
| chronist | milestone | `beat_a1_boss` | 35.5% beat the act 1 boss (target ≥ 75%) |
| graft | encounter | `enc_a1_gnasher_pair` | HP lost 8.9 vs expected 3 (×2.97; 300 fights, 0 deaths) |
| chronist | encounter | `enc_a1_gnasher_pair` | HP lost 8.6 vs expected 3 (×2.87; 299 fights, 0 deaths) |
| breaker | encounter | `enc_a2_acolyte_golem` | HP lost 20.3 vs expected 14 (×1.45; 43 fights, 11 deaths) |
| chronist | encounter | `enc_a2_riveter` | HP lost 12.4 vs expected 5 (×2.49; 61 fights, 2 deaths) |
| graft | encounter | `enc_a2_drone_gnasher` | HP lost 19.6 vs expected 10 (×1.96; 26 fights, 3 deaths) |
| chronist | encounter | `enc_a1_thornback_drone` | HP lost 18.1 vs expected 12 (×1.51; 150 fights, 26 deaths) |
| chronist | card | `tide_table` | pick rate 99.2% (top 5%, offered 130, deck win Δ +0.0 pts) |
| graft | encounter | `enc_a1_drone_pack` | HP lost 14.1 vs expected 9 (×1.56; 127 fights, 17 deaths) |
| chronist | encounter | `enc_a1_drone_pack` | HP lost 12.4 vs expected 9 (×1.37; 139 fights, 18 deaths) |
| breaker | milestone | `beat_a2_boss` | 11.0% beat the act 2 boss (target ≥ 50%) |
| graft | milestone | `beat_a2_boss` | 0.0% beat the act 2 boss (target ≥ 50%) |
| chronist | milestone | `beat_a2_boss` | 2.3% beat the act 2 boss (target ≥ 50%) |
| breaker | card | `recoil_spring` | pick rate 95.7% (top 5%, offered 92, deck win Δ +6.0 pts) |
| breaker | card | `iron_rhythm` | pick rate 95.0% (top 5%, offered 101, deck win Δ +5.0 pts) |
| breaker | encounter | `enc_a2_riveter` | HP lost 8.9 vs expected 5 (×1.78; 102 fights, 0 deaths) |
| chronist | encounter | `enc_a2_drone_gnasher` | HP lost 16.1 vs expected 10 (×1.61; 72 fights, 2 deaths) |
| breaker | encounter | `enc_a2_drone_gnasher` | HP lost 16.7 vs expected 10 (×1.67; 123 fights, 0 deaths) |
| breaker | encounter | `enc_a1_gnasher_pair` | HP lost 5.0 vs expected 3 (×1.65; 300 fights, 0 deaths) |
| graft | encounter | `enc_a1_thornback` | HP lost 17.3 vs expected 11 (×1.57; 298 fights, 1 deaths) |
| graft | card | `thresher` | pick rate 92.5% (top 5%, offered 40, deck win Δ +0.0 pts) |
| graft | card | `puffball` | pick rate 91.4% (top 5%, offered 128, deck win Δ +0.0 pts) |
| graft | card | `shed_husk` | pick rate 88.8% (top 5%, offered 170, deck win Δ +0.0 pts) |
| breaker | card | `find_the_seam` | pick rate 0.0% (bottom 5%, offered 285) |
| breaker | card | `parry_ledger` | pick rate 88.7% (top 5%, offered 186, deck win Δ +8.3 pts) |
| breaker | card | `breach_hammer` | pick rate 0.0% (bottom 5%, offered 262) |
| chronist | card | `downbeat` | pick rate 0.0% (bottom 5%, offered 195) |
| chronist | card | `zenith` | pick rate 88.7% (top 5%, offered 53, deck win Δ +0.0 pts) |
| breaker | card | `anvil_heart` | pick rate 87.8% (top 5%, offered 188, deck win Δ +6.4 pts) |
| chronist | card | `reef_the_sails` | pick rate 0.0% (bottom 5%, offered 185) |
| breaker | card | `prism_edge` | pick rate 0.0% (bottom 5%, offered 184) |
| graft | card | `mire_carapace` | pick rate 0.0% (bottom 5%, offered 175) |
| graft | card | `root_mesh` | pick rate 0.0% (bottom 5%, offered 174) |
| graft | card | `mulch_maul` | pick rate 0.0% (bottom 5%, offered 171) |
| graft | card | `spore_lash` | pick rate 0.0% (bottom 5%, offered 166) |
| chronist | card | `toll_the_hours` | pick rate 88.3% (top 5%, offered 60, deck win Δ +0.0 pts) |
| graft | card | `canker_bite` | pick rate 0.0% (bottom 5%, offered 150) |
| chronist | card | `banked_hours` | pick rate 87.3% (top 5%, offered 126, deck win Δ +0.0 pts) |
| breaker | card | `en_garde` | pick rate 0.0% (bottom 5%, offered 106) |
| graft | card | `decomposer` | pick rate 87.1% (top 5%, offered 93, deck win Δ +0.0 pts) |
| chronist | card | `star_tithe` | pick rate 0.0% (bottom 5%, offered 65) |
| graft | card | `verdant_tide` | pick rate 0.0% (bottom 5%, offered 36) |
| graft | card | `transplant` | pick rate 0.0% (bottom 5%, offered 33) |

## breaker

| runs | win | stalemates | reach A1 boss | beat A1 boss | reach A2 boss | beat A2 boss | reach A3 boss | deaths A1/A2/A3 | actions (wins) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 300 | 4.7% | 0 | 73.3% | 58.0% | 12.3% | 11.0% | 5.0% | 44% / 49% / 7% | 351 (1043) |

GDD §8.4 bot targets: win 25–35%, reach A1 boss ≥ 90%, beat A1 boss ≥ 75%, beat A2 boss ≥ 50%, death share by act ≈ 30/40/30.

### Death heatmap (encounter × act)

| encounter | act | deaths | share of deaths | fights | death rate per fight |
| --- | --- | --- | --- | --- | --- |
| enc_a1_ram | 1 | 37 | 12.9% | 71 | 52.1% |
| enc_a1_dreadcap | 1 | 37 | 12.9% | 85 | 43.5% |
| enc_a2_drone_riveter | 2 | 25 | 8.7% | 71 | 35.2% |
| enc_a2_oracle_golem | 2 | 25 | 8.7% | 71 | 35.2% |
| enc_a2_oracle_pack | 2 | 24 | 8.4% | 64 | 37.5% |
| enc_a2_golem_riveter | 2 | 23 | 8.0% | 65 | 35.4% |
| enc_a2_drone_trio | 2 | 12 | 4.2% | 50 | 24.0% |
| enc_a1_thornback_wisp | 1 | 11 | 3.8% | 200 | 5.5% |
| enc_a2_acolyte_golem | 2 | 11 | 3.8% | 43 | 25.6% |
| enc_a1_thornback_drone | 1 | 10 | 3.5% | 197 | 5.1% |
| enc_a2_acolyte_pack | 2 | 9 | 3.1% | 60 | 15.0% |
| enc_a1_orchid | 1 | 8 | 2.8% | 83 | 9.6% |
| enc_a3_prism_motes | 3 | 8 | 2.8% | 21 | 38.1% |
| enc_a1_flitter_gnasher | 1 | 6 | 2.1% | 194 | 3.1% |
| enc_a3_fever_pack | 3 | 4 | 1.4% | 13 | 30.8% |
| enc_event_spore_choir | 1 | 3 | 1.0% | 46 | 6.5% |
| enc_a2_furnace | 2 | 3 | 1.0% | 15 | 20.0% |
| enc_a1_vine_puff | 1 | 3 | 1.0% | 182 | 1.6% |
| enc_a2_anvil_hammer | 2 | 3 | 1.0% | 12 | 25.0% |
| enc_a3_shard_mote | 3 | 3 | 1.0% | 23 | 13.0% |
| enc_a1_alpha | 1 | 3 | 1.0% | 66 | 4.5% |
| enc_a2_rivet_pair | 2 | 3 | 1.0% | 122 | 2.5% |
| enc_a1_drone_pack | 1 | 2 | 0.7% | 184 | 1.1% |
| enc_a1_titan | 1 | 2 | 0.7% | 71 | 2.8% |
| enc_a2_boiler | 2 | 2 | 0.7% | 16 | 12.5% |
| enc_a1_mantis | 1 | 2 | 0.7% | 198 | 1.0% |
| enc_a3_warden_shard | 3 | 1 | 0.3% | 13 | 7.7% |
| enc_a1_empress | 1 | 1 | 0.3% | 66 | 1.5% |
| enc_a1_spore_cluster | 1 | 1 | 0.3% | 149 | 0.7% |
| enc_a3_warden_cantor | 3 | 1 | 0.3% | 12 | 8.3% |
| enc_a3_sovereign | 3 | 1 | 0.3% | 3 | 33.3% |
| enc_a3_geometer | 3 | 1 | 0.3% | 13 | 7.7% |
| enc_a2_trihammer | 2 | 1 | 0.3% | 14 | 7.1% |

### HP at boss entry

| act | boss fights | avg HP | avg HP % |
| --- | --- | --- | --- |
| 1 | 220 | 61.8 | 75.0% |
| 2 | 37 | 56.4 | 68.0% |
| 3 | 15 | 70.5 | 84.4% |

### Floor of death

```
F05    1 █
F06   17 ███████████████
F07   11 ██████████
F08   14 ████████████
F10   14 ████████████
F11    5 ████
F12    9 ████████
F13    6 █████
F14    3 ███
F16   46 ████████████████████████████████████████
F18    3 ███
F19   24 █████████████████████
F20   26 ███████████████████████
F21   25 ██████████████████████
F22   20 █████████████████
F23   20 █████████████████
F24    5 ████
F27    7 ██████
F28    2 ██
F29    4 ███
F30    1 █
F32    4 ███
F34    2 ██
F35    2 ██
F36    7 ██████
F38    3 ███
F40    1 █
F43    1 █
F45    1 █
F46    1 █
F48    1 █
```

### Card rewards

3452 reward screens, skip rate 20.5%. Δwin = win rate of runs that picked the card in that act minus the class win rate (n = runs). Deck Δ = runs ending with it in the deck vs without.


| card | offered | picked | pick % | on skipped screens | bought | Δwin A1 | Δwin A2 | Δwin A3 | deck Δwin | dmg/combat with |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| recoil_spring | 92 | 88 | 95.7% | 0.0% | 0 | +1.4 (66) | +14.1 (16) | +45.3 (2) | +6.0 | 9.8 |
| iron_rhythm | 101 | 96 | 95.0% | 0.0% | 1 | -1.9 (73) | +28.7 (9) | +35.3 (5) | +5.0 | 9.9 |
| parry_ledger | 186 | 165 | 88.7% | 2.7% | 8 | -0.2 (112) | +21.3 (27) | +66.8 (7) | +8.3 | 9.5 |
| anvil_heart | 188 | 165 | 87.8% | 2.7% | 20 | +2.3 (115) | +12.0 (30) | +95.3 (5) | +6.4 | 9.7 |
| cinder_heart | 173 | 137 | 79.2% | 3.5% | 18 | -1.4 (91) | -4.7 (27) | +78.7 (6) | +1.2 | 9.5 |
| forge_oath | 97 | 73 | 75.3% | 1.0% | 1 | +3.5 (49) | +16.4 (19) | -4.7 (1) | -0.3 | 9.9 |
| feint_step | 181 | 130 | 71.8% | 11.6% | 4 | +1.0 (88) | -0.5 (24) | +95.3 (1) | +1.9 | 9.4 |
| read_the_blow | 161 | 112 | 69.6% | 7.5% | 2 | -1.0 (82) | +20.3 (16) | +66.8 (7) | +7.6 | 9.3 |
| bind_the_blade | 174 | 115 | 66.1% | 4.0% | 6 | +3.1 (77) | +25.8 (23) | +45.3 (2) | +7.8 | 9.0 |
| rampart_crash | 188 | 121 | 64.4% | 7.4% | 7 | -3.6 (91) | +5.3 (20) | +28.7 (3) | -0.6 | 9.8 |
| vent_pressure | 100 | 61 | 61.0% | 1.0% | 0 | +2.2 (44) | +10.7 (13) | +95.3 (3) | +11.6 | 9.6 |
| anneal | 176 | 105 | 59.7% | 9.7% | 5 | +1.7 (79) | +16.8 (14) | +35.3 (5) | +10.2 | 9.1 |
| crossed_blades | 184 | 99 | 53.8% | 9.8% | 7 | -2.1 (77) | +5.3 (10) | +45.3 (2) | -0.9 | 9.4 |
| endless_maul | 114 | 60 | 52.6% | 3.5% | 0 | +10.2 (47) | +35.3 (10) | +95.3 (1) | +14.3 | 9.2 |
| loaded_spring | 261 | 123 | 47.1% | 14.9% | 4 | +2.8 (94) | +13.0 (17) | +95.3 (5) | +8.3 | 9.2 |
| ride_the_surge | 180 | 81 | 45.0% | 12.2% | 2 | -1.0 (55) | +17.6 (18) | +70.3 (4) | +7.7 | 9.8 |
| smouldering_core | 101 | 44 | 43.6% | 4.0% | 0 | -2.0 (38) | +35.3 (5) | -4.7 (1) | +0.0 | 10.3 |
| fault_reader | 189 | 81 | 42.9% | 17.5% | 9 | -3.0 (61) | +13.0 (17) | – | +0.1 | 10.0 |
| catch_blade | 278 | 115 | 41.4% | 15.8% | 4 | +4.7 (85) | +11.1 (19) | +95.3 (3) | +10.2 | 9.2 |
| answering_steel | 157 | 60 | 38.2% | 10.8% | 4 | +0.2 (41) | +9.6 (14) | +70.3 (4) | +5.1 | 9.6 |
| quake_hammer | 176 | 61 | 34.7% | 16.5% | 3 | -0.8 (52) | -4.7 (7) | +95.3 (2) | +3.5 | 9.4 |
| jackhammer | 101 | 35 | 34.7% | 6.9% | 0 | -4.7 (27) | +23.9 (7) | -4.7 (1) | +1.2 | 9.3 |
| piston_volley | 182 | 63 | 34.6% | 18.1% | 2 | -4.7 (48) | +15.3 (10) | +62.0 (3) | +2.2 | 9.4 |
| quench | 164 | 53 | 32.3% | 24.4% | 1 | +5.3 (40) | +31.7 (11) | +95.3 (1) | +12.7 | 9.2 |
| return_stroke | 284 | 83 | 29.2% | 19.0% | 2 | -0.4 (71) | +22.6 (11) | – | +5.1 | 9.4 |
| steal_the_swing | 114 | 32 | 28.1% | 8.8% | 0 | +0.1 (21) | +20.3 (8) | +62.0 (3) | +9.6 | 8.9 |
| pivot_sweep | 289 | 76 | 26.3% | 19.7% | 2 | -3.0 (59) | +35.3 (15) | +95.3 (1) | +7.8 | 8.9 |
| iron_avalanche | 83 | 17 | 20.5% | 18.1% | 0 | +10.7 (13) | +28.7 (3) | +95.3 (1) | +20.0 | 8.5 |
| shed_plating | 103 | 20 | 19.4% | 8.7% | 0 | +7.8 (16) | -4.7 (3) | – | +6.3 | 9.5 |
| coiled_strike | 174 | 29 | 16.7% | 23.6% | 0 | +4.4 (22) | +62.0 (6) | – | +19.3 | 8.9 |
| cool_the_steel | 277 | 42 | 15.2% | 29.6% | 1 | -2.0 (37) | +28.7 (3) | +45.3 (2) | +2.7 | 9.6 |
| hairline_mark | 169 | 20 | 11.8% | 28.4% | 0 | -4.7 (15) | +20.3 (4) | -4.7 (1) | +0.6 | 8.5 |
| sabre_rattle | 272 | 29 | 10.7% | 28.3% | 2 | -4.7 (22) | +12.0 (6) | -4.7 (1) | -1.6 | 10.0 |
| reactive_plate | 79 | 7 | 8.9% | 11.4% | 0 | -4.7 (4) | +62.0 (3) | – | +24.5 | 9.6 |
| thresher_arc | 299 | 25 | 8.4% | 29.8% | 0 | +0.1 (21) | +28.7 (3) | +95.3 (1) | +7.5 | 8.8 |
| gauntlet_tap | 263 | 22 | 8.4% | 25.5% | 0 | +1.6 (16) | -4.7 (3) | +62.0 (3) | +9.7 | 9.2 |
| rivet_wall | 282 | 19 | 6.7% | 24.5% | 0 | +1.2 (17) | +45.3 (2) | – | +6.3 | 8.6 |
| fault_line | 306 | 18 | 5.9% | 27.5% | 0 | -4.7 (11) | +15.3 (5) | +45.3 (2) | +6.3 | 9.3 |
| chain_driver | 290 | 13 | 4.5% | 29.7% | 0 | -4.7 (8) | +70.3 (4) | -4.7 (1) | +19.2 | 8.1 |
| hammerfall | 178 | 7 | 3.9% | 29.8% | 0 | -4.7 (4) | +28.7 (3) | – | +9.8 | 9.3 |
| read_the_line | 266 | 10 | 3.8% | 33.1% | 0 | -4.7 (8) | -4.7 (1) | +95.3 (1) | +5.5 | 9.6 |
| seam_ripper | 180 | 6 | 3.3% | 32.8% | 0 | -4.7 (2) | +20.3 (4) | – | +12.2 | 10.4 |
| planted_feet | 276 | 8 | 2.9% | 24.6% | 0 | -4.7 (5) | – | -4.7 (2) | -4.8 | 10.4 |
| counterweight | 283 | 7 | 2.5% | 25.8% | 0 | -4.7 (4) | +95.3 (1) | +95.3 (2) | +29.3 | 8.0 |
| piston_jab | 289 | 6 | 2.1% | 31.1% | 0 | -4.7 (1) | -4.7 (2) | +28.7 (3) | +12.2 | 8.6 |
| rivet_flurry | 266 | 4 | 1.5% | 33.1% | 1 | -4.7 (2) | -4.7 (1) | +95.3 (1) | +20.6 | 8.9 |
| overhand_drive | 271 | 1 | 0.4% | 31.4% | 0 | -4.7 (1) | – | – | -4.7 | 8.6 |
| plate_ram | 269 | 1 | 0.4% | 29.0% | 0 | – | – | +95.3 (1) | +95.7 | 6.5 |
| find_the_seam | 285 | 0 | 0.0% | 31.6% | 0 | – | – | – | +0.0 | 0.0 |
| breach_hammer | 262 | 0 | 0.0% | 32.1% | 0 | – | – | – | +0.0 | 0.0 |
| prism_edge | 184 | 0 | 0.0% | 32.6% | 0 | – | – | – | +0.0 | 0.0 |
| en_garde | 106 | 0 | 0.0% | 17.0% | 0 | – | – | – | +0.0 | 0.0 |

### Relics

| relic | runs holding | win Δ (pts) |
| --- | --- | --- |
| crown_fragment | 6 | +63.3 |
| oracle_pebble | 17 | +26.2 |
| gravity_loom | 10 | +26.2 |
| kept_fury | 21 | +25.7 |
| shard_crucible | 14 | +25.1 |
| crystal_spine | 15 | +23.2 |
| binding_contract | 40 | +20.6 |
| chain_wraps | 39 | +18.2 |
| parry_charm | 29 | +17.7 |
| stormbreak_gem | 25 | +16.7 |
| overwatch_drone | 25 | +16.7 |
| hairline_saw | 32 | +15.8 |
| bulwark_rivets | 51 | +15.6 |
| dampener_coil | 52 | +15.3 |
| ghost_lantern | 60 | +15.0 |
| duelists_oath | 16 | +14.9 |
| notched_buckler | 50 | +13.6 |
| cracked_prism | 41 | +11.5 |
| void_compass | 20 | +11.1 |
| geode_heart | 46 | +9.9 |
| shard_lens | 22 | +9.7 |
| concussion_rig | 23 | +9.1 |
| tally_stick | 43 | +8.1 |
| pocket_star_chart | 25 | +8.0 |
| stim_patch | 47 | +7.1 |
| exposed_core | 18 | +6.9 |
| stasis_engine | 28 | +6.7 |
| surveyor_ink | 49 | +6.6 |
| field_dressing | 49 | +6.6 |
| vial_rack | 9 | +6.6 |
| scrap_magnet | 52 | +6.0 |
| glass_spurs | 54 | +5.6 |
| slow_temper | 21 | +5.2 |
| shard_debt | 36 | +4.2 |
| wayfinder_needle | 24 | +4.0 |
| shard_writ | 13 | +3.2 |
| fracture_engine | 17 | +1.3 |
| riven_gauntlet | 300 | +0.0 |
| crowd_breaker | 28 | -1.2 |
| cracked_hourglass | 39 | -2.4 |
| engine_tooth | 4 | -4.7 |
| ascendant_prism | 2 | -4.7 |
| practice_dummy | 6 | -4.8 |
| tender_plating | 10 | -4.8 |
| bastion_core | 16 | -4.9 |

Boss relic screens: skip rate 0.0%.


| boss relic | offered | picked | pick % |
| --- | --- | --- | --- |
| ghost_lantern | 60 | 60 | 100.0% |
| binding_contract | 68 | 40 | 58.8% |
| cracked_hourglass | 56 | 39 | 69.6% |
| stasis_engine | 61 | 28 | 45.9% |
| exposed_core | 76 | 18 | 23.7% |
| tender_plating | 63 | 10 | 15.9% |
| gravity_loom | 57 | 10 | 17.5% |
| ascendant_prism | 56 | 2 | 3.6% |
| star_atlas | 60 | 0 | 0.0% |
| heavy_heart | 64 | 0 | 0.0% |

### Pacts and events

| pact | picked | win Δ (pts) |
| --- | --- | --- |
| pact_hardy | 100 | +3.5 |
| pact_purse | 93 | +1.0 |
| pact_shards | 107 | -4.3 |

| event | seen | option picks |
| --- | --- | --- |
| ev_scavenger_drone | 51 | #0: 49, #2: 2 |
| ev_flickering_medpod | 47 | #0: 25, #1: 21, #2: 1 |
| ev_lost_climber | 66 | #0: 9, #1: 57 |
| ev_drowned_shrine | 52 | #1: 4, #2: 48 |
| ev_spore_choir | 46 | #0: 46 |
| ev_wandering_artificer | 60 | #0: 23, #1: 37 |
| ev_quiet_bench | 55 | #0: 51, #1: 4 |
| ev_rigged_conveyor | 22 | #0: 20, #1: 2 |
| ev_singing_geode | 49 | #1: 13, #2: 36 |
| ev_hydroponic_bay | 51 | #0: 51 |
| ev_memory_pool | 71 | #0: 1, #1: 70 |
| ev_oracle_terminal | 23 | #0: 17, #3: 6 |
| ev_engine_cult | 19 | #0: 4, #1: 15 |
| ev_salvage_heap | 22 | #1: 8, #2: 14 |
| ev_smelter | 27 | #1: 24, #2: 3 |
| ev_assembly_line | 23 | #0: 23 |
| ev_prism_garden | 8 | #1: 8 |
| ev_void_lens | 5 | #2: 5 |
| ev_your_echo | 7 | #0: 7 |
| ev_immune_scan | 3 | #1: 2, #2: 1 |
| ev_crown_vault | 6 | #1: 6 |
| ev_tether_merchant | 8 | #0: 7, #3: 1 |

### Economy per act

| act | Shards earned | Shards spent | deck size (end of act) | gold earned | gold spent | removals shop/rest/event/other | upgrades |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 2.96 | 0.47 | 17.8 | 248 | 159 | 0.86 / 0.00 / 0.03 / 0.01 | 1.33 |
| 2 | 0.88 | 0.37 | 21.1 | 65 | 88 | 0.43 / 0.00 / 0.01 / 0.06 | 0.39 |
| 3 | 0.16 | 0.21 | 27.2 | 23 | 23 | 0.11 / 0.00 / 0.00 / 0.02 | 0.15 |

Shard target (GDD §4.5): 3–5 earned per act. Per-act averages are over all runs (runs that died earlier count 0 for later acts).

### Turns and damage per encounter vs ENEMIES §4.1

| encounter | act | room | fights | deaths | avg turns | expected phases | avg HP lost | expected lost | ratio |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| enc_a1_alpha | 1 | elite | 66 | 3 | 7.5 | 2–3 | 22.8 | 24 | 0.95 |
| enc_a1_dreadcap | 1 | elite | 85 | 37 | 9.3 | 5–5 | 43.9 | 20 | 2.19 ⚠ |
| enc_a1_drone_pack | 1 | monster | 184 | 2 | 3.6 | 2–3 | 8.7 | 9 | 0.97 |
| enc_a1_drone_puff | 1 | monster | 298 | 0 | 2.6 | 1–2 | 0.3 | 2 | 0.17 |
| enc_a1_empress | 1 | boss | 66 | 1 | 14.5 | 11–11 | 13.6 | 39 | 0.35 |
| enc_a1_flitter_gnasher | 1 | monster | 194 | 6 | 3.2 | 2–3 | 9.8 | 15 | 0.65 |
| enc_a1_gnasher_pair | 1 | monster | 300 | 0 | 2.7 | 1–2 | 5.0 | 3 | 1.65 ⚠ |
| enc_a1_mantis | 1 | monster | 198 | 2 | 4.0 | 2–2 | 5.9 | 9 | 0.65 |
| enc_a1_orchid | 1 | boss | 83 | 8 | 20.1 | 10–10 | 22.0 | 35 | 0.63 |
| enc_a1_ram | 1 | boss | 71 | 37 | 10.5 | 9–9 | 50.6 | 40 | 1.27 |
| enc_a1_spore_cluster | 1 | monster | 149 | 1 | 4.0 | 2–2 | 1.0 | 4 | 0.26 |
| enc_a1_thornback | 1 | monster | 299 | 0 | 4.2 | 2–2 | 8.8 | 11 | 0.80 |
| enc_a1_thornback_drone | 1 | monster | 197 | 10 | 4.8 | 3–3 | 15.0 | 12 | 1.25 |
| enc_a1_thornback_wisp | 1 | monster | 200 | 11 | 5.4 | 3–4 | 14.1 | 20 | 0.70 |
| enc_a1_titan | 1 | elite | 71 | 2 | 5.9 | 4–4 | 6.2 | 17 | 0.36 |
| enc_a1_vine_puff | 1 | monster | 182 | 3 | 6.6 | 4–4 | 9.6 | 17 | 0.56 |
| enc_event_spore_choir | 1 | event | 46 | 3 | 8.6 | – | 15.7 | – | – |
| enc_a2_acolyte_golem | 2 | monster | 43 | 11 | 8.3 | 5–5 | 20.3 | 14 | 1.45 ⚠ |
| enc_a2_acolyte_pack | 2 | monster | 60 | 9 | 5.8 | 4–4 | 10.3 | 20 | 0.51 |
| enc_a2_anvil_hammer | 2 | elite | 12 | 3 | 8.3 | 5–6 | 23.7 | 28 | 0.85 |
| enc_a2_assembler | 2 | boss | 8 | 0 | 22.9 | 10–10 | 1.5 | 35 | 0.04 |
| enc_a2_auditor | 2 | elite | 10 | 0 | 9.8 | 4–4 | 4.2 | 15 | 0.28 |
| enc_a2_boiler | 2 | elite | 16 | 2 | 8.1 | 5–6 | 12.4 | 24 | 0.52 |
| enc_a2_drone_gnasher | 2 | monster | 123 | 0 | 4.8 | 2–2 | 16.7 | 10 | 1.67 ⚠ |
| enc_a2_drone_riveter | 2 | monster | 71 | 25 | 4.6 | 3–4 | 19.6 | 18 | 1.09 |
| enc_a2_drone_trio | 2 | monster | 50 | 12 | 5.1 | 4–4 | 13.8 | 16 | 0.86 |
| enc_a2_furnace | 2 | boss | 15 | 3 | 20.3 | 11–11 | 27.7 | 38 | 0.73 |
| enc_a2_golem_riveter | 2 | monster | 65 | 23 | 7.2 | 5–5 | 20.9 | 24 | 0.87 |
| enc_a2_oracle_golem | 2 | monster | 71 | 25 | 7.6 | 5–5 | 21.9 | 20 | 1.10 |
| enc_a2_oracle_pack | 2 | monster | 64 | 24 | 4.8 | 4–4 | 23.3 | 20 | 1.16 |
| enc_a2_rivet_pair | 2 | monster | 122 | 3 | 4.2 | 1–2 | 14.7 | 4 | 3.67 ⚠ |
| enc_a2_riveter | 2 | monster | 102 | 0 | 5.1 | 2–2 | 8.9 | 5 | 1.78 ⚠ |
| enc_a2_trihammer | 2 | boss | 14 | 1 | 13.6 | 10–10 | 18.9 | 40 | 0.47 |
| enc_event_engine_cult | 2 | event | 15 | 0 | 12.5 | – | 9.1 | – | – |
| enc_a3_archivist | 3 | boss | 4 | 0 | 10.5 | 9–9 | 8.0 | 30 | 0.27 |
| enc_a3_cantor | 3 | monster | 15 | 0 | 5.5 | 2–2 | 0.5 | 6 | 0.09 |
| enc_a3_event_horizon | 3 | elite | 6 | 0 | 11.3 | 4–4 | 29.0 | 36 | 0.81 |
| enc_a3_fever_pack | 3 | monster | 13 | 4 | 4.1 | 3–3 | 18.4 | 15 | 1.23 |
| enc_a3_geometer | 3 | monster | 13 | 1 | 6.8 | 3–3 | 10.9 | 18 | 0.61 |
| enc_a3_leukarch | 3 | boss | 8 | 0 | 15.8 | 10–10 | 3.4 | 37 | 0.09 |
| enc_a3_mirror_knight | 3 | elite | 5 | 0 | 6.4 | 3–3 | 0.6 | 15 | 0.04 |
| enc_a3_mote_pair | 3 | monster | 24 | 0 | 4.8 | 1–1 | 13.8 | 3 | 4.60 ⚠ |
| enc_a3_phage_mother | 3 | elite | 3 | 0 | 6.7 | 3–4 | 2.0 | 18 | 0.11 |
| enc_a3_prism_motes | 3 | monster | 21 | 8 | 5.3 | 3–3 | 19.6 | 12 | 1.63 ⚠ |
| enc_a3_seer | 3 | monster | 19 | 0 | 5.2 | 1–1 | 0.8 | 2 | 0.39 |
| enc_a3_shard_mote | 3 | monster | 23 | 3 | 4.0 | 1–2 | 22.5 | 5 | 4.50 ⚠ |
| enc_a3_sovereign | 3 | boss | 3 | 1 | 20.3 | 10–10 | 25.0 | 58 | 0.43 |
| enc_a3_warden_cantor | 3 | monster | 12 | 1 | 7.5 | 4–4 | 1.9 | 18 | 0.11 |
| enc_a3_warden_geometer | 3 | monster | 11 | 0 | 9.5 | 5–5 | 6.3 | 25 | 0.25 |
| enc_a3_warden_shard | 3 | monster | 13 | 1 | 5.3 | 3–3 | 13.8 | 12 | 1.15 |
| enc_event_antibodies | 3 | event | 2 | 0 | 5.5 | – | 15.5 | – | – |
| enc_event_echo | 3 | event | 7 | 0 | 6.1 | – | 3.0 | – | – |

### Mechanic telemetry

| metric | value |
| --- | --- |
| Onslaught at Attack play (mean) | 2.06 |
| Onslaught distribution | 0: 24%, 1: 28%, 2: 18%, 3: 11%, 4: 7%, 5: 5%, 6: 3%, 7: 2%, 8: 1%, 9: 1%, 10: 0%, 11: 0%, 12: 0%, 13: 0%, 14: 0%, 15: 0%, 16: 0%, 17: 0%, 18: 0% |
| Riposte: primed / triggers / fizzles / attack cancels | 11675 / 9160 / 2402 / 986 |
| Riposte triggers per primed card · fizzle rate | 0.79 · 20.6% |
| Guard share of damage prevented (Block+Guard) | 58.7% |
| Guard absorbed / Block absorbed / HP lost to hits | 79836 / 56131 / 45654 |
| Bloom at end: max · total · Bloom cards (per run) | 0.00 · 0.00 · 0.00 |
| Prunes per combat | 0.00 |
| Rot's share of damage dealt | 2.1% |
| Beats per turn (on-beat plays / player turns) | 0.75 |
| Timeline resolutions per combat (added / resolved) | 0.01 (50 / 50) |
| Exposed bonus damage per combat | 2.59 |
| Stagger damage prevented per combat (upper bound) | 6.08 |
| Potions used per run | 4.90 |

### Cap hits

Cap hits per player turn: 2.70% (healthy < 1%).


| cap | hits |
| --- | --- |
| cap_hand | 311 |
| cap_stacks | 204 |
| cap_to_hand | 50 |
| cap_bonus_energy | 1 |

## graft

| runs | win | stalemates | reach A1 boss | beat A1 boss | reach A2 boss | beat A2 boss | reach A3 boss | deaths A1/A2/A3 | actions (wins) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 300 | 0.0% | 0 | 33.3% | 16.7% | 0.0% | 0.0% | 0.0% | 83% / 17% / 0% | 170 (0) |

GDD §8.4 bot targets: win 25–35%, reach A1 boss ≥ 90%, beat A1 boss ≥ 75%, beat A2 boss ≥ 50%, death share by act ≈ 30/40/30.

### Death heatmap (encounter × act)

| encounter | act | deaths | share of deaths | fights | death rate per fight |
| --- | --- | --- | --- | --- | --- |
| enc_a1_thornback_drone | 1 | 43 | 14.3% | 151 | 28.5% |
| enc_a1_thornback_wisp | 1 | 33 | 11.0% | 142 | 23.2% |
| enc_a1_ram | 1 | 28 | 9.3% | 33 | 84.8% |
| enc_a1_alpha | 1 | 24 | 8.0% | 45 | 53.3% |
| enc_a1_flitter_gnasher | 1 | 21 | 7.0% | 136 | 15.4% |
| enc_a1_vine_puff | 1 | 21 | 7.0% | 157 | 13.4% |
| enc_a1_dreadcap | 1 | 17 | 5.7% | 47 | 36.2% |
| enc_a1_drone_pack | 1 | 17 | 5.7% | 127 | 13.4% |
| enc_a1_mantis | 1 | 13 | 4.3% | 128 | 10.2% |
| enc_a1_empress | 1 | 11 | 3.7% | 32 | 34.4% |
| enc_a1_orchid | 1 | 11 | 3.7% | 35 | 31.4% |
| enc_a2_oracle_pack | 2 | 10 | 3.3% | 11 | 90.9% |
| enc_a1_titan | 1 | 8 | 2.7% | 38 | 21.1% |
| enc_a2_golem_riveter | 2 | 7 | 2.3% | 10 | 70.0% |
| enc_a2_drone_riveter | 2 | 6 | 2.0% | 10 | 60.0% |
| enc_a2_acolyte_golem | 2 | 5 | 1.7% | 10 | 50.0% |
| enc_a2_acolyte_pack | 2 | 4 | 1.3% | 13 | 30.8% |
| enc_a2_riveter | 2 | 4 | 1.3% | 39 | 10.3% |
| enc_a2_boiler | 2 | 3 | 1.0% | 4 | 75.0% |
| enc_a2_drone_gnasher | 2 | 3 | 1.0% | 26 | 11.5% |
| enc_a2_rivet_pair | 2 | 3 | 1.0% | 35 | 8.6% |
| enc_a2_oracle_golem | 2 | 3 | 1.0% | 8 | 37.5% |
| enc_event_spore_choir | 1 | 2 | 0.7% | 31 | 6.5% |
| enc_a2_drone_trio | 2 | 2 | 0.7% | 10 | 20.0% |
| enc_a1_thornback | 1 | 1 | 0.3% | 298 | 0.3% |

### HP at boss entry

| act | boss fights | avg HP | avg HP % |
| --- | --- | --- | --- |
| 1 | 100 | 44.8 | 61.3% |
| 2 | 0 | 0.0 | 0.0% |
| 3 | 0 | 0.0 | 0.0% |

### Floor of death

```
F03    1 █
F04    7 ██████
F05   21 █████████████████
F06   44 ███████████████████████████████████
F07   30 ████████████████████████
F08   29 ███████████████████████
F10   21 █████████████████
F11    9 ███████
F12   12 ██████████
F13   10 ████████
F14   16 █████████████
F16   50 ████████████████████████████████████████
F18    6 █████
F19    9 ███████
F20   13 ██████████
F21    3 ██
F22    3 ██
F23    4 ███
F24    6 █████
F26    3 ██
F28    2 ██
F29    1 █
```

### Card rewards

1993 reward screens, skip rate 14.0%. Δwin = win rate of runs that picked the card in that act minus the class win rate (n = runs). Deck Δ = runs ending with it in the deck vs without.


| card | offered | picked | pick % | on skipped screens | bought | Δwin A1 | Δwin A2 | Δwin A3 | deck Δwin | dmg/combat with |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| thresher | 40 | 37 | 92.5% | 0.0% | 1 | +0.0 (35) | +0.0 (1) | – | +0.0 | 12.4 |
| puffball | 128 | 117 | 91.4% | 0.0% | 8 | +0.0 (96) | +0.0 (4) | – | +0.0 | 11.3 |
| shed_husk | 170 | 151 | 88.8% | 0.6% | 18 | +0.0 (120) | +0.0 (13) | – | +0.0 | 10.9 |
| decomposer | 93 | 81 | 87.1% | 0.0% | 9 | +0.0 (63) | +0.0 (6) | – | +0.0 | 11.5 |
| miasma_sweep | 105 | 90 | 85.7% | 1.0% | 4 | +0.0 (83) | +0.0 (2) | – | +0.0 | 11.1 |
| dusk_pruning | 119 | 101 | 84.9% | 0.0% | 7 | +0.0 (82) | +0.0 (6) | – | +0.0 | 11.2 |
| crystal_graft | 40 | 32 | 80.0% | 0.0% | 0 | +0.0 (30) | +0.0 (1) | – | +0.0 | 12.2 |
| hyphal_web | 43 | 34 | 79.1% | 0.0% | 0 | +0.0 (31) | +0.0 (2) | – | +0.0 | 11.8 |
| leaf_litter | 145 | 107 | 73.8% | 1.4% | 4 | +0.0 (95) | +0.0 (1) | – | +0.0 | 11.3 |
| death_cap | 42 | 29 | 69.0% | 0.0% | 0 | +0.0 (27) | +0.0 (1) | – | +0.0 | 11.9 |
| ripening_rot | 107 | 72 | 67.3% | 1.9% | 8 | +0.0 (62) | +0.0 (4) | – | +0.0 | 11.1 |
| heartwood_spear | 30 | 20 | 66.7% | 0.0% | 0 | +0.0 (17) | +0.0 (2) | – | +0.0 | 12.1 |
| uproot | 89 | 56 | 62.9% | 0.0% | 1 | +0.0 (48) | +0.0 (5) | – | +0.0 | 10.7 |
| chitin_cocoon | 46 | 27 | 58.7% | 2.2% | 0 | +0.0 (27) | – | – | +0.0 | 11.4 |
| choking_spores | 108 | 61 | 56.5% | 2.8% | 2 | +0.0 (54) | +0.0 (5) | – | +0.0 | 11.6 |
| spore_haze | 156 | 76 | 48.7% | 11.5% | 5 | +0.0 (68) | +0.0 (3) | – | +0.0 | 11.0 |
| burl_wall | 97 | 47 | 48.5% | 11.3% | 3 | +0.0 (43) | +0.0 (3) | – | +0.0 | 10.9 |
| quickening_sap | 34 | 16 | 47.1% | 5.9% | 0 | +0.0 (16) | – | – | +0.0 | 11.9 |
| thorn_halo | 93 | 39 | 41.9% | 3.2% | 6 | +0.0 (36) | +0.0 (2) | – | +0.0 | 11.7 |
| patient_thorn | 106 | 42 | 39.6% | 11.3% | 1 | +0.0 (40) | +0.0 (1) | – | +0.0 | 11.6 |
| twin_thorn | 103 | 39 | 37.9% | 10.7% | 2 | +0.0 (36) | +0.0 (2) | – | +0.0 | 11.0 |
| humus_rite | 31 | 11 | 35.5% | 9.7% | 0 | +0.0 (11) | – | – | +0.0 | 11.3 |
| blightcap | 153 | 51 | 33.3% | 10.5% | 1 | +0.0 (42) | +0.0 (7) | – | +0.0 | 11.3 |
| seed_rain | 107 | 35 | 32.7% | 21.5% | 5 | +0.0 (31) | +0.0 (4) | – | +0.0 | 11.2 |
| excise | 104 | 34 | 32.7% | 10.6% | 0 | +0.0 (28) | +0.0 (5) | – | +0.0 | 11.5 |
| reaping_vine | 43 | 14 | 32.6% | 2.3% | 0 | +0.0 (13) | +0.0 (1) | – | +0.0 | 13.1 |
| tendril_reach | 161 | 35 | 21.7% | 18.6% | 2 | +0.0 (32) | +0.0 (1) | – | +0.0 | 10.5 |
| canopy_crush | 104 | 22 | 21.2% | 19.2% | 0 | +0.0 (20) | +0.0 (2) | – | +0.0 | 11.4 |
| deep_graft | 180 | 38 | 21.1% | 18.3% | 0 | +0.0 (35) | +0.0 (1) | – | +0.0 | 11.4 |
| thornwhirl | 165 | 33 | 20.0% | 19.4% | 2 | +0.0 (32) | +0.0 (1) | – | +0.0 | 10.8 |
| chitin_ram | 162 | 32 | 19.8% | 14.2% | 0 | +0.0 (30) | +0.0 (1) | – | +0.0 | 11.3 |
| fungal_aegis | 47 | 9 | 19.1% | 6.4% | 0 | +0.0 (9) | – | – | +0.0 | 10.3 |
| prism_thorn | 110 | 20 | 18.2% | 14.5% | 0 | +0.0 (16) | +0.0 (4) | – | +0.0 | 12.3 |
| living_hedge | 109 | 18 | 16.5% | 12.8% | 0 | +0.0 (18) | – | – | +0.0 | 10.7 |
| thicket_crash | 116 | 14 | 12.1% | 18.1% | 0 | +0.0 (14) | – | – | +0.0 | 11.2 |
| pollen_sting | 113 | 12 | 10.6% | 22.1% | 0 | +0.0 (11) | +0.0 (1) | – | +0.0 | 11.4 |
| windblown_seed | 174 | 12 | 6.9% | 21.8% | 1 | +0.0 (12) | – | – | +0.0 | 10.0 |
| sap_shell | 173 | 12 | 6.9% | 25.4% | 1 | +0.0 (11) | +0.0 (1) | – | +0.0 | 10.4 |
| grafting_cut | 180 | 11 | 6.1% | 22.8% | 1 | +0.0 (10) | +0.0 (1) | – | +0.0 | 10.0 |
| sporeburst | 120 | 7 | 5.8% | 17.5% | 0 | +0.0 (7) | – | – | +0.0 | 9.7 |
| hivestrike | 157 | 8 | 5.1% | 21.0% | 1 | +0.0 (7) | +0.0 (1) | – | +0.0 | 10.3 |
| sap_drip | 163 | 4 | 2.5% | 15.3% | 0 | +0.0 (3) | +0.0 (1) | – | +0.0 | 10.6 |
| shear | 174 | 4 | 2.3% | 19.5% | 0 | +0.0 (4) | – | – | +0.0 | 10.0 |
| barb_flick | 171 | 3 | 1.8% | 21.6% | 0 | +0.0 (3) | – | – | +0.0 | 11.6 |
| propagate | 108 | 1 | 0.9% | 28.7% | 0 | +0.0 (1) | – | – | +0.0 | 13.8 |
| mire_carapace | 175 | 0 | 0.0% | 20.0% | 0 | – | – | – | +0.0 | 0.0 |
| root_mesh | 174 | 0 | 0.0% | 16.1% | 0 | – | – | – | +0.0 | 0.0 |
| mulch_maul | 171 | 0 | 0.0% | 19.9% | 0 | – | – | – | +0.0 | 0.0 |
| spore_lash | 166 | 0 | 0.0% | 24.7% | 0 | – | – | – | +0.0 | 0.0 |
| canker_bite | 150 | 0 | 0.0% | 23.3% | 0 | – | – | – | +0.0 | 0.0 |
| verdant_tide | 36 | 0 | 0.0% | 11.1% | 0 | – | – | – | +0.0 | 0.0 |
| transplant | 33 | 0 | 0.0% | 12.1% | 0 | – | – | – | +0.0 | 0.0 |

### Relics

| relic | runs holding | win Δ (pts) |
| --- | --- | --- |
| heartseed | 300 | +0.0 |
| pollen_sac | 24 | +0.0 |
| wayfinder_needle | 10 | +0.0 |
| surveyor_ink | 28 | +0.0 |
| compost_heap | 24 | +0.0 |
| seed_pouch | 26 | +0.0 |
| cracked_prism | 23 | +0.0 |
| scrap_magnet | 20 | +0.0 |
| slow_temper | 6 | +0.0 |
| ghost_lantern | 18 | +0.0 |
| pocket_star_chart | 13 | +0.0 |
| fracture_engine | 3 | +0.0 |
| bulwark_rivets | 22 | +0.0 |
| tally_stick | 18 | +0.0 |
| mycelial_net | 12 | +0.0 |
| geode_heart | 23 | +0.0 |
| overwatch_drone | 13 | +0.0 |
| glass_spurs | 22 | +0.0 |
| grafting_knife | 8 | +0.0 |
| shard_debt | 29 | +0.0 |
| exposed_core | 5 | +0.0 |
| rot_censer | 11 | +0.0 |
| crystal_spine | 8 | +0.0 |
| concussion_rig | 10 | +0.0 |
| elder_seed | 5 | +0.0 |
| binding_contract | 10 | +0.0 |
| hollow_bough | 8 | +0.0 |
| hairline_saw | 8 | +0.0 |
| void_compass | 9 | +0.0 |
| heartwood_ring | 13 | +0.0 |
| field_dressing | 18 | +0.0 |
| dampener_coil | 22 | +0.0 |
| shard_crucible | 9 | +0.0 |
| stim_patch | 19 | +0.0 |
| shard_lens | 7 | +0.0 |
| vial_rack | 7 | +0.0 |
| plague_bloom | 7 | +0.0 |
| cracked_hourglass | 13 | +0.0 |
| shard_writ | 4 | +0.0 |
| nursery_tray | 5 | +0.0 |
| engine_tooth | 2 | +0.0 |
| tender_plating | 2 | +0.0 |
| stasis_engine | 1 | +0.0 |
| gravity_loom | 1 | +0.0 |
| oracle_pebble | 2 | +0.0 |

Boss relic screens: skip rate 0.0%.


| boss relic | offered | picked | pick % |
| --- | --- | --- | --- |
| ghost_lantern | 18 | 18 | 100.0% |
| cracked_hourglass | 18 | 13 | 72.2% |
| binding_contract | 13 | 10 | 76.9% |
| exposed_core | 17 | 5 | 29.4% |
| tender_plating | 11 | 2 | 18.2% |
| gravity_loom | 16 | 1 | 6.3% |
| stasis_engine | 23 | 1 | 4.3% |
| wild_growth | 6 | 0 | 0.0% |
| star_atlas | 11 | 0 | 0.0% |
| ascendant_prism | 17 | 0 | 0.0% |

### Pacts and events

| pact | picked | win Δ (pts) |
| --- | --- | --- |
| pact_shards | 104 | +0.0 |
| pact_purse | 93 | +0.0 |
| pact_hardy | 103 | +0.0 |

| event | seen | option picks |
| --- | --- | --- |
| ev_scavenger_drone | 35 | #0: 28, #2: 7 |
| ev_hydroponic_bay | 35 | #0: 35 |
| ev_lost_climber | 53 | #0: 5, #1: 48 |
| ev_flickering_medpod | 38 | #0: 24, #1: 13, #2: 1 |
| ev_spore_choir | 33 | #0: 31, #2: 2 |
| ev_drowned_shrine | 42 | #1: 1, #2: 41 |
| ev_wandering_artificer | 43 | #0: 19, #1: 24 |
| ev_memory_pool | 45 | #1: 45 |
| ev_quiet_bench | 40 | #0: 38, #1: 2 |
| ev_singing_geode | 45 | #1: 16, #2: 29 |
| ev_engine_cult | 6 | #0: 2, #1: 4 |
| ev_salvage_heap | 7 | #1: 3, #2: 4 |
| ev_rigged_conveyor | 7 | #0: 7 |
| ev_assembly_line | 8 | #0: 8 |
| ev_smelter | 5 | #1: 2, #2: 3 |
| ev_oracle_terminal | 3 | #0: 2, #3: 1 |

### Economy per act

| act | Shards earned | Shards spent | deck size (end of act) | gold earned | gold spent | removals shop/rest/event/other | upgrades |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 2.01 | 0.44 | 15.6 | 162 | 115 | 0.67 / 0.00 / 0.02 / 0.48 | 0.82 |
| 2 | 0.10 | 0.09 | 18.5 | 10 | 16 | 0.07 / 0.00 / 0.00 / 0.08 | 0.03 |
| 3 | 0.00 | 0.00 | 0.0 | 0 | 0 | 0.00 / 0.00 / 0.00 / 0.00 | 0.00 |

Shard target (GDD §4.5): 3–5 earned per act. Per-act averages are over all runs (runs that died earlier count 0 for later acts).

### Turns and damage per encounter vs ENEMIES §4.1

| encounter | act | room | fights | deaths | avg turns | expected phases | avg HP lost | expected lost | ratio |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| enc_a1_alpha | 1 | elite | 45 | 24 | 5.7 | 2–3 | 33.3 | 24 | 1.39 ⚠ |
| enc_a1_dreadcap | 1 | elite | 47 | 17 | 7.4 | 5–5 | 25.0 | 20 | 1.25 |
| enc_a1_drone_pack | 1 | monster | 127 | 17 | 3.3 | 2–3 | 14.1 | 9 | 1.56 ⚠ |
| enc_a1_drone_puff | 1 | monster | 298 | 0 | 2.7 | 1–2 | 1.1 | 2 | 0.57 |
| enc_a1_empress | 1 | boss | 32 | 11 | 9.3 | 11–11 | 33.0 | 39 | 0.85 |
| enc_a1_flitter_gnasher | 1 | monster | 136 | 21 | 3.0 | 2–3 | 14.7 | 15 | 0.98 |
| enc_a1_gnasher_pair | 1 | monster | 300 | 0 | 3.0 | 1–2 | 8.9 | 3 | 2.97 ⚠ |
| enc_a1_mantis | 1 | monster | 128 | 13 | 3.9 | 2–2 | 9.5 | 9 | 1.06 |
| enc_a1_orchid | 1 | boss | 35 | 11 | 8.3 | 10–10 | 28.0 | 35 | 0.80 |
| enc_a1_ram | 1 | boss | 33 | 28 | 5.9 | 9–9 | 44.6 | 40 | 1.11 |
| enc_a1_spore_cluster | 1 | monster | 115 | 0 | 3.4 | 2–2 | 1.2 | 4 | 0.31 |
| enc_a1_thornback | 1 | monster | 298 | 1 | 4.8 | 2–2 | 17.3 | 11 | 1.57 ⚠ |
| enc_a1_thornback_drone | 1 | monster | 151 | 43 | 4.2 | 3–3 | 22.2 | 12 | 1.85 ⚠ |
| enc_a1_thornback_wisp | 1 | monster | 142 | 33 | 4.5 | 3–4 | 20.0 | 20 | 1.00 |
| enc_a1_titan | 1 | elite | 38 | 8 | 5.6 | 4–4 | 18.5 | 17 | 1.09 |
| enc_a1_vine_puff | 1 | monster | 157 | 21 | 5.4 | 4–4 | 13.8 | 17 | 0.81 |
| enc_event_spore_choir | 1 | event | 31 | 2 | 6.4 | – | 17.7 | – | – |
| enc_a2_acolyte_golem | 2 | monster | 10 | 5 | 3.7 | 5–5 | 12.2 | 14 | 0.87 |
| enc_a2_acolyte_pack | 2 | monster | 13 | 4 | 3.2 | 4–4 | 14.4 | 20 | 0.72 |
| enc_a2_boiler | 2 | elite | 4 | 3 | 4.3 | 5–6 | 28.0 | 24 | 1.17 |
| enc_a2_drone_gnasher | 2 | monster | 26 | 3 | 3.4 | 2–2 | 19.6 | 10 | 1.96 ⚠ |
| enc_a2_drone_riveter | 2 | monster | 10 | 6 | 2.3 | 3–4 | 10.9 | 18 | 0.61 |
| enc_a2_drone_trio | 2 | monster | 10 | 2 | 3.6 | 4–4 | 11.7 | 16 | 0.73 |
| enc_a2_golem_riveter | 2 | monster | 10 | 7 | 3.8 | 5–5 | 21.9 | 24 | 0.91 |
| enc_a2_oracle_golem | 2 | monster | 8 | 3 | 4.3 | 5–5 | 24.6 | 20 | 1.23 |
| enc_a2_oracle_pack | 2 | monster | 11 | 10 | 1.5 | 4–4 | 18.1 | 20 | 0.90 |
| enc_a2_rivet_pair | 2 | monster | 35 | 3 | 3.4 | 1–2 | 20.3 | 4 | 5.09 ⚠ |
| enc_a2_riveter | 2 | monster | 39 | 4 | 3.7 | 2–2 | 17.2 | 5 | 3.45 ⚠ |
| enc_event_engine_cult | 2 | event | 4 | 0 | 5.5 | – | 8.5 | – | – |

### Mechanic telemetry

| metric | value |
| --- | --- |
| Onslaught at Attack play (mean) | 0.00 |
| Onslaught distribution | 0: 100% |
| Riposte: primed / triggers / fizzles / attack cancels | 17 / 0 / 0 / 8 |
| Riposte triggers per primed card · fizzle rate | 0.00 · 0.0% |
| Guard share of damage prevented (Block+Guard) | 2.3% |
| Guard absorbed / Block absorbed / HP lost to hits | 869 / 37325 / 32292 |
| Bloom at end: max · total · Bloom cards (per run) | 3.78 · 7.57 · 3.33 |
| Prunes per combat | 1.08 |
| Rot's share of damage dealt | 19.6% |
| Beats per turn (on-beat plays / player turns) | 0.61 |
| Timeline resolutions per combat (added / resolved) | 0.00 (0 / 0) |
| Exposed bonus damage per combat | 0.28 |
| Stagger damage prevented per combat (upper bound) | 0.71 |
| Potions used per run | 2.75 |

### Cap hits

Cap hits per player turn: 5.80% (healthy < 1%).


| cap | hits |
| --- | --- |
| cap_stacks | 548 |
| cap_hand | 2 |

## chronist

| runs | win | stalemates | reach A1 boss | beat A1 boss | reach A2 boss | beat A2 boss | reach A3 boss | deaths A1/A2/A3 | actions (wins) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 299 | 0.0% | 0 | 47.2% | 35.5% | 3.0% | 2.3% | 0.3% | 65% / 33% / 2% | 219 (0) |

GDD §8.4 bot targets: win 25–35%, reach A1 boss ≥ 90%, beat A1 boss ≥ 75%, beat A2 boss ≥ 50%, death share by act ≈ 30/40/30.

### Death heatmap (encounter × act)

| encounter | act | deaths | share of deaths | fights | death rate per fight |
| --- | --- | --- | --- | --- | --- |
| enc_a1_dreadcap | 1 | 29 | 9.7% | 54 | 53.7% |
| enc_a1_ram | 1 | 26 | 8.7% | 56 | 46.4% |
| enc_a1_thornback_drone | 1 | 26 | 8.7% | 150 | 17.3% |
| enc_a2_oracle_pack | 2 | 23 | 7.7% | 38 | 60.5% |
| enc_a1_thornback_wisp | 1 | 21 | 7.0% | 151 | 13.9% |
| enc_a1_flitter_gnasher | 1 | 19 | 6.4% | 152 | 12.5% |
| enc_a2_drone_riveter | 2 | 19 | 6.4% | 27 | 70.4% |
| enc_a1_drone_pack | 1 | 18 | 6.0% | 139 | 12.9% |
| enc_a1_vine_puff | 1 | 16 | 5.4% | 155 | 10.3% |
| enc_a2_oracle_golem | 2 | 13 | 4.3% | 32 | 40.6% |
| enc_a1_alpha | 1 | 12 | 4.0% | 36 | 33.3% |
| enc_a2_golem_riveter | 2 | 10 | 3.3% | 17 | 58.8% |
| enc_a2_acolyte_pack | 2 | 8 | 2.7% | 19 | 42.1% |
| enc_a2_drone_trio | 2 | 7 | 2.3% | 21 | 33.3% |
| enc_a1_spore_cluster | 1 | 7 | 2.3% | 136 | 5.1% |
| enc_event_spore_choir | 1 | 6 | 2.0% | 35 | 17.1% |
| enc_a2_acolyte_golem | 2 | 6 | 2.0% | 22 | 27.3% |
| enc_a2_rivet_pair | 2 | 5 | 1.7% | 79 | 6.3% |
| enc_a1_orchid | 1 | 5 | 1.7% | 45 | 11.1% |
| enc_a1_empress | 1 | 4 | 1.3% | 40 | 10.0% |
| enc_a1_mantis | 1 | 3 | 1.0% | 143 | 2.1% |
| enc_a2_anvil_hammer | 2 | 2 | 0.7% | 5 | 40.0% |
| enc_a3_geometer | 3 | 2 | 0.7% | 5 | 40.0% |
| enc_a3_shard_mote | 3 | 2 | 0.7% | 5 | 40.0% |
| enc_a2_riveter | 2 | 2 | 0.7% | 61 | 3.3% |
| enc_a2_drone_gnasher | 2 | 2 | 0.7% | 72 | 2.8% |
| enc_a3_event_horizon | 3 | 1 | 0.3% | 1 | 100.0% |
| enc_a3_fever_pack | 3 | 1 | 0.3% | 3 | 33.3% |
| enc_a2_trihammer | 2 | 1 | 0.3% | 2 | 50.0% |
| enc_a3_leukarch | 3 | 1 | 0.3% | 1 | 100.0% |
| enc_a1_titan | 1 | 1 | 0.3% | 46 | 2.2% |
| enc_a2_furnace | 2 | 1 | 0.3% | 2 | 50.0% |

### HP at boss entry

| act | boss fights | avg HP | avg HP % |
| --- | --- | --- | --- |
| 1 | 141 | 45.6 | 66.5% |
| 2 | 9 | 47.6 | 71.9% |
| 3 | 1 | 62.0 | 93.9% |

### Floor of death

```
F04   12 ██████████████
F05   18 █████████████████████
F06   19 ██████████████████████
F07   26 ██████████████████████████████
F08   22 █████████████████████████
F10   13 ███████████████
F11   16 ██████████████████
F12   11 █████████████
F13   10 ███████████
F14   11 █████████████
F16   35 ████████████████████████████████████████
F18    8 █████████
F19   16 ██████████████████
F20   28 ████████████████████████████████
F21   16 ██████████████████
F22    7 ████████
F23    9 ██████████
F24    3 ███
F26    3 ███
F27    2 ██
F29    2 ██
F30    3 ███
F32    2 ██
F34    1 █
F35    1 █
F37    1 █
F38    1 █
F43    1 █
F45    1 █
F48    1 █
```

### Card rewards

2394 reward screens, skip rate 22.3%. Δwin = win rate of runs that picked the card in that act minus the class win rate (n = runs). Deck Δ = runs ending with it in the deck vs without.


| card | offered | picked | pick % | on skipped screens | bought | Δwin A1 | Δwin A2 | Δwin A3 | deck Δwin | dmg/combat with |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tide_table | 130 | 129 | 99.2% | 0.0% | 30 | +0.0 (99) | +0.0 (13) | – | +0.0 | 10.0 |
| zenith | 53 | 47 | 88.7% | 0.0% | 0 | +0.0 (42) | +0.0 (4) | – | +0.0 | 10.3 |
| toll_the_hours | 60 | 53 | 88.3% | 0.0% | 1 | +0.0 (45) | +0.0 (6) | +0.0 (1) | +0.0 | 10.8 |
| banked_hours | 126 | 110 | 87.3% | 0.8% | 10 | +0.0 (86) | +0.0 (15) | +0.0 (1) | +0.0 | 10.0 |
| syzygy | 51 | 43 | 84.3% | 0.0% | 0 | +0.0 (37) | +0.0 (6) | – | +0.0 | 10.4 |
| appointed_hour | 133 | 107 | 80.5% | 0.8% | 9 | +0.0 (79) | +0.0 (10) | +0.0 (2) | +0.0 | 10.3 |
| escapement | 136 | 104 | 76.5% | 0.7% | 13 | +0.0 (76) | +0.0 (14) | – | +0.0 | 10.2 |
| tourbillon | 63 | 48 | 76.2% | 0.0% | 1 | +0.0 (43) | +0.0 (4) | – | +0.0 | 10.1 |
| striking_train | 129 | 88 | 68.2% | 10.9% | 11 | +0.0 (75) | +0.0 (5) | – | +0.0 | 9.8 |
| knell | 127 | 86 | 67.7% | 8.7% | 5 | +0.0 (74) | +0.0 (8) | – | +0.0 | 10.2 |
| second_hand | 107 | 69 | 64.5% | 2.8% | 4 | +0.0 (55) | +0.0 (9) | – | +0.0 | 10.2 |
| lighthouse | 57 | 36 | 63.2% | 1.8% | 0 | +0.0 (30) | +0.0 (6) | – | +0.0 | 10.5 |
| spring_tide | 193 | 117 | 60.6% | 10.4% | 14 | +0.0 (101) | +0.0 (6) | +0.0 (1) | +0.0 | 10.2 |
| storm_warning | 132 | 74 | 56.1% | 9.8% | 10 | +0.0 (68) | +0.0 (4) | – | +0.0 | 9.8 |
| heave_to | 138 | 69 | 50.0% | 10.9% | 3 | +0.0 (51) | +0.0 (14) | – | +0.0 | 10.1 |
| portents | 54 | 26 | 48.1% | 3.7% | 0 | +0.0 (21) | +0.0 (5) | – | +0.0 | 10.7 |
| breakwater | 125 | 52 | 41.6% | 8.8% | 4 | +0.0 (38) | +0.0 (13) | – | +0.0 | 10.1 |
| almanac | 189 | 78 | 41.3% | 21.7% | 4 | +0.0 (65) | +0.0 (8) | – | +0.0 | 10.2 |
| seen_it_coming | 52 | 19 | 36.5% | 9.6% | 0 | +0.0 (16) | +0.0 (2) | +0.0 (1) | +0.0 | 10.1 |
| weather_eye | 198 | 58 | 29.3% | 18.2% | 7 | +0.0 (46) | +0.0 (9) | +0.0 (1) | +0.0 | 9.9 |
| watch_bell | 52 | 14 | 26.9% | 15.4% | 0 | +0.0 (11) | +0.0 (2) | – | +0.0 | 10.2 |
| ephemeris | 203 | 53 | 26.1% | 24.6% | 0 | +0.0 (49) | +0.0 (3) | – | +0.0 | 10.3 |
| culmination | 51 | 13 | 25.5% | 2.0% | 0 | +0.0 (11) | +0.0 (2) | – | +0.0 | 10.1 |
| storm_glass | 198 | 48 | 24.2% | 16.7% | 0 | +0.0 (35) | +0.0 (9) | – | +0.0 | 10.6 |
| noon_gun | 198 | 42 | 21.2% | 27.3% | 1 | +0.0 (38) | +0.0 (2) | – | +0.0 | 10.0 |
| sweep_hand | 136 | 27 | 19.9% | 29.4% | 1 | +0.0 (23) | +0.0 (3) | – | +0.0 | 10.5 |
| carillon | 206 | 40 | 19.4% | 28.6% | 0 | +0.0 (39) | – | – | +0.0 | 9.7 |
| quarter_chime | 144 | 26 | 18.1% | 21.5% | 0 | +0.0 (18) | +0.0 (6) | +0.0 (1) | +0.0 | 9.8 |
| mark_the_lull | 123 | 21 | 17.1% | 23.6% | 0 | +0.0 (20) | +0.0 (1) | – | +0.0 | 10.6 |
| polyrhythm | 58 | 9 | 15.5% | 17.2% | 0 | +0.0 (6) | +0.0 (3) | – | +0.0 | 10.9 |
| glance_ahead | 114 | 16 | 14.0% | 25.4% | 0 | +0.0 (15) | +0.0 (1) | – | +0.0 | 10.3 |
| mainspring | 122 | 16 | 13.1% | 27.9% | 0 | +0.0 (15) | +0.0 (1) | – | +0.0 | 9.1 |
| gear_train | 196 | 21 | 10.7% | 28.6% | 0 | +0.0 (20) | +0.0 (1) | – | +0.0 | 9.9 |
| afterpeal | 183 | 17 | 9.3% | 28.4% | 0 | +0.0 (15) | +0.0 (2) | – | +0.0 | 9.0 |
| slack_water | 205 | 15 | 7.3% | 37.6% | 1 | +0.0 (13) | +0.0 (2) | – | +0.0 | 10.2 |
| confluence | 132 | 9 | 6.8% | 34.1% | 0 | +0.0 (9) | – | – | +0.0 | 12.2 |
| perpetual_motion | 52 | 3 | 5.8% | 23.1% | 0 | +0.0 (3) | – | – | +0.0 | 8.4 |
| upbeat | 184 | 10 | 5.4% | 29.9% | 0 | +0.0 (10) | – | – | +0.0 | 9.5 |
| hasten | 138 | 7 | 5.1% | 27.5% | 0 | +0.0 (3) | +0.0 (4) | – | +0.0 | 10.1 |
| fermata | 131 | 6 | 4.6% | 38.9% | 0 | +0.0 (6) | – | – | +0.0 | 10.0 |
| balance_wheel | 201 | 9 | 4.5% | 27.9% | 0 | +0.0 (7) | +0.0 (2) | – | +0.0 | 9.4 |
| batten_down | 133 | 5 | 3.8% | 31.6% | 0 | +0.0 (4) | +0.0 (1) | – | +0.0 | 10.5 |
| parallax | 182 | 5 | 2.7% | 29.7% | 0 | +0.0 (5) | – | – | +0.0 | 10.9 |
| detent | 204 | 5 | 2.5% | 30.4% | 0 | +0.0 (5) | – | – | +0.0 | 9.4 |
| logbook | 186 | 4 | 2.2% | 30.6% | 0 | +0.0 (3) | +0.0 (1) | – | +0.0 | 9.1 |
| turn_the_tide | 143 | 2 | 1.4% | 33.6% | 0 | +0.0 (2) | – | – | +0.0 | 8.7 |
| pinion_jab | 154 | 2 | 1.3% | 37.7% | 1 | +0.0 (2) | – | – | +0.0 | 10.8 |
| wind_forward | 205 | 2 | 1.0% | 33.7% | 0 | +0.0 (1) | +0.0 (1) | – | +0.0 | 10.9 |
| dead_reckoning | 190 | 1 | 0.5% | 34.7% | 0 | – | +0.0 (1) | – | +0.0 | 13.2 |
| downbeat | 195 | 0 | 0.0% | 29.7% | 0 | – | – | – | +0.0 | 0.0 |
| reef_the_sails | 185 | 0 | 0.0% | 34.6% | 0 | – | – | – | +0.0 | 0.0 |
| star_tithe | 65 | 0 | 0.0% | 18.5% | 0 | – | – | – | +0.0 | 0.0 |

### Relics

| relic | runs holding | win Δ (pts) |
| --- | --- | --- |
| chrono_lens | 299 | +0.0 |
| timeline_clamp | 12 | +0.0 |
| field_dressing | 21 | +0.0 |
| wayfinder_needle | 17 | +0.0 |
| offbeat_drum | 20 | +0.0 |
| geode_heart | 33 | +0.0 |
| tuning_fork | 28 | +0.0 |
| cracked_prism | 25 | +0.0 |
| ghost_lantern | 38 | +0.0 |
| timeline_spool | 18 | +0.0 |
| tally_stick | 27 | +0.0 |
| star_pip | 27 | +0.0 |
| scrap_magnet | 30 | +0.0 |
| fixed_star | 15 | +0.0 |
| concussion_rig | 15 | +0.0 |
| stim_patch | 32 | +0.0 |
| overwatch_drone | 15 | +0.0 |
| shard_lens | 26 | +0.0 |
| dampener_coil | 24 | +0.0 |
| glass_spurs | 27 | +0.0 |
| shard_debt | 35 | +0.0 |
| surveyor_ink | 32 | +0.0 |
| seers_veil | 16 | +0.0 |
| binding_contract | 15 | +0.0 |
| sandglass_bead | 30 | +0.0 |
| bulwark_rivets | 29 | +0.0 |
| cracked_hourglass | 19 | +0.0 |
| shard_writ | 12 | +0.0 |
| hairline_saw | 18 | +0.0 |
| prophet_glass | 11 | +0.0 |
| stasis_engine | 14 | +0.0 |
| exposed_core | 3 | +0.0 |
| void_compass | 9 | +0.0 |
| tender_plating | 6 | +0.0 |
| crown_fragment | 1 | +0.0 |
| metronome_heart | 5 | +0.0 |
| fracture_engine | 11 | +0.0 |
| slow_temper | 14 | +0.0 |
| vial_rack | 8 | +0.0 |
| paradox_coil | 2 | +0.0 |
| shard_crucible | 9 | +0.0 |
| crystal_spine | 8 | +0.0 |
| engine_tooth | 1 | +0.0 |
| gravity_loom | 3 | +0.0 |

Boss relic screens: skip rate 0.0%.


| boss relic | offered | picked | pick % |
| --- | --- | --- | --- |
| ghost_lantern | 41 | 38 | 92.7% |
| cracked_hourglass | 35 | 19 | 54.3% |
| fixed_star | 38 | 15 | 39.5% |
| binding_contract | 34 | 15 | 44.1% |
| stasis_engine | 34 | 14 | 41.2% |
| tender_plating | 50 | 6 | 12.0% |
| exposed_core | 38 | 3 | 7.9% |
| gravity_loom | 34 | 3 | 8.8% |
| ascendant_prism | 35 | 0 | 0.0% |

### Pacts and events

| pact | picked | win Δ (pts) |
| --- | --- | --- |
| pact_purse | 97 | +0.0 |
| pact_hardy | 98 | +0.0 |
| pact_shards | 104 | +0.0 |

| event | seen | option picks |
| --- | --- | --- |
| ev_drowned_shrine | 41 | #1: 2, #2: 39 |
| ev_scavenger_drone | 47 | #0: 41, #2: 6 |
| ev_flickering_medpod | 50 | #0: 33, #1: 15, #2: 2 |
| ev_lost_climber | 45 | #0: 9, #1: 36 |
| ev_oracle_terminal | 13 | #3: 13 |
| ev_rigged_conveyor | 13 | #0: 11, #1: 2 |
| ev_quiet_bench | 48 | #0: 45, #1: 3 |
| ev_memory_pool | 57 | #1: 57 |
| ev_wandering_artificer | 64 | #0: 20, #1: 44 |
| ev_engine_cult | 13 | #0: 1, #1: 12 |
| ev_spore_choir | 36 | #0: 35, #2: 1 |
| ev_singing_geode | 50 | #1: 15, #2: 35 |
| ev_hydroponic_bay | 43 | #0: 43 |
| ev_smelter | 12 | #1: 7, #2: 5 |
| ev_assembly_line | 12 | #0: 12 |
| ev_immune_scan | 2 | #1: 1, #2: 1 |
| ev_crown_vault | 1 | #1: 1 |
| ev_void_lens | 3 | #2: 3 |
| ev_salvage_heap | 12 | #1: 4, #2: 8 |
| ev_tether_merchant | 2 | #0: 2 |

### Economy per act

| act | Shards earned | Shards spent | deck size (end of act) | gold earned | gold spent | removals shop/rest/event/other | upgrades |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 2.71 | 0.57 | 16.2 | 195 | 138 | 0.81 / 0.00 / 0.02 / 0.00 | 1.12 |
| 2 | 0.40 | 0.14 | 19.6 | 27 | 34 | 0.18 / 0.00 / 0.00 / 0.00 | 0.16 |
| 3 | 0.05 | 0.06 | 24.3 | 6 | 3 | 0.01 / 0.00 / 0.00 / 0.00 | 0.00 |

Shard target (GDD §4.5): 3–5 earned per act. Per-act averages are over all runs (runs that died earlier count 0 for later acts).

### Turns and damage per encounter vs ENEMIES §4.1

| encounter | act | room | fights | deaths | avg turns | expected phases | avg HP lost | expected lost | ratio |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| enc_a1_alpha | 1 | elite | 36 | 12 | 6.1 | 2–3 | 22.8 | 24 | 0.95 |
| enc_a1_dreadcap | 1 | elite | 54 | 29 | 7.9 | 5–5 | 34.8 | 20 | 1.74 ⚠ |
| enc_a1_drone_pack | 1 | monster | 139 | 18 | 3.5 | 2–3 | 12.4 | 9 | 1.37 ⚠ |
| enc_a1_drone_puff | 1 | monster | 296 | 0 | 2.8 | 1–2 | 0.8 | 2 | 0.38 |
| enc_a1_empress | 1 | boss | 40 | 4 | 14.8 | 11–11 | 24.6 | 39 | 0.63 |
| enc_a1_flitter_gnasher | 1 | monster | 152 | 19 | 3.2 | 2–3 | 13.5 | 15 | 0.90 |
| enc_a1_gnasher_pair | 1 | monster | 299 | 0 | 2.7 | 1–2 | 8.6 | 3 | 2.87 ⚠ |
| enc_a1_mantis | 1 | monster | 143 | 3 | 4.0 | 2–2 | 7.0 | 9 | 0.78 |
| enc_a1_orchid | 1 | boss | 45 | 5 | 12.2 | 10–10 | 16.2 | 35 | 0.46 |
| enc_a1_ram | 1 | boss | 56 | 26 | 8.6 | 9–9 | 37.4 | 40 | 0.93 |
| enc_a1_spore_cluster | 1 | monster | 136 | 7 | 5.6 | 2–2 | 3.8 | 4 | 0.96 |
| enc_a1_thornback | 1 | monster | 301 | 0 | 4.4 | 2–2 | 13.1 | 11 | 1.19 |
| enc_a1_thornback_drone | 1 | monster | 150 | 26 | 4.4 | 3–3 | 18.1 | 12 | 1.51 ⚠ |
| enc_a1_thornback_wisp | 1 | monster | 151 | 21 | 5.0 | 3–4 | 16.9 | 20 | 0.84 |
| enc_a1_titan | 1 | elite | 46 | 1 | 5.2 | 4–4 | 11.0 | 17 | 0.65 |
| enc_a1_vine_puff | 1 | monster | 155 | 16 | 6.8 | 4–4 | 13.7 | 17 | 0.81 |
| enc_event_spore_choir | 1 | event | 35 | 6 | 7.7 | – | 19.5 | – | – |
| enc_a2_acolyte_golem | 2 | monster | 22 | 6 | 6.1 | 5–5 | 12.3 | 14 | 0.88 |
| enc_a2_acolyte_pack | 2 | monster | 19 | 8 | 3.9 | 4–4 | 10.5 | 20 | 0.53 |
| enc_a2_anvil_hammer | 2 | elite | 5 | 2 | 7.8 | 5–6 | 25.2 | 28 | 0.90 |
| enc_a2_assembler | 2 | boss | 5 | 0 | 12.4 | 10–10 | 7.8 | 35 | 0.22 |
| enc_a2_auditor | 2 | elite | 6 | 0 | 6.3 | 4–4 | 4.0 | 15 | 0.27 |
| enc_a2_boiler | 2 | elite | 4 | 0 | 7.3 | 5–6 | 6.8 | 24 | 0.28 |
| enc_a2_drone_gnasher | 2 | monster | 72 | 2 | 3.9 | 2–2 | 16.1 | 10 | 1.61 ⚠ |
| enc_a2_drone_riveter | 2 | monster | 27 | 19 | 3.3 | 3–4 | 18.0 | 18 | 1.00 |
| enc_a2_drone_trio | 2 | monster | 21 | 7 | 4.0 | 4–4 | 12.0 | 16 | 0.75 |
| enc_a2_furnace | 2 | boss | 2 | 1 | 10.5 | 11–11 | 37.0 | 38 | 0.97 |
| enc_a2_golem_riveter | 2 | monster | 17 | 10 | 5.2 | 5–5 | 16.8 | 24 | 0.70 |
| enc_a2_oracle_golem | 2 | monster | 32 | 13 | 5.7 | 5–5 | 19.5 | 20 | 0.98 |
| enc_a2_oracle_pack | 2 | monster | 38 | 23 | 2.9 | 4–4 | 20.6 | 20 | 1.03 |
| enc_a2_rivet_pair | 2 | monster | 79 | 5 | 3.8 | 1–2 | 18.3 | 4 | 4.56 ⚠ |
| enc_a2_riveter | 2 | monster | 61 | 2 | 4.2 | 2–2 | 12.4 | 5 | 2.49 ⚠ |
| enc_a2_trihammer | 2 | boss | 2 | 1 | 6.0 | 10–10 | 29.5 | 40 | 0.74 |
| enc_event_engine_cult | 2 | event | 12 | 0 | 7.3 | – | 3.5 | – | – |
| enc_a3_cantor | 3 | monster | 2 | 0 | 3.0 | 2–2 | 0.0 | 6 | 0.00 |
| enc_a3_event_horizon | 3 | elite | 1 | 1 | 5.0 | 4–4 | 47.0 | 36 | 1.31 ⚠ |
| enc_a3_fever_pack | 3 | monster | 3 | 1 | 3.7 | 3–3 | 12.3 | 15 | 0.82 |
| enc_a3_geometer | 3 | monster | 5 | 2 | 4.6 | 3–3 | 11.6 | 18 | 0.64 |
| enc_a3_leukarch | 3 | boss | 1 | 1 | 17.0 | 10–10 | 62.0 | 37 | 1.68 ⚠ |
| enc_a3_mote_pair | 3 | monster | 6 | 0 | 3.5 | 1–1 | 9.7 | 3 | 3.22 ⚠ |
| enc_a3_prism_motes | 3 | monster | 2 | 0 | 5.0 | 3–3 | 20.0 | 12 | 1.67 ⚠ |
| enc_a3_seer | 3 | monster | 3 | 0 | 2.7 | 1–1 | 7.3 | 2 | 3.67 ⚠ |
| enc_a3_shard_mote | 3 | monster | 5 | 2 | 2.6 | 1–2 | 22.4 | 5 | 4.48 ⚠ |
| enc_a3_warden_cantor | 3 | monster | 5 | 0 | 7.4 | 4–4 | 7.2 | 18 | 0.40 |
| enc_a3_warden_geometer | 3 | monster | 1 | 0 | 12.0 | 5–5 | 9.0 | 25 | 0.36 |
| enc_event_antibodies | 3 | event | 1 | 0 | 3.0 | – | 4.0 | – | – |

### Mechanic telemetry

| metric | value |
| --- | --- |
| Onslaught at Attack play (mean) | 0.00 |
| Onslaught distribution | 0: 100% |
| Riposte: primed / triggers / fizzles / attack cancels | 192 / 5 / 5 / 8 |
| Riposte triggers per primed card · fizzle rate | 0.03 · 2.6% |
| Guard share of damage prevented (Block+Guard) | 12.5% |
| Guard absorbed / Block absorbed / HP lost to hits | 8233 / 57564 / 34273 |
| Bloom at end: max · total · Bloom cards (per run) | 0.00 · 0.00 · 0.00 |
| Prunes per combat | 0.00 |
| Rot's share of damage dealt | 1.3% |
| Beats per turn (on-beat plays / player turns) | 0.71 |
| Timeline resolutions per combat (added / resolved) | 2.62 (7947 / 7044) |
| Exposed bonus damage per combat | 1.47 |
| Stagger damage prevented per combat (upper bound) | 1.42 |
| Potions used per run | 3.30 |

### Cap hits

Cap hits per player turn: 0.60% (healthy < 1%).


| cap | hits |
| --- | --- |
| cap_hand | 37 |
| cap_stacks | 36 |
| cap_advance | 4 |
| cap_bonus_energy | 1 |
