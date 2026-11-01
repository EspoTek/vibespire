/**
 * Class select: the three classes with their generated portraits and a 3-line blurb (GDD §1.2-1.4),
 * the starter relic, a starter-deck preview (deck view overlay), an optional seed field for
 * keyboard users (random seed otherwise), then Game.newRun → Ascent Pact.
 *
 * Classes the content pack has not registered yet are shown greyed ("NOT IN THIS BUILD"); any other
 * registered class (the engine's test class) is appended with a placeholder portrait.
 */
import { allClasses, getRelicDef } from '../../../content/index.ts';
import { classMaxHpBonus, renderRelicText, type Difficulty } from '../../../engine/index.ts';
import { DIFFICULTY_NAMES, difficultyHint } from '../difficulty.ts';
import type { App } from '../../app.ts';
import { fonts } from '../../fonts.ts';
import { H, rect, W } from '../../layout.ts';
import { C } from '../../palette.ts';
import { Screen } from '../../screens/Screen.ts';
import { Backdrop } from '../../ui/Backdrop.ts';
import { Button } from '../../ui/Button.ts';
import { Icon } from '../../ui/Icon.ts';
import { Label } from '../../ui/Label.ts';
import { Panel } from '../../ui/Panel.ts';
import { Picture } from '../../ui/Picture.ts';
import { Widget, Z } from '../../ui/Widget.ts';
import { openDeckView } from '../deckView.ts';
import { placeholderPortrait } from '../hud.ts';
import { confirmDialog } from '../overlays.ts';
import { screenFor } from '../router.ts';
import { RunSession } from '../session.ts';
import { portraitOrNull } from '../view.ts';
import type { SongName } from '../../music.ts';
import { CardFrame } from '../../ui/CardFrame.ts';
import { InfoLayer } from '../../ui/InfoLayer.ts';

interface ClassEntry { id: string; name: string; blurb: string; available: boolean }

/** GDD §1.2-1.4, shortened to three lines each. */
const DESIGN_CLASSES: readonly Omit<ClassEntry, 'available'>[] = [
  { id: 'breaker', name: 'BREAKER', blurb: 'Chain Attacks to build Onslaught, bank Guard on hold turns, and prime Riposte cards to strike in the enemy turn.' },
  { id: 'graft', name: 'GRAFT', blurb: 'Prune cards away for the fight and grow chosen Bloom copies for good. Rot is her slow, rising clock.' },
  { id: 'chronist', name: 'CHRONIST', blurb: 'Every 3rd card is on the beat. Delay cards wait on the Timeline for double value. Sees two intents ahead.' },
];

function randomSeed(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes); // not Math.random: seeds are run identity, not cosmetics
  return [...bytes].map((b) => alphabet[b % alphabet.length] as string).join('');
}

class ClassCard extends Widget {
  private readonly frame: Panel;
  readonly entry: ClassEntry;
  selected = false;

  constructor(x: number, y: number, w: number, app: App, entry: ClassEntry, index: number) {
    super(rect(x, y, w, 196), 'classcard');
    this.entry = entry;
    this.focusable = true;
    this.list = { key: 'classes', index, axis: 'x', wrap: true };
    this.frame = this.addChild(new Panel(rect(x, y, w, 196)), 0);
    const portrait = portraitOrNull(app, entry.id);
    const px = x + Math.floor((w - 64) / 2);
    if (portrait) this.addChild(new Icon(px, y + 8, portrait, portrait.names()[0] as string), 1);
    else this.addChild(new Picture(px, y + 8, placeholderPortrait(entry.id, 64)), 1);
    this.addChild(new Label(x + w / 2, y + 78, entry.name, { align: 'center', color: entry.available ? C.text : C.textDim }), 2);
    this.addChild(new Label(x + 8, y + 92, entry.blurb, { font: fonts.small, maxWidth: w - 16, lineHeight: 8, maxLines: 4, overflow: 'ellipsis', color: entry.available ? C.text : C.textDim }), 2);
    if (!entry.available) this.addChild(new Label(x + w / 2, y + 176, 'NOT IN THIS BUILD', { font: fonts.small, align: 'center', color: C.pink }), 2);
    else {
      const def = allClasses().find((c) => c.id === entry.id);
      if (!def) throw new Error(`ClassCard: ${entry.id} vanished from the registry`);
      const relic = def.startingRelics[0];
      const relicText = relic ? `[cyan]${getRelicDef(relic).name.toUpperCase()}[/]\n${renderRelicText(relic)}` : `[grey]NO STARTER RELIC[/]`;
      this.stats = this.addChild(new Label(x + 8, y + 130, '', { font: fonts.small, markup: true, maxWidth: w - 16, lineHeight: 8, maxLines: 7, overflow: 'ellipsis' }), 2);
      this.statsOf = (tier) => {
        // ruling 76: the tier's starting max-HP bonus for this class (shown, and added to the HP)
        const bonus = classMaxHpBonus(tier, def.id);
        return `HP ${def.maxHp + bonus}${bonus !== 0 ? ` [lime](${bonus > 0 ? '+' : ''}${bonus})[/]` : ''}  ENERGY ${def.maxEnergy}\n${relicText}`;
      };
      this.showTier('standard');
    }
    this.label = `${entry.name}. ${entry.blurb}${entry.available ? '' : ' Not in this build.'}`;
    // InfoLayer boxes the class's mechanics (and its starter relic's terms) beside the focused card
    const def = allClasses().find((c) => c.id === entry.id);
    const relic = def?.startingRelics[0];
    this.keywordText = `${entry.blurb} ${relic ? renderRelicText(relic) : ''}`;
  }

  /** Starting stats for a tier (null: a class not in this build shows none). */
  private stats: Label | null = null;
  private statsOf: ((tier: Difficulty) => string) | null = null;

  /** Show the starting HP of the selected difficulty tier (ruling 76). */
  showTier(tier: Difficulty): void {
    if (this.stats && this.statsOf) this.stats.setText(this.statsOf(tier));
  }

  setSelected(on: boolean): void {
    this.selected = on;
    this.frame.setColors(C.boxBg, on ? C.textHi : C.border);
  }
}

/** A one-line text field; activate to type (keyboard), Enter/arrow keys to finish. */
class SeedField extends Widget {
  private readonly app: App;
  private readonly box: Panel;
  private readonly text: Label;
  value = '';
  private editing = false;
  private t = 0;

  constructor(x: number, y: number, app: App) {
    super(rect(x, y, 170, 18), 'seed');
    this.app = app;
    this.focusable = true;
    this.box = this.addChild(new Panel(rect(x, y, 170, 18)), 0);
    this.text = this.addChild(new Label(x + 8, y + 5, '', { color: C.text }), 2);
    this.activateSound = false;
    this.onActivate = () => (this.editing ? this.stop() : this.start());
    this.onBlur = () => this.stop();
    this.refresh();
  }

  private start(): void {
    this.editing = true;
    this.app.sfx.play('confirm');
    this.app.input.beginTextCapture((ev) => {
      if ('backspace' in ev) this.value = this.value.slice(0, -1);
      else if (this.value.length < 16) this.value += ev.char;
      this.refresh();
    });
    this.refresh();
  }

  private stop(): void {
    if (!this.editing) return;
    this.editing = false;
    this.app.input.endTextCapture();
    this.refresh();
  }

  private refresh(): void {
    const cursor = this.editing && Math.floor(this.t / 300) % 2 === 0 ? '_' : '';
    this.text.setText(this.value || this.editing ? `${this.value}${cursor}` : 'RANDOM').setColor(this.value || this.editing ? C.text : C.textMuted);
    this.box.setColors(C.boxBg, this.editing ? C.cyan : C.border);
    this.label = `Seed: ${this.value || 'random'}. Confirm to type.`;
  }

  override update(dtMs: number): void { if (this.editing) { this.t += dtMs; this.refresh(); } }
  override dispose(): void { this.stop(); super.dispose(); }
}

export class ClassSelectScreen extends Screen {
  /** Difficulty tier for the new run (ruling 71); Standard is the default. */
  private tier: Difficulty = 'standard';
  private tierButton: Button | null = null;
  override get music(): SongName { return 'title'; }
  private readonly cards: ClassCard[] = [];
  private readonly seed: SeedField;
  private readonly info: InfoLayer;

  constructor(app: App) {
    super(app, 'class-select');
    this.add(new Backdrop(app.assets.backdrops, 'title_spire')).setDim(1);
    const registered = new Set(allClasses().map((c) => c.id));
    const entries: ClassEntry[] = DESIGN_CLASSES.map((c) => ({ ...c, available: registered.has(c.id) }));
    for (const c of allClasses()) {
      if (!DESIGN_CLASSES.some((d) => d.id === c.id)) entries.push({ id: c.id, name: c.name.toUpperCase(), blurb: 'Engine test class (placeholder content).', available: true });
    }
    const panel = this.add(new Panel(rect(8, 8, W - 16, H - 16), { title: 'CHOOSE YOUR CLIMBER' }));
    panel.setZ(Z.PANEL);
    const n = entries.length;
    const cw = Math.min(176, Math.floor((W - 40 - (n - 1) * 6) / n));
    const x0 = Math.floor((W - (n * cw + (n - 1) * 6)) / 2);
    entries.forEach((e, i) => {
      const card = panel.addChild(new ClassCard(x0 + i * (cw + 6), 30, cw, app, e, i), 2);
      card.onActivate = () => this.select(card);
      this.cards.push(card);
    });
    panel.addChild(new Label(40, 240, 'SEED', { color: C.textMuted }), 2);
    this.seed = panel.addChild(new SeedField(80, 236, app), 2);
    panel.addChild(new Label(256, 241, 'CONFIRM TO TYPE  (KEYBOARD)', { font: fonts.small, color: C.textMuted }), 2);
    panel.addChild(new Button(rect(40, 270, 120, 0), 'STARTER DECK', { onActivate: () => this.showDeck(), hint: 'Preview the starting deck.' }), 2);
    // difficulty tier (ruling 71): confirm / click toggles Standard <-> Heroic; the tooltip explains it
    this.tierButton = panel.addChild(new Button(rect(170, 270, 160, 0), '', { onActivate: () => this.toggleTier() }), 2);
    this.showTier();
    const begin = panel.addChild(new Button(rect(W - 170, 300, 130, 0), 'BEGIN CLIMB', { onActivate: () => this.begin() }), 2);
    const back = panel.addChild(new Button(rect(40, 300, 80, 0), 'BACK', { onActivate: () => { void this.app.screens.pop(); } }), 2);
    // one row: left/right moves between BACK and BEGIN CLIMB (spatial nav would jump up to STARTER DECK)
    back.list = { key: 'cs-bottom', index: 0, axis: 'x', wrap: false };
    begin.list = { key: 'cs-bottom', index: 1, axis: 'x', wrap: false };
    this.focus.pushScope('class-select', () => { void this.app.screens.pop(); }).add(panel);
    const firstAvailable = this.cards.find((c) => c.entry.available);
    if (firstAvailable) this.select(firstAvailable, false);
    this.info = new InfoLayer(this);
  }

  override update(): void {
    // keyword boxes / tooltips for the focused class card or button (the deck preview has its own detail)
    const f = this.focus.focused;
    this.info.update(this.focus.depth === 1 && !(f instanceof CardFrame) ? f : null);
  }

  override enter(): void {
    const sel = this.cards.find((c) => c.selected);
    if (sel) this.focus.focus(sel);
    else this.focus.ensureFocus();
  }

  private select(card: ClassCard, sound = true): void {
    if (!card.entry.available) { if (sound) this.app.sfx.play('cancel'); this.app.toasts.show(`${card.entry.name} IS NOT IN THIS BUILD YET`); return; }
    for (const c of this.cards) c.setSelected(c === card);
    if (this.tierButton) this.showTier(); // the tooltip names this class's bonus, if any
  }

  private selected(): ClassCard {
    const c = this.cards.find((x) => x.selected);
    if (!c) throw new Error('ClassSelect: no class selected (no class registered?)');
    return c;
  }

  private showDeck(): void {
    const id = this.selected().entry.id;
    const def = allClasses().find((c) => c.id === id);
    if (!def) throw new Error(`showDeck: ${id} not registered`);
    openDeckView(this, this.app, {
      title: `${def.name.toUpperCase()} STARTER DECK`,
      tabs: [{ id: 'deck', title: 'DECK', cards: def.startingDeck.map((cid) => ({ id: cid, upgraded: false })) }],
      state: null,
    });
  }

  private toggleTier(): void {
    this.tier = this.tier === 'standard' ? 'heroic' : 'standard';
    this.showTier();
  }

  private showTier(): void {
    const b = this.tierButton;
    if (!b) throw new Error('ClassSelect: tier button not built');
    b.setText(`TIER: ${DIFFICULTY_NAMES[this.tier]}`);
    for (const c of this.cards) c.showTier(this.tier);
    const sel = this.cards.find((c) => c.selected);
    b.hint = difficultyHint(this.tier, sel ? sel.entry.id : null);
    b.label = `TIER: ${DIFFICULTY_NAMES[this.tier]}. ${b.hint.replace(/\[[^\]]*\]/g, '').replace(/\n/g, ' ')} Confirm to switch.`;
  }

  private begin(): void {
    const classId = this.selected().entry.id;
    const seed = this.seed.value || randomSeed();
    const start = () => {
      const session = RunSession.newRun(this.app.storage, seed, classId, this.tier);
      console.info(`[run] new run: class ${classId}, seed ${seed}, ${this.tier}`);
      void this.app.screens.replace(screenFor(this.app, session));
    };
    if (RunSession.hasSave(this.app.storage)) confirmDialog(this, 'NEW RUN', 'Start a new run? Your saved run will be lost.', 'START', start);
    else start();
  }
}
