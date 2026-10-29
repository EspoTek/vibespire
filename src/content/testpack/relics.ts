// TEST PACK relics (engine tests only, all `test_relic_*`). Not real game content.
import type { RelicDef } from '../../engine/types';

const COUNTER = { every: 3, block: 4 };

export const TEST_RELICS: RelicDef[] = [
  {
    id: 'test_relic_vial',
    name: 'Test Vial',
    rarity: 'common',
    text: 'At the start of each combat, heal {heal} HP.',
    triggers: { onCombatStart: [{ type: 'heal', amount: 2, target: 'self' }] },
    icon: 'relic_vial',
  },
  {
    id: 'test_relic_counter',
    name: 'Test Metronome',
    rarity: 'boss',
    counterMax: COUNTER.every,
    values: COUNTER,
    text: 'Every {every} cards you play, gain {block} Block.',
    hooks: {
      onCardPlayed: (c) => {
        const relic = c.relic;
        if (!relic) throw new Error('test_relic_counter: no relic state');
        relic.counter += 1;
        if (relic.counter >= COUNTER.every) {
          relic.counter = 0;
          c.flash();
          c.queue([{ type: 'block', amount: COUNTER.block }]);
        }
      },
      onCombatEnd: (c) => {
        if (!c.relic) throw new Error('test_relic_counter: no relic state');
        c.relic.counter = 0;
      },
    },
    icon: 'relic_metronome',
  },
];
