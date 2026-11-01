// Personality bots (v2 balance). Each persona is a combat planner setting (lib/planner.ts) plus an
// out-of-combat personality (lib/run.ts RunPersona): drafting, pathing, shop, rest, skip and boss
// relic behaviour. Pending choices use the shared heuristics (lib/choices.ts) for every persona.
//
//   spike            strongest play: the whole-turn planner plus the tuned v1 run model (deck-fit
//                    drafting with a skip threshold, removals, elites at 70% HP, rest under 50%).
//   timmy            grabs rares, X-costs and big hits; rarely skips; aggressive elite pathing;
//                    takes every boss relic; plays for damage (HP counts less) and uses potions freely.
//   johnny-<engine>  commits to one v2 engine (engine:* tags: class engines and shared engines).
//   johnny-v1-<arch> commits to one v1 archetype-matrix column (docs/cards/<class>.md).
//   turtle           defence-first drafting and play (HP counts 1.4x), avoids elites, rests early.
//   novice           takes the best-looking card every time, never skips, never removes, random map
//                    path, shallow combat search, potions only in a panic.
//   greedy           the v1 balance bot (lib/combat.ts one-ply + rollouts) for comparison.

import { hashString, singleRng, type Action, type CardOffer, type Game, type RunState } from '../../src/engine';
import type { Policy } from '../types';
import { greedyChoose } from './greedy';
import { bestOffer, deckProfile, offerScore, skipThreshold } from './lib/archetype';
import { cardInfo } from './lib/cards';
import { choiceAction } from './lib/choices';
import { pendingOf } from './lib/combat';
import { archetypesFor, getArchetype } from './lib/matrix';
import { enginesFor, engineWeight, getEngine, type Engine } from './lib/engines';
import { plannerChoose, SPIKE_PLANNER, type PlannerOpts } from './lib/planner';
import { draftWithRollouts, priorScore, SKIP_FLOORS, SPIKE_DRAFT } from './lib/draft';
import { chooseRun, GREEDY_RUN, type RunPersona } from './lib/run';

export interface Persona {
  name: string;
  planner: PlannerOpts;
  run: RunPersona;
}

const RARITY_APPEAL: Record<string, number> = { common: 0, uncommon: 3, rare: 7, special: 0, starter: -2 };

function argmax(xs: readonly number[]): { index: number; score: number } {
  let index = -1;
  let score = -Infinity;
  xs.forEach((v, i) => {
    if (v > score) {
      score = v;
      index = i;
    }
  });
  if (index < 0) throw new Error('argmax of an empty offer list');
  return { index, score };
}

/** Timmy's appeal: rarity, X costs, big printed damage and Block, Powers that scale. */
function timmyAppeal(s: RunState, o: CardOffer): number {
  const i = cardInfo(o.id, o.upgraded);
  if (i.junk) return -20;
  let v = RARITY_APPEAL[i.def.rarity] ?? 0;
  if (i.def.cost === 'X') v += 5;
  v += Math.min(i.damage, 40) * 0.35 + Math.min(i.defense, 30) * 0.1;
  if (i.tags.includes('scaling') || i.def.type === 'power') v += 2;
  v += 0.3 * i.efficiency;
  v -= 1.5 * s.player.deck.filter((c) => c.id === o.id).length;
  return v;
}

/** A first-time player's appeal: big numbers and shiny rarities, no deck thinking. */
function noviceAppeal(o: CardOffer): number {
  const i = cardInfo(o.id, o.upgraded);
  if (i.junk) return -20;
  return (RARITY_APPEAL[i.def.rarity] ?? 0) * 0.6 + i.damage * 0.3 + i.defense * 0.25 + (i.draws ? 1 : 0);
}

function turtleScore(s: RunState, o: CardOffer): number {
  const i = cardInfo(o.id, o.upgraded);
  let v = offerScore(s, o, deckProfile(s));
  if (i.defense > 0) v += 1.5 + Math.min(i.defense, 20) * 0.15;
  if (i.tags.includes('stagger') || i.tags.includes('cancel') || i.tags.includes('multihit_answer')) v += 1.5;
  if (i.def.type === 'attack' && i.defense === 0) v -= 1;
  return v;
}

const UTILITY_TAGS = ['draw', 'energy'];

function johnnyScore(s: RunState, o: CardOffer, cards: ReadonlyMap<string, number>): number {
  const i = cardInfo(o.id, o.upgraded);
  const w = cards.get(o.id) ?? 0;
  let v = offerScore(s, o, deckProfile(s)) + 6 * w;
  if (w === 0 && !i.tags.some((t) => UTILITY_TAGS.includes(t))) v -= 3;
  return v;
}

// Spike keeps the v1 greedy run model (tuned in v1: skip threshold, elites at 70% HP, rest under
// 50%). A harder-skipping variant (threshold +1, bloat penalty past 18 cards, elites at 60%) lost
// 11 points of Breaker win rate on 90 paired seeds (18.9% vs 30.0%), so it is not the "strongest".
export const SPIKE_V1: Persona = { name: 'spike-v1', planner: SPIKE_PLANNER, run: GREEDY_RUN };

/**
 * Spike v2 (phase 2): drafts by measured priors plus paired rollouts (lib/draft.ts), takes boss and
 * shop relics by their measured counterfactual, values shop cards by the same prior. Pathing, rests
 * and removals stay on the tuned v1 model.
 */
export const SPIKE: Persona = {
  name: 'spike',
  planner: SPIKE_PLANNER,
  run: {
    ...GREEDY_RUN,
    draft: (s, offers, canSkip) => draftWithRollouts(s, offers, canSkip, SPIKE_DRAFT, s.seed).index,
    shopCard: (s, offer, price) => priorScore(s, offer) - SKIP_FLOORS - price / 150,
    bossRelic: 'measured',
    shopRelic: 'measured',
  },
};

export const TIMMY: Persona = {
  name: 'timmy',
  planner: { ...SPIKE_PLANNER, hpMul: 0.8, potions: 'eager' },
  run: {
    ...GREEDY_RUN,
    draft: (s, offers) => {
      const { index, score } = argmax(offers.map((o) => timmyAppeal(s, o)));
      return score >= 2.5 || s.player.deck.length < 30 ? index : null;
    },
    shopCard: (s, offer, price) => timmyAppeal(s, offer) - 5 - price / 80,
    eliteHp: 0.45,
    eliteValue: 15,
    restBelow: 0.35,
    bossRelic: 'always',
    relicsFirst: false,
  },
};

export const TURTLE: Persona = {
  name: 'turtle',
  planner: { ...SPIKE_PLANNER, hpMul: 1.4 },
  run: {
    ...GREEDY_RUN,
    draft: (s, offers) => {
      const { index, score } = argmax(offers.map((o) => turtleScore(s, o)));
      return score >= skipThreshold(s) ? index : null;
    },
    shopCard: (s, offer, price) => turtleScore(s, offer) - price / 60 - (skipThreshold(s) + 1),
    eliteHp: 0.95,
    eliteValue: -4,
    restBelow: 0.7,
    bossRelic: 'safe',
  },
};

export const NOVICE: Persona = {
  name: 'novice',
  planner: { beam: 2, depth: 6, exact: 2, hpMul: 1, potions: 'panic' },
  run: {
    ...GREEDY_RUN,
    draft: (_s, offers) => argmax(offers.map(noviceAppeal)).index,
    shopCard: (s, offer, price) => (price <= s.player.gold ? noviceAppeal(offer) - 4 : -1),
    removes: false,
    restBelow: 0.5,
    bossRelic: 'always',
    randomPath: true,
    relicsFirst: false,
  },
};

/** v1 johnny: commits to a v1 archetype-matrix column (docs/cards/<class>.md). Name: johnny-v1-<arch>. */
export function johnny(classId: string, arch: string): Persona {
  const a = getArchetype(classId, arch);
  return {
    name: `johnny-v1-${a.name}`,
    planner: SPIKE_PLANNER,
    run: {
      ...GREEDY_RUN,
      draft: (s, offers) => {
        const { index, score } = argmax(offers.map((o) => johnnyScore(s, o, a.cards)));
        return score >= skipThreshold(s) ? index : null;
      },
      shopCard: (s, offer, price) => johnnyScore(s, offer, a.cards) - price / 60 - (skipThreshold(s) + 1),
    },
  };
}

/** Draft score of an offer for an engine johnny, in floors: the measured prior plus the engine weight. */
/** A johnny's own-engine card is worth this many floors before its role weight. */
const ENGINE_BASE = 3;
/** Per copy already in the deck (keeps a johnny from stacking five of one piece). */
const ENGINE_COPY_PENALTY = 0.8;

/**
 * Draft score of an offer for an engine johnny, in floors. A johnny commits: own-engine cards score
 * ENGINE_BASE + 1.2 × role weight, with the measured prior only as a tie-breaker (0.3 ×, clamped to
 * ±3). Before 2026-11-01 the prior dominated (prior + 1.2 × weight), and the shared engines' colourless
 * pieces carry priors of −2 to +1.5 floors from the v2 counterfactuals, so johnnies took about 1 in 4 of
 * their own pieces and the shared engines never assembled (0/40 each). Off-engine cards keep their
 * prior, minus 0.6 unless they draw or give energy.
 */
function engineScore(s: RunState, o: CardOffer, e: Engine): number {
  const w = engineWeight(e, o.id);
  const prior = priorScore(s, o);
  if (w > 0) {
    const copies = s.player.deck.filter((c) => c.id === o.id).length;
    return ENGINE_BASE + 1.2 * w + 0.3 * Math.max(-3, Math.min(3, prior)) - ENGINE_COPY_PENALTY * copies;
  }
  const util = cardInfo(o.id, o.upgraded).tags.some((t) => UTILITY_TAGS.includes(t));
  return prior - (util ? 0 : 0.6);
}

/**
 * v2 johnny: commits to one engine (class or shared) from the cards' engine:* tags (lib/engines.ts).
 * Drafts the engine's cards first (multipliers, then payoffs, enablers, bridges), buys the engine's
 * relics first, and otherwise plays like spike (planner, measured boss relics, no rollouts).
 */
export function johnnyEngine(classId: string, name: string): Persona {
  const e = getEngine(classId, name);
  return {
    name: `johnny-${e.name}`,
    planner: SPIKE_PLANNER,
    run: {
      ...GREEDY_RUN,
      draft: (s, offers) => {
        const { index, score } = argmax(offers.map((o) => engineScore(s, o, e)));
        return score >= SKIP_FLOORS ? index : null;
      },
      // Shops: own-engine cards before generic relics (relicsFirst off); the engine's relics still get +3.
      shopCard: (s, offer, price) => engineScore(s, offer, e) - SKIP_FLOORS - price / (engineWeight(e, offer.id) > 0 ? 300 : 150),
      relicsFirst: false,
      bossRelic: 'measured',
      shopRelic: 'measured',
      relicBonus: (_s, id) => (e.relics.has(id) ? 3 : 0),
    },
  };
}

/**
 * Diagnostic: the johnny scoring before 2026-11-01 (prior + 1.2 × role weight; prior-dominated, relics
 * first in shops). Name: johnny-legacy-<engine>. Used to A/B the commitment change; not a default persona.
 */
export function johnnyLegacy(classId: string, name: string): Persona {
  const e = getEngine(classId, name);
  const score = (s: RunState, o: CardOffer): number => {
    const w = engineWeight(e, o.id);
    const util = cardInfo(o.id, o.upgraded).tags.some((x) => UTILITY_TAGS.includes(x));
    return priorScore(s, o) + 1.2 * w - (w === 0 && !util ? 0.6 : 0);
  };
  return {
    name: `johnny-legacy-${e.name}`,
    planner: SPIKE_PLANNER,
    run: {
      ...GREEDY_RUN,
      draft: (s, offers) => {
        const { index, score: best } = argmax(offers.map((o) => score(s, o)));
        return best >= SKIP_FLOORS ? index : null;
      },
      shopCard: (s, offer, price) => score(s, offer) - SKIP_FLOORS - price / 150,
      bossRelic: 'measured',
      shopRelic: 'measured',
      relicBonus: (_s, id) => (e.relics.has(id) ? 3 : 0),
    },
  };
}

/** Engine johnnies for a class: its class engines, then the shared engines. */
export function engineNames(classId: string): string[] {
  const es = enginesFor(classId);
  return [...es.filter((e) => e.scope === 'class'), ...es.filter((e) => e.scope === 'shared')].map((e) => e.name);
}

/** v1 johnny archetypes for a class: every matrix column except Glue (not a deck plan on its own). */
export function johnnyArchetypes(classId: string): string[] {
  return archetypesFor(classId)
    .map((a) => a.name)
    .filter((n) => n !== 'glue');
}

/** Persona names for a class (the order used by sim/personas-batch.ts). */
export function personaNames(classId: string): string[] {
  return ['spike', 'timmy', 'turtle', 'novice', ...engineNames(classId).map((e) => `johnny-${e}`)];
}

export function personaFor(name: string, classId: string): Persona {
  switch (name) {
    case 'spike':
      return SPIKE;
    case 'spike-v1':
      return SPIKE_V1;
    case 'timmy':
      return TIMMY;
    case 'turtle':
      return TURTLE;
    case 'novice':
      return NOVICE;
    case 'planner-greedy':
      // Diagnostic: the spike planner with the v1 greedy out-of-combat choices.
      return { name: 'planner-greedy', planner: SPIKE_PLANNER, run: GREEDY_RUN };
  }
  if (name.startsWith('johnny-v1-')) return johnny(classId, name.slice('johnny-v1-'.length));
  if (name.startsWith('johnny-legacy-')) return johnnyLegacy(classId, name.slice('johnny-legacy-'.length));
  if (name.startsWith('johnny-')) return johnnyEngine(classId, name.slice('johnny-'.length));
  throw new Error(`unknown persona '${name}' (have spike, spike-v1, timmy, turtle, novice, johnny-<engine>, johnny-v1-<archetype>)`);
}

export function personaPolicy(p: Persona): Policy {
  return {
    name: p.name,
    choose(game: Game, legal: Action[], seed: number): Action {
      const s = game.state;
      if (s.phase === 'combat') return plannerChoose(game, legal, p.planner);
      const pc = pendingOf(s);
      if (pc) return choiceAction(s, pc, legal);
      return chooseRun(s, legal, singleRng(hashString(`${p.name}:${seed}`)), p.run);
    },
  };
}

/** Policy by name for a class: a persona name or 'greedy'. */
export function policyByName(name: string, classId: string): Policy {
  if (name === 'greedy') return { name: 'greedy', choose: greedyChoose };
  return personaPolicy(personaFor(name, classId));
}
