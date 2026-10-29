/**
 * TitleScreen: the generated title_spire backdrop, the pixel logo (8x8 font at 3x, two-tone shadow)
 * in the calm sky band, and the PS command menu: NEW RUN / CONTINUE / GALLERY / OPTIONS.
 *  - NEW RUN → class select.
 *  - CONTINUE (enabled when a save exists) → load and resume at the saved phase (mid-combat too).
 *  - OPTIONS: volume + animation speed.
 */
import type { App } from '../app.ts';
import { PROMPTS } from '../actions.ts';
import { fonts } from '../fonts.ts';
import { H, W } from '../layout.ts';
import { C } from '../palette.ts';
import { Backdrop } from '../ui/Backdrop.ts';
import { Label } from '../ui/Label.ts';
import { ListMenu } from '../ui/ListMenu.ts';
import { Z } from '../ui/Widget.ts';
import { openOptions } from '../game/overlays.ts';
import { screenFor } from '../game/router.ts';
import { ClassSelectScreen } from '../game/screens/ClassSelectScreen.ts';
import { RunSession } from '../game/session.ts';
import { GalleryScreen } from './GalleryScreen.ts';
import { Screen } from './Screen.ts';

export class TitleScreen extends Screen {
  private readonly menu: ListMenu;
  private readonly prompt: Label;
  private shownDevice = '';

  constructor(app: App) {
    super(app, 'title');
    this.add(new Backdrop(app.assets.backdrops, 'title_spire'));
    // Logo in the calm violet sky band above the horizon (offsets are in glyph pixels).
    this.add(new Label(W / 2, 8, 'VIBESPIRE', {
      scale: 3, align: 'center', color: C.white,
      effects: [{ dx: 2, dy: 2, color: C.navy }, { dx: 1, dy: 1, color: C.psBlue }],
    }));
    this.add(new Label(W / 2, 40, 'CLIMB THE DERELICT SPIRE', { align: 'center', color: C.iceBlue, outline: C.violet }));
    const items = [
      { label: 'NEW RUN', onActivate: () => { void this.app.screens.push(new ClassSelectScreen(this.app)); } },
      { label: 'CONTINUE', enabled: RunSession.hasSave(app.storage), onActivate: () => this.continueRun() },
      { label: 'GALLERY', onActivate: () => { void this.app.screens.push(new GalleryScreen(this.app)); } },
      { label: 'OPTIONS', onActivate: () => openOptions(this, this.app) },
    ];
    const menuW = 112;
    this.menu = this.add(new ListMenu(Math.floor((W - menuW) / 2), 206, items, { w: menuW, rowH: 14 }));
    this.menu.setZ(Z.PANEL);
    this.focus.pushScope('title').add(this.menu);
    this.add(new Label(6, H - 10, 'V0.2', { font: fonts.small, color: C.textMuted, outline: C.black }));
    this.prompt = this.add(new Label(W - 6, H - 10, '', { font: fonts.small, align: 'right', color: C.textMuted, outline: C.black }));
  }

  override enter(): void { this.focus.ensureFocus(); }

  /** Back from a run / class select: CONTINUE follows the save. */
  override resume(): void {
    this.menu.row(1).setEnabled(RunSession.hasSave(this.app.storage));
    this.focus.focus(this.menu.row(this.menu.row(1).enabled ? 1 : 0));
  }

  private continueRun(): void {
    const session = RunSession.loadOrNull(this.app.storage);
    if (!session) { this.app.toasts.show('NO SAVED RUN'); this.resume(); return; }
    console.info(`[run] continue: seed ${session.state.seed}, phase ${session.state.phase}, floor ${session.state.floor}`);
    void this.app.screens.push(screenFor(this.app, session));
  }

  override update(): void {
    const dev = this.app.input.lastDevice;
    if (dev !== this.shownDevice) {
      this.shownDevice = dev;
      const p = PROMPTS[dev];
      this.prompt.setText(`${p.confirm} SELECT   ${p.cancel} BACK`);
    }
  }
}
