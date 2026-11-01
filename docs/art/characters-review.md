# Character self-review — revision 2

The lead rejected seven earlier regenerations and two HUD portraits despite the first self-review scores. Those scores overstated the result. This round restores the seven original enemy files from HEAD before cleanup; no new image generation was needed. All three HUD portraits now derive from the accepted 64px masters. The nine accepted enemy repairs are held byte-for-byte.

F/R/P/L/C mean fidelity, native readability, pixel cleanliness, directional light and set coherence. Scores are visual self-assessments, not approval from the lead. The dense restored designs earn 4 for cleanliness, not a claim of perfect simplicity.

**Detail density vs original (DD)** scores meaningful anatomy, layered machinery, ornament, material separation and identity cues. It does not reward random shade speckles. 4 retains all signature motifs; 5 retains unusually dense layered construction. Every replacement is at least its original DD. For the seven restored enemies and four small-enemy cleanups, this judgement is supported by exact 100% silhouette and black structural-ink retention, plus the named feature inventory below. It is not a claim that raw colour entropy increased.

| Asset | Original F/R/P/L/C | Final F/R/P/L/C | Detail density vs original | Result / retained features |
|---|---|---|---|---|
| assembly_frame | 3/2/2/3/2 | 4/4/5/4/4 | 4 → 4 | Accepted, held: rib cage, exposed waist, grippers and separated legs. |
| cog_acolyte | 3/3/3/3/3 | 4/4/4/4/4 | 4 → 4 | Accepted, held: cog halo, black hood, two amber eyes, red robe and censer. |
| furnace_heart | 3/4/2/3/3 | 4/5/4/4/4 | 5 → 5 | Original restored: chimney bank, toothed shoulder drums, ribbed furnace, belly core, hooked hands, layered knee/ankle plates and cabling. |
| gloam_empress | 3/4/2/3/3 | 4/5/5/4/4 | 4 → 4 | Accepted, held: eye-spotted wings, antennae and pale thorax. |
| grand_assembler | 3/4/2/3/3 | 4/5/4/4/4 | 5 → 5 | Original restored: four jointed torch arms, lens dome, X-braced chest, hot conduits, fan-shaped base and rollers. |
| hammer_warden | 3/3/2/3/3 | 4/5/5/4/4 | 4 → 4 | Accepted, held: wide hammer head, hot slit, broad fists and boots. |
| leukarch | 3/4/2/3/3 | 4/4/4/4/4 | 5 → 5 | Original restored: radial crown, peripheral gold orbs, nested ocular halo, layered mantle, hanging plates and dense tentacle court. |
| loom_oracle | 3/3/2/3/3 | 4/4/4/4/4 | 5 → 5 | Original restored: head cage, flanking spool mechanisms, blazing warp column, waist cage, embroidered red robe and hanging needles. |
| lymph_warden | 3/3/3/3/3 | 4/5/5/4/4 | 4 → 4 | Accepted, held: hood, gold core and four separated tendrils. |
| mirror_knight | 3/3/2/3/3 | 4/5/5/4/4 | 4 → 4 | Accepted, held: helmet/visor, faceted plate armour, cape, gauntlets and boots. |
| phage_mother | 3/3/2/3/3 | 4/4/4/4/4 | 5 → 5 | Original restored: branching nerve fan, oval membrane, dark pores, violet nucleus with gold pupil and ciliary filaments. |
| pollen_wisp | 4/4/3/3/4 | 4/4/4/4/4 | 4 → 4 | Same radiant pollen head, face, outlined motes, veined wings and feet; wing shade islands joined. |
| riveter | 3/3/2/3/3 | 4/4/4/4/4 | 5 → 5 | Original restored: bolt crest, recessed visor, panelled torso, round gun, pincer and segmented leg armour. |
| scrap_drone | 4/5/4/3/4 | 4/5/4/4/4 | 4 → 4 | Same rotor, orange eye, machinery and claws; shell/leaf ramps consolidated. |
| shardling | 4/4/3/3/4 | 4/4/4/4/4 | 4 → 4 | Same crown of blades, gold core, faceted shell and articulated legs; pearl/blue shade steps consolidated. |
| sickle_mantis | 3/2/3/3/2 | 4/5/4/4/4 | 4 → 4 | Accepted, held: triangular head, paired eyes, two broad sickles and four legs. |
| sporepuff | 4/5/3/3/4 | 4/5/4/4/4 | 4 → 4 | Same eye, leaf ears, cyan spots and intentional outlined spores; violet ramp tidied. |
| thornback | 3/4/2/3/3 | 4/5/5/4/4 | 4 → 4 | Accepted, held: turquoise boar, violet crest, ivory tusks, gold eyes and stout legs. |
| void_geometer | 3/3/2/3/3 | 4/4/4/4/4 | 4 → 4 | Accepted, held: diamond head, gold slit, four angular arms and geometric robe. |
| welded_horror | 3/3/2/3/3 | 4/4/4/4/4 | 5 → 5 | Original restored: asymmetric pincer/torch, ribbed furnace mouth, shoulder pipes, layered red armour and mismatched legs. |
| breaker@32 | 3/3/2/4/3 | 4/4/4/4/4 | 3 → 4 | 44px head/chest crop; connected brows and blue pupils; master skin/hair, clean chin and original blue-violet armour collar. |
| graft@32 | 3/2/2/4/3 | 4/4/4/4/4 | 3 → 4 | 44px head/chest crop; clean pink face, teal forelock, two readable eyes, cheek vine and violet shoulder blossom. |
| chronist@32 | 3/3/2/4/3 | 4/4/4/4/4 | 3 → 4 | 44px head/chest crop; original blue hood, brown-gold fringe and repaired cyan monocle with gold ring. |

## Cleanup evidence

Original source revision: `8ecf0e2d73b4226d12dba8c21c99e482a9cc3eaf`. The seven restorations were performed with `git show HEAD:<path> > <path>` only inside the enemy asset directory. The reproducible cleanup pins that revision so later commits cannot accidentally become the source. This round changed no src files, index or history.

All eleven cleaned originals already had a continuous black exposed edge and no disconnected one/two-pixel alpha scraps. No extra halo or silhouette smoothing was necessary. Structural black seams, eyes, pores, filaments, bolts and engraved lines were retained. Redundant shades were mapped within materials, unsupported one-pixel material highlights joined to supported neighbours, and reflective patch highlights shifted toward the upper left. Eyes, furnace cores and the pollen head retain emission.

| Cleaned original | Colours | Shade pixels changed | Noise highlights joined | Light pixels adjusted | Silhouette / structural ink retained |
|---|---:|---:|---:|---:|---|
| furnace_heart | 13 | 162 | 23 | 42 | 100% / 100% |
| grand_assembler | 13 | 131 | 8 | 26 | 100% / 100% |
| leukarch | 10 | 1108 | 46 | 300 | 100% / 100% |
| loom_oracle | 12 | 151 | 8 | 60 | 100% / 100% |
| phage_mother | 11 | 367 | 17 | 95 | 100% / 100% |
| pollen_wisp | 11 | 215 | 3 | 44 | 100% / 100% |
| riveter | 11 | 96 | 4 | 27 | 100% / 100% |
| scrap_drone | 9 | 322 | 8 | 40 | 100% / 100% |
| shardling | 9 | 395 | 2 | 69 | 100% / 100% |
| sporepuff | 12 | 164 | 1 | 134 | 100% / 100% |
| welded_horror | 13 | 196 | 8 | 25 | 100% / 100% |

## All nine small enemies at 1x

The comparison sheet includes an actual-size backdrop row for sporepuff, orchid_bud, phage, void_mote, scrap_drone, shardling, pollen_wisp, flitterfang and gnasher. Sporepuff, Scrap Drone, Shardling and Pollen Wisp received the same original-pixel cleanup. The other five already read clearly on their act backgrounds and retain their original bytes. None was enlarged to hide a native-size problem.

The extra crowded-line sheet places four enemies on the same unscaled backdrop, including a Foundry boss with three minions and a Crown boss with three minions. These are offline asset composites using the established review baseline, not browser captures. The backgrounds are snapshotted once for all before/after comparisons.


## HUD identity

All three use source crop `(10,6,54,50)`. Each 44×44 face-and-upper-chest crop is sampled once, directly to 32×32; eyes, brows, nose, mouth and class signifiers are then explicitly cleaned at native resolution. Landmarks first inspected on a wider 52px crop are reprojected onto this tighter crop, so the face fills more of the frame without double-resampling the art. Output colours are a subset of that character’s unchanged master palette (12 colours each). Breaker has a clean chin, blue swept hair and blue-violet armour collar; Graft has flat pink skin, teal hair, cheek vine and a violet flower; Chronist has the original blue hood, brown-gold fringe and cyan monocle.


## Atlas and validation

The atlas remains `{frames:{id:{x,y,w,h}},cell:96}` with identical JSON bytes/layout. All 46 frame crops are checked against their source PNGs. All nine bosses remain 96×96; all other enemy canvases remain 64×64. Only the atlas image changed. Current command results are recorded in [characters-validation.md](characters-validation.md).


## Sheets

- [Main original/final sheet](characters-before-after.png): 23 replacements, 4× plus 1×, with the nine-enemy 1× backdrop row at the top.
- [All nine small enemies, original/final at 1×](characters-1x-backdrops.png).
- [Crowded combat lines at 1×](characters-crowded-1x.png).
- [Accepted 64px identities beside final HUD portraits](characters-portrait-identity.png).
- Full-roster 1×/4×/backdrop sheets: [before 1](characters-contact-before-1.png) / [after 1](characters-contact-after-1.png), [before 2](characters-contact-before-2.png) / [after 2](characters-contact-after-2.png), [before 3](characters-contact-before-3.png) / [after 3](characters-contact-after-3.png), [before 4](characters-contact-before-4.png) / [after 4](characters-contact-after-4.png), [before 5](characters-contact-before-5.png) / [after 5](characters-contact-after-5.png), [before 6](characters-contact-before-6.png) / [after 6](characters-contact-after-6.png).
- All portrait files: [before](characters-portraits-before.png) / [after](characters-portraits-after.png).
- [Before metrics](characters-metrics-before.md), [after metrics](characters-metrics-after.md), [cleanup hashes and counts](characters-cleanup-evidence.json).

## Reproduction

From `tools/sprites` (the accepted nine generation outputs are already delivered):
```sh
UV_CACHE_DIR=/private/tmp/vibespire-uv-cache uv run chars_cleanup.py --apply
UV_CACHE_DIR=/private/tmp/vibespire-uv-cache uv run chars_portraits.py
UV_CACHE_DIR=/private/tmp/vibespire-uv-cache uv run chars_atlas.py
UV_CACHE_DIR=/private/tmp/vibespire-uv-cache uv run chars_report.py
UV_CACHE_DIR=/private/tmp/vibespire-uv-cache uv run python -m unittest -v chars_validate
```
The report rebuilds original comparisons from the pinned Git revision, without needing the earlier temporary snapshot or generated-image files. `chars_process.py` now skips the seven rejected generations. Other retained enemies still include the original bilateral light and 16-colour palettes; they are outside this revision beyond the requested nine-enemy native review. No animations were added.
