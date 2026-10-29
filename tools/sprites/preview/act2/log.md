# Act 2 Foundry review

Built-in imagegen; first-attempt prompts copied verbatim from docs/sprites/enemy_prompts.json. Native sources preserved under raw/native; nonsquare native outputs padded with magenta before NEAREST normalization to 1024 square. Canonical raw/<id>.png holds the selected attempt. Atlas untouched.

| id | attempts | pitch | colours | verdict |
| --- | ---: | ---: | ---: | --- |
| furnace_drone | 3 | 13.57 | 16 | Accept with flag; clean heat ring, lens and nozzles. Weak: reference-guided silhouette still has different body and appendage proportions from Scrap Drone after three attempts. |
| rivet_gnasher | 2 | 10.05 | 16 | Accept; reference-guided open trap jaw, radial frill and crouched feet. |
| cog_acolyte | 3 | 8.11 | 16 | Accept; full halo, robe and censer visible after margin refinement. |
| riveter | 1 | 7.62 | 16 | Accept; gun, clamp and ammunition hopper remain distinct. |
| slag_golem | 1 | 8.70 | 16 | Accept; ingot body, ladle hands and molten chest distinct. |
| loom_oracle | 1 | 3.20 | 16 | Accept; loom frame, scroll and third eye read; fine threads become broad light clusters. |
| the_auditor | 1 | 7.40 | 16 | Accept; abacus, receipt, stamp and four legs readable. |
| anvil_warden | 1 | 9.36 | 16 | Accept; low anvil back and four squat legs give a distinct silhouette. |
| hammer_warden | 1 | 7.20 | 16 | Accept; tall piston spine, hammer top and spiked hands distinct. |
| boiler_tyrant | 1 | 6.41 | 16 | Accept; round boiler, gauge eyes, valve fists and intentional steam puff readable. |
| grand_assembler | 1 | 6.55 | 16 | Accept; four torch arms, glass eye dome and conveyor skirt readable at 96px. |
| assembly_frame | 1 | 1.00 | 16 | Accept; headless open skeleton and hanging cables read. Irregular source grid inspected; explicit pitch 1 used after auto rejected score 0.105. |
| welded_horror | 1 | 6.50 | 16 | Accept; asymmetrical scrap shoulders, giant claw, torch and chest furnace read. |
| furnace_heart | 1 | 5.28 | 16 | Accept; four stacks, bellows lungs, chain hooks and ribcage core distinct. |
| trihammer | 1 | 4.45 | 16 | Accept; armless barrel body with three open sockets, chains and red visor. |
| trihammer_arm | 3 | 10.59 | 16 | Accept; two thick closed chain links and broad hammer preserved after simplification. |

## Generation records
See records.json for exact prompts, source paths and retry changes.

## Validation

All 16 selected files were viewed at exact 4x and reviewed together on contact.png. All are the requested 64x64 or 96x96 RGBA, with binary transparency, transparent black background pixels, black outlines and exactly 16 opaque SMS colours. No ground or shadow residue observed. Boiler Tyrant steam and welding flames are intentional subject effects.

Seven pipeline tests passed; ty passed for the Act 2 helper. Repository npm run typecheck failed on concurrent out-of-scope content/engine/render type mismatches. npm test: 114 passed, 125 failed across 24 files, with engine failures including invalid map weights. No out-of-scope repairs attempted. The shared atlas was not rebuilt; atlas unit tests use temporary fixtures.

Weak flag: furnace_drone remains a readable Foundry drone, but its body and hanging appendage proportions differ from Scrap Drone even after two reference-guided retries. Selected attempt 3. No other weak sprites.
