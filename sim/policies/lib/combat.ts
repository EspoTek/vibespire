// Combat decisions for the greedy policy: one-ply look-ahead with an exact enemy response.
//
// For every distinct legal play X the policy copies the state, plays X (answering any pending
// choice with the heuristics in choices.ts), then ends the turn so the enemy phase, Riposte, Rot
// ticks, Guard decay and the next turn start all run through the real engine. The resulting state
// is scored by `evaluate` and compared with ending the turn right away ("raw gain"). Candidates are
// ranked by raw gain plus the in-turn potential they leave (energy that remaining good cards can
// use, Onslaught for +per cards, Exposed for remaining hits, cards drawn), with ordering nudges
// (draw and 0-cost first, hold on-beat payoffs for the beat). The turn ends when no play has a
// positive raw gain. A lethal search runs first when the hand's damage could clear the board.
//
// The enemy phase is deterministic given the shown intents (ENGINE_SPEC v2 purity contract), so the
// look-ahead only "peeks" at shuffle/misc rng (next turn's draw, random targets), which `evaluate`
// deliberately does not score card by card.

import { getStatusDef } from '../../../src/content';
import { Game, getCardCost, isAttackIntent, nextBeat, TUNING, type Action, type CardInstance, type CombatState, type EnemyState, type RunState } from '../../../src/engine';
import { effectsValue, infoOf, keepValue } from './cards';
import { choiceAction } from './choices';
import { cloneForSim, simGame } from './clone';

const EPS = 0.3;
/** Candidates (best one-ply raw first) valued as whole-turn lines. */
const ROLLOUTS = 12;

export interface CombatCtx {
  hpNow: number;
  kind: CombatState['kind'];
  act: number;
  /** Estimated player damage per turn this fight (for Rot/Exposed horizons and enemy-HP weights). */
  dpt: number;
  /** Fight length (player turns) estimated at the decision root. Buff and debuff horizons use this
   *  fixed value, so finishing the fight sooner never looks like losing buff value. */
  T: number;
  /**
   * Each enemy's threat per turn (intent + forecast) at the decision root, by uid. Branches price the
   * rest of the fight with this fixed value: otherwise damage that pushes a boss into a scarier phase
   * (its forecast jumps) looks worse than leaving it at 51% forever, and the bot stalls.
   */
  threat: ReadonlyMap<number, number>;
}

export function pendingOf(s: RunState): RunState['pendingChoice'] {
  return s.combat?.pendingChoice ?? s.pendingChoice;
}

/** Answer pending choices heuristically until none is open (or the fight is over). */
export function settle(g: Game): void {
  // a multi-pick answer takes one step per picked card plus the confirm
  for (let i = 0; i < 300; i++) {
    const pc = pendingOf(g.state);
    if (!pc) return;
    g.apply(choiceAction(g.state, pc, g.legalActions()));
  }
  throw new Error('greedy: more than 300 steps of chained pending choices');
}

export function combatOver(s: RunState): boolean {
  return s.phase !== 'combat' || s.combat === null || s.combat.outcome !== null;
}

/** End the turn in a sim game and run to the next decision point. */
function endTurn(g: Game): void {
  if (combatOver(g.state)) return;
  g.apply({ type: 'end_turn' });
  settle(g);
}

// ---------------------------------------------------------------------------
// Evaluation

export function attackTotal(e: EnemyState): number {
  return isAttackIntent(e.intent) && !e.intent.hidden ? (e.intent.damage ?? 0) * (e.intent.hits ?? 1) : 0;
}

export function avgThreat(e: EnemyState): number {
  let sum = attackTotal(e);
  let n = 1;
  for (const f of e.forecast) {
    n += 1;
    sum += isAttackIntent(f) && !f.hidden ? (f.damage ?? 0) * (f.hits ?? 1) : f.hidden ? 6 : 0;
  }
  return sum / n;
}

function enemyHits(e: EnemyState): number {
  return isAttackIntent(e.intent) ? (e.intent.hits ?? 1) : 0.6;
}

export function effHp(c: CombatState): number {
  let n = 0;
  for (const e of c.enemies) if (e.alive) n += e.hp + e.block + e.guard;
  return n;
}

export function estimateDpt(s: RunState): number {
  const c = s.combat;
  const prior = 9 + 0.6 * s.floor;
  if (!c) return prior;
  let dealt = 0;
  for (const e of c.enemies) dealt += e.maxHp - Math.max(0, e.alive ? e.hp : 0);
  const done = Math.max(0, c.turn - 1);
  return Math.max(6, (dealt + prior * 2) / (done + 2));
}

function rotTicks(r: number, turns: number, hp: number): number {
  const cap = TUNING.caps.status.rot ?? 15;
  let sum = 0;
  for (let i = 0; i < turns; i++) sum += Math.min(cap, r + i);
  return Math.min(hp, sum);
}

/** Score cost of each further player turn the fight is expected to last. */
const TURN_COST = 2;

/** Expected remaining fight length (turns) from the current enemies. */
export function fightLength(c: CombatState, dpt: number): number {
  const alive = c.enemies.filter((e) => e.alive);
  const share = dpt / Math.max(1, alive.length);
  let T = 1;
  for (const e of alive) T = Math.max(T, turnsToKill(e, share));
  return Math.min(8, T);
}

/** Player hits per turn assumed when pricing Exposed. */
const HITS_PER_TURN = 3;

/**
 * Expected player turns until this enemy dies (fractional), given our damage share per turn plus its
 * Rot ticks (+1 per tick, capped) and Exposed bonus (decaying 1 per its turn).
 */
function turnsToKill(e: EnemyState, share: number): number {
  const cap = TUNING.caps.status.rot ?? 15;
  let hp = e.hp + 0.6 * e.guard + 0.5 * e.block;
  let rot = e.statuses.rot ?? 0;
  let exp = e.statuses.exposed ?? 0;
  for (let t = 0; t < 12; t++) {
    const dmg = share + HITS_PER_TURN * Math.max(0, exp) + (rot > 0 ? Math.min(cap, rot) : 0);
    if (dmg >= hp) return t + hp / Math.max(1, dmg);
    hp -= dmg;
    if (rot > 0) rot += 1;
    exp -= 1;
  }
  return 12;
}

function enemyStatusValue(e: EnemyState, T: number): number {
  let v = 0;
  for (const [id, n] of Object.entries(e.statuses)) {
    if (n === 0) continue;
    switch (id) {
      case 'rot':
      case 'exposed':
        break; // priced through turnsToKill
      case 'stagger':
        // Current Stagger is already inside the shown intents (threat); only its next hits get a nudge.
        v += enemyHits(e) * Math.min(n, 2) * 0.6;
        break;
      case 'halted':
        v += attackTotal(e) * 0.9;
        break;
      case 'might':
        v -= enemyHits(e) * Math.min(n, 2) * 0.4; // also already in the intents
        break;
      default: {
        const def = getStatusDef(id);
        if (def.hidden) break;
        v += (def.isDebuff ? 2.5 : -2.5) * Math.min(Math.abs(n), 10);
      }
    }
  }
  return v;
}

/**
 * d per Reserve stack when the fight holds an X-cost card: about half an energy (lib/future.ts ENERGY_D 4.5),
 * since the stack only pays out when an X card is drawn and played.
 */
const RESERVE_D = 2;

/** Whether an X-cost card is in this combat's hand, draw or discard pile (what Reserve can feed). */
export function combatHasXCard(c: CombatState): boolean {
  for (const pile of [c.hand, c.draw, c.discard]) for (const x of pile) if (infoOf(x).def.cost === 'X') return true;
  return false;
}

function playerStatusValue(s: RunState, c: CombatState, T: number, hitsIn: number): number {
  let v = 0;
  for (const [id, n] of Object.entries(c.player.statuses)) {
    if (n === 0) continue;
    switch (id) {
      case 'onslaught':
        v += 2 * n;
        break;
      case 'onslaught_keep':
        v += 2 * n;
        break;
      case 'riposte_capacity':
        v += 3 * n;
        break;
      case 'augury':
        v += 1;
        break;
      case 'rot':
        v -= rotTicks(n, Math.min(T + 1, 8), s.player.hp);
        break;
      case 'exposed':
        v -= 0.9 * hitsIn * Math.max(0, n - 1) + 0.5 * n;
        break;
      case 'stagger':
        v -= 2 * n;
        break;
      case 'backlash_primed':
        v -= TUNING.backlashPerStack * n;
        break;
      case 'cost_tax':
        v -= 4 * n;
        break;
      case 'reserve':
        // Reserve only feeds X-cost cards (keywords.ts reserve). It fell to the generic buff price (~9 per
        // stack), so with Reserve Coil the planner banked energy instead of playing cards, even in decks with
        // no X card: the Reserve Coil "trap" (-12 to -27 win, Phase E; traced 2026-11-01 on cf-0-breaker:
        // 3.4 plays per turn instead of 4.2). Worth RESERVE_D per stack only while an X card is in the fight.
        v += combatHasXCard(c) ? RESERVE_D * n : 0;
        break;
      default: {
        const def = getStatusDef(id);
        if (def.isDebuff) v -= 2.5 * Math.min(Math.abs(n), 10);
        else v += (3 + 1.5 * Math.min(Math.max(0, n - 1), 6)) * Math.min(T, 5) * 0.6;
      }
    }
  }
  return v;
}

function bloomValue(cards: readonly CardInstance[]): number {
  let v = 0;
  for (const c of cards) {
    const b = c.vars?.bloom ?? 0;
    if (b > 0) v += b * infoOf(c).perBloom * 2;
  }
  return v;
}

function allCards(c: CombatState): CardInstance[] {
  return [...c.hand, ...c.draw, ...c.discard, ...c.exhaust, ...c.inPlay, ...c.primed.map((p) => p.card), ...c.timeline.map((t) => t.card)];
}

/** Weight of one player HP in this fight (act 1-2 boss HP is mostly healed at the act transition). */
export function hpWeight(ctx: CombatCtx): number {
  return ctx.kind === 'boss' && ctx.act < 3 ? 0.7 : 1;
}

function hpTerm(s: RunState, ctx: CombatCtx): number {
  const hp = s.player.hp;
  return hp * hpWeight(ctx) - 1.5 * Math.max(0, 0.3 * s.player.maxHp - hp);
}

/** Share of future incoming damage that lands as HP loss (the rest is blocked on later turns). */
const UNBLOCKED_SHARE = 0.85;

/**
 * Score of a state at the next decision point (higher is better). Enemies are priced by the HP
 * they will still take from us: threat per turn × turns until they die (our damage share + Rot +
 * Exposed), plus a small direct HP term so finishing blows and focus fire break ties.
 */
export function evaluate(s: RunState, ctx: CombatCtx): number {
  if (s.phase === 'defeat') {
    const left = s.combat ? effHp(s.combat) : 0;
    return -10000 - left;
  }
  const potionW = ctx.kind === 'boss' ? 1 : ctx.kind === 'elite' ? 4 : 7;
  let v = hpTerm(s, ctx) + s.player.maxHp + 0.12 * s.player.gold + potionW * s.player.potions.length + 3 * (s.player.counters.shards ?? 0);
  for (const card of s.player.deck) v += (keepValue(card, false) - 4) * 0.8;
  const c = s.combat;
  if (combatOver(s) || !c) {
    return v + 300 + bloomValue(s.player.deck);
  }
  const alive = c.enemies.filter((e) => e.alive);
  const share = ctx.dpt / Math.max(1, alive.length);
  const wHp = hpWeight(ctx);
  let hitsIn = 0;
  let inc = 0;
  let T = 1;
  let future = 0;
  for (const e of alive) {
    let threat = Math.max(3, ctx.threat.get(e.uid) ?? avgThreat(e));
    if (e.leaderUid !== null && e.withLeader === 'die' && c.enemies.some((x) => x.uid === e.leaderUid && x.alive)) threat *= 0.6;
    const t = turnsToKill(e, share);
    T = Math.max(T, t);
    future += UNBLOCKED_SHARE * threat * t;
    v -= wHp * UNBLOCKED_SHARE * threat * t + 0.1 * e.hp + 3;
    inc += attackTotal(e);
    hitsIn += isAttackIntent(e.intent) ? (e.intent.hits ?? 1) : 0;
  }
  T = Math.min(8, T);
  // Every extra turn of fighting is risk (draw variance, enemy scaling): finish fights.
  v -= TURN_COST * T;
  for (const e of alive) v += enemyStatusValue(e, ctx.T);
  const block = c.player.block;
  const guard = c.player.guard;
  const d = block + guard;
  v += wHp * (0.9 * Math.min(d, inc) + 0.3 * Math.max(0, Math.min(guard, d - inc)));
  // Losing the race: projected HP at the end of the fight below a margin costs extra.
  const proj = s.player.hp + 0.9 * Math.min(d, inc) - future;
  v -= 1.2 * Math.max(0, 0.15 * s.player.maxHp - proj);
  v += playerStatusValue(s, c, ctx.T, hitsIn);
  for (const t of c.timeline) {
    const def = infoOf(t.card).def;
    if (def.delay) v += 0.6 * effectsValue(def.delay.effects, t.card.vars?.bloom ?? 0);
  }
  v += bloomValue(allCards(c));
  for (const x of c.exhaust) {
    const i = infoOf(x);
    if (i.junk) v += 2.5;
    else if (i.def.type !== 'power') v -= (0.25 * Math.max(0, i.value) * Math.min(ctx.T, 3)) / 3;
  }
  return v;
}

// ---------------------------------------------------------------------------
// Candidates

interface Cand {
  action: Action;
  uid: number | null;
  /** Eval after (X, end turn) minus eval after (end turn). */
  raw: number;
  /** State right after X (null when X ended the fight). */
  post: RunState | null;
  /** Enemy effective HP removed by X. */
  dealt: number;
  won: boolean;
  evalScore: number;
}

function cardKey(s: RunState, card: CardInstance, target: number | undefined): string {
  return `${kindOf(s, card)}|${target ?? ''}`;
}

function kindOf(s: RunState, card: CardInstance): string {
  return `${card.id}|${card.upgraded ? 1 : 0}|${card.vars?.bloom ?? 0}|${String(getCardCost(s, card))}`;
}

/** Distinct candidate actions (identical copies with the same target are simulated once). */
export function distinct(s: RunState, legal: readonly Action[], allowPotions: boolean): Action[] {
  const c = s.combat;
  if (!c) throw new Error('distinct: no combat');
  const seen = new Set<string>();
  const out: Action[] = [];
  for (const a of legal) {
    let key: string;
    if (a.type === 'play_card') {
      const card = c.hand.find((x) => x.uid === a.uid);
      if (!card) throw new Error(`legal play of uid ${a.uid} not in hand`);
      key = `c:${cardKey(s, card, a.target)}`;
    } else if (a.type === 'use_potion') {
      if (!allowPotions) continue;
      key = `p:${s.player.potions[a.index] ?? '?'}|${a.target ?? ''}`;
    } else continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(a);
  }
  return out;
}

function simulate(s: RunState, a: Action, ctx: CombatCtx, effBefore: number): Omit<Cand, 'raw' | 'action' | 'uid'> {
  const g = simGame(s);
  g.apply(a);
  settle(g);
  const over = combatOver(g.state);
  const won = over && g.state.phase !== 'defeat';
  const dealt = g.state.combat && !over ? effBefore - effHp(g.state.combat) : effBefore;
  const post = over ? null : cloneForSim(g.state);
  endTurn(g);
  return { post, dealt, won, evalScore: evaluate(g.state, ctx) };
}

/** Assumed raw gain of a fresh non-junk card drawn mid-turn (no root simulation of it exists). */
const NEW_CARD = 2;

interface KindInfo {
  raw: number;
  target: number | undefined;
}

/**
 * Finish the turn cheaply in a copy: repeatedly play the remaining card with the best root raw gain
 * per energy (its root best target), skipping pure-defence cards once Block + Guard covers the
 * incoming attacks. No potions. Used to value every candidate as a whole-turn line.
 */
function continueTurn(g: Game, kinds: ReadonlyMap<string, KindInfo>): void {
  for (let step = 0; step < 12; step++) {
    const st = g.state;
    const c = st.combat;
    if (combatOver(st) || !c) return;
    let inc = 0;
    for (const e of c.enemies) if (e.alive) inc += attackTotal(e);
    const saturated = c.player.block + c.player.guard >= inc;
    let best: Action | null = null;
    let bestKey = -Infinity;
    for (const a of g.legalActions()) {
      if (a.type !== 'play_card') continue;
      const card = c.hand.find((x) => x.uid === a.uid);
      if (!card) throw new Error('legal play not in hand');
      const info = infoOf(card);
      const k = kinds.get(kindOf(st, card));
      const raw = k ? k.raw : info.junk ? 0 : NEW_CARD;
      if (raw <= EPS) continue;
      if (saturated && info.defense > 0 && info.damage === 0) continue;
      const cost = getCardCost(st, card);
      const costN = cost === null ? 99 : cost === 'X' ? Math.max(1, c.energy) : cost;
      let key = raw / Math.max(0.5, costN);
      if (k?.target !== undefined && a.target !== undefined && a.target !== k.target) key -= 0.01;
      if (key > bestKey) {
        bestKey = key;
        best = a;
      }
    }
    if (!best) return;
    g.apply(best);
    settle(g);
  }
}

function beatAdjust(s: RunState, a: Action, good: ReadonlySet<number>): number {
  if (a.type !== 'play_card') return 0;
  const c = s.combat;
  if (!c) return 0;
  const card = c.hand.find((x) => x.uid === a.uid);
  if (!card) return 0;
  const nb = nextBeat(s);
  if (nb.onBeat) return 0;
  const beats = TUNING.cadence.beats;
  const nextPos = beats.find((b) => b >= nb.count);
  if (nextPos === undefined) return 0;
  const need = nextPos - nb.count; // other plays needed before the beat
  const others = c.hand.filter((x) => x.uid !== card.uid && good.has(x.uid));
  const i = infoOf(card);
  if (i.onBeatValue > 0) return others.length >= need ? -(i.onBeatValue + 1) : 0;
  const payoffWaiting = others.some((x) => infoOf(x).onBeatValue > 0);
  return payoffWaiting ? 0.6 : 0;
}

function orderBonus(s: RunState, a: Action): number {
  if (a.type !== 'play_card') return 0;
  const card = s.combat?.hand.find((x) => x.uid === a.uid);
  if (!card) return 0;
  const i = infoOf(card);
  let b = 0;
  if (i.draws) b += 1.5;
  if (getCardCost(s, card) === 0) b += 0.8;
  return b;
}

/** Greedy damage roll-out: returns the first action of a line that wins this turn, or null. */
function lethalLine(s: RunState, legal: readonly Action[]): Action | null {
  let g = simGame(s);
  let first: Action | null = null;
  for (let step = 0; step < 12; step++) {
    if (combatOver(g.state)) return g.state.phase === 'defeat' ? null : first;
    const st = g.state;
    const c = st.combat;
    if (!c) return null;
    const before = effHp(c);
    const acts = distinct(st, step === 0 ? legal : g.legalActions(), false);
    let best: { a: Action; g: Game; dmg: number } | null = null;
    for (const a of acts) {
      const h = simGame(st);
      h.apply(a);
      settle(h);
      const won = combatOver(h.state) && h.state.phase !== 'defeat';
      const dmg = won ? 1e6 : before - (h.state.combat ? effHp(h.state.combat) : 0);
      if (!best || dmg > best.dmg) best = { a, g: h, dmg };
    }
    if (!best || best.dmg <= 0) return null;
    if (first === null) first = best.a;
    g = best.g;
  }
  return null;
}

export interface Ranked {
  action: Action;
  /** Ranking key: net plus ordering nudges. */
  score: number;
  /** Eval after (play, end turn) minus eval after (end turn). */
  raw: number;
  /** Eval after (play, cheap finish of the turn, end turn) minus eval after (end turn now): play only when > EPS. */
  net: number;
}

/** Rank the distinct candidate plays of the current decision (best first). */
export function rankCombat(game: Game, legal: readonly Action[]): { ranked: Ranked[]; ctx: CombatCtx; endScore: number } {
  const s = game.state;
  const c = s.combat;
  if (!c) throw new Error('rankCombat: no combat');
  const dpt = estimateDpt(s);
  const threat = new Map(c.enemies.filter((e) => e.alive).map((e) => [e.uid, avgThreat(e)]));
  const ctx: CombatCtx = { hpNow: s.player.hp, kind: c.kind, act: s.act, dpt, T: fightLength(c, dpt), threat };
  const effBefore = effHp(c);
  const gEnd = simGame(s);
  endTurn(gEnd);
  const endScore = evaluate(gEnd.state, ctx);
  const endHp = gEnd.state.phase === 'defeat' ? 0 : gEnd.state.player.hp;
  const danger = gEnd.state.phase === 'defeat' || (s.player.hp - endHp >= 10 && endHp < s.player.hp * 0.5);
  const allowPotions = c.kind === 'boss' || (c.kind === 'elite' && s.player.hp < s.player.maxHp * 0.6) || danger;
  const cands: Cand[] = [];
  for (const a of distinct(s, legal, allowPotions)) {
    const r = simulate(s, a, ctx, effBefore);
    cands.push({ action: a, uid: a.type === 'play_card' ? a.uid : null, raw: r.evalScore - endScore, ...r });
  }
  // Lethal check: if the hand's summed damage could clear the board and no single play wins, roll out.
  if (!cands.some((x) => x.won)) {
    const bestDmg = new Map<number, number>();
    for (const x of cands) if (x.uid !== null) bestDmg.set(x.uid, Math.max(bestDmg.get(x.uid) ?? 0, x.dealt));
    let sum = 0;
    for (const card of c.hand) sum += bestDmg.get(card.uid) ?? 0;
    if (sum >= effBefore) {
      const line = lethalLine(s, legal);
      if (line) return { ranked: [{ action: line, score: 1e6, raw: 1e6, net: 1e6 }], ctx, endScore };
    }
  }
  // Best raw gain (and its target) per kind of hand card; copies share the simulated twin's value.
  const kinds = new Map<string, KindInfo>();
  for (const x of cands) {
    if (x.action.type !== 'play_card') continue;
    const uid = x.action.uid;
    const card = c.hand.find((h) => h.uid === uid);
    if (!card) throw new Error('candidate card left the hand');
    const k = kindOf(s, card);
    const prev = kinds.get(k);
    if (!prev || x.raw > prev.raw) kinds.set(k, { raw: x.raw, target: x.action.target });
  }
  const good = new Set<number>(c.hand.filter((card) => (kinds.get(kindOf(s, card))?.raw ?? 0) > EPS).map((card) => card.uid));
  // Whole-turn lines only for the most promising plays (the rest keep their one-ply raw gain).
  const rollFor = new Set(
    cands
      .filter((x) => !x.won && x.post)
      .sort((a, b) => b.raw - a.raw)
      .slice(0, ROLLOUTS)
      .map((x) => x.action),
  );
  const ranked: Ranked[] = cands.map((x) => {
    let net: number;
    if (x.won) net = 1e5 + x.evalScore;
    else if (x.post && rollFor.has(x.action)) {
      const g = new Game(x.post, { atomic: false });
      continueTurn(g, kinds);
      endTurn(g);
      net = Math.max(x.raw, evaluate(g.state, ctx) - endScore);
    } else net = x.raw;
    return { action: x.action, raw: x.raw, net, score: net + 0.3 * x.raw + orderBonus(s, x.action) + beatAdjust(s, x.action, good) };
  });
  ranked.sort((a, b) => b.score - a.score);
  return { ranked, ctx, endScore };
}

export function chooseCombat(game: Game, legal: readonly Action[]): Action {
  const s = game.state;
  const pc = pendingOf(s);
  if (pc) return choiceAction(s, pc, legal);
  const end = legal.find((a) => a.type === 'end_turn');
  if (!end) throw new Error('greedy: no end_turn in combat');
  if (!legal.some((a) => a.type === 'play_card' || a.type === 'use_potion')) return end;
  const { ranked } = rankCombat(game, legal);
  const best = ranked.find((r) => r.net > EPS);
  return best ? best.action : end;
}
