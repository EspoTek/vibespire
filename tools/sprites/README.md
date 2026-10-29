# Vibespire sprite pipeline

A standalone uv project (Pillow + NumPy, pinned in `uv.lock`). All Python commands
run through `uv run`. Enemy assets are RGBA PNGs on a fixed 64×64 canvas; content
is cropped internally, fitted with nearest-neighbour sampling, centred in X,
and bottom-aligned to row 63. The final canvas is deliberately **not trimmed**:
that would discard the shared baseline.

## Run

From the repository root:

```sh
cd tools/sprites
# This writable cache was used in the restricted agent environment.
export UV_CACHE_DIR=/private/tmp/vibespire-uv-cache
uv sync --locked

uv run postprocess.py raw/armoured-scorpion.png ../../public/assets/sprites/enemies/armoured-scorpion.png --size 64 --key FF00FF --palette sms --pitch auto --colors 16 --outline 1 --report preview/armoured-scorpion.json
uv run postprocess.py raw/jellyfish-spirit.png ../../public/assets/sprites/enemies/jellyfish-spirit.png --size 64 --key FF00FF --palette sms --pitch auto --colors 16 --outline 1 --report preview/jellyfish-spirit.json
uv run postprocess.py raw/goblin.png ../../public/assets/sprites/enemies/goblin.png --size 64 --key FF00FF --palette sms --pitch auto --colors 16 --outline 1 --report preview/goblin.json
uv run postprocess.py raw/stone-golem.png ../../public/assets/sprites/enemies/stone-golem.png --size 64 --key FF00FF --palette sms --pitch auto --colors 16 --outline 1 --report preview/stone-golem.json

uv run preview.py raw ../../public/assets/sprites/enemies preview
uv run atlas.py ../../public/assets/sprites/enemies ../../public/assets/sprites/enemies-atlas.png ../../public/assets/sprites/enemies-atlas.json --cell 64
uv run python -m unittest -v test_pipeline
```

Open `preview/contact.png`: each row shows the 1024px input at 256px, the result
at exactly 4× on a checkerboard, and the actual 64×64 result. Individual
`preview/<name>@4x.png` files retain transparency and use exact NEAREST scaling.
JSON reports record pitch, phase, confidence, bounding boxes and opaque colour
counts. Bounding boxes are `[left, top, right, bottom]`, with exclusive right
and bottom coordinates.

`raw/` is ignored by **this directory's** `.gitignore`, keeping the root ignore
file outside this task's scope. These large sources stay on the local disk;
they will not follow a Git checkout. Previews, prompts, reports, scripts, lockfile
and final game sprites are intended to be versioned.

## Generation and ingestion

The built-in `image_gen.imagegen` tool generated each monster separately.
The exact prompts, selected generator filenames and iteration numbers are saved
in `prompts.json`. Generation is stochastic; the Python conversion is deterministic.

**Size discrepancy:** every call requested 1024×1024, but this tool actually
returned a 1254×1254 PNG. `raw/native/<name>.png` preserves the unmodified tool
output. `raw/<name>.png` is the explicit 1024×1024 NEAREST-normalized pipeline
input. These normalized files must not be described as untouched generator
originals. `ingest.py` makes both files, refuses non-square/non-PNG inputs and
refuses to overwrite an existing destination.

For a new generated image, copy its reported saved path with:

```sh
uv run ingest.py /absolute/path/from/imagegen.png raw/new-monster.png
uv run postprocess.py raw/new-monster.png ../../public/assets/sprites/enemies/new-monster.png --size 64 --pitch auto --report preview/new-monster.json
```

Exact ingestion commands for the selected test outputs (destinations now exist;
use these in a fresh `raw/` directory):

```sh
uv run ingest.py /Users/chrises/.codex/generated_images/01a184ed-141e-7e51-b9e3-44852efd8170/exec-72e3b16f-378d-42a5-a3b9-6604dd6ba57e.png raw/armoured-scorpion.png
uv run ingest.py /Users/chrises/.codex/generated_images/01a184ed-141e-7e51-b9e3-44852efd8170/exec-bd19bbd0-60a6-4f9d-8a8f-5f7dd587484c.png raw/jellyfish-spirit.png
uv run ingest.py /Users/chrises/.codex/generated_images/01a184ed-141e-7e51-b9e3-44852efd8170/exec-dffd3464-156a-47cc-9805-f0bf455242c1.png raw/goblin.png
uv run ingest.py /Users/chrises/.codex/generated_images/01a184ed-141e-7e51-b9e3-44852efd8170/exec-6bb469ba-608b-4126-98eb-8eb37c40fc1e.png raw/stone-golem.png
```

## Final prompt template

```text
Use case: stylized-concept. Asset type: production enemy sprite for Vibespire.
Generate one 1024x1024 square image.
Sega Master System pixel art enemy sprite in the exact style of Phantasy Star
(1987) battle screens: <MONSTER>, front-facing, centred, symmetrical overall
silhouette, whole body visible, floating on a solid flat magenta background
(#FF00FF) with NO ground, NO shadow, NO scenery.
Strict 8-bit pixel art: hard-edged square pixels on a uniform grid, no
anti-aliasing, no gradients, no blur, flat colours, thick black outline 1-2
logical pixels, limited 16-colour palette of saturated blues, purples, cyans and
greens with one warm accent colour, drawn as if 64x64 pixels upscaled with
nearest neighbour. Use large simple colour clusters, no dithering or tiny
decorative texture. Strong silhouette and unmistakable features at 64x64.
Leave a little magenta margin on all four sides.
No text, no border, no watermark.
```

Monster substitutions:

- Jellyfish: a floating one-eyed jellyfish spirit, one enormous warm yellow iris
  with a black pupil inside a cyan domed bell, purple rim and five short chunky
  curling green tentacles, no extra eyes.
- Goblin: a hunched goblin with a club, squat broad green body, huge pointed
  ears, purple tunic, blue shoulder plates, bent knees and two broad bare feet,
  snarling face with two warm yellow eyes; holds a single simple wooden club
  beside its body; club is the only intentional asymmetry.
- Golem: a stone golem, massive squat blocky humanoid assembled from a few huge
  blue and purple stone slabs, broad shoulders, large fists, two thick separated
  legs with flat feet, small head sunk between shoulders, two warm orange glowing
  eyes, cyan planes and deep black joints.
- Scorpion: a giant armoured scorpion, raised curled stinger above its head, two
  huge open pincers and clearly separated legs. The exact selected prompt in
  `prompts.json` includes the following refinement after the original base prompt.

The first scorpion was too detailed at 64×64. A second generation used this
targeted refinement and was inspected again after conversion:

```text
Refinement for 64x64 readability: drastically simplify the anatomy into large
chunky shapes. Exactly three broad blue body plates, two huge crescent pincers,
three legs on each side separated by wide magenta gaps, and a short thick curled
tail. Each claw and tail must retain a continuous black outline. NO fine armour
scales, NO tiny highlights, NO texture. Use only 8 distinct flat colours: black,
dark blue, blue, cyan, purple, green, orange and pale yellow. Think of an actual
56-pixel-wide by 60-pixel-high sprite, with every logical pixel a large 16x16
square on the requested 1024 canvas.
```

The simplified scorpion is clearer, though the generator still drew only four
obvious walking legs. The rejected first attempt remains in `raw/rejected/`.

## What the conversion does

1. Remove pixels within an RGB Euclidean distance of 80 from the key. Two fringe
   passes also remove pixels within distance 160 **only when at least three
   already-transparent neighbours support removal**. Original transparency is
   honored; remaining alpha is made binary. Change `--tolerance` and
   `--halo-tolerance` if needed. Key-coloured interior details are also removed:
   never use the key as a subject colour.
2. Measure horizontal and vertical colour-change positions, after a temporary
   coarse channel snap that suppresses small colour noise. Score candidate
   periods from 2 to 32 screen pixels in 0.01px increments by Fourier phase
   concentration (the frequency-domain equivalent of periodic autocorrelation).
   Choose the largest peak within 90% of the strongest peak to avoid half-pitch
   harmonics. Estimate X/Y grid phase independently and sample at block centres.
   This is NEAREST sampling, with no interpolation or smoothing. An explicit
   `--pitch N` accepts fractional values and still estimates phase; `--pitch 1`
   treats every source pixel as a real pixel.
3. Crop the recovered grid to opaque content, fit its aspect ratio into the
   target cell, and centre/bottom-align it. Reserve one logical pixel around the
   fitted image, then add a black silhouette outline (`--outline 1`, default).
   This repairs thin outlines lost during grid recovery/downscaling; together
   with surviving source outlines the visible border is usually 1–2px. Use
   `--outline 0` for an already clean source or `--outline 2` for a heavier border.
4. Snap every visible RGB channel to its nearest member of `{00,55,AA,FF}`.
   Then repeatedly merge the least-used colour into its nearest surviving SMS
   colour until at most `--colors 16` remain. Black is preserved for outlines.
   Use `--colors 64` to retain the whole master palette. No dithering. Transparent
   pixels are exactly `(0,0,0,0)`; colour counts exclude transparency.
5. Write the fixed-size PNG and print the report. Invalid files, empty keyed
   subjects, missing key/alpha backgrounds, invalid arguments, and unconvincing
   auto grids raise errors and produce a nonzero exit, without a guessed fallback.

Atlas packing is non-recursive and deterministic by filename. Frame keys are
filename stems; each frame describes its complete 64×64 cell. Smaller images
are centred/bottom-aligned; larger images fail. The destination atlas is excluded
from input enumeration so rerunning in the same folder is safe. For these four
sprites the result is 128×128, with JSON `{ "frames": {...}, "cell": 64 }`.

## Measured results and visual review

Pitch is an **effective estimate**, not proof of a truly uniform source grid.
These generations do not consistently produce the anticipated 6–10 screen-pixel
blocks. Normalized inputs give about 10.69–14.20px; untouched native images give
about 13.10–17.38px. The first rejected scorpion was finer (9.24px normalized).

| Sprite | Pitch, 1024 input | Pitch, 1254 native | Grid score | Colours | 64×64 verdict |
| --- | ---: | ---: | ---: | ---: | --- |
| Armoured scorpion | 11.95 | 14.63 | 0.217 | 16 | Clear pincers and stinger; much better after simplification, walking-leg count is stylized. |
| One-eyed jellyfish spirit | 14.20 | 17.38 | 0.325 | 16 | Very clear eye/bell and five separated tentacles; strongest read. |
| Goblin with club | 13.59 | 16.65 | 0.207 | 16 | Ears, face and club read clearly; pose is fairly upright for a hunched goblin. |
| Stone golem | 10.69 | 13.10 | 0.330 | 16 | Strong heavy silhouette and slab joints; tiny face loses detail. |

All four were viewed in the image viewer at 4× and at native size on the contact
sheet after the final outline pass. The style is SMS-inspired; palette compliance
is exact, while generator anatomy and pixel-grid fidelity remain imperfect.

## Known failure modes

- Irregular pixels: these sources mix block sizes, off-grid edges and minor
  colour variation despite the strict prompt. Scores below 0.3 print a warning;
  below 0.12 auto detection fails and requires inspection/explicit pitch. A
  mathematically strongest period can still give poor art. Inspect every result.
- Detail overload: a high-resolution drawing can satisfy the palette language
  while failing at 64×64. Regenerate with fewer large shapes, as with the scorpion.
- Ground/shadows: none of the selected outputs contained these, but a generated
  ground plane or opaque shadow is foreground to a chroma-keyer. It will stretch
  the bbox and baseline. Regenerate with the no-ground constraint emphasized;
  the script cannot semantically distinguish a shadow from a foot.
- Palette overflow/anti-aliasing: the source produced more than 16 SMS-snapped
  colours, even when explicitly asked for eight. Quantization removes this, but
  reducing the cap too far can merge eyes/highlights. Inspect the warm accent.
- Key spill: low tolerance leaves magenta fringes; high tolerance can eat purple
  edges. Neighbour support limits fringe removal but cannot recover lost art.
- Exact symmetry/anatomy is not guaranteed. The scorpion has fewer walking legs
  than requested, and the goblin's club intentionally breaks symmetry.
- A 64×64 target cannot preserve every source feature; NEAREST introduces uneven
  step widths when the recovered content grid needs a non-integer scale.

## Validation

`uv run python -m unittest -v test_pipeline` checks shifted 8px grid recovery,
centre sampling, neighbour-supported halo removal, SMS palette/cap, bottom
alignment, black outlines, atlas frame/pixel agreement and reruns, exact 4×
previews, and loud failures for invalid content/oversized atlas input.

Python diagnostics were checked with:

```sh
UV_TOOL_DIR=/private/tmp/vibespire-uv-tools uvx ty check --python .venv .
```

Repository `npm run typecheck` passed. Repository `npm test` exited 1 because
there were no Vitest test files when checked; no `src/` files were changed.

## Portraits, card grids and backdrops (2026-10-29)

The paragraph above records the earlier enemy-only run. For this expansion,
12 Python tests and `ty` passed, and repository `npm test` passed (3 tests).
`npm run typecheck` failed on concurrent work outside this scope: missing
engine modules, renderer `.ts` imports, and renderer Mesh member overrides.
No `src/` files were changed by this asset task.

### Renderer asset contract

These are **runtime URLs**; their files live under `public/`. All sprites use
binary RGBA transparency and exact SMS channel values (00/55/AA/FF). The
backdrop is opaque RGB. Select named assets explicitly: contact sheets and
`@2x`/`@4x` review images are not game sprites.

| Kind | URL | Dimensions | Status |
| --- | --- | --- | --- |
| Enemy | `/assets/sprites/enemies/<id>.png` | 64×64 | Existing four enemies retained |
| Class portrait | `/assets/sprites/portraits/<id>.png` | 64×64 | `breaker`, `graft`, `chronist` |
| Small class portrait | `/assets/sprites/portraits/<id>@32.png` | 32×32 | Same three IDs |
| Card illustration | `/assets/sprites/cards/<card-id>.png` | 32×24 | Reserved production convention |
| Test card illustration | `/assets/sprites/cards/test/<name>.png` | 32×24 | Sixteen subjects below |
| Relic icon | `/assets/sprites/relics/<relic-id>.png` | 16×16 | Reserved; no relic icons generated in this task |
| Landscape/interior | `/assets/backdrops/<name>.png` | 640×360 | Seven backdrops listed below; `@2x` files are review previews |

Use NEAREST filtering at runtime. Backdrops are full-screen landscapes, with
black/white floating UI windows supplied by the renderer. They contain no
painted-in UI or enemy. The 640×360 requested export is independent of the
engine's logical display resolution; scale it to the renderer's stage.

### Class portraits

```sh
# From tools/sprites, with UV_CACHE_DIR set as above:
uv run portraits.py raw/portraits/final ../../public/assets/sprites/portraits preview/portraits
```

`portraits.py` uses the existing `process()` at 64×64 (auto pitch, black outline,
16 opaque SMS colours). It re-quantizes the processed 64, reduces with NEAREST
to 32×32, and re-quantizes again. No independently drawn small portrait or
interpolation is used. The six delivered PNGs all contain 16 opaque colours.
`preview/portraits/contact.png` shows each 64 at 4×, each 32 at 8×, and both
native sizes. Individual enlargements and processing JSON sit beside it.

Selected source images are preserved in `raw/portraits/final/native/` at the
generator's actual 1254×1254, with explicit 1024×1024 normalized inputs in
`raw/portraits/final/`. Initial, finer portraits remain in `raw/portraits/`.
The smiling Breaker intermediate is `raw/portraits/final/breaker-smile.png`.

The first portraits were attractive at 64 but lost facial features at 32.
The successful refinement asked for a true 32px drawing with an enlarged face,
chunky eyes, fewer hair strands and large material clusters. The model still
produced roughly 55–64 logical pixels across, so these are inspected results,
not evidence that a prompt enforces a grid.

| Portrait | Effective pitch in 1024 input | Score | Visual verdict |
| --- | ---: | ---: | --- |
| Breaker | 15.99 | 0.666 | Heavy steel-blue/purple pauldrons, bronze trim and focused expression read well; 32px face is sparse. |
| Graft | 18.57 | 0.769 | Cyan clothing, green cheek/shoulder growth and violet bloom distinguish the biomancer at both sizes; fine chitin detail is abstract. |
| Chronist | 16.01 | 0.779 | Strongest class signature: blue star hood, cyan monocle and gold astrolabe remain readable at 32. |

### Card grid slicing

```sh
uv run grid.py raw/cards/test-grid-v1.png ../../public/assets/sprites/cards/test \
  --cols 4 --rows 4 \
  --names heavy-sword-slash,raised-shield,boot-kick,thrown-dagger,sprouting-seed,vine-whip,spore-skull,thorned-heart,hourglass,comet,clock-face,crystal-lens,potion-flask,gold-coins,spiral-vortex,burning-ember
```

Names are row-major, must number exactly `cols * rows`, and must be unique safe
filename stems. `contact` is reserved. Each axis searches for fully keyed
magenta gutter runs within 20% of the expected cell width/height of each
nominal divider. This follows a few pixels of drift and variable gutter widths.
If a complete set of gutters is absent on an axis, that axis uses equal
division, reported explicitly in `grid.json`. Equal division cannot repair
overlapping subjects or the wrong number/order of icons: inspect the sheet.

Each cell goes through the same key, auto-pitch, outline and ≤16-colour SMS
processing at 32×32. Before centre-cropping `(0, 4, 32, 28)`, the outlined
subject is contained within a 32×24 safe area on the square, using only NEAREST
and recentering. This protects tall shields/hourglasses/flasks from being
decapitated by the requested 4:3 crop. It can make tall art narrower than wide
art. The output is re-quantized to ≤16 opaque colours. `--pitch N` is available
for an inspected source whose automatic grid score is insufficient; auto
failures propagate instead of silently guessing.

The output directory contains the sixteen `<name>.png` files, `contact.png`
(4× and native-size views), and `grid.json` (cell bounds, detection modes,
pitch, score and colour counts). The selected generator native PNG was
1254×1254, explicitly normalized by `ingest.py` to the requested 1024×1024.

**Grid verdict: 4×4 worked on the first generated sheet, 16/16 usable.** Both
axes detected magenta gutters. All subjects were in the correct row-major
positions, with no merged cells. The crystal lens reads more as a faceted
crystal than a transparent optical lens, but is a usable distinct crystal icon.
The skull, clock and vortex had weaker pitch scores (~0.25–0.29); their actual
32×24 outputs were viewed and accepted. A 3×3 retry was unnecessary and remains
untested; one successful 4×4 sample is not a statistical reliability guarantee.

### Act 1 backdrop

```sh
uv run backdrop.py raw/backdrops/act1-verdant-v1.png ../../public/assets/backdrops/act1_verdant.png \
  --width 640 --height 360
```

Unlike `ingest.py`, this landscape processor accepts non-square input. It
requires an opaque PNG, centre-crops to the target aspect first (16:9 by
default), detects pitch/phase, samples recovered block centres, resizes with
NEAREST to the exact target, and quantizes to at most 24 SMS colours. It never
chroma-keys a landscape or adds an outline. `--colors` can lower the cap;
`--pitch N` can replace auto detection after inspection. Source and output
must differ. No bilinear/bicubic filtering or new dither is introduced.

Outputs:

- `public/assets/backdrops/act1_verdant.png`: opaque 640×360 production image.
- `public/assets/backdrops/act1_verdant@2x.png`: exact 1280×720 NEAREST preview.
- `public/assets/backdrops/act1_verdant.json`: crop/pitch/palette report.
- `tools/sprites/preview/backdrops/act1-enemy-contrast.png`: review composition
  with all four existing enemies at 128px height, feet at y=200 and y=264.

The generator returned the requested 1536×1024. The centred crop is
`[0, 80, 1536, 944]`, pitch is exactly 8px (score 0.749), recovered image
192×108, final palette 18 colours. The source's subtle floor shading collapsed
to a single flat `#005500` after quantization. No gradient survives in the
clearing. The final horizon is around y=134 (37% down). The central floor
rectangle x=160..479, y=144..239 contains exactly that one green colour.

**Visual verdict:** convincingly SMS-inspired, with a checker canopy, blue
tree wall, purple edge trunks and calm flat grass. It is an 18-colour, 640×360
modern export, not an exact hardware-native Master System screen. The 128px
enemies read at y≈200; dark blue contour fragments compete somewhat with the
tree wall, while cyan faces/plates and the eye stay clear. Contrast is strongest
in the central clearing; keep enemies away from the busy extreme corners.
The middle band needed no regeneration. The native output, exact 2× output,
and enemy overlay were all opened in the image viewer.

### Prompts that worked

Generation used the built-in `image_gen.imagegen` tool. The **exact full
prompts, every iteration, selected iteration, and original saved paths** are
in [`prompts-expansion.json`](prompts-expansion.json). The following are the
working prompt components; combine the shared portrait specification with its
subject and readability refinement as recorded in that JSON.

Portrait shared specification:

```text
Single front-facing head-and-shoulders bust, centred, head large for a readable
face at 32x32. Both shoulders visible, no hands. Background solid flat magenta
#FF00FF. Phantasy Star (Sega Master System, 1987) strict 8-bit pixel art.
Hard square pixels, thick black 1 logical pixel silhouette outline and internal
shape breaks, large flat colour clusters, only two hard tones per material,
at most 16 colours from SMS RGB channels 00/55/AA/FF. No gradients, blur,
anti-aliasing, dithering or tiny decorative texture. No magenta on subject,
no scenery, ground shadow, frame, UI, text or watermark.
```

Selected portrait subjects/refinements:

- **Graft:** lithe human biomancer, calm face, short dark teal hair, cyan and
  green clothing, chunky vine and chitin over one shoulder and a cheek, one
  large violet shoulder bloom. Refine to a true 32px portrait, extra-large
  face, chunky 3×2 eyes with a white corner, clear mouth, only 10 flat colours,
  huge material shapes and no intricate hair strands.
- **Chronist:** thoughtful robed navigator, deep-blue hood, one large cyan
  chrono-lens monocle, gold astrolabe pendant, just two white/cyan four-point
  hood stars. Same 32px readability refinement as Graft.
- **Breaker:** the successful replacement used this shorter prompt, then the
  targeted expression edit below. The earlier long refinement returned no
  image twice (the second response explicitly reported output moderation).

```text
Use case: stylized-concept. Create a friendly adult human fantasy adventurer
portrait for a retro game. One square image, 1024x1024. Head and shoulders
front-facing, short dark hair, confident expression, heavy steel-blue shoulder
armour with purple panels and bronze edging. Huge simple face, chunky readable
eyes, each eye a 3x2 block with white corner, simple mouth, large colour areas.
Authentic 1987 Sega Master System pixel art on a logical 32x32 pixel grid,
enlarged nearest neighbour, black outline, ten flat colours, no gradients or
tiny details. Both shoulders fit inside the image with magenta margins.
Flat #FF00FF background, no text, no frame, no scenery.
```

Breaker expression edit (input: that generated portrait):

```text
Use case: precise-object-edit. Edit this retro game portrait: change only the
face expression to a determined serious expression with a straight closed
mouth and focused brows. Keep the front-facing adult human, short dark hair,
steel-blue and purple heavy shoulder armour, bronze trim, entire composition,
flat magenta background, black pixel outlines, and large simple pixel-art
shapes. No smile. Maintain 8-bit Sega Master System style with at most 16 flat
colours, no gradients or smoothing. Face must read at 32x32.
```

Grid working layout/style instructions (exact full subject list in the command
above and JSON):

```text
ONE 1024x1024 square image containing EXACTLY 4 columns and 4 rows of 16
separate small pixel-art illustrations. All canvas background and gutters
flat pure magenta #FF00FF. Equal-sized square cells, 24px clear magenta gutters
at x=256,512,768 and y=256,512,768, magenta outer margin. Exactly one simple
isolated icon-like subject per cell. Keep each icon inside central 70% of cell
width and central 55% of cell height, wide 4:3 silhouette. No connecting objects
across cells. Authentic Phantasy Star Sega Master System 1987 style, each icon
drawn as if 28x20 pixels with large square pixels upscaled nearest neighbour.
Thick black 1 pixel outline, limited saturated SMS blues, cyans, greens, purple,
bronze, gold, warm orange, white and black. No text, labels, numbers, borders,
UI, gradients, anti-aliasing, blur or fine details. Magenta only for background.
```

Backdrop working composition/style instructions:

```text
ONE wide landscape 1536x1024, composed for a centred 16:9 crop. Phantasy Star
forest battle screen, Sega Master System 1987, strict 8-bit pixel art, as if
320x180 enlarged nearest neighbour. Hard square edges, flat colour clusters,
black outlines, repeated tile-like trees, occasional checker dithering,
at most 16 colours. Dark-green canopy band across top quarter, layered alien
tree silhouettes in deep blues, greens and muted purples; short heavy trunks
mostly at left/right edges. Horizon around 40% down. Flat grass stripe from
horizon to bottom, predominantly plain #005500. Central half from 30% to 75%
height exceptionally calm: empty flat dark-teal/green clearing, minimal
low-contrast distant silhouettes, reserved for a bright 128px-tall monster.
Busy foliage may frame extreme corners. No bright branches crossing centre,
no perspective path. SMS channels 00/55/AA/FF. No gradients, atmospheric blur,
sunbeams, anti-aliasing, painterly texture, characters, monsters, objects,
UI, frames, text or watermark.
```

Prompts requested tighter palettes and lower drawing resolutions than the
generator actually delivered; scripts enforce the final pixel/palette contract.
The expanded assets use the SMS 64-colour master palette, with house-colour
bias in the prompts, rather than a newly enforced literal 26-colour subset.
Raw sources remain locally ignored as described earlier. Final game assets,
previews and prompt/report files are versionable.

### Expansion checks

```sh
uv run python -m unittest -v test_pipeline test_expansion
UV_TOOL_DIR=/private/tmp/vibespire-uv-tools uvx ty check --python .venv .
```

The new synthetic tests cover drifted gutters, retaining tiny particles,
reported equal-division fallback, tall-icon crop safety, invalid names, grid
export dimensions, landscape centre crop, opaque-only input, palette caps and
exact 2× previews. `preview/asset-validation.json` records the 23 delivered
game images (6 portraits + 16 cards + 1 backdrop). All have the requested sizes,
exact SMS channels and palette caps; sprite alpha is binary, no magenta key
survives, the 32px portraits exactly match NEAREST reductions of the final 64s,
and the backdrop preview is an exact 2× repeat. These mechanical checks are in
addition to opening the actual contact sheets and backdrop in the image viewer.

### Six further backdrops (2026-10-29)

Delivered `act2_foundry`, `act3_crown`, `title_spire`, `rest_site`,
`shop_interior` and `event_generic`, each as opaque **640×360** RGB PNG plus
an exact **1280×720 NEAREST** `@2x` preview and processing JSON.
`act1_verdant` was retained. No renderer or engine files were changed.

All six use the **Act 1 conversion process**: centred 16:9 crop,
`--width 640 --height 360`, auto pitch/phase, cap 24 SMS colours, NEAREST,
no chroma key, no outline and no new dither. Crown's replacement lowers the
palette cap to 14. The other selected sources are 1536×1024, cropped to
`[0, 80, 1536, 944]`; Crown v5 returned 1672×941 and is centre-cropped to
`[0, 0, 1672, 940]`. Source art can contain soft colour variation; the exports
contain only exact SMS colours.

Rebuild selected sources from `tools/sprites`:

```sh
uv run backdrop.py raw/backdrops/act2_foundry-v2.png ../../public/assets/backdrops/act2_foundry.png --width 640 --height 360
uv run backdrop.py raw/backdrops/act3_crown-v5.png ../../public/assets/backdrops/act3_crown.png --width 640 --height 360 --colors 14
uv run backdrop.py raw/backdrops/title_spire-v5.png ../../public/assets/backdrops/title_spire.png --width 640 --height 360
uv run backdrop.py raw/backdrops/rest_site-v3.png ../../public/assets/backdrops/rest_site.png --width 640 --height 360
uv run backdrop.py raw/backdrops/shop_interior-v4.png ../../public/assets/backdrops/shop_interior.png --width 640 --height 360
uv run backdrop.py raw/backdrops/event_generic-v1.png ../../public/assets/backdrops/event_generic.png --width 640 --height 360
uv run preview_backdrops.py ../../public/assets/backdrops preview/backdrops
```

`preview/backdrops/contact.png` is **640×2520**, all seven images stacked at
exactly 1× with no labels, gaps or resampling. Row order: Act 1, Foundry,
Crown, title, rest, shop, event. `validation.json` records palette entries,
hashes, crop-report agreement, exact 2× checks, contact-row equality and
descriptive central-stage measurements. The script fails on invalid assets.

`preview/backdrops/enemy-contrast.png` shows the same rows with existing goblin,
jellyfish and golem sprites enlarged by NEAREST to 128px, placed at
x=128/256/384 with feet at y=230 (review composition only, never game art).
The script also rebuilds `act3-enemy-contrast.png` and its exact `@2x` review:
stone golem at x=176 and jellyfish at x=336, both enlarged to 128×128 by
NEAREST with feet at y=200. These overlays are separate from production art.

#### Added prompt list

The approved Act 1 prompt family above was reused: Phantasy Star SMS 1987,
coarse square pixels, repeated motifs, flat clusters, black shape breaks,
occasional corner checker dither, calm middle, no characters/UI/text.
The following are the scene prompts and successful refinements. The **exact
full prompts, image-reference paths, all attempts, selected iterations and
generator paths** are in [`prompts-backdrops.json`](prompts-backdrops.json).
Raw sources remain locally ignored. Initial references used the approved
`act1_verdant@2x.png`; later retries used its original source to clarify the
8px drawing grid. Event calls also used the saved blue corridor reference.

- **`act2_foundry` (iteration 2):** machine levels of the derelict orbital
  elevator, rust-orange pistons and steel-blue pipes/gantries at the sides,
  soot-black sky, thin furnace-red horizon, riveted plates at the bottom.
  Refine to a coarse 192×128 source drawing, two pistons/two pipes, six broad
  foreground plates, no hazard stripes or micro-trim, plain `#000055` stage.

- **`act3_crown` (iterations 4 + 5, replacement):** the previous pale ice floor
  was rejected for weak pale-sprite contrast. Generate a dark orbital
  observatory using Foundry and Verdant as coarse-pixel/density references,
  then edit only the bottom corners to add fallen crystal shards. Working
  composition prompt (full exact calls retained in the JSON):

  ```text
  One wide opaque 1536x1024 landscape safe for a centred 16:9 crop.
  Phantasy Star Sega Master System 1987, coarse 192x128 logical drawing,
  hard square pixels, flat colour clusters, black shape breaks.
  Observatory deck at the top of an orbital elevator tether in orbit.
  Mostly black-blue void with sparse chunky stars; thin curved cyan/white
  planet horizon with a faint purple limb. Tall side prism crystals and
  dark observatory pylons/arches with cyan, white and magenta edge accents,
  receding toward a small distant central portal/lens above the stage.
  Dark midnight-blue #000055 steel deck starts around final y=125;
  y=130..230 stays mostly dark, with a faint sparse pale blue-grey
  perspective grid separated by broad dark panels. Foreground dark deck
  plates with black joints and a few small cyan/white crystal shards in
  bottom corners. Pale 128px monsters must pop with feet at final y=200.
  SMS RGB channels 00/55/AA/FF, at most 16 requested flat colours, one
  magenta accent. No bright ice floor, gradients, bloom, anti-aliasing,
  fine noise, characters, enemies, UI, text, frame or watermark.
  ```

  The built-in image tool returned 1672×941. Auto pitch 6.07 (score 0.210)
  recovered 275×155; the weak-grid warning was reviewed visually. A 24-colour
  conversion retained extra colour ramps; the final `--colors 14` keeps one
  magenta-violet accent (`#AA00FF`), cyan/white highlights and muted grid seams.
  The 12-colour trial lost the magenta accent, so it was not selected.

- **`title_spire` (iterations 4 + 5):** edit the approved forest while keeping
  its exact clearing and corner density. Replace upper canopy with three flat
  purple/pink dusk bands, clouds at far edges, thin jungle horizon, narrow
  colossal tether and orbital crown/star. Keep horizon at source y≈400 and
  top-centre quiet for a logo. Final edit shortens the upper tether and moves
  crown/star below the 80px crop boundary; keep everything else unchanged.

- **`rest_site` (iteration 3):** blue-grey sheltered dungeon alcove, 5–6 flat
  blue wall steps, small dark rear doorway, no staircase; one exact `#000055`
  floor through the middle. Tiny fire and whole stone ring with bedroll low
  left, cool crates low right. Fire is the only warm light. Keep props within
  source y=720..880 so the crop retains them; corner checker dither only.

- **`shop_interior` (iteration 4):** redraw the earlier shop composition in the
  approved reference's coarse SMS style: blue/cyan jars on side shelves, high
  hanging tools, one orange lantern, plain `#005555` wall, plain teal counter
  with cyan-teal top, no items at centre. Request 14 flat colours and crop-safe
  top props; actual result has 15 colours, larger pixels and partly cropped jars.

- **`event_generic` (iteration 1):** first-person Phantasy Star blue corridor
  junction, black side openings, a small closed far door with narrow cyan-white
  light behind it, faint vines only at extreme corners. Broad plain blue middle
  floor, perspective lines and masonry concentrated at sides/bottom.

#### Measured results and visual review

Every selected native export and `@2x` image was inspected against the approved
Act 1, followed by the final contact and sprite-contrast sheets. The numerical
central rectangle below is x=160..479, y=130..229. It measures flatness, not
visual quality or sprite contrast.

| Backdrop | Colours | Recovered grid | Middle dominant share | Honest verdict |
| --- | ---: | --- | ---: | --- |
| Act 1 (reference) | 18 | 192×108 | 95.3% | Approved forest; kept unchanged. |
| Foundry | 19 | 192×108 | 100% | Closest density match; rust/steel framing and furnace read clearly, central band fully calm. |
| Crown | 14 | 275×155 | 80.8% | Dark structured deck, sparse grid, receding pylons and foreground shards; golem and jellyfish clearly readable at 2× with feet at y=200. |
| Title | 20 | 192×108 | 93.1% | Dusk tower/crown/star survive crop; middle calm below a thin horizon at its upper edge, narrow tower occupies a small part of logo space. |
| Rest | 20 | 192×108 | 100% | Small warm fire and cool alcove; whole central band calm, props clear of stage. |
| Shop | 15 | 133×75 | 100% | Readable chunky jars/tools; calm wall and counter, coarser than Act 1 and some upper jars cropped. |
| Event | 17 | 288×162 | 81.8% | Convincing blue corridor; floor calm, distant threshold touches upper part of band. |

The generator does not enforce a uniform grid: Crown, Rest, Shop and some
rejected attempts emitted weak-grid warnings. Sources were judged after the
actual auto-grid conversion; **no pitch override** was used. Crown v5 alone
lowers the palette cap to 14. An event retry failed grid
detection (score 0.065) and was rejected.
The selected Crown/Event are finer and the Shop coarser than Act 1. These are
SMS-inspired exports at the requested modern size, not a claim of identical
pixel density or hardware-native SMS screens.

Checks after Crown replacement: all seven assets pass `preview_backdrops.py`;
12 Python pipeline tests and `ty` for the updated preview script pass;
repository tests pass (216 tests in 23 files), and `npm run typecheck` passes.


## Relic and potion inventory icons

`prompts_icons.json` is the GDD-derived row-major subject list: four full relic
sheets, eight remaining relics plus eight candidate alternates, and one potion
sheet. `make_icon_prompts.py` reproduces this list. Built-in imagegen produces
one sheet per call; originals are preserved in `raw/icons/native/` and normalized
1024×1024 copies in `raw/icons/`. Both raw directories are ignored.

`grid.py --cell-out 16x16` keys and detects pitch **independently per cell**,
fits the complete outlined subject without cropping, centers it on both axes,
and caps opaque SMS colours at eight. Omitting the option keeps the original
32×24 card workflow and sixteen-colour cap. Other positive `WxH` dimensions
(at least 3 on each axis) are accepted and fit without cropping.

```sh
UV_CACHE_DIR=/private/tmp/vibespire-uv-cache uv run --project tools/sprites tools/sprites/grid.py tools/sprites/raw/icons/relics_01_forged.png tools/sprites/preview/icons/example --cols 4 --rows 4 --cell-out 16x16 --names riven_gauntlet,glass_spurs,dampener_coil,bulwark_rivets,stim_patch,scrap_magnet,notched_buckler,chain_wraps,parry_charm,kept_fury,crowd_breaker,concussion_rig,slow_temper,hairline_saw,duelists_oath,bastion_core
# Slice one named sheet, with its per-sheet labelled 4x contact and pitch report:
UV_CACHE_DIR=/private/tmp/vibespire-uv-cache uv run --project tools/sprites tools/sprites/build_icons.py relics_01_forged
# Apply visually reviewed selections, validate all 88 icons and pack both atlases:
UV_CACHE_DIR=/private/tmp/vibespire-uv-cache uv run --project tools/sprites tools/sprites/build_icons.py --finalize
UV_CACHE_DIR=/private/tmp/vibespire-uv-cache uv run --directory tools/sprites -m unittest test_icons -v
```

`icon_selections.json` records the chosen alternates and visual limitations;
`prompts_icons_generation.json` records complete prompts and generator paths.
Final contacts are `preview/relics/contact.png` and `preview/potions/contact.png`,
with exact nearest-neighbour 4× icons and complete ids. Final sprites have keyed
magenta converted to RGBA transparency, as required by the runtime convention.
The separate `relics-atlas` and `potions-atlas` PNG/JSON pairs use `atlas.py` at
`--cell 16`. Finalization checks GDD id coverage, dimensions, binary alpha, SMS
palette membership, eight-colour cap, black presence and exact atlas cell pixels.
It does not rebuild the enemy atlas or the shared atlas.

This run used the six planned base generations and one permitted targeted potion
retry. `prompts_icons_retry.json` holds the padded four-subject/four-variant retry.
To reproduce its slicing, use `build_icons.py retry_potions_01 --pitch 1`.
That artwork failed auto pitch detection (score 0.113); source inspection showed
an irregular lattice, so explicit pitch 1 was deliberately used before fitting.
All six base sheets used per-cell auto detection. Review decisions, including
retained weak icons, are in `icon_selections.json`.

### Chronist card batch (56 cards)

`prompts_cards_chronist.json` parses the source card blocks into id/name/type/text,
records a 4–10 word subject for every id, and allocates four 4×4 sheets before
any generation: 56 originals plus eight planned alternates. Exact built-in
imagegen prompts are in `preview/cards/chronist-generation-prompts.json`.
Native 1254×1254 PNGs are preserved in ignored `raw/cards/chronist_*.png`;
these are sliced directly without normalization. The manifest records source
provenance, final selections, visual review, and one additional fill-up sheet.

From the repo root (set `UV_CACHE_DIR=/private/tmp/vibespire-uv-cache` if needed):

```sh
uv run --project tools/sprites tools/sprites/build_cards_chronist.py chronist_01
uv run --project tools/sprites tools/sprites/build_cards_chronist.py chronist_02
uv run --project tools/sprites tools/sprites/build_cards_chronist.py chronist_03
uv run --project tools/sprites tools/sprites/build_cards_chronist.py chronist_04
uv run --project tools/sprites tools/sprites/build_cards_chronist.py chronist_fillup
uv run --project tools/sprites tools/sprites/build_cards_chronist.py finalize
uv run --project tools/sprites tools/sprites/atlas.py public/assets/sprites/cards public/assets/sprites/cards-atlas.png public/assets/sprites/cards-atlas.json --cell-w 32 --cell-h 24
```

Each slice goes through `grid.py` with automatic pitch detection; sheet review
PNGs and reports stay in `preview/cards/<sheet>/`, keeping production `cards/`
free of contacts and alternates. All five contacts were inspected at 4×.
`appointed_hour` and `culmination` were initially too narrow; the single fill-up
sheet offered eight broader variants of each. The final selection uses variant
8 and variant 1 respectively. `dead_reckoning` uses its planned alternate.
Remaining weak reads: `tourbillon` and `escapement` have abstract internal
clockwork details, but distinct readable silhouettes. No final duplicate or
visible gutter bleed was found. Some axes report equal division rather than
gutter detection; those cell boundaries were checked visually after slicing.

Final labelled contact: `preview/cards/chronist-contact.png` (exact 4× NEAREST).
All 56 exports are binary-alpha 32×24 RGBA with ≤16 opaque SMS colours and no
magenta spill. `preview/cards/chronist-validation.json` records per-card checks.
The card atlas packs every top-level PNG in production `cards/`, excluding the
`test/` subdirectory. It uses `{frames: {card_id: {x,y,w,h}}, cell_w:32,
cell_h:24}`. At this batch's completion it had 56 frames, 256×168 RGBA.
Later batches can rebuild it with the same command. The enemy/relic/shared
atlas assets were not changed by this task.

Validation: Chronist script diagnostics passed. Python pipeline tests passed
13/14; the old delivered-enemy assertion still expects only the four original
test monsters and fails against the concurrently expanded enemy atlas.
Repository typecheck and tests also fail outside this batch (missing content
modules, renderer/type mismatches, and map tests). Full logs are saved under
`preview/cards/chronist-*.log`.
