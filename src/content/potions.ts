// REAL CONTENT: the 16 potions of docs/GDD.md §7.1. Combat-only unless marked "anywhere"
// (combatOnly: false, target 'none'). Class potions set `cls` and only drop for that class.
import type { PotionDef, StatusDef } from '../engine/types';

const TEMPO = { beat: 1 };
const MENDING = { pct: 25 };
const REWIND = { cost: 0 };

export const POTIONS: PotionDef[] = [
  // --- common
  {
    id: 'pot_flare_cell', name: 'Flare Cell', rarity: 'common', target: 'enemy', combatOnly: true,
    text: 'Deal {damage} damage.', effects: [{ type: 'damage', amount: 20, target: 'target' }], icon: 'potion_flare_cell',
  },
  {
    id: 'pot_shield_gel', name: 'Shield Gel', rarity: 'common', target: 'none', combatOnly: true,
    text: 'Gain {block} Block.', effects: [{ type: 'block', amount: 12 }], icon: 'potion_shield_gel',
  },
  {
    id: 'pot_bastion_tonic', name: 'Bastion Tonic', rarity: 'common', target: 'none', combatOnly: true,
    text: 'Gain {guard} Guard.', effects: [{ type: 'guard', amount: 10 }], icon: 'potion_bastion_tonic',
  },
  {
    id: 'pot_quicksilver', name: 'Quicksilver', rarity: 'common', target: 'none', combatOnly: true,
    text: 'Draw {draw} cards.', effects: [{ type: 'draw', n: 3 }], icon: 'potion_quicksilver',
  },
  {
    id: 'pot_charge_cell', name: 'Charge Cell', rarity: 'common', target: 'none', combatOnly: true,
    text: 'Gain {energy} energy.', effects: [{ type: 'energy', n: 2 }], icon: 'potion_charge_cell',
  },
  {
    id: 'pot_fault_dust', name: 'Fault Dust', rarity: 'common', target: 'none', combatOnly: true,
    text: 'Apply {status} Exposed to ALL enemies.', effects: [{ type: 'status', target: 'all_enemies', id: 'exposed', amount: 3 }], icon: 'potion_fault_dust',
  },
  {
    id: 'pot_concussion_gas', name: 'Concussion Gas', rarity: 'common', target: 'none', combatOnly: true,
    text: 'Apply {status} Stagger to ALL enemies.', effects: [{ type: 'status', target: 'all_enemies', id: 'stagger', amount: 3 }], icon: 'potion_concussion_gas',
  },
  {
    id: 'pot_shard_tincture', name: 'Shard Tincture', rarity: 'common', target: 'none', combatOnly: false,
    text: 'Gain {shards} Shard.', effects: [{ type: 'shards', amount: 1 }], icon: 'potion_shard_tincture',
  },
  // --- uncommon
  {
    id: 'pot_blight_vial', name: 'Blight Vial', rarity: 'uncommon', target: 'enemy', combatOnly: true,
    text: 'Apply {status} Rot.', effects: [{ type: 'status', target: 'target', id: 'rot', amount: 6 }], icon: 'potion_blight_vial',
  },
  {
    id: 'pot_seers_draught', name: "Seer's Draught", rarity: 'uncommon', target: 'none', combatOnly: true,
    text: 'Gain Augury this combat. Draw {draw} cards.',
    effects: [{ type: 'status', target: 'self', id: 'augury', amount: 1 }, { type: 'draw', n: 2 }], icon: 'potion_seers_draught',
  },
  {
    id: 'pot_fury_draught', name: 'Fury Draught', rarity: 'uncommon', cls: 'breaker', target: 'none', combatOnly: true,
    text: 'Gain {status} Onslaught.', effects: [{ type: 'status', target: 'self', id: 'onslaught', amount: 4 }], icon: 'potion_fury_draught',
  },
  {
    id: 'pot_growth_sap', name: 'Growth Sap', rarity: 'uncommon', cls: 'graft', target: 'none', combatOnly: true,
    text: 'Choose a Bloom card in your hand. It gains {bloom} Bloom (permanently).',
    effects: [{ type: 'bloom', amount: 2, target: 'choose_hand' }], icon: 'potion_growth_sap',
  },
  {
    // GDD §2.7: the beat count is cardsPlayedThisTurn + combat.counters.beatOffset (engine-owned key).
    id: 'pot_tempo_draught', name: 'Tempo Draught', rarity: 'uncommon', cls: 'chronist', target: 'none', combatOnly: true, values: TEMPO,
    text: 'Advance the beat by {beat}: the next card you play this turn counts one position later.',
    effects: [{ type: 'custom', fn: 'advance_beat' }],
    custom: {
      advance_beat: (c) => {
        const combat = c.combat;
        if (!combat) throw new Error('pot_tempo_draught outside combat');
        combat.counters.beatOffset = (combat.counters.beatOffset ?? 0) + TEMPO.beat; // no offset yet this turn = 0
      },
    },
    icon: 'potion_tempo_draught',
  },
  // --- rare
  {
    id: 'pot_mending_ampoule', name: 'Mending Ampoule', rarity: 'rare', target: 'none', combatOnly: false, values: MENDING,
    text: 'Heal {pct}% of your Max HP.',
    effects: [{ type: 'heal', amount: { per: MENDING.pct / 100, scale: 'max_hp' } }], icon: 'potion_mending_ampoule',
  },
  {
    id: 'pot_rewind_phial', name: 'Rewind Phial', rarity: 'rare', target: 'none', combatOnly: true, values: REWIND,
    text: 'Put up to {fetch_card} cards from your discard pile into your hand. They cost {cost} this turn.',
    effects: [{ type: 'fetch_card', from: 'discard', select: 'choose', to: 'hand', n: 3, upTo: true, costThisTurn: REWIND.cost }],
    icon: 'potion_rewind_phial',
  },
  {
    id: 'pot_halt_ampoule', name: 'Halt Ampoule', rarity: 'rare', target: 'enemy', combatOnly: true,
    text: 'That enemy skips its next move. Bosses are immune.', effects: [{ type: 'halt_enemy', target: 'target' }], icon: 'potion_halt_ampoule',
  },
];

// Statuses this pack defines (Power statuses, one-turn effects, enemy passives). Registered by index.ts.
export const POTION_STATUSES: StatusDef[] = [];
