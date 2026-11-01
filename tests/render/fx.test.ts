import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { CUE_LOG, Cue } from '../../src/render/fx/cue.ts';
import { Particles } from '../../src/render/fx/particles.ts';
import { Tweener } from '../../src/render/tween.ts';

const flush = () => new Promise<void>((r) => setTimeout(r, 0));

describe('hit-stop', () => {
  it('freezes tweens, delays and tickers for its duration, then carries on', async () => {
    const tw = new Tweener();
    const o = { x: 0 };
    void tw.to(o, { x: 100 }, 100, (t) => t);
    let ticks = 0;
    tw.every(() => { ticks++; return true; });
    tw.update(50);
    expect(o.x).toBeCloseTo(50);
    tw.hitStop(40);
    expect(tw.frozen).toBe(true);
    tw.update(30);
    expect(o.x).toBeCloseTo(50); // frozen
    expect(ticks).toBe(1);
    tw.update(20); // 10 ms of freeze left, 10 ms of motion
    expect(o.x).toBeCloseTo(60);
    expect(tw.frozen).toBe(false);
    expect(ticks).toBe(2);
  });
  it('overlapping stops keep the longest, not the sum; speed scales them', () => {
    const tw = new Tweener();
    tw.hitStop(50); tw.hitStop(20);
    tw.speed = 2;
    tw.update(20); // 40 ms of scaled time
    expect(tw.frozen).toBe(true);
    tw.update(5);
    expect(tw.frozen).toBe(false);
    expect(() => tw.hitStop(-1)).toThrow();
  });
});

describe('Tweener tickers', () => {
  it('a ticker registered from inside another ticker survives (regression: it was dropped)', () => {
    const tw = new Tweener();
    let inner = 0;
    tw.every(() => { tw.every(() => { inner++; return inner < 3; }); return false; });
    tw.update(16);
    expect(tw.active).toBe(1);
    tw.update(16); tw.update(16); tw.update(16);
    expect(inner).toBe(3);
    expect(tw.active).toBe(0);
  });
});

describe('Cue timelines', () => {
  it('fires keys in time order on the tween clock and logs each', async () => {
    const tw = new Tweener();
    const seen: string[] = [];
    const c = new Cue(tw, 'test-strike')
      .at(90, 'impact', () => seen.push('impact'))
      .at(0, 'windup', () => seen.push('windup'))
      .at(200, 'settle', () => seen.push('settle'));
    const done = c.play();
    expect(seen).toEqual(['windup']); // keys at 0 fire synchronously
    const impact = c.reached('impact');
    let impacted = false;
    void impact.then(() => { impacted = true; });
    tw.update(60);
    await flush();
    expect(impacted).toBe(false);
    tw.update(40);
    await flush();
    expect(seen).toEqual(['windup', 'impact']);
    expect(impacted).toBe(true);
    tw.update(150);
    await done;
    expect(seen).toEqual(['windup', 'impact', 'settle']);
    expect(CUE_LOG.filter((e) => e.cue === 'test-strike').map((e) => e.key)).toEqual(['windup', 'impact', 'settle']);
  });
  it('hit-stop delays the following keys (sound waits for the picture)', () => {
    const tw = new Tweener();
    const seen: string[] = [];
    const c = new Cue(tw, 'stopped').at(0, 'impact', () => { seen.push('impact'); tw.hitStop(100); }).at(50, 'settle', () => seen.push('settle'));
    void c.play();
    tw.update(80);
    expect(seen).toEqual(['impact']);
    tw.update(80); // 100 ms freeze done, 60 ms of time: settle at 50
    expect(seen).toEqual(['impact', 'settle']);
  });
  it('rejects bad declarations', () => {
    const tw = new Tweener();
    const c = new Cue(tw, 'bad').at(10, 'a');
    expect(() => c.at(20, 'a')).toThrow(/declared at/);
    expect(() => c.at(-1, 'b')).toThrow(/bad time/);
    expect(() => c.reached('nope')).toThrow(/no key/);
    void c.play();
    expect(() => c.at(5, 'c')).toThrow(/after play/);
    expect(() => c.play()).toThrow(/twice/);
  });
});

describe('pixel particles', () => {
  it('spawn at whole pixels, die after their life, and are capped', () => {
    const root = new THREE.Group();
    const tw = new Tweener();
    const p = new Particles(root, tw);
    p.burst(10.4, 20.6, { n: 12, colors: [0xff0000], speed: [50, 50], life: [100, 100] });
    expect(p.count).toBe(12);
    tw.update(16);
    for (const m of root.children) {
      expect(Number.isInteger(m.position.x)).toBe(true);
      expect(Number.isInteger(m.position.y)).toBe(true);
    }
    tw.update(100);
    expect(p.count).toBe(0);
    expect(root.children).toHaveLength(0);
    expect(tw.active).toBe(0); // no ticker left behind (e2e idle detection relies on this)
    p.burst(0, 0, { n: 1000, colors: [0xffffff] });
    expect(p.count).toBeLessThanOrEqual(260);
  });
});
