/**
 * Treasure: open the chest → relic + gold reveal → PROCEED.
 */
import { getRelicDef } from '../../../content/index.ts';
import { renderRelicText, type GameEvent } from '../../../engine/index.ts';
import type { App } from '../../app.ts';
import { actBackdrop } from '../../assets.ts';
import { rect, W } from '../../layout.ts';
import { Button } from '../../ui/Button.ts';
import { Icon } from '../../ui/Icon.ts';
import { Label } from '../../ui/Label.ts';
import { Panel } from '../../ui/Panel.ts';
import { Z, type Widget } from '../../ui/Widget.ts';
import { RunScreen } from '../RunScreen.ts';
import type { RunSession } from '../session.ts';

export class TreasureScreen extends RunScreen {
  private content: Widget[] = [];
  constructor(app: App, session: RunSession) { super(app, session, 'treasure', actBackdrop(session.state.act)); }

  protected build(): void { this.bg.setDim(1); this.draw(); }

  private draw(): void {
    for (const w of this.content) { this.scope.remove(w); this.removeWidget(w); }
    this.content = [];
    const t = this.state.treasure;
    if (!t) throw new Error('TreasureScreen: no treasure state');
    const panel = this.add(new Panel(rect(W / 2 - 130, 110, 260, 150), { title: 'TREASURE' }));
    panel.setZ(Z.PANEL);
    this.content.push(panel);
    panel.addChild(new Icon(W / 2 - 12, 140, this.app.icons, 'node_treasure', 2), 2);
    if (!t.opened) {
      panel.addChild(new Button(rect(W / 2 - 50, 228, 100, 0), 'OPEN CHEST', { onActivate: () => { this.act({ type: 'open_treasure' }); } }), 2);
    } else {
      const relic = t.relic ? `[cyan]${getRelicDef(t.relic).name.toUpperCase()}[/]\n${renderRelicText(t.relic, this.state)}` : 'NO RELIC.';
      panel.addChild(new Label(W / 2 - 116, 170, `${relic}\n[yellow]+${t.gold} GOLD[/]`, { markup: true, maxWidth: 232, align: 'center', lineHeight: 10 }), 2);
      panel.addChild(new Button(rect(W / 2 - 40, 234, 80, 0), 'PROCEED', { onActivate: () => { this.act({ type: 'proceed' }); } }), 2);
    }
    this.scope.add(panel);
    const btn = panel.descendants().find((w) => w instanceof Button);
    if (btn) this.focus.focus(btn);
  }

  protected refresh(_e: readonly GameEvent[]): void { this.app.sfx.play('win'); this.draw(); }
}
