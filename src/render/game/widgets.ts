/**
 * Small composite widgets for run screens.
 */
import { fonts } from '../fonts.ts';
import { rect, type Rect } from '../layout.ts';
import { C } from '../palette.ts';
import { Icon } from '../ui/Icon.ts';
import { Label } from '../ui/Label.ts';
import { Panel } from '../ui/Panel.ts';
import { Widget } from '../ui/Widget.ts';
import type { Atlas } from '../gfx.ts';
import { PixelBuffer } from '../pixels.ts';
import { CARD_COLORS, type CardKind } from '../ui/art.ts';
import { Picture } from '../ui/Picture.ts';

export interface ChoiceRowOptions {
  /** Body text (markup). */
  text: string;
  /** Small tag at the top-right, e.g. "SAFE" (markup). */
  tag?: string;
  /** Disabled reason; the row stays focusable (to read why) but activation is refused. */
  reason?: string | null;
  icon?: { atlas: Atlas; frame: string };
  /** Icon centred at the top with the text below it (narrow shop boxes); default: icon at the left. */
  iconTop?: boolean;
  font?: 'ui' | 'small';
  /** Integer scale of the icon (boss relics: 2). */
  iconScale?: 1 | 2;
}

/** A focusable PS box with wrapped text: pacts, rest options, event options, shop services. */
export class ChoiceRow extends Widget {
  private readonly panel: Panel;
  private readonly body: Label;
  readonly disabledReason: string | null;

  constructor(r: Rect, opts: ChoiceRowOptions) {
    super(r, 'choice');
    this.focusable = true;
    this.disabledReason = opts.reason ?? null;
    this.panel = this.addChild(new Panel(rect(r.x, r.y, r.w, r.h)), 0);
    const sc = opts.iconScale ?? 1;
    const raw = opts.icon ? opts.icon.atlas.frame(opts.icon.frame) : null;
    const iconF = raw ? { w: raw.w * sc, h: raw.h * sc } : null;
    const top = opts.iconTop === true && iconF !== null;
    const ix = iconF && !top ? r.x + 12 + iconF.w : top ? r.x + 5 : r.x + 8;
    if (opts.icon && iconF) {
      const at = top ? { x: r.x + Math.floor((r.w - iconF.w) / 2), y: r.y + 4 } : { x: r.x + 7, y: r.y + Math.floor((r.h - iconF.h) / 2) };
      this.addChild(new Icon(at.x, at.y, opts.icon.atlas, opts.icon.frame, sc), 2);
    }
    const font = opts.font === 'small' ? fonts.small : fonts.ui;
    this.body = this.addChild(new Label(ix, top && iconF ? r.y + 7 + iconF.h : r.y + 6, opts.text, {
      font, markup: true, maxWidth: r.x + r.w - (top ? 5 : 8) - ix - (opts.tag ? 40 : 0), lineHeight: opts.font === 'small' ? 8 : 10,
      color: this.disabledReason ? C.textDim : C.text,
    }), 2);
    if (opts.tag) this.addChild(new Label(r.x + r.w - 8, r.y + 5, opts.tag, { font: fonts.small, align: 'right', markup: true }), 2);
    if (this.disabledReason) this.addChild(new Label(ix, r.y + r.h - 11, this.disabledReason, { font: fonts.small, color: C.pink, maxWidth: r.w - 16 }), 2);
    const plain = opts.text.replace(/\[[^\]]*\]/g, '');
    this.label = this.disabledReason ? `${plain.replace(/\.\s*$/, '')}. Unavailable: ${this.disabledReason}` : plain;
    this.keywordText = opts.text; // InfoLayer boxes the glossary terms the row uses
  }

  /** Height needed for `text` in a row of width `w`. */
  static heightFor(text: string, w: number, opts: { tag?: boolean; reason?: boolean; icon?: boolean; small?: boolean } = {}): number {
    const probe = new Label(0, 0, text, {
      font: opts.small ? fonts.small : fonts.ui, markup: true, maxWidth: w - 16 - (opts.icon ? 20 : 0) - (opts.tag ? 40 : 0), lineHeight: opts.small ? 8 : 10,
    });
    const h = probe.rect.h;
    probe.dispose();
    return h + 14 + (opts.reason ? 10 : 0);
  }

  protected override renderFocus(on: boolean): void {
    this.panel.setColors(C.boxBg, on ? C.textHi : C.border);
  }
}

/**
 * A deck-strip tile for the run summary: the card's 32x24 art (or its type-hatched placeholder),
 * border in the card type's trim colour, and its marks along the bottom: "+" upgraded, "✿N" Bloom,
 * "×N" copies. Focusable so the name can be read (label / tooltip).
 */
export class DeckTile extends Widget {
  static readonly W = 36;
  static readonly H = 36;
  private readonly frame: Panel;
  private readonly trim: number;

  constructor(x: number, y: number, art: { atlas: Atlas; frame: string } | PixelBuffer, kind: CardKind, marks: { upgraded: boolean; bloom: number; count: number }, name: string) {
    super(rect(x, y, DeckTile.W, DeckTile.H), 'decktile');
    this.focusable = true;
    this.activateSound = false;
    this.trim = CARD_COLORS[kind].trim;
    this.frame = this.addChild(new Panel(rect(x, y, DeckTile.W, DeckTile.H), { fill: C.black, border: this.trim, thickness: 1 }), 0);
    if (art instanceof PixelBuffer) this.addChild(new Picture(x + 2, y + 2, art), 1);
    else this.addChild(new Icon(x + 2, y + 2, art.atlas, art.frame), 1);
    const text = `${marks.upgraded ? '[lime]+[/]' : ''}${marks.bloom > 0 ? `[lime]✿${marks.bloom}[/]` : ''}`;
    if (text) this.addChild(new Label(x + 3, y + 28, text, { font: fonts.small, markup: true }), 2);
    if (marks.count > 1) this.addChild(new Label(x + DeckTile.W - 3, y + 28, `×${marks.count}`, { font: fonts.small, align: 'right', color: C.textHi }), 2);
    this.label = `${name}${marks.upgraded ? ' (upgraded)' : ''}${marks.bloom > 0 ? `, Bloom ${marks.bloom}` : ''}${marks.count > 1 ? `, ${marks.count} copies` : ''}`;
  }

  protected override renderFocus(on: boolean): void {
    this.frame.setColors(C.black, on ? C.textHi : this.trim);
  }
}
