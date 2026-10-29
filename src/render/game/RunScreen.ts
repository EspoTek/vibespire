/**
 * RunScreen: base for every screen of a run. It owns the backdrop, the TopBar HUD, the root
 * focus scope (cancel = pause), the pause / deck / help shortcuts, run-level PendingChoice
 * handling, toasts for narrative events, and routing: after every applied action, if the phase
 * now belongs to another screen, it hands over (`routeAfter`).
 */
import { getCardDef, getPotionDef, getRelicDef } from '../../content/index.ts';
import { firstFocusableOrNull } from '../focusNav.ts';
import type { Action, GameEvent, PendingChoice, RunState } from '../../engine/index.ts';
import type { App } from '../app.ts';
import type { BackdropKey } from '../assets.ts';
import type { FocusScope } from '../focus.ts';
import { H, rect, W } from '../layout.ts';
import { Screen } from '../screens/Screen.ts';
import { Backdrop } from '../ui/Backdrop.ts';
import { Button } from '../ui/Button.ts';
import { CardFrame } from '../ui/CardFrame.ts';
import { fonts } from '../fonts.ts';
import { measureLine } from '../textLayout.ts';
import { ListMenu } from '../ui/ListMenu.ts';
import { Panel } from '../ui/Panel.ts';
import { Label } from '../ui/Label.ts';
import { Z, type Widget } from '../ui/Widget.ts';
import { openDeckView, type DeckTab } from './deckView.ts';
import { TopBar } from './hud.ts';
import { confirmDialog, openHelp, openPause } from './overlays.ts';
import { routeAfter, screenKind } from './router.ts';
import type { RunSession } from './session.ts';
import { cardFace } from './view.ts';
import { actSong, type SongName } from '../music.ts';

export abstract class RunScreen extends Screen {
  override get music(): SongName { return actSong(this.session.state.act); }
  protected readonly session: RunSession;
  protected readonly scope: FocusScope;
  protected readonly bg: Backdrop<BackdropKey>;
  protected hud: TopBar | null = null;
  protected readonly kind: string;
  private choiceOpen = false;
  /** An action routed away: no more input or per-frame work on this screen. */
  protected leaving = false;

  constructor(app: App, session: RunSession, name: string, backdrop: BackdropKey, withHud = true) {
    super(app, name);
    this.session = session;
    this.kind = screenKind(session.state);
    this.bg = this.add(new Backdrop(app.assets.backdrops, backdrop));
    this.scope = this.focus.pushScope(name, () => this.onBack());
    if (withHud) {
      this.hud = this.add(new TopBar(app, session.state, {
        onDeck: () => this.openDeck(),
        onPause: () => this.openPauseMenu(),
        onPotion: (i) => this.usePotion(i),
      }));
      this.scope.add(...this.hud.focusables());
    }
  }

  /** Build the screen's content from `this.session.state` (called on enter). */
  protected abstract build(): void;
  /** Re-sync the content after an action that kept us on this screen. */
  protected abstract refresh(events: readonly GameEvent[]): void;

  override enter(): void {
    this.build();
    this.focusContent();
    this.checkChoice();
  }

  /**
   * Keep focus on the screen's content: if nothing (or only a HUD widget) is focused, focus the first
   * content widget in reading order; the HUD is reachable by moving up.
   */
  protected focusContent(): void {
    if (this.focus.depth !== 1) return;
    const hud = new Set(this.hud?.focusables() ?? []);
    const cur = this.focus.focused;
    if (cur && !hud.has(cur) && cur.enabled && cur.focusable) return;
    const content = this.scope.candidates().filter((w) => !hud.has(w) && w.enabled && w.visible);
    const first = firstFocusableOrNull(content);
    if (first) this.focus.focus(first);
    else this.focus.ensureFocus();
  }

  protected get state(): RunState { return this.session.state; }

  /** Cancel on the root scope: pause menu by default. */
  protected onBack(): void { this.openPauseMenu(); }

  /** Apply a legal action, toast its narrative events, then refresh or route away. */
  protected act(a: Action): GameEvent[] {
    if (this.leaving) throw new Error(`${this.name}: act() after the screen started leaving`);
    const prev = this.state;
    const events = this.session.apply(a);
    this.toastEvents(events);
    if (this.hud) {
      for (const w of this.hud.focusables()) this.scope.remove(w);
      this.hud.refresh(this.state);
      this.scope.add(...this.hud.focusables());
    }
    if (screenKind(this.state) !== this.kind || this.state.act !== prev.act) {
      this.leaving = true;
      routeAfter(this.app, this.session, prev, events);
      return events;
    }
    this.refresh(events);
    this.focusContent();
    this.checkChoice();
    return events;
  }

  /** Narrative events → toasts (outside combat; the combat screen animates its own). */
  protected toastEvents(events: readonly GameEvent[]): void {
    for (const e of events) {
      switch (e.t) {
        case 'text': this.app.toasts.show(e.text.toUpperCase(), 2200); break;
        case 'relic_gained': this.app.toasts.show(`RELIC: ${getRelicDef(e.relic).name.toUpperCase()}`); break;
        case 'relic_lost': this.app.toasts.show(`LOST RELIC: ${getRelicDef(e.relic).name.toUpperCase()}`); break;
        case 'potion_gained': this.app.toasts.show(`POTION: ${getPotionDef(e.potion).name.toUpperCase()}`); break;
        case 'potion_lost': this.app.toasts.show(`LOST POTION: ${getPotionDef(e.potion).name.toUpperCase()}`); break;
        case 'card_added': if (e.where === 'deck') this.app.toasts.show(`ADDED ${getCardDef(e.card.id, e.card.upgraded).name.toUpperCase()}`); break;
        case 'card_removed': this.app.toasts.show('CARD REMOVED'); break;
        case 'card_upgraded': this.app.toasts.show('CARD UPGRADED'); break;
        case 'shards': if (e.delta !== 0) this.app.toasts.show(`${e.delta > 0 ? '+' : ''}${e.delta} ◆ SHARD${Math.abs(e.delta) === 1 ? '' : 'S'}`); break;
        case 'max_hp': this.app.toasts.show(`MAX HP ${e.delta > 0 ? '+' : ''}${e.delta}`); break;
        case 'cap_hit': this.app.toasts.show(`${e.cap.replace(/^cap_/, '').replace(/_/g, ' ').toUpperCase()} REACHED`); break;
        default: break; // the rest is reflected by refresh() (HP, gold, deck...)
      }
    }
  }

  override update(_dtMs: number = 16): void {
    if (this.focus.depth !== 1 || this.leaving) return; // a modal is open, or we are on our way out
    const inp = this.app.input;
    if (inp.pressed('menu')) this.openPauseMenu();
    else if (inp.pressed('deck')) this.openDeck();
    else if (inp.pressed('help')) openHelp(this, this.app);
  }

  protected openPauseMenu(): void {
    openPause(this, this.app, {
      seed: this.state.seed,
      onAbandon: () => {
        this.session.abandon();
        this.leaving = true;
        void this.app.screens.pop();
      },
    });
  }

  protected deckTabs(): DeckTab[] {
    return [{ id: 'deck', title: 'DECK', cards: this.state.player.deck }];
  }

  protected openDeck(): void {
    openDeckView(this, this.app, { title: 'DECK', tabs: this.deckTabs(), state: this.state });
  }

  private usePotion(index: number): void {
    const a = this.session.findOrNull('use_potion', (x) => x.index === index);
    const id = this.state.player.potions[index];
    if (id === undefined) throw new Error(`usePotion: empty slot ${index}`);
    const def = getPotionDef(id);
    if (!a) { this.app.sfx.play('cancel'); this.app.toasts.show(def.combatOnly ? 'ONLY IN COMBAT' : 'CANNOT USE THAT NOW'); return; }
    confirmDialog(this, def.name.toUpperCase(), `Drink ${def.name}?`, 'DRINK', () => { this.act(a); });
  }

  // ---------------------------------------------------------------- pending choices

  /** Open the modal for a run-level PendingChoice if there is one (combat overrides for its own). */
  protected checkChoice(): void {
    const pc = this.state.pendingChoice;
    if (pc && !this.choiceOpen) this.openChoice(pc);
  }

  protected openChoice(pc: PendingChoice): void {
    this.choiceOpen = true;
    const resolve = (uids: number[]) => {
      this.choiceOpen = false;
      this.act({ type: 'resolve_choice', uids });
    };
    openChoiceModal(this, this.app, this.state, pc, resolve);
  }
}

/**
 * PendingChoice UI (run or combat level). `resolve` receives uids/indices IN `choices` ORDER
 * (the engine requires it).
 */
export function openChoiceModal(screen: Screen, app: App, state: RunState, pc: PendingChoice, resolve: (uids: number[]) => void): void {
  const ordered = (picked: readonly number[]) => pc.choices.filter((c) => picked.includes(c));
  if (pc.kind === 'options') {
    screen.openModal(`choice:${pc.prompt}`, (close) => {
      const items = pc.choices.map((c, i) => ({ label: (pc.labels[i] ?? String(c)).toUpperCase(), onActivate: () => { close(); resolve([c]); } }));
      const menu = new ListMenu(0, 0, items, { title: pc.prompt.toUpperCase(), rowH: 13 });
      menu.moveTo(Math.floor((W - menu.rect.w) / 2), Math.floor((H - menu.rect.h) / 2));
      menu.setZ(Z.MODAL + 20);
      return [menu];
    }, undefined, false); // must be answered: cancel would drop the engine's PendingChoice
    return;
  }
  if (pc.kind === 'offers') {
    screen.openModal(`offers:${pc.prompt}`, (close) => {
      const n = pc.choices.length;
      const title = pc.prompt.toUpperCase();
      const w = Math.min(W - 16, Math.max(220, n * 74 + 24, measureLine(fonts.ui.data, title) + 24)); // the title stays one line
      const x = Math.floor((W - w) / 2), y = 90;
      const cardsX = x + Math.floor((w - (n * 74 - 10)) / 2);
      const panel = new Panel(rect(x, y, w, pc.min === 0 ? 150 : 128), { title });
      panel.setZ(Z.MODAL + 20);
      const widgets: Widget[] = [panel];
      pc.choices.forEach((c, i) => {
        const offer = pc.offers[c];
        if (!offer) throw new Error(`offers choice ${c} has no offer`);
        const cw = panel.addChild(new CardFrame(cardsX + i * 74, y + 30, cardFace(app, offer, { state })), 5);
        cw.list = { key: 'offers', index: i, axis: 'x', wrap: true };
        cw.onActivate = () => { close(); resolve([c]); };
      });
      if (pc.min === 0) panel.addChild(new Button(rect(x + w - 80, y + 126, 66, 0), 'SKIP', { onActivate: () => { close(); resolve([]); } }), 5);
      return widgets;
    }, undefined, false); // SKIP (when allowed) is the explicit "no" answer
    return;
  }
  // cards: pick from a pile with the deck-view grid
  const pile = cardsForChoice(state, pc);
  openDeckView(screen, app, {
    title: pc.prompt.toUpperCase(),
    tabs: [{ id: 'choice', title: (pc.from ?? 'cards').toUpperCase(), cards: pile }],
    state,
    pick: {
      min: pc.min, max: pc.max,
      reason: (card) => ('uid' in card && pc.choices.includes(card.uid) ? null : 'Not a valid choice.'),
      confirmLabel: pc.min === 0 && pc.max > 0 ? 'CONFIRM' : 'CHOOSE',
      onConfirm: (indices) => resolve(ordered(indices.map((i) => {
        const c = pile[i];
        if (!c) throw new Error(`choice: no card at ${i}`);
        return c.uid;
      }))),
      cancellable: false,
    },
  });
}

function cardsForChoice(state: RunState, pc: PendingChoice): readonly import('../../engine/index.ts').CardInstance[] {
  const c = state.combat;
  switch (pc.from) {
    case 'deck': return state.player.deck;
    case 'hand': if (!c) throw new Error('hand choice outside combat'); return c.hand;
    case 'draw': if (!c) throw new Error('draw choice outside combat'); return [...c.draw].reverse(); // top first
    case 'discard': if (!c) throw new Error('discard choice outside combat'); return c.discard;
    case 'exhaust': if (!c) throw new Error('exhaust choice outside combat'); return c.exhaust;
    case null: throw new Error(`cards choice "${pc.prompt}" has no source pile`);
  }
}

/** Small "TITLE: value" row helper used by several screens. */
export function infoLabel(x: number, y: number, text: string): Label {
  return new Label(x, y, text, { markup: true });
}
