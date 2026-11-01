/**
 * KeywordBoxes: STS-style glossary boxes (src/content/keywords.ts) stacked in a column beside an
 * anchor (an inspected card, a tooltip, a detail panel). Each box is a small PS panel: the keyword
 * name in yellow, then its rules text with live rule numbers (engine renderKeywordText) in the 4x6
 * font. The column never covers the anchor or the `avoid` rects when any side fits, and it always
 * stays on screen: when one column is too tall it flows into a second.
 */
import { getKeyword, keywordsForText } from '../../content/index.ts';
import { renderKeywordText } from '../../engine/text.ts';
import { fonts } from '../fonts.ts';
import { H, placeTooltip, rect, W, type Rect, type Side } from '../layout.ts';
import { C } from '../palette.ts';
import { Label } from './Label.ts';
import { Panel } from './Panel.ts';
import { Widget, Z } from './Widget.ts';

export const KEYWORD_BOX_W = 124;
const PAD = 5;
const GAP = 2;
/** More boxes than this would bury the screen; the Compendium glossary lists the rest. */
export const MAX_KEYWORD_BOXES = 6;

/** Markup → plain text (for keyword scanning). */
export function plainText(markup: string): string {
  return markup.replace(/\[\[/g, '\u0001').replace(/\[[^\]]*\]/g, '').replace(/\u0001/g, '[');
}

/** Keyword ids named by a markup text, minus `exclude`. */
export function keywordIdsInMarkup(markup: string, exclude: readonly string[] = []): string[] {
  return keywordsForText(plainText(markup)).filter((id) => !exclude.includes(id));
}

class KeywordBox extends Widget {
  constructor(x: number, y: number, w: number, id: string) {
    const k = getKeyword(id);
    const title = new Label(0, 0, k.name.toUpperCase(), { font: fonts.small, color: C.yellow });
    const body = new Label(0, 0, renderKeywordText(id), { font: fonts.small, maxWidth: w - PAD * 2, lineHeight: 7, color: C.text });
    const h = PAD + 7 + body.rect.h + PAD;
    super(rect(x, y, w, h), 'kw');
    this.addChild(new Panel(rect(x, y, w, h), { fill: C.boxBg, border: C.steel, thickness: 1 }), 0);
    title.moveTo(x + PAD, y + PAD - 1);
    body.moveTo(x + PAD, y + PAD + 7);
    this.addChild(title, 2);
    this.addChild(body, 2);
    this.label = `${k.name}: ${renderKeywordText(id)}`;
  }
}

export class KeywordBoxes extends Widget {
  private boxes: KeywordBox[] = [];
  private key = '';
  readonly boxW: number;
  /** Screen rect covered by the boxes while shown. (The widget itself stays at 0,0 so child rects are absolute.) */
  bounds: Rect = rect(0, 0, 0, 0);

  constructor(boxW = KEYWORD_BOX_W) {
    super(rect(0, 0, 1, 1), 'kwboxes');
    this.boxW = boxW;
    this.setZ(Z.TOOLTIP + 20);
    this.visible = false;
  }

  /** The ids currently shown (tests, screen-reader text). */
  get shownIds(): string[] { return this.key === '' ? [] : this.key.split('|')[1]?.split(',') ?? []; }

  /**
   * Show boxes for `ids` beside `anchor`, preferring `side`, never over `anchor` or `avoid` while a
   * clear side exists. An empty list hides the boxes.
   */
  show(ids: readonly string[], anchor: Rect, side: Side = 'right', avoid: readonly Rect[] = [], maxHeight: number = H - 4): void {
    const list = [...new Set(ids)].slice(0, MAX_KEYWORD_BOXES);
    if (list.length === 0) { this.hide(); return; }
    const key = `${maxHeight}|${list.join(',')}|${anchor.x},${anchor.y},${anchor.w},${anchor.h}|${side}|${avoid.map((r) => `${r.x},${r.y},${r.w},${r.h}`).join(';')}`;
    if (key === this.key && this.visible) return;
    this.key = key;
    for (const b of this.boxes) b.dispose();
    this.boxes = list.map((id) => this.addChild(new KeywordBox(0, 0, this.boxW, id), 0));
    // one column if it fits the screen height, else two (then three) side by side
    const maxH = Math.min(H - 4, maxHeight); // taller: flow into side-by-side columns
    let cols: KeywordBox[][] = [];
    for (let n = 1; n <= 3; n++) {
      cols = [];
      let col: KeywordBox[] = [];
      let h = 0;
      const target = Math.ceil(this.boxes.reduce((a, b) => a + b.rect.h + GAP, 0) / n);
      for (const b of this.boxes) {
        if (col.length > 0 && h + b.rect.h > Math.max(target, 1) + GAP && cols.length < n - 1) { cols.push(col); col = []; h = 0; }
        col.push(b);
        h += b.rect.h + GAP;
      }
      cols.push(col);
      if (cols.every((c) => c.reduce((a, b) => a + b.rect.h + GAP, -GAP) <= maxH)) break;
    }
    const colH = Math.max(...cols.map((c) => c.reduce((a, b) => a + b.rect.h + GAP, -GAP)));
    const w = cols.length * this.boxW + (cols.length - 1) * GAP;
    const p = placeTooltip(anchor, { w, h: Math.min(colH, maxH) }, side, rect(0, 0, W, H), 2, 2, [anchor, ...avoid]);
    this.bounds = { x: p.x, y: p.y, w, h: colH };
    cols.forEach((c, ci) => {
      let y = p.y;
      for (const b of c) { b.moveTo(p.x + ci * (this.boxW + GAP), y); y += b.rect.h + GAP; }
    });
    this.setZ(this.z);
    this.label = this.boxes.map((b) => b.label).join(' ');
    this.visible = true;
  }

  hide(): void {
    this.visible = false;
    this.key = '';
  }
}
