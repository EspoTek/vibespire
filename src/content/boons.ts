// REAL CONTENT: Ascent Pacts (GDD §4.11). The run offers 1 safe + 2 trade.
// Registered in index.ts only once the class packs and curses exist (they are referenced here).
import type { StartBoonDef } from '../engine/types';

export const PACTS: StartBoonDef[] = [
  { id: 'pact_hardy', list: 'safe', text: 'Gain {max_hp} Max HP.', effects: [{ type: 'max_hp', amount: 8 }] },
  { id: 'pact_shards', list: 'safe', text: 'Start with {shards} Shards.', effects: [{ type: 'shards', amount: 2 }] },
  { id: 'pact_purse', list: 'safe', text: 'Gain {gold} gold.', effects: [{ type: 'gold', amount: 100 }] },
  {
    id: 'pact_blood_rare',
    list: 'trade',
    text: 'Lose {max_hp_abs} Max HP. Choose 1 of {offer_cards} rare cards from your class.',
    effects: [{ type: 'max_hp', amount: -7 }, { type: 'offer_cards', pool: 'class', rarity: 'rare', n: 3 }],
  },
  {
    id: 'pact_hunted',
    list: 'trade',
    text: 'Gain a random uncommon relic. The first elite you fight is Hunted (+25% Max HP; its hits deal +2 damage).',
    effects: [{ type: 'gain_relic', rarity: 'uncommon' }, { type: 'run_flag', key: 'hunted_pending', delta: 1 }],
  },
  {
    id: 'pact_lean_start',
    list: 'trade',
    text: 'Remove {remove_card} cards from your deck. Lose all your gold.',
    effects: [{ type: 'remove_card', n: 2, choose: true }, { type: 'gold', amount: { per: -1, scale: 'gold' } }],
  },
  {
    id: 'pact_reforged',
    list: 'trade',
    text: 'Transmute a card into an uncommon (choose 1 of 2) and upgrade it. Add a Seized Joint to your deck.',
    effects: [
      { type: 'transmute', offers: 2, rarity: 'uncommon', upgrade: true },
      { type: 'add_card', card: 'curse_seized_joint', to: 'deck' },
    ],
  },
  {
    id: 'pact_wanderer',
    list: 'trade',
    text: 'Choose 1 of {offer_cards} colourless cards. Your next {run_flag} card rewards offer 2 cards instead of 3.',
    effects: [{ type: 'offer_cards', pool: 'colorless', n: 3 }, { type: 'run_flag', key: 'lean_rewards', delta: 3 }],
  },
];
