# The Graft — card pool (56)

Status: v1, card designer (Graft). Source of truth for rules is `docs/GDD.md`; this file only adds card content. Every card is priced against GDD §8.5. Every machine block can be transcribed into a `CardDef` (ENGINE_SPEC §8, `src/engine/types.ts`).

Pool: **4 starters** (GDD §4.1, verbatim) + **20 common** + **20 uncommon** + **12 rare** = 56. Types: 23 Attacks (41%), 24 Skills (43%), 9 Powers (16%; uncommon/rare only). **18 Bloom cards**, **12 cards with a Prune variant**, 1 Opening (upgraded only), 3 Keep, 0 Ethereal, 2 Shard cards (+3 Prune away / deck-surgery cards that touch the run deck).

## 0. How to read this file

### 0.1 Human rows
`Text` shows the base card, then `→` the upgraded change. Bloom amounts are shown the way GDD §2.4 renders them: "Deal 4 (+2 per Bloom) damage". `Arch` uses **G** Gardener, **B** Blight, **C** Compost, **M** Mass.

### 0.2 Machine blocks (YAML → TypeScript)
- Each effect is a one-key map: `damage: {...}` means `{ type: 'damage', ... }`. Fields are the `types.ts` field names.
- Amounts: a number, or `{ base, per, scale }`. Scales used: `{cardVar: bloom}`, `{status: rot, of: target}`, `cards_in_exhaust` (= cards in the Scrapheap; existing scale), `bloom_cards_in_deck`, `bloom_total_in_deck`, `shards`, `stacks` (inside a power's status triggers), `deck_size` **[ask: not in GDD §9; the brief allows it — count of run-deck cards, GDD §0.1 "in your deck"]**, and `{fn: name}` (listed in §6).
- Conditions: `has_status: {who, id, min}`, `compare: {left, op, right}`, `pruned_type: {type}` (GDD §9), `any: [...]`.
- `prune: { bloom, variant, bonusIf? }` is GDD §9 item 8. `variant ∈ standard | wild | spread | away`. Prune N is `variant: standard, bloom: N`. The rider ("If you Scrapped an Attack, +1 Bloom") is `bonusIf: { pruned_type: attack, bloom: 1 }`.
- `bloom: { amount, target }` with `target: choose_hand` (GDD §2.4) means "choose a Bloom card in your hand that is not capped". The card being played is in play, not in hand, so it can never pick itself.
- **Keywords** use engine ids: Scrap = `exhaust`, Keep = `retain`, Opening = `innate`, plus `bloom`. GDD §9 item 6 also allows a display-only `prune` keyword; I put Prune in `tags` instead, so the implementer can add the display keyword wherever a `prune` effect appears.
- **Powers** apply a player status that carries the behaviour (ENGINE_SPEC §7). Each power block has a `status_def` with `stacks`, `decay: never`, `tick: never`, `isDebuff: false` and `triggers` (declarative `Triggers` keyed by hook name). The status id is the card id. Two copies of a power add their stacks. Hooks marked **[ask]** are GDD §9 item 10 (`onPrune`, `onBloomGained`).
- **Text templates** follow `src/engine/text.ts`: `{damage}`, `{block}`, `{draw}`, `{lose_hp}`, and `key` overrides (`{rot}`, `{stagger}`, `{bloom}`). The "(+Y per Bloom)" / "+1 per Bloom card in your deck" suffix must render from the amount's own `per`, not hand-typed digits (CLAUDE.md "no hand-written numbers"). I write it as `{damage_per}` / `{block_per}` / `{rot_per}`: **[ask: `text.ts` exposes `<key>_per` for every ScaledAmount]**.

### 0.3 Pricing conventions (GDD §8.5, plus the five calls I had to make)
"d" = common damage-equivalent. "b" = Block. Rates per energy: common 7 d / 6 b, uncommon 8.5 d / 7 b, rare 10 d / 8 b. 6 b ≈ 7 d, so 1 b ≈ 1.17 d. Draw 1 = 3 d. Prune = 3 d, Prune 2 = 5 d, Wild Prune = 4 d, Prune away = 10 d (must Scrap).

1. **Rot** is priced at the GDD row with T = 3: first application N·3 + 3, stacked N·3. A card can be either, so I show both and require their **mean** to sit within about ±1 d of rate (Rot 1 = 6/3 → mean 4.5; Rot 2 = 9/6 → 7.5; Rot 3 = 12/9 → 10.5; Rot 4 = 15/12 → 13.5).
2. **AoE** (no GDD row): an ALL-enemies effect may have a face value of **0.8 × rate × cost** per target. This is the Cleave precedent: a 1-target fight gets 80%, and a 2–3 enemy fight gets 160–240%.
3. **Spread Prune** (no GDD row): **5 d**, the same as Prune 2. In a deck with 4+ Bloom cards you expect 1.5–2 eligible Bloom cards in hand.
4. **"A Bloom card in your hand gains N Bloom"** without a Scrap: **3 d per Bloom**, the same as Prune. Prune's Scrap is optional thinning, roughly worth the "needs another card in hand" restriction.
5. **Deck-count expectations**: Bloom cards in deck 2 / 4 / 6 by act (GDD §8.5). Total Bloom in deck 5 / 12 / 20. Deck size 16 / 22 / 27. Shards held 2. Scrapheap size at play ≈ 3 (Prune deck, turn 3+). Rot on the target at play ≈ 4 (common payoffs) and 5–6 (uncommon). Bloom-card prices use Bloom 2 (GDD §8.5); Bloom cards' upgrades add exactly +1 to `per` and never touch `base`.

### 0.4 The decision the pool is built around
The starter has one Bloom card (Seed Bite) and one Prune (Graft Hide). Standard Prune only grows a Bloom card **in hand** (GDD §0.3.2). So the first two commons the Graft takes create the question "which copy do I feed?". The 7 common Bloom cards all do different jobs: single-target (Seed Bite), AoE (Thornwhirl), Block (Sap Shell), Rot (Blightcap), draw (Tendril Reach), free (Barb Flick), and split damage plus Block (Chitin Ram). Feeding one is always a choice of role. The early Prune cards (Shear, Deep Graft, Windblown Seed, Grafting Cut, Shed Husk, Leaf Litter) also each ask a different question about the Scrap: which Attack, which Status, which Husk do you give up? Grafting Cut can't grow itself, so two copies feed each other. Patient Thorn (Keep) and Dusk Pruning (end-of-turn Prune) let a player plan a specific copy's growth across turns.

---
## 1. Starters (4) — final, verbatim from GDD §4.1

| id | Name | Type | Cost | Text (base → upgraded) | Arch |
|---|---|---|---|---|---|
| `lash` | Lash | attack | 1 | Deal 6 damage. → 9 | — |
| `husk` | Husk | skill | 1 | Gain 5 Block. → 8 | — |
| `seed_bite` | Seed Bite | attack | 1 | Bloom. Deal 4 (+2 per Bloom) damage. → (+3 per Bloom) | G |
| `graft_hide` | Graft Hide | skill | 1 | Gain 5 Block. Prune. → 7 Block | G C |

```card
id: lash
name: Lash
cls: graft
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
tags: [starter]
note: "GDD §4.1. Starter rate 6 d/energy. The natural Prune target: Scrapping a Lash trades 6 d for growth, and Shear's rider pays extra for it."
```

```card
id: husk
name: Husk
cls: graft
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
tags: [starter, block]
note: "GDD §4.1. Starter rate 5 b. The other natural Prune target, kept only when the fight needs Block."
```

```card
id: seed_bite
name: Seed Bite
cls: graft
type: attack
rarity: starter
cost: 1
target: enemy
keywords: [bloom]
text: "Bloom. Deal {damage} ({damage_per} per Bloom) damage."
effects:
  - damage: { amount: { base: 4, per: 2, scale: { cardVar: bloom } }, target: target }
upgrade:
  effects:
    - damage: { amount: { base: 4, per: 3, scale: { cardVar: bloom } }, target: target }
tags: [gardener, bloom, scaling]
note: "GDD §4.1 / §0.3.1. Bloom 2: 4 + 4 = 8 d (starter, above rate on purpose: it is the engine seed). Heartseed fetches the highest-Bloom copy, so a Seed Bite is usually the first copy fed."
```

```card
id: graft_hide
name: Graft Hide
cls: graft
type: skill
rarity: starter
cost: 1
target: self
keywords: []
text: "Gain {block} Block. Prune."
effects:
  - block: { amount: 5 }
  - prune: { bloom: 1, variant: standard }
upgrade:
  effects:
    - block: { amount: 7 }
    - prune: { bloom: 1, variant: standard }
tags: [gardener, compost, prune, block]
note: "GDD §4.1. 5 b + Prune 3 d. Its timing is the starter's sequencing puzzle: play it while a Bloom card is in hand, or the Bloom is lost (GDD §0.3.2)."
```

---
## 2. Commons (20)

Commons are efficient and simple (commandment 15). None of them gains energy, returns a card to hand or reduces a cost (GDD §3). 14 of 20 (70%) fit two archetypes (commandment 13).

| id | Name | Type | Cost | Text (base → upgraded) | Arch |
|---|---|---|---|---|---|
| `thornwhirl` | Thornwhirl | attack | 2 | Bloom. Deal 7 (+2 per Bloom) damage to ALL enemies. → (+3 per Bloom) | G |
| `barb_flick` | Barb Flick | attack | 0 | Bloom. Deal 2 (+1 per Bloom) damage. → (+2 per Bloom) | G M |
| `grafting_cut` | Grafting Cut | attack | 1 | Bloom. Deal 2 (+1 per Bloom) damage. Prune. → (+2 per Bloom) | G C |
| `chitin_ram` | Chitin Ram | attack | 1 | Bloom. Deal 2 (+1 per Bloom) damage. Gain 3 Block. → (+2 per Bloom) | G B |
| `hivestrike` | Hivestrike | attack | 1 | Deal 3 damage, +1 per Bloom card in your deck. → 6 | M G |
| `shear` | Shear | attack | 1 | Deal 3 damage. Prune. If you Scrapped an Attack, +1 Bloom. → 6 | C G |
| `spore_lash` | Spore Lash | attack | 1 | Deal 3 damage. Apply 1 Rot. → Apply 2 Rot | B |
| `canker_bite` | Canker Bite | attack | 1 | Deal 3 damage, +1 per Rot on the enemy. → 6 | B |
| `mulch_maul` | Mulch Maul | attack | 1 | Deal 4 damage, +1 per card in your Scrapheap. → 7 | C |
| `sap_shell` | Sap Shell | skill | 1 | Bloom. Gain 4 (+1 per Bloom) Block. → (+2 per Bloom) | G B |
| `blightcap` | Blightcap | skill | 2 | Bloom. Apply 2 (+1 per Bloom) Rot. → (+2 per Bloom) | G B |
| `tendril_reach` | Tendril Reach | skill | 1 | Bloom. Gain 2 (+1 per Bloom) Block. Draw 1 card. → (+2 per Bloom) | G M |
| `root_mesh` | Root Mesh | skill | 1 | Gain 2 Block, +1 per Bloom card in your deck. → 5 | M B |
| `deep_graft` | Deep Graft | skill | 1 | Gain 2 Block. Prune 2. → 5 Block | G C |
| `windblown_seed` | Windblown Seed | skill | 1 | Gain 3 Block. Wild Prune. → 6 Block | G M |
| `spore_haze` | Spore Haze | skill | 1 | Apply 2 Rot to ALL enemies. Scrap. → 3 Rot | B C |
| `mire_carapace` | Mire Carapace | skill | 1 | Gain 4 Block. If the enemy has Rot, gain 4 more. → 6, 4 more | B |
| `shed_husk` | Shed Husk | skill | 1 | Gain 3 Block. Prune. If you Scrapped a Status or Curse, draw 2 cards. → 6 Block | C G |
| `sap_drip` | Sap Drip | skill | 0 | Choose a Bloom card in your hand; it gains 1 Bloom. Draw 1 card. Scrap. → 2 Bloom | G |
| `leaf_litter` | Leaf Litter | skill | 1 | Prune. Apply 1 Rot to ALL enemies. → 2 Rot | B C |

```card
id: thornwhirl
name: Thornwhirl
cls: graft
type: attack
rarity: common
cost: 2
target: all_enemies
keywords: [bloom]
text: "Bloom. Deal {damage} ({damage_per} per Bloom) damage to ALL enemies."
effects:
  - damage: { amount: { base: 7, per: 2, scale: { cardVar: bloom } }, target: all_enemies }
upgrade:
  effects:
    - damage: { amount: { base: 7, per: 3, scale: { cardVar: bloom } }, target: all_enemies }
tags: [gardener, bloom, aoe, scaling]
note: "AoE face 0.8 × 7 × 2 = 11.2 per target. Bloom 2: 7 + 4 = 11 ✓. Base 7 = 63% of face (≥60%). Cap 27 (37 upgraded). It is the Gardener's pack answer and competes with Seed Bite for every Prune: grow single-target or AoE?"
```

```card
id: barb_flick
name: Barb Flick
cls: graft
type: attack
rarity: common
cost: 0
target: enemy
keywords: [bloom]
text: "Bloom. Deal {damage} ({damage_per} per Bloom) damage."
effects:
  - damage: { amount: { base: 2, per: 1, scale: { cardVar: bloom } }, target: target }
upgrade:
  effects:
    - damage: { amount: { base: 2, per: 2, scale: { cardVar: bloom } }, target: target }
tags: [gardener, mass, bloom, cheap]
note: "0-cost = 3.5 d. Bloom 2: 2 + 2 = 4 (+0.5, rounding). Base 57%. Cap 12 (22 upgraded) for 0 energy. Mass takes it for the Bloom-card count at no energy cost. Gardener grows it as a free finisher. Low face value early, so it is never a trap pick for a deck that won't grow it: it costs nothing to play."
```

```card
id: grafting_cut
name: Grafting Cut
cls: graft
type: attack
rarity: common
cost: 1
target: enemy
keywords: [bloom]
text: "Bloom. Deal {damage} ({damage_per} per Bloom) damage. Prune."
effects:
  - damage: { amount: { base: 2, per: 1, scale: { cardVar: bloom } }, target: target }
  - prune: { bloom: 1, variant: standard }
upgrade:
  effects:
    - damage: { amount: { base: 2, per: 2, scale: { cardVar: bloom } }, target: target }
    - prune: { bloom: 1, variant: standard }
tags: [gardener, compost, bloom, prune]
note: "Bloom 2: 4 + Prune 3 = 7 ✓. Base 2 + 3 = 5 (71%). The card is in play when its Prune resolves, so it can never feed itself. Two copies leapfrog. Compost likes it as a Prune that still deals damage."
```

```card
id: chitin_ram
name: Chitin Ram
cls: graft
type: attack
rarity: common
cost: 1
target: enemy
keywords: [bloom]
text: "Bloom. Deal {damage} ({damage_per} per Bloom) damage. Gain {block} Block."
effects:
  - damage: { amount: { base: 2, per: 1, scale: { cardVar: bloom } }, target: target }
  - block: { amount: 3 }
upgrade:
  effects:
    - damage: { amount: { base: 2, per: 2, scale: { cardVar: bloom } }, target: target }
    - block: { amount: 3 }
tags: [gardener, blight, bloom, block]
note: "Bloom 2: 4 d + 3 b (3.5 d) = 7.5 (+0.5). Base 2 d + 3 b = 5.5 (79%). Blight's stall wants the fixed Block, and Gardener grows the damage. Feeding it over Seed Bite trades peak damage for a card that defends too."
```

```card
id: hivestrike
name: Hivestrike
cls: graft
type: attack
rarity: common
cost: 1
target: enemy
keywords: []
text: "Deal {damage} damage, {damage_per} per Bloom card in your deck."
effects:
  - damage: { amount: { base: 3, per: 1, scale: bloom_cards_in_deck }, target: target }
upgrade:
  effects:
    - damage: { amount: { base: 6, per: 1, scale: bloom_cards_in_deck }, target: target }
tags: [mass, gardener, scaling]
note: "Deck-count pricing at 2 / 4 / 6 Bloom cards by act: 5 / 7 / 9, mean 7 ✓. Upgrade +3 (+43%). It counts copies at any Bloom (including 0) and Scrapped copies still count (GDD §0.1), so Compost's in-fight Scrapping never lowers it. Prune away does, which is the Mass/Compost tension. C19: nearest is Perfected Strike (+2 per 'Strike' card). Ours counts the class's growth investments, so every Bloom-card pick raises it, and it is half the rate per card."
```

```card
id: shear
name: Shear
cls: graft
type: attack
rarity: common
cost: 1
target: enemy
keywords: []
text: "Deal {damage} damage. Prune. If you Scrapped an Attack, +1 Bloom."
effects:
  - damage: { amount: 3, target: target }
  - prune: { bloom: 1, variant: standard, bonusIf: { pruned_type: attack, bloom: 1 } }
upgrade:
  effects:
    - damage: { amount: 6, target: target }
    - prune: { bloom: 1, variant: standard, bonusIf: { pruned_type: attack, bloom: 1 } }
tags: [compost, gardener, prune]
note: "3 d + Prune 3 + rider (+1 Bloom = 3 d × P(Attack Scrapped) ≈ 0.5 → 1.5) = 7.5 ✓. Upgrade +3 d (+40%). Each Lash is a 2-Bloom Prune here, which is the rider variant from GDD §2.5. Decision: Scrap a Lash for +2, or the Husk you don't need for +1."
```

```card
id: spore_lash
name: Spore Lash
cls: graft
type: attack
rarity: common
cost: 1
target: enemy
keywords: []
text: "Deal {damage} damage. Apply {rot} Rot."
effects:
  - damage: { amount: 3, target: target }
  - status: { target: target, id: rot, amount: 1, key: rot }
upgrade:
  effects:
    - damage: { amount: 3, target: target }
    - status: { target: target, id: rot, amount: 2, key: rot }
tags: [blight, cheap]
note: "3 d + Rot 1 (first 6 / stacked 3, mean 4.5) = 7.5 ✓. Upgrade Rot 2 (mean 7.5) → 10.5 (+40%). Played on turn 1 against a boss, Rot 1 is worth 1·9 + 36 = 45 HP over 9 turns (GDD §2.6). It is the 'start the clock' common."
```

```card
id: canker_bite
name: Canker Bite
cls: graft
type: attack
rarity: common
cost: 1
target: enemy
keywords: []
text: "Deal {damage} damage, {damage_per} per Rot on the enemy."
effects:
  - damage: { amount: { base: 3, per: 1, scale: { status: rot, of: target } }, target: target }
upgrade:
  effects:
    - damage: { amount: { base: 6, per: 1, scale: { status: rot, of: target } }, target: target }
tags: [blight, scaling]
note: "Priced at Rot 4 at play (a Blight deck on turn 3): 3 + 4 = 7 ✓. Upgrade +3 (+43%). At the Rot cap it is 18 (21 upgraded) for 1 energy, but only from about turn 6 of a long fight. That is the 'inevitable by turn 6' promise, paid at common in a deck that spent its early turns on Rot. It is a hit (Exposed applies, Block absorbs), unlike Sporeburst. C19: Bane hits twice if Poisoned. Ours scales linearly with the clock."
```

```card
id: mulch_maul
name: Mulch Maul
cls: graft
type: attack
rarity: common
cost: 1
target: enemy
keywords: []
text: "Deal {damage} damage, {damage_per} per card in your Scrapheap."
effects:
  - damage: { amount: { base: 4, per: 1, scale: cards_in_exhaust }, target: target }
upgrade:
  effects:
    - damage: { amount: { base: 7, per: 1, scale: cards_in_exhaust }, target: target }
tags: [compost, scaling]
note: "Priced at Scrapheap 3 (a Prune deck by turn 3): 4 + 3 = 7 ✓. Upgrade +3 (+43%). Every Prune, Scrap card and Spore Haze feeds it, so it is the Compost common payoff. It reads the Scrapheap, not the deck, so Prune and Prune away both help it."
```

```card
id: sap_shell
name: Sap Shell
cls: graft
type: skill
rarity: common
cost: 1
target: self
keywords: [bloom]
text: "Bloom. Gain {block} ({block_per} per Bloom) Block."
effects:
  - block: { amount: { base: 4, per: 1, scale: { cardVar: bloom } } }
upgrade:
  effects:
    - block: { amount: { base: 4, per: 2, scale: { cardVar: bloom } } }
tags: [gardener, blight, bloom, block]
note: "Bloom 2: 4 + 2 = 6 b ✓. Base 67%. Cap 14 (24 upgraded). Blight's stall card. In a Gardener hand it is the 'grow my defence or my damage?' alternative to Seed Bite."
```

```card
id: blightcap
name: Blightcap
cls: graft
type: skill
rarity: common
cost: 2
target: enemy
keywords: [bloom]
text: "Bloom. Apply {rot} ({rot_per} per Bloom) Rot."
effects:
  - status: { target: target, id: rot, amount: { base: 2, per: 1, scale: { cardVar: bloom } }, key: rot }
upgrade:
  effects:
    - status: { target: target, id: rot, amount: { base: 2, per: 2, scale: { cardVar: bloom } }, key: rot }
tags: [gardener, blight, bloom, scaling]
note: "Rate 14. Bloom 2 = Rot 4: first 15 / stacked 12, mean 13.5 ✓. Base Rot 2 (first 9) = 64%. Cap: Rot 12 (upgraded 22 → clamped to 15). A grown Blightcap starts the clock near the cap in one play, but it takes about 10 Prunes on this copy. This is the Gardener–Blight bridge."
```

```card
id: tendril_reach
name: Tendril Reach
cls: graft
type: skill
rarity: common
cost: 1
target: self
keywords: [bloom]
text: "Bloom. Gain {block} ({block_per} per Bloom) Block. Draw {draw} card."
effects:
  - block: { amount: { base: 2, per: 1, scale: { cardVar: bloom } } }
  - draw: { n: 1 }
upgrade:
  effects:
    - block: { amount: { base: 2, per: 2, scale: { cardVar: bloom } } }
    - draw: { n: 1 }
tags: [gardener, mass, bloom, draw, block]
note: "Bloom 2: 4 b + draw (3 d ≈ 2.6 b) = 6.6 b ✓ (+0.6). Base 2 + 2.6 = 4.6 (77%). Mass takes it because it replaces itself, which offsets a wide deck's dilution. Gardener uses it as a cheap Prune target that digs for the real one."
```

```card
id: root_mesh
name: Root Mesh
cls: graft
type: skill
rarity: common
cost: 1
target: self
keywords: []
text: "Gain {block} Block, {block_per} per Bloom card in your deck."
effects:
  - block: { amount: { base: 2, per: 1, scale: bloom_cards_in_deck } }
upgrade:
  effects:
    - block: { amount: { base: 5, per: 1, scale: bloom_cards_in_deck } }
tags: [mass, blight, block, scaling]
note: "This is GDD §1.3's 'Block equal to the number of Bloom cards in your deck'. At 2 / 4 / 6 by act: 4 / 6 / 8 b, mean 6 ✓. Upgrade +3 (+50%). Blight's stall in a deck that also took Bloom cards."
```

```card
id: deep_graft
name: Deep Graft
cls: graft
type: skill
rarity: common
cost: 1
target: self
keywords: []
text: "Gain {block} Block. Prune 2."
effects:
  - block: { amount: 2 }
  - prune: { bloom: 2, variant: standard }
upgrade:
  effects:
    - block: { amount: 5 }
    - prune: { bloom: 2, variant: standard }
tags: [gardener, compost, prune, block]
note: "2 b + Prune 2 (5 d ≈ 4.3 b) = 6.3 b ✓. Upgrade +3 b (+48%). The Gardener's growth common. Whether it lands depends on holding a Bloom card, so it rewards Keep (Patient Thorn) and Heartseed."
```

```card
id: windblown_seed
name: Windblown Seed
cls: graft
type: skill
rarity: common
cost: 1
target: self
keywords: []
text: "Gain {block} Block. Wild Prune."
effects:
  - block: { amount: 3 }
  - prune: { bloom: 1, variant: wild }
upgrade:
  effects:
    - block: { amount: 6 }
    - prune: { bloom: 1, variant: wild }
tags: [gardener, mass, prune, block]
note: "3 b + Wild Prune (4 d ≈ 3.4 b) = 6.4 b ✓. Upgrade +3 b (+47%). It never loses its Bloom while any eligible Bloom card is in hand, draw or discard. It is random, though, so it is the Mass Prune (it spreads growth across many copies) and the Gardener's insurance. 'misc' rng stream."
```

```card
id: spore_haze
name: Spore Haze
cls: graft
type: skill
rarity: common
cost: 1
target: all_enemies
keywords: [exhaust]
text: "Apply {rot} Rot to ALL enemies. Scrap."
effects:
  - status: { target: all_enemies, id: rot, amount: 2, key: rot }
upgrade:
  effects:
    - status: { target: all_enemies, id: rot, amount: 3, key: rot }
tags: [blight, compost, aoe]
note: "Per target Rot 2 mean 7.5. Budget: AoE face 0.8 × 7 × 1.35 (Scrap) = 7.6 ✓. A 3-enemy pack gets 22.5 d for 1 energy, which is Blight's Act 2 answer. Upgrade Rot 3 (mean 10.5, +40%). Its Scrap feeds Mulch Maul and Humus Rite."
```

```card
id: mire_carapace
name: Mire Carapace
cls: graft
type: skill
rarity: common
cost: 1
target: enemy
keywords: []
text: "Gain {block} Block. If the enemy has Rot, gain {block2} more."
effects:
  - block: { amount: 4 }
  - conditional:
      if: { has_status: { who: target, id: rot, min: 1 } }
      then:
        - block: { amount: 4 }
upgrade:
  effects:
    - block: { amount: 6 }
    - conditional:
        if: { has_status: { who: target, id: rot, min: 1 } }
        then:
          - block: { amount: 4 }
tags: [blight, block]
note: "4 b + 4 b × P(Rot) ≈ 0.6 → 6.4 b ✓. 8 b in Blight, inside the +50% conditional allowance (9 b). Upgrade +2 b (+25%; +33% outside Blight). Targets an enemy so it reads that enemy's Rot: the Blight player defends against the enemy she has been rotting."
```

```card
id: shed_husk
name: Shed Husk
cls: graft
type: skill
rarity: common
cost: 1
target: self
keywords: []
text: "Gain {block} Block. Prune. If you Scrapped a Status or Curse, draw {draw} cards."
effects:
  - block: { amount: 3 }
  - prune: { bloom: 1, variant: standard }
  - conditional:
      if: { any: [ { pruned_type: { type: status } }, { pruned_type: { type: curse } } ] }
      then:
        - draw: { n: 2 }
upgrade:
  effects:
    - block: { amount: 6 }
    - prune: { bloom: 1, variant: standard }
    - conditional:
        if: { any: [ { pruned_type: { type: status } }, { pruned_type: { type: curse } } ] }
        then:
          - draw: { n: 2 }
tags: [compost, gardener, prune, block, draw]
note: "3 b + Prune 2.6 b + draw 2 (5.2 b) × P(Status/Curse in hand) ≈ 0.25 → 1.3 = 6.9 b ✓. Upgrade +3 b (+43%). ENEMIES.md §0.5 makes Tangle, Jitter and Backlash the intended Prune fodder. This card turns them into a cantrip, and it stacks with Grafting Knife."
```

```card
id: sap_drip
name: Sap Drip
cls: graft
type: skill
rarity: common
cost: 0
target: self
keywords: [exhaust]
text: "Choose a Bloom card in your hand; it gains {bloom} Bloom. Draw {draw} card. Scrap."
effects:
  - bloom: { amount: 1, target: choose_hand, key: bloom }
  - draw: { n: 1 }
upgrade:
  effects:
    - bloom: { amount: 2, target: choose_hand, key: bloom }
    - draw: { n: 1 }
tags: [gardener, bloom, draw, cheap]
note: "0-cost Scrap budget 3.5 × 1.35 = 4.7 d. +1 Bloom (3 d, §0.3 call 4) + draw 3 = 6 (+1.3, accepted: if no Bloom card is in hand, it is only a 0-cost cantrip). Upgrade +1 Bloom (+50%). Bloom grows by an explicit effect on another card (GDD §2.4), never by being played itself. This is the cleanest 'which copy?' card at common."
```

```card
id: leaf_litter
name: Leaf Litter
cls: graft
type: skill
rarity: common
cost: 1
target: all_enemies
keywords: []
text: "Prune. Apply {rot} Rot to ALL enemies."
effects:
  - prune: { bloom: 1, variant: standard }
  - status: { target: all_enemies, id: rot, amount: 1, key: rot }
upgrade:
  effects:
    - prune: { bloom: 1, variant: standard }
    - status: { target: all_enemies, id: rot, amount: 2, key: rot }
tags: [blight, compost, prune, aoe]
note: "Prune 3 + AoE Rot 1 (mean 4.5 per target, AoE face budget for the remaining 4 d = 5) = 7.5 ✓. Upgrade Rot 2 (+40%). The Blight/Compost glue: it starts every enemy's clock while thinning. With Decomposer one play is 2 Rot sources."
```

---
## 3. Uncommons (20)

Archetype definers (commandment 15): the Prune away surgery cards, the `onPrune` Powers, the Rot accelerators and the deck-width payoffs.

| id | Name | Type | Cost | Text (base → upgraded) | Arch |
|---|---|---|---|---|---|
| `twin_thorn` | Twin Thorn | attack | 2 | Bloom. Deal 5 (+2 per Bloom) damage twice. → (+3 per Bloom) | G |
| `canopy_crush` | Canopy Crush | attack | 2 | Deal 4 damage, +1 per Bloom in your deck. → 9 | M G |
| `miasma_sweep` | Miasma Sweep | attack | 2 | Bloom. Deal 4 (+1 per Bloom) damage to ALL enemies. Apply 2 Rot to ALL enemies. → (+2 per Bloom) | B G |
| `uproot` | Uproot | attack | 2 | Deal 12 damage. Prune away. Scrap. → 16 | C G |
| `prism_thorn` | Prism Thorn | attack | 1 | Deal 5 damage, +2 per Shard you have. → +3 per Shard | C |
| `pollen_sting` | Pollen Sting | attack | 1 | Bloom. Deal 3 (+1 per Bloom) damage. Choose a Bloom card in your hand; it gains 1 Bloom. → (+2 per Bloom) | G |
| `thicket_crash` | Thicket Crash | attack | 3 | Deal damage to ALL enemies equal to the number of cards in your deck. → cost 2 | M |
| `patient_thorn` | Patient Thorn | attack | 1 | Bloom. Keep. Deal 4 (+2 per Bloom) damage. → (+3 per Bloom) | G |
| `burl_wall` | Burl Wall | skill | 2 | Bloom. Gain 8 (+3 per Bloom) Block. → (+4 per Bloom) | G B |
| `choking_spores` | Choking Spores | skill | 1 | Apply 1 Stagger and 1 Rot to ALL enemies. → 2 Stagger | B |
| `excise` | Excise | skill | 1 | Prune away. Scrap. → Draw 1 card. | C |
| `propagate` | Propagate | skill | 1 | Choose a Bloom card in your hand. Add a copy of it to your deck. Scrap. → the copy is upgraded | M G |
| `seed_rain` | Seed Rain | skill | 1 | Gain 3 Block. Spread Prune. → 6 Block | G M |
| `puffball` | Puffball | skill | 1 | Bloom. Apply 1 (+1 per Bloom) Rot to ALL enemies. Scrap. → (+2 per Bloom) | G B |
| `sporeburst` | Sporeburst | skill | 1 | The enemy loses HP equal to its Rot. Then it gains 1 Rot. → gains 2 Rot | B |
| `decomposer` | Decomposer | power | 1 | Whenever you Prune, apply 1 Rot to a random enemy. → cost 0 | C B |
| `dusk_pruning` | Dusk Pruning | power | 1 | At the end of your turn, Prune. → cost 0 | G C |
| `living_hedge` | Living Hedge | power | 2 | At the start of your turn, gain 1 Block per Bloom card in your deck. → cost 1 | M B |
| `thorn_halo` | Thorn Halo | power | 2 | Bloom. At the start of your turn, deal 3 (+1 per Bloom) damage to a random enemy. → (+2 per Bloom) | G |
| `ripening_rot` | Ripening Rot | power | 1 | At the start of your turn, each enemy with Rot gains 1 Rot. → cost 0 | B |

```card
id: twin_thorn
name: Twin Thorn
cls: graft
type: attack
rarity: uncommon
cost: 2
target: enemy
keywords: [bloom]
text: "Bloom. Deal {damage} ({damage_per} per Bloom) damage twice."
effects:
  - damage: { amount: { base: 5, per: 2, scale: { cardVar: bloom } }, times: 2, target: target }
upgrade:
  effects:
    - damage: { amount: { base: 5, per: 3, scale: { cardVar: bloom } }, times: 2, target: target }
tags: [gardener, bloom, scaling, multihit]
note: "Rate 17. Bloom 2: 9 × 2 = 18 ✓ (+1). Base 10 = 59%. Cap 25 × 2 = 50 (35 × 2 = 70 upgraded): 25–35 per energy, the same band as Seed Bite+ at cap (34). Two hits double Exposed. It is the second Gardener engine to grow, and Glass Spurs needs 3 hits, so it doesn't trigger that relic."
```

```card
id: canopy_crush
name: Canopy Crush
cls: graft
type: attack
rarity: uncommon
cost: 2
target: enemy
keywords: []
text: "Deal {damage} damage, {damage_per} per Bloom in your deck."
effects:
  - damage: { amount: { base: 4, per: 1, scale: bloom_total_in_deck }, target: target }
upgrade:
  effects:
    - damage: { amount: { base: 9, per: 1, scale: bloom_total_in_deck }, target: target }
tags: [mass, gardener, scaling]
note: "Total Bloom 5 / 12 / 20 by act: 9 / 16 / 24, mean 16.3 vs rate 17 ✓. Upgrade +5 (+31%). Reads total Bloom, so it rewards both one tall copy and many short ones. Scrapped and Timeline copies still count. Prune away of a grown copy lowers it, so a Mass player won't Prune away a Bloom card."
```

```card
id: miasma_sweep
name: Miasma Sweep
cls: graft
type: attack
rarity: uncommon
cost: 2
target: all_enemies
keywords: [bloom]
text: "Bloom. Deal {damage} ({damage_per} per Bloom) damage to ALL enemies. Apply {rot} Rot to ALL enemies."
effects:
  - damage: { amount: { base: 4, per: 1, scale: { cardVar: bloom } }, target: all_enemies }
  - status: { target: all_enemies, id: rot, amount: 2, key: rot }
upgrade:
  effects:
    - damage: { amount: { base: 4, per: 2, scale: { cardVar: bloom } }, target: all_enemies }
    - status: { target: all_enemies, id: rot, amount: 2, key: rot }
tags: [blight, gardener, bloom, aoe]
note: "AoE face 0.8 × 8.5 × 2 = 13.6 per target. Bloom 2: 6 + Rot 2 mean 7.5 = 13.5 ✓. Base 11.5 (85%; the Rot is fixed). Unlike Thornwhirl it trades raw AoE for starting every clock, so a Blight deck picks this one and a Gardener deck picks Thornwhirl."
```

```card
id: uproot
name: Uproot
cls: graft
type: attack
rarity: uncommon
cost: 2
target: enemy
keywords: [exhaust]
text: "Deal {damage} damage. Prune away. Scrap."
effects:
  - damage: { amount: 12, target: target }
  - prune: { bloom: 1, variant: away }
upgrade:
  effects:
    - damage: { amount: 16, target: target }
    - prune: { bloom: 1, variant: away }
tags: [compost, gardener, prune, removal]
note: "Budget 17 × 1.35 = 23. 12 + Prune away 10 = 22 ✓. Upgrade +4 (+33% on damage). Prune away rules (GDD §2.5): not Bound, max 1 per turn (`cap_prune_away`), confirmation prompt. A free shop removal (75+ gold) on a card that also hits. It is Compost's core surgery and Mass's temptation to resist."
```

```card
id: prism_thorn
name: Prism Thorn
cls: graft
type: attack
rarity: uncommon
cost: 1
target: enemy
keywords: []
text: "Deal {damage} damage, {damage_per} per Shard you have."
effects:
  - damage: { amount: { base: 5, per: 2, scale: shards }, target: target }
upgrade:
  effects:
    - damage: { amount: { base: 5, per: 3, scale: shards }, target: target }
tags: [compost, shards, scaling]
note: "Priced at 2 Shards held (GDD §4.5: 3–5 earned per act, mostly spent): 5 + 4 = 9 vs 8.5 ✓. Upgrade per +1 (+22% at 2 Shards, +45% at 5). Run interaction: holding Shards instead of Purging is now a damage stance. It rewards the skip-heavy Compost run and punishes Mass's 'take every card' run. Ceiling 25 (35) at the 10-Shard cap, paid for by never spending."
```

```card
id: pollen_sting
name: Pollen Sting
cls: graft
type: attack
rarity: uncommon
cost: 1
target: enemy
keywords: [bloom]
text: "Bloom. Deal {damage} ({damage_per} per Bloom) damage. Choose a Bloom card in your hand; it gains {bloom} Bloom."
effects:
  - damage: { amount: { base: 3, per: 1, scale: { cardVar: bloom } }, target: target }
  - bloom: { amount: 1, target: choose_hand, key: bloom }
upgrade:
  effects:
    - damage: { amount: { base: 3, per: 2, scale: { cardVar: bloom } }, target: target }
    - bloom: { amount: 1, target: choose_hand, key: bloom }
tags: [gardener, bloom]
note: "Bloom 2: 5 + 1 Bloom (3 d) = 8 vs 8.5 ✓. Base 6 (70%). Grows another copy without a Scrap, so it fits the Gardener who wants to keep her deck intact. Two copies leapfrog. With Quickening Sap the Bloom it gives makes the receiving card free (bounded by `cap_cost_reduction`)."
```

```card
id: thicket_crash
name: Thicket Crash
cls: graft
type: attack
rarity: uncommon
cost: 3
target: all_enemies
keywords: []
text: "Deal damage to ALL enemies equal to the number of cards in your deck ({damage})."
effects:
  - damage: { amount: { base: 0, per: 1, scale: deck_size }, target: all_enemies }
upgrade:
  cost: 2
tags: [mass, aoe, scaling]
note: "AoE face 0.8 × 8.5 × 3 = 20.4. Deck 16 / 22 / 27: mean 21.7 ✓. Upgrade cost 3→2 (+50% efficiency). Prune away and removals each lower it by 1, which is the Mass vs Compost tension in one number. It counts the run deck (GDD §0.1), so in-combat Scrapping doesn't lower it. C19: Mind Blast counts the draw pile (single target, Innate). Ours counts the permanent deck, hits all enemies, and rewards taking cards over skipping."
```

```card
id: patient_thorn
name: Patient Thorn
cls: graft
type: attack
rarity: uncommon
cost: 1
target: enemy
keywords: [bloom, retain]
text: "Bloom. Keep. Deal {damage} ({damage_per} per Bloom) damage."
effects:
  - damage: { amount: { base: 4, per: 2, scale: { cardVar: bloom } }, target: target }
upgrade:
  effects:
    - damage: { amount: { base: 4, per: 3, scale: { cardVar: bloom } }, target: target }
tags: [gardener, bloom, scaling]
note: "Keep −10%: rate 7.7. Bloom 2: 8 ✓. Base 4 = 52%, under the 60% floor on purpose: Keep means it sits in hand for every Prune that turn and the next, so it reaches Bloom 2 faster than any other copy. It is the dedicated growth target. With Dusk Pruning it gets an end-of-turn Prune every turn while held. Keep budget 1 of 3."
```

```card
id: burl_wall
name: Burl Wall
cls: graft
type: skill
rarity: uncommon
cost: 2
target: self
keywords: [bloom]
text: "Bloom. Gain {block} ({block_per} per Bloom) Block."
effects:
  - block: { amount: { base: 8, per: 3, scale: { cardVar: bloom } } }
upgrade:
  effects:
    - block: { amount: { base: 8, per: 4, scale: { cardVar: bloom } } }
tags: [gardener, blight, bloom, block]
note: "Rate 14 b. Bloom 2: 8 + 6 = 14 ✓. Base 57%. Cap 38 (48 upgraded) for 2. It is the answer to an Act 3 single 30+ hit (GDD §8.1). Blight's turtle grows it to outlast the clock boss's spikes."
```

```card
id: choking_spores
name: Choking Spores
cls: graft
type: skill
rarity: uncommon
cost: 1
target: all_enemies
keywords: []
text: "Apply {stagger} Stagger and {rot} Rot to ALL enemies."
effects:
  - status: { target: all_enemies, id: stagger, amount: 1, key: stagger }
  - status: { target: all_enemies, id: rot, amount: 1, key: rot }
upgrade:
  effects:
    - status: { target: all_enemies, id: stagger, amount: 2, key: stagger }
    - status: { target: all_enemies, id: rot, amount: 1, key: rot }
tags: [blight, aoe, debuff, block]
note: "Per target: Stagger 1 (2 b ≈ 2.3 d; 3 vs multi-hit) + Rot 1 mean 4.5 = 6.8 = AoE face 0.8 × 8.5 ✓. Upgrade +1 Stagger (+34%; much more against Act 2 multi-hit packs). Blight's defensive debuff. It stalls by shrinking hits, not by gaining Block."
```

```card
id: excise
name: Excise
cls: graft
type: skill
rarity: uncommon
cost: 1
target: none
keywords: [exhaust]
text: "Prune away. Scrap."
effects:
  - prune: { bloom: 1, variant: away }
upgrade:
  text: "Prune away. Draw {draw} card. Scrap."
  effects:
    - prune: { bloom: 1, variant: away }
    - draw: { n: 1 }
tags: [compost, prune, removal]
note: "Budget 8.5 × 1.35 = 11.5. Prune away 10 ✓ (under, because it does nothing else this turn). Upgrade +draw 1 (13, +30%). The upgrade does not drop it to cost 0: a 0-cost free removal would be 10 d on a 5.7 d budget. In-combat removal of a Status-cursed or starter card, plus 1 Bloom on the way out."
```

```card
id: propagate
name: Propagate
cls: graft
type: skill
rarity: uncommon
cost: 1
target: none
keywords: [exhaust]
text: "Choose a Bloom card in your hand. Add a copy of it to your deck. Scrap."
effects:
  - duplicate_card: { choose: true, from: hand, filter: bloom, to: deck, upgraded: same }
upgrade:
  text: "Choose a Bloom card in your hand. Add an upgraded copy of it to your deck. Scrap."
  effects:
    - duplicate_card: { choose: true, from: hand, filter: bloom, to: deck, upgraded: true }
tags: [mass, gardener, bloom]
note: "Inverse surgery, priced like Prune away (10 d) on the 11.5 budget ✓. The copy goes into the run deck at once at 0 Bloom (GDD §2.4: a new copy holds no Bloom) and is in no combat pile this fight. It counts for every 'in your deck' scale immediately. Upgrade: the copy is upgraded (+1 per Bloom on a fresh copy, about +30%). This is the Mass engine: each play is a permanent +1 to Hivestrike, Root Mesh, Verdant Tide and Thicket Crash, and Compost's opposite. The filter is Bloom cards only, and Propagate is not one, so it cannot copy itself."
```

```card
id: seed_rain
name: Seed Rain
cls: graft
type: skill
rarity: uncommon
cost: 1
target: self
keywords: []
text: "Gain {block} Block. Spread Prune."
effects:
  - block: { amount: 3 }
  - prune: { bloom: 1, variant: spread }
upgrade:
  effects:
    - block: { amount: 6 }
    - prune: { bloom: 1, variant: spread }
tags: [gardener, mass, prune, block]
note: "3 b + Spread Prune (5 d ≈ 4.3 b, §0.3 call 3) = 7.3 b ✓. Upgrade +3 b (+41%). Every eligible Bloom card in hand gains 1. Width pays, so Mass prefers it over Prune 2 and the tall Gardener prefers Deep Graft. That split is deliberate."
```

```card
id: puffball
name: Puffball
cls: graft
type: skill
rarity: uncommon
cost: 1
target: all_enemies
keywords: [bloom, exhaust]
text: "Bloom. Apply {rot} ({rot_per} per Bloom) Rot to ALL enemies. Scrap."
effects:
  - status: { target: all_enemies, id: rot, amount: { base: 1, per: 1, scale: { cardVar: bloom } }, key: rot }
upgrade:
  effects:
    - status: { target: all_enemies, id: rot, amount: { base: 1, per: 2, scale: { cardVar: bloom } }, key: rot }
tags: [gardener, blight, bloom, aoe]
note: "Budget: AoE face 0.8 × 8.5 × 1.35 (Scrap) = 9.2 per target (9.7 at the 9-rate top of uncommon). Bloom 2 = Rot 3, mean 10.5 (+8% over the top band; accepted for a once-per-combat card). Base Rot 1 = 4.5 (49%). It differs from Blightcap: once per fight and hits all enemies, against a repeatable single target. Cap Rot 11 to every enemy at Bloom 10, the Gardener–Blight pack bomb."
```

```card
id: sporeburst
name: Sporeburst
cls: graft
type: skill
rarity: uncommon
cost: 1
target: enemy
keywords: []
text: "The enemy loses HP equal to its Rot ({lose_hp}). Then it gains {rot} Rot."
effects:
  - lose_hp: { amount: { base: 0, per: 1, scale: { status: rot, of: target } }, target: target }
  - status: { target: target, id: rot, amount: 1, key: rot }
upgrade:
  effects:
    - lose_hp: { amount: { base: 0, per: 1, scale: { status: rot, of: target } }, target: target }
    - status: { target: target, id: rot, amount: 2, key: rot }
tags: [blight, scaling]
note: "Priced at Rot 5–6 at play: 5.5 + Rot 1 stacked 3 = 8.5 ✓. Upgrade +1 Rot (+35%). It is an extra Rot tick on demand, and HP loss, so it ignores Block, Guard and Ghost Lantern. Late fight at cap it is 15 + 3 for 1 energy. C19: Catalyst doubles Poison (multiplies the stack). Ours cashes the stack once and grows it by 1."
```

```card
id: decomposer
name: Decomposer
cls: graft
type: power
rarity: uncommon
cost: 1
target: self
keywords: []
text: "Whenever you Prune, apply {status} Rot to a random enemy."
effects:
  - status: { target: self, id: decomposer, amount: 1 }
status_def:
  id: decomposer
  stacks: amount
  decay: never
  tick: never
  isDebuff: false
  text: "Whenever you Prune, apply {stacks} Rot to a random enemy."
  triggers:
    onPrune:                                   # [ask] GDD §9 item 10; fires only when the Prune Scrapped a card
      - status: { target: random_enemy, id: rot, amount: { scale: stacks } }
upgrade:
  cost: 0
tags: [compost, blight, prune, power]
note: "Power setup: about 2.8 d per turn. A Prune deck averages about 1 Prune per turn → Rot 1 per Prune (stacked 3, first 6) ≈ 3–4 d per turn ✓. Upgrade cost 0 (+1 energy on the setup turn). 'Random enemy' uses the misc stream. This is the Compost→Blight bridge. C19: Feel No Pain/Dark Embrace pay on exhaust with Block or draw. Ours pays only on Prune, and in Rot."
```

```card
id: dusk_pruning
name: Dusk Pruning
cls: graft
type: power
rarity: uncommon
cost: 1
target: self
keywords: []
text: "At the end of your turn, Prune."
effects:
  - status: { target: self, id: dusk_pruning, amount: 1 }
status_def:
  id: dusk_pruning
  stacks: amount
  decay: never
  tick: never
  isDebuff: false
  text: "At the end of your turn, Prune {stacks} time(s)."
  triggers:
    onTurnEnd:                                 # GDD §2.0 player turn end step 1, before Keep/discard
      - repeat: { times: { scale: stacks }, effects: [ { prune: { bloom: 1, variant: standard } } ] }
upgrade:
  cost: 0
tags: [gardener, compost, prune, power]
note: "One Prune per turn = 3 d per turn vs the 2.8 setup line ✓. Upgrade cost 0. It changes what you leave in hand: end the turn holding the copy you want grown (Patient Thorn, which Keeps, is ideal) plus one card you are happy to Scrap. The Prune is still optional ('you may'). It raises a pendingChoice inside an end-of-turn hook: [ask] hook-raised choices must be queued, not `now`."
```

```card
id: living_hedge
name: Living Hedge
cls: graft
type: power
rarity: uncommon
cost: 2
target: self
keywords: []
text: "At the start of your turn, gain 1 Block per Bloom card in your deck."
effects:
  - status: { target: self, id: living_hedge, amount: 1 }
status_def:
  id: living_hedge
  stacks: amount
  decay: never
  tick: never
  isDebuff: false
  text: "At the start of your turn, gain 1 Block per Bloom card in your deck ({stacks}×)."
  triggers:
    onTurnStart:
      - repeat: { times: { scale: stacks }, effects: [ { block: { amount: { base: 0, per: 1, scale: bloom_cards_in_deck } } } ] }
upgrade:
  cost: 1
tags: [mass, blight, block, power, scaling]
note: "2-cost setup: 17 / 3 ≈ 5.7 d ≈ 4.9 b per turn. At 4–6 Bloom cards (acts 2–3) it gives 4–6 b per turn ✓. Mass decks with 8+ get more (the build-around). Upgrade cost 1 (+50%). Block arrives at turn start step 4, after the reset, so it lasts through the enemy phase. C19: Metallicize gives flat Block each turn. Ours scales with deck composition and is priced at 2."
```

```card
id: thorn_halo
name: Thorn Halo
cls: graft
type: power
rarity: uncommon
cost: 2
target: self
keywords: [bloom]
text: "Bloom. At the start of your turn, deal {status} ({status_per} per Bloom) damage to a random enemy."
effects:
  - status: { target: self, id: thorn_halo, amount: { base: 3, per: 1, scale: { cardVar: bloom } } }
status_def:
  id: thorn_halo
  stacks: amount
  decay: never
  tick: never
  isDebuff: false
  text: "At the start of your turn, deal {stacks} damage to a random enemy."
  triggers:
    onTurnStart:
      - damage: { amount: { scale: stacks }, target: random_enemy }
upgrade:
  effects:
    - status: { target: self, id: thorn_halo, amount: { base: 3, per: 2, scale: { cardVar: bloom } } }
tags: [gardener, bloom, power, scaling]
note: "2-cost setup: 5.7 d per turn. Bloom 2: 3 + 2 = 5 per turn ✓. Base 53%. Cap 13 (23 upgraded) per turn. The status snapshots the card's Bloom when played. It is a Bloom Power, so the copy must be fed **before** it is played: hold it a turn to Prune into it, or play it now? It is a hit (Exposed applies)."
```

```card
id: ripening_rot
name: Ripening Rot
cls: graft
type: power
rarity: uncommon
cost: 1
target: self
keywords: []
text: "At the start of your turn, each enemy with Rot gains 1 Rot."
effects:
  - status: { target: self, id: ripening_rot, amount: 1 }
status_def:
  id: ripening_rot
  stacks: amount
  decay: never
  tick: never
  isDebuff: false
  text: "At the start of your turn, each enemy with Rot gains {stacks} Rot."
  triggers:
    onTurnStart:
      - custom: { fn: ripen_rotting_enemies }   # §6 custom 5: each living enemy with rot ≥ 1 gains `stacks` Rot (cap applies)
upgrade:
  cost: 0
tags: [blight, power, scaling]
note: "Setup line 2.8 d per turn. +1 Rot per rotting enemy per turn = 3 d (stacked) on a single target, cumulative, so +3·T over the fight; in packs it multiplies ✓. Upgrade cost 0. It accelerates, it doesn't apply: a clean enemy gets nothing. That keeps it off Noxious Fumes' shape (Poison to all at turn start) and makes the opener Rot card matter."
```

---
## 4. Rares (12)

Payoffs and rule-breakers (commandment 15). Rule-breakers here: a Prune that pays per Prune this combat, Bloom that makes a card free, Rot straight to the cap, Bloom moved between copies, Shards turned into Bloom, Block from the Rot clock.

| id | Name | Type | Cost | Text (base → upgraded) | Arch |
|---|---|---|---|---|---|
| `heartwood_spear` | Heartwood Spear | attack | 2 | Bloom. Deal 10 (+5 per Bloom) damage. → (+6 per Bloom) | G |
| `death_cap` | Death Cap | attack | 2 | Deal 8 damage. If the enemy has Rot, apply 15 Rot. Scrap. → 12 | B |
| `reaping_vine` | Reaping Vine | attack | 2 | Prune. Deal 4 damage for each time you Pruned this combat. → 5 | C |
| `verdant_tide` | Verdant Tide | attack | 2 | Deal 3 damage once for each Bloom card in your deck. → 4 | M |
| `humus_rite` | Humus Rite | skill | 1 | Choose a Bloom card in your hand; it gains Bloom equal to the cards in your Scrapheap. Scrap. → cost 0 | C G |
| `crystal_graft` | Crystal Graft | skill | 0 | Keep. Playable only if you have a Shard. Lose 1 Shard: choose a Bloom card in your hand; it gains 3 Bloom. Scrap. → 4 Bloom | G C |
| `transplant` | Transplant | skill | 0 | Choose two Bloom cards in your hand. Move all Bloom from the first to the second, plus 2. Scrap. → plus 3 | G |
| `chitin_cocoon` | Chitin Cocoon | skill | 1 | Bloom. Gain 4 (+2 per Bloom) Block. → (+3 per Bloom) | B G |
| `quickening_sap` | Quickening Sap | power | 2 | Whenever a card in your hand gains Bloom, it costs 0 this turn. → cost 1 | G |
| `fungal_aegis` | Fungal Aegis | power | 2 | At the start of your turn, gain Block equal to the highest Rot among enemies. → cost 1 | B |
| `thresher` | Thresher | power | 2 | Bloom. Whenever you Prune, deal 3 (+1 per Bloom) damage to ALL enemies. → (+2 per Bloom) | C G |
| `hyphal_web` | Hyphal Web | power | 1 | At the start of your turn, draw 1 card (2 if you have 8+ Bloom cards in your deck). → Opening | M |

```card
id: heartwood_spear
name: Heartwood Spear
cls: graft
type: attack
rarity: rare
cost: 2
target: enemy
keywords: [bloom]
text: "Bloom. Deal {damage} ({damage_per} per Bloom) damage."
effects:
  - damage: { amount: { base: 10, per: 5, scale: { cardVar: bloom } }, target: target }
upgrade:
  effects:
    - damage: { amount: { base: 10, per: 6, scale: { cardVar: bloom } }, target: target }
tags: [gardener, bloom, scaling]
note: "Rare rate 20 for 2. Bloom 2: 10 + 10 = 20 ✓. Base 50%, Y = ½ base (GDD rare row). Cap 60 (70 upgraded) for 2 energy, 30–35 per energy. Same per-energy ceiling as Seed Bite+ (34), but per Prune it grows 5–6 against Seed Bite's 3, so it is the rare that makes 'feed this copy' a run plan. A boss reward that wants about 6 Prunes to dominate. This is Gardener's answer to the Act 3 burst check."
```

```card
id: death_cap
name: Death Cap
cls: graft
type: attack
rarity: rare
cost: 2
target: enemy
keywords: [exhaust]
text: "Deal {damage} damage. If the enemy has Rot, apply {rot} Rot. Scrap."
effects:
  - damage: { amount: 8, target: target }
  - conditional:
      if: { has_status: { who: target, id: rot, min: 1 } }
      then:
        - status: { target: target, id: rot, amount: 15, key: rot }
upgrade:
  effects:
    - damage: { amount: 12, target: target }
    - conditional:
        if: { has_status: { who: target, id: rot, min: 1 } }
        then:
          - status: { target: target, id: rot, amount: 15, key: rot }
tags: [blight, scaling]
note: "Budget 20 × 1.35 = 27, and +50% when its condition holds = 40. On Rot 4 (T = 3): 8 + 11 extra Rot × 3 = 41 ✓. Applying 15 means 'to the cap': the excess is lost (GDD §2.6), and with Mycelial Net it reaches 20. Upgrade +4 (+10% total, +50% on the hit). Rare rule-break: the clock jumps to its end state. Still capped, so commandment 10's Act 3 race boss (GDD §8.3) still beats a Rot-only deck: 15 per turn over 6 turns is 90 HP of ~450."
```

```card
id: reaping_vine
name: Reaping Vine
cls: graft
type: attack
rarity: rare
cost: 2
target: enemy
keywords: []
text: "Prune. Deal {damage} damage for each time you Pruned this combat ({times})."
effects:
  - prune: { bloom: 1, variant: standard }
  - damage: { amount: 4, times: { fn: prunes_this_combat }, target: target }   # §6 fn 2; reads combat.counters.prunes after the Prune above
upgrade:
  effects:
    - prune: { bloom: 1, variant: standard }
    - damage: { amount: 5, times: { fn: prunes_this_combat }, target: target }
tags: [compost, prune, scaling, multihit]
note: "Rate 20. Mid-fight a Prune deck has about 4 Prunes (including this one): Prune 3 + 4 × 4 = 19 ✓. Late fight (8): 35. Upgrade +1 per hit (+25%). Only Prunes that Scrapped a card count (GDD §2.5 step 2), so declining the Scrap here costs a hit. Multi-hit, so Exposed scales it. C19: no STS card counts exhaust events this combat as hits."
```

```card
id: verdant_tide
name: Verdant Tide
cls: graft
type: attack
rarity: rare
cost: 2
target: enemy
keywords: []
text: "Deal {damage} damage once for each Bloom card in your deck ({times})."
effects:
  - damage: { amount: 3, times: { base: 0, per: 1, scale: bloom_cards_in_deck }, target: target }
upgrade:
  effects:
    - damage: { amount: 4, times: { base: 0, per: 1, scale: bloom_cards_in_deck }, target: target }
tags: [mass, scaling, multihit]
note: "Rate 20. Rares arrive in acts 2–3 (4–6 Bloom cards): 12–18. A Mass deck (8–13) gets 24–39, and Exposed adds that many again. Upgrade +1 per hit (+33%). Mass's finisher. Each Propagate is +3 here. C19: Flechettes counts Skills in hand. Ours counts permanent deck composition, so it is planned at the reward screen, not in the hand."
```

```card
id: humus_rite
name: Humus Rite
cls: graft
type: skill
rarity: rare
cost: 1
target: self
keywords: [exhaust]
text: "Choose a Bloom card in your hand; it gains Bloom equal to the cards in your Scrapheap ({bloom}). Scrap."
effects:
  - bloom: { amount: { base: 0, per: 1, scale: cards_in_exhaust }, target: choose_hand, key: bloom }
upgrade:
  cost: 0
tags: [compost, gardener, bloom]
note: "Budget 10 × 1.5 (Scrap, want once) = 15. At Scrapheap 4: +4 Bloom (4 × 3 d) = 12 ✓; at 6 it is 18. It resolves before its own Scrap, so it doesn't count itself. Capped by the copy's Bloom cap (10, Elder Seed 15). Upgrade cost 0 (+1 energy). The Compost→Gardener cash-out: a fight's thinning becomes permanent growth on one copy."
```

```card
id: crystal_graft
name: Crystal Graft
cls: graft
type: skill
rarity: rare
cost: 0
target: self
keywords: [retain, exhaust]
text: "Keep. Playable only if you have a Shard. Lose 1 Shard: choose a Bloom card in your hand; it gains {bloom} Bloom. Scrap."
hooks:
  canPlay: "shards >= 1 AND at least one non-capped Bloom card in hand, else reason 'Needs a Shard and a Bloom card'"   # §6 hook (not an effect custom)
effects:
  - shards: { amount: -1 }
  - bloom: { amount: 3, target: choose_hand, key: bloom }
upgrade:
  effects:
    - shards: { amount: -1 }
    - bloom: { amount: 4, target: choose_hand, key: bloom }
tags: [gardener, compost, shards, bloom]
note: "Combat budget 0.5 × 10 × 1.35 = 6.75 d, plus the run cost of 1 Shard (half a Purge ≈ 5 d). Returns +3 permanent Bloom (9 d) ✓. Upgrade +1 Bloom (+33%). A new Shard sink in combat: Shards become growth instead of removal, which is the Gardener's version of the Compost skip discipline. Keep (budget 2 of 3) lets it wait for the right copy. Shard card 2 of 2."
```

```card
id: transplant
name: Transplant
cls: graft
type: skill
rarity: rare
cost: 0
target: self
keywords: [exhaust]
text: "Choose two Bloom cards in your hand. Move all Bloom from the first to the second, plus {n}. Scrap."
values: { n: 2, n_up: 3 }
hooks:
  canPlay: "at least two Bloom cards in hand, else reason 'Needs two Bloom cards'"   # §6 hook (not an effect custom)
effects:
  - custom: { fn: transplant_bloom }   # §6 custom 3: pick source, then destination (both Bloom, in hand, distinct); bonus = upgraded ? values.n_up : values.n; dest.bloom = min(cap, dest + src + bonus); src.bloom = 0
upgrade:
  text: "Choose two Bloom cards in your hand. Move all Bloom from the first to the second, plus {n_up}. Scrap."
tags: [gardener, bloom]
note: "Combat budget 6.75 d. +2 Bloom (6 d) ✓, and the move itself is free reshaping. Upgrade +1 (+50%). The rule-breaker is that Bloom normally never leaves its copy. Uses: move a grown un-upgraded Seed Bite into an upgraded one (+1 per Bloom forever), move Bloom off a card you plan to Prune away or Transmute, or consolidate onto Heartwood Spear. Any excess over the cap is lost; the picker warns. With fewer than 2 Bloom cards in hand it is unplayable (canPlay)."
```

```card
id: chitin_cocoon
name: Chitin Cocoon
cls: graft
type: skill
rarity: rare
cost: 1
target: self
keywords: [bloom, retain]
text: "Bloom. Keep. Gain {block} ({block_per} per Bloom) Block."
effects:
  - block: { amount: { base: 4, per: 2, scale: { cardVar: bloom } } }
upgrade:
  effects:
    - block: { amount: { base: 4, per: 3, scale: { cardVar: bloom } } }
tags: [blight, gardener, bloom, block]
note: "Rare 8 b, Keep −10% → 7.2. Bloom 2: 8 b (+11%, rare allowance). Base 55%. Cap 24 (34 upgraded) for 1 energy. Keep (budget 3 of 3) is what makes it rare: hold it for the turn the intent shows the big hit, and it sits in hand for Prunes meanwhile. Blight's turtle card."
```

```card
id: quickening_sap
name: Quickening Sap
cls: graft
type: power
rarity: rare
cost: 2
target: self
keywords: []
text: "Whenever a card in your hand gains Bloom, it costs 0 this turn."
effects:
  - status: { target: self, id: quickening_sap, amount: 1 }
status_def:
  id: quickening_sap
  stacks: flag
  decay: never
  tick: never
  isDebuff: false
  text: "Whenever a card in your hand gains Bloom, it costs 0 this turn."
  triggers:
    onBloomGained:                               # [ask] GDD §9 item 10
      - custom: { fn: quickening_free }          # §6 custom 4: if info.card is in hand, set costThisTurn = 0 (subject to cap_cost_reduction)
upgrade:
  cost: 1
tags: [gardener, bloom, power, energy]
note: "2-cost setup: 6.7 d per turn. About 1 Prune per turn lands on a 1–2 cost Bloom card, saving about 1.3 energy ≈ 9 d per turn ✓ (strong, rare). Upgrade cost 1. Bounds: `cap_cost_reduction` (each instance below printed cost once per turn), and it only fires on growth in hand. The chain Pollen Sting → free card → another Pollen Sting is capped by hand size and copies. That loop needs this rare plus an uncommon (Pollen Sting), with no energy gain (commandment 17). Stacks as a flag."
```

```card
id: fungal_aegis
name: Fungal Aegis
cls: graft
type: power
rarity: rare
cost: 2
target: self
keywords: []
text: "At the start of your turn, gain Block equal to the highest Rot among enemies."
effects:
  - status: { target: self, id: fungal_aegis, amount: 1 }
status_def:
  id: fungal_aegis
  stacks: amount
  decay: never
  tick: never
  isDebuff: false
  text: "At the start of your turn, gain Block equal to the highest Rot among enemies ({stacks}×)."
  triggers:
    onTurnStart:
      - repeat: { times: { scale: stacks }, effects: [ { block: { amount: { fn: max_enemy_rot } } } ] }   # §6 fn 1
upgrade:
  cost: 1
tags: [blight, block, power, scaling]
note: "2-cost setup: 6.7 d ≈ 5.7 b per turn. Average Rot over a Blight fight ≈ 7 → 7 b per turn ✓. Late fight at cap: 15 b per turn. Upgrade cost 1. This is the stall that lets the clock run. Commandment 9 still holds: Rot is capped, so a clock boss that outscales 15 Block per turn beats it. If the top-Rot enemy dies, Rot spreads, so the Block rarely drops to 0."
```

```card
id: thresher
name: Thresher
cls: graft
type: power
rarity: rare
cost: 2
target: self
keywords: [bloom]
text: "Bloom. Whenever you Prune, deal {status} ({status_per} per Bloom) damage to ALL enemies."
effects:
  - status: { target: self, id: thresher, amount: { base: 3, per: 1, scale: { cardVar: bloom } } }
status_def:
  id: thresher
  stacks: amount
  decay: never
  tick: never
  isDebuff: false
  text: "Whenever you Prune, deal {stacks} damage to ALL enemies."
  triggers:
    onPrune:                                     # [ask] GDD §9 item 10
      - damage: { amount: { scale: stacks }, target: all_enemies }
upgrade:
  effects:
    - status: { target: self, id: thresher, amount: { base: 3, per: 2, scale: { cardVar: bloom } } }
tags: [compost, gardener, bloom, prune, power, aoe]
note: "2-cost setup: 6.7 d per turn. Bloom 2 → 5 AoE per Prune; at about 1.2 Prunes per turn = 6 hits of AoE ≈ 7.5 d (AoE ×1.25) ✓. Base 60%. Cap 13 (23 upgraded) per Prune. It snapshots Bloom on play, so feed it before playing (the same 'hold or play' question as Thorn Halo). This is Compost's pack answer. C19: Juggernaut deals damage on Block gain. Ours is on Prune, hits all enemies and grows with Bloom."
```

```card
id: hyphal_web
name: Hyphal Web
cls: graft
type: power
rarity: rare
cost: 1
target: self
keywords: []
text: "At the start of your turn, draw 1 card (2 if you have 8+ Bloom cards in your deck)."
effects:
  - status: { target: self, id: hyphal_web, amount: 1 }
status_def:
  id: hyphal_web
  stacks: amount
  decay: never
  tick: never
  isDebuff: false
  text: "At the start of your turn, draw {stacks} card(s), twice that with 8+ Bloom cards in your deck."
  triggers:
    onTurnStart:
      - conditional:
          if: { compare: { left: { base: 0, per: 1, scale: bloom_cards_in_deck }, op: '>=', right: 8 } }
          then: [ { draw: { n: { base: 0, per: 2, scale: stacks } } } ]
          else: [ { draw: { n: { scale: stacks } } } ]
upgrade:
  keywords: [innate]
tags: [mass, draw, power]
note: "1-cost setup: 3.3 d per turn. Draw 1 = 3 d ✓. With 8+ Bloom cards, 6 d per turn (the Mass payoff). Upgrade: Opening (budget 1 of 2), so turn 1 has it. Mass's answer to its own dilution. The draw happens at turn start step 4, before the 5-card draw, and counts toward `cap_draw`."
```

---
## 5. Archetype matrix

**G** Gardener: Bloom growth and Bloom payoffs. **B** Blight: Rot application, Rot acceleration and spread payoffs, and stall. **C** Compost: Prune/Scrap payoffs, `onPrune` Powers, in-fight thinning, Prune away. **M** Mass: deck-count scaling that wants a wider deck. The first letter in each row is the card's primary archetype.

| Card | Rarity | G | B | C | M |
|---|---|:-:|:-:|:-:|:-:|
| seed_bite | S | ● | | | |
| graft_hide | S | ● | | ○ | |
| thornwhirl | C | ● | | | |
| barb_flick | C | ● | | | ○ |
| grafting_cut | C | ● | | ○ | |
| chitin_ram | C | ● | ○ | | |
| hivestrike | C | ○ | | | ● |
| shear | C | ○ | | ● | |
| spore_lash | C | | ● | | |
| canker_bite | C | | ● | | |
| mulch_maul | C | | | ● | |
| sap_shell | C | ● | ○ | | |
| blightcap | C | ● | ○ | | |
| tendril_reach | C | ● | | | ○ |
| root_mesh | C | | ○ | | ● |
| deep_graft | C | ● | | ○ | |
| windblown_seed | C | ● | | | ○ |
| spore_haze | C | | ● | ○ | |
| mire_carapace | C | | ● | | |
| shed_husk | C | ○ | | ● | |
| sap_drip | C | ● | | | |
| leaf_litter | C | | ● | ○ | |
| twin_thorn | U | ● | | | |
| canopy_crush | U | ○ | | | ● |
| miasma_sweep | U | ○ | ● | | |
| uproot | U | ○ | | ● | |
| prism_thorn | U | | | ● | |
| pollen_sting | U | ● | | | |
| thicket_crash | U | | | | ● |
| patient_thorn | U | ● | | | |
| burl_wall | U | ● | ○ | | |
| choking_spores | U | | ● | | |
| excise | U | | | ● | |
| propagate | U | ○ | | | ● |
| seed_rain | U | ● | | | ○ |
| puffball | U | ● | ○ | | |
| sporeburst | U | | ● | | |
| decomposer | U | | ○ | ● | |
| dusk_pruning | U | ● | | ○ | |
| living_hedge | U | | ○ | | ● |
| thorn_halo | U | ● | | | |
| ripening_rot | U | | ● | | |
| heartwood_spear | R | ● | | | |
| death_cap | R | | ● | | |
| reaping_vine | R | | | ● | |
| verdant_tide | R | | | | ● |
| humus_rite | R | ○ | | ● | |
| crystal_graft | R | ● | | ○ | |
| transplant | R | ● | | | |
| chitin_cocoon | R | ○ | ● | | |
| quickening_sap | R | ● | | | |
| fungal_aegis | R | | ● | | |
| thresher | R | ○ | | ● | |
| hyphal_web | R | | | | ● |

(`lash` and `husk` belong to no archetype.)

**Counts (● primary + ○ secondary = total)**

| Archetype | Starter | Common | Uncommon | Rare | Primary | Total (≥10 required) |
|---|---|---|---|---|---|---|
| Gardener | 2 | 13 | 12 | 7 | 24 | **34** |
| Blight | 0 | 9 | 8 | 3 | 12 | **20** |
| Compost | 1 | 7 | 5 | 4 | 10 | **17** |
| Mass | 0 | 5 | 5 | 2 | 8 | **12** |

- **Commons fitting two archetypes: 14 / 20 (70%)**: barb_flick, grafting_cut, chitin_ram, hivestrike, shear, sap_shell, blightcap, tendril_reach, root_mesh, deep_graft, windblown_seed, spore_haze, shed_husk, leaf_litter.
- Gardener is the class's spine (Bloom is the class mechanic). The other three are the directions a run takes from it. **Compost ↔ Mass** is the deliberate tension. Prune away, removals and skipping for Shards (Excise, Uproot, Prism Thorn, Crystal Graft) lower Hivestrike, Root Mesh, Canopy Crush, Thicket Crash and Verdant Tide. Propagate and taking every Bloom card raise them. In-combat Scrap is neutral, because Scrapped cards are still "in your deck" (GDD §0.1). That neutrality is the glue that lets a run pivot between the two.
- Bridges: Blightcap / Puffball / Miasma Sweep (G↔B), Decomposer / Leaf Litter / Spore Haze (C↔B), Humus Rite / Thresher / Dusk Pruning (C↔G), Seed Rain / Windblown Seed / Propagate (G↔M), Root Mesh / Living Hedge (M↔B).

## 6. Histograms and budgets

**Rarity × type**

| | Attack | Skill | Power | Total |
|---|---|---|---|---|
| Starter | 2 | 2 | 0 | 4 |
| Common | 9 | 11 | 0 | 20 |
| Uncommon | 8 | 7 | 5 | 20 |
| Rare | 4 | 4 | 4 | 12 |
| **Total** | **23 (41%)** | **24 (43%)** | **9 (16%)** | **56** |

**Cost curve**

| Cost | Starter | Common | Uncommon | Rare | Total |
|---|---|---|---|---|---|
| 0 | 0 | 2 | 0 | 2 | 4 |
| 1 | 4 | 16 | 12 | 3 | 35 |
| 2 | 0 | 2 | 7 | 7 | 16 |
| 3 | 0 | 0 | 1 | 0 | 1 |
| X | 0 | 0 | 0 | 0 | 0 |

**Mechanic budgets**

| Item | Count | Cards |
|---|---|---|
| Bloom cards (target 18–22) | **18** (S 1 · C 7 · U 7 · R 3) | seed_bite · thornwhirl, barb_flick, grafting_cut, chitin_ram, sap_shell, blightcap, tendril_reach · twin_thorn, miasma_sweep, pollen_sting, patient_thorn, burl_wall, puffball, thorn_halo · heartwood_spear, chitin_cocoon, thresher |
| Prune variants (target 12–15) | **12** | standard: graft_hide, grafting_cut, shed_husk, leaf_litter, dusk_pruning, reaping_vine · rider: shear · Prune 2: deep_graft · Wild: windblown_seed · Spread: seed_rain · Prune away (uncommon, Scrap): uproot, excise |
| Other explicit Bloom gain | 5 | sap_drip, pollen_sting, humus_rite, crystal_graft, transplant (all grow **another** copy) |
| Scrap (`exhaust`) | 10 | spore_haze, sap_drip, uproot, excise, propagate, puffball, death_cap, humus_rite, crystal_graft, transplant |
| Keep (≤3) | 3 | patient_thorn, crystal_graft, chitin_cocoon |
| Opening (≤2) | 1 | hyphal_web (upgraded only) |
| Ethereal | 0 | — |
| Shards / run interaction (2–3) | 2 Shard cards + 3 run-deck surgery | prism_thorn, crystal_graft · uproot, excise (Prune away), propagate (adds to the run deck) |
| Engine asks used | — | `bloom`, `prune` (all variants + `bonusIf`), `duplicate_card`, `shards`; scales `bloom_cards_in_deck`, `bloom_total_in_deck`, `shards`, `deck_size` **[new]**; condition `pruned_type`; hooks `onPrune`, `onBloomGained`. `bloom_max_in_deck` is deliberately unused: the tall Gardener's payoff is the grown copy itself, and a second card scaling on the same number would double-dip. |

**GDD §3 commons rule**: no common gains energy, returns a card to hand or reduces a cost. **Commandment 17 (loops)**: the only cost-reduction source is Quickening Sap (rare), bounded by `cap_cost_reduction` (once per instance per turn). Its best chain needs Pollen Sting (uncommon) and grows Bloom, not energy or cards. No card in the pool gains energy, and none returns cards to hand. Draw comes from Tendril Reach, Sap Drip, Shed Husk, Excise+ and Hyphal Web, all of which Scrap, are capped or are once per turn.

## 7. `custom` and `fn` list (5; limit 5) plus 2 `canPlay` hooks

| # | Kind | Name | Card | Behaviour (unit-test this) |
|---|---|---|---|---|
| 1 | amount `fn` | `max_enemy_rot` | fungal_aegis | Highest `rot` stacks among living enemies. 0 when no living enemy has Rot (a real value, not a sentinel: no Rot means no Block). |
| 2 | amount `fn` | `prunes_this_combat` | reaping_vine | `combat.counters.prunes` (GDD §2.5: +1 only when a Prune actually Scrapped a card). Throws outside combat. Could become a GDD §9 scale. |
| 3 | `custom` | `transplant_bloom` | transplant | pendingChoice 1: source Bloom card in hand. pendingChoice 2: a different Bloom card in hand. `bonus = upgraded ? values.n_up : values.n`. `dest.vars.bloom = min(bloomCap, dest + src + bonus)` (excess lost, event `bloom`). `src.vars.bloom = 0`. Emits `bloom {uid, delta, now}` for both, so `onBloomGained` fires for the destination only (delta > 0). |
| 4 | `custom` | `quickening_free` | quickening_sap | On `onBloomGained {card, delta > 0}`: if `card` is in hand, set its cost to 0 for this turn (`costThisTurn = 0`), subject to `cap_cost_reduction`. Does nothing for cards in other piles. |
| 5 | `custom` | `ripen_rotting_enemies` | ripening_rot | For each living enemy with `rot ≥ 1`: `applyStatus(enemy, rot, stacks)` (cap 15 / Mycelial Net 20). Enemies with no Rot get nothing. |
| — | `canPlay` hook | — | crystal_graft | Playable iff `shards ≥ 1` and a non-capped Bloom card is in hand. Reason string otherwise. |
| — | `canPlay` hook | — | transplant | Playable iff at least 2 Bloom cards are in hand. |

## 8. Example decks and throughput (vs GDD §8.2)

**Model** (the same for every deck; the simulator replaces it):
- Turns per cycle `L = deck size / 5`, shortened to `L_eff` by in-fight Scrap (stated per deck).
- Offence energy = **2.5 per turn** (the rest is defence), plus stated extras.
- Engine cards (Rot appliers, Powers amortised over a 9-turn boss) are paid first. Then Attacks in descending damage per energy until the energy is used.
- Direct damage/turn = Σ (Attack damage played per cycle) / `L_eff`, plus Power damage per turn.
- **Rot** = total ticks on a single boss over a **9-turn** fight from the application schedule (GDD §2.6: lose HP = Rot at the end of the enemy's turn, then +1, cap 15), divided by 9.
- Bloom values are the deck copies' expected Bloom at that floor (GDD §8.3: Seed Bite ≈ 5 at floor 15 and ≈ 10 at floor 30 in a Prune deck).

### D1 — Floor 15 (Act 1 boss), Gardener, 16 cards
Lash ×3, Husk ×2, Seed Bite+ ✿5, Graft Hide, Grafting Cut ✿2, Thornwhirl ✿2, Shear, Deep Graft, Sap Shell ✿2, Tendril Reach ✿1, Blightcap ✿1, Twin Thorn ✿1, Windblown Seed.
- `L` 3.2 → `L_eff` 2.8 (about 3 Lash/Husk Pruned by mid-fight). Offence 2.5 × 2.8 = 7.0 per cycle.
- Engine: Blightcap 2. Attacks with the remaining 5: Seed Bite+ 4 + 15 = 19 (1e), Twin Thorn 7 × 2 = 14 (2e), Thornwhirl 7 + 4 = 11 (2e) = 44 → 44 / 2.8 = 15.7. In-fight growth: about 1.5 Prunes per cycle, half on Seed Bite+ (+3 each) → +0.8 per turn. **Direct ≈ 16.5.**
- Rot: Blightcap Rot 3 on turns 2, 5, 8 → ticks 3, 4, 5, 9, 10, 11, 15, 15 = 72 → **+8.0**.
- **16.5 (+8.0) vs target 18 (+8)**: direct −8%, Rot on target.

### D2 — Floor 30 (Act 2 boss), Blight stall, 22 cards
Lash ×2, Husk, Seed Bite ✿7, Graft Hide, Spore Lash+, Spore Haze, Blightcap+ ✿3, Canker Bite ×2, Mire Carapace ×2, Sap Shell ✿3, Root Mesh, Leaf Litter, Choking Spores, Sporeburst, Ripening Rot, Burl Wall ✿2, Miasma Sweep ✿1, Death Cap, Fungal Aegis.
- `L` 4.4 → `L_eff` 3.8. Fungal Aegis covers most defence from turn 4, so offence rises to **3.0** per turn → 11.4 per cycle.
- Engine ≈ 6.2 per cycle (Blightcap+ 2, Leaf Litter 1, Choking Spores 1, Ripening Rot and Fungal Aegis amortised 1.2, Spore Lash+ 1). The remaining 5.2 go to Seed Bite 4 + 14 = 18, Sporeburst ≈ 12 (Rot avg 12), Canker Bite 3 + 11 = 14 ×2, and 1.2 energy of Death Cap ≈ 5 → 63 / 3.8 = **16.6 direct**.
- Rot: Spore Lash+ Rot 2 on turn 1, Blightcap+ Rot 8 on turn 2, Ripening Rot from turn 3 → ticks 2, 11, 13, 15 × 6 = 116 → **+12.9**. Block ≈ 15 (Aegis at cap) + 5 = 20 vs target 20.
- **16.6 (+12.9) vs target 26 (+12)**: Rot on target, direct −36%, total −22%. **Flag**: pure Blight is the slowest single-target build. This is intended by GDD §8.3 ("a Rot-only deck must lose to a 6-turn Act 3 clock boss"), and it is paid back in packs: Spore Haze + Choking Spores + Leaf Litter + Miasma Sweep put ≈ 8 Rot on every enemy by turn 2, about +25–30 Rot per turn across a 3-enemy Act 2 normal. If the sim shows Act 2 boss win rate < 50% for Blight decks, the lever is Sporeburst+ → cost 0, not more Rot.

### D3 — Floor 30 (Act 2 boss), Compost, 16 cards
Lash, Husk ×2, Seed Bite+ ✿10, Graft Hide, Grafting Cut ✿4, Shear, Deep Graft, Uproot, Excise, Mulch Maul, Decomposer, Thresher ✿2, Dusk Pruning, Twin Thorn ✿3, Shed Husk. (4 Lash and 2 Husk removed by Purge, shop and Prune away.)
- `L` 3.2 → `L_eff` 2.4 (≈ 2 Prunes per turn from turn 2). Offence 2.5 × 2.4 = 6.0 per cycle. Powers 4 energy once ≈ 1.1 per cycle → 4.9 for Attacks: Seed Bite+ 4 + 30 = 34 (1e), Twin Thorn 11 × 2 = 22 (2e), Mulch Maul 4 + 5 = 9 (1e), 0.9 × Grafting Cut 6 → 70.4 / 2.4 = 29.3. Thresher 5 AoE × 2 Prunes per turn from turn 3 = 7.8 per turn. **Direct ≈ 37.**
- Rot: Decomposer Rot 1 per Prune (2 per turn from turn 3, all on the lone boss) → ticks 2, 5, 8, 11, 14, 15, 15 = 70 → **+7.8**.
- **37 (+7.8) vs target 26 (+12)**: total 45 vs 38 (+18%). **Watch**: the thin deck with a capped Seed Bite+ is the expected top Graft deck. That is the class fantasy (GDD §1.3), but it hinges on one copy at cap: Heartseed delivers it every fight. The sim must check this deck's Act 2 boss win rate against the §8.4 spread.

### D4 — Floor 45 (Act 3), Mass, 30 cards
13 Bloom cards (Seed Bite ✿6 + a Propagated copy ✿0, Barb Flick ✿1 / ✿0, Sap Shell ✿3, Tendril Reach ✿2 / ✿1, Thornwhirl ✿2, Chitin Ram ✿1, Pollen Sting ✿2, Burl Wall ✿2, Patient Thorn ✿3, Blightcap+ ✿2; total Bloom 25) + Hivestrike ×2, Root Mesh ×2, Windblown Seed, Seed Rain, Canopy Crush, Thicket Crash+, Propagate, Living Hedge, Verdant Tide, Hyphal Web, Lash ×2, Husk, Graft Hide, Shear.
- `L` 6 → Hyphal Web draws 2 per turn (8+ Bloom cards) → ≈ 7 cards per turn → `L_eff` 4.1. Living Hedge gives 13 Block per turn, so offence is **2.8** per turn → 11.5 per cycle. Powers amortised 1.4 and Blightcap 2 → 8.1 for Attacks: Verdant Tide 3 × 13 = 39 (2e), Canopy Crush 4 + 25 = 29 (2e), Hivestrike 3 + 13 = 16 ×2 (2e), Seed Bite 16 (1e), Barb Flicks 5 (0e), Patient Thorn 10 (1e) → 131 / 4.1 = **32.0 direct** (Thicket Crash+ 30 AoE is the pack card).
- Rot: Blightcap+ Rot 6 on turns 2 and 6 → ticks 6, 7, 8, 9, 15, 15, 15, 15 = 90 → **+10**. Block ≈ 13 + Root Mesh 15 ≈ 28 vs target 28.
- **32 (+10) vs target 35 (+20, spread)**: direct −9%. Rot under, since Mass is not a Rot plan. **Watch**: Hivestrike reaches 16 for 1 energy at 13 Bloom cards (2.3× common rate). That is the build-around ceiling, and it needs 13 of 30 cards to be Bloom cards. If the sim shows it over-performing outside Mass, the lever is cost 2 with base 6 (it already has the minimum `per` of 1).

### D5 — Floor 45 (Act 3), Gardener–Blight, 24 cards
Seed Bite+ ✿10, Heartwood Spear ✿6, Twin Thorn+ ✿5, Blightcap+ ✿6, Puffball ✿2, Death Cap, Canker Bite, Pollen Sting ✿2, Grafting Cut ✿3, Deep Graft, Graft Hide, Dusk Pruning, Quickening Sap, Sap Shell ✿5, Burl Wall ✿4, Chitin Cocoon ✿3, Husk ×2, Lash, Spore Lash, Mire Carapace, Leaf Litter, Shed Husk, Ripening Rot.
- `L` 4.8 → `L_eff` 4.2. Offence 2.5 × 4.2 = 10.5, plus Quickening Sap ≈ 1 free card per turn from turn 3 (+3.3 per cycle) = 13.8. Engine: Blightcap+ 2, Powers amortised 1.9 → 9.9 for Attacks: Seed Bite+ 34 (1e), Heartwood Spear 10 + 30 = 40 (2e), Twin Thorn+ 20 × 2 = 40 (2e), Canker Bite 3 + 14 = 17, Pollen Sting 5, Grafting Cut 5, Lash 6 (1e each), 0.45 × Death Cap 8 → 150.6 / 4.2 = **35.9 direct**.
- Rot: Spore Lash Rot 1 on turn 1, Blightcap+ Rot 14 on turn 2 → ticks 1, 15 × 8 = 121 → **+13.4** single target. Puffball and Leaf Litter add the "spread" share in packs.
- **36 (+13.4) vs target 35 (+20, spread)**: direct +3%. Single-target Rot is capped at 15, which is the commandment 10 ceiling. The +20 in the target is reached only in packs.

**Summary**: Gardener, Compost and Gardener–Blight meet or exceed the §8.2 direct targets. Pure Blight and pure Mass are under on single-target totals by design (Blight wins packs and stalls; Mass trades Rot for Block and width). Compost at floor 30 is the one to watch.

## 9. GDD ambiguities I hit, and my interpretation

1. **Pricing gaps in §8.5**: no AoE row, no Spread Prune row, no price for "a card gains N Bloom" without Prune, and no rule for first vs stacked Rot. My calls are in §0.3 (AoE face 0.8 × rate, Spread Prune 5 d, +1 Bloom 3 d, Rot priced at the mean of first and stacked).
2. **Deck-count expectations** exist only for Bloom cards (2 / 4 / 6). I assumed total Bloom 5 / 12 / 20, deck size 16 / 22 / 27, 2 Shards held, Scrapheap 3, Rot at play 4–6 (§0.3 call 5).
3. **`onPrune` with Prune away and declined Prunes**: §2.5 step 2 fires `onPrune` only when a card was Scrapped. I treat Prune away as a Prune (it fires `onPrune` and counts in `prunes`). A declined Prune fires nothing (Thresher, Decomposer and Reaping Vine get nothing).
4. **Spread Prune and hooks**: one `onPrune` event (one Scrap), but one `onBloomGained` per card that gained Bloom. So Quickening Sap can make several cards free from one Spread Prune, still once per instance per turn.
5. **Bloom Powers** (Thorn Halo, Thresher): the status stacks snapshot the card's damage value when played. Later growth of that copy affects the next combat, not the running Power. Two copies add.
6. **"Never by being played"** (§2.4): no card grows itself. Sap Drip, Pollen Sting, Humus Rite, Crystal Graft and Transplant grow **another** copy through an explicit "gains N Bloom" effect, which §2.4 lists as a legal source.
7. **Transplant removing Bloom**: §2.4 says enemy and curse effects "may remove it". I read player-chosen removal (a move to another copy) as legal, because the Bloom isn't destroyed. The excess over the cap is lost, as with any gain.
8. **Propagate** (`duplicate_card {to: deck}` mid-combat): the copy joins the run deck at once at Bloom 0, counts immediately for every "in your deck" scale, and is in no combat pile until next combat. The §2.4 rule that created cards lose Bloom at combat end doesn't apply, because this copy is a permanent deck card.
9. **Death Cap's "apply 15 Rot"** relies on the §2.6 rule that applications beyond the cap are lost. With Mycelial Net it adds 15 up to 20. I chose this over a "raise to cap" primitive.
10. **Hook-raised choices**: Dusk Pruning raises Prune's pendingChoice inside `onTurnEnd`. `HookCtx.now` throws on choices, so the trigger must `queue`. **[engine ask]**.
11. **Text for scaled amounts**: GDD §2.4 shows "4 (+2 per Bloom)", but `text.ts` has no `per` placeholder. **[ask]** `<key>_per` placeholders, so no digit is hand-typed.
12. **Display keyword `prune`** (§9.6) vs the brief's keyword list: kept out of `keywords` and put in `tags`. The implementer adds it wherever a `prune` effect exists.
13. **`pruned_type` with two types** (Shed Husk: Status or Curse): written as `any: [pruned_type status, pruned_type curse]`, not as a list inside one condition.
14. **`deck_size`** (Thicket Crash) is not in GDD §9's scale list. It counts the run deck per §0.1 (Scrapheap and Timeline included), so in-combat Prune away lowers it immediately and Scrap does not.
15. **Shards spent in combat** (Crystal Graft) use `shards {amount: -1}`. §2.12 defines the effect with an amount, and I read negative amounts as allowed (a new sink beside §4.5).
16. **Graft and Guard**: §2.3 scopes Guard to the Breaker, colourless cards and relics, so no Graft card grants Guard. Graft defence is Block, Stagger and Rot-scaled Block.
