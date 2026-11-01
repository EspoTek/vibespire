// REAL CONTENT: the rules-bearing statuses of docs/GDD.md §2 (+ RULINGS 8 `halted`, ENEMIES §0.4 `might`).
// The engine reads some of these ids directly (built-in rules): onslaught (+1 after each played
// Attack), exposed / stagger / backlash_primed (pipeline step 4), riposte_capacity (prime capacity),
// augury (forecast display), halted (skip next move), elite_hunted (applied by pact_hunted).
// Stack caps live in TUNING.caps.status (onslaught 30, exposed 20, stagger 20, rot 15).
import type { StatusDef } from '../engine/types';
import { FESTERING_LENS } from './relics';

const HUNTED = { hp_pct: 25, dmg: 2 };
const BACKLASH = { per: 4 };

export const STATUSES: StatusDef[] = [
  {
    id: 'onslaught',
    name: 'Onslaught',
    stacks: 'amount',
    decay: 'end_player_turn',
    decayBy: 'all',
    tick: 'never',
    isDebuff: false,
    text: 'Onslaught {stacks}. +1 after each Attack you play. Resets at the end of your turn.',
    icon: 'status_onslaught',
  },
  {
    id: 'onslaught_keep',
    name: 'Kept Onslaught',
    stacks: 'max',
    decay: 'never',
    tick: 'never',
    isDebuff: false,
    hidden: true,
    text: 'At the end of your turn, keep up to {stacks} Onslaught.',
    hooks: { keepStatus: (c, id, stacks) => (id === 'onslaught' ? Math.min(stacks, c.stacks) : 0) },
    icon: 'status_onslaught_keep',
  },
  {
    id: 'riposte_capacity',
    name: 'Parry Stance',
    stacks: 'amount',
    decay: 'never',
    tick: 'never',
    isDebuff: false,
    text: 'You can prime {stacks} more Riposte card(s).',
    icon: 'status_riposte_capacity',
  },
  {
    id: 'augury',
    name: 'Augury',
    stacks: 'flag',
    decay: 'never',
    tick: 'never',
    isDebuff: false,
    text: "You see each enemy's next two intents.",
    icon: 'status_augury',
  },
  {
    id: 'exposed',
    name: 'Exposed',
    stacks: 'amount',
    decay: 'end_own_turn',
    tick: 'never',
    isDebuff: true,
    text: 'Takes {stacks} more damage from each hit. Loses 1 at the end of its turn.',
    icon: 'status_exposed',
  },
  {
    id: 'stagger',
    name: 'Stagger',
    stacks: 'amount',
    decay: 'end_own_turn',
    tick: 'never',
    isDebuff: true,
    text: 'Its hits deal {stacks} less damage. Loses 1 at the end of its turn.',
    icon: 'status_stagger',
  },
  {
    id: 'rot',
    name: 'Rot',
    stacks: 'amount',
    decay: 'never',
    tick: 'end_own_turn',
    isDebuff: true,
    text: 'At the end of its turn, loses {lose_hp} HP, then Rot increases by {status}.',
    triggers: {
      onTick: [
        { type: 'lose_hp', amount: { scale: 'stacks' }, target: 'self' },
        { type: 'status', target: 'self', id: 'rot', amount: 1 },
      ],
    },
    hooks: {
      // Shared v2 Festering Lens (relics.ts): a Rot tick on an enemy also loses 1 HP per Exposed on it.
      onTick: (c) => {
        if (c.owner === 'player' || !c.state.player.relics.some((r) => r.id === 'festering_lens')) return;
        const exposed = c.combat?.enemies.find((e) => e.uid === c.owner)?.statuses.exposed ?? 0; // no Exposed = 0
        if (exposed <= 0) return;
        c.emit({ t: 'relic_trigger', relic: 'festering_lens' });
        c.queue([{ type: 'lose_hp', amount: exposed * FESTERING_LENS.per, target: 'self' }]);
      },
      // GDD §2.6 spread: floor(Rot / 2) (Rot Censer: all of it) to a random living ally of the dead enemy.
      onDeath: (c) => {
        const combat = c.combat;
        if (!combat || c.owner === 'player') return;
        const others = combat.enemies.filter((e) => e.alive && e.uid !== c.owner);
        if (others.length === 0) return;
        const all = c.state.player.relics.some((r) => r.id === 'rot_censer');
        const n = all ? c.stacks : Math.floor(c.stacks / 2);
        if (n <= 0) return;
        const to = c.rng.pick('misc', others);
        c.queue([{ type: 'status', target: 'target', id: 'rot', amount: n }], { target: to.uid });
      },
    },
    icon: 'status_rot',
  },
  {
    id: 'elite_hunted',
    name: 'Hunted',
    stacks: 'flag',
    decay: 'never',
    tick: 'never',
    isDebuff: false,
    values: HUNTED,
    text: '+{hp_pct}% Max HP. Its hits deal {dmg} more damage.',
    hooks: {
      onApplied: (c) => {
        const e = c.combat?.enemies.find((x) => x.uid === c.owner);
        if (!e) throw new Error('elite_hunted on a non-enemy');
        const max = Math.ceil((e.maxHp * (100 + HUNTED.hp_pct)) / 100);
        e.hp += max - e.maxHp;
        e.maxHp = max;
      },
      damageDealtFlat: () => HUNTED.dmg,
    },
    icon: 'status_hunted',
  },
  {
    id: 'backlash_primed',
    name: 'Backlash',
    stacks: 'amount',
    decay: 'start_player_turn',
    decayBy: 'all',
    tick: 'never',
    isDebuff: true,
    values: BACKLASH,
    // The engine adds TUNING.backlashPerStack (4) per stack to the next enemy hit on you, then removes it.
    text: 'The next enemy hit on you deals {per} more damage per stack ({stacks}).',
    icon: 'status_backlash',
  },
  {
    id: 'cost_tax',
    name: 'Jitter Tax',
    stacks: 'amount',
    decay: 'end_player_turn',
    decayBy: 'all',
    tick: 'never',
    isDebuff: true,
    text: 'The next card you play costs {stacks} more.',
    hooks: {
      modifyCardCost: (c, _card, cost) => cost + c.stacks,
      onCardPlayed: (c) => c.now([{ type: 'status', target: 'self', id: 'cost_tax', amount: -c.stacks }]),
    },
    icon: 'status_cost_tax',
  },
  {
    id: 'halted',
    name: 'Halted',
    stacks: 'flag',
    decay: 'never',
    tick: 'never',
    isDebuff: true,
    text: 'Skips its next move.',
    icon: 'status_halted',
  },
  {
    id: 'might',
    name: 'Might',
    stacks: 'amount',
    decay: 'never',
    tick: 'never',
    isDebuff: false,
    text: 'Its hits deal {stacks} more damage.',
    hooks: { damageDealtFlat: (c) => c.stacks },
    icon: 'status_might',
  },
];
