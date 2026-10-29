import '../testpack-only';
import { beforeAll, describe, expect, it } from 'vitest';
import { allEvents, allRelics } from '../../src/content';
import { Game, TUNING, computeIntent, getEventOptions, nextNodes, type Action, type RoomType, type RunState } from '../../src/engine';
import { enqueue, makeEnv } from '../../src/engine/core';
import { newFloorRecord } from '../../src/engine/history';
import { drain } from '../../src/engine/queue';
import { combatOf, enemy, enemyUids, eventsOf, play, sandbox, setHand } from './helpers';
import { registerFixtures } from './fixtures';

beforeAll(registerFixtures);

/** A fresh run on the map, then forced into `room`. */
function inRoom(room: RoomType, seed = 'room', prep: (g: Game) => void = () => {}): Game {
  const g = Game.newRun(seed, 'test_class');
  prep(g);
  const s = g.state;
  s.startChoices = null;
  s.phase = 'map';
  s.floor = 1;
  s.room = room;
  s.history.floors.push(newFloorRecord(s, room));
  const env = makeEnv(s);
  enqueue(env, [{ kind: 'step', step: { op: 'enter_room' } }]);
  drain(env);
  return g;
}

function killAll(g: Game): ReturnType<Game['apply']> {
  for (const e of combatOf(g).enemies) e.hp = 1;
  let events: ReturnType<Game['apply']> = [];
  for (const t of enemyUids(g)) {
    const [s] = setHand(g, ['fx_hit7']);
    events = play(g, s as number, t);
  }
  return events;
}

describe('run flow', () => {
  it('newRun: start phase with up to 3 distinct boons, map generated, starting deck', () => {
    const g = Game.newRun('new', 'test_class');
    const s = g.state;
    expect(s.phase).toBe('start');
    expect(s.startChoices).toHaveLength(3);
    expect(new Set(s.startChoices?.map((b) => b.id)).size).toBe(3);
    expect(s.player.deck.map((c) => c.id).sort()).toEqual(
      ['test_beat', 'test_block', 'test_block', 'test_brace', 'test_graft', 'test_parry', 'test_sprout', 'test_strike', 'test_strike', 'test_strike', 'test_strike', 'test_tock'],
    );
    expect(new Set(s.player.deck.map((c) => c.uid)).size).toBe(12);
    expect(s.ascent).toBe(0);
    expect(s.player.counters.shards).toBe(0);
    expect(g.legalActions()).toEqual([0, 1, 2].map((index) => ({ type: 'choose_start_boon', index })));
    expect(() => Game.newRun('x', 'nope')).toThrow(/unknown class/);
  });

  it('travel enters the node and starts combat; winning gives rewards and records history', () => {
    const g = Game.newRun('travel', 'test_class');
    g.state.startChoices = [{ id: 'test_boon_gold' }];
    g.apply({ type: 'choose_start_boon', index: 0 });
    expect(g.state.player.gold).toBe(199);
    const legal = g.legalActions();
    expect(legal.filter((a) => a.type === 'travel')).toHaveLength(nextNodes(g.state.map, null).length);
    const travel = legal[0] as Action;
    const ev = g.apply(travel);
    expect(eventsOf(ev, 'phase').map((p) => p.phase)).toContain('combat');
    expect(g.state.floor).toBe(1);
    expect(g.state.room).toBe('monster');
    const rec = g.state.history.floors[1];
    expect(rec?.encounterId).toMatch(/^test_enc_/);
    expect(rec?.enemies.length).toBeGreaterThan(0);

    const won = killAll(g);
    expect(eventsOf(won, 'combat_won')).toHaveLength(1);
    expect(g.state.phase).toBe('reward');
    expect(g.state.combat).toBeNull();
    const r = g.state.reward;
    expect(r?.cards.length).toBe(3);
    expect(r?.gold).toBeGreaterThanOrEqual(TUNING.gold.monster[1][0]);
    expect(g.state.history.floors[1]?.cardsOffered).toHaveLength(3);
    expect(g.state.history.floors[1]?.turns).toBe(1);

    g.apply({ type: 'pick_reward', kind: 'gold' });
    g.apply({ type: 'pick_reward', kind: 'card', index: 1 });
    expect(g.state.player.deck).toHaveLength(13);
    expect(g.legalActions().some((a) => a.type === 'pick_reward' && a.kind === 'card')).toBe(false);
    g.apply({ type: 'proceed' });
    expect(g.state.phase).toBe('map');
    expect(g.state.history.floors[1]?.cardPicked).toBe(r?.cards[1]?.id);
  });

  it('proceeding with an unpicked card reward counts as a skip', () => {
    const g = sandbox();
    killAll(g);
    g.apply({ type: 'proceed' });
    expect(g.state.history.floors.at(-1)?.cardSkipped).toBe(true);
  });

  it('elite fights drop a relic; relic hooks fire (onCombatStart heal, onCardPlayed counter)', () => {
    const g = sandbox({ encounter: 'test_enc_elite', elite: true });
    ownAllRelicsExcept(g.state, 'test_relic_vial');
    killAll(g);
    expect(g.state.reward?.relic).toBe('test_relic_vial');
    g.apply({ type: 'pick_reward', kind: 'relic' });
    expect(g.state.player.relics.map((r) => r.id)).toContain('test_relic_vial');

    const h = sandbox({ relics: ['test_relic_vial', 'test_relic_counter'], seed: 'hooks' });
    // vial healed at combat start only if damaged: set up a damaged player and a new combat
    expect(h.state.player.hp).toBe(70);
    pacifyAll(h);
    const hand = setHand(h, ['test_strike', 'test_strike', 'test_strike']);
    const [t] = enemyUids(h);
    combatOf(h).energy = 3;
    play(h, hand[0] as number, t);
    play(h, hand[1] as number, t);
    expect(h.state.player.relics.find((r) => r.id === 'test_relic_counter')?.counter).toBe(2);
    const ev = play(h, hand[2] as number, t);
    expect(eventsOf(ev, 'relic_trigger')).toEqual([{ t: 'relic_trigger', relic: 'test_relic_counter' }]);
    expect(eventsOf(ev, 'block')).toEqual([{ t: 'block', target: 'player', amount: 4, pool: 'block' }]);
    expect(h.state.player.relics.find((r) => r.id === 'test_relic_counter')?.counter).toBe(0);

    const v = Game.newRun('vial', 'test_class');
    v.state.player.relics = [{ id: 'test_relic_vial', counter: 0 }];
    v.state.player.hp = 40;
    v.state.startChoices = [{ id: 'test_boon_gold' }];
    v.apply({ type: 'choose_start_boon', index: 0 });
    const enter = v.apply(v.legalActions()[0] as Action);
    expect(eventsOf(enter, 'relic_trigger')).toEqual([{ t: 'relic_trigger', relic: 'test_relic_vial' }]);
    expect(eventsOf(enter, 'heal')).toEqual([{ t: 'heal', target: 'player', amount: 2 }]);
    expect(v.state.player.hp).toBe(42);
  });

  it('conditional on target_dead resolves after the fight is won (gold on kill)', () => {
    const g = sandbox();
    const [fin] = setHand(g, ['test_finisher']);
    const [t] = enemyUids(g);
    enemy(g, t as number).hp = 3;
    const gold = g.state.player.gold;
    const ev = play(g, fin as number, t);
    expect(eventsOf(ev, 'gold')).toEqual([{ t: 'gold', delta: 10, now: gold + 10 }]);
    expect(g.state.phase).toBe('reward');
  });

  it('player death -> defeat; an onDeath relic can revive', () => {
    const g = sandbox();
    const [t] = enemyUids(g);
    enemy(g, t as number).intent = computeIntent(g.state, enemy(g, t as number), 'tackle');
    g.state.player.hp = 3;
    setHand(g, []);
    const ev = g.apply({ type: 'end_turn' });
    expect(eventsOf(ev, 'player_died')).toHaveLength(1);
    expect(g.state.phase).toBe('defeat');
    expect(g.legalActions()).toEqual([]);
    expect(() => g.apply({ type: 'end_turn' })).toThrow(/illegal/);

    const r = sandbox({ relics: ['fx_phoenix'] });
    const [t2] = enemyUids(r);
    enemy(r, t2 as number).intent = computeIntent(r.state, enemy(r, t2 as number), 'tackle');
    r.state.player.hp = 3;
    setHand(r, []);
    const ev2 = r.apply({ type: 'end_turn' });
    expect(eventsOf(ev2, 'player_died')).toHaveLength(0);
    expect(eventsOf(ev2, 'relic_trigger')).toEqual([{ t: 'relic_trigger', relic: 'fx_phoenix' }]);
    expect(r.state.player.hp).toBe(10);
    expect(r.state.phase).toBe('combat');
  });

  it('potions: enemy-targeted in combat, non-combat potion usable on the map', () => {
    const g = sandbox();
    pacifyAll(g);
    g.state.player.potions = ['test_potion_fire', 'test_potion_heal'];
    const [t] = enemyUids(g);
    const legal = g.legalActions().filter((a) => a.type === 'use_potion');
    expect(legal).toEqual([
      { type: 'use_potion', index: 0, target: t },
      { type: 'use_potion', index: 1 },
    ]);
    const ev = g.apply({ type: 'use_potion', index: 0, target: t as number });
    expect(eventsOf(ev, 'potion_used')).toEqual([{ t: 'potion_used', potion: 'test_potion_fire' }]);
    expect(eventsOf(ev, 'damage')[0]?.amount).toBe(20);
    expect(g.state.player.potions).toEqual(['test_potion_heal']);

    const m = Game.newRun('pot', 'test_class');
    m.state.startChoices = [{ id: 'test_boon_gold' }];
    m.apply({ type: 'choose_start_boon', index: 0 });
    m.state.player.potions = ['test_potion_fire', 'test_potion_heal'];
    m.state.player.hp = 30;
    expect(m.legalActions().filter((a) => a.type === 'use_potion')).toEqual([{ type: 'use_potion', index: 1 }]);
    m.apply({ type: 'use_potion', index: 1 });
    expect(m.state.player.hp).toBe(40);
  });

  it('shop: buy card / relic / potion, remove a card, prices escalate', () => {
    const g = inRoom('shop');
    expect(g.state.phase).toBe('shop');
    g.state.player.gold = 2000;
    const sh = g.state.shop;
    expect(sh?.cards.length).toBeGreaterThanOrEqual(5);
    expect(sh?.potions).toHaveLength(3);
    expect(sh?.removePrice).toBe(75);
    g.apply({ type: 'shop_buy', kind: 'card', index: 0 });
    expect(g.state.player.deck).toHaveLength(13);
    expect(() => g.apply({ type: 'shop_buy', kind: 'card', index: 0 })).toThrow(/illegal/);
    if ((g.state.shop?.relics.length ?? 0) > 0) g.apply({ type: 'shop_buy', kind: 'relic', index: 0 });
    g.apply({ type: 'shop_buy', kind: 'potion', index: 0 });
    expect(g.state.player.potions).toHaveLength(1);
    const uid = g.state.player.deck[0]?.uid as number;
    g.apply({ type: 'shop_remove', uid, pay: 'gold' });
    expect(g.state.player.deck.some((c) => c.uid === uid)).toBe(false);
    expect(g.legalActions().some((a) => a.type === 'shop_remove')).toBe(false);
    g.apply({ type: 'proceed' });
    expect(g.state.phase).toBe('map');
    expect(g.state.counters.shopRemovals).toBe(1);
    const g2 = inRoom('shop', 'shop2', (x) => {
      x.state.counters.shopRemovals = 2;
    });
    expect(g2.state.shop?.removePrice).toBe(75 + 2 * 25);
  });

  it('shop: cannot buy without gold or slots', () => {
    const g = inRoom('shop', 'poor');
    g.state.player.gold = 0;
    expect(g.legalActions()).toEqual([{ type: 'proceed' }]);
  });

  it('rest: heal 30% or smith or a rest special; then only proceed', () => {
    const g = inRoom('rest');
    g.state.player.hp = 10;
    g.apply({ type: 'rest' });
    expect(g.state.player.hp).toBe(10 + Math.floor(70 * 0.3));
    expect(g.legalActions()).toEqual([{ type: 'proceed' }]);

    const s = inRoom('rest', 'smith');
    const uid = s.state.player.deck[0]?.uid as number;
    s.apply({ type: 'smith', uid });
    expect(s.state.player.deck[0]?.upgraded).toBe(true);
    expect(s.state.history.floors.at(-1)?.cardsUpgraded).toEqual([s.state.player.deck[0]?.id]);

    const t = inRoom('rest', 'trim');
    expect([...(t.state.rest?.specials ?? [])].sort()).toEqual(['rest_purge', 'rest_transmute', 'test_rest_trim']);
    t.apply({ type: 'rest_special', index: t.state.rest?.specials.indexOf('test_rest_trim') ?? -1 });
    expect(t.state.pendingChoice?.from).toBe('deck');
    t.apply(t.legalActions()[0] as Action);
    expect(t.state.player.deck).toHaveLength(11);
    expect(t.legalActions()).toEqual([{ type: 'proceed' }]);
  });

  it('events: options render from numbers, availability gates, outcome applies, then proceed', () => {
    const g = inRoom('event', 'ev');
    expect(g.state.phase).toBe('event');
    const id = g.state.event?.id;
    g.state.event = { id: 'test_event_shrine', page: null, chosen: null, done: false };
    expect(getEventOptions(g.state)).toEqual([
      { label: 'Offer blood: lose 5 HP, gain 3 Max HP.', enabled: true, reason: null },
      { label: 'Pray: gain 50 gold.', enabled: true, reason: null },
    ]);
    g.apply({ type: 'event_choice', index: 0 });
    expect(g.state.player.maxHp).toBe(73);
    expect(g.state.player.hp).toBe(68);
    expect(g.legalActions()).toEqual([{ type: 'proceed' }]);
    g.apply({ type: 'proceed' });
    expect(g.state.phase).toBe('map');
    expect(id).toMatch(/^test_event_/);

    const f = inRoom('event', 'forge');
    f.state.event = { id: 'test_event_forge', page: null, chosen: null, done: false };
    f.state.player.deck = f.state.player.deck.slice(0, 1);
    expect(getEventOptions(f.state)[1]).toEqual({ label: 'Melt a card: remove a card from your deck.', enabled: false, reason: 'Your deck is too small.' });
    expect(f.legalActions()).toEqual([{ type: 'event_choice', index: 0 }]);
    f.apply({ type: 'event_choice', index: 0 });
    // a single upgradable card: upgraded without a prompt
    expect(f.state.player.deck[0]?.upgraded).toBe(true);
  });

  it('exhausted event pool turns ? rooms into fights', () => {
    const g = Game.newRun('evpool', 'test_class');
    g.state.counters.eventsSeen = allEvents().map((e) => e.id);
    const s = g.state;
    s.startChoices = null;
    s.phase = 'map';
    s.room = 'event';
    s.history.floors.push(newFloorRecord(s, 'event'));
    const env = makeEnv(s);
    enqueue(env, [{ kind: 'step', step: { op: 'enter_room' } }]);
    drain(env);
    expect(g.state.phase).toBe('combat');
    expect(g.state.room).toBe('monster');
  });

  it('treasure: open gives gold and a relic (or nothing when the pool is empty)', () => {
    const g = inRoom('treasure', 'room', (x) => ownAllRelicsExcept(x.state, 'test_relic_vial'));
    expect(g.legalActions()).toEqual([{ type: 'open_treasure' }]);
    const gold = g.state.player.gold;
    g.apply({ type: 'open_treasure' });
    expect(g.state.player.gold).toBeGreaterThan(gold);
    expect(g.state.player.relics.map((r) => r.id)).toContain('test_relic_vial');
    expect(g.legalActions()).toEqual([{ type: 'proceed' }]);
    const e = inRoom('treasure', 'empty');
    ownAllRelicsExcept(e.state, null);
    const ev = e.apply({ type: 'open_treasure' });
    expect(eventsOf(ev, 'text')).toEqual([{ t: 'text', text: 'The chest is empty.' }]);
  });

  it('boss: reward, then boss relic choice, then act 2 with heal and a new map; act 3 boss = victory', () => {
    const g = sandbox({ encounter: 'test_enc_boss', boss: true });
    g.state.room = 'boss';
    ownAllRelicsExcept(g.state, 'test_relic_counter');
    killAll(g);
    expect(g.state.phase).toBe('reward');
    g.apply({ type: 'proceed' });
    expect(g.state.phase).toBe('boss_reward');
    expect(g.state.bossRelicChoices).toEqual(['test_relic_counter']);
    g.state.player.hp = 30;
    const oldMap = JSON.stringify(g.state.map);
    g.apply({ type: 'choose_boss_relic', index: 0 });
    expect(g.state.act).toBe(2);
    expect(g.state.phase).toBe('map');
    expect(g.state.mapPos).toBeNull();
    expect(g.state.player.hp).toBe(30 + Math.floor((40 * 75) / 100));
    expect(JSON.stringify(g.state.map)).not.toBe(oldMap);
    expect(g.state.map.act).toBe(2);

    const v = sandbox({ encounter: 'test_enc_boss', boss: true, seed: 'v' });
    v.state.act = 3;
    const ev = killAll(v);
    expect(eventsOf(ev, 'phase').map((p) => p.phase)).toContain('victory');
    expect(v.state.phase).toBe('victory');
    expect(v.legalActions()).toEqual([]);
  });
});

/** Own every droppable relic except `keep` (content-agnostic relic pools). No onPickup hooks run. */
function ownAllRelicsExcept(s: RunState, keep: string | null): void {
  s.player.relics = allRelics()
    .filter((r) => r.id !== keep && r.rarity !== 'starter')
    .map((r) => ({ id: r.id, counter: 0 }));
}

function pacifyAll(g: Game): void {
  for (const e of combatOf(g).enemies) {
    e.hp = 999;
    e.maxHp = 999;
  }
}
