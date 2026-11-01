# Chronist v2: engines and card pool (Phase A design)

Status: Phase A design. Nothing in `src/` has changed yet. Phase B implements this file in `src/content/cards/chronist.ts`, after the lead reviews it and the sim's `docs/balance/report-v2-baseline.md` is folded in (§10).

Read with: `docs/v2/BRIEF.md` (framework), `docs/cards/chronist.md` (v1 pool, pricing conventions §0.3), `docs/GDD.md` §2.7–2.9 and §8.5, `docs/RULINGS.md` 24–31.

---

## 0. Diagnosis: why v1 Chronist is flat

From `docs/balance/report-final.md` (1000 greedy runs) and a card-by-card read:

1. **Every class mechanic paid out additively.** "On beat: +3 damage", "Delay 1: ×1.5", "+40% if the forecast says so". No card got better because of another Chronist card, so no deck ever "came online". The only multiplier in the pool, Polyrhythm, was picked 8.4% of the time, because a +3 bonus doubled is still small.
2. **Cadence was starved.** The bot averaged **0.80 beats per turn**. Beat payoffs were small, and nothing helped you reach a beat except more 0-cost cards. So Downbeat (2.2% pick), Detent (2.4%), Upbeat (7.3%), Pinion Jab (7.4%) and Perpetual Motion (4.0%) rotted.
3. **Delay won by raw rate, not by interaction.** The top picks were big Delay numbers (Toll the Hours 88%, Syzygy 80%, Appointed Hour 72%) plus Tide Table (88%), the one card that rewarded *many* resolutions. That is the seed of an engine: the Timeline wants width.
4. **Augury cards were coin flips on "attack or not".** Slack Water, Reef the Sails, Mark the Lull, Batten Down and Culmination all branched on the forecast, then added a few points. Seeing the future didn't let you *build* anything. The good Oracle cards (Heave To 72%, Lighthouse 66%) were the ones that *scaled* with the forecast number.
5. **Dead weight**: Logbook, Reef the Sails, Detent, Parallax, Star Tithe, Dead Reckoning, Wind Forward and Confluence were all under 5% pick. Some of these are reworked here (§4), and the rest are cut.

The v2 answer is four engines. Each has an enabler that makes a resource, a payoff that converts it, and a multiplier or rule-breaker at uncommon or rare. Each grows faster than linearly when assembled.

## 1. Research notes (what the patterns are, not what to copy)

**Rosewater's psychographics.** "Timmy wants to experience something, Johnny wants to express something, Spike plays to prove something." Sub-types worth designing for: *Power-gamer Timmy* (big numbers), *Adrenalin Timmy* (swingy), *Combo Johnny* (hidden interactions), *Offbeat-designer Johnny* (decks built from an idea: "a deck where nothing resolves until turn 5"), *Tuner Spike* (efficiency, ratios), *Nuts-and-bolts Spike* (tight sequencing). Rosewater's advice is that a card should lean hard toward one profile, because a card for everyone pleases no one. Sources: [Timmy, Johnny and Spike Revisited (Wizards, 2006)](https://magic.wizards.com/en/articles/archive/making-magic/timmy-johnny-and-spike-revisited-2006-03-20-2), [revisited, part 2](https://magic.wizards.com/en/articles/archive/making-magic/timmy-johnny-and-spike-revisited-2006-12-18).

**STS engine anatomy** (from play knowledge plus community guides: [Corruption/Dead Branch discussion](https://steamcommunity.com/app/646570/discussions/0/1778262124930086284), [Watcher stance builds](https://fantasywarden.com/games/slay-the-spire-watcher-builds), [Silent poison builds](https://fantasywarden.com/games/slay-the-spire-the-silent-builds), [Defect guide](https://www.highgroundgaming.com/slay-the-spire-defect-guide-tips-builds/)):
- **Ironclad, Corruption + Dead Branch + Feel No Pain/Dark Embrace.** A rule-breaker (Skills cost 0 and Exhaust) turns a side resource (Exhaust count) into the main currency. Every payoff then fires many times per turn, and a relic (Dead Branch) closes the loop. Lesson: **one rule change makes a whole tag of cards count several times over.**
- **Silent, Catalyst + Burst + Well-Laid Plans (+ Runic Pyramid / Nightmare).** A stockpiled resource (Poison) plus a multiplier (Catalyst), plus a doubler (Burst) and a *holding* tool (WLP, Pyramid) to line them up on one turn. Lesson: **multipliers are fun when the player chooses the turn they fire.**
- **Defect, Focus + orbs, Echo Form, Electrodynamics, Claw.** Focus raises every orb's output, Electrodynamics turns single-target into AoE, Echo Form doubles the first card, and Claw grows as you play 0-costs. Lesson: **a per-instance bonus times an instance count is quadratic** (Focus × orbs, Claw × Claws).
- **Watcher, stance dancing, Mantra/Divinity, Blasphemy, Scry.** A cheap toggle (stance change) is the enabler, and Mental Fortress/Rushdown/Flurry pay per toggle. Divinity and Blasphemy are a once-a-fight burst you *plan* toward. Scry is the consistency tool that makes the plan land. Lesson: **give the plan a "big turn" the player can see coming and set up**, and give Spike a filter that makes it reliable.

**Patterns adopted** (shapes, not mechanics): quadratic payoffs (per-instance bonus × instance count), one rule-breaker per engine that reprices a whole tag, a holding or alignment tool so the multiplier lands on a chosen turn, and relic combos that close a loop. Every new mechanic below was checked against `docs/research/sts-design.md` §3.1–3.9 (§7 lists the checks).

---

## 2. The four engines

Engine tags for the sim and the reward heuristic: `conjunction`, `clockwork`, `storm`, `calendar`. The old `timeline`/`metronome`/`oracle` tags are kept alongside, so sim policies keep working (§9).

### 2.1 Conjunction: "everything lands at once" (Timeline width)

**Fantasy.** You stack the Timeline for two turns, then every bell rings on the same turn.

**New pieces.**
- **Chorus +N**: a Delay card's resolution gets +N for each *other* card resolving in the same batch (the same turn start, or the same Advance). N cards each worth +k per other card add k·N·(N−1). That is quadratic, like Focus × orbs.
- **Gather**: every Timeline entry now resolves on the turn of the *latest* one. Gather only ever delays entries, so it can't break `cap_advance`. Advance then pulls the whole gathered stack into the present.

**Pieces.**
- **Enablers:**
  - cheap Delay cards of mixed lengths: Ripple, Almanac, Storm Glass, Tock, Second Hand, Noon Gun, Spring Tide;
  - Gather: Hold the Hour (C), Confluence (U);
  - Schedule (Set the Hour, U), which turns any Attack or Skill into a Timeline entry;
  - Advance to fire the stack: Wind Forward (C), Hasten (U), Escapement (U).
- **Payoffs:**
  - Chorus cards: Ripple, Noon Gun, Afterpeal, Spring Tide (C); Bell Choir, Knell (U); Syzygy (R);
  - per-resolution payoffs: Tide Table (U), Watch Bell (R);
  - Timeline-length payoff: Confluence.
- **Multiplier / rule-breaker:** **Total Eclipse** (R power): when 3 or more cards resolve together, each resolves a second time. Chorus already scales quadratically with the batch, and Eclipse doubles it.

**Worked example.** Floor ~20, Act 2 normal fight (two enemies, ~110 HP total). Deck pieces: Hold the Hour, Ripple, Noon Gun, Bell Choir, Spring Tide, Afterpeal, Almanac, Tide Table (in play). Relic: Timeline Spool.
- **Turn 2.** Spring Tide (due turn 5). Ward, Pulse Shot.
- **Turn 3.** Noon Gun (due 5), Bell Choir (due 4), Ripple (due 4). Then Hold the Hour: Gather → all four are due on turn 5, and +3 Block. 2 energy spent, 1 left for Ward.
- **Turn 4.** Nothing resolves. Afterpeal (4 now, due 5), Almanac (due 5), 2 energy of defence.
- **Turn 5 start.** Six cards resolve together, so each gets Chorus × 5:

| Card | Resolves for |
|---|---|
| Spring Tide | 12 + 2×5 = 22 to ALL |
| Noon Gun | 12 + 3×5 = 27 |
| Bell Choir | 5 + 2×5 = 15 to ALL |
| Ripple | 3 + 2×5 = 13 |
| Afterpeal | 4 + 2×5 = 14 |
| Almanac | draw 2 |
| Tide Table | draw 6 |
| Timeline Spool | 6 × 3 = 18 |

  The main target takes **~91 (+18 Spool) ≈ 109** and the other enemy takes ~37. That kills the fight, and the turn still has its 5-card hand plus 8 draws. Spread over three turns, the same six cards would deal about 60. With **Total Eclipse** in play, the batch resolves twice: **~200** to the main target, plus 12 more draws (capped at 15).
- **Online by:** Hold the Hour + 2 Chorus cards + any Advance, all common, so around floor 10–15. It peaks at floor 20–30 with Bell Choir/Syzygy and Tide Table.
- **Weak to:**
  - burst checks before the stack lands (Act 1 elites);
  - the Act 3 damage-cap boss (GDD §8.3), which blunts one huge turn;
  - enemy Postpone, which shifts the whole stack;
  - fights that end while the stack is still waiting;
  - thin defence on the setup turns, since Gather also delays your Delay Block (Storm Glass, Tock).

### 2.2 Clockwork: "the ninth card" (Cadence chains)

**Fantasy.** A cascade of cheap cards that crescendos into one enormous final strike.

**New pieces.**
- **Quicken N**: add N to this turn's beat count. It never moves backwards, so beat positions stay 3/6/9 and the 3-beat cap holds. Quickening early helps (count 1 → 2, so the next card is on beat 3). Quickening on count 2 skips beat 3 entirely. That is the ordering puzzle.
- **Crescendo**: an On-beat clause that happens once on your 1st beat of the turn, twice on the 2nd and three times on the 3rd (four times on Metronome Heart's 12th). The 9th card is worth three times the 3rd, so the chain itself is the multiplier.

**Pieces.**
- **Enablers:**
  - Quicken: Pinion Jab, Upbeat, Ephemeris (C); Accelerando (U power);
  - 0-cost bodies: Tick, Carillon, Dead Reckoning, Mainspring, Quarter Chime, Whistle for Wind;
  - beat-gated fuel: Tick (draw), Quarter Chime (draw), Mainspring (energy), Tourbillon (energy).
- **Payoffs:**
  - Crescendo cards: Gear Train, Downbeat, Carillon, Balance Wheel (C); Fermata (U, Keep it for beat 9);
  - Zenith (R);
  - beat-count scalers: Culmination (R), Dead Reckoning (C);
  - Striking Train (U power).
- **Multiplier / rule-breaker:**
  - **Polyrhythm** (R, kept): On-beat clauses run twice. Crescendo × Polyrhythm = 6 runs on beat 9.
  - **Perpetual Motion** (R, reworked): cards you play on the beat cost 0. Up to 3 (4) free cards a turn, so you put your 2-cost payoffs on the beats.

**Worked example.** Floor ~20. Pieces: Pinion Jab, Tick+, Upbeat, Mainspring, Gear Train, Downbeat+, Carillon, Polyrhythm (in play). Relic: Chrono Lens. Hand: Pinion Jab, Tick+, Upbeat, Gear Train, Downbeat+. Energy 3.

| # | Card | Count | Result |
|---|---|---|---|
| 1 | Pinion Jab | 1 → Quicken → 2 | 3 damage |
| 2 | Tick+ | 3 (beat 1) | 4 damage. On beat: draw 2, twice (Polyrhythm) = 4, + Lens 1. Draws Mainspring, Carillon, Ward, Ward, Quarter Chime. |
| 3 | Upbeat | 4 → Quicken → 5 | 3 Block |
| 4 | Mainspring | 6 (beat 2) | +1 energy ×2 = +2 (energy 5) |
| 5 | Carillon | 7 | 3 to ALL |
| 6 | Gear Train | 8 | 3 ×2 (energy 4) |
| 7 | Downbeat+ | 9 (beat 3) | 13 + Crescendo 7 × 3 beats × 2 runs = **55** (energy 2) |
| 8–9 | Ward, Ward | 10–11 | 10 Block |

  That is **~71 damage to one target, +3 AoE, and 13 Block** from a starter-energy turn. Without Polyrhythm the same line deals ~45 (Downbeat+ 34). With **Perpetual Motion** instead, Tick, Mainspring and Downbeat cost 0 on their beats, which frees 2 energy for a second Downbeat or more Block.
- **Online by:** 2 Quicken cards + 2 Crescendo cards (commons) and 4–5 zero-cost cards, around floor 12–18. Polyrhythm or Perpetual Motion make it a rare-level engine.
- **Weak to:**
  - the Act 3 play-count punisher boss (GDD §8.3);
  - small hands (Gravity Loom's limit of 7, Stasis Engine);
  - bad draws: no Quicken and no 0-cost cards means no beats;
  - fragile Block, since the payoffs are almost all damage;
  - Fixed Star (only beat 3), which caps Crescendo at ×1. Fixed Star favours Perpetual Motion and Zenith instead.

### 2.3 Storm Reader: "the harder it swings, the harder it falls" (Augury)

**Fantasy.** The Chronist doesn't dodge the storm. She *goads* it, reads its exact size two turns out, and turns its own force back on it. This is the Chronist's Rupture deck: you raise the stakes on purpose, and your payoffs scale with the danger.

**New piece.**
- **Goad N** (an enemy status the player applies): the enemy's hits deal +N during its next turn, then Goad wears off. The current intent shows the bigger number. Goad is **per hit**, so a 4-hit attack gains 4N. Goad multiplies against multi-hit enemies, the same way Exposed does for the player.

**Pieces.**
- **Enablers:**
  - Goad: Whistle for Wind, Red Sky (C); Gathering Storm (U);
  - Augury depth: Prophet Glass makes forecast scales sum two moves;
  - multi-enemy fights, for the `all` scales.
- **Payoffs**, which read intent or forecast damage:
  - offence: Undertow (C); Turn the Tide (U); Reckoning (R);
  - defence: Weather Eye, Storm Glass (C); Heave To, Gathering Storm (U); Seen It Coming, Lighthouse (R).
- **Multiplier / rule-breaker:**
  - **Eye of the Storm** (R power): at the end of your turn, each enemy takes half the damage it intends. Goad inflates the number you reflect.
  - **Squall Line** (U power): whenever you apply Goad, deal 2 damage per Goad to that enemy. The enabler becomes its own payoff.

**Worked example.** Floor ~25, Act 2 elite. Its intent is 4×5 (20); its intent after next is a 30 charge. Seen It Coming was played last turn. Eye of the Storm is in play. Hand: Whistle for Wind, Gathering Storm, Turn the Tide, Reckoning, Ward.
1. **Turn start.** Seen It Coming resolves: Block = the damage it intends = 20.
2. **Whistle for Wind** (0): Goad 3, so the intent is 4×8 = 32. Draw 1.
3. **Gathering Storm** (1): Goad 2 → 4×10 = 40. Block 2 + 20 = 22. Total Block 42, so the 40 is fully blocked.
4. **Turn the Tide** (1): 3 + 30 (the charge after next) = 33.
5. **Reckoning** (1): Delay 1. At the next turn start it deals 2 × the charge = **60**, then Scraps.
6. **End of turn.** Eye of the Storm deals half of 40 = 20.

  This turn deals **53**, and the next turn opens with **60**. You take 0. With Squall Line in play, the two Goads add 10 more. Misplay it (Goad without the Block) and you eat 40: this is the risk/reward the Rupture-style deck needs.
- **Online by:** one Goad + Heave To/Gathering Storm + Turn the Tide is a working shell by floor 10–15 (uncommons). It takes off with Eye of the Storm or Reckoning.
- **Weak to:**
  - enemies that buff, defend or hide their moves ("?" counts as 0);
  - Stagger effects (Concussion Rig, Dampener Coil, colourless Stagger), which shrink your own payoffs. This is a deliberate draft tension;
  - burst damage when you misjudge Goad;
  - HP-loss enemies (Rot, `lose_hp`) that aren't attacks.

### 2.4 Perpetual Calendar: "the same hour, again and again" (Timeline depth)

**Fantasy.** One great card, set in motion once, that keeps coming back. This is the "tall" Timeline, where Conjunction is the "wide" one.

**Pieces.**
- **Rule-breaker:** **Eternal Return** (R power): the first card that resolves from your Timeline each turn goes back on it with Delay 2 instead of to its pile. It keeps its stamps (target, X, on-beat). Scrap cards don't return.
- **Enablers / payloads:**
  - Appointed Hour (34 damage), Banked Hours (energy + draw);
  - Toll the Hours (X hits, and the stamped X recurs!);
  - Knell, Breakwater;
  - Set the Hour (Schedule any card, which then recurs).
- **Payoffs:** Tide Table and Watch Bell (every recurrence is a resolution), Paradox Coil (relic, a second return), Timeline Spool (relic).

**Worked example.** Floor ~25. Eternal Return and Tide Table are in play. Turn 2: Appointed Hour (due 4) and Banked Hours+ (due 3). From then on the first resolution each turn recurs:

| Turn | Resolves | Result |
|---|---|---|
| 3 | Banked Hours+ | +1 energy, draw 3 (+1 Tide Table); returns, due 5 |
| 4 | Appointed Hour | **34**, draw 1; returns, due 6 |
| 5 | Banked Hours+ | |
| 6 | Appointed Hour | |

  The two cards alternate every turn. By turn 8, 3 energy paid once has produced **~102 damage, +3 energy and ~12 cards**, and both cards are permanently out of the draw cycle (deck thinning). Toll the Hours at X=3 recurs as 3 hits ×2 (6 dmg each) every second turn, for free.
- **Online by:** Eternal Return is the rare gate (per brief: a conditional engine needs a rare plus 2 other pieces). Expect it around floor 20–30.
- **Weak to:**
  - short fights (it pays from turn 3 on);
  - Postpone;
  - never drawing the rare;
  - Scrap payloads (Reckoning and Seen It Coming don't recur).

### 2.5 Cross-engine bridges (for Johnny to find)

| Bridge | Pieces | What happens |
|---|---|---|
| Clockwork → Conjunction | Escapement + Gather + any Delay card on the beat | Gather the stack, then put a Delay card down on the beat. Escapement Advances 1 and the whole Chorus batch fires **mid-turn**, and the cards it draws keep your chain going. |
| Clockwork → Conjunction | Perpetual Motion + Syzygy/Appointed Hour on the beat | 2-cost Delay payloads for free. |
| Conjunction → Calendar | Set the Hour (Schedule) | Any Attack/Skill becomes a Timeline entry: +1 Chorus count, a Tide Table draw, and with Eternal Return, a recurring free card. |
| Schedule → Clockwork | Set the Hour + Zenith | A scheduled card ignores "only on the beat": Zenith resolves for free next turn. This is a legal, discoverable loophole. |
| Storm → Calendar | Gathering Storm or Heave To scheduled under Eternal Return | A recurring Goad + Block engine. |
| Storm ↔ Clockwork | Whistle for Wind | A 0-cost cantrip for Clockwork, at the price of Goad, which is only an upside in Storm. "Lenticular": both decks want it for different reasons. |
| Accelerando ×2 | two copies | You start each turn at count 2, so your **first** card is on the beat. |

---

## 3. Timmy / Johnny / Spike coverage

| Profile | What they get | Cards and relics |
|---|---|---|
| **Timmy (power)** | Visible giant numbers on a turn you can see coming | Syzygy (Chorus to ~60), Downbeat on beat 9 (55 with Polyrhythm), Reckoning (2× a boss charge), Total Eclipse (batch twice), Eye of the Storm, Toll the Hours, Culmination, Appointed Hour |
| **Timmy (adrenalin)** | Risk you choose | Goad cards (Whistle for Wind, Red Sky, Gathering Storm), Squall Line |
| **Johnny (combo)** | Rules that reprice a tag; interactions the text hints at | Total Eclipse, Eternal Return, Perpetual Motion, Polyrhythm, Set the Hour (Schedule), Gather × Escapement, Accelerando ×2, Schedule × Zenith |
| **Johnny (offbeat designer)** | Build-from-an-idea decks | "Nothing resolves until turn 5" (Gather), "two cards forever" (Calendar), "make it hit harder" (Storm) |
| **Spike (tuner)** | Efficient, consistent commons; deck thinning; tight choices | Ephemeris, Almanac, Storm Glass, Weather Eye, Hold the Hour, Pinion Jab, Banked Hours, Tide Table, Heave To, Breakwater; Eternal Return thins the deck |
| **Spike (nuts and bolts)** | Sequencing puzzles where the best line is findable | Quicken timing (early, not on count 2), Crescendo ordering, when to Gather, how much to Goad against the visible Block |

Every engine has commons that are fine on their own: Spike's floor. It also has an uncommon that defines the deck (Johnny's discovery) and a rare that makes the deck explode (Timmy's moment).

---

## 4. Full v2 card list (58)

Legend: **K** kept (same or trivially retuned), **R** reworked (same id and concept, new numbers or shape), **N** new, **X** cut. Engine: **Cj** Conjunction, **Cw** Clockwork, **St** Storm Reader, **Ca** Calendar, **G** glue. Text shows base → upgrade. Numbers are first-pass, to be tuned by the sim (§10). Pricing uses chronist.md §0.3 plus §6 below.

### 4.1 Starters (4): all K (GDD §4.1, final)

| id | Type / cost | Text | Upgrade | Eng |
|---|---|---|---|---|
| `pulse_shot` | A 1 | Deal 6 damage. | 9 | G |
| `ward` | S 1 | Gain 5 Block. | 8 | G |
| `tick` | A 0 | Deal 3 damage. On beat: draw 1 card. | 4 / draw 2 | Cw |
| `tock` | S 1 | Gain 3 Block. Delay 1: gain 5 Block. | 4 / 7 | Cj |

### 4.2 Commons (20)

| id | St | Type / cost / target | Text (base) | Upgrade | Eng | Why |
|---|---|---|---|---|---|---|
| `pinion_jab` | R | A 0 enemy | Deal 3 damage. Quicken 1. | 5 dmg | Cw | Was 3 dmg + on-beat Exposed (7%). Now the cheapest beat enabler. |
| `upbeat` | R | S 0 self | Gain 3 Block. Quicken 1. | 5 Block | Cw | "Can't be played on the beat" was a pure drawback (7%). Now the Block Quicken. |
| `ephemeris` | R | S 1 none | Draw 2 cards. Quicken 1. | Draw 3 | Cw G | Spike draw that also lines up the beat. |
| `gear_train` | R | A 1 enemy | Deal 3 damage 2 times. Crescendo: deal 3 damage. | 4 / 4 | Cw | Crescendo hits are separate hits: Exposed and Glass Spurs synergy. Beat 9: 15 (24 with Polyrhythm). |
| `downbeat` | R | A 2 enemy | Deal 10 damage. Crescendo: deal 5 damage. | 13 / 7 | Cw | 2.2% → the Clockwork finisher at common: 15 / 20 / 25 by beat. |
| `carillon` | R | A 0 all | Deal 3 damage to ALL enemies. Crescendo: deal 2 damage to ALL enemies. | 4 / 3 | Cw | AoE Crescendo. A 0-cost card, so Offbeat Drum doubles it. |
| `balance_wheel` | R | S 1 self | Gain 6 Block. Crescendo: gain 3 Block. | 8 / 4 | Cw | Clockwork's defence (was Stagger on beat, 12%). |
| `dead_reckoning` | R | S 0 self | Gain 1 Block, +1 per beat counted. | base 3 | Cw | Was "per card played". Now reads the beat count, so Quicken feeds it. |
| `hold_the_hour` | N | S 0 none | Gather. Gain 3 Block. | 5 Block | Cj | The common Gather. |
| `ripple` | N | A 0 enemy | Delay 1: deal 3 damage, Chorus +2. | 4, +3 | Cj | The cheapest Chorus entry. |
| `noon_gun` | R | A 1 enemy | Delay 2: deal 12 damage, Chorus +3. | 15, +3, Opening | Cj | Was a plain D2 14. Now the Chorus anchor. |
| `afterpeal` | R | A 1 enemy | Deal 4 damage. Delay 1: deal 4 damage, Chorus +2. | 5 / 5, +3 | Cj | The split card joins Chorus (on-beat clause dropped; 7%). |
| `spring_tide` | R | A 1 all | Delay 3: deal 12 damage to ALL enemies, Chorus +2. | 15, +3 | Cj | The long entry that sets the Gather turn. |
| `storm_glass` | K | S 1 self | Delay 1: gain 8 Block, +4 if any enemy intends to attack. | 10 / 5 | Cj St | Unchanged; defensive Timeline entry. |
| `almanac` | K | S 0 none | Delay 1: draw 2 cards. | +On beat: draw 1 more | Cj G | Unchanged. |
| `wind_forward` | K | S 0 none | Advance 1. If your Timeline is empty, gain 4 Block instead. | +2 Block / 6 | Cj G | Unchanged. It fires the gathered stack (3.5% under v1, whose Timeline was too thin to want it). |
| `weather_eye` | K | S 1 self | Gain 6 Guard. If any enemy's intent after next is an attack, gain 4 more. | 8 / 5 | St G | Unchanged. |
| `whistle_for_wind` | N | S 0 enemy | Goad 3. Draw 1 card. | Goad 4, draw 2 | St Cw | Sailors whistle to raise a storm. A cantrip whose cost (Goad) is an upside for Storm decks. |
| `red_sky` | N | S 1 enemy | Gain 9 Block. Goad 2. | 12 Block | St G | Above-rate Block paid for with Goad. |
| `undertow` | N | A 1 enemy | Deal 3 damage, +1 per 2 damage it intends. | base 5 | St | The common Storm payoff; Goad raises it. |

**Cut commons (X):**
- `slack_water`: a lull coin flip at rate, with no engine.
- `parallax`: 0-cost 2×2 filler; Pinion Jab took its slot.
- `detent`: Stagger 1–2, 2.4% pick, and Stagger now fights the Storm engine.
- `logbook`: Block per Shard, at-rate, 3.6%.
- `reef_the_sails`: 2.0%, a Block/Stagger coin flip.

### 4.3 Uncommons (20)

| id | St | Type / cost / target | Text (base) | Upgrade | Eng | Why |
|---|---|---|---|---|---|---|
| `fermata` | R | A 1 enemy, Keep | Keep. Deal 3 damage. Crescendo: deal 6 damage. | 4 / 8 | Cw | Keep it until beat 9: 21 (28 upgraded, 52 with Polyrhythm). |
| `accelerando` | N | P 1 | At the start of your turn, Quicken 1. | cost 0 | Cw | The engine power. With 2 copies, your first card is on the beat. |
| `mainspring` | K | S 0 | On beat: gain 1 energy. | +2 Block | Cw | Unchanged (the bot under-played it; real decks want it). |
| `quarter_chime` | K | S 0 | On beat: draw 2 cards. | +2 Block | Cw G | Unchanged. |
| `striking_train` | K | P 1 | Whenever you play a card on the beat, deal 3 damage to ALL enemies. | 4 | Cw | Unchanged. |
| `second_hand` | K | A 0 enemy | Delay 1: deal 4 damage. On beat: 5 more. | 5 / 6 | Cw Cj | Unchanged bridge (57%). |
| `escapement` | K | P 1 | Whenever you put a card on your Timeline on the beat, Advance 1. | Opening | Cw Cj | Unchanged. It is now the "fire the gathered stack mid-turn" bridge. |
| `bell_choir` | N | A 1 all | Delay 1: deal 5 damage to ALL enemies, Chorus +2. | 7, +3 | Cj | The AoE Chorus payoff. |
| `knell` | R | A 1 all | Deal 4 damage to ALL enemies. Delay 2: deal 7 damage to ALL enemies, Chorus +2. | 5 / 9, +3 | Cj | The delayed part joins Chorus. |
| `confluence` | R | A 0 enemy | Gather. Deal 1 damage, +2 per card on your Timeline. | +3 per card | Cj | 4.7% → Gather keeps the Timeline long, so the length payoff now has a partner, and it carries a second Gather. |
| `set_the_hour` | N | S 1 enemy | Schedule a card from your hand (Delay 1). Draw 1 card. | cost 0 | Cj Ca | Johnny's tool (§5). Energy shift, +1 Chorus count, recurs under Eternal Return. |
| `hasten` | K | S 0 | Advance 1. On beat: Advance 1 more. | +3 Block | Cj | Unchanged. |
| `banked_hours` | K | S 1 | Delay 1: gain 1 energy and draw 2 cards. | draw 3 | Ca Cj G | Unchanged (77%); a Calendar payload. |
| `appointed_hour` | K | A 2 enemy | Delay 2: deal 34 damage. | 42 | Ca | Unchanged (72%); the Calendar's hammer. |
| `tide_table` | K | P 1 | Whenever a card on your Timeline resolves, draw 1 card. | cost 0 | Cj Ca | Unchanged (88%). Note for the sim: with Eclipse, a second resolution draws again. |
| `breakwater` | K | S 2 self | Gain 8 Block. Delay 1: gain 11 Block. | 10 / 14 | G Ca | Unchanged (glue defence, +24.6 deck Δ). |
| `heave_to` | K | S 1 enemy | Gain 4 Guard, +half the damage of its intent after next. | base 7 | St | Unchanged (72%). |
| `turn_the_tide` | R | A 1 enemy | Deal 3 damage, + the damage of its intent after next. | base 6 | St | Was +half (7.7%). The full forecast is the Augury payoff, and Prophet Glass sums two moves. |
| `gathering_storm` | N | S 1 enemy | Goad 2. Gain 2 Block, +half the damage it intends. | base 5 | St | Goad, then Block from the inflated number: the engine's self-insurance. |
| `squall_line` | N | P 1 | Whenever you apply Goad, deal 2 damage to that enemy per Goad. | 3 per Goad | St | The power that turns the Goad enabler into its own payoff. |

**Cut uncommons (X):**
- `sweep_hand`: on-beat AoE at rate (16%). Carillon and Bell Choir cover AoE.
- `batten_down`: delayed Stagger, 4.6%, and anti-synergy with Storm.
- `mark_the_lull`: lull-gated Exposed, 14.6%.
- `glance_ahead`: Scrap cantrip filler; Ephemeris and Almanac cover draw.
- `storm_warning`: start-of-turn Stagger power. It is decent glue but fights the Storm engine; Stagger lives on in relics and colourless cards.

### 4.4 Rares (14)

| id | St | Type / cost / target | Text (base) | Upgrade | Eng | Why |
|---|---|---|---|---|---|---|
| `zenith` | K | A 0 enemy | Can only be played on the beat. Deal 10 damage. | 14 | Cw | Unchanged (83%). |
| `culmination` | R | A 2 enemy | Deal 3 damage per beat counted. | 4 per | Cw | Was a lull coin flip (19%). Now the beat-count finisher: 27 at count 9, 36 upgraded. Free on the beat with Perpetual Motion. |
| `polyrhythm` | K | P 2 | Your On beat effects trigger twice. | cost 1 | Cw | Unchanged rule, newly multiplicative with Crescendo. |
| `perpetual_motion` | R | P 2 | Cards you play on the beat cost 0 (except X-cost cards). | cost 1 | Cw | Was "first beat card costs 1 less" for 3 energy (4%). Now the Corruption-shaped rule-breaker, capped at 3 (4) beats a turn. |
| `tourbillon` | K | S 0, Keep | Keep. On beat: gain 2 energy, then Scrap this. | +draw 1 | Cw | Unchanged. |
| `syzygy` | R | A 2 enemy | Delay 2: deal 18 damage, Chorus +8. | 22, +10 | Cj | Was a plain 75-damage D3 for 3. Now weak alone (18) and huge together: 42 with 3 others, 58 with 5, ×2 with Eclipse. |
| `total_eclipse` | N | P 2 | Whenever 3 or more cards resolve together from your Timeline, each resolves a second time. | cost 1 | Cj | The Conjunction multiplier. |
| `watch_bell` | K | P 2 | Whenever a card on your Timeline resolves, gain 3 Block, +3 if any enemy intends to attack. | cost 1 | Cj Ca | Unchanged; Conjunction's defence payoff. |
| `eternal_return` | N | P 2 | The first card that resolves from your Timeline each turn goes back on it with Delay 2 (not Scrap cards). | cost 1 | Ca | The Calendar rule-breaker. |
| `toll_the_hours` | K | A X enemy | Deal 6 damage X times. Delay 1: deal 6 damage X times. | 8 / 8 | G Ca | Unchanged (88%). Recurs with its stamped X. |
| `seen_it_coming` | K | S 1 enemy, Scrap | Delay 1: gain Block equal to the damage it intends. Scrap. | cost 0 | St | Unchanged. It now also covers Goad. |
| `lighthouse` | R | S 2 self | Gain 10 Block. Gain Guard equal to half the damage enemies intend after next. | 13 Block | St G | Was flat 11 Guard if any forecast attack. Now scales with the whole forecast, so Prophet Glass and big packs feed it. |
| `reckoning` | N | A 1 enemy, Scrap | Delay 1: deal damage equal to twice the damage it intends. Scrap. | +8 | St | Aim it at the charge you see two moves out: a boss's 30 becomes 60. |
| `eye_of_the_storm` | N | P 2 | At the end of your turn, each enemy takes damage equal to half the damage it intends. | cost 1 | St | The Storm multiplier. Goad inflates what it reflects. |

**Cut rares (X):**
- `star_tithe`: a 3-turn Shard + draw 2 with Scrap, 4.1%, no role.
- `portents`: lull-gated Exposed power; Exposed is now the shared pool's job.

### 4.5 Pool shape

| | Attack | Skill | Power | Total |
|---|---|---|---|---|
| Starter | 2 | 2 | 0 | 4 |
| Common | 9 | 11 | 0 | 20 |
| Uncommon | 7 | 8 | 5 | 20 |
| Rare | 5 | 3 | 6 | 14 |
| **Total** | **23** | **24** | **11** | **58** (v1: 56) |

- **Engine membership** (a card can count twice):
  - Conjunction 21;
  - Clockwork 22;
  - Storm 13. Storm is smaller but has the highest per-card synergy;
  - Calendar 8, mostly shared with Conjunction;
  - glue 12.
- **Card counts by mechanic:**
  - 17 Delay cards; 7 Chorus, 5 Crescendo, 4 Quicken, 3 Goad, 2 Gather, 1 Schedule.
  - 17 zero-cost cards.
  - Keep 2 (Fermata, Tourbillon); Opening 2 (Noon Gun+, Escapement+); Scrap 3 (Tourbillon, Seen It Coming, Reckoning).
- **Commons that fit two engines or engine + glue:** 7 of 20 (35%). This passes the ≥30% check.
- **Common rule:** no common gains energy, returns a card or reduces a cost (GDD §3). Whistle for Wind is a 0-cost cantrip with a real drawback. That breaks v1's own invariant 5, but not the GDD; §8 covers the loop check.
- **Lost axis, on purpose.** The v1 pool had 8 Stagger and 4 Exposed cards. v2 has neither in class (Exposed is left to the shared pool and relics). This sharpens the identity: the Chronist reads and times, she doesn't debuff.

---

## 5. New keywords (for `src/content/keywords.ts`)

Group: `chronist`. Placeholders come from `keywordTextValues()`, so no rule number is typed into the text.

| id | Name | terms | Text |
|---|---|---|---|
| `chorus` | Chorus | `['Chorus']` | When this resolves from your Timeline, it gains the Chorus bonus once for each *other* card resolving at the same time (the same turn start, or the same Advance). |
| `gather` | Gather | `['Gather']` | Every card on your Timeline will now resolve on the same turn as the latest one. |
| `quicken` | Quicken | `['Quicken']` | Add this much to your beat count this turn. It never goes back, so a beat you jump over is missed. |
| `crescendo` | Crescendo | `['Crescendo']` | On beat: this happens once on your first beat this turn, twice on your second, three times on your third. |
| `goaded` | Goad | `['Goad', 'Goaded']` | Its hits deal this much more damage during its next turn, then Goad wears off. Its intent shows the bigger number. |
| `schedule` | Schedule | `['Schedule']` | Put the chosen card on your Timeline. When it resolves, its effects happen for free. It isn't played, so there is no beat and no "when you play". |
| `beat_count` | beat count | `['beat count', 'beat counted']` | How many cards you've played this turn, plus Quicken. Counts of {beats} are on the beat. |

The conveyance agent should also make sure these existing entries cover the v2 text: On beat, Delay, Advance, Timeline (`{timeline_cap}`), Augury, Keep, Opening, Scrap. `amountKeywords` mappings: scale `chorus` → Chorus; `beat_count` → beat count; `beat_index` inside a repeat → Crescendo. `effectKeywords`: `gather`, `quicken`, `schedule`.

---

## 6. Engine hooks and new effect ops (Phase B, narrow)

Every item below is the smallest change that expresses a rule above. I'll add them in Phase B and report each one. Items marked **[shared]** touch `src/engine/types.ts` and other engine files.

| # | Kind | Name | Spec |
|---|---|---|---|
| H1 | amount scale **[shared]** | `'chorus'` | Inside a Timeline resolution: the batch size − 1. A **batch** is the set of entries made due by one `dueEntrySteps` call (the turn-start step, or one `advance`). `dueEntrySteps` stamps `batch: n` on each `timeline_entry` step, and `resolveEntry` puts `chorus = n − 1` on the effect frame (`EffectFrame.chorus`). **Preview** (card in hand): the number of entries with `dueTurn === turn + min(def.delay.turns, delayMax)`. Timeline strip: other entries with the same `dueTurn`. Elsewhere: 0. Text: `{delay_damage_per}` renders the "+N". |
| H2 | effect **[shared]** | `{ type: 'gather' }` | If the timeline has ≥ 2 entries, set every entry's `dueTurn` to the max `dueTurn`. Emit `timeline_gathered { dueTurn }` (new event for the renderer's strip). No cap: it only delays. No-op on 0–1 entries. |
| H3 | effect **[shared]** | `{ type: 'quicken'; n: number }` | `combat.counters.beatOffset += n` (n ≥ 1, validated). This is the counter Tempo Draught already uses (per-turn, reset at turn start). Emit `beat_shift { delta, count }` for the metronome UI. It is not a play and doesn't fire `on_beat`. |
| H4 | amount scale **[shared]** | `'beat_index'` | For the current play: the 1-based index of its beat count in `beatPositions` when on the beat, else 0. `resolvePlay` already computes `nextBeat()`. Stamp `beatIndex` on the frame, on `CardPlayedInfo`, and on `TimelineEntry` (for future use; v2 cards only use it in immediate effects). Crescendo is `on_beat { repeat { times: {scale:'beat_index'}, effects } }`, so Polyrhythm and Offbeat Drum repeat the whole wrapper (ruling 28 cap of 3 runs). |
| H5 | status (content) + DamageInfo flag **[shared]** | `goaded` | Content status in `chronist.ts`: stacks `amount`, `decay: 'end_own_turn'`, `decayBy: 'all'`, `isDebuff: false` (it helps the enemy, so artifact-style debuff immunity mustn't eat it), and cap 20 (`TUNING.caps.status.goaded`). Hook `damageDealtFlat: (ctx, info) => info.forecast ? 0 : ctx.stacks`. Engine ask: `computeForecast` passes `forecast: true` in `DamageInfo`, so the forecast doesn't show a Goad that will have worn off. The current intent shows it. |
| H6 | effect **[shared]** | `{ type: 'schedule'; turns: 1 \| 2 \| 3 }` | `pendingChoice` over hand cards that are Attack/Skill, have no `delay`, have a numeric cost and aren't `unplayable` (min 1, max 1; with no eligible card, nothing happens and a `text` event fires). The card leaves the hand and becomes a `TimelineEntry { …, scheduled: true, onBeat: false, x: 0, target: frame.target }`. The Schedule card targets an enemy, and its target is stamped. `resolveEntry` runs **`def.effects`** for scheduled entries (with `delayed: true`), then the normal `finish_card`. It counts toward `cap_timeline`, `cap_relay` and `onTimelineAdd` / `onDelayResolved`. The scheduled card's `canPlay` is **not** checked at resolution (that is the Zenith loophole, and it is intended). |
| H7 | modifier hook **[shared]** | `timelineResolutions?(ctx, batch: number, entry): number` | Default 1, clamped to [1, 2] by the engine. `resolveEntry` runs `delay.effects` (or `effects` if scheduled) that many times with the same frame (same `chorus`). Each run fires `onDelayResolved`. `finish_card` runs once. Total Eclipse returns 2 when `batch >= values.threshold` (3). |
| H8 | modifier hook **[shared]** | `recurDelay?(ctx, entry): number \| null` | Checked in `finish_card` for `via: 'timeline'` when the card would go to the discard pile (not when it Scraps). A per-turn counter `recurs` (added to `PER_TURN_COUNTERS`) must be < the hook's budget (Eternal Return stacks). If so, the card is re-added as a new entry with `dueTurn = turn + n`, the same target/x/onBeat/scheduled, **exempt from `cap_relay`** (like Paradox Coil), firing `onTimelineAdd` and emitting `timeline_added`. Paradox Coil's handler only sees cards in the discard pile or Scrapheap, so the two never double-claim. |
| H9 | damage flag **[shared]** | `damage { perTarget: true }` | For `all_enemies` damage, evaluate `amount` once **per hit target**, with that enemy as the frame's target. `{intent_damage: 'target'}` then reads each enemy's own intent (Eye of the Storm). |
| H10 | event hook **[shared]** | `onStatusInflicted { target, id, amount }` | Dispatched to the **player's** statuses and relics after a player-sourced status application changes an enemy's stacks (amount > 0). Squall Line triggers on `id === 'goaded'` with `ctx.queue(damage, {target})`. Shared-pool relics may also want it (an "on apply Exposed" relic). |
| — | none | Perpetual Motion, Culmination, Dead Reckoning, Undertow, Turn the Tide, Reckoning, Lighthouse, Gathering Storm | Existing DSL and hooks: `modifyCardCost` + `ctx.nextBeat()`, scales `beat_count`, `intent_damage`, `forecast_damage`, `{forecast_damage:'all'}`. |

Tests in Phase B: one unit test per hook (H1–H10), plus card smoke tests (base and upgraded) for all 58. Integration tests:
- Gather → Advance → Chorus values;
- Quicken skipping a beat;
- Crescendo × Polyrhythm × Metronome Heart run counts;
- Goad absent from the forecast;
- Schedule × Zenith;
- Eternal Return × Paradox Coil × Scrap;
- Eclipse × Tide Table under `cap_draw`.

---

## 7. Originality check (against `docs/research/sts-design.md` §3)

| Mechanic | Nearest STS | Why it isn't a copy |
|---|---|---|
| Chorus | Focus × orbs (§3.3), The Bomb (§3.1) | No STS effect counts *simultaneous resolutions*. The bonus depends on timing the Timeline, not on a stat or slot count. |
| Gather | none (Postpone/Advance are ours) | Aligns stored effects to one future turn. STS has no shared timeline to edit. |
| Quicken | Time Warp / Panache counters (§3.1) | It moves the player's own position in a positional sequence. STS counters only fire on thresholds and can't be moved. |
| Crescendo | Kunai/Shuriken (every N), Claw growth | The payoff multiplies by *which* beat it lands on within one turn. That is per-card and positional, not a global counter or a combat-long growth. |
| Goad | Spot Weakness reads intent; Vulnerable is on you | The player buffs the *enemy's next attack* by choice, and the payoffs read the inflated intent. STS has no player effect that raises enemy damage for value (the Ironclad pays with his own HP, the Rupture shape). |
| Schedule | Setup (top of draw at 0), Nightmare (copies next turn), Well-Laid Plans | No copy, no hand: the card leaves the cycle and *auto-resolves* free from a visible Timeline, and it counts as an entry for every Timeline payoff. |
| Total Eclipse | Echo Form / Burst (§3.1 copy/replay) | Conditional on a batch of ≥3 simultaneous Timeline resolutions, not "the first/next card". |
| Eternal Return | Paradox Coil (our own) | A power-shaped, once-per-turn recurrence of the stored card. |
| Eye of the Storm | Thorns / Flame Barrier (on hit) | It fires on *your* turn from the intent preview, before any hit. Riposte is the Breaker's reactive axis; this is a read, not a reaction. |

## 8. Loop safety (deltas from chronist.md §9)

- **Beats stay ≤ 3 (4).** Quicken only increases the count and positions never move. The `onBeatRuns` cap of 3 still bounds On-beat clauses; Crescendo's repeat is inside one run (max 3 × 4 = 12 runs of its payload with Heart + Polyrhythm + Offbeat Drum).
- **Whistle for Wind** is a 0-cost cantrip (+1 card, +1 play). Chains end when the deck runs out, `cap_draw` 15 and `cap_plays` 40 backstop it, and every copy adds Goad 3 per hit. No energy is produced.
- **Total Eclipse** doubles at most one batch per resolution step (clamp 2). Draw and energy from the second run hit `cap_draw` and `cap_bonus_energy`.
- **Eternal Return** recurs at most `stacks` cards per turn, each landing 2 turns out. That is value over time, not a per-turn loop.
- **Schedule** removes a card from hand for one Timeline slot. It is energy-positive only by the scheduled card's cost, once per Set the Hour play, and bounded by `cap_timeline` 10 and `cap_relay`.
- **Perpetual Motion** makes up to 3 (4) plays a turn free. It reduces nothing below 0 and never touches X-costs. `cap_cost_reduction` (once per instance per turn) still applies.
- **Assembled worst case:** Conjunction with 10 entries, Gather, Advance, Eclipse, Spool, Tide Table and Watch Bell. That is about 10 × (12 + 2×9) ≈ 300 per run, so ~600 doubled to one target, *once*, after ~4 turns of setup with thin defence. It needs 2 rares, ~6 commons/uncommons and a relic. It is acceptable under the brief ("engines may be strong"); the Act 3 damage-cap boss is the check. The sim should log max batch size and the largest single resolution turn (§9).

## 9. Relic and potion asks (for design-shared)

**Keep these, which now have real partners:**
- Chrono Lens (starter);
- Offbeat Drum: 0-cost Crescendo (Carillon) and Tick/Mainspring/Quarter Chime;
- Metronome Heart: a 4th beat means Crescendo ×4;
- Timeline Spool: per resolution, so Eclipse doubles it;
- Paradox Coil: a second Calendar recurrence;
- Prophet Glass: forecast scales sum 2 moves, for Turn the Tide and Lighthouse;
- Sandglass Bead;
- Timeline Clamp: +25% on delayed hits. It multiplies Chorus, so watch it;
- Fixed Star: anti-Crescendo, pro-Perpetual Motion and Zenith. That is a real choice.

**Rework requests:**
- `star_pip` (+39 win Δ, generic free Block). Retheme it to Storm: "At the start of your turn, gain 2 Block for each enemy that intends to attack (+1 per Goad on it)." Or simply nerf the number.
- `seers_veil`: it is lull-based, and v2 has no lull cards. Suggest "The first time you Goad an enemy each turn, draw 1 card."
- `tuning_fork`: fine as is. Optionally: "If your beat count is exactly 3, 6 or 9 at end of turn" (it reads the beat count, so Quicken interacts).

**New class relics wanted (chronist):**

| Proposed | Rarity | Text | Engine |
|---|---|---|---|
| Astrolabe | uncommon | Whenever 3 or more cards resolve together from your Timeline, gain 1 energy. | Cj (follow-up turn) |
| Conductor's Baton | rare | Crescendo effects count one more beat (×2 / ×3 / ×4). | Cw (Timmy) |
| Storm Lantern | common | Whenever you apply Goad, apply 1 more. | St |
| Perpetual Calendar | boss | +1 energy. Cards that resolve from your Timeline go to the bottom of your draw pile instead of the discard pile. | Ca (drawback: no reshuffle of payloads) |
| Hourglass Tonic (potion) | uncommon | Gather, then Advance 1. | Cj (an emergency "fire now") |

**Cross-class combos wanted** (relic + relic, card + relic; any class):
- **An "empty hand → draw" relic** (Unceasing-Top-shaped but not the same trigger, e.g. "the first time each turn you play your last card in hand, draw 2"). It makes Clockwork chains go long, and Graft's Prune decks like it too.
- **Glass Spurs** (3 hits from one play → Exposed) × Gear Train Crescendo. Already in the pool; keep it.
- **Fracture Engine** × multi-hit Crescendo. Already in the pool.
- **An "on status applied by you" relic using H10**, e.g. "Whenever you apply a status to an enemy, deal 1 damage to it". It ties Goad, Breaker Stagger and Graft Rot together.
- **A colourless Goad card** (1–2 in the shared pool), so the Breaker's Riposte decks can deliberately bait bigger attacks. That is a cross-class Johnny line.

---

## 10. Sim hooks (to fold in at Phase B)

**Tags.** Every card keeps its v1 archetype tag (`metronome`/`timeline`/`oracle`/`glue`) and adds its v2 engine tag(s) (`conjunction`, `clockwork`, `storm`, `calendar`), plus mechanic tags `chorus`, `gather`, `quicken`, `crescendo`, `goad`, `schedule`. The sim's reward heuristic can then weight synergy by engine.

**Telemetry asks for the sim agent** (Chronist):
1. Timeline batch-size distribution (mean, p90, max) and Chorus bonus damage per combat.
2. Beats per turn (v1: 0.80) and beat-index distribution (how often beat 2/3 are reached); Quicken plays per combat; beats skipped by Quicken.
3. Crescendo bonus damage per combat; Polyrhythm/Perpetual Motion energy saved.
4. Goad applied per combat, the extra damage taken from Goad vs Goad-scaled damage dealt and Block gained (is Storm net positive?).
5. Eternal Return recurrences per combat; Schedule targets (which cards get scheduled).
6. Largest single-turn damage per run (an engine "pop" indicator) and the floor it first exceeds 60.
7. Cap hits: `cap_draw` (Eclipse + Tide Table), `cap_timeline`, `cap_bonus_energy`.

**Bot heuristics the sim agent will need** (the greedy bot won't find these lines on its own):
- Gather when ≥ 2 entries have different due turns and you can survive the gap. Advance when the gathered batch is ≥ 3.
- Play Quicken on count 1 (never on count 2). Hold Crescendo and Keep cards for the highest reachable beat.
- Goad only when (Block available − inflated intent) ≥ 0, or when Storm payoffs in hand gain more than the HP lost.
- Schedule your highest-cost non-Delay card.

**What I'll do with `report-v2-baseline.md`:**
- Any card under 5% pick with deck Δ < +5: rework or cut.
- Any card over 85% pick with deck Δ > +20 on its own: nerf it before the engine pieces.
- Tune engines in this order:
  - Clockwork: Crescendo values (Downbeat/Fermata first);
  - Conjunction: Chorus per-card values (Syzygy +8 first);
  - Storm: the Gathering Storm Block fraction and Eye of the Storm %;
  - Calendar: Eternal Return's delay (2 → 3).
- Targets: each engine reaches its first 60-damage turn between floors 15 and 25 in runs that drafted ≥ 3 of its pieces, and the class win rate lands in GDD §8.4's band.

## 11. Shared files I'll touch in Phase B

- `src/engine/types.ts`: new scales, effects, hook names, DamageInfo flag, TimelineEntry fields.
- `src/engine/timeline.ts`: batch stamping, gather, schedule resolution, resolution count, recur.
- `src/engine/effects.ts`: handlers and scales.
- `src/engine/combat.ts`: beat index stamp.
- `src/engine/enemies.ts`: forecast flag.
- `src/engine/statuses.ts`: `onStatusInflicted` dispatch.
- `src/engine/validate.ts` and `src/engine/text.ts`: new effect types.
- `src/content/keywords.ts`: my entries only.

I'll report each change. Renderer asks (for juice/conveyance):
- `timeline_gathered` and `beat_shift` events;
- the live Chorus value on Timeline-strip entries;
- Goad's icon and the intent glow.

## 12. Open questions for the lead

1. **Stagger/Exposed leave the Chronist class pool entirely.** OK? (Detent, Reef, Batten Down, Storm Warning, Mark the Lull, Portents and Pinion Jab's Exposed are all cut or reworked.)
2. **Whistle for Wind breaks v1's "no unconditional 0-cost cantrip" invariant** (not a GDD rule), with Goad as the cost. OK?
3. **Schedule bypassing `canPlay` (Zenith)** is intended as a discoverable trick. Veto it if it reads as a bug.
4. **The pool is 58 cards (v1: 56)**: 14 rares instead of 12, because each engine needs its own rare. Should I trim to 12 (candidates: Lighthouse, Tourbillon)?

---

## 13. Phase B status (2026-10-30)

Rulings 55–59 apply. Implemented in `src/content/cards/chronist.ts`:
- all 14 new cards;
- the reworked cards (Pinion Jab, Upbeat, Ephemeris, Gear Train, Downbeat, Carillon, Balance Wheel, Dead Reckoning, Noon Gun, Afterpeal, Spring Tide, Fermata, Knell, Confluence, Turn the Tide, Culmination, Perpetual Motion, Syzygy, Lighthouse);
- the `goaded` status and the new power statuses;
- the v2 engine and mechanic tags.

The 12 cuts are **still in the pool** (`V2_HELD_CUTS`) until `report-v2-baseline.md` arrives (ruling 55), so the live pool has 70 cards. Kept cards are not retuned yet.

Engine hooks as built (all additive):

| # | Where | What |
|---|---|---|
| H1 | `timeline.ts` `dueEntrySteps` / `resolveEntry`, `effects.ts` scale `chorus` | `timeline_entry` steps carry `batch`; the frame gets `chorus = batch − 1`. Previews use `chorusPreview()`. `finish_card` and `onDelayResolved` carry `batch` (shared with design-shared's Astrolabe). |
| H2 | `timeline.ts` `gather()`, effect `gather` | Event `timeline_gathered`. |
| H3 | effect `quicken {n}` | `counters.beatOffset += n`, the same counter Tempo Draught uses. Event `beat_shift {delta, now}`. |
| H4 | `combat.ts` `resolvePlay`, scale `beat_index` | `EffectFrame.beatIndex`, `finish_card.beatIndex`, `TimelineEntry.beatIndex`. |
| H5 | content status `goaded` | Forecast intents are computed with the damage tag `'forecast'` (`computeIntent(..., forecast = true)`), and Goad's `damageDealtFlat` skips them. **Also:** the `intent_damage` scale now re-computes the current intent live (`liveIntent` in `effects.ts`), so a status applied earlier in the same action counts. |
| H6 | effect `schedule {turns}`, `TimelineEntry.scheduled`, `ChoiceResume {op: 'schedule'}` | When only one card is eligible it is picked automatically. |
| H7 | modifier `timelineResolutions(ctx, batch, entry, runs)` | Clamped by `TUNING.caps.timelineResolutions = 2`. `finish_card.runs` fires `onDelayResolved` once per run. |
| H8 | modifier `recurDelay(ctx, card, recursThisTurn)`, read in `finishCardItem` | Per-turn counter `recurs`. |
| H9 | `damage {perTarget: true}` | |
| H10 | hook `onStatusInflicted {target, id, amount}` | Player-scoped, dispatched from the `status` effect when a player source raises an enemy's stacks. |

Tuning: `caps.timelineResolutions: 2` and `caps.status.goaded: 20`. Glossary: `beat_count`, `quicken`, `crescendo`, `chorus`, `gather`, `schedule` and `goaded` in `src/content/keywords.ts`. Tests: `tests/content/chronist.test.ts` (updated) and `tests/content/chronist-v2.test.ts` (new).

---

## 14. Phase C: data-driven tuning (2026-10-31)

Sources:
- `docs/balance/report-v2-baseline.md` and `v2-baseline-cards.csv`. These measure v1 content: a reworked card's v1 row only says the old version was weak.
- Chronist persona batches on the v2 pool, run with `sim/personas-batch.ts --class chronist` on the baseline's paired seeds `v2-<i>-chronist`:
  - **p0**: the cuts applied, no retunes. About 52 runs per persona.
  - **p1**: retune pass 1. About 73 runs per persona. The sim agent's phase-2 personas were live by then: spike is the new rollout drafter, `spike-v1` is the old one, and the johnny bots read `engine:`/`role:` tags.
  - **p2**: retune pass 2.

  95% CIs on n≈70 are about ±11 points.

### 14.1 Cuts (held since Phase B), with the data behind each

| Card | v1 baseline data | Why it goes |
|---|---|---|
| `slack_water` | not in the extremes. v1 final pick 9.2% | A lull coin flip with no engine. |
| `parallax` | v1 pick 3.6% | Filler. Pinion Jab now carries the cheap play. |
| `detent` | v1 pick 2.4% | Stagger fights the Storm engine (ruling 56). |
| `logbook` | cf **+11.0**, +3.0 floors (**), pick 6% | Strong but at-rate generic Block. Cutting it trims the defence surplus that gives turtle 78.5%. |
| `reef_the_sails` | cf −5.0, pick 1–10%, plays/draw 0.28 | Weakest Oracle card, and Stagger. |
| `batten_down` | v1 pick 4.6% | Delayed Stagger, against the Storm engine. |
| `mark_the_lull` | cf −3.0 | Lull-gated Exposed (ruling 56). |
| `glance_ahead` | cf +7.0 (n.s.), pick 9% | A Scrap cantrip with no role. Ephemeris and Almanac cover draw. |
| `storm_warning` | cf +3.0, +2.5 floors, turtle pick 46% | A Stagger power that turtle loves. It shrinks the hits Storm scales from. |
| `sweep_hand` | v1 pick 16% | At-rate on-beat AoE. Carillon and Bell Choir cover AoE. |
| `star_tithe` | v1 pick 4.1% | No role. |
| `portents` | cf −3.0, pick Δ −5.3 | Lull-gated Exposed power (ruling 56). |

### 14.2 Retunes

**p0 result** (cuts only): spike 60.4%, turtle 62.0%, timmy 3.8%, novice 1.9%; Calendar 53.8, Conjunction 51.9, Storm 51.0, Clockwork 42.3.
- The v2 pool is far too strong: on the same seeds, v1 spike was 41.5%.
- The defence cards top the deck win deltas: Breakwater +26, Heave To +27.5, Dead Reckoning +34, Tide Table +29.

**Pass 1:**

| Card | Change | Data |
|---|---|---|
| `heave_to` | Guard 4 → 2 (upgrade 7 → 5), +half forecast unchanged | v1 cf **+12.1 / +3.5 floors**, turtle pick 75%. p0 deck Δ +27.5. |
| `lighthouse` | Block 10 → 7 (upgrade 13 → 10) | v1 turtle pick **94%**, cf +8.0. |
| `weather_eye` | Guard 6 +4 → 5 +3 (upgrade 8 +5 → 7 +4) | v1 cf +9.0, pick Δ **+7.7**. |
| `storm_glass` | 8 +4 → 7 +3 (upgrade 10 +5 → 9 +4) | Defence trim; v1 turtle pick 41%. |
| `breakwater` | 8 + Delay 11 → 6 + 10 (upgrade 10 + 14 → 8 + 13) | v1 turtle pick 78%. p0 Δ +26. |
| `dead_reckoning` | base Block 1 → 0 (upgrade 3 → 2) | p0 Δ +34 (33 decks). |
| `toll_the_hours` | 6 → 5 per hit (upgrade 8 → 7) | v1 cf **+13.0 / +5.1 floors**: the only significant Chronist card. |
| `syzygy` | Delay 2: 18 + Chorus 8 → 24 + Chorus 6 (upgrade 22 + 10 → 30 + 8) | A higher floor for big-play decks (timmy 3.8%), a flatter peak. |
| `polyrhythm` | cost 2 → 1 (upgrade 1 → 0) | v1 cf −7.0, pick 8%. Metronome was the weakest v1 archetype (21%). |
| `mainspring` | +2 Block on the base card | v1 cf −4.0, pick 9%. Reverted in pass 2. |

**p1 result:** spike 35.6% (spike-v1 36.5%), turtle 56.8%, timmy 4.1%, novice 0%; Conjunction 46.7, Storm 45.2, Calendar 42.5, **Clockwork 20.5** (below the 25% floor).
- Clockwork cards were the negative deck deltas: Pinion Jab −16.6, Perpetual Motion −15.1, Fermata −14.0, Downbeat −11.2.
- The Clockwork johnny ends with 31-card decks (5 Pulse Shots left), so chains starve.
- Turtle still holds Breakwater (20 of 24 decks) and Mainspring (17 of 24). Watch Bell was +30.9.

**Pass 2:**

| Card | Change | Data |
|---|---|---|
| `breakwater` | 6 + 10 → 5 + 8 (upgrade 8 + 13 → 7 + 11) | Turtle staple (in 20 of 24 decks), p1 Δ +20.4. |
| `watch_bell` | 3 (+3) → 2 (+2) Block per resolution | p1 Δ +30.9. |
| `mainspring` | pass-1 Block removed. The upgrade now draws 1 on beat instead of gaining Block. | Turtle held it in 17 of 24 decks. |
| `pinion_jab` | + Draw 1 (a 0-cost Quicken cantrip) | p1 Δ −16.6. Keeps chains alive in big decks. |
| `downbeat` | 10 / Crescendo 5 → 12 / 6 (upgrade 13 / 7 → 15 / 8) | p1 Δ −11.2. |
| `fermata` | 3 → 5 base (upgrade 4 → 7), Crescendo 6 / 8 unchanged | p1 Δ −14.0. |
| `perpetual_motion` | cost 2 → 1 (upgrade 1 → 0) | p1 Δ −15.1. Tempo cost of a setup Power. |

### 14.3 Sim tags

Superseded by §15.1: one `ENGINE_ROLES` table, four roles (no `bridge`). The §5 matrix in `docs/cards/chronist.md` is regenerated for the v2 pool.

---

## 15. Phase C, second pass (2026-10-31, after the handover)

The first Phase C designer stopped after launching p2 and never logged its result. This section picks up from there. All batches run `sim/personas-batch.ts` from a snapshot of the working tree, `--workers 2`, on the paired seeds `v2-<i>-chronist`. The encounters agent was still landing enemy changes between batches, so the absolute numbers drift between passes (spike went 42.5 → 48 with no Chronist change that touches spike's decks much). Compare engines **within** a batch, not across batches. 95% CIs at n = 100 are about ±10 points.

**p2 result** (n = 80, the pass-2 numbers in §14.2): spike 42.5%, spike-v1 38.8%, turtle 50.0%, timmy 3.8%, novice 1.3%. Johnny: Storm 41.3, Calendar 38.8, Conjunction 26.3, **Clockwork 21.3** (still below the 25% floor).

### 15.1 Sim tags: one table

`ENGINE_ROLES` in `chronist.ts` replaces the `V2_TAGS` + `ROLES` pair, in the Breaker's format: `id: [engines[], role, ...mechanic tags]`. A pool card missing from the table throws at load, and a table entry that names no pool card (a cut card) also throws at load. Roles are `enabler | payoff | multiplier | glue`. The three old `bridge` cards got the role they actually play: Second Hand → payoff, Escapement → enabler, Tide Table → payoff. The bare `conjunction`/`clockwork`/`storm`/`calendar` tags are gone; `engine:*` replaces them (the sim's bare-tag fallback no longer fires).

Two tagging corrections. Both change what the johnny bots draft, so they are part of the measurement:

| Card(s) | Was | Now | Why |
|---|---|---|---|
| Heave To, Weather Eye, Lighthouse | Storm payoff | Storm **glue** | They read the forecast (the intent after next), which Goad never raises (Goad is left out of forecasts, H5). They are Augury defence, not Goad payoffs. As payoffs they made johnny-storm a turtle with extra steps (v1 Oracle 54%). |
| Storm Glass | Conjunction + Storm payoff | glue | Same reason; a defensive Timeline entry. |
| Breakwater | Calendar payoff | Calendar glue | Plain defence. Under Eternal Return it recurs, but it pays nothing the engine multiplies. |

The test now checks one `role:*` tag per card, an `engine:*` tag on every non-glue card, and the exact multiplier per engine (Clockwork: Polyrhythm, Perpetual Motion; Conjunction: Total Eclipse; Storm: Eye of the Storm; Calendar: Eternal Return).

### 15.2 Pass 3: Clockwork's chain

**Diagnosis (p2, johnny-clockwork).**
- 1.37 beats a turn on 4.8 cards a turn. Beat 2 needs a count of 6, so most turns reach beat 1 only.
- Downbeat averaged 17.3 damage a play: 12 base + 6 × 0.9, so its average Crescendo index was 0.9. It cost 1.62 energy a play. Fermata, whose Keep lets it wait for the high beat, averaged index 1.6.
- A 2-cost payoff spends the energy the chain needs for its plays, and every 2-cost play is one fewer card toward beat 2.
- Gear Train's Crescendo hit (3) made it 9 damage for 1 energy at beat 1: Δ −7.1 in clockwork decks.

| Card | Change | Data |
|---|---|---|
| `downbeat` | cost 2 → **1**; 12 → **8** (upgrade 15 → 10); Crescendo 6 (8) unchanged | Above. On beat 1/2/3 it now deals 14/20/26 for 1 energy. |
| `gear_train` | Crescendo hit 3 → **4** (upgrade 4 → 5) | Δ −7.1 (clockwork johnny), −2.2 pooled. Beat 1 → 10, beat 3 → 18. |

**p3 result** (n = 100 each; the same snapshot also ran spike/turtle for the other two classes):

| | Breaker | Chronist | Graft |
|---|---|---|---|
| spike | 58% | **48%** | 88% |
| turtle | 53% | 66% | 77% |

Johnny (Chronist): Storm 47, Calendar 44, Conjunction 32, Clockwork 30. Every engine is now ≥ 25.
- Clockwork's maximum turn reached 60 damage in 84 of 100 runs (p2: 56 of 80). Its losses moved to Act 3: 44 of 70 losses, with the Tether Sovereign alone causing 13.
- In clockwork decks, Mainspring (Δ −17.5, played on 39% of draws), Accelerando (Δ −9.5, 64 decks) and Tourbillon (−8.9) were the negative pieces. Zenith (+18), Culmination (+13.8, 7 decks) and Polyrhythm (+8) were positive.

### 15.3 Pass 4: Clockwork's setup pieces

| Card | Change | Data / reasoning |
|---|---|---|
| `accelerando` | cost 1 → **0**; upgrade: cost 0 → **Opening** | Negative deck Δ in every persona that took it: −9.5 (clockwork johnny), −8.6 (turtle + spike), −2.2 (p2 pooled). A 1-energy Power whose whole effect is +1 beat count a turn loses a turn of tempo to pay for itself. At 0, the cost is only the card slot. Opening means the upgraded copy plays from turn 1. |
| `mainspring` | adds **Quicken 1**, after the On-beat clause (upgrade keeps its on-beat draw) | Played on 39% of draws; Δ −17.5 / −24. Off the beat it was a blank. Now it either pays (energy on the beat) or sets up the next beat (count 1 → 2). It still costs a card. Played on count 2, it skips beat 3, which is Quicken's ordering puzzle. No energy loop: the energy is gated on the beat, and beats stay ≤ 3 (4). |

After pass 4 the pool has 18 zero-cost cards (§4.5 said 17; Accelerando is the 18th), and Downbeat is a 1-cost card.

**p4 result** (n = 100 each; Chronist only: johnny-clockwork, johnny-conjunction, spike and turtle). Storm and Calendar weren't re-run, because neither card is in their engines.

| persona | p3 | p4 |
|---|---|---|
| spike | 48% | 55% |
| turtle | 66% | 65% |
| johnny-clockwork | 30% | 30% |
| johnny-conjunction | 32% | 35% |

- Accelerando's deck Δ went from −9.5 to −3.6 (66 decks), and it's played on 91% of draws.
- Downbeat is now the best Clockwork card by deck Δ (+21.8, 72 decks); Striking Train (+15.7) and Zenith (+18.2) follow.
- Mainspring is in 55 decks instead of 19, but its Δ is still −10.1. The bot plays it on only 42% of draws: when it plays it, it's on the beat (0.67 energy a play), and it doesn't use the off-beat Quicken line. The planner only sees a Quicken's value when the next cards in hand cash in the beat. That's a bot limit, so I'm not buffing Mainspring further.
- Clockwork johnny holds at 30% (≥ 25). It is the most robust engine before Act 3: 20 Act 2 deaths against Conjunction's 37. But 47 of its 70 losses come in Act 3 (Tether Sovereign 9, Prism Motes 8, Fever Pack 7). Clockwork does the same thing every turn and has no fight-long scaling, so it runs out of damage against the enrage and the big packs. **Next lever, if Clockwork needs more:** its late-game scalers, which are Culmination (8 decks, Δ +8; 3 per beat count → 4) and Polyrhythm. Not the commons, which now pull their weight.

### 15.4 What I did not change, and why

- **Defence (turtle vs spike).** Chronist turtle − spike was 18 points in p3 and 10 in p4 (target ≤ 10). The p3 gap is spike's boss-relic choice, not the pool. Spike takes **Fixed Star** in 35% of its Chronist runs and wins 34% of them, against 58% for runs that took another boss relic (p2: 32% vs 48%). Fixed Star ("only beat 3") turns off Crescendo and most of Clockwork, which is spike's most-assembled engine (51 of 100 runs). Turtle never takes it. Spike without Fixed Star is about 8 points behind turtle. **For the sim agent and the shared designer:** spike's measured boss-relic table rates Fixed Star too highly for the Chronist, or the relic is a trap for this class. The defence cards were already trimmed twice (§14.2). Lighthouse is the strongest card by deck Δ (+23.6 turtle/spike, +38.8 storm). It is a rare, and Storm (47%) is not above spike (48%), so I left it. It's the first card to trim if Storm pulls ahead.
- **Storm Reader / Oracle** is not dominant: 47% against spike's 48%. No pull-back.
- **Conjunction** sits at 32%. Its maximum turn is the class's highest (124), but it loses in Act 2 packs during the setup turns, which is the weakness §2.1 intends. Its payoffs average about 1 other card per batch, because Gather is rarely played (Hold the Hour on 60% of draws). Watch it; I'd buff Hold the Hour's Block before any Chorus number.
- **Class spread.** Under spike in p3: Breaker 58, Chronist 48, Graft 88. The Chronist is no longer the strong class. The spread is Graft's (and the encounters') to close; a further Chronist nerf would widen it.

---

## 16. Phase D: parity (2026-10-31)

Ruling 67: bring spike Chronist from 52.6% (`report-v2.md`, 1000 seeds) to 55–62% at the current levers (enemy damage 85 / HP 85), and fix the weak cards (`notes-v2.md`, fix items 3 and 10).

**The 52.6% baseline is stale.** Today's tree, before any Phase D card change, wins **77.5% ±6** with spike on seeds v2-0..199. On the same 157 seeds the report's runs won 56.1% and today's tree wins 79.6%. The shift is in the enemies, not the Chronist:
- HP lost per fight fell in Act 2 (7.2 → 5.9) and Act 3 (7.6 → 5.2).
- Per boss: Sovereign 32 → 13 HP, Leukarch 11 → 6, Furnace Heart 24 → 16.
- The sim agent's v2 priors also changed spike's Fixed Star pick rate.

The lead's instruction was then: fix the weak cards, but **no net buff**. Offset the fixes so the class lands where it started today. Inputs: the 25-seed card counterfactuals (a floor-1 extra copy, ±23 win / ±4–6 floors per card), the johnny engines (Clockwork 30%, Conjunction 34%), and Chronist taking the most damage per fight in Act 3 (8.0 HP).

**Method.** Paired-seed A/B, spike only, 200 seeds `v2-<i>-chronist`, `--workers 1`. Arm A is a snapshot of the tree before these changes; arms B and C are the same snapshot with only `chronist.ts` replaced.

### 16.1 Changes

Most flagged cards are Powers or setup pieces. The counterfactual adds one copy to the 11-card starter, which penalises Powers by a turn of tempo (the v2-baseline report noticed the same pattern). So the fixes target the tempo cost, or the dead-draw case, not the engine payoff.

| Card | Change | Data / reasoning |
|---|---|---|
| `eternal_return` | cost 2 → **1** (upgrade 1 → **0**) | cf −6.6 floors ** (−24.6 win), spike pick 5%. Calendar assembles in only 5% of runs. A 2-energy Power that pays off from turn 3 loses the fight it is drawn in. |
| `squall_line` | cost 1 → **0** | cf −6.2 floors **. It's dead until a Goad card is drawn. In its engine it's the best card (Storm johnny deck Δ +41, §15), so the payoff number stays and only the tempo tax goes. |
| `mainspring` | + **Draw 1** (a cantrip: On beat energy, Quicken 1, draw 1) | cf −28.6 win **; plays/draw 0.46. Off the beat it was a lost card slot even with Phase C's Quicken. Now it never costs a card. The energy stays gated on the beat. |
| `confluence` | **Gather removed**; 1 + 2 per Timeline card → **2 + 3** (upgrade 1 + 3 → 2 + 4) | cf −20.6 win **. The forced Gather pushed your own Delay Block (Tock, Storm Glass, Breakwater) out to the latest turn, so playing it for damage cost defence. Hold the Hour remains the Gather card. |
| `ephemeris` | Draw 2 → **3** (upgrade 3 → 4) | cf −5.3 floors, plays/draw 0.45: the least-played 1-cost card. Draw 2 + Quicken for 1 energy lost to Pulse Shot every time. |
| `total_eclipse` | threshold 3 → **2** cards resolving together | cf −3.8 floors, pick 5%. Conjunction assembles in 7% of runs, and batches of 3 almost never happen (Gather is played 0.9 times a run). Two Delay 1 cards played on the same turn now pair up. Ruling 65 still caps every card at two resolutions. |
| `pinion_jab` | 3 → **4** damage (upgrade 5 → 6) | cf −3.7 floors. The common Quicken cantrip; a 0-cost card should not be a net loss in a deck that isn't Clockwork. |
| `upbeat` | 3 → 4 Block in arm B, **reverted** in C | The "little defensive help". Dropped once the baseline turned out to be 77.5%. |
| `heave_to` | **offset**: Guard 2 → **1** (upgrade 5 → 3), +half forecast unchanged | The strongest Chronist card by counterfactual (+4.2 floors **), in 75–80% of spike decks. It is a turtle staple (turtle beats spike by 13). This trims passive defence, not an engine. |
| `weather_eye` | **offset**: Guard 5 → **4** (upgrade 7 → 6), +3 (+4) unchanged | In 59% of spike decks. Same reasoning. |

Not changed:
- **Accelerando** (−4.7 floors, not significant) was already made 0-cost in Phase C, after the report's snapshot.
- **Reckoning** (−3.8, not significant) is a Scrap rare whose value is one huge hit; the cf can't see that.
- No defence card was buffed further: turtle already beats spike by 13 points, and the brief is to make the greedy engine line win.

### 16.2 A/B result

Spike, Chronist, 200 paired seeds (v2-0..199), `--workers 1`, all on one snapshot. Only `chronist.ts` differs between the arms.

| arm | content | win | Δ vs A (paired, 95%) | HP lost / fight | floor |
|---|---|---|---|---|---|
| A | today's tree, before Phase D | **77.5%** | — | 5.64 | 45.2 |
| B | the eight weak-card fixes (16.1, Upbeat +1 included) | 83.5% | +6.0 ±7.0 | 5.13 | 46.1 |
| C (shipped) | B with Upbeat reverted, plus the Heave To and Weather Eye offsets | **74.5%** | **−3.0 ±8.0** (vs B −9.0 ±6.5) | 5.66 | 45.1 |

- **Net change: none.** The shipped pool lands where today's tree started; −3 is inside the noise, as the lead asked.
- **The weak cards are now real cards.** Decks holding each card at run end (of 200) and plays per draw, A → C:

  | card | decks | plays per draw |
  |---|---|---|
  | Mainspring | 11 → 154 | 0.57 → 0.71 |
  | Pinion Jab | 31 → 143 | |
  | Ephemeris | 1 → 112 | 0.37 → 0.52 |
  | Confluence | 3 → 61 | |
  | Eternal Return | 1 → 58 | |
  | Squall Line | 5 → 48 | 0.75 → 0.94 |
  | Total Eclipse | 1 → 5 | |

  Caveat: spike's measured prior only applies while a card's definition hash is unchanged. Changed cards fall back to the heuristic drafter, so pick counts move partly because of that, not only power. The win-rate deltas are the measure.
- **The defence offsets moved spike off passive Augury:** Heave To went from 149 to 59 decks and Weather Eye from 118 to 34. This is the "greedy engine over passive" direction the lead asked for. Turtle wasn't re-run, to stay within the RAM budget.
- **Total Eclipse is still a 5-deck card.** At threshold 2 it should be live; spike rarely takes a 2-cost rare Power. Next lever, if needed: cost 2 → 1.

### 16.3 Fixed Star (ruling 68)

The shared designer has reworked Fixed Star in `src/content/relics.ts`:
- **New text:** "+1 energy each turn. At the end of your turn, if you didn't stop on the beat (…), Strain 2."
- **Removed:** the `beatPositions: [3]` hook, which removed the 6th and 9th beats.

**Review: approved, with one text fix requested.** The check reads the beat count (cards played + Quicken), not "the number of cards you played". Two cards plus a Quicken make a count of 3, which is on the beat. The text should use the existing `beat count` term: "…if your beat count isn't on a beat, Strain 2". **Applied** by the shared designer: "+1 energy each turn. At the end of your turn, if your beat count isn't on a beat, Strain 2." Their test covers a 0-play turn (Strains) and a 3-play turn (doesn't).

The A/B snapshot predates this rework and still has the old Fixed Star in both arms, so the 16.2 deltas don't include it.
- Crescendo and Cadence are untouched now.
- The tax is a sequencing puzzle that Quicken can solve (Upbeat, Pinion Jab, Mainspring, Accelerando). That fits the "fixed, predictable turn shape" identity.
- Spike's prior for `fixed_star` is the stale v1 one (`notes-v2.md` §7), so the sim agent should regenerate it before reading spike's pick rate.

---

## 17. Phase E: Heroic (enemy HP 110) (2026-11-01)

Source: `docs/balance/report-v2-final.md` and `notes-v2-final.md`, src/ `d6015933c7b5e7fd`, enemy HP 110:
- spike Chronist is 45.7% (300 seeds; 42.7% on seeds 0–149), against Breaker 32.3 and Graft 33.7;
- johnny Conjunction is 13.3% and Calendar 21.7% (60 seeds each); Clockwork 33.3 and Storm 25.0.

The lead's ask: spike down about 6–8 points, by trimming generic or passive strength, not the engines; Conjunction and Calendar up to about 25%.

**Method.**
- Canonical snapshots (`SCRIPT=none sh sim/snapshot.sh`, rebuilt bundle, run from the snapshot root).
- Priors: v2 `eb1898ba2112aeeb`, v2-baseline `f31bca429f34b1d5`.
- The "before" reference is the final report's batch on the same seeds (src/ `d6015933c7b5e7fd`). Other agents' edits also landed between the two hashes, so "before → after" is the class's net movement, not my changes in isolation. A same-snapshot before arm (with `chronist.ts` reverted) was started and then dropped: at about 0.1 runs/s it would have doubled the 2-hour budget.
- `--workers 1`, seeds `v2-<i>-chronist`: spike 150, each johnny 60.
- **HP 110 is passed explicitly** (`--set enemyHpPct.all=110`). Since ruling 71 the tree's default tier is *Standard* (provisional 95), and `Game.newRun` uses it unless the run asks for Heroic. A bare run would measure 95, not the Heroic number the targets apply to.

### 17.1 Changes

| Card | Change | Why |
|---|---|---|
| `pinion_jab` | 4 → **3** damage (upgrade 6 → 5): the Phase D +1 is reverted | The most-drafted Chronist card under spike (204 of 300 decks, deck Δ +23). A generic 0-cost cantrip, not an engine payoff. |
| `lighthouse` | Block 7 → **4** (upgrade 10 → 7); the Guard (half of all forecast damage) is unchanged | Passive defence: deck Δ +28 in spike's 84 decks. It is Storm *glue*, not a Goad payoff (§15.1). |
| `total_eclipse` | cost 2 → **1** (upgrade 1 → 0) | The Conjunction multiplier sits in 18 of 60 Conjunction decks (Δ +13) and 5 of 200 spike decks. A 2-cost Power doesn't fit the setup turns the engine already loses (60% of its losses are in Act 2). This was the next lever named in §16.2. |
| `set_the_hour` | cost 1 → 0, upgrade Draw 2. **Reverted in round 3** | Played on only 40% (Calendar) and 48% (Conjunction) of draws. Reverted because of the round 2 data below. |
| `hold_the_hour` | Block 3 → **4** (upgrade 5 → 6) | The Gather card: deck Δ +22 in Conjunction decks, but played on 57% of draws. Gathering delays your Delay Block, so the card carries its own cover for the setup turn. Spike rarely takes it. |

**Round 2** (round 1, src/ `db811e7c2e62ccb3`, moved spike only from 42.7 to 42.0 on seeds 0–149). Spike now drafted the cheaper Set the Hour and Total Eclipse too, so two more generic trims followed:

| Card | Change | Why |
|---|---|---|
| `mainspring` | the base card loses Phase D's Draw 1; the **upgrade** keeps it (On beat: energy, Quicken 1, draw 1) | The base cantrip went from a trap (−28.6 win) to a staple: in 92 of 150 round-1 spike decks, deck Δ +29. It is generic tempo. Upgraded, it is still never a dead draw. |
| `breakwater` | 5 + Delay 8 → **4 + 7** (upgrade 7 + 11 → 6 + 10) | Passive defence, in 53 of 150 spike decks with deck Δ +17. A 1-point trim, so the Calendar johnny keeps its cover. |

**Round 2 result** (src/ `54fa09563ef97253`, enemy HP 110, seeds 0–149 / 0–59):

| | report (same seeds) | round 2 |
|---|---|---|
| spike | 42.7 | 40.7 ±7.9 (paired −2.0 ±9.4) |
| johnny-conjunction | 13.8 | **6.9** ±6.5 |
| johnny-calendar | 22.4 | 20.7 ±10.4 |
| johnny-clockwork | 32.8 | 27.6 ±11.5 |
| johnny-storm | 26.3 | 26.3 ±11.4 |

- At cost 0, spike put **Set the Hour in 99 of 150 decks** (deck Δ +20). A free Scheduled card resolves its cost for free, which is energy. It didn't lift Conjunction or Calendar.
- Total Eclipse at cost 1 is real: in 47 spike decks, deck Δ +37.
- Conjunction's deck is the same as before: Spring Tide (Delay 3), Noon Gun, Knell, Afterpeal, Ripple. It takes 9.2 HP a fight, 1.45 cards resolve a turn, and it Gathers 2.2 times a run. Its Chorus payoffs mostly see one other card, so at enemy HP 110 their delayed damage arrives too late and too small.

**Round 3** (engine-only buffs, plus the Set the Hour revert):

| Card | Change | Why |
|---|---|---|
| `set_the_hour` | back to cost 1 (upgrade cost 0) | Above: a generic energy card for spike, no engine gain. |
| Chorus cards: `ripple`, `afterpeal`, `spring_tide`, `knell`, `bell_choir` | Chorus +2 → **+3** (upgrades +3 → **+4**) | The Chorus number is the one stat that only pays in Conjunction. A typical batch adds 1–2 others; that's +1–2 damage per card for anyone else, +3–6 per card on a Gathered turn of four. |
| `noon_gun` | Chorus +3 → **+4** (upgrade +3 → **+5**) | Same; the common Chorus anchor. |

Syzygy (+6/+8) is unchanged: it was already the rare that scales.

**Round 3 result** (src/ `6a5304e07c6e7022`): spike **30.7 ±7.4** (paired −12.0 ±10.3 against the report on the same seeds). Johnny: Conjunction 11.7, Calendar 13.3, Clockwork 23.3, Storm 15.0. Between rounds 2 and 3 the only `src/` changes outside `chronist.ts` were `breaker.ts` and `graft.ts`, which Chronist runs don't load.
- Every Chronist bot fell about 10 points, including Storm, which no round-3 change touched. So the 0-cost Set the Hour (round 1) was propping up every persona: johnnies draft any off-engine card that draws, and a free Schedule is energy.
- The +1 Chorus did not lift Conjunction: batches still mostly hold 1–2 cards.
- That overshot the lead's −6 to −8, and every engine was now under 25.

**Round 4** (restore some generic strength, and buff the Delay engines' own numbers):

| Card | Change | Why |
|---|---|---|
| `breakwater` | back to 5 + Delay 8 (upgrade 7 + 11) | The round-2 trim landed with the Set the Hour revert, which already took more than asked. Breakwater is the Calendar johnny's cover. |
| `noon_gun`, `spring_tide` | Delay damage 12 → **14** (upgrades 15 → 17) | Conjunction's core Delay attacks pay 2–3 turns late. At enemy HP 110 the late damage has to be bigger, because Chorus rarely adds more than one other card. |
| `ripple` | 3 → **4** (upgrade 4 → 5) | Same. |
| `afterpeal` | delayed part 4 → **5** (upgrade 5 → 6) | Same. |
| `knell` | delayed part 7 → **8** (upgrade 9 → 10) | Same. |
| `bell_choir` | 5 → **6** (upgrade 7 → 8) | Same. |
| `appointed_hour` | 34 → **38** (upgrade 42 → 46) | The Calendar's hammer, and what Eternal Return recurs. The Calendar johnny dies early: 43% of its losses are in Act 1. |

**Round 4 result** (src/ `b69209b6edfc1bb9`): spike **39.3 ±7.8** (paired −3.3 ±10.2 against the report on the same seeds).

| johnny | before (report, same seeds) | round 4 |
|---|---|---|
| Conjunction | 13.3 | **23.3** ±10.7 |
| Calendar | 21.7 | 13.3 ±8.6 |
| Clockwork | 33.3 | 25.0 ±11.0 |
| Storm | 25.0 | 16.7 ±9.4 |

Spike and Conjunction are on target. Calendar and Storm fell: both lost what they had drafted for free (Set the Hour), and Storm also lost Lighthouse's Block. At 60 seeds each move is about one standard error, but the direction matches the change.

**Round 5** (one engine-only lever each):

| Card | Change | Why |
|---|---|---|
| `eternal_return` | the recurring card returns with Delay 2 → **Delay 1** | Calendar's multiplier. Assembled Calendar already wins +24 over unassembled, but it assembles in only 14% of runs and too late. With Delay 1, one payload recurs every turn instead of every other turn. **Loop safety (§8):** still at most `stacks` recurrences a turn (the `recurs` counter), and each lands next turn. That is one free card a turn, not a loop. Scrap cards still never return. |
| `squall_line` | 2 → **3** damage per Goad (upgrade 3 → 4) | Storm's best card when built around (§15: Δ +41). Only Goad-applying decks gain. |

Not changed: Tide Table (the Conjunction and Calendar draw payoff). See the next lever in 17.2.

### 17.2 Final result (enemy HP 110)

**Round 5 result: the shipped pool** (src/ **`938492b0a7281b3d`**, `--set enemyHpPct.all=110`, priors v2 `eb1898ba2112aeeb` + v2-baseline `f31bca429f34b1d5`, `--workers 1`).

| bot | seeds | report (`d6015933c7b5e7fd`, same seeds) | **shipped** | paired Δ |
|---|---|---|---|---|
| spike | v2-0..149 | 42.7 | **42.0 ±7.9** | −0.7 ±10.2 |
| johnny-conjunction | v2-0..59 | 13.3 | **23.3 ±10.7** | |
| johnny-calendar | v2-0..59 | 21.7 | **21.7 ±10.4** | |
| johnny-clockwork | v2-0..59 | 33.3 | **26.7 ±11.2** | |
| johnny-storm | v2-0..59 | 25.0 | **20.0 ±10.1** | |

Spike across the rounds, all on the same seeds: round 1 42.0, round 2 40.7, round 3 30.7, round 4 39.3, round 5 42.0.

**Reading it.**
- **Spike did not move the 6–8 points the lead asked for.** It is −0.7 against the report on seeds 0–149.
  - The report's own 300-seed figure (45.7) sits 3 points above its seeds 0–149 (42.7), so the shipped pool would read about 45 on the 300-seed canonical run.
  - At 150 seeds the half-width is ±8, so rounds 4 and 5 (39.3 and 42.0) agree with each other and with the report.
  - Round 3 showed the lever exists: without the free Set the Hour, spike fell to 30.7, and every engine fell with it.
- **Conjunction rose from 13 to 23**, which is the clearest move here (the round-4 Delay numbers).
- **Calendar holds at 22** (Eternal Return Delay 1 took it back up from 13 in round 4).
- **Clockwork (27) and Storm (20) fell** from 33 and 25. Clockwork lost the Phase D Pinion Jab +1 and Mainspring's base draw (both generic). Storm lost Lighthouse's Block.
- **HP lost per fight** went from 7.87 (round 2) to 8.12. Chronist still takes the most damage per fight.

**If the sim agent's 300-seed run still has Chronist spike above 45:** the next generic lever is **Tide Table**. It is in 62% of spike decks (deck Δ +17 to +28): draw on every Timeline resolution, for every deck, not just Conjunction. The options are cost 1 → 2, or "the first N resolutions each turn". After that, Banked Hours, which spike holds in 55–59% of decks. I'd leave the engines alone: three of the four johnnies are already under 25.

---

## 18. Phase F: a forgiving floor (2026-11-01, ruling 75)

Source: `docs/balance/report-v2-final-e.md`, src/ `9c9eea790ec3c309`.
- **Standard** (enemy HP 85, damage 75; the default tier): novice Chronist wins **3.3%**, against Breaker 11.3 and Graft 17.3. Timmy Chronist is the lowest class at 15.3.
- **Heroic:** spike Chronist 40.0% (300 seeds; 42.0 on seeds 0–149).

The ask: novice Chronist ≥ 8% at Standard, with Heroic spike within about ±3.

**Method.**
- A fresh canonical snapshot per round (`SCRIPT=none sh sim/snapshot.sh`, rebuilt bundle), run from the snapshot root, `--workers 1`, seeds `v2-0..149`.
- Novice and timmy run with `--difficulty standard`; spike with `--difficulty heroic`.
- Priors: v2 `eb1898ba2112aeeb`, v2-baseline `f31bca429f34b1d5`.
- Each arm is compared, seed by seed, with the report's batch on the same seeds: `sim/out/v2-final-e-std85` for Standard, `sim/out/v2-final-e` for Heroic.

### 18.1 Round 1: the cards (src/ `e881a43c09222e5e`)

Front-load the cards whose value only arrives with Timeline planning, and firm up plain defence:

| Card | Change |
|---|---|
| `tock` (starter) | 3 now + Delay 1: 5 → **5 now + Delay 1: 3** (upgrade 4 + 7 → 7 + 4). Same totals; it covers the turn it is played. Ruling 52 allows v2 starter edits. |
| `spring_tide` | gains an immediate **3 damage to ALL enemies** (upgrade 4). New players die to Act 2 packs. |
| `storm_glass` | **3 Block now** + Delay 1: 5 (+3 vs attacks); was Delay 1: 7 (+3). Upgrade 4 + 6 (+4). |
| `balance_wheel` | Block 6 → **7** (upgrade 8 → 9). |

| bot | report (same seeds) | round 1 | paired Δ |
|---|---|---|---|
| novice, Standard | 3.3 | 4.0 ±3.1 | +0.7 ±3.5 |
| timmy, Standard | 15.3 | 12.0 ±5.2 | −3.3 ±6.5 |
| spike, Heroic | 42.0 | 40.7 ±7.9 | −1.3 ±10.2 |

**Why the cards didn't move novice:**
- Novice Chronist already takes *less* damage per fight than novice Breaker: 6.8 / 10.1 / 10.4 HP in Acts 1 / 2 / 3, against 8.1 / 10.6 / 11.0.
- But it enters Act 2 with **52 HP against Breaker's 65**, and 105 of its 144 losses are in Act 2.
- The deficit is the HP pool: 66 against 78–80. A player who doesn't plan can't make that up with card quality.

### 18.2 Round 2: max HP (src/ `064bd5236a343f4b`)

| Change | Where |
|---|---|
| Chronist max HP 66 → **72** | `src/content/classes.ts` (shared file, one line; reverted) |

| bot | report (same seeds) | round 2 | paired Δ |
|---|---|---|---|
| novice, Standard | 3.3 | 5.3 ±3.6 | +2.0 ±4.3 |
| spike, Heroic | 42.0 | **54.7** ±8.0 | **+12.7 ±9.9** |

**Reverted.** Six HP lifts the skilled bot six times as much as the new player:
- spike converts every extra HP into a won fight;
- novice still dies in Act 2 (101 of 142 losses).

Max HP is the wrong lever for a new-player floor: it moves Heroic far past the ±3 budget. Round 2's timmy arm was stopped, and `classes.ts` is back to 66, identical to HEAD.

### 18.3 Round 3: more front-loading on the cards a new player drafts (src/ `4008e70451bf82ac`)

These are novice's most-drafted Chronist cards that spike rarely takes. Novice drafts by displayed damage and Block, so its deck fills with Delay attacks whose value arrives late:

| Card | Change |
|---|---|
| `noon_gun` | becomes a split card: **Deal 4 now** + Delay 2: 12, Chorus +4 (was Delay 2: 14 + 4). Upgrade 5 + 14 (+5), Opening kept. Novice's #1 pick (107 of 150 decks). |
| `bell_choir` | split: **2 to ALL now** + Delay 1: 5 to ALL, Chorus +3 (was Delay 1: 6). Upgrade 3 + 6 (+4). |
| `turn_the_tide` | base 3 → **6** (upgrade 6 → 9), + the full forecast. Played on 64% of novice draws, often against a move with nothing forecast. |
| `fermata` | 5 → **7** (upgrade 7 → 9), Crescendo unchanged. Novice's top Keep card; Keep without the beat plan was 5 damage for 1 energy. |

| bot | report (same seeds) | round 3 | paired Δ vs report |
|---|---|---|---|
| novice, Standard | 3.3 | 4.0 ±3.1 | +0.7 ±3.5 |
| timmy, Standard | 15.3 | 25.3 ±7.0 | +10.0 ±8.4 |
| spike, Heroic | 42.0 | **56.0** ±7.9 | **+14.0 ±10.3** |

Other agents changed `src/engine/run.ts`, `cards.ts`, `colorless.ts`, `tuning.ts` and `breaker.ts` between rounds 1 and 3. So I ran same-snapshot controls on round 3's snapshot, where only `chronist.ts` differs:

| control (snapshot 3, `chronist.ts` swapped) | src/ | spike, Heroic | novice, Standard |
|---|---|---|---|
| pre-Phase-F `chronist.ts` | `9d0b449ece2edaa5` | 41.3 ±7.9 (vs report −0.7 ±7.3) | 3.3 ±2.9 (vs report 0.0) |
| round 3 (shipped at that point) | `4008e70451bf82ac` | 56.0 (**+14.7 ±9.3** paired vs control) | 4.0 (+0.7) |
| round 1 only | `eb7c922091641c7b` | 48.0 (**+6.7 ±9.0** vs the pre-F control, against −0.7 on snapshot 1) | |

- The others' changes don't move Chronist: the pre-Phase-F control matches the report on both spike and novice.
- **Round 3 lifted spike by about 14 points and novice by 0.7.** Spike drafts and plays the split Noon Gun and Bell Choir and the 6-base Turn the Tide well. Novice drafts them too, but still dies in Act 2.
- **Reverted.** `chronist.ts` is byte-identical to its round-1 state.

### 18.4 Decision: Phase F ships no Chronist change

`src/content/cards/chronist.ts` and its tests are byte-identical to their pre-Phase-F state (Phase E, §17). `classes.ts` is identical to HEAD.

| lever | novice, Standard | spike, Heroic |
|---|---|---|
| front-loaded cards, round 1 | +0.7 ±3.5 | −0.7 ±9.4 on snapshot 1; **+6.7 ±9.0** on snapshot 3 (same content, same-snapshot control) |
| front-loaded cards, round 3 | +0.7 | **+14.7 ±9.3** |
| max HP 66 → 72 | +2.0 ±4.3 | **+12.7 ±9.9** |

- **No lever in the Chronist's own content reaches novice ≥ 8%.**
  - Each move is about the size of the noise.
  - Every move that helps novice at all helps spike several times more. Spike turns any extra margin into won fights; novice still dies to the Act 2 packs.
- Round 1 is thematically sound (Tock and Storm Glass defend the turn they're played). But it gave novice nothing measurable, and it may cost the Heroic budget: the two spike estimates average about +3.
- With content freezing after this round (ruling 75), shipping a change that misses its target and risks the constraint is the wrong trade.

**Why the Chronist novice loses.** Novice Chronist takes *less* damage per fight than novice Breaker: 8.2 HP against 9.8. But it starts with 66 HP against 80, and reaches Act 2 with 52 HP against 65. The gap is the HP pool at a skill level that can't plan around it, not the cards.

**Recommendation (lead / sim agent: the tier is theirs, ruling 71).** Make the forgiveness tier-specific: a per-class **Standard-only** max-HP bonus, e.g. `difficulty.standard.classMaxHp.chronist = +8`, applied in `createRun`.
- Round 2 suggests +6 HP buys novice about +2, so +8 to +12 is probably needed for ≥ 8%.
- It can't touch Heroic spike, which is exactly what every in-content lever failed to separate.
- The alternative is the Standard damage lever (75 → 70), which moves every class (notes-v2-final-e: damage moves novice far more than HP does).

**Hashes.** The report baseline is src/ `9c9eea790ec3c309`. Rounds: `e881a43c09222e5e` (1), `064bd5236a343f4b` (2), `4008e70451bf82ac` (3). Controls: `9d0b449ece2edaa5` (pre-F) and `eb7c922091641c7b` (round 1), both on round 3's snapshot. Priors: v2 `eb1898ba2112aeeb`, v2-baseline `f31bca429f34b1d5`. Outputs are in the session scratchpad `chf/`.
