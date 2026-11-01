/**
 * Deck view overlay: tabs (Deck / Draw / Discard / Scrapheap / Timeline, or whatever the caller
 * passes), a scrolling grid of card frames with Bloom leaves and upgrade marks, a type filter, and
 * a CardDetail for the focused card. In pick mode it is the card picker for Smith / Purge /
 * Transmute / shop removal and for engine `cards` choices: non-selectable cards are dimmed,
 * selected ones get a gold border, CONFIRM is enabled only when the count is within min..max.
 *
 * Grid navigation is by index (left/right ±1, up/down ±cols) so scrolled-out rows stay reachable;
 * leaving the grid upward goes to the tab bar spatially.
 */
import type { CardInstance, CardOffer, RunState } from '../../engine/index.ts';
import type { App } from '../app.ts';
import type { Dir } from '../focusNav.ts';
import { fonts } from '../fonts.ts';
import { H, rect, W } from '../layout.ts';
import { C } from '../palette.ts';
import type { Screen } from '../screens/Screen.ts';
import { Button } from '../ui/Button.ts';
import { CardFrame } from '../ui/CardFrame.ts';
import { Label } from '../ui/Label.ts';
import { Panel } from '../ui/Panel.ts';
import { Widget, Z } from '../ui/Widget.ts';
import { CardDetail, UpgradeCompare, UpgradeToggle } from './overlays.ts';
import { cardFace } from './view.ts';
import { getCardDef } from '../../content/index.ts';

export type ViewCard = CardInstance | CardOffer;

export interface DeckTab { id: string; title: string; cards: readonly ViewCard[]; note?: string }

export interface DeckPick {
  min: number;
  max: number;
  /** null = selectable; a string = why not (shown in the detail panel). */
  reason: (card: ViewCard, index: number) => string | null;
  confirmLabel: string;
  /** Selected indices into the tab's card list, in list order. */
  onConfirm: (indices: number[]) => void;
  /** Can the player back out without choosing (cancel/close)? */
  cancellable: boolean;
}

export interface DeckViewOptions {
  title: string;
  tabs: readonly DeckTab[];
  initialTab?: string;
  state: RunState | null;
  pick?: DeckPick;
  onClose?: () => void;
  /**
   * Smith picker: the focused card is shown before → after (UpgradeCompare) instead of the plain
   * detail, and there is no VIEW UPGRADE toggle (the comparison already shows it).
   */
  compareUpgrade?: boolean;
}

const COLS = 6;
const CELL_W = 70;
const CELL_H = 94;
const ROWS_VISIBLE = 3;
const GRID_X = 18;
const GRID_Y = 62;

type Filter = 'all' | 'attack' | 'skill' | 'power' | 'other';
const FILTERS: readonly Filter[] = ['all', 'attack', 'skill', 'power', 'other'];

function matches(f: Filter, card: ViewCard): boolean {
  if (f === 'all') return true;
  const t = getCardDef(card.id, card.upgraded).type;
  return f === 'other' ? t === 'status' || t === 'curse' : t === f;
}

export function openDeckView(screen: Screen, app: App, opts: DeckViewOptions): () => void {
  let tabId = opts.initialTab ?? (opts.tabs[0] as DeckTab).id;
  let filter: Filter = 'all';
  let first = 0;
  const selected = new Set<number>();
  let gridWidgets: CardFrame[] = [];
  let indexMap: number[] = []; // grid position -> index in tab.cards
  let panel: Panel;
  let detail: CardDetail;
  let compare: UpgradeCompare | null = null;
  let upgradeView = false;
  let countLabel: Label;
  let confirmBtn: Button | null = null;
  let emptyLabel: Label;

  const tab = (): DeckTab => {
    const t = opts.tabs.find((x) => x.id === tabId);
    if (!t) throw new Error(`deckView: no tab ${tabId}`);
    return t;
  };

  const layoutGrid = () => {
    gridWidgets.forEach((cw, i) => {
      const row = Math.floor(i / COLS) - first;
      const on = row >= 0 && row < ROWS_VISIBLE;
      cw.visible = on;
      if (on) cw.moveTo(GRID_X + (i % COLS) * CELL_W, GRID_Y + row * CELL_H);
    });
  };

  const refreshPickUi = () => {
    if (!opts.pick) return;
    gridWidgets.forEach((cw, i) => cw.setBeat(selected.has(indexMap[i] as number)));
    const n = selected.size;
    countLabel.setText(`SELECTED ${n} (${opts.pick.min === opts.pick.max ? opts.pick.min : `${opts.pick.min}-${opts.pick.max}`})`);
    confirmBtn?.setEnabled(n >= opts.pick.min && n <= opts.pick.max);
    // a "you may" choice (Prune...): confirming with nothing selected is the "no" answer
    confirmBtn?.setText(n === 0 && opts.pick.min === 0 ? 'SKIP' : opts.pick.confirmLabel);
  };

  const showDetail = (cw: CardFrame, idx: number) => {
    const card = tab().cards[idx] as ViewCard;
    const reason = opts.pick ? opts.pick.reason(card, idx) : null;
    // keyword boxes keep clear of the card and of the bottom row (count, CONFIRM / CLOSE)
    const avoid = [cw.ringRect(), rect(0, H - 46, W, 46)];
    if (compare) { compare.show(card, reason, avoid); return; }
    detail.show(cw.cardFace, reason ? `[pink]${reason}[/]` : '', avoid);
  };

  let rebuild = (): void => { /* assigned below once the panel exists */ };

  const nav = (cw: CardFrame, dir: Dir): boolean => {
    const i = gridWidgets.indexOf(cw);
    if (i < 0) throw new Error('deckView: nav from a card not in the grid');
    const step = dir === 'left' ? -1 : dir === 'right' ? 1 : dir === 'up' ? -COLS : COLS;
    const j = i + step;
    if ((dir === 'left' || dir === 'right') && Math.floor(j / COLS) !== Math.floor(i / COLS)) return false;
    if (j < 0) return false; // up out of the grid: let spatial nav reach the tabs
    if (j >= gridWidgets.length) {
      if (dir === 'down' && Math.floor(i / COLS) < Math.floor((gridWidgets.length - 1) / COLS)) {
        const last = gridWidgets[gridWidgets.length - 1] as CardFrame;
        ensureRow(gridWidgets.length - 1);
        screen.focus.focus(last, { sound: true });
        return true;
      }
      return false;
    }
    ensureRow(j);
    screen.focus.focus(gridWidgets[j] as CardFrame, { sound: true });
    return true;
  };

  const ensureRow = (i: number) => {
    const row = Math.floor(i / COLS);
    if (row < first) first = row;
    else if (row >= first + ROWS_VISIBLE) first = row - ROWS_VISIBLE + 1;
    else return;
    layoutGrid();
  };

  const close = screen.openModal(`deck:${opts.title}`, (closeModal) => {
    panel = new Panel(rect(6, 6, W - 12, H - 12), { title: opts.title });
    panel.setZ(Z.MODAL);
    detail = new CardDetail(GRID_X + COLS * CELL_W + 6, GRID_Y, W - 12 - (GRID_X + COLS * CELL_W + 6) - 4);
    panel.addChild(detail, 40);
    if (opts.compareUpgrade) {
      compare = panel.addChild(new UpgradeCompare(app, GRID_X + COLS * CELL_W + 6, GRID_Y, W - 12 - (GRID_X + COLS * CELL_W + 6) - 4), 40);
    } else {
      // VIEW UPGRADE (STS checkbox): every card in the grid shown upgraded, changed numbers green
      panel.addChild(new UpgradeToggle(app, screen, GRID_X, H - 30, (on) => {
        upgradeView = on;
        gridWidgets.forEach((cw, i) => {
          const card = tab().cards[indexMap[i] as number] as ViewCard;
          cw.setFace(cardFace(app, card, { state: opts.state, upgradePreview: on }), indexMap[i] as number);
          if (cw.focused) showDetail(cw, indexMap[i] as number);
        });
      }), 2);
    }
    emptyLabel = panel.addChild(new Label(GRID_X + 8, GRID_Y + 30, 'NO CARDS HERE.', { color: C.textMuted }), 3);
    let tx = 14;
    for (const t of opts.tabs) {
      const b = panel.addChild(new Button(rect(tx, 26, 0, 0), `${t.title} ${t.cards.length}`, { onActivate: () => { tabId = t.id; first = 0; selected.clear(); rebuild(); } }), 2);
      b.list = { key: 'deck-tabs', index: opts.tabs.indexOf(t), axis: 'x', wrap: false };
      tx += b.rect.w + 4;
    }
    panel.addChild(new Button(rect(tx + 6, 26, 92, 0), 'TYPE: ALL', {
      onActivate: (b) => {
        filter = FILTERS[(FILTERS.indexOf(filter) + 1) % FILTERS.length] as Filter;
        b.setText(`TYPE: ${filter.toUpperCase()}`);
        first = 0;
        rebuild();
      },
    }), 2);
    countLabel = panel.addChild(new Label(W - 20, H - 40, '', { font: fonts.small, align: 'right', color: C.textMuted }), 2);
    if (opts.pick) {
      const pick = opts.pick;
      confirmBtn = panel.addChild(new Button(rect(W - 110, H - 30, 92, 0), pick.confirmLabel, {
        onActivate: () => {
          const indices = [...selected].sort((a, b) => a - b);
          if (indices.length < pick.min || indices.length > pick.max) return;
          closeModal();
          pick.onConfirm(indices);
        },
      }), 2);
      if (pick.cancellable) panel.addChild(new Button(rect(W - 210, H - 30, 92, 0), 'CANCEL', { onActivate: closeModal }), 2);
    } else {
      panel.addChild(new Button(rect(W - 110, H - 30, 92, 0), 'CLOSE', { onActivate: closeModal }), 2);
    }
    return [panel];
  }, opts.pick ? undefined : opts.onClose, opts.pick ? opts.pick.cancellable : true);

  rebuild = () => {
    const scopeNow = screen.focus.top;
    for (const cw of gridWidgets) { scopeNow.remove(cw); cw.dispose(); }
    gridWidgets = [];
    indexMap = [];
    const t = tab();
    t.cards.forEach((card, idx) => {
      if (!matches(filter, card)) return;
      const cw = new CardFrame(0, 0, cardFace(app, card, { state: opts.state, upgradePreview: upgradeView }), idx);
      cw.liftOnFocus = false;
      const reason = opts.pick ? opts.pick.reason(card, idx) : null;
      cw.setDimmed(opts.pick !== undefined && reason !== null);
      cw.handleNav = (dir: Dir) => nav(cw, dir);
      cw.onFocus = () => { ensureRow(gridWidgets.indexOf(cw)); showDetail(cw, idx); };
      cw.activateSound = false;
      cw.onActivate = () => {
        const pick = opts.pick;
        if (!pick) return;
        if (pick.reason(card, idx) !== null) { app.sfx.play('cancel'); return; }
        app.sfx.play('confirm');
        if (pick.max === 1 && pick.min === 1) {
          selected.clear();
          selected.add(idx);
          refreshPickUi();
          return;
        }
        if (selected.has(idx)) selected.delete(idx);
        else if (selected.size < pick.max) selected.add(idx);
        else { app.sfx.play('cancel'); return; }
        refreshPickUi();
      };
      cw.handleWheel = (n: number) => { scroll(n); return true; };
      panel.addChild(cw, 10);
      gridWidgets.push(cw);
      indexMap.push(idx);
    });
    emptyLabel.visible = gridWidgets.length === 0;
    emptyLabel.setText(t.note ?? 'NO CARDS HERE.');
    detail.hide();
    compare?.hide();
    layoutGrid();
    scopeNow.add(panel);
    refreshPickUi();
    const firstCard = gridWidgets[0];
    if (firstCard) screen.focus.focus(firstCard);
    else screen.focus.ensureFocus();
  };

  const scroll = (n: number) => {
    const maxFirst = Math.max(0, Math.ceil(gridWidgets.length / COLS) - ROWS_VISIBLE);
    const f = Math.max(0, Math.min(maxFirst, first + n));
    if (f !== first) { first = f; layoutGrid(); }
  };

  rebuild();
  return close;
}

/** Tooltip-free helper: a Widget list → its CardFrames (tests / screens). */
export function cardFramesIn(ws: readonly Widget[]): CardFrame[] { return ws.filter((w): w is CardFrame => w instanceof CardFrame); }
