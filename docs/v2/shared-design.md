# Vibespire v2: shared pool design (relics, colourless cards, potions)

Status: Phase A (design only), design-shared agent, 2026-10-30. Nothing in `src/` has changed yet. Phase B implements this after the lead's review and the v2-baseline sim report.

Reads with: `docs/v2/BRIEF.md` (the "Design framework for fun"), `docs/GDD.md` §2, §3 and §5 to §8, `docs/RULINGS.md`, `docs/CONTENT_GUIDE.md`, and `src/content/{relics,potions,cards/colorless}.ts`.

**What this changes, in one paragraph.** v1's shared pool is priced "at rate": most relics give a small, fair, flat bonus. v2 adds four **shared engines** that every class can draft into:
- **Redline** (Strain, HP as fuel), the user's Rupture example;
- **Scrapheap** (Salvage and Scrap payoffs), our Dead Branch and Corruption;
- **Overflow** (Reserve and X-costs), our Ice Cream and Chemical X;
- **Reprise** (cards that resolve twice), our Necronomicon, Echo Form and Burst.

Each engine has enablers in the colourless pool, payoffs in relics, a rule-breaker at rare or boss rarity, and one **bridge relic per class** that converts the shared resource into that class's own scaling: Onslaught or Guard, Bloom, or the Timeline. Boss relics become run-defining trades instead of six "+1 energy and a small tax" variants. Stat-stick and boring relics get a job, and the obvious OP suspects are listed for the sim to measure.

Counts after v2, including the class designers' relic and potion asks (folded in, §8): **relics 72 → 109**, **colourless 20 → 35** (21 uncommon / 14 rare), **potions 16 → 26**, **4 new shared keywords** (Strain, Salvage, Reserve, Reprise). If 109 relics is too many, §8.3 lists an 8-relic trim that loses no engine.

---

## 1. Research

### 1.1 Timmy, Johnny and Spike (Mark Rosewater)

Rosewater's 2006 "Timmy, Johnny, and Spike Revisited" ([WotC](https://magic.wizards.com/en/news/making-magic/timmy-johnny-and-spike-revisited-2006-03-20)) corrects the first article's stereotypes. Its key lines:
- **Timmy wants to experience something.** "Timmy is in it for the journey." His sub-types include the **Power Gamer** (big, dominating plays) and the **Adrenalin Gamer** (unpredictable, swingy outcomes).
- **Johnny wants to express something.** Sub-types:
  - **Combo Player**: an interaction nobody spelled out;
  - **Offbeat Designer**: "what if the deck only had…";
  - **Uber Johnny**: making the "unplayable" card work.
- **Spike wants to prove something.** Sub-types:
  - **Innovator**: finds the broken thing;
  - **Tuner**: squeezes out every edge;
  - **Analyst**: builds for the expected field;
  - **Nuts & Bolts**: perfect play.
- Most players are hybrids. Good cards lean hard toward one profile, so the people who love them *really* love them. Secondary summaries: [GosuGamers](https://www.gosugamers.net/hearthstone/features/44820-hearthstone-design-through-mtg-glasses-timmy-johnny-spike), [Giant Bomb](https://www.giantbomb.com/profile/majormitch/blog/timmy-johnny-and-spike/95416/).

What this means for a roguelike's shared pool:

| Profile | What the shared pool gives them | Where in this doc |
|---|---|---|
| Timmy (Power) | One card or relic that makes a number climb out of sight. Damage from missing HP, AoE scaled by X, a card that resolves twice. | Last Light, Starfall Lance, Scrapheap Colossus, Orbital Hammer, Echo Draught |
| Timmy (Adrenalin) | Visible gambles: risk HP, burn your hand, bet on the forecast. | Strain cards, Triage Locker, Star Atlas |
| Johnny (Combo) | Weak-alone pieces whose keyword names their partner, so the combo can be discovered. | Salvage cards + anything that Scraps; Reserve + X; Reprise sources |
| Johnny (Uber) | A rule-breaking boss relic that makes "bad" cards good. | Cracked Hourglass, Triage Locker, Wanderer's Compact, Gravity Loom |
| Spike | Clean glue, draw and filtering, hard economy choices. A resource that is wanted both in combat and on the map (Shards). | Blood Tithe, Spare Capacitor, Strip for Parts, Reclamation Ledger, Ascendant Prism, Assay Scale |

### 1.2 Why STS relic synergies are fun: the shapes behind the famous ones

Sources:
- Relic list and rarities: [STS wiki: Relics](https://slaythespire.wiki.gg/wiki/Relics).
- Ice Cream: [wiki](https://slaythespire.wiki.gg/wiki/Ice_Cream).
- Bird-Faced Urn: [wiki](https://slaythespire.wiki.gg/wiki/Bird-Faced_Urn).
- Snecko Eye: [wiki](https://slaythespire.wiki.gg/wiki/Snecko_Eye).
- Dead Branch and Corruption: [TV Tropes: Game Breaker](https://tvtropes.org/pmwiki/pmwiki.php/GameBreaker/SlayTheSpire), [Steam discussion](https://steamcommunity.com/app/646570/discussions/0/1778262124930086284).
- Snecko and Pyramid player views: [Steam](https://steamcommunity.com/app/646570/discussions/0/2650805212058485290).
- Giovannetti on relics redirecting runs ("You might get a relic that totally changes the nature of the run"): [PC Gamer](https://pcgamer.com/slay-the-spire-designer-discusses-new-characters-and-card-game-inspirations).

Every one of these is one of five shapes. We copy the **shape**, never the trigger and effect pair (commandment 19).

| STS combo | Shape | Why it's fun | Vibespire's own version (this doc) |
|---|---|---|---|
| **Dead Branch + Corruption** | **Converter + flooder.** Branch turns "a card is exhausted" (normally a loss) into a new card. Corruption makes every Skill exhaust *and* free. The loop is bounded only by hand size and deck. | A cost becomes a fuel. A run-defining moment ("my deck now draws itself") that is rare to assemble, so it feels earned. Variety from random cards keeps it fresh (Adrenalin Timmy). | **Salvage** (a Scrap is never a loss) + **Burn Bright** (Scrap cards cheaper) + **Undertow Reliquary** (the Scrapheap comes back once) + **Triage Locker / Gravity Loom** (end-of-turn Scrap floods). Bounded by `cap_bonus_energy`, `cap_draw` and the deck. |
| **Kunai / Shuriken / Ornamental Fan + Shivs** | **Count threshold.** Every 3rd Attack in a turn gives a stat, and Shivs are free Attacks. | Turns many cheap, weak plays into scaling. The bar fills visibly. | Our class rule already *is* this axis (Cadence's 3/6/9 beats, the Breaker's Onslaught, Glass Spurs). The shared pool feeds it with 0-cost colourless (Blood Tithe, Spare Capacitor, Fuse, Encore+) instead of adding a fourth counter. |
| **Snecko Eye + high costs** | **Rule-breaker that inverts card evaluation.** Random costs plus 2 draw make 3-cost cards the best cards in the deck. | Every reward screen changes; "bad" expensive cards become picks (Uber Johnny). | **Orbital Hammer** (cards that cost 3+ or X≥3 resolve twice), with **Stasis Engine** (dense decks) and **Reserve** (X climbs past 3). |
| **Runic Pyramid + Retain** | **Hand persistence.** You never discard, so you build your hand over turns. | Turns become a puzzle across several turns; Spike loves it, but the deck needs outlets or it clogs. | **Triage Locker** (boss): Keep 2 each turn; the rest of the hand is Scrapped. It is the opposite trade: you keep the *best*, and you lose what you didn't play. |
| **Ice Cream + X-costs** | **Banking.** Unspent energy carries over, so an X card becomes a nuke. | The "save up, then explode" turn is the purest Timmy moment, and the planning is Spike's. | **Reserve** (keyword): unspent energy banks, but only X-cost cards can spend it. Banking is therefore tied to a card family, not to everything (**Reserve Coil**, **Capacitor Bank**, **Surge Flask**). |
| **Unceasing Top** | **Empty-hand reward.** Draw a card whenever your hand is empty. | Rewards ordering and cheap decks; a turn can "keep going". | **Echo Bell**: the first time each turn you play the last card in your hand, it resolves twice. The *order* of your hand becomes the puzzle (end on the big card). |
| **Charon's Ashes** | **Converter.** Exhaust → AoE damage. | Makes "exhaust" decks a damage plan. | **Salvage Kiln** (exists: Scrap → Exposed), **Static Choir** (Status card played or Scrapped → AoE), **Reclamation Ledger** (Scrap → Shards, i.e. into the economy). |
| **Tingsha / Tough Bandages + discard** | **Converter on an action the class does anyway.** | The class's default action becomes a damage or defence source. | Vibespire has no discard axis, and inventing one in the shared pool would give it no class support. Our "default actions" are **Strain**, **Scrap**, **Prime**, **Prune** and **Timeline resolve**, and the converters target those (Scar Engine, Blood Rivets, Notched Buckler rework). |
| **Bird-Faced Urn + Powers** | **Small payoff on a card type.** | Makes "play many Powers" a deck. | **Antenna Wire** (common: Power → draw 1) and **Overture Engine** (your best Power starts in hand and costs 0 that turn). |
| **Boss relics** | **Big upside + a drawback that reshapes the run.** Ectoplasm (no gold), Sozu (no potions), Velvet Choker (6 cards/turn), Coffee Dripper (no rest), Busted Crown (fewer choices), Runic Dome (no intents), Snecko, Pyramid. | The run's biggest pivot. A good boss relic changes **which future rewards are good**. A bad one is "+1 energy, tiny tax", which is v1's main problem (6 of 12). | §3.5: boss relics rebuilt around **our** run axes: the Timeline, Keep/Scrap, Shards, rewards across classes, the forecast. |
| **Shop / event economy** (Membership Card, Smiling Mask, The Courier, Maw Bank, Golden Idol, Old Coin, Ectoplasm, Necronomicon) | **Economy shapers.** They change *where* you path and *what* a shop visit is worth. | Spike's analyst game on the map. | Our economy has a second currency (**Shards**), so our shapers trade between the two: **Assay Scale** (sell or buy Shards at shops), **Shard Writ** (2 removals per shop), **Salvager's Licence** (colourless offers after elites, which matter because colourless combo glue only comes from shops), **Ascendant Prism** (Shards as energy), **Crown Fragment** (fast wins → Shards). |

**Principles taken into this design:**
1. **A payoff should convert a cost into fuel.** Strain, Scrap and Status cards are costs today, and v2 relics turn each into value.
2. **Combos need a flooder.** A converter alone is linear. The multiplicative moment arrives when a rule-breaker makes the trigger happen far more often (Burn Bright, Triage Locker, Orbital Hammer). Those pieces sit at rare or boss rarity.
3. **Name the partner in the text.** Salvage cards say "Salvage"; Scrap-flooders say "Scrap"; X cards say "X". The keyword box is the discovery path (conveyance rule).
4. **Bound every loop with an existing cap** (GDD §3), never with a new special rule. Energy: `cap_bonus_energy` (4). Draw: `cap_draw` (15). Cards added: `cap_to_hand` (4). Advance: `cap_advance` (2). Reprise: at most 2 resolutions per card.
5. **Boss relics change which rewards are good.** That is the test each one in §3.5 passes.

---

## 2. New keywords

There are four keywords, all `group: 'shared'` in `src/content/keywords.ts` (owned by conveyance; I add the entries in Phase B, per the brief). Rule numbers are placeholders from `keywordTextValues()`.

| id | Name | terms | Text (template) | Engine hook (§7) |
|---|---|---|---|---|
| `strain` | Strain | `Strain`, `Strained` | "Lose that much HP. Block and Guard don't stop it. You can't play a card whose Strain would drop you to 0 HP. Some relics and cards reward you whenever you Strain." | H1 |
| `salvage` | Salvage | `Salvage` | "When this card is Scrapped, from any source (played with Scrap, Pruned, or Scrapped by an effect), its Salvage happens. If that is outside your turn, it happens at the start of your next turn instead." | H2 |
| `reserve` | Reserve | `Reserve` | "Stored energy that only X-cost cards can use. Your next X-cost card adds your Reserve to X, then your Reserve empties. Holds up to {reserve_cap}. Lasts until the end of combat." | H3 |
| `reprise` | Reprise | `Reprise` | "The card's effects happen twice, on the same target and with the same X. It is still one play: one beat, one Onslaught. A card never resolves more than twice." | H4 |

Why each is new (commandment 19):
- **Strain** is a tagged form of the GDD's "lose HP". STS has HP-cost cards, but no keyword joins them to payoffs across classes. The shape is "a cost that relics read", like Shards.
- **Salvage** is closest to STS's Sentinel and Necronomicurse exhaust triggers. It differs by being a **card-side effect list that any Scrap source fires**, Prune included, which makes it the Graft's best fodder and every other class's reason to own a Scrapper.
- **Reserve** is Ice Cream narrowed to one card family, so it is a deck plan (X-costs), not a stat.
- **Reprise** is the "play twice" multiplier (Burst, Double Tap, Echo Form, Necronomicon) as one keyword with one rule, shared by a potion, a card and three relics. It is deliberately a *resolution* repeat, not a second *play*, so it never inflates Cadence or Onslaught.

---

## 3. Relic overhaul

**Conventions**
- Rendered text below shows the numbers. In code every number lives in a `values` const that both the hook and `text` read (the relics.ts convention).
- **Profile**: T = Timmy, J = Johnny, S = Spike.
- **Partners**: what the relic is designed to combo with (§6 has the catalogue).
- **Engine**: H-numbers refer to §7. "content" means no engine change.
- Voice: keep v1's plain rules sentences ("Whenever…", "At the start of…"), with the flavour in the name. No new flavour text.

### 3.1 OP suspects (for the sim to measure)

v1 relic win Δ is dominated by survivorship bias (report-final: almost every relic is +20 to +50). **Please measure these with a forced-relic A/B**: grant the relic at floor 1, or at the floor it was picked, against the same seeds without it. Report each against the median of its own rarity. Ranked by my mechanical estimate:

| # | Relic | Rarity | Why I suspect it | v1 win Δ | Proposed fix (applied in §3.2–3.6 unless the sim clears it) |
|---|---|---|---|---|---|
| 1 | `gravity_loom` | boss | +2 draw every turn. The drawback (hand limit 7) almost never bites, because 5 + 2 = 7 fits exactly and only Keep or generated cards overflow. | +47 / +48 | Rework (§3.5): the drawback becomes "Scrap a random card left in your hand at the end of your turn". |
| 2 | `ghost_lantern` | boss | +1 energy for 10 enemy Guard that halves on the enemy's first turn: about 10–15 HP of tax per fight. | +31 / +41 | Rework: Guard = 15% of each enemy's Max HP (bosses ≈ 35–50). |
| 3 | `crown_fragment` | event | Fast wins → Shards → Purges → faster wins. A snowball with no ceiling. | +46 to +54 | Cap: at most 2 Shards per act. |
| 4 | `binding_contract` | boss | Already trimmed (ruling 46). The bot never feels "must take", and +1 energy is the whole game. | +29 to +45 | Keep; re-measure after ruling 46. If still top: the must-take card also becomes a common. |
| 5 | `notched_buckler` | common, Breaker | 4 Guard nearly every turn (the Breaker almost always has a primed card): a common worth an uncommon. | +37 | Rework: pays on a **fizzle** (a non-attack turn) instead of every turn. |
| 6 | `star_pip` | common, Chronist | The Chronist always has Augury, so 3 Block *per* enemy every turn against packs. | +39 | Rework to the Chronist's Goad version (2 Block per attacking enemy, +1 per Goad), still on the watch list. |
| 7 | `stormbreak_gem` | rare, Breaker | +1 energy and 2 draw on every swing turn. That snowballs the swing that triggered it. | — | Watch. If it's top-3 among rares: draw 2 → 1. |
| 8 | `wayfinder_needle` | uncommon | About +1 relic per act on most paths, i.e. rare-level value at uncommon. | +23 | Watch. If high: rows 1–7 → 5–7 (so it competes with the Treasure row). |
| 9 | `shard_writ` | shop | Two removals per shop visit. Thinning compounds. | +29 | Watch. Also fix the price bug (§3.6). |
| 10 | `duelists_oath` | rare, Breaker | Doubles every Riposte. Intended rule-breaker, but measure it. | — | Watch. |
| 11 | `elder_seed` | rare, Graft | Bloom 15: an upgraded Seed Bite does 49 for 1 energy. Intended Timmy ceiling, but measure it. | — | Watch (the act 3 damage-cap boss is the check). |
| 12 | `fracture_engine` | rare | Exposed ×2. Intended build-around; with the new Strain → Exposed it could double-dip. | +29 | Watch, together with `scar_engine`. |

**Under-performers** (for the sim to confirm):
- `cracked_hourglass` (−24 to −33): a trap, reworked.
- `pocket_star_chart`, `stim_patch`, `field_dressing`, `bulwark_rivets`: stat sticks, reworked or given a role.

### 3.2 Starter (3): unchanged
`riven_gauntlet`, `heartseed`, `chrono_lens` are unchanged. Each class designer owns its starter's tuning; ask through the lead.

### 3.3 Common (18 → 23)

Kept as is (13; each already has a role): `glass_spurs`, `dampener_coil`, `cracked_prism`, `geode_heart`, `surveyor_ink`, `tally_stick`, `chain_wraps` (watch), `seed_pouch`, `pollen_sac`, `compost_heap`, `tuning_fork`, `sandglass_bead`, `scrap_magnet`.

`scrap_magnet` stays exactly as it is. The Graft's new Chaff token is a Status that reaches the hand, so it already pays (graft-design §9.3). A "…or Scrapped" extension would make every Chaff pay twice.

**Reworked (5 commons, plus the uncommon Seer's Veil, which the Chronist asked for together with Star Pip):**

| id | Name | Old text | New text | Values | Why / partners | Profile | Engine |
|---|---|---|---|---|---|---|---|
| `bulwark_rivets` | Bulwark Rivets | Whenever you gain Guard, gain 1 more. | **At the start of your turn, gain Guard equal to half the Block you lose (round down).** | `{ pct: 50 }` | A stat stick becomes "overblocking banks". It gives every class a way into the Guard bank, and works with Bastion Core, Slow-Temper Alloy and Ballast Lock. | S | content: `onTurnStart` reads the Block lost. Needs H9 (the Block lost at reset). |
| `stim_patch` | Stim Patch | Whenever you use a potion, gain 4 Guard. | **Whenever you use a potion, gain 3 Guard. The next card you play this turn costs 1 less.** | `{ guard: 3, cost: 1 }` | Potions become tempo pieces mid-turn (a potion before Starfall Lance means +1 X, because X is the energy spent). Works with Vial Rack and every potion in §5. | S | content (a `next_card_discount` status with `modifyCardCost`, consumed on play; `cap_cost_reduction` applies). |
| `field_dressing` | Field Dressing | After you win an elite or boss combat, heal 8 HP. | **After you win a combat, heal half the HP you Strained in it (round up).** | `{ pct: 50 }` | The Redline engine's common. It makes Strain cards a real plan instead of a pure tax, and tells the player Strain exists. Works with Blood Tithe, Vent Plasma and Last Light. | S/J | content: `onCombatEnd` reads `combat.counters.strained` (H1). |
| `notched_buckler` | Notched Buckler | At the end of your turn, if you have a primed card, gain 4 Guard. | **Whenever a primed card fizzles, gain 5 Guard and draw 1 more card next turn.** | `{ guard: 5, draw: 1 }` | A fizzle (the enemy didn't attack) stops feeling bad, so you can hold Riposte freely. It now pays on roughly 1 turn in 3 instead of every turn. | S | content: needs hook `onPrimeFizzled {card}` (H10). Draw via a `drawPerTurn` +1 flag on the next turn. |
| `star_pip` | Star Pip | At the start of your turn, gain 3 Block for each enemy whose next two intents are both attacks. | **At the start of your turn, gain 2 Block for each enemy that intends to attack, +1 for each Goad on it.** (chronist-design §9) | `{ block: 2, per_goad: 1 }` | Rethemed to the Chronist's Storm engine: Goad raises the enemy's hit, and Star Pip insures it. At 2 per enemy (was 3, over two intents) it gives less free Block. Watch. | S/J | content (reads `goaded` stacks) |
| `seers_veil` *(uncommon)* | Seer's Veil | At the start of your turn, if any enemy's intent after next is not an attack, draw 1 card. | **The first time you Goad an enemy each turn, draw 1 card.** (chronist-design §9) | `{ draw: 1 }` | v2 Chronist has no lull cards; Goad is her risk lever, and this makes it a cantrip. | S | `onStatusInflicted` (chronist H10) |

**New (5): 2 from this doc + 3 class asks:**

| id | Name | Class | Text | Values | Why / partners | Profile | Engine |
|---|---|---|---|---|---|---|---|
| `slag_bucket` | Slag Bucket | breaker | **The first time you Shed Guard each turn, draw 1 card.** (breaker ask) | `{ draw: 1 }` | Every Shed card becomes a cantrip, the Spike line of the Bastion engine. | S | breaker H3 `onGuardShed` |
| `storm_lantern` | Storm Lantern | chronist | **Whenever you apply Goad, apply 1 more.** (chronist ask) | `{ goad: 1 }` | Small Goad sources double; works with Squall Line and Eye of the Storm. | J | chronist H10 `onStatusInflicted` (re-entrancy guarded, like Plague Bloom) |
| `spite_needle` | Spite Needle | any | **Whenever you apply a status to an enemy, deal 1 damage to it.** (chronist cross-class ask) | `{ damage: 1 }` | Ties Goad, Exposed, Stagger and Rot together for every class. Multi-application cards (Plague Bloom spreads, Fault Dust) become chip damage. A hit, so Exposed applies. Trim candidate. | J | chronist H10 |
| `spare_fuse` | Spare Fuse | any | **At the start of each combat, add a Fuse to your hand.** (Fuse: 0, Skill, special colourless: "Draw 1 card. Scrap. Salvage: gain 2 Guard.") | Fuse values `{ draw: 1, sguard: 2 }` | A free turn-1 Scrap and Salvage trigger, so every Scrap payoff (Salvage Kiln, Reclamation Ledger, Scrapheap Colossus) starts online. A 0-cost play for Cadence. Teaches both new keywords on floor 1. | J/S | content (special card `fuse`, rarity `special`, not in any pool). H2 for Salvage. |
| `antenna_wire` | Antenna Wire | any | **Whenever you play a Power, draw 1 card.** | `{ draw: 1 }` | Powers stop being card disadvantage, which makes "Power decks" a plan for every class (each has about 8). Works with Overture Engine and Echo Draught. | J | content |

### 3.4 Uncommon (18 → 32)

Kept (17): `parry_charm`, `kept_fury`, `crowd_breaker`, `concussion_rig`, `slow_temper`, `pocket_star_chart`, `overwatch_drone`, `shard_lens`, `crystal_spine`, `hairline_saw`, `wayfinder_needle` (watch), `rot_censer`, `grafting_knife`, `heartwood_ring`, `mycelial_net`, `offbeat_drum`, `timeline_spool`. Reworked (1): `seers_veil` (§3.3).

**New, any class (7: 4 from this doc + 3 class asks):**

| id | Name | Text | Values | Why / partners | Profile | Engine |
|---|---|---|---|---|---|---|
| `scar_engine` | Scar Engine | **Whenever you Strain, apply 1 Exposed to ALL enemies.** | `{ exposed: 1 }` | The shared Redline payoff. HP becomes an AoE debuff for multi-hit and Riposte decks. Works with Blood Tithe, Vent Plasma, Glass Spurs, Fracture Engine and Arc Discharge. | J | H1 (`onStrain`) |
| `static_choir` | Static Choir | **Whenever a Status card is Scrapped, deal 3 damage to ALL enemies.** | `{ damage: 3 }` | Status cards become ammunition. Status cards with Scrap (Jitter, Drift, the Graft's Chaff) fire it when played; unplayable ones (Tangle, Backlash) need a Prune, Triage Locker or Kiln Salts. Scrap only (not "play or Scrap"), so each card fires once. Works with Relay Ping, Overdraft Cell, Wild Growth, Husk Sac and Act 2 status spam. Chaff makes this up to 4 × 3 AoE a turn, so watch it. | J/T | content: `onCardExhausted` (type status) |
| `gyre_spindle` | Gyre Spindle | **The first time each turn you play the last card in your hand, draw 2 cards.** (chronist ask: "empty hand → draw", not Unceasing Top's every-time trigger) | `{ draw: 2 }` | Long Clockwork chains, Graft Prune decks that empty the hand, 0-cost colourless. With Echo Bell, the last card resolves twice and refills you. | S/J | content: `onCardPlayed`, hand empty, first per turn |
| `whetstone` | Whetstone | **Whenever you apply Exposed to an enemy, apply 1 more.** (breaker ask) | `{ exposed: 1 }` | It doubles small Exposed sources, so 1-Exposed cards rise. Works with the Breaker's Crazing, Scar Engine (Strain → 2 Exposed to all), Fault Beacon and Glass Spurs. | J | chronist H10 `onStatusInflicted` (guarded against re-triggering itself) |
| `ash_wick` | Ash Wick | **The third time a card is Scrapped in a turn, gain 1 energy (once per turn).** (graft ask) | `{ nth: 3, energy: 1 }` | The Scrap engine's energy payoff, for the Graft's Clear-Cut and for Breaker or Chronist Scrap decks (Strip for Parts, Kiln Salts, Burn Bright). `cap_bonus_energy` applies. | J/S | content (per-turn counter) |
| `reclamation_ledger` | Reclamation Ledger | **Whenever a card is Scrapped, this gains a charge. At 12 charges, gain 1 Shard and reset.** (counter shown) | `{ charges: 12, shards: 1 }` | Ties the Scrap engine to deck surgery and the economy. Spike's relic for Scrap decks; the Graft will love it (sim-tune `charges`). | S | content (`relic.counter`, `counterMax`) |
| `reclamation_ledger` | Reclamation Ledger | **Whenever a card is Scrapped, this gains a charge. At 12 charges, gain 1 Shard and reset.** (counter shown) | `{ charges: 12, shards: 1 }` | Ties the Scrap engine to deck surgery and the economy. Spike's relic for Scrap decks; the Graft will love it (sim-tune `charges`). | S | content (`relic.counter`, `counterMax`) |
| `overture_engine` | Overture Engine | **At the start of each combat, put the highest-cost Power in your draw pile into your hand (ties: random). It costs 0 this turn.** | `{ cost: 0 }` | Power-deck consistency, the Heartseed idea for Powers: your Cinder Heart or Prism Resonance is online on turn 1. Works with Antenna Wire and Echo Draught. | S/T | `fetch_card select: 'max_cost'` (H11), `filter: {type: 'power'}`, `costThisTurn: 0`, `countsAsDraw: true` (and one fewer turn-1 draw, as Heartseed does). |

**New, class bridges (3) and class asks (4).** Each bridge converts a shared resource into that class's own scaling. The Breaker and the Chronist each have one bridge here and one rare (§3.5). The Graft's second bridge (Seed Vault) moved to the reserve list (§8.2) to make room for her asks.

| id | Name | Class | Text | Values | Why / partners | Profile | Engine |
|---|---|---|---|---|---|---|---|
| `blood_rivets` | Blood Rivets | breaker | **Whenever you Strain, gain twice that much Guard.** | `{ mult: 2 }` | HP → Guard bank → Bastion Core damage. The Breaker's Rupture. Works with Blood Tithe, Vent Plasma, Bastion Core and Slow-Temper Alloy. | J | H1 |
| `blood_mulch` | Blood Mulch | graft | **The first time you Strain each turn, a random Bloom card in your hand, draw pile or discard pile gains 1 Bloom.** | `{ bloom: 1 }` | Pay HP for **permanent** growth: the most Graft trade there is. Once per turn because Bloom is permanent. | J/S | H1; `bloom target: random_bloom_in_piles` |
| `borrowed_time` | Borrowed Time | chronist | **Whenever you Strain, Advance 1.** | `{ advance: 1 }` | Pay HP to pull the Timeline forward (`cap_advance` 2/turn bounds it). It turns her Delay 2 strikes into this-turn bursts. Works with Vent Plasma, Blood Tithe, Timeline Spool and Timeline Clamp. | J | H1 |
| `coal_scuttle` | Coal Scuttle | breaker | **At the start of each combat, gain 1 Ember.** (breaker ask) | `{ embers: 1 }` | Kindle, Hammerfall and Worldbreaker rise; Cinder Heart becomes optional. | T/S | content (status `embers`, breaker H1) |
| `husk_sac` | Husk Sac | graft | **The first time you Prune each turn, add a Chaff to your hand.** (graft ask) | — | One fixed fodder token per turn feeds Compost, Static Choir, Grafting Knife and Scrap Magnet. Counts toward `cap_to_hand`. | J/S | content: `onPrune`, first per turn → `add_card chaff` |
| `reapers_sickle` | Reaper's Sickle | graft | **Whenever you Harvest, gain Block equal to half the HP the enemy lost (round down).** (graft ask) | `{ pct: 50 }` | The Harvest engine's defence: reap turns are also guard turns. | S | graft H3 `onHarvest` |
| `astrolabe` | Astrolabe | chronist | **Whenever 3 or more cards resolve together from your Timeline, gain 1 energy.** (chronist ask) | `{ batch: 3, energy: 1 }` | Conjunction's follow-up turn. With Gather, a big batch pays for the next setup. | J | needs `batch` on `onDelayResolved` info (chronist H1 stamps it); first entry of a qualifying batch fires |

### 3.5 Rare (12 → 24)

Kept (12): `duelists_oath` (watch), `stormbreak_gem` (watch), `bastion_core`, `elder_seed` (watch), `hollow_bough`, `plague_bloom`, `metronome_heart`, `prophet_glass`, `paradox_coil`, `shard_crucible`, `fracture_engine` (watch), `void_compass`.

**New (7):**

| id | Name | Class | Text | Values | Why / partners | Profile | Engine |
|---|---|---|---|---|---|---|---|
| `reserve_coil` | Reserve Coil | any | **At the end of your turn, your unspent energy goes into Reserve.** | (`TUNING.caps.reserve` = 5) | The Overflow rule-breaker: float energy into one big X turn. Works with Starfall Lance, Arc Discharge, Stasis Bolt, Orbital Hammer and Momentum Flywheel. | T/S | H3. Content `onTurnEnd`: `status reserve +energy`. |
| `echo_bell` | Echo Bell | any | **The first time each turn you play the last card in your hand, it has Reprise.** | — | Unceasing Top's "empty hand" reward, as an **ordering** puzzle: end your turn on the big card. Works with Shardfall, Last Light, Starfall Lance and every class finisher. | J/S | H4 (`grantsReprise`: hand empty at play) |
| `undertow_reliquary` | Undertow Reliquary | any | **The first time each combat you shuffle your discard pile into your draw pile, shuffle your Scrapheap in too.** | — | Scrap one-shots come back once: Shardfall twice, Overdraft Cell twice, and Salvage triggers again. The Scrapheap engine's flooder. | J | content: `onShuffle`, first per combat, move `exhaust` into `draw`, reshuffle on the `shuffle` stream. |
| `kickback_governor` | Kickback Governor | any | **Whenever Stagger reduces an enemy's hit on you, deal the damage it prevented to that enemy.** | — | Stagger (a defence) becomes a weapon against multi-hit enemies. Works with Gyro Jammer, Snare Line, Concussion Gas, Engine Tooth and Breaker Riposte-Stagger. The Act 2 width answer. | J/T | H5 (`DamageResult.staggerPrevented`); the reflected damage is a hit tagged `kickback` (not Riposte), so Exposed applies. |
| `orbital_hammer` | Orbital Hammer | any | **Whenever you play a card that costs 3 or more (X-cost cards: X 3 or more), it has Reprise.** | `{ cost: 3 }` | Our Snecko Eye: expensive cards become the best cards. Works with Stasis Engine, Reserve Coil, X cards and class 3-costs. Timmy's relic. | T/J | H4 (`grantsReprise` reads `costPaid` and `x`, H12) |
| `momentum_flywheel` | Momentum Flywheel | breaker | **Your X-cost Attacks give X Onslaught instead of 1.** | — | X → Onslaught → finisher. The Breaker's Overflow bridge. Works with Arc Discharge, Starfall Lance, Reserve Coil and Spend-all finishers. | J | content: `afterCardPlayed` (X attack) → `status onslaught + (x − 1)`. Needs `x` in `CardPlayedInfo` (H12). |
| `refrain_pin` | Refrain Pin | chronist | **The first card you play on the beat each turn has Reprise.** | — | The Chronist's Reprise bridge: your beat-3 payoff resolves twice. Works with Offbeat Drum, Chrono Lens, Crescendo cards and Delay split cards (their immediate part). | J/T | H4 (`grantsReprise`: `info.onBeat`, first per turn) |

**New, class asks (5):**

| id | Name | Class | Text | Values | Why / partners | Profile | Engine |
|---|---|---|---|---|---|---|---|
| `twin_scabbard` | Twin Scabbard | breaker | **Whenever a primed card fires, add a random Breaker Riposte card to your hand.** (breaker ask; the created card is gone after combat) | — | The Breaker's Dead Branch: the Counter engine refills its own rack, and Answer in Kind and Recoil Spring become must-picks. Bounded by `cap_to_hand` and one fire per enemy attack. | J/T | H19 (`add_random_card`) |
| `recoil_coil` | Recoil Coil | any | **Whenever an enemy's attack is cancelled or it skips a move, gain 1 energy next turn.** (breaker ask, widened to Halt so it isn't a dead drop for other classes) | `{ energy: 1 }` | Kill-before-hit pays. Works with Riposte kills, Steal the Swing, Overwatch Drone kills, Grav Clamp and Halt Ampoule. | S/J | H20 (`onAttackCancelled`, `onMoveSkipped`) |
| `trellis` | Trellis | graft | **At the start of your turn, put a Ripe card from your discard pile into your hand.** (graft ask) | — | Your best card every turn. With Perennial, twice. Counts toward `cap_to_hand`. | T | `fetch_card from: discard, filter: {ripe: true}` (graft H2) |
| `festering_lens` | Festering Lens | graft | **When an enemy's Rot ticks, it loses 1 more HP for each Exposed it has.** (graft "shared" ask, made Graft-only because no other class applies Rot; Wanderer's Compact still reaches it) | `{ per: 1 }` | Ties the shared Exposed to Rot: Exposed from Whetstone, Scar Engine, Fault Dust and Stress Fracture now also feeds the clock. | J | content: the Rot status reads the relic, the same pattern as Rot Censer (`src/content/statuses.ts`, a one-line read) |
| `conductors_baton` | Conductor's Baton | chronist | **Your Crescendo effects count one more beat.** (chronist ask) | `{ beats: 1 }` | ×2/×3/×4: Timmy's Clockwork relic. | T | H21 (`beatIndexBonus`) |

### 3.6 Boss (12 → 16): run-defining trades

The test for each: **does it change which card rewards are good for the rest of the run?** v1 has six "+1 energy and a small tax" relics, and the tax rarely changes a pick. v2 keeps the seven whose drawback does change picks, rebuilds five, and adds four (two any-class, two class asks).

| id | Name | Class | Status | New text | What it does to the run | Profile | Engine |
|---|---|---|---|---|---|---|---|
| `binding_contract` | Binding Contract | any | keep (watch, #4) | +1 energy each turn. Card rewards offer one card fewer, and you must take a card from every one. | The deck bloats, so you want removal, Scrap and Triage. | S | — |
| `stasis_engine` | Stasis Engine | any | keep | +1 energy each turn. Draw 1 fewer card each turn. | Dense, expensive cards; works with Orbital Hammer. | S/T | — |
| `exposed_core` | Exposed Core | any | keep | +1 energy each turn. Start each combat with 4 Exposed. | Turn-1 defence and Stagger rise; multi-hit enemies are scary. | S | — |
| `tender_plating` | Tender Plating | any | keep (watch) | +1 energy each turn. Whenever you lose HP from an enemy hit, lose 1 more. | Full-block and Stagger decks. If the sim finds it toothless, extra 1 → 2. | S | — |
| `fixed_star` | Fixed Star | chronist | keep | +1 energy each turn. Only the 3rd card you play each turn is on the beat. | One huge beat; works with Refrain Pin. | J | — |
| `heavy_heart` | Heavy Heart | breaker | keep | Onslaught halves instead of resetting. You can't prime Riposte cards. | The pure-swing Breaker. | T | — |
| `wild_growth` | Wild Growth | graft | keep | Prune grants 1 more Bloom. At the start of each combat, shuffle 2 Tangles into your draw pile. | Now also Static Choir and Scrap Magnet fuel, and Clear-Cut fodder. | J | — |
| `ghost_lantern` | Ghost Lantern | any | **rework** (#2) | +1 energy each turn. **Enemies start each combat with Guard equal to 15% of their Max HP** (up to the Guard cap). | Burst decks suffer; Rot, Strain-free scaling and Delay 2 openers are favoured. Bosses carry 35–50 Guard on turn 1. | S | content (the marker status computes Guard from `maxHp`) |
| `gravity_loom` | Gravity Loom | any | **rework** (#1) | Draw 2 more cards each turn. **At the end of your turn, Scrap a random card left in your hand** (not Keep cards). | Big hands, but every card you don't play may be gone for the fight. Cheap, playable decks; Salvage cards become upside. | T/J | H6 (`onHandEndOfTurn` relic hook; `misc` stream) |
| `star_atlas` | Star Atlas | not chronist | **rework** | You have Augury. **At the start of your turn, if no enemy intends to attack, gain 2 energy.** Enemies have 10% more Max HP. | Information becomes tempo: you read the forecast to plan your 5-energy turns. | S/J | content (`onTurnStart` reads intents; `cap_bonus_energy` applies) |
| `ascendant_prism` | Ascendant Prism | any | **rework** | **While you hold 5 or more Shards, you have +1 energy each turn. You can't Purge or Transmute at Rest sites.** | Shards become your energy. You hoard instead of Purging, so in-combat Shard readers (Shardfall, Prism Resonance, Geode Heart) and shop removal decide the deck. A real Spike puzzle. | S | content (`maxEnergy` reads `shards`); H13 `restOptionBlocked` |
| `cracked_hourglass` | Cracked Hourglass | any | **rework** (the v1 trap) | +1 energy each turn. **The first card you play each turn that isn't a Power or a Delay card is Delayed 1: it goes on the Timeline and resolves at the start of your next turn.** | Every turn opens with a plan for *next* turn. Non-Chronists lead with Block (it lands for the next enemy phase) or with a setup Attack. The Chronist dodges it with Delay cards, and Timeline Spool and Clamp pay on it. | J | H7 (whole-card Timeline entries) |
| `triage_locker` | Triage Locker | any | **new** | **At the end of your turn, choose up to 2 cards in your hand to Keep. Scrap the rest of your hand.** | The Runic Pyramid shape inverted. You always keep your best 2, and every card you didn't play is gone for the fight. Statuses and curses vanish, Salvage fires every turn, and long fights thin you to your core. | J/T | H6 (end-of-turn choice: min 0, max 2; Keep cards don't count) |
| `wanderers_compact` | Wanderer's Compact | any | **new** | +1 energy each turn. **Card rewards offer one card from each class** instead of three from yours. | The cross-class run: a Breaker drafting Delay strikes, a Graft drafting Riposte. Each reward has only one card of your own class, which is the drawback. Every class mechanic already works for every class (Onslaught is a rule, Bloom is a card var, the Timeline and priming are zones). | J | H8 (`cardRewardClasses`) |
| `furnace_mantle` | Furnace Mantle | breaker | **new** (breaker ask) | +1 energy each turn. **At the start of your turn, Shed all your Guard instead of halving it.** | Guard can't bank (Rampart Crash and Iron Avalanche fall off), but every leftover point triggers Molten Shell, Spark Gap and Slag Bucket each turn. It switches off Bastion Core, which needs halving, so the two are a real either-or. | J | content: `guardDecay` → 0 lost + `onTurnStart` `shed {n: 'all'}` (breaker H3) |
| `perpetual_calendar` | Perpetual Calendar | chronist | **new** (chronist ask) | +1 energy each turn. **Cards that resolve from your Timeline go to the bottom of your draw pile instead of your discard pile.** | Payloads come back on a fixed schedule instead of with the reshuffle; the deck plans itself. The drawback is a slower recycle of your best cards in short decks. | J/S | H22 (`timelineDestination`) |

Boss pool mix after v2: 11 with +1 energy (binding, stasis, exposed core, tender plating, fixed star, ghost lantern, hourglass, compact, furnace mantle, perpetual calendar, and Ascendant Prism, which is conditional) and 5 rule-changers without +1 energy (gravity loom, star atlas, heavy heart, wild growth, triage locker). Class boss relics: Breaker 2, Chronist 2, Graft 1. The Graft asked for none; Triage Locker is her best any-class boss.

### 3.7 Shop (5 → 7)

- **Kept**: `shard_writ` (watch), `vial_rack`, `practice_dummy`, `nursery_tray`, `timeline_clamp`.
- **Shard Writ bug** (user report): buying it at a shop did not drop *that* shop's Shard-removal price to 0; only the next shop showed 0. The shop must recompute prices on relic pickup (`modifyShopPrice` is read at stock time). This is an engine/run fix (bugs agent or engine). I'll add the regression test in Phase B: buy Shard Writ, then the same shop's `remove_shard_gold` price is 0.

| id | Name | Text | Values | Why | Profile | Engine |
|---|---|---|---|---|---|---|
| `salvagers_licence` | Salvager's Licence | **After you win an elite combat, the card reward also offers a colourless card.** | — | Colourless combo glue (Reserve, Salvage, Strain, Reprise cards) is shop-only today. This makes the shared engines draftable, and it's the economy relic for Johnny. | J/S | H8 (`extraColorlessOffer`) |
| `assay_scale` | Assay Scale | **At shops, you can sell a Shard for 40 gold or buy one for 70 gold (once each per visit).** | `{ sell: 40, buy: 70 }` | Shards ↔ gold. A rich run buys deck surgery; a poor one cashes its skips in for a relic. Spike's analyst relic. *Optional: cut if the engine budget is tight.* | S | H14 (shop actions `shop_trade_shard`) |

### 3.8 Event (4)

`oracle_pebble`, `engine_tooth` and `shard_debt` are kept. `crown_fragment` (OP #3): "Whenever you win a combat within 3 turns, gain 1 Shard **(at most 2 per act)**." Values `{ turns: 3, shards: 1, per_act: 2 }`; the counter resets on `onActStart`. Events are owned by the events designer, so no new event relics here.

### 3.9 Relic coverage after v2

| Engine / mechanic | v1 relics | v2 relics (new or reworked in **bold**) |
|---|---|---|
| Strain (Redline) | 0 | **field_dressing, scar_engine, blood_rivets, blood_mulch, borrowed_time** |
| Scrap / Salvage | 0 (Prune only) | **spare_fuse, reclamation_ledger, ash_wick, undertow_reliquary, triage_locker, gravity_loom, husk_sac** |
| Reserve / X | 0 | **reserve_coil, momentum_flywheel**, orbital_hammer |
| Reprise | 0 | **echo_bell, orbital_hammer, refrain_pin** |
| Powers | 0 | **antenna_wire, overture_engine** |
| Status-card fuel | 2 | scrap_magnet, wild_growth, **static_choir, husk_sac** (Chaff) |
| Status applied to enemies (Goad, Exposed, Rot) | 0 | **spite_needle, whetstone, storm_lantern, seers_veil, star_pip, festering_lens** |
| Stagger | 4 | + **kickback_governor** |
| Shards / economy | 12 | + **ascendant_prism, assay_scale, reclamation_ledger, salvagers_licence** |
| Class asks (Embers, Shed, Ripe, Harvest, Chaff, Crescendo, Timeline batch) | — | **coal_scuttle, slag_bucket, twin_scabbard, furnace_mantle, husk_sac, reapers_sickle, trellis, astrolabe, conductors_baton, perpetual_calendar** |
| Cross-class reward | 0 | **wanderers_compact, salvagers_licence** |

Psychographic split of the 50 new or reworked relics, by leading profile: Johnny 27 · Spike 17 · Timmy 6. v1's shared relics were nearly all Spike stat value, so v2 tips the new relics toward Johnny on purpose. Timmy is served mainly by the colourless bombs (§4) and the two Reprise rares.

---

## 4. Colourless cards (20 → 35: 21 uncommon / 14 rare)

Pricing follows `docs/cards/colorless.md`: −10% of class rate. Uncommon budget 7.6 d per energy, rare 9 d. Strain N = −1.5 d per HP. Salvage is priced at 50% of face (it needs a Scrapper) unless the card Scraps itself. Reserve 1 = 0.8 energy-equivalent = 5.6 d (it only feeds X). X = X × rate × 1.1. Reprise ≈ the next card's value, priced at 1.5 energy = 11 d.

**Rulings change needed:** ruling 1 (12/8 split) becomes 21/14. This brings the colourless pool to the commandment-14 target of about 30.

### 4.1 Kept (19)
`relay_ping`, `shardfall`, `arc_lattice`, `salvage_kit`, `stress_fracture`, `gyro_jammer`, `ballast_lock`, `jettison_pod`, `overdraft_cell`, `star_survey` (watch), `fault_beacon`, `snare_line`, `cutting_torch`, `clean_manifest`, `salvage_kiln`, `prism_resonance`, `shard_cache`, `mirror_tether`, `grav_clamp`. Any the sim flags as useless get reworked in Phase B with the data.

### 4.2 Cut (1)
`medbay_voucher`: gold → Max HP is a weak, flat trade that never makes a deck. Its slot goes to a Timmy bomb, and its id is retired.

### 4.3 New (16: 15 from this doc + 1 Chronist ask)

| id | Name | Rarity | Type | Cost | Text (base → upgraded) | Engine | Role | Profile | Budget note |
|---|---|---|---|---|---|---|---|---|---|
| `blood_tithe` | Blood Tithe | U | skill | 0 | Strain 2. Draw 2 cards. → Draw 3 | Redline enabler | glue, draw | S | 6 − 3 = 3 d (79%) + fuel; up 6 d |
| `vent_plasma` | Vent Plasma | U | attack | 1 | Strain 2. Deal 9 damage to ALL enemies. → 12 | Redline enabler | AoE | T/S | 9 × 1.6 − 3 = 11.4 (150% of 7.6; the Strain fuel is the point) |
| `scar_tissue` | Scar Tissue | R | power | 1 | Whenever you Strain, gain that much Guard and draw 1 card (at most 2 draws per turn). → Opening | Redline payoff | engine | J | about 2 Strain/turn → 2 Guard + 1 draw ≈ 5 d/turn |
| `last_light` | Last Light | R | attack | 3 | Deal damage equal to twice your missing HP. Scrap. → cost 2 | Redline Timmy | finisher | T | 3 × 9 × 1.35 = 36 d; at 18 missing = 36; at 40 missing = 80 |
| `spare_capacitor` | Spare Capacitor | U | skill | 0 | Gain 3 Guard. Scrap. Salvage: gain 1 energy. → 5 Guard | Scrapheap enabler | 0-cost tempo | S | 3 + 7 ×1.35 Scrap ≈ net 1 energy per combat |
| `shrapnel_charge` | Shrapnel Charge | U | attack | 1 | Deal 8 damage. Salvage: deal 8 damage to ALL enemies. → 10 / 11 | Scrapheap fodder | Prune and Triage fodder | J | 8 + 0.5 × 8 × 1.6 = 14.4 d |
| `black_box` | Black Box | U | skill | 1 (Phase E; was Unplayable) | Scrap. Salvage: gain 1 energy and draw 2 cards. → draw 3 | Scrapheap fodder | pure Johnny | J | Played: a 0-net-energy draw 2. Scrapped by anything else: pure gain (see §13) |
| `strip_for_parts` | Strip for Parts | U | skill | 1 | Scrap up to 2 cards in your hand. Gain 4 Guard for each. → cost 0 | Scrapheap Scrapper (non-Graft) | enabler | S/J | up to 8 Guard + 2 thins + 2 Salvages |
| `scrapheap_colossus` | Scrapheap Colossus | R | attack | 2 | Deal 8 damage, +2 per card in your Scrapheap. → +3 | Scrapheap payoff | finisher | T | at 5 Scrapped: 18 (100% of 18 d); at 12: 32 |
| `burn_bright` | Burn Bright | R | power | 2 | Your cards with Scrap cost 1 less. → cost 1 | Scrapheap rule-breaker | flooder | J | 0-cost Scrap cards stay 0 (costs never go below 0) |
| `arc_discharge` | Arc Discharge | U | attack | X | Deal 5 damage to a random enemy X+1 times. → 6 | Overflow enabler | multi-hit X | J/T | X=3: 20 vs 25 budget (80%), but 4 hits for Exposed and Glass Spurs |
| `capacitor_bank` | Capacitor Bank | U | skill | 1 | Gain 2 Reserve. Draw 1 card. → 3 Reserve | Overflow enabler | banking | S | 2 × 5.6 + 3 = 14 d (184%), dead without X |
| `starfall_lance` | Starfall Lance | R | attack | X | Deal 8 damage to ALL enemies X times. Scrap. → 10 | Overflow Timmy | AoE nuke | T | 12.8X vs 13.4X budget; X=7 (Reserve) → 56 to each |
| `stasis_bolt` | Stasis Bolt | R | attack | X | Delay 1: deal 12 damage X times. → 15 | Overflow + Delay for anyone | single-target nuke | T/J | 12X ≈ 9 × 1.1 × 1.5 Delay = 14.9X (81%), so it's safe on X stamping |
| `encore` | Encore | R | skill | 1 | Your next card this turn has Reprise. Scrap. → cost 0 | Reprise source | multiplier | J/T | worth the next card (≥ 11 d) |
| `bait_flare` | Bait Flare | U | skill | 0 | Apply 3 Goad to an enemy. Draw 1 card. → Draw 2 | Goad for anyone (chronist ask) | a cost that pays with the right partners | J | Goad 3 is a cost of about −3 d on a 1-hit attacker. Its partners: Mirror Tether (damage = intent), the Breaker's Turnabout and Riposte reflects, the Chronist's Storm cards, Star Pip. Uses the Chronist's `goaded` status (registered globally). |

**Psychographics across all 35:**
- Timmy bombs: Shardfall, Mirror Tether, Last Light, Starfall Lance, Stasis Bolt, Scrapheap Colossus.
- Johnny pieces: Salvage Kiln, Prism Resonance, Burn Bright, Encore, Black Box, Shrapnel Charge, Scar Tissue, Capacitor Bank, Clean Manifest, Bait Flare.
- Spike glue: Relay Ping, Salvage Kit, Blood Tithe, Spare Capacitor, Strip for Parts, Cutting Torch, Gyro Jammer, Star Survey.

**Fuse** (`fuse`, special, from Spare Fuse; not in any pool): 0, skill. "Draw 1 card. Scrap. Salvage: gain 2 Guard." No upgrade (special).

**Smoke tests (Phase B):** every card above, base and upgraded, plays in a sandbox combat. Black Box is checked through a Scrap source, and X cards at X = 0, 3 and 7 (Reserve).

---

## 5. Potions (16 → 26)

The 16 existing potions are kept. Rewind Phial and Halt Ampoule are already combo-capable; Charge Cell and Quicksilver are the glue. One text change: **Tempo Draught** becomes "**Quicken 1.**" It is the same `beatOffset` mechanic, now under the Chronist's Quicken keyword (chronist H3), so the potion and her cards read the same.

| id | Name | Rarity | Class | Target | Text | Combo it enables | Engine |
|---|---|---|---|---|---|---|---|
| `pot_echo_draught` | Echo Draught | rare | any | none | Your next card this turn has Reprise. | Doubles a Power's stacks, a finisher, Last Light, or Starfall Lance at full X. | H4 (status `reprise`) |
| `pot_surge_flask` | Surge Flask | uncommon | any | none | Gain 3 Reserve. | An instant +3 X for the X cards. | H3 |
| `pot_blood_ampoule` | Blood Ampoule | uncommon | any | none | Strain 3. Gain 2 energy. | Triggers every Strain payoff, plus tempo. | H1 (counts toward `cap_bonus_energy`) |
| `pot_kiln_salts` | Kiln Salts | uncommon | any | none | Scrap up to 3 cards in your hand. Draw that many cards. | Fires Salvage on demand, clears status cards, triggers Salvage Kiln and Static Choir. | H15 (`scrapped` scale) |
| `pot_fracture_serum` | Fracture Serum | uncommon | any | none | Double the Exposed on ALL enemies. | Exposed, Fracture Engine and multi-hit; the shared-debuff "Catalyst" moment. | per-target amount (H16) |
| `pot_mimic_gel` | Mimic Gel | rare | any | none | Choose a card in your hand. Add a copy of it to your hand. The copy costs 0 this turn and has Scrap. | Copy the nuke (Shardfall, Last Light, a class finisher). It counts toward `cap_to_hand`. | H17 (`copy_card`) |
| `pot_riposte_salts` | Riposte Salts | common | breaker | none | Prime up to 3 Riposte cards from your hand now, beyond your capacity. (breaker ask) | Hold a full rack without ending the turn's options; works with Duelist's Oath and Twin Scabbard. | content: `prime {n: 3}` (exists) |
| `pot_ember_tonic` | Ember Tonic | uncommon | breaker | none | Gain 2 Embers. (breaker ask) | A potion + card combo with Hammerfall and Kindle. | content (status `embers`) |
| `pot_fester_draught` | Fester Draught | uncommon | graft | enemy | Double the Rot on an enemy. | The Graft's Rot spike, then Harvest it. The graft designer's Harvest deliberately isn't Catalyst; this is a one-shot potion, so the class keeps that identity. Capped by the Rot cap (15, Mycelial Net 20, Deep Rot none). | content: `status rot +{status: rot, of: target}` |
| `pot_hourglass_tonic` | Hourglass Tonic | uncommon | chronist | none | Gather, then Advance 1. (chronist ask) | An emergency "fire everything now"; works with Chorus, Astrolabe and Timeline Spool. Counts toward `cap_advance`. | chronist H2 `gather` + `advance {n: 1}` |

Drop distribution stays 65/25/10. The uncommon pool grows most (4 new any-class, plus 3 class), which is where combo potions belong. Common potions stay simple.

---

## 6. Combo catalogue (35 intended combos)

The sim's tagged-combo telemetry can track these by tag pair (Phase B adds `tags` such as `strain`, `salvage`, `reserve`, `reprise`, `x_cost`, `scrap_flood`).

| # | Combo | Kind | Why it's fun |
|---|---|---|---|
| 1 | **Triage Locker + Black Box + Salvage Kiln** | boss + card + card | Every turn you keep your best 2. The Black Box you couldn't play Scraps for next turn's energy and draw, and each Scrap Exposes the pack. Your junk becomes your engine. |
| 2 | **Undertow Reliquary + Shardfall** | relic + card | Your one-shot nuke comes back after the first reshuffle: two 30-damage Shardfalls in a boss fight. |
| 3 | **Burn Bright + Spare Capacitor + Overdraft Cell** | card + card + card | Scrap cards cost nothing and refund energy. Energy-positive turns until `cap_bonus_energy` says stop. Johnny finds the ceiling. |
| 4 | **Reserve Coil + Starfall Lance** | relic + card | Two quiet turns, then X = 7 at every enemy. The textbook Ice Cream Timmy turn, on our own rule. |
| 5 | **Orbital Hammer + Reserve Coil + Arc Discharge** | relic + relic + card | X climbs past 3, so the card resolves twice: (X+1) × 2 hits. With Fracture Engine each hit gets ×2 Exposed. |
| 6 | **Echo Bell + any finisher** | relic + card | Dump the hand in the right order and your last card hits twice. The puzzle is the order. |
| 7 | **Scar Engine + Blood Tithe + Glass Spurs** | relic + card + relic | 0 energy: Strain → Exposed on everyone → draw into multi-hits. HP becomes a pack-clearing debuff. |
| 8 | **Blood Mulch + Blood Tithe** (Graft) | relic + card | Pay 2 HP a turn and a Bloom card grows forever. Rupture's permanent scaling, in the Graft's language. |
| 9 | **Blood Rivets + Bastion Core** (Breaker) | relic + relic | Strain 2 → 4 Guard → half of it is dealt as damage when it decays. HP turns into Guard turns into damage. |
| 10 | **Borrowed Time + Vent Plasma** (Chronist) | relic + card | One AoE pulls a Delay 2 strike into this turn. Pay HP to land your planned turn early. |
| 11 | **Last Light + Field Dressing** | card + relic | Bleed down with Strain to nuke for 80, then heal half the Strain back after the fight. Timmy with a seatbelt. |
| 12 | **Kickback Governor + Gyro Jammer** vs a 5×4 attacker | relic + card | 3 Stagger cuts each hit by 3, and the 15 prevented damage goes back at the enemy. Multi-hit enemies kill themselves. |
| 13 | **Kickback Governor + Concussion Gas** | relic + potion | The same against a whole pack, for one potion. |
| 14 | **Wild Growth + Static Choir + Prune** (Graft) | boss + relic + class | The Tangles that clog you are 3 AoE each when Pruned. The drawback becomes ammunition. |
| 15 | **Cracked Hourglass + Timeline Spool / Clamp** | boss + relic | Every turn's lead card becomes a Timeline resolution, so the Chronist's payoffs fire on cards that never had Delay. |
| 16 | **Ascendant Prism + Shardfall + Prism Resonance** | boss + card + card | Hold 5+ Shards for energy, and they also fuel Shardfall damage and Guard each turn. Do you Purge or hoard? A Spike dilemma every rest site. |
| 17 | **Wanderer's Compact + Fracture Engine** | boss + relic | Draft every class's multi-hit Attacks into one Exposed deck: a cross-class build no single pool can make. |
| 18 | **Echo Draught + a Power** (e.g. Cinder Heart, Prism Resonance) | potion + card | Double stacks, permanently for that fight. Johnny's best potion turn. |
| 19 | **Fracture Serum + Arc Discharge** | potion + card | 3 Exposed becomes 6, then 4+ random hits at +6 each (+12 with Fracture Engine). |
| 20 | **Kiln Salts + Shrapnel Charge + Black Box** | potion + card + card | Mid-turn Salvage burst: AoE, energy and draw from one potion. |
| 21 | **Mimic Gel + Last Light** | potion + card | Two nukes from missing HP in one turn. |
| 22 | **Gravity Loom + Salvage cards** | boss + cards | The random end-of-turn Scrap usually hits a card you couldn't play, which is now an upside. It turns the boss drawback into a draft plan. |
| 23 | **Stasis Engine + Orbital Hammer** | boss + relic | Draw 4, but your 3-costs resolve twice: the dense-deck dream. |
| 24 | **Momentum Flywheel + Arc Discharge + a Spend-all finisher** (Breaker) | relic + card + class | An X=4 Arc is 5 hits and +4 Onslaught. The finisher spends it the same turn. |
| 25 | **Refrain Pin + Offbeat Drum** (Chronist) | relic + relic | A 0-cost beat card resolves twice, and its on-beat clause runs 3 times (the at-most-3 cap, ruling 28, extended to cover Reprise). |
| 26 | **Spare Fuse + Salvage Kiln + Reclamation Ledger** | relic + card + relic | Turn 1, every fight: a free Scrap that Exposes and banks a Shard charge. The Scrap deck comes online immediately. |
| 27 | **Bait Flare + Mirror Tether** | card + card (colourless, any class) | Goad 3 on a 4-hit enemy adds 12 to its intent, and Mirror Tether deals the inflated number back. You choose to make the enemy scarier, for value. |
| 28 | **Husk Sac + Static Choir + Grafting Knife** (Graft) | relic + relic + relic | Each Prune makes a Chaff. Pruning the Chaff is +2 Bloom and 3 AoE. Fodder that hurts the enemy and grows the garden. |
| 29 | **Furnace Mantle + Molten Shell + Strip for Parts** (Breaker) | boss + class + card | Guard Sheds every turn into Molten Shell damage, and Strip for Parts banks 8 Guard to Shed. The Bastion engine without the bank. |
| 30 | **Twin Scabbard + Duelist's Oath** (Breaker) | relic + relic | Each primed card fires twice, and every fire adds another Riposte card. The rack refills itself against packs. |
| 31 | **Astrolabe + Hourglass Tonic + Timeline Spool** (Chronist) | relic + potion + relic | Gather the Timeline, Advance it: 3+ resolve together for energy, and Spool hits on each. |
| 32 | **Ash Wick + Clear-Cut** (Graft) | relic + class | One Prune Scraps three cards: +1 energy, three Bloom gains, three `onPrune` payoffs. |
| 33 | **Festering Lens + Whetstone + Scar Engine** | relic + relic + relic | Strain → 2 Exposed on everyone → every Rot tick loses 2 more HP. Shared debuffs feed the Graft's clock. |
| 34 | **Whetstone + Spite Needle + Fault Dust** | relic + relic + potion | 4 Exposed to every enemy plus a hit on each. Small-status decks get chip damage out of every application. |
| 35 | **Gyre Spindle + Echo Bell** | relic + relic | Play your last card: it resolves twice *and* you draw 2, so the chain continues. The Clockwork Chronist's long turn, for any class. |

Infinite check: every loop above hits a GDD §3 cap or Reprise's at-most-2 rule. Burn Bright + Undertow + Spare Capacitor is bounded by `cap_bonus_energy` (4) and the one Undertow return. Triage + Black Box draws are bounded by `cap_draw`. Nothing loops from uncommons alone (commandment 17): every engine above needs a rare or boss piece to multiply.

---

## 7. Engine hooks needed (precise)

Each is the narrowest addition. "Owner" is who writes it: me in Phase B unless it touches shared files, in which case I name the file. Shared files touched: `src/engine/types.ts`, `effects.ts`, `combat.ts`, `text.ts`, `run.ts`, `damage.ts`, `timeline.ts`, `riposte.ts` (H20), `tuning.ts` (`caps.reserve`), plus a one-line relic read in `src/content/statuses.ts` (Festering Lens, the Rot Censer pattern).

| # | Hook | Exact spec | Used by |
|---|---|---|---|
| H1 | **Strain** | **Effect** `{ type: 'strain'; amount: Amount; key?: string }` = `lose_hp` on the player with the `strain` flag.<br>**Card rule**: a card whose effects contain `strain` at top level is unplayable when `hp ≤ amount` (canPlay reason "not enough HP").<br>**Hook info**: `onHpLost` info gains `strain: boolean`. New event hook `onStrain: { amount: number }` fires after the HP loss, on player statuses then relics.<br>**Counter**: `combat.counters.strained` (+= amount; engine-owned).<br>**Scale**: `strained_this_combat`.<br>Tender Plating and `modifyHpLoss` do not apply; `modifyHpLoss` is hit-only. | Field Dressing, Scar Engine, Blood Rivets, Blood Mulch, Borrowed Time, Scar Tissue, Blood Tithe, Vent Plasma, Blood Ampoule |
| H2 | **Salvage** | **Card def**: `CardDef.salvage?: Effect[]`; `upgrade` may replace it.<br>**When it fires**: whenever a combat card instance enters the Scrapheap (`exhaust` zone), from any source (Scrap keyword, Prune, `exhaust` effects, Triage Locker, Gravity Loom), the engine queues its `salvage` effects with frame `{src: card, self: 'player', target: null}`. Single-target effects inside Salvage use `random_enemy`.<br>**Not a play.** It doesn't fire for played Powers (ruling 5) or at combat end.<br>**Outside the action phase** (player turn-end steps, enemy phase): the effects are stored in `combat.deferredSalvage: {uid, cardId, upgraded}[]` and run at the next player turn start, after Timeline resolution (step 5) and before the draw (step 6).<br>**Caps**: energy and draw count toward caps as usual.<br>**Text**: `text.ts` walks `salvage` after `delay.effects`. Give values explicit keys (`sdamage`, `senergy`, `sdraw`, `sguard`). | Spare Capacitor, Shrapnel Charge, Black Box, Fuse |
| H3 | **Reserve** | **Status**: `reserve` (player; amount; `decay: never`; cap `TUNING.caps.reserve = 5`, shown via `{reserve_cap}`).<br>**X**: when an X-cost card is paid, `X = energy spent + reserve`, then `reserve → 0` (event `status` delta). Reserve is not energy: it does not count toward `cap_bonus_energy` and does not refill.<br>`TimelineEntry.x` stamps the combined X. | Reserve Coil, Capacitor Bank, Surge Flask, all X cards |
| H4 | **Reprise** | **Status**: `reprise` (player; amount; `decay: end_player_turn`, `decayBy: all`).<br>**Relic hook**: `grantsReprise?(ctx, info: CardPlayedInfo) → boolean` (OR over relics).<br>**When a card is played**: it has Reprise if any relic grants it, else if `reprise ≥ 1`. The status is used up only when no relic granted Reprise.<br>**Resolution**: after the card's `effects` finish and before `finish_card`, they are queued again with the same frame (target, `x`, `onBeat`). If the target died, the second run targets the leftmost living enemy; if none is alive, it is skipped.<br>**Max 2 resolutions per play.**<br>**Not a second play**: no Cadence count, no Onslaught, no `onCardPlayed`.<br>**Delay cards**: only the immediate `effects` repeat; the Timeline entry is single.<br>**On-beat clauses**: at most 3 runs per play in total (ruling 28 extended). | Echo Bell, Orbital Hammer, Refrain Pin, Encore, Echo Draught |
| H5 | **Stagger prevented** | `DamageResult.staggerPrevented: number` = the part of step 4's reduction due to the attacker's Stagger: `min(attacker.stagger, max(0, d3 + exposed + backlash + takenFlat))`, where `d3` is the step-3 result. 0 for player-dealt hits. | Kickback Governor |
| H6 | **End-of-turn hand** | Relic event hook `onHandEndOfTurn: NoInfo`, fired at player turn end **step 3** (after priming, before `onTurnEndInHand` card hooks and discard). Hooks may `queue` choices (ruling 21).<br>New effect `{ type: 'keep_choose_scrap_rest'; keep: number }`: a `pendingChoice` "Keep up to N" (min 0, max N, hand cards without Keep), then every other non-Keep card in hand is Scrapped (Salvage fires and is deferred per H2). | Triage Locker, Gravity Loom (`exhaust {from: hand, random: true, n: 1}`, which must skip Keep cards: filter H18) |
| H7 | **Whole-card Timeline entries** (reuses chronist H6) | **Reuse** the Chronist's `TimelineEntry.scheduled: true` (resolution runs `def.effects`, tagged `delayed`). Don't add a second flag.<br>Modifier hook `delayPlay?(ctx, info: CardPlayedInfo) → 0 \| 1 \| 2 \| 3` (max over relics), asked after paying the cost. If > 0 and the card is not a Power and has no `delay`, its effects are skipped now and it becomes a scheduled entry with the stamped target, `x` and `onBeat`.<br>Unlike the Chronist's Schedule, this **was a play**: Cadence and Onslaught count it now (ruling 34).<br>A full Timeline means it resolves normally. Hourglass tracks "first per turn" in `combat.counters`. | Cracked Hourglass |
| H8 | **Reward pools** | Modifier hooks:<br>`cardRewardClasses?(ctx, kind) → ClassId[] \| null`: one card per listed class, each rolled with that screen's rarity odds and pity, no duplicates.<br>`extraColorlessOffer?(ctx, kind) → boolean`: adds one colourless card (uncommon 75 / rare 25) to that screen.<br>Skip Shards are unchanged. | Wanderer's Compact, Salvager's Licence |
| H9 | **Block lost at reset** | `onBlockReset { lost: number }` event hook at player turn start step 1, after Guard halving (or `onGuardDecay` info gains `blockLost`). | Bulwark Rivets |
| H10 | **Fizzle hook** | `onPrimeFizzled { card: CardInstance }` (relics), fired per card at player turn start step 2. | Notched Buckler |
| H11 | **fetch_card select** | `select: 'max_cost'` (printed cost; X counts as 0; ties random on `misc`). | Overture Engine |
| H12 | **CardPlayedInfo** | Add `x: number` and `costPaid: number` (after modifiers; X cards: X). | Orbital Hammer, Momentum Flywheel |
| H13 | **Rest option block** | Modifier `restOptionBlocked?(ctx, id) → string \| null`: a reason string makes the option unavailable, with the reason shown. | Ascendant Prism |
| H14 | **Shop Shard trade** *(optional)* | Modifier `shardTrade?(ctx) → { sell: number; buy: number } \| null`. Shop actions `shop_trade_shard { dir: 'sell' \| 'buy' }`, once each per visit (`ShopState.shardTraded`). `legalActions` lists them only when affordable and under the Shard cap. | Assay Scale |
| H15 | **Scrapped count** | After an `exhaust` effect, the scale `scrapped` (cards actually Scrapped by the previous `exhaust` in the same list) is available to later effects, as `spent` is for `spend_status`. | Strip for Parts, Kiln Salts |
| H16 | **Per-target amounts** (extends chronist H9) | The Chronist adds `damage { perTarget: true }` (the amount is evaluated per hit target). Extend the same flag to `status` effects: `status { target: 'all_enemies', perTarget: true, amount: {status: 'exposed', of: 'target'} }`. | Fracture Serum |
| H17 | **copy_card** | Effect `{ type: 'copy_card'; from: 'hand'; choose: true; costThisTurn?: number; addKeywords?: Keyword[] }`. A combat-only copy appended to the hand; it counts toward `cap_to_hand`. | Mimic Gel |
| H18 | **Keep filter** | `CardFilter.keyword` negation: `notKeyword?: Keyword \| Keyword[]`, used for "not Keep cards" in random hand Scraps. | Gravity Loom |
| H19 | **add_random_card** | Effect `{ type: 'add_random_card'; pool: 'class' \| 'colorless'; filter?: CardFilter; to: 'hand' \| 'draw' \| 'discard'; n?: Amount; costThisTurn?: number }`. Rolls on `misc` from the listing pool (never `special`); it is a combat-only created card and counts toward `cap_to_hand`. If the hand is added to during the enemy phase, the card waits in hand for your turn; the per-turn cap counts against the coming turn. | Twin Scabbard |
| H20 | **Cancel / skip hooks** | `onAttackCancelled { uid }` (relics; fired where the `attack_cancelled` event is emitted) and `onMoveSkipped { uid }` (fired when `halted` consumes a move). The energy "next turn" is a player status `energy_next_turn` (+n at turn start, then removed); it counts toward `cap_bonus_energy`. | Recoil Coil |
| H21 | **Crescendo bonus** | Modifier `beatIndexBonus?(ctx) → number` (sum over relics), added to the `beat_index` scale (chronist H4) only when it is > 0, i.e. only on the beat. | Conductor's Baton |
| H22 | **Timeline destination** | Modifier `timelineDestination?(ctx, entry) → 'discard' \| 'draw_bottom' \| null`, read in `finish_card` for `via: 'timeline'` when the card would go to the discard pile. Scrap still wins. It runs after the Chronist's `recurDelay` (H8), so a recurring card stays on the Timeline. | Perpetual Calendar |

**Class hooks this doc depends on** (built by the class designers; I only consume them):
- breaker H1 `embers`, H3 `shed` / `onGuardShed`;
- graft H2 `ripe` (CardFilter), H3 `onHarvest`, H10 `chaff`;
- chronist H1 `batch` (put it on `onDelayResolved` info too, for Astrolabe), H2 `gather`, H3 `quicken`, H5 `goaded`, H6 `scheduled`, H9 `perTarget`, H10 `onStatusInflicted`.

If one of them slips, the relic that needs it waits; nothing else blocks.

**One consistency rule across designers:** Reprise (H4), the Chronist's Total Eclipse (`timelineResolutions`, clamped to 2) and the Breaker's Answer in Kind (two lists on a fire) all obey **"one card event resolves its effect list at most twice"**. If two sources stack on the same event (Reprise on a card whose Timeline batch is doubled), the engine clamps to 2, and the text for both says "twice", never "again".

Content-only (no engine change): Static Choir, Reclamation Ledger, Ash Wick, Gyre Spindle, Undertow Reliquary, Ghost Lantern, Star Atlas, Ascendant Prism (energy part), Crown Fragment cap, Stim Patch, Antenna Wire, Spare Fuse, Coal Scuttle, Husk Sac, Star Pip (Goad read), Furnace Mantle (given breaker H3), Festering Lens (one-line read in the Rot status), Riposte Salts, Ember Tonic, Fester Draught, Bait Flare, Momentum Flywheel (given H12), Burn Bright (`modifyCardCost` on its status).

**Keyword glossary additions (Phase B, in `src/content/keywords.ts`):** `strain`, `salvage`, `reserve`, `reprise` as in §2. In `effectKeywords`, map `strain` → Strain, `salvage` list → Salvage, X cost + a `reserve` status → Reserve, and `reprise` status / `grantsReprise` → Reprise. `{reserve_cap}` is added to `keywordTextValues()` in `src/engine/text.ts`.

**Tests (Phase B):** one unit test per hook H1–H22. A scripted-combat test per new relic hook. Smoke play for every card, base and upgraded. Regression tests: the Shard Writ price, Reprise never resolving 3 times, the Reserve cap, and deferred Salvage at turn start.

---

## 8. Class designers' "Relic asks"

All three class docs appeared while I was writing (`docs/v2/breaker-design.md` §6, `graft-design.md` §9, `chronist-design.md` §9). Their asks are folded into §3–§5 as follows.

### 8.1 Accepted

| Ask (from) | Where | Change from the ask |
|---|---|---|
| Coal Scuttle (B) | §3.4 uncommon | none |
| Slag Bucket (B) | §3.3 common | none |
| Twin Scabbard (B) | §3.5 rare | none (needs H19 `add_random_card`) |
| Furnace Mantle (B) | §3.6 boss | none |
| Whetstone (B, any) | §3.4 uncommon | none |
| Recoil Coil (B, any) | §3.5 rare | **also triggers on a skipped (Halted) move**, so non-Breakers can use it. My Stagger reflector was renamed Kickback Governor to avoid two "Recoil" relics. |
| Riposte Salts, Ember Tonic (B potions) | §5 | Riposte Salts **replaces** my Riposte Oil (same job, better numbers) |
| Husk Sac, Reaper's Sickle, Trellis (G) | §3.4 / §3.5 | none |
| Ash Wick (G, shared) | §3.4 uncommon | none |
| Festering Lens (G, shared) | §3.5 rare | made **Graft-only** (only the Graft applies Rot; as an any-class relic it is a dead drop for two classes) |
| Astrolabe, Conductor's Baton, Storm Lantern, Perpetual Calendar (C) | §3.3–§3.6 | none (Astrolabe needs `batch` on `onDelayResolved`) |
| Hourglass Tonic (C potion) | §5 | **replaces** my Sand Vial (Advance 1 alone) |
| Star Pip and Seer's Veil reworks (C) | §3.3 | taken as written (Star Pip stays on the watch list) |
| "Empty hand → draw" relic (C) | §3.4 **Gyre Spindle** | once per turn, on playing your last card (not Unceasing Top's every-time trigger) |
| "On status applied by you" relic (C) | §3.3 **Spite Needle** | as asked: 1 damage per application |
| Colourless Goad card (C) | §4.3 **Bait Flare** | one card (they asked for 1–2) |
| Tempo Draught → Quicken | §5 | text only |

### 8.2 Declined or deferred
- **Bellows Ring** (B, shop, marked optional by the Breaker): deferred. The shop pool is already 7, and Furnace Mantle / Coal Scuttle cover the Furnace engine.
- **Seed Vault** (my own Graft bridge): moved to the reserve list to make room for the Graft's three asks.
- **Graft's question on Chaff as a Status** (graft-design §11 Q4): from the shared side, yes. It makes Scrap Magnet, Static Choir and Grafting Knife combos that cross types, which is what the brief asks for. I changed Static Choir to fire on **Scrap only** and left Scrap Magnet as it is, so a Chaff triggers each of them once, not twice.

### 8.3 If 109 relics is too many: trim list (no engine loses a piece)
`assay_scale`, `spite_needle`, `pocket_star_chart`, `overwatch_drone`, `stim_patch`, `star_atlas` (rework), `gyre_spindle` (Echo Bell covers the ordering puzzle), `reclamation_ledger`. Cutting all 8 gives 101.

### 8.4 Cross-designer notes
- **Strain vs Goad.** Both are "Rupture-shaped". Strain risks *your* HP for your scaling; Goad (Chronist) raises *the enemy's* hit for your payoffs. They don't overlap, and they combine: Bait Flare + Strain decks have no anti-synergy.
- **Kickback Governor fights Goad** (it wants enemies Staggered; Goad wants them hitting hard). The Chronist designer flagged Stagger as a deliberate draft tension, and this keeps it.
- **Reprise / Total Eclipse / Answer in Kind** share the "at most twice" rule (§7).
- **Cracked Hourglass** reuses the Chronist's `scheduled` Timeline entries (§7 H7) rather than adding a second flag.

## 9. Open questions for the lead

1. **Colourless split** 21 uncommon / 14 rare (ruling 1 said 12/8). Also: should shops stock 3 colourless (1U + 1R + 1 any) instead of 2, so the shared engines are reachable? Salvager's Licence is the relic route, and this would be the baseline route.
2. **Strain lethality**: my spec forbids playing a Strain card that would drop you to 0 HP (unplayable, reason shown). The alternative is STS's "you can kill yourself". I prefer the guard rail for readability.
3. **Deferred Salvage** (H2) adds a small piece of combat state. The alternative is "Salvage outside your turn does nothing", which is simpler but makes Triage Locker + Black Box dead. I recommend deferral.
4. **Assay Scale** (H14) is optional; cut it if engine time is short.
5. **Ruling needed: Reprise and Onslaught "Spend all"**. The second resolution of a Spend-all finisher sees the Onslaught left after the first (usually 0, so it runs with `spent` = 0, ruling 33). This is intended: it teaches "Reprise your *build* card, not your finisher", but it should be a ruling so designers price it.

---

## 10. Phase B status (implemented 2026-10-30)

Implemented as specified, with these deviations:
- **Rulings 60–65 applied.**
  - The §8.3 trim leaves **101 relics**. `stim_patch`, `pocket_star_chart`, `overwatch_drone` and `star_atlas` are cut; `spite_needle`, `gyre_spindle`, `reclamation_ledger` and `assay_scale` were not added.
  - `TUNING.shopColorless = 3`. Extra slots roll rare at `TUNING.shop.colorlessExtraRarePct`.
  - Strain floors at 1 HP.
  - Off-turn Salvage goes through the existing next-turn bank: Salvage draw and energy during the turn-end steps are marked `nextTurn`, and in the enemy phase they bank by themselves.
  - Reprise is capped at 2 resolutions (`TUNING.caps.reprise`).
- **Held for `docs/balance/report-v2-baseline.md`** (rulings 55 and 60): the OP-suspect retunes.
  - `notched_buckler`, `star_pip` (including the Chronist's Goad retheme), `ghost_lantern` and `crown_fragment` are unchanged. The engine hook for the Buckler rework, `onPrimeFizzled`, is in place.
  - The `medbay_voucher` cut is also held, so colourless is 21 uncommon / 15 rare until that cut.
- **Text changes for the glossary test:**
  - Twin Scabbard reads "a random Riposte card from your class".
  - Cracked Hourglass reads "gets Delay 1".
  - Momentum Flywheel reads "gives Onslaught equal to its X".
- **Design changes:**
  - **Astrolabe** pays "the first time each turn" 3+ cards resolve together. Total Eclipse's double resolutions would make a per-batch count fragile.
  - **Mimic Gel**'s copy costs 0 this turn but does not gain Scrap (cards have no per-instance keywords). It is a combat-only created card.
  - **Wanderer's Compact** offers your class plus the other listed real classes. A dev or test class only counts when it is yours.
- **Shared files touched:**
  - `src/engine/` files: `types.ts`, `tuning.ts`, `effects.ts`, `combat.ts`, `cards.ts`, `damage.ts`, `queue.ts`, `riposte.ts`, `run.ts`, `validate.ts`, `text.ts` (minimal).
  - `src/content/` files: `keywords.ts` (my four entries plus mappings), `statuses.ts` (the Festering Lens read in Rot), `events.ts` (`stasis_bolt` in the Oracle's timing roster).
  - Sim files `sim/policies/lib/cards.ts` and `sim/policies/lib/choices.ts` (cases for the new scales, effects and choices).
  - Tests: `tests/content/smoke.test.ts` (cases for the new hooks).

---

## 11. Phase C changes (data: `docs/balance/report-v2-baseline.md`, floor-1 grant Δwin, paired seeds, ±6 pooled)

The data measures **v1** content. Targets: no non-boss relic above +12, no relic below −8.

| Item | Data (v1) | Change | Reasoning |
|---|---|---|---|
| Cracked Hourglass (boss) | −33.8 (Chronist −45) | Already reworked in Phase B. Now **Attacks only**: "the first Attack you play each turn gets Delay 1". | The v1 version (enemies act first) was the trap. The Phase B version could still delay your first *defence* card into next turn, which is exactly what the report warns about. Delaying only Attacks means defence always lands now, and in steady state you still deal one Attack's worth per turn, one turn late. The cost is about one Attack per fight, plus the delayed hit reads Onslaught at resolution, against +1 energy every turn. |
| Exposed Core (boss) | −23.8 | **+1 energy. At the end of your turn, gain 1 Exposed for each card left in your hand (not Keep cards).** | Exposed decays at your turn end, so N cards left means N − 1 Exposed through the enemy turn. Emptying your hand (greed) costs nothing; hoarding (turtle) pays. This lines up with "keep greed paying off". |
| Heavy Heart (Breaker boss) | −20.0 | **+1 energy added**; the halving carry-over and "can't prime" stay. | Losing Riposte outweighed the carry-over. The energy relics measure −7 to +3 with their drawbacks, so +1 energy is worth about +20, which brings this to roughly even: a real swing-or-duel choice. |
| Gravity Loom (boss) | +21.8 (v1: +2 draw, hand 7) | Draw **+2 → +1**; the Phase B random end-of-turn Scrap stays. | The report notes the Scrap rarely bites a bot that empties its hand, so the draw was the whole value. This is the report's own lever (one less draw), with the Scrap left as a small extra cost. |
| Star Pip (Chronist common) | +16.0, ~60 triggers/run | Block per enemy **3 → 2** (−33%), still a common. | A linear estimate puts it at about +10.7, under +12. The Chronist's Goad retheme isn't applied; it stays a v1-shaped relic until the Goad engine is measured. |
| Geode Heart, Heartwood Ring, Stormbreak Gem, Mycelial Net | +10.7, +10.7, +10.7, +10.0 | **Unchanged (watch)**. | All under +12 and within ±6 of each other. Geode is Chronist +15 / Graft +14 per class (±9–10); re-measure before trimming. |
| Crown Fragment, Ghost Lantern, Binding Contract, Hairline Saw, Notched Buckler | +3.3, −2.9, +0.5, −2.4, +6.0 | **Unchanged.** | Survivorship bias, as measured. |
| Crystal Spine + Shard Loupe | no measurable effect | **Merged** into Shard Loupe (Purge costs 1 Shard; first rest-site Transmute each act free). Crystal Spine cut: 100 relics. | Two thin rest-site relics become one with a role. |
| Shard Crucible | no effect | + "Whenever you Rest, gain 1 Shard." | Pays even if you never Purge (Shards feed Geode Heart, Shardfall, Prism Resonance and shop removal). |
| Slow-Temper Alloy | no effect | + "At the start of each combat, gain 6 Guard." | Any class gets a bank to slow-decay from turn 1. |
| Vial Rack | no effect | + "At the start of each act, gain a random potion." | The extra slot fills. |
| Fracture Engine | no effect | + "Enemies enter combat with 2 Exposed." | It brings its own fuel (+4 per hit on turn 1 at 2 per stack). |
| Duelist's Oath | no effect | + "You can prime 1 additional Riposte card." | One primed card rarely meets two attacks. |
| Metronome Heart | no effect (a 12th card is almost never reached) | Now "the 2nd card you play is on the beat instead of the 3rd". | The first beat every turn comes sooner. Beats are still capped at 3 per turn. |
| Ascendant Prism | no effect (v1 version) | Already reworked in Phase B (Shards ≥ 5 → +1 energy; no Purge/Transmute). | v1 data doesn't apply. |
| Stress Fracture (colourless) | −10.7 | "Strain 2. Apply 4 (5) Exposed." | The self-Exposed was the trap; the cost is now HP, which feeds the Redline engine. |
| Salvage Kiln (colourless power) | −9.0 | "Whenever a card is Scrapped, deal 3 damage to a random enemy." | 1 Exposed per Scrap was too small to matter. |
| Shard Cache (colourless) | −6.0, 0.07 plays/draw, crashed | Plain DSL: energy 2, remove itself, Shards gated on the removal (`removed_self`), Scrap. | Fixes the "missing finished copy" crash (custom finish-card splice removed). |
| Fault Beacon (colourless) | −5.7 | "Apply 2 (3) Exposed to ALL enemies. Delay 1: apply 2 (3) more." | It now pays on the turn you play it. |
| Cutting Torch (colourless) | −5.0, never played | No Max HP cost: "Remove a card in your hand from your deck. Scrap." (cost 1 → 0 upgraded). | Removal shares `cap_prune_away` (RULINGS 7). |
| Medbay Voucher | — | **Cut** (ruling 60); removed from `ev_assembly_line`'s tool list. | Colourless is now 21 uncommon / 14 rare. |

Relics still below −8 or near it: Hollow Bough −8.0 ±9 and Star Atlas −9.0, which was cut in Phase B. Hollow Bough is left as is: its interval spans 0, and the likely cause is the bot's Prune-away answers.

---

## 12. Phase D changes (data: `docs/balance/report-v2.md` §4, notes-v2 fix items 2, 4, 8, 9; rulings 67–69)

Validation: paired-seed counterfactual batches on the current tree, `--workers 1`, 50 seeds per arm (`sim/out/v2d/`; summariser `pair.py` in the session scratchpad). At 50 seeds a Δwin half-width is ±15–21 points, so these confirm direction and large shifts, not small ones.

| Item | Before (report-v2, cf Δwin) | Change | After (Phase D batch, Δwin ±95%) |
|---|---|---|---|
| Fixed Star (Chronist boss) | spike takes it 80%; −17.5 for johnny-clockwork | RULINGS 68. "+1 energy each turn. At the end of your turn, if your beat count isn't on a beat, Strain 2." Beat positions are untouched, so Crescendo and Cadence work. The Chronist designer reviewed it and the text uses `beat count`. | spike +2.0 ±17.6; johnny-clockwork: see below |
| Perpetual Calendar (Chronist boss) | +27.4 ±14 ** | The +1 energy is gone; the Timeline recycling is the relic. | +2.0 ±17.6 |
| Refrain Pin (Chronist rare) | +24.1 ±18 ** (89 triggers) | Reprise of the whole card → its on-beat effects trigger twice (the `onBeatRepeats` hook; ruling 28's 3-run cap). | +6.1 ±16.6 |
| Star Pip (Chronist common) | +14.1 ±22, Δprog +4.5 ** | Block per enemy 2 → 1 (it was 3 in v1). | +18.4 ±15.8. Not credible for 1 Block a turn and within noise; flagged for a larger re-measure. |
| Storm Lantern (Chronist common) | −12.6 ±26 | "Whenever you apply Goad to an enemy, gain 3 Block." Extra Goad only raised the damage you took. | +6.2 ±14.8 |
| Exposed Core (boss) | −10.4 ±12 (Chronist −23) | The first card left in hand is free (Exposed for each card *after* the first), and it is **no longer offered to the Chronist** (`excludeClasses`), whose cheap-draw decks always hold cards. | Chronist, before the exclusion: −20.8 ±21. Breaker: see below |
| Exposed Core, Breaker | (v2 Breaker −5 ±23) | same rework | −10.0 ±16.1 (Δfloor +1.3). Borderline; flagged. |
| Fracture Engine (rare) | +19.6 ±10 ** (Breaker +32) | Arrival Exposed 2 → 1. | Breaker +10.0 ±17.0 (Δfloor +4.6) |
| Slow-Temper Alloy (uncommon) | +16.3 ±10 ** (Breaker +19) | Combat-start Guard 6 → 3. | Breaker −4.0 ±14.8 |
| Shard Crucible (rare) | −8.1 ±7 ** (Breaker −15) | Purge-only side action (a side-action Transmute is a coin flip on deck quality); the "Rest gives 1 Shard" clause becomes "each skipped card reward gives 1 more Shard". | Breaker −4.0 ±9.6 |
| Heavy Heart (Breaker boss) | −14.5 ±25 | The drawback moves from "can't prime Riposte" (it switched off Counter, the best Breaker engine) to "your Guard is lost at your turn start" (it switches off Bastion, the stall engine). | With +1 energy: +24.0 ±15.4, overshot, so the energy is removed. Without it: **−6.0 ±15.2** (50 seeds). |
| Fixed Star under johnny-clockwork | −17.5 ±10.3 | see the Fixed Star row above | +2.0 ±19.0 (50 seeds) |
| Gravity Loom (boss) | turtle stalemate (`v2-10-breaker`, floor 39): every Attack Scrapped | At most 3 Scraps per combat. | test only |
| Cutting Torch (colourless rare) | never played (0.02 plays/draw) | Now an attack: "Deal 9 (12) damage. Remove a Curse in your hand from your deck." | not re-measured |
| Colourless in card rewards (RULINGS 69) | colourless shop-only; shared engines 0% assembled | `TUNING.rewardColorlessChance` (default 0.12, elite 0.25): one class card becomes a colourless card of the same rarity roll (a common slot → uncommon), on the `reward` stream. Fixed-rarity screens (Void Compass) don't roll. The reward state shape is unchanged, so no save bump. | Chronist johnny, 40 runs each, at 0.12 / 0.25. Pieces drafted: Redline 8/40, Scrapheap 4/40, Overflow 1/40, Reprise 0/40. **Assembled 0/40 everywhere.** At 0.4 / 0.6 (`--set`): pieces Overflow 13/40, Redline 12/40, Scrapheap 5/40, Reprise 0/40; still 0/40 assembled. The sim counts an engine as assembled by deck cards only, and the shared engines have 1–6 colourless cards each (Reprise has only Encore), so assembly through rewards is close to unreachable at any rate. Lead decision: engine-aware colourless rolls, or count relics toward shared-engine assembly. |

Left as is:
- **Twin Scabbard**: the Breaker designer's.
- **Coal Scuttle** (+15.5 ±20), **Stormbreak Gem** (+15), **Slag Bucket**, **Bastion Core** and **Parry Charm** (+12): at or near the line, not significant at 30 seeds; on watch.

**Measurement provenance.**
- All batches ran with `npx tsx` from the repo root on the live tree, one worker, while other agents edited, so each batch measured slightly different content:
  - batches A and B predate the hash log line;
  - Fixed Star under johnny-clockwork: src/ `2707e155a8b4653d`;
  - shared-engine johnnies at 0.12: `03bdfeb0a7237974`; at 0.4: `d762febf94831f9a`;
  - Heavy Heart re-measure: `c4aaf4389b6dcc21`.
- Every result is paired within its own batch, so the Δs are internally consistent; batches don't compare to each other or to the canonical spike numbers.
- Prior files (sha256, first 16 hex chars): `v2-priors.json` `eb1898ba2112aeeb`, `v2-baseline-priors.json` `f31bca429f34b1d5`.
- The bundle was rebuilt afterwards at `d762febf94831f9a`.

### 12.1 Ruling 70: engine-biased colourless rolls, and relics count toward assembly

- **Engine:** `TUNING.colorlessEngineBias` = 0.5 (`src/engine/run.ts`, `startedSharedEngines`).
  - When a card reward rolls a colourless card, it picks from colourless cards of shared engines you've started (you own one of the engine's cards or relics) with that chance; otherwise uniform. The roll is on the `reward` stream.
  - Tests: `tests/engine/shared-v2.test.ts`.
- **Sim:** assembly counts owned engine relics with their `role:*` tag (`sim/policies/lib/engines.ts`, `sim/run.ts`; test in `tests/sim/matrix.test.ts`). The engine relics now carry `role:*` tags:
  - multipliers: Reserve Coil, Echo Bell, Orbital Hammer, Undertow Reliquary;
  - payoffs: Scar Engine, Ash Wick;
  - enabler: Spare Fuse;
  - bridges: Blood Rivets, Blood Mulch, Borrowed Time, Momentum Flywheel.

**Re-run** (Chronist, 40 runs each, `--workers 1`, rebuilt bundle, src/ `489ecd02a032a1f5`, priors `eb1898ba2112aeeb` / `f31bca429f34b1d5`):

| johnny | win | got a piece (before bias → now) | assembled | engine cards offered / run | colourless picked / run | colourless bought / run |
|---|---|---|---|---|---|---|
| redline | 45% | 8 → 24 / 40 | 0 / 40 | 0.70 | 0.20 | 0.00 |
| scrapheap | 20% | 4 → 20 / 40 | 0 / 40 | 1.13 | 0.17 | 0.00 |
| overflow | 30% | 1 → 6 / 40 | 0 / 40 | 0.23 | 0.15 | 0.00 |
| reprise | 35% | 0 → 4 / 40 | 0 / 40 | 0.03 | 0.07 | 0.00 |

- At run end every engine holds 0–2 pieces; assembly needs 3.
- **The bottleneck is now the johnny drafter:** it takes about a quarter of the engine cards it is offered and never buys colourless cards in shops. Then comes the offer count: about 1 own-engine offer per run from rewards.
- **Reprise** is offered 0.03 times per run because Encore is its only card.
- **Proposed (not added): "Second Verse"** (colourless uncommon skill, cost 1; `engine:reprise`, `role:enabler`).
  - Text: "Gain 5 (7) Block. If the next card you play this turn costs 2 or more, it has Reprise."
  - A cheaper, conditional Encore that turns the big 2-cost Attacks into Reprise targets: Hammerfall, Culmination, Heartwood Spear, and Starfall Lance or Stasis Bolt at X ≥ 2.
  - It pairs with Orbital Hammer, and it gives the engine a second card, so a Reprise deck can reach 3 pieces (Encore + Second Verse + one relic).
  - Engine: a `reprise_big` player status (next card only, decays at turn end) read by `grantsReprise` when `costPaid >= 2` (X cards: X).

### 12.2 Second Verse and the shop bias (approved follow-ups)

- **Second Verse** (`second_verse`): colourless uncommon skill, cost 1, `engine:reprise` / `role:enabler`.
  - Text: "Gain 5 (7) Block. If the next card you play this turn costs 2 or more, it has Reprise."
  - Its one-turn `reprise_big` status grants Reprise through `grantsReprise` when the next card's paid cost (X cards: X) is 2 or more. That next card uses it up whatever it costs.
  - Ruling 65's two-resolution cap applies; an Encore `reprise` stack is not spent when Second Verse already granted Reprise.
  - Colourless is now 22 uncommon / 14 rare.
- **Shop bias:** each shop colourless slot independently uses `TUNING.colorlessEngineBias` toward a started shared engine (ruling 70, amended).
- Tests: `tests/content/colorless.test.ts` (Second Verse), `tests/engine/shared-v2.test.ts` (shop bias).

## 13. Phase E (ruling 72, last OP relics, Black Box)

All final numbers: 60 paired seeds per class (`cf-<i>-<class>`), `--policy spike`, `--workers 1`, `--difficulty heroic`, bundle rebuilt in a `sim/snapshot.sh` copy and run from it. Priors: v2 sha256 `eb1898ba2112aeeb`, v2-baseline sha256 `f31bca429f34b1d5`. Δwin is paired (relic held from floor 1 minus the baseline on the same seed and class), with a 95% half-width; `**` marks a pooled Δ outside its half-width. Files: `sim/out/shared-e/cf-*.jsonl`. Heroic baselines on these seeds: Breaker 42–43%, Graft 25–27%, Chronist 45–47%.

### 13.1 Ruling 72: the Scrap floor

- `TUNING.caps.scrapFloor = 8`. `exhaustCards` (src/engine/cards.ts) is the one place every Scrap goes through: it Scraps only while the combat deck (draw + discard + hand + in play) stays at 8 or more, and returns the uids it actually Scrapped.
- A blocked card stays where it was. A resolving card that would Scrap itself goes to the discard pile instead. Either way a `text` event names the cards ("Scrap floor: your combat deck can't go below 8 cards (…) not Scrapped.").
- Blocked Scraps don't count: `exhaust … then` (`scale: 'scrapped'`) and `scrapThen` count only real Scraps, and a Prune whose Scrap is blocked is not a Prune (no counter, no `lastPrune`, no `onPrune`, no Bloom).
- No Salvage, `onExhaust` or `onCardExhausted` fires for a blocked card.
- Tests: `tests/engine/shared-v2.test.ts` "ruling 72" (partial block, fully blocked + text, a played Scrap card to discard, the Prune, Triage Locker over 12 turns never below 8).
- Test sandboxes start with 12 cards, so several existing Scrap tests (mine and others') now pad the draw pile with `padDraw` (new in `tests/engine/helpers.ts`).

### 13.2 Retunes (final, Heroic)

| relic | before (Phase D final, ±15) | change | after (pooled) | Breaker | Graft | Chronist | src/ hash |
|---|---|---|---|---|---|---|---|
| Refrain Pin | +21.0 ** | the doubled on-beat effects move from the first beat (3rd play) to the second (6th play) | — | — | — | +6.7 ±13.9 | `6f2b65e761e59075` |
| Slow-Temper Alloy | +18.3 ** | the combat-start 3 Guard is gone; the relic is the slow Guard decay alone | +0.6 ±7.2 | +1.7 | +5.0 | −5.0 | `6f2b65e761e59075` |
| Fracture Engine | +12.8 ** | the arrival 1 Exposed is gone; +2 per Exposed stack on your hits stays | +1.1 ±6.4 | +3.3 | −3.3 | +3.3 | `6f2b65e761e59075` |
| Gravity Loom | +23.9 ** | the end-of-turn Scrap is gone; draw 1 more on the first 2 turns of each combat only (§13.3) | +10.6 ±9.1 ** | +15.0 | +10.0 | +6.7 | `9c9eea790ec3c309` |

- All four are at or under the +12 target. Slow-Temper and Fracture Engine are now near zero alone: they are engine pieces (Guard decks; Exposed decks, mostly Breaker) and no longer free stats.
- Refrain Pin's 6th play takes a Cadence deck to reach: that is the relic's ask now.
- An earlier run of the first three at `--set enemyHpPct.all=110` (Standard damage, src `72b2cd25d8066e8e`) agreed: Refrain +1.7 ±15.8, Slow-Temper +3.3 ±7.2, Fracture +2.8 ±6.3.

### 13.3 Gravity Loom

Ruling 72 alone was not enough. Each version against its own baseline on the same seeds:

| version | setting | pooled Δwin | Breaker | Graft | Chronist |
|---|---|---|---|---|---|
| Phase D: draw +1 each turn; Scrap a random non-Keep card at turn end, at most 3 a combat | HP 110 | +25.0 ±8.4 ** | +15.0 | +38.3 | +21.7 |
| Scrap only an Attack, Skill or Power (still capped) | HP 110 | +27.8 ±9.0 ** | +26.7 | +40.0 | +16.7 |
| no cap (ruling 72's floor instead) | HP 110 | +23.3 ±8.6 ** | +21.7 | +31.7 | +16.7 |
| draw +1 on odd turns only, uncapped Scrap | HP 110 | +12.8 ±9.0 ** | +16.7 | +6.7 | +15.0 |
| same | Heroic | +23.9 ±9.3 ** | +28.3 | +31.7 | +11.7 |
| odd-turn draw, no Scrap | Heroic | +15.0 ±9.1 ** | +10.0 | +26.7 | +8.3 |
| **draw +1 on the first 2 turns of each combat, no Scrap (final)** | Heroic | **+10.6 ±9.1 \*\*** | +15.0 | +10.0 | +6.7 |

("HP 110" is `--set enemyHpPct.all=110` at Standard damage, before `--difficulty` existed.)

- The Scrap was never a cost. It took the weakest card left in hand, so it thinned the combat deck, and Graft's Scrap payoffs made it a bonus. Taking only real cards and removing the cap changed nothing measurable.
- The extra card was the power. Heroic's longer fights made every-other-turn draw worth twice what it was at Standard damage.
- Final text: "On each of the first 2 turns of each combat, draw 1 more card." (`LOOM_V2 = { draw: 1, turns: 2 }`). It keeps "big opening hands" and drops the Scrap. No Gravity Loom run stalemated: every end cause in all Phase E files is victory or defeat.

### 13.4 Black Box

- It was Unplayable, so it was never played. Now it costs 1 and has Scrap: "Scrap. Salvage: gain 1 energy and draw 2 (3) cards."
- Played, it is a draw 2 that refunds its own energy. Scrapped by anything else (Strip for Parts, Prune, Triage Locker, Kiln Salts), it is pure gain, which is the Scrapheap hint.
- Engine bug found on the way: `getCardDef(id, true)` never merged an upgrade's `salvage`, so Black Box+ drew 2 and Shrapnel Charge+ dealt 8. `src/content/registry.ts` now merges it; there's a test.

## 14. Phase F (the shared johnnies, last content round)

Problem (`docs/balance/report-v2-final-e.md`, Heroic): the four shared-engine johnnies were the weakest bots in every class. Scrapheap won 8–18%, and Overflow, Redline and Reprise 13–22%. They assembled 0–2% of the time. The ruling 72 floor stays.

Measurement: `personas-batch.mjs --personas johnny-scrapheap,johnny-overflow,johnny-redline,johnny-reprise --runs 60 --seed-prefix v2 --workers 1 --difficulty heroic`, the same seeds as the report (`v2-0..59` per class), every batch from a fresh `sim/snapshot.sh` with a rebuilt bundle. Priors: v2 `eb1898ba2112aeeb`, v2-baseline `f31bca429f34b1d5`. Files: `sim/out/shared-f1` … `shared-f4`. "Pieces" counts the engine's cards and relics held at run end.

### 14.1 What changed

**Availability (engine, `src/engine/run.ts`, `TUNING.colorlessEngineExtra = 0.3`, `TUNING.rewardMaxCards = 4`).**
- Once you've started a shared engine (ruling 70), 30% of card rewards also offer one colourless card from it.
- The card is added, not swapped for a class card. Its rarity rolls like Salvager's Licence. It doesn't happen on fixed-rarity screens or when the offer already has 4 cards.

**The floor keeps Salvage (engine, `exhaustCards`).** A card the ruling 72 floor keeps still runs its Salvage, since it was spent and just isn't removed. Scrap payoffs that count real Scraps (Salvage Kiln's old trigger, Ash Wick, Static Choir, onExhaust) still don't fire for it.

**Scrapheap**
- Salvage Kiln: "At the end of your turn, deal 1 damage to ALL enemies for each card in your Scrapheap." It was 3 to a random enemy per Scrap. Now it counts the heap, so it keeps paying under the floor.
- Shrapnel Charge: +1 damage per Scrapheap card.
- Scrapheap Colossus: +3 (+4) per heap card, cost 1 (was +2 / +3, cost 2).
- Spare Capacitor: 4 (6) Guard, and its Salvage draws 1 too.
- Strip for Parts: 5 Guard per Scrap (was 4), and it draws 1.
- Black Box: costs 0.

**Overflow**
- Arc Discharge: 6 (7) per hit (was 5 / 6).
- Capacitor Bank: costs 0.

**Redline**
- Blood Tithe: draws 3 (4) (was 2 / 3).
- Vent Plasma: 10 (13) (was 9 / 12; 11 in round 1 overshot).
- Stress Fracture: costs 0.

**Reprise**
- Encore: no longer Scraps itself, and is now uncommon. Colourless is now 23 uncommon / 13 rare.
- Second Verse: 7 (9) Block (was 5 / 7).

**Never picked**
- Shardfall: no Scrap.
- Arc Lattice: 7 + 3 per living enemy (was 4 + 2), upgraded 9 + 3.
- Relay Ping: draws 3 (4); the upgrade adds one Jitter, not two.
- Not changed: Bait Flare (the Graft designer's Phase E change is still being measured), Gyro Jammer, Overdraft Cell. Overdraft Cell is on the report's strongest list; it is rarely picked, not weak.

### 14.2 Shared johnny win rates (Heroic, 60 seeds per class; pooled over 180 runs, about ±6)

| engine | report (before) B / C / G → pooled | f1: availability + Kiln + first buffs | f2: + piece buffs | f3: + Encore uncommon, Black Box 0, Vent 10 | f4: + Colossus 1, Strip draws |
|---|---|---|---|---|---|
| Scrapheap | 8 / 10 / 18 → 12.2 | 11.7 / 5.0 / 10.0 → 8.9 | 16.7 / 18.3 / 18.3 → 17.8 | 15.0 / 15.0 / 20.0 → 16.7 | **20.0 / 23.3 / 23.3 → 22.2** |
| Overflow | 17 / 13 / 22 → 17.2 | 20.0 / 13.3 / 21.7 → 18.3 | 25.0 / 23.3 / 23.3 → 23.9 | **21.7 / 16.7 / 18.3 → 18.9** | — |
| Redline | 20 / 13 / 22 → 18.3 | 20.0 / 13.3 / 25.0 → 19.4 | 31.7 / 38.3 / 28.3 → 32.8 | **25.0 / 25.0 / 25.0 → 25.0** | — |
| Reprise | 15 / 13 / 20 → 16.1 | 13.3 / 16.7 / 21.7 → 17.2 | 11.7 / 28.3 / 23.3 → 21.1 | **13.3 / 26.7 / 26.7 → 22.2** | — |

Hashes: f1 `98f32260ebcb3b21`, f2 `abee21968f1a33ea`, f3 `3409df5ad7f5e028`, f4 `5a0d441988bbfde2`. **Bold** is each engine's current content. Overflow content didn't change between f2 and f3, so its two batches, 360 runs, average **21.4%**.

- Availability alone (f1) didn't move win rates. Pieces held at run end went from about 0.5 to 2–4, but the pieces were no better than the class cards they displaced. The piece buffs are what moved them.
- Reprise on Breaker stays low (12–13%): Breaker has few 2-cost cards for Second Verse, and the engine is still only 2 cards + 2 relics.
- No stalemates in any Phase F batch.

### 14.3 Relic check (counterfactual, `--difficulty heroic`, 60 paired seeds, src `5a0d441988bbfde2`)

These are the engine relics the Phase F rules could push: the extra offer starts with any engine relic, and the floor-Salvage feeds Triage Locker and Spare Fuse. Same-seed baselines: Breaker 53%, Graft 43%, Chronist 38%.

| relic | pooled Δwin | Breaker | Graft | Chronist |
|---|---|---|---|---|
| Triage Locker | +11.7 ±9.6 ** | +6.7 | +10.0 | +18.3 |
| Spare Fuse | +11.1 ±9.3 ** | −5.0 | +10.0 | +28.3 |
| Echo Bell | +7.2 ±10.2 | −3.3 | +5.0 | +20.0 |
| Scar Engine | −2.2 ±8.9 | −13.3 | −1.7 | +8.3 |
| Ash Wick | −6.1 ±9.3 | −28.3 | +3.3 | +6.7 |
| Reserve Coil | −12.2 ±9.7 ** | −28.3 | −15.0 | +6.7 |

- None is over +12. Triage Locker and Spare Fuse are at the edge; leave them unless a later change pushes them.
- Gravity Loom no longer Scraps or Salvages (§13.3), so nothing here touches it.
- **Reserve Coil is a trap for spike, and not because of Phase F.** With the extra offer off (`--set colorlessEngineExtra=0`, Breaker, same seeds), it is still −26.7 ±16.0. Ash Wick moves to −1.7 ±17.7 there, which is inside the noise of its −28.3.
  - The Reserve status only adds to the next X cost and has no hooks, so nothing in the rules makes holding it worse. The planner has no Reserve term either.
  - Cause unknown. It needs a trace of a Breaker run with and without the relic: flagged to the sim agent.
- Gravity Loom stays at the Phase E +10.6.
