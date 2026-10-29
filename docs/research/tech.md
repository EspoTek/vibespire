# Vibespire: renderer and tech brief

**Target:** three.js **r186** (`three@0.186.1`, npm latest as of 2026-10-29), `@types/three@0.186.0`, Vite 8.3, Vitest 5, Node 24+/26.
**Verification:** every TypeScript snippet below is condensed from files that type-check under `tsc --strict` against three 0.186.1 + @types/three 0.186.0, with `erasableSyntaxOnly` on so Node can strip the types. The RNG and tween code also ran under `node --test` on Node 26. The full files are in `/private/tmp/claude-501/-Users-chrises-git-vibespire/ad9551df-c3ea-439b-9735-dee86876e114/scratchpad/verify/src/`. API facts were checked against the r186 docs (Context7 `/mrdoob/three.js/r186`) and the r186 source.

## 0. r150 to r186 changes that matter here

- **Colour management is on by default.** `ColorManagement.enabled = true`, the working space is linear sRGB, and `renderer.outputColorSpace = SRGBColorSpace`. Set **`texture.colorSpace = THREE.SRGBColorSpace` on every colour texture**: PNG sheets, `CanvasTexture`s, font atlases. A texture without it looks washed out. Hex colours like `new Color(0xff0000)` are treated as sRGB and converted for you.
- **Render targets write in the working (linear) space.** In `WebGLRenderer.js` r186, a non-XR target gets `ColorManagement.workingColorSpace`. An 8-bit RGBA target therefore stores *linear* values, which shifts dark palette colours. Fix: create the target with `colorSpace: SRGBColorSpace`. three then allocates `SRGB8_ALPHA8` (`WebGLTextures.js`), so the hardware encodes on write and decodes on read, and palette bytes come back unchanged.
- **`THREE.Clock` is deprecated since r183.** It logs a warning. Use **`THREE.Timer`**: call `timer.update(t)` each frame and `timer.connect(document)` once, which uses the Page Visibility API so you don't get a huge `dt` after the tab comes back.
- **Addons:** `import { X } from 'three/addons/...'`, mapped to `examples/jsm/*` by the package `exports`. This brief needs no addons.
- **`WebGLRenderer` options:** `antialias` defaults to `false`, `premultipliedAlpha` to `true`, and `alpha` to `false`. Leave them all at the defaults.
- **`ImageBitmapLoader`** ignores `flipY` and `premultiplyAlpha` (the source says so). Stick with `TextureLoader` (`loadAsync`) so the UV maths below stays valid.
- **`Texture.clone()` shares the `Source`.** `copy()` does `this.source = source.source`, so clones cost one GPU upload. You don't need clones anyway: frame selection below is a uniform.
- **Sort internals** (`WebGLRenderLists.js`): items sort by `groupOrder`, then `renderOrder`, then material id (opaque list) or z (transparent list, back to front). Opaque and transparent are **separate lists, with opaque drawn first**. A `Group`'s `renderOrder` becomes the `groupOrder` of all its descendants. **A nested `Group` resets it** (`if (object.isGroup) groupOrder = object.renderOrder`), so use plain `Object3D` for sub-containers.

## 1. Pixel-perfect setup

### (a) Render to a 480×270 target, then integer-blit (recommended)

```ts
export const W = 480, H = 270;
export const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);                 // we size the backing store in device px ourselves
const canvas = renderer.domElement;
canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;image-rendering:pixelated';
document.body.appendChild(canvas);

export const rt = new THREE.WebGLRenderTarget(W, H, {
  minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false,
  depthBuffer: false,                     // 2D: layer with renderOrder
  colorSpace: THREE.SRGBColorSpace,       // SRGB8_ALPHA8: exact palette round-trip
});
export const camera = new THREE.OrthographicCamera(0, W, H, 0, -100, 100); // 1 unit = 1 px, y up
export const scene = new THREE.Scene();

const blitScene = new THREE.Scene(), blitCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
blitScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2),
  new THREE.MeshBasicMaterial({ map: rt.texture, depthTest: false, depthWrite: false })));

export const view = { scale: 1, left: 0, bottom: 0, top: 0 };          // device px
export function resize() {
  const dpr = window.devicePixelRatio;
  const bw = Math.round(innerWidth * dpr), bh = Math.round(innerHeight * dpr);
  renderer.setSize(bw, bh, false);                                     // backing store only
  const s = Math.max(1, Math.floor(Math.min(bw / W, bh / H)));
  view.scale = s;
  view.left = Math.floor((bw - W * s) / 2);
  view.bottom = Math.floor((bh - H * s) / 2);                          // GL viewport is bottom-up
  view.top = bh - view.bottom - H * s;
}
addEventListener('resize', resize); resize();

export function present() {
  renderer.setRenderTarget(rt);  renderer.render(scene, camera);       // viewport = rt.viewport
  renderer.setRenderTarget(null);
  renderer.setViewport(view.left, view.bottom, W * view.scale, H * view.scale);
  renderer.render(blitScene, blitCam);                                 // autoClear blacks the bars
}
export function toLogical(cx: number, cy: number) {                    // pointer -> logical px, y-down
  const r = canvas.getBoundingClientRect();
  const x = Math.floor(((cx - r.left) * canvas.width / r.width - view.left) / view.scale);
  const y = Math.floor(((cy - r.top) * canvas.height / r.height - view.top) / view.scale);
  return { x, y, inside: x >= 0 && y >= 0 && x < W && y < H };
}
const timer = new THREE.Timer(); timer.connect(document);
renderer.setAnimationLoop((t) => { timer.update(t); const dt = Math.min(timer.getDelta(), 1/15); /* input, sim, tweens */ present(); });
```

The canvas backing store is sized in **device pixels**, and the integer scale is computed in device pixels too. On a 4K screen with DPR 2 you get scale 8; on a 1080p laptop you get scale 4. The letterbox is just the cleared canvas, so you never size a CSS box to a fractional width. At fractional DPRs (1.25 and 1.5 on Windows) `innerWidth*dpr` may not be an integer, so the compositor can resample by about 1px. `image-rendering: pixelated` keeps that resample nearest-neighbour. For an exact match, size from a `ResizeObserver`'s `devicePixelContentBoxSize` where the browser supports it (Chromium and Firefox) and fall back to the rounding above.

### (b) Render straight to the canvas with an ortho camera in logical units

Make the camera `OrthographicCamera(0, W, H, 0)`, set the canvas to `W*s × H*s` device pixels, use NearestFilter on textures and round positions. Each logical pixel becomes an s×s block of real pixels.

### Trade-offs

| | (a) low-res target + blit | (b) direct at canvas res |
|---|---|---|
| Grid integrity | Guaranteed. Rotating, scaling or tweening anything still lands on the 480×270 grid, the way real SMS hardware does. | Rotated or scaled sprites draw "mixels" (texels finer than the grid), which breaks the look. |
| Sub-pixel motion | None. Motion steps 1 logical px (4 to 8 screen px). That is authentic, and you choose the easing. | Smooth if you don't round; mixed-resolution if you do and forget somewhere. |
| Text | Bitmap glyphs are exact. Any smooth or SDF text gets quantised to the grid, which is good for consistency. | You could draw hi-res text, which immediately looks un-retro. |
| Raycast / hit-test | Pointer → logical px (`toLogical`), then AABB or Raycaster in the same coordinate system. | Same maths, but every layout constant needs care with the scale. |
| DPR / resize | One place handles it (`resize`). Game code never sees DPR. | Camera and canvas sizing are coupled to the scale. |
| Cost | One extra 480×270 pass, which is negligible. | Slightly less. |

**Recommendation: (a).** A card game is mostly UI. Exact grid integrity and one logical coordinate system for layout, hit-testing and focus matter far more than sub-pixel smoothness, which an SMS look doesn't want anyway.

There is a cheaper variant of (a): call `renderer.setSize(480, 270, false)` and CSS-scale the canvas to `480*s/dpr` px with `image-rendering: pixelated`. It works and drops the blit, but you lose control at fractional DPR and the letterbox colour. Keep the explicit blit.

**Resolution:** the real SMS ran at 256×192. At **480×270** an 8×8 font gives tight card text: a 64-px-wide card fits only 7 to 8 characters per line. Either add a 5×7 or 4×6 small font for card bodies, or pick **640×360**. Both scale by an integer to 1080p (×4 / ×3) and to 4K (×8 / ×6). 640×360 is the safer choice if card text runs long.

## 2. Sprites and sprite sheets

Use `Mesh` + `PlaneGeometry` with a small `ShaderMaterial`, not `Sprite`. A `Sprite` is a camera-facing billboard centred on its position (adjustable with `center`), and its `SpriteMaterial` can't do a white flash. A shared custom material lets you select a frame, flip, tint and flash with uniforms on **one texture, with no clones**.

```ts
export function pixelate<T extends THREE.Texture>(tex: T): T {
  tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false; tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}
export const loadPixelTexture = async (url: string) => pixelate(await new THREE.TextureLoader().loadAsync(url));

// Origin = TOP-LEFT corner. A centred 15-px quad would put its edges on .5 and shimmer.
export const quad = (w: number, h: number) => new THREE.PlaneGeometry(w, h).translate(w / 2, -h / 2, 0); // cache per size

const vertexShader = `uniform vec4 uFrame; uniform vec2 uFlip; varying vec2 vUv;
  void main() { vec2 t = uv;
    if (uFlip.x < 0.0) t.x = 1.0 - t.x;  if (uFlip.y < 0.0) t.y = 1.0 - t.y;
    vUv = uFrame.xy + t * uFrame.zw;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const fragmentShader = `uniform sampler2D map; uniform vec3 uTint; uniform float uFlash, uOpacity; varying vec2 vUv;
  void main() { vec4 c = texture2D(map, vUv);
    if (c.a < 0.5) discard;                                  // alpha cutout
    gl_FragColor = vec4(mix(c.rgb * uTint, vec3(1.0), uFlash), uOpacity);
    #include <colorspace_fragment>
  }`;
export const spriteMaterial = (map: THREE.Texture) => new THREE.ShaderMaterial({
  uniforms: { map: { value: map }, uFrame: { value: new THREE.Vector4(0, 0, 1, 1) },
    uFlip: { value: new THREE.Vector2(1, 1) }, uTint: { value: new THREE.Color(0xffffff) },
    uFlash: { value: 0 }, uOpacity: { value: 1 } },
  vertexShader, fragmentShader,
  transparent: true, depthTest: false, depthWrite: false,   // ALL 2D materials transparent
});

// frame i of a grid sheet (flipY=true so v is measured from the bottom)
function setFrame(m: THREE.ShaderMaterial, sheetW: number, sheetH: number, fw: number, fh: number, cols: number, i: number) {
  const fx = (i % cols) * fw, fy = Math.floor(i / cols) * fh;
  m.uniforms.uFrame.value.set(fx / sheetW, 1 - (fy + fh) / sheetH, fw / sheetW, fh / sheetH);
}
const place = (o: THREE.Object3D, x: number, y: number) => o.position.set(Math.round(x), H - Math.round(y), 0); // y-down layout
```

Notes:

- **Alpha:** use a hard `discard` at 0.5 (equivalent to `alphaTest: 0.5` on built-in materials) so edges have no fringe. The SMS had no alpha. Keep `uOpacity` only for fades. A stepped "dither" fade fits the era better than smooth opacity.
- **Tint vs flash:** multiplying by a tint can only darken. A hit flash must `mix` toward white. A material colour above 1 can't brighten black outline pixels.
- **Texture bleed:** with integer placement and NearestFilter you sample texel centres. If you ever rotate or scale a sprite, add 1 px of padding or extrusion between frames.
- **Draw order:** every 2D material uses `transparent: true` and `depthTest: false`. If some materials are opaque, they render in the opaque list before all transparent ones, whatever their `renderOrder`. Layer with `Group.renderOrder` (sorted as `groupOrder`) and with `renderOrder` within a group:

```ts
export const Layer = { BG: 0, ENEMIES: 10, FX: 20, HAND: 30, HUD: 40, TOOLTIP: 50, CURSOR: 60 } as const;
handGroup.renderOrder = Layer.HAND;          // THREE.Group: applies to every descendant
cards.forEach((c, i) => (c.renderOrder = i)); // order within the hand; hovered card = 99
// sub-containers inside handGroup: use new THREE.Object3D(), NOT Group (a nested Group resets groupOrder)
```

You can layer with z instead, because the transparent list sorts back to front by z. Explicit `renderOrder` is easier to reason about and debug.

## 3. Text

| Option | Crisp at 8 px? | Notes |
|---|---|---|
| **Bitmap atlas** (8×8 or proportional 5×7 glyph sheet) | **Exact** | You own every pixel. Easy to colour-tint. Proportional widths go in an `advance` table. |
| `CanvasTexture` + `fillText` with a pixel TTF | Mostly, not guaranteed | **`imageSmoothingEnabled` only affects `drawImage`, not `fillText`.** Canvas text is always antialiased, and the spec leaves the rasteriser undefined (W3C bug 12410). You get grey fringe pixels that differ by browser. |
| troika-three-text (MIT, 0.52.x) | No | SDF text with derivative antialiasing; a soft edge is the whole point. Loads .ttf/.otf/.woff (not woff2). Good for big smooth text, wrong for this look. Inside (a) its AA turns into grey pixel blocks. |
| three-bmfont-text (MIT, 3.0.1, unmaintained for years) | Yes with a non-SDF BMFont + NearestFilter | Old three-era code. Its layout engine is the only reason to use it. Not worth the dependency. |

**Recommendation:** use a bitmap atlas, blitted with `drawImage` into a small per-label `CanvasTexture` and shown on one quad that uses the sprite material, which gives you tint and flash for free. A battle screen has dozens of labels, not thousands, so one draw call per label is fine. Instanced glyph quads are an optimisation to defer until profiling asks for it.

```ts
export class BitmapFont {           // white glyphs, cells gw×gh, `cols` per row, starting at char `first`
  /* fields: img, gw, gh, cols, first, count, advance (per-glyph widths, {} = monospace) */
  width(s: string) { let w = 0; for (const ch of s) w += this.advance[ch] ?? this.gw; return w; }
  draw(ctx: CanvasRenderingContext2D, s: string, x: number, y: number) {
    for (const ch of s) {
      const g = ch.charCodeAt(0) - this.first;
      if (g < 0 || g >= this.count) throw new Error(`BitmapFont: no glyph for ${JSON.stringify(ch)}`);
      ctx.drawImage(this.img, (g % this.cols) * this.gw, Math.floor(g / this.cols) * this.gh,
                    this.gw, this.gh, x, y, this.gw, this.gh);
      x += this.advance[ch] ?? this.gw;
    }
  }
}
export class Label extends THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> {
  // fixed capacity: changing a canvas's size would force a new GPU texture
  constructor(font: BitmapFont, capacityPx: number, color: THREE.ColorRepresentation) {
    const c = document.createElement('canvas'); c.width = capacityPx; c.height = font.gh;
    const tex = pixelate(new THREE.CanvasTexture(c));
    super(quad(capacityPx, font.gh), spriteMaterial(tex));
    this.material.uniforms.uTint.value.set(color); /* keep ctx, tex, font */
  }
  setText(s: string) {
    if (this.font.width(s) > this.capacityPx) throw new Error(`Label overflow: "${s}"`);
    this.ctx.clearRect(0, 0, this.capacityPx, this.font.gh);
    this.font.draw(this.ctx, s, 0, 0);
    this.tex.needsUpdate = true;
  }
}
```

**Getting an atlas from Press Start 2P:**

- Press Start 2P is by CodeMan38 and licensed **SIL OFL 1.1**, confirmed in google/fonts `ofl/pressstart2p/METADATA.pb`. The copyright line names "Press Start 2P" as a **Reserved Font Name**.
- You may bundle it, embed it, and rasterise it into your game commercially.
- You may not sell the font on its own.
- A *modified* version must not be called "Press Start 2P".
- Ship the OFL text and copyright line in your credits or licences file.
- It sits on an 8×8 grid, so render it at 8 px (or 16 px).
- You *can* load it from Google Fonts for canvas use, but **self-host it** (`@fontsource/press-start-2p` or the TTF in `public/`). That avoids a third-party request and works offline.
- Before calling `fillText`, you must `await document.fonts.load('8px "Press Start 2P"')`; canvas doesn't wait for webfonts.
- Bake the atlas once at runtime or with a build script, then **threshold the alpha** to kill the AA. Commit the PNG and inspect it by eye; the exact output varies by browser.

```ts
await document.fonts.load('8px "Press Start 2P"');
ctx.font = '8px "Press Start 2P"'; ctx.textBaseline = 'top'; ctx.fillStyle = '#fff';
for (let i = 0; i < 96; i++) ctx.fillText(String.fromCharCode(32 + i), (i % 16) * 8, Math.floor(i / 16) * 8);
const d = ctx.getImageData(0, 0, 128, 48);
for (let i = 3; i < d.data.length; i += 4) d.data[i] = d.data[i] >= 128 ? 255 : 0;
ctx.putImageData(d, 0, 0);
```

For card body text, hand-draw a 5×7 proportional font in your own SMS style. Fonts like that take an afternoon, and a custom one sidesteps licensing.

## 4. UI widgets

**Pick: all-three.js for everything the player sees.** That covers cards, hand, enemies, buttons, panels, tooltips, map, shop and menus, all drawn into the 480×270 target. Use a tiny retained widget tree of your own for layout, hit-testing and focus. Use the DOM only for things outside the fiction: the "click / press a key to start" gate (needed for the audio unlock), a hidden `aria-live` region that mirrors combat log text for screen readers, and dev tools.

Why not a DOM overlay for menus and tooltips?

- **It breaks the pixel grid.** You would have to scale it by the same integer factor, keep `image-rendering: pixelated` on every image, use bitmap fonts in CSS, and keep two coordinate systems in sync during resize.
- **Focus gets split.** You end up with two focus systems, DOM `tabindex` plus your gamepad focus, and the bugs live where they meet. A gamepad needs a custom focus model anyway, so build one and let keyboard and mouse feed it too.
- **Tooltips move with cards.** They need to follow tweened cards frame-accurately, which is trivial in the scene graph and awkward in the DOM.

**Building blocks:**

- **Screens** are `THREE.Group`s with a `renderOrder` band, toggled with `visible`.
- **Panels and 9-slice:** compose the panel once into a `CanvasTexture` at its exact pixel size, drawing 9 `drawImage` slices from a border sheet. One quad, exact pixels, rebuilt only on resize. That beats 9 meshes with stretched UVs.
- **A widget** is `{ id, rect /* logical px, y-down */, layer, enabled, object: Object3D, onConfirm }`. The layout code writes `rect`, and the sync step calls `place(object, rect.x, rect.y)`.
- **Hit-testing:** an AABB test in logical pixels covers almost everything. Use the Raycaster only for rotated or scaled cards.

```ts
export function hitTest(widgets: readonly Widget[], x: number, y: number): Widget | undefined {
  let best: Widget | undefined;                       // undefined = pointer over nothing (expected)
  for (const w of widgets) { const r = w.rect;
    if (!w.enabled || x < r.x || y < r.y || x >= r.x + r.w || y >= r.y + r.h) continue;
    if (!best || w.layer >= best.layer) best = w; }
  return best;
}
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
export function raycastPick(x: number, y: number, objects: THREE.Object3D[]) {
  ndc.set(((x + 0.5) / W) * 2 - 1, -(((y + 0.5) / H) * 2 - 1));  // logical px centre -> NDC
  ray.setFromCamera(ndc, camera);                                   // works for OrthographicCamera
  return ray.intersectObjects(objects, true)                        // sorted by distance (z), NOT renderOrder:
    .sort((a, b) => b.object.userData.layer - a.object.userData.layer); // re-sort by your layer
}
```

The Raycaster tests geometry, so it ignores `discard`ed transparent pixels: a card's whole rectangle is clickable. That is what you want for cards. For irregular enemy sprites, use a hand-authored hitbox rect.

## 5. Input

**Gamepad facts:**

- **When pads appear:** `gamepadconnected` fires when a pad is plugged in, or, if it was already connected, **on the first button press or axis move while the page is visible and focused**. Firefox deliberately hides pads until then to block fingerprinting. Show "Press any button" and never assume a pad at boot.
- **Read a fresh snapshot every frame:** call `navigator.getGamepads()` inside rAF. Chromium returns a fixed-length array with `null` holes. Don't keep `Gamepad` objects across frames, because Chromium's are snapshots.
- **Check `gp.mapping === 'standard'`.** Firefox, especially on Linux and macOS, reports some pads (DualSense, generic USB) with `mapping: ''` and raw indices. Treat those as unsupported or apply a per-`id` remap table.
- **Firefox doesn't support `timestamp`.**
- **Secure context:** current browsers require HTTPS; `localhost` counts.
- **Standard mapping indices:**
  - Buttons: A=0, B=1, X=2, Y=3, LB=4, RB=5, LT=6, RT=7, Back=8, Start=9, L3=10, R3=11, DUp=12, DDown=13, DLeft=14, DRight=15, Home=16 (the OS or Steam often grabs Home, so don't bind it).
  - Axes: 0/1 = left stick x/y (+y is down), 2/3 = right stick.
  - Triggers are analog: `buttons[6].value` runs from 0 to 1.
- **Pads don't count as user activation** for autoplay (see §7).
- Rumble (`gp.vibrationActuator?.playEffect('dual-rumble', …)`) is optional and Chromium-centric, so feature-detect it.

**Virtual input:** keyboard, gamepad and mouse all write into one set of actions. Game and UI code only ask `pressed('confirm')` or `repeated('left')`.

```ts
export type Action = 'up'|'down'|'left'|'right'|'confirm'|'cancel'|'prev'|'next'|'endTurn'|'inspect'|'menu';
const KEYS: Record<string, Action> = { ArrowUp:'up', KeyW:'up', ArrowDown:'down', KeyS:'down', ArrowLeft:'left', KeyA:'left',
  ArrowRight:'right', KeyD:'right', Enter:'confirm', Space:'confirm', KeyZ:'confirm', Escape:'cancel', KeyX:'cancel',
  Backspace:'cancel', KeyQ:'prev', Tab:'next', KeyE:'endTurn', KeyC:'inspect', KeyP:'menu' };   // e.code = physical key
const PAD: Partial<Record<number, Action>> = { 0:'confirm', 1:'cancel', 2:'inspect', 3:'endTurn', 4:'prev', 5:'next',
  9:'menu', 12:'up', 13:'down', 14:'left', 15:'right' };

class VirtualInput {
  private keysHeld = new Set<Action>(); private keysTapped = new Set<Action>(); // latch sub-frame taps
  private now = new Set<Action>(); private before = new Set<Action>();
  private stickDir: Action | null = null;
  lastDevice: 'mouse' | 'keyboard' | 'gamepad' = 'mouse';
  /* constructor: keydown -> preventDefault, if (!e.repeat) keysTapped.add, keysHeld.add; keyup -> delete;
     window blur -> keysHeld.clear(); pointermove/pointerdown -> pointer state + lastDevice='mouse' */
  update(dt: number) {
    this.before = this.now;
    this.now = new Set([...this.keysHeld, ...this.keysTapped]); this.keysTapped.clear();
    for (const gp of navigator.getGamepads()) {
      if (!gp || !gp.connected || gp.mapping !== 'standard') continue;
      gp.buttons.forEach((b, i) => { const a = PAD[i]; if (a && b.pressed) { this.now.add(a); this.lastDevice = 'gamepad'; } });
      const [x, y] = [gp.axes[0], gp.axes[1]], mag = Math.hypot(x, y);   // radial dead zone + hysteresis
      if (mag < 0.35) this.stickDir = null;
      else if (mag > 0.5 || this.stickDir) this.stickDir = Math.abs(x) > Math.abs(y) ? (x < 0 ? 'left' : 'right') : (y < 0 ? 'up' : 'down');
      if (this.stickDir) this.now.add(this.stickDir);
    }
    /* track heldFor[a] += dt for nav actions -> repeated(): first edge, then 280 ms delay, then every 90 ms */
  }
  pressed(a: Action) { return this.now.has(a) && !this.before.has(a); }   // rising edge
}
```

**How the mouse fits in:**

- A `pointermove` that actually moved sets focus to the widget under the cursor. Gate it on movement so a resting cursor never steals focus from the d-pad.
- Left click means `confirm` on that widget, and right click means `cancel`.
- When `lastDevice` changes, swap button-prompt glyphs (keyboard keys vs pad face buttons) and hide the focus ring in mouse mode.
- Card drag-to-target is a mouse-only extra on top of the same "select card → choose target → confirm" state machine.

**Focus navigation** has two layers:

1. **List navigation inside a row.** The hand uses left/right with wrap, ordered by index, regardless of geometry. Overlapping or fanned cards would confuse a purely spatial search.
2. **Spatial navigation between rows**, for up from the hand to enemies or across to the end-turn button.

The rule is: pick the nearest candidate in the half-plane of the direction, scored as `along + 2·|across|`. Use **modal scopes**: while targeting, only enemies (or allies) are focusable, LB/RB cycle them, and `cancel` returns the card to the hand.

```ts
export function spatialNext(cur: Focusable, dir: Dir, all: readonly Focusable[]): Focusable {
  let best = cur, bestScore = Infinity;            // staying put at an edge is an expected outcome
  for (const f of all) {
    if (f === cur || !f.enabled) continue;
    const dx = cx(f.rect) - cx(cur.rect), dy = cy(f.rect) - cy(cur.rect);
    const along = dir === 'left' ? -dx : dir === 'right' ? dx : dir === 'up' ? -dy : dy;
    const across = dir === 'left' || dir === 'right' ? dy : dx;
    if (along <= 0) continue;
    const score = along + 2 * Math.abs(across);
    if (score < bestScore) { bestScore = score; best = f; }
  }
  return best;
}
// battle default: hand row (rowNext on left/right), up -> spatialNext into enemies, the end-turn button is reachable
// spatially from the right end of the hand, and the `endTurn` action works from anywhere.
```

## 6. Animation and tweens

No library. About 40 lines: tween numeric fields on **plain model objects** (`card.view = { x, y, lift }`) and return promises so combat sequencing reads like a script: `await tw.to(card.view, { x: 200, y: 40 }, 0.18); hit(); await tw.to(...)`. A new tween on the same target and key replaces the old one, so a hover jitter can't fight itself. Drive it from the `Timer` delta so that pause and 2× speed are a single multiplier.

```ts
export const outCubic = (t: number) => 1 - (1 - t) ** 3;
export const stepped = (e: (t: number) => number, n: number) => (t: number) => Math.floor(e(t) * n) / n; // 8-bit "chunky" motion
export class Tweener {
  private runs: { target: any; key: string; from: number; to: number; t: number; dur: number; ease: (t: number) => number; done: () => void }[] = [];
  to<K extends string>(target: Record<K, number>, props: Record<K, number>, dur: number, ease = outCubic): Promise<void> {
    const keys = Object.keys(props) as K[];
    this.runs = this.runs.filter((r) => !(r.target === target && keys.includes(r.key as K)));   // latest wins
    return Promise.all(keys.map((key) => new Promise<void>((done) =>
      this.runs.push({ target, key, from: target[key], to: props[key], t: 0, dur, ease, done })))).then(() => {});
  }
  update(dt: number) {
    for (const r of this.runs) { r.t = Math.min(r.t + dt, r.dur); r.target[r.key] = r.from + (r.to - r.from) * r.ease(r.dur ? r.t / r.dur : 1); }
    const fin = this.runs.filter((r) => r.t >= r.dur); this.runs = this.runs.filter((r) => r.t < r.dur); fin.forEach((r) => r.done());
  }
}
// render sync, once per frame, the ONLY place floats become pixels:
// mesh.position.set(Math.round(v.x) + shake.x, H - Math.round(v.y - v.lift) + shake.y, 0)
// hit flash (hard blink, not a fade): mat.uniforms.uFlash.value = (t < 0.24 && Math.floor(t * 15) % 2 === 0) ? 1 : 0
// shake: integer offsets, decaying amplitude, Math.random() is fine because it is cosmetic only
```

**Keeping things on the grid in (a):**

- Round only at the sync step.
- Keep every parent container at integer positions. A parent at x = 0.5 shifts all its children off the grid.
- Round the camera too: shake is applied as integer offsets.
- **Avoid non-integer scaling of pixel art.** Nearest sampling at 1.1× duplicates random texel rows. Show hover as "lift 6–8 px + highlighted border sprite", and inspect as an integer ×2 enlargement.
- Card rotation for a fanned hand does look jaggy at 480×270. Either use a flat overlapping row (more SMS-like), or accept it at small angles in steps of about 3°.

## 7. Audio

The SMS sound chip is the **SN76489 PSG**: **3 square-wave tone channels with a fixed 50% duty, plus 1 noise channel** (white or periodic, from a 16-bit LFSR with Sega's taps), with 4-bit volume in 2 dB steps. NTSC frequency = 3579545 / (32·N), for a 10-bit N. It has no triangle and no pulse-width control; those are the NES. Web Audio's `'square'` oscillator is band-limited 50% duty, which is close enough. A noise buffer generated from an LFSR gives the right grit.

```ts
let ac: AudioContext | null = null, master: GainNode;
export function unlockAudio() {                    // call from a pointerdown/keydown handler
  if (!ac) { ac = new AudioContext(); master = ac.createGain(); master.gain.value = 0.3; master.connect(ac.destination); }
  if (ac.state === 'suspended') void ac.resume();
}
for (const ev of ['pointerdown', 'keydown'] as const) addEventListener(ev, unlockAudio);
export function tone(freq: number, dur = 0.08, slideTo = 1, vol = 0.5) {
  if (!ac) throw new Error('audio before unlock');
  const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
  o.type = 'square'; o.frequency.setValueAtTime(freq, t);
  if (slideTo !== 1) o.frequency.exponentialRampToValueAtTime(freq * slideTo, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.02);
}
// tone(880, .05) menu blip · tone(330, .2, .5) hit · tone(523, .08) + tone(784, .12) confirm · noise(.2) explosion
```

The noise channel, built from an LFSR buffer and an `AudioBufferSourceNode`, is in the verified `audio.ts`.

**Autoplay rule:** an `AudioContext` created or resumed outside a user activation starts `suspended`. User activation means keydown (not Escape), pointerdown/up, mousedown, or touchend. **Gamepad input is not a user activation**, so a pad-only player can't unlock audio. Put a title-screen "Click or press any key" gate in front, or accept silence until the first mouse or keyboard input, and say so on screen. For music, run a tiny tracker: a pattern array scheduled about 100 ms ahead on `ac.currentTime`. Don't schedule it with `setTimeout` timing.

## 8. Build and tooling

`npm create vite@latest vibespire -- --template vanilla-ts`, then `npm i three` and `npm i -D @types/three vitest`.

```
index.html                 # <canvas> created by three; no framework
vite.config.ts
public/                    # copied verbatim, unhashed, referenced as "/fonts/PressStart2P.ttf", "/sfx/..."
src/
  engine/                  # PURE TS: cards, combat reducer, map gen, rng, save schema. No DOM, no three.
  render/  ui/  input/  audio/
  assets/                  # sheets imported as URLs -> hashed: import heroUrl from './assets/hero.png'
  main.ts
sim/run.ts                 # headless simulator: node sim/run.ts --seed X --runs 1000
```

```ts
// vite.config.ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  base: '/',                       // served at the domain root; use './' for itch.io zips / subpaths
  build: { outDir: 'dist', target: 'es2022' },   // Vite 8 bundles with Rolldown: build.rolldownOptions
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
```

**Keeping the engine headless:**

- Give it its own `tsconfig.engine.json` with `"lib": ["ES2023"]` (no `"DOM"`) and `"include": ["src/engine"]`. Then any `document` or `window` reference inside the engine is a **compile error**. Run `tsc -p tsconfig.engine.json --noEmit` in CI.
- Node 22.18+ and 24+ run `.ts` directly by stripping types, so `node sim/run.ts` and `node --test src/engine/*.test.ts` work with no build step. This needs:
  - `"type": "module"` in package.json (Vite's template sets it; without it Node throws `Cannot use import statement outside a module`, which I hit while testing).
  - `"erasableSyntaxOnly": true`: no `enum`, no `namespace`, **no constructor parameter properties** (tsc flagged `constructor(readonly x)`).
  - `"verbatimModuleSyntax": true`, with `import type` for types.
  - `"allowImportingTsExtensions": true` plus `"noEmit": true`, and imports written with the `.ts` extension. Vite, Vitest and Node all accept that.
- Vitest is the nicer runner for the engine (watch mode, the same config as Vite). `node --test` is fine for the simulator.

**Assets:**

- **Import** sprite sheets from `src/assets` so they get hashed URLs and cache-bust on deploy.
- Put fonts, licence texts and anything fetched by a computed name in **`public/`**.
- With a non-root `base`, refer to public files as `` `${import.meta.env.BASE_URL}fonts/...` ``.
- Small PNGs under 4 KB are inlined as data URIs by default (`build.assetsInlineLimit`). That is harmless here.

## 9. Persistence, RNG and replay

**RNG:**

- Use **sfc32** (128-bit state, passes PractRand, fast) seeded by **xmur3**, a string hash, from bryc's PRNG notes.
- Avoid mulberry32 for anything serious: its author notes it skips about a third of 32-bit outputs, and it only has 32 bits of state.
- Store the state as a 4-tuple so it serialises.
- Use **separate streams per domain** (map, card rewards, relics, shuffle, monster AI, events, potions), each seeded from `${seed}/${name}`, the way Slay the Spire does. Opening a chest then doesn't change the next fight's shuffle, and save/reload doesn't reroll outcomes.

```ts
export function xmur3(str: string) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return (h ^= h >>> 16) >>> 0; };
}
export class Rng {
  s: [number, number, number, number];
  constructor(s: [number, number, number, number]) { this.s = s; }
  static fromSeed(seed: string) { const h = xmur3(seed); const r = new Rng([h(), h(), h(), h()]); for (let i = 0; i < 12; i++) r.u32(); return r; }
  u32() { let [a, b, c, d] = this.s; const t = (((a + b) | 0) + d) | 0; d = (d + 1) | 0; a = b ^ (b >>> 9);
          b = (c + (c << 3)) | 0; c = (c << 21) | (c >>> 11); c = (c + t) | 0; this.s = [a, b, c, d]; return t >>> 0; }
  int(n: number) { if (!Number.isInteger(n) || n <= 0) throw new Error(`Rng.int: bad n=${n}`); return Math.floor((this.u32() / 4294967296) * n); }
}
export const STREAMS = ['map', 'cards', 'relics', 'shuffle', 'monsterAi', 'events', 'potions'] as const;
```

**Save:**

- `localStorage.setItem('vibespire.run.v1', JSON.stringify(save))`, holding `{ version, seed, rng: {stream: state}, floor, hp, maxHp, gold, deck: string[], relics: string[], log }`.
- Store ids, never object graphs.
- Save at checkpoints (entering a node, start of combat, end of turn) and delete the save when the run ends.
- `loadRunOrNull()` returns `null` only for "no save". An unknown `version` throws, so you write a migration instead of silently resetting.
- Let `QuotaExceededError` propagate to a visible "save failed" message.
- The 5 MB per origin quota is plenty for a run.

**Deterministic replay:**

- Make the engine a pure reducer: `step(state, action) → state` (or mutate it in place, deterministically).
- **All randomness comes from `state.rng.*`**, and nothing in the engine reads `Math.random` or `Date.now`. Cosmetic randomness (shake, particles) lives in render code.
- Use **integers only** in game rules: Weak = `Math.floor(dmg * 3 / 4)`, never float accumulators.
- Never iterate over a `Set` or `Map` whose insertion order depends on UI timing.
- `Array.prototype.sort` has been stable since ES2019, so comparators with explicit tie-breakers are deterministic.
- A replay is `seed + action[]`. Add a Vitest test that replays recorded logs and compares a hash of the final state, and run the simulator over thousands of seeds for balance and to catch crashes.
- Animation must *consume* engine events (`{type:'damage', target, amount}`), never feed back into the engine. That keeps the headless sim and the rendered game bit-identical.

## Sources

- three.js r186 docs and manual via Context7 `/mrdoob/three.js/r186`: RenderTarget options, WebGLRenderer.Options, OrthographicCamera, Timer, the SpriteMaterial and billboards manual, the `pixelTexture` helper from the `webgpu_postprocessing_pixel` example.
- three r186 source (`npm pack three@0.186.1`): `WebGLRenderer.js` (colorSpace when rendering to a target, groupOrder), `WebGLRenderLists.js` (sort), `WebGLTextures.js` (SRGB8_ALPHA8), `core/Clock.js` (deprecated r183), `ImageBitmapLoader.js`, `package.json` exports.
- [MDN: Using the Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API)
- [troika-three-text README](https://github.com/protectwise/troika/blob/main/packages/troika-three-text/README.md)
- [google/fonts Press Start 2P METADATA](https://github.com/google/fonts/tree/main/ofl/pressstart2p)
- [W3C bug 12410 (fillText AA unspecified)](https://www.w3.org/Bugs/Public/show_bug.cgi?id=12410)
- [bryc PRNGs.md](https://github.com/bryc/code/blob/master/jshash/PRNGs.md)
- Vite 8 docs via Context7 `/vitejs/vite/v8.0.10` (base, build.rolldownOptions, the vanilla-ts template)
- three.js forum threads on NearestFilter for low-res targets ([1](https://discourse.threejs.org/t/how-do-i-take-a-texture-interpolate-it-to-a-larger-resolution-and-then-render-it/4235), [2](https://discourse.threejs.org/t/low-resolution-texture-is-very-blurry-how-can-i-get-around-this-issue/29948))
