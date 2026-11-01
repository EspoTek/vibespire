// BUG-2 (docs/v2/bugs.md): a price-changing relic bought in a shop must re-price that same shop.
import { describe, expect, it } from 'vitest';
import { Game, TUNING, type RunState } from '../../src/engine';
import { enqueue, makeEnv } from '../../src/engine/core';
import { newFloorRecord } from '../../src/engine/history';
import { drain } from '../../src/engine/queue';

/** A real-content run forced into a shop with `relic` on the first relic shelf, lots of gold and Shards. */
function shopWith(relic: string, prep: (s: RunState) => void = () => {}): Game {
  const g = Game.newRun('shop-reprice', 'breaker');
  const s = g.state;
  s.startChoices = null;
  s.phase = 'map';
  s.floor = 1;
  s.room = 'shop';
  s.history.floors.push(newFloorRecord(s, 'shop'));
  const env = makeEnv(s);
  enqueue(env, [{ kind: 'step', step: { op: 'enter_room' } }]);
  drain(env);
  const sh = g.state.shop;
  if (!sh) throw new Error('no shop');
  sh.relics[0] = { id: relic, price: 150, sold: false };
  g.state.player.gold = 999;
  g.state.player.counters['shards'] = 3;
  prep(g.state);
  return g;
}

describe('BUG-2: relics bought in a shop re-price it', () => {
  it('Shard Writ: the Shard removal costs 0 gold right away and keeps the service', () => {
    const g = shopWith('shard_writ');
    expect(g.state.shop?.removeShardGold).toBe(TUNING.shop.removeShardGold);
    expect(TUNING.shop.removeShardGold).toBeGreaterThan(0);
    g.apply({ type: 'shop_buy', kind: 'relic', index: 0 });
    expect(g.state.shop?.removeShardGold).toBe(0);
    const gold = g.state.player.gold;
    const uid = g.state.player.deck[0]?.uid;
    if (uid === undefined) throw new Error('empty deck');
    g.apply({ type: 'shop_remove', uid, pay: 'shard' });
    expect(g.state.player.gold).toBe(gold);
    expect(g.state.shop?.removeUsed).toBe(false);
    expect(g.legalActions().some((a) => a.type === 'shop_remove' && a.pay === 'gold')).toBe(true);
  });

  it('Vial Rack: unsold potions get 25% cheaper at once, sold items and other prices stay', () => {
    const g = shopWith('vial_rack');
    const sh = g.state.shop;
    if (!sh) throw new Error('no shop');
    const potions = sh.potions.map((p) => p.price);
    const cards = sh.cards.map((c) => c.price);
    const removal = sh.removePrice;
    expect(potions.length).toBeGreaterThan(0);
    g.apply({ type: 'shop_buy', kind: 'relic', index: 0 });
    const after = g.state.shop;
    if (!after) throw new Error('no shop');
    expect(after.potions.map((p) => p.price)).toEqual(potions.map((p) => Math.floor((p * 75) / 100)));
    expect(after.cards.map((c) => c.price)).toEqual(cards);
    expect(after.removePrice).toBe(removal);
    expect(after.relics[0]?.price).toBe(150); // the sold relic keeps its price
  });

  it('a later shop prices the same way as the re-priced one (no double discount)', () => {
    const g = shopWith('vial_rack');
    g.apply({ type: 'shop_buy', kind: 'relic', index: 0 });
    const sh = g.state.shop;
    if (!sh) throw new Error('no shop');
    // re-pricing applies the relic once: buying an unrelated card does not discount the potions again
    const before = sh.potions.map((p) => p.price);
    const card = g.legalActions().find((a) => a.type === 'shop_buy' && a.kind === 'card');
    if (!card) throw new Error('no card to buy');
    g.apply(card);
    expect(g.state.shop?.potions.map((p) => p.price)).toEqual(before);
  });
});
