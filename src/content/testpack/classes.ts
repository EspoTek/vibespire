// TEST PACK class (engine tests, sim smoke runs, renderer dev builds). Its starter deck shows every
// v2 zone: Riposte (primed rack), Delay (Timeline), Bloom + Prune, on-beat, Guard.
import type { ClassDef } from '../../engine/types';

export const TEST_CLASSES: ClassDef[] = [
  {
    id: 'test_class',
    name: 'Test Class',
    maxHp: 70,
    startingGold: 99,
    maxEnergy: 3,
    potionSlots: 3,
    startingDeck: [
      'test_strike', 'test_strike', 'test_strike', 'test_strike',
      'test_block', 'test_block',
      'test_brace', 'test_parry', 'test_tock', 'test_sprout', 'test_graft', 'test_beat',
    ],
    startingRelics: [],
    onslaughtFromAttacks: true,
    combatStartStatuses: { augury: 1 },
    icon: 'class_test',
  },
];
