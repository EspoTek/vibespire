# Balance report: graft-g1

Generated 2026-10-29 by `sim/report.ts` from `sim/out/g1.json`.

| class | policy | content | runs | seed prefix | overrides | sim time |
| --- | --- | --- | --- | --- | --- | --- |
| graft | greedy | real | 200 | sim | none | 32.5 s |

## Summary

| class | win rate | stalemates | reach A1 boss | beat A1 boss | beat A2 boss | HP at A1 boss | skip rate | Shards earned A1/A2/A3 | deck size A1/A2/A3 | cap hits / turn |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| graft | 6.5% | 0 | 93.0% | 80.5% | 24.0% | 74.1% | 17.6% | 2.7 / 1.1 / 0.5 | 17 / 20 / 26 | 30.50% |

## Suspects

Cards with a pick rate in the bottom or top 5% of their class (offered ≥ max(10, 1% of screens)), relics with |win Δ| > 10 points (held in ≥ 5% of runs), encounters whose HP lost exceeds ENEMIES §4.1 by > 30% (≥ 10 fights), missed GDD §8.4 milestones, and stalemates (a combat over the turn limit, counted as a loss), and cap-hit rates over 1% of turns. Ranked by severity. Relic and card win deltas carry survivorship bias: runs that live longer collect more relics and cards, so with a low win rate most positive deltas mean "held by runs that got far". Compare them with each other, not with zero.


| class | kind | id | why |
| --- | --- | --- | --- |
| graft | cap | `cap_hits` | caps hit in 30.50% of turns (target < 1%): cap_stacks 3676, cap_hand 190, cap_prune_away 5 |
| graft | encounter | `enc_a3_shard_mote` | HP lost 20.9 vs expected 5 (×4.19; 34 fights, 1 deaths) |
| graft | relic | `concussion_rig` | win Δ +21.5 pts (28 runs) |
| graft | relic | `crystal_spine` | win Δ +20.0 pts (25 runs) |
| graft | relic | `rot_censer` | win Δ +16.3 pts (24 runs) |
| graft | encounter | `enc_a3_mote_pair` | HP lost 9.8 vs expected 3 (×3.26; 35 fights, 2 deaths) |
| graft | relic | `cracked_prism` | win Δ +15.0 pts (44 runs) |
| graft | relic | `scrap_magnet` | win Δ +12.1 pts (44 runs) |
| graft | relic | `dampener_coil` | win Δ +11.9 pts (37 runs) |
| graft | relic | `grafting_knife` | win Δ +11.6 pts (24 runs) |
| graft | relic | `compost_heap` | win Δ +10.2 pts (41 runs) |
| graft | encounter | `enc_a2_rivet_pair` | HP lost 11.7 vs expected 4 (×2.93; 108 fights, 0 deaths) |
| graft | encounter | `enc_a3_seer` | HP lost 4.4 vs expected 2 (×2.21; 26 fights, 0 deaths) |
| graft | milestone | `beat_a2_boss` | 24.0% beat the act 2 boss (target ≥ 50%) |
| graft | encounter | `enc_a2_riveter` | HP lost 9.1 vs expected 5 (×1.82; 111 fights, 0 deaths) |
| graft | card | `dusk_pruning` | pick rate 86.3% (top 5%, offered 168, deck win Δ +3.4 pts) |
| graft | card | `decomposer` | pick rate 85.1% (top 5%, offered 161, deck win Δ +4.9 pts) |
| graft | card | `shed_husk` | pick rate 82.6% (top 5%, offered 242, deck win Δ +6.9 pts) |
| graft | card | `canker_bite` | pick rate 0.0% (bottom 5%, offered 214) |
| graft | card | `puffball` | pick rate 82.0% (top 5%, offered 178, deck win Δ +6.8 pts) |
| graft | card | `propagate` | pick rate 0.0% (bottom 5%, offered 135) |
| graft | card | `verdant_tide` | pick rate 0.0% (bottom 5%, offered 102) |

## graft

| runs | win | stalemates | reach A1 boss | beat A1 boss | reach A2 boss | beat A2 boss | reach A3 boss | deaths A1/A2/A3 | actions (wins) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 200 | 6.5% | 0 | 93.0% | 80.5% | 29.0% | 24.0% | 9.0% | 21% / 60% / 19% | 375 (739) |

GDD §8.4 bot targets: win 25–35%, reach A1 boss ≥ 90%, beat A1 boss ≥ 75%, beat A2 boss ≥ 50%, death share by act ≈ 30/40/30.

### Death heatmap (encounter × act)

| encounter | act | deaths | share of deaths | fights | death rate per fight |
| --- | --- | --- | --- | --- | --- |
| enc_a2_oracle_pack | 2 | 25 | 13.4% | 90 | 27.8% |
| enc_a1_ram | 1 | 23 | 12.3% | 70 | 32.9% |
| enc_a2_oracle_golem | 2 | 18 | 9.6% | 79 | 22.8% |
| enc_a2_drone_riveter | 2 | 16 | 8.6% | 76 | 21.1% |
| enc_a2_golem_riveter | 2 | 16 | 8.6% | 63 | 25.4% |
| enc_a2_acolyte_golem | 2 | 10 | 5.3% | 66 | 15.2% |
| enc_a3_warden_geometer | 3 | 8 | 4.3% | 21 | 38.1% |
| enc_a2_furnace | 2 | 7 | 3.7% | 24 | 29.2% |
| enc_a2_acolyte_pack | 2 | 7 | 3.7% | 75 | 9.3% |
| enc_a2_drone_trio | 2 | 6 | 3.2% | 71 | 8.5% |
| enc_a1_thornback_wisp | 1 | 6 | 3.2% | 146 | 4.1% |
| enc_a3_prism_motes | 3 | 6 | 3.2% | 22 | 27.3% |
| enc_a3_fever_pack | 3 | 5 | 2.7% | 21 | 23.8% |
| enc_a3_sovereign | 3 | 4 | 2.1% | 6 | 66.7% |
| enc_a2_boiler | 2 | 3 | 1.6% | 13 | 23.1% |
| enc_a3_geometer | 3 | 3 | 1.6% | 21 | 14.3% |
| enc_a2_trihammer | 2 | 3 | 1.6% | 14 | 21.4% |
| enc_a1_flitter_gnasher | 1 | 2 | 1.1% | 130 | 1.5% |
| enc_a2_anvil_hammer | 2 | 2 | 1.1% | 14 | 14.3% |
| enc_event_spore_choir | 1 | 2 | 1.1% | 36 | 5.6% |
| enc_a3_mote_pair | 3 | 2 | 1.1% | 35 | 5.7% |
| enc_a1_alpha | 1 | 2 | 1.1% | 63 | 3.2% |
| enc_a1_empress | 1 | 2 | 1.1% | 52 | 3.8% |
| enc_a3_warden_shard | 3 | 2 | 1.1% | 22 | 9.1% |
| enc_a3_shard_mote | 3 | 1 | 0.5% | 34 | 2.9% |
| enc_a1_thornback_drone | 1 | 1 | 0.5% | 130 | 0.8% |
| enc_a3_leukarch | 3 | 1 | 0.5% | 7 | 14.3% |
| enc_a3_mirror_knight | 3 | 1 | 0.5% | 8 | 12.5% |
| enc_a1_vine_puff | 1 | 1 | 0.5% | 153 | 0.7% |
| enc_event_echo | 3 | 1 | 0.5% | 15 | 6.7% |
| enc_a3_cantor | 3 | 1 | 0.5% | 20 | 5.0% |

### HP at boss entry

| act | boss fights | avg HP | avg HP % |
| --- | --- | --- | --- |
| 1 | 186 | 53.8 | 74.1% |
| 2 | 58 | 46.8 | 64.3% |
| 3 | 18 | 53.5 | 73.2% |

### Floor of death

```
F06    1 ██
F07    1 ██
F08    3 █████
F10    2 ███
F11    3 █████
F13    1 ██
F14    3 █████
F16   25 ████████████████████████████████████████
F19   19 ██████████████████████████████
F20   21 ██████████████████████████████████
F21   15 ████████████████████████
F22   14 ██████████████████████
F23    8 █████████████
F24    8 █████████████
F26    8 █████████████
F27    3 █████
F28    2 ███
F29    4 ██████
F30    1 ██
F32   10 ████████████████
F33    1 ██
F35    5 ████████
F36    2 ███
F37    5 ████████
F38    5 ████████
F39    1 ██
F40    1 ██
F42    5 ████████
F43    1 ██
F44    3 █████
F45    1 ██
F48    5 ████████
```

### Card rewards

2990 reward screens, skip rate 17.6%. Δwin = win rate of runs that picked the card in that act minus the class win rate (n = runs). Deck Δ = runs ending with it in the deck vs without.


| card | offered | picked | pick % | on skipped screens | bought | Δwin A1 | Δwin A2 | Δwin A3 | deck Δwin | dmg/combat with |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dusk_pruning | 168 | 145 | 86.3% | 1.8% | 13 | +3.0 (84) | +2.3 (34) | +33.5 (5) | +3.4 | 8.8 |
| decomposer | 161 | 137 | 85.1% | 1.9% | 15 | -2.2 (70) | +4.3 (37) | +20.8 (11) | +4.9 | 9.1 |
| shed_husk | 242 | 200 | 82.6% | 5.4% | 16 | +0.9 (108) | +10.2 (42) | +18.5 (12) | +6.9 | 8.8 |
| puffball | 178 | 146 | 82.0% | 5.6% | 9 | +0.8 (82) | +3.8 (39) | +68.5 (4) | +6.8 | 8.8 |
| thresher | 95 | 75 | 78.9% | 0.0% | 0 | -2.4 (49) | +16.2 (22) | +43.5 (2) | +7.2 | 8.9 |
| hyphal_web | 110 | 86 | 78.2% | 1.8% | 0 | +2.6 (55) | +26.8 (21) | +7.8 (7) | +15.4 | 8.8 |
| miasma_sweep | 161 | 118 | 73.3% | 6.8% | 5 | +0.5 (71) | +5.6 (33) | +43.5 (6) | +3.9 | 8.7 |
| death_cap | 102 | 69 | 67.6% | 2.0% | 1 | -0.5 (50) | +3.5 (10) | +73.5 (5) | +6.9 | 8.7 |
| leaf_litter | 231 | 136 | 58.9% | 10.8% | 3 | -3.0 (85) | +3.8 (29) | +26.8 (6) | -0.6 | 8.9 |
| heartwood_spear | 90 | 53 | 58.9% | 4.4% | 0 | +5.6 (33) | +10.2 (18) | -6.5 (1) | +7.6 | 9.2 |
| ripening_rot | 167 | 98 | 58.7% | 6.0% | 8 | -1.5 (60) | +6.0 (24) | +33.5 (5) | +4.5 | 9.0 |
| uproot | 159 | 83 | 52.2% | 9.4% | 2 | -0.9 (54) | +10.2 (18) | +18.5 (4) | +6.8 | 8.7 |
| burl_wall | 152 | 79 | 52.0% | 11.2% | 4 | +0.8 (41) | +14.9 (28) | +18.5 (8) | +12.1 | 8.7 |
| crystal_graft | 120 | 60 | 50.0% | 5.0% | 0 | +0.6 (42) | -0.3 (16) | +93.5 (2) | +6.1 | 8.9 |
| chitin_cocoon | 94 | 42 | 44.7% | 3.2% | 0 | -2.8 (27) | +11.7 (11) | -6.5 (3) | +1.7 | 9.0 |
| twin_thorn | 171 | 61 | 35.7% | 14.6% | 0 | +1.2 (39) | +7.8 (14) | +13.5 (5) | +6.7 | 8.6 |
| thorn_halo | 159 | 56 | 35.2% | 8.2% | 6 | -3.6 (34) | -0.3 (16) | -6.5 (2) | -4.5 | 9.0 |
| choking_spores | 153 | 53 | 34.6% | 10.5% | 7 | -3.7 (36) | +1.8 (12) | +26.8 (3) | -1.6 | 8.5 |
| spore_haze | 230 | 78 | 33.9% | 17.0% | 4 | -1.2 (57) | -6.5 (16) | -6.5 (2) | -4.4 | 8.9 |
| seed_rain | 171 | 56 | 32.7% | 19.9% | 3 | +5.3 (34) | +14.6 (19) | -6.5 (3) | +6.1 | 8.7 |
| quickening_sap | 93 | 29 | 31.2% | 12.9% | 0 | +7.1 (22) | +22.1 (7) | – | +12.6 | 8.7 |
| reaping_vine | 104 | 31 | 29.8% | 11.5% | 0 | -0.9 (18) | -6.5 (10) | +43.5 (2) | +0.5 | 8.7 |
| blightcap | 210 | 61 | 29.0% | 16.2% | 0 | -3.9 (39) | +26.8 (18) | -6.5 (1) | +7.8 | 9.1 |
| excise | 150 | 43 | 28.7% | 17.3% | 1 | -2.9 (28) | +11.7 (11) | +60.2 (3) | +3.6 | 8.1 |
| patient_thorn | 143 | 38 | 26.6% | 15.4% | 0 | +2.2 (23) | +0.6 (14) | – | +1.7 | 9.2 |
| canopy_crush | 164 | 39 | 23.8% | 23.2% | 0 | +9.5 (25) | -6.5 (10) | +60.2 (3) | +11.0 | 8.8 |
| deep_graft | 229 | 54 | 23.6% | 18.8% | 1 | +3.2 (31) | +22.1 (14) | +33.5 (5) | +13.4 | 9.0 |
| living_hedge | 159 | 37 | 23.3% | 18.9% | 0 | -1.7 (21) | +22.1 (14) | -6.5 (1) | +9.4 | 9.0 |
| tendril_reach | 233 | 52 | 22.3% | 22.7% | 3 | +11.7 (33) | -6.5 (12) | +26.8 (3) | +10.6 | 8.7 |
| humus_rite | 101 | 19 | 18.8% | 9.9% | 0 | +1.8 (12) | +10.2 (6) | +93.5 (1) | +5.1 | 9.0 |
| fungal_aegis | 99 | 14 | 14.1% | 8.1% | 0 | -6.5 (8) | +10.2 (6) | – | +0.7 | 9.4 |
| chitin_ram | 246 | 32 | 13.0% | 25.6% | 0 | +2.2 (23) | -6.5 (7) | +93.5 (2) | +6.7 | 8.2 |
| prism_thorn | 145 | 18 | 12.4% | 13.1% | 0 | -6.5 (14) | -6.5 (2) | +43.5 (2) | -1.0 | 8.5 |
| thornwhirl | 222 | 25 | 11.3% | 27.5% | 2 | -6.5 (21) | +26.8 (3) | – | -2.9 | 8.7 |
| thicket_crash | 147 | 14 | 9.5% | 16.3% | 2 | +10.2 (12) | +43.5 (2) | – | +18.6 | 8.9 |
| sporeburst | 152 | 14 | 9.2% | 20.4% | 0 | -6.5 (3) | +10.2 (6) | +18.5 (4) | +9.5 | 9.1 |
| sap_shell | 242 | 22 | 9.1% | 26.0% | 0 | +3.5 (10) | -6.5 (9) | +26.8 (3) | +2.9 | 8.3 |
| windblown_seed | 250 | 19 | 7.6% | 27.6% | 1 | +3.5 (10) | -6.5 (7) | +43.5 (2) | +3.4 | 8.4 |
| pollen_sting | 157 | 12 | 7.6% | 29.9% | 0 | +7.8 (7) | -6.5 (3) | -6.5 (1) | +2.7 | 8.3 |
| grafting_cut | 241 | 16 | 6.6% | 25.7% | 0 | -6.5 (8) | -6.5 (5) | +60.2 (3) | +6.5 | 8.7 |
| hivestrike | 230 | 12 | 5.2% | 30.4% | 1 | -6.5 (6) | +18.5 (4) | -6.5 (2) | +1.3 | 8.8 |
| root_mesh | 239 | 7 | 2.9% | 27.2% | 0 | -6.5 (1) | +13.5 (5) | -6.5 (1) | +8.1 | 8.8 |
| sap_drip | 238 | 6 | 2.5% | 21.8% | 0 | -6.5 (3) | -6.5 (2) | -6.5 (1) | -6.7 | 8.4 |
| shear | 220 | 5 | 2.3% | 22.3% | 0 | +26.8 (3) | -6.5 (2) | – | +13.8 | 7.3 |
| barb_flick | 242 | 5 | 2.1% | 29.3% | 0 | -6.5 (2) | -6.5 (2) | -6.5 (1) | -6.7 | 9.6 |
| spore_lash | 220 | 3 | 1.4% | 28.2% | 0 | – | -6.5 (1) | -6.5 (2) | -6.6 | 9.0 |
| transplant | 86 | 1 | 1.2% | 17.4% | 0 | -6.5 (1) | – | – | -6.5 | 8.1 |
| mire_carapace | 227 | 2 | 0.9% | 18.5% | 0 | – | – | +43.5 (2) | +43.9 | 10.3 |
| mulch_maul | 218 | 2 | 0.9% | 28.4% | 0 | – | -6.5 (2) | – | -6.6 | 7.5 |
| canker_bite | 214 | 0 | 0.0% | 31.3% | 0 | – | – | – | +0.0 | 0.0 |
| propagate | 135 | 0 | 0.0% | 31.1% | 0 | – | – | – | +0.0 | 0.0 |
| verdant_tide | 102 | 0 | 0.0% | 18.6% | 0 | – | – | – | +0.0 | 0.0 |

### Relics

| relic | runs holding | win Δ (pts) |
| --- | --- | --- |
| gravity_loom | 16 | +47.3 |
| crown_fragment | 11 | +31.6 |
| nursery_tray | 6 | +27.7 |
| concussion_rig | 28 | +21.5 |
| crystal_spine | 25 | +20.0 |
| pocket_star_chart | 17 | +18.6 |
| elder_seed | 17 | +18.6 |
| tender_plating | 9 | +16.5 |
| rot_censer | 24 | +16.3 |
| hollow_bough | 19 | +16.1 |
| cracked_prism | 44 | +15.0 |
| shard_writ | 10 | +14.2 |
| scrap_magnet | 44 | +12.1 |
| dampener_coil | 37 | +11.9 |
| grafting_knife | 24 | +11.6 |
| stasis_engine | 19 | +10.3 |
| compost_heap | 41 | +10.2 |
| ghost_lantern | 59 | +10.0 |
| tally_stick | 34 | +9.9 |
| overwatch_drone | 35 | +9.4 |
| surveyor_ink | 36 | +9.0 |
| stim_patch | 38 | +8.2 |
| engine_tooth | 7 | +8.1 |
| bulwark_rivets | 43 | +6.5 |
| fracture_engine | 16 | +6.5 |
| field_dressing | 34 | +6.3 |
| pollen_sac | 37 | +5.3 |
| wayfinder_needle | 30 | +4.1 |
| binding_contract | 54 | +3.8 |
| mycelial_net | 21 | +3.4 |
| heartwood_ring | 33 | +3.1 |
| shard_lens | 24 | +2.1 |
| plague_bloom | 14 | +0.7 |
| heartseed | 200 | +0.0 |
| slow_temper | 17 | -0.7 |
| hairline_saw | 18 | -1.0 |
| geode_heart | 37 | -1.3 |
| glass_spurs | 37 | -1.3 |
| seed_pouch | 39 | -1.7 |
| shard_debt | 20 | -1.7 |
| vial_rack | 7 | -6.7 |
| exposed_core | 12 | -6.9 |
| void_compass | 16 | -7.1 |
| oracle_pebble | 16 | -7.1 |
| shard_crucible | 24 | -7.4 |
| cracked_hourglass | 40 | -8.1 |

Boss relic screens: skip rate 0.0%.


| boss relic | offered | picked | pick % |
| --- | --- | --- | --- |
| ghost_lantern | 59 | 59 | 100.0% |
| binding_contract | 78 | 54 | 69.2% |
| cracked_hourglass | 63 | 40 | 63.5% |
| stasis_engine | 59 | 19 | 32.2% |
| gravity_loom | 61 | 16 | 26.2% |
| exposed_core | 69 | 12 | 17.4% |
| tender_plating | 72 | 9 | 12.5% |
| wild_growth | 58 | 0 | 0.0% |
| ascendant_prism | 57 | 0 | 0.0% |
| star_atlas | 51 | 0 | 0.0% |

### Pacts and events

| pact | picked | win Δ (pts) |
| --- | --- | --- |
| pact_shards | 71 | -3.5 |
| pact_purse | 61 | -2.3 |
| pact_hardy | 68 | +5.7 |

| event | seen | option picks |
| --- | --- | --- |
| ev_assembly_line | 27 | #0: 27 |
| ev_quiet_bench | 55 | #0: 50, #1: 5 |
| ev_lost_climber | 52 | #0: 6, #1: 46 |
| ev_wandering_artificer | 63 | #0: 20, #1: 43 |
| ev_tether_merchant | 7 | #0: 6, #3: 1 |
| ev_your_echo | 15 | #0: 15 |
| ev_scavenger_drone | 36 | #0: 33, #2: 3 |
| ev_hydroponic_bay | 28 | #0: 28 |
| ev_oracle_terminal | 20 | #0: 16, #3: 4 |
| ev_void_lens | 8 | #2: 8 |
| ev_singing_geode | 35 | #1: 15, #2: 20 |
| ev_spore_choir | 36 | #0: 36 |
| ev_drowned_shrine | 40 | #1: 3, #2: 37 |
| ev_flickering_medpod | 34 | #0: 18, #1: 14, #2: 2 |
| ev_memory_pool | 50 | #1: 50 |
| ev_rigged_conveyor | 21 | #0: 17, #1: 4 |
| ev_engine_cult | 33 | #0: 7, #1: 26 |
| ev_salvage_heap | 20 | #1: 11, #2: 9 |
| ev_smelter | 19 | #1: 16, #2: 3 |
| ev_immune_scan | 10 | #1: 4, #2: 6 |
| ev_prism_garden | 8 | #1: 8 |
| ev_crown_vault | 11 | #1: 11 |

### Economy per act

| act | Shards earned | Shards spent | deck size (end of act) | gold earned | gold spent | removals shop/rest/event/other | upgrades |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 2.75 | 0.68 | 17.5 | 290 | 179 | 0.98 / 0.00 / 0.06 / 1.25 | 1.64 |
| 2 | 1.12 | 0.78 | 20.4 | 121 | 138 | 0.52 / 0.00 / 0.02 / 0.83 | 0.55 |
| 3 | 0.49 | 0.36 | 25.6 | 44 | 58 | 0.14 / 0.00 / 0.01 / 0.14 | 0.38 |

Shard target (GDD §4.5): 3–5 earned per act. Per-act averages are over all runs (runs that died earlier count 0 for later acts).

### Turns and damage per encounter vs ENEMIES §4.1

| encounter | act | room | fights | deaths | avg turns | expected phases | avg HP lost | expected lost | ratio |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| enc_a1_alpha | 1 | elite | 63 | 2 | 5.8 | 2–3 | 14.4 | 24 | 0.60 |
| enc_a1_dreadcap | 1 | elite | 59 | 0 | 6.1 | 5–5 | 6.4 | 20 | 0.32 |
| enc_a1_drone_pack | 1 | monster | 126 | 0 | 3.2 | 2–3 | 7.0 | 9 | 0.77 |
| enc_a1_drone_puff | 1 | monster | 200 | 0 | 2.4 | 1–2 | 0.5 | 2 | 0.23 |
| enc_a1_empress | 1 | boss | 52 | 2 | 8.0 | 11–11 | 19.1 | 39 | 0.49 |
| enc_a1_flitter_gnasher | 1 | monster | 130 | 2 | 2.9 | 2–3 | 8.6 | 15 | 0.57 |
| enc_a1_gnasher_pair | 1 | monster | 199 | 0 | 2.7 | 1–2 | 2.3 | 3 | 0.77 |
| enc_a1_mantis | 1 | monster | 120 | 0 | 3.4 | 2–2 | 4.8 | 9 | 0.54 |
| enc_a1_orchid | 1 | boss | 64 | 0 | 7.4 | 10–10 | 16.4 | 35 | 0.47 |
| enc_a1_ram | 1 | boss | 70 | 23 | 7.0 | 9–9 | 36.3 | 40 | 0.91 |
| enc_a1_spore_cluster | 1 | monster | 124 | 0 | 2.7 | 2–2 | 1.2 | 4 | 0.30 |
| enc_a1_thornback | 1 | monster | 200 | 0 | 4.2 | 2–2 | 9.3 | 11 | 0.84 |
| enc_a1_thornback_drone | 1 | monster | 130 | 1 | 4.0 | 3–3 | 15.2 | 12 | 1.27 |
| enc_a1_thornback_wisp | 1 | monster | 146 | 6 | 4.4 | 3–4 | 14.6 | 20 | 0.73 |
| enc_a1_titan | 1 | elite | 57 | 0 | 5.0 | 4–4 | 7.9 | 17 | 0.47 |
| enc_a1_vine_puff | 1 | monster | 153 | 1 | 5.0 | 4–4 | 7.0 | 17 | 0.41 |
| enc_event_spore_choir | 1 | event | 36 | 2 | 5.3 | – | 8.1 | – | – |
| enc_a2_acolyte_golem | 2 | monster | 66 | 10 | 4.4 | 5–5 | 9.1 | 14 | 0.65 |
| enc_a2_acolyte_pack | 2 | monster | 75 | 7 | 3.8 | 4–4 | 10.3 | 20 | 0.51 |
| enc_a2_anvil_hammer | 2 | elite | 14 | 2 | 5.4 | 5–6 | 17.7 | 28 | 0.63 |
| enc_a2_assembler | 2 | boss | 20 | 0 | 8.3 | 10–10 | 10.1 | 35 | 0.29 |
| enc_a2_auditor | 2 | elite | 11 | 0 | 4.7 | 4–4 | 6.6 | 15 | 0.44 |
| enc_a2_boiler | 2 | elite | 13 | 3 | 5.3 | 5–6 | 17.9 | 24 | 0.75 |
| enc_a2_drone_gnasher | 2 | monster | 102 | 0 | 3.3 | 2–2 | 11.4 | 10 | 1.14 |
| enc_a2_drone_riveter | 2 | monster | 76 | 16 | 3.1 | 3–4 | 11.2 | 18 | 0.62 |
| enc_a2_drone_trio | 2 | monster | 71 | 6 | 3.4 | 4–4 | 8.3 | 16 | 0.52 |
| enc_a2_furnace | 2 | boss | 24 | 7 | 8.2 | 11–11 | 27.0 | 38 | 0.71 |
| enc_a2_golem_riveter | 2 | monster | 63 | 16 | 4.5 | 5–5 | 16.6 | 24 | 0.69 |
| enc_a2_oracle_golem | 2 | monster | 79 | 18 | 4.3 | 5–5 | 14.2 | 20 | 0.71 |
| enc_a2_oracle_pack | 2 | monster | 90 | 25 | 3.2 | 4–4 | 20.3 | 20 | 1.02 |
| enc_a2_rivet_pair | 2 | monster | 108 | 0 | 2.9 | 1–2 | 11.7 | 4 | 2.93 ⚠ |
| enc_a2_riveter | 2 | monster | 111 | 0 | 3.4 | 2–2 | 9.1 | 5 | 1.82 ⚠ |
| enc_a2_trihammer | 2 | boss | 14 | 3 | 7.1 | 10–10 | 25.9 | 40 | 0.65 |
| enc_event_engine_cult | 2 | event | 26 | 0 | 4.9 | – | 5.2 | – | – |
| enc_a3_archivist | 3 | boss | 5 | 0 | 8.2 | 9–9 | 7.4 | 30 | 0.25 |
| enc_a3_cantor | 3 | monster | 20 | 1 | 3.1 | 2–2 | 4.7 | 6 | 0.78 |
| enc_a3_event_horizon | 3 | elite | 5 | 0 | 5.0 | 4–4 | 42.2 | 36 | 1.17 |
| enc_a3_fever_pack | 3 | monster | 21 | 5 | 3.0 | 3–3 | 12.0 | 15 | 0.80 |
| enc_a3_geometer | 3 | monster | 21 | 3 | 3.2 | 3–3 | 11.0 | 18 | 0.61 |
| enc_a3_leukarch | 3 | boss | 7 | 1 | 8.3 | 10–10 | 22.7 | 37 | 0.61 |
| enc_a3_mirror_knight | 3 | elite | 8 | 1 | 4.0 | 3–3 | 16.4 | 15 | 1.09 |
| enc_a3_mote_pair | 3 | monster | 35 | 2 | 2.4 | 1–1 | 9.8 | 3 | 3.26 ⚠ |
| enc_a3_phage_mother | 3 | elite | 5 | 0 | 3.6 | 3–4 | 0.4 | 18 | 0.02 |
| enc_a3_prism_motes | 3 | monster | 22 | 6 | 3.1 | 3–3 | 15.3 | 12 | 1.28 |
| enc_a3_seer | 3 | monster | 26 | 0 | 2.4 | 1–1 | 4.4 | 2 | 2.21 ⚠ |
| enc_a3_shard_mote | 3 | monster | 34 | 1 | 2.6 | 1–2 | 20.9 | 5 | 4.19 ⚠ |
| enc_a3_sovereign | 3 | boss | 6 | 4 | 8.8 | 10–10 | 41.8 | 58 | 0.72 |
| enc_a3_warden_cantor | 3 | monster | 21 | 0 | 4.6 | 4–4 | 7.9 | 18 | 0.44 |
| enc_a3_warden_geometer | 3 | monster | 21 | 8 | 4.4 | 5–5 | 18.2 | 25 | 0.73 |
| enc_a3_warden_shard | 3 | monster | 22 | 2 | 3.5 | 3–3 | 6.8 | 12 | 0.57 |
| enc_event_antibodies | 3 | event | 4 | 0 | 2.0 | – | 4.8 | – | – |
| enc_event_echo | 3 | event | 15 | 1 | 3.7 | – | 10.0 | – | – |

### Mechanic telemetry

| metric | value |
| --- | --- |
| Onslaught at Attack play (mean) | 0.00 |
| Onslaught distribution | 0: 100% |
| Riposte: primed / triggers / fizzles / attack cancels | 192 / 20 / 12 / 52 |
| Riposte triggers per primed card · fizzle rate | 0.10 · 6.3% |
| Guard share of damage prevented (Block+Guard) | 3.3% |
| Guard absorbed / Block absorbed / HP lost to hits | 1702 / 49789 / 32801 |
| Bloom at end: max · total · Bloom cards (per run) | 8.05 · 26.95 · 5.75 |
| Prunes per combat | 1.30 |
| Rot's share of damage dealt | 26.8% |
| Beats per turn (on-beat plays / player turns) | 0.59 |
| Timeline resolutions per combat (added / resolved) | 0.00 (2 / 2) |
| Exposed bonus damage per combat | 0.26 |
| Stagger damage prevented per combat (upper bound) | 0.92 |
| Potions used per run | 6.08 |

### Cap hits

Cap hits per player turn: 30.50% (healthy < 1%).


| cap | hits |
| --- | --- |
| cap_stacks | 3676 |
| cap_hand | 190 |
| cap_prune_away | 5 |
