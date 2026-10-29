// TEST PACK extra rest-site options (engine tests only). Not real game content.
import type { RestOptionDef } from '../../engine/types';

export const TEST_REST_OPTIONS: RestOptionDef[] = [
  {
    id: 'test_rest_trim',
    label: 'Trim',
    text: 'Remove a card from your deck.',
    effects: [{ type: 'remove_card', n: 1, choose: true }],
    available: (c) => (c.state.player.deck.length > 5 ? true : 'Your deck is too small.'),
  },
];
