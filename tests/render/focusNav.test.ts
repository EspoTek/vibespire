import { describe, expect, it } from 'vitest';
import { firstFocusableOrNull, pickNextOrNull, spatialNextOrNull, type NavNode } from '../../src/render/focusNav.ts';
import { rect } from '../../src/render/layout.ts';

const node = (x: number, y: number, extra: Partial<NavNode> = {}): NavNode & { name: string } => ({
  name: `${x},${y}`, rect: rect(x, y, 20, 10), enabled: true, visible: true, ...extra,
});

describe('spatial navigation', () => {
  it('picks the nearest node in the half-plane, preferring alignment', () => {
    const cur = node(100, 100);
    const aligned = node(100, 140);
    const nearButOff = node(130, 125); // closer, but 30 px across
    expect(spatialNextOrNull(cur, 'down', [cur, aligned, nearButOff])).toBe(aligned);
  });

  it('ignores nodes behind, disabled or invisible; null at the edge', () => {
    const cur = node(100, 100);
    const behind = node(100, 50);
    const disabled = node(100, 130, { enabled: false });
    const hidden = node(100, 160, { visible: false });
    expect(spatialNextOrNull(cur, 'down', [cur, behind, disabled, hidden])).toBeNull();
  });
});

describe('list-order override', () => {
  const list = (i: number, x: number, extra: Partial<NavNode> = {}) =>
    node(x, 300, { list: { key: 'hand', index: i, axis: 'x', wrap: false }, ...extra });

  it('follows index order, not geometry (overlapping fan)', () => {
    const a = list(0, 100), b = list(1, 90), c = list(2, 140); // b is geometrically left of a
    expect(pickNextOrNull(a, 'right', [a, b, c])).toBe(b);
    expect(pickNextOrNull(b, 'right', [a, b, c])).toBe(c);
  });

  it('skips disabled members; invisible members are still reachable', () => {
    const a = list(0, 100), b = list(1, 120, { enabled: false }), c = list(2, 140, { visible: false });
    expect(pickNextOrNull(a, 'right', [a, b, c])).toBe(c);
  });

  it('non-wrapping lists fall through to spatial at the end, skipping own members', () => {
    const a = list(0, 100), b = list(1, 140);
    const endTurn = node(220, 300);
    expect(pickNextOrNull(b, 'right', [a, b, endTurn])).toBe(endTurn);
    expect(pickNextOrNull(a, 'left', [a, b, endTurn])).toBeNull();
  });

  it('wrapping lists wrap; cross-axis presses leave the list spatially', () => {
    const m = (i: number) => node(10, 10 + i * 12, { list: { key: 'menu', index: i, axis: 'y', wrap: true } });
    const rows = [m(0), m(1), m(2)];
    const side = node(200, 22);
    expect(pickNextOrNull(rows[2] as NavNode, 'down', [...rows, side])).toBe(rows[0]);
    expect(pickNextOrNull(rows[0] as NavNode, 'up', [...rows, side])).toBe(rows[2]);
    expect(pickNextOrNull(rows[1] as NavNode, 'right', [...rows, side])).toBe(side);
  });
});

it('firstFocusableOrNull uses reading order', () => {
  const a = node(200, 10), b = node(10, 10), c = node(0, 50);
  expect(firstFocusableOrNull([a, b, c])).toBe(b);
  expect(firstFocusableOrNull([node(0, 0, { enabled: false })])).toBeNull();
});
