/**
 * One-time contextual tips (onboarding): the first time a mechanic shows up, a short boxed note
 * explains it at the moment of need. Never modal: the tip takes no focus and swallows no input; the
 * next confirm (Enter / A / click) dismisses it and still does what it would have done. Several
 * tips queue and show one at a time.
 *
 * The "seen" set and the on/off switch persist under their own storage key (not the settings blob),
 * through the same typed Stored wrapper (and its error policy) as the settings and the run save.
 * Options has TIPS ON/OFF and RESET TIPS.
 */
import { TUNING } from '../../engine/index.ts';
import { promptMarkup } from '../actions.ts';
import type { App } from '../app.ts';
import { fonts } from '../fonts.ts';
import { rect, W, type Rect } from '../layout.ts';
import { C } from '../palette.ts';
import type { Screen } from '../screens/Screen.ts';
import { Stored, type Codec, type KeyValueStorage } from '../storage.ts';
import { Label } from '../ui/Label.ts';
import { Panel } from '../ui/Panel.ts';
import { Widget, Z } from '../ui/Widget.ts';

export const TIP_IDS = [
  'riposte', 'guard', 'onslaught', 'bloom', 'rot', 'beat', 'delay', 'augury',
  'shards', 'shop', 'rest', 'elite', 'boss_relic',
] as const;
export type TipId = (typeof TIP_IDS)[number];

/** Title and text per tip, in the game's voice. Kept to two or three short lines. */
export function tipText(id: TipId): { title: string; text: string } {
  switch (id) {
    case 'riposte': return { title: 'RIPOSTE', text: 'Hold a Riposte card at the end of your turn and it is primed. When an enemy attacks, it strikes first.' };
    case 'guard': return { title: 'GUARD', text: 'Guard is the defence that lasts: Block goes first, and Guard only halves when your turn starts.' };
    case 'onslaught': return { title: 'ONSLAUGHT', text: 'Each Attack you play adds 1. Breaker cards hit harder with it, or spend it. It resets when your turn ends.' };
    case 'bloom': return { title: 'BLOOM', text: 'Bloom cards grow for the whole run. Prune Scraps another card in hand to feed one of them.' };
    case 'rot': return { title: 'ROT', text: 'Rot eats HP at the end of its turn, then grows by 1. Block and Guard can\'t stop it.' };
    case 'beat': return { title: 'ON THE BEAT', text: `Cards ${TUNING.cadence.beats.join(', ')} of a turn land on the beat. Gold-edged cards would land on it now.` };
    case 'delay': return { title: 'DELAY', text: 'Delay cards wait on the Timeline (top) and resolve at the start of a later turn, before you draw.' };
    case 'augury': return { title: 'AUGURY', text: 'You see two moves ahead: NEXT beside each intent is what that enemy does after this turn.' };
    case 'shards': return { title: 'SHARDS', text: 'Shards buy deck surgery: Purge and Transmute at rest sites, cheaper removal in shops. Skipping rewards earns them.' };
    case 'shop': return { title: 'SHOP', text: 'Hover or focus anything for its full text. VIEW UPGRADE shows the cards upgraded.' };
    case 'rest': return { title: 'REST SITE', text: 'One action per visit: Rest heals, Smith upgrades a card (before and after shown).' };
    case 'elite': return { title: 'ELITE AHEAD', text: 'Red horned nodes are elites: hard fights that also drop a relic.' };
    case 'boss_relic': return { title: 'BOSS RELIC', text: 'Boss relics are strong but most carry a cost. Read it before you take one.' };
  }
}

export interface TipsState { version: 1; enabled: boolean; seen: TipId[] }

export const TIPS_KEY = 'vibespire.tips.v1';

export const tipsCodec: Codec<TipsState> = (raw, key) => {
  if (typeof raw !== 'object' || raw === null) throw new Error(`storage: "${key}" is not an object`);
  const r = raw as Record<string, unknown>;
  if (r['version'] !== 1) throw new Error(`storage: "${key}" has unsupported version ${String(r['version'])}`);
  const enabled = r['enabled'];
  const seen = r['seen'];
  if (typeof enabled !== 'boolean') throw new Error(`storage: "${key}".enabled invalid: ${String(enabled)}`);
  if (!Array.isArray(seen)) throw new Error(`storage: "${key}".seen is not an array`);
  const ids: TipId[] = [];
  for (const s of seen) {
    const id = TIP_IDS.find((t) => t === s);
    if (id === undefined) throw new Error(`storage: "${key}".seen has unknown tip ${String(s)}`);
    ids.push(id);
  }
  return { version: 1, enabled, seen: ids };
};

/** Tip flags for one storage. */
export class TipsStore {
  private readonly stored: Stored<TipsState>;
  private state: TipsState;

  constructor(kv: KeyValueStorage) {
    this.stored = new Stored(kv, TIPS_KEY, tipsCodec);
    this.state = this.stored.getOrNull() ?? { version: 1, enabled: true, seen: [] }; // null = first run: tips on
  }

  get enabled(): boolean { return this.state.enabled; }
  setEnabled(on: boolean): void { this.state = { ...this.state, enabled: on }; this.stored.set(this.state); }
  seen(id: TipId): boolean { return this.state.seen.includes(id); }
  markSeen(id: TipId): void {
    if (this.seen(id)) return;
    this.state = { ...this.state, seen: [...this.state.seen, id] };
    this.stored.set(this.state);
  }
  /** Forget every seen tip (they show again). */
  reset(): void { this.state = { ...this.state, seen: [] }; this.stored.set(this.state); }
}

const stores = new WeakMap<App, TipsStore>();
/** The app's tip store (one per app; created on first use). */
export function tipsOf(app: App): TipsStore {
  let s = stores.get(app);
  if (!s) { s = new TipsStore(app.storage); stores.set(app, s); }
  return s;
}

const TIP_W = 210;
/** Gap kept between the tip box and anything it avoids (intents, NEXT chips, the Timeline window). */
export const TIP_MARGIN = 4;

/** Does a w x h box at (x, y) come within TIP_MARGIN of any avoided rect? */
export function tipHits(x: number, y: number, w: number, h: number, avoid: readonly Rect[]): boolean {
  const M = TIP_MARGIN; // a clear gap, so the box never butts against an intent chip's edge
  return avoid.some((r) => x < r.x + r.w + M && r.x - M < x + w && y < r.y + r.h + M && r.y - M < y + h);
}

/**
 * Where a tip box goes (pure): the first spot clear of `avoid`, trying the top-right corner, then the
 * top-left, then the top-centre, stepping down each from `startY` to the hand (y 236). Nowhere clear:
 * over the right column (energy / piles), which no intent reaches.
 */
export function tipPosition(w: number, h: number, avoid: readonly Rect[], startY: number): { x: number; y: number } {
  for (let y = startY; y + h <= 236; y += 2) {
    for (const x of [W - w - 6, 6, Math.floor((W - w) / 2)]) if (!tipHits(x, y, w, h, avoid)) return { x, y };
  }
  return { x: W - w - 6, y: 236 };
}

/** The on-screen tip: a boxed note at the top right, under the HUD. Not focusable. */
export class TipLayer extends Widget {
  private readonly app: App;
  private readonly store: TipsStore;
  private readonly queue: TipId[] = [];
  private current: TipId | null = null;
  private panel: Panel | null = null;
  private shownDevice = '';
  private readonly y: number;

  constructor(app: App, screen: Screen, y = 40) {
    super(rect(0, 0, 1, 1), 'tips');
    this.app = app;
    this.store = tipsOf(app);
    this.y = y;
    this.setZ(Z.TOAST - 30);
    screen.add(this);
  }

  /** Queue `id` unless tips are off, it was seen, or it is already queued / showing. */
  offer(id: TipId): void {
    if (!this.store.enabled || this.store.seen(id) || this.current === id || this.queue.includes(id)) return;
    this.queue.push(id);
  }

  get showing(): TipId | null { return this.current; }

  /**
   * Rects the tip must not cover (combat: intents, the Timeline window, the card detail). The tip
   * tries the top-right corner, then the top-left, then lower spots down each side, and takes the
   * first that is clear; checked every frame, since enemies move and die.
   */
  avoid: (() => readonly Rect[]) | null = null;

  private place(): void {
    const p = this.panel;
    if (!p) return;
    const rects = this.avoid?.() ?? [];
    if (!tipHits(p.rect.x, p.rect.y, p.rect.w, p.rect.h, rects)) return;
    const at = tipPosition(p.rect.w, p.rect.h, rects, this.y);
    p.moveTo(at.x, at.y);
  }


  /** Per frame: show the next queued tip; any confirm press or click dismisses the shown one (input is not consumed). */
  override update(_dtMs: number): void {
    const inp = this.app.input;
    if (this.current !== null && (inp.pressed('confirm') || inp.pointer.pressed)) this.dismiss();
    if (this.current === null) {
      const next = this.queue.shift();
      if (next !== undefined) this.show(next);
    } else if (inp.lastDevice !== this.shownDevice) {
      this.show(this.current); // re-render the button prompt for the device in use
    }
    this.place();
  }

  private show(id: TipId): void {
    this.panel?.dispose();
    this.current = id;
    this.shownDevice = this.app.input.lastDevice;
    const t = tipText(id);
    const body = new Label(0, 0, `${t.text}\n[textMuted]${promptMarkup(this.app.input.lastDevice, 'confirm', 'textHi')}: GOT IT   TIPS: OPTIONS[/]`, {
      font: fonts.small, markup: true, maxWidth: TIP_W - 16, lineHeight: 8,
    });
    const h = 22 + body.rect.h + 6;
    const x = W - TIP_W - 6;
    const panel = new Panel(rect(x, this.y, TIP_W, h), { border: C.yellow });
    panel.addChild(new Label(x + 8, this.y + 6, `TIP: ${t.title}`, { color: C.yellow }), 2);
    body.moveTo(x + 8, this.y + 18);
    panel.addChild(body, 2);
    this.panel = this.addChild(panel, 0);
    this.label = `Tip: ${t.title}. ${t.text}`;
    this.store.markSeen(id); // seen once shown, so a quit or a screen change doesn't repeat it
  }

  private dismiss(): void {
    this.panel?.dispose();
    this.panel = null;
    this.current = null;
  }
}
