/**
 * ListMenu: the PS command box (ATTK / MAGC / ITEM / TALK / RUN). A Panel with one row per item
 * and a ▶ cursor glyph on the focused row (rows don't use the focus ring). Rows are focusable
 * widgets in a wrapping vertical list, so up/down go by list order and left/right leave the menu
 * spatially. With more items than `visibleRows`, the window scrolls with focus and the wheel, and
 * ▲/▼ markers show there is more.
 */
import { fonts } from '../fonts.ts';
import { rect, type Rect } from '../layout.ts';
import { C } from '../palette.ts';
import { Text, type BitmapFont } from '../text.ts';
import { measureLine } from '../textLayout.ts';
import { Panel, PANEL_TITLE_H } from './Panel.ts';
import { Widget } from './Widget.ts';

export interface ListMenuItem {
  label: string;
  enabled?: boolean;
  /** Shown in a tooltip / help line by the owning screen. */
  hint?: string;
  onActivate?: () => void;
}

export interface ListMenuOptions {
  title?: string;
  /** Panel width; default fits the longest label. */
  w?: number;
  visibleRows?: number;
  rowH?: number;
  font?: BitmapFont;
  wrap?: boolean;
  /** Called whenever a row gains focus. */
  onHighlight?: (index: number, item: ListMenuItem) => void;
}

const PAD_X = 6;
const CURSOR_W = 12;

export class ListRow extends Widget {
  readonly index: number;
  readonly item: ListMenuItem;
  private readonly text: Text;
  private readonly cursor: Text;

  constructor(r: Rect, index: number, item: ListMenuItem, font: BitmapFont, listKey: string, wrap: boolean) {
    super(r, 'row');
    this.index = index;
    this.item = item;
    this.focusable = true;
    this.showRing = false;
    this.enabled = item.enabled ?? true;
    this.label = item.label + (this.enabled ? '' : ' (unavailable)');
    this.list = { key: listKey, index, axis: 'y', wrap };
    this.cursor = this.addPart(new Text(fonts.ui, '▶', { color: C.text }), 3);
    this.cursor.place(0, Math.floor((r.h - 8) / 2));
    this.cursor.visible = false;
    this.text = this.addPart(new Text(font, item.label, { color: this.enabled ? C.text : C.textDim }), 2);
    this.text.place(CURSOR_W, Math.floor((r.h - font.data.cellH) / 2));
    if (item.onActivate) { const f = item.onActivate; this.onActivate = () => f(); }
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    this.text.setColor(on ? (this.focused ? C.textHi : C.text) : C.textDim);
  }

  protected override renderFocus(on: boolean): void {
    this.cursor.visible = on;
    this.text.setColor(!this.enabled ? C.textDim : on ? C.textHi : C.text);
  }
}

export class ListMenu extends Widget {
  readonly panel: Panel;
  readonly rows: ListRow[] = [];
  private readonly visibleRows: number;
  private readonly rowH: number;
  private first = 0;
  private readonly upMark: Text;
  private readonly downMark: Text;
  private readonly bodyTop: number;

  constructor(x: number, y: number, items: readonly ListMenuItem[], opts: ListMenuOptions = {}) {
    if (items.length === 0) throw new Error('ListMenu: no items');
    const font = opts.font ?? fonts.ui;
    const rowH = opts.rowH ?? 12;
    const visible = Math.min(opts.visibleRows ?? items.length, items.length);
    const longest = Math.max(...items.map((it) => measureLine(font.data, it.label)));
    const titleW = opts.title !== undefined ? measureLine(fonts.ui.data, opts.title) + 16 : 0;
    const scrolls = visible < items.length;
    const w = opts.w ?? Math.max(titleW, PAD_X * 2 + CURSOR_W + longest + 8 + (scrolls ? 10 : 0)); // room for ▲/▼
    const titleH = opts.title !== undefined ? PANEL_TITLE_H + 2 : 0;
    const h = 2 + 4 + titleH + visible * rowH + 4 + 2;
    super(rect(x, y, w, h), 'menu');
    this.visibleRows = visible;
    this.rowH = rowH;
    this.bodyTop = y + 6 + titleH;
    this.label = opts.title ?? '';
    this.panel = this.addChild(new Panel(rect(x, y, w, h), opts.title !== undefined ? { title: opts.title } : {}), 0);
    const wrap = opts.wrap ?? true;
    items.forEach((item, i) => {
      const row = this.addChild(new ListRow(rect(x + PAD_X, this.bodyTop + i * rowH, w - 2 * PAD_X, rowH), i, item, font, this.id, wrap), 1);
      row.onFocus = () => { this.ensureVisible(i); opts.onHighlight?.(i, item); };
      this.rows.push(row);
    });
    this.upMark = this.addPart(new Text(fonts.ui, '▲', { color: C.text }), 4);
    this.downMark = this.addPart(new Text(fonts.ui, '▼', { color: C.text }), 4);
    this.upMark.place(w - 12, titleH + 4);
    this.downMark.place(w - 12, h - 12);
    this.layoutRows();
  }

  row(i: number): ListRow {
    const r = this.rows[i];
    if (!r) throw new Error(`ListMenu: no row ${i} (have ${this.rows.length})`);
    return r;
  }

  private ensureVisible(i: number): void {
    if (i < this.first) this.first = i;
    else if (i >= this.first + this.visibleRows) this.first = i - this.visibleRows + 1;
    else return;
    this.layoutRows();
  }

  private layoutRows(): void {
    this.rows.forEach((row, i) => {
      const slot = i - this.first;
      const on = slot >= 0 && slot < this.visibleRows;
      row.visible = on;
      if (on) row.moveTo(row.rect.x, this.bodyTop + slot * this.rowH);
    });
    this.upMark.visible = this.first > 0;
    this.downMark.visible = this.first + this.visibleRows < this.rows.length;
  }

  override handleWheel(n: number): boolean {
    const max = this.rows.length - this.visibleRows;
    if (max <= 0) return false;
    const f = Math.max(0, Math.min(max, this.first + n));
    if (f === this.first) return true;
    this.first = f;
    this.layoutRows();
    return true;
  }
}
