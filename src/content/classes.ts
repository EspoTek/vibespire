// REAL CONTENT: the three classes (GDD §4.1). Registered in index.ts only once each class pack (with
// its starter cards and starter relic) exists.
import type { ClassDef } from '../engine/types';

export const CLASSES: ClassDef[] = [
  {
    id: 'breaker',
    name: 'The Breaker',
    maxHp: 80,
    startingGold: 99,
    maxEnergy: 3,
    potionSlots: 3,
    startingDeck: ['hew', 'hew', 'hew', 'hew', 'hew', 'bulwark', 'bulwark', 'bulwark', 'bulwark', 'shoulder_check', 'brace'],
    startingRelics: ['riven_gauntlet'],
    onslaughtFromAttacks: true,
    icon: 'class_breaker',
  },
  {
    id: 'graft',
    name: 'The Graft',
    maxHp: 70,
    startingGold: 99,
    maxEnergy: 3,
    potionSlots: 3,
    startingDeck: ['lash', 'lash', 'lash', 'lash', 'lash', 'husk', 'husk', 'husk', 'husk', 'seed_bite', 'graft_hide'],
    startingRelics: ['heartseed'],
    icon: 'class_graft',
  },
  {
    id: 'chronist',
    name: 'The Chronist',
    maxHp: 66,
    startingGold: 99,
    maxEnergy: 3,
    potionSlots: 3,
    startingDeck: ['pulse_shot', 'pulse_shot', 'pulse_shot', 'pulse_shot', 'pulse_shot', 'ward', 'ward', 'ward', 'ward', 'tick', 'tock'],
    startingRelics: ['chrono_lens'],
    combatStartStatuses: { augury: 1 },
    icon: 'class_chronist',
  },
];
