# Act 1 Verdant Decks generation log

Built-in imagegen; first attempts use enemy_prompts.json verbatim. Native sources preserved in raw/native; pipeline inputs normalized to 1024 square with NEAREST. No atlas rebuilt.

| id | attempts | pitch | colours | verdict |
| --- | ---: | ---: | ---: | --- |
| gnasher | 2 | 9.93 | 16 | Accept: final QA retry retained yellow eyes; distinct open jaw, green collar and crouching four-foot pose. |
| sporepuff | 1 | 14.84 | 16 | Accept: round sleepy eye puffball, leaf fins and intentional yellow spores clearly separated. |
| scrap_drone | 2 | 9.15 | 16 | Accept: rotor, two claws and orange central lens now clear; distinct mechanical silhouette. |
| thornback | 2 | 8.01 | 16 | Accept: heavy head-on tusked boar, purple spine ridge, yellow eyes; whole body clean. |
| vinelash | 2 | 9.48 | 16 | Accept: chunky pitcher maw, looping vines and floating roots; yellow throat clear. Fine vine anatomy stylized. |
| flitterfang | 3 | 8.12 | 16 | Accept: broad purple wings, cyan ear fans, two visible yellow fangs; attempt 2 service failure counted. |
| sickle_mantis | 2 | 5.1 | 16 | Accept: tall narrow mantis, crossed cyan scythes and yellow chest; fine legs intentional. |
| pollen_wisp | 1 | 9.16 | 16 | Accept: seed crown, puff head, petal wings and yellow core; clean fairy silhouette. |
| gnasher_alpha | 3 | 7.85 | 16 | Accept: orange eyes retained, raised claws, crest and muscular biped clearly distinct from Gnasher. |
| dreadcap | 2 | 9.07 | 16 | Accept: huge spotted cap, green gill maw and white claws; yellow spores intentional, no ground residue. |
| shellback_titan | 1 | 9.56 | 16 | Accept: domed split shell, cyan seam, huge hooked mandibles, pale belly and tiny orange eyes. |
| bramble_ram | 3 | 9.12 | 16 | Accept: broad ram horns and planted hooves, clear cyan eyes and orange muzzle; simplified brambles. |
| mother_orchid | 2 | 4.83 | 16 | Accept: regal central pistil, broad cyan petal gown, green floating roots and yellow pollen; square retry. |
| orchid_bud | 1 | 11.08 | 16 | Accept: closed purple bud, yellow seam and coiled cyan stem; clean narrow plant silhouette. |
| gloam_empress | 1 | 6.89 | 16 | Accept: four eye-spotted wings, feathered antennae and amber jewel; clean whole-body moth queen. |

## Prompt changes

- gnasher: Final contact-sheet QA found yellow eyes had merged into lime green. Added two large flat pollen-yellow eyes with black pupils, at least four logical pixels per eye and distinct from green frill.
- sporepuff: None; verbatim source prompt.
- scrap_drone: Replaced red lens with large flat ember-orange lens; removed separate orange light; simplified armour into large cyan/green plates to retain one warm accent.
- thornback: Changed glowing green eyes to large pollen-yellow eyes, explicitly visible at 64px, to preserve the required warm accent.
- vinelash: Thickened three vines to at least three logical pixels, replaced root tangle with four chunky curls, specified white teeth/deep violet maw/yellow throat and no pink highlights.
- flitterfang: Attempt 2: enlarged pollen-yellow fangs and simplified body; image service rejected output (moderation other), no image produced. Attempt 3: replaced tiny yellow fangs with two large bright yellow four-pixel shapes as single warm accent.
- sickle_mantis: Attempt 1 returned portrait rather than square and was rejected before processing. Appended explicit 1024x1024 square canvas and one pollen-yellow chest diamond warm accent.
- pollen_wisp: None; verbatim source prompt.
- gnasher_alpha: Attempt 2: enlarged eyes to three logical pixels, 75 percent occupancy, no scale texture. Attempt 3: enormous flat six-pixel orange eyes, only eight named flat colours, no fine texture, 70 percent square-canvas occupancy and all-side margin.
- dreadcap: Enlarged yellow spores and specified deep-purple flat body clusters, cyan spots, green gills, white claws, no pale pink/lavender highlights or fine texture.
- shellback_titan: None; verbatim source prompt.
- bramble_ram: Attempt 2: simple spiral horns/bands, flat hide clumps, two flowers, larger orange nostrils, cyan-white horns, eight colours. Attempt 3: retained simplification and enlarged orange accent to a solid muzzle covering at least one tenth of face, with black nostril holes.
- mother_orchid: Attempt 1 returned non-square and was rejected before processing. Appended explicit 1024x1024 square image with whole-creature margins.
- orchid_bud: None; verbatim source prompt.
- gloam_empress: None; verbatim source prompt.

## Final validation

All 15 sprites passed dimensions, binary alpha, exact SMS channels, 16-colour cap, black presence, yellow/orange accent presence, and exact NEAREST 4x preview checks. Every sprite was visually inspected at 4x and compared on the contact sheet. No weak sprites flagged. Fine anatomy remains stylized, particularly mantis legs and Vinelash vine count.

Pipeline tests: 12 passed. Helper ty diagnostics: passed. Repository typecheck failed in out-of-scope src/tests. Repository tests: 125 failed, 114 passed, including engine map RNG weight-shape failures. No out-of-scope fixes made; shared atlas not rebuilt.
