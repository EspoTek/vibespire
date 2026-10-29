// REAL CONTENT: the Breaker class pool (docs/cards/breaker.md): 4 starters (GDD §4.1) + 20 common +
// 20 uncommon + 12 rare, and the Power / one-turn statuses of its §D.2.
//
// Interpretations (see docs/RULINGS.md):
// - ruling 32: the Power `furnace_heart` is `cinder_heart` ("Cinder Heart"); the Act 2 boss keeps the id.
// - Steal the Swing uses the engine primitive `cancel_attack` (designer: custom fn of that name).
// - Forge Oath uses `run_flag combat_start_status:onslaught` + `remove_card {self}` (designer: run counter
//   `oath_onslaught` + custom `remove_self_from_deck`).
// - En Garde uses the engine primitive `prime {n}` (designer: custom `prime_from_hand`).
// - Condition thresholds live in per-card constants shared by the condition and the text `values`, so the
//   text can never drift from the rule.
import type { CardDef, Condition, Effect, HookCtx, ScaledAmount, StatusDef } from '../../engine/types';

const ONSLAUGHT = 'onslaught';

/** `{ base, per, scale: Onslaught }`: "Deal X damage, +Y per Onslaught". */
const perOnslaught = (base: number, per: number): ScaledAmount => ({ base, per, scale: { status: ONSLAUGHT } });
/** "If Onslaught ≥ N" (does not spend). */
const onslaughtAtLeast = (min: number): Condition => ({ type: 'has_status', who: 'self', id: ONSLAUGHT, min });
/** "Deal X. Spend N Onslaught: deal Y instead." Always exactly one hit (designer §0.2 / §F.3). */
const spendInstead = (n: number, spent: Effect[], otherwise: Effect[]): Effect => ({
  type: 'conditional',
  if: onslaughtAtLeast(n),
  then: [{ type: 'spend_status', id: ONSLAUGHT, n, effects: spent }],
  else: otherwise,
});
const selfStatus = (id: string, amount: number): Effect => ({ type: 'status', target: 'self', id, amount });

function combatOf(ctx: HookCtx, what: string) {
  const c = ctx.combat;
  if (!c) throw new Error(`${what} outside combat`);
  return c;
}

// Shared numbers (condition thresholds + text values).
const CHAIN_DRIVER = { min: 2 };
const BREACH_HAMMER = { spend: 2 };
const PLATE_RAM = { min: 10 };
const READ_THE_LINE = { min: 3 };
const PLANTED_FEET = { min: 5 };
const QUAKE_HAMMER = { spend: 3 };
const QUENCH = { spend: 2 };
const RIDE_THE_SURGE = { min: 3 };
const ENDLESS_MAUL = { min: 4 };
const SHED_PLATING = { guard: 8 };
const EN_GARDE = { prime: 2 };
const FORGE_OATH_FLAG = `combat_start_status:${ONSLAUGHT}`;

// ---------------------------------------------------------------------------
// Statuses (designer §D.2)

/** combat.counters key prefix marking a fired card for Recoil Spring (value 1; the uid follows). */
const RECOIL_MARK = 'recoil_spring_uid:';

export const BREAKER_STATUSES: StatusDef[] = [
  {
    id: 'cinder_heart',
    name: 'Cinder Heart',
    stacks: 'amount',
    decay: 'never',
    tick: 'never',
    isDebuff: false,
    text: 'At the start of your turn, gain {stacks} Onslaught.',
    triggers: { onTurnStart: [{ type: 'status', target: 'self', id: ONSLAUGHT, amount: { scale: 'stacks' } }] },
    icon: 'status_cinder_heart',
  },
  {
    id: 'parry_ledger',
    name: 'Parry Ledger',
    stacks: 'amount',
    decay: 'never',
    tick: 'never',
    isDebuff: false,
    text: 'Whenever one of your Ripostes triggers, draw {stacks} more card(s) next turn.',
    // Banks the draw in parry_ledger_draw, which pays out at your next turn start (step 4, before the draw).
    triggers: { onRiposteTriggered: [{ type: 'status', target: 'self', id: 'parry_ledger_draw', amount: { scale: 'stacks' } }] },
    icon: 'status_parry_ledger',
  },
  {
    id: 'parry_ledger_draw',
    name: 'Ledger Draw',
    stacks: 'amount',
    decay: 'start_player_turn',
    decayBy: 'all',
    tick: 'start_player_turn',
    isDebuff: false,
    text: 'At the start of your turn, draw {stacks} more card(s).',
    triggers: { onTick: [{ type: 'draw', n: { scale: 'stacks' } }] },
    icon: 'status_parry_ledger_draw',
  },
  {
    id: 'anvil_heart',
    name: 'Anvil Heart',
    stacks: 'amount',
    decay: 'never',
    tick: 'never',
    isDebuff: false,
    text: 'When an enemy attack ends and you lost no HP to it, gain {stacks} Onslaught.',
    hooks: {
      onEnemyMoveEnd: (ctx, info) => {
        if (!info.wasAttack || info.hpLostThisMove !== 0) return;
        ctx.queue([{ type: 'status', target: 'self', id: ONSLAUGHT, amount: { scale: 'stacks' } }]);
      },
    },
    icon: 'status_anvil_heart',
  },
  {
    id: 'fault_reader',
    name: 'Fault Reader',
    stacks: 'amount',
    decay: 'never',
    tick: 'never',
    isDebuff: false,
    text: 'At the start of your turn, apply {stacks} Exposed to the lowest-HP enemy.',
    triggers: { onTurnStart: [{ type: 'status', target: 'lowest_hp_enemy', id: 'exposed', amount: { scale: 'stacks' } }] },
    icon: 'status_fault_reader',
  },
  {
    id: 'recoil_spring',
    name: 'Recoil Spring',
    stacks: 'flag',
    decay: 'never',
    tick: 'never',
    isDebuff: false,
    text: 'When a primed card fires, it comes back to your hand next turn.',
    hooks: {
      // Mark the card after its LAST firing (Duelist's Oath: a card with charges left is still on the rack).
      onRiposteTriggered: (ctx, info) => {
        const c = combatOf(ctx, 'recoil_spring');
        if (c.primed.some((p) => p.card.uid === info.card.uid)) return;
        c.counters[`${RECOIL_MARK}${info.card.uid}`] = 1;
      },
      // Turn start step 4: marked cards still in the discard pile return to hand (cap_to_hand applies;
      // Scrapped cards are not in the discard pile and stay gone). The marked cards are moved to the top of
      // the discard pile and taken with the engine's fetch, so caps and events are the engine's own.
      onTurnStart: (ctx) => {
        const c = combatOf(ctx, 'recoil_spring');
        const keys = Object.keys(c.counters).filter((k) => k.startsWith(RECOIL_MARK));
        if (keys.length === 0) return;
        const uids = new Set(keys.map((k) => Number(k.slice(RECOIL_MARK.length))));
        for (const k of keys) delete c.counters[k];
        const back = c.discard.filter((card) => uids.has(card.uid));
        if (back.length === 0) return;
        const rest = c.discard.filter((card) => !uids.has(card.uid));
        c.discard.splice(0, c.discard.length, ...rest, ...back);
        ctx.queue([{ type: 'fetch_card', from: 'discard', select: 'top', to: 'hand', n: back.length }]);
      },
    },
    icon: 'status_recoil_spring',
  },
  {
    id: 'reactive_plate',
    name: 'Reactive Plate',
    stacks: 'amount',
    decay: 'never',
    tick: 'never',
    isDebuff: false,
    text: 'Whenever Guard absorbs damage from a hit, deal that much damage times {stacks} to the attacker.',
    hooks: {
      // One player hit per absorption, queued right after the absorbed hit (before the attack's next hit).
      onGuardAbsorbed: (ctx, info) => {
        if (typeof info.source !== 'number') return;
        ctx.queue([{ type: 'damage', amount: info.amount * ctx.stacks, target: 'target' }], { target: info.source });
      },
    },
    icon: 'status_reactive_plate',
  },
  {
    id: 'iron_rhythm',
    name: 'Iron Rhythm',
    stacks: 'amount',
    decay: 'end_player_turn',
    decayBy: 'all',
    tick: 'never',
    isDebuff: false,
    text: 'This turn, each Skill you play adds {stacks} Onslaught.',
    hooks: {
      // afterCardPlayed fires once the play has finished, so the Iron Rhythm that applied this counts itself.
      afterCardPlayed: (ctx, info) => {
        if (info.def.type !== 'skill') return;
        if (combatOf(ctx, 'iron_rhythm').outcome !== null) return;
        ctx.queue([{ type: 'status', target: 'self', id: ONSLAUGHT, amount: { scale: 'stacks' } }]);
      },
    },
    icon: 'status_iron_rhythm',
  },
  {
    id: 'guard_hold',
    name: 'Anneal',
    stacks: 'flag',
    // Guard halves at turn start step 1; start_player_turn decay is step 4, so the flag covers exactly one halving.
    decay: 'start_player_turn',
    tick: 'never',
    isDebuff: false,
    text: "Your Guard doesn't halve at the start of your next turn.",
    hooks: { guardDecay: () => 0 },
    icon: 'status_guard_hold',
  },
];

// ---------------------------------------------------------------------------
// Cards

const STARTERS: CardDef[] = [
  {
    id: 'hew', name: 'Hew', cls: 'breaker', type: 'attack', rarity: 'starter', cost: 1, target: 'enemy',
    text: 'Deal {damage} damage.',
    effects: [{ type: 'damage', amount: 6, target: 'target' }],
    upgrade: { effects: [{ type: 'damage', amount: 9, target: 'target' }] },
    icon: 'card_hew', tags: ['starter'],
  },
  {
    id: 'bulwark', name: 'Bulwark', cls: 'breaker', type: 'skill', rarity: 'starter', cost: 1, target: 'self',
    text: 'Gain {block} Block.',
    effects: [{ type: 'block', amount: 5 }],
    upgrade: { effects: [{ type: 'block', amount: 8 }] },
    icon: 'card_bulwark', tags: ['starter', 'block'],
  },
  {
    id: 'shoulder_check', name: 'Shoulder Check', cls: 'breaker', type: 'attack', rarity: 'starter', cost: 1, target: 'enemy',
    keywords: ['riposte'],
    text: 'Deal {damage} damage, +{damage_per} per Onslaught. Riposte: deal {rdamage} damage to the attacker.',
    effects: [{ type: 'damage', amount: perOnslaught(6, 2), target: 'target' }],
    riposte: [{ type: 'damage', amount: 6, target: 'attacker', key: 'rdamage' }],
    upgrade: {
      effects: [{ type: 'damage', amount: perOnslaught(8, 2), target: 'target' }],
      riposte: [{ type: 'damage', amount: 9, target: 'attacker', key: 'rdamage' }],
    },
    icon: 'card_shoulder_check', tags: ['starter', 'swing', 'riposte'],
  },
  {
    id: 'brace', name: 'Brace', cls: 'breaker', type: 'skill', rarity: 'starter', cost: 1, target: 'self',
    text: 'Gain {guard} Guard.',
    effects: [{ type: 'guard', amount: 5 }],
    upgrade: { effects: [{ type: 'guard', amount: 8 }] },
    icon: 'card_brace', tags: ['starter', 'guard'],
  },
];

const COMMONS: CardDef[] = [
  {
    id: 'piston_jab', name: 'Piston Jab', cls: 'breaker', type: 'attack', rarity: 'common', cost: 0, target: 'enemy',
    text: 'Deal {damage} damage, +{damage_per} per Onslaught.',
    effects: [{ type: 'damage', amount: perOnslaught(2, 1), target: 'target' }],
    upgrade: { effects: [{ type: 'damage', amount: perOnslaught(4, 1), target: 'target' }] },
    icon: 'card_piston_jab', tags: ['swing', 'cheap', 'scaling'],
  },
  {
    id: 'chain_driver', name: 'Chain Driver', cls: 'breaker', type: 'attack', rarity: 'common', cost: 1, target: 'enemy',
    values: CHAIN_DRIVER,
    text: 'Deal {damage} damage. If Onslaught ≥ {min}: draw {draw} card.',
    effects: [
      { type: 'damage', amount: 6, target: 'target' },
      { type: 'conditional', if: onslaughtAtLeast(CHAIN_DRIVER.min), then: [{ type: 'draw', n: 1 }] },
    ],
    upgrade: {
      effects: [
        { type: 'damage', amount: 9, target: 'target' },
        { type: 'conditional', if: onslaughtAtLeast(CHAIN_DRIVER.min), then: [{ type: 'draw', n: 1 }] },
      ],
    },
    icon: 'card_chain_driver', tags: ['swing', 'draw'],
  },
  {
    id: 'overhand_drive', name: 'Overhand Drive', cls: 'breaker', type: 'attack', rarity: 'common', cost: 2, target: 'enemy',
    text: 'Deal {damage} damage, +{damage_per} per Onslaught.',
    effects: [{ type: 'damage', amount: perOnslaught(5, 3), target: 'target' }],
    upgrade: { effects: [{ type: 'damage', amount: perOnslaught(5, 4), target: 'target' }] },
    icon: 'card_overhand_drive', tags: ['swing', 'finisher', 'scaling'],
  },
  {
    id: 'breach_hammer', name: 'Breach Hammer', cls: 'breaker', type: 'attack', rarity: 'common', cost: 1, target: 'enemy',
    text: 'Deal {damage} damage. Spend {spend} Onslaught: deal {sdamage} instead.',
    effects: [
      spendInstead(BREACH_HAMMER.spend, [{ type: 'damage', amount: 12, target: 'target', key: 'sdamage' }], [{ type: 'damage', amount: 6, target: 'target' }]),
    ],
    upgrade: {
      effects: [
        spendInstead(BREACH_HAMMER.spend, [{ type: 'damage', amount: 15, target: 'target', key: 'sdamage' }], [{ type: 'damage', amount: 8, target: 'target' }]),
      ],
    },
    icon: 'card_breach_hammer', tags: ['swing', 'finisher'],
  },
  {
    id: 'thresher_arc', name: 'Thresher Arc', cls: 'breaker', type: 'attack', rarity: 'common', cost: 1, target: 'all_enemies',
    text: 'Deal {damage} damage to ALL enemies, +{damage_per} per Onslaught.',
    effects: [{ type: 'damage', amount: perOnslaught(5, 1), target: 'all_enemies' }],
    upgrade: { effects: [{ type: 'damage', amount: perOnslaught(7, 1), target: 'all_enemies' }] },
    icon: 'card_thresher_arc', tags: ['swing', 'aoe'],
  },
  {
    id: 'fault_line', name: 'Fault Line', cls: 'breaker', type: 'attack', rarity: 'common', cost: 1, target: 'enemy',
    text: 'Apply {status} Exposed. Deal {damage} damage.',
    effects: [
      { type: 'status', target: 'target', id: 'exposed', amount: 1 },
      { type: 'damage', amount: 4, target: 'target' },
    ],
    upgrade: {
      effects: [
        { type: 'status', target: 'target', id: 'exposed', amount: 2 },
        { type: 'damage', amount: 4, target: 'target' },
      ],
    },
    icon: 'card_fault_line', tags: ['exposed', 'riposte'],
  },
  {
    id: 'rivet_flurry', name: 'Rivet Flurry', cls: 'breaker', type: 'attack', rarity: 'common', cost: 1, target: 'enemy',
    text: 'Deal {damage} damage {times} times.',
    effects: [{ type: 'damage', amount: 2, times: 4, target: 'target' }],
    upgrade: { effects: [{ type: 'damage', amount: 3, times: 4, target: 'target' }] },
    icon: 'card_rivet_flurry', tags: ['multihit', 'exposed'],
  },
  {
    id: 'counterweight', name: 'Counterweight', cls: 'breaker', type: 'attack', rarity: 'common', cost: 1, target: 'enemy',
    keywords: ['riposte'],
    text: 'Deal {damage} damage. Riposte: apply {rstatus} Stagger to the attacker.',
    effects: [{ type: 'damage', amount: 7, target: 'target' }],
    riposte: [{ type: 'status', target: 'attacker', id: 'stagger', amount: 3, key: 'rstatus' }],
    upgrade: {
      effects: [{ type: 'damage', amount: 9, target: 'target' }],
      riposte: [{ type: 'status', target: 'attacker', id: 'stagger', amount: 4, key: 'rstatus' }],
    },
    icon: 'card_counterweight', tags: ['riposte', 'stagger'],
  },
  {
    id: 'plate_ram', name: 'Plate Ram', cls: 'breaker', type: 'attack', rarity: 'common', cost: 1, target: 'enemy',
    values: PLATE_RAM,
    text: 'Deal {damage} damage. If your defence ≥ {min}: deal {cdamage} instead.',
    effects: [
      {
        type: 'conditional', if: { type: 'compare', left: { scale: 'defence' }, op: '>=', right: PLATE_RAM.min },
        then: [{ type: 'damage', amount: 9, target: 'target', key: 'cdamage' }],
        else: [{ type: 'damage', amount: 5, target: 'target' }],
      },
    ],
    upgrade: {
      effects: [
        {
          type: 'conditional', if: { type: 'compare', left: { scale: 'defence' }, op: '>=', right: PLATE_RAM.min },
          then: [{ type: 'damage', amount: 12, target: 'target', key: 'cdamage' }],
          else: [{ type: 'damage', amount: 7, target: 'target' }],
        },
      ],
    },
    icon: 'card_plate_ram', tags: ['guard', 'defence'],
  },
  {
    id: 'return_stroke', name: 'Return Stroke', cls: 'breaker', type: 'attack', rarity: 'common', cost: 1, target: 'enemy',
    keywords: ['riposte'],
    text: 'Deal {damage} damage. Riposte: deal {rdamage} damage to the attacker and gain {rstatus} Onslaught.',
    effects: [{ type: 'damage', amount: 7, target: 'target' }],
    riposte: [
      { type: 'damage', amount: 6, target: 'attacker', key: 'rdamage' },
      { type: 'status', target: 'self', id: ONSLAUGHT, amount: 1, key: 'rstatus' },
    ],
    upgrade: {
      effects: [{ type: 'damage', amount: 9, target: 'target' }],
      riposte: [
        { type: 'damage', amount: 8, target: 'attacker', key: 'rdamage' },
        { type: 'status', target: 'self', id: ONSLAUGHT, amount: 1, key: 'rstatus' },
      ],
    },
    icon: 'card_return_stroke', tags: ['riposte', 'swing'],
  },
  {
    id: 'gauntlet_tap', name: 'Gauntlet Tap', cls: 'breaker', type: 'attack', rarity: 'common', cost: 0, target: 'enemy',
    text: 'Deal {damage} damage. Gain {guard} Guard.',
    effects: [{ type: 'damage', amount: 2, target: 'target' }, { type: 'guard', amount: 2 }],
    upgrade: { effects: [{ type: 'damage', amount: 3, target: 'target' }, { type: 'guard', amount: 3 }] },
    icon: 'card_gauntlet_tap', tags: ['swing', 'guard', 'cheap'],
  },
  {
    id: 'catch_blade', name: 'Catch Blade', cls: 'breaker', type: 'skill', rarity: 'common', cost: 1, target: 'self',
    keywords: ['riposte'],
    text: 'Gain {block} Block. Riposte: gain {rguard_per} Guard for each hit of its attack.',
    effects: [{ type: 'block', amount: 6 }],
    riposte: [{ type: 'guard', amount: { base: 0, per: 4, scale: 'trigger_hits' }, key: 'rguard' }],
    upgrade: {
      effects: [{ type: 'block', amount: 8 }],
      riposte: [{ type: 'guard', amount: { base: 0, per: 5, scale: 'trigger_hits' }, key: 'rguard' }],
    },
    icon: 'card_catch_blade', tags: ['riposte', 'guard', 'multihit_answer'],
  },
  {
    id: 'cool_the_steel', name: 'Cool the Steel', cls: 'breaker', type: 'skill', rarity: 'common', cost: 1, target: 'self',
    text: 'Gain {guard} Guard, +{guard_per} per Onslaught.',
    effects: [{ type: 'guard', amount: perOnslaught(4, 2) }],
    upgrade: { effects: [{ type: 'guard', amount: perOnslaught(4, 3) }] },
    icon: 'card_cool_the_steel', tags: ['swing', 'guard'],
  },
  {
    id: 'find_the_seam', name: 'Find the Seam', cls: 'breaker', type: 'skill', rarity: 'common', cost: 0, target: 'enemy',
    text: 'Apply {status} Exposed.',
    effects: [{ type: 'status', target: 'target', id: 'exposed', amount: 1 }],
    upgrade: { effects: [{ type: 'status', target: 'target', id: 'exposed', amount: 2 }] },
    icon: 'card_find_the_seam', tags: ['exposed', 'cheap'],
  },
  {
    id: 'read_the_line', name: 'Read the Line', cls: 'breaker', type: 'skill', rarity: 'common', cost: 1, target: 'none',
    values: READ_THE_LINE,
    text: 'Draw {draw} cards. If Onslaught ≥ {min}: draw {draw2} more.',
    effects: [
      { type: 'draw', n: 2 },
      { type: 'conditional', if: onslaughtAtLeast(READ_THE_LINE.min), then: [{ type: 'draw', n: 1 }] },
    ],
    upgrade: {
      effects: [
        { type: 'draw', n: 3 },
        { type: 'conditional', if: onslaughtAtLeast(READ_THE_LINE.min), then: [{ type: 'draw', n: 1 }] },
      ],
    },
    icon: 'card_read_the_line', tags: ['draw', 'swing'],
  },
  {
    id: 'pivot_sweep', name: 'Pivot Sweep', cls: 'breaker', type: 'skill', rarity: 'common', cost: 1, target: 'self',
    keywords: ['riposte'],
    text: 'Gain {block} Block. Riposte: deal {rdamage} damage to ALL enemies.',
    effects: [{ type: 'block', amount: 6 }],
    riposte: [{ type: 'damage', amount: 6, target: 'all_enemies', key: 'rdamage' }],
    upgrade: {
      effects: [{ type: 'block', amount: 8 }],
      riposte: [{ type: 'damage', amount: 8, target: 'all_enemies', key: 'rdamage' }],
    },
    icon: 'card_pivot_sweep', tags: ['riposte', 'aoe'],
  },
  {
    id: 'rivet_wall', name: 'Rivet Wall', cls: 'breaker', type: 'skill', rarity: 'common', cost: 2, target: 'self',
    text: 'Gain {guard} Guard.',
    effects: [{ type: 'guard', amount: 14 }],
    upgrade: { effects: [{ type: 'guard', amount: 18 }] },
    icon: 'card_rivet_wall', tags: ['guard'],
  },
  {
    id: 'planted_feet', name: 'Planted Feet', cls: 'breaker', type: 'skill', rarity: 'common', cost: 1, target: 'self',
    values: PLANTED_FEET,
    text: 'Gain {block} Block. If you have {min} or more Guard: draw {draw} card.',
    effects: [
      { type: 'block', amount: 5 },
      { type: 'conditional', if: { type: 'compare', left: { scale: 'guard' }, op: '>=', right: PLANTED_FEET.min }, then: [{ type: 'draw', n: 1 }] },
    ],
    upgrade: {
      effects: [
        { type: 'block', amount: 7 },
        { type: 'conditional', if: { type: 'compare', left: { scale: 'guard' }, op: '>=', right: PLANTED_FEET.min }, then: [{ type: 'draw', n: 1 }] },
      ],
    },
    icon: 'card_planted_feet', tags: ['guard', 'draw', 'block'],
  },
  {
    id: 'loaded_spring', name: 'Loaded Spring', cls: 'breaker', type: 'skill', rarity: 'common', cost: 1, target: 'self',
    keywords: ['riposte'],
    text: 'Gain {guard} Guard. Riposte: gain {rguard} Guard and {rstatus} Onslaught.',
    effects: [{ type: 'guard', amount: 7 }],
    riposte: [
      { type: 'guard', amount: 4, key: 'rguard' },
      { type: 'status', target: 'self', id: ONSLAUGHT, amount: 2, key: 'rstatus' },
    ],
    upgrade: {
      effects: [{ type: 'guard', amount: 9 }],
      riposte: [
        { type: 'guard', amount: 5, key: 'rguard' },
        { type: 'status', target: 'self', id: ONSLAUGHT, amount: 3, key: 'rstatus' },
      ],
    },
    icon: 'card_loaded_spring', tags: ['riposte', 'swing', 'guard'],
  },
  {
    id: 'sabre_rattle', name: 'Sabre Rattle', cls: 'breaker', type: 'skill', rarity: 'common', cost: 1, target: 'all_enemies',
    text: 'Apply {status} Exposed to ALL enemies. Draw {draw} card.',
    effects: [{ type: 'status', target: 'all_enemies', id: 'exposed', amount: 1 }, { type: 'draw', n: 1 }],
    upgrade: { effects: [{ type: 'status', target: 'all_enemies', id: 'exposed', amount: 2 }, { type: 'draw', n: 1 }] },
    icon: 'card_sabre_rattle', tags: ['exposed', 'aoe', 'draw'],
  },
];

const UNCOMMONS: CardDef[] = [
  {
    id: 'hammerfall', name: 'Hammerfall', cls: 'breaker', type: 'attack', rarity: 'uncommon', cost: 2, target: 'enemy',
    keywords: ['retain'],
    text: 'Keep. Spend all Onslaught: deal {damage} damage, +{damage_per} per Onslaught spent.',
    effects: [{ type: 'spend_status', id: ONSLAUGHT, n: 'all', effects: [{ type: 'damage', amount: { base: 8, per: 4, scale: 'spent' }, target: 'target' }] }],
    upgrade: {
      effects: [{ type: 'spend_status', id: ONSLAUGHT, n: 'all', effects: [{ type: 'damage', amount: { base: 8, per: 5, scale: 'spent' }, target: 'target' }] }],
    },
    icon: 'card_hammerfall', tags: ['swing', 'finisher'],
  },
  {
    id: 'piston_volley', name: 'Piston Volley', cls: 'breaker', type: 'attack', rarity: 'uncommon', cost: 1, target: 'enemy',
    text: 'Deal {damage} damage, +{damage_per} per Onslaught, {times} times.',
    effects: [{ type: 'damage', amount: perOnslaught(3, 1), times: 2, target: 'target' }],
    upgrade: { effects: [{ type: 'damage', amount: perOnslaught(3, 1), times: 3, target: 'target' }] },
    icon: 'card_piston_volley', tags: ['swing', 'multihit', 'exposed'],
  },
  {
    id: 'answering_steel', name: 'Answering Steel', cls: 'breaker', type: 'attack', rarity: 'uncommon', cost: 1, target: 'enemy',
    keywords: ['riposte'],
    text: 'Deal {damage} damage. Riposte: deal {rdamage_per} damage to the attacker per hit of its attack.',
    effects: [{ type: 'damage', amount: 9, target: 'target' }],
    riposte: [{ type: 'damage', amount: { base: 0, per: 5, scale: 'trigger_hits' }, target: 'attacker', key: 'rdamage' }],
    upgrade: {
      effects: [{ type: 'damage', amount: 12, target: 'target' }],
      riposte: [{ type: 'damage', amount: { base: 0, per: 6, scale: 'trigger_hits' }, target: 'attacker', key: 'rdamage' }],
    },
    icon: 'card_answering_steel', tags: ['riposte', 'multihit_answer'],
  },
  {
    id: 'rampart_crash', name: 'Rampart Crash', cls: 'breaker', type: 'attack', rarity: 'uncommon', cost: 1, target: 'enemy',
    text: 'Deal {damage} damage, plus your Guard.',
    effects: [{ type: 'damage', amount: { base: 4, per: 1, scale: 'guard' }, target: 'target' }],
    upgrade: { effects: [{ type: 'damage', amount: { base: 7, per: 1, scale: 'guard' }, target: 'target' }] },
    icon: 'card_rampart_crash', tags: ['guard', 'scaling'],
  },
  {
    id: 'coiled_strike', name: 'Coiled Strike', cls: 'breaker', type: 'attack', rarity: 'uncommon', cost: 2, target: 'enemy',
    keywords: ['riposte'],
    text: 'Deal {damage} damage. Riposte: deal {rdamage} damage to the attacker.',
    effects: [{ type: 'damage', amount: 16, target: 'target' }],
    riposte: [{ type: 'damage', amount: 16, target: 'attacker', key: 'rdamage' }],
    upgrade: {
      effects: [{ type: 'damage', amount: 20, target: 'target' }],
      riposte: [{ type: 'damage', amount: 20, target: 'attacker', key: 'rdamage' }],
    },
    icon: 'card_coiled_strike', tags: ['riposte'],
  },
  {
    id: 'seam_ripper', name: 'Seam Ripper', cls: 'breaker', type: 'attack', rarity: 'uncommon', cost: 0, target: 'enemy',
    text: 'Deal {damage} damage. If the enemy has Exposed: draw {draw} card.',
    effects: [
      { type: 'damage', amount: 3, target: 'target' },
      { type: 'conditional', if: { type: 'has_status', who: 'target', id: 'exposed', min: 1 }, then: [{ type: 'draw', n: 1 }] },
    ],
    upgrade: {
      effects: [
        { type: 'damage', amount: 5, target: 'target' },
        { type: 'conditional', if: { type: 'has_status', who: 'target', id: 'exposed', min: 1 }, then: [{ type: 'draw', n: 1 }] },
      ],
    },
    icon: 'card_seam_ripper', tags: ['exposed', 'draw', 'cheap'],
  },
  {
    id: 'quake_hammer', name: 'Quake Hammer', cls: 'breaker', type: 'attack', rarity: 'uncommon', cost: 1, target: 'all_enemies',
    text: 'Deal {damage} damage to ALL enemies. Spend {spend} Onslaught: deal {sdamage} instead.',
    effects: [
      spendInstead(QUAKE_HAMMER.spend, [{ type: 'damage', amount: 12, target: 'all_enemies', key: 'sdamage' }], [{ type: 'damage', amount: 7, target: 'all_enemies' }]),
    ],
    upgrade: {
      effects: [
        spendInstead(QUAKE_HAMMER.spend, [{ type: 'damage', amount: 15, target: 'all_enemies', key: 'sdamage' }], [{ type: 'damage', amount: 9, target: 'all_enemies' }]),
      ],
    },
    icon: 'card_quake_hammer', tags: ['swing', 'aoe', 'finisher'],
  },
  {
    id: 'prism_edge', name: 'Prism Edge', cls: 'breaker', type: 'attack', rarity: 'uncommon', cost: 1, target: 'enemy',
    text: 'Deal {damage} damage, +{damage_per} per Shard you hold.',
    effects: [{ type: 'damage', amount: { base: 5, per: 2, scale: 'shards' }, target: 'target' }],
    upgrade: { effects: [{ type: 'damage', amount: { base: 5, per: 3, scale: 'shards' }, target: 'target' }] },
    icon: 'card_prism_edge', tags: ['shards', 'run'],
  },
  {
    id: 'feint_step', name: 'Feint Step', cls: 'breaker', type: 'skill', rarity: 'uncommon', cost: 0, target: 'self',
    keywords: ['riposte'],
    text: 'Gain {block} Block. Riposte: deal {rdamage} damage to the attacker.',
    effects: [{ type: 'block', amount: 4 }],
    riposte: [{ type: 'damage', amount: 5, target: 'attacker', key: 'rdamage' }],
    upgrade: {
      effects: [{ type: 'block', amount: 6 }],
      riposte: [{ type: 'damage', amount: 7, target: 'attacker', key: 'rdamage' }],
    },
    icon: 'card_feint_step', tags: ['riposte', 'cheap'],
  },
  {
    id: 'bind_the_blade', name: 'Bind the Blade', cls: 'breaker', type: 'skill', rarity: 'uncommon', cost: 1, target: 'enemy',
    keywords: ['riposte'],
    text: 'Apply {status} Stagger. Riposte: apply {rstatus} Stagger to the attacker and gain {rstatus2} Onslaught.',
    effects: [{ type: 'status', target: 'target', id: 'stagger', amount: 3 }],
    riposte: [
      { type: 'status', target: 'attacker', id: 'stagger', amount: 2, key: 'rstatus' },
      { type: 'status', target: 'self', id: ONSLAUGHT, amount: 2, key: 'rstatus2' },
    ],
    upgrade: {
      effects: [{ type: 'status', target: 'target', id: 'stagger', amount: 4 }],
      riposte: [
        { type: 'status', target: 'attacker', id: 'stagger', amount: 3, key: 'rstatus' },
        { type: 'status', target: 'self', id: ONSLAUGHT, amount: 3, key: 'rstatus2' },
      ],
    },
    icon: 'card_bind_the_blade', tags: ['riposte', 'stagger', 'swing'],
  },
  {
    id: 'anneal', name: 'Anneal', cls: 'breaker', type: 'skill', rarity: 'uncommon', cost: 1, target: 'self',
    text: "Gain {guard} Guard. Your Guard doesn't halve at the start of your next turn.",
    effects: [{ type: 'guard', amount: 3 }, selfStatus('guard_hold', 1)],
    upgrade: { effects: [{ type: 'guard', amount: 6 }, selfStatus('guard_hold', 1)] },
    icon: 'card_anneal', tags: ['guard', 'scaling'],
  },
  {
    id: 'quench', name: 'Quench', cls: 'breaker', type: 'skill', rarity: 'uncommon', cost: 1, target: 'self',
    text: 'Gain {guard} Guard. Spend {spend} Onslaught: gain {sguard} instead.',
    effects: [spendInstead(QUENCH.spend, [{ type: 'guard', amount: 12, key: 'sguard' }], [{ type: 'guard', amount: 5 }])],
    upgrade: { effects: [spendInstead(QUENCH.spend, [{ type: 'guard', amount: 15, key: 'sguard' }], [{ type: 'guard', amount: 7 }])] },
    icon: 'card_quench', tags: ['guard', 'swing'],
  },
  {
    id: 'ride_the_surge', name: 'Ride the Surge', cls: 'breaker', type: 'skill', rarity: 'uncommon', cost: 1, target: 'none',
    values: RIDE_THE_SURGE,
    text: 'Draw {draw} cards. If Onslaught ≥ {min}: gain {energy} energy.',
    effects: [
      { type: 'draw', n: 2 },
      { type: 'conditional', if: onslaughtAtLeast(RIDE_THE_SURGE.min), then: [{ type: 'energy', n: 1 }] },
    ],
    upgrade: {
      effects: [
        { type: 'draw', n: 3 },
        { type: 'conditional', if: onslaughtAtLeast(RIDE_THE_SURGE.min), then: [{ type: 'energy', n: 1 }] },
      ],
    },
    icon: 'card_ride_the_surge', tags: ['draw', 'energy', 'swing'],
  },
  {
    id: 'hairline_mark', name: 'Hairline Mark', cls: 'breaker', type: 'skill', rarity: 'uncommon', cost: 1, target: 'enemy',
    text: 'Apply {status} Exposed. Draw {draw} card.',
    effects: [{ type: 'status', target: 'target', id: 'exposed', amount: 2 }, { type: 'draw', n: 1 }],
    upgrade: { effects: [{ type: 'status', target: 'target', id: 'exposed', amount: 3 }, { type: 'draw', n: 1 }] },
    icon: 'card_hairline_mark', tags: ['exposed', 'draw'],
  },
  {
    id: 'read_the_blow', name: 'Read the Blow', cls: 'breaker', type: 'skill', rarity: 'uncommon', cost: 1, target: 'enemy',
    text: 'If it intends to attack: gain {guard} Guard, apply {status} Stagger. Else draw {draw} cards.',
    effects: [
      {
        type: 'conditional', if: { type: 'target_intends_attack' },
        then: [{ type: 'guard', amount: 8 }, { type: 'status', target: 'target', id: 'stagger', amount: 1 }],
        else: [{ type: 'draw', n: 2 }],
      },
    ],
    upgrade: {
      effects: [
        {
          type: 'conditional', if: { type: 'target_intends_attack' },
          then: [{ type: 'guard', amount: 11 }, { type: 'status', target: 'target', id: 'stagger', amount: 1 }],
          else: [{ type: 'draw', n: 3 }],
        },
      ],
    },
    icon: 'card_read_the_blow', tags: ['guard', 'stagger', 'draw'],
  },
  {
    // RULINGS 32: designer id `furnace_heart` (collides with the Act 2 boss).
    id: 'cinder_heart', name: 'Cinder Heart', cls: 'breaker', type: 'power', rarity: 'uncommon', cost: 1, target: 'self',
    text: 'At the start of your turn, gain {status} Onslaught.',
    effects: [selfStatus('cinder_heart', 1)],
    upgrade: { keywords: ['innate'], text: 'Opening. At the start of your turn, gain {status} Onslaught.' },
    icon: 'card_cinder_heart', tags: ['swing', 'scaling'],
  },
  {
    id: 'crossed_blades', name: 'Crossed Blades', cls: 'breaker', type: 'power', rarity: 'uncommon', cost: 1, target: 'self',
    text: 'You can prime {status} additional Riposte card.',
    effects: [selfStatus('riposte_capacity', 1)],
    upgrade: { cost: 0 },
    icon: 'card_crossed_blades', tags: ['riposte'],
  },
  {
    id: 'parry_ledger', name: 'Parry Ledger', cls: 'breaker', type: 'power', rarity: 'uncommon', cost: 1, target: 'self',
    text: 'Whenever one of your Ripostes triggers, draw {status} more card next turn.',
    effects: [selfStatus('parry_ledger', 1)],
    upgrade: { cost: 0 },
    icon: 'card_parry_ledger', tags: ['riposte', 'draw'],
  },
  {
    id: 'anvil_heart', name: 'Anvil Heart', cls: 'breaker', type: 'power', rarity: 'uncommon', cost: 1, target: 'self',
    text: 'When an enemy attack ends and you lost no HP to it, gain {status} Onslaught.',
    effects: [selfStatus('anvil_heart', 1)],
    upgrade: { cost: 0 },
    icon: 'card_anvil_heart', tags: ['guard', 'swing'],
  },
  {
    id: 'fault_reader', name: 'Fault Reader', cls: 'breaker', type: 'power', rarity: 'uncommon', cost: 1, target: 'self',
    text: 'At the start of your turn, apply {status} Exposed to the lowest-HP enemy.',
    effects: [selfStatus('fault_reader', 1)],
    upgrade: { keywords: ['innate'], text: 'Opening. At the start of your turn, apply {status} Exposed to the lowest-HP enemy.' },
    icon: 'card_fault_reader', tags: ['exposed'],
  },
];

const RARES: CardDef[] = [
  {
    id: 'jackhammer', name: 'Jackhammer', cls: 'breaker', type: 'attack', rarity: 'rare', cost: 1, target: 'enemy',
    text: 'Spend all Onslaught: deal {damage} damage, +{times_per} hit per Onslaught spent.',
    effects: [{ type: 'spend_status', id: ONSLAUGHT, n: 'all', effects: [{ type: 'damage', amount: 4, times: { base: 1, per: 1, scale: 'spent' }, target: 'target' }] }],
    upgrade: {
      effects: [{ type: 'spend_status', id: ONSLAUGHT, n: 'all', effects: [{ type: 'damage', amount: 5, times: { base: 1, per: 1, scale: 'spent' }, target: 'target' }] }],
    },
    icon: 'card_jackhammer', tags: ['swing', 'finisher', 'multihit', 'exposed'],
  },
  {
    id: 'steal_the_swing', name: 'Steal the Swing', cls: 'breaker', type: 'attack', rarity: 'rare', cost: 1, target: 'enemy',
    keywords: ['riposte', 'exhaust'],
    text: 'Scrap. Deal {damage} damage. Riposte: cancel the attack.',
    effects: [{ type: 'damage', amount: 10, target: 'target' }],
    riposte: [{ type: 'cancel_attack' }],
    upgrade: {
      text: 'Scrap. Deal {damage} damage. Riposte: cancel the attack, then deal {rdamage} damage to it.',
      effects: [{ type: 'damage', amount: 14, target: 'target' }],
      riposte: [{ type: 'cancel_attack' }, { type: 'damage', amount: 8, target: 'attacker', key: 'rdamage' }],
    },
    icon: 'card_steal_the_swing', tags: ['riposte', 'cancel'],
  },
  {
    id: 'iron_avalanche', name: 'Iron Avalanche', cls: 'breaker', type: 'attack', rarity: 'rare', cost: 2, target: 'all_enemies',
    keywords: ['retain'],
    text: 'Keep. Deal damage equal to your defence to ALL enemies. Lose all Guard.',
    effects: [
      { type: 'damage', amount: { base: 0, per: 1, scale: 'defence' }, target: 'all_enemies' },
      { type: 'lose_guard', amount: 'all' },
    ],
    upgrade: {
      text: 'Keep. Deal damage equal to your defence to ALL enemies. Lose all Guard. Gain {block} Block.',
      effects: [
        { type: 'damage', amount: { base: 0, per: 1, scale: 'defence' }, target: 'all_enemies' },
        { type: 'lose_guard', amount: 'all' },
        { type: 'block', amount: 8 },
      ],
    },
    icon: 'card_iron_avalanche', tags: ['guard', 'defence', 'aoe', 'finisher'],
  },
  {
    id: 'endless_maul', name: 'Endless Maul', cls: 'breaker', type: 'attack', rarity: 'rare', cost: 1, target: 'enemy',
    values: ENDLESS_MAUL,
    text: 'Deal {damage} damage, +{damage_per} per Onslaught. If Onslaught ≥ {min}: add a copy to your hand.',
    effects: [
      { type: 'damage', amount: perOnslaught(6, 2), target: 'target' },
      { type: 'conditional', if: onslaughtAtLeast(ENDLESS_MAUL.min), then: [{ type: 'add_card', card: 'endless_maul', to: 'hand' }] },
    ],
    upgrade: {
      effects: [
        { type: 'damage', amount: perOnslaught(8, 2), target: 'target' },
        { type: 'conditional', if: onslaughtAtLeast(ENDLESS_MAUL.min), then: [{ type: 'add_card', card: 'endless_maul', to: 'hand', upgraded: true }] },
      ],
    },
    icon: 'card_endless_maul', tags: ['swing', 'scaling'],
  },
  {
    // Designer: run counter `oath_onslaught` + custom `remove_self_from_deck` -> remove_card self, then the run flag
    // gated on removed_self (a cap_prune_away cut leaves the card in the deck and grants nothing permanent).
    id: 'forge_oath', name: 'Forge Oath', cls: 'breaker', type: 'skill', rarity: 'rare', cost: 0, target: 'self',
    keywords: ['exhaust'],
    text: 'Scrap. Gain {status} Onslaught. Remove this from your deck. Later combats start with {run_flag} more Onslaught.',
    effects: [
      selfStatus(ONSLAUGHT, 2),
      { type: 'remove_card', self: true },
      { type: 'conditional', if: { type: 'removed_self' }, then: [{ type: 'run_flag', key: FORGE_OATH_FLAG, delta: 2 }] },
    ],
    upgrade: {
      effects: [
        selfStatus(ONSLAUGHT, 3),
        { type: 'remove_card', self: true },
        { type: 'conditional', if: { type: 'removed_self' }, then: [{ type: 'run_flag', key: FORGE_OATH_FLAG, delta: 3 }] },
      ],
    },
    icon: 'card_forge_oath', tags: ['swing', 'run', 'removal'],
  },
  {
    // Designer: custom `prime_from_hand` -> the engine's `prime` primitive (rack capped at TUNING.caps.primeCapacity).
    id: 'en_garde', name: 'En Garde', cls: 'breaker', type: 'skill', rarity: 'rare', cost: 1, target: 'none',
    text: 'Prime up to {prime} Riposte cards from your hand now, past capacity.',
    effects: [{ type: 'prime', n: EN_GARDE.prime }],
    upgrade: {
      text: 'Draw {draw} card. Prime up to {prime} Riposte cards from your hand now, past capacity.',
      effects: [{ type: 'draw', n: 1 }, { type: 'prime', n: EN_GARDE.prime }],
    },
    icon: 'card_en_garde', tags: ['riposte'],
  },
  {
    id: 'vent_pressure', name: 'Vent Pressure', cls: 'breaker', type: 'skill', rarity: 'rare', cost: 1, target: 'none',
    text: 'Spend {spend} Onslaught: gain {energy} energy and draw {draw} cards.',
    effects: [{ type: 'spend_status', id: ONSLAUGHT, n: 4, effects: [{ type: 'energy', n: 2 }, { type: 'draw', n: 2 }] }],
    upgrade: { effects: [{ type: 'spend_status', id: ONSLAUGHT, n: 3, effects: [{ type: 'energy', n: 2 }, { type: 'draw', n: 2 }] }] },
    icon: 'card_vent_pressure', tags: ['swing', 'energy', 'draw'],
  },
  {
    id: 'iron_rhythm', name: 'Iron Rhythm', cls: 'breaker', type: 'skill', rarity: 'rare', cost: 1, target: 'none',
    text: 'Draw {draw} cards. This turn, Skills also add {status} Onslaught (this one too).',
    effects: [{ type: 'draw', n: 2 }, selfStatus('iron_rhythm', 1)],
    upgrade: { effects: [{ type: 'draw', n: 3 }, selfStatus('iron_rhythm', 1)] },
    icon: 'card_iron_rhythm', tags: ['swing', 'guard', 'draw'],
  },
  {
    id: 'shed_plating', name: 'Shed Plating', cls: 'breaker', type: 'skill', rarity: 'rare', cost: 0, target: 'self',
    text: 'If you have {lose_guard}+ Guard: lose {lose_guard}, gain {energy} energy, draw {draw} cards.',
    effects: [
      {
        type: 'conditional', if: { type: 'compare', left: { scale: 'guard' }, op: '>=', right: SHED_PLATING.guard },
        then: [{ type: 'lose_guard', amount: SHED_PLATING.guard }, { type: 'energy', n: 1 }, { type: 'draw', n: 2 }],
      },
    ],
    upgrade: {
      effects: [
        {
          type: 'conditional', if: { type: 'compare', left: { scale: 'guard' }, op: '>=', right: SHED_PLATING.guard },
          then: [{ type: 'lose_guard', amount: SHED_PLATING.guard }, { type: 'energy', n: 1 }, { type: 'draw', n: 3 }],
        },
      ],
    },
    icon: 'card_shed_plating', tags: ['guard', 'energy', 'draw'],
  },
  {
    id: 'smouldering_core', name: 'Smouldering Core', cls: 'breaker', type: 'power', rarity: 'rare', cost: 2, target: 'self',
    text: 'At the end of your turn, keep up to {status} Onslaught.',
    effects: [selfStatus('onslaught_keep', 4)],
    upgrade: { cost: 1 },
    icon: 'card_smouldering_core', tags: ['swing', 'scaling'],
  },
  {
    id: 'recoil_spring', name: 'Recoil Spring', cls: 'breaker', type: 'power', rarity: 'rare', cost: 1, target: 'self',
    text: 'When a primed card fires, it comes back to your hand next turn.',
    effects: [selfStatus('recoil_spring', 1)],
    upgrade: { cost: 0 },
    icon: 'card_recoil_spring', tags: ['riposte', 'draw'],
  },
  {
    id: 'reactive_plate', name: 'Reactive Plate', cls: 'breaker', type: 'power', rarity: 'rare', cost: 2, target: 'self',
    text: 'Whenever Guard absorbs damage from a hit, deal that much to the attacker.',
    effects: [selfStatus('reactive_plate', 1)],
    upgrade: { cost: 1 },
    icon: 'card_reactive_plate', tags: ['guard', 'damage'],
  },
];

export const BREAKER_CARDS: CardDef[] = [...STARTERS, ...COMMONS, ...UNCOMMONS, ...RARES];
