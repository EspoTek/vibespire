// TEST PACK status cards (engine tests only). Not real game content.
import type { CardDef } from '../../../engine/types';

const BURN_HP = 2;

export const TEST_STATUS_CARDS: CardDef[] = [
  { id: 'test_burn', name: 'Test Burn', cls: 'status', type: 'status', rarity: 'special', cost: null, target: 'none',
    keywords: ['unplayable'], values: { hp: BURN_HP },
    text: 'Unplayable. At the end of your turn, if this is in your hand, lose {hp} HP.', effects: [], upgrade: {},
    hooks: { onTurnEndInHand: (c) => c.queue([{ type: 'lose_hp', amount: BURN_HP, target: 'self' }]) },
    icon: 'card_burn' },
  { id: 'test_curse_bound', name: 'Test Burden', cls: 'curse', type: 'curse', rarity: 'special', cost: null, target: 'none',
    keywords: ['unplayable'], bound: true, text: 'Unplayable. Only Purge can remove this.', effects: [], upgrade: {}, icon: 'card_burden' },
];
