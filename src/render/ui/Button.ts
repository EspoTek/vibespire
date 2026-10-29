/**
 * Button: a small PS box with centred text. Focus = yellow text + the focus ring; disabled = dim.
 */
import { fonts } from '../fonts.ts';
import { rect, type Rect } from '../layout.ts';
import { C } from '../palette.ts';
import { Text, type BitmapFont } from '../text.ts';
import { Panel } from './Panel.ts';
import { Widget } from './Widget.ts';

export interface ButtonOptions {
  font?: BitmapFont;
  onActivate?: (b: Button) => void;
  /** Optional hint shown by tooltips / announced to screen readers. */
  hint?: string;
}

export class Button extends Widget {
  private readonly box: Panel;
  private readonly caption: Text;
  hint: string;

  /** `r.w`/`r.h` of 0 = size to the caption (8x8 font: 16px tall). */
  constructor(r: Rect, text: string, opts: ButtonOptions = {}) {
    const font = opts.font ?? fonts.ui;
    const cap = new Text(font, text);
    const w = r.w > 0 ? r.w : cap.width + 16; // cap is kept as the caption mesh below
    const h = r.h > 0 ? r.h : font.data.cellH + 8;
    super(rect(r.x, r.y, w, h), 'btn');
    this.focusable = true;
    this.label = text;
    this.hint = opts.hint ?? '';
    if (opts.onActivate) { const f = opts.onActivate; this.onActivate = () => f(this); }
    this.box = this.addChild(new Panel(rect(r.x, r.y, w, h)));
    this.caption = this.addPart(cap, 2);
    this.layoutCaption();
  }

  setText(text: string): void {
    this.caption.setText(text);
    this.label = text;
    this.layoutCaption();
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    this.box.setColors(C.boxBg, on ? C.border : C.textDim);
    this.refreshColor();
  }

  private layoutCaption(): void {
    const { w, h } = this.rect;
    this.caption.place(Math.floor((w - this.caption.width) / 2), Math.floor((h - this.caption.height) / 2));
  }

  private refreshColor(): void {
    this.caption.setColor(!this.enabled ? C.textDim : this.focused ? C.textHi : C.text);
  }

  protected override renderFocus(_on: boolean): void { this.refreshColor(); }
}
