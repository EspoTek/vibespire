# The Chronist — card pool (56)

> **v2 supersedes this file's card list.** The live pool and its design are in `docs/v2/chronist-design.md`; only the §5 archetype matrix below is current (v2).

Status: v1, card designer (Chronist). Source of truth for rules is `docs/GDD.md`; this file only adds card content. Every card is priced against GDD §8.5. Every machine block can be transcribed into a `CardDef` (ENGINE_SPEC §8, `src/engine/types.ts`).

Pool: **4 starters** (GDD §4.1, verbatim) + **20 common** + **20 uncommon** + **12 rare** = 56. Types: **22 Attacks (39%)**, **26 Skills (46%)**, **8 Powers (14%; uncommon/rare only)**. **19 cards cost 0 (34%)**. **16 Delay cards** (Tock + 15; N=1 ×10, N=2 ×3, N=3 ×3; 5 are split cards with an immediate part). 2 Opening (both upgrade-only), 2 Keep, 0 Ethereal, 2 Shard cards. 0 `custom` effects; 2 named fns + 2 code hooks (§8).

## 0. How to read this file

### 0.1 Human rows
`Text` shows the base card, then `→` the upgraded change. `Arch` uses **M** Metronome (Cadence), **T** Timeline (Delay), **O** Oracle (Augury), **G** Glue (cycling, cheap pokes, Guard, plain efficiency).

### 0.2 Machine blocks (YAML → TypeScript)
- Same conventions as `docs/cards/graft.md` §0.2. Each effect is a one-key map: `damage: {...}` means `{ type: 'damage', ... }`. Conditions are one-key maps too: `on_beat: {}` → `{ type: 'on_beat' }`, `forecast_is_attack: { who, depth }`, `timeline_nonempty: {}`, `not: <cond>`, `fn: name`.
- **`depth`** follows `types.ts`: **0 = the current intent, 1 = the intent after next** (`forecast[0]`). Text: depth 1 is "its intent after next", depth 0 is "it intends to attack".
- **Amount scales used**: `forecast_damage` (types.ts: total attack damage in the target's forecast), `cards_played_this_turn` (includes the card being played: GDD §2.7 appends at pay-cost time), `timeline_count`, `shards`, `stacks` (inside a power's status triggers), `x`, and `{fn: name}` (§8). Amounts resolve as `floor(base + per × scale)`.
- **Delay** is the `delay: { turns, effects }` field (GDD §9 item 6); the `delay` keyword is display-only. Inside `delay.effects`, `target` is the stamped target, `on_beat` reads the stamp, `x` is the stamped X, and **conditions and amounts are evaluated at resolution** (GDD §2.8). A Delay card's "intends to attack" therefore checks the move that was "after next" when the card was played.
- `on_beat: { effects }` is the wrapper (repeated by the `onBeatRepeats` modifier: Offbeat Drum, Polyrhythm). A `conditional` on `on_beat` (Sweep Hand) is a branch, not a wrapper, and is never repeated.
- **Powers** apply a player status that carries the behaviour, exactly like graft.md: a `status_def` with `stacks`, `decay: never`, `tick: never`, `isDebuff: false` and declarative `triggers` keyed by hook name. The status id is the card id. Two copies add their stacks.
- **Keywords** use engine ids: Scrap = `exhaust`, Keep = `retain`, Opening = `innate`, plus display-only `delay`.
- **Text templates** follow `src/engine/text.ts`. Values inside `on_beat` and `delay` lists carry an explicit `key`. **[ask] `text.ts` must also visit `on_beat.effects` and `delay.effects` (after `effects`), and give `advance`, `guard` and `shards` effects a value; until then `renderTemplate` throws on those keys.** `{x_per}` placeholders follow graft.md's `<key>_per` ask.
- **Engine-wide rules these cards rely on (no per-card hook)**: a Delay card is unplayable while the Timeline holds 10 entries (`cap_timeline`), and unplayable for the rest of a turn in which it resolved from the Timeline (`cap_relay`, my reading in §11).

### 0.3 Pricing conventions (GDD §8.5, plus the calls I had to make)
"d" = common damage-equivalent, "b" = Block. Rates per energy: common 7 d / 6 b / 7 Guard, uncommon 8.5 d / 7 b / 8 Guard, rare 10 d / 8 b / 10 Guard. A 0-cost card is budgeted at 0.5 energy (3.5 d / 3 b common, 4.25 d / 3.5 b uncommon, 5 d / 4 b rare). Draw 1 = 3 d. +1 energy = 7 d. Exposed 1 = 3 d (4 d in multi-hit decks). Stagger 1 = 2 b (3 b against multi-hit).

1. **On beat**: an `on_beat` payload is worth 0.6 × face. A card whose main payload is on the beat may pay out up to 1.6 × budget on the beat.
2. **Delay**: delayed face value ÷ 1.5 / 2.0 / 2.5 for N = 1 / 2 / 3. Split cards: immediate part × 1, delayed part ÷ multiplier.
3. **Forecast conditions (+40%)**: a payload gated by a forecast condition is worth face ÷ 1.4. For "X, or Y if …" the value is X + (Y − X) ÷ 1.4. A depth-0 condition **inside a Delay 1 card** is a forecast condition too: at play time it is the after-next intent, which only the Chronist sees.
4. **AoE** (no GDD row): an ALL-enemies effect is worth 1.25 × its per-target face, the same call as graft.md §0.3.2 (0.8 × rate per target).
5. **Guard**: priced by the rate table (1 Guard = 1 d at common; 10 Guard = 8 b at rare). GDD §8.5's "Guard N = 1.2 × Block N" row contradicts the rate table; see §11.3.
6. **"Can only / can't be played on the beat"** is "playable only if a condition holds": +50%.
7. **Expected values** (from GDD §8.1–8.3 and ENEMIES.md): a forecast attack deals 11 / 18 / 27 damage in acts 1 / 2 / 3 (priced at Act 2: 18); about 65% of enemy intents are attacks; Timeline entries at play time ≈ 1.5 in a Timeline deck; Shards held ≈ 2 (graft.md §0.3.5); a 0-cost filler is played around 3rd–4th.
8. **Power setup**: 3 turns of per-turn value ≈ cost × rate.

"%" in a note means value ÷ budget.

### 0.4 The decisions the pool is built around
- **Which card goes on 3?** Beats are fixed at 3/6/9 (cards never move them; only Tempo Draught and relics do). The pool gives every beat a different payoff: damage (Downbeat, Fermata, Zenith), AoE (Sweep Hand, Carillon), energy (Mainspring, Tourbillon), draw (Tick, Quarter Chime, Ephemeris), Stagger (Balance Wheel, Detent). It also gives fillers that refuse the beat (Upbeat) or only work there (Zenith). 0-cost cards are individually weak (≈ 0.5 energy), so a beat costs real card slots.
- **What will the board look like next turn?** Delay 1 lands before your next draw and before the after-next enemy move. That is exactly what the second intent shows, so Delay 1 cards (Storm Glass, Breakwater, Batten Down, Seen It Coming) are the Oracle's defensive tools. Delay 2–3 (Noon Gun, Appointed Hour, Spring Tide, Syzygy) are the burst, aimed with patterns, Prophet Glass or Advance.
- **Hold or cash it?** Forecast cards pay more in windows ("if its intent after next isn't an attack"). Holding them is the Oracle's sequencing choice, and two Keep cards make holding a plan.

---
## 1. Starters (4) — final, verbatim from GDD §4.1

| id | Name | Type | Cost | Text (base → upgraded) | Arch |
|---|---|---|---|---|---|
| `pulse_shot` | Pulse Shot | attack | 1 | Deal 6 damage. → 9 | G |
| `ward` | Ward | skill | 1 | Gain 5 Block. → 8 | G |
| `tick` | Tick | attack | 0 | Deal 3 damage. On beat: draw 1 card. → 4, On beat: draw 2 | M G |
| `tock` | Tock | skill | 1 | Gain 3 Block. Delay 1: gain 5 Block. → 4 / 7 | T |

```card
id: pulse_shot
name: Pulse Shot
cls: chronist
type: attack
rarity: starter
cost: 1
target: enemy
keywords: []
text: "Deal {damage} damage."
effects:
  - damage: { amount: 6, target: target }
upgrade:
  effects:
    - damage: { amount: 9, target: target }
tags: [starter, glue]
note: "GDD §4.1 (final). Starter rate 6 d. The first removal target; Shard removals in a Chronist run go here."
```

```card
id: ward
name: Ward
cls: chronist
type: skill
rarity: starter
cost: 1
target: self
keywords: []
text: "Gain {block} Block."
effects:
  - block: { amount: 5 }
upgrade:
  effects:
    - block: { amount: 8 }
tags: [starter, glue, block]
note: "GDD §4.1 (final). Starter rate 5 b. Kept longer than Pulse Shot: the Chronist is the most fragile class (66 HP)."
```

```card
id: tick
name: Tick
cls: chronist
type: attack
rarity: starter
cost: 0
target: enemy
keywords: []
text: "Deal {damage} damage. On beat: draw {beat_draw} card."
effects:
  - damage: { amount: 3, target: target }
  - on_beat: { effects: [ { draw: { n: 1, key: beat_draw } } ] }
upgrade:
  text: "Deal {damage} damage. On beat: draw {beat_draw} cards."
  effects:
    - damage: { amount: 4, target: target }
    - on_beat: { effects: [ { draw: { n: 2, key: beat_draw } } ] }
tags: [starter, metronome, glue, cheap, on_beat, draw]
note: "GDD §4.1 (final). 3 + 0.6 × 3 = 4.8 d for a 0-cost starter (budget 3 d): deliberately generous, because it is the starter's only way to reach beat 6. On-beat draw is bounded by the beat count (≤ 3 per turn, §9). Offbeat Drum doubles it (0-cost)."
```

```card
id: tock
name: Tock
cls: chronist
type: skill
rarity: starter
cost: 1
target: self
keywords: [delay]
text: "Gain {block} Block. Delay 1: gain {delay_block} Block."
effects:
  - block: { amount: 3 }
delay:
  turns: 1
  effects:
    - block: { amount: 5, key: delay_block }
upgrade:
  effects:
    - block: { amount: 4 }
  delay:
    turns: 1
    effects:
      - block: { amount: 7, key: delay_block }
tags: [starter, timeline, block, delay]
note: "GDD §4.1 (final). 3 + 5 ÷ 1.5 = 6.3 b (127% of starter 5 b). It teaches the split-card shape and that delayed Block lasts through the next enemy phase."
```

---
## 2. Commons (20)

9 Attacks, 11 Skills. 8 cost 0. 5 Delay cards. No common gains energy, returns a card to hand or reduces a cost (GDD §3). 15 of 20 fit two archetypes (75%); 4 straddle two of M/T/O (Afterpeal, Storm Glass, Balance Wheel, Detent).

| id | Name | Type | Cost | Text (base → upgraded) | Arch |
|---|---|---|---|---|---|
| `pinion_jab` | Pinion Jab | attack | 0 | Deal 3 damage. On beat: apply 1 Exposed. → 4 damage | M G |
| `gear_train` | Gear Train | attack | 1 | Deal 3 damage 2 times. On beat: deal 3 more. → 4 ×2, +4 | M G |
| `downbeat` | Downbeat | attack | 2 | Deal 13 damage. On beat: deal 6 more. → 16, +8 | M |
| `slack_water` | Slack Water | attack | 1 | Deal 7 damage, or 9 if its intent after next isn't an attack. → 9 / 12 | O G |
| `parallax` | Parallax | attack | 0 | Deal 2 damage 2 times. → 3 times | M G |
| `noon_gun` | Noon Gun | attack | 1 | Delay 2: deal 14 damage. → Opening, 16 | T |
| `afterpeal` | Afterpeal | attack | 1 | Deal 3 damage. Delay 1: deal 4 damage; On beat: 4 more. → 4 / 5 / 5 | T M |
| `spring_tide` | Spring Tide | attack | 1 | Delay 3: deal 16 damage to ALL enemies. → 20 | T |
| `carillon` | Carillon | attack | 0 | Deal 3 damage to ALL enemies. On beat: deal 2 more to ALL enemies. → 4, +2 | M G |
| `storm_glass` | Storm Glass | skill | 1 | Delay 1: gain 8 Block, +4 if any enemy intends to attack. → 10, +5 | O T |
| `almanac` | Almanac | skill | 0 | Delay 1: draw 2 cards. → On beat: draw 1 more | T G |
| `ephemeris` | Ephemeris | skill | 1 | Draw 2 cards. On beat: draw 1 more. → On beat: 2 more | G M |
| `upbeat` | Upbeat | skill | 0 | Gain 4 Block. Can't be played on the beat. → 6 | M G |
| `weather_eye` | Weather Eye | skill | 1 | Gain 6 Guard. If any enemy's intent after next is an attack, gain 4 more. → 8, +5 | O G |
| `balance_wheel` | Balance Wheel | skill | 1 | Gain 6 Block. On beat: apply 1 Stagger to ALL enemies. → 8 Block | M O |
| `detent` | Detent | skill | 0 | Apply 1 Stagger. On beat: apply 1 more. → On beat: 2 more | O M |
| `dead_reckoning` | Dead Reckoning | skill | 0 | Gain 1 Block, +1 per card played this turn (this one included). → 2 + 1 per card | M G |
| `logbook` | Logbook | skill | 1 | Gain 5 Block, +1 per Shard you hold. → 7 + 1 per Shard | G |
| `reef_the_sails` | Reef the Sails | skill | 1 | Gain 5 Block. If its intent after next is an attack, apply 2 Stagger to it. → 7 Block | O |
| `wind_forward` | Wind Forward | skill | 0 | Advance 1. If your Timeline is empty, gain 4 Block instead. → Advance 1 and 2 Block / 6 Block | T G |

```card
id: pinion_jab
name: Pinion Jab
cls: chronist
type: attack
rarity: common
cost: 0
target: enemy
keywords: []
text: "Deal {damage} damage. On beat: apply {beat_exposed} Exposed."
effects:
  - damage: { amount: 3, target: target }
  - on_beat: { effects: [ { status: { target: target, id: exposed, amount: 1, key: beat_exposed } } ] }
upgrade:
  effects:
    - damage: { amount: 4, target: target }
    - on_beat: { effects: [ { status: { target: target, id: exposed, amount: 1, key: beat_exposed } } ] }
tags: [metronome, glue, cheap, on_beat, exposed]
note: "0-cost common budget 3.5 d. 2 + 0.6 × 3 (Exposed 1) = 3.8 d (109%). Upgraded 3 + 1.8 = 4.8 d (+26%). The Exposed lands after the jab and lasts the rest of your turn (GDD §2.10), so play your multi-hits after it on beat turns. M: a free count-advancer that wants slot 3. G: the generic Exposed poke. No draw, energy or return: loop-inert."
tuned: "Sim pass 2026-10-29 (docs/balance/changelog.md): 2/3 → 3/4 damage (bottom-5% pick rate)."
```

```card
id: gear_train
name: Gear Train
cls: chronist
type: attack
rarity: common
cost: 1
target: enemy
keywords: []
text: "Deal {damage} damage {times} times. On beat: deal {beat_damage} more."
effects:
  - damage: { amount: 3, times: 2, target: target }
  - on_beat: { effects: [ { damage: { amount: 3, target: target, key: beat_damage } } ] }
upgrade:
  effects:
    - damage: { amount: 4, times: 2, target: target }
    - on_beat: { effects: [ { damage: { amount: 4, target: target, key: beat_damage } } ] }
tags: [metronome, glue, multihit, on_beat]
note: "Common 7 d. 3×2 = 6 + 0.6 × 3 = 7.8 d (111%). Upgraded 8 + 2.4 = 10.4 d (+33%). On the beat it is 3 hits on one enemy, so Exposed pays three times and Glass Spurs (3 hits from one play) triggers. M: a beat payoff for slot 3. G: multi-hit glue for any Exposed plan."
```

```card
id: downbeat
name: Downbeat
cls: chronist
type: attack
rarity: common
cost: 2
target: enemy
keywords: []
text: "Deal {damage} damage. On beat: deal {beat_damage} more."
effects:
  - damage: { amount: 13, target: target }
  - on_beat: { effects: [ { damage: { amount: 6, target: target, key: beat_damage } } ] }
upgrade:
  effects:
    - damage: { amount: 16, target: target }
    - on_beat: { effects: [ { damage: { amount: 8, target: target, key: beat_damage } } ] }
tags: [metronome, on_beat]
note: "Common 2 × 7 = 14 d. 11 + 0.6 × 6 = 14.6 d (104%). The on-beat payout of 17 is under the 1.6 × 14 = 22.4 cap. Upgraded 14 + 4.8 = 18.8 (+29%). The pool's 'big card on 3' puzzle: play two 0-costs, then this with 2 of your 3 energy. Upbeat is its natural setup. The bonus is a second hit, so Exposed counts twice."
tuned: "Sim pass 2026-10-29 (docs/balance/changelog.md): 11/14 → 13/16 (bottom-5% pick rate, 0.5%)."
```

```card
id: slack_water
name: Slack Water
cls: chronist
type: attack
rarity: common
cost: 1
target: enemy
keywords: []
text: "Deal {damage} damage, or {lull_damage} if its intent after next isn't an attack."
effects:
  - conditional:
      if: { forecast_is_attack: { who: target, depth: 1 } }
      then: [ { damage: { amount: 7, target: target } } ]
      else: [ { damage: { amount: 9, target: target, key: lull_damage } } ]
upgrade:
  effects:
    - conditional:
        if: { forecast_is_attack: { who: target, depth: 1 } }
        then: [ { damage: { amount: 9, target: target } } ]
        else: [ { damage: { amount: 12, target: target, key: lull_damage } } ]
tags: [oracle, glue, forecast]
note: "Common 7 d. 6 + (8 − 6) ÷ 1.4 = 7.4 d (106%). Upgraded 8 + 3 ÷ 1.4 = 10.1 (+36%). A Strike-equivalent that teaches reading the second intent: you hit hardest when the enemy will spend its after-next turn buffing or defending. Never worse than a common Strike. A hidden ('?') forecast counts as not an attack (§11.7). O, G."
tuned: "Sim pass 2026-10-29 (docs/balance/changelog.md): 6/8 → 7/9, upgraded 8/11 → 9/12 (bottom-5% pick rate)."
```

```card
id: parallax
name: Parallax
cls: chronist
type: attack
rarity: common
cost: 0
target: enemy
keywords: []
text: "Deal {damage} damage {times} times."
effects:
  - damage: { amount: 2, times: 2, target: target }
upgrade:
  effects:
    - damage: { amount: 2, times: 3, target: target }
tags: [metronome, glue, cheap, multihit]
note: "0-cost common 3.5 d. 2 × 2 = 4 d (114%). Upgraded 2 × 3 = 6 d (+50%; small absolute, and it is more hits rather than bigger ones). With Exposed 1 it is 6 (9 upgraded). It is the cheapest multi-hit, for Pinion Jab, Mark the Lull and Portents. M: a beat filler. G: a cheap poke."
```

```card
id: noon_gun
name: Noon Gun
cls: chronist
type: attack
rarity: common
cost: 1
target: enemy
keywords: [delay]
text: "Delay 2: deal {delay_damage} damage."
effects: []
delay:
  turns: 2
  effects:
    - damage: { amount: 14, target: target, key: delay_damage }
upgrade:
  keywords: [delay, innate]
  text: "Opening. Delay 2: deal {delay_damage} damage."
  delay:
    turns: 2
    effects:
      - damage: { amount: 16, target: target, key: delay_damage }
tags: [timeline, delay]
note: "Common 7 d. 14 ÷ 2.0 = 7 d (100%). Upgraded 16 ÷ 2 = 8 d plus Opening (an upside, ×0.9 budget): about +25%. Upgraded, it is a guaranteed 16 at the start of turn 3, when Act 1 elites peak. It is out of the draw cycle for two turns, which thins your next shuffle. 1 of 2 Opening cards (upgrade only). T."
```

```card
id: afterpeal
name: Afterpeal
cls: chronist
type: attack
rarity: common
cost: 1
target: enemy
keywords: [delay]
text: "Deal {damage} damage. Delay 1: deal {delay_damage} damage; On beat: {beat_damage} more."
effects:
  - damage: { amount: 3, target: target }
delay:
  turns: 1
  effects:
    - damage: { amount: 4, target: target, key: delay_damage }
    - on_beat: { effects: [ { damage: { amount: 4, target: target, key: beat_damage } } ] }
upgrade:
  effects:
    - damage: { amount: 4, target: target }
  delay:
    turns: 1
    effects:
      - damage: { amount: 5, target: target, key: delay_damage }
      - on_beat: { effects: [ { damage: { amount: 5, target: target, key: beat_damage } } ] }
tags: [timeline, metronome, delay, on_beat]
note: "Common 7 d. 3 + 4 ÷ 1.5 + 0.6 × 4 ÷ 1.5 = 3 + 2.67 + 1.6 = 7.27 d (104%). Upgraded 4 + 3.33 + 2 = 9.3 (+28%). The beat is stamped when you play it (GDD §2.7): land it on 3 now and collect next turn. It is the common bridge between the beat and the Timeline. T, M."
```

```card
id: spring_tide
name: Spring Tide
cls: chronist
type: attack
rarity: common
cost: 1
target: all_enemies
keywords: [delay]
text: "Delay 3: deal {delay_damage} damage to ALL enemies."
effects: []
delay:
  turns: 3
  effects:
    - damage: { amount: 16, target: all_enemies, key: delay_damage }
upgrade:
  delay:
    turns: 3
    effects:
      - damage: { amount: 20, target: all_enemies, key: delay_damage }
tags: [timeline, delay, aoe]
note: "Common 7 d. 14 × 1.25 (AoE) ÷ 2.5 = 7 d (100%). Upgraded 18: 9 d (+29%). Delay 3 is the class's slow AoE, for packs whose HP will still be there in Act 2 width fights. Played on turn 1 of a 4-turn hallway fight it lands on turn 4; Wind Forward or Hasten pull it in. T."
tuned: "Sim pass 2026-10-29 (docs/balance/changelog.md): 14/18 → 16/20 (Act 2 width: the Chronist died to multi-enemy hallways)."
```

```card
id: carillon
name: Carillon
cls: chronist
type: attack
rarity: common
cost: 0
target: all_enemies
keywords: []
text: "Deal {damage} damage to ALL enemies. On beat: deal {beat_damage} more to each."
effects:
  - damage: { amount: 3, target: all_enemies }
  - on_beat: { effects: [ { damage: { amount: 2, target: all_enemies, key: beat_damage } } ] }
upgrade:
  effects:
    - damage: { amount: 4, target: all_enemies }
    - on_beat: { effects: [ { damage: { amount: 2, target: all_enemies, key: beat_damage } } ] }
tags: [metronome, glue, cheap, aoe, on_beat]
note: "0-cost common 3.5 d. 2 × 1.25 + 0.6 × 2 × 1.25 = 2.5 + 1.5 = 4.0 d (114%). Upgraded 3 / 2: 3.75 + 1.5 = 5.25 (+31%). On the beat it deals 4 to each enemy, which clears Orchid Buds and Gnasher packs. M, G (cheap AoE poke)."
tuned: "Sim pass 2026-10-29 (docs/balance/changelog.md): 2/3 → 3/4 (Act 2 width)."
```

```card
id: storm_glass
name: Storm Glass
cls: chronist
type: skill
rarity: common
cost: 1
target: self
keywords: [delay]
text: "Delay 1: gain {delay_block} Block, +{storm_block} if any enemy intends to attack."
effects: []
delay:
  turns: 1
  effects:
    - block: { amount: 8, key: delay_block }
    - conditional:
        if: { forecast_is_attack: { who: any, depth: 0 } }
        then: [ { block: { amount: 4, key: storm_block } } ]
upgrade:
  delay:
    turns: 1
    effects:
      - block: { amount: 10, key: delay_block }
      - conditional:
          if: { forecast_is_attack: { who: any, depth: 0 } }
          then: [ { block: { amount: 5, key: storm_block } } ]
tags: [oracle, timeline, block, delay, forecast]
note: "Common 6 b. 7 ÷ 1.5 + 4 ÷ 1.5 ÷ 1.4 = 4.67 + 1.9 = 6.57 b (109%). Upgraded 6 + 2.38 = 8.4 b (+28%). The condition is checked at resolution (GDD §2.8), so 'intends to attack' is the move you saw as 'after next' when you played it (the ÷1.4 forecast price, §0.3.3). Delayed Block arrives before your draw and lasts through the coming enemy phase. This is the 'Delay 1 wall arrives with the big hit' of GDD §1.4, at common. O, T."
tuned: "Sim pass 2026-10-29 (docs/balance/changelog.md): delayed Block 7/9 → 8/10 (Act 2 defence)."
```

```card
id: almanac
name: Almanac
cls: chronist
type: skill
rarity: common
cost: 0
target: none
keywords: [delay]
text: "Delay 1: draw {delay_draw} cards."
effects: []
delay:
  turns: 1
  effects:
    - draw: { n: 2, key: delay_draw }
upgrade:
  text: "Delay 1: draw {delay_draw} cards. On beat: draw {beat_draw} more."
  delay:
    turns: 1
    effects:
      - draw: { n: 2, key: delay_draw }
      - on_beat: { effects: [ { draw: { n: 1, key: beat_draw } } ] }
tags: [timeline, glue, cheap, draw, delay]
note: "0-cost common 3.5 d. 2 draws = 6 d ÷ 1.5 = 4 d (114%). Upgraded, + 0.6 × 3 ÷ 1.5 = 1.2: 5.2 d (+30%). It draws at turn start, before the normal 5 (GDD §2.0 steps 5–6): a 7-card turn is how a Chronist reaches beat 6. Loop: it never draws this turn. With Advance it resolves now, but cap_relay stops it going back on the Timeline that turn (§9). T, G."
```

```card
id: ephemeris
name: Ephemeris
cls: chronist
type: skill
rarity: common
cost: 1
target: none
keywords: []
text: "Draw {draw} cards. On beat: draw {beat_draw} more."
effects:
  - draw: { n: 2 }
  - on_beat: { effects: [ { draw: { n: 1, key: beat_draw } } ] }
upgrade:
  effects:
    - draw: { n: 2 }
    - on_beat: { effects: [ { draw: { n: 2, key: beat_draw } } ] }
tags: [glue, metronome, draw, on_beat]
note: "Common 7 d. 6 + 0.6 × 3 = 7.8 d (111%). Upgraded 6 + 3.6 = 9.6 (+23%). It costs 1, so it is energy-bound: at most 7 copies a turn even at the bonus-energy cap, each +1 card net (+2 on the beat). G, M."
```

```card
id: upbeat
name: Upbeat
cls: chronist
type: skill
rarity: common
cost: 0
target: self
keywords: []
text: "Gain {block} Block. Can't be played on the beat."
effects:
  - block: { amount: 4 }
hooks:
  canPlay: { not: { fn: next_play_on_beat } }      # §8 fn 1; reason string "Can't be played on the beat"
upgrade:
  effects:
    - block: { amount: 6 }
tags: [metronome, glue, cheap, block]
note: "0-cost common 3 b. 'Playable only if' (+50%): 4 ÷ 1.5 = 2.67 b (89%). It is free Block, but only in slots 1, 2, 4, 5, 7 and 8. Upgraded 6 ÷ 1.5 = 4 (+50%). It is the setup half of Downbeat and Zenith: it pushes the count without spending the beat. It never gets the gold beat border, and the card greys in slot 3. M, G."
```

```card
id: weather_eye
name: Weather Eye
cls: chronist
type: skill
rarity: common
cost: 1
target: self
keywords: []
text: "Gain {guard} Guard. If any enemy's intent after next is an attack, gain {storm_guard} more."
effects:
  - guard: { amount: 6 }
  - conditional:
      if: { forecast_is_attack: { who: any, depth: 1 } }
      then: [ { guard: { amount: 4, key: storm_guard } } ]
upgrade:
  effects:
    - guard: { amount: 8 }
    - conditional:
        if: { forecast_is_attack: { who: any, depth: 1 } }
        then: [ { guard: { amount: 5, key: storm_guard } } ]
tags: [oracle, glue, guard, forecast]
note: "Common Guard rate 7 per energy (§0.3.5). 5 + 4 ÷ 1.4 = 7.86 (112%). Upgraded 7 + 3.57 = 10.6 (+35%). Guard gained now covers the next enemy phase, then halves into the after-next one (GDD §2.3). So the forecast condition is aimed exactly where the leftover lands. 1 of 3 Guard cards. O, G."
tuned: "Sim pass 2026-10-29 (docs/balance/changelog.md): 5/7 → 6/8 Guard (Act 2 defence)."
```

```card
id: balance_wheel
name: Balance Wheel
cls: chronist
type: skill
rarity: common
cost: 1
target: self
keywords: []
text: "Gain {block} Block. On beat: apply {beat_stagger} Stagger to ALL enemies."
effects:
  - block: { amount: 6 }
  - on_beat: { effects: [ { status: { target: all_enemies, id: stagger, amount: 1, key: beat_stagger } } ] }
upgrade:
  effects:
    - block: { amount: 8 }
    - on_beat: { effects: [ { status: { target: all_enemies, id: stagger, amount: 1, key: beat_stagger } } ] }
tags: [metronome, oracle, block, on_beat, stagger]
note: "Common 6 b. 5 + 0.6 × (2 b × 1.25 AoE) = 5 + 1.5 = 6.5 b (108%); against a multi-hit pack 7.25. Upgraded 8.5 b (+31%). On the beat the Stagger is on every enemy for the coming enemy phase (−1 per hit). M: a defensive beat card. O: Stagger timed to the multi-hits you can see."
tuned: "Sim pass 2026-10-29 (docs/balance/changelog.md): 5/7 → 6/8 Block (bottom-5% pick rate)."
```

```card
id: detent
name: Detent
cls: chronist
type: skill
rarity: common
cost: 0
target: enemy
keywords: []
text: "Apply {stagger} Stagger. On beat: apply {beat_stagger} more."
effects:
  - status: { target: target, id: stagger, amount: 1, key: stagger }
  - on_beat: { effects: [ { status: { target: target, id: stagger, amount: 1, key: beat_stagger } } ] }
upgrade:
  effects:
    - status: { target: target, id: stagger, amount: 1, key: stagger }
    - on_beat: { effects: [ { status: { target: target, id: stagger, amount: 2, key: beat_stagger } } ] }
tags: [oracle, metronome, cheap, stagger, on_beat]
note: "0-cost common 3 b. 2 + 0.6 × 2 = 3.2 b (107%); against a multi-hit 4.8. Upgraded 2 + 2.4 = 4.4 (+37%). With 2 stacks on the beat, the after-next move is also hit (−1). O: Stagger timed to a multi-hit you saw coming. M: a filler with a beat rider."
```

```card
id: dead_reckoning
name: Dead Reckoning
cls: chronist
type: skill
rarity: common
cost: 0
target: self
keywords: []
text: "Gain {block} Block (+{block_per} per card played this turn)."
effects:
  - block: { amount: { base: 1, per: 1, scale: cards_played_this_turn } }
upgrade:
  effects:
    - block: { amount: { base: 2, per: 1, scale: cards_played_this_turn } }
tags: [metronome, glue, cheap, block, scaling]
note: "0-cost common 3 b. Played at the typical filler slot 3–4: 3.5 b (117%). In slot 6 it is 6, and in slot 2 it is 2. Upgraded +1 (+29%). It rewards ending a long chain with it. The count includes itself (GDD §2.7 appends at pay time). No STS counterpart counts every card for Block. M, G."
tuned: "Sim pass 2026-10-29 (docs/balance/changelog.md): base 0/1 → 1/2 (bottom-5% pick rate)."
```

```card
id: logbook
name: Logbook
cls: chronist
type: skill
rarity: common
cost: 1
target: self
keywords: []
text: "Gain {block} Block (+{block_per} per Shard you hold)."
effects:
  - block: { amount: { base: 5, per: 1, scale: shards } }
upgrade:
  effects:
    - block: { amount: { base: 7, per: 1, scale: shards } }
tags: [glue, block, shards]
note: "Common 6 b. Priced at 2 Shards held: 4 + 2 = 6 b (100%). At the Shard cap of 10 it is 14 b. Upgraded +2 (+33%). Run-interacting: holding Shards rather than spending them on Purge becomes a small defensive plan, alongside Geode Heart. 1 of 2 Shard cards. G."
tuned: "Sim pass 2026-10-29 (docs/balance/changelog.md): base 4/6 → 5/7 (bottom-5% pick rate)."
```

```card
id: reef_the_sails
name: Reef the Sails
cls: chronist
type: skill
rarity: common
cost: 1
target: enemy
keywords: []
text: "Gain {block} Block. If its intent after next is an attack, apply {stagger} Stagger to it."
effects:
  - block: { amount: 5 }
  - conditional:
      if: { forecast_is_attack: { who: target, depth: 1 } }
      then: [ { status: { target: target, id: stagger, amount: 2, key: stagger } } ]
upgrade:
  effects:
    - block: { amount: 7 }
    - conditional:
        if: { forecast_is_attack: { who: target, depth: 1 } }
        then: [ { status: { target: target, id: stagger, amount: 2, key: stagger } } ]
tags: [oracle, block, stagger, forecast]
note: "Common 6 b. 4 + (2 × 2 b) ÷ 1.4 = 6.86 b (114%). Upgraded 8.86 (+29%). Stagger 2 applied now gives −2 on its next move and −1 on the after-next attack you saw (GDD §2.11). Block now plus Stagger later: the Oracle's common two-turn defence. O."
tuned: "Sim pass 2026-10-29 (docs/balance/changelog.md): 4/6 → 5/7 Block (bottom-5% pick rate)."
```

```card
id: wind_forward
name: Wind Forward
cls: chronist
type: skill
rarity: common
cost: 0
target: none
keywords: []
text: "Advance {advance}. If your Timeline is empty, gain {block} Block instead."
effects:
  - conditional:
      if: { timeline_nonempty: {} }
      then: [ { advance: { n: 1, key: advance } } ]
      else: [ { block: { amount: 4 } } ]
upgrade:
  text: "Advance {advance} and gain {adv_block} Block. If your Timeline is empty, gain {block} Block instead."
  effects:
    - conditional:
        if: { timeline_nonempty: {} }
        then: [ { advance: { n: 1, key: advance } }, { block: { amount: 2, key: adv_block } } ]
        else: [ { block: { amount: 6 } } ]
tags: [timeline, glue, cheap, advance]
note: "0-cost common 3.5 d. Advance 1 ≈ 3 d (a Delay 1 payload, priced ÷1.5, arrives now: its 'extra half' is about 3 d on a common), and the fallback of 3 Block is 3 b (100%). It is never dead. Upgraded +2 Block, or 5 Block (+40%). Storm Glass + Wind Forward = 11 Block now for 1 energy. Advance is capped at 2 per turn (cap_advance). It draws no cards and gains no energy, so it is safe at common. T, G."
tuned: "Sim pass 2026-10-29 (docs/balance/changelog.md): fallback Block 3/5 → 4/6 (bottom-5% pick rate)."
```

---
## 3. Uncommons (20)

7 Attacks, 9 Skills, 4 Powers. 8 cost 0. 6 Delay cards. Energy gain appears here first, and only on the beat or delayed (Mainspring, Banked Hours).

| id | Name | Type | Cost | Text (base → upgraded) | Arch |
|---|---|---|---|---|---|
| `sweep_hand` | Sweep Hand | attack | 1 | Deal 9 damage. On beat: deal it to ALL enemies instead. → 12 | M |
| `fermata` | Fermata | attack | 1 | Keep. Deal 3 damage. On beat: deal 9 more. → 4, +12 | M |
| `appointed_hour` | Appointed Hour | attack | 2 | Delay 2: deal 34 damage. → 42 | T O |
| `knell` | Knell | attack | 1 | Deal 4 damage to ALL enemies. Delay 2: deal 9 damage to ALL enemies. → 5 / 12 | T |
| `turn_the_tide` | Turn the Tide | attack | 1 | Deal 4 damage, +half the damage of its intent after next. → base 7 | O |
| `confluence` | Confluence | attack | 0 | Deal 1 damage, +2 per card on your Timeline. → +3 per card | T |
| `second_hand` | Second Hand | attack | 0 | Delay 1: deal 4 damage. On beat: 5 more. → 5, +6 | M T |
| `mainspring` | Mainspring | skill | 0 | On beat: gain 1 energy. → also gain 2 Block | M |
| `quarter_chime` | Quarter Chime | skill | 0 | On beat: draw 2 cards. → also gain 2 Block | M G |
| `hasten` | Hasten | skill | 0 | Advance 1. On beat: Advance 1 more. → also gain 3 Block | T M |
| `banked_hours` | Banked Hours | skill | 1 | Delay 1: gain 1 energy and draw 2 cards. → draw 3 | T G |
| `breakwater` | Breakwater | skill | 2 | Gain 8 Block. Delay 1: gain 11 Block. → 10 / 14 | T O |
| `heave_to` | Heave To | skill | 1 | Gain 4 Guard, +half the damage of its intent after next. → base 7 | O G |
| `batten_down` | Batten Down | skill | 0 | Delay 1: if it intends to attack, apply 3 Stagger to it. → 4 | O T |
| `mark_the_lull` | Mark the Lull | skill | 0 | Apply 1 Exposed. If its intent after next isn't an attack, apply 1 more. → 2 more | O |
| `glance_ahead` | Glance Ahead | skill | 0 | Draw 1 card. If your Timeline is not empty, draw 1 more. Scrap. → 2 more | T G |
| `striking_train` | Striking Train | power | 1 | Whenever you play a card on the beat, deal 3 damage to ALL enemies. → 4 | M |
| `tide_table` | Tide Table | power | 1 | Whenever a card on your Timeline resolves, draw 1 card. → cost 0 | T G |
| `storm_warning` | Storm Warning | power | 1 | At the start of your turn, if any enemy intends to attack, apply 2 Stagger to ALL enemies. → cost 0 | O |
| `escapement` | Escapement | power | 1 | Whenever you put a card on your Timeline on the beat, Advance 1. → Opening | T M |

```card
id: sweep_hand
name: Sweep Hand
cls: chronist
type: attack
rarity: uncommon
cost: 1
target: enemy
keywords: []
text: "Deal {damage} damage. On beat: deal it to ALL enemies instead."
effects:
  - conditional:
      if: { on_beat: {} }
      then: [ { damage: { amount: 9, target: all_enemies } } ]
      else: [ { damage: { amount: 9, target: target } } ]
upgrade:
  effects:
    - conditional:
        if: { on_beat: {} }
        then: [ { damage: { amount: 12, target: all_enemies } } ]
        else: [ { damage: { amount: 12, target: target } } ]
tags: [metronome, aoe, on_beat]
note: "Uncommon 8.5 d. The beat adds the AoE share: 8 × 0.25 = 2, and 8 + 0.6 × 2 = 9.2 d (108%). In a 3-enemy fight the beat is worth +16. Upgraded 11 (+38%). It is a branch, not an `on_beat` wrapper, so Drum and Polyrhythm don't repeat it. It is the Metronome's AoE answer to Act 2 width. M."
tuned: "Sim pass 2026-10-29 (docs/balance/changelog.md): 8/11 → 9/12 (Act 2 width; low pick rate)."
```

```card
id: fermata
name: Fermata
cls: chronist
type: attack
rarity: uncommon
cost: 1
target: enemy
keywords: [retain]
text: "Keep. Deal {damage} damage. On beat: deal {beat_damage} more."
effects:
  - damage: { amount: 3, target: target }
  - on_beat: { effects: [ { damage: { amount: 9, target: target, key: beat_damage } } ] }
upgrade:
  effects:
    - damage: { amount: 4, target: target }
    - on_beat: { effects: [ { damage: { amount: 12, target: target, key: beat_damage } } ] }
tags: [metronome, on_beat, keep]
note: "Uncommon 8.5 d × 0.9 (Keep) = 7.65. 3 + 0.6 × 9 = 8.4 d (110%). The on-beat payout of 12 is under 1.6 × 8.5 = 13.6. Upgraded 4 + 7.2 = 11.2 (+33%). Keep means it is never dead: hold it for the turn you can put it on 3. 1 of 2 Keep cards. M."
```

```card
id: appointed_hour
name: Appointed Hour
cls: chronist
type: attack
rarity: uncommon
cost: 2
target: enemy
keywords: [delay]
text: "Delay 2: deal {delay_damage} damage."
effects: []
delay:
  turns: 2
  effects:
    - damage: { amount: 34, target: target, key: delay_damage }
upgrade:
  delay:
    turns: 2
    effects:
      - damage: { amount: 42, target: target, key: delay_damage }
tags: [timeline, oracle, delay]
note: "Uncommon 2 × 8.5 = 17 d. 34 ÷ 2 = 17 (100%). Upgraded 42: 21 (+24%). Played on turn t, it lands at the start of turn t+2, before that turn's enemy move. With Augury you see turn t+1's move, so you aim it by pattern or with Prophet Glass (depth 3). For example, it lands on Bramble Ram's Charge turn, where Timeline damage counts toward the break (ENEMIES.md). T, O."
```

```card
id: knell
name: Knell
cls: chronist
type: attack
rarity: uncommon
cost: 1
target: all_enemies
keywords: [delay]
text: "Deal {damage} damage to ALL enemies. Delay 2: deal {delay_damage} damage to ALL enemies."
effects:
  - damage: { amount: 4, target: all_enemies }
delay:
  turns: 2
  effects:
    - damage: { amount: 9, target: all_enemies, key: delay_damage }
upgrade:
  effects:
    - damage: { amount: 5, target: all_enemies }
  delay:
    turns: 2
    effects:
      - damage: { amount: 12, target: all_enemies, key: delay_damage }
tags: [timeline, delay, aoe]
note: "Uncommon 8.5 d. AoE ×1.25: 3.75 + 9 × 1.25 ÷ 2 = 3.75 + 5.63 = 9.4 d (110%). Upgraded 5 + 7.5 = 12.5 (+33%). It is a split card: the chip now kills summons, and the toll later hits the pack. T."
tuned: "Sim pass 2026-10-29 (docs/balance/changelog.md): immediate 3/4 → 4/5 (Act 2 width)."
```

```card
id: turn_the_tide
name: Turn the Tide
cls: chronist
type: attack
rarity: uncommon
cost: 1
target: enemy
keywords: []
text: "Deal {damage} damage, +half the damage of its intent after next."
effects:
  - damage: { amount: { base: 4, per: 0.5, scale: forecast_damage }, target: target }
upgrade:
  effects:
    - damage: { amount: { base: 7, per: 0.5, scale: forecast_damage }, target: target }
tags: [oracle, forecast, scaling]
note: "Uncommon 8.5 d. Priced at an Act 2 forecast attack of 18: 3 + 9 ÷ 1.4 = 9.4 d (110%). Act 1 (11): 3 + 3.9 = 6.9 (81%). Act 3 (27): 3 + 9.6 = 12.6 (148%). The class gets spikier as enemies hit harder, which is its brief. If the forecast isn't an attack it is 3, so hold it for a windup. With Prophet Glass, forecast_damage sums both forecast moves. Upgraded base 6 (+32% at Act 2). O."
tuned: "Sim pass 2026-10-29 (docs/balance/changelog.md): base 3/6 → 4/7 (bottom-5% pick rate)."
```

```card
id: confluence
name: Confluence
cls: chronist
type: attack
rarity: uncommon
cost: 0
target: enemy
keywords: []
text: "Deal {damage} damage (+{damage_per} per card on your Timeline)."
effects:
  - damage: { amount: { base: 1, per: 2, scale: timeline_count }, target: target }
upgrade:
  effects:
    - damage: { amount: { base: 1, per: 3, scale: timeline_count }, target: target }
tags: [timeline, cheap, scaling]
note: "0-cost uncommon 4.25 d. At the Timeline-deck expectation of 1.5 entries: 1 + 3 = 4 d (94%). At 4 entries it is 9. Upgraded 1 + 4.5 = 5.5 (+38%). It turns a loaded Timeline into damage now, and it is a beat filler that a Timeline deck wants. T."
```

```card
id: second_hand
name: Second Hand
cls: chronist
type: attack
rarity: uncommon
cost: 0
target: enemy
keywords: [delay]
text: "Delay 1: deal {delay_damage} damage. On beat: {beat_damage} more."
effects: []
delay:
  turns: 1
  effects:
    - damage: { amount: 4, target: target, key: delay_damage }
    - on_beat: { effects: [ { damage: { amount: 5, target: target, key: beat_damage } } ] }
upgrade:
  delay:
    turns: 1
    effects:
      - damage: { amount: 5, target: target, key: delay_damage }
      - on_beat: { effects: [ { damage: { amount: 6, target: target, key: beat_damage } } ] }
tags: [metronome, timeline, cheap, delay, on_beat]
note: "0-cost uncommon 4.25 d. 4 ÷ 1.5 + 0.6 × 5 ÷ 1.5 = 2.67 + 2 = 4.67 (110%). Upgraded 3.33 + 2.4 = 5.7 (+23%). It is a free beat filler that also loads the Timeline (Confluence, Tide Table, Watch Bell). With Offbeat Drum the stamped beat pays twice (it is a 0-cost card). With Escapement, a beat play Advances it into an instant 9 (11 upgraded). M, T."
```

```card
id: mainspring
name: Mainspring
cls: chronist
type: skill
rarity: uncommon
cost: 0
target: none
keywords: []
text: "On beat: gain {beat_energy} energy."
effects:
  - on_beat: { effects: [ { energy: { n: 1, key: beat_energy } } ] }
upgrade:
  text: "Gain {block} Block. On beat: gain {beat_energy} energy."
  effects:
    - block: { amount: 2 }
    - on_beat: { effects: [ { energy: { n: 1, key: beat_energy } } ] }
tags: [metronome, cheap, energy, on_beat]
note: "0-cost uncommon 4.25 d. 0.6 × 7 = 4.2 d (99%). The on-beat payout of 7 d is 103% of the 1.6 × 4.25 = 6.8 cap (accepted). Off the beat it is a free count-advancer, never dead. Upgraded +2 b ≈ +2.3 d (+55%, small absolute). Energy only on the beat: at most 3 per turn (4 with Metronome Heart), and Drum/Polyrhythm repeats run into cap_bonus_energy 4 (§9). Uncommon energy is allowed (GDD §3). M."
```

```card
id: quarter_chime
name: Quarter Chime
cls: chronist
type: skill
rarity: uncommon
cost: 0
target: none
keywords: []
text: "On beat: draw {beat_draw} cards."
effects:
  - on_beat: { effects: [ { draw: { n: 2, key: beat_draw } } ] }
upgrade:
  text: "Gain {block} Block. On beat: draw {beat_draw} cards."
  effects:
    - block: { amount: 2 }
    - on_beat: { effects: [ { draw: { n: 2, key: beat_draw } } ] }
tags: [metronome, glue, cheap, draw, on_beat]
note: "0-cost uncommon 4.25 d. 0.6 × 6 = 3.6 d (85%). The on-beat payout of 6 is under the 6.8 cap. Upgraded +2 b (+65%, small absolute). Card flow is +1 on the beat and −1 off it. Positive flow is limited to 3 beats a turn. M, G."
```

```card
id: hasten
name: Hasten
cls: chronist
type: skill
rarity: uncommon
cost: 0
target: none
keywords: []
text: "Advance {advance}. On beat: Advance {beat_advance} more."
effects:
  - advance: { n: 1, key: advance }
  - on_beat: { effects: [ { advance: { n: 1, key: beat_advance } } ] }
upgrade:
  text: "Gain {block} Block. Advance {advance}. On beat: Advance {beat_advance} more."
  effects:
    - block: { amount: 3 }
    - advance: { n: 1, key: advance }
    - on_beat: { effects: [ { advance: { n: 1, key: beat_advance } } ] }
tags: [timeline, metronome, cheap, advance, on_beat]
note: "0-cost uncommon 4.25 d. 3 + 0.6 × 3 = 4.8 d (113%). On the beat it uses the whole turn's Advance allowance (cap_advance 2). More is greyed. It turns Noon Gun / Appointed Hour into next-turn or this-turn hits. Upgraded +3 b (+73%); the Block keeps it useful on empty-Timeline turns. T, M."
```

```card
id: banked_hours
name: Banked Hours
cls: chronist
type: skill
rarity: uncommon
cost: 1
target: none
keywords: [delay]
text: "Delay 1: gain {delay_energy} energy and draw {delay_draw} cards."
effects: []
delay:
  turns: 1
  effects:
    - energy: { n: 1, key: delay_energy }
    - draw: { n: 2, key: delay_draw }
upgrade:
  delay:
    turns: 1
    effects:
      - energy: { n: 1, key: delay_energy }
      - draw: { n: 3, key: delay_draw }
tags: [timeline, glue, energy, draw, delay]
note: "Uncommon 8.5 d. (7 + 6) ÷ 1.5 = 8.67 (102%). Upgraded (7 + 9) ÷ 1.5 = 10.7 (+23%). Pay 1 now and get it back next turn with 2 cards: tempo for a planned turn. The energy counts toward cap_bonus_energy (§11.5). With Advance it resolves this turn: energy-neutral, +2 cards. cap_relay then makes it unplayable for the rest of the turn, so each copy fires at most once per turn (§9). T, G."
```

```card
id: breakwater
name: Breakwater
cls: chronist
type: skill
rarity: uncommon
cost: 2
target: self
keywords: [delay]
text: "Gain {block} Block. Delay 1: gain {delay_block} Block."
effects:
  - block: { amount: 8 }
delay:
  turns: 1
  effects:
    - block: { amount: 11, key: delay_block }
upgrade:
  effects:
    - block: { amount: 10 }
  delay:
    turns: 1
    effects:
      - block: { amount: 14, key: delay_block }
tags: [timeline, oracle, block, delay]
note: "Uncommon 2 × 7 = 14 b. 7 + 10 ÷ 1.5 = 13.67 (98%). Upgraded 9 + 8.67 = 17.67 (+29%). One card gives this turn's Block for the visible intent and next turn's Block for the after-next one. It is the Oracle's two-turn wall, and its Timeline entry feeds Watch Bell and Tide Table. T, O."
tuned: "Sim pass 2026-10-29 (docs/balance/changelog.md): 7+10 → 8+11, upgraded 9+13 → 10+14 (Act 2 defence)."
```

```card
id: heave_to
name: Heave To
cls: chronist
type: skill
rarity: uncommon
cost: 1
target: enemy
keywords: []
text: "Gain {guard} Guard, +half the damage of its intent after next."
effects:
  - guard: { amount: { base: 4, per: 0.5, scale: forecast_damage } }
upgrade:
  effects:
    - guard: { amount: { base: 7, per: 0.5, scale: forecast_damage } }
tags: [oracle, glue, guard, forecast, scaling]
note: "Uncommon Guard 8 per energy. At Act 2 (18): 2 + 9 ÷ 1.4 = 8.4 (105%). Act 1 (11): 2 + 3.9 = 5.9 (74%). Act 3 (27): 2 + 9.6 = 11.6 (145%). The target is only the enemy it reads; the Guard is yours. Guard covers the next phase and keeps half for the after-next phase, so it bridges 'now' and 'forecast'. Upgraded base 5 (+36% at Act 2). 1 of 3 Guard cards. O, G."
tuned: "Sim pass 2026-10-29 (docs/balance/changelog.md): base 2/5 → 4/7 Guard (Act 2 defence; two +1 steps)."
```

```card
id: batten_down
name: Batten Down
cls: chronist
type: skill
rarity: uncommon
cost: 0
target: enemy
keywords: [delay]
text: "Delay 1: if it intends to attack, apply {delay_stagger} Stagger to it."
effects: []
delay:
  turns: 1
  effects:
    - conditional:
        if: { forecast_is_attack: { who: target, depth: 0 } }
        then: [ { status: { target: target, id: stagger, amount: 3, key: delay_stagger } } ]
upgrade:
  delay:
    turns: 1
    effects:
      - conditional:
          if: { forecast_is_attack: { who: target, depth: 0 } }
          then: [ { status: { target: target, id: stagger, amount: 4, key: delay_stagger } } ]
tags: [oracle, timeline, cheap, stagger, delay, forecast]
note: "0-cost uncommon 3.5 b. 3 Stagger = 6 b (9 b vs multi-hit), ÷ 1.5 ÷ 1.4 = 2.9 b (82%) or 4.3 b (123%). Upgraded 4 Stagger: 3.8 / 5.7 b. Play it when the after-next intent is an attack. Stagger 3 lands at your turn start, right before that attack: −3, then −2, then −1 per hit over its next three moves. Against Lash 4×3 it removes 9, then 6. C19 vs colourless Gyro Jammer (immediate, per hit of the current intent): this one is aimed a turn ahead, flat, and free. O, T."
```

```card
id: mark_the_lull
name: Mark the Lull
cls: chronist
type: skill
rarity: uncommon
cost: 0
target: enemy
keywords: []
text: "Apply {exposed} Exposed. If its intent after next isn't an attack, apply {lull_exposed} more."
effects:
  - status: { target: target, id: exposed, amount: 1, key: exposed }
  - conditional:
      if: { not: { forecast_is_attack: { who: target, depth: 1 } } }
      then: [ { status: { target: target, id: exposed, amount: 1, key: lull_exposed } } ]
upgrade:
  effects:
    - status: { target: target, id: exposed, amount: 1, key: exposed }
    - conditional:
        if: { not: { forecast_is_attack: { who: target, depth: 1 } } }
        then: [ { status: { target: target, id: exposed, amount: 2, key: lull_exposed } } ]
tags: [oracle, cheap, exposed, forecast]
note: "0-cost uncommon 4.25 d. 3 + 3 ÷ 1.4 = 5.1 d (120%). It is over budget, accepted because Exposed is worth nothing without follow-up hits and this card deals none. Exposed 2 decays to 1 on its turn, so the extra stack is still there on your lull turn, when you go all-in. Upgraded 3 + 4.3 = 7.3 (+43%). O."
```

```card
id: glance_ahead
name: Glance Ahead
cls: chronist
type: skill
rarity: uncommon
cost: 0
target: none
keywords: [exhaust]
text: "Draw {draw} card. If your Timeline is not empty, draw {timeline_draw} more. Scrap."
effects:
  - draw: { n: 1 }
  - conditional:
      if: { timeline_nonempty: {} }
      then: [ { draw: { n: 1, key: timeline_draw } } ]
upgrade:
  effects:
    - draw: { n: 1 }
    - conditional:
        if: { timeline_nonempty: {} }
        then: [ { draw: { n: 2, key: timeline_draw } } ]
tags: [timeline, glue, cheap, draw]
note: "0-cost uncommon 4.25 × 1.35 (Scrap) = 5.7 d. 3 + 3 × P(Timeline nonempty ≈ 0.7) = 5.1 (89%). Upgraded 3 + 4.2 = 7.2 (+40%). Card flow is +1 (+2), once per copy per combat (Scrap). It is the class's only unconditional 0-cost draw, and Scrap bounds it (§9). T, G."
```

```card
id: striking_train
name: Striking Train
cls: chronist
type: power
rarity: uncommon
cost: 1
target: none
keywords: []
text: "Whenever you play a card on the beat, deal {status} damage to ALL enemies."
effects:
  - status: { target: self, id: striking_train, amount: 3 }
status_def:
  id: striking_train
  stacks: amount
  decay: never
  tick: never
  isDebuff: false
  text: "Whenever you play a card on the beat, deal {stacks} damage to ALL enemies."
  triggers:
    afterCardPlayed:                           # on_beat reads CardPlayedInfo.onBeat [ask: condition ctx in triggers]
      - conditional:
          if: { on_beat: {} }
          then: [ { damage: { amount: { scale: stacks }, target: all_enemies } } ]
upgrade:
  effects:
    - status: { target: self, id: striking_train, amount: 4 }
tags: [metronome, power, aoe, on_beat]
note: "Power line: 8.5 ÷ 3 = 2.8 d per turn. 1.2 beats × 2 × 1.25 = 3.0 d per turn (106%). At 1.8 beats it is 4.5. Upgraded 3 (+50%). The trigger is not a play and doesn't advance the count. Delay cards played on the beat trigger it at play. C19: Kunai/Shuriken fire every 3 Attacks; this fires on beat positions, whatever the card type. M."
tuned: "Sim pass 2026-10-29 (docs/balance/changelog.md): 2/3 → 3/4 (Act 2 width)."
```

```card
id: tide_table
name: Tide Table
cls: chronist
type: power
rarity: uncommon
cost: 1
target: none
keywords: []
text: "Whenever a card on your Timeline resolves, draw {status} card."
effects:
  - status: { target: self, id: tide_table, amount: 1 }
status_def:
  id: tide_table
  stacks: amount
  decay: never
  tick: never
  isDebuff: false
  text: "Whenever a card on your Timeline resolves, draw {stacks} card(s)."
  triggers:
    onDelayResolved:                           # GDD §9 item 10
      - draw: { n: { scale: stacks } }
upgrade:
  cost: 0
tags: [timeline, glue, power, draw]
note: "Power line 2.8 d per turn. About 1 resolution per turn at floor 15 (GDD §8.3) × 3 d = 3 d (106%). Upgraded cost 0 (+1 energy on the setup turn). Draws during the turn-start resolution land before the normal 5. Resolutions per turn are limited by entries (cap_timeline 10) and, mid-turn, by Advance (≤ 2 per turn, plus cap_relay). Its draws count toward cap_draw (§9). T, G."
```

```card
id: storm_warning
name: Storm Warning
cls: chronist
type: power
rarity: uncommon
cost: 1
target: none
keywords: []
text: "At the start of your turn, if any enemy intends to attack, apply {status} Stagger to ALL enemies."
effects:
  - status: { target: self, id: storm_warning, amount: 2 }
status_def:
  id: storm_warning
  stacks: amount
  decay: never
  tick: never
  isDebuff: false
  text: "At the start of your turn, if any enemy intends to attack, apply {stacks} Stagger to ALL enemies."
  triggers:
    onTurnStart:                               # GDD §2.0 step 4, before Timeline resolution
      - conditional:
          if: { forecast_is_attack: { who: any, depth: 0 } }
          then: [ { status: { target: all_enemies, id: stagger, amount: { scale: stacks } } } ]
upgrade:
  cost: 0
tags: [oracle, power, stagger]
note: "Power line 7 b ÷ 3 = 2.33 b per turn. P(some enemy attacks) ≈ 0.85 × 2 b × 1.25 = 2.1 b per turn (91%); against multi-hit packs 3.2. Upgraded cost 0. Stagger 1 applied at your turn start is on them for the enemy phase that follows, then decays at the end of each enemy's turn. O."
tuned: "Sim pass 2026-10-29 (docs/balance/changelog.md): 1 → 2 Stagger. The Chronist died in Act 2 multi-hit hallways (Rivet Gnashers, Riveter, Loom Oracle); measured +3.6 to +6 points of Act 2 boss kills on two seed sets."
```

```card
id: escapement
name: Escapement
cls: chronist
type: power
rarity: uncommon
cost: 1
target: none
keywords: []
text: "Whenever you put a card on your Timeline on the beat, Advance {status}."
effects:
  - status: { target: self, id: escapement, amount: 1 }
status_def:
  id: escapement
  stacks: amount
  decay: never
  tick: never
  isDebuff: false
  text: "Whenever you put a card on your Timeline on the beat, Advance {stacks}."
  triggers:
    onTimelineAdd:                             # GDD §9 item 10; on_beat reads info.entry.onBeat [ask]
      - conditional:
          if: { on_beat: {} }
          then: [ { repeat: { times: { scale: stacks }, effects: [ { advance: { n: 1 } } ] } } ]
upgrade:
  keywords: [innate]
tags: [timeline, metronome, power, advance]
note: "Power line 2.8 d per turn. A Timeline deck puts about 0.8 Delay cards a turn on the beat. Advance 1 ≈ 3.5 d: the Delay 1 card just placed resolves at once, stamped on the beat, and every other entry moves a turn closer. That is ≈ 2.8 d per turn (100%). Upgraded Opening (≈ +1 turn of value). 1 of 2 Opening cards. It is limited by cap_advance (2 per turn) and cap_relay. T, M."
```

---
## 4. Rares (12)

4 Attacks, 4 Skills, 4 Powers. 2 cost 0. 4 Delay cards. The rule-breakers: a 0-cost card that hits like a 1-cost rare but only on the beat (Zenith), doubled beats (Polyrhythm), a cheaper beat card every turn (Perpetual Motion), a once-a-fight wall equal to the hit you saw coming (Seen It Coming), and a Delay 3 that is a third of a boss (Syzygy).

| id | Name | Type | Cost | Text (base → upgraded) | Arch |
|---|---|---|---|---|---|
| `zenith` | Zenith | attack | 0 | Can only be played on the beat. Deal 10 damage. → 14 | M |
| `syzygy` | Syzygy | attack | 3 | Delay 3: deal 75 damage. → cost 2 | T O |
| `culmination` | Culmination | attack | 2 | Deal 14 damage, or 28 if its intent after next isn't an attack. → 18 / 36 | O |
| `toll_the_hours` | Toll the Hours | attack | X | Deal 6 damage X times. Delay 1: deal 6 damage X times. → 8 / 8 | T G |
| `seen_it_coming` | Seen It Coming | skill | 1 | Delay 1: gain Block equal to the damage it intends. Scrap. → cost 0 | O T |
| `star_tithe` | Star Tithe | skill | 1 | Delay 3: gain 1 Shard and draw 2 cards. Scrap. → cost 0 | T |
| `tourbillon` | Tourbillon | skill | 0 | Keep. On beat: gain 2 energy, then Scrap this. → also draw 1 card | M |
| `lighthouse` | Lighthouse | skill | 2 | Gain 11 Block. If any enemy's intent after next is an attack, gain 11 Guard. → 14 / 14 | O G |
| `polyrhythm` | Polyrhythm | power | 2 | Your On beat effects trigger twice. → cost 1 | M |
| `portents` | Portents | power | 2 | At the start of your turn, apply 1 Exposed to ALL enemies. If any enemy's intent after next isn't an attack, apply 1 more. → cost 1 | O G |
| `watch_bell` | Watch Bell | power | 2 | Whenever a card on your Timeline resolves, gain 3 Block, +3 if any enemy intends to attack. → cost 1 | T O |
| `perpetual_motion` | Perpetual Motion | power | 3 | The first card you play on the beat each turn costs 1 less. → cost 2 | M |

```card
id: zenith
name: Zenith
cls: chronist
type: attack
rarity: rare
cost: 0
target: enemy
keywords: []
text: "Can only be played on the beat. Deal {damage} damage."
effects:
  - damage: { amount: 10, target: target }
hooks:
  canPlay: { fn: next_play_on_beat }           # §8 fn 1; reason string "Only on the beat"
upgrade:
  effects:
    - damage: { amount: 14, target: target }
tags: [metronome, cheap, on_beat]
note: "0-cost rare 5 d × 1.5 (playable only if) = 7.5. 10 = 133%: the rare rule-break is a 0-cost card that hits like a 1-cost rare. Upgraded 14 (+40%). It is never a dead draw in a deck that reaches 3 plays (≥ 95% of turns by floor 15, §10), but it takes the beat from your other payoffs, so it competes with Downbeat and Fermata for slot 3. It has no on_beat list, so Drum and Polyrhythm don't double it. M."
```

```card
id: syzygy
name: Syzygy
cls: chronist
type: attack
rarity: rare
cost: 3
target: enemy
keywords: [delay]
text: "Delay 3: deal {delay_damage} damage."
effects: []
delay:
  turns: 3
  effects:
    - damage: { amount: 75, target: target, key: delay_damage }
upgrade:
  cost: 2
tags: [timeline, oracle, delay]
note: "Rare 3 × 10 = 30 d. 75 ÷ 2.5 = 30 (100%). Upgraded cost 2 (150%). A third of an Act 1 boss in one hit, three turns out. You aim it with Prophet Glass (depth 3: you see the move it lands before), Advance (Hasten: land it next turn), Sandglass Bead, or a known boss pattern. A dead target retargets to the leftmost enemy (GDD §2.8). It is weak in 3-turn hallway fights and strong in bosses, so the reward-screen question is real. T, O."
```

```card
id: culmination
name: Culmination
cls: chronist
type: attack
rarity: rare
cost: 2
target: enemy
keywords: []
text: "Deal {damage} damage, or {lull_damage} if its intent after next isn't an attack."
effects:
  - conditional:
      if: { forecast_is_attack: { who: target, depth: 1 } }
      then: [ { damage: { amount: 14, target: target } } ]
      else: [ { damage: { amount: 28, target: target, key: lull_damage } } ]
upgrade:
  effects:
    - conditional:
        if: { forecast_is_attack: { who: target, depth: 1 } }
        then: [ { damage: { amount: 18, target: target } } ]
        else: [ { damage: { amount: 36, target: target, key: lull_damage } } ]
tags: [oracle, forecast]
note: "Rare 20 d. 14 + 14 ÷ 1.4 = 24 (120%). Upgraded 18 + 12.9 = 30.9 (+29%). It is the Oracle's finisher: a fair 2-cost hit any turn, double in the window. Exposed applies once (one hit), so it pairs with Portents' lull stack. O."
```

```card
id: toll_the_hours
name: Toll the Hours
cls: chronist
type: attack
rarity: rare
cost: X
target: enemy
keywords: [delay]
text: "Deal {damage} damage X times. Delay 1: deal {delay_damage} damage X times."
effects:
  - damage: { amount: 6, times: X, target: target }
delay:
  turns: 1
  effects:
    - damage: { amount: 6, times: X, target: target, key: delay_damage }   # X = TimelineEntry.x, stamped at play
upgrade:
  effects:
    - damage: { amount: 8, times: X, target: target }
  delay:
    turns: 1
    effects:
      - damage: { amount: 8, times: X, target: target, key: delay_damage }
tags: [timeline, glue, delay, multihit, scaling]
note: "Rare X-cost budget X × 10 × 1.1 = 11X. 6X + 6X ÷ 1.5 = 10X (91%). Upgraded 13.3X (+33%). At X = 3 it deals 18 now and 18 next turn as 6 hits, so Exposed and Portents pay on each one. Mainspring, Tourbillon and Banked Hours feed X. It is the Timeline's late-game damage sink and needs no other Delay card. T, G."
```

```card
id: seen_it_coming
name: Seen It Coming
cls: chronist
type: skill
rarity: rare
cost: 1
target: enemy
keywords: [delay, exhaust]
text: "Delay 1: gain Block equal to the damage it intends. Scrap."
effects: []
delay:
  turns: 1
  effects:
    - block: { amount: { scale: { fn: target_intent_total } }, key: delay_block }   # §8 fn 2; reads the stamped target's intent at resolution
amounts:
  target_intent_total: "shared with colourless mirror_tether: total damage of the target's current attack intent (per-hit preview × hits); 0 if not an attack"
upgrade:
  cost: 0
tags: [oracle, timeline, block, delay, forecast]
note: "Rare 8 b × 1.5 (Scrap, wanted once) = 12 b. At Act 2 (18): 18 ÷ 1.5 ÷ 1.4 = 8.6 b (71%). Act 3 (27): 12.9 (107%). Against a 50-damage boss peak: 23.8 (198%). That is the rare: a once-a-fight 'nothing gets through' answer to the spike you saw coming. The target is stamped, and resolution reads its intent then, which is the intent after next when you played it. Block is computed after Stagger, so Batten Down shrinks the wall you need. Upgraded cost 0. O, T."
```

```card
id: star_tithe
name: Star Tithe
cls: chronist
type: skill
rarity: rare
cost: 1
target: none
keywords: [delay, exhaust]
text: "Delay 3: gain {delay_shards} Shard and draw {delay_draw} cards. Scrap."
effects: []
delay:
  turns: 3
  effects:
    - shards: { amount: 1, key: delay_shards }
    - draw: { n: 2, key: delay_draw }
upgrade:
  cost: 0
tags: [timeline, shards, draw, delay]
note: "Rare run card. In combat it is worth 6 d ÷ 2.5 = 2.4 d for 1 energy; the other ~7.6 d is the price of 1 Shard (≈ one skipped card reward, GDD §4.5). It pays only if the fight reaches your turn 4: ≈ 50% of normals, every elite and boss. Advance can bring it in sooner. Expected +0.6 Shards per combat, so +2–3 per act once owned, on top of the 3–5 target. Watch `shards_earned_per_act` (GDD §8.6). The Shard cap is 10. Combat-end with it on the Timeline: nothing (GDD §2.8). 1 of 2 Shard cards. T."
```

```card
id: tourbillon
name: Tourbillon
cls: chronist
type: skill
rarity: rare
cost: 0
target: none
keywords: [retain]
text: "Keep. On beat: gain {beat_energy} energy, then Scrap this."
effects:
  - on_beat: { effects: [ { energy: { n: 2, key: beat_energy } }, { exhaust: { self: true } } ] }
upgrade:
  text: "Keep. On beat: gain {beat_energy} energy and draw {beat_draw} card, then Scrap this."
  effects:
    - on_beat: { effects: [ { energy: { n: 2, key: beat_energy } }, { draw: { n: 1, key: beat_draw } }, { exhaust: { self: true } } ] }
tags: [metronome, cheap, energy, on_beat, keep]
note: "0-cost rare 5 d × 0.9 (Keep) × 1.5 (Scrap, wanted once) = 6.75. 0.6 × 14 = 8.4 (124%). Off the beat it is a free count-advancer that goes to the discard pile as normal. On the beat it pays and leaves, so it is never wasted. Upgraded +1 draw (+21%). Drum/Polyrhythm repeats hit cap_bonus_energy 4. The repeated self-Scrap is a no-op. 1 of 2 Keep cards. C19: Adrenaline is unconditional energy + draw; this is positional, held, and once. M."
```

```card
id: lighthouse
name: Lighthouse
cls: chronist
type: skill
rarity: rare
cost: 2
target: self
keywords: []
text: "Gain {block} Block. If any enemy's intent after next is an attack, gain {guard} Guard."
effects:
  - block: { amount: 11 }
  - conditional:
      if: { forecast_is_attack: { who: any, depth: 1 } }
      then: [ { guard: { amount: 11 } } ]
upgrade:
  effects:
    - block: { amount: 14 }
    - conditional:
        if: { forecast_is_attack: { who: any, depth: 1 } }
        then: [ { guard: { amount: 14 } } ]
tags: [oracle, glue, block, guard, forecast]
note: "Rare 2 × 8 = 16 b; at rare rates 10 Guard = 8 b. 10 + (10 × 0.8) ÷ 1.4 = 15.7 b (98%). Upgraded 13 + 7.4 = 20.4 (+30%). Block for the visible hit, and Guard (halving to 5) for the one you saw coming. It is the Oracle's late answer to two-turn pressure (Act 3 elites). 1 of 3 Guard cards. O, G."
tuned: "Sim pass 2026-10-29 (docs/balance/changelog.md): 10/10 → 11/11, upgraded 13/13 → 14/14 (Act 2 defence)."
```

```card
id: polyrhythm
name: Polyrhythm
cls: chronist
type: power
rarity: rare
cost: 2
target: none
keywords: []
text: "Your On beat effects trigger twice."
effects:
  - status: { target: self, id: polyrhythm, amount: 1 }
status_def:
  id: polyrhythm
  stacks: amount
  decay: never
  tick: never
  isDebuff: false
  text: "Your On beat effects trigger {stacks} extra time(s) (at most 3 times in all)."
  hooks:
    onBeatRepeats: "repeats + stacks, then min(repeats, 3)"   # §8 code hook 1; same modifier Offbeat Drum uses
upgrade:
  cost: 1
tags: [metronome, power, on_beat, scaling]
note: "Rare 2 × 10 = 20 → 6.7 d per turn. A floor-30 Metronome deck plays ~1.8 beats, ~70% of them on cards with an on_beat list, at ~5 d face: 6.3 d per turn (95%). Upgraded cost 1. Stacking: each source (Offbeat Drum for 0-cost cards, each Polyrhythm copy) adds one repeat, and an on_beat list runs at most 3 times. It also repeats stamped on_beat lists on Timeline resolution. It does not repeat on_beat conditions (Sweep Hand) or the beat count. C19: Burst/Double Tap/Echo Form double a whole card; this doubles only the positional clause. M."
```

```card
id: portents
name: Portents
cls: chronist
type: power
rarity: rare
cost: 2
target: none
keywords: []
text: "At the start of your turn, apply {status} Exposed to ALL enemies. If any enemy's intent after next isn't an attack, apply {status} more."
effects:
  - status: { target: self, id: portents, amount: 1 }
status_def:
  id: portents
  stacks: amount
  decay: never
  tick: never
  isDebuff: false
  text: "At the start of your turn, apply {stacks} Exposed to ALL enemies. If any enemy's intent after next isn't an attack, apply {stacks} more."
  triggers:
    onTurnStart:
      - status: { target: all_enemies, id: exposed, amount: { scale: stacks } }
      - conditional:
          if: { not: { forecast_is_attack: { who: all, depth: 1 } } }
          then: [ { status: { target: all_enemies, id: exposed, amount: { scale: stacks } } } ]
upgrade:
  cost: 1
tags: [oracle, glue, power, exposed, forecast]
note: "Rare 20 → 6.7 d per turn. 1 Exposed × 3 d × 1.25 = 3.75, plus P(some after-next isn't an attack ≈ 0.5) × 3.75 ÷ 1.4 = 1.3: 5.1 d per turn (76%) in a single-hit deck, 6.8 (101%) in a multi-hit deck (4 d per Exposed). Upgraded cost 1. Exposed applied at turn start lasts your whole turn, and a lull stack carries into the next turn (GDD §2.10). The Oracle reads; Parallax, Gear Train and Toll the Hours cash in. O, G."
```

```card
id: watch_bell
name: Watch Bell
cls: chronist
type: power
rarity: rare
cost: 2
target: none
keywords: []
text: "Whenever a card on your Timeline resolves, gain {bell} Block, +{alarm} if any enemy intends to attack."
values: { bell: 3, alarm: 3 }
effects:
  - status: { target: self, id: watch_bell, amount: 1 }
status_def:
  id: watch_bell
  stacks: amount
  decay: never
  tick: never
  isDebuff: false
  text: "Whenever a card on your Timeline resolves, gain {bell} Block (×{stacks}), +{alarm} (×{stacks}) if any enemy intends to attack."
  values: { bell: 3, alarm: 3 }
  triggers:
    onDelayResolved:
      - block: { amount: { per: 3, scale: stacks } }
      - conditional:
          if: { forecast_is_attack: { who: any, depth: 0 } }
          then: [ { block: { amount: { per: 3, scale: stacks } } } ]
upgrade:
  cost: 1
tags: [timeline, oracle, power, block]
note: "Rare 2 × 8 = 16 b → 5.3 b per turn. Per resolution 2 + 3 ÷ 1.4 = 4.1 b. A floor-30 Timeline deck resolves ~1.3 entries a turn: 5.4 b per turn (101%). At turn-start resolution, 'intends to attack' is the move about to hit you, so the Block mostly arrives on time. Mid-turn (Advance) resolutions also count. Upgraded cost 1. C19: Timeline Spool (relic) deals damage per resolution; this is the defensive card version. T, O."
tuned: "Sim pass 2026-10-29 (docs/balance/changelog.md): bell 2 → 3 (high deck Δ, low pick rate)."
```

```card
id: perpetual_motion
name: Perpetual Motion
cls: chronist
type: power
rarity: rare
cost: 3
target: none
keywords: []
text: "The first card you play on the beat each turn costs 1 less."
effects:
  - status: { target: self, id: perpetual_motion, amount: 1 }
status_def:
  id: perpetual_motion
  stacks: amount
  decay: never
  tick: never
  isDebuff: false
  text: "The first {stacks} card(s) you play on the beat each turn cost 1 less."
  hooks:
    modifyCardCost: "if fn next_play_on_beat and counters.perpetual_motion_used < stacks: cost − 1 (min 0)"   # §8 code hook 2
    afterCardPlayed: "if info.onBeat and the play was discounted: counters.perpetual_motion_used += 1"
    onTurnStart: "counters.perpetual_motion_used = 0"
upgrade:
  cost: 2
tags: [metronome, power, energy, cost_reduction]
note: "Rare 3 × 10 = 30 → 10 d per turn. +1 energy on ~90% of turns (the beat card must cost ≥ 1): 9 d per turn (90%). Upgraded cost 2 (135%). The discount shows on whichever card in hand would be on the beat (the gold-border card). A discounted play is the instance's one below-cost play this turn (cap_cost_reduction). Two copies discount the first two beat cards. Pays back by turn 4: a boss and elite card, which makes the reward screen a real choice. M."
```

---
## 5. Archetype matrix

**v2 (2026-10-31).** This table follows the v2 pool in `src/content/cards/chronist.ts` and the engines in `docs/v2/chronist-design.md` §2. The sim's johnny bots read it. ● = the card's main engine, ○ = it also serves that engine. K = Clockwork (Cadence: Quicken, Crescendo), J = Conjunction (Timeline width: Chorus, Gather), S = Storm (Augury: Goad and the forecast payoffs), P = Calendar (Timeline depth: Eternal Return), G = Glue. The rest of this file is the v1 pool and is kept for its history and pricing notes.

| id | Rarity | Type | Cost | K Clockwork | J Conjunction | S Storm | P Calendar | G Glue |
|---|---|---|---|---|---|---|---|---|
| `pulse_shot` | starter | A | 1 |  |  |  |  | ● |
| `ward` | starter | S | 1 |  |  |  |  | ● |
| `tick` | starter | A | 0 | ● |  |  |  | ○ |
| `tock` | starter | S | 1 |  | ● |  |  |  |
| `pinion_jab` | common | A | 0 | ● |  |  |  | ○ |
| `gear_train` | common | A | 1 | ● |  |  |  | ○ |
| `downbeat` | common | A | 1 | ● |  |  |  |  |
| `noon_gun` | common | A | 1 |  | ● |  |  |  |
| `afterpeal` | common | A | 1 |  | ● |  |  |  |
| `spring_tide` | common | A | 1 |  | ● |  |  |  |
| `carillon` | common | A | 0 | ● |  |  |  | ○ |
| `storm_glass` | common | S | 1 |  | ● | ○ |  |  |
| `almanac` | common | S | 0 |  | ● |  |  | ○ |
| `ephemeris` | common | S | 1 | ● |  |  |  | ○ |
| `upbeat` | common | S | 0 | ● |  |  |  | ○ |
| `weather_eye` | common | S | 1 |  |  | ● |  | ○ |
| `balance_wheel` | common | S | 1 | ● |  |  |  |  |
| `dead_reckoning` | common | S | 0 | ● |  |  |  | ○ |
| `wind_forward` | common | S | 0 |  | ● |  |  | ○ |
| `hold_the_hour` | common | S | 0 |  | ● |  |  | ○ |
| `ripple` | common | A | 0 |  | ● |  |  |  |
| `whistle_for_wind` | common | S | 0 | ○ |  | ● |  |  |
| `red_sky` | common | S | 1 |  |  | ● |  | ○ |
| `undertow` | common | A | 1 |  |  | ● |  |  |
| `fermata` | uncommon | A | 1 | ● |  |  |  |  |
| `appointed_hour` | uncommon | A | 2 |  |  |  | ● |  |
| `knell` | uncommon | A | 1 |  | ● |  |  |  |
| `turn_the_tide` | uncommon | A | 1 |  |  | ● |  |  |
| `confluence` | uncommon | A | 0 |  | ● |  |  |  |
| `second_hand` | uncommon | A | 0 | ● | ○ |  |  |  |
| `mainspring` | uncommon | S | 0 | ● |  |  |  |  |
| `quarter_chime` | uncommon | S | 0 | ● |  |  |  | ○ |
| `hasten` | uncommon | S | 0 |  | ● |  |  |  |
| `banked_hours` | uncommon | S | 1 |  | ○ |  | ● | ○ |
| `breakwater` | uncommon | S | 2 |  |  |  | ● |  |
| `heave_to` | uncommon | S | 1 |  |  | ● |  | ○ |
| `striking_train` | uncommon | P | 1 | ● |  |  |  |  |
| `tide_table` | uncommon | P | 1 |  | ● |  | ○ | ○ |
| `escapement` | uncommon | P | 1 | ● | ○ |  |  |  |
| `accelerando` | uncommon | P | 0 | ● |  |  |  |  |
| `bell_choir` | uncommon | A | 1 |  | ● |  |  |  |
| `set_the_hour` | uncommon | S | 1 |  | ● |  | ○ | ○ |
| `gathering_storm` | uncommon | S | 1 |  |  | ● |  |  |
| `squall_line` | uncommon | P | 0 |  |  | ● |  |  |
| `zenith` | rare | A | 0 | ● |  |  |  |  |
| `syzygy` | rare | A | 2 |  | ● |  |  |  |
| `culmination` | rare | A | 2 | ● |  |  |  |  |
| `toll_the_hours` | rare | A | X |  |  |  | ● | ○ |
| `seen_it_coming` | rare | S | 1 |  |  | ● |  |  |
| `tourbillon` | rare | S | 0 | ● |  |  |  |  |
| `lighthouse` | rare | S | 2 |  |  | ● |  | ○ |
| `polyrhythm` | rare | P | 1 | ● |  |  |  |  |
| `watch_bell` | rare | P | 2 |  | ● |  | ○ |  |
| `perpetual_motion` | rare | P | 1 | ● |  |  |  |  |
| `total_eclipse` | rare | P | 2 |  | ● |  |  |  |
| `eternal_return` | rare | P | 1 |  |  |  | ● |  |
| `reckoning` | rare | A | 1 |  |  | ● |  |  |
| `eye_of_the_storm` | rare | P | 2 |  |  | ● |  |  |

## 6. Rarity / type / cost histogram

| | Attack | Skill | Power | Total | Cost 0 | Cost 1 | Cost 2 | Cost 3 | X | Delay |
|---|---|---|---|---|---|---|---|---|---|---|
| Starter | 2 | 2 | 0 | 4 | 1 | 3 | 0 | 0 | 0 | 1 |
| Common | 9 | 11 | 0 | 20 | 8 | 11 | 1 | 0 | 0 | 5 |
| Uncommon | 7 | 9 | 4 | 20 | 8 | 10 | 2 | 0 | 0 | 6 |
| Rare | 4 | 4 | 4 | 12 | 2 | 2 | 5 | 2 | 1 | 4 |
| **Total** | **22 (39%)** | **26 (46%)** | **8 (14%)** | **56** | **19 (34%)** | **26** | **8** | **2** | **1** | **16** |

Keywords: Keep 2 (`fermata`, `tourbillon`), Opening 2 (upgrades of `noon_gun`, `escapement`), Scrap 4 (`glance_ahead`, `seen_it_coming`, `star_tithe`, and `tourbillon` via `exhaust {self}` on the beat), Ethereal 0, Unplayable 0. Guard cards 3 (`weather_eye`, `heave_to`, `lighthouse`). Shard / run cards 2 (`logbook`, `star_tithe`). Forecast-reading cards (`forecast_is_attack` / `forecast_damage` / intent fn) 14.

## 7. Relic and potion support (GDD §5, §7.1)

| Archetype | Relics that change the reward screen | Cards they promote |
|---|---|---|
| Metronome | Chrono Lens (starter: first beat draws 1), Tuning Fork (end on exactly 3/6/9: 5 Block), Offbeat Drum (0-cost on-beat ×2), Metronome Heart (beat 12), Fixed Star (boss: only beat 3, +1 energy); potion Tempo Draught (beat offset +1) | Drum: Mainspring, Quarter Chime, Second Hand, Carillon, Pinion Jab, Detent, Tourbillon. Fixed Star: Zenith, Downbeat, Fermata, Perpetual Motion (one huge beat). Tuning Fork: Upbeat, Dead Reckoning (stop on the count) |
| Timeline | Sandglass Bead (first entry 1 turn sooner), Timeline Spool (3 damage per resolution), Paradox Coil (re-add once with Delay 2), Timeline Clamp (shop: +25% Delay damage/Block) | Spool / Watch Bell / Tide Table: many small entries (Second Hand, Almanac, Batten Down). Clamp / Paradox Coil: Syzygy, Appointed Hour, Breakwater, Toll the Hours |
| Oracle | Star Pip, Seer's Veil, Prophet Glass (depth 3), Dampener Coil, Concussion Rig | Prophet Glass: Syzygy and Appointed Hour become aimable; Turn the Tide and Heave To read two forecast moves. Dampener Coil: Batten Down, Storm Glass, Seen It Coming (full-block turns) |
| Glue | Glass Spurs (3 hits from one play), Fracture Engine (Exposed ×2), Geode Heart + Cracked Prism (Shards) | Glass Spurs: Gear Train on beat, Parallax+, Toll the Hours. Fracture Engine: Portents, Pinion Jab, Mark the Lull. Geode Heart: Logbook, Star Tithe |

## 8. `custom` list and named functions

**Zero `custom` effects.** Four pieces of code the DSL can't express, all small and unit-testable (the class limit is 5):

| # | Kind | Name | Used by | What it does | Why the DSL can't |
|---|---|---|---|---|---|
| 1 | named condition (`DslTables.conditions`) | `next_play_on_beat` | `zenith` (canPlay), `upbeat` (canPlay, negated), `perpetual_motion` (cost hook) | `beatPositions(TUNING.cadence.beats).includes(combat.cardsPlayedThisTurn.length + 1 + combat.counters.beatOffset)`, i.e. "the next card you play will be on the beat". It is the same computation the UI uses for the gold beat border (GDD §2.7). | The `on_beat` condition is about the current play; `canPlay` and cost modifiers run before the play exists. It must read the `beatPositions` modifier (Metronome Heart, Fixed Star), so a `compare` on `beat_count` can't express it. |
| 2 | named amount (`DslTables.amounts`) | `target_intent_total` | `seen_it_coming` (inside `delay`) | Total damage of the target's current intent if it is an attack (per-hit preview × hits, after Stagger/Exposed), else 0. **Shared with colourless `mirror_tether`**: one implementation. | `forecast_damage` reads the forecast (depth ≥ 1), not the current intent. This would disappear if `forecast_damage` took a `depth` parameter like `forecast_is_attack`. |
| 3 | status modifier hook | `polyrhythm.onBeatRepeats` | `polyrhythm` | `repeats + stacks`, then `min(repeats, 3)`. | `onBeatRepeats` is a declared modifier (types.ts) with a one-line body; it is listed here because it is code, not DSL. Offbeat Drum needs the same hook, so the cap of 3 must live in the wrapper, not in either source. |
| 4 | status code hooks | `perpetual_motion.modifyCardCost` + `afterCardPlayed` + `onTurnStart` | `perpetual_motion` | A per-turn counter: the first `stacks` on-beat plays cost 1 less (min 0). | Cost modifiers are code (`ModifierHooks.modifyCardCost`); the counter must only advance on discounted beat plays. |

New status hooks used: `afterCardPlayed`, `onTurnStart` (existing), `onDelayResolved`, `onTimelineAdd` (GDD §9 item 10). **[ask]** In status `triggers`, the `on_beat` condition must read `CardPlayedInfo.onBeat` (afterCardPlayed) and `info.entry.onBeat` (onTimelineAdd).

## 9. Loop-safety audit (commandment 17)

The risk the brief names is this class's cheap draw: 19 zero-cost cards plus draw. The answer is a set of rules every card in the pool obeys, and then a check of each resource against its cap.

### 9.1 Invariants the pool obeys
1. **No card in the pool returns a card to hand, fetches, copies or generates a card.** `cap_to_hand` is never touched by Chronist cards (only by potions and colourless cards).
2. **No card moves beat positions.** Beats are 3/6/9 (12 with Metronome Heart), so every on-beat payoff fires **at most 3 (4) times a turn**, whatever the deck.
3. **Every positive card-flow effect is gated** by one of: the beat (≤ 3 per turn), Scrap (once per combat), the Timeline (resolves next turn; `cap_relay` stops a resolved card going back on that turn), or a 1-energy cost (energy ≤ 3 + `cap_bonus_energy` 4 = 7 per turn).
4. **Every energy gain is gated** by the beat (Mainspring, Tourbillon), the Timeline (Banked Hours), or a once-per-turn counter (Perpetual Motion). All are under `cap_bonus_energy` 4. **No common gains energy, returns a card or reduces a cost** (GDD §3).
5. **There is no unconditional 0-cost cantrip.** The only 0-cost card that draws off the beat, Glance Ahead, Scraps. A 0-cost card with no draw lowers your hand by 1 when played, so chains of free cards run out.

### 9.2 Every draw / energy / Advance / cost card vs the caps

| Card | Rarity | Resource per play | Gate | Worst case per turn | Binding cap |
|---|---|---|---|---|---|
| `tick` (+) | starter | draw 1 (2) on beat | beat | 3 beats × 2 × 3 repeats (Drum + Polyrhythm) = 18 | `cap_draw` 15 |
| `ephemeris` (+) | common | draw 2 (+1/+2 on beat) | 1 energy | 7 plays → ≤ 14 + 6 | energy (7), `cap_draw` 15 |
| `almanac` (+) | common | draw 2 (+1 stamped beat) next turn | Timeline | 1 per copy per turn (Advance + `cap_relay`) | `cap_relay`, `cap_advance` 2 |
| `quarter_chime` | uncommon | draw 2 on beat | beat | 3 beats × 2 × 3 = 18 | `cap_draw` 15 |
| `glance_ahead` (+) | uncommon | draw 1 + 1 (2) | Scrap | once per copy per combat | Scrap |
| `banked_hours` (+) | uncommon | +1 energy, draw 2 (3), next turn | Timeline | 1 per copy per turn: energy-neutral, +2/+3 cards | `cap_relay`, `cap_bonus_energy` 4 |
| `tide_table` (+) | uncommon | draw stacks per resolution | resolutions | turn start: ≤ 10 entries (`cap_timeline`); mid-turn only via Advance on cards played this turn | `cap_draw` 15 |
| `mainspring` (+) | uncommon | +1 energy on beat | beat | 3 beats × 1 × 3 repeats = 9 | `cap_bonus_energy` 4 |
| `tourbillon` (+) | rare | +2 energy (+draw 1) on beat, then Scraps itself | beat + self-Scrap | once per copy per combat | `cap_bonus_energy` 4 |
| `star_tithe` (+) | rare | +1 Shard, draw 2 after 3 turns | Timeline + Scrap | once per copy per combat | Scrap; Shard cap 10 |
| `perpetual_motion` | rare | −1 cost on the first `stacks` beat plays | per-turn counter | 1 per copy | `cap_cost_reduction` (once per instance) |
| `wind_forward`, `hasten`, `escapement` | C / U / U | Advance 1 (2) | — | — | `cap_advance` 2 per turn |
| `polyrhythm` | rare | repeats on_beat lists | beat | each on_beat list ≤ 3 times | wrapper cap 3; then the caps above |
| `toll_the_hours` | rare | X hits | energy | X ≤ 7 | energy |

### 9.3 Why no infinite exists
An unbounded loop needs a repeatable cycle with net energy ≥ 0 and net cards ≥ 0. Check each class of card:
- **Beat-gated** effects (draw, energy, Advance) stop after the 3rd beat (4th with Metronome Heart). Cards can't create more beats (invariant 2), and Polyrhythm/Drum repeat a beat's payload, never the beat itself.
- **Scrapped** effects (Glance Ahead, Tourbillon, Star Tithe, Seen It Coming) happen once per copy per combat.
- **Timeline** effects resolve at the next turn start. Pulled into the current turn by Advance (≤ 2 per turn), the card goes to the discard pile, and `cap_relay` makes it unplayable for the rest of the turn. Paradox Coil's re-add is once per card per combat, by its own rule.
- **Energy-costed** draw (Ephemeris) is limited by energy ≤ 7.
- **0-cost cards without draw** each shrink the hand by 1.

So the most cards you can play in a turn is about 5 (hand) + 15 (`cap_draw`) + 2 (Keep) ≈ 22, under `cap_plays` 40. **Commons alone** can't even reach that: they have no energy gain, and their only draw is Tick's beat draw (starter), Almanac (next turn) and Ephemeris (1 energy each).

### 9.4 Assembled worst cases (what the caps actually allow)
- **Metronome**: Polyrhythm (rare) + Offbeat Drum (uncommon relic) + Metronome Heart (rare relic) + 2 Mainspring+ + 2 Quarter Chime + Tick+ + Tourbillon. Beat 3 Quarter Chime: draw 6. Beat 6 Mainspring: +3 energy. Beat 9 Tick+: draw 6. Beat 12 Tourbillon: +1 more energy (cap 4 reached). Totals: 12 effect draws (< 15), +4 energy, ~17 plays, about 7 energy of real cards + 10 weak 0-costs ≈ 7 × 10 + 10 × 3.5 ≈ **105 damage-equivalents in one turn**. It needs 2 rares, a relic of each of uncommon and rare, and 4 uncommons (commandment 17: rare + uncommon + relic). It is finite, and below an Act 3 boss (420–500 HP). GDD §8.3's play-count ceiling boss is the intended check.
- **Timeline**: 10 entries due + Tide Table ×2 + Watch Bell + Timeline Spool. Turn start: 10 resolutions → 20 draws, cut to 15 by `cap_draw`; 10 × (2 Block, +3) and 10 × 3 Spool damage. Building it costs ~10 energy of Delay plays over 3–4 turns, so it is a front-loaded turn, not a loop. Next turn the Timeline is empty.
- **Advance + Banked Hours**: play 3 Banked Hours (3 energy), then Wind Forward: +3 energy, +6 cards, and all 3 are now unplayable this turn (`cap_relay`). That is 1 turn of tempo, bounded by copies.

Simulator: log `cap_draw`, `cap_bonus_energy`, `cap_advance` and `cap_relay` hits by deck (GDD §8.6 item 6). Expect < 1% of turns. If Polyrhythm decks hit `cap_draw` more often than that, Quarter Chime is the first card to touch (draw 2 → 1, +2 Block).

## 10. Example decks vs GDD §8.2

**Model** (crude, shown so the simulator can check it). Each turn you see C cards (5 + effect draws) and spend E energy (3 + bonus). Damage = E × (attack share of the deck's energy cost) × (average damage per attack-energy) + 0-cost damage + beat bonuses + power/relic damage. **Delay value counts on the turn it lands**, discounted for fights that end before it does: Delay 1 −8%, Delay 2 −15%, Delay 3 −25%. Block is computed the same way. Targets (Chronist, GDD §8.2): floor 15 **22 / 12**, floor 30 **36 / 18**, floor 45 **55 / 25** (damage / block). "Output" = damage ÷ rarity rate + block ÷ block rate, to compare decks that trade one for the other.

### Deck 1 — Floor 15, Metronome (16 cards)
`pulse_shot` ×4, `ward` ×3, `tick+`, `tock`, `gear_train`, `downbeat+`, `pinion_jab`, `carillon`, `mainspring`, `sweep_hand`, `balance_wheel`. Relics: Chrono Lens, Tuning Fork.
- 4 zero-cost cards; ~6 cards seen; ~4.3 plays → beat 3 on ~95% of turns, beat 6 ~10% (≈ 1.05 beats).
- Energy cards: attacks are 8 of 13 energy-weight (62%) at (24 + 6 + 14 + 8) ÷ 8 = 6.5 per energy → 3 × 0.62 × 6.5 = **12.1**. Beat bonus ≈ +4 (Downbeat+ +8, Gear +3, Sweep AoE, Carillon) × 1.05 = **4.2**. 0-cost damage 1.5 × 2.3 = **3.5**. Mainspring ≈ +0.3 energy ≈ **1.5**.
- **Damage ≈ 21 vs 22 (−3%)**. Block ≈ 3 × 0.38 × 5.5 = 6.3 + Tuning Fork ~2.5 = **8.8 vs 12 (−27%)**. Output 3.0 + 1.5 = 4.5 vs 5.1 (−12%). It is a glass-cannon start; the next picks should be Storm Glass or Weather Eye.

### Deck 2 — Floor 15, Timeline (16 cards)
`pulse_shot` ×4, `ward` ×4, `tick`, `tock`, `noon_gun+`, `afterpeal`, `storm_glass`, `almanac`, `wind_forward`, `appointed_hour`. Relics: Chrono Lens, Sandglass Bead.
- Attack energy-weight 8 of 14 (57%). Per attack-energy: Pulse 6 × 4, Noon Gun+ 16 × 0.85 = 13.6, Afterpeal 3 + 5.2 × 0.92 = 7.8, Appointed Hour 34 × 0.85 = 28.9 → 74.3 ÷ 8 = 9.3. 3 × 0.57 × 9.3 = **15.9**. Tick **1.1**; Almanac's extra cards and Wind Forward's earlier landings ≈ **2.5**; beats (Afterpeal stamp, Tick draw) ≈ **1.5**.
- **Damage ≈ 21 vs 22 (−5%)**, spiky: the Appointed Hour turn is 34+. Block 3 × 0.43 × 6.4 = 8.3 + Wind Forward fallback ≈ **9 vs 12 (−25%)**. Output 3.0 + 1.5 = 4.5 (−12%).

### Deck 3 — Floor 30, Oracle-Timeline (21 cards)
`pulse_shot` ×2, `ward` ×2, `tick`, `tock+`, `slack_water+`, `storm_glass+`, `gear_train+`, `mark_the_lull`, `noon_gun+`, `appointed_hour+`, `breakwater+`, `heave_to`, `batten_down`, `turn_the_tide+`, `culmination`, `seen_it_coming`, `banked_hours`, `wind_forward`, `storm_warning+`, `knell`, `toll_the_hours`. Relics: Chrono Lens, Star Pip, Seer's Veil, Timeline Clamp.
- E ≈ 3.3 (Banked Hours). Attack share 14 of 23 (61%). Per attack-energy (Clamp +25% on Timeline damage): Pulse 12, Slack Water+ 9.1, Gear+ 9.2, Noon Gun+ 17, Appointed Hour+ 44.6, Turn the Tide+ 14 (Act 2), Culmination ~20 (held for windows), Knell 15.7, Toll X=3 38.7 → 180 ÷ 14 = 12.9. 3.3 × 0.61 × 12.9 = **26.0**, + Mark the Lull Exposed 1.5 + Tick 0.9 + beats 1.5.
- **Damage ≈ 30 vs 36 (−17%)**. Defence: 3.3 × 0.39 × 8.9 = 11.4 + Star Pip 1.5 + Storm Warning Stagger 2.2 + Batten Down 1.0 = **16 vs 18 (−11%)**. Output 3.5 + 2.3 = 5.8 vs 6.8 (**−14%**). The model doesn't credit damage avoided by perfectly timed walls (Seen It Coming on a boss peak, Batten Down vs multi-hit). **Simulator check**: if Oracle decks confirm ~15% low, raise Turn the Tide base 3 → 5 and Heave To base 2 → 4 first.

### Deck 4 — Floor 30, Metronome (20 cards)
`pulse_shot` ×2, `ward` ×3, `tick+`, `tock`, `gear_train+`, `downbeat+`, `pinion_jab`, `carillon+`, `mainspring+`, `quarter_chime`, `sweep_hand+`, `fermata`, `ephemeris`, `striking_train`, `second_hand`, `dead_reckoning`, `upbeat`, `zenith`. Relics: Chrono Lens, Tuning Fork, Offbeat Drum.
- 9 zero-cost cards (45%); ~7 cards seen (Lens, Drum-doubled Tick/Quarter Chime); ~6.2 plays → **≈ 2 beats per turn** (GDD expects 1.8 by floor 45).
- E ≈ 3.56 (Mainspring+ on beat ×2 with Drum, in hand ~35%). Attack share 7 of 12 (58%) at 6.9 per energy → **14.2**. Beats: 2 × ≈ 7 (Fermata +9, Downbeat+ +8, Zenith 10, Carillon+ ×2, Second Hand ×2, Tick+/Quarter Chime draws) = **14**. 0-cost face damage 3.2 × 1.8 = **5.8**. Striking Train 2 × 2 × 1.6 enemies × 0.85 = **5.4**.
- **Damage ≈ 39 vs 36 (+9%)**. Block 3.56 × 0.42 × 5.5 = 8.2 + Upbeat 1.4 + Dead Reckoning 1.4 + Tuning Fork 2.5 = **13.5 vs 18 (−25%)**. Output 4.6 + 1.9 = 6.5 vs 6.8 (−4%). It is the designed "fragile and spiky" shape.

### Deck 5 — Floor 45, Timeline + Metronome (24 cards)
`pulse_shot`, `ward` ×2, `tick+`, `tock+`, `afterpeal+`, `noon_gun+`, `second_hand+`, `appointed_hour+`, `knell+`, `banked_hours+`, `hasten`, `wind_forward`, `escapement+`, `tide_table+`, `watch_bell`, `syzygy+`, `toll_the_hours+`, `gear_train+`, `downbeat+`, `sweep_hand+`, `mainspring+`, `quarter_chime`, `storm_glass+`, `breakwater+`. Relics: Chrono Lens, Sandglass Bead, Timeline Spool, Timeline Clamp, Offbeat Drum, Prophet Glass (both boss relics skipped: +4 Shards).
- E ≈ 3.8 (Mainspring 0.5, Banked Hours 0.3). ~8 cards seen (Tide Table ~1.4 resolutions/turn). Attack share 65% (Act 3 needs more defence). Per attack-energy with Clamp and landing losses: Syzygy+ 93.75 × 0.75 = 70 for 2, Appointed Hour+ 44.6 for 2, Knell+ 26.8, Toll+ X=4 68 for 4, Noon Gun+ 17, Afterpeal+ 11.5, Pulse 9, Gear+ 8, Downbeat+ 14 for 2, Sweep+ 11 → 280 ÷ 16 = 17.5. 3.8 × 0.65 × 17.5 = **43.2**. Timeline Spool 1.4 × 3 = **4.2**. Beats ≈ 1.3 damage beats × 5 = **6.5** (Escapement turns Second Hand+ on the beat into an instant 5 + 12). 0-cost face ≈ **4**.
- **Damage ≈ 58 vs 55 (+5%)**. Block 3.8 × 0.35 × 11 = 14.6 + Watch Bell 1.4 × 4.1 = 5.7 → **≈ 20 vs 25 (−18%)**. Output 5.8 + 2.5 = 8.3 vs 8.6 (−3%). Prophet Glass lets Syzygy+ be aimed at a known turn. The burst turn (Syzygy + Appointed Hour landing together, Advanced by Hasten) is about 160, which an Act 3 boss's damage-cap phase (GDD §8.3) is meant to blunt.

**Read-out**: damage lands within −5% to +9% of target in 4 of 5 decks. Block runs 10–27% under in every deck, which matches the brief ("fragile and spiky": GDD §1.4, 66 HP) but should be watched against the Act 1 boss HP-loss band (30–45). The Oracle-heavy deck is the only one under on total output (−14%); the levers to pull are in Deck 3's note.

## 11. GDD ambiguities and my interpretations

1. **Forecast condition "+40% on the conditional payload"** (§8.5). I read it as "a forecast-gated payload may have a face value 1.4× its budget", so its value is face ÷ 1.4. For "X, or Y if …" cards that is X + (Y − X) ÷ 1.4.
2. **Depth-0 conditions inside Delay cards.** `forecast_is_attack {depth: 0}` (types.ts: current intent) evaluated at resolution (§2.8) checks the move that was "after next" at play time. I price it as a forecast condition. All in-Delay conditions use depth 0 for that reason.
3. **Guard pricing.** The §8.5 rate table (Guard 7 / 8 / 10 per energy vs Block 6 / 7 / 8) and the conversion row "Guard N = 1.2 × Block N" disagree (the table implies 1 Guard ≈ 0.86 Block). I priced by the rate table, as colorless.md does. The systems designer should delete one of the two.
4. **`cap_relay`** ("cannot be put on the Timeline again this turn"). Every Delay card goes onto the Timeline when played, so I read it as: a card that resolved from the Timeline this turn is **unplayable** for the rest of the turn (greyed, reason "Already resolved this turn"). The engine owns this; no card hook.
5. **Timeline-resolved energy and draw** (Banked Hours, Almanac, Tide Table, Star Tithe) at turn-start step 5 count toward `cap_bonus_energy` and `cap_draw`. They are "during your turn" and not the refill or the turn-start 5.
6. **`forecast_damage`** = total attack damage of the target's forecast (types.ts: per-hit × hits, summed over the forecast). With Prophet Glass (depth 3) it sums two moves. Turn the Tide and Heave To are priced at depth 2; Prophet Glass makes them stronger, which I accept for a rare relic. The current intent is not included, so Seen It Coming uses `target_intent_total` (shared with colourless).
7. **Hidden forecasts** (`MoveDef.augury = 'hidden'`, Loom Oracle). I recommend that `forecast_is_attack` treat a hidden move as **not an attack** and `forecast_damage` as 0, so a card never acts on information the player can't see. Slack Water/Culmination/Mark the Lull then pay their "window" bonus against "?" moves; if that is too generous, treat hidden as failing **both** branches' extras.
8. **`on_beat` in status triggers.** A power's `afterCardPlayed` / `onTimelineAdd` trigger has no "current play" of its own. I assume the condition reads `CardPlayedInfo.onBeat` / `info.entry.onBeat` (needs a line in `effects.ts`).
9. **Repeat stacking.** Offbeat Drum ("0-cost on-beat effects trigger twice") + Polyrhythm. I set: each source adds one repeat, at most 3 runs of an on_beat list. GDD only says "relics may repeat it".
10. **AoE price.** It has no GDD row. I used 1.25 × per-target face (graft.md's 0.8 × rate per target); colorless.md uses × 1.6. The systems designer should pick one.
11. **"≥30% of commons fit two archetypes"**: I count Glue as the fourth archetype (the brief lists it as (d)). That gives 75%; across M/T/O only it is 20%.
12. **GDD §1.4 "time a Delay 2 strike to land the turn the boss charges".** With depth-2 Augury, a Delay 1 card aligns with the visible after-next move. A Delay 2 card lands one turn beyond what Augury shows, so it is aimed by boss patterns, Prophet Glass or Advance (Appointed Hour's and Syzygy's notes say so). No rule change needed; flagging so ENEMIES.md bosses telegraph their charge cycle.
13. **`text.ts`** doesn't yet visit `on_beat.effects` or `delay.effects`, or give `advance`/`guard`/`shards` a value. Every such value here carries an explicit `key` (§0.2). The walker needs those cases before these templates render.
14. **Tick** (final starter) is 4.8 d for a 0-cost starter, 160% of budget. I left it as final and noted the generosity, because the starter needs one way to reach beat 6.
