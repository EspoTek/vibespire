/**
 * InfoLayer: the "tell me before I act" layer every screen shares. While a widget is focused or
 * hovered (mouse hover moves focus, so keyboard, pad and mouse all get the same info), it shows the
 * widget's `hint` in a Tooltip and STS-style glossary boxes (KeywordBoxes) for every keyword term
 * in its `hint` and `keywordText`. Cards are inspected by their screen's CardDetail instead.
 */
import { KEYWORDS, keywordTerms } from '../../content/index.ts';
import { type Rect, type Side } from '../layout.ts';
import type { Screen } from '../screens/Screen.ts';
import { KeywordBoxes, keywordIdsInMarkup, plainText } from './KeywordBoxes.ts';
import { Tooltip } from './Tooltip.ts';
import type { Widget } from './Widget.ts';

export interface InfoOptions {
  /** Tooltip side (default: below for widgets in the top third of the screen, else above). */
  side?: Side;
  /** Rects neither the tooltip nor the boxes may cover (neighbouring enemies, the hand...). */
  avoid?: readonly Rect[];
  /** Keyword ids not to box (e.g. already explained by the tooltip's own title). */
  exclude?: readonly string[];
  /** Place beside this rect instead of the widget's own (e.g. the whole panel a row sits in). */
  anchor?: Rect;
  /** Keyword boxes taller than this flow into side-by-side columns (default: the screen height). */
  maxHeight?: number;
}

export class InfoLayer {
  readonly tip: Tooltip;
  readonly keywords: KeywordBoxes;
  private key = '';

  constructor(screen: Screen, maxWidth = 180) {
    this.tip = screen.add(new Tooltip({ maxWidth }));
    this.keywords = screen.add(new KeywordBoxes());
  }

  /** Call every frame with the inspected widget (null hides). Cheap when nothing changed. */
  update(w: Widget | null, opts: InfoOptions = {}): void {
    const r = w?.ringRect();
    const key = w && r && w.visible && (w.hint || w.keywordText)
      ? `${w.id}|${w.hint}|${w.keywordText}|${r.x},${r.y},${r.w},${r.h}|${opts.side ?? ''}|${(opts.avoid ?? []).map((a) => `${a.x},${a.y},${a.w},${a.h}`).join(';')}`
      : '';
    if (key === this.key) return;
    this.key = key;
    this.tip.hide();
    this.keywords.hide();
    if (!w || !r || key === '') return;
    this.show(opts.anchor ?? r, w.hint, w.keywordText, opts);
  }

  /** Show a tooltip `hint` (may be '') beside `anchor`, plus boxes for the keywords in hint + keywordText. */
  show(anchor: Rect, hint: string, keywordText: string, opts: InfoOptions = {}): void {
    const side = opts.side ?? (anchor.y < 120 ? 'below' : 'above');
    const avoid = opts.avoid ?? [];
    // a keyword the tooltip's title already names ("ONSLAUGHT 3", "BLOCK 5  GUARD 8") is explained by the tooltip itself
    const title = plainText(hint).split('\n')[0]?.toUpperCase() ?? '';
    const words = ` ${title.replace(/[^A-Z0-9' ]+/g, ' ')} `;
    const titled = KEYWORDS.filter((k) => keywordTerms(k).some((t) => words.includes(` ${t.toUpperCase()} `))).map((k) => k.id);
    const ids = keywordIdsInMarkup(`${hint}\n${keywordText}`, [...(opts.exclude ?? []), ...titled]);
    if (hint) {
      this.tip.show(anchor, hint, side, avoid);
      const tr = this.tip.rect;
      const kwSide: Side = tr.x + tr.w + 130 <= 640 ? 'right' : 'left';
      this.keywords.show(ids, tr, kwSide, [anchor, ...avoid], opts.maxHeight);
    } else {
      // no tooltip: boxes beside the widget (the given side; under a wide row; else the side with more room)
      this.keywords.show(ids, anchor, opts.side ?? (anchor.w > 240 ? 'below' : anchor.x + anchor.w / 2 < 320 ? 'right' : 'left'), avoid, opts.maxHeight);
    }
  }

  hide(): void {
    this.key = '';
    this.tip.hide();
    this.keywords.hide();
  }
}
