import { describe, expect, it } from 'vitest';
import { parseAtlasJson } from '../../src/render/gfx.ts';

describe('parseAtlasJson (tools/sprites/atlas.py format)', () => {
  it('parses frames and cell', () => {
    const r = parseAtlasJson({ frames: { goblin: { x: 0, y: 0, w: 64, h: 64 }, golem: { x: 64, y: 0, w: 64, h: 64 } }, cell: 64 }, 'test.json');
    expect(r.frames.size).toBe(2);
    expect(r.frames.get('golem')).toEqual({ x: 64, y: 0, w: 64, h: 64 });
  });

  it('throws with the source path on malformed input', () => {
    expect(() => parseAtlasJson([], 'a.json')).toThrow(/a\.json/);
    expect(() => parseAtlasJson({ cell: 64 }, 'b.json')).toThrow(/frames/);
    expect(parseAtlasJson({ frames: {}, cell_w: 32, cell_h: 24 }, 'cards.json').frames.size).toBe(0);
    expect(() => parseAtlasJson({ frames: { x: { x: 0, y: 0, w: 64 } }, cell: 64 }, 'c.json')).toThrow(/"x"\.h/);
    expect(() => parseAtlasJson({ frames: { x: { x: 0.5, y: 0, w: 64, h: 64 } }, cell: 64 }, 'd.json')).toThrow(/integer/);
  });
});
