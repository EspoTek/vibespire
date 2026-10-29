import { describe, expect, it } from 'vitest';
import { anchorIn, clientToLogical, columns, computeViewport, fanLayout, H, placeTooltip, rect, rowPositions, SCREEN, W } from '../../src/render/layout.ts';

describe('computeViewport (integer scale + letterbox)', () => {
  it('1920x1080 at DPR 1 -> exact 3x, no bars', () => {
    expect(computeViewport(1920, 1080)).toEqual({ scale: 3, left: 0, top: 0, bottom: 0 });
  });
  it('1366x768 -> 2x with integer bars', () => {
    const v = computeViewport(1366, 768);
    expect(v.scale).toBe(2);
    expect(v.left).toBe(43);
    expect(v.top + v.bottom + H * 2).toBe(768);
    expect(Number.isInteger(v.top) && Number.isInteger(v.bottom)).toBe(true);
  });
  it('4K -> 6x; tiny windows clamp to 1x', () => {
    expect(computeViewport(3840, 2160).scale).toBe(6);
    expect(computeViewport(300, 200).scale).toBe(1);
  });
});

describe('clientToLogical', () => {
  it('maps CSS px through DPR and the letterbox to logical px', () => {
    const view = computeViewport(2732, 1536); // 1366x768 CSS at DPR 2 -> scale 4
    expect(view.scale).toBe(4);
    const box = { left: 0, top: 0, width: 1366, height: 768 };
    const tl = clientToLogical(view.left / 2, view.top / 2, box, 2732, 1536, view);
    expect(tl).toEqual({ x: 0, y: 0, inside: true });
    const br = clientToLogical((view.left + W * 4 - 1) / 2, (view.top + H * 4 - 1) / 2, box, 2732, 1536, view);
    expect(br).toEqual({ x: W - 1, y: H - 1, inside: true });
    expect(clientToLogical(0, 0, box, 2732, 1536, view).inside).toBe(false);
  });
});

describe('placeTooltip', () => {
  it('prefers the requested side when it fits', () => {
    const p = placeTooltip(rect(300, 200, 40, 20), { w: 60, h: 30 }, 'above');
    expect(p).toEqual({ x: 290, y: 168, side: 'above' });
  });
  it('flips to the opposite side at the top edge', () => {
    const p = placeTooltip(rect(300, 4, 40, 20), { w: 60, h: 30 }, 'above');
    expect(p.side).toBe('below');
    expect(p.y).toBe(26);
  });
  it('clamps horizontally so it never leaves the screen', () => {
    for (const ax of [0, 620]) {
      const p = placeTooltip(rect(ax, 100, 20, 20), { w: 150, h: 40 }, 'above');
      expect(p.x).toBeGreaterThanOrEqual(2);
      expect(p.x + 150).toBeLessThanOrEqual(W - 2);
    }
  });
  it('skips a side that would cover a neighbour, and ignores neighbours when every side does', () => {
    const anchor = rect(200, 150, 60, 60);
    const neighbour = rect(270, 140, 60, 80); // just right of the anchor
    expect(placeTooltip(anchor, { w: 60, h: 30 }, 'right', SCREEN, 2, 2, [neighbour]).side).toBe('left');
    const boxedIn = [rect(0, 0, W, 148), rect(0, 212, W, 148), rect(0, 0, 198, H), rect(262, 0, 378, H)];
    expect(placeTooltip(anchor, { w: 60, h: 30 }, 'right', SCREEN, 2, 2, boxedIn).side).toBe('right');
  });
  it('falls back to clamping when nothing fits', () => {
    const p = placeTooltip(rect(0, 0, W, H), { w: 200, h: 100 }, 'above');
    expect(p.y).toBeGreaterThanOrEqual(2);
    expect(p.y + 100).toBeLessThanOrEqual(H - 2);
  });
});

describe('row/column/fan helpers', () => {
  it('rowPositions centres items', () => {
    expect(rowPositions(3, 100, 10, 640)).toEqual([160, 270, 380]);
  });
  it('columns hand remainder px to the left', () => {
    expect(columns(rect(0, 0, 10, 5), 3).map((r) => r.w)).toEqual([4, 3, 3]);
  });
  it('anchorIn places at corners', () => {
    expect(anchorIn(SCREEN, { w: 10, h: 10 }, 'bottom-right', 2)).toEqual(rect(628, 348, 10, 10));
    expect(anchorIn(SCREEN, { w: 10, h: 10 }, 'top')).toEqual(rect(315, 0, 10, 10));
  });
  it('fanLayout spreads, squeezes to maxWidth and arcs the ends', () => {
    const roomy = fanLayout(3, 64, { centerX: 320, baseY: 200, maxWidth: 400, gap: 4, arc: 6 });
    expect(roomy.map((s) => s.x)).toEqual([220, 288, 356]);
    expect(roomy.map((s) => s.y)).toEqual([206, 200, 206]);
    const tight = fanLayout(10, 64, { centerX: 320, baseY: 200, maxWidth: 400 });
    const last = tight[9];
    const first = tight[0];
    if (!last || !first) throw new Error('fan slots missing');
    expect(last.x + 64 - first.x).toBeLessThanOrEqual(400);
    for (const s of tight) expect(Number.isInteger(s.x) && Number.isInteger(s.y)).toBe(true);
  });
});
