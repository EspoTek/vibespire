# Art Direction Brief: "Phantasy Star (SMS, 1987)" look for Vibespire

Audience: artists, prompt-writers, renderer engineer. Research only, no game code.
Reference images: `research/refs/` (listed at the end). All PS1 screenshots there are native 256x192 captures. I measured every pixel number below from those files with Pillow scripts, so they are measurements, not recollections. Where I could not verify something from a capture or a source, I say so.

---

## 1. Phantasy Star battle screen anatomy

### 1.1 The big structural fact: there is no "enemy window"

The brief assumed an enemy window with a bordered backdrop inside it. The real screen is different, and the difference matters. **In Phantasy Star the landscape backdrop fills the whole 256x192 screen, edge to edge. Every UI element is a small black window floating on top of the painting.** The enemy stands in the open in the middle of the scene. (Dragon Quest is the game that frames its monster inside a little bordered window over the field map; see section 4.)

Measured layout (refs `ps1-battle-overworld-segaretro.png`, `ps1-battle-dungeon-segaretro.png`). Every window sits on the 8x8 tile grid. The rect is the window's full cell, including its 1px black outer margin.

| Element | Rect (x, y, w, h) | Tiles | Contents |
|---|---|---|---|
| Command window | 8, 8, 48, 88 | 6x11 | `ATTK / MAGC / ITEM / TALK / RUN`, 16px line pitch, ▸ cursor |
| Active-character tag | 8, 96, 48, 24 | 6x3 | `ALIS` (whose turn it is) |
| Enemy name window | 112, 0, 80, 32 | 10x4 | `OWL BEAR` / `EVILDEAD`, centred top |
| Enemy HP window | 192, 0, 64, 32-40 | 8x4 or 8x5 | one `HP nn` line per enemy in the group (2 or 3 lines); the window grows by one 8px row per enemy |
| Party status boxes | 0/64/128/192, 144, 64, 48 | 4 x (8x6) | name on row 1, `HP nnn` / `MP nn` on rows 3-4 |

- The bottom 48px (rows 144-191) is entirely party HUD: four equal 64x48 boxes, one per party member. With one party member (early game), only the leftmost box exists and the backdrop shows through the rest.
- The free stage for the enemy is roughly x 56-256, y 32-144: about 200x112 px, or 58% of the screen height.
- **Window style** (measured from the pixels): a 1px black outer margin, then a **2px pure white (#FFFFFF) border**, then a pure black (#000000) fill. The corners are rounded by chamfering the white: the outer row is inset 2px, the next row 1px, giving an approx. 3px radius. There are no gradients, no drop shadows and no title bars. The dialog window in shops (`ps1-shop-armory-segaretro.png`, rect 48,144,160,48) and the YES/NO picker use the identical style.
- **Menus cascade.** The field menu (`ps1-menu-status-segaretro.png`) stacks windows with overlapping offsets: STAS/MAGC/ITEM/SRCH, then a character list, then an equipment list, then a stats sheet. Each new window simply overdraws the previous one, about 8px down and right.

### 1.2 Font

- Uppercase only, on an 8x8 cell. Glyphs are 7px wide x 8px tall, with 1px of spacing.
- The menu/label font has a distinctive **thick-left, thin-right stem**: vertical strokes are 2px on the left side of a glyph and 1px on the right (see the A, K, M in ASCII dumps of `ATTK`/`MAGC`). The result is slightly calligraphic and blocky, not the uniform 2px "arcade" look of Press Start 2P.
- The numerals and the `HP`/`MP` labels in the party boxes use a **thinner 1px-stroke variant**. So PS effectively has two weights: heavy for names and commands, light for stats.
- Abbreviations are aggressive so that words fit 4-6 cells: ATTK, MAGC, STAS, SRCH, `CRC. SWD`, `ZIR. ARMR`, `IRN. SLD`, plus enemy names like `G.SCORPI`, `RD.DRAGN`, `SKULL-EN`. Enemy names are capped at 8 characters.
- The cursor is a solid right-pointing triangle, 3px wide x 5px tall.

### 1.3 Backdrops: bands per terrain

Forest backdrop (`ps1-battle-overworld-segaretro.png`). Dominant colours per 8px band:

| y range | Band | Colours |
|---|---|---|
| 0-31 | bright canopy (mostly hidden behind windows) | #00AA00, #00FF00, checker-dithered |
| 32-55 | dark canopy / trunk tops | #005500 66%, #00AA00 |
| 56-103 | tree-trunk wall | #550000 ~40%, #AA5500, #FFAA00 highlights, black outlines |
| 104-143 | flat grass floor (**horizon at y≈104, 54% down**) | #005500 90-100% with sparse #00AA00/#00FF00 tufts |
| 144-191 | party HUD | black/white |

- **Foreground framing**: big bright (#00FF00) leaf clusters poke in from the lower-left and lower-right corners and act as a vignette. The corners are busy and the centre is calm, which is exactly where the monster sits.
- The whole forest battle screen uses **11 colours**, all exactly on the SMS 2-bit grid. It contains 250 unique 8x8 tiles out of 768, so tiles are heavily reused (the trunk wall is a repeated pattern).
- The coastal/plains backdrop behind the field menu (`ps1-menu-status-segaretro.png`) is a #0055FF sky with horizontal #00AAFF haze stripes near the horizon, cyan (#00AAFF/#00FFFF) blocky forms in the middle distance, and tree foliage framing the top corners.
- **Dungeon battle** (`ps1-battle-dungeon-segaretro.png`): the backdrop is the first-person corridor itself, one segment deep. A flat brick wall faces you, with angled side walls and floor and ceiling wedges. Its five blues are #0055FF (light brick face), #0000AA (floor/ceiling), #0000FF, #00AAFF (highlight edges) and #000055 (deep shade). Mortar lines are 1px black. The enemy stands in front of the far wall.
- Backdrops change by terrain and planet (forest, coast, desert, ice, corridor, tower). I only had captures of forest, coast and dungeon. Treat the others as the same construction with a different 3-4 colour ramp.

### 1.4 Enemy sprites

- **One enemy type per fight.** A group of identical foes is drawn as a single sprite, and the HP window lists each member's HP. This is confirmed by the HP windows in both captures and by Giant Bomb and PS Cave.
- Measured sizes (native px): **Evildead (red hooded wraith) is 30x85** at x 113-142, y 51-135. **The winged eyeball is 34x46** at x 111-144, y 49-94. Both are **centred exactly on x=127.5**, the screen centre line. Their tops start about 18px below the top windows. Tall enemies reach down nearly to the party HUD, and wide ones (dragons, Golem) take most of the 200px stage. The Fandom bestiary crops are uniform 318x222 for regular enemies and 638x384 for bosses, which suggests bosses use about twice the area. Those were scaled crops I couldn't download (Cloudflare), so the numbers come from the image metadata only.
- Note: the overworld capture's name box says OWL BEAR, but the sprite is the red-winged eyeball (the bestiary's "Wing Eye" design). Don't copy that pairing.
- Rendering style: a **1px pure-black outline on every silhouette and on internal shape breaks**, hard 2-3 step ramps per material (Evildead uses #550000 → #AA0000 → #FF0000 plus a #00AA00/#AAFF00 green hand), no anti-aliasing, and almost no dithering on the creature itself. Dithering is saved for backdrops.
- The palette budget is tiny. The *entire* dungeon battle screen (walls + Evildead + UI) is 13 colours, which fits in one 16-entry palette.
- **Animation**: PS was famous for animating enemies at a time when DQ did not. Rieko Kodama: other RPGs "did not animate monsters… we were always trying to do the opposite". The team "didn't devote much ROM space to battle animation", so the zombie's vomit "shoots back into his mouth like a yo-yo" ([SMS Power interview translation](https://www.smspower.org/uploads/Translations/PhantasyStar-SMS-EN-videofenky-interview-translation/index.html)). From stills I can't count frames.
  - Inference (consistent with that quote and with SMS VDP practice): idle and attack animation is a short loop of 2-4 frames that swaps only *part* of the creature (wings flap, mouth opens, arm swings) rather than redrawing it.
  - For our game: **2-frame idle at ~4 fps, plus 1 held "attack" pose**.
- Player attacks are shown as effects drawn over the enemy, such as weapon slashes, laser beams and magic streaks, and the foe "shows a small amount of animation to indicate their actions" ([Giant Bomb](https://www.giantbomb.com/games/3030-7400/)).
- **Damage readout**: there are no floating damage numbers in the captures. Damage shows up as the numbers in the enemy-HP window (top right) and the party boxes ticking down. A dead group member just shows `HP 0`.
- Engineer's aside: the SMS allows 8 sprites per scanline, so dragon-sized enemies can't be hardware sprites without flicker. SMS games built big monsters from background tiles ([cosmigo](https://cosmigo.com/promotion/docs/onlinehelp/gfxHardware-SMS.htm)). That is my inference for PS; I found no disassembly write-up. Upshot: authentic enemies are **tile-aligned, palette-limited images that animate by swapping 8x8 chunks**.

### 1.5 Dungeon view

- `ps1-dungeon-corridor-segaretro.png` (static, blue) and `ps1-dungeon-animated-segaretro.png` (a 50-frame APNG walking forward through a green corridor) are full-screen with **no HUD at all** while you walk.
- The corridor is perfect one-point perspective converging on a black rectangle at roughly x 110-145, y 75-100. Each wall face is a flat brick panel (1px black mortar lines), and the panels recede in 4-5 depth steps.
- Each dungeon uses one **hue ramp of 5-6 colours**: blue #000055/#0000AA/#0000FF/#0055FF/#00AAFF, or green #005500/#00AA00/#00FF00/#55AA55 and similar. Distance is shown by stepping down the ramp toward black, with **checkerboard dither** bands where two ramp steps meet near the vanishing point and along the floor edges. The blue corridor screen is just 6 colours.

### 1.6 Town, overworld, portraits

- Town and overworld (`ps1-town-segaretro.png`, `ps1-overworld-segaretro.png`) are top-down 16x16 metatiles. They use saturated #00AA00 grass with #00FF00 speckle dither, grey #AAAAAA/#555555 cobble, orange #FFAA00/#FF5500 domed huts and 16x~26 black-outlined character sprites.
- Portraits (`ps1-portraits-characters-segaretro.png`, four 176x112 panels) sit in an 8px **gold rope/braid frame** (#FFFF00/#FFAA00/#AA5500 with a black stitch pattern) around a flat cyan or deep-blue background. **This is the best in-game model for our card frames.** The capture uses a non-standard emulator palette (e.g. #FFFB00), so snap it to the SMS grid before sampling.

---

## 2. Sega Master System palette and hardware

Confirmed by [SMS Power – Palette](https://www.smspower.org/Development/Palette) and [cosmigo SMS notes](https://cosmigo.com/promotion/docs/onlinehelp/gfxHardware-SMS.htm):

- **Colour format**: CRAM byte `%00BBGGRR`, which is 2 bits per channel and 64 colours total. The channel levels are rendered as **0x00, 0x55, 0xAA, 0xFF (0, 85, 170, 255). Confirmed:** every pixel of every PS capture in refs/ sits exactly on that grid. (SMS Power notes that the Mark III/SMS1 slightly boosts the first blue level. Ignore it.)
- **Two 16-colour palettes on screen**: CRAM 0-15 is background, 16-31 is sprites. Background tiles can choose either palette. Sprites use 16-31, and **sprite colour 0 (index 16) is transparent**. The backdrop/overscan colour is picked from the sprite palette (VDP reg $07). That gives 31 visible colours at most, and PS screens use only 6-13.
- **Tiles**: 8x8 at 4bpp. About 448-488 unique tiles fit in VRAM. Background tiles can be flipped horizontally or vertically and can sit in front of sprites through a priority bit. **Sprites can't be flipped.**
- **Sprites**: 64 on screen, **8 per scanline** (the 9th and later drop out, which causes flicker). They are 8x8 or 8x16 (one global mode) with optional 2x zoom.
- **Screen**: 256x192 (also 224/240-line modes). Scrolling games often blank the leftmost 8px column (reg $00 bit 5). PS does this on the scrolling town and overworld maps: in `ps1-town-segaretro.png` x 0-7 is one flat backdrop colour. It does *not* blank the column on the static battle and dungeon screens, which use all 256 px.
- **The resulting look**: high-contrast, saturated primaries and secondaries, nothing in between (there's no mid-grey other than #555555/#AAAAAA, no skin tone other than #FFAA55/#FFAAAA, no brown other than #550000/#AA5500). Black outlines are needed because adjacent saturated colours vibrate without them. Shading is 2-3 hard steps, with **checkerboard dither** used to fake intermediate tones in large areas (grass, canopy, distance fades).

### 2.1 Full 64-colour palette (hex), ordered by B, then G, then R

```
#000000 #550000 #AA0000 #FF0000   #005500 #555500 #AA5500 #FF5500
#00AA00 #55AA00 #AAAA00 #FFAA00   #00FF00 #55FF00 #AAFF00 #FFFF00
#000055 #550055 #AA0055 #FF0055   #005555 #555555 #AA5555 #FF5555
#00AA55 #55AA55 #AAAA55 #FFAA55   #00FF55 #55FF55 #AAFF55 #FFFF55
#0000AA #5500AA #AA00AA #FF00AA   #0055AA #5555AA #AA55AA #FF55AA
#00AAAA #55AAAA #AAAAAA #FFAAAA   #00FFAA #55FFAA #AAFFAA #FFFFAA
#0000FF #5500FF #AA00FF #FF00FF   #0055FF #5555FF #AA55FF #FF55FF
#00AAFF #55AAFF #AAAAFF #FFAAFF   #00FFFF #55FFFF #AAFFFF #FFFFFF
```

(Chart: `refs/sms-palette-64-chart-wikimedia.png`. It contains these 64 plus one #C0C0C0 frame colour.)

### 2.2 What Phantasy Star actually leans on (measured from the captures)

- **UI**: #000000 and #FFFFFF only.
- **Dungeon blues**: #000055, #0000AA, #0000FF, #0055FF, #00AAFF. This is the signature PS colour and the colour of the box art.
- **Sky/sea**: #0055FF sky, #00AAFF/#00FFFF/#AAFFFF water and haze.
- **Greens**: #005500, #00AA00, #00FF00, plus #AAFF00 acid highlights.
- **Earth/wood**: #550000, #AA5500, #FFAA00, #FF5500.
- **Enemy accent reds**: #550000, #AA0000, #FF0000. Gold: #FFFF00, #FFAA00.
- **Purples** (magic, Dezoris, bosses): #5500AA, #AA00FF, #AA55FF, #550055.
- Recommended **house palette for Vibespire**: these ~26 colours as the "allowed" set. Each individual sprite or backdrop gets ≤15 of them plus transparent, which mirrors a 16-entry CRAM.

---

## 3. Getting this look from AI image generators

### 3.1 What every source converges on

1. **Image models do not output real pixel art.** They produce "fake pixels": blocks of uneven size, off-grid edges, anti-aliased fringes and thousands of near-duplicate colours. That holds for gpt-image-1/1.5/2, Midjourney and base SDXL.
   - The Pixel Snapper README states this outright ([Hugo-Dz/spritefusion-pixel-snapper](https://github.com/Hugo-Dz/spritefusion-pixel-snapper)).
   - A developer write-up surfaced in search (Reddit, 2026) concluded that enforcing palette and grid in code "mattered more than prompt tuning".
2. So the reliable pipeline is **generate big → snap to grid → quantize to a fixed palette → key out the background → hand-clean**. Prompts only get you to a good starting point.
3. **Background**:
   - gpt-image-1 / 1.5 support `background: "transparent"` natively ([val.town pixel-game-assets skill](https://www.val.town/embed/x/dcm31/skillbook/skills/pixel-game-assets/SKILL.md)).
   - Community tooling for gpt-image-2 prefers asking for an **opaque flat #FF00FF background and chroma-keying it locally**, falling back to gpt-image-1.5 when native alpha is required ([imagegen2 skill](https://claudskills.com/skills/imagegen2/SKILL.md)).
   - Native alpha from these models leaves soft semi-transparent edges, which must be thresholded to 0/255 alpha either way.
4. **Gotcha for us: #FF00FF is a legal SMS colour** (it's in the 64). Key it out *before* quantizing, and drop #FF00FF from the allowed palette for enemies (PS doesn't use hot magenta on monsters anyway; its purples are #5500AA/#AA00FF). Also tell the model "no pink or magenta on the creature".
5. **Consistency across a set**: generate related assets (frames of one enemy, palette-swap tiers) in **one sheet call**, or feed an accepted image back as a reference. Calls drift otherwise (val.town skill). Never ask for text in the image.
6. **SDXL route**: [nerijs/pixel-art-xl](https://huggingface.co/nerijs/pixel-art-xl) LoRA. The card says "downscale 8 times to get pixel perfect images" with nearest neighbour, use the fp16-fix VAE, and no refiner. With LCM: 8 steps, CFG 1.5, LoRA weight 1.2.
   - Paid option with palette locking and Aseprite integration: [Retro Diffusion](https://astropulse.itch.io/retrodiffusion). It accepts an input palette, so you can load the SMS 64.
7. **Midjourney**: usable for concept and backdrops (`--style raw`, low `--stylize`), weak for consistent sprite frames ([prompt guide](https://promptgenius.pages.dev/prompts/midjourney/art-styles/pixel-art)). Always post-process.

### 3.2 The post-processing pipeline (for whoever builds the asset tooling)

1. **Generate** at 1024x1024 (gpt-image `quality: medium` is the cost/quality sweet spot per the val.town skill). Ask for the subject to fill about 80% of the frame on a flat #FF00FF field, and state the *intended* grid ("reads as a 64x64 sprite").
2. **Key**: alpha = 0 where the colour is within ~ΔE 20 of #FF00FF. Then kill fringe: any pixel whose hue is closer to magenta than to its opaque neighbours becomes transparent. Threshold all alpha to 0/255.
3. **Snap to grid**:
   - Auto-detect the fake-pixel size and resample to true resolution. Use [Pixel Snapper](https://github.com/Hugo-Dz/spritefusion-pixel-snapper) (MIT; `spritefusion-pixel-snapper in.png out.png 15 --palette <hex,…>`; `--pixel-size` overrides detection), DeAI PixelKit (Aseprite) or MonoPix.
   - Fallback: box-filter (mode, not mean) downscale to the target (1024→64 = 16x), then nearest-neighbour upscale for preview.
   - **Use mode/majority per cell, not bilinear.** Averaging invents new colours.
4. **Quantize** to the allowed palette, either the 64 SMS colours or our ~26-colour house subset, **capped at 15 colours + transparent** per sprite.
   - Use nearest-colour in a perceptual space (OKLab) with **no error-diffusion dither** on sprites (Floyd-Steinberg noise looks nothing like PS).
   - Ordered 2x2 checker dither is allowed only on backdrops.
5. **Outline pass**: force a 1px #000000 outline wherever an opaque pixel borders transparency. Optionally also where two colour regions with luminance difference < 25% meet.
6. **Symmetry pass** (front-on enemies are mostly symmetric): offer "mirror left half" or "mirror right half" and let the artist pick the better half.
7. **Orphan cleanup**: remove isolated single pixels, except eye highlights.
8. **Human pass in Aseprite**: fix eyes, hands and the silhouette. Budget 10-20 minutes per enemy. This is the step that makes it look like Kodama-era art rather than AI.
9. Export as **indexed PNG** with the palette embedded, so palette swaps (section 5.5) are a table lookup.

### 3.3 Prompt wording that helps

Positive:
- "8-bit pixel art", "Sega Master System", "1987 Phantasy Star monster"
- "front-facing, centred, symmetrical, full body, single subject"
- "1px black outline", "flat colours", "2-3 tone hard shading", "limited 16-colour palette", "large readable pixels"
- "plain flat #FF00FF background"

Negative/explicit "no":
- anti-aliasing, gradients, soft shading, glow, blur
- text, border, frame, grid lines, shadow on ground, multiple subjects
- 3/4 view, side view

Name the era, not just the bit depth: "SMS / 1987 Phantasy Star" pulls saturated primaries, while "16-bit" drifts toward SNES-style ramps.

### 3.4 Five example prompts (gpt-image / ChatGPT; adapt keywords for MJ/SD)

1. **Common enemy (Sworm-tier)**
   > 8-bit pixel art monster sprite in the style of Phantasy Star (Sega Master System, 1987). A giant fanged sandworm rising from the ground, facing the viewer head-on, centred and symmetrical, full body visible. Chunky large pixels that would read as a 64x64 sprite. Hard 1-pixel black outline around every shape. Flat colours only, 2-3 tone hard shading, no gradients, no anti-aliasing. Palette limited to saturated SMS colours: #AA5500, #FFAA00, #550000, #FF5500, #FFFFFF eye highlights, black. Plain flat #FF00FF background, no ground shadow, no text, no border, single subject.
2. **Undead (Evildead-tier, tall)**
   > Sega Master System Phantasy Star style enemy: a hooded red wraith with a tattered spiralling tail instead of legs, one clawed green hand raised, glowing blue eyes in a black hood. Front-on, centred, tall narrow silhouette (reads as 32x80 pixels). 1px black outline, flat reds #550000 #AA0000 #FF0000, hand #00AA00 #AAFF00. No anti-aliasing, no gradients, no dithering on the body. Solid #FF00FF background, nothing else in frame.
3. **Flying enemy plus animation sheet in one call**
   > 2x1 sprite sheet, same creature in two frames, identical scale and position in each half: a floating eyeball with red bat wings, Phantasy Star SMS 8-bit style, perfectly front-facing and symmetrical. Left frame wings up, right frame wings down. Thick 1px black outlines, flat saturated colours (#FF0000, #AA0000, #FFFF00 iris, #FFFFFF, black pupil), hard pixels for a 48x48 sprite. Flat #FF00FF background, no grid lines, no labels, no shadow.
4. **Boss**
   > Large boss monster, 8-bit Sega Master System JRPG style like Phantasy Star's Dark Force/Lassic encounters: a crowned skeletal sorcerer-king in purple robes, arms spread, front view, symmetrical, filling the frame (reads as a 128x128 sprite). Palette: #550055, #5500AA, #AA00FF, #AA55FF, gold #FFAA00/#FFFF00, bone #FFFFFF/#AAAAAA, black outline. Flat colour blocks, 3-tone hard shading, no gradients, no anti-aliasing, no glow effects. Solid #FF00FF background.
5. **Battle backdrop (no subject, opaque)**
   > 8-bit pixel art battle background in the style of Phantasy Star (Sega Master System, 1987), wide 16:9. A desert under a deep blue sky: flat #0055FF sky with two thin #00AAFF horizontal haze stripes near the horizon, distant orange mesas, a flat sand floor starting just below the middle of the image. Foreground rocks framing the bottom-left and bottom-right corners, empty calm centre. Hard pixels, checkerboard dithering only for texture, max 12 colours, no gradients, no characters, no text, no UI.

   (Backdrops have no alpha. Snap to 480x270 or 240x135 and nearest-neighbour ×2. They can use 2x2 checker dither, as PS's grass and canopy do.)

### 3.5 Code model writing sprites as text grids vs image generation

How it works: an LLM emits a palette plus rows of index characters (e.g. `"0012210…"`), and a script renders it.
- [Pixel Art Bench](https://emergentmind.com/pixel-art-bench) uses exactly this format: a 2-10 colour hex palette and a 24x24 digit grid.
- [pixelsrc](https://scbrown.github.io/pixelsrc/book/ai-generation/best-practices.html) uses semantic palette tokens like `{outline}` and `{skin}`. It recommends 16x16 as the main size, 4-8 colours for clean results (≤16 for retro), and building anything above 32x32 from tiles.
- The PIXL project claims 85-95% accuracy for raw grids ≤16x16, dropping sharply above that and failing beyond ~12x12 for "pixel reasoning" (the project's own unverified figures).

| | LLM text grid | Image model + pipeline |
|---|---|---|
| Palette exactness | Perfect, uses only the indices you give | Needs quantization; colours drift |
| Grid exactness | Perfect, by construction | Needs snapping; edges wobble |
| Good size range | 8x8 to 16x16 (maybe 24x24) | 32x32 and up; best at 48-128 |
| Shapes/anatomy | Weak: lumpy silhouettes, asymmetry, off-by-one row lengths | Strong forms, lighting and appeal |
| Iteration | Diffable, editable, cheap, deterministic, easy palette swaps | Slow, costs money per image, drifts between calls |
| Failure mode | Rows of wrong length; "ASCII-art" look | Fake pixels, too many colours, garbled text |

**Recommendation**: use LLM text grids for **8x8/16x16 icons** (intent icons, status effects, energy pip, relic icons, card-type glyphs, cursor, UI corners, the bitmap font itself). Validate row lengths and palette indices in a script, and ask for symmetric designs as a left half to be mirrored. Use image models plus the 3.2 pipeline for **enemies, card art (≥32x24) and backdrops**, always followed by a human pass.

---

## 4. Reference points in the same family

### 4.1 Phantasy Star enemy roster (names and HP from the [Fandom PS1 random-encounter list](https://phantasystar.fandom.com/wiki/Random_Encounters_in_Phantasy_Star))

Looks: ✔ = verified in a capture here. Others are from memory of the game plus the bestiary art titles, so treat them as indicative.

| Enemy | HP | Look |
|---|---|---|
| Sworm | 8 | small winged grub/fly, the first enemy on Palma |
| Giantfly | 25 | large green insect |
| Wing Eye | 11 | ✔ floating eyeball with red bat wings and a yellow iris ring |
| Owl Bear | 18 | hulking owl-headed bear |
| Goldlens | 28 | golden lens-eyed beast |
| Scorpion / G.Scorpi / Scorpius | 12/20/22 | one scorpion design in three palettes |
| Maneater | 16 | carnivorous plant |
| Deadtree | 23 | animated tree with a face and grasping branches |
| Gr./Rd./Bl. Slime | 18/29/40 | blob, three palettes |
| Evildead | 30 | ✔ red hooded wraith with a spiral tail and green claw |
| Wight / Lich | 50/60 | robed undead casters |
| Barbrian | 54 | human brute |
| Sandworm | 82 | Motavia desert worm |
| Fishman / Marman | 42/58 | sea creatures |
| Skeleton / Skull-En | 53/57 | skeleton warriors |
| Manticor / Sphinx | 60/78 | winged lion beasts |
| Ammonite / Shelfish | 90/62 | shelled sea monsters |
| Zombie / Ghoul | 87/68 | the "yo-yo vomit" zombie |
| Golem / Giant / Titan | 140/120/190 | stone giants |
| Gr./Rd./Wt. Dragn | 160/175/200 | dragon, three palettes |
| Bosses | – | Medusa, Dr. Mad, Lassic (the tyrant, a robed king), Dark Falz (final demon), Saccubus, Tarzimal, Shadow |

**Design lesson**: PS fills its roster with **palette swaps across tiers** (scorpions, slimes, dragons, farmers, cops). That is an authentic and cheap way to scale enemy tiers by act.

### 4.2 Neighbouring games

- **Dragon Quest (NES/Famicom, 1986)** (`compare-dq1-nes-battle-wikipedia.png`):
  - The monster is drawn **static** (no idle animation) inside a small **framed inset window** (about 112x80 here) laid over the overworld map. In DQ1 that inset carries a small landscape (sky, clouds, mountains). From DQ2 on, Famicom DQ uses plain black.
  - The command window has a titled border ("COMMAND") and a two-column FIGHT/SPELL/RUN/ITEM grid. Message text appears in a large dialog box at the bottom.
  - **PS vs DQ**: PS has animated enemies, a full-screen landscape, the UI as floating windows on the painting and four party boxes. DQ has a static enemy, a small inset (or black void), a one-hero stat panel and a heavy message log.
- **Final Fantasy I (NES, 1987)** (`compare-ff1-nes-battle-wikipedia.png`):
  - The screen is split into an enemy pane (left) and a side-view party pane (right), with a backdrop *strip* only at the top (pillars). Everything else is black.
  - Static enemies; status boxes are stacked vertically on the right; FIGHT/MAGIC/DRINK/ITEM/RUN command box at the bottom.
  - Borders are double-line grey/white. This is the main place where FF's frame differs from PS's simple 2px white.
- **Miracle Warriors: Seal of the Dark Lord (SMS, 1987)**: the screen is split into quadrants. The upper-left pane shows the foe in first person, with a command menu at upper-right and party stats with bars at the bottom. Enemies are **not animated**, but backgrounds match the terrain. One foe at a time ([HG101](https://www.hardcoregaming101.net/miracle-warriors-seal-of-the-dark-lord/), [Wikipedia](https://en.wikipedia.org/wiki/Miracle_Warriors:_Seal_of_the_Dark_Lord)). Useful as proof that "pane plus terrain backdrop" was the SMS idiom.
- **Ys / Golvellius (SMS, 1988)** are top-down action RPGs. Borrow their palette discipline and bold black-outlined bosses, not their layout. **Wizardry** is the ancestor of PS's first-person corridor and single-monster view.

---

## 5. Recommendations for Vibespire's battle screen

### 5.1 Resolution and scaling

- **Logical resolution 480x270**, with integer scaling only: ×2 = 960x540, ×3 = 1440x810, ×4 = 1920x1080 exactly. On 2560x1440, use ×5 = 2400x1350 with black letterbox bars.
  - Fallback: 640x360 (×3 = 1080p, ×2 = 720p, 80x45 tiles) if card text proves too cramped. Pixels then look finer and less SMS-like.
- Build everything on an **8x8 grid**. 270 = 33 rows + 6px, so put the 6px as a 3px black band top and bottom, or give it to the hand window.
- Renderer:
  - Draw to a 480x270 offscreen canvas and blit with `imageSmoothingEnabled = false` and CSS `image-rendering: pixelated`, with scale = `floor(min(winW/480, winH/270))`.
  - Never use fractional scales, sub-pixel positions or rotation on pixel art. Animate in whole pixels (and enemies in 2-frame flips, not tweens).

### 5.2 Layout (480x270, PS logic: full-bleed painting with floating windows)

```
y=0   +--------+ +----------------------+ +------------+
      | HP 62/80| | ENEMY NAME(S)        | | RELICS ▢▢▢▢| 24px top row (3 tiles)
y=24  +--------+ +----------------------+ +------------+
      |                                                 |
      |      full-screen terrain backdrop (480x270)     |
      |   horizon at ~y=110; enemies stand centred,     |
      |   1-3 enemies, front-on; intent icon above,     |
      |   "HP nn" tag below each (PS HP-window style)   |
y=168 |                                                 |
      +--+ +------------------------------------+ +--+
      |EN| |  HAND WINDOW: 5-7 cards side by side| |DR|  bottom 96px (12 tiles)
      |3/3| |  black fill, 2px white rounded border| |DS|  draw/discard counts
      +--+ +------------------------------------+ +--+
y=270                                  [END] window floats above the hand at right
```

- **Backdrop**: 480x270, full bleed, one per act/biome (forest, coast, desert, ice, corridor, tower). Horizon at about 40% of the height (y≈110). Busy foreground framing in the four corners, empty calm centre. ≤12 colours plus checker dither.
- **Enemy stage**: y 24-168 (144 px tall) x 40-440.
  - Sprite canvases: 64x64 for regular enemies, 96x96 for elites, up to 160x144 for bosses.
  - Bottoms align to a shared "floor line" around y=150. Centred group with 8px gaps.
  - These sizes keep PS's proportion (its enemies occupy 25-45% of screen height).
- **Enemy HP and intent**: a small PS window under each enemy, `HP 18`, in the light numeral font. Damage decrements this number (the PS way). Optionally also pop a flat white 8x8 damage number that rises 8px and vanishes. Intent icon (16x16) above the head, plus the number.
- **Player panel**: top-left window `HP 62/80` with a 1-tile block/shield value next to it, echoing the PS party box. Energy is a separate bottom-left window (`EN` with 3 pips), like PS's command window.
- **Relics**: a top-right window holding a row of 16x16 icons (8 visible, then ▸ for more). Potions are 3 slots inside the same window.
- **Hand window**: full width, bottom, 96px, exactly like PS's party bar. Cards sit inside it, and the hovered card rises out of the window by 16px.
- **End turn**: a separate small window `▸END` placed like PS's YES/NO picker. The menu cursor ▸ is our universal selection indicator.
- **Messages** ("Not enough energy", enemy action callouts): a PS-style dialog window (like the shop box, 160x48 equivalent) centred over the stage for about 1 s.

### 5.3 Cards

- **Card in hand: 56x80** (7x10 tiles), with 6 cards fitting between the energy and pile windows (6×(56+6)=372px). At 7 or more, overlap the cards by 16px.
  - Frame: 1px black margin, 2px border, 1px inner black line.
  - **Border colour encodes card type**: white = skill, gold rope (lifted from the PS portrait frame) = rare/power, red = attack. Alternatively keep the border white and colour the cost gem by type.
- Layout inside the card:
  - Cost gem: 10x10 at top-left, overlapping the border.
  - Name: one row, 8x8 font, ≤6 characters. Abbreviate PS-style: `STRIKE`, `DEFEND`, `FOIBE`, `ZAN`, `SLASH`.
  - **Art window: 48x32 inside the card** (the minimum is the requested 32x24, but 48x32 = 6x4 tiles reads far better). The art is a tiny scene or object on a flat or 2-band backdrop with a black outline, ≤8 colours.
  - Type line or keyword icons: 8x8 glyphs.
- **Rules text doesn't fit on the in-hand card at 1x. Don't shrink the font.** Instead, the hovered/selected card shows an **inspection window at 2x (112x160)** above the hand, or a PS dialog box with the full text in the 8x8 font. Rules text uses an 8-px font at most 13 chars per line.
- Card art pipeline: generate at 1024x683, snap to 48x32, quantize to ≤8 colours from the house palette, and hand-clean. Run the same art at 2x in the inspection view (nearest neighbour). Never use separate high-res art.

### 5.4 Fonts

- **Best for authenticity: draw our own 8x8 font in PS's style.** That means uppercase, 7x8 glyphs, a 2px left stem / 1px right stem, plus a thin 1px-stroke numeral set for stats. Build it as a 16x6 glyph atlas PNG. This avoids copying Sega's font, which is Sega's copyright: don't rip it from the ROM.
- **Off-the-shelf fallback: [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P)** by CodeMan38, **SIL OFL 1.1** (commercial use OK; the reserved font name rules apply if you modify it). Designed for multiples of 8 px. It is heavier and more "arcade" than PS, and it includes lowercase, which PS doesn't have. Render it **from a baked bitmap atlas**, not as a live web font, because browsers anti-alias TTF text even at 8px multiples.
- Keep **uppercase-only** for all UI. Use lowercase only, if ever, in long flavour text.

### 5.5 Legibility at pixel scale

- **Text is always white #FFFFFF on black #000000 inside a window. Never put text directly on the backdrop.** That is PS's rule, and it is why PS reads perfectly at 256x192.
- Numbers right-aligned on a fixed 8px cell grid (PS aligns `HP 140` / `MP 22` by column).
- Minimum glyph height 8 logical px (≥16 physical px at ×2). The only exception is tiny 8x8 icon glyphs, never letters.
- Every enemy, card icon and relic gets a 1px black outline, so it separates from any backdrop.
- State colours from the palette: poison #00FF00, weak #AAAAAA, strength #FF5500, block #00AAFF, low-HP number #FF0000. Use flat colour swaps, never glows.
- **Hit feedback, PS-faithful and cheap**:
  - Enemy hit: the whole enemy flashes to a #FFFFFF silhouette for 2 frames.
  - Player hit: a 2px horizontal screen shake for 4 frames, and the HP number goes #FF0000 for 0.5 s.
  - Attack effect: a 1-3 frame slash/beam sprite over the target.
- **Palette swaps**: store enemies as indexed PNGs and derive tier variants (Act 1 green → Act 2 red → Act 3 blue) by swapping palette entries, PS-style. The renderer can do this with a 16-entry palette LUT per sprite.
- **Enemy animation**: a 2-frame idle at 4 fps (250 ms/frame), a 1-frame attack pose held 300 ms, and a death that blinks 4 times and then disappears. That matches PS's limited animation (it doesn't fade or dissolve).

---

## Reference images saved (`research/refs/`)

| File | What it shows |
|---|---|
| `ps1-battle-overworld-segaretro.png` | Forest battle, full UI (4-member party, 3-enemy HP window) |
| `ps1-battle-dungeon-segaretro.png` | Dungeon battle vs Evildead, blue corridor backdrop |
| `ps1-dungeon-corridor-segaretro.png` | Static blue first-person corridor, no HUD |
| `ps1-dungeon-animated-segaretro.png` | 50-frame APNG walking a green corridor |
| `ps1-menu-status-segaretro.png` | Cascading field menu / stats windows over the coastal backdrop |
| `ps1-shop-armory-segaretro.png` | Shop scene, dialog window and YES/NO picker |
| `ps1-town-segaretro.png` | Camineet-style town, top-down |
| `ps1-overworld-segaretro.png` | Overworld, party in a line, domed city |
| `ps1-portraits-characters-segaretro.png` | Alis/Myau/Odin/Noah portraits in gold rope frames (non-standard emulator palette) |
| `sms-palette-64-chart-wikimedia.png` | The 64 SMS colours |
| `compare-dq1-nes-battle-wikipedia.png` | Dragon Warrior (NES) battle, for contrast |
| `compare-ff1-nes-battle-wikipedia.png` | Final Fantasy (NES) battle, for contrast |

Gaps: The Spriters Resource, MobyGames, PS Cave, the Fandom image CDN and the Wayback Machine were all behind Cloudflare/bot checks or offline during this session, so I could not save more enemy close-ups or sprite sheets. Sprite sizes above are measured from the two battle captures instead. HG101's Phantasy Star article was down for server migration. If more enemy references are needed, grab a few battle screenshots manually from an emulator or browser and drop them in refs/.

## Sources

- Sega Retro, Phantasy Star page and file API (screenshots): https://segaretro.org/Phantasy_Star
- Wikipedia, Phantasy Star (video game): https://en.wikipedia.org/wiki/Phantasy_Star_(video_game)
- SMS Power, Palette: https://www.smspower.org/Development/Palette and VDP registers: https://www.smspower.org/Development/VDPRegisters
- cosmigo Pro Motion, SMS graphics hardware: https://cosmigo.com/promotion/docs/onlinehelp/gfxHardware-SMS.htm
- Rieko Kodama interview (translation, SMS Power): https://www.smspower.org/uploads/Translations/PhantasyStar-SMS-EN-videofenky-interview-translation/index.html
- Giant Bomb, Phantasy Star: https://www.giantbomb.com/games/3030-7400/
- Fandom, PS1 random encounters (roster, HP): https://phantasystar.fandom.com/wiki/Random_Encounters_in_Phantasy_Star
- Wikimedia, RGB 6-bit palette chart: https://commons.wikimedia.org/wiki/File:RGB_6bits_palette.png
- Pixel Snapper (MIT): https://github.com/Hugo-Dz/spritefusion-pixel-snapper
- nerijs/pixel-art-xl: https://huggingface.co/nerijs/pixel-art-xl
- Retro Diffusion: https://astropulse.itch.io/retrodiffusion
- val.town gpt-image-1 pixel-asset skill: https://www.val.town/embed/x/dcm31/skillbook/skills/pixel-game-assets/SKILL.md
- gpt-image-2 chroma-key skill: https://claudskills.com/skills/imagegen2/SKILL.md
- pixelsrc best practices: https://scbrown.github.io/pixelsrc/book/ai-generation/best-practices.html
- Pixel Art Bench: https://emergentmind.com/pixel-art-bench
- Midjourney pixel-art prompt guide: https://promptgenius.pages.dev/prompts/midjourney/art-styles/pixel-art
- HG101, Miracle Warriors: https://www.hardcoregaming101.net/miracle-warriors-seal-of-the-dark-lord/
- Press Start 2P (OFL 1.1): https://fonts.google.com/specimen/Press+Start+2P
