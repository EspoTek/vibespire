// The examples in docs/CONTENT_GUIDE.md, verbatim. tests/content/guide_examples.test.ts registers and
// plays them, so the guide cannot drift from the engine. (ids prefixed ex_ to avoid collisions)
import type { CardDef, EncounterDef, EnemyDef, EventDef, PotionDef, RelicDef, StartBoonDef, StatusDef } from '../../src/engine/types';

// --- Riposte card
export const exParry: CardDef = {
  id: 'ex_return_stroke', name: 'Return Stroke', cls: 'test_class', type: 'attack', rarity: 'common', cost: 1, target: 'enemy',
  keywords: ['riposte'],
  text: 'Deal {damage} damage. Riposte: deal {rdamage} damage to the attacker and gain {rstatus} Onslaught.',
  effects: [{ type: 'damage', amount: 7, target: 'target' }],
  riposte: [
    { type: 'damage', amount: 6, target: 'attacker', key: 'rdamage' },
    { type: 'status', target: 'self', id: 'onslaught', amount: 1, key: 'rstatus' },
  ],
  upgrade: {
    effects: [{ type: 'damage', amount: 9, target: 'target' }],
    riposte: [
      { type: 'damage', amount: 8, target: 'attacker', key: 'rdamage' },
      { type: 'status', target: 'self', id: 'onslaught', amount: 1, key: 'rstatus' },
    ],
  },
  icon: 'card_return_stroke', tags: ['riposte', 'onslaught'],
};

// --- Delay (split) card
export const exTock: CardDef = {
  id: 'ex_tock', name: 'Tock', cls: 'test_class', type: 'skill', rarity: 'common', cost: 1, target: 'self',
  keywords: ['delay'],
  text: 'Gain {block} Block. Delay {delay_turns}: gain {delay_block} Block.',
  effects: [{ type: 'block', amount: 3 }],
  delay: { turns: 1, effects: [{ type: 'block', amount: 5, key: 'delay_block' }] },
  upgrade: { effects: [{ type: 'block', amount: 4 }], delay: { turns: 1, effects: [{ type: 'block', amount: 7, key: 'delay_block' }] } },
  icon: 'card_tock', tags: ['delay', 'block'],
};

// --- Bloom + Prune card
export const exGraftingCut: CardDef = {
  id: 'ex_grafting_cut', name: 'Grafting Cut', cls: 'test_class', type: 'attack', rarity: 'common', cost: 1, target: 'enemy',
  keywords: ['bloom'],
  text: 'Bloom. Deal {damage} (+{damage_per} per Bloom) damage. Prune.',
  effects: [
    { type: 'damage', amount: { base: 2, per: 1, scale: { cardVar: 'bloom' } }, target: 'target' },
    { type: 'prune', bloom: 1, variant: 'standard' },
  ],
  upgrade: {
    effects: [
      { type: 'damage', amount: { base: 2, per: 2, scale: { cardVar: 'bloom' } }, target: 'target' },
      { type: 'prune', bloom: 1, variant: 'standard' },
    ],
  },
  icon: 'card_grafting_cut', tags: ['bloom', 'prune'],
};

// --- On-beat card
export const exDownbeat: CardDef = {
  id: 'ex_downbeat', name: 'Downbeat', cls: 'test_class', type: 'attack', rarity: 'common', cost: 2, target: 'enemy',
  text: 'Deal {damage} damage. On beat: deal {beat_damage} more.',
  effects: [
    { type: 'damage', amount: 11, target: 'target' },
    { type: 'on_beat', effects: [{ type: 'damage', amount: 6, target: 'target', key: 'beat_damage' }] },
  ],
  upgrade: {
    effects: [
      { type: 'damage', amount: 14, target: 'target' },
      { type: 'on_beat', effects: [{ type: 'damage', amount: 8, target: 'target', key: 'beat_damage' }] },
    ],
  },
  icon: 'card_downbeat', tags: ['cadence'],
};

// --- Power: a card that applies a status carrying the behaviour (status id = card id)
export const exDuskPruningStatus: StatusDef = {
  id: 'ex_dusk_pruning', name: 'Dusk Pruning', stacks: 'amount', decay: 'never', tick: 'never', isDebuff: false,
  text: 'At the end of your turn, Prune {stacks} time(s).',
  // A hook may open a choice by QUEUEING effects (RULINGS 21); ctx.now would throw here.
  triggers: { onTurnEnd: [{ type: 'repeat', times: { scale: 'stacks' }, effects: [{ type: 'prune', bloom: 1 }] }] },
  icon: 'status_dusk_pruning',
};
export const exDuskPruning: CardDef = {
  id: 'ex_dusk_pruning', name: 'Dusk Pruning', cls: 'test_class', type: 'power', rarity: 'uncommon', cost: 1, target: 'self',
  text: 'At the end of your turn, Prune.', effects: [{ type: 'status', target: 'self', id: 'ex_dusk_pruning', amount: 1 }],
  upgrade: { cost: 0 }, icon: 'card_dusk_pruning', tags: ['prune', 'power'],
};

// --- Relic with a declarative trigger and a modifier hook
const RIVETS = { guard: 1 };
export const exRelic: RelicDef = {
  id: 'ex_bulwark_rivets', name: 'Bulwark Rivets', rarity: 'common',
  text: 'Whenever you gain Guard, gain {guard} more. At the start of each combat, gain {block} Block.',
  values: RIVETS,
  triggers: { onCombatStart: [{ type: 'block', amount: 3 }] },
  hooks: { guardFlat: () => RIVETS.guard },
  icon: 'relic_bulwark_rivets', tags: ['guard'],
};

// --- Enemies: a leader that summons minions; escalation via aiState; hidden forecast move
export const exLeader: EnemyDef = {
  id: 'ex_gnasher_alpha', name: 'Gnasher Alpha', hp: [62, 66],
  moves: {
    call_pack: {
      name: 'Call the Pack', intent: 'special', text: 'Summons Gnashers until {summon} are alive.',
      effects: [{ type: 'summon', enemy: 'ex_gnasher', fillTo: 2, cap: 2, withLeader: 'flee' }],
    },
    maul: {
      name: 'Maul', intent: 'attack', text: 'Deal {damage} damage. +{damage_per} each use.',
      effects: [
        { type: 'damage', amount: { base: 9, per: 2, scale: { ai: 'mauls' } }, target: 'target' },
        { type: 'ai_state', key: 'mauls', delta: 1 },
      ],
    },
    howl: { name: 'Howl', intent: 'buff', augury: 'hidden', effects: [{ type: 'status', target: 'all_allies', id: 'might', amount: 1 }] },
  },
  // PURE: reads only its own history / turn / aiState / which allies are alive / its own rng.
  chooseMove: (c) => {
    if (c.alliesAlive('ex_gnasher') < 2 && c.lastMove() !== 'call_pack') return 'call_pack';
    if (c.timesInARow('maul') >= 2) return 'howl';
    return c.rng.weighted([['maul', 70], ['howl', 30]]);
  },
  icon: 'enemy_gnasher_alpha',
};
export const exMinion: EnemyDef = {
  id: 'ex_gnasher', name: 'Gnasher', hp: [13, 17], onLeaderDeath: 'die',
  moves: { bite: { name: 'Bite', intent: 'attack', effects: [{ type: 'damage', amount: 3, times: 2, target: 'target' }] } },
  chooseMove: () => 'bite',
  icon: 'enemy_gnasher',
};
export const exEncounter: EncounterDef = {
  id: 'ex_enc_alpha', name: 'Gnasher Alpha', acts: [1], pool: 'elite',
  // slot 0 leads slots 1-2; a slot's withLeader overrides the minion def's onLeaderDeath
  enemies: ['ex_gnasher_alpha', { id: 'ex_gnasher', leader: 0, withLeader: 'flee' }, { id: 'ex_gnasher', leader: 0, withLeader: 'flee' }],
};
export const exEventEncounter: EncounterDef = { id: 'ex_enc_event_choir', name: 'Spore Choir', acts: [1], pool: 'event', enemies: ['ex_gnasher', 'ex_gnasher'] };

// --- Event with a gamble option, an event combat and a follow-up page
export const exEvent: EventDef = {
  id: 'ex_flickering_medpod', name: 'Flickering Med-Pod', acts: [1],
  text: 'An emergency med-pod flickers between green and red.',
  options: [
    {
      label: 'Full cycle ({gamble_1}% heal to full / {gamble_2}% lose {max_hp_abs} Max HP).',
      effects: [{ type: 'gamble', outcomes: [
        { weight: 65, label: 'You feel whole.', effects: [{ type: 'heal', amount: { scale: 'missing_hp' } }] },
        { weight: 35, label: 'Something burns.', effects: [{ type: 'max_hp', amount: -6 }] },
      ] }],
      next: 'after',
    },
    {
      label: 'Smash it (fight; win a common relic).',
      effects: [{ type: 'start_combat', encounterId: 'ex_enc_event_choir', onWin: [{ type: 'gain_relic', rarity: 'common' }] }],
    },
    { label: 'Pay {gold_abs} gold: heal {heal} HP.', effects: [{ type: 'gold', amount: -30 }, { type: 'heal', amount: 12 }],
      available: (c) => (c.state.player.gold >= 30 ? true : 'Not enough gold.') },
  ],
  pages: { after: { text: 'The pod powers down.', options: [{ label: 'Leave.', effects: [] }] } },
  icon: 'event_medpod',
};

// --- Potion
export const exPotion: PotionDef = {
  id: 'ex_pot_halt_ampoule', name: 'Halt Ampoule', rarity: 'rare', target: 'enemy', combatOnly: true,
  text: 'That enemy skips its next move. Bosses are immune.', effects: [{ type: 'halt_enemy', target: 'target' }],
  icon: 'potion_halt',
};

// --- Start boon (Ascent Pact)
export const exPact: StartBoonDef = {
  id: 'ex_pact_lean_start', list: 'trade', text: 'Remove {remove_card} cards from your deck. Lose all your gold.',
  effects: [{ type: 'remove_card', n: 2, choose: true }, { type: 'gold', amount: { per: -1, scale: 'gold' } }],
};
