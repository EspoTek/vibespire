// TEST PACK boss (engine tests only). Not real game content.
import type { EncounterDef, EnemyDef } from '../../../engine/types';

const CYCLE = ['roar', 'slam', 'flurry'] as const;

export const TEST_BOSSES: EnemyDef[] = [
  {
    id: 'test_boss',
    name: 'Test Boss',
    boss: true,
    hp: [80, 80],
    moves: {
      roar: {
        name: 'Roar',
        intent: 'debuff',
        effects: [
          { type: 'status', target: 'target', id: 'test_burning', amount: 3 },
          { type: 'add_card', card: 'test_burn', to: 'discard', n: 2 },
        ],
      },
      slam: { name: 'Slam', intent: 'attack', effects: [{ type: 'damage', amount: 14, target: 'target' }] },
      flurry: { name: 'Flurry', intent: 'attack', effects: [{ type: 'damage', amount: 4, times: 4, target: 'target' }] },
    },
    chooseMove: (c) => {
      const move = CYCLE[c.history.length % CYCLE.length];
      if (!move) throw new Error('test_boss: cycle index');
      return move;
    },
    icon: 'boss_test',
  },
];

export const TEST_BOSS_ENCOUNTERS: EncounterDef[] = [
  { id: 'test_enc_boss', name: 'Test Boss', acts: [1, 2, 3], pool: 'boss', enemies: ['test_boss'] },
];
