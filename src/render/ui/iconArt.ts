/**
 * Procedural 12x12 UI icons, drawn as rows of characters: '.' is transparent and every letter is
 * a palette colour from ICON_KEYS. Pure data, rasterised by art.ts `rasterizeIconSheet`.
 * Groups: resources, intents, statuses (one per status id, GDD §2), map nodes, piles, misc.
 */
import { C } from '../palette.ts';
import { STATUS_ICON_ART } from './statusIconArt.ts';

export const ICON_KEYS: Readonly<Record<string, number>> = {
  k: C.black, w: C.white, g: C.grey, d: C.darkGrey, r: C.red, R: C.darkRed, p: C.pink,
  y: C.yellow, a: C.amber, o: C.orange, b: C.psBlue, s: C.skyBlue, c: C.cyan, n: C.navy,
  G: C.green, l: C.lime, m: C.magenta, v: C.purple, u: C.rust, i: C.iceBlue, t: C.teal,
  M: C.maroon, P: C.lilac, V: C.violet, e: C.leaf, D: C.darkGreen, N: C.darkBlue,
};

export const ICON_SIZE = 12;

const SHIELD = (edge: string, fill: string, hi: string): string[] => [
  '.kkkkkkkkkk.', `k${edge.repeat(10)}k`, `k${edge}${hi}${hi}${fill.repeat(6)}${edge}k`, `k${edge}${hi}${fill.repeat(7)}${edge}k`,
  `k${edge}${fill.repeat(8)}${edge}k`, `k${edge}${fill.repeat(8)}${edge}k`, `k${edge}${fill.repeat(8)}${edge}k`,
  `.k${edge}${fill.repeat(6)}${edge}k.`, `.k${edge}${fill.repeat(6)}${edge}k.`, `..k${edge}${fill.repeat(4)}${edge}k..`,
  `...k${edge.repeat(4)}k...`, '....kkkk....',
];

const LEAF = (body: string, heart: string): string[] => [
  '............', '.....kk.....', `....k${body}${body}k....`, `.kk.k${body}${body}k.kk.`,
  `k${body}${body}kk${body}${body}kk${body}${body}k`, `k${body.repeat(4)}${heart}${heart}${body.repeat(4)}k`,
  `.kk${body}${body}${heart}${heart}${body}${body}kk.`, `..k${body.repeat(6)}k..`, `.k${body}${body}kkkk${body}${body}k.`,
  '.kkk.kk.kkk.', '.....kk.....', '.....GG.....',
];

export const ICONS: Readonly<Record<string, readonly string[]>> = {
  // ---------------------------------------------------------------- resources
  sword: [
    '.........kk.', '........kwwk', '.......kwgk.', '......kwgk..', '.....kwgk...', 'k...kwgk....',
    'kk.kwgk.....', '.kkagk......', '..kak.......', '.kakkk......', 'kak..k......', 'kk..........',
  ],
  shield: SHIELD('s', 'b', 'w'),
  guard: SHIELD('y', 'a', 'w'),
  heart: [
    '............', '.kkk...kkk..', 'kpprk.kpprk.', 'kpwrrkrrrrk.', 'kprrrrrrrrk.', 'krrrrrrrrRk.',
    '.krrrrrrRk..', '..krrrrRk...', '...krrRk....', '....kRk.....', '.....k......', '............',
  ],
  energy: [
    '.....kkk....', '....kyyk....', '...kyyk.....', '..kyyk......', '.kyyykkkk...', 'kaaaaayyk...',
    '.kkkkyyk....', '....kyk.....', '...kyk......', '..kak.......', '..kk........', '............',
  ],
  coin: [
    '...kkkkkk...', '..kyyyyyyk..', '.kyywwyyaak.', 'kyywyyyyyaak', 'kyywyyyyyaak', 'kyyyyyyyyaak',
    'kyyyyyyyyaak', 'kyyyyyyyyaak', '.kyyyyyyaak.', '..kaaaaaak..', '...kkkkkk...', '............',
  ],
  shard: [
    '.....kk.....', '....kick....', '...kiicck...', '..kiiiccck..', '.kiiiicccck.', 'kmmmmmPPPPPk',
    '.kmmmmPPPPk.', '..kmmmPPPk..', '...kmmPPk...', '....kmPk....', '.....kk.....', '............',
  ],
  potion: [
    '....kkkk....', '....kwwk....', '....kggk....', '....kddk....', '...kwwwwk...', '..kwmmmmwk..',
    '.kwmmmmmmwk.', '.kmwmmmmmmk.', '.kmmmmmmmmk.', '.kmmmmmmmmk.', '..kmmmmmmk..', '...kkkkkk...',
  ],
  potion_empty: [
    '....dddd....', '....d..d....', '....d..d....', '....d..d....', '...d....d...', '..d......d..',
    '.d........d.', '.d........d.', '.d........d.', '.d........d.', '..d......d..', '...dddddd...',
  ],
  relic: [
    '............', '..kkkkkkkk..', '.kiiwwiicck.', 'kiiwwiiccbbk', 'kiiiiiccbbbk', '.kiiiccbbbk.',
    '..kiccbbbk..', '...kcbbbk...', '....kbbk....', '.....kk.....', '............', '............',
  ],
  leaf: LEAF('l', 'y'),
  leaf_gold: LEAF('y', 'w'),
  // ---------------------------------------------------------------- intents
  buff: [
    '.....kk.....', '....kGGk....', '...kGllGk...', '..kGllllGk..', '.kGGGllGGGk.', 'kkkkGllGkkkk',
    '...kGllGk...', '...kGllGk...', '...kGllGk...', '...kGGGGk...', '...kkkkkk...', '............',
  ],
  debuff: [
    '...kkkkkk...', '...kvmmvk...', '...kvmmvk...', '...kvmmvk...', '...kvmmvk...', 'kkkkvmmvkkkk',
    '.kvvvmmvvvk.', '..kvmmmmvk..', '...kvmmvk...', '....kvvk....', '.....kk.....', '............',
  ],
  unknown: [
    '...kkkkkk...', '..kwwwwwwk..', '.kwwkkkkwwk.', '.kwk...kwwk.', '..k...kwwk..', '.....kwwk...',
    '....kwwk....', '....kwwk....', '.....kk.....', '....kwwk....', '....kwwk....', '.....kk.....',
  ],
  sleep: [
    '............', '.kkkkkk.....', '.kwwwwk.....', '...kwk......', '..kwk.......', '.kwwwwk.....',
    '.kkkkkk.....', '.......kkkk.', '.......kwwk.', '........kwk.', '.......kwwk.', '.......kkkk.',
  ],
  escape: [
    '............', '......kk....', '......kwk...', '.kkkkkkwwk..', '.kwwwwwwwwk.', '.kwwwwwwwwwk',
    '.kwwwwwwwwk.', '.kkkkkkwwk..', '......kwk...', '......kk....', '............', '............',
  ],
  special: [
    '.....kk.....', '....kmmk....', '....kmmk....', '.kkkmwwmkkk.', 'kmmmwwwwmmmk', 'kmmmwwwwmmmk',
    '.kkkmwwmkkk.', '....kmmk....', '....kmmk....', '.....kk.....', '............', '............',
  ],
  skull: [
    '...kkkkkk...', '..kwwwwwwk..', '.kwwwwwwwwk.', '.kwkkwwkkwk.', '.kwkkwwkkwk.', '.kwwwkkwwwk.',
    '..kwwwwwwk..', '...kwkwkk...', '...kwkwwk...', '....kkkk....', '............', '............',
  ],
  // ---------------------------------------------------------------- statuses (GDD §2)
  onslaught: [
    '............', '.....kk.....', '....krrk....', '...krrrrk...', '..krrkkrrk..', '.krrk..krrk.',
    '..kk.kk.kk..', '....krrk....', '...krrrrk...', '..krrkkrrk..', '.krrk..krrk.', '..kk....kk..',
  ],
  exposed: [
    '.kkkkkkkkkk.', 'kggggggggggk', 'kgwwgggkgggk', 'kgwgggkggggk', 'kggggkgggggk', 'kgggkkkggggk',
    'kggggggkgggk', '.kgggggkggk.', '.kgggggkggk.', '..kgggkgggk.', '...kgggggk..', '....kkkkk...',
  ],
  stagger: [
    '............', '..y.....y...', '.yyy...yyy..', '..y.....y...', '............', '....kkkk....',
    '...kwwwwk...', '..kwkwwkwk..', '..kwwwwwwk..', '..kwwkkwwk..', '...kwwwwk...', '....kkkk....',
  ],
  rot: [
    '...kkkkkk...', '..kllllllk..', '.kllllllllk.', '.klvvllvvlk.', '.klvvllvvlk.', '.kllllllllk.',
    '..klllkllk..', '...kvkvkvk..', '...kvvvvvk..', '....kkkkk...', '..v......v..', '.v........v.',
  ],
  augury: [
    '............', '............', '....kkkk....', '..kkwwwwkk..', '.kwwwbbwwwk.', 'kwwwbnnbwwwk',
    'kwwwbnnbwwwk', '.kwwwbbwwwk.', '..kkwwwwkk..', '....kkkk....', '............', '............',
  ],
  riposte_capacity: [
    'k..........k', 'kwk......kwk', '.kwk....kwk.', '..kwk..kwk..', '...kwkkwk...', '....kwwk....',
    '....kwwk....', '...kwkkwk...', '..aak..kaa..', '.aak....kaa.', 'kak......kak', 'kk........kk',
  ],
  might: [
    '.....kk.....', '....krrk....', '...krrrrk...', '..krrrrrrk..', '.kkkkrrkkkk.', '....krrk....',
    '....krrk....', '....krrk....', '....krrk....', '....krrk....', '....kkkk....', '............',
  ],
  elite_hunted: [
    '............', '............', '....kkkk....', '..kkrrrrkk..', '.krrrkkrrrk.', 'krrrkyykrrrk',
    'krrrkyykrrrk', '.krrrkkrrrk.', '..kkrrrrkk..', '....kkkk....', '............', '............',
  ],
  backlash_primed: [
    '......kkk...', '.....kook...', '....kook....', '...kook.....', '..kooooookk.', '.kkkkooook..',
    '....kook....', '...kook.....', '..kook......', '.kok........', '.kk.........', '............',
  ],
  cost_tax: [
    '............', '.kkkkkkkkkk.', '.kRRRRRRRRk.', '.kRwRRRRwRk.', '.kwwwRRwwRk.', '.kRwRRRRwRk.',
    '.kRRRRRRwRk.', '.kRRRRRwwwk.', '.kRRRRRRRRk.', '.kkkkkkkkkk.', '............', '............',
  ],
  // v2 powers, debuffs and enemy passives: hand-authored in statusIconArt.ts
  ...STATUS_ICON_ART,
  // ---------------------------------------------------------------- map nodes
  node_monster: [
    '.k........k.', 'kuk......kuk', 'kuuk.kk.kuuk', '.kuukuukuuk.', '..kuuuuuuk..', '.kuyuuuuyuk.',
    '.kuuuuuuuuk.', '.kuukkkkuuk.', '..kuwkkwuk..', '...kuuuuk...', '....kkkk....', '............',
  ],
  node_elite: [
    'k..........k', 'kRk......kRk', 'kRRk.kk.kRRk', '.kRRkrrkRRk.', '..krrrrrrk..', '.krykrrkyrk.',
    '.krrrrrrrrk.', '..krrkkrrk..', '..krwrrwrk..', '...krrrrk...', '....kkkk....', '............',
  ],
  node_rest: [
    '............', '.....o......', '....oyo.....', '....oyyo....', '...oyywyo...', '...oywwyo...',
    '....oyyo....', '..kuuuuuuk..', '.kuukuukuuk.', '..kuuuuuuk..', '............', '............',
  ],
  node_shop: [
    '.....kk.....', '....kaak....', '.....kk.....', '...kkaakk...', '..kaaaaaak..', '.kaayyyyaak.',
    '.kaaayyaaak.', '.kaaaayyaak.', '.kaayyyyaak.', '..kaaaaaak..', '...kkkkkk...', '............',
  ],
  node_treasure: [
    '............', '..kkkkkkkk..', '.kuuuuuuuuk.', '.kuyyyyyyuk.', '.kuuuuuuuuk.', 'kkkkkyykkkkk',
    'kuuuukkuuuuk', 'kuuuuyyuuuuk', 'kuuuuuuuuuuk', 'kyyyyyyyyyyk', 'kkkkkkkkkkkk', '............',
  ],
  node_boss: [
    'y...y..y...y', 'yy.yyyyyy.yy', 'yyyyyyyyyyyy', '.kkkkkkkkkk.', 'kwwwwwwwwwwk', 'kwkkwwwwkkwk',
    'kwkkwwwwkkwk', 'kwwwwkkwwwwk', '.kwwwwwwwwk.', '..kwkwwkwk..', '..kkkkkkkk..', '............',
  ],
  // ---------------------------------------------------------------- piles / buttons
  deck: [
    '....kkkkkkk.', '....kbbbbbk.', '..kkkkkkkbk.', '..kbbbbbkbk.', 'kkkkkkkbkbk.', 'kwwwwwkbkbk.',
    'kwbbbwkbkkk.', 'kwbbbwkbk...', 'kwbbbwkkk...', 'kwwwwwk.....', 'kkkkkkk.....', '............',
  ],
  discard: [
    'kkkkkkk.....', 'kgggggk.....', 'kgdddgk.....', 'kgdddgk.....', 'kgdddgk.....', 'kgggggk.....',
    'kkkkkkk.kk..', '........kwk.', '.....kkkkwwk', '.....kwwwwwk', '.....kkkkwwk', '........kwk.',
  ],
  scrap: [
    '............', '..k......k..', '.kok....kok.', '..kok..kok..', '...kokkok...', '....kook....',
    '....kook....', '...kokkok...', '..kok..kok..', '.kuuuuuuuuk.', 'kuuuuuuuuuuk', 'kkkkkkkkkkkk',
  ],
  pause: [
    '............', '.kkkkkkkkkk.', '.kwwwwwwwwk.', '.kkkkkkkkkk.', '............', '.kkkkkkkkkk.',
    '.kwwwwwwwwk.', '.kkkkkkkkkk.', '............', '.kkkkkkkkkk.', '.kwwwwwwwwk.', '.kkkkkkkkkk.',
  ],
};

/** Aliases: names the game uses that share art. */
export const ICON_ALIASES: Readonly<Record<string, string>> = {
  block: 'shield',
  intent_attack: 'sword',
  intent_defend: 'shield',
  intent_buff: 'buff',
  intent_debuff: 'debuff',
  intent_unknown: 'unknown',
  intent_sleep: 'sleep',
  intent_escape: 'escape',
  intent_special: 'special',
  node_event: 'unknown',
  parry: 'riposte_capacity',
  timeline: 'augury',
};
