/**
 * Compendium (title menu): every card by class and rarity (the deck-view grid, with VIEW UPGRADE
 * and keyword boxes), every relic, every potion, and the keyword glossary. Keyboard, pad and mouse:
 * the section list on the left, the entries in the middle, the full text and its keyword boxes on
 * the right. Everything shown comes from the content tables and the engine's text helpers.
 */
import { allCards, allPotions, allRelics, getKeyword, getPotionDef, getRelicDef, KEYWORDS, keywordsForText, type KeywordDef } from '../../content/index.ts';
import { renderKeywordText, renderPotionText, renderRelicText, type CardOffer } from '../../engine/index.ts';
import type { App } from '../app.ts';
import { openDeckView, type DeckTab } from '../game/deckView.ts';
import { itemIcon } from '../game/view.ts';
import { fonts } from '../fonts.ts';
import { H, rect, W } from '../layout.ts';
import { C } from '../palette.ts';
import type { SongName } from '../music.ts';
import { Backdrop } from '../ui/Backdrop.ts';
import { Icon } from '../ui/Icon.ts';
import { KeywordBoxes } from '../ui/KeywordBoxes.ts';
import { Label } from '../ui/Label.ts';
import { ListMenu, type ListMenuItem } from '../ui/ListMenu.ts';
import { Panel } from '../ui/Panel.ts';
import { Z } from '../ui/Widget.ts';
import type { FocusScope } from '../focus.ts';
import { Screen } from './Screen.ts';

type CardSection = { kind: 'cards'; title: string; cls: string[] };
type Section = CardSection | { kind: 'relics' | 'potions' | 'glossary'; title: string };

const SECTIONS: readonly Section[] = [
  { kind: 'cards', title: 'BREAKER', cls: ['breaker'] },
  { kind: 'cards', title: 'GRAFT', cls: ['graft'] },
  { kind: 'cards', title: 'CHRONIST', cls: ['chronist'] },
  { kind: 'cards', title: 'COLOURLESS', cls: ['colorless'] },
  { kind: 'cards', title: 'CURSE/STATUS', cls: ['curse', 'status'] },
  { kind: 'relics', title: 'RELICS' },
  { kind: 'potions', title: 'POTIONS' },
  { kind: 'glossary', title: 'GLOSSARY' },
];

const RARITY_TABS: readonly { id: string; title: string }[] = [
  { id: 'starter', title: 'STARTER' }, { id: 'common', title: 'COMMON' }, { id: 'uncommon', title: 'UNCOMMON' },
  { id: 'rare', title: 'RARE' }, { id: 'special', title: 'SPECIAL' },
];

const RELIC_ORDER = ['starter', 'common', 'uncommon', 'rare', 'boss', 'shop', 'event'];
const GROUP_ORDER: readonly KeywordDef['group'][] = ['basic', 'breaker', 'graft', 'chronist', 'shared', 'status', 'run'];

interface Entry { label: string; title: string; meta: string; body: string; icon: { atlas: import('../gfx.ts').Atlas; frame: string } | null }

const LIST_X = 120;
const LIST_W = 150;
const DETAIL_X = LIST_X + LIST_W + 6;
const DETAIL_W = W - 8 - DETAIL_X;

export class CompendiumScreen extends Screen {
  override get music(): SongName { return 'title'; }
  private readonly scope: FocusScope;
  private readonly sections: ListMenu;
  private list: ListMenu | null = null;
  private readonly detail: Panel;
  private readonly detailTitle: Label;
  private readonly detailMeta: Label;
  private readonly detailBody: Label;
  private detailIcon: Icon | null = null;
  private readonly keywords: KeywordBoxes;
  private readonly hint: Label;

  constructor(app: App) {
    super(app, 'compendium');
    this.add(new Backdrop(app.assets.backdrops, 'title_spire')).setDim(2);
    const frame = this.add(new Panel(rect(4, 4, W - 8, H - 8), { title: 'COMPENDIUM' }));
    frame.setZ(Z.PANEL - 10);
    this.scope = this.focus.pushScope('compendium', () => { void this.app.screens.pop(); });
    this.sections = this.add(new ListMenu(10, 24, SECTIONS.map((s): ListMenuItem => ({ label: s.title, onActivate: () => this.open(s) })), {
      title: 'BROWSE', w: 106, rowH: 13, font: fonts.small,
      onHighlight: (i) => { const s = SECTIONS[i]; if (s && s.kind !== 'cards') this.open(s, false); },
    }));
    this.sections.setZ(Z.PANEL);
    this.scope.add(this.sections);
    this.detail = this.add(new Panel(rect(DETAIL_X, 24, DETAIL_W, 120)));
    this.detail.setZ(Z.PANEL);
    this.detailTitle = this.detail.addChild(new Label(DETAIL_X + 8, 32, '', { color: C.text, maxWidth: DETAIL_W - 40 }), 2);
    this.detailMeta = this.detail.addChild(new Label(DETAIL_X + 8, 44, '', { font: fonts.small, color: C.textMuted, maxWidth: DETAIL_W - 16, markup: true }), 2);
    this.detailBody = this.detail.addChild(new Label(DETAIL_X + 8, 56, '', { font: fonts.small, maxWidth: DETAIL_W - 16, markup: true, lineHeight: 8 }), 2);
    this.detail.visible = false;
    this.keywords = this.add(new KeywordBoxes());
    this.hint = this.add(new Label(14, this.sections.rect.y + this.sections.rect.h + 6, 'CARD SECTIONS OPEN A GRID WITH A VIEW UPGRADE TOGGLE. BACK: TITLE.', { font: fonts.small, color: C.textMuted, maxWidth: 98, lineHeight: 8 }));
    this.hint.setZ(Z.PANEL);
  }

  override enter(): void { this.focus.focus(this.sections.row(0)); }

  /** Open a section: card sections open the grid (modal); the others fill the entry list. */
  private open(s: Section, focusList = true): void {
    if (s.kind === 'cards') { this.openCards(s); return; }
    const entries = s.kind === 'relics' ? relicEntries(this.app) : s.kind === 'potions' ? potionEntries(this.app) : glossaryEntries();
    if (this.list) { this.scope.remove(this.list); this.removeWidget(this.list); }
    this.list = this.add(new ListMenu(LIST_X, 24, entries.map((e): ListMenuItem => ({ label: e.label })), {
      title: s.title, w: LIST_W, rowH: 10, font: fonts.small, visibleRows: Math.min(entries.length, 29),
      onHighlight: (i) => { const e = entries[i]; if (e) this.showEntry(e); },
    }));
    this.list.setZ(Z.PANEL);
    this.scope.add(this.list);
    const first = entries[0];
    if (first) this.showEntry(first);
    if (focusList) this.focus.focus(this.list.row(0), { sound: true });
  }

  private openCards(s: CardSection): void {
    const cards = allCards().filter((c) => s.cls.includes(c.cls));
    const tabs: DeckTab[] = [];
    for (const r of RARITY_TABS) {
      const list: CardOffer[] = cards.filter((c) => c.rarity === r.id).map((c) => ({ id: c.id, upgraded: false }));
      if (list.length > 0) tabs.push({ id: r.id, title: r.title, cards: list });
    }
    const other = cards.filter((c) => !RARITY_TABS.some((r) => r.id === c.rarity));
    if (other.length > 0) throw new Error(`compendium: cards with an unknown rarity: ${other.map((c) => `${c.id} (${c.rarity})`).join(', ')}`);
    if (tabs.length === 0) throw new Error(`compendium: no ${s.title} cards registered`);
    openDeckView(this, this.app, { title: `${s.title} CARDS`, tabs, state: null });
  }

  private showEntry(e: Entry): void {
    this.detailIcon?.dispose();
    this.detailIcon = null;
    if (e.icon) {
      this.detailIcon = this.detail.addChild(new Icon(DETAIL_X + DETAIL_W - 26, 30, e.icon.atlas, e.icon.frame), 3);
    }
    this.detailTitle.setText(e.title);
    this.detailMeta.setText(e.meta);
    this.detailBody.setText(e.body);
    const h = 56 - 24 + this.detailBody.rect.h + 10;
    this.detail.resize(DETAIL_W, Math.max(48, h));
    this.detail.setZ(this.detail.z);
    this.detail.visible = true;
    const ids = keywordsForText(e.body.replace(/\[[^\]]*\]/g, '')).filter((id) => getKeyword(id).name.toUpperCase() !== e.title);
    this.keywords.show(ids, this.detail.rect, 'below', [this.list?.rect ?? rect(0, 0, 0, 0), this.sections.rect]);
  }

  override update(): void {
    // the grid modal (cards) explains its own cards; the list's detail panel follows highlight
    if (this.focus.depth > 1) this.keywords.hide();
  }

  override resume(): void { this.focus.ensureFocus(); }
}

function relicEntries(app: App): Entry[] {
  const rank = (r: string) => { const i = RELIC_ORDER.indexOf(r); if (i < 0) throw new Error(`compendium: unknown relic rarity ${r}`); return i; };
  return [...allRelics()].sort((a, b) => rank(a.rarity) - rank(b.rarity) || a.name.localeCompare(b.name)).map((r) => {
    const def = getRelicDef(r.id);
    const cls = def.cls ? `  ${def.cls.toUpperCase()} ONLY` : '';
    return { label: def.name.toUpperCase(), title: def.name.toUpperCase(), meta: `[cyan]${def.rarity.toUpperCase()} RELIC[/]${cls}`, body: renderRelicText(r.id), icon: itemIcon(app, 'relic', r.id) };
  });
}

function potionEntries(app: App): Entry[] {
  const rank = (r: string) => ['common', 'uncommon', 'rare'].indexOf(r);
  return [...allPotions()].sort((a, b) => rank(a.rarity) - rank(b.rarity) || a.name.localeCompare(b.name)).map((p) => {
    const def = getPotionDef(p.id);
    const use = `${def.target === 'enemy' ? 'Drink it on an enemy.' : 'Drink it.'} ${def.combatOnly ? 'Combat only.' : 'Usable anywhere.'}`;
    const cls = def.cls ? `  ${def.cls.toUpperCase()} ONLY` : '';
    return { label: def.name.toUpperCase(), title: def.name.toUpperCase(), meta: `[magenta]${def.rarity.toUpperCase()} POTION[/]${cls}`, body: `${renderPotionText(p.id)}\n\n[grey]${use}[/]`, icon: itemIcon(app, 'potion', p.id) };
  });
}

function glossaryEntries(): Entry[] {
  const rank = (g: KeywordDef['group']) => GROUP_ORDER.indexOf(g);
  return [...KEYWORDS].sort((a, b) => rank(a.group) - rank(b.group) || a.name.localeCompare(b.name)).map((k) => ({
    label: k.name.toUpperCase(), title: k.name.toUpperCase(), meta: `[yellow]${k.group.toUpperCase()}[/]`, body: renderKeywordText(k.id), icon: null,
  }));
}

