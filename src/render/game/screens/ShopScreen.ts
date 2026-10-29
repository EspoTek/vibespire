/**
 * Shop (GDD §4.6) on the shop_interior backdrop: the card shelf (5 class + 2 colourless, price
 * tags, sale marker), relic and potion shelves, the removal service with both prices (gold, or
 * 1 Shard + gold; each enabled per legalActions), and LEAVE. Focusing an item shows its detail.
 */
import { getPotionDef, getRelicDef } from '../../../content/index.ts';
import { renderPotionText, renderRelicText, type GameEvent, type ShopItem } from '../../../engine/index.ts';
import type { App } from '../../app.ts';
import { fonts } from '../../fonts.ts';
import { rect, W } from '../../layout.ts';
import { C } from '../../palette.ts';
import { Button } from '../../ui/Button.ts';
import { CardFrame } from '../../ui/CardFrame.ts';
import { Label } from '../../ui/Label.ts';
import { Panel } from '../../ui/Panel.ts';
import { Tooltip } from '../../ui/Tooltip.ts';
import { Z, type Widget } from '../../ui/Widget.ts';
import { openDeckView } from '../deckView.ts';
import { CardDetail } from '../overlays.ts';
import { RunScreen } from '../RunScreen.ts';
import type { RunSession } from '../session.ts';
import { cardFace, itemIcon } from '../view.ts';
import { ChoiceRow } from '../widgets.ts';

export class ShopScreen extends RunScreen {
  private content: Widget[] = [];
  private detail!: CardDetail;
  private tip!: Tooltip;

  constructor(app: App, session: RunSession) { super(app, session, 'shop', 'shop_interior'); }

  protected build(): void { this.draw(); }

  /** Price under an item; `sale` only exists on shelf cards (relics and potions are never on sale). */
  private priceLabel(it: ShopItem<string>, sale: boolean, x: number, y: number, parent: Widget): void {
    const afford = this.state.player.gold >= it.price;
    const text = it.sold ? 'SOLD' : `${sale ? 'SALE ' : ''}${it.price} GOLD`;
    const color = it.sold ? C.textDim : !afford ? C.red : sale ? C.lime : C.yellow;
    parent.addChild(new Label(x, y, text, { font: fonts.small, align: 'center', color, outline: C.black }), 4);
  }

  private draw(): void {
    for (const w of this.content) { this.scope.remove(w); this.removeWidget(w); }
    this.content = [];
    const sh = this.state.shop;
    if (!sh) throw new Error('ShopScreen: no shop state');
    const shelf = this.add(new Panel(rect(14, 40, W - 28, 116), { title: 'CARDS' }));
    shelf.setZ(Z.PANEL);
    this.content.push(shelf);
    this.detail = this.add(new CardDetail(W - 214, 160, 200));
    this.content.push(this.detail);
    this.tip = this.add(new Tooltip({ maxWidth: 170 }));
    this.content.push(this.tip);
    const n = sh.cards.length;
    const x0 = Math.floor((W - (n * 70 - 6)) / 2);
    sh.cards.forEach((it, i) => {
      const a = this.session.findOrNull('shop_buy', (x) => x.kind === 'card' && x.index === i);
      const cw = shelf.addChild(new CardFrame(x0 + i * 70, 56, cardFace(this.app, { id: it.id, upgraded: it.upgraded }, { state: this.state }), i), 5);
      cw.liftOnFocus = false;
      cw.list = { key: 'shop-cards', index: i, axis: 'x', wrap: false };
      cw.setDimmed(it.sold || a === null);
      cw.onFocus = () => this.detail.show(cw.cardFace, it.sold ? '[grey]SOLD[/]' : `[yellow]${it.price} GOLD[/]${it.sale ? '  [lime]SALE[/]' : ''}`);
      cw.onBlur = () => this.detail.hide();
      cw.onActivate = () => this.buy(a, it.sold);
      this.priceLabel(it, it.sale, x0 + i * 70 + 32, 146, shelf);
    });
    const goods = this.add(new Panel(rect(14, 160, W - 238, 92), { title: 'RELICS & POTIONS' }));
    goods.setZ(Z.PANEL);
    this.content.push(goods);
    const boxW = 60; // six boxes (3 relics + 3 potions) fit the shelf
    const items: { kind: 'relic' | 'potion'; it: ShopItem<string>; index: number }[] = [
      ...sh.relics.map((it, index) => ({ kind: 'relic' as const, it, index })),
      ...sh.potions.map((it, index) => ({ kind: 'potion' as const, it, index })),
    ];
    items.forEach(({ kind, it, index }, k) => {
      const name = kind === 'relic' ? getRelicDef(it.id).name : getPotionDef(it.id).name;
      const text = kind === 'relic' ? renderRelicText(it.id, this.state) : renderPotionText(it.id, this.state);
      const a = this.session.findOrNull('shop_buy', (x) => x.kind === kind && x.index === index);
      const bx = 22 + k * (boxW + 4);
      const row = goods.addChild(new ChoiceRow(rect(bx, 179, boxW, 51), {
        text: `${name.toUpperCase()}`, font: 'small', icon: itemIcon(this.app, kind, it.id), iconTop: true,
        reason: it.sold ? 'SOLD' : a ? null : this.state.player.gold < it.price ? 'NO GOLD' : 'BELT FULL',
      }), 3);
      row.list = { key: 'shop-goods', index: k, axis: 'x', wrap: false };
      row.onFocus = () => this.tip.show(row.rect, `[${kind === 'relic' ? 'cyan' : 'magenta'}]${name.toUpperCase()}[/]\n${text}\n[yellow]${it.price} GOLD[/]`, 'above');
      row.onBlur = () => this.tip.hide();
      row.onActivate = () => this.buy(a, it.sold);
      this.priceLabel(it, false, bx + boxW / 2, 233, goods);
    });
    // removal service: both prices, each enabled per legalActions
    const svc = this.add(new Panel(rect(14, 256, W - 238, 56), { title: 'CARD REMOVAL' }));
    svc.setZ(Z.PANEL);
    this.content.push(svc);
    const goldRemovals = this.session.legalOf('shop_remove').filter((x) => x.pay === 'gold');
    const shardRemovals = this.session.legalOf('shop_remove').filter((x) => x.pay === 'shard');
    const used = sh.removeUsed;
    svc.addChild(new Label(26, 280, used ? 'ALREADY USED THIS VISIT.' : 'REMOVE ONE CARD FROM YOUR DECK:', { font: fonts.small, color: used ? C.textDim : C.text }), 2);
    svc.addChild(new Button(rect(26, 290, 120, 0), `${sh.removePrice} GOLD`, { onActivate: () => this.removal('gold') }), 3).setEnabled(goldRemovals.length > 0);
    svc.addChild(new Button(rect(152, 290, 150, 0), `1 ◆ + ${sh.removeShardGold} GOLD`, { onActivate: () => this.removal('shard') }), 3).setEnabled(shardRemovals.length > 0);
    const leave = this.session.findOrNull('proceed');
    const lb = this.add(new Button(rect(W - 110, 322, 96, 0), 'LEAVE', { onActivate: () => { if (leave) this.act(leave); } }));
    lb.setZ(Z.PANEL);
    this.content.push(lb);
    this.scope.add(shelf, goods, svc, lb);
  }

  private buy(a: import('../../../engine/index.ts').Action | null, sold: boolean): void {
    if (!a) { this.app.sfx.play('cancel'); this.app.toasts.show(sold ? 'SOLD OUT' : 'CANNOT BUY THAT'); return; }
    this.act(a);
  }

  private removal(pay: 'gold' | 'shard'): void {
    const legal = this.session.legalOf('shop_remove').filter((x) => x.pay === pay);
    if (legal.length === 0) { this.app.sfx.play('cancel'); return; }
    const deck = this.state.player.deck;
    openDeckView(this, this.app, {
      title: pay === 'gold' ? 'REMOVE A CARD (GOLD)' : 'REMOVE A CARD (SHARD)',
      tabs: [{ id: 'deck', title: 'DECK', cards: deck }],
      state: this.state,
      pick: {
        min: 1, max: 1, confirmLabel: 'REMOVE', cancellable: true,
        reason: (card) => ('uid' in card && legal.some((x) => x.uid === card.uid) ? null : 'Cannot be removed here.'),
        onConfirm: ([i]) => {
          const card = deck[i ?? -1];
          if (!card) throw new Error('shop removal: no card picked');
          const a = legal.find((x) => x.uid === card.uid);
          if (!a) throw new Error(`shop removal: ${card.uid} not legal`);
          this.act(a);
        },
      },
    });
  }

  protected refresh(_e: readonly GameEvent[]): void { this.app.sfx.play('confirm'); this.draw(); }
}
