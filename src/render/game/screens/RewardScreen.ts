/**
 * Reward (after a won combat): a PS dialog listing gold (auto-collected with a counter tick), the
 * card reward (3 frames + "SKIP +1 ◆"; focus shows the full card detail; Bloom cards show their 0
 * leaf), the potion (take; with full slots the engine raises a swap choice), the relic (elites),
 * then PROCEED. Everything enabled comes from legalActions.
 */
import { getCardDef, getPotionDef, getRelicDef } from '../../../content/index.ts';
import { renderPotionText, renderRelicText, skipRewardShards, type GameEvent } from '../../../engine/index.ts';
import type { App } from '../../app.ts';
import { logCue } from '../../fx/cue.ts';
import { Juice } from '../../fx/juice.ts';
import { actBackdrop } from '../../assets.ts';
import { fonts } from '../../fonts.ts';
import { rect, W } from '../../layout.ts';
import { C } from '../../palette.ts';
import { Button } from '../../ui/Button.ts';
import { CardFrame } from '../../ui/CardFrame.ts';
import { Label } from '../../ui/Label.ts';
import { Panel } from '../../ui/Panel.ts';
import { Z, type Widget } from '../../ui/Widget.ts';
import { UpgradeToggle } from '../overlays.ts';
import { potionHint } from '../explain.ts';
import { CARD } from '../../ui/art.ts';
import { KEYWORD_BOX_W, KeywordBoxes } from '../../ui/KeywordBoxes.ts';
import { RunScreen } from '../RunScreen.ts';
import type { RunSession } from '../session.ts';
import { cardFace, itemIcon } from '../view.ts';
import { ChoiceRow } from '../widgets.ts';

/** Offer layout: 2x cards (128x176) from x 56, 140 px apart. */
const REWARD = { cardX: 56, step: 140 } as const;

export class RewardScreen extends RunScreen {
  private content: Widget[] = [];
  /** VIEW UPGRADE: the offered cards shown upgraded. */
  private upgradeView = false;

  /** The card offers as drawn (the reveal animates these). */
  private offerFrames: CardFrame[] = [];
  private readonly juice: Juice;

  constructor(app: App, session: RunSession) {
    super(app, session, 'reward', actBackdrop(session.state.act));
    this.juice = new Juice(app, this.root);
  }

  /**
   * Deal the offers in one by one with a sound per rarity; a rare lands on the music's beat with a
   * gold shimmer (bursts of sparkles round the card for a second).
   */
  private revealOffers(): void {
    const r = this.state.reward;
    if (!r || r.cardStatus !== 'pending') return;
    const frames = [...this.offerFrames];
    for (const f of frames) f.visible = false;
    r.cards.forEach((offer, i) => {
      const f = frames[i];
      if (!f) throw new Error(`reward reveal: no frame for offer ${i}`);
      const rarity = getCardDef(offer.id, offer.upgraded).rarity;
      void this.app.tweens.delay(260 + i * 170).then(async () => {
        if (rarity === 'rare') await this.app.tweens.delay(this.juice.playOnBeat('rare'));
        if (!this.offerFrames.includes(f)) return; // redrawn (a pick or skip) before the reveal finished
        f.visible = true;
        const cx = f.rect.x + Math.floor(f.rect.w / 2), cy = f.rect.y + Math.floor(f.rect.h / 2); // the frame's own size (2x offers)
        logCue('reward', `reveal-${rarity}`);
        if (rarity === 'rare') {
          const P = this.juice.particles;
          P.ring(cx, cy, 24 * f.scale, 150, [C.yellow, C.amber, C.white], 'star', 700);
          // an 'item get' light column rising off the card
          for (let y = f.rect.y; y > f.rect.y - 40; y -= 3) P.spawn('px2', cx, y, 0, -30, { g: 0, drag: 1, life: 300 + (f.rect.y - y) * 8, wobble: 0, colors: [C.yellow, C.white] });
          for (let k = 0; k < 10; k++) {
            void this.app.tweens.delay(k * 120).then(() => {
              if (!this.offerFrames.includes(f)) return;
              // sparkles walk the card's border (palette flicker, no blending)
              const side = Math.floor(Math.random() * 4), t = Math.random();
              const x = side < 2 ? f.rect.x + t * f.rect.w : side === 2 ? f.rect.x - 2 : f.rect.x + f.rect.w + 2;
              const y = side === 0 ? f.rect.y - 2 : side === 1 ? f.rect.y + f.rect.h + 2 : f.rect.y + t * f.rect.h;
              P.burst(x, y, { n: 2, colors: [C.yellow, C.white, C.amber], shapes: ['star', 'plus'], speed: [4, 16], life: [300, 480], flicker: true });
            });
          }
        } else {
          this.app.sfx.play(rarity === 'uncommon' ? 'uncommon' : 'common');
          this.juice.particles.burst(cx, cy, { n: rarity === 'uncommon' ? 10 : 5, colors: rarity === 'uncommon' ? [C.skyBlue, C.white] : [C.white, C.grey], shapes: ['px1', 'plus'], speed: [30, 80], life: [200, 380] });
        }
      });
    });
  }

  protected build(): void {
    this.bg.setDim(1);
    this.draw();
    const gold = this.session.findOrNull('pick_reward', (a) => a.kind === 'gold');
    if (gold) {
      const from = this.state.player.gold;
      this.act(gold);
      this.hud?.tickGold(from, this.state.player.gold); // coin ticks
    }
    this.revealOffers();
  }

  private draw(): void {
    for (const w of this.content) { this.scope.remove(w); this.removeWidget(w); }
    this.content = [];
    const r = this.state.reward;
    if (!r) throw new Error('RewardScreen: no reward state');
    const title = r.kind === 'boss' ? 'BOSS DEFEATED' : r.kind === 'elite' ? 'ELITE DEFEATED' : 'VICTORY';
    // Layout (640x360): the offers at 2x (STS size) on the left, a side column (SKIP, VIEW UPGRADE,
    // the focused offer's keyword boxes) on the right, potion / relic rows side by side below.
    const panel = this.add(new Panel(rect(40, 38, W - 80, 314), { title }));
    panel.setZ(Z.PANEL);
    this.content.push(panel);
    const goldText = r.gold === null ? '' : r.goldTaken ? `[yellow]+${r.gold} GOLD[/] COLLECTED` : `[yellow]${r.gold} GOLD[/]`;
    // the engine's number (skipShards modifiers: Ascendant Prism makes it 0), never TUNING's base (BUG-3)
    const skipShards = skipRewardShards(this.state);
    let y = 58;
    const offering = r.cardStatus === 'pending' && r.cards.length > 0;
    const head = offering ? `CHOOSE A CARD${goldText ? `    ${goldText}` : ''}`
      : r.cardStatus === 'picked' ? `[lime]CARD ADDED TO YOUR DECK.[/]${goldText ? `    ${goldText}` : ''}`
      : r.cardStatus === 'skipped' ? `[magenta]CARD SKIPPED: +${skipShards} ◆[/]${goldText ? `    ${goldText}` : ''}`
      : goldText;
    if (head) panel.addChild(new Label(56, y, head, { markup: true, color: C.textHi }), 2);
    y += 16;
    if (offering) {
      const side = REWARD.cardX + 3 * REWARD.step - (REWARD.step - CARD.W * 2) + 8; // right column x
      const kw = panel.addChild(new KeywordBoxes(), 30);
      const kwTop = y + 44; // under SKIP and VIEW UPGRADE
      const showKw = (cw: CardFrame) => kw.show(cw.cardFace.keywords ?? [], rect(side, kwTop, KEYWORD_BOX_W, 1), 'below', [cw.ringRect()]);
      const frames: CardFrame[] = [];
      r.cards.forEach((offer, i) => {
        const a = this.session.findOrNull('pick_reward', (x) => x.kind === 'card' && x.index === i);
        const cw = panel.addChild(new CardFrame(REWARD.cardX + i * REWARD.step, y, cardFace(this.app, offer, { state: this.state, upgradePreview: this.upgradeView }), i, 2), 5);
        cw.liftOnFocus = false; // at 2x the focus ring says it; a lift would cover the header
        cw.list = { key: 'reward-cards', index: i, axis: 'x', wrap: false };
        cw.onFocus = () => showKw(cw);
        cw.onBlur = () => kw.hide();
        cw.onActivate = () => { if (a) this.act(a); };
        cw.setDimmed(a === null);
        frames.push(cw);
      });
      this.offerFrames = frames;
      const skip = this.session.findOrNull('skip_reward');
      const sb = panel.addChild(new Button(rect(side, y, KEYWORD_BOX_W, 0), `SKIP +${skipShards} ◆`, {
        onActivate: () => { if (skip) this.act(skip); }, hint: `Take no card: gain ${skipShards} Shard${skipShards === 1 ? '' : 's'}.`,
      }), 5);
      sb.setEnabled(skip !== null);
      sb.list = { key: 'reward-side', index: 0, axis: 'y', wrap: false };
      // VIEW UPGRADE (STS checkbox): the offers as they would be upgraded, changed numbers green
      const tg = panel.addChild(new UpgradeToggle(this.app, this, side, y + 22, (on) => {
        this.upgradeView = on;
        r.cards.forEach((offer, i) => {
          const cw = frames[i];
          if (!cw) throw new Error(`reward: no frame for offer ${i}`);
          cw.setFace(cardFace(this.app, offer, { state: this.state, upgradePreview: on }), i);
          if (cw.focused) showKw(cw);
        });
      }, this.upgradeView), 5);
      tg.list = { key: 'reward-side', index: 1, axis: 'y', wrap: false };
      y += CARD.H * 2 + 6;
    }
    // potion and relic (elites) side by side under the offers
    const rowW = 250;
    let rx = 56;
    if (r.potion !== null && !r.potionTaken) {
      const def = getPotionDef(r.potion);
      const a = this.session.findOrNull('pick_reward', (x) => x.kind === 'potion');
      const text = `[magenta]POTION: ${def.name.toUpperCase()}[/]\n${renderPotionText(r.potion, this.state)}`;
      const row = panel.addChild(new ChoiceRow(rect(rx, y, rowW, 34), { text, font: 'small', icon: itemIcon(this.app, 'potion', r.potion), reason: a ? null : 'Potion belt full.' }), 3);
      row.hint = potionHint(r.potion, this.state, false);
      row.onActivate = () => { if (a) this.act(a); else this.app.sfx.play('cancel'); };
      rx += rowW + 8;
    }
    if (r.relic !== null && !r.relicTaken) {
      const def = getRelicDef(r.relic);
      const a = this.session.findOrNull('pick_reward', (x) => x.kind === 'relic');
      const text = `[cyan]RELIC: ${def.name.toUpperCase()}[/]\n${renderRelicText(r.relic, this.state)}`;
      const row = panel.addChild(new ChoiceRow(rect(rx, y, rowW, 34), { text, font: 'small', icon: itemIcon(this.app, 'relic', r.relic), reason: a ? null : 'Not available.' }), 3);
      row.onActivate = () => { if (a) this.act(a); };
    }
    const proceed = this.session.findOrNull('proceed');
    const skipNote = offering ? ` (SKIP +${skipShards} ◆)` : '';
    panel.addChild(new Button(rect(W / 2 - 80, 316, 160, 0), `PROCEED${skipNote}`, { onActivate: () => { if (proceed) this.act(proceed); } }), 3).setEnabled(proceed !== null);
    panel.addChild(new Label(56, 338, 'PROCEEDING WITHOUT A CARD COUNTS AS A SKIP.', { font: fonts.small, color: C.textMuted }), 2).visible = skipNote !== '';
    this.scope.add(panel);
  }

  protected refresh(_e: readonly GameEvent[]): void { this.draw(); }
}
