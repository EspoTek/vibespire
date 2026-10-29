// TEST PACK events (engine tests only). Not real game content.
import type { EventDef } from '../../engine/types';

export const TEST_EVENTS: EventDef[] = [
  {
    id: 'test_event_shrine',
    name: 'Test Shrine',
    acts: [1, 2, 3],
    text: 'A humming shrine.',
    options: [
      { label: 'Offer blood: lose {lose_hp} HP, gain {max_hp} Max HP.',
        effects: [{ type: 'lose_hp', amount: 5, target: 'self' }, { type: 'max_hp', amount: 3 }] },
      { label: 'Pray: gain {gold} gold.', effects: [{ type: 'gold', amount: 50 }] },
    ],
    icon: 'event_shrine',
  },
  {
    id: 'test_event_forge',
    name: 'Test Forge',
    acts: [1, 2, 3],
    text: 'An abandoned forge, still warm.',
    options: [
      { label: 'Upgrade a card.', effects: [{ type: 'upgrade', where: 'deck', choose: true }],
        available: (c) => (c.state.player.deck.some((card) => !card.upgraded) ? true : 'No card to upgrade.') },
      { label: 'Melt a card: remove a card from your deck.', effects: [{ type: 'remove_card', n: 1, choose: true }],
        available: (c) => (c.state.player.deck.length > 1 ? true : 'Your deck is too small.') },
    ],
    icon: 'event_forge',
  },
  {
    id: 'test_event_lever',
    name: 'Test Lever',
    acts: [1, 2, 3],
    text: 'A rusted lever and a sleeping guard.',
    options: [
      {
        label: 'Pull the lever ({gamble_1}% gold, {gamble_2}% hurt).',
        effects: [{ type: 'gamble', outcomes: [
          { weight: 60, label: 'Coins pour out.', effects: [{ type: 'gold', amount: 40 }] },
          { weight: 40, label: 'It snaps back.', effects: [{ type: 'lose_hp', amount: 4, target: 'self' }] },
        ] }],
        next: 'again',
      },
      { label: 'Wake the guard (fight; win a relic).', effects: [{ type: 'start_combat', encounterId: 'test_enc_event', onWin: [{ type: 'gain_relic', rarity: 'common' }] }] },
    ],
    pages: {
      again: {
        text: 'The lever creaks back up.',
        options: [
          { label: 'Pay {gold_abs} gold to pull again.', effects: [{ type: 'gold', amount: -10 }, { type: 'gold', amount: 25 }],
            available: (c) => (c.state.player.gold >= 10 ? true : 'Not enough gold.') },
          { label: 'Leave.', effects: [] },
        ],
      },
    },
    icon: 'event_lever',
  },
];
