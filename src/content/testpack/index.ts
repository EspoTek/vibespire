// The TEST PACK: small content that exercises every engine feature and every zone the renderer
// draws (primed rack, Timeline, Guard, forecast incl. hidden, Exposed/Stagger/Rot, summons).
// NOT auto-registered. Tests, `npx tsx sim/batch.ts --content test`, and renderer dev builds
// (?content=test) call registerTestPack() once. Every id is test_*.

import { registerPack } from '../registry';
import { TEST_BOONS } from './boons';
import { TEST_COLORLESS_CARDS } from './cards/colorless';
import { TEST_STATUS_CARDS } from './cards/status_cards';
import { TEST_CLASS_CARDS } from './cards/test_class';
import { TEST_CLASSES } from './classes';
import { TEST_BOSS_ENCOUNTERS, TEST_BOSSES } from './enemies/bosses';
import { TEST_ENCOUNTERS, TEST_ENEMIES } from './enemies/enemies';
import { TEST_EVENTS } from './events';
import { TEST_POTIONS } from './potions';
import { TEST_RELICS } from './relics';
import { TEST_REST_OPTIONS } from './rest';
import { TEST_STATUSES } from './statuses';

let registered = false;

/** Register the test pack (idempotent within one module graph). */
export function registerTestPack(): void {
  if (registered) return;
  registered = true;
  registerPack({
    classes: TEST_CLASSES,
    cards: [...TEST_CLASS_CARDS, ...TEST_COLORLESS_CARDS, ...TEST_STATUS_CARDS],
    relics: TEST_RELICS,
    enemies: [...TEST_ENEMIES, ...TEST_BOSSES],
    encounters: [...TEST_ENCOUNTERS, ...TEST_BOSS_ENCOUNTERS],
    events: TEST_EVENTS,
    potions: TEST_POTIONS,
    statuses: TEST_STATUSES,
    boons: TEST_BOONS,
    restOptions: TEST_REST_OPTIONS,
  }, 'test');
}
