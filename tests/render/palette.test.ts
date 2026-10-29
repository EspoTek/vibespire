import { describe, expect, it } from 'vitest';
import { assertPaletteColor, C, isPaletteColor, LEVELS, namedColor, paletteIndex, sms, SMS_PALETTE } from '../../src/render/palette.ts';

describe('SMS palette', () => {
  it('has 64 unique colours built from the four SMS levels', () => {
    expect(SMS_PALETTE).toHaveLength(64);
    expect(new Set(SMS_PALETTE).size).toBe(64);
    for (const c of SMS_PALETTE) {
      for (const ch of [(c >> 16) & 0xff, (c >> 8) & 0xff, c & 0xff]) expect(LEVELS).toContain(ch);
    }
  });

  it('indexes like CRAM --BBGGRR (index = r + 4g + 16b)', () => {
    expect(SMS_PALETTE[0]).toBe(0x000000);
    expect(SMS_PALETTE[3]).toBe(0xff0000);
    expect(SMS_PALETTE[12]).toBe(0x00ff00);
    expect(SMS_PALETTE[48]).toBe(0x0000ff);
    expect(SMS_PALETTE[63]).toBe(0xffffff);
    expect(paletteIndex(sms(1, 2, 3))).toBe(1 + 4 * 2 + 16 * 3);
  });

  it('every named UI colour is an SMS colour', () => {
    for (const [name, c] of Object.entries(C)) expect(isPaletteColor(c), name).toBe(true);
  });

  it('rejects off-palette colours and unknown names loudly', () => {
    expect(() => assertPaletteColor(0x808080, 'test')).toThrow(/not an SMS palette colour/);
    expect(() => paletteIndex(0x123456)).toThrow();
    expect(() => namedColor('chartreuse')).toThrow(/unknown colour name/);
    expect(namedColor('psBlue')).toBe(0x0055ff);
  });
});
