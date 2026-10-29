import { describe, expect, it } from 'vitest';
import { ACTIONS, ActionTracker, KEY_BINDINGS, PAD_BINDINGS, stickDirectionOrNull, WheelAccumulator } from '../../src/render/actions.ts';

describe('bindings', () => {
  it('cover every spec action', () => {
    expect(ACTIONS).toHaveLength(23);
    const bound = new Set([...Object.values(KEY_BINDINGS), ...Object.values(PAD_BINDINGS)]);
    for (const a of ACTIONS) expect(bound.has(a), a).toBe(true);
    expect(KEY_BINDINGS['Digit0']).toBe('cardSlot10');
    expect(PAD_BINDINGS[4]).toBe('prevTarget');
    expect(PAD_BINDINGS[2]).toBe('endTurn');
  });
});

describe('ActionTracker edges', () => {
  it('reports pressed only on the rising edge and released on the falling edge', () => {
    const t = new ActionTracker<'a'>();
    t.step(new Set(['a']), 16);
    expect([t.pressed('a'), t.held('a'), t.released('a')]).toEqual([true, true, false]);
    t.step(new Set(['a']), 16);
    expect([t.pressed('a'), t.held('a')]).toEqual([false, true]);
    t.step(new Set(), 16);
    expect([t.pressed('a'), t.held('a'), t.released('a')]).toEqual([false, false, true]);
    t.step(new Set(), 16);
    expect(t.released('a')).toBe(false);
  });

  it('auto-repeats after 350 ms, then every 120 ms', () => {
    const t = new ActionTracker<'down'>(350, 120);
    const fires: number[] = [];
    let now = 0;
    for (let f = 0; f < 60; f++) { // 60 frames of 10 ms
      t.step(new Set(['down']), f === 0 ? 0 : 10);
      if (f > 0) now += 10;
      if (t.repeated('down')) fires.push(now);
    }
    expect(fires).toEqual([0, 350, 470, 590]);
  });

  it('fires at most one repeat per long frame and does not drift', () => {
    const t = new ActionTracker<'x'>(350, 120);
    t.step(new Set(['x']), 0);
    t.step(new Set(['x']), 1000); // a hitch: one repeat, schedule catches up
    expect(t.repeated('x')).toBe(true);
    t.step(new Set(['x']), 10);
    expect(t.repeated('x')).toBe(false);
  });
});

describe('stick and wheel', () => {
  it('uses a radial 0.35 dead zone and the dominant axis', () => {
    expect(stickDirectionOrNull(0.2, 0.2)).toBeNull();
    expect(stickDirectionOrNull(0.3, -0.3)).toBe('right'); // |v| = 0.42, tie -> x
    expect(stickDirectionOrNull(-0.9, 0.1)).toBe('left');
    expect(stickDirectionOrNull(0.1, 0.8)).toBe('down');
    expect(stickDirectionOrNull(0.1, -0.8)).toBe('up');
  });

  it('quantises wheel deltas into notches with carry', () => {
    const w = new WheelAccumulator(100);
    w.add(40, 0); expect(w.take()).toBe(0);
    w.add(70, 0); expect(w.take()).toBe(1);
    w.add(-3, 1); expect(w.take()).toBe(0); // 10 carried - 48 = -38
    w.add(-80, 0); expect(w.take()).toBe(-1);
  });
});
