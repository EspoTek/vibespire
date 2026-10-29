// TEST PACK Ascent Pacts (1 safe + 2 trade are offered).
import type { StartBoonDef } from '../../engine/types';

export const TEST_BOONS: StartBoonDef[] = [
  { id: 'test_boon_gold', list: 'safe', text: 'Gain {gold} gold.', effects: [{ type: 'gold', amount: 100 }] },
  { id: 'test_boon_maxhp', list: 'safe', text: 'Gain {max_hp} Max HP.', effects: [{ type: 'max_hp', amount: 8 }] },
  { id: 'test_boon_remove', list: 'trade', text: 'Remove a card from your deck.', effects: [{ type: 'remove_card', n: 1, choose: true }] },
  { id: 'test_boon_potion', list: 'trade', text: 'Obtain a random potion.', effects: [{ type: 'gain_potion' }] },
  { id: 'test_boon_relic', list: 'trade', text: 'Obtain a random common relic.', effects: [{ type: 'gain_relic', rarity: 'common' }] },
];
