/**
 * Ascent Pact (phase 'start', GDD §4.11): three pacts from renderBoonText; the one from the safe
 * list is tagged SAFE. A pact's follow-up choice (remove 2 cards, pick a rare...) arrives as a
 * PendingChoice and is handled by RunScreen.
 */
import { getBoonDef } from '../../../content/index.ts';
import { renderBoonText, type GameEvent } from '../../../engine/index.ts';
import type { App } from '../../app.ts';
import { rect, W } from '../../layout.ts';
import { Label } from '../../ui/Label.ts';
import { Panel } from '../../ui/Panel.ts';
import { Z, type Widget } from '../../ui/Widget.ts';
import { RunScreen } from '../RunScreen.ts';
import type { RunSession } from '../session.ts';
import { ChoiceRow } from '../widgets.ts';
import { C } from '../../palette.ts';
import { fonts } from '../../fonts.ts';

export class PactScreen extends RunScreen {
  private rows: Widget[] = [];
  constructor(app: App, session: RunSession) { super(app, session, 'pact', 'title_spire'); }

  protected build(): void {
    this.bg.setDim(1);
    const panel = this.add(new Panel(rect(100, 50, W - 200, 170), { title: 'ASCENT PACT' }));
    panel.setZ(Z.PANEL);
    panel.addChild(new Label(W / 2, 72, 'BEFORE THE CLIMB, SEAL ONE PACT.', { align: 'center', font: fonts.small, color: C.textMuted }), 2);
    this.rows = [];
    let y = 86;
    const choices = this.state.startChoices;
    if (!choices) throw new Error('PactScreen: phase start without startChoices');
    choices.forEach((b, i) => {
      const def = getBoonDef(b.id);
      const text = renderBoonText(b.id, this.state);
      const tag = def.list === 'safe' ? '[lime]SAFE[/]' : '[amber]TRADE[/]';
      const h = Math.max(36, ChoiceRow.heightFor(text, W - 232, { tag: true }));
      const row = panel.addChild(new ChoiceRow(rect(116, y, W - 232, h), { text, tag }), 3);
      row.list = { key: 'pacts', index: i, axis: 'y', wrap: true };
      row.onActivate = () => {
        const a = this.session.findOrNull('choose_start_boon', (x) => x.index === i);
        if (!a) throw new Error(`pact ${i} not legal`);
        this.act(a);
      };
      this.rows.push(row);
      y += h + 6;
    });
    panel.resize(W - 200, Math.max(80, y - 50 + 8));
    this.scope.add(panel);
    const first = this.rows[0];
    if (first) this.focus.focus(first);
  }

  protected refresh(_events: readonly GameEvent[]): void { /* the next phase routes away */ }
}
