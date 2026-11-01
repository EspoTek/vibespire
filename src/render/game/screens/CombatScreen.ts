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
import { getCardDef, getEnemyDef, getPotionDef, getRelicDef, getStatusDef, keywordsFor } from '../../../content/index.ts';
import {
  computeDamagePreview, effectTextValues, isBloomCard, isRipe, nextBeat, renderMoveText, renderPotionText, renderRelicText, renderStatusText, riposteWillTrigger, TUNING,
  type Action, type CardInstance, type CombatState, type EntityRef, type GameEvent, type Intent, type PendingChoice, type PrimedEntry, type RunState,
} from '../../../engine/index.ts';
import type { App } from '../../app.ts';
import { actBackdrop } from '../../assets.ts';
import { ENEMY_BASELINE_Y } from '../../backdrops.ts';
import type { FocusScope } from '../../focus.ts';
import { fonts } from '../../fonts.ts';
import { rect, W, type Rect, type Side } from '../../layout.ts';
import { C } from '../../palette.ts';
import { flash } from '../../tween.ts';
import { Cue, logCue } from '../../fx/cue.ts';
import { bossIntro, eliteIntro, enemyDeath, leafBurst, parryImpact, rotBubbles } from '../../fx/combatFx.ts';
import { Juice } from '../../fx/juice.ts';
import { BankLabel, EmberGlow, ReserveMeter, RipeRim, SpriteMarks } from '../../fx/overlays.ts';
import { actSong, bossSong, type SongName } from '../../music.ts';
import { Button } from '../../ui/Button.ts';
import { CardFrame, type CardFace } from '../../ui/CardFrame.ts';
import { CARD_COLORS } from '../../ui/art.ts';
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
import { handSlots, enemyCenters, battleScale, timelineSlots, timelineWindowRect, TIMELINE, PLATE_W } from '../handLayout.ts';
import { HintArea, HintIcon, placeholderPortrait } from '../hud.ts';
import { hpAfterHits, isAttackKind } from '../intents.ts';
import { CardDetail, confirmDialog, controlsText } from '../overlays.ts';
import { routeAfter } from '../router.ts';
import { openChoiceModal, RunScreen } from '../RunScreen.ts';
import type { RunSession } from '../session.ts';
import { bloomOf, cardFace, enemyAtlas, itemIcon, portraitOrNull, primeForecast, statusIcon, unplayableReasonOrNull } from '../view.ts';
import {
  bloomCounterHint, cadenceHint, defenceHint, endOfTurnTag, enemyHint, energyHint, intentHint, onslaughtHint, pileHint, potionHint, primedHint, relicHint, timelineHeaderHint, timelineHint,
} from '../explain.ts';
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
/**
 * Primed rack row, just above the hand. Vertical budget of the battle line (y): enemy plate 202-230,
 * its status row 231-243 (six icons fit one row), rack 244-256, hand-card end-of-turn tags 261-269,
 * hand 270+. The first-fight controls hint lives in the right panel, out of this band.
 */
const RACK_Y = 244;
const PILES = { draw: { x: 534, y: 318 }, discard: { x: 576, y: 318 }, scrap: { x: 618, y: 318 } } as const;
/** Where a played card is staged while it resolves: the player's side, clear of the enemy row. */
const PLAY = { x: 28, y: 118, cx: 60, cy: 162 } as const;

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
  /** Focus / hover target over the HP bar and defence readout (explains Block and Guard). */
  private defenceArea!: HintArea;
  /** Focus / hover target over the Timeline column headers. */
  private timelineArea: HintArea | null = null;
  /** The Timeline's PS window (black fill, white border). */
  private timelineWindow: Panel | null = null;
  /** "PRIMED:" before the rack chips. */
  private rackLabel: Label | null = null;
  /** Enemy the hand's live numbers are computed against (last hovered / aimed; or the only one). */
  private aimTarget: number | null = null;
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
  private tipFace: CardFace | null = null;
  private tipInfo = false;
  private combatChoiceOpen = false;
  private handOnly = new Set<number>(); // uids drawn this batch not yet in sync
  // ---- juice (fx/): per-screen effects kit and the animator's per-batch / per-turn counters
  private juice!: Juice;
  /** Boss / elite intro still to play before the opening draws. */
  private introPending: 'boss' | 'elite' | null = null;
  /** Cadence beats reached this turn (1..3) and counted plays, as the animator replays them. */
  private beatsThisTurn = 0;
  private playsThisTurn = 0;
  /** Consecutive player hits since the last card play (pitch climbs with them). */
  private comboHits = 0;
  /** Timeline resolves so far in this batch (the cascade climbs). */
  private resolvesThisBatch = 0;
  /** A Rotting enemy just died here: the next Rot gain on a neighbour is its spread. */
  private spreadFrom: { x: number; y: number } | null = null;
  /** This batch resolves a Prune: its Scrap is a snip. */
  private pruneSnipPending = false;
  /** The boss intro already revealed the opening enemies: their spawn events stay quiet. */
  private introRevealed = false;
  /** v2 overlays (fx/overlays.ts): Embers coals, Reserve pips, next-turn bank, Ripe rims, enemy marks. */
  private emberGlow!: EmberGlow;
  private reserveMeter!: ReserveMeter;
  private bankLabel!: BankLabel;
  private readonly ripeRims = new Map<number, RipeRim>();
  private readonly marks = new Map<number, SpriteMarks>();
  /** The batch being animated (handlers look ahead: a Shed feeding Molten Shell, a Harvest's Rot drop). */
  private batch: readonly GameEvent[] = [];
  private batchAt = 0;
  /** Timeline cards resolved in this batch (Eternal Return puts one straight back). */
  private readonly resolvedThisBatch = new Set<number>();
  /** Prune snips so far in this batch (Clear-Cut's cascade climbs). */
  private snips = 0;
  /** Last card that grew (a Spill flies on from it). */
  private lastBloomAt: { x: number; y: number } | null = null;
  /** Last music beat the Cadence meter pulsed on. */
  private lastBeat = -1;

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
    this.juice = new Juice(this.app, this.root);
    if (this.entryEvents.length > 0) this.introPending = this.combat.isBoss ? 'boss' : this.combat.isElite ? 'elite' : null;
    // player plate
    const plate = this.add(new Panel(rect(2, 236, 124, 122)));
    plate.setZ(Z.PANEL);
    const portrait = portraitOrNull(this.app, s.classId, true);
    if (portrait) plate.addChild(new Icon(8, 242, portrait, portrait.names()[0] as string), 1);
    else plate.addChild(new Picture(8, 242, placeholderPortrait(s.classId, 32)), 1);
    this.counterIcon = plate.addChild(new Icon(44, 242, this.app.icons, s.classId === 'graft' ? 'leaf' : 'onslaught'), 2);
    this.counterIcon.focusable = true; // hover / focus explains the class counter (hint set in showPlayer)
    this.counterIcon.activateSound = false;
    this.counterLabel = plate.addChild(new Label(58, 244, '', { color: C.text }), 2);
    this.playerHp = plate.addChild(new HpBar(8, 278, 112, 8), 2);
    this.playerHpText = plate.addChild(new Label(8, 288, '', { font: fonts.small }), 2);
    this.playerDef = plate.addChild(new Label(120, 288, '', { font: fonts.small, align: 'right', markup: true }), 2);
    this.defenceArea = plate.addChild(new HintArea(rect(8, 277, 112, 18)), 4);
    this.playerStatuses = plate.addChild(new StatusRow(this.app, 8, 298, 112), 3);
    this.playerStatuses.onIconsChanged = (removed, added) => this.registerIcons(removed, added);
    // energy, metronome, end turn, piles
    const right = this.add(new Panel(rect(514, 236, 124, 122)));
    right.setZ(Z.PANEL);
    this.energy = right.addChild(new EnergyOrb(522, 248), 2);
    if (this.usesCadence()) {
      this.metronome = right.addChild(new Metronome(522, 240), 2);
      this.metronome.focusable = true;
      this.metronome.activateSound = false;
    }
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
    this.emberGlow = plate.addChild(new EmberGlow(86, 258), 3);
    this.reserveMeter = right.addChild(new ReserveMeter(518, 280, TUNING.caps.status['reserve'] ?? 5), 3); // reserve cap is in TUNING (5)
    this.bankLabel = right.addChild(new BankLabel(518, 292), 3);
    this.detail = this.add(new CardDetail(4, 24, 150)); // keyword boxes go below it, above the player plate
    this.dmgPreview = this.add(new Label(0, 0, '', { font: fonts.small, align: 'center', color: C.yellow, outline: C.black, markup: true }));
    this.dmgPreview.setZ(Z.PANEL + 30);
    this.dmgPreview.visible = false;
    this.tip = this.add(new Tooltip({ maxWidth: 170 }));
    if (s.floor <= 1 && this.combat.turn <= 1) {
      // first fight: the controls, in the right panel under the piles (nothing else draws there)
      this.hint = this.add(new Label(520, 322, '', { font: fonts.small, color: C.textMuted, markup: true, maxWidth: 114, lineHeight: 7 }));
      this.hint.setZ(Z.PANEL + 5);
    }
    // the Timeline window (Chronist core): a PS box behind three labelled columns of chips
    const tw = timelineWindowRect();
    this.timelineWindow = this.add(new Panel(rect(tw.x, tw.y, tw.w, tw.h), { fill: C.black }));
    this.timelineWindow.setZ(Z.PANEL + 15);
    this.timelineWindow.visible = false;
    // one-time tips never cover an intent, the Timeline or the card detail
    this.tips.avoid = () => {
      const out: Rect[] = [];
      for (const u of this.units.values()) if (!u.dead) out.push(u.intent.rect);
      if (this.timelineWindow?.visible) out.push(this.timelineWindow.rect);
      if (this.detail.visible) { out.push(this.detail.rect); if (this.detail.keywords.visible) out.push(this.detail.keywords.bounds); }
      return out;
    };
    for (let i = 0; i < 3; i++) {
      const l = this.add(new Label(TIMELINE.x + i * (TIMELINE.colW + TIMELINE.gapX) + 2, TIMELINE.y, '', { font: fonts.small, color: C.iceBlue }));
      l.setZ(Z.PANEL + 21);
      l.visible = false;
      this.timelineHeader.push(l);
    }
    this.timelineArea = this.add(new HintArea(rect(TIMELINE.x, TIMELINE.y - 1, 3 * TIMELINE.colW + 2 * TIMELINE.gapX, 9)));
    this.timelineArea.visible = false;
    this.timelineArea.focusable = false;
    this.scope.add(plate, right, this.timelineArea);
    // entry: animate the opening draws if we arrived from the map; else (continue) just sync
    if (this.entryEvents.length > 0) {
      this.sync({ hideHand: true });
      void this.runAnimations(this.entryEvents, this.state);
    } else {
      this.sync();
      const first = this.hand.get(this.handOrder[0] ?? -1);
      if (first) this.focus.focus(first);
    }
    this.syncOverlays();
  }

  /** Overlays from the state (after each batch; during a batch the event handlers drive them). */
  private syncOverlays(): void {
    const c = this.state.combat;
    if (!c) return;
    const st = c.player.statuses;
    this.emberGlow.set(st['embers'] ?? 0); // absent = no Embers
    this.reserveMeter.set(st['reserve'] ?? 0); // absent = no Reserve
    this.bankLabel.set(c.counters['bankEnergy'] ?? 0, c.counters['bankDraw'] ?? 0); // absent = nothing banked
    // Ripe Bloom cards in hand wear a gold rim
    for (const card of c.hand) {
      const f = this.hand.get(card.uid);
      const ripe = f !== undefined && isBloomCard(card) && isRipe(this.state, card);
      const rim = this.ripeRims.get(card.uid);
      if (ripe && f && (!rim || rim.parent !== f)) { rim?.dispose(); this.ripeRims.set(card.uid, f.addChild(new RipeRim(f.rect.x, f.rect.y), 6)); }
      else if (!ripe && rim) { rim.dispose(); this.ripeRims.delete(card.uid); }
    }
    for (const [uid, rim] of this.ripeRims) if (!c.hand.some((x) => x.uid === uid)) { rim.dispose(); this.ripeRims.delete(uid); }
    // enemy marks: a crack while Crazing holds their Exposed, Goad's taunt
    const crazing = (st['crazing'] ?? 0) > 0; // absent = no Crazing
    for (const e of c.enemies) this.setMarks(e.uid, crazing && (e.statuses['exposed'] ?? 0) > 0, (e.statuses['goaded'] ?? 0) > 0);
    for (const [uid, m] of this.marks) if (!this.units.has(uid)) { m.dispose(); this.marks.delete(uid); }
  }

  private setMarks(uid: number, crack: boolean, goad: boolean): void {
    const u = this.units.get(uid);
    if (!u) return; // gone from the screen
    let m = this.marks.get(uid);
    if (!m) { if (!crack && !goad) return; m = new SpriteMarks(u.view.sprite); this.marks.set(uid, m); }
    m.layout();
    m.set(crack, goad);
  }

  protected refresh(_e: readonly GameEvent[]): void { this.sync(); }

  /** Boss fights play the act's boss theme (switching on a bar line); everything else the act loop. */
  override get music(): SongName {
    const act = this.session.state.act;
    return this.session.state.combat?.isBoss ? bossSong(act) : actSong(act);
  }

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
      // the forecast ("NEXT") shows only with Augury (GDD §2.9); the engine computes it for everyone
      const forecast = this.seesForecast() ? e.forecast : [];
      u.intent.set(e.intent, this.baseDamage(e.id, e.intent), forecast.map((f) => ({ intent: f, base: this.baseDamage(e.id, f) })), willParry(e.uid));
      u.intent.moveTo(cx - Math.floor(u.intent.rect.w / 2), u.intent.rect.y);
      u.view.label = this.enemyLabel(e.uid);
      const base = (it: Intent) => this.baseDamage(e.id, it);
      u.view.hint = enemyHint(s, e.uid, base, this.seesForecast());
      u.intent.hint = intentHint(s, e.uid, base, this.seesForecast());
    });
    // player
    this.showPlayer({ hp: s.player.hp, maxHp: s.player.maxHp, block: c.player.block, guard: c.player.guard, statuses: c.player.statuses });
    this.energy.set(c.energy, c.maxEnergy);
    this.energy.hint = energyHint(c.energy, c.maxEnergy);
    const played = c.cardsPlayedThisTurn.length + (c.counters['beatOffset'] ?? 0); // beatOffset exists only after Tempo Draught
    const nextIsBeat = TUNING.cadence.beats.includes(played + 1);
    this.metronome?.set(played % 3, false);
    if (this.metronome) this.metronome.hint = cadenceHint(played, nextBeat(s).positions);
    this.pileButtons.forEach((b, i) => b.setText(`${['DRAW', 'DISC', 'SCRAP'][i]} ${[c.draw.length, c.discard.length, c.exhaust.length][i]}`));
    this.pileButtons.forEach((b, i) => { b.hint = pileHint((['draw', 'discard', 'exhaust'] as const)[i] ?? 'draw', [c.draw.length, c.discard.length, c.exhaust.length][i] ?? 0); });
    // hand
    const handUids = c.hand.map((x) => x.uid);
    for (const [uid, f] of this.hand) if (!handUids.includes(uid)) { this.scope.remove(f); this.removeWidget(f); this.hand.delete(uid); }
    const slots = handSlots(c.hand.length);
    c.hand.forEach((card, i) => {
      let f = this.hand.get(card.uid);
      const beat = this.metronome !== null && nextIsBeat;
      // live numbers against the enemy last hovered / aimed at (or the only one): green up, red down
      const face = cardFace(this.app, card, { state: s, beat, target: this.handTarget() });
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
      // what ending the turn does to this card (primed / kept / Scrapped / its own rule), boxed above it
      const card = c.hand.find((x) => x.uid === uid);
      if (!card) throw new Error(`hand frame ${uid} has no hand card`);
      const tag = endOfTurnTag(card, prime);
      f.setTag(tag ? tag.text : null, tag ? C[tag.color] : C.iceBlue, tag ? `[${tag.color}]${tag.hint}[/]` : '');
    }
    // potions / relics strips (top)
    this.syncStrips();
    // end turn availability
    this.endTurn.setEnabled(this.session.findOrNull('end_turn') !== null);
    this.updateHint();
    this.offerCombatTips(nextIsBeat);
    if (focusedUid !== null && this.hand.has(focusedUid) && !opts.hideHand) this.focus.focus(this.hand.get(focusedUid) as CardFrame);
  }

  /** Show the Cadence metronome: the Chronist, or any deck with "On beat" cards (GDD §2.7). */
  private usesCadence(): boolean {
    const s = this.state;
    return s.classId === 'chronist' || s.player.deck.some((c) => /on beat/i.test(getCardDef(c.id, c.upgraded).text));
  }

  private statusViews(st: Record<string, number>, owner: EntityRef): StatusView[] {
    const textState = this.animState; // status text may read combat numbers (Iron Patience, BUG-4)
    return Object.entries(st).filter(([, v]) => v !== 0).map(([id, stacks]) => ({
      id, stacks, text: `[yellow]${getStatusDef(id).name.toUpperCase()} ${stacks}[/]\n${renderStatusText(id, stacks, owner, textState)}`,
    }));
  }

  private showPlayer(p: LiveEntity): void {
    this.playerHp.set(p.hp, p.maxHp, p.block, p.guard);
    this.playerHpText.setText(`HP ${p.hp}/${p.maxHp}`).setColor(p.hp * 4 <= p.maxHp ? C.red : C.text);
    this.playerDef.setText(`${p.block > 0 ? `[skyBlue]BLK ${p.block}[/]` : ''}${p.guard > 0 ? ` [amber]GRD ${p.guard}[/]` : ''}`);
    this.playerStatuses.set(this.statusViews(p.statuses, 'player'));
    const s = this.state;
    this.defenceArea.hint = defenceHint(p.block, p.guard, p.hp, p.maxHp);
    if (s.classId === 'graft') {
      const blooms = s.player.deck.map((c) => bloomOf(c)).filter((b): b is number => b !== null);
      this.counterLabel.setText(`${blooms.length}/${blooms.reduce((a, b) => a + b, 0)}`);
      this.counterIcon.label = `Bloom: ${blooms.length} Bloom cards, ${blooms.reduce((a, b) => a + b, 0)} Bloom total`;
      this.counterIcon.hint = bloomCounterHint(blooms.length, blooms.reduce((a, b) => a + b, 0));
    } else {
      const on = p.statuses['onslaught'] ?? 0; // absent = 0 stacks (statuses are removed at 0)
      this.counterLabel.setText(String(on)).setColor(on > 0 ? C.red : C.textDim);
      this.counterIcon.visible = s.classId === 'breaker' || on > 0;
      this.counterLabel.visible = this.counterIcon.visible;
      this.counterIcon.focusable = this.counterIcon.visible;
      this.counterIcon.hint = onslaughtHint(on, p.statuses['onslaught_keep'] ?? 0); // absent = nothing kept
    }
  }

  /** Status icons are rebuilt as stacks change: keep the root scope's focus list in step (hover / focus tooltips). */
  private registerIcons(removed: readonly Widget[], added: readonly Widget[]): void {
    for (const w of removed) this.scope.remove(w);
    this.scope.add(...added);
  }

  /** First time a mechanic is on screen: a one-time tip (game/tips.ts). */
  private offerCombatTips(nextIsBeat: boolean): void {
    const c = this.combat;
    const handKw = new Set(c.hand.flatMap((card) => keywordsFor(getCardDef(card.id), card.upgraded)));
    if (handKw.has('riposte')) this.tips.offer('riposte');
    if (c.player.guard > 0) this.tips.offer('guard');
    if ((c.player.statuses['onslaught'] ?? 0) > 0) this.tips.offer('onslaught'); // absent = 0
    if (handKw.has('bloom') || handKw.has('prune')) this.tips.offer('bloom');
    if (c.enemies.some((e) => e.alive && (e.statuses['rot'] ?? 0) > 0)) this.tips.offer('rot'); // absent = no Rot
    if (this.metronome !== null && nextIsBeat && c.hand.length > 0) this.tips.offer('beat');
    if (handKw.has('delay') || c.timeline.length > 0) this.tips.offer('delay');
    if (this.seesForecast() && c.enemies.some((e) => e.alive && e.forecast.length > 0)) this.tips.offer('augury');
  }

  /** The player has Augury: intents show the forecast (GDD §2.9). */
  private seesForecast(): boolean {
    return (this.combat.player.statuses['augury'] ?? 0) > 0; // absent = no Augury
  }

  /** Enemy the hand's live numbers are computed against: last hovered / aimed (if alive), else the only enemy. */
  private handTarget(): number | null {
    const living = this.combat.enemies.filter((e) => e.alive);
    if (this.aimTarget !== null && living.some((e) => e.uid === this.aimTarget)) return this.aimTarget;
    return living.length === 1 ? (living[0] as { uid: number }).uid : null;
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
    plate.statuses.onIconsChanged = (removed, added) => this.registerIcons(removed, added);
    intent.focusable = true; // hover / focus spells the intent out (exact damage × hits, Augury's forecast)
    intent.activateSound = false;
    this.scope.add(view, plate, intent);
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
    // created during the batch being animated and gone by its end (the fight ended in it): BUG-10
    const made = this.batchCards.get(uid);
    if (made) return made;
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
      // chip rim: gold when stamped on the beat, else the card type's trim colour
      const m = this.add(new MiniCard(slot.x, slot.y, t.card.uid, def.name, { gold: t.onBeat, w: TIMELINE.chipW, border: CARD_COLORS[def.type].trim }));
      m.setZ(Z.PANEL + 20);
      // more entries than the window shows: the column header counts them; hover the header for the list
      if (slot.row >= TIMELINE.rows) { m.visible = false; m.focusable = false; }
      m.label = `On the Timeline: ${def.name}, resolves in ${Math.max(1, t.dueTurn - c.turn)} turn(s)${t.onBeat ? ', on the beat' : ''}.`;
      m.hint = timelineHint(this.state, t.card.uid);
      this.addChorusTag(m, t.card, def, c.timeline.filter((x) => x !== t && x.dueTurn === t.dueTurn).length);
      this.minis.push(m);
    }
    const showTl = c.timeline.length > 0 || this.state.classId === 'chronist';
    if (this.timelineWindow) this.timelineWindow.visible = showTl;
    const perCol = [0, 0, 0];
    for (const sl of slots) perCol[sl.col] = (perCol[sl.col] ?? 0) + 1;
    this.timelineHeader.forEach((l, i) => {
      const n = perCol[i] ?? 0;
      const name = i === 0 ? 'NEXT TURN' : `IN ${i + 1} TURNS`;
      l.setText(n > TIMELINE.rows ? `${name} (${n})` : n === 0 ? `${name}: -` : name);
      l.setColor(n === 0 ? C.textDim : C.iceBlue);
      l.visible = showTl;
    });
    if (this.timelineArea) {
      this.timelineArea.visible = showTl;
      this.timelineArea.focusable = showTl;
      this.timelineArea.hint = timelineHeaderHint(this.state);
    }
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
    const card = this.findCard(uid, this.animState);
    const name = getCardDef(card.id, card.upgraded).name;
    const m = this.add(new MiniCard(320, RACK_Y, uid, name, { w: 60, value: charges > 1 ? `×${charges}` : undefined }));
    m.setZ(Z.CARD - 2);
    m.label = `Primed: ${name}. Fires at the first enemy that attacks.`;
    m.hint = primedHint(this.animState, uid, charges); // runs from the animator too (BUG-4)
    this.rack.push(m);
    this.scope.add(m);
    return m;
  }

  /** The rack after this batch of events; the fight may have ended in it (then nothing stays primed). */
  private finalPrimed(): readonly PrimedEntry[] { return this.state.combat?.primed ?? []; }

  private rackSlotX(i: number, n: number): number { return 320 - Math.floor((n * 62) / 2) + i * 62; }

  private layoutRack(): void {
    this.rack.forEach((m, i) => m.moveTo(this.rackSlotX(i, this.rack.length), RACK_Y));
    // "PRIMED" names the row (hover a chip for what it does)
    if (!this.rackLabel) {
      this.rackLabel = this.add(new Label(0, 0, 'PRIMED:', { font: fonts.small, align: 'right', color: C.iceBlue, outline: C.black }));
      this.rackLabel.setZ(Z.CARD - 2);
    }
    this.rackLabel.visible = this.rack.length > 0;
    if (this.rack.length > 0) this.rackLabel.moveAnchorTo(this.rackSlotX(0, this.rack.length) - 3, RACK_Y + 3);
  }

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
        icon.hint = potionHint(id, s, true);
        icon.label = `${getPotionDef(id).name}: ${renderPotionText(id, s)}`;
        icon.onActivate = () => this.tryPotion(i);
      }
      this.potionIcons.push(icon);
      x += 17;
    }
    // relics wrap into rows left of the Timeline window (x < 156); the card detail moves below them
    const perRow = Math.floor((timelineWindowRect().x - 4) / 18);
    let n = 0;
    for (const r of s.player.relics) {
      const def = getRelicDef(r.id);
      const rx = 4 + (n % perRow) * 18, ry = 2 + Math.floor(n / perRow) * 18;
      n++;
      const icon = this.add(new HintIcon(rx, ry, this.app, itemIcon(this.app, 'relic', r.id)));
      icon.setZ(Z.PANEL);
      icon.hint = relicHint(r.id, s, r.counter);
      icon.label = `${def.name}: ${renderRelicText(r.id, s)}`;
      this.relicIcons.push(icon);
    }
    const relicRows = Math.max(1, Math.ceil(n / perRow));
    this.detail.moveTo(4, 6 + relicRows * 18);
    this.scope.add(...this.potionIcons, ...this.relicIcons);
  }

  private updateHint(): void {
    if (!this.hint) return;
    const dev = this.app.input.lastDevice;
    const m = (a: PromptAction) => promptMarkup(dev, a, 'textHi');
    // at most 5 lines of 28 chars (322-356, right panel)
    this.hint.setText(dev === 'mouse'
      ? `[textHi]CLICK[/] A CARD: PLAY\n[textHi]CLICK[/] AN ENEMY: TARGET\n${m('endTurn')}: END TURN\n[textHi]HOVER[/] ANYTHING: DETAILS`
      : `${dev === 'gamepad' ? '[textHi]◀ ▶[/]' : '[textHi]1-0[/]'}: PICK A CARD\n${m('confirm')}: PLAY  ${m('nextTarget')}: TARGET\n${m('endTurn')}: END TURN\nFOCUS ANYTHING: DETAILS`);
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
    this.aimTarget = target;
    f.setFace(cardFace(this.app, card, { state: this.state, target }), cardUid);
    this.detail.show(f.cardFace, '', this.cardAvoid(f));
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
    this.updateMusicSync();
    for (const m of this.marks.values()) m.update(dtMs);
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

  /** Combat drives its own info (updateTooltips): hidden while animating, cards → CardDetail. */
  protected override updateInfo(): void { /* see updateTooltips */ }

  private updateTooltips(): void {
    const focused = this.focus.focused;
    if (this.focus.depth > (this.targeting ? 2 : 1)) {
      // a modal (piles, choices) owns focus: its CardDetail explains cards; tooltips for the rest
      this.detail.hide();
      this.tip.hide();
      this.tipFor = null;
      this.infoLayer.update(focused instanceof CardFrame ? null : focused);
      return;
    }
    const f = focused;
    // the hand's live numbers follow the enemy under the pointer / focus
    if (f instanceof EnemyView && !this.targeting) {
      const u = [...this.units.values()].find((x) => x.view === f);
      if (u && this.aimTarget !== u.uid) { this.aimTarget = u.uid; this.refreshHandFaces(); }
    }
    const info = this.app.input.held('info');
    if (f instanceof CardFrame) {
      this.infoLayer.hide();
      if (f !== this.tipFor || info !== this.tipInfo || f.cardFace !== this.tipFace) {
        this.tip.hide();
        this.detail.show(f.cardFace, f.tagHint, this.cardAvoid(f));
        this.tipFace = f.cardFace;
      }
    } else {
      // while aiming a card, its detail stays up next to the enemy tooltip
      if (f !== this.tipFor && !(this.targeting && this.targeting.card !== null)) this.detail.hide();
      let avoid: Rect[] = [];
      let side: Side | undefined;
      const u = f instanceof EnemyView || f instanceof IntentBox ? [...this.units.values()].find((x) => x.view === f || x.intent === f) : undefined;
      if (u) {
        // keep clear of the other enemies (sprite, plate, intent) so the tooltip never hides a neighbour
        avoid = [...this.units.values()].filter((o) => o !== u).flatMap((o) => [o.view.rect, o.plate.rect, o.intent.rect]);
        avoid.push(rect(128, 262, 384, 98)); // and the hand
        side = f instanceof EnemyView ? 'right' : 'below';
      }
      // the Timeline header explains the whole window: its tooltip goes under the window, not over the chips
      const tlAnchor = f !== null && f === this.timelineArea && this.timelineWindow ? { anchor: this.timelineWindow.rect, side: 'below' as const } : {};
      this.infoLayer.update(f, { ...(side ? { side } : {}), avoid, ...tlAnchor });
      if (info !== this.tipInfo || f !== this.tipFor) {
        this.tip.hide();
        if (info && f && !f.hint) this.tip.show(f.rect, controlsText(this.app.input.lastDevice), 'above');
      }
    }
    this.tipFor = f;
    this.tipInfo = info;
  }

  /** Rects a card's keyword boxes must not cover: the card itself, the player plate and the Timeline window. */
  private cardAvoid(f: CardFrame): Rect[] {
    const out = [f.ringRect(), rect(2, 236, 124, 122)];
    if (this.timelineWindow?.visible) out.push(this.timelineWindow.rect);
    return out;
  }

  /** Re-render the hand's faces (live numbers against handTarget()). */
  private refreshHandFaces(): void {
    const s = this.state;
    const c = this.combat;
    const played = c.cardsPlayedThisTurn.length + (c.counters['beatOffset'] ?? 0); // beatOffset exists only after Tempo Draught
    const beat = this.metronome !== null && TUNING.cadence.beats.includes(played + 1);
    for (const card of c.hand) {
      const f = this.hand.get(card.uid);
      if (!f || this.targeting?.card === card.uid) continue;
      f.setFace(cardFace(this.app, card, { state: s, beat, target: this.handTarget() }), card.uid);
    }
  }

  // ---------------------------------------------------------------- e2e hook (src/render/debug)

  override get busy(): boolean { return this.leaving || this.animating; }

  /** The e2e hook's dispatch: the same perform() the hand, targeting, potions and END TURN use. */
  override uiDispatch(a: Action): void {
    if (this.busy) throw new Error(`combat: uiDispatch(${a.type}) while busy`);
    if (this.targeting) this.exitTargeting();
    // a multi-pick step only changes the engine's selection (the open modal keeps its own)
    if (a.type === 'choice_toggle') { this.session.apply(a); return; }
    if (a.type === 'resolve_choice') { this.closeAllModals(); this.combatChoiceOpen = false; }
    else if (this.focus.depth !== 1) throw new Error(`combat: uiDispatch(${a.type}) with a modal open`);
    this.perform(a);
  }

  /** Enemy uid → its on-screen widgets (read-only, for the e2e invariants). */
  get unitViews(): ReadonlyMap<number, { readonly enemyId: string; readonly view: EnemyView; readonly plate: EnemyPlate; readonly dead: boolean }> { return this.units; }

  /** Hand uid → card frame, in hand order (read-only, for the e2e invariants). */
  get handViews(): readonly { uid: number; frame: CardFrame }[] {
    return this.handOrder.flatMap((uid) => { const frame = this.hand.get(uid); return frame ? [{ uid, frame }] : []; });
  }

  // ---------------------------------------------------------------- pending choices (combat level)

  protected override checkChoice(): void {
    const pc = this.state.combat?.pendingChoice ?? null; // no combat (left the phase) = no combat choice
    if (!pc || this.combatChoiceOpen || this.animating) return;
    this.combatChoiceOpen = true;
    const resolve = (uids: number[]) => { this.combatChoiceOpen = false; this.perform(this.session.answerChoice(uids)); };
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
    this.infoLayer.hide();
    this.tipFor = null;
    this.initLive(prev);
    this.pendingTriggers.clear();
    this.batchCards.clear();
    for (const e of events) if (e.t === 'riposte_triggered') this.pendingTriggers.set(e.uid, (this.pendingTriggers.get(e.uid) ?? 0) + 1);
    for (const f of this.hand.values()) f.setTag(null);
    const pc = prev.combat;
    const played = pc ? pc.cardsPlayedThisTurn.length + (pc.counters['beatOffset'] ?? 0) : 0; // beatOffset exists only after Tempo Draught
    this.playsThisTurn = pc ? pc.cardsPlayedThisTurn.length : 0;
    this.beatsThisTurn = TUNING.cadence.beats.filter((b) => b <= played).length;
    this.resolvesThisBatch = 0;
    this.spreadFrom = null;
    this.comboHits = 0;
    this.pruneSnipPending = pc?.pendingChoice?.resume.op === 'prune_scrap';
    await this.app.scheduler.enqueue(async () => {
      if (this.introPending) {
        const kind = this.introPending;
        this.introPending = null;
        if (kind === 'boss') for (const u of this.units.values()) { u.plate.visible = false; u.intent.visible = false; } // no pop before the band
        this.introRevealed = kind === 'boss';
        while (this.app.screens.transitioning) await this.wait(16); // the intro's flash must not fight the screen fade
        await this.playIntro(kind);
      }
      this.batch = events;
      this.resolvedThisBatch.clear();
      this.snips = 0;
      this.harvestsShown.clear();
      this.lastBloomAt = null;
      for (let i = 0; i < events.length; i++) { this.batchAt = i; await this.animateEvent(events[i] as GameEvent, prev); }
      this.introRevealed = false;
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
    this.updateMusicLayers();
    this.syncOverlays();
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
  /** Cards created by the batch being animated (card_added), for cards that are gone again by its end. */
  private readonly batchCards = new Map<number, CardInstance>();

  /**
   * The state to explain things against. Usually the current one; but the animator plays an action's
   * events after the engine has applied all of them, and when that action ended the fight
   * state.combat is already gone. Text and tooltips built during that last animation (status rows,
   * primed chips) then explain the fight being animated, the pre-action state (docs/v2/bugs.md BUG-4).
   */
  private get animState(): RunState { return this.state.combat ? this.state : (this.animPrev ?? this.state); }

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

  // ---------------------------------------------------------------- music sync (beat pulse, layers)

  /** Per frame: the Cadence meter pulses on the music's beats; low HP adds a heartbeat on the HP readout. */
  private updateMusicSync(): void {
    const beat = this.juice.heardBeatOrNull();
    if (beat === null || beat === this.lastBeat) return;
    this.lastBeat = beat;
    const c = this.state.combat;
    if (this.metronome && c && !this.animating) {
      const played = c.cardsPlayedThisTurn.length + (c.counters['beatOffset'] ?? 0); // beatOffset exists only after Tempo Draught
      this.metronome.pulse(TUNING.cadence.beats.includes(played + 1));
    }
    if (this.app.music.currentLayers.danger && beat % 4 === 0) {
      // heartbeat "lub" on the bar line: the HP readout blinks with it
      this.playerHpText.setColor(C.white);
      void this.app.tweens.delay(90).then(() => { if (!this.leaving) this.playerHpText.setColor(C.red); });
    }
  }

  /** Reactive music layers from the state: intense when the enemies threaten lethal-ish damage, danger at low HP. */
  private updateMusicLayers(): void {
    const s = this.state;
    const c = s.combat;
    if (!c) { this.app.music.setLayers({ intense: false, danger: false }); return; }
    const incoming = c.enemies.filter((e) => e.alive).reduce((a, e) => {
      const it = e.intent;
      return a + (isAttackKind(it.kind) && !it.hidden && it.damage !== undefined ? it.damage * (it.hits ?? 1) : 0); // absent hits = 1 hit
    }, 0);
    const effective = s.player.hp + c.player.block + c.player.guard;
    const intense = incoming > 0 && incoming * 2 >= effective;
    const danger = s.player.hp * 10 <= s.player.maxHp * 3;
    this.app.music.setLayers({ intense, danger });
  }

  override exit(): void {
    super.exit();
    this.app.music.setLayers({ intense: false, danger: false }); // the map / rewards play the plain arrangement
  }

  // ---------------------------------------------------------------- event animator

  /** Bosses (EnemyDef.boss) and the encounter flags decide the size of a moment. */
  private isBossEnemy(uid: number): boolean {
    const e = this.animCombat().enemies.find((x) => x.uid === uid);
    return e !== undefined && getEnemyDef(e.id).boss === true; // boss is optional on EnemyDef: absent = not a boss
  }

  /** The boss / elite intro, once, before the opening draws. */
  private async playIntro(kind: 'boss' | 'elite'): Promise<void> {
    if (kind === 'elite') { await eliteIntro(this.juice); return; }
    const c = this.combat;
    const bossE = c.enemies.find((e) => e.alive && getEnemyDef(e.id).boss === true) ?? c.enemies.find((e) => e.alive);
    if (!bossE) throw new Error('boss intro: no living enemy');
    const u = this.units.get(bossE.uid);
    if (!u) throw new Error(`boss intro: no unit for enemy ${bossE.uid}`);
    const others = [...this.units.values()].flatMap((x) => [x.plate, x.intent]);
    await bossIntro(this.juice, u.view, getEnemyDef(bossE.id).name, others);
  }

  /** Flash colour for player hits: white, then hotter as Onslaught climbs (palette steps, no blending). */
  private static heatColor(onslaught: number): number {
    return onslaught >= 9 ? C.red : onslaught >= 6 ? C.orange : onslaught >= 3 ? C.yellow : C.white;
  }

  /** Arc `n` particles from (x0, y0) to (x1, y1) in `ms` (Guard / Block pips pooling into a plate, Rot spreading). */
  private arcParticles(x0: number, y0: number, x1: number, y1: number, n: number, colors: readonly number[], shape: 'px2' | 'px3' | 'plus', ms = 320): void {
    const T = ms / 1000, g = 500;
    for (let i = 0; i < n; i++) {
      const jx = (Math.random() * 2 - 1) * 6, jy = (Math.random() * 2 - 1) * 4;
      this.juice.particles.spawn(shape, x0 + jx, y0 + jy, (x1 - x0 - jx) / T, (y1 - y0 - jy) / T - (g * T) / 2, { g, drag: 1, life: ms + i * 8, wobble: 0, colors });
    }
  }

  /**
   * The on-beat impact: meter flash, gold ring, flash, bump, and the in-key stinger unless it was
   * already scheduled on the audio clock (`stingerQueued`: the sound is sample-exact on the beat
   * even if a frame hitch makes the picture late).
   */
  private beatImpact(beat: 1 | 2 | 3, stingerQueued: boolean, x: number, y: number): void {
    if (!stingerQueued) this.juice.cadence(beat, null);
    this.metronome?.set(0, true);
    const big = beat === 3;
    void floatText(this.app, this.root, 320, 96, big ? 'ON THE BEAT! ×3' : beat === 2 ? 'ON THE BEAT! ×2' : 'ON THE BEAT!', C.yellow, { big: true, ms: 700 });
    this.juice.particles.ring(x, y, 12 + beat * 6, 120 + beat * 40, [C.yellow, C.amber, C.white], beat === 3 ? 'plus' : 'px2', 420);
    if (this.metronome) this.juice.particles.burst(this.metronome.rect.x + 17, this.metronome.rect.y + 4, { n: 6 + beat * 2, colors: [C.yellow, C.white], shapes: ['px1', 'plus'], speed: [30, 90], life: [250, 450] });
    void this.juice.screenFlash(big ? 2 : 1, C.yellow);
    void this.juice.shake(this.root, big ? 3 : 1, big ? 220 : 120);
  }

  /** One hit landing: sound, flash, slash, sparks, scaled number, hit-stop and shake, all on this frame. */
  private async impact(e: Extract<GameEvent, { t: 'damage' }>, hpBefore: number, rotTick: number): Promise<void> {
    const root = this.root;
    const p = this.posOf(e.target);
    const sfx = this.app.sfx;
    const j = this.juice;
    const absorbed = e.blocked + e.guarded;
    if (e.target === 'player' && e.kind === 'hp_loss' && e.source === 'player' && e.hpLost > 0) {
      // Strain: an HP-cost flash on the player and a heartbeat thump
      logCue('strain', 'impact');
      sfx.play('thump');
      void j.borderBlink(C.red, 160);
      void j.pop(p.x, p.y, `-${e.hpLost}`, C.pink, Juice.sizeFor(e.hpLost));
      void floatText(this.app, root, p.x, p.y - 22, 'STRAIN', C.pink);
      j.particles.burst(64, 282, { n: 6 + Math.min(12, e.hpLost), colors: [C.red, C.pink], shapes: ['px2', 'px1'], speed: [30, 90], gravity: 200, life: [250, 450], jitter: 20 });
      this.playerHpText.setColor(C.white);
      void this.wait(120).then(() => { if (!this.leaving) this.showPlayer(this.liveOf('player')); });
      j.hitStop(40);
      await this.wait(60);
      return;
    }
    if (e.target === 'player') {
      logCue('hit-player', 'impact');
      const goaded = typeof e.source === 'number' && (this.liveOf(e.source).statuses['goaded'] ?? 0) > 0; // absent = not Goaded
      if (goaded && e.hpLost > 0) {
        // a Goaded enemy's hit lands heavier: a red ring, a deeper thud, longer stop, bigger shake
        logCue('goad', 'hit');
        sfx.play('hitHeavy', { semis: -3 });
        j.particles.ring(p.x, p.y + 6, 18, 160, [C.red, C.pink, C.white], 'plus', 420);
        j.hitStop(Math.min(140, 60 + e.hpLost * 3));
        void j.shake(root, Math.min(8, 4 + Math.floor(e.hpLost / 5)), 260 + Math.min(240, e.hpLost * 10));
        void j.pop(p.x, p.y, `-${e.hpLost}`, C.red, Juice.sizeFor(e.hpLost + 10));
        void j.borderBlink(C.red, 120);
        await this.wait(60);
        return;
      }
      if (e.hpLost > 0) {
        sfx.play(e.kind === 'hp_loss' ? 'hurtLight' : e.hpLost >= 10 ? 'hurt' : 'hurtLight');
        void j.pop(p.x, p.y, `-${e.hpLost}`, e.kind === 'hp_loss' ? C.lilac : C.red, Juice.sizeFor(e.hpLost));
        j.particles.burst(p.x, p.y + 10, { n: 4 + Math.min(16, e.hpLost), colors: [C.red, C.pink, C.white], shapes: ['px2', 'px1'], speed: [50, 140], gravity: 300, life: [250, 500], jitter: 8 });
        j.hitStop(Math.min(100, 24 + e.hpLost * 3));
        void j.shake(root, Math.min(6, 2 + Math.floor(e.hpLost / 6)), 160 + Math.min(240, e.hpLost * 10));
      } else {
        sfx.play('block');
        j.particles.burst(p.x, p.y + 10, { n: 6, colors: [C.skyBlue, C.white], shapes: ['px2', 'plus'], speed: [40, 100], life: [200, 380] });
        void j.shake(root, 1, 120);
      }
      if (absorbed > 0) void floatText(this.app, root, p.x, p.y + (e.hpLost > 0 ? 18 : 0), e.hpLost > 0 ? `${absorbed} BLOCKED` : 'BLOCKED', C.skyBlue);
      await this.wait(40);
      return;
    }
    const u = this.units.get(e.target);
    if (rotTick > 0) {
      // Rot ticks: a squelch that deepens with the stacks, bubbles, a lilac number
      logCue('rot-tick', 'impact');
      sfx.play('rot', { semis: -Math.min(9, Math.floor(rotTick / 2)) });
      rotBubbles(j, p.x, p.y + 6, rotTick);
      void j.pop(p.x, p.y, `-${e.hpLost}`, C.lilac, Juice.sizeFor(e.hpLost));
      if (u) j.impactFlash(u.view.sprite, C.lilac); // 3-frame silhouette; the hit-stop then holds the pose
      j.hitStop(Math.min(60, 10 + rotTick * 3));
      if (u) { await u.view.hit(this.app.tweens, Math.round(Math.min(3, 1 + rotTick / 5) * j.shakeScale), 180, true); u.view.sprite.setFlashColor(C.white); }
      await this.wait(40);
      return;
    }
    const fromPlayer = e.source === 'player' && e.kind === 'attack';
    const ons = fromPlayer ? (this.liveOf('player').statuses['onslaught'] ?? 0) : 0; // absent = 0 stacks
    this.comboHits = fromPlayer ? this.comboHits + 1 : 0;
    const killed = hpBefore > 0 && e.hpLost >= hpBefore;
    const overkill = killed ? Math.max(0, e.amount - absorbed - e.hpLost) : 0;
    const heat = CombatScreen.heatColor(ons);
    const semis = fromPlayer ? Math.min(14, ons + Math.max(0, this.comboHits - 1)) : 0;
    logCue(fromPlayer ? 'hit-enemy' : 'hit-enemy-other', 'impact');
    if (fromPlayer && this.comboHits === 1 && this.inPlay) {
      // a 1-2 frame beam from the staged card to the target (PS attack effect)
      const bx = PLAY.cx, by = PLAY.cy, len = Math.hypot(p.x - bx, p.y - by);
      for (let d = 0; d < len; d += 5) j.particles.spawn('px2', bx + ((p.x - bx) * d) / len, by + ((p.y - by) * d) / len, 0, 0, { g: 0, drag: 1, life: 40 + (d / len) * 50, wobble: 0, colors: [heat, C.white] });
    }
    if (e.hpLost > 0) {
      sfx.play(e.hpLost >= BIG_HIT ? 'hitHeavy' : e.hpLost >= 6 ? 'hit' : 'hitLight', { semis });
      if (absorbed > 0 && this.liveOf(e.target).block === 0 && e.blocked > 0) sfx.play('blockBreak', { priority: 1 });
      j.particles.slash(p.x, p.y, 20 + Math.min(30, e.hpLost * 2), [C.white, heat]);
      j.particles.burst(p.x, p.y, { n: 4 + Math.min(22, e.hpLost + ons), colors: [heat, C.white, C.yellow], shapes: ['px2', 'px1', 'plus'], speed: [70, 160 + ons * 10], gravity: 220, life: [200, 480], jitter: 4 });
      void j.pop(p.x, p.y, `-${e.hpLost}`, e.kind === 'hp_loss' ? C.lilac : ons >= 6 ? C.orange : C.red, Juice.sizeFor(e.hpLost));
    } else if (absorbed > 0) {
      sfx.play('block');
      j.particles.burst(p.x, p.y, { n: 6, colors: [C.skyBlue, C.white], shapes: ['px2', 'plus'], speed: [40, 100], life: [200, 380] });
    } else {
      sfx.play('hitLight', { semis });
      void j.pop(p.x, p.y, String(e.amount), C.white, 1);
    }
    if (absorbed > 0) void floatText(this.app, root, p.x, p.y + (e.hpLost > 0 ? 18 : 0), e.hpLost > 0 ? `${absorbed} BLOCKED` : 'BLOCKED', C.skyBlue);
    if (overkill > 0) {
      sfx.play('overkill');
      void floatText(this.app, root, p.x, p.y - 26, `OVERKILL +${overkill}`, C.yellow, { ms: 800 });
      j.particles.ring(p.x, p.y, 20, 200, [C.yellow, C.orange, C.white], 'plus', 480);
    }
    const stop = e.hpLost > 0 ? Math.min(160, 50 + e.hpLost * 3 + ons * 2) + (killed ? 50 : 0) : 12; // floor 50 ms: the frozen pose reads after the 2-frame fill
    // the silhouette goes up on the impact frame and holds through the hit-stop
    if (u && (e.hpLost > 0 || e.kind === 'attack')) j.impactFlash(u.view.sprite, heat); // 3-frame silhouette; the hit-stop then holds the pose
    j.hitStop(stop);
    if (e.hpLost >= BIG_HIT || ons >= 6 || overkill > 0) void j.shake(root, Math.min(8, 2 + Math.floor(e.hpLost / 8) + Math.floor(ons / 4)), 160 + Math.min(260, e.hpLost * 8));
    if (u && (e.hpLost > 0 || e.kind === 'attack')) {
      u.view.sprite.setFlashColor(heat);
      await u.view.hit(this.app.tweens, Math.round((e.hpLost > 0 ? Math.min(5, 3 + Math.floor(ons / 4)) : 1) * j.shakeScale), 200, true); // flash, pose, flash
      u.view.sprite.setFlashColor(C.white);
    }
    await this.wait(40);
  }

  /** Chorus: the live "+N" a Timeline chip will get from the cards resolving with it. */
  private addChorusTag(m: MiniCard, card: CardInstance, def: ReturnType<typeof getCardDef>, others: number): void {
    const effects = def.delay?.effects ?? def.effects; // a Scheduled card resolves its own effects
    let per = 0;
    for (const ef of effects) {
      if (!('amount' in ef)) continue;
      const a = ef.amount;
      if (typeof a === 'object' && a.scale === 'chorus') per += a.per ?? 1; // engine rule: an absent per is 1 (effects.ts amount())
    }
    if (per === 0 || others === 0) return;
    // inside the chip's right end (the window has no room above the chips)
    const tag = m.addChild(new Label(m.rect.x + m.rect.w - 3, m.rect.y + 3, `CHORUS +${per * others}`, { font: fonts.small, align: 'right', color: C.yellow, outline: C.black }), 4);
    tag.label = `Chorus: +${per * others} from ${others} other card(s) resolving with ${card.id}`;
  }

  /** v2 status juice. Returns true when it made the sound itself (the generic buff / debuff blip stays quiet). */
  private async statusJuice(e: Extract<GameEvent, { t: 'status' }>): Promise<boolean> {
    const j = this.juice;
    const sfx = this.app.sfx;
    const pl = this.liveOf('player').statuses;
    if (e.target === 'player') {
      if (e.status === 'embers') {
        this.emberGlow.set(e.now);
        if (e.delta > 0) { sfx.play('crackle', { semis: 5 }); this.emberGlow.flare(160); }
        return e.delta > 0;
      }
      if (e.status === 'reserve') {
        if (e.delta < 0) {
          // an X-cost card drains the Reserve into its X: the pips fly into the energy orb
          logCue('reserve', 'drain');
          sfx.play('energy', { semis: 7 });
          const o = { x: this.energy.rect.x + 13, y: this.energy.rect.y + 13 };
          for (let i = 0; i < this.reserveMeter.stored; i++) { const p = this.reserveMeter.pipPos(i); this.arcParticles(p.x, p.y, o.x, o.y, 2, [C.amber, C.yellow], 'plus', 240); }
          this.reserveMeter.set(e.now);
          await this.wait(220);
          j.particles.burst(o.x, o.y, { n: 10, colors: [C.amber, C.yellow, C.white], shapes: ['px1', 'plus'], speed: [30, 90], life: [250, 400] });
          return true;
        }
        this.reserveMeter.set(e.now);
        if (e.delta > 0) { sfx.play('energy', { semis: -5 }); const p = this.reserveMeter.pipPos(Math.max(0, e.now - 1)); j.particles.burst(p.x, p.y, { n: 6, colors: [C.amber, C.white], shapes: ['px1'], speed: [20, 60], life: [200, 350] }); }
        return e.delta > 0;
      }
      if (e.status === 'crazing') {
        for (const [uid, live] of this.live?.enemies ?? []) this.setMarks(uid, e.now > 0 && (live.statuses['exposed'] ?? 0) > 0, (live.statuses['goaded'] ?? 0) > 0); // absent = 0 stacks
        if (e.delta > 0) sfx.play('shed', { semis: 7 });
        return e.delta > 0;
      }
      return false;
    }
    if (e.status === 'exposed' || e.status === 'goaded') {
      const live = this.liveOf(e.target).statuses;
      const crazing = (pl['crazing'] ?? 0) > 0; // absent = no Crazing
      const hadCrack = this.marks.get(e.target)?.cracked ?? false; // no marks yet = no crack
      this.setMarks(e.target, crazing && (live['exposed'] ?? 0) > 0, (live['goaded'] ?? 0) > 0);
      const p = this.posOf(e.target);
      if (e.status === 'goaded' && e.delta > 0) {
        logCue('goad', 'impact');
        sfx.play('taunt');
        j.particles.burst(p.x, p.y - 20, { n: 10, colors: [C.red, C.pink, C.white], shapes: ['px2', 'plus'], speed: [40, 110], life: [250, 450] });
        return true;
      }
      if (e.status === 'exposed' && crazing && !hadCrack && (live['exposed'] ?? 0) > 0) {
        sfx.play('shed', { semis: 7 }); // the crack spreads
        j.particles.burst(p.x, p.y, { n: 8, colors: [C.white, C.iceBlue], shapes: ['px1'], speed: [40, 100], life: [200, 350] });
        return true;
      }
    }
    return false;
  }

  /** Harvest events already shown with their HP loss (by batch index). */
  private readonly harvestsShown = new Set<number>();

  /** The engine's harvest event for this HP loss (it follows the loss in the batch), or null: not a Harvest. */
  private harvestFor(e: Extract<GameEvent, { t: 'damage' }>): Extract<GameEvent, { t: 'harvest' }> | null {
    if (e.kind !== 'hp_loss' || e.target === 'player') return null;
    for (let i = this.batchAt + 1; i < Math.min(this.batch.length, this.batchAt + 4); i++) {
      const x = this.batch[i];
      if (x?.t === 'harvest' && x.enemyUid === e.target && x.loss === e.hpLost) { this.harvestsShown.add(i); return x; }
    }
    return null;
  }

  /** Harvest: the Rot is ripped out of the enemy in a burst, then the HP loss lands. */
  private async harvestPull(uid: number, rot: number): Promise<void> {
    const p = this.posOf(uid);
    logCue('harvest', 'pull');
    this.app.sfx.play('harvest');
    this.juice.particles.burst(p.x, p.y, { n: Math.min(30, 8 + rot * 2), colors: [C.lilac, C.purple, C.violet, C.white], shapes: ['px3', 'ring', 'px2'], speed: [80, 200], angle: -Math.PI / 2, spread: Math.PI * 1.2, gravity: 160, life: [350, 650], jitter: 8 });
    const u = this.units.get(uid);
    if (u) { u.view.setLunge(-3); void this.wait(120).then(() => u.view.setLunge(0)); }
    await this.wait(150);
  }

  private async animateEvent(e: GameEvent, prev: RunState): Promise<void> {
    const L = this.live;
    if (!L) throw new Error('animator: no live model');
    const root = this.root;
    const sfx = this.app.sfx;
    const j = this.juice;
    switch (e.t) {
      case 'turn_start': {
        this.metronome?.set(0, false);
        this.beatsThisTurn = 0;
        this.playsThisTurn = 0;
        sfx.play('turnPlayer');
        if (this.bankLabel.visible) {
          // the next-turn bank pays out: energy pips to the orb, card backs to the draw pile
          logCue('bank', 'payout');
          const b = { x: this.bankLabel.rect.x + 30, y: this.bankLabel.rect.y + 3 };
          if (this.bankLabel.energy > 0) this.arcParticles(b.x, b.y, this.energy.rect.x + 13, this.energy.rect.y + 13, 2 + this.bankLabel.energy * 2, [C.amber, C.yellow], 'plus', 300);
          for (let k = 0; k < this.bankLabel.draw; k++) j.particles.spawn('cardback', b.x, b.y, (PILES.draw.x - b.x) / 0.3, (PILES.draw.y - 6 - b.y) / 0.3 - 150, { g: 1000, drag: 1, life: 300, wobble: 0, colors: [C.white] });
          const now = sfx.nowOrNull();
          sfx.play('bank', now === null ? {} : { at: now + 0.12 });
          this.bankLabel.set(0, 0);
        }
        if (this.minis.length > 0) {
          // the Timeline ticks over: a clock tick and every chip blinks once
          const now = sfx.nowOrNull();
          sfx.play('tick', now === null ? {} : { at: now + 0.2 });
          for (const m of this.minis) { m.visible = false; void this.wait(200).then(() => { m.visible = true; }); }
        }
        await banner(this.app, root, 'YOUR TURN', 420);
        break;
      }
      case 'enemy_turn_start':
        sfx.play('turnEnemy');
        await banner(this.app, root, 'ENEMY TURN', 380);
        break;
      case 'turn_end':
        break;
      case 'draw': {
        let k = 0;
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
          sfx.play('draw', { semis: Math.min(9, k++) }); // the fan rises card by card
          j.particles.burst(PILES.draw.x, PILES.draw.y - 6, { n: 2, colors: [C.white, C.skyBlue], shapes: ['px1'], speed: [20, 50], angle: -Math.PI / 2, spread: 1.4, life: [150, 260] });
          void this.relayoutHand(STEP);
          await this.wait(55);
        }
        await this.wait(STEP);
        break;
      }
      case 'discard':
      case 'exhaust': {
        const to = e.t === 'discard' ? PILES.discard : PILES.scrap;
        const moves: Promise<void>[] = [];
        const snipping = e.t === 'exhaust' && this.pruneSnipPending;
        let launched = false;
        for (const uid of e.uids) {
          const fromHand = this.takeFromHand(uid);
          const f = fromHand ?? (this.inPlay?.uid === uid ? this.inPlay.frame : null);
          const snip = snipping && fromHand !== null; // Pruned cards leave from the hand (Clear-Cut: several, a cascade)
          if (this.inPlay?.uid === uid) this.inPlay = null;
          if (e.t === 'discard') L.discard += 1; else L.exhaust += 1;
          if (!f) continue;
          if (e.t === 'exhaust') { this.lastScrapAt = { x: f.rect.x + 32, y: f.rect.y + 30 }; f.setDimmed(true); }
          if (snip) {
            // Prune: the snip lands on the card before it goes to the Scrapheap
            logCue('prune', `snip${this.snips}`);
            sfx.play('snip', { semis: Math.min(12, this.snips * 2) });
            if (this.snips > 0) void floatText(this.app, root, f.rect.x + 32, f.rect.y - 4, `PRUNE ×${this.snips + 1}`, C.lime, { ms: 420 });
            this.snips += 1;
            j.particles.burst(f.rect.x + 32, f.rect.y + 30, { n: 10, colors: [C.white, C.lime], shapes: ['px1', 'plus'], speed: [60, 140], life: [180, 320] });
            j.particles.slash(f.rect.x + 32, f.rect.y + 30, 20, [C.white]);
            await j.shake(f.node, 2, 120);
          }
          if (!launched && e.t === 'discard') { sfx.play('discard'); launched = true; }
          moves.push(this.flyTo(f, to.x - 32, to.y - 10, STEP).then(() => {
            this.removeWidget(f);
            if (e.t === 'exhaust') {
              sfx.play('scrap');
              j.particles.burst(to.x, to.y - 4, { n: 8, colors: [C.grey, C.darkGrey, C.rust], shapes: ['px2', 'px1'], speed: [40, 110], angle: -Math.PI / 2, spread: 2, gravity: 320, life: [250, 450] });
            }
          }));
        }
        await Promise.all(moves);
        void this.relayoutHand(STEP);
        break;
      }
      case 'shuffle': {
        sfx.play('shuffle');
        void floatText(this.app, root, PILES.draw.x, PILES.draw.y - 16, 'SHUFFLE', C.cyan);
        const n = Math.min(8, Math.max(3, L.discard));
        L.draw += L.discard;
        L.discard = 0;
        // card backs riffle from the discard pile over to the draw pile
        const T = 0.24, g = 1100;
        for (let i = 0; i < n; i++) {
          j.particles.spawn('cardback', PILES.discard.x, PILES.discard.y - 6, (PILES.draw.x - PILES.discard.x) / T, -(g * T) / 2, { g, drag: 1, life: T * 1000, wobble: 0, colors: [C.white] });
          await this.wait(28);
        }
        await this.wait(STEP);
        break;
      }
      case 'card_played': {
        await this.flushInPlay();
        this.comboHits = 0;
        const f = this.takeFromHand(e.uid);
        const def = getCardDef(e.cardId);
        // every 3rd play is a Cadence beat; only decks that use Cadence (the meter is shown) celebrate it
        const beat = e.onBeat && this.metronome !== null ? (Math.min(3, ++this.beatsThisTurn) as 1 | 2 | 3) : null;
        this.playsThisTurn += 1;
        if (!beat) this.metronome?.set((this.playsThisTurn + (this.animCombat().counters['beatOffset'] ?? 0)) % 3, false); // beatOffset exists only after Tempo Draught
        if (f) {
          f.setZ(Z.CARD_TOP + 10);
          let flight = STEP + 30;
          let beatAt: number | null = null;
          if (beat) {
            // the Cadence beat lands ON the music's beat: stretch the flight to arrive with it
            const q = j.beatLead(flight / this.app.tweens.speed);
            if (q && q.waitMs < 1100) { flight = q.waitMs; beatAt = q.at; }
          }
          if (beat && beatAt !== null) this.juice.cadence(beat, beatAt); // queued now, sounds exactly on the beat
          sfx.play(def.type === 'attack' ? 'playAttack' : def.type === 'power' ? 'playPower' : 'playSkill');
          logCue('card', 'windup');
          const stopTrail = j.trail(() => ({ x: f.rect.x + 32, y: f.rect.y + 44 }), def.type);
          try { await this.flyTo(f, PLAY.x, PLAY.y, flight); } finally { stopTrail(); }
          if (beat) { logCue('card', 'beat-impact'); this.beatImpact(beat, beatAt !== null, PLAY.cx, PLAY.cy); }
          this.inPlay = { uid: e.uid, frame: f };
          await this.wait(70);
        } else if (beat) this.beatImpact(beat, false, PLAY.cx, PLAY.cy);
        if (e.onBeat && !beat) this.beatsThisTurn += 1;
        void this.relayoutHand(STEP);
        break;
      }
      case 'damage': {
        const t = this.liveOf(e.target);
        const hpBefore = t.hp;
        // Rot's tick is lose_hp of exactly its stacks on the Rotting enemy (the +1 Rot follows)
        const rot = t.statuses['rot'] ?? 0; // absent = no Rot
        const rotTick = e.kind === 'hp_loss' && e.target !== 'player' && e.source !== 'player' && rot > 0 && e.amount === rot ? rot : 0;
        // Harvest: the player's hp_loss of a whole multiple of the target's Rot (the Rot then halves)
        const harvest = this.harvestFor(e);
        if (harvest) await this.harvestPull(harvest.enemyUid, harvest.rot);
        t.block = Math.max(0, t.block - e.blocked);
        t.guard = Math.max(0, t.guard - e.guarded);
        t.hp = Math.max(0, t.hp - e.hpLost);
        this.showLive(e.target);
        await this.impact(e, hpBefore, rotTick);
        break;
      }
      case 'block': {
        const t = this.liveOf(e.target);
        if (e.pool === 'guard') t.guard += e.amount; else t.block += e.amount;
        this.showLive(e.target);
        const p = this.posOf(e.target);
        const guard = e.pool === 'guard';
        // pips pool into the plate from the card in play (or the enemy itself)
        const from = e.target === 'player' ? { x: PLAY.cx, y: PLAY.cy } : { x: p.x, y: p.y - 20 };
        this.arcParticles(from.x, from.y, p.x, p.y + 10, Math.min(10, 2 + Math.floor(e.amount / 2)), guard ? [C.amber, C.yellow] : [C.skyBlue, C.white], guard ? 'plus' : 'px2');
        await this.wait(guard ? 200 : 150);
        logCue(guard ? 'guard' : 'block', 'impact');
        sfx.play(guard ? 'guard' : 'block', { semis: guard ? Math.min(12, Math.floor(t.guard / 4)) : 0 });
        void floatText(this.app, root, p.x, p.y + 10, `+${e.amount} ${guard ? 'GUARD' : 'BLOCK'}`, guard ? C.amber : C.skyBlue);
        await this.wait(STEP - 40);
        break;
      }
      case 'block_lost': {
        const t = this.liveOf(e.target);
        t.block = Math.max(0, t.block - e.amount);
        this.showLive(e.target);
        if (e.amount > 0 && e.target === 'player') {
          sfx.play('blockLost');
          const p = this.posOf('player');
          j.particles.burst(p.x, p.y + 10, { n: 5, colors: [C.skyBlue, C.steel], shapes: ['px1', 'px2'], speed: [10, 40], angle: Math.PI / 2, spread: 2, gravity: 200, life: [300, 500] });
        }
        break;
      }
      case 'guard_decay': {
        const t = this.liveOf(e.target);
        const before = t.guard;
        t.guard = e.now;
        this.showLive(e.target);
        if (e.lost > 0) {
          const p = this.posOf(e.target);
          sfx.play('guardDecay');
          j.particles.burst(p.x, p.y + 10, { n: Math.min(8, 2 + e.lost), colors: [C.amber, C.rust], shapes: ['px1', 'plus'], speed: [10, 40], angle: Math.PI / 2, spread: 2, gravity: 200, life: [300, 500] });
          await floatText(this.app, root, p.x, p.y + 10, `GUARD ${before} → ${e.now}`, C.amber, { ms: 500 });
        }
        break;
      }
      case 'guard_shed': {
        const t = this.liveOf(e.target);
        t.guard = e.now;
        this.showLive(e.target);
        const p = this.posOf(e.target);
        logCue('shed', 'impact');
        sfx.play('shed');
        // the plates fall off
        j.particles.burst(p.x, p.y + 8, { n: Math.min(16, 3 + e.amount), colors: [C.amber, C.rust, C.yellow], shapes: ['px3', 'px2'], speed: [30, 100], angle: -Math.PI / 2, spread: 2.4, gravity: 420, life: [400, 700], jitter: 12 });
        void floatText(this.app, root, p.x, p.y + 10, `SHED ${e.amount}`, C.amber, { ms: 500 });
        // the Shed amount flies to what consumes it (Molten Shell: the hit on the lowest-HP enemy that follows)
        const next = this.batch.slice(this.batchAt + 1, this.batchAt + 6).find((x): x is Extract<GameEvent, { t: 'damage' }> => x.t === 'damage' && x.source === 'player' && x.target !== 'player');
        if (next) {
          const q = this.posOf(next.target);
          this.arcParticles(p.x, p.y, q.x, q.y, Math.min(12, 3 + e.amount), [C.amber, C.orange, C.yellow], 'px3', 300);
          await this.wait(300);
        } else await this.wait(220);
        break;
      }
      case 'next_turn_bank': {
        // energy / draw banked for next turn: the pending readout lights up beside the orb
        logCue('bank', 'add');
        this.bankLabel.set(e.energy, e.draw);
        sfx.play('bank', { semis: -5 });
        j.particles.burst(this.bankLabel.rect.x + 30, this.bankLabel.rect.y + 3, { n: 8, colors: [C.amber, C.yellow], shapes: ['px1', 'plus'], speed: [20, 60], life: [250, 400] });
        await this.wait(80);
        break;
      }
      case 'timeline_gathered': {
        // Gather: every chip slides into the latest column and locks
        logCue('timeline', 'gather');
        sfx.play('gather');
        const turn = this.animCombat().turn;
        const slots = timelineSlots(this.minis.map((m, i) => ({ uid: m.uid, dueTurn: e.dueTurn, seq: i })), turn);
        await Promise.all(this.minis.map((m) => {
          const sl = slots.find((x) => x.uid === m.uid);
          if (!sl) throw new Error(`gather: no slot for chip ${m.uid}`);
          return this.flyTo(m, sl.x, sl.y, 200);
        }));
        for (const m of this.minis) j.particles.burst(m.rect.x + 25, m.rect.y + 6, { n: 4, colors: [C.iceBlue, C.white], shapes: ['px1'], speed: [20, 50], life: [200, 300] });
        void floatText(this.app, root, TIMELINE.x + 160, TIMELINE.y + 24, 'GATHER', C.iceBlue);
        await this.wait(80);
        break;
      }
      case 'beat_shift': {
        // Quicken: the meter jumps ahead with a run of rising ticks
        logCue('beat', 'quicken');
        const from = e.now - e.delta;
        for (let i = 1; i <= Math.min(6, e.delta); i++) {
          this.metronome?.set((from + i) % 3, false);
          sfx.play('tick', { semis: i * 3 });
          if (this.metronome) j.particles.burst(this.metronome.rect.x + ((from + i - 1) % 3) * 11 + 4, this.metronome.rect.y + 4, { n: 3, colors: [C.yellow, C.white], shapes: ['px1'], speed: [20, 60], life: [150, 260] });
          await this.wait(70);
        }
        this.metronome?.pulse(TUNING.cadence.beats.includes(e.now + 1));
        void floatText(this.app, root, 535, 228, `QUICKEN +${e.delta}`, C.yellow);
        break;
      }
      case 'heal': {
        const t = this.liveOf(e.target);
        t.hp = Math.min(t.maxHp, t.hp + e.amount);
        this.showLive(e.target);
        const p = this.posOf(e.target);
        sfx.play('heal');
        j.particles.burst(p.x, p.y + 10, { n: 8 + Math.min(12, e.amount), colors: [C.lime, C.mint, C.white], shapes: ['plus', 'px1'], speed: [20, 60], angle: -Math.PI / 2, spread: 1.6, gravity: -30, life: [400, 700], jitter: 10 });
        void j.pop(p.x, p.y, `+${e.amount}`, C.lime, Juice.sizeFor(e.amount));
        await this.wait(STEP);
        break;
      }
      case 'max_hp':
        L.player.maxHp = e.now;
        this.showLive('player');
        if (e.delta > 0) sfx.play('heal', { semis: 5 });
        break;
      case 'status': {
        const t = this.liveOf(e.target);
        if (e.now === 0) delete t.statuses[e.status];
        else t.statuses[e.status] = e.now;
        this.showLive(e.target);
        const def = getStatusDef(e.status);
        const quiet = await this.statusJuice(e);
        if (!def.hidden && e.delta !== 0) {
          const p = this.posOf(e.target);
          if (e.status === 'rot' && e.delta > 0 && e.target !== 'player' && this.spreadFrom) {
            // Rot spreads off the dead: a glob arcs from the corpse to its neighbour
            const from = this.spreadFrom;
            this.spreadFrom = null;
            sfx.play('rotSpread');
            this.arcParticles(from.x, from.y, p.x, p.y, 8, [C.lilac, C.purple], 'px3', 360);
            await this.wait(340);
            rotBubbles(j, p.x, p.y, e.now);
            sfx.play('rot', { semis: 3 });
          } else if (e.delta > 0 && !quiet) {
            if (e.status === 'onslaught' && e.target === 'player') {
              // Onslaught climbs: the blip rises with the stacks and the counter sparks
              sfx.play('onslaught', { semis: Math.min(14, e.now) });
              j.particles.burst(50, 248, { n: 3 + Math.min(10, e.now), colors: [C.red, C.orange, C.yellow], shapes: ['px1', 'px2'], speed: [30, 90 + e.now * 6], life: [200, 400] });
            } else if (e.status === 'rot') sfx.play('rot', { semis: 5 });
            else if (!e.status.startsWith('riposte')) sfx.play(def.isDebuff ? 'debuff' : 'buff');
          }
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
        if (e.delta > 0 && this.playsThisTurn > 0) { // not the turn-start refill
          sfx.play('energy');
          j.particles.burst(this.energy.rect.x + 13, this.energy.rect.y + 13, { n: 8, colors: [C.amber, C.yellow, C.white], shapes: ['px1', 'plus'], speed: [30, 80], life: [250, 450] });
        }
        break;
      case 'enemy_intent':
      case 'enemy_forecast':
        break; // shown by sync() after the batch (the intent box flickers when the forecast changes)
      case 'enemy_move': {
        const u = this.units.get(e.uid);
        // the move being made is the intent shown before this batch (the final state already holds the next one)
        const intent = prev.combat?.enemies.find((x) => x.uid === e.uid)?.intent;
        const attacking = intent !== undefined && isAttackKind(intent.kind);
        if (u && attacking) {
          // windup (rear back) -> strike pose; the damage events that follow are the impact
          void banner(this.app, root, e.name.toUpperCase(), 360, 'top');
          const v = u.view;
          const c = new Cue(this.app.tweens, 'enemy-attack')
            .at(0, 'windup', () => { v.setLunge(-2); v.sprite.setFlash(true); })
            .at(50, 'windup2', () => { v.setLunge(-3); v.sprite.setFlash(false); sfx.play('enemyAttack'); })
            .at(150, 'strike', () => v.setLunge(3))
            .at(180, 'impact', () => v.setLunge(6));
          await c.play();
          // recover after the hits have landed
          void this.wait(260).then(() => v.setLunge(3)).then(() => this.wait(40)).then(() => v.setLunge(0));
        } else {
          if (u) { sfx.play('enemyBuff'); void j.shake(u.view.node, 2, 120); }
          await banner(this.app, root, e.name.toUpperCase(), 300, 'top');
        }
        break;
      }
      case 'enemy_phase': {
        // boss phase change, ON the beat: palette flash toward white (whole SMS levels), sting, shake, banner
        const wait = j.playOnBeat('phase', 40);
        await this.wait(Math.min(900, wait));
        logCue('phase', 'impact');
        const u = this.units.get(e.uid);
        if (u) { const p = this.posOf(e.uid); j.particles.ring(p.x, p.y, 24, 180, [C.white, C.red, C.yellow], 'plus', 520); }
        void j.shake(root, 4, 400);
        await j.screenFlash(3, C.red);
        await banner(this.app, root, `PHASE ${e.phase}`, 450);
        break;
      }
      case 'attack_cancelled': {
        const p = this.posOf(e.uid);
        sfx.play('cancelled');
        j.particles.burst(p.x, p.y, { n: 10, colors: [C.yellow, C.grey], shapes: ['px1', 'px2'], speed: [30, 90], gravity: 200, life: [300, 500] });
        await floatText(this.app, root, p.x, p.y, 'CANCELLED', C.yellow, { big: true, ms: 450 });
        break;
      }
      case 'enemy_spawned':
      case 'enemy_transformed': {
        // The fight may have ended later in this batch (state.combat gone, BUG-7): then this enemy was
        // spawned and removed within the batch and never gets a view. Its later events (Ripening, its
        // death) still reach the live model, so register it there with no on-screen numbers.
        if (this.state.combat) this.sync();
        else if (e.t === 'enemy_spawned' && this.live && !this.live.enemies.has(e.uid)) this.live.enemies.set(e.uid, { hp: 0, maxHp: 0, block: 0, guard: 0, statuses: {} });
        const u = this.units.get(e.uid);
        if (this.introRevealed && e.t === 'enemy_spawned') break; // the boss intro showed them already
        sfx.play('spawn', { semis: e.t === 'enemy_transformed' ? -5 : 0 });
        if (u) {
          const p = this.posOf(e.uid);
          j.particles.burst(p.x, p.y, { n: 14, colors: [C.white, C.iceBlue], shapes: ['px1', 'plus'], speed: [40, 120], life: [250, 450] });
          for (let i = 0; i < 4; i++) { u.view.visible = i % 2 === 1; await this.wait(45); }
          u.view.visible = true;
        }
        await this.wait(STEP);
        break;
      }
      case 'enemy_died': {
        const u = this.units.get(e.uid);
        this.marks.get(e.uid)?.set(false, false); // no marks on a dissolving corpse
        const rot = this.liveOf(e.uid).statuses['rot'] ?? 0; // absent = no Rot
        if (rot > 1) this.spreadFrom = this.posOf(e.uid); // a Rot spread may follow (status event on a neighbour)
        if (u) {
          await enemyDeath(j, u.view, this.isBossEnemy(e.uid));
          this.removeUnit(u);
        }
        break;
      }
      case 'enemy_fled': {
        const u = this.units.get(e.uid);
        if (u) {
          sfx.play('flee');
          for (const y of [-2, -6, -12, -20]) { u.view.setLunge(y); await this.wait(30); }
          await blinkOut(this.app.tweens, u.view.sprite, 200);
          this.removeUnit(u);
        }
        break;
      }
      case 'player_died': {
        const now = sfx.nowOrNull();
        if (now !== null) this.app.music.cutFor(now, 4);
        sfx.play('lose');
        void j.shake(root, 4, 400);
        for (const lv of [-1, -2]) { this.app.display.setFade(lv); await this.wait(120); }
        await banner(this.app, root, 'DEFEATED', 700);
        this.app.display.setFade(0);
        break;
      }
      case 'combat_won': {
        // the fanfare lands on the music's beat; the music drops out for it and restarts after
        const c = this.animCombat();
        const fan = c.isBoss ? 'fanfareBoss' : c.isElite ? 'fanfareElite' : 'win';
        const seconds = c.isBoss ? 2.0 : c.isElite ? 1.3 : 0.8;
        const q = j.beatLead(60);
        if (q && q.waitMs < 900) {
          // queue the drop-out and the fanfare on the audio clock first, then bring the picture in on it
          this.app.music.cutFor(q.at, seconds + 0.4);
          sfx.play(fan, { at: q.at });
          await this.wait(q.waitMs);
        } else {
          const now = sfx.nowOrNull();
          if (now !== null) this.app.music.cutFor(now, seconds + 0.4);
          sfx.play(fan);
        }
        logCue('victory', 'impact');
        j.particles.ring(320, 160, 28, 170, [C.yellow, C.amber, C.white], 'plus', 700);
        j.particles.burst(320, 160, { n: 30, colors: [C.yellow, C.white, C.amber], shapes: ['px2', 'plus', 'star'], speed: [40, 160], gravity: 120, life: [500, 1000], jitter: 30 });
        await banner(this.app, root, c.isBoss ? 'BOSS DEFEATED' : c.isElite ? 'ELITE DEFEATED' : 'VICTORY', Math.max(600, seconds * 1000));
        break;
      }
      case 'card_primed': {
        const f = this.takeFromHand(e.uid);
        const n = this.rack.length + 1;
        if (f) {
          await this.flyTo(f, this.rackSlotX(n - 1, n), RACK_Y - 30, STEP);
          this.removeWidget(f);
        }
        if (!this.state.combat) break; // the fight ended later in this batch: there is no rack any more (e2e smoke E2E0)
        const finalEntry = this.finalPrimed().find((p) => p.card.uid === e.uid); // absent: it fired or fizzled later in this batch
        const chip = this.addRackChip(e.uid, finalEntry ? finalEntry.charges + (this.pendingTriggers.get(e.uid) ?? 0) : 1);
        this.layoutRack();
        sfx.play('prime');
        j.particles.burst(chip.rect.x + 30, chip.rect.y + 6, { n: 8, colors: [C.iceBlue, C.white], shapes: ['px1', 'plus'], speed: [30, 80], life: [200, 400] });
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
        if (chip) {
          const stopTrail = j.trail(() => ({ x: chip.rect.x + 30, y: chip.rect.y + 6 }), 'skill');
          try { await this.flyTo(chip, p.x - 30, p.y, STEP + 40); } finally { stopTrail(); }
        }
        // the parry: clang + flash + hit-stop at the point of contact
        logCue('riposte', 'impact');
        parryImpact(j, p.x, p.y);
        if ((this.liveOf('player').statuses['answer_in_kind'] ?? 0) > 0) { // absent = no Answer in Kind
          // the Riposte also resolves its played effects: a second flash, a fifth higher, gold
          logCue('riposte', 'answer-in-kind');
          await this.wait(110);
          this.app.sfx.play('parry', { semis: 7 });
          j.particles.ring(p.x, p.y, 16, 190, [C.yellow, C.white], 'star', 380);
          void j.screenFlash(2, C.yellow);
          void floatText(this.app, root, p.x, p.y - 38, 'ANSWER IN KIND', C.yellow, { ms: 520 });
        }
        const u = this.units.get(e.attacker);
        if (u) { u.view.setLunge(0); void flash(this.app.tweens, u.view.sprite, 200); }
        await floatText(this.app, root, p.x, p.y - 24, `RIPOSTE! ${name.toUpperCase()}`, C.iceBlue, { big: true, ms: 450 });
        // a chip with charges left (more triggers this batch, or still primed at the end) flies home
        const stays = left > 0 || this.finalPrimed().some((x) => x.card.uid === e.uid);
        if (chip && home && stays) await this.flyTo(chip, home.x, home.y, STEP);
        else if (chip) { this.removeRackChip(chip); this.layoutRack(); }
        break;
      }
      case 'prime_fizzled': {
        const chip = this.rack.find((m) => m.uid === e.uid);
        sfx.play('fizzle');
        if (chip) {
          j.particles.burst(chip.rect.x + 30, chip.rect.y + 6, { n: 6, colors: [C.grey, C.darkGrey], shapes: ['px1'], speed: [10, 40], gravity: 100, life: [300, 500] });
          await blinkOut(this.app.tweens, { setDim: (n) => { chip.visible = n < 3; } }, 200);
          this.removeRackChip(chip);
          this.layoutRack();
        }
        void floatText(this.app, root, 320, RACK_Y - 8, 'FIZZLED', C.textMuted);
        break;
      }
      case 'timeline_added': {
        const ip = this.inPlay?.uid === e.uid ? this.inPlay : null;
        const scheduled = ip ? null : this.takeFromHand(e.uid); // Schedule: straight from the hand
        const returning = !ip && !scheduled && this.resolvedThisBatch.has(e.uid); // Eternal Return
        if (scheduled) {
          logCue('delay', 'schedule');
          scheduled.setZ(Z.CARD_TOP + 10);
          const stopTrail = j.trail(() => ({ x: scheduled.rect.x + 32, y: scheduled.rect.y + 44 }), 'skill');
          try { await this.flyTo(scheduled, TIMELINE.x + 40, TIMELINE.y, STEP + 60); } finally { stopTrail(); }
          this.removeWidget(scheduled);
          void this.relayoutHand(STEP);
          void floatText(this.app, root, TIMELINE.x + 60, TIMELINE.y + 36, 'SCHEDULED', C.iceBlue);
        } else if (returning) {
          // the resolved card loops back onto the Timeline: a descending chime, a ring that closes in
          logCue('delay', 'return');
          sfx.play('resolve', { semis: -12 });
          for (let k = 0; k < 16; k++) {
            const a = (k / 16) * Math.PI * 2, R = 40, T = 0.3;
            j.particles.spawn('px2', TIMELINE.x + 60 + Math.cos(a) * R, TIMELINE.y + 8 + Math.sin(a) * R, -Math.cos(a) * R / T, -Math.sin(a) * R / T, { g: 0, drag: 1, life: T * 1000, wobble: 0, colors: [C.violet, C.iceBlue] });
          }
          void floatText(this.app, root, TIMELINE.x + 60, TIMELINE.y + 36, 'ETERNAL RETURN', C.lilac, { ms: 600 });
          await this.wait(300);
        }
        if (ip) {
          this.inPlay = null;
          const stopTrail = j.trail(() => ({ x: ip.frame.rect.x + 32, y: ip.frame.rect.y + 44 }), 'skill');
          try { await this.flyTo(ip.frame, TIMELINE.x + 40, TIMELINE.y, STEP + 20); } finally { stopTrail(); }
          this.removeWidget(ip.frame);
        }
        logCue('delay', 'impact');
        sfx.play('delay');
        j.particles.burst(TIMELINE.x + 60, TIMELINE.y + 8, { n: 10, colors: e.onBeat ? [C.yellow, C.white] : [C.iceBlue, C.white], shapes: ['px1', 'plus'], speed: [20, 70], life: [300, 500] });
        void floatText(this.app, root, TIMELINE.x + 60, TIMELINE.y + 24, e.onBeat ? 'DELAYED (ON BEAT)' : 'DELAYED', e.onBeat ? C.yellow : C.iceBlue);
        break;
      }
      case 'timeline_shifted': {
        const now = sfx.nowOrNull();
        for (let i = 0; i < Math.min(4, Math.abs(e.delta)); i++) sfx.play('tick', { semis: e.delta < 0 ? i * 2 : -i * 2, ...(now === null ? {} : { at: now + i * 0.11 }) });
        void floatText(this.app, root, TIMELINE.x + 160, TIMELINE.y + 24, e.delta < 0 ? `ADVANCE ${-e.delta}` : `POSTPONE ${e.delta}`, C.iceBlue);
        if (this.state.combat) this.syncMinis(); // the fight may have ended later in this batch (BUG-7)
        await this.wait(STEP);
        break;
      }
      case 'timeline_resolved': {
        // resolves cascade: each one in the same batch chimes higher and hits harder
        const idx = this.resolvesThisBatch++;
        const chip = this.minis.find((m) => m.uid === e.uid);
        const at = chip ? { x: chip.rect.x + 25, y: chip.rect.y + 6 } : { x: 320, y: 70 };
        if (chip) {
          // the first resolve winds up; the rest of the cascade comes faster
          for (let i = 0; i < (idx === 0 ? 3 : 1); i++) { chip.visible = false; await this.wait(35); chip.visible = true; await this.wait(35); }
          chip.visible = false;
        }
        logCue('timeline', `resolve${idx}`);
        this.resolvedThisBatch.add(e.uid);
        const batchSize = this.batch.filter((x) => x.t === 'timeline_resolved').length;
        // a batch resolves as a chord that grows with it (Chorus); a lone card keeps its chime
        if (batchSize > 1) j.resolveChord(Math.min(3, idx + 1) as 1 | 2 | 3, Math.min(12, idx * 2));
        else sfx.play('resolve');
        const eclipseAt = getCardDef('total_eclipse').values?.['threshold'];
        if (eclipseAt === undefined) throw new Error('total_eclipse has no threshold value');
        if ((this.liveOf('player').statuses['total_eclipse'] ?? 0) > 0 && batchSize >= eclipseAt) { // absent = no Total Eclipse
          // Total Eclipse: each resolves a second time, a dark doubled bell
          logCue('timeline', 'eclipse');
          void this.wait(150).then(() => {
            this.app.sfx.play('eclipse', { semis: Math.min(7, idx * 2) });
            void j.screenFlash(-1, C.violet);
            j.particles.ring(PLAY.cx, PLAY.cy, 18, 160, [C.violet, C.white, C.black], 'plus', 440);
            void floatText(this.app, root, PLAY.cx + 44, PLAY.y - 26, 'ECLIPSE ×2', C.lilac, { ms: 500 });
          });
        }
        const hot = idx > 0 ? [C.yellow, C.iceBlue, C.white] : [C.iceBlue, C.white];
        j.particles.ring(at.x, at.y, 16 + idx * 6, 150 + idx * 40, hot, idx > 0 ? 'plus' : 'px2', 420);
        // a comet drops from the Timeline to the stage, where the card's effect lands
        const T = 0.22;
        for (let k = 0; k < 6; k++) j.particles.spawn(k === 0 ? 'star' : 'px2', at.x, at.y, (PLAY.cx - at.x) / T, (PLAY.cy - at.y) / T, { g: 0, drag: 1, life: T * 1000 - k * 12, wobble: 0, colors: hot });
        void this.wait(T * 1000).then(() => j.particles.burst(PLAY.cx, PLAY.cy, { n: 10 + idx * 6, colors: hot, shapes: ['plus', 'px2'], speed: [50, 140 + idx * 30], life: [250, 450] }));
        j.hitStop(Math.min(90, 20 + idx * 18));
        if (idx > 0) { void j.shake(root, Math.min(4, idx + 1), 160); void j.screenFlash(1, C.iceBlue); }
        const name = getCardDef(this.findCard(e.uid, this.state, prev).id).name.toUpperCase();
        const label = floatText(this.app, root, PLAY.cx + 44, PLAY.y - 14, idx > 0 ? `${name} RESOLVES  CASCADE ×${idx + 1}` : `${name} RESOLVES`, idx > 0 ? C.yellow : C.iceBlue, { ms: 400 });
        if (idx === 0) await label; else await this.wait(160);
        break;
      }
      case 'bloom': {
        const f = this.hand.get(e.uid);
        const to = f ? { x: f.rect.x + 52, y: f.rect.y + 30 } : e.spill ? { x: PILES.draw.x, y: PILES.draw.y - 6 } : { x: 64, y: 252 };
        if (e.spill) {
          // Spill: the Bloom a card couldn't hold flies on to the least-grown card with room
          logCue('bloom', 'spill');
          const from = this.lastBloomAt ?? { x: PLAY.cx, y: PLAY.cy };
          this.arcParticles(from.x, from.y, to.x, to.y, 8, [C.lime, C.leaf, C.mint], 'px2', 320);
          sfx.play('bloom', { semis: 7 });
          void floatText(this.app, root, from.x, from.y - 14, 'SPILL', C.lime, { ms: 420 });
          await this.wait(320);
        }
        this.lastBloomAt = to;
        if (this.lastScrapAt) {
          const leaf = this.add(new Icon(this.lastScrapAt.x, this.lastScrapAt.y, this.app.icons, 'leaf'));
          leaf.setZ(Z.TOAST - 5);
          await this.flyTo(leaf, to.x - 6, to.y - 6, STEP + 60);
          this.removeWidget(leaf);
          this.lastScrapAt = null;
        }
        // growth: a sparkle chime on the card (higher as the Bloom grows) and a leaf burst
        logCue('bloom', 'impact');
        sfx.play('bloom', { semis: Math.min(12, Math.max(0, e.now - 1)) });
        leafBurst(j, to.x, to.y, 8 + Math.min(12, e.delta * 3));
        if (e.delta > 0 && e.now >= TUNING.bloomRipe && e.now - e.delta < TUNING.bloomRipe) {
          // Ripe for the first time: a golden bell, a gold ring, and the card takes its gold rim
          logCue('bloom', 'ripe');
          const now = sfx.nowOrNull();
          sfx.play('ripe', now === null ? {} : { at: now + 0.12 });
          j.particles.ring(to.x - 20, to.y + 14, 20, 140, [C.yellow, C.amber, C.white], 'star', 520);
          void floatText(this.app, root, to.x - 20, to.y - 24, 'RIPE!', C.yellow, { big: true, ms: 600 });
          if (f && !this.ripeRims.has(e.uid)) this.ripeRims.set(e.uid, f.addChild(new RipeRim(f.rect.x, f.rect.y), 6));
        }
        if (f) void j.shake(f.node, 1, 100);
        await floatText(this.app, root, to.x, to.y - 10, `${e.delta > 0 ? '+' : ''}${e.delta} ✿`, C.lime, { big: true, ms: 420 });
        break;
      }
      case 'relic_trigger': {
        const i = this.state.player.relics.findIndex((r) => r.id === e.relic);
        const icon = this.relicIcons[i];
        sfx.play('relic');
        if (icon) {
          void flash(this.app.tweens, icon.sprite, 300);
          j.particles.burst(icon.rect.x + 8, icon.rect.y + 8, { n: 6, colors: [C.cyan, C.white], shapes: ['px1', 'plus'], speed: [20, 60], life: [200, 400] });
        }
        break;
      }
      case 'cap_hit':
        sfx.play('cancel');
        this.app.toasts.show(`${e.cap.replace(/^cap_/, '').replace(/_/g, ' ').toUpperCase()} REACHED`, 1600);
        break;
      case 'text': {
        this.app.toasts.show(e.text.toUpperCase(), 1800);
        break;
      }
      case 'embers_converted': {
        // Embers convert at turn start: the coals flare and crackle, sparks fly to the Onslaught counter
        // (the Onslaught gain itself follows as a status event with its own blip)
        logCue('embers', 'convert');
        sfx.play('crackle');
        this.emberGlow.flare();
        for (let i = 0; i < Math.min(this.emberGlow.count, e.amount); i++) { const c = this.emberGlow.coalPos(i); this.arcParticles(c.x, c.y, 50, 248, 2, [C.orange, C.yellow], 'px2', 260); }
        await this.wait(260);
        j.particles.burst(50, 248, { n: 6 + Math.min(10, e.amount * 2), colors: [C.red, C.orange, C.yellow], shapes: ['px1', 'px2'], speed: [30, 120], life: [200, 400] });
        break;
      }
      case 'harvest':
        // shown with its HP loss (harvestFor); a Harvest that cost no HP still gets its pull
        if (!this.harvestsShown.has(this.batchAt)) await this.harvestPull(e.enemyUid, e.rot);
        break;
      case 'salvage': {
        // a Scrapped card's Salvage: scrap sparks fly off the Scrapheap
        logCue('salvage', 'impact');
        sfx.play('salvage');
        j.particles.burst(PILES.scrap.x, PILES.scrap.y - 8, { n: 16, colors: [C.orange, C.yellow, C.white, C.rust], shapes: ['px1', 'px2', 'plus'], speed: [60, 160], angle: -Math.PI / 2, spread: 1.6, gravity: 360, life: [300, 600] });
        await this.wait(120);
        break;
      }
      case 'reprise': {
        // Reprise: the card replays with a ghost echo of itself
        logCue('reprise', 'echo');
        sfx.play('reprise');
        const ip = this.inPlay?.uid === e.cardUid ? this.inPlay : null;
        if (ip) {
          const ghost = this.add(new CardFrame(ip.frame.rect.x, ip.frame.rect.y, ip.frame.cardFace));
          ghost.setZ(Z.CARD_TOP + 5);
          ghost.setDimmed(true);
          await this.flyTo(ghost, ip.frame.rect.x + 14, ip.frame.rect.y - 10, 120);
          await blinkOut(this.app.tweens, { setDim: (n) => { ghost.visible = n < 3 && n % 2 === 0; } }, 200);
          this.removeWidget(ghost);
        }
        break;
      }
      case 'card_added':
        this.batchCards.set(e.card.uid, e.card);
        if (e.card.id === 'chaff') {
          // a Chaff token puffs into being
          logCue('chaff', 'puff');
          sfx.play('puff');
          const at = e.where === 'hand' ? { x: 320, y: 164 } : e.where === 'discard' ? PILES.discard : PILES.draw;
          j.particles.burst(at.x, at.y - 6, { n: 12, colors: [C.grey, C.darkGrey, C.rust, C.white], shapes: ['px2', 'px3', 'ring'], speed: [20, 70], gravity: -30, drag: 0.4, life: [350, 600], jitter: 6 });
        }
        if (e.where === 'hand') {
          // The opening sync already built (hidden) frames for the whole final hand, this card included:
          // reuse that frame. A second one left the first orphaned in the focus scope, wired to a card
          // that later left the hand, and a click on it crashed ("tryPlay: 18 not in hand", BUG-14).
          let f = this.hand.get(e.card.uid);
          if (f) f.moveTo(320 - 32, 120);
          else {
            f = this.add(new CardFrame(320 - 32, 120, cardFace(this.app, e.card, { state: this.state }), e.card.uid));
            this.wireCard(f, e.card.uid);
            this.hand.set(e.card.uid, f);
          }
          f.visible = true;
          if (!this.handOrder.includes(e.card.uid)) this.handOrder.push(e.card.uid);
          sfx.play('cardAdd');
          j.particles.burst(320, 164, { n: 10, colors: [C.white, C.yellow], shapes: ['px1', 'plus'], speed: [30, 90], life: [250, 450] });
          void this.relayoutHand(STEP);
          await this.wait(STEP);
        } else {
          sfx.play('cardAdd', { semis: -5 });
          void floatText(this.app, root, 320, 120, `+ ${getCardDef(e.card.id, e.card.upgraded).name.toUpperCase()}`, C.text);
          if (e.where === 'draw') L.draw += 1; else if (e.where === 'discard') L.discard += 1;
        }
        break;
      case 'card_upgraded': {
        const f = this.hand.get(e.uid);
        sfx.play('upgrade');
        if (f) {
          j.particles.burst(f.rect.x + 32, f.rect.y + 30, { n: 12, colors: [C.lime, C.white], shapes: ['plus', 'px1'], speed: [20, 70], angle: -Math.PI / 2, spread: 2, life: [300, 500] });
          void floatText(this.app, root, f.rect.x + 32, f.rect.y, 'UPGRADED', C.lime);
        }
        break;
      }
      case 'gold':
        if (e.delta !== 0) sfx.play('gold');
        this.toastEvents([e]);
        break;
      case 'relic_gained':
        sfx.play('relic');
        this.toastEvents([e]);
        break;
      case 'potion_gained':
        sfx.play('potion');
        this.toastEvents([e]);
        break;
      case 'shards':
      case 'relic_lost':
      case 'potion_lost':
      case 'card_removed':
        this.toastEvents([e]);
        break;
      case 'potion_used': {
        sfx.play('potion');
        const p = this.posOf('player');
        j.particles.burst(p.x, p.y, { n: 12, colors: [C.magenta, C.lilac, C.white], shapes: ['px2', 'ring', 'px1'], speed: [15, 50], angle: -Math.PI / 2, spread: 1.4, gravity: -40, life: [400, 700], jitter: 8 });
        void floatText(this.app, root, 320, 120, getPotionDef(e.potion).name.toUpperCase(), C.magenta);
        break;
      }
      case 'choice':
      case 'phase':
        break;
      default: {
        // every GameEvent has a handler above: a new event type without one fails typecheck here
        const unhandled: never = e;
        throw new Error(`combat animator: no handler for event ${JSON.stringify(unhandled)}`);
      }
    }
  }
}
