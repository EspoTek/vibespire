# Act 3 Crown sprite review

Built-in image generation. First attempts use docs/sprites/enemy_prompts.json verbatim. Native generator outputs preserved in raw/native; pipeline inputs normalized to 1024 square with NEAREST. Each processed preview inspected at exact 4x. No atlas rebuilt.

| id | attempts | pitch | colours | verdict | prompt changes |
| --- | ---: | ---: | ---: | --- | --- |
| void_mote | 1 | 10.65 | 16 | Accept: eye crystal and two satellites read clearly; clean outlined silhouette. | None |
| shardling | 1 | 7.35 | 16 | Accept: broad crystalline crawler; separated legs and bright core. Six-leg anatomy is stylized. | None |
| prism_seer | 2 | 7.01 | 16 | Accept: crown and huge blue iris read clearly; trailing void ribbons distinct from mote. | Attempt 1 was non-square and rejected by ingest. Appended: Generate one 1024x1024 square image; equal width and height. |
| echo_cantor | 2 | 7.11 | 16 | Accept: narrow ring-faced choir robe; prayer pose and fork halo survive reduction. | Attempt 1 non-square. Appended: Generate one 1024x1024 square image; equal width and height. |
| lymph_warden | 1 | 7.58 | 16 | Accept: pale bell, cyan cross and gold orb; separated flowing cilia. | None |
| pyrexia_node | 1 | 9.01 | 16 | Accept: radial ice hexagon ring and gold fever core; clean open gaps. | None |
| void_geometer | 3 | 7.33 | 16 | Accept: broad blade arms and cubic shoulders; simplified third image improves wireframe read. | Attempt 1 non-square. Attempt 2 appended square dimensions. Attempt 3 also requested large chunky cubes, broad blades, thick continuous edges and no tiny details. |
| mirror_knight | 2 | 5.62 | 16 | Accept: broad star cape, crystalline armour and central sword remain readable. | Attempt 1 non-square. Appended: Generate one 1024x1024 square image; equal width and height. |
| phage_mother | 1 | 6.55 | 16 | Accept: upright cell-sac, flagellar crown and dark unborn phages visible around core. | None |
| phage | 1 | 9.94 | 16 | Accept: spiked cyan capsule on stalk with white crawler legs; distinct from squat shardling. Four obvious legs, stylized anatomy. | None |
| event_horizon | 1 | 8.45 | 16 | Accept: unmistakable black sphere with bright horizontal accretion disc and gold pinpoint. | None |
| tether_sovereign | 1 | 4.38 | 16 | Accept: spread arms, floating crown, four tethered gold anchors and star-window torso read at 96px. | None |
| star_archivist | 2 | 7.59 | 16 | Accept: six arms and six tomes clearly separate; lens face and gold astrolabe halo retained. | Attempt 1 failed auto grid score 0.085. Appended square dimensions and large flat clusters on a strict 96x96 grid, no fine decorative texture. |
| leukarch | 1 | 4.96 | 16 | Accept: broad immune-cell king on floating crystal throne; pseudopods, nucleus and orbiting gold orbs readable. | None |
| antibody | 1 | 10.4 | 16 | Accept: bold Y silhouette with cyan tips and gold binding fork; clean simple clusters. | None |

## Final validation

All 15 exact 4x previews reviewed again on checkerboard. All sprites pass target dimensions, binary alpha, SMS channel values, 16-colour cap, presence of black and absence of magenta key residue. All have whole-body front-facing silhouettes and no ground, shadow or scenery residue. No weak silhouettes flagged. Anatomy caveat: Shardling and Phage have four obvious legs rather than six.

Pipeline tests: 7 passed. Repository typecheck and tests fail outside this scope (engine/content/render mismatches, missing engine/enemies module, invalid map weights). Shared atlas untouched.
