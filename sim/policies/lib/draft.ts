// Measured drafting for the v2 bots (phase 2): priors + paired rollouts.
//
// Score of an offer, in floors of run progress:
//   1. Prior: the baseline counterfactual (one copy added on floor 1, lib/priors.ts) when the card is
//      unchanged since it was measured, shrunk toward the heuristic by its noise (empirical Bayes,
//      true-effect spread TAU floors). New or reworked cards use the heuristic alone: the v1 reward
//      model's offerScore over the skip threshold, scaled to floors.
//   2. Rollouts, for the contenders only (within MARGIN of the best, skip included): the deck with the
//      card and the deck without it play the same representative fights of the coming act (paired
//      rng), at full HP and without potions, through the whole-turn planner. HP saved per fight is
//      converted to floors and added.
// Skipping is worth SKIP_FLOORS (the Shard).

import { encountersFor, getCardDef } from '../../../src/content';
import { Game, hashString, singleRng, type CardId, type CardOffer, type CombatKind, type EncounterId, type RunState } from '../../../src/engine';
import { startCombat } from '../../../src/engine/combat';
import { makeCard } from '../../../src/engine/cards';
import { makeEnv } from '../../../src/engine/core';
import { drain } from '../../../src/engine/queue';
import { deckProfile, offerScore, skipThreshold } from './archetype';
import { cloneForSim } from './clone';
import { combatOver, effHp, settle } from './combat';
import { plannerChoose, type PlannerOpts } from './planner';
import { cardPriorOrNull, type PriorStat } from './priors';

export interface DraftOpts {
  /** Fights per rollout candidate (0 = priors and heuristic only). */
  fights: number;
  /** Planner for the rollout fights (cheap). */
  planner: PlannerOpts;
  /** Contenders within this many floors of the best are rolled out. */
  margin: number;
  /** At most this many contenders are rolled out (the best priors first; the skip counts as one). */
  maxContenders: number;
  /** Player turns before a rollout fight is cut off (scored by HP lost so far + a turn penalty). */
  maxTurns: number;
}

export const ROLLOUT_PLANNER: PlannerOpts = { beam: 2, depth: 7, exact: 1, hpMul: 1, potions: 'smart' };
export const SPIKE_DRAFT: DraftOpts = { fights: 2, planner: ROLLOUT_PLANNER, margin: 0.5, maxContenders: 2, maxTurns: 8 };

/** Shard value of a skip, in floors. */
export const SKIP_FLOORS = 0.3;
/** Spread of true card effects (floors) for shrinking a noisy prior. */
const TAU = 1.5;
/** Heuristic points per floor (offerScore minus the skip threshold). */
const HEUR_PER_FLOOR = 3;
/** HP saved per fight that is worth one floor of progress. */
const HP_PER_FLOOR = 5;

/**
 * The card prior the drafter actually uses, or null when it falls back to the heuristic alone (no
 * measurement for this definition, an infinite interval, or under 10 runs). sim/attribution.ts counts
 * these fallbacks.
 */
export function usableCardPriorOrNull(cls: string, id: CardId): PriorStat | null {
  const p = cardPriorOrNull(cls, id);
  return p && Number.isFinite(p.progCi) && p.n >= 10 ? p : null;
}

/** Prior score of one offer in floors (measured when available, shrunk toward the heuristic). */
export function priorScore(s: RunState, offer: CardOffer): number {
  const heur = (offerScore(s, offer, deckProfile(s)) - skipThreshold(s)) / HEUR_PER_FLOOR + SKIP_FLOORS;
  const p = usableCardPriorOrNull(s.classId, offer.id);
  if (!p) return heur;
  const se = p.progCi / 1.96;
  const w = (TAU * TAU) / (TAU * TAU + se * se);
  return w * p.prog + (1 - w) * heur;
}

/** Representative fights of the coming act: an elite, hard-pool hallway fights and, near the boss, the boss. */
export function rolloutFights(s: RunState, n: number, seed: string): { id: EncounterId; kind: CombatKind }[] {
  const nextAct = s.phase === 'reward' && s.reward?.kind === 'boss' && s.act < 3;
  const act = nextAct ? ((s.act + 1) as 1 | 2 | 3) : s.act;
  const rng = singleRng(hashString(seed));
  const out: { id: EncounterId; kind: CombatKind }[] = [];
  // Hallway fights from the hard pool (the easy pool only opens an act).
  const hard = encountersFor(act, 'hard');
  const monsters = hard.length ? hard : encountersFor(act, 'easy');
  const elites = encountersFor(act, 'elite');
  if (monsters.length === 0 || elites.length === 0) throw new Error(`rolloutFights: act ${act} has no monster or elite pool`);
  const nearBoss = !nextAct && s.mapPos !== null && s.mapPos.row >= 9;
  if (nearBoss && n >= 3) out.push({ id: s.map.bossEncounter, kind: 'boss' });
  out.push({ id: rng.pick(elites).id, kind: 'elite' });
  while (out.length < n) out.push({ id: rng.pick(monsters).id, kind: 'monster' });
  return out.slice(0, n);
}

/**
 * HP lost in one rollout fight. A death costs maxHp + 20. A fight still going after maxTurns is cut
 * off and charged the HP lost so far plus 0.25 per enemy HP left (what finishing it would cost).
 */
function fightCost(base: RunState, extra: CardOffer | null, fight: { id: EncounterId; kind: CombatKind }, o: DraftOpts): number {
  const st = cloneForSim(base);
  st.player.hp = st.player.maxHp;
  st.player.potions = [];
  st.reward = null;
  st.shop = null;
  if (extra) st.player.deck.push(makeCard(st, extra.id, extra.upgraded));
  const env = makeEnv(st);
  startCombat(env, { encounterId: fight.id, kind: fight.kind });
  drain(env);
  const g = new Game(st, { atomic: false });
  settle(g);
  const hp0 = st.player.hp;
  for (let i = 0; i < 400 && !combatOver(g.state); i++) {
    const c = g.state.combat;
    if (c && c.turn > o.maxTurns) return hp0 - g.state.player.hp + 0.25 * effHp(c);
    g.apply(plannerChoose(g, g.legalActions(), o.planner));
  }
  if (!combatOver(g.state)) throw new Error(`rollout fight ${fight.id} did not finish in 400 actions`);
  if (g.state.phase === 'defeat') return hp0 + 20;
  return hp0 - g.state.player.hp;
}

/** Mean rollout cost (HP lost per fight) of the deck plus `extra` (null = the deck as it is). */
export function rolloutCost(s: RunState, extra: CardOffer | null, fights: readonly { id: EncounterId; kind: CombatKind }[], o: DraftOpts): number {
  let sum = 0;
  for (const f of fights) sum += fightCost(s, extra, f, o);
  return sum / Math.max(1, fights.length);
}

export interface DraftDecision {
  /** Offer index, or null to skip. */
  index: number | null;
  scores: { index: number | null; prior: number; rollout: number | null }[];
}

/**
 * Choose among card offers (null = skip, when `canSkip`). `seed` fixes the rollout fights so every
 * candidate faces the same ones.
 */
export function draftWithRollouts(s: RunState, offers: readonly CardOffer[], canSkip: boolean, o: DraftOpts, seed: string): DraftDecision {
  const cands: { index: number | null; offer: CardOffer | null; prior: number; rollout: number | null }[] = offers.map((offer, index) => ({ index, offer, prior: priorScore(s, offer), rollout: null }));
  if (canSkip) cands.push({ index: null, offer: null, prior: SKIP_FLOORS, rollout: null });
  for (const c of cands) if (c.offer && getCardDef(c.offer.id).type === 'curse') c.prior = -10;
  const best = Math.max(...cands.map((c) => c.prior));
  const contenders = cands
    .filter((c) => c.prior >= best - o.margin)
    .sort((a, b) => b.prior - a.prior)
    .slice(0, o.maxContenders);
  if (o.fights > 0 && contenders.length >= 2) {
    const fights = rolloutFights(s, o.fights, `rollout:${seed}:${s.floor}`);
    const base = rolloutCost(s, null, fights, o);
    for (const c of contenders) {
      const cost = c.offer ? rolloutCost(s, c.offer, fights, o) : base;
      c.rollout = (base - cost) / HP_PER_FLOOR;
    }
  }
  let pick = cands[0];
  let pickV = -Infinity;
  for (const c of cands) {
    const v = c.prior + (c.rollout ?? 0);
    if (v > pickV) {
      pickV = v;
      pick = c;
    }
  }
  if (!pick) throw new Error('draftWithRollouts: no candidates');
  return { index: pick.index, scores: cands.map((c) => ({ index: c.index, prior: c.prior, rollout: c.rollout })) };
}
