import '../testpack-only';
// Extra definitions registered only inside tests, for mechanics the placeholder content does not cover.
import { registerPack } from '../../src/content';
import type { CardDef, EncounterDef, EnemyAiCtx, EnemyDef, RelicDef, StatusDef } from '../../src/engine';

const card = (d: Partial<CardDef> & Pick<CardDef, 'id' | 'effects' | 'text'>): CardDef => ({
  name: d.id,
  cls: 'colorless',
  type: 'skill',
  rarity: 'special',
  cost: 1,
  target: 'none',
  upgrade: {},
  icon: 'fx',
  ...d,
});

export const FX_CARDS: CardDef[] = [
  card({ id: 'fx_pierce', type: 'attack', target: 'enemy', text: 'Deal {damage} damage, ignoring Block.', effects: [{ type: 'damage', amount: 6, target: 'target', ignoreBlock: true }] }),
  card({ id: 'fx_hit7', type: 'attack', target: 'enemy', cost: 0, text: 'Deal {damage} damage.', effects: [{ type: 'damage', amount: 7, target: 'target' }] }),
  card({ id: 'fx_gen', text: 'Add {add_card} Test Strike to your hand.', cost: 0, effects: [{ type: 'add_card', card: 'test_strike', to: 'hand', n: 2 }] }),
  card({ id: 'fx_random', type: 'attack', target: 'all_enemies', cost: 0, text: 'Deal {damage} damage to a random enemy {times} times.', effects: [{ type: 'damage', amount: 1, times: 6, target: 'random_enemy' }] }),
  card({ id: 'fx_energy5', cost: 0, text: 'Gain {energy} energy.', effects: [{ type: 'energy', n: 5 }] }),
  card({ id: 'fx_gen5', cost: 0, text: 'Add {add_card} Strikes to your hand.', effects: [{ type: 'add_card', card: 'test_strike', to: 'hand', n: 5 }] }),
  card({ id: 'fx_draw20', cost: 0, text: 'Draw {draw}.', effects: [{ type: 'draw', n: 20 }] }),
  card({ id: 'fx_autoplay', cost: 0, text: 'Play the top card of your draw pile.', effects: [{ type: 'autoplay', from: 'draw' }] }),
  card({ id: 'fx_delay_beat', cost: 0, keywords: ['delay'], text: 'Delay 1: on beat, gain {block} Block.', effects: [],
    delay: { turns: 1, effects: [{ type: 'on_beat', effects: [{ type: 'block', amount: 10 }] }] } }),
  card({ id: 'fx_delay_hit', type: 'attack', target: 'enemy', cost: 0, keywords: ['delay'], text: 'Delay 1: deal {damage}.', effects: [],
    delay: { turns: 1, effects: [{ type: 'damage', amount: 5, target: 'target' }] } }),
  card({ id: 'fx_advance1', cost: 0, text: 'Advance {advance}.', effects: [{ type: 'advance', n: 1 }] }),
  card({ id: 'fx_prune_away', cost: 0, keywords: ['exhaust'], text: 'Prune away.', effects: [{ type: 'prune', variant: 'away' }] }),
  card({ id: 'fx_fetch', cost: 0, text: 'Return the top card of your discard pile to hand.', effects: [{ type: 'fetch_card', from: 'discard', select: 'top', to: 'hand' }] }),
  card({ id: 'fx_self_scrap', type: 'attack', target: 'enemy', cost: 0, text: 'Deal {damage}. Scrap this.',
    effects: [{ type: 'damage', amount: 3, target: 'target' }, { type: 'exhaust', from: 'hand', self: true }] }),
  card({ id: 'fx_prime2', cost: 0, text: 'Prime up to {prime} Riposte cards.', effects: [{ type: 'prime', n: 2 }] }),
  card({ id: 'fx_self_remove', cost: 0, text: 'Remove this from your deck. If you do, gain {gold} gold.',
    effects: [{ type: 'remove_card', self: true }, { type: 'conditional', if: { type: 'removed_self' }, then: [{ type: 'gold', amount: 10 }] }] }),
  card({ id: 'fx_only_beat', cost: 0, text: 'Only on the beat: gain {block} Block.', effects: [{ type: 'block', amount: 4 }],
    hooks: { canPlay: (c) => (c.nextBeat().onBeat ? true : 'Only on the beat.') } }),
  card({ id: 'fx_bad_now', cost: 0, text: 'Misuses now().', effects: [{ type: 'custom', fn: 'bad' }],
    custom: { bad: (c) => c.now([{ type: 'discard', n: 1, choose: true }]) } }),
  card({ id: 'fx_dagger', type: 'attack', target: 'enemy', cost: 0, text: 'Deal {damage} damage. Grows.',
    effects: [{ type: 'damage', amount: { base: 3, per: 2, scale: { cardVar: 'growth' } }, target: 'target' }, { type: 'custom', fn: 'grow' }],
    custom: { grow: (c) => { if (!c.card) throw new Error('no card'); c.card.vars = { ...(c.card.vars ?? {}), growth: (c.card.vars?.growth ?? 0) + 1 }; } } }),
];

export const FX_BLOOM_COMMON: CardDef = card({ id: 'fx_bloom_common', cls: 'test_class', rarity: 'common', type: 'attack', target: 'enemy', keywords: ['bloom'],
  text: 'Deal {damage}.', effects: [{ type: 'damage', amount: { base: 1, per: 1, scale: { cardVar: 'bloom' } }, target: 'target' }], upgrade: { cost: 0 } });

export const FX_STATUSES: StatusDef[] = [
  { id: 'fx_tl_watch', name: 'Timeline Watch', stacks: 'amount', decay: 'never', tick: 'never', isDebuff: false,
    text: 'When an on-beat card joins the Timeline, gain {block} Block.', triggers: { onTimelineAdd: [{ type: 'on_beat', effects: [{ type: 'block', amount: 7 }] }] }, icon: 'fx' },
  { id: 'fx_exposed', name: 'Exposed', stacks: 'duration', decay: 'end_enemy_turn', tick: 'never', isDebuff: true,
    text: 'Takes {stacks} more damage per hit.', hooks: { modifyDamageTaken: (c, amount) => amount + c.stacks }, icon: 'fx' },
  { id: 'fx_barricade', name: 'Barricade', stacks: 'flag', decay: 'never', tick: 'never', isDebuff: false,
    text: 'Block is not removed at the start of your turn.', hooks: { keepBlock: (_c, block) => block }, icon: 'fx' },
  { id: 'fx_thorns', name: 'Thorns', stacks: 'amount', decay: 'never', tick: 'never', isDebuff: false,
    text: 'When attacked, deal {damage} damage back.', triggers: { onDamageTaken: [{ type: 'damage', amount: { scale: 'stacks' }, target: 'target' }] }, icon: 'fx' },
  { id: 'fx_artifact', name: 'Artifact', stacks: 'amount', decay: 'never', tick: 'never', isDebuff: false,
    text: 'Negates the next {stacks} debuff(s).', icon: 'fx',
    hooks: { modifyStatusApplied: (c, id, amount) => (id === 'fx_artifact' ? amount : c.stacks > 0 && amount > 0 && id === 'test_vulnerable' ? 0 : amount) } },
];

export const FX_RELICS: RelicDef[] = [
  { id: 'fx_phoenix', name: 'Phoenix', rarity: 'event', text: 'Once, when you would die, heal to {hp} HP.', values: { hp: 10 }, icon: 'fx',
    hooks: { onDeath: (c) => { if (!c.relic) throw new Error('no relic'); if (c.relic.counter === 0) { c.relic.counter = 1; c.flash(); c.now([{ type: 'heal', amount: 10, target: 'self' }]); } } } },
];

/** The last EnemyAiCtx the spy enemy received (purity-contract test). */
export const spy: { ctx: EnemyAiCtx | null } = { ctx: null };

export const FX_ENEMIES: EnemyDef[] = [
  { id: 'fx_hitter', name: 'Hitter', hp: [100, 100],
    moves: {
      triple: { name: 'Triple', intent: 'attack', effects: [{ type: 'damage', amount: 5, times: 3, target: 'target' }] },
      wait: { name: 'Wait', intent: 'sleep', effects: [] },
    },
    chooseMove: () => 'triple', icon: 'fx' },
  { id: 'fx_spy', name: 'Spy', hp: [40, 40],
    moves: { poke: { name: 'Poke', intent: 'attack', effects: [{ type: 'damage', amount: 1, target: 'target' }] } },
    chooseMove: (c) => {
      spy.ctx = c;
      return 'poke';
    }, icon: 'fx' },
];

export const FX_ENCOUNTERS: EncounterDef[] = [
  { id: 'fx_enc_hitter', name: 'Hitter', acts: [1, 2, 3], pool: 'event', enemies: ['fx_hitter'] },
  { id: 'fx_enc_two_hitters', name: 'Two Hitters', acts: [1, 2, 3], pool: 'event', enemies: ['fx_hitter', 'fx_hitter'] },
  { id: 'fx_enc_spy', name: 'Spy', acts: [1, 2, 3], pool: 'event', enemies: ['fx_spy'] },
];

let done = false;
export function registerFixtures(): void {
  if (done) return;
  done = true;
  registerPack({ cards: [...FX_CARDS, FX_BLOOM_COMMON], statuses: FX_STATUSES, relics: FX_RELICS, enemies: FX_ENEMIES, encounters: FX_ENCOUNTERS }, 'test');
}
