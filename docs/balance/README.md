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
- **Stalemates.** A run whose combat lasts more than 100 player turns ends as a loss with cause `stalemate` (`RunResult.endCause`) and the batch continues. The report counts them per class and lists them as suspects: each one is a policy or content bug (an unkillable enemy, or a bot that never finishes).
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

---

# v2: personality bots, the whole-turn planner and attribution

v2 answers "some cards are useless, some relics are OP" with three tools: a stronger combat planner,
personality bots that draft and route differently, and attribution analytics with counterfactual
power tests. The v1 tools above still work unchanged (`--policy greedy`).

## One command

```sh
sh sim/v2-baseline.sh v2-baseline        # bundle, personas, counterfactuals, report
```

Environment knobs: `RUNS` (persona seeds, default 250), `CF_RELIC` / `CF_CARD` (first-pass
counterfactual seeds, 60 / 40), `TOP_RELIC` / `TOP_CARD` (top-up targets on the same seeds, 150 / 120),
`OUT` (default `sim/out/v2`), `DOCS` (default `docs/balance`), `SKIP_PERSONAS=1`. A report is
rendered after the first passes and again after the top-ups, so the chain can be stopped at any
point after the first report. Logs: `$OUT/*.log`. Expect ~5 runs/s on 9 workers (M-series, 10 cores).

**Baselining a fixed commit while other agents edit the tree.** The batches take an hour or more,
and engine rules may change under them. Run them from a worktree:

```sh
W=/tmp/vs-head; git worktree add --detach $W HEAD
ln -s $PWD/node_modules $W/node_modules
rsync -a --exclude out sim/ $W/sim/
(cd $W && OUT=$PWD/sim/out/v2 DOCS=$PWD/docs/balance sh sim/v2-baseline.sh v2-baseline)
```

## The pieces

| Command | What it does |
|---|---|
| `npx tsx sim/bundle.ts [entry ...]` | esbuild-bundles the v2 entry points to `sim/out/bundle/*.mjs` (no tsx keepNames wrappers: ~15% faster). Re-run after any change to `src/` or `sim/`. |
| `node sim/out/bundle/personas-batch.mjs --runs 250 [--class ..] [--personas spike,timmy,..\|all] [--seed-prefix v2] [--out sim/out/v2]` | Every persona × class on the same seeds; one JSONL file of `RunResult`s per persona-class. |
| `node sim/out/bundle/counterfactual.mjs --kind relic\|card\|potion --runs N [--from k] [--ids a,b] [--policy spike] [--out ...]` | Paired-seed power tests (below). Seed-major order: a batch stopped early has every variant on the same first seeds. `--from` tops up the same file. |
| `node sim/out/bundle/attribution.mjs --in sim/out/v2 --label v2-baseline [--ref spike] [--docs docs/balance]` | Writes `report-<label>.md`, `<label>-cards.csv` (every card × class × persona) and `<label>-relics.csv`. Hand-written findings go in `notes-<label>.md`, which the report splices in after the summary, so re-rendering never overwrites them. |

To re-measure a few variants on the same seeds (after a bot fix), run `counterfactual.mjs --kind relic --ids a,b --runs 150 --skip-baseline --out $OUT/cf-relic-event.jsonl`. The report lets that file replace the first-pass rows for any variant it covers on at least 100 seeds. Variants that had runs throw are flagged ⚠ in the relic tables.

Every entry point also runs under `npx tsx sim/<name>.ts` (slower). A run that throws (engine or
policy bug) does not stop a batch: the main thread prints `RUN ERROR`, the run goes to
`$OUT/errors.jsonl` (or an `error` line in the counterfactual file), and the report's bug-flag
section lists it. Every number in the report excludes those runs.

## The planner (`sim/policies/lib/planner.ts`)

Beam search over the turn's play sequences on cloned engine state (beam 8, depth 12), with a
transposition table keyed by hand, energy, HP, Block, Guard, statuses and enemies. Mid-turn states
are scored by the greedy `evaluate` terms minus the damage the shown intents land after Block,
Guard and the primed Riposte rack (cancels, Riposte Block and Stagger). The top 6 leaves are then
ended through the real engine (enemy phase, Riposte, Rot, Guard decay, Timeline, next turn start)
and scored exactly. This fixes v1's `continueTurn` blind spot: a multi-card Block line is just
another sequence in the beam.

- **Danger mode.** When ending the turn now is fatal, every node is scored exactly (beam 12). Opaque
  Powers (Parry Ledger's parries, for example) hide survival lines from any static score; without
  this the Breaker gave up in lethal spots greedy survived.
- **Draws are peeked.** Copies share the real rng, so a draw inside the search sees the real next
  card, as v1's greedy rollouts did. Stopping at draws (re-planning after the real draw) was tried
  first and lost 20 points of Breaker win rate. So a draw card's measured value is an upper bound.
- **Potions** (`potions`): `smart` uses them in boss fights, in elites under 70% HP, or when the
  turn would cost 30% of HP or kill. Held potions keep their v1 value in `evaluate`.
- Plans are cached per `Game`. The next decision follows the stored line while the real state key
  matches the expected key, so most turns cost one search. Speed: about 1.5–2.5 s per full run per
  core, against 1–3.5 s for greedy.

## Personas (`sim/policies/personas.ts`)

| persona | combat | out of combat |
|---|---|---|
| `spike` | planner | the tuned v1 run model: deck-fit drafting (archetype synergy, quality, needs, anti-bloat), skip below the threshold, shop removals, elites at ≥ 70% HP, rest under 50% |
| `timmy` | planner, HP counts 0.8×, potions any fight | rarity, X costs and big printed damage; skips only past 30 cards; elites at ≥ 45% HP; takes every boss relic; buys cards before relics |
| `johnny-<arch>` | planner | v1 drafting + 6 per ● (3 per ○) for its archetype, −3 for off-archetype non-draw/energy cards. Archetypes come from the matrix in `docs/cards/<class>.md` at run time (Glue excluded) |
| `turtle` | planner, HP counts 1.4× | defence-weighted drafting (Block, Stagger, cancels), avoids elites, rests under 70%, refuses drawback boss relics |
| `novice` | planner beam 2 / exact 2 / depth 6, potions only near death | best-looking card every time (never skips), never removes, random map path, takes every boss relic |
| `greedy` | v1 one-ply + rollouts | v1 (comparison only) |

A harder-skipping Spike (threshold +1, bloat penalty past 18 cards, elites at 60% HP) was measured
at 18.9% Breaker win rate, against 30.0% for the planner with the v1 run model, on 90 paired seeds.
That is why Spike keeps the v1 run model.

## Attribution (`sim/detail.ts`, `sim/attribution.ts`)

- **Per card** (per class, per persona, and pooled): offer rate per run, pick rate, and the pick
  Δ: win rate when offered-and-picked minus offered-and-not-picked, stratified by 6-floor bucket
  (Mantel–Haenszel weights). It is still selection-biased: bots pick what fits a deck that is
  already working. **plays/draw** is the dead-card rate. **value/E** is realised value per energy:
  enemy HP lost + 0.9 × Block + Guard + weighted debuff stacks + 3 per card drawn + 4.5 per
  energy gained, attributed to the card during its play and its Riposte / Timeline resolutions.
  Later status ticks (Rot) and Power hooks belong to no card, so Powers and Rot appliers are
  under-credited. Use the counterfactual for those.
- **Counterfactual power** (`sim/counterfactual.ts`). Relic X is granted before the Ascent Pact
  (through the engine's `gainRelic`, so `onPickup` runs). Card X adds one copy to the starting
  deck. Each seed is played with and without, and the per-seed differences give Δwin and Δprog
  (floors gained, a win counts +3) with 95% half-widths from the paired standard deviation.
  Relics pool over every class they drop for. The relic's `relic_trigger` count in the treated
  runs flags relics that never fire.
- **Deaths and damage.** By encounter, floor and persona. HP lost per encounter. Which enemy moves
  do the damage: `moveDamage` attributes every point of player HP lost to `<enemy>:<move>`, or to
  `self`.

**Noise.** Runs decorrelate soon after any change, so pairing helps less than you might hope. At 60
paired seeds, a relic × class Δwin has a 95% half-width of about ±14 points, and pooled over 3
classes about ±8. Δprog is tighter relative to its effect. Rank by Δprog, and read Δwin for the
headline. A card copy moves a run far less than a relic, so per-card counterfactuals at 40–120
seeds separate only the extremes. Read them together with plays/draw and value/E.

---

# v2 phase 2: measured bots and engine analytics

## What changed in the bots

- **Spike v2** (`spike`). Drafting uses **priors plus paired rollouts** (`sim/policies/lib/draft.ts`):
  - **Prior.** Each offer gets the baseline counterfactual (`docs/balance/v2-baseline-priors.json`), but only while the card's definition still hashes as it did when measured. Otherwise it falls back to the v1 heuristic. The prior is shrunk toward the heuristic by its noise. Skipping is worth +0.3 floors (the Shard).
  - **Rollouts.** For up to 2 contenders within 0.5 floors of the best, the deck with the card and the deck without it play the same 2 representative fights of the coming act (an elite and a hard-pool fight; the act boss once the map is past row 9), with paired rng, at full HP and without potions. A cheap planner plays them (beam 2, exact 1), and fights are cut at 8 turns. The HP saved per fight is converted at 5 HP per floor.
  - **Relics.** Boss and shop relics are taken by their measured Δprog (`bossRelic: 'measured'`, `shopRelic: 'measured'`). Measured traps are never bought.
  - The v1 Spike is kept as `spike-v1`.
- **Johnny engines** (`johnny-<engine>`, `sim/policies/lib/engines.ts`):
  - **Engines.** Read from the `engine:<name>` / `role:<role>` card tags. Shared engines come from the colourless cards' and relics' `engine:*` tags. A class with no `engine:` tags falls back to the bare names in its design doc (Chronist today: conjunction, clockwork, storm, calendar), and says so on stderr.
  - **Drafting.** Prior + 1.2 floors × the role weight (multiplier 1.6, payoff 1.3, enabler 1.1, bridge 0.9, glue 0.5). Off-engine cards lose 0.6 unless they draw or give energy.
  - **Relics.** The engine's relics get +3 floors at shops and boss rewards.
  - The v1 matrix johnnies are `johnny-v1-<archetype>`.
- **Evaluator gaps closed** (`sim/policies/lib/future.ts`, used by every planner persona):
  - banked next-turn energy and draw (`bankEnergy` / `bankDraw`), plus surplus energy and cards at the next decision point;
  - generated cards in the piles: tokens, and Status fodder, which is positive when the deck can Prune or Scrap it;
  - carried Guard when the deck holds a Shed card (hold-then-Shed);
  - the **Timeline priced through the engine**: in a copy, every entry resolves in its due-turn batch (so Chorus, Gather and Schedule count), scored on enemy HP, Block and debuffs, and discounted per batch. That replaces the static price that read `custom` effects as a flat 4.
- **The designers' bot lines.** Where the line comes from:
  - **Goad with cover**: the exact end-turn simulation sees the inflated hits.
  - **Quicken on count 1, Crescendo on the highest beat**: the beat payoff resolves inside the searched turn.
  - **Gather**: the engine-priced Timeline sees the batch and its Chorus.
  - **Hold, then Shed**: the carried-Guard term.
  - **Counter decks ending the turn with Riposte cards in hand**: the end-turn prime step runs in the exact evaluation.
  - **Schedule the highest-cost card**: the choice heuristic.
  None of these needs per-mechanic search code.

## New measurements

- **Engines** (`RunResult.engines`; report section 1b): per engine, the share of runs that took a piece and that assembled it, the median assembly floor, the win rate assembled vs piece-but-not-assembled, and the johnny bot's win rate. "Assembled" = a multiplier plus 2 more pieces; 3 pieces with a payoff when no multiplier is tagged; 3 pieces for an engine with no role tags.
- **Mechanic telemetry** (`RunResult.detail`):
  - counts of every event type (`guard_shed`, `next_turn_bank`, `timeline_gathered`, `beat_shift`, …);
  - the mean per-combat peak of every player status (Embers, Onslaught, Goaded, …);
  - the largest single-turn damage, and the floor of the first 60-damage turn.
- **The PHASE_C scorecard** sits at the top of every report, with each target from `docs/v2/PHASE_C.md` marked met or MISSED.

## Re-measuring after the content settles

```sh
npx tsx sim/priors.ts --label v2-baseline        # only when re-deriving priors from a baseline's CSVs
RUNS=300 CF_RELIC=60 CF_CARD=40 TOP_RELIC=150 TOP_CARD=100 sh sim/v2-baseline.sh v2
```

This writes `docs/balance/report-v2.md` (hand-written findings go in `docs/balance/notes-v2.md`).
PHASE_C's stalemate target ("0 in 1000 runs per class") needs `RUNS=1000` for spike at least:
`node sim/out/bundle/personas-batch.mjs --runs 1000 --personas spike --seed-prefix v2 --out sim/out/v2` (same prefix: its first seeds stay paired with the other personas).

**Global levers with the v2 bots.** `sim/batch.ts` and `sim/sweep.ts` take persona names for
`--policy` (spike, timmy, turtle, novice, johnny-<engine>). Use `--workers` when you pass several
classes with a johnny bot, because its engine is per class. Example:
`npx tsx sim/sweep.ts --runs 300 --policy spike --workers auto --knob enemyDamagePct.2=90,100,110 --knob enemyHpPct.2=90,100,110`.

**Lookahead errors.** An engine error inside the planner's search is rethrown with the line that
reached it, e.g. `planner lookahead (potion pot_echo_draught > play crystal_graft) ...; actions [...]`.
To replay that line on the decision's state, see "Bugs" in the phase-2 report.

**Measuring an uncommitted tree (the v2 re-baseline).** Commits are the user's call, so snapshot the working tree instead of a worktree:

```sh
RUNS=300 CF_RELIC=60 CF_CARD=40 TOP_RELIC=150 TOP_CARD=100 sh sim/snapshot.sh v2
```

This does the following:
1. rsyncs the repo to `$TMPDIR/vibespire-snap-v2`, excluding `node_modules`, `.git`, `dist` and `sim/out`;
2. symlinks `node_modules`;
3. prints the `src/` content hash (`npx tsx sim/srchash.ts`);
4. runs the whole chain from the snapshot, writing to `sim/out/v2` and `docs/balance/`.

Every report header records the `src/` hash of the tree it was generated from.

**Planner stall breaker (2026-10-31).** After turn 12 of a fight, the planner credits enemy effective HP removed this turn, with a weight that grows 0.05 per turn up to 1. Without it, a long fight flattens the score: the damage-per-turn estimate decays and turns-to-kill hits its cap. Once the enemy's threat was neutralised, the bot could loop forever. A trace of Furnace Heart at Stagger 19 reached turn 12,590 with the identical state repeating. All 4 spike stalemates in the v2 measurement were this flaw, and with the fix all 4 seeds finish. The v2 report's spike numbers predate the fix (see its notes).

**Phase D bot changes (2026-10-31):**
- **Priors, newest first.** `lib/priors.ts` reads `docs/balance/v2-priors.json`, then `v2-baseline-priors.json` (or `$SIM_PRIORS`, comma-separated). A lookup takes the first file whose entry still hashes like the live definition. A prior found only in an older file is aged: its effect is halved and its interval doubled, because it was measured against a different card pool (Fixed Star's v1 prior predates Crescendo). `sim/priors.ts --label <report>` writes a new file from a report's corrected CSVs.
- **Boolean levers.** `--set` / `--knob` map 0/1 onto boolean `TUNING` switches (`bloomSpill` is already numeric: `--knob bloomSpill=0,1`). `<path>.all` sets acts 1–3 at once (`--knob enemyHpPct.all=100,105,110`).
- **Leader focus.** Damage to an enemy whose living minions die with it (Mother Orchid and her buds) earns 0.15 per minion per point (up to 0.6), on top of the stall breaker. Traced on `v2-70-breaker`: the bot now does most of its damage to the Orchid instead of trading into buds.

**Phase E (2026-11-01):**
- **Difficulty tiers (rulings 71, 74).** `TUNING.difficulty.standard|heroic` hold `enemyHpPct` and `enemyDamagePct` per act: Standard 85/75, Heroic 110/85. `personas-batch`, `counterfactual` and `trace` take `--difficulty standard|heroic` (default standard), stamped in `meta-*.json` and the counterfactual header. `--set enemyHpPct.all=N` sets both tiers; `--set difficulty.heroic.enemyHpPct.all=N` sets one.
- **Tier-split report.** `attribution.mjs --in <heroic dir> --standard <std dir>[,<std dir>]` scores timmy and novice on the first Standard dir (pooled and per class), everything else on the main dir, and adds a Standard table (section 7). It throws when a dir mixes tiers.
- **Prior coverage.** The report counts how many of the reference persona's offers and picks had no usable prior (`lib/draft.ts usableCardPriorOrNull`: the drafter used the heuristic alone). It also lists cards offered at least 20 times and never picked.
- **Triage keep.** Triage Locker keeps damage cards first, and exhaust choices skip them, when fewer than 4 damage cards are left in the draw and discard piles (`lib/choices.ts scarceDamageBonus`).
- **trace.ts** takes `--set` and `--difficulty`, so a failing batch seed replays exactly.

**Release fixes (2026-11-01, before the release priors):**
- **trace.ts `--grant-relic id` / `--grant-card id,id`** apply a counterfactual's grant, so `--seed cf-<i>-<class> --policy spike --difficulty heroic` replays one arm of a counterfactual pair exactly.
- **Skip threshold (`lib/archetype.ts`).** The deck-mean quality is shrunk toward the floor by 6 pseudo-cards. With the raw mean, a starter deck plus one strong rare set the skip bar at that rare's quality + 1.5, and the bot skipped every reward after it. This hit real runs after an early rare pick. It also biased every card counterfactual against strong rares: on cf-6-breaker, the Molten Shell arm skipped every card through Act 1. **Card verdicts measured before this fix (v2, v2-final, v2-final-e) understate rares**, Phase E's "negative" Breaker rares most of all.
- **Reserve (`lib/combat.ts`).** Reserve stacks are worth 2 each, and only while an X-cost card is in the fight. Before this, Reserve was priced as a generic buff (about 9 per stack), so under Reserve Coil the planner banked energy instead of playing cards: 3.4 plays per turn instead of 4.2 on cf-0-breaker. That was the Coil's −12 to −27 "trap".

## Canonical spike measurement (every agent, every time)

Two agents measured spike Chronist on the same tree on 2026-10-31 and got answers 25 points apart. Measure this way so numbers compare:

```sh
SNAP=$(SCRIPT=none sh sim/snapshot.sh "$USER-spike" | tail -1)   # copy of the tree incl. untracked prior files, plus a fresh bundle
cd "$SNAP" && node sim/out/bundle/personas-batch.mjs --difficulty heroic --personas spike --runs 150 --seed-prefix v2 \
  --workers 1 --out /Users/chrises/git/vibespire/sim/out/<you>-spike
```

- **Heroic, always say the tier.** Batches default to the Standard tier (the game default). The spike, johnny and turtle targets are Heroic targets, so pass `--difficulty heroic`; timmy and novice are scored on Standard.
- **Seeds `v2-0..149`, per class, at the current levers.** Quote the win rate with its ±95% half-width. At 150 seeds that is about ±7 points, so two runs that differ by less than 10 points agree.
- **Check the first log line.** It reads `[personas] src/ <hash>; priors: v2 (...); v2-baseline (...)`. Quote the hash next to your number. Runs on different hashes measure different content.
- **What now fails instead of silently giving a different number:**
  - **missing prior files:** `docs/balance/v2-priors.json` and `v2-baseline-priors.json` are untracked, so a `git worktree` lacks them, and spike used to fall back to heuristic drafting. Use `SIM_PRIORS=none` only on purpose;
  - **a stale bundle:** a bundle built before the latest `src/` edit refuses to run (`stale sim bundle: ...`). Rebuild with `npx tsx sim/bundle.ts`;
  - **a snapshot without the prior files:** `sim/snapshot.sh` refuses it.
- **Never compare a number from `npx tsx sim/batch.ts --policy greedy` with spike.** The v1 greedy bot is a different player, and it wins 20–30 points less.
- Every batch writes `meta-<time>.json` (src/ hash, priors, argv) next to its results, and the report header lists them. It warns when the batches in one directory measured different content.
- **Run from the root of the tree you measure.** Prior files (`docs/balance/*priors.json`) and archetype matrices (`docs/cards`) resolve against the working directory at run time (`sim/root.ts`), never against where the code or bundle sits. A bundle built in one snapshot once read another snapshot's priors. A working directory without `package.json` + `src/` throws. Each `meta-*.json` records `root`, plus every prior file's absolute path and sha256. The report compares batches by content hashes, not paths.
