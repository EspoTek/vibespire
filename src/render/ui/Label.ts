/**
 * Label: non-focusable text widget anchored at (x, y). `x` is the left edge, the centre or the
 * right edge depending on `align` (or the left of the `maxWidth` box when wrapping). `rect` is kept
 * equal to the ink box so layout code can measure it.
 */
import { fonts } from '../fonts.ts';
import { rect } from '../layout.ts';
import { Text, type BitmapFont, type TextStyle } from '../text.ts';
import { Widget } from './Widget.ts';

export interface LabelOptions extends TextStyle {
  font?: BitmapFont;
}

export class Label extends Widget {
  readonly text: Text;
  /** anchor x minus rect.x: invariant when the widget (or an ancestor) moves. */
  private anchorDx = 0;

  constructor(x: number, y: number, text: string, opts: LabelOptions = {}) {
    super(rect(Math.round(x), Math.round(y), 1, 1), 'label');
    const { font, ...style } = opts;
    this.text = this.addPart(new Text(font ?? fonts.ui, text, style), 1);
    this.label = text;
    this.fit();
  }

  setText(s: string): this {
    this.text.setText(s);
    this.label = s;
    this.fit();
    return this;
  }

  setColor(c: number): this { this.text.setColor(c); return this; }
  setStyle(st: TextStyle): this { this.text.setStyle(st); this.fit(); return this; }

  private fit(): void {
    const st = this.text.style;
    const scale = st.scale ?? 1;
    const anchorX = this.rect.x + this.anchorDx;
    const x = st.maxWidth !== undefined ? anchorX : anchorX + this.text.layout.left * scale;
    const w = st.maxWidth ?? Math.max(1, this.text.width);
    this.rect = { ...this.rect, x, w, h: Math.max(1, this.text.height) };
    this.anchorDx = anchorX - x;
    this.text.position.set(this.anchorDx, 0, 0); // mesh origin stays at the anchor
    this.syncNode();
  }
}
