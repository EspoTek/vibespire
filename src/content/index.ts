// Content entry point: registers the REAL content packs and re-exports the registry API.
// Lookups (getCardDef, getRelicDef, ...) THROW on unknown ids.
//
// The test pack (src/content/testpack) is NOT registered here: tests, the simulator's
// `--content test` and renderer dev builds (?content=test) call registerTestPack() themselves.
//
// Implementers: fill the files below (see docs/CONTENT_GUIDE.md). Each is already imported and
// registered, so a new definition is live as soon as it is in its array.

import { PACTS } from './boons';
import { BREAKER_CARDS, BREAKER_STATUSES } from './cards/breaker';
import { CHRONIST_CARDS, CHRONIST_STATUSES } from './cards/chronist';
import { COLORLESS_CARDS, COLORLESS_STATUSES } from './cards/colorless';
import { CURSES } from './cards/curses';
import { GRAFT_CARDS, GRAFT_STATUSES } from './cards/graft';
import { STATUS_CARDS } from './cards/status_cards';
import { CLASSES } from './classes';
import { ACT1_ENEMIES, ACT1_STATUSES } from './enemies/act1';
import { ACT2_ENEMIES, ACT2_STATUSES } from './enemies/act2';
import { ACT3_ENEMIES, ACT3_STATUSES } from './enemies/act3';
import { BOSSES, BOSS_STATUSES } from './enemies/bosses';
import { ENCOUNTERS } from './enemies/encounters';
import { EVENTS, EVENT_ENCOUNTERS, EVENT_STATUSES } from './events';
import { POTIONS, POTION_STATUSES } from './potions';
import { registerPack } from './registry';
import { RELICS, RELIC_STATUSES } from './relics';
import { REST_OPTIONS } from './rest';
import { STATUSES } from './statuses';

registerPack({
  cards: [...BREAKER_CARDS, ...GRAFT_CARDS, ...CHRONIST_CARDS, ...COLORLESS_CARDS, ...CURSES, ...STATUS_CARDS],
  relics: RELICS,
  enemies: [...ACT1_ENEMIES, ...ACT2_ENEMIES, ...ACT3_ENEMIES, ...BOSSES],
  encounters: [...ENCOUNTERS, ...EVENT_ENCOUNTERS],
  events: EVENTS,
  potions: POTIONS,
  statuses: [...STATUSES, ...BREAKER_STATUSES, ...GRAFT_STATUSES, ...CHRONIST_STATUSES, ...COLORLESS_STATUSES, ...RELIC_STATUSES, ...POTION_STATUSES, ...EVENT_STATUSES, ...ACT1_STATUSES, ...ACT2_STATUSES, ...ACT3_STATUSES, ...BOSS_STATUSES],
  restOptions: REST_OPTIONS,
});

// TODO(content): flip to `true` once breaker/graft/chronist starter cards + starter relics,
// the curses and the class rares exist (CLASSES and PACTS reference them; validateAllContent fails otherwise).
export const REAL_CLASSES_READY = true;
if (REAL_CLASSES_READY) registerPack({ classes: CLASSES, boons: PACTS });

export { CLASSES, PACTS };
export * from './registry';
