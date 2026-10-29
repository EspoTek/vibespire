// Mechanic telemetry for one run (GDD §8.6 item 5), collected from the GameEvents of every apply.
// Status stacks are tracked from `status` events (`now`), reset at each combat start.

import { getCardDef } from '../src/content';
import type { Action, GameEvent, RelicId, RunState } from '../src/engine';
import type { Telemetry } from './types';

export function emptyTelemetry(): Telemetry {
  return {
    onslaughtAtAttack: {},
    primed: 0,
    riposteTriggers: 0,
    primeFizzles: 0,
    attackCancels: 0,
    blockAbsorbed: 0,
    guardAbsorbed: 0,
    hitHpLost: 0,
    hitDamage: 0,
    rotDamage: 0,
    otherHpLoss: 0,
    exposedBonus: 0,
    staggerPrevented: 0,
    playerTurns: 0,
    onBeatPlays: 0,
    cardsPlayed: 0,
    timelineAdded: 0,
    timelineResolved: 0,
    bloomGained: 0,
    bloomMax: 0,
    bloomTotal: 0,
    bloomCards: 0,
    potionsUsed: 0,
  };
}

export class TelemetryCollector {
  readonly t: Telemetry = emptyTelemetry();
  /** Combat-scoped status stacks by entity key ('player' or enemy uid). */
  private stacks = new Map<string, Record<string, number>>();
  /** Prunes per combat, in combat order. */
  readonly prunesPerCombat: number[] = [];
  /** Player turns and HP lost per combat (from events, so a fatal fight counts too). */
  readonly turnsPerCombat: number[] = [];
  readonly hpLostPerCombat: number[] = [];
  private curTurns = 0;
  private curHpLost = 0;
  readonly bossRelicScreens: { act: 1 | 2 | 3; offered: RelicId[]; picked: RelicId | null }[] = [];
  private lastPrunes = 0;
  private inCombat = false;

  private get(target: string, id: string): number {
    return this.stacks.get(target)?.[id] ?? 0;
  }

  /** Call with the state before the action, the action, its events and the state after. */
  observe(before: { phase: RunState['phase']; act: 1 | 2 | 3; bossRelicChoices: readonly RelicId[] | null }, action: Action, events: readonly GameEvent[], after: RunState): void {
    if (before.phase === 'boss_reward' && before.bossRelicChoices) {
      if (action.type === 'choose_boss_relic') this.bossRelicScreens.push({ act: before.act, offered: [...before.bossRelicChoices], picked: before.bossRelicChoices[action.index] ?? null });
      else if (action.type === 'skip_boss_relic') this.bossRelicScreens.push({ act: before.act, offered: [...before.bossRelicChoices], picked: null });
    }
    const t = this.t;
    for (const e of events) {
      switch (e.t) {
        case 'phase':
          if (e.phase === 'combat') {
            this.stacks.clear();
            this.inCombat = true;
            this.lastPrunes = 0;
            this.curTurns = 0;
            this.curHpLost = 0;
          } else if (this.inCombat) this.endCombat();
          break;
        case 'status': {
          const key = String(e.target);
          const rec = this.stacks.get(key) ?? {};
          rec[e.status] = e.now;
          this.stacks.set(key, rec);
          break;
        }
        case 'card_played': {
          t.cardsPlayed += 1;
          if (e.onBeat) t.onBeatPlays += 1;
          if (getCardDef(e.cardId).type === 'attack') {
            const k = String(this.get('player', 'onslaught'));
            t.onslaughtAtAttack[k] = (t.onslaughtAtAttack[k] ?? 0) + 1;
          }
          break;
        }
        case 'turn_start':
          t.playerTurns += 1;
          if (this.inCombat) this.curTurns += 1;
          break;
        case 'card_primed':
          t.primed += 1;
          break;
        case 'riposte_triggered':
          t.riposteTriggers += 1;
          break;
        case 'prime_fizzled':
          t.primeFizzles += 1;
          break;
        case 'attack_cancelled':
          t.attackCancels += 1;
          break;
        case 'timeline_added':
          t.timelineAdded += 1;
          break;
        case 'timeline_resolved':
          t.timelineResolved += 1;
          break;
        case 'bloom':
          if (e.delta > 0) t.bloomGained += e.delta;
          break;
        case 'potion_used':
          t.potionsUsed += 1;
          break;
        case 'damage': {
          if (e.target === 'player') {
            if (this.inCombat) this.curHpLost += e.hpLost;
            if (e.kind === 'attack') {
              t.blockAbsorbed += e.blocked;
              t.guardAbsorbed += e.guarded;
              t.hitHpLost += e.hpLost;
              if (typeof e.source === 'number') t.staggerPrevented += this.get(String(e.source), 'stagger');
            }
          } else if (e.kind === 'attack') {
            if (e.source === 'player') {
              t.hitDamage += e.hpLost;
              t.exposedBonus += Math.min(e.amount, this.get(String(e.target), 'exposed'));
            }
          } else if (e.source === e.target && this.get(String(e.target), 'rot') > 0) t.rotDamage += e.hpLost;
          else if (e.source === 'player' || e.source === null) t.otherHpLoss += e.hpLost;
          break;
        }
        default:
          break;
      }
    }
    if (after.combat) this.lastPrunes = after.combat.counters.prunes ?? 0;
    if (this.inCombat && (after.phase !== 'combat' || !after.combat)) this.endCombat();
  }

  private endCombat(): void {
    this.inCombat = false;
    this.prunesPerCombat.push(this.lastPrunes);
    this.turnsPerCombat.push(this.curTurns);
    this.hpLostPerCombat.push(this.curHpLost);
    this.lastPrunes = 0;
  }

  finish(s: RunState): Telemetry {
    if (this.inCombat) this.endCombat();
    for (const c of s.player.deck) {
      const def = getCardDef(c.id);
      if (!def.keywords?.includes('bloom')) continue;
      const b = c.vars?.bloom ?? 0;
      this.t.bloomCards += 1;
      this.t.bloomTotal += b;
      this.t.bloomMax = Math.max(this.t.bloomMax, b);
    }
    return this.t;
  }
}
