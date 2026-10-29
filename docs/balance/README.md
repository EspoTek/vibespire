# Balance workflow

The simulator plays thousands of full runs with a scripted player and turns them into the GDD §8.6 metrics. Numbers come from `src/engine/tuning.ts` (rules) and `src/content/**` (cards, relics, enemies). The loop is: **change a number, rerun, compare**. Read the research behind it in `docs/research/sts-design.md` §1.21 and commandment 23.

## The tools

| Command | What it does |
|---|---|
| `npx tsx sim/batch.ts` | Runs N seeds × classes with one policy and prints (or `--out` writes) an aggregate JSON with every metric. |
| `npx tsx sim/report.ts` | Renders one or more aggregates as `docs/balance/report-<label>.md`. |
| `npx tsx sim/sweep.ts` | Runs the same seeds under several `TUNING` / class-stat settings and prints a comparison table. |
| `npx tsx sim/trace.ts` | Prints every decision of one run (hand, intents, the chosen play, map/reward/shop picks). Use it to check that a strange number is the content and not the bot. |

Common flags:

- `--content real` (default) plays the real packs. `--content test` plays the test pack **only** (every listing and random pool is restricted to it, like `tests/testpack-only.ts`), which is stable while the real packs are in flux.
- `--class breaker,graft,chronist`. The default is every registered class.
- `--policy greedy` is the balance oracle. `random` is a smoke-test opponent. `greedy2` is greedy with a deeper combat search, about 5× slower. Use it to measure how much better play moves a number.
- `--workers auto` fans the runs out over `worker_threads` (cores − 1). The results are identical to a sequential run, because each run is a pure function of its seed.
- `--seed-prefix sim`: seeds are `<prefix>-<i>-<class>`. Two batches with the same prefix play the same maps and draws, so A/B comparisons are paired.
- `--set key=value` (repeatable) overrides a balance number for this batch. See "Knobs" below.

## Running a baseline

```sh
mkdir -p sim/out
for c in breaker graft chronist; do
  npx tsx sim/batch.ts --runs 300 --class $c --policy greedy --workers auto --out sim/out/baseline-$c.json > /dev/null
done
npx tsx sim/report.ts --in sim/out/baseline-breaker.json,sim/out/baseline-graft.json,sim/out/baseline-chronist.json --label baseline
```

Progress goes to stderr every ~2 s, with runs done, wins and runs/s. 300 runs per class take a few minutes with `--workers auto`, and 1000 per class take about 10. `sim/out/` is git-ignored scratch space.

## Reading a report

The report opens with a **Summary** and a ranked **Suspects** list, followed by one section per class.

- **Win rate and milestones** (GDD §8.4). The reference bot should win 25–35% per class, with a spread between classes of 8 points or less. It should reach the act 1 boss in at least 90% of runs, beat it in at least 75%, and beat the act 2 boss in at least 50%. Deaths should split across the acts at about 30/40/30. A competent human should win about 10 points more often than the bot.
- **Death heatmap.** Shows where runs end. A single encounter that takes a large share of deaths is a spike. Compare its death rate per fight with its neighbours.
- **HP at boss entry.** Shows how much the act's hallways cost. ENEMIES §4.1 budgets the act 1 path at about 141 HP before healing.
- **Floor of death.** A histogram. Lumps at elite rows or the boss floor (16, 33, 50) are expected. A lump on floors 2–5 means the opening hallway is too hard.
- **Card rewards.** Pick rate is the share of the times a card was offered that it was picked. Deck Δwin is the win rate of runs that ended with the card in the deck minus runs that did not. The Δwin per act compares runs that picked the card in that act with the class win rate. Read it with the selection bias in mind: cards picked late in already-winning runs look strong, which is the "Madness" effect in research §1.21. "Dmg/combat with" is the average damage taken per fight in runs whose deck held the card.
- **Relics.** Win Δ in percentage points, for runs holding the relic against runs without it. Boss relic pick and skip rates are shown too.
- **Economy per act.** Shards earned and spent (GDD §4.5 target: 3–5 earned per act), deck size, gold, removals by source, and upgrades.
- **Turns and damage per encounter vs ENEMIES §4.1.** The ratio column is the HP lost divided by the roster's expectation. ⚠ marks a ratio above 1.3.
- **Mechanic telemetry** (GDD §8.6 item 5). Onslaught when Attacks are played, Riposte triggers / fizzles / cancels, Guard's share of the damage prevented, Bloom at the end of the run, Prunes per combat, Rot's share of damage dealt, beats per turn, Timeline resolutions, Exposed bonus damage, and Stagger prevented (an upper bound: stacks on the attacker summed per enemy hit).
- **Cap hits** (GDD §3). These should happen in under 1% of turns. A spike means a loop exists.

The **Suspects** list contains:

- cards with a pick rate in the bottom or top 5% of their class, among cards offered at least 10 times;
- relics with |win Δ| above 10 points, held in at least 5% of runs;
- encounters whose HP lost exceeds ENEMIES §4.1 by more than 30%, with at least 10 fights;
- missed GDD §8.4 milestones.

A suspect is something to look at, not something to fix automatically. Trace a few runs (`sim/trace.ts --seed <a seed from the batch>`) before you change a number.

## The balance loop

1. **Baseline.** Run the batch and report above, then commit the report as `report-baseline.md`.
2. **Hypothesis.** Pick one suspect and decide which single lever you will change (commandment 20: one lever per change). Examples: Thornback Gore 13→11, `enemyDamagePct.1` 100→90, a card's damage 7→8.
3. **Sweep it first** if it is a `TUNING` number or a class stat. This needs no code change:
   ```sh
   npx tsx sim/sweep.ts --runs 300 --class breaker,graft,chronist --workers auto --knob enemyDamagePct.1=85,90,95,100
   npx tsx sim/sweep.ts --runs 300 --workers auto --knob class.maxHpDelta=-5,0,5 --knob restHealPct=25,30,35
   ```
   `--mode each` (the default) varies one knob at a time. `--mode grid` tries every combination. Every setting plays the same seeds.
4. **Make the change** in `src/engine/tuning.ts` or the content file. Card, relic and enemy numbers live in content, so edit the definition. The text updates itself, because text is rendered from the same numbers.
5. **Rerun with the same seed prefix**, write the report with a new label (`--label enemy-dmg-90`), and compare it with the baseline. Change one thing at a time. With 300 runs per class, a win-rate difference under about 4 points is noise (the standard error is about 2.7 points at 35%). Use 1000 runs before you trust a difference that small.
6. Keep the reports that justified a change in `docs/balance/`, and name the lever in the commit message.

## Knobs (`--set` and sweep keys)

- **Any numeric `TUNING` leaf, by dotted path.** Examples: `enemyDamagePct.1` (enemy hit multiplier for act 1, in percent), `cardOdds.monster.rare`, `restHealPct`, `actHealMissingPct`, `potion.start`, `caps.bloom`, `shards.skipReward`, `shop.removeBase`, `gold.monster.1.0`. Unknown paths and non-number leaves throw. The hook is `applyTuningOverrides` in `src/engine/tuning.ts`.
- **Class stats.** `class.maxHpDelta=N` and `class.goldDelta=N` apply to every class. `class.<id>.maxHp=N`, `class.<id>.startingGold=N` and `class.<id>.maxEnergy=N` apply to one class.

Overrides are applied inside every worker before its runs and recorded in the aggregate's `meta.overrides`. The report shows them.

## The greedy policy (what "the bot" means)

`sim/policies/greedy.ts` with `sim/policies/lib/*`:

- **Combat** uses a one-ply look-ahead with an exact enemy response. Each distinct legal play is played in a copy of the state, the turn is ended, and the next decision point is scored. Enemy intents are deterministic (ENGINE_SPEC v2 purity), so this sees Riposte, Rot ticks, Guard decay and Timeline resolutions exactly.
- **The score** counts HP (worth less in act 1–2 boss fights, because 75% of missing HP is healed afterwards), each enemy's threat × turns until it dies (our damage share plus Rot and Exposed), Block and Guard against the next intents, Stagger, Powers by the expected fight length, Bloom growth, Timeline entries, and potions held.
- **Whole-turn lines.** Each candidate is then valued as a whole turn: play it, finish the turn by playing the remaining cards with the best one-ply value, skipping Block once the incoming damage is covered, then end the turn. A lethal search runs first. Ordering nudges put draw and 0-cost cards first and hold on-beat payoffs for the beat. Potions are only used in boss and elite fights, or when the end-of-turn copy shows heavy damage.
- **Pending choices.** The bot Scraps or removes the worst card first (curses, statuses, then basics), Prunes into the best Bloom copy, and primes the strongest Riposte.
- **Out of combat.** It scores map paths with an HP/gold model (elites when HP ≥ 70% and the deck has damage, rest when HP < 50% or before the boss), and picks card rewards with a class archetype model (tags × the deck's dominant archetypes, plus card quality and deck needs, minus an anti-bloat penalty). It skips when the best offer does not beat the deck's own quality, which earns Shards. At shops it buys a removal first and then relics. At rest sites it compares rest, smith and the Shard options. Events use option scoring with a safe default. Boss relics: energy relics unless the drawback breaks the deck.

It is deterministic. Its only randomness is its own seeded rng, used for map tie-breaks.

The bot is not a human. It plays every fight carefully but sees no further than the end of the turn. It does not plan an archetype from floor 1, and it does not route for specific events. Treat its win rate as a lower bound on a competent player. Use **deltas** between two batches, not absolute numbers, to judge a change.
