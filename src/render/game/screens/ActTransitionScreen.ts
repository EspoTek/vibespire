/**
 * Act transition card: "ACT 2 — THE FOUNDRY" with the heal shown (GDD §4.10), then the map.
 */
import type { App } from '../../app.ts';
import { actBackdrop } from '../../assets.ts';
import { fonts } from '../../fonts.ts';
import { rect, W } from '../../layout.ts';
import { C } from '../../palette.ts';
import { Screen } from '../../screens/Screen.ts';
import { Backdrop } from '../../ui/Backdrop.ts';
import { Button } from '../../ui/Button.ts';
import { Label } from '../../ui/Label.ts';
import { Panel } from '../../ui/Panel.ts';
import { Z } from '../../ui/Widget.ts';
import { screenFor } from '../router.ts';
import type { RunSession } from '../session.ts';

export const ACT_NAMES: Readonly<Record<1 | 2 | 3, string>> = { 1: 'THE VERDANT DECKS', 2: 'THE FOUNDRY', 3: 'THE CROWN' };

export class ActTransitionScreen extends Screen {
  private readonly session: RunSession;
  constructor(app: App, session: RunSession, healed: number) {
    super(app, 'act-transition');
    this.session = session;
    const s = session.state;
    this.add(new Backdrop(app.assets.backdrops, actBackdrop(s.act)));
    const panel = this.add(new Panel(rect(W / 2 - 150, 120, 300, 110)));
    panel.setZ(Z.PANEL);
    panel.addChild(new Label(W / 2, 134, `ACT ${s.act}`, { align: 'center', color: C.textHi, scale: 2 }), 2);
    panel.addChild(new Label(W / 2, 158, ACT_NAMES[s.act], { align: 'center' }), 2);
    panel.addChild(new Label(W / 2, 174, healed > 0 ? `HEALED ${healed} HP  (${s.player.hp}/${s.player.maxHp})` : `HP ${s.player.hp}/${s.player.maxHp}`, { font: fonts.small, align: 'center', color: C.lime }), 2);
    panel.addChild(new Button(rect(W / 2 - 40, 198, 80, 0), 'CLIMB', { onActivate: () => { void this.app.screens.replace(screenFor(this.app, this.session)); } }), 2);
    this.focus.pushScope('act').add(panel);
  }
  override enter(): void { this.focus.ensureFocus(); this.app.sfx.play('win'); }
}
