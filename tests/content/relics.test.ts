import '../testpack';
// The 72 relics of GDD §5 (src/content/relics.ts). Every relic: text renders, every hook it declares
// fires in a scripted sandbox tour (combat + reward + shop + rest + act start + pickup), and most
// relics get a precise behaviour test. Registers no extra packs: the real content (src/content)
// plus the test pack the engine helpers use.
import { describe, expect, it } from 'vitest';
import { getCardDef, getRelicDef, getRestOptionDef, getStatusDef } from '../../src/content';
import { RELICS, RELIC_STATUSES } from '../../src/content/relics';
import {
  Game,
  computeIntent,
  nextBeat,
  renderRelicText,
  renderStatusText,
  restOptionShardCost,
  validateEffects,
  type Action,
  type CardInstance,
  type CombatKind,
  type Effect,
  type EntityRef,
  type GameEvent,
  type RelicDef,
  type RunState,
} from '../../src/engine';
import { makeCard } from '../../src/engine/cards';
import { refreshIntents, startCombat } from '../../src/engine/combat';
import { enqueue, makeEnv, type Env } from '../../src/engine/core';
import { addToDeck } from '../../src/engine/deck';
import { newFloorRecord } from '../../src/engine/history';
import { gainRelic } from '../../src/engine/items';
import { drain } from '../../src/engine/queue';
import { generateReward } from '../../src/engine/run';
import { dispatch } from '../../src/engine/statuses';
import { combatOf, enemyUids, eventsOf, pacify, play, setHand } from '../engine/helpers';

// ---------------------------------------------------------------------------
// Expected roster (GDD §5)

const IDS: Record<RelicDef['rarity'], string[]> = {
  starter: ['riven_gauntlet', 'heartseed', 'chrono_lens'],
  common: [
    'glass_spurs', 'dampener_coil', 'cracked_prism', 'geode_heart', 'bulwark_rivets', 'stim_patch', 'scrap_magnet', 'surveyor_ink', 'field_dressing',
    'tally_stick', 'notched_buckler', 'chain_wraps', 'seed_pouch', 'pollen_sac', 'compost_heap', 'tuning_fork', 'sandglass_bead', 'star_pip',
  ],
  uncommon: [
    'parry_charm', 'kept_fury', 'crowd_breaker', 'concussion_rig', 'slow_temper', 'pocket_star_chart', 'overwatch_drone', 'shard_lens', 'crystal_spine',
    'hairline_saw', 'wayfinder_needle', 'rot_censer', 'grafting_knife', 'heartwood_ring', 'mycelial_net', 'offbeat_drum', 'timeline_spool', 'seers_veil',
  ],
  rare: [
    'duelists_oath', 'stormbreak_gem', 'bastion_core', 'elder_seed', 'hollow_bough', 'plague_bloom', 'metronome_heart', 'prophet_glass', 'paradox_coil',
    'shard_crucible', 'fracture_engine', 'void_compass',
  ],
  boss: [
    'binding_contract', 'cracked_hourglass', 'exposed_core', 'stasis_engine', 'ghost_lantern', 'tender_plating', 'fixed_star', 'heavy_heart', 'wild_growth',
    'ascendant_prism', 'gravity_loom', 'star_atlas',
  ],
  shop: ['shard_writ', 'vial_rack', 'practice_dummy', 'nursery_tray', 'timeline_clamp'],
  event: ['oracle_pebble', 'engine_tooth', 'shard_debt', 'crown_fragment'],
};

const CLASS_LOCKED: Record<string, string[]> = {
  breaker: ['riven_gauntlet', 'notched_buckler', 'chain_wraps', 'parry_charm', 'kept_fury', 'crowd_breaker', 'duelists_oath', 'stormbreak_gem', 'bastion_core', 'heavy_heart', 'practice_dummy'],
  graft: ['heartseed', 'seed_pouch', 'pollen_sac', 'compost_heap', 'rot_censer', 'grafting_knife', 'heartwood_ring', 'mycelial_net', 'elder_seed', 'hollow_bough', 'plague_bloom', 'wild_growth', 'nursery_tray'],
  chronist: ['chrono_lens', 'tuning_fork', 'sandglass_bead', 'star_pip', 'offbeat_drum', 'timeline_spool', 'seers_veil', 'metronome_heart', 'prophet_glass', 'paradox_coil', 'fixed_star', 'timeline_clamp'],
};
const NOT_CHRONIST = ['pocket_star_chart', 'star_atlas', 'oracle_pebble'];

// ---------------------------------------------------------------------------
// Sandbox helpers

const STRIKES = Array.from({ length: 12 }, () => 'test_strike');

/** Run `f` in an engine env on g.state, drain the queue, refresh intents; returns the events. */
function withEnv(g: Game, f: (env: Env) => void): GameEvent[] {
  const env = makeEnv(g.state);
  f(env);
  drain(env);
  refreshIntents(env);
  return env.events;
}

/** Run effects as a neutral system source acting for the player (or `self`). */
function fx(g: Game, effects: Effect[], target: EntityRef | null = null, self: EntityRef = 'player'): GameEvent[] {
  return withEnv(g, (env) => enqueue(env, effects.map((effect) => ({ kind: 'effect' as const, effect, frame: { src: { kind: 'system' as const }, self, target, x: 0 } }))));
}

/** Answer pending choices, preferring a non-empty selection / the first option. */
function settle(g: Game): void {
  for (let i = 0; i < 30; i++) {
    const pc = g.state.phase === 'combat' ? g.state.combat?.pendingChoice : g.state.pendingChoice;
    if (!pc) return;
    const answers = g.legalActions().filter((a): a is Extract<Action, { type: 'resolve_choice' }> => a.type === 'resolve_choice');
    const pick = answers.find((a) => a.uids.length > 0) ?? answers[0];
    if (!pick) throw new Error(`no answer for "${pc.prompt}"`);
    g.apply(pick);
  }
  throw new Error('choices never settled');
}

function pending(g: Game) {
  return g.state.phase === 'combat' ? combatOf(g).pendingChoice : g.state.pendingChoice;
}

/** A run on the map (no pact), 300 HP, a strike deck, the given relics (no onPickup). */
function mapRun(o: { seed?: string; relics?: string[]; deck?: string[]; setup?: (s: RunState) => void } = {}): Game {
  const g = Game.newRun(o.seed ?? 'relic-map', 'test_class');
  const s = g.state;
  s.startChoices = null;
  s.phase = 'map';
  s.player.hp = s.player.maxHp = 300;
  s.player.deck = (o.deck ?? STRIKES).map((id) => makeCard(s, id));
  s.player.relics = (o.relics ?? []).map((id) => ({ id, counter: 0 }));
  if (o.setup) o.setup(s);
  return g;
}

interface ArenaOpts {
  seed?: string;
  relics?: string[];
  deck?: string[];
  encounter?: string;
  kind?: CombatKind;
  setup?: (s: RunState) => void;
}

/** A game in combat (turn 1 drawn) like tests/engine/helpers sandbox, with a pre-combat setup hook. Returns the start events too. */
function arena(o: ArenaOpts = {}): { g: Game; ev: GameEvent[] } {
  const g = mapRun(o);
  const s = g.state;
  const kind = o.kind ?? 'monster';
  enterNode(g, kind === 'event' ? 'event' : kind);
  const ev = withEnv(g, (env) => startCombat(env, { encounterId: o.encounter ?? 'test_enc_slime', kind }));
  if (s.phase !== 'combat') throw new Error('arena: not in combat');
  return { g, ev };
}

function enterNode(g: Game, room: RunState['room']): void {
  const s = g.state;
  const first = s.map.rows[0]?.[0];
  if (!first) throw new Error('map has no row 0');
  s.mapPos = { row: 0, col: first.col };
  s.floor += 1;
  s.room = room;
  if (room === null) throw new Error('enterNode: null room');
  s.history.floors.push(newFloorRecord(s, room));
}

function hand(g: Game): CardInstance[] {
  return combatOf(g).hand;
}

function uidOf(g: Game, id: string, nth = 0): number {
  const c = hand(g).filter((x) => x.id === id)[nth];
  if (!c) throw new Error(`no ${id} #${nth} in hand`);
  return c.uid;
}

function firstEnemy(g: Game): number {
  const u = enemyUids(g)[0];
  if (u === undefined) throw new Error('no living enemy');
  return u;
}

function enemyAt(g: Game, i: number) {
  const e = combatOf(g).enemies[i];
  if (!e) throw new Error(`no enemy #${i}`);
  return e;
}

function endTurn(g: Game): GameEvent[] {
  return g.apply({ type: 'end_turn' });
}

/** Move the top n draw-pile cards (run-deck copies) into the hand. */
function handFromDraw(g: Game, n: number): number[] {
  const c = combatOf(g);
  const moved = c.draw.splice(c.draw.length - n, n);
  c.hand.push(...moved);
  return moved.map((x) => x.uid);
}

/** Kill every enemy with Strikes (strips their HP / defence first). Returns the events of the last play. */
function winCombat(g: Game): GameEvent[] {
  const c = combatOf(g);
  const living = c.enemies.filter((e) => e.alive);
  for (const e of living) {
    e.hp = 1;
    e.block = 0;
    e.guard = 0;
  }
  setHand(g, living.map(() => 'test_strike'));
  c.energy = 10;
  let ev: GameEvent[] = [];
  for (const e of living) {
    const s = uidOf(g, 'test_strike');
    ev = [...ev, ...play(g, s, e.uid)];
  }
  settle(g);
  return ev;
}

function relicFlashes(ev: readonly GameEvent[], id: string): number {
  return ev.filter((e) => e.t === 'relic_trigger' && e.relic === id).length;
}

function guardGains(ev: readonly GameEvent[], amount?: number): number {
  return ev.filter((e) => e.t === 'block' && e.target === 'player' && e.pool === 'guard' && (amount === undefined || e.amount === amount)).length;
}

function blockGains(ev: readonly GameEvent[], amount: number): number {
  return ev.filter((e) => e.t === 'block' && e.target === 'player' && e.pool === 'block' && e.amount === amount).length;
}

function enterRoom(g: Game, room: 'rest' | 'shop'): void {
  enterNode(g, room);
  withEnv(g, (env) => enqueue(env, [{ kind: 'step', step: { op: 'enter_room' } }]));
  expect(g.state.phase).toBe(room);
}

function restIndex(g: Game, id: string): number {
  const i = g.state.rest?.specials.indexOf(id) ?? -1;
  if (i < 0) throw new Error(`no rest option ${id}`);
  return i;
}

// ---------------------------------------------------------------------------
// Roster

describe('relic roster', () => {
  it('has the 72 GDD relics, by rarity, all registered', () => {
    expect(RELICS).toHaveLength(72);
    for (const [rarity, ids] of Object.entries(IDS)) expect(RELICS.filter((r) => r.rarity === rarity).map((r) => r.id)).toEqual(ids);
    expect(Object.values(IDS).flat()).toHaveLength(72);
    for (const r of RELICS) expect(getRelicDef(r.id)).toBe(r);
  });

  it('declarative triggers pass the DSL validator (validateAllContent only walks the restricted test listings)', () => {
    // Same rules as validateAllContent's relic loop (src/engine/validate.ts).
    const targeted = ['onCardPlayed', 'afterCardPlayed', 'onDamageTaken', 'onHpLost', 'onDamageDealt', 'onEnemyAttackDeclared', 'onRiposteTriggered', 'onEnemySpawn'];
    const run = ['onPickup', 'onRest', 'onShopEnter', 'onFloorEnter', 'onActStart', 'onGoldGain', 'onShardGain', 'onRewardSkipped', 'onCardAdded'];
    const out: string[] = [];
    for (const r of RELICS) {
      for (const [hook, effects] of Object.entries(r.triggers ?? {})) {
        const combat = !run.includes(hook);
        validateEffects(effects ?? [], { label: `relic ${r.id}.${hook}`, tables: r, hasTarget: targeted.includes(hook), combat, run: !combat, enemy: false }, out);
      }
    }
    for (const s of RELIC_STATUSES) {
      expect(getStatusDef(s.id)).toBe(s);
      for (const [hook, effects] of Object.entries(s.triggers ?? {})) {
        validateEffects(effects ?? [], { label: `status ${s.id}.${hook}`, tables: s, hasTarget: targeted.includes(hook), combat: true, run: false, enemy: true }, out);
      }
    }
    expect(out).toEqual([]);
  });

  it('class locks and exclusions follow the GDD', () => {
    for (const r of RELICS) {
      const cls = Object.entries(CLASS_LOCKED).find(([, ids]) => ids.includes(r.id))?.[0];
      expect(r.cls, r.id).toBe(cls);
      expect(r.excludeClasses ?? [], r.id).toEqual(NOT_CHRONIST.includes(r.id) ? ['chronist'] : []);
    }
    // the class starter relics are the ones classes.ts references
    expect(['riven_gauntlet', 'heartseed', 'chrono_lens'].map((id) => getRelicDef(id).rarity)).toEqual(['starter', 'starter', 'starter']);
  });

  it('every text renders with no placeholder left (out of combat and in combat) and types no digits', () => {
    const { g } = arena({ relics: RELICS.map((r) => r.id).filter((id) => id !== 'cracked_hourglass') });
    const map = mapRun();
    for (const r of RELICS) {
      expect(r.text, r.id).not.toMatch(/\d/);
      for (const text of [renderRelicText(r.id), renderRelicText(r.id, g.state), renderRelicText(r.id, map.state)]) expect(text, r.id).not.toMatch(/[{}]/);
    }
    for (const s of RELIC_STATUSES) for (const n of [1, 2]) expect(renderStatusText(s.id, n)).not.toMatch(/[{}]/);
    expect(renderRelicText('bulwark_rivets')).toBe('Whenever you gain Guard, gain 1 more.');
    expect(renderRelicText('riven_gauntlet')).toBe('Whenever one of your Riposte effects triggers, gain 1 Onslaught and 2 Guard.');
    expect(renderRelicText('metronome_heart')).toBe('The 12th card you play each turn is also on the beat.');
    expect(renderRelicText('fixed_star')).toBe('+1 energy each turn. Only the 3rd card you play each turn is on the beat.');
    expect(renderRelicText('geode_heart')).toBe('At the start of each combat, gain 1 Block per Shard you hold (max 10).');
    expect(renderRelicText('wild_growth')).toBe('Prune grants 1 additional Bloom. At the start of each combat, shuffle 2 Tangles into your draw pile.');
    expect(renderRelicText('shard_debt')).toBe('When you pick this up, gain 3 Shards. Your next 3 card rewards offer one fewer card.');
  });
});

// ---------------------------------------------------------------------------
// Every declared hook fires (smoke tour)

const TOUR_DECK = ['test_strike', 'test_strike', 'test_strike', 'test_strike', 'test_block', 'test_block', 'test_sprout', 'test_sprout', 'test_parry', 'test_tock', 'test_beat', 'test_brace'];

/** Wrap every declared hook (and add a recorder for every trigger) of a relic; returns what fired. */
function instrument(def: RelicDef): { fired: Set<string>; declared: string[]; restore: () => void } {
  const declared = [...new Set([...Object.keys(def.hooks ?? {}), ...Object.keys(def.triggers ?? {})])];
  const fired = new Set<string>();
  const hadHooks = def.hooks !== undefined;
  if (!def.hooks) def.hooks = {};
  const hooks = def.hooks as Record<string, unknown>;
  const original: Record<string, unknown> = { ...hooks };
  for (const name of declared) {
    const fn = original[name];
    hooks[name] =
      typeof fn === 'function'
        ? (...args: unknown[]) => {
            fired.add(name);
            return (fn as (...a: unknown[]) => unknown)(...args);
          }
        : () => {
            fired.add(name);
          };
  }
  const restore = (): void => {
    if (!hadHooks) {
      delete def.hooks;
      return;
    }
    for (const name of declared) {
      if (name in original) hooks[name] = original[name];
      else delete hooks[name];
    }
  };
  return { fired, declared, restore };
}

function travelTo(g: Game, row: number, type: 'shop' | 'rest'): void {
  for (const n of g.state.map.rows[row] ?? []) n.type = type;
  const t = g.legalActions().find((a) => a.type === 'travel');
  if (!t) throw new Error('no travel action');
  g.apply(t);
  settle(g);
  expect(g.state.phase).toBe(type);
}

/** A scripted run touching every hook kind: pickup, an elite fight, reward, shop, rest, act start. */
function tour(id: string): void {
  const g = mapRun({ seed: `tour-${id}`, deck: TOUR_DECK, setup: (s) => {
    s.player.gold = 999;
    s.player.hp = s.player.maxHp = 400;
    s.player.counters.shards = 5;
  } });
  withEnv(g, (env) => gainRelic(env, id));
  settle(g);

  // --- combat (elite: Jaw + Slime)
  enterNode(g, 'elite');
  withEnv(g, (env) => startCombat(env, { encounterId: 'test_enc_jaw_slime', kind: 'elite' }));
  settle(g);
  pacify(g, 400);
  const [a, b] = enemyUids(g);
  if (a === undefined || b === undefined) throw new Error('tour: two enemies');
  setHand(g, ['test_tock', 'test_cleave', 'test_beat', 'test_brace', 'test_graft', 'test_sprout', 'test_twin', 'test_parry', 'test_whirl']);
  combatOf(g).energy = 20;
  play(g, uidOf(g, 'test_tock'));
  play(g, uidOf(g, 'test_cleave'));
  play(g, uidOf(g, 'test_beat'), a); // 3rd card: on the beat
  settle(g);
  play(g, uidOf(g, 'test_brace'));
  fx(g, [{ type: 'add_card', card: 'test_burn', to: 'hand' }]); // a Status put into hand
  combatOf(g).draw.push(makeCard(g.state, 'test_burn'));
  fx(g, [{ type: 'draw', n: 1 }]); // a Status drawn
  play(g, uidOf(g, 'test_graft'));
  const prune = pending(g);
  expect(prune?.resume.op).toBe('prune_scrap');
  g.apply({ type: 'resolve_choice', uids: [uidOf(g, 'test_burn')] });
  settle(g);
  play(g, uidOf(g, 'test_twin'), b);
  fx(g, [{ type: 'status', target: 'target', id: 'rot', amount: 4 }], a);
  fx(g, [{ type: 'status', target: 'all_enemies', id: 'stagger', amount: 3 }, { type: 'status', target: 'all_enemies', id: 'exposed', amount: 2 }, { type: 'guard', amount: 20 }]);
  g.state.player.potions = ['pot_shield_gel'];
  g.apply({ type: 'use_potion', index: 0 });
  combatOf(g).energy = 3;
  play(g, uidOf(g, 'test_whirl')); // X = 3: every enemy hit 3 times by one play
  settle(g);
  endTurn(g); // prime, enemy attacks (Riposte), then turn 2 start (Guard decay, Timeline)
  settle(g);
  expect(g.state.phase).toBe('combat');
  winCombat(g);

  // --- reward: gold, then skip (or take a card when skipping is not allowed)
  expect(g.state.phase).toBe('reward');
  g.apply({ type: 'pick_reward', kind: 'gold' });
  const skip = g.legalActions().find((x) => x.type === 'skip_reward');
  g.apply(skip ?? { type: 'pick_reward', kind: 'card', index: 0 });
  settle(g);
  g.apply({ type: 'proceed' });
  settle(g);
  expect(g.state.phase).toBe('map');

  // --- shop: buy a card, a Shard removal
  travelTo(g, 1, 'shop');
  const buy = g.legalActions().find((x) => x.type === 'shop_buy' && x.kind === 'card');
  if (buy) g.apply(buy);
  const remove = g.legalActions().find((x) => x.type === 'shop_remove' && x.pay === 'shard');
  if (!remove) throw new Error('tour: no shard removal');
  g.apply(remove);
  settle(g);
  g.apply({ type: 'proceed' });

  // --- rest: Smith a Bloom card
  travelTo(g, 2, 'rest');
  const sprout = g.state.player.deck.find((c) => c.id === 'test_sprout' && !c.upgraded);
  if (!sprout) throw new Error('tour: no sprout to smith');
  g.apply({ type: 'smith', uid: sprout.uid });
  settle(g);
  g.apply({ type: 'proceed' });

  // --- next act
  withEnv(g, (env) => enqueue(env, [{ kind: 'step', step: { op: 'next_act' } }]));
  settle(g);
  expect(g.state.act).toBe(2);
}

describe('every relic hook fires in a sandbox tour', () => {
  for (const def of RELICS) {
    it(def.id, () => {
      const { fired, declared, restore } = instrument(def);
      try {
        tour(def.id);
      } finally {
        restore();
      }
      for (const name of declared) expect(fired, `${def.id}.${name} never fired`).toContain(name);
    });
  }
});

// ---------------------------------------------------------------------------
// Precise behaviour

describe('starter relics', () => {
  it('riven_gauntlet: a Riposte trigger gains 1 Onslaught (kept into your turn) and 2 Guard', () => {
    const { g } = arena({ relics: ['riven_gauntlet'], encounter: 'test_enc_jaw' });
    pacify(g);
    setHand(g, ['test_parry']);
    combatOf(g).player.block = 100;
    const ev = endTurn(g);
    expect(eventsOf(ev, 'riposte_triggered')).toHaveLength(1);
    expect(guardGains(ev, 2)).toBe(1);
    expect(combatOf(g).turn).toBe(2);
    expect(combatOf(g).player.statuses.onslaught).toBe(1);
  });

  it('heartseed: the most-grown Bloom card starts in hand and counts toward the opening hand', () => {
    const { g } = arena({
      relics: ['heartseed'],
      deck: [...STRIKES.slice(0, 10), 'test_sprout', 'test_sprout'],
      setup: (s) => {
        const [low, high] = s.player.deck.filter((c) => c.id === 'test_sprout');
        if (!low || !high) throw new Error('setup');
        low.vars = { bloom: 1 };
        high.vars = { bloom: 3 };
      },
    });
    expect(hand(g)).toHaveLength(5);
    expect(hand(g).some((c) => c.id === 'test_sprout' && c.vars?.bloom === 3)).toBe(true);
    setHand(g, []);
    endTurn(g);
    expect(hand(g)).toHaveLength(5); // turn 2 draws the normal 5
  });

  it('chrono_lens: only the first on-beat card each turn draws 1 more', () => {
    const run = (relics: string[]) => {
      const { g } = arena({ relics, deck: STRIKES });
      pacify(g);
      setHand(g, Array.from({ length: 6 }, () => 'test_beat'));
      const t = firstEnemy(g);
      for (let i = 0; i < 3; i++) play(g, uidOf(g, 'test_beat'), t);
      const afterThree = hand(g).length;
      for (let i = 0; i < 3; i++) play(g, uidOf(g, 'test_beat'), t);
      return [afterThree, hand(g).length];
    };
    expect(run([])).toEqual([4, 2]);
    expect(run(['chrono_lens'])).toEqual([5, 3]);
  });
});

describe('common relics', () => {
  it('glass_spurs: 3 hits from one play on an enemy apply 1 Exposed; 2 do not', () => {
    const { g } = arena({ relics: ['glass_spurs'], encounter: 'test_enc_slimes' });
    pacify(g, 300);
    const [a, b] = enemyUids(g);
    if (a === undefined || b === undefined) throw new Error('setup');
    setHand(g, ['test_twin', 'test_whirl']);
    combatOf(g).energy = 4;
    play(g, uidOf(g, 'test_twin'), a);
    expect(enemyAt(g, 0).statuses.exposed).toBeUndefined();
    play(g, uidOf(g, 'test_whirl'));
    expect(enemyAt(g, 0).statuses.exposed).toBe(1);
    expect(enemyAt(g, 1).statuses.exposed).toBe(1);
  });

  it('dampener_coil: a fully blocked attack Staggers the attacker for its next turn; a damaging one does not', () => {
    const run = (block: number) => {
      const { g } = arena({ relics: ['dampener_coil'], encounter: 'test_enc_jaw' });
      pacify(g);
      setHand(g, []);
      combatOf(g).player.block = block;
      endTurn(g);
      return enemyAt(g, 0).statuses.stagger;
    };
    expect(run(100)).toBe(1);
    expect(run(0)).toBeUndefined();
  });

  it('cracked_prism: each Shard gained gives 15 gold', () => {
    const g = mapRun({ relics: ['cracked_prism'] });
    const gold = g.state.player.gold;
    fx(g, [{ type: 'shards', amount: 2 }]);
    expect(g.state.player.gold).toBe(gold + 30);
  });

  it('geode_heart: combat starts with 1 Block per Shard held', () => {
    const { g } = arena({ relics: ['geode_heart'], setup: (s) => (s.player.counters.shards = 4) });
    expect(combatOf(g).player.block).toBe(4);
  });

  it('bulwark_rivets: +1 Guard on every Guard gain', () => {
    const { g } = arena({ relics: ['bulwark_rivets'] });
    setHand(g, ['test_brace']);
    play(g, uidOf(g, 'test_brace'));
    expect(combatOf(g).player.guard).toBe(7);
  });

  it('stim_patch: using a potion gains 4 Guard', () => {
    const { g } = arena({ relics: ['stim_patch'] });
    g.state.player.potions = ['pot_bastion_tonic'];
    g.apply({ type: 'use_potion', index: 0 });
    expect(combatOf(g).player.guard).toBe(14);
  });

  it('scrap_magnet: a Status card drawn or put into hand gains 3 Guard; other cards do not', () => {
    const { g } = arena({ relics: ['scrap_magnet'] });
    fx(g, [{ type: 'add_card', card: 'test_burn', to: 'hand' }]);
    expect(combatOf(g).player.guard).toBe(3);
    combatOf(g).draw.push(makeCard(g.state, 'test_burn'));
    fx(g, [{ type: 'draw', n: 1 }]);
    expect(combatOf(g).player.guard).toBe(6);
    fx(g, [{ type: 'draw', n: 1 }]);
    expect(combatOf(g).player.guard).toBe(6);
  });

  it('surveyor_ink: winning an elite gives 15 gold; a normal fight does not', () => {
    const elite = arena({ relics: ['surveyor_ink'], kind: 'elite' }).g;
    expect(eventsOf(winCombat(elite), 'gold').map((e) => e.delta)).toEqual([15]);
    const normal = arena({ relics: ['surveyor_ink'] }).g;
    expect(eventsOf(winCombat(normal), 'gold')).toEqual([]);
  });

  it('field_dressing: heals 8 after an elite or boss win only', () => {
    for (const [kind, healed] of [['elite', 8], ['boss', 8], ['monster', 0]] as const) {
      const { g } = arena({ relics: ['field_dressing'], kind, encounter: kind === 'boss' ? 'test_enc_boss' : 'test_enc_slime' });
      g.state.player.hp = 100;
      winCombat(g);
      expect(g.state.player.hp, kind).toBe(100 + healed);
    }
  });

  it('tally_stick: skipping a card reward makes the next reward offer 4 cards', () => {
    const { g } = arena({ relics: ['tally_stick'] });
    winCombat(g);
    g.apply({ type: 'skip_reward', kind: 'card' });
    expect(g.state.player.counters.wide_rewards).toBe(1);
    expect(generateReward(g.state, 'monster').cards).toHaveLength(4);
    expect(generateReward(g.state, 'monster').cards).toHaveLength(3);
  });

  it('notched_buckler: ending the turn with a primed card gains 4 Guard', () => {
    const run = (cards: string[]) => {
      const { g } = arena({ relics: ['notched_buckler'], encounter: 'test_enc_jaw' });
      pacify(g);
      setHand(g, cards);
      return guardGains(endTurn(g), 4);
    };
    expect(run(['test_parry'])).toBe(1);
    expect(run(['test_strike'])).toBe(0);
  });

  it('chain_wraps: at turn end, Guard = half your Onslaught (round down)', () => {
    const { g } = arena({ relics: ['chain_wraps'] });
    pacify(g);
    setHand(g, ['test_strike', 'test_strike', 'test_strike']);
    combatOf(g).energy = 3;
    for (let i = 0; i < 3; i++) play(g, uidOf(g, 'test_strike'), firstEnemy(g));
    expect(combatOf(g).player.statuses.onslaught).toBe(3);
    expect(guardGains(endTurn(g), 1)).toBe(1);
  });

  it('seed_pouch: a Bloom card taken from a card reward starts at 2 Bloom (not from the shop)', () => {
    const g = mapRun({ relics: ['seed_pouch'] });
    let fromReward: CardInstance | null = null;
    let fromShop: CardInstance | null = null;
    withEnv(g, (env) => {
      fromReward = addToDeck(env, 'test_sprout', false, 'reward');
      fromShop = addToDeck(env, 'test_sprout', false, 'shop');
    });
    expect((fromReward as CardInstance | null)?.vars?.bloom).toBe(2);
    expect((fromShop as CardInstance | null)?.vars?.bloom).toBeUndefined();
  });

  it('pollen_sac: Bloom gained in combat rots a random enemy; out of combat it is harmless', () => {
    const { g } = arena({ relics: ['pollen_sac'] });
    setHand(g, ['test_sprout']);
    fx(g, [{ type: 'bloom', amount: 1, target: 'choose_hand' }]);
    expect(enemyAt(g, 0).statuses.rot).toBe(1);
    const m = mapRun({ relics: ['pollen_sac'], deck: ['test_sprout'] });
    fx(m, [{ type: 'bloom', amount: 1, target: 'choose_deck' }]);
    expect(m.state.player.deck[0]?.vars?.bloom).toBe(1);
  });

  it('compost_heap: the first Prune that Scraps a card draws 2; the second does not', () => {
    const { g } = arena({ relics: ['compost_heap'] });
    setHand(g, ['test_graft', 'test_strike', 'test_graft', 'test_strike']);
    combatOf(g).energy = 5;
    play(g, uidOf(g, 'test_graft'));
    g.apply({ type: 'resolve_choice', uids: [uidOf(g, 'test_strike')] });
    expect(hand(g)).toHaveLength(4);
    play(g, uidOf(g, 'test_graft'));
    g.apply({ type: 'resolve_choice', uids: [uidOf(g, 'test_strike')] });
    expect(hand(g)).toHaveLength(2);
  });

  it('tuning_fork: ending the turn right after an on-beat play gains 5 Block', () => {
    const run = (plays: number) => {
      const { g } = arena({ relics: ['tuning_fork'] });
      pacify(g);
      setHand(g, ['test_strike', 'test_strike', 'test_strike', 'test_strike']);
      combatOf(g).energy = 4;
      for (let i = 0; i < plays; i++) play(g, uidOf(g, 'test_strike'), firstEnemy(g));
      return blockGains(endTurn(g), 5);
    };
    expect(run(3)).toBe(1);
    expect(run(4)).toBe(0);
    expect(run(2)).toBe(0);
  });

  it('sandglass_bead: the first Timeline card each combat resolves 1 turn sooner', () => {
    const { g } = arena({ relics: ['sandglass_bead'] });
    setHand(g, ['test_noon', 'test_noon']);
    combatOf(g).energy = 2;
    play(g, uidOf(g, 'test_noon'), firstEnemy(g));
    play(g, uidOf(g, 'test_noon'), firstEnemy(g));
    expect(combatOf(g).timeline.map((e) => e.dueTurn)).toEqual([2, 3]);
  });

  it('star_pip: 3 Block per enemy whose next two intents are attacks', () => {
    const { g } = arena({ relics: ['star_pip'], encounter: 'test_enc_elite' }); // Jaw always attacks; Cultist buffs first, then stabs
    expect(combatOf(g).player.block).toBe(3);
    pacify(g);
    setHand(g, []);
    combatOf(g).player.block = 100;
    endTurn(g);
    expect(combatOf(g).player.block).toBe(6);
  });
});

describe('uncommon relics', () => {
  it('parry_charm: two Riposte cards are primed', () => {
    const { g } = arena({ relics: ['parry_charm'], encounter: 'test_enc_jaw' });
    pacify(g);
    expect(combatOf(g).player.statuses.riposte_capacity).toBe(1);
    setHand(g, ['test_parry', 'test_parry']);
    expect(eventsOf(endTurn(g), 'card_primed')).toHaveLength(2);
  });

  it('kept_fury: up to 1 Onslaught is kept at turn end', () => {
    const { g } = arena({ relics: ['kept_fury'] });
    pacify(g);
    setHand(g, ['test_strike', 'test_strike', 'test_strike']);
    combatOf(g).energy = 3;
    for (let i = 0; i < 3; i++) play(g, uidOf(g, 'test_strike'), firstEnemy(g));
    combatOf(g).player.block = 100;
    endTurn(g);
    expect(combatOf(g).player.statuses.onslaught).toBe(1);
  });

  it('crowd_breaker: an Attack hitting 2+ enemies gains 1 more Onslaught', () => {
    const { g } = arena({ relics: ['crowd_breaker'], encounter: 'test_enc_slimes' });
    pacify(g);
    setHand(g, ['test_cleave', 'test_strike']);
    combatOf(g).energy = 2;
    play(g, uidOf(g, 'test_cleave'));
    expect(combatOf(g).player.statuses.onslaught).toBe(2);
    play(g, uidOf(g, 'test_strike'), firstEnemy(g));
    expect(combatOf(g).player.statuses.onslaught).toBe(3);
  });

  it('concussion_rig: each hit from a Staggered enemy gains 1 Guard', () => {
    const { g } = arena({ relics: ['concussion_rig'], encounter: 'test_enc_jaw' });
    pacify(g);
    const jaw = enemyAt(g, 0);
    jaw.intent = computeIntent(g.state, jaw, 'flurry');
    fx(g, [{ type: 'status', target: 'target', id: 'stagger', amount: 1 }], jaw.uid);
    setHand(g, []);
    combatOf(g).player.block = 100;
    expect(guardGains(endTurn(g), 1)).toBe(3);
  });

  it('slow_temper: Guard loses a third instead of half', () => {
    const run = (relics: string[]) => {
      const { g } = arena({ relics });
      pacify(g);
      fx(g, [{ type: 'guard', amount: 30 }]);
      setHand(g, []);
      combatOf(g).player.block = 100;
      endTurn(g);
      return combatOf(g).player.guard;
    };
    expect(run([])).toBe(15);
    expect(run(['slow_temper'])).toBe(20);
  });

  it('pocket_star_chart: grants Augury in elite and boss combats only', () => {
    expect(relicFlashes(arena({ relics: ['pocket_star_chart'], kind: 'elite' }).ev, 'pocket_star_chart')).toBe(1);
    expect(relicFlashes(arena({ relics: ['pocket_star_chart'], kind: 'boss', encounter: 'test_enc_boss' }).ev, 'pocket_star_chart')).toBe(1);
    expect(relicFlashes(arena({ relics: ['pocket_star_chart'] }).ev, 'pocket_star_chart')).toBe(0);
  });

  it('overwatch_drone: 8 damage to the first enemy that attacks, once per combat', () => {
    const { g } = arena({ relics: ['overwatch_drone'], encounter: 'test_enc_jaw' });
    pacify(g, 100);
    setHand(g, []);
    combatOf(g).player.block = 100;
    endTurn(g);
    expect(enemyAt(g, 0).hp).toBe(92);
    setHand(g, []);
    combatOf(g).player.block = 100;
    endTurn(g);
    expect(enemyAt(g, 0).hp).toBe(92);
  });

  it('shard_lens: Purge costs 1 Shard', () => {
    const g = mapRun({ relics: ['shard_lens'] });
    expect(restOptionShardCost(g.state, getRestOptionDef('rest_purge'))).toBe(1);
    expect(restOptionShardCost(g.state, getRestOptionDef('rest_transmute'))).toBe(1);
    expect(restOptionShardCost(mapRun().state, getRestOptionDef('rest_purge'))).toBe(2);
  });

  it('crystal_spine: the first rest-site Transmute each act is free', () => {
    const g = mapRun({ relics: ['crystal_spine'], setup: (s) => (s.player.counters.shards = 5) });
    const transmute = getRestOptionDef('rest_transmute');
    expect(restOptionShardCost(g.state, transmute)).toBe(0);
    enterRoom(g, 'rest');
    g.apply({ type: 'rest_special', index: restIndex(g, 'rest_transmute') });
    settle(g);
    expect(g.state.player.counters.shards).toBe(5);
    expect(restOptionShardCost(g.state, transmute)).toBe(1);
    g.apply({ type: 'proceed' });
    withEnv(g, (env) => enqueue(env, [{ kind: 'step', step: { op: 'next_act' } }]));
    expect(restOptionShardCost(g.state, transmute)).toBe(0);
  });

  it('hairline_saw: a dying enemy passes its Exposed to the living enemy with the lowest HP', () => {
    const { g } = arena({ relics: ['hairline_saw'], encounter: 'test_enc_pack' });
    const [leader, minion, slime] = [enemyAt(g, 0), enemyAt(g, 1), enemyAt(g, 2)];
    leader.hp = 200;
    slime.hp = 40;
    minion.hp = 1;
    fx(g, [{ type: 'status', target: 'target', id: 'exposed', amount: 3 }], minion.uid);
    setHand(g, ['test_strike']);
    play(g, uidOf(g, 'test_strike'), minion.uid);
    expect(enemyAt(g, 1).alive).toBe(false);
    expect(enemyAt(g, 2).statuses.exposed).toBe(3);
    expect(enemyAt(g, 0).statuses.exposed).toBeUndefined();
  });

  it('wayfinder_needle: at act start one early ? node becomes a Treasure node', () => {
    const g = mapRun({ relics: ['wayfinder_needle'] });
    const early = () => g.state.map.rows.slice(1, 8).flat();
    const node = early()[0];
    if (!node) throw new Error('setup');
    node.type = 'event';
    const events = early().filter((n) => n.type === 'event').length;
    const treasures = early().filter((n) => n.type === 'treasure').length;
    withEnv(g, (env) => dispatch(env, 'onActStart', 'player', {}));
    expect(early().filter((n) => n.type === 'event')).toHaveLength(events - 1);
    expect(early().filter((n) => n.type === 'treasure')).toHaveLength(treasures + 1);
  });

  it('rot_censer: all of a dead enemy\'s Rot spreads instead of half', () => {
    const run = (relics: string[]) => {
      const { g } = arena({ relics, encounter: 'test_enc_slimes' });
      const [a, b] = [enemyAt(g, 0), enemyAt(g, 1)];
      b.hp = b.maxHp = 300;
      fx(g, [{ type: 'status', target: 'target', id: 'rot', amount: 6 }], a.uid);
      a.hp = 1;
      setHand(g, ['test_strike']);
      play(g, uidOf(g, 'test_strike'), a.uid);
      return enemyAt(g, 1).statuses.rot;
    };
    expect(run([])).toBe(3);
    expect(run(['rot_censer'])).toBe(6);
  });

  it('grafting_knife: Pruning a Status adds 1 more Bloom; Pruning a Strike does not', () => {
    const { g } = arena({ relics: ['grafting_knife'] });
    setHand(g, ['test_graft', 'test_burn', 'test_sprout', 'test_graft', 'test_strike']);
    combatOf(g).energy = 5;
    play(g, uidOf(g, 'test_graft'));
    g.apply({ type: 'resolve_choice', uids: [uidOf(g, 'test_burn')] });
    expect(hand(g).find((c) => c.id === 'test_sprout')?.vars?.bloom).toBe(2);
    play(g, uidOf(g, 'test_graft'));
    g.apply({ type: 'resolve_choice', uids: [uidOf(g, 'test_strike')] });
    expect(hand(g).find((c) => c.id === 'test_sprout')?.vars?.bloom).toBe(3);
  });

  it('heartwood_ring: the least-grown Bloom card in the deck gains 1 Bloom at combat start', () => {
    let low = -1;
    const { g } = arena({
      relics: ['heartwood_ring'],
      deck: [...STRIKES.slice(0, 10), 'test_sprout', 'test_sprout'],
      setup: (s) => {
        const [a, b] = s.player.deck.filter((c) => c.id === 'test_sprout');
        if (!a || !b) throw new Error('setup');
        a.vars = { bloom: 4 };
        low = b.uid;
      },
    });
    const c = combatOf(g);
    expect([...c.hand, ...c.draw].find((x) => x.uid === low)?.vars?.bloom).toBe(1);
    winCombat(g);
    expect(g.state.player.deck.find((x) => x.uid === low)?.vars?.bloom).toBe(1);
  });

  it('mycelial_net: Rot on enemies caps at 20 instead of 15', () => {
    const run = (relics: string[]) => {
      const { g } = arena({ relics });
      fx(g, [{ type: 'status', target: 'target', id: 'rot', amount: 25 }], firstEnemy(g));
      return enemyAt(g, 0).statuses.rot;
    };
    expect(run([])).toBe(15);
    expect(run(['mycelial_net'])).toBe(20);
  });

  it('offbeat_drum: on-beat effects of 0-cost cards run twice', () => {
    const run = (relics: string[]) => {
      const { g } = arena({ relics });
      pacify(g);
      setHand(g, ['test_beat', 'test_beat', 'test_beat']);
      for (let i = 0; i < 3; i++) play(g, uidOf(g, 'test_beat'), firstEnemy(g));
      return hand(g).length;
    };
    expect(run([])).toBe(1);
    expect(run(['offbeat_drum'])).toBe(2);
  });

  it('timeline_spool: a Timeline resolution deals 3 damage to the lowest-HP enemy', () => {
    const { g } = arena({ relics: ['timeline_spool'], encounter: 'test_enc_slimes' });
    enemyAt(g, 0).hp = 50;
    enemyAt(g, 1).hp = 40;
    setHand(g, ['test_tock']);
    play(g, uidOf(g, 'test_tock'));
    combatOf(g).player.block = 100;
    endTurn(g);
    expect([enemyAt(g, 0).hp, enemyAt(g, 1).hp]).toEqual([50, 37]);
  });

  it("seers_veil: draws 1 when some enemy's intent after next is not an attack", () => {
    expect(hand(arena({ relics: ['seers_veil'], encounter: 'test_enc_jaw' }).g)).toHaveLength(5);
    expect(hand(arena({ relics: ['seers_veil'], encounter: 'test_enc_elite_mystic' }).g)).toHaveLength(6); // Mystic's next-but-one is hidden
  });
});

describe('rare relics', () => {
  it('duelists_oath: one primed card fires on two enemy attacks', () => {
    const run = (relics: string[]) => {
      const { g } = arena({ relics, encounter: 'test_enc_slimes' });
      pacify(g);
      for (const e of combatOf(g).enemies) e.intent = computeIntent(g.state, e, 'tackle');
      setHand(g, ['test_parry']);
      combatOf(g).player.block = 100;
      return eventsOf(endTurn(g), 'riposte_triggered').length;
    };
    expect(run([])).toBe(1);
    expect(run(['duelists_oath'])).toBe(2);
  });

  it('stormbreak_gem: reaching 6 Onslaught gives 1 energy and draws 2, once per turn', () => {
    const { g } = arena({ relics: ['stormbreak_gem'] });
    pacify(g);
    fx(g, [{ type: 'status', target: 'self', id: 'onslaught', amount: 5 }]);
    setHand(g, ['test_strike', 'test_strike']);
    combatOf(g).energy = 3;
    play(g, uidOf(g, 'test_strike'), firstEnemy(g));
    expect(combatOf(g).energy).toBe(3);
    expect(hand(g)).toHaveLength(3);
    play(g, uidOf(g, 'test_strike'), firstEnemy(g));
    expect(combatOf(g).energy).toBe(2);
    expect(hand(g)).toHaveLength(2);
  });

  it('bastion_core: Guard lost to halving is dealt to a random enemy', () => {
    const { g } = arena({ relics: ['bastion_core'] });
    pacify(g, 300);
    fx(g, [{ type: 'guard', amount: 20 }]);
    setHand(g, []);
    combatOf(g).player.block = 100;
    endTurn(g);
    expect(combatOf(g).player.guard).toBe(10);
    expect(enemyAt(g, 0).hp).toBe(290);
  });

  it('elder_seed: Bloom cards grow to 15', () => {
    const run = (relics: string[]) => {
      const { g } = arena({ relics });
      setHand(g, ['test_sprout']);
      const sprout = hand(g)[0];
      if (!sprout) throw new Error('setup');
      sprout.vars = { bloom: 9 };
      fx(g, [{ type: 'bloom', amount: 9, target: 'choose_hand' }]);
      return hand(g)[0]?.vars?.bloom;
    };
    expect(run([])).toBe(10);
    expect(run(['elder_seed'])).toBe(15);
  });

  it('hollow_bough: once per combat a Prune may remove the Scrapped deck card', () => {
    const { g } = arena({ relics: ['hollow_bough'] });
    const deckSize = g.state.player.deck.length;
    setHand(g, ['test_graft', 'test_graft']);
    const [first, second] = handFromDraw(g, 2);
    if (first === undefined || second === undefined) throw new Error('setup');
    combatOf(g).energy = 2;
    play(g, uidOf(g, 'test_graft'));
    g.apply({ type: 'resolve_choice', uids: [first] });
    expect(pending(g)?.kind).toBe('options');
    const ev = g.apply({ type: 'resolve_choice', uids: [0] });
    expect(eventsOf(ev, 'card_removed').map((e) => e.uid)).toEqual([first]);
    expect(g.state.player.deck).toHaveLength(deckSize - 1);
    play(g, uidOf(g, 'test_graft'));
    g.apply({ type: 'resolve_choice', uids: [second] });
    expect(pending(g)).toBeNull();
    expect(g.state.player.deck).toHaveLength(deckSize - 1);
  });

  it('plague_bloom: applying Rot gives every other enemy half; Rot ticking does not spread', () => {
    const { g } = arena({ relics: ['plague_bloom'], encounter: 'test_enc_slimes' });
    pacify(g, 300);
    fx(g, [{ type: 'status', target: 'target', id: 'rot', amount: 6 }], firstEnemy(g));
    expect([enemyAt(g, 0).statuses.rot, enemyAt(g, 1).statuses.rot]).toEqual([6, 3]);
    setHand(g, []);
    combatOf(g).player.block = 100;
    endTurn(g);
    expect([enemyAt(g, 0).statuses.rot, enemyAt(g, 1).statuses.rot]).toEqual([7, 4]);
  });

  it('metronome_heart / fixed_star: beat positions', () => {
    const at = (relics: string[], played: number) => {
      const { g } = arena({ relics });
      combatOf(g).cardsPlayedThisTurn = Array.from({ length: played }, () => 'test_strike');
      return nextBeat(g.state).onBeat;
    };
    expect([at([], 11), at(['metronome_heart'], 11), at(['metronome_heart'], 8)]).toEqual([false, true, true]);
    expect([at(['fixed_star'], 2), at(['fixed_star'], 5), at(['fixed_star'], 8)]).toEqual([true, false, false]);
  });

  it('prophet_glass: forecasts reach 3 intents', () => {
    expect(enemyAt(arena().g, 0).forecast).toHaveLength(1);
    expect(enemyAt(arena({ relics: ['prophet_glass'] }).g, 0).forecast).toHaveLength(2);
  });

  it('paradox_coil: a resolved Timeline card may return with Delay 2, once per card', () => {
    const { g } = arena({ relics: ['paradox_coil'] });
    pacify(g);
    setHand(g, ['test_tock']);
    const tock = uidOf(g, 'test_tock');
    play(g, tock);
    setHand(g, []);
    combatOf(g).player.block = 100;
    endTurn(g);
    expect(pending(g)?.prompt).toMatch(/Paradox Coil/);
    g.apply({ type: 'resolve_choice', uids: [0] });
    expect(combatOf(g).timeline.map((e) => [e.card.uid, e.dueTurn])).toEqual([[tock, 4]]);
    for (let i = 0; i < 2; i++) {
      setHand(g, []);
      combatOf(g).player.block = 100;
      endTurn(g);
    }
    expect(combatOf(g).turn).toBe(4);
    expect(combatOf(g).timeline).toEqual([]);
    expect(pending(g)).toBeNull();
    const c = combatOf(g);
    expect([...c.hand, ...c.draw, ...c.discard].some((x) => x.uid === tock)).toBe(true);
  });

  it('shard_crucible: Purge does not use up the rest action', () => {
    const g = mapRun({ relics: ['shard_crucible'], setup: (s) => (s.player.counters.shards = 5) });
    enterRoom(g, 'rest');
    g.apply({ type: 'rest_special', index: restIndex(g, 'rest_purge') });
    settle(g);
    expect(g.state.player.counters.shards).toBe(3);
    expect(g.legalActions()).toContainEqual({ type: 'rest' });
    expect(g.legalActions().some((a) => a.type === 'rest_special' && a.index === restIndex(g, 'rest_purge'))).toBe(false);
  });

  it('fracture_engine: Exposed adds 2 damage per stack to your hits', () => {
    const run = (relics: string[]) => {
      const { g } = arena({ relics });
      pacify(g);
      fx(g, [{ type: 'status', target: 'target', id: 'exposed', amount: 2 }], firstEnemy(g));
      setHand(g, ['test_strike']);
      return eventsOf(play(g, uidOf(g, 'test_strike'), firstEnemy(g)), 'damage')[0]?.amount;
    };
    expect(run([])).toBe(8);
    expect(run(['fracture_engine'])).toBe(10);
  });

  it('void_compass: an elite card reward is one common, one uncommon, one rare', () => {
    const { g } = arena({ relics: ['void_compass'], kind: 'elite' });
    winCombat(g);
    const rarities = (g.state.reward?.cards ?? []).map((o) => getCardDef(o.id).rarity).sort();
    expect(rarities).toEqual(['common', 'rare', 'uncommon']);
  });
});

describe('boss relics (bonus and drawback)', () => {
  it('binding_contract: +1 energy; card rewards cannot be skipped', () => {
    const { g } = arena({ relics: ['binding_contract'] });
    expect(combatOf(g).energy).toBe(4);
    winCombat(g);
    const legal = g.legalActions();
    expect(legal.some((a) => a.type === 'skip_reward')).toBe(false);
    expect(legal.some((a) => a.type === 'proceed')).toBe(false);
  });

  it('cracked_hourglass: +1 energy; enemies act before your first turn', () => {
    const { g, ev } = arena({ relics: ['cracked_hourglass'], encounter: 'test_enc_jaw' });
    const firstMove = ev.findIndex((e) => e.t === 'enemy_move');
    const firstTurn = ev.findIndex((e) => e.t === 'turn_start');
    expect(firstMove).toBeGreaterThanOrEqual(0);
    expect(firstMove).toBeLessThan(firstTurn);
    expect(combatOf(g).energy).toBe(4);
  });

  it('exposed_core: +1 energy; start with 4 Exposed', () => {
    const { g } = arena({ relics: ['exposed_core'] });
    expect(combatOf(g).energy).toBe(4);
    expect(combatOf(g).player.statuses.exposed).toBe(4);
  });

  it('stasis_engine: +1 energy; draw 1 fewer', () => {
    const { g } = arena({ relics: ['stasis_engine'] });
    expect([combatOf(g).energy, hand(g).length]).toEqual([4, 4]);
  });

  it('ghost_lantern: +1 energy; enemies start with 10 Guard', () => {
    const { g } = arena({ relics: ['ghost_lantern'], encounter: 'test_enc_slimes' });
    expect(combatOf(g).energy).toBe(4);
    expect(combatOf(g).enemies.map((e) => e.guard)).toEqual([10, 10]);
  });

  it('tender_plating: +1 energy; HP lost to an enemy hit is 1 more', () => {
    const run = (relics: string[]) => {
      const { g } = arena({ relics });
      pacify(g);
      const slime = enemyAt(g, 0);
      slime.intent = computeIntent(g.state, slime, 'tackle');
      setHand(g, []);
      endTurn(g);
      return g.state.player.hp;
    };
    expect(run([])).toBe(294);
    expect(run(['tender_plating'])).toBe(293);
    expect(combatOf(arena({ relics: ['tender_plating'] }).g).energy).toBe(4);
  });

  it('fixed_star: +1 energy', () => {
    expect(combatOf(arena({ relics: ['fixed_star'] }).g).energy).toBe(4);
  });

  it('heavy_heart: Onslaught halves instead of resetting; nothing is primed', () => {
    const { g } = arena({ relics: ['heavy_heart'], encounter: 'test_enc_jaw' });
    pacify(g);
    fx(g, [{ type: 'status', target: 'self', id: 'onslaught', amount: 5 }]);
    setHand(g, ['test_parry']);
    combatOf(g).player.block = 100;
    const ev = endTurn(g);
    expect(eventsOf(ev, 'card_primed')).toEqual([]);
    expect(combatOf(g).player.statuses.onslaught).toBe(2);
  });

  it('wild_growth: 2 Tangles join the draw pile; Prune grants 1 more Bloom', () => {
    const { g } = arena({ relics: ['wild_growth'] });
    const c = combatOf(g);
    expect([...c.hand, ...c.draw].filter((x) => x.id === 'status_tangle')).toHaveLength(2);
    setHand(g, ['test_graft', 'test_strike', 'test_sprout']);
    play(g, uidOf(g, 'test_graft'));
    g.apply({ type: 'resolve_choice', uids: [uidOf(g, 'test_strike')] });
    expect(hand(g).find((x) => x.id === 'test_sprout')?.vars?.bloom).toBe(2);
  });

  it('ascendant_prism: +4 Shards on pickup; skipping a card reward gives none', () => {
    const { g } = arena();
    withEnv(g, (env) => gainRelic(env, 'ascendant_prism'));
    expect(g.state.player.counters.shards).toBe(4);
    winCombat(g);
    g.apply({ type: 'skip_reward', kind: 'card' });
    expect(g.state.player.counters.shards).toBe(4);
  });

  it('gravity_loom: draw 7; hand limit 7', () => {
    const { g } = arena({ relics: ['gravity_loom'] });
    expect(hand(g)).toHaveLength(7);
    expect(combatOf(g).handLimit).toBe(7);
  });

  it('star_atlas: Augury; enemies get 10% more Max HP (round up)', () => {
    const plain = enemyAt(arena({ seed: 'atlas' }).g, 0).maxHp;
    const { g, ev } = arena({ seed: 'atlas', relics: ['star_atlas'] });
    expect(enemyAt(g, 0).maxHp).toBe(Math.ceil((plain * 110) / 100));
    expect(enemyAt(g, 0).hp).toBe(enemyAt(g, 0).maxHp);
    expect(relicFlashes(ev, 'star_atlas')).toBeGreaterThan(0);
  });
});

describe('shop and event relics', () => {
  it('shard_writ: a Shard removal costs no gold and keeps the removal service', () => {
    const g = mapRun({ relics: ['shard_writ'], setup: (s) => (s.player.counters.shards = 3) });
    enterRoom(g, 'shop');
    expect(g.state.shop?.removeShardGold).toBe(0);
    const gold = g.state.player.gold;
    const uid = g.state.player.deck[0]?.uid;
    if (uid === undefined) throw new Error('setup');
    g.apply({ type: 'shop_remove', uid, pay: 'shard' });
    expect([g.state.player.gold, g.state.player.counters.shards, g.state.shop?.removeUsed]).toEqual([gold, 2, false]);
  });

  it('vial_rack: +1 potion slot on pickup; shop potions cost 25% less', () => {
    const g = mapRun({ seed: 'vials' });
    const slots = g.state.player.potionSlots;
    withEnv(g, (env) => gainRelic(env, 'vial_rack'));
    expect(g.state.player.potionSlots).toBe(slots + 1);
    const plain = mapRun({ seed: 'vials' });
    const rack = mapRun({ seed: 'vials', relics: ['vial_rack'] });
    enterRoom(plain, 'shop');
    enterRoom(rack, 'shop');
    const base = (plain.state.shop?.potions ?? []).map((p) => p.price);
    expect(base.length).toBeGreaterThan(0);
    expect((rack.state.shop?.potions ?? []).map((p) => p.price)).toEqual(base.map((p) => Math.floor((p * 75) / 100)));
  });

  it('practice_dummy: a Riposte card from the draw pile is primed for enemy turn 1', () => {
    const { g } = arena({ relics: ['practice_dummy'], encounter: 'test_enc_jaw', deck: [...STRIKES.slice(0, 10), 'test_parry'] });
    expect(combatOf(g).primed.map((p) => p.card.id)).toEqual(['test_parry']);
    pacify(g);
    setHand(g, []);
    combatOf(g).player.block = 100;
    expect(eventsOf(endTurn(g), 'riposte_triggered')).toHaveLength(1);
  });

  it('nursery_tray: Smithing a Bloom card also gives it 2 Bloom', () => {
    const g = mapRun({ relics: ['nursery_tray'], deck: ['test_sprout', 'test_strike'] });
    const sprout = g.state.player.deck[0];
    if (!sprout) throw new Error('setup');
    sprout.vars = { bloom: 1 };
    enterRoom(g, 'rest');
    g.apply({ type: 'smith', uid: sprout.uid });
    expect([g.state.player.deck[0]?.upgraded, g.state.player.deck[0]?.vars?.bloom]).toEqual([true, 3]);
    const strike = g.state.player.deck[1];
    expect(strike?.vars).toBeUndefined();
  });

  it('timeline_clamp: Block from a Timeline resolution is +25% (round down)', () => {
    const { g } = arena({ relics: ['timeline_clamp'] });
    pacify(g);
    setHand(g, ['test_tock']);
    expect(blockGains(play(g, uidOf(g, 'test_tock')), 3)).toBe(1);
    setHand(g, []);
    expect(blockGains(endTurn(g), 6)).toBe(1);
  });

  it('oracle_pebble: Augury for the next 3 combats (relic counter)', () => {
    const g = mapRun();
    withEnv(g, (env) => gainRelic(env, 'oracle_pebble'));
    expect(g.state.player.relics.find((r) => r.id === 'oracle_pebble')?.counter).toBe(3);
    expect(getRelicDef('oracle_pebble').counterMax).toBe(3);
    const counter = (n: number) => (s: RunState) => {
      s.player.relics = [{ id: 'oracle_pebble', counter: n }];
    };
    const { g: fight, ev } = arena({ setup: counter(3) });
    expect(relicFlashes(ev, 'oracle_pebble')).toBe(1);
    expect(fight.state.player.relics[0]?.counter).toBe(2);
    expect(relicFlashes(arena({ setup: counter(0) }).ev, 'oracle_pebble')).toBe(0);
  });

  it('engine_tooth: the first Attack each combat applies 2 Stagger to each enemy it hits', () => {
    const { g } = arena({ relics: ['engine_tooth'], encounter: 'test_enc_slimes' });
    pacify(g);
    setHand(g, ['test_cleave', 'test_cleave']);
    combatOf(g).energy = 2;
    play(g, uidOf(g, 'test_cleave'));
    expect(combatOf(g).enemies.map((e) => e.statuses.stagger)).toEqual([2, 2]);
    play(g, uidOf(g, 'test_cleave'));
    expect(combatOf(g).enemies.map((e) => e.statuses.stagger)).toEqual([2, 2]);
  });

  it('shard_debt: +3 Shards and the next 3 card rewards offer one fewer card', () => {
    const g = mapRun();
    withEnv(g, (env) => gainRelic(env, 'shard_debt'));
    expect([g.state.player.counters.shards, g.state.player.counters.lean_rewards]).toEqual([3, 3]);
    expect(generateReward(g.state, 'monster').cards).toHaveLength(2);
  });

  it('crown_fragment: a win by the end of turn 3 gains 1 Shard; a longer fight does not', () => {
    const quick = arena({ relics: ['crown_fragment'] }).g;
    winCombat(quick);
    expect(quick.state.player.counters.shards).toBe(1);
    const slow = arena({ relics: ['crown_fragment'] }).g;
    pacify(slow);
    for (let i = 0; i < 3; i++) {
      setHand(slow, []);
      combatOf(slow).player.block = 100;
      endTurn(slow);
    }
    expect(combatOf(slow).turn).toBe(4);
    winCombat(slow);
    expect(slow.state.player.counters.shards).toBe(0);
  });
});
