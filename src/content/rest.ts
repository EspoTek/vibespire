// REAL CONTENT: rest-site options beyond Rest and Smith (GDD §4.7). Shard prices are paid by the
// engine when the option is used (`shardCost`, adjusted by the restOptionCost modifier: Shard Loupe,
// Crystal Spine); with Shard Crucible these become side actions (restSideAction modifier).
import type { RestOptionDef } from '../engine/types';

export const REST_OPTIONS: RestOptionDef[] = [
  {
    id: 'rest_purge',
    label: 'Purge',
    text: 'Pay Shards: remove a card from your deck.',
    shardCost: 2,
    // Purge is the only removal that may take Bound cards (Burden).
    effects: [{ type: 'remove_card', n: 1, choose: true, allowBound: true }],
    available: (c) => (c.state.player.deck.length > 0 ? true : 'Your deck is empty.'),
  },
  {
    id: 'rest_transmute',
    label: 'Transmute',
    text: 'Pay a Shard: Transmute a card (choose 1 of 2 of the same rarity).',
    shardCost: 1,
    effects: [{ type: 'transmute', offers: 2 }],
    available: (c) => (c.state.player.deck.some((card) => card.id !== 'curse_burden') ? true : 'No card can be Transmuted.'),
  },
];
