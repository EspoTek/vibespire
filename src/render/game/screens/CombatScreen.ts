/**
 * Combat. Two halves:
 *  - `sync()`: rebuild every widget from game.state (the truth). Runs after each applied action's
 *    animations finish, and on entry (so CONTINUE mid-combat just works).
 *  - the animator: the GameEvent[] returned by apply() is played through the Scheduler as short
 *    steps (60-120 ms; hold confirm to speed them up x4), driving a small LIVE model (hp, block,
 *    guard, statuses, energy, pile counts) so bars move hit by hit. It never diffs states.
 * Input: hand (left/right, 1-0 slots, confirm plays), targeting (auto when one target; else
 * left/right or LB/RB/Tab/Q and confirm; mouse click), END TURN (E / pad X / click), potions,
 * piles → deck view, hold-info tooltips, PendingChoice modals.
 */
import { getCardDef, getEnemyDef, getPotionDef, getRelicDef, getStatusDef } from '../../../content/index.ts';
import {
  computeDamagePreview, effectTextValues, renderMoveText, renderPotionText, renderRelicText, renderStatusText, riposteWillTrigger, TUNING,
  type Action, type CardInstance, type CombatState, type EntityRef, type GameEvent, type Intent, type PendingChoice, type PrimedEntry, type RunState,
} from '../../../engine/index.ts';
import type { App } from '../../app.ts';
import { actBackdrop } from '../../assets.ts';
import { ENEMY_BASELINE_Y } from '../../backdrops.ts';
import type { FocusScope } from '../../focus.ts';
import { fonts } from '../../fonts.ts';
import { rect, W } from '../../layout.ts';
import { C } from '../../palette.ts';
import { flash, shake } from '../../tween.ts';
import { Button } from '../../ui/Button.ts';
import { CardFrame } from '../../ui/CardFrame.ts';
import { EnemyView } from '../../ui/EnemyView.ts';
import { Icon } from '../../ui/Icon.ts';
import { Label } from '../../ui/Label.ts';
import { Panel } from '../../ui/Panel.ts';
import { Picture } from '../../ui/Picture.ts';
import { Tooltip } from '../../ui/Tooltip.ts';
import { Widget, Z } from '../../ui/Widget.ts';
import {
  banner, blinkOut, EnemyPlate, iconPop, EnergyOrb, floatText, HpBar, IntentBox, Metronome, MiniCard, StatusRow, type StatusView,
} from '../combatWidgets.ts';
import { openDeckView, type DeckTab } from '../deckView.ts';
import { handSlots, enemyCenters, battleScale, timelineSlots, TIMELINE, PLATE_W } from '../handLayout.ts';
import { HintIcon, placeholderPortrait } from '../hud.ts';
import { hpAfterHits, isAttackKind } from '../intents.ts';
import { CardDetail, confirmDialog, controlsText } from '../overlays.ts';
import { routeAfter } from '../router.ts';
import { openChoiceModal, RunScreen } from '../RunScreen.ts';
import type { RunSession } from '../session.ts';
import { bloomOf, cardFace, enemyAtlas, itemIcon, portraitOrNull, primeForecast, statusIcon, unplayableReasonOrNull } from '../view.ts';
import { PROMPTS, promptMarkup, type PromptAction } from '../../actions.ts';

interface LiveEntity { hp: number; maxHp: number; block: number; guard: number; statuses: Record<string, number> }

interface Unit {
  uid: number;
  enemyId: string;
  view: EnemyView;
  plate: EnemyPlate;
  intent: IntentBox;
  dead: boolean;
}

const STEP = 90; // base animation step, ms
/** A hit this big (before Block) shakes the whole screen. */
const BIG_HIT = 15;
/** Debuffs that pop their icon when applied. */
const POP_STATUSES: ReadonlySet<string> = new Set(['rot', 'exposed', 'stagger']);
/** Primed rack row, just above the hand. */
const RACK_Y = 252;
const PILES = { draw: { x: 534, y: 318 }, discard: { x: 576, y: 318 }, scrap: { x: 618, y: 318 } } as const;

export class CombatScreen extends RunScreen {
  private readonly entryEvents: readonly GameEvent[];
  private readonly units = new Map<number, Unit>();
  private readonly hand = new Map<number, CardFrame>();
  private handOrder: number[] = [];
  private minis: MiniCard[] = [];
  /** Primed rack chips (GDD §2.2), kept live through the enemy phase until each fires or fizzles. */
  private rack: MiniCard[] = [];
  /** Riposte triggers still to animate per uid in the current batch (a chip returns while > 0). */
  private pendingTriggers = new Map<number, number>();
  private playerHp!: HpBar;
  private playerHpText!: Label;
  private playerDef!: Label;
  private playerStatuses!: StatusRow;
  private counterLabel!: Label;
  private counterIcon!: Icon;
  private energy!: EnergyOrb;
  private metronome: Metronome | null = null;
  private endTurn!: Button;
  private pileButtons: Button[] = [];
  private potionIcons: HintIcon[] = [];
  private relicIcons: HintIcon[] = [];
  private detail!: CardDetail;
  private tip!: Tooltip;
  private hint: Label | null = null;
  private timelineHeader: Label[] = [];
  private targeting: { scope: FocusScope; resolve: (uid: number) => void; card: number | null } | null = null;
  /** "29 → 17 HP" over the focused target while aiming a card. */
  private dmgPreview!: Label;
  private animating = false;
  private live: { player: LiveEntity; enemies: Map<number, LiveEntity>; energy: number; draw: number; discard: number; exhaust: number } | null = null;
  private inPlay: { uid: number; frame: CardFrame } | null = null;
  private lastScrapAt: { x: number; y: number } | null = null;
  private tipFor: Widget | null = null;
  private tipInfo = false;
  private combatChoiceOpen = false;
  private handOnly = new Set<number>(); // uids drawn this batch not yet in sync

  constructor(app: App, session: RunSession, entryEvents: readonly GameEvent[] = []) {
    super(app, session, 'combat', actBackdrop(session.state.act), false);
    this.entryEvents = entryEvents;
  }

  private get combat(): CombatState {
    const c = this.state.combat;
    if (!c) throw new Error('CombatScreen: no combat state');
    return c;
  }

  // ---------------------------------------------------------------- static frame

  protected build(): void {
    const s = this.state;
    // player plate
    const plate = this.add(new Panel(rect(2, 236, 124, 122)));
    plate.setZ(Z.PANEL);
    const portrait = portraitOrNull(this.app, s.classId, true);
    if (portrait) plate.addChild(new Icon(8, 242, portrait, portrait.names()[0] as string), 1);
    else plate.addChild(new Picture(8, 242, placeholderPortrait(s.classId, 32)), 1);
    this.counterIcon = plate.addChild(new Icon(44, 242, this.app.icons, s.classId === 'graft' ? 'leaf' : 'onslaught'), 2);
    this.counterLabel = plate.addChild(new Label(58, 244, '', { color: C.text }), 2);
    this.playerHp = plate.addChild(new HpBar(8, 278, 112, 8), 2);
    this.playerHpText = plate.addChild(new Label(8, 288, '', { font: fonts.small }), 2);
    this.playerDef = plate.addChild(new Label(120, 288, '', { font: fonts.small, align: 'right', markup: true }), 2);
    this.playerStatuses = plate.addChild(new StatusRow(this.app, 8, 298, 112), 3);
    // energy, metronome, end turn, piles
    const right = this.add(new Panel(rect(514, 236, 124, 122)));
    right.setZ(Z.PANEL);
    this.energy = right.addChild(new EnergyOrb(522, 248), 2);
    if (this.usesCadence()) this.metronome = right.addChild(new Metronome(522, 240), 2);
    this.endTurn = right.addChild(new Button(rect(554, 250, 78, 22), 'END TURN', { onActivate: () => this.tryEndTurn(), hint: `End your turn (${PROMPTS[this.app.input.lastDevice].endTurn}).` }), 2);
    this.endTurn.activateSound = false;
    const pile = (tab: string, x: number, label: string) => {
      const b = right.addChild(new Button(rect(x, 304, 40, 0), label, { font: fonts.small, onActivate: () => this.openPiles(tab) }), 2);
      b.list = { key: 'piles', index: this.pileButtons.length, axis: 'x', wrap: false };
      this.pileButtons.push(b);
    };
    pile('draw', 518, 'DRAW');
    pile('discard', 558, 'DISC');
    pile('exhaust', 598, 'SCRAP');
    this.detail = this.add(new CardDetail(4, 96, 150));
    this.dmgPreview = this.add(new Label(0, 0, '', { font: fonts.small, align: 'center', color: C.yellow, outline: C.black, markup: true }));
    this.dmgPreview.setZ(Z.PANEL + 30);
    this.dmgPreview.visible = false;
    this.tip = this.add(new Tooltip({ maxWidth: 170 }));
    if (s.floor <= 1 && this.combat.turn <= 1) {
      this.hint = this.add(new Label(W / 2, 250, '', { font: fonts.small, align: 'center', color: C.textHi, outline: C.black, markup: true }));
    }
    for (let i = 0; i < 3; i++) {
      const l = this.add(new Label(TIMELINE.x + i * (TIMELINE.colW + TIMELINE.gapX) + 2, TIMELINE.y, i === 0 ? 'NEXT TURN' : `+${i + 1}`, { font: fonts.small, color: C.iceBlue, outline: C.black }));
      l.visible = false;
      this.timelineHeader.push(l);
    }
    this.scope.add(plate, right);
    // entry: animate the opening draws if we arrived from the map; else (continue) just sync
    if (this.entryEvents.length > 0) {
      this.sync({ hideHand: true });
      void this.runAnimations(this.entryEvents, this.state);
    } else {
      this.sync();
      const first = this.hand.get(this.handOrder[0] ?? -1);
      if (first) this.focus.focus(first);
    }
  }

  protected refresh(_e: readonly GameEvent[]): void { this.sync(); }

  // ---------------------------------------------------------------- sync from state (the truth)

  private sync(opts: { hideHand?: boolean } = {}): void {
    const s = this.state;
    const c = this.combat;
    const focusedUid = this.focusedHandUid();
    // enemies
    const living = c.enemies.filter((e) => e.alive);
    for (const e of c.enemies) {
      let u = this.units.get(e.uid);
      if (!u && e.alive) u = this.createUnit(e.uid, e.id);
      if (u && !e.alive && !u.dead) this.removeUnit(u);
    }
    const livingUnits = living.map((e) => this.units.get(e.uid) as Unit);
    const scale = battleScale(livingUnits.map((u) => u.view.sprite.w / u.view.sprite.pixelScale));
    for (const u of livingUnits) u.view.setScale(scale);
    const centers = enemyCenters(living.length, livingUnits.map((u) => Math.max(u.view.sprite.w, PLATE_W)));
    const willParry = (uid: number) => c.primed.length > 0 && riposteWillTrigger(s, uid);
    living.forEach((e, i) => {
      const u = this.units.get(e.uid) as Unit;
      const cx = centers[i] as number;
      this.placeUnit(u, cx);
      u.plate.set(e.hp, e.maxHp, e.block, e.guard, e.statuses['rot'] ?? 0); // absent rot = no Rot on this enemy
      u.plate.statuses.set(this.statusViews(e.statuses, e.uid));
      u.intent.set(e.intent, this.baseDamage(e.id, e.intent), e.forecast.map((f) => ({ intent: f, base: this.baseDamage(e.id, f) })), willParry(e.uid));
      u.intent.moveTo(cx - Math.floor(u.intent.rect.w / 2), u.intent.rect.y);
      u.view.label = this.enemyLabel(e.uid);
    });
    // player
    this.showPlayer({ hp: s.player.hp, maxHp: s.player.maxHp, block: c.player.block, guard: c.player.guard, statuses: c.player.statuses });
    this.energy.set(c.energy, c.maxEnergy);
    const played = c.cardsPlayedThisTurn.length + (c.counters['beatOffset'] ?? 0); // beatOffset exists only after Tempo Draught
    const nextIsBeat = TUNING.cadence.beats.includes(played + 1);
    this.metronome?.set(played % 3, false);
    this.pileButtons.forEach((b, i) => b.setText(`${['DRAW', 'DISC', 'SCRAP'][i]} ${[c.draw.length, c.discard.length, c.exhaust.length][i]}`));
    // hand
    const handUids = c.hand.map((x) => x.uid);
    for (const [uid, f] of this.hand) if (!handUids.includes(uid)) { this.scope.remove(f); this.removeWidget(f); this.hand.delete(uid); }
    const slots = handSlots(c.hand.length);
    c.hand.forEach((card, i) => {
      let f = this.hand.get(card.uid);
      const beat = this.metronome !== null && nextIsBeat;
      const face = cardFace(this.app, card, { state: s, beat });
      if (!f) {
        f = this.add(new CardFrame(0, 0, face, card.uid));
        this.wireCard(f, card.uid);
        this.hand.set(card.uid, f);
      } else f.setFace(face, card.uid);
      const slot = slots[i] as { x: number; y: number };
      f.moveTo(slot.x, slot.y);
      f.restZ = Z.CARD + i * 4;
      if (!f.focused) f.setZ(f.restZ);
      f.list = { key: 'hand', index: i, axis: 'x', wrap: false };
      f.setDimmed(unplayableReasonOrNull(s, card) !== null);
      f.setBeat(beat && unplayableReasonOrNull(s, card) === null);
      f.visible = !opts.hideHand;
      this.scope.add(f);
    });
    this.handOrder = handUids;
    this.handOnly.clear();
    // primed rack + timeline; "WILL PRIME" tags on the Riposte cards ending the turn would prime
    this.syncRack();
    this.syncMinis();
    const prime = primeForecast(s);
    for (const [uid, f] of this.hand) {
      f.setTag(prime.uids.includes(uid) ? (prime.choose ? 'PRIME?' : 'WILL PRIME') : null, C.iceBlue);
    }
    // potions / relics strips (top)
    this.syncStrips();
    // end turn availability
    this.endTurn.setEnabled(this.session.findOrNull('end_turn') !== null);
    this.updateHint();
    if (focusedUid !== null && this.hand.has(focusedUid) && !opts.hideHand) this.focus.focus(this.hand.get(focusedUid) as CardFrame);
  }

  /** Show the Cadence metronome: the Chronist, or any deck with "On beat" cards (GDD §2.7). */
  private usesCadence(): boolean {
    const s = this.state;
    return s.classId === 'chronist' || s.player.deck.some((c) => /on beat/i.test(getCardDef(c.id, c.upgraded).text));
  }

  private statusViews(st: Record<string, number>, owner: EntityRef): StatusView[] {
    return Object.entries(st).filter(([, v]) => v !== 0).map(([id, stacks]) => ({
      id, stacks, text: `[yellow]${getStatusDef(id).name.toUpperCase()} ${stacks}[/]\n${renderStatusText(id, stacks, owner, this.state)}`,
    }));
  }

  private showPlayer(p: LiveEntity): void {
    this.playerHp.set(p.hp, p.maxHp, p.block, p.guard);
    this.playerHpText.setText(`HP ${p.hp}/${p.maxHp}`).setColor(p.hp * 4 <= p.maxHp ? C.red : C.text);
    this.playerDef.setText(`${p.block > 0 ? `[skyBlue]BLK ${p.block}[/]` : ''}${p.guard > 0 ? ` [amber]GRD ${p.guard}[/]` : ''}`);
    this.playerStatuses.set(this.statusViews(p.statuses, 'player'));
    const s = this.state;
    if (s.classId === 'graft') {
      const blooms = s.player.deck.map((c) => bloomOf(c)).filter((b): b is number => b !== null);
      this.counterLabel.setText(`${blooms.length}/${blooms.reduce((a, b) => a + b, 0)}`);
      this.counterIcon.label = `Bloom: ${blooms.length} Bloom cards, ${blooms.reduce((a, b) => a + b, 0)} Bloom total`;
    } else {
      const on = p.statuses['onslaught'] ?? 0; // absent = 0 stacks (statuses are removed at 0)
      this.counterLabel.setText(String(on)).setColor(on > 0 ? C.red : C.textDim);
      this.counterIcon.visible = s.classId === 'breaker' || on > 0;
      this.counterLabel.visible = this.counterIcon.visible;
    }
  }

  private baseDamage(enemyId: string, intent: Intent): number | null {
    if (!isAttackKind(intent.kind) || intent.hidden || intent.moveId === '') return null;
    const move = getEnemyDef(enemyId).moves[intent.moveId];
    if (!move) throw new Error(`intent move ${intent.moveId} not on enemy ${enemyId}`);
    const v = effectTextValues(null, move.effects, getEnemyDef(enemyId).values)['damage'];
    return typeof v === 'number' ? v : null; // scaled / X damage: no printed number to compare against
  }

  private moveText(uid: number): string {
    const e = this.combat.enemies.find((x) => x.uid === uid);
    if (!e) throw new Error(`moveText: no enemy ${uid}`);
    const def = getEnemyDef(e.id);
    const move = def.moves[e.intent.moveId];
    if (!move) return '[grey]Its intent is hidden.[/]'; // '' moveId: hidden intent (no move to describe)
    const body = renderMoveText(this.state, uid, e.intent.moveId); // null = this move has no tooltip text
    return `[yellow]${move.name.toUpperCase()}[/]${body ? `\n${body}` : ''}`;
  }

  private enemyLabel(uid: number): string {
    const e = this.combat.enemies.find((x) => x.uid === uid);
    if (!e) return 'enemy';
    return `${getEnemyDef(e.id).name}, HP ${e.hp} of ${e.maxHp}. Intends ${this.moveText(uid).replace(/\[[^\]]*\]/g, '').replace(/\n/g, ': ')}`;
  }

  private createUnit(uid: number, enemyId: string): Unit {
    const { atlas, frame } = enemyAtlas(this.app, enemyId);
    const view = this.add(new EnemyView(atlas, frame, 320, ENEMY_BASELINE_Y, 2)); // sync() picks the battle scale
    view.onActivate = () => { /* inspection only in the root scope; targeting overrides */ };
    view.activateSound = false;
    const plate = this.add(new EnemyPlate(this.app, 320, ENEMY_BASELINE_Y + 2, enemyId));
    plate.setZ(Z.PANEL);
    const intent = this.add(new IntentBox(this.app));
    intent.setZ(Z.PANEL + 10);
    this.scope.add(view, plate);
    const u: Unit = { uid, enemyId, view, plate, intent, dead: false };
    this.units.set(uid, u);
    return u;
  }

  private placeUnit(u: Unit, cx: number): void {
    const v = u.view;
    v.moveTo(cx - Math.floor(v.sprite.w / 2), ENEMY_BASELINE_Y - v.sprite.h);
    u.plate.moveTo(cx - Math.floor(u.plate.rect.w / 2), ENEMY_BASELINE_Y + 2);
    u.intent.moveTo(u.intent.rect.x, Math.max(46, v.rect.y - 18));
  }

  private removeUnit(u: Unit): void {
    u.dead = true;
    for (const w of [u.view, u.plate, u.intent]) { this.scope.remove(w); this.removeWidget(w); }
    this.units.delete(u.uid);
  }

  private wireCard(f: CardFrame, uid: number): void {
    f.activateSound = false;
    f.onActivate = () => this.tryPlay(uid);
  }

  private focusedHandUid(): number | null {
    const f = this.focus.depth > 0 ? this.focus.focused : null;
    for (const [uid, w] of this.hand) if (w === f) return uid;
    return null;
  }

  private findCard(uid: number, ...states: RunState[]): CardInstance {
    for (const st of states) {
      const c = st.combat;
      const zones: CardInstance[][] = c ? [c.hand, c.draw, c.discard, c.exhaust, c.inPlay, c.primed.map((p) => p.card), c.timeline.map((t) => t.card)] : [];
      zones.push(st.player.deck);
      for (const z of zones) { const card = z.find((x) => x.uid === uid); if (card) return card; }
    }
    throw new Error(`CombatScreen: card ${uid} not found in any zone`);
  }

  private syncMinis(): void {
    for (const m of this.minis) { this.scope.remove(m); this.removeWidget(m); }
    this.minis = [];
    const c = this.combat;
    // Timeline strip above the enemies (GDD §2.8)
    const slots = timelineSlots(c.timeline.map((t) => ({ uid: t.card.uid, dueTurn: t.dueTurn, seq: t.seq })), c.turn);
    for (const t of c.timeline) {
      const slot = slots.find((x) => x.uid === t.card.uid);
      if (!slot) throw new Error(`timeline slot for ${t.card.uid} missing`);
      const def = getCardDef(t.card.id, t.card.upgraded);
      const m = this.add(new MiniCard(slot.x, slot.y, t.card.uid, def.name, { gold: t.onBeat }));
      m.setZ(Z.PANEL + 20);
      m.label = `On the Timeline: ${def.name}, resolves in ${Math.max(1, t.dueTurn - c.turn)} turn(s)${t.onBeat ? ', on the beat' : ''}.`;
      this.minis.push(m);
    }
    const showTl = c.timeline.length > 0 || this.state.classId === 'chronist';
    for (const l of this.timelineHeader) l.visible = showTl;
    this.scope.add(...this.minis);
  }

  /** Rebuild the primed rack from the state (outside animations). */
  private syncRack(): void {
    for (const m of this.rack) { this.scope.remove(m); this.removeWidget(m); }
    this.rack = [];
    for (const p of this.combat.primed) this.addRackChip(p.card.uid, p.charges);
    this.layoutRack();
  }

  private addRackChip(uid: number, charges: number): MiniCard {
    const card = this.findCard(uid, this.state);
    const name = getCardDef(card.id, card.upgraded).name;
    const m = this.add(new MiniCard(320, RACK_Y, uid, name, { w: 60, value: charges > 1 ? `×${charges}` : undefined }));
    m.setZ(Z.CARD - 2);
    m.label = `Primed: ${name}. Fires at the first enemy that attacks.`;
    this.rack.push(m);
    this.scope.add(m);
    return m;
  }

  /** The rack after this batch of events; the fight may have ended in it (then nothing stays primed). */
  private finalPrimed(): readonly PrimedEntry[] { return this.state.combat?.primed ?? []; }

  private rackSlotX(i: number, n: number): number { return 320 - Math.floor((n * 62) / 2) + i * 62; }

  private layoutRack(): void { this.rack.forEach((m, i) => m.moveTo(this.rackSlotX(i, this.rack.length), RACK_Y)); }

  private removeRackChip(m: MiniCard): void {
    this.rack = this.rack.filter((x) => x !== m);
    this.scope.remove(m);
    this.removeWidget(m);
  }

  private syncStrips(): void {
    for (const w of [...this.potionIcons, ...this.relicIcons]) { this.scope.remove(w); this.removeWidget(w); }
    this.potionIcons = [];
    this.relicIcons = [];
    const s = this.state;
    let x = W - 4 - s.player.potionSlots * 17;
    for (let i = 0; i < s.player.potionSlots; i++) {
      const id = s.player.potions[i];
      const icon = this.add(new HintIcon(x, id === undefined ? 4 : 2, this.app, id === undefined ? 'potion_empty' : itemIcon(this.app, 'potion', id)));
      icon.setZ(Z.PANEL);
      if (id === undefined) icon.focusable = false;
      else {
        icon.hint = `[magenta]${getPotionDef(id).name.toUpperCase()}[/]\n${renderPotionText(id, s)}`;
        icon.label = `${getPotionDef(id).name}: ${renderPotionText(id, s)}`;
        icon.onActivate = () => this.tryPotion(i);
      }
      this.potionIcons.push(icon);
      x += 17;
    }
    let rx = 4;
    for (const r of s.player.relics) {
      const def = getRelicDef(r.id);
      const icon = this.add(new HintIcon(rx, 2, this.app, itemIcon(this.app, 'relic', r.id)));
      icon.setZ(Z.PANEL);
      icon.hint = `[cyan]${def.name.toUpperCase()}[/]\n${renderRelicText(r.id, s)}${def.counterMax !== undefined ? `\n[grey]${r.counter}/${def.counterMax}[/]` : ''}`;
      icon.label = `${def.name}: ${renderRelicText(r.id, s)}`;
      this.relicIcons.push(icon);
      rx += 18;
    }
    this.scope.add(...this.potionIcons, ...this.relicIcons);
  }

  private updateHint(): void {
    if (!this.hint) return;
    const dev = this.app.input.lastDevice;
    const m = (a: PromptAction) => promptMarkup(dev, a, 'textHi');
    this.hint.setText(dev === 'mouse'
      ? 'CLICK A CARD TO PLAY  ·  CLICK AN ENEMY TO TARGET  ·  E END TURN  ·  HOLD I DETAILS'
      : `${dev === 'gamepad' ? '◀ ▶' : '1-0'} SELECT CARD  ·  ${m('confirm')} PLAY  ·  ${m('nextTarget')} TARGET  ·  ${m('endTurn')} END TURN  ·  HOLD ${m('info')} DETAILS`);
  }

  // ---------------------------------------------------------------- input

  private tryPlay(uid: number): void {
    if (this.animating) return;
    const card = this.combat.hand.find((c) => c.uid === uid);
    if (!card) throw new Error(`tryPlay: ${uid} not in hand`);
    const plays = this.session.legalOf('play_card').filter((a) => a.uid === uid);
    if (plays.length === 0) {
      this.app.sfx.play('cancel');
      this.app.toasts.show((unplayableReasonOrNull(this.state, card) ?? 'Cannot play that now.').toUpperCase(), 1400);
      return;
    }
    const first = plays[0] as Action;
    if (plays.length === 1) { this.app.sfx.play('confirm'); this.perform(first); return; }
    this.enterTargeting(plays.map((p) => p.target).filter((t): t is number => t !== undefined), (target) => {
      const a = plays.find((p) => p.target === target);
      if (!a) throw new Error(`target ${target} not legal for card ${uid}`);
      this.perform(a);
    }, uid);
  }

  private tryPotion(index: number): void {
    if (this.animating) return;
    const uses = this.session.legalOf('use_potion').filter((a) => a.index === index);
    if (uses.length === 0) { this.app.sfx.play('cancel'); this.app.toasts.show('CANNOT USE THAT NOW'); return; }
    if (uses.length === 1) { this.app.sfx.play('confirm'); this.perform(uses[0] as Action); return; }
    this.enterTargeting(uses.map((u) => u.target).filter((t): t is number => t !== undefined), (target) => {
      const a = uses.find((u) => u.target === target);
      if (!a) throw new Error(`potion target ${target} not legal`);
      this.perform(a);
    }, null);
  }

  private tryEndTurn(): void {
    if (this.animating) return;
    const a = this.session.findOrNull('end_turn');
    if (!a) { this.app.sfx.play('cancel'); return; }
    this.app.sfx.play('confirm');
    this.perform(a);
  }

  /** Target mode: only the legal enemies are focusable; confirm/click picks, cancel backs out. */
  private enterTargeting(targets: number[], onPick: (uid: number) => void, previewCard: number | null): void {
    const scope = this.focus.pushScope('target', () => this.exitTargeting());
    const views: EnemyView[] = [];
    targets.forEach((uid, i) => {
      const u = this.units.get(uid);
      if (!u) throw new Error(`targeting: no unit for enemy ${uid}`);
      scope.add(u.view);
      u.view.list = { key: 'targets', index: i, axis: 'x', wrap: true };
      u.view.onActivate = () => { this.exitTargeting(); this.app.sfx.play('confirm'); onPick(uid); };
      u.view.onFocus = () => { if (previewCard !== null) this.previewAgainst(previewCard, uid); };
      views.push(u.view);
    });
    this.targeting = { scope, resolve: onPick, card: previewCard };
    if (previewCard !== null) this.hand.get(previewCard)?.setAimed(true);
    this.app.toasts.show('CHOOSE A TARGET', 900);
    const firstView = views[0];
    if (firstView) this.focus.focus(firstView);
  }

  private exitTargeting(): void {
    const t = this.targeting;
    if (!t) return;
    this.targeting = null;
    if (t.card !== null) this.hand.get(t.card)?.setAimed(false);
    this.dmgPreview.visible = false;
    this.focus.popScope(t.scope);
    for (const u of this.units.values()) { u.view.list = undefined; u.view.onActivate = () => { /* inspection */ }; u.view.onFocus = null; }
    this.sync();
  }

  /** While targeting, the card's numbers include the focused target's modifiers (Exposed...). */
  private previewAgainst(cardUid: number, target: number): void {
    const f = this.hand.get(cardUid);
    const card = this.combat.hand.find((c) => c.uid === cardUid);
    if (!f || !card) return;
    f.setFace(cardFace(this.app, card, { state: this.state, target }), cardUid);
    this.detail.show(f.cardFace);
    this.showDamagePreview(cardUid, target);
  }

  /** "HP → HP after" over the target for the aimed card's damage (Block, then Guard, soak first). */
  private showDamagePreview(cardUid: number, target: number): void {
    const hits = computeDamagePreview(this.state, cardUid, target);
    const u = this.units.get(target);
    const e = this.combat.enemies.find((x) => x.uid === target);
    if (!u || !e) throw new Error(`damage preview: no enemy ${target}`);
    if (hits.length === 0) { this.dmgPreview.visible = false; return; }
    const after = hpAfterHits(e.hp, e.block, e.guard, hits);
    this.dmgPreview.setText(after === 0 ? `${e.hp} → [pink]0 HP  LETHAL[/]` : `${e.hp} → ${after} HP`);
    this.dmgPreview.moveAnchorTo(u.plate.rect.x + Math.floor(u.plate.rect.w / 2), u.plate.rect.y - 9);
    this.dmgPreview.visible = true;
  }

  private openPiles(tab: string): void {
    const c = this.combat;
    const byName = (list: readonly CardInstance[]) => [...list].sort((a, b) => getCardDef(a.id).name.localeCompare(getCardDef(b.id).name));
    const tabs: DeckTab[] = [
      { id: 'deck', title: 'DECK', cards: this.state.player.deck },
      { id: 'draw', title: 'DRAW', cards: byName(c.draw), note: 'DRAW PILE EMPTY.' },
      { id: 'discard', title: 'DISCARD', cards: c.discard },
      { id: 'exhaust', title: 'SCRAPHEAP', cards: c.exhaust },
      { id: 'timeline', title: 'TIMELINE', cards: c.timeline.map((t) => t.card), note: 'NOTHING ON THE TIMELINE.' },
    ];
    openDeckView(this, this.app, { title: 'PILES (DRAW PILE SHOWN SORTED)', tabs, initialTab: tab, state: this.state });
  }

  protected override deckTabs(): DeckTab[] { return [{ id: 'deck', title: 'DECK', cards: this.state.player.deck }]; }
  protected override openDeck(): void { this.openPiles('deck'); }

  override update(dtMs: number = 16): void {
    super.update(dtMs);
    const inp = this.app.input;
    this.app.tweens.speed = this.app.settings.animSpeed * (this.animating && inp.held('confirm') ? 4 : 1);
    this.focus.locked = this.animating;
    if (this.animating) return;
    const modalOpen = this.focus.depth > (this.targeting ? 2 : 1);
    if (this.targeting && !modalOpen) {
      if (inp.pressed('nextTarget') || inp.pressed('prevTarget')) this.focus.move(inp.pressed('nextTarget') ? 'right' : 'left');
    }
    if (!modalOpen && !this.targeting) {
      if (inp.pressed('endTurn')) this.tryEndTurn();
      for (let k = 1; k <= 10; k++) {
        if (!inp.pressed(`cardSlot${k}` as 'cardSlot1')) continue;
        const uid = this.handOrder[k - 1];
        const f = uid === undefined ? undefined : this.hand.get(uid);
        if (f) this.focus.focus(f, { sound: true });
      }
    }
    // an action above may have just started an animation (which hid the tooltips): leave them hidden
    if (!this.animating) this.updateTooltips();
  }

  private updateTooltips(): void {
    const own = this.focus.depth === (this.targeting ? 2 : 1);
    const f = own ? this.focus.focused : null; // a modal owns focus: its own panels explain it
    const info = this.app.input.held('info');
    if (f === this.tipFor && info === this.tipInfo) return;
    this.tipFor = f;
    this.tipInfo = info;
    this.tip.hide();
    this.detail.hide();
    if (!f) return;
    if (f instanceof CardFrame) { this.detail.show(f.cardFace); return; }
    if (f instanceof HintIcon && f.hint) { this.tip.show(f.rect, f.hint, f.rect.y < 100 ? 'below' : 'above'); return; }
    if (f instanceof EnemyView) {
      const u = [...this.units.values()].find((x) => x.view === f);
      if (u) {
        // keep clear of the other enemies (sprite, plate, intent) so the tooltip never hides a neighbour
        const avoid = [...this.units.values()].filter((o) => o !== u).flatMap((o) => [o.view.rect, o.plate.rect, o.intent.rect]);
        this.tip.show(f.rect, `[yellow]${getEnemyDef(u.enemyId).name.toUpperCase()}[/]\n${this.moveText(u.uid)}`, 'right', avoid);
      }
      return;
    }
    if (f instanceof MiniCard) { this.tip.show(f.rect, f.label, 'below'); return; }
    if (f instanceof Button && f.hint) { this.tip.show(f.rect, f.hint, 'above'); return; }
    if (info && f instanceof Widget) this.tip.show(f.rect, controlsText(this.app.input.lastDevice), 'above');
  }

  // ---------------------------------------------------------------- pending choices (combat level)

  protected override checkChoice(): void {
    const pc = this.state.combat?.pendingChoice ?? null; // no combat (left the phase) = no combat choice
    if (!pc || this.combatChoiceOpen || this.animating) return;
    this.combatChoiceOpen = true;
    const resolve = (uids: number[]) => { this.combatChoiceOpen = false; this.perform({ type: 'resolve_choice', uids }); };
    if (pc.resume.op === 'prune_scrap' && pc.resume.spec.variant === 'away') {
      openChoiceModal(this, this.app, this.state, pc, (uids) => {
        const uid = uids[0];
        if (uid === undefined) { resolve(uids); return; }
        const name = getCardDef(this.findCard(uid, this.state).id).name;
        confirmDialog(this, 'PRUNE AWAY', `Remove ${name} from your deck permanently?`, 'REMOVE', () => resolve(uids), 'NO');
      });
      return;
    }
    openChoiceModal(this, this.app, this.state, pc as PendingChoice, resolve);
  }

  // ---------------------------------------------------------------- apply + animate

  private perform(a: Action): void {
    if (this.animating) throw new Error('CombatScreen.perform during an animation');
    const prev = this.state;
    const events = this.session.apply(a);
    void this.runAnimations(events, prev);
  }

  private async runAnimations(events: readonly GameEvent[], prev: RunState): Promise<void> {
    this.animating = true;
    this.focus.locked = true;
    this.detail.hide();
    this.tip.hide();
    this.tipFor = null;
    this.initLive(prev);
    this.pendingTriggers.clear();
    for (const e of events) if (e.t === 'riposte_triggered') this.pendingTriggers.set(e.uid, (this.pendingTriggers.get(e.uid) ?? 0) + 1);
    for (const f of this.hand.values()) f.setTag(null);
    await this.app.scheduler.enqueue(async () => {
      for (const e of events) await this.animateEvent(e, prev);
      await this.flushInPlay();
    });
    this.animating = false;
    this.focus.locked = false;
    this.app.tweens.speed = this.app.settings.animSpeed;
    const s = this.state;
    if (s.phase !== 'combat') {
      routeAfter(this.app, this.session, prev, events);
      return;
    }
    this.sync();
    const focused = this.focus.focused;
    const first = this.hand.get(this.handOrder[0] ?? -1);
    if (first && !(focused instanceof CardFrame) && !this.targeting) this.focus.focus(first);
    this.focus.ensureFocus();
    this.checkChoice();
  }

  /**
   * The combat the animator is showing: the new state's, or (when this action ended the fight and
   * state.combat is already null) the one we started from.
   */
  private animCombat(): CombatState {
    const c = this.state.combat ?? this.animPrev?.combat ?? null;
    if (!c) throw new Error('animator: no combat state before or after the action');
    return c;
  }
  private animPrev: RunState | null = null;

  private initLive(prev: RunState): void {
    this.animPrev = prev;
    const c = prev.combat ?? this.combat;
    const pl = prev.combat ? prev.player : this.state.player;
    this.live = {
      player: { hp: pl.hp, maxHp: pl.maxHp, block: c.player.block, guard: c.player.guard, statuses: { ...c.player.statuses } },
      enemies: new Map(c.enemies.map((e) => [e.uid, { hp: e.hp, maxHp: e.maxHp, block: e.block, guard: e.guard, statuses: { ...e.statuses } }])),
      energy: c.energy, draw: c.draw.length, discard: c.discard.length, exhaust: c.exhaust.length,
    };
  }

  private liveOf(ref: EntityRef): LiveEntity {
    const L = this.live;
    if (!L) throw new Error('animator: no live model');
    if (ref === 'player') return L.player;
    let e = L.enemies.get(ref);
    if (!e) {
      const st = this.animCombat().enemies.find((x) => x.uid === ref);
      if (!st) throw new Error(`animator: unknown enemy ${ref}`);
      e = { hp: st.hp, maxHp: st.maxHp, block: st.block, guard: st.guard, statuses: { ...st.statuses } };
      L.enemies.set(ref, e);
    }
    return e;
  }

  private showLive(ref: EntityRef): void {
    const e = this.liveOf(ref);
    if (ref === 'player') { this.showPlayer(e); return; }
    const u = this.units.get(ref);
    if (!u) return; // enemy already gone from the screen (died earlier in this batch)
    u.plate.set(e.hp, e.maxHp, e.block, e.guard, e.statuses['rot'] ?? 0);
    u.plate.statuses.set(this.statusViews(e.statuses, ref));
  }

  private posOf(ref: EntityRef): { x: number; y: number } {
    if (ref === 'player') return { x: 64, y: 252 };
    const u = this.units.get(ref);
    if (!u) return { x: 320, y: 140 };
    return { x: u.view.rect.x + Math.floor(u.view.rect.w / 2), y: u.view.rect.y + Math.floor(u.view.rect.h / 3) };
  }

  private wait(ms: number): Promise<void> { return this.app.tweens.delay(ms); }

  private flyTo(w: Widget, x: number, y: number, ms: number): Promise<void> {
    const o = { x: w.rect.x, y: w.rect.y };
    let done = false;
    this.app.tweens.every(() => { w.moveTo(Math.round(o.x), Math.round(o.y)); return !done; });
    return this.app.tweens.to(o, { x, y }, ms).then(() => { done = true; w.moveTo(x, y); });
  }

  private relayoutHand(ms: number): Promise<void> {
    const order = this.handOrder.filter((u) => this.hand.has(u));
    const slots = handSlots(Math.min(10, order.length));
    return Promise.all(order.map((uid, i) => {
      const f = this.hand.get(uid) as CardFrame;
      const s = slots[i];
      if (!s) return Promise.resolve();
      f.restZ = Z.CARD + i * 4;
      f.setZ(f.restZ);
      return this.flyTo(f, s.x, s.y, ms);
    })).then(() => undefined);
  }

  private async flushInPlay(): Promise<void> {
    const ip = this.inPlay;
    if (!ip) return;
    this.inPlay = null;
    await this.flyTo(ip.frame, PILES.discard.x - 32, PILES.discard.y - 10, STEP);
    this.removeWidget(ip.frame);
  }

  private takeFromHand(uid: number): CardFrame | null {
    const f = this.hand.get(uid);
    if (!f) return null;
    this.hand.delete(uid);
    this.handOrder = this.handOrder.filter((u) => u !== uid);
    this.scope.remove(f);
    return f;
  }

  private async animateEvent(e: GameEvent, prev: RunState): Promise<void> {
    const L = this.live;
    if (!L) throw new Error('animator: no live model');
    const root = this.root;
    switch (e.t) {
      case 'turn_start':
        this.metronome?.set(0, false);
        await banner(this.app, root, 'YOUR TURN', 420);
        break;
      case 'enemy_turn_start':
        await banner(this.app, root, 'ENEMY TURN', 380);
        break;
      case 'turn_end':
        break;
      case 'draw':
        for (const uid of e.uids) {
          const card = this.findCard(uid, this.state, prev);
          let f = this.hand.get(uid);
          if (!f) {
            f = this.add(new CardFrame(PILES.draw.x - 32, PILES.draw.y - 20, cardFace(this.app, card, { state: this.state }), uid));
            this.wireCard(f, uid);
            this.hand.set(uid, f);
            this.handOrder.push(uid);
            this.handOnly.add(uid);
          }
          if (!f.visible) f.moveTo(PILES.draw.x - 32, PILES.draw.y - 20); // created hidden by the entry sync
          f.visible = true;
          L.draw = Math.max(0, L.draw - 1);
          this.app.sfx.play('draw');
          void this.relayoutHand(STEP);
          await this.wait(55);
        }
        await this.wait(STEP);
        break;
      case 'discard':
      case 'exhaust': {
        const to = e.t === 'discard' ? PILES.discard : PILES.scrap;
        const moves: Promise<void>[] = [];
        for (const uid of e.uids) {
          const f = this.takeFromHand(uid) ?? (this.inPlay?.uid === uid ? this.inPlay.frame : null);
          if (this.inPlay?.uid === uid) this.inPlay = null;
          if (e.t === 'discard') L.discard += 1; else L.exhaust += 1;
          if (!f) continue;
          if (e.t === 'exhaust') { this.lastScrapAt = { x: f.rect.x + 32, y: f.rect.y + 30 }; f.setDimmed(true); }
          moves.push(this.flyTo(f, to.x - 32, to.y - 10, STEP).then(() => this.removeWidget(f)));
        }
        await Promise.all(moves);
        void this.relayoutHand(STEP);
        break;
      }
      case 'shuffle':
        L.draw += L.discard;
        L.discard = 0;
        void floatText(this.app, root, PILES.draw.x, PILES.draw.y - 16, 'SHUFFLE', C.cyan);
        await this.wait(STEP);
        break;
      case 'card_played': {
        await this.flushInPlay();
        const f = this.takeFromHand(e.uid);
        if (e.onBeat) { this.metronome?.set(0, true); void floatText(this.app, root, 320, 120, 'ON THE BEAT!', C.yellow, { big: true }); }
        if (f) {
          f.setZ(Z.CARD_TOP + 10);
          await this.flyTo(f, 288, 112, STEP + 30);
          this.inPlay = { uid: e.uid, frame: f };
          await this.wait(70);
        }
        void this.relayoutHand(STEP);
        break;
      }
      case 'damage': {
        const t = this.liveOf(e.target);
        t.block = Math.max(0, t.block - e.blocked);
        t.guard = Math.max(0, t.guard - e.guarded);
        t.hp = Math.max(0, t.hp - e.hpLost);
        this.showLive(e.target);
        const p = this.posOf(e.target);
        if (e.kind === 'hp_loss') {
          void floatText(this.app, root, p.x, p.y, `-${e.hpLost}`, C.lilac, { big: true });
        } else {
          if (e.hpLost > 0) void floatText(this.app, root, p.x, p.y, `-${e.hpLost}`, C.red, { big: true });
          if (e.blocked + e.guarded > 0) void floatText(this.app, root, p.x, p.y + (e.hpLost > 0 ? 12 : 0), e.hpLost > 0 ? `${e.blocked + e.guarded} BLOCKED` : 'BLOCKED', C.skyBlue);
          if (e.hpLost === 0 && e.blocked + e.guarded === 0) void floatText(this.app, root, p.x, p.y, String(e.amount), C.white, { big: true });
        }
        this.app.sfx.play(e.target === 'player' ? (e.hpLost > 0 ? 'hurt' : 'block') : 'hit');
        if (e.amount >= BIG_HIT) void shake(this.app.tweens, this.root, 5, 320); // big hits shake the whole screen
        else if (e.target === 'player') void shake(this.app.tweens, this.root, e.hpLost > 0 ? 3 : 1, 180);
        else {
          const u = this.units.get(e.target);
          if (u && (e.hpLost > 0 || e.kind === 'attack')) await u.view.hit(this.app.tweens, e.hpLost > 0 ? 3 : 1, 200);
        }
        await this.wait(40);
        break;
      }
      case 'block': {
        const t = this.liveOf(e.target);
        if (e.pool === 'guard') t.guard += e.amount; else t.block += e.amount;
        this.showLive(e.target);
        const p = this.posOf(e.target);
        void floatText(this.app, root, p.x, p.y + 10, `+${e.amount} ${e.pool === 'guard' ? 'GUARD' : 'BLOCK'}`, e.pool === 'guard' ? C.amber : C.skyBlue);
        this.app.sfx.play('block');
        await this.wait(STEP);
        break;
      }
      case 'block_lost': {
        const t = this.liveOf(e.target);
        t.block = Math.max(0, t.block - e.amount);
        this.showLive(e.target);
        break;
      }
      case 'guard_decay': {
        const t = this.liveOf(e.target);
        const before = t.guard;
        t.guard = e.now;
        this.showLive(e.target);
        if (e.lost > 0) {
          const p = this.posOf(e.target);
          await floatText(this.app, root, p.x, p.y + 10, `GUARD ${before} → ${e.now}`, C.amber, { ms: 500 });
        }
        break;
      }
      case 'heal': {
        const t = this.liveOf(e.target);
        t.hp = Math.min(t.maxHp, t.hp + e.amount);
        this.showLive(e.target);
        const p = this.posOf(e.target);
        void floatText(this.app, root, p.x, p.y, `+${e.amount}`, C.lime, { big: true });
        await this.wait(STEP);
        break;
      }
      case 'max_hp':
        L.player.maxHp = e.now;
        this.showLive('player');
        break;
      case 'status': {
        const t = this.liveOf(e.target);
        if (e.now === 0) delete t.statuses[e.status];
        else t.statuses[e.status] = e.now;
        this.showLive(e.target);
        const def = getStatusDef(e.status);
        if (!def.hidden && e.delta !== 0) {
          const p = this.posOf(e.target);
          const col = e.status === 'rot' ? C.lilac : def.isDebuff ? C.pink : C.lime;
          const text = e.status === 'rot' && e.delta === 1 ? '+1 ROT' : `${e.delta > 0 ? '+' : ''}${e.delta} ${def.name.toUpperCase()}`;
          void floatText(this.app, root, p.x, p.y - 14, text, col);
          if (POP_STATUSES.has(e.status) && e.delta > 0) void iconPop(this.app, root, p.x, p.y - 30, statusIcon(e.status));
          await this.wait(60);
        }
        break;
      }
      case 'energy':
        L.energy = e.now;
        this.energy.set(e.now, this.animCombat().maxEnergy);
        break;
      case 'enemy_intent':
      case 'enemy_forecast':
        break; // shown by sync() after the batch (the intent box flickers when the forecast changes)
      case 'enemy_move': {
        const u = this.units.get(e.uid);
        // the move being made is the intent shown before this batch (the final state already holds the next one)
        const intent = prev.combat?.enemies.find((x) => x.uid === e.uid)?.intent;
        const attacking = intent !== undefined && isAttackKind(intent.kind);
        if (u && attacking) void u.view.lunge(this.app.tweens);
        else if (u) void shake(this.app.tweens, u.view.node, 2, 120);
        await banner(this.app, root, e.name.toUpperCase(), 300, 'top');
        break;
      }
      case 'enemy_phase': {
        // boss phase change: a short palette flash toward white (whole SMS levels), then a banner
        const d = this.app.display;
        for (const lv of [1, 2, 3, 2, 1, 0]) { d.setFade(lv); await this.wait(40); }
        this.app.sfx.play('hurt');
        await banner(this.app, root, `PHASE ${e.phase}`, 450);
        break;
      }
      case 'attack_cancelled': {
        const p = this.posOf(e.uid);
        await floatText(this.app, root, p.x, p.y, 'CANCELLED', C.yellow, { big: true, ms: 450 });
        break;
      }
      case 'enemy_spawned':
      case 'enemy_transformed':
        this.sync();
        await this.wait(STEP);
        break;
      case 'enemy_died':
      case 'enemy_fled': {
        const u = this.units.get(e.uid);
        if (u) {
          await blinkOut(this.app.tweens, u.view.sprite, 260);
          this.removeUnit(u);
        }
        break;
      }
      case 'player_died':
        this.app.sfx.play('lose');
        await banner(this.app, root, 'DEFEATED', 700);
        break;
      case 'combat_won':
        this.app.sfx.play('win');
        await banner(this.app, root, 'VICTORY', 600);
        break;
      case 'card_primed': {
        const f = this.takeFromHand(e.uid);
        const n = this.rack.length + 1;
        if (f) {
          await this.flyTo(f, this.rackSlotX(n - 1, n), RACK_Y - 30, STEP);
          this.removeWidget(f);
        }
        const finalEntry = this.finalPrimed().find((p) => p.card.uid === e.uid); // absent: it fired or fizzled later in this batch
        this.addRackChip(e.uid, finalEntry ? finalEntry.charges + (this.pendingTriggers.get(e.uid) ?? 0) : 1);
        this.layoutRack();
        void floatText(this.app, root, 320, RACK_Y - 8, 'PRIMED', C.iceBlue);
        break;
      }
      case 'riposte_triggered': {
        const name = getCardDef(this.findCard(e.uid, this.state, prev).id).name;
        const p = this.posOf(e.attacker);
        const left = (this.pendingTriggers.get(e.uid) ?? 1) - 1;
        this.pendingTriggers.set(e.uid, left);
        const chip = this.rack.find((m) => m.uid === e.uid);
        const home = chip ? { x: chip.rect.x, y: chip.rect.y } : null;
        if (chip) await this.flyTo(chip, p.x - 30, p.y, STEP + 40);
        const u = this.units.get(e.attacker);
        if (u) void flash(this.app.tweens, u.view.sprite, 200);
        await floatText(this.app, root, p.x, p.y - 24, `RIPOSTE! ${name.toUpperCase()}`, C.iceBlue, { big: true, ms: 450 });
        // a chip with charges left (more triggers this batch, or still primed at the end) flies home
        const stays = left > 0 || this.finalPrimed().some((x) => x.card.uid === e.uid);
        if (chip && home && stays) await this.flyTo(chip, home.x, home.y, STEP);
        else if (chip) { this.removeRackChip(chip); this.layoutRack(); }
        break;
      }
      case 'prime_fizzled': {
        const chip = this.rack.find((m) => m.uid === e.uid);
        if (chip) {
          await blinkOut(this.app.tweens, { setDim: (n) => { chip.visible = n < 3; } }, 200);
          this.removeRackChip(chip);
          this.layoutRack();
        }
        void floatText(this.app, root, 320, RACK_Y - 8, 'FIZZLED', C.textMuted);
        break;
      }
      case 'timeline_added': {
        const ip = this.inPlay?.uid === e.uid ? this.inPlay : null;
        if (ip) {
          this.inPlay = null;
          await this.flyTo(ip.frame, TIMELINE.x + 40, TIMELINE.y, STEP + 20);
          this.removeWidget(ip.frame);
        }
        void floatText(this.app, root, TIMELINE.x + 60, TIMELINE.y + 24, e.onBeat ? 'DELAYED (ON BEAT)' : 'DELAYED', e.onBeat ? C.yellow : C.iceBlue);
        break;
      }
      case 'timeline_shifted':
        void floatText(this.app, root, TIMELINE.x + 160, TIMELINE.y + 24, e.delta < 0 ? `ADVANCE ${-e.delta}` : `POSTPONE ${e.delta}`, C.iceBlue);
        this.syncMinis();
        await this.wait(STEP);
        break;
      case 'timeline_resolved': {
        const chip = this.minis.find((m) => m.uid === e.uid);
        if (chip) {
          for (let i = 0; i < 3; i++) { chip.visible = false; await this.wait(40); chip.visible = true; await this.wait(40); }
          chip.visible = false;
        }
        await floatText(this.app, root, 320, 70, `${getCardDef(this.findCard(e.uid, this.state, prev).id).name.toUpperCase()} RESOLVES`, C.iceBlue, { ms: 400 });
        break;
      }
      case 'bloom': {
        const f = this.hand.get(e.uid);
        const to = f ? { x: f.rect.x + 52, y: f.rect.y + 30 } : { x: 64, y: 252 };
        if (this.lastScrapAt) {
          const leaf = this.add(new Icon(this.lastScrapAt.x, this.lastScrapAt.y, this.app.icons, 'leaf'));
          leaf.setZ(Z.TOAST - 5);
          await this.flyTo(leaf, to.x - 6, to.y - 6, STEP + 60);
          this.removeWidget(leaf);
          this.lastScrapAt = null;
        }
        await floatText(this.app, root, to.x, to.y - 10, `${e.delta > 0 ? '+' : ''}${e.delta} ✿`, C.lime, { big: true, ms: 420 });
        break;
      }
      case 'relic_trigger': {
        const i = this.state.player.relics.findIndex((r) => r.id === e.relic);
        const icon = this.relicIcons[i];
        if (icon) void flash(this.app.tweens, icon.sprite, 300);
        break;
      }
      case 'cap_hit':
        this.app.toasts.show(`${e.cap.replace(/^cap_/, '').replace(/_/g, ' ').toUpperCase()} REACHED`, 1600);
        break;
      case 'text':
        this.app.toasts.show(e.text.toUpperCase(), 1800);
        break;
      case 'card_added':
        if (e.where === 'hand') {
          const f = this.add(new CardFrame(320 - 32, 120, cardFace(this.app, e.card, { state: this.state }), e.card.uid));
          this.wireCard(f, e.card.uid);
          this.hand.set(e.card.uid, f);
          this.handOrder.push(e.card.uid);
          void this.relayoutHand(STEP);
          await this.wait(STEP);
        } else {
          void floatText(this.app, root, 320, 120, `+ ${getCardDef(e.card.id, e.card.upgraded).name.toUpperCase()}`, C.text);
          if (e.where === 'draw') L.draw += 1; else if (e.where === 'discard') L.discard += 1;
        }
        break;
      case 'card_upgraded': {
        const f = this.hand.get(e.uid);
        if (f) void floatText(this.app, root, f.rect.x + 32, f.rect.y, 'UPGRADED', C.lime);
        break;
      }
      case 'gold':
      case 'shards':
      case 'relic_gained':
      case 'relic_lost':
      case 'potion_gained':
      case 'potion_lost':
      case 'card_removed':
        this.toastEvents([e]);
        break;
      case 'potion_used':
        this.app.sfx.play('confirm');
        void floatText(this.app, root, 320, 120, getPotionDef(e.potion).name.toUpperCase(), C.magenta);
        break;
      case 'choice':
      case 'phase':
        break;
      default:
        warnUnhandled(e);
    }
  }
}

const unhandled = new Set<string>();
function warnUnhandled(e: { t: string }): void {
  if (unhandled.has(e.t)) return;
  unhandled.add(e.t);
  console.warn(`[combat] no animation for event "${e.t}" (state is still synced afterwards)`);
}
