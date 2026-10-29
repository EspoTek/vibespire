/**
 * Modal overlays shared by every run screen: confirm dialog, pause menu, help, and the CardDetail
 * panel (full card text: the hand and grids clip long text, this never does).
 */
import { promptMarkup, type Device, type PromptAction } from '../actions.ts';
import type { App } from '../app.ts';
import { fonts } from '../fonts.ts';
import { H, rect, W } from '../layout.ts';
import { C } from '../palette.ts';
import type { Screen } from '../screens/Screen.ts';
import { Bar } from '../ui/Bar.ts';
import { Button } from '../ui/Button.ts';
import type { CardFace } from '../ui/CardFrame.ts';
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
    const pw = 260, ph = 116;
    const x = Math.floor((W - pw) / 2), y = 130;
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

  constructor(x: number, y: number, w = 150) {
    super(rect(x, y, w, 40), 'detail');
    this.w = w;
    this.panel = this.addChild(new Panel(rect(x, y, w, 40)), 0);
    this.title = this.addChild(new Label(x + 8, y + 6, '', { maxWidth: w - 16, overflow: 'ellipsis', maxLines: 1 }), 2);
    this.meta = this.addChild(new Label(x + 8, y + 18, '', { font: fonts.small, color: C.textMuted, maxWidth: w - 16, markup: true }), 2);
    this.body = this.addChild(new Label(x + 8, y + 28, '', { font: fonts.small, maxWidth: w - 16, markup: true, lineHeight: 8 }), 2);
    this.setZ(Z.TOOLTIP);
    this.visible = false;
  }

  show(face: CardFace, extra = ''): void {
    this.title.setText(face.name.toUpperCase() + (face.upgraded ? '+' : '')).setColor(face.upgraded ? C.lime : C.text);
    const cost = face.cost === null ? 'UNPLAYABLE' : `COST ${face.cost}`;
    const bloom = face.bloom !== null && face.bloom !== undefined ? `  [lime]✿${face.bloom}[/]${face.bloomCapped ? ' [yellow](MAX)[/]' : ''}` : '';
    this.meta.setText(`${(face.typeLine ?? face.kind).toUpperCase()}  ${cost}${bloom}`);
    this.body.setText(face.body + (extra ? `\n\n${extra}` : ''));
    const h = 28 + this.body.rect.h + 8;
    this.panel.resize(this.w, h);
    this.rect = { ...this.rect, h };
    this.visible = true;
  }

  hide(): void { this.visible = false; }
}
