// Chronist pool. v1: docs/cards/chronist.md (RULINGS 24–31). v2: docs/v2/chronist-design.md (RULINGS 55–59).
// v2 engines: Conjunction (Chorus + Gather), Clockwork (Quicken + Crescendo), Storm Reader (Goad), Perpetual
// Calendar (Eternal Return); Schedule bridges them. The 12 v2 cuts were applied after the v2 baseline
// (docs/balance/report-v2-baseline.md; RULINGS 55). Mechanics: Cadence (on_beat, beat_index), Delay / the Timeline
// (CardDef.delay, advance, gather, schedule, scale 'chorus'), Augury (forecast_is_attack, forecast_damage, intent_damage).
// cap_relay, cap_timeline, cap_advance and every other cap are engine-side; nothing here re-implements them.
import type { CardDef, CardInstance, Effect, StatusDef } from '../../engine/types';

// chronist.md §8 fn 1 ("the next card you play will be on the beat") is the engine's ctx.nextBeat()
// (beat positions with Cadence modifiers applied): Zenith / Upbeat canPlay, Perpetual Motion's cost modifier.

// ---------------------------------------------------------------------------
// Shared numbers (text placeholders read them through `values`, hooks read the same constants).

const WATCH_BELL = { bell: 2, alarm: 2 };
/** Perpetual Motion (v2): cards played on the beat cost this. */
const PERPETUAL_MOTION = { free: 0 };
/** Total Eclipse: batches of at least this many resolve twice. */
const TOTAL_ECLIPSE = { threshold: 2 };
/** Eternal Return: the recurring card's new Delay. */
const ETERNAL_RETURN = { delay: 1 };
/** Goad (v2 enemy status). */
const GOADED = 'goaded';

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
// --- v2 shorthands (docs/v2/chronist-design.md §5–6)
const quicken = (n: number): Effect => ({ type: 'quicken', n });
/** Crescendo: an On beat clause that runs once per beat reached (1st / 2nd / 3rd beat of the turn). */
const crescendo = (...effects: Effect[]): Effect => onBeat({ type: 'repeat', times: { scale: 'beat_index' }, effects });
/** Chorus damage (inside delay.effects): base + per for each other card resolving in the same batch. */
const chorusHit = (base: number, per: number): Effect => ({ type: 'damage', amount: { base, per, scale: 'chorus' }, target: 'target', key: 'delay_damage' });
const chorusAll = (base: number, per: number): Effect => ({ type: 'damage', amount: { base, per, scale: 'chorus' }, target: 'all_enemies', key: 'delay_damage' });
const goad = (n: number): Effect => ({ type: 'status', target: 'target', id: GOADED, amount: n, key: 'goad' });
const gather: Effect = { type: 'gather' };

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

const stormGlass = (b: number, extra: number): Effect[] => [
  block(b, 'delay_block'),
  { type: 'conditional', if: { type: 'forecast_is_attack', who: 'any', depth: 0 }, then: [block(extra, 'storm_block')] },
];
const weatherEye = (g: number, extra: number): Effect[] => [
  guard(g),
  { type: 'conditional', if: { type: 'forecast_is_attack', who: 'any', depth: 1 }, then: [guard(extra, 'storm_guard')] },
];

const COMMONS: CardDef[] = [
  {
    // v2 R: Clockwork's cheapest enabler (was 3 damage + on-beat Exposed).
    id: 'pinion_jab', name: 'Pinion Jab', cls: 'chronist', type: 'attack', rarity: 'common', cost: 0, target: 'enemy', keywords: [],
    text: 'Deal {damage} damage. Quicken {quicken}. Draw {draw} card.',
    effects: [hit(3), quicken(1), draw(1)],
    upgrade: { effects: [hit(5), quicken(1), draw(1)] },
    tags: ['metronome', 'glue', 'cheap'], icon: 'card_pinion_jab',
  },
  {
    // v2 R: Crescendo hits are separate hits (Exposed, Glass Spurs).
    id: 'gear_train', name: 'Gear Train', cls: 'chronist', type: 'attack', rarity: 'common', cost: 1, target: 'enemy', keywords: [],
    text: 'Deal {damage} damage {times} times. Crescendo: deal {beat_damage} damage.',
    effects: [{ type: 'damage', amount: 3, times: 2, target: 'target' }, crescendo(hit(4, 'beat_damage'))],
    upgrade: { effects: [{ type: 'damage', amount: 4, times: 2, target: 'target' }, crescendo(hit(5, 'beat_damage'))] },
    tags: ['metronome', 'glue', 'multihit', 'on_beat'], icon: 'card_gear_train',
  },
  {
    // v2 R: the Clockwork finisher at common (beat 1 / 2 / 3: +6 / +12 / +18). Phase C: 1 cost, so it doesn't eat the chain's energy.
    id: 'downbeat', name: 'Downbeat', cls: 'chronist', type: 'attack', rarity: 'common', cost: 1, target: 'enemy', keywords: [],
    text: 'Deal {damage} damage. Crescendo: deal {beat_damage} damage.',
    effects: [hit(8), crescendo(hit(6, 'beat_damage'))],
    upgrade: { effects: [hit(10), crescendo(hit(8, 'beat_damage'))] },
    tags: ['metronome', 'on_beat'], icon: 'card_downbeat',
  },
  {
    // v2 R: the Chorus anchor (was a plain Delay 2 for 14).
    id: 'noon_gun', name: 'Noon Gun', cls: 'chronist', type: 'attack', rarity: 'common', cost: 1, target: 'enemy', keywords: ['delay'],
    text: 'Delay {delay_turns}: deal {delay_damage} damage, Chorus +{delay_damage_per}.',
    effects: [],
    delay: { turns: 2, effects: [chorusHit(14, 4)] },
    upgrade: {
      keywords: ['delay', 'innate'],
      text: 'Opening. Delay {delay_turns}: deal {delay_damage} damage, Chorus +{delay_damage_per}.',
      delay: { turns: 2, effects: [chorusHit(17, 5)] },
    },
    tags: ['timeline', 'delay'], icon: 'card_noon_gun',
  },
  {
    // v2 R: the split card joins Chorus (its on-beat clause is gone).
    id: 'afterpeal', name: 'Afterpeal', cls: 'chronist', type: 'attack', rarity: 'common', cost: 1, target: 'enemy', keywords: ['delay'],
    text: 'Deal {damage} damage. Delay {delay_turns}: deal {delay_damage} damage, Chorus +{delay_damage_per}.',
    effects: [hit(4)],
    delay: { turns: 1, effects: [chorusHit(5, 3)] },
    upgrade: { effects: [hit(5)], delay: { turns: 1, effects: [chorusHit(6, 4)] } },
    tags: ['timeline', 'delay'], icon: 'card_afterpeal',
  },
  {
    // v2 R: the long entry that sets the Gather turn.
    id: 'spring_tide', name: 'Spring Tide', cls: 'chronist', type: 'attack', rarity: 'common', cost: 1, target: 'all_enemies', keywords: ['delay'],
    text: 'Delay {delay_turns}: deal {delay_damage} damage to ALL enemies, Chorus +{delay_damage_per}.',
    effects: [],
    delay: { turns: 3, effects: [chorusAll(14, 3)] },
    upgrade: { delay: { turns: 3, effects: [chorusAll(17, 4)] } },
    tags: ['timeline', 'delay', 'aoe'], icon: 'card_spring_tide',
  },
  {
    // v2 R: AoE Crescendo; 0 cost, so Offbeat Drum doubles it.
    id: 'carillon', name: 'Carillon', cls: 'chronist', type: 'attack', rarity: 'common', cost: 0, target: 'all_enemies', keywords: [],
    text: 'Deal {damage} damage to ALL enemies. Crescendo: deal {beat_damage} damage to ALL enemies.',
    effects: [hitAll(3), crescendo(hitAll(2, 'beat_damage'))],
    upgrade: { effects: [hitAll(4), crescendo(hitAll(3, 'beat_damage'))] },
    tags: ['metronome', 'glue', 'cheap', 'aoe', 'on_beat'], icon: 'card_carillon',
  },
  {
    // RULINGS 25: the depth-0 condition is read at resolution, i.e. the move that was "after next" at play time.
    id: 'storm_glass', name: 'Storm Glass', cls: 'chronist', type: 'skill', rarity: 'common', cost: 1, target: 'self', keywords: ['delay'],
    text: 'Delay {delay_turns}: gain {delay_block} Block, +{storm_block} if any enemy intends to attack.',
    effects: [],
    delay: { turns: 1, effects: stormGlass(7, 3) },
    upgrade: { delay: { turns: 1, effects: stormGlass(9, 4) } },
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
    // v2 R: Spike draw that also lines up the beat.
    id: 'ephemeris', name: 'Ephemeris', cls: 'chronist', type: 'skill', rarity: 'common', cost: 1, target: 'none', keywords: [],
    text: 'Draw {draw} cards. Quicken {quicken}.',
    effects: [draw(3), quicken(1)],
    upgrade: { effects: [draw(4), quicken(1)] },
    tags: ['glue', 'metronome', 'draw'], icon: 'card_ephemeris',
  },
  {
    // v2 R: the Block Quicken ("can't be played on the beat" was a pure drawback).
    id: 'upbeat', name: 'Upbeat', cls: 'chronist', type: 'skill', rarity: 'common', cost: 0, target: 'self', keywords: [],
    text: 'Gain {block} Block. Quicken {quicken}.',
    effects: [block(3), quicken(1)],
    upgrade: { effects: [block(5), quicken(1)] },
    tags: ['metronome', 'glue', 'cheap', 'block'], icon: 'card_upbeat',
  },
  {
    id: 'weather_eye', name: 'Weather Eye', cls: 'chronist', type: 'skill', rarity: 'common', cost: 1, target: 'self', keywords: [],
    text: "Gain {guard} Guard. If any enemy's intent after next is an attack, gain {storm_guard} more.",
    effects: weatherEye(4, 3),
    upgrade: { effects: weatherEye(6, 4) },
    tags: ['oracle', 'glue', 'guard', 'forecast'], icon: 'card_weather_eye',
  },
  {
    // v2 R: Clockwork's defence (was on-beat Stagger).
    id: 'balance_wheel', name: 'Balance Wheel', cls: 'chronist', type: 'skill', rarity: 'common', cost: 1, target: 'self', keywords: [],
    text: 'Gain {block} Block. Crescendo: gain {beat_block} Block.',
    effects: [block(6), crescendo(block(3, 'beat_block'))],
    upgrade: { effects: [block(8), crescendo(block(4, 'beat_block'))] },
    tags: ['metronome', 'block', 'on_beat'], icon: 'card_balance_wheel',
  },
  {
    // v2 R: reads the beat count (cards played + Quicken), including this card.
    id: 'dead_reckoning', name: 'Dead Reckoning', cls: 'chronist', type: 'skill', rarity: 'common', cost: 0, target: 'self', keywords: [],
    text: 'Gain {block} Block (+{block_per} per beat count).',
    effects: [{ type: 'block', amount: { base: 0, per: 1, scale: 'beat_count' } }],
    upgrade: { effects: [{ type: 'block', amount: { base: 2, per: 1, scale: 'beat_count' } }] },
    tags: ['metronome', 'glue', 'cheap', 'block', 'scaling'], icon: 'card_dead_reckoning',
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
  // --- v2 new commons
  {
    id: 'hold_the_hour', name: 'Hold the Hour', cls: 'chronist', type: 'skill', rarity: 'common', cost: 0, target: 'self', keywords: [],
    text: 'Gather. Gain {block} Block.',
    effects: [gather, block(4)],
    upgrade: { effects: [gather, block(6)] },
    tags: ['timeline', 'glue', 'cheap', 'block'], icon: 'card_hold_the_hour',
  },
  {
    id: 'ripple', name: 'Ripple', cls: 'chronist', type: 'attack', rarity: 'common', cost: 0, target: 'enemy', keywords: ['delay'],
    text: 'Delay {delay_turns}: deal {delay_damage} damage, Chorus +{delay_damage_per}.',
    effects: [],
    delay: { turns: 1, effects: [chorusHit(4, 3)] },
    upgrade: { delay: { turns: 1, effects: [chorusHit(5, 4)] } },
    tags: ['timeline', 'cheap', 'delay'], icon: 'card_ripple',
  },
  {
    // Sailors whistle to raise a storm. RULINGS 57: a 0-cost cantrip whose cost (Goad) is a Storm upside.
    id: 'whistle_for_wind', name: 'Whistle for Wind', cls: 'chronist', type: 'skill', rarity: 'common', cost: 0, target: 'enemy', keywords: [],
    text: 'Goad {goad}. Draw {draw} card.',
    effects: [goad(3), draw(1)],
    upgrade: { text: 'Goad {goad}. Draw {draw} cards.', effects: [goad(4), draw(2)] },
    tags: ['oracle', 'metronome', 'cheap', 'draw'], icon: 'card_whistle_for_wind',
  },
  {
    id: 'red_sky', name: 'Red Sky', cls: 'chronist', type: 'skill', rarity: 'common', cost: 1, target: 'enemy', keywords: [],
    text: 'Gain {block} Block. Goad {goad}.',
    effects: [block(9), goad(2)],
    upgrade: { effects: [block(12), goad(2)] },
    tags: ['oracle', 'glue', 'block'], icon: 'card_red_sky',
  },
  {
    id: 'undertow', name: 'Undertow', cls: 'chronist', type: 'attack', rarity: 'common', cost: 1, target: 'enemy', keywords: [],
    text: 'Deal {damage} damage, +half the damage it intends.',
    effects: [{ type: 'damage', amount: { base: 3, per: 0.5, scale: { intent_damage: 'target' } }, target: 'target' }],
    upgrade: { effects: [{ type: 'damage', amount: { base: 5, per: 0.5, scale: { intent_damage: 'target' } }, target: 'target' }] },
    tags: ['oracle', 'scaling'], icon: 'card_undertow',
  },
];

// ---------------------------------------------------------------------------
// Uncommons (20)


const UNCOMMONS: CardDef[] = [
  {
    // v2 R: Keep it for beat 9.
    id: 'fermata', name: 'Fermata', cls: 'chronist', type: 'attack', rarity: 'uncommon', cost: 1, target: 'enemy', keywords: ['retain'],
    text: 'Keep. Deal {damage} damage. Crescendo: deal {beat_damage} damage.',
    effects: [hit(5), crescendo(hit(6, 'beat_damage'))],
    upgrade: { effects: [hit(7), crescendo(hit(8, 'beat_damage'))] },
    tags: ['metronome', 'on_beat', 'keep'], icon: 'card_fermata',
  },
  {
    id: 'appointed_hour', name: 'Appointed Hour', cls: 'chronist', type: 'attack', rarity: 'uncommon', cost: 2, target: 'enemy', keywords: ['delay'],
    text: 'Delay {delay_turns}: deal {delay_damage} damage.',
    effects: [],
    delay: { turns: 2, effects: [hit(38, 'delay_damage')] },
    upgrade: { delay: { turns: 2, effects: [hit(46, 'delay_damage')] } },
    tags: ['timeline', 'oracle', 'delay'], icon: 'card_appointed_hour',
  },
  {
    // v2 R: the delayed part joins Chorus.
    id: 'knell', name: 'Knell', cls: 'chronist', type: 'attack', rarity: 'uncommon', cost: 1, target: 'all_enemies', keywords: ['delay'],
    text: 'Deal {damage} damage to ALL enemies. Delay {delay_turns}: deal {delay_damage} damage to ALL enemies, Chorus +{delay_damage_per}.',
    effects: [hitAll(4)],
    delay: { turns: 2, effects: [chorusAll(8, 3)] },
    upgrade: { effects: [hitAll(5)], delay: { turns: 2, effects: [chorusAll(10, 4)] } },
    tags: ['timeline', 'delay', 'aoe'], icon: 'card_knell',
  },
  {
    // v2 R: the full forecast (was +half). RULINGS 27: forecast_damage sums the target's forecast entries (hidden = 0).
    id: 'turn_the_tide', name: 'Turn the Tide', cls: 'chronist', type: 'attack', rarity: 'uncommon', cost: 1, target: 'enemy', keywords: [],
    text: 'Deal {damage} damage, + the damage of its intent after next.',
    effects: [{ type: 'damage', amount: { base: 3, per: 1, scale: 'forecast_damage' }, target: 'target' }],
    upgrade: { effects: [{ type: 'damage', amount: { base: 6, per: 1, scale: 'forecast_damage' }, target: 'target' }] },
    tags: ['oracle', 'forecast', 'scaling'], icon: 'card_turn_the_tide',
  },
  {
    // v2 R: the Timeline-length payoff. Phase D: the forced Gather is gone (it delayed your own Delay Block; cf −21 win).
    id: 'confluence', name: 'Confluence', cls: 'chronist', type: 'attack', rarity: 'uncommon', cost: 0, target: 'enemy', keywords: [],
    text: 'Deal {damage} damage (+{damage_per} per card on your Timeline).',
    effects: [{ type: 'damage', amount: { base: 2, per: 3, scale: 'timeline_count' }, target: 'target' }],
    upgrade: { effects: [{ type: 'damage', amount: { base: 2, per: 4, scale: 'timeline_count' }, target: 'target' }] },
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
    // Phase C: Quicken after the beat check, so off the beat it lines up the next beat. Phase D made it a cantrip;
    // Phase E keeps the draw on the upgrade only (the base cantrip was in 61% of spike decks, deck Δ +29).
    id: 'mainspring', name: 'Mainspring', cls: 'chronist', type: 'skill', rarity: 'uncommon', cost: 0, target: 'none', keywords: [],
    text: 'On beat: gain {beat_energy} energy. Quicken {quicken}.',
    effects: [onBeat({ type: 'energy', n: 1, key: 'beat_energy' }), quicken(1)],
    upgrade: {
      text: 'On beat: gain {beat_energy} energy. Quicken {quicken}. Draw {draw} card.',
      effects: [onBeat({ type: 'energy', n: 1, key: 'beat_energy' }), quicken(1), draw(1)],
    },
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
    effects: [block(5)],
    delay: { turns: 1, effects: [block(8, 'delay_block')] },
    upgrade: { effects: [block(7)], delay: { turns: 1, effects: [block(11, 'delay_block')] } },
    tags: ['timeline', 'oracle', 'block', 'delay'], icon: 'card_breakwater',
  },
  {
    // Targets the enemy it reads; the Guard is the player's.
    id: 'heave_to', name: 'Heave To', cls: 'chronist', type: 'skill', rarity: 'uncommon', cost: 1, target: 'enemy', keywords: [],
    text: 'Gain {guard} Guard, +half the damage of its intent after next.',
    effects: [{ type: 'guard', amount: { base: 1, per: 0.5, scale: 'forecast_damage' } }],
    upgrade: { effects: [{ type: 'guard', amount: { base: 3, per: 0.5, scale: 'forecast_damage' } }] },
    tags: ['oracle', 'glue', 'guard', 'forecast', 'scaling'], icon: 'card_heave_to',
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
    id: 'escapement', name: 'Escapement', cls: 'chronist', type: 'power', rarity: 'uncommon', cost: 1, target: 'none', keywords: [],
    text: 'Whenever you put a card on your Timeline on the beat, Advance {status}.',
    effects: [power('escapement', 1)],
    upgrade: { keywords: ['innate'], text: 'Opening. Whenever you put a card on your Timeline on the beat, Advance {status}.' },
    tags: ['timeline', 'metronome', 'power', 'advance'], icon: 'card_escapement',
  },
  // --- v2 new uncommons
  {
    // Phase C: 0 cost (a 1-energy Power whose whole effect is +1 beat count a turn was a tempo loss); the upgrade is Opening.
    id: 'accelerando', name: 'Accelerando', cls: 'chronist', type: 'power', rarity: 'uncommon', cost: 0, target: 'none', keywords: [],
    text: 'At the start of your turn, Quicken {status}.',
    effects: [power('accelerando', 1)],
    upgrade: { keywords: ['innate'], text: 'Opening. At the start of your turn, Quicken {status}.' },
    tags: ['metronome', 'power'], icon: 'card_accelerando',
  },
  {
    id: 'bell_choir', name: 'Bell Choir', cls: 'chronist', type: 'attack', rarity: 'uncommon', cost: 1, target: 'all_enemies', keywords: ['delay'],
    text: 'Delay {delay_turns}: deal {delay_damage} damage to ALL enemies, Chorus +{delay_damage_per}.',
    effects: [],
    delay: { turns: 1, effects: [chorusAll(6, 3)] },
    upgrade: { delay: { turns: 1, effects: [chorusAll(8, 4)] } },
    tags: ['timeline', 'delay', 'aoe'], icon: 'card_bell_choir',
  },
  {
    // RULINGS 58: a Scheduled card resolves its effects without its canPlay check (Zenith).
    // Phase E tried cost 0: spike took it in 66% of decks (a free Scheduled card is energy), and neither
    // Conjunction nor Calendar improved, so it is back to cost 1 (upgrade cost 0).
    id: 'set_the_hour', name: 'Set the Hour', cls: 'chronist', type: 'skill', rarity: 'uncommon', cost: 1, target: 'enemy', keywords: [],
    text: 'Schedule {schedule}. Draw {draw} card.',
    effects: [{ type: 'schedule', turns: 1 }, draw(1)],
    upgrade: { cost: 0 },
    tags: ['timeline', 'glue', 'draw'], icon: 'card_set_the_hour',
  },
  {
    // Goad first, so the Block reads the bigger intent (intent_damage is live).
    id: 'gathering_storm', name: 'Gathering Storm', cls: 'chronist', type: 'skill', rarity: 'uncommon', cost: 1, target: 'enemy', keywords: [],
    text: 'Goad {goad}. Gain {block} Block, +half the damage it intends.',
    effects: [goad(2), { type: 'block', amount: { base: 2, per: 0.5, scale: { intent_damage: 'target' } } }],
    upgrade: { effects: [goad(2), { type: 'block', amount: { base: 5, per: 0.5, scale: { intent_damage: 'target' } } }] },
    tags: ['oracle', 'block', 'scaling'], icon: 'card_gathering_storm',
  },
  {
    id: 'squall_line', name: 'Squall Line', cls: 'chronist', type: 'power', rarity: 'uncommon', cost: 0, target: 'none', keywords: [],
    text: 'Whenever you apply Goad, deal {status} damage per Goad to that enemy.',
    effects: [power('squall_line', 3)],
    upgrade: { effects: [power('squall_line', 4)] },
    tags: ['oracle', 'power'], icon: 'card_squall_line',
  },
];

// ---------------------------------------------------------------------------
// Rares (14)

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
    // v2 R: weak alone, huge in a batch (was a plain Delay 3 for 75).
    id: 'syzygy', name: 'Syzygy', cls: 'chronist', type: 'attack', rarity: 'rare', cost: 2, target: 'enemy', keywords: ['delay'],
    text: 'Delay {delay_turns}: deal {delay_damage} damage, Chorus +{delay_damage_per}.',
    effects: [],
    delay: { turns: 2, effects: [chorusHit(24, 6)] },
    upgrade: { delay: { turns: 2, effects: [chorusHit(30, 8)] } },
    tags: ['timeline', 'delay'], icon: 'card_syzygy',
  },
  {
    // v2 R: the beat-count finisher (was a lull coin flip). The beat count includes this card.
    id: 'culmination', name: 'Culmination', cls: 'chronist', type: 'attack', rarity: 'rare', cost: 2, target: 'enemy', keywords: [],
    text: 'Deal {damage_per} damage per beat count.',
    effects: [{ type: 'damage', amount: { per: 3, scale: 'beat_count' }, target: 'target' }],
    upgrade: { effects: [{ type: 'damage', amount: { per: 4, scale: 'beat_count' }, target: 'target' }] },
    tags: ['metronome', 'scaling'], icon: 'card_culmination',
  },
  {
    id: 'toll_the_hours', name: 'Toll the Hours', cls: 'chronist', type: 'attack', rarity: 'rare', cost: 'X', target: 'enemy', keywords: ['delay'],
    text: 'Deal {damage} damage {times} times. Delay {delay_turns}: deal {delay_damage} damage {times2} times.',
    ...tollTheHours(5),
    upgrade: tollTheHours(7),
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
    // v2 R: scales with the whole forecast (Prophet Glass and packs feed it).
    id: 'lighthouse', name: 'Lighthouse', cls: 'chronist', type: 'skill', rarity: 'rare', cost: 2, target: 'self', keywords: [],
    text: 'Gain {block} Block. Gain Guard equal to half the damage enemies intend after next.',
    effects: [block(4), { type: 'guard', amount: { per: 0.5, scale: { forecast_damage: 'all' } } }],
    upgrade: { effects: [block(7), { type: 'guard', amount: { per: 0.5, scale: { forecast_damage: 'all' } } }] },
    tags: ['oracle', 'glue', 'block', 'guard', 'forecast'], icon: 'card_lighthouse',
  },
  {
    id: 'polyrhythm', name: 'Polyrhythm', cls: 'chronist', type: 'power', rarity: 'rare', cost: 1, target: 'none', keywords: [],
    text: 'Your On beat effects trigger twice.',
    effects: [power('polyrhythm', 1)],
    upgrade: { cost: 0 },
    tags: ['metronome', 'power', 'on_beat', 'scaling'], icon: 'card_polyrhythm',
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
    // v2 R: the Clockwork rule-breaker (was "the first beat card costs 1 less").
    id: 'perpetual_motion', name: 'Perpetual Motion', cls: 'chronist', type: 'power', rarity: 'rare', cost: 1, target: 'none', keywords: [],
    text: 'Cards you play on the beat cost {free}.',
    values: PERPETUAL_MOTION,
    effects: [power('perpetual_motion', 1)],
    upgrade: { cost: 0 },
    tags: ['metronome', 'power', 'energy', 'cost_reduction'], icon: 'card_perpetual_motion',
  },
  // --- v2 new rares
  {
    id: 'total_eclipse', name: 'Total Eclipse', cls: 'chronist', type: 'power', rarity: 'rare', cost: 1, target: 'none', keywords: [],
    text: 'Whenever {threshold} or more cards resolve together from your Timeline, each resolves a second time.',
    values: TOTAL_ECLIPSE,
    effects: [power('total_eclipse', 1)],
    upgrade: { cost: 0 },
    tags: ['timeline', 'power', 'scaling'], icon: 'card_total_eclipse',
  },
  {
    id: 'eternal_return', name: 'Eternal Return', cls: 'chronist', type: 'power', rarity: 'rare', cost: 1, target: 'none', keywords: [],
    text: 'The first card that resolves from your Timeline each turn goes back on it with Delay {delay}, unless it Scraps.',
    values: ETERNAL_RETURN,
    effects: [power('eternal_return', 1)],
    upgrade: { cost: 0 },
    tags: ['timeline', 'power'], icon: 'card_eternal_return',
  },
  {
    // Read at resolution: the stamped target's current intent = its after-next move at play time (RULINGS 25).
    id: 'reckoning', name: 'Reckoning', cls: 'chronist', type: 'attack', rarity: 'rare', cost: 1, target: 'enemy', keywords: ['delay', 'exhaust'],
    text: 'Delay {delay_turns}: deal damage equal to twice the damage it intends. Scrap.',
    effects: [],
    delay: { turns: 1, effects: [{ type: 'damage', amount: { per: 2, scale: { intent_damage: 'target' } }, target: 'target', key: 'delay_damage' }] },
    upgrade: {
      text: 'Delay {delay_turns}: deal {delay_damage_base} damage, plus twice the damage it intends. Scrap.',
      delay: { turns: 1, effects: [{ type: 'damage', amount: { base: 8, per: 2, scale: { intent_damage: 'target' } }, target: 'target', key: 'delay_damage' }] },
    },
    tags: ['oracle', 'timeline', 'delay', 'scaling'], icon: 'card_reckoning',
  },
  {
    id: 'eye_of_the_storm', name: 'Eye of the Storm', cls: 'chronist', type: 'power', rarity: 'rare', cost: 2, target: 'none', keywords: [],
    text: 'At the end of your turn, each enemy takes damage equal to half the damage it intends.',
    effects: [power('eye_of_the_storm', 1)],
    upgrade: { cost: 1 },
    tags: ['oracle', 'power', 'scaling'], icon: 'card_eye_of_the_storm',
  },
];

// ---------------------------------------------------------------------------
// Engine / role tags for the simulator (docs/v2/chronist-design.md §2, §14.3), in the format of breaker.ts.
// sim/policies/lib/engines.ts reads `engine:<name>` + `role:<role>`; the johnny bots draft by them.
// enabler makes the engine's resource, payoff converts it, multiplier is the engine's rule-breaker, glue is
// plain efficiency (the Augury defence cards are Storm glue: they read the forecast, which Goad never raises).
// The optional trailing entries are mechanic tags (chorus, gather, quicken, crescendo, goad, schedule).
// Every card must have an entry, and every entry must be a card (checked at module load below).
type Eng = 'clockwork' | 'conjunction' | 'storm' | 'calendar';
type Role = 'enabler' | 'payoff' | 'multiplier' | 'glue';
type Mech = 'chorus' | 'gather' | 'quicken' | 'crescendo' | 'goad' | 'schedule';
const ENGINE_ROLES: Record<string, [Eng[], Role, ...Mech[]]> = {
  // Starters
  pulse_shot: [[], 'glue'], ward: [[], 'glue'], tick: [['clockwork'], 'enabler'], tock: [['conjunction'], 'enabler'],
  // Clockwork: Quicken + 0-cost bodies feed the beat count; Crescendo and beat-count cards cash it.
  pinion_jab: [['clockwork'], 'enabler', 'quicken'], upbeat: [['clockwork'], 'enabler', 'quicken'],
  ephemeris: [['clockwork'], 'enabler', 'quicken'], accelerando: [['clockwork'], 'enabler', 'quicken'],
  mainspring: [['clockwork'], 'enabler', 'quicken'], quarter_chime: [['clockwork'], 'enabler'], tourbillon: [['clockwork'], 'enabler'],
  gear_train: [['clockwork'], 'payoff', 'crescendo'], downbeat: [['clockwork'], 'payoff', 'crescendo'],
  carillon: [['clockwork'], 'payoff', 'crescendo'], balance_wheel: [['clockwork'], 'payoff', 'crescendo'],
  fermata: [['clockwork'], 'payoff', 'crescendo'], dead_reckoning: [['clockwork'], 'payoff'], zenith: [['clockwork'], 'payoff'],
  culmination: [['clockwork'], 'payoff'], striking_train: [['clockwork'], 'payoff'],
  polyrhythm: [['clockwork'], 'multiplier'], perpetual_motion: [['clockwork'], 'multiplier'],
  second_hand: [['clockwork', 'conjunction'], 'payoff'], escapement: [['clockwork', 'conjunction'], 'enabler'],
  // Conjunction: Gather and Advance line the Timeline up; Chorus and per-resolution cards cash the batch.
  hold_the_hour: [['conjunction'], 'enabler', 'gather'], almanac: [['conjunction'], 'enabler'],
  wind_forward: [['conjunction'], 'enabler'], hasten: [['conjunction'], 'enabler'],
  set_the_hour: [['conjunction', 'calendar'], 'enabler', 'schedule'],
  ripple: [['conjunction'], 'payoff', 'chorus'], noon_gun: [['conjunction'], 'payoff', 'chorus'],
  afterpeal: [['conjunction'], 'payoff', 'chorus'], spring_tide: [['conjunction'], 'payoff', 'chorus'],
  bell_choir: [['conjunction'], 'payoff', 'chorus'], knell: [['conjunction'], 'payoff', 'chorus'],
  syzygy: [['conjunction'], 'payoff', 'chorus'], confluence: [['conjunction'], 'payoff'],
  tide_table: [['conjunction', 'calendar'], 'payoff'], watch_bell: [['conjunction', 'calendar'], 'payoff'],
  storm_glass: [['conjunction', 'storm'], 'glue'],
  total_eclipse: [['conjunction'], 'multiplier'],
  // Storm Reader: Goad raises the intent; intent-reading cards cash it.
  whistle_for_wind: [['storm', 'clockwork'], 'enabler', 'goad'], red_sky: [['storm'], 'enabler', 'goad'],
  gathering_storm: [['storm'], 'enabler', 'goad'],
  undertow: [['storm'], 'payoff'], turn_the_tide: [['storm'], 'payoff'], reckoning: [['storm'], 'payoff'],
  seen_it_coming: [['storm'], 'payoff'], squall_line: [['storm'], 'payoff', 'goad'],
  weather_eye: [['storm'], 'glue'], heave_to: [['storm'], 'glue'], lighthouse: [['storm'], 'glue'],
  eye_of_the_storm: [['storm'], 'multiplier'],
  // Perpetual Calendar: payloads worth recurring under Eternal Return.
  appointed_hour: [['calendar'], 'payoff'], banked_hours: [['calendar', 'conjunction'], 'payoff'],
  toll_the_hours: [['calendar'], 'payoff'], breakwater: [['calendar'], 'glue'],
  eternal_return: [['calendar'], 'multiplier'],
};

function withEngineTags(def: CardDef): CardDef {
  const entry = ENGINE_ROLES[def.id];
  if (!entry) throw new Error(`chronist card ${def.id} has no engine/role tags (ENGINE_ROLES)`);
  const [engines, role, ...mechs] = entry;
  return { ...def, tags: [...new Set([...(def.tags ?? []), ...mechs, ...engines.map((e) => `engine:${e}`), `role:${role}`])] };
}

export const CHRONIST_CARDS: CardDef[] = [...STARTERS, ...COMMONS, ...UNCOMMONS, ...RARES].map(withEngineTags);

// The tag table must match the pool exactly (johnny bots read engine:* tags): a stale entry is a cut card.
for (const id of Object.keys(ENGINE_ROLES)) {
  if (!CHRONIST_CARDS.some((c) => c.id === id)) throw new Error(`ENGINE_ROLES has '${id}', which is not in the Chronist pool`);
}

// ---------------------------------------------------------------------------
// Power statuses (status id = card id; copies add stacks)

const powerStatus = (id: string, name: string, text: string, rest: Partial<StatusDef>): StatusDef => ({
  id, name, stacks: 'amount', decay: 'never', tick: 'never', isDebuff: false, text, icon: `status_${id}`, ...rest,
});

export const CHRONIST_STATUSES: StatusDef[] = [
  powerStatus('striking_train', 'Striking Train', 'Whenever you play a card on the beat, deal {damage} damage to ALL enemies.', {
    // RULINGS 28: afterCardPlayed trigger frames carry the play's onBeat stamp.
    triggers: { afterCardPlayed: [{ type: 'conditional', if: { type: 'on_beat' }, then: [{ type: 'damage', amount: { scale: 'stacks' }, target: 'all_enemies' }] }] },
  }),
  powerStatus('tide_table', 'Tide Table', 'Whenever a card on your Timeline resolves, draw {draw} card(s).', {
    triggers: { onDelayResolved: [{ type: 'draw', n: { scale: 'stacks' } }] },
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
  powerStatus('watch_bell', 'Watch Bell', 'Whenever a card on your Timeline resolves, gain {block} Block, +{block2} if any enemy intends to attack.', {
    triggers: {
      onDelayResolved: [
        { type: 'block', amount: { per: WATCH_BELL.bell, scale: 'stacks' } },
        { type: 'conditional', if: { type: 'forecast_is_attack', who: 'any', depth: 0 }, then: [{ type: 'block', amount: { per: WATCH_BELL.alarm, scale: 'stacks' } }] },
      ],
    },
  }),
  powerStatus('perpetual_motion', 'Perpetual Motion', 'Cards you play on the beat cost {free}.', {
    values: PERPETUAL_MOTION,
    hooks: {
      // The price shows on every card in hand while the next play would be on the beat. X costs never fold here.
      modifyCardCost: (ctx, _card, cost) => (ctx.nextBeat().onBeat ? Math.min(cost, PERPETUAL_MOTION.free) : cost),
    },
  }),
  // --- v2
  powerStatus('accelerando', 'Accelerando', 'At the start of your turn, Quicken {stacks}.', {
    // Per-turn counters (beatOffset) reset at turn start step 3, before onTurnStart (step 4).
    triggers: { onTurnStart: [{ type: 'repeat', times: { scale: 'stacks' }, effects: [{ type: 'quicken', n: 1 }] }] },
  }),
  powerStatus('squall_line', 'Squall Line', 'Whenever you apply Goad, deal {stacks} damage per Goad to that enemy.', {
    hooks: {
      onStatusInflicted: (ctx, info) => {
        if (info.id !== GOADED) return;
        ctx.queue([{ type: 'damage', amount: info.amount * ctx.stacks, target: 'target' }], { target: info.target });
      },
    },
  }),
  powerStatus('total_eclipse', 'Total Eclipse', 'Whenever {threshold} or more cards resolve together from your Timeline, each resolves a second time.', {
    values: TOTAL_ECLIPSE,
    hooks: { timelineResolutions: (_ctx, batch, _entry, runs) => (batch >= TOTAL_ECLIPSE.threshold ? runs + 1 : runs) },
  }),
  powerStatus('eternal_return', 'Eternal Return', 'The first {stacks} card(s) that resolve from your Timeline each turn go back on it with Delay {delay}, unless they Scrap.', {
    values: ETERNAL_RETURN,
    hooks: { recurDelay: (ctx, _card, recurs) => (recurs < ctx.stacks ? ETERNAL_RETURN.delay : null) },
  }),
  powerStatus('eye_of_the_storm', 'Eye of the Storm', 'At the end of your turn, each enemy takes damage equal to half the damage it intends ({stacks} time(s)).', {
    triggers: {
      onTurnEnd: [
        {
          type: 'repeat', times: { scale: 'stacks' },
          effects: [{ type: 'damage', amount: { per: 0.5, scale: { intent_damage: 'target' } }, target: 'all_enemies', perTarget: true }],
        },
      ],
    },
  }),
  {
    // Goad (v2 enemy status): +stacks per hit on its own next turn, then gone. Not a debuff (it helps the enemy).
    // Forecast entries are computed with the 'forecast' tag and leave it out (it will have worn off).
    id: GOADED, name: 'Goad', stacks: 'amount', decay: 'end_own_turn', decayBy: 'all', tick: 'never', isDebuff: false,
    text: 'Its hits deal {stacks} more damage this turn.', icon: 'status_goaded',
    hooks: { damageDealtFlat: (ctx, info) => (info.tags.includes('forecast') ? 0 : ctx.stacks) },
  },
];
