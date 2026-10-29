/**
 * TopBar: the HUD on every non-combat run screen (and the relic/potion strips in combat).
 * Portrait, class name, HP, gold, Shards (prism), potion belt, relic strip (each with a tooltip on
 * focus), floor/act, DECK and pause buttons. `refresh()` re-reads the run state.
 */
import { getClassDef, getPotionDef, getRelicDef } from '../../content/index.ts';
import { renderPotionText, renderRelicText, type RunState } from '../../engine/index.ts';
import type { App } from '../app.ts';
import { fonts } from '../fonts.ts';
import { rect, W, type Rect } from '../layout.ts';
import { C } from '../palette.ts';
import { PixelBuffer } from '../pixels.ts';
import { Button } from '../ui/Button.ts';
import { Icon } from '../ui/Icon.ts';
import { Label } from '../ui/Label.ts';
import { Panel } from '../ui/Panel.ts';
import { Picture } from '../ui/Picture.ts';
import { Widget, Z } from '../ui/Widget.ts';
import { itemIcon, portraitOrNull, shardsOf } from './view.ts';
import type { Atlas } from '../gfx.ts';

export const TOPBAR_H = 36;

/** A focusable 12x12 icon with a tooltip text (relics, potions, statuses). */
export class HintIcon extends Icon {
  hint = '';
  /** A UI-sheet icon by frame name, or any atlas frame ({atlas, frame}). */
  constructor(x: number, y: number, app: App, frame: string | { atlas: Atlas; frame: string }) {
    super(x, y, typeof frame === 'string' ? app.icons : frame.atlas, typeof frame === 'string' ? frame : frame.frame, 1);
    this.focusable = true;
    this.activateSound = false;
  }
}

/** Placeholder portrait for classes without art: a framed initial. */
export function placeholderPortrait(name: string, size: number): PixelBuffer {
  const p = new PixelBuffer(size, size);
  p.roundBox(0, 0, size, size, C.navy, C.border, 2);
  return p;
}

export interface TopBarHandlers {
  onDeck: () => void;
  onPause: () => void;
  onPotion: (index: number) => void;
}

export class TopBar extends Widget {
  private readonly app: App;
  private readonly handlers: TopBarHandlers;
  private readonly nameLabel: Label;
  private readonly hpLabel: Label;
  private readonly goldLabel: Label;
  private readonly shardLabel: Label;
  private readonly shardIcon: Icon;
  private readonly floorLabel: Label;
  private strip: Widget[] = [];
  readonly deckButton: Button;
  readonly pauseButton: Button;
  /** Widgets the screen should register for focus (rebuilt on refresh; see `focusables`). */
  private readonly fixed: Widget[];

  constructor(app: App, state: RunState, handlers: TopBarHandlers) {
    super(rect(0, 0, W, TOPBAR_H), 'topbar');
    this.app = app;
    this.handlers = handlers;
    this.addChild(new Panel(rect(0, 0, W, TOPBAR_H)), 0);
    const portrait = portraitOrNull(app, state.classId, true);
    if (portrait) this.addChild(new Icon(2, 2, portrait, portrait.names()[0] as string), 1);
    else this.addChild(new Picture(2, 2, placeholderPortrait(state.classId, 32)), 1);
    this.nameLabel = this.addChild(new Label(38, 5, '', { color: C.text }), 2);
    this.addChild(new Icon(38, 19, app.icons, 'heart'), 2);
    this.hpLabel = this.addChild(new Label(52, 21, '', { font: fonts.small, color: C.pink }), 2);
    this.addChild(new Icon(96, 19, app.icons, 'coin'), 2);
    this.goldLabel = this.addChild(new Label(110, 21, '', { font: fonts.small, color: C.yellow }), 2);
    this.shardIcon = this.addChild(new Icon(136, 19, app.icons, 'shard'), 2);
    this.shardLabel = this.addChild(new Label(150, 21, '', { font: fonts.small, color: C.magenta }), 2);
    this.floorLabel = this.addChild(new Label(W - 108, 5, '', { font: fonts.small, color: C.textMuted, align: 'right' }), 2);
    this.deckButton = this.addChild(new Button(rect(W - 104, 14, 52, 18), 'DECK', { onActivate: () => this.handlers.onDeck(), hint: 'Your run deck (V).' }), 2);
    this.deckButton.label = 'Deck';
    this.pauseButton = this.addChild(new Button(rect(W - 48, 14, 44, 18), 'MENU', { onActivate: () => this.handlers.onPause(), hint: 'Pause menu (M / Start).' }), 2);
    this.fixed = [this.deckButton, this.pauseButton];
    this.setZ(Z.PANEL);
    this.refresh(state);
  }

  /** Rebuild every number and the potion/relic strips from `state`. */
  refresh(state: RunState): void {
    const p = state.player;
    this.nameLabel.setText(getClassDef(state.classId).name.toUpperCase());
    this.hpLabel.setText(`${p.hp}/${p.maxHp}`);
    this.goldLabel.setText(String(p.gold));
    const shards = shardsOf(state);
    this.shardLabel.setText(String(shards));
    this.floorLabel.setText(`ACT ${state.act}  FLOOR ${state.floor}`);
    this.label = `${getClassDef(state.classId).name}. HP ${p.hp} of ${p.maxHp}. ${p.gold} gold. ${shards} shards.`;
    for (const w of this.strip) w.dispose();
    this.strip = [];
    let x = 176;
    for (let i = 0; i < p.potionSlots; i++) {
      const id = p.potions[i];
      const icon = this.addChild(new HintIcon(x, id === undefined ? 19 : 17, this.app, id === undefined ? 'potion_empty' : itemIcon(this.app, 'potion', id)), 3);
      if (id === undefined) {
        icon.focusable = false;
      } else {
        const def = getPotionDef(id);
        icon.hint = `[yellow]${def.name.toUpperCase()}[/]\n${renderPotionText(id, state)}${def.combatOnly ? '\n[grey](combat only)[/]' : ''}`;
        icon.label = `${def.name}: ${renderPotionText(id, state)}`;
        icon.onActivate = () => this.handlers.onPotion(i);
      }
      this.strip.push(icon);
      x += 17;
    }
    x += 6;
    for (const r of p.relics) {
      if (x > W - 124) break; // strip full: the deck view lists every relic
      const def = getRelicDef(r.id);
      const icon = this.addChild(new HintIcon(x, 17, this.app, itemIcon(this.app, 'relic', r.id)), 3);
      const counter = def.counterMax !== undefined ? `\n[grey]counter ${r.counter}/${def.counterMax}[/]` : '';
      icon.hint = `[cyan]${def.name.toUpperCase()}[/]\n${renderRelicText(r.id, state)}${counter}`;
      icon.label = `${def.name}: ${renderRelicText(r.id, state)}`;
      this.strip.push(icon);
      x += 18;
    }
    this.setZ(this.z);
  }

  /** Count the gold label up from `from` to the current value (reward auto-collect tick). */
  tickGold(from: number, to: number): void {
    const o = { v: from };
    void this.app.tweens.to(o, { v: to }, Math.min(600, 40 * Math.abs(to - from)));
    this.app.tweens.every(() => {
      this.goldLabel.setText(String(Math.round(o.v)));
      if (Math.round(o.v) === to) { this.app.sfx.play('move'); return false; }
      return true;
    });
  }

  /** Focusable widgets of the bar (call after refresh: the strips are rebuilt). */
  focusables(): Widget[] { return [...this.strip.filter((w) => w.focusable), ...this.fixed]; }

  relicIconRect(index: number): Rect | null {
    const relics = this.strip.filter((w) => w instanceof HintIcon && (w as HintIcon).hint.startsWith('[cyan]'));
    const w = relics[index];
    return w ? w.rect : null;
  }
}
