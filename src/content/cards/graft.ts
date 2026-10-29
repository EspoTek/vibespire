// Graft pool, transcribed from docs/cards/graft.md; overrides: docs/RULINGS.md 15–23.
import type { CardDef, CardInstance, EffectCtx, StatusDef } from '../../engine/types';

const TRANSPLANT_BONUS = { n: 2, n_up: 3 };
const QUICKENING = { free_cost: 0 };
const HYPHAL = { draw: 1, wide_draw: 2, threshold: 8 };
const SHEAR = { bonus_bloom: 1 };

// All Bloom cards in the shipped pool belong to Graft. Use the keyword, never the
// tag: Sap Drip, for example, has the tag but is not itself a Bloom card.
function isBloom(card: CardInstance): boolean {
  return GRAFT_CARDS.some((def) => def.id === card.id && def.keywords?.includes('bloom'));
}

function requireCombat(ctx: Pick<EffectCtx, 'combat'>) {
  if (!ctx.combat) throw new Error('Graft effect requires combat');
  return ctx.combat;
}

// A bounded set of named continuations keeps both Transplant choices resumable
// through save/load. The engine caps the hand at ten cards. Only the selected
// source slot's continuation runs; no closures or functions enter RunState.
const transplantSources: NonNullable<CardDef['custom']> = Object.fromEntries(
  Array.from({ length: 10 }, (_, slot) => [`transplant_source_${slot}`, (ctx: EffectCtx) => {
    const combat = requireCombat(ctx);
    const source = combat.hand[slot];
    if (!source || !isBloom(source)) throw new Error('Transplant source is no longer in hand');
    if (!ctx.card) throw new Error('Transplant requires its source card');
    const destinations = combat.hand.filter((card) => card.uid !== source.uid && isBloom(card));
    if (!destinations.length) throw new Error('Transplant requires another Bloom card');
    const old = source.vars?.bloom ?? 0; // copies without a Bloom var start at zero
    const amount = old + (ctx.card.upgraded ? TRANSPLANT_BONUS.n_up : TRANSPLANT_BONUS.n);
    source.vars = { ...source.vars, bloom: 0 };
    if (old > 0) ctx.emit({ t: 'bloom', uid: source.uid, delta: -old, now: 0 });
    // The native Bloom resume applies the real cap, emits the destination's
    // growth event, and dispatches onBloomGained (including Quickening Sap).
    const prompt = 'Choose a different Bloom card to receive the Bloom (excess over its cap is lost).';
    combat.pendingChoice = {
      kind: 'cards', prompt, from: 'hand', choices: destinations.map((card) => card.uid),
      labels: [], offers: [], min: 1, max: 1,
      resume: { op: 'bloom_pick', amount, where: 'combat' },
    };
    ctx.emit({ t: 'choice', prompt });
  }]),
);

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
    text: 'Bloom. Deal {damage} (+{damage_per} per Bloom) damage.',
    effects: [ { type: 'damage', amount: { base: 4, per: 2, scale: { cardVar: 'bloom' } }, target: 'target' } ],
    upgrade: {
      effects: [ { type: 'damage', amount: { base: 4, per: 3, scale: { cardVar: 'bloom' } }, target: 'target' } ]
    },
    tags: [ 'gardener', 'bloom', 'scaling' ],
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
    tags: [ 'gardener', 'compost', 'prune', 'block' ],
    icon: 'card_graft_hide'
  },
  {
    id: 'thornwhirl',
    name: 'Thornwhirl',
    cls: 'graft',
    type: 'attack',
    rarity: 'common',
    cost: 2,
    target: 'all_enemies',
    keywords: [ 'bloom' ],
    text: 'Bloom. Deal {damage} (+{damage_per} per Bloom) damage to ALL enemies.',
    effects: [ { type: 'damage', amount: { base: 7, per: 2, scale: { cardVar: 'bloom' } }, target: 'all_enemies' } ],
    upgrade: {
      effects: [
        { type: 'damage', amount: { base: 7, per: 3, scale: { cardVar: 'bloom' } }, target: 'all_enemies' }
      ]
    },
    tags: [ 'gardener', 'bloom', 'aoe', 'scaling' ],
    icon: 'card_thornwhirl'
  },
  {
    id: 'barb_flick',
    name: 'Barb Flick',
    cls: 'graft',
    type: 'attack',
    rarity: 'common',
    cost: 0,
    target: 'enemy',
    keywords: [ 'bloom' ],
    text: 'Bloom. Deal {damage} (+{damage_per} per Bloom) damage.',
    effects: [ { type: 'damage', amount: { base: 2, per: 1, scale: { cardVar: 'bloom' } }, target: 'target' } ],
    upgrade: {
      effects: [ { type: 'damage', amount: { base: 2, per: 2, scale: { cardVar: 'bloom' } }, target: 'target' } ]
    },
    tags: [ 'gardener', 'mass', 'bloom', 'cheap' ],
    icon: 'card_barb_flick'
  },
  {
    id: 'grafting_cut',
    name: 'Grafting Cut',
    cls: 'graft',
    type: 'attack',
    rarity: 'common',
    cost: 1,
    target: 'enemy',
    keywords: [ 'bloom' ],
    text: 'Bloom. Deal {damage} (+{damage_per} per Bloom) damage. Prune.',
    effects: [
      { type: 'damage', amount: { base: 2, per: 1, scale: { cardVar: 'bloom' } }, target: 'target' },
      { type: 'prune', bloom: 1, variant: 'standard' }
    ],
    upgrade: {
      effects: [
        { type: 'damage', amount: { base: 2, per: 2, scale: { cardVar: 'bloom' } }, target: 'target' },
        { type: 'prune', bloom: 1, variant: 'standard' }
      ]
    },
    tags: [ 'gardener', 'compost', 'bloom', 'prune' ],
    icon: 'card_grafting_cut'
  },
  {
    id: 'chitin_ram',
    name: 'Chitin Ram',
    cls: 'graft',
    type: 'attack',
    rarity: 'common',
    cost: 1,
    target: 'enemy',
    keywords: [ 'bloom' ],
    text: 'Bloom. Deal {damage} (+{damage_per} per Bloom) damage. Gain {block} Block.',
    effects: [
      { type: 'damage', amount: { base: 2, per: 1, scale: { cardVar: 'bloom' } }, target: 'target' },
      { type: 'block', amount: 3 }
    ],
    upgrade: {
      effects: [
        { type: 'damage', amount: { base: 2, per: 2, scale: { cardVar: 'bloom' } }, target: 'target' },
        { type: 'block', amount: 3 }
      ]
    },
    tags: [ 'gardener', 'blight', 'bloom', 'block' ],
    icon: 'card_chitin_ram'
  },
  {
    id: 'hivestrike',
    name: 'Hivestrike',
    cls: 'graft',
    type: 'attack',
    rarity: 'common',
    cost: 1,
    target: 'enemy',
    keywords: [],
    text: 'Deal {damage} damage, {damage_per} per Bloom card in your deck.',
    effects: [ { type: 'damage', amount: { base: 3, per: 1, scale: 'bloom_cards_in_deck' }, target: 'target' } ],
    upgrade: {
      effects: [ { type: 'damage', amount: { base: 6, per: 1, scale: 'bloom_cards_in_deck' }, target: 'target' } ]
    },
    tags: [ 'mass', 'gardener', 'scaling' ],
    icon: 'card_hivestrike'
  },
  {
    id: 'shear',
    name: 'Shear',
    cls: 'graft',
    type: 'attack',
    rarity: 'common',
    cost: 1,
    target: 'enemy',
    keywords: [],
    text: 'Deal {damage} damage. Prune. If you Scrapped an Attack, +{bonus_bloom} Bloom.',
    effects: [
      { type: 'damage', amount: 3, target: 'target' },
      { type: 'prune', bloom: 1, variant: 'standard', bonusIf: { type: 'attack', bloom: SHEAR.bonus_bloom } }
    ],
    upgrade: {
      effects: [
        { type: 'damage', amount: 6, target: 'target' },
        { type: 'prune', bloom: 1, variant: 'standard', bonusIf: { type: 'attack', bloom: SHEAR.bonus_bloom } }
      ]
    },
    tags: [ 'compost', 'gardener', 'prune' ],
    icon: 'card_shear',
    values: SHEAR
  },
  {
    id: 'spore_lash',
    name: 'Spore Lash',
    cls: 'graft',
    type: 'attack',
    rarity: 'common',
    cost: 1,
    target: 'enemy',
    keywords: [],
    text: 'Deal {damage} damage. Apply {rot} Rot.',
    effects: [
      { type: 'damage', amount: 3, target: 'target' },
      { type: 'status', target: 'target', id: 'rot', amount: 1, key: 'rot' }
    ],
    upgrade: {
      effects: [
        { type: 'damage', amount: 3, target: 'target' },
        { type: 'status', target: 'target', id: 'rot', amount: 2, key: 'rot' }
      ]
    },
    tags: [ 'blight', 'cheap' ],
    icon: 'card_spore_lash'
  },
  {
    id: 'canker_bite',
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
        amount: { base: 3, per: 1, scale: { status: 'rot', of: 'target' } },
        target: 'target'
      }
    ],
    upgrade: {
      effects: [
        {
          type: 'damage',
          amount: { base: 6, per: 1, scale: { status: 'rot', of: 'target' } },
          target: 'target'
        }
      ]
    },
    tags: [ 'blight', 'scaling' ],
    icon: 'card_canker_bite'
  },
  {
    id: 'mulch_maul',
    name: 'Mulch Maul',
    cls: 'graft',
    type: 'attack',
    rarity: 'common',
    cost: 1,
    target: 'enemy',
    keywords: [],
    text: 'Deal {damage} damage, {damage_per} per card in your Scrapheap.',
    effects: [ { type: 'damage', amount: { base: 4, per: 1, scale: 'cards_in_exhaust' }, target: 'target' } ],
    upgrade: {
      effects: [ { type: 'damage', amount: { base: 7, per: 1, scale: 'cards_in_exhaust' }, target: 'target' } ]
    },
    tags: [ 'compost', 'scaling' ],
    icon: 'card_mulch_maul'
  },
  {
    id: 'sap_shell',
    name: 'Sap Shell',
    cls: 'graft',
    type: 'skill',
    rarity: 'common',
    cost: 1,
    target: 'self',
    keywords: [ 'bloom' ],
    text: 'Bloom. Gain {block} (+{block_per} per Bloom) Block.',
    effects: [ { type: 'block', amount: { base: 4, per: 1, scale: { cardVar: 'bloom' } } } ],
    upgrade: {
      effects: [ { type: 'block', amount: { base: 4, per: 2, scale: { cardVar: 'bloom' } } } ]
    },
    tags: [ 'gardener', 'blight', 'bloom', 'block' ],
    icon: 'card_sap_shell'
  },
  {
    id: 'blightcap',
    name: 'Blightcap',
    cls: 'graft',
    type: 'skill',
    rarity: 'common',
    cost: 2,
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
    tags: [ 'gardener', 'blight', 'bloom', 'scaling' ],
    icon: 'card_blightcap'
  },
  {
    id: 'tendril_reach',
    name: 'Tendril Reach',
    cls: 'graft',
    type: 'skill',
    rarity: 'common',
    cost: 1,
    target: 'self',
    keywords: [ 'bloom' ],
    text: 'Bloom. Gain {block} (+{block_per} per Bloom) Block. Draw {draw} card.',
    effects: [ { type: 'block', amount: { base: 2, per: 1, scale: { cardVar: 'bloom' } } }, { type: 'draw', n: 1 } ],
    upgrade: {
      effects: [
        { type: 'block', amount: { base: 2, per: 2, scale: { cardVar: 'bloom' } } },
        { type: 'draw', n: 1 }
      ]
    },
    tags: [ 'gardener', 'mass', 'bloom', 'draw', 'block' ],
    icon: 'card_tendril_reach'
  },
  {
    id: 'root_mesh',
    name: 'Root Mesh',
    cls: 'graft',
    type: 'skill',
    rarity: 'common',
    cost: 1,
    target: 'self',
    keywords: [],
    text: 'Gain {block} Block, {block_per} per Bloom card in your deck.',
    effects: [ { type: 'block', amount: { base: 2, per: 1, scale: 'bloom_cards_in_deck' } } ],
    upgrade: { effects: [ { type: 'block', amount: { base: 5, per: 1, scale: 'bloom_cards_in_deck' } } ] },
    tags: [ 'mass', 'blight', 'block', 'scaling' ],
    icon: 'card_root_mesh'
  },
  {
    id: 'deep_graft',
    name: 'Deep Graft',
    cls: 'graft',
    type: 'skill',
    rarity: 'common',
    cost: 1,
    target: 'self',
    keywords: [],
    text: 'Gain {block} Block. Prune {prune}.',
    effects: [ { type: 'block', amount: 2 }, { type: 'prune', bloom: 2, variant: 'standard' } ],
    upgrade: { effects: [ { type: 'block', amount: 5 }, { type: 'prune', bloom: 2, variant: 'standard' } ] },
    tags: [ 'gardener', 'compost', 'prune', 'block' ],
    icon: 'card_deep_graft'
  },
  {
    id: 'windblown_seed',
    name: 'Windblown Seed',
    cls: 'graft',
    type: 'skill',
    rarity: 'common',
    cost: 1,
    target: 'self',
    keywords: [],
    text: 'Gain {block} Block. Wild Prune.',
    effects: [ { type: 'block', amount: 3 }, { type: 'prune', bloom: 1, variant: 'wild' } ],
    upgrade: { effects: [ { type: 'block', amount: 6 }, { type: 'prune', bloom: 1, variant: 'wild' } ] },
    tags: [ 'gardener', 'mass', 'prune', 'block' ],
    icon: 'card_windblown_seed'
  },
  {
    id: 'spore_haze',
    name: 'Spore Haze',
    cls: 'graft',
    type: 'skill',
    rarity: 'common',
    cost: 1,
    target: 'all_enemies',
    keywords: [ 'exhaust' ],
    text: 'Apply {rot} Rot to ALL enemies. Scrap.',
    effects: [ { type: 'status', target: 'all_enemies', id: 'rot', amount: 2, key: 'rot' } ],
    upgrade: { effects: [ { type: 'status', target: 'all_enemies', id: 'rot', amount: 3, key: 'rot' } ] },
    tags: [ 'blight', 'compost', 'aoe' ],
    icon: 'card_spore_haze'
  },
  {
    id: 'mire_carapace',
    name: 'Mire Carapace',
    cls: 'graft',
    type: 'skill',
    rarity: 'common',
    cost: 1,
    target: 'enemy',
    keywords: [],
    text: 'Gain {block} Block. If the enemy has Rot, gain {block2} more.',
    effects: [
      { type: 'block', amount: 4 },
      {
        type: 'conditional',
        if: { type: 'has_status', who: 'target', id: 'rot', min: 1 },
        then: [ { type: 'block', amount: 4 } ]
      }
    ],
    upgrade: {
      effects: [
        { type: 'block', amount: 6 },
        {
          type: 'conditional',
          if: { type: 'has_status', who: 'target', id: 'rot', min: 1 },
          then: [ { type: 'block', amount: 4 } ]
        }
      ]
    },
    tags: [ 'blight', 'block' ],
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
    name: 'Shed Husk',
    cls: 'graft',
    type: 'skill',
    rarity: 'common',
    cost: 1,
    target: 'self',
    keywords: [],
    text: 'Gain {block} Block. Prune. If you Scrapped a Status or Curse, draw {draw} cards.',
    effects: [
      { type: 'block', amount: 3 },
      { type: 'custom', fn: 'remember_prunes' },
      { type: 'prune', bloom: 1, variant: 'standard' },
      {
        type: 'conditional',
        if: {
          type: 'all',
          conds: [ { type: 'fn', fn: 'pruned_this_play' }, { type: 'pruned_type', cardType: ['status', 'curse'] } ]
        },
        then: [ { type: 'draw', n: 2 } ]
      }
    ],
    upgrade: {
      effects: [
        { type: 'block', amount: 6 },
        { type: 'custom', fn: 'remember_prunes' },
        { type: 'prune', bloom: 1, variant: 'standard' },
        {
          type: 'conditional',
          if: {
            type: 'all',
            conds: [ { type: 'fn', fn: 'pruned_this_play' }, { type: 'pruned_type', cardType: ['status', 'curse'] } ]
          },
          then: [ { type: 'draw', n: 2 } ]
        }
      ]
    },
    tags: [ 'compost', 'gardener', 'prune', 'block', 'draw' ],
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
    tags: [ 'gardener', 'bloom', 'draw', 'cheap' ],
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
    tags: [ 'blight', 'compost', 'prune', 'aoe' ],
    icon: 'card_leaf_litter'
  },
  {
    id: 'twin_thorn',
    name: 'Twin Thorn',
    cls: 'graft',
    type: 'attack',
    rarity: 'uncommon',
    cost: 2,
    target: 'enemy',
    keywords: [ 'bloom' ],
    text: 'Bloom. Deal {damage} (+{damage_per} per Bloom) damage twice.',
    effects: [
      {
        type: 'damage',
        amount: { base: 5, per: 2, scale: { cardVar: 'bloom' } },
        times: 2,
        target: 'target'
      }
    ],
    upgrade: {
      effects: [
        {
          type: 'damage',
          amount: { base: 5, per: 3, scale: { cardVar: 'bloom' } },
          times: 2,
          target: 'target'
        }
      ]
    },
    tags: [ 'gardener', 'bloom', 'scaling', 'multihit' ],
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
    text: 'Deal {damage} damage, {damage_per} per Bloom in your deck.',
    effects: [ { type: 'damage', amount: { base: 4, per: 1, scale: 'bloom_total_in_deck' }, target: 'target' } ],
    upgrade: {
      effects: [ { type: 'damage', amount: { base: 9, per: 1, scale: 'bloom_total_in_deck' }, target: 'target' } ]
    },
    tags: [ 'mass', 'gardener', 'scaling' ],
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
      { type: 'damage', amount: { base: 4, per: 1, scale: { cardVar: 'bloom' } }, target: 'all_enemies' },
      { type: 'status', target: 'all_enemies', id: 'rot', amount: 2, key: 'rot' }
    ],
    upgrade: {
      effects: [
        { type: 'damage', amount: { base: 4, per: 2, scale: { cardVar: 'bloom' } }, target: 'all_enemies' },
        { type: 'status', target: 'all_enemies', id: 'rot', amount: 2, key: 'rot' }
      ]
    },
    tags: [ 'blight', 'gardener', 'bloom', 'aoe' ],
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
    tags: [ 'compost', 'gardener', 'prune', 'removal' ],
    icon: 'card_uproot'
  },
  {
    id: 'prism_thorn',
    name: 'Prism Thorn',
    cls: 'graft',
    type: 'attack',
    rarity: 'uncommon',
    cost: 1,
    target: 'enemy',
    keywords: [],
    text: 'Deal {damage} damage, {damage_per} per Shard you have.',
    effects: [ { type: 'damage', amount: { base: 5, per: 2, scale: 'shards' }, target: 'target' } ],
    upgrade: { effects: [ { type: 'damage', amount: { base: 5, per: 3, scale: 'shards' }, target: 'target' } ] },
    tags: [ 'compost', 'shards', 'scaling' ],
    icon: 'card_prism_thorn'
  },
  {
    id: 'pollen_sting',
    name: 'Pollen Sting',
    cls: 'graft',
    type: 'attack',
    rarity: 'uncommon',
    cost: 1,
    target: 'enemy',
    keywords: [ 'bloom' ],
    text: 'Bloom. Deal {damage} (+{damage_per} per Bloom) damage. Choose a Bloom card in your hand; it gains {bloom} Bloom.',
    effects: [
      { type: 'damage', amount: { base: 3, per: 1, scale: { cardVar: 'bloom' } }, target: 'target' },
      { type: 'bloom', amount: 1, target: 'choose_hand', key: 'bloom' }
    ],
    upgrade: {
      effects: [
        { type: 'damage', amount: { base: 3, per: 2, scale: { cardVar: 'bloom' } }, target: 'target' },
        { type: 'bloom', amount: 1, target: 'choose_hand', key: 'bloom' }
      ]
    },
    tags: [ 'gardener', 'bloom' ],
    icon: 'card_pollen_sting'
  },
  {
    id: 'thicket_crash',
    name: 'Thicket Crash',
    cls: 'graft',
    type: 'attack',
    rarity: 'uncommon',
    cost: 3,
    target: 'all_enemies',
    keywords: [],
    text: 'Deal damage to ALL enemies equal to the number of cards in your deck ({damage}).',
    effects: [ { type: 'damage', amount: { base: 0, per: 1, scale: 'deck_size' }, target: 'all_enemies' } ],
    upgrade: { cost: 2 },
    tags: [ 'mass', 'aoe', 'scaling' ],
    icon: 'card_thicket_crash'
  },
  {
    id: 'patient_thorn',
    name: 'Patient Thorn',
    cls: 'graft',
    type: 'attack',
    rarity: 'uncommon',
    cost: 1,
    target: 'enemy',
    keywords: [ 'bloom', 'retain' ],
    text: 'Bloom. Keep. Deal {damage} (+{damage_per} per Bloom) damage.',
    effects: [ { type: 'damage', amount: { base: 4, per: 2, scale: { cardVar: 'bloom' } }, target: 'target' } ],
    upgrade: {
      effects: [ { type: 'damage', amount: { base: 4, per: 3, scale: { cardVar: 'bloom' } }, target: 'target' } ]
    },
    tags: [ 'gardener', 'bloom', 'scaling' ],
    icon: 'card_patient_thorn'
  },
  {
    id: 'burl_wall',
    name: 'Burl Wall',
    cls: 'graft',
    type: 'skill',
    rarity: 'uncommon',
    cost: 2,
    target: 'self',
    keywords: [ 'bloom' ],
    text: 'Bloom. Gain {block} (+{block_per} per Bloom) Block.',
    effects: [ { type: 'block', amount: { base: 8, per: 3, scale: { cardVar: 'bloom' } } } ],
    upgrade: {
      effects: [ { type: 'block', amount: { base: 8, per: 4, scale: { cardVar: 'bloom' } } } ]
    },
    tags: [ 'gardener', 'blight', 'bloom', 'block' ],
    icon: 'card_burl_wall'
  },
  {
    id: 'choking_spores',
    name: 'Choking Spores',
    cls: 'graft',
    type: 'skill',
    rarity: 'uncommon',
    cost: 1,
    target: 'all_enemies',
    keywords: [],
    text: 'Apply {stagger} Stagger and {rot} Rot to ALL enemies.',
    effects: [
      { type: 'status', target: 'all_enemies', id: 'stagger', amount: 1, key: 'stagger' },
      { type: 'status', target: 'all_enemies', id: 'rot', amount: 1, key: 'rot' }
    ],
    upgrade: {
      effects: [
        { type: 'status', target: 'all_enemies', id: 'stagger', amount: 2, key: 'stagger' },
        { type: 'status', target: 'all_enemies', id: 'rot', amount: 1, key: 'rot' }
      ]
    },
    tags: [ 'blight', 'aoe', 'debuff', 'block' ],
    icon: 'card_choking_spores'
  },
  {
    id: 'excise',
    name: 'Excise',
    cls: 'graft',
    type: 'skill',
    rarity: 'uncommon',
    cost: 1,
    target: 'none',
    keywords: [ 'exhaust' ],
    text: 'Prune away. Scrap.',
    effects: [ { type: 'prune', bloom: 1, variant: 'away' } ],
    upgrade: {
      text: 'Prune away. Draw {draw} card. Scrap.',
      effects: [ { type: 'prune', bloom: 1, variant: 'away' }, { type: 'draw', n: 1 } ]
    },
    tags: [ 'compost', 'prune', 'removal' ],
    icon: 'card_excise'
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
              effects: [{ type: 'add_card' as const, card: card.id, to: 'deck' as const, upgraded: upgradeCopy || card.upgraded }],
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
    text: 'Choose a Bloom card in your hand. Add a copy of it to your deck. Scrap.',
    effects: [ { type: 'custom', fn: 'propagate_bloom' } ],
    upgrade: {
      text: 'Choose a Bloom card in your hand. Add an upgraded copy of it to your deck. Scrap.',
      effects: [ { type: 'custom', fn: 'propagate_bloom' } ]
    },
    tags: [ 'mass', 'gardener', 'bloom' ],
    icon: 'card_propagate'
  },
  {
    id: 'seed_rain',
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
    tags: [ 'gardener', 'mass', 'prune', 'block' ],
    icon: 'card_seed_rain'
  },
  {
    id: 'puffball',
    name: 'Puffball',
    cls: 'graft',
    type: 'skill',
    rarity: 'uncommon',
    cost: 1,
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
    tags: [ 'gardener', 'blight', 'bloom', 'aoe' ],
    icon: 'card_puffball'
  },
  {
    id: 'sporeburst',
    name: 'Sporeburst',
    cls: 'graft',
    type: 'skill',
    rarity: 'uncommon',
    cost: 1,
    target: 'enemy',
    keywords: [],
    text: 'The enemy loses HP equal to its Rot ({lose_hp}). Then it gains {rot} Rot.',
    effects: [
      {
        type: 'lose_hp',
        amount: { base: 0, per: 1, scale: { status: 'rot', of: 'target' } },
        target: 'target'
      },
      { type: 'status', target: 'target', id: 'rot', amount: 1, key: 'rot' }
    ],
    upgrade: {
      effects: [
        {
          type: 'lose_hp',
          amount: { base: 0, per: 1, scale: { status: 'rot', of: 'target' } },
          target: 'target'
        },
        { type: 'status', target: 'target', id: 'rot', amount: 2, key: 'rot' }
      ]
    },
    tags: [ 'blight', 'scaling' ],
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
    effects: [ { type: 'status', target: 'self', id: 'decomposer', amount: 1 } ],
    upgrade: { cost: 0 },
    tags: [ 'compost', 'blight', 'prune', 'power' ],
    icon: 'card_decomposer'
  },
  {
    id: 'dusk_pruning',
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
    tags: [ 'gardener', 'compost', 'prune', 'power' ],
    icon: 'card_dusk_pruning'
  },
  {
    id: 'living_hedge',
    name: 'Living Hedge',
    cls: 'graft',
    type: 'power',
    rarity: 'uncommon',
    cost: 2,
    target: 'self',
    keywords: [],
    text: 'At the start of your turn, gain {status} Block per Bloom card in your deck.',
    effects: [ { type: 'status', target: 'self', id: 'living_hedge', amount: 1 } ],
    upgrade: { cost: 1 },
    tags: [ 'mass', 'blight', 'block', 'power', 'scaling' ],
    icon: 'card_living_hedge'
  },
  {
    id: 'thorn_halo',
    name: 'Thorn Halo',
    cls: 'graft',
    type: 'power',
    rarity: 'uncommon',
    cost: 2,
    target: 'self',
    keywords: [ 'bloom' ],
    text: 'Bloom. At the start of your turn, deal {status} (+{status_per} per Bloom) damage to a random enemy.',
    effects: [
      {
        type: 'status',
        target: 'self',
        id: 'thorn_halo',
        amount: { base: 3, per: 1, scale: { cardVar: 'bloom' } }
      }
    ],
    upgrade: {
      effects: [
        {
          type: 'status',
          target: 'self',
          id: 'thorn_halo',
          amount: { base: 3, per: 2, scale: { cardVar: 'bloom' } }
        }
      ]
    },
    tags: [ 'gardener', 'bloom', 'power', 'scaling' ],
    icon: 'card_thorn_halo'
  },
  {
    id: 'ripening_rot',
    name: 'Ripening Rot',
    cls: 'graft',
    type: 'power',
    rarity: 'uncommon',
    cost: 1,
    target: 'self',
    keywords: [],
    text: 'At the start of your turn, each enemy with Rot gains {status} Rot.',
    effects: [ { type: 'status', target: 'self', id: 'ripening_rot', amount: 1 } ],
    upgrade: { cost: 0 },
    tags: [ 'blight', 'power', 'scaling' ],
    icon: 'card_ripening_rot'
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
    text: 'Bloom. Deal {damage} (+{damage_per} per Bloom) damage.',
    effects: [ { type: 'damage', amount: { base: 10, per: 5, scale: { cardVar: 'bloom' } }, target: 'target' } ],
    upgrade: {
      effects: [ { type: 'damage', amount: { base: 10, per: 6, scale: { cardVar: 'bloom' } }, target: 'target' } ]
    },
    tags: [ 'gardener', 'bloom', 'scaling' ],
    icon: 'card_heartwood_spear'
  },
  {
    id: 'death_cap',
    name: 'Death Cap',
    cls: 'graft',
    type: 'attack',
    rarity: 'rare',
    cost: 2,
    target: 'enemy',
    keywords: [ 'exhaust' ],
    text: 'Deal {damage} damage. If the enemy has Rot, apply {rot} Rot. Scrap.',
    effects: [
      { type: 'damage', amount: 8, target: 'target' },
      {
        type: 'conditional',
        if: { type: 'has_status', who: 'target', id: 'rot', min: 1 },
        then: [ { type: 'status', target: 'target', id: 'rot', amount: 15, key: 'rot' } ]
      }
    ],
    upgrade: {
      effects: [
        { type: 'damage', amount: 12, target: 'target' },
        {
          type: 'conditional',
          if: { type: 'has_status', who: 'target', id: 'rot', min: 1 },
          then: [ { type: 'status', target: 'target', id: 'rot', amount: 15, key: 'rot' } ]
        }
      ]
    },
    tags: [ 'blight', 'scaling' ],
    icon: 'card_death_cap'
  },
  {
    id: 'reaping_vine',
    amounts: {
      prunes_this_combat: (ctx) => requireCombat(ctx).counters.prunes ?? 0,
    },
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
      { type: 'damage', amount: 4, times: { scale: { fn: 'prunes_this_combat' } }, target: 'target' }
    ],
    upgrade: {
      effects: [
        { type: 'prune', bloom: 1, variant: 'standard' },
        { type: 'damage', amount: 5, times: { scale: { fn: 'prunes_this_combat' } }, target: 'target' }
      ]
    },
    tags: [ 'compost', 'prune', 'scaling', 'multihit' ],
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
    text: 'Deal {damage} damage once for each Bloom card in your deck ({times}).',
    effects: [
      {
        type: 'damage',
        amount: 3,
        times: { base: 0, per: 1, scale: 'bloom_cards_in_deck' },
        target: 'target'
      }
    ],
    upgrade: {
      effects: [
        {
          type: 'damage',
          amount: 4,
          times: { base: 0, per: 1, scale: 'bloom_cards_in_deck' },
          target: 'target'
        }
      ]
    },
    tags: [ 'mass', 'scaling', 'multihit' ],
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
    tags: [ 'compost', 'gardener', 'bloom' ],
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
    tags: [ 'gardener', 'compost', 'shards', 'bloom' ],
    icon: 'card_crystal_graft'
  },
  {
    id: 'transplant',
    hooks: {
      canPlay: ({ combat }) => (combat?.hand.filter(isBloom).length ?? 0) >= 2
        ? true : 'Needs two Bloom cards',
    },
    custom: {
      transplant_bloom: (ctx) => {
        const combat = requireCombat(ctx);
        ctx.queue([{
          type: 'choose', prompt: 'Choose a Bloom card to move Bloom from.',
          options: combat.hand.flatMap((card, slot) => {
            if (!isBloom(card)) return [];
            const def = GRAFT_CARDS.find((candidate) => candidate.id === card.id);
            if (!def) throw new Error('Unknown Graft Bloom card');
            return [{
              label: def.name + (card.upgraded ? '+' : '') + ' — hand position ' + (slot + 1),
              effects: [{ type: 'custom' as const, fn: 'transplant_source_' + slot }],
            }];
          }),
        }]);
      },
      ...transplantSources,
    },
    name: 'Transplant',
    cls: 'graft',
    type: 'skill',
    rarity: 'rare',
    cost: 0,
    target: 'self',
    keywords: [ 'exhaust' ],
    text: 'Choose two Bloom cards in your hand. Move all Bloom from the first to the second, plus {n}. Scrap.',
    values: TRANSPLANT_BONUS,
    effects: [ { type: 'custom', fn: 'transplant_bloom' } ],
    upgrade: {
      text: 'Choose two Bloom cards in your hand. Move all Bloom from the first to the second, plus {n_up}. Scrap.'
    },
    tags: [ 'gardener', 'bloom' ],
    icon: 'card_transplant'
  },
  {
    id: 'chitin_cocoon',
    name: 'Chitin Cocoon',
    cls: 'graft',
    type: 'skill',
    rarity: 'rare',
    cost: 1,
    target: 'self',
    keywords: [ 'bloom' ],
    text: 'Bloom. Gain {block} (+{block_per} per Bloom) Block.',
    effects: [ { type: 'block', amount: { base: 4, per: 2, scale: { cardVar: 'bloom' } } } ],
    upgrade: {
      effects: [ { type: 'block', amount: { base: 4, per: 3, scale: { cardVar: 'bloom' } } } ]
    },
    tags: [ 'blight', 'gardener', 'bloom', 'block' ],
    icon: 'card_chitin_cocoon'
  },
  {
    id: 'quickening_sap',
    name: 'Quickening Sap',
    cls: 'graft',
    type: 'power',
    rarity: 'rare',
    cost: 2,
    target: 'self',
    keywords: [],
    text: 'Whenever a card in your hand gains Bloom, it costs {free_cost} this turn.',
    effects: [ { type: 'status', target: 'self', id: 'quickening_sap', amount: 1 } ],
    upgrade: { cost: 1 },
    tags: [ 'gardener', 'bloom', 'power', 'energy' ],
    icon: 'card_quickening_sap',
    values: QUICKENING
  },
  {
    id: 'fungal_aegis',
    name: 'Fungal Aegis',
    cls: 'graft',
    type: 'power',
    rarity: 'rare',
    cost: 2,
    target: 'self',
    keywords: [],
    text: 'At the start of your turn, gain Block equal to the highest Rot among enemies.',
    effects: [ { type: 'status', target: 'self', id: 'fungal_aegis', amount: 1 } ],
    upgrade: { cost: 1 },
    tags: [ 'blight', 'block', 'power', 'scaling' ],
    icon: 'card_fungal_aegis'
  },
  {
    id: 'thresher',
    name: 'Thresher',
    cls: 'graft',
    type: 'power',
    rarity: 'rare',
    cost: 2,
    target: 'self',
    keywords: [ 'bloom' ],
    text: 'Bloom. Whenever you Prune, deal {status} (+{status_per} per Bloom) damage to ALL enemies.',
    effects: [
      {
        type: 'status',
        target: 'self',
        id: 'thresher',
        amount: { base: 3, per: 1, scale: { cardVar: 'bloom' } }
      }
    ],
    upgrade: {
      effects: [
        {
          type: 'status',
          target: 'self',
          id: 'thresher',
          amount: { base: 3, per: 2, scale: { cardVar: 'bloom' } }
        }
      ]
    },
    tags: [ 'compost', 'gardener', 'bloom', 'prune', 'power', 'aoe' ],
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
    tags: [ 'mass', 'draw', 'power' ],
    icon: 'card_hyphal_web',
    values: HYPHAL
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
    text: 'At the start of your turn, gain {block_per} Block per Bloom card in your deck ({stacks}×).',
    triggers: {
      onTurnStart: [
        {
          type: 'repeat',
          times: { scale: 'stacks' },
          effects: [ { type: 'block', amount: { base: 0, per: 1, scale: 'bloom_cards_in_deck' } } ]
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
    id: 'quickening_sap',
    // The custom DSL context does not carry hook info; use the typed event hook
    // directly so only the copy that actually gained Bloom becomes free.
    hooks: {
      onBloomGained: (ctx, info) => {
        if (info.delta <= 0) return;
        const card = requireCombat(ctx).hand.find((candidate) => candidate.uid === info.card.uid);
        if (card) card.tempCost = QUICKENING.free_cost;
      },
    },
    stacks: 'flag',
    decay: 'never',
    tick: 'never',
    isDebuff: false,
    text: 'Whenever a card in your hand gains Bloom, it costs {free_cost} this turn.',
    name: 'Quickening Sap',
    icon: 'status_quickening_sap',
    values: QUICKENING
  },
  {
    id: 'fungal_aegis',
    amounts: {
      max_enemy_rot: (ctx) => Math.max(0, ...requireCombat(ctx).enemies
        .filter((enemy) => enemy.alive).map((enemy) => enemy.statuses.rot ?? 0)),
    },
    stacks: 'amount',
    decay: 'never',
    tick: 'never',
    isDebuff: false,
    text: 'At the start of your turn, gain Block equal to the highest Rot among enemies ({stacks}×).',
    triggers: {
      onTurnStart: [
        {
          type: 'repeat',
          times: { scale: 'stacks' },
          effects: [ { type: 'block', amount: { scale: { fn: 'max_enemy_rot' } } } ]
        }
      ]
    },
    name: 'Fungal Aegis',
    icon: 'status_fungal_aegis'
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
  }
];
