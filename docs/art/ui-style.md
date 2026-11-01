# Vibespire v2 UI art style bible

The benchmark is the measured 1987 Phantasy Star battle art in `docs/research/art-style.md`, with the shipped forest and the v1 combat capture as the house references. Keep their saturated colour, frontal presentation and quiet stage. This pass owns card illustrations, inventory objects and backdrops only.

## Revision priority: do no harm

The lead's round-two verdict supersedes the first pass's preference for simpler forms. V1's charm, material modelling and detail density are the baseline. Use Phantasy Star item/dungeon art, Ys and Wonder Boy III as the direction: physical objects with 2–3 hard shades per material, small highlights, purposeful texture and a one-pixel black contour. Documents, lenses, clocks and tools must remain illustrated game objects rather than flat UI symbols.

If the concept works, restore the original and repair individual pixels. Preserve its silhouette, holes, creases, rivets, strands, wear and overlapping parts. Never run a blanket contour rebuild, recenter/downscale or broad palette conversion over a restored sprite. A full replacement must match or exceed the original's density and character at both 1× and 4×. Palette compliance alone is insufficient. Keep all art accepted by the lead; list remaining 3/5 outliers without redrawing them. Only scores ≤2 warrant another redraw.

## Pixel and colour contract

- Card art is **32×24**, as enforced by `CARD.art` in `src/render/ui/art.ts` and `CardFrame.ts`. Review at 1× first; the 4× NEAREST image diagnoses individual pixels.
- Relics and potions are **16×16**, RGBA with binary alpha. Centre the complete silhouette, including its outline. Keep a transparent margin where the shape permits it.
- All visible channels are exactly **00 / 55 / AA / FF**. Transparent pixels are `(0,0,0,0)`. Never use the magenta source key on an object.
- Newly generated icons use **at most eight opaque colours, including black** and newly generated cards at most ten. Original-preserving card cleanups retain the existing sixteen-colour contract; do not erase existing shading to meet the tighter regeneration budget. Two or three hard tones describe each material; preserve purposeful texture and highlights.
- Use a **one logical pixel black silhouette outline** and one pixel internal breaks where materials meet. Do not add an outline to an already outlined contour: double outlines consume the interior. No grey antialiasing, translucent fringes, soft glows or error diffusion.
- Light comes from the **upper left**: highlight on top/left, deepest material tone bottom/right. Reserve white for one small glint or a sharp cutting edge. Do not outline an object in white.

## Card identities

| Class | Main ramp | Secondary / accent | Construction |
|---|---|---|---|
| Breaker | steel `#0055AA → #00AAFF → #AAAAAA` | red `#550000 → #AA0000 → #FF0000`; restrained bronze `#AA5500 → #FFAA00` | Heavy plates, broad blades, angular impacts. Steel occupies the largest area; red signals force, damage and cracks. |
| Graft | greens `#005500 → #00AA00 → #00FF00` | violet `#550055 → #5500AA → #AA00FF`; root brown `#AA5500` | Chunky leaves, seedpods, mushroom caps and cut stems. Green growth against violet rot; cyan is a rare crystal exception, not the default material. |
| Chronist | blues `#000055 → #0055AA → #00AAFF` | gold `#AA5500 → #FFAA00 → #FFFF00`; tiny white glint | Broad clocks, paired beats, clear hands, hourglass chambers. Gold marks the active pointer or timing mechanism. |
| Colourless | neutral `#555555 → #AAAAAA → #FFFFFF` | restrained brass `#AA5500 → #FFAA00`; one functional cyan or red accent | Tools, mechanisms, documents and crystals; no class-colour flood. Neutral material covers most of the object. |

Use one dominant object plus one action cue, not a miniature crowded scene. Protect a blade's width (at least two interior pixels), a seed's gap, a clock hand and a mushroom's cap. Attack cues point toward a readable impact; protection cues close around a solid shield; growth shows a sprout; pruning shows a separated cut. A card illustration supports its rules, rather than attempting to encode every number or condition. Do not paint labels or keywords into the asset.

## Icon construction

A 16px object must read from its silhouette before its decorative interior. Main body normally spans 10–12 pixels, leaving room for the one pixel black outline. Prefer a single connected main object; detached sparks must be deliberate, never accidental resize fragments. Keep holes at least two pixels wide and important strokes at least two interior pixels wide when possible. A pendant's chain may be a supporting single stroke, but never the entire read.

Use broad planes: steel shadow/body/glint, gold shadow/body/glint, or leaf shadow/body/glint. Retain original grain, folds, small facets and wear; avoid adding indiscriminate checker noise. Keep silhouettes distinct within families: heart, saw, forked branch, ring, seed tray and net must not all collapse into round amulets. Potion families share glass, a visible stopper and upper-left glint; distinguish them through bottle shape **and** a large mark (left arrow for rewind, square stop for halt, beat pair for tempo, heart for mending, eye for foresight, flame for fury). Colour alone is insufficient.

Post-generation work is at final resolution. Remove stray pixels, replace ambiguous motifs, repair broken edges, centre the result, cap the palette and inspect the 1× icon on both black and dark blue. Do not call an untouched high-resolution downscale a finished 16px icon.

## Backdrop values and density

Backdrops remain **opaque RGB 640×360**, with exact 1280×720 NEAREST review siblings. Aim for a common **320×180 construction grid enlarged exactly 2×** in replacements; avoid fine one-pixel linework next to coarse six-pixel furniture. This is the modern house adaptation, not a claim of hardware-native SMS resolution.

The enemy stage at roughly **x=160..479, y=60..229**, with feet near y=200, must remain calm and mid-dark. Keep floor structure at low contrast: a navy/black tiled floor should still describe depth, without becoming a featureless blob. Values in the stage should generally stay below a luma of 85/255; thin distant horizon details may sit above the monster heads. Never put white floor facets, bright grid lines or high contrast masonry behind enemies. Keep the lower hand area calm too. Put repetition, checker dither, brighter props and high contrast in the extreme sides and corners, as in Phantasy Star.

Use at most **16 opaque colours** for replacements. Flat black, navy, dark blue/teal and one scene ramp do the structural work. The foundry's warm furnace is a narrow horizon accent; the Crown's cyan crystals live at the sides; event corridors use deep blue walls and black mortar; shops keep a dark empty counter centre and clear shelf silhouettes at the corners. Keep all objects whole within the crop. No painted UI, characters, text, bloom or gradients.

## Acceptance and delivery

Each asset gets five independent 1–5 editorial scores: SMS palette, 1× readability, pixel cleanliness, coherence (outline/light/density) and communication. A 5 is exemplary; 4 is production-ready with minor stylisation; 3 needs a pass; 2 is ambiguous or inconsistent; 1 is unusable. Palette compliance alone cannot lift the other scores. For backdrops, communication means recognisable location and room for gameplay/UI.

Rebuild **only** the three UI atlases using `atlas.pack`; retain exact IDs, frame rectangles and JSON shapes. Verify every packed cell against its individual PNG. Refresh previews after the final pixels are accepted. New v2 IDs and their mechanical meaning are a separate follow-up once the designers' art list is ready.
