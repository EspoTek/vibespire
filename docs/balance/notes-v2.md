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
