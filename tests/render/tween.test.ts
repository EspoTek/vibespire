import { describe, expect, it } from 'vitest';
import { ease, flash, Scheduler, shake, stepped, Tweener } from '../../src/render/tween.ts';

const flush = () => new Promise<void>((r) => setTimeout(r, 0));

describe('Tweener', () => {
  it('tweens to the exact target and resolves', async () => {
    const tw = new Tweener();
    const o = { x: 0 };
    let done = false;
    void tw.to(o, { x: 10 }, 100, ease.linear).then(() => { done = true; });
    tw.update(50);
    expect(o.x).toBe(5);
    tw.update(60);
    await flush();
    expect(o.x).toBe(10);
    expect(done).toBe(true);
  });

  it('a new tween on the same key replaces (and resolves) the old one', async () => {
    const tw = new Tweener();
    const o = { x: 0 };
    let first = false;
    void tw.to(o, { x: 100 }, 100).then(() => { first = true; });
    tw.update(10);
    void tw.to(o, { x: -5 }, 10);
    await flush();
    expect(first).toBe(true);
    tw.update(10);
    expect(o.x).toBe(-5);
  });

  it('speed scales durations; delay is frame-driven', async () => {
    const tw = new Tweener();
    tw.speed = 2;
    let fired = false;
    void tw.delay(100).then(() => { fired = true; });
    tw.update(49);
    await flush();
    expect(fired).toBe(false);
    tw.update(1);
    await flush();
    expect(fired).toBe(true);
    expect(() => { tw.speed = 0; }).toThrow();
  });

  it('eases: back overshoots, stepped quantises', () => {
    expect(ease.outBack(0.7)).toBeGreaterThan(1);
    expect(ease.inOutBack(1)).toBeCloseTo(1, 9);
    const s = stepped(ease.linear, 4);
    expect([s(0.1), s(0.3), s(0.99), s(1)]).toEqual([0, 0.25, 0.75, 1]);
  });
});

describe('shake and flash', () => {
  it('shake uses whole pixels and restores the position', async () => {
    const tw = new Tweener();
    const obj = { position: { x: 10, y: 20 } };
    const p = shake(tw, obj, 4, 100);
    for (let i = 0; i < 6; i++) {
      tw.update(16);
      expect(Number.isInteger(obj.position.x) && Number.isInteger(obj.position.y)).toBe(true);
      expect(Math.abs(obj.position.x - 10)).toBeLessThanOrEqual(4);
    }
    tw.update(100);
    await p;
    expect(obj.position).toEqual({ x: 10, y: 20 });
  });

  it('flash blinks hard on/off and ends off', async () => {
    const tw = new Tweener();
    const seen: boolean[] = [];
    const p = flash(tw, { setFlash: (on) => seen.push(on) }, 240, 15);
    for (let i = 0; i < 20; i++) tw.update(16);
    await p;
    expect(seen).toContain(true);
    expect(seen).toContain(false);
    expect(seen[seen.length - 1]).toBe(false);
  });
});

describe('Scheduler', () => {
  it('runs steps strictly in order and reports a failing step without wedging', async () => {
    const tw = new Tweener();
    const errors: unknown[] = [];
    const s = new Scheduler(tw, (e) => errors.push(e));
    const log: string[] = [];
    void s.enqueue(async () => { log.push('a1'); await tw.delay(50); log.push('a2'); });
    const bad = s.enqueue(() => { throw new Error('boom'); });
    void s.enqueue(() => { log.push('c'); });
    expect(s.busy).toBe(true);
    await flush();
    expect(log).toEqual(['a1']);
    tw.update(60);
    await expect(bad).rejects.toThrow('boom');
    await s.idle();
    expect(log).toEqual(['a1', 'a2', 'c']);
    expect(errors).toHaveLength(1);
    expect(s.busy).toBe(false);
  });
});
