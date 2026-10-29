// TEST PACK statuses for engine tests (all `test_*`). Not real game content.
import type { StatusDef } from '../../engine/types';

const VULN_PCT = 150;

export const TEST_STATUSES: StatusDef[] = [
  {
    id: 'test_strength',
    name: 'Strength',
    stacks: 'amount',
    allowNegative: true,
    decay: 'never',
    tick: 'never',
    isDebuff: false,
    text: 'Attacks deal {stacks} additional damage.',
    hooks: { damageDealtFlat: (c) => c.stacks },
    icon: 'status_strength',
  },
  {
    id: 'test_vulnerable',
    name: 'Vulnerable',
    stacks: 'duration',
    decay: 'end_player_turn',
    tick: 'never',
    isDebuff: true,
    values: { pct: VULN_PCT - 100 },
    text: 'Takes {pct}% more attack damage for {stacks} turn(s).',
    hooks: { damageTakenMult: () => VULN_PCT },
    icon: 'status_vulnerable',
  },
  {
    id: 'test_burning',
    name: 'Burning',
    stacks: 'duration',
    decay: 'end_player_turn',
    tick: 'end_player_turn',
    isDebuff: true,
    text: 'At the end of your turn, lose {lose_hp} HP. Then Burning decreases by 1.',
    triggers: { onTick: [{ type: 'lose_hp', amount: { scale: 'stacks' }, target: 'self' }] },
    icon: 'status_burning',
  },
];
