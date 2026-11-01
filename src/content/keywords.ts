// The keyword glossary: every rules term a card, relic, potion or status uses, explained once.
// The renderer shows these as STS-style keyword boxes beside any inspected card, and the
// Compendium lists them. Owned by conveyance; card designers ADD entries here (see
// docs/CONTENT_GUIDE.md §"Keywords").
//
// Rules text is a TEMPLATE. Rule numbers come from the engine (TUNING etc.), never typed in:
// `renderKeywordText(id)` in src/engine/text.ts fills placeholders from `keywordTextValues()`
// there ({guard_cap}, {beats}, {bloom_cap}, ...). An unknown placeholder throws.
//
// How a card's keywords are found (`keywordsFor`), in this order:
//   1. text terms: each entry's `terms` are matched (whole word, case-sensitive) against the
//      card's text template, in reading order;
//   2. structure: engine keywords (`keywords: ['exhaust']` → Scrap), X cost, Riposte/Delay
//      lists, and effect types / status ids / conditions (a `guard` effect → Guard, ...),
//      appended when the text did not already name them;
//   3. referenced Status/Curse cards (`add_card` of Jitter → a box with Jitter's own text),
//      id `card:<cardId>`.
// Text is ASCII only: the 4x6 font has no curly quotes (write \' for an apostrophe; tests/render/glyphs.test.ts).
// tests/content/keywords.test.ts fails when any text uses a capitalised term that is neither a
// glossary term, a content name, nor a plain word in its allow-list.
import type { CardDef, Condition, Effect, Amount, Keyword } from '../engine/types';
import { allCards, getCardDef } from './registry';

export type KeywordId = string;

export interface KeywordDef {
  id: KeywordId;
  /** Display name (box title). */
  name: string;
  /** Rules text template; placeholders come from engine keywordTextValues(). Short: one to three sentences. */
  text: string;
  /** Words or phrases in card text that mean this keyword (whole word, case-sensitive). Default: [name]. */
  terms?: string[];
  /** Glossary grouping for the Compendium. */
  group: 'basic' | 'breaker' | 'graft' | 'chronist' | 'shared' | 'status' | 'run';
}

/**
 * The registry. Status-backed entries use the status id as their id (onslaught, exposed, rot, ...),
 * so a status icon and a keyword box explain the same thing.
 */
export const KEYWORDS: readonly KeywordDef[] = [
  // --- Basics
  {
    id: 'block',
    name: 'Block',
    group: 'basic',
    text: 'Stops damage from hits until it runs out. Hits use up Block first, then Guard, then HP. Block is removed at the start of its owner\'s turn.',
  },
  {
    id: 'defence',
    name: 'Defence',
    group: 'basic',
    terms: ['defence'],
    text: 'Your Block plus your Guard.',
  },
  {
    id: 'scrap',
    name: 'Scrap',
    group: 'basic',
    terms: ['Scrap', 'Scrapped', 'Scraps'],
    text: 'Put the card on the Scrapheap: it is out for the rest of this combat. It returns to your deck afterwards.',
  },
  {
    id: 'scrapheap',
    name: 'Scrapheap',
    group: 'basic',
    text: 'Cards Scrapped this combat. They come back to your deck when combat ends.',
  },
  {
    id: 'keep',
    name: 'Keep',
    group: 'basic',
    text: 'Not discarded at the end of your turn: it stays in your hand.',
  },
  {
    id: 'opening',
    name: 'Opening',
    group: 'basic',
    text: 'Starts every combat in your opening hand (one of the {draw_per_turn}).',
  },
  {
    id: 'unplayable',
    name: 'Unplayable',
    group: 'basic',
    text: 'This card cannot be played.',
  },
  {
    id: 'ethereal',
    name: 'Ethereal',
    group: 'basic',
    text: 'If this is still in your hand at the end of your turn, it is Scrapped.',
  },
  {
    id: 'x_cost',
    name: 'X cost',
    group: 'basic',
    terms: ['X'],
    text: 'Spends all your energy. X is the energy spent.',
  },
  {
    id: 'status_card',
    name: 'Status card',
    group: 'basic',
    terms: ['Status', 'Status card', 'Status cards'],
    text: 'A junk card added to your deck or piles by enemies and effects. Most are Unplayable or Scrap themselves.',
  },
  {
    id: 'curse',
    name: 'Curse',
    group: 'basic',
    terms: ['Curse', 'Curses'],
    text: 'A harmful card that stays in your deck until removed.',
  },
  {
    id: 'intent',
    name: 'Intent',
    group: 'basic',
    terms: ['intends', 'intent', 'intends to attack'],
    text: 'The icon above an enemy shows what it will do on its next turn, with the exact damage.',
  },

  // --- Breaker
  {
    id: 'onslaught',
    name: 'Onslaught',
    group: 'breaker',
    text: '+{onslaught_per_attack} after each Attack you play finishes (an Attack doesn\'t count itself). Cards grow with it or Spend it. Resets to 0 at the end of your turn. Max {onslaught_cap}.',
  },
  {
    id: 'spend',
    name: 'Spend',
    group: 'breaker',
    text: 'Spend N: if you have at least N, lose N and do the effect; if not, skip it. Spend all: lose all of it; the effect scales with the amount spent.',
  },
  {
    id: 'riposte',
    name: 'Riposte',
    group: 'breaker',
    terms: ['Riposte', 'Ripostes'],
    text: 'At the end of your turn, Riposte cards in your hand are primed instead of discarded. When an enemy attacks you, your leftmost primed card fires its Riposte at that enemy before any hit lands. Not a play.',
  },
  {
    id: 'primed',
    name: 'Primed',
    group: 'breaker',
    terms: ['primed', 'prime', 'Prime'],
    text: 'Waiting in the rack above your hand. You can prime {prime_base} card per turn (max {prime_cap}). One primed card fires per enemy attack; unfired ones are discarded at the start of your turn.',
  },
  {
    id: 'riposte_capacity',
    name: 'Parry Stance',
    group: 'breaker',
    terms: ['Parry Stance', 'capacity'],
    text: 'You can prime more Riposte cards at the end of your turn (base {prime_base}, max {prime_cap}).',
  },
  {
    id: 'guard',
    name: 'Guard',
    group: 'breaker',
    text: 'A second defence pool. Hits use up Block first, then Guard. At the start of its owner\'s turn, Guard halves (round down) instead of vanishing. Max {guard_cap}.',
  },
  // Breaker v2 (docs/v2/breaker-design.md §8)
  {
    id: 'embers',
    name: 'Embers',
    group: 'breaker',
    terms: ['Ember', 'Embers'],
    text: 'At the start of your turn, gain Onslaught equal to your Embers. Embers last the whole combat. Max {embers_cap}.',
  },
  {
    id: 'shed',
    name: 'Shed',
    group: 'breaker',
    terms: ['Shed'],
    text: 'Shed N: if you have at least N Guard, lose N Guard and do the effect; if not, skip it. Shed all Guard: lose all of it; the effect can use the amount Shed. Shedding is not damage.',
  },

  // --- Graft
  {
    id: 'bloom',
    name: 'Bloom',
    group: 'graft',
    text: 'A Bloom card grows. Each copy keeps its own Bloom count across combats (max {bloom_cap}) and its numbers rise with it. Bloom grows through Prune and effects that say so, never by playing the card. Bloom a card can\'t hold spills.',
  },
  {
    id: 'spill',
    name: 'Spill',
    group: 'graft',
    terms: ['Spill', 'spills'],
    text: 'Bloom a card can\'t hold (over its max, or with no Bloom card to take it) goes to the least-grown Bloom card in your deck that has room. It spills once; anything left is lost.',
  },
  {
    id: 'ripe',
    name: 'Ripe',
    group: 'graft',
    text: 'A Bloom card with {bloom_ripe} or more Bloom is Ripe. Its "Ripe:" part happens only then.',
  },
  {
    id: 'prune',
    name: 'Prune',
    group: 'graft',
    terms: ['Prune', 'Pruned', 'Prunes'],
    text: 'You may Scrap another card from your hand. If you do, choose a Bloom card in your hand: it gains 1 Bloom (Prune N: N Bloom).',
  },
  {
    id: 'wild_prune',
    name: 'Wild Prune',
    group: 'graft',
    text: 'Prune, but the Bloom goes to a random Bloom card in your hand, draw pile or discard pile.',
  },
  {
    id: 'spread_prune',
    name: 'Spread Prune',
    group: 'graft',
    text: 'Prune, but every Bloom card in your hand gains 1 Bloom.',
  },
  {
    id: 'prune_away',
    name: 'Prune away',
    group: 'graft',
    text: 'Prune, and the Scrapped card is also removed from your deck for good. At most {prune_away_cap} per turn.',
  },
  {
    id: 'rot',
    name: 'Rot',
    group: 'graft',
    text: 'At the end of its turn, it loses HP equal to its Rot (Block and Guard don\'t help), then Rot rises by 1. Max {rot_cap}. When it dies, half its Rot spreads to another enemy.',
  },
  {
    id: 'harvest',
    name: 'Harvest',
    group: 'graft',
    text: 'Harvest N: the enemy loses HP equal to N times its Rot (Block and Guard don\'t help), then its Rot is halved (round down). If it dies, its full Rot spreads.',
  },

  // --- Chronist
  {
    id: 'beat',
    name: 'On beat',
    group: 'chronist',
    terms: ['On beat', 'on the beat', 'On-beat', 'beat', 'Cadence'],
    text: 'Count the cards you play each turn. A card is on the beat when it is card {beats} of the turn, counting itself. Its "On beat:" part happens only then.',
  },
  // Chronist v2 (docs/v2/chronist-design.md §5)
  {
    id: 'beat_count',
    name: 'Beat count',
    group: 'chronist',
    terms: ['beat count'],
    text: 'How many cards you have played this turn, plus any Quicken. A card played at a beat count of {beats} is on the beat.',
  },
  {
    id: 'quicken',
    name: 'Quicken',
    group: 'chronist',
    text: 'Quicken N: add N to your beat count this turn. The count never goes back, so a beat you jump over is missed.',
  },
  {
    id: 'crescendo',
    name: 'Crescendo',
    group: 'chronist',
    text: 'An On beat part that grows with the turn: it happens once on your first beat, twice on your second, three times on your third.',
  },
  {
    id: 'chorus',
    name: 'Chorus',
    group: 'chronist',
    text: 'Chorus +N: when this resolves from your Timeline, it gets +N for each other card resolving at the same time (the same turn start, or the same Advance).',
  },
  {
    id: 'gather',
    name: 'Gather',
    group: 'chronist',
    text: 'Every card on your Timeline will now resolve on the same turn as the latest one.',
  },
  {
    id: 'schedule',
    name: 'Schedule',
    group: 'chronist',
    text: 'Schedule N: put an Attack or Skill from your hand (not a Delay card) on your Timeline for N turns. When it resolves, its effects happen for free. It is not played: no beat, no "when you play".',
  },
  {
    id: 'goaded',
    name: 'Goad',
    group: 'chronist',
    terms: ['Goad', 'Goaded'],
    text: 'Goad N: its hits deal N more damage during its next turn, then Goad wears off. Its intent shows the bigger number; the intent after next does not.',
  },
  {
    id: 'delay',
    name: 'Delay',
    group: 'chronist',
    text: 'Delay N: after its other effects, the card goes on your Timeline. Its Delay part resolves at the start of your turn N turns later, before you draw, using the numbers at that time.',
  },
  {
    id: 'timeline',
    name: 'Timeline',
    group: 'chronist',
    text: 'Delayed cards wait here, out of every pile: they can\'t be drawn, discarded or Scrapped. Holds at most {timeline_cap} cards.',
  },
  {
    id: 'advance',
    name: 'Advance',
    group: 'chronist',
    text: 'Cards on your Timeline resolve N turns sooner; any now due resolve at once. At most {advance_cap} Advance per turn.',
  },
  {
    id: 'postpone',
    name: 'Postpone',
    group: 'chronist',
    text: 'Cards on your Timeline resolve N turns later (at most {delay_max} turns away).',
  },
  {
    id: 'augury',
    name: 'Augury',
    group: 'chronist',
    text: 'You see each enemy\'s next {augury_depth} intents: its next move and the one after it.',
  },
  {
    id: 'forecast',
    name: 'Intent after next',
    group: 'chronist',
    terms: ['intent after next', 'intents after next', 'next two intents'],
    text: 'The move an enemy will make after its next one. Augury shows it; cards can check it even without Augury.',
  },

  // --- Shared
  {
    id: 'exposed',
    name: 'Exposed',
    group: 'shared',
    text: 'Each hit on it deals 1 more damage per stack (after other modifiers). Loses 1 at the end of its own turn. Max {exposed_cap}.',
  },
  {
    id: 'stagger',
    name: 'Stagger',
    group: 'shared',
    text: 'Each hit it deals does 1 less damage per stack (min 0). Loses 1 at the end of its own turn. Max {stagger_cap}.',
  },
  {
    id: 'shards',
    name: 'Shards',
    group: 'shared',
    terms: ['Shard', 'Shards'],
    text: 'Run currency, max {shard_cap}. Skip a card reward for {skip_shards}, a boss relic for {skip_boss_shards}. Spend them on Purge, Transmute and shop removals.',
  },
  // --- Shared v2 engines (docs/v2/shared-design.md §2; added by design-shared)
  {
    id: 'strain',
    name: 'Strain',
    group: 'shared',
    terms: ['Strain', 'Strained'],
    text: 'Lose that much HP. Block and Guard don\'t stop it, and it never takes you below 1 HP. Some relics and cards reward you whenever you Strain.',
  },
  {
    id: 'salvage',
    name: 'Salvage',
    group: 'shared',
    text: 'When this card is Scrapped, by any means (played with Scrap, Pruned, or Scrapped by an effect), its Salvage happens. It is not a play. Draw and energy from a Salvage after your turn ends wait for your next turn.',
  },
  {
    id: 'reserve',
    name: 'Reserve',
    group: 'shared',
    text: 'Stored energy that only X-cost cards can use. Your next X-cost card adds your Reserve to X, then your Reserve empties. Holds up to {reserve_cap}. Lasts until the end of combat.',
  },
  {
    id: 'reprise',
    name: 'Reprise',
    group: 'shared',
    text: 'The card\'s effects happen twice, on the same target and with the same X. It is still one play: one beat, one Onslaught. A card never resolves more than {reprise_max} times.',
  },
  {
    id: 'might',
    name: 'Might',
    group: 'status',
    text: 'Its hits deal 1 more damage per stack.',
  },
  {
    id: 'halted',
    name: 'Halted',
    group: 'status',
    terms: ['Halted', 'skips its next move'],
    text: 'Skips its next move, then acts normally. Bosses are immune.',
  },
  {
    id: 'elite_hunted',
    name: 'Hunted',
    group: 'status',
    text: 'A hunted elite: more Max HP and its hits deal more damage.',
  },
  {
    id: 'backlash_primed',
    name: 'Backlash',
    group: 'status',
    text: 'The next enemy hit on you deals {backlash_per} more damage per stack.',
  },
  {
    id: 'cost_tax',
    name: 'Jitter Tax',
    group: 'status',
    text: 'The next card you play costs 1 more per stack.',
  },
  // Enemy passives added by the v2 encounter pass (src/content/enemies). Numbers live in each status tooltip.
  {
    id: 'seething',
    name: 'Seething',
    group: 'status',
    text: 'Seething N: at the end of its turn, if it took less than N damage since its last turn, it gains Might. Hits on its Block or Guard count. Keep hitting it, or it keeps getting stronger.',
  },
  {
    id: 'facets',
    name: 'Facets',
    group: 'status',
    terms: ['Facets', 'Facet'],
    text: 'Crystal armour: each hit on it deals one less damage per Facet. A big enough hit shatters a Facet, and you gain a Shard.',
  },
  {
    id: 'frenzy',
    name: 'Frenzy',
    group: 'status',
    text: 'Its Frenzied Bite hits one more time after every use. Many small hits: Riposte that scales with hits loves it.',
  },
  {
    id: 'seed_bank',
    name: 'Seed Bank',
    group: 'status',
    text: 'How many more Buds Mother Orchid can summon. When it runs out, her garden stops growing.',
  },
  {
    id: 'white_fever',
    name: 'Fever',
    group: 'status',
    text: 'Each hit of its attacks deals more damage per Fever. It has a maximum, shown in its tooltip.',
  },
  {
    id: 'crown_rage',
    name: 'Crown Rage',
    group: 'status',
    text: 'Each hit of its attacks deals more damage per Crown Rage. It has a maximum, shown in its tooltip.',
  },
  {
    id: 'scour_rite',
    name: 'Scour Rite',
    group: 'status',
    text: 'Its Anoint washes Rot off the other enemies, but never off itself.',
  },

  // --- Run
  {
    id: 'purge',
    name: 'Purge',
    group: 'run',
    text: 'Rest site: pay {purge_shards} Shards to remove a card from your deck. The only way to remove Burden.',
  },
  {
    id: 'transmute',
    name: 'Transmute',
    group: 'run',
    terms: ['Transmute', 'Transmuted'],
    text: 'Rest site: pay {transmute_shards} Shard, choose a card, then pick 1 of {transmute_offers} cards of the same rarity to replace it.',
  },
  {
    id: 'smith',
    name: 'Smith',
    group: 'run',
    terms: ['Smith', 'upgrade', 'upgraded', 'Upgrade'],
    text: 'Upgrade a card: better numbers or a lower cost, for the rest of the run.',
  },
];

const BY_ID: ReadonlyMap<KeywordId, KeywordDef> = new Map(KEYWORDS.map((k) => [k.id, k]));
if (BY_ID.size !== KEYWORDS.length) throw new Error('keywords: duplicate keyword id');

/** Prefix for keyword ids that point at a Status/Curse card (`card:status_jitter`). */
export const CARD_KEYWORD_PREFIX = 'card:';

/** Glossary entry by id. THROWS on an unknown id. `card:<id>` ids resolve through getCardDef (which throws). */
export function getKeyword(id: KeywordId): KeywordDef {
  if (id.startsWith(CARD_KEYWORD_PREFIX)) {
    const def = getCardDef(id.slice(CARD_KEYWORD_PREFIX.length));
    return { id, name: def.name, text: def.text, group: 'basic' };
  }
  const k = BY_ID.get(id);
  if (!k) throw new Error(`unknown keyword '${id}' (add it to src/content/keywords.ts)`);
  return k;
}

export function hasKeyword(id: KeywordId): boolean {
  return BY_ID.has(id);
}

export function keywordTerms(k: KeywordDef): readonly string[] {
  return k.terms ?? [k.name];
}

// ---------------------------------------------------------------------------
// Text scanning

interface TermHit {
  id: KeywordId;
  index: number;
  length: number;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Every (term, keyword) pair, longest term first so "Wild Prune" wins over "Prune". */
const TERM_TABLE: readonly { term: string; id: KeywordId; re: RegExp }[] = KEYWORDS.flatMap((k) =>
  keywordTerms(k).map((term) => ({ term, id: k.id, re: new RegExp(`(?<![A-Za-z'])${escapeRe(term)}(?![A-Za-z])`, 'g') })),
).sort((a, b) => b.term.length - a.term.length);

/** Keyword term hits in a text (template placeholders are ignored), non-overlapping, longest first. */
export function scanKeywordTerms(text: string): TermHit[] {
  const clean = text.replace(/\{[a-zA-Z_][a-zA-Z0-9_]*\}/g, (m) => ' '.repeat(m.length));
  const taken: boolean[] = new Array<boolean>(clean.length).fill(false);
  const hits: TermHit[] = [];
  for (const { term, id, re } of TERM_TABLE) {
    re.lastIndex = 0;
    for (const m of clean.matchAll(re)) {
      if (m.index === undefined) throw new Error('keyword match without index');
      let free = true;
      for (let i = m.index; i < m.index + term.length; i++) if (taken[i]) free = false;
      if (!free) continue;
      for (let i = m.index; i < m.index + term.length; i++) taken[i] = true;
      hits.push({ id, index: m.index, length: term.length });
    }
  }
  return hits.sort((a, b) => a.index - b.index);
}

/** Keyword ids a text names, in reading order, without duplicates. */
export function keywordsInText(text: string): KeywordId[] {
  const out: KeywordId[] = [];
  for (const h of scanKeywordTerms(text)) if (!out.includes(h.id)) out.push(h.id);
  return out;
}

// ---------------------------------------------------------------------------
// Card structure

const ENGINE_KEYWORD: Record<Keyword, KeywordId> = {
  exhaust: 'scrap',
  ethereal: 'ethereal',
  innate: 'opening',
  retain: 'keep',
  unplayable: 'unplayable',
  riposte: 'riposte',
  bloom: 'bloom',
  delay: 'delay',
};

function amountKeywords(a: Amount | 'all' | 'half' | undefined, out: KeywordId[]): void {
  if (a === undefined || typeof a === 'number' || a === 'all' || a === 'half') return;
  if (a === 'X') return void out.push('x_cost');
  const s = a.scale;
  if (s === 'x') out.push('x_cost');
  else if (s === 'guard') out.push('guard');
  else if (s === 'defence') out.push('defence');
  else if (s === 'shards') out.push('shards');
  else if (s === 'cards_in_exhaust') out.push('scrapheap');
  else if (s === 'beat_count') out.push('beat');
  else if (s === 'timeline_count') out.push('timeline');
  else if (s === 'chorus') out.push('chorus');
  else if (s === 'beat_index') out.push('crescendo');
  else if (s === 'primed_count' || s === 'trigger_hits') out.push('primed');
  else if (s === 'forecast_damage') out.push('forecast');
  else if (s === 'rot_on_target') out.push('rot');
  else if (s === 'bloom_cards_in_deck' || s === 'bloom_total_in_deck' || s === 'bloom_max_in_deck') out.push('bloom');
  else if (typeof s === 'object') {
    if ('status' in s && BY_ID.has(s.status)) out.push(s.status);
    if ('cardVar' in s && s.cardVar === 'bloom') out.push('bloom');
    if ('forecast_damage' in s) out.push('forecast');
  }
}

function conditionKeywords(c: Condition, out: KeywordId[]): void {
  switch (c.type) {
    case 'has_status':
      if (BY_ID.has(c.id)) out.push(c.id);
      break;
    case 'on_beat':
      out.push('beat');
      break;
    case 'forecast_is_attack':
      out.push(c.depth > 0 ? 'forecast' : 'intent');
      break;
    case 'target_intends_attack':
      out.push('intent');
      break;
    case 'pruned_type':
      out.push('prune');
      break;
    case 'timeline_nonempty':
      out.push('timeline');
      break;
    case 'compare':
      amountKeywords(c.left, out);
      amountKeywords(c.right, out);
      break;
    case 'not':
      conditionKeywords(c.cond, out);
      break;
    case 'all':
    case 'any':
      for (const x of c.conds) conditionKeywords(x, out);
      break;
    case 'target_dead':
    case 'hp_below_pct':
    case 'removed_self':
    case 'is_class':
    case 'fn':
      break;
    case 'ripe':
      out.push('ripe');
      break;
  }
}

const PRUNE_VARIANT: Record<'standard' | 'wild' | 'spread' | 'away', KeywordId> = {
  standard: 'prune',
  wild: 'wild_prune',
  spread: 'spread_prune',
  away: 'prune_away',
};

function effectKeywords(list: readonly Effect[], out: KeywordId[]): void {
  for (const e of list) {
    switch (e.type) {
      case 'damage':
        amountKeywords(e.amount, out);
        amountKeywords(e.times, out);
        break;
      case 'block':
        out.push('block');
        amountKeywords(e.amount, out);
        break;
      case 'guard':
        out.push('guard');
        amountKeywords(e.amount, out);
        break;
      case 'lose_guard':
        out.push('guard');
        break;
      case 'lose_defence':
        out.push(e.pool === 'both' ? 'defence' : e.pool);
        break;
      case 'status':
        if (BY_ID.has(e.id)) out.push(e.id);
        amountKeywords(e.amount, out);
        break;
      case 'spend_status':
        out.push('spend');
        if (BY_ID.has(e.id)) out.push(e.id);
        effectKeywords(e.effects, out);
        break;
      case 'shed':
        out.push('shed', 'guard');
        effectKeywords(e.effects, out);
        break;
      case 'exhaust':
        out.push('scrap');
        if (e.then) effectKeywords(e.then, out);
        break;
      // Shared v2
      case 'strain':
        out.push('strain');
        break;
      case 'triage':
        out.push('keep', 'scrap');
        break;
      case 'copy_card':
      case 'add_random_card':
        break;
      case 'fetch_card':
        if (e.from === 'exhaust') out.push('scrapheap');
        if (e.to === 'primed') out.push('primed');
        break;
      case 'bloom':
        out.push('bloom');
        amountKeywords(e.amount, out);
        break;
      case 'prune':
        out.push(PRUNE_VARIANT[e.variant ?? 'standard']);
        break;
      case 'advance':
        out.push('advance');
        break;
      case 'postpone':
        out.push('postpone');
        break;
      case 'gather':
        out.push('gather', 'timeline');
        break;
      case 'quicken':
        out.push('quicken', 'beat_count');
        break;
      case 'schedule':
        out.push('schedule', 'timeline');
        break;
      case 'on_beat':
        out.push('beat');
        effectKeywords(e.effects, out);
        break;
      case 'prime':
        out.push('primed');
        break;
      case 'shards':
        out.push('shards');
        break;
      case 'transmute':
        out.push('transmute');
        break;
      case 'halt_enemy':
        out.push('halted');
        break;
      case 'harvest':
        out.push('harvest', 'rot');
        break;
      case 'add_card': {
        const def = getCardDef(e.card);
        if (def.cls === 'status' || def.cls === 'curse') out.push(CARD_KEYWORD_PREFIX + def.id);
        break;
      }
      case 'repeat':
        amountKeywords(e.times, out);
        effectKeywords(e.effects, out);
        break;
      case 'conditional':
        conditionKeywords(e.if, out);
        effectKeywords(e.then, out);
        if (e.else) effectKeywords(e.else, out);
        break;
      case 'choose':
        for (const o of e.options) effectKeywords(o.effects, out);
        break;
      case 'gamble':
        for (const o of e.outcomes) effectKeywords(o.effects, out);
        break;
      case 'draw':
      case 'discard':
      case 'energy':
      case 'heal':
      case 'lose_hp':
      case 'max_hp':
      case 'upgrade':
      case 'scry':
      case 'gold':
      case 'remove_card':
      case 'transform_card':
      case 'gain_relic':
      case 'gain_potion':
      case 'potion_slots':
      case 'custom':
      case 'offer_cards':
      case 'duplicate_card':
      case 'lose_potion':
      case 'lose_relic':
      case 'start_combat':
      case 'run_flag':
      case 'autoplay':
      case 'summon':
      case 'transform':
      case 'reroll_forecast':
      case 'ai_state':
      case 'cancel_attack':
        break;
    }
  }
}

/** Keyword ids implied by a card's structure (engine keywords, cost, effect lists), unordered. */
export function structuralKeywords(def: CardDef): KeywordId[] {
  const out: KeywordId[] = [];
  for (const k of def.keywords ?? []) out.push(ENGINE_KEYWORD[k]);
  if (def.cost === 'X') out.push('x_cost');
  if (def.riposte) out.push('riposte');
  if (def.delay) out.push('delay', 'timeline');
  effectKeywords(def.effects, out);
  if (def.riposte) effectKeywords(def.riposte, out);
  if (def.delay) effectKeywords(def.delay.effects, out);
  if (def.salvage) {
    out.push('salvage', 'scrap');
    effectKeywords(def.salvage, out);
  }
  return [...new Set(out)];
}

/**
 * The keyword ids to explain for a card: the terms its text uses, in reading order, then structural
 * keywords the text did not name, then referenced Status/Curse cards. Every id resolves with getKeyword.
 */
export function keywordsFor(cardDef: CardDef, upgraded: boolean): KeywordId[] {
  const def = getCardDef(cardDef.id, upgraded);
  const out = keywordsInText(def.text);
  for (const id of structuralKeywords(def)) if (!out.includes(id)) out.push(id);
  // A card's own Status/Curse self-reference adds nothing.
  return out.filter((id) => id !== CARD_KEYWORD_PREFIX + def.id);
}

/**
 * Keyword ids named by any rules text (relics, potions, statuses, event options, intents): the
 * glossary terms, then the Status / Curse cards it names ("gain Static Ghost" → `card:curse_static_ghost`).
 */
export function keywordsForText(text: string): KeywordId[] {
  const out = keywordsInText(text);
  for (const c of allCards()) {
    if (c.cls !== 'status' && c.cls !== 'curse') continue;
    if (new RegExp(`(?<![A-Za-z])${escapeRe(c.name)}(?![A-Za-z])`).test(text)) out.push(CARD_KEYWORD_PREFIX + c.id);
  }
  return out;
}
