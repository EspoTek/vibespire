// Card-reward model: an archetype score per class keyed on card tags (docs/cards/*.md §0.3 and the
// archetype matrices), plus a baseline rarity/efficiency score and an anti-bloat penalty that grows
// with deck size. Below the skip threshold the policy skips (and earns a Shard).

import type { CardInstance, CardOffer, RunState } from '../../../src/engine';
import { cardInfo, infoOf } from './cards';

/** tag -> archetype, per class. Unknown classes (the test pack) use GENERIC. */
const ARCHETYPES: Record<string, Record<string, string>> = {
  breaker: {
    swing: 'swing', finisher: 'swing', scaling: 'swing',
    riposte: 'duellist', stagger: 'duellist', multihit_answer: 'duellist', cancel: 'duellist',
    guard: 'bulwark', defence: 'bulwark',
    glue: 'glue', exposed: 'glue', cheap: 'glue',
  },
  graft: {
    gardener: 'gardener', bloom: 'gardener', prune: 'gardener',
    blight: 'blight', rot: 'blight',
    compost: 'compost',
    mass: 'mass',
  },
  chronist: {
    metronome: 'metronome', on_beat: 'metronome', cadence: 'metronome',
    timeline: 'timeline', delay: 'timeline', advance: 'timeline',
    oracle: 'oracle', forecast: 'oracle',
    glue: 'glue', cheap: 'glue',
  },
};

const GENERIC: Record<string, string> = {
  onslaught: 'swing', riposte: 'duellist', guard: 'bulwark', bloom: 'gardener', prune: 'gardener',
  delay: 'timeline', cadence: 'metronome', scaling: 'scaling', debuff: 'debuff',
};

/** Tags every deck wants a little of, whatever its archetype. */
const UTILITY: Record<string, number> = { draw: 1.2, aoe: 1.0, energy: 1.5, scaling: 0.8, removal: 0.8, multihit_answer: 0.5 };

export interface DeckProfile {
  size: number;
  nonStarter: number;
  arch: Record<string, number>;
  attacks: number;
  blocks: number;
  aoe: number;
  draw: number;
  /** Static damage and Block+Guard summed over the deck. */
  dmg: number;
  def: number;
  copies: Record<string, number>;
}

export function archetypesOf(classId: string, tags: readonly string[]): string[] {
  const map = ARCHETYPES[classId] ?? GENERIC;
  const out = new Set<string>();
  for (const t of tags) {
    const a = map[t];
    if (a) out.add(a);
  }
  return [...out];
}

export function deckProfile(s: RunState, deck: readonly CardInstance[] = s.player.deck): DeckProfile {
  const p: DeckProfile = { size: deck.length, nonStarter: 0, arch: {}, attacks: 0, blocks: 0, aoe: 0, draw: 0, dmg: 0, def: 0, copies: {} };
  for (const c of deck) {
    const i = infoOf(c);
    if (i.junk) continue;
    const w = i.def.rarity === 'starter' ? 0.3 : 1;
    if (i.def.rarity !== 'starter') p.nonStarter += 1;
    for (const a of archetypesOf(s.classId, i.tags)) p.arch[a] = (p.arch[a] ?? 0) + w;
    if (i.def.type === 'attack') p.attacks += 1;
    if (i.tags.includes('block') || i.tags.includes('guard')) p.blocks += 1;
    if (i.tags.includes('aoe')) p.aoe += 1;
    if (i.draws) p.draw += 1;
    p.dmg += i.damage;
    p.def += i.defense;
    p.copies[c.id] = (p.copies[c.id] ?? 0) + 1;
  }
  return p;
}

const RARITY_BONUS: Record<string, number> = { common: 0, uncommon: 1.2, rare: 2.5, special: 0, starter: -1 };

/** How much this offer improves the deck (comparable to skipThreshold). */
export function offerScore(s: RunState, offer: CardOffer, p: DeckProfile = deckProfile(s)): number {
  const i = cardInfo(offer.id, offer.upgraded);
  if (i.junk) return -20;
  let score = cardQuality(offer.id, offer.upgraded);
  const total = Math.max(1, Object.values(p.arch).reduce((a, b) => a + b, 0));
  const archs = archetypesOf(s.classId, i.tags);
  let syn = 0;
  for (const a of archs) syn += 1.2 + 4 * ((p.arch[a] ?? 0) / total);
  // Committed decks (act 2+) devalue off-archetype cards.
  if (archs.length === 0 && p.nonStarter >= 5) syn -= 1;
  score += Math.min(syn, 5);
  for (const t of i.tags) score += UTILITY[t] ?? 0;
  if (i.tags.includes('aoe')) score += p.aoe === 0 ? 1.5 : p.aoe >= 2 ? -1.5 : 0;
  // Deck needs: keep defence at least ~40% of damage, and damage from falling behind.
  const defShare = p.def / Math.max(1, p.dmg + p.def);
  if (i.defense > 0 && defShare < 0.42) score += Math.min(3, (0.42 - defShare) * 15) + Math.min(2, i.defense / 6);
  if (i.damage > 0 && defShare > 0.55) score += 1.5;
  // Diminishing returns on copies of the same card.
  score -= 1.5 * (p.copies[offer.id] ?? 0);
  // Anti-bloat: every card past 13 dilutes the deck, faster past 22.
  score -= 0.3 * Math.max(0, p.size - 13) + 0.3 * Math.max(0, p.size - 22);
  return score;
}

/** Floor of the skip threshold (the Shard is worth more than a card scoring below this). */
export const SKIP_THRESHOLD = 7.5;

/** Intrinsic quality of a card, independent of the deck (the first term of offerScore). */
export function cardQuality(id: string, upgraded: boolean): number {
  const i = cardInfo(id, upgraded);
  return Math.min(i.efficiency, 14) * 0.75 + (RARITY_BONUS[i.def.rarity] ?? 0) + (upgraded ? 0.5 : 0);
}

/** Margin an offer must clear over the (shrunk) mean quality of the deck's non-starter cards. */
const SKIP_MARGIN = 1.5;
/** Pseudo-cards at the floor's quality that the deck mean is shrunk toward. */
const SKIP_PRIOR_CARDS = 6;

/**
 * Skip threshold for this deck: an offer must beat the floor and the mean quality of the deck's
 * non-starter cards by a margin, so early picks are easy and a strong deck skips more. The mean is shrunk
 * toward the floor by SKIP_PRIOR_CARDS pseudo-cards. With the raw mean, a starter deck plus one strong
 * rare set the bar at that rare's quality + 1.5, and the bot skipped every later reward. A traced card
 * counterfactual, one extra Molten Shell on cf-6-breaker, skipped every card through Act 1 and died on
 * floor 32 with 11 cards. That made strong rares measure as traps (Phase E Breaker cards -11 to -19 win).
 */
export function skipThreshold(s: RunState): number {
  const qs = s.player.deck.filter((c) => {
    const i = infoOf(c);
    return !i.junk && i.def.rarity !== 'starter';
  }).map((c) => cardQuality(c.id, c.upgraded));
  const base = SKIP_THRESHOLD - SKIP_MARGIN;
  const mean = (qs.reduce((a, b) => a + b, 0) + SKIP_PRIOR_CARDS * base) / (qs.length + SKIP_PRIOR_CARDS);
  return Math.max(SKIP_THRESHOLD, mean + SKIP_MARGIN);
}

export function bestOffer(s: RunState, offers: readonly CardOffer[]): { index: number; score: number } {
  const p = deckProfile(s);
  let index = -1;
  let score = -Infinity;
  offers.forEach((o, k) => {
    const v = offerScore(s, o, p);
    if (v > score) {
      score = v;
      index = k;
    }
  });
  if (index < 0) throw new Error('bestOffer: no offers');
  return { index, score };
}
