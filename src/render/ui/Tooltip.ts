/**
 * Tooltip: a small PS box with wrapped text, placed next to an anchor rect and kept fully on
 * screen (layout.placeTooltip). Not focusable; drawn on the TOOLTIP z band.
 */
import { fonts } from '../fonts.ts';
import { placeTooltip, rect, type Rect, type Side } from '../layout.ts';
import { C } from '../palette.ts';
import { Text, type BitmapFont } from '../text.ts';
import { Panel } from './Panel.ts';
import { Widget, Z } from './Widget.ts';

export interface TooltipOptions {
  font?: BitmapFont;
  /** Max text width in px before wrapping. */
  maxWidth?: number;
}

const PAD = 6;

export class Tooltip extends Widget {
  private readonly panel: Panel;
  private readonly body: Text;
  private readonly maxWidth: number;

  constructor(opts: TooltipOptions = {}) {
    super(rect(0, 0, 16, 16), 'tip');
    this.maxWidth = opts.maxWidth ?? 160;
    this.panel = this.addChild(new Panel(rect(0, 0, 16, 16)), 0);
    this.body = this.addPart(new Text(opts.font ?? fonts.small, '', { color: C.text, maxWidth: this.maxWidth, markup: true }), 2);
    this.body.place(PAD, PAD);
    this.setZ(Z.TOOLTIP);
    this.visible = false;
  }

  /** Show `text` (markup allowed) beside `anchor`, preferring `side`. */
  show(anchor: Rect, text: string, side: Side = 'above'): void {
    this.body.setText(text);
    const w = Math.min(this.maxWidth, this.body.width) + PAD * 2;
    const h = this.body.height + PAD * 2;
    this.panel.resize(w, h);
    this.rect = { ...this.rect, w, h };
    const p = placeTooltip(anchor, { w, h }, side);
    this.moveTo(p.x, p.y);
    this.label = text;
    this.visible = true;
  }

  hide(): void { this.visible = false; }
}
