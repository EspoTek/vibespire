/**
 * 8x8 bitmap font: printable ASCII U+0020..U+007E.
 *
 * Source: font8x8_basic.h from https://github.com/dhepper/font8x8 by Daniel Hepper,
 * itself based on Marcel Sondaar's font8_8 / the IBM public-domain VGA fonts.
 * Licence: PUBLIC DOMAIN (stated in the source header and README). Credited here and in
 * public/assets/fonts/CREDITS.txt.
 *
 * Encoding (unchanged from the source): each glyph is 8 bytes, one per row top to bottom,
 * written here as 16 hex digits. The LEAST significant bit of each byte is the LEFTMOST pixel.
 *
 * EXTRA_8X8 holds glyphs drawn for Vibespire (same encoding), mapped to Unicode code points.
 * Pure data module.
 */

export const FONT8X8_FIRST = 0x20;

export const FONT8X8_BASIC: readonly string[] = [
  '0000000000000000', // " "
  '183c3c1818001800', // "!"
  '3636000000000000', // "\""
  '36367f367f363600', // "#"
  '0c3e031e301f0c00', // "$"
  '006333180c666300', // "%"
  '1c361c6e3b336e00', // "&"
  '0606030000000000', // "'"
  '180c0606060c1800', // "("
  '060c1818180c0600', // ")"
  '00663cff3c660000', // "*"
  '000c0c3f0c0c0000', // "+"
  '00000000000c0c06', // ","
  '0000003f00000000', // "-"
  '00000000000c0c00', // "."
  '6030180c06030100', // "/"
  '3e63737b6f673e00', // "0"
  '0c0e0c0c0c0c3f00', // "1"
  '1e33301c06333f00', // "2"
  '1e33301c30331e00', // "3"
  '383c36337f307800', // "4"
  '3f031f3030331e00', // "5"
  '1c06031f33331e00', // "6"
  '3f3330180c0c0c00', // "7"
  '1e33331e33331e00', // "8"
  '1e33333e30180e00', // "9"
  '000c0c00000c0c00', // ":"
  '000c0c00000c0c06', // ";"
  '180c0603060c1800', // "<"
  '00003f00003f0000', // "="
  '060c1830180c0600', // ">"
  '1e3330180c000c00', // "?"
  '3e637b7b7b031e00', // "@"
  '0c1e33333f333300', // "A"
  '3f66663e66663f00', // "B"
  '3c66030303663c00', // "C"
  '1f36666666361f00', // "D"
  '7f46161e16467f00', // "E"
  '7f46161e16060f00', // "F"
  '3c66030373667c00', // "G"
  '3333333f33333300', // "H"
  '1e0c0c0c0c0c1e00', // "I"
  '7830303033331e00', // "J"
  '6766361e36666700', // "K"
  '0f06060646667f00', // "L"
  '63777f7f6b636300', // "M"
  '63676f7b73636300', // "N"
  '1c36636363361c00', // "O"
  '3f66663e06060f00', // "P"
  '1e3333333b1e3800', // "Q"
  '3f66663e36666700', // "R"
  '1e33070e38331e00', // "S"
  '3f2d0c0c0c0c1e00', // "T"
  '3333333333333f00', // "U"
  '33333333331e0c00', // "V"
  '6363636b7f776300', // "W"
  '6363361c1c366300', // "X"
  '3333331e0c0c1e00', // "Y"
  '7f6331184c667f00', // "Z"
  '1e06060606061e00', // "["
  '03060c1830604000', // "\\"
  '1e18181818181e00', // "]"
  '081c366300000000', // "^"
  '00000000000000ff', // "_"
  '0c0c180000000000', // "`"
  '00001e303e336e00', // "a"
  '0706063e66663b00', // "b"
  '00001e3303331e00', // "c"
  '3830303e33336e00', // "d"
  '00001e333f031e00', // "e"
  '1c36060f06060f00', // "f"
  '00006e33333e301f', // "g"
  '0706366e66666700', // "h"
  '0c000e0c0c0c1e00', // "i"
  '300030303033331e', // "j"
  '070666361e366700', // "k"
  '0e0c0c0c0c0c1e00', // "l"
  '0000337f7f6b6300', // "m"
  '00001f3333333300', // "n"
  '00001e3333331e00', // "o"
  '00003b66663e060f', // "p"
  '00006e33333e3078', // "q"
  '00003b6e66060f00', // "r"
  '00003e031e301f00', // "s"
  '080c3e0c0c2c1800', // "t"
  '0000333333336e00', // "u"
  '00003333331e0c00', // "v"
  '0000636b7f7f3600', // "w"
  '000063361c366300', // "x"
  '00003333333e301f', // "y"
  '00003f190c263f00', // "z"
  '380c0c070c0c3800', // "{"
  '1818180018181800', // "|"
  '070c0c380c0c0700', // "}"
  '6e3b000000000000', // "~"
];

/** Vibespire-authored glyphs (same row encoding). Keys are single characters. */
export const EXTRA_8X8: Readonly<Record<string, string>> = {
  '\u25b6': '0103070f07030100', // ▶ PS-style menu cursor
  '\u25c0': '080c0e0f0e0c0800', // ◀
  '\u25b2': '00081c3e7f000000', // ▲
  '\u25bc': '007f3e1c08000000', // ▼
  '\u2665': '00367f7f3e1c0800', // ♥ heart (HP)
  '\u2666': '081c3e7f3e1c0800', // ♦ (energy pip)
  '\u25cf': '003c7e7e7e7e3c00', // ● filled circle
  '\u25cb': '003c424242423c00', // ○ hollow circle
  '\u2588': 'ffffffffffffffff', // █ full block
  '\u00b7': '0000001818000000', // · middle dot
  '\u273f': '00185a3c3c5a1800', // ✿ Bloom leaf
  '\u25c6': '00183c7e7e3c1800', // ◆ Shard
  '\u2192': '0010207f20100000', // →
  '\u00d7': '0000221408142200', // ×
  '\u2026': '000000000000db00', // …
  '\u2265': '0618601806007e00', // ≥ (card text: "If Onslaught ≥ N")
  '\u2264': '6018061860007e00', // ≤
  '\u2014': '000000ff00000000', // — em dash
  '\u2013': '0000007e00000000', // – en dash
};
