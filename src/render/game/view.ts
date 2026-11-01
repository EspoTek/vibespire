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
  canPlayCard, cardTextValues, effectiveBloomOf, getCardCost, isRipe, hasKeyword, isRiposteCard, primeCapacity, renderCardTextParts, TUNING,
  type CardInstance, type CardOffer, type RunState, type TextPart,
} from '../../engine/index.ts';
import { allClasses, getCardDef, getEnemyDef, getStatusDef, keywordsFor } from '../../content/index.ts';
import type { App } from '../app.ts';
import { atlasFromPixels, type Atlas } from '../gfx.ts';
import { PixelBuffer } from '../pixels.ts';
import { C } from '../palette.ts';
import { FONT_8X8 } from '../textLayout.ts';
import type { CardFace, CostState } from '../ui/CardFrame.ts';
import { ICONS } from '../ui/iconArt.ts';

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
/**
 * Card text with live numbers coloured: lime = above printed, pink = below, yellow = as printed.
 * `ripe` (Graft v2): true lights "Ripe:" lime; false greys the whole Ripe clause (to the end of its
 * sentence, numbers included) because it won't happen; null = unknown (no live state), unchanged.
 */
export function partsToMarkup(parts: readonly TextPart[], beatLit: boolean, ripe: boolean | null = null): string {
  let out = '';
  let inRipe = false;
  const plain = (t: string): string => {
    const e = esc(t);
    return beatLit ? e.replace(/On beat:/g, '[amber]On beat:[/]') : e;
  };
  const text = (t: string): void => {
    let rest = t;
    while (rest.length > 0) {
      if (!inRipe) {
        const i = ripe === null ? -1 : rest.indexOf('Ripe:');
        if (i < 0) { out += plain(rest); return; }
        out += `${plain(rest.slice(0, i))}[${ripe ? 'lime' : 'grey'}]Ripe:[/]`;
        inRipe = true;
        rest = rest.slice(i + 'Ripe:'.length);
      } else {
        const j = rest.indexOf('.');
        const seg = j < 0 ? rest : rest.slice(0, j + 1);
        out += ripe ? plain(seg) : `[grey]${esc(seg)}[/]`;
        if (j >= 0) inRipe = false;
        rest = j < 0 ? '' : rest.slice(j + 1);
      }
    }
  };
  for (const p of parts) {
    if (p.kind === 'text') { text(p.text); continue; }
    const v = String(p.value);
    if (inRipe && ripe === false) { out += `[grey]${esc(v)}[/]`; continue; }
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
  /**
   * VIEW UPGRADE (STS's checkbox): show the upgraded version of a card that can be upgraded, with
   * every number the upgrade changes in lime. Ignored for cards already upgraded or not upgradable.
   */
  upgradePreview?: boolean;
}

/** The card can be upgraded (not yet upgraded and its def has an upgrade). */
export function canUpgradeCard(card: CardInstance | CardOffer): boolean {
  return !card.upgraded && Object.keys(getCardDef(card.id).upgrade).length > 0;
}

/**
 * Upgraded card text with the numbers the upgrade changes in lime (others yellow). Printed values
 * (no combat modifiers), so before and after compare like for like.
 */
export function upgradeDiffMarkup(id: string): string {
  const before = cardTextValues({ id, upgraded: false }, null);
  const parts = renderCardTextParts({ id, upgraded: true }, null);
  let out = '';
  for (const p of parts) {
    if (p.kind === 'text') { out += esc(p.text); continue; }
    const changed = before[p.key] !== p.value;
    out += `[${changed ? 'lime' : 'yellow'}]${esc(String(p.value))}[/]`;
  }
  return out;
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
  if (opts.upgradePreview && canUpgradeCard(card)) return upgradePreviewFace(app, card);
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
  // Ripe and Rootstock-lifted Bloom need a real card copy and the run; offers / the Compendium don't know
  const live = state !== null && 'uid' in card;
  const ripe = live && cardIsBloom(card.id, card.upgraded) ? isRipe(state, card) : null;
  const body = partsToMarkup(renderCardTextParts(ref, state, opts.target ?? null), opts.beat ?? false, ripe);
  const raw = bloomOf(card);
  const bloom = raw !== null && live ? effectiveBloomOf(state, card) : raw;
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
    ...(raw !== null && bloom !== raw ? { bloomOwn: raw } : {}),
    bloomCapped: raw !== null && raw >= TUNING.caps.bloom,
    costState,
    keywords: keywordsFor(getCardDef(card.id), card.upgraded),
  };
}

/** Face of the upgraded version of `card` (VIEW UPGRADE / Smith preview): changed numbers lime, a cheaper cost lime. */
function upgradePreviewFace(app: App, card: CardInstance | CardOffer): CardFace {
  const base = getCardDef(card.id, false);
  const up = getCardDef(card.id, true);
  const face = cardFace(app, { id: card.id, upgraded: true });
  const cheaper = typeof up.cost === 'number' && typeof base.cost === 'number' && up.cost < base.cost;
  return { ...face, body: upgradeDiffMarkup(card.id), costState: cheaper ? 'reduced' : 'normal', bloom: bloomOf(card) };
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

/** Status ids with a dedicated icon: every ICONS entry named after a status (iconArt.ts + statusIconArt.ts). */
export function hasStatusIcon(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(ICONS, id);
}

/** Icon frame for a status id. Unknown ids → generic buff/debuff icon (logged once). */
export function statusIcon(id: string): string {
  if (hasStatusIcon(id)) return id; // tests/render/statusicons.test.ts: every visible status has one
  const def = getStatusDef(id);
  warnOnce(`status:${id}`, `[view] status "${id}" has no icon; using the generic ${def.isDebuff ? 'debuff' : 'buff'} icon`);
  return def.isDebuff ? 'debuff' : 'buff';
}

export function statusVisible(id: string): boolean {
  return !getStatusDef(id).hidden;
}

/**
 * Which Riposte cards in hand the end-of-turn prime step would prime (GDD §2.2), mirroring the
 * engine's room rule: capacity minus cards already primed by capacity, bounded by the rack cap.
 * `choose`: more candidates than room, so ending the turn asks which ones.
 */
export function primeForecast(state: RunState): { uids: number[]; choose: boolean } {
  const c = state.combat;
  if (!c || c.turnPhase !== 'player') return { uids: [], choose: false };
  const ripostes = c.hand.filter(isRiposteCard).map((x) => x.uid);
  const { capacity } = primeCapacity(state);
  const byEffect = c.counters['primedByEffect'] ?? 0; // absent: nothing primed by an effect this turn
  const room = Math.max(0, Math.min(capacity - (c.primed.length - byEffect), TUNING.caps.primeCapacity - c.primed.length));
  if (room === 0) return { uids: [], choose: false };
  return { uids: ripostes, choose: ripostes.length > room };
}
