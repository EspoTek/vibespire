// Chronist pool, transcribed from docs/cards/chronist.md; overrides: docs/RULINGS.md 24–31.
// 56 cards: 4 starters (GDD §4.1) + 20 common + 20 uncommon + 12 rare. Mechanics: Cadence (on_beat),
// Delay / the Timeline (CardDef.delay, advance), Augury (forecast_is_attack, forecast_damage, intent_damage).
// cap_relay, cap_timeline, cap_advance and every other cap are engine-side; nothing here re-implements them.
import type { CardDef, CardInstance, Effect, RunState, StatusDef } from '../../engine/types';

// chronist.md §8 fn 1 ("the next card you play will be on the beat") is the engine's ctx.nextBeat()
// (beat positions with Cadence modifiers applied): Zenith / Upbeat canPlay, Perpetual Motion's cost modifier.

// ---------------------------------------------------------------------------
// Shared numbers (text placeholders read them through `values`, hooks read the same constants).

const WATCH_BELL = { bell: 3, alarm: 3 };
const PERPETUAL_MOTION = { discount: 1 };
const PM_USED = 'perpetual_motion_used';

// ---------------------------------------------------------------------------
// Effect shorthands

const hit = (amount: number, key?: string): Effect => (key === undefined ? { type: 'damage', amount, target: 'target' } : { type: 'damage', amount, target: 'target', key });
const hitAll = (amount: number, key?: string): Effect =>
  key === undefined ? { type: 'damage', amount, target: 'all_enemies' } : { type: 'damage', amount, target: 'all_enemies', key };
const block = (amount: number, key?: string): Effect => (key === undefined ? { type: 'block', amount } : { type: 'block', amount, key });
const guard = (amount: number, key?: string): Effect => (key === undefined ? { type: 'guard', amount } : { type: 'guard', amount, key });
const draw = (n: number, key?: string): Effect => (key === undefined ? { type: 'draw', n } : { type: 'draw', n, key });
const onBeat = (...effects: Effect[]): Effect => ({ type: 'on_beat', effects });
const power = (id: string, amount: number): Effect => ({ type: 'status', target: 'self', id, amount });

// ---------------------------------------------------------------------------
// Starters (GDD §4.1, final)

const STARTERS: CardDef[] = [
  {
    id: 'pulse_shot', name: 'Pulse Shot', cls: 'chronist', type: 'attack', rarity: 'starter', cost: 1, target: 'enemy', keywords: [],
    text: 'Deal {damage} damage.',
    effects: [hit(6)],
    upgrade: { effects: [hit(9)] },
    tags: ['starter', 'glue'], icon: 'card_pulse_shot',
  },
  {
    id: 'ward', name: 'Ward', cls: 'chronist', type: 'skill', rarity: 'starter', cost: 1, target: 'self', keywords: [],
    text: 'Gain {block} Block.',
    effects: [block(5)],
    upgrade: { effects: [block(8)] },
    tags: ['starter', 'glue', 'block'], icon: 'card_ward',
  },
  {
    id: 'tick', name: 'Tick', cls: 'chronist', type: 'attack', rarity: 'starter', cost: 0, target: 'enemy', keywords: [],
    text: 'Deal {damage} damage. On beat: draw {beat_draw} card.',
    effects: [hit(3), onBeat(draw(1, 'beat_draw'))],
    upgrade: { text: 'Deal {damage} damage. On beat: draw {beat_draw} cards.', effects: [hit(4), onBeat(draw(2, 'beat_draw'))] },
    tags: ['starter', 'metronome', 'glue', 'cheap', 'on_beat', 'draw'], icon: 'card_tick',
  },
  {
    id: 'tock', name: 'Tock', cls: 'chronist', type: 'skill', rarity: 'starter', cost: 1, target: 'self', keywords: ['delay'],
    text: 'Gain {block} Block. Delay {delay_turns}: gain {delay_block} Block.',
    effects: [block(3)],
    delay: { turns: 1, effects: [block(5, 'delay_block')] },
    upgrade: { effects: [block(4)], delay: { turns: 1, effects: [block(7, 'delay_block')] } },
    tags: ['starter', 'timeline', 'block', 'delay'], icon: 'card_tock',
  },
];

// ---------------------------------------------------------------------------
// Commons (20)

const slackWater = (base: number, lull: number): Effect[] => [
  { type: 'conditional', if: { type: 'forecast_is_attack', who: 'target', depth: 1 }, then: [hit(base)], else: [hit(lull, 'lull_damage')] },
];
const stormGlass = (b: number, extra: number): Effect[] => [
  block(b, 'delay_block'),
  { type: 'conditional', if: { type: 'forecast_is_attack', who: 'any', depth: 0 }, then: [block(extra, 'storm_block')] },
];
const weatherEye = (g: number, extra: number): Effect[] => [
  guard(g),
  { type: 'conditional', if: { type: 'forecast_is_attack', who: 'any', depth: 1 }, then: [guard(extra, 'storm_guard')] },
];
const reefTheSails = (b: number): Effect[] => [
  block(b),
  { type: 'conditional', if: { type: 'forecast_is_attack', who: 'target', depth: 1 }, then: [{ type: 'status', target: 'target', id: 'stagger', amount: 2, key: 'stagger' }] },
];

const COMMONS: CardDef[] = [
  {
    id: 'pinion_jab', name: 'Pinion Jab', cls: 'chronist', type: 'attack', rarity: 'common', cost: 0, target: 'enemy', keywords: [],
    text: 'Deal {damage} damage. On beat: apply {beat_exposed} Exposed.',
    effects: [hit(3), onBeat({ type: 'status', target: 'target', id: 'exposed', amount: 1, key: 'beat_exposed' })],
    upgrade: { effects: [hit(4), onBeat({ type: 'status', target: 'target', id: 'exposed', amount: 1, key: 'beat_exposed' })] },
    tags: ['metronome', 'glue', 'cheap', 'on_beat', 'exposed'], icon: 'card_pinion_jab',
  },
  {
    id: 'gear_train', name: 'Gear Train', cls: 'chronist', type: 'attack', rarity: 'common', cost: 1, target: 'enemy', keywords: [],
    text: 'Deal {damage} damage {times} times. On beat: deal {beat_damage} more.',
    effects: [{ type: 'damage', amount: 3, times: 2, target: 'target' }, onBeat(hit(3, 'beat_damage'))],
    upgrade: { effects: [{ type: 'damage', amount: 4, times: 2, target: 'target' }, onBeat(hit(4, 'beat_damage'))] },
    tags: ['metronome', 'glue', 'multihit', 'on_beat'], icon: 'card_gear_train',
  },
  {
    id: 'downbeat', name: 'Downbeat', cls: 'chronist', type: 'attack', rarity: 'common', cost: 2, target: 'enemy', keywords: [],
    text: 'Deal {damage} damage. On beat: deal {beat_damage} more.',
    effects: [hit(13), onBeat(hit(6, 'beat_damage'))],
    upgrade: { effects: [hit(16), onBeat(hit(8, 'beat_damage'))] },
    tags: ['metronome', 'on_beat'], icon: 'card_downbeat',
  },
  {
    id: 'slack_water', name: 'Slack Water', cls: 'chronist', type: 'attack', rarity: 'common', cost: 1, target: 'enemy', keywords: [],
    text: "Deal {damage} damage, or {lull_damage} if its intent after next isn't an attack.",
    effects: slackWater(7, 9),
    upgrade: { effects: slackWater(9, 12) },
    tags: ['oracle', 'glue', 'forecast'], icon: 'card_slack_water',
  },
  {
    id: 'parallax', name: 'Parallax', cls: 'chronist', type: 'attack', rarity: 'common', cost: 0, target: 'enemy', keywords: [],
    text: 'Deal {damage} damage {times} times.',
    effects: [{ type: 'damage', amount: 2, times: 2, target: 'target' }],
    upgrade: { effects: [{ type: 'damage', amount: 2, times: 3, target: 'target' }] },
    tags: ['metronome', 'glue', 'cheap', 'multihit'], icon: 'card_parallax',
  },
  {
    id: 'noon_gun', name: 'Noon Gun', cls: 'chronist', type: 'attack', rarity: 'common', cost: 1, target: 'enemy', keywords: ['delay'],
    text: 'Delay {delay_turns}: deal {delay_damage} damage.',
    effects: [],
    delay: { turns: 2, effects: [hit(14, 'delay_damage')] },
    upgrade: {
      keywords: ['delay', 'innate'],
      text: 'Opening. Delay {delay_turns}: deal {delay_damage} damage.',
      delay: { turns: 2, effects: [hit(16, 'delay_damage')] },
    },
    tags: ['timeline', 'delay'], icon: 'card_noon_gun',
  },
  {
    id: 'afterpeal', name: 'Afterpeal', cls: 'chronist', type: 'attack', rarity: 'common', cost: 1, target: 'enemy', keywords: ['delay'],
    text: 'Deal {damage} damage. Delay {delay_turns}: deal {delay_damage} damage; On beat: {beat_damage} more.',
    effects: [hit(3)],
    delay: { turns: 1, effects: [hit(4, 'delay_damage'), onBeat(hit(4, 'beat_damage'))] },
    upgrade: { effects: [hit(4)], delay: { turns: 1, effects: [hit(5, 'delay_damage'), onBeat(hit(5, 'beat_damage'))] } },
    tags: ['timeline', 'metronome', 'delay', 'on_beat'], icon: 'card_afterpeal',
  },
  {
    id: 'spring_tide', name: 'Spring Tide', cls: 'chronist', type: 'attack', rarity: 'common', cost: 1, target: 'all_enemies', keywords: ['delay'],
    text: 'Delay {delay_turns}: deal {delay_damage} damage to ALL enemies.',
    effects: [],
    delay: { turns: 3, effects: [hitAll(16, 'delay_damage')] },
    upgrade: { delay: { turns: 3, effects: [hitAll(20, 'delay_damage')] } },
    tags: ['timeline', 'delay', 'aoe'], icon: 'card_spring_tide',
  },
  {
    id: 'carillon', name: 'Carillon', cls: 'chronist', type: 'attack', rarity: 'common', cost: 0, target: 'all_enemies', keywords: [],
    text: 'Deal {damage} damage to ALL enemies. On beat: deal {beat_damage} more to each.',
    effects: [hitAll(3), onBeat(hitAll(2, 'beat_damage'))],
    upgrade: { effects: [hitAll(4), onBeat(hitAll(2, 'beat_damage'))] },
    tags: ['metronome', 'glue', 'cheap', 'aoe', 'on_beat'], icon: 'card_carillon',
  },
  {
    // RULINGS 25: the depth-0 condition is read at resolution, i.e. the move that was "after next" at play time.
    id: 'storm_glass', name: 'Storm Glass', cls: 'chronist', type: 'skill', rarity: 'common', cost: 1, target: 'self', keywords: ['delay'],
    text: 'Delay {delay_turns}: gain {delay_block} Block, +{storm_block} if any enemy intends to attack.',
    effects: [],
    delay: { turns: 1, effects: stormGlass(8, 4) },
    upgrade: { delay: { turns: 1, effects: stormGlass(10, 5) } },
    tags: ['oracle', 'timeline', 'block', 'delay', 'forecast'], icon: 'card_storm_glass',
  },
  {
    id: 'almanac', name: 'Almanac', cls: 'chronist', type: 'skill', rarity: 'common', cost: 0, target: 'none', keywords: ['delay'],
    text: 'Delay {delay_turns}: draw {delay_draw} cards.',
    effects: [],
    delay: { turns: 1, effects: [draw(2, 'delay_draw')] },
    upgrade: {
      text: 'Delay {delay_turns}: draw {delay_draw} cards. On beat: draw {beat_draw} more.',
      delay: { turns: 1, effects: [draw(2, 'delay_draw'), onBeat(draw(1, 'beat_draw'))] },
    },
    tags: ['timeline', 'glue', 'cheap', 'draw', 'delay'], icon: 'card_almanac',
  },
  {
    id: 'ephemeris', name: 'Ephemeris', cls: 'chronist', type: 'skill', rarity: 'common', cost: 1, target: 'none', keywords: [],
    text: 'Draw {draw} cards. On beat: draw {beat_draw} more.',
    effects: [draw(2), onBeat(draw(1, 'beat_draw'))],
    upgrade: { effects: [draw(2), onBeat(draw(2, 'beat_draw'))] },
    tags: ['glue', 'metronome', 'draw', 'on_beat'], icon: 'card_ephemeris',
  },
  {
    id: 'upbeat', name: 'Upbeat', cls: 'chronist', type: 'skill', rarity: 'common', cost: 0, target: 'self', keywords: [],
    text: "Gain {block} Block. Can't be played on the beat.",
    effects: [block(4)],
    hooks: { canPlay: (ctx) => (ctx.nextBeat().onBeat ? "Can't be played on the beat." : true) },
    upgrade: { effects: [block(6)] },
    tags: ['metronome', 'glue', 'cheap', 'block'], icon: 'card_upbeat',
  },
  {
    id: 'weather_eye', name: 'Weather Eye', cls: 'chronist', type: 'skill', rarity: 'common', cost: 1, target: 'self', keywords: [],
    text: "Gain {guard} Guard. If any enemy's intent after next is an attack, gain {storm_guard} more.",
    effects: weatherEye(6, 4),
    upgrade: { effects: weatherEye(8, 5) },
    tags: ['oracle', 'glue', 'guard', 'forecast'], icon: 'card_weather_eye',
  },
  {
    id: 'balance_wheel', name: 'Balance Wheel', cls: 'chronist', type: 'skill', rarity: 'common', cost: 1, target: 'self', keywords: [],
    text: 'Gain {block} Block. On beat: apply {beat_stagger} Stagger to ALL enemies.',
    effects: [block(6), onBeat({ type: 'status', target: 'all_enemies', id: 'stagger', amount: 1, key: 'beat_stagger' })],
    upgrade: { effects: [block(8), onBeat({ type: 'status', target: 'all_enemies', id: 'stagger', amount: 1, key: 'beat_stagger' })] },
    tags: ['metronome', 'oracle', 'block', 'on_beat', 'stagger'], icon: 'card_balance_wheel',
  },
  {
    id: 'detent', name: 'Detent', cls: 'chronist', type: 'skill', rarity: 'common', cost: 0, target: 'enemy', keywords: [],
    text: 'Apply {stagger} Stagger. On beat: apply {beat_stagger} more.',
    effects: [
      { type: 'status', target: 'target', id: 'stagger', amount: 1, key: 'stagger' },
      onBeat({ type: 'status', target: 'target', id: 'stagger', amount: 1, key: 'beat_stagger' }),
    ],
    upgrade: {
      effects: [
        { type: 'status', target: 'target', id: 'stagger', amount: 1, key: 'stagger' },
        onBeat({ type: 'status', target: 'target', id: 'stagger', amount: 2, key: 'beat_stagger' }),
      ],
    },
    tags: ['oracle', 'metronome', 'cheap', 'stagger', 'on_beat'], icon: 'card_detent',
  },
  {
    // cards_played_this_turn includes this card (appended at pay-cost time, GDD §2.7).
    id: 'dead_reckoning', name: 'Dead Reckoning', cls: 'chronist', type: 'skill', rarity: 'common', cost: 0, target: 'self', keywords: [],
    text: 'Gain {block} Block (+{block_per} per card played this turn).',
    effects: [{ type: 'block', amount: { base: 1, per: 1, scale: 'cards_played_this_turn' } }],
    upgrade: { effects: [{ type: 'block', amount: { base: 2, per: 1, scale: 'cards_played_this_turn' } }] },
    tags: ['metronome', 'glue', 'cheap', 'block', 'scaling'], icon: 'card_dead_reckoning',
  },
  {
    id: 'logbook', name: 'Logbook', cls: 'chronist', type: 'skill', rarity: 'common', cost: 1, target: 'self', keywords: [],
    text: 'Gain {block} Block (+{block_per} per Shard you hold).',
    effects: [{ type: 'block', amount: { base: 5, per: 1, scale: 'shards' } }],
    upgrade: { effects: [{ type: 'block', amount: { base: 7, per: 1, scale: 'shards' } }] },
    tags: ['glue', 'block', 'shards'], icon: 'card_logbook',
  },
  {
    id: 'reef_the_sails', name: 'Reef the Sails', cls: 'chronist', type: 'skill', rarity: 'common', cost: 1, target: 'enemy', keywords: [],
    text: 'Gain {block} Block. If its intent after next is an attack, apply {stagger} Stagger to it.',
    effects: reefTheSails(5),
    upgrade: { effects: reefTheSails(7) },
    tags: ['oracle', 'block', 'stagger', 'forecast'], icon: 'card_reef_the_sails',
  },
  {
    id: 'wind_forward', name: 'Wind Forward', cls: 'chronist', type: 'skill', rarity: 'common', cost: 0, target: 'none', keywords: [],
    text: 'Advance {advance}. If your Timeline is empty, gain {block} Block instead.',
    effects: [{ type: 'conditional', if: { type: 'timeline_nonempty' }, then: [{ type: 'advance', n: 1, key: 'advance' }], else: [block(4)] }],
    upgrade: {
      text: 'Advance {advance} and gain {adv_block} Block. If your Timeline is empty, gain {block} Block instead.',
      effects: [{ type: 'conditional', if: { type: 'timeline_nonempty' }, then: [{ type: 'advance', n: 1, key: 'advance' }, block(2, 'adv_block')], else: [block(6)] }],
    },
    tags: ['timeline', 'glue', 'cheap', 'advance'], icon: 'card_wind_forward',
  },
];

// ---------------------------------------------------------------------------
// Uncommons (20)

const sweepHand = (n: number): Effect[] => [{ type: 'conditional', if: { type: 'on_beat' }, then: [hitAll(n)], else: [hit(n)] }];
const battenDown = (n: number): Effect[] => [
  { type: 'conditional', if: { type: 'forecast_is_attack', who: 'target', depth: 0 }, then: [{ type: 'status', target: 'target', id: 'stagger', amount: n, key: 'delay_stagger' }] },
];
const markTheLull = (extra: number): Effect[] => [
  { type: 'status', target: 'target', id: 'exposed', amount: 1, key: 'exposed' },
  {
    type: 'conditional',
    if: { type: 'not', cond: { type: 'forecast_is_attack', who: 'target', depth: 1 } },
    then: [{ type: 'status', target: 'target', id: 'exposed', amount: extra, key: 'lull_exposed' }],
  },
];
const glanceAhead = (extra: number): Effect[] => [draw(1), { type: 'conditional', if: { type: 'timeline_nonempty' }, then: [draw(extra, 'timeline_draw')] }];

const UNCOMMONS: CardDef[] = [
  {
    // A branch on the on_beat condition, not an on_beat wrapper: Offbeat Drum / Polyrhythm don't repeat it.
    id: 'sweep_hand', name: 'Sweep Hand', cls: 'chronist', type: 'attack', rarity: 'uncommon', cost: 1, target: 'enemy', keywords: [],
    text: 'Deal {damage} damage. On beat: deal it to ALL enemies instead.',
    effects: sweepHand(9),
    upgrade: { effects: sweepHand(12) },
    tags: ['metronome', 'aoe', 'on_beat'], icon: 'card_sweep_hand',
  },
  {
    id: 'fermata', name: 'Fermata', cls: 'chronist', type: 'attack', rarity: 'uncommon', cost: 1, target: 'enemy', keywords: ['retain'],
    text: 'Keep. Deal {damage} damage. On beat: deal {beat_damage} more.',
    effects: [hit(3), onBeat(hit(9, 'beat_damage'))],
    upgrade: { effects: [hit(4), onBeat(hit(12, 'beat_damage'))] },
    tags: ['metronome', 'on_beat', 'keep'], icon: 'card_fermata',
  },
  {
    id: 'appointed_hour', name: 'Appointed Hour', cls: 'chronist', type: 'attack', rarity: 'uncommon', cost: 2, target: 'enemy', keywords: ['delay'],
    text: 'Delay {delay_turns}: deal {delay_damage} damage.',
    effects: [],
    delay: { turns: 2, effects: [hit(34, 'delay_damage')] },
    upgrade: { delay: { turns: 2, effects: [hit(42, 'delay_damage')] } },
    tags: ['timeline', 'oracle', 'delay'], icon: 'card_appointed_hour',
  },
  {
    id: 'knell', name: 'Knell', cls: 'chronist', type: 'attack', rarity: 'uncommon', cost: 1, target: 'all_enemies', keywords: ['delay'],
    text: 'Deal {damage} damage to ALL enemies. Delay {delay_turns}: deal {delay_damage} damage to ALL enemies.',
    effects: [hitAll(4)],
    delay: { turns: 2, effects: [hitAll(9, 'delay_damage')] },
    upgrade: { effects: [hitAll(5)], delay: { turns: 2, effects: [hitAll(12, 'delay_damage')] } },
    tags: ['timeline', 'delay', 'aoe'], icon: 'card_knell',
  },
  {
    // RULINGS 27: forecast_damage sums the target's forecast entries (depth >= 1; hidden = 0).
    id: 'turn_the_tide', name: 'Turn the Tide', cls: 'chronist', type: 'attack', rarity: 'uncommon', cost: 1, target: 'enemy', keywords: [],
    text: 'Deal {damage} damage, +half the damage of its intent after next.',
    effects: [{ type: 'damage', amount: { base: 4, per: 0.5, scale: 'forecast_damage' }, target: 'target' }],
    upgrade: { effects: [{ type: 'damage', amount: { base: 7, per: 0.5, scale: 'forecast_damage' }, target: 'target' }] },
    tags: ['oracle', 'forecast', 'scaling'], icon: 'card_turn_the_tide',
  },
  {
    id: 'confluence', name: 'Confluence', cls: 'chronist', type: 'attack', rarity: 'uncommon', cost: 0, target: 'enemy', keywords: [],
    text: 'Deal {damage} damage (+{damage_per} per card on your Timeline).',
    effects: [{ type: 'damage', amount: { base: 1, per: 2, scale: 'timeline_count' }, target: 'target' }],
    upgrade: { effects: [{ type: 'damage', amount: { base: 1, per: 3, scale: 'timeline_count' }, target: 'target' }] },
    tags: ['timeline', 'cheap', 'scaling'], icon: 'card_confluence',
  },
  {
    id: 'second_hand', name: 'Second Hand', cls: 'chronist', type: 'attack', rarity: 'uncommon', cost: 0, target: 'enemy', keywords: ['delay'],
    text: 'Delay {delay_turns}: deal {delay_damage} damage. On beat: {beat_damage} more.',
    effects: [],
    delay: { turns: 1, effects: [hit(4, 'delay_damage'), onBeat(hit(5, 'beat_damage'))] },
    upgrade: { delay: { turns: 1, effects: [hit(5, 'delay_damage'), onBeat(hit(6, 'beat_damage'))] } },
    tags: ['metronome', 'timeline', 'cheap', 'delay', 'on_beat'], icon: 'card_second_hand',
  },
  {
    id: 'mainspring', name: 'Mainspring', cls: 'chronist', type: 'skill', rarity: 'uncommon', cost: 0, target: 'none', keywords: [],
    text: 'On beat: gain {beat_energy} energy.',
    effects: [onBeat({ type: 'energy', n: 1, key: 'beat_energy' })],
    upgrade: { text: 'Gain {block} Block. On beat: gain {beat_energy} energy.', effects: [block(2), onBeat({ type: 'energy', n: 1, key: 'beat_energy' })] },
    tags: ['metronome', 'cheap', 'energy', 'on_beat'], icon: 'card_mainspring',
  },
  {
    id: 'quarter_chime', name: 'Quarter Chime', cls: 'chronist', type: 'skill', rarity: 'uncommon', cost: 0, target: 'none', keywords: [],
    text: 'On beat: draw {beat_draw} cards.',
    effects: [onBeat(draw(2, 'beat_draw'))],
    upgrade: { text: 'Gain {block} Block. On beat: draw {beat_draw} cards.', effects: [block(2), onBeat(draw(2, 'beat_draw'))] },
    tags: ['metronome', 'glue', 'cheap', 'draw', 'on_beat'], icon: 'card_quarter_chime',
  },
  {
    id: 'hasten', name: 'Hasten', cls: 'chronist', type: 'skill', rarity: 'uncommon', cost: 0, target: 'none', keywords: [],
    text: 'Advance {advance}. On beat: Advance {beat_advance} more.',
    effects: [{ type: 'advance', n: 1, key: 'advance' }, onBeat({ type: 'advance', n: 1, key: 'beat_advance' })],
    upgrade: {
      text: 'Gain {block} Block. Advance {advance}. On beat: Advance {beat_advance} more.',
      effects: [block(3), { type: 'advance', n: 1, key: 'advance' }, onBeat({ type: 'advance', n: 1, key: 'beat_advance' })],
    },
    tags: ['timeline', 'metronome', 'cheap', 'advance', 'on_beat'], icon: 'card_hasten',
  },
  {
    id: 'banked_hours', name: 'Banked Hours', cls: 'chronist', type: 'skill', rarity: 'uncommon', cost: 1, target: 'none', keywords: ['delay'],
    text: 'Delay {delay_turns}: gain {delay_energy} energy and draw {delay_draw} cards.',
    effects: [],
    delay: { turns: 1, effects: [{ type: 'energy', n: 1, key: 'delay_energy' }, draw(2, 'delay_draw')] },
    upgrade: { delay: { turns: 1, effects: [{ type: 'energy', n: 1, key: 'delay_energy' }, draw(3, 'delay_draw')] } },
    tags: ['timeline', 'glue', 'energy', 'draw', 'delay'], icon: 'card_banked_hours',
  },
  {
    id: 'breakwater', name: 'Breakwater', cls: 'chronist', type: 'skill', rarity: 'uncommon', cost: 2, target: 'self', keywords: ['delay'],
    text: 'Gain {block} Block. Delay {delay_turns}: gain {delay_block} Block.',
    effects: [block(8)],
    delay: { turns: 1, effects: [block(11, 'delay_block')] },
    upgrade: { effects: [block(10)], delay: { turns: 1, effects: [block(14, 'delay_block')] } },
    tags: ['timeline', 'oracle', 'block', 'delay'], icon: 'card_breakwater',
  },
  {
    // Targets the enemy it reads; the Guard is the player's.
    id: 'heave_to', name: 'Heave To', cls: 'chronist', type: 'skill', rarity: 'uncommon', cost: 1, target: 'enemy', keywords: [],
    text: 'Gain {guard} Guard, +half the damage of its intent after next.',
    effects: [{ type: 'guard', amount: { base: 4, per: 0.5, scale: 'forecast_damage' } }],
    upgrade: { effects: [{ type: 'guard', amount: { base: 7, per: 0.5, scale: 'forecast_damage' } }] },
    tags: ['oracle', 'glue', 'guard', 'forecast', 'scaling'], icon: 'card_heave_to',
  },
  {
    // RULINGS 25: depth 0 at resolution = the after-next move at play time; the target is stamped.
    id: 'batten_down', name: 'Batten Down', cls: 'chronist', type: 'skill', rarity: 'uncommon', cost: 0, target: 'enemy', keywords: ['delay'],
    text: 'Delay {delay_turns}: if it intends to attack, apply {delay_stagger} Stagger to it.',
    effects: [],
    delay: { turns: 1, effects: battenDown(3) },
    upgrade: { delay: { turns: 1, effects: battenDown(4) } },
    tags: ['oracle', 'timeline', 'cheap', 'stagger', 'delay', 'forecast'], icon: 'card_batten_down',
  },
  {
    id: 'mark_the_lull', name: 'Mark the Lull', cls: 'chronist', type: 'skill', rarity: 'uncommon', cost: 0, target: 'enemy', keywords: [],
    text: "Apply {exposed} Exposed. If its intent after next isn't an attack, apply {lull_exposed} more.",
    effects: markTheLull(1),
    upgrade: { effects: markTheLull(2) },
    tags: ['oracle', 'cheap', 'exposed', 'forecast'], icon: 'card_mark_the_lull',
  },
  {
    id: 'glance_ahead', name: 'Glance Ahead', cls: 'chronist', type: 'skill', rarity: 'uncommon', cost: 0, target: 'none', keywords: ['exhaust'],
    text: 'Draw {draw} card. If your Timeline is not empty, draw {timeline_draw} more. Scrap.',
    effects: glanceAhead(1),
    upgrade: { effects: glanceAhead(2) },
    tags: ['timeline', 'glue', 'cheap', 'draw'], icon: 'card_glance_ahead',
  },
  {
    id: 'striking_train', name: 'Striking Train', cls: 'chronist', type: 'power', rarity: 'uncommon', cost: 1, target: 'none', keywords: [],
    text: 'Whenever you play a card on the beat, deal {status} damage to ALL enemies.',
    effects: [power('striking_train', 3)],
    upgrade: { effects: [power('striking_train', 4)] },
    tags: ['metronome', 'power', 'aoe', 'on_beat'], icon: 'card_striking_train',
  },
  {
    id: 'tide_table', name: 'Tide Table', cls: 'chronist', type: 'power', rarity: 'uncommon', cost: 1, target: 'none', keywords: [],
    text: 'Whenever a card on your Timeline resolves, draw {status} card.',
    effects: [power('tide_table', 1)],
    upgrade: { cost: 0 },
    tags: ['timeline', 'glue', 'power', 'draw'], icon: 'card_tide_table',
  },
  {
    id: 'storm_warning', name: 'Storm Warning', cls: 'chronist', type: 'power', rarity: 'uncommon', cost: 1, target: 'none', keywords: [],
    text: 'At the start of your turn, if any enemy intends to attack, apply {status} Stagger to ALL enemies.',
    effects: [power('storm_warning', 2)],
    upgrade: { cost: 0 },
    tags: ['oracle', 'power', 'stagger'], icon: 'card_storm_warning',
  },
  {
    id: 'escapement', name: 'Escapement', cls: 'chronist', type: 'power', rarity: 'uncommon', cost: 1, target: 'none', keywords: [],
    text: 'Whenever you put a card on your Timeline on the beat, Advance {status}.',
    effects: [power('escapement', 1)],
    upgrade: { keywords: ['innate'], text: 'Opening. Whenever you put a card on your Timeline on the beat, Advance {status}.' },
    tags: ['timeline', 'metronome', 'power', 'advance'], icon: 'card_escapement',
  },
];

// ---------------------------------------------------------------------------
// Rares (12)

const culmination = (base: number, lull: number): Effect[] => [
  { type: 'conditional', if: { type: 'forecast_is_attack', who: 'target', depth: 1 }, then: [hit(base)], else: [hit(lull, 'lull_damage')] },
];
const lighthouse = (b: number, g: number): Effect[] => [
  block(b),
  { type: 'conditional', if: { type: 'forecast_is_attack', who: 'any', depth: 1 }, then: [guard(g)] },
];
const tollTheHours = (n: number): { effects: Effect[]; delay: { turns: 1; effects: Effect[] } } => ({
  effects: [{ type: 'damage', amount: n, times: 'X', target: 'target' }],
  // X inside delay.effects is the X stamped on the Timeline entry at play time.
  delay: { turns: 1, effects: [{ type: 'damage', amount: n, times: 'X', target: 'target', key: 'delay_damage' }] },
});

const RARES: CardDef[] = [
  {
    id: 'zenith', name: 'Zenith', cls: 'chronist', type: 'attack', rarity: 'rare', cost: 0, target: 'enemy', keywords: [],
    text: 'Can only be played on the beat. Deal {damage} damage.',
    effects: [hit(10)],
    hooks: { canPlay: (ctx) => (ctx.nextBeat().onBeat ? true : 'Only on the beat.') },
    upgrade: { effects: [hit(14)] },
    tags: ['metronome', 'cheap', 'on_beat'], icon: 'card_zenith',
  },
  {
    id: 'syzygy', name: 'Syzygy', cls: 'chronist', type: 'attack', rarity: 'rare', cost: 3, target: 'enemy', keywords: ['delay'],
    text: 'Delay {delay_turns}: deal {delay_damage} damage.',
    effects: [],
    delay: { turns: 3, effects: [hit(75, 'delay_damage')] },
    upgrade: { cost: 2 },
    tags: ['timeline', 'oracle', 'delay'], icon: 'card_syzygy',
  },
  {
    id: 'culmination', name: 'Culmination', cls: 'chronist', type: 'attack', rarity: 'rare', cost: 2, target: 'enemy', keywords: [],
    text: "Deal {damage} damage, or {lull_damage} if its intent after next isn't an attack.",
    effects: culmination(14, 28),
    upgrade: { effects: culmination(18, 36) },
    tags: ['oracle', 'forecast'], icon: 'card_culmination',
  },
  {
    id: 'toll_the_hours', name: 'Toll the Hours', cls: 'chronist', type: 'attack', rarity: 'rare', cost: 'X', target: 'enemy', keywords: ['delay'],
    text: 'Deal {damage} damage {times} times. Delay {delay_turns}: deal {delay_damage} damage {times2} times.',
    ...tollTheHours(6),
    upgrade: tollTheHours(8),
    tags: ['timeline', 'glue', 'delay', 'multihit', 'scaling'], icon: 'card_toll_the_hours',
  },
  {
    // RULINGS 27: the designers' `target_intent_total` named fn is the built-in intent_damage scale.
    // Read at resolution: the stamped target's current intent = its after-next move at play time.
    id: 'seen_it_coming', name: 'Seen It Coming', cls: 'chronist', type: 'skill', rarity: 'rare', cost: 1, target: 'enemy', keywords: ['delay', 'exhaust'],
    text: 'Delay {delay_turns}: gain Block equal to the damage it intends. Scrap.',
    effects: [],
    delay: { turns: 1, effects: [{ type: 'block', amount: { scale: { intent_damage: 'target' } }, key: 'delay_block' }] },
    upgrade: { cost: 0 },
    tags: ['oracle', 'timeline', 'block', 'delay', 'forecast'], icon: 'card_seen_it_coming',
  },
  {
    id: 'star_tithe', name: 'Star Tithe', cls: 'chronist', type: 'skill', rarity: 'rare', cost: 1, target: 'none', keywords: ['delay', 'exhaust'],
    text: 'Delay {delay_turns}: gain {delay_shards} Shard and draw {delay_draw} cards. Scrap.',
    effects: [],
    delay: { turns: 3, effects: [{ type: 'shards', amount: 1, key: 'delay_shards' }, draw(2, 'delay_draw')] },
    upgrade: { cost: 0 },
    tags: ['timeline', 'shards', 'draw', 'delay'], icon: 'card_star_tithe',
  },
  {
    // On the beat it pays and Scraps itself mid-resolution; off the beat it goes to the discard pile as normal.
    id: 'tourbillon', name: 'Tourbillon', cls: 'chronist', type: 'skill', rarity: 'rare', cost: 0, target: 'none', keywords: ['retain'],
    text: 'Keep. On beat: gain {beat_energy} energy, then Scrap this.',
    effects: [onBeat({ type: 'energy', n: 2, key: 'beat_energy' }, { type: 'exhaust', from: 'hand', self: true })],
    upgrade: {
      text: 'Keep. On beat: gain {beat_energy} energy and draw {beat_draw} card, then Scrap this.',
      effects: [onBeat({ type: 'energy', n: 2, key: 'beat_energy' }, draw(1, 'beat_draw'), { type: 'exhaust', from: 'hand', self: true })],
    },
    tags: ['metronome', 'cheap', 'energy', 'on_beat', 'keep'], icon: 'card_tourbillon',
  },
  {
    id: 'lighthouse', name: 'Lighthouse', cls: 'chronist', type: 'skill', rarity: 'rare', cost: 2, target: 'self', keywords: [],
    text: "Gain {block} Block. If any enemy's intent after next is an attack, gain {guard} Guard.",
    effects: lighthouse(11, 11),
    upgrade: { effects: lighthouse(14, 14) },
    tags: ['oracle', 'glue', 'block', 'guard', 'forecast'], icon: 'card_lighthouse',
  },
  {
    id: 'polyrhythm', name: 'Polyrhythm', cls: 'chronist', type: 'power', rarity: 'rare', cost: 2, target: 'none', keywords: [],
    text: 'Your On beat effects trigger twice.',
    effects: [power('polyrhythm', 1)],
    upgrade: { cost: 1 },
    tags: ['metronome', 'power', 'on_beat', 'scaling'], icon: 'card_polyrhythm',
  },
  {
    id: 'portents', name: 'Portents', cls: 'chronist', type: 'power', rarity: 'rare', cost: 2, target: 'none', keywords: [],
    text: "At the start of your turn, apply {status} Exposed to ALL enemies. If any enemy's intent after next isn't an attack, apply {status} more.",
    effects: [power('portents', 1)],
    upgrade: { cost: 1 },
    tags: ['oracle', 'glue', 'power', 'exposed', 'forecast'], icon: 'card_portents',
  },
  {
    id: 'watch_bell', name: 'Watch Bell', cls: 'chronist', type: 'power', rarity: 'rare', cost: 2, target: 'none', keywords: [],
    text: 'Whenever a card on your Timeline resolves, gain {bell} Block, +{alarm} if any enemy intends to attack.',
    values: WATCH_BELL,
    effects: [power('watch_bell', 1)],
    upgrade: { cost: 1 },
    tags: ['timeline', 'oracle', 'power', 'block'], icon: 'card_watch_bell',
  },
  {
    id: 'perpetual_motion', name: 'Perpetual Motion', cls: 'chronist', type: 'power', rarity: 'rare', cost: 3, target: 'none', keywords: [],
    text: 'The first card you play on the beat each turn costs {discount} less.',
    values: PERPETUAL_MOTION,
    effects: [power('perpetual_motion', 1)],
    upgrade: { cost: 2 },
    tags: ['metronome', 'power', 'energy', 'cost_reduction'], icon: 'card_perpetual_motion',
  },
];

export const CHRONIST_CARDS: CardDef[] = [...STARTERS, ...COMMONS, ...UNCOMMONS, ...RARES];

// ---------------------------------------------------------------------------
// Power statuses (status id = card id; copies add stacks)

const powerStatus = (id: string, name: string, text: string, rest: Partial<StatusDef>): StatusDef => ({
  id, name, stacks: 'amount', decay: 'never', tick: 'never', isDebuff: false, text, icon: `status_${id}`, ...rest,
});

/** Perpetual Motion: on-beat plays this turn that used up a discount. Absent = none yet. */
function perpetualMotionUsed(cardCtx: { state: RunState }): number {
  const combat = cardCtx.state.combat;
  if (!combat) throw new Error('perpetual_motion outside combat');
  // Statuses at 0 stacks are removed from the map, so a missing key is 0 uses (expected, not an error).
  return combat.player.statuses[PM_USED] ?? 0;
}

export const CHRONIST_STATUSES: StatusDef[] = [
  powerStatus('striking_train', 'Striking Train', 'Whenever you play a card on the beat, deal {damage} damage to ALL enemies.', {
    // RULINGS 28: afterCardPlayed trigger frames carry the play's onBeat stamp.
    triggers: { afterCardPlayed: [{ type: 'conditional', if: { type: 'on_beat' }, then: [{ type: 'damage', amount: { scale: 'stacks' }, target: 'all_enemies' }] }] },
  }),
  powerStatus('tide_table', 'Tide Table', 'Whenever a card on your Timeline resolves, draw {draw} card(s).', {
    triggers: { onDelayResolved: [{ type: 'draw', n: { scale: 'stacks' } }] },
  }),
  powerStatus('storm_warning', 'Storm Warning', 'At the start of your turn, if any enemy intends to attack, apply {status} Stagger to ALL enemies.', {
    triggers: {
      onTurnStart: [
        { type: 'conditional', if: { type: 'forecast_is_attack', who: 'any', depth: 0 }, then: [{ type: 'status', target: 'all_enemies', id: 'stagger', amount: { scale: 'stacks' } }] },
      ],
    },
  }),
  powerStatus('escapement', 'Escapement', 'Whenever you put a card on your Timeline on the beat, Advance {stacks}.', {
    // onTimelineAdd trigger frames carry the new entry's on-beat stamp.
    triggers: {
      onTimelineAdd: [{ type: 'conditional', if: { type: 'on_beat' }, then: [{ type: 'repeat', times: { scale: 'stacks' }, effects: [{ type: 'advance', n: 1 }] }] }],
    },
  }),
  powerStatus('polyrhythm', 'Polyrhythm', 'Your On beat effects trigger {stacks} more time(s).', {
    // Each source adds one repeat; the engine caps an on_beat list at TUNING.caps.onBeatRuns runs (RULINGS 28).
    hooks: { onBeatRepeats: (ctx, _card: CardInstance | null, repeats) => repeats + ctx.stacks },
  }),
  powerStatus('portents', 'Portents', "At the start of your turn, apply {stacks} Exposed to ALL enemies. If any enemy's intent after next isn't an attack, apply {stacks} more.", {
    triggers: {
      onTurnStart: [
        { type: 'status', target: 'all_enemies', id: 'exposed', amount: { scale: 'stacks' } },
        {
          type: 'conditional',
          if: { type: 'not', cond: { type: 'forecast_is_attack', who: 'all', depth: 1 } },
          then: [{ type: 'status', target: 'all_enemies', id: 'exposed', amount: { scale: 'stacks' } }],
        },
      ],
    },
  }),
  powerStatus('watch_bell', 'Watch Bell', 'Whenever a card on your Timeline resolves, gain {block} Block, +{block2} if any enemy intends to attack.', {
    triggers: {
      onDelayResolved: [
        { type: 'block', amount: { per: WATCH_BELL.bell, scale: 'stacks' } },
        { type: 'conditional', if: { type: 'forecast_is_attack', who: 'any', depth: 0 }, then: [{ type: 'block', amount: { per: WATCH_BELL.alarm, scale: 'stacks' } }] },
      ],
    },
  }),
  powerStatus('perpetual_motion', 'Perpetual Motion', 'The first {stacks} card(s) you play on the beat each turn cost {discount} less.', {
    values: PERPETUAL_MOTION,
    hooks: {
      // The discount shows on every card in hand while the next play would be on the beat.
      modifyCardCost: (ctx, _card, cost) =>
        ctx.nextBeat().onBeat && perpetualMotionUsed(ctx) < ctx.stacks ? cost - PERPETUAL_MOTION.discount : cost,
    },
    triggers: {
      // Each counted on-beat play uses one discount (a 0-cost beat card wastes it, per the card text).
      onCardPlayed: [
        {
          type: 'conditional',
          if: { type: 'all', conds: [{ type: 'on_beat' }, { type: 'compare', left: { scale: { status: PM_USED } }, op: '<', right: { scale: 'stacks' } }] },
          then: [{ type: 'status', target: 'self', id: PM_USED, amount: 1 }],
        },
      ],
    },
  }),
  {
    id: PM_USED, name: 'Perpetual Motion (used)', stacks: 'amount', decay: 'start_player_turn', decayBy: 'all', tick: 'never', isDebuff: false, hidden: true,
    text: 'On-beat discounts used this turn: {stacks}.', icon: 'status_perpetual_motion',
  },
];
