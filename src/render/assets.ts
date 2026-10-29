/**
 * Asset manifests and startup loading.
 *
 * Every directory listing is a build-time `Object.keys(import.meta.glob(...))` (compiles to a plain
 * key list: no imports, no inlining); the PNGs are then loaded from their public URLs. Everything
 * the screens draw synchronously (backdrops, portraits, enemy sprites, card art) is preloaded by
 * `loadGameAssets` before the first screen, so a missing/broken file fails loudly at startup.
 */
import { Atlas, loadAtlas, loadImageAtlas, loadTexture } from './gfx.ts';
import type * as THREE from 'three';

export interface SpriteEntry { name: string; url: string }

function publicUrl(key: string): string {
  if (!key.startsWith('/public/')) throw new Error(`assets: glob key "${key}" is not under /public/`);
  return `${import.meta.env.BASE_URL}${key.slice('/public/'.length)}`;
}

function listing(keys: readonly string[], dir: string, filter: (name: string) => boolean = () => true): SpriteEntry[] {
  return keys
    .map((key) => {
      if (!key.startsWith(dir)) throw new Error(`assets: unexpected glob key ${key} (expected under ${dir})`);
      const name = key.slice(dir.length, -'.png'.length);
      return { name, url: publicUrl(key) };
    })
    .filter((e) => filter(e.name))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Every enemy sprite PNG (64x64, bosses 96x96), sorted by name. */
export const ENEMY_SPRITES: readonly SpriteEntry[] = listing(
  Object.keys(import.meta.glob('/public/assets/sprites/enemies/*.png')), '/public/assets/sprites/enemies/');

/** Class portraits (64x64) and their 32x32 variants (`<class>@32`). */
export const PORTRAITS: readonly SpriteEntry[] = listing(
  Object.keys(import.meta.glob('/public/assets/sprites/portraits/*.png')), '/public/assets/sprites/portraits/');


/** Generated 640x360 backdrops in public/assets/backdrops (the @2x previews are skipped). */
export const BACKDROP_KEYS = ['act1_verdant', 'act2_foundry', 'act3_crown', 'title_spire', 'rest_site', 'shop_interior', 'event_generic'] as const;
export type BackdropKey = (typeof BACKDROP_KEYS)[number];

const BACKDROP_FILES: readonly SpriteEntry[] = listing(
  Object.keys(import.meta.glob('/public/assets/backdrops/*.png')), '/public/assets/backdrops/', (n) => !n.includes('@'));

export function actBackdrop(act: 1 | 2 | 3): BackdropKey {
  return act === 1 ? 'act1_verdant' : act === 2 ? 'act2_foundry' : 'act3_crown';
}

export function isBackdropKey(k: string): k is BackdropKey { return (BACKDROP_KEYS as readonly string[]).includes(k); }

/**
 * Backdrop for an event: its own `backdrop` key when the def has one (must name a loaded backdrop),
 * else event_generic in Act 1 and the act's backdrop (dimmed by the caller) in Acts 2-3.
 */
export function eventBackdrop(defBackdrop: string | undefined, act: 1 | 2 | 3): { key: BackdropKey; dim: number } {
  if (defBackdrop !== undefined) {
    if (!isBackdropKey(defBackdrop)) throw new Error(`event backdrop "${defBackdrop}" is not a backdrop (have: ${BACKDROP_KEYS.join(', ')})`);
    return { key: defBackdrop, dim: 0 };
  }
  return act === 1 ? { key: 'event_generic', dim: 0 } : { key: actBackdrop(act), dim: 1 };
}

export interface GameAssets {
  backdrops: Readonly<Record<BackdropKey, THREE.Texture>>;
  /** key = portrait file name ('breaker', 'breaker@32', ...). */
  portraits: ReadonlyMap<string, Atlas>;
  /** Enemy sprites keyed by enemy id (64x64, bosses 96x96: frame rects are the real sprite sizes). */
  enemies: Atlas;
  /** 16x16 relic icons keyed by relic id. */
  relics: Atlas;
  /** 16x16 potion icons keyed by potion id. */
  potions: Atlas;
  /** 32x24 card art keyed by card id (not every card has art yet). */
  cards: Atlas;
}

const SPRITES = `${import.meta.env.BASE_URL}assets/sprites/`;
const atlasPair = (name: string) => loadAtlas(`${SPRITES}${name}.png`, `${SPRITES}${name}.json`);

async function loadAll(entries: readonly SpriteEntry[]): Promise<Map<string, Atlas>> {
  const out = new Map<string, Atlas>();
  const loaded = await Promise.all(entries.map(async (e) => [e.name, await loadImageAtlas(e.url, e.name)] as const));
  for (const [name, atlas] of loaded) out.set(name, atlas);
  return out;
}

export async function loadGameAssets(): Promise<GameAssets> {
  const t0 = performance.now();
  const bdEntries = BACKDROP_KEYS.map((k) => {
    const f = BACKDROP_FILES.find((e) => e.name === k);
    if (!f) throw new Error(`assets: backdrop public/assets/backdrops/${k}.png is missing (have: ${BACKDROP_FILES.map((e) => e.name).join(', ')})`);
    return f;
  });
  const [bdTex, portraits, enemies, relics, potions, cards] = await Promise.all([
    Promise.all(bdEntries.map((e) => loadTexture(e.url))),
    loadAll(PORTRAITS),
    atlasPair('enemies-atlas'),
    atlasPair('relics-atlas'),
    atlasPair('potions-atlas'),
    atlasPair('cards-atlas'),
  ]);
  const backdrops = {} as Record<BackdropKey, THREE.Texture>;
  BACKDROP_KEYS.forEach((k, i) => {
    const t = bdTex[i];
    if (!t) throw new Error(`assets: backdrop ${k} did not load`);
    const img = t.image as { width: number; height: number };
    if (img.width !== 640 || img.height !== 360) throw new Error(`assets: backdrop ${k} is ${img.width}x${img.height}, want 640x360`);
    backdrops[k] = t;
  });
  console.info(`[assets] ${BACKDROP_KEYS.length} backdrops, ${portraits.size} portraits, ${enemies.frames.size} enemies, ${relics.frames.size} relics, ${potions.frames.size} potions, ${cards.frames.size} card art in ${(performance.now() - t0).toFixed(0)} ms`);
  return { backdrops, portraits, enemies, relics, potions, cards };
}
