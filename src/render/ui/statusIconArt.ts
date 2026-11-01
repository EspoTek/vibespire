/**
 * Hand-authored 12x12 status icons (v2 powers, debuffs and enemy passives), in the iconArt.ts
 * style: '.' transparent, letters are ICON_KEYS palette colours, a 1 px black ('k') outline. One per
 * visible status id (tests/render/statusicons.test.ts). Concepts: docs/v2/art-needed.md and each
 * status's rules text. Merged into ICONS by iconArt.ts.
 */
export const STATUS_ICON_ART: Readonly<Record<string, readonly string[]>> = {
  // ------------------------------------------------------------ shared / engine
  halted: [ // a stop sign
    '...kkkkkk...', '..krrrrrrk..', '.krrrrrrrrk.', 'krrrrrrrrrrk', 'krwwwwwwwwrk', 'krwwwwwwwwrk',
    'krrrrrrrrrrk', 'krrrrrrrrrrk', '.krrrrrrrrk.', '..krrrrrrk..', '...kkkkkk...', '............',
  ],
  drift_energy: [ // an energy bolt fading into grey
    '.....kkk....', '....kddk....', '...kddk.....', '..kggk......', '.kgggkkkk...', 'kyyyyyggk...',
    '.kkkkyyk....', '....kyk.....', '...kyk......', '..kak.......', '..kk........', '............',
  ],
  goaded: [ // an angry red brow with an up arrow
    '........kk..', '.......kllk.', '......kllllk', '.......kllk.', '.......kkkk.', 'kkk......kkk',
    'krrkk..kkrrk', '.kkrrkkrrkk.', '...kk..kk...', '..kwwk..kwwk', '..kkkk..kkkk', '............',
  ],
  reserve: [ // a battery half charged
    '....kkkk....', '..kkkggkkk..', '..kggggggk..', '..kgk..kgk..', '..kgk..kgk..', '..kgkkkkgk..',
    '..kgssssgk..', '..kgssssgk..', '..kgssssgk..', '..kggggggk..', '..kkkkkkkk..', '............',
  ],
  reprise: [ // two cards, the second an echo
    'kkkkkk......', 'kwwwwk......', 'kwbbwkkkkk..', 'kwbbwkiiik..', 'kwbbwkiiik..', 'kwwwwkiiik..',
    'kkkkkkiiik..', '...kiiiiik..', '...kiiiiik..', '...kkkkkkk..', '.........ll.', '........ll..',
  ],
  reprise_big: [ // Second Verse: the Reprise echo, gold, for a big (2+ cost) card
    '.kkkkkk.....', 'kwwwwwk.....', 'kwbbbwk.....', 'kwbbbwkkkkk.', 'kwbbbwkyyyak', 'kwwwwwkyaaak',
    '.kkkkkkyaaak', '....kyyyaaak', '....kyaaaaak', '....kyaaauuk', '....kaaaaauk', '.....kkkkkk.',
  ],
  scar_tissue: [ // a stitched scar on skin
    '............', '..kkkkkkkk..', '.kppppppppk.', 'kppkpppkpppk', 'kpRRRRRRRRpk', 'kppkpppkpppk',
    'kpppppppkppk', 'kpRRRRRRRRpk', 'kppkpppkpppk', '.kppppppppk.', '..kkkkkkkk..', '............',
  ],
  burn_bright: [ // a card burning at the top
    '...o..o.....', '..oyo.oyo...', '..oyyoyyo...', '.kkkkkkkkk..', '.kwwwwwwwk..', '.kwgggggwk..',
    '.kwgwwwgwk..', '.kwgggggwk..', '.kwwwwwwwk..', '.kwwwwwwwk..', '.kkkkkkkkk..', '............',
  ],
  // ------------------------------------------------------------ breaker
  embers: [ // an orange coal with two sparks
    '..y......y..', '...y....y...', '............', '....kkkk....', '...kooook...', '..kooyyook..',
    '.kooyyyyook.', '.kooyyyyook.', '.kuooooooouk', '..kuuuuuuk..', '...kkkkkk...', '............',
  ],
  bellows: [ // forge bellows blowing air
    '............', 'kkkkk.......', 'kuuuuk......', 'kuaauuk..i..', 'kuaaauukk.i.', 'kuaaaaugkk..',
    'kuaaauukk.i.', 'kuaauuk..i..', 'kuuuuk......', 'kkkkk.......', '.kk.........', '............',
  ],
  crazing: [ // armour plate webbed with white cracks
    '.kkkkkkkkkk.', 'kaaawaaaaaak', 'kaaawaawaaak', 'kawwwawaaaak', 'kaaaawwwwaak', 'kaaaawaaawak',
    '.kaawaaaawk.', '.kawaaaaawk.', '..kaaawaak..', '...kaawak...', '....kkkk....', '............',
  ],
  answer_in_kind: [ // a blade and its ghost mirror
    'k..........P', 'kwk......PiP', '.kwk....PiP.', '..kwk..PiP..', '...kwkPiP...', '....kwiP....',
    '....Pikw....', '...PiPkwk...', '..aaP..kaa..', '.aak....kaa.', 'kak......kak', 'kk........kk',
  ],
  molten_shell: [ // gold plate dripping molten
    '.kkkkkkkkkk.', 'kaaaaaaaaaak', 'kayyyyyyyyak', 'kayaaaaaaaak', 'kaaaaaaaaaak', '.kaoaaoaaak.',
    '..kokkokkk..', '...o..o.....', '...o..o.....', '..oo..o.....', '......oo....', '............',
  ],
  spark_gap: [ // a blue arc jumping between two plates
    'kk........kk', 'kak......kak', 'kak..ii..kak', 'kakiw..wikak', 'kak.i..i.kak', 'kak..ww..kak',
    'kak.i..i.kak', 'kakiw..wikak', 'kak..ii..kak', 'kak......kak', 'kk........kk', '............',
  ],
  iron_patience: [ // a gold shield with an hourglass
    '.kkkkkkkkkk.', 'kyyyyyyyyyyk', 'kyakkkkkkayk', 'kyakwwwwkayk', 'kyaakwwkaayk', 'kyaaakkaaayk',
    '.kyakaakayk.', '.kyakwwkayk.', '..kkwwwwkk..', '..kkkkkkkk..', '....kkkk....', '............',
  ],
  parry_ledger: [ // a ledger with a sword mark
    '.kkkkkkkkkk.', '.kwwwwwwwwk.', '.kwggggggwk.', '.kwwwwwwk.k.', '.kwgggggkwk.', '.kwwwwwkwk..',
    '.kwgggkwkwk.', '.kwwwkwkwwk.', '.kwggaggggk.', '.kwwakwwwwk.', '.kkkkkkkkkk.', '............',
  ],
  parry_ledger_draw: [ // a card with a plus
    '............', '..kkkkkkk...', '..kwwwwwk...', '..kwbbbwk...', '..kwbbbwkkk.', '..kwbbbwklk.',
    '..kwwwwkklkk', '..kkkkkllllk', '.......kklkk', '........klk.', '........kkk.', '............',
  ],
  anvil_heart: [ // an anvil with a red heart
    '............', '..kkkkkkkk..', '.kddddddddkk', 'kdddrrdrrddk', '.kkdrrrrrdkk', '...kdrrrdk..',
    '....kdrrdk..', '....kddddk..', '...kddddddk.', '..kddddddddk', '..kkkkkkkkkk', '............',
  ],
  fault_reader: [ // an eye over a cracked plate
    '....kkkk....', '..kkwwwwkk..', '.kwwbnnbwwk.', '..kkwwwwkk..', '....kkkk....', '.kkkkkkkkkk.',
    'kggggkgggggk', 'kgggkkgggggk', 'kggggkkgggk.', '.kggggkggk..', '..kkkkkkkk..', '............',
  ],
  recoil_spring: [ // a coiled spring with a return arrow
    '....kk......', '...kwk......', '..kwwkkkkk..', '...kwk...k..', '....kk...k..', '.kkkkkkkkk..',
    '.kggggggggk.', '.kkkkkkkkk..', '.kggggggggk.', '.kkkkkkkkk..', '.kggggggggk.', '.kkkkkkkkk..',
  ],
  reactive_plate: [ // a plate throwing a spike back
    '.kkkkkk.....', 'kaaaaaak....', 'kayyyyak..k.', 'kayaaaakkkwk', 'kaaaaaakwwwk', 'kaaaaaakkkwk',
    'kaaaaaak..k.', '.kaaaak.....', '..kaak......', '...kk.......', '............', '............',
  ],
  iron_rhythm: [ // a hammer over three beat pips
    '..kkkkkk....', '..kggggk....', '..kggggkkkk.', '..kggggkuuk.', '..kkkkkkuuk.', '.......kuk..',
    '.......kuk..', '.......kk...', '............', 'kkk.kkk.kkk.', 'kyk.kyk.krk.', 'kkk.kkk.kkk.',
  ],
  guard_hold: [ // a gold shield with a lock
    '.kkkkkkkkkk.', 'kyyyyyyyyyyk', 'kyaaakkaaayk', 'kyaakaakaayk', 'kyaakaakaayk', 'kyakkkkkkayk',
    '.kyakwwkayk.', '.kyakwwkayk.', '..kykkkkyk..', '...kyyyyk...', '....kkkk....', '............',
  ],
  guard_lock: [ // a gold shield held by a chain
    '.kkkkkkkkkk.', 'kyyyyyyyyyyk', 'kyaaaaaaaayk', 'kkkkkkkkkkkk', 'kgkgkgkgkgkk', 'kkkkkkkkkkkk',
    '.kyaaaaaayk.', '.kyaaaaaayk.', '..kyaaaayk..', '...kyyyyk...', '....kkkk....', '............',
  ],
  // ------------------------------------------------------------ graft
  decomposer: [ // a mushroom with a rot drip
    '...kkkkkk...', '..kvvvvvvk..', '.kvvwvvwvvk.', 'kvvvvvvvvvvk', 'kkkkkkkkkkkk', '....kwwk....',
    '....kwwk....', '....kwwk....', '...kwwwwk...', '...kkkkkk...', '..l.....l...', '.l.......l..',
  ],
  dusk_pruning: [ // shears under a setting sun
    '....oooo....', '...oyyyyo...', 'nnnnnnnnnnnn', 'k.........k.', 'kwk......kwk', '.kwk....kwk.',
    '..kwk..kwk..', '...kwkkwk...', '....kwwk....', '...kekkek...', '..kek..kek..', '..kk....kk..',
  ],
  living_hedge: [ // a hedge wall of leaves
    '..kk..kk....', '.keek.keek..', 'keeeekeeeek.', 'keGeeeeeGeek', 'keeeeGeeeeek', 'keGeeeeeGeek',
    'keeeeeGeeeek', 'kkkkkkkkkkkk', 'kuukuukuukuk', 'kuukuukuukuk', 'kkkkkkkkkkkk', '............',
  ],
  thorn_halo: [ // a ring of thorns
    '.....k......', '..k.kuk.k...', '.kuk.k.kuk..', '..kuuuuuk...', '.kuk...kuk..', 'kuk.....kuk.',
    '.kuk...kuk..', '..kuuuuuk...', '.kuk.k.kuk..', '..k.kuk.k...', '.....k......', '............',
  ],
  ripening_rot: [ // a rot skull with an up arrow
    '.....kk.....', '....klk.....', '...klllk....', '..kkkkkkk...', '..kllllllk..', '.klvvllvvlk.',
    '.klvvllvvlk.', '.kllllllllk.', '..klllkllk..', '...kvkvkvk..', '....kkkkk...', '............',
  ],
  quickening_sap: [ // a sap drop with a cost-zero bubble
    '.....kk.....', '....kaak....', '...kaaaak...', '..kayaaaak..', '..kayaaaak..', '..kaaaaaak..',
    '...kaaaak...', '....kkkkkkk.', '.......kbbbk', '......kbwbbk', '......kbbbk.', '.......kkk..',
  ],
  fungal_aegis: [ // a mushroom-cap shield
    '...kkkkkk...', '..kvvvvvvk..', '.kvvwvvwvvk.', 'kvvvvvvvvvvk', 'kssssssssssk', 'ksbbbbbbbbsk',
    '.ksbbbbbbsk.', '.ksbbbbbbsk.', '..ksbbbbsk..', '...ksssk....', '....kkk.....', '............',
  ],
  thresher: [ // a spinning blade of leaves
    '.....kk.....', '....kwwk....', 'kk..kwwk..kk', 'kwwk.kk.kwwk', '.kwwkeekwwk.', '...kekkek...',
    '...kekkek...', '.kwwkeekwwk.', 'kwwk.kk.kwwk', 'kk..kwwk..kk', '....kwwk....', '.....kk.....',
  ],
  hyphal_web: [ // a web of white threads
    'k....k....k.', '.k...k...k..', '..k.kkk.k...', '...kwwwk....', 'kkkwwkwwkkkk', '...kwwwk....',
    '..k.kkk.k...', '.k...k...k..', 'k....k....k.', '............', '............', '............',
  ],
  clear_cut: [ // a row of cut stumps under a blade
    '..kkkkkkkk..', '.kggggggwk..', '..kkkkkkkk..', '............', '.k..k..k..k.', 'kuk.kuk.kuk.',
    'kak.kak.kak.', 'kuk.kuk.kuk.', 'kuk.kuk.kuk.', 'kuk.kuk.kuk.', 'kkkkkkkkkkkk', '............',
  ],
  deep_rot: [ // a rot skull sinking into roots
    '..kkkkkkk...', '.klllllllk..', '.klvvlvvlk..', '.klvvlvvlk..', '..klllllk...', '...kvkvk....',
    'kkkkkkkkkkkk', 'kDDvDDDvDDDk', 'kDvDDDvDDvDk', 'kvDDDvDDvDDk', 'kDDDvDDvDDDk', 'kkkkkkkkkkkk',
  ],
  rootstock: [ // a gold-glowing root trunk with grafted branches
    '.y...y...y..', '.kk..kk..kk.', '..kk.kk.kk..', '...kkuukk...', '....kuuk....', '....kuuk....',
    '....kuuk....', '...kuuuuk...', '..kuukkuuk..', '.kuk....kuk.', 'kuk......kuk', 'kk........kk',
  ],
  perennial: [ // a gold flower in a return circle
    '...kkkkkk...', '..k......k..', '.k..kyyk..k.', 'k..kyaayk..k', 'k.kyaaaayk.k', 'k.kyaaaayk.k',
    'k..kyaayk..k', 'k...kyyk...k', '.k...kk...kk', '..k..ee..kkk', '...kkeekk...', '.....ee.....',
  ],
  // ------------------------------------------------------------ chronist
  striking_train: [ // a clock gear with a strike spark
    '....kkkk....', '..kkaaaakk..', '.kaakkkkaak.', '.kakwwwwkak.', 'kaakwkkwkaak', 'kaakwkywkaak',
    'kaakwwkwkaak', '.kakwwwwkak.', '.kaakkkkaak.', '..kkaaaakk..', '....kkkk..y.', '.........yy.',
  ],
  tide_table: [ // waves under a card
    '...kkkkkk...', '...kwwwwk...', '...kwbbwk...', '...kwbbwk...', '...kkkkkk...', '............',
    '.ss...ss....', 'sbbs.sbbs.ss', 'bbbbsbbbbsbb', 'nbbbbbnbbbbb', 'nnnbnnnnnbnn', 'nnnnnnnnnnnn',
  ],
  storm_warning: [ // a storm cloud with a bolt
    '...kkkk.....', '.kkggggkkk..', 'kggggggggggk', 'kggwggggggwk', '.kkkkkkkkkk.', '.....ky.....',
    '....kyy.....', '...kyyyyk...', '.....kyk....', '....kyk.....', '....kk......', '............',
  ],
  escapement: [ // a ratchet escape wheel with an arrow
    '....kkkk....', '..kk.kk.kk..', '.k..kaak..k.', '.kkkaaaakkk.', 'k.kaawwaak.k', 'kkkawkkwakkk',
    'k.kaawwaak.k', '.kkkaaaakkk.', '.k..kaak..k.', '..kk.kk.kkl.', '....kkkk.lll', '.........kl.',
  ],
  polyrhythm: [ // two rows of beat pips
    '............', 'kkk.kkk.kkk.', 'kyk.kgk.kyk.', 'kkk.kkk.kkk.', '............', '.kkk.kkk.kkk',
    '.kgk.kyk.kgk', '.kkk.kkk.kkk', '............', 'kkk.kkk.kkk.', 'kyk.kyk.kyk.', 'kkk.kkk.kkk.',
  ],
  portents: [ // a crystal ball with a red crack
    '...kkkkkk...', '..kiiiiwwk..', '.kiiriiiwwk.', '.kiiirriiik.', '.kiiiiiriik.', '.kiiiiiiiik.',
    '..kiiiiiik..', '...kkkkkk...', '..kuuuuuuk..', '.kuuuuuuuuk.', '.kkkkkkkkkk.', '............',
  ],
  watch_bell: [ // a bronze bell
    '.....kk.....', '....kaak....', '...kaayak...', '..kaaayaak..', '..kaaayaak..', '..kaaaaaak..',
    '.kaaaaaaaak.', 'kaaaaaaaaaak', 'kkkkkkkkkkkk', '.....kk.....', '.....kk.....', '............',
  ],
  perpetual_motion: [ // a loop arrow around a pip
    '...kkkkk....', '..klllllk...', '.klkkkkklk..', 'klk.....klk.', 'klk..kk.kllk', 'klk.kyyk.kl.',
    'klk.kyyk....', 'klk..kk..k..', '.klk....klk.', '..klkkkklk..', '...kllllk...', '....kkkk....',
  ],
  accelerando: [ // a metronome leaning fast
    '.........kk.', '........kwk.', '.......kwk..', '....kkkwk...', '...kaakkk...', '..kaakwak...',
    '..kaawkak...', '.kaaakaaak..', '.kaaaaaaak..', 'kaaaaaaaaak.', 'kkkkkkkkkkk.', '............',
  ],
  squall_line: [ // slanted grey rain lines and a red mark
    'g...g...g...', '.g...g...g..', '..g...g...g.', '...g...g...g', 'g...g...g...', '.g...g..kkk.',
    '..g...g.krk.', '...g...gkkk.', 'g...g...g...', '.g...g...g..', '..g...g...g.', '...g...g...g',
  ],
  total_eclipse: [ // a black moon over a gold sun
    '...yyyyyy...', '..ywwwwwwy..', '.ywkkkkkkwy.', 'ywkkkkkkkkwy', 'ywkkkkkkkkwy', 'ywkkkkkkkkwy',
    'ywkkkkkkkkwy', 'ywkkkkkkkkwy', '.ywkkkkkkwy.', '..ywwwwwwy..', '...yyyyyy...', '............',
  ],
  eternal_return: [ // a clock face in a loop
    '..kkkkkkkk..', '.kl......lk.', 'kl.kkkkkk.lk', 'k.kwwwwwwk.k', 'k.kwwkwwwk.k', 'k.kwwkkkwk.k',
    'k.kwwwwwwk.k', 'kl.kkkkkk.lk', '.kl......lk.', '..kkkkkkllk.', '........kllk', '.........kk.',
  ],
  eye_of_the_storm: [ // a calm blue eye in a spiral
    '..gggggg....', '.g......g...', 'g..kkkkk.g..', 'g.kssssskg..', 'g.ksbbbskg..', 'g.ksbnbsk.g.',
    'g.ksbbbsk.g.', '.g.kssssk.g.', '.g..kkkk..g.', '..g......g..', '...gggggg...', '............',
  ],
  // ------------------------------------------------------------ colourless / relic powers
  salvage_kiln: [ // a kiln with a gear in the fire
    '...kkkkkk...', '..kddddddk..', '.kddddddddk.', 'kddkkkkkkddk', 'kdkoyoyoykdk', 'kdkogwgookdk',
    'kdkoyoyoykdk', 'kddkkkkkkddk', 'kddddddddddk', 'kkkkkkkkkkkk', '.kk......kk.', '............',
  ],
  prism_resonance: [ // a shard ringing
    '.....kk.....', '....kick....', 'm..kiicck..m', '.mkiiiccckm.', '.kiiiicccck.', 'kmmmmmPPPPPk',
    '.kmmmmPPPPk.', '.mkmmmPPPkm.', 'm..kmmPPk..m', '....kmPk....', '.....kk.....', '............',
  ],
  // ------------------------------------------------------------ events
  event_choir_vigor: [ // a green heart with a note
    '.........kk.', '.kkk...kkkwk', 'kllGk.klkkwk', 'klwGGkGGk.k.', 'kGGGGGGGGk..', 'kGGGGGGGDk..',
    '.kGGGGGGDk..', '..kGGGGDk...', '...kGGDk....', '....kDk.....', '.....k......', '............',
  ],
  event_echo_strength: [ // a figure and its faded echo
    '..kk...PP...', '.kwwk.PiiP..', '.kwwk.PiiP..', '..kk...PP...', '.kwwk.PiiP..', 'kwwwwkiiiiP.',
    'kwkkwkiPPiP.', '.kwwk.PiiP..', '.kwwk.PiiP..', '.kkkk.PPPP..', '............', '............',
  ],
  // ------------------------------------------------------------ enemy passives (act 1-3, bosses)
  shrill: [ // a mouth with sound arcs
    '.......p....', '.kkkkk..p...', 'kwwwwwk..p..', 'kwkkkwk.p.p.', 'kkrrrkk..p.p', 'kkrrrkk..p.p',
    'kwkkkwk.p.p.', 'kwwwwwk..p..', '.kkkkk..p...', '.......p....', '............', '............',
  ],
  reads_the_guard: [ // an eye on a gold shield
    '.kkkkkkkkkk.', 'kyyyyyyyyyyk', 'kyaaaaaaaayk', 'kyakkkkkkayk', 'kykwwbbwwkyk', 'kykwbnnbwkyk',
    '.kykwbbwkyk.', '.kyakkkkayk.', '..kyaaaayk..', '...kyyyyk...', '....kkkk....', '............',
  ],
  mycelial_bond: [ // threads joining a card to a mushroom
    '...kkkkk....', '..kvvvvvk...', '.kvvwvvvvk..', '.kkkkkkkkk..', '....kwk.....', '....kwk.....',
    'kkkk.l.l....', 'kggk..l.l...', 'kggkl.l..l..', 'kggk..l..l..', 'kkkk.l..l...', '............',
  ],
  soft_underbelly: [ // a pink belly with a target
    '............', '..kkkkkkkk..', '.kppppppppk.', 'kppkkkkkkppk', 'kpkprrrrpkpk', 'kpkprwwrpkpk',
    'kpkprwwrpkpk', 'kpkprrrrpkpk', 'kppkkkkkkppk', '.kppppppppk.', '..kkkkkkkk..', '............',
  ],
  sealed_pattern: [ // a sealed scroll with a wax seal
    '.kkkkkkkkkk.', 'kwwwwwwwwwwk', 'kwggggggggwk', 'kwwwwwwwwwwk', 'kwgggkkkggwk', 'kwwwkrrrkwwk',
    'kwggkrRrkgwk', 'kwwwkrrrkwwk', 'kwgggkkkggwk', 'kwwwwwwwwwwk', '.kkkkkkkkkk.', '............',
  ],
  inventory: [ // a ledger with tally marks
    '.kkkkkkkkkk.', '.kuuuuuuuuk.', '.kuwwwwwwuk.', '.kuwkwkwkuk.', '.kuwkwkwkuk.', '.kuwkkkkkuk.',
    '.kuwkwkwkuk.', '.kuwwwwwwuk.', '.kuwwwwwwuk.', '.kuuuuuuuuk.', '.kkkkkkkkkk.', '............',
  ],
  bonded: [ // two linked rings
    '............', '.kkkk..kkkk.', 'kccckkkkiiik', 'kc..kcik..ik', 'kc..kcik..ik', 'kccckkkkiiik',
    '.kkkk..kkkk.', '............', '............', '............', '............', '............',
  ],
  overpressure: [ // a pressure gauge in the red
    '...kkkkkk...', '..kwwwwwwk..', '.kwgwwwwrwk.', 'kwgwwwwrrwwk', 'kwwwwwkrwwwk', 'kwwwwkkwwwwk',
    'kwwwwwwwwwwk', '.kwwwwwwwwk.', '..kkkkkkkk..', '....kddk....', '....kddk....', '....kkkk....',
  ],
  resonance: [ // a bell with spreading rings
    'P..........P', '.P...kk...P.', 'P...kaak...P', '.P.kaaaak.P.', 'P..kaaaak..P', '.P.kaaaak.P.',
    'P.kaaaaaak.P', '.kkkkkkkkkk.', '.....kk.....', '............', '............', '............',
  ],
  reflection: [ // a mirror with a reflected slash
    '..kkkkkkkk..', '.kiiiiiiiik.', '.kiwiiiiiik.', '.kiiwiiiwik.', '.kiiiwiwiik.', '.kiiiiwiiik.',
    '.kiiiwiwiik.', '.kiiwiiiwik.', '.kiiiiiiiik.', '..kkkkkkkk..', '....kuuk....', '...kkkkkk...',
  ],
  replicating: [ // a cell dividing
    '............', '.kkkk..kkkk.', 'kllllkkllllk', 'klwlllllwllk', 'kllGllllllGk', 'kllllkkllllk',
    '.kkkk..kkkk.', '............', '...kk..kk...', '..kllkkllk..', '...kk..kk...', '............',
  ],
  phage_age: [ // a sand timer with a green phage
    'kkkkkkkkkkkk', '.kllllllllk.', '..kllllllk..', '...kllllk...', '....kllk....', '.....kk.....',
    '....k..k....', '...k.ll.k...', '..k.llll.k..', '.kllllllllk.', 'kkkkkkkkkkkk', '............',
  ],
  horizon_pull: [ // a black hole swallowing a shield edge
    '..PPPPPP....', '.P......P...', 'P..kkkk..P..', 'P.kkkkkk.P..', 'P.kkkkkkkkss', 'P.kkkkkkkssb',
    'P.kkkkkk.Psb', 'P..kkkk..Ps.', '.P......P...', '..PPPPPP....', '............', '............',
  ],
  charge_meter: [ // a horn with a filling bar
    'kk..........', 'kwk.........', 'kwwk........', '.kwwkkkkk...', '..kwuuuuuk..', '...kuuuuuuk.',
    '....kkkkkkk.', '............', 'kkkkkkkkkkkk', 'krrrrrgggggk', 'kkkkkkkkkkkk', '............',
  ],
  ripening: [ // a fruit turning ripe
    '.....kk.....', '....kGk.....', '..kkkekkk...', '.klllllook..', 'kllllloooook', 'klllloooooRk',
    'klllooooooRk', '.kloooooooRk', '..kooooooRk.', '...kkkkkkk..', '............', '............',
  ],
  assembly_line: [ // a conveyor with a gear
    '....kkkk....', '...kgwwgk...', '..kgwkkwgk..', '..kgkkkkgk..', '..kgwkkwgk..', '...kgwwgk...',
    '....kkkk....', 'kkkkkkkkkkkk', 'kdkdkdkdkdkk', 'kkkkkkkkkkkk', '.kk..kk..kk.', '............',
  ],
  progress: [ // a progress bar with a wrench
    '..........k.', '.........kgk', '........kgk.', '.......kgk..', '......kgk...', '.....kgk....',
    '....kkk.....', '............', 'kkkkkkkkkkkk', 'kaaaaaaddddk', 'kkkkkkkkkkkk', '............',
  ],
  furnace_core: [ // a furnace with a hot core
    '.kkkkkkkkkk.', 'kddddddddddk', 'kdkkkkkkkkdk', 'kdkRRRRRRkdk', 'kdkRooooRkdk', 'kdkRoyyoRkdk',
    'kdkRoyyoRkdk', 'kdkRRRRRRkdk', 'kdkkkkkkkkdk', 'kddddddddddk', 'kkkkkkkkkkkk', '.kk......kk.',
  ],
  heat: [ // a thermometer
    '....kkk.....', '....kwk.....', '....kwk.kk..', '....krk.....', '....krk.kk..', '....krk.....',
    '....krk.kk..', '...krrrk....', '..krrrrrk...', '..krryrrk...', '...krrrk....', '....kkk.....',
  ],
  overflow: [ // a tank spilling over
    '..kkkkkkkk..', '..kbbbbbbks.', '..kbsbbbbkss', '..kbbbbbbk.s', '..kbbbbbbk.s', '..kbbbbbbk..',
    '..kbbbbbbk.s', '..kbbbbbbk..', '..kbbbbbbk..', '..kkkkkkkk..', '.........ss.', '........ssss',
  ],
  overflow_stored: [ // a sealed tank with a gauge line
    '..kkkkkkkk..', '..kwwwwwwk..', '..kddddddk..', '..kbbbbbbk..', '..kbbbbbbk..', 'kkkrrrrrrkkk',
    '..kbbbbbbk..', '..kbbbbbbk..', '..kbbbbbbk..', '..kkkkkkkk..', '...kk..kk...', '............',
  ],
  catalogue: [ // stacked books
    '............', 'kkkkkkkkkkk.', 'kbbbbbbbbbk.', 'kkkkkkkkkkk.', '.kkkkkkkkkkk', '.kMMMMMMMMMk',
    '.kkkkkkkkkkk', 'kkkkkkkkkkk.', 'kGGGGGGGGGk.', 'kkkkkkkkkkk.', '.kkkkkkkkkkk', '.kaaaaaaaaak',
  ],
  archive_page: [ // a page with lines and a folded corner
    '.kkkkkkk....', '.kwwwwwkk...', '.kwggwwkwk..', '.kwwwwwkkkk.', '.kwggggggwk.', '.kwwwwwwwwk.',
    '.kwggggggwk.', '.kwwwwwwwwk.', '.kwgggggwwk.', '.kwwwwwwwwk.', '.kkkkkkkkkk.', '............',
  ],
  frenzy: [ // three claw slashes and a growing pip (v2 encounters)
    '..kk..kk..kk', '.kprkkprkkrk', '.krrkkrrkkrk', 'krrkkrrkkrrk', 'krrkkrrkkrrk', 'krRkkrRkkrRk',
    'krk.krk.krk.', '.k...k...k..', '.........kk.', '........krrk', '........krrk', '.........kk.',
  ],
  scour_rite: [ // an oil drop washing a green blob clean (v2 encounters)
    '.....kk.....', '....kyak....', '...kyaauk...', '..kyaaauuk..', '..kyaaauuk..', '..kaaauuuk..',
    '...kauuuk...', '.kkkwawkkkk.', 'kGGGwwwwwwwk', 'klGGGGwwwwDk', '.kDDDDwwwDk.', '..kkkkkkkk..',
  ],
  facets: [ // a cracked crystal shedding a shard (v2 encounters)
    '....kk......', '...kiik.....', '..kwiisk....', '.kwiikssk...', 'kwiikssssk..', 'kiiikssssk..',
    '.kiiskssk...', '..kiiksk.kk.', '..kiisk.kisk', '...kisk.kssk', '....kk...kk.', '............',
  ],
  seething: [ // a red, steaming, scowling face (v2 encounters)
    '..kk....kk..', '.kwk...kwk..', '..kwk...kwk.', '..kkkkkkkk..', '.kprrrrrrRk.', 'kprkrrrrkrRk',
    'krwwkrrkwwRk', 'krrrrrrrrRRk', 'krrrkkkkrRRk', '.krrkrrkrRk.', '..kRRRRRRk..', '...kkkkkk...',
  ],
  seed_bank: [ // a seed pouch with three seeds (Phase D, Mother Orchid)
    '...kkkkkk...', '...kauuak...', '....kuuk....', '...kkaakk...', '..kauuuuak..', '.kauuuuuauk.',
    'kalGulGulGuk', 'kaGDuGDuGDuk', 'kaDDuDDuDDuk', 'kauuuuuuuuuk', '.kuuuuuuuuk.', '..kkkkkkkk..',
  ],
  white_fever: [ // a white cell glowing fever-red at its core (Phase D, Leukarch)
    '....kkkk....', '..kkwwwwkk..', '.kwwwwwwwwk.', '.kwwwRRwwwk.', 'kwwwRrrRwwwk', 'kwwRroorRwwk',
    'kwwRroorRwgk', 'kwwwRrrRwwgk', '.kwwRRRRwgk.', '.kgwwwwwggk.', '..kkggggkk..', '....kkkk....',
  ],
  crown_rage: [ // a gold crown with a red flare (Phase D, Tether Sovereign)
    '......kk....', '.....krk....', '....krprk...', 'kk..krrRk.kk', 'kyk..kkk.kyk', 'kyak.kykkayk',
    'kyaakyaakayk', 'kyaaaaaaaauk', 'kyaayyyyaauk', 'kayaaaaaauuk', '.kuuuuuuuuk.', '..kkkkkkkk..',
  ],
};
