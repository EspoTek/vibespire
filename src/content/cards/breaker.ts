// REAL CONTENT: the Breaker class pool, v2 (docs/v2/breaker-design.md; kept cards are specified in
// docs/cards/breaker.md): 4 starters (GDD §4.1) + 20 common + 24 uncommon + 16 rare, and the Power /
// one-turn statuses. Engines (tags engine:*): furnace (Onslaught/Embers), crazing (Exposed x hits),
// counter (Riposte), bastion (Guard/Shed).
//
// Interpretations (see docs/RULINGS.md):
// - ruling 32: the Power `furnace_heart` is `cinder_heart` ("Cinder Heart"); the Act 2 boss keeps the id.
// - Steal the Swing uses the engine primitive `cancel_attack` (designer: custom fn of that name).
// - En Garde uses the engine primitive `prime {n}` (designer: custom `prime_from_hand`).
// - Condition thresholds live in per-card constants shared by the condition and the text `values`, so the
//   text can never drift from the rule.
import type { CardDef, Condition, Effect, HookCtx, ScaledAmount, StatusDef } from '../../engine/types';

const ONSLAUGHT = 'onslaught';
const EMBERS = 'embers';

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
/** "Deal X. Shed N: deal Y instead." (Breaker v2) Always exactly one hit, like spendInstead. */
const shedInstead = (n: number, shed: Effect[], otherwise: Effect[]): Effect => ({
  type: 'conditional',
  if: { type: 'compare', left: { scale: 'guard' }, op: '>=', right: n },
  then: [{ type: 'shed', n, effects: shed }],
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
const PLATE_RAM = { shed: 4 };
const LOOSEN_STRAPS = { shed: 4 };
const SHED_PLATING = { shed: 6 };
/** Kindle: an Ember for every `every` Onslaught spent. */
const KINDLE = { every: 2 };
/** Bellows: Spending at least `min` Onslaught at once grants Embers. */
const BELLOWS = { min: 4 };
const READ_THE_LINE = { min: 3 };
const QUAKE_HAMMER = { spend: 3 };
const QUENCH = { spend: 2 };
const RIDE_THE_SURGE = { min: 3 };
const ENDLESS_MAUL = { min: 4 };
/** Vent Pressure: Spend all Onslaught for energy when you have at least this much. */
const VENT_PRESSURE = { min: 3 };
const EN_GARDE = { prime: 2 };

// ---------------------------------------------------------------------------
// Statuses (designer §D.2)

/** combat.counters key prefix marking a fired card for Recoil Spring (value 1; the uid follows). */
const RECOIL_MARK = 'recoil_spring_uid:';
/** combat.counters key: damageTaken at your last turn end (Anvil Heart). */
const ANVIL_MARK = 'anvil_heart_hp';

export const BREAKER_STATUSES: StatusDef[] = [
  {
    // Breaker v2 keyword (docs/v2/breaker-design.md §2.1). Replaces v1's `cinder_heart` status; cap TUNING.caps.status.embers.
    id: EMBERS,
    name: 'Embers',
    stacks: 'amount',
    decay: 'never',
    tick: 'never',
    isDebuff: false,
    text: 'At the start of your turn, gain {stacks} Onslaught.',
    triggers: { onTurnStart: [{ type: 'status', target: 'self', id: ONSLAUGHT, amount: { scale: 'stacks' } }] },
    // the conversion is a moment the renderer animates: announced before the queued Onslaught gain
    hooks: { onTurnStart: (c) => c.emit({ t: 'embers_converted', amount: c.stacks }) },
    icon: 'status_embers',
  },
  {
    id: 'bellows',
    name: 'Bellows',
    stacks: 'amount',
    decay: 'never',
    tick: 'never',
    isDebuff: false,
    values: BELLOWS,
    text: 'Whenever you Spend {min} or more Onslaught at once, gain {stacks} Ember(s).',
    hooks: {
      onStatusSpent: (ctx, info) => {
        if (info.id !== ONSLAUGHT || info.amount < BELLOWS.min) return;
        ctx.queue([{ type: 'status', target: 'self', id: EMBERS, amount: { scale: 'stacks' } }]);
      },
    },
    icon: 'status_bellows',
  },
  {
    id: 'crazing',
    name: 'Crazing',
    stacks: 'flag',
    decay: 'never',
    tick: 'never',
    isDebuff: false,
    text: "Exposed on enemies doesn't decay.",
    hooks: { keepEnemyStatus: (_ctx, _uid, id, stacks) => (id === 'exposed' ? stacks : 0) },
    icon: 'status_crazing',
  },
  {
    id: 'answer_in_kind',
    name: 'Answer in Kind',
    stacks: 'flag',
    decay: 'never',
    tick: 'never',
    isDebuff: false,
    text: 'When one of your Riposte cards fires, it also resolves its played effects.',
    hooks: { riposteResolvesPlayed: () => true },
    icon: 'status_answer_in_kind',
  },
  {
    id: 'molten_shell',
    name: 'Molten Shell',
    stacks: 'amount',
    decay: 'never',
    tick: 'never',
    isDebuff: false,
    text: 'Whenever you Shed Guard, deal that much damage times {stacks} to the enemy with the lowest HP.',
    hooks: {
      // One player hit per Shed (Exposed applies), queued after the Shed clause's own effects.
      onGuardShed: (ctx, info) => {
        ctx.queue([{ type: 'damage', amount: info.amount * ctx.stacks, target: 'lowest_hp_enemy' }]);
      },
    },
    icon: 'status_molten_shell',
  },
  {
    id: 'spark_gap',
    name: 'Spark Gap',
    stacks: 'amount',
    decay: 'never',
    tick: 'never',
    isDebuff: false,
    text: 'Whenever you Shed Guard, gain {stacks} Onslaught.',
    triggers: { onGuardShed: [{ type: 'status', target: 'self', id: ONSLAUGHT, amount: { scale: 'stacks' } }] },
    icon: 'status_spark_gap',
  },
  {
    id: 'iron_patience',
    name: 'Iron Patience',
    stacks: 'amount',
    decay: 'never',
    tick: 'never',
    isDebuff: false,
    text: 'At the end of your turn, gain {stacks} Guard for each unspent energy.',
    // stacks = Guard per unspent energy (the card applies 3, upgraded 4); player turn end step 1, before anything clears energy.
    amounts: {
      patience: (ctx) => {
        const c = ctx.combat;
        if (!c) throw new Error('iron_patience outside combat');
        const stacks = c.player.statuses.iron_patience;
        if (stacks === undefined) throw new Error('iron_patience amount without the status');
        return stacks * c.energy;
      },
    },
    triggers: { onTurnEnd: [{ type: 'guard', amount: { scale: { fn: 'patience' } } }] },
    icon: 'status_iron_patience',
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
    // Phase D: a clean enemy turn (no HP lost since your last turn ended) banks an Ember, so a defended long fight
    // ramps into damage. combat.counters[ANVIL_MARK] holds damageTaken at your last turn end.
    text: 'At the start of your turn, if you lost no HP since your last turn, gain {stacks} Ember(s).',
    hooks: {
      onTurnEnd: (ctx) => {
        const c = combatOf(ctx, 'anvil_heart');
        c.counters[ANVIL_MARK] = c.damageTaken;
      },
      onTurnStart: (ctx) => {
        const c = combatOf(ctx, 'anvil_heart');
        const mark = c.counters[ANVIL_MARK];
        // No mark yet: the Power was played this turn's start or not at all before a turn ended (nothing to compare).
        if (mark === undefined || c.damageTaken !== mark) return;
        ctx.queue([{ type: 'status', target: 'self', id: EMBERS, amount: { scale: 'stacks' } }]);
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
    text: 'When a primed card fires, it comes back to your hand next turn and is free to play that turn.',
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
        ctx.queue([{ type: 'fetch_card', from: 'discard', select: 'top', to: 'hand', n: back.length, costThisTurn: 0 }]);
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
      effects: [{ type: 'damage', amount: perOnslaught(8, 3), target: 'target' }],
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
    effects: [{ type: 'damage', amount: perOnslaught(3, 1), target: 'target' }],
    upgrade: { effects: [{ type: 'damage', amount: perOnslaught(5, 1), target: 'target' }] },
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
    id: 'breach_hammer', name: 'Breach Hammer', cls: 'breaker', type: 'attack', rarity: 'common', cost: 1, target: 'enemy',
    // v2 rework: Spend 2 Onslaught for cards (refill the chain) instead of a bigger hit.
    text: 'Deal {damage} damage. Spend {spend} Onslaught: draw {draw} cards.',
    effects: [
      { type: 'damage', amount: 7, target: 'target' },
      { type: 'spend_status', id: ONSLAUGHT, n: BREACH_HAMMER.spend, effects: [{ type: 'draw', n: 2 }] },
    ],
    upgrade: {
      effects: [
        { type: 'damage', amount: 10, target: 'target' },
        { type: 'spend_status', id: ONSLAUGHT, n: BREACH_HAMMER.spend, effects: [{ type: 'draw', n: 2 }] },
      ],
    },
    icon: 'card_breach_hammer', tags: ['swing', 'draw'],
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
    // Phase E floor: the crack also Staggers (a Crazing deck has no other defence while it assembles).
    text: 'Apply {status} Exposed and {status2} Stagger. Deal {damage} damage.',
    effects: [
      { type: 'status', target: 'target', id: 'exposed', amount: 1 },
      { type: 'status', target: 'target', id: 'stagger', amount: 1 },
      { type: 'damage', amount: 4, target: 'target' },
    ],
    upgrade: {
      effects: [
        { type: 'status', target: 'target', id: 'exposed', amount: 2 },
        { type: 'status', target: 'target', id: 'stagger', amount: 1 },
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
    // v2 rework: Shed Guard for the bigger hit (a Shed trigger for Molten Shell / Spark Gap).
    text: 'Deal {damage} damage. Shed {shed}: deal {sdamage} instead.',
    effects: [shedInstead(PLATE_RAM.shed, [{ type: 'damage', amount: 12, target: 'target', key: 'sdamage' }], [{ type: 'damage', amount: 6, target: 'target' }])],
    upgrade: {
      effects: [shedInstead(PLATE_RAM.shed, [{ type: 'damage', amount: 15, target: 'target', key: 'sdamage' }], [{ type: 'damage', amount: 8, target: 'target' }])],
    },
    icon: 'card_plate_ram', tags: ['guard', 'shed'],
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
    riposte: [{ type: 'guard', amount: { base: 0, per: 3, scale: 'trigger_hits' }, key: 'rguard' }],
    upgrade: {
      effects: [{ type: 'block', amount: 8 }],
      riposte: [{ type: 'guard', amount: { base: 0, per: 4, scale: 'trigger_hits' }, key: 'rguard' }],
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
    // v2 Phase C: cf Δwin −10 ±8 (significant) as a 1-cost draw. Now a 0-cost mid-chain refill (Furnace glue).
    id: 'read_the_line', name: 'Read the Line', cls: 'breaker', type: 'skill', rarity: 'common', cost: 0, target: 'none',
    values: READ_THE_LINE,
    text: 'Draw {draw} card. If Onslaught ≥ {min}: draw {draw2} more.',
    effects: [
      { type: 'draw', n: 1 },
      { type: 'conditional', if: onslaughtAtLeast(READ_THE_LINE.min), then: [{ type: 'draw', n: 2 }] },
    ],
    upgrade: {
      text: 'Draw {draw} cards. If Onslaught ≥ {min}: draw {draw2} more.',
      effects: [
        { type: 'draw', n: 2 },
        { type: 'conditional', if: onslaughtAtLeast(READ_THE_LINE.min), then: [{ type: 'draw', n: 2 }] },
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
    id: 'loaded_spring', name: 'Loaded Spring', cls: 'breaker', type: 'skill', rarity: 'common', cost: 1, target: 'self',
    keywords: ['riposte'],
    text: 'Gain {guard} Guard. Riposte: gain {rguard} Guard and {rstatus} Onslaught.',
    effects: [{ type: 'guard', amount: 6 }],
    riposte: [
      { type: 'guard', amount: 3, key: 'rguard' },
      { type: 'status', target: 'self', id: ONSLAUGHT, amount: 2, key: 'rstatus' },
    ],
    upgrade: {
      effects: [{ type: 'guard', amount: 8 }],
      riposte: [
        { type: 'guard', amount: 4, key: 'rguard' },
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
  // --- v2 new commons (docs/v2/breaker-design.md §5.2)
  {
    id: 'stoke', name: 'Stoke', cls: 'breaker', type: 'skill', rarity: 'common', cost: 1, target: 'none',
    // Phase E floor: + Guard (a Furnace deck's turn without a payoff is not a dead turn).
    text: 'Gain {status} Onslaught and {guard} Guard. Draw {draw} card.',
    effects: [selfStatus(ONSLAUGHT, 2), { type: 'guard', amount: 2 }, { type: 'draw', n: 1 }],
    upgrade: { effects: [selfStatus(ONSLAUGHT, 3), { type: 'guard', amount: 3 }, { type: 'draw', n: 1 }] },
    icon: 'card_stoke', tags: ['swing', 'draw'],
  },
  {
    id: 'hair_trigger', name: 'Hair Trigger', cls: 'breaker', type: 'skill', rarity: 'common', cost: 0, target: 'none',
    keywords: ['riposte'],
    text: 'Draw {draw} card. Riposte: deal {rdamage} damage to the attacker.',
    effects: [{ type: 'draw', n: 1 }],
    // Phase F: Riposte 3/5 -> 2/4 (in 62% of spike decks; spike Breaker trim).
    riposte: [{ type: 'damage', amount: 2, target: 'attacker', key: 'rdamage' }],
    upgrade: { riposte: [{ type: 'damage', amount: 4, target: 'attacker', key: 'rdamage' }] },
    icon: 'card_hair_trigger', tags: ['riposte', 'cheap', 'draw'],
  },
  {
    // Phase F: an added copy was cf −19 ±13 (Δprog −5): as a free card the bot played it whenever it had Guard,
    // and the Shed stripped Guard it needed. Now it brings its own Guard, so it is Guard-neutral and always a
    // Shed trigger (Molten Shell, Spark Gap, Slag Bucket).
    id: 'loosen_straps', name: 'Loosen Straps', cls: 'breaker', type: 'skill', rarity: 'common', cost: 1, target: 'none',
    text: 'Gain {guard} Guard. Shed {shed}: draw {draw} cards.',
    effects: [{ type: 'guard', amount: 4 }, { type: 'shed', n: LOOSEN_STRAPS.shed, effects: [{ type: 'draw', n: 2 }] }],
    upgrade: { effects: [{ type: 'guard', amount: 4 }, { type: 'shed', n: LOOSEN_STRAPS.shed, effects: [{ type: 'draw', n: 3 }] }] },
    icon: 'card_loosen_straps', tags: ['guard', 'shed', 'draw', 'cheap'],
  },
];

const UNCOMMONS: CardDef[] = [
  {
    id: 'hammerfall', name: 'Hammerfall', cls: 'breaker', type: 'attack', rarity: 'uncommon', cost: 2, target: 'enemy',
    keywords: ['retain'],
    text: 'Keep. Spend all Onslaught: deal {damage} damage, +{damage_per} per Onslaught spent.',
    effects: [{ type: 'spend_status', id: ONSLAUGHT, n: 'all', effects: [{ type: 'damage', amount: { base: 8, per: 5, scale: 'spent' }, target: 'target' }] }],
    upgrade: {
      effects: [{ type: 'spend_status', id: ONSLAUGHT, n: 'all', effects: [{ type: 'damage', amount: { base: 8, per: 6, scale: 'spent' }, target: 'target' }] }],
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
    id: 'feint_step', name: 'Feint Step', cls: 'breaker', type: 'skill', rarity: 'uncommon', cost: 0, target: 'self',
    keywords: ['riposte'],
    text: 'Gain {block} Block. Riposte: deal {rdamage} damage to the attacker.',
    effects: [{ type: 'block', amount: 3 }],
    riposte: [{ type: 'damage', amount: 5, target: 'attacker', key: 'rdamage' }],
    upgrade: {
      effects: [{ type: 'block', amount: 5 }],
      riposte: [{ type: 'damage', amount: 7, target: 'attacker', key: 'rdamage' }],
    },
    icon: 'card_feint_step', tags: ['riposte', 'cheap'],
  },
  {
    id: 'bind_the_blade', name: 'Bind the Blade', cls: 'breaker', type: 'skill', rarity: 'uncommon', cost: 1, target: 'enemy',
    keywords: ['riposte'],
    text: 'Apply {status} Stagger. Riposte: apply {rstatus} Stagger to the attacker and gain {rstatus2} Onslaught.',
    effects: [{ type: 'status', target: 'target', id: 'stagger', amount: 2 }],
    riposte: [
      { type: 'status', target: 'attacker', id: 'stagger', amount: 2, key: 'rstatus' },
      { type: 'status', target: 'self', id: ONSLAUGHT, amount: 2, key: 'rstatus2' },
    ],
    upgrade: {
      effects: [{ type: 'status', target: 'target', id: 'stagger', amount: 3 }],
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
    // Phase E floor: + Stagger (spike's pick rate barely moved with it, 10% -> 11%; the Crazing johnny's did).
    text: 'Apply {status} Exposed and {status2} Stagger. Draw {draw} card.',
    effects: [{ type: 'status', target: 'target', id: 'exposed', amount: 2 }, { type: 'status', target: 'target', id: 'stagger', amount: 1 }, { type: 'draw', n: 1 }],
    upgrade: { effects: [{ type: 'status', target: 'target', id: 'exposed', amount: 3 }, { type: 'status', target: 'target', id: 'stagger', amount: 2 }, { type: 'draw', n: 1 }] },
    icon: 'card_hairline_mark', tags: ['exposed', 'draw'],
  },
  {
    id: 'read_the_blow', name: 'Read the Blow', cls: 'breaker', type: 'skill', rarity: 'uncommon', cost: 1, target: 'enemy',
    text: 'If it intends to attack: gain {guard} Guard, apply {status} Stagger. Else draw {draw} cards.',
    effects: [
      {
        type: 'conditional', if: { type: 'target_intends_attack' },
        then: [{ type: 'guard', amount: 6 }, { type: 'status', target: 'target', id: 'stagger', amount: 1 }],
        else: [{ type: 'draw', n: 2 }],
      },
    ],
    upgrade: {
      effects: [
        {
          type: 'conditional', if: { type: 'target_intends_attack' },
          then: [{ type: 'guard', amount: 9 }, { type: 'status', target: 'target', id: 'stagger', amount: 1 }],
          else: [{ type: 'draw', n: 3 }],
        },
      ],
    },
    icon: 'card_read_the_blow', tags: ['guard', 'stagger', 'draw'],
  },
  {
    // RULINGS 32: designer id `furnace_heart` (collides with the Act 2 boss).
    id: 'cinder_heart', name: 'Cinder Heart', cls: 'breaker', type: 'power', rarity: 'uncommon', cost: 1, target: 'self',
    // v2 rework: same behaviour, now through the Embers keyword (the status `cinder_heart` is gone).
    text: 'Gain {status} Ember.',
    effects: [selfStatus(EMBERS, 1)],
    upgrade: { keywords: ['innate'], text: 'Opening. Gain {status} Ember.' },
    icon: 'card_cinder_heart', tags: ['swing', 'scaling', 'embers'],
  },
  {
    id: 'crossed_blades', name: 'Crossed Blades', cls: 'breaker', type: 'power', rarity: 'uncommon', cost: 1, target: 'self',
    text: 'You can prime {status} additional Riposte card.',
    effects: [selfStatus('riposte_capacity', 1)],
    upgrade: { cost: 0 },
    icon: 'card_crossed_blades', tags: ['riposte'],
  },
  {
    // v2 Phase C made it free (cf Δprog −3.3 at cost 1); Phase D: back to cost 1, upgrade cost 0. At cost 0 it was in
    // 72% of spike decks (cf Δwin +11.5) and fed the defensive Counter stall that the Phase D A/B had to pull down.
    id: 'parry_ledger', name: 'Parry Ledger', cls: 'breaker', type: 'power', rarity: 'uncommon', cost: 1, target: 'self',
    text: 'Whenever one of your Ripostes triggers, draw {status} more card next turn.',
    effects: [selfStatus('parry_ledger', 1)],
    upgrade: { cost: 0 },
    icon: 'card_parry_ledger', tags: ['riposte', 'draw'],
  },
  {
    // v2 Phase C: cf Δprog −2.6 (significant): a 1-cost Power with no early payoff. Free now; the Onslaught it
    // banks on the enemy turn feeds next turn's Furnace finishers (Bastion → Furnace bridge). Upgrade: 2 per blocked attack.
    // Phase D: Embers instead of Onslaught (the Bastion/Counter -> Furnace ramp for long fights; notes-v2 item 6).
    id: 'anvil_heart', name: 'Anvil Heart', cls: 'breaker', type: 'power', rarity: 'uncommon', cost: 1, target: 'self',
    text: 'At the start of your turn, if you lost no HP since your last turn, gain {status} Ember.',
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
  // --- v2: moved down from rare and reworked
  {
    // The engine's `prime` primitive (rack capped at TUNING.caps.primeCapacity), then a card back.
    id: 'en_garde', name: 'En Garde', cls: 'breaker', type: 'skill', rarity: 'uncommon', cost: 1, target: 'none',
    text: 'Prime up to {prime} Riposte cards from your hand. Draw {draw} card.',
    effects: [{ type: 'prime', n: EN_GARDE.prime }, { type: 'draw', n: 1 }],
    upgrade: {
      text: 'Prime up to {prime} Riposte cards from your hand. Draw {draw} cards.',
      effects: [{ type: 'prime', n: EN_GARDE.prime }, { type: 'draw', n: 2 }],
    },
    icon: 'card_en_garde', tags: ['riposte', 'draw'],
  },
  {
    id: 'shed_plating', name: 'Shed Plating', cls: 'breaker', type: 'skill', rarity: 'uncommon', cost: 0, target: 'none',
    // Phase E floor: draws 1 even with no Guard to Shed.
    text: 'Draw {draw} card. Shed {shed}: gain {energy} energy and draw {draw2} more.',
    effects: [{ type: 'draw', n: 1 }, { type: 'shed', n: SHED_PLATING.shed, effects: [{ type: 'energy', n: 1 }, { type: 'draw', n: 1 }] }],
    upgrade: { effects: [{ type: 'draw', n: 1 }, { type: 'shed', n: SHED_PLATING.shed, effects: [{ type: 'energy', n: 1 }, { type: 'draw', n: 2 }] }] },
    icon: 'card_shed_plating', tags: ['guard', 'shed', 'energy', 'draw'],
  },
  // --- v2 new uncommons
  {
    id: 'kindle', name: 'Kindle', cls: 'breaker', type: 'skill', rarity: 'uncommon', cost: 1, target: 'none',
    values: KINDLE,
    text: 'Draw {draw} cards. Spend all Onslaught: gain an Ember for every {every} Onslaught spent.',
    // floor(spent / every) via per = 1 / every (exact for every Onslaught value up to the cap; tested).
    // Phase E floor: draws first, so it is never a blank turn-1 card.
    effects: [{ type: 'draw', n: 2 }, { type: 'spend_status', id: ONSLAUGHT, n: 'all', effects: [{ type: 'status', target: 'self', id: EMBERS, amount: { base: 0, per: 1 / KINDLE.every, scale: 'spent' } }] }],
    upgrade: { cost: 0 },
    icon: 'card_kindle', tags: ['swing', 'embers', 'scaling'],
  },
  {
    id: 'spark_gap', name: 'Spark Gap', cls: 'breaker', type: 'power', rarity: 'uncommon', cost: 1, target: 'self',
    text: 'Whenever you Shed Guard, gain {status} Onslaught.',
    effects: [selfStatus('spark_gap', 1)],
    upgrade: { cost: 0 },
    icon: 'card_spark_gap', tags: ['guard', 'shed', 'swing'],
  },
  {
    id: 'iron_patience', name: 'Iron Patience', cls: 'breaker', type: 'power', rarity: 'uncommon', cost: 1, target: 'self',
    text: 'At the end of your turn, gain {status} Guard for each unspent energy.',
    effects: [selfStatus('iron_patience', 1)],
    upgrade: { effects: [selfStatus('iron_patience', 2)] },
    icon: 'card_iron_patience', tags: ['guard', 'riposte'],
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
    // v2 rework: Shed all Guard (a Shed trigger); Block no longer counts.
    text: 'Keep. Shed all Guard: deal {damage} damage plus the Guard Shed to ALL enemies.',
    effects: [{ type: 'shed', n: 'all', effects: [{ type: 'damage', amount: { base: 5, per: 1, scale: 'shed' }, target: 'all_enemies' }] }],
    upgrade: {
      text: 'Keep. Shed all Guard: deal {damage} damage plus the Guard Shed to ALL enemies. Gain {block} Block.',
      effects: [
        { type: 'shed', n: 'all', effects: [{ type: 'damage', amount: { base: 5, per: 1, scale: 'shed' }, target: 'all_enemies' }] },
        { type: 'block', amount: 8 },
      ],
    },
    icon: 'card_iron_avalanche', tags: ['guard', 'shed', 'aoe', 'finisher'],
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
    // v2 Phase C: measured dead (plays/draw 0.04 over 6,236 draws: playing it removed it from the deck for good,
    // which neither bots nor most players will do). Now a 0-cost Embers starter for the Furnace engine.
    id: 'forge_oath', name: 'Forge Oath', cls: 'breaker', type: 'skill', rarity: 'rare', cost: 0, target: 'self',
    keywords: ['exhaust'],
    text: 'Scrap. Gain {status} Ember.',
    effects: [selfStatus(EMBERS, 1)],
    upgrade: {
      text: 'Scrap. Gain {status} Ember and {status2} Onslaught.',
      effects: [selfStatus(EMBERS, 1), selfStatus(ONSLAUGHT, 2)],
    },
    icon: 'card_forge_oath', tags: ['swing', 'embers'],
  },
  {
    // v2 Phase C: measured dead (plays/draw 0.14): "Spend 4" was rarely reachable from a Skill (mean Onslaught at
    // play 2.7) and did nothing otherwise. Now never dead (draw first) and the Spend is "all of it", so a long
    // chain becomes a second chain (and a Bellows trigger at 4+).
    id: 'vent_pressure', name: 'Vent Pressure', cls: 'breaker', type: 'skill', rarity: 'rare', cost: 1, target: 'none',
    values: VENT_PRESSURE,
    text: 'Draw {draw} cards. If Onslaught ≥ {min}: Spend all of it and gain {energy} energy.',
    effects: [
      { type: 'draw', n: 2 },
      { type: 'conditional', if: onslaughtAtLeast(VENT_PRESSURE.min), then: [{ type: 'spend_status', id: ONSLAUGHT, n: 'all', effects: [{ type: 'energy', n: 2 }] }] },
    ],
    upgrade: {
      effects: [
        { type: 'draw', n: 3 },
        { type: 'conditional', if: onslaughtAtLeast(VENT_PRESSURE.min), then: [{ type: 'spend_status', id: ONSLAUGHT, n: 'all', effects: [{ type: 'energy', n: 2 }] }] },
      ],
    },
    icon: 'card_vent_pressure', tags: ['swing', 'energy', 'draw'],
  },
  {
    id: 'iron_rhythm', name: 'Iron Rhythm', cls: 'breaker', type: 'skill', rarity: 'rare', cost: 0, target: 'none',
    text: 'Draw {draw} cards. This turn, Skills also add {status} Onslaught (this one too).',
    // Phase F: back to draw 2/3 and cost 0. At draw 1/2 an added copy was cf −11 (Δprog −7 **); at draw 2/3 and
    // cost 1 it still measured −15 to −20 (Δprog −5.7 to −5.9 **) in two runs.
    effects: [{ type: 'draw', n: 2 }, selfStatus('iron_rhythm', 1)],
    upgrade: { effects: [{ type: 'draw', n: 3 }, selfStatus('iron_rhythm', 1)] },
    icon: 'card_iron_rhythm', tags: ['swing', 'guard', 'draw'],
  },
  {
    id: 'smouldering_core', name: 'Smouldering Core', cls: 'breaker', type: 'power', rarity: 'rare', cost: 2, target: 'self',
    text: 'At the end of your turn, keep up to {status} Onslaught.',
    effects: [selfStatus('onslaught_keep', 4)],
    upgrade: { cost: 1 },
    icon: 'card_smouldering_core', tags: ['swing', 'scaling'],
  },
  {
    // v2 Phase C: cf Δprog −3.5 (significant). The returned card now costs 0 that turn, so a Riposte-dense deck
    // either replays its best parry for free or holds it again: a payoff Counter decks build toward.
    id: 'recoil_spring', name: 'Recoil Spring', cls: 'breaker', type: 'power', rarity: 'rare', cost: 1, target: 'self',
    // Phase E floor: draws a card on play.
    text: 'Draw {draw} card. When a primed card fires, it comes back to your hand next turn and is free to play that turn.',
    effects: [{ type: 'draw', n: 1 }, selfStatus('recoil_spring', 1)],
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
  // --- v2 new rares (docs/v2/breaker-design.md §5.4)
  {
    id: 'worldbreaker', name: 'Worldbreaker', cls: 'breaker', type: 'attack', rarity: 'rare', cost: 'X', target: 'enemy',
    text: 'Spend all Onslaught: deal {damage} damage, +{damage_per} per Onslaught spent, {times} times.',
    effects: [{ type: 'spend_status', id: ONSLAUGHT, n: 'all', effects: [{ type: 'damage', amount: { base: 4, per: 2, scale: 'spent' }, times: 'X', target: 'target' }] }],
    upgrade: {
      effects: [{ type: 'spend_status', id: ONSLAUGHT, n: 'all', effects: [{ type: 'damage', amount: { base: 4, per: 3, scale: 'spent' }, times: 'X', target: 'target' }] }],
    },
    icon: 'card_worldbreaker', tags: ['swing', 'finisher', 'multihit', 'x_cost'],
  },
  {
    id: 'turnabout', name: 'Turnabout', cls: 'breaker', type: 'skill', rarity: 'rare', cost: 2, target: 'self',
    keywords: ['riposte'],
    text: "Gain {block} Block. Riposte: deal damage equal to the attack's total damage to the attacker.",
    effects: [{ type: 'block', amount: 12 }],
    // The attacker's current intent (per-hit × hits, already with your Stagger on it), read at declaration.
    riposte: [{ type: 'damage', amount: { scale: { intent_damage: 'target' } }, target: 'attacker', key: 'rdamage' }],
    upgrade: { effects: [{ type: 'block', amount: 16 }] },
    icon: 'card_turnabout', tags: ['riposte', 'block'],
  },
  {
    // Phase F: cost 1 -> 0 (an added copy was cf −17 ±12: tempo). Upgrade: 2 Embers on play.
    id: 'bellows', name: 'Bellows', cls: 'breaker', type: 'power', rarity: 'rare', cost: 0, target: 'self',
    values: BELLOWS,
    // Phase E floor: it lights the fire it fans (1 Ember now).
    // Phase F: replaces itself. Without the draw an added copy measured −5.4 ±4.0 floors; with it, ns in four rounds.
    text: 'Gain {status} Ember. Draw {draw} card. Whenever you Spend {min} or more Onslaught at once, gain another Ember.',
    effects: [selfStatus(EMBERS, 1), { type: 'draw', n: 1 }, selfStatus('bellows', 1)],
    upgrade: { text: 'Gain {status} Embers. Draw {draw} card. Whenever you Spend {min} or more Onslaught at once, gain another Ember.', effects: [selfStatus(EMBERS, 2), { type: 'draw', n: 1 }, selfStatus('bellows', 1)] },
    icon: 'card_bellows', tags: ['swing', 'embers', 'scaling'],
  },
  {
    // Phase F: cost 2/1 -> 0, draws 1. An added copy was cf −18 ±11 at cost 2 and −5.8 ±4.0 floors at cost 1;
    // at cost 0 with the draw it measured 0.0, −6.7 and −3.3 (all ns) in three rounds.
    id: 'crazing', name: 'Crazing', cls: 'breaker', type: 'power', rarity: 'rare', cost: 0, target: 'self',
    // Phase E floor: it cracks every enemy as it lands.
    text: "Apply {status} Exposed to ALL enemies. Draw {draw} card. Exposed on enemies doesn't decay.",
    effects: [{ type: 'status', target: 'all_enemies', id: 'exposed', amount: 1 }, { type: 'draw', n: 1 }, selfStatus('crazing', 1)],
    upgrade: { effects: [{ type: 'status', target: 'all_enemies', id: 'exposed', amount: 2 }, { type: 'draw', n: 1 }, selfStatus('crazing', 1)] },
    icon: 'card_crazing', tags: ['exposed', 'scaling'],
  },
  {
    id: 'answer_in_kind', name: 'Answer in Kind', cls: 'breaker', type: 'power', rarity: 'rare', cost: 2, target: 'self',
    // Phase E floor: +1 prime capacity, so it helps before the rack is full.
    text: 'You can prime {status} additional Riposte card. When one of your Riposte cards fires, it also resolves its played effects.',
    effects: [selfStatus('riposte_capacity', 1), selfStatus('answer_in_kind', 1)],
    upgrade: { cost: 1 },
    icon: 'card_answer_in_kind', tags: ['riposte'],
  },
  {
    // Phase F: cost 2/1 -> 1/0, 8 Guard, draws 1. Its counterfactual stayed negative at every strength tried
    // (cost 0 with 12 Guard included), so the harm is not its tempo; see docs/v2/breaker-design.md §16.
    id: 'molten_shell', name: 'Molten Shell', cls: 'breaker', type: 'power', rarity: 'rare', cost: 1, target: 'self',
    // Phase E floor: comes with a bank to Shed.
    text: 'Gain {guard} Guard. Draw {draw} card. Whenever you Shed Guard, deal that much damage to the enemy with the lowest HP.',
    effects: [{ type: 'guard', amount: 8 }, { type: 'draw', n: 1 }, selfStatus('molten_shell', 1)],
    upgrade: { cost: 0 },
    icon: 'card_molten_shell', tags: ['guard', 'shed', 'damage'],
  },
];

// ---------------------------------------------------------------------------
// Engine / role tags for the simulator (docs/v2/breaker-design.md §7 H12). Every card must have an entry.
type Eng = 'furnace' | 'crazing' | 'counter' | 'bastion';
type Role = 'enabler' | 'payoff' | 'multiplier' | 'bridge' | 'glue';
const ENGINE_ROLES: Record<string, [Eng[], Role]> = {
  hew: [[], 'glue'], bulwark: [[], 'glue'], shoulder_check: [['furnace', 'counter'], 'payoff'], brace: [['bastion'], 'enabler'],
  piston_jab: [['furnace', 'crazing'], 'enabler'], chain_driver: [['furnace'], 'glue'],
  breach_hammer: [['furnace'], 'glue'], thresher_arc: [['furnace', 'crazing'], 'payoff'], fault_line: [['crazing', 'counter'], 'enabler'],
  rivet_flurry: [['crazing'], 'payoff'], counterweight: [['counter'], 'enabler'], plate_ram: [['bastion'], 'payoff'],
  return_stroke: [['counter', 'furnace'], 'bridge'], gauntlet_tap: [['furnace', 'bastion'], 'enabler'], catch_blade: [['counter', 'bastion'], 'bridge'],
  cool_the_steel: [['furnace', 'bastion'], 'bridge'], read_the_line: [['furnace'], 'glue'],
  pivot_sweep: [['counter', 'crazing'], 'payoff'], rivet_wall: [['bastion'], 'enabler'],
  loaded_spring: [['counter', 'furnace', 'bastion'], 'bridge'], sabre_rattle: [['crazing'], 'enabler'], stoke: [['furnace'], 'enabler'],
  hair_trigger: [['counter'], 'enabler'], loosen_straps: [['bastion'], 'payoff'],
  hammerfall: [['furnace'], 'payoff'], piston_volley: [['furnace', 'crazing'], 'payoff'], answering_steel: [['counter'], 'payoff'],
  rampart_crash: [['bastion'], 'payoff'], coiled_strike: [['counter'], 'payoff'], seam_ripper: [['crazing'], 'glue'],
  quake_hammer: [['furnace', 'crazing'], 'payoff'], feint_step: [['counter'], 'enabler'],
  bind_the_blade: [['counter', 'furnace'], 'bridge'], anneal: [['bastion'], 'enabler'], quench: [['furnace', 'bastion'], 'bridge'],
  ride_the_surge: [['furnace'], 'glue'], hairline_mark: [['crazing'], 'enabler'], read_the_blow: [['bastion', 'counter'], 'enabler'],
  cinder_heart: [['furnace'], 'multiplier'], crossed_blades: [['counter'], 'enabler'], parry_ledger: [['counter'], 'payoff'],
  anvil_heart: [['bastion', 'furnace'], 'bridge'], fault_reader: [['crazing'], 'enabler'], en_garde: [['counter'], 'enabler'],
  shed_plating: [['bastion'], 'payoff'], kindle: [['furnace'], 'multiplier'], spark_gap: [['bastion', 'furnace'], 'bridge'],
  iron_patience: [['bastion', 'counter'], 'enabler'],
  jackhammer: [['furnace', 'crazing'], 'multiplier'], steal_the_swing: [['counter'], 'payoff'], iron_avalanche: [['bastion'], 'payoff'],
  endless_maul: [['furnace'], 'payoff'], forge_oath: [['furnace'], 'multiplier'], vent_pressure: [['furnace'], 'payoff'],
  iron_rhythm: [['furnace', 'bastion'], 'bridge'], smouldering_core: [['furnace'], 'multiplier'], recoil_spring: [['counter'], 'multiplier'],
  reactive_plate: [['bastion'], 'multiplier'], worldbreaker: [['furnace', 'crazing'], 'payoff'], turnabout: [['counter'], 'payoff'],
  bellows: [['furnace'], 'multiplier'], crazing: [['crazing'], 'multiplier'], answer_in_kind: [['counter'], 'multiplier'],
  molten_shell: [['bastion'], 'multiplier'],
};

function withEngineTags(def: CardDef): CardDef {
  const entry = ENGINE_ROLES[def.id];
  if (!entry) throw new Error(`breaker card ${def.id} has no engine/role tags (ENGINE_ROLES)`);
  const [engines, role] = entry;
  return { ...def, tags: [...(def.tags ?? []), ...engines.map((e) => `engine:${e}`), `role:${role}`] };
}

export const BREAKER_CARDS: CardDef[] = [...STARTERS, ...COMMONS, ...UNCOMMONS, ...RARES].map(withEngineTags);

// The tag table must match the pool exactly (Johnny bots read engine:* tags): a stale entry is a cut card.
for (const id of Object.keys(ENGINE_ROLES)) {
  if (!BREAKER_CARDS.some((c) => c.id === id)) throw new Error(`ENGINE_ROLES has '${id}', which is not in the Breaker pool`);
}
