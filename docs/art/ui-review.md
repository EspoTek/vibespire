# UI art — round-two delivery and self-review

Nine rejected cards and eight rejected relics were restored byte-for-byte from HEAD, then repaired at their native resolution. The event backdrop was also restored before its accepted quiet room was combined with the original floor seam structure. No new art was generated this round. All other round-one art, including every accepted potion, Crown and Shop, is byte-identical to the start of this round. No `src/` file was edited and no git history/index operation was used.

The 17 sprite repairs change only 1–7 pixels each. Their original alpha masks, positions, canvas sizes and black silhouette contours remain intact; 96.3–99.8% of each original’s opaque pixels are identical. The original folds, grain, facets, overlapping machinery, coloured ramps and small highlights survive. The floor again has receding tiles, with black joints on navy rather than bright blue grid lines. Its four main joints align with the recovered original lower slabs; two distant courses establish depth.

## Re-scoring and detail density

P/R/X/C/M = palette / 1× readability / pixel cleanliness / coherence / meaning, each 1–5. The initial audit overvalued simplification; its blanket “all ≥4” conclusion is withdrawn. Restored originals are rescored as originals, without pretending a one-pixel repair transformed their readability. A 3 remains usable but visibly imperfect. No remaining frame scores ≤2, so the listed outliers receive no additional redraw.

“Detail density vs original” is a visual comparison against HEAD: original object parts, material ramps, highlights and texture must remain. Material coverage (opaque non-black pixels) is additional measurable evidence, not a complete aesthetic metric. Equal-density repairs keep every part; the small continuity repairs add material pixels without changing the silhouette. This gate covers every replacement made in this round. Previously accepted images are held as instructed, not retrospectively certified as meeting that gate; their flatter outliers are listed below.

| Asset | Final P/R/X/C/M | Detail density vs original | Material pixels original → final | Pixels repaired | Original opaque pixels identical | Treatment |
|---|---|---|---:|---:|---:|---|
| `clean_manifest` | 5/4/3/4/4 | **≥ original** — equal; 1.000× coverage | 190 → 190 | 2 | 99.49% | Original blade over golden scroll retained; two stray warm shades consolidated. |
| `gyro_jammer` | 5/3/3/4/4 | **≥ original** — equal; 1.000× coverage | 231 → 231 | 6 | 98.62% | Original gimbal, axle, brass hub and blue/cyan rim retained; six violet shadow pixels become navy. |
| `jettison_pod` | 5/4/3/4/4 | **≥ original** — equal; 1.000× coverage | 320 → 320 | 1 | 99.80% | Original nested pod ribs, canopy, core and facets retained; one stray slate shade consolidated. |
| `read_the_line` | 5/3/3/4/3 | **≥ original** — equal; 1.000× coverage | 149 → 149 | 1 | 99.70% | Original brass calipers over a shaded blue blade retained; one pink handle pixel becomes warm brass highlight. |
| `salvage_kit` | 5/3/3/3/3 | **≥ original** — equal; 1.000× coverage | 236 → 236 | 3 | 99.34% | Original open case, trays, cables and small fittings retained; three near-duplicate cyan highlights consolidated. |
| `snare_line` | 5/4/3/4/4 | **≥ original** — equal; 1.000× coverage | 157 → 157 | 1 | 99.76% | Original shaded coil, links and brass end weights retained; one lavender fleck joins the pale-cyan ramp. |
| `stress_fracture` | 5/3/3/4/4 | **≥ original** — equal; 1.000× coverage | 288 → 288 | 2 | 99.54% | Original fractured plates, yellow fault and wear retained; two isolated off-ramp pixels consolidated. |
| `tourbillon` | 5/3/3/4/4 | **≥ original** — equal; 1.000× coverage | 103 → 103 | 7 | 97.76% | Original open cage, brass balance, inner mechanism and rim glints retained; seven saturated-blue/violet shadow specks become navy. |
| `hairline_mark` | 5/3/3/4/4 | **≥ original** — equal; 1.000× coverage | 206 → 206 | 1 | 99.70% | Original chisel, branching red fissure and shaded plate retained; one warm highlight consolidated. |
| `binding_contract` | 5/4/4/4/4 | **≥ original** — equal; 1.000× coverage | 63 → 63 | 4 | 97.40% | Original rolled parchment, folds, ribbon and red seal retained; three olive flecks and one right-edge fold repaired. |
| `bulwark_rivets` | 5/4/4/4/4 | **≥ original** — equal; 1.000× coverage | 55 → 55 | 6 | 96.32% | Original three shaded rivet heads and shafts retained; six violet/grey flecks join the warm material ramp. |
| `heartwood_ring` | 5/3/3/4/4 | **≥ original** — slightly higher: local continuity; 1.028× coverage | 71 → 73 | 2 | 99.10% | Original irregular bark, leaf knots and ring hole retained; two dark connector pixels close pinholes. |
| `paradox_coil` | 5/4/4/4/4 | **≥ original** — slightly higher: local continuity; 1.035× coverage | 57 → 59 | 2 | 98.75% | Original two shaded loops and brass joint retained; two rim pixels restore a broken dark-blue arc. |
| `timeline_clamp` | 5/4/3/4/4 | **≥ original** — equal; 1.000× coverage | 65 → 65 | 2 | 98.89% | Original jaw bevels, screw/tail, cyan caps and metal highlights retained; two stray teal shades consolidated. |
| `gravity_loom` | 5/4/4/4/4 | **≥ original** — slightly higher: local continuity; 1.026× coverage | 76 → 78 | 2 | 99.08% | Original carved uprights, three cyan warps, gold rail and shaded feet retained; two dark upright pixels close gaps. |
| `shard_crucible` | 5/3/3/4/4 | **≥ original** — slightly higher: local continuity; 1.035× coverage | 86 → 89 | 3 | 98.61% | Original irregular shards, vessel, feet and sparks retained; three local rim pixels restore cup continuity. |
| `field_dressing` | 5/4/4/4/4 | **≥ original** — slightly higher: local continuity; 1.012× coverage | 83 → 84 | 1 | 99.45% | Original folded cloth, warm crease shading and red binding retained; one dark cloth pixel closes a pinhole. |
| `event_generic` | 5/4/4/4/4 | **≥ original floor structure** — original lower slabs/joints plus two distant courses; accepted quiet architecture held | 2 original lower courses → 4 courses | Floor only relative to round one | Accepted upper room unchanged | Low-contrast navy/black tile structure; original four main joints, aligned toward the door. |

Full score ledger: [all 283 assets](ui-audit.md), with a density column for each frame and explicit “held” labels for accepted round-one images. Machine-readable [scores](ui-scores.json) and [pixel-repair evidence](ui-revision-metrics.json) accompany it.

| Set | Changed from v1 / total | Repaired this round | Full-set final mean P/R/X/C/M |
|---|---:|---:|---|
| Cards | 63 / 188 | 9 | 5.00 / 3.97 / 3.95 / 3.97 / 3.99 |
| Relics | 24 / 72 | 8 | 5.00 / 3.93 / 3.96 / 3.88 / 3.96 |
| Potions | 6 / 16 | 0 | 5.00 / 4.00 / 4.00 / 4.00 / 4.00 |
| Backdrops | 3 / 7 | 1 | 5.00 / 4.00 / 4.00 / 4.00 / 4.00 |

## Full-set coherence review and retained outliers

All 72 relics and all 188 card frames, including untouched assets, were reviewed at 1× and 4× NEAREST. The restored set again shares the original irregular silhouettes, small facets and dense material treatment. Remaining concerns are all score-floor 3, with no ≤2 frame identified. Accepted assets stay untouched even when their simpler treatment is conspicuous.

| Outlier | Status this round | Final P/R/X/C/M | Remaining difference |
|---|---|---|---|
| `glass_spurs` | Lead accepted; held byte-identical | 5/3/4/3/3 | Flat boot/spur planes have less material modelling than the crystal relics. |
| `hollow_bough` | Lead accepted; held byte-identical | 5/4/4/3/4 | Broad forked branch is readable but smoother and less textured than the wood family. |
| `nursery_tray` | Lead accepted; held byte-identical | 5/4/4/3/4 | Repeated stems and plain tray edge are sparse beside the richer seed relics. |
| `mycelial_net` | Lead accepted; held byte-identical | 5/3/4/3/3 | Orthogonal net and bright corner blocks remain diagram-like. |
| `tender_plating` | Lead accepted; held byte-identical | 5/3/4/3/3 | Red plates retain shallow two-tone shading and little wear. |
| `heavy_heart` | Lead accepted; held byte-identical | 5/4/4/3/4 | Solid heart reads clearly, but its grey face is plainer than neighbouring amulets. |
| `hairline_saw` | Lead accepted; held byte-identical | 5/4/4/3/4 | Broad saw face and regular teeth are more geometric than the older metalwork. |
| `crystal_spine` | Lead accepted; held byte-identical | 5/4/4/3/4 | Cyan spine has fewer small facets than the crystal family. |
| `grafting_knife` | Lead accepted; held byte-identical | 5/4/4/3/4 | Long clean blade has less material texture than the older tools. |
| `death_cap` | Lead accepted; held byte-identical | 5/4/4/3/4 | Large cap is clear, but its uniform violet face and regular spots remain flat. |
| `heartwood_spear` | Lead accepted; held byte-identical | 5/4/4/3/4 | Readable spear has a simpler shaft and leaf head than the organic cards. |
| `read_the_blow` | Lead accepted; held byte-identical | 5/4/4/3/4 | Large blue hand plane has less modelling than the nearby gauntlet art. |
| `shard_cache` | Untouched v1 | 5/4/4/3/4 | Untouched legacy chest has broad flat panels beside the detailed colourless machinery. |
| `wind_forward` | Untouched v1 | 5/4/4/3/4 | Untouched legacy winding key is unusually smooth and emblem-like. |

`salvage_kit` remains the busiest colourless card (5/3/3/3/3): original trays, cables and small fittings can merge at 1×. `read_the_line`, `gyro_jammer`, `stress_fracture`, `tourbillon` and `hairline_mark` retain fine mechanical detail with 3-rated readability/cleanliness. `heartwood_ring` and `shard_crucible` likewise remain dense at 16px. Their character and texture take priority over another simplifying redraw.

## Verification

`uv run ui_validate.py` passes all 283 runtime images: dimensions, exact SMS channels, clean binary sprite alpha, palette budgets, changed-ID coverage, every atlas frame’s pixels, unchanged accepted/untouched files, current 1×/4× sheets and exact 2× backdrop previews. All three atlas JSON files are byte-identical to both the initial audit snapshot and the start of this round, including formatting and frame coordinates. All 265 images outside this round’s 18-item selection are byte-identical; Crown/Shop metadata and 2× previews are also unchanged. Restored cards keep their original ≤16-colour budget; forcing them to ten colours would discard original shading.

Python static diagnostics pass for `ui_audit.py`, `ui_plan.py`, `ui_revision.py`, `ui_retouch.py` and `ui_validate.py` (`ty check --python .venv`). No LSP connector is available, so these diagnostics were run directly.

Repository checks were rerun on the concurrent working tree. `npm run typecheck` fails in `src/content/cards/chronist.ts` on unresolved `PM_USED` and a missing `discount` property. `npm test` reports 13 passing files and 35 failing files, 139 passing tests and one failing assertion: the missing `PM_USED` prevents most suites importing content, and the action binding test expects 24 entries but gets 25. Sprite unittest results are 13 pass, one fail: the existing enemy-atlas contract still expects the old four enemy IDs. These files are outside this assignment and were not edited. Logs remain under `/private/tmp/vibespire-ui-art/round2/`.

Offline pixel and full-set review is complete. In-game browser verification was not repeated this round.

## Sheet paths

- Final full-set relics: [1× — all 72](ui-final-relics-1x.png), [4× — all 72](ui-final-relics-4x.png).
- Final full-set card art: [1× — all 188](ui-final-cards-1x.png), [4× — all 188](ui-final-cards-4x.png).
- This round, three-way original / rejected / final: [nine cards](ui-round2-cards.png), [eight relics](ui-round2-relics.png), [event floor](ui-round2-backdrops.png).
- Updated v1 → final before/after: [63 cards](ui-before-after-cards.png), [30 relics/potions](ui-before-after-icons.png), [three backdrops](ui-before-after-backdrops.png).
- Updated full inventory: `ui-after-{cards,relics,potions,backdrops}-{1x,4x}.png`, plus class-specific card sheets at 4×.

## Repeatable workflow

From `tools/sprites`, set `UV_CACHE_DIR=/private/tmp/vibespire-uv-cache`. Run `uv run ui_revision.py apply`, `uv run ui_audit.py rebuild`, `uv run ui_audit.py after`, `uv run ui_audit.py compare`, `uv run ui_revision.py sheets`, then `uv run ui_validate.py`. `ui_revision.py` reads HEAD only for its explicitly listed rejected files. Its event input and three-way sheets use the preserved round-one snapshot at `/private/tmp/vibespire-ui-art/round2/round1`; the initial v1 snapshot remains at `/private/tmp/vibespire-ui-art/before`. The shipped game and delivered sheets do not depend on scratch inputs.

The old `ui_retouch.py` command is deliberately disabled: its round-one recipes remain as provenance, and rerunning them would reintroduce the rejected simplified art. This round adds no generated-image prompt or image-generation dependency.
