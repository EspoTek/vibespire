// The Crown: ENEMIES §3.1 (normal enemies), §3.2 (elites) and §3.4 (encounters). Bosses live in bosses.ts.
//
// AI purity (GDD §2.9): every chooseMove below reads only its EnemyAiCtx (forTurn, history, own aiState /
// statuses, which allies are alive, its own rng). Anything that reacts to the player lives in move effects,
// amounts or passive hooks, so intents and forecasts stay exact.
import type { CombatState, EnemyAiCtx, EnemyDef, EnemyState, EntityRef, EncounterDef, StatusDef } from '../../engine/types';
import { getStatusDef } from '../registry';

// Numbers shared by effects, hooks and text (CLAUDE.md: text never carries hand-written numbers).
const RESONANCE = { after: 5, max: 5, per_card: 1 };
const CLEANSE = { cleanse_heal: 10 };
const MEND = { mend_heal: 18 };
const REFLECT = { min: 12, max: 40 };
const PHAGE = { bud_n: 2, cap: 4, age: 1, latch_base: 4, latch_per: 3 };
const HORIZON = { line: 15 };

type Weights = [string, number][];

/** Weighted draw from the enemy's own rng with `banned` moves removed (remaining weights renormalise, ENEMIES §0.3). */
function pick(c: EnemyAiCtx, weights: Weights, banned: readonly (string | null)[]): string {
  const left = weights.filter(([id]) => !banned.includes(id));
  if (left.length === 0) throw new Error(`${c.self.id}: no move left after removing ${banned.join(', ')}`);
  return c.rng.weighted(left);
}

/** The living enemy that owns a hook or custom effect. */
function ownEnemy(ctx: { readonly combat: CombatState | null; readonly owner: EntityRef }): EnemyState {
  const combat = ctx.combat;
  if (!combat) throw new Error('enemy hook outside combat');
  const e = combat.enemies.find((x) => x.uid === ctx.owner);
  if (!e) throw new Error(`enemy hook: no enemy with uid ${String(ctx.owner)}`);
  return e;
}

function requireCombat(ctx: { readonly combat: CombatState | null }, what: string): CombatState {
  if (!ctx.combat) throw new Error(`${what} requires combat`);
  return ctx.combat;
}

export const ACT3_ENEMIES: EnemyDef[] = [
  {
    id: 'void_mote', name: 'Void Mote', hp: [34, 40], icon: 'enemy_void_mote',
    moves: {
      null_pulse: { name: 'Null Pulse', intent: 'attack', text: 'Deal {damage} damage. Spends its Fold bonus.',
        effects: [{ type: 'damage', amount: { base: 11, scale: { ai: 'folded' } }, target: 'target' }, { type: 'ai_state', key: 'folded', set: 0 }] },
      fold: { name: 'Fold', intent: 'defend_buff', text: 'Gain {block} Block. Its next Null Pulse deals {ai_state} more damage.',
        effects: [{ type: 'block', amount: 12 }, { type: 'ai_state', key: 'folded', set: 4 }] },
      flicker: { name: 'Flicker', intent: 'attack', text: 'Deal {damage} damage {times} times.',
        effects: [{ type: 'damage', amount: 4, times: 3, target: 'target' }] },
    },
    chooseMove: (c) => {
      if (c.forTurn === 1 || c.lastMove() === 'fold') return 'null_pulse';
      return pick(c, [['null_pulse', 45], ['flicker', 35], ['fold', 20]], [c.lastMove()]);
    },
  },
  {
    id: 'shardling', name: 'Shardling', hp: [48, 54], icon: 'enemy_shardling',
    moves: {
      splinter_storm: { name: 'Splinter Storm', intent: 'attack', text: 'Deal {damage} damage {times} times. Spends its Refract bonus.',
        effects: [{ type: 'damage', amount: { base: 3, scale: { ai: 'refracted' } }, times: 6, target: 'target' }, { type: 'ai_state', key: 'refracted', set: 0 }] },
      refract: { name: 'Refract', intent: 'defend_buff', text: 'Gain {block} Block. Its next Splinter Storm deals {ai_state} more damage per hit.',
        effects: [{ type: 'block', amount: 14 }, { type: 'ai_state', key: 'refracted', set: 1 }] },
      lance: { name: 'Lance', intent: 'attack_debuff', text: 'Deal {damage} damage. Apply {status} Exposed to you.',
        effects: [{ type: 'damage', amount: 15, target: 'target' }, { type: 'status', target: 'target', id: 'exposed', amount: 2 }] },
    },
    chooseMove: (c) => (c.forTurn === 1 ? 'lance' : pick(c, [['splinter_storm', 50], ['refract', 25], ['lance', 25]], [c.lastMove()])),
  },
  {
    id: 'prism_seer', name: 'Prism Seer', hp: [76, 82], icon: 'enemy_prism_seer',
    moves: {
      glare: { name: 'Glare', intent: 'debuff', text: 'Apply {status} Exposed to you.',
        effects: [{ type: 'status', target: 'target', id: 'exposed', amount: 2 }] },
      prism_lance: { name: 'Prism Lance', intent: 'attack', text: 'Deal {damage} damage.', effects: [{ type: 'damage', amount: 16, target: 'target' }] },
      spectrum_burst: { name: 'Spectrum Burst', intent: 'attack', text: 'Deal {damage} damage {times} times.',
        effects: [{ type: 'damage', amount: 4, times: 4, target: 'target' }] },
      refraction: { name: 'Refraction', intent: 'special',
        text: 'Gain {block} Block. Re-rolls the forecast of every other enemy: current intents stay, and enemies on fixed cycles are unaffected.',
        effects: [{ type: 'block', amount: 12 }, { type: 'reroll_forecast', target: 'other_enemies' }] },
    },
    chooseMove: (c) => {
      if (c.forTurn === 1) return 'glare';
      if (c.forTurn % 3 === 0) return 'refraction';
      return pick(c, [['prism_lance', 45], ['spectrum_burst', 55]], [c.lastMove()]);
    },
  },
  {
    id: 'echo_cantor', name: 'Echo Cantor', hp: [110, 118], icon: 'enemy_echo_cantor', spawnStatuses: { resonance: 1 },
    moves: {
      // RULINGS 13: Chime is the punish move; it adds Drift only when the player's card count added hits.
      chime: { name: 'Chime', intent: 'attack',
        text: 'Deal {damage} damage {times} times. If Resonance added hits, shuffle {add_card} Drift into your draw pile.',
        effects: [
          { type: 'damage', amount: 6, times: { base: 1, scale: { ai: 'resonance' } }, target: 'target' },
          { type: 'conditional', if: { type: 'compare', left: { scale: { ai: 'resonance' } }, op: '>=', right: 1 },
            then: [{ type: 'add_card', card: 'status_drift', to: 'draw', n: 1 }] },
          { type: 'ai_state', key: 'resonance', set: 0 },
        ] },
      toll: { name: 'Toll', intent: 'attack', text: 'Deal {damage} damage.', effects: [{ type: 'damage', amount: 20, target: 'target' }] },
      hush: { name: 'Hush', intent: 'debuff', text: 'Apply {status} Stagger to you. Gain {block} Block.',
        effects: [{ type: 'status', target: 'target', id: 'stagger', amount: 2 }, { type: 'block', amount: 15 }] },
    },
    chooseMove: (c) => {
      if (c.forTurn % 2 === 1) return 'chime';
      // Only even turns pick Toll/Hush, so the last of them in history is the previous even-turn choice.
      const prevEven = [...c.history].reverse().find((m) => m === 'toll' || m === 'hush') ?? null;
      return pick(c, [['toll', 60], ['hush', 40]], [prevEven]);
    },
  },
  {
    id: 'lymph_warden', name: 'Lymph Warden', hp: [66, 72], icon: 'enemy_lymph_warden', values: { ...CLEANSE, ...MEND },
    moves: {
      cleanse: { name: 'Cleanse', intent: 'buff', text: 'Every other enemy loses half of each debuff (rounded down), then heals {cleanse_heal} HP.',
        effects: [{ type: 'custom', fn: 'cleanse' }] },
      mend: { name: 'Mend', intent: 'buff', text: 'Heals the other enemy with the lowest HP by {mend_heal}.', effects: [{ type: 'custom', fn: 'mend' }] },
      antigen_tag: { name: 'Antigen Tag', intent: 'attack_debuff', text: 'Deal {damage} damage. Apply {status} Exposed to you.',
        effects: [{ type: 'damage', amount: 9, target: 'target' }, { type: 'status', target: 'target', id: 'exposed', amount: 2 }] },
      membrane: { name: 'Membrane', intent: 'defend', text: 'Every enemy gains {block} Block.', effects: [{ type: 'block', amount: 12, target: 'all_allies' }] },
    },
    chooseMove: (c) => {
      if (c.alliesAlive() === 0) return c.lastMove() === 'antigen_tag' ? 'membrane' : 'antigen_tag';
      if (c.forTurn === 1) return 'membrane';
      if (c.forTurn % 3 === 0) return 'cleanse';
      return pick(c, [['antigen_tag', 40], ['mend', 35], ['membrane', 25]], [c.lastMove()]);
    },
    custom: {
      cleanse: (ctx) => {
        const combat = requireCombat(ctx, 'Cleanse');
        for (const e of combat.enemies.filter((x) => x.alive && x.uid !== ctx.owner)) {
          for (const [id, stacks] of Object.entries(e.statuses)) {
            const loss = Math.floor(stacks / 2);
            if (loss > 0 && getStatusDef(id).isDebuff) ctx.now([{ type: 'status', target: 'target', id, amount: -loss }], { target: e.uid });
          }
          ctx.now([{ type: 'heal', amount: CLEANSE.cleanse_heal, target: 'target' }], { target: e.uid });
        }
      },
      mend: (ctx) => {
        const combat = requireCombat(ctx, 'Mend');
        const others = combat.enemies.filter((x) => x.alive && x.uid !== ctx.owner);
        // Resolve-time choice; ties go leftmost. With no ally left the move is a legal wasted turn.
        const lowest = others.reduce<EnemyState | null>((best, e) => (best === null || e.hp < best.hp ? e : best), null);
        if (lowest) ctx.now([{ type: 'heal', amount: MEND.mend_heal, target: 'target' }], { target: lowest.uid });
      },
    },
  },
  {
    id: 'pyrexia_node', name: 'Pyrexia Node', hp: [52, 58], icon: 'enemy_pyrexia_node',
    moves: {
      fever: { name: 'Fever', intent: 'buff', text: 'Every enemy, itself included, gains {status} Might.',
        effects: [{ type: 'status', target: 'all_allies', id: 'might', amount: 1 }] },
      fever_spike: { name: 'Fever Spike', intent: 'attack', text: 'Deal {damage} damage.', effects: [{ type: 'damage', amount: 5, target: 'target' }] },
    },
    chooseMove: (c) => {
      if (c.alliesAlive() > 0) return 'fever';
      return c.lastMove() === 'fever_spike' ? 'fever' : 'fever_spike';
    },
  },
  {
    id: 'void_geometer', name: 'Void Geometer', hp: [130, 140], icon: 'enemy_void_geometer',
    moves: {
      hyperedge: { name: 'Hyperedge', intent: 'attack', text: 'Deal {damage} damage. Spends its Fold bonus.',
        effects: [{ type: 'damage', amount: { base: 27, scale: { ai: 'folded' } }, target: 'target' }, { type: 'ai_state', key: 'folded', set: 0 }] },
      acute_angle: { name: 'Acute Angle', intent: 'attack_debuff', text: 'Deal {damage} damage. Apply {status} Stagger to you.',
        effects: [{ type: 'damage', amount: 12, target: 'target' }, { type: 'status', target: 'target', id: 'stagger', amount: 2 }] },
      fold_space: { name: 'Fold Space', intent: 'defend_buff', text: 'Gain {block} Block. Its next Hyperedge deals {ai_state} more damage.',
        effects: [{ type: 'block', amount: 20 }, { type: 'ai_state', key: 'folded', set: 6 }] },
    },
    chooseMove: (c) => {
      if (c.forTurn === 1) return 'acute_angle';
      if (c.lastMove() === 'fold_space') return 'hyperedge';
      return pick(c, [['hyperedge', 40], ['acute_angle', 35], ['fold_space', 25]], [c.lastMove() === 'hyperedge' ? 'hyperedge' : null]);
    },
  },
  // --- elites (§3.2)
  {
    id: 'mirror_knight', name: 'Mirror Knight', hp: [190, 200], icon: 'enemy_mirror_knight', spawnStatuses: { reflection: 1 }, values: REFLECT,
    amounts: {
      // bestCardDamage is the engine's per-turn counter (HP lost to the best single card, after Block; Riposte,
      // Rot and relics excluded). It is deleted at player turn start, so absent means no card has hit yet: 0.
      reflection: (ctx) => Math.max(REFLECT.min, Math.min(REFLECT.max, requireCombat(ctx, 'Mirror Slash').counters.bestCardDamage ?? 0)),
    },
    moves: {
      mirror_slash: { name: 'Mirror Slash', intent: 'attack',
        text: 'Deal {damage} damage: the most damage one of your cards dealt this turn (at least {min}, at most {max}).',
        effects: [{ type: 'damage', amount: { scale: { fn: 'reflection' } }, target: 'target' }] },
      shatter_lunge: { name: 'Shatter Lunge', intent: 'attack_debuff', text: 'Deal {damage} damage {times} times. Apply {status} Exposed to you.',
        effects: [{ type: 'damage', amount: 7, times: 3, target: 'target' }, { type: 'status', target: 'target', id: 'exposed', amount: 2 }] },
      silvered_guard: { name: 'Silvered Guard', intent: 'defend', text: 'Gain {guard} Guard.', effects: [{ type: 'guard', amount: 20 }] },
    },
    chooseMove: (c) => {
      if (c.forTurn === 1) return 'shatter_lunge';
      if (c.forTurn % 2 === 0) return 'mirror_slash';
      return c.rng.weighted([['shatter_lunge', 70], ['silvered_guard', 30]]);
    },
  },
  {
    id: 'phage_mother', name: 'Phage Mother', hp: [180, 190], icon: 'enemy_phage_mother', values: PHAGE,
    moves: {
      bud_phages: { name: 'Bud', intent: 'special', text: 'Summons {summon} Phages (at most {cap} alive). They die with her.',
        effects: [{ type: 'summon', enemy: 'phage', n: PHAGE.bud_n, cap: PHAGE.cap, withLeader: 'die' }] },
      lyse: { name: 'Lyse', intent: 'attack', text: 'Deal {damage} damage {times} times.', effects: [{ type: 'damage', amount: 8, times: 2, target: 'target' }] },
      enzyme_wash: { name: 'Enzyme Wash', intent: 'debuff', text: 'Apply {status} Exposed and {status2} Stagger to you.',
        effects: [{ type: 'status', target: 'target', id: 'exposed', amount: 2 }, { type: 'status', target: 'target', id: 'stagger', amount: 2 }] },
      incubate: { name: 'Incubate', intent: 'defend_buff', text: 'Every Phage ages by {age}. Gain {block} Block.',
        effects: [{ type: 'custom', fn: 'incubate' }, { type: 'block', amount: 15 }] },
    },
    chooseMove: (c) => {
      const last = c.lastMove();
      if (last === null) return 'bud_phages';
      if (last === 'bud_phages' || last === 'incubate') return 'lyse';
      if (last === 'lyse') return 'enzyme_wash';
      if (last === 'enzyme_wash') return c.alliesAlive('phage') <= 2 ? 'bud_phages' : 'incubate';
      throw new Error(`phage_mother: no rule after '${last}'`);
    },
    custom: {
      incubate: (ctx) => {
        const combat = requireCombat(ctx, 'Incubate');
        for (const p of combat.enemies.filter((x) => x.alive && x.id === 'phage' && x.leaderUid === ctx.owner)) {
          ctx.now([{ type: 'status', target: 'target', id: 'phage_age', amount: PHAGE.age }], { target: p.uid });
        }
      },
    },
  },
  {
    id: 'phage', name: 'Phage', hp: [15, 17], icon: 'enemy_phage', onLeaderDeath: 'die', spawnStatuses: { replicating: 1 },
    moves: {
      latch: { name: 'Latch', intent: 'attack', text: 'Deal {damage} damage (+{damage_per} per Age).',
        effects: [{ type: 'damage', amount: { base: PHAGE.latch_base, per: PHAGE.latch_per, scale: { status: 'phage_age', of: 'self' } }, target: 'target' }] },
    },
    chooseMove: () => 'latch',
  },
  {
    id: 'event_horizon', name: 'Event Horizon', hp: [220, 230], icon: 'enemy_event_horizon', spawnStatuses: { horizon_pull: 1 },
    moves: {
      tidal_pull: { name: 'Tidal Pull', intent: 'attack', text: 'Deal {damage} damage {times} times (+{damage_per} per hit per Mass).',
        effects: [{ type: 'damage', amount: { base: 6, scale: { ai: 'mass' } }, times: 4, target: 'target' }] },
      crush_depth: { name: 'Crush Depth', intent: 'attack', text: 'Deal {damage} damage (+{damage_per} per Mass).',
        effects: [{ type: 'damage', amount: { base: 28, scale: { ai: 'mass' } }, target: 'target' }] },
      accrete: { name: 'Accrete', intent: 'buff', text: 'Heal {heal} HP. Gain {ai_state} Mass (permanent).',
        effects: [{ type: 'heal', amount: 12 }, { type: 'ai_state', key: 'mass', delta: 2 }] },
    },
    chooseMove: (c) => {
      if (c.forTurn === 1) return 'tidal_pull';
      const noAccrete = c.forTurn < 3 || c.history.slice(-3).includes('accrete');
      return pick(c, [['crush_depth', 40], ['tidal_pull', 40], ['accrete', 20]], [c.lastMove(), noAccrete ? 'accrete' : null]);
    },
  },
];

export const ACT3_STATUSES: StatusDef[] = [
  {
    id: 'resonance', name: 'Resonance', stacks: 'flag', decay: 'never', tick: 'start_player_turn', isDebuff: false, values: RESONANCE,
    text: 'While its intent is Chime, each card you play after your {after}th this turn adds {per_card} hit to Chime (at most {max} added). Resets when Chime resolves.',
    hooks: {
      // res_seen = the play count already credited this turn (deeper autoplays that are not counted plays don't re-credit).
      onTick: (ctx) => ctx.now([{ type: 'ai_state', key: 'res_seen', set: 0 }]),
      onCardPlayed: (ctx) => {
        const combat = requireCombat(ctx, 'Resonance');
        if (combat.turnPhase !== 'player') return;
        const e = ownEnemy(ctx);
        if (e.intent.moveId !== 'chime') return;
        const n = combat.cardsPlayedThisTurn.length;
        // aiState keys that were never set are 0 (engine convention).
        if (n <= RESONANCE.after || n === (e.aiState.res_seen ?? 0)) return;
        ctx.now([{ type: 'ai_state', key: 'res_seen', set: n }]);
        if ((e.aiState.resonance ?? 0) < RESONANCE.max) ctx.now([{ type: 'ai_state', key: 'resonance', delta: RESONANCE.per_card }]);
      },
    },
    icon: 'status_resonance',
  },
  {
    id: 'reflection', name: 'Reflection', stacks: 'flag', decay: 'never', tick: 'never', isDebuff: false, values: REFLECT,
    text: 'Mirror Slash deals the most damage any single card of yours dealt this turn (all its hits and targets, after Block; Timeline cards count, Riposte, Rot and relics do not): at least {min}, at most {max}.',
    icon: 'status_reflection',
  },
  {
    id: 'replicating', name: 'Replicating', stacks: 'flag', decay: 'never', tick: 'end_own_turn', isDebuff: false, values: PHAGE,
    text: 'Ages by {status} at the end of each of its turns. Latch deals {latch_per} more per Age.',
    triggers: { onTick: [{ type: 'status', target: 'self', id: 'phage_age', amount: PHAGE.age }] },
    icon: 'status_replicating',
  },
  {
    id: 'phage_age', name: 'Age', stacks: 'amount', decay: 'never', tick: 'never', isDebuff: false, values: PHAGE,
    text: 'Age {stacks}: Latch deals {latch_per} more per Age.',
    icon: 'status_phage_age',
  },
  {
    id: 'horizon_pull', name: 'Event Horizon', stacks: 'flag', decay: 'never', tick: 'never', isDebuff: false, values: HORIZON,
    text: 'At the start of its turn, any of your Block plus Guard above {line} is pulled into it: you lose the excess (Guard first) and it gains that much Block.',
    hooks: {
      // Runs after its own Block reset (enemy turn start step 1), so the stolen Block protects it through your next turn.
      onTurnStart: (ctx) => {
        const p = requireCombat(ctx, 'Event Horizon').player;
        const excess = p.block + p.guard - HORIZON.line;
        if (excess <= 0) return;
        ctx.now([{ type: 'status', target: 'target', id: 'horizon_drain', amount: excess }], { target: 'player' });
        ctx.now([{ type: 'block', amount: excess }]);
      },
    },
    icon: 'status_horizon_pull',
  },
  {
    // Relay on the player: the player-side lose_defence must run with the player as `self`.
    id: 'horizon_drain', name: 'Pulled', stacks: 'amount', decay: 'never', tick: 'never', isDebuff: false, hidden: true,
    text: 'You lose {stacks} Block and Guard (Guard first) to the Event Horizon.',
    hooks: {
      onApplied: (ctx) => {
        const p = requireCombat(ctx, 'Pulled').player;
        const fromGuard = Math.min(p.guard, ctx.stacks);
        ctx.now([
          { type: 'lose_defence', pool: 'guard', amount: fromGuard },
          { type: 'lose_defence', pool: 'block', amount: ctx.stacks - fromGuard },
          { type: 'status', target: 'self', id: 'horizon_drain', amount: -ctx.stacks },
        ]);
      },
    },
    icon: 'status_horizon_drain',
  },
];

export const ACT3_ENCOUNTERS: EncounterDef[] = [
  { id: 'enc_a3_mote_pair', name: 'Void Mote Pair', acts: [3], pool: 'easy', weight: 1, enemies: ['void_mote', 'void_mote'] },
  { id: 'enc_a3_shard_mote', name: 'Shardling and Mote', acts: [3], pool: 'easy', weight: 1, enemies: ['shardling', 'void_mote'] },
  { id: 'enc_a3_seer', name: 'Prism Seer', acts: [3], pool: 'easy', weight: 1, enemies: ['prism_seer'] },
  { id: 'enc_a3_cantor', name: 'Echo Cantor', acts: [3], pool: 'hard', weight: 15, enemies: ['echo_cantor'] },
  { id: 'enc_a3_geometer', name: 'Void Geometer', acts: [3], pool: 'hard', weight: 15, enemies: ['void_geometer'] },
  { id: 'enc_a3_fever_pack', name: 'Fever Pack', acts: [3], pool: 'hard', weight: 14, enemies: ['pyrexia_node', 'shardling', 'void_mote'] },
  { id: 'enc_a3_warden_geometer', name: 'Warden and Geometer', acts: [3], pool: 'hard', weight: 14, enemies: ['lymph_warden', 'void_geometer'] },
  { id: 'enc_a3_warden_cantor', name: 'Warden and Cantor', acts: [3], pool: 'hard', weight: 14, enemies: ['lymph_warden', 'echo_cantor'] },
  { id: 'enc_a3_prism_motes', name: 'Prism Seer and Motes', acts: [3], pool: 'hard', weight: 14, enemies: ['prism_seer', 'void_mote', 'void_mote'] },
  { id: 'enc_a3_warden_shard', name: 'Warden and Shardling', acts: [3], pool: 'hard', weight: 14, enemies: ['lymph_warden', 'shardling'] },
  // Relic biases (glass_spurs, hairline_saw, dampener_coil) are omitted until those relics exist (RULINGS 14;
  // validateAllContent rejects an unknown relicBias).
  { id: 'enc_a3_mirror_knight', name: 'Mirror Knight', acts: [3], pool: 'elite', weight: 1, enemies: ['mirror_knight'] },
  { id: 'enc_a3_phage_mother', name: 'Phage Mother', acts: [3], pool: 'elite', weight: 1, enemies: ['phage_mother'] },
  { id: 'enc_a3_event_horizon', name: 'Event Horizon', acts: [3], pool: 'elite', weight: 1, enemies: ['event_horizon'] },
];
