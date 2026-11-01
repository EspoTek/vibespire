// Whole-turn combat planner (v2): beam search over the turn's play sequences on cloned engine state.
//
// Each node is a real engine state reached by playing cards (pending choices answered by the
// choices.ts heuristics, exactly as the live policy answers them). Nodes are scored mid-turn by
// `midEval`: the greedy `evaluate` terms (enemy threat × turns-to-kill with Rot/Exposed horizons,
// statuses, Bloom, Timeline, Powers) minus the damage the shown intents will land after Block and
// Guard, plus primed Riposte racks. Identical states (transpositions: same hand, energy, HP,
// Block, statuses, enemies) are expanded once. The best `beam` nodes per depth are expanded.
//
// The top `exact` leaves (plus "end the turn now") are then ended in a copy so the real enemy phase,
// Riposte, Rot ticks, Guard decay, Timeline resolutions and the next turn start run through the
// engine, and the next decision point is scored with `evaluate`. The best leaf's line is played.
//
// Information: the copies share the real rng state, so a draw inside the search sees the real next
// card (the v1 greedy bot peeks the same way). Stopping at draws and scoring them by a potential
// bonus was tried first: it made the Breaker give up in lethal spots where only a draw line survives
// (13% win against greedy's 33%, 90 paired seeds). The bias: draw cards are played with perfect
// knowledge of the next card, so their measured value is an upper bound. Enemy intents are
// deterministic (ENGINE_SPEC purity), so the enemy phase is not a peek.
//
// Plans are cached per Game: the next decision follows the stored line while the real state key
// matches the key the search expected, so most turns cost one search.

import { isAttackIntent, legalActions, type Action, type CardInstance, type Effect, type Game, type RunState } from '../../../src/engine';
import { estAmount, infoOf } from './cards';
import { choiceAction } from './choices';
import { sameAction, simGame } from './clone';
import { bankValue, pileValue, shedStockValue, staticTimeline, surplusValue, timelineValue } from './future';
import { attackTotal, avgThreat, combatOver, distinct, effHp, estimateDpt, evaluate, fightLength, hpWeight, pendingOf, settle, type CombatCtx } from './combat';

export interface PlannerOpts {
  /** States kept per depth. */
  beam: number;
  /** Maximum plays searched in one turn. */
  depth: number;
  /** Leaves scored exactly (end turn through the engine). */
  exact: number;
  /** Multiplier on the damage-taken terms (turtle > 1, timmy < 1). */
  hpMul: number;
  /** 'smart': boss/elite/danger only (value held potions otherwise); 'eager': any fight; 'panic': only when the turn would be lethal or near-lethal. */
  potions: 'smart' | 'eager' | 'panic';
}

export const SPIKE_PLANNER: PlannerOpts = { beam: 8, depth: 12, exact: 6, hpMul: 1, potions: 'smart' };

/** Weight of the engine-priced Timeline (realised damage / Block) against evaluate()'s terms. */
const TIMELINE_W = 0.7;

/** Extra leaves scored exactly when every top leaf dies. */
const DEATH_WIDEN = 150;

interface Node {
  state: RunState;
  line: Action[];
  keys: string[];
  stat: number;
  won: boolean;
}

interface Plan {
  line: Action[];
  keys: string[];
  /** Index of the next action to play. */
  next: number;
}

const plans = new WeakMap<Game, Plan>();

/** Compact transposition key of a mid-turn combat state. */
export function stateKey(s: RunState): string {
  const c = s.combat;
  if (!c) return `phase:${s.phase}`;
  const hand = c.hand.map((h) => (h.vars?.bloom ? `${h.uid}b${h.vars.bloom}` : String(h.uid))).sort();
  let k = `${s.phase}|${c.turn}|${c.energy}|${s.player.hp}|${c.player.block}|${c.player.guard}|${s.player.potions.length}|${c.draw.length}|${c.discard.length}|${c.exhaust.length}|${c.timeline.length}|${c.primed.length}|${c.cardsPlayedThisTurn.length}|${hand.join(',')}`;
  const ps = Object.entries(c.player.statuses).filter(([, n]) => n !== 0).map(([id, n]) => `${id}${n}`).sort();
  k += `#${ps.join(';')}`;
  for (const e of c.enemies) {
    k += `|${e.uid}:${e.alive ? e.hp : -1}:${e.block}:${e.guard}:${e.intent.moveId}:${e.intent.damage ?? ''}`;
    for (const [id, n] of Object.entries(e.statuses)) if (n !== 0) k += `;${id}${n}`;
  }
  return k;
}

function incoming(s: RunState): number {
  const c = s.combat;
  if (!c) return 0;
  let inc = 0;
  for (const e of c.enemies) if (e.alive) inc += attackTotal(e);
  return inc;
}

/** Riposte cards on the rack fire on enemy attacks: credit their value when an attack is coming. */
function rackValue(s: RunState): number {
  const c = s.combat;
  if (!c || c.primed.length === 0) return 0;
  let attackers = 0;
  for (const e of c.enemies) if (e.alive && isAttackIntent(e.intent)) attackers += 1;
  if (attackers === 0) return 0;
  let v = 0;
  for (const p of c.primed.slice(0, attackers)) v += 0.7 * infoOf(p.card).riposteValue;
  return v;
}

interface RiposteGuess {
  cancel: boolean;
  block: number;
  stagger: number;
}

const riposteCache = new Map<string, RiposteGuess>();

/** What one Riposte trigger of this card does against the attack it answers (static guess). */
function riposteGuess(card: CardInstance): RiposteGuess {
  const key = `${card.id}|${card.upgraded ? 1 : 0}`;
  const hit = riposteCache.get(key);
  if (hit) return hit;
  const g: RiposteGuess = { cancel: false, block: 0, stagger: 0 };
  const walk = (effects: readonly Effect[]): void => {
    for (const e of effects) {
      if (e.type === 'cancel_attack') g.cancel = true;
      else if (e.type === 'block' || e.type === 'guard') g.block += estAmount(e.amount);
      else if (e.type === 'status' && e.id === 'stagger') g.stagger += estAmount(e.amount);
      else if (e.type === 'conditional') walk(e.then);
      else if (e.type === 'repeat') walk(e.effects);
    }
  };
  walk(infoOf(card).def.riposte ?? []);
  riposteCache.set(key, g);
  return g;
}

/** Damage the primed rack will stop this enemy phase: one trigger per attacking enemy, leftmost card first. */
function ripostePrevented(s: RunState): number {
  const c = s.combat;
  if (!c || c.primed.length === 0) return 0;
  const charges = c.primed.map((p) => p.charges);
  let k = 0;
  let prevented = 0;
  for (const e of c.enemies) {
    if (!e.alive || !isAttackIntent(e.intent) || (e.statuses.halted ?? 0) > 0) continue;
    while (k < charges.length && (charges[k] ?? 0) <= 0) k++;
    const entry = c.primed[k];
    if (!entry) break;
    charges[k] = (charges[k] ?? 0) - 1;
    const g = riposteGuess(entry.card);
    const total = attackTotal(e);
    prevented += g.cancel ? total : Math.min(total, g.block + g.stagger * (e.intent.hits ?? 1));
  }
  return prevented;
}

/**
 * Stall breaker (v2 measurement, 2026-10-31): in a long fight the damage-per-turn estimate decays and
 * turns-to-kill hits its cap, so dealing damage stops changing the score. Once a threat is
 * neutralised (Stagger 19 on Furnace Heart) the planner then loops forever (traced: turn 12,590, the
 * same state repeating). After STALL_TURN, raw enemy effective HP removed this turn is credited, with
 * a weight growing 0.05 per turn up to 1.
 */
const STALL_TURN = 12;

export interface Progress {
  /** Enemy effective HP at the start of the searched turn. */
  root: number;
  /** Weight per point removed (0 before STALL_TURN). */
  w: number;
  /** Leaders whose minions die with them: uid -> [effective HP at the root, weight per point]. */
  leaders: Map<number, [number, number]>;
}

/**
 * Leader focus (Mother Orchid, 2026-10-31): a leader whose living minions die with her is worth
 * focusing (killing her clears the board), but evaluate() prices each bud by its own ripening threat,
 * so the bot kept trading damage into buds while she healed. Damage to such a leader earns
 * LEADER_W per living minion per point, up to LEADER_MAX.
 */
const LEADER_W = 0.15;
const LEADER_MAX = 0.6;

export function progressOf(c: NonNullable<RunState['combat']>): Progress {
  const leaders = new Map<number, [number, number]>();
  for (const e of c.enemies) {
    if (!e.alive) continue;
    const minions = c.enemies.filter((m) => m.alive && m.leaderUid === e.uid && m.withLeader === 'die').length;
    if (minions > 0) leaders.set(e.uid, [e.hp + e.block + e.guard, Math.min(LEADER_MAX, LEADER_W * minions)]);
  }
  return { root: effHp(c), w: c.turn > STALL_TURN ? Math.min(1, 0.05 * (c.turn - STALL_TURN)) : 0, leaders };
}

export function progressValue(s: RunState, p: Progress | undefined): number {
  if (!p || !s.combat || combatOver(s)) return 0;
  let v = p.w === 0 ? 0 : p.w * (p.root - effHp(s.combat));
  for (const [uid, [root, w]] of p.leaders) {
    const e = s.combat.enemies.find((x) => x.uid === uid);
    const now = e && e.alive ? e.hp + e.block + e.guard : 0;
    v += w * (root - now);
  }
  return v;
}

/** Score of a mid-turn state (before the enemy phase). */
export function midEval(s: RunState, ctx: CombatCtx, o: PlannerOpts, prog?: Progress): number {
  if (s.phase === 'defeat') return -1e6;
  if (combatOver(s)) return 1e5 + evaluate(s, ctx);
  const c = s.combat;
  if (!c) throw new Error('midEval: no combat');
  const unblocked = Math.max(0, incoming(s) - ripostePrevented(s) - c.player.block - c.player.guard);
  let v = evaluate(s, ctx) - hpWeight(ctx) * o.hpMul * unblocked + rackValue(s) + bankValue(s) + pileValue(s) + progressValue(s, prog);
  if (unblocked >= s.player.hp) v -= 3000;
  return v;
}

function exactEval(n: Node, ctx: CombatCtx, o: PlannerOpts, prog?: Progress): number {
  if (n.won) return n.stat;
  if (n.state.phase === 'defeat') return -1e6;
  const g = simGame(n.state);
  if (!combatOver(g.state)) {
    g.apply({ type: 'end_turn' });
    settle(g);
  }
  let v = evaluate(g.state, ctx);
  if (g.state.phase !== 'defeat' && !combatOver(g.state)) {
    // Phase 2 evaluator gaps (lib/future.ts): banked and surplus next-turn resources, generated
    // cards in the piles, carried Guard for Shed decks, and the Timeline priced through the engine.
    v += bankValue(g.state) + surplusValue(g.state) + pileValue(g.state) + shedStockValue(g.state) + TIMELINE_W * timelineValue(g.state) - staticTimeline(g.state);
  }
  v += progressValue(g.state, prog);
  if (o.hpMul !== 1 && g.state.phase !== 'defeat') v -= (o.hpMul - 1) * hpWeight(ctx) * Math.max(0, ctx.hpNow - g.state.player.hp);
  return v;
}

function allowPotions(s: RunState, o: PlannerOpts): boolean {
  const c = s.combat;
  if (!c || s.player.potions.length === 0) return false;
  const unblocked = Math.max(0, incoming(s) - c.player.block - c.player.guard);
  const lethalish = unblocked >= s.player.hp * 0.6;
  switch (o.potions) {
    case 'eager':
      return true;
    case 'panic':
      return lethalish;
    case 'smart':
      return c.kind === 'boss' || (c.kind === 'elite' && s.player.hp < s.player.maxHp * 0.7) || lethalish || unblocked >= Math.max(12, 0.3 * s.player.hp);
  }
}

function describeLine(root: RunState, line: readonly Action[]): string {
  const c = root.combat;
  return line
    .map((a, i) => {
      if (a.type === 'play_card') {
        const card = c?.hand.find((h) => h.uid === a.uid);
        return `play ${card ? `${card.id}${card.upgraded ? '+' : ''}` : `#${a.uid}`}`;
      }
      // Potion indexes shift as potions are used, so only the first action's name is certain.
      if (a.type === 'use_potion') return i === 0 ? `potion ${root.player.potions[a.index] ?? a.index}` : `potion #${a.index}`;
      return a.type;
    })
    .join(' > ');
}

function describePending(s: RunState): string {
  const pc = pendingOf(s);
  if (!pc) return '(no open choice)';
  return `"${pc.prompt}" (${pc.resume.op}; labels ${JSON.stringify(pc.labels)}; shards ${s.player.counters.shards ?? 0})`;
}

/** Search the turn from `root`; returns the chosen line (possibly empty = end the turn now). */
export function planTurn(root: RunState, o: PlannerOpts): { line: Action[]; keys: string[] } {
  const c = root.combat;
  if (!c) throw new Error('planTurn: no combat');
  const dpt = estimateDpt(root);
  const threat = new Map(c.enemies.filter((e) => e.alive).map((e) => [e.uid, avgThreat(e)]));
  const ctx: CombatCtx = { hpNow: root.player.hp, kind: c.kind, act: root.act, dpt, T: fightLength(c, dpt), threat };
  const pots = allowPotions(root, o);
  const prog = progressOf(c);
  const rootNode: Node = { state: root, line: [], keys: [], stat: midEval(root, ctx, o, prog), won: false };
  // Danger mode: ending the turn now is fatal. Opaque Powers and statuses (parries, Timeline
  // blocks) can hide the only survival line from midEval, so every node is scored exactly.
  const danger = exactEval(rootNode, ctx, o, prog) <= -5000;
  if (danger) rootNode.stat = exactEval(rootNode, ctx, o, prog);
  const score = (st: RunState, n: Node): number => (danger ? exactEval(n, ctx, o, prog) : midEval(st, ctx, o, prog));
  const seen = new Set<string>([stateKey(root)]);
  const leaves: Node[] = [rootNode];
  let frontier: Node[] = [rootNode];
  for (let depth = 0; depth < o.depth && frontier.length > 0; depth++) {
    const next: Node[] = [];
    for (const n of frontier) {
      const acts = distinct(n.state, legalActions(n.state), pots);
      for (const a of acts) {
        const g = simGame(n.state);
        g.apply(a);
        try {
          settle(g);
        } catch (e: unknown) {
          // Rethrown with the line that reached it (an engine bug reached only by lookahead is otherwise untraceable).
          throw new Error(`planner lookahead (${describeLine(root, [...n.line, a])}) failed answering ${describePending(g.state)}: ${e instanceof Error ? e.message : String(e)}; actions ${JSON.stringify([...n.line, a])}`, { cause: e });
        }
        const st = g.state;
        const key = stateKey(st);
        if (seen.has(key)) continue;
        seen.add(key);
        const won = combatOver(st) && st.phase !== 'defeat';
        const child: Node = { state: st, line: [...n.line, a], keys: [...n.keys, key], stat: 0, won };
        child.stat = won ? 1e5 + evaluate(st, ctx) : score(st, child);
        if (won) return { line: child.line, keys: child.keys };
        leaves.push(child);
        if (!combatOver(st)) next.push(child);
      }
    }
    next.sort((x, y) => y.stat - x.stat);
    frontier = next.slice(0, danger ? o.beam + 4 : o.beam);
  }
  const top = [...leaves].sort((x, y) => y.stat - x.stat).slice(0, o.exact);
  if (!top.includes(rootNode)) top.push(rootNode);
  let best = rootNode;
  let bestV = -Infinity;
  const consider = (n: Node): void => {
    const v = exactEval(n, ctx, o, prog);
    if (v > bestV + 1e-9 || (Math.abs(v - bestV) <= 1e-9 && n.line.length < best.line.length)) {
      bestV = v;
      best = n;
    }
  };
  for (const n of top) consider(n);
  // Every scored leaf dies: the mid-turn score missed a survival line (Riposte, Timeline, odd
  // statuses). Score the rest of the explored leaves exactly before giving up.
  if (bestV <= -5000) {
    const rest = leaves.filter((n) => !top.includes(n)).sort((x, y) => y.stat - x.stat).slice(0, DEATH_WIDEN);
    for (const n of rest) consider(n);
  }
  return { line: best.line, keys: best.keys };
}

/** Combat decision with the planner (pending choices use the shared heuristics). */
export function plannerChoose(game: Game, legal: readonly Action[], o: PlannerOpts): Action {
  const s = game.state;
  const pc = pendingOf(s);
  if (pc) return choiceAction(s, pc, legal);
  const end = legal.find((a) => a.type === 'end_turn');
  if (!end) throw new Error('planner: no end_turn in combat');
  if (!legal.some((a) => a.type === 'play_card' || a.type === 'use_potion')) {
    plans.delete(game);
    return end;
  }
  const cached = plans.get(game);
  if (cached && cached.next < cached.line.length) {
    const prevKey = cached.next === 0 ? null : cached.keys[cached.next - 1];
    if (prevKey === stateKey(s)) {
      const want = cached.line[cached.next];
      const hit = want ? legal.find((a) => sameAction(a, want)) : undefined;
      if (hit) {
        cached.next += 1;
        return hit;
      }
    }
  } else if (cached && cached.next === cached.line.length && cached.keys[cached.next - 1] === stateKey(s)) {
    plans.delete(game);
    return end;
  }
  const { line, keys } = planTurn(s, o);
  const first = line[0];
  if (!first) {
    plans.delete(game);
    return end;
  }
  plans.set(game, { line, keys, next: 1 });
  const hit = legal.find((a) => sameAction(a, first));
  if (!hit) throw new Error(`planner: planned action ${JSON.stringify(first)} is not legal`);
  return hit;
}
