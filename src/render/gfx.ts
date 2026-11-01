/**
 * three.js primitives shared by every widget: quad geometry, pixel textures, the sprite material,
 * solid rects, texture/atlas loading.
 *
 * Coordinate convention: the scene camera is orthographic in logical pixels with y DOWN and the
 * origin at the top-left (display.ts). Quads have their origin at their TOP-LEFT corner and span
 * (0,0)-(w,h), so integer positions put texels exactly on pixels. Because the y flip mirrors the
 * winding, every material here is DoubleSide.
 *
 * Material policy (perf target: 60 fps with ~300 quads): there are only three shader programs:
 *  - spriteMaterial: one ShaderMaterial instance PER MESH (it carries per-mesh uniforms: atlas frame,
 *    tint, flash, opacity). three caches the compiled program by source, so 300 instances = 1 program,
 *    and the per-draw cost is a handful of uniform uploads.
 *  - text material: ONE shared instance per BitmapFont; colour is a vertex attribute (text.ts).
 *  - the blit/fade material in display.ts.
 * Every 2D material is transparent with depthTest/depthWrite off, so everything sorts in one list by
 * groupOrder -> renderOrder (see Widget.z) and nothing jumps into the opaque pass.
 */
import * as THREE from 'three';
import type { PixelBuffer } from './pixels.ts';

// ------------------------------------------------------------------ geometry

const quadCache = new Map<string, THREE.BufferGeometry>();

/** Shared w x h quad, top-left origin, y down, uv v=1 at the top row (matches flipY textures). Never dispose it. */
export function quadGeometry(w: number, h: number): THREE.BufferGeometry {
  if (!Number.isInteger(w) || !Number.isInteger(h) || w <= 0 || h <= 0) throw new Error(`quadGeometry: bad size ${w}x${h}`);
  const key = `${w}x${h}`;
  let g = quadCache.get(key);
  if (!g) {
    g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, w, 0, 0, 0, h, 0, w, h, 0], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 0, 0, 1, 0], 2));
    g.setIndex([0, 2, 1, 2, 3, 1]);
    g.userData.shared = true;
    quadCache.set(key, g);
  }
  return g;
}

// ------------------------------------------------------------------ textures

export function pixelate<T extends THREE.Texture>(tex: T): T {
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

/** Copy a top-down PixelBuffer into bottom-up rows (so DataTextures match flipY image textures). */
function flipRows(buf: PixelBuffer, out: Uint8Array): void {
  const row = buf.w * 4;
  for (let y = 0; y < buf.h; y++) out.set(buf.data.subarray(y * row, (y + 1) * row), (buf.h - 1 - y) * row);
}

/** Upload a PixelBuffer as an exact, nearest-filtered sRGB texture. */
export function textureFromPixels(buf: PixelBuffer): THREE.DataTexture {
  const data = new Uint8Array(buf.w * buf.h * 4);
  flipRows(buf, data);
  const tex = new THREE.DataTexture(data, buf.w, buf.h, THREE.RGBAFormat, THREE.UnsignedByteType);
  pixelate(tex);
  tex.flipY = false;
  tex.needsUpdate = true;
  return tex;
}

/** Re-upload a same-sized PixelBuffer into an existing texture. */
export function updateTexturePixels(tex: THREE.DataTexture, buf: PixelBuffer): void {
  const img = tex.image as { data: Uint8Array; width: number; height: number };
  if (img.width !== buf.w || img.height !== buf.h) {
    throw new Error(`updateTexturePixels: size ${buf.w}x${buf.h} != texture ${img.width}x${img.height}`);
  }
  flipRows(buf, img.data);
  tex.needsUpdate = true;
}

let whiteTex: THREE.DataTexture | null = null;
/** 1x1 opaque white, for solid-colour quads (tinted sprite material). */
export function whiteTexture(): THREE.DataTexture {
  if (!whiteTex) {
    whiteTex = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, THREE.RGBAFormat, THREE.UnsignedByteType);
    pixelate(whiteTex);
    whiteTex.needsUpdate = true;
  }
  return whiteTex;
}

const textureLoader = new THREE.TextureLoader();

/** Load a PNG as a pixel texture. Throws (with the URL) if it is missing or undecodable. */
export async function loadTexture(url: string): Promise<THREE.Texture> {
  let tex: THREE.Texture;
  try {
    tex = await textureLoader.loadAsync(url);
  } catch (e) {
    throw new Error(`loadTexture: failed to load ${url}`, { cause: e });
  }
  return pixelate(tex);
}

// ------------------------------------------------------------------ sprite material

const spriteVertex = /* glsl */ `
uniform vec4 uFrame;   // u0, v0, du, dv (v measured from the bottom, flipY convention)
uniform vec2 uFlip;    // 1 or -1 per axis
varying vec2 vUv;
void main() {
  vec2 t = uv;
  if (uFlip.x < 0.0) t.x = 1.0 - t.x;
  if (uFlip.y < 0.0) t.y = 1.0 - t.y;
  vUv = uFrame.xy + t * uFrame.zw;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const spriteFragment = /* glsl */ `
uniform sampler2D map;
uniform vec3 uTint;
uniform float uFlash;    // 1 = solid silhouette in uFlashColor (hit flash; white by default)
uniform vec3 uFlashColor;
uniform float uDissolve; // 0..1: ordered-dither dissolve in source texels (death); 0 = off
uniform vec2 uTexSize;   // texture size in texels (dissolve grid)
uniform float uOpacity;
uniform float uDim;      // whole SMS levels to step every channel down (0 = off): palette-safe dimming
varying vec2 vUv;
vec3 toSRGB(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c)); }
vec3 toLinear(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c)); }
void main() {
  vec4 c = texture2D(map, vUv);
  if (c.a < 0.5) discard;  // hard cut-out: the SMS had no alpha
  if (uDissolve > 0.0) {
    // 4x4 Bayer threshold per source texel: whole art pixels drop out in a fixed checker order
    vec2 p = floor(vUv * uTexSize);
    vec2 q = mod(p, 4.0);
    // Bayer 4x4 = 4 * b2(low bit) + b2(high bit), with b2(x, y) = (2x + 3y) mod 4 the 2x2 matrix [0 2; 3 1]
    vec2 lo = mod(q, 2.0), hi = floor(q / 2.0);
    float t = (4.0 * mod(2.0 * lo.x + 3.0 * lo.y, 4.0) + mod(2.0 * hi.x + 3.0 * hi.y, 4.0)) / 16.0;
    if (t < uDissolve) discard;
  }
  vec3 rgb = mix(c.rgb * uTint, uFlashColor, uFlash);
  if (uDim > 0.0) rgb = toLinear(max(floor(toSRGB(rgb) * 3.0 + 0.5) - uDim, 0.0) / 3.0);
  gl_FragColor = vec4(rgb, uOpacity);
  #include <colorspace_fragment>
}`;

export interface SpriteUniforms {
  [uniform: string]: THREE.IUniform;
  map: THREE.IUniform<THREE.Texture>;
  uFrame: THREE.IUniform<THREE.Vector4>;
  uFlip: THREE.IUniform<THREE.Vector2>;
  uTint: THREE.IUniform<THREE.Color>;
  uFlash: THREE.IUniform<number>;
  uOpacity: THREE.IUniform<number>;
  uDim: THREE.IUniform<number>;
  uFlashColor: THREE.IUniform<THREE.Color>;
  uDissolve: THREE.IUniform<number>;
  uTexSize: THREE.IUniform<THREE.Vector2>;
}

export type SpriteMaterial = THREE.ShaderMaterial & { uniforms: SpriteUniforms };

export function spriteMaterial(map: THREE.Texture): SpriteMaterial {
  const uniforms: SpriteUniforms = {
    map: { value: map },
    uFrame: { value: new THREE.Vector4(0, 0, 1, 1) },
    uFlip: { value: new THREE.Vector2(1, 1) },
    uTint: { value: new THREE.Color(0xffffff) },
    uFlash: { value: 0 },
    uOpacity: { value: 1 },
    uDim: { value: 0 },
    uFlashColor: { value: new THREE.Color(0xffffff) },
    uDissolve: { value: 0 },
    uTexSize: { value: new THREE.Vector2(1, 1) },
  };
  const m = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: spriteVertex,
    fragmentShader: spriteFragment,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  return m as SpriteMaterial;
}

/** Set a sprite material's frame from a pixel rect inside a `texW x texH` texture (flipY convention). */
export function setFrameUv(m: SpriteMaterial, f: FrameRect, texW: number, texH: number): void {
  m.uniforms.uFrame.value.set(f.x / texW, 1 - (f.y + f.h) / texH, f.w / texW, f.h / texH);
}

/** A solid-colour w x h quad (focus ring segments, swatches, placeholders). */
export function solidRect(w: number, h: number, color: number): THREE.Mesh<THREE.BufferGeometry, SpriteMaterial> {
  const m = spriteMaterial(whiteTexture());
  m.uniforms.uTint.value.setHex(color);
  return new THREE.Mesh(quadGeometry(w, h), m);
}

/** A mesh showing a whole texture at 1:1 (or integer `scale`). */
export function textureQuad(tex: THREE.Texture, w: number, h: number, scale = 1): THREE.Mesh<THREE.BufferGeometry, SpriteMaterial> {
  return new THREE.Mesh(quadGeometry(w * scale, h * scale), spriteMaterial(tex));
}

/** Dispose a mesh's own material (+ geometry unless shared). Shared textures are NOT disposed. */
export function disposeMesh(mesh: THREE.Mesh): void {
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const m of mats) if (!m.userData.shared) m.dispose();
  if (!mesh.geometry.userData.shared) mesh.geometry.dispose();
}

// ------------------------------------------------------------------ atlas

export interface FrameRect { x: number; y: number; w: number; h: number }

/** A texture plus named frames (pixel rects, top-left origin). `frame()` throws on unknown names. */
export class Atlas {
  readonly texture: THREE.Texture;
  readonly width: number;
  readonly height: number;
  readonly frames: ReadonlyMap<string, FrameRect>;
  readonly source: string;

  constructor(texture: THREE.Texture, width: number, height: number, frames: ReadonlyMap<string, FrameRect>, source: string) {
    this.texture = texture;
    this.width = width;
    this.height = height;
    this.frames = frames;
    this.source = source;
    for (const [name, f] of frames) {
      if (f.x < 0 || f.y < 0 || f.x + f.w > width || f.y + f.h > height) {
        throw new Error(`Atlas ${source}: frame "${name}" (${f.x},${f.y},${f.w}x${f.h}) is outside ${width}x${height}`);
      }
    }
  }

  has(name: string): boolean { return this.frames.has(name); }

  frame(name: string): FrameRect {
    const f = this.frames.get(name);
    if (!f) throw new Error(`Atlas ${this.source}: no frame "${name}" (have: ${[...this.frames.keys()].join(', ')})`);
    return f;
  }

  names(): string[] { return [...this.frames.keys()]; }
}

function textureSize(tex: THREE.Texture, where: string): { w: number; h: number } {
  const img = tex.image as { width?: unknown; height?: unknown } | null;
  if (!img || typeof img.width !== 'number' || typeof img.height !== 'number') throw new Error(`${where}: texture has no image size`);
  return { w: img.width, h: img.height };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Parse atlas JSON in the tools/sprites/atlas.py format: `{ "frames": { name: {x,y,w,h} }, ... }`.
 * `cell` (or `cell_w`/`cell_h`) is informational packing data and optional; frames are required.
 * Throws on any missing/mistyped frame field (pure; exported for tests).
 */
export function parseAtlasJson(json: unknown, source: string): { frames: Map<string, FrameRect> } {
  if (!isRecord(json)) throw new Error(`${source}: atlas JSON is not an object`);
  const frames = json['frames'];
  if (!isRecord(frames)) throw new Error(`${source}: atlas JSON "frames" missing or not an object`);
  const out = new Map<string, FrameRect>();
  for (const [name, f] of Object.entries(frames)) {
    if (!isRecord(f)) throw new Error(`${source}: frame "${name}" is not an object`);
    const vals = ['x', 'y', 'w', 'h'].map((k) => {
      const v = f[k];
      if (typeof v !== 'number' || !Number.isInteger(v)) throw new Error(`${source}: frame "${name}".${k} missing or not an integer`);
      return v;
    }) as [number, number, number, number];
    out.set(name, { x: vals[0], y: vals[1], w: vals[2], h: vals[3] });
  }
  return { frames: out };
}

/** Load an atlas PNG + JSON pair (tools/sprites/atlas.py output). Throws with the path on any failure. */
export async function loadAtlas(pngUrl: string, jsonUrl: string): Promise<Atlas> {
  const res = await fetch(jsonUrl);
  if (!res.ok) throw new Error(`loadAtlas: ${jsonUrl} -> HTTP ${res.status}`);
  const { frames } = parseAtlasJson(await res.json(), jsonUrl);
  const tex = await loadTexture(pngUrl);
  const { w, h } = textureSize(tex, pngUrl);
  return new Atlas(tex, w, h, frames, pngUrl);
}

/** One PNG as a single-frame atlas (frame = whole image). */
export async function loadImageAtlas(url: string, frameName: string): Promise<Atlas> {
  const tex = await loadTexture(url);
  const { w, h } = textureSize(tex, url);
  return new Atlas(tex, w, h, new Map([[frameName, { x: 0, y: 0, w, h }]]), url);
}

/** An atlas from a procedurally drawn PixelBuffer. */
export function atlasFromPixels(buf: PixelBuffer, frames: ReadonlyMap<string, FrameRect>, source: string): Atlas {
  return new Atlas(textureFromPixels(buf), buf.w, buf.h, frames, source);
}
