// REAL CONTENT: the 72 relics of docs/GDD.md §5, reworked and extended by docs/v2/shared-design.md §3
// (RULINGS 60: the §8.3 trim applied; Phase C merged Crystal Spine into Shard Loupe): starter 3 · common 21 ·
// uncommon 27 · rare 24 · boss 15 · shop 6 · event 4 = 100. OP-suspect retunes (notched_buckler, star_pip, ghost_lantern, crown_fragment, ...) wait for
// docs/balance/report-v2-baseline.md.
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
import { allClasses, getCardDef } from './registry';
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
  TimelineEntry,
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

function hasEngineKeyword(card: CardInstance, kw: 'retain' | 'exhaust'): boolean {
  return getCardDef(card.id, card.upgraded).keywords?.includes(kw) === true;
}

/** Shards the player holds (the engine always keeps the counter). */
function shardsHeld(state: { readonly player: { readonly counters: Readonly<Record<string, number>> } }): number {
  const n = state.player.counters.shards;
  if (n === undefined) throw new Error('player.counters.shards missing');
  return n;
}

/** Per-turn count stored under a turn key + count key in combat.counters (a new turn starts at 0). */
function bumpThisTurn(combat: CombatState, turnKey: string, countKey: string): number {
  if (combat.counters[turnKey] !== combat.turn) {
    combat.counters[turnKey] = combat.turn;
    combat.counters[countKey] = 0;
  }
  const n = (combat.counters[countKey] ?? 0) + 1; // set to 0 just above when the turn changed
  combat.counters[countKey] = n;
  return n;
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
const MAGNET = { guard: 3 };
const INK = { gold: 15 };
const BUCKLER = { guard: 4 };
const POUCH = { bloom: 2 };
const POLLEN = { rot: 1 };
const COMPOST = { draw: 2 };
const FORK = { block: 5 };
const BEAD = { sooner: 1 };
const PIP = { block: 1 }; // Phase C 3 -> 2 (v1 cf +16.0); Phase D 2 -> 1 (v2 cf +14.1, Δprog +4.5 floors **)
const CROWD = { enemies: 2, onslaught: 1 };
const RIG = { guard: 1 };
const TEMPER = { divisor: 3 };
const KNIFE = { bloom: 1 };
const NET = { cap: 20 };
const DRUM = { cost: 0 };
const OATH = { charges: 2 };
const STORM = { onslaught: 6, energy: 1, draw: 2 };
const ELDER = { cap: 15 };
const PLAGUE = { pct: 50 };
const PROPHET = { depth: 3 };
const PARADOX = { delay: 2 };
const FRACTURE = { per_stack: 2 };
const CONTRACT = { energy: 1, lean_rewards: 999 }; // lean_rewards: effectively the rest of the run
const STASIS = { energy: 1, draw: 1 };
const LANTERN = { energy: 1, guard: 10 };
const PLATING = { energy: 1, extra: 1 };
const FIXED = { energy: 1, strain: 2 }; // Phase D (RULINGS 68): no beat suppression; off-beat turn ends Strain
const WILD = { bloom: 1 };
const RACK = { pct: 25 };
const NURSERY = { bloom: 2 };
const CLAMP = { pct: 25 };
const PEBBLE = { combats: 3 };
const TOOTH = { stagger: 2 };
const CROWN = { turns: 3, shards: 1 };

// Shared v2 (docs/v2/shared-design.md §3)
const RIVETS_V2 = { pct: 50 };
const DRESSING_V2 = { pct: 50 };
const VEIL_V2 = { draw: 1 };
const LOOM_V2 = { draw: 1, turns: 2 }; // Phase C: draw 2 -> 1 (v1 cf +21.8). Phase D capped it at 3 Scraps a combat (turtle stalemate)
// Phase E (all §13.3): Scrapping only real cards, uncapped, still +23-28 **; odd-turn draw + that Scrap +23.9 ** at Heroic.
// The Scrap thinned the deck (a bonus), so it is gone. Odd-turn draw alone: +15.0 ±9.1 ** (Graft +26.7), so the extra card now
// comes on the first {turns} turns of each combat only.
const PRISM_V2 = { min: 5, energy: 1 };
const HOURGLASS_V2 = { energy: 1, delay: 1 };
// Phase C (v2-baseline): trap reworks and no-effect relics given teeth.
const CORE_V2 = { energy: 1, exposed: 1, free: 1 }; // Phase D: the first card left is free (v2 cf -10.4, Chronist -23)
const LOUPE_V2 = { cost: 1 };
const CRUCIBLE = { shards: 1 }; // Phase D: +1 Shard per skipped card reward (v2 cf -8.1 ** with the Rest Shard + Transmute side action)
const RACK_V2 = { potions: 1 };
const OATH_V2 = { capacity: 1 };
const METRONOME_V2 = { from: 3, to: 2 };
const TRIAGE = { keep: 2 };
const COMPACT = { energy: 1 };
const MANTLE = { energy: 1 };
const ANTENNA = { draw: 1 };
const SLAG = { draw: 1 };
const REFRAIN_BEAT = 2; // Phase E: the doubled beat is the 2nd of the turn (the text says "second"; tests pin both)
const LANTERN_GOAD = { block: 3 }; // Phase D: Goad -> Block (v2 cf -12.6: more Goad only raised the damage you take)
const WHETSTONE = { exposed: 1 };
const STATIC_CHOIR = { damage: 3 };
const ASH_WICK = { nth: 3, energy: 1 };
const BLOOD_RIVETS = { mult: 2 };
const BLOOD_MULCH = { bloom: 1 };
const SICKLE = { pct: 50 };
const ASTROLABE = { batch: 3, energy: 1 };
const ORBITAL = { cost: 3 };
const RECOIL = { energy: 1 };
const BATON = { beats: 1 };
/** Festering Lens: read by the Rot status (src/content/statuses.ts) at each enemy Rot tick. */
export const FESTERING_LENS = { per: 1 };
/** The real classes, for Wanderer's Compact (yours first). */
const REAL_CLASS_IDS = ['breaker', 'graft', 'chronist'] as const;

// Wayfinder Needle: rows 1-7 are the rows between the all-monster first row and the Treasure row.
const WAYFINDER_ROWS = { first: 1, last: 7 };

// combat.counters keys
const K = {
  heartseedFetched: 'heartseed:fetched',
  lensTurn: 'chrono_lens:turn',
  beadUsed: 'sandglass_bead:used',
  stormTurn: 'stormbreak_gem:turn',
  boughUsed: 'hollow_bough:used',
  plagueBusy: 'plague_bloom:busy',
  paradoxTurn: 'paradox_coil:turn',
  toothDone: 'engine_tooth:done',
  toothActive: 'engine_tooth:active',
  // Shared v2
  veilTurn: 'seers_veil:turn',
  slagTurn: 'slag_bucket:turn',
  whetBusy: 'whetstone:busy',
  ashTurn: 'ash_wick:turn',
  ashCount: 'ash_wick:count',
  mulchTurn: 'blood_mulch:turn',
  huskTurn: 'husk_sac:turn',
  astroTurn: 'astrolabe:turn',
  echoTurn: 'echo_bell:turn',
  echoUid: 'echo_bell:uid',
  refrainTurn: 'refrain_pin:turn',
  refrainUid: 'refrain_pin:uid',
  undertowDone: 'undertow_reliquary:done',
  overtureFetched: 'overture_engine:fetched',
} as const;
const paradoxTarget = (uid: number): string => `paradox_coil:target:${uid}`;
const paradoxX = (uid: number): string => `paradox_coil:x:${uid}`;
const paradoxReturned = (uid: number): string => `paradox_coil:returned:${uid}`;
/** Chronist v2 Schedule: 1 when the entry was a Scheduled (non-Delay) card, so it returns as one. */
const paradoxScheduled = (uid: number): string => `paradox_coil:scheduled:${uid}`;
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
  const pile = [combat.discard, combat.exhaust, combat.draw].find((p) => p.some((x) => x.uid === uid)) ?? null;
  // Expected outcome, not a bug: an effect of the resolving card (or a reshuffle) already moved it to hand or into play.
  if (!pile) {
    c.emit({ t: 'text', text: 'Paradox Coil: the card moved on' });
    return;
  }
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
  const entry: TimelineEntry = { card, dueTurn, seq, onBeat: false, target, x, advancedThisTurn: false };
  if (combat.counters[paradoxScheduled(uid)] === 1) entry.scheduled = true;
  combat.timeline.push(entry);
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
    triggers: { onRiposteTriggered: [{ type: 'status', target: 'self', id: 'onslaught', amount: 1 }, { type: 'guard', amount: 2 }] },
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
    // Shared v2 rework: overblocking banks (H9, after the Guard halving so the new Guard isn't halved).
    id: 'bulwark_rivets', name: 'Bulwark Rivets', rarity: 'common', values: RIVETS_V2,
    text: 'At the start of your turn, gain Guard equal to {pct}% of the Block you lose (round down).',
    hooks: {
      onBlockReset: (c, info) => {
        const n = Math.floor((info.lost * RIVETS_V2.pct) / 100);
        if (n > 0) fire(c, [{ type: 'guard', amount: n }]);
      },
    },
    icon: 'relic_bulwark_rivets', tags: ['guard', 'block'],
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
    // Shared v2 rework: the Redline (Strain) common.
    id: 'field_dressing', name: 'Field Dressing', rarity: 'common', values: DRESSING_V2,
    text: 'After you win a combat, heal {pct}% of the HP you Strained in it (round up).',
    hooks: {
      onCombatEnd: (c, info) => {
        const strained = combatOf(c, 'field_dressing').counters.strained ?? 0; // nothing Strained this combat = 0
        const n = Math.ceil((strained * DRESSING_V2.pct) / 100);
        if (info.won && n > 0) fire(c, [{ type: 'heal', amount: n }]);
      },
    },
    icon: 'relic_field_dressing', tags: ['heal', 'strain'],
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
  // --- Shared v2 (docs/v2/shared-design.md §3.3)
  {
    id: 'spare_fuse', name: 'Spare Fuse', rarity: 'common',
    text: 'At the start of each combat, add a Fuse to your hand.',
    triggers: { onCombatStart: [{ type: 'add_card', card: 'fuse', to: 'hand' }] },
    icon: 'relic_spare_fuse', tags: ['salvage', 'scrap', 'engine:scrapheap', 'role:enabler'],
  },
  {
    id: 'antenna_wire', name: 'Antenna Wire', rarity: 'common', values: ANTENNA,
    text: 'Whenever you play a Power, draw {draw} card.',
    hooks: {
      onCardPlayed: (c, info) => {
        if (info.def.type === 'power') fire(c, [{ type: 'draw', n: ANTENNA.draw }]);
      },
    },
    icon: 'relic_antenna_wire', tags: ['power', 'draw'],
  },
  {
    id: 'slag_bucket', name: 'Slag Bucket', rarity: 'common', cls: 'breaker', values: SLAG,
    text: 'The first time you Shed Guard each turn, draw {draw} card.',
    hooks: {
      onGuardShed: (c) => {
        if (firstThisTurn(combatOf(c, 'slag_bucket'), K.slagTurn)) fire(c, [{ type: 'draw', n: SLAG.draw }]);
      },
    },
    icon: 'relic_slag_bucket', tags: ['shed', 'guard', 'draw'],
  },
  {
    // Phase D: Goad insurance instead of more Goad (v2 cf -12.6; extra Goad only raised the damage you take).
    id: 'storm_lantern', name: 'Storm Lantern', rarity: 'common', cls: 'chronist', values: LANTERN_GOAD,
    text: 'Whenever you apply Goad to an enemy, gain {block} Block.',
    hooks: {
      onStatusInflicted: (c, info) => {
        if (info.id === 'goaded') fire(c, [{ type: 'block', amount: LANTERN_GOAD.block }]);
      },
    },
    icon: 'relic_storm_lantern', tags: ['goad'],
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
    triggers: { onCombatStart: [{ type: 'status', target: 'self', id: 'onslaught_keep', amount: 1 }] },
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
    // Phase C teeth (no measurable effect in v1): Guard to bank on from turn 1, for every class.
    // Phase E: the Phase C combat-start Guard is gone (final cf +18.3 ±8 ** with 3 Guard); the slow decay is the relic.
    id: 'slow_temper', name: 'Slow-Temper Alloy', rarity: 'uncommon', values: TEMPER,
    text: 'At the start of your turn, your Guard loses a third (round down) instead of half.',
    hooks: { guardDecay: (_c, guard) => Math.floor(guard / TEMPER.divisor) },
    icon: 'relic_slow_temper', tags: ['guard'],
  },
  {
    // Phase C: merged with Crystal Spine (both had no measurable effect in v1).
    id: 'shard_lens', name: 'Shard Loupe', rarity: 'uncommon', values: LOUPE_V2,
    text: 'Purge costs only {cost} Shard. Your first Transmute at a Rest site each act costs no Shards.',
    hooks: {
      restOptionCost: (c, id, shards) => {
        if (id === 'rest_purge') return Math.min(shards, LOUPE_V2.cost);
        if (id === 'rest_transmute' && relicDataOrUndefined(relicOf(c, 'shard_lens'), 'act') !== c.state.act) return 0;
        return shards;
      },
      onRest: (c, info) => {
        if (info.action !== 'rest_transmute') return;
        const relic = relicOf(c, 'shard_lens');
        if (relicDataOrUndefined(relic, 'act') === c.state.act) return;
        relic.data = { ...(relic.data ?? {}), act: c.state.act };
        c.flash();
      },
    },
    icon: 'relic_shard_lens', tags: ['shards', 'transmute'],
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
    // Shared v2 rework (chronist-design §9): Goad, the Storm engine's risk lever, becomes a cantrip.
    id: 'seers_veil', name: "Seer's Veil", rarity: 'uncommon', cls: 'chronist', values: VEIL_V2,
    text: 'The first time you apply Goad each turn, draw {draw} card.',
    hooks: {
      onStatusInflicted: (c, info) => {
        if (info.id !== 'goaded' || !firstThisTurn(combatOf(c, 'seers_veil'), K.veilTurn)) return;
        fire(c, [{ type: 'draw', n: VEIL_V2.draw }]);
      },
    },
    icon: 'relic_seers_veil', tags: ['goad', 'draw'],
  },
  // --- Shared v2 (docs/v2/shared-design.md §3.4)
  {
    id: 'scar_engine', name: 'Scar Engine', rarity: 'uncommon',
    text: 'Whenever you Strain, apply {status} Exposed to ALL enemies.',
    triggers: { onStrain: [{ type: 'status', target: 'all_enemies', id: 'exposed', amount: 1 }] },
    icon: 'relic_scar_engine', tags: ['strain', 'exposed', 'engine:redline', 'role:payoff'],
  },
  {
    id: 'static_choir', name: 'Static Choir', rarity: 'uncommon', values: STATIC_CHOIR,
    text: 'Whenever a Status card is Scrapped, deal {damage} damage to ALL enemies.',
    hooks: {
      onCardExhausted: (c, info) => {
        if (getCardDef(info.card.id, info.card.upgraded).type !== 'status') return;
        if (!combatOf(c, 'static_choir').enemies.some((e) => e.alive)) return;
        fire(c, [{ type: 'damage', amount: STATIC_CHOIR.damage, target: 'all_enemies' }]);
      },
    },
    icon: 'relic_static_choir', tags: ['status', 'aoe', 'scrap'],
  },
  {
    id: 'whetstone', name: 'Whetstone', rarity: 'uncommon', values: WHETSTONE,
    text: 'Whenever you apply Exposed to an enemy, apply {exposed} more.',
    hooks: {
      onStatusInflicted: (c, info) => {
        const combat = combatOf(c, 'whetstone');
        if (info.id !== 'exposed' || combat.counters[K.whetBusy] === 1) return;
        c.flash();
        combat.counters[K.whetBusy] = 1;
        c.now([{ type: 'status', target: 'target', id: 'exposed', amount: WHETSTONE.exposed }], { target: info.target });
        delete combat.counters[K.whetBusy];
      },
    },
    icon: 'relic_whetstone', tags: ['exposed'],
  },
  {
    // A third Scrap at the turn's end (Triage Locker, Gravity Loom) pays next turn (RULINGS 63).
    id: 'ash_wick', name: 'Ash Wick', rarity: 'uncommon', values: ASH_WICK,
    text: 'The {nth}rd time a card is Scrapped in a turn, gain {energy} energy.',
    hooks: {
      onCardExhausted: (c) => {
        const combat = combatOf(c, 'ash_wick');
        if (bumpThisTurn(combat, K.ashTurn, K.ashCount) !== ASH_WICK.nth) return;
        fire(c, [{ type: 'energy', n: ASH_WICK.energy, ...(combat.counters.turnEnding === 1 ? { nextTurn: true } : {}) }]);
      },
    },
    icon: 'relic_ash_wick', tags: ['scrap', 'energy', 'engine:scrapheap', 'role:payoff'],
  },
  {
    id: 'overture_engine', name: 'Overture Engine', rarity: 'uncommon',
    text: 'At the start of each combat, put the highest-cost Power in your draw pile into your hand (ties: random). It costs {fetch_cost} this turn and counts toward your opening hand.',
    values: { fetch_cost: 0 },
    triggers: { onCombatStart: [{ type: 'fetch_card', from: 'draw', select: 'max_cost', to: 'hand', filter: { type: 'power' }, costThisTurn: 0, countsAsDraw: true }] },
    hooks: {
      onCombatStart: (c) => {
        const combat = combatOf(c, 'overture_engine');
        if (combat.draw.some((x) => getCardDef(x.id, x.upgraded).type === 'power')) markCombat(combat, K.overtureFetched);
      },
      drawPerTurn: (c, n) => (c.combat !== null && c.combat.turn === 1 && usedThisCombat(c.combat, K.overtureFetched) ? n - 1 : n),
    },
    icon: 'relic_overture_engine', tags: ['power', 'consistency'],
  },
  {
    id: 'blood_rivets', name: 'Blood Rivets', rarity: 'uncommon', cls: 'breaker', values: BLOOD_RIVETS,
    text: 'Whenever you Strain, gain Guard equal to {mult} times the HP you lost.',
    hooks: { onStrain: (c, info) => fire(c, [{ type: 'guard', amount: info.amount * BLOOD_RIVETS.mult }]) },
    icon: 'relic_blood_rivets', tags: ['strain', 'guard', 'engine:redline', 'role:bridge'],
  },
  {
    id: 'blood_mulch', name: 'Blood Mulch', rarity: 'uncommon', cls: 'graft', values: BLOOD_MULCH,
    text: 'The first time you Strain each turn, a random Bloom card in your hand, draw pile or discard pile gains {bloom} Bloom.',
    hooks: {
      onStrain: (c) => {
        if (firstThisTurn(combatOf(c, 'blood_mulch'), K.mulchTurn)) fire(c, [{ type: 'bloom', amount: BLOOD_MULCH.bloom, target: 'random_bloom_in_piles' }]);
      },
    },
    icon: 'relic_blood_mulch', tags: ['strain', 'bloom', 'engine:redline', 'role:bridge'],
  },
  {
    id: 'borrowed_time', name: 'Borrowed Time', rarity: 'uncommon', cls: 'chronist',
    text: 'Whenever you Strain, Advance {advance}.',
    triggers: { onStrain: [{ type: 'advance', n: 1 }] },
    icon: 'relic_borrowed_time', tags: ['strain', 'advance', 'engine:redline', 'role:bridge'],
  },
  {
    id: 'coal_scuttle', name: 'Coal Scuttle', rarity: 'uncommon', cls: 'breaker',
    text: 'At the start of each combat, gain {status} Ember.',
    triggers: { onCombatStart: [{ type: 'status', target: 'self', id: 'embers', amount: 1 }] },
    icon: 'relic_coal_scuttle', tags: ['embers', 'onslaught'],
  },
  {
    id: 'husk_sac', name: 'Husk Sac', rarity: 'uncommon', cls: 'graft',
    text: 'The first time you Prune each turn, add a Chaff to your hand.',
    hooks: {
      onPrune: (c) => {
        if (firstThisTurn(combatOf(c, 'husk_sac'), K.huskTurn)) fire(c, [{ type: 'add_card', card: 'chaff', to: 'hand' }]);
      },
    },
    icon: 'relic_husk_sac', tags: ['prune', 'chaff', 'status'],
  },
  {
    id: 'reapers_sickle', name: "Reaper's Sickle", rarity: 'uncommon', cls: 'graft', values: SICKLE,
    text: 'Whenever you Harvest, gain Block equal to {pct}% of the HP the enemy lost (round down).',
    hooks: {
      onHarvest: (c, info) => {
        const n = Math.floor((info.hpLost * SICKLE.pct) / 100);
        if (n > 0) fire(c, [{ type: 'block', amount: n }]);
      },
    },
    icon: 'relic_reapers_sickle', tags: ['harvest', 'rot', 'block'],
  },
  {
    id: 'astrolabe', name: 'Astrolabe', rarity: 'uncommon', cls: 'chronist', values: ASTROLABE,
    text: 'The first time each turn {batch} or more cards resolve together from your Timeline, gain {energy} energy.',
    hooks: {
      onDelayResolved: (c, info) => {
        if (info.batch < ASTROLABE.batch || !firstThisTurn(combatOf(c, 'astrolabe'), K.astroTurn)) return;
        fire(c, [{ type: 'energy', n: ASTROLABE.energy }]);
      },
    },
    icon: 'relic_astrolabe', tags: ['timeline', 'chorus', 'energy'],
  },
];

const RARE: RelicDef[] = [
  {
    // Phase C teeth: also +1 prime capacity (v1 had no measurable effect: one primed card rarely meets two attacks).
    id: 'duelists_oath', name: "Duelist's Oath", rarity: 'rare', cls: 'breaker', values: OATH,
    text: 'You can prime {status} additional Riposte card. Each primed card can trigger its Riposte {charges} times (on different enemy attacks) before it is discarded.',
    triggers: { onCombatStart: [{ type: 'status', target: 'self', id: 'riposte_capacity', amount: OATH_V2.capacity }] },
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
    // Phase C teeth: a 12th card was almost never reached (no measurable effect); the first beat now comes sooner.
    id: 'metronome_heart', name: 'Metronome Heart', rarity: 'rare', cls: 'chronist', values: METRONOME_V2,
    text: 'Your first beat each turn comes sooner: the {to}nd card you play is on the beat instead of the {from}rd.',
    hooks: { beatPositions: (_c, positions) => positions.map((p) => (p === METRONOME_V2.from ? METRONOME_V2.to : p)) },
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
        combat.counters[paradoxScheduled(info.entry.card.uid)] = info.entry.scheduled === true ? 1 : 0;
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
    // Phase C teeth: Rest also mints a Shard, so the relic pays even if you never Purge.
    id: 'shard_crucible', name: 'Shard Crucible', rarity: 'rare', values: CRUCIBLE,
    // Phase D: Purge only (a side-action Transmute is a coin flip on deck quality) and Shards from skipping.
    text: 'At Rest sites, Purge no longer uses up your rest action (once per visit; Shards still paid). Each card reward you skip gives {shards} more Shard.',
    hooks: {
      restSideAction: (_c, id) => id === 'rest_purge',
      skipShards: (_c, n) => n + CRUCIBLE.shards,
    },
    icon: 'relic_shard_crucible', tags: ['shards', 'rest'],
  },
  {
    // Phase C teeth: brings its own Exposed (v1 had no measurable effect without Exposed sources).
    // Phase E: the Phase C arrival Exposed is gone (final cf +12.8 ±9 ** with 1); v2 has Exposed sources of its own.
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
  // --- Shared v2 (docs/v2/shared-design.md §3.5)
  {
    id: 'reserve_coil', name: 'Reserve Coil', rarity: 'rare',
    text: 'At the end of your turn, your unspent energy goes into Reserve.',
    hooks: {
      onTurnEnd: (c) => {
        const left = combatOf(c, 'reserve_coil').energy;
        if (left > 0) fire(c, [{ type: 'status', target: 'self', id: 'reserve', amount: left }]);
      },
    },
    icon: 'relic_reserve_coil', tags: ['reserve', 'x_cost', 'engine:overflow', 'role:multiplier'],
  },
  {
    // onCardPlayed (before the Reprise check) marks the play; grantsReprise only reads the mark.
    id: 'echo_bell', name: 'Echo Bell', rarity: 'rare',
    text: 'The first time each turn you play the last card in your hand, it has Reprise.',
    hooks: {
      onCardPlayed: (c, info) => {
        const combat = combatOf(c, 'echo_bell');
        if (info.depth !== 0 || combat.hand.length > 0 || !firstThisTurn(combat, K.echoTurn)) return;
        combat.counters[K.echoUid] = info.card.uid;
        c.flash();
      },
      grantsReprise: (c, info) => c.combat !== null && c.combat.counters[K.echoUid] === info.card.uid && c.combat.counters[K.echoTurn] === c.combat.turn,
    },
    icon: 'relic_echo_bell', tags: ['reprise', 'engine:reprise', 'role:multiplier'],
  },
  {
    id: 'undertow_reliquary', name: 'Undertow Reliquary', rarity: 'rare',
    text: 'The first time each combat you shuffle your discard pile into your draw pile, shuffle your Scrapheap in too.',
    hooks: {
      onShuffle: (c) => {
        const combat = combatOf(c, 'undertow_reliquary');
        if (usedThisCombat(combat, K.undertowDone) || combat.exhaust.length === 0) return;
        markCombat(combat, K.undertowDone);
        const back = combat.exhaust.splice(0, combat.exhaust.length);
        combat.draw.unshift(...c.rng.shuffle('shuffle', back));
        c.flash();
        c.emit({ t: 'shuffle' });
      },
    },
    icon: 'relic_undertow_reliquary', tags: ['scrap', 'salvage', 'engine:scrapheap', 'role:multiplier'],
  },
  {
    id: 'kickback_governor', name: 'Kickback Governor', rarity: 'rare',
    text: "Whenever Stagger reduces an enemy's hit on you, deal the damage it prevented to that enemy.",
    hooks: {
      onDamageTaken: (c, info) => {
        if (typeof info.source !== 'number' || info.staggerPrevented <= 0) return;
        fire(c, [{ type: 'damage', amount: info.staggerPrevented, target: 'target', tags: ['kickback'] }], info.source);
      },
    },
    icon: 'relic_kickback_governor', tags: ['stagger', 'damage'],
  },
  {
    id: 'orbital_hammer', name: 'Orbital Hammer', rarity: 'rare', values: ORBITAL,
    text: 'Whenever you play a card that costs {cost} or more (X-cost cards: X of {cost} or more), it has Reprise.',
    hooks: { grantsReprise: (_c, info) => (info.def.cost === 'X' ? info.x >= ORBITAL.cost : info.costPaid >= ORBITAL.cost) },
    icon: 'relic_orbital_hammer', tags: ['reprise', 'x_cost', 'high_cost', 'engine:reprise', 'role:multiplier'],
  },
  {
    id: 'momentum_flywheel', name: 'Momentum Flywheel', rarity: 'rare', cls: 'breaker',
    text: 'Each X-cost Attack you play gives Onslaught equal to its X.',
    hooks: {
      afterCardPlayed: (c, info) => {
        if (info.def.type !== 'attack' || info.def.cost !== 'X' || info.x <= 1) return;
        fire(c, [{ type: 'status', target: 'self', id: 'onslaught', amount: info.x - 1 }]);
      },
    },
    icon: 'relic_momentum_flywheel', tags: ['onslaught', 'x_cost', 'engine:overflow', 'role:bridge'],
  },
  {
    // Phase D: Reprise of the whole card -> its on-beat effects run twice (v2 cf +24.1 **, 89 triggers a run).
    id: 'refrain_pin', name: 'Refrain Pin', rarity: 'rare', cls: 'chronist',
    // Phase E: the second beat (6 plays), not the first (final cf +21.0 ±16 ** on the first beat).
    text: 'The on-beat effects of the card on your second beat each turn trigger twice.',
    hooks: {
      onCardPlayed: (c, info) => {
        if (!info.onBeat) return;
        const combat = combatOf(c, 'refrain_pin');
        // This play is already counted: its beat count is the next play's count minus 1.
        const beat = c.nextBeat();
        if (beat.positions.indexOf(beat.count - 1) + 1 !== REFRAIN_BEAT) return;
        if (!firstThisTurn(combat, K.refrainTurn)) return;
        combat.counters[K.refrainUid] = info.card.uid;
        c.flash();
      },
      onBeatRepeats: (c, card, repeats) =>
        card !== null && c.combat !== null && c.combat.counters[K.refrainUid] === card.uid && c.combat.counters[K.refrainTurn] === c.combat.turn ? repeats + 1 : repeats,
    },
    icon: 'relic_refrain_pin', tags: ['cadence', 'on_beat'],
  },
  {
    id: 'twin_scabbard', name: 'Twin Scabbard', rarity: 'rare', cls: 'breaker',
    // Phase D (Breaker designer): once per turn, into the draw pile. v2 cf +19 ** at 88 triggers a run, and once per turn into
    // the hand still left holders +26 over the class rate (300 canonical runs): the deck, not the relic, should carry Counter.
    text: 'The first time a primed card fires each turn, shuffle a random Riposte card from your class into your draw pile. It is gone after combat.',
    hooks: {
      onRiposteTriggered: (c) => {
        const combat = c.combat;
        if (!combat) throw new Error('twin_scabbard outside combat');
        if (firstThisTurn(combat, 'twin_scabbard')) fire(c, [{ type: 'add_random_card', pool: 'class', filter: { riposte: true }, to: 'draw' }]);
      },
    },
    icon: 'relic_twin_scabbard', tags: ['riposte', 'generation'],
  },
  {
    id: 'recoil_coil', name: 'Recoil Coil', rarity: 'rare', values: RECOIL,
    text: "Whenever an enemy's attack is cancelled or it skips a move, gain {energy} energy next turn.",
    hooks: {
      onAttackCancelled: (c) => fire(c, [{ type: 'energy', n: RECOIL.energy, nextTurn: true }]),
      onMoveSkipped: (c) => fire(c, [{ type: 'energy', n: RECOIL.energy, nextTurn: true }]),
    },
    icon: 'relic_recoil_coil', tags: ['riposte', 'halt', 'energy'],
  },
  {
    id: 'trellis', name: 'Trellis', rarity: 'rare', cls: 'graft',
    text: 'At the start of your turn, put a Ripe card from your discard pile into your hand.',
    triggers: { onTurnStart: [{ type: 'fetch_card', from: 'discard', select: 'random', to: 'hand', filter: { ripe: true } }] },
    icon: 'relic_trellis', tags: ['ripe', 'bloom'],
  },
  {
    // The Rot status (src/content/statuses.ts) reads this relic at each enemy Rot tick.
    id: 'festering_lens', name: 'Festering Lens', rarity: 'rare', cls: 'graft', values: FESTERING_LENS,
    text: "When an enemy's Rot ticks, it loses {per} more HP for each Exposed it has.",
    icon: 'relic_festering_lens', tags: ['rot', 'exposed'],
  },
  {
    id: 'conductors_baton', name: "Conductor's Baton", rarity: 'rare', cls: 'chronist', values: BATON,
    text: 'Your Crescendo effects count {beats} more beat.',
    hooks: { beatIndexBonus: () => BATON.beats },
    icon: 'relic_conductors_baton', tags: ['cadence', 'crescendo'],
  },
];

const BOSS: RelicDef[] = [
  {
    id: 'binding_contract', name: 'Binding Contract', rarity: 'boss', values: CONTRACT,
    text: '+{energy} energy each turn. Card rewards offer one card fewer, and you must take a card from every one (no skipping, no Shards from skipping).',
    triggers: { onPickup: [{ type: 'run_flag', key: 'lean_rewards', delta: CONTRACT.lean_rewards }] },
    hooks: { maxEnergy: (_c, e) => e + CONTRACT.energy, canSkipCardReward: () => false },
    icon: 'relic_binding_contract', tags: ['energy', 'shards'],
  },
  {
    // Shared v2 rework (H7): the lead card of every turn waits a turn on the Timeline.
    id: 'cracked_hourglass', name: 'Cracked Hourglass', rarity: 'boss', values: HOURGLASS_V2,
    // Phase C: Attacks only (v1 "enemies act first" was -33.8; delaying defence would keep the trap).
    text: '+{energy} energy each turn. The first Attack you play each turn gets Delay {delay}: its effects happen at the start of your next turn.',
    hooks: {
      maxEnergy: (_c, e) => e + HOURGLASS_V2.energy,
      delayPlay: (c, info) => (info.def.type === 'attack' && c.combat !== null && c.combat.attacksPlayedThisTurn === 0 ? HOURGLASS_V2.delay : 0),
    },
    icon: 'relic_cracked_hourglass', tags: ['energy', 'delay', 'timeline'],
  },
  {
    // Phase C rework (v1 "start each combat with 4 Exposed" was -23.8): the cost now falls on holding cards,
    // so spending your hand (greed) is safe and hoarding (turtle) pays. Exposed decays at your turn end,
    // so N cards left means N - 1 Exposed through the enemy turn.
    // Phase D: not offered to the Chronist, whose cheap-draw decks always hold cards (v2 cf -23, Phase D batch -20.8 ±21).
    id: 'exposed_core', name: 'Exposed Core', rarity: 'boss', excludeClasses: ['chronist'], values: CORE_V2,
    text: '+{energy} energy each turn. At the end of your turn, gain {exposed} Exposed for each card left in your hand after the first (not Keep cards).',
    hooks: {
      maxEnergy: (_c, e) => e + CORE_V2.energy,
      onHandEndOfTurn: (c) => {
        const n = combatOf(c, 'exposed_core').hand.filter((x) => !hasEngineKeyword(x, 'retain')).length - CORE_V2.free;
        if (n > 0) fire(c, [{ type: 'status', target: 'self', id: 'exposed', amount: n * CORE_V2.exposed }]);
      },
    },
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
    // Phase D (RULINGS 68): v2 "only the 3rd card is on the beat" switched Crescendo off (johnny-clockwork cf
    // -17.5). It keeps its identity, a fixed turn shape, by taxing turns that don't end on a beat instead.
    id: 'fixed_star', name: 'Fixed Star', rarity: 'boss', cls: 'chronist', values: FIXED,
    text: "+{energy} energy each turn. At the end of your turn, if your beat count isn't on a beat, Strain {strain}.",
    hooks: {
      maxEnergy: (_c, e) => e + FIXED.energy,
      onTurnEnd: (c) => {
        const beat = c.nextBeat();
        if (!beat.positions.includes(beat.count - 1)) fire(c, [{ type: 'strain', amount: FIXED.strain }]);
      },
    },
    icon: 'relic_fixed_star', tags: ['energy', 'cadence'],
  },
  {
    // Phase C: +1 energy added (v1 -20.0: losing Riposte outweighed the carry-over). keepStatus is a max over
    // sources, so Kept Fury still applies (RULINGS 37).
    id: 'heavy_heart', name: 'Heavy Heart', rarity: 'boss', cls: 'breaker',
    // Phase D: the drawback moves from Riposte (Counter, the Breaker's best engine) to Guard (Bastion, its stall
    // engine), and the Phase C +1 energy goes (with it the batch measured +24 ±15; v2 cf -14.5 with "can't prime").
    text: 'Your Onslaught halves (round down) at the end of your turn instead of resetting. Your Guard is lost at the start of your turn instead of halving.',
    hooks: { keepStatus: (_c, id, stacks) => (id === 'onslaught' ? Math.floor(stacks / 2) : 0), guardDecay: (_c, guard) => guard },
    icon: 'relic_heavy_heart', tags: ['onslaught', 'guard'],
  },
  {
    id: 'wild_growth', name: 'Wild Growth', rarity: 'boss', cls: 'graft', values: WILD,
    text: 'Prune grants {bloom} additional Bloom. At the start of each combat, shuffle {add_card} Tangles into your draw pile.',
    triggers: { onCombatStart: [{ type: 'add_card', card: 'status_tangle', to: 'draw', n: 2 }] },
    hooks: { modifyPruneBloom: (_c, amount) => amount + WILD.bloom },
    icon: 'relic_wild_growth', tags: ['prune', 'bloom', 'status'],
  },
  {
    // Shared v2 rework: Shards become energy; you hoard them instead of Purging (H13).
    id: 'ascendant_prism', name: 'Ascendant Prism', rarity: 'boss', values: PRISM_V2,
    text: "While you hold {min} or more Shards, you have +{energy} energy each turn. You can't Purge or Transmute at Rest sites.",
    hooks: {
      maxEnergy: (c, e) => (shardsHeld(c.state) >= PRISM_V2.min ? e + PRISM_V2.energy : e),
      restOptionBlocked: (_c, id) => (id === 'rest_purge' || id === 'rest_transmute' ? 'Ascendant Prism forbids it.' : null),
    },
    icon: 'relic_ascendant_prism', tags: ['shards', 'energy', 'rest'],
  },
  {
    // Shared v2 rework (H6) was "big hands, but an unplayed card may be gone for the fight". Phase E: the end-of-turn
    // Scrap is gone. It took the weakest card left in hand, so it thinned the combat deck: a bonus, not a cost (§13.3).
    id: 'gravity_loom', name: 'Gravity Loom', rarity: 'boss', values: LOOM_V2,
    text: 'On each of the first {turns} turns of each combat, draw {draw} more card.',
    hooks: {
      drawPerTurn: (c, n) => (combatOf(c, 'gravity_loom').turn <= LOOM_V2.turns ? n + LOOM_V2.draw : n),
    },
    icon: 'relic_gravity_loom', tags: ['draw'],
  },
  // --- Shared v2 (docs/v2/shared-design.md §3.6)
  {
    id: 'triage_locker', name: 'Triage Locker', rarity: 'boss',
    text: 'At the end of your turn, choose up to {triage} cards in your hand to keep. Scrap the rest of your hand.',
    triggers: { onHandEndOfTurn: [{ type: 'triage', keep: TRIAGE.keep }] },
    icon: 'relic_triage_locker', tags: ['keep', 'scrap_flood', 'salvage'],
  },
  {
    id: 'wanderers_compact', name: "Wanderer's Compact", rarity: 'boss', values: COMPACT,
    text: '+{energy} energy each turn. Card rewards offer one card from each class instead of cards from yours.',
    hooks: {
      maxEnergy: (_c, e) => e + COMPACT.energy,
      // Your class first, then the other listed real classes (a test or dev class only counts when it is yours).
      cardRewardClasses: (c) => [c.state.classId, ...allClasses().map((x) => x.id).filter((id) => id !== c.state.classId && REAL_CLASS_IDS.some((r) => r === id))],
    },
    icon: 'relic_wanderers_compact', tags: ['energy', 'rewards', 'cross_class'],
  },
  {
    // Guard never halves (guardDecay 0); at your turn start it is all Shed (Breaker v2 Shed hooks fire).
    id: 'furnace_mantle', name: 'Furnace Mantle', rarity: 'boss', cls: 'breaker', values: MANTLE,
    text: '+{energy} energy each turn. At the start of your turn, Shed all your Guard instead of halving it.',
    triggers: { onTurnStart: [{ type: 'shed', n: 'all', effects: [] }] },
    hooks: { maxEnergy: (_c, e) => e + MANTLE.energy, guardDecay: () => 0 },
    icon: 'relic_furnace_mantle', tags: ['energy', 'shed', 'guard'],
  },
  {
    // Phase D: the +1 energy is gone (v2 cf +27.4 **); the recycling is the relic.
    id: 'perpetual_calendar', name: 'Perpetual Calendar', rarity: 'boss', cls: 'chronist',
    text: 'Cards that resolve from your Timeline go to the bottom of your draw pile instead of your discard pile.',
    hooks: { timelineDestination: () => 'draw_bottom' },
    icon: 'relic_perpetual_calendar', tags: ['timeline'],
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
    // Phase C teeth: a potion each act, so the slot fills (v1 had no measurable effect).
    id: 'vial_rack', name: 'Vial Rack', rarity: 'shop', values: { ...RACK, ...RACK_V2 },
    text: '+{potion_slots} potion slot. Potions in shops cost {pct}% less. At the start of each act, gain a random potion.',
    triggers: { onPickup: [{ type: 'potion_slots', n: 1 }], onActStart: [{ type: 'gain_potion' }] },
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
  // --- Shared v2 (docs/v2/shared-design.md §3.7)
  {
    id: 'salvagers_licence', name: "Salvager's Licence", rarity: 'shop',
    text: 'After you win an elite combat, the card reward also offers a colourless card.',
    hooks: { extraColorlessOffer: (_c, kind) => kind === 'elite' },
    icon: 'relic_salvagers_licence', tags: ['rewards', 'colorless'],
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
];
