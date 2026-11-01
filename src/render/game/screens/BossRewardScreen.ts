/**
 * Boss reward (acts 1-2, GDD §4.10): 3 boss relics with their text, or SKIP +2 ◆.
 */
import { getRelicDef } from '../../../content/index.ts';
import { renderRelicText, TUNING, type GameEvent } from '../../../engine/index.ts';
import type { App } from '../../app.ts';
import { actBackdrop } from '../../assets.ts';
import { rect, W } from '../../layout.ts';
import { Button } from '../../ui/Button.ts';
import { Label } from '../../ui/Label.ts';
import { C } from '../../palette.ts';
import { Panel } from '../../ui/Panel.ts';
import { Z } from '../../ui/Widget.ts';
import { RunScreen } from '../RunScreen.ts';
import type { RunSession } from '../session.ts';
import { ChoiceRow } from '../widgets.ts';
import { itemIcon } from '../view.ts';

export class BossRewardScreen extends RunScreen {
  constructor(app: App, session: RunSession) { super(app, session, 'boss-reward', actBackdrop(session.state.act)); }

  protected build(): void {
    this.tips.offer('boss_relic');
    this.bg.setDim(2);
    const choices = this.state.bossRelicChoices;
    if (!choices) throw new Error('BossRewardScreen: no bossRelicChoices');
    const panel = this.add(new Panel(rect(90, 50, W - 180, 296), { title: 'BOSS RELIC' }));
    panel.setZ(Z.PANEL);
    let y = 74;
    if (choices.length === 0) panel.addChild(new Label(W / 2, 150, 'NO BOSS RELICS LEFT TO OFFER.', { align: 'center', color: C.textMuted }), 2);
    choices.forEach((id, i) => {
      const def = getRelicDef(id);
      const text = `[cyan]${def.name.toUpperCase()}[/]\n${renderRelicText(id, this.state)}`;
      // a boss relic is a big moment: icon at 2x, text in the 8x8 font (16 px more icon width than heightFor assumes)
      const h = Math.max(44, ChoiceRow.heightFor(text, W - 212 - 16, { icon: true }));
      const a = this.session.findOrNull('choose_boss_relic', (x) => x.index === i);
      const row = panel.addChild(new ChoiceRow(rect(106, y, W - 212, h), { text, icon: itemIcon(this.app, 'relic', id), iconScale: 2, reason: a ? null : 'Not available.' }), 3);
      row.list = { key: 'boss-relics', index: i, axis: 'y', wrap: false };
      row.onActivate = () => { if (a) this.act(a); };
      y += h + 6;
    });
    this.rowsBottom = y;
    const skip = this.session.findOrNull('skip_boss_relic');
    panel.addChild(new Button(rect(W / 2 - 60, 322, 120, 0), `SKIP +${TUNING.shards.skipBossRelic} ◆`, {
      onActivate: () => { if (skip) this.act(skip); },
      hint: `Take no relic: gain ${TUNING.shards.skipBossRelic} Shards.`,
    }), 3).setEnabled(skip !== null);
    this.scope.add(panel);
  }

  protected refresh(_e: readonly GameEvent[]): void { /* routes to the act transition */ }

  /** Bottom of the relic rows: the focused relic's keyword boxes go under them, side by side, above SKIP. */
  private rowsBottom = 0;

  protected override updateInfo(): void {
    const f = this.focus.focused;
    if (this.focus.depth === 1 && !this.leaving && f instanceof ChoiceRow) {
      this.infoLayer.update(f, { anchor: rect(106, this.rowsBottom - 4, W - 212, 1), side: 'below', maxHeight: 318 - this.rowsBottom });
      return;
    }
    super.updateInfo();
  }
}
