// The Verdant Decks: ENEMIES §0–§1.2, §1.4. Bosses live in bosses.ts.
import type { EnemyAiCtx, EnemyDef, StatusDef, EncounterDef } from '../../engine/types';

const SHRILL = { exposed: 2 };
const SICKLE = { hits: 2, extra_hits: 1 };
const BOND = { damage_per_status: 1 };
const UNDERBELLY = { damage: 3 };
const POLLEN = { might: 1, heal: 8 };
const RALLY = { might: 1 };

/** Remove forbidden repeats before drawing; the remaining weights renormalise. */
function differentMove(c: EnemyAiCtx, moves: [string, number][]): string {
  return c.rng.weighted(moves.filter(([id]) => id !== c.lastMove()));
}

export const ACT1_ENEMIES: EnemyDef[] = [
  {
    id: 'gnasher', name: 'Gnasher', hp: [13, 17], onLeaderDeath: 'flee',
    moves: {
      nip: { name: 'Nip', intent: 'attack', text: 'Deal {damage} damage × {times}.',
        effects: [{ type: 'damage', amount: 3, times: 2, target: 'target' }] },
      lunge: { name: 'Lunge', intent: 'attack', text: 'Deal {damage} damage.',
        effects: [{ type: 'damage', amount: 7, target: 'target' }] },
    },
    chooseMove: (c) => c.rng.weighted((c.forTurn === 1
      ? [['nip', 50], ['lunge', 50]] as [string, number][]
      : [['nip', 55], ['lunge', 45]] as [string, number][])
      .filter(([id]) => c.timesInARow(id) < 2)),
    icon: 'enemy_gnasher',
  },
  {
    id: 'sporepuff', name: 'Sporepuff', hp: [10, 13],
    onSpawn: (c) => {
      if (!c.combat || c.owner === 'player') throw new Error('Sporepuff spawned outside an enemy slot');
      const owner = c.owner;
      const slot = c.combat.enemies.filter((e) => e.id === 'sporepuff' && e.uid < owner).length;
      c.now([{ type: 'ai_state', key: 'slot', set: slot }]);
    },
    moves: {
      puff: { name: 'Puff', intent: 'debuff', text: 'Shuffle {add_card} Tangle into your draw pile.',
        effects: [{ type: 'add_card', card: 'status_tangle', to: 'draw', n: 1 }] },
      sting: { name: 'Sting', intent: 'attack', text: 'Deal {damage} damage.',
        effects: [{ type: 'damage', amount: 5, target: 'target' }] },
      dust: { name: 'Spore Dust', intent: 'debuff', text: 'Apply {status} Stagger to you.',
        effects: [{ type: 'status', target: 'target', id: 'stagger', amount: 2 }] },
    },
    chooseMove: (c) => {
      if (c.forTurn === 1) {
        if (c.alliesAlive('sporepuff') === 0) return 'puff';
        const move = ['puff', 'sting', 'dust'][(c.aiState.slot ?? 0) % 3];
        if (!move) throw new Error('Invalid Sporepuff slot');
        return move;
      }
      return differentMove(c, [['sting', 50], ['dust', 25], ['puff', 25]]);
    },
    icon: 'enemy_sporepuff',
  },
  {
    id: 'scrap_drone', name: 'Scrap Drone', hp: [15, 19],
    moves: {
      zap: { name: 'Zap', intent: 'attack', text: 'Deal {damage} damage.',
        effects: [{ type: 'damage', amount: 6, target: 'target' }] },
      target_lock: { name: 'Target Lock', intent: 'debuff', text: 'Apply {status} Exposed to you.',
        effects: [{ type: 'status', target: 'target', id: 'exposed', amount: 2 }] },
    },
    chooseMove: (c) => {
      if (c.forTurn === 1) return c.alliesAlive() > 0 ? 'target_lock' : 'zap';
      return c.lastMove() === 'target_lock' ? 'zap' : c.rng.weighted([['zap', 60], ['target_lock', 40]]);
    },
    icon: 'enemy_scrap_drone',
  },
  {
    id: 'thornback', name: 'Thornback', hp: [42, 46],
    moves: {
      gore: { name: 'Gore', intent: 'attack', text: 'Deal {damage} damage. Consume Bristle.',
        effects: [{ type: 'damage', amount: { base: 13, scale: { ai: 'bristle' } }, target: 'target' },
          { type: 'ai_state', key: 'bristle', set: 0 }] },
      bristle: { name: 'Bristle', intent: 'defend_buff', text: 'Gain {block} Block. Next Gore deals +{ai_state} damage.',
        effects: [{ type: 'block', amount: 9 }, { type: 'ai_state', key: 'bristle', set: 5 }] },
      trample: { name: 'Trample', intent: 'attack', text: 'Deal {damage} damage × {times}.',
        effects: [{ type: 'damage', amount: 5, times: 2, target: 'target' }] },
    },
    chooseMove: (c) => {
      if (c.forTurn === 1 || c.lastMove() === 'bristle') return 'gore';
      return c.rng.weighted(([['gore', 40], ['bristle', 30], ['trample', 30]] as [string, number][])
        .filter(([id]) => id !== 'gore' || c.lastMove() !== 'gore'));
    },
    icon: 'enemy_thornback',
  },
  {
    id: 'vinelash', name: 'Vinelash', hp: [48, 54],
    moves: {
      lash: { name: 'Lash', intent: 'attack', text: 'Deal {damage} damage × {times}.',
        effects: [{ type: 'damage', amount: 4, times: 3, target: 'target' }] },
      ensnare: { name: 'Ensnare', intent: 'debuff', text: 'Apply {status} Stagger to you. Gain {block} Block.',
        effects: [{ type: 'status', target: 'target', id: 'stagger', amount: 2 }, { type: 'block', amount: 6 }] },
      strangle: { name: 'Strangle', intent: 'attack', text: 'Deal {damage} damage.',
        effects: [{ type: 'damage', amount: 11, target: 'target' }] },
    },
    chooseMove: (c) => c.forTurn === 1 ? 'ensnare' : c.rng.weighted(
      ([['lash', 50], ['strangle', 30], ['ensnare', 20]] as [string, number][])
        .filter(([id]) => !(id === 'ensnare' && c.lastMove() === id) && !(id === 'lash' && c.timesInARow(id) >= 2))),
    icon: 'enemy_vinelash',
  },
  {
    id: 'flitterfang', name: 'Flitterfang', hp: [24, 28], spawnStatuses: { shrill: 1 },
    moves: {
      frenzied_bite: { name: 'Frenzied Bite', intent: 'attack', text: 'Deal {damage} damage × {times}.',
        effects: [{ type: 'damage', amount: 3, times: 3, target: 'target' }] },
      swoop: { name: 'Swoop', intent: 'attack', text: 'Deal {damage} damage.',
        effects: [{ type: 'damage', amount: 7, target: 'target' }] },
    },
    chooseMove: (c) => c.forTurn === 1 || c.lastMove() === 'swoop' ? 'frenzied_bite'
      : c.rng.weighted([['frenzied_bite', 70], ['swoop', 30]]),
    icon: 'enemy_flitterfang',
  },
  {
    id: 'sickle_mantis', name: 'Sickle Mantis', hp: [40, 44], spawnStatuses: { reads_the_guard: 1 },
    values: { parried_hits: SICKLE.hits + SICKLE.extra_hits },
    moves: {
      twin_sickle: { name: 'Twin Sickle', intent: 'attack',
        text: 'Deal {damage} damage × {times_base} ({damage} × {parried_hits} if parried). Consume Honed.',
        effects: [{ type: 'damage', amount: { base: 5, scale: { ai: 'honed' } },
          times: { base: SICKLE.hits, per: SICKLE.extra_hits, scale: 'triggered_riposte' }, target: 'target' },
        { type: 'ai_state', key: 'honed', set: 0 }] },
      preen: { name: 'Preen', intent: 'defend_buff', text: 'Gain {block} Block. Next attack deals +{ai_state} damage per hit.',
        effects: [{ type: 'block', amount: 10 }, { type: 'ai_state', key: 'honed', set: 2 }] },
      scissor_cut: { name: 'Scissor Cut', intent: 'attack', text: 'Deal {damage} damage. Consume Honed.',
        effects: [{ type: 'damage', amount: { base: 14, scale: { ai: 'honed' } }, target: 'target' },
          { type: 'ai_state', key: 'honed', set: 0 }] },
    },
    chooseMove: (c) => c.forTurn === 1 ? 'twin_sickle'
      : differentMove(c, [['twin_sickle', 45], ['scissor_cut', 30], ['preen', 25]]),
    icon: 'enemy_sickle_mantis',
  },
  {
    id: 'pollen_wisp', name: 'Pollen Wisp', hp: [20, 24], values: POLLEN,
    moves: {
      pollinate: { name: 'Pollinate', intent: 'buff', text: 'Every other living enemy gains {might} Might.',
        effects: [{ type: 'custom', fn: 'pollinate' }] },
      dewdrop: { name: 'Dewdrop', intent: 'buff', text: 'Heal the other living enemy with the lowest HP by {heal}.',
        effects: [{ type: 'custom', fn: 'dewdrop' }] },
      seed_flick: { name: 'Seed Flick', intent: 'attack', text: 'Deal {damage} damage.',
        effects: [{ type: 'damage', amount: 4, target: 'target' }] },
    },
    chooseMove: (c) => c.alliesAlive() === 0 ? 'seed_flick' : c.forTurn === 1 ? 'pollinate'
      : differentMove(c, [['pollinate', 45], ['dewdrop', 30], ['seed_flick', 25]]),
    custom: {
      // all_allies includes the caster; these moves explicitly exclude it.
      pollinate: (c) => {
        if (!c.combat) throw new Error('Pollinate outside combat');
        for (const e of c.combat.enemies.filter((e) => e.alive && e.uid !== c.owner)) {
          c.now([{ type: 'status', target: 'target', id: 'might', amount: POLLEN.might }], { target: e.uid });
        }
      },
      dewdrop: (c) => {
        if (!c.combat) throw new Error('Dewdrop outside combat');
        const others = c.combat.enemies.filter((e) => e.alive && e.uid !== c.owner);
        // Strict comparison preserves list order on ties; no allies is a legal wasted move.
        const lowest = others.reduce<(typeof others)[number] | null>((best, e) => best === null || e.hp < best.hp ? e : best, null);
        if (lowest) c.now([{ type: 'heal', amount: POLLEN.heal, target: 'target' }], { target: lowest.uid });
      },
    },
    icon: 'enemy_pollen_wisp',
  },
  {
    id: 'gnasher_alpha', name: 'Gnasher Alpha', hp: [62, 66], values: RALLY,
    moves: {
      rend: { name: 'Rend', intent: 'attack', text: 'Deal {damage} damage × {times}.',
        effects: [{ type: 'damage', amount: 5, times: 2, target: 'target' }] },
      maul: { name: 'Maul', intent: 'attack', text: 'Deal {damage} damage.',
        effects: [{ type: 'damage', amount: 14, target: 'target' }] },
      rally_howl: { name: 'Rally Howl', intent: 'defend_buff', text: 'Every living Gnasher gains {might} Might. Gain {block} Block.',
        effects: [{ type: 'custom', fn: 'rally_howl' }, { type: 'block', amount: 8 }] },
      call_pack: { name: 'Call the Pack', intent: 'special', text: 'Summon Gnashers until {summon} are alive. They flee when the Alpha dies.',
        effects: [{ type: 'summon', enemy: 'gnasher', fillTo: 2, cap: 2, withLeader: 'flee' }] },
    },
    chooseMove: (c) => {
      if (c.forTurn === 1) return 'rally_howl';
      if (c.alliesAlive('gnasher') === 0 && c.forTurn >= 4 && !c.history.includes('call_pack')) return 'call_pack';
      return differentMove(c, [['rend', 40], ['maul', 35], ['rally_howl', 25]]);
    },
    custom: {
      rally_howl: (c) => {
        if (!c.combat) throw new Error('Rally Howl outside combat');
        for (const e of c.combat.enemies.filter((e) => e.alive && e.id === 'gnasher')) {
          c.now([{ type: 'status', target: 'target', id: 'might', amount: RALLY.might }], { target: e.uid });
        }
      },
    },
    icon: 'enemy_gnasher_alpha',
  },
  {
    id: 'dreadcap', name: 'Dreadcap', hp: [100, 106], spawnStatuses: { mycelial_bond: 1 },
    moves: {
      sporefall: { name: 'Sporefall', intent: 'debuff', text: 'Shuffle {add_card} Tangle into your draw pile.',
        effects: [{ type: 'add_card', card: 'status_tangle', to: 'draw', n: 3 }] },
      cap_crush: { name: 'Cap Crush', intent: 'attack', text: 'Deal {damage} damage (+{damage_per} per Status card in your hand, draw and discard piles).',
        effects: [{ type: 'damage', amount: { base: 8, per: BOND.damage_per_status, scale: 'player_status_cards' }, target: 'target' }] },
      gill_lash: { name: 'Gill Lash', intent: 'attack', text: 'Deal {damage} damage × {times} (+{damage_per} per Status card in your hand, draw and discard piles).',
        effects: [{ type: 'damage', amount: { base: 3, per: BOND.damage_per_status, scale: 'player_status_cards' }, times: 3, target: 'target' }] },
      hunker: { name: 'Hunker', intent: 'defend', text: 'Gain {block} Block. Shuffle {add_card} Tangle into your discard pile.',
        effects: [{ type: 'block', amount: 14 }, { type: 'add_card', card: 'status_tangle', to: 'discard', n: 1 }] },
    },
    chooseMove: (c) => {
      if (c.forTurn === 1) return 'sporefall';
      if (c.forTurn === 2) return 'cap_crush';
      return c.rng.weighted(([['gill_lash', 35], ['cap_crush', 30], ['sporefall', 20], ['hunker', 15]] as [string, number][])
        .filter(([id]) => id !== c.lastMove() && !(id === 'sporefall' && c.history.slice(-2).includes(id))));
    },
    icon: 'enemy_dreadcap',
  },
  {
    id: 'shellback_titan', name: 'Shellback Titan', hp: [80, 86], spawnStatuses: { soft_underbelly: 1 },
    moves: {
      clamp: { name: 'Clamp Shut', intent: 'attack_defend', text: 'Gain {block} Block (+{block_per} each use). Deal {damage} damage.',
        effects: [{ type: 'block', amount: { base: 16, per: 4, scale: { ai: 'clamps' } } },
          { type: 'ai_state', key: 'clamps', delta: 1 }, { type: 'damage', amount: 6, target: 'target' }] },
      grind: { name: 'Mandible Grind', intent: 'attack', text: 'Deal {damage} damage × {times}.',
        effects: [{ type: 'damage', amount: 8, times: 2, target: 'target' }] },
    },
    chooseMove: (c) => c.forTurn % 2 === 1 ? 'clamp' : 'grind',
    icon: 'enemy_shellback_titan',
  },
];

export const ACT1_STATUSES: StatusDef[] = [
  {
    id: 'shrill', name: 'Shrill', stacks: 'flag', decay: 'never', tick: 'end_own_turn', isDebuff: false,
    text: 'At the end of its own turn, if alive, apply {exposed} Exposed to you.', values: SHRILL,
    hooks: { onTick: (c) => c.now([{ type: 'status', target: 'target', id: 'exposed', amount: SHRILL.exposed }], { target: 'player' }) },
    icon: 'status_shrill',
  },
  {
    id: 'reads_the_guard', name: 'Reads the Guard', stacks: 'flag', decay: 'never', tick: 'never', isDebuff: false,
    text: 'Twin Sickle gains {extra_hits} hit if it triggers one of your Riposte cards.', values: SICKLE,
    // The move uses triggered_riposte so the intent and resolution share the same rule.
    icon: 'status_reads_the_guard',
  },
  {
    id: 'mycelial_bond', name: 'Mycelial Bond', stacks: 'flag', decay: 'never', tick: 'never', isDebuff: false,
    text: 'Its attacks deal +{damage_per_status} damage per hit for each Status card in your hand, draw and discard piles.', values: BOND,
    // player_status_cards in each attack keeps the exact live bonus visible in intents.
    icon: 'status_mycelial_bond',
  },
  {
    id: 'soft_underbelly', name: 'Soft Underbelly', stacks: 'flag', decay: 'never', tick: 'never', isDebuff: false,
    text: 'While it has no Block, each hit on it deals +{damage} damage.', values: UNDERBELLY,
    hooks: { damageTakenFlat: (c) => {
      const e = c.combat?.enemies.find((e) => e.uid === c.owner);
      if (!e) throw new Error('Soft Underbelly on a non-enemy');
      return e.block === 0 ? UNDERBELLY.damage : 0;
    } },
    icon: 'status_soft_underbelly',
  },
];

export const ACT1_ENCOUNTERS: EncounterDef[] = [
  { id: 'enc_a1_gnasher_pair', name: 'Gnasher Pair', acts: [1], pool: 'easy', weight: 1, enemies: ['gnasher', 'gnasher'] },
  { id: 'enc_a1_drone_puff', name: 'Drone and Puff', acts: [1], pool: 'easy', weight: 1, enemies: ['scrap_drone', 'sporepuff'] },
  { id: 'enc_a1_thornback', name: 'Thornback', acts: [1], pool: 'easy', weight: 1, enemies: ['thornback'] },
  { id: 'enc_a1_mantis', name: 'Sickle Mantis', acts: [1], pool: 'hard', weight: 15, enemies: ['sickle_mantis'] },
  { id: 'enc_a1_vine_puff', name: 'Vine and Puff', acts: [1], pool: 'hard', weight: 15, enemies: ['sporepuff', 'vinelash'] },
  { id: 'enc_a1_flitter_gnasher', name: 'Flitterfang and Gnasher', acts: [1], pool: 'hard', weight: 15, enemies: ['flitterfang', 'gnasher'] },
  { id: 'enc_a1_drone_pack', name: 'Drone Pack', acts: [1], pool: 'hard', weight: 14, enemies: ['scrap_drone', 'gnasher', 'gnasher'] },
  { id: 'enc_a1_thornback_wisp', name: 'Thornback and Wisp', acts: [1], pool: 'hard', weight: 14, enemies: ['pollen_wisp', 'thornback'] },
  { id: 'enc_a1_spore_cluster', name: 'Spore Cluster', acts: [1], pool: 'hard', weight: 12, enemies: ['sporepuff', 'sporepuff', 'sporepuff'] },
  { id: 'enc_a1_thornback_drone', name: 'Thornback and Drone', acts: [1], pool: 'hard', weight: 15, enemies: ['scrap_drone', 'thornback'] },
  { id: 'enc_a1_alpha', name: 'Gnasher Alpha', acts: [1], pool: 'elite', weight: 1,
    enemies: ['gnasher_alpha', { id: 'gnasher', leader: 0, withLeader: 'flee' }, { id: 'gnasher', leader: 0, withLeader: 'flee' }] },
  { id: 'enc_a1_dreadcap', name: 'Dreadcap', acts: [1], pool: 'elite', weight: 1, enemies: ['dreadcap'] },
  { id: 'enc_a1_titan', name: 'Shellback Titan', acts: [1], pool: 'elite', weight: 1, enemies: ['shellback_titan'] },
];
