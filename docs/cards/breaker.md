# The Breaker — class card pool (56)

Status: v1, card designer (Breaker). Source of truth for the Breaker's 56 class cards: 4 starters (verbatim from `docs/GDD.md` §4.1) + 20 common + 20 uncommon + 12 rare. Rules, terms and pricing come from `docs/GDD.md` (§0, §2, §3, §8.5) and `docs/ENGINE_SPEC.md` §6–§8; where a card needs something those documents do not define, it is listed in §D (engine asks) and §F (ambiguities). Enemy questions referenced in notes are from `docs/ENEMIES.md`.

## 0. Conventions used in this file

### 0.1 Pricing unit (commandment 1)
All notes price cards in **d** (common damage-equivalents, GDD §8.5).

| Item | Value used |
|---|---|
| Rate per energy | common **7**, uncommon **8.5** (8–9), rare **10**; a 0-cost card = half (3.5 / 4.25 / 5); X = X × rate × 1.1 |
| Block 1 | 1.2 d (common Block rate 6 = 7 d; uncommon 7 ≈ 8.5 d; rare 8 = 10 d) |
| Guard 1 | 1.0 d (RULINGS 3: the §8.5 rate table wins, Guard 7 / 8 / 10 per energy) |
| Draw 1 | 3 d · Energy 1: 7 d |
| Exposed 1 | 3 d (4 d on multi-hit cards) |
| Stagger 1 | 2 Block-eq = 2.4 d (3 Block-eq = 3.6 d against a multi-hit attack) |
| "+Y per Onslaught" | 1.5 Y (normal cards), 3 Y on finishers (cost ≥ 2 or "Spend") |
| Gain N Onslaught | 2 N d mid-turn; **3 N d when gained before your turn starts** (start-of-turn or enemy-phase Onslaught boosts every +per card that turn; see §F.6) |
| Spend N Onslaught: X | X must add ≥ 2 N d; the card's "spent" value is (value with clause − 2 N) |
| AoE ("ALL enemies") | RULINGS 15/29: the per-target number may be 0.8 × the single-target rate (≈ 2 targets × 0.8 = 1.6 targets' worth); equivalently AoE face is valued at 1.25 × per target |
| Riposte effect | 1.0–1.3 × the card's played value; `trigger_hits` priced at 2 hits |
| Conditional rider | rider × estimated probability (stated in the note) |
| Scrap / Keep / Opening | +35% (+50% if one use is all you want) / −10% / −10% |
| Power | per-turn value × 3 ≈ cost × rate |
| Expected Onslaught when a +per card is played | 1.0 (floor 1), 1.5 (15), 2.5 (30), 3.5 (45) — GDD §8.3 |

### 0.2 Machine-block conventions
- One ` ```card ` block per card, YAML. It maps 1:1 onto `CardDef` (`src/engine/types.ts`). `icon` is omitted: use `card_<id>`.
- Effects are written `- <type>: { ...fields }` (engine form `{ type: '<type>', ...fields }`). Conditions are written in engine form (`{ type: has_status, who: self, id: onslaught, min: 2 }`).
- `target` inside effects: `target` (the card's chosen enemy), `self`, `all_enemies`, and **`attacker`** in `riposte` lists (GDD §2.2: "its riposte effects run with target = the attacker").
- Amounts: a number, or `{ base, per, scale }` exactly as `ScaledAmount`. Scales used: `{ status: onslaught }`, `spent` (from `spend_status`), `trigger_hits`, `shards`, `defence` (Block + Guard, GDD §2.3), `guard` (Guard only). `resolveAmount` floors, so `per: 0.5` means "+1 per 2".
- `spend_status { id, n: <int> | all, effects }`: if the stat is ≥ n, lose n and run `effects`, else skip. **`n: all` always runs** and exposes `spent` (which may be 0) — see §F.2. Where a card says "… instead", it is a `conditional` on `has_status … min: n` whose `then` holds the `spend_status`, so the card always makes exactly one hit.
- `upgrade` lists only the fields that change. A changed `effects` or `riposte` list is given **in full** (it replaces the base list, as `CardDef.upgrade` does today; `riposte` in `upgrade` is an engine ask, §D).
- **Text placeholders** (as `src/engine/text.ts`): `{damage}`, `{block}`, `{status}`, `{draw}`, `{energy}`, `{times}`, suffixed `2`, `3`… for repeats, plus `{guard}` for the new `guard` effect. Riposte-list effects carry explicit keys (`rdamage`, `rguard`, `rstatus`). Effects inside a `conditional`'s `then` that would collide carry keys (`sdamage`, `cdamage`, `sguard`). `{<key>_per}` = the `per` of that effect's scaled amount (RULINGS 22), e.g. `{damage_per}`, `{guard_per}`, `{rguard_per}`, `{times_per}`. `{spend}` = a `spend_status`'s n. `{lose_guard}` = a `lose_guard`'s amount. Condition thresholds and custom-fn numbers live in `values` (`{min}`, `{prime}`), so no number in a card's text is hand-written.
- **Powers** apply a status with the card's id (or an existing status id). The status definitions are in §D.2; they are hooks, not `custom` fns.
- Text is ≤ 70 characters where possible; overruns are listed in §B.3.

### 0.3 Archetypes
| Code | Archetype | Plan | Relics it meshes with (GDD §5) |
|---|---|---|---|
| **S** | **Swing** | Chain Attacks to stack Onslaught, then a +per card or a "Spend" finisher. Cheap Attacks are fuel; a few cards bank Onslaught across turns. | Kept Fury, Crowd Breaker, Stormbreak Gem, Chain Wraps, Heavy Heart, Fury Draught |
| **D** | **Duellist** | Hold Riposte cards; make enemy attacks pay (damage, Stagger, Guard per hit, Onslaught for your next turn); Stagger multi-hitters. | Riven Gauntlet, Parry Charm, Duelist's Oath, Notched Buckler, Practice Dummy, Overwatch Drone, Concussion Rig, Dampener Coil |
| **B** | **Bulwark** | Bank Guard on hold turns (it halves instead of vanishing); attacks scale with "your defence"; cash the bank for damage, energy or Onslaught. | Bulwark Rivets, Slow-Temper Alloy, Bastion Core, Chain Wraps, Notched Buckler, Stim Patch |
| **G** | **Glue** | Cheap draw, 0-cost Attacks that feed Onslaught, Exposed appliers (Exposed also boosts Riposte hits, because Exposed applied on your turn lasts through that enemy's turn). | Glass Spurs, Fracture Engine, Hairline Saw |

The Breaker's turn question is "swing now or hold?" — every card below is written to sharpen one side of it: Swing cards reward a long Attack chain this turn, Duellist cards reward not playing a card this turn, Bulwark cards reward a turn spent defending, and bridges (S/D, S/B, D/B) convert one into the other (Riposte → Onslaught next turn, Onslaught → Guard, Guard → energy).

---

## 1. Starters (4) — verbatim from GDD §4.1

| id | Name | Type | Cost | Text (→ upgraded) | Arch | Price |
|---|---|---|---|---|---|---|
| `hew` | Hew | Attack | 1 | Deal 6 damage. (→ 9) | S | 6 d, starter rate |
| `bulwark` | Bulwark | Skill | 1 | Gain 5 Block. (→ 8) | B | 6 d, starter rate |
| `shoulder_check` | Shoulder Check | Attack | 1 | Deal 6 damage, +2 per Onslaught. Riposte: deal 6 damage to the attacker. (→ 8 (+2) / Riposte 9) | S D | 6 + 3 = 9 d; Riposte 6 |
| `brace` | Brace | Skill | 1 | Gain 6 Guard. (→ 9) | B | 6 d, starter rate |

```card
id: hew
name: Hew
cls: breaker
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
note: "GDD §4.1, final. 6 d at the starter rate (6). Every Attack raises Onslaught, so even Hew is chain fuel."
```

```card
id: bulwark
name: Bulwark
cls: breaker
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
note: "GDD §4.1, final. 5 Block = starter rate."
```

```card
id: shoulder_check
name: Shoulder Check
cls: breaker
type: attack
rarity: starter
cost: 1
target: enemy
keywords: [riposte]
text: "Deal {damage} damage, +{damage_per} per Onslaught. Riposte: deal {rdamage} damage to the attacker."
effects:
  - damage: { amount: { base: 6, per: 2, scale: { status: onslaught } }, target: target }
riposte:
  - damage: { amount: 6, target: attacker, key: rdamage }
upgrade:
  effects:
    - damage: { amount: { base: 8, per: 2, scale: { status: onslaught } }, target: target }
  riposte:
    - damage: { amount: 9, target: attacker, key: rdamage }
tags: [starter, swing, riposte]
note: "GDD §4.1, final. The class tutorial: play it 3rd in a chain (6 + 2×2 = 10) or hold it. With Riven Gauntlet a held copy also starts your next turn at Onslaught 1."
```

```card
id: brace
name: Brace
cls: breaker
type: skill
rarity: starter
cost: 1
target: self
keywords: []
text: "Gain {guard} Guard."
effects:
  - guard: { amount: 6 }
upgrade:
  effects:
    - guard: { amount: 9 }
tags: [starter, guard]
note: "GDD §4.1, final. 6 Guard = starter Guard rate; the tail (6 → 3 → 1) is why it is not just a Defend."
```

---

## 2. Commons (20) — 11 Attacks, 9 Skills

Commons are simple and at rate. None gains energy, returns a card or reduces a cost (GDD §3). 11 of 20 (55%) fit two archetypes.

| id | Name | Type | Cost | Text (→ upgraded) | Arch | Price |
|---|---|---|---|---|---|---|
| `piston_jab` | Piston Jab | Attack | 0 | Deal 2 damage, +1 per Onslaught. (→ 4, +1) | S G | 2 + 1.5 = 3.5 vs 3.5 |
| `chain_driver` | Chain Driver | Attack | 1 | Deal 6 damage. If Onslaught ≥ 2: draw 1 card. (→ 9) | S G | 6 + 3×0.55 = 7.7 vs 7 |
| `overhand_drive` | Overhand Drive | Attack | 2 | Deal 5 damage, +3 per Onslaught. (→ 5, +4) | S | 5 + 9 = 14 vs 14 |
| `breach_hammer` | Breach Hammer | Attack | 1 | Deal 6 damage. Spend 2 Onslaught: deal 12 instead. (→ 8 / 15) | S | 6; spent 12 − 4 = 8 vs 7 |
| `thresher_arc` | Thresher Arc | Attack | 1 | Deal 4 damage to ALL enemies, +1 per Onslaught. (→ 6, +1) | S | 5.5 per target vs 0.8 × 7 = 5.6 |
| `fault_line` | Fault Line | Attack | 1 | Apply 1 Exposed. Deal 4 damage. (→ 2 Exposed) | G D | 3 + 4 = 7 vs 7 |
| `rivet_flurry` | Rivet Flurry | Attack | 1 | Deal 2 damage 4 times. (→ 3×4) | G | 8 vs 7 (Stagger tax) |
| `counterweight` | Counterweight | Attack | 1 | Deal 7 damage. Riposte: apply 3 Stagger to the attacker. (→ 9 / 4) | D | 7; Riposte 7.2 (1.03×) |
| `plate_ram` | Plate Ram | Attack | 1 | Deal 5 damage. If your defence ≥ 10: deal 9 instead. (→ 7 / 12) | B | 5×0.4 + 9×0.6 = 7.4 vs 7 |
| `return_stroke` | Return Stroke | Attack | 1 | Deal 7 damage. Riposte: deal 6 damage to the attacker and gain 1 Onslaught. (→ 9 / 8) | D S | 7; Riposte 6 + 2 = 8 (1.14×) |
| `gauntlet_tap` | Gauntlet Tap | Attack | 0 | Deal 2 damage. Gain 2 Guard. (→ 3 / 3) | S B | 2 + 2 = 4 vs 3.5 |
| `catch_blade` | Catch Blade | Skill | 1 | Gain 6 Block. Riposte: gain 4 Guard for each hit of its attack. (→ 8 / 5) | D B | 7.2; Riposte 8 (1.11×) |
| `cool_the_steel` | Cool the Steel | Skill | 1 | Gain 4 Guard, +2 per Onslaught. (→ +3) | S B | 4 + 3 = 7 vs 7 |
| `find_the_seam` | Find the Seam | Skill | 0 | Apply 1 Exposed. (→ 2) | G D | 3 vs 3.5 (4 on multi-hit) |
| `read_the_line` | Read the Line | Skill | 1 | Draw 2 cards. If Onslaught ≥ 3: draw 1 more. (→ draw 3) | G S | 6 + 3×0.35 = 7.05 vs 7 |
| `pivot_sweep` | Pivot Sweep | Skill | 1 | Gain 6 Block. Riposte: deal 6 damage to ALL enemies. (→ 8 / 8) | D | 7.2; Riposte 6 / 0.8 = 7.5 (1.04×) |
| `rivet_wall` | Rivet Wall | Skill | 2 | Gain 14 Guard. (→ 18) | B | 14 vs 14 |
| `planted_feet` | Planted Feet | Skill | 1 | Gain 5 Block. If you have 5 or more Guard: draw 1 card. (→ 7) | B G | 6 + 3×0.5 = 7.5 vs 7 |
| `loaded_spring` | Loaded Spring | Skill | 1 | Gain 7 Guard. Riposte: gain 4 Guard and 2 Onslaught. (→ 9 / 5 + 3) | D S | 7; Riposte 4 + 4 = 8 (1.14×) |
| `sabre_rattle` | Sabre Rattle | Skill | 1 | Apply 1 Exposed to ALL enemies. Draw 1 card. (→ 2 Exposed) | G | 3 / 0.8 + 3 = 6.75 vs 7 |

```card
id: piston_jab
name: Piston Jab
cls: breaker
type: attack
rarity: common
cost: 0
target: enemy
keywords: []
text: "Deal {damage} damage, +{damage_per} per Onslaught."
effects:
  - damage: { amount: { base: 2, per: 1, scale: { status: onslaught } }, target: target }
upgrade:
  effects:
    - damage: { amount: { base: 4, per: 1, scale: { status: onslaught } }, target: target }
tags: [swing, cheap, scaling]
note: "0-cost chain fuel: free Onslaught for the cards after it, and late in a chain it is real damage (Onslaught 4 → 6 for 0). Price 2 + 1×1.5 = 3.5 d = the 0-cost common rate. Upgrade +2 base (5.5 d). Stormbreak Gem decks want 2–3."
```

```card
id: chain_driver
name: Chain Driver
cls: breaker
type: attack
rarity: common
cost: 1
target: enemy
keywords: []
values: { min: 2 }
text: "Deal {damage} damage. If Onslaught ≥ {min}: draw {draw} card."
effects:
  - damage: { amount: 6, target: target }
  - conditional:
      if: { type: has_status, who: self, id: onslaught, min: 2 }
      then:
        - draw: { n: 1 }
upgrade:
  effects:
    - damage: { amount: 9, target: target }
    - conditional:
        if: { type: has_status, who: self, id: onslaught, min: 2 }
        then:
          - draw: { n: 1 }
tags: [swing, draw]
note: "Ordering card: played 3rd it replaces itself, played 1st it is a Hew. 6 + 3×P(Onslaught ≥ 2 ≈ 0.55) = 7.7 d vs 7 (+10%). Upgrade +3 damage (10.7 d). Any Breaker deck takes it; Swing decks most."
```

```card
id: overhand_drive
name: Overhand Drive
cls: breaker
type: attack
rarity: common
cost: 2
target: enemy
keywords: []
text: "Deal {damage} damage, +{damage_per} per Onslaught."
effects:
  - damage: { amount: { base: 5, per: 3, scale: { status: onslaught } }, target: target }
upgrade:
  effects:
    - damage: { amount: { base: 5, per: 4, scale: { status: onslaught } }, target: target }
tags: [swing, finisher, scaling]
note: "The common finisher: one big hit (good against Stagger on you, Gloam Empress's question). Finisher pricing (cost 2): 5 + 3×3 = 14 d = 2 × 7. At Onslaught 4: 17 (upgraded 21). Upgrade +1 per (+3 d)."
```

```card
id: breach_hammer
name: Breach Hammer
cls: breaker
type: attack
rarity: common
cost: 1
target: enemy
keywords: []
values: { min: 2 }
text: "Deal {damage} damage. Spend {spend} Onslaught: deal {sdamage} instead."
effects:
  - conditional:
      if: { type: has_status, who: self, id: onslaught, min: 2 }
      then:
        - spend_status: { id: onslaught, n: 2, effects: [ { damage: { amount: 12, target: target, key: sdamage } } ] }
      else:
        - damage: { amount: 6, target: target }
upgrade:
  effects:
    - conditional:
        if: { type: has_status, who: self, id: onslaught, min: 2 }
        then:
          - spend_status: { id: onslaught, n: 2, effects: [ { damage: { amount: 15, target: target, key: sdamage } } ] }
        else:
          - damage: { amount: 8, target: target }
tags: [swing, finisher]
note: "Cheap spender: the decision is whether the 2 Onslaught is worth more on the cards after it. Without the clause 6 d (−1 vs rate). Clause +6 ≥ 2×2 = 4 ✓. Spent value 12 − 4 = 8 d vs 7 (+14%), paid by the Onslaught lost for later +per cards, so it wants to be the last Attack. Always exactly one hit. Upgrade +2/+3."
```

```card
id: thresher_arc
name: Thresher Arc
cls: breaker
type: attack
rarity: common
cost: 1
target: all_enemies
keywords: []
text: "Deal {damage} damage to ALL enemies, +{damage_per} per Onslaught."
effects:
  - damage: { amount: { base: 4, per: 1, scale: { status: onslaught } }, target: all_enemies }
upgrade:
  effects:
    - damage: { amount: { base: 6, per: 1, scale: { status: onslaught } }, target: all_enemies }
tags: [swing, aoe]
note: "The Swing deck's pack answer (Act 2 width; Mother of Buds' 9-HP Buds). Per target 4 + 1×1.5 = 5.5 vs the AoE cap 0.8 × 7 = 5.6 (RULINGS 29). With Crowd Breaker it also feeds +1 Onslaught. Upgrade +2 base (7.5 per target)."
```

```card
id: fault_line
name: Fault Line
cls: breaker
type: attack
rarity: common
cost: 1
target: enemy
keywords: []
text: "Apply {status} Exposed. Deal {damage} damage."
effects:
  - status: { target: target, id: exposed, amount: 1 }
  - damage: { amount: 4, target: target }
upgrade:
  effects:
    - status: { target: target, id: exposed, amount: 2 }
    - damage: { amount: 4, target: target }
tags: [exposed, riposte]
note: "Exposed first, so this hit gets +1 too. Exposed 1 applied on your turn lasts through that enemy's turn, so it also adds to a Riposte hit — Glue and Duellist both want it. 3 + 4 = 7 d. Upgrade +1 Exposed (10 d)."
```

```card
id: rivet_flurry
name: Rivet Flurry
cls: breaker
type: attack
rarity: common
cost: 1
target: enemy
keywords: []
text: "Deal {damage} damage {times} times."
effects:
  - damage: { amount: 2, times: 4, target: target }
upgrade:
  effects:
    - damage: { amount: 3, times: 4, target: target }
tags: [multihit, exposed]
note: "The Exposed payoff common: Exposed 2 turns 8 into 16; Glass Spurs applies Exposed on its 3rd hit. 8 d face vs 7 (+14%), paid by Stagger: each Stagger on you removes 4 from this card versus 1 from a single hit, and Act 1 applies it often (Sporepuff, Vinelash, Gloam Empress). Upgrade +1 per hit (12 d)."
```

```card
id: counterweight
name: Counterweight
cls: breaker
type: attack
rarity: common
cost: 1
target: enemy
keywords: [riposte]
text: "Deal {damage} damage. Riposte: apply {rstatus} Stagger to the attacker."
effects:
  - damage: { amount: 7, target: target }
riposte:
  - status: { target: attacker, id: stagger, amount: 3, key: rstatus }
upgrade:
  effects:
    - damage: { amount: 9, target: target }
  riposte:
    - status: { target: attacker, id: stagger, amount: 4, key: rstatus }
tags: [riposte, stagger]
note: "Play it as a 7-damage Attack, or hold it into a multi-hit: Riposte Stagger applies to the attack that triggered it (−3 per hit now, −2 on its next attack, −1 after). Played 7 d = rate. Riposte 3 × 2.4 = 7.2 d (1.03×); against a 4-hit Gnasher pack attack 3 × 3.6 = 10.8 — that is the point. Upgrade +2 / +1 Stagger."
```

```card
id: plate_ram
name: Plate Ram
cls: breaker
type: attack
rarity: common
cost: 1
target: enemy
keywords: []
values: { min: 10 }
text: "Deal {damage} damage. If your defence ≥ {min}: deal {cdamage} instead."
effects:
  - conditional:
      if: { type: compare, left: { scale: defence }, op: '>=', right: 10 }
      then:
        - damage: { amount: 9, target: target, key: cdamage }
      else:
        - damage: { amount: 5, target: target }
upgrade:
  effects:
    - conditional:
        if: { type: compare, left: { scale: defence }, op: '>=', right: 10 }
        then:
          - damage: { amount: 12, target: target, key: cdamage }
        else:
          - damage: { amount: 7, target: target }
tags: [guard, defence]
note: "Bulwark's common payoff: defend first, then ram. 'Your defence' = Block + Guard (GDD §2.3), so a Guard tail from last turn counts. P(defence ≥ 10 at play) ≈ 0.6 in a Bulwark deck: 5×0.4 + 9×0.6 = 7.4 d vs 7 (+6%). Upgrade +2/+3."
```

```card
id: return_stroke
name: Return Stroke
cls: breaker
type: attack
rarity: common
cost: 1
target: enemy
keywords: [riposte]
text: "Deal {damage} damage. Riposte: deal {rdamage} damage to the attacker and gain {rstatus} Onslaught."
effects:
  - damage: { amount: 7, target: target }
riposte:
  - damage: { amount: 6, target: attacker, key: rdamage }
  - status: { target: self, id: onslaught, amount: 1, key: rstatus }
upgrade:
  effects:
    - damage: { amount: 9, target: target }
  riposte:
    - damage: { amount: 8, target: attacker, key: rdamage }
    - status: { target: self, id: onslaught, amount: 1, key: rstatus }
tags: [riposte, swing]
note: "The Duellist→Swing bridge: Onslaught gained in the enemy phase is not reset until the end of your next turn (GDD §2.1), so a held copy plus Riven Gauntlet starts your turn at Onslaught 2. Played 7 d = rate. Riposte 6 + 1 × 2 = 8 d (1.14×; 9 counting start-of-turn Onslaught at 3 d). Upgrade +2 / +2."
```

```card
id: gauntlet_tap
name: Gauntlet Tap
cls: breaker
type: attack
rarity: common
cost: 0
target: enemy
keywords: []
text: "Deal {damage} damage. Gain {guard} Guard."
effects:
  - damage: { amount: 2, target: target }
  - guard: { amount: 2 }
upgrade:
  effects:
    - damage: { amount: 3, target: target }
    - guard: { amount: 3 }
tags: [swing, guard, cheap]
note: "Free Onslaught that also leaves a little bank (Bulwark Rivets makes it 3 Guard). 2 + 2 = 4 d vs 3.5 (+0.5 d; one point less of either is 3, 14% under — the 0-cost rounding floor). Upgrade +1/+1 (6 d)."
```

```card
id: catch_blade
name: Catch Blade
cls: breaker
type: skill
rarity: common
cost: 1
target: self
keywords: [riposte]
text: "Gain {block} Block. Riposte: gain {rguard_per} Guard for each hit of its attack."
effects:
  - block: { amount: 6 }
riposte:
  - guard: { amount: { base: 0, per: 4, scale: trigger_hits }, key: rguard }
upgrade:
  effects:
    - block: { amount: 8 }
  riposte:
    - guard: { amount: { base: 0, per: 5, scale: trigger_hits }, key: rguard }
tags: [riposte, guard, multihit_answer]
note: "The multi-hit answer: the Guard arrives before the first hit. Against Twin Sickle's 3 hits (Mantis's parry tax) it gains 12. Played 6 Block = 7.2 d. Riposte priced at 2 hits: 8 Guard = 8 d (1.11×). Leftover Guard banks (Duellist/Bulwark bridge). Upgrade +2 Block / +1 per hit."
```

```card
id: cool_the_steel
name: Cool the Steel
cls: breaker
type: skill
rarity: common
cost: 1
target: self
keywords: []
text: "Gain {guard} Guard, +{guard_per} per Onslaught."
effects:
  - guard: { amount: { base: 4, per: 2, scale: { status: onslaught } } }
upgrade:
  effects:
    - guard: { amount: { base: 4, per: 3, scale: { status: onslaught } } }
tags: [swing, guard]
note: "The swing turn's last card: after 3 Attacks it banks 10 Guard, so an all-out turn is not defenceless. 4 + 2×1.5 = 7 d = rate. Upgrade +1 per (8.5 d). Stacks with Chain Wraps."
```

```card
id: find_the_seam
name: Find the Seam
cls: breaker
type: skill
rarity: common
cost: 0
target: enemy
keywords: []
text: "Apply {status} Exposed."
effects:
  - status: { target: target, id: exposed, amount: 1 }
upgrade:
  effects:
    - status: { target: target, id: exposed, amount: 2 }
tags: [exposed, cheap]
note: "Free set-up for multi-hit and Riposte hits. 3 d vs 3.5 (4 d in a multi-hit deck). Upgrade +1 Exposed (6 d; Exposed 2 also covers your next turn)."
```

```card
id: read_the_line
name: Read the Line
cls: breaker
type: skill
rarity: common
cost: 1
target: none
keywords: []
values: { min: 3 }
text: "Draw {draw} cards. If Onslaught ≥ {min}: draw {draw2} more."
effects:
  - draw: { n: 2 }
  - conditional:
      if: { type: has_status, who: self, id: onslaught, min: 3 }
      then:
        - draw: { n: 1 }
upgrade:
  effects:
    - draw: { n: 3 }
    - conditional:
        if: { type: has_status, who: self, id: onslaught, min: 3 }
        then:
          - draw: { n: 1 }
tags: [draw, swing]
note: "Glue draw that rewards being mid-chain (Skills don't add Onslaught, so it costs the chain nothing). 6 + 3 × P(≥ 3 ≈ 0.35) = 7.05 d. Upgrade +1 draw (10 d)."
```

```card
id: pivot_sweep
name: Pivot Sweep
cls: breaker
type: skill
rarity: common
cost: 1
target: self
keywords: [riposte]
text: "Gain {block} Block. Riposte: deal {rdamage} damage to ALL enemies."
effects:
  - block: { amount: 6 }
riposte:
  - damage: { amount: 6, target: all_enemies, key: rdamage }
upgrade:
  effects:
    - block: { amount: 8 }
  riposte:
    - damage: { amount: 8, target: all_enemies, key: rdamage }
tags: [riposte, aoe]
note: "A held sweep for packs: the first attacker in a pack fires it and every enemy takes the hit (Exposed applies per enemy). If it kills the attacker, that attack is cancelled. Played 7.2 d. Riposte AoE 6 per target = 6 / 0.8 = 7.5 d single-target-equivalent (1.04×). Upgrade +2/+2."
```

```card
id: rivet_wall
name: Rivet Wall
cls: breaker
type: skill
rarity: common
cost: 2
target: self
keywords: []
text: "Gain {guard} Guard."
effects:
  - guard: { amount: 14 }
upgrade:
  effects:
    - guard: { amount: 18 }
tags: [guard]
note: "The plain bank: 14 → 7 → 3 → 1 across turns, so one hold turn covers the next swing turn. 14 d = 2 × 7. Beats two Braces (12). Upgrade +4."
```

```card
id: planted_feet
name: Planted Feet
cls: breaker
type: skill
rarity: common
cost: 1
target: self
keywords: []
values: { min: 5 }
text: "Gain {block} Block. If you have {min} or more Guard: draw {draw} card."
effects:
  - block: { amount: 5 }
  - conditional:
      if: { type: compare, left: { scale: guard }, op: '>=', right: 5 }
      then:
        - draw: { n: 1 }
upgrade:
  effects:
    - block: { amount: 7 }
    - conditional:
        if: { type: compare, left: { scale: guard }, op: '>=', right: 5 }
        then:
          - draw: { n: 1 }
tags: [guard, draw, block]
note: "Rewards keeping a bank: Block for this turn, a card for having Guard. 5 Block = 6 d + 3 × P(Guard ≥ 5 ≈ 0.5) = 7.5 d (+7%). Upgrade +2 Block (9.9 d)."
```

```card
id: loaded_spring
name: Loaded Spring
cls: breaker
type: skill
rarity: common
cost: 1
target: self
keywords: [riposte]
text: "Gain {guard} Guard. Riposte: gain {rguard} Guard and {rstatus} Onslaught."
effects:
  - guard: { amount: 7 }
riposte:
  - guard: { amount: 4, key: rguard }
  - status: { target: self, id: onslaught, amount: 2, key: rstatus }
upgrade:
  effects:
    - guard: { amount: 9 }
  riposte:
    - guard: { amount: 5, key: rguard }
    - status: { target: self, id: onslaught, amount: 3, key: rstatus }
tags: [riposte, swing, guard]
note: "Hold it on a quiet turn, swing on the next: the 2 Onslaught carries into your turn. Played 7 Guard = 7 d. Riposte 4 + 2×2 = 8 d (1.14×; 10 counting start-of-turn Onslaught at 3 d). Upgrade +2 / +1 / +1."
```

```card
id: sabre_rattle
name: Sabre Rattle
cls: breaker
type: skill
rarity: common
cost: 1
target: all_enemies
keywords: []
text: "Apply {status} Exposed to ALL enemies. Draw {draw} card."
effects:
  - status: { target: all_enemies, id: exposed, amount: 1 }
  - draw: { n: 1 }
upgrade:
  effects:
    - status: { target: all_enemies, id: exposed, amount: 2 }
    - draw: { n: 1 }
tags: [exposed, aoe, draw]
note: "Pack glue: replaces itself and makes Thresher Arc, Pivot Sweep and Ripostes hit harder across the line. Exposed 1 to ALL = 3 / 0.8 = 3.75, + 3 = 6.75 d. Upgrade +1 Exposed (10.5 d). Hairline Saw carries the stacks when one dies."
```

---
## 3. Uncommons (20) — 8 Attacks, 7 Skills, 5 Powers

Uncommons define the archetypes: the big finishers, the Riposte specialists, the Guard retention and conversion cards, and every class Power below rare.

| id | Name | Type | Cost | Text (→ upgraded) | Arch | Price |
|---|---|---|---|---|---|---|
| `hammerfall` | Hammerfall | Attack | 2 | Keep. Spend all Onslaught: deal 8 damage, +4 per Onslaught spent. (→ +5) | S | N=4: 24 − 8 = 16 vs 15.3 |
| `piston_volley` | Piston Volley | Attack | 1 | Deal 3 damage, +1 per Onslaught, twice. (→ 3 times) | S G | 2 × 4.5 = 9 vs 8.5 |
| `answering_steel` | Answering Steel | Attack | 1 | Deal 9 damage. Riposte: deal 5 damage to the attacker per hit of its attack. (→ 12 / 6) | D | 9; Riposte 10 (1.11×) |
| `rampart_crash` | Rampart Crash | Attack | 1 | Deal 4 damage, plus your Guard. (→ 7) | B | Guard 9: 13 vs 8.5 × 1.5 |
| `coiled_strike` | Coiled Strike | Attack | 2 | Deal 16 damage. Riposte: deal 16 damage to the attacker. (→ 20 / 20) | D | 16 vs 17; Riposte 1.0× |
| `seam_ripper` | Seam Ripper | Attack | 0 | Deal 3 damage. If the enemy has Exposed: draw 1 card. (→ 5) | G S | 3 + 3×0.5 = 4.5 vs 4.25 |
| `quake_hammer` | Quake Hammer | Attack | 1 | Deal 7 damage to ALL enemies. Spend 3 Onslaught: deal 12 instead. (→ 9 / 15) | S | 7 per target vs 6.8; spent 15 − 6 = 9 |
| `prism_edge` | Prism Edge | Attack | 1 | Deal 5 damage, +2 per Shard you hold. (→ +3) | G (run) | 2 Shards: 9 vs 8.5 |
| `feint_step` | Feint Step | Skill | 0 | Gain 4 Block. Riposte: deal 5 damage to the attacker. (→ 6 / 7) | D | 4.8 vs 4.25; Riposte 1.04× |
| `bind_the_blade` | Bind the Blade | Skill | 1 | Apply 3 Stagger. Riposte: apply 2 Stagger to the attacker and gain 2 Onslaught. (→ 4 / 3 + 3) | D S | 7.2 (10.8 vs multi-hit); Riposte 8.8 (1.22×) |
| `anneal` | Anneal | Skill | 1 | Gain 3 Guard. Your Guard doesn't halve at the start of your next turn. (→ 6) | B | 3 + 5 = 8 vs 8.5 |
| `quench` | Quench | Skill | 1 | Gain 5 Guard. Spend 2 Onslaught: gain 12 instead. (→ 7 / 15) | B S | 5.3; spent 12 − 4 = 8 |
| `ride_the_surge` | Ride the Surge | Skill | 1 | Draw 2 cards. If Onslaught ≥ 3: gain 1 energy. (→ draw 3) | S G | 6 + 7×0.35 = 8.45 |
| `hairline_mark` | Hairline Mark | Skill | 1 | Apply 2 Exposed. Draw 1 card. (→ 3) | G | 6 + 3 = 9 vs 8.5 |
| `read_the_blow` | Read the Blow | Skill | 1 | If it intends to attack: gain 8 Guard, apply 1 Stagger. Else draw 2 cards. (→ 11 / draw 3) | D B | 0.7×10.4 + 0.3×6 = 9.1 |
| `furnace_heart` | Furnace Heart | Power | 1 | At the start of your turn, gain 1 Onslaught. (→ Opening) | S | 3/turn × 3 = 9 |
| `crossed_blades` | Crossed Blades | Power | 1 | You can prime 1 additional Riposte card. (→ cost 0) | D | ≈ 3.2/turn × 3 = 9.6 |
| `parry_ledger` | Parry Ledger | Power | 1 | Whenever one of your Ripostes triggers, draw 1 more card next turn. (→ cost 0) | D G | 2.4/turn × 3 = 7.2 |
| `anvil_heart` | Anvil Heart | Power | 1 | When an enemy attack ends and you lost no HP to it, gain 1 Onslaught. (→ cost 0) | B S | 2.5/turn × 3 = 7.6 |
| `fault_reader` | Fault Reader | Power | 1 | At the start of your turn, apply 1 Exposed to the lowest-HP enemy. (→ Opening) | G | 3/turn × 3 = 9 |

```card
id: hammerfall
name: Hammerfall
cls: breaker
type: attack
rarity: uncommon
cost: 2
target: enemy
keywords: [retain]
text: "Keep. Spend all Onslaught: deal {damage} damage, +{damage_per} per Onslaught spent."
effects:
  - spend_status:
      id: onslaught
      n: all
      effects:
        - damage: { amount: { base: 8, per: 4, scale: spent }, target: target }
upgrade:
  effects:
    - spend_status:
        id: onslaught
        n: all
        effects:
          - damage: { amount: { base: 8, per: 5, scale: spent }, target: target }
tags: [swing, finisher]
note: "The Swing capstone, one hit (Stagger on you costs it 1, not 1 per hit — Gloam Empress's 'few big hits' answer). Keep lets it wait in hand for the 5-Attack turn. GDD §8.3 finisher turn spends 4–6: at N = 4, 8 + 16 = 24, minus 2N = 8 → 16 d vs 2 × 8.5 × 0.9 (Keep) = 15.3 (+5%). N = 6: 32 (38 upgraded). With 0 Onslaught it still deals 8 (§F.2). Upgrade +1 per spent."
```

```card
id: piston_volley
name: Piston Volley
cls: breaker
type: attack
rarity: uncommon
cost: 1
target: enemy
keywords: []
text: "Deal {damage} damage, +{damage_per} per Onslaught, {times} times."
effects:
  - damage: { amount: { base: 3, per: 1, scale: { status: onslaught } }, times: 2, target: target }
upgrade:
  effects:
    - damage: { amount: { base: 3, per: 1, scale: { status: onslaught } }, times: 3, target: target }
tags: [swing, multihit, exposed]
note: "Onslaught × hits × Exposed: each hit gets the +per and the Exposed bonus. 2 × (3 + 1.5) = 9 d vs 8.5. A first draft with 3 hits of 1 + per pushed the simulated Swing/Exposed deck to 55 value a turn against 31–38 for the others: Onslaught and Exposed both scale per hit, so hit count multiplies twice. Two hits keeps the deck strongest but in range (§E.2). Weak to Stagger on you by design. Upgrade +1 hit (13.5 d at face)."
```
```

```card
id: answering_steel
name: Answering Steel
cls: breaker
type: attack
rarity: uncommon
cost: 1
target: enemy
keywords: [riposte]
text: "Deal {damage} damage. Riposte: deal {rdamage_per} damage to the attacker per hit of its attack."
effects:
  - damage: { amount: 9, target: target }
riposte:
  - damage: { amount: { base: 0, per: 5, scale: trigger_hits }, target: attacker, key: rdamage }
upgrade:
  effects:
    - damage: { amount: 12, target: target }
  riposte:
    - damage: { amount: { base: 0, per: 6, scale: trigger_hits }, target: attacker, key: rdamage }
tags: [riposte, multihit_answer]
note: "Turns a multi-hit intent into a kill: one Riposte hit of 5 × hits, which cancels the attack if it kills (Gnasher Alpha's pups, Vinelash, Wing Buffet). Played 9 d vs 8.5. Riposte priced at 2 hits: 10 d (1.11×); a 5-hit attack takes 25. Upgrade +3 / +1 per hit."
```

```card
id: rampart_crash
name: Rampart Crash
cls: breaker
type: attack
rarity: uncommon
cost: 1
target: enemy
keywords: []
text: "Deal {damage} damage, plus your Guard."
effects:
  - damage: { amount: { base: 4, per: 1, scale: guard }, target: target }
upgrade:
  effects:
    - damage: { amount: { base: 7, per: 1, scale: guard }, target: target }
tags: [guard, scaling]
note: "Bulwark's main payoff, and the reason to bank Guard rather than Block: it reads only the Guard pool, which persists (halving) across turns, so the plan is hold turn → crash turn. Simulated floor-30 Bulwark deck (§E): Guard at play ≈ 9 → 13 d. Rate 8.5, but with no Guard it is a 4-damage card, so it is priced like a conditional card (+50%: 12.75) → +2%. Simulation also showed the archetype needs a payoff at this strength: with a half-defence version the floor-30 Bulwark deck dealt 13 damage a turn (target 38) and ranked last of the four archetypes; with this one it ties Swing (§E.2). C19: Body Slam reads this turn's Block; this reads the cross-turn Guard bank and ignores Block. Upgrade +3 base."
```
```

```card
id: coiled_strike
name: Coiled Strike
cls: breaker
type: attack
rarity: uncommon
cost: 2
target: enemy
keywords: [riposte]
text: "Deal {damage} damage. Riposte: deal {rdamage} damage to the attacker."
effects:
  - damage: { amount: 16, target: target }
riposte:
  - damage: { amount: 16, target: attacker, key: rdamage }
upgrade:
  effects:
    - damage: { amount: 20, target: target }
  riposte:
    - damage: { amount: 20, target: attacker, key: rdamage }
tags: [riposte]
note: "The anti-big-hit Riposte: big single hits are what the Breaker fears, and 16 before the hit kills or nearly kills a wounded attacker (a kill cancels the attack). Holding costs no energy, which is why a 2-cost Riposte card is a real hold option. Played 16 d vs 17 (−6%); Riposte 16 (1.0×). Upgrade +4/+4."
```

```card
id: seam_ripper
name: Seam Ripper
cls: breaker
type: attack
rarity: uncommon
cost: 0
target: enemy
keywords: []
text: "Deal {damage} damage. If the enemy has Exposed: draw {draw} card."
effects:
  - damage: { amount: 3, target: target }
  - conditional:
      if: { type: has_status, who: target, id: exposed, min: 1 }
      then:
        - draw: { n: 1 }
upgrade:
  effects:
    - damage: { amount: 5, target: target }
    - conditional:
        if: { type: has_status, who: target, id: exposed, min: 1 }
        then:
          - draw: { n: 1 }
tags: [exposed, draw, cheap]
note: "0-cost Onslaught fuel that cycles in an Exposed deck (Fault Reader makes it always draw). 3 + 3 × P(target Exposed ≈ 0.5) = 4.5 d vs 4.25 (+6%). Upgrade +2 damage."
```

```card
id: quake_hammer
name: Quake Hammer
cls: breaker
type: attack
rarity: uncommon
cost: 1
target: all_enemies
keywords: []
values: { min: 3 }
text: "Deal {damage} damage to ALL enemies. Spend {spend} Onslaught: deal {sdamage} instead."
effects:
  - conditional:
      if: { type: has_status, who: self, id: onslaught, min: 3 }
      then:
        - spend_status: { id: onslaught, n: 3, effects: [ { damage: { amount: 12, target: all_enemies, key: sdamage } } ] }
      else:
        - damage: { amount: 7, target: all_enemies }
upgrade:
  effects:
    - conditional:
        if: { type: has_status, who: self, id: onslaught, min: 3 }
        then:
          - spend_status: { id: onslaught, n: 3, effects: [ { damage: { amount: 15, target: all_enemies, key: sdamage } } ] }
        else:
          - damage: { amount: 9, target: all_enemies }
tags: [swing, aoe, finisher]
note: "Swing's pack finisher (Act 2 width). Per target 7 vs the AoE cap 0.8 × 8.5 = 6.8 (+3%). Clause +5 per target = 6.25 d single-target-equivalent ≥ 2 × 3 = 6 ✓; spent value 12 / 0.8 − 6 = 9 d (+6%). Crowd Breaker refunds 1 Onslaught. Upgrade +2/+3."
```

```card
id: prism_edge
name: Prism Edge
cls: breaker
type: attack
rarity: uncommon
cost: 1
target: enemy
keywords: []
text: "Deal {damage} damage, +{damage_per} per Shard you hold."
effects:
  - damage: { amount: { base: 5, per: 2, scale: shards }, target: target }
upgrade:
  effects:
    - damage: { amount: { base: 5, per: 3, scale: shards }, target: target }
tags: [shards, run]
note: "Run card: every skipped reward also sharpens it, so it pulls against spending Shards on Purge/Transmute (the Geode Heart tension). GDD §4.5 targets 3–5 Shards earned per act with Purge costing 2, so ~2 held: 5 + 4 = 9 d vs 8.5. Range 5–25 (cap 10). Build-around; weak at 0 Shards. Upgrade +1 per Shard."
```

```card
id: feint_step
name: Feint Step
cls: breaker
type: skill
rarity: uncommon
cost: 0
target: self
keywords: [riposte]
text: "Gain {block} Block. Riposte: deal {rdamage} damage to the attacker."
effects:
  - block: { amount: 4 }
riposte:
  - damage: { amount: 5, target: attacker, key: rdamage }
upgrade:
  effects:
    - block: { amount: 6 }
  riposte:
    - damage: { amount: 7, target: attacker, key: rdamage }
tags: [riposte, cheap]
note: "A free rack-filler: hold this so your bigger Riposte cards can be played now, or play it for free Block. Every primed card also fires Riven Gauntlet (+1 Onslaught, +3 Guard). Played 4 Block = 4.8 d vs 4.25 (+13%, 0-cost rounding); Riposte 5 d (1.04×). Upgrade +2/+2."
```

```card
id: bind_the_blade
name: Bind the Blade
cls: breaker
type: skill
rarity: uncommon
cost: 1
target: enemy
keywords: [riposte]
text: "Apply {status} Stagger. Riposte: apply {rstatus} Stagger to the attacker and gain {rstatus2} Onslaught."
effects:
  - status: { target: target, id: stagger, amount: 3 }
riposte:
  - status: { target: attacker, id: stagger, amount: 2, key: rstatus }
  - status: { target: self, id: onslaught, amount: 2, key: rstatus2 }
upgrade:
  effects:
    - status: { target: target, id: stagger, amount: 4 }
  riposte:
    - status: { target: attacker, id: stagger, amount: 3, key: rstatus }
    - status: { target: self, id: onslaught, amount: 3, key: rstatus2 }
tags: [riposte, stagger, swing]
note: "The Stagger lock piece, both ways. Played on your turn, Stagger 3 blunts that enemy's next attack by 3 per hit (then 2, then 1): 3 × 2.4 = 7.2 d vs 8.5 (−15%), but 3 × 3.6 = 10.8 (+27%) against the multi-hitters it is for. Held, the Stagger lands on the attack that triggered it and the 2 Onslaught carries into your turn: 4.8 + 2 × 2 = 8.8 d (1.22×). Upgrade +1 to each number."
```

```card
id: anneal
name: Anneal
cls: breaker
type: skill
rarity: uncommon
cost: 1
target: self
keywords: []
text: "Gain {guard} Guard. Your Guard doesn't halve at the start of your next turn."
effects:
  - guard: { amount: 3 }
  - status: { target: self, id: guard_hold, amount: 1 }
upgrade:
  effects:
    - guard: { amount: 6 }
    - status: { target: self, id: guard_hold, amount: 1 }
tags: [guard, scaling]
note: "Guard retention scales with the bank: the halving it skips is worth half your Guard at the next turn start. Typical bank then ≈ 10 → 5 saved: 3 + 5 = 8 d vs 8.5. A 30-Guard bank saves 15. Two copies in one turn do nothing extra (guard_hold is a flag) — the text says 'next turn', so this reads correctly. Upgrade +3 Guard (11 d)."
```

```card
id: quench
name: Quench
cls: breaker
type: skill
rarity: uncommon
cost: 1
target: self
keywords: []
values: { min: 2 }
text: "Gain {guard} Guard. Spend {spend} Onslaught: gain {sguard} instead."
effects:
  - conditional:
      if: { type: has_status, who: self, id: onslaught, min: 2 }
      then:
        - spend_status: { id: onslaught, n: 2, effects: [ { guard: { amount: 12, key: sguard } } ] }
      else:
        - guard: { amount: 5 }
upgrade:
  effects:
    - conditional:
        if: { type: has_status, who: self, id: onslaught, min: 2 }
        then:
          - spend_status: { id: onslaught, n: 2, effects: [ { guard: { amount: 15, key: sguard } } ] }
        else:
          - guard: { amount: 7 }
tags: [guard, swing]
note: "Converts the end of a swing into a bank (Onslaught resets at turn end anyway). Without the clause 5 Guard = 5.3 d (uncommon Guard rate 8). Clause +7 ≥ 2 × 2 = 4 ✓; spent value 12 − 4 = 8 d vs 8.5. Upgrade +2/+3."
```

```card
id: ride_the_surge
name: Ride the Surge
cls: breaker
type: skill
rarity: uncommon
cost: 1
target: none
keywords: []
values: { min: 3 }
text: "Draw {draw} cards. If Onslaught ≥ {min}: gain {energy} energy."
effects:
  - draw: { n: 2 }
  - conditional:
      if: { type: has_status, who: self, id: onslaught, min: 3 }
      then:
        - energy: { n: 1 }
upgrade:
  effects:
    - draw: { n: 3 }
    - conditional:
        if: { type: has_status, who: self, id: onslaught, min: 3 }
        then:
          - energy: { n: 1 }
tags: [draw, energy, swing]
note: "Mid-chain refuel: played after 3 Attacks it is free and draws 2. 6 + 7 × P(≥ 3 ≈ 0.35) = 8.45 d. Energy counts toward cap_bonus_energy (4). Uncommon, so the GDD §3 commons rule does not apply. Upgrade +1 draw (11.45 d)."
```

```card
id: hairline_mark
name: Hairline Mark
cls: breaker
type: skill
rarity: uncommon
cost: 1
target: enemy
keywords: []
text: "Apply {status} Exposed. Draw {draw} card."
effects:
  - status: { target: target, id: exposed, amount: 2 }
  - draw: { n: 1 }
upgrade:
  effects:
    - status: { target: target, id: exposed, amount: 3 }
    - draw: { n: 1 }
tags: [exposed, draw]
note: "The Exposed definer, kept at 2 stacks plus a card. Exposed decays only 1 per enemy turn, so stacks applied every turn pile up (simulated Exposed deck: ≈ 4 stacks at every multi-hit play), and the §8.5 '3 d per stack' undercounts that (§F.10). 2 × 3 + 3 = 9 d vs 8.5. Upgrade +1 Exposed (12 d)."
```
```

```card
id: read_the_blow
name: Read the Blow
cls: breaker
type: skill
rarity: uncommon
cost: 1
target: enemy
keywords: []
text: "If it intends to attack: gain {guard} Guard, apply {status} Stagger. Else draw {draw} cards."
effects:
  - conditional:
      if: { type: target_intends_attack }
      then:
        - guard: { amount: 8 }
        - status: { target: target, id: stagger, amount: 1 }
      else:
        - draw: { n: 2 }
upgrade:
  effects:
    - conditional:
        if: { type: target_intends_attack }
        then:
          - guard: { amount: 11 }
          - status: { target: target, id: stagger, amount: 1 }
        else:
          - draw: { n: 3 }
tags: [guard, stagger, draw]
note: "Never dead: defence when it matters, cards when it doesn't. Uses the existing engine condition target_intends_attack (types.ts). Intents are attacks ≈ 70% of the time: 0.7 × (8 + 2.4) + 0.3 × 6 = 9.1 d vs 8.5 (+7%). Upgrade +3 Guard / +1 draw (12.1 d)."
```

```card
id: furnace_heart
name: Furnace Heart
cls: breaker
type: power
rarity: uncommon
cost: 1
target: self
keywords: []
text: "At the start of your turn, gain {status} Onslaught."
effects:
  - status: { target: self, id: furnace_heart, amount: 1 }
upgrade:
  keywords: [innate]
  text: "Opening. At the start of your turn, gain {status} Onslaught."
tags: [swing, scaling]
note: "Every turn starts one Attack into the chain. Start-of-turn Onslaught raises every +per card that turn (≈ 1.5 +per cards × per 2 = 3 d) — more than the table's 2 d for a mid-turn gain (§F.6): 3 × 3 = 9 d vs 8.5. Not Demon Form: it does not accumulate (Onslaught still resets), except up to your keep value (Kept Fury, Smouldering Core). Upgrade Opening (1 of 2 Opening cards)."
```

```card
id: crossed_blades
name: Crossed Blades
cls: breaker
type: power
rarity: uncommon
cost: 1
target: self
keywords: []
text: "You can prime {status} additional Riposte card."
effects:
  - status: { target: self, id: riposte_capacity, amount: 1 }
upgrade:
  cost: 0
tags: [riposte]
note: "Card version of Parry Charm (same status, stacks to the cap of 3). A second rack slot pays on turns with 2 enemy attacks and 2 Riposte cards held (≈ 0.4 of turns in a Duellist deck) × ≈ 8 d = 3.2 d/turn × 3 = 9.6 d vs 8.5. With Duelist's Oath every slot fires twice. Upgrade cost 0."
```

```card
id: parry_ledger
name: Parry Ledger
cls: breaker
type: power
rarity: uncommon
cost: 1
target: self
keywords: []
text: "Whenever one of your Ripostes triggers, draw {status} more card next turn."
effects:
  - status: { target: self, id: parry_ledger, amount: 1 }
upgrade:
  cost: 0
tags: [riposte, draw]
note: "Makes holding card-neutral: the held card is replaced next turn. ≈ 0.8 triggers per enemy phase in a Duellist deck × 3 d = 2.4 d/turn × 3 = 7.2 d vs 8.5 (−15%; a 6+ turn fight pays it back). Draws at player turn start step 4, before the normal 5; counts toward cap_draw. Upgrade cost 0 (+4.25 d)."
```

```card
id: anvil_heart
name: Anvil Heart
cls: breaker
type: power
rarity: uncommon
cost: 1
target: self
keywords: []
text: "When an enemy attack ends and you lost no HP to it, gain {status} Onslaught."
effects:
  - status: { target: self, id: anvil_heart, amount: 1 }
upgrade:
  cost: 0
tags: [guard, swing]
note: "The Bulwark→Swing bridge: a fully absorbed attack loads your next turn (enemy-phase Onslaught carries over, GDD §2.1). Bulwark deck ≈ 1.2 attacks per phase × 70% fully absorbed ≈ 0.85 Onslaught at 3 d = 2.5 d/turn × 3 = 7.6 d vs 8.5 (−10%). Hook onEnemyMoveEnd (same as Dampener Coil). Upgrade cost 0."
```

```card
id: fault_reader
name: Fault Reader
cls: breaker
type: power
rarity: uncommon
cost: 1
target: self
keywords: []
text: "At the start of your turn, apply {status} Exposed to the lowest-HP enemy."
effects:
  - status: { target: self, id: fault_reader, amount: 1 }
upgrade:
  keywords: [innate]
  text: "Opening. At the start of your turn, apply {status} Exposed to the lowest-HP enemy."
tags: [exposed]
note: "Steady Exposed 1 on the focus target every turn (it decays 1 at the end of that enemy's turn, so it never runs away), which also covers your Riposte hits. Deterministic target (lowest HP, ties leftmost — the Timeline Spool rule) instead of random (commandment 18). 3 d/turn × 3 = 9 d vs 8.5. Upgrade Opening (2 of 2 Opening cards)."
```

---
## 4. Rares (12) — 4 Attacks, 5 Skills, 3 Powers

Rares are payoffs and rule-breakers: cancel an attack, prime past capacity, keep Onslaught between turns, turn Guard into energy or reflected damage, and one card that leaves the deck to become a permanent effect.

| id | Name | Type | Cost | Text (→ upgraded) | Arch | Price |
|---|---|---|---|---|---|---|
| `jackhammer` | Jackhammer | Attack | 1 | Spend all Onslaught: deal 4 damage, +1 hit per Onslaught spent. (→ 5) | S G | N=3: 16 − 6 = 10 vs 10 |
| `steal_the_swing` | Steal the Swing | Attack | 1 | Scrap. Deal 10 damage. Riposte: cancel the attack. (→ 14 / then deal 8) | D | rule-break, once per combat |
| `iron_avalanche` | Iron Avalanche | Attack | 2 | Keep. Deal damage equal to your defence to ALL enemies. Lose all Guard. (→ then gain 8 Block) | B | defence 20: 25 − 7 = 18 vs 18 |
| `endless_maul` | Endless Maul | Attack | 1 | Deal 6 damage, +2 per Onslaught. If Onslaught ≥ 4: add a copy to your hand. (→ 8) | S | 9 + 0.9 = 9.9 vs 10 |
| `forge_oath` | Forge Oath | Skill | 0 | Scrap. Gain 2 Onslaught. Remove this from your deck. Later combats start with 2 more Onslaught. (→ 3 / 3) | S (run) | becomes a relic |
| `en_garde` | En Garde | Skill | 1 | Prime up to 2 Riposte cards from your hand now, past capacity. (→ draw 1 first) | D | ≈ 1.3 extra Ripostes × 8 = 10.4 |
| `vent_pressure` | Vent Pressure | Skill | 1 | Spend 4 Onslaught: gain 2 energy and draw 2 cards. (→ Spend 3) | S | 20 − 8 = 12 vs 10 (dead below 4) |
| `iron_rhythm` | Iron Rhythm | Skill | 1 | Draw 2 cards. This turn, Skills also add 1 Onslaught (this one too). (→ draw 3) | S B | 6 + 2 + 3 = 11 vs 10 |
| `shed_plating` | Shed Plating | Skill | 0 | If you have 8+ Guard: lose 8, gain 1 energy, draw 2 cards. (→ draw 3) | B S | 7 + 6 − 8 = 5 vs 5 |
| `smouldering_core` | Smouldering Core | Power | 2 | At the end of your turn, keep up to 4 Onslaught. (→ cost 1) | S | 3.5 × 2 = 7/turn × 3 = 21 vs 20 |
| `recoil_spring` | Recoil Spring | Power | 1 | When a primed card fires, it comes back to your hand next turn. (→ cost 0) | D | ≈ 4/turn × 3 = 12 vs 10 |
| `reactive_plate` | Reactive Plate | Power | 2 | Whenever Guard absorbs damage from a hit, deal that much to the attacker. (→ cost 1) | B | ≈ 8/turn × 3 = 24 vs 20 |

```card
id: jackhammer
name: Jackhammer
cls: breaker
type: attack
rarity: rare
cost: 1
target: enemy
keywords: []
text: "Spend all Onslaught: deal {damage} damage, +{times_per} hit per Onslaught spent."
effects:
  - spend_status:
      id: onslaught
      n: all
      effects:
        - damage: { amount: 4, times: { base: 1, per: 1, scale: spent }, target: target }
upgrade:
  effects:
    - spend_status:
        id: onslaught
        n: all
        effects:
          - damage: { amount: 5, times: { base: 1, per: 1, scale: spent }, target: target }
tags: [swing, finisher, multihit, exposed]
note: "The many-hits finisher, the mirror of Hammerfall's one big hit: spend the chain into hits, so every Exposed stack, Glass Spurs and Fracture Engine multiply it — and Stagger on you guts it. That is the trade-off between the two finishers. Hits = 1 + spent. N = 3 (≈ expected late in a floor-30 chain): 16 − 2N = 10 d vs 10. N = 4: 20 − 8 = 12 (+20%); with Exposed 2: 30. At 0 Onslaught it is one 4-damage hit (§F.2). Upgrade +1 per hit."
```

```card
id: steal_the_swing
name: Steal the Swing
cls: breaker
type: attack
rarity: rare
cost: 1
target: enemy
keywords: [riposte, exhaust]
text: "Scrap. Deal {damage} damage. Riposte: cancel the attack."
effects:
  - damage: { amount: 10, target: target }
riposte:
  - custom: { fn: cancel_attack }
upgrade:
  text: "Scrap. Deal {damage} damage. Riposte: cancel the attack, then deal {rdamage} damage to it."
  effects:
    - damage: { amount: 14, target: target }
  riposte:
    - custom: { fn: cancel_attack }
    - damage: { amount: 8, target: attacker, key: rdamage }
tags: [riposte, cancel]
note: "Rule-break: the parry fantasy at its purest — the triggering attack is cancelled exactly as if the Riposte had killed the attacker (no hits, none of its other effects, GDD §2.2). It answers the Breaker's fear, the big single hit (Act 3 peaks 50–55). Bounded: Scrap means once per combat (Recoil Spring cannot return it; Duelist's Oath lets it cancel two attacks, then it Scraps). Played: 10 d vs 10 × 1.35 (Scrap) = 13.5 — under, because the value is the Riposte (one cancelled attack ≈ 20–50 d). Upgrade +4 played, +8 Riposte damage."
```

```card
id: iron_avalanche
name: Iron Avalanche
cls: breaker
type: attack
rarity: rare
cost: 2
target: all_enemies
keywords: [retain]
text: "Keep. Deal damage equal to your defence to ALL enemies. Lose all Guard."
effects:
  - damage: { amount: { base: 0, per: 1, scale: defence }, target: all_enemies }
  - lose_guard: { amount: all }
upgrade:
  text: "Keep. Deal damage equal to your defence to ALL enemies. Lose all Guard. Gain {block} Block."
  effects:
    - damage: { amount: { base: 0, per: 1, scale: defence }, target: all_enemies }
    - lose_guard: { amount: all }
    - block: { amount: 8 }
tags: [guard, defence, aoe, finisher]
note: "Bulwark's cash-out: bank for turns (Keep holds it until the bank is big), then spend the bank as one AoE hit per enemy. Defence is read before the Guard is lost. Floor 30 Bulwark defence at play ≈ 20 (Block 8 + Guard 12): AoE 20 per target = 20 / 0.8 = 25 d, minus the lost Guard's remaining value (≈ 12 × 0.6 = 7) = 18 d vs 2 × 10 × 0.9 (Keep) = 18. A 40-defence turn makes it a pack wipe at the price of your whole bank. Upgrade +8 Block after (+10 d). Bastion Core does not see this loss (it is not the halving)."
```

```card
id: endless_maul
name: Endless Maul
cls: breaker
type: attack
rarity: rare
cost: 1
target: enemy
keywords: []
values: { min: 4 }
text: "Deal {damage} damage, +{damage_per} per Onslaught. If Onslaught ≥ {min}: add a copy to your hand."
effects:
  - damage: { amount: { base: 6, per: 2, scale: { status: onslaught } }, target: target }
  - conditional:
      if: { type: has_status, who: self, id: onslaught, min: 4 }
      then:
        - add_card: { card: endless_maul, to: hand }
upgrade:
  effects:
    - damage: { amount: { base: 8, per: 2, scale: { status: onslaught } }, target: target }
    - conditional:
        if: { type: has_status, who: self, id: onslaught, min: 4 }
        then:
          - add_card: { card: endless_maul, to: hand, upgraded: true }
tags: [swing, scaling]
note: "Rule-break: past Onslaught 4 the swing turn keeps going as long as you have energy (14, 16, 18…). Bounded by energy (each copy costs 1; bonus energy cap 4), cap_to_hand (4 per turn) and the copies being created cards (gone after combat). Spending Onslaught (Vent Pressure, finishers) stops it, so no loop forms with the class's energy cards. 6 + 2 × 1.5 = 9 d, + copy ≈ P(≥ 4 ≈ 0.3) × 3 = 0.9 → 9.9 d vs 10. Upgrade +2 base (copies upgraded too)."
```

```card
id: forge_oath
name: Forge Oath
cls: breaker
type: skill
rarity: rare
cost: 0
target: self
keywords: [exhaust]
text: "Scrap. Gain {status} Onslaught. Remove this from your deck. Later combats start with {run_flag} more Onslaught."
effects:
  - status: { target: self, id: onslaught, amount: 2 }
  - run_flag: { key: oath_onslaught, delta: 2 }
  - custom: { fn: remove_self_from_deck }
upgrade:
  effects:
    - status: { target: self, id: onslaught, amount: 3 }
    - run_flag: { key: oath_onslaught, delta: 3 }
    - custom: { fn: remove_self_from_deck }
tags: [swing, run, removal]
note: "Run card: the first time you play it, it leaves your deck and becomes a permanent effect, like a relic (engine: at combat start, gain Onslaught = run counter oath_onslaught; §D). Removal follows the Prune away rule (confirmation prompt, event card_removed) and counts toward cap_prune_away (RULINGS 7). Value: 2 Onslaught now (4 d; 0-cost rare rate 5, one-use Scrap +50%); then +2 Onslaught on turn 1 of every later combat (≈ 2 × 3 = 6 d per combat, front-loading Act 1's burst checks) and a thinner deck (≈ one 75-gold removal). Best taken early; at floor 45 it is a 0-cost '+2 Onslaught, Scrap'. Two copies stack. Upgrade 3/3."
```

```card
id: en_garde
name: En Garde
cls: breaker
type: skill
rarity: rare
cost: 1
target: none
keywords: []
values: { prime: 2 }
text: "Prime up to {prime} Riposte cards from your hand now, past capacity."
effects:
  - custom: { fn: prime_from_hand }
upgrade:
  text: "Draw {draw} card. Prime up to {prime} Riposte cards from your hand now, past capacity."
  effects:
    - draw: { n: 1 }
    - custom: { fn: prime_from_hand }
tags: [riposte]
note: "Rule-break: priming mid-turn and past capacity. The rack still holds at most 3 (cap_primes); the end-of-turn prime step then fills your normal capacity from what is left, so capacity 1 + En Garde ends the turn with 3 primed. Each primed card fires on a different enemy attack (one per attack); unfired ones fizzle. Pays in packs and with Duelist's Oath: ≈ 1.3 extra Riposte triggers × 8 d = 10.4 d vs 10. Dead without Riposte cards in hand (build-around). Upgrade: draw 1 first (+3 d)."
```

```card
id: vent_pressure
name: Vent Pressure
cls: breaker
type: skill
rarity: rare
cost: 1
target: none
keywords: []
text: "Spend {spend} Onslaught: gain {energy} energy and draw {draw} cards."
effects:
  - spend_status:
      id: onslaught
      n: 4
      effects:
        - energy: { n: 2 }
        - draw: { n: 2 }
upgrade:
  effects:
    - spend_status:
        id: onslaught
        n: 3
        effects:
          - energy: { n: 2 }
          - draw: { n: 2 }
tags: [swing, energy, draw]
note: "Rule-break: a second chain in one turn — but it restarts at Onslaught 0, so it is a choice between one long ramp and two short ones. 2 energy (14) + 2 draw (6) = 20 d; − 2N (8) = 12 d vs 10 (+20%), paid by 'playable only if Onslaught ≥ 4' (dead otherwise) and the reset. Loop check (commandment 17): with Stormbreak Gem (rare relic) a turn can reach 6 → +1 energy, spend 4 → +2; bonus energy is capped at 4 and there is one Vent per draw. Upgrade Spend 3."
```

```card
id: iron_rhythm
name: Iron Rhythm
cls: breaker
type: skill
rarity: rare
cost: 1
target: none
keywords: []
text: "Draw {draw} cards. This turn, Skills also add {status} Onslaught (this one too)."
effects:
  - draw: { n: 2 }
  - status: { target: self, id: iron_rhythm, amount: 1 }
upgrade:
  effects:
    - draw: { n: 3 }
    - status: { target: self, id: iron_rhythm, amount: 1 }
tags: [swing, guard, draw]
note: "Rule-break of the Onslaught rule for one turn: Guard and Riposte Skills now fuel the swing, so a Bulwark hand becomes a chain (Brace, Rivet Wall, Cool the Steel all add +1). Counts itself because the status exists when its own play finishes. 6 (draw) + 2 (itself) + ≈ 1.5 later Skills × 2 = 11 d vs 10. Upgrade +1 draw."
```

```card
id: shed_plating
name: Shed Plating
cls: breaker
type: skill
rarity: rare
cost: 0
target: self
keywords: []
text: "If you have {lose_guard}+ Guard: lose {lose_guard}, gain {energy} energy, draw {draw} cards."
effects:
  - conditional:
      if: { type: compare, left: { scale: guard }, op: '>=', right: 8 }
      then:
        - lose_guard: { amount: 8 }
        - energy: { n: 1 }
        - draw: { n: 2 }
upgrade:
  effects:
    - conditional:
        if: { type: compare, left: { scale: guard }, op: '>=', right: 8 }
        then:
          - lose_guard: { amount: 8 }
          - energy: { n: 1 }
          - draw: { n: 3 }
tags: [guard, energy, draw]
note: "The Bulwark→Swing bridge at rare: a hold turn's bank pays for the swing turn. +1 energy (7) + 2 draw (6) − 8 Guard (8) = 5 d vs 5 (0-cost rare). Guard is lost, not spent through a hit, so Reactive Plate and Bastion Core don't see it. Not a loop: one copy, and Guard costs energy to make. Upgrade +1 draw (8 d)."
```

```card
id: smouldering_core
name: Smouldering Core
cls: breaker
type: power
rarity: rare
cost: 2
target: self
keywords: []
text: "At the end of your turn, keep up to {status} Onslaught."
effects:
  - status: { target: self, id: onslaught_keep, amount: 4 }
upgrade:
  cost: 1
tags: [swing, scaling]
note: "The banking rare GDD §2.1 names: uses onslaught_keep (max of sources; supersedes Kept Fury's 2). Swing turns end at 4–6, so ≈ 3.5 Onslaught starts each later turn: 3.5 × 2 = 7 d/turn × 3 = 21 d vs 20. Not Demon Form: the kept amount is capped at 4 and is lost the turn you don't refill it. With Heavy Heart (halves instead) the larger result wins (§F.9). Upgrade cost 1."
```

```card
id: recoil_spring
name: Recoil Spring
cls: breaker
type: power
rarity: rare
cost: 1
target: self
keywords: []
text: "When a primed card fires, it comes back to your hand next turn."
effects:
  - status: { target: self, id: recoil_spring, amount: 1 }
upgrade:
  cost: 0
tags: [riposte, draw]
note: "Rule-break: your best Riposte card comes back to be held again, so a Duellist deck parries every turn. Returns at player turn start step 4 (before the draw), from the discard pile; counts toward cap_to_hand (4). Scrap cards still Scrap (Steal the Swing never returns). With Duelist's Oath a card returns after its last firing. Bounded by enemy attacks — one firing per attack — so no loop. ≈ 0.8 returns/turn ≈ a free draw of your best card (≈ 4 d) → 12 d over 3 turns vs 10. Upgrade cost 0."
```

```card
id: reactive_plate
name: Reactive Plate
cls: breaker
type: power
rarity: rare
cost: 2
target: self
keywords: []
text: "Whenever Guard absorbs damage from a hit, deal that much to the attacker."
effects:
  - status: { target: self, id: reactive_plate, amount: 1 }
upgrade:
  cost: 1
tags: [guard, damage]
note: "Gives the Guard stall a clock, so it does not lose to Act 3's race boss by default — but only while enemies keep hitting you (a buff/charge boss starves it). Each reflection is one player hit (Exposed applies; it can kill mid-attack and stop the rest). Block absorbs first, so it rewards Guard over Block. Floor-30 Bulwark: Guard absorbs ≈ 8 per enemy phase → 8 d/turn × 3 = 24 d vs 20 (+20%). Stacks (amount × absorbed). Upgrade cost 1."
```

---
## A. Archetype matrix

S = Swing, D = Duellist, B = Bulwark, G = Glue (RULINGS 30: Glue counts as an archetype). Generated from the tables above.

| Card | Rarity | Type | Cost | S | D | B | G |
|---|---|---|---|---|---|---|---|
| Hew | starter | attack | 1 | ● |  |  |  |
| Bulwark | starter | skill | 1 |  |  | ● |  |
| Shoulder Check | starter | attack | 1 | ● | ● |  |  |
| Brace | starter | skill | 1 |  |  | ● |  |
| Piston Jab | common | attack | 0 | ● |  |  | ● |
| Chain Driver | common | attack | 1 | ● |  |  | ● |
| Overhand Drive | common | attack | 2 | ● |  |  |  |
| Breach Hammer | common | attack | 1 | ● |  |  |  |
| Thresher Arc | common | attack | 1 | ● |  |  |  |
| Fault Line | common | attack | 1 |  | ● |  | ● |
| Rivet Flurry | common | attack | 1 |  |  |  | ● |
| Counterweight | common | attack | 1 |  | ● |  |  |
| Plate Ram | common | attack | 1 |  |  | ● |  |
| Return Stroke | common | attack | 1 | ● | ● |  |  |
| Gauntlet Tap | common | attack | 0 | ● |  | ● |  |
| Catch Blade | common | skill | 1 |  | ● | ● |  |
| Cool the Steel | common | skill | 1 | ● |  | ● |  |
| Find the Seam | common | skill | 0 |  | ● |  | ● |
| Read the Line | common | skill | 1 | ● |  |  | ● |
| Pivot Sweep | common | skill | 1 |  | ● |  |  |
| Rivet Wall | common | skill | 2 |  |  | ● |  |
| Planted Feet | common | skill | 1 |  |  | ● | ● |
| Loaded Spring | common | skill | 1 | ● | ● |  |  |
| Sabre Rattle | common | skill | 1 |  |  |  | ● |
| Hammerfall | uncommon | attack | 2 | ● |  |  |  |
| Piston Volley | uncommon | attack | 1 | ● |  |  | ● |
| Answering Steel | uncommon | attack | 1 |  | ● |  |  |
| Rampart Crash | uncommon | attack | 1 |  |  | ● |  |
| Coiled Strike | uncommon | attack | 2 |  | ● |  |  |
| Seam Ripper | uncommon | attack | 0 | ● |  |  | ● |
| Quake Hammer | uncommon | attack | 1 | ● |  |  |  |
| Prism Edge | uncommon | attack | 1 |  |  |  | ● |
| Feint Step | uncommon | skill | 0 |  | ● |  |  |
| Bind the Blade | uncommon | skill | 1 | ● | ● |  |  |
| Anneal | uncommon | skill | 1 |  |  | ● |  |
| Quench | uncommon | skill | 1 | ● |  | ● |  |
| Ride the Surge | uncommon | skill | 1 | ● |  |  | ● |
| Hairline Mark | uncommon | skill | 1 |  |  |  | ● |
| Read the Blow | uncommon | skill | 1 |  | ● | ● |  |
| Furnace Heart | uncommon | power | 1 | ● |  |  |  |
| Crossed Blades | uncommon | power | 1 |  | ● |  |  |
| Parry Ledger | uncommon | power | 1 |  | ● |  | ● |
| Anvil Heart | uncommon | power | 1 | ● |  | ● |  |
| Fault Reader | uncommon | power | 1 |  |  |  | ● |
| Jackhammer | rare | attack | 1 | ● |  |  | ● |
| Steal the Swing | rare | attack | 1 |  | ● |  |  |
| Iron Avalanche | rare | attack | 2 |  |  | ● |  |
| Endless Maul | rare | attack | 1 | ● |  |  |  |
| Forge Oath | rare | skill | 0 | ● |  |  |  |
| En Garde | rare | skill | 1 |  | ● |  |  |
| Vent Pressure | rare | skill | 1 | ● |  |  |  |
| Iron Rhythm | rare | skill | 1 | ● |  | ● |  |
| Shed Plating | rare | skill | 0 | ● |  | ● |  |
| Smouldering Core | rare | power | 2 | ● |  |  |  |
| Recoil Spring | rare | power | 1 |  | ● |  |  |
| Reactive Plate | rare | power | 2 |  |  | ● |  |
| **Total** | | | | **28** | **18** | **17** | **16** |

Every archetype has ≥ 10 cards (S 28, D 18, B 17, G 16; Swing is the widest because cheap Attacks fuel it). **11 of 20 commons (55%) fit two archetypes** (target ≥ 30%): Piston Jab, Chain Driver, Fault Line, Return Stroke, Gauntlet Tap, Catch Blade, Cool the Steel, Find the Seam, Read the Line, Planted Feet, Loaded Spring. Bridges between archetypes: Riposte → Onslaught for your next turn (Return Stroke, Loaded Spring, Bind the Blade, Riven Gauntlet); Onslaught → Guard (Cool the Steel, Quench, Chain Wraps); Guard/defence → Onslaught, energy or damage (Anvil Heart, Shed Plating, Iron Rhythm, Rampart Crash, Reactive Plate).

## B. Histograms

### B.1 Rarity × type
| | Attack | Skill | Power | Total |
|---|---|---|---|---|
| Starter | 2 | 2 | 0 | 4 |
| Common | 11 | 9 | 0 | 20 |
| Uncommon | 8 | 7 | 5 | 20 |
| Rare | 4 | 5 | 3 | 12 |
| **Total** | **25 (44.6%)** | **23 (41.1%)** | **8 (14.3%)** | **56** |

### B.2 Cost
| Cost | Starter | Common | Uncommon | Rare | Total |
|---|---|---|---|---|---|
| 0 | 0 | 3 | 2 | 2 | 7 |
| 1 | 4 | 15 | 16 | 7 | 42 |
| 2 | 0 | 2 | 2 | 3 | 7 |
| X | 0 | 0 | 0 | 0 | 0 |

Upgrades to cost 0: Crossed Blades, Parry Ledger, Anvil Heart, Recoil Spring. Upgrades to cost 1: Smouldering Core, Reactive Plate.

### B.3 Keyword budgets and text length
- **Riposte** 11: Shoulder Check, Counterweight, Return Stroke, Catch Blade, Pivot Sweep, Loaded Spring, Answering Steel, Coiled Strike, Feint Step, Bind the Blade, Steal the Swing.
- **Keep** 2 (≤ 3): Hammerfall, Iron Avalanche. **Opening** 2 (≤ 2), both on upgrade: Furnace Heart+, Fault Reader+. **Scrap** 2: Steal the Swing, Forge Oath. **Ethereal** 0.
- **Run / Shards cards** (2): Prism Edge (scales with Shards held), Forge Oath (removes itself from the deck for a permanent effect).
- Rendered text over 70 characters (with 2-digit numbers): Iron Avalanche+ 86, Forge Oath 97, Bind the Blade 82, and 11 others at 71–78 (Shoulder Check is verbatim from the GDD at 75). All are Riposte cards with two effect lists, or rares with a run effect. Everything else is ≤ 70.

## C. `custom` fns (3 of the 5 allowed)

| fn | Used by | Behaviour (must be unit-tested) |
|---|---|---|
| `cancel_attack` | `steal_the_swing` (riposte list) | Cancels the triggering enemy attack exactly as when a Riposte kills the attacker (GDD §2.2): none of its hits and none of its other effects resolve; its move ends and it picks its next intent as normal. Only valid inside a `riposte` list. Works on bosses: this is a once-per-combat parry (Scrap), not a Halt (RULINGS 8 is about skipped moves; flagged in §F.12). |
| `remove_self_from_deck` | `forge_oath` | Removes this card's run-deck copy permanently (event `card_removed`, confirmation prompt as with Prune away). Counts toward `cap_prune_away` (RULINGS 7). The combat copy is Scrapped by the card's Scrap keyword. |
| `prime_from_hand` | `en_garde` | `pendingChoice` from hand: 0..`values.prime` Riposte cards. Moves them to the end of `CombatState.primed`, in the order chosen, without using prime capacity. The rack never exceeds `TUNING.caps.primeCapacity` (3), so the choice max is `min(prime, 3 − primed.length)`. |

Guard loss is **not** a custom fn: Iron Avalanche and Shed Plating use a proposed primitive `lose_guard { amount: N | half | all }` (§D.1).

## D. New statuses and engine asks

### D.1 Asks beyond GDD §9 (each minimal)
1. **Amount scales** `defence` (Block + Guard, GDD §2.3) and `guard` (Guard only). Used by Plate Ram, Planted Feet, Rampart Crash, Iron Avalanche, Shed Plating.
2. **Effect `lose_guard { amount: N | half | all, target? }`**: the inverse of `guard`. It ignores Guard-gain modifiers, fires no `onGuardDecay`, and contributes the `{lose_guard}` placeholder.
3. **Target `attacker`** in `riposte` lists (implied by GDD §2.2), and **target `lowest_hp_enemy`** (ties leftmost; Fault Reader; the same selector Timeline Spool needs).
4. **`CardDef.upgrade` may carry `riposte`** (today's `Pick` lists cost/text/effects/keywords/name/target only).
5. **Text**: the visitor walks `riposte` lists and `spend_status.effects`; `spend_status` contributes `{spend}` (its n), `run_flag` contributes `{run_flag}` (its delta), `lose_guard` contributes `{lose_guard}`; `{<key>_per}` per RULINGS 22.
6. **Hook `onGuardAbsorbed { amount, attacker }`** at pipeline step 6 (Reactive Plate).
7. **Run counter `oath_onslaught`**, read at combat start after relic `onCombatStart`: the player gains that much Onslaught (Forge Oath).
8. Already in the engine and used as-is: conditions `compare`, `target_intends_attack`, `has_status {who: target}`; effect `add_card` (Endless Maul).

### D.2 Status definitions needed (Powers and one-turn effects)
| id | Stacks | Decay | Hook | Rule |
|---|---|---|---|---|
| `furnace_heart` | amount | never | `onTurnStart` (player) | Gain Onslaught = stacks. |
| `parry_ledger` | amount | never | `onRiposteTriggered` → hidden counter `ledger_draw += stacks`; player `onTurnStart` → draw counter, reset | Draw lands at player turn start step 4 (before the normal 5); counts toward `cap_draw`. |
| `anvil_heart` | amount | never | `onEnemyMoveEnd {hpLostThisMove}` | If the move was an enemy attack on you and `hpLostThisMove == 0`: gain Onslaught = stacks (carries into your turn). |
| `fault_reader` | amount | never | player `onTurnStart` | Apply Exposed = stacks to `lowest_hp_enemy`. |
| `recoil_spring` | flag | never | `onRiposteTriggered` → mark uid; player `onTurnStart` → move marked cards from discard to hand | Counts toward `cap_to_hand` (RULINGS 10). A card with Scrap is not marked. With Duelist's Oath it is marked after its last firing. |
| `reactive_plate` | amount | never | `onGuardAbsorbed` | Deal (absorbed × stacks) to the attacker as one player hit (pipeline from step 1). |
| `iron_rhythm` | amount | `end_player_turn`, all | `afterCardPlayed` (type skill) | Gain Onslaught = stacks (the applying card counts itself). |
| `guard_hold` | flag | removed after use | `guardDecay` modifier | The next player-turn-start halving loses 0, then the status is removed. |

Existing statuses reused: `onslaught`, `onslaught_keep` (Smouldering Core, max of sources), `riposte_capacity` (Crossed Blades), `exposed`, `stagger`. Played Powers leave play entirely (RULINGS 5); none of these cards reads Scrap or discard events for Powers.

## E. Example decks and expected throughput

### E.1 Method
I used a small throughput model, not the engine (script kept out of the repo). It models one target with infinite HP, intents sampled per act, and a player who searches every play order of the hand (including draws) and keeps the best line. The scoring is damage − 1.6 × HP lost + 0.6 × Guard carried + 3 × Onslaught carried. It models Riposte priming and firing, Riven Gauntlet, Guard halving, Exposed/Stagger decay, and the relics named per deck. 300 combats × 7 turns per deck. Intents: floor 15 (A1 boss) averages 18 a turn (20% non-attack, 1×22, 2×11, 4×6); floor 30 averages 26 (1×32, 2×16, 4×9); floor 45 averages 32 (1×40, 2×20, 5×8). **Calibration:** the starter deck against floor-1 enemies gives 12.2 damage / 8.0 defence a turn, against GDD §8.2's 13 / 6. AoE value is not captured (single target), so Thresher Arc, Quake Hammer, Pivot Sweep and Iron Avalanche are undervalued here. "Value" = damage + damage prevented. E3/E4 = 3 or 4 energy; floor-30/45 decks usually hold a +1-energy boss relic.

### E.2 Results (dmg / Block+Guard gained per turn; GDD §8.2 Breaker targets: f15 24/13, f30 38/20, f45 55/28)

| # | Deck (floor) | Cards | Relics | E3 dmg / def | E4 dmg / def | HP lost/turn (E3) |
|---|---|---|---|---|---|---|
| D1 | **Swing, f15** — 4 Hew, 4 Bulwark, Shoulder Check+, Brace, Piston Jab, Chain Driver, Overhand Drive+, Thresher Arc, Cool the Steel | 15 | Riven Gauntlet, Chain Wraps | **14.0 / 9.5** | — | 9.1 |
| D2 | **Duellist, f15** — 4 Hew, 3 Bulwark, Shoulder Check, Brace, Counterweight, Catch Blade, Return Stroke, Fault Line, Loaded Spring+, Crossed Blades | 15 | Riven Gauntlet, Notched Buckler | **14.3 / 14.2** | — | 3.2 |
| D3 | **Bulwark, f30** — 3 Hew, 3 Bulwark, Shoulder Check+, Brace+, Rivet Wall, Plate Ram+, Planted Feet, Cool the Steel, Anneal, Rampart Crash+, Quench, Read the Blow, Anvil Heart, Reactive Plate, Gauntlet Tap, Catch Blade, Iron Avalanche | 21 | Riven Gauntlet, Bulwark Rivets, Slow-Temper Alloy, Notched Buckler | **23.6 / 19.4** | 28.5 / 22.0 | 8.0 |
| D4 | **Swing + Exposed, f30** — 2 Hew, 3 Bulwark, Shoulder Check+, Brace, Piston Jab+, Piston Jab, Rivet Flurry, Fault Line+, Hammerfall+, Piston Volley, Hairline Mark, Seam Ripper, Ride the Surge, Furnace Heart, Read the Line, Cool the Steel, Sabre Rattle | 20 | Riven Gauntlet, Kept Fury, Glass Spurs, Chain Wraps | **41.4 / 7.1** | 55.6 / 8.7 | 19.6 |
| D5 | **Swing + Duellist, f45** — Hew, 2 Bulwark, Shoulder Check+, Brace+, Piston Jab+, Chain Driver+, Return Stroke+, Loaded Spring+, Answering Steel+, Coiled Strike+, Bind the Blade, Hammerfall+, Jackhammer+, Crossed Blades, Smouldering Core+, Vent Pressure, Endless Maul, Cool the Steel+, Hairline Mark+, Read the Line, Catch Blade+ | 22 | Riven Gauntlet, Parry Charm, Kept Fury, Stormbreak Gem, Glass Spurs | **57.3 / 12.2** | 75.6 / 13.6 | 18.7 |

Archetype baselines at floor 30, E3 (value = damage + damage prevented): Swing without Exposed **35.5** (25.0 / 11.0), Duellist **37.6** (17.4 / 16.5), Bulwark without its rare **34.9** (17.3 / 18.2), Bulwark with Reactive Plate 42.0, Swing + Exposed 48.2. Starter at floor 1: 19.9. Measured Onslaught when an Attack is played: 1.0 (f15 Swing), 3.4 (f30 Swing), 4.5 (f45), against GDD §8.3's 1.5 / 2.5 / 3.5.

### E.3 Reading
- **Floor 15 is below target** (14 damage against 24) for both 15-card decks, and a stronger 17-card deck with 2 removals and 7 picks reached 19–22. The floor-15 target needs about 12 d per energy, while pricing-compliant commons give 7 and the deck is still two-thirds starters. Either the §8.2 floor-15 row is optimistic, or the real engine's potions, AoE and multi-enemy fights close the gap. **This is the first number the engine simulator should check** (§F.11).
- **Floor 30/45 are on target at 3 energy** for the Swing hybrids (D4 41 vs 38, D5 57 vs 55). With a +1-energy boss relic they run 30–45% over, so the targets presumably assume about 3.3 effective energy. Defence is under target for those decks by design: they are glass cannons that lose ≈ 19 HP a turn, and a human would trade damage for Guard.
- **Archetype parity** (floor 30, E3): Swing 35.5, Duellist 37.6, Bulwark 34.9 are within 8% of each other; the Swing + Exposed synergy deck is about 30% above (strongest, with its Glass Spurs relic, and fragile).
- **Balance changes made from the model:**
  - Rampart Crash went from "2 + half your defence" to "4 + your Guard". Before the change the floor-30 Bulwark deck without Reactive Plate dealt 13 a turn and was 15% behind the other two archetypes.
  - Piston Volley went from 3 hits of 1 + per to 2 hits of 3 + per.
  - Hairline Mark went from 3 Exposed to 2 Exposed + draw. With those two at their old values the Swing + Exposed deck sat at 55 value, about 50% above the field.

## F. Ambiguities and the interpretation used

1. **Guard price.** §8.5's rate table (Guard 7/8/10 per energy) conflicts with its "Guard N = 1.2 × Block N" row. Resolved by RULINGS 3: the rate table wins, so 1 Guard ≈ 1 d.
2. **"Spend all Onslaught" at 0 Onslaught.** §2.1 says "Spend N: if Onslaught ≥ N… otherwise skip", which does not say what happens with 'all' at 0. *Used:* `n: all` always runs, with `spent` possibly 0. Hammerfall then deals 8 and Jackhammer 4×1, so the text never lies. If the lead rules that 'all' at 0 skips, both cards need their base damage moved outside the clause (two hits).
3. **"… instead" spend cards** are a `conditional` (`has_status min N`) whose `then` holds the `spend_status`, so the card always makes exactly one hit. An optional `else` on `spend_status` would be tidier; not asked for.
4. **AoE price.** Not in §8.5; I first used 1.3 × face, then aligned with RULINGS 15/29 (per-target number ≤ 0.8 × single-target rate).
5. **Riposte value base.** I read "1.0–1.3 × the card's played value" as the played value at its own cost and rarity, so a 0-cost Riposte card gets a ≈ 5 d Riposte at most. Holding a card costs no energy, so 2-cost Riposte cards (Coiled Strike) are the most efficient holds. That is intended by §2.2 but worth simulator attention.
6. **Onslaught gained before your turn** (start-of-turn Powers, enemy-phase Riposte gains) is worth more than §8.5's 2 d: it boosts every +per card that turn. *Used:* 3 d per Onslaught for those sources, 2 d for mid-turn gains.
7. **`attacks_played_this_turn`**: it is unclear whether it counts the card being resolved (Cadence appends at pay-cost time). *Avoided*: conditions use Onslaught, which never counts itself.
8. **`+Y per Onslaught` on Skills** (Cool the Steel) is priced like Attacks (1.5 Y). Skills don't add Onslaught themselves, so they read the chain without extending it.
9. **Heavy Heart + `onslaught_keep`**: one halves Onslaught, the other keeps up to N. *Used:* at reset, Onslaught = max(floor(ons / 2), min(ons, keep)).
10. **Exposed stacking is under-priced by §8.5 in multi-hit decks.** Exposed decays only 1 per enemy turn, so an applied stack of N is worth N + (N−1) + … stack-turns, and repeat applications pile up (measured ≈ 4 stacks at each multi-hit play in D4). I kept my Exposed cards at ≤ 2 stacks plus a rider, and my multi-hit cards at ≤ 4 hits. Suggest the lead revisit "Exposed 1 = 3 d" or Exposed decay before the simulator pass.
11. **§8.2 floor-15 Breaker damage (24)** looks unreachable for a pricing-compliant floor-15 deck in my model (14–22; see §E.3), while floors 30/45 match at 3 energy. I have not changed card rates to chase it; it is flagged for the engine simulator.
12. **Cancelling an attack on bosses.** RULINGS 8 makes bosses immune to Halt (skipping a whole move). Steal the Swing instead cancels one attack at declaration, which the Riposte rules already allow when the attacker dies. *Used:* it works on bosses, once per combat (Scrap). If the lead wants boss immunity here too, change the riposte to "cancel the attack unless it is a boss; against a boss, deal 20 damage to it instead".
13. **Fault Reader's target**: "the enemy with the lowest HP" uses the leftmost on ties, as Timeline Spool does. Lowest current HP, not percentage.
14. **Iron Rhythm counts itself**: the status exists when its own `afterCardPlayed` fires. The text says "(this one too)", so there is no special case.
