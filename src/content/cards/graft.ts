// Graft pool, transcribed from docs/cards/graft.md; overrides: docs/RULINGS.md 15–23.
import type { CardDef, CardInstance, EffectCtx, StatusDef } from '../../engine/types';

const HYPHAL = { draw: 1, wide_draw: 2, threshold: 10 }; // Phase D (docs/v2/graft-design.md §13): threshold 6 -> 10
// Graft v2 (docs/v2/graft-design.md). Numbers shared by text and hooks.
const SPEAR = { ripe_cost: 2 }; // Phase D (docs/v2/graft-design.md §13): Ripe: costs 2 less (was 1)
const SECOND_FLUSH = { free_cost: 0 };
/** Perennial: Phase D adds +bloom effective Bloom to every Bloom card (numbers and Ripe). */
const PERENNIAL = { bloom: 2 };

// All Bloom cards in the shipped pool belong to Graft. Use the keyword, never the
// tag: Sap Drip, for example, has the tag but is not itself a Bloom card.
function isBloom(card: CardInstance): boolean {
  return GRAFT_CARDS.some((def) => def.id === card.id && def.keywords?.includes('bloom'));
}

function requireCombat(ctx: Pick<EffectCtx, 'combat'>) {
  if (!ctx.combat) throw new Error('Graft effect requires combat');
  return ctx.combat;
}


export const GRAFT_CARDS: CardDef[] = [
  {
    id: 'lash',
    name: 'Lash',
    cls: 'graft',
    type: 'attack',
    rarity: 'starter',
    cost: 1,
    target: 'enemy',
    keywords: [],
    text: 'Deal {damage} damage.',
    effects: [ { type: 'damage', amount: 6, target: 'target' } ],
    upgrade: { effects: [ { type: 'damage', amount: 9, target: 'target' } ] },
    tags: [ 'starter' ],
    icon: 'card_lash'
  },
  {
    id: 'husk',
    // Phase D (docs/v2/graft-design.md §13): Block 6/9 -> 5/8 (GDD §4.1 value; in every deck at about 2.8 copies).
    name: 'Husk',
    cls: 'graft',
    type: 'skill',
    rarity: 'starter',
    cost: 1,
    target: 'self',
    keywords: [],
    text: 'Gain {block} Block.',
    effects: [ { type: 'block', amount: 5 } ],
    upgrade: { effects: [ { type: 'block', amount: 8 } ] },
    tags: [ 'starter', 'block' ],
    icon: 'card_husk'
  },
  {
    id: 'seed_bite',
    name: 'Seed Bite',
    cls: 'graft',
    type: 'attack',
    rarity: 'starter',
    cost: 1,
    target: 'enemy',
    keywords: [ 'bloom' ],
    // Phase D (docs/v2/graft-design.md §13): +2/+3 per Bloom -> +1/+2. Heartseed puts it in every opening hand and
    // Spill grows it to 10 by Act 2 (24/34 damage for 1); the starter carried the class.
    // v2 (RULINGS 52): the starter shows the run goal, and a capped copy becomes a Prune source.
    text: 'Bloom. Deal {damage} (+{damage_per} per Bloom) damage. Ripe: Prune.',
    effects: [
      { type: 'damage', amount: { base: 4, per: 1, scale: { cardVar: 'bloom' } }, target: 'target' },
      { type: 'conditional', if: { type: 'ripe' }, then: [ { type: 'prune', bloom: 1, variant: 'standard' } ] }
    ],
    upgrade: {
      effects: [
        { type: 'damage', amount: { base: 4, per: 2, scale: { cardVar: 'bloom' } }, target: 'target' },
        { type: 'conditional', if: { type: 'ripe' }, then: [ { type: 'prune', bloom: 1, variant: 'standard' } ] }
      ]
    },
    tags: [ 'gardener', 'bloom', 'scaling', 'prune', 'engine:ripe', 'role:payoff', 'engine:compost', 'role:enabler' ],
    icon: 'card_seed_bite'
  },
  {
    id: 'graft_hide',
    name: 'Graft Hide',
    cls: 'graft',
    type: 'skill',
    rarity: 'starter',
    cost: 1,
    target: 'self',
    keywords: [],
    text: 'Gain {block} Block. Prune.',
    effects: [ { type: 'block', amount: 5 }, { type: 'prune', bloom: 1, variant: 'standard' } ],
    upgrade: { effects: [ { type: 'block', amount: 7 }, { type: 'prune', bloom: 1, variant: 'standard' } ] },
    tags: [ 'gardener', 'compost', 'prune', 'block', 'engine:compost', 'role:enabler' ],
    icon: 'card_graft_hide'
  },
  {
    id: 'thornwhirl',
    // Phase D (docs/v2/graft-design.md §13): base 9 -> 7 (v1 design value).
    // Phase D (docs/v2/graft-design.md §13): +2/+3 per Bloom -> +1/+2 (AoE priced at Bloom 2; Spill makes Bloom 8-10 common).
    name: 'Thornwhirl',
    cls: 'graft',
    type: 'attack',
    rarity: 'common',
    cost: 2,
    target: 'all_enemies',
    keywords: [ 'bloom' ],
    text: 'Bloom. Deal {damage} (+{damage_per} per Bloom) damage to ALL enemies.',
    effects: [ { type: 'damage', amount: { base: 7, per: 1, scale: { cardVar: 'bloom' } }, target: 'all_enemies' } ],
    upgrade: {
      effects: [
        { type: 'damage', amount: { base: 7, per: 2, scale: { cardVar: 'bloom' } }, target: 'all_enemies' }
      ]
    },
    tags: [ 'gardener', 'bloom', 'aoe', 'scaling', 'engine:canopy', 'role:enabler', 'engine:ripe' ],
    icon: 'card_thornwhirl'
  },
  {
    id: 'barb_flick',
    // Phase D (docs/v2/graft-design.md §13): base 3 -> 2 (v1 design value; spike takes 1.4 copies).
    name: 'Barb Flick',
    cls: 'graft',
    type: 'attack',
    rarity: 'common',
    cost: 0,
    target: 'enemy',
    keywords: [ 'bloom' ],
    text: 'Bloom. Deal {damage} (+{damage_per} per Bloom) damage. Ripe: draw {ripe_draw} card.',
    effects: [
      { type: 'damage', amount: { base: 2, per: 1, scale: { cardVar: 'bloom' } }, target: 'target' },
      { type: 'conditional', if: { type: 'ripe' }, then: [ { type: 'draw', n: 1, key: 'ripe_draw' } ] }
    ],
    upgrade: {
      effects: [
        { type: 'damage', amount: { base: 2, per: 2, scale: { cardVar: 'bloom' } }, target: 'target' },
        { type: 'conditional', if: { type: 'ripe' }, then: [ { type: 'draw', n: 1, key: 'ripe_draw' } ] }
      ]
    },
    tags: [ 'gardener', 'mass', 'bloom', 'cheap', 'draw', 'engine:canopy', 'role:enabler', 'engine:ripe', 'role:payoff' ],
    icon: 'card_barb_flick'
  },
  {
    id: 'grafting_cut',
    // Phase E3 (docs/v2/graft-design.md §14): base 2 -> 5 (the Compost Prune attack had no floor)
    name: 'Grafting Cut',
    cls: 'graft',
    type: 'attack',
    rarity: 'common',
    cost: 1,
    target: 'enemy',
    keywords: [ 'bloom' ],
    text: 'Bloom. Deal {damage} (+{damage_per} per Bloom) damage. Prune.',
    effects: [
      { type: 'damage', amount: { base: 5, per: 1, scale: { cardVar: 'bloom' } }, target: 'target' },
      { type: 'prune', bloom: 1, variant: 'standard' }
    ],
    upgrade: {
      effects: [
        { type: 'damage', amount: { base: 5, per: 2, scale: { cardVar: 'bloom' } }, target: 'target' },
        { type: 'prune', bloom: 1, variant: 'standard' }
      ]
    },
    tags: [ 'gardener', 'compost', 'bloom', 'prune', 'engine:compost', 'role:enabler', 'engine:canopy' ],
    icon: 'card_grafting_cut'
  },
  {
    id: 'hivestrike',
    // Phase F (docs/v2/graft-design.md §15): base 5/8 -> 7/10 (Canopy floor)
    name: 'Hivestrike',
    cls: 'graft',
    type: 'attack',
    rarity: 'common',
    cost: 1,
    target: 'enemy',
    keywords: [],
    // Phase D (docs/v2/graft-design.md §13): half the Bloom cards, base 4/7 -> 5/8.
    text: 'Deal {damage_base} damage plus half the Bloom cards in your deck ({damage}).',
    effects: [ { type: 'damage', amount: { base: 7, per: 0.5, scale: 'bloom_cards_in_deck' }, target: 'target' } ],
    upgrade: {
      effects: [ { type: 'damage', amount: { base: 10, per: 0.5, scale: 'bloom_cards_in_deck' }, target: 'target' } ]
    },
    tags: [ 'mass', 'gardener', 'scaling', 'engine:canopy', 'role:payoff' ],
    icon: 'card_hivestrike'
  },
  {
    id: 'shear',
    // Phase E4 (docs/v2/graft-design.md §14): damage 4/7 -> 6/9
    name: 'Shear',
    cls: 'graft',
    type: 'attack',
    rarity: 'common',
    cost: 1,
    target: 'enemy',
    keywords: [],
    // v2: the Chaff arrives before the Prune, so this Prune always has fodder.
    text: 'Deal {damage} damage. Add a Chaff to your hand. Prune.',
    effects: [
      { type: 'damage', amount: 6, target: 'target' },
      { type: 'add_card', card: 'chaff', to: 'hand', n: 1 },
      { type: 'prune', bloom: 1, variant: 'standard' }
    ],
    upgrade: {
      effects: [
        { type: 'damage', amount: 9, target: 'target' },
        { type: 'add_card', card: 'chaff', to: 'hand', n: 1 },
        { type: 'prune', bloom: 1, variant: 'standard' }
      ]
    },
    tags: [ 'compost', 'gardener', 'prune', 'engine:compost', 'role:enabler' ],
    icon: 'card_shear'
  },
  {
    id: 'spore_lash',
    // Phase E (docs/v2/graft-design.md §14): floor 4 dmg + 1 Rot -> 5 + 2 (7 + 3 upgraded): the Harvest opener
    name: 'Spore Lash',
    cls: 'graft',
    type: 'attack',
    rarity: 'common',
    cost: 1,
    target: 'enemy',
    keywords: [],
    text: 'Deal {damage} damage. Apply {rot} Rot.',
    effects: [
      { type: 'damage', amount: 5, target: 'target' },
      { type: 'status', target: 'target', id: 'rot', amount: 2, key: 'rot' }
    ],
    upgrade: {
      effects: [
        { type: 'damage', amount: 7, target: 'target' },
        { type: 'status', target: 'target', id: 'rot', amount: 3, key: 'rot' }
      ]
    },
    tags: [ 'blight', 'cheap', 'engine:harvest', 'role:enabler' ],
    icon: 'card_spore_lash'
  },
  {
    id: 'canker_bite',
    // Phase E4 (docs/v2/graft-design.md §14): base 5/8 -> 7/10
    name: 'Canker Bite',
    cls: 'graft',
    type: 'attack',
    rarity: 'common',
    cost: 1,
    target: 'enemy',
    keywords: [],
    text: 'Deal {damage} damage, {damage_per} per Rot on the enemy.',
    effects: [
      {
        type: 'damage',
        amount: { base: 7, per: 1, scale: { status: 'rot', of: 'target' } },
        target: 'target'
      }
    ],
    upgrade: {
      effects: [
        {
          type: 'damage',
          amount: { base: 10, per: 1, scale: { status: 'rot', of: 'target' } },
          target: 'target'
        }
      ]
    },
    tags: [ 'blight', 'scaling', 'engine:harvest', 'role:payoff' ],
    icon: 'card_canker_bite'
  },
  {
    id: 'mulch_maul',
    // Phase E (docs/v2/graft-design.md §14): base 5/8 -> 6/9
    // Phase E2 (docs/v2/graft-design.md §14): base 6/9 -> 8/11
    // Phase E5 (docs/v2/graft-design.md §14): +1 -> +2 per Scrapheap card: the Compost payoff scales with Chaff
    name: 'Mulch Maul',
    cls: 'graft',
    type: 'attack',
    rarity: 'common',
    cost: 1,
    target: 'enemy',
    keywords: [],
    text: 'Deal {damage} damage, {damage_per} per card in your Scrapheap.',
    effects: [ { type: 'damage', amount: { base: 8, per: 2, scale: 'cards_in_exhaust' }, target: 'target' } ],
    upgrade: {
      effects: [ { type: 'damage', amount: { base: 11, per: 2, scale: 'cards_in_exhaust' }, target: 'target' } ]
    },
    tags: [ 'compost', 'scaling', 'engine:compost', 'role:payoff' ],
    icon: 'card_mulch_maul'
  },
  {
    id: 'sap_shell',
    // Phase D (docs/v2/graft-design.md §13): base 6 -> 4 (v1 design value).
    // Phase F (docs/v2/graft-design.md §15): base 4 -> 6 (Canopy floor)
    name: 'Sap Shell',
    cls: 'graft',
    type: 'skill',
    rarity: 'common',
    cost: 1,
    target: 'self',
    keywords: [ 'bloom' ],
    text: 'Bloom. Gain {block} (+{block_per} per Bloom) Block.',
    effects: [ { type: 'block', amount: { base: 6, per: 1, scale: { cardVar: 'bloom' } } } ],
    upgrade: {
      effects: [ { type: 'block', amount: { base: 6, per: 2, scale: { cardVar: 'bloom' } } } ]
    },
    tags: [ 'gardener', 'blight', 'bloom', 'block', 'engine:canopy', 'role:enabler' ],
    icon: 'card_sap_shell'
  },
  {
    id: 'blightcap',
    name: 'Blightcap',
    cls: 'graft',
    type: 'skill',
    rarity: 'common',
    cost: 1, // Phase C: 2 -> 1 (v2 baseline cf -13 win **, -4.7 floors **)
    target: 'enemy',
    keywords: [ 'bloom' ],
    text: 'Bloom. Apply {rot} (+{rot_per} per Bloom) Rot.',
    effects: [
      {
        type: 'status',
        target: 'target',
        id: 'rot',
        amount: { base: 2, per: 1, scale: { cardVar: 'bloom' } },
        key: 'rot'
      }
    ],
    upgrade: {
      effects: [
        {
          type: 'status',
          target: 'target',
          id: 'rot',
          amount: { base: 2, per: 2, scale: { cardVar: 'bloom' } },
          key: 'rot'
        }
      ]
    },
    tags: [ 'gardener', 'blight', 'bloom', 'scaling', 'engine:harvest', 'role:enabler', 'engine:canopy', 'role:bridge' ],
    icon: 'card_blightcap'
  },
  {
    id: 'tendril_reach',
    // Phase D (docs/v2/graft-design.md §13): base Block 4 -> 2 (v1 design value).
    // Phase F (docs/v2/graft-design.md §15): base 2 -> 4 (Canopy floor)
    name: 'Tendril Reach',
    cls: 'graft',
    type: 'skill',
    rarity: 'common',
    cost: 1,
    target: 'self',
    keywords: [ 'bloom' ],
    text: 'Bloom. Gain {block} (+{block_per} per Bloom) Block. Draw {draw} card.',
    effects: [ { type: 'block', amount: { base: 4, per: 1, scale: { cardVar: 'bloom' } } }, { type: 'draw', n: 1 } ],
    upgrade: {
      effects: [
        { type: 'block', amount: { base: 4, per: 2, scale: { cardVar: 'bloom' } } },
        { type: 'draw', n: 1 }
      ]
    },
    tags: [ 'gardener', 'mass', 'bloom', 'draw', 'block', 'engine:canopy', 'role:enabler' ],
    icon: 'card_tendril_reach'
  },
  {
    id: 'root_mesh',
    // Phase F (docs/v2/graft-design.md §15): base 4/7 -> 6/9 (Canopy floor)
    name: 'Root Mesh',
    cls: 'graft',
    type: 'skill',
    rarity: 'common',
    cost: 1,
    target: 'self',
    keywords: [],
    // Phase D (docs/v2/graft-design.md §13): half the Bloom cards, base stays 4/7.
    text: 'Gain {block_base} Block plus half the Bloom cards in your deck ({block}).',
    effects: [ { type: 'block', amount: { base: 6, per: 0.5, scale: 'bloom_cards_in_deck' } } ],
    upgrade: { effects: [ { type: 'block', amount: { base: 9, per: 0.5, scale: 'bloom_cards_in_deck' } } ] },
    tags: [ 'mass', 'blight', 'block', 'scaling', 'engine:canopy', 'role:payoff' ],
    icon: 'card_root_mesh'
  },
  {
    id: 'deep_graft',
    // Phase D (docs/v2/graft-design.md §13): Block 3/6 -> 2/5 (v1 design value).
    // Phase E3 (docs/v2/graft-design.md §14): Block 2/5 -> 4/7
    name: 'Deep Graft',
    cls: 'graft',
    type: 'skill',
    rarity: 'common',
    cost: 1,
    target: 'self',
    keywords: [],
    text: 'Gain {block} Block. Prune {prune}.',
    effects: [ { type: 'block', amount: 4 }, { type: 'prune', bloom: 2, variant: 'standard' } ],
    upgrade: { effects: [ { type: 'block', amount: 7 }, { type: 'prune', bloom: 2, variant: 'standard' } ] },
    tags: [ 'gardener', 'compost', 'prune', 'block', 'engine:ripe', 'role:enabler', 'engine:compost' ],
    icon: 'card_deep_graft'
  },
  {
    id: 'spore_haze',
    name: 'Spore Haze',
    cls: 'graft',
    type: 'skill',
    rarity: 'common',
    cost: 1, // Phase D (docs/v2/graft-design.md §13): back to 1 (the Phase C cost-0 buff was measured on v1; v2 spike takes 0.8 copies)
    target: 'all_enemies',
    keywords: [ 'exhaust' ],
    text: 'Apply {rot} Rot to ALL enemies. Scrap.',
    effects: [ { type: 'status', target: 'all_enemies', id: 'rot', amount: 2, key: 'rot' } ],
    upgrade: { effects: [ { type: 'status', target: 'all_enemies', id: 'rot', amount: 3, key: 'rot' } ] },
    tags: [ 'blight', 'compost', 'aoe', 'engine:harvest', 'role:enabler' ],
    icon: 'card_spore_haze'
  },
  {
    id: 'mire_carapace',
    // Phase E (docs/v2/graft-design.md §14): base Block 4/7 -> 6/9
    // Phase E4 (docs/v2/graft-design.md §14): plus all of the enemy's Rot (was half): the Harvest deck's scaling defence
    name: 'Mire Carapace',
    cls: 'graft',
    type: 'skill',
    rarity: 'common',
    cost: 1,
    target: 'enemy',
    keywords: [],
    // v2: defence that scales with the clock instead of a flat "if Rot" rider.
    text: 'Gain {block_base} Block plus the enemy\'s Rot ({block}).',
    effects: [ { type: 'block', amount: { base: 6, per: 1, scale: { status: 'rot', of: 'target' } } } ],
    upgrade: { effects: [ { type: 'block', amount: { base: 9, per: 1, scale: { status: 'rot', of: 'target' } } } ] },
    tags: [ 'blight', 'block', 'engine:harvest', 'role:payoff' ],
    icon: 'card_mire_carapace'
  },
  {
    id: 'shed_husk',
    // pruned_type remembers the last successful Prune. Guard the rider so a
    // declined Prune cannot reuse an earlier Status/Curse Scrap.
    custom: {
      remember_prunes: (ctx) => {
        if (!ctx.card) throw new Error('Shed Husk requires its source card');
        const combat = requireCombat(ctx);
        combat.counters['shed_husk_before:' + ctx.card.uid] = combat.counters.prunes ?? 0;
      },
    },
    conditions: {
      pruned_this_play: (ctx) => {
        if (ctx.frame.src.kind !== 'card') throw new Error('Shed Husk requires a card source');
        const combat = requireCombat(ctx);
        const before = combat.counters['shed_husk_before:' + ctx.frame.src.uid];
        if (before === undefined) throw new Error('Shed Husk has not recorded its Prune count');
        return (combat.counters.prunes ?? 0) > before;
      },
    },
    // Phase D (docs/v2/graft-design.md §13): draw 2 -> 1 (Chaff made it a cantrip engine), Block 5/8 -> 3/6 (v1 design value; spike top pick at 1.8 copies).
    // Phase E6 (docs/v2/graft-design.md §14): Block back to 5/8 (Compost defence; spike headroom accepted)
    name: 'Shed Husk',
    cls: 'graft',
    type: 'skill',
    rarity: 'common',
    cost: 1,
    target: 'self',
    keywords: [],
    text: 'Gain {block} Block. Prune. If you Scrapped a Status or Curse, draw {draw} card.',
    effects: [
      { type: 'block', amount: 5 },
      { type: 'custom', fn: 'remember_prunes' },
      { type: 'prune', bloom: 1, variant: 'standard' },
      {
        type: 'conditional',
        if: {
          type: 'all',
          conds: [ { type: 'fn', fn: 'pruned_this_play' }, { type: 'pruned_type', cardType: ['status', 'curse'] } ]
        },
        then: [ { type: 'draw', n: 1 } ]
      }
    ],
    upgrade: {
      effects: [
        { type: 'block', amount: 8 },
        { type: 'custom', fn: 'remember_prunes' },
        { type: 'prune', bloom: 1, variant: 'standard' },
        {
          type: 'conditional',
          if: {
            type: 'all',
            conds: [ { type: 'fn', fn: 'pruned_this_play' }, { type: 'pruned_type', cardType: ['status', 'curse'] } ]
          },
          then: [ { type: 'draw', n: 1 } ]
        }
      ]
    },
    tags: [ 'compost', 'gardener', 'prune', 'block', 'draw', 'engine:compost', 'role:enabler' ],
    icon: 'card_shed_husk'
  },
  {
    id: 'sap_drip',
    name: 'Sap Drip',
    cls: 'graft',
    type: 'skill',
    rarity: 'common',
    cost: 0,
    target: 'self',
    keywords: [ 'exhaust' ],
    text: 'Choose a Bloom card in your hand; it gains {bloom} Bloom. Draw {draw} card. Scrap.',
    effects: [ { type: 'bloom', amount: 1, target: 'choose_hand', key: 'bloom' }, { type: 'draw', n: 1 } ],
    upgrade: {
      effects: [ { type: 'bloom', amount: 2, target: 'choose_hand', key: 'bloom' }, { type: 'draw', n: 1 } ]
    },
    tags: [ 'gardener', 'bloom', 'draw', 'cheap', 'engine:ripe', 'role:enabler' ],
    icon: 'card_sap_drip'
  },
  {
    id: 'leaf_litter',
    name: 'Leaf Litter',
    cls: 'graft',
    type: 'skill',
    rarity: 'common',
    cost: 1,
    target: 'all_enemies',
    keywords: [],
    text: 'Prune. Apply {rot} Rot to ALL enemies.',
    effects: [
      { type: 'prune', bloom: 1, variant: 'standard' },
      { type: 'status', target: 'all_enemies', id: 'rot', amount: 1, key: 'rot' }
    ],
    upgrade: {
      effects: [
        { type: 'prune', bloom: 1, variant: 'standard' },
        { type: 'status', target: 'all_enemies', id: 'rot', amount: 2, key: 'rot' }
      ]
    },
    tags: [ 'blight', 'compost', 'prune', 'aoe', 'engine:compost', 'engine:harvest', 'role:enabler', 'role:bridge' ],
    icon: 'card_leaf_litter'
  },
  {
    id: 'molt',
    // Phase E (docs/v2/graft-design.md §14): Block 3/5 -> 4/6
    // Phase E3 (docs/v2/graft-design.md §14): also draws 1
    // Phase E5 (docs/v2/graft-design.md §14): 2 -> 3 Chaff
    // Phase F (docs/v2/graft-design.md §15): 3 -> 2 Chaff, Block 4/6 -> 3/5 (one copy was +39 win, the strongest card in v2)
    name: 'Molt',
    cls: 'graft',
    type: 'skill',
    rarity: 'common',
    cost: 1,
    target: 'self',
    keywords: [],
    text: 'Gain {block} Block. Add {add_card} Chaff to your hand. Draw {draw} card.',
    effects: [ { type: 'block', amount: 3 }, { type: 'add_card', card: 'chaff', to: 'hand', n: 2 }, { type: 'draw', n: 1 } ],
    upgrade: { effects: [ { type: 'block', amount: 5 }, { type: 'add_card', card: 'chaff', to: 'hand', n: 2 }, { type: 'draw', n: 1 } ] },
    tags: [ 'compost', 'block', 'engine:compost', 'role:enabler' ],
    icon: 'card_molt'
  },
  {
    id: 'burst_pod',
    // Phase E2 (docs/v2/graft-design.md §14): Harvest 2 -> 3
    // Phase E5 (docs/v2/graft-design.md §14): cost 1 -> 0; upgrade Harvest 4 (was cost 0)
    name: 'Burst Pod',
    // Phase E (docs/v2/graft-design.md §14): sows before it reaps, so it is never a dead draw (was "Harvest 2. Scrap.").
    cls: 'graft',
    type: 'skill',
    rarity: 'common',
    cost: 0,
    target: 'enemy',
    keywords: [ 'exhaust' ],
    text: 'Apply {rot} Rot. Harvest {harvest}. Scrap.',
    effects: [ { type: 'status', target: 'target', id: 'rot', amount: 2, key: 'rot' }, { type: 'harvest', mult: 3, target: 'target' } ],
    upgrade: { effects: [ { type: 'status', target: 'target', id: 'rot', amount: 2, key: 'rot' }, { type: 'harvest', mult: 4, target: 'target' } ] },
    tags: [ 'blight', 'rot', 'engine:harvest', 'role:payoff' ],
    icon: 'card_burst_pod'
  },
  {
    id: 'twin_thorn',
    // Phase D (docs/v2/graft-design.md §13): Ripe extra hits 2 -> 1 again (spike top-5 pick at 0.9 copies once Ripe hit 4 times).
    name: 'Twin Thorn',
    cls: 'graft',
    type: 'attack',
    rarity: 'uncommon',
    cost: 2,
    target: 'enemy',
    keywords: [ 'bloom' ],
    text: 'Bloom. Deal {damage} (+{damage_per} per Bloom) damage twice. Ripe: deal it once more.',
    effects: [
      { type: 'damage', amount: { base: 4, per: 2, scale: { cardVar: 'bloom' } }, times: 2, target: 'target' },
      {
        type: 'conditional',
        if: { type: 'ripe' },
        then: [ { type: 'damage', amount: { base: 4, per: 2, scale: { cardVar: 'bloom' } }, target: 'target', key: 'ripe_damage' } ]
      }
    ],
    upgrade: {
      effects: [
        { type: 'damage', amount: { base: 4, per: 3, scale: { cardVar: 'bloom' } }, times: 2, target: 'target' },
        {
          type: 'conditional',
          if: { type: 'ripe' },
          then: [ { type: 'damage', amount: { base: 4, per: 3, scale: { cardVar: 'bloom' } }, target: 'target', key: 'ripe_damage' } ]
        }
      ]
    },
    tags: [ 'gardener', 'bloom', 'scaling', 'multihit', 'engine:ripe', 'engine:canopy', 'role:payoff' ],
    icon: 'card_twin_thorn'
  },
  {
    id: 'canopy_crush',
    name: 'Canopy Crush',
    cls: 'graft',
    type: 'attack',
    rarity: 'uncommon',
    cost: 2,
    target: 'enemy',
    keywords: [],
    // Phase D (docs/v2/graft-design.md §13): half the total Bloom, base 4/9 -> 6/11.
    text: 'Deal {damage_base} damage plus half the Bloom in your deck ({damage}).',
    effects: [ { type: 'damage', amount: { base: 6, per: 0.5, scale: 'bloom_total_in_deck' }, target: 'target' } ],
    upgrade: {
      effects: [ { type: 'damage', amount: { base: 11, per: 0.5, scale: 'bloom_total_in_deck' }, target: 'target' } ]
    },
    tags: [ 'mass', 'gardener', 'scaling', 'engine:canopy', 'role:payoff' ],
    icon: 'card_canopy_crush'
  },
  {
    id: 'miasma_sweep',
    name: 'Miasma Sweep',
    cls: 'graft',
    type: 'attack',
    rarity: 'uncommon',
    cost: 2,
    target: 'all_enemies',
    keywords: [ 'bloom' ],
    text: 'Bloom. Deal {damage} (+{damage_per} per Bloom) damage to ALL enemies. Apply {rot} Rot to ALL enemies.',
    effects: [
      { type: 'damage', amount: { base: 5, per: 1, scale: { cardVar: 'bloom' } }, target: 'all_enemies' },
      { type: 'status', target: 'all_enemies', id: 'rot', amount: 2, key: 'rot' }
    ],
    upgrade: {
      effects: [
        { type: 'damage', amount: { base: 5, per: 2, scale: { cardVar: 'bloom' } }, target: 'all_enemies' },
        { type: 'status', target: 'all_enemies', id: 'rot', amount: 2, key: 'rot' }
      ]
    },
    tags: [ 'blight', 'gardener', 'bloom', 'aoe', 'engine:harvest', 'role:enabler' ],
    icon: 'card_miasma_sweep'
  },
  {
    id: 'uproot',
    name: 'Uproot',
    cls: 'graft',
    type: 'attack',
    rarity: 'uncommon',
    cost: 2,
    target: 'enemy',
    keywords: [ 'exhaust' ],
    text: 'Deal {damage} damage. Prune away. Scrap.',
    effects: [ { type: 'damage', amount: 12, target: 'target' }, { type: 'prune', bloom: 1, variant: 'away' } ],
    upgrade: {
      effects: [ { type: 'damage', amount: 16, target: 'target' }, { type: 'prune', bloom: 1, variant: 'away' } ]
    },
    tags: [ 'compost', 'gardener', 'prune', 'removal', 'engine:compost', 'role:enabler' ],
    icon: 'card_uproot'
  },
  {
    id: 'pollen_sting',
    // Phase E (docs/v2/graft-design.md §14): base 3 -> 5
    name: 'Pollen Sting',
    cls: 'graft',
    type: 'attack',
    rarity: 'uncommon',
    cost: 1,
    target: 'enemy',
    keywords: [ 'bloom' ],
    text: 'Bloom. Deal {damage} (+{damage_per} per Bloom) damage. Choose a Bloom card in your hand; it gains {bloom} Bloom.',
    effects: [
      { type: 'damage', amount: { base: 5, per: 1, scale: { cardVar: 'bloom' } }, target: 'target' },
      { type: 'bloom', amount: 1, target: 'choose_hand', key: 'bloom' }
    ],
    upgrade: {
      effects: [
        { type: 'damage', amount: { base: 5, per: 2, scale: { cardVar: 'bloom' } }, target: 'target' },
        { type: 'bloom', amount: 1, target: 'choose_hand', key: 'bloom' }
      ]
    },
    tags: [ 'gardener', 'bloom', 'engine:ripe', 'role:enabler' ],
    icon: 'card_pollen_sting'
  },
  {
    id: 'patient_thorn',
    // Phase E (docs/v2/graft-design.md §14): base 4 -> 6
    name: 'Patient Thorn',
    cls: 'graft',
    type: 'attack',
    rarity: 'uncommon',
    cost: 1,
    target: 'enemy',
    keywords: [ 'bloom', 'retain' ],
    text: 'Bloom. Keep. Deal {damage} (+{damage_per} per Bloom) damage.',
    effects: [ { type: 'damage', amount: { base: 6, per: 2, scale: { cardVar: 'bloom' } }, target: 'target' } ],
    upgrade: {
      effects: [ { type: 'damage', amount: { base: 6, per: 3, scale: { cardVar: 'bloom' } }, target: 'target' } ]
    },
    tags: [ 'gardener', 'bloom', 'scaling', 'engine:ripe', 'role:enabler' ],
    icon: 'card_patient_thorn'
  },
  {
    id: 'burl_wall',
    // Phase D (docs/v2/graft-design.md §13): base 10 -> 8 (v1 design value).
    // Phase D (docs/v2/graft-design.md §13): +3/+4 per Bloom -> +2/+3 (38 Block at Bloom 10 was a 2-cost wall the planner always took).
    name: 'Burl Wall',
    cls: 'graft',
    type: 'skill',
    rarity: 'uncommon',
    cost: 2,
    target: 'self',
    keywords: [ 'bloom' ],
    text: 'Bloom. Gain {block} (+{block_per} per Bloom) Block.',
    effects: [ { type: 'block', amount: { base: 8, per: 2, scale: { cardVar: 'bloom' } } } ],
    upgrade: {
      effects: [ { type: 'block', amount: { base: 8, per: 3, scale: { cardVar: 'bloom' } } } ]
    },
    tags: [ 'gardener', 'blight', 'bloom', 'block', 'engine:canopy', 'role:enabler' ],
    icon: 'card_burl_wall'
  },
  {
    id: 'choking_spores',
    // Phase D (docs/v2/graft-design.md §13): Stagger 2/3 -> 1/2 (v1 design value).
    // Phase E2 (docs/v2/graft-design.md §14): Stagger back to 2/3: the Harvest deck's defence
    name: 'Choking Spores',
    cls: 'graft',
    type: 'skill',
    rarity: 'uncommon',
    cost: 1,
    target: 'all_enemies',
    keywords: [],
    text: 'Apply {stagger} Stagger and {rot} Rot to ALL enemies.',
    effects: [
      { type: 'status', target: 'all_enemies', id: 'stagger', amount: 2, key: 'stagger' },
      { type: 'status', target: 'all_enemies', id: 'rot', amount: 1, key: 'rot' }
    ],
    upgrade: {
      effects: [
        { type: 'status', target: 'all_enemies', id: 'stagger', amount: 3, key: 'stagger' },
        { type: 'status', target: 'all_enemies', id: 'rot', amount: 1, key: 'rot' }
      ]
    },
    tags: [ 'blight', 'aoe', 'debuff', 'block', 'engine:harvest', 'role:enabler' ],
    icon: 'card_choking_spores'
  },
  {
    id: 'propagate',
    custom: {
      propagate_bloom: (ctx) => {
        const combat = requireCombat(ctx);
        if (!ctx.card) throw new Error('Propagate requires its source card');
        const upgradeCopy = ctx.card.upgraded;
        const pool = combat.hand.filter(isBloom);
        if (pool.length === 0) return;
        ctx.queue([{
          type: 'choose', prompt: 'Choose a Bloom card in your hand to copy into your deck.',
          options: pool.map((card) => {
            const def = GRAFT_CARDS.find((candidate) => candidate.id === card.id);
            if (!def) throw new Error('Unknown Graft Bloom card');
            return {
              label: def.name + (card.upgraded ? '+' : ''),
              // v2: the copy keeps half the source's Bloom (round down).
              effects: [{ type: 'add_card' as const, card: card.id, to: 'deck' as const, upgraded: upgradeCopy || card.upgraded, bloom: Math.floor((card.vars?.bloom ?? 0) / 2) }],
            };
          }),
        }]);
      },
    },
    name: 'Propagate',
    cls: 'graft',
    type: 'skill',
    rarity: 'uncommon',
    cost: 1,
    target: 'none',
    keywords: [ 'exhaust' ],
    text: 'Choose a Bloom card in your hand. Add a copy with half its Bloom to your deck. Scrap.',
    effects: [ { type: 'custom', fn: 'propagate_bloom' } ],
    upgrade: {
      text: 'Choose a Bloom card in your hand. Add an upgraded copy with half its Bloom to your deck. Scrap.',
      effects: [ { type: 'custom', fn: 'propagate_bloom' } ]
    },
    tags: [ 'mass', 'gardener', 'bloom', 'engine:canopy', 'role:enabler', 'engine:ripe', 'role:bridge' ],
    icon: 'card_propagate'
  },
  {
    id: 'seed_rain',
    // Phase D (docs/v2/graft-design.md §13): Block 4/7 -> 3/6 (v1 design value).
    name: 'Seed Rain',
    cls: 'graft',
    type: 'skill',
    rarity: 'uncommon',
    cost: 1,
    target: 'self',
    keywords: [],
    text: 'Gain {block} Block. Spread Prune.',
    effects: [ { type: 'block', amount: 3 }, { type: 'prune', bloom: 1, variant: 'spread' } ],
    upgrade: { effects: [ { type: 'block', amount: 6 }, { type: 'prune', bloom: 1, variant: 'spread' } ] },
    tags: [ 'gardener', 'mass', 'prune', 'block', 'engine:canopy', 'engine:compost', 'role:enabler' ],
    icon: 'card_seed_rain'
  },
  {
    id: 'puffball',
    name: 'Puffball',
    cls: 'graft',
    type: 'skill',
    rarity: 'uncommon',
    cost: 2, // Phase D (docs/v2/graft-design.md §13): 1 -> 2 (Rot to ALL that grows with Spill-fed Bloom; report value/E 58)
    target: 'all_enemies',
    keywords: [ 'bloom', 'exhaust' ],
    text: 'Bloom. Apply {rot} (+{rot_per} per Bloom) Rot to ALL enemies. Scrap.',
    effects: [
      {
        type: 'status',
        target: 'all_enemies',
        id: 'rot',
        amount: { base: 1, per: 1, scale: { cardVar: 'bloom' } },
        key: 'rot'
      }
    ],
    upgrade: {
      effects: [
        {
          type: 'status',
          target: 'all_enemies',
          id: 'rot',
          amount: { base: 1, per: 2, scale: { cardVar: 'bloom' } },
          key: 'rot'
        }
      ]
    },
    tags: [ 'gardener', 'blight', 'bloom', 'aoe', 'engine:harvest', 'role:enabler' ],
    icon: 'card_puffball'
  },
  {
    id: 'sporeburst',
    // Phase E2 (docs/v2/graft-design.md §14): Harvest 1 -> 2 on ALL
    name: 'Sporeburst',
    cls: 'graft',
    type: 'skill',
    rarity: 'uncommon',
    cost: 1,
    target: 'all_enemies',
    keywords: [],
    // v2: the pack Harvest that re-sows every clock.
    text: 'Harvest {harvest} on ALL enemies. Then apply {rot} Rot to ALL enemies.',
    effects: [
      { type: 'harvest', mult: 2, target: 'all_enemies' },
      { type: 'status', target: 'all_enemies', id: 'rot', amount: 2, key: 'rot' }
    ],
    upgrade: {
      effects: [
        { type: 'harvest', mult: 2, target: 'all_enemies' },
        { type: 'status', target: 'all_enemies', id: 'rot', amount: 3, key: 'rot' }
      ]
    },
    tags: [ 'blight', 'aoe', 'rot', 'engine:harvest', 'role:payoff' ],
    icon: 'card_sporeburst'
  },
  {
    id: 'decomposer',
    name: 'Decomposer',
    cls: 'graft',
    type: 'power',
    rarity: 'uncommon',
    cost: 1,
    target: 'self',
    keywords: [],
    text: 'Whenever you Prune, apply {status} Rot to a random enemy.',
    effects: [ { type: 'status', target: 'self', id: 'decomposer', amount: 1 } ], // Phase D (docs/v2/graft-design.md §13): 2 -> 1 Rot per Prune (v1 design value; Chaff multiplied Prunes)
    upgrade: { cost: 0 },
    tags: [ 'compost', 'blight', 'prune', 'power', 'engine:compost', 'role:payoff', 'engine:harvest', 'role:bridge' ],
    icon: 'card_decomposer'
  },
  {
    id: 'dusk_pruning',
    // Phase E6 (docs/v2/graft-design.md §14): cost back to 1/0 (the Compost engine's every-turn Prune)
    name: 'Dusk Pruning',
    cls: 'graft',
    type: 'power',
    rarity: 'uncommon',
    cost: 1,
    target: 'self',
    keywords: [],
    text: 'At the end of your turn, Prune.',
    effects: [ { type: 'status', target: 'self', id: 'dusk_pruning', amount: 1 } ],
    upgrade: { cost: 0 },
    tags: [ 'gardener', 'compost', 'prune', 'power', 'engine:compost', 'role:enabler' ],
    icon: 'card_dusk_pruning'
  },
  {
    id: 'living_hedge',
    // Phase D (docs/v2/graft-design.md §13): cost 1/0 -> 2/1 (v1 design value).
    // Phase F (docs/v2/graft-design.md §15): cost 2/1 -> 1/0 (it stays at half the Bloom cards)
    name: 'Living Hedge',
    cls: 'graft',
    type: 'power',
    rarity: 'uncommon',
    cost: 1,
    target: 'self',
    keywords: [],
    // Phase D (docs/v2/graft-design.md §13): half the Bloom cards (was 1 Block per Bloom card).
    text: 'At the start of your turn, gain Block equal to half the Bloom cards in your deck.',
    effects: [ { type: 'status', target: 'self', id: 'living_hedge', amount: 1 } ],
    upgrade: { cost: 0 },
    tags: [ 'mass', 'blight', 'block', 'power', 'scaling', 'engine:canopy', 'role:payoff' ],
    icon: 'card_living_hedge'
  },
  {
    id: 'thorn_halo',
    // Phase E2 (docs/v2/graft-design.md §14): cost 2 -> 1 (the Ripe johnny takes 1.4 copies; spike rarely)
    name: 'Thorn Halo',
    cls: 'graft',
    type: 'power',
    rarity: 'uncommon',
    // Phase C: tried 2 -> 1 on the v1 cf (-7 win, -3.1 floors **), reverted: with Spill it was a top-5 pick in both
    // over-performing v2 johnny decks (Gardener 78%, Mass 76% vs spike 52.5%, 60 paired seeds).
    cost: 1,
    target: 'self',
    keywords: [ 'bloom' ],
    text: 'Bloom. At the start of your turn, deal {status} (+{status_per} per Bloom) damage to a random enemy.',
    effects: [
      {
        type: 'status',
        target: 'self',
        id: 'thorn_halo',
        amount: { base: 4, per: 1, scale: { cardVar: 'bloom' } }
      }
    ],
    upgrade: {
      effects: [
        {
          type: 'status',
          target: 'self',
          id: 'thorn_halo',
          amount: { base: 4, per: 2, scale: { cardVar: 'bloom' } }
        }
      ]
    },
    tags: [ 'gardener', 'bloom', 'power', 'scaling', 'engine:ripe', 'engine:canopy', 'role:payoff' ],
    icon: 'card_thorn_halo'
  },
  {
    id: 'ripening_rot',
    // Phase E2 (docs/v2/graft-design.md §14): each rotting enemy gains 2 Rot a turn (was 1)
    name: 'Ripening Rot',
    cls: 'graft',
    type: 'power',
    rarity: 'uncommon',
    cost: 1,
    target: 'self',
    keywords: [],
    text: 'At the start of your turn, each enemy with Rot gains {status} Rot.',
    effects: [ { type: 'status', target: 'self', id: 'ripening_rot', amount: 2 } ],
    upgrade: { cost: 0 },
    tags: [ 'blight', 'power', 'scaling', 'engine:harvest', 'role:enabler' ],
    icon: 'card_ripening_rot'
  },
  {
    id: 'reap',
    // Phase E (docs/v2/graft-design.md §14): damage 8/11 -> 10/13
    // Phase E2 (docs/v2/graft-design.md §14): Harvest 2 -> 3
    name: 'Reap',
    cls: 'graft',
    type: 'attack',
    rarity: 'uncommon',
    cost: 2,
    target: 'enemy',
    keywords: [],
    text: 'Deal {damage} damage. Harvest {harvest}.',
    effects: [ { type: 'damage', amount: 10, target: 'target' }, { type: 'harvest', mult: 3, target: 'target' } ],
    upgrade: { effects: [ { type: 'damage', amount: 13, target: 'target' }, { type: 'harvest', mult: 3, target: 'target' } ] },
    tags: [ 'blight', 'rot', 'engine:harvest', 'role:payoff' ],
    icon: 'card_reap'
  },
  {
    id: 'second_flush',
    custom: {
      // The Bloom card with the most (real) Bloom in the discard pile returns; free this turn if Ripe.
      second_flush: (ctx) => {
        const combat = requireCombat(ctx);
        const pool = combat.discard.filter(isBloom);
        if (pool.length === 0) return;
        const best = Math.max(...pool.map((c) => c.vars?.bloom ?? 0)); // a copy that never grew has 0 Bloom
        const card = ctx.rng.pick('misc', pool.filter((c) => (c.vars?.bloom ?? 0) === best));
        const free = ctx.isRipe(card);
        ctx.queue([
          free
            ? { type: 'fetch_card', from: 'discard', select: 'top', to: 'hand', uid: card.uid, costThisTurn: SECOND_FLUSH.free_cost }
            : { type: 'fetch_card', from: 'discard', select: 'top', to: 'hand', uid: card.uid },
        ]);
      },
    },
    // Phase E (docs/v2/graft-design.md §14): also draws 1 (it was a dead card with no grown copy in the discard pile)
    name: 'Second Flush',
    cls: 'graft',
    type: 'skill',
    rarity: 'uncommon',
    cost: 1,
    target: 'none',
    keywords: [],
    text: 'Put the Bloom card with the most Bloom in your discard pile into your hand. If it is Ripe, it costs {free_cost} this turn. Draw {draw} card.',
    effects: [ { type: 'custom', fn: 'second_flush' }, { type: 'draw', n: 1 } ],
    upgrade: { cost: 0 },
    values: SECOND_FLUSH,
    tags: [ 'gardener', 'bloom', 'fetch', 'engine:ripe', 'role:payoff' ],
    icon: 'card_second_flush'
  },
  {
    id: 'heartwood_spear',
    name: 'Heartwood Spear',
    cls: 'graft',
    type: 'attack',
    rarity: 'rare',
    cost: 2,
    target: 'enemy',
    keywords: [ 'bloom' ],
    text: 'Bloom. Deal {damage} (+{damage_per} per Bloom) damage. Ripe: costs {ripe_cost} less.',
    effects: [ { type: 'damage', amount: { base: 8, per: 5, scale: { cardVar: 'bloom' } }, target: 'target' } ],
    upgrade: {
      effects: [ { type: 'damage', amount: { base: 8, per: 6, scale: { cardVar: 'bloom' } }, target: 'target' } ]
    },
    hooks: { costModifier: (ctx, cost) => (ctx.isRipe() ? cost - SPEAR.ripe_cost : cost) },
    values: SPEAR,
    tags: [ 'gardener', 'bloom', 'scaling', 'engine:ripe', 'role:payoff' ],
    icon: 'card_heartwood_spear'
  },
  {
    id: 'death_cap',
    // Phase E (docs/v2/graft-design.md §14): a clean enemy gets 6 Rot instead of nothing
    name: 'Death Cap',
    cls: 'graft',
    type: 'attack',
    rarity: 'rare',
    cost: 2,
    target: 'enemy',
    keywords: [ 'exhaust' ],
    text: 'Deal {damage} damage. If the enemy has Rot, apply {rot} Rot; if not, apply {rot_fresh}. Scrap.',
    effects: [
      { type: 'damage', amount: 8, target: 'target' },
      {
        type: 'conditional',
        if: { type: 'has_status', who: 'target', id: 'rot', min: 1 },
        then: [ { type: 'status', target: 'target', id: 'rot', amount: 15, key: 'rot' } ],
        else: [ { type: 'status', target: 'target', id: 'rot', amount: 6, key: 'rot_fresh' } ]
      }
    ],
    upgrade: {
      effects: [
        { type: 'damage', amount: 12, target: 'target' },
        {
          type: 'conditional',
          if: { type: 'has_status', who: 'target', id: 'rot', min: 1 },
          then: [ { type: 'status', target: 'target', id: 'rot', amount: 15, key: 'rot' } ],
        else: [ { type: 'status', target: 'target', id: 'rot', amount: 6, key: 'rot_fresh' } ]
        }
      ]
    },
    tags: [ 'blight', 'scaling', 'engine:harvest', 'role:enabler' ],
    icon: 'card_death_cap'
  },
  {
    id: 'reaping_vine',
    amounts: {
      // Text renders outside combat too (reward, shop, deck): no combat = no Prunes this combat yet (BUG-9).
      // In combat the counter is created by the first Prune, so absent = 0.
      prunes_this_combat: (ctx) => (ctx.combat ? ctx.combat.counters.prunes ?? 0 : 0),
    },
    // Phase E2 (docs/v2/graft-design.md §14): 4/5 -> 5/6 per Prune
    name: 'Reaping Vine',
    cls: 'graft',
    type: 'attack',
    rarity: 'rare',
    cost: 2,
    target: 'enemy',
    keywords: [],
    text: 'Prune. Deal {damage} damage for each time you Pruned this combat ({times}).',
    effects: [
      { type: 'prune', bloom: 1, variant: 'standard' },
      { type: 'damage', amount: 5, times: { scale: { fn: 'prunes_this_combat' } }, target: 'target' }
    ],
    upgrade: {
      effects: [
        { type: 'prune', bloom: 1, variant: 'standard' },
        { type: 'damage', amount: 6, times: { scale: { fn: 'prunes_this_combat' } }, target: 'target' }
      ]
    },
    tags: [ 'compost', 'prune', 'scaling', 'multihit', 'engine:compost', 'role:payoff' ],
    icon: 'card_reaping_vine'
  },
  {
    id: 'verdant_tide',
    name: 'Verdant Tide',
    cls: 'graft',
    type: 'attack',
    rarity: 'rare',
    cost: 2,
    target: 'enemy',
    keywords: [],
    // Phase D (docs/v2/graft-design.md §13): hits = half the Bloom cards, damage 4/5 -> 6/7.
    text: 'Deal {damage} damage a number of times equal to half the Bloom cards in your deck ({times}).',
    effects: [
      {
        type: 'damage',
        amount: 6,
        times: { base: 0, per: 0.5, scale: 'bloom_cards_in_deck' },
        target: 'target'
      }
    ],
    upgrade: {
      effects: [
        {
          type: 'damage',
          amount: 7,
          times: { base: 0, per: 0.5, scale: 'bloom_cards_in_deck' },
          target: 'target'
        }
      ]
    },
    tags: [ 'mass', 'scaling', 'multihit', 'engine:canopy', 'role:payoff' ],
    icon: 'card_verdant_tide'
  },
  {
    id: 'humus_rite',
    name: 'Humus Rite',
    cls: 'graft',
    type: 'skill',
    rarity: 'rare',
    cost: 1,
    target: 'self',
    keywords: [ 'exhaust' ],
    text: 'Choose a Bloom card in your hand; it gains Bloom equal to the cards in your Scrapheap ({bloom}). Scrap.',
    effects: [
      {
        type: 'bloom',
        amount: { base: 0, per: 1, scale: 'cards_in_exhaust' },
        target: 'choose_hand',
        key: 'bloom'
      }
    ],
    upgrade: { cost: 0 },
    tags: [ 'compost', 'gardener', 'bloom', 'engine:compost', 'engine:ripe', 'role:bridge' ],
    icon: 'card_humus_rite'
  },
  {
    id: 'crystal_graft',
    hooks: {
      canPlay: ({ state, combat }) => {
        const cap = state.player.relics.some((relic) => relic.id === 'elder_seed') ? 15 : 10;
        return (state.player.counters.shards ?? 0) >= 1 &&
          (combat?.hand.some((card) => isBloom(card) && (card.vars?.bloom ?? 0) < cap) ?? false)
          ? true : 'Needs a Shard and a Bloom card';
      },
    },
    name: 'Crystal Graft',
    cls: 'graft',
    type: 'skill',
    rarity: 'rare',
    cost: 0,
    target: 'self',
    keywords: [ 'retain', 'exhaust' ],
    text: 'Keep. Playable only if you have a Shard. Lose {shards_abs} Shard: choose a Bloom card in your hand; it gains {bloom} Bloom. Scrap.',
    effects: [ { type: 'shards', amount: -1 }, { type: 'bloom', amount: 3, target: 'choose_hand', key: 'bloom' } ],
    upgrade: {
      effects: [ { type: 'shards', amount: -1 }, { type: 'bloom', amount: 4, target: 'choose_hand', key: 'bloom' } ]
    },
    tags: [ 'gardener', 'compost', 'shards', 'bloom', 'engine:ripe', 'role:enabler' ],
    icon: 'card_crystal_graft'
  },
  {
    id: 'thresher',
    // Phase E (docs/v2/graft-design.md §14): base 4 -> 5
    // Phase E2 (docs/v2/graft-design.md §14): base 5 -> 6
    name: 'Thresher',
    cls: 'graft',
    type: 'power',
    rarity: 'uncommon',
    cost: 2,
    target: 'self',
    keywords: [ 'bloom' ],
    text: 'Bloom. Whenever you Prune, deal {status} (+{status_per} per Bloom) damage to ALL enemies.',
    effects: [
      {
        type: 'status',
        target: 'self',
        id: 'thresher',
        amount: { base: 6, per: 1, scale: { cardVar: 'bloom' } }
      }
    ],
    upgrade: {
      effects: [
        {
          type: 'status',
          target: 'self',
          id: 'thresher',
          amount: { base: 6, per: 2, scale: { cardVar: 'bloom' } }
        }
      ]
    },
    tags: [ 'compost', 'gardener', 'bloom', 'prune', 'power', 'aoe', 'engine:compost', 'role:payoff' ],
    icon: 'card_thresher'
  },
  {
    id: 'hyphal_web',
    name: 'Hyphal Web',
    cls: 'graft',
    type: 'power',
    rarity: 'rare',
    cost: 1,
    target: 'self',
    keywords: [],
    text: 'At the start of your turn, draw {draw} card ({wide_draw} if you have {threshold}+ Bloom cards in your deck).',
    effects: [ { type: 'status', target: 'self', id: 'hyphal_web', amount: 1 } ],
    upgrade: { keywords: [ 'innate' ] },
    tags: [ 'mass', 'draw', 'power', 'engine:canopy', 'role:payoff' ],
    icon: 'card_hyphal_web',
    values: HYPHAL
  },
  {
    id: 'thornstorm',
    name: 'Thornstorm',
    cls: 'graft',
    type: 'attack',
    rarity: 'rare',
    cost: 'X',
    target: 'all_enemies',
    keywords: [ 'bloom' ],
    text: 'Bloom. Deal {damage} (+{damage_per} per Bloom) damage to ALL enemies X times.',
    effects: [ { type: 'damage', amount: { base: 5, per: 1, scale: { cardVar: 'bloom' } }, times: 'X', target: 'all_enemies' } ],
    upgrade: {
      effects: [ { type: 'damage', amount: { base: 5, per: 2, scale: { cardVar: 'bloom' } }, times: 'X', target: 'all_enemies' } ]
    },
    tags: [ 'gardener', 'mass', 'bloom', 'aoe', 'multihit', 'xcost', 'engine:canopy', 'role:payoff' ],
    icon: 'card_thornstorm'
  },
  {
    id: 'grim_harvest',
    // Phase E (docs/v2/graft-design.md §14): sows 3 Rot first: never a dead draw against a clean enemy
    // Phase E2 (docs/v2/graft-design.md §14): Harvest 3/4 -> 4/5
    name: 'Grim Harvest',
    cls: 'graft',
    type: 'skill',
    rarity: 'rare',
    cost: 2,
    target: 'enemy',
    keywords: [ 'retain' ],
    text: 'Keep. Apply {rot} Rot. Harvest {harvest}.',
    effects: [ { type: 'status', target: 'target', id: 'rot', amount: 3, key: 'rot' }, { type: 'harvest', mult: 4, target: 'target' } ],
    upgrade: { effects: [ { type: 'status', target: 'target', id: 'rot', amount: 3, key: 'rot' }, { type: 'harvest', mult: 5, target: 'target' } ] },
    tags: [ 'blight', 'rot', 'engine:harvest', 'role:payoff' ],
    icon: 'card_grim_harvest'
  },
  {
    id: 'clear_cut',
    // Phase E (docs/v2/graft-design.md §14): reworked: "Prune a Status card -> Prune again" (Chaff chains). The old "Scrap any number" Scrapped real cards and emptied the deck (Compost assembled -10.8).
    name: 'Clear-Cut',
    cls: 'graft',
    type: 'power',
    rarity: 'rare',
    cost: 1,
    target: 'self',
    keywords: [],
    text: 'Whenever you Prune a Status card, Prune again.',
    effects: [ { type: 'status', target: 'self', id: 'clear_cut', amount: 1 } ],
    upgrade: { cost: 0 },
    tags: [ 'compost', 'prune', 'power', 'engine:compost', 'role:multiplier' ],
    icon: 'card_clear_cut'
  },
  {
    id: 'deep_rot',
    name: 'Deep Rot',
    cls: 'graft',
    type: 'power',
    rarity: 'rare',
    cost: 1,
    target: 'self',
    keywords: [],
    text: 'Rot on enemies has no cap.',
    effects: [ { type: 'status', target: 'self', id: 'deep_rot', amount: 1 } ],
    upgrade: { cost: 0 },
    tags: [ 'blight', 'rot', 'power', 'engine:harvest', 'role:multiplier' ],
    icon: 'card_deep_rot'
  },
  {
    id: 'rootstock',
    name: 'Rootstock',
    cls: 'graft',
    type: 'power',
    rarity: 'rare',
    cost: 2,
    target: 'self',
    keywords: [],
    text: 'Your Bloom cards use the highest Bloom in your deck.',
    effects: [ { type: 'status', target: 'self', id: 'rootstock', amount: 1 } ],
    upgrade: { cost: 1 },
    tags: [ 'mass', 'bloom', 'power', 'engine:canopy', 'role:multiplier' ],
    icon: 'card_rootstock'
  },
  {
    id: 'perennial',
    name: 'Perennial',
    cls: 'graft',
    type: 'power',
    rarity: 'rare',
    cost: 1, // Phase D (docs/v2/graft-design.md §13): 2/1 -> 1/0 (Ripe assembled was -14 vs unassembled)
    target: 'self',
    keywords: [],
    // Phase D: Ripe assembled still lost to unassembled (-8.5 on 200 spike seeds), because Perennial was dead until a copy
    // ripened. Now it also lifts every Bloom card by {bloom}, so Ripe lands at 8 real Bloom and the payoff scales at once.
    text: 'Your Bloom cards count as having {bloom} more Bloom. After you play a Ripe card, return it to your hand (once per card each turn).',
    values: PERENNIAL,
    effects: [ { type: 'status', target: 'self', id: 'perennial', amount: 1 } ],
    upgrade: { cost: 0 },
    tags: [ 'gardener', 'bloom', 'power', 'engine:ripe', 'role:multiplier' ],
    icon: 'card_perennial'
  },
  {
    // Token (RULINGS 54: a Status card). Made by Molt and Shear; never in a reward pool.
    id: 'chaff',
    name: 'Chaff',
    cls: 'status',
    type: 'status',
    rarity: 'special',
    cost: 0,
    target: 'none',
    keywords: [ 'exhaust' ],
    text: 'Gain {block} Block. Scrap.',
    effects: [ { type: 'block', amount: 3 } ], // Phase E2: 2 -> 3 Block (Compost's defence)
    upgrade: {},
    tags: [ 'token', 'engine:compost' ],
    icon: 'card_chaff'
  }
];

export const GRAFT_STATUSES: StatusDef[] = [
  {
    id: 'decomposer',
    stacks: 'amount',
    decay: 'never',
    tick: 'never',
    isDebuff: false,
    text: 'Whenever you Prune, apply {stacks} Rot to a random enemy.',
    triggers: { onPrune: [ { type: 'status', target: 'random_enemy', id: 'rot', amount: { scale: 'stacks' } } ] },
    name: 'Decomposer',
    icon: 'status_decomposer'
  },
  {
    id: 'dusk_pruning',
    stacks: 'amount',
    decay: 'never',
    tick: 'never',
    isDebuff: false,
    text: 'At the end of your turn, Prune {stacks} time(s).',
    triggers: {
      onTurnEnd: [
        {
          type: 'repeat',
          times: { scale: 'stacks' },
          effects: [ { type: 'prune', bloom: 1, variant: 'standard' } ]
        }
      ]
    },
    name: 'Dusk Pruning',
    icon: 'status_dusk_pruning'
  },
  {
    id: 'living_hedge',
    stacks: 'amount',
    decay: 'never',
    tick: 'never',
    isDebuff: false,
    text: 'At the start of your turn, gain Block equal to half the Bloom cards in your deck ({stacks}×).',
    triggers: {
      onTurnStart: [
        {
          type: 'repeat',
          times: { scale: 'stacks' },
          effects: [ { type: 'block', amount: { base: 0, per: 0.5, scale: 'bloom_cards_in_deck' } } ]
        }
      ]
    },
    name: 'Living Hedge',
    icon: 'status_living_hedge'
  },
  {
    id: 'thorn_halo',
    stacks: 'amount',
    decay: 'never',
    tick: 'never',
    isDebuff: false,
    text: 'At the start of your turn, deal {stacks} damage to a random enemy.',
    triggers: { onTurnStart: [ { type: 'damage', amount: { scale: 'stacks' }, target: 'random_enemy' } ] },
    name: 'Thorn Halo',
    icon: 'status_thorn_halo'
  },
  {
    id: 'ripening_rot',
    custom: {
      ripen_rotting_enemies: (ctx) => {
        for (const enemy of requireCombat(ctx).enemies) {
          if (enemy.alive && (enemy.statuses.rot ?? 0) > 0) {
            ctx.queue([{ type: 'status', target: 'target', id: 'rot', amount: ctx.stacks }], { target: enemy.uid });
          }
        }
      },
    },
    stacks: 'amount',
    decay: 'never',
    tick: 'never',
    isDebuff: false,
    text: 'At the start of your turn, each enemy with Rot gains {stacks} Rot.',
    triggers: { onTurnStart: [ { type: 'custom', fn: 'ripen_rotting_enemies' } ] },
    name: 'Ripening Rot',
    icon: 'status_ripening_rot'
  },
  {
    id: 'thresher',
    stacks: 'amount',
    decay: 'never',
    tick: 'never',
    isDebuff: false,
    text: 'Whenever you Prune, deal {stacks} damage to ALL enemies.',
    triggers: { onPrune: [ { type: 'damage', amount: { scale: 'stacks' }, target: 'all_enemies' } ] },
    name: 'Thresher',
    icon: 'status_thresher'
  },
  {
    id: 'hyphal_web',
    stacks: 'amount',
    decay: 'never',
    tick: 'never',
    isDebuff: false,
    text: 'At the start of your turn, draw {stacks} card(s), twice that with {threshold}+ Bloom cards in your deck.',
    triggers: {
      onTurnStart: [
        {
          type: 'conditional',
          if: { type: 'compare', left: { base: 0, per: 1, scale: 'bloom_cards_in_deck' }, op: '>=', right: HYPHAL.threshold },
          then: [ { type: 'draw', n: { base: 0, per: HYPHAL.wide_draw, scale: 'stacks' } } ],
          else: [ { type: 'draw', n: { per: HYPHAL.draw, scale: 'stacks' } } ]
        }
      ]
    },
    name: 'Hyphal Web',
    icon: 'status_hyphal_web',
    values: HYPHAL
  },
  {
    id: 'clear_cut',
    name: 'Clear-Cut',
    stacks: 'flag',
    decay: 'never',
    tick: 'never',
    isDebuff: false,
    text: 'Whenever you Prune a Status card, Prune again.',
    triggers: {
      onPrune: [ { type: 'conditional', if: { type: 'pruned_type', cardType: 'status' }, then: [ { type: 'prune', bloom: 1, variant: 'standard' } ] } ]
    },
    icon: 'status_clear_cut'
  },
  {
    id: 'deep_rot',
    name: 'Deep Rot',
    stacks: 'flag',
    decay: 'never',
    tick: 'never',
    isDebuff: false,
    text: 'Rot on enemies has no cap.',
    hooks: { modifyStatusCap: (_c, id, cap, target) => (id === 'rot' && target !== 'player' ? Number.POSITIVE_INFINITY : cap) },
    icon: 'status_deep_rot'
  },
  {
    id: 'rootstock',
    name: 'Rootstock',
    stacks: 'flag',
    decay: 'never',
    tick: 'never',
    isDebuff: false,
    text: 'Your Bloom cards use the highest Bloom in your deck.',
    hooks: { effectiveBloom: (_c, _card, bloom, deckMax) => Math.max(bloom, deckMax) },
    icon: 'status_rootstock'
  },
  {
    id: 'perennial',
    name: 'Perennial',
    stacks: 'flag',
    decay: 'never',
    tick: 'never',
    isDebuff: false,
    text: 'Your Bloom cards count as having {bloom} more Bloom. After you play a Ripe card, return it to your hand (once per card each turn).',
    values: PERENNIAL,
    hooks: {
      effectiveBloom: (_c, _card, bloom) => bloom + PERENNIAL.bloom,
      afterCardPlayed: (ctx, info) => {
        const combat = requireCombat(ctx);
        const card = info.card;
        // Only a card that went to the discard pile returns (not Scrapped, not a Power, not on the Timeline).
        if (!ctx.isRipe(card) || !combat.discard.some((c) => c.uid === card.uid)) return;
        const key = `perennial:${combat.turn}:${card.uid}`;
        if (combat.counters[key] !== undefined) return;
        combat.counters[key] = 1;
        ctx.queue([{ type: 'fetch_card', from: 'discard', select: 'top', to: 'hand', uid: card.uid }]);
      },
    },
    icon: 'status_perennial'
  }
];
