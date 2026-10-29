// TEST PACK colourless cards (engine tests only). Not real game content.
import type { CardDef } from '../../../engine/types';

export const TEST_COLORLESS_CARDS: CardDef[] = [
  { id: 'test_flash', name: 'Test Flash', cls: 'colorless', type: 'skill', rarity: 'uncommon', cost: 0, target: 'none',
    keywords: ['exhaust'], text: 'Draw {draw} card. Exhaust.', effects: [{ type: 'draw', n: 1 }],
    upgrade: { text: 'Draw {draw} cards. Exhaust.', effects: [{ type: 'draw', n: 2 }] }, icon: 'card_flash' },
  { id: 'test_bolt', name: 'Test Bolt', cls: 'colorless', type: 'attack', rarity: 'rare', cost: 0, target: 'enemy',
    keywords: ['exhaust'], text: 'Deal {damage} damage. Exhaust.', effects: [{ type: 'damage', amount: 7, target: 'target' }],
    upgrade: { effects: [{ type: 'damage', amount: 10, target: 'target' }] }, icon: 'card_bolt' },
];
