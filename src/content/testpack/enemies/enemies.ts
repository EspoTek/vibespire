// TEST PACK enemies + encounters (every act). Covers: multi-hit, Block + Guard, Exposed / Stagger / Rot
// on the player, a hidden-forecast move, a leader with minions (die / flee), move escalation via
// aiState, MoveDef.text. Not real game content.
import type { EncounterDef, EnemyDef } from '../../../engine/types';

export const TEST_ENEMIES: EnemyDef[] = [
  {
    id: 'test_slime',
    name: 'Test Slime',
    hp: [12, 16],
    moves: {
      tackle: { name: 'Tackle', intent: 'attack', effects: [{ type: 'damage', amount: 6, target: 'target' }] },
      lick: { name: 'Lick', intent: 'debuff', text: 'Apply {status} Vulnerable.', effects: [{ type: 'status', target: 'target', id: 'test_vulnerable', amount: 1 }] },
    },
    chooseMove: (c) => {
      if (c.lastMove() === 'lick') return 'tackle';
      if (c.timesInARow('tackle') >= 2) return 'lick';
      return c.rng.weighted([['tackle', 70], ['lick', 30]]);
    },
    icon: 'enemy_slime',
  },
  {
    id: 'test_cultist',
    name: 'Test Cultist',
    hp: [18, 22],
    moves: {
      incant: { name: 'Incantation', intent: 'buff', text: 'Gain {status} Strength.', effects: [{ type: 'status', target: 'self', id: 'test_strength', amount: 2 }] },
      stab: { name: 'Stab', intent: 'attack', effects: [{ type: 'damage', amount: 4, target: 'target' }] },
    },
    chooseMove: (c) => (c.history.length === 0 ? 'incant' : 'stab'),
    icon: 'enemy_cultist',
  },
  {
    id: 'test_jaw',
    name: 'Test Jaw',
    hp: [24, 28],
    moves: {
      flurry: { name: 'Flurry', intent: 'attack', effects: [{ type: 'damage', amount: 3, times: 3, target: 'target' }] },
      brace: {
        name: 'Brace',
        intent: 'attack_defend',
        text: 'Gain {block} Block and {guard} Guard. Deal {damage} damage.',
        effects: [{ type: 'block', amount: 6 }, { type: 'guard', amount: 4 }, { type: 'damage', amount: 5, target: 'target' }],
      },
    },
    chooseMove: (c) => {
      const last = c.lastMove();
      if (last === null) return c.rng.pick(['flurry', 'brace']);
      return last === 'flurry' ? 'brace' : 'flurry';
    },
    icon: 'enemy_jaw',
  },
  {
    id: 'test_mystic',
    name: 'Test Mystic',
    hp: [20, 24],
    moves: {
      hex: {
        name: 'Hex',
        intent: 'debuff',
        text: 'Apply {status} Exposed, {status2} Stagger and {status3} Rot.',
        effects: [
          { type: 'status', target: 'target', id: 'exposed', amount: 2 },
          { type: 'status', target: 'target', id: 'stagger', amount: 2 },
          { type: 'status', target: 'target', id: 'rot', amount: 2 },
        ],
      },
      veil: { name: 'Veiled Strike', intent: 'attack', augury: 'hidden', effects: [{ type: 'damage', amount: 7, target: 'target' }] },
    },
    // alternates: odd uses = hex, even = veil (pure: history only)
    chooseMove: (c) => (c.history.length % 2 === 0 ? 'hex' : 'veil'),
    icon: 'enemy_mystic',
  },
  {
    id: 'test_leader',
    name: 'Test Leader',
    hp: [30, 34],
    moves: {
      call: { name: 'Call', intent: 'special', text: 'Summon minions (up to {cap} alive).', effects: [{ type: 'summon', enemy: 'test_minion', fillTo: 2, cap: 2 }] },
      whip: {
        name: 'Whip',
        intent: 'attack',
        text: 'Deal {damage} damage. +2 each time.',
        effects: [{ type: 'damage', amount: { base: 5, per: 2, scale: { ai: 'whips' } }, target: 'target' }, { type: 'ai_state', key: 'whips', delta: 1 }],
      },
    },
    values: { cap: 2 },
    chooseMove: (c) => (c.alliesAlive('test_minion') < 2 && c.lastMove() !== 'call' ? 'call' : 'whip'),
    icon: 'enemy_leader',
  },
  {
    id: 'test_minion',
    name: 'Test Minion',
    hp: [6, 8],
    onLeaderDeath: 'die',
    moves: { nip: { name: 'Nip', intent: 'attack', effects: [{ type: 'damage', amount: 3, target: 'target' }] } },
    chooseMove: () => 'nip',
    icon: 'enemy_minion',
  },
];

const ALL_ACTS: EncounterDef['acts'] = [1, 2, 3];

export const TEST_ENCOUNTERS: EncounterDef[] = [
  { id: 'test_enc_slime', name: 'Slime', acts: ALL_ACTS, pool: 'easy', enemies: ['test_slime'] },
  { id: 'test_enc_cultist', name: 'Cultist', acts: ALL_ACTS, pool: 'easy', enemies: ['test_cultist'] },
  { id: 'test_enc_jaw', name: 'Jaw', acts: ALL_ACTS, pool: 'easy', enemies: ['test_jaw'] },
  { id: 'test_enc_slimes', name: 'Two Slimes', acts: ALL_ACTS, pool: 'hard', enemies: ['test_slime', 'test_slime'] },
  { id: 'test_enc_mixed', name: 'Cultist and Slime', acts: ALL_ACTS, pool: 'hard', enemies: ['test_cultist', 'test_slime'] },
  { id: 'test_enc_jaw_slime', name: 'Jaw and Slime', acts: ALL_ACTS, pool: 'hard', enemies: ['test_jaw', 'test_slime'] },
  { id: 'test_enc_mystic', name: 'Mystic and Slime', acts: ALL_ACTS, pool: 'hard', enemies: ['test_mystic', 'test_slime'] },
  {
    id: 'test_enc_pack',
    name: 'Leader and pack',
    acts: ALL_ACTS,
    pool: 'hard',
    enemies: ['test_leader', { id: 'test_minion', leader: 0 }, { id: 'test_slime', leader: 0, withLeader: 'flee' }],
  },
  { id: 'test_enc_elite', name: 'Jaw and Cultist', acts: ALL_ACTS, pool: 'elite', enemies: ['test_jaw', 'test_cultist'] },
  { id: 'test_enc_elite_mystic', name: 'Mystic and Jaw', acts: ALL_ACTS, pool: 'elite', enemies: ['test_mystic', 'test_jaw'] },
  { id: 'test_enc_event', name: 'Event ambush', acts: ALL_ACTS, pool: 'event', enemies: ['test_slime', 'test_cultist'] },
];
