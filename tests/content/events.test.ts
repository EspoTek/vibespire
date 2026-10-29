import { describe, expect, it, vi } from 'vitest';
import * as content from '../../src/content';
import { EVENTS, EVENT_ENCOUNTERS, EVENT_STATUSES } from '../../src/content/events';
import { Game } from '../../src/engine/game';
import { makeCard } from '../../src/engine/cards';
import { makeEnv } from '../../src/engine/core';
import { effectItems, makeEffectCtx } from '../../src/engine/ctx';
import { newFloorRecord } from '../../src/engine/history';
import { drain } from '../../src/engine/queue';
import { createStreams } from '../../src/engine/rng';
import { computeDamage, computeBlock } from '../../src/engine/damage';
import { effectTextValues, getEventOptions, renderEventOptionLabel, renderEventText, renderStatusText } from '../../src/engine/text';
import { validateEffects } from '../../src/engine/validate';
import { ENGINE_VERSION } from '../../src/engine/version';
import type { ClassDef, Effect, EventDef, GameEvent, RunState } from '../../src/engine/types';

// The real class definitions are already authored, but index.ts gates registration
// while the starter packs land. Read those exact definitions without registering
// any extra pack or importing tests/testpack (including indirectly via helpers).
vi.mock('../../src/content', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../src/content')>();
  return { ...real, getClassDef: (id: string): ClassDef => {
    if (real.allClasses().some((c) => c.id === id)) return real.getClassDef(id);
    const cls = real.CLASSES.find((c) => c.id === id);
    if (!cls) throw new Error(`unknown class '${id}'`);
    return cls;
  } };
});

// The assignment permits stand-ins solely for event encounter enemy ids. Use the
// real enemies as soon as their packs are registered; never shadow real content.
const eventEnemyIds = [...new Set(EVENT_ENCOUNTERS.flatMap((enc) => enc.enemies.map((slot) => typeof slot === 'string' ? slot : slot.id)))];
content.registerPack({ enemies: eventEnemyIds.filter((id) => !content.allEnemies().some((enemy) => enemy.id === id)).map((id) => ({
  id, name: `Event test stand-in: ${id}`, hp: [100, 100], icon: `enemy_${id}`,
  chooseMove: () => 'wait', moves: { wait: { name: 'Wait', intent: 'defend', effects: [] } },
})) });

const EVENT_IDS = [
  'ev_spore_choir', 'ev_drowned_shrine', 'ev_flickering_medpod', 'ev_hydroponic_bay', 'ev_scavenger_drone', 'ev_singing_geode',
  'ev_assembly_line', 'ev_engine_cult', 'ev_smelter', 'ev_oracle_terminal', 'ev_rigged_conveyor', 'ev_salvage_heap',
  'ev_your_echo', 'ev_void_lens', 'ev_tether_merchant', 'ev_crown_vault', 'ev_prism_garden', 'ev_immune_scan',
  'ev_wandering_artificer', 'ev_lost_climber', 'ev_memory_pool', 'ev_quiet_bench',
];
const ENCOUNTER_IDS = ['enc_event_spore_choir', 'enc_event_engine_cult', 'enc_event_echo', 'enc_event_antibodies'];
const STATUS_IDS = ['event_choir_setup', 'event_choir_vigor', 'event_echo_setup', 'event_echo_strength'];

function eventRoom(id: string, cls = 'graft', page: string | null = null, seed = `events-${id}`): Game {
  const def = content.getEventDef(id);
  const act = def.acts[0];
  if (!act) throw new Error(`event ${id} has no acts`);
  const s: RunState = {
    version: ENGINE_VERSION, seed, classId: cls, rng: createStreams(seed), act, ascent: 0, floor: 1, phase: 'event',
    player: { hp: 150, maxHp: 200, gold: 1000, deck: [], relics: [], potions: [], potionSlots: 10, counters: { shards: 5 } },
    map: { act, rows: [], bossEncounter: 'unused_by_event_sandbox' }, mapPos: null, room: 'event',
    combat: null, reward: null, shop: null, event: { id, page, chosen: null, done: false }, rest: null, treasure: null,
    startChoices: null, bossRelicChoices: null, queue: [], pendingChoice: null, history: { floors: [] },
    counters: { encounters: [], monstersThisAct: 0, eventsSeen: [], rarePity: 0, potionChance: 40, shopRemovals: 0 }, nextUid: 1,
  };
  const starter = content.getClassDef(cls);
  s.player.deck = starter.startingDeck.map((card) => makeCard(s, card));
  s.history.floors.push(newFloorRecord(s, 'event'));
  return new Game(s);
}

function prepare(g: Game, id: string, index: number): void {
  if (id === 'ev_lost_climber' && index === 0) g.state.player.potions = ['pot_mending_ampoule'];
  if (id === 'ev_tether_merchant' && index === 2) g.state.player.relics = [{ id: 'crown_fragment', counter: 0 }];
}

function settleChoices(g: Game): GameEvent[] {
  const events: GameEvent[] = [];
  for (let i = 0; i < 50; i++) {
    const pc = g.state.phase === 'combat' ? g.state.combat?.pendingChoice : g.state.pendingChoice;
    if (!pc) return events;
    const action = g.legalActions().find((a) => a.type === 'resolve_choice');
    if (!action) throw new Error(`no answer for ${pc.prompt}`);
    events.push(...g.apply(action));
  }
  throw new Error('event choices did not settle');
}

function choose(g: Game, index: number): GameEvent[] {
  const events = g.apply({ type: 'event_choice', index });
  events.push(...settleChoices(g));
  return events;
}

function finishEventCombat(g: Game): GameEvent[] {
  const c = g.state.combat;
  if (!c) throw new Error('expected event combat');
  const env = makeEnv(g.state);
  c.queue.push(...effectItems([{ type: 'lose_hp', amount: 10000, target: 'all_enemies' }], { src: { kind: 'system' }, self: 'player', target: null, x: 0 }));
  drain(env);
  env.events.push(...settleChoices(g));
  expect(g.state.phase).toBe('reward');
  expect(g.state.reward?.kind).toBe('event');
  return env.events;
}

function assertValid(effects: readonly Effect[], def: EventDef | typeof EVENT_STATUSES[number], combat = false): void {
  const errors: string[] = [];
  validateEffects(effects, { label: def.id, tables: def, hasTarget: false, combat, run: !combat, enemy: combat }, errors);
  expect(errors).toEqual([]);
}

function* walk(effects: readonly Effect[]): Generator<Effect> {
  for (const effect of effects) {
    yield effect;
    if (effect.type === 'choose') for (const option of effect.options) yield* walk(option.effects);
    if (effect.type === 'gamble') for (const outcome of effect.outcomes) yield* walk(outcome.effects);
    if (effect.type === 'conditional') { yield* walk(effect.then); yield* walk(effect.else ?? []); }
    if (effect.type === 'repeat' || effect.type === 'on_beat' || effect.type === 'spend_status') yield* walk(effect.effects);
    if (effect.type === 'start_combat') yield* walk(effect.onWin ?? []);
  }
}

const optionCases = EVENTS.flatMap((def) => [
  ...def.options.map((option, index) => ({ def, option, index, page: null as string | null })),
  ...Object.entries(def.pages ?? {}).flatMap(([page, data]) => data.options.map((option, index) => ({ def, option, index, page }))),
]);

function classFor(id: string, index: number): string {
  return (id === 'ev_oracle_terminal' && index === 2) || (id === 'ev_void_lens' && index === 1) ? 'chronist' : 'graft';
}

describe('event pack inventory and validation', () => {
  it('registers exactly the full designer event, encounter and status id lists', () => {
    expect(EVENTS).toHaveLength(22);
    expect(EVENTS.map((e) => e.id)).toEqual(EVENT_IDS);
    expect(EVENT_ENCOUNTERS).toHaveLength(4);
    expect(EVENT_ENCOUNTERS.map((e) => e.id)).toEqual(ENCOUNTER_IDS);
    expect(EVENT_STATUSES).toHaveLength(4);
    expect(EVENT_STATUSES.map((s) => s.id)).toEqual(STATUS_IDS);
    for (const def of EVENTS) expect(content.getEventDef(def.id)).toBe(def);
    for (const def of EVENT_ENCOUNTERS) expect(content.getEncounterDef(def.id)).toBe(def);
    for (const def of EVENT_STATUSES) expect(content.getStatusDef(def.id)).toBe(def);
    for (const act of [1, 2, 3] as const) {
      expect(EVENTS.filter((e) => e.acts.length === 1 && e.acts.includes(act))).toHaveLength(6);
    }
    expect(EVENTS.filter((e) => e.acts.length === 3)).toHaveLength(4);
  });

  it('checks every option and status with the engine DSL validator and every encounter reference', () => {
    for (const { def, option } of optionCases) assertValid(option.effects, def);
    for (const { def, option } of optionCases) if (option.next) expect(def.pages).toHaveProperty(option.next);
    for (const def of EVENT_STATUSES) {
      for (const effects of Object.values(def.triggers ?? {})) assertValid(effects, def, true);
      expect(renderStatusText(def.id, 1)).not.toMatch(/[{}]/);
    }
    for (const enc of EVENT_ENCOUNTERS) {
      expect(enc.pool).toBe('event');
      expect(enc.enemies.length).toBeGreaterThan(0);
      for (const slot of enc.enemies) expect(content.getEnemyDef(typeof slot === 'string' ? slot : slot.id).hp[0]).toBeGreaterThan(0);
    }
    // No anonymous or undeclared custom functions hide outside the defs' tables.
    for (const def of EVENTS) {
      const referenced = new Set([...def.options, ...Object.values(def.pages ?? {}).flatMap((p) => p.options)]
        .flatMap((option) => [...walk(option.effects)]).filter((e) => e.type === 'custom').map((e) => e.fn));
      expect([...referenced].sort()).toEqual(Object.keys(def.custom ?? {}).sort());
    }
  });
});

describe('every option and follow-up page resolves', () => {
  it.each(optionCases)('$def.id $page [$index]', ({ def, index, page }) => {
    const g = eventRoom(def.id, classFor(def.id, index), page);
    prepare(g, def.id, index);
    expect(renderEventText(def.id, page)).not.toMatch(/[{}]/);
    expect(renderEventOptionLabel(def.id, index, g.state, page)).not.toMatch(/[{}]/);
    expect(getEventOptions(g.state)[index]?.enabled).toBe(true);
    choose(g, index);
    if (g.state.phase === 'combat') finishEventCombat(g);
    // First conveyor pull deliberately opens the last-pull page.
    if (g.state.event?.page === 'second_pull' && !g.state.event.done) choose(g, 1);
    expect(g.state.pendingChoice).toBeNull();
    expect(g.state.queue).toEqual([]);
    g.apply({ type: 'proceed' });
    expect(g.state.phase).toBe('map');
  });
});

const goldGates = [
  ['ev_drowned_shrine', 1, 50, null], ['ev_scavenger_drone', 0, 30, null], ['ev_smelter', 1, 60, null],
  ['ev_oracle_terminal', 1, 40, null], ['ev_rigged_conveyor', 0, 30, null], ['ev_rigged_conveyor', 0, 50, 'second_pull'],
  ['ev_tether_merchant', 1, 70, null], ['ev_immune_scan', 2, 25, null], ['ev_lost_climber', 1, 40, null],
] as const;

describe('availability and option conditions', () => {
  it.each(goldGates)('%s[%i] requires %i gold (page %s)', (id, index, amount, page) => {
    const g = eventRoom(id, 'graft', page);
    g.state.player.gold = amount - 1;
    const before = g.save();
    expect(getEventOptions(g.state)[index]?.enabled).toBe(false);
    expect(getEventOptions(g.state)[index]?.reason).toBeTruthy();
    expect(() => g.apply({ type: 'event_choice', index })).toThrow(/illegal action/);
    expect(g.save()).toBe(before);
    g.state.player.gold = amount;
    expect(getEventOptions(g.state)[index]?.enabled).toBe(true);
    choose(g, index);
  });

  it.each([['ev_singing_geode', 1, 2], ['ev_wandering_artificer', 1, 1], ['ev_tether_merchant', 0, 1]] as const)('%s[%i] requires %i Shards', (id, index, n) => {
    const g = eventRoom(id);
    g.state.player.counters.shards = n - 1;
    expect(getEventOptions(g.state)[index]?.enabled).toBe(false);
    g.state.player.counters.shards = n;
    expect(getEventOptions(g.state)[index]?.enabled).toBe(true);
    choose(g, index);
  });

  it('requires a potion to share, and a non-starter relic to trade', () => {
    const climber = eventRoom('ev_lost_climber');
    expect(getEventOptions(climber.state)[0]?.enabled).toBe(false);
    climber.state.player.potions = ['pot_mending_ampoule'];
    expect(getEventOptions(climber.state)[0]?.enabled).toBe(true);
    choose(climber, 0);
    expect(climber.state.player.potions).toEqual([]);
    expect(climber.state.player.gold).toBe(1025);
    expect(climber.state.player.counters.shards).toBe(6);
    const merchant = eventRoom('ev_tether_merchant');
    for (const id of ['riven_gauntlet', 'heartseed', 'chrono_lens']) {
      merchant.state.player.relics = [{ id, counter: 0 }];
      expect(getEventOptions(merchant.state)[2]?.enabled).toBe(false);
    }
    merchant.state.player.relics = [{ id: 'crown_fragment', counter: 0 }];
    choose(merchant, 2);
    expect(merchant.state.player.relics).toEqual([]);
    expect(merchant.state.player.counters.shards).toBe(8);
  });

  it('gates Oracle Terminal and Void Lens by class', () => {
    for (const cls of ['breaker', 'graft', 'chronist']) {
      const oracle = eventRoom('ev_oracle_terminal', cls);
      expect(getEventOptions(oracle.state).map((o) => o.enabled)).toEqual(cls === 'chronist' ? [false, false, true, true] : [true, true, false, true]);
      const lens = eventRoom('ev_void_lens', cls);
      expect(getEventOptions(lens.state).map((o) => o.enabled)).toEqual(cls === 'chronist' ? [false, true, true, true] : [true, false, true, true]);
    }
  });

  it('Feed the grafts requires Graft and any Bloom card, including ungrown copies', () => {
    const g = eventRoom('ev_hydroponic_bay');
    for (const card of content.allCards()) {
      g.state.player.deck = [makeCard(g.state, card.id)];
      expect(getEventOptions(g.state)[2]?.enabled, card.id).toBe(card.keywords?.includes('bloom') ?? false);
    }
    g.state.player.deck = [makeCard(g.state, 'seed_bite')];
    for (const cls of ['breaker', 'chronist']) {
      g.state.classId = cls;
      expect(getEventOptions(g.state)[2]?.enabled).toBe(false);
    }
    g.state.classId = 'graft';
    choose(g, 2);
    expect(g.state.player.deck[0]?.vars?.bloom).toBe(3);
    expect(g.state.player.hp).toBe(142);
  });

  it.each([69, 70, 139, 140, 500])('buy options at %i gold filter unaffordable quantities', (gold) => {
    const g = eventRoom('ev_tether_merchant');
    g.state.player.gold = gold;
    if (gold < 70) {
      expect(getEventOptions(g.state)[1]?.enabled).toBe(false);
      return;
    }
    g.apply({ type: 'event_choice', index: 1 });
    const pc = g.state.pendingChoice;
    expect(pc?.choices).toEqual(gold < 140 ? [0] : [0, 1]);
    expect(pc?.labels.join(' ')).not.toMatch(/[{}]/);
    const index = gold < 140 ? 0 : 1;
    g.apply({ type: 'resolve_choice', uids: [index] });
    expect(g.state.player.gold).toBe(gold - 70 * (index + 1));
    expect(g.state.player.counters.shards).toBe(5 + index + 1);
  });

  it.each([1, 2, 5, 10])('sell custom allows every quantity from one through %i Shards', (shards) => {
    for (let n = 1; n <= shards; n++) {
      const g = eventRoom('ev_tether_merchant');
      g.state.player.counters.shards = shards;
      g.apply({ type: 'event_choice', index: 0 });
      expect(g.state.pendingChoice?.choices).toHaveLength(shards);
      expect(g.state.pendingChoice?.labels.join(' ')).not.toMatch(/[{}]/);
      g.apply({ type: 'resolve_choice', uids: [n - 1] });
      expect(g.state.player.counters.shards).toBe(shards - n);
      expect(g.state.player.gold).toBe(1000 + 45 * n);
    }
  });
});

describe('seeded gambles and conveyor pages', () => {
  it('prints the exact odds, which sum to one hundred for every gamble', () => {
    let count = 0;
    for (const { def, option, index, page } of optionCases) {
      for (const e of walk(option.effects)) {
        if (e.type !== 'gamble') continue;
        count++;
        expect(e.outcomes.reduce((sum, o) => sum + o.weight, 0)).toBe(100);
        expect(e.outcomes.every((o) => o.weight > 0)).toBe(true);
        const values = effectTextValues(null, [e]);
        expect(e.outcomes.map((_, i) => values[`gamble_${i + 1}`])).toEqual(e.outcomes.map((o) => o.weight));
        const label = renderEventOptionLabel(def.id, index, null, page);
        for (const outcome of e.outcomes) expect(label).toContain(`${outcome.weight}%`);
      }
    }
    expect(count).toBe(3); // med-pod and both conveyor pulls
  });

  it.each([
    ['ev_flickering_medpod', null, ['The green light holds. You feel whole.', 'Red light floods the pod. Something burns.']],
    ['ev_rigged_conveyor', null, ['An intact relic rolls down the belt.', 'The machine pays out.', 'The machine records a debt.']],
    ['ev_rigged_conveyor', 'second_pull', ['An intact relic rolls down the belt.', 'The machine pays out.', 'The machine records a debt.']],
  ] as const)('%s page %s rolls only when chosen and reaches every branch', (id, page, labels) => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 200 && seen.size < labels.length; seed++) {
      const g = eventRoom(id, 'graft', page, `event-gamble-${seed}`);
      const before = structuredClone(g.state.rng);
      getEventOptions(g.state);
      g.legalActions();
      expect(g.state.rng).toEqual(before);
      const twin = Game.load(g.save());
      const result = choose(g, 0);
      expect(choose(twin, 0)).toEqual(result);
      expect(twin.save()).toEqual(g.save());
      expect(g.state.rng.event).not.toEqual(before.event);
      for (const event of result) if (event.t === 'text' && labels.some((label) => label === event.text)) seen.add(event.text);
      if (id === 'ev_flickering_medpod') {
        if (g.state.player.maxHp === 200) expect(g.state.player.hp).toBe(200);
        else expect([g.state.player.hp, g.state.player.maxHp]).toEqual([150, 194]);
      } else if (g.state.player.deck.some((card) => card.id === 'curse_debt_mark')) {
        expect(g.state.player.gold).toBe(page === null ? 970 : 950);
      }
    }
    expect([...seen].sort()).toEqual([...labels].sort());
  });

  it('allows exactly two conveyor pulls, charges the higher second price, and permits leaving between them', () => {
    const g = eventRoom('ev_rigged_conveyor');
    choose(g, 0);
    expect(g.state.event).toMatchObject({ page: 'second_pull', chosen: null, done: false });
    g.state.player.gold = 49;
    expect(getEventOptions(g.state)[0]?.enabled).toBe(false);
    g.state.player.gold = 50;
    const events = choose(g, 0);
    expect(events.filter((e) => e.t === 'gold')[0]).toMatchObject({ delta: -50 });
    expect(g.state.event?.done).toBe(true);
    expect(g.legalActions().filter((a) => a.type === 'event_choice')).toEqual([]);
    const leave = eventRoom('ev_rigged_conveyor');
    choose(leave, 0);
    const gold = leave.state.player.gold;
    const rng = structuredClone(leave.state.rng.event);
    choose(leave, 1);
    expect(leave.state.player.gold).toBe(gold);
    expect(leave.state.rng.event).toEqual(rng);
    expect(leave.state.event?.done).toBe(true);
  });
});

describe('custom functions and permanent outcomes', () => {
  it('Assembly Line rolls distinct, shared offers; takes one or exactly the same three plus Seized Joint', () => {
    const one = eventRoom('ev_assembly_line');
    const all = eventRoom('ev_assembly_line');
    one.apply({ type: 'event_choice', index: 0 });
    const offers = one.state.pendingChoice?.offers;
    expect(offers).toHaveLength(3);
    if (!offers) throw new Error('missing Assembly Line offers');
    expect(new Set(offers.map((o) => o.id)).size).toBe(3);
    expect(offers.every((o) => content.getCardDef(o.id).cls === 'colorless')).toBe(true);
    const original = one.state.player.deck.length;
    one.apply({ type: 'resolve_choice', uids: [2] });
    expect(one.state.player.deck).toHaveLength(original + 1);
    expect(one.state.player.deck.at(-1)?.id).toBe(offers[2]?.id);
    choose(all, 1);
    expect(all.state.player.deck.slice(original).map((c) => c.id)).toEqual([...offers.map((o) => o.id), 'curse_seized_joint']);
    expect(one.state.rng.reward).toEqual(all.state.rng.reward);
  });

  it('Assembly Line implements the seventy/thirty boundary independently for each offer slot', () => {
    for (const roll of [70, 71]) {
      const g = eventRoom('ev_assembly_line');
      const ctx = makeEffectCtx(makeEnv(g.state), { source: { kind: 'event', id: 'ev_assembly_line' }, owner: 'player', stacks: 0, relic: null, target: null, card: null, x: 0 });
      const int = vi.spyOn(ctx.rng, 'int').mockImplementation((stream, lo, hi) => {
        expect([stream, lo, hi]).toEqual(['reward', 1, 100]);
        return roll;
      });
      const fn = content.getEventDef('ev_assembly_line').custom?.assembly_tools;
      if (!fn) throw new Error('missing assembly_tools');
      fn(ctx);
      expect(int).toHaveBeenCalledTimes(3);
      expect(g.state.pendingChoice?.offers).toHaveLength(3);
      for (const offer of g.state.pendingChoice?.offers ?? []) {
        expect(content.getCardDef(offer.id).rarity).toBe(roll === 70 ? 'uncommon' : 'rare');
      }
      int.mockRestore();
    }
  });

  it('Oracle custom picker includes exactly the unupgraded Delay or on-beat cards', () => {
    const g = eventRoom('ev_oracle_terminal', 'chronist');
    g.state.player.deck = content.allCards().map((def) => makeCard(g.state, def.id));
    const upgraded = makeCard(g.state, 'tick', true);
    g.state.player.deck.push(upgraded);
    const expected = g.state.player.deck.filter((card) => {
      const def = content.getCardDef(card.id);
      return !card.upgraded && (def.delay !== undefined || def.tags?.includes('on_beat'));
    }).map((card) => card.uid);
    g.apply({ type: 'event_choice', index: 2 });
    expect(g.state.pendingChoice?.choices).toEqual(expected);
    const selected = expected.at(-1);
    if (selected === undefined) throw new Error('no timing cards');
    g.apply({ type: 'resolve_choice', uids: [selected] });
    expect(g.state.player.deck.find((card) => card.uid === selected)?.upgraded).toBe(true);
    expect(g.state.player.hp).toBe(145);
    const empty = eventRoom('ev_oracle_terminal', 'chronist');
    empty.state.player.deck = [makeCard(empty.state, 'pulse_shot')];
    choose(empty, 2);
    expect(empty.state.pendingChoice).toBeNull();
  });

  it('Immune Scan removes every removable curse while retaining Bound Burden and ordinary cards', () => {
    const g = eventRoom('ev_immune_scan');
    const curseIds = content.allCards().filter((d) => d.type === 'curse').map((d) => d.id);
    expect(curseIds).toHaveLength(8);
    const original = g.state.player.deck.length;
    g.state.player.deck.push(...curseIds.map((id) => makeCard(g.state, id)));
    choose(g, 0);
    expect(g.state.player.deck.filter((c) => content.getCardDef(c.id).type === 'curse').map((c) => c.id)).toEqual(['curse_burden']);
    expect(g.state.player.deck).toHaveLength(original + 1);
    expect(g.state.player.hp).toBe(135);
  });

  it('Echo duplication keeps the upgrade and resets the new copy to no Bloom', () => {
    const g = eventRoom('ev_your_echo');
    const original = makeCard(g.state, 'seed_bite', true);
    original.vars = { bloom: 6 };
    g.state.player.deck = [original];
    choose(g, 1);
    expect(g.state.player.maxHp).toBe(192);
    expect(g.state.player.deck).toHaveLength(2);
    expect(g.state.player.deck[0]?.vars?.bloom).toBe(6);
    expect(g.state.player.deck[1]).toMatchObject({ id: 'seed_bite', upgraded: true });
    expect(g.state.player.deck[1]?.vars?.bloom ?? 0).toBe(0);
  });

  it('Prism Garden chooses up to three cards and upgrades each Transmute result', () => {
    const g = eventRoom('ev_prism_garden');
    g.apply({ type: 'event_choice', index: 0 });
    expect(g.state.pendingChoice).toMatchObject({ min: 1, max: 3 });
    const uids = g.state.pendingChoice?.choices.slice(0, 3);
    if (!uids) throw new Error('missing Transmute choice');
    g.apply({ type: 'resolve_choice', uids });
    const before = new Set(g.state.player.deck.map((c) => c.uid));
    const events = settleChoices(g);
    expect(g.state.player.hp).toBe(138);
    expect(g.state.player.deck.filter((c) => !before.has(c.uid))).toHaveLength(3);
    expect(g.state.player.deck.filter((c) => !before.has(c.uid)).every((c) => c.upgraded)).toBe(true);
    expect(events.filter((e) => e.t === 'card_removed')).toHaveLength(3);
  });

  it('Quiet Bench heals a floored quarter of Max HP', () => {
    const g = eventRoom('ev_quiet_bench');
    g.state.player.maxHp = 83;
    g.state.player.hp = 20;
    choose(g, 0);
    expect(g.state.player.hp).toBe(40);
  });
});

describe('event combats, victory extras and event status hooks', () => {
  const fights = [
    ['ev_spore_choir', 0, 'enc_event_spore_choir'], ['ev_engine_cult', 1, 'enc_event_engine_cult'],
    ['ev_your_echo', 0, 'enc_event_echo'], ['ev_immune_scan', 1, 'enc_event_antibodies'],
  ] as const;
  it.each(fights)('%s[%i] starts %s and pays the designed victory extra', (id, index, encounter) => {
    const g = eventRoom(id);
    choose(g, index);
    expect(g.state.phase).toBe('combat');
    expect(g.state.combat).toMatchObject({ encounterId: encounter, kind: 'event', eventId: id });
    expect(g.state.combat?.enemies.map((e) => e.id)).toEqual(content.getEncounterDef(encounter).enemies);
    const effects = [...walk(content.getEventDef(id).options[index]?.effects ?? [])];
    expect(effects.some((e) => e.type === 'start_combat' && e.encounterId === encounter)).toBe(true);
    const events = finishEventCombat(g);
    if (id === 'ev_spore_choir' || id === 'ev_engine_cult') {
      const expectedRarity = id === 'ev_spore_choir' ? 'common' : 'uncommon';
      const gained = events.filter((e) => e.t === 'relic_gained');
      expect(gained).toHaveLength(1);
      expect(content.getRelicDef(gained[0]!.relic).rarity).toBe(expectedRarity);
    } else if (id === 'ev_your_echo') expect(g.state.player.deck.filter((c) => c.upgraded)).toHaveLength(3);
    else expect(g.state.player.counters.shards).toBe(6);
  });

  it.each([
    ['ev_spore_choir', 'event_choir_setup', 'event_choir_vigor', 120],
    ['ev_your_echo', 'event_echo_setup', 'event_echo_strength', 70],
  ] as const)('%s applies the one-combat scaling and consumes its setup flag/status', (id, setup, passive, pct) => {
    const g = eventRoom(id);
    choose(g, 0);
    const combat = g.state.combat;
    if (!combat) throw new Error('missing scaled event combat');
    expect(g.state.player.counters[`combat_start_status:${setup}`]).toBe(0);
    expect(combat.player.statuses[setup]).toBeUndefined();
    for (const enemy of combat.enemies) {
      const hp = content.getEnemyDef(enemy.id).hp;
      const possible = Array.from({ length: hp[1] - hp[0] + 1 }, (_, i) => Math.floor((hp[0] + i) * pct / 100));
      expect(possible).toContain(enemy.maxHp);
      expect(enemy.hp).toBe(enemy.maxHp);
      expect(enemy.statuses[passive]).toBe(1);
      if (id === 'ev_your_echo') {
        expect(computeDamage(g.state, { source: enemy.uid, target: 'player', card: null, tags: [] }, 10, false)).toBe(7);
        expect(computeBlock(g.state, enemy.uid, 10, false, { pool: 'block', tags: [] })).toBe(7);
        expect(computeBlock(g.state, enemy.uid, 10, false, { pool: 'guard', tags: [] })).toBe(7);
      }
    }
    finishEventCombat(g);
    g.state.event = { id: 'ev_engine_cult', page: null, chosen: null, done: false };
    g.state.phase = 'event';
    choose(g, 1);
    expect(g.state.combat?.player.statuses[setup]).toBeUndefined();
    expect(g.state.combat?.enemies.every((e) => e.statuses[passive] === undefined)).toBe(true);
  });
});
