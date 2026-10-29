/**
 * Reward (after a won combat): a PS dialog listing gold (auto-collected with a counter tick), the
 * card reward (3 frames + "SKIP +1 ◆"; focus shows the full card detail; Bloom cards show their 0
 * leaf), the potion (take; with full slots the engine raises a swap choice), the relic (elites),
 * then PROCEED. Everything enabled comes from legalActions.
 */
import { getPotionDef, getRelicDef } from '../../../content/index.ts';
import { renderPotionText, renderRelicText, TUNING, type GameEvent } from '../../../engine/index.ts';
import type { App } from '../../app.ts';
import { actBackdrop } from '../../assets.ts';
import { fonts } from '../../fonts.ts';
import { rect, W } from '../../layout.ts';
import { C } from '../../palette.ts';
import { Button } from '../../ui/Button.ts';
import { CardFrame } from '../../ui/CardFrame.ts';
import { Label } from '../../ui/Label.ts';
import { Panel } from '../../ui/Panel.ts';
import { Z, type Widget } from '../../ui/Widget.ts';
import { CardDetail } from '../overlays.ts';
import { RunScreen } from '../RunScreen.ts';
import type { RunSession } from '../session.ts';
import { cardFace, itemIcon } from '../view.ts';
import { ChoiceRow } from '../widgets.ts';

export class RewardScreen extends RunScreen {
  private content: Widget[] = [];

  constructor(app: App, session: RunSession) { super(app, session, 'reward', actBackdrop(session.state.act)); }

  protected build(): void {
    this.bg.setDim(1);
    this.draw();
    const gold = this.session.findOrNull('pick_reward', (a) => a.kind === 'gold');
    if (gold) {
      const from = this.state.player.gold;
      this.act(gold);
      this.hud?.tickGold(from, this.state.player.gold);
      this.app.sfx.play('confirm');
    }
  }

  private draw(): void {
    for (const w of this.content) { this.scope.remove(w); this.removeWidget(w); }
    this.content = [];
    const r = this.state.reward;
    if (!r) throw new Error('RewardScreen: no reward state');
    const title = r.kind === 'boss' ? 'BOSS DEFEATED' : r.kind === 'elite' ? 'ELITE DEFEATED' : 'VICTORY';
    const panel = this.add(new Panel(rect(40, 42, W - 80, 308), { title }));
    panel.setZ(Z.PANEL);
    this.content.push(panel);
    let y = 64;
    if (r.gold !== null) {
      panel.addChild(new Label(56, y, r.goldTaken ? `[yellow]+${r.gold} GOLD[/]  COLLECTED` : `[yellow]${r.gold} GOLD[/]`, { markup: true }), 2);
      y += 14;
    }
    const detail = panel.addChild(new CardDetail(W - 80 - 150 + 40 - 6, 92, 150), 30);
    if (r.cardStatus === 'pending' && r.cards.length > 0) {
      panel.addChild(new Label(56, y + 2, 'CHOOSE A CARD', { color: C.textHi }), 2);
      y += 22;
      r.cards.forEach((offer, i) => {
        const a = this.session.findOrNull('pick_reward', (x) => x.kind === 'card' && x.index === i);
        const cw = panel.addChild(new CardFrame(56 + i * 74, y, cardFace(this.app, offer, { state: this.state }), i), 5);
        cw.list = { key: 'reward-cards', index: i, axis: 'x', wrap: false };
        cw.onFocus = () => detail.show(cw.cardFace);
        cw.onBlur = () => detail.hide();
        cw.onActivate = () => { if (a) this.act(a); };
        cw.setDimmed(a === null);
      });
      const skip = this.session.findOrNull('skip_reward');
      panel.addChild(new Button(rect(56 + 3 * 74 + 6, y + 34, 96, 0), `SKIP +${TUNING.shards.skipReward} ◆`, {
        onActivate: () => { if (skip) this.act(skip); }, hint: `Take no card: gain ${TUNING.shards.skipReward} Shard.`,
      }), 5).setEnabled(skip !== null);
      y += 96;
    } else if (r.cardStatus === 'picked') {
      panel.addChild(new Label(56, y, 'CARD ADDED TO YOUR DECK.', { color: C.lime }), 2); y += 14;
    } else if (r.cardStatus === 'skipped') {
      panel.addChild(new Label(56, y, `CARD SKIPPED: +${TUNING.shards.skipReward} ◆`, { color: C.magenta }), 2); y += 14;
    }
    if (r.potion !== null && !r.potionTaken) {
      const def = getPotionDef(r.potion);
      const a = this.session.findOrNull('pick_reward', (x) => x.kind === 'potion');
      const text = `[magenta]POTION: ${def.name.toUpperCase()}[/]\n${renderPotionText(r.potion, this.state)}`;
      const row = panel.addChild(new ChoiceRow(rect(56, y, 300, 32), { text, font: 'small', icon: itemIcon(this.app, 'potion', r.potion), reason: a ? null : 'Potion belt full.' }), 3);
      row.onActivate = () => { if (a) this.act(a); else this.app.sfx.play('cancel'); };
      y += 36;
    }
    if (r.relic !== null && !r.relicTaken) {
      const def = getRelicDef(r.relic);
      const a = this.session.findOrNull('pick_reward', (x) => x.kind === 'relic');
      const text = `[cyan]RELIC: ${def.name.toUpperCase()}[/]\n${renderRelicText(r.relic, this.state)}`;
      const row = panel.addChild(new ChoiceRow(rect(56, y, 300, 32), { text, font: 'small', icon: itemIcon(this.app, 'relic', r.relic), reason: a ? null : 'Not available.' }), 3);
      row.onActivate = () => { if (a) this.act(a); };
      y += 36;
    }
    const proceed = this.session.findOrNull('proceed');
    const skipNote = r.cardStatus === 'pending' && r.cards.length > 0 ? ` (SKIP +${TUNING.shards.skipReward} ◆)` : '';
    panel.addChild(new Button(rect(W / 2 - 80, 322, 160, 0), `PROCEED${skipNote}`, { onActivate: () => { if (proceed) this.act(proceed); } }), 3).setEnabled(proceed !== null);
    panel.addChild(new Label(56, 336, 'PROCEEDING WITHOUT A CARD COUNTS AS A SKIP.', { font: fonts.small, color: C.textMuted }), 2).visible = skipNote !== '';
    this.scope.add(panel);
  }

  protected refresh(_e: readonly GameEvent[]): void { this.draw(); }
}
