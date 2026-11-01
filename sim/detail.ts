// Attribution telemetry for one run (v2 balance analytics): per-card draws, plays and realised
// value; relic triggers; potion use; which enemy moves deal the damage.
//
// Card value is attributed per action: everything a play_card apply causes (enemy HP lost, Block,
// Guard, statuses put on enemies, cards drawn, energy gained) belongs to the played card, including
// relic and Power reactions to that play. Riposte and Timeline resolutions are attributed to their
// card from the 'riposte_triggered' / 'timeline_resolved' event until the next enemy move or turn
// boundary. Damage from statuses ticking later (Rot) belongs to no card, so Powers and Rot appliers
// are under-credited here; the counterfactual tests (sim/counterfactual.ts) measure them instead.

import { getCardDef } from '../src/content';
import { getCardCost, type Action, type CardId, type CombatKind, type GameEvent, type RunState } from '../src/engine';

export interface CardStat {
  /** Copies drawn into the hand (draw events). */
  drawn: number;
  played: number;
  /** Energy paid (X cards: the energy spent). */
  energy: number;
  /** Enemy HP lost (hits and HP loss) during its plays and Riposte / Timeline resolutions. */
  dmg: number;
  block: number;
  guard: number;
  /** Status stacks put on enemies. */
  debuff: number;
  cardsDrawn: number;
  energyGained: number;
  /** Riposte triggers and Timeline resolutions of the card. */
  triggers: number;
}

export interface PotionStat {
  used: number;
  byKind: Partial<Record<CombatKind, number>>;
}

export interface RunDetail {
  cards: Record<CardId, CardStat>;
  relicTriggers: Record<string, number>;
  potions: Record<string, PotionStat>;
  potionsGained: Record<string, number>;
  /** Player HP lost by source: '<enemyId>:<moveId>' for enemy moves, 'self' for everything else. */
  moveDamage: Record<string, number>;
  /** Every GameEvent type seen, counted (guard_shed, timeline_gathered, beat_shift, next_turn_bank, ...). */
  eventCounts: Record<string, number>;
  /** Player statuses: sum over combats of each combat's peak stacks, and the combats it appeared in. */
  statusPeaks: Record<string, { sum: number; combats: number; max: number }>;
  /** Largest enemy HP loss in one player turn (all sources), and the floor of the first turn >= 60. */
  maxTurnDamage: number;
  firstFloor60: number | null;
}

const STATUS_WEIGHT: Record<string, number> = { rot: 3, exposed: 3, stagger: 2.4, halted: 8 };

/** Realised value units (GDD §8.5 d): 1 damage = 1, Block 0.9, Guard 1, draw 3, energy 4.5, debuffs by status. */
export function cardValue(c: CardStat): number {
  return c.dmg + 0.9 * c.block + c.guard + c.debuff + 3 * c.cardsDrawn + 4.5 * c.energyGained;
}

function emptyCard(): CardStat {
  return { drawn: 0, played: 0, energy: 0, dmg: 0, block: 0, guard: 0, debuff: 0, cardsDrawn: 0, energyGained: 0, triggers: 0 };
}

export interface PreAction {
  card: CardId | null;
  energyBefore: number;
  costX: boolean;
}

export class DetailCollector {
  readonly d: RunDetail = { cards: {}, relicTriggers: {}, potions: {}, potionsGained: {}, moveDamage: {}, eventCounts: {}, statusPeaks: {}, maxTurnDamage: 0, firstFloor60: null };
  /** Peak player status stacks in the current combat. */
  private peaks = new Map<string, number>();
  /** Enemy HP lost since the current player turn started. */
  private turnDamage = 0;
  /** Enemy uid -> '<enemyId>:<moveId>' of its current move. */
  private move = new Map<number, string>();
  /** Enemy uid -> enemy id (refreshed from the combat state at every observe). */
  private enemies = new Map<number, string>();
  /**
   * Card uid -> id for every card seen in a combat zone or the deck before an action, plus cards
   * created by it (card_added). A generated card that resolves on the fight-winning action (Jitter
   * on the Timeline) ends in no pile, so the state after the action cannot name it.
   */
  private uids = new Map<number, CardId>();

  private card(id: CardId): CardStat {
    let c = this.d.cards[id];
    if (!c) {
      c = emptyCard();
      this.d.cards[id] = c;
    }
    return c;
  }

  /** Call before applying `a` to `s`. */
  pre(s: RunState, a: Action): PreAction {
    const c = s.combat;
    if (c) {
      for (const pile of [c.hand, c.draw, c.discard, c.exhaust, c.inPlay]) for (const x of pile) this.uids.set(x.uid, x.id);
      for (const p of c.primed) this.uids.set(p.card.uid, p.card.id);
      for (const e of c.timeline) this.uids.set(e.card.uid, e.card.id);
    }
    for (const x of s.player.deck) this.uids.set(x.uid, x.id);
    if (a.type !== 'play_card' || !c) return { card: null, energyBefore: c?.energy ?? 0, costX: false };
    const card = c.hand.find((h) => h.uid === a.uid);
    if (!card) throw new Error(`detail: played uid ${a.uid} not in hand`);
    return { card: card.id, energyBefore: c.energy, costX: getCardCost(s, card) === 'X' };
  }

  private cardOfUid(s: RunState, uid: number): CardId {
    const known = this.uids.get(uid);
    if (known !== undefined) return known;
    const c = s.combat;
    if (c) {
      for (const pile of [c.inPlay, c.discard, c.exhaust, c.hand, c.draw]) {
        const hit = pile.find((x) => x.uid === uid);
        if (hit) return hit.id;
      }
      for (const p of c.primed) if (p.card.uid === uid) return p.card.id;
      for (const t of c.timeline) if (t.card.uid === uid) return t.card.id;
    }
    const deck = s.player.deck.find((x) => x.uid === uid);
    if (deck) return deck.id;
    throw new Error(`detail: card uid ${uid} not found in any pile, the deck, or any earlier state`);
  }

  private enemyId(uid: number): string {
    const id = this.enemies.get(uid);
    if (id === undefined) throw new Error(`detail: enemy uid ${uid} never seen in combat`);
    return id;
  }

  private closePeaks(): void {
    for (const [id, n] of this.peaks) {
      const p = (this.d.statusPeaks[id] ??= { sum: 0, combats: 0, max: 0 });
      p.sum += n;
      p.combats += 1;
      p.max = Math.max(p.max, n);
    }
    this.peaks.clear();
    this.turnDamage = 0;
  }

  /** Close the last combat (a run that ended in combat). */
  finish(): RunDetail {
    this.closePeaks();
    return this.d;
  }

  /** Call after applying the action, with its events and the state after. */
  observe(pre: PreAction, a: Action, events: readonly GameEvent[], s: RunState): void {
    let cur: CardStat | null = pre.card ? this.card(pre.card) : null;
    if (cur && pre.card) {
      cur.played += 1;
      if (pre.costX) cur.energy += pre.energyBefore;
    }
    const kind = s.combat?.kind ?? null;
    if (s.combat) for (const en of s.combat.enemies) this.enemies.set(en.uid, en.id);
    for (const e of events) if (e.t === 'card_added') this.uids.set(e.card.uid, e.card.id);
    for (const e of events) {
      this.d.eventCounts[e.t] = (this.d.eventCounts[e.t] ?? 0) + 1;
      if (e.t === 'status' && e.target === 'player' && e.now > (this.peaks.get(e.status) ?? 0)) this.peaks.set(e.status, e.now);
      if (e.t === 'damage' && e.target !== 'player') {
        this.turnDamage += e.hpLost;
        if (this.turnDamage > this.d.maxTurnDamage) this.d.maxTurnDamage = this.turnDamage;
        if (this.turnDamage >= 60 && this.d.firstFloor60 === null) this.d.firstFloor60 = s.floor;
      }
      if (e.t === 'turn_start') this.turnDamage = 0;
      if (e.t === 'phase' && e.phase !== 'combat') this.closePeaks();
      switch (e.t) {
        case 'draw':
          if (s.combat) for (const uid of e.uids) this.card(this.cardOfUid(s, uid)).drawn += 1;
          if (cur) cur.cardsDrawn += e.uids.length;
          break;
        case 'energy':
          if (cur && e.delta > 0) cur.energyGained += e.delta;
          if (cur && e.delta < 0 && !pre.costX && a.type === 'play_card') cur.energy -= e.delta;
          break;
        case 'damage':
          if (e.target === 'player') {
            const key = typeof e.source === 'number' ? (this.move.get(e.source) ?? `${this.enemyId(e.source)}:?`) : 'self';
            this.d.moveDamage[key] = (this.d.moveDamage[key] ?? 0) + e.hpLost;
          } else if (cur) cur.dmg += e.hpLost;
          break;
        case 'block':
          if (cur && e.target === 'player') {
            if (e.pool === 'guard') cur.guard += e.amount;
            else cur.block += e.amount;
          }
          break;
        case 'status':
          if (cur && typeof e.target === 'number' && e.delta > 0) cur.debuff += (STATUS_WEIGHT[e.status] ?? 2.5) * e.delta;
          break;
        case 'riposte_triggered':
        case 'timeline_resolved':
          cur = this.card(this.cardOfUid(s, e.uid));
          cur.triggers += 1;
          break;
        case 'enemy_move':
          this.move.set(e.uid, `${this.enemyId(e.uid)}:${e.moveId}`);
          if (a.type !== 'play_card') cur = null;
          break;
        case 'turn_start':
        case 'turn_end':
        case 'enemy_turn_start':
          if (a.type !== 'play_card') cur = null;
          break;
        case 'relic_trigger':
          this.d.relicTriggers[e.relic] = (this.d.relicTriggers[e.relic] ?? 0) + 1;
          break;
        case 'potion_used': {
          const p = (this.d.potions[e.potion] ??= { used: 0, byKind: {} });
          p.used += 1;
          if (kind) p.byKind[kind] = (p.byKind[kind] ?? 0) + 1;
          break;
        }
        case 'potion_gained':
          this.d.potionsGained[e.potion] = (this.d.potionsGained[e.potion] ?? 0) + 1;
          break;
        case 'phase':
          if (e.phase === 'combat') {
            this.move.clear();
            this.enemies.clear();
            if (s.combat) for (const en of s.combat.enemies) this.enemies.set(en.uid, en.id);
          }
          break;
        default:
          break;
      }
    }
  }
}

/** Card type lookup kept here so analytics need not import content twice. */
export function cardType(id: CardId): string {
  return getCardDef(id).type;
}
