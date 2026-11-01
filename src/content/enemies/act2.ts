import type { EffectCtx, EnemyDef, HookCtx, StatusDef, EncounterDef } from '../../engine/types';

const OVERCLOCK = { might: 2 };
const ANOINT = { heal: 6, scour: 4 };
const LOOM = { ward: 6, thread: 2 };
const INVENTORY = { perCards: 4, minHits: 2, maxHits: 8 };
const PRESSURE = { threshold: 30 };

function ownEnemy(ctx: HookCtx) {
  const enemy = ctx.combat?.enemies.find((e) => e.uid === ctx.owner);
  if (!enemy) throw new Error('Act 2 enemy hook requires its owner in combat');
  return enemy;
}

/** Resolve-time selection only: ally HP never participates in chooseMove. Ties go leftmost. */
function buffHighestAlly(ctx: EffectCtx): void {
  if (!ctx.combat) throw new Error('Overclock requires combat');
  const allies = ctx.combat.enemies.filter((e) => e.alive && e.uid !== ctx.owner);
  const best = allies.reduce<(typeof allies)[number] | undefined>((a, e) => !a || e.hp > a.hp ? e : a, undefined);
  if (best) ctx.now([{ type: 'status', target: 'target', id: 'might', amount: OVERCLOCK.might }], { target: best.uid });
}

export const ACT2_ENEMIES: EnemyDef[] = [
  {
    id: 'furnace_drone', name: 'Furnace Drone', hp: [34, 40], icon: 'enemy_furnace_drone',
    values: OVERCLOCK, custom: { buff_highest_ally: buffHighestAlly },
    onSpawn: (ctx) => {
      const e = ownEnemy(ctx);
      if (!ctx.combat) throw new Error('Furnace Drone spawn requires combat');
      ctx.now([{ type: 'ai_state', key: 'slot', set: ctx.combat.enemies.filter((a) => a.id === e.id && a.uid < e.uid).length }]);
    },
    moves: {
      scorch: { name: 'Scorch', intent: 'attack', text: 'Deal {damage} damage.', effects: [{ type: 'damage', amount: 10, target: 'target' }] },
      target_lock: { name: 'Target Lock', intent: 'debuff', text: 'Apply {status} Exposed.', effects: [{ type: 'status', target: 'target', id: 'exposed', amount: 2 }] },
      overclock: { name: 'Overclock', intent: 'buff', text: 'The other living enemy with the highest HP gains {might} Might.', effects: [{ type: 'custom', fn: 'buff_highest_ally' }] },
    },
    chooseMove: (c) => {
      const slot = c.aiState.slot ?? 0; // An uninitialised solitary spawn occupies slot zero.
      if (c.forTurn === 1) {
        if (slot % 3 === 2) return 'target_lock';
        return slot % 3 === 1 && c.alliesAlive() > 0 ? 'overclock' : 'scorch';
      }
      if (c.forTurn === 2 && slot === 0 && c.alliesAlive() > 0) return 'target_lock';
      return c.rng.weighted(([
        ['scorch', 50], ['target_lock', 30], ['overclock', 20],
      ] as const).filter(([m]) => m !== c.lastMove() && (m !== 'overclock' || c.alliesAlive() > 0)));
    },
  },
  {
    id: 'rivet_gnasher', name: 'Rivet Gnasher', hp: [28, 32], icon: 'enemy_rivet_gnasher',
    moves: {
      nip: { name: 'Nip', intent: 'attack', text: 'Deal {damage} damage {times} times.', effects: [{ type: 'damage', amount: 3, times: 3, target: 'target' }] },
      lunge: { name: 'Lunge', intent: 'attack', text: 'Deal {damage} damage.', effects: [{ type: 'damage', amount: 9, target: 'target' }] },
    },
    chooseMove: (c) => {
      if (c.timesInARow('nip') >= 2) return 'lunge';
      if (c.timesInARow('lunge') >= 2) return 'nip';
      return c.rng.weighted([['nip', c.forTurn === 1 ? 50 : 55], ['lunge', c.forTurn === 1 ? 50 : 45]]);
    },
  },
  {
    id: 'cog_acolyte', name: 'Cog Acolyte', hp: [46, 52], icon: 'enemy_cog_acolyte', spawnStatuses: { scour_rite: 1 },
    values: { ...OVERCLOCK, ...ANOINT },
    custom: {
      buff_highest_ally: buffHighestAlly,
      heal_other_allies: (ctx) => {
        if (!ctx.combat) throw new Error('Anoint requires combat');
        for (const e of ctx.combat.enemies.filter((a) => a.alive && a.uid !== ctx.owner)) {
          // An absent status is 0 stacks. The Acolyte never scours itself (Scour Rite says so).
          const rot = e.statuses.rot ?? 0;
          if (rot > 0) ctx.now([{ type: 'status', target: 'target', id: 'rot', amount: -Math.min(rot, ANOINT.scour) }], { target: e.uid });
          ctx.now([{ type: 'heal', amount: ANOINT.heal, target: 'target' }], { target: e.uid });
        }
      },
    },
    moves: {
      anoint: { name: 'Anoint', intent: 'buff', text: 'Every other living enemy loses up to {scour} Rot and heals {heal} HP.', effects: [{ type: 'custom', fn: 'heal_other_allies' }] },
      litany: { name: 'Litany of Iron', intent: 'defend', text: 'Every living enemy gains {block} Block.', effects: [{ type: 'block', amount: 9, target: 'all_allies' }] },
      zeal: { name: 'Zeal', intent: 'buff', text: 'The other living enemy with the highest HP gains {might} Might.', effects: [{ type: 'custom', fn: 'buff_highest_ally' }] },
      censer: { name: 'Censer Swing', intent: 'attack', text: 'Deal {damage} damage.', effects: [{ type: 'damage', amount: 9, target: 'target' }] },
    },
    chooseMove: (c) => {
      if (c.alliesAlive() === 0) return c.forTurn % 2 === 1 ? 'censer' : 'litany';
      if (c.forTurn % 4 === 1) return 'litany';
      return c.rng.weighted(([
        ['zeal', 35], ['anoint', 35], ['censer', 30],
      ] as const).filter(([m]) => m !== c.lastMove()));
    },
  },
  {
    id: 'riveter', name: 'Riveter', hp: [64, 70], icon: 'enemy_riveter',
    moves: {
      // Roster formula: 3 damage x (4 + loaded) hits; Reload adds two hits, not damage.
      rivet_burst: { name: 'Rivet Burst', intent: 'attack', text: 'Deal {damage} damage {times} times. Unload.', effects: [
        { type: 'damage', amount: 3, times: { base: 4, scale: { ai: 'loaded' } }, target: 'target' },
        { type: 'ai_state', key: 'loaded', set: 0 },
      ] },
      reload: { name: 'Reload', intent: 'defend_buff', text: 'Gain {block} Block. Load {ai_state} extra hits for the next Rivet Burst.', effects: [
        { type: 'block', amount: 12 }, { type: 'ai_state', key: 'loaded', set: 2 },
      ] },
      pin_down: { name: 'Pin Down', intent: 'attack_debuff', text: 'Deal {damage} damage. Apply {status} Stagger.', effects: [
        { type: 'damage', amount: 7, target: 'target' }, { type: 'status', target: 'target', id: 'stagger', amount: 2 },
      ] },
    },
    chooseMove: (c) => {
      if (c.forTurn === 1 || c.lastMove() === 'reload') return 'rivet_burst';
      return c.rng.weighted(([
        ['rivet_burst', 45], ['pin_down', 30], ['reload', 25],
      ] as const).filter(([m]) => m !== c.lastMove()));
    },
  },
  {
    id: 'slag_golem', name: 'Slag Golem', hp: [80, 86], icon: 'enemy_slag_golem',
    moves: {
      pour_slag: { name: 'Pour Slag', intent: 'debuff', text: 'Shuffle {add_card} Backlash into your draw pile. Gain {block} Block.', effects: [
        { type: 'add_card', card: 'status_backlash', to: 'draw', n: 2 }, { type: 'block', amount: 8 },
      ] },
      ingot_slam: { name: 'Ingot Slam', intent: 'attack', text: 'Deal {damage} damage.', effects: [{ type: 'damage', amount: 15, target: 'target' }] },
      cool_harden: { name: 'Cool and Harden', intent: 'defend', text: 'Gain {block} Block.', effects: [{ type: 'block', amount: 18 }] },
      spatter: { name: 'Spatter', intent: 'attack_debuff', text: 'Deal {damage} damage {times} times. Add {add_card} Jitter to your discard pile.', effects: [
        { type: 'damage', amount: 6, times: 2, target: 'target' }, { type: 'add_card', card: 'status_jitter', to: 'discard', n: 1 },
      ] },
    },
    chooseMove: (c) => {
      if (c.forTurn === 1) return 'pour_slag';
      return c.rng.weighted(([
        ['ingot_slam', 35], ['spatter', 30], ['cool_harden', 20], ['pour_slag', 15],
      ] as const).filter(([m]) => m !== c.lastMove() && (m !== 'pour_slag' || !c.history.slice(-2).includes(m))));
    },
  },
  {
    id: 'loom_oracle', name: 'Loom Oracle', hp: [58, 64], icon: 'enemy_loom_oracle', spawnStatuses: { sealed_pattern: 1 }, values: LOOM,
    moves: {
      shuttle_strike: { name: 'Shuttle Strike', intent: 'attack', augury: 'hidden', text: 'Deal {damage} damage {times} times.', effects: [{ type: 'damage', amount: 6, times: 2, target: 'target' }] },
      unravel: { name: 'Unravel', intent: 'attack', augury: 'hidden', text: 'Deal {damage} damage.', effects: [{ type: 'damage', amount: 14, target: 'target' }] },
      // Reacts to the Timeline: each card waiting on it is a thread the Oracle pulls into the Ward.
      weave_ward: { name: 'Weave Ward', intent: 'defend', augury: 'hidden', text: 'Every living enemy gains {block} Block ({block_base} + {block_per} per card on your Timeline).', effects: [{ type: 'block', amount: { base: LOOM.ward, per: LOOM.thread, scale: 'timeline_count' }, target: 'all_allies' }] },
      thread_snare: { name: 'Thread Snare', intent: 'debuff', augury: 'hidden', text: 'Apply {status} Stagger and {status2} Exposed.', effects: [
        { type: 'status', target: 'target', id: 'stagger', amount: 2 }, { type: 'status', target: 'target', id: 'exposed', amount: 2 },
      ] },
    },
    chooseMove: (c) => c.forTurn % 2 === 1
      ? c.rng.weighted([['shuttle_strike', 50], ['unravel', 50]])
      : c.rng.weighted([['weave_ward', 50], ['thread_snare', 50]]),
  },
  {
    id: 'the_auditor', name: 'The Auditor', hp: [150, 158], icon: 'enemy_the_auditor', spawnStatuses: { inventory: 1, seething: 15 },
    amounts: { ledger_hits: (ctx) => {
      if (!ctx.combat) throw new Error('Ledger Lash requires combat');
      return Math.max(INVENTORY.minHits, Math.min(INVENTORY.maxHits, Math.floor(ctx.combat.draw.length / INVENTORY.perCards)));
    } },
    moves: {
      ledger_lash: { name: 'Ledger Lash', intent: 'attack', text: 'Deal {damage} damage {times} times, based on your draw pile.', effects: [{ type: 'damage', amount: 5, times: { scale: { fn: 'ledger_hits' } }, target: 'target' }] },
      requisition: { name: 'Requisition', intent: 'debuff', text: 'Shuffle {add_card} Jitter into your draw pile.', effects: [{ type: 'add_card', card: 'status_jitter', to: 'draw', n: 3 }] },
      stamp: { name: 'Stamp', intent: 'attack_debuff', text: 'Deal {damage} damage. Apply {status} Exposed.', effects: [
        { type: 'damage', amount: 16, target: 'target' }, { type: 'status', target: 'target', id: 'exposed', amount: 2 },
      ] },
      recount: { name: 'Recount', intent: 'defend', text: 'Gain {block} Block.', effects: [{ type: 'block', amount: 20 }] },
    },
    chooseMove: (c) => {
      if (c.forTurn === 1) return 'requisition';
      if (c.forTurn === 2) return 'ledger_lash';
      return c.rng.weighted(([
        ['ledger_lash', 40], ['stamp', 30], ['requisition', 15], ['recount', 15],
      ] as const).filter(([m]) => m !== c.lastMove() && (m !== 'requisition' || !c.history.slice(-2).includes(m))));
    },
  },
  {
    id: 'anvil_warden', name: 'Anvil', hp: [88, 94], icon: 'enemy_anvil_warden', spawnStatuses: { bonded: 1 },
    moves: {
      temper: { name: 'Temper', intent: 'defend', text: 'Anvil and Hammer each gain {guard} Guard.', effects: [{ type: 'guard', amount: 10, target: 'all_allies' }] },
      ring_out: { name: 'Ring Out', intent: 'attack_debuff', text: 'Deal {damage} damage. Apply {status} Stagger.', effects: [
        { type: 'damage', amount: 10, target: 'target' }, { type: 'status', target: 'target', id: 'stagger', amount: 2 },
      ] },
      bulwark: { name: 'Bulwark', intent: 'defend', text: 'Gain {guard} Guard.', effects: [{ type: 'guard', amount: 20 }] },
      crush: { name: 'Crush', intent: 'attack_debuff', text: 'Deal {damage} damage. Apply {status} Exposed.', effects: [
        { type: 'damage', amount: 18, target: 'target' }, { type: 'status', target: 'target', id: 'exposed', amount: 2 },
      ] },
    },
    chooseMove: (c) => c.alliesAlive('hammer_warden') > 0
      ? (c.lastMove() === 'temper' ? 'ring_out' : 'temper')
      : (c.lastMove() === 'crush' ? 'bulwark' : 'crush'),
  },
  {
    id: 'hammer_warden', name: 'Hammer', hp: [72, 78], icon: 'enemy_hammer_warden', spawnStatuses: { bonded: 1 },
    amounts: { rapid_hits: (ctx) => {
      if (!ctx.combat) throw new Error('Rapid Strikes requires combat');
      return ctx.combat.enemies.some((e) => e.alive && e.id === 'anvil_warden' && e.uid !== ctx.frame.self) ? 4 : 6;
    } },
    moves: {
      hammerfall: { name: 'Hammerfall', intent: 'attack', text: 'Deal {damage} damage.', effects: [{ type: 'damage', amount: { base: 18, scale: { ai: 'rage' } }, target: 'target' }] },
      rapid_strikes: { name: 'Rapid Strikes', intent: 'attack', text: 'Deal {damage} damage {times} times.', effects: [{ type: 'damage', amount: { base: 4, scale: { ai: 'rage' } }, times: { scale: { fn: 'rapid_hits' } }, target: 'target' }] },
      wind_up: { name: 'Wind Up', intent: 'buff', text: 'Gain {ai_state} permanent rage, increasing damage per hit.', effects: [{ type: 'ai_state', key: 'rage', delta: 2 }] },
    },
    chooseMove: (c) => {
      if (c.alliesAlive('anvil_warden') === 0) return c.lastMove() === 'rapid_strikes' ? 'hammerfall' : 'rapid_strikes';
      if (c.forTurn === 1) return 'wind_up';
      return c.rng.weighted(([
        ['hammerfall', 40], ['rapid_strikes', 40], ['wind_up', 20],
      ] as const).filter(([m]) => m !== c.lastMove() && (m !== 'wind_up' || !c.history.slice(-3).includes(m))));
    },
  },
  {
    id: 'boiler_tyrant', name: 'Boiler Tyrant', hp: [150, 158], icon: 'enemy_boiler_tyrant', spawnStatuses: { overpressure: 1, seething: 12 },
    moves: {
      piston_punch: { name: 'Piston Punch', intent: 'attack', text: 'Deal {damage} damage.', effects: [{ type: 'damage', amount: { base: 14, scale: { ai: 'rage' } }, target: 'target' }] },
      steam_jet: { name: 'Steam Jet', intent: 'attack', text: 'Deal {damage} damage {times} times.', effects: [{ type: 'damage', amount: { base: 5, scale: { ai: 'rage' } }, times: 3, target: 'target' }] },
      stoke: { name: 'Stoke', intent: 'defend_buff', text: 'Gain {block} Block and {ai_state} permanent rage, increasing damage per hit.', effects: [{ type: 'block', amount: 14 }, { type: 'ai_state', key: 'rage', delta: 2 }] },
      blowout: { name: 'Blowout', intent: 'attack', text: 'Deal {damage} damage.', effects: [{ type: 'damage', amount: { base: 24, scale: { ai: 'rage' } }, target: 'target' }] },
    },
    chooseMove: (c) => {
      if (c.forTurn === 1) return 'stoke';
      return c.rng.weighted(([
        ['piston_punch', 40], ['steam_jet', 40], ['stoke', 20],
      ] as const).filter(([m]) => m !== c.lastMove() && (m !== 'stoke' || !c.history.slice(-3).includes(m))));
    },
  },
];

export const ACT2_STATUSES: StatusDef[] = [
  { id: 'scour_rite', name: 'Scour Rite', stacks: 'flag', decay: 'never', tick: 'never', isDebuff: false, values: ANOINT,
    text: 'Its Anoint washes up to {scour} Rot off every other enemy. It never scours itself: Rot it first.', icon: 'status_scour_rite' },
  { id: 'sealed_pattern', name: 'Sealed Pattern', stacks: 'flag', decay: 'never', tick: 'never', isDebuff: false,
    values: LOOM,
    text: 'Its forecast is always hidden. It alternates attacks on odd turns with non-attacks on even turns. Weave Ward gives {thread} more Block per card on your Timeline.', icon: 'status_sealed_pattern' },
  { id: 'inventory', name: 'Inventory', stacks: 'flag', decay: 'never', tick: 'never', isDebuff: false, values: INVENTORY,
    text: 'Ledger Lash hits once per {perCards} cards in your draw pile, rounded down; minimum {minHits}, maximum {maxHits}. Counted when it resolves.', icon: 'status_inventory' },
  { id: 'bonded', name: 'Bonded', stacks: 'flag', decay: 'never', tick: 'never', isDebuff: false,
    text: 'If its partner dies, it switches to its alone moves on its next choice.', icon: 'status_bonded' },
  { id: 'overpressure', name: 'Overpressure', stacks: 'flag', decay: 'never', tick: 'start_player_turn', isDebuff: false, values: PRESSURE,
    text: 'Counts HP lost during your turn, including Timeline resolutions. At {threshold}, replace its intent with Blowout, at most once per turn. Rot on its turn does not count.', icon: 'status_overpressure',
    hooks: {
      onTick: (ctx) => ctx.now([{ type: 'ai_state', key: 'pressure', set: 0 }, { type: 'ai_state', key: 'blown', set: 0 }]),
      onHpLost: (ctx, info) => {
        if (!ctx.combat || ctx.combat.turnPhase !== 'player') return;
        const e = ownEnemy(ctx);
        ctx.now([{ type: 'ai_state', key: 'pressure', delta: info.amount }]);
        if (e.hp > 0 && (e.aiState.pressure ?? 0) >= PRESSURE.threshold && (e.aiState.blown ?? 0) === 0) {
          ctx.now([{ type: 'ai_state', key: 'blown', set: 1 }]);
          ctx.setIntent('blowout');
        }
      },
    },
  },
];

export const ACT2_ENCOUNTERS: EncounterDef[] = [
  { id: 'enc_a2_rivet_pair', name: 'Rivet Pair', acts: [2], pool: 'easy', weight: 1, enemies: ['rivet_gnasher', 'rivet_gnasher'] },
  { id: 'enc_a2_drone_gnasher', name: 'Drone and Gnasher', acts: [2], pool: 'easy', weight: 1, enemies: ['furnace_drone', 'rivet_gnasher'] },
  { id: 'enc_a2_riveter', name: 'Riveter', acts: [2], pool: 'easy', weight: 1, enemies: ['riveter'] },
  { id: 'enc_a2_drone_riveter', name: 'Drone and Riveter', acts: [2], pool: 'hard', weight: 14, enemies: ['furnace_drone', 'riveter'] },
  { id: 'enc_a2_acolyte_golem', name: 'Acolyte and Golem', acts: [2], pool: 'hard', weight: 16, enemies: ['cog_acolyte', 'slag_golem'] },
  { id: 'enc_a2_oracle_pack', name: 'Oracle Pack', acts: [2], pool: 'hard', weight: 11, enemies: ['loom_oracle', 'rivet_gnasher', 'rivet_gnasher'] },
  { id: 'enc_a2_drone_trio', name: 'Furnace Drone Trio', acts: [2], pool: 'hard', weight: 16, enemies: ['furnace_drone', 'furnace_drone', 'furnace_drone'] },
  { id: 'enc_a2_acolyte_pack', name: 'Acolyte Pack', acts: [2], pool: 'hard', weight: 16, enemies: ['cog_acolyte', 'rivet_gnasher', 'rivet_gnasher'] },
  { id: 'enc_a2_golem_riveter', name: 'Golem and Riveter', acts: [2], pool: 'hard', weight: 14, enemies: ['slag_golem', 'riveter'] },
  { id: 'enc_a2_oracle_golem', name: 'Oracle and Golem', acts: [2], pool: 'hard', weight: 13, enemies: ['loom_oracle', 'slag_golem'] },
  { id: 'enc_a2_auditor', name: 'The Auditor', acts: [2], pool: 'elite', weight: 1, enemies: ['the_auditor'] },
  { id: 'enc_a2_anvil_hammer', name: 'Anvil and Hammer', acts: [2], pool: 'elite', weight: 1, enemies: ['anvil_warden', 'hammer_warden'] },
  { id: 'enc_a2_boiler', name: 'Boiler Tyrant', acts: [2], pool: 'elite', weight: 1, enemies: ['boiler_tyrant'] },
];
