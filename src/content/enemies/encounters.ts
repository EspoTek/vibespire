// Aggregates every act's encounters (each act file owns its own list). Do not add encounters here.
import type { EncounterDef } from '../../engine/types';
import { ACT1_ENCOUNTERS } from './act1';
import { ACT2_ENCOUNTERS } from './act2';
import { ACT3_ENCOUNTERS } from './act3';
import { BOSS_ENCOUNTERS } from './bosses';

export const ENCOUNTERS: EncounterDef[] = [...ACT1_ENCOUNTERS, ...ACT2_ENCOUNTERS, ...ACT3_ENCOUNTERS, ...BOSS_ENCOUNTERS];
