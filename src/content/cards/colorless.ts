import type { CardDef, Effect, StatusDef } from '../../engine/types';

const TORCH = { hp_loss: 3 };
const GYRO = { stagger_per_hit: 1, max_hits: 3 };
const MANIFEST = { deck_threshold: 20 };
const PRISM = { guard_per_shard: 1 };

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
    effects: [{ type: 'draw', n: 2 }, { type: 'add_card', card: 'status_jitter', to: 'hand' }],
    upgrade: { text: 'Draw {draw} cards. Add {add_card} Jitters to your hand.', effects: [{ type: 'draw', n: 3 }, { type: 'add_card', card: 'status_jitter', to: 'hand', n: 2 }] },
    icon: 'card_relay_ping', tags: ['draw', 'status', 'cadence_fuel', 'prune_fodder'] },
  { id: 'shardfall', name: 'Shardfall', cls: 'colorless', type: 'attack', rarity: 'uncommon', cost: 2, target: 'enemy', keywords: ['exhaust'],
    text: 'Deal {damage} damage, +{damage_per} per Shard you hold. Scrap.',
    effects: [{ type: 'damage', amount: { base: 16, per: 2, scale: 'shards' }, target: 'target' }],
    upgrade: { effects: [{ type: 'damage', amount: { base: 16, per: 3, scale: 'shards' }, target: 'target' }] },
    icon: 'card_shardfall', tags: ['burst', 'shards', 'exhaust'] },
  { id: 'arc_lattice', name: 'Arc Lattice', cls: 'colorless', type: 'attack', rarity: 'uncommon', cost: 2, target: 'all_enemies', keywords: [],
    text: 'Deal {damage} damage, +{damage_per} per living enemy, to ALL enemies.',
    effects: [{ type: 'damage', amount: { base: 4, per: 2, scale: 'enemies_alive' }, target: 'all_enemies' }],
    upgrade: { effects: [{ type: 'damage', amount: { base: 6, per: 2, scale: 'enemies_alive' }, target: 'all_enemies' }] },
    icon: 'card_arc_lattice', tags: ['aoe', 'pack'] },
  { id: 'salvage_kit', name: 'Salvage Kit', cls: 'colorless', type: 'skill', rarity: 'uncommon', cost: 1, target: 'none', keywords: [],
    text: 'Choose: gain {block} Block, draw {draw} cards, or deal {damage} damage to ALL enemies.',
    effects: salvageOptions(7, 2, 5), upgrade: { effects: salvageOptions(10, 3, 8) },
    icon: 'card_salvage_kit', tags: ['choose', 'block', 'draw', 'aoe', 'flexible'] },
  { id: 'stress_fracture', name: 'Stress Fracture', cls: 'colorless', type: 'skill', rarity: 'uncommon', cost: 1, target: 'enemy', keywords: [],
    text: 'Apply {status} Exposed to an enemy. Gain {status2} Exposed.',
    effects: [{ type: 'status', target: 'target', id: 'exposed', amount: 3 }, { type: 'status', target: 'self', id: 'exposed', amount: 2 }],
    upgrade: { effects: [{ type: 'status', target: 'target', id: 'exposed', amount: 4 }, { type: 'status', target: 'self', id: 'exposed', amount: 2 }] },
    icon: 'card_stress_fracture', tags: ['exposed', 'debuff', 'multihit', 'risk'] },
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
    text: 'Delay {delay_turns}: apply {delay_exposed} Exposed to ALL enemies.', effects: [],
    delay: { turns: 1, effects: [{ type: 'status', target: 'all_enemies', id: 'exposed', amount: 2, key: 'delay_exposed' }] },
    upgrade: { delay: { turns: 1, effects: [{ type: 'status', target: 'all_enemies', id: 'exposed', amount: 3, key: 'delay_exposed' }] } },
    icon: 'card_fault_beacon', tags: ['delay', 'exposed', 'aoe', 'setup'] },
  { id: 'snare_line', name: 'Snare Line', cls: 'colorless', type: 'skill', rarity: 'uncommon', cost: 1, target: 'self', keywords: ['riposte'],
    text: 'Gain {block} Block. Riposte: apply {rstagger} Stagger to the attacker.', effects: [{ type: 'block', amount: 6 }],
    riposte: [{ type: 'status', target: 'target', id: 'stagger', amount: 3, key: 'rstagger' }],
    upgrade: { effects: [{ type: 'block', amount: 8 }], riposte: [{ type: 'status', target: 'target', id: 'stagger', amount: 4, key: 'rstagger' }] },
    icon: 'card_snare_line', tags: ['riposte', 'stagger', 'block', 'multihit'] },
  { id: 'cutting_torch', name: 'Cutting Torch', cls: 'colorless', type: 'skill', rarity: 'rare', cost: 1, target: 'none', keywords: ['exhaust'], values: TORCH,
    text: 'Remove a card in your hand from your deck. Lose {hp_loss} Max HP. Scrap.',
    effects: [{ type: 'custom', fn: 'torch_excise' }], upgrade: { cost: 0 },
    custom: {
      torch_excise: (ctx) => {
        const combat = ctx.combat;
        if (!combat) throw new Error('Cutting Torch outside combat');
        // The primitive checks the cap after Scrapping a picked hand card. Avoid offering
        // that pick when another removal has already consumed this turn's single slot.
        if ((combat.counters.pruneAway ?? 0) > 0) return;
        combat.counters.torch_deck_size = ctx.state.player.deck.length;
        // Confirm before picking; the engine's removal primitive filters generated/Bound cards
        // and owns cap_prune_away. A skipped or capped removal must not charge Max HP.
        ctx.queue([{ type: 'choose', prompt: 'Cutting Torch: remove a card from your deck?', options: [
          { label: 'Remove a card in your hand; lose {hp_loss} Max HP.', effects: [
            { type: 'remove_card', from: 'hand', choose: true }, { type: 'custom', fn: 'torch_cost' },
          ] },
          { label: 'Leave the deck unchanged.', effects: [] },
        ] }]);
      },
      torch_cost: (ctx) => {
        const before = ctx.combat?.counters.torch_deck_size;
        if (before === undefined) throw new Error('Cutting Torch missing removal snapshot');
        if (ctx.state.player.deck.length < before) ctx.queue([{ type: 'max_hp', amount: -TORCH.hp_loss }]);
      },
    }, icon: 'card_cutting_torch', tags: ['removal', 'deck_surgery', 'max_hp_cost', 'exhaust'] },
  { id: 'medbay_voucher', name: 'Medbay Voucher', cls: 'colorless', type: 'skill', rarity: 'rare', cost: 1, target: 'none', keywords: ['exhaust'],
    text: 'Spend {gold_abs} gold: gain {max_hp} Max HP. Scrap.',
    effects: [{ type: 'conditional', if: { type: 'compare', left: { scale: 'gold' }, op: '>=', right: 35 }, then: [{ type: 'gold', amount: -35 }, { type: 'max_hp', amount: 3 }] }],
    upgrade: { cost: 0 }, icon: 'card_medbay_voucher', tags: ['max_hp', 'heal', 'gold', 'economy', 'exhaust'] },
  { id: 'clean_manifest', name: 'Clean Manifest', cls: 'colorless', type: 'attack', rarity: 'rare', cost: 2, target: 'enemy', keywords: [], values: MANIFEST,
    text: 'Deal {damage} damage, +{damage_per} per card fewer than {deck_threshold} in your deck.',
    effects: [{ type: 'damage', amount: { base: 6, per: 2, scale: { fn: 'cards_under_20' } }, target: 'target' }],
    upgrade: { effects: [{ type: 'damage', amount: { base: 6, per: 3, scale: { fn: 'cards_under_20' } }, target: 'target' }] },
    amounts: { cards_under_20: (ctx) => Math.max(0, MANIFEST.deck_threshold - ctx.state.player.deck.length) },
    icon: 'card_clean_manifest', tags: ['lean_deck', 'deck_size', 'burst', 'build_around'] },
  { id: 'salvage_kiln', name: 'Salvage Kiln', cls: 'colorless', type: 'power', rarity: 'rare', cost: 1, target: 'self', keywords: [],
    text: 'When a card is Scrapped, apply {status} Exposed to a random enemy.', effects: [{ type: 'status', target: 'self', id: 'salvage_kiln', amount: 1 }],
    upgrade: { keywords: ['innate'], text: 'Opening. When a card is Scrapped, apply {status} Exposed to a random enemy.' },
    icon: 'card_salvage_kiln', tags: ['power', 'exhaust_payoff', 'exposed', 'build_around'] },
  { id: 'prism_resonance', name: 'Prism Resonance', cls: 'colorless', type: 'power', rarity: 'rare', cost: 2, target: 'self', keywords: [], values: PRISM,
    text: 'At the start of your turn, gain {guard_per_shard} Guard per Shard you hold.', effects: [{ type: 'status', target: 'self', id: 'prism_resonance', amount: 1 }],
    upgrade: { cost: 1 }, icon: 'card_prism_resonance', tags: ['power', 'shards', 'guard', 'build_around'] },
  { id: 'shard_cache', name: 'Shard Cache', cls: 'colorless', type: 'skill', rarity: 'rare', cost: 0, target: 'none', keywords: [],
    text: 'Gain {energy} energy and {shards} Shards. Remove this card from your deck.',
    effects: [{ type: 'energy', n: 2 }, { type: 'shards', amount: 2 }, { type: 'custom', fn: 'cache_self_remove' }],
    upgrade: { effects: [{ type: 'energy', n: 2 }, { type: 'shards', amount: 3 }, { type: 'custom', fn: 'cache_self_remove' }] },
    custom: {
      cache_self_remove: (ctx) => {
        const c = ctx.combat;
        const card = ctx.card;
        if (!c || !card) throw new Error('Shard Cache outside a card resolution');
        ctx.queue([{ type: 'remove_card', self: true }]);
        // Keep the source inPlay until finish_card runs (it requires that copy). Then Scrap
        // through the engine primitive, preserving exhaust events and all Scrap payoffs.
        const finish = c.queue.findIndex((item) => item.kind === 'finish_card' && item.uid === card.uid);
        if (finish < 0) throw new Error('Shard Cache missing finish_card');
        c.queue.splice(finish + 1, 0, { kind: 'effect', effect: { type: 'custom', fn: 'cache_scrap' }, frame: ctx.frame });
      },
      cache_scrap: (ctx) => {
        const c = ctx.combat;
        const card = ctx.card;
        if (!c || !card) throw new Error('Shard Cache missing combat copy');
        const at = c.discard.findIndex((copy) => copy.uid === card.uid);
        if (at < 0) throw new Error('Shard Cache missing finished copy');
        c.discard.splice(at, 1);
        c.inPlay.push(card);
        ctx.queue([{ type: 'exhaust', from: 'hand', self: true }]);
      },
    }, icon: 'card_shard_cache', tags: ['shards', 'energy', 'one_shot', 'deck_surgery'] },
  { id: 'mirror_tether', name: 'Mirror Tether', cls: 'colorless', type: 'attack', rarity: 'rare', cost: 2, target: 'enemy', keywords: ['exhaust'],
    text: 'Deal damage equal to the damage the enemy intends. Scrap.', effects: [{ type: 'damage', amount: { scale: { intent_damage: 'target' } }, target: 'target' }],
    upgrade: { text: 'Deal {damage_base} damage plus the damage the enemy intends. Scrap.', effects: [{ type: 'damage', amount: { base: 8, scale: { intent_damage: 'target' } }, target: 'target' }] },
    icon: 'card_mirror_tether', tags: ['burst', 'intent', 'exhaust', 'answer_big_hit'] },
  { id: 'grav_clamp', name: 'Grav Clamp', cls: 'colorless', type: 'skill', rarity: 'rare', cost: 2, target: 'enemy', keywords: ['exhaust'],
    text: 'The enemy skips its next move. Scrap.', effects: [{ type: 'halt_enemy', target: 'target' }],
    upgrade: { keywords: ['retain', 'exhaust'], text: 'Keep. The enemy skips its next move. Scrap.' },
    icon: 'card_grav_clamp', tags: ['potion_like', 'control', 'exhaust', 'forecast'] },
];

export const COLORLESS_STATUSES: StatusDef[] = [
  { id: 'guard_lock', name: 'Ballast Lock', stacks: 'flag', decay: 'start_player_turn', decayBy: 'all', tick: 'never', isDebuff: false,
    text: "Next turn, your Guard doesn't halve.", hooks: { guardDecay: () => 0 }, icon: 'status_guard_lock' },
  { id: 'salvage_kiln', name: 'Salvage Kiln', stacks: 'amount', decay: 'never', tick: 'never', isDebuff: false,
    text: 'When a card is Scrapped, apply {stacks} Exposed to a random enemy.',
    triggers: { onCardExhausted: [{ type: 'status', target: 'random_enemy', id: 'exposed', amount: { scale: 'stacks' } }] }, icon: 'status_salvage_kiln' },
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
];
