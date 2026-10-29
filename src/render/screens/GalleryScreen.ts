/**
 * GalleryScreen (debug): three pages, switched with the tab bar along the bottom, Tab/Q (RB/LB),
 * or clicking a tab. Esc/B returns to the title.
 *  1. PALETTE & FONTS: the 64 SMS colours (focus a swatch for its hex/index/name), both bitmap
 *     fonts' full character sets, shadow/outline/markup samples.
 *  2. SPRITES: every PNG in public/assets/sprites/enemies at 2x standing on the enemy baseline over
 *     the selected backdrop, PS-style name and HP boxes. Left/right on the backdrop selector cycles
 *     the three acts; confirm on an enemy plays the hit flash + shake + 'hit' SFX.
 *  3. WIDGETS: ListMenus (one scrolling), Buttons, Bars (HP is a slider), Icons, a fan of six
 *     CardFrames (hold I / Y for the card tooltip), Tooltips, Toasts, the palette fade via the
 *     Scheduler, and a live input monitor.
 */
import type { App } from '../app.ts';
import { ACTIONS, type Action } from '../actions.ts';
import { BACKDROP_IDS, BACKDROP_NAMES, ENEMY_BASELINE_Y } from '../backdrops.ts';
import { BACKDROP_KEYS } from '../assets.ts';
import type * as THREE from 'three';
import { fonts } from '../fonts.ts';
import type { FocusScope } from '../focus.ts';
import { fanLayout, H, rect, rowPositions, W, type Rect } from '../layout.ts';
import { C, cssHex, SMS_PALETTE } from '../palette.ts';
import { PixelBuffer } from '../pixels.ts';
import { SFX_NAMES } from '../psg.ts';
import { FONT_4X6, FONT_8X8, measureLine } from '../textLayout.ts';
import { shake } from '../tween.ts';
import { ICON_NAMES, type CardKind } from '../ui/art.ts';
import { Backdrop } from '../ui/Backdrop.ts';
import { Bar } from '../ui/Bar.ts';
import { Button } from '../ui/Button.ts';
import { CardFrame, type CardFace } from '../ui/CardFrame.ts';
import { EnemyView } from '../ui/EnemyView.ts';
import { Icon } from '../ui/Icon.ts';
import { Label } from '../ui/Label.ts';
import { ListMenu } from '../ui/ListMenu.ts';
import { Panel } from '../ui/Panel.ts';
import { Picture } from '../ui/Picture.ts';
import { Tooltip } from '../ui/Tooltip.ts';
import { Widget, Z } from '../ui/Widget.ts';
import { Screen } from './Screen.ts';

export type PageId = 'palette' | 'sprites' | 'widgets' | 'procedural';
export const GALLERY_PAGES: readonly PageId[] = ['palette', 'sprites', 'widgets', 'procedural'];
export function isGalleryPage(s: string): s is PageId { return (GALLERY_PAGES as readonly string[]).includes(s); }
const PAGES: readonly { id: PageId; title: string }[] = [
  { id: 'palette', title: 'PALETTE+FONTS' },
  { id: 'sprites', title: 'SPRITES' },
  { id: 'widgets', title: 'WIDGETS' },
  { id: 'procedural', title: 'PROC BG' },
];

const GENERATED: readonly { id: string; name: string }[] = BACKDROP_KEYS.map((id) => ({ id, name: id.toUpperCase().replace('_', ' ') }));

const NAMED: ReadonlyMap<number, string> = (() => {
  const m = new Map<number, string>();
  for (const [k, v] of Object.entries(C)) if (!m.has(v)) m.set(v, k);
  return m;
})();

const DEMO_CARDS: readonly CardFace[] = [
  { name: 'Strike', cost: 1, kind: 'attack', body: 'Deal [yellow]6[/] damage.' },
  { name: 'Defend', cost: 1, kind: 'skill', body: 'Gain [cyan]5[/] Block.' },
  { name: 'Shoulder Check', cost: 1, kind: 'attack', typeLine: 'Attack', body: 'Deal [yellow]8[/] damage. Gain [amber]1[/] Momentum.' },
  { name: 'Seed Bite', cost: 1, kind: 'attack', typeLine: 'Attack - Bloom', body: 'Deal [yellow]4[/] (+2 per Bloom) damage. Apply [lime]1[/] Rot.' },
  { name: 'Tick', cost: 0, kind: 'skill', body: 'Deal [yellow]3[/] damage. [magenta]On beat:[/] draw 1 card.', upgraded: true },
  { name: 'Foresight', cost: 2, kind: 'power', body: 'See each enemy\'s next [cyan]two[/] intents. Start of turn: Delay 1.' },
];

/** Live view of every semantic action plus pointer/wheel/device state. */
class InputMonitor extends Widget {
  private readonly rows = new Map<Action, Label>();
  private readonly status: Label;
  private readonly pointer: Label;
  private wheelTotal = 0;
  private readonly app: App;

  constructor(app: App, r: Rect) {
    super(r, 'inputmon');
    this.app = app;
    const panel = this.addChild(new Panel(r, { title: 'INPUT' }), 0);
    const inner = panel.contentRect;
    const half = Math.ceil(ACTIONS.length / 2);
    ACTIONS.forEach((a, i) => {
      const col = i < half ? 0 : 1;
      const row = i < half ? i : i - half;
      const l = this.addChild(new Label(inner.x + col * 90, inner.y + row * 9, `○ ${a}`, { font: fonts.small, color: C.textDim }), 2);
      this.rows.set(a, l);
    });
    this.pointer = this.addChild(new Label(inner.x, inner.y + half * 9 + 4, '', { font: fonts.small, color: C.textMuted }), 2);
    this.status = this.addChild(new Label(inner.x, inner.y + half * 9 + 12, '', { font: fonts.small, color: C.textMuted }), 2);
  }

  override update(): void {
    const inp = this.app.input;
    for (const [a, l] of this.rows) {
      const held = inp.held(a);
      l.setText(`${held ? '●' : '○'} ${a}${held ? ` ${Math.round(inp.heldFor(a))}MS` : ''}`);
      l.setColor(inp.pressed(a) ? C.white : held ? C.textHi : C.textDim);
    }
    this.wheelTotal += inp.wheel;
    const p = inp.pointer;
    this.pointer.setText(`PTR ${p.x},${p.y}${p.inside ? '' : ' OUT'} ${p.down ? 'DOWN' : 'UP'}  WHEEL ${this.wheelTotal}`);
    this.status.setText(`DEV ${inp.lastDevice.toUpperCase()}  PADS ${inp.padCount}  ${this.app.fps}FPS`);
  }
}

/** Focusable bar at the bottom of the sprites page: left/right (or click) cycles the backdrop. */
class BackdropSelector extends Widget {
  private readonly text: Label;
  private readonly onChange: (id: string) => void;
  private readonly keys: readonly { id: string; name: string }[];
  private index: number;

  constructor(r: Rect, keys: readonly { id: string; name: string }[], start: string, onChange: (id: string) => void) {
    super(r, 'bdsel');
    this.focusable = true;
    this.onChange = onChange;
    this.keys = keys;
    this.index = Math.max(0, keys.findIndex((k) => k.id === start));
    this.addChild(new Panel(r), 0);
    this.text = this.addChild(new Label(r.x + r.w / 2, r.y + 6, '', { align: 'center' }), 2);
    this.onActivate = () => this.step(1);
    this.activateSound = false;
    this.refresh();
  }

  private refresh(): void {
    const k = this.keys[this.index];
    if (!k) throw new Error('BackdropSelector: empty key list');
    this.text.setText(`◀ ${k.name} ▶`);
    this.label = `Backdrop: ${k.name}. Left and right to change.`;
  }

  private step(d: 1 | -1): void {
    this.index = (this.index + d + this.keys.length) % this.keys.length;
    this.refresh();
    this.onChange((this.keys[this.index] as { id: string }).id);
  }

  override handleNav(dir: 'up' | 'down' | 'left' | 'right'): boolean {
    if (dir === 'left') { this.step(-1); return true; }
    if (dir === 'right') { this.step(1); return true; }
    return false;
  }

  protected override renderFocus(on: boolean): void { this.text.setColor(on ? C.textHi : C.text); }
}

export class GalleryScreen extends Screen {
  private readonly backdrop: Backdrop<string>;
  private readonly scope: FocusScope;
  private readonly tabs: Button[] = [];
  private readonly tooltip: Tooltip;
  private readonly hints = new Map<Widget, string>();
  private pageWidgets: Widget[] = [];
  private page: PageId = 'palette';
  private pageToken = 0;
  private tipFor: Widget | null = null;
  private tipInfo = false;
  private sfxIndex = 0;
  private readonly initialPage: PageId;

  constructor(app: App, initialPage: PageId = 'palette') {
    super(app, 'gallery');
    this.initialPage = initialPage;
    const all: Record<string, THREE.Texture> = { ...app.assets.backdrops };
    for (const id of BACKDROP_IDS) all[`proc_${id}`] = app.devBackdrops[id];
    this.backdrop = this.add(new Backdrop<string>(all, 'act1_verdant'));
    this.scope = this.focus.pushScope('gallery', () => { void this.app.screens.pop(); });
    // tab bar along the bottom
    let x = 6;
    PAGES.forEach((p, i) => {
      const w = measureLine(FONT_8X8, p.title) + 26; // room for the ▶ marker
      const b = this.add(new Button(rect(x, H - 20, w, 0), p.title, { onActivate: () => this.show(p.id) }));
      b.list = { key: 'tabs', index: i, axis: 'x', wrap: false };
      b.setZ(Z.PANEL);
      this.tabs.push(b);
      this.scope.add(b);
      x += b.rect.w + 4;
    });
    this.add(new Label(W - 6, H - 14, 'TAB/Q RB/LB: PAGE   ESC/B: BACK', { font: fonts.small, align: 'right', color: C.textMuted, outline: C.black }));
    this.tooltip = this.add(new Tooltip({ maxWidth: 150 }));
  }

  override enter(): void { this.show(this.initialPage); }

  private addPage<T extends Widget>(w: T, focusable = true): T {
    this.add(w);
    this.pageWidgets.push(w);
    if (focusable) this.scope.add(w);
    return w;
  }

  private clearPage(): void {
    this.pageToken++;
    this.tooltip.hide();
    this.tipFor = null;
    const focused = this.focus.focused;
    for (const w of this.pageWidgets) {
      this.scope.remove(w);
      this.hints.delete(w);
      this.removeWidget(w);
    }
    this.pageWidgets = [];
    if (focused && !this.scope.widgets.includes(focused)) this.scope.focused = null;
  }

  private show(id: PageId): void {
    this.clearPage();
    this.page = id;
    PAGES.forEach((p, i) => {
      const tab = this.tabs[i];
      if (!tab) throw new Error(`gallery: no tab ${i}`);
      tab.setText(p.id === id ? `▶${p.title}` : p.title);
    });
    if (id === 'palette') this.buildPalettePage();
    else if (id === 'sprites') this.buildSpritesPage();
    else if (id === 'procedural') this.buildProceduralPage();
    else this.buildWidgetsPage();
    this.focus.ensureFocus();
  }

  // ---------------------------------------------------------------- page 1

  private buildPalettePage(): void {
    this.backdrop.visible = false;
    const pal = this.addPage(new Panel(rect(6, 6, 300, 98), { title: 'SMS PALETTE 64' }), false);
    pal.setZ(Z.PANEL);
    const c = pal.contentRect;
    SMS_PALETTE.forEach((col, i) => {
      const px = new PixelBuffer(15, 15, col);
      px.strokeRect(0, 0, 15, 15, col === C.black ? C.darkGrey : C.black);
      const sw = this.addPage(new Picture(c.x + (i % 16) * 18, c.y + Math.floor(i / 16) * 18, px));
      sw.setZ(Z.PANEL + 5);
      sw.focusable = true;
      const name = NAMED.get(col);
      sw.label = `${cssHex(col)} index ${i}${name ? ` ${name}` : ''}`;
      this.hints.set(sw, `${cssHex(col).toUpperCase()}  IDX ${i} (0X${i.toString(16).toUpperCase().padStart(2, '0')})${name ? `\n[yellow]${name}[/]` : ''}`);
    });

    const f8 = this.addPage(new Panel(rect(312, 6, 322, 98), { title: 'FONT 8X8 (PUBLIC DOMAIN)' }), false);
    f8.setZ(Z.PANEL);
    const c8 = f8.contentRect;
    const chars8 = FONT_8X8.chars.join('');
    for (let r = 0; r * 38 < chars8.length; r++) {
      this.addPage(new Label(c8.x, c8.y + r * 10, chars8.slice(r * 38, (r + 1) * 38)), false).setZ(Z.PANEL + 2);
    }
    this.addPage(new Label(c8.x, c8.y + 36, 'SHADOW', { shadow: C.psBlue, color: C.textHi }), false).setZ(Z.PANEL + 2);
    this.addPage(new Label(c8.x + 64, c8.y + 36, 'OUTLINE', { outline: C.red, color: C.white }), false).setZ(Z.PANEL + 2);
    this.addPage(new Label(c8.x + 136, c8.y + 36, 'mixed Case 0123', { color: C.cyan }), false).setZ(Z.PANEL + 2);

    const fs = this.addPage(new Panel(rect(6, 110, 628, 120), { title: 'FONT 4X6 TOM THUMB (MIT / CC0)' }), false);
    fs.setZ(Z.PANEL);
    const cs = fs.contentRect;
    const charsS = FONT_4X6.chars.join('');
    for (let r = 0; r * 100 < charsS.length; r++) {
      this.addPage(new Label(cs.x, cs.y + r * 8, charsS.slice(r * 100, (r + 1) * 100), { font: fonts.small }), false).setZ(Z.PANEL + 2);
    }
    const sample = 'Deal [yellow]8[/] damage. Gain [amber]1[/] Momentum. If Momentum is [amber]3[/] or more, apply [pink]2[/] Stagger. Rot deals its stacks at end of turn, then [lime]grows[/] by 1.';
    this.addPage(new Label(cs.x, cs.y + 22, sample, { font: fonts.small, maxWidth: 200, markup: true }), false).setZ(Z.PANEL + 2);
    this.addPage(new Label(cs.x + 220, cs.y + 22, sample, { font: fonts.small, maxWidth: 140, markup: true, align: 'center' }), false).setZ(Z.PANEL + 2);
    this.addPage(new Label(cs.x + 380, cs.y + 22, 'THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG.\nthe quick brown fox jumps over the lazy dog!\n0123456789 +-*/=%#@&()[]{}<>?', { font: fonts.small, maxWidth: 230, markup: false }), false).setZ(Z.PANEL + 2);
    this.addPage(new Label(cs.x, cs.y + 74, 'PS-STYLE 8X8 TEXT WRAPS AT ITS BOX WIDTH TOO, WITH [cyan]MARKUP[/] COLOURS.', { maxWidth: 300, markup: true }), false).setZ(Z.PANEL + 2);
  }

  // ---------------------------------------------------------------- page 2

  private buildSpritesPage(): void {
    this.backdrop.visible = true;
    const token = this.pageToken;
    const nameBox = this.addPage(new Panel(rect(W / 2 - 64, 6, 128, 20)), false);
    nameBox.setZ(Z.PANEL);
    const nameLabel = this.addPage(new Label(W / 2, 12, 'NO SPRITES', { align: 'center' }), false);
    nameLabel.setZ(Z.PANEL + 2);
    const hpBox = this.addPage(new Panel(rect(W - 6 - 96, 6, 96, 34)), false);
    hpBox.setZ(Z.PANEL);
    const hpLabel = this.addPage(new Label(W - 96, 12, 'HP  --', {}), false);
    hpLabel.setZ(Z.PANEL + 2);
    const hpBar = this.addPage(new Bar(rect(W - 96, 24, 82, 8), { name: 'HP', value: 0, max: 1, fill: C.hp, back: C.hpBack, segment: 4 }), false);
    hpBar.setZ(Z.PANEL + 2);
    const count = this.addPage(new Label(6, 12, `${this.app.enemySprites.length} SPRITE(S) IN /ASSETS/SPRITES/ENEMIES`, { font: fonts.small, color: C.white, outline: C.black }), false);
    count.setZ(Z.PANEL + 2);

    const selector = this.addPage(new BackdropSelector(rect(W / 2 - 150, 300, 300, 20), GENERATED, this.backdrop.backdropId.startsWith('proc_') ? 'act1_verdant' : this.backdrop.backdropId, (id) => this.backdrop.set(id)));
    selector.setZ(Z.PANEL);
    this.focus.focus(selector);

    const shown = this.app.enemySprites.slice(0, 4);
    if (shown.length === 0) return;
    const hp = new Map<EnemyView, { hp: number; max: number; name: string }>();
    const select = (v: EnemyView) => {
      const s = hp.get(v);
      if (!s) throw new Error('gallery: enemy view without hp state');
      nameLabel.setText(s.name);
      nameBox.resize(Math.max(96, measureLine(FONT_8X8, s.name) + 24), 20);
      nameBox.moveTo(Math.floor(W / 2 - nameBox.rect.w / 2), 6);
      hpLabel.setText(`HP ${String(s.hp).padStart(3, ' ')}`);
      hpBar.set(s.hp, s.max);
    };
    void Promise.all(shown.map((e) => this.app.enemySprite(e.name))).then((atlases) => {
      if (token !== this.pageToken) return; // page was switched while loading: drop the result
      const xs = rowPositions(shown.length, 128, 16, W);
      atlases.forEach((atlas, i) => {
        const e = shown[i] as (typeof shown)[number];
        const x = xs[i] as number;
        const v = this.addPage(new EnemyView(atlas, e.name, x + 64, ENEMY_BASELINE_Y));
        v.list = { key: 'enemies', index: i, axis: 'x', wrap: false };
        const max = 30 + ((e.name.length * 7) % 40);
        hp.set(v, { hp: max, max, name: e.name.toUpperCase().replace(/-/g, ' ') });
        v.label = `${e.name}, confirm to hit`;
        v.onFocus = () => select(v);
        v.activateSound = false;
        v.onActivate = () => {
          const s = hp.get(v);
          if (!s) throw new Error('gallery: enemy view without hp state');
          this.app.sfx.play('hit');
          s.hp = Math.max(0, s.hp - 6);
          select(v);
          void this.app.scheduler.enqueue(() => v.hit(this.app.tweens));
        };
      });
      const first = [...hp.keys()][0];
      if (first) select(first);
    });
  }

  // ---------------------------------------------------------------- page 4 (dev): the procedural backdrops

  private buildProceduralPage(): void {
    this.backdrop.visible = true;
    this.backdrop.set('proc_verdant');
    const keys = BACKDROP_IDS.map((id) => ({ id: `proc_${id}`, name: `PROCEDURAL ${BACKDROP_NAMES[id]}` }));
    const sel = this.addPage(new BackdropSelector(rect(W / 2 - 170, 300, 340, 20), keys, 'proc_verdant', (id) => this.backdrop.set(id)));
    sel.setZ(Z.PANEL);
    this.focus.focus(sel);
  }

  // ---------------------------------------------------------------- page 3

  private buildWidgetsPage(): void {
    this.backdrop.visible = true;
    this.backdrop.set('act2_foundry');
    const z = Z.PANEL;
    const cmd = this.addPage(new ListMenu(6, 6, [
      { label: 'FIGHT', hint: 'PS-style command list.\nUp/down moves the [yellow]▶[/] cursor.' },
      { label: 'SKILL', hint: 'Rows are a wrapping list:\nleft/right leave it spatially.' },
      { label: 'ITEM', hint: 'Mouse hover moves focus;\nclick activates.' },
      { label: 'INFO', enabled: false, hint: 'Disabled rows are skipped.' },
      { label: 'FLEE', hint: 'Confirm plays the confirm SFX.' },
    ], { title: 'COMMAND', w: 104 }));
    cmd.setZ(z);
    for (const r of cmd.rows) if (r.item.hint) this.hints.set(r, r.item.hint);

    const relics = ['ORRERY', 'BURNT TOKEN', 'GEAR HEART', 'MOSS RING', 'LENS', 'TUNING FORK', 'COMPASS', 'SPORE JAR', 'ANVIL', 'PRISM'];
    const rel = this.addPage(new ListMenu(6, 104, relics.map((r) => ({ label: r, hint: `${r}\nScroll with the wheel\nor move past the edge.` })), { title: 'RELICS', visibleRows: 4 }));
    rel.setZ(z);
    for (const r of rel.rows) if (r.item.hint) this.hints.set(r, r.item.hint);

    // buttons
    const bx = 136;
    let by = 6;
    const btn = (text: string, hint: string, fn: (b: Button) => void) => {
      const b = this.addPage(new Button(rect(bx, by, 112, 0), text, { onActivate: fn }));
      b.setZ(z);
      this.hints.set(b, hint);
      by += b.rect.h + 4;
      return b;
    };
    btn('TOAST', 'Queue a toast message.', () => this.app.toasts.show(`TOAST AT FRAME ${this.app.frames}`));
    const firstSfx = SFX_NAMES[0];
    if (!firstSfx) throw new Error('gallery: SFX table is empty');
    const sfxBtn = btn(`SFX ${firstSfx.toUpperCase()}`, 'Play this SFX, then\nadvance to the next.', (b) => {
      const name = SFX_NAMES[this.sfxIndex];
      if (!name) throw new Error(`gallery: no SFX at ${this.sfxIndex}`);
      this.app.sfx.play(name);
      this.sfxIndex = (this.sfxIndex + 1) % SFX_NAMES.length;
      b.setText(`SFX ${(SFX_NAMES[this.sfxIndex] as string).toUpperCase()}`);
    });
    sfxBtn.activateSound = false;
    btn('SHAKE', 'Whole-pixel screen shake\n(4px, 300ms).', () => { void this.app.scheduler.enqueue(() => shake(this.app.tweens, this.root, 4, 300)); });
    btn('FADE', 'Palette fade out and in,\nsequenced by the Scheduler.', () => {
      const d = this.app.display;
      for (const lv of [-1, -2, -3, -3, -2, -1, 0]) {
        void this.app.scheduler.enqueue(async () => { d.setFade(lv); await this.app.tweens.delay(60); });
      }
    });

    // bars
    const barPanel = this.addPage(new Panel(rect(bx, by + 2, 112, 64), { title: 'BARS' }), false);
    barPanel.setZ(z);
    const bc = barPanel.contentRect;
    const hpBar = this.addPage(new Bar(rect(bc.x, bc.y, 64, 8), { name: 'HP', value: 42, max: 60, fill: C.hp, back: C.hpBack, segment: 4, step: 5, showValue: 'right' }));
    hpBar.setZ(z + 2);
    this.hints.set(hpBar, 'A focusable Bar is a slider:\nleft/right or the wheel.');
    this.addPage(new Bar(rect(bc.x, bc.y + 12, 40, 8), { name: 'Energy', value: 2, max: 3, fill: C.energy, back: C.brown, segment: 'unit', showValue: 'right' }), false).setZ(z + 2);
    this.addPage(new Bar(rect(bc.x, bc.y + 24, 64, 6), { name: 'Block', value: 12, max: 30, fill: C.block, back: C.navy, showValue: 'right' }), false).setZ(z + 2);

    // icons
    const iconPanel = this.addPage(new Panel(rect(254, 6, 180, 64), { title: 'ICONS 2X' }), false);
    iconPanel.setZ(z);
    const ic = iconPanel.contentRect;
    ICON_NAMES.forEach((name, i) => {
      const icon = this.addPage(new Icon(ic.x + (i % 6) * 28, ic.y + Math.floor(i / 6) * 26, this.app.icons, name, 2));
      icon.focusable = true;
      icon.setZ(z + 2);
      this.hints.set(icon, name.toUpperCase());
    });

    // input monitor
    this.addPage(new InputMonitor(this.app, rect(440, 6, 194, 200)), false).setZ(z);

    // card fan
    const slots = fanLayout(DEMO_CARDS.length, 64, { centerX: W / 2, baseY: 238, maxWidth: 420, gap: 4, arc: 6 });
    DEMO_CARDS.forEach((face, i) => {
      const s = slots[i];
      if (!s) throw new Error(`gallery: no fan slot ${i}`);
      const card = this.addPage(new CardFrame(s.x, s.y, face, i));
      card.restZ = Z.CARD + i * 4;
      card.setZ(card.restZ);
      card.list = { key: 'hand', index: i, axis: 'x', wrap: false };
      this.hints.set(card, `[yellow]${face.name.toUpperCase()}[/]  (hold I / Y)\n${face.body}`);
      card.onActivate = () => this.app.toasts.show(`PLAYED ${face.name.toUpperCase()} (SLOT ${i + 1})`);
    });
    this.focus.focus(cmd.row(0));
  }

  // ---------------------------------------------------------------- per frame

  override update(): void {
    const inp = this.app.input;
    if (inp.pressed('nextTarget') || inp.pressed('prevTarget')) {
      const i = PAGES.findIndex((p) => p.id === this.page);
      const d = inp.pressed('nextTarget') ? 1 : -1;
      const next = PAGES[(i + d + PAGES.length) % PAGES.length];
      if (!next) throw new Error('gallery: page index out of range');
      this.app.sfx.play('move');
      this.show(next.id);
      return;
    }
    // card slots 1..6 activate the matching card on the widgets page
    if (this.page === 'widgets') {
      for (let k = 1; k <= DEMO_CARDS.length; k++) {
        if (inp.pressed(`cardSlot${k}` as Action)) {
          const card = this.pageWidgets.filter((w): w is CardFrame => w instanceof CardFrame)[k - 1];
          if (card) { this.focus.focus(card, { sound: true }); }
        }
      }
    }
    // tooltip follows focus; cards only while `info` is held
    const f = this.focus.focused;
    const info = inp.held('info');
    if (f !== this.tipFor || info !== this.tipInfo) {
      this.tipFor = f;
      this.tipInfo = info;
      const hint = f ? this.hints.get(f) : undefined; // undefined = this widget has no hint (expected)
      if (f && hint !== undefined && (!(f instanceof CardFrame) || info)) {
        this.tooltip.show(f instanceof CardFrame ? f.ringRect() : f.rect, hint, f instanceof CardFrame ? 'above' : 'right');
      } else this.tooltip.hide();
    }
  }
}
