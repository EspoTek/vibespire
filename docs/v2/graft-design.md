# The Graft — v2 card design (Phase A)

Status: Phase A design, Graft card designer, 2026-10-30. Nothing in `src/` is changed yet. This replaces the *structure* of `docs/cards/graft.md` (v1). Every card marked **kept** keeps its v1 machine block and its sim-tuned numbers from `docs/cards/graft.md` and `src/content/cards/graft.ts`. Only new and reworked cards get machine blocks here (§6).

Inputs: `docs/v2/BRIEF.md` ("Design framework for fun"), `docs/RULINGS.md` (40–46), `docs/balance/report-final.md` and `changelog.md` (v1 sim), `docs/research/sts-design.md` §3 (mechanics we must not copy), and the web research in §1.

---

## 0. The diagnosis

v1 Graft is a class of four *directions* (Gardener, Blight, Compost, Mass), not four *engines*. Every card sits on the rate line, so a deck of 15 Gardener cards plays like 15 slightly better Strikes. It has no moment where the deck "turns on". The sim and the user agree on what that produces:

1. **No multiplier anywhere.** Rot is capped at 15, so a Catalyst-style "double it" is worthless. Bloom is capped at 10, and nothing reads "at the cap" as a goal. Prune pays 1 Bloom, once.
2. **Wasted resources.** `cap_stacks` fires on 45–47% of Graft turns. Two causes:
   - Rot at 15 still tries to grow +1 every tick.
   - Bloom overflows: Prune 2 onto a Bloom-9 card loses the extra point, and once the copies in hand are capped, Prune has nowhere useful to go.

   A capped Seed Bite is the *success* state of the class, and it turns the class mechanic off.
3. **Dead cards.** Canker Bite, Mire Carapace, Shear, Mulch Maul, Sap Drip, Spore Lash, Transplant, Propagate and Verdant Tide all have pick rates under 5%. Some of that is the bot's reward model (changelog "needs a design change" item 4). Some of them really are at-rate filler with no partner.
4. **Weakest class.** Graft wins 23.7% against 30–32% for the others. Small Block pieces plus the bot's multi-Block blind spot (changelog item 3) explain part of it. The rest is that nothing in the class compounds.

The v2 fix is four engines. Each one has an enabler, a payoff and a multiplier or rule-breaker, and each is built from Bloom, Prune or Rot plus **three small new mechanics: Harvest, Ripe and Chaff**. There is also **one rule change, Spill**, which removes the waste.

---

## 1. Research notes (what the reference engines teach)

**Rosewater, "Timmy, Johnny, and Spike Revisited"** ([Wizards, 2006](https://magic.wizards.com/en/news/making-magic/timmy-johnny-and-spike-revisited-2006-03-20)):
- **Timmy** *experiences*. The Power Gamer "equates power with fun", and the Adrenalin Gamer wants swingy, unpredictable outcomes.
- **Johnny** *expresses*. The Combo Player "is fascinated by the interaction of the cards", and the Offbeat Designer builds from a concept rather than from a card.
- **Spike** *proves*. The Tuner refines known decks, and Nuts & Bolts perfects play.

Design rule taken: every engine needs a visible big number (Timmy), a non-obvious two- or three-card interaction that the keywords hint at (Johnny), and clean, efficient commons with a real choice (Spike).

**Engine patterns, all STS1 unless noted:**

| Engine | Enabler | Payoff | Multiplier / rule-breaker | Why it's fun |
|---|---|---|---|---|
| Poison | Deadly Poison, Noxious Fumes, Bouncing Flask | Time (Poison ticks) | **Catalyst** doubles or triples the stack | Many small pieces quietly build one number, then one card cashes it. Without Catalyst the deck is "slow to kill bosses" ([Steam](https://steamcommunity.com/app/646570/discussions/0/1642045003588216712)). Corpse Explosion fixes packs. |
| Exhaust | Corruption (Skills cost 0 and Exhaust) | Feel No Pain, Dark Embrace | **Dead Branch** (Exhaust → random card) | Corruption alone is mediocre. Dead Branch is "the real broken piece" ([Steam](https://steamcommunity.com/app/646570/discussions/0/1620600279666778446/?ctp=2)): a relic refills the resource the card burns. |
| Rupture | Hemokinesis, Combust, Brutality | Strength | Rupture converts *HP-loss instances* into Strength | It counts *instances*, not amounts ([wiki](https://slay-the-spire.fandom.com/wiki/Rupture)). Many small triggers beat one big one, which steers the draft. |
| Focus | Orb channel cards | Every orb's passive and evoke | Defragment, Biased Cognition | One stat multiplies every piece already in play ([pikapost](https://pikapost.neocities.org/posts/defect.html)). |
| Mantra | Worship, Prostrate, Devotion | Divinity (3× damage, +3 energy) | Threshold at 10, then reset | A **threshold** creates a "this turn I go off" moment. Retain lets you time it ([wiki](https://slaythespire.wiki.gg/wiki/Devotion)). |

Patterns Vibespire takes (the principle, not the card):
- **Cash-out.** A slow resource converted in one play: Catalyst and Divinity. This becomes **Harvest**.
- **Threshold unlock.** Mantra 10 becomes **Ripe** at Bloom 10.
- **Refuel the burned resource.** Dead Branch becomes **Chaff**, plus the Husk Sac relic ask.
- **Count instances.** Rupture becomes **Clear-Cut**: one Prune card Scraps many cards, and each Scrap is a Prune.
- **One value lifts everything.** Focus becomes **Rootstock**: the tallest Bloom value is shared by every Bloom card.

---

## 2. New rules and mechanics (all four engines use these)

Each item was checked against `docs/research/sts-design.md` §3 for the trigger + effect + resource shape.

### 2.1 Spill (rule change; fixes capped-Bloom waste)
**Rule.** Bloom a card can't hold **spills** to the Bloom card in your deck with the least Bloom that isn't capped (ties random, `misc` stream). This covers:
- Bloom over a card's cap;
- a Prune or Bloom effect that finds no eligible card.

Spill happens once. Anything the spill target can't hold is lost (`cap_stacks`).
- It replaces "Bloom beyond the cap is lost" (GDD §2.4) and extends RULINGS 43 (Standard Prune never wastes its Bloom) to every Bloom source.
- "Choose a Bloom card in your hand" stays the skill expression: Spill only catches what would otherwise be lost.
- It feeds the wide deck (Canopy) without the player taking any action. That is the right direction for leftovers.
- **C19**: no STS analog. It is a rule about where a per-copy resource goes when it overflows.

### 2.2 Ripe (new keyword: a state, not an effect)
**Rule.** A Bloom card with **10 or more Bloom** is **Ripe** (`TUNING.bloomRipe = 10`).
- The threshold is fixed even with Elder Seed (cap 15), so Elder Seed adds growth *past* Ripe rather than delaying it.
- Cards print a clause **"Ripe: …"** that resolves only if the card is Ripe when the clause resolves.
- A copy turns Ripe once per run, and that is an event: a gold leaf on the frame and an `onRipe` hook.
- **Why.** Reaching the cap is the class's run-long goal, and in v1 it did nothing. Ripe makes it a "comes online" moment, and with Spill the overflow keeps working.
- A focused Prune deck gets its Heartseed copy to 10 around floors 14–22, which is the brief's floor 15–25 window. The `bloomRipe` number is the lever.
- **C19**: nearest are Mantra's threshold (Divinity) and STS2 Quest cards (which transform on a condition). Ripe is a **permanent per-copy threshold, reached by thinning other cards**, that unlocks a printed clause. The card doesn't transform, and the threshold is never spent.

### 2.3 Harvest N (new keyword: the Rot cash-out)
**Rule.** **Harvest N**: the enemy loses HP equal to **N × its Rot**, then its Rot is **halved** (round down). It is HP loss, so it ignores Block and Guard (like Rot). If the HP loss kills, Rot spreads from the full stack, because the spread runs at death, before the halving.
- **Why it isn't Catalyst.** Catalyst multiplies the stack and keeps it; the reward is "more Poison". Harvest *consumes* half the stack for damage now, and the clock has to regrow. Rot's identity (grows +1 per tick, capped, spreads on death) stays intact.
- The engine is a **sow → ripen → reap → re-sow** loop: apply Rot, let it climb to the cap, Harvest, then refill it (Death Cap, Blightcap, Ripening Rot).
- A capped Rot of 15 no longer wastes its cap hits. It is the best moment to Harvest.
- **C19**: Poison and Catalyst (stack doubling), Corpse Explosion (death burst) and Doom (execute). None of them converts a growing DoT into burst while resetting it.

### 2.4 Chaff (new token card: Prune fodder)
**Chaff**: 0-cost Status, "Gain 2 Block. Scrap." It is created in combat and is never in your deck. It is the Graft's own Prune fodder, so a Prune no longer has to eat a real card.
- Because it is a **Status**, it already combos with Shed Husk ("if you Scrapped a Status or Curse, draw 2"), Grafting Knife (+1 Bloom when Pruning a Status), Scrap Magnet (Guard when a Status enters your hand) and Wild Growth's Tangles. That gives cross-type combos at once with existing content.
- Chaff counts toward `cap_to_hand` (RULINGS 10), which bounds Chaff at 4 per turn.
- **C19**: nearest are Shivs (0-cost token Attacks) and Dead Branch (Exhaust → random card). Chaff isn't the payoff, it's what you sacrifice. Its value comes through Prune and the `onPrune` Powers.

### 2.5 Four rule-breaking rares
Specs are in §7.

| Card | Rule-breaker | C19 nearest | Why it differs |
|---|---|---|---|
| **Clear-Cut** (Power) | Prunes may Scrap any number of cards, and each Scrapped card is its own Prune. | Fiend Fire / Second Wind (exhaust many cards for value) | A Power that changes the class keyword. It multiplies every `onPrune` payoff and every Bloom gain (the Rupture "instances" lesson). |
| **Rootstock** (Power) | Every Bloom card uses your highest Bloom this combat. | Limit Break (double Strength), Focus | It shares a *per-copy permanent* value across copies. No stat changes. |
| **Perennial** (Power) | Once per turn, a Ripe card you play returns to your hand. | Echo Form / Necronomicon (free replay), Hologram | It isn't free: you pay its cost again. It is gated by Ripe, which takes a whole run to reach. |
| **Deep Rot** (Power) | Rot on enemies has no cap. | — (Poison has no cap) | The cap was the Rot design pillar. Lifting it is the late rare that lets Harvest scale. |

---

## 3. The four engines

Each engine lists its pieces as **E** enabler, **P** payoff and **M** multiplier / rule-breaker. All numbers are with `TUNING.enemyHpPct/enemyDamagePct = 85` excluded (raw numbers, as in tests). Bloom values are expected for the floor (§6 of the v1 doc: a focused copy reaches about 5 by floor 15 and about 10 by floor 25).

### 3.1 COMPOST — "the deck eats itself" (Prune chain)
Prune is the resource, Chaff refuels it, and `onPrune` Powers convert each Prune into damage, Rot and Bloom. **Clear-Cut** turns one Prune card into four Prunes.

| Role | Cards (rarity) |
|---|---|
| E: Prune sources | Graft Hide (S), Grafting Cut (C), Shear\* (C), Deep Graft (C), Shed Husk (C), Leaf Litter (C), Seed Rain (U), Dusk Pruning (U), Uproot (U); Seed Bite's Ripe clause |
| E: fodder | **Molt** (C, +2 Chaff), **Shear**\* (C, +1 Chaff), enemy Statuses (Tangle, Jitter, Drift) |
| P | Mulch Maul (C, per Scrapheap card), Decomposer (U, Rot per Prune), **Thresher**\* (U, AoE per Prune), Reaping Vine (R, hits per Prune this combat) |
| M | **Clear-Cut** (R). Relics: Compost Heap, Grafting Knife, Wild Growth (boss), **Husk Sac** (ask) |

**Worked example.** Floor ~20, Act 2 three-enemy hallway (each ~40 HP).
- Deck (18): Lash ×2, Husk ×3, Seed Bite ✿8, Graft Hide, Shear, Molt, Shed Husk, Deep Graft, Mulch Maul, Thresher ✿2, Clear-Cut, Decomposer, Dusk Pruning, Leaf Litter, Spore Haze.
- Thresher and Clear-Cut were played on turns 1 and 2. Turn 3 hand: Molt, Shear, Lash, Husk, Seed Bite. 3 energy.
- **Molt** (1): 3 Block; +2 Chaff.
- **Shear** (1): 4 damage, +1 Chaff, then Prune. Clear-Cut: Scrap Chaff ×3 + Lash = **4 Prunes**.
  - Thresher 4 × 6 = **24 to ALL**.
  - Decomposer 4 × 2 = 8 Rot spread on random enemies.
  - Seed Bite gains 4, which takes it to 10 (the 2 extra Spill to another copy). **Seed Bite is now Ripe.**
- **Seed Bite** (1): 4 + 2 × 10 = 24. Ripe: Prune the Husk, one more Thresher (+6 to ALL) and +2 Rot.
- **Total:** ≈ 30 to every enemy + 28 single target + 10 Rot ticking ≈ **118 damage** across the pack, against about 25 for an at-rate turn. It is also a 3-Block turn, which is the price.

**Comes online:** floor ~12–20. Thresher (now uncommon) plus any fodder source is already good. Clear-Cut is the spike. Dusk Pruning + Clear-Cut ("Scrap my whole leftover hand at end of turn") is the Johnny discovery.
**Weak to:**
- Big single hits: you Scrap your Husks.
- Bosses: AoE is wasted. Reaping Vine and Mulch Maul are the single-target payoffs.
- Hand-size squeeze: Gravity Loom's hand limit of 7.
- Turn-1 burst: the Powers need setup.

### 3.2 HARVEST — "sow, ripen, reap" (Rot clock → cash-out)
Rot climbs on its own, and Harvest converts it into burst. Re-sowing (Death Cap, Blightcap, Ripening Rot) refills it for the next Harvest. **Deep Rot** removes the ceiling.

| Role | Cards |
|---|---|
| E: sow | Spore Lash (C), Blightcap (C, Bloom), Spore Haze (C), Leaf Litter (C), Miasma Sweep (U), Puffball (U), Choking Spores (U), Decomposer (U); potion Blight Vial; relic Pollen Sac |
| E: ripen (accelerate / refill) | Ripening Rot (U), Death Cap (R, "to the cap"), **Sporeburst**\* (U, Harvest 1 + re-sow) |
| P: reap | **Burst Pod** (C, Harvest 2), Canker Bite (C, +1 per Rot), **Mire Carapace**\* (C, Block per Rot), **Reap** (U, hit + Harvest 2), **Grim Harvest** (R, Keep, Harvest 3) |
| M | **Deep Rot** (R, no cap), Mycelial Net (relic, cap 20), Plague Bloom / Rot Censer (pack spread), **Reaper's Sickle** (ask) |

**Worked example.** Floor ~22, a single Act 2 boss.
- Deck: Spore Lash, Blightcap+ ✿4 (Rot 2 + 2 × 4 = 10), Ripening Rot, Reap, Burst Pod, Death Cap, Mire Carapace ×2, Choking Spores, plus starters.
- **T1** Spore Lash (Rot 1) + Ripening Rot. Tick 1 → Rot 2.
- **T2** Ripening → 3. Blightcap+ → 13. Tick 13 → 14.
- **T3** Ripening → 15 (cap). **Reap**: 8 + Harvest 2 = **38**, Rot → 7. Mire Carapace 4 + 3 = 7 Block. Tick 7 → 8.
- **T4** Ripening → 9. **Death Cap**: 8 + Rot → 15 (re-sown in one card). **Burst Pod**: Harvest 2 = **30**, Rot → 7. Tick 7 → 8.
- **Four turns:** ticks 1 + 13 + 7 + 7 = 28, Harvest 68, hits 20 ≈ **116 (29 per turn)**, against v1's pure-Blight estimate of 16.6 + 12.9.
- **With Deep Rot**, Rot keeps climbing by about 2 per turn after T4: Rot 24 on T8 means Grim Harvest+ (×4) = **96** in one card.

**Comes online:** floor ~10–18 with only commons and uncommons (Burst Pod and Reap, plus any Rot source). Deep Rot and Grim Harvest are the late ceiling.
**Weak to:**
- Short fights and burst-check elites: the clock needs 2–3 turns.
- Turn-1 damage races.
- Enemies that kill themselves or flee (the spread is lost).
- Halving punishes a mistimed Harvest: Harvesting at Rot 4 is a bad trade, which is the skill test.

### 3.3 RIPE — "the prize marrow" (one tall copy, played again and again)
The run-long plan is to grow one copy to 10. Once it is Ripe, its clause turns on and Perennial / Second Flush play it two or three times a turn.

| Role | Cards |
|---|---|
| E: concentrate Bloom | Deep Graft (C, Prune 2), Sap Drip (C), Pollen Sting (U), Patient Thorn (U, Keep), Humus Rite (R, Bloom = Scrapheap size), Crystal Graft (R, Shard → 3 Bloom); relics Heartseed, Nursery Tray; potion Growth Sap |
| P: Ripe clauses | **Seed Bite**\* (S, Ripe: Prune), **Barb Flick**\* (C, Ripe: draw 1), **Twin Thorn**\* (U, Ripe: one more hit), **Heartwood Spear**\* (R, Ripe: costs 1 less) |
| P: replay | **Second Flush** (U, the most-grown card returns from discard, 0 cost if Ripe) |
| M | **Perennial** (R). Relics: Elder Seed (more numbers past Ripe), **Trellis** (ask) |

**Worked example.** Floor ~20, single target.
- Deck: Seed Bite+ ✿10 (Ripe: 4 + 3 × 10 = **34**), Heartwood Spear ✿6, Patient Thorn ✿4, Perennial (played T1), Second Flush, starters, Deep Graft, Sap Drip.
- Turn 2: Heartseed seeded Seed Bite on T1, and it's back in hand. 3 energy.
- **Seed Bite+** (1): 34. Ripe: Prune a Lash → +1 Bloom to Patient Thorn. Perennial returns Seed Bite.
- **Seed Bite+** (1): 34. Ripe: Prune a Husk → +1. It goes to the discard pile (Perennial is once per turn).
- **Second Flush** (1): Seed Bite (the most Bloom in the discard) returns, Ripe, so it costs 0. **Seed Bite+** (0): 34. Ripe: Prune.
- **102 single-target damage + 3 Prunes** in one turn. It is 34 damage per energy, the card's own rate, played three times. No Block, which is the price.

**Comes online:** floor ~15–25 (the Ripe threshold). This is the slowest engine and the biggest single-target number, and the brief's floor window was designed around it.
**Weak to:**
- Not drawing the copy after turn 1 (Heartseed only seeds turn 1; Second Flush and Trellis are the fixes).
- Packs: Ripe Thornwhirl is the AoE route, Rootstock the splash.
- A slow first act while the copy grows.
- Status-heavy hands.

### 3.4 CANOPY — "a hedge of small Bloom cards" (wide Bloom → shared growth)
Take many cheap Bloom cards, because the deck-count payoffs scale with the count. **Rootstock** gives every one of them the Bloom of your tallest copy, so a wide deck with one Ripe copy becomes a deck of Ripe cards.

| Role | Cards |
|---|---|
| E: Bloom-card count | Barb Flick (C), Tendril Reach (C), Sap Shell (C), Thornwhirl (C), Blightcap (C), Grafting Cut (C), **Propagate**\* (U, a copy *with half the Bloom*), Seed Rain (U, Spread Prune); relics Seed Pouch, Heartwood Ring; the Spill rule |
| P: deck-count | Hivestrike (C), Root Mesh (C), Canopy Crush (U), Living Hedge (U), Verdant Tide (R), Hyphal Web (R) |
| M | **Rootstock** (R), plus **Thornstorm** (R, X-cost AoE Bloom card) as the Timmy finisher |

**Worked example.** Floor ~25.
- Deck (24): 10 Bloom cards (Seed Bite ✿10, Propagated Seed Bite ✿5, Barb Flick ×2, Tendril Reach, Sap Shell, Thornwhirl, Twin Thorn, Pollen Sting, Blightcap) + Rootstock, Hivestrike, Verdant Tide, Living Hedge, Hyphal Web and starters.
- Rootstock (2 energy) played on T1. Living Hedge gives 10 Block per turn.
- Turn 3, every Bloom card reads 10:
  - Barb Flick ×2 (0): 13 + 13, Ripe: draw 2.
  - Twin Thorn (2): 25 × 2 + Ripe one more = **75**.
  - Sap Shell (1): 16 Block.
- **Total ≈ 101 damage + 26 Block** (Hedge plus Shell). Verdant Tide later = 4 × 10 = 40.
- Timmy's alternative: **Thornstorm** at X = 3 under Rootstock = 15 × 3 = 45 to ALL.

**Comes online:** floor ~18–28. It needs both one tall copy and width, a deliberate tension with Compost's Prune away. Without Rootstock the deck-count payoffs carry it (v1 Mass, buffed by Spill feeding the wide copies).
**Weak to:**
- Dilution: 25+ cards and slow cycling.
- Rootstock's setup turn.
- Losing the tall copy (Prune away, Transmute).
- Early Act 2 before the count is high.

### 3.5 Bridges (one card or relic connects two engines)
| Bridge | Connects | How |
|---|---|---|
| Decomposer | Compost → Harvest | Every Prune sows Rot; with Clear-Cut a single play sows 8. |
| Humus Rite | Compost → Ripe | Chaff fills the Scrapheap, so Humus Rite can make a copy Ripe in one play. |
| Seed Bite (Ripe: Prune) | Ripe → Compost | The capped copy stops being a Prune *sink* and becomes a Prune *source*. |
| Thresher | Compost ↔ Ripe/Canopy | A Bloom Power: grow it, then let Prunes fire it. Rootstock raises the snapshot. |
| Propagate | Ripe → Canopy | Copies a grown card with half its Bloom: the tall deck seeds the wide one. |
| Blightcap / Puffball / Pollen Sac | Canopy/Ripe → Harvest | Bloom grows the Rot you sow. |
| Grafting Knife + Chaff | Compost → Ripe | Each Chaff Pruned gives +2 Bloom. |

---

## 4. Timmy / Johnny / Spike coverage

● primary appeal, ○ secondary.

| Card / relic | Engine | Timmy | Johnny | Spike | The moment |
|---|---|:-:|:-:|:-:|---|
| Seed Bite (Ripe: Prune) | Ripe | ○ | ○ | ● | The starter shows the run goal on floor 1. |
| Heartwood Spear | Ripe | ● | | ○ | 60 damage for 1 energy once Ripe. |
| Twin Thorn | Ripe/Canopy | ● | ○ | | 3 hits of 25. |
| Perennial | Ripe | ● | ● | | The same card three times a turn. |
| Second Flush | Ripe | ○ | | ● | A consistent replay of your best card. |
| Thornstorm (X) | Canopy | ● | ○ | | X-cost AoE that grows with Bloom. |
| Rootstock | Canopy | ● | ● | | "Every card is 10." |
| Verdant Tide / Canopy Crush | Canopy | ● | | ○ | Numbers that climb as the deck grows. |
| Propagate | Canopy/Ripe | | ● | ○ | Clones a grown card. |
| Clear-Cut | Compost | ○ | ● | | Turns one Prune card into four Prunes. |
| Dusk Pruning + Clear-Cut | Compost | | ● | | Scrap the leftover hand at end of turn. |
| Thresher | Compost | ● | ○ | | Pack wipe from Prunes. |
| Reaping Vine | Compost | ● | ○ | | Hits equal to Prunes this combat. |
| Molt / Shear / Chaff | Compost | | ○ | ● | Fodder that keeps your real cards. |
| Shed Husk | Compost | | ○ | ● | Chaff is a Status, so it cantrips. |
| Mulch Maul | Compost | | | ● | An efficient common payoff. |
| Grim Harvest | Harvest | ● | ○ | ○ | Keep it, cash 45+ at the cap. |
| Deep Rot | Harvest | ● | ● | | Rot past 15. |
| Death Cap → Harvest loop | Harvest | ○ | ● | | Re-sow to the cap, reap again. |
| Burst Pod / Reap | Harvest | ○ | | ● | A clean cash-out with a timing skill test. |
| Sporeburst | Harvest | | ○ | ● | Pack cash-out that keeps the clocks running. |
| Mire Carapace | Harvest | | | ● | Defence that scales with the clock. |
| Humus Rite | Compost→Ripe | ● | ● | | Ripe in one play. |
| Crystal Graft | Ripe | | ○ | ● | Shards become growth. |
| Deep Graft / Sap Drip / Pollen Sting | Ripe | | | ● | Choosing which copy to grow. |
| Uproot | Compost | | | ● | Permanent removal. |
| Hivestrike / Root Mesh / Living Hedge / Hyphal Web | Canopy | | | ● | Consistent deck-count value. |

**Per engine:**

| Engine | Timmy | Johnny | Spike |
|---|---|---|---|
| Compost | Thresher, Reaping Vine | Clear-Cut, Dusk + Clear-Cut, Grafting Knife + Chaff | Molt, Shear, Shed Husk, Mulch Maul |
| Harvest | Grim Harvest, Deep Rot | Death Cap → Harvest loop, Plague Bloom spread kills | Burst Pod, Reap, Mire Carapace |
| Ripe | Heartwood Spear, Perennial | Perennial + Second Flush, Humus Rite | Seed Bite, Deep Graft, Second Flush |
| Canopy | Thornstorm, Rootstock, Twin Thorn | Rootstock + Propagate + Barb Flick draw | Hivestrike, Living Hedge, Hyphal Web |

---

## 5. The full v2 card list (57 = 4 starters + 20 common + 20 uncommon + 13 rare, plus the Chaff token)

Status: **K** kept (v1 numbers and machine block unchanged), **R** reworked, **N** new. Cuts are listed in §5.5. Text is "base → upgraded". ✿ marks a Bloom card. Engines: **Co**mpost, **Ha**rvest, **Ri**pe, **Ca**nopy.

### 5.1 Starters (4)
| St | id | Name | Type | Cost | Text (base → upgraded) | Engine / role |
|---|---|---|---|---|---|---|
| K | `lash` | Lash | attack | 1 | Deal 6 damage. → 9 | Prune fodder |
| K | `husk` | Husk | skill | 1 | Gain 6 Block. → 9 | Prune fodder |
| **R** | `seed_bite` ✿ | Seed Bite | attack | 1 | Bloom. Deal 4 (+2 per Bloom) damage. **Ripe: Prune.** → (+3 per Bloom) | Ri P, Co E |
| K | `graft_hide` | Graft Hide | skill | 1 | Gain 5 Block. Prune. → 7 Block | Co E |

### 5.2 Commons (20)
| St | id | Name | Type | Cost | Text (base → upgraded) | Engine / role |
|---|---|---|---|---|---|---|
| K | `thornwhirl` ✿ | Thornwhirl | attack | 2 | Bloom. Deal 9 (+2 per Bloom) damage to ALL enemies. → (+3) | Ca E, Ri |
| **R** | `barb_flick` ✿ | Barb Flick | attack | 0 | Bloom. Deal 3 (+1 per Bloom) damage. **Ripe: draw 1 card.** → (+2) | Ca E, Ri P |
| K | `grafting_cut` ✿ | Grafting Cut | attack | 1 | Bloom. Deal 2 (+1 per Bloom) damage. Prune. → (+2) | Co E, Ca E |
| K | `hivestrike` | Hivestrike | attack | 1 | Deal 4 damage, +1 per Bloom card in your deck. → 7 | Ca P |
| **R** | `shear` | Shear | attack | 1 | Deal 4 damage. Add a Chaff to your hand. Prune. → 7 | Co E (guaranteed Prune) |
| K | `spore_lash` | Spore Lash | attack | 1 | Deal 4 damage. Apply 1 Rot. → 2 Rot | Ha E (opener) |
| K | `canker_bite` | Canker Bite | attack | 1 | Deal 5 damage, +1 per Rot on the enemy. → 8 | Ha P · *watch* |
| K | `mulch_maul` | Mulch Maul | attack | 1 | Deal 5 damage, +1 per card in your Scrapheap. → 8 | Co P (Chaff fills the Scrapheap) |
| K | `sap_shell` ✿ | Sap Shell | skill | 1 | Bloom. Gain 6 (+1 per Bloom) Block. → (+2) | Ca E |
| K | `blightcap` ✿ | Blightcap | skill | 2 | Bloom. Apply 2 (+1 per Bloom) Rot. → (+2) | Ha E, Ca E |
| K | `tendril_reach` ✿ | Tendril Reach | skill | 1 | Bloom. Gain 4 (+1 per Bloom) Block. Draw 1 card. → (+2) | Ca E |
| K | `root_mesh` | Root Mesh | skill | 1 | Gain 4 Block, +1 per Bloom card in your deck. → 7 | Ca P |
| K | `deep_graft` | Deep Graft | skill | 1 | Gain 3 Block. Prune 2. → 6 Block | Ri E, Co E |
| K | `spore_haze` | Spore Haze | skill | 1 | Apply 2 Rot to ALL enemies. Scrap. → 3 Rot | Ha E |
| **R** | `mire_carapace` | Mire Carapace | skill | 1 | Gain 4 Block, +1 per 2 Rot on the enemy. → 7 | Ha P (defence) |
| K | `shed_husk` | Shed Husk | skill | 1 | Gain 5 Block. Prune. If you Scrapped a Status or Curse, draw 2 cards. → 8 Block | Co E (+ Chaff = cantrip) |
| K | `sap_drip` | Sap Drip | skill | 0 | Choose a Bloom card in your hand; it gains 1 Bloom. Draw 1 card. Scrap. → 2 Bloom | Ri E |
| K | `leaf_litter` | Leaf Litter | skill | 1 | Prune. Apply 1 Rot to ALL enemies. → 2 Rot | Co E, Ha E |
| **N** | `molt` | Molt | skill | 1 | Gain 3 Block. Add 2 Chaff to your hand. → 5 Block | Co E (fodder) |
| **N** | `burst_pod` | Burst Pod | skill | 1 | Harvest 2. Scrap. → cost 0 | Ha P (introduces Harvest at common) |

### 5.3 Uncommons (20)
| St | id | Name | Type | Cost | Text (base → upgraded) | Engine / role |
|---|---|---|---|---|---|---|
| **R** | `twin_thorn` ✿ | Twin Thorn | attack | 2 | Bloom. Deal 5 (+2 per Bloom) damage twice. **Ripe: deal it once more.** → (+3) | Ri P, Ca P |
| K | `canopy_crush` | Canopy Crush | attack | 2 | Deal 4 damage, +1 per Bloom in your deck. → 9 | Ca P |
| K | `miasma_sweep` ✿ | Miasma Sweep | attack | 2 | Bloom. Deal 5 (+1 per Bloom) damage to ALL enemies. Apply 2 Rot to ALL enemies. → (+2) | Ha E |
| K | `uproot` | Uproot | attack | 2 | Deal 12 damage. Prune away. Scrap. → 16 | Co E (thinning) |
| K | `pollen_sting` ✿ | Pollen Sting | attack | 1 | Bloom. Deal 3 (+1 per Bloom) damage. Choose a Bloom card in your hand; it gains 1 Bloom. → (+2) | Ri E |
| K | `patient_thorn` ✿ | Patient Thorn | attack | 1 | Bloom. Keep. Deal 4 (+2 per Bloom) damage. → (+3) | Ri E (growth target) |
| **N** | `reap` | Reap | attack | 2 | Deal 8 damage. Harvest 2. → 11 damage | Ha P |
| K | `burl_wall` ✿ | Burl Wall | skill | 2 | Bloom. Gain 10 (+3 per Bloom) Block. → (+4) | Ca E (defence) |
| K | `choking_spores` | Choking Spores | skill | 1 | Apply 2 Stagger and 1 Rot to ALL enemies. → 3 Stagger | Ha E (defence) |
| **R** | `propagate` | Propagate | skill | 1 | Choose a Bloom card in your hand. Add a copy with half its Bloom to your deck. Scrap. → the copy is upgraded | Ca E, Ri bridge |
| K | `seed_rain` | Seed Rain | skill | 1 | Gain 4 Block. Spread Prune. → 7 Block | Ca E, Co E |
| K | `puffball` ✿ | Puffball | skill | 1 | Bloom. Apply 1 (+1 per Bloom) Rot to ALL enemies. Scrap. → (+2) | Ha E |
| **R** | `sporeburst` | Sporeburst | skill | 1 | Harvest 1 on ALL enemies. Then apply 2 Rot to ALL enemies. → 3 Rot | Ha P (pack) |
| **N** | `second_flush` | Second Flush | skill | 1 | Put the Bloom card with the most Bloom in your discard pile into your hand. If it is Ripe, it costs 0 this turn. → cost 0 | Ri P (replay) |
| K | `decomposer` | Decomposer | power | 1 | Whenever you Prune, apply 2 Rot to a random enemy. → cost 0 | Co P → Ha bridge |
| K | `dusk_pruning` | Dusk Pruning | power | 1 | At the end of your turn, Prune. → cost 0 | Co E |
| K | `living_hedge` | Living Hedge | power | 1 | At the start of your turn, gain 1 Block per Bloom card in your deck. → cost 0 | Ca P |
| K | `thorn_halo` ✿ | Thorn Halo | power | 2 | Bloom. At the start of your turn, deal 4 (+1 per Bloom) damage to a random enemy. → (+2) | Ri/Ca P |
| K | `ripening_rot` | Ripening Rot | power | 1 | At the start of your turn, each enemy with Rot gains 1 Rot. → cost 0 | Ha E (ripen) |
| **R** | `thresher` ✿ | Thresher | power | 2 | Bloom. Whenever you Prune, deal 4 (+1 per Bloom) damage to ALL enemies. → (+2) | Co P. **Moved rare → uncommon**, base 5 → 4 |

### 5.4 Rares (13)
| St | id | Name | Type | Cost | Text (base → upgraded) | Engine / role |
|---|---|---|---|---|---|---|
| **R** | `heartwood_spear` ✿ | Heartwood Spear | attack | 2 | Bloom. Deal 10 (+5 per Bloom) damage. **Ripe: costs 1 less.** → (+6) | Ri P (Timmy) |
| K | `death_cap` | Death Cap | attack | 2 | Deal 8 damage. If the enemy has Rot, apply 15 Rot. Scrap. → 12 | Ha E (re-sow to the cap) |
| K | `reaping_vine` | Reaping Vine | attack | 2 | Prune. Deal 4 damage for each time you Pruned this combat. → 5 | Co P |
| K | `verdant_tide` | Verdant Tide | attack | 2 | Deal 4 damage once for each Bloom card in your deck. → 5 | Ca P |
| **N** | `thornstorm` ✿ | Thornstorm | attack | X | Bloom. Deal 5 (+1 per Bloom) damage to ALL enemies X times. → (+2) | Ca P (Timmy X-cost) |
| K | `humus_rite` | Humus Rite | skill | 1 | Choose a Bloom card in your hand; it gains Bloom equal to the cards in your Scrapheap. Scrap. → cost 0 | Co → Ri bridge |
| K | `crystal_graft` | Crystal Graft | skill | 0 | Keep. Lose 1 Shard: choose a Bloom card in your hand; it gains 3 Bloom. Scrap. → 4 Bloom | Ri E (Shards) |
| **N** | `grim_harvest` | Grim Harvest | skill | 2 | Keep. Harvest 3. → Harvest 4 | Ha P (Timmy) |
| K | `hyphal_web` | Hyphal Web | power | 1 | At the start of your turn, draw 1 card (2 with 6+ Bloom cards in your deck). → Opening | Ca P (Spike) |
| **N** | `clear_cut` | Clear-Cut | power | 2 | Your Prunes may Scrap any number of cards. Each card after the first is another Prune. → cost 1 | Co M |
| **N** | `deep_rot` | Deep Rot | power | 1 | Rot on enemies has no cap. → cost 0 | Ha M |
| **N** | `rootstock` | Rootstock | power | 2 | Your Bloom cards use the highest Bloom in your deck. → cost 1 | Ca M |
| **N** | `perennial` | Perennial | power | 2 | After you play a Ripe card, return it to your hand (once per card each turn). → cost 1 | Ri M |

### 5.5 Token (not in the reward pool)
| St | id | Name | Type | Cost | Text |
|---|---|---|---|---|---|
| **N** | `chaff` | Chaff | status (`cls: 'graft'`, `rarity: 'special'`) | 0 | Gain 2 Block. Scrap. (no upgrade) |

### 5.6 Cut (9)
| id | Why |
|---|---|
| `chitin_ram` | At-rate filler (damage + Block) with no partner; 12% pick. Canopy has enough cheap Bloom cards. |
| `windblown_seed` | Spill makes "Wild Prune never wastes" redundant; 6.8% pick. |
| `prism_thorn` | A Shards stat-stick with no engine; 11.5% pick. Crystal Graft keeps the class's Shard sink. |
| `excise` | A second Prune away card, alongside Uproot and Hollow Bough; 19% pick. The pool needs the slot for the replay card. |
| `thicket_crash` | Deck-size AoE overlaps Verdant Tide, Canopy Crush and Thornstorm. Canopy reads Bloom cards, not deck size. |
| `transplant` | 0.7% pick, fiddly (10 custom continuation slots), and its job (concentrate Bloom) is done by Humus Rite, Deep Graft and Sap Drip. |
| `chitin_cocoon` | Without Keep (RULINGS 40) it is a rare-slot Sap Shell. Any Ripe or Keep version recreates the ruling-40 boss stall. |
| `quickening_sap` | Its "free card on Bloom gain" is a weaker Perennial with a complicated bound. Only one cost-cheating rule-breaker per engine. |
| `fungal_aegis` | "Block = Rot", next to Deep Rot (uncapped), is a guaranteed stall. Mire Carapace covers Rot defence at common, and Reaper's Sickle (ask) at relic. |

**Counts.**
- Attacks 22 · Skills 24 · Powers 11 (all uncommon or rare).
- Bloom cards: 17 (including Thornstorm).
- Prune sources: 11 (including Seed Bite's Ripe clause). Harvest cards: 4. Ripe clauses: 4. Chaff makers: 2.
- Keep: 3 (Patient Thorn, Crystal Graft, Grim Harvest). X-cost: 1. Opening: 1 (Hyphal Web+).
- **GDD §3 commons rule:** no common gains energy, returns a card to hand or reduces a cost. Second Flush (uncommon) and Perennial (rare) are the only "to hand" cards. Heartwood Spear's Ripe reduction is a rare.

---

## 6. Machine blocks — new and reworked cards only

The YAML convention is v1's (`docs/cards/graft.md` §0.2). `{harvest}` and `ripe` are new (§7). Pricing uses GDD §8.5 plus v1's calls. Harvest is priced at the expected Rot at play: common 6, uncommon 8, rare 12. The "halving" debt is worth −(Rot/2) per remaining tick, and is ignored when the fight is in its last 2 turns. That makes Harvest a finisher on purpose.

```card
id: seed_bite        # R (starter)
type: attack, cost: 1, target: enemy, keywords: [bloom]
text: "Bloom. Deal {damage} ({damage_per} per Bloom) damage. Ripe: Prune."
effects:
  - damage: { amount: { base: 4, per: 2, scale: { cardVar: bloom } }, target: target }
  - ripe: { effects: [ { prune: { bloom: 1, variant: standard } } ] }
upgrade:
  effects:
    - damage: { amount: { base: 4, per: 3, scale: { cardVar: bloom } }, target: target }
    - ripe: { effects: [ { prune: { bloom: 1, variant: standard } } ] }
tags: [bloom, engine:ripe, role:payoff, engine:compost, role:enabler]
note: "Unchanged below Ripe. At Ripe the starter shows the run goal from floor 1 and turns the capped copy into a Prune source (the waste fix). This edits a GDD §4.1 'final' starter: lead sign-off needed."
```

```card
id: barb_flick       # R
type: attack, cost: 0, keywords: [bloom]
text: "Bloom. Deal {damage} ({damage_per} per Bloom) damage. Ripe: draw {ripe_draw} card."
effects:
  - damage: { amount: { base: 3, per: 1, scale: { cardVar: bloom } }, target: target }
  - ripe: { effects: [ { draw: { n: 1, key: ripe_draw } } ] }
upgrade: same with per 2
tags: [bloom, engine:canopy, role:enabler, engine:ripe, role:payoff]
note: "Ripe alone is rare on a 0-cost card. Under Rootstock every Barb Flick is a 13-damage 0-cost cantrip: the Canopy draw engine."
```

```card
id: shear            # R
type: attack, cost: 1, target: enemy
text: "Deal {damage} damage. Add a Chaff to your hand. Prune."
effects:
  - damage: { amount: 4, target: target }
  - add_card: { card: chaff, to: hand, n: 1 }
  - prune: { bloom: 1, variant: standard }
upgrade: damage 7
tags: [prune, engine:compost, role:enabler]
note: "4 d + a Prune that never lacks fodder (3 d) + Chaff's option value about 0.5 = 7.5. Spike's Prune: you never have to Scrap a real card."
```

```card
id: mire_carapace    # R
type: skill, cost: 1, target: enemy
text: "Gain {block} Block, {block_per} per 2 Rot on the enemy."
effects:
  - block: { amount: { base: 4, per: 0.5, scale: { status: rot, of: target } } }
upgrade: base 7
tags: [block, engine:harvest, role:payoff]
note: "Rot 6 → 7 b (common rate 6, +1 in-archetype). At the cap: 11 / 14. Text: the template must render 'per 2 Rot' from per 0.5. Conveyance: add a {block_every} placeholder (= 1/per)."
```

```card
id: molt             # N
type: skill, cost: 1, target: self
text: "Gain {block} Block. Add {add_card} Chaff to your hand."
effects:
  - block: { amount: 3 }
  - add_card: { card: chaff, to: hand, n: 2 }
upgrade: block 5
tags: [block, engine:compost, role:enabler]
note: "2.6 b + 2 Chaff (4 b if played, or 2 free Prune fodder). It uses 2 of the 4 cap_to_hand slots. About 6.5 b against rate 6."
```

```card
id: chaff            # N token
cls: graft, type: status, rarity: special, cost: 0, target: none, keywords: [exhaust]
text: "Gain {block} Block. Scrap."
effects: [ { block: { amount: 2 } } ]
upgrade: {}
tags: [token, engine:compost]
note: "Type status on purpose: Shed Husk, Grafting Knife and Scrap Magnet read it."
```

```card
id: burst_pod        # N
type: skill, cost: 1, target: enemy, keywords: [exhaust]
text: "Harvest {harvest}. Scrap."
effects: [ { harvest: { mult: 2, target: target } } ]
upgrade: cost 0
tags: [rot, engine:harvest, role:payoff]
note: "Budget 7 × 1.35 = 9.5. At Rot 6: 12 HP loss, and the halving costs about 3 per remaining tick. A finisher; at the cap it's 30. The common that teaches the keyword."
```

```card
id: twin_thorn       # R
text: "Bloom. Deal {damage} ({damage_per} per Bloom) damage twice. Ripe: deal it once more."
effects:
  - damage: { amount: { base: 5, per: 2, scale: { cardVar: bloom } }, times: 2, target: target }
  - ripe: { effects: [ { damage: { amount: { base: 5, per: 2, scale: { cardVar: bloom } }, target: target, key: ripe_damage } } ] }
upgrade: per 3 in both
tags: [bloom, multihit, engine:ripe, engine:canopy, role:payoff]
note: "Below Ripe it's unchanged. Ripe: 25 × 3 = 75 (105 upgraded) for 2. That's the Timmy ceiling: watch it under Rootstock. Lever: the Ripe hit at base only (5)."
```

```card
id: reap             # N
type: attack, cost: 2, target: enemy
text: "Deal {damage} damage. Harvest {harvest}."
effects: [ { damage: { amount: 8, target: target } }, { harvest: { mult: 2, target: target } } ]
upgrade: damage 11
tags: [rot, engine:harvest, role:payoff]
note: "Uncommon rate 17. 8 + Harvest 2 at Rot 8 = 24, minus the halving debt ≈ 17. The hit lands first, so Exposed and Block apply to it; the Harvest is HP loss."
```

```card
id: propagate        # R
text: "Choose a Bloom card in your hand. Add a copy with half its Bloom to your deck. Scrap."
effects: [ { custom: { fn: propagate_bloom } } ]   # existing custom + new add_card field `bloom: floor(src/2)` (§7 H9)
upgrade: text "… Add an upgraded copy with half its Bloom …"
tags: [bloom, engine:canopy, role:enabler, engine:ripe]
note: "v1 was 0.3% pick: a 0-Bloom copy was a dead draw. Half Bloom from a Ripe card = a ✿5 copy, which Rootstock lifts to 10. It is a run-level card; the deck's dilution is its cost."
```

```card
id: sporeburst       # R
type: skill, cost: 1, target: all_enemies
text: "Harvest {harvest} on ALL enemies. Then apply {rot} Rot to ALL enemies."
effects:
  - harvest: { mult: 1, target: all_enemies }
  - status: { target: all_enemies, id: rot, amount: 2, key: rot }
upgrade: rot 3
tags: [rot, aoe, engine:harvest, role:payoff]
note: "Per target at Rot 6: 6 HP, the clock goes 6 → 3 + 2 = 5. AoE face 0.8 × 8.5 = 6.8 ✓. Kills spread the full stack (Rot Censer/Plague Bloom combo)."
```

```card
id: second_flush     # N
type: skill, cost: 1, target: none
text: "Put the Bloom card with the most Bloom in your discard pile into your hand. If it is Ripe, it costs 0 this turn."
effects: [ { custom: { fn: second_flush } } ]   # fetch_card {from: discard, select: max_bloom, to: hand}, then if fetched card is Ripe → costThisTurn 0 (cap_cost_reduction applies)
upgrade: cost 0
tags: [bloom, engine:ripe, role:payoff, fetch]
note: "A tutor (about 4 d) plus 1 energy (8.5 d) when Ripe. Nearest STS: Hologram. Ours auto-picks by Bloom, so the choice moves to the reward screen. Empty discard: nothing (greyed text)."
```

```card
id: thresher         # R (rarity + numbers)
rarity: uncommon
effects: [ { status: { target: self, id: thresher, amount: { base: 4, per: 1, scale: { cardVar: bloom } } } } ]
upgrade: per 2
note: "Moved to uncommon so the Compost payoff shows up by Act 2 (rares are scarce). Base 5 → 4 because Chaff and Clear-Cut raise Prunes per turn from about 1.2 to 3+."
```

```card
id: heartwood_spear  # R
text: "Bloom. Deal {damage} ({damage_per} per Bloom) damage. Ripe: costs {ripe_cost} less."
values: { ripe_cost: 1 }
hooks: { costModifier: "isRipe(card) ? cost - values.ripe_cost : cost" }
upgrade: per 6
tags: [bloom, engine:ripe, role:payoff]
note: "Ripe = 60 (70) for 1 energy. With Perennial the second play pays the full 2 (cap_cost_reduction: below printed cost once per instance per turn)."
```

```card
id: thornstorm       # N
type: attack, cost: X, target: all_enemies, keywords: [bloom]
text: "Bloom. Deal {damage} ({damage_per} per Bloom) damage to ALL enemies X times."
effects: [ { damage: { amount: { base: 5, per: 1, scale: { cardVar: bloom } }, times: X, target: all_enemies } } ]
upgrade: per 2
tags: [bloom, aoe, multihit, xcost, engine:canopy, role:payoff]
note: "Rare AoE face 0.8 × 10 = 8 per energy per target. Bloom 2: 7 per X ✓. Ripe upgraded: 25 per X to every enemy. Fracture Engine and Glass Spurs love it."
```

```card
id: grim_harvest     # N
type: skill, cost: 2, target: enemy, keywords: [retain]
text: "Keep. Harvest {harvest}."
effects: [ { harvest: { mult: 3, target: target } } ]
upgrade: mult 4
tags: [rot, engine:harvest, role:payoff]
note: "Rare rate 20 for 2. Rot 12: 36. At the cap: 45 (60). Deep Rot at 24: 72 (96). Keep (budget 3 of 3) lets you wait for the cap: the Spike timing test inside a Timmy card."
```

```card
id: clear_cut        # N power
type: power, cost: 2
text: "Your Prunes may Scrap any number of cards. Each card after the first is another Prune."
effects: [ { status: { target: self, id: clear_cut, amount: 1 } } ]
status_def: { id: clear_cut, stacks: flag, decay: never, tick: never, isDebuff: false,
              hooks: { pruneScrapMax: "→ 10 (hand limit)" } }   # §7 H5
upgrade: cost 1
tags: [prune, power, engine:compost, role:multiplier]
```

```card
id: deep_rot         # N power
type: power, cost: 1
text: "Rot on enemies has no cap."
status_def: { id: deep_rot, stacks: flag, hooks: { modifyStatusCap: "id rot & target enemy → max(cap, TUNING.caps.rotUncapped = 999)" } }
upgrade: cost 0
tags: [rot, power, engine:harvest, role:multiplier]
note: "It does nothing until the cap. A late-fight rule-breaker; Harvest's halving keeps the curve finite."
```

```card
id: rootstock        # N power
type: power, cost: 2
text: "Your Bloom cards use the highest Bloom in your deck."
status_def: { id: rootstock, stacks: flag, hooks: { effectiveBloom: "→ max(bloom, bloom_max_in_deck)" } }   # §7 H6
upgrade: cost 1
tags: [bloom, power, engine:canopy, role:multiplier]
note: "It reads the live maximum, so growth during combat raises everything. Deck counts (Canopy Crush's total) still read the real Bloom: one multiplier, not two."
```

```card
id: perennial        # N power
type: power, cost: 2
text: "After you play a Ripe card, return it to your hand (once per card each turn)."
status_def: { id: perennial, stacks: flag, triggers: { afterCardPlayed: [ { custom: { fn: perennial_return } } ] } }   # §7 H7
upgrade: cost 1
tags: [bloom, power, engine:ripe, role:multiplier]
note: "You pay the cost again: the replay buys a card, not energy. It is bounded by energy, cap_to_hand and once per card per turn. Scrapped or Powers: no return."
```

---

## 7. Engine hooks and new effect ops (Phase B; narrow, each with a unit test)

Shared files touched: `src/engine/types.ts`, `bloom.ts`, `effects.ts`, `tuning.ts`, `cards.ts`. `text.ts` placeholders go through conveyance. I will name every file in my Phase B report.

| # | What | Exact spec |
|---|---|---|
| H1 | **Spill** | In `addBloom`: `overflow = raw − cap`. If `overflow > 0` and this is not a spill: `spillBloom(env, overflow, exclude = card.uid)`. `spillBloom` picks `min` over `deckBloomCards().filter(isBloomEligible && uid ≠ exclude)` (ties random `misc`) and calls `addBloom(env, target, min(overflow, room), {spill: true})`. The remainder → `capHit('cap_stacks')`. **Also** call `spillBloom(env, amount, null)` wherever a Bloom gain currently finds an empty pool: `execBloom` choose_hand/all_hand/random/min/max/choose_deck, Prune's standard path when hand *and* piles are empty, wild, and spread with no eligible card. Event `bloom` gains `spill?: true`. Lever `TUNING.bloomSpill = true` (sim A/B). Negative Bloom never spills. |
| H2 | **Ripe** | `TUNING.bloomRipe = 10`. `isRipe(state, card) = isBloomCard(card) && effectiveBloom(state, card) >= TUNING.bloomRipe` (H6).<br>Effect `{ type: 'ripe'; effects: Effect[] }`: runs `effects` iff the **source card** is Ripe at resolution (like `on_beat`). Condition `{ type: 'ripe' }` (source card). `CardFilter.ripe?: boolean`.<br>Hook `onRipe: { card }`: fired from `addBloom` when the *real* Bloom crosses from < ripe to ≥ ripe (once per crossing).<br>Text walk recurses into `ripe` like `on_beat`; renderer greys the "Ripe:" clause when not Ripe. |
| H3 | **Harvest** | Effect `{ type: 'harvest'; mult: Amount; target: TargetSpec; key?: string }`. For each living target: `r = stacks(rot)`; if `r === 0`, skip silently (the text preview shows 0). `lose_hp(r × mult)`, source = player, event kind `hp_loss` with tag `harvest`. If the target is still alive, change Rot by `−(r − floor(r/2))` through the normal status path (`onStatusChanged`). Dispatch `onHarvest: { uid, rot: r, hpLost }` (new HookInfoMap entry).<br>Text `{harvest}` = mult. The preview shows "(= N)" against the hovered target.<br>A kill spreads the full Rot: the death check inside `lose_hp` runs the Rot `onDeath` first. |
| H4 | **Deep Rot cap** | No engine change: `modifyStatusCap` already folds. Add `TUNING.caps.rotUncapped = 999` (JSON-safe "no cap"). Deep Rot returns `Math.max(cap, 999)`; Mycelial Net is already `Math.max`. With Deep Rot the +1-per-tick at the cap stops hitting `cap_stacks`. |
| H5 | **Clear-Cut** | New modifier hook `pruneScrapMax?(ctx, max: number): number` (player rule, max over listeners, default 1). `execPrune` opens the choice with `max = pruneScrapMax`.<br>`resolvePruneScrap(uids)` loops in pick order. Per uid: exhaust; `prunes += 1`; Prune away applies to the first uid only (`cap_prune_away` unchanged); `dispatch onPrune {scrapped}`; per-card amount = `spec.bloom + bonusIf(type)` → `modifyPruneBloom`. Sum the amounts, then deliver **once** per the variant: standard = one choice, amount = sum; spread = each eligible hand card gains the sum; wild = one random card gains the sum; overflow spills (H1).<br>`combat.lastPrune` becomes `{…last, types: CardType[]}`, and `pruned_type` is true if **any** Scrapped card matches, so Shed Husk draws 2 once. Bloom Powers' `onBloomGained` fires once (one gain). |
| H6 | **Rootstock** | New modifier hook `effectiveBloom?(ctx, card, bloom: number): number` (player rule, max over listeners, default `bloom`).<br>**Used by:** the `cardVar: 'bloom'` amount scale (`effects.ts:146`), `isRipe`, Bloom-Power snapshots, card-frame display.<br>**Not used by:** `addBloom`, caps, `isBloomEligible`, Spill targeting, `bloom_*_in_deck` scales, `fetch_card max_bloom`, Heartseed. The rule is real Bloom for growth and counting, effective Bloom for numbers.<br>Frame shows `✿10↑` (rooted). |
| H7 | **Perennial** | Content `custom` on `afterCardPlayed`: if `isRipe(card)`, the card is now in discard (not Scrapped, not a Power), and `combat.counters['perennial:'+uid]` is unset → move discard → hand, then set the counter. Counters reset at turn start (existing per-turn reset). It counts `cap_to_hand`, and a cut emits `cap_hit`.<br>Needs `EffectCtx.moveCard(uid, from, to)` if no such helper exists. I'll reuse `fetch_card` internals and add a `uid` select only if needed (smallest change). |
| H8 | **Ripe cost** | Heartwood Spear uses the existing `CardDef.hooks.costModifier`. No engine change. |
| H9 | **Propagate half Bloom** | `add_card` gains `bloom?: Amount` (valid only with `to: 'deck'`; clamped to `[0, cap]`). It sets `vars.bloom` on the new deck copy and emits `bloom`. No `onBloomGained` (it isn't growth). |
| H10 | **Chaff** | A CardDef in `graft.ts` (`cls 'graft'`, `type 'status'`, `rarity 'special'`). Validate that reward, shop and Transmute pools exclude `special` (I'll add a test). |
| H11 | **Telemetry for the sim** (asks to the sim owner, not engine work) | Count per combat: `bloom` events with `spill` (Spill volume), `onRipe` (floor of first Ripe per run), Harvest HP total and Rot at Harvest, Prunes per play (Clear-Cut size), Chaff created vs Pruned vs played, Perennial returns, and Rootstock effective-vs-real Bloom delta. |

**As implemented (Phase B, 2026-10-30).** Differences from the table above:
- H1: `TUNING.bloomSpill` is numeric (1 on, 0 off), so `sim/batch.ts --set bloomSpill=0` can A/B it. Spill ties use `rng.misc`, the existing combat-random stream, because RULINGS 51's `rng.combat` doesn't exist. Lead: please correct the ruling's wording.
- H2: Ripe is a **Condition** `{type: 'ripe'}` used inside `conditional`, not a new wrapper effect, so the text, validator and sim walkers needed no new effect case. `CardFilter.ripe` was dropped (nothing needed it). Content asks Ripe through `HookCtx.isRipe(card)` and `CardReadCtx.isRipe()`. The engine's `isRipe(state, card)` is in `cards.ts`.
- H4: Deep Rot returns `Number.POSITIVE_INFINITY` from `modifyStatusCap` (`statusCap` already supports Infinity, and it is never stored in state), so there is no `rotUncapped` lever.
- H6: `effectiveBloom(ctx, card, bloom, deckMax)`: the engine passes the deck maximum, so content needs no deck-walking helper.
- H7/Second Flush: `fetch_card` gained `uid?: number` (only that instance is a candidate). Perennial is a status event hook on `afterCardPlayed` with a per-turn counter key `perennial:<turn>:<uid>`.
- H10: Chaff is `cls 'status'` (RULINGS 54), defined in `graft.ts`, so it is in no class pool.
- The 9 cuts are **held** (RULINGS 55) until `report-v2-baseline.md`. The pool is temporarily 66 + Chaff.

---

## 8. New keywords for the glossary (`src/content/keywords.ts`, owned by conveyance; I add these entries in Phase B)

| id | Name | Short (tooltip line) | Long |
|---|---|---|---|
| `harvest` | Harvest N | The enemy loses N × its Rot in HP, then its Rot is halved. | HP loss ignores Block and Guard. If it kills, the full Rot spreads as usual. Best at high Rot; Harvesting early resets your clock. |
| `ripe` | Ripe | A Bloom card with 10+ Bloom. Its "Ripe:" text is active. | Ripe is reached by growing that copy; it stays Ripe for the rest of the run. Elder Seed lets it keep growing past 10. |
| `chaff` | Chaff | A 0-cost Status: gain 2 Block, Scrap. | Made by Graft cards to be Pruned. It counts as a Status for Shed Husk and relics. Gone after combat. |
| `spill` | Spill (rule; shown in the Bloom tooltip) | Bloom a card can't hold goes to your least-grown Bloom card. | Covers Bloom over the cap and Prunes with no target in hand. One spill only. |

Updated text for existing entries:
- **Bloom**: add "Bloom over the cap spills (see Spill)."
- **Prune**: add "(Clear-Cut: Scrap any number; each is a Prune.)"
- **Rot**: "can't grow past 15 (Deep Rot: no cap)" is shown only while the cap is live.

---

## 9. Relic asks for design-shared

### 9.1 Graft class relics (new)
| Ask | Rarity | Text | Serves | Notes |
|---|---|---|---|---|
| **Husk Sac** | uncommon | The first time you Prune each turn, add a Chaff to your hand. | Compost | A Dead Branch lesson, different shape: one fixed fodder token per turn, not a random card per Exhaust. |
| **Trellis** | rare | At the start of your turn, put a Ripe card from your discard pile into your hand. | Ripe | Counts `cap_to_hand`. With Perennial: your best card every turn, twice. |
| **Reaper's Sickle** | uncommon | Whenever you Harvest, gain Block equal to half the HP lost. | Harvest | Replaces the cut Fungal Aegis's defensive role. Alternative if too strong: "your first Harvest each turn halves Rot to ¾ instead". |

### 9.2 Existing class relics: keep, and the new combos they create
- **Grafting Knife** + Chaff (Status): every Chaff Prune gives +2 Bloom. A real Ripe accelerant now; was 11.6 win-Δ in g1.
- **Wild Growth** (boss) + Clear-Cut: +1 Bloom per Prune, and the Tangles are fodder. One turn can make a copy Ripe.
- **Elder Seed**: cap 15, Ripe stays at 10, so it adds numbers past Ripe and room for Spill.
- **Mycelial Net**: the cheap version of Deep Rot (cap 20). Keep.
- **Rot Censer / Plague Bloom**: Harvest kills spread the full stack, which makes Sporeburst a pack chain.
- **Pollen Sac**: one Rot per Bloom gain. Clear-Cut delivers one gain per play, so no burst (intended).
- **Heartseed**: no change. **Compost Heap**: no change; Chaff makes the first Prune free.

### 9.3 Cross-class combos with shared relics (already exist, called out so the sim can measure them)
| Shared relic | Graft partner | Combo |
|---|---|---|
| Scrap Magnet (Status to hand → 3 Guard) | Molt, Shear (Chaff) | Each Chaff is +3 Guard. Molt becomes 3 Block + 6 Guard + fodder. |
| Glass Spurs (3 hits → Exposed) | Twin Thorn (Ripe), Thornstorm X ≥ 3 | Ripe and X-cost turn into Exposed. |
| Fracture Engine (Exposed ×2) | Thornstorm, Twin Thorn | Multi-hit Bloom cards. |
| Ghost Lantern (enemy Guard 10) | Harvest, Rot | HP loss ignores Guard: a boss relic the Harvest deck takes for free energy. |
| Stasis Engine (+1 energy, −1 draw) | Perennial, Heartwood Spear | Fewer cards, more replays of the Ripe card. |
| Gravity Loom (+2 draw, hand 7) | Clear-Cut, Dusk Pruning | More fodder per turn. The hand limit bounds Chaff. |
| Concussion Rig | Choking Spores | Existing Stagger combo. |

### 9.4 New shared-pool asks (cross-class shapes Graft engines want)
| Ask | Rarity | Text | Why shared |
|---|---|---|---|
| **Ash Wick** | uncommon | The third time a card is Scrapped in a turn, gain 1 energy (once per turn). | Compost (Clear-Cut) and any Scrap-heavy Breaker or Chronist deck. `cap_bonus_energy` applies. |
| **Festering Lens** | rare | When an enemy's Rot ticks, it loses 1 more HP per Exposed it has. | Ties the shared Exposed to Rot. A Breaker or colourless Exposed source plus Graft Rot. |
| **Growth Sap** potion | (exists) | Permanent +Bloom to a card in hand. | Card + potion combo: a potion can push a copy to Ripe. The sim should log Ripe-by-potion. |

---

## 10. Sim hooks (for `docs/balance/report-v2-baseline.md` and the Phase B pass)

**Tags on every card** (already in the machine blocks; kept cards get them in Phase B):
- `engine:compost | harvest | ripe | canopy` (one or two);
- `role:enabler | payoff | multiplier | bridge`.

**"Engine assembled" definition for reports:** the run's deck holds that engine's multiplier (or, for Harvest, 2 Harvest cards) plus at least 2 other cards of the engine. Report per engine:
- how often it was assembled and the median floor of assembly;
- win rate assembled vs not;
- damage per turn on the turns after assembly.

The target is that an engine assembled by floor 25 wins clearly more often. If an engine never assembles, its pieces are too rare or too weak.

**Bot personalities this pool supports** (sim owner): Compost (prefers Prune and fodder), Harvest (prefers Rot and Harvest; times the Harvest at Rot ≥ 12 or at lethal), Ripe (feeds one copy, never Prunes it away), Canopy (takes every Bloom card).

**Prune targeting** (bot): never pick a capped copy. Spill makes it harmless, but the bot should still pick the copy closest to Ripe in a Ripe deck.

**Phase B triage rules for the baseline report:**
- A card in the bottom 5% of pick rate *and* with an engine-assembled win Δ ≤ 0 is reworked or cut.
- A card in the top 5% with a deck Δ > +15 gets one numeric step down.
- Engine ceilings to measure first: Rootstock + Twin Thorn, Clear-Cut + Thresher + Dusk Pruning, Perennial + Second Flush.

The levers, in order:
1. `TUNING.bloomRipe`;
2. Thresher base;
3. the Twin Thorn Ripe hit at base only;
4. Clear-Cut cost;
5. Harvest multipliers.

**On watch** (numbers are deliberately bold): Twin Thorn Ripe (75), Thresher at uncommon, Clear-Cut, Rootstock, Perennial; Canker Bite and Hivestrike (kept despite low picks, because the bot undervalues per-X scaling).

---

## 11. Open questions for the lead

1. **Seed Bite gets "Ripe: Prune"**, which edits a GDD §4.1 "final" starter. I recommend it (it shows the goal from floor 1). The fallback is to leave the starter alone and add Ripe only to rares and uncommons.
2. **Spill** overrides GDD §2.4 "Bloom beyond the cap is lost" and generalises RULINGS 43. It needs a ruling.
3. **Harvest kill → full spread** is the natural consequence of the death check, but it is a strong pack interaction with Rot Censer. Confirm.
4. **Chaff is a Status**, so Scrap Magnet and Shed Husk trigger on it. Confirm this cross-type combo is wanted. The alternative is a Graft-only type tag.
5. The pool is 57 (v1 56). Cut 9, new 10, reworked 9.

---

## 12. Phase C (data-driven pass, 2026-10-31)

Source: `docs/balance/report-v2-baseline.md` and `v2-baseline-cards.csv`. That run measured **v1** content with the spike planner, card counterfactuals (cf) of one extra copy in the starter deck over 100 paired seeds (±11 win), and johnny bots committed from floor 1. `**` marks an interval that excludes 0.

### 12.1 Cuts applied (the 9 held in §5.6)
| Card | Data | Decision |
|---|---|---|
| `transplant` | cf −1, 0.22 plays/draw, zero realised value; pick 1% spike | Cut (dead; its job is done by Humus Rite and Deep Graft). |
| `excise` | cf −2, 0.23 plays/draw | Cut (Uproot and Hollow Bough cover Prune away). |
| `prism_thorn` | cf 0.0 | Cut (filler; Crystal Graft keeps the Shard sink). |
| `chitin_ram` | cf −3 | Cut (at-rate filler). |
| `thicket_crash` | cf +6 (ns); Mass johnny 46.5% | Cut. This is the Canopy pullback: Mass is 18 points over spike, and Canopy now also has Thornstorm and Rootstock. |
| `windblown_seed` | cf +7 (ns) | Cut on design: Spill makes "Wild Prune never wastes" redundant. A positive but non-significant cf doesn't save a redundant card. |
| `chitin_cocoon` | cf +2 (ns) | Cut (ruling-40 stall risk; Turtle is the strongest bot). |
| `quickening_sap` | cf +3 (ns) | Cut (Perennial is the Ripe rule-breaker). |
| `fungal_aegis` | cf +11 (ns), Blight's best card | Cut. With Deep Rot it is an uncapped Block engine, which is exactly the turtle stall the Phase C headline wants gone. Mire Carapace keeps Rot-scaled defence at common. |

### 12.2 Retunes
| Card | Data | Change |
|---|---|---|
| `blightcap` | cf **−13 win**, **−4.7 floors** (the worst Graft card) | Cost 2 → **1**. It is the Harvest sow card. At 2 energy it took the turn that Harvest needs. |
| `spore_haze` | cf **−12**, **−3.1 floors**, 0.28 plays/draw | Cost 1 → **0**. A free pack opener for Harvest and Sporeburst. |
| `thorn_halo` | cf −7, **−3.1 floors**, 0.26 plays/draw (v1, without Spill) | Tried cost 2 → 1, then **reverted to 2** after the v2 johnny check (§12.6): it was a top-5 pick in both over-performing decks. |
| `twin_thorn` | cf **+20 win**, **+5.3 floors** (the strongest Graft card) | Base 5 → **4** (+2 per Bloom unchanged). This pulls the early-game must-pick down by 2 damage at every Bloom and keeps the Ripe ceiling (3 × 24 = 72) as the engine reward. |
| `heartwood_spear` | cf **+19**, **+5.5 floors** | Base 10 → **8**. It is 18 at Bloom 2 (rare rate 20). Its power comes from growth and its Ripe cost cut, not from the raw floor-1 number. |
| `propagate` | cf **−12** (v1 version: 0-Bloom copy) | Already reworked (copy keeps half its Bloom). The v1 number measured pure dilution and says nothing about the v2 card. Judged on design; re-measure. |

Unchanged despite a negative but non-significant cf: Decomposer −10, Reaping Vine −9, Death Cap −7. They are build-around payoffs, and a floor-1 copy without partners measures badly (the report's "Patterns"). The Compost and Harvest engines now supply their partners (Chaff fodder; Harvest re-sowing). The johnny batches judge them.

### 12.3 Archetype gap (Compost 11% vs Mass 46.5%)
- Compost was missing fodder: every Prune ate a real card, and every payoff needed several Prunes. v2 adds Molt and Shear (Chaff), Clear-Cut (one Prune card = many Prunes) and Thresher at uncommon. The Compost johnny can now take its fodder from commons.
- Mass/Canopy pullback: Thicket Crash cut. No other nerf until the johnny batches on v2 content are in.
- **Archetype matrix** (`docs/cards/graft.md` §5, which the johnny bots read) is regenerated from the `engine:*` tags. The column names stay G/B/C/M for comparability: G = Ripe, B = Harvest, C = Compost, M = Canopy. New cards are now in their johnny's plan. Before this they were invisible to the johnny bots.

### 12.4 Deep Rot at a 72% pick rate
That pick rate came from the greedy bot, which prices every self-buff Power at a flat 5+ (the same artefact puts Decomposer at 84% and Dusk Pruning at 78%). Its measured Δwin in that batch was +5 (not significant). Deep Rot does nothing until a target sits at Rot 15, so it is a dead draw in hallway fights and only pays off in long fights. That is the payoff for greed the Phase C headline asks for, and it is not a turtle tool, since Fungal Aegis is gone. Kept at cost 1 (0 upgraded). The lever, if rollout drafting shows it as a must-pick, is cost 2 / 1.

### 12.5 Pool after Phase C
57 cards: 4 starters, 20 common, 20 uncommon, 13 rare (22 Attacks, 24 Skills, 11 Powers, 17 Bloom cards), plus the Chaff token.

### 12.6 Check on v2 content (60 paired seeds `gpc-*`, current tree, planner bots)
| Bot | Graft | Notes |
|---|---|---|
| spike | 52.5% | Same seeds: Breaker 53.3%, Chronist 70.0%. The whole game got easier since the v1 baseline (28.5 / 41.5 / 28.5), so Graft now sits level with the Breaker. |
| johnny-gardener (Ripe) | 78.0% | Top picks: Deep Graft, Barb Flick, Twin Thorn, Shed Husk, Sap Drip, Patient Thorn, Thorn Halo, Heartwood Spear. |
| johnny-mass (Canopy) | 76.3% | Barb Flick ×2.1, Tendril Reach, Blightcap, Thorn Halo, Living Hedge, Burl Wall, Hivestrike, Thornwhirl. |
| johnny-blight (Harvest) | 40.0% | Spore Haze ×1.4, Blightcap ×1.3: the two Phase C buffs are its staples. Deep Rot ×0.8. |
| johnny-compost | 30.0% | Up from 11% (v1; it was 17.5 below spike and is now 22.5 below). The johnny bot still drafts with the v1 valuation, so Molt and Clear-Cut are barely picked (Chaff scores −3). Re-measure once rollout drafting lands. |

Every engine is at or above 25%. The ±12 point interval at n = 60 means only the Ripe/Canopy versus Compost gap is real. Next levers if the 200-run batch confirms Ripe and Canopy over-performing: Barb Flick's Ripe draw (Mass takes 2.1 copies), then Spill (`--set bloomSpill=0` A/B).

---

## 13. Phase D (final tuning to class parity, 2026-10-31)

Goal (RULINGS 67): spike Graft from its measured high down to 55–62% at the current global levers, before the sim agent raises `enemyHpPct` for everyone. The diagnosis in `docs/balance/notes-v2.md` (fix-list items 1 and 10):
- Graft won by drafting wide (29.6-card decks) on the deck-size and Bloom-count scalers.
- Assembled Ripe lost to unassembled (−14).

### 13.1 Method
- Spike only, `--workers 1`, 200 paired seeds `pd-0..199`.
- Rounds 1–5 ran on the live tree. Other agents' edits moved the baseline between batches, so rounds 1–5 can't be compared with each other cleanly.
- For the final numbers I froze two copies of the tree (src/ and docs/, priors included), identical except `graft.ts`. Every remaining step is a paired A/B on those copies. The src/ hash of each run is given below.

### 13.2 Changes (all in `src/content/cards/graft.ts`)
| Round | Card | Change | Why |
|---|---|---|---|
| 1 | Living Hedge | Block = **half** the Bloom cards in your deck (was 1 per Bloom card) | Wide-deck scaler; spike's #4 pick |
| 1 | Hivestrike | 5/8 + **half** the Bloom cards (was 4/7 + 1 per card) | Wide-deck scaler |
| 1 | Root Mesh | 4/7 + **half** the Bloom cards | Same |
| 1 | Canopy Crush | 6/11 + **half** the total Bloom (was 4/9 + all) | Same |
| 1 | Verdant Tide | hits = **half** the Bloom cards, 6/7 per hit (was 1 hit per card, 4/5) | Same |
| 1 | Hyphal Web | wide draw needs **10** Bloom cards (was 6) | Wide-deck draw |
| 1+3 | Tendril Reach | base Block 4 → **2** | Spike's #2 pick; v1 value |
| 1 | Heartwood Spear | Ripe: costs **2** less (was 1) | Item 10: the payoff scales once Ripe lands |
| 1 | Perennial | cost 2/1 → **1/0** | Item 10 |
| 2 | Shed Husk | Block 5/8 → **3/6**; round 5: draw 2 → **1** | Spike's #1 pick (1.8 copies); Chaff made it a cantrip engine |
| 2 | Living Hedge | cost 1/0 → **2/1** | v1 design value |
| 2 | Seed Rain, Deep Graft | Block 4/7 → 3/6; 3/6 → 2/5 | v1 values (the v1 sim buffs were made when Graft was the weakest class) |
| 2 | Choking Spores | Stagger 2/3 → **1/2** | v1 value |
| 2 | Thornwhirl | base 9 → **7**; round 6: +2/+3 per Bloom → **+1/+2** | v1 value; AoE was priced at Bloom 2 |
| 3 | Husk (starter) | Block 6/9 → **5/8** | GDD §4.1 value |
| 3 | Barb Flick | base 3 → **2** | v1 value |
| 3 | Sap Shell, Burl Wall | base 6 → 4; 10 → 8 | v1 values |
| 4 | Puffball | cost 1 → **2** | Rot to ALL that grows with Spill-fed Bloom (report value/E 58) |
| 4 | Spore Haze | cost back to **1** (Phase C had made it 0) | That buff was measured on v1 |
| 4 | Decomposer | 2 → **1** Rot per Prune | v1 value; Chaff multiplied Prunes |
| 4 | Perennial | also: **your Bloom cards count as having 2 more Bloom** | Item 10: Perennial was dead until a copy ripened. Now Ripe lands at 8 real Bloom, and every Bloom card scales at once |
| 5 | Dusk Pruning | cost 1/0 → **2/1** | A free Prune every turn; spike took 1.2 copies |
| 6 | Burl Wall | +3/+4 per Bloom → **+2/+3** | 38 Block for 2 at Bloom 10 |
| 6 | Twin Thorn | Ripe extra hits back to **1** (round 1 had made it 2) | A spike top-5 pick once it hit 4 times |
| 7 | Seed Bite (starter) | +2/+3 per Bloom → **+1/+2** | In every deck; Heartseed puts it in every opening hand, and Spill grows it to 10 by Act 2 (24/34 damage for 1 energy) |

Kept on purpose: Bloom, Prune, Spill and Ripe rules (global/TUNING, not this file); all four engines' identities; the Ripe clauses.

### 13.3 A/B numbers (spike, 200 paired seeds `pd-*`)
| Step | src/ hash | Spike Graft | Paired Δ | Ripe assembled vs not |
|---|---|---|---|---|
| Frozen "before" (Phase C graft.ts on the current tree) | `fb306e2c26d3b1d6` | 92.5% ±3.7 | — | 83% (6) vs 93% |
| After rounds 1–5 | `78f907a78763b351` (the lead's reference hash; the lead measured 78.0% on `v2-0..149`) | 78.0% | −14.5 ±7.1 | 81.7% (93) vs 74.8% |
| + round 6 | `6c950c148f3893fd` | 69.0% | −9.0 ±6.8 | 75.8% (95) vs 62.9% |
| + round 7 (final) | `53dd32c5be46062d` | **58.5% ±6.8** | −10.5 ±8.4 | 64.6% (79) vs 57.0% (**+7.6**) |
| Total, before → final | | 92.5 → 58.5 | **−34.0 ±8.9** | −10 → +7.6 |

Live-tree rounds 1–5 for the record (moving baseline): 98.0 → 91.0 → 79.5 → 73.5 → 74.5 → 78.0.

Engine check at the final step: every engine's johnny bot was ≥ 25% at Phase C. These changes trim shared commons and starters rather than one engine's pieces, and the Ripe engine now pays off when assembled (+7.6 against −14 before). Re-measure the johnnies with the next full persona batch.

**Canonical check** (docs/balance/README.md, seeds `v2-0..149`, snapshot src/ `d762febf94831f9a`, final `graft.ts`): spike Graft **58.7% ±7.9** (88/150). The lead's reference at `78f907a78763b351` (after rounds 1–5) was 78.0%. Output: `sim/out/graft-designer-spike/`.

---

## 14. Phase E (engine floors, 2026-11-01)

Problem (`docs/balance/notes-v2-final.md`, HP 110): spike Graft 33.7% (in band), but the johnny bots for Harvest were at 0%, Compost 3% and Ripe 17%. Bait Flare (colourless) was never played on Graft. Goal: each of the three johnnies at about 25%, with spike Graft no more than about 3 points up. The approach was to raise what each engine's pieces do before the engine is assembled, rather than raw numbers on the cards spike already drafts.

### 14.1 Method
- Frozen snapshots built with `sim/snapshot.sh`. Each round copies the previous snapshot and changes only `graft.ts` (round E1 also `colorless.ts`), then rebuilds the bundle.
- Every batch used `--set enemyHpPct.all=110` (Heroic; the tree default tier is now Standard at 95), `--workers 1` and seeds `v2-*`.
- Johnnies: 60 seeds each. Spike: 150 seeds. At 60 seeds a johnny rate is about ±10 points.

### 14.2 Changes
| Round | Card | Change | Engine |
|---|---|---|---|
| E1 | Spore Lash | 5 dmg + 2 Rot (7 + 3 upgraded); was 4 + 1/2 | Harvest |
| E1 | Burst Pod | "Apply 2 Rot. Harvest N. Scrap.": it sows before it reaps, so it is never dead | Harvest |
| E1 | Grim Harvest | sows 3 Rot before the Harvest | Harvest |
| E1 | Death Cap | a clean enemy gets 6 Rot (was nothing) | Harvest |
| E1 | Mire Carapace | base Block 4/7 → 6/9 | Harvest |
| E1 | Reap | damage 8/11 → 10/13 | Harvest |
| E1 | **Clear-Cut** | **reworked: "Whenever you Prune a Status card, Prune again."**, cost 1/0. The old "Scrap any number" Scrapped real cards and emptied the deck (Compost assembled −10.8). Chaff now chains Prunes. | Compost |
| E1 | Molt | Block 3/5 → 4/6 | Compost |
| E1 | Mulch Maul | base 5/8 → 6/9 | Compost |
| E1 | Thresher | base 4 → 5 | Compost |
| E1 | Pollen Sting, Patient Thorn | base 3 → 5; 4 → 6 | Ripe |
| E1 | Second Flush | also draws 1 card (it was dead with no grown copy in the discard pile) | Ripe |
| E1 | **Bait Flare** (colourless, `colorless.ts`) | **+4 Block** ("Apply 3 Goad. Gain 4 Block. Draw 1."), so a non-Goad deck can play it. Goad decks keep their payoff. | — |
| E2 | Burst Pod, Reap | Harvest 2 → **3** | Harvest |
| E2 | Sporeburst | Harvest 1 → **2** on ALL | Harvest |
| E2 | Grim Harvest | Harvest 3/4 → **4/5** | Harvest |
| E2 | Ripening Rot | each rotting enemy gains **2** Rot a turn | Harvest |
| E2 | Choking Spores | Stagger back to 2/3 (the Harvest deck's defence) | Harvest |
| E2 | Chaff | Block 2 → **3** | Compost |
| E2 | Mulch Maul | base 6/9 → 8/11 | Compost |
| E2 | Reaping Vine | 4/5 → 5/6 per Prune | Compost |
| E2 | Thresher | base 5 → 6 | Compost |
| E2 | Thorn Halo | cost 2 → 1 (the Ripe johnny takes 1.4 copies; spike rarely does) | Ripe |
| E3 | Grafting Cut | base 2 → 5 | Compost |
| E3 | Deep Graft | Block 2/5 → 4/7 | Compost, Ripe |
| E3 | Molt | also draws 1 | Compost |
| E4 | Canker Bite | base 5/8 → 7/10 | Harvest |
| E4 | Mire Carapace | plus **all** of the enemy's Rot (was half) | Harvest |
| E4 | Shear | damage 4/7 → 6/9 | Compost |
| E5 | Mulch Maul | **+2** per Scrapheap card (was +1) | Compost |
| E5 | Molt | 2 → **3** Chaff | Compost |
| E5 | Burst Pod | cost 1 → **0**; the upgrade is now Harvest 4 (it used to be the cost cut) | Harvest |

### 14.3 Results (Heroic, `--set enemyHpPct.all=110`, `--workers 1`, seeds `v2-*`)
| Snapshot | src/ hash | johnny-harvest | johnny-compost | johnny-ripe | spike Graft (150) | spike, paired Δ vs before |
|---|---|---|---|---|---|---|
| before | `db811e7c2e62ccb3` | 1.7% | 3.3% | 15.0% | 37.3% ±7.7 | — |
| E1 | `c41f1c275fe3fbf5` | 5.0% | 6.7% | 21.7% | 25.3% | −12.0 ±9.2 (see below) |
| E2 | `ccec46db246a1360` | 13.3% | 6.7% | 20.0% | — | — |
| E3 | `a9acecbd8b41e50f` | 11.7% | 15.0% | 26.7% | 36.7% | −0.7 ±9.5 |
| E4 | `362bb0aeb7729037` | 18.3% | 11.7% | 26.7% | 33.3% | −4.0 ±9.6 |
| **E5 (final)** | `aa7a66aa2a9c5a6c` | **23.3% ±11** | **8.3% ±7** | **26.7% ±11** | **34.7% ±7.6** | **−2.7 ±10.0** |

Engine payoff under spike (assembled vs a piece but not assembled):
- **Compost** went from −10.8 (report) to **+14.5** (42.3% vs 27.8%), from the Clear-Cut rework.
- **Ripe**: +17.8 (46.7% vs 28.9%).

Reading the numbers:
- **Spike is unchanged** (−2.7 ±10, inside the "no more than about +3" limit).
- **The E1 spike dip** was the changed cards losing their measured priors: spike's heuristic drafter took the reworked Thresher, Clear-Cut and Spore Lash about 0.4 copies more per run. It recovered from E3 on.
- **Ripe** is at target (26.7%).
- **Harvest** is close (23.3%, up from 1.7%).
- **Compost is not at target.** It reads 8–15% across E3–E5, all within one ±10 interval of each other. Its johnny dies mostly in Act 2. Its own defence is Chaff, Shed Husk, Molt and Deep Graft, all small after the Phase D nerfs.
- **Next Compost levers** (each also lifts spike, which drafts these):
  - Shed Husk Block back to 5/8;
  - Dusk Pruning cost back to 1/0.
  - I stopped here to stay inside the spike limit.
- **Re-measure every changed card's prior** before trusting spike pick counts: the sim agent's next `sim/priors.ts`.

### 14.4 Round E6: spend the Compost levers (lead's go, spike headroom to about 40%)
- **Shed Husk:** Block 3/6 → **5/8**.
- **Dusk Pruning:** cost 2/1 → **1/0**.

These are the two Phase D nerfs that hit Compost's own defence and its every-turn Prune. The tree had drifted since E5, so this A/B ran on a fresh snapshot of the current tree (E5 `graft.ts`) against a copy that differs only in `graft.ts`. HP 110 (`--set enemyHpPct.all=110`), `--workers 1`, seeds `v2-*`.

| Snapshot | src/ hash | johnny-compost (60) | spike Graft (150) |
|---|---|---|---|
| base (E5 graft on today's tree) | `d8f37754aa1b8dbe` | 8.3% ±7 | 34.7% |
| **E6** | `9fccb689b792a0b1` | **20.0% ±10** | **34.0% ±7.6** (paired Δ −0.7 ±9.0) |

Compost reaches the 20% stop line, at no measurable cost to spike. Final Phase E johnnies: Harvest 23.3%, Compost 20.0%, Ripe 26.7%.

---

## 15. Phase F (last content round, ruling 75, 2026-11-01)

Inputs: `docs/balance/report-v2-final-e.md` (src/ `9c9eea790ec3c309`, Heroic):
- **Molt** was +39 ±11.5 win as one extra copy, the strongest card in v2.
- **johnny-canopy** was at 12%, with 45% of its deaths in Act 1.
- **Spike Graft** was the low class at 31.3%.

### 15.1 Changes (`src/content/cards/graft.ts`)
| Card | Change | Why |
|---|---|---|
| Molt | **2 Chaff** (was 3), Block 4/6 → **3/5**; still draws 1 | It was 13 Block plus 3 Scrap-fuel Chaff for 1 energy |
| Sap Shell | base Block 4 → **6** | Canopy floor (it was cut in Phase D, before Heroic HP) |
| Tendril Reach | base Block 2 → **4** | Canopy floor |
| Root Mesh | base 4/7 → **6/9** (still half the Bloom cards) | Canopy floor |
| Hivestrike | base 5/8 → **7/10** (still half the Bloom cards) | Canopy floor |
| Living Hedge | cost 2/1 → **1/0** (still half the Bloom cards) | Canopy floor |

The Phase D caps on the wide-deck scalers (half the Bloom cards) stay. Only the bases and cost come back up.

### 15.2 Results (fresh snapshot src/ `39e6e6b9756efc25`, `--difficulty heroic`, `--workers 1`, rebuilt bundle)
| Measure | Before (report-v2-final-e) | After |
|---|---|---|
| Molt counterfactual (one extra copy, 60 paired seeds `cf-*`, spike) | +39 ±11.5 win (corrected) | **+10.0 ±17.9 win**, +5.9 floors (raw: baseline 41.7% → 51.7%) |
| johnny-canopy (60) | 11.7% | **28.3% ±11** |
| johnny-compost (60) | 20.0% (Phase E6) | 15.0% ±9 (within noise of 20; Molt was its main fuel) |
| spike Graft (150, seeds `v2-*`) | 31.3% ±5.2 | **38.7% ±7.8** |

- Molt lands at the +10 target.
- Canopy clears 25%.
- Spike Graft is up 7.4, at the top of the "up to about 38" window. It is now level with Chronist (40.0) and closer to Breaker (43.7).
- **Compost watch:** a 15–20% read sits inside one ±9 interval. If the next full batch has it under 15, the lever is Chaff's Block or Molt's third Chaff, not Shed Husk or Dusk Pruning, because spike drafts those two.
