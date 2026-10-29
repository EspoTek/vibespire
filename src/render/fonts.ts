/**
 * Font registry: the two BitmapFonts are built once at startup (`initFonts`, after the WebGL
 * context exists) and shared by every widget. Accessing them before init throws.
 */
import { BitmapFont } from './text.ts';
import { FONT_4X6, FONT_8X8 } from './textLayout.ts';

let ui: BitmapFont | null = null;
let small: BitmapFont | null = null;

export function initFonts(): void {
  if (ui) throw new Error('initFonts called twice');
  ui = new BitmapFont(FONT_8X8);
  small = new BitmapFont(FONT_4X6);
}

export const fonts = {
  /** 8x8 PS-style UI font. */
  get ui(): BitmapFont {
    if (!ui) throw new Error('fonts.ui used before initFonts()');
    return ui;
  },
  /** 4x6 small font (card bodies). */
  get small(): BitmapFont {
    if (!small) throw new Error('fonts.small used before initFonts()');
    return small;
  },
};
