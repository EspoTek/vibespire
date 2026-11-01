import '../testpack-only';
// Renderer-facing engine events (the combat animator's cues hang off them): each is emitted at the
// exact site where its mechanic resolves, with the payload the animator reads.
import { describe, expect, it } from 'vitest';
import { registerPack } from '../../src/content/registry';
import { combatOf, eventsOf, pacify, padDraw, play, sandbox, setHand } from './helpers';

registerPack({
  cards: [
    { id: 'test_je_harvest', name: 'Test Harvest', cls: 'test_class', type: 'skill', rarity: 'special', cost: 0, target: 'enemy', keywords: [],
      text: 'Harvest {harvest}.', effects: [{ type: 'harvest', mult: 2, target: 'target', key: 'harvest' }], upgrade: {}, icon: 'card_x' },
    { id: 'test_je_salvage', name: 'Test Scrap Salvage', cls: 'test_class', type: 'skill', rarity: 'special', cost: 0, target: 'none', keywords: ['exhaust'],
      text: 'Scrap. Salvage: gain {sblock} Block.', effects: [], salvage: [{ type: 'block', amount: 3, key: 'sblock' }], upgrade: {}, icon: 'card_x' },
  ],
  relics: [
    { id: 'test_je_reprise', name: 'Echo Ear', rarity: 'event', text: 'Everything has Reprise.', icon: 'x', hooks: { grantsReprise: () => true } },
  ],
}, 'test');

describe('renderer cue events', () => {
  it('harvest {enemyUid, rot, loss}: after its HP loss, before the Rot halves', () => {
    const g = sandbox();
    pacify(g, 100);
    const enemy = combatOf(g).enemies[0];
    if (!enemy) throw new Error('setup');
    enemy.statuses['rot'] = 4;
    setHand(g, ['test_je_harvest']);
    const ev = play(g, combatOf(g).hand[0]?.uid ?? -1, enemy.uid);
    expect(eventsOf(ev, 'harvest')).toEqual([{ t: 'harvest', enemyUid: enemy.uid, rot: 4, loss: 8 }]);
    const iLoss = ev.findIndex((e) => e.t === 'damage' && e.target === enemy.uid && e.kind === 'hp_loss');
    const iHarvest = ev.findIndex((e) => e.t === 'harvest');
    const iRot = ev.findIndex((e) => e.t === 'status' && e.status === 'rot' && e.target === enemy.uid);
    expect(iLoss).toBeGreaterThanOrEqual(0);
    expect(iHarvest).toBe(iLoss + 1); // the animator looks for it right after the loss
    expect(iRot).toBeGreaterThan(iHarvest);
  });

  it('harvest on an enemy without Rot emits nothing', () => {
    const g = sandbox();
    pacify(g, 100);
    const enemy = combatOf(g).enemies[0];
    if (!enemy) throw new Error('setup');
    setHand(g, ['test_je_harvest']);
    expect(eventsOf(play(g, combatOf(g).hand[0]?.uid ?? -1, enemy.uid), 'harvest')).toEqual([]);
  });

  it('salvage {cardUid}: when a Scrapped card\'s Salvage resolves', () => {
    const g = sandbox();
    setHand(g, ['test_je_salvage']);
    padDraw(g); // RULINGS 72 Scrap floor
    const uid = combatOf(g).hand[0]?.uid ?? -1;
    const ev = play(g, uid);
    expect(eventsOf(ev, 'salvage')).toEqual([{ t: 'salvage', cardUid: uid }]);
    expect(ev.findIndex((e) => e.t === 'salvage')).toBeGreaterThan(ev.findIndex((e) => e.t === 'exhaust'));
    expect(combatOf(g).player.block).toBe(3);
  });

  it('reprise {cardUid}: once per Reprised play, before the second resolution', () => {
    const g = sandbox({ relics: ['test_je_reprise'] });
    pacify(g, 100);
    setHand(g, ['test_strike']);
    const uid = combatOf(g).hand[0]?.uid ?? -1;
    const target = combatOf(g).enemies[0]?.uid;
    const ev = play(g, uid, target);
    expect(eventsOf(ev, 'reprise')).toEqual([{ t: 'reprise', cardUid: uid }]);
    const hits = ev.map((e, i) => (e.t === 'damage' && e.target === target ? i : -1)).filter((i) => i >= 0);
    expect(hits).toHaveLength(2);
    const iReprise = ev.findIndex((e) => e.t === 'reprise');
    expect(iReprise).toBeGreaterThan(hits[0] as number);
    expect(iReprise).toBeLessThan(hits[1] as number);
  });
});
