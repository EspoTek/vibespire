/**
 * Modal overlays shared by every run screen: confirm dialog, pause menu, help, and the CardDetail
 * panel (full card text: the hand and grids clip long text, this never does).
 */
import type { CardInstance, CardOffer } from '../../engine/index.ts';
import { PROMPTS, promptMarkup, type Device, type PromptAction } from '../actions.ts';
import type { App } from '../app.ts';
import { fonts } from '../fonts.ts';
import { H, rect, W, type Rect, type Side } from '../layout.ts';
import { C } from '../palette.ts';
import type { Screen } from '../screens/Screen.ts';
import { CARD } from '../ui/art.ts';
import { Bar } from '../ui/Bar.ts';
import { Button } from '../ui/Button.ts';
import { CardFrame, type CardFace } from '../ui/CardFrame.ts';
import { KeywordBoxes } from '../ui/KeywordBoxes.ts';
import { canUpgradeCard, cardFace } from './view.ts';
import { tipsOf } from './tips.ts';
import { Label } from '../ui/Label.ts';
import { ListMenu } from '../ui/ListMenu.ts';
import { Panel } from '../ui/Panel.ts';
import { Widget, Z } from '../ui/Widget.ts';

/** Centred PS box with a message and YES / NO. */
export function confirmDialog(screen: Screen, title: string, text: string, yes: string, onYes: () => void, no = 'NO'): () => void {
  return screen.openModal(`confirm:${title}`, (close) => {
    const w = 300;
    const body = new Label(0, 0, text, { maxWidth: w - 24, markup: true });
    const h = body.rect.h + 64;
    const x = Math.floor((W - w) / 2), y = Math.floor((H - h) / 2);
    const panel = new Panel(rect(x, y, w, h), { title });
    panel.setZ(Z.MODAL + 50);
    body.moveTo(x + 12, y + 24);
    panel.addChild(body, 2);
    panel.addChild(new Button(rect(x + w / 2 - 92, y + h - 26, 84, 0), yes, { onActivate: () => { close(); onYes(); } }), 2);
    panel.addChild(new Button(rect(x + w / 2 + 8, y + h - 26, 84, 0), no, { onActivate: () => close() }), 2);
    return [panel];
  });
}

/** Centred PS box with a message and one OK button (cancel closes it too). */
export function noticeDialog(screen: Screen, title: string, text: string, onClose: () => void = () => {}): () => void {
  return screen.openModal(`notice:${title}`, (close) => {
    const w = 300;
    const body = new Label(0, 0, text, { maxWidth: w - 24, markup: true });
    const h = body.rect.h + 64;
    const x = Math.floor((W - w) / 2), y = Math.floor((H - h) / 2);
    const panel = new Panel(rect(x, y, w, h), { title });
    panel.setZ(Z.MODAL + 50);
    body.moveTo(x + 12, y + 24);
    panel.addChild(body, 2);
    panel.addChild(new Button(rect(x + w / 2 - 42, y + h - 26, 84, 0), 'OK', { onActivate: close }), 2);
    return [panel];
  }, onClose);
}

/** Controls for the current device (GDD: help overlay on '?' / Back). */
export function controlsText(device: Device): string {
  const m = (a: PromptAction) => promptMarkup(device, a);
  const nav = device === 'gamepad' ? 'D-PAD / STICK' : device === 'mouse' ? 'HOVER' : 'ARROWS / WASD';
  return [
    `[yellow]${nav}[/]  move focus`,
    `${m('confirm')}  select / play card`,
    `${m('cancel')}  back / cancel`,
    device === 'gamepad' ? `${m('confirm')} on a card  pick it (D-pad along the hand)` : `[yellow]1-0[/]  pick hand card by slot`,
    `${m('nextTarget')} / ${m('prevTarget')}  next / previous target`,
    `${m('endTurn')}  end turn`,
    `[yellow]hold[/] ${m('info')}  details (cards, intents, relics)`,
    `${m('deck')}  deck view    ${m('menu')}  pause menu`,
    `${m('upgradeView')}  view upgrades (rewards, shop, deck)`,
    `${m('help')}  this help`,
  ].join('\n');
}

export function openHelp(screen: Screen, app: App): () => void {
  return screen.openModal('help', (close) => {
    const w = 330, h = 150;
    const x = Math.floor((W - w) / 2), y = Math.floor((H - h) / 2);
    const panel = new Panel(rect(x, y, w, h), { title: `CONTROLS (${app.input.lastDevice.toUpperCase()})` });
    panel.setZ(Z.MODAL + 40);
    panel.addChild(new Label(x + 12, y + 24, controlsText(app.input.lastDevice), { font: fonts.small, markup: true, lineHeight: 10 }), 2);
    panel.addChild(new Button(rect(x + w - 70, y + h - 24, 60, 0), 'OK', { onActivate: () => close() }), 2);
    return [panel];
  });
}

export interface PauseHandlers {
  seed: string;
  onAbandon: () => void;
}

export function openPause(screen: Screen, app: App, h: PauseHandlers): () => void {
  let closeRef: () => void = () => { throw new Error('pause: close before open'); };
  closeRef = screen.openModal('pause', (close) => {
    const w = 200, ph = 128;
    const x = Math.floor((W - w) / 2), y = Math.floor((H - ph) / 2);
    const panel = new Panel(rect(x, y, w, ph), { title: 'PAUSED' });
    panel.setZ(Z.MODAL + 30);
    const menu = new ListMenu(x + 30, y + 24, [
      { label: 'RESUME', onActivate: () => close() },
      { label: 'OPTIONS', onActivate: () => openOptions(screen, app) },
      { label: 'HELP', onActivate: () => openHelp(screen, app) },
      { label: 'ABANDON RUN', onActivate: () => confirmDialog(screen, 'ABANDON RUN', 'Abandon this run? The save is deleted and cannot be recovered.', 'ABANDON', () => { close(); h.onAbandon(); }) },
    ], { w: 140, rowH: 13 });
    panel.addChild(menu, 1);
    panel.addChild(new Label(x + w / 2, y + ph - 14, `SEED ${h.seed}`, { font: fonts.small, align: 'center', color: C.textMuted }), 2);
    return [panel];
  });
  return closeRef;
}

export function openOptions(screen: Screen, app: App): () => void {
  return screen.openModal('options', (close) => {
    const pw = 260, ph = 182;
    const x = Math.floor((W - pw) / 2), y = 100;
    const panel = new Panel(rect(x, y, pw, ph), { title: 'OPTIONS' });
    panel.setZ(Z.MODAL + 60);
    const inner = panel.contentRect;
    panel.addChild(new Label(inner.x, inner.y + 4, 'SFX'), 2);
    panel.addChild(new Bar(rect(inner.x + 72, inner.y + 3, 120, 10), {
      name: 'SFX volume', value: Math.round(app.settings.volume * 10), max: 10, fill: C.cyan, back: C.navy, segment: 'unit', step: 1,
      onChange: (v) => { app.saveSettings({ volume: v / 10 }); app.sfx.play('move'); },
    }), 2);
    panel.addChild(new Label(inner.x, inner.y + 22, 'MUSIC'), 2);
    panel.addChild(new Bar(rect(inner.x + 72, inner.y + 21, 120, 10), {
      name: 'Music volume', value: Math.round(app.settings.musicVolume * 10), max: 10, fill: C.magenta, back: C.navy, segment: 'unit', step: 1,
      onChange: (v) => { app.saveSettings({ musicVolume: v / 10 }); },
    }), 2);
    panel.addChild(new Label(inner.x, inner.y + 44, 'ANIM SPEED'), 2);
    const speeds = [1, 2, 4];
    panel.addChild(new Button(rect(inner.x + 96, inner.y + 39, 48, 0), `${app.settings.animSpeed}X`, {
      onActivate: (b) => {
        const i = speeds.indexOf(app.settings.animSpeed);
        const next = speeds[(i + 1) % speeds.length] as number;
        app.saveSettings({ animSpeed: next });
        b.setText(`${next}X`);
      },
    }), 2);
    // accessibility: screen shake intensity and full-screen flashes
    const SHAKE_NAMES = ['OFF', 'LOW', 'FULL'] as const;
    panel.addChild(new Label(inner.x, inner.y + 66, 'SCREEN SHAKE'), 2);
    panel.addChild(new Button(rect(inner.x + 120, inner.y + 61, 56, 0), SHAKE_NAMES[app.settings.shake], {
      hint: 'Screen shake on hits: off, low (half) or full.',
      onActivate: (b) => {
        const next = app.settings.shake === 2 ? 0 : app.settings.shake === 0 ? 1 : 2;
        app.saveSettings({ shake: next });
        b.setText(SHAKE_NAMES[next]);
      },
    }), 2);
    panel.addChild(new Label(inner.x, inner.y + 88, 'FLASHES'), 2);
    panel.addChild(new Button(rect(inner.x + 120, inner.y + 83, 56, 0), app.settings.flashes ? 'ON' : 'OFF', {
      hint: 'Full-screen flashes (parry, boss phase, beat). Off: a border blink instead.',
      onActivate: (b) => {
        app.saveSettings({ flashes: !app.settings.flashes });
        b.setText(app.settings.flashes ? 'ON' : 'OFF');
      },
    }), 2);
    // one-time tips (game/tips.ts): on/off, and show them all again
    const tips = tipsOf(app);
    panel.addChild(new Label(inner.x, inner.y + 110, 'TIPS'), 2);
    panel.addChild(new Button(rect(inner.x + 120, inner.y + 105, 56, 0), tips.enabled ? 'ON' : 'OFF', {
      hint: 'Short tips the first time a mechanic appears.',
      onActivate: (b) => { tips.setEnabled(!tips.enabled); b.setText(tips.enabled ? 'ON' : 'OFF'); },
    }), 2);
    panel.addChild(new Button(rect(inner.x + 180, inner.y + 105, 56, 0), 'RESET', {
      hint: 'Show every tip again.',
      onActivate: () => { tips.reset(); app.toasts.show('TIPS RESET'); },
    }), 2);
    panel.addChild(new Button(rect(x + pw / 2 - 30, y + ph - 26, 60, 0), 'BACK', { onActivate: () => close() }), 2);
    return [panel];
  });
}

/**
 * CardDetail: a PS box with the card's name, cost, type, Bloom and its full rules text (8x8 font
 * is too wide for long text, so the 4x6 font at a roomier line height).
 */
export class CardDetail extends Widget {
  private readonly panel: Panel;
  private readonly title: Label;
  private readonly meta: Label;
  private readonly body: Label;
  private readonly w: number;

  /** Glossary boxes for the shown card's keywords (beside the panel, never over `avoid`). */
  readonly keywords: KeywordBoxes;
  /** Where the keyword boxes go relative to the panel. */
  keywordSide: Side = 'below';

  constructor(x: number, y: number, w = 150) {
    super(rect(x, y, w, 40), 'detail');
    this.w = w;
    this.panel = this.addChild(new Panel(rect(x, y, w, 40)), 0);
    this.title = this.addChild(new Label(x + 8, y + 6, '', { maxWidth: w - 16, overflow: 'ellipsis', maxLines: 1 }), 2);
    this.meta = this.addChild(new Label(x + 8, y + 18, '', { font: fonts.small, color: C.textMuted, maxWidth: w - 16, markup: true }), 2);
    this.body = this.addChild(new Label(x + 8, y + 28, '', { font: fonts.small, maxWidth: w - 16, markup: true, lineHeight: 8 }), 2);
    this.keywords = this.addChild(new KeywordBoxes(), 20);
    this.setZ(Z.TOOLTIP);
    this.visible = false;
  }

  /**
   * Show `face` with its full text and keyword boxes. `avoid`: rects the keyword boxes must not
   * cover (the inspected card itself, its neighbours).
   */
  show(face: CardFace, extra = '', avoid: readonly Rect[] = []): void {
    const name = face.name.toUpperCase();
    this.title.setText(face.upgraded && !name.endsWith('+') ? `${name}+` : name).setColor(face.upgraded ? C.lime : C.text);
    const cost = face.cost === null ? 'UNPLAYABLE' : `COST ${face.cost === 'X' ? 'X' : face.cost}`;
    const costMark = face.costState === 'reduced' ? `[lime]${cost}[/]` : face.costState === 'raised' || face.costState === 'unaffordable' ? `[pink]${cost}[/]` : cost;
    const lifted = face.bloomOwn !== undefined ? ` [cyan](own ${face.bloomOwn})[/]` : '';
    const bloom = face.bloom !== null && face.bloom !== undefined ? `  [${face.bloomOwn !== undefined ? 'cyan' : 'lime'}]✿${face.bloom}[/]${lifted}${face.bloomCapped ? ' [yellow](MAX)[/]' : ''}` : '';
    this.meta.setText(`${(face.typeLine ?? face.kind).toUpperCase()}  ${costMark}${bloom}`);
    this.body.setText(face.body + (extra ? `\n\n${extra}` : ''));
    // the meta line may wrap (type, cost, Bloom): the body starts under it
    const top = this.meta.rect.y - this.rect.y + this.meta.rect.h + 4;
    this.body.moveTo(this.body.rect.x, this.rect.y + top);
    const h = top + this.body.rect.h + 8;
    this.panel.resize(this.w, h);
    this.rect = { ...this.rect, h };
    this.visible = true;
    this.keywords.show(face.keywords ?? [], this.rect, this.keywordSide, avoid);
  }

  hide(): void { this.visible = false; this.keywords.hide(); }
}

/**
 * UpgradeCompare (rest-site Smith picker): the card now and upgraded, side by side, with the
 * numbers the upgrade changes in lime on the right, and the upgraded card's keyword boxes.
 */
export class UpgradeCompare extends Widget {
  private readonly panel: Panel;
  private readonly app: App;
  private frames: CardFrame[] = [];
  private readonly note: Label;
  private readonly arrow: Label;
  readonly keywords: KeywordBoxes;
  private readonly w: number;

  constructor(app: App, x: number, y: number, w: number) {
    super(rect(x, y, w, 132), 'upcompare');
    this.app = app;
    this.w = w;
    this.panel = this.addChild(new Panel(rect(x, y, w, 132), { title: 'UPGRADE' }), 0);
    this.arrow = this.addChild(new Label(x + Math.floor(w / 2), y + 60, '→', { align: 'center', color: C.lime }), 3);
    this.note = this.addChild(new Label(x + 6, y + 116, '', { font: fonts.small, maxWidth: w - 12, color: C.textMuted, markup: true }), 3);
    this.keywords = this.addChild(new KeywordBoxes(), 20);
    this.setZ(Z.TOOLTIP);
    this.visible = false;
  }

  show(card: CardInstance | CardOffer, reason: string | null, avoid: readonly Rect[] = []): void {
    for (const f of this.frames) f.dispose();
    this.frames = [];
    const x = this.rect.x, y = this.rect.y;
    const gap = Math.floor((this.w - 2 * CARD.W - 16) / 3);
    const before = cardFace(this.app, card);
    const after = cardFace(this.app, card, { upgradePreview: true });
    const canUp = canUpgradeCard(card);
    const fb = this.addChild(new CardFrame(x + gap, y + 22, before, 1), 2);
    fb.focusable = false;
    this.frames.push(fb);
    if (canUp) {
      const fa = this.addChild(new CardFrame(x + this.w - gap - CARD.W, y + 22, after, 2), 2);
      fa.focusable = false;
      this.frames.push(fa);
    }
    this.arrow.visible = canUp;
    this.note.setText(reason ? `[pink]${reason}[/]` : canUp ? '[lime]GREEN[/] = changed by the upgrade.' : '');
    this.setZ(this.z);
    this.visible = true;
    this.keywords.show(canUp ? after.keywords ?? [] : before.keywords ?? [], this.rect, 'below', avoid);
  }

  hide(): void { this.visible = false; this.keywords.hide(); }
}

/**
 * The VIEW UPGRADE checkbox (STS): a button that flips upgrade previews on a screen. Its key
 * (U / pad RT) works while its focus scope is on top, wherever focus is.
 */
export class UpgradeToggle extends Button {
  private on = false;
  private readonly app: App;
  private readonly screen: Screen;
  private readonly onToggle: (on: boolean) => void;
  private shownDevice = '';

  constructor(app: App, screen: Screen, x: number, y: number, onToggle: (on: boolean) => void, initial = false) {
    super(rect(x, y, 104, 0), UpgradeToggle.caption(initial, app.input.lastDevice), { font: fonts.small, onActivate: () => this.toggle() });
    this.app = app;
    this.screen = screen;
    this.onToggle = onToggle;
    this.on = initial;
    this.hint = 'Show every card here as it would be upgraded. Green numbers are the ones the upgrade changes.';
  }

  static caption(on: boolean, device: Device): string {
    return `${on ? '[X]' : '[ ]'} VIEW UPGRADE (${PROMPTS[device].upgradeView})`;
  }

  get value(): boolean { return this.on; }

  toggle(): void {
    this.on = !this.on;
    this.app.sfx.play('move');
    this.refreshCaption();
    this.onToggle(this.on);
  }

  private refreshCaption(): void {
    this.shownDevice = this.app.input.lastDevice;
    this.setText(UpgradeToggle.caption(this.on, this.app.input.lastDevice));
  }

  override update(dtMs: number): void {
    super.update(dtMs);
    if (!this.visible || this.screen.focus.depth === 0 || !this.screen.focus.top.widgets.includes(this)) return;
    if (this.app.input.lastDevice !== this.shownDevice) this.refreshCaption();
    if (this.app.input.pressed('upgradeView')) this.toggle();
  }
}
