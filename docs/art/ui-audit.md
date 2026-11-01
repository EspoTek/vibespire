# UI art audit — existing v1 set

Baseline: 188 top-level 32×24 card frames, 72 relics and 16 potions at 16×16, seven opaque 640×360 backdrops. The 16 exploratory cards in `cards/test/` are not runtime atlas frames and are excluded. The existing `cinder_heart` asset is the renamed `furnace_heart` prompt entry; no ID is changed by this pass.

Read `docs/v2/BRIEF.md`, both CLAUDE instruction files, measured `docs/research/art-style.md`, pipeline scripts/manifests and `docs/art/ref/v1-combat.png`. The live reference already has strong colour and a calm forest floor. Preserve that direction.

## Findings

- SMS channel fidelity is already exact across all 283 assets. The weakness is composition at small sizes, rather than insufficient saturation. Black outlines vary from a clean pixel to thick doubled borders that erase small interiors.
- Breaker has too much purple/bronze in some tools; Graft mixes bright cyan crystal anatomy with tiny brown roots; colourless machinery looks Chronist-blue. The style bible fixes the dominant material identities while preserving accepted exceptions.
- Thin diagonals (Heartwood Spear, Excise, Read the Line), clustered machinery (Escapement, Salvage Kit), and tiny appendages (Hivestrike, Deep Graft) look better enlarged than on a real card. Death Cap communicates the wrong object.
- Relic silhouettes lose semantic features when chain/outline consumes their interior: Heavy Heart and Engine Tooth are the clearest failures. Several branches, blades, seeds and nets need wider bodies and fewer stray pixels. Potion Rewind's plus-like mark is particularly misleading.
- Forest/Foundry/Rest have strong quiet floors. Crown and Event have finer seams/masonry; Event's bright floor is the least restrained. Shop is substantially coarser, with partly clipped jars. The weakest three backdrops receive a common 2× construction grid and quieter central values.

## Selection and score method

Scores are editorial judgements after viewing labelled 1× and NEAREST 4× sheets, informed by dimension, alpha and palette measurements. P/R/X/C/M = palette / readability / pixel cleanliness / coherence / meaning. For locations M also covers gameplay space. A 4 is acceptable production art, not proof of literal hardware authenticity. All five scores are independent; exact palette does not imply a clear image.

The original selection was the weakest third per set: 63/188 cards, 24/72 relics, 6/16 potions, 3/7 backdrops. Round two restores nine rejected cards and eight rejected relics before sparse cleanup, and repairs the event floor. All other round-one images are held byte-identical. Scores were re-evaluated with the lead's density/character criterion; earlier blanket 4/5 claims are withdrawn. A restored original is not credited with a readability jump simply because its palette is exact.

Detail density compares the round-two edit with HEAD. Equal means original illustrated parts, texture and material ramps retained; material-pixel coverage is supporting evidence, not a substitute for visual judgement. Every revised sprite has identical alpha and only 1–7 repaired pixels. Held accepted round-one art is labelled explicitly; it is not claimed to pass a new density comparison. The review lists its remaining outliers.

## Cards

| ID | Before P/R/X/C/M | After P/R/X/C/M | Detail density vs original | Finding / treatment |
|---|---|---|---|---|
| `afterpeal` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `almanac` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `anneal` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `answering_steel` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Thin or crowded steel forms; bronze/violet overtake the steel/red identity. |
| `anvil_heart` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `appointed_hour` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `arc_lattice` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `balance_wheel` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `ballast_lock` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `banked_hours` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `barb_flick` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `batten_down` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `bind_the_blade` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Thin or crowded steel forms; bronze/violet overtake the steel/red identity. |
| `blightcap` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Fine roots, strands or overlapping anatomy; cyan/brown compete with green/violet. |
| `brace` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `breach_hammer` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `breakwater` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `bulwark` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `burl_wall` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `canker_bite` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Fine roots, strands or overlapping anatomy; cyan/brown compete with green/violet. |
| `canopy_crush` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `carillon` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `catch_blade` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `chain_driver` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Thin or crowded steel forms; bronze/violet overtake the steel/red identity. |
| `chitin_cocoon` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `chitin_ram` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `choking_spores` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `cinder_heart` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `clean_manifest` | 5/4/3/4/4 | 5/4/3/4/4 | ≥ original: original form/ramps/texture retained; see per-pixel evidence in ui-review.md | Original blade over golden scroll retained; two stray warm shades consolidated. |
| `coiled_strike` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Thin or crowded steel forms; bronze/violet overtake the steel/red identity. |
| `confluence` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `cool_the_steel` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `counterweight` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Thin or crowded steel forms; bronze/violet overtake the steel/red identity. |
| `crossed_blades` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `crystal_graft` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `culmination` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `cutting_torch` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `dead_reckoning` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `death_cap` | 5/2/3/3/2 | 5/4/4/3/4 | Held: lead accepted round one; no round-two replacement | Large cap is clear, but its uniform violet face and regular spots remain flat. Score floor 3; retained under do-no-harm rule. |
| `decomposer` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `deep_graft` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Fine roots, strands or overlapping anatomy; cyan/brown compete with green/violet. |
| `detent` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `downbeat` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `dusk_pruning` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Fine roots, strands or overlapping anatomy; cyan/brown compete with green/violet. |
| `en_garde` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `endless_maul` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Thin or crowded steel forms; bronze/violet overtake the steel/red identity. |
| `ephemeris` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `escapement` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Abstract timing motif or thin pointer; reduce small internal detail. |
| `excise` | 5/2/3/3/2 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Thin grey implement and violet roots disappear at 1×; cut is unclear. |
| `fault_beacon` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `fault_line` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Thin or crowded steel forms; bronze/violet overtake the steel/red identity. |
| `fault_reader` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Thin or crowded steel forms; bronze/violet overtake the steel/red identity. |
| `feint_step` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `fermata` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `find_the_seam` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Thin or crowded steel forms; bronze/violet overtake the steel/red identity. |
| `forge_oath` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Thin or crowded steel forms; bronze/violet overtake the steel/red identity. |
| `fungal_aegis` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `gauntlet_tap` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `gear_train` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `glance_ahead` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `graft_hide` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `grafting_cut` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Fine roots, strands or overlapping anatomy; cyan/brown compete with green/violet. |
| `grav_clamp` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `gyro_jammer` | 5/3/3/4/4 | 5/3/3/4/4 | ≥ original: original form/ramps/texture retained; see per-pixel evidence in ui-review.md | Original gimbal, axle, brass hub and blue/cyan rim retained; six violet shadow pixels become navy. |
| `hairline_mark` | 5/3/3/4/4 | 5/3/3/4/4 | ≥ original: original form/ramps/texture retained; see per-pixel evidence in ui-review.md | Original chisel, branching red fissure and shaded plate retained; one warm highlight consolidated. |
| `hammerfall` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `hasten` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `heartwood_spear` | 5/2/3/3/2 | 5/4/4/3/4 | Held: lead accepted round one; no round-two replacement | Readable spear has a simpler shaft and leaf head than the organic cards. Score floor 3; retained under do-no-harm rule. |
| `heave_to` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Abstract timing motif or thin pointer; reduce small internal detail. |
| `hew` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `hivestrike` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Fine roots, strands or overlapping anatomy; cyan/brown compete with green/violet. |
| `humus_rite` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `husk` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `hyphal_web` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `iron_avalanche` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Thin or crowded steel forms; bronze/violet overtake the steel/red identity. |
| `iron_rhythm` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `jackhammer` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Thin or crowded steel forms; bronze/violet overtake the steel/red identity. |
| `jettison_pod` | 5/4/3/4/4 | 5/4/3/4/4 | ≥ original: original form/ramps/texture retained; see per-pixel evidence in ui-review.md | Original nested pod ribs, canopy, core and facets retained; one stray slate shade consolidated. |
| `knell` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Abstract timing motif or thin pointer; reduce small internal detail. |
| `lash` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `leaf_litter` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `lighthouse` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `living_hedge` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Fine roots, strands or overlapping anatomy; cyan/brown compete with green/violet. |
| `loaded_spring` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `logbook` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `mainspring` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `mark_the_lull` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `medbay_voucher` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `miasma_sweep` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Fine roots, strands or overlapping anatomy; cyan/brown compete with green/violet. |
| `mire_carapace` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Fine roots, strands or overlapping anatomy; cyan/brown compete with green/violet. |
| `mirror_tether` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `mulch_maul` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Fine roots, strands or overlapping anatomy; cyan/brown compete with green/violet. |
| `noon_gun` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `overdraft_cell` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `overhand_drive` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `parallax` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Abstract timing motif or thin pointer; reduce small internal detail. |
| `parry_ledger` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Thin or crowded steel forms; bronze/violet overtake the steel/red identity. |
| `patient_thorn` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `perpetual_motion` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `pinion_jab` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Abstract timing motif or thin pointer; reduce small internal detail. |
| `piston_jab` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `piston_volley` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `pivot_sweep` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `planted_feet` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Thin or crowded steel forms; bronze/violet overtake the steel/red identity. |
| `plate_ram` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `pollen_sting` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Fine roots, strands or overlapping anatomy; cyan/brown compete with green/violet. |
| `polyrhythm` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `portents` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `prism_edge` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `prism_resonance` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `prism_thorn` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Fine roots, strands or overlapping anatomy; cyan/brown compete with green/violet. |
| `propagate` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `puffball` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `pulse_shot` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `quake_hammer` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `quarter_chime` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `quench` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `quickening_sap` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `rampart_crash` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `reactive_plate` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `read_the_blow` | 5/3/3/3/3 | 5/4/4/3/4 | Held: lead accepted round one; no round-two replacement | Large blue hand plane has less modelling than the nearby gauntlet art. Score floor 3; retained under do-no-harm rule. |
| `read_the_line` | 5/3/3/4/3 | 5/3/3/4/3 | ≥ original: original form/ramps/texture retained; see per-pixel evidence in ui-review.md | Original brass calipers over a shaded blue blade retained; one pink handle pixel becomes warm brass highlight. |
| `reaping_vine` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Fine roots, strands or overlapping anatomy; cyan/brown compete with green/violet. |
| `recoil_spring` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Thin or crowded steel forms; bronze/violet overtake the steel/red identity. |
| `reef_the_sails` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `relay_ping` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `return_stroke` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `ride_the_surge` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `ripening_rot` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `rivet_flurry` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `rivet_wall` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `root_mesh` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `sabre_rattle` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Thin or crowded steel forms; bronze/violet overtake the steel/red identity. |
| `salvage_kiln` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `salvage_kit` | 5/3/3/3/3 | 5/3/3/3/3 | ≥ original: original form/ramps/texture retained; see per-pixel evidence in ui-review.md | Original open case, trays, cables and small fittings retained; three near-duplicate cyan highlights consolidated. |
| `sap_drip` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Fine roots, strands or overlapping anatomy; cyan/brown compete with green/violet. |
| `sap_shell` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `seam_ripper` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `second_hand` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Abstract timing motif or thin pointer; reduce small internal detail. |
| `seed_bite` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Fine roots, strands or overlapping anatomy; cyan/brown compete with green/violet. |
| `seed_rain` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `seen_it_coming` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `shard_cache` | 5/4/4/3/4 | 5/4/4/3/4 | Unchanged original | Untouched legacy chest has broad flat panels beside the detailed colourless machinery. Score floor 3; retained under do-no-harm rule. |
| `shardfall` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `shear` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Fine roots, strands or overlapping anatomy; cyan/brown compete with green/violet. |
| `shed_husk` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `shed_plating` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `shoulder_check` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `slack_water` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Abstract timing motif or thin pointer; reduce small internal detail. |
| `smouldering_core` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `snare_line` | 5/4/3/4/4 | 5/4/3/4/4 | ≥ original: original form/ramps/texture retained; see per-pixel evidence in ui-review.md | Original shaded coil, links and brass end weights retained; one lavender fleck joins the pale-cyan ramp. |
| `spore_haze` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `spore_lash` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Fine roots, strands or overlapping anatomy; cyan/brown compete with green/violet. |
| `sporeburst` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `spring_tide` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `star_survey` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `star_tithe` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `steal_the_swing` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Thin or crowded steel forms; bronze/violet overtake the steel/red identity. |
| `storm_glass` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `storm_warning` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `stress_fracture` | 5/3/3/4/4 | 5/3/3/4/4 | ≥ original: original form/ramps/texture retained; see per-pixel evidence in ui-review.md | Original fractured plates, yellow fault and wear retained; two isolated off-ramp pixels consolidated. |
| `striking_train` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `sweep_hand` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Abstract timing motif or thin pointer; reduce small internal detail. |
| `syzygy` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `tendril_reach` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `thicket_crash` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `thorn_halo` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Fine roots, strands or overlapping anatomy; cyan/brown compete with green/violet. |
| `thornwhirl` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Fine roots, strands or overlapping anatomy; cyan/brown compete with green/violet. |
| `thresher` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `thresher_arc` | 5/2/3/3/2 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Dark crescent competes with the axe instead of describing a sweep. |
| `tick` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Abstract timing motif or thin pointer; reduce small internal detail. |
| `tide_table` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `tock` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Abstract timing motif or thin pointer; reduce small internal detail. |
| `toll_the_hours` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `tourbillon` | 5/3/3/4/4 | 5/3/3/4/4 | ≥ original: original form/ramps/texture retained; see per-pixel evidence in ui-review.md | Original open cage, brass balance, inner mechanism and rim glints retained; seven saturated-blue/violet shadow specks become navy. |
| `transplant` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Fine roots, strands or overlapping anatomy; cyan/brown compete with green/violet. |
| `turn_the_tide` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `twin_thorn` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `upbeat` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `uproot` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Fine roots, strands or overlapping anatomy; cyan/brown compete with green/violet. |
| `vent_pressure` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `verdant_tide` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `ward` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `watch_bell` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `weather_eye` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `wind_forward` | 5/4/4/3/4 | 5/4/4/3/4 | Unchanged original | Untouched legacy winding key is unusually smooth and emblem-like. Score floor 3; retained under do-no-harm rule. |
| `windblown_seed` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Fine roots, strands or overlapping anatomy; cyan/brown compete with green/violet. |
| `zenith` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |

Set mean P/R/X/C/M: **5 / 3.66 / 3.66 / 3.7 / 3.68** → **5 / 3.97 / 3.95 / 3.97 / 3.99**.

## Relics

| ID | Before P/R/X/C/M | After P/R/X/C/M | Detail density vs original | Finding / treatment |
|---|---|---|---|---|
| `ascendant_prism` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `bastion_core` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `binding_contract` | 5/4/3/4/4 | 5/4/4/4/4 | ≥ original: original form/ramps/texture retained; see per-pixel evidence in ui-review.md | Original rolled parchment, folds, ribbon and red seal retained; three olive flecks and one right-edge fold repaired. |
| `bulwark_rivets` | 5/4/3/4/4 | 5/4/4/4/4 | ≥ original: original form/ramps/texture retained; see per-pixel evidence in ui-review.md | Original three shaded rivet heads and shafts retained; six violet/grey flecks join the warm material ramp. |
| `chain_wraps` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `chrono_lens` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `compost_heap` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `concussion_rig` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `cracked_hourglass` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `cracked_prism` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `crowd_breaker` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `crown_fragment` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `crystal_spine` | 5/3/3/3/3 | 5/4/4/3/4 | Held: lead accepted round one; no round-two replacement | Cyan spine has fewer small facets than the crystal family. Score floor 3; retained under do-no-harm rule. |
| `dampener_coil` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `duelists_oath` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `elder_seed` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `engine_tooth` | 5/2/3/3/2 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Small bronze zigzag does not describe a mechanical gear tooth. |
| `exposed_core` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `field_dressing` | 5/4/4/4/4 | 5/4/4/4/4 | ≥ original: original form/ramps/texture retained; see per-pixel evidence in ui-review.md | Original folded cloth, warm crease shading and red binding retained; one dark cloth pixel closes a pinhole. |
| `fixed_star` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `fracture_engine` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `geode_heart` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `ghost_lantern` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `glass_spurs` | 5/3/3/3/3 | 5/3/4/3/3 | Held: lead accepted round one; no round-two replacement | Flat boot/spur planes have less material modelling than the crystal relics. Score floor 3; retained under do-no-harm rule. |
| `grafting_knife` | 5/3/3/3/3 | 5/4/4/3/4 | Held: lead accepted round one; no round-two replacement | Long clean blade has less material texture than the older tools. Score floor 3; retained under do-no-harm rule. |
| `gravity_loom` | 5/4/3/4/4 | 5/4/4/4/4 | ≥ original: original form/ramps/texture retained; see per-pixel evidence in ui-review.md | Original carved uprights, three cyan warps, gold rail and shaded feet retained; two dark upright pixels close gaps. |
| `hairline_saw` | 5/3/3/3/3 | 5/4/4/3/4 | Held: lead accepted round one; no round-two replacement | Broad saw face and regular teeth are more geometric than the older metalwork. Score floor 3; retained under do-no-harm rule. |
| `heartseed` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `heartwood_ring` | 5/3/3/4/4 | 5/3/3/4/4 | ≥ original: original form/ramps/texture retained; see per-pixel evidence in ui-review.md | Original irregular bark, leaf knots and ring hole retained; two dark connector pixels close pinholes. |
| `heavy_heart` | 5/2/3/3/2 | 5/4/4/3/4 | Held: lead accepted round one; no round-two replacement | Solid heart reads clearly, but its grey face is plainer than neighbouring amulets. Score floor 3; retained under do-no-harm rule. |
| `hollow_bough` | 5/3/3/3/3 | 5/4/4/3/4 | Held: lead accepted round one; no round-two replacement | Broad forked branch is readable but smoother and less textured than the wood family. Score floor 3; retained under do-no-harm rule. |
| `kept_fury` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `metronome_heart` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `mycelial_net` | 5/3/3/3/3 | 5/3/4/3/3 | Held: lead accepted round one; no round-two replacement | Orthogonal net and bright corner blocks remain diagram-like. Score floor 3; retained under do-no-harm rule. |
| `notched_buckler` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `nursery_tray` | 5/3/3/3/3 | 5/4/4/3/4 | Held: lead accepted round one; no round-two replacement | Repeated stems and plain tray edge are sparse beside the richer seed relics. Score floor 3; retained under do-no-harm rule. |
| `offbeat_drum` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `oracle_pebble` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `overwatch_drone` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `paradox_coil` | 5/4/3/4/4 | 5/4/4/4/4 | ≥ original: original form/ramps/texture retained; see per-pixel evidence in ui-review.md | Original two shaded loops and brass joint retained; two rim pixels restore a broken dark-blue arc. |
| `parry_charm` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Small interior, fragile stroke or crowded silhouette; simplify and centre at 16px. |
| `plague_bloom` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `pocket_star_chart` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `pollen_sac` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Small interior, fragile stroke or crowded silhouette; simplify and centre at 16px. |
| `practice_dummy` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `prophet_glass` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `riven_gauntlet` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `rot_censer` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `sandglass_bead` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `scrap_magnet` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `seed_pouch` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `seers_veil` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `shard_crucible` | 5/3/3/4/4 | 5/3/3/4/4 | ≥ original: original form/ramps/texture retained; see per-pixel evidence in ui-review.md | Original irregular shards, vessel, feet and sparks retained; three local rim pixels restore cup continuity. |
| `shard_debt` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `shard_lens` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `shard_writ` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `slow_temper` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `star_atlas` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `star_pip` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `stasis_engine` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `stim_patch` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `stormbreak_gem` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Small interior, fragile stroke or crowded silhouette; simplify and centre at 16px. |
| `surveyor_ink` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `tally_stick` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Small interior, fragile stroke or crowded silhouette; simplify and centre at 16px. |
| `tender_plating` | 5/3/3/3/3 | 5/3/4/3/3 | Held: lead accepted round one; no round-two replacement | Red plates retain shallow two-tone shading and little wear. Score floor 3; retained under do-no-harm rule. |
| `timeline_clamp` | 5/4/3/4/4 | 5/4/3/4/4 | ≥ original: original form/ramps/texture retained; see per-pixel evidence in ui-review.md | Original jaw bevels, screw/tail, cyan caps and metal highlights retained; two stray teal shades consolidated. |
| `timeline_spool` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `tuning_fork` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `vial_rack` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `void_compass` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `wayfinder_needle` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Small interior, fragile stroke or crowded silhouette; simplify and centre at 16px. |
| `wild_growth` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Small interior, fragile stroke or crowded silhouette; simplify and centre at 16px. |

Set mean P/R/X/C/M: **5 / 3.72 / 3.68 / 3.78 / 3.75** → **5 / 3.93 / 3.96 / 3.88 / 3.96**.

## Potions

| ID | Before P/R/X/C/M | After P/R/X/C/M | Detail density vs original | Finding / treatment |
|---|---|---|---|---|
| `pot_bastion_tonic` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `pot_blight_vial` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `pot_charge_cell` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `pot_concussion_gas` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `pot_fault_dust` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `pot_flare_cell` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `pot_fury_draught` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Bottle mark is ambiguous or too small; distinguish effect with a large symbol. |
| `pot_growth_sap` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `pot_halt_ampoule` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Bottle mark is ambiguous or too small; distinguish effect with a large symbol. |
| `pot_mending_ampoule` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Bottle mark is ambiguous or too small; distinguish effect with a large symbol. |
| `pot_quicksilver` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `pot_rewind_phial` | 5/2/3/3/2 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Gold mark reads as a plus; backward arrow is lost. |
| `pot_seers_draught` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Bottle mark is ambiguous or too small; distinguish effect with a large symbol. |
| `pot_shard_tincture` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `pot_shield_gel` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `pot_tempo_draught` | 5/3/3/3/3 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Bottle mark is ambiguous or too small; distinguish effect with a large symbol. |

Set mean P/R/X/C/M: **5 / 3.56 / 3.62 / 3.62 / 3.56** → **5 / 4 / 4 / 4 / 4**.

## Backdrops

| ID | Before P/R/X/C/M | After P/R/X/C/M | Detail density vs original | Finding / treatment |
|---|---|---|---|---|
| `act1_verdant` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `act2_foundry` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `act3_crown` | 5/4/3/3/4 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Fine floor grid and crystal microdetail differ from the broad forest/foundry clusters. |
| `event_generic` | 5/3/3/3/4 | 5/4/4/4/4 | ≥ original floor structure: original joints plus two distant courses; accepted quiet walls held | Accepted quiet room retained; original lower floor joints recovered in black on navy, with two distant courses and four aligned perspective joints. |
| `rest_site` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |
| `shop_interior` | 5/4/3/3/4 | 5/4/4/4/4 | Held: lead accepted round one; no round-two replacement | Coarse furniture and clipped top jars; density differs from other locations. |
| `title_spire` | 5/4/4/4/4 | 5/4/4/4/4 | Unchanged original | Retain: readable established house silhouette and palette. |

Set mean P/R/X/C/M: **5 / 3.86 / 3.57 / 3.57 / 4** → **5 / 4 / 4 / 4 / 4**.

## Review artifacts

Complete baseline: `ui-before-{cards,relics,potions,backdrops}-{1x,4x}.png`. Cards also have class-specific 4× sheets. Actual artwork is shown at its labelled scale; captions and margins are editorial furniture.

Final comparison sheets: `ui-before-after-cards.png`, `ui-before-after-icons.png`, `ui-before-after-backdrops.png`; final full-set sheets use `ui-after-` instead of `ui-before-`.

## Limits and remaining work

New v2 card IDs are outside this pass and need the designers' forthcoming art list. Small art communicates the principal action/object, not all timing and combo rules; tooltip and card text remain essential. Existing accepted assets retain some intentional class crystal exceptions. No source, enemy or portrait files are edited.
