# Balance report: v2

Generated 2026-10-31 by `sim/attribution.ts` from `/Users/chrises/git/vibespire/sim/out/v2/`. Personas: johnny-bastion, johnny-calendar, johnny-canopy, johnny-clockwork, johnny-compost, johnny-conjunction, johnny-counter, johnny-crazing, johnny-furnace, johnny-harvest, johnny-overflow, johnny-redline, johnny-reprise, johnny-ripe, johnny-scrapheap, johnny-storm, novice, spike, spike-v1, timmy, turtle. Reference persona for card and encounter tables: **spike**. Real `TUNING` levers (no neutral-tuning setup). Content: `src/` hash `70a06ab464db44a5 (145 files)` of `/private/tmp/claude-501/-Users-chrises-git-vibespire/ad9551df-c3ea-439b-9735-dee86876e114/scratchpad/snap-v2`. Re-run: `sh sim/v2-baseline.sh` (see docs/balance/README.md).

Persona batches: 39 (100/200/1000 runs each, seeds `v2-<i>-<class>`, paired across personas). Counterfactual relics: 135 relic x class variants on 30 paired seeds (policy spike). Counterfactual cards: 148 card x class variants on 25 paired seeds.

Counterfactual Δs are corrected for each baseline arm's sampling luck against the spike rate (every variant of a class shares its arm): relic breaker: baseline arm 60.0% vs spike 64.5% over 1000 runs (each Δ corrected by -4.5 win, -0.6 floors); relic graft: baseline arm 90.0% vs spike 87.3% over 1000 runs (each Δ corrected by +2.7 win, -0.5 floors); relic chronist: baseline arm 63.3% vs spike 52.6% over 1000 runs (each Δ corrected by +10.7 win, +1.9 floors); card breaker: baseline arm 56.0% vs spike 64.5% over 1000 runs (each Δ corrected by -8.5 win, -0.8 floors); card graft: baseline arm 92.0% vs spike 87.3% over 1000 runs (each Δ corrected by +4.7 win, -0.1 floors); card chronist: baseline arm 64.0% vs spike 52.6% over 1000 runs (each Δ corrected by +11.4 win, +1.3 floors).

**spike win rate**: breaker 64.5%, chronist 52.6%, graft 87.3%.

## PHASE_C scorecard

Targets from `docs/v2/PHASE_C.md`; ± is the 95% half-width.

| metric | target | measured | status |
| --- | --- | --- | --- |
| spike win, breaker | 30-45% | 64.5% ±3.0 | **MISSED** |
| spike win, chronist | 30-45% | 52.6% ±3.1 | **MISSED** |
| spike win, graft | 30-45% | 87.3% ±2.1 | **MISSED** |
| class spread under spike | <= 8 pts | 34.7 pts | **MISSED** |
| johnny engines, breaker | each >= 25% | bastion 55%, counter 69%, crazing 61%, furnace 59%, overflow 60%, redline 52%, reprise 55%, scrapheap 56% | met |
| johnny engines, chronist | each >= 25% | calendar 45%, clockwork 30%, conjunction 34%, overflow 33%, redline 31%, reprise 31%, scrapheap 32%, storm 48% | met |
| johnny engines, graft | each >= 25% | canopy 86%, compost 53%, harvest 58%, overflow 88%, redline 86%, reprise 86%, ripe 80%, scrapheap 85% | met |
| timmy | >= 15% | breaker 14%, chronist 13%, graft 33% | **MISSED** |
| novice | >= 8% | breaker 4%, chronist 2%, graft 25% | **MISSED** |
| turtle above spike | <= 10 pts | breaker -8, chronist +13, graft -11 | **MISSED** |
| stalemates | 0 in 1000 runs per class | 17 in 7800 runs | **MISSED** |
| non-boss relic Δwin | none > +12 | slow_temper +16, slag_bucket +12, coal_scuttle +15, fracture_engine +20, twin_scabbard +19, stormbreak_gem +15, bastion_core +12, parry_charm +12, star_pip +14, refrain_pin +24 | **MISSED** |
| relic traps | none < -8 | shard_crucible -8, exposed_core -10, heavy_heart -15, storm_lantern -13 | **MISSED** |
| cards significantly negative (cf) | none | blightcap (graft), clear_cut (graft), burn_bright (graft), squall_line (chronist), eternal_return (chronist), burn_bright (chronist) | **MISSED** |
| never-played cards | none | cutting_torch (chronist), cutting_torch (graft) | **MISSED** |

## Findings and recommendations

**What was measured.** A snapshot of the working tree on 2026-10-31 (no commit). The `src/` content
hash is in the header above: `70a06ab464db44a5`, 145 files. Real `TUNING` levers. Bots: spike v2 (measured
priors + paired-rollout drafting), timmy, turtle, novice, every johnny-<engine>, and spike-v1 (the v1
run model) for comparison. Run on 4 workers. A lid-close sleep paused the batch from 18:31 to 18:55; it
resumed without loss.

| batch | seeds | 95% half-width achieved |
|---|---|---|
| spike, per class | 1000 | ±2.1 to ±3.1 pts |
| timmy / turtle / novice, per class | 200 | ±2.5 to ±6.9 pts |
| johnny-<engine>, per class | 100 | ±6 to ±10 pts |
| relic counterfactuals: v2-new/changed + v1 top/bottom 15 (70 relics, 135 relic × class variants) | 30 paired | Δwin ±17 per relic × class (median), ±12 pooled; Δprog ±1.7 floors pooled |
| card counterfactuals: v2-new/reworked (148 card × class variants) | 25 paired | Δwin ±23.5 per card × class (median), Δprog ±3.9 floors |
| global lever grid (9 settings) | 80 per class per setting | ±5 to ±11 pts per cell |

Budget note: the chain took about 3 h 25 min (18:02–21:30 wall, 25 min of it the lid-close pause) of compute against the ~2.5 h target. Spike v2's rollout
drafting costs about 1.8× a v1 run. I cut the seed counts in the order you listed and stopped there.

### 1. Headline

- **The game is now too easy for the strong bot, and very uneven between classes.**
  - Spike: Breaker 64.5% ±3.0, Chronist 52.6% ±3.1, **Graft 87.3% ±2.1**. The class spread is 34.7 points (target ≤ 8).
  - Every class is above the 30–45% band.
- **Your spot check ("Breaker ~32% vs ~72%") does not reproduce with spike v2.** Breaker is second here,
  not last. The same planner with the v1 run model (`spike-v1`, 200 seeds) gives
  Breaker 44.5%, Chronist 56.0%, Graft 56.5% ±6.9. So the gap is mostly a drafting effect: spike v2 lifts Breaker
  by +20 and **Graft by +31**. Graft's ceiling is far above what a heuristic drafter finds (section 2). Neither
  bot reproduces "Breaker ~32%"; that check must have used another bot or tree.
- **Greed still loses.**
  - Timmy: Breaker 13.5%, Chronist 13.0%, Graft 32.5% (target ≥ 15%).
  - Novice: Breaker 3.5%, Chronist 1.5%, Graft 25.0% (target ≥ 8%).
  - Only Graft is forgiving.
- **Turtle is no longer the best bot.** It is −8 and −11 points under spike on Breaker and Graft. Chronist is the exception (turtle +13).

### 2. Class spread: why each class lands where it does

| class | spike win | HP lost per fight, A1/A2/A3 | turns per fight, A1/A2/A3 | median best turn | first 60-damage turn (median floor) | where losses happen |
|---|---|---|---|---|---|---|
| Breaker | 64.5% | 5.2 / 5.9 / 6.8 | 4.8 / **6.7 / 6.7** | 77 | **32** | 77% in Act 3: Leukarch 36%, Sovereign 23% of deaths |
| Chronist | 52.6% | 5.5 / 7.0 / **8.0** | 3.9 / 4.3 / 4.4 | 104 | 22 | 55% in Act 3; Sovereign, Fever Pack, Oracle Pack |
| Graft | 87.3% | 5.8 / 5.3 / **5.6** | 3.9 / **3.6 / 3.4** | 127 | 24 | spread thin; Archivist 6, Sovereign 3 (of 200) |

- **Graft is the outlier, and its power is in drafting wide.** Spike v2 skips 23% of rewards (spike-v1:
  39%), ends at 29.6 cards (spike-v1: 23.2) and wins 89% (spike-v1: 56%). Its top picks are the deck-size and
  Bloom-count scalers: Shed Husk, Tendril Reach, **Living Hedge** (Block per Bloom card each turn), **Hivestrike**,
  Thornwhirl. Graft gets stronger as the deck gets wider, while every other class gets weaker. It kills fastest and
  takes the least damage in Acts 2–3. It wins 73–75%
  whichever engine it builds (section 1b: assembled vs not ≈ ±2 points for Canopy and Harvest), so the strength
  is in its base kit, not in one engine. Card candidates are in section 3 (counterfactuals). The v2 Bloom
  rules (Spill on, `TUNING.bloomSpill = true`, plus Ripe) affect every Graft deck and are the likely common
  cause. Graft cap hits are 38 per run (Bloom). Recommend an A/B of `bloomSpill` before touching cards. It
  is a boolean, so it needs a sweep option, not a `--set`.
- **Breaker survives Acts 1–2 well, then dies to Act 3 bosses.** Its fights in Acts 2–3 take twice as many turns as Graft's, and
  its first 60-damage turn comes at floor 32. Its damage comes online late. Leukarch (33% deaths per fight, 39 HP,
  16.7 turns) and Sovereign (33%, 38 HP, 16.6 turns) scale over long fights and punish exactly that.
  - **Breaker engines.**
    - Furnace assembles in 74% of runs, but assembled decks win only +3 over unassembled ones.
    - Bastion is −9.4 assembled vs not, and its johnny stalemates (4 of 100). Bastion is a stall engine, not a win engine.
    - Counter is the best Breaker plan (johnny 69%).
    - Crazing assembles late (floor 23).
  - **Breaker relics are among the strongest in the game:** Twin Scabbard +23, Coal Scuttle +20, Fracture Engine +37 on Breaker. They are not what holds it back.
- **Chronist is the weakest under spike.**
  - Its johnnies sit at 30–48%: Clockwork 30%, Conjunction 34%, Calendar 45%, Storm 48%.
  - It takes the most damage per fight in Act 3 (8.0).
  - Clockwork is the one engine that clearly pays off when assembled (+13.6 points), but its johnny still wins only 30%.
  - Fixed Star (section 7) and Exposed Core (−33 on Chronist) are traps spike takes.

### 3. Engines (section 1b)

- **Assembling an engine is not what wins runs.** The class docs target +10 to +25 points for an assembled engine.
  - Only Clockwork (+13.6) is in range.
  - Furnace +3, Counter +1, Canopy +1, Harvest +2 are near zero.
  - Bastion −9 and Ripe −14 are negative. Ripe assembles late (floor 22) and its decks win less than ones that just take good cards.
- **The shared engines never assemble.** Overflow, Redline, Reprise and Scrapheap are 0% everywhere, because their pieces are colourless cards, which appear only in shops. Their johnny bots win like spike only because they play like spike. If shared engines are meant to be drafted, colourless cards need a route into card rewards.

### 4. Stalemates

There were **4 in 3000 spike runs** (all Breaker): 2 × Furnace Heart (`v2-22-breaker`, `v2-578-breaker`) and 2 × Mother
Orchid (`v2-70-breaker`, `v2-851-breaker`). All personas together: 17 in 7200 runs, all Breaker (bastion and turtle mostly).

- **Traced `v2-22-breaker`: a bot flaw, not content.** Furnace Heart sat at 166 HP with Stagger 19, its hits dealing 0–3. The planner looped Iron Rhythm, Bind the Blade and Cool the Steel with two Hammerfalls in hand. With no turn cap, the identical state repeated to turn 12,590.
  - Cause: in long fights the planner's damage-per-turn estimate decays, turns-to-kill hits its cap, and dealing damage stops changing the score.
  - **Fixed** in `sim/policies/lib/planner.ts` (a stall breaker: after turn 12, credit enemy HP removed this turn, weight +0.05 per turn up to 1).
  - With the fix, all 4 stalemate seeds finish (2 wins, 2 losses). This measurement ran before the fix, so a re-run of the spike batch would show 0 here.
- **Traced `v2-70-breaker` (Orchid): bot plus content.** Mother Orchid heals 10 HP every 4 moves (Nectar Feast) and keeps summoning buds. The bot spent its damage on the buds. With the fix it loses on turn 67 instead of stalling. Content risk: a healing boss with endless spawns and no enrage is a stall source for any low-damage deck.

### 5. Leukarch and Sovereign ("now too hard")

| boss | class | deaths per fight | HP lost (% max) | turns | v1 baseline (deaths, HP) |
|---|---|---|---|---|---|
| Leukarch | Breaker | 33% | 39.4 (48%) | 16.7 | 8%, 12.5 |
| Leukarch | Chronist | 9% | 13.5 (20%) | 8.8 | 0%, 3.0 |
| Leukarch | Graft | 3% | 10.9 (13%) | 7.0 | 10%, 22.1 |
| Sovereign | Breaker | 33% | 37.9 (46%) | 16.6 | 18%, 23.1 |
| Sovereign | Chronist | 28% | 33.1 (47%) | 11.2 | 0%, 5.7 |
| Sovereign | Graft | 5% | 23.7 (29%) | 9.1 | 17%, 31.0 |

Both bosses are hard **for slow decks**. Graft kills them in 7–9 turns and barely loses. Breaker needs 16–17 turns
and dies a third of the time. A global nerf would make them free for Graft, and the Archivist is already the easy third
option (deaths 3–17%). Recommendation:
- Leave the bosses mostly as they are.
- Fix Breaker's late damage (section 2).
- Cap Sovereign's scaling for very long fights only if Breaker still struggles after that.
- Sovereign also hurts Chronist (28%). Look at which Sovereign move does it (`moveDamage` in section 2 of the report).

### 6. Global levers (spike, `enemyDamagePct` / `enemyHpPct`, all acts)

Grid with spike, 80 seeds per class per cell (±~10 pts per cell; prefix `sweep`). Both levers apply to every act
(`enemyDamagePct.all` / `enemyHpPct.all`, a new override key). Spike win % (full table: `sim/out/v2/sweep.txt`):

| enemyDamagePct / enemyHpPct | Breaker | Graft | Chronist |
|---|---|---|---|
| **85 / 85 (current)** | 66 | 85 | 51 |
| 85 / 100 | 54 | 78 | 43 |
| 85 / 115 | 44 | 66 | 28 |
| 100 / 85 | 35 | 53 | 14 |
| 100 / 100 | 19 | 44 | 3 |
| 100 / 115 | 8 | 30 | 0 |
| 115 / 85 | 14 | 38 | 13 |

- **Damage is about 3× steeper than HP.** +15% enemy damage costs Breaker 31, Graft 32 and Chronist 37 points. +15% enemy HP costs 9–12. Chronist, which already takes the most damage per fight, is the most sensitive to damage.
- **No single global setting puts all three classes in 30–45% while the spread is 35 points.** For example, 85/115 gives 44 / 66 / 28 and 100/85 gives 35 / 53 / 14.

**Recommendation:**
1. Fix the spread first (fix list items 1–4).
2. Then move **enemyHpPct, not enemyDamagePct**. It is the gentle lever (about −0.7 pts per +1%) and hurts the fragile class least.
3. With today's content, `enemyHpPct.all = 100` (damage stays 85) is a safe first step: it gives 54 / 78 / 43 and is still too easy for Graft.
4. Once Graft is near Breaker, expect roughly 100–110 HP to land spike at 35–45%. Confirm with `npx tsx sim/sweep.ts --runs 300 --policy spike --workers 4 --knob enemyHpPct.all=100,105,110`.
5. Keep `enemyDamagePct` at 85, or at most 90 if Act 1 stays trivial. Per-act values are worth it only after the class fixes.

### 7. Fixed Star

- Fixed Star's hook `beatPositions: () => [3]` leaves one beat per turn. Crescendo scales with the beat index, which can then never pass 1, so **every Crescendo card is switched off**.
- **Spike takes it in 80% of offers** (60 of 75; turtle 29%, timmy 42%). Chronist runs holding it win 40% vs 59% without (observational).
- Spike takes it because its measured prior comes from the v1 counterfactual, before Crescendo existed. The definition is unchanged, so the hash still matches. **A hash-matched prior can be stale when the surrounding card pool changes**; I'll regenerate the priors from this v2 data (see the fix list).
- Paired counterfactual: **Fixed Star granted to johnny-clockwork: Δwin −17.5 ±10.3 points, Δprog −2.7 ±2.6 floors (80
  paired seeds; baseline 35%).** It is a trap for exactly the deck it is offered to. Recommend:
  - let Crescendo count beats by plays (the beat index) independently of beat positions, or
  - drop the Crescendo clash and give Fixed Star a different drawback.
  Until then spike will keep taking it (stale prior).

### 8. Outliers

The full tables are sections 3 and 4 below. Counterfactual Δs there are **corrected for baseline-arm luck**
(header): the 25–30-seed baseline arms were +11 (Chronist) and −8 (Breaker) points off the 1000-run spike rate,
and before the correction every Chronist item looked about 11 points worse than it is. ** marks an interval
excluding 0.

- **Relics, overpowered:**
  - Perpetual Calendar (Chronist boss) +27 ±14 **
  - Refrain Pin (Chronist rare) +24 ±18 **, 89 triggers per run
  - Fracture Engine +20 ±10 ** (+37 on Breaker)
  - Twin Scabbard (Breaker rare) +19 ±18 **
  - Slow-Temper Alloy +16 ±10 **
  - Star Pip (Chronist common) +14, Δprog ** +4.5 floors
  - Coal Scuttle +16, Bastion Core +12 (not significant)
- **Relics, traps:**
  - Shard Crucible −8 ±7 **
  - Heavy Heart −15, Exposed Core −10 (−33 on Chronist), Storm Lantern −13, Stasis Engine −5 (not significant at this sample)
  - The reworked Cracked Hourglass is fixed (+6).
- **Cards (new or reworked, 25 seeds, so only big effects show):**
  - **Chronist, significantly negative:** Eternal Return −6.6 floors **, Squall Line −6.2 **, Mainspring −29 win **, Confluence −21 win **.
  - **Chronist, weak but not significant:** Ephemeris, Accelerando, Total Eclipse, Reckoning, Pinion Jab, all −4 to −5 floors.
  - **Graft:** Clear-Cut −4.4 ** and Blightcap −2.3 ** (v1 flagged Blightcap too); Propagate −2.3 (v1 too).
  - **Breaker:** nothing significant either way. Plate Ram −20 win and Breach Hammer −2.6 floors are the weakest.
  - **Strongest:** Heave To +4.2 floors ** (Chronist); Downbeat, En Garde, Answer in Kind, Worldbreaker, Heartwood Spear and Burst Pod lead their classes (not significant).
- **Colourless:**
  - Weakest: Burn Bright (significantly negative on Graft and Chronist), Blood Tithe, Cutting Torch, Bait Flare, Shrapnel Charge.
  - **Cutting Torch is still never played** (plays/draw 0).

### 9. Bot caveats

- **Spike v2's numbers include rollout drafting and v1-measured priors.** For relics unchanged since v1 (Fixed Star, Tender Plating, Stasis Engine) the prior predates v2 synergies. Spike's top boss picks were Tender Plating, Stasis Engine and Fixed Star.
- **A Riposte card is primed, not played**, so plays/draw undercounts Riposte cards.
- **Peeked draws** (the planner sees the real next card) make draw cards an upper bound.

### Prioritised fix list (one owner each)

1. **Graft is overtuned for a skilled drafter (87% under spike v2). Owner: Graft designer.** Cap or slow the wide-deck scalers first: Living Hedge (Block per Bloom card), Hivestrike, Tendril Reach. Then A/B `TUNING.bloomSpill` (sim agent, below). Target: spike Graft into 30–45% after item 5.
2. **Fixed Star switches off Crescendo (−17.5 for the clockwork deck). Owner: shared designer** (relic), with the Chronist designer agreeing the Crescendo rule.
3. **Chronist weak cards. Owner: Chronist designer.** Eternal Return, Squall Line, Mainspring, Confluence, then Ephemeris, Accelerando, Total Eclipse, Pinion Jab. Clockwork and Conjunction johnnies sit at 30–34%.
4. **Overpowered relics. Owner: shared designer.** Perpetual Calendar, Refrain Pin, Fracture Engine, Slow-Temper Alloy, Star Pip. Breaker owns Twin Scabbard (+19).
5. **Global levers. Owner: lead / encounters agent.** Apply the sweep recommendation (section 6) **after** items 1–4. A single lever cannot fix a 35-point spread.
6. **Breaker's late damage (first 60-damage turn at floor 32; Act 3 fights 16+ turns). Owner: Breaker designer.** Make Furnace or Counter pay off earlier, so Leukarch and Sovereign do not need nerfs.
7. **Leukarch and Sovereign. Owner: encounters agent.** No global nerf: they are hard only for slow decks (Graft kills them in 7–9 turns). Revisit after item 6. Give Mother Orchid a stall breaker (she heals 10 HP every 4 moves with endless buds).
8. **Traps. Owner: shared designer.** Shard Crucible (−8 **), Exposed Core (−33 on Chronist), Heavy Heart. Cutting Torch is still never played.
9. **Shared engines never assemble (colourless is shop-only). Owner: lead / shared designer.** Decide whether colourless cards enter card rewards.
10. **Assembled engines barely beat unassembled ones** (Bastion −9, Ripe −14). **Owner: each class designer.** Payoffs should scale harder once the multiplier lands.
11. **Sim (me):**
    - the stall-breaker fix is landed; it needs a spike re-run to confirm 0 stalemates;
    - regenerate the priors from v2 data (the stale v1 prior made spike take Fixed Star);
    - add a sweep option for boolean levers (`bloomSpill`);
    - a bot targeting heuristic for leaders whose minions die with them (Orchid).

## 1. Win rate by personality

Win rate with its 95% half-width. "Beat A1/A2" = runs past the act boss. Deaths by act are shares of the losses. Every persona plays the same seeds.

### breaker

| persona | runs | win | beat A1 | beat A2 | deaths A1/A2/A3 | HP lost / fight | skip rate | deck at end | elites / run | removals / run | stalemates | top death encounters |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| johnny-counter | 100 | 69.0% ±9.1 | 98% | 93% | 6% / 16% / 77% | 5.5 | 17% | 32.7 | 3.3 | 3.5 | 2 | a3_leukarch 45%, a3_sovereign 13%, a1_orchid 6% |
| spike | 1000 | 64.5% ±3.0 | 99% | 92% | 2% / 20% / 77% | 5.9 | 23% | 31.0 | 3.2 | 3.4 | 4 | a3_leukarch 36%, a3_sovereign 23%, a3_archivist 7% |
| johnny-crazing | 100 | 61.0% ±9.6 | 98% | 81% | 5% / 44% / 51% | 7.0 | 21% | 30.4 | 2.7 | 3.2 | 0 | a3_leukarch 28%, a3_sovereign 10%, a2_trihammer 10% |
| johnny-overflow | 100 | 60.0% ±9.6 | 97% | 85% | 8% / 30% / 63% | 6.1 | 30% | 28.0 | 3.0 | 3.3 | 0 | a3_leukarch 28%, a3_sovereign 23%, a2_furnace 10% |
| johnny-furnace | 100 | 59.0% ±9.6 | 99% | 85% | 2% / 34% / 63% | 7.0 | 13% | 33.1 | 2.7 | 3.3 | 0 | a3_sovereign 29%, a3_leukarch 12%, a3_archivist 10% |
| turtle | 200 | 57.0% ±6.9 | 96% | 82% | 10% / 31% / 58% | 5.7 | 40% | 24.7 | 1.7 | 3.2 | 5 | a3_leukarch 35%, a2_assembler 14%, a3_sovereign 9% |
| johnny-scrapheap | 100 | 56.0% ±9.7 | 96% | 84% | 9% / 27% / 64% | 6.1 | 32% | 27.6 | 3.3 | 3.2 | 0 | a3_leukarch 39%, a2_furnace 11%, a3_sovereign 9% |
| johnny-bastion | 100 | 55.0% ±9.8 | 93% | 84% | 16% / 20% / 64% | 6.1 | 14% | 31.9 | 2.9 | 3.4 | 4 | a3_leukarch 27%, a3_sovereign 11%, a1_orchid 11% |
| johnny-reprise | 100 | 55.0% ±9.8 | 100% | 87% | 0% / 29% / 71% | 6.2 | 32% | 28.1 | 3.1 | 3.3 | 0 | a3_leukarch 27%, a3_sovereign 18%, a3_archivist 16% |
| johnny-redline | 100 | 52.0% ±9.8 | 98% | 84% | 4% / 29% / 67% | 6.3 | 30% | 27.9 | 3.2 | 3.4 | 2 | a3_leukarch 31%, a3_sovereign 23%, a2_furnace 8% |
| spike-v1 | 200 | 44.5% ±6.9 | 94% | 71% | 11% / 41% / 48% | 7.7 | 38% | 23.9 | 2.5 | 2.8 | 0 | a3_leukarch 23%, a2_oracle_golem 9%, a2_oracle_pack 9% |
| timmy | 200 | 13.5% ±4.7 | 95% | 41% | 6% / 62% / 31% | 9.7 | 0% | 31.6 | 2.3 | 2.4 | 0 | a2_oracle_golem 8%, a2_oracle_pack 8%, a2_golem_riveter 7% |
| novice | 200 | 3.5% ±2.5 | 84% | 18% | 17% / 68% / 15% | 9.9 | 0% | 30.9 | 1.6 | 0.1 | 0 | a2_oracle_golem 9%, a2_oracle_pack 9%, a2_anvil_hammer 7% |

Damage sources (share of all HP lost, top 3 enemy moves) per persona:

| persona | top moves |
| --- | --- |
| johnny-bastion | leukarch:cilia_storm 6%, thornback:gore 5%, bramble_ram:bramble_charge 5% |
| johnny-counter | leukarch:cilia_storm 7%, thornback:gore 6%, void_geometer:hyperedge 4% |
| johnny-crazing | thornback:gore 5%, void_geometer:hyperedge 5%, void_mote:null_pulse 4% |
| johnny-furnace | thornback:gore 5%, void_geometer:hyperedge 5%, void_mote:null_pulse 4% |
| johnny-overflow | thornback:gore 6%, leukarch:cilia_storm 5%, void_geometer:hyperedge 5% |
| johnny-redline | leukarch:cilia_storm 6%, thornback:gore 5%, void_geometer:hyperedge 4% |
| johnny-reprise | leukarch:cilia_storm 6%, thornback:gore 5%, void_geometer:hyperedge 4% |
| johnny-scrapheap | leukarch:cilia_storm 7%, thornback:gore 5%, void_geometer:hyperedge 4% |
| novice | thornback:gore 7%, rivet_gnasher:nip 5%, slag_golem:ingot_slam 4% |
| spike | thornback:gore 6%, leukarch:cilia_storm 6%, void_geometer:hyperedge 5% |
| spike-v1 | thornback:gore 5%, void_geometer:hyperedge 4%, slag_golem:ingot_slam 4% |
| timmy | thornback:gore 6%, riveter:rivet_burst 5%, rivet_gnasher:nip 4% |
| turtle | leukarch:cilia_storm 6%, thornback:gore 5%, rivet_gnasher:lunge 4% |

### chronist

| persona | runs | win | beat A1 | beat A2 | deaths A1/A2/A3 | HP lost / fight | skip rate | deck at end | elites / run | removals / run | stalemates | top death encounters |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| turtle | 200 | 65.5% ±6.6 | 99% | 84% | 3% / 43% / 54% | 5.8 | 45% | 26.2 | 1.6 | 0.1 | 0 | a3_sovereign 12%, a2_oracle_golem 12%, a3_leukarch 9% |
| spike-v1 | 200 | 56.0% ±6.9 | 98% | 74% | 5% / 56% / 40% | 6.8 | 41% | 26.2 | 2.3 | 0.1 | 0 | a2_oracle_pack 18%, a2_trihammer 11%, a3_sovereign 9% |
| spike | 1000 | 52.6% ±3.1 | 99% | 79% | 3% / 42% / 55% | 6.7 | 30% | 29.5 | 2.3 | 0.4 | 0 | a3_sovereign 12%, a3_fever_pack 11%, a2_oracle_pack 9% |
| johnny-storm | 100 | 48.0% ±9.8 | 94% | 74% | 12% / 38% / 50% | 6.9 | 30% | 28.7 | 2.1 | 0.1 | 0 | a3_sovereign 12%, a3_prism_motes 12%, a2_oracle_golem 10% |
| johnny-calendar | 100 | 45.0% ±9.8 | 97% | 67% | 5% / 55% / 40% | 7.3 | 29% | 28.8 | 1.9 | 0.1 | 0 | a3_fever_pack 11%, a2_trihammer 11%, a2_golem_riveter 11% |
| johnny-conjunction | 100 | 34.0% ±9.3 | 99% | 62% | 2% / 56% / 42% | 7.5 | 19% | 31.2 | 1.8 | 0.5 | 0 | a3_fever_pack 20%, a2_oracle_pack 12%, a2_golem_riveter 9% |
| johnny-overflow | 100 | 33.0% ±9.2 | 95% | 70% | 7% / 37% / 55% | 7.3 | 36% | 27.0 | 2.1 | 0.3 | 0 | a3_sovereign 16%, a3_fever_pack 12%, a3_warden_geometer 10% |
| johnny-scrapheap | 100 | 32.0% ±9.1 | 96% | 71% | 6% / 37% / 57% | 7.1 | 37% | 26.8 | 2.1 | 0.2 | 0 | a3_sovereign 16%, a2_oracle_pack 10%, a3_warden_geometer 10% |
| johnny-redline | 100 | 31.0% ±9.1 | 97% | 68% | 4% / 42% / 54% | 7.4 | 35% | 27.1 | 2.0 | 0.2 | 0 | a3_sovereign 19%, a2_furnace 10%, a2_oracle_pack 9% |
| johnny-reprise | 100 | 31.0% ±9.1 | 97% | 71% | 4% / 38% / 58% | 7.2 | 37% | 26.8 | 2.1 | 0.3 | 0 | a3_sovereign 19%, a3_fever_pack 16%, a3_warden_geometer 12% |
| johnny-clockwork | 100 | 30.0% ±9.0 | 97% | 76% | 4% / 30% / 66% | 7.2 | 22% | 31.5 | 2.2 | 0.2 | 0 | a3_sovereign 14%, a3_prism_motes 10%, a3_fever_pack 9% |
| timmy | 200 | 13.0% ±4.7 | 92% | 28% | 10% / 72% / 18% | 8.6 | 0% | 33.8 | 2.0 | 0.2 | 0 | a2_oracle_pack 11%, a2_golem_riveter 9%, a2_oracle_golem 9% |
| novice | 200 | 1.5% ±1.7 | 81% | 9% | 20% / 73% / 8% | 8.6 | 0% | 28.4 | 1.4 | 0.1 | 0 | a2_oracle_pack 13%, a2_golem_riveter 12%, a2_oracle_golem 9% |

Damage sources (share of all HP lost, top 3 enemy moves) per persona:

| persona | top moves |
| --- | --- |
| johnny-calendar | thornback:gore 7%, rivet_gnasher:nip 6%, rivet_gnasher:lunge 6% |
| johnny-clockwork | thornback:gore 6%, void_mote:null_pulse 5%, void_geometer:hyperedge 4% |
| johnny-conjunction | thornback:gore 7%, rivet_gnasher:nip 6%, rivet_gnasher:lunge 5% |
| johnny-overflow | thornback:gore 7%, rivet_gnasher:nip 5%, riveter:rivet_burst 4% |
| johnny-redline | thornback:gore 7%, rivet_gnasher:nip 5%, void_mote:null_pulse 4% |
| johnny-reprise | thornback:gore 7%, rivet_gnasher:nip 5%, void_geometer:hyperedge 4% |
| johnny-scrapheap | thornback:gore 7%, rivet_gnasher:nip 5%, riveter:rivet_burst 4% |
| johnny-storm | thornback:gore 7%, rivet_gnasher:nip 5%, riveter:rivet_burst 4% |
| novice | thornback:gore 10%, rivet_gnasher:nip 8%, rivet_gnasher:lunge 7% |
| spike | thornback:gore 7%, void_mote:null_pulse 5%, rivet_gnasher:lunge 5% |
| spike-v1 | thornback:gore 8%, rivet_gnasher:nip 5%, riveter:rivet_burst 5% |
| timmy | thornback:gore 8%, rivet_gnasher:nip 6%, rivet_gnasher:lunge 5% |
| turtle | thornback:gore 7%, rivet_gnasher:nip 5%, void_mote:null_pulse 5% |

### graft

| persona | runs | win | beat A1 | beat A2 | deaths A1/A2/A3 | HP lost / fight | skip rate | deck at end | elites / run | removals / run | stalemates | top death encounters |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| johnny-overflow | 100 | 88.0% ±6.4 | 100% | 97% | 0% / 25% / 75% | 5.5 | 30% | 27.6 | 3.2 | 5.0 | 0 | a3_sovereign 33%, a3_fever_pack 25%, a3_warden_geometer 8% |
| spike | 1000 | 87.3% ±2.1 | 100% | 96% | 3% / 26% / 71% | 5.6 | 23% | 29.8 | 3.1 | 5.0 | 0 | a3_sovereign 25%, a3_archivist 13%, a3_leukarch 6% |
| johnny-canopy | 100 | 86.0% ±6.8 | 96% | 95% | 29% / 7% / 64% | 5.8 | 16% | 33.5 | 3.0 | 4.5 | 0 | a1_ram 21%, a3_geometer 14%, a3_fever_pack 14% |
| johnny-redline | 100 | 86.0% ±6.8 | 99% | 95% | 7% / 29% / 64% | 5.7 | 29% | 27.8 | 3.1 | 4.8 | 0 | a3_sovereign 21%, a3_warden_geometer 14%, a2_furnace 14% |
| johnny-reprise | 100 | 86.0% ±6.8 | 99% | 95% | 7% / 29% / 64% | 5.6 | 29% | 27.4 | 3.0 | 5.2 | 0 | a3_sovereign 29%, a3_leukarch 14%, a3_warden_geometer 14% |
| johnny-scrapheap | 100 | 85.0% ±7.0 | 100% | 97% | 0% / 20% / 80% | 5.5 | 27% | 28.2 | 3.1 | 5.1 | 0 | a3_sovereign 33%, a3_warden_geometer 20%, a2_trihammer 13% |
| johnny-ripe | 100 | 80.0% ±7.8 | 98% | 94% | 10% / 20% / 70% | 5.9 | 22% | 31.8 | 3.0 | 4.4 | 0 | a3_sovereign 55%, a1_ram 5%, a3_archivist 5% |
| turtle | 200 | 76.5% ±5.9 | 99% | 93% | 4% / 26% / 70% | 6.0 | 44% | 23.3 | 1.6 | 4.3 | 0 | a3_warden_geometer 21%, a3_sovereign 19%, a3_archivist 11% |
| johnny-harvest | 100 | 58.0% ±9.7 | 99% | 87% | 2% / 29% / 69% | 7.5 | 21% | 29.8 | 2.5 | 4.1 | 0 | a3_sovereign 24%, a3_archivist 10%, a3_warden_geometer 10% |
| spike-v1 | 200 | 56.5% ±6.9 | 100% | 82% | 1% / 41% / 57% | 7.7 | 39% | 23.2 | 2.5 | 4.5 | 0 | a3_sovereign 11%, a3_warden_geometer 10%, a2_golem_riveter 8% |
| johnny-compost | 100 | 53.0% ±9.8 | 99% | 84% | 2% / 32% / 66% | 7.3 | 18% | 29.4 | 2.8 | 5.7 | 0 | a3_sovereign 23%, a2_trihammer 17%, a3_archivist 9% |
| timmy | 200 | 32.5% ±6.5 | 95% | 59% | 8% / 53% / 39% | 9.0 | 0% | 33.6 | 2.6 | 4.5 | 0 | a2_trihammer 11%, a2_oracle_pack 10%, a3_sovereign 9% |
| novice | 200 | 25.0% ±6.0 | 95% | 51% | 7% / 59% / 34% | 8.6 | 0% | 34.5 | 2.3 | 3.0 | 0 | a3_sovereign 9%, a2_oracle_golem 7%, a2_anvil_hammer 7% |

Damage sources (share of all HP lost, top 3 enemy moves) per persona:

| persona | top moves |
| --- | --- |
| johnny-canopy | thornback:gore 7%, gnasher:nip 4%, bramble_ram:thorn_volley 3% |
| johnny-compost | thornback:gore 6%, void_geometer:hyperedge 5%, riveter:rivet_burst 4% |
| johnny-harvest | thornback:gore 6%, void_mote:null_pulse 4%, void_geometer:hyperedge 4% |
| johnny-overflow | thornback:gore 7%, void_geometer:hyperedge 4%, void_mote:null_pulse 4% |
| johnny-redline | thornback:gore 7%, void_geometer:hyperedge 4%, riveter:rivet_burst 4% |
| johnny-reprise | thornback:gore 7%, void_geometer:hyperedge 4%, gnasher:nip 4% |
| johnny-ripe | thornback:gore 7%, riveter:rivet_burst 4%, gnasher:nip 3% |
| johnny-scrapheap | thornback:gore 7%, void_geometer:hyperedge 4%, void_mote:null_pulse 4% |
| novice | thornback:gore 7%, riveter:rivet_burst 5%, slag_golem:ingot_slam 4% |
| spike | thornback:gore 8%, void_mote:null_pulse 4%, gnasher:nip 4% |
| spike-v1 | thornback:gore 6%, void_mote:null_pulse 5%, void_geometer:hyperedge 4% |
| timmy | thornback:gore 6%, riveter:rivet_burst 4%, slag_golem:ingot_slam 3% |
| turtle | thornback:gore 7%, rivet_gnasher:lunge 5%, void_mote:null_pulse 5% |

## 1b. Engines

Per class engine, over every persona except greedy: share of runs that drafted a piece (starters excluded), share that assembled it (a multiplier + 2 pieces; 3 pieces with a payoff when no multiplier is tagged; 3 pieces without role tags; tagged starter cards count, per the class design docs), median assembly floor, and win rate of runs that took a piece and assembled it vs took a piece and did not. **johnny** = the johnny-<engine> bot's win rate. Target (PHASE_C): every engine viable, johnny >= 25%; assembled engines win clearly more (class design docs: +10 to +25 points).

### breaker

| engine | drafted a piece | assembled | median floor | win assembled | win piece, not assembled | Δ | johnny |
| --- | --- | --- | --- | --- | --- | --- | --- |
| bastion | 100% | 13% | 19.5 | 45.5% (332) | 53.0% | -7.5 | 55.0% ±9.8 |
| counter | 100% | 20% | 17 | 53.7% (512) | 51.6% | +2.1 | 69.0% ±9.1 |
| crazing | 73% | 19% | 23 | 51.2% (484) | 53.2% | -2.0 | 61.0% ±9.6 |
| furnace | 100% | 74% | 14 | 52.7% (1931) | 49.5% | +3.2 | 59.0% ±9.6 |
| overflow | 4% | 0% | 26.5 | 0.0% (2) | 12.0% | -12.0 | 60.0% ±9.6 |
| redline | 4% | 0% | - | - | 34.8% | - | 52.0% ±9.8 |
| reprise | 0% | 0% | - | - | 0.0% | - | 55.0% ±9.8 |
| scrapheap | 5% | 0% | - | - | 30.6% | - | 56.0% ±9.7 |

### chronist

| engine | drafted a piece | assembled | median floor | win assembled | win piece, not assembled | Δ | johnny |
| --- | --- | --- | --- | --- | --- | --- | --- |
| calendar | 96% | 5% | 22 | 47.1% (119) | 42.3% | +4.8 | 45.0% ±9.8 |
| clockwork | 100% | 48% | 17 | 49.2% (1253) | 34.9% | +14.3 | 30.0% ±9.0 |
| conjunction | 100% | 7% | 17 | 38.0% (171) | 41.9% | -3.9 | 34.0% ±9.3 |
| overflow | 4% | 0% | 45.5 | 50.0% (4) | 10.4% | +39.6 | 33.0% ±9.2 |
| redline | 4% | 0% | - | - | 25.5% | - | 31.0% ±9.1 |
| reprise | 0% | 0% | - | - | 25.0% | - | 31.0% ±9.1 |
| scrapheap | 5% | 0% | - | - | 20.8% | - | 32.0% ±9.1 |
| storm | 89% | 6% | 18 | 39.7% (156) | 44.1% | -4.4 | 48.0% ±9.8 |

### graft

| engine | drafted a piece | assembled | median floor | win assembled | win piece, not assembled | Δ | johnny |
| --- | --- | --- | --- | --- | --- | --- | --- |
| canopy | 100% | 19% | 18.5 | 73.8% (488) | 71.8% | +2.0 | 86.0% ±6.8 |
| compost | 100% | 18% | 17 | 67.9% (468) | 73.2% | -5.3 | 53.0% ±9.8 |
| harvest | 99% | 30% | 17 | 73.6% (772) | 71.9% | +1.7 | 58.0% ±9.7 |
| overflow | 6% | 0% | 41 | 75.0% (4) | 36.8% | +38.2 | 88.0% ±6.4 |
| redline | 4% | 0% | - | - | 46.7% | - | 86.0% ±6.8 |
| reprise | 1% | 0% | - | - | 33.3% | - | 86.0% ±6.8 |
| ripe | 97% | 9% | 22 | 61.0% (236) | 74.4% | -13.4 | 80.0% ±7.8 |
| scrapheap | 5% | 0% | - | - | 51.1% | - | 85.0% ±7.0 |

### Mechanic telemetry (spike)

Per run: event counts for the v2 mechanics, the mean per-combat peak of each player status, the largest single-turn damage and the floor of the first 60-damage turn (an engine "pop").

**breaker**: events per run: guard_shed 22.9, next_turn_bank 0.7, beat_shift 0.4, timeline_resolved 19.0, riposte_triggered 73.7, bloom 0.0, cap_hit 7.3. Largest single-turn damage: median 77, p90 115. Runs with a 60-damage turn: 83%, first at floor 32 (median).

| player status | combats | mean peak | max |
| --- | --- | --- | --- |
| onslaught | 28194 | 5.2 | 25 |
| exposed | 12102 | 2.7 | 20 |
| embers | 10212 | 1.4 | 10 |
| iron_patience | 9671 | 3.8 | 12 |
| anvil_heart | 9400 | 1.5 | 6 |
| spark_gap | 9086 | 2.4 | 8 |
| parry_ledger | 8407 | 1.4 | 8 |
| stagger | 7379 | 2.2 | 9 |
| parry_ledger_draw | 7252 | 1.5 | 10 |
| bellows | 4635 | 1.1 | 3 |
| riposte_capacity | 3836 | 1.1 | 3 |
| onslaught_keep | 3268 | 1.2 | 4 |

**chronist**: events per run: next_turn_bank 0.1, timeline_gathered 0.9, beat_shift 46.9, timeline_resolved 119.0, riposte_triggered 0.3, bloom 0.0, cap_hit 5.8. Largest single-turn damage: median 104, p90 160. Runs with a 60-damage turn: 93%, first at floor 22 (median).

| player status | combats | mean peak | max |
| --- | --- | --- | --- |
| augury | 25555 | 1.0 | 1 |
| exposed | 8795 | 2.3 | 20 |
| escapement | 6917 | 1.2 | 5 |
| striking_train | 6831 | 3.5 | 12 |
| stagger | 5843 | 2.2 | 8 |
| accelerando | 4882 | 1.1 | 4 |
| perpetual_motion | 4233 | 1.1 | 3 |
| tide_table | 3582 | 1.1 | 4 |
| polyrhythm | 2969 | 1.0 | 2 |
| squall_line | 2701 | 2.1 | 6 |
| backlash_primed | 1978 | 1.5 | 5 |
| backlash_cards | 1978 | 1.5 | 5 |

**graft**: events per run: guard_shed 0.0, next_turn_bank 0.3, beat_shift 0.1, timeline_resolved 10.7, riposte_triggered 0.2, bloom 57.2, cap_hit 38.1. Largest single-turn damage: median 127, p90 177. Runs with a 60-damage turn: 98%, first at floor 24 (median).

| player status | combats | mean peak | max |
| --- | --- | --- | --- |
| exposed | 9445 | 2.5 | 20 |
| living_hedge | 8103 | 1.3 | 5 |
| dusk_pruning | 6851 | 1.2 | 5 |
| stagger | 5823 | 2.2 | 6 |
| deep_rot | 2776 | 1.0 | 1 |
| thresher | 2015 | 5.8 | 30 |
| hyphal_web | 1771 | 1.0 | 3 |
| rootstock | 1365 | 1.0 | 1 |
| reserve | 1268 | 2.9 | 5 |
| augury | 1048 | 1.0 | 1 |
| backlash_primed | 900 | 1.3 | 4 |
| backlash_cards | 900 | 1.3 | 4 |

## 2. Encounter difficulty (spike)

Per fight: deaths per fight, mean HP lost (and as % of max HP, and per class), and mean turns. Sorted by act, then deaths per fight.

| encounter | act | room | fights | deaths / fight | HP lost | HP lost % max | HP lost breaker | HP lost chronist | HP lost graft | turns |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| a1_ram | 1 | boss | 1011 | 1.5% | 19.5 | 25% | 20.8 | 17.1 | 20.5 | 8.0 |
| a1_orchid | 1 | boss | 965 | 0.4% | 13.3 | 17% | 19.2 | 9.7 | 11.1 | 10.9 |
| a1_alpha | 1 | elite | 1186 | 0.3% | 10.9 | 14% | 11.5 | 9.5 | 11.6 | 5.6 |
| a1_drone_pack | 1 | monster | 2012 | 0.1% | 6.4 | 8% | 5.8 | 7.1 | 6.1 | 3.1 |
| a1_empress | 1 | boss | 1018 | 0.1% | 11.5 | 15% | 10.9 | 12.7 | 11.0 | 10.5 |
| a1_thornback_wisp | 1 | monster | 2043 | 0.0% | 6.8 | 9% | 5.6 | 7.3 | 7.6 | 4.1 |
| a1_thornback | 1 | monster | 2994 | 0.0% | 4.7 | 6% | 3.7 | 4.8 | 5.7 | 3.4 |
| a1_drone_puff | 1 | monster | 3003 | 0.0% | 2.2 | 3% | 1.9 | 2.1 | 2.5 | 2.7 |
| a1_gnasher_pair | 1 | monster | 3002 | 0.0% | 2.9 | 4% | 2.7 | 2.7 | 3.5 | 2.5 |
| a1_flitter_gnasher | 1 | monster | 2165 | 0.0% | 1.8 | 2% | 1.5 | 2.1 | 1.8 | 2.7 |
| a1_titan | 1 | elite | 1214 | 0.0% | 6.8 | 9% | 4.7 | 6.9 | 9.0 | 4.5 |
| a1_spore_cluster | 1 | monster | 1820 | 0.0% | 1.8 | 2% | 1.3 | 2.4 | 1.7 | 3.5 |
| a1_vine_puff | 1 | monster | 2190 | 0.0% | 3.5 | 5% | 2.4 | 4.4 | 3.8 | 4.8 |
| a1_thornback_drone | 1 | monster | 2098 | 0.0% | 7.7 | 10% | 7.1 | 7.9 | 8.0 | 3.9 |
| a1_dreadcap | 1 | elite | 1143 | 0.0% | 5.5 | 7% | 5.4 | 6.5 | 4.6 | 6.1 |
| a1_mantis | 1 | monster | 2133 | 0.0% | 2.8 | 4% | 2.3 | 3.0 | 3.1 | 2.9 |
| event_spore_choir | 1 | event | 456 | 0.0% | 5.2 | 7% | 3.9 | 6.0 | 6.0 | 5.6 |
| a2_furnace | 2 | boss | 934 | 5.4% | 17.6 | 23% | 18.8 | 19.6 | 14.5 | 10.6 |
| a2_trihammer | 2 | boss | 1007 | 4.6% | 15.3 | 20% | 13.0 | 17.8 | 15.7 | 9.3 |
| a2_oracle_pack | 2 | monster | 1434 | 3.7% | 9.7 | 13% | 9.9 | 12.6 | 6.8 | 4.0 |
| a2_assembler | 2 | boss | 852 | 3.1% | 11.4 | 15% | 19.9 | 7.5 | 7.0 | 11.3 |
| a2_oracle_golem | 2 | monster | 1694 | 2.1% | 9.6 | 13% | 9.5 | 11.1 | 8.2 | 5.6 |
| a2_golem_riveter | 2 | monster | 1753 | 1.2% | 8.1 | 11% | 7.8 | 10.0 | 6.6 | 5.7 |
| a2_drone_riveter | 2 | monster | 1771 | 1.1% | 4.5 | 6% | 4.2 | 5.7 | 3.6 | 4.0 |
| a2_acolyte_golem | 2 | monster | 1999 | 1.0% | 5.9 | 8% | 6.8 | 6.8 | 4.3 | 5.4 |
| a2_acolyte_pack | 2 | monster | 1980 | 0.7% | 3.5 | 5% | 2.4 | 4.7 | 3.3 | 4.0 |
| a2_anvil_hammer | 2 | elite | 859 | 0.6% | 10.3 | 13% | 12.0 | 11.1 | 8.0 | 6.4 |
| a2_drone_trio | 2 | monster | 1933 | 0.4% | 3.3 | 4% | 3.5 | 4.0 | 2.3 | 3.8 |
| a2_boiler | 2 | elite | 921 | 0.3% | 8.9 | 11% | 7.2 | 7.5 | 11.6 | 5.5 |
| a2_auditor | 2 | elite | 901 | 0.2% | 4.2 | 5% | 4.0 | 3.6 | 4.7 | 5.8 |
| event_engine_cult | 2 | event | 543 | 0.2% | 2.3 | 3% | 2.8 | 2.5 | 1.8 | 6.0 |
| a2_drone_gnasher | 2 | monster | 2971 | 0.0% | 3.8 | 5% | 2.3 | 5.4 | 3.6 | 3.0 |
| a2_riveter | 2 | monster | 2969 | 0.0% | 1.4 | 2% | 0.4 | 1.8 | 2.0 | 3.3 |
| a2_rivet_pair | 2 | monster | 2979 | 0.0% | 3.1 | 4% | 2.1 | 4.5 | 2.6 | 2.8 |
| a3_leukarch | 3 | boss | 783 | 20.3% | 24.3 | 31% | 42.6 | 15.7 | 12.2 | 11.1 |
| a3_sovereign | 3 | boss | 840 | 20.2% | 29.2 | 37% | 32.2 | 29.2 | 26.4 | 12.3 |
| a3_archivist | 3 | boss | 819 | 8.4% | 15.4 | 20% | 14.8 | 18.8 | 13.8 | 10.7 |
| a3_fever_pack | 3 | monster | 1803 | 3.5% | 8.0 | 11% | 7.5 | 12.9 | 4.6 | 3.8 |
| a3_warden_geometer | 3 | monster | 1868 | 2.9% | 10.5 | 14% | 11.6 | 12.8 | 7.8 | 6.2 |
| a3_phage_mother | 3 | elite | 809 | 1.9% | 5.4 | 7% | 7.9 | 4.6 | 3.5 | 6.1 |
| a3_prism_motes | 3 | monster | 1876 | 1.8% | 5.2 | 7% | 5.1 | 7.2 | 3.8 | 4.0 |
| a3_event_horizon | 3 | elite | 808 | 1.2% | 13.2 | 17% | 10.2 | 15.1 | 15.0 | 5.5 |
| a3_geometer | 3 | monster | 1939 | 0.9% | 4.4 | 6% | 3.2 | 5.0 | 5.1 | 4.3 |
| a3_mirror_knight | 3 | elite | 805 | 0.9% | 5.6 | 7% | 2.1 | 6.5 | 8.6 | 4.8 |
| a3_warden_shard | 3 | monster | 1836 | 0.5% | 2.7 | 4% | 1.9 | 4.5 | 1.9 | 3.9 |
| event_echo | 3 | event | 594 | 0.5% | 2.8 | 4% | 0.7 | 2.8 | 4.5 | 3.8 |
| a3_warden_cantor | 3 | monster | 1805 | 0.4% | 3.7 | 5% | 2.7 | 6.4 | 2.8 | 5.3 |
| a3_cantor | 3 | monster | 1904 | 0.4% | 1.5 | 2% | 0.6 | 2.6 | 1.6 | 3.6 |
| a3_seer | 3 | monster | 1798 | 0.0% | 0.8 | 1% | 0.5 | 1.1 | 0.7 | 2.9 |
| a3_shard_mote | 3 | monster | 1760 | 0.0% | 6.4 | 8% | 5.3 | 9.5 | 4.8 | 3.1 |
| a3_mote_pair | 3 | monster | 1784 | 0.0% | 2.6 | 3% | 1.5 | 4.4 | 2.2 | 2.7 |
| event_antibodies | 3 | event | 580 | 0.0% | 3.5 | 5% | 1.8 | 6.2 | 3.1 | 2.9 |

Top 20 enemy moves by HP dealt (spike, all classes; share of all HP lost; HP per run):

| move | share | HP / run |
| --- | --- | --- |
| `thornback:gore` | 6.9% | 11.6 |
| `void_mote:null_pulse` | 4.2% | 7.1 |
| `void_geometer:hyperedge` | 4.0% | 6.7 |
| `rivet_gnasher:lunge` | 3.5% | 5.8 |
| `riveter:rivet_burst` | 3.3% | 5.6 |
| `rivet_gnasher:nip` | 3.3% | 5.6 |
| `gnasher:nip` | 3.2% | 5.4 |
| `slag_golem:ingot_slam` | 3.2% | 5.3 |
| `leukarch:cilia_storm` | 2.5% | 4.3 |
| `gnasher:lunge` | 2.5% | 4.2 |
| `slag_golem:spatter` | 2.3% | 3.8 |
| `furnace_drone:scorch` | 2.2% | 3.6 |
| `star_archivist:index_barrage` | 2.0% | 3.3 |
| `sporepuff:sting` | 1.9% | 3.2 |
| `bramble_ram:bramble_charge` | 1.8% | 3.1 |
| `bramble_ram:thorn_volley` | 1.8% | 3.1 |
| `tether_sovereign:starfall` | 1.8% | 3.0 |
| `furnace_heart:crucible_swing` | 1.8% | 3.0 |
| `self` | 1.8% | 2.9 |
| `mother_orchid:vine_crush` | 1.7% | 2.8 |

Floor of death (spike), 3-floor buckets, share of losses per class:

| class | 1-3 | 4-6 | 7-9 | 10-12 | 13-15 | 16-18 | 19-21 | 22-24 | 25-27 | 28-30 | 31-33 | 34-36 | 37-39 | 40-42 | 43-45 | 46-48 | 49-51 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| breaker | 0% | 0% | 0% | 0% | 0% | 2% | 0% | 2% | 3% | 4% | 11% | 1% | 3% | 2% | 3% | 68% | 0% |
| chronist | 0% | 0% | 0% | 0% | 0% | 2% | 2% | 8% | 7% | 10% | 15% | 6% | 12% | 6% | 6% | 26% | 0% |
| graft | 0% | 0% | 2% | 0% | 0% | 2% | 1% | 2% | 6% | 6% | 10% | 2% | 9% | 6% | 8% | 47% | 0% |

## 3. Cards

Columns: **cf Δwin / Δprog**: counterfactual, one extra copy in the starting deck vs the same seeds without it (spike; Δprog = floors gained, a win counts +3), with 95% half-widths; ** marks an interval that excludes 0. **pick Δ**: win rate of runs that picked the card minus runs offered it that did not, stratified by persona × 6-floor bucket (all personas but greedy; still selection-biased, compare with cf). **plays/draw**: plays per copy drawn (low = dead card). **value/E**: realised value per energy paid (0-cost plays count 0.5 energy; damage + 0.9 Block + Guard + debuff stacks + 3 per card drawn + 4.5 per energy gained; Powers and Rot appliers are under-credited because later ticks belong to no card). Pick rates are per persona; "all" pools every persona except greedy.

### breaker: 15 weakest

| card | arch | cf Δwin | cf Δprog | pick Δ | offer/run | pick spike | pick timmy | pick turtle | pick novice | plays/draw | value/E | value/play |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Breach Hammer (`breach_hammer`, C attack 1) | S | -4.5 ±24 | -2.6 ±4.1 | +0.9 ±3 | 1.67 | 21% | 29% | 6% | 59% | 0.76 | 10.6 | 10.6 |
| Plate Ram (`plate_ram`, C attack 1) | B | -20.5 ±26 | -2.0 ±3.2 | +3.1 ±7 | 1.64 | 1% | 16% | 0% | 23% | 0.68 | 9.9 | 9.9 |
| Kindle (`kindle`, U skill 1) | - | +7.5 ±24 | -1.8 ±4.8 | -6.3 ±9 | 0.90 | 1% | 45% | 0% | 14% | 0.16 | 0.0 | 0.0 |
| Read the Line (`read_the_line`, C skill 0) | SG | +11.5 ±20 | -1.0 ±3.1 | +1.7 ±4 | 1.67 | 16% | 7% | 11% | 0% | 0.72 | 17.1 | 8.6 |
| Iron Patience (`iron_patience`, U power 1) | - | +3.5 ±21 | -1.0 ±4.6 | +5.4 ±4 | 0.88 | 69% | 72% | 72% | 17% | 0.88 | 0.7 | 0.6 |
| Molten Shell (`molten_shell`, R power 2) | - | -0.5 ±32 | -0.9 ±4.8 | -5.7 ±8 | 0.56 | 9% | 45% | 7% | 42% | 0.56 | 0.7 | 0.9 |
| Piston Jab (`piston_jab`, C attack 0) | SG | +11.5 ±25 | -0.8 ±4.7 | +2.6 ±4 | 1.66 | 12% | 39% | 3% | 5% | 0.90 | 14.8 | 7.4 |
| Vent Pressure (`vent_pressure`, R skill 1) | S | +3.5 ±24 | -0.6 ±3.1 | -2.4 ±5 | 0.56 | 38% | 26% | 31% | 55% | 0.40 | 10.2 | 10.1 |
| Iron Avalanche (`iron_avalanche`, R attack 2) | B | -4.5 ±29 | -0.4 ±2.5 | +5.4 ±7 | 0.56 | 13% | 31% | 10% | 42% | 0.89 | 11.8 | 23.6 |
| Crazing (`crazing`, R power 2) | - | +11.5 ±30 | -0.4 ±4.8 | +4.5 ±5 | 0.53 | 35% | 54% | 25% | 35% | 0.57 | 0.7 | 0.8 |
| Iron Rhythm (`iron_rhythm`, R skill 1) | SB | - | - | -1.9 ±5 | 0.56 | 38% | 44% | 87% | 58% | 0.80 | 6.1 | 6.1 |
| Crossed Blades (`crossed_blades`, U power 1) | D | - | - | -1.8 ±6 | 0.89 | 5% | 62% | 24% | 13% | 0.70 | 1.4 | 0.7 |
| Coiled Strike (`coiled_strike`, U attack 2) | D | - | - | -1.3 ±5 | 0.92 | 85% | 83% | 5% | 91% | 0.61 | 12.2 | 24.1 |
| Cool the Steel (`cool_the_steel`, C skill 1) | SB | - | - | -1.1 ±4 | 1.63 | 83% | 4% | 18% | 10% | 0.69 | 11.0 | 11.0 |
| Forge Oath (`forge_oath`, R skill 0) | S | +11.5 ±23 | -0.1 ±2.8 | +7.2 ±9 | 0.55 | 6% | 32% | 4% | 32% | 0.91 | 0.1 | 0.1 |

### breaker: 15 strongest

| card | arch | cf Δwin | cf Δprog | pick Δ | offer/run | pick spike | pick timmy | pick turtle | pick novice | plays/draw | value/E | value/play |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| En Garde (`en_garde`, U skill 1) | D | +15.5 ±23 | +2.2 ±3.0 | +6.1 ±6 | 0.88 | 6% | 23% | 2% | 45% | 0.46 | 4.3 | 4.4 |
| Worldbreaker (`worldbreaker`, R attack X) | - | +7.5 ±22 | +1.9 ±3.1 | +7.9 ±11 | 0.52 | 6% | 100% | 1% | 100% | 0.70 | 8.3 | 21.8 |
| Spark Gap (`spark_gap`, U power 1) | - | +3.5 ±24 | +1.8 ±3.2 | -0.9 ±4 | 0.90 | 62% | 70% | 71% | 20% | 0.90 | 1.4 | 0.7 |
| Parry Ledger (`parry_ledger`, U power 0) | DG | +11.5 ±20 | +1.7 ±3.1 | +4.4 ±4 | 0.86 | 54% | 88% | 54% | 24% | 0.93 | 1.3 | 0.6 |
| Anvil Heart (`anvil_heart`, U power 0) | SB | +11.5 ±23 | +1.6 ±3.2 | +4.1 ±4 | 0.92 | 66% | 93% | 73% | 20% | 0.93 | 1.3 | 0.7 |
| Bellows (`bellows`, R power 1) | - | -0.5 ±25 | +1.5 ±3.2 | +0.7 ±5 | 0.57 | 67% | 68% | 75% | 38% | 0.83 | 1.7 | 0.9 |
| Shed Plating (`shed_plating`, U skill 0) | SB | +3.5 ±24 | +1.3 ±3.5 | +5.4 ±7 | 0.91 | 5% | 13% | 0% | 22% | 0.58 | 24.7 | 12.3 |
| Fault Reader (`fault_reader`, U power 1) | G | - | - | +11.9 ±6 | 0.90 | 4% | 64% | 18% | 24% | 0.75 | 0.9 | 0.9 |
| Smouldering Core (`smouldering_core`, R power 2) | S | - | - | +11.5 ±7 | 0.52 | 7% | 60% | 24% | 29% | 0.71 | 0.5 | 0.7 |
| Hair Trigger (`hair_trigger`, C skill 0) | - | +3.5 ±21 | +1.1 ±3.0 | +5.8 ±4 | 1.66 | 18% | 2% | 9% | 0% | 0.49 | 11.3 | 5.7 |
| Answer in Kind (`answer_in_kind`, R power 2) | - | +15.5 ±20 | +1.0 ±4.1 | +13.6 ±7 | 0.56 | 12% | 39% | 7% | 35% | 0.64 | 0.8 | 0.9 |
| Loosen Straps (`loosen_straps`, C skill 0) | - | +3.5 ±26 | +1.0 ±3.7 | +6.5 ±12 | 1.69 | 1% | 0% | 0% | 0% | 0.64 | 18.2 | 9.1 |
| Chain Driver (`chain_driver`, C attack 1) | SG | - | - | +7.9 ±5 | 1.64 | 7% | 18% | 1% | 48% | 0.73 | 9.2 | 9.2 |
| Piston Volley (`piston_volley`, U attack 1) | SG | - | - | +7.9 ±4 | 0.94 | 27% | 60% | 19% | 77% | 0.88 | 14.6 | 14.7 |
| Seam Ripper (`seam_ripper`, U attack 0) | SG | - | - | +6.8 ±6 | 0.94 | 6% | 38% | 0% | 66% | 0.85 | 10.6 | 5.3 |

### chronist: 15 weakest

| card | arch | cf Δwin | cf Δprog | pick Δ | offer/run | pick spike | pick timmy | pick turtle | pick novice | plays/draw | value/E | value/play |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Eternal Return (`eternal_return`, R power 2) | P | -24.6 ±27 | -6.6 ±6.0 ** | +4.2 ±9 | 0.63 | 5% | 35% | 2% | 36% | 0.58 | 1.3 | 1.3 |
| Squall Line (`squall_line`, U power 1) | S | -16.6 ±21 | -6.2 ±5.3 ** | +0.6 ±5 | 1.08 | 17% | 58% | 23% | 14% | 0.82 | 1.2 | 1.1 |
| Ephemeris (`ephemeris`, C skill 1) | K | -12.6 ±28 | -5.3 ±5.6 | -1.2 ±4 | 1.56 | 14% | 2% | 10% | 2% | 0.45 | 8.2 | 7.7 |
| Mainspring (`mainspring`, U skill 0) | K | -28.6 ±25 ** | -5.1 ±5.8 | +4.2 ±4 | 1.06 | 25% | 17% | 21% | 14% | 0.46 | 12.5 | 6.3 |
| Accelerando (`accelerando`, U power 0) | K | -16.6 ±24 | -4.7 ±5.3 | -0.7 ±4 | 1.11 | 29% | 86% | 27% | 9% | 0.92 | 2.6 | 1.3 |
| Total Eclipse (`total_eclipse`, R power 2) | J | -12.6 ±28 | -3.8 ±5.6 | +8.6 ±9 | 0.58 | 5% | 52% | 5% | 40% | 0.58 | 1.5 | 1.5 |
| Reckoning (`reckoning`, R attack 1) | S | -16.6 ±24 | -3.8 ±5.1 | +3.3 ±5 | 0.61 | 66% | 81% | 62% | 80% | 0.86 | 23.7 | 23.0 |
| Pinion Jab (`pinion_jab`, C attack 0) | K | -24.6 ±25 | -3.7 ±4.9 | +4.6 ±3 | 1.61 | 48% | 21% | 35% | 16% | 0.89 | 13.5 | 6.8 |
| Confluence (`confluence`, U attack 0) | J | -20.6 ±19 ** | -3.0 ±4.2 | +3.3 ±6 | 1.17 | 10% | 47% | 1% | 26% | 0.82 | 9.5 | 4.8 |
| Eye of the Storm (`eye_of_the_storm`, R power 2) | S | -4.6 ±22 | -2.6 ±4.2 | +5.6 ±8 | 0.64 | 5% | 54% | 3% | 31% | 0.62 | 1.2 | 1.3 |
| Upbeat (`upbeat`, C skill 0) | K | -12.6 ±23 | -2.6 ±4.7 | +1.5 ±4 | 1.65 | 19% | 1% | 25% | 1% | 0.68 | 7.6 | 3.8 |
| Turn the Tide (`turn_the_tide`, U attack 1) | S | -4.6 ±24 | -2.1 ±4.6 | +7.5 ±5 | 1.11 | 27% | 91% | 10% | 82% | 0.77 | 14.2 | 13.8 |
| Bell Choir (`bell_choir`, U attack 1) | J | -8.6 ±23 | -2.1 ±4.5 | -3.4 ±6 | 1.11 | 5% | 38% | 1% | 51% | 0.68 | 18.0 | 17.5 |
| Syzygy (`syzygy`, R attack 2) | J | -4.6 ±24 | -2.0 ±5.0 | +0.7 ±6 | 0.60 | 33% | 86% | 24% | 94% | 0.75 | 14.2 | 26.9 |
| Hold the Hour (`hold_the_hour`, C skill 0) | J | -12.6 ±26 | -1.8 ±4.7 | +6.2 ±5 | 1.63 | 9% | 1% | 11% | 1% | 0.62 | 8.1 | 4.0 |

### chronist: 15 strongest

| card | arch | cf Δwin | cf Δprog | pick Δ | offer/run | pick spike | pick timmy | pick turtle | pick novice | plays/draw | value/E | value/play |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Heave To (`heave_to`, U skill 1) | S | +15.4 ±24 | +4.2 ±3.3 ** | +5.7 ±4 | 1.03 | 43% | 35% | 61% | 53% | 0.65 | 9.6 | 9.2 |
| Downbeat (`downbeat`, C attack 1) | K | +19.4 ±25 | +2.1 ±4.8 | +5.7 ±4 | 1.72 | 14% | 50% | 1% | 64% | 0.87 | 18.3 | 16.2 |
| Weather Eye (`weather_eye`, C skill 1) | S | +7.4 ±29 | +2.0 ±4.8 | +6.2 ±4 | 1.70 | 17% | 5% | 27% | 18% | 0.72 | 9.1 | 8.7 |
| Knell (`knell`, U attack 1) | J | +7.4 ±24 | +1.6 ±4.8 | +1.0 ±4 | 1.16 | 38% | 83% | 28% | 86% | 0.85 | 20.0 | 19.5 |
| Afterpeal (`afterpeal`, C attack 1) | J | -4.6 ±24 | +1.5 ±4.3 | +5.8 ±5 | 1.66 | 2% | 37% | 0% | 51% | 0.75 | 16.6 | 16.2 |
| Breakwater (`breakwater`, U skill 2) | P | +3.4 ±22 | +1.3 ±3.6 | +4.5 ±4 | 1.10 | 25% | 22% | 45% | 83% | 0.62 | 10.9 | 19.9 |
| Carillon (`carillon`, C attack 0) | K | +3.4 ±19 | +1.3 ±4.5 | +1.3 ±4 | 1.66 | 31% | 14% | 21% | 3% | 0.88 | 24.1 | 12.0 |
| Dead Reckoning (`dead_reckoning`, C skill 0) | K | +11.4 ±20 | +1.2 ±2.0 | +18.1 ±9 | 1.69 | 1% | 4% | 1% | 0% | 0.66 | 12.2 | 6.1 |
| Toll the Hours (`toll_the_hours`, R attack X) | P | +3.4 ±28 | +0.9 ±5.6 | +4.3 ±6 | 0.59 | 53% | 100% | 30% | 99% | 0.92 | 11.5 | 34.3 |
| Red Sky (`red_sky`, C skill 1) | S | -4.6 ±24 | +0.9 ±4.7 | +10.2 ±5 | 1.73 | 5% | 1% | 11% | 30% | 0.45 | 17.2 | 16.8 |
| Balance Wheel (`balance_wheel`, C skill 1) | K | -4.6 ±27 | +0.7 ±5.1 | +8.1 ±5 | 1.58 | 7% | 11% | 11% | 21% | 0.59 | 12.0 | 10.6 |
| Tide Table (`tide_table`, U power 1) | J | - | - | +7.0 ±4 | 1.10 | 23% | 61% | 77% | 10% | 0.83 | 2.6 | 1.3 |
| Noon Gun (`noon_gun`, C attack 1) | J | -0.6 ±28 | +0.6 ±4.8 | +0.9 ±4 | 1.60 | 13% | 55% | 3% | 75% | 0.76 | 16.0 | 15.6 |
| Hasten (`hasten`, U skill 0) | J | - | - | +5.3 ±6 | 1.14 | 8% | 16% | 10% | 14% | 0.64 | 5.3 | 2.6 |
| Seen It Coming (`seen_it_coming`, R skill 1) | S | - | - | +4.9 ±7 | 0.61 | 4% | 25% | 46% | 63% | 0.72 | 34.9 | 17.5 |

### graft: 15 weakest

| card | arch | cf Δwin | cf Δprog | pick Δ | offer/run | pick spike | pick timmy | pick turtle | pick novice | plays/draw | value/E | value/play |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Clear-Cut (`clear_cut`, R power 2) | C | -19.3 ±20 | -4.4 ±4.0 ** | -4.8 ±5 | 0.74 | 23% | 49% | 30% | 41% | 0.44 | 0.5 | 0.8 |
| Blightcap (`blightcap`, C skill 1) | B | -19.3 ±20 | -2.3 ±2.1 ** | -1.9 ±3 | 1.60 | 56% | 30% | 59% | 1% | 0.55 | 31.9 | 31.7 |
| Propagate (`propagate`, U skill 1) | M | -15.3 ±20 | -2.3 ±2.4 | +1.5 ±8 | 1.18 | 2% | 6% | 0% | 17% | 0.33 | 0.0 | 0.0 |
| Reap (`reap`, U attack 2) | B | -11.3 ±19 | -1.6 ±1.8 | +4.0 ±5 | 1.09 | 7% | 57% | 0% | 66% | 0.49 | 11.4 | 22.8 |
| Perennial (`perennial`, R power 2) | G | -3.3 ±16 | -0.8 ±3.8 | -6.3 ±7 | 0.65 | 9% | 38% | 6% | 41% | 0.43 | 0.6 | 0.8 |
| Death Cap (`death_cap`, R attack 2) | B | - | - | -6.5 ±6 | 0.66 | 6% | 76% | 48% | 67% | 0.28 | 13.9 | 27.7 |
| Molt (`molt`, C skill 1) | C | -11.3 ±19 | -0.6 ±2.0 | +3.4 ±11 | 1.64 | 1% | 0% | 0% | 4% | 0.74 | 5.8 | 5.8 |
| Thresher (`thresher`, U power 2) | C | +4.7 ±11 | -0.5 ±1.8 | -0.7 ±3 | 1.07 | 37% | 49% | 34% | 16% | 0.24 | 0.3 | 0.5 |
| Rootstock (`rootstock`, R power 2) | M | +4.7 ±11 | -0.5 ±1.0 | -1.0 ±4 | 0.72 | 29% | 44% | 19% | 45% | 0.56 | 0.5 | 0.7 |
| Thorn Halo (`thorn_halo`, U power 2) | G | - | - | -4.0 ±5 | 1.11 | 3% | 50% | 17% | 20% | 0.28 | 0.2 | 0.4 |
| Mire Carapace (`mire_carapace`, C skill 1) | B | +0.7 ±14 | -0.4 ±2.2 | +3.3 ±8 | 1.66 | 1% | 1% | 0% | 12% | 0.36 | 8.5 | 8.5 |
| Ripening Rot (`ripening_rot`, U power 1) | B | - | - | -3.2 ±5 | 1.08 | 5% | 61% | 37% | 16% | 0.73 | 1.6 | 0.8 |
| Crystal Graft (`crystal_graft`, R skill 0) | G | - | - | -2.9 ±4 | 0.70 | 34% | 39% | 32% | 38% | 0.42 | 1.0 | 0.5 |
| Decomposer (`decomposer`, U power 1) | C | - | - | -2.7 ±5 | 1.08 | 7% | 71% | 72% | 21% | 0.82 | 1.2 | 0.6 |
| Deep Rot (`deep_rot`, R power 1) | B | +0.7 ±14 | -0.3 ±0.4 | -2.0 ±4 | 0.68 | 48% | 59% | 57% | 42% | 0.71 | 1.5 | 0.8 |

### graft: 15 strongest

| card | arch | cf Δwin | cf Δprog | pick Δ | offer/run | pick spike | pick timmy | pick turtle | pick novice | plays/draw | value/E | value/play |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Heartwood Spear (`heartwood_spear`, R attack 2) | G | +8.7 ±14 | +1.3 ±2.8 | +3.1 ±4 | 0.67 | 33% | 91% | 11% | 93% | 0.72 | 19.2 | 32.2 |
| Burst Pod (`burst_pod`, C skill 1) | B | +8.7 ±14 | +1.3 ±2.8 | -3.1 ±11 | 1.64 | 1% | 1% | 0% | 0% | 0.58 | 54.0 | 27.0 |
| Barb Flick (`barb_flick`, C attack 0) | M | +4.7 ±11 | +1.1 ±2.5 | +5.2 ±2 | 1.70 | 38% | 19% | 23% | 51% | 0.83 | 20.2 | 10.1 |
| Twin Thorn (`twin_thorn`, U attack 2) | G | +0.7 ±14 | +1.0 ±2.6 | +6.2 ±3 | 1.09 | 28% | 97% | 14% | 100% | 0.72 | 19.8 | 39.2 |
| Shear (`shear`, C attack 1) | C | -3.3 ±11 | +0.9 ±2.5 | +1.5 ±4 | 1.67 | 9% | 11% | 2% | 6% | 0.85 | 4.6 | 4.7 |
| Thornstorm (`thornstorm`, R attack X) | M | -7.3 ±17 | +0.8 ±2.6 | +8.4 ±4 | 0.72 | 45% | 100% | 28% | 100% | 0.81 | 16.6 | 48.5 |
| Grim Harvest (`grim_harvest`, R skill 2) | B | +4.7 ±16 | +0.7 ±3.0 | +3.9 ±7 | 0.67 | 8% | 30% | 0% | 39% | 0.69 | 16.3 | 32.6 |
| Living Hedge (`living_hedge`, U power 1) | M | - | - | +6.9 ±4 | 1.12 | 85% | 61% | 57% | 17% | 0.77 | 1.4 | 0.7 |
| Tendril Reach (`tendril_reach`, C skill 1) | M | - | - | +5.5 ±3 | 1.65 | 68% | 5% | 34% | 53% | 0.54 | 11.2 | 11.2 |
| Root Mesh (`root_mesh`, C skill 1) | M | - | - | +3.6 ±3 | 1.64 | 16% | 15% | 11% | 15% | 0.46 | 11.5 | 11.6 |
| Verdant Tide (`verdant_tide`, R attack 2) | M | - | - | +3.0 ±5 | 0.74 | 27% | 69% | 0% | 78% | 0.73 | 15.5 | 30.9 |
| Canker Bite (`canker_bite`, C attack 1) | B | - | - | +2.6 ±5 | 1.61 | 4% | 32% | 0% | 38% | 0.55 | 11.7 | 11.8 |
| Hyphal Web (`hyphal_web`, R power 1) | M | - | - | +2.5 ±4 | 0.64 | 37% | 62% | 70% | 35% | 0.77 | 0.8 | 0.8 |
| Puffball (`puffball`, U skill 1) | B | - | - | +2.3 ±3 | 1.10 | 64% | 43% | 60% | 21% | 0.38 | 58.1 | 58.0 |
| Burl Wall (`burl_wall`, U skill 2) | M | - | - | +2.0 ±3 | 1.10 | 41% | 33% | 66% | 91% | 0.36 | 12.3 | 24.6 |

### Colourless (cf pooled over the classes; per-class columns in the CSV)

| card | cf Δwin (pooled) | cf Δprog (pooled) | Δprog breaker | Δprog chronist | Δprog graft | offer/run | pick (all) | plays/draw | value/E |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Burn Bright (`burn_bright`, R power 2) | -14.8 ±15 | -4.2 ±2.8 | -1.6 | -8.2 | -2.8 | 0.00 | 0% | 0.39 | 1.2 |
| Blood Tithe (`blood_tithe`, U skill 0) | -6.8 ±12 | -2.1 ±1.9 | -3.1 | -3.3 | +0.1 | 0.00 | 0% | - | 0.0 |
| Cutting Torch (`cutting_torch`, R skill 1) | -1.5 ±14 | -2.1 ±2.8 | -2.4 | -2.3 | -1.5 | 0.00 | 0% | 0.02 | 0.6 |
| Bait Flare (`bait_flare`, U skill 0) | -2.8 ±13 | -1.9 ±2.3 | -1.4 | -4.0 | -0.3 | 0.01 | 0% | - | 0.0 |
| Shrapnel Charge (`shrapnel_charge`, U attack 1) | -10.8 ±13 | -1.7 ±2.1 | -0.3 | -3.9 | -1.0 | 0.01 | 0% | 0.70 | 7.4 |
| Scar Tissue (`scar_tissue`, R power 1) | -1.5 ±13 | -1.6 ±2.3 | -3.6 | -0.2 | -0.9 | 0.00 | 38% | 0.59 | 1.2 |
| Capacitor Bank (`capacitor_bank`, U skill 1) | -6.8 ±13 | -1.5 ±2.4 | -0.8 | -4.0 | +0.4 | 0.00 | 3% | 0.66 | 3.1 |
| Ballast Lock (`ballast_lock`, U skill 2) | - | - | - | - | - | 0.00 | 24% | 0.73 | 5.4 |
| Encore (`encore`, R skill 1) | -2.8 ±13 | -1.0 ±2.1 | -0.6 | -2.3 | -0.3 | 0.00 | 0% | 0.46 | 0.7 |
| Scrapheap Colossus (`scrapheap_colossus`, R attack 2) | -4.1 ±11 | -1.0 ±1.9 | +0.9 | -3.5 | -0.6 | 0.00 | 0% | 0.43 | 5.2 |
| Salvage Kiln (`salvage_kiln`, R power 1) | -5.5 ±11 | -1.0 ±2.1 | -1.1 | -2.0 | +0.1 | 0.00 | 3% | 0.73 | 1.2 |
| Spare Capacitor (`spare_capacitor`, U skill 0) | -5.5 ±12 | -1.0 ±2.0 | -2.4 | -0.2 | -0.3 | 0.01 | 0% | - | 0.0 |
| Shardfall (`shardfall`, U attack 2) | - | - | - | - | - | 0.00 | 26% | 0.63 | 9.6 |
| Black Box (`black_box`, U skill -) | -5.5 ±14 | -0.9 ±2.5 | +0.9 | -2.6 | -1.1 | 0.00 | 0% | - | 0.0 |
| Vent Plasma (`vent_plasma`, U attack 1) | -9.5 ±15 | -0.9 ±2.6 | -0.4 | -1.0 | -1.4 | 0.00 | 3% | 0.58 | 14.5 |
| Arc Discharge (`arc_discharge`, U attack X) | -6.8 ±13 | -0.8 ±1.9 | -0.6 | -0.5 | -1.3 | 0.01 | 2% | 0.87 | 8.2 |
| Strip for Parts (`strip_for_parts`, U skill 1) | -1.5 ±14 | -0.2 ±1.8 | +0.6 | -0.4 | -0.7 | 0.01 | 0% | - | 0.0 |
| Stasis Bolt (`stasis_bolt`, R attack X) | -0.1 ±13 | -0.0 ±2.0 | +0.0 | -0.1 | +0.0 | 0.00 | 21% | 0.81 | 19.4 |
| Relay Ping (`relay_ping`, U skill 0) | - | - | - | - | - | 0.00 | 5% | 0.68 | 18.4 |
| Arc Lattice (`arc_lattice`, U attack 2) | - | - | - | - | - | 0.00 | 0% | 0.46 | 10.2 |
| Jettison Pod (`jettison_pod`, U skill 0) | - | - | - | - | - | 0.00 | 42% | 0.80 | 13.8 |
| Star Survey (`star_survey`, U skill 0) | - | - | - | - | - | 0.01 | 33% | 0.63 | 8.4 |
| Snare Line (`snare_line`, U skill 1) | - | - | - | - | - | 0.00 | 47% | 0.32 | 22.5 |
| Clean Manifest (`clean_manifest`, R attack 2) | - | - | - | - | - | 0.00 | 5% | 0.29 | 4.8 |
| Prism Resonance (`prism_resonance`, R power 2) | - | - | - | - | - | 0.00 | 5% | 0.56 | 0.9 |
| Mirror Tether (`mirror_tether`, R attack 2) | - | - | - | - | - | 0.00 | 7% | 0.21 | 7.2 |
| Grav Clamp (`grav_clamp`, R skill 2) | - | - | - | - | - | 0.01 | 2% | 0.33 | 4.6 |
| Fuse (`fuse`, S skill 0) | - | - | - | - | - | 0.00 | - | - | 0.0 |
| Stress Fracture (`stress_fracture`, U skill 1) | +1.2 ±14 | +0.3 ±2.2 | +1.0 | -0.7 | +0.5 | 0.00 | 0% | 0.66 | 15.1 |
| Overdraft Cell (`overdraft_cell`, U skill 0) | - | - | - | - | - | 0.00 | 19% | 0.86 | 22.3 |
| Shard Cache (`shard_cache`, R skill 0) | -0.1 ±13 | +0.7 ±1.9 | +2.1 | -0.5 | +0.4 | 0.00 | 9% | 0.11 | 19.2 |
| Fault Beacon (`fault_beacon`, U skill 1) | +7.9 ±12 | +0.7 ±2.2 | +0.2 | +2.4 | -0.4 | 0.01 | 6% | 0.84 | 33.2 |
| Last Light (`last_light`, R attack 3) | +6.5 ±13 | +1.2 ±1.7 | +1.2 | +2.6 | -0.1 | 0.00 | 4% | 0.70 | 18.0 |
| Starfall Lance (`starfall_lance`, R attack X) | +9.2 ±12 | +1.6 ±2.0 | +0.7 | +4.4 | -0.3 | 0.00 | 0% | 0.62 | 11.4 |
| Salvage Kit (`salvage_kit`, U skill 1) | - | - | - | - | - | 0.00 | 8% | 0.67 | 0.2 |
| Gyro Jammer (`gyro_jammer`, U skill 1) | - | - | - | - | - | 0.00 | 6% | 0.19 | 4.8 |

Weakest colourless: Burn Bright, Blood Tithe, Cutting Torch, Bait Flare, Shrapnel Charge, Scar Tissue, Capacitor Bank, Ballast Lock, Encore, Scrapheap Colossus, Salvage Kiln, Spare Capacitor, Shardfall, Black Box, Vent Plasma. Strongest: Gyro Jammer, Salvage Kit, Starfall Lance, Last Light, Fault Beacon, Shard Cache, Overdraft Cell, Stress Fracture, Fuse, Grav Clamp, Mirror Tether, Prism Resonance, Clean Manifest, Snare Line, Star Survey.

## 4. Relics (counterfactual: granted on floor 1)

Each relic is granted before the Ascent Pact and the run is replayed on the same seeds as the no-relic baseline (spike). Pooled = every class the relic can drop for. **triggers/run**: `relic_trigger` events in the treated runs (0 = never flashed: a passive modifier or a relic that never fires; check). **held Δ**: the v1-style observational delta (runs ending with the relic minus runs without, spike), shown to expose its survivorship bias.

### 15 most overpowered

| relic | cf Δwin pooled | cf Δprog pooled | Δwin breaker | Δwin chronist | Δwin graft | triggers/run | held Δ (spike) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Refrain Pin (`refrain_pin`, rare, chronist) | +24.1 ±18 ** | +5.4 ±3.1 ** | - | +24 ±18 | - | 88.6 | +14.3 |
| Perpetual Calendar (`perpetual_calendar`, boss, chronist) | +27.4 ±14 ** | +4.6 ±2.6 ** | - | +27 ±14 | - | 0.0 | +0.8 |
| Star Pip (`star_pip`, common, chronist) | +14.1 ±22 | +4.5 ±3.9 ** | - | +14 ±22 | - | 62.2 | +2.0 |
| Slow-Temper Alloy (`slow_temper`, uncommon) | +16.3 ±10 ** | +2.9 ±1.8 ** | +19 ±18 | +24 ±18 | +6 ±15 | 29.3 | +14.3 |
| Timeline Spool (`timeline_spool`, uncommon, chronist) | +7.4 ±24 | +2.8 ±3.3 | - | +7 ±24 | - | 130.1 | -2.2 |
| Coal Scuttle (`coal_scuttle`, uncommon, breaker) | +15.5 ±20 | +2.3 ±2.6 | +15 ±20 | - | - | 29.8 | +7.9 |
| Twin Scabbard (`twin_scabbard`, rare, breaker) | +18.8 ±18 ** | +2.3 ±2.5 | +19 ±18 | - | - | 88.2 | +7.1 |
| Bastion Core (`bastion_core`, rare, breaker) | +12.2 ±19 | +2.2 ±2.5 | +12 ±19 | - | - | 86.2 | +8.9 |
| Fracture Engine (`fracture_engine`, rare) | +19.6 ±10 ** | +2.2 ±1.9 ** | +32 ±18 | +24 ±20 | +3 ±16 | 59.8 | +15.7 |
| Conductor's Baton (`conductors_baton`, rare, chronist) | +7.4 ±18 | +2.1 ±3.6 | - | +7 ±18 | - | 0.0 | -5.0 |
| Bulwark Rivets (`bulwark_rivets`, common) | +8.5 ±10 | +1.9 ±1.3 ** | +2 ±19 | +14 ±22 | +9 ±9 | 27.8 | +12.0 |
| Antenna Wire (`antenna_wire`, common) | +9.6 ±11 | +1.7 ±1.4 ** | +9 ±20 | +11 ±23 | +9 ±9 | 48.4 | +13.5 |
| Cracked Hourglass (`cracked_hourglass`, boss) | +6.3 ±11 | +1.7 ±1.8 | -8 ±20 | +27 ±19 | -1 ±18 | 0.0 | +17.8 |
| Chain Wraps (`chain_wraps`, common, breaker) | +2.2 ±21 | +1.6 ±2.6 | +2 ±21 | - | - | 155.4 | +2.8 |
| Gravity Loom (`gravity_loom`, boss) | +7.4 ±13 | +1.5 ±1.7 | +9 ±24 | +17 ±25 | -4 ±16 | 76.5 | +20.9 |

### 15 weakest

| relic | cf Δwin pooled | cf Δprog pooled | Δwin breaker | Δwin chronist | Δwin graft | triggers/run | held Δ (spike) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Stasis Engine (`stasis_engine`, boss) | -4.8 ±12 | -1.4 ±2.1 | -5 ±23 | +1 ±22 | -11 ±18 | 0.0 | -24.7 |
| Storm Lantern (`storm_lantern`, common, chronist) | -12.6 ±26 | -1.3 ±3.8 | - | -13 ±26 | - | 1.6 | -10.8 |
| Salvager's Licence (`salvagers_licence`, shop) | -7.0 ±11 | -1.2 ±1.7 | -11 ±23 | -6 ±21 | -4 ±13 | 0.0 | +5.2 |
| Exposed Core (`exposed_core`, boss) | -10.4 ±12 | -0.9 ±2.2 | -5 ±23 | -23 ±24 | -4 ±16 | 58.1 | -23.3 |
| Heavy Heart (`heavy_heart`, boss, breaker) | -14.5 ±25 | -0.8 ±3.8 | -15 ±25 | - | - | 0.0 | -18.2 |
| Timeline Clamp (`timeline_clamp`, shop, chronist) | -2.6 ±23 | -0.8 ±3.1 | - | -3 ±23 | - | 0.0 | -13.2 |
| Shard Crucible (`shard_crucible`, rare) | -8.1 ±7 ** | -0.7 ±1.0 | -15 ±11 | -9 ±15 | -1 ±11 | 3.1 | +8.9 |
| Reaper's Sickle (`reapers_sickle`, uncommon, graft) | -0.6 ±11 | -0.6 ±0.3 ** | - | - | -1 ±11 | 5.3 | +24.3 |
| Grafting Knife (`grafting_knife`, uncommon, graft) | +2.7 ±13 | -0.6 ±1.7 | - | - | +3 ±13 | 0.0 | +24.1 |
| Void Compass (`void_compass`, rare) | -3.7 ±12 | -0.6 ±1.6 | -5 ±27 | -6 ±17 | -1 ±15 | 0.0 | +6.5 |
| Blood Mulch (`blood_mulch`, uncommon, graft) | +2.7 ±9 | -0.5 ±0.3 ** | - | - | +3 ±9 | 0.2 | +21.1 |
| Crowd Breaker (`crowd_breaker`, uncommon, breaker) | +2.2 ±16 | -0.5 ±3.5 | +2 ±16 | - | - | 7.4 | +5.4 |
| Blood Rivets (`blood_rivets`, uncommon, breaker) | +5.5 ±14 | -0.5 ±0.6 | +5 ±14 | - | - | 0.4 | -5.1 |
| Hairline Saw (`hairline_saw`, uncommon) | -5.9 ±8 | -0.4 ±1.1 | -5 ±13 | +4 ±13 | -17 ±15 | 4.3 | +8.3 |
| Mycelial Net (`mycelial_net`, uncommon, graft) | -4.0 ±13 | -0.3 ±1.4 | - | - | -4 ±13 | 0.0 | +22.4 |

Baseline arm win rate: breaker 60.0% (30 seeds), graft 90.0% (30 seeds), chronist 63.3% (30 seeds).

CI achieved: per relic x class Δwin 95% half-width median 17.2 pts; pooled over classes median 12.1 pts; Δprog pooled median ±1.7 floors.

Relics with 0 triggers in every treated run: `shard_lens`, `orbital_hammer`, `cracked_hourglass`, `heavy_heart`, `ascendant_prism`, `wanderers_compact`, `salvagers_licence`, `stasis_engine`, `void_compass`, `mycelial_net`, `grafting_knife`, `elder_seed`, `metronome_heart`, `conductors_baton`, `perpetual_calendar`, `timeline_clamp`.

Card counterfactual CI achieved: Δwin 95% half-width median 23.5 pts per card x class; Δprog median ±3.9 floors.

## 5. Potions (spike, observational)

Gained and used per 100 runs, the share used in boss / elite / hallway fights, and the share of gained potions that were used.

| potion | gained / 100 runs | used / 100 runs | used / gained | boss / elite / monster |
| --- | --- | --- | --- | --- |
| Quicksilver (`pot_quicksilver`) | 103.1 | 102.4 | 99% | 43% / 23% / 34% |
| Flare Cell (`pot_flare_cell`) | 102.5 | 102.3 | 100% | 27% / 20% / 44% |
| Concussion Gas (`pot_concussion_gas`) | 100.7 | 99.6 | 99% | 48% / 20% / 32% |
| Bastion Tonic (`pot_bastion_tonic`) | 99.3 | 98.8 | 100% | 35% / 24% / 41% |
| Shield Gel (`pot_shield_gel`) | 98.3 | 97.8 | 99% | 34% / 21% / 44% |
| Fault Dust (`pot_fault_dust`) | 97.3 | 96.9 | 100% | 37% / 23% / 40% |
| Charge Cell (`pot_charge_cell`) | 97.6 | 95.0 | 97% | 45% / 21% / 33% |
| Shard Tincture (`pot_shard_tincture`) | 98.1 | 78.0 | 79% | 89% / 8% / 3% |
| Seer's Draught (`pot_seers_draught`) | 38.0 | 37.8 | 99% | 45% / 22% / 33% |
| Blight Vial (`pot_blight_vial`) | 38.0 | 37.3 | 98% | 44% / 21% / 35% |
| Blood Ampoule (`pot_blood_ampoule`) | 38.5 | 35.6 | 93% | 48% / 21% / 31% |
| Surge Flask (`pot_surge_flask`) | 35.8 | 35.5 | 99% | 30% / 23% / 46% |
| Riposte Salts (`pot_riposte_salts`) | 30.6 | 28.6 | 94% | 58% / 18% / 24% |
| Mimic Gel (`pot_mimic_gel`) | 24.3 | 23.9 | 98% | 35% / 26% / 37% |
| Rewind Phial (`pot_rewind_phial`) | 23.6 | 23.4 | 99% | 31% / 24% / 44% |
| Mending Ampoule (`pot_mending_ampoule`) | 23.4 | 23.3 | 100% | 22% / 22% / 44% |
| Fracture Serum (`pot_fracture_serum`) | 36.2 | 23.2 | 64% | 66% / 11% / 23% |
| Echo Draught (`pot_echo_draught`) | 22.1 | 21.7 | 98% | 40% / 27% / 32% |
| Halt Ampoule (`pot_halt_ampoule`) | 22.7 | 21.4 | 94% | 11% / 32% / 57% |
| Kiln Salts (`pot_kiln_salts`) | 35.8 | 17.0 | 47% | 62% / 12% / 26% |
| Fury Draught (`pot_fury_draught`) | 12.8 | 12.7 | 99% | 39% / 24% / 37% |
| Ember Tonic (`pot_ember_tonic`) | 12.6 | 12.4 | 98% | 30% / 23% / 47% |
| Growth Sap (`pot_growth_sap`) | 11.8 | 11.4 | 96% | 36% / 27% / 36% |
| Hourglass Tonic (`pot_hourglass_tonic`) | 11.7 | 11.2 | 96% | 36% / 16% / 34% |
| Fester Draught (`pot_fester_draught`) | 11.7 | 10.4 | 89% | 78% / 15% / 6% |
| Tempo Draught (`pot_tempo_draught`) | 12.5 | 8.7 | 70% | 75% / 8% / 17% |

## 6. Bug flags

- Cards played ≥ 20 times with zero realised value per play (not Powers): `kindle` (breaker, 274 plays), `salvage_kit` (breaker, 555 plays), `encore` (breaker, 25 plays), `salvage_kit` (graft, 391 plays), `encore` (graft, 35 plays).
- Cards drawn ≥ 30 times and never played: `cutting_torch` (chronist, 47 draws), `cutting_torch` (graft, 119 draws).
- Cards whose counterfactual changed no run at all (identical outcomes on every seed): none.
- Relics that never triggered: see section 4.
- Stalemates (a combat over 100 turns, counted as a loss): johnny-bastion/breaker `enc_a1_orchid` (v2-30-breaker), johnny-bastion/breaker `enc_a1_orchid` (v2-49-breaker), johnny-bastion/breaker `enc_a1_orchid` (v2-70-breaker), johnny-bastion/breaker `enc_a1_orchid` (v2-91-breaker), johnny-counter/breaker `enc_a1_orchid` (v2-70-breaker), johnny-counter/breaker `enc_a2_assembler` (v2-99-breaker), johnny-redline/breaker `enc_a3_sovereign` (v2-22-breaker), johnny-redline/breaker `enc_a1_orchid` (v2-70-breaker), spike/breaker `enc_a2_furnace` (v2-22-breaker), spike/breaker `enc_a1_orchid` (v2-70-breaker), spike/breaker `enc_a2_furnace` (v2-578-breaker), spike/breaker `enc_a1_orchid` (v2-851-breaker), turtle/breaker `enc_a2_anvil_hammer` (v2-118-breaker), turtle/breaker `enc_a1_orchid` (v2-148-breaker), turtle/breaker `enc_a3_archivist` (v2-158-breaker), turtle/breaker `enc_a2_acolyte_pack` (v2-168-breaker), turtle/breaker `enc_a1_orchid` (v2-187-breaker).
- Runs that threw (engine or policy errors; excluded from every number above): none.
