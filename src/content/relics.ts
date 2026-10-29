// REAL CONTENT: the 72 relics of docs/GDD.md §5 (starter 3 · common 18 · uncommon 18 · rare 12 ·
// boss 12 · shop 5 · event 4).
//
// Conventions in this file
// - Unconditional behaviour is a declarative `triggers` list, so the text reads its numbers from it.
// - Behaviour that needs the hook's info (the card played, the hit, the scrapped card...) or a
//   once-per-turn / once-per-combat gate is a function hook. Its numbers live in a const that is
//   both the def's `values` (text) and what the hook queues, so text and engine cannot drift.
//   Gated hooks call `ctx.flash()` only when they actually do something.
// - Per-combat / per-turn relic bookkeeping lives in `combat.counters` under `<relic id>:<what>`
//   keys (content-owned keys; a fresh combat starts with none, so an absent key means "not yet").
// - A few relics need an effect the DSL has no target for (give an ENEMY Guard / Max HP, see an
//   enemy's status changes). They put a hidden marker status on each enemy at spawn; the marker's
//   hooks run with the enemy as `self` (RELIC_STATUSES below).
import { getCardDef } from './registry';
import type {
  CardInstance,
  CombatState,
  Effect,
  EffectCtx,
  EntityRef,
  EnemyState,
  HookCtx,
  Intent,
  RelicDef,
  RelicState,
  StatusDef,
} from '../engine/types';

// ---------------------------------------------------------------------------
// Helpers

function combatOf(c: { readonly combat: CombatState | null }, who: string): CombatState {
  if (!c.combat) throw new Error(`${who}: needs combat`);
  return c.combat;
}

function relicOf(c: { readonly relic: RelicState | null }, who: string): RelicState {
  if (!c.relic) throw new Error(`${who}: hook without relic state`);
  return c.relic;
}

function enemyOf(combat: CombatState, uid: number, who: string): EnemyState {
  const e = combat.enemies.find((x) => x.uid === uid);
  if (!e) throw new Error(`${who}: no enemy ${uid}`);
  return e;
}

/** Flash the relic and queue its effects (optionally aimed at `target`). */
function fire(c: HookCtx, effects: Effect[], target?: EntityRef): void {
  c.flash();
  c.queue(effects, target === undefined ? undefined : { target });
}

/** Once-per-turn gate: true (and marks the turn) the first time it is asked this turn. */
function firstThisTurn(combat: CombatState, key: string): boolean {
  if (combat.counters[key] === combat.turn) return false;
  combat.counters[key] = combat.turn;
  return true;
}

/** Once-per-combat gate (combat.counters starts empty every combat). */
function usedThisCombat(combat: CombatState, key: string): boolean {
  return combat.counters[key] === 1;
}

function markCombat(combat: CombatState, key: string): void {
  combat.counters[key] = 1;
}

function hasKeyword(card: CardInstance, kw: 'bloom' | 'riposte'): boolean {
  return getCardDef(card.id, card.upgraded).keywords?.includes(kw) === true;
}

/** Hits that come from a card PLAY (not a Riposte trigger or a Timeline resolution). */
function fromPlay(tags: readonly string[]): boolean {
  return !tags.includes('riposte') && !tags.includes('delayed');
}

const ATTACK_KINDS: ReadonlySet<string> = new Set(['attack', 'attack_defend', 'attack_buff', 'attack_debuff']);

/** GDD §0.1 enemy attack; a hidden forecast entry ("?") is not an attack (RULINGS 27). */
function isAttackIntent(i: Intent | undefined): boolean {
  return i !== undefined && i.hidden !== true && ATTACK_KINDS.has(i.kind);
}

function holds(c: { readonly state: { readonly player: { readonly relics: readonly RelicState[] } } }, id: string): boolean {
  return c.state.player.relics.some((r) => r.id === id);
}

/** A relic's own per-run number, or undefined when it was never set (the documented "not yet" state). */
function relicDataOrUndefined(relic: RelicState, key: string): number | undefined {
  return relic.data?.[key];
}

// Mirrors of engine tuning the content needs for its own bookkeeping (content may not import the
// engine at runtime). Keep in sync with src/engine/tuning.ts.
const ENGINE_BLOOM_CAP = 10; // TUNING.caps.bloom
const ENGINE_TIMELINE_CAP = 10; // TUNING.caps.timeline
const ENGINE_PRUNE_AWAY_PER_TURN = 1; // TUNING.caps.pruneAwayPerTurn (RULINGS 7: shared by every in-combat removal)

// ---------------------------------------------------------------------------
// Numbers shared by hooks and text

const LENS = { draw: 1 };
const SPURS = { hits: 3, exposed: 1 };
const COIL = { stagger: 1 };
const PRISM = { gold: 15 };
const GEODE = { block_each: 1, max: 10 };
const RIVETS = { guard: 1 };
const MAGNET = { guard: 3 };
const INK = { gold: 15 };
const DRESSING = { heal: 8 };
const BUCKLER = { guard: 4 };
const POUCH = { bloom: 2 };
const POLLEN = { rot: 1 };
const COMPOST = { draw: 2 };
const FORK = { block: 5 };
const BEAD = { sooner: 1 };
const PIP = { block: 3 };
const CROWD = { enemies: 2, onslaught: 1 };
const RIG = { guard: 1 };
const TEMPER = { divisor: 3 };
const DRONE = { damage: 8 };
const LOUPE = { cost: 1 };
const KNIFE = { bloom: 1 };
const NET = { cap: 20 };
const DRUM = { cost: 0 };
const VEIL = { draw: 1 };
const OATH = { charges: 2 };
const STORM = { onslaught: 6, energy: 1, draw: 2 };
const ELDER = { cap: 15 };
const PLAGUE = { pct: 50 };
const METRONOME = { beat: 12 };
const PROPHET = { depth: 3 };
const PARADOX = { delay: 2 };
const FRACTURE = { per_stack: 2 };
const CONTRACT = { energy: 1 };
const HOURGLASS = { energy: 1 };
const CORE = { energy: 1 };
const STASIS = { energy: 1, draw: 1 };
const LANTERN = { energy: 1, guard: 10 };
const PLATING = { energy: 1, extra: 1 };
const FIXED = { energy: 1, beat: 3 };
const WILD = { bloom: 1 };
const LOOM = { draw: 2, hand: 7 };
const ATLAS = { pct: 10 };
const RACK = { pct: 25 };
const NURSERY = { bloom: 2 };
const CLAMP = { pct: 25 };
const PEBBLE = { combats: 3 };
const TOOTH = { stagger: 2 };
const CROWN = { turns: 3, shards: 1 };

// Wayfinder Needle: rows 1-7 are the rows between the all-monster first row and the Treasure row.
const WAYFINDER_ROWS = { first: 1, last: 7 };

// combat.counters keys
const K = {
  heartseedFetched: 'heartseed:fetched',
  lensTurn: 'chrono_lens:turn',
  beadUsed: 'sandglass_bead:used',
  droneUsed: 'overwatch_drone:used',
  stormTurn: 'stormbreak_gem:turn',
  boughUsed: 'hollow_bough:used',
  plagueBusy: 'plague_bloom:busy',
  paradoxTurn: 'paradox_coil:turn',
  toothDone: 'engine_tooth:done',
  toothActive: 'engine_tooth:active',
} as const;
const paradoxTarget = (uid: number): string => `paradox_coil:target:${uid}`;
const paradoxX = (uid: number): string => `paradox_coil:x:${uid}`;
const paradoxReturned = (uid: number): string => `paradox_coil:returned:${uid}`;
/** Encoding of a Timeline entry's target in combat.counters (numbers only). */
const NO_TARGET = -1;
const PLAYER_TARGET = -2;

// ---------------------------------------------------------------------------
// Custom effects used through choose options

/** Hollow Bough: remove the just-Scrapped card from the deck (a Prune away; RULINGS 7 cap). */
function hollowBoughPruneAway(c: EffectCtx): void {
  const combat = combatOf(c, 'hollow_bough');
  const relic = relicOf(c, 'hollow_bough');
  const uid = relicDataOrUndefined(relic, 'pending');
  if (uid === undefined) throw new Error('hollow_bough: no pending card');
  if ((combat.counters.pruneAway ?? 0) >= ENGINE_PRUNE_AWAY_PER_TURN) {
    c.emit({ t: 'text', text: 'Prune away limit reached' });
    return;
  }
  const deck = c.state.player.deck;
  const i = deck.findIndex((x) => x.uid === uid);
  if (i < 0) throw new Error(`hollow_bough: card ${uid} is no longer in the deck`);
  const [card] = deck.splice(i, 1);
  if (!card) throw new Error('hollow_bough: splice');
  combat.counters.pruneAway = (combat.counters.pruneAway ?? 0) + 1;
  markCombat(combat, K.boughUsed);
  c.emit({ t: 'card_removed', uid });
  const floor = c.state.history.floors[c.state.history.floors.length - 1];
  if (!floor) throw new Error('hollow_bough: run history has no floor record');
  floor.cardsRemoved.push(card.id);
}

/** Paradox Coil: put the card that just resolved back on the Timeline with Delay PARADOX.delay. */
function paradoxReturn(c: EffectCtx): void {
  const combat = combatOf(c, 'paradox_coil');
  const relic = relicOf(c, 'paradox_coil');
  const uid = relicDataOrUndefined(relic, 'pending');
  if (uid === undefined) throw new Error('paradox_coil: no pending card');
  if (combat.timeline.length >= ENGINE_TIMELINE_CAP) {
    c.emit({ t: 'text', text: 'Timeline full' });
    return;
  }
  const pile = combat.discard.some((x) => x.uid === uid) ? combat.discard : combat.exhaust.some((x) => x.uid === uid) ? combat.exhaust : null;
  if (!pile) throw new Error(`paradox_coil: card ${uid} is not in the discard pile or Scrapheap`);
  const i = pile.findIndex((x) => x.uid === uid);
  const [card] = pile.splice(i, 1);
  if (!card) throw new Error('paradox_coil: splice');
  const rawTarget = combat.counters[paradoxTarget(uid)];
  const x = combat.counters[paradoxX(uid)];
  if (rawTarget === undefined || x === undefined) throw new Error(`paradox_coil: card ${uid} was never seen entering the Timeline`);
  const target: EntityRef | null = rawTarget === NO_TARGET ? null : rawTarget === PLAYER_TARGET ? 'player' : rawTarget;
  const seq = combat.counters.timelineSeq ?? 0;
  combat.counters.timelineSeq = seq + 1;
  const dueTurn = combat.turn + PARADOX.delay;
  combat.timeline.push({ card, dueTurn, seq, onBeat: false, target, x, advancedThisTurn: false });
  combat.counters[paradoxReturned(uid)] = 1;
  combat.counters[K.paradoxTurn] = combat.turn;
  c.emit({ t: 'timeline_added', uid, dueTurn, onBeat: false });
}

// ---------------------------------------------------------------------------
// Relics

const STARTER: RelicDef[] = [
  {
    id: 'riven_gauntlet', name: 'Riven Gauntlet', rarity: 'starter', cls: 'breaker',
    text: 'Whenever one of your Riposte effects triggers, gain {status} Onslaught and {guard} Guard.',
    triggers: { onRiposteTriggered: [{ type: 'status', target: 'self', id: 'onslaught', amount: 1 }, { type: 'guard', amount: 3 }] },
    icon: 'relic_riven_gauntlet', tags: ['riposte', 'onslaught', 'guard'],
  },
  {
    id: 'heartseed', name: 'Heartseed', rarity: 'starter', cls: 'graft',
    text: 'At the start of each combat, put the Bloom card in your draw pile with the most Bloom into your hand (ties: random). It counts toward your opening hand.',
    triggers: { onCombatStart: [{ type: 'fetch_card', from: 'draw', select: 'max_bloom', to: 'hand', countsAsDraw: true }] },
    hooks: {
      // The fetch is queued by the trigger above; note whether it will find a card so turn 1 draws one fewer.
      onCombatStart: (c) => {
        const combat = combatOf(c, 'heartseed');
        if (combat.draw.some((x) => hasKeyword(x, 'bloom'))) markCombat(combat, K.heartseedFetched);
      },
      drawPerTurn: (c, n) => (c.combat !== null && c.combat.turn === 1 && usedThisCombat(c.combat, K.heartseedFetched) ? n - 1 : n),
    },
    icon: 'relic_heartseed', tags: ['bloom', 'consistency'],
  },
  {
    id: 'chrono_lens', name: 'Chrono Lens', rarity: 'starter', cls: 'chronist', values: LENS,
    text: 'The first card you play on the beat each turn also draws {draw} card.',
    hooks: {
      onCardPlayed: (c, info) => {
        if (!info.onBeat) return;
        if (!firstThisTurn(combatOf(c, 'chrono_lens'), K.lensTurn)) return;
        fire(c, [{ type: 'draw', n: LENS.draw }]);
      },
    },
    icon: 'relic_chrono_lens', tags: ['cadence', 'draw'],
  },
];

const COMMON: RelicDef[] = [
  {
    id: 'glass_spurs', name: 'Glass Spurs', rarity: 'common', values: SPURS,
    text: 'The first time one card play hits the same enemy {hits} times, apply {exposed} Exposed to it.',
    hooks: {
      onCardPlayed: (c) => {
        relicOf(c, 'glass_spurs').data = {};
      },
      onDamageDealt: (c, info) => {
        if (info.source !== 'player' || info.card === null || typeof info.target !== 'number' || !fromPlay(info.tags)) return;
        const relic = relicOf(c, 'glass_spurs');
        const key = String(info.target);
        // Hits counted on this enemy during the current play (none yet = 0).
        const hits = (relicDataOrUndefined(relic, key) ?? 0) + 1;
        relic.data = { ...(relic.data ?? {}), [key]: hits };
        if (hits === SPURS.hits) fire(c, [{ type: 'status', target: 'target', id: 'exposed', amount: SPURS.exposed }], info.target);
      },
    },
    icon: 'relic_glass_spurs', tags: ['exposed', 'multihit'],
  },
  {
    // Stagger put on an enemy at the end of its move would decay in that same turn's end step
    // (GDD §2.0 enemy step 3), so the relic marks the enemy and applies the Stagger at the start of
    // your next turn, where it lasts through that enemy's next attack.
    id: 'dampener_coil', name: 'Dampener Coil', rarity: 'common', values: COIL,
    text: 'Whenever an enemy finishes an attack on you and you lost no HP from it, it gets {stagger} Stagger at the start of your next turn.',
    hooks: {
      onCombatStart: (c) => {
        relicOf(c, 'dampener_coil').data = {};
      },
      onEnemyMoveEnd: (c, info) => {
        if (!info.wasAttack || info.hpLostThisMove !== 0) return;
        const relic = relicOf(c, 'dampener_coil');
        relic.data = { ...(relic.data ?? {}), [String(info.uid)]: 1 };
      },
      onTurnStart: (c) => {
        const relic = relicOf(c, 'dampener_coil');
        const marked = Object.keys(relic.data ?? {}).map(Number);
        relic.data = {};
        if (marked.length === 0) return;
        c.flash();
        for (const uid of marked) c.queue([{ type: 'status', target: 'target', id: 'stagger', amount: COIL.stagger }], { target: uid });
      },
    },
    icon: 'relic_dampener_coil', tags: ['stagger', 'block'],
  },
  {
    id: 'cracked_prism', name: 'Cracked Prism', rarity: 'common', values: PRISM,
    text: 'Whenever you gain a Shard, gain {gold} gold.',
    hooks: { onShardGain: (c, info) => fire(c, [{ type: 'gold', amount: PRISM.gold * info.amount }]) },
    icon: 'relic_cracked_prism', tags: ['shards', 'economy'],
  },
  {
    id: 'geode_heart', name: 'Geode Heart', rarity: 'common', values: GEODE,
    text: 'At the start of each combat, gain {block_each} Block per Shard you hold (max {max}).',
    triggers: { onCombatStart: [{ type: 'block', amount: { scale: { fn: 'geode_block' } } }] },
    amounts: { geode_block: (c) => Math.min(c.state.player.counters.shards ?? 0, GEODE.max) * GEODE.block_each },
    icon: 'relic_geode_heart', tags: ['shards', 'block'],
  },
  {
    id: 'bulwark_rivets', name: 'Bulwark Rivets', rarity: 'common', values: RIVETS,
    text: 'Whenever you gain Guard, gain {guard} more.',
    hooks: { guardFlat: () => RIVETS.guard },
    icon: 'relic_bulwark_rivets', tags: ['guard', 'stat'],
  },
  {
    id: 'stim_patch', name: 'Stim Patch', rarity: 'common',
    text: 'Whenever you use a potion, gain {guard} Guard.',
    triggers: { onPotionUsed: [{ type: 'guard', amount: 4 }] },
    icon: 'relic_stim_patch', tags: ['potion', 'guard', 'stat'],
  },
  {
    id: 'scrap_magnet', name: 'Scrap Magnet', rarity: 'common', values: MAGNET,
    text: 'Whenever a Status card is put into your hand, gain {guard} Guard.',
    hooks: {
      onCardDrawn: (c, info) => {
        if (getCardDef(info.card.id, info.card.upgraded).type === 'status') fire(c, [{ type: 'guard', amount: MAGNET.guard }]);
      },
      onCardToHand: (c, info) => {
        if (getCardDef(info.card.id, info.card.upgraded).type === 'status') fire(c, [{ type: 'guard', amount: MAGNET.guard }]);
      },
    },
    icon: 'relic_scrap_magnet', tags: ['status', 'guard'],
  },
  {
    // The map half (elite nodes show their encounter) is the renderer reading MapNode.encounterId.
    id: 'surveyor_ink', name: "Surveyor's Ink", rarity: 'common', values: INK,
    text: 'Elite nodes on the map show which elite they hold. Elites drop {gold} more gold.',
    hooks: {
      onCombatEnd: (c, info) => {
        if (info.won && info.kind === 'elite') fire(c, [{ type: 'gold', amount: INK.gold }]);
      },
    },
    icon: 'relic_surveyor_ink', tags: ['map', 'economy'],
  },
  {
    id: 'field_dressing', name: 'Field Dressing', rarity: 'common', values: DRESSING,
    text: 'After you win an elite or boss combat, heal {heal} HP.',
    hooks: {
      onCombatEnd: (c, info) => {
        if (info.won && (info.kind === 'elite' || info.kind === 'boss')) fire(c, [{ type: 'heal', amount: DRESSING.heal }]);
      },
    },
    icon: 'relic_field_dressing', tags: ['heal', 'stat'],
  },
  {
    id: 'tally_stick', name: 'Tally Stick', rarity: 'common',
    text: 'Whenever you skip a card reward, your next card reward offers {run_flag} more card.',
    triggers: { onRewardSkipped: [{ type: 'run_flag', key: 'wide_rewards', delta: 1 }] },
    icon: 'relic_tally_stick', tags: ['shards', 'rewards'],
  },
  {
    id: 'notched_buckler', name: 'Notched Buckler', rarity: 'common', cls: 'breaker', values: BUCKLER,
    text: 'At the end of your turn, if you have a primed card, gain {guard} Guard.',
    hooks: {
      onPrimed: (c, info) => {
        if (info.count > 0) fire(c, [{ type: 'guard', amount: BUCKLER.guard }]);
      },
    },
    icon: 'relic_notched_buckler', tags: ['riposte', 'guard'],
  },
  {
    id: 'chain_wraps', name: 'Chain Wraps', rarity: 'common', cls: 'breaker',
    text: 'At the end of your turn, gain Guard equal to half your Onslaught (round down).',
    triggers: { onTurnEnd: [{ type: 'guard', amount: { per: 0.5, scale: { status: 'onslaught' } } }] },
    icon: 'relic_chain_wraps', tags: ['onslaught', 'guard'],
  },
  {
    id: 'seed_pouch', name: 'Seed Pouch', rarity: 'common', cls: 'graft', values: POUCH,
    text: 'Bloom cards you take from card rewards start with {bloom} Bloom.',
    hooks: {
      onCardAdded: (c, info) => {
        if (info.source !== 'reward' || !hasKeyword(info.card, 'bloom')) return;
        const card = info.card;
        const old = card.vars?.bloom ?? 0; // a fresh copy has no Bloom yet
        if (old >= POUCH.bloom) return;
        card.vars = { ...(card.vars ?? {}), bloom: POUCH.bloom };
        c.flash();
        c.emit({ t: 'bloom', uid: card.uid, delta: POUCH.bloom - old, now: POUCH.bloom });
      },
    },
    icon: 'relic_seed_pouch', tags: ['bloom', 'rewards'],
  },
  {
    id: 'pollen_sac', name: 'Pollen Sac', rarity: 'common', cls: 'graft', values: POLLEN,
    text: 'Whenever a card gains Bloom, apply {rot} Rot to a random enemy.',
    hooks: {
      // Bloom can also grow outside combat (events); only a live fight has enemies to rot.
      onBloomGained: (c) => {
        const combat = c.combat;
        if (c.state.phase !== 'combat' || combat === null || combat.outcome !== null) return;
        fire(c, [{ type: 'status', target: 'random_enemy', id: 'rot', amount: POLLEN.rot }]);
      },
    },
    icon: 'relic_pollen_sac', tags: ['bloom', 'rot'],
  },
  {
    id: 'compost_heap', name: 'Compost Heap', rarity: 'common', cls: 'graft', values: COMPOST,
    text: 'The first time you Prune each combat, draw {draw} cards.',
    hooks: {
      // onPrune fires only when the Prune Scrapped a card, after combat.counters.prunes += 1.
      onPrune: (c) => {
        if (combatOf(c, 'compost_heap').counters.prunes === 1) fire(c, [{ type: 'draw', n: COMPOST.draw }]);
      },
    },
    icon: 'relic_compost_heap', tags: ['prune', 'draw'],
  },
  {
    // GDD: "if you played exactly 3, 6 or 9 cards" = this turn's beat count is a beat position
    // (positions after Metronome Heart / Fixed Star; the count includes Tempo Draught's offset).
    id: 'tuning_fork', name: 'Tuning Fork', rarity: 'common', cls: 'chronist', values: FORK,
    text: 'At the end of your turn, if you stopped on the beat (the number of cards you played is a beat), gain {block} Block.',
    hooks: {
      onTurnEnd: (c) => {
        const beat = c.nextBeat();
        if (beat.positions.includes(beat.count - 1)) fire(c, [{ type: 'block', amount: FORK.block }]);
      },
    },
    icon: 'relic_tuning_fork', tags: ['cadence', 'block'],
  },
  {
    id: 'sandglass_bead', name: 'Sandglass Bead', rarity: 'common', cls: 'chronist', values: BEAD,
    text: 'The first card you put on the Timeline each combat resolves {sooner} turn sooner (it still waits until at least your next turn).',
    hooks: {
      onTimelineAdd: (c, info) => {
        const combat = combatOf(c, 'sandglass_bead');
        if (usedThisCombat(combat, K.beadUsed)) return;
        markCombat(combat, K.beadUsed);
        const due = Math.max(combat.turn + 1, info.entry.dueTurn - BEAD.sooner);
        if (due === info.entry.dueTurn) return;
        info.entry.dueTurn = due;
        c.flash();
      },
    },
    icon: 'relic_sandglass_bead', tags: ['delay'],
  },
  {
    id: 'star_pip', name: 'Star Pip', rarity: 'common', cls: 'chronist', values: PIP,
    text: 'At the start of your turn, gain {block} Block for each enemy whose next two intents are both attacks.',
    hooks: {
      onTurnStart: (c) => {
        const combat = combatOf(c, 'star_pip');
        const n = combat.enemies.filter((e) => e.alive && isAttackIntent(e.intent) && isAttackIntent(e.forecast[0])).length;
        if (n > 0) fire(c, [{ type: 'block', amount: PIP.block * n }]);
      },
    },
    icon: 'relic_star_pip', tags: ['augury', 'block'],
  },
];

const UNCOMMON: RelicDef[] = [
  {
    id: 'parry_charm', name: 'Parry Charm', rarity: 'uncommon', cls: 'breaker',
    text: 'You can prime {status} additional Riposte card.',
    triggers: { onCombatStart: [{ type: 'status', target: 'self', id: 'riposte_capacity', amount: 1 }] },
    icon: 'relic_parry_charm', tags: ['riposte'],
  },
  {
    id: 'kept_fury', name: 'Kept Fury', rarity: 'uncommon', cls: 'breaker',
    text: 'At the end of your turn, keep up to {status} Onslaught.',
    triggers: { onCombatStart: [{ type: 'status', target: 'self', id: 'onslaught_keep', amount: 2 }] },
    icon: 'relic_kept_fury', tags: ['onslaught'],
  },
  {
    id: 'crowd_breaker', name: 'Crowd Breaker', rarity: 'uncommon', cls: 'breaker', values: CROWD,
    text: 'Whenever one of your Attacks hits {enemies} or more enemies, gain {onslaught} Onslaught.',
    hooks: {
      onCardPlayed: (c) => {
        relicOf(c, 'crowd_breaker').data = {};
      },
      onDamageDealt: (c, info) => {
        if (info.source !== 'player' || info.card === null || typeof info.target !== 'number' || !fromPlay(info.tags)) return;
        const relic = relicOf(c, 'crowd_breaker');
        relic.data = { ...(relic.data ?? {}), [String(info.target)]: 1 };
      },
      afterCardPlayed: (c, info) => {
        if (info.def.type !== 'attack') return;
        const hit = Object.keys(relicOf(c, 'crowd_breaker').data ?? {}).length;
        if (hit >= CROWD.enemies) fire(c, [{ type: 'status', target: 'self', id: 'onslaught', amount: CROWD.onslaught }]);
      },
    },
    icon: 'relic_crowd_breaker', tags: ['onslaught', 'aoe'],
  },
  {
    id: 'concussion_rig', name: 'Concussion Rig', rarity: 'uncommon', values: RIG,
    text: 'Whenever an enemy with Stagger hits you, gain {guard} Guard.',
    hooks: {
      onDamageTaken: (c, info) => {
        if (typeof info.source !== 'number') return;
        const e = enemyOf(combatOf(c, 'concussion_rig'), info.source, 'concussion_rig');
        if ((e.statuses.stagger ?? 0) > 0) fire(c, [{ type: 'guard', amount: RIG.guard }]);
      },
    },
    icon: 'relic_concussion_rig', tags: ['stagger', 'guard'],
  },
  {
    id: 'slow_temper', name: 'Slow-Temper Alloy', rarity: 'uncommon', values: TEMPER,
    text: 'At the start of your turn, your Guard loses a third (round down) instead of half.',
    hooks: { guardDecay: (_c, guard) => Math.floor(guard / TEMPER.divisor) },
    icon: 'relic_slow_temper', tags: ['guard'],
  },
  {
    id: 'pocket_star_chart', name: 'Pocket Star Chart', rarity: 'uncommon', excludeClasses: ['chronist'],
    text: 'In elite and boss combats, you have Augury.',
    hooks: {
      onCombatStart: (c) => {
        const combat = combatOf(c, 'pocket_star_chart');
        if (combat.isElite || combat.isBoss) fire(c, [{ type: 'status', target: 'self', id: 'augury', amount: 1 }]);
      },
    },
    icon: 'relic_pocket_star_chart', tags: ['augury'],
  },
  {
    id: 'overwatch_drone', name: 'Overwatch Drone', rarity: 'uncommon', values: DRONE,
    text: 'The first time an enemy attacks you each combat, deal {damage} damage to it before its attack.',
    hooks: {
      onEnemyAttackDeclared: (c, info) => {
        const combat = combatOf(c, 'overwatch_drone');
        if (usedThisCombat(combat, K.droneUsed)) return;
        markCombat(combat, K.droneUsed);
        fire(c, [{ type: 'damage', amount: DRONE.damage, target: 'target' }], info.uid);
      },
    },
    icon: 'relic_overwatch_drone', tags: ['riposte', 'damage'],
  },
  {
    id: 'shard_lens', name: 'Shard Loupe', rarity: 'uncommon', values: LOUPE,
    text: 'Purge costs only {cost} Shard.',
    hooks: { restOptionCost: (_c, id, shards) => (id === 'rest_purge' ? Math.min(shards, LOUPE.cost) : shards) },
    icon: 'relic_shard_lens', tags: ['shards'],
  },
  {
    id: 'crystal_spine', name: 'Crystal Spine', rarity: 'uncommon',
    text: 'Your first Transmute at a Rest site each act costs no Shards.',
    hooks: {
      restOptionCost: (c, id, shards) => (id === 'rest_transmute' && relicDataOrUndefined(relicOf(c, 'crystal_spine'), 'act') !== c.state.act ? 0 : shards),
      onRest: (c, info) => {
        if (info.action !== 'rest_transmute') return;
        const relic = relicOf(c, 'crystal_spine');
        if (relicDataOrUndefined(relic, 'act') === c.state.act) return;
        relic.data = { ...(relic.data ?? {}), act: c.state.act };
        c.flash();
      },
    },
    icon: 'relic_crystal_spine', tags: ['shards', 'transmute'],
  },
  {
    id: 'hairline_saw', name: 'Hairline Saw', rarity: 'uncommon',
    text: 'When an enemy with Exposed dies, apply its Exposed to the living enemy with the lowest HP.',
    hooks: {
      onEnemyDied: (c, info) => {
        const n = info.statuses.exposed ?? 0; // no Exposed on it = 0 stacks
        if (n > 0) fire(c, [{ type: 'status', target: 'lowest_hp_enemy', id: 'exposed', amount: n }]);
      },
    },
    icon: 'relic_hairline_saw', tags: ['exposed'],
  },
  {
    id: 'wayfinder_needle', name: 'Wayfinder Needle', rarity: 'uncommon',
    text: 'At the start of each act, a random ? node before the Treasure row becomes a Treasure node.',
    hooks: {
      onActStart: (c) => {
        const cands = c.state.map.rows.slice(WAYFINDER_ROWS.first, WAYFINDER_ROWS.last + 1).flat().filter((n) => n.type === 'event');
        if (cands.length === 0) return; // a map with no early '?' node: nothing to convert
        c.rng.pick('map', cands).type = 'treasure';
        c.flash();
      },
    },
    icon: 'relic_wayfinder_needle', tags: ['map', 'relic'],
  },
  {
    // The Rot status's death spread (src/content/statuses.ts) reads this relic: all of it instead of half.
    id: 'rot_censer', name: 'Rot Censer', rarity: 'uncommon', cls: 'graft',
    text: 'When an enemy with Rot dies, all of its Rot spreads instead of half.',
    icon: 'relic_rot_censer', tags: ['rot'],
  },
  {
    id: 'grafting_knife', name: 'Grafting Knife', rarity: 'uncommon', cls: 'graft', values: KNIFE,
    text: 'When you Prune a Status or Curse, the Bloom card gains {bloom} more Bloom.',
    hooks: {
      modifyPruneBloom: (_c, amount, scrapped) => {
        const type = getCardDef(scrapped.id, scrapped.upgraded).type;
        return type === 'status' || type === 'curse' ? amount + KNIFE.bloom : amount;
      },
    },
    icon: 'relic_grafting_knife', tags: ['prune', 'bloom', 'status'],
  },
  {
    id: 'heartwood_ring', name: 'Heartwood Ring', rarity: 'uncommon', cls: 'graft',
    text: 'At the start of each combat, the Bloom card in your deck with the least Bloom gains {bloom} Bloom (ties: random).',
    triggers: { onCombatStart: [{ type: 'bloom', amount: 1, target: 'min_in_deck' }] },
    icon: 'relic_heartwood_ring', tags: ['bloom'],
  },
  {
    id: 'mycelial_net', name: 'Mycelial Net', rarity: 'uncommon', cls: 'graft', values: NET,
    text: 'Rot on enemies can reach {cap}.',
    hooks: { modifyStatusCap: (_c, id, cap, target) => (id === 'rot' && target !== 'player' ? Math.max(cap, NET.cap) : cap) },
    icon: 'relic_mycelial_net', tags: ['rot'],
  },
  {
    id: 'offbeat_drum', name: 'Offbeat Drum', rarity: 'uncommon', cls: 'chronist', values: DRUM,
    text: 'On-beat effects of {cost}-cost cards trigger twice.',
    hooks: { onBeatRepeats: (_c, card, repeats) => (card !== null && getCardDef(card.id, card.upgraded).cost === DRUM.cost ? repeats + 1 : repeats) },
    icon: 'relic_offbeat_drum', tags: ['cadence'],
  },
  {
    id: 'timeline_spool', name: 'Timeline Spool', rarity: 'uncommon', cls: 'chronist',
    text: 'Whenever a card on your Timeline resolves, deal {damage} damage to the enemy with the lowest HP.',
    triggers: { onDelayResolved: [{ type: 'damage', amount: 3, target: 'lowest_hp_enemy' }] },
    icon: 'relic_timeline_spool', tags: ['delay', 'damage'],
  },
  {
    id: 'seers_veil', name: "Seer's Veil", rarity: 'uncommon', cls: 'chronist', values: VEIL,
    text: "At the start of your turn, if any enemy's intent after next is not an attack, draw {draw} card.",
    hooks: {
      onTurnStart: (c) => {
        const combat = combatOf(c, 'seers_veil');
        if (combat.enemies.some((e) => e.alive && !isAttackIntent(e.forecast[0]))) fire(c, [{ type: 'draw', n: VEIL.draw }]);
      },
    },
    icon: 'relic_seers_veil', tags: ['augury', 'draw'],
  },
];

const RARE: RelicDef[] = [
  {
    id: 'duelists_oath', name: "Duelist's Oath", rarity: 'rare', cls: 'breaker', values: OATH,
    text: 'Each primed card can trigger its Riposte {charges} times (on different enemy attacks) before it is discarded.',
    hooks: { primeCharges: (_c, _card, charges) => Math.max(charges, OATH.charges) },
    icon: 'relic_duelists_oath', tags: ['riposte'],
  },
  {
    id: 'stormbreak_gem', name: 'Stormbreak Gem', rarity: 'rare', cls: 'breaker', values: STORM,
    text: 'The first time your Onslaught reaches {onslaught} in a turn, gain {energy} energy and draw {draw} cards.',
    hooks: {
      onStatusChanged: (c, info) => {
        if (info.target !== 'player' || info.id !== 'onslaught' || info.delta <= 0) return;
        const combat = combatOf(c, 'stormbreak_gem');
        if (combat.turnPhase !== 'player' || (combat.player.statuses.onslaught ?? 0) < STORM.onslaught) return;
        if (!firstThisTurn(combat, K.stormTurn)) return;
        fire(c, [{ type: 'energy', n: STORM.energy }, { type: 'draw', n: STORM.draw }]);
      },
    },
    icon: 'relic_stormbreak_gem', tags: ['onslaught'],
  },
  {
    id: 'bastion_core', name: 'Bastion Core', rarity: 'rare', cls: 'breaker',
    text: 'At the start of your turn, the Guard you lose to halving is dealt as damage to a random enemy.',
    hooks: {
      onGuardDecay: (c, info) => {
        if (info.lost > 0) fire(c, [{ type: 'damage', amount: info.lost, target: 'random_enemy' }]);
      },
    },
    icon: 'relic_bastion_core', tags: ['guard', 'damage'],
  },
  {
    id: 'elder_seed', name: 'Elder Seed', rarity: 'rare', cls: 'graft', values: ELDER,
    text: 'Your Bloom cards can grow to {cap} Bloom.',
    hooks: { bloomCap: (_c, _card, cap) => Math.max(cap, ELDER.cap) },
    icon: 'relic_elder_seed', tags: ['bloom'],
  },
  {
    id: 'hollow_bough', name: 'Hollow Bough', rarity: 'rare', cls: 'graft',
    text: 'Once per combat, when you Prune, you may make it Prune away instead.',
    hooks: {
      onPrune: (c, info) => {
        const combat = combatOf(c, 'hollow_bough');
        const card = info.scrapped;
        if (usedThisCombat(combat, K.boughUsed)) return;
        // Only a run-deck card can be removed; Bound cards are never Pruned away; the shared cap (RULINGS 7).
        if (!c.state.player.deck.some((x) => x.uid === card.uid) || getCardDef(card.id, card.upgraded).bound === true) return;
        if ((combat.counters.pruneAway ?? 0) >= ENGINE_PRUNE_AWAY_PER_TURN) return;
        relicOf(c, 'hollow_bough').data = { pending: card.uid };
        const name = getCardDef(card.id, card.upgraded).name;
        fire(c, [{
          type: 'choose', prompt: `Hollow Bough: Prune away ${name}?`,
          options: [
            { label: `Prune away: remove ${name} from your deck.`, effects: [{ type: 'custom', fn: 'prune_away' }] },
            { label: 'Keep it in your deck.', effects: [] },
          ],
        }]);
      },
    },
    custom: { prune_away: hollowBoughPruneAway },
    icon: 'relic_hollow_bough', tags: ['prune', 'removal'],
  },
  {
    // Sees Rot through the hidden `plague_bloom_mark` status on every enemy (RELIC_STATUSES).
    id: 'plague_bloom', name: 'Plague Bloom', rarity: 'rare', cls: 'graft', values: PLAGUE,
    text: 'Whenever you apply Rot to an enemy, every other enemy gains half that much Rot (round down).',
    triggers: { onEnemySpawn: [{ type: 'status', target: 'target', id: 'plague_bloom_mark', amount: 1 }] },
    icon: 'relic_plague_bloom', tags: ['rot', 'aoe'],
  },
  {
    id: 'metronome_heart', name: 'Metronome Heart', rarity: 'rare', cls: 'chronist', values: METRONOME,
    text: 'The {beat}th card you play each turn is also on the beat.',
    hooks: { beatPositions: (_c, positions) => (positions.includes(METRONOME.beat) ? [...positions] : [...positions, METRONOME.beat]) },
    icon: 'relic_metronome_heart', tags: ['cadence'],
  },
  {
    id: 'prophet_glass', name: 'Prophet Glass', rarity: 'rare', cls: 'chronist', values: PROPHET,
    text: "You see each enemy's next {depth} intents.",
    hooks: { forecastDepth: (_c, depth) => Math.max(depth, PROPHET.depth) },
    icon: 'relic_prophet_glass', tags: ['augury'],
  },
  {
    id: 'paradox_coil', name: 'Paradox Coil', rarity: 'rare', cls: 'chronist', values: PARADOX,
    text: 'Once per turn, when a card on your Timeline resolves, you may put it back on the Timeline with Delay {delay}. Each card can return only once per combat.',
    hooks: {
      onTimelineAdd: (c, info) => {
        const combat = combatOf(c, 'paradox_coil');
        const t = info.entry.target;
        combat.counters[paradoxTarget(info.entry.card.uid)] = t === null ? NO_TARGET : t === 'player' ? PLAYER_TARGET : t;
        combat.counters[paradoxX(info.entry.card.uid)] = info.entry.x;
      },
      onDelayResolved: (c, info) => {
        const combat = combatOf(c, 'paradox_coil');
        const uid = info.card.uid;
        if (combat.outcome !== null || combat.counters[K.paradoxTurn] === combat.turn || combat.counters[paradoxReturned(uid)] === 1) return;
        if (!combat.discard.some((x) => x.uid === uid) && !combat.exhaust.some((x) => x.uid === uid)) return;
        relicOf(c, 'paradox_coil').data = { pending: uid };
        const name = getCardDef(info.card.id, info.card.upgraded).name;
        fire(c, [{
          type: 'choose', prompt: `Paradox Coil: put ${name} back on the Timeline?`,
          options: [
            { label: 'Return it with Delay {delay}.', effects: [{ type: 'custom', fn: 'return_card' }] },
            { label: 'Let it go.', effects: [] },
          ],
        }]);
      },
    },
    custom: { return_card: paradoxReturn },
    icon: 'relic_paradox_coil', tags: ['delay'],
  },
  {
    id: 'shard_crucible', name: 'Shard Crucible', rarity: 'rare',
    text: 'At Rest sites, Purge and Transmute no longer use up your rest action (once each per visit; Shards still paid).',
    hooks: { restSideAction: (_c, id) => id === 'rest_purge' || id === 'rest_transmute' },
    icon: 'relic_shard_crucible', tags: ['shards', 'rest'],
  },
  {
    id: 'fracture_engine', name: 'Fracture Engine', rarity: 'rare', values: FRACTURE,
    text: 'Exposed on enemies adds {per_stack} damage per stack to your hits.',
    hooks: { exposedPerStack: (_c, per, info) => (info.source === 'player' ? Math.max(per, FRACTURE.per_stack) : per) },
    icon: 'relic_fracture_engine', tags: ['exposed'],
  },
  {
    id: 'void_compass', name: 'Void Compass', rarity: 'rare',
    text: 'Elite card rewards offer one common, one uncommon and one rare card.',
    hooks: { cardRewardRarities: (_c, kind) => (kind === 'elite' ? ['common', 'uncommon', 'rare'] : null) },
    icon: 'relic_void_compass', tags: ['rewards'],
  },
];

const BOSS: RelicDef[] = [
  {
    id: 'binding_contract', name: 'Binding Contract', rarity: 'boss', values: CONTRACT,
    text: '+{energy} energy each turn. You must take a card from every card reward (no skipping, no Shards from skipping).',
    hooks: { maxEnergy: (_c, e) => e + CONTRACT.energy, canSkipCardReward: () => false },
    icon: 'relic_binding_contract', tags: ['energy', 'shards'],
  },
  {
    id: 'cracked_hourglass', name: 'Cracked Hourglass', rarity: 'boss', values: HOURGLASS,
    text: '+{energy} energy each turn. In every combat, enemies take a full turn before your first turn.',
    hooks: { maxEnergy: (_c, e) => e + HOURGLASS.energy, enemiesActFirst: () => true },
    icon: 'relic_cracked_hourglass', tags: ['energy'],
  },
  {
    id: 'exposed_core', name: 'Exposed Core', rarity: 'boss', values: CORE,
    text: '+{energy} energy each turn. Start each combat with {status} Exposed.',
    triggers: { onCombatStart: [{ type: 'status', target: 'self', id: 'exposed', amount: 4 }] },
    hooks: { maxEnergy: (_c, e) => e + CORE.energy },
    icon: 'relic_exposed_core', tags: ['energy', 'exposed'],
  },
  {
    id: 'stasis_engine', name: 'Stasis Engine', rarity: 'boss', values: STASIS,
    text: '+{energy} energy each turn. Draw {draw} fewer card each turn.',
    hooks: { maxEnergy: (_c, e) => e + STASIS.energy, drawPerTurn: (_c, n) => n - STASIS.draw },
    icon: 'relic_stasis_engine', tags: ['energy', 'draw'],
  },
  {
    // The Guard is granted by the hidden `ghost_lantern_guard` status (the enemy is its owner).
    id: 'ghost_lantern', name: 'Ghost Lantern', rarity: 'boss', values: LANTERN,
    text: '+{energy} energy each turn. Enemies start each combat with {guard} Guard.',
    triggers: { onEnemySpawn: [{ type: 'status', target: 'target', id: 'ghost_lantern_guard', amount: 1 }] },
    hooks: { maxEnergy: (_c, e) => e + LANTERN.energy },
    icon: 'relic_ghost_lantern', tags: ['energy', 'guard'],
  },
  {
    // GDD §2.15 step 7: "Tender Plating +1 here".
    id: 'tender_plating', name: 'Tender Plating', rarity: 'boss', values: PLATING,
    text: '+{energy} energy each turn. Whenever you lose HP from an enemy hit, lose {extra} more.',
    hooks: {
      maxEnergy: (_c, e) => e + PLATING.energy,
      modifyHpLoss: (_c, amount, info) => (typeof info.source === 'number' && amount > 0 ? amount + PLATING.extra : amount),
    },
    icon: 'relic_tender_plating', tags: ['energy'],
  },
  {
    id: 'fixed_star', name: 'Fixed Star', rarity: 'boss', cls: 'chronist', values: FIXED,
    text: '+{energy} energy each turn. Only the {beat}rd card you play each turn is on the beat.',
    hooks: { maxEnergy: (_c, e) => e + FIXED.energy, beatPositions: () => [FIXED.beat] },
    icon: 'relic_fixed_star', tags: ['energy', 'cadence'],
  },
  {
    id: 'heavy_heart', name: 'Heavy Heart', rarity: 'boss', cls: 'breaker',
    text: "Your Onslaught halves (round down) at the end of your turn instead of resetting. You can't prime Riposte cards.",
    // keepStatus is a max over sources, so Kept Fury still applies (RULINGS 37).
    hooks: { keepStatus: (_c, id, stacks) => (id === 'onslaught' ? Math.floor(stacks / 2) : 0), primeCapacity: () => 0 },
    icon: 'relic_heavy_heart', tags: ['onslaught', 'riposte'],
  },
  {
    id: 'wild_growth', name: 'Wild Growth', rarity: 'boss', cls: 'graft', values: WILD,
    text: 'Prune grants {bloom} additional Bloom. At the start of each combat, shuffle {add_card} Tangles into your draw pile.',
    triggers: { onCombatStart: [{ type: 'add_card', card: 'status_tangle', to: 'draw', n: 2 }] },
    hooks: { modifyPruneBloom: (_c, amount) => amount + WILD.bloom },
    icon: 'relic_wild_growth', tags: ['prune', 'bloom', 'status'],
  },
  {
    id: 'ascendant_prism', name: 'Ascendant Prism', rarity: 'boss',
    text: 'When you pick this up, gain {shards} Shards. You no longer gain Shards from skipping card rewards.',
    triggers: { onPickup: [{ type: 'shards', amount: 4 }] },
    hooks: { skipShards: () => 0 },
    icon: 'relic_ascendant_prism', tags: ['shards'],
  },
  {
    id: 'gravity_loom', name: 'Gravity Loom', rarity: 'boss', values: LOOM,
    text: 'Draw {draw} more cards each turn. Your hand limit is {hand}.',
    hooks: { drawPerTurn: (_c, n) => n + LOOM.draw, handLimit: (_c, n) => Math.min(n, LOOM.hand) },
    icon: 'relic_gravity_loom', tags: ['draw'],
  },
  {
    // The Max HP is added by the hidden `star_atlas_mark` status on each spawned enemy.
    id: 'star_atlas', name: 'Star Atlas', rarity: 'boss', excludeClasses: ['chronist'], values: ATLAS,
    text: 'You have Augury. Enemies have {pct}% more Max HP (round up).',
    triggers: {
      onCombatStart: [{ type: 'status', target: 'self', id: 'augury', amount: 1 }],
      onEnemySpawn: [{ type: 'status', target: 'target', id: 'star_atlas_mark', amount: 1 }],
    },
    icon: 'relic_star_atlas', tags: ['augury'],
  },
];

const SHOP: RelicDef[] = [
  {
    id: 'shard_writ', name: 'Shard Writ', rarity: 'shop',
    text: "At shops, removing a card with a Shard costs no gold and doesn't use up the shop's removal service.",
    hooks: {
      shardRemovalKeepsService: () => true,
      modifyShopPrice: (_c, item, price) => (item === 'remove_shard_gold' ? 0 : price),
    },
    icon: 'relic_shard_writ', tags: ['shards', 'removal'],
  },
  {
    id: 'vial_rack', name: 'Vial Rack', rarity: 'shop', values: RACK,
    text: '+{potion_slots} potion slot. Potions in shops cost {pct}% less.',
    triggers: { onPickup: [{ type: 'potion_slots', n: 1 }] },
    hooks: { modifyShopPrice: (_c, item, price) => (item === 'potion' ? Math.floor((price * (100 - RACK.pct)) / 100) : price) },
    icon: 'relic_vial_rack', tags: ['potion', 'stat'],
  },
  {
    // Primed at the first turn's onTurnStart: a card primed at onCombatStart would fizzle at player
    // turn start step 2 (GDD §2.0) before enemy turn 1 ever came.
    id: 'practice_dummy', name: 'Practice Dummy', rarity: 'shop', cls: 'breaker',
    text: 'At the start of each combat, a random Riposte card from your draw pile starts primed.',
    hooks: {
      onTurnStart: (c) => {
        const combat = combatOf(c, 'practice_dummy');
        if (combat.turn !== 1 || !combat.draw.some((x) => hasKeyword(x, 'riposte'))) return;
        fire(c, [{ type: 'fetch_card', from: 'draw', select: 'random', to: 'primed', filter: { riposte: true } }]);
      },
    },
    icon: 'relic_practice_dummy', tags: ['riposte'],
  },
  {
    id: 'nursery_tray', name: 'Nursery Tray', rarity: 'shop', cls: 'graft', values: NURSERY,
    text: 'Whenever you Smith a Bloom card, it also gains {bloom} Bloom.',
    hooks: {
      onRest: (c, info) => {
        if (info.action !== 'smith' || info.uid === null) return;
        const uid = info.uid;
        const card = c.state.player.deck.find((x) => x.uid === uid);
        if (!card) throw new Error(`nursery_tray: smithed card ${uid} not in the deck`);
        if (!hasKeyword(card, 'bloom')) return;
        const cap = holds(c, 'elder_seed') ? ELDER.cap : ENGINE_BLOOM_CAP;
        const old = card.vars?.bloom ?? 0; // a copy that never grew has no Bloom yet
        const now = Math.min(cap, old + NURSERY.bloom);
        if (now === old) return;
        card.vars = { ...(card.vars ?? {}), bloom: now };
        c.flash();
        c.emit({ t: 'bloom', uid: card.uid, delta: now - old, now });
      },
    },
    icon: 'relic_nursery_tray', tags: ['bloom', 'rest'],
  },
  {
    id: 'timeline_clamp', name: 'Timeline Clamp', rarity: 'shop', cls: 'chronist', values: CLAMP,
    text: 'Damage and Block from cards resolving on your Timeline are increased by {pct}% (round down).',
    hooks: {
      damageDealtMult: (_c, info) => (info.tags.includes('delayed') ? 100 + CLAMP.pct : 100),
      blockMult: (_c, info) => (info.tags.includes('delayed') ? 100 + CLAMP.pct : 100),
    },
    icon: 'relic_timeline_clamp', tags: ['delay'],
  },
];

const EVENT: RelicDef[] = [
  {
    id: 'oracle_pebble', name: 'Oracle Pebble', rarity: 'event', excludeClasses: ['chronist'], values: PEBBLE, counterMax: PEBBLE.combats,
    text: 'You have Augury in your next {combats} combats.',
    hooks: {
      onPickup: (c) => {
        relicOf(c, 'oracle_pebble').counter = PEBBLE.combats;
      },
      onCombatStart: (c) => {
        const relic = relicOf(c, 'oracle_pebble');
        if (relic.counter <= 0) return;
        relic.counter -= 1;
        fire(c, [{ type: 'status', target: 'self', id: 'augury', amount: 1 }]);
      },
    },
    icon: 'relic_oracle_pebble', tags: ['augury'],
  },
  {
    id: 'engine_tooth', name: 'Engine Tooth', rarity: 'event', values: TOOTH,
    text: 'Your first Attack each combat applies {stagger} Stagger to each enemy it hits.',
    hooks: {
      onCardPlayed: (c, info) => {
        if (info.def.type !== 'attack') return;
        const combat = combatOf(c, 'engine_tooth');
        if (usedThisCombat(combat, K.toothDone)) return;
        markCombat(combat, K.toothDone);
        combat.counters[K.toothActive] = info.card.uid;
        relicOf(c, 'engine_tooth').data = {};
      },
      onDamageDealt: (c, info) => {
        const combat = combatOf(c, 'engine_tooth');
        if (info.card === null || combat.counters[K.toothActive] !== info.card.uid || typeof info.target !== 'number' || !fromPlay(info.tags)) return;
        const relic = relicOf(c, 'engine_tooth');
        const key = String(info.target);
        if (relicDataOrUndefined(relic, key) !== undefined) return;
        relic.data = { ...(relic.data ?? {}), [key]: 1 };
        fire(c, [{ type: 'status', target: 'target', id: 'stagger', amount: TOOTH.stagger }], info.target);
      },
      afterCardPlayed: (c, info) => {
        const combat = combatOf(c, 'engine_tooth');
        if (combat.counters[K.toothActive] === info.card.uid) delete combat.counters[K.toothActive];
      },
    },
    icon: 'relic_engine_tooth', tags: ['stagger'],
  },
  {
    id: 'shard_debt', name: 'Shard Debt', rarity: 'event',
    text: 'When you pick this up, gain {shards} Shards. Your next {run_flag} card rewards offer one fewer card.',
    triggers: { onPickup: [{ type: 'shards', amount: 3 }, { type: 'run_flag', key: 'lean_rewards', delta: 3 }] },
    icon: 'relic_shard_debt', tags: ['shards'],
  },
  {
    id: 'crown_fragment', name: 'Crown Fragment', rarity: 'event', values: CROWN,
    text: 'Whenever you win a combat within {turns} turns, gain {shards} Shard.',
    hooks: {
      onCombatEnd: (c, info) => {
        if (info.won && info.turn <= CROWN.turns) fire(c, [{ type: 'shards', amount: CROWN.shards }]);
      },
    },
    icon: 'relic_crown_fragment', tags: ['shards'],
  },
];

export const RELICS: RelicDef[] = [...STARTER, ...COMMON, ...UNCOMMON, ...RARE, ...BOSS, ...SHOP, ...EVENT];

// ---------------------------------------------------------------------------
// Hidden marker statuses relics put on enemies (the enemy is the status owner, so its effects
// run with the enemy as `self`).

export const RELIC_STATUSES: StatusDef[] = [
  {
    id: 'plague_bloom_mark', name: 'Plague Bloom', stacks: 'flag', decay: 'never', tick: 'never', isDebuff: false, hidden: true, values: PLAGUE,
    text: 'When you apply Rot to this enemy, every other enemy gains {pct}% of it (round down).',
    hooks: {
      // Player applications only: Rot's own +1 tick happens on the enemy's turn. The busy flag
      // stops Plague Bloom's own applications from spreading again (GDD: no recursion).
      onStatusChanged: (c, info) => {
        if (info.id !== 'rot' || info.delta <= 0 || !holds(c, 'plague_bloom')) return;
        const combat = combatOf(c, 'plague_bloom_mark');
        if (combat.turnPhase !== 'player' || combat.counters[K.plagueBusy] === 1) return;
        const n = Math.floor((info.delta * PLAGUE.pct) / 100);
        const others = combat.enemies.filter((e) => e.alive && e.uid !== c.owner);
        if (n <= 0 || others.length === 0) return;
        c.emit({ t: 'relic_trigger', relic: 'plague_bloom' });
        combat.counters[K.plagueBusy] = 1;
        for (const e of others) c.now([{ type: 'status', target: 'target', id: 'rot', amount: n }], { target: e.uid });
        delete combat.counters[K.plagueBusy];
      },
    },
    icon: 'status_plague_bloom_mark',
  },
  {
    id: 'ghost_lantern_guard', name: 'Ghost Lantern', stacks: 'flag', decay: 'never', tick: 'never', isDebuff: false, hidden: true, values: LANTERN,
    text: 'Entered combat with {guard} Guard.',
    hooks: { onApplied: (c) => c.queue([{ type: 'guard', amount: LANTERN.guard }]) },
    icon: 'status_ghost_lantern_guard',
  },
  {
    id: 'star_atlas_mark', name: 'Star Atlas', stacks: 'flag', decay: 'never', tick: 'never', isDebuff: false, hidden: true, values: ATLAS,
    text: 'Has {pct}% more Max HP.',
    hooks: {
      onApplied: (c) => {
        if (c.owner === 'player') throw new Error('star_atlas_mark on the player');
        const e = enemyOf(combatOf(c, 'star_atlas_mark'), c.owner, 'star_atlas_mark');
        const max = Math.ceil((e.maxHp * (100 + ATLAS.pct)) / 100);
        e.hp += max - e.maxHp;
        e.maxHp = max;
      },
    },
    icon: 'status_star_atlas_mark',
  },
];
