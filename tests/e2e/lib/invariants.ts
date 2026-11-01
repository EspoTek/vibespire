// Invariants checked after every step: the screen shows what the engine says. Each check returns
// violations (code + message) instead of throwing so one step can report several at once.

import { getClassDef, getEnemyDef, getPotionDef, getRelicDef, getCardDef } from '../../../src/content/index.ts';
import { actionKey, Game, skipRewardShards, TUNING, type Action, type RunState } from '../../../src/engine/index.ts';
import { playerRule } from '../../../src/engine/statuses.ts';
import type { Snapshot, WidgetInfo } from '../../../src/render/debug/e2e.ts';
import { DIFFICULTY_NAMES } from '../../../src/render/game/difficulty.ts';

export interface Violation { code: string; msg: string }

/** Screens allowed for each engine phase ('act-transition' sits between a boss relic and the next map). */
const SCREENS: Readonly<Record<RunState['phase'], readonly string[]>> = {
  start: ['pact'], map: ['map', 'act-transition'], combat: ['combat'], reward: ['reward'], shop: ['shop'], rest: ['rest'],
  event: ['event'], treasure: ['treasure'], boss_reward: ['boss-reward'], victory: ['summary'], defeat: ['summary'],
};

const has = (list: readonly string[], text: string): boolean => list.includes(text);

/** The engine's shop price for an item kind (mirror of run.ts shopPrice, from the current modifiers). */
export function expectedShopPrice(s: RunState, item: 'card' | 'relic' | 'potion' | 'remove_gold' | 'remove_shard_gold', base: number): number {
  return Math.max(0, Math.floor(playerRule(s, base, (m, c, a) => (m.modifyShopPrice ? m.modifyShopPrice(c, item, a) : a))));
}

export function checkLegalParity(state: RunState, pageLegal: readonly Action[]): Violation[] {
  const g = new Game(structuredClone(state), { atomic: false });
  const node = new Set(g.legalActions().map(actionKey));
  const page = new Set(pageLegal.map(actionKey));
  const missing = [...node].filter((k) => !page.has(k));
  const extra = [...page].filter((k) => !node.has(k));
  if (missing.length === 0 && extra.length === 0) return [];
  return [{ code: 'legal-parity', msg: `page legal actions differ from the engine on the saved state: missing ${missing.slice(0, 3).join(' ')} extra ${extra.slice(0, 3).join(' ')}` }];
}

/** Everything comparable from one idle snapshot + the engine state. */
export function checkSnapshot(snap: Snapshot, s: RunState, legal: readonly Action[], widgets: readonly WidgetInfo[]): Violation[] {
  const v: Violation[] = [];
  const bad = (code: string, msg: string) => v.push({ code, msg });
  const screen = snap.screen?.name ?? '(none)';
  if (!SCREENS[s.phase].includes(screen)) bad('screen-phase', `phase ${s.phase} but screen "${screen}"`);
  const p = s.player;
  const shards = p.counters['shards'];
  if (shards === undefined) throw new Error('state has no shards counter');

  // ---- HUD (every run screen but combat, which has its own plate)
  if (snap.hud) {
    const want = `${getClassDef(s.classId).name}. HP ${p.hp} of ${p.maxHp}. ${p.gold} gold. ${shards} shards.`;
    if (snap.hud.summary !== want) bad('hud', `HUD says "${snap.hud.summary}", engine "${want}"`);
    for (const t of [`${p.hp}/${p.maxHp}`, String(shards), `ACT ${s.act}  FLOOR ${s.floor}  · ${DIFFICULTY_NAMES[s.difficulty]}`]) {
      if (!has(snap.hud.texts, t)) bad('hud', `HUD texts ${JSON.stringify(snap.hud.texts)} lack "${t}"`);
    }
    if (!has(snap.hud.texts, String(p.gold))) bad('hud-gold', `HUD gold label shows ${JSON.stringify(snap.hud.texts)}, engine gold ${p.gold}`);
  } else if (['map', 'reward', 'shop', 'rest', 'event', 'treasure', 'boss_reward', 'start'].includes(s.phase) && SCREENS[s.phase].includes(screen) && screen !== 'act-transition') {
    bad('hud', `screen ${screen} has no HUD`);
  }

  // ---- potion belt and relic strip (TopBar or the combat strips)
  if (SCREENS[s.phase].includes(screen) && !['summary', 'act-transition'].includes(screen)) {
    const top = snap.icons.filter((i) => i.y < 36);
    const empty = top.filter((i) => i.frame === 'potion_empty').length;
    if (empty !== p.potionSlots - p.potions.length) bad('potion-slots', `${empty} empty potion slots shown, engine ${p.potionSlots - p.potions.length} (slots ${p.potionSlots}, held ${p.potions.length})`);
    for (const id of new Set(p.potions)) {
      const want = p.potions.filter((x) => x === id).length;
      const n = top.filter((i) => i.label.startsWith(`${getPotionDef(id).name}:`)).length;
      if (n !== want) bad('potions', `${n} icon(s) for potion ${id}, engine holds ${want}`);
    }
    const relicIcons = top.filter((i) => p.relics.some((r) => i.label.startsWith(`${getRelicDef(r.id).name}:`)));
    const stripFull = top.some((i) => i.x > 640 - 124 - 18);
    if (relicIcons.length !== p.relics.length && !(stripFull && relicIcons.length < p.relics.length)) {
      bad('relics', `${relicIcons.length} relic icons shown, engine has ${p.relics.length} relics`);
    }
  }

  // ---- combat
  const c = s.combat;
  if (s.phase === 'combat' && c && snap.combat && screen === 'combat') {
    const living = c.enemies.filter((e) => e.alive);
    for (const e of living) {
      const u = snap.combat.enemies.find((x) => x.uid === e.uid);
      if (!u) { bad('enemy-missing', `living enemy ${e.id} (uid ${e.uid}, ${e.hp}/${e.maxHp}) has no EnemyView`); continue; }
      if (!u.visible || !u.sprite.drawn) bad('enemy-hidden', `enemy ${e.id} view is not drawn (visible ${u.visible}, drawn ${u.sprite.drawn})`);
      if (u.sprite.opaquePixels === 0) bad('enemy-sprite-empty', `enemy ${e.id} sprite frame "${u.sprite.frame}" has no opaque pixels`);
      if (!u.inBounds) bad('enemy-out-of-bounds', `enemy ${e.id} view at ${JSON.stringify(u.rect)} leaves the 640x360 screen`);
      if (!u.plateText.includes(`${e.hp}/${e.maxHp}`)) bad('enemy-hp', `enemy ${e.id} plate shows ${JSON.stringify(u.plateText)}, engine ${e.hp}/${e.maxHp}`);
    }
    for (const u of snap.combat.enemies) {
      if (!living.some((e) => e.uid === u.uid)) bad('enemy-stale', `EnemyView for ${u.enemyId} (uid ${u.uid}) but that enemy is not alive`);
    }
    if (c.kind === 'boss') {
      if (c.encounterId !== s.map.bossEncounter) bad('boss-encounter', `boss fight ${c.encounterId} but the map's boss is ${s.map.bossEncounter}`);
      const boss = c.enemies.filter((e) => getEnemyDef(e.id).boss === true);
      if (boss.length === 0) bad('boss-missing', `boss fight ${c.encounterId} has no boss enemy (${c.enemies.map((e) => e.id).join(', ')})`);
      for (const b of boss.filter((e) => e.alive)) {
        const u = snap.combat.enemies.find((x) => x.uid === b.uid);
        if (!u || !u.visible || u.sprite.opaquePixels === 0 || !u.sprite.drawn) bad('boss-invisible', `boss ${b.id} is alive but not visible on screen`);
      }
    }
    if (c.turnPhase === 'player' && !c.pendingChoice) {
      const shown = snap.combat.hand.map((h) => h.uid);
      const want = c.hand.map((h) => h.uid);
      if (shown.join(',') !== want.join(',')) bad('hand', `hand shows uids [${shown.join(',')}], engine [${want.join(',')}]`);
      for (const h of snap.combat.hand) {
        const card = c.hand.find((x) => x.uid === h.uid);
        if (card && h.name !== getCardDef(card.id, card.upgraded).name) bad('hand', `hand card ${h.uid} named "${h.name}", engine ${getCardDef(card.id, card.upgraded).name}`);
        if (!h.visible) bad('hand', `hand card ${h.name} (${h.uid}) is hidden`);
      }
      // no stray hand frame left in the focus scope (a click on one plays a card that isn't in hand: BUG-14)
      const handWidgets = widgets.filter((w) => w.list?.key === 'hand').length;
      if (handWidgets !== c.hand.length) bad('hand-stale', `${handWidgets} navigable hand frames for ${c.hand.length} cards in hand`);
      const energy = `Energy ${c.energy} of ${c.maxEnergy}`;
      if (snap.combat.energyLabel !== energy) bad('energy', `energy orb "${String(snap.combat.energyLabel)}", engine "${energy}"`);
      const endLegal = legal.some((a) => a.type === 'end_turn');
      const btn = snap.buttons.find((b) => b.label === 'END TURN');
      if (!btn) bad('end-turn', 'no END TURN button');
      else if (btn.enabled !== endLegal) bad('end-turn', `END TURN enabled=${btn.enabled}, end_turn legal=${endLegal}`);
    }
    if (!has(snap.labels, `HP ${p.hp}/${p.maxHp}`)) bad('player-hp', `combat plate lacks "HP ${p.hp}/${p.maxHp}" (labels ${JSON.stringify(snap.labels.filter((l) => l.startsWith('HP ')))})`);
  }

  // ---- shop: every price on screen is the engine's, and the engine's prices follow the current modifiers
  if (s.phase === 'shop' && s.shop && screen === 'shop') {
    const sh = s.shop;
    const want: string[] = [
      ...sh.cards.map((it) => (it.sold ? 'SOLD' : `${it.sale ? 'SALE ' : ''}${it.price} GOLD`)),
      ...sh.relics.map((it) => (it.sold ? 'SOLD' : `${it.price} GOLD`)),
      ...sh.potions.map((it) => (it.sold ? 'SOLD' : `${it.price} GOLD`)),
    ];
    const pool = [...snap.labels];
    for (const t of want) {
      const i = pool.indexOf(t);
      if (i < 0) bad('shop-price', `shop shows no "${t}" label (labels: ${JSON.stringify(snap.labels.filter((l) => /GOLD|SOLD/.test(l)))})`);
      else pool.splice(i, 1);
    }
    for (const t of [`${sh.removePrice} GOLD`, `1 ◆ + ${sh.removeShardGold} GOLD`]) {
      if (!snap.buttons.some((b) => b.label === t)) bad('shop-price', `no removal button "${t}" (buttons ${JSON.stringify(snap.buttons.map((b) => b.label))})`);
    }
    if (!sh.removeUsed) {
      const g = expectedShopPrice(s, 'remove_gold', TUNING.shop.removeBase + TUNING.shop.removeStep * s.counters.shopRemovals);
      if (g !== sh.removePrice) bad('shop-modifier', `gold removal costs ${sh.removePrice} but the current relics/statuses price it at ${g}`);
    }
    const sg = expectedShopPrice(s, 'remove_shard_gold', TUNING.shop.removeShardGold);
    if (sg !== sh.removeShardGold) bad('shop-modifier', `Shard removal costs ${sh.removeShardGold} gold but the current relics/statuses price it at ${sg}`);
  }

  // ---- reward screen contents
  if (s.phase === 'reward' && s.reward && screen === 'reward') {
    const r = s.reward;
    const cards = widgets.filter((w) => w.list?.key === 'reward-cards').length;
    const wantCards = r.cardStatus === 'pending' ? r.cards.length : 0;
    if (cards !== wantCards) bad('reward', `reward screen shows ${cards} cards, engine offers ${wantCards} (${r.cardStatus})`);
    if (wantCards > 0 && !snap.buttons.some((b) => b.label === `SKIP +${skipRewardShards(s)} ◆`)) {
      bad('reward-skip-text', `skip button ${JSON.stringify(snap.buttons.filter((b) => b.label.startsWith('SKIP')).map((b) => b.label))}, engine gives ${skipRewardShards(s)} Shards for a skip`);
    }
    if (r.potion !== null && !r.potionTaken && !snap.labels.some((l) => l.startsWith(`POTION: ${getPotionDef(r.potion as string).name.toUpperCase()}`))) bad('reward', `potion ${r.potion} not shown`);
    if (r.relic !== null && !r.relicTaken && !snap.labels.some((l) => l.startsWith(`RELIC: ${getRelicDef(r.relic as string).name.toUpperCase()}`))) bad('reward', `relic ${r.relic} not shown`);
  }

  // ---- map: every legal travel is a visible, clickable node
  if (s.phase === 'map' && screen === 'map') {
    const travels = legal.filter((a): a is Extract<Action, { type: 'travel' }> => a.type === 'travel');
    const nodes = widgets.filter((w) => w.list?.key === 'map-next');
    if (nodes.length !== travels.length) bad('map-nodes', `${nodes.length} reachable node widgets, ${travels.length} legal travels`);
    for (const n of nodes) {
      if (!n.visible) bad('map-node-hidden', `reachable map node "${n.label}" is not visible`);
      else if (!n.click) bad('map-node-unclickable', `reachable map node "${n.label}" cannot be clicked (covered)`);
    }
  }

  // ---- soft-lock: something to press, and a pending choice has its modal
  const pending = s.pendingChoice ?? c?.pendingChoice ?? null;
  if (pending && (snap.screen?.modalDepth ?? 0) < 2 && s.phase !== 'victory' && s.phase !== 'defeat') bad('choice-modal', `pending choice "${pending.prompt}" but no modal is open`);
  if (!widgets.some((w) => w.enabled && w.visible)) bad('soft-lock', `no enabled, visible widget to navigate to on ${screen}`);
  // every visible, enabled button / row can be clicked somewhere: nothing focusable covers it (BUG-13)
  for (const w of widgets) {
    if ((w.kind === 'Button' || w.kind === 'ChoiceRow' || w.kind === 'ListRow') && w.enabled && w.visible && !w.click) bad('covered', `${w.kind} "${w.label.slice(0, 40)}" at ${JSON.stringify(w.rect)} is covered: a mouse click can't reach it`);
  }
  return v;
}
