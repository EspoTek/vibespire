/**
 * Procedural full-screen battle backdrops (640x360), drawn once at startup into PixelBuffers using
 * only SMS palette colours and ordered dithering (no gradients). Pure: `gfx.textureFromPixels`
 * uploads them.
 *
 * Composition rules (so a 64x64 enemy drawn at 2x, standing on a baseline at y≈200 centred at
 * x=320, stays readable): the band behind the enemy (x 220..420, y 60..200) is darker and lower in
 * contrast than the sides; bright highlights live at the edges; the bottom third, where the hand of
 * cards sits, is calm.
 */
import { C } from './palette.ts';
import { artRng, bayer, PixelBuffer } from './pixels.ts';
import { H, W } from './layout.ts';

export type BackdropId = 'verdant' | 'foundry' | 'crown';
export const BACKDROP_IDS: readonly BackdropId[] = ['verdant', 'foundry', 'crown'];
export const BACKDROP_NAMES: Readonly<Record<BackdropId, string>> = {
  verdant: 'ACT 1  THE VERDANT DECKS',
  foundry: 'ACT 2  THE FOUNDRY',
  crown: 'ACT 3  THE CROWN',
};

/** Enemy baseline (feet) in logical px; phase 2 combat layout should use this. */
export const ENEMY_BASELINE_Y = 200;

export function drawBackdrop(id: BackdropId): PixelBuffer {
  switch (id) {
    case 'verdant': return drawVerdant();
    case 'foundry': return drawFoundry();
    case 'crown': return drawCrown();
  }
}

// ------------------------------------------------------------------ helpers

/** Ramp `colors` vertically between y0 and y1 using ordered dither between neighbours. */
function ditherRamp(b: PixelBuffer, x: number, y0: number, w: number, y1: number, colors: readonly number[]): void {
  const n = colors.length - 1;
  for (let y = y0; y < y1; y++) {
    const t = ((y - y0) / Math.max(1, y1 - y0)) * n;
    const i = Math.min(n - 1, Math.floor(t));
    const level = Math.round((t - i) * 16);
    for (let xx = x; xx < x + w; xx++) b.set(xx, y, bayer(xx, y, level) ? (colors[i + 1] as number) : (colors[i] as number));
  }
}

interface Blob { x: number; y: number; r: number }

/** Layered foliage clump: shadow pass, body pass, dithered highlight pass. */
function foliage(b: PixelBuffer, blobs: readonly Blob[], shadow: number, body: number, light: number, hi: number | null): void {
  for (const k of blobs) b.disc(k.x + 2, k.y + 3, k.r, shadow);
  for (const k of blobs) b.disc(k.x, k.y, k.r - 1, body);
  for (const k of blobs) {
    const r = k.r * 0.55;
    const cx = k.x - k.r * 0.3, cy = k.y - k.r * 0.35;
    for (let y = Math.floor(cy - r); y <= cy + r; y++) {
      for (let x = Math.floor(cx - r); x <= cx + r; x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r;
        if (d > 1) continue;
        if (bayer(x, y, Math.round((1 - d) * 12))) b.set(x, y, light);
      }
    }
    if (hi !== null && k.r > 6) b.set(Math.round(cx - 1), Math.round(cy - 1), hi);
  }
}

function trunk(b: PixelBuffer, x: number, top: number, bottom: number, w: number, rnd: () => number, base: number, lit: number, dark: number): void {
  for (let y = top; y < bottom; y++) {
    const flare = y > bottom - 14 ? Math.floor((y - (bottom - 14)) / 4) : 0; // root flare
    const x0 = x - flare, x1 = x + w + flare;
    for (let xx = x0; xx < x1; xx++) {
      const u = (xx - x0) / Math.max(1, x1 - x0);
      let c = base;
      if (u < 0.25) c = bayer(xx, y, 10) ? lit : base;
      else if (u > 0.75) c = bayer(xx, y, 9) ? dark : base;
      b.set(xx, y, c);
    }
  }
  // bark streaks and knots
  const streaks = Math.floor(w / 3);
  for (let s = 0; s < streaks; s++) {
    const sx = x + 1 + Math.floor(rnd() * (w - 2));
    const sy = top + Math.floor(rnd() * (bottom - top - 10));
    b.vline(sx, sy, 4 + Math.floor(rnd() * 10), dark);
  }
}

// ------------------------------------------------------------------ Act 1: The Verdant Decks

function drawVerdant(): PixelBuffer {
  const b = new PixelBuffer(W, H, C.black);
  const rnd = artRng(0xa11ce);

  // Sky band: black canopy gap ramping to dark green, with drifting spores.
  ditherRamp(b, 0, 0, W, 96, [C.black, C.darkGreen, C.darkGreen]);
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(rnd() * W), y = Math.floor(rnd() * 90);
    b.set(x, y, rnd() < 0.3 ? C.cyan : rnd() < 0.5 ? C.mint : C.leaf);
  }

  // Far tree line: dark silhouettes (low contrast, sits behind the enemy).
  const far: Blob[] = [];
  for (let x = -20; x < W + 20; x += 18 + Math.floor(rnd() * 10)) {
    far.push({ x, y: 70 + Math.floor(rnd() * 26), r: 16 + Math.floor(rnd() * 12) });
  }
  for (let x = 0; x < W; x += 34 + Math.floor(rnd() * 20)) b.rect(x, 80, 5, 130, C.black);
  foliage(b, far, C.black, C.darkGreen, C.darkGreen, null);
  // undergrowth: dark ramp with faint leaf speckle (stays low-contrast behind the enemy)
  ditherRamp(b, 0, 104, W, 204, [C.darkGreen, C.black, C.darkGreen]);
  for (let i = 0; i < 900; i++) {
    const x = Math.floor(rnd() * W), y = 104 + Math.floor(rnd() * 96);
    b.set(x, y, rnd() < 0.15 ? C.green : C.darkGreen);
  }

  // Mid trees: trunks + crowns, kept to the sides of centre stage.
  const midXs = [16, 92, 168, 448, 520, 596];
  for (const tx of midXs) {
    trunk(b, tx, 30, 206, 14, rnd, C.brown, C.rust, C.black);
  }
  const midBlobs: Blob[] = [];
  for (const tx of midXs) {
    for (let k = 0; k < 5; k++) {
      midBlobs.push({ x: tx + 7 + Math.floor((rnd() - 0.5) * 56), y: 18 + Math.floor(rnd() * 46), r: 14 + Math.floor(rnd() * 10) });
    }
  }
  foliage(b, midBlobs, C.black, C.green, C.leaf, C.lime);

  // Continuous canopy across the top (the PS forest roof).
  const canopy: Blob[] = [];
  for (let x = -10; x < W + 20; x += 22 + Math.floor(rnd() * 10)) canopy.push({ x, y: -6 + Math.floor(rnd() * 14), r: 16 + Math.floor(rnd() * 8) });
  foliage(b, canopy, C.black, C.darkGreen, C.green, null);
  foliage(b, midBlobs.filter((k) => k.y < 40), C.black, C.green, C.leaf, C.lime);

  // Front trees at the very edges, brightest (frames the scene like the PS forest).
  trunk(b, -6, 0, 214, 30, rnd, C.rust, C.amber, C.brown);
  trunk(b, W - 24, 0, 214, 30, rnd, C.rust, C.amber, C.brown);
  foliage(b, [{ x: 10, y: 6, r: 30 }, { x: 40, y: 20, r: 20 }, { x: W - 10, y: 8, r: 30 }, { x: W - 44, y: 22, r: 20 }], C.darkGreen, C.green, C.lime, C.mint);

  // Bushes with purple blooms along the ground line (sides only).
  const bushes: Blob[] = [];
  for (let x = 0; x < W; x += 14 + Math.floor(rnd() * 8)) {
    if (x > 200 && x < 440) continue;
    bushes.push({ x, y: 200 + Math.floor(rnd() * 6), r: 9 + Math.floor(rnd() * 6) });
  }
  foliage(b, bushes, C.black, C.darkGreen, C.green, null);
  for (const k of bushes) {
    for (let i = 0; i < 3; i++) {
      const bx = k.x + Math.floor((rnd() - 0.5) * k.r * 1.4), by = k.y - Math.floor(rnd() * k.r * 0.8);
      // 5-petal bloom: magenta petals, white heart, purple shade
      b.set(bx, by - 1, C.magenta); b.set(bx - 1, by, C.magenta); b.set(bx + 1, by, C.magenta);
      b.set(bx, by + 1, C.purple); b.set(bx + 1, by + 1, C.purple); b.set(bx, by, C.white);
    }
  }

  // Grass: horizontal stripes that widen toward the viewer (PS forest floor).
  const groundTop = 204;
  const bands = [groundTop, 208, 213, 219, 226, 234, 244, 256, 270, 286, 304, 326, H];
  for (let i = 0; i < bands.length - 1; i++) {
    const y0 = bands[i] as number, y1 = bands[i + 1] as number;
    const a = i % 2 === 0 ? C.green : C.leaf;
    b.rect(0, y0, W, y1 - y0, a);
    b.dither(0, y0, W, 1, a, i % 2 === 0 ? C.leaf : C.green, 8); // soft seam
  }
  // calm the lower area where cards sit: dither toward dark green
  for (let y = 250; y < H; y++) {
    const level = Math.min(14, Math.floor((y - 250) / 7));
    for (let x = 0; x < W; x++) if (bayer(x, y, level)) b.set(x, y, C.darkGreen);
  }
  // tufts
  for (let i = 0; i < 260; i++) {
    const x = Math.floor(rnd() * W), y = groundTop + Math.floor(rnd() * rnd() * 90);
    const tall = y < 240 ? 2 : 3;
    b.vline(x, y - tall, tall, y < 230 ? C.lime : C.leaf);
  }
  // ground line shadow under the enemy stage
  for (let x = 236; x < 404; x++) {
    const d = Math.abs(x - 320) / 84;
    for (let y = 198; y < 206; y++) if (bayer(x, y, Math.round((1 - d) * 10))) b.set(x, y, C.darkGreen);
  }
  return b;
}

// ------------------------------------------------------------------ Act 2: The Foundry

/** Irregular dithered blob (rust, scorch). */
function patch(b: PixelBuffer, cx: number, cy: number, r: number, inner: number, outer: number, rnd: () => number, clip: (x: number, y: number) => boolean): void {
  const lobes = Array.from({ length: 4 }, () => ({ x: cx + (rnd() - 0.5) * r, y: cy + (rnd() - 0.5) * r * 0.6, r: r * (0.4 + rnd() * 0.4) }));
  for (let y = Math.floor(cy - r); y <= cy + r; y++) {
    for (let x = Math.floor(cx - r * 1.5); x <= cx + r * 1.5; x++) {
      if (!clip(x, y)) continue;
      let best = 0;
      for (const l of lobes) best = Math.max(best, 1 - Math.hypot(x - l.x, (y - l.y) * 1.4) / l.r);
      if (best <= 0) continue;
      if (best > 0.45) { if (bayer(x, y, 12)) b.set(x, y, inner); }
      else if (bayer(x, y, Math.round(best * 20))) b.set(x, y, outer);
    }
  }
}

function drawFoundry(): PixelBuffer {
  const b = new PixelBuffer(W, H, C.black);
  const rnd = artRng(0xf0f0);
  const vx = 320;
  // far wall (furnace mouth) rect; everything converges on it
  const fx0 = 236, fx1 = 404, fy0 = 96, fy1 = 206;
  const wallTop = (t: number) => Math.round(t * fy0);
  const wallBot = (t: number) => Math.round(H - t * (H - fy1));

  // Ceiling: dark steel with converging pipes.
  for (let y = 0; y < fy0; y++) {
    const t = y / fy0;
    const xl = Math.round(t * fx0), xr = Math.round(W - t * (W - fx1));
    for (let x = xl; x < xr; x++) b.set(x, y, bayer(x, y, 4 + Math.round(t * 4)) ? C.darkGrey : C.black);
  }
  for (let p = -3; p <= 3; p++) {
    const ex = vx + p * 104, fxp = vx + p * ((fx1 - fx0) / 7);
    b.line(ex, 0, fxp, fy0, C.grey);
    b.line(ex + 1, 0, fxp + 1, fy0, C.darkGrey);
    b.line(ex + 3, 0, fxp + 2, fy0, C.black);
  }

  // Floor: grating converging to the vanishing point.
  for (let y = fy1; y < H; y++) {
    const t = (H - y) / (H - fy1);
    const xl = Math.round(t * fx0), xr = Math.round(W - t * (W - fx1));
    for (let x = xl; x < xr; x++) b.set(x, y, bayer(x, y, 5) ? C.darkGrey : C.black);
  }
  for (let p = -8; p <= 8; p++) b.line(vx + p * 80, H, vx + p * ((fx1 - fx0) / 16), fy1, C.steel);
  for (let k = 1; k <= 6; k++) {
    const y = Math.round(fy1 + (H - fy1) * (k / 6) ** 1.8);
    const t = (H - y) / (H - fy1);
    const xl = Math.round(t * fx0);
    b.hline(xl, y, Math.round(W - t * (W - fx1)) - xl, C.steel);
  }

  // Side walls: steel panels, every third panel rusted through; seams at perspective depths.
  const seams = Array.from({ length: 8 }, (_, k) => Math.round((1 - 1 / (1 + k * 0.55)) * fx0));
  const wall = (side: -1 | 1) => {
    const mx = (x: number) => (side < 0 ? x : W - 1 - x);
    for (let x = 0; x < fx0; x++) {
      const t = x / fx0, top = wallTop(t), bot = wallBot(t);
      let col = 0;
      while (col < seams.length - 1 && x >= (seams[col + 1] as number)) col++;
      const rusty = col % 3 === 1;
      for (let y = top; y < bot; y++) {
        const v = (y - top) / Math.max(1, bot - top); // 0 top .. 1 bottom of wall
        let c: number;
        if (v > 0.78) c = bayer(mx(x), y, 9) ? C.rust : C.brown; // rusted kick plate
        else if (rusty) c = bayer(mx(x), y, 6) ? C.rust : C.darkGrey;
        else c = bayer(mx(x), y, 7) ? C.steel : C.darkGrey;
        b.set(mx(x), y, c);
      }
    }
    for (const x of seams) {
      const t = x / fx0, top = wallTop(t), bot = wallBot(t);
      b.vline(mx(x), top, bot - top, C.black);
      b.vline(mx(x + 1), top, bot - top, C.grey);
      for (let y = top + 5; y < bot - 4; y += Math.max(5, Math.round((bot - top) / 12))) b.set(mx(x + 3), y, C.grey);
    }
    // rails converging on the vanishing point
    for (const f of [0.2, 0.46, 0.78]) {
      const y0 = Math.round(H * f), y1 = Math.round(fy0 + (fy1 - fy0) * f);
      b.line(mx(0), y0, mx(fx0), y1, C.black);
      b.line(mx(0), y0 + 1, mx(fx0), y1 + 1, C.grey);
    }
    // rust blooms
    for (let i = 0; i < 9; i++) {
      const x = 8 + Math.floor(rnd() * (fx0 - 50)), t = x / fx0;
      const top = wallTop(t), bot = wallBot(t);
      const y = top + 10 + Math.floor(rnd() * Math.max(1, bot - top - 30));
      patch(b, mx(x), y, 6 + rnd() * 10 * (1 - t), C.rust, C.brown, rnd, (px, py) => {
        const lx = side < 0 ? px : W - 1 - px, tt = lx / fx0;
        return lx >= 0 && lx < fx0 && py > wallTop(tt) + 1 && py < wallBot(tt) - 1;
      });
    }
  };
  wall(-1);
  wall(1);

  // Far wall + furnace mouth: dark core (behind the enemy), hot rim, floor spill.
  b.rect(fx0, fy0, fx1 - fx0, fy1 - fy0, C.black);
  b.strokeRect(fx0, fy0, fx1 - fx0, fy1 - fy0, C.darkGrey);
  const mx0 = fx0 + 14, mx1 = fx1 - 14, my0 = fy0 + 22, my1 = fy1;
  for (let y = my0; y < my1; y++) {
    for (let x = mx0; x < mx1; x++) {
      const edge = Math.min(x - mx0, mx1 - 1 - x, y - my0 + 4);
      let c: number;
      if (edge < 2) c = C.amber;
      else if (edge < 5) c = bayer(x, y, 10) ? C.orange : C.red;
      else if (edge < 10) c = bayer(x, y, 7) ? C.darkRed : C.maroon;
      else c = bayer(x, y, 3) ? C.maroon : C.black;
      b.set(x, y, c);
    }
  }
  for (let x = mx0; x < mx1; x++) {
    const u = ((x - mx0) / (mx1 - mx0)) * 2 - 1;
    const archY = Math.round(my0 - 10 * Math.sqrt(Math.max(0, 1 - u * u)));
    for (let y = archY; y < my0; y++) b.set(x, y, y <= archY + 1 ? C.amber : bayer(x, y, 8) ? C.orange : C.red);
  }
  for (let y = fy1; y < fy1 + 44; y++) {
    const fall = (y - fy1) / 44;
    for (let x = mx0 - 24; x < mx1 + 24; x++) {
      const d = Math.min(1, Math.abs(x - vx) / ((mx1 - mx0) / 2 + 24));
      const lv = Math.round((1 - fall) * (1 - d) * 10);
      if (lv > 0 && bayer(x, y, lv)) b.set(x, y, fall < 0.35 ? C.orange : C.rust);
    }
  }
  for (let i = 0; i < 46; i++) {
    const x = mx0 + Math.floor(rnd() * (mx1 - mx0)), y = fy0 - 14 + Math.floor(rnd() * 70);
    b.set(x, y, rnd() < 0.5 ? C.yellow : C.amber);
  }
  // calm the bottom (hand area)
  for (let y = 270; y < H; y++) {
    const level = Math.min(13, Math.floor((y - 270) / 6));
    for (let x = 0; x < W; x++) if (bayer(x, y, level)) b.set(x, y, C.black);
  }
  return b;
}

// ------------------------------------------------------------------ Act 3: The Crown

function drawCrown(): PixelBuffer {
  const b = new PixelBuffer(W, H, C.black);
  const rnd = artRng(0xc20e);
  const horizon = 176;
  const vx = 320;

  // Void sky: black to navy at the horizon.
  ditherRamp(b, 0, 0, W, horizon, [C.black, C.black, C.navy, C.darkBlue]);
  // Starfield (three magnitudes), sparser behind centre stage.
  for (let i = 0; i < 260; i++) {
    const x = Math.floor(rnd() * W), y = Math.floor(rnd() * (horizon - 6));
    if (x > 230 && x < 410 && y > 60 && rnd() < 0.7) continue;
    const m = rnd();
    if (m < 0.08) {
      b.set(x, y, C.white); b.set(x - 1, y, C.skyBlue); b.set(x + 1, y, C.skyBlue); b.set(x, y - 1, C.skyBlue); b.set(x, y + 1, C.skyBlue);
    } else b.set(x, y, m < 0.4 ? C.iceBlue : m < 0.7 ? C.grey : C.steel);
  }
  // Tether: a thin vertical line far away rising out of the horizon.
  b.vline(vx, 0, horizon, C.steel);
  for (let y = 0; y < horizon; y += 3) b.set(vx, y, C.skyBlue);

  // Prism: a white beam enters a crystal from the left and fans out into SMS rainbow bands.
  const bands = [C.red, C.amber, C.yellow, C.lime, C.cyan, C.psBlue, C.lilac];
  const pa = { x: 96, y: 34 }, pb = { x: 136, y: 104 }, pc = { x: 56, y: 104 }; // apex, right, left
  const inTri = (x: number, y: number) => {
    const s1 = (pb.x - pa.x) * (y - pa.y) - (pb.y - pa.y) * (x - pa.x);
    const s2 = (pc.x - pb.x) * (y - pb.y) - (pc.y - pb.y) * (x - pb.x);
    const s3 = (pa.x - pc.x) * (y - pc.y) - (pa.y - pc.y) * (x - pc.x);
    return (s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0);
  };
  // beam in
  b.line(0, 60, 74, 74, C.white);
  b.line(0, 61, 74, 75, C.iceBlue);
  // fan out from the right face
  const ex = 118, ey = 76;
  const a0 = 0.12, a1 = 0.62;
  for (let y = ey - 20; y < horizon - 2; y++) {
    for (let x = ex; x < 260; x++) {
      const ang = Math.atan2(y - ey, x - ex);
      if (ang < a0 || ang >= a1) continue;
      const d = Math.hypot(x - ex, y - ey);
      const lv = Math.round(14 * (1 - d / 190));
      if (lv <= 0 || !bayer(x, y, lv)) continue;
      b.set(x, y, bands[Math.floor(((ang - a0) / (a1 - a0)) * bands.length)] as number);
    }
  }
  for (let y = pa.y; y <= pb.y; y++) {
    for (let x = pc.x; x <= pb.x; x++) {
      if (!inTri(x, y)) continue;
      const u = (x - pc.x) / (pb.x - pc.x);
      b.set(x, y, bayer(x, y, Math.round(4 + u * 8)) ? C.skyBlue : C.darkBlue);
    }
  }
  b.line(pa.x, pa.y, pb.x, pb.y, C.white);
  b.line(pa.x, pa.y, pc.x, pc.y, C.iceBlue);
  b.line(pc.x, pc.y, pb.x, pb.y, C.skyBlue);
  b.line(pa.x - 1, pa.y + 4, pa.x - 12, pa.y + 26, C.white); // facet glint
  // distant prism glints on the right
  for (let i = 0; i < 6; i++) {
    const x = 520 + Math.floor(rnd() * 100), y = 20 + Math.floor(rnd() * 120);
    b.line(x - 3, y, x + 3, y, bands[i % bands.length] as number);
    b.line(x, y - 3, x, y + 3, C.white);
  }

  // Ice floor: perspective grid on dithered blue.
  for (let y = horizon; y < H; y++) {
    const t = (y - horizon) / (H - horizon);
    const level = Math.round(t * 12);
    for (let x = 0; x < W; x++) b.set(x, y, bayer(x, y, level) ? C.darkBlue : C.navy);
  }
  for (let p = -16; p <= 16; p++) b.line(vx + p * 6, horizon, vx + p * 70, H, C.psBlue);
  for (let k = 1; k < 14; k++) {
    const y = Math.round(horizon + (H - horizon) * (k / 14) ** 2);
    b.hline(0, y, W, k < 4 ? C.skyBlue : C.psBlue);
  }
  b.hline(0, horizon, W, C.iceBlue);
  // reflected tether + prism sheen on the floor
  for (let y = horizon; y < horizon + 60; y += 2) b.set(vx, y, C.skyBlue);
  // rainbow sheen reflected on the ice, under the fan
  for (let y = horizon + 3; y < horizon + 34; y += 2) {
    const fade = 1 - (y - horizon) / 34;
    for (let x = 150; x < 300; x++) {
      if (!bayer(x, y, Math.round(fade * 6))) continue;
      b.set(x, y, bands[Math.floor(((x - 150) / 150) * bands.length)] as number);
    }
  }
  // calm the bottom (hand area)
  for (let y = 280; y < H; y++) {
    const level = Math.min(12, Math.floor((y - 280) / 7));
    for (let x = 0; x < W; x++) if (bayer(x, y, level)) b.set(x, y, C.navy);
  }
  return b;
}
