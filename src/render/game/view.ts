/**
 * Engine state → view data for widgets. Every number shown comes from the engine's own text
 * helpers (renderCardTextParts / renderStatusText / ...), never recomputed here.
 *
 * Asset resolution rules:
 *  - Enemy sprites: public/assets/sprites/enemies/<enemyId>.png (or <icon>.png). Missing → throw,
 *    EXCEPT ids starting "test_" (the engine's test pack has no art): a deterministic stand-in from
 *    the available sprites, logged once.
 *  - Card art: sprites/cards/<icon>.png. Missing → the dithered placeholder (the card-art pipeline
 *    is still running; logged once per icon). Test-pack cards get a deterministic stand-in.
 *  - Status icons: icon sheet frame named after the status id; unknown ids fall back to the generic
 *    buff/debuff icon (logged once).
 */
import {
  canPlayCard, getCardCost, hasKeyword, renderCardTextParts, TUNING,
  type CardInstance, type CardOffer, type RunState, type TextPart,
} from '../../engine/index.ts';
import { allClasses, getCardDef, getEnemyDef, getStatusDef } from '../../content/index.ts';
import type { App } from '../app.ts';
import { atlasFromPixels, type Atlas } from '../gfx.ts';
import { PixelBuffer } from '../pixels.ts';
import { C } from '../palette.ts';
import { FONT_8X8 } from '../textLayout.ts';
import type { CardFace, CostState } from '../ui/CardFrame.ts';

const warned = new Set<string>();
function warnOnce(key: string, msg: string): void {
  if (warned.has(key)) return;
  warned.add(key);
  console.info(msg);
}

function hashPick<T>(id: string, items: readonly T[]): T {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  const v = items[(h >>> 0) % items.length];
  if (v === undefined) throw new Error('hashPick: empty list');
  return v;
}

/** The engine's test pack is active (no real classes registered). Shown as a watermark. */
export function testContentActive(): boolean {
  return allClasses().some((c) => c.id.startsWith('test_'));
}

// ------------------------------------------------------------------ sprites and art

export function enemyAtlas(app: App, enemyId: string): { atlas: Atlas; frame: string } {
  const atlas = app.assets.enemies;
  if (atlas.has(enemyId)) return { atlas, frame: enemyId };
  if (enemyId.startsWith('test_')) {
    // the engine's test pack has no art: a deterministic stand-in from the real roster
    const frame = hashPick(enemyId, atlas.names().sort());
    warnOnce(`enemy:${enemyId}`, `[view] test enemy ${enemyId} has no sprite; using stand-in ${frame}`);
    return { atlas, frame };
  }
  warnOnce(`enemy:${enemyId}`, `[view] no frame "${enemyId}" in enemies-atlas.json: placeholder shown`);
  return { atlas: placeholderEnemyAtlas(), frame: 'missing' };
}

let missingEnemy: Atlas | null = null;
/** 64x64 placeholder for an enemy without art: a framed "?" silhouette (palette only). */
function placeholderEnemyAtlas(): Atlas {
  if (missingEnemy) return missingEnemy;
  const p = new PixelBuffer(64, 64);
  p.disc(32, 40, 22, C.black);
  p.disc(32, 40, 20, C.violet);
  p.disc(32, 18, 12, C.black);
  p.disc(32, 18, 10, C.violet);
  p.glyph(FONT_8X8, '?', 24, 30, C.white, 2);
  missingEnemy = atlasFromPixels(p, new Map([['missing', { x: 0, y: 0, w: 64, h: 64 }]]), 'placeholder-enemy');
  return missingEnemy;
}

/** Card art by card id, or null → the type-hatched placeholder (logged once per card in dev). */
export function cardArtOrNull(app: App, cardId: string): { atlas: Atlas; frame: string } | null {
  const atlas = app.assets.cards;
  if (atlas.has(cardId)) return { atlas, frame: cardId };
  warnOnce(`art:${cardId}`, `[view] no card art for ${cardId} in cards-atlas.json: placeholder shown`);
  return null;
}

/** 16x16 relic / potion icon from its atlas; falls back to the generic UI icon (logged once). */
export function itemIcon(app: App, kind: 'relic' | 'potion', id: string): { atlas: Atlas; frame: string } {
  const atlas = kind === 'relic' ? app.assets.relics : app.assets.potions;
  if (atlas.has(id)) return { atlas, frame: id };
  warnOnce(`${kind}:${id}`, `[view] no ${kind} icon for ${id}: generic icon shown`);
  return { atlas: app.icons, frame: kind };
}

export function portraitOrNull(app: App, classId: string, small = false): Atlas | null {
  // null = this class has no portrait yet (test classes): callers draw a placeholder box.
  return app.assets.portraits.get(small ? `${classId}@32` : classId) ?? null;
}

// ------------------------------------------------------------------ card faces

/** Escape literal '[' for the text markup. */
const esc = (s: string): string => s.replace(/\[/g, '[[');

/** Card text with live numbers coloured: lime = above printed, pink = below, yellow = as printed. */
export function partsToMarkup(parts: readonly TextPart[], beatLit: boolean): string {
  let out = '';
  for (const p of parts) {
    if (p.kind === 'text') {
      const t = esc(p.text);
      out += beatLit ? t.replace(/On beat:/g, '[amber]On beat:[/]') : t;
      continue;
    }
    const v = String(p.value);
    const cmp = typeof p.value === 'number' && typeof p.base === 'number' ? Math.sign(p.value - p.base) : 0;
    out += `[${cmp > 0 ? 'lime' : cmp < 0 ? 'pink' : 'yellow'}]${esc(v)}[/]`;
  }
  return out;
}

export interface FaceOptions {
  /** Live combat numbers (card in hand / piles during combat). */
  state?: RunState | null;
  /** Preview target for damage numbers. */
  target?: number | null;
  /** Highlight "On beat:" (this card would land on the beat). */
  beat?: boolean;
}

export function cardIsBloom(id: string, upgraded: boolean): boolean {
  return hasKeyword(getCardDef(id, upgraded), 'bloom');
}

export function bloomOf(card: CardInstance | CardOffer): number | null {
  if (!cardIsBloom(card.id, card.upgraded)) return null;
  // A Bloom card that has never grown has no var yet: that is Bloom 0 (GDD §2.4 "starting at 0").
  const v = 'vars' in card ? card.vars?.['bloom'] : undefined;
  return v ?? 0;
}

export function cardFace(app: App, card: CardInstance | CardOffer, opts: FaceOptions = {}): CardFace {
  const def = getCardDef(card.id, card.upgraded);
  const state = opts.state ?? null;
  const inCombatHand = state?.combat?.hand.some((c) => 'uid' in card && c.uid === card.uid) ?? false;
  let cost: number | 'X' | null = def.cost;
  let costState: CostState = 'normal';
  if (state && inCombatHand && 'uid' in card) {
    cost = getCardCost(state, card);
    if (typeof cost === 'number' && typeof def.cost === 'number') costState = cost < def.cost ? 'reduced' : cost > def.cost ? 'raised' : 'normal';
    const combat = state.combat;
    if (combat && typeof cost === 'number' && cost > combat.energy) costState = 'unaffordable';
  }
  const ref = 'uid' in card ? { id: card.id, upgraded: card.upgraded, uid: card.uid } : { id: card.id, upgraded: card.upgraded };
  const body = partsToMarkup(renderCardTextParts(ref, state, opts.target ?? null), opts.beat ?? false);
  const bloom = bloomOf(card);
  const art = cardArtOrNull(app, card.id);
  const kind = def.type;
  const kw = def.keywords ?? [];
  const tag = kw.includes('riposte') ? ' · RIPOSTE' : kw.includes('delay') ? ' · DELAY' : kw.includes('bloom') ? ' · BLOOM' : '';
  return {
    name: def.name,
    cost,
    kind,
    // 14 chars fit: abbreviate the type when a keyword tag follows ("ATK · RIPOSTE")
    typeLine: tag ? `${({ attack: 'ATK', skill: 'SKL', power: 'PWR', status: 'STATUS', curse: 'CURSE' } as const)[kind]}${tag}` : kind,
    body,
    ...(art ? { art } : {}),
    upgraded: card.upgraded,
    bloom,
    bloomCapped: bloom !== null && bloom >= TUNING.caps.bloom,
    costState,
  };
}

/** Shards held (GDD §2.12). The engine always creates the counter, so a missing key is a bug. */
export function shardsOf(state: RunState): number {
  const v = state.player.counters['shards'];
  if (v === undefined) throw new Error('player.counters.shards missing (the engine always creates it)');
  return v;
}

/** Why a hand card can't be played right now, or null if it can. */
export function unplayableReasonOrNull(state: RunState, card: CardInstance): string | null {
  const r = canPlayCard(state, card);
  return r === true ? null : r;
}

// ------------------------------------------------------------------ statuses

export const STATUS_ICONS: ReadonlySet<string> = new Set([
  'onslaught', 'exposed', 'stagger', 'rot', 'augury', 'riposte_capacity', 'might', 'elite_hunted', 'backlash_primed', 'cost_tax',
]);

/** Icon frame for a status id. Unknown ids → generic buff/debuff icon (logged once). */
export function statusIcon(id: string): string {
  if (STATUS_ICONS.has(id)) return id;
  const def = getStatusDef(id);
  warnOnce(`status:${id}`, `[view] status "${id}" has no icon; using the generic ${def.isDebuff ? 'debuff' : 'buff'} icon`);
  return def.isDebuff ? 'debuff' : 'buff';
}

export function statusVisible(id: string): boolean {
  return !getStatusDef(id).hidden;
}
