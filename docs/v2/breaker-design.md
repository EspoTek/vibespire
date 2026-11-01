# The Breaker, v2: engines, card pool, asks

Status: **Phase D applied** (card designer, Breaker). Phase C cuts and reworks (§13) and Phase D late-damage tuning (§14) are in `src/`. The final pool is 64 cards. Ruling 48 is amended to "Shed N needs N".

Read with: `docs/v2/BRIEF.md` ("Design framework for fun"), `docs/GDD.md` §1.2 and §2.1–§2.3, `docs/RULINGS.md`, and `docs/research/sts-design.md` §3 (the "don't copy" catalogue).

---

## 0. The problem, and the answer in one paragraph

v1 priced every Breaker card "at rate", and the three mechanics each add value linearly. Onslaught resets every turn, so the per-Onslaught cards read about 2.7 on average (sim telemetry, `report-final.md`). Riposte gets one at-rate effect per enemy attack. Guard banks, but its payoffs only read it. Nothing compounds, so no deck ever "comes online".

v2 gives the Breaker **four engines**. Each one turns a Breaker resource into a second resource that feeds the first:
- **Furnace**: Onslaught becomes **Embers**, a new combat-long status, and Embers become more Onslaught.
- **Crazing**: Exposed becomes permanent, and multi-hit cards turn it into damage per hit.
- **Counter**: a Riposte fires twice over, as its Riposte and as its played text. Each firing also loads Onslaught for your swing turn.
- **Bastion**: Guard becomes a currency you can **Shed** (a new cost verb), and Shedding triggers payoffs.

Bridges between the engines (Riposte → Onslaught, Shed → Onslaught, Onslaught → Guard) are where the Johnny discoveries live. To support this I add two keywords (**Embers**, **Shed**), cut 4 cards, rework 6, add 12 and retune 2. Engine changes are narrow, listed in §7.

---

## 1. Research notes (what to learn, not copy)

**Rosewater's psychographics** (Making Magic, "Timmy, Johnny, and Spike Revisited"):
- **Timmy** "wants to experience something". The subtypes that matter here are the Power Gamer, who likes big effects and big numbers, and the Adrenalin Gamer, who likes swingy moments.
- **Johnny** "wants to express something". The Combo Player is "finding gems in the midst of chaos". The Uber Johnny makes unworkable cards work. He "likes cards that he can build a deck around".
- **Spike** "gets his greatest joy from winning". Tuners and Nuts & Bolts players want efficiency, consistency and correct play.
- A strong card leans hard toward one profile rather than serving all three.

**STS engine anatomy.** Every famous STS deck has the same three-part shape:

| Deck | Enabler (makes a resource) | Payoff (converts it) | Multiplier / rule-breaker | Why it feels good |
|---|---|---|---|---|
| Corruption + Dead Branch + Feel No Pain | Skills (every Skill now Exhausts) | Feel No Pain, Dark Embrace (Block/draw per Exhaust) | Corruption (Skills cost 0); Dead Branch (Exhaust → new card) | Two rares turn the deck into a self-refilling free-card machine. Giovannetti: rare, hard to assemble, sought out, so acceptable in a single-player game. |
| Barricade + Entrench + Body Slam | Block cards | Body Slam (damage = Block) | Barricade (Block stays); Entrench (double it) | Defence becomes offence; the number climbs every turn. |
| Rupture + Hemokinesis / Combust | self-damage cards | Strength scaling | Rupture (HP loss → Strength); Limit Break (×2) | A drawback becomes the fuel. |
| Demon Form / Limit Break | time | every Attack | Limit Break doubles | Visible, climbing number; Timmy. |
| Catalyst + Noxious Fumes | Poison appliers, Fumes | Poison ticks | Catalyst (×2/×3 Poison) | Slow build, then one card cashes the bank. |
| Shivs + Accuracy + After Image | Blade Dance, Cloak and Dagger | Accuracy (+per Shiv) | After Image (Block per card) | Count × per-card bonus = quadratic. |
| Defect Focus | orbs | passive/evoke | Focus (+per orb, every turn) | One stat multiplies every slot. |
| Watcher stance/Mantra | stance changes, Mantra | Mental Fortress, Rushdown, Divinity | Wrath ×2 damage, Divinity ×3 | Turn-to-turn rhythm with an explosive turn. |

What I take from them:
1. **Multiplicative value comes from two counters that read each other**: count × per-unit (Shivs × Accuracy), stack × multiplier (Catalyst), or a resource that buys more of itself (Dead Branch).
2. **The rule-breaker is usually a rare Power**, and the deck is still playable without it.
3. **Combos are discoverable** because the enabler and the payoff use the same noun ("Exhaust", "Poison", "Block").
4. **Relics change how the next reward is valued** (Dead Branch makes every Exhaust card good).

Sources are listed in §11.

---

## 2. New mechanics (checked against `sts-design.md` §3)

### 2.1 Embers (`embers`) — new Breaker status
- **Rule**: a player status. **At the start of your turn, gain Onslaught equal to your Embers.** Embers last for the whole combat (`decay: never`). Max `TUNING.caps.embers` = **10**; the simulator will sweep it.
- **Sources**: Cinder Heart (a Power, now "Gain 1 Ember"), Kindle (Spend all Onslaught: an Ember for every 3 spent), Bellows (whenever you Spend 4+ at once, gain an Ember), and the relic and potion asks in §6.
- **Why**: Onslaught still resets every turn; that is the class's swing-or-hold question. Embers are the part of a big swing that stays. A finisher turn now buys a bigger next turn, which is the compounding v1 lacked.
- **C19**: the nearest mechanics are Demon Form and Inflame (Strength per turn, permanent), Devotion (Mantra per turn) and Genesis (Stars per turn). Embers differ in both trigger and resource shape:
  - Embers are earned by **spending** the class counter, not passively.
  - What they give is a **resetting, spendable counter** that only Onslaught cards read. Strength is a flat bonus on every hit.
  - Test 1 of §3 (a flat change to damage per stack): no. Test 2 (persists and ticks): it persists but never ticks. Test 3 (stores something that fires later): no.

### 2.2 Shed (`shed`) — new cost verb for Guard
- **Rule**: "**Shed N: X**": if your Guard ≥ N, lose N Guard and do X; otherwise skip X. "**Shed all Guard: X**" always runs, and X may scale with the Guard Shed, which may be 0. This mirrors "Spend N Onslaught" and ruling 33.
- Shed is not damage absorption and not halving, so `onGuardAbsorbed` and `onGuardDecay` don't fire (Reactive Plate and Bastion Core don't see it). It fires a new hook, `onGuardShed {amount}`.
- **Why**: in v1 Guard was a bank with nothing to buy (only Rampart Crash and Iron Avalanche read it). Shed makes a hold turn pay for a break turn in cards, energy or damage, and makes the Breaker's two kinds of turn feed each other.
- **C19**: the nearest mechanics are Body Slam (reads Block, doesn't spend it), Juggernaut (damage on gaining Block) and Regent Stars (a spendable persistent currency). Shed spends a **decaying defence pool**: Guard you keep is worth less each turn, so every Shed is a defence-now versus value-now choice. No STS card spends Block.

### 2.3 Two rule-breakers (card effects, not keywords)
- **Crazing**: "Exposed on enemies doesn't decay." Vulnerable and Exposed-like debuffs always tick in STS; none stops ticking. Exposed is our own per-hit, flat debuff (GDD §2.10).
- **Answer in Kind**: "When one of your Riposte cards fires, it also resolves its played effects." Nothing in STS resolves a card's text on the enemy's turn. This builds on our Riposte axis (enemy-turn interrupts).

---

## 3. The engines

Codes used in the card tables: **F** Furnace, **Z** Crazing (Exposed), **C** Counter (Riposte), **B** Bastion (Guard / Shed), **G** glue. "Floor ~20" assumes 3 energy, Riven Gauntlet, about 17 cards, 1–2 removals and 3–4 upgrades.

### 3.1 Furnace — "every finisher stokes the next one" (Onslaught → Embers → Onslaught)

| Role | Cards |
|---|---|
| Enablers (make Onslaught) | Piston Jab, Gauntlet Tap, Chain Driver, Stoke (new), Return Stroke / Loaded Spring / Bind the Blade (enemy-phase Onslaught), Iron Rhythm (Skills add Onslaught) |
| Payoffs (convert it) | Hammerfall (one big hit), Worldbreaker (X hits, new), Quake Hammer (AoE), Endless Maul (copies past 4), Vent Pressure (energy + draw), Shoulder Check / Thresher Arc / Piston Volley (+per) |
| Multipliers / rule-breakers | **Kindle** (U, new: Onslaught → Embers), **Cinder Heart** (U, reworked: 1 Ember), **Bellows** (R, new: every big Spend → +1 Ember), Smouldering Core (R: keep 4) |
| Relics that tilt it | Kept Fury, Stormbreak Gem (reaches 6 sooner), Forge Oath (card), Heavy Heart (boss), ask: Coal Scuttle (§6) |

**Worked example (floor ~20)**: Cinder Heart + Kindle + Hammerfall, with Kept Fury. All three are uncommons; no rare is needed.
- **Turn 1**, 11 damage. Play Cinder Heart (Embers 1), then Piston Jab for 3 (Onslaught 1), Gauntlet Tap for 2 and 2 Guard (Onslaught 2), and Hew for 6 (Onslaught 3). Kindle spends the 3 Onslaught for 1 Ember, so Embers are now 2.
- **Turn 2**, 40 damage for 3 energy. Start at Onslaught 2. Stoke takes it to 4 and draws 1. Piston Jab+ deals 5 + 4 = 9 (Onslaught 5). Hammerfall spends 5 for 6 + 5 × 5 = **31**.
- **Later turns, with Bellows** (a rare): every Hammerfall or Vent Pressure adds an Ember. By turn 5, at Embers about 5, the turn opens at Onslaught 5. Two cheap Attacks take it to 7, and Hammerfall+ deals 6 + 6 × 7 = **48**. Worldbreaker+ at X = 3 with 8 spent deals (4 + 3 × 8) × 3 = **84**. This is the Timmy turn; the climbing Embers number is the "comes online" moment.

**Comes online**: Cinder Heart or Kindle plus one spend-all finisher, usually by floor 15–20. Bellows or Smouldering Core turns it from good into absurd.

**Weak to**:
- **Turn-1 investment.** Powers and Kindle deal little on turn 1, so burst and Act 1 elites hurt.
- **Short fights.** Embers are lost between combats, so hallway fights gain less.
- **Act 3's damage-cap boss** (the commandment-10 ceiling check).
- **Spend turns leave no defence.** Cool the Steel, Quench and Chain Wraps are the answers.
- **Losing the finisher.** Stagger on you only costs one point per hit, so it's mostly fine, but Halt or a missed draw of Hammerfall wastes a stored turn. That is why Hammerfall keeps Keep.

### 3.2 Crazing — "the cracks never close" (Exposed × hits × Onslaught)

| Role | Cards |
|---|---|
| Enablers (apply Exposed) | Fault Line, Sabre Rattle, Hairline Mark, Fault Reader, Seam Ripper (cycles off Exposed) |
| Payoffs (hits) | Rivet Flurry (4 hits), Piston Volley (2–3 hits, +per each), Jackhammer (1 + spent hits), Worldbreaker (X hits), Pivot Sweep / Thresher Arc (per enemy) |
| Multipliers / rule-breakers | **Crazing** (R, new: Exposed doesn't decay), Jackhammer (R), relics Fracture Engine (2 per stack), Glass Spurs, Hairline Saw |

**Worked example (floor ~22)**: Fault Reader + Hairline Mark + Rivet Flurry + Piston Volley, with Glass Spurs.
- **Without the rare**, 37 damage on turn 2. Fault Reader puts 1 Exposed on the lowest-HP enemy at turn start. Hairline Mark adds 2 (Exposed 3) and draws 1. Rivet Flurry hits 4 times for 2 + 3 = 5 each, and Glass Spurs adds 1 Exposed after the 3rd hit, so the 4th hit deals 6: 21 total (Onslaught 1). Piston Volley hits twice for 3 + 1 + 4 = 8 each: 16.
- **With Crazing** (played on turn 1), the Exposed stack only grows: about 7 by turn 4. Jackhammer at Onslaught 3 makes 4 hits of 4 + 7 = 11, for **44**.
- **With Fracture Engine** (2 damage per stack) it makes 4 hits of 4 + 14, for **72**. Crazing + Fracture Engine is this class's Corruption + Dead Branch: rare + rare relic + 2 commons.

**Comes online**: two Exposed appliers plus two multi-hit cards by floor ~15. Crazing is the spike.

**Weak to**:
- **Stagger on you.** It costs every hit, so a 4-hit card loses 4 per stack. This is the designed counter.
- **Losing the stack.** Exposed sits on one enemy and is lost when it dies, unless you have Hairline Saw.
- **Enemy Block and Guard**, which multi-hit cards chip through slowly.
- **Packs** spread the stack. Sabre Rattle is the answer.

### 3.3 Counter — "every parry is a second card" (Riposte → played text + Onslaught for your swing)

| Role | Cards |
|---|---|
| Enablers (Riposte cards, rack space) | Hair Trigger (new, 0-cost), Feint Step, Shoulder Check, Return Stroke, Loaded Spring, Catch Blade, Counterweight, Pivot Sweep, Bind the Blade; capacity from Crossed Blades, En Garde (reworked), Parry Charm (relic) |
| Payoffs | Answering Steel (per hit), Coiled Strike, **Turnabout** (R, new: reflects the attack's total), Parry Ledger (draw), Riven Gauntlet (+1 Onslaught +2 Guard each fire) → your next turn's +per cards and finishers |
| Multipliers / rule-breakers | **Answer in Kind** (R, new: fires also resolve played effects), Recoil Spring (R: fired cards return), Duelist's Oath (relic: 2 charges), ask: Twin Scabbard (§6) |

**Worked example (floor ~20, Act 2 hallway, 3 attackers)**: Crossed Blades + Parry Charm (capacity 3), Answer in Kind, Return Stroke, Loaded Spring and Hair Trigger. On the hold turn, spend your energy on Rivet Wall and Brace and end the turn holding the three Riposte cards; all three are primed.
- **Enemy A attacks.** Return Stroke fires: Riposte 6 damage and +1 Onslaught, plus its played 7 damage. Riven Gauntlet adds +1 Onslaught and +2 Guard.
- **Enemy B attacks.** Loaded Spring fires: Riposte 4 Guard and +2 Onslaught, plus its played 7 Guard, all landing before B's hits. Gauntlet adds +1 Onslaught and +2 Guard.
- **Enemy C attacks.** Hair Trigger fires: 3 damage, plus its played "draw 1". Gauntlet adds +1 Onslaught and +2 Guard.
- **Enemy phase total**: 16 damage dealt, 17 Guard gained mid-phase, 1 extra card. Your turn starts at **Onslaught 6**, so Shoulder Check deals 6 + 2 × 6 = 18 and Hammerfall deals 6 + 5 × 7 = 41.
- **Without Answer in Kind**: 9 damage and 10 Guard, so the rare roughly doubles the hold turn.
- **With Recoil Spring** all three come back next turn to be held again, so you parry every turn and swing every turn.

**Comes online**: Crossed Blades + 2–3 Riposte commons + Riven Gauntlet, the hold → swing bridge, by floor 15–20. Answer in Kind or Recoil Spring is the spike.

**Weak to**:
- **Non-attack turns.** Buff, charge and debuff moves don't trigger Riposte, so primed cards fizzle.
- **Single enemies.** They give one trigger per turn, so the payoffs there are per-trigger (Turnabout, Coiled Strike, Answering Steel).
- **Halt and attack cancels** waste the rack.
- **The tempo cost of holding.** A held card isn't played this turn.

### 3.4 Bastion — "bank the steel, then spend it" (Guard → Shed → damage, cards, Onslaught)

| Role | Cards |
|---|---|
| Enablers (Guard) | Brace, Rivet Wall, Loaded Spring, Catch Blade, Gauntlet Tap, Cool the Steel, Quench, Read the Blow, Anneal (no halving next turn), **Iron Patience** (U, new: unspent energy → Guard) |
| Payoffs (Shed / read Guard) | **Loosen Straps** (C, new: Shed 3 → draw 2), **Plate Ram** (C, reworked), **Shed Plating** (U, reworked: Shed 6 → energy + 2 draw), Rampart Crash (reads Guard), **Iron Avalanche** (R, reworked: Shed all → ALL enemies) |
| Multipliers / rule-breakers | **Molten Shell** (R, new: Shed → that much damage), **Spark Gap** (U, new: Shed → 2 Onslaught, the bridge into Furnace), Reactive Plate (R), relics Slow-Temper Alloy, Bulwark Rivets, Bastion Core, ask: Furnace Mantle (§6) |

**Worked example (floor ~22)**: Rivet Wall, Brace, Loosen Straps, Shed Plating, Plate Ram, Iron Avalanche and Molten Shell (2 rares), with Bulwark Rivets and Slow-Temper Alloy.
- **Hold turn.** Rivet Wall gives 14 + 1 Guard and Brace 5 + 1, on top of 8 Guard left from the last turn: **Guard 29**. At turn start Slow-Temper takes a third (floor 9), leaving **20**.
- **Break turn** (4 energy thanks to Shed Plating):
  - Shed Plating sheds 6 for +1 energy and draws 2; Molten Shell deals 6.
  - Loosen Straps sheds 3 and draws 2; Molten deals 3.
  - Plate Ram sheds 4 for 12; Molten deals 4.
  - Iron Avalanche sheds the last 7 for 5 + 7 = 12 to ALL enemies; Molten deals 7.
  - **Total**: 44 single-target damage plus 12 AoE, and 4 cards drawn.
- **Timmy line.** Two hold turns bank 45 Guard. Iron Avalanche sheds it all for **50 to every enemy**, and Molten Shell adds **45** to the weakest.
- **With Spark Gap** the four Sheds also give +8 Onslaught mid-turn for a Hammerfall: the Bastion → Furnace bridge.

**Comes online**: Rivet Wall + 2 Shed cards by floor ~15 (Spike value: free draw and energy). Molten Shell or Iron Avalanche make it a kill engine.

**Weak to**:
- **Act 3's race boss**, which out-damages a deck that skips turns.
- **The Guard cap of 50.**
- **Turns with nothing to Shed.** Shed cards then do nothing; the clause is skipped.
- **Piercing / HP-loss** enemy effects ignore Guard.
- **Furnace Mantle** (if made) removes the bank entirely; it's a chosen trade.

### 3.5 Bridges (where Johnny finds things)

| From → To | Pieces | Discovery |
|---|---|---|
| Counter → Furnace | Riven Gauntlet, Return Stroke, Loaded Spring, Bind the Blade (enemy-phase Onslaught carries into your turn) | "My hold turn is my swing turn's fuel." |
| Bastion → Furnace | Spark Gap (Shed → 2 Onslaught), Iron Rhythm (every Shed Skill also +1 Onslaught) | Loosen Straps for 0 energy = draw 2 + 3 Onslaught with both. |
| Furnace → Bastion | Cool the Steel, Quench, Chain Wraps (Onslaught → Guard) | Swing today, bank tomorrow. |
| Counter → Bastion | Catch Blade, Loaded Spring, Riven Gauntlet (Guard during the enemy phase), Iron Patience (held turns leave energy unspent) | Holding is free Guard; next turn Shed it. |
| Counter × Crazing | Fault Line / Hairline Mark Exposed boosts every Riposte hit | Exposed applied on your turn lasts through their turn. |
| Furnace × Crazing | Jackhammer and Worldbreaker turn Onslaught into hits | Embers → more hits → Exposed × hits. |

---

## 4. Timmy / Johnny / Spike coverage

| Engine | Timmy (big moment) | Johnny (build-around / discovery) | Spike (efficiency, consistency) |
|---|---|---|---|
| Furnace | Hammerfall (40–60 hit), **Worldbreaker** (X-cost, 60–90), Endless Maul (keeps going) | **Bellows** + Vent Pressure (every Vent buys an Ember), **Kindle** vs Hammerfall (invest or cash), Smouldering Core + Embers | Stoke, Chain Driver, Breach Hammer (spend 2 → draw 2), Ride the Surge |
| Crazing | Jackhammer at Exposed 8 (60–80), Rivet Flurry vs a cracked boss | **Crazing** + Fracture Engine, Crazing + Fault Reader (+1 forever per turn), Hairline Saw carrying a 10-stack | Hairline Mark (Exposed + draw), Seam Ripper (0-cost cantrip), Sabre Rattle |
| Counter | **Turnabout** (reflect a 45-damage boss hit), Steal the Swing (cancel it), Coiled Strike | **Answer in Kind** (which played effects are best at the enemy's turn? Loaded Spring's Guard lands before the hits), Recoil Spring + Duelist's Oath, Answer in Kind + Hair Trigger (draw on their turn) | Hair Trigger (0-cost cantrip), Feint Step, Parry Ledger, En Garde (prime + draw) |
| Bastion | **Iron Avalanche** for 50 to ALL, Rampart Crash, Molten Shell doubling it | **Spark Gap** (Guard becomes Onslaught), Iron Patience + held Ripostes, Furnace Mantle (ask) + Molten Shell | **Loosen Straps** (0-cost draw), **Shed Plating** (energy), Rivet Wall, Anneal |

Every engine has an X-or-huge-number card for Timmy, a rare rule-breaker plus a cross-engine bridge for Johnny, and 0–1 cost draw or filter commons for Spike.

---

## 5. Full card list (v2): 4 starters + 20 common + 24 uncommon + 16 rare = 64

Status: **K** kept (v1 numbers unless marked), **K\*** kept with retuned numbers, **R** reworked, **N** new, **X** cut. Text is shown rendered (base → upgraded). Every number in it comes from a placeholder (§7.6), with condition thresholds in `values`. "d" is the common damage-equivalent (GDD §8.5). New pricing rows are in §5.6.

### 5.1 Starters (4): unchanged (GDD §4.1)

| id | Type | Cost | Text (→ upgraded) | Status |
|---|---|---|---|---|
| `hew` | A | 1 | Deal 6 damage. (→ 9) | K |
| `bulwark` | S | 1 | Gain 5 Block. (→ 8) | K |
| `shoulder_check` | A | 1 | Deal 6 damage, +2 per Onslaught. Riposte: deal 6 damage to the attacker. (→ 8 (+2) / 9) | K |
| `brace` | S | 1 | Gain 5 Guard. (→ 8) | K |

### 5.2 Commons (20): 10 Attacks, 10 Skills

| id | Name | Type | Cost | Text (→ upgraded) | Status | Engine / role | Price |
|---|---|---|---|---|---|---|---|
| `piston_jab` | Piston Jab | A | 0 | Deal 3 damage, +1 per Onslaught. (→ 5, +1) | K\* (was 2 / 4; applied in Phase C) | F Z enabler | 4.5 vs 3.5. Baseline cf Δwin −8, Δprog −1.3 (not significant), value/E 11.4: weak alone, kept as chain fuel. |
| `chain_driver` | Chain Driver | A | 1 | Deal 6 damage. If Onslaught ≥ 2: draw 1 card. (→ 9) | K | F G | 7.7 |
| `breach_hammer` | Breach Hammer | A | 1 | Deal 7 damage. Spend 2 Onslaught: draw 2 cards. (→ 10) | **R** | F G (refills the chain) | 7 = rate; spent +6 − 4 = 9. The decision is chain length now versus cards now. |
| `thresher_arc` | Thresher Arc | A | 1 | Deal 5 damage to ALL enemies, +1 per Onslaught. (→ 7) | K | F (AoE) | as v1 (sim-tuned) |
| `fault_line` | Fault Line | A | 1 | Apply 1 Exposed. Deal 4 damage. (→ 2 Exposed) | K | Z C enabler | 7 |
| `rivet_flurry` | Rivet Flurry | A | 1 | Deal 2 damage 4 times. (→ 3 × 4) | K | Z payoff | 8 |
| `counterweight` | Counterweight | A | 1 | Deal 7 damage. Riposte: apply 3 Stagger to the attacker. (→ 9 / 4) | K | C | 7 / 7.2 |
| `plate_ram` | Plate Ram | A | 1 | Deal 6 damage. Shed 4: deal 12 instead. (→ 8 / 15) | **R** | B payoff | 6; shed 12 − 4 = 8 (+14%). Mirrors v1 Breach Hammer, with Guard as the cost. |
| `return_stroke` | Return Stroke | A | 1 | Deal 7 damage. Riposte: deal 6 damage to the attacker and gain 1 Onslaught. (→ 9 / 8) | K | C → F bridge | 7 / 8 |
| `gauntlet_tap` | Gauntlet Tap | A | 0 | Deal 2 damage. Gain 2 Guard. (→ 3 / 3) | K | F B | 4 |
| `catch_blade` | Catch Blade | S | 1 | Gain 6 Block. Riposte: gain 4 Guard for each hit of its attack. (→ 8 / 5) | K | C B | 7.2 / 8 |
| `cool_the_steel` | Cool the Steel | S | 1 | Gain 4 Guard, +2 per Onslaught. (→ +3) | K | F → B bridge | 7 |
| `read_the_line` | Read the Line | S | **0** | Draw 1 card. If Onslaught ≥ 3: draw 2 more. (→ draw 2, +2) | **R** (Phase C) | F G (mid-chain refill) | Baseline cf Δwin −10 ±8 (significant), plays/draw 0.43 as a 1-cost draw. 3 + 6 × P(≥ 3 ≈ 0.35) = 5.1 vs 3.5. |
| `pivot_sweep` | Pivot Sweep | S | 1 | Gain 6 Block. Riposte: deal 6 damage to ALL enemies. (→ 8 / 8) | K | C (AoE) | 7.2 / 7.5 |
| `rivet_wall` | Rivet Wall | S | 2 | Gain 14 Guard. (→ 18) | K | B enabler (bulk Shed fuel) | 14 |
| `loaded_spring` | Loaded Spring | S | 1 | Gain 7 Guard. Riposte: gain 4 Guard and 2 Onslaught. (→ 9 / 5 + 3) | K | C → F, B | 7 / 8 |
| `sabre_rattle` | Sabre Rattle | S | 1 | Apply 1 Exposed to ALL enemies. Draw 1 card. (→ 2 Exposed) | K | Z G | 6.75 |
| `stoke` | Stoke | S | 1 | Gain 2 Onslaught. Draw 1 card. (→ 3 Onslaught) | **N** | F enabler (Spend without attacking; Iron Rhythm counts it) | 2 × 2 + 3 = 7 |
| `hair_trigger` | Hair Trigger | S | 0 | Draw 1 card. Riposte: deal 3 damage to the attacker. (→ Riposte 5) | **N** | C enabler (the common rack-filler) | 3 vs 3.5; Riposte 3 (+ Gauntlet's 1 Onslaught and 2 Guard) |
| `loosen_straps` | Loosen Straps | S | 0 | Shed 3: draw 2 cards. (→ draw 3) | **N** | B G (Spike draw; Shed trigger) | 6 − 3 = 3 vs 3.5 |
| ~~`overhand_drive`~~ | Overhand Drive | A | 2 | — | **X** | — | 2.0% pick. A 2-cost "+per" card that Hammerfall and Worldbreaker do better. No role left. |
| ~~`find_the_seam`~~ | Find the Seam | S | 0 | — | **X** | — | 0.9% pick. "Apply 1 Exposed" with no rider; Fault Line and Hairline Mark cover it. |
| ~~`planted_feet`~~ | Planted Feet | S | 1 | — | **X** | — | 3.9% pick. Block with a weak Guard condition; its role (reward for a bank) is now Shed's. |

Commons fitting ≥ 2 engines: 11 of 20 (55%; target ≥ 30%). No common gains energy, returns a card or reduces a cost (GDD §3).

### 5.3 Uncommons (24): 7 Attacks, 10 Skills, 7 Powers

| id | Name | Type | Cost | Text (→ upgraded) | Status | Engine / role | Price |
|---|---|---|---|---|---|---|---|
| `hammerfall` | Hammerfall | A | 2 | Keep. Spend all Onslaught: deal 8 damage, +4 per Onslaught spent. (→ +5) | K (v1 numbers; the planned retune is **dropped**) | F payoff (Timmy) | Baseline: the **strongest** Breaker card (cf Δprog +4.4, significant). Embers raise its N anyway, so no buff. |
| `piston_volley` | Piston Volley | A | 1 | Deal 3 damage, +1 per Onslaught, twice. (→ 3 times) | K | F Z | 9 |
| `answering_steel` | Answering Steel | A | 1 | Deal 9 damage. Riposte: deal 5 damage to the attacker per hit of its attack. (→ 12 / 6) | K | C payoff | 9 / 10 |
| `rampart_crash` | Rampart Crash | A | 1 | Deal 4 damage, plus your Guard. (→ 7) | K | B payoff | as v1 |
| `coiled_strike` | Coiled Strike | A | 2 | Deal 16 damage. Riposte: deal 16 damage to the attacker. (→ 20 / 20) | K | C (big single hits) | 16 / 16 |
| `seam_ripper` | Seam Ripper | A | 0 | Deal 3 damage. If the enemy has Exposed: draw 1 card. (→ 5) | K | Z G | 4.5 |
| `quake_hammer` | Quake Hammer | A | 1 | Deal 7 damage to ALL enemies. Spend 3 Onslaught: deal 12 instead. (→ 9 / 15) | K | F (AoE) | as v1 |
| `feint_step` | Feint Step | S | 0 | Gain 4 Block. Riposte: deal 5 damage to the attacker. (→ 6 / 7) | K | C | 4.8 / 5 |
| `bind_the_blade` | Bind the Blade | S | 1 | Apply 3 Stagger. Riposte: apply 2 Stagger to the attacker and gain 2 Onslaught. (→ 4 / 3 + 3) | K | C → F | as v1 |
| `anneal` | Anneal | S | 1 | Gain 3 Guard. Your Guard doesn't halve at the start of your next turn. (→ 6) | K | B | 8 |
| `quench` | Quench | S | 1 | Gain 5 Guard. Spend 2 Onslaught: gain 12 instead. (→ 7 / 15) | K | F → B | as v1 |
| `ride_the_surge` | Ride the Surge | S | 1 | Draw 2 cards. If Onslaught ≥ 3: gain 1 energy. (→ draw 3) | K | F G | 8.45 |
| `hairline_mark` | Hairline Mark | S | 1 | Apply 2 Exposed. Draw 1 card. (→ 3) | K | Z G | 9 |
| `read_the_blow` | Read the Blow | S | 1 | If it intends to attack: gain 8 Guard, apply 1 Stagger. Else draw 2 cards. (→ 11 / draw 3) | K | B C | 9.1 |
| `en_garde` | En Garde | S | 1 | Prime up to 2 Riposte cards from your hand. Draw 1 card. (→ draw 2) | **R** (was rare; 0.3% pick) | C enabler (rack space, card-neutral) | ≈ 1 extra trigger (≈ 5) + 3 = 8 vs 8.5 |
| `shed_plating` | Shed Plating | S | 0 | Shed 6: gain 1 energy and draw 2 cards. (→ draw 3) | **R** (was rare, "If 8+ Guard: lose 8…") | B payoff (Spike) | 7 + 6 − 6 = 7 vs 4.25 × 1.5 (conditional) = 6.4 |
| `kindle` | Kindle | S | 1 | Spend all Onslaught: gain an Ember for every 3 Onslaught spent. (→ cost 0) | **N** | F multiplier | At N = 6: 2 Embers ≈ 2 × 3 d × 4 later turns = 24 − 12 (spent) = 12 vs 8.5. The turn you play it is a tempo loss, and short fights pay less. |
| `cinder_heart` | Cinder Heart | P | 1 | Gain 1 Ember. (→ Opening) | **R** (was status `cinder_heart`: same behaviour, now via Embers) | F multiplier | 3/turn × 3 = 9 |
| `crossed_blades` | Crossed Blades | P | 1 | You can prime 1 additional Riposte card. (→ cost 0) | K | C | 9.6 |
| `parry_ledger` | Parry Ledger | P | **0** | Whenever one of your Ripostes triggers, draw 1 more card next turn. (→ 2 more) | **R** (Phase C) | C payoff | Baseline cf Δprog −3.3 (significant): the 1-cost tempo loss outweighed the draw. Free now; the upgrade doubles the payoff. |
| `anvil_heart` | Anvil Heart | P | **0** | When an enemy attack ends and you lost no HP to it, gain 1 Onslaught. (→ 2) | **R** (Phase C) | B → F bridge | Baseline cf Δprog −2.6 (significant). Free now; the upgrade makes a blocked attack worth 2 Onslaught for the next swing turn. |
| `fault_reader` | Fault Reader | P | 1 | At the start of your turn, apply 1 Exposed to the lowest-HP enemy. (→ Opening) | K | Z enabler | 9 |
| `spark_gap` | Spark Gap | P | 1 | Whenever you Shed Guard, gain 2 Onslaught. (→ cost 0) | **N** | B → F bridge | ≈ 1.2 Sheds/turn × 4 d = 4.8/turn × 3 = 14 vs 8.5. High, but dead without Shed cards; flagged for the sim. |
| `iron_patience` | Iron Patience | P | 1 | At the end of your turn, gain 3 Guard for each unspent energy. (→ 4) | **N** | B C (pays hold turns) | ≈ 1 unspent energy/turn → 3 × 3 = 9 |
| ~~`prism_edge`~~ | Prism Edge | A | 1 | — | **X** | — | 1.5% pick. A Shards card with no Breaker engine; Shards payoffs belong to the shared pool. |

### 5.4 Rares (16): 5 Attacks, 4 Skills, 7 Powers

| id | Name | Type | Cost | Text (→ upgraded) | Status | Engine / role | Price |
|---|---|---|---|---|---|---|---|
| `jackhammer` | Jackhammer | A | 1 | Spend all Onslaught: deal 4 damage, +1 hit per Onslaught spent. (→ 5) | K | F Z multiplier | as v1 |
| `steal_the_swing` | Steal the Swing | A | 1 | Scrap. Deal 10 damage. Riposte: cancel the attack. (→ 14 / then deal 8) | K | C (Timmy, Spike) | as v1 |
| `iron_avalanche` | Iron Avalanche | A | 2 | Keep. Shed all Guard: deal 5 damage plus the Guard Shed to ALL enemies. (→ then gain 8 Block) | **R** (was "damage = defence, lose all Guard") | B Timmy finisher | Guard 20: 25 / 0.8 = 31 − 20 (Shed) = 11 vs 18, but Shed triggers (Molten Shell, Spark Gap) add 20+. Block no longer counts, which removes the v1 "Block + Guard then lose Guard" mismatch. |
| `endless_maul` | Endless Maul | A | 1 | Deal 6 damage, +2 per Onslaught. If Onslaught ≥ 4: add a copy to your hand. (→ 8) | K | F | as v1 |
| `worldbreaker` | Worldbreaker | A | X | Spend all Onslaught: deal 4 damage, +2 per Onslaught spent, X times. (→ +3) | **N** | F Z Timmy | X = 3, N = 4: (4 + 8) × 3 = 36 − 8 = 28 vs 33 (X × 10 × 1.1). With Embers, N = 8: 60 (upgraded 84). |
| `forge_oath` | Forge Oath | S | 0 | Scrap. Gain 1 Ember. (→ and 2 Onslaught) | **R** (Phase C) | F multiplier | Baseline: dead (plays/draw 0.04 over 6,236 draws). The self-removal stopped anyone playing it. Now a free Embers start each combat it is drawn in. |
| `vent_pressure` | Vent Pressure | S | 1 | Draw 2 cards. If Onslaught ≥ 3: Spend all of it and gain 2 energy. (→ draw 3) | **R** (Phase C) | F payoff (Bellows trigger at 4+) | Baseline: dead (plays/draw 0.14). "Spend 4" from a Skill was rarely reachable (mean Onslaught 2.7) and did nothing otherwise. Now never dead. |
| `iron_rhythm` | Iron Rhythm | S | 1 | Draw 2 cards. This turn, Skills also add 1 Onslaught (this one too). (→ draw 3) | K | F B bridge | as v1. 91.7% pick, deck Δ +23.5. Watch in the v2 baseline; nerf to draw 1 if it is still on top. |
| `turnabout` | Turnabout | S | 2 | Gain 12 Block. Riposte: deal damage equal to the attack's total damage to the attacker. (→ 16) | **N** | C Timmy | Played 14.4 vs 20 (under). Riposte vs Act 2's average 20 = 20 (1.0×), vs a 45 boss hit = 45. A kill cancels the attack. |
| `smouldering_core` | Smouldering Core | P | 2 | At the end of your turn, keep up to 4 Onslaught. (→ cost 1) | K | F | as v1 |
| `recoil_spring` | Recoil Spring | P | 1 | When a primed card fires, it comes back to your hand next turn and is free to play that turn. (→ cost 0) | **R** (Phase C) | C multiplier | Baseline cf Δprog −3.5 (significant, the weakest Breaker card). Returned parries are now free replays or free re-holds. |
| `reactive_plate` | Reactive Plate | P | 2 | Whenever Guard absorbs damage from a hit, deal that much to the attacker. (→ cost 1) | K | B | as v1 (9.5% pick, deck Δ +24) |
| `bellows` | Bellows | P | 1 | Whenever you Spend 4 or more Onslaught at once, gain 1 Ember. (→ cost 0) | **N** | F multiplier (Johnny) | ≈ 0.8 big Spends a turn × 1 Ember × 3 d × 3 later turns ≈ 7/turn × 3 = 21 vs 10. A build-around: zero without spend-all cards. |
| `crazing` | Crazing | P | 2 | Exposed on enemies doesn't decay. (→ cost 1) | **N** | Z rule-breaker | Doubles the stack-turns of every Exposed applied (≈ +6–8 d/turn in a Z deck) × 3 = 20 vs 20 |
| `answer_in_kind` | Answer in Kind | P | 2 | When one of your Riposte cards fires, it also resolves its played effects. (→ cost 1) | **N** | C rule-breaker | ≈ 0.8 fires/turn × 8 d = 6.4 × 3 = 19 vs 20 |
| `molten_shell` | Molten Shell | P | 2 | Whenever you Shed Guard, deal that much damage to the enemy with the lowest HP. (→ cost 1) | **N** | B multiplier | ≈ 8 Guard Shed/turn × 3 = 24 vs 20; dead without Shed cards |

Moved down from rare: `en_garde`, `shed_plating`. Cut: none of the v1 rares.

### 5.5 Histograms and budgets

| | Attack | Skill | Power | Total |
|---|---|---|---|---|
| Starter | 2 | 2 | 0 | 4 |
| Common | 10 | 10 | 0 | 20 |
| Uncommon | 7 | 10 | 7 | 24 |
| Rare | 5 | 4 | 7 | 16 |
| **Total** | **24** | **26** | **14** | **64** (v1: 56) |

- **Cost**: X 1 (Worldbreaker); 0-cost 7 (Piston Jab, Gauntlet Tap, Hair Trigger, Loosen Straps, Seam Ripper, Feint Step, Shed Plating; Forge Oath is the 8th, a rare).
- **Keywords**: Keep 2 (Hammerfall, Iron Avalanche; ≤ 3). Opening 2 (Cinder Heart+, Fault Reader+; ≤ 2). Scrap 2.
- **Riposte cards**: 13 (v1's 11, plus Hair Trigger and Turnabout).
- **Shed cards**: 4 (Plate Ram, Loosen Straps, Shed Plating, Iron Avalanche). Shed payoffs: 2 (Spark Gap, Molten Shell).
- **Embers sources**: 3 (Cinder Heart, Kindle, Bellows).
- **Engine piece counts** (some cards count twice): F 22, Z 12, C 18, B 15.
- **Changes from v1**: 12 new (Stoke, Hair Trigger, Loosen Straps, Kindle, Spark Gap, Iron Patience, Worldbreaker, Turnabout, Bellows, Crazing, Answer in Kind, Molten Shell); 6 reworked (Breach Hammer, Plate Ram, En Garde, Shed Plating, Cinder Heart, Iron Avalanche; Cinder Heart's status becomes Embers); 2 retuned (Piston Jab, Hammerfall); 4 cut (Overhand Drive, Find the Seam, Planted Feet, Prism Edge); 40 kept unchanged, plus the 4 starters.

### 5.6 Pricing additions (for §8.5 and the sim's value model)

| Element | Value |
|---|---|
| Gain 1 Ember | 3 d per remaining turn of the combat. Price at 3 remaining turns, so 9 d. The real value is higher in elite and boss fights and lower in hallways. |
| Shed N | costs N d (1 Guard = 1 d, RULINGS 3). "Shed N: X" requires X ≥ N d + 1. |
| "Whenever you Shed" payoff | priced at 1.2 Shed events per turn in a deck with 3+ Shed cards; 0 without. Flag as a build-around. |
| Riposte also resolving the played list | ≈ the card's played value per firing (Answer in Kind) |

---

## 6. Relic and potion asks (for the shared-pool designer)

**New class relics**

| Ask | Rarity | Text | Engine | Why it changes the next reward |
|---|---|---|---|---|
| Coal Scuttle | uncommon, breaker | At the start of each combat, gain 1 Ember. | F | Kindle, Hammerfall and Worldbreaker go up; Cinder Heart becomes optional. It also makes hallways start hot. ~ 3 d/turn. |
| Slag Bucket | common, breaker | The first time you Shed Guard each turn, draw 1 card. | B (Spike) | Loosen Straps and Plate Ram become draw engines; every Shed card is worth taking. |
| Twin Scabbard | rare, breaker | Whenever a primed card fires, add a random Breaker Riposte card to your hand (a created card, gone after combat). | C (the Dead Branch analogue) | Counter refills its own rack, and Answer in Kind / Recoil Spring become must-picks. Bounded by `cap_to_hand` (4) and one fire per enemy attack. |
| Furnace Mantle | boss, breaker | +1 energy. At the start of your turn, Shed all your Guard instead of halving it. | B Johnny trade | Guard can't bank (Rampart Crash and Iron Avalanche fall off), but every point of leftover Guard triggers Molten Shell and Spark Gap each turn. A real build-shaping drawback (commandment 11). Anti-synergy with Bastion Core, which no longer sees halving; say so in its text. |
| Bellows Ring *(optional; skip if the pool is full)* | shop, breaker | Your Spend all Onslaught cards cost 1 less the first time you play each one in a combat. | F | Hammerfall and Worldbreaker turn 1. Uses `modifyCardCost` + `cap_cost_reduction`. |

**New any-class relics (Dead Branch-style)**

| Ask | Rarity | Text | Who uses it |
|---|---|---|---|
| Whetstone | uncommon, any | Whenever you apply Exposed to an enemy, apply 1 more. | Breaker Crazing (Fault Reader becomes 2 per turn), and any class with Exposed cards. Stat-shaped, but it doubles small sources, so 1-Exposed cards rise in the ranking. |
| Recoil Coil | rare, any | Whenever an enemy's attack is cancelled, gain 1 energy next turn. | Breaker (Steal the Swing, Riposte kills, Turnabout kills), and Halt-like effects for others. Rewards kill-before-hit. |

**Existing relics: combos to keep in mind and outliers to watch**
- **Crazing + Fracture Engine** is the class's "Dead Branch + Corruption" moment (§3.2): very strong, and it needs a rare card + a rare relic + 2 commons. Leave it in; watch the Act 3 cap-boss numbers.
- **Duelist's Oath + Answer in Kind**: each primed card fires twice with both lists. Fine, because it is bounded by enemy attacks.
- **Stormbreak Gem + Embers**: reaching Onslaught 6 becomes routine. Watch `cap_bonus_energy` hits.
- **Heavy Heart + Embers**: halving plus Embers ramps very fast, but it gives up Riposte entirely. This is a deliberate pure-swing boss pick.
- **Notched Buckler** (+36.9 win Δ), **Chain Wraps** (+33.9) and **Bulwark Rivets** (+32.4) were the strongest Breaker relics in `report-final.md`, with greedy-bot caveats. Re-check them in the v2 baseline; Iron Patience and Shed make Buckler/Rivets better.

**Potion asks**
- **Ember Tonic** (breaker, uncommon): Gain 2 Embers. A card + potion combo with Hammerfall.
- **Riposte Salts** (breaker, common): Prime up to 3 Riposte cards from your hand, beyond your capacity. Uses the `prime` effect.

---

## 7. Engine hooks and new effect ops (Phase B; each narrow, reported)

Only H1–H6 change `src/engine`. H7–H11 are content using what already exists. I will list every change to shared files (`types.ts`, `effects.ts`, `riposte.ts`, `statuses.ts`, `tuning.ts`, `text.ts`) in the Phase B report.

**H1. Status `embers`** (content, in `BREAKER_STATUSES`; engine: one TUNING key).
- Fields: `{ id: 'embers', name: 'Embers', stacks: 'amount', decay: 'never', tick: 'never', isDebuff: false, text: 'At the start of your turn, gain {stacks} Onslaught.', triggers: { onTurnStart: [status self onslaught {scale: 'stacks'}] } }`.
- Engine: add `TUNING.caps.embers = 10`, the per-status cap path (as for Guard/Exposed), and `{embers_cap}` in `keywordTextValues()`.
- The existing `cinder_heart` status is deleted; Cinder Heart applies `embers 1`. Anything that referenced `cinder_heart` (sim tags, tests) moves to `embers`.

**H2. Hook `onStatusSpent: { id: StatusId; amount: number }`** (new `HookInfoMap` entry).
- Dispatched on the spender (`frame.self`) by `spend_status` right after stacks are reduced, when `n > 0`, before the clause's effects are enqueued.
- Used by Bellows (`id === 'onslaught' && amount >= BELLOWS.min` → queue `status embers +stacks`) and by relic asks.

**H3. Effect `shed { n: number | 'all'; effects: Effect[] }`** (new `Effect` variant, player only).
- If `n` is a number and the player's Guard < n: skip (no event). Otherwise:
  1. Lose `amount` Guard, where amount = n, or current Guard for `'all'` (possibly 0, mirroring ruling 33). No `guardDecay`, no `onGuardAbsorbed`.
  2. Emit a new event `guard_shed { target: 'player', amount }`, so the renderer can animate the gold shield cracking off.
  3. If `amount > 0`, dispatch the new hook `onGuardShed: { amount: number }` on the player (statuses, then relics).
  4. Enqueue `effects` with `frame.shed = amount`.
- New amount scale `'shed'` (valid only inside `shed`; throws outside, like `spent`).
- Text: `shed` contributes `{shed}` = n (numeric only; "Shed all Guard" is literal text). The keyword detector maps effect type `shed` → keyword `shed`.
- "… instead" Shed cards (Plate Ram) use a `conditional` on `compare {left: {scale: guard}, op: '>=', right: n}` whose `then` holds the `shed`, so they always make exactly one hit (same pattern as `spendInstead`).
- Validation: a `shed` effect may not target enemies; enemies have no Shed.

**H4. Modifier hook `riposteResolvesPlayed?(ctx: ModifierCtx, card: CardInstance): boolean`** (player listeners).
- In `fireRiposte`, after enqueuing the `riposte` list, if any listener returns true, also enqueue the card's played `effects` with the same frame (`target` = attacker, `riposte: true`, depth 0). Both run before the `finish_card`.
- It is still not a play: no Onslaught, no `onCardPlayed`/`afterCardPlayed`, no Cadence.
- If the attacker died to the Riposte list, effects aimed at it do nothing (the existing dead-target rule) and self effects still resolve.
- Draw in the played list draws into hand now, counting toward `cap_draw` for the turn it happens in. Energy gained in the enemy phase is gained and then lost at the refill. A content test asserts that no Breaker Riposte card has `energy` in its played list, so no text lies.
- Answer in Kind's status returns true.

**H5. Modifier hook `keepEnemyStatus?(ctx: ModifierCtx, enemyUid: number, id: StatusId, stacks: number): number`** (player listeners).
- Folded with the enemy's own `keepStatus` (max) in `keptStatus` when the owner is an enemy. This leaves the existing `keepStatus` semantics alone.
- Crazing returns `stacks` for `id === 'exposed'`.

**H6. Amount scale `'energy'`**: the player's current (unspent) energy. Iron Patience reads it in `onTurnEnd` (player turn end step 1, before anything clears energy).

**H7. Kindle** is pure content: `spend_status {id: onslaught, n: 'all', effects: [status self embers {per: 1 / KINDLE.every, scale: 'spent'}]}` with `values: { every: 3 }`. Text: "gain an Ember for every {every} Onslaught spent".

**H8. Worldbreaker** is pure content: `spend_status all → damage {amount: {base: 4, per: 2, scale: 'spent'}, times: 'X', target: 'target'}`. The `x` frame field already passes through `spend_status`.

**H9. Turnabout** is pure content: `riposte: [damage {amount: {scale: {intent_damage: 'target'}}, target: 'attacker'}]`. `Intent.damage` already includes current modifiers, so Stagger you applied earlier lowers the reflect. That is honest and preview-visible.

**H10. Molten Shell, Spark Gap, Iron Patience** are statuses:
- **Molten Shell**: an `onGuardShed` event hook → `ctx.queue([damage {amount: info.amount, target: 'lowest_hp_enemy'}])`. It is a player hit, so Exposed applies. Its text has no numbers.
- **Spark Gap**: a declarative trigger `onGuardShed: [status self onslaught {scale: 'stacks'}]`. The card applies 2 stacks.
- **Iron Patience**: `onTurnEnd` → `guard {scale: fn}` where the `amounts` fn = stacks × energy. The card applies 3 stacks (4 upgraded).

**H11. En Garde** is pure content: `prime {n: 2}`, then `draw {n: 1}`.

**H12. Sim data hooks** (tags only, no engine change). Every Breaker card gets:
- `engine:furnace | engine:crazing | engine:counter | engine:bastion` (one or more);
- `role:enabler | role:payoff | role:multiplier | role:bridge | role:glue`.

These let the sim measure "engine assembled" (≥ 1 multiplier + ≥ 2 other pieces of one engine in the deck) and the win rate when assembled, without hard-coding card lists.

---

## 8. Keyword glossary entries (for `src/content/keywords.ts`; conveyance owns it, I add these)

```ts
{
  id: 'embers', name: 'Embers', group: 'breaker', terms: ['Ember', 'Embers'],
  text: 'At the start of your turn, gain Onslaught equal to your Embers. Embers last the whole combat. Max {embers_cap}.',
},
{
  id: 'shed', name: 'Shed', group: 'breaker', terms: ['Shed'],
  text: 'Shed N: if you have at least N Guard, lose N Guard and do the effect; if not, skip it. Shed all Guard: lose all of it; the effect can use the amount Shed. Shedding is not damage.',
},
```

The `effectKeywords` mapping gains `shed → 'shed'`, and status `embers` maps through its id. No other new terms: "played effects" (Answer in Kind) is explained by the existing Riposte box. If the keyword test objects to "played", I will reword the card ("…also does what it does when played"), not add jargon.

---

## 9. Hooks for the sim (Phase B intake)

When `docs/balance/report-v2-baseline.md` arrives, I fold it in like this:

1. **Cut-or-buff rule**, per card: if pick rate is in the bottom 10% **and** the floor-bucketed deck Δwin is at or below the class median, the card is either buffed one step (one number, at most +15% value) or cut if it has no engine role. The v1 low-pick cards I kept are kept on purpose, because their deck Δ is +25 to +37: Counterweight, Rivet Flurry, Piston Jab, Seam Ripper, Chain Driver, Fault Line, Read the Line, Rivet Wall. They are the first candidates if the data says otherwise.
2. **Engine checks** (needs H12 tags). For each engine I want:
   - the assembly rate by act;
   - the win rate when assembled versus not;
   - the floor it first assembled.

   Targets:
   - every engine assembles in ≥ 15% of runs that took its first piece;
   - it comes online at floor 15–25;
   - the assembled win rate is 10–25 points above the class average.

   An assembled engine above +30 gets its multiplier nerfed first, never its commons.
3. **Telemetry I'd like the sim agent to add**:
   - Embers at turn start (distribution, peak per combat);
   - Guard Shed per combat and Shed events per turn;
   - Riposte played-list resolutions (Answer in Kind);
   - Exposed stacks at each multi-hit play (Crazing);
   - Onslaught spent per spend-all play;
   - `cap_hits` by cap for Breaker decks (Stormbreak/Vent/Bellows energy).
4. **Personality bots** (brief item 2), if the sim agent builds them, are the fairest test of these engines:
   - a *Furnace* bot that holds Hammerfall and plays Kindle on low-Onslaught turns;
   - a *Counter* bot that ends turns with Riposte cards in hand;
   - a *Bastion* bot that alternates hold and Shed turns.

   The greedy bot undervalues all three (it ranked Hammerfall at 4% and En Garde at 0.3%).
5. **First numbers I expect to move**: Spark Gap (2 → 1 Onslaught), Bellows (threshold 4 → 5), Iron Rhythm (draw 2 → 1), Piston Jab (base 3 → 2), Kindle (every 3 → 4), `TUNING.caps.embers` (10 → 8).

---

## 10. Lead rulings (2026-10-30) and how they were applied

1. **Embers cap 10**: approved (`TUNING.caps.status.embers`).
2. **Shed at 0 / below N**:
   - **Shed all Guard** at 0 Guard still plays and Sheds 0; amounts that read the Shed get 0. `guard_shed` / `onGuardShed` don't fire for a 0 Shed, so Molten Shell and Spark Gap get no free triggers.
   - **Shed N with less than N Guard**: the lead's default was "Shed what you have". I argue for, and implemented, **"Shed N requires N"** (the clause is skipped, exactly like "Spend N Onslaught", GDD §2.1). Reason: under "Shed what you have", a fixed payoff becomes free at 0 Guard:
     - Shed Plating would be a 0-cost "gain 1 energy, draw 2 cards" with no cost at all.
     - Loosen Straps would be a 0-cost "draw 2".
     - Plate Ram would always deal its big number.

     That makes free energy and draw (stacking with Iron Rhythm and Spark Gap) and removes the hold-then-break decision. If the lead still prefers "Shed what you have", it is a one-line engine change in `effects.ts` (`case 'shed'`), and Plate Ram's condition goes away.
3. **Answer in Kind draw / energy on the enemy turn**: banked, as ruled. Implemented as a **generic next-turn bank** (`bankNextTurn` in `effects.ts`):
   - Any player `draw` / `energy` gain that resolves outside the player's turn, or an effect marked `nextTurn: true` (for the Chronist), is stored in `combat.counters.bankDraw` / `bankEnergy`.
   - It pays out at the next player turn start: energy right after the refill, cards with the turn-start draw. It counts toward no cap.
   - Event `next_turn_bank {draw, energy}` carries the running totals.
4. **Prism Edge cut**: approved. It is held, with the other cuts, until the v2 baseline.

---

## 12. Phase B implementation log

**Engine (shared files; each change additive):**
- `src/engine/types.ts`:
  - effect `shed`; `draw.nextTurn` and `energy.nextTurn`;
  - scales `shed` and `energy`; `EffectFrame.shed`;
  - hooks `onStatusSpent` and `onGuardShed`;
  - modifiers `riposteResolvesPlayed` and `keepEnemyStatus`;
  - events `guard_shed` and `next_turn_bank`;
  - counter keys `bankDraw` and `bankEnergy`.
- `src/engine/effects.ts`: the `shed` case; `spend_status` dispatches `onStatusSpent`; the `shed` and `energy` scales; the next-turn bank on `draw` / `energy`; the `bankNextTurn` helper.
- `src/engine/combat.ts`: bank payout at player turn start (step 3 energy, step 6 draw).
- `src/engine/riposte.ts`: `fireRiposte` enqueues the played effects after the Riposte list when `riposteResolvesPlayed` holds.
- `src/engine/statuses.ts`: `keptStatus` folds the player's `keepEnemyStatus` for enemy-owned statuses.
- `src/engine/tuning.ts`: `caps.status.embers = 10`.
- `src/engine/text.ts`: `{shed}`, the `shed` scale availability, `{embers_cap}`.
- `src/engine/validate.ts`: `shed` is combat-only, player-only and needs n > 0.

**Other areas (minimal, named in the report):**
- `src/content/keywords.ts`: the `embers` and `shed` entries; `shed` maps to the Shed and Guard keywords.
- `sim/policies/lib/cards.ts`: value-walker cases for `shed` and the `shed` / `energy` scales (needed for typecheck).
- `src/render/game/screens/CombatScreen.ts`: a minimal `guard_shed` handler (updates the Guard number, floats "SHED n").

**Content (`src/content/cards/breaker.ts`):**
- Status `cinder_heart` is replaced by `embers`.
- New statuses: `bellows`, `crazing`, `answer_in_kind`, `molten_shell`, `spark_gap`, `iron_patience`.
- 12 new cards and 6 reworks, with numbers exactly as §5.
- Every card gets `engine:*` + `role:*` tags (the `ENGINE_ROLES` table; a missing entry throws).
- Held for the baseline: the cuts (Overhand Drive, Find the Seam, Planted Feet, Prism Edge), and the Piston Jab and Hammerfall retunes. The pool is 68 cards until then.

## 13. Phase C (data-driven, `docs/balance/report-v2-baseline.md`, measured on v1 content)

The final pool is **64 cards: 4 starters, 20 common, 24 uncommon, 16 rare**. Every card is tagged `engine:*` and `role:*`; the content module throws on a stale or missing tag entry.

Counterfactual (cf) values are one extra copy in the starting deck, policy spike, 100 paired seeds. ** marks an interval that excludes 0.

| Change | Data point | Reasoning |
|---|---|---|
| **Cut** Find the Seam | cf Δprog −3.2 **, 3% spike pick | As planned. Fault Line and Hairline Mark apply Exposed with a rider. |
| **Cut** Overhand Drive | cf Δprog −0.8 (ns), value/E 5.96 (lowest Breaker Attack), plays/draw 0.50 | No role left beside Hammerfall and Worldbreaker. |
| **Cut** Planted Feet | cf Δprog −1.1 (ns), value/E 6.7, plays/draw 0.46 | Filler. Shed now owns "reward for a bank". |
| **Cut** Prism Edge | cf Δprog +0.3 (ns) | It isn't weak; it is cut for role. It is the Breaker's only Shards card and belongs to no engine. Shards payoffs move to the shared pool (lead approved). |
| Piston Jab 2/4 → 3/5 base | cf Δwin −8, Δprog −1.3 (ns); value/E 11.4 | A mild buff to the Furnace and Crazing chain fuel. |
| Hammerfall: retune **dropped** (stays 8 +4 / +5) | the strongest Breaker card, cf Δprog +4.4 ** | No buff for the best card. Embers already raise what it spends. |
| Read the Line → 0 cost, draw 1 (+2 at Onslaught 3) | cf Δwin −10 ±8 **, plays/draw 0.43 | Was a weak 1-cost draw. Now a 0-cost mid-chain refill that doesn't break the Furnace chain. |
| Recoil Spring: the returned card is free that turn | cf Δprog −3.5 ** (weakest Breaker card) | Gives Counter decks a payoff: free replays or re-holds of their best parries. |
| Parry Ledger → cost 0; upgrade draws 2 per trigger | cf Δprog −3.3 ** | Floor-1 Powers lose a turn of tempo without their partners. Free removes that; the upgrade scales with Riposte density. |
| Anvil Heart → cost 0; upgrade 2 Onslaught | cf Δprog −2.6 ** | Same tempo diagnosis. It is the Bastion → Furnace bridge payoff. |
| Forge Oath → "Scrap. Gain 1 Ember." (upgraded: and 2 Onslaught) | dead: plays/draw 0.04 over 6,236 draws | Nobody plays a card that deletes itself from the deck. Now a free Embers starter. The run-level effect is gone. |
| Vent Pressure → "Draw 2. If Onslaught ≥ 3: Spend all of it and gain 2 energy." | dead: plays/draw 0.14 | "Spend 4" from a Skill was rarely reachable (mean Onslaught at play 2.7) and blank otherwise. Now never dead, and a long chain becomes a second chain (a Bellows trigger at 4+). |

**Not changed, on purpose:**
- **Strong defence cards**: Bind the Blade (cf Δwin +12 **), Rivet Wall, Read the Blow, Cool the Steel. Turtle's dominance is an encounter-pressure problem (stall breakers and enrage timers, owned by the encounters agent), and Bind the Blade is also the Counter → Furnace bridge.
- **Fault Reader, Crossed Blades, Smouldering Core, Cinder Heart and Ride the Surge**: negative but not significant. They follow the "floor-1 Power without its partners" pattern, which the johnny batches judge better.
- **New v2 cards** (Kindle, Shed cards and so on) are not judged on my Phase B greedy run (Kindle 0% pick): the greedy bot priced them by hand. They wait for the phase-2 rollout drafting.

## 14. Phase D (final tuning): late damage, relic dependence, spike 55–62%

**Problem** (`notes-v2.md` items 4, 6 and 10):
- Breaker's first 60-damage turn came at floor 32 (the other classes: 22–24).
- Its Act 3 boss fights took 15–17 turns, and 59% of its losses were in Act 3 (Leukarch, Sovereign).
- Twin Scabbard was +19 ** and fired 88 times a run.
- Assembled Bastion was −9.

**Diagnosis from the spike decks** (pd seeds, 167 runs reaching Act 3):
- Spike drafts Counter and defence Powers: Spark Gap 77%, Anvil Heart 72%, Parry Ledger 72%, Loaded Spring, Read the Blow and Bind the Blade around 60%.
- It rarely drafts damage: Hammerfall 14%.
- Its largest damage source in Act 3 is still the starter Hew, and Embers peaked at 1.5.

So the late damage had to come from cards the deck already holds, and the win rate had to come back down through the defensive and relic pillars.

**Changes:**

| Card / relic | Change | Why |
|---|---|---|
| **Anvil Heart** | Reworked: "At the start of your turn, if you lost no HP since your last turn, gain 1 Ember." (cost 1, upgraded 0). Was: +1 Onslaught per fully blocked attack, cost 0. | The defended long fight now ramps. Every clean enemy turn adds a permanent Onslaught per turn. This is the core of the fix: Sovereign deaths fell from 29–30% to 8–18% across batches, and its fights from 16.0–16.6 to 13.6–15.0 turns. |
| **Shoulder Check+** (starter, upgraded) | +2 → +3 per Onslaught (the base card stays +2) | It is the one +per card in every deck, so Embers reach every deck through it. With both versions at +3, Act 3 fights went 6.8 → 6.3 turns (pd A/B); the base card went back to +2 to land the class rate. |
| **Kindle** | an Ember per 2 Onslaught spent (was 3) | Furnace pays off sooner. |
| **Hammerfall** | +5 per Onslaught spent (+6 upgraded; was +4 / +5) | Bigger finisher once Embers are up. |
| **Twin Scabbard** (relic) | only the first primed card to fire each turn; the card goes into the draw pile, not the hand | Was +19 ** at 88 triggers a run. Once per turn into the hand still left holders 26 points over the class rate (300 canonical runs), so the card now waits in the draw pile. |
| **Parry Ledger** | cost 1 again, upgraded 0 (Phase C had made it 0 with a 2-card upgrade) | At cost 0 it was in 72% of decks and fed the defensive Counter stall. |
| **Iron Patience** | 1 Guard per unspent energy (2 upgraded; was 3 / 4) | A stall card, in 58% of decks. |
| **Spark Gap** | 1 Onslaught per Shed (was 2) | In 77% of decks. |
| **Bind the Blade** | played Stagger 2 (3 upgraded; was 3 / 4) | Was the strongest card by counterfactual (+12 **). The Riposte list is unchanged. |
| **Read the Blow** | 7 Guard (10 upgraded; was 8 / 11) | Defence trim. |
| **Catch Blade** | Riposte 3 Guard per hit (4 upgraded; was 4 / 5) | Defence trim. |
| **Loaded Spring** | played 6 Guard (8 upgraded; was 7 / 9); Riposte Guard 3 (4 upgraded; was 4 / 5) | Defence trim (in 59% of the Act 3 decks). |
| **Feint Step** | 3 Block (5 upgraded; was 4 / 6) | Defence trim. |
| *Tried and reverted* | Cinder Heart+ 2 Embers; Bellows on Spend 3+ | Together with the +3 base Shoulder Check they put the class at 63–67% on the current tree. |

**A/B results** (spike, `--workers 1`, paired seeds; my script `ab.mjs` reads the personas JSONL). Each row quotes its src/ hash. Priors in every batch: `v2-priors.json` (generated 2026-10-31T10:17, sha256 eb1898ba2112aeeb) and `v2-baseline-priors.json` (2026-10-30T22:12, sha256 f31bca429f34b1d5), read from the snapshot running the batch.

| Batch | Seeds | src/ | Win | Act 3 turns/fight | Leukarch deaths, turns | Sovereign deaths, turns |
|---|---|---|---|---|---|---|
| Baseline, Phase C content (canonA) | v2-0..149 | cbb567299a400a3b | 62.0% | 6.3 | 28%, 13.7 | 30%, 16.6 |
| All of the above except Parry Ledger / Iron Patience 1-2 (canonical B) | v2-0..149 | d762febf94831f9a | 70.0% | 6.1 | 19%, 12.0 | 8%, 14.5 |
| Final set minus the last trims (B7) | v2-0..149 | 061e3b364d29e329 | 60.7% (paired −1.3 ±10.1 vs baseline) | 6.2 | 15%, 11.5 | 16%, 15.0 |
| Current tree, interim (after the shared relic nerfs and boss caps landed) | v2-0..149 | 569395e8f6629aee / 643faffc2c10c139 / 70d3cd492624c39e | 63.3% / 66.7% / 64.0% | 6.1–6.2 | 21–23%, 12.3–12.7 | 9–22%, 13.6–14.6 |
| **Final (current tree, canonical command)** | v2-0..149 | **a380ca8cac9d7f64** | **60.7% ±7.8** (paired −3.3 ±4.7 vs the previous row) | 6.3 | 24%, 13.7 | 22%, 14.2 |

Earlier iterations on the `pd` seeds:
- Baseline 59.5%, src 78f907a78763b351 snapshot family.
- With the Anvil Heart ramp: 61.5%.
- With Shoulder Check +3: 64.0%.
- With the Spark Gap trim: 61.5%.
- Paired deltas were −3.5 to +4.5, each ±8.

**Still at floor 32:** the first 60-damage turn. It is the first Act 3 floor, where enemies first have enough HP to absorb a 60-damage turn; Acts 1–2 fights end before one is needed. What moved is fight length and boss deaths.

## 15. Phase E: engines must pay off for a committed drafter (Heroic, enemy HP 110)

**Problem** (`report-v2-final.md` §1b, `notes-v2-final.md` item 4):
- Spike Breaker was 32.3% at Heroic, but every Breaker johnny was 8–17% (target ≥ 25%).
- Assembled engines did pay off (Counter +16, Furnace +10).
- The johnnies died in Acts 1–2: up to 43% of Crazing deaths in Act 1.

A johnny drafts only its engine's tagged cards, so each engine's pieces must carry a deck on their own. The fix is the pieces' floor (what they do before the engine assembles), not their payoff.

**Changes:**

| Card | Floor added | Engine |
|---|---|---|
| Fault Line | + 1 Stagger | Crazing |
| Hairline Mark | + 2 Stagger | Crazing |
| Crazing | on play: 1 Exposed to ALL enemies | Crazing |
| Thresher Arc, Pivot Sweep, Quake Hammer | tagged `engine:crazing` too (they hit every enemy, so they pay for AoE Exposed) | Crazing |
| Kindle | draws 2 first | Furnace |
| Bellows | on play: 1 Ember ("gain another" on each big Spend) | Furnace |
| Stoke | + 2 Guard (3 upgraded) | Furnace |
| Answer in Kind | + 1 prime capacity | Counter |
| Recoil Spring | draws 1 on play | Counter |
| Loosen Straps | draws 1, then Shed 3: draw 1 more (2 upgraded) | Bastion |
| Shed Plating | draws 1, then Shed 6: 1 energy and draw 1 more (2 upgraded) | Bastion |
| Molten Shell | on play: 6 Guard | Bastion |

**Offsets:**
- **Iron Rhythm** draws 1 / 2 (was 2 / 3). It was the most-picked Breaker card since v1: 75% of spike and 92% of turtle runs.
- **Read the Blow**: 6 / 9 Guard (was 7 / 10).

**Tried and reverted:**
- Sabre Rattle + 4 Block, and Crazing 2 Exposed to ALL. Spike's pick rates jumped (10 → 41% and 11 → 42%).
- Molten Shell 10 Guard.
- With those in, spike Breaker rose 18 points.

**Measurements.** Heroic (`--set enemyHpPct.all=110`), seeds v2, `--workers 1`, one snapshot.
- Priors: v2 sha256 eb1898ba2112aeeb, v2-baseline f31bca429f34b1d5.
- Baseline: the pre-Phase-E Breaker file, src/ c206a866ba95799c.

| Iteration | src/ | furnace | counter | bastion | crazing | spike (paired vs baseline) |
|---|---|---|---|---|---|---|
| Baseline | c206a866ba95799c | 16.7% | 16.7% | 15.0% | 11.7% | 29.3% |
| E1: all floors, generous | 8f35efbb27b23089 | 20.0% | 33.3% | 28.3% | 31.7% | 47.3% (+18.0 ±9.1) |
| E2: generic floors trimmed | 4f22d8dec66c3b02 | 20.0% | 28.3% | 21.7% | 23.3% | 39.3% (+10.0 ±9.4) |
| E3: no Sabre Rattle Block, Crazing AoE 1 | 4bb208b4a21de8e1 | 18.3% | 30.0% | 20.0% | 11.7% | 36.7% (+7.3 ±9.4) |
| E4: + AoE tags, Iron Rhythm trim | 8478792b0ee6f022 | 15.0% | 30.0% | 20.0% | 11.7% | 34.0% (+4.7 ±9.7) |
| **E5 (final)**: + Hairline Mark Stagger, Kindle draw 2 | **1988de11f6f78b96** | **21.7%** | **33.3%** | **26.7%** | **23.3%** | **38.7%** (+9.3 ±9.3) |

Johnny batches are 60 seeds each (about ±10 points), and the spike deltas are about ±9, so neighbouring rows mostly agree within noise.

Final spike Breaker:
- Sovereign deaths fell from 45% to 17%, and its fights from 17.1 to 15.9 turns.
- Act 3 averages 6.8 turns per fight (baseline 7.1).
- 38.7% is inside the 30–45% Heroic band.

## 16. Phase F (ruling 75): the E5 cards that measured negative as an added copy

**Problem:** `report-v2-final-e.md` measured five E5 cards as significantly negative as one extra copy in the starting deck (spike, Heroic, 100 paired seeds):

| Card | Δwin | Δprog |
|---|---|---|
| Loosen Straps | −19 ±13 | −5 |
| Crazing | −18 ±11 | |
| Bellows | −17 ±12 | |
| Molten Shell | −16 ±11 | |
| Iron Rhythm | −11 | |

**Final changes:**

| Card | Change | Evidence |
|---|---|---|
| Loosen Straps | "Gain 4 Guard. Shed 4: draw 2 cards" (3 upgraded), cost 1. Was: 0-cost draw 1, then Shed 3 for 1 more. | Guard-neutral and always a Shed trigger. The old version spent Guard the player needed. |
| Crazing | cost 0 (was 2 / 1); draws 1; upgraded applies 2 Exposed | At cost 1 with the draw it was still −5.8 ±4.0 floors. |
| Bellows | cost 0 (was 1); draws 1; upgraded gains 2 Embers | Without the draw it was −5.4 ±4.0 floors. |
| Iron Rhythm | cost 0 (was 1); draw 2 / 3 again (the Phase E trim to 1 / 2 is reverted) | At cost 1 and draw 2 it was −15 to −20 in two rounds. |
| Molten Shell | cost 1 (upgraded 0; was 2 / 1); 8 Guard; draws 1 | Still negative; see below. |
| Hairline Mark | base Stagger 1 (was 2) | Spike trim. |
| Hair Trigger | Riposte 2 / 4 (was 3 / 5) | Spike trim. It was in 62% of spike decks. |

The principle: a build-around Power that is added early costs a draw and a turn. So each of these Powers now replaces itself, and the cheap ones cost 0.

**Measurements.** Heroic (`--difficulty heroic`), `--workers 1`, a fresh snapshot each round. Card counterfactuals use 60 paired seeds (prefix `cf`); spike uses 150 (v2); each johnny uses 60 (v2). Priors in every round: v2 sha256 eb1898ba2112aeeb, v2-baseline f31bca429f34b1d5.

| Round | src/ | Loosen Straps | Crazing | Bellows | Molten Shell | Iron Rhythm | spike | johnny F / C / B / Cz |
|---|---|---|---|---|---|---|---|---|
| F1: costs cut | 39e6e6b9756efc25 | −10.0 / −2.0 | **−18.3** / −4.4 | −13.3 / −3.2 | −15.0 / **−5.2** | −3.3 / −3.3 | 37.3% | 22 / 28 / 20 / 23 |
| F2: + draws on the three Powers | fc31e617d6839cc5 | **−16.7** / −3.0 | −8.3 / −3.9 | −10.0 / −2.1 | **−23.3 / −6.9** | **−20.0 / −5.9** | 39.3% | 22 / 23 / 28 / 20 |
| F3: Crazing and Molten Shell cost 0 | 429ea886a34c4efa | −13.3 / −2.5 | 0.0 / +0.4 | −6.7 / −1.1 | −10.0 / −2.3 | **−15.0 / −5.7** | 43.3% | 20 / 28 / 32 / 30 |
| F4: Iron Rhythm cost 0 | 100fad98f50c4a79 | −10.0 / −2.5 | −6.7 / −0.3 | −11.7 / −1.9 | −16.7 / −3.0 | 0.0 / +1.1 | 47.3% | 25 / 38 / 32 / 32 |
| F5: + Hairline Mark / Hair Trigger trims | 3d4249d674b23c61 | −1.7 / −2.0 | −3.3 / −0.7 | −8.3 / −2.3 | **−21.7 / −7.4** | 0.0 / +1.3 | 50.0% | 18 / 35 / 30 / 28 |
| F6: Crazing and Molten Shell cost 1, Bellows no draw | 35524f80862959e5 | −13.3 / −2.6 | −16.7 / **−5.8** | −11.7 / **−5.4** | −21.7 / **−9.5** | +8.3 / +0.7 | 43.3% | 20 / 27 / 30 / 20 |
| **F7 (final)** | **4984438b7e749419** | 0.0 / −0.8 | 0.0 / −0.1 | +1.7 / −0.2 | −10.0 / **−9.1 ±5.4** | +11.7 / +2.6 | **47.3%** | **20 / 32 / 30 / 22** |

Cells are Δwin points / Δprog floors. Bold means the 95% interval excludes 0. Typical half-widths are ±15–18 points of win and ±4–5 floors.

**Paired spike check on one snapshot** (src 92b0c0639b4964af vs 3d4249d674b23c61): E5 content measured 35.3%; the F5 set measured 50.0%, so +14.7 ±7.9. Cheapening these cards is what lifts spike. F7 sits between F5 and F6.

**Open: Molten Shell.**
- It is negative at every strength tried: Δprog −5 to −9 floors, from cost 2 / 6 Guard up to cost 0 / 12 Guard + draw.
- On its own it is "gain 8 Guard, draw 1", and a starting deck has no Shed card to trigger it. So its harm is probably not its effect. The likeliest cause is how it steers spike's drafting toward weak Shed cards.
- I couldn't trace it: `sim/trace.ts` can't add a card.
- It needs a trace with an added-card option, or a lead decision to cut it.

## 11. Sources

- Mark Rosewater, "Timmy, Johnny, and Spike Revisited", Making Magic: https://magic.wizards.com/en/news/making-magic/timmy-johnny-and-spike-revisited-2006-03-20-2
- Giovannetti on Dead Branch and design goals (PC Gamer): https://pcgamer.com/slay-the-spire-designer-discusses-new-characters-and-card-game-inspirations
- Road to the IGF: Mega Crit's Slay the Spire (Game Developer): https://www.gamedeveloper.com/disciplines/road-to-the-igf-mega-crit-games-i-slay-the-spire-i-
- GDC talk summary, "How to Balance Game Design with Metrics for Slay the Spire": https://glasp.co/youtube/7rqfbvnO_H0
- Rupture (STS wiki): https://slay-the-spire.fandom.com/wiki/Rupture?oldid=2410
- Stances (STS wiki): https://slaythespire.wiki.gg/wiki/Stance
- Ironclad, Silent and Watcher build guides (High Ground Gaming): https://www.highgroundgaming.com/?p=86630 · https://www.highgroundgaming.com/slay-the-spire-silent-guide-tips-builds/ · https://www.highgroundgaming.com/slay-the-spire-watcher-guide-tips-builds/
- Block-deck discussion (Barricade / Entrench / Body Slam / Juggernaut), Steam community: https://steamcommunity.com/app/646570/discussions/0/2763442118812781210
- In-repo: `docs/research/sts-design.md` §1.16–§1.18 and §3; `docs/balance/report-final.md` (Breaker card rewards and telemetry).
