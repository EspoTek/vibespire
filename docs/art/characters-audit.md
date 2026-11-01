# Character audit — 30 October 2026

This is the original pre-edit audit. Its regeneration plan and first-round self-scores were superseded by the lead's revision verdict. Current cleanup-first decisions, original-detail comparisons and validation are in [characters-review.md](characters-review.md).

Reviewed all 46 enemies and all six portrait files at native size, 4× NEAREST and, for enemies, at native size over the relevant act backdrop. Reviewed the supplied v1 combat and class-selection captures. Before sheets are `characters-contact-before-1.png` through `-6.png`; portraits are `characters-portraits-before.png`. Each enemy card contains an unscaled crop from a 640×360 act scene, centred at x=320 and with canvas bottom at y=200. Runtime usually enlarges enemies 2× and can select 1× for crowded groups; the audit intentionally stress-tests 1× as requested. The scene is cropped, never scaled.

## What is going wrong

The old `portraits.py` explicitly creates the HUD faces by taking every second pixel of the 64px master. Breaker's eyes become disconnected dots; Graft loses both eye sockets and her flower structure; Chronist's lens becomes a noisy bright oval. These are sampling losses, not soft interpolation. All originals have binary alpha, exact SMS channel values and exactly 16 opaque colours. None needs a generic blur/sharpen filter.

The secondary problem is inconsistent cluster scale. Several Foundry enemies have 1px cross-braces, fingers and rivets all competing with the face; `assembly_frame` is mostly holes and hot speckles. `sickle_mantis` spends almost half the canvas width on empty space, so its narrow green anatomy disappears into the forest. The Crown's white armour sometimes fragments into cyan/white sparkle (`mirror_knight`, `leukarch`, `phage_mother`). The result looks much finer than the broad planes on `void_mote`, `anvil_warden` or `orchid_bud`. Most sprites are lit near-frontally, with bilateral highlights rather than one house direction. Too many use 16 opaque colours, one more than a strict 15+transparent sprite budget.

The strongest identities should be kept: the big frill and mouth on Gnasher; coiled horns on Bramble Ram; one eye on Sporepuff; the mirrored eye-wing pattern on Gloam Empress; orange cores/steel on Foundry enemies; prismatic blue, white and gold on Crown enemies. A repair must keep these cues.

## Scores before work

Scores are visual art-direction judgements, not automated similarity measurements. F = PS fidelity (including outline, ramps and palette), R = silhouette/readability at 1×, P = pixel cleanliness, L = consistent directional light, C = set coherence. 1 unusable; 2 materially weak; 3 usable with visible issues; 4 production-ready; 5 unusually strong. The weakest third is the 16 marked **repair**, with tie-breaks favouring minions, faces and noisy structures. All assets with any score ≤2 are included.

| Enemy | F | R | P | L | C | Decision / evidence |
|---|---:|---:|---:|---:|---:|---|
| antibody | 4 | 5 | 4 | 3 | 4 | Keep clear Y silhouette; bilateral highlights |
| anvil_warden | 4 | 5 | 4 | 4 | 4 | Keep broad anvil/gauntlets |
| assembly_frame | 3 | 2 | 2 | 3 | 2 | **Repair:** spindly skeleton, scattered hot dots |
| boiler_tyrant | 4 | 5 | 4 | 3 | 4 | Keep chimney/eyes/grille read |
| bramble_ram | 4 | 5 | 4 | 3 | 4 | Keep excellent ram/horn mass |
| cog_acolyte | 3 | 3 | 3 | 3 | 3 | **Repair:** face/censer collapse into robe highlights |
| dreadcap | 4 | 4 | 4 | 3 | 4 | Keep broad cap and feet |
| echo_cantor | 4 | 4 | 4 | 3 | 4 | Keep spare robe/halo silhouette |
| event_horizon | 4 | 5 | 4 | 3 | 4 | Keep simple annulus; symmetric emission appropriate |
| flitterfang | 4 | 5 | 4 | 3 | 4 | Keep distinct wings and fangs |
| furnace_drone | 4 | 5 | 4 | 3 | 4 | Keep rotor/core/two limbs |
| furnace_heart | 3 | 4 | 2 | 3 | 3 | **Repair:** tiny slab marks compete with hot chest |
| gloam_empress | 3 | 4 | 2 | 3 | 3 | **Repair:** noisy white thorax and wing flecks |
| gnasher | 4 | 5 | 4 | 3 | 4 | Keep frill/jaw, reduce palette only |
| gnasher_alpha | 4 | 4 | 4 | 3 | 4 | Keep crest, raised fists, tail |
| grand_assembler | 3 | 4 | 2 | 3 | 3 | **Repair:** scaffold lines disappear at 1× |
| hammer_warden | 3 | 3 | 2 | 3 | 3 | **Repair:** tiny limbs under huge hammer head |
| leukarch | 3 | 4 | 2 | 3 | 3 | **Repair:** white tentacle/armour confetti |
| loom_oracle | 3 | 3 | 2 | 3 | 3 | **Repair:** cage, arms and robe overlap |
| lymph_warden | 3 | 3 | 3 | 3 | 3 | **Repair:** white hood, tendrils and gold core merge |
| mirror_knight | 3 | 3 | 2 | 3 | 3 | **Repair:** reflective fragments obscure humanoid anatomy |
| mother_orchid | 4 | 4 | 4 | 3 | 4 | Keep large petals and dangling roots |
| orchid_bud | 4 | 5 | 4 | 4 | 4 | Keep economical closed bud |
| phage | 4 | 5 | 4 | 3 | 4 | Keep faceted head and three legs |
| phage_mother | 3 | 3 | 2 | 3 | 3 | **Repair:** mottled cell interior and thin tendrils |
| pollen_wisp | 4 | 4 | 3 | 3 | 4 | Keep face/wings; tidy decorative dots |
| prism_seer | 4 | 5 | 4 | 3 | 4 | Keep central eye, chunky crown |
| pyrexia_node | 4 | 5 | 4 | 3 | 4 | Keep radial core/spikes |
| rivet_gnasher | 4 | 4 | 3 | 3 | 4 | Keep readable jaws, angular armour |
| riveter | 3 | 3 | 2 | 3 | 3 | **Repair:** gun hand and chest get lost among rivets |
| scrap_drone | 4 | 5 | 4 | 3 | 4 | Keep rotor/eye/body |
| shardling | 4 | 4 | 3 | 3 | 4 | Keep pointed spider silhouette |
| shellback_titan | 4 | 5 | 4 | 3 | 4 | Keep dome and huge grin |
| sickle_mantis | 3 | 2 | 3 | 3 | 2 | **Repair:** 32px-wide body at 64px height; weak arm gaps |
| slag_golem | 4 | 5 | 4 | 3 | 4 | Keep broad steel mass/hot chest |
| sporepuff | 4 | 5 | 3 | 3 | 4 | Keep one eye; reduce loose yellow spores |
| star_archivist | 4 | 4 | 3 | 3 | 4 | Keep six arms/books and halo |
| tether_sovereign | 4 | 4 | 3 | 3 | 4 | Keep broad shoulder mantle and hook arms |
| the_auditor | 4 | 5 | 4 | 3 | 4 | Keep receipt/stamp/ledger |
| thornback | 3 | 4 | 2 | 3 | 3 | **Repair:** fur becomes salt-and-pepper cyan |
| trihammer | 4 | 5 | 4 | 3 | 4 | Keep broad triple hammer machinery |
| trihammer_arm | 4 | 4 | 4 | 4 | 4 | Keep simple hanging hammer |
| vinelash | 4 | 4 | 3 | 3 | 4 | Keep mouth/vine curls; simplification optional |
| void_geometer | 3 | 3 | 2 | 3 | 3 | **Repair:** thin arms and broken highlights |
| void_mote | 4 | 5 | 4 | 4 | 4 | Keep exceptionally clear diamond/eye |
| welded_horror | 3 | 3 | 2 | 3 | 3 | **Repair:** busy arm/leg plate noise |

| Portrait | F | R | P | L | C | Decision |
|---|---:|---:|---:|---:|---:|---|
| breaker.png | 4 | 5 | 4 | 4 | 4 | Keep class-select master |
| graft.png | 4 | 5 | 4 | 4 | 4 | Keep class-select master |
| chronist.png | 4 | 5 | 4 | 4 | 4 | Keep class-select master |
| breaker@32.png | 3 | 3 | 2 | 4 | 3 | Redraw eyes/mouth and armour clusters |
| graft@32.png | 3 | 2 | 2 | 4 | 3 | Redraw eye sockets and shoulder flower |
| chronist@32.png | 3 | 3 | 2 | 4 | 3 | Redraw lens/face and gold clasp |

## Planned acceptance

Regenerate the 16 marked enemies from the README prompt template and the companion style bible, then ingest, postprocess and inspect; hand-clean wherever necessary. Draw three native 32px portraits with explicit pixel placement. Enforce ≤15 colours, binary transparency and silhouette edges on any repaired output; do not claim every retained bilateral-light original is now restaged. Repack the atlas in 96px cells with real 64/96 frame rectangles and verify every crop against its source.
