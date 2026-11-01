import type { CardDef, Effect, StatusDef } from '../../engine/types';
import { getCardDef } from '../registry';

// Phase C: Salvage Kiln dealt 3 damage per Scrap (was 1 Exposed; cf -9.0). Phase F: it counts the Scrapheap instead,
// which keeps paying under the ruling 72 floor (a heap built in turns 1-2 pays every later turn).
const KILN = { damage_per: 1 };
const GYRO = { stagger_per_hit: 1, max_hits: 3 };
const MANIFEST = { deck_threshold: 20 };
const PRISM = { guard_per_shard: 1 };
// Shared v2
const SCAR = { draws: 1, max: 2 };
const SCAR_KEYS = { turn: 'scar_tissue:turn', draws: 'scar_tissue:draws' } as const;
const BURN = { cost: 1 };
const VERSE = { min_cost: 2 }; // Second Verse: the next card must cost this much (X cards: X) to get Reprise

const salvageOptions = (block: number, draw: number, damage: number): Effect[] => [
  { type: 'choose', prompt: 'Salvage Kit', options: [
    { label: 'Gain {block} Block', effects: [{ type: 'block', amount: block }] },
    { label: 'Draw {draw} cards', effects: [{ type: 'draw', n: draw }] },
    { label: 'Deal {damage} damage to ALL enemies', effects: [{ type: 'damage', amount: damage, target: 'all_enemies' }] },
  ] },
];

export const COLORLESS_CARDS: CardDef[] = [
  { id: 'relay_ping', name: 'Relay Ping', cls: 'colorless', type: 'skill', rarity: 'uncommon', cost: 0, target: 'none', keywords: [],
    text: 'Draw {draw} cards. Add a Jitter to your hand.',
    // Phase F: draw 3 (was 2; never picked: net one card for a Jitter). The upgrade draws 4 and still adds one Jitter.
    effects: [{ type: 'draw', n: 3 }, { type: 'add_card', card: 'status_jitter', to: 'hand' }],
    upgrade: { effects: [{ type: 'draw', n: 4 }, { type: 'add_card', card: 'status_jitter', to: 'hand' }] },
    icon: 'card_relay_ping', tags: ['draw', 'status', 'cadence_fuel', 'prune_fodder'] },
  // Phase F: no Scrap (never picked as a one-shot; 16 + 2 per Shard for 2 is a fair repeatable attack).
  { id: 'shardfall', name: 'Shardfall', cls: 'colorless', type: 'attack', rarity: 'uncommon', cost: 2, target: 'enemy', keywords: [],
    text: 'Deal {damage} damage, +{damage_per} per Shard you hold.',
    effects: [{ type: 'damage', amount: { base: 16, per: 2, scale: 'shards' }, target: 'target' }],
    upgrade: { effects: [{ type: 'damage', amount: { base: 16, per: 3, scale: 'shards' }, target: 'target' }] },
    icon: 'card_shardfall', tags: ['burst', 'shards'] },
  { id: 'arc_lattice', name: 'Arc Lattice', cls: 'colorless', type: 'attack', rarity: 'uncommon', cost: 2, target: 'all_enemies', keywords: [],
    text: 'Deal {damage} damage, +{damage_per} per living enemy, to ALL enemies.',
    // Phase F: 7 + 3 per living enemy (was 4 + 2; never picked: 6 damage alone for 2 energy).
    effects: [{ type: 'damage', amount: { base: 7, per: 3, scale: 'enemies_alive' }, target: 'all_enemies' }],
    upgrade: { effects: [{ type: 'damage', amount: { base: 9, per: 3, scale: 'enemies_alive' }, target: 'all_enemies' }] },
    icon: 'card_arc_lattice', tags: ['aoe', 'pack'] },
  { id: 'salvage_kit', name: 'Salvage Kit', cls: 'colorless', type: 'skill', rarity: 'uncommon', cost: 1, target: 'none', keywords: [],
    text: 'Choose: gain {block} Block, draw {draw} cards, or deal {damage} damage to ALL enemies.',
    effects: salvageOptions(7, 2, 5), upgrade: { effects: salvageOptions(10, 3, 8) },
    icon: 'card_salvage_kit', tags: ['choose', 'block', 'draw', 'aoe', 'flexible'] },
  { id: 'stress_fracture', name: 'Stress Fracture', cls: 'colorless', type: 'skill', rarity: 'uncommon', cost: 0, target: 'enemy', keywords: [],
    // Phase C (cf -10.7): the self-Exposed was a trap; the cost is now Strain, which feeds the Redline engine.
    // Phase F: costs 0 (was 1); the Strain is the price.
    text: 'Strain {strain}. Apply {status} Exposed to an enemy.',
    effects: [{ type: 'strain', amount: 2 }, { type: 'status', target: 'target', id: 'exposed', amount: 4 }],
    upgrade: { effects: [{ type: 'strain', amount: 2 }, { type: 'status', target: 'target', id: 'exposed', amount: 5 }] },
    icon: 'card_stress_fracture', tags: ['exposed', 'debuff', 'multihit', 'strain', 'engine:redline'] },
  { id: 'gyro_jammer', name: 'Gyro Jammer', cls: 'colorless', type: 'skill', rarity: 'uncommon', cost: 1, target: 'enemy', keywords: [], values: GYRO,
    text: 'Apply {stagger_per_hit} Stagger per hit the enemy intends (max {max_hits}).',
    effects: [{ type: 'status', target: 'target', id: 'stagger', amount: { scale: { fn: 'target_intent_hits_max3' } } }],
    upgrade: { text: 'Apply {stagger_per_hit} Stagger per hit the enemy intends (max {max_hits}). Draw {draw} card.',
      effects: [{ type: 'status', target: 'target', id: 'stagger', amount: { scale: { fn: 'target_intent_hits_max3' } } }, { type: 'draw', n: 1 }] },
    amounts: { target_intent_hits_max3: (ctx) => {
      if (ctx.frame.target === null || ctx.frame.target === 'player' || ctx.combat === null) return 0; // No hovered enemy in a preview.
      const enemy = ctx.combat.enemies.find((e) => e.uid === ctx.frame.target);
      if (!enemy) throw new Error('Gyro Jammer: unknown target');
      const intent = enemy.intent;
      return ['attack', 'attack_defend', 'attack_buff', 'attack_debuff'].includes(intent.kind)
        ? Math.min(GYRO.max_hits, intent.hits ?? 1) * GYRO.stagger_per_hit : 0;
    } }, icon: 'card_gyro_jammer', tags: ['stagger', 'debuff', 'multihit', 'intent'] },
  { id: 'ballast_lock', name: 'Ballast Lock', cls: 'colorless', type: 'skill', rarity: 'uncommon', cost: 2, target: 'self', keywords: [],
    text: "Gain {guard} Guard. Next turn, your Guard doesn't halve.",
    effects: [{ type: 'guard', amount: 10 }, { type: 'status', target: 'self', id: 'guard_lock', amount: 1 }],
    upgrade: { effects: [{ type: 'guard', amount: 14 }, { type: 'status', target: 'self', id: 'guard_lock', amount: 1 }] },
    icon: 'card_ballast_lock', tags: ['guard', 'defence', 'forecast'] },
  { id: 'jettison_pod', name: 'Jettison Pod', cls: 'colorless', type: 'skill', rarity: 'uncommon', cost: 0, target: 'self', keywords: ['retain', 'exhaust'],
    text: 'Keep. Gain {guard} Guard. Scrap.', effects: [{ type: 'guard', amount: 6 }], upgrade: { effects: [{ type: 'guard', amount: 9 }] },
    icon: 'card_jettison_pod', tags: ['guard', 'potion_like', 'exhaust', 'retain'] },
  { id: 'overdraft_cell', name: 'Overdraft Cell', cls: 'colorless', type: 'skill', rarity: 'uncommon', cost: 0, target: 'none', keywords: ['exhaust'],
    text: 'Gain {energy} energy. Add a Drift to your hand. Scrap.', effects: [{ type: 'energy', n: 2 }, { type: 'add_card', card: 'status_drift', to: 'hand' }],
    upgrade: { text: 'Gain {energy} energy. Draw {draw} card. Add a Drift to your hand. Scrap.', effects: [{ type: 'energy', n: 2 }, { type: 'draw', n: 1 }, { type: 'add_card', card: 'status_drift', to: 'hand' }] },
    icon: 'card_overdraft_cell', tags: ['energy', 'status', 'exhaust', 'burst_turn'] },
  { id: 'star_survey', name: 'Star Survey', cls: 'colorless', type: 'skill', rarity: 'uncommon', cost: 0, target: 'self', keywords: ['innate', 'exhaust'],
    text: 'Opening. Gain Augury. Draw {draw} card. Scrap.', effects: [{ type: 'status', target: 'self', id: 'augury', amount: 1 }, { type: 'draw', n: 1 }],
    upgrade: { text: 'Opening. Gain Augury. Draw {draw} cards. Scrap.', effects: [{ type: 'status', target: 'self', id: 'augury', amount: 1 }, { type: 'draw', n: 2 }] },
    icon: 'card_star_survey', tags: ['augury', 'information', 'draw', 'exhaust', 'innate'] },
  { id: 'fault_beacon', name: 'Fault Beacon', cls: 'colorless', type: 'skill', rarity: 'uncommon', cost: 1, target: 'none', keywords: ['delay'],
    // Phase C (cf -5.7): pays now as well as next turn.
    text: 'Apply {status} Exposed to ALL enemies. Delay {delay_turns}: apply {delay_exposed} more.',
    effects: [{ type: 'status', target: 'all_enemies', id: 'exposed', amount: 2 }],
    delay: { turns: 1, effects: [{ type: 'status', target: 'all_enemies', id: 'exposed', amount: 2, key: 'delay_exposed' }] },
    upgrade: { effects: [{ type: 'status', target: 'all_enemies', id: 'exposed', amount: 3 }], delay: { turns: 1, effects: [{ type: 'status', target: 'all_enemies', id: 'exposed', amount: 3, key: 'delay_exposed' }] } },
    icon: 'card_fault_beacon', tags: ['delay', 'exposed', 'aoe', 'setup'] },
  { id: 'snare_line', name: 'Snare Line', cls: 'colorless', type: 'skill', rarity: 'uncommon', cost: 1, target: 'self', keywords: ['riposte'],
    text: 'Gain {block} Block. Riposte: apply {rstagger} Stagger to the attacker.', effects: [{ type: 'block', amount: 6 }],
    riposte: [{ type: 'status', target: 'target', id: 'stagger', amount: 3, key: 'rstagger' }],
    upgrade: { effects: [{ type: 'block', amount: 8 }], riposte: [{ type: 'status', target: 'target', id: 'stagger', amount: 4, key: 'rstagger' }] },
    icon: 'card_snare_line', tags: ['riposte', 'stagger', 'block', 'multihit'] },
  // Phase D: still never played as a removal skill (v2 0.02 plays/draw, cf -1.5). Now an attack the bot and the
  // player both play, with a curse removal when one is in hand (RULINGS 7 cap applies).
  { id: 'cutting_torch', name: 'Cutting Torch', cls: 'colorless', type: 'attack', rarity: 'rare', cost: 1, target: 'enemy', keywords: [],
    text: 'Deal {damage} damage. Remove a Curse in your hand from your deck.',
    effects: [{ type: 'damage', amount: 9, target: 'target' }, { type: 'remove_card', from: 'hand', choose: true, filter: { type: 'curse' } }],
    upgrade: { effects: [{ type: 'damage', amount: 12, target: 'target' }, { type: 'remove_card', from: 'hand', choose: true, filter: { type: 'curse' } }] },
    icon: 'card_cutting_torch', tags: ['removal', 'curse', 'damage'] },
  { id: 'clean_manifest', name: 'Clean Manifest', cls: 'colorless', type: 'attack', rarity: 'rare', cost: 2, target: 'enemy', keywords: [], values: MANIFEST,
    text: 'Deal {damage} damage, +{damage_per} per card fewer than {deck_threshold} in your deck.',
    effects: [{ type: 'damage', amount: { base: 6, per: 2, scale: { fn: 'cards_under_20' } }, target: 'target' }],
    upgrade: { effects: [{ type: 'damage', amount: { base: 6, per: 3, scale: { fn: 'cards_under_20' } }, target: 'target' }] },
    amounts: { cards_under_20: (ctx) => Math.max(0, MANIFEST.deck_threshold - ctx.state.player.deck.length) },
    icon: 'card_clean_manifest', tags: ['lean_deck', 'deck_size', 'burst', 'build_around'] },
  { id: 'salvage_kiln', name: 'Salvage Kiln', cls: 'colorless', type: 'power', rarity: 'rare', cost: 1, target: 'self', keywords: [],
    values: KILN, text: 'At the end of your turn, deal {damage_per} damage to ALL enemies for each card in your Scrapheap.', effects: [{ type: 'status', target: 'self', id: 'salvage_kiln', amount: 1 }],
    upgrade: { keywords: ['innate'], text: 'Opening. At the end of your turn, deal {damage_per} damage to ALL enemies for each card in your Scrapheap.' },
    icon: 'card_salvage_kiln', tags: ['power', 'exhaust_payoff', 'damage', 'build_around', 'engine:scrapheap'] },
  { id: 'prism_resonance', name: 'Prism Resonance', cls: 'colorless', type: 'power', rarity: 'rare', cost: 2, target: 'self', keywords: [], values: PRISM,
    text: 'At the start of your turn, gain {guard_per_shard} Guard per Shard you hold.', effects: [{ type: 'status', target: 'self', id: 'prism_resonance', amount: 1 }],
    upgrade: { cost: 1 }, icon: 'card_prism_resonance', tags: ['power', 'shards', 'guard', 'build_around'] },
  // Phase C: the custom finish-card splice threw "missing finished copy"; now plain DSL. The Shards are gated
  // on the removal (removed_self), since a capped removal (RULINGS 7) leaves the card in the deck.
  { id: 'shard_cache', name: 'Shard Cache', cls: 'colorless', type: 'skill', rarity: 'rare', cost: 0, target: 'none', keywords: ['exhaust'],
    text: 'Gain {energy} energy. Remove this card from your deck; if you do, gain {shards} Shards. Scrap.',
    effects: [{ type: 'energy', n: 2 }, { type: 'remove_card', self: true }, { type: 'conditional', if: { type: 'removed_self' }, then: [{ type: 'shards', amount: 2 }] }],
    upgrade: { effects: [{ type: 'energy', n: 2 }, { type: 'remove_card', self: true }, { type: 'conditional', if: { type: 'removed_self' }, then: [{ type: 'shards', amount: 3 }] }] },
    icon: 'card_shard_cache', tags: ['shards', 'energy', 'one_shot', 'deck_surgery', 'exhaust'] },
  { id: 'mirror_tether', name: 'Mirror Tether', cls: 'colorless', type: 'attack', rarity: 'rare', cost: 2, target: 'enemy', keywords: ['exhaust'],
    text: 'Deal damage equal to the damage the enemy intends. Scrap.', effects: [{ type: 'damage', amount: { scale: { intent_damage: 'target' } }, target: 'target' }],
    upgrade: { text: 'Deal {damage_base} damage plus the damage the enemy intends. Scrap.', effects: [{ type: 'damage', amount: { base: 8, scale: { intent_damage: 'target' } }, target: 'target' }] },
    icon: 'card_mirror_tether', tags: ['burst', 'intent', 'exhaust', 'answer_big_hit'] },
  { id: 'grav_clamp', name: 'Grav Clamp', cls: 'colorless', type: 'skill', rarity: 'rare', cost: 2, target: 'enemy', keywords: ['exhaust'],
    text: 'The enemy skips its next move. Scrap.', effects: [{ type: 'halt_enemy', target: 'target' }],
    upgrade: { keywords: ['retain', 'exhaust'], text: 'Keep. The enemy skips its next move. Scrap.' },
    icon: 'card_grav_clamp', tags: ['potion_like', 'control', 'exhaust', 'forecast'] },
  // ---------------------------------------------------------------------------
  // Shared v2 (docs/v2/shared-design.md §4): the four shared engines.
  // Redline (Strain)
  { id: 'blood_tithe', name: 'Blood Tithe', cls: 'colorless', type: 'skill', rarity: 'uncommon', cost: 0, target: 'none', keywords: [],
    text: 'Strain {strain}. Draw {draw} cards.',
    // Phase F: draw 3 (4) (was 2 / 3): Redline johnnies held 3+ pieces in half their runs and still won 13-25%.
    effects: [{ type: 'strain', amount: 2 }, { type: 'draw', n: 3 }],
    upgrade: { effects: [{ type: 'strain', amount: 2 }, { type: 'draw', n: 4 }] },
    icon: 'card_blood_tithe', tags: ['strain', 'draw', 'engine:redline', 'role:enabler'] },
  { id: 'vent_plasma', name: 'Vent Plasma', cls: 'colorless', type: 'attack', rarity: 'uncommon', cost: 1, target: 'all_enemies', keywords: [],
    text: 'Strain {strain}. Deal {damage} damage to ALL enemies.',
    // Phase F: 10 (13) (was 9 / 12; 11 in round 1, when Redline johnnies overshot to 33%).
    effects: [{ type: 'strain', amount: 2 }, { type: 'damage', amount: 10, target: 'all_enemies' }],
    upgrade: { effects: [{ type: 'strain', amount: 2 }, { type: 'damage', amount: 13, target: 'all_enemies' }] },
    icon: 'card_vent_plasma', tags: ['strain', 'aoe', 'engine:redline', 'role:enabler'] },
  { id: 'scar_tissue', name: 'Scar Tissue', cls: 'colorless', type: 'power', rarity: 'rare', cost: 1, target: 'self', keywords: [], values: SCAR,
    text: 'Whenever you Strain, gain that much Guard and draw {draws} card (at most {max} draws per turn).',
    effects: [{ type: 'status', target: 'self', id: 'scar_tissue', amount: 1 }],
    upgrade: { keywords: ['innate'], text: 'Opening. Whenever you Strain, gain that much Guard and draw {draws} card (at most {max} draws per turn).' },
    icon: 'card_scar_tissue', tags: ['power', 'strain', 'guard', 'draw', 'engine:redline', 'role:payoff'] },
  { id: 'last_light', name: 'Last Light', cls: 'colorless', type: 'attack', rarity: 'rare', cost: 3, target: 'enemy', keywords: ['exhaust'],
    text: 'Deal {damage} damage ({damage_per} per HP you are missing). Scrap.',
    effects: [{ type: 'damage', amount: { per: 2, scale: 'missing_hp' }, target: 'target' }],
    upgrade: { cost: 2 },
    icon: 'card_last_light', tags: ['burst', 'strain', 'exhaust', 'engine:redline', 'role:payoff', 'timmy'] },
  // Scrapheap (Salvage)
  { id: 'spare_capacitor', name: 'Spare Capacitor', cls: 'colorless', type: 'skill', rarity: 'uncommon', cost: 0, target: 'self', keywords: ['exhaust'],
    // Phase F: 4 (6) Guard and the Salvage draws 1 too (was 3 / 5 Guard, energy only).
    text: 'Gain {guard} Guard. Scrap. Salvage: gain {senergy} energy and draw {sdraw} card.',
    effects: [{ type: 'guard', amount: 4 }], salvage: [{ type: 'energy', n: 1, key: 'senergy' }, { type: 'draw', n: 1, key: 'sdraw' }],
    upgrade: { effects: [{ type: 'guard', amount: 6 }] },
    icon: 'card_spare_capacitor', tags: ['salvage', 'guard', 'energy', 'exhaust', 'engine:scrapheap', 'role:enabler'] },
  { id: 'shrapnel_charge', name: 'Shrapnel Charge', cls: 'colorless', type: 'attack', rarity: 'uncommon', cost: 1, target: 'enemy', keywords: [],
    // Phase F: an uncommon Scrapheap payoff that counts the heap (+1 per card; it keeps paying under the ruling 72 floor).
    text: 'Deal {damage} damage, +{damage_per} per card in your Scrapheap. Salvage: deal {sdamage} damage to ALL enemies.',
    effects: [{ type: 'damage', amount: { base: 8, per: 1, scale: 'cards_in_exhaust' }, target: 'target' }], salvage: [{ type: 'damage', amount: 8, target: 'all_enemies', key: 'sdamage' }],
    upgrade: { effects: [{ type: 'damage', amount: { base: 10, per: 1, scale: 'cards_in_exhaust' }, target: 'target' }], salvage: [{ type: 'damage', amount: 11, target: 'all_enemies', key: 'sdamage' }] },
    icon: 'card_shrapnel_charge', tags: ['salvage', 'aoe', 'prune_fodder', 'engine:scrapheap', 'role:payoff'] },
  // Phase E: playable (never-played as an Unplayable card). Played, it Scraps itself and refunds its cost with a draw;
  // Scrapped by anything else (Prune, Strip for Parts, Kiln Salts, Triage), it is pure gain.
  // Phase F (round 2): costs 0 (was 1), so a played Black Box nets the energy too.
  { id: 'black_box', name: 'Black Box', cls: 'colorless', type: 'skill', rarity: 'uncommon', cost: 0, target: 'none', keywords: ['exhaust'],
    text: 'Scrap. Salvage: gain {senergy} energy and draw {sdraw} cards.',
    effects: [], salvage: [{ type: 'energy', n: 1, key: 'senergy' }, { type: 'draw', n: 2, key: 'sdraw' }],
    upgrade: { salvage: [{ type: 'energy', n: 1, key: 'senergy' }, { type: 'draw', n: 3, key: 'sdraw' }] },
    icon: 'card_black_box', tags: ['salvage', 'energy', 'draw', 'prune_fodder', 'engine:scrapheap', 'role:enabler', 'johnny'] },
  { id: 'strip_for_parts', name: 'Strip for Parts', cls: 'colorless', type: 'skill', rarity: 'uncommon', cost: 1, target: 'none', keywords: [],
    text: 'Scrap up to {exhaust} cards in your hand. Gain {guard_per} Guard for each. Draw {draw} card.',
    // Phase F: 5 Guard per Scrap (was 4), and it draws 1 (it no longer shrinks your hand by three).
    effects: [{ type: 'exhaust', from: 'hand', choose: true, upTo: true, n: 2, then: [{ type: 'guard', amount: { per: 5, scale: 'scrapped' } }] }, { type: 'draw', n: 1 }],
    upgrade: { cost: 0 },
    icon: 'card_strip_for_parts', tags: ['scrap_other', 'guard', 'engine:scrapheap', 'role:enabler'] },
  // Phase F (round 3): costs 1 (was 2).
  { id: 'scrapheap_colossus', name: 'Scrapheap Colossus', cls: 'colorless', type: 'attack', rarity: 'rare', cost: 1, target: 'enemy', keywords: [],
    text: 'Deal {damage} damage, +{damage_per} per card in your Scrapheap.',
    // Phase F: +3 (+4) per Scrapheap card (was +2 / +3; a rare payoff the ruling 72 floor caps at the deck size minus 8).
    effects: [{ type: 'damage', amount: { base: 8, per: 3, scale: 'cards_in_exhaust' }, target: 'target' }],
    upgrade: { effects: [{ type: 'damage', amount: { base: 8, per: 4, scale: 'cards_in_exhaust' }, target: 'target' }] },
    icon: 'card_scrapheap_colossus', tags: ['burst', 'exhaust_payoff', 'engine:scrapheap', 'role:payoff', 'timmy'] },
  { id: 'burn_bright', name: 'Burn Bright', cls: 'colorless', type: 'power', rarity: 'rare', cost: 2, target: 'self', keywords: [], values: BURN,
    text: 'Your cards with Scrap cost {cost} less.',
    effects: [{ type: 'status', target: 'self', id: 'burn_bright', amount: 1 }],
    upgrade: { cost: 1 },
    icon: 'card_burn_bright', tags: ['power', 'exhaust', 'cost', 'engine:scrapheap', 'role:multiplier', 'johnny'] },
  // Overflow (Reserve, X)
  { id: 'arc_discharge', name: 'Arc Discharge', cls: 'colorless', type: 'attack', rarity: 'uncommon', cost: 'X', target: 'none', keywords: [],
    text: 'Deal {damage} damage to a random enemy {times} times.',
    // Phase F: 6 (7) per hit (was 5 / 6): one of Overflow's two uncommons, among the weakest colourless (value/E 12).
    effects: [{ type: 'damage', amount: 6, times: { base: 1, per: 1, scale: 'x' }, target: 'random_enemy' }],
    upgrade: { effects: [{ type: 'damage', amount: 7, times: { base: 1, per: 1, scale: 'x' }, target: 'random_enemy' }] },
    icon: 'card_arc_discharge', tags: ['x_cost', 'multihit', 'reserve', 'engine:overflow', 'role:enabler'] },
  // Phase F: costs 0 (was 1). Reserve only feeds X costs, so it is Overflow-only value.
  { id: 'capacitor_bank', name: 'Capacitor Bank', cls: 'colorless', type: 'skill', rarity: 'uncommon', cost: 0, target: 'none', keywords: [],
    text: 'Gain {status} Reserve. Draw {draw} card.',
    effects: [{ type: 'status', target: 'self', id: 'reserve', amount: 2 }, { type: 'draw', n: 1 }],
    upgrade: { effects: [{ type: 'status', target: 'self', id: 'reserve', amount: 3 }, { type: 'draw', n: 1 }] },
    icon: 'card_capacitor_bank', tags: ['reserve', 'x_support', 'draw', 'engine:overflow', 'role:enabler'] },
  { id: 'starfall_lance', name: 'Starfall Lance', cls: 'colorless', type: 'attack', rarity: 'rare', cost: 'X', target: 'all_enemies', keywords: ['exhaust'],
    text: 'Deal {damage} damage to ALL enemies {times} times. Scrap.',
    effects: [{ type: 'damage', amount: 8, times: 'X', target: 'all_enemies' }],
    upgrade: { effects: [{ type: 'damage', amount: 10, times: 'X', target: 'all_enemies' }] },
    icon: 'card_starfall_lance', tags: ['x_cost', 'aoe', 'burst', 'exhaust', 'engine:overflow', 'role:payoff', 'timmy'] },
  { id: 'stasis_bolt', name: 'Stasis Bolt', cls: 'colorless', type: 'attack', rarity: 'rare', cost: 'X', target: 'enemy', keywords: ['delay'],
    text: 'Delay {delay_turns}: deal {delay_damage} damage {times} times.',
    effects: [], delay: { turns: 1, effects: [{ type: 'damage', amount: 12, times: 'X', target: 'target', key: 'delay_damage' }] },
    upgrade: { delay: { turns: 1, effects: [{ type: 'damage', amount: 15, times: 'X', target: 'target', key: 'delay_damage' }] } },
    icon: 'card_stasis_bolt', tags: ['x_cost', 'delay', 'burst', 'engine:overflow', 'role:payoff', 'timmy'] },
  // Reprise
  // Phase F: no longer Scraps itself (Reprise has two cards; a one-shot Encore never made a deck). Ruling 65 still caps a play at two resolutions.
  // Phase F (round 2): uncommon (was rare): Reprise johnnies held about one piece a run.
  { id: 'encore', name: 'Encore', cls: 'colorless', type: 'skill', rarity: 'uncommon', cost: 1, target: 'none', keywords: [],
    text: 'Your next card this turn has Reprise.',
    effects: [{ type: 'status', target: 'self', id: 'reprise', amount: 1 }],
    upgrade: { cost: 0 },
    icon: 'card_encore', tags: ['reprise', 'multiplier', 'engine:reprise', 'role:multiplier', 'johnny'] },
  // Phase D (RULINGS 70 follow-up): the Reprise engine's second card, so a Reprise deck can reach 3 pieces.
  { id: 'second_verse', name: 'Second Verse', cls: 'colorless', type: 'skill', rarity: 'uncommon', cost: 1, target: 'self', keywords: [], values: VERSE,
    text: 'Gain {block} Block. If the next card you play this turn costs {min_cost} or more, it has Reprise.',
    // Phase F: 7 (9) Block (was 5 / 7).
    effects: [{ type: 'block', amount: 7 }, { type: 'status', target: 'self', id: 'reprise_big', amount: 1 }],
    upgrade: { effects: [{ type: 'block', amount: 9 }, { type: 'status', target: 'self', id: 'reprise_big', amount: 1 }] },
    icon: 'card_second_verse', tags: ['reprise', 'block', 'engine:reprise', 'role:enabler'] },
  // Goad for anyone (chronist-design §9 ask)
  { id: 'bait_flare', name: 'Bait Flare', cls: 'colorless', type: 'skill', rarity: 'uncommon', cost: 0, target: 'enemy', keywords: [],
    // Phase E (Graft designer, docs/v2/graft-design.md §14): +4 Block so it is playable outside Goad decks (never played on Graft).
    text: 'Apply {goad} Goad to an enemy. Gain {block} Block. Draw {draw} card.',
    effects: [{ type: 'status', target: 'target', id: 'goaded', amount: 3, key: 'goad' }, { type: 'block', amount: 4 }, { type: 'draw', n: 1 }],
    upgrade: { text: 'Apply {goad} Goad to an enemy. Gain {block} Block. Draw {draw} cards.', effects: [{ type: 'status', target: 'target', id: 'goaded', amount: 3, key: 'goad' }, { type: 'block', amount: 4 }, { type: 'draw', n: 2 }] },
    icon: 'card_bait_flare', tags: ['goad', 'draw', 'intent', 'role:enabler', 'johnny'] },
  // Spare Fuse's token (special: never in a reward, shop or Transmute pool)
  { id: 'fuse', name: 'Fuse', cls: 'colorless', type: 'skill', rarity: 'special', cost: 0, target: 'none', keywords: ['exhaust'],
    text: 'Draw {draw} card. Scrap. Salvage: gain {sguard} Guard.',
    effects: [{ type: 'draw', n: 1 }], salvage: [{ type: 'guard', amount: 2, key: 'sguard' }],
    upgrade: {}, icon: 'card_fuse', tags: ['token', 'salvage', 'draw', 'exhaust'] },
];

export const COLORLESS_STATUSES: StatusDef[] = [
  { id: 'guard_lock', name: 'Ballast Lock', stacks: 'flag', decay: 'start_player_turn', decayBy: 'all', tick: 'never', isDebuff: false,
    text: "Next turn, your Guard doesn't halve.", hooks: { guardDecay: () => 0 }, icon: 'status_guard_lock' },
  { id: 'salvage_kiln', name: 'Salvage Kiln', stacks: 'amount', decay: 'never', tick: 'never', isDebuff: false, values: KILN,
    text: 'At the end of your turn, deal {damage_per} damage to ALL enemies for each card in your Scrapheap (×{stacks}).',
    triggers: { onTurnEnd: [{ type: 'repeat', times: { scale: 'stacks' }, effects: [{ type: 'damage', target: 'all_enemies', amount: { per: KILN.damage_per, scale: 'cards_in_exhaust' } }] }] }, icon: 'status_salvage_kiln' },
  { id: 'prism_resonance', name: 'Prism Resonance', stacks: 'amount', decay: 'never', tick: 'never', isDebuff: false, values: PRISM,
    text: 'At the start of your turn, gain {guard_per_shard} Guard per Shard you hold (×{stacks}).',
    triggers: { onTurnStart: [{ type: 'repeat', times: { scale: 'stacks' }, effects: [{ type: 'guard', amount: { per: PRISM.guard_per_shard, scale: 'shards' } }] }] }, icon: 'status_prism_resonance' },
  // Drift is a status card; its next-turn penalty needs a temporary player status.
  { id: 'drift_energy', name: 'Drift', stacks: 'amount', decay: 'start_player_turn', decayBy: 'all', tick: 'start_player_turn', isDebuff: true,
    text: 'Next turn, lose {stacks} energy.', triggers: { onTick: [{ type: 'energy', n: { per: -1, scale: 'stacks' } }] }, icon: 'status_drift_energy' },
  { id: 'backlash_cards', name: 'Primed Backlash', stacks: 'amount', decay: 'never', tick: 'never', isDebuff: true, hidden: true,
    text: 'Backlash cards waiting for the next enemy hit or your next turn.',
    hooks: { onStatusChanged: (ctx, info) => {
      const c = ctx.combat;
      if (!c || info.target !== 'player' || info.id !== 'backlash_primed' || info.delta >= 0 || c.player.statuses.backlash_primed) return;
      for (const card of c.inPlay.filter((copy) => copy.id === 'status_backlash').reverse()) {
        c.queue.unshift({ kind: 'effect', effect: { type: 'exhaust', from: 'hand', self: true }, frame: {
          src: { kind: 'card', uid: card.uid, id: card.id, upgraded: card.upgraded }, self: 'player', target: null, x: 0,
        } });
      }
      ctx.queue([{ type: 'status', target: 'self', id: 'backlash_cards', amount: -ctx.stacks }]);
    } }, icon: 'status_backlash_cards' },
  // --- Shared v2
  { id: 'reserve', name: 'Reserve', stacks: 'amount', decay: 'never', tick: 'never', isDebuff: false,
    text: 'Your next X-cost card adds {stacks} to X.', icon: 'status_reserve' },
  { id: 'reprise', name: 'Reprise', stacks: 'amount', decay: 'end_player_turn', decayBy: 'all', tick: 'never', isDebuff: false,
    text: 'Your next card this turn has Reprise.', icon: 'status_reprise' },
  // Second Verse: the next card played this turn (whatever its cost) uses it up; it grants Reprise only if that card
  // cost {min_cost}+ (X cards: X). onCardPlayed queues the removal, and the Reprise check in the same play still sees it.
  { id: 'reprise_big', name: 'Second Verse', stacks: 'amount', decay: 'end_player_turn', decayBy: 'all', tick: 'never', isDebuff: false, values: VERSE,
    text: 'If the next card you play this turn costs {min_cost} or more, it has Reprise.',
    hooks: {
      grantsReprise: (_ctx, info) => (info.def.cost === 'X' ? info.x : info.costPaid) >= VERSE.min_cost,
      onCardPlayed: (ctx) => ctx.queue([{ type: 'status', target: 'self', id: 'reprise_big', amount: { per: -1, scale: 'stacks' } }]),
    },
    icon: 'status_reprise' },
  { id: 'scar_tissue', name: 'Scar Tissue', stacks: 'amount', decay: 'never', tick: 'never', isDebuff: false, values: SCAR,
    text: 'Whenever you Strain, gain that much Guard (×{stacks}) and draw {draws} card (at most {max} draws per turn).',
    hooks: { onStrain: (ctx, info) => {
      const c = ctx.combat;
      if (!c) throw new Error('Scar Tissue outside combat');
      const effects: Effect[] = [{ type: 'guard', amount: info.amount * ctx.stacks }];
      // Draws this turn (none yet = 0); the turn key resets the count.
      const drawn = c.counters[SCAR_KEYS.turn] === c.turn ? (c.counters[SCAR_KEYS.draws] ?? 0) : 0;
      if (drawn < SCAR.max) {
        c.counters[SCAR_KEYS.turn] = c.turn;
        c.counters[SCAR_KEYS.draws] = drawn + SCAR.draws;
        effects.push({ type: 'draw', n: SCAR.draws });
      }
      ctx.queue(effects);
    } }, icon: 'status_scar_tissue' },
  { id: 'burn_bright', name: 'Burn Bright', stacks: 'amount', decay: 'never', tick: 'never', isDebuff: false, values: BURN,
    text: 'Your cards with Scrap cost {cost} less (×{stacks}).',
    hooks: { modifyCardCost: (ctx, card, cost) => ((getCardDef(card.id, card.upgraded).keywords ?? []).includes('exhaust') ? cost - BURN.cost * ctx.stacks : cost) },
    icon: 'status_burn_bright' },
];
