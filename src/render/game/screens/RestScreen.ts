/**
 * Rest site (GDD §4.7) on rest_site.png: REST, SMITH and the extra options (Purge, Transmute,
 * relic options) with their text and availability reasons. Smith / Purge / Transmute open the deck
 * picker (Purge/Transmute pickers come from the engine as PendingChoices; the Transmute 1-of-2
 * offer is an 'offers' choice). After the rest action: PROCEED.
 */
import { allRestOptions } from '../../../content/index.ts';
import { effectTextValues, renderTemplate, restOptionAvailable, restOptionFor, restOptionShardCost, TUNING, type GameEvent, type RestOptionDef } from '../../../engine/index.ts';
import type { App } from '../../app.ts';
import { rect, W } from '../../layout.ts';
import { C } from '../../palette.ts';
import { Button } from '../../ui/Button.ts';
import { Label } from '../../ui/Label.ts';
import { Panel } from '../../ui/Panel.ts';
import { Z, type Widget } from '../../ui/Widget.ts';
import { openDeckView } from '../deckView.ts';
import { RunScreen } from '../RunScreen.ts';
import type { RunSession } from '../session.ts';
import { ChoiceRow } from '../widgets.ts';
import { shardsOf } from '../view.ts';
import { fonts } from '../../fonts.ts';

function optionText(def: RestOptionDef): string {
  return renderTemplate(def.text, effectTextValues(null, def.effects, def.values));
}

export class RestScreen extends RunScreen {
  private content: Widget[] = [];
  constructor(app: App, session: RunSession) { super(app, session, 'rest', 'rest_site'); }

  protected build(): void { this.draw(); this.tips.offer('rest'); }

  private draw(): void {
    for (const w of this.content) { this.scope.remove(w); this.removeWidget(w); }
    this.content = [];
    const r = this.state.rest;
    if (!r) throw new Error('RestScreen: no rest state');
    const panel = this.add(new Panel(rect(W / 2 - 170, 50, 340, 290), { title: 'REST SITE' }));
    panel.setZ(Z.PANEL);
    this.content.push(panel);
    const p = this.state.player;
    const heal = Math.floor((p.maxHp * TUNING.restHealPct) / 100);
    // rest/smith are engine actions; if content registers rest_rest / rest_smith defs, use their text
    const reg = new Map(allRestOptions().map((d) => [d.id, d]));
    const restDef = reg.get('rest_rest');
    const smithDef = reg.get('rest_smith');
    const rows: { text: string; reason: string | null; run: () => void }[] = [];
    const restA = this.session.findOrNull('rest');
    rows.push({
      text: `[lime]REST[/]  ${restDef ? optionText(restDef) : `Heal ${TUNING.restHealPct}% of Max HP.`} [grey](+${Math.min(heal, p.maxHp - p.hp)} HP)[/]`,
      reason: r.done ? 'Already rested.' : restA ? null : 'Not available.',
      run: () => { if (restA) this.act(restA); },
    });
    const smiths = this.session.legalOf('smith');
    rows.push({
      text: `[amber]SMITH[/]  ${smithDef ? optionText(smithDef) : 'Upgrade a card in your deck.'}`,
      reason: r.done ? 'Already rested.' : smiths.length ? null : 'No card can be upgraded.',
      run: () => this.smith(),
    });
    r.specials.forEach((id, index) => {
      const { def } = restOptionFor(this.state, id);
      const a = this.session.findOrNull('rest_special', (x) => x.index === index);
      const avail = restOptionAvailable(this.state, index); // true, or the engine's reason
      const shards = restOptionShardCost(this.state, def);
      const cost = shards > 0 ? `  [magenta]${shards} ◆[/]` : '';
      rows.push({
        text: `[cyan]${def.label.toUpperCase()}[/]${cost}  ${optionText(def)}`,
        reason: a ? null : avail === true ? (r.done ? 'Already rested.' : 'Not available.') : avail,
        run: () => { if (a) this.act(a); },
      });
    });
    let y = 72;
    rows.forEach((row, i) => {
      const h = Math.max(30, ChoiceRow.heightFor(row.text, 308, { reason: row.reason !== null, small: true }));
      const w = panel.addChild(new ChoiceRow(rect(W / 2 - 154, y, 308, h), { text: row.text, reason: row.reason, font: 'small' }), 3);
      w.list = { key: 'rest', index: i, axis: 'y', wrap: false }; // Down past the last row reaches PROCEED
      w.onActivate = () => { if (row.reason) { this.app.sfx.play('cancel'); return; } row.run(); };
      y += h + 4;
    });
    panel.addChild(new Label(W / 2, y + 4, `HP ${p.hp}/${p.maxHp}   SHARDS ${shardsOf(this.state)}`, { font: fonts.small, align: 'center', color: C.textMuted }), 2);
    const proceed = this.session.findOrNull('proceed');
    const pb = panel.addChild(new Button(rect(W / 2 - 50, 314, 100, 0), 'PROCEED', { onActivate: () => { if (proceed) this.act(proceed); } }), 3);
    pb.setEnabled(proceed !== null);
    this.scope.add(panel);
    if (r.done && proceed) this.focus.focus(pb); // rested: the only thing left is to leave
  }

  private smith(): void {
    const legal = this.session.legalOf('smith');
    const deck = this.state.player.deck;
    openDeckView(this, this.app, {
      title: 'SMITH: UPGRADE A CARD',
      tabs: [{ id: 'deck', title: 'DECK', cards: deck }],
      state: this.state,
      compareUpgrade: true,
      pick: {
        min: 1, max: 1, confirmLabel: 'UPGRADE', cancellable: true,
        reason: (card) => ('uid' in card && legal.some((x) => x.uid === card.uid) ? null : 'Already upgraded or cannot be upgraded.'),
        onConfirm: ([i]) => {
          const card = deck[i ?? -1];
          if (!card) throw new Error('smith: nothing picked');
          const a = legal.find((x) => x.uid === card.uid);
          if (!a) throw new Error(`smith: ${card.uid} not legal`);
          this.act(a);
          this.app.sfx.play('block');
        },
      },
    });
  }

  protected refresh(_e: readonly GameEvent[]): void { this.draw(); }
}
