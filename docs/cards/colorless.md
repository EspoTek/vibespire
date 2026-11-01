# Vibespire — Colourless cards (20)

Status: v1, colourless card designer. Source of truth for mechanics is `docs/GDD.md`; this file only defines content. Colourless cards are bought in shops (1 uncommon + 1 rare per shop, §4.6), offered by `ev_assembly_line` and `pact_wanderer` (§4.2), and never appear in combat card rewards. Split here: **12 uncommon + 8 rare** (see "GDD ambiguities" at the end: §4.2 says 14/6).

> **v2 (2026-10-30):** 16 more colourless cards (the Strain, Salvage, Reserve and Reprise engines, plus Bait Flare) and the `fuse` token are specified in `docs/v2/shared-design.md` §4, implemented in `src/content/cards/colorless.ts`. RULINGS 60 sets the v2 split to 21 uncommon / 14 rare; that split is reached once Medbay Voucher is cut, which waits for the v2 baseline (ruling 55). Shops stock `TUNING.shopColorless` (3) colourless cards (ruling 61).

## Pricing conventions used in every note (GDD §8.5, colourless at −10%)

Colourless cards are priced **10% below the class rate at the same rarity**, because every class can buy them.

| | Damage / energy | Block / energy | Guard / energy | Budget in d per energy |
|---|---|---|---|---|
| Colourless uncommon (90% of 8.5 / 7 / 8) | 7.6 | 6.3 | 7.2 | **7.6 d** |
| Colourless rare (90% of 10 / 8 / 10) | 9 | 7.2 | 9 | **9 d** |

- **d** is one common damage-equivalent (§8.5). Conversions: 1 damage = 1 d. 1 Block = 1.17 d (6 Block = 7 d at common). **1 Guard = 1.0 d** (the rate table: 7 Guard = 7 d at common, and Brace 6 Guard sits beside Bulwark 5 Block; see ambiguity 3). Draw 1 = 3 d. +1 energy = 7 d. Exposed 1 = 3 d (4 d in multi-hit decks). Stagger 1 = 2 Block-eq = 2.33 d (3 Block-eq = 3.5 d against multi-hit). Lose HP = 1.5 d per HP.
- A 0-cost card is budgeted at 0.5 energy (3.8 d uncommon, 4.5 d rare).
- Budget modifiers: Scrap ×1.35 (×1.5 if you would only want it once); Keep ×0.9; Opening ×0.9; a Delay 1 payload is worth face ÷ 1.5; a Riposte list should be worth 1.0–1.3 × the played list. Power: 3 turns of its per-turn value ≈ cost × rate.
- **AoE**: face value × 1.6 (the expected number of living enemies across all fights, since bosses and many elites are single targets). The GDD gives no AoE multiplier (ambiguity 4).
- Status cards that these cards create: Jitter in hand ≈ −2 d (you can clear it for free by playing it last). Drift in hand ≈ −7 d (it costs 1 energy now or 1 energy next turn).
- "%" in a note means value ÷ budget.

## All 20 at a glance

| # | id | Name | Rarity | Type | Cost | Text (base → upgraded) | Role |
|---|---|---|---|---|---|---|---|
| 1 | `relay_ping` | Relay Ping | uncommon | skill | 0 | Draw 3 cards. Add a Jitter to your hand. → Draw 4 (Phase F; was draw 2, never picked) | Cheap draw with a cost |
| 2 | `shardfall` | Shardfall | uncommon | attack | 2 | Deal 16 damage, +2 per Shard you hold. → +3 per Shard (Phase F: no Scrap) | Burst · Shards |
| 3 | `arc_lattice` | Arc Lattice | uncommon | attack | 2 | Deal 7 damage, +3 per living enemy, to ALL enemies. → 9 (+3) (Phase F; was 4 + 2) | AoE |
| 4 | `salvage_kit` | Salvage Kit | uncommon | skill | 1 | Choose: gain 7 Block, draw 2 cards, or deal 5 damage to ALL enemies. → 10 / 3 / 8 | Choose-one utility |
| 5 | `stress_fracture` | Stress Fracture | uncommon | skill | 1 | Apply 3 Exposed to an enemy. Gain 2 Exposed. → 4 Exposed | Exposed applier |
| 6 | `gyro_jammer` | Gyro Jammer | uncommon | skill | 1 | Apply 1 Stagger per hit the enemy intends (max 3). → + Draw 1 card | Stagger applier |
| 7 | `ballast_lock` | Ballast Lock | uncommon | skill | 2 | Gain 10 Guard. Next turn, your Guard doesn't halve. → 14 Guard | Guard |
| 8 | `jettison_pod` | Jettison Pod | uncommon | skill | 0 | Keep. Gain 6 Guard. Scrap. → 9 Guard | Potion-like one-shot · Guard |
| 9 | `overdraft_cell` | Overdraft Cell | uncommon | skill | 0 | Gain 2 energy. Add a Drift to your hand. Scrap. → + Draw 1 card | Energy with Scrap |
| 10 | `star_survey` | Star Survey | uncommon | skill | 0 | Opening. Gain Augury. Draw 1 card. Scrap. → Draw 2 | Information (Augury) |
| 11 | `fault_beacon` | Fault Beacon | uncommon | skill | 1 | Delay 1: apply 2 Exposed to ALL enemies. → 3 Exposed | Delay for anyone · Exposed |
| 12 | `snare_line` | Snare Line | uncommon | skill | 1 | Gain 6 Block. Riposte: apply 3 Stagger to the attacker. → 8 / 4 | Riposte for anyone · Stagger |
| 13 | `cutting_torch` | Cutting Torch | rare | skill | 1 | Remove a card in your hand from your deck. Lose 3 Max HP. Scrap. → cost 0 | Run surgery |
| 14 | `medbay_voucher` | Medbay Voucher | rare | skill | 1 | Spend 35 gold: gain 3 Max HP. Scrap. → cost 0 | Max HP / healing with a real cost |
| 15 | `clean_manifest` | Clean Manifest | rare | attack | 2 | Deal 6 damage, +2 per card fewer than 20 in your deck. → +3 per card | Cares about deck size |
| 16 | `salvage_kiln` | Salvage Kiln | rare | power | 1 | At the end of your turn, deal 1 damage to ALL enemies for each card in your Scrapheap. → Opening (Phase F; see docs/v2/shared-design.md §14) | Build-around (Scrap) |
| 17 | `prism_resonance` | Prism Resonance | rare | power | 2 | At the start of your turn, gain 1 Guard per Shard you hold. → cost 1 | Build-around (Shard hoard) |
| 18 | `shard_cache` | Shard Cache | rare | skill | 0 | Gain 2 energy and 2 Shards. Remove this card from your deck. → 3 Shards | Grants Shards (bounded) |
| 19 | `mirror_tether` | Mirror Tether | rare | attack | 2 | Deal damage equal to the damage the enemy intends. Scrap. → 8 + that | Burst with Scrap (rare) |
| 20 | `grav_clamp` | Grav Clamp | rare | skill | 2 | The enemy skips its next move. Scrap. → Keep | Potion-like one-shot (rare) |

---

## Uncommon (12)

### 1. Relay Ping
```card
id: relay_ping
name: Relay Ping
cls: colorless
type: skill
rarity: uncommon
cost: 0
target: none
keywords: []
text: "Draw 2 cards. Add a Jitter to your hand."
effects:
  - { type: draw, n: 2 }
  - { type: add_card, card: status_jitter, to: hand }
upgrade:
  text: "Draw 3 cards. Add 2 Jitters to your hand."
  effects:
    - { type: draw, n: 3 }
    - { type: add_card, card: status_jitter, to: hand, n: 2 }
tags: [draw, status, cadence_fuel, prune_fodder]
note: "Budget 0-cost 3.8 d. Draw 2 = 6 d, Jitter in hand −2 d → 4 d (105%). Upgraded: 9 − 4 = 5 d (132%). The Jitter counts toward cap_to_hand (it is a generated card). Who wants it: Chronist (Ping + Jitter are two 0-cost plays toward a beat, but the beat card pays +1); Graft (the Jitter is free Prune fodder); Breaker (draw into a swing turn; she plays the Jitter last so its tax costs nothing)."
```

### 2. Shardfall
```card
id: shardfall
name: Shardfall
cls: colorless
type: attack
rarity: uncommon
cost: 2
target: enemy
keywords: [exhaust]
text: "Deal 16 damage, +2 per Shard you hold. Scrap."
effects:
  - { type: damage, amount: { base: 16, per: 2, scale: shards }, target: target }
upgrade:
  text: "Deal 16 damage, +3 per Shard you hold. Scrap."
  effects:
    - { type: damage, amount: { base: 16, per: 3, scale: shards }, target: target }
tags: [burst, shards, exhaust]
note: "Budget 2 × 7.6 × 1.35 = 20.5 d. At 0 Shards 16 (78%); at 2 Shards (the typical held count) 20 (98%); at 5, 26 (127%); at the cap of 10, 36 (176%). The high end costs about 5 Purges you chose not to make. Upgraded at 2/5 Shards: 22/31. It reads Shards and never spends them, so Shards stay a run currency. Who wants it: every class that skips. The Breaker gets +1 Onslaught after it (it is an Attack) but no per-Onslaught scaling, so her own finishers stay better. The Graft and the Chronist get a boss-opener burst they otherwise build slowly."
```

### 3. Arc Lattice
```card
id: arc_lattice
name: Arc Lattice
cls: colorless
type: attack
rarity: uncommon
cost: 2
target: all_enemies
keywords: []
text: "Deal 4 damage, +2 per living enemy, to ALL enemies."
effects:
  - { type: damage, amount: { base: 4, per: 2, scale: enemies_alive }, target: all_enemies }
upgrade:
  text: "Deal 6 damage, +2 per living enemy, to ALL enemies."
  effects:
    - { type: damage, amount: { base: 6, per: 2, scale: enemies_alive }, target: all_enemies }
tags: [aoe, pack]
note: "Budget 2 × 7.6 = 15.2 d. Total damage by living enemies: 1 → 6 (39%), 2 → 16 (105%), 3 → 30 (197%), 4 → 48. The count is read when it resolves, so the card weakens as the pack dies. It is a pack answer and a poor boss card, which is the trade. Upgraded: 8 / 20 / 36. Who wants it: Graft (her Rot only spreads on a death, so she needs early pack damage in Act 2); Chronist (AoE for the Act 2 width check); Breaker (Crowd Breaker relic gives +1 Onslaught; each enemy is one hit, so Exposed applies to each)."
```

### 4. Salvage Kit
```card
id: salvage_kit
name: Salvage Kit
cls: colorless
type: skill
rarity: uncommon
cost: 1
target: none
keywords: []
text: "Choose: gain 7 Block, draw 2 cards, or deal 5 damage to ALL enemies."
effects:
  - type: choose
    prompt: "Salvage Kit"
    options:
      - { label: "Gain {block} Block", effects: [ { type: block, amount: 7 } ] }
      - { label: "Draw {draw} cards", effects: [ { type: draw, n: 2 } ] }
      - { label: "Deal {damage} damage to ALL enemies", effects: [ { type: damage, amount: 5, target: all_enemies } ] }
upgrade:
  text: "Choose: gain 10 Block, draw 3 cards, or deal 8 damage to ALL enemies."
  effects:
    - type: choose
      prompt: "Salvage Kit"
      options:
        - { label: "Gain {block} Block", effects: [ { type: block, amount: 10 } ] }
        - { label: "Draw {draw} cards", effects: [ { type: draw, n: 3 } ] }
        - { label: "Deal {damage} damage to ALL enemies", effects: [ { type: damage, amount: 8, target: all_enemies } ] }
tags: [choose, block, draw, aoe, flexible]
note: "Budget 7.6 d. Options: 7 Block = 8.2 d (108%); draw 2 = 6 d (79%); 5 AoE × 1.6 = 8 d (105%). The flexibility is paid for by the weakest option. Upgraded: 11.7 / 9 / 12.8 d. The damage option is on a Skill, so it adds no Onslaught and doesn't compete with Breaker AoE Attacks. Who wants it: all three. It is the card that fixes whatever the deck lacks this turn: Block for the Graft's slow start, draw for the Chronist's beat count, chip AoE for anyone in a pack."
```

### 5. Stress Fracture
```card
id: stress_fracture
name: Stress Fracture
cls: colorless
type: skill
rarity: uncommon
cost: 1
target: enemy
keywords: []
text: "Apply 3 Exposed to an enemy. Gain 2 Exposed."
effects:
  - { type: status, target: target, id: exposed, amount: 3 }
  - { type: status, target: self, id: exposed, amount: 2 }
upgrade:
  text: "Apply 4 Exposed to an enemy. Gain 2 Exposed."
  effects:
    - { type: status, target: target, id: exposed, amount: 4 }
    - { type: status, target: self, id: exposed, amount: 2 }
tags: [exposed, debuff, multihit, risk]
note: "Budget 7.6 d. 3 Exposed on the enemy = 9 d (12 d multi-hit). Your 2 Exposed decays to 1 at your turn end (§2.10), so the coming enemy phase hits you for +1 per hit: about 3 hits ≈ −3.5 d. Net 5.5 d (72%), or 8.5 d (112%) in a multi-hit deck, which is who it is for. Upgraded: 8.5 / 12.5 d. The self-Exposed shows in the intent previews (no hidden cost), and Stagger, Block or a Riposte cancel it. The shape (a trade with a self-debuff) avoids STS's flat 'apply 2 Vulnerable' card. Who wants it: Breaker (multi-hit swing turns, Guard soaks the +1s); Chronist (multi-hit beat turns; she reads which enemy phase is quiet with Augury). The Graft rarely wants it, because Rot is HP loss and ignores Exposed."
```

### 6. Gyro Jammer
```card
id: gyro_jammer
name: Gyro Jammer
cls: colorless
type: skill
rarity: uncommon
cost: 1
target: enemy
keywords: []
text: "Apply 1 Stagger per hit the enemy intends (max 3)."
effects:
  - { type: status, target: target, id: stagger, amount: { scale: { fn: target_intent_hits_max3 } } }
upgrade:
  text: "Apply 1 Stagger per hit the enemy intends (max 3). Draw 1 card."
  effects:
    - { type: status, target: target, id: stagger, amount: { scale: { fn: target_intent_hits_max3 } } }
    - { type: draw, n: 1 }
amounts:
  target_intent_hits_max3: "min(3, hits of the target's current intent if its kind is attack/attack_defend/attack_buff/attack_debuff, else 0). Read live, so the preview shows the number."
tags: [stagger, debuff, multihit, intent]
note: "Budget 7.6 d. Stagger s against an h-hit attack: h = 1 → 1 Stagger = 2.3 d (31%); h = 2 → 2 × 3.5 = 7 d (92%); h ≥ 3 → 10.5 d (138%). Act 2 is the multi-hit act (§8.1, up to 6 hits), so the weighted value is about 100%. Upgraded: +3 d. It is useless against a buff or defend intent, and the intent is always visible. 'Stagger equal to its hits' reads as 'turn 4×4 into 1×4', which is the purpose of Stagger. Who wants it: Graft and Chronist (both are fragile against multi-hit packs and lack the Breaker's Riposte answer); Breaker (Concussion Rig relic: Staggered hits give her Guard)."
```

### 7. Ballast Lock
```card
id: ballast_lock
name: Ballast Lock
cls: colorless
type: skill
rarity: uncommon
cost: 2
target: self
keywords: []
text: "Gain 10 Guard. Next turn, your Guard doesn't halve."
effects:
  - { type: guard, amount: 10 }
  - { type: status, target: self, id: guard_lock, amount: 1 }
upgrade:
  text: "Gain 14 Guard. Next turn, your Guard doesn't halve."
  effects:
    - { type: guard, amount: 14 }
    - { type: status, target: self, id: guard_lock, amount: 1 }
status_def:
  guard_lock: "{ name: 'Ballast Lock', stacks: flag, decay: start_player_turn, decayBy: all, tick: never, isDebuff: false, hooks: { guardDecay → 0 lost } }. Present at player turn start step 1 (Guard halving is skipped); removed at step 4 when statuses tick. Uses the guardDecay modifier hook from GDD §9.11."
tags: [guard, defence, forecast]
note: "Budget 2 × 7.6 = 15.2 d. 10 Guard = 10 d, plus the half of your bank that survives the next turn start. For a non-Breaker that is about 4 → 14 d (92%). The Breaker carries 14–20 Guard after the enemy phase → +7–10 → 17–20 d (112–132%). That edge is acceptable: the hold lasts one turn, and Slow-Temper Alloy is the permanent version. Upgraded +4. Who wants it: Chronist (with Augury she banks it the turn before a forecast spike, and it arrives at full size); Graft (a two-turn wall during her slow Rot start); Breaker (protects a big bank through a swing turn)."
```

### 8. Jettison Pod
```card
id: jettison_pod
name: Jettison Pod
cls: colorless
type: skill
rarity: uncommon
cost: 0
target: self
keywords: [retain, exhaust]
text: "Keep. Gain 6 Guard. Scrap."
effects:
  - { type: guard, amount: 6 }
upgrade:
  text: "Keep. Gain 9 Guard. Scrap."
  effects:
    - { type: guard, amount: 9 }
tags: [guard, potion_like, exhaust, retain]
note: "Budget 0-cost 3.8 × 1.5 (once) × 0.9 (Keep) = 5.1 d. 6 Guard = 6 d (118%). Upgraded 9 d (176%; a rest-site upgrade, so +50% is the normal size). Like a potion, it is held at no cost until the spike and then fired for free. It costs a hand slot while held. Who wants it: Graft and Chronist (cheap insurance for the turn a big hit lands); Breaker (a free Guard top-up that keeps her energy for Attacks; it also feeds Salvage Kiln)."
```

### 9. Overdraft Cell
```card
id: overdraft_cell
name: Overdraft Cell
cls: colorless
type: skill
rarity: uncommon
cost: 0
target: none
keywords: [exhaust]
text: "Gain 2 energy. Add a Drift to your hand. Scrap."
effects:
  - { type: energy, n: 2 }
  - { type: add_card, card: status_drift, to: hand }
upgrade:
  text: "Gain 2 energy. Draw 1 card. Add a Drift to your hand. Scrap."
  effects:
    - { type: energy, n: 2 }
    - { type: draw, n: 1 }
    - { type: add_card, card: status_drift, to: hand }
tags: [energy, status, exhaust, burst_turn]
note: "Budget 0-cost 3.8 × 1.35 = 5.1 d (Scrap; you want it every fight). +2 energy = 14 d. Drift = −7 d, because you pay 1 to clear it now or lose 1 next turn. Net 7 d (137%), the GDD's flat price for +1 energy. The extra energy is borrowed from later, not created. Upgraded +3 d. The 2 energy counts toward cap_bonus_energy (4) and the Drift toward cap_to_hand. Uncommon with Scrap, as §3 requires. Who wants it: Breaker (a 5-energy swing turn: 2 more Attacks and +2 Onslaught); Chronist (playing the Drift is one more card toward a beat); Graft (Prune can Scrap the Drift, so she keeps the full +2 for the price of a Prune target)."
```

### 10. Star Survey
```card
id: star_survey
name: Star Survey
cls: colorless
type: skill
rarity: uncommon
cost: 0
target: self
keywords: [innate, exhaust]
text: "Opening. Gain Augury. Draw 1 card. Scrap."
effects:
  - { type: status, target: self, id: augury, amount: 1 }
  - { type: draw, n: 1 }
upgrade:
  text: "Opening. Gain Augury. Draw 2 cards. Scrap."
  effects:
    - { type: status, target: self, id: augury, amount: 1 }
    - { type: draw, n: 2 }
tags: [augury, information, draw, exhaust, innate]
note: "Budget 0-cost 3.8 × 1.35 (Scrap) × 0.9 (Opening) = 4.6 d. Draw 1 = 3 d, and combat-long Augury ≈ 2 d for a non-Chronist (it makes Keep, Guard and Delay timing precise; compare pot_seers_draught) → 5 d (109%). Upgraded 8 d. Opening puts the forecast in place from turn 1, which is when it matters. Who wants it: Breaker (sees whether the enemy attacks two turns out, so she knows whether to hold or swing); Graft (times her slow setup against the boss's charge turn). For the Chronist it is only an Opening 0-cost cantrip (3 d, 65%) that puts 1 play on the turn-1 beat count. That is deliberate: Augury is her trait."
```

### 11. Fault Beacon
```card
id: fault_beacon
name: Fault Beacon
cls: colorless
type: skill
rarity: uncommon
cost: 1
target: none
keywords: [delay]
text: "Delay 1: apply 2 Exposed to ALL enemies."
effects: []
delay: { turns: 1, effects: [ { type: status, target: all_enemies, id: exposed, amount: 2 } ] }
upgrade:
  text: "Delay 1: apply 3 Exposed to ALL enemies."
  delay: { turns: 1, effects: [ { type: status, target: all_enemies, id: exposed, amount: 3 } ] }
tags: [delay, exposed, aoe, setup]
note: "Budget 7.6 d. 2 Exposed × 3 d × 1.6 targets = 9.6 d face ÷ 1.5 (Delay 1) = 6.4 d (84%). In a multi-hit deck: 12.8 ÷ 1.5 = 8.5 d (112%). Upgraded 9.6 / 12.8 d. It resolves at your next turn start, before your draw, so your whole next turn hits Exposed 2 and the turn after that hits Exposed 1. While it waits it is out of your draw cycle. This is the GDD's one colourless Delay card. Who wants it: Breaker (play it on a hold turn so that her swing turn opens with every enemy Exposed; it's the bridge between her two turn types); Chronist (a Timeline entry for Timeline Spool and Paradox Coil). The Graft gains little."
```

### 12. Snare Line
```card
id: snare_line
name: Snare Line
cls: colorless
type: skill
rarity: uncommon
cost: 1
target: self
keywords: [riposte]
text: "Gain 6 Block. Riposte: apply 3 Stagger to the attacker."
effects:
  - { type: block, amount: 6 }
riposte:
  - { type: status, target: target, id: stagger, amount: 3 }
upgrade:
  text: "Gain 8 Block. Riposte: apply 4 Stagger to the attacker."
  effects:
    - { type: block, amount: 8 }
  riposte:
    - { type: status, target: target, id: stagger, amount: 4 }
tags: [riposte, stagger, block, multihit]
note: "Budget 7.6 d. Played: 6 Block = 7 d (92%). Riposte: 3 Stagger = 7 d (1.0 × played) generally, or 10.5 d (1.5 ×) against multi-hit. It fires before the first hit, so the triggering attack gets −3 per hit (§0.3 override 8), then −2 and −1 on that enemy's next two turns. Upgraded 9.4 / 9.3–14 d. It is defensive only (no damage, no Onslaught), so the Breaker's damage Riposte cards stay her own identity. Who wants it: Graft and Chronist (a hold card against multi-hit packs; capacity 1 means it's their only primed card); Breaker (a second defensive prime with Parry Charm)."
```

---

## Rare (8)

### 13. Cutting Torch
```card
id: cutting_torch
name: Cutting Torch
cls: colorless
type: skill
rarity: rare
cost: 1
target: none
keywords: [exhaust]
text: "Remove a card in your hand from your deck. Lose 3 Max HP. Scrap."
effects:
  - { type: custom, fn: torch_excise }
upgrade:
  cost: 0
custom:
  torch_excise: "pendingChoice from hand, min 0 / max 1. Eligible: cards that are in your deck (not created this combat), not Bound (Burden). On a pick: confirm ('Remove X from your deck?'), Scrap the combat copy, delete its deck copy (event card_removed), then max_hp −3. If nothing is picked, no Max HP is lost. Counts toward cap_prune_away (1 permanent removal per turn, shared with Prune away)."
tags: [removal, deck_surgery, max_hp_cost, exhaust]
note: "Budget 9 × 1.35 = 12.2 d. In combat it is a 1-energy Scrap of a chosen hand card (Prune away minus its Bloom ≈ 7 d) at −3 Max HP (≥ 4.5 d) → ≈ 2.5 d. The other ~10 d buys a permanent removal (shop 75 gold +25 each, or Purge 2 Shards) every combat in which you draw it with a target. The Max HP cost keeps it from being free: thinning 6 cards costs 18 Max HP. It can remove curses, but not Burden. Who wants it: all three. Graft (lean decks make her Bloom copies come up), Chronist (consistent beats), Breaker (Attack density). It pairs with Clean Manifest, which makes it a two-rare lean-deck plan (commandment 17)."
```

### 14. Medbay Voucher
```card
id: medbay_voucher
name: Medbay Voucher
cls: colorless
type: skill
rarity: rare
cost: 1
target: self
keywords: [exhaust]
text: "Spend 35 gold: gain 3 Max HP. Scrap."
effects:
  - type: conditional
    if: { type: compare, left: { scale: gold }, op: ">=", right: 35 }
    then:
      - { type: gold, amount: -35 }
      - { type: max_hp, amount: 3 }
upgrade:
  cost: 0
tags: [max_hp, heal, gold, economy, exhaust]
note: "'Spend N gold:' follows the GDD's 'Spend N Onslaught:' form: with fewer than 35 gold the clause is skipped. Gaining Max HP also heals that much (as pact_hardy does). In combat it is pure cost: 1 energy and a draw slot (−7.6 d). The run value is a gold→HP rate of about 12 gold per Max HP. Act income is ~320 gold (§4.4), which competes with removal (75+), relics (143–315) and cards, so four uses per act (140 gold → +12 Max HP, about a Mango) is the realistic ceiling. The cost is real: gold, tempo, and a dead draw. Upgraded: cost 0 removes the tempo cost. Who wants it: Graft (70 HP) and Chronist (66 HP) both convert spare gold into survivability for Act 3. Breaker less so, because her Guard covers it."
```

### 15. Clean Manifest
```card
id: clean_manifest
name: Clean Manifest
cls: colorless
type: attack
rarity: rare
cost: 2
target: enemy
keywords: []
text: "Deal 6 damage, +2 per card fewer than 20 in your deck."
effects:
  - { type: damage, amount: { base: 6, per: 2, scale: { fn: cards_under_20 } }, target: target }
upgrade:
  text: "Deal 6 damage, +3 per card fewer than 20 in your deck."
  effects:
    - { type: damage, amount: { base: 6, per: 3, scale: { fn: cards_under_20 } }, target: target }
amounts:
  cards_under_20: "max(0, 20 − size of your run deck). 'In your deck' per GDD §0.1: counts copies in the Scrapheap, the Timeline and the primed rack, and excludes cards created this combat. So Scrapping cards in combat does not raise it; only removal does."
tags: [lean_deck, deck_size, burst, build_around]
note: "Budget 2 × 9 = 18 d, break-even at 14 cards. At 12 cards 22 (122%); at 14, 18 (100%); at 16, 14 (78%); at 20 or more, 6 (33%). Upgraded at 12/14/16 cards: 30/24/18. It is a build-around for lean decks, which the Shards economy already rewards (skip → Purge): it is great in one deck and you can see when it isn't (commandment 12). Who wants it: Graft (Prune away and Hollow Bough shrink the run deck); Chronist (lean decks hit beats reliably); Breaker (Attack, so +1 Onslaught; lean swing decks). Its partners are Cutting Torch and Shard-funded Purges."
```

### 16. Salvage Kiln
```card
id: salvage_kiln
name: Salvage Kiln
cls: colorless
type: power
rarity: rare
cost: 1
target: self
keywords: []
text: "When a card is Scrapped, apply 1 Exposed to a random enemy."
effects:
  - { type: status, target: self, id: salvage_kiln, amount: 1 }
upgrade:
  keywords: [innate]
  text: "Opening. When a card is Scrapped, apply 1 Exposed to a random enemy."
status_def:
  salvage_kiln: "{ name: 'Salvage Kiln', stacks: amount, decay: never, tick: never, isDebuff: false, text: 'When a card is Scrapped, apply {stacks} Exposed to a random enemy.', triggers: { onCardExhausted: [ { type: status, target: random_enemy, id: exposed, amount: { scale: stacks } } ] } }. Fires for every card that enters your Scrapheap: the Scrap keyword (including Jitter and Drift played), Prune, Riposte cards with Scrap firing, Scrap cards resolving from the Timeline, Cutting Torch. The power itself is not Scrapped when played. Random target uses the misc stream."
tags: [power, exhaust_payoff, exposed, build_around]
note: "Budget: 3 turns of value ≈ 1 × 9 = 9 d. A generic deck Scraps ~0.7 cards per turn (Scrap cards, status cards) → 2.1 d/turn → 6.3 d (70%). A Prune deck Scraps ~1.5 per turn → 4.5 d/turn → 13.5 d (150%), or 18 d with multi-hit (4 d per Exposed). Upgraded: Opening, so it's in play by turn 1. C19: STS's exhaust payoffs give Block, draw or flat damage. This one gives a per-hit debuff that grows with hit count, on a random target, so it shapes sequencing (Scrap first, then hit). Who wants it: Graft (every Prune is a Scrap; her Act 2 status fodder too); Breaker (multi-hit swing turns after Scrapping); Chronist (Jitter and Drift become fuel; Scrap cantrips). It is the payoff for the colourless Scrap cards in this file."
```

### 17. Prism Resonance
```card
id: prism_resonance
name: Prism Resonance
cls: colorless
type: power
rarity: rare
cost: 2
target: self
keywords: []
text: "At the start of your turn, gain 1 Guard per Shard you hold."
effects:
  - { type: status, target: self, id: prism_resonance, amount: 1 }
upgrade:
  cost: 1
status_def:
  prism_resonance: "{ name: 'Prism Resonance', stacks: amount, decay: never, tick: never, isDebuff: false, text: 'At the start of your turn, gain 1 Guard per Shard you hold (×{stacks}).', triggers: { onTurnStart: [ { type: repeat, times: { scale: stacks }, effects: [ { type: guard, amount: { scale: shards } } ] } ] } }. onTurnStart is step 4, after Guard halves at step 1, so the gain is never halved the turn it arrives."
tags: [power, shards, guard, build_around]
note: "Budget: 3 turns ≈ 2 × 9 = 18 d, break-even at 6 Shards held (6 Guard/turn = 18 d). At 3 Shards 9 d (50%); 6 → 100%; 10 (cap) → 30 d (167%). With halving, the steady-state pool is 2 × Shards. Upgraded (cost 1, 9 d budget): break-even at 3 Shards. The cost is a strategic one: every Shard kept for this is a Purge or Transmute not taken, so you build the run around skipping. It makes the reward-screen skip a combat stat (commandment 16). Who wants it: Breaker (Guard is her pool; Bulwark Rivets adds +1 per gain; Bastion Core turns the decay into damage); Graft (her lean-deck play skips a lot, and the bank covers her slow start); Chronist (a passive wall that frees her energy for beats)."
```

### 18. Shard Cache
```card
id: shard_cache
name: Shard Cache
cls: colorless
type: skill
rarity: rare
cost: 0
target: none
keywords: []
text: "Gain 2 energy and 2 Shards. Remove this card from your deck."
effects:
  - { type: energy, n: 2 }
  - { type: shards, amount: 2 }
  - { type: custom, fn: cache_self_remove }
upgrade:
  text: "Gain 2 energy and 3 Shards. Remove this card from your deck."
  effects:
    - { type: energy, n: 2 }
    - { type: shards, amount: 3 }
    - { type: custom, fn: cache_self_remove }
custom:
  cache_self_remove: "Move this combat copy to the Scrapheap and delete its deck copy (event card_removed). No confirmation is needed: the text says so and the player chose to play it."
tags: [shards, energy, one_shot, deck_surgery]
note: "Once per run by construction, so Shards can't be farmed (2 Shards one time = one Purge). In combat: +2 energy = 14 d against a once-only 0-cost rare budget of 4.5 × 1.5 = 6.75 d (207%), paid for by being usable in one combat ever. Run value: 2 Shards ≈ a Purge (shop removal is 75–150 gold) plus the card thins itself out, against a shop price of ~162–198 gold. Upgraded: +1 Shard (Smith-worthy only if you are one Shard short of a Purge or Transmute). Shards over the cap of 10 are lost, as shown. The energy counts toward cap_bonus_energy. Who wants it: all three. Breaker and Chronist save it for a boss swing or beat turn; the Graft plays it on the turn she needs to Prune twice."
```

### 19. Mirror Tether
```card
id: mirror_tether
name: Mirror Tether
cls: colorless
type: attack
rarity: rare
cost: 2
target: enemy
keywords: [exhaust]
text: "Deal damage equal to the damage the enemy intends. Scrap."
effects:
  - { type: damage, amount: { scale: { fn: target_intent_total } }, target: target }
upgrade:
  text: "Deal 8 damage plus the damage the enemy intends. Scrap."
  effects:
    - { type: damage, amount: { base: 8, scale: { fn: target_intent_total } }, target: target }
amounts:
  target_intent_total: "Total damage the target's current intent shows (per-hit number × hits, as the intent displays it: after its Stagger and your Exposed, before your Block and Guard). 0 if the intent is not an enemy attack. The result is one hit through the full pipeline, so the target's Exposed applies once."
tags: [burst, intent, exhaust, answer_big_hit]
note: "Budget 2 × 9 × 1.35 = 24.3 d. Typical attacking intents: Act 1 elite 14–25, Act 2 elite 22–30, boss average 18–32 and peaks 32–55 (§8.1). So it averages ≈ 24 on an elite or boss attack turn (100%) and reaches ~2× on a boss peak. It deals 0 against a non-attack intent; the intent is always visible, so timing is the skill. Stagger on the target lowers the number, a real anti-synergy choice. Upgraded +8 d. Who wants it: Breaker (the big single hits she fears become her damage; +1 Onslaught); Chronist (with Augury she knows the charge turn two turns ahead and keeps it); Graft (front-loaded damage she otherwise lacks against bosses)."
```

### 20. Grav Clamp
```card
id: grav_clamp
name: Grav Clamp
cls: colorless
type: skill
rarity: rare
cost: 2
target: enemy
keywords: [exhaust]
text: "The enemy skips its next move. Scrap."
effects:
  - { type: custom, fn: halt_enemy }
upgrade:
  keywords: [retain, exhaust]
  text: "Keep. The enemy skips its next move. Scrap."
custom:
  halt_enemy: "The same function as pot_halt_ampoule (GDD §7.1): the target's current intent becomes Sleep, its move history and aiState do not advance, and its forecast shifts one move later (recomputed). Implement it once and share it between the potion and this card."
tags: [potion_like, control, exhaust, forecast]
note: "Budget 2 × 9 × 1.5 (once) = 27 d. The value is the skipped move, as Block-equivalent: Act 1 elite hit 14–25 → 16–29 d; Act 2 elite 22–30 → 26–35 d; boss peak 45–55 → 53–64 d (≈2×). Skipping a boss buff or charge is also strong. The base has no Keep, so you average ~100% by playing it when drawn. The upgrade adds Keep, so it waits for the peak; that is what the upgrade buys. Rot still ticks at the skipped enemy's turn end. Riposte won't fire, because there is no attack. Who wants it: Chronist (aims it at the forecast spike); Graft (buys a Rot tick for free); Breaker (cancels the big single hit her Stagger can't dent)."
```

---

## New statuses introduced (power and temporary; none redefine GDD §7 cards)

| id | Name | Stacks | Decay / tick | isDebuff | Rule | Source |
|---|---|---|---|---|---|---|
| `guard_lock` | Ballast Lock | flag | removed at player turn start step 4 | false | At player turn start step 1, your Guard does not halve (modifier hook `guardDecay` → 0). | `ballast_lock` |
| `salvage_kiln` | Salvage Kiln | amount | never | false | Whenever a card enters your Scrapheap, apply {stacks} Exposed to a random enemy. | `salvage_kiln` |
| `prism_resonance` | Prism Resonance | amount | never | false | At player turn start step 4, gain Guard equal to your Shards, ×{stacks}. | `prism_resonance` |

Existing statuses and cards used: `exposed`, `stagger`, `augury`, `status_jitter`, `status_drift`.

## Role coverage

| Role (brief) | Card(s) |
|---|---|
| Universal cheap draw with a cost | `relay_ping` (Jitter) |
| Single-target burst with Scrap | `shardfall` (U), `mirror_tether` (R) |
| Universal AoE | `arc_lattice` (also `salvage_kit`'s third option) |
| Flexible "choose one" utility | `salvage_kit` |
| Exposed / Stagger applier | `stress_fracture` (Exposed), `gyro_jammer` (Stagger) |
| Guard card | `ballast_lock`, `jettison_pod` |
| Shards card | `shard_cache` (grants, once per run), `shardfall` and `prism_resonance` (read Shards held, never spend) |
| Run-surgery rare | `cutting_torch` (in-combat permanent removal) |
| Potion-like one-shot | `jettison_pod` (U), `grav_clamp` (R, the Halt Ampoule effect) |
| Energy card with Scrap (uncommon+) | `overdraft_cell` (and `shard_cache`, once per run) |
| Information (combat-long Augury) | `star_survey` |
| One Delay card for anyone | `fault_beacon` |
| One Riposte card for anyone | `snare_line` |
| Max HP / healing rare with a real cost | `medbay_voucher` (gold) |
| Cares about deck size | `clean_manifest` (lean decks) |
| Two rare build-arounds | `salvage_kiln` (Scrap → Exposed), `prism_resonance` (Shards held → Guard) |

Keyword budget used: Riposte 1, Delay 1, Bloom-adjacent 0, Keep 2 (`jettison_pod`, `grav_clamp`+), Opening 2 (`star_survey`, `salvage_kiln`+). No Prune, Bloom, Rot, Onslaught or Cadence text appears on any colourless card, so class identities are untouched. No card gains energy, returns cards or reduces cost without Scrap or uncommon+ rarity (§3).

## Who wants it (per class)

★★ = a reason to buy it; ★ = playable filler or a niche fit; — = rarely.

| Card | Breaker | Graft | Chronist |
|---|---|---|---|
| `relay_ping` | ★ draw for swing turns | ★★ Jitter is Prune fodder | ★★ two 0-cost plays toward a beat |
| `shardfall` | ★ | ★★ boss burst she lacks | ★★ |
| `arc_lattice` | ★ Crowd Breaker | ★★ Act 2 packs before Rot spreads | ★★ |
| `salvage_kit` | ★ | ★★ | ★★ |
| `stress_fracture` | ★★ multi-hit, Guard soaks the cost | — | ★★ multi-hit beat turns |
| `gyro_jammer` | ★ Concussion Rig | ★★ multi-hit packs | ★★ multi-hit packs |
| `ballast_lock` | ★★ protects the bank | ★ | ★★ banks before a forecast spike |
| `jettison_pod` | ★ | ★★ | ★★ |
| `overdraft_cell` | ★★ 5-energy swing turn | ★★ Prune the Drift | ★★ Drift is a beat play |
| `star_survey` | ★★ hold-or-swing information | ★★ times the slow setup | ★ Opening cantrip only |
| `fault_beacon` | ★★ hold turn → Exposed swing turn | — | ★★ Timeline payoffs |
| `snare_line` | ★ second prime with Parry Charm | ★★ | ★★ |
| `cutting_torch` | ★★ | ★★ | ★★ |
| `medbay_voucher` | ★ | ★★ 70 HP | ★★ 66 HP |
| `clean_manifest` | ★★ lean swing deck | ★★ Prune away shrinks the deck | ★★ lean beats |
| `salvage_kiln` | ★★ Scrap, then multi-hit | ★★ every Prune triggers it | ★ Jitter/Drift fuel |
| `prism_resonance` | ★★ Guard relics stack | ★★ | ★ |
| `shard_cache` | ★★ | ★★ | ★★ |
| `mirror_tether` | ★★ big hits become damage | ★ | ★★ forecast-timed |
| `grav_clamp` | ★ | ★★ free Rot tick | ★★ aimed with Augury |

Every card has at least two ★ columns, and every class has at least eleven ★★ cards.

## `custom` list (3 of a maximum 3)

| fn | Card | What it does | Why the DSL can't |
|---|---|---|---|
| `torch_excise` | `cutting_torch` | Choose a deck card in hand (not created, not Bound), confirm, Scrap it, delete its deck copy, then lose 3 Max HP; shares `cap_prune_away`. | `remove_card` picks from the run deck, not from a combat hand card. The cost is conditional on the pick. |
| `cache_self_remove` | `shard_cache` | Scrap this combat copy and delete its own deck copy. | No primitive removes the source card from the run deck. |
| `halt_enemy` | `grav_clamp` | The target's intent becomes Sleep; its forecast shifts one move later. Shared with `pot_halt_ampoule`. | It is not in GDD §9's primitive list, although the potion needs it. Promote it to a primitive `halt {target}` and this stops being a custom. |

Named amount functions (`DslTables.amounts`, not `custom` effects): `target_intent_hits_max3` (`gyro_jammer`), `cards_under_20` (`clean_manifest`), `target_intent_total` (`mirror_tether`). New status hooks used: `onCardExhausted` (existing), `onTurnStart` (existing), `guardDecay` (GDD §9.11 ask). Amount scale `shards` is GDD §9.9; `enemies_alive` and `gold` are existing scales.

## GDD ambiguities hit

1. **Rarity split.** GDD §4.2 says colourless are "14 uncommon / 6 rare (of 20)". The brief says 12 + 8; I followed the brief. §4.2 needs updating, or two rares (`shard_cache`, `medbay_voucher` are the most uncommon-shaped) should move down.
2. **Colourless pricing is not in GDD §8.5.** The −10% rule comes from the brief. §4.6 also charges 120% of the class gold price, so colourless cards are dearer and 10% weaker: universality is the premium. §8.5 should say this explicitly.
3. **Guard's value is contradictory.** The §8.5 rate table gives more Guard than Block per energy (common 7 vs 6; starter Brace 6 Guard vs Bulwark 5 Block), which makes 1 Guard < 1 Block. The conversion table says "Guard N = 1.2 × Block N", which makes 1 Guard > 1 Block. I priced pure-Guard cards by the rate table (1 Guard ≈ 1.0 d). One of the two lines should change.
4. **There is no AoE multiplier in §8.5.** I used 1.6 expected targets.
5. **Augury has no price.** I valued combat-long Augury at ≈2 d for non-Chronists (pot_seers_draught is the only anchor).
6. **Is a played Power "Scrapped"?** I assumed not (it leaves play), so `salvage_kiln` does not trigger itself. The GDD should state where played Powers go.
7. **In-combat permanent removal.** Only Prune away exists. I made `cutting_torch` share `cap_prune_away` (1 per turn) and exclude cards created this combat. Please confirm the cap is meant to cover all in-combat removal.
8. **The halt effect lacks a primitive.** `pot_halt_ampoule`'s effect is not a §9 primitive. Also, are boss or elite moves immune to it? ENEMIES.md may want a `MoveDef.unhaltable` for scripted phase moves; `grav_clamp` assumes none are.
9. **Gaining Max HP heals.** I assumed yes (stated only on `pact_hardy`).
10. **"Cares about deck size either way"** I read as "either direction is fine" and built a lean-deck payoff. A bloated-deck payoff reads like STS's Mind Blast (damage = draw pile), which is on the banned list.
11. **Player Exposed timing makes 1 stack useless when you self-apply it on your own turn** (it decays at your turn end, before the enemy phase). `stress_fracture` therefore gives you 2, which means +1 per hit for exactly one enemy phase. Worth adding as a §2.10 note for other designers.
12. **Status cards created by colourless cards** (Jitter, Drift) count toward `cap_to_hand`. I assumed generated status cards count as "generated cards" under §3.
