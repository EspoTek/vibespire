// Bosses of all three acts and their minions: ENEMIES §1.3, §2.4, §3.3; encounters §1.4 / §2.5 / §3.4.
//
// AI purity (GDD §2.9): chooseMove reads only its EnemyAiCtx. Phases are sticky aiState set by HP hooks:
//   phase      current phase (never set = 1, ENEMIES §0.3 "phase = aiState.phase (default 1)")
//   p2 / p3    1 once that phase is reached (amounts scale on them; never set = 0)
//   p2_turn / p3_turn  the first round whose move is chosen in that phase (= intentTurn + 1 at the crossing),
//              so "cycle X from the next choice" is (forTurn - pN_turn) mod len, and a phase change never
//              rewrites the current intent (ENEMIES §0.3).
// Telegraphed schedules therefore come from forTurn / history only, which keeps forecasts exact.
import type { CombatState, Effect, EnemyAiCtx, EnemyDef, EnemyState, EntityRef, EncounterDef, HookCtx, StatusDef } from '../../engine/types';
import { getCardDef, getStatusDef } from '../registry';

const RAM = { charge: 27, grow: 4, break1: 20, break2: 24, rage2: 2 };
const ORCHID = { sow_n: 2, cap: 4, bloom_n: 3, quick: 1, ripen_step: 1, seeds: 10, nectar: 10, wilt: 3 };
const ASSEMBLER = { lay_n: 2, cap: 3, weld1: 1, weld2: 2, ready: 3, self: 1 };
const FURNACE = { heat1: 2, heat2: 3, heat_max: 15, bellows_heat: 2, melt_per: 3, vent: 1 };
const TRI = { brace: 8, overtime_might: 1 };
const SOV = { line: 60, line3: 40, crown: 3, anchor_rage: 2, rage_max: 12 };
const ARCH = { cap1: 6, cap2: 8, base_hits: 2, redact_pages: 1 };
const LEUK = { p2_hp: 320, p3_hp: 160, fever_per_ab: 2, strip: 4, seethe: 12, pitch: 3, fever_max: 9 };
/** Seething (shared anti-stall passive): Might gained per calm turn. The threshold is the status's stacks. */
const SEETHE = { might: 1 };

// ---------------------------------------------------------------------------
// helpers

type Ctxish = { readonly combat: CombatState | null; readonly owner: EntityRef };

function requireCombat(ctx: { readonly combat: CombatState | null }, what: string): CombatState {
  if (!ctx.combat) throw new Error(`${what} requires combat`);
  return ctx.combat;
}

function enemyByUid(combat: CombatState, uid: EntityRef, what: string): EnemyState {
  const e = combat.enemies.find((x) => x.uid === uid);
  if (!e) throw new Error(`${what}: no enemy with uid ${String(uid)}`);
  return e;
}

function ownEnemy(ctx: Ctxish, what: string): EnemyState {
  return enemyByUid(requireCombat(ctx, what), ctx.owner, what);
}

/** Living enemies of `id` (other packs never share these ids, so no leader filter is needed for bosses). */
function living(combat: CombatState, id: string): EnemyState[] {
  return combat.enemies.filter((e) => e.alive && e.id === id);
}

function phaseOf(c: EnemyAiCtx): number {
  // ENEMIES §0.3: phase defaults to 1 until an HP threshold sets it.
  return c.aiState.phase ?? 1;
}

/** The move at this choice of a cycle that starts at round `start`. */
function cycleAt(c: EnemyAiCtx, cycle: readonly string[], start: number): string {
  const i = c.forTurn - start;
  if (i < 0) throw new Error(`${c.self.id}: cycle starts at round ${start} but choosing for round ${c.forTurn}`);
  const m = cycle[i % cycle.length];
  if (m === undefined) throw new Error(`${c.self.id}: empty cycle`);
  return m;
}

function phaseTurn(c: EnemyAiCtx, phase: 2 | 3): number {
  const t = c.aiState[`p${phase}_turn`];
  if (t === undefined) throw new Error(`${c.self.id}: in phase ${phase} without p${phase}_turn`);
  return t;
}

/**
 * A by-last state machine ('' = no move yet). `otherwise` covers a last move from another phase (the first
 * choice after a phase change) and any move the machine does not list.
 */
function byLast(c: EnemyAiCtx, rules: Readonly<Record<string, string>>, otherwise: string): string {
  return rules[c.lastMove() ?? ''] ?? otherwise;
}

/**
 * Sticky HP-threshold phases. `thresholds[k]` says whether phase k + 2 is reached. Records p<N> / p<N>_turn
 * for every phase entered (several at once if a big hit skips one). Returns the (new) phase.
 */
function updatePhase(ctx: HookCtx, e: EnemyState, thresholds: readonly ((e: EnemyState) => boolean)[]): number {
  const cur = e.aiState.phase ?? 1;
  let next = cur;
  thresholds.forEach((reached, k) => {
    if (reached(e)) next = Math.max(next, k + 2);
  });
  if (next === cur) return cur;
  const effects: Effect[] = [{ type: 'ai_state', key: 'phase', set: next }];
  for (let p = cur + 1; p <= next; p++) {
    effects.push({ type: 'ai_state', key: `p${p}`, set: 1 }, { type: 'ai_state', key: `p${p}_turn`, set: e.intentTurn + 1 });
  }
  ctx.now(effects);
  return next;
}

const halfHp = (e: EnemyState): boolean => e.hp * 2 <= e.maxHp;
const pctHp = (pct: number) => (e: EnemyState): boolean => e.hp * 100 <= e.maxHp * pct;

/** onHpLost hook for a boss whose only HP rule is its phases. */
function phaseHook(thresholds: readonly ((e: EnemyState) => boolean)[]) {
  return (ctx: HookCtx): void => {
    updatePhase(ctx, ownEnemy(ctx, 'phase hook'), thresholds);
  };
}

/** Put a hidden watcher status on the player (player-scoped hooks such as onShuffle / onCardExhausted). */
function watchPlayer(statusId: string) {
  return (ctx: HookCtx): void => ctx.now([{ type: 'status', target: 'target', id: statusId, amount: 1 }], { target: 'player' });
}

/** Debuff stacks on an enemy, largest first (ties: insertion order). */
function debuffsBySize(e: EnemyState, isDebuff: (id: string) => boolean): [string, number][] {
  return Object.entries(e.statuses).filter(([id, n]) => n > 0 && isDebuff(id)).sort((a, b) => b[1] - a[1]);
}

// ---------------------------------------------------------------------------

export const BOSSES: EnemyDef[] = [
  // ======================= Act 1 =======================
  {
    id: 'bramble_ram', name: 'Bramble Ram', boss: true, hp: [200, 210], icon: 'enemy_bramble_ram',
    spawnStatuses: { charge_meter: 1 }, values: RAM,
    // The renderer's "BREAK meter/break_at" reads aiState.meter and aiState.break_at.
    onSpawn: (ctx) => ctx.now([{ type: 'ai_state', key: 'break_at', set: RAM.break1 }, { type: 'ai_state', key: 'meter', set: 0 }]),
    amounts: {
      charge: (ctx) => {
        const e = enemyByUid(requireCombat(ctx, 'Bramble Charge'), ctx.frame.self, 'Bramble Charge');
        // aiState keys that were never set are 0 (engine convention).
        return RAM.charge + RAM.grow * (e.aiState.unbroken ?? 0) + (e.aiState.rage ?? 0);
      },
    },
    moves: {
      stomp: { name: 'Stomp', intent: 'attack_debuff', text: 'Deal {damage} damage. Apply {status} Exposed to you.',
        effects: [{ type: 'damage', amount: { base: 9, scale: { ai: 'rage' } }, target: 'target' }, { type: 'status', target: 'target', id: 'exposed', amount: 3 }] },
      thorn_volley: { name: 'Thorn Volley', intent: 'attack', text: 'Deal {damage} damage {times} times.',
        effects: [{ type: 'damage', amount: { base: 4, scale: { ai: 'rage' } }, times: 4, target: 'target' }] },
      lower_head: { name: 'Lower Head', intent: 'special', text: 'It lowers its head: its next move is Bramble Charge.', effects: [] },
      bramble_charge: { name: 'Bramble Charge', intent: 'attack',
        text: 'Deal {damage} damage; +{grow} for each Charge you did not break. Breaks if it loses {break1} HP during your turn ({break2} in phase 2).',
        effects: [{ type: 'damage', amount: { scale: { fn: 'charge' } }, target: 'target' }, { type: 'ai_state', key: 'unbroken', delta: 1 }] },
      stumble: { name: 'Stumble', intent: 'sleep', text: 'Its charge was broken. It does nothing.', effects: [] },
    },
    chooseMove: (c) => {
      if (phaseOf(c) === 1) {
        return byLast(c, { '': 'stomp', stomp: 'thorn_volley', thorn_volley: 'lower_head', lower_head: 'bramble_charge', bramble_charge: 'stomp', stumble: 'stomp' }, 'stomp');
      }
      return byLast(c, { lower_head: 'bramble_charge', bramble_charge: 'thorn_volley', stumble: 'thorn_volley' }, 'lower_head');
    },
  },
  {
    id: 'mother_orchid', name: 'Mother Orchid', boss: true, hp: [165, 175], icon: 'enemy_mother_orchid', values: ORCHID,
    // Phase D stall breaker: a finite Seed Bank (visible stacks) and a Nectar Feast that wilts with each use.
    spawnStatuses: { seed_bank: ORCHID.seeds },
    hooks: { onHpLost: phaseHook([halfHp]) },
    amounts: {
      nectar_heal: (ctx) => {
        const e = enemyByUid(requireCombat(ctx, 'Nectar Feast'), ctx.frame.self, 'Nectar Feast');
        return Math.max(0, ORCHID.nectar - ORCHID.wilt * (e.aiState.feasts ?? 0)); // never-set aiState is 0
      },
    },
    moves: {
      sow: { name: 'Sow', intent: 'special', text: 'Summons {sow_n} Orchid Buds from its Seed Bank (at most {cap} alive). They die with her.',
        effects: [{ type: 'custom', fn: 'sow' }] },
      // v2 scaling attack (stall breaker that does not punish mowing Buds): +1 per Vine Crush already used.
      vine_crush: { name: 'Vine Crush', intent: 'attack', text: 'Deal {damage} damage (+{damage_per} each use).',
        effects: [{ type: 'damage', amount: { base: 15, per: 1, scale: { ai: 'crushes' } }, target: 'target' }, { type: 'ai_state', key: 'crushes', delta: 1 }] },
      pollen_storm: { name: 'Pollen Storm', intent: 'attack_debuff', text: 'Deal {damage} damage {times} times. Apply {status} Stagger to you.',
        effects: [{ type: 'damage', amount: 6, times: 2, target: 'target' }, { type: 'status', target: 'target', id: 'stagger', amount: 2 }] },
      nectar: { name: 'Nectar Feast', intent: 'buff', text: 'Heal {heal} HP ({wilt} less each Feast). Every Bud is {ripen_step} turn closer to ripe.',
        effects: [{ type: 'heal', amount: { scale: { fn: 'nectar_heal' } } }, { type: 'ai_state', key: 'feasts', delta: 1 }, { type: 'custom', fn: 'ripen_buds' }] },
      full_bloom: { name: 'Full Bloom', intent: 'special', text: 'Summons {bloom_n} Orchid Buds from its Seed Bank that ripen after {quick} turn (at most {cap} alive).',
        effects: [{ type: 'custom', fn: 'full_bloom' }] },
    },
    chooseMove: (c) => {
      const buds = c.alliesAlive('orchid_bud');
      // Its own Seed Bank (an absent status is 0 stacks). Every rule that reads it follows a move that never sows,
      // so a planned-but-unresolved Sow can't make a forecast stale at Augury depth 3 or less.
      const seeds = (c.self.statuses.seed_bank ?? 0) > 0;
      const resow = buds <= 2 && seeds ? 'sow' : 'vine_crush';
      if (phaseOf(c) === 1) {
        return byLast(c, { '': seeds ? 'sow' : 'vine_crush', sow: 'vine_crush', vine_crush: 'pollen_storm', pollen_storm: 'nectar', nectar: resow }, 'vine_crush');
      }
      if (!c.history.includes('full_bloom') && seeds) return 'full_bloom';
      return byLast(c, { full_bloom: 'vine_crush', sow: 'vine_crush', vine_crush: 'pollen_storm', pollen_storm: resow }, 'vine_crush');
    },
    custom: {
      sow: (ctx) => sowFromBank(ctx, ORCHID.sow_n),
      ripen_buds: (ctx) => {
        for (const b of living(requireCombat(ctx, 'Nectar Feast'), 'orchid_bud')) {
          ctx.now([{ type: 'status', target: 'target', id: 'ripening', amount: -ORCHID.ripen_step }], { target: b.uid });
        }
      },
      full_bloom: (ctx) => {
        const combat = requireCombat(ctx, 'Full Bloom');
        const before = new Set(combat.enemies.map((e) => e.uid));
        sowFromBank(ctx, ORCHID.bloom_n);
        for (const b of combat.enemies.filter((e) => !before.has(e.uid))) {
          const left = (b.statuses.ripening ?? 0) - ORCHID.quick;
          ctx.now([{ type: 'status', target: 'target', id: 'ripening', amount: -left }], { target: b.uid });
        }
      },
    },
  },
  {
    id: 'orchid_bud', name: 'Orchid Bud', hp: [8, 10], icon: 'enemy_orchid_bud', onLeaderDeath: 'die', spawnStatuses: { ripening: 2 },
    moves: {
      ripen: { name: 'Ripening', intent: 'sleep', text: 'It ripens: {status_abs} turn closer to attacking.',
        effects: [{ type: 'status', target: 'self', id: 'ripening', amount: -1 }, { type: 'ai_state', key: 'ripens', delta: 1 }] },
      ripe_lash: { name: 'Ripe Lash', intent: 'attack', text: 'Deal {damage} damage {times} times.',
        effects: [{ type: 'damage', amount: 6, times: 2, target: 'target' }] },
    },
    chooseMove: (c) => {
      // Ripening still to come = its status minus planned-but-unresolved Ripens (the forecast appends the current
      // intent to history before its effects run). An absent status is 0 stacks; never-set aiState is 0.
      const planned = c.history.filter((m) => m === 'ripen').length - (c.aiState.ripens ?? 0);
      return (c.self.statuses.ripening ?? 0) - planned > 0 ? 'ripen' : 'ripe_lash';
    },
  },
  {
    id: 'gloam_empress', name: 'Gloam Empress', boss: true, hp: [205, 215], icon: 'enemy_gloam_empress',
    hooks: { onHpLost: phaseHook([halfHp]) },
    moves: {
      scale_dust: { name: 'Scale Dust', intent: 'debuff', text: 'Apply {status} Stagger to you. Gain {block} Block.',
        effects: [{ type: 'status', target: 'target', id: 'stagger', amount: 2 }, { type: 'block', amount: 12 }] },
      // Scaling attack: every Silk Cocoon adds a Wing Buffet hit for the rest of the fight.
      wing_buffet: { name: 'Wing Buffet', intent: 'attack', text: 'Deal {damage} damage {times} times (+{times_per} hit per Silk Cocoon so far).',
        effects: [{ type: 'damage', amount: 5, times: { base: 3, scale: { ai: 'cocooned' } }, target: 'target' }] },
      mothlight: { name: 'Mothlight', intent: 'attack_debuff', text: 'Deal {damage} damage. Apply {status} Exposed to you.',
        effects: [{ type: 'damage', amount: 14, target: 'target' }, { type: 'status', target: 'target', id: 'exposed', amount: 2 }] },
      silk_cocoon: { name: 'Silk Cocoon', intent: 'defend_buff', text: 'Gain {block} Block. Wing Buffet hits {ai_state} more time for the rest of the fight.',
        effects: [{ type: 'block', amount: 18 }, { type: 'ai_state', key: 'cocooned', delta: 1 }] },
      dust_storm: { name: 'Dust Storm', intent: 'attack_debuff', text: 'Deal {damage} damage {times} times. Apply {status} Stagger to you.',
        effects: [{ type: 'damage', amount: 4, times: 3, target: 'target' }, { type: 'status', target: 'target', id: 'stagger', amount: 2 }] },
    },
    chooseMove: (c) => {
      if (phaseOf(c) === 1) {
        return byLast(c, { '': 'scale_dust', silk_cocoon: 'scale_dust', scale_dust: 'wing_buffet', wing_buffet: 'mothlight', mothlight: 'silk_cocoon' }, 'scale_dust');
      }
      return byLast(c, { dust_storm: 'mothlight', mothlight: 'wing_buffet' }, 'dust_storm');
    },
  },

  // ======================= Act 2 =======================
  {
    id: 'grand_assembler', name: 'Grand Assembler', boss: true, hp: [290, 300], icon: 'enemy_grand_assembler', values: ASSEMBLER,
    hooks: { onHpLost: phaseHook([halfHp]) },
    moves: {
      lay_frame: { name: 'Lay Frame', intent: 'special', text: 'Summons {summon} Assembly Frames (at most {cap} minions alive). They die with it.',
        effects: [{ type: 'summon', enemy: 'assembly_frame', n: ASSEMBLER.lay_n, cap: ASSEMBLER.cap, withLeader: 'die' }] },
      weld: { name: 'Weld', intent: 'defend_buff',
        text: 'Every Frame gains {weld1} Progress ({weld2} in phase 2); at {ready} it becomes a Welded Horror. Gain {block} Block.',
        effects: [{ type: 'custom', fn: 'weld' }, { type: 'block', amount: 12 }] },
      torch_sweep: { name: 'Torch Sweep', intent: 'attack', text: 'Deal {damage} damage {times} times.', effects: [{ type: 'damage', amount: 7, times: 2, target: 'target' }] },
      girder_drop: { name: 'Girder Drop', intent: 'attack', text: 'Deal {damage} damage.', effects: [{ type: 'damage', amount: 20, target: 'target' }] },
      rush_order: { name: 'Rush Order', intent: 'special', text: 'Summons Assembly Frames until {summon} minions are alive.',
        effects: [{ type: 'summon', enemy: 'assembly_frame', fillTo: ASSEMBLER.cap, cap: ASSEMBLER.cap, withLeader: 'die' }] },
    },
    chooseMove: (c) => {
      if (phaseOf(c) === 1) {
        const minions = c.alliesAlive('assembly_frame') + c.alliesAlive('welded_horror');
        return byLast(c, { '': 'lay_frame', lay_frame: 'torch_sweep', torch_sweep: 'weld', weld: 'girder_drop', girder_drop: minions <= 1 ? 'lay_frame' : 'weld' }, 'torch_sweep');
      }
      if (!c.history.includes('rush_order')) return 'rush_order';
      return byLast(c, { rush_order: 'weld', girder_drop: 'weld', weld: 'torch_sweep', torch_sweep: 'girder_drop' }, 'weld');
    },
    custom: {
      weld: (ctx) => {
        const self = ownEnemy(ctx, 'Weld');
        const gain = (self.aiState.p2 ?? 0) > 0 ? ASSEMBLER.weld2 : ASSEMBLER.weld1;
        for (const f of living(requireCombat(ctx, 'Weld'), 'assembly_frame').filter((f) => f.leaderUid === self.uid)) {
          const add = Math.min(gain, ASSEMBLER.ready - (f.statuses.progress ?? 0));
          if (add > 0) ctx.now([{ type: 'status', target: 'target', id: 'progress', amount: add }], { target: f.uid });
        }
      },
    },
  },
  {
    id: 'assembly_frame', name: 'Assembly Frame', hp: [18, 22], icon: 'enemy_assembly_frame', onLeaderDeath: 'die', spawnStatuses: { assembly_line: 1 }, values: ASSEMBLER,
    // A timer: it builds itself, so a Frame left alone is a Welded Horror in a few turns (Progress shows the count).
    moves: { idle: { name: 'Assembling', intent: 'buff', text: 'It assembles itself: +{status} Progress.', effects: [{ type: 'status', target: 'self', id: 'progress', amount: ASSEMBLER.self }] } },
    chooseMove: () => 'idle',
  },
  {
    id: 'welded_horror', name: 'Welded Horror', hp: [38, 42], icon: 'enemy_welded_horror', onLeaderDeath: 'die',
    moves: {
      weld_claw: { name: 'Weld Claw', intent: 'attack', text: 'Deal {damage} damage {times} times.', effects: [{ type: 'damage', amount: 6, times: 2, target: 'target' }] },
      sear: { name: 'Sear', intent: 'attack_debuff', text: 'Deal {damage} damage. Shuffle {add_card} Backlash into your discard pile.',
        effects: [{ type: 'damage', amount: 11, target: 'target' }, { type: 'add_card', card: 'status_backlash', to: 'discard', n: 1 }] },
    },
    chooseMove: (c) => (c.lastMove() === 'weld_claw' ? 'sear' : 'weld_claw'),
  },
  {
    id: 'furnace_heart', name: 'Furnace Heart', boss: true, hp: [340, 360], icon: 'enemy_furnace_heart', values: FURNACE,
    spawnStatuses: { furnace_core: 1 },
    onSpawn: watchPlayer('furnace_vent'),
    hooks: { onHpLost: phaseHook([halfHp]) },
    moves: {
      slag_tide: { name: 'Slag Tide', intent: 'debuff', text: 'Shuffle {add_card} Backlash into your draw pile and add {add_card2} Jitter to your hand.',
        effects: [{ type: 'add_card', card: 'status_backlash', to: 'draw', n: { base: 2, scale: { ai: 'p2' } } }, { type: 'add_card', card: 'status_jitter', to: 'hand', n: 1 }] },
      crucible_swing: { name: 'Crucible Swing', intent: 'attack', text: 'Deal {damage} damage {times} times.',
        effects: [{ type: 'damage', amount: { base: 9, per: 2, scale: { ai: 'p2' } }, times: 2, target: 'target' }] },
      bellows_blast: { name: 'Bellows Blast', intent: 'attack_defend', text: 'Deal {damage} damage. Gain {block} Block. Heat +{bellows_heat}.',
        effects: [{ type: 'damage', amount: 14, target: 'target' }, { type: 'block', amount: 15 }, { type: 'custom', fn: 'bellows_heat' }] },
      meltdown: { name: 'Meltdown', intent: 'attack', text: 'Deal {damage} damage ({melt_per} per Heat). Then Heat drops to 0.',
        effects: [
          { type: 'damage', amount: { per: FURNACE.melt_per, scale: { status: 'heat', of: 'self' } }, target: 'target' },
          { type: 'status', target: 'self', id: 'heat', amount: { per: -1, scale: { status: 'heat', of: 'self' } } },
        ] },
    },
    chooseMove: (c) => {
      if (phaseOf(c) === 1) return cycleAt(c, ['slag_tide', 'crucible_swing', 'bellows_blast', 'crucible_swing', 'meltdown'], 1);
      return cycleAt(c, ['slag_tide', 'crucible_swing', 'bellows_blast', 'meltdown'], phaseTurn(c, 2));
    },
    custom: {
      bellows_heat: (ctx) => addHeat(ctx, ownEnemy(ctx, 'Bellows Blast'), FURNACE.bellows_heat),
    },
  },
  {
    id: 'trihammer', name: 'Trihammer', boss: true, hp: [240, 250], icon: 'enemy_trihammer', values: TRI,
    amounts: {
      trip_hits: (ctx) => 1 + living(requireCombat(ctx, 'Trip-Hammer'), 'trihammer_arm').filter((a) => a.leaderUid === ctx.frame.self).length,
    },
    moves: {
      overtime: { name: 'Overtime', intent: 'defend_buff', text: 'Every Arm gains {overtime_might} Might. Gain {block} Block.',
        effects: [{ type: 'custom', fn: 'overtime' }, { type: 'block', amount: 10 }] },
      trip_hammer: { name: 'Trip-Hammer', intent: 'attack', text: 'Deal {damage} damage {times} times (one more per living Arm).',
        effects: [{ type: 'damage', amount: 4, times: { scale: { fn: 'trip_hits' } }, target: 'target' }] },
      ground_quake: { name: 'Ground Quake', intent: 'attack_debuff', text: 'Deal {damage} damage. Apply {status} Exposed to you.',
        effects: [{ type: 'damage', amount: 14, target: 'target' }, { type: 'status', target: 'target', id: 'exposed', amount: 2 }] },
      grapple: { name: 'Grapple', intent: 'attack', text: 'Deal {damage} damage.', effects: [{ type: 'damage', amount: 20, target: 'target' }] },
      steam_vent: { name: 'Steam Vent', intent: 'attack_defend', text: 'Deal {damage} damage {times} times. Gain {block} Block.',
        effects: [{ type: 'damage', amount: 5, times: 3, target: 'target' }, { type: 'block', amount: 15 }] },
    },
    chooseMove: (c) => {
      if (c.alliesAlive('trihammer_arm') === 0) return c.lastMove() === 'grapple' ? 'steam_vent' : 'grapple';
      if (c.forTurn === 1) return 'overtime';
      return byLast(c, { overtime: 'trip_hammer', trip_hammer: 'ground_quake', ground_quake: 'overtime' }, 'overtime');
    },
    custom: {
      overtime: (ctx) => {
        for (const a of living(requireCombat(ctx, 'Overtime'), 'trihammer_arm').filter((a) => a.leaderUid === ctx.owner)) {
          ctx.now([{ type: 'status', target: 'target', id: 'might', amount: TRI.overtime_might }], { target: a.uid });
        }
      },
    },
  },
  {
    id: 'trihammer_arm', name: 'Trihammer Arm', hp: [32, 36], icon: 'enemy_trihammer_arm', onLeaderDeath: 'die', values: TRI,
    onSpawn: (ctx) => {
      const combat = requireCombat(ctx, 'Trihammer Arm');
      const slot = combat.enemies.filter((e) => e.id === 'trihammer_arm' && e.uid < Number(ctx.owner)).length;
      ctx.now([{ type: 'ai_state', key: 'slot', set: slot }]);
    },
    moves: {
      piston: { name: 'Piston Hammer', intent: 'attack', text: 'Deal {damage} damage {times} times.', effects: [{ type: 'damage', amount: 4, times: 2, target: 'target' }] },
      brace_frame: { name: 'Brace Frame', intent: 'buff', text: 'The Trihammer gains {brace} Block.', effects: [{ type: 'custom', fn: 'brace' }] },
    },
    // aiState.slot is set at spawn; a slotless arm (never spawned through onSpawn) counts as slot 0.
    chooseMove: (c) => ((c.forTurn + (c.aiState.slot ?? 0)) % 3 === 0 ? 'brace_frame' : 'piston'),
    custom: {
      brace: (ctx) => {
        const combat = requireCombat(ctx, 'Brace Frame');
        const arm = ownEnemy(ctx, 'Brace Frame');
        const body = combat.enemies.find((e) => e.uid === arm.leaderUid && e.alive);
        // Arms die with the body, so a missing body only happens to a leaderless arm: a legal wasted move.
        if (body) ctx.now([{ type: 'status', target: 'target', id: 'brace_transfer', amount: TRI.brace }], { target: body.uid });
      },
    },
  },

  // ======================= Act 3 =======================
  {
    id: 'tether_sovereign', name: 'Tether Sovereign', boss: true, hp: [530, 550], icon: 'enemy_tether_sovereign', values: SOV,
    spawnStatuses: { overflow: 1 },
    // Phase D: Rage is a visible status (Crown Rage, capped at rage_max) instead of hidden aiState.
    moves: {
      decree: { name: 'Decree of Gravity', intent: 'debuff', text: 'Apply {status} Exposed and {status2} Stagger to you. Gain {block} Block.',
        effects: [{ type: 'status', target: 'target', id: 'exposed', amount: 2 }, { type: 'status', target: 'target', id: 'stagger', amount: 2 }, { type: 'block', amount: 25 }] },
      tether_lash: { name: 'Tether Lash', intent: 'attack', text: 'Deal {damage} damage {times} times.',
        effects: [{ type: 'damage', amount: { base: 6, scale: { status: 'crown_rage', of: 'self' } }, times: 4, target: 'target' }] },
      anchor_drop: { name: 'Anchor Drop', intent: 'attack', text: 'Deal {damage} damage. In phase 3 its Crown Rage then rises by {anchor_rage} (at most {rage_max}).',
        effects: [
          { type: 'damage', amount: { base: 25, scale: { status: 'crown_rage', of: 'self' } }, target: 'target' },
          { type: 'conditional', if: { type: 'compare', left: { scale: { ai: 'p3' } }, op: '>=', right: 1 }, then: [{ type: 'status', target: 'self', id: 'crown_rage', amount: SOV.anchor_rage }] },
        ] },
      crownlight: { name: 'Crownlight', intent: 'buff', text: 'Crown Rage +{status} (at most {rage_max}): every hit of its attacks deals that much more.',
        effects: [{ type: 'status', target: 'self', id: 'crown_rage', amount: SOV.crown }] },
      starfall: { name: 'Starfall', intent: 'attack_debuff', text: 'Deal {damage} damage {times} times. Apply {status} Exposed to you.',
        effects: [{ type: 'damage', amount: { base: 9, scale: { status: 'crown_rage', of: 'self' } }, times: 3, target: 'target' }, { type: 'status', target: 'target', id: 'exposed', amount: 2 }] },
    },
    chooseMove: (c) => {
      const phase = phaseOf(c);
      if (phase === 1) return byLast(c, { '': 'decree', crownlight: 'decree', decree: 'tether_lash', tether_lash: 'anchor_drop', anchor_drop: 'crownlight' }, 'decree');
      if (phase === 2) return cycleAt(c, ['starfall', 'anchor_drop', 'decree', 'tether_lash'], phaseTurn(c, 2));
      return c.lastMove() === 'starfall' ? 'anchor_drop' : 'starfall';
    },
  },
  {
    id: 'star_archivist', name: 'Star Archivist', boss: true, hp: [510, 530], icon: 'enemy_star_archivist', values: ARCH,
    spawnStatuses: { catalogue: 1 },
    onSpawn: watchPlayer('catalogue_watch'),
    hooks: { onHpLost: phaseHook([halfHp]) },
    moves: {
      // Scaling attack: every Redact writes a Page, so Index Barrage grows even if you never reshuffle.
      redact: { name: 'Redact', intent: 'debuff', text: 'Apply {status} Exposed to you. Gain {block} Block. Write {redact_pages} Page.',
        effects: [{ type: 'status', target: 'target', id: 'exposed', amount: 2 }, { type: 'block', amount: 20 }, { type: 'custom', fn: 'write_page' }] },
      index_barrage: { name: 'Index Barrage', intent: 'attack', text: 'Deal {damage} damage {times} times ({base_hits} + one per Page).',
        effects: [{ type: 'damage', amount: 5, times: { base: ARCH.base_hits, scale: { status: 'archive_page', of: 'self' } }, target: 'target' }] },
      footnote: { name: 'Footnote', intent: 'attack', text: 'Deal {damage} damage.', effects: [{ type: 'damage', amount: 20, target: 'target' }] },
      errata: { name: 'Errata', intent: 'attack', text: 'Deal {damage} damage {times} times.', effects: [{ type: 'damage', amount: 12, times: 2, target: 'target' }] },
    },
    chooseMove: (c) => {
      if (phaseOf(c) === 1) return byLast(c, { '': 'redact', footnote: 'redact', redact: 'index_barrage', index_barrage: 'footnote' }, 'redact');
      return cycleAt(c, ['redact', 'index_barrage', 'errata', 'index_barrage'], phaseTurn(c, 2));
    },
    custom: {
      write_page: (ctx) => {
        const a = ownEnemy(ctx, 'Redact');
        writePages(ctx, a, ARCH.redact_pages);
      },
    },
  },
  {
    id: 'leukarch', name: 'Leukarch, the White Throne', boss: true, hp: [450, 470], icon: 'enemy_leukarch', values: LEUK,
    // Stall breaker (v2): a turtle that never makes it lose HP feeds its Might every turn.
    spawnStatuses: { seething: LEUK.seethe },
    hooks: { onHpLost: phaseHook([(e) => e.hp <= LEUK.p2_hp, (e) => e.hp <= LEUK.p3_hp]) },
    amounts: {
      // Cilia Storm hits 3 + phase times.
      storm_hits: (ctx) => {
        const e = enemyByUid(requireCombat(ctx, 'Cilia Storm'), ctx.frame.self, 'Cilia Storm');
        return 3 + (e.aiState.phase ?? 1);
      },
    },
    moves: {
      muster: { name: 'Muster', intent: 'special', text: 'Summons Antibodies until {summon2} are alive ({summon} from phase 2). They die with it.',
        effects: [{ type: 'conditional', if: { type: 'compare', left: { scale: { ai: 'p2' } }, op: '>=', right: 1 },
          then: [{ type: 'summon', enemy: 'antibody', fillTo: 3, cap: 3, withLeader: 'die' }],
          else: [{ type: 'summon', enemy: 'antibody', fillTo: 2, cap: 2, withLeader: 'die' }] }] },
      cilia_storm: { name: 'Cilia Storm', intent: 'attack', text: 'Deal {damage} damage {times} times (more hits each phase).',
        effects: [{ type: 'damage', amount: { base: 4, scale: { status: 'white_fever', of: 'self' } }, times: { scale: { fn: 'storm_hits' } }, target: 'target' }] },
      engulf: { name: 'Engulf', intent: 'attack', text: 'Deal {damage} damage.', effects: [{ type: 'damage', amount: { base: 24, scale: { status: 'white_fever', of: 'self' } }, target: 'target' }] },
      calcify: { name: 'Calcify', intent: 'defend', text: 'Gain {guard} Guard (+{guard_per} each use).',
        effects: [{ type: 'guard', amount: { base: 20, per: 5, scale: { ai: 'calcifies' } } }, { type: 'ai_state', key: 'calcifies', delta: 1 }] },
      consume: { name: 'Consume', intent: 'buff', text: 'Every Antibody dies. It gains {fever_per_ab} Fever per Antibody consumed (at most {fever_max}); every Fever adds damage to each hit.',
        effects: [{ type: 'custom', fn: 'consume' }] },
      fever_pitch: { name: 'Fever Pitch', intent: 'defend_buff', text: 'Fever +{status} (at most {fever_max}). Gain {block} Block.',
        effects: [{ type: 'status', target: 'self', id: 'white_fever', amount: LEUK.pitch }, { type: 'block', amount: 20 }] },
    },
    chooseMove: (c) => {
      const phase = phaseOf(c);
      const antibodies = c.alliesAlive('antibody');
      if (phase === 1) return byLast(c, { '': 'muster', muster: 'cilia_storm', cilia_storm: 'engulf', engulf: antibodies < 2 ? 'muster' : 'cilia_storm' }, 'muster');
      if (phase === 2) return byLast(c, { calcify: 'cilia_storm', cilia_storm: 'engulf', engulf: antibodies < 3 ? 'muster' : 'calcify' }, 'calcify');
      if (!c.history.includes('consume')) return 'consume';
      return byLast(c, { fever_pitch: 'cilia_storm', cilia_storm: 'engulf' }, 'fever_pitch');
    },
    custom: {
      consume: (ctx) => {
        const abs = living(requireCombat(ctx, 'Consume'), 'antibody').filter((a) => a.leaderUid === ctx.owner);
        // A real death (Rot spreads, on-kill effects fire), like dies_with_leader.
        for (const a of abs) ctx.now([{ type: 'lose_hp', amount: a.hp, target: 'target' }], { target: a.uid });
        if (abs.length > 0) ctx.now([{ type: 'status', target: 'self', id: 'white_fever', amount: LEUK.fever_per_ab * abs.length }]);
      },
    },
  },
  {
    id: 'antibody', name: 'Antibody', hp: [20, 24], icon: 'enemy_antibody', onLeaderDeath: 'die', values: LEUK,
    moves: {
      tag: { name: 'Tag', intent: 'attack_debuff', text: 'Deal {damage} damage. Apply {status} Exposed to you.',
        effects: [{ type: 'damage', amount: 5, target: 'target' }, { type: 'status', target: 'target', id: 'exposed', amount: 1 }] },
      opsonize: { name: 'Opsonize', intent: 'buff', text: 'The Leukarch loses up to {strip} debuff stacks, largest first.', effects: [{ type: 'custom', fn: 'opsonize' }] },
    },
    chooseMove: (c) => (c.lastMove() === 'tag' ? 'opsonize' : 'tag'),
    custom: {
      opsonize: (ctx) => {
        const combat = requireCombat(ctx, 'Opsonize');
        const ab = ownEnemy(ctx, 'Opsonize');
        const lord = combat.enemies.find((e) => e.uid === ab.leaderUid && e.alive);
        // Antibodies die with the Leukarch; a leaderless Antibody's Opsonize is a legal wasted move.
        if (!lord) return;
        let left = LEUK.strip;
        for (const [id, n] of debuffsBySize(lord, (id) => getStatusDef(id).isDebuff)) {
          if (left <= 0) break;
          const take = Math.min(n, left);
          ctx.now([{ type: 'status', target: 'target', id, amount: -take }], { target: lord.uid });
          left -= take;
        }
      },
    },
  },
];

/** Summon up to n Orchid Buds, paid from the owner's Seed Bank (the cap of 4 living Buds still applies). */
function sowFromBank(ctx: HookCtx, n: number): void {
  const combat = requireCombat(ctx, 'Seed Bank');
  const o = ownEnemy(ctx, 'Seed Bank');
  const bank = o.statuses.seed_bank ?? 0; // an absent status is 0 stacks
  const before = combat.enemies.length;
  ctx.now([{ type: 'summon', enemy: 'orchid_bud', n: Math.min(n, bank), cap: ORCHID.cap, withLeader: 'die' }]);
  const sown = combat.enemies.length - before;
  if (sown > 0) ctx.now([{ type: 'status', target: 'self', id: 'seed_bank', amount: -sown }]);
}

/** Heat on the Furnace Heart, clamped to its gauge (FURNACE.heat_max). */
function addHeat(ctx: HookCtx, furnace: EnemyState, n: number): void {
  const cur = furnace.statuses.heat ?? 0; // an absent status is 0 stacks
  const add = n > 0 ? Math.min(n, FURNACE.heat_max - cur) : Math.max(n, -cur);
  if (add !== 0) ctx.now([{ type: 'status', target: 'target', id: 'heat', amount: add }], { target: furnace.uid });
}

export const BOSS_STATUSES: StatusDef[] = [
  // --- Leukarch (Phase D: Fever made visible and capped)
  {
    id: 'white_fever', name: 'Fever', stacks: 'amount', decay: 'never', tick: 'never', isDebuff: false, values: LEUK, maxStacks: LEUK.fever_max,
    text: 'Each hit of its attacks deals {stacks} more damage. It rises {fever_per_ab} per Antibody consumed and {pitch} per pitch. At most {fever_max}.',
    icon: 'status_white_fever',
  },
  // --- Shared anti-stall passive (bosses and elites of every act): the stacks are the HP threshold.
  {
    id: 'seething', name: 'Seething', stacks: 'amount', decay: 'never', tick: 'end_own_turn', isDebuff: false, values: SEETHE,
    text: 'At the end of its turn, if it took less than {stacks} damage since its last turn, it gains {might} Might. Hits soaked by its Block or Guard still count.',
    hooks: {
      // Phase D fairness: count every hit in full (its own Block turns no longer feed it), plus non-hit HP loss (Rot).
      onDamageTaken: (ctx, info) => ctx.now([{ type: 'ai_state', key: 'seethe_lost', delta: info.amount }]),
      onHpLost: (ctx, info) => {
        if (!info.fromHit) ctx.now([{ type: 'ai_state', key: 'seethe_lost', delta: info.amount }]);
      },
      onTick: (ctx) => {
        const e = ownEnemy(ctx, 'Seething');
        const lost = e.aiState.seethe_lost ?? 0; // never-set aiState is 0 (engine convention)
        ctx.now([{ type: 'ai_state', key: 'seethe_lost', set: 0 }]);
        if (lost < ctx.stacks) ctx.now([{ type: 'status', target: 'self', id: 'might', amount: SEETHE.might }]);
      },
    },
    icon: 'status_seething',
  },
  // --- Bramble Ram
  {
    id: 'charge_meter', name: 'Charge Meter', stacks: 'flag', decay: 'never', tick: 'start_player_turn', isDebuff: false, values: RAM,
    text: 'While its intent is Bramble Charge, it counts the HP it loses during your turn (Block does not count). At {break1} ({break2} in phase 2) the charge breaks and it Stumbles.',
    hooks: {
      // The window opens at your turn start, before Timeline cards resolve (they count).
      onTick: (ctx) => ctx.now([{ type: 'ai_state', key: 'meter', set: 0 }]),
      onHpLost: (ctx, info) => {
        const e = ownEnemy(ctx, 'Charge Meter');
        const before = e.aiState.phase ?? 1;
        if (updatePhase(ctx, e, [halfHp]) === 2 && before === 1) {
          ctx.now([{ type: 'ai_state', key: 'rage', set: RAM.rage2 }, { type: 'ai_state', key: 'break_at', set: RAM.break2 }]);
        }
        const combat = requireCombat(ctx, 'Charge Meter');
        if (combat.turnPhase !== 'player' || e.intent.moveId !== 'bramble_charge' || e.hp <= 0) return;
        ctx.now([{ type: 'ai_state', key: 'meter', delta: info.amount }]);
        const breakAt = (e.aiState.p2 ?? 0) > 0 ? RAM.break2 : RAM.break1;
        if ((e.aiState.meter ?? 0) >= breakAt) {
          ctx.now([{ type: 'ai_state', key: 'meter', set: 0 }, { type: 'ai_state', key: 'broken', delta: 1 }]);
          ctx.setIntent('stumble');
        }
      },
    },
    icon: 'status_charge_meter',
  },
  // --- Mother Orchid
  {
    // Phase D stall breaker: Sow and Full Bloom draw on a finite bank.
    id: 'seed_bank', name: 'Seed Bank', stacks: 'amount', decay: 'never', tick: 'never', isDebuff: false, values: ORCHID,
    text: '{stacks} Buds left to sow. Each Bud she summons spends one; once the bank is empty she sows no more. Each Nectar Feast heals {wilt} less.',
    icon: 'status_seed_bank',
  },
  {
    id: 'ripening', name: 'Ripening', stacks: 'amount', decay: 'never', tick: 'never', isDebuff: false,
    text: 'Ripe in {stacks} turn(s). Then it attacks every turn.',
    icon: 'status_ripening',
  },
  // --- Grand Assembler
  {
    id: 'assembly_line', name: 'Assembly Line', stacks: 'flag', decay: 'never', tick: 'never', isDebuff: false, values: ASSEMBLER,
    text: 'It gains {self} Progress on each of its turns, and Weld adds more. At {ready} Progress it becomes a Welded Horror at full HP, at the end of that move.',
    hooks: {
      onEnemyMoveEnd: (ctx, info) => {
        const frame = ownEnemy(ctx, 'Assembly Line');
        if ((info.uid !== frame.leaderUid && info.uid !== frame.uid) || (frame.statuses.progress ?? 0) < ASSEMBLER.ready) return;
        ctx.now([
          { type: 'status', target: 'self', id: 'progress', amount: -ASSEMBLER.ready },
          { type: 'status', target: 'self', id: 'assembly_line', amount: -1 },
          { type: 'transform', into: 'welded_horror' },
        ]);
      },
    },
    icon: 'status_assembly_line',
  },
  {
    id: 'progress', name: 'Progress', stacks: 'amount', decay: 'never', tick: 'never', isDebuff: false, values: ASSEMBLER, maxStacks: ASSEMBLER.ready,
    text: 'Progress {stacks} of {ready}.',
    icon: 'status_progress',
  },
  // --- Furnace Heart
  {
    id: 'furnace_core', name: 'Furnace Core', stacks: 'flag', decay: 'never', tick: 'end_own_turn', isDebuff: false, values: FURNACE,
    text: 'Heat +{heat1} at the end of each of its turns ({heat2} in phase 2), up to {heat_max}. Each Status card you play or Scrap lowers Heat by {vent}. Meltdown deals {melt_per} per Heat.',
    hooks: {
      onTick: (ctx) => {
        const e = ownEnemy(ctx, 'Furnace Core');
        addHeat(ctx, e, (e.aiState.p2 ?? 0) > 0 ? FURNACE.heat2 : FURNACE.heat1);
      },
    },
    icon: 'status_furnace_core',
  },
  {
    id: 'heat', name: 'Heat', stacks: 'amount', decay: 'never', tick: 'never', isDebuff: false, values: FURNACE, maxStacks: FURNACE.heat_max,
    text: 'Heat {stacks} of {heat_max}. Meltdown deals {melt_per} per Heat.',
    icon: 'status_heat',
  },
  {
    // Player-side watcher: onCardExhausted is player-scoped, so the Furnace cannot hear Scraps itself.
    id: 'furnace_vent', name: 'Venting', stacks: 'flag', decay: 'never', tick: 'never', isDebuff: false, hidden: true, values: FURNACE,
    text: 'Each Status card you play or Scrap lowers the Furnace Heart\'s Heat by {vent}.',
    hooks: {
      onCardPlayed: (ctx, info) => {
        if (info.def.type === 'status') vent(ctx, info.card.uid);
      },
      onCardExhausted: (ctx, info) => {
        const combat = requireCombat(ctx, 'Venting');
        // A played status card that Scraps itself vents once (onCardPlayed already counted it).
        if (getCardDef(info.card.id, info.card.upgraded).type === 'status' && combat.counters.furnace_vented !== info.card.uid) vent(ctx, info.card.uid);
      },
    },
    icon: 'status_furnace_vent',
  },
  // --- Trihammer
  {
    // Relay: the Block is gained by the body itself (its own modifiers and onBlockGained apply), then removed.
    id: 'brace_transfer', name: 'Braced', stacks: 'amount', decay: 'never', tick: 'never', isDebuff: false, hidden: true,
    text: 'Gains {stacks} Block from an Arm.',
    hooks: {
      onApplied: (ctx) => ctx.now([{ type: 'block', amount: ctx.stacks }, { type: 'status', target: 'self', id: 'brace_transfer', amount: -ctx.stacks }]),
    },
    icon: 'status_brace_transfer',
  },
  // --- Tether Sovereign
  {
    id: 'crown_rage', name: 'Crown Rage', stacks: 'amount', decay: 'never', tick: 'never', isDebuff: false, values: SOV, maxStacks: SOV.rage_max,
    text: 'Each hit of its attacks deals {stacks} more damage. Crownlight adds {crown} (phase 1); in phase 3 each Anchor Drop adds {anchor_rage}. At most {rage_max}.',
    icon: 'status_crown_rage',
  },
  {
    id: 'overflow', name: 'Overflow', stacks: 'flag', decay: 'never', tick: 'start_player_turn', isDebuff: false, values: SOV,
    text: 'During your turn it loses at most {line} HP ({line3} in phase 3). The rest is stored as Overflow and lost at the end of its next turn, after its move and Rot.',
    hooks: {
      onTick: (ctx) => ctx.now([{ type: 'ai_state', key: 'lost_turn', set: 0 }]),
      // Step 7 deferral: never deletes damage, only delays it (ENEMIES §4.3 commandment 10).
      modifyHpLoss: (ctx, amount) => {
        const combat = requireCombat(ctx, 'Overflow');
        if (combat.turnPhase !== 'player') return amount;
        const e = enemyByUid(combat, ctx.owner, 'Overflow');
        const line = (e.aiState.p3 ?? 0) > 0 ? SOV.line3 : SOV.line;
        return Math.min(amount, Math.max(0, line - (e.aiState.lost_turn ?? 0)));
      },
      onDamageTaken: (ctx, info) => {
        const combat = requireCombat(ctx, 'Overflow');
        const e = enemyByUid(combat, ctx.owner, 'Overflow');
        if (combat.turnPhase !== 'player' || e.hp <= 0) return;
        const deferred = info.amount - info.blocked - info.guarded - info.hpLost;
        if (deferred > 0) ctx.now([{ type: 'status', target: 'self', id: 'overflow_stored', amount: deferred }]);
      },
      onHpLost: (ctx, info) => {
        const combat = requireCombat(ctx, 'Overflow');
        if (combat.turnPhase === 'player') ctx.now([{ type: 'ai_state', key: 'lost_turn', delta: info.amount }]);
        updatePhase(ctx, ownEnemy(ctx, 'Overflow'), [halfHp, pctHp(20)]);
      },
      // overflow_stored decays (all) at its own turn end, after its move and the Rot tick: that is the release.
      onStatusChanged: (ctx, info) => {
        if (info.id === 'overflow_stored' && info.delta < 0) ctx.queue([{ type: 'lose_hp', amount: -info.delta, target: 'self' }]);
      },
    },
    icon: 'status_overflow',
  },
  {
    id: 'overflow_stored', name: 'Stored Overflow', stacks: 'amount', decay: 'end_own_turn', decayBy: 'all', tick: 'never', isDebuff: false,
    text: '{stacks} HP of Overflow: lost at the end of its turn, after its move and Rot. Never blocked, healed or reduced.',
    icon: 'status_overflow_stored',
  },
  // --- Star Archivist
  {
    id: 'catalogue', name: 'Catalogue', stacks: 'flag', decay: 'never', tick: 'never', isDebuff: false, values: ARCH,
    text: 'Each time your discard pile is shuffled into your draw pile, and each time it Redacts, it writes a Page (at most {cap1}; {cap2} in phase 2). Index Barrage hits {base_hits} + Pages times.',
    icon: 'status_catalogue',
  },
  {
    id: 'archive_page', name: 'Pages', stacks: 'amount', decay: 'never', tick: 'never', isDebuff: false, values: ARCH, maxStacks: ARCH.cap2,
    text: '{stacks} Page(s): Index Barrage hits {base_hits} + Pages times.',
    icon: 'status_archive_page',
  },
  {
    // Player-side watcher: onShuffle is player-scoped. The combat-start shuffle fires no onShuffle.
    id: 'catalogue_watch', name: 'Catalogued', stacks: 'flag', decay: 'never', tick: 'never', isDebuff: false, hidden: true, values: ARCH,
    text: 'The Star Archivist writes a Page whenever your discard pile is shuffled into your draw pile.',
    hooks: {
      onShuffle: (ctx) => {
        for (const a of living(requireCombat(ctx, 'Catalogued'), 'star_archivist')) writePages(ctx, a, 1);
      },
    },
    icon: 'status_catalogue_watch',
  },
];

/** Add Pages to a Star Archivist, up to its phase cap. */
function writePages(ctx: HookCtx, a: EnemyState, n: number): void {
  const cap = (a.aiState.p2 ?? 0) > 0 ? ARCH.cap2 : ARCH.cap1;
  const add = Math.min(n, cap - (a.statuses.archive_page ?? 0)); // an absent status is 0 stacks
  if (add > 0) ctx.now([{ type: 'status', target: 'target', id: 'archive_page', amount: add }], { target: a.uid });
}

function vent(ctx: HookCtx, uid: number): void {
  const combat = requireCombat(ctx, 'Venting');
  // Content-owned combat counter (CombatState.counters allows content keys): the last status card vented.
  combat.counters.furnace_vented = uid;
  for (const f of living(combat, 'furnace_heart')) addHeat(ctx, f, -FURNACE.vent);
}

export const BOSS_ENCOUNTERS: EncounterDef[] = [
  { id: 'enc_a1_ram', name: 'Bramble Ram', acts: [1], pool: 'boss', weight: 1, enemies: ['bramble_ram'] },
  { id: 'enc_a1_orchid', name: 'Mother Orchid', acts: [1], pool: 'boss', weight: 1, enemies: ['mother_orchid'] },
  { id: 'enc_a1_empress', name: 'Gloam Empress', acts: [1], pool: 'boss', weight: 1, enemies: ['gloam_empress'] },
  { id: 'enc_a2_assembler', name: 'Grand Assembler', acts: [2], pool: 'boss', weight: 1, enemies: ['grand_assembler'] },
  { id: 'enc_a2_furnace', name: 'Furnace Heart', acts: [2], pool: 'boss', weight: 1, enemies: ['furnace_heart'] },
  // The body is listed first: a slot's leader must be an earlier slot, and Brace Frame's Block on the body
  // must come after the body's own turn-start Block reset (ENEMIES §2.4 lists the arms first).
  { id: 'enc_a2_trihammer', name: 'Trihammer', acts: [2], pool: 'boss', weight: 1, enemies: [
    'trihammer',
    { id: 'trihammer_arm', leader: 0, withLeader: 'die' },
    { id: 'trihammer_arm', leader: 0, withLeader: 'die' },
    { id: 'trihammer_arm', leader: 0, withLeader: 'die' },
  ] },
  { id: 'enc_a3_sovereign', name: 'Tether Sovereign', acts: [3], pool: 'boss', weight: 1, enemies: ['tether_sovereign'] },
  { id: 'enc_a3_archivist', name: 'Star Archivist', acts: [3], pool: 'boss', weight: 1, enemies: ['star_archivist'] },
  { id: 'enc_a3_leukarch', name: 'Leukarch, the White Throne', acts: [3], pool: 'boss', weight: 1, enemies: ['leukarch'] },
];
