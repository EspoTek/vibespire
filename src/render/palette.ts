/**
 * Sega Master System master palette: 64 colours, each RGB channel one of 00/55/AA/FF.
 *
 * Index layout matches SMS CRAM bits `--BBGGRR`: index = r + 4*g + 16*b, with r/g/b in 0..3.
 * Everything the renderer draws procedurally (backdrops, panels, icons, text) must use these
 * colours; `PixelBuffer` asserts it on every write. Colours are 0xRRGGBB numbers (sRGB bytes).
 *
 * Pure module: no DOM, no three.js (vitest runs it in Node).
 */

/** The four channel intensities the SMS VDP can produce. */
export const LEVELS = [0x00, 0x55, 0xaa, 0xff] as const;
export type Level = 0 | 1 | 2 | 3;

/** Colour from SMS channel levels (0..3 each). */
export function sms(r: Level, g: Level, b: Level): number {
  return (LEVELS[r] << 16) | (LEVELS[g] << 8) | LEVELS[b];
}

function buildPalette(): readonly number[] {
  const out: number[] = [];
  for (let i = 0; i < 64; i++) {
    const r = (i & 3) as Level;
    const g = ((i >> 2) & 3) as Level;
    const b = ((i >> 4) & 3) as Level;
    out.push(sms(r, g, b));
  }
  return Object.freeze(out);
}

/** All 64 colours, index = CRAM value (r + 4g + 16b). */
export const SMS_PALETTE: readonly number[] = buildPalette();

const PALETTE_SET: ReadonlySet<number> = new Set(SMS_PALETTE);

export function isPaletteColor(c: number): boolean {
  return PALETTE_SET.has(c);
}

/** Throws if `c` is not one of the 64 SMS colours. `where` names the caller for the message. */
export function assertPaletteColor(c: number, where: string): number {
  if (!PALETTE_SET.has(c)) {
    throw new Error(`${where}: 0x${c.toString(16).padStart(6, '0')} is not an SMS palette colour`);
  }
  return c;
}

/** CRAM index of a palette colour (throws if off-palette). */
export function paletteIndex(c: number): number {
  const i = SMS_PALETTE.indexOf(c);
  if (i < 0) throw new Error(`paletteIndex: 0x${c.toString(16).padStart(6, '0')} is not an SMS palette colour`);
  return i;
}

/**
 * Named colours. UI code should use these names rather than raw hex, so a palette tweak is one edit.
 * Every value is asserted to be in SMS_PALETTE by tests/render/palette.test.ts.
 */
export const C = {
  // core PS box look
  black: 0x000000,
  white: 0xffffff,
  boxBg: 0x000000,
  border: 0xffffff,
  text: 0xffffff,
  textHi: 0xffff55, // focused / highlighted text (PS menu yellow)
  textDim: 0x555555, // disabled
  textMuted: 0xaaaaaa, // secondary info
  // blues
  psBlue: 0x0055ff, // Phantasy Star dungeon / UI accent blue
  blue: 0x0000ff,
  darkBlue: 0x0000aa,
  navy: 0x000055,
  skyBlue: 0x55aaff,
  iceBlue: 0xaaffff,
  cyan: 0x55ffff,
  teal: 0x00aaaa,
  // reds / oranges / yellows
  red: 0xff0000,
  darkRed: 0xaa0000,
  maroon: 0x550000,
  pink: 0xff5555,
  orange: 0xff5500,
  amber: 0xffaa00,
  yellow: 0xffff00,
  rust: 0xaa5500,
  brown: 0x555500,
  // greens
  green: 0x00aa00,
  darkGreen: 0x005500,
  lime: 0x55ff55,
  leaf: 0x55aa00,
  mint: 0xaaffaa,
  // purples
  purple: 0xaa00aa,
  magenta: 0xff55ff,
  violet: 0x5500aa,
  lilac: 0xaa55ff,
  // greys
  grey: 0xaaaaaa,
  darkGrey: 0x555555,
  steel: 0x5555aa,
  // gameplay semantics (phase 2)
  hp: 0xff5555,
  hpBack: 0x550000,
  block: 0x55aaff,
  energy: 0xffaa00,
  gold: 0xffaa00,
  focusA: 0xffffff, // focus ring pulses between focusA and focusB
  focusB: 0xffff55,
} as const;

export type ColorName = keyof typeof C;

/** Look up a named colour; throws on an unknown name (used by text markup). */
export function namedColor(name: string): number {
  if (!Object.hasOwn(C, name)) throw new Error(`namedColor: unknown colour name "${name}"`);
  return C[name as ColorName];
}

/** `#rrggbb` for CSS / debugging. */
export function cssHex(c: number): string {
  return `#${c.toString(16).padStart(6, '0')}`;
}
