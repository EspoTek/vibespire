// Heuristic answers to pending choices (combat and run level). Used for real decisions and inside
// look-ahead simulations. Every answer is matched against legalActions (never invented).

import { getCardDef, getPotionDef } from '../../../src/content';
import { choiceStep, bloomCapFor, isAttackIntent, type Action, type CardInstance, type PendingChoice, type RunState } from '../../../src/engine';
import { bestOffer, offerScore } from './archetype';
import { effectsValue, infoOf, keepValue, upgradeGain } from './cards';
import { sameAction } from './clone';

function cardsIn(s: RunState, from: PendingChoice['from']): CardInstance[] {
  const c = s.combat;
  switch (from) {
    case 'deck':
      return s.player.deck;
    case 'hand':
    case 'draw':
    case 'discard':
    case 'exhaust': {
      if (!c) throw new Error(`choice from ${from} outside combat`);
      return c[from];
    }
    case null:
      throw new Error('card choice without a source zone');
  }
}

function lookup(s: RunState, pc: PendingChoice): Map<number, CardInstance> {
  const m = new Map<number, CardInstance>();
  const pool = cardsIn(s, pc.from);
  for (const uid of pc.choices) {
    const card = pool.find((c) => c.uid === uid);
    if (!card) throw new Error(`choice "${pc.prompt}": uid ${uid} not in ${String(pc.from)}`);
    m.set(uid, card);
  }
  return m;
}

/** In-combat worth of a card in hand right now (low = discard/Scrap it first). */
function handWorth(c: CardInstance): number {
  const i = infoOf(c);
  if (i.junk) return i.def.cost === null ? -10 : -6;
  return i.value - i.costNum * 1.5;
}

/** Damage cards left in the draw + discard piles below which the last damage sources are protected. */
const SCARCE_DAMAGE = 4;

/**
 * Keep bonus for a damage card when the fight is running out of them: 100 when fewer than SCARCE_DAMAGE
 * damage cards remain in the draw and discard piles, else 0. Used by choices that Scrap or exhaust hand
 * cards (Triage, exhausts), so the bot never deletes its own way to win.
 */
export function scarceDamageBonus(s: RunState): number {
  const c = s.combat;
  if (!c) throw new Error('scarceDamageBonus outside combat');
  let n = 0;
  for (const x of c.draw) if (infoOf(x).damage > 0) n += 1;
  for (const x of c.discard) if (infoOf(x).damage > 0) n += 1;
  return n < SCARCE_DAMAGE ? 100 : 0;
}

function incoming(s: RunState): number {
  const c = s.combat;
  if (!c) return 0;
  let n = 0;
  for (const e of c.enemies) if (e.alive && isAttackIntent(e.intent)) n += (e.intent.damage ?? 0) * (e.intent.hits ?? 1);
  return n;
}

function bloomTargetScore(s: RunState, c: CardInstance): number {
  const i = infoOf(c);
  const b = c.vars?.bloom ?? 0;
  if (b >= bloomCapFor(s, c)) return -100;
  return i.perBloom * 2 + 0.25 * b + (c.upgraded ? 0.5 : 0) + (i.def.type === 'attack' ? 0.3 : 0);
}

/** Pick `k` items by score (descending), returned in `choices` order. */
function topK(choices: readonly number[], score: (id: number) => number, k: number): number[] {
  const ranked = [...choices].sort((a, b) => score(b) - score(a) || a - b).slice(0, k);
  const set = new Set(ranked);
  return choices.filter((x) => set.has(x));
}

/** Pick min..max items: the best `min`, then extras while `wantExtra` holds. */
function pickRange(pc: PendingChoice, score: (id: number) => number, wantExtra: (id: number) => boolean): number[] {
  const ranked = [...pc.choices].sort((a, b) => score(b) - score(a) || a - b);
  const out: number[] = [];
  for (const id of ranked) {
    if (out.length >= pc.max) break;
    if (out.length < pc.min || wantExtra(id)) out.push(id);
  }
  const set = new Set(out);
  return pc.choices.filter((x) => set.has(x));
}

export function answerChoice(s: RunState, pc: PendingChoice): number[] {
  const r = pc.resume;
  switch (r.op) {
    case 'discard':
    case 'exhaust':
    case 'exhaust_then': {
      const m = lookup(s, pc);
      // An exhaust removes the card for the fight: never pick one of the last damage sources first.
      const guard = r.op === 'discard' ? 0 : scarceDamageBonus(s);
      const w = (id: number): number => -(handWorth(m.get(id) as CardInstance) + (infoOf(m.get(id) as CardInstance).damage > 0 ? guard : 0));
      return pickRange(pc, w, (id) => infoOf(m.get(id) as CardInstance).junk);
    }
    case 'scry': {
      const m = lookup(s, pc);
      return pickRange(pc, (id) => -handWorth(m.get(id) as CardInstance), (id) => handWorth(m.get(id) as CardInstance) < 0);
    }
    case 'upgrade_combat':
    case 'upgrade_deck': {
      const m = lookup(s, pc);
      return topK(pc.choices, (id) => upgradeGain(m.get(id) as CardInstance), pc.min);
    }
    case 'remove_deck':
    case 'transform_deck':
    case 'transmute_choose': {
      const m = lookup(s, pc);
      return pickRange(pc, (id) => -keepValue(m.get(id) as CardInstance), (id) => keepValue(m.get(id) as CardInstance) < 0);
    }
    case 'triage': {
      // shared v2 Triage Locker: keep the most valuable cards (up to max); the rest are Scrapped. When the
      // fight is running out of damage, damage cards are kept first: scrapping the last attacks leaves a deck
      // that cannot win (the Phase D Triage stalemates).
      const m = lookup(s, pc);
      const guard = scarceDamageBonus(s);
      return topK(pc.choices, (id) => handWorth(m.get(id) as CardInstance) + (infoOf(m.get(id) as CardInstance).damage > 0 ? guard : 0), pc.max);
    }
    case 'copy_card': {
      const m = lookup(s, pc);
      return topK(pc.choices, (id) => handWorth(m.get(id) as CardInstance), pc.min);
    }
    case 'schedule': {
      // Put the most valuable hand card on the Timeline (it resolves for free later).
      const m = lookup(s, pc);
      return topK(pc.choices, (id) => handWorth(m.get(id) as CardInstance) + infoOf(m.get(id) as CardInstance).costNum * 1.5, pc.min);
    }
    case 'prime': {
      const m = lookup(s, pc);
      return topK(pc.choices, (id) => infoOf(m.get(id) as CardInstance).riposteValue, pc.min);
    }
    case 'prune_scrap': {
      const combat = s.combat;
      if (!combat) throw new Error('prune outside combat');
      const m = lookup(s, pc);
      const away = r.spec.variant === 'away';
      const target = (exclude: number): boolean => {
        if (r.spec.variant === 'wild') {
          const pool = [...combat.hand, ...combat.draw, ...combat.discard];
          return pool.some((c) => c.uid !== exclude && infoOf(c).def.keywords?.includes('bloom') && bloomTargetScore(s, c) > -100);
        }
        return combat.hand.some((c) => c.uid !== exclude && c.uid !== combat.inPlay[0]?.uid && infoOf(c).def.keywords?.includes('bloom') && bloomTargetScore(s, c) > -100);
      };
      let best: number | null = null;
      let bestW = Infinity;
      for (const id of pc.choices) {
        const c = m.get(id) as CardInstance;
        const i = infoOf(c);
        const isBloom = i.def.keywords?.includes('bloom') ?? false;
        let ok: boolean;
        if (away) ok = (i.junk || i.basic) && getCardDef(c.id).bound !== true;
        else ok = i.junk || (!isBloom && target(id) && (i.basic || handWorth(c) < 4));
        if (!ok) continue;
        const w = away ? keepValue(c) : handWorth(c);
        if (w < bestW) {
          bestW = w;
          best = id;
        }
      }
      return best === null ? [] : [best];
    }
    case 'prune_bloom':
    case 'bloom_pick': {
      const m = lookup(s, pc);
      return topK(pc.choices, (id) => bloomTargetScore(s, m.get(id) as CardInstance), 1);
    }
    case 'fetch': {
      const m = lookup(s, pc);
      const score = (id: number): number => {
        const i = infoOf(m.get(id) as CardInstance);
        return r.to === 'primed' ? i.riposteValue : i.value;
      };
      return pickRange(pc, score, (id) => score(id) > 3);
    }
    case 'duplicate': {
      const m = lookup(s, pc);
      return topK(pc.choices, (id) => keepValue(m.get(id) as CardInstance) - (m.get(id)?.vars?.bloom ?? 0) * infoOf(m.get(id) as CardInstance).perBloom * 0.8, 1);
    }
    case 'transmute_pick':
    case 'offer_pick': {
      const { index } = bestOffer(s, pc.offers);
      const choice = pc.choices[index];
      if (choice === undefined) throw new Error('offer index out of range');
      return [choice];
    }
    case 'options': {
      const inc = incoming(s);
      const block = s.combat ? s.combat.player.block + s.combat.player.guard : 0;
      const needBlock = inc > block;
      let best = 0;
      let bestV = -Infinity;
      r.options.forEach((effects, i) => {
        let v = effectsValue(effects);
        for (const e of effects) if (e.type === 'block' || e.type === 'guard') v += needBlock ? 2 : -3;
        if (v > bestV) {
          bestV = v;
          best = i;
        }
      });
      const id = pc.choices[best];
      if (id === undefined) throw new Error('option index out of range');
      return [id];
    }
    case 'lose_potion': {
      const pots = s.player.potions;
      let best = 0;
      let bestV = Infinity;
      pots.forEach((p, i) => {
        const v = effectsValue(getPotionDef(p).effects);
        if (v < bestV) {
          bestV = v;
          best = i;
        }
      });
      const id = pc.choices[best];
      if (id === undefined) throw new Error('lose_potion index out of range');
      return [id];
    }
    case 'lose_relic': {
      const id = pc.choices[pc.choices.length - 1];
      if (id === undefined) throw new Error('lose_relic: no choices');
      return [id];
    }
    case 'potion_swap': {
      // Swap out the weakest held potion when the new one is clearly better, else leave it.
      const fresh = effectsValue(getPotionDef(r.potion).effects);
      let worst = -1;
      let worstV = Infinity;
      s.player.potions.forEach((p, i) => {
        const v = effectsValue(getPotionDef(p).effects);
        if (v < worstV) {
          worstV = v;
          worst = i;
        }
      });
      const leave = pc.choices[pc.choices.length - 1];
      if (leave === undefined) throw new Error('potion_swap: no choices');
      if (worst >= 0 && fresh > worstV + 3) {
        const id = pc.choices[worst];
        if (id === undefined) throw new Error('potion_swap index out of range');
        return [id];
      }
      return [leave];
    }
  }
}

/**
 * The next legal step toward the heuristic answer (throws if it is not legal): the answer itself for a
 * single-pick choice; for a multi-pick one a choice_toggle, then the confirming resolve_choice
 * (engine choiceStep; multi-pick answers are built one card at a time).
 */
export function choiceAction(s: RunState, pc: PendingChoice, legal: readonly Action[]): Action {
  const want: Action = choiceStep(pc, answerChoice(s, pc));
  const hit = legal.find((a) => sameAction(a, want));
  if (!hit) throw new Error(`greedy: heuristic answer ${JSON.stringify(want)} to "${pc.prompt}" (${pc.resume.op}) is not legal`);
  return hit;
}

export { offerScore };
