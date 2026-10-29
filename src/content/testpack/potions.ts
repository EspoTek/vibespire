// TEST PACK potions (engine tests only). Not real game content.
import type { PotionDef } from '../../engine/types';

export const TEST_POTIONS: PotionDef[] = [
  { id: 'test_potion_fire', name: 'Test Fire Potion', rarity: 'common', target: 'enemy', combatOnly: true,
    text: 'Deal {damage} damage.', effects: [{ type: 'damage', amount: 20, target: 'target' }], icon: 'potion_fire' },
  { id: 'test_potion_heal', name: 'Test Heal Potion', rarity: 'common', target: 'none', combatOnly: false,
    text: 'Heal {heal} HP.', effects: [{ type: 'heal', amount: 10, target: 'self' }], icon: 'potion_heal' },
  { id: 'test_potion_halt', name: 'Test Halt Potion', rarity: 'uncommon', target: 'enemy', combatOnly: true,
    text: 'That enemy skips its next move (bosses are immune).', effects: [{ type: 'halt_enemy', target: 'target' }], icon: 'potion_halt' },
];
