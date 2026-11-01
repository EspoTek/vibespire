# Balance report: v2-baseline

Generated 2026-10-30 by `sim/attribution.ts` from `/Users/chrises/git/vibespire/sim/out/v2/`. Personas: greedy, johnny-blight, johnny-bulwark, johnny-compost, johnny-duellist, johnny-gardener, johnny-mass, johnny-metronome, johnny-oracle, johnny-swing, johnny-timeline, novice, spike, timmy, turtle. Reference persona for card and encounter tables: **spike**. Real `TUNING` levers (no neutral-tuning setup). Re-run: `sh sim/v2-baseline.sh` (see docs/balance/README.md).

Persona batches: 25 (200/199/198 runs each, seeds `v2-<i>-<class>`, paired across personas). Counterfactual relics: 138 relic x class variants on 150 paired seeds (policy spike). Counterfactual cards: 216 card x class variants on 100 paired seeds.

**spike win rate**: breaker 28.5%, chronist 41.5%, graft 28.5%.

## Findings and recommendations

**What was measured.** v1 as shipped: commit `8ecf0e2`, run from a `git worktree` of HEAD so the
uncommitted v2 engine and content edits in the tree (Spill, Embers, Chorus, …) are not mixed in.
Real `TUNING` levers. 5,000 persona runs (200 seeds × 25 persona-class batches, paired). 21,000
relic counterfactual runs (150 paired seeds). 22,000 card counterfactual runs (100 paired seeds).
CI achieved (95% half-widths): relic × class Δwin ±8.4 pts (median), relic pooled over classes ±6.0
pts and ±1.4 floors. Card × class Δwin ±11.4 pts and ±2.8 floors: enough to separate only the
extremes. Cards marked ** below have intervals that exclude 0.

### Headline numbers

| class | spike (reference) | best persona | worst persona | greedy (v1 bot) |
|---|---|---|---|---|
| Breaker | 28.5% | turtle 54.0% | novice 1.0% | 25.0% |
| Chronist | 41.5% | turtle 78.5% | novice 0.0% | 27.5% |
| Graft | 28.5% | turtle 69.0% | johnny-compost / novice 11.0% | 20.0% |

- The planner bot (spike) beats the v1 greedy bot by 3.5 / 14 / 8.5 points on the same seeds.
  The class spread under spike is 13 points (target ≤ 8): **the Chronist is the strong class**.
- **Turtle is by far the strongest player** (+25 to +37 points over spike). Three things drive it.
  (1) Defence-weighted drafting and play.
  (2) It refuses drawback boss relics. Spike's v1 boss-relic model takes Cracked Hourglass, the worst
  relic in the game, in 30–37% of runs, and rarely takes Gravity Loom, the best.
  (3) It avoids elites and rests early.
  This content rewards defence and punishes greed. Spike was specified as "strongest play", but it
  currently uses the tuned v1 run model. Phase 2 will feed it the measured boss-relic and card
  values (see the phase-2 notes below).
- **A first-time player (novice) almost never wins**: 0–1% on Breaker and Chronist, 11% on Graft. It
  takes every card, never removes, and routes randomly, so it ends at 28–30 cards and dies in the
  Act 2 hallways (77–84% of its deaths). Timmy (rares, big hits, never skips, every boss relic)
  wins 3.5% / 5.5% / 14%. **The game is very unforgiving of bloat and greed.** A new player has
  no path to a win.

### Why each personality dies

- **spike**: Act 2 multi-enemy hallways (`a2_oracle_pack`, `a2_oracle_golem`, `a2_drone_riveter`:
  12–16% deaths per fight). Then the Act 3 `a3_fever_pack` (18.7% per fight) and
  `a3_prism_motes` (13.4%).
- **turtle**: survives Act 2 (beats it 72–83%) and dies to Act 3 bosses and elites. The Breaker
  turtle also **stalemates against Leukarch in 12 of 200 runs** (a fight longer than 100 turns,
  counted as a loss): enough Block to never die, not enough damage to win. Trace it with
  `npx tsx sim/trace.ts --seed v2-8-breaker --class breaker --policy turtle --combat-only`.
  That is a content risk: Leukarch has no enrage or turn limit to break a stall.
- **timmy**: skips nothing, so decks reach 28–30 cards. It takes Heavy Heart, Exposed Core, Star
  Atlas and Cracked Hourglass when offered, and fights elites at 45% HP. It dies to the same Act 2
  packs with 25–40% less HP.
- **novice**: no removals (0.1 per run), random routes, takes every card. 84–94% beat the Act 1
  boss but only 5–28% beat Act 2.
- **johnny**: the archetypes are badly uneven when committed to (see "Archetypes" below).

### Relics (counterfactual: granted on floor 1, paired seeds)

**Most overpowered** (pooled Δwin, then Δprog):
1. **Gravity Loom** (boss): +21.8 ±6 win, +6.6 floors (Breaker +27, Graft +23, Chronist +15). "Draw
   more, Scrap a random leftover card" has no real drawback for a bot that plays its hand out.
   Nerf the draw by 1, or Scrap two cards, or make the Scrap hit the best card left.
2. **Star Pip** (Chronist common): +16.0 ±10 win, ~60 triggers a run. Block per enemy with two
   attack intents fires almost every turn. That is rare-level value at common: cut the Block by
   about 40%, or move it to uncommon.
3. **Geode Heart** (common): +10.7 ±5 win (Chronist +15, Graft +14). Shards are banked by skipping,
   so this is free Block every fight. Lower the max.
4. Heartwood Ring (Graft uncommon, +10.7), Stormbreak Gem (Breaker rare, +10.7), Mycelial Net
   (Graft uncommon, +10.0), Engine Tooth (event, +9.5), Tuning Fork (Chronist
   common, +8.0), Chain Wraps (Breaker common, +8.0). These are strong but within the noise of each
   other.

**Survivorship, not power.** v1's observational report called Crown Fragment (+53), Ghost Lantern
(+40), Binding Contract (+36), Hairline Saw (+28) and Notched Buckler (+37) OP. Granted on floor 1
they measure **+3.3, −2.9, +0.5, −2.4 and +6.0 points**. They are held by runs that got far, not
runs they carried. The `held Δ` column in section 4 shows the bias for every relic.

**Weakest**:
- **Cracked Hourglass** (boss): −33.8 ±4 win (−45 on the Chronist). The worst item in the game.
  Bots (and very likely players) take it for the energy. Delay 1 on your first card each turn
  makes every turn's defence arrive a turn late. Rework it: limit it to Attacks, or make it "the
  first Attack each turn" only.
- **Exposed Core** (boss): −23.8 ±5. Starting every fight Exposed outweighs +1 energy. Halve the
  stacks.
- **Heavy Heart** (Breaker boss): −20.0 ±8. "Can't prime Riposte" removes half the class.
- Star Atlas (boss) −9.0, Hollow Bough (Graft rare) −8.0, Stasis Engine (boss) −6.7, Void Compass
  (rare) −5.3.
- **No measurable effect** (|Δprog| < 0.3 floors and 0 triggers): Shard Lens, Crystal Spine, Shard
  Crucible, Slow Temper, Vial Rack, Fracture Engine, Duelist's Oath, Metronome Heart, Ascendant
  Prism. Most are Shard rest-site economy relics, which pay off only if Purge or Transmute is
  used, and are a bot blind spot as much as weak. A designer should check them by hand.
- The Crown Fragment, Oracle Pebble, Shard Debt and Engine Tooth rows were **re-measured**. In the
  first pass, a granted event relic made the bot later pick the event option that grants it again,
  and the engine threw "already have relic" (125 runs dropped, mostly long runs). The bot now
  avoids that option, and the four relics were replayed on the same 150 seeds
  (`sim/out/v2/cf-relic-event.jsonl`, which supersedes the first-pass rows).

### Cards

Significant counterfactuals (one extra copy in the starting deck; ** = the interval excludes 0):

- **Breaker, weakest**: Recoil Spring −3.5, Parry Ledger −3.3, Find the Seam −3.2, Anvil Heart −2.7.
  Colourless: Stress Fracture −5.1, Shard Cache −4.9, Salvage Kiln −4.7, Cutting Torch −4.3, Fault
  Beacon −3.9.
  **Strongest**: Hammerfall +4.4, Cool the Steel +3.9, Shardfall +3.8, Steal the Swing +3.8, Bind
  the Blade +3.4, Rivet Wall +3.4, Read the Blow +3.1, Coiled Strike +3.0.
- **Chronist, weakest**: Salvage Kiln −4.4 (colourless). No class card is significantly negative.
  The weakest class cards are Polyrhythm, Gear Train, Tide Table, Fermata and Downbeat (−0.8 to
  −2.5, not significant). **Strongest**: Toll the Hours +5.1, Culmination +4.0, Heave To +3.5, Snare
  Line +3.1, Logbook +3.0, Wind Forward +2.9.
- **Graft, weakest**: Blightcap −4.7, Thorn Halo −3.1, Spore Haze −3.1, Propagate −3.0.
  **Strongest**: Heartwood Spear +5.5 (+19 win), Twin Thorn +5.3 (+20 win), Snare Line +3.5, Relay
  Ping +3.3, Jettison Pod +2.9.

**Dead cards** (plays per draw, all personas):
- Cutting Torch 0.00–0.02: never played. The bot will not trade Max HP to remove a card mid-fight.
  Neither will most players.
- Shard Cache 0.06–0.07, and it **throws** "Shard Cache missing finished copy" in 2 runs. That is
  a bug at `src/content/cards/colorless.ts:149`.
- Forge Oath 0.04 (6,236 draws), Vent Pressure 0.14, Thorn Halo 0.26, Spore Haze 0.28, Propagate
  0.27, Transplant 0.22, Excise 0.23.
- Read Riposte cards (Bind the Blade 0.16, Pivot Sweep 0.20, Catch Blade 0.25) with care: priming
  is not a play, so plays/draw undercounts them.
- **Zero realised value per play**: Propagate, Transplant, Salvage Kit and Medbay Voucher. Their
  effects are deck-level (Bloom transfer, Shards, healing), which the value metric does not count.
  Their counterfactuals are ≈ 0 or negative.

**Patterns.**
- **Powers as a floor-1 copy are negative** (Recoil Spring, Parry Ledger, Anvil Heart, Thorn
  Halo; Fault Reader, Crossed Blades and Smouldering Core are not significant). A Power in an
  11-card starter costs a turn of tempo without its partners. The counterfactual measures "is this
  card good on its own early". Build-arounds are judged better by the johnny batches.
- **Big 2-cost attacks are strong and under-drafted.** Hammerfall (spike picks 6%), Twin Thorn
  (25%), Heartwood Spear (50%) and Culmination (24%) are among the best cards by counterfactual.
  The v1 reward model, also used by spike, underrates them. Timmy and novice pick them 80–100%,
  which makes their raw pick Δ look awful. That is why v1's pick-rate "suspects" were unreliable.
- **Colourless cards are never offered in card rewards** (offer/run 0.00): they only appear in
  shops. If that is intended, fine. If not, it is a bug in the reward pool.

### Archetypes (johnny bots, committed from floor 1)

| class | archetype win rates |
|---|---|
| Breaker | Duellist 31.5%, Bulwark 27.0%, Swing 24.0% (spike 28.5%) |
| Chronist | **Oracle 54.0%**, Timeline 30.0%, **Metronome 21.0%** (spike 41.5%) |
| Graft | **Mass 46.5%**, Gardener 27.0%, Blight 24.5%, **Compost 11.0%** (spike 28.5%) |

Compost and Metronome are the weakest committed plans. Oracle and Mass beat the reference bot by
13–18 points, so as decks they are overtuned or simply complete.

### Encounters

- **Act 1 is trivial outside the boss.** `a1_drone_puff` 0.1 HP per fight, `a1_spore_cluster` 0.4,
  `a1_gnasher_pair` 1.3, and 0% deaths in every hallway and elite. Deaths come from **Bramble Ram**
  (5.4% deaths, 27.8 HP = 35% of max HP). The other two Act 1 bosses (Orchid 11.8, Empress 8.6 HP)
  are much easier, so Act 1 difficulty depends on which boss you draw.
- **Act 2 is where runs end.** 57–84% of deaths, from the hallway packs: `a2_oracle_pack` (15.9%
  deaths per fight), `a2_oracle_golem` (11.7%), `a2_drone_riveter` (11.6%), `a2_golem_riveter` (8.6%).
  The Act 2 bosses split as well: Furnace Heart 12.1% deaths against The Assembler 0% (4.1 HP).
- **Act 3**: `a3_fever_pack` 18.7% deaths per fight. The `a3_event_horizon` elite costs 40% of max
  HP. Sovereign kills 10.8%, while **Archivist (0%, 3.6 HP) is a free boss**.
- **The damage comes from a few moves.** `thornback:gore` deals 9.7% of all HP lost in the game
  (16.6 HP per run), then `riveter:rivet_burst` 7.4%, `void_mote:null_pulse` 6.4% and
  `rivet_gnasher:lunge` 6.3%.

### Potions

Every potion is used in 93–100% of pickups except Shard Tincture and Tempo Draught (78%, mostly
held for bosses). No potion stands out from usage. Run `--kind potion` counterfactuals if one is
suspected.

### Bugs found (for the lead)

1. **Engine crash: "pending choice 'Upgrade 3 cards.' has more than 5000 legal answers".** The event
   option Overhaul (`src/content/events.ts:317`, upgrade 3 chosen cards) enumerates C(n,3)
   combinations in `choiceActions` once the deck holds 33 or more upgradable cards. `Game.apply`
   validates against `legalActions()`, so **the browser game would throw here too**. It hit 14 runs
   (4 persona runs with big Timmy and novice decks, 10 counterfactual runs). Fix it in the engine (validate a choice without enumerating
   it) or change the option to n ≤ 2.
2. **Shard Cache throws "missing finished copy"** (`src/content/cards/colorless.ts:149`) in 2 runs.
3. **Leukarch stalemate** for defensive Breaker decks (above).
4. **Performance (engine).** `computeIntent` runs `deepFreeze(structuredClone(enemy))` on every
   intent refresh, which happens after every action. It is about 10% of simulator CPU. A cheaper
   purity guard, or one only in tests, would make every batch faster.
5. The random-policy crash "rng pick: empty list" is **not a worker or state-sharing bug**. 450
   runs with 4 workers and the same 450 sequentially give byte-identical aggregates at HEAD. The
   random policy picked from `skip_reward` / `end_turn` / `proceed` without checking they were
   legal (Binding Contract forbids skipping, for example). It now falls back to a legal action.
   If it recurs on new content, it is a mid-edit or a new forced-choice rule.

### Recommendations (one lever each, in priority order)

1. Rework **Cracked Hourglass**, **Exposed Core** and **Heavy Heart**. They are traps that cost
   20–34 points of win rate, and bots and players take them for the energy.
2. Nerf **Gravity Loom** (draw +1 less) and **Star Pip** (about −40% Block, or move it to
   uncommon). Watch Geode Heart.
3. Cut or rework the dead cards: Cutting Torch, Shard Cache (and fix its bug), Forge Oath, Vent
   Pressure, Propagate, Transplant, Spore Haze, Blightcap, Thorn Halo. Give Recoil Spring, Parry
   Ledger and Anvil Heart a payoff a deck can build to. Today they are Powers nobody needs.
4. Give **Compost** (Graft) and **Metronome** (Chronist) the engine piece they lack. Pull **Oracle**
   and **Mass** back slightly, or leave them as the reward for drafting and bring the others up.
5. **Act 2 hallway packs**: reduce `a2_oracle_pack` / `a2_oracle_golem` / `a2_drone_riveter`, or cap
   how many hard hallways a path can chain. **Act 1 hallways** need teeth (drone_puff and
   spore_cluster deal under 1 HP per fight). Even out the bosses: Archivist and Assembler are free,
   Bramble Ram and Furnace Heart are not. Give Leukarch a stall breaker.
6. The **new-player curve**: with novice at 0–11%, the Act 1 → Act 2 jump is the cliff. An easier
   Act 2 opening, or clearer "skip / remove" teaching, would help most.

### Phase 2 notes (bot valuation, from the lead's heads-up)

- **Drafting and shops.** The v1 hand-priced effect table cannot keep up with ~40 new mechanics.
  Its pick rates are already wrong for v1 (2-cost attacks underrated, Status tokens at −3, `custom` at
  a flat 4). In phase 2, spike will draft by **short paired rollouts**: deck + card vs deck alone,
  against a few representative fights of the coming act, on the planner. The measured per-card
  values from this baseline (`v2-baseline-cards.csv`) will be the prior. The same goes for boss
  relics: the measured Δwin table replaces the hand-written drawback list.
- **Combat.** The planner runs the real engine for every line, so new mechanics need no
  per-mechanic search code. The evaluator is generic for statuses on both sides (unknown buffs and
  debuffs are scored by sign and stacks × fight length) and for the Timeline. Two gaps to close for
  the redesign:
  - **banked next-turn resources**: extra energy or cards at the next decision point are not scored
    yet;
  - **pile composition**: tokens or Status fodder in the draw pile.
  Timeline entries with `custom` effects are still priced statically.

## 1. Win rate by personality

Win rate with its 95% half-width. "Beat A1/A2" = runs past the act boss. Deaths by act are shares of the losses. Every persona plays the same seeds.

### breaker

| persona | runs | win | beat A1 | beat A2 | deaths A1/A2/A3 | HP lost / fight | skip rate | deck at end | elites / run | removals / run | stalemates | top death encounters |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| turtle | 200 | 54.0% ±6.9 | 98% | 72% | 4% / 58% / 38% | 5.5 | 35% | 24.5 | 1.6 | 3.6 | 16 | a3_leukarch 17%, a2_drone_trio 11%, a2_oracle_pack 10% |
| johnny-duellist | 200 | 31.5% ±6.4 | 99% | 55% | 2% / 64% / 34% | 7.4 | 19% | 26.7 | 2.3 | 3.0 | 3 | a2_oracle_golem 13%, a2_oracle_pack 12%, a3_prism_motes 10% |
| spike | 200 | 28.5% ±6.3 | 96% | 46% | 6% / 70% / 24% | 8.0 | 28% | 23.2 | 2.0 | 2.9 | 0 | a2_oracle_pack 15%, a2_oracle_golem 11%, a2_drone_riveter 10% |
| johnny-bulwark | 200 | 27.0% ±6.2 | 94% | 45% | 9% / 66% / 25% | 7.7 | 18% | 25.7 | 2.1 | 2.8 | 4 | a2_oracle_pack 15%, a2_golem_riveter 13%, a2_drone_riveter 12% |
| greedy | 200 | 25.0% ±6.0 | 95% | 38% | 7% / 76% / 17% | 8.1 | 27% | 22.7 | 1.9 | 2.9 | 0 | a2_oracle_pack 16%, a2_oracle_golem 15%, a2_drone_riveter 10% |
| johnny-swing | 200 | 24.0% ±5.9 | 97% | 42% | 5% / 70% / 25% | 8.1 | 8% | 27.9 | 2.0 | 2.9 | 0 | a2_golem_riveter 15%, a2_oracle_pack 15%, a2_oracle_golem 13% |
| timmy | 200 | 3.5% ±2.5 | 93% | 16% | 8% / 79% / 13% | 9.9 | 0% | 27.6 | 2.0 | 2.0 | 0 | a2_oracle_golem 15%, a2_oracle_pack 12%, a2_golem_riveter 12% |
| novice | 200 | 1.0% ±1.4 | 89% | 5% | 12% / 84% / 4% | 10.4 | 0% | 27.9 | 1.3 | 0.1 | 0 | a2_oracle_golem 15%, a2_golem_riveter 15%, a2_acolyte_golem 11% |

Damage sources (share of all HP lost, top 3 enemy moves) per persona:

| persona | top moves |
| --- | --- |
| greedy | riveter:rivet_burst 8%, thornback:gore 8%, rivet_gnasher:lunge 7% |
| johnny-bulwark | riveter:rivet_burst 9%, thornback:gore 8%, rivet_gnasher:lunge 6% |
| johnny-duellist | void_mote:null_pulse 9%, riveter:rivet_burst 8%, thornback:gore 7% |
| johnny-swing | thornback:gore 8%, riveter:rivet_burst 7%, slag_golem:ingot_slam 7% |
| novice | thornback:gore 10%, rivet_gnasher:lunge 7%, riveter:rivet_burst 6% |
| spike | riveter:rivet_burst 8%, thornback:gore 8%, rivet_gnasher:lunge 6% |
| timmy | thornback:gore 9%, riveter:rivet_burst 7%, slag_golem:ingot_slam 6% |
| turtle | riveter:rivet_burst 8%, slag_golem:ingot_slam 7%, thornback:gore 7% |

### chronist

| persona | runs | win | beat A1 | beat A2 | deaths A1/A2/A3 | HP lost / fight | skip rate | deck at end | elites / run | removals / run | stalemates | top death encounters |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| turtle | 200 | 78.5% ±5.7 | 100% | 83% | 2% / 77% / 21% | 5.1 | 37% | 25.7 | 1.5 | 3.0 | 1 | a2_drone_riveter 23%, a2_oracle_pack 21%, a2_drone_trio 16% |
| johnny-oracle | 200 | 54.0% ±6.9 | 99% | 75% | 2% / 51% / 47% | 5.7 | 16% | 29.8 | 2.4 | 2.9 | 0 | a3_fever_pack 15%, a2_oracle_pack 14%, a2_drone_riveter 12% |
| spike | 200 | 41.5% ±6.8 | 97% | 62% | 6% / 58% / 36% | 6.9 | 30% | 24.7 | 1.9 | 2.7 | 0 | a2_oracle_pack 16%, a3_fever_pack 15%, a3_prism_motes 11% |
| johnny-timeline | 200 | 30.0% ±6.4 | 96% | 47% | 6% / 70% / 24% | 7.4 | 15% | 27.0 | 1.7 | 2.5 | 0 | a2_oracle_pack 18%, a2_oracle_golem 14%, a2_drone_riveter 11% |
| greedy | 200 | 27.5% ±6.2 | 92% | 45% | 11% / 63% / 26% | 7.8 | 28% | 23.4 | 1.6 | 2.3 | 0 | a2_oracle_pack 16%, a2_oracle_golem 11%, a2_drone_riveter 10% |
| johnny-metronome | 200 | 21.0% ±5.6 | 97% | 40% | 4% / 72% / 25% | 7.6 | 8% | 28.2 | 1.8 | 2.3 | 0 | a2_oracle_pack 16%, a2_oracle_golem 16%, a2_golem_riveter 10% |
| timmy | 199 | 5.5% ±3.2 | 96% | 29% | 4% / 71% / 25% | 8.5 | 0% | 29.5 | 1.9 | 2.0 | 0 | a2_oracle_golem 16%, a2_oracle_pack 13%, a2_golem_riveter 10% |
| novice | 199 | 0.0% ±0.0 | 84% | 6% | 16% / 77% / 7% | 9.0 | 0% | 27.5 | 1.2 | 0.1 | 0 | a2_oracle_pack 17%, a2_oracle_golem 14%, a2_drone_riveter 11% |

Damage sources (share of all HP lost, top 3 enemy moves) per persona:

| persona | top moves |
| --- | --- |
| greedy | thornback:gore 11%, rivet_gnasher:lunge 8%, rivet_gnasher:nip 7% |
| johnny-metronome | thornback:gore 11%, riveter:rivet_burst 7%, rivet_gnasher:nip 6% |
| johnny-oracle | thornback:gore 12%, void_mote:null_pulse 10%, rivet_gnasher:lunge 8% |
| johnny-timeline | thornback:gore 12%, rivet_gnasher:lunge 8%, rivet_gnasher:nip 7% |
| novice | thornback:gore 13%, riveter:rivet_burst 8%, rivet_gnasher:nip 7% |
| spike | thornback:gore 12%, void_mote:null_pulse 8%, rivet_gnasher:lunge 7% |
| timmy | thornback:gore 11%, riveter:rivet_burst 8%, rivet_gnasher:lunge 7% |
| turtle | thornback:gore 11%, rivet_gnasher:lunge 8%, void_mote:null_pulse 8% |

### graft

| persona | runs | win | beat A1 | beat A2 | deaths A1/A2/A3 | HP lost / fight | skip rate | deck at end | elites / run | removals / run | stalemates | top death encounters |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| turtle | 200 | 69.0% ±6.4 | 99% | 83% | 3% / 52% / 45% | 6.5 | 36% | 24.1 | 1.7 | 4.7 | 0 | a3_leukarch 10%, a3_sovereign 10%, a2_golem_riveter 10% |
| johnny-mass | 200 | 46.5% ±6.9 | 99% | 68% | 3% / 56% / 41% | 7.7 | 24% | 27.6 | 2.2 | 3.9 | 0 | a2_oracle_pack 12%, a3_fever_pack 11%, a2_oracle_golem 10% |
| spike | 200 | 28.5% ±6.3 | 100% | 57% | 1% / 57% / 43% | 8.8 | 28% | 22.8 | 2.1 | 4.5 | 0 | a2_drone_riveter 12%, a2_oracle_pack 10%, a2_oracle_golem 9% |
| johnny-gardener | 200 | 27.0% ±6.2 | 97% | 60% | 5% / 49% / 47% | 8.7 | 6% | 29.2 | 2.0 | 4.2 | 0 | a2_oracle_pack 13%, a3_sovereign 9%, a2_golem_riveter 8% |
| johnny-blight | 200 | 24.5% ±6.0 | 100% | 47% | 0% / 70% / 30% | 8.6 | 15% | 26.3 | 2.0 | 3.3 | 0 | a2_oracle_pack 14%, a2_drone_riveter 13%, a2_oracle_golem 12% |
| greedy | 200 | 20.0% ±5.5 | 95% | 47% | 7% / 59% / 34% | 9.6 | 26% | 22.1 | 1.7 | 4.2 | 0 | a2_oracle_pack 16%, a2_drone_riveter 12%, a2_oracle_golem 8% |
| timmy | 198 | 14.1% ±4.9 | 92% | 37% | 9% / 65% / 26% | 9.7 | 0% | 29.5 | 2.2 | 4.2 | 0 | a2_oracle_golem 12%, a2_oracle_pack 12%, a2_furnace 8% |
| johnny-compost | 200 | 11.0% ±4.3 | 98% | 42% | 2% / 63% / 34% | 9.4 | 15% | 23.1 | 1.8 | 5.6 | 0 | a2_oracle_pack 16%, a2_oracle_golem 10%, a3_warden_geometer 7% |
| novice | 200 | 11.0% ±4.3 | 94% | 28% | 7% / 74% / 19% | 9.0 | 0% | 30.1 | 1.8 | 2.8 | 0 | a2_golem_riveter 15%, a2_oracle_pack 14%, a2_oracle_golem 10% |

Damage sources (share of all HP lost, top 3 enemy moves) per persona:

| persona | top moves |
| --- | --- |
| greedy | thornback:gore 10%, riveter:rivet_burst 7%, rivet_gnasher:lunge 7% |
| johnny-blight | thornback:gore 10%, riveter:rivet_burst 7%, rivet_gnasher:lunge 7% |
| johnny-compost | thornback:gore 9%, riveter:rivet_burst 8%, rivet_gnasher:lunge 6% |
| johnny-gardener | thornback:gore 8%, void_mote:null_pulse 6%, riveter:rivet_burst 6% |
| johnny-mass | thornback:gore 9%, riveter:rivet_burst 7%, void_mote:null_pulse 6% |
| novice | thornback:gore 9%, riveter:rivet_burst 7%, slag_golem:ingot_slam 5% |
| spike | thornback:gore 9%, riveter:rivet_burst 7%, rivet_gnasher:lunge 6% |
| timmy | thornback:gore 9%, riveter:rivet_burst 7%, slag_golem:ingot_slam 5% |
| turtle | thornback:gore 8%, riveter:rivet_burst 6%, slag_golem:ingot_slam 5% |

## 2. Encounter difficulty (spike)

Per fight: deaths per fight, mean HP lost (and as % of max HP, and per class), and mean turns. Sorted by act, then deaths per fight.

| encounter | act | room | fights | deaths / fight | HP lost | HP lost % max | HP lost breaker | HP lost chronist | HP lost graft | turns |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| a1_ram | 1 | boss | 203 | 5.4% | 27.8 | 35% | 33.6 | 18.3 | 29.6 | 8.4 |
| a1_orchid | 1 | boss | 200 | 1.5% | 11.8 | 15% | 15.8 | 6.3 | 14.6 | 10.6 |
| a1_thornback_wisp | 1 | monster | 387 | 0.3% | 10.4 | 14% | 8.9 | 10.6 | 12.0 | 4.4 |
| a1_flitter_gnasher | 1 | monster | 443 | 0.2% | 4.2 | 6% | 3.1 | 5.6 | 3.9 | 2.9 |
| a1_thornback | 1 | monster | 598 | 0.0% | 6.4 | 8% | 4.8 | 6.7 | 7.7 | 3.5 |
| a1_drone_puff | 1 | monster | 601 | 0.0% | 0.1 | 0% | 0.1 | 0.1 | 0.2 | 2.2 |
| a1_gnasher_pair | 1 | monster | 601 | 0.0% | 1.3 | 2% | 0.9 | 1.5 | 1.5 | 2.3 |
| a1_dreadcap | 1 | elite | 245 | 0.0% | 5.4 | 7% | 6.5 | 6.1 | 3.6 | 6.6 |
| a1_titan | 1 | elite | 236 | 0.0% | 4.1 | 5% | 2.3 | 5.0 | 5.4 | 4.7 |
| a1_thornback_drone | 1 | monster | 430 | 0.0% | 9.7 | 13% | 7.9 | 10.3 | 10.9 | 4.1 |
| a1_empress | 1 | boss | 195 | 0.0% | 8.6 | 11% | 9.1 | 6.8 | 9.8 | 10.0 |
| a1_drone_pack | 1 | monster | 419 | 0.0% | 5.3 | 7% | 4.0 | 6.6 | 5.1 | 3.1 |
| a1_spore_cluster | 1 | monster | 339 | 0.0% | 0.4 | 1% | 0.3 | 0.7 | 0.3 | 2.9 |
| a1_alpha | 1 | elite | 233 | 0.0% | 8.1 | 10% | 9.3 | 6.0 | 8.8 | 5.8 |
| a1_vine_puff | 1 | monster | 444 | 0.0% | 3.2 | 4% | 2.5 | 3.1 | 4.2 | 4.9 |
| event_spore_choir | 1 | event | 89 | 0.0% | 4.9 | 6% | 4.6 | 5.5 | 4.4 | 5.6 |
| a1_mantis | 1 | monster | 422 | 0.0% | 3.7 | 5% | 2.7 | 4.1 | 4.1 | 3.2 |
| a2_oracle_pack | 2 | monster | 345 | 15.9% | 16.0 | 21% | 17.7 | 16.1 | 14.4 | 4.2 |
| a2_furnace | 2 | boss | 116 | 12.1% | 18.6 | 24% | 24.7 | 10.1 | 22.6 | 11.6 |
| a2_oracle_golem | 2 | monster | 351 | 11.7% | 15.0 | 19% | 20.4 | 11.2 | 14.2 | 5.9 |
| a2_drone_riveter | 2 | monster | 370 | 11.6% | 10.9 | 14% | 13.0 | 9.4 | 10.5 | 4.3 |
| a2_golem_riveter | 2 | monster | 348 | 8.6% | 13.1 | 17% | 16.6 | 10.6 | 12.8 | 6.0 |
| a2_anvil_hammer | 2 | elite | 101 | 5.9% | 13.8 | 18% | 17.9 | 10.1 | 13.8 | 6.7 |
| a2_drone_trio | 2 | monster | 338 | 5.9% | 8.0 | 10% | 11.1 | 6.1 | 7.2 | 4.2 |
| a2_acolyte_pack | 2 | monster | 307 | 5.9% | 7.0 | 9% | 6.5 | 6.6 | 8.0 | 4.4 |
| a2_acolyte_golem | 2 | monster | 321 | 4.7% | 8.2 | 11% | 10.2 | 6.5 | 8.4 | 5.9 |
| a2_trihammer | 2 | boss | 119 | 3.4% | 18.9 | 24% | 16.8 | 14.7 | 24.3 | 9.5 |
| a2_boiler | 2 | elite | 105 | 2.9% | 6.4 | 8% | 2.7 | 4.6 | 10.7 | 5.7 |
| a2_drone_gnasher | 2 | monster | 388 | 0.0% | 10.4 | 14% | 9.3 | 11.3 | 10.7 | 3.6 |
| a2_riveter | 2 | monster | 376 | 0.0% | 5.8 | 8% | 4.6 | 4.5 | 8.2 | 4.0 |
| a2_rivet_pair | 2 | monster | 404 | 0.0% | 8.5 | 11% | 8.9 | 8.5 | 8.2 | 3.5 |
| event_engine_cult | 2 | event | 105 | 0.0% | 4.3 | 5% | 5.3 | 3.4 | 3.7 | 7.0 |
| a2_auditor | 2 | elite | 90 | 0.0% | 1.3 | 2% | 1.1 | 0.4 | 2.3 | 6.0 |
| a2_assembler | 2 | boss | 118 | 0.0% | 4.1 | 5% | 2.4 | 2.2 | 7.5 | 11.4 |
| a3_fever_pack | 3 | monster | 198 | 18.7% | 13.2 | 17% | 17.8 | 13.4 | 10.0 | 3.6 |
| a3_prism_motes | 3 | monster | 187 | 13.4% | 13.7 | 18% | 15.6 | 11.3 | 15.4 | 4.2 |
| a3_event_horizon | 3 | elite | 66 | 12.1% | 30.5 | 40% | 27.9 | 25.8 | 36.9 | 5.7 |
| a3_sovereign | 3 | boss | 65 | 10.8% | 19.2 | 24% | 23.1 | 5.7 | 31.0 | 12.9 |
| a3_warden_geometer | 3 | monster | 179 | 8.9% | 12.4 | 16% | 13.9 | 8.3 | 15.9 | 6.2 |
| event_echo | 3 | event | 85 | 7.1% | 6.5 | 9% | 3.9 | 5.3 | 10.8 | 4.1 |
| a3_geometer | 3 | monster | 200 | 6.5% | 7.5 | 10% | 7.7 | 4.3 | 10.8 | 4.7 |
| a3_leukarch | 3 | boss | 69 | 5.8% | 12.0 | 15% | 12.5 | 3.0 | 22.1 | 11.6 |
| a3_warden_shard | 3 | monster | 187 | 4.3% | 5.2 | 7% | 5.0 | 5.3 | 5.3 | 4.1 |
| a3_mirror_knight | 3 | elite | 68 | 2.9% | 6.7 | 9% | 1.8 | 6.3 | 9.9 | 5.0 |
| a3_warden_cantor | 3 | monster | 195 | 2.1% | 4.2 | 5% | 2.3 | 3.5 | 6.7 | 5.6 |
| event_antibodies | 3 | event | 57 | 1.8% | 11.1 | 14% | 10.1 | 10.8 | 13.1 | 3.5 |
| a3_shard_mote | 3 | monster | 215 | 1.4% | 17.3 | 22% | 17.0 | 17.1 | 17.6 | 3.5 |
| a3_mote_pair | 3 | monster | 229 | 1.3% | 9.0 | 12% | 8.7 | 9.2 | 9.2 | 3.4 |
| a3_cantor | 3 | monster | 200 | 0.5% | 2.6 | 3% | 1.4 | 2.1 | 4.0 | 4.0 |
| a3_seer | 3 | monster | 225 | 0.0% | 1.9 | 2% | 1.2 | 1.1 | 3.3 | 3.2 |
| a3_phage_mother | 3 | elite | 52 | 0.0% | 2.4 | 3% | 1.3 | 0.2 | 6.8 | 6.6 |
| a3_archivist | 3 | boss | 74 | 0.0% | 3.6 | 5% | 0.4 | 1.4 | 10.4 | 9.7 |

Top 20 enemy moves by HP dealt (spike, all classes; share of all HP lost; HP per run):

| move | share | HP / run |
| --- | --- | --- |
| `thornback:gore` | 9.7% | 16.6 |
| `riveter:rivet_burst` | 7.4% | 12.6 |
| `void_mote:null_pulse` | 6.4% | 10.9 |
| `rivet_gnasher:lunge` | 6.3% | 10.9 |
| `rivet_gnasher:nip` | 5.4% | 9.3 |
| `furnace_drone:scorch` | 4.8% | 8.2 |
| `slag_golem:ingot_slam` | 4.7% | 8.1 |
| `bramble_ram:bramble_charge` | 3.2% | 5.4 |
| `gnasher:nip` | 2.5% | 4.3 |
| `slag_golem:spatter` | 2.5% | 4.2 |
| `void_geometer:hyperedge` | 2.3% | 3.9 |
| `gnasher:lunge` | 2.2% | 3.9 |
| `shardling:lance` | 2.2% | 3.7 |
| `loom_oracle:unravel` | 2.1% | 3.5 |
| `bramble_ram:thorn_volley` | 2.0% | 3.5 |
| `thornback:trample` | 1.8% | 3.1 |
| `trihammer_arm:piston` | 1.5% | 2.5 |
| `loom_oracle:shuttle_strike` | 1.5% | 2.5 |
| `mother_orchid:vine_crush` | 1.4% | 2.4 |
| `void_mote:flicker` | 1.4% | 2.3 |

Floor of death (spike), 3-floor buckets, share of losses per class:

| class | 1-3 | 4-6 | 7-9 | 10-12 | 13-15 | 16-18 | 19-21 | 22-24 | 25-27 | 28-30 | 31-33 | 34-36 | 37-39 | 40-42 | 43-45 | 46-48 | 49-51 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| breaker | 0% | 0% | 0% | 0% | 0% | 6% | 27% | 21% | 6% | 9% | 6% | 6% | 5% | 3% | 6% | 5% | 0% |
| chronist | 0% | 0% | 0% | 2% | 0% | 4% | 16% | 24% | 8% | 8% | 3% | 7% | 14% | 6% | 7% | 3% | 0% |
| graft | 0% | 0% | 0% | 0% | 0% | 1% | 20% | 17% | 6% | 10% | 4% | 8% | 16% | 3% | 9% | 6% | 0% |

## 3. Cards

Columns: **cf Δwin / Δprog**: counterfactual, one extra copy in the starting deck vs the same seeds without it (spike; Δprog = floors gained, a win counts +3), with 95% half-widths; ** marks an interval that excludes 0. **pick Δ**: win rate of runs that picked the card minus runs offered it that did not, stratified by persona × 6-floor bucket (all personas but greedy; still selection-biased, compare with cf). **plays/draw**: plays per copy drawn (low = dead card). **value/E**: realised value per energy paid (0-cost plays count 0.5 energy; damage + 0.9 Block + Guard + debuff stacks + 3 per card drawn + 4.5 per energy gained; Powers and Rot appliers are under-credited because later ticks belong to no card). Pick rates are per persona; "all" pools every persona except greedy.

### breaker: 15 weakest

| card | arch | cf Δwin | cf Δprog | pick Δ | offer/run | pick spike | pick timmy | pick turtle | pick novice | plays/draw | value/E | value/play |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Recoil Spring (`recoil_spring`, R power 1) | D | -10.0 ±10 | -3.5 ±2.8 ** | -3.1 ±8 | 0.57 | 87% | 76% | 82% | 25% | 0.61 | 0.0 | 0.0 |
| Parry Ledger (`parry_ledger`, U power 1) | DG | -9.0 ±10 | -3.3 ±2.7 ** | +2.0 ±5 | 0.93 | 69% | 61% | 50% | 16% | 0.81 | 0.0 | 0.0 |
| Find the Seam (`find_the_seam`, C skill 0) | DG | -9.0 ±10 | -3.2 ±2.8 ** | -1.6 ±14 | 1.36 | 3% | 1% | 0% | 0% | 0.84 | 10.2 | 5.1 |
| Shed Plating (`shed_plating`, R skill 0) | SB | -9.0 ±10 | -2.7 ±2.8 | -3.8 ±7 | 0.62 | 14% | 32% | 11% | 47% | 0.42 | 21.9 | 10.9 |
| Anvil Heart (`anvil_heart`, U power 1) | SB | -8.0 ±10 | -2.6 ±2.6 ** | +0.9 ±6 | 1.02 | 82% | 61% | 67% | 6% | 0.82 | 0.0 | 0.0 |
| Read the Line (`read_the_line`, C skill 1) | SG | -10.0 ±8 ** | -2.6 ±2.7 | -5.9 ±7 | 1.46 | 6% | 0% | 1% | 0% | 0.43 | 8.2 | 8.2 |
| Fault Reader (`fault_reader`, U power 1) | G | -7.0 ±10 | -2.5 ±2.9 | +6.2 ±6 | 0.89 | 46% | 62% | 20% | 14% | 0.72 | 0.0 | 0.0 |
| Crossed Blades (`crossed_blades`, U power 1) | D | -2.0 ±11 | -2.3 ±2.9 | -4.4 ±6 | 0.99 | 47% | 67% | 29% | 13% | 0.69 | 0.0 | 0.0 |
| Ride the Surge (`ride_the_surge`, U skill 1) | SG | -6.0 ±10 | -2.2 ±2.9 | -1.0 ±5 | 0.93 | 40% | 26% | 22% | 35% | 0.52 | 9.5 | 9.5 |
| Reactive Plate (`reactive_plate`, R power 2) | B | -4.0 ±11 | -1.9 ±3.0 | +3.0 ±8 | 0.63 | 10% | 54% | 5% | 29% | 0.54 | 0.0 | 0.0 |
| Smouldering Core (`smouldering_core`, R power 2) | S | -9.0 ±10 | -1.9 ±2.9 | +5.5 ±7 | 0.59 | 53% | 76% | 31% | 32% | 0.58 | 0.0 | 0.0 |
| Sabre Rattle (`sabre_rattle`, C skill 1) | G | -7.0 ±10 | -1.8 ±2.6 | -2.0 ±7 | 1.49 | 11% | 1% | 6% | 0% | 0.67 | 11.5 | 11.5 |
| Forge Oath (`forge_oath`, R skill 0) | S | -5.0 ±11 | -1.8 ±3.0 | -1.4 ±7 | 0.65 | 78% | 43% | 64% | 32% | 0.04 | 2.3 | 1.1 |
| Cinder Heart (`cinder_heart`, U power 1) | - | -5.0 ±10 | -1.5 ±2.9 | -1.4 ±6 | 0.91 | 73% | 64% | 43% | 13% | 0.74 | 0.0 | 0.0 |
| Piston Jab (`piston_jab`, C attack 0) | SG | -8.0 ±10 | -1.3 ±2.8 | -1.9 ±7 | 1.47 | 4% | 15% | 0% | 0% | 0.90 | 11.4 | 5.7 |

### breaker: 10 strongest

| card | arch | cf Δwin | cf Δprog | pick Δ | offer/run | pick spike | pick timmy | pick turtle | pick novice | plays/draw | value/E | value/play |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Hammerfall (`hammerfall`, U attack 2) | S | +10.0 ±11 | +4.4 ±2.7 ** | +2.2 ±10 | 0.91 | 6% | 94% | 1% | 98% | 0.91 | 6.5 | 13.0 |
| Cool the Steel (`cool_the_steel`, C skill 1) | SB | +6.0 ±11 | +3.9 ±2.8 ** | +3.7 ±6 | 1.49 | 12% | 2% | 19% | 5% | 0.76 | 11.1 | 11.1 |
| Steal the Swing (`steal_the_swing`, R attack 1) | D | +9.0 ±11 | +3.8 ±2.8 ** | -0.9 ±8 | 0.62 | 26% | 80% | 38% | 90% | 0.61 | 13.1 | 13.1 |
| Bind the Blade (`bind_the_blade`, U skill 1) | SD | +12.0 ±11 ** | +3.4 ±2.7 ** | +9.6 ±6 | 0.90 | 58% | 28% | 53% | 7% | 0.16 | 38.2 | 38.3 |
| Rivet Wall (`rivet_wall`, C skill 2) | B | +9.0 ±12 | +3.4 ±3.0 ** | +6.3 ±5 | 1.47 | 10% | 12% | 21% | 50% | 0.60 | 7.3 | 14.6 |
| Read the Blow (`read_the_blow`, U skill 1) | DB | +11.0 ±11 | +3.1 ±2.8 ** | +4.4 ±6 | 0.86 | 58% | 37% | 87% | 72% | 0.68 | 10.5 | 10.5 |
| Coiled Strike (`coiled_strike`, U attack 2) | D | +4.0 ±9 | +3.0 ±2.4 ** | -0.1 ±7 | 0.91 | 15% | 83% | 9% | 90% | 0.69 | 10.0 | 20.0 |
| Pivot Sweep (`pivot_sweep`, C skill 1) | D | +9.0 ±12 | +2.9 ±3.1 | +4.4 ±6 | 1.50 | 20% | 5% | 31% | 3% | 0.20 | 28.7 | 28.9 |
| Counterweight (`counterweight`, C attack 1) | D | +5.0 ±11 | +2.4 ±2.7 | +4.1 ±6 | 1.43 | 5% | 23% | 4% | 25% | 0.70 | 9.3 | 9.3 |
| Endless Maul (`endless_maul`, R attack 1) | S | +4.0 ±11 | +1.9 ±3.0 | -3.0 ±8 | 0.59 | 45% | 98% | 25% | 80% | 1.20 | 12.5 | 12.5 |

### chronist: 15 weakest

| card | arch | cf Δwin | cf Δprog | pick Δ | offer/run | pick spike | pick timmy | pick turtle | pick novice | plays/draw | value/E | value/play |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Polyrhythm (`polyrhythm`, R power 2) | M | -7.0 ±13 | -2.5 ±3.4 | +2.8 ±8 | 0.65 | 8% | 55% | 8% | 22% | 0.48 | 0.3 | 0.4 |
| Gear Train (`gear_train`, C attack 1) | MG | -11.0 ±12 | -1.5 ±2.9 | +0.1 ±5 | 1.44 | 9% | 32% | 1% | 32% | 0.70 | 10.1 | 9.7 |
| Tide Table (`tide_table`, U power 1) | TG | -7.0 ±13 | -1.3 ±3.2 | -0.6 ±5 | 0.92 | 89% | 55% | 73% | 15% | 0.73 | 1.5 | 0.7 |
| Seen It Coming (`seen_it_coming`, R skill 1) | TO | -5.1 ±11 | -1.0 ±2.5 | +3.6 ±6 | 0.71 | 27% | 26% | 42% | 51% | 0.60 | 36.0 | 19.7 |
| Syzygy (`syzygy`, R attack 3) | TO | +0.0 ±13 | -1.0 ±3.5 | +1.1 ±7 | 0.68 | 72% | 87% | 56% | 100% | 0.75 | 15.2 | 39.1 |
| Fermata (`fermata`, U attack 1) | M | -7.0 ±11 | -0.9 ±2.5 | +2.8 ±6 | 1.07 | 6% | 69% | 0% | 70% | 0.88 | 14.7 | 13.6 |
| Downbeat (`downbeat`, C attack 2) | M | -3.0 ±13 | -0.8 ±3.4 | +2.8 ±5 | 1.54 | 1% | 65% | 0% | 87% | 0.66 | 7.3 | 14.3 |
| Turn the Tide (`turn_the_tide`, U attack 1) | O | -4.0 ±12 | -0.6 ±3.1 | +1.9 ±6 | 0.98 | 6% | 72% | 0% | 56% | 0.67 | 8.8 | 8.7 |
| Mainspring (`mainspring`, U skill 0) | M | -4.0 ±12 | -0.4 ±2.8 | +2.1 ±7 | 0.97 | 9% | 18% | 5% | 24% | 0.53 | 14.4 | 7.2 |
| Perpetual Motion (`perpetual_motion`, R power 3) | M | -3.0 ±12 | -0.4 ±2.9 | +2.1 ±8 | 0.68 | 5% | 46% | 1% | 36% | 0.37 | 0.0 | 0.1 |
| Breakwater (`breakwater`, U skill 2) | TO | -2.0 ±12 | -0.3 ±2.7 | +2.0 ±5 | 0.95 | 57% | 39% | 78% | 84% | 0.51 | 13.5 | 27.1 |
| Portents (`portents`, R power 2) | OG | -3.0 ±12 | -0.2 ±2.8 | -5.3 ±8 | 0.61 | 32% | 50% | 20% | 29% | 0.57 | 0.4 | 0.6 |
| Storm Glass (`storm_glass`, C skill 1) | TO | -5.0 ±11 | -0.2 ±2.9 | -2.7 ±4 | 1.53 | 31% | 11% | 41% | 40% | 0.60 | 21.0 | 21.0 |
| Mark the Lull (`mark_the_lull`, U skill 0) | O | -3.0 ±12 | -0.2 ±2.9 | +0.2 ±6 | 1.03 | 15% | 22% | 9% | 22% | 0.83 | 11.0 | 5.5 |
| Reef the Sails (`reef_the_sails`, C skill 1) | O | -5.0 ±12 | -0.0 ±3.1 | +2.3 ±7 | 1.61 | 1% | 2% | 10% | 6% | 0.28 | 8.9 | 8.9 |

### chronist: 10 strongest

| card | arch | cf Δwin | cf Δprog | pick Δ | offer/run | pick spike | pick timmy | pick turtle | pick novice | plays/draw | value/E | value/play |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Toll the Hours (`toll_the_hours`, R attack X) | TG | +13.0 ±13 ** | +5.1 ±2.9 ** | +1.6 ±7 | 0.66 | 87% | 100% | 66% | 84% | 0.91 | 13.6 | 33.4 |
| Culmination (`culmination`, R attack 2) | O | +12.0 ±13 | +4.0 ±3.0 ** | +0.9 ±9 | 0.65 | 24% | 73% | 10% | 89% | 0.73 | 8.8 | 17.6 |
| Heave To (`heave_to`, U skill 1) | OG | +12.1 ±13 | +3.5 ±3.2 ** | -0.1 ±5 | 0.98 | 69% | 47% | 75% | 50% | 0.60 | 10.3 | 10.3 |
| Lighthouse (`lighthouse`, R skill 2) | OG | +8.0 ±14 | +3.3 ±3.3 | -0.9 ±7 | 0.61 | 68% | 60% | 94% | 59% | 0.41 | 10.1 | 20.2 |
| Balance Wheel (`balance_wheel`, C skill 1) | MO | +11.0 ±13 | +3.1 ±3.3 | -1.2 ±5 | 1.47 | 10% | 8% | 34% | 10% | 0.34 | 8.8 | 8.7 |
| Logbook (`logbook`, C skill 1) | G | +11.0 ±12 | +3.0 ±2.8 ** | -8.9 ±8 | 1.54 | 6% | 3% | 8% | 14% | 0.33 | 8.3 | 8.3 |
| Wind Forward (`wind_forward`, C skill 0) | TG | +7.0 ±12 | +2.9 ±2.7 ** | +2.8 ±8 | 1.58 | 4% | 0% | 3% | 1% | 0.63 | 3.2 | 1.6 |
| Weather Eye (`weather_eye`, C skill 1) | OG | +9.0 ±13 | +2.9 ±3.1 | +7.7 ±4 | 1.51 | 36% | 14% | 44% | 27% | 0.65 | 10.4 | 10.4 |
| Glance Ahead (`glance_ahead`, U skill 0) | TG | +7.0 ±13 | +2.7 ±3.1 | -1.8 ±5 | 1.03 | 9% | 21% | 6% | 35% | 0.56 | 13.0 | 6.5 |
| Storm Warning (`storm_warning`, U power 1) | O | +3.0 ±13 | +2.5 ±3.1 | +3.4 ±5 | 1.00 | 41% | 63% | 46% | 17% | 0.88 | 1.1 | 0.6 |

### graft: 15 weakest

| card | arch | cf Δwin | cf Δprog | pick Δ | offer/run | pick spike | pick timmy | pick turtle | pick novice | plays/draw | value/E | value/play |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Blightcap (`blightcap`, C skill 2) | G | -13.0 ±11 ** | -4.7 ±2.5 ** | -0.7 ±5 | 1.51 | 23% | 20% | 13% | 1% | 0.35 | 15.5 | 30.3 |
| Thorn Halo (`thorn_halo`, U power 2) | G | -7.0 ±12 | -3.1 ±3.0 ** | -1.4 ±5 | 1.02 | 35% | 55% | 22% | 14% | 0.26 | 0.0 | 0.0 |
| Spore Haze (`spore_haze`, C skill 1) | B | -12.0 ±10 ** | -3.1 ±2.6 ** | -2.4 ±5 | 1.53 | 24% | 3% | 11% | 0% | 0.28 | 11.7 | 11.7 |
| Propagate (`propagate`, U skill 1) | M | -12.0 ±11 ** | -3.0 ±3.0 ** | +1.6 ±8 | 1.10 | 1% | 7% | 0% | 18% | 0.27 | 0.0 | 0.0 |
| Thresher (`thresher`, R power 2) | C | -2.0 ±11 | -1.8 ±2.8 | +4.4 ±7 | 0.65 | 87% | 56% | 72% | 37% | 0.28 | 0.0 | 0.0 |
| Decomposer (`decomposer`, U power 1) | C | -10.0 ±10 | -1.7 ±2.6 | -6.4 ±5 | 1.09 | 84% | 62% | 70% | 16% | 0.83 | 0.0 | 0.0 |
| Death Cap (`death_cap`, R attack 2) | B | -7.0 ±13 | -1.5 ±2.8 | -4.9 ±7 | 0.64 | 67% | 91% | 50% | 87% | 0.27 | 14.0 | 28.0 |
| Ripening Rot (`ripening_rot`, U power 1) | B | -2.0 ±11 | -1.5 ±2.6 | -2.2 ±5 | 0.99 | 52% | 61% | 34% | 11% | 0.75 | 0.0 | 0.0 |
| Reaping Vine (`reaping_vine`, R attack 2) | C | -9.0 ±12 | -1.4 ±2.9 | -2.4 ±8 | 0.67 | 26% | 64% | 9% | 79% | 0.29 | 0.0 | 0.0 |
| Canker Bite (`canker_bite`, C attack 1) | B | -4.0 ±12 | -1.1 ±2.9 | +0.2 ±5 | 1.55 | 3% | 34% | 0% | 33% | 0.66 | 11.7 | 11.7 |
| Excise (`excise`, U skill 1) | C | -2.0 ±11 | -0.3 ±2.7 | +0.0 ±6 | 0.99 | 18% | 24% | 7% | 16% | 0.23 | 0.0 | 0.0 |
| Mulch Maul (`mulch_maul`, C attack 1) | C | +4.0 ±10 | -0.3 ±2.5 | -0.8 ±5 | 1.57 | 4% | 39% | 0% | 44% | 0.56 | 6.2 | 6.2 |
| Miasma Sweep (`miasma_sweep`, U attack 2) | B | +1.0 ±12 | -0.3 ±2.8 | -1.2 ±4 | 1.11 | 66% | 65% | 46% | 63% | 0.57 | 11.6 | 22.7 |
| Transplant (`transplant`, R skill 0) | G | -1.0 ±11 | -0.3 ±2.9 | -4.2 ±11 | 0.69 | 1% | 27% | 0% | 35% | 0.22 | 0.0 | 0.0 |
| Leaf Litter (`leaf_litter`, C skill 1) | B | -5.0 ±11 | -0.1 ±2.6 | -2.2 ±5 | 1.51 | 48% | 10% | 31% | 0% | 0.50 | 0.2 | 0.2 |

### graft: 10 strongest

| card | arch | cf Δwin | cf Δprog | pick Δ | offer/run | pick spike | pick timmy | pick turtle | pick novice | plays/draw | value/E | value/play |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Heartwood Spear (`heartwood_spear`, R attack 2) | G | +19.0 ±13 ** | +5.5 ±2.8 ** | +3.0 ±7 | 0.67 | 50% | 100% | 32% | 100% | 0.73 | 14.7 | 28.9 |
| Twin Thorn (`twin_thorn`, U attack 2) | G | +20.0 ±12 ** | +5.3 ±2.9 ** | -0.1 ±7 | 0.94 | 25% | 94% | 12% | 95% | 0.71 | 14.2 | 27.8 |
| Thornwhirl (`thornwhirl`, C attack 2) | G | +9.0 ±12 | +2.6 ±2.9 | +1.7 ±5 | 1.52 | 12% | 63% | 4% | 64% | 0.64 | 14.5 | 28.6 |
| Patient Thorn (`patient_thorn`, U attack 1) | G | +9.0 ±12 | +2.4 ±2.7 | -0.9 ±6 | 1.00 | 22% | 71% | 3% | 75% | 0.85 | 12.1 | 12.0 |
| Sap Drip (`sap_drip`, C skill 0) | G | +8.0 ±12 | +2.4 ±2.9 | +7.0 ±7 | 1.55 | 6% | 0% | 1% | 3% | 0.72 | 4.6 | 2.3 |
| Fungal Aegis (`fungal_aegis`, R power 2) | B | +11.0 ±12 | +2.3 ±3.1 | +3.4 ±9 | 0.66 | 11% | 48% | 9% | 43% | 0.48 | 0.0 | 0.0 |
| Tendril Reach (`tendril_reach`, C skill 1) | G | +5.0 ±12 | +2.3 ±2.9 | -0.4 ±4 | 1.54 | 28% | 4% | 39% | 47% | 0.50 | 11.1 | 11.1 |
| Hivestrike (`hivestrike`, C attack 1) | M | +5.0 ±11 | +2.3 ±2.5 | -0.1 ±5 | 1.68 | 7% | 35% | 2% | 36% | 0.70 | 9.1 | 9.1 |
| Seed Rain (`seed_rain`, U skill 1) | G | +8.0 ±11 | +2.2 ±2.7 | +3.9 ±5 | 1.02 | 28% | 25% | 45% | 53% | 0.43 | 4.0 | 4.0 |
| Choking Spores (`choking_spores`, U skill 1) | B | +10.0 ±12 | +2.2 ±2.9 | +1.0 ±5 | 1.01 | 45% | 43% | 34% | 18% | 0.59 | 11.4 | 11.5 |

### Colourless (cf pooled over the classes; per-class columns in the CSV)

| card | cf Δwin (pooled) | cf Δprog (pooled) | Δprog breaker | Δprog chronist | Δprog graft | offer/run | pick (all) | plays/draw | value/E |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Salvage Kiln (`salvage_kiln`, R power 1) | -9.0 ±7 | -3.0 ±1.7 | -4.7 | -4.4 | -0.0 | 0.00 | - | 0.64 | 0.2 |
| Stress Fracture (`stress_fracture`, U skill 1) | -10.7 ±6 | -2.9 ±1.7 | -5.1 | -2.4 | -1.3 | 0.00 | - | 0.56 | 9.0 |
| Shard Cache (`shard_cache`, R skill 0) | -6.0 ±6 | -2.6 ±1.6 | -4.9 | -1.6 | -1.5 | 0.00 | - | 0.07 | 18.2 |
| Fault Beacon (`fault_beacon`, U skill 1) | -5.7 ±6 | -2.2 ±1.6 | -3.9 | -0.6 | -2.3 | 0.00 | - | 0.72 | 24.1 |
| Cutting Torch (`cutting_torch`, R skill 1) | -5.0 ±6 | -1.4 ±1.6 | -4.3 | +0.2 | -0.1 | 0.00 | - | 0.01 | 0.0 |
| Arc Lattice (`arc_lattice`, U attack 2) | -3.7 ±6 | -0.0 ±1.6 | -0.2 | +0.8 | -0.7 | 0.00 | - | 0.36 | 6.5 |
| Prism Resonance (`prism_resonance`, R power 2) | +1.3 ±7 | +0.1 ±1.7 | +1.1 | -0.2 | -0.7 | 0.00 | - | 0.48 | 0.1 |
| Clean Manifest (`clean_manifest`, R attack 2) | -2.0 ±6 | +0.3 ±1.6 | -0.3 | -0.1 | +1.4 | 0.00 | - | 0.27 | 3.4 |
| Gyro Jammer (`gyro_jammer`, U skill 1) | -1.0 ±6 | +0.4 ±1.6 | -0.3 | +1.3 | +0.2 | 0.00 | - | 0.14 | 6.0 |
| Mirror Tether (`mirror_tether`, R attack 2) | -1.0 ±6 | +0.4 ±1.5 | +1.5 | +1.3 | -1.6 | 0.00 | - | 0.21 | 5.7 |
| Salvage Kit (`salvage_kit`, U skill 1) | +0.0 ±6 | +0.8 ±1.6 | +1.1 | +1.9 | -0.6 | 0.00 | - | 0.66 | 0.1 |
| Medbay Voucher (`medbay_voucher`, R skill 1) | +2.3 ±6 | +1.0 ±1.7 | -1.0 | +2.4 | +1.4 | 0.00 | - | 0.26 | 0.2 |
| Overdraft Cell (`overdraft_cell`, U skill 0) | +2.7 ±7 | +1.7 ±1.6 | +0.7 | +2.0 | +2.3 | 0.00 | - | 0.93 | 20.1 |
| Star Survey (`star_survey`, U skill 0) | +4.0 ±6 | +1.7 ±1.5 | +2.0 | +1.4 | +1.6 | 0.00 | - | 0.49 | 7.8 |
| Ballast Lock (`ballast_lock`, U skill 2) | +3.0 ±7 | +1.7 ±1.6 | +1.4 | +2.0 | +1.7 | 0.00 | - | 0.67 | 5.1 |
| Relay Ping (`relay_ping`, U skill 0) | +4.7 ±6 | +1.8 ±1.6 | +0.8 | +1.1 | +3.3 | 0.00 | - | 0.91 | 13.0 |
| Jettison Pod (`jettison_pod`, U skill 0) | +4.7 ±7 | +1.8 ±1.7 | +0.8 | +1.7 | +2.9 | 0.00 | - | 0.91 | 14.2 |
| Grav Clamp (`grav_clamp`, R skill 2) | +5.3 ±7 | +1.9 ±1.7 | +1.4 | +2.2 | +2.1 | 0.00 | - | 0.17 | 4.1 |
| Shardfall (`shardfall`, U attack 2) | +4.3 ±6 | +2.6 ±1.6 | +3.8 | +2.2 | +1.9 | 0.00 | - | 0.58 | 8.9 |
| Snare Line (`snare_line`, U skill 1) | +9.0 ±7 | +3.0 ±1.7 | +2.6 | +3.1 | +3.5 | 0.00 | - | 0.26 | 28.0 |

Weakest colourless: Salvage Kiln, Stress Fracture, Shard Cache, Fault Beacon, Cutting Torch, Arc Lattice, Prism Resonance, Clean Manifest, Gyro Jammer, Mirror Tether, Salvage Kit, Medbay Voucher, Overdraft Cell, Star Survey, Ballast Lock. Strongest: Snare Line, Shardfall, Grav Clamp, Jettison Pod, Relay Ping, Ballast Lock, Star Survey, Overdraft Cell, Medbay Voucher, Salvage Kit.

## 4. Relics (counterfactual: granted on floor 1)

Each relic is granted before the Ascent Pact and the run is replayed on the same seeds as the no-relic baseline (spike). Pooled = every class the relic can drop for. **triggers/run**: `relic_trigger` events in the treated runs (0 = never flashed: a passive modifier or a relic that never fires; check). **held Δ**: the v1-style observational delta (runs ending with the relic minus runs without, spike), shown to expose its survivorship bias.

### 15 most overpowered

| relic | cf Δwin pooled | cf Δprog pooled | Δwin breaker | Δwin chronist | Δwin graft | triggers/run | held Δ (spike) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Gravity Loom (`gravity_loom`, boss) | +21.8 ±6 ** | +6.6 ±1.4 ** | +27 ±10 | +15 ±11 | +23 ±10 | 0.0 | +48.7 |
| Star Pip (`star_pip`, common, chronist) | +16.0 ±10 ** | +5.2 ±2.4 ** | - | +16 ±10 | - | 59.8 | +39.9 |
| Engine Tooth (`engine_tooth`, event) | +9.6 ±6 ** | +3.6 ±1.4 ** | +4 ±9 | +7 ±11 | +17 ±11 | 25.5 (⚠ 1 runs threw) | +24.1 |
| Tuning Fork (`tuning_fork`, common, chronist) | +8.0 ±10 | +3.6 ±2.5 ** | - | +8 ±10 | - | 31.0 | +35.9 |
| Notched Buckler (`notched_buckler`, common, breaker) | +6.0 ±9 | +3.1 ±2.2 ** | +6 ±9 | - | - | 60.0 | +17.8 |
| Heartwood Ring (`heartwood_ring`, uncommon, graft) | +10.7 ±10 ** | +3.1 ±2.2 ** | - | - | +11 ±10 | 23.9 | +14.6 |
| Fixed Star (`fixed_star`, boss, chronist) | +3.3 ±11 | +3.1 ±2.8 ** | - | +3 ±11 | - | 0.0 | +28.0 |
| Timeline Clamp (`timeline_clamp`, shop, chronist) | +8.0 ±10 | +2.9 ±2.4 ** | - | +8 ±10 | - | 0.0 | +18.0 |
| Geode Heart (`geode_heart`, common) | +10.7 ±5 ** | +2.9 ±1.1 ** | +3 ±7 | +15 ±9 | +14 ±10 | 23.0 | +28.7 |
| Stim Patch (`stim_patch`, common) | +6.7 ±5 ** | +2.7 ±1.0 ** | +3 ±7 | +9 ±9 | +8 ±9 | 11.0 | +16.9 |
| Chain Wraps (`chain_wraps`, common, breaker) | +8.0 ±9 | +2.6 ±2.4 ** | +8 ±9 | - | - | 105.7 | +17.8 |
| Stormbreak Gem (`stormbreak_gem`, rare, breaker) | +10.7 ±8 ** | +2.4 ±1.8 ** | +11 ±8 | - | - | 20.7 | +24.6 |
| Timeline Spool (`timeline_spool`, uncommon, chronist) | +7.3 ±10 | +2.2 ±2.5 | - | +7 ±10 | - | 106.1 | +36.7 |
| Prophet Glass (`prophet_glass`, rare, chronist) | +4.7 ±10 | +2.1 ±2.2 | - | +5 ±10 | - | 0.0 | +22.0 |
| Practice Dummy (`practice_dummy`, shop, breaker) | +6.0 ±9 | +2.1 ±2.5 | +6 ±9 | - | - | 21.2 | +29.2 |

### 15 weakest

| relic | cf Δwin pooled | cf Δprog pooled | Δwin breaker | Δwin chronist | Δwin graft | triggers/run | held Δ (spike) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Cracked Hourglass (`cracked_hourglass`, boss) | -33.8 ±4 ** | -15.9 ±1.3 ** | -25 ±7 | -45 ±8 | -31 ±7 | 0.0 | -33.3 |
| Exposed Core (`exposed_core`, boss) | -23.8 ±5 ** | -9.1 ±1.4 ** | -18 ±8 | -34 ±9 | -19 ±9 | 16.8 | -4.7 |
| Heavy Heart (`heavy_heart`, boss, breaker) | -20.0 ±8 ** | -7.1 ±2.4 ** | -20 ±8 | - | - | 0.0 | - |
| Stasis Engine (`stasis_engine`, boss) | -6.7 ±6 ** | -3.1 ±1.4 ** | -15 ±9 | +2 ±11 | -7 ±9 | 0.0 | +11.9 |
| Star Atlas (`star_atlas`, boss) | -9.0 ±6 ** | -2.8 ±1.7 ** | -11 ±9 | - | -7 ±9 | 63.8 | - |
| Hollow Bough (`hollow_bough`, rare, graft) | -8.0 ±9 | -2.4 ±2.1 ** | - | - | -8 ±9 | 7.3 | +8.4 |
| Void Compass (`void_compass`, rare) | -5.3 ±5 ** | -1.3 ±1.4 | -8 ±8 | -9 ±10 | +1 ±9 | 0.0 | +11.3 |
| Rot Censer (`rot_censer`, uncommon, graft) | +0.0 ±7 | -0.8 ±1.3 | - | - | +0 ±7 | 0.0 | +15.1 |
| Bastion Core (`bastion_core`, rare, breaker) | -3.3 ±8 | -0.8 ±2.0 | -3 ±8 | - | - | 46.6 | +2.8 |
| Crowd Breaker (`crowd_breaker`, uncommon, breaker) | -3.3 ±6 | -0.7 ±1.3 | -3 ±6 | - | - | 5.1 | +6.0 |
| Parry Charm (`parry_charm`, uncommon, breaker) | -4.0 ±7 | -0.6 ±1.4 | -4 ±7 | - | - | 19.9 | +5.7 |
| Ghost Lantern (`ghost_lantern`, boss) | -2.9 ±6 | -0.5 ±1.6 | -7 ±9 | -1 ±12 | -1 ±11 | 46.1 (⚠ 1 runs threw) | +29.9 |
| Pocket Star Chart (`pocket_star_chart`, uncommon) | -3.7 ±3 ** | -0.4 ±0.6 | -4 ±5 | - | -3 ±4 | 3.9 | +9.7 |
| Wild Growth (`wild_growth`, boss, graft) | +0.0 ±10 | -0.2 ±2.4 | - | - | +0 ±10 | 22.3 | - |
| Hairline Saw (`hairline_saw`, uncommon) | -2.4 ±3 | -0.1 ±0.5 | -1 ±5 | -3 ±6 | -3 ±5 | 5.4 | +22.8 |

Baseline arm win rate: breaker 26.7% (150 seeds), graft 32.7% (150 seeds), chronist 46.0% (150 seeds).

CI achieved: per relic x class Δwin 95% half-width median 8.4 pts; pooled over classes median 6.0 pts; Δprog pooled median ±1.4 floors.

Relics with 0 triggers in every treated run: `shard_lens`, `slow_temper`, `crystal_spine`, `bulwark_rivets`, `duelists_oath`, `heavy_heart`, `cracked_hourglass`, `void_compass`, `stasis_engine`, `binding_contract`, `shard_crucible`, `tender_plating`, `shard_writ`, `vial_rack`, `fracture_engine`, `grafting_knife`, `gravity_loom`, `mycelial_net`, `rot_censer`, `ascendant_prism`, `elder_seed`, `metronome_heart`, `prophet_glass`, `offbeat_drum`, `timeline_clamp`, `fixed_star`, `shard_debt`.

Card counterfactual CI achieved: Δwin 95% half-width median 11.4 pts per card x class; Δprog median ±2.8 floors.

## 5. Potions (spike, observational)

Gained and used per 100 runs, the share used in boss / elite / hallway fights, and the share of gained potions that were used.

| potion | gained / 100 runs | used / 100 runs | used / gained | boss / elite / monster |
| --- | --- | --- | --- | --- |
| Flare Cell (`pot_flare_cell`) | 89.3 | 88.5 | 99% | 24% / 15% / 51% |
| Shield Gel (`pot_shield_gel`) | 87.0 | 85.3 | 98% | 31% / 16% / 52% |
| Concussion Gas (`pot_concussion_gas`) | 88.0 | 85.0 | 97% | 42% / 14% / 44% |
| Quicksilver (`pot_quicksilver`) | 86.0 | 84.2 | 98% | 35% / 16% / 49% |
| Bastion Tonic (`pot_bastion_tonic`) | 85.5 | 83.7 | 98% | 28% / 18% / 54% |
| Charge Cell (`pot_charge_cell`) | 88.8 | 82.7 | 93% | 36% / 17% / 47% |
| Blight Vial (`pot_blight_vial`) | 84.2 | 81.5 | 97% | 33% / 20% / 47% |
| Seer's Draught (`pot_seers_draught`) | 80.2 | 78.0 | 97% | 36% / 16% / 47% |
| Fault Dust (`pot_fault_dust`) | 76.7 | 76.0 | 99% | 29% / 17% / 54% |
| Shard Tincture (`pot_shard_tincture`) | 88.7 | 69.0 | 78% | 75% / 9% / 15% |
| Rewind Phial (`pot_rewind_phial`) | 37.0 | 36.3 | 98% | 23% / 16% / 60% |
| Halt Ampoule (`pot_halt_ampoule`) | 30.3 | 28.8 | 95% | 11% / 18% / 70% |
| Fury Draught (`pot_fury_draught`) | 28.8 | 27.5 | 95% | 35% / 16% / 45% |
| Mending Ampoule (`pot_mending_ampoule`) | 26.0 | 26.0 | 100% | 17% / 18% / 45% |
| Tempo Draught (`pot_tempo_draught`) | 31.2 | 24.3 | 78% | 61% / 8% / 31% |
| Growth Sap (`pot_growth_sap`) | 24.5 | 21.8 | 89% | 32% / 23% / 43% |

## 6. Bug flags

- Cards played ≥ 20 times with zero realised value per play (not Powers): `propagate` (graft, 506 plays), `transplant` (graft, 156 plays), `salvage_kit` (graft, 241 plays), `medbay_voucher` (graft, 33 plays), `salvage_kit` (breaker, 361 plays).
- Cards drawn ≥ 30 times and never played: `cutting_torch` (breaker, 118 draws).
- Cards whose counterfactual changed no run at all (identical outcomes on every seed): none.
- Relics that never triggered: see section 4.
- Stalemates (a combat over 100 turns, counted as a loss): johnny-bulwark/breaker `enc_a1_orchid` (v2-55-breaker), johnny-bulwark/breaker `enc_a3_leukarch` (v2-59-breaker), johnny-bulwark/breaker `enc_a1_orchid` (v2-88-breaker), johnny-bulwark/breaker `enc_a2_assembler` (v2-134-breaker), johnny-duellist/breaker `enc_a3_leukarch` (v2-8-breaker), johnny-duellist/breaker `enc_a3_leukarch` (v2-32-breaker), johnny-duellist/breaker `enc_a1_orchid` (v2-116-breaker), turtle/breaker `enc_a3_leukarch` (v2-8-breaker), turtle/breaker `enc_a3_leukarch` (v2-11-breaker), turtle/breaker `enc_a3_leukarch` (v2-17-breaker), turtle/breaker `enc_a3_leukarch` (v2-30-breaker), turtle/breaker `enc_a3_leukarch` (v2-44-breaker), turtle/breaker `enc_a3_leukarch` (v2-52-breaker), turtle/breaker `enc_a3_leukarch` (v2-59-breaker), turtle/breaker `enc_a3_phage_mother` (v2-61-breaker), turtle/breaker `enc_a3_leukarch` (v2-106-breaker), turtle/breaker `enc_a3_leukarch` (v2-114-breaker), turtle/breaker `enc_a3_leukarch` (v2-136-breaker), turtle/breaker `enc_a2_assembler` (v2-139-breaker), turtle/breaker `enc_a1_orchid` (v2-148-breaker), turtle/breaker `enc_a3_leukarch` (v2-150-breaker), turtle/breaker `enc_a3_leukarch` (v2-153-breaker), turtle/breaker `enc_a1_orchid` (v2-195-breaker), turtle/chronist `enc_a1_spore_cluster` (v2-141-chronist).
- Runs that threw (engine or policy errors; excluded from every number above): 14x "pending choice "Upgrade 3 cards." has more than 5000 legal answers; constrain min/max" (e.g. timmy/v2-8-graft, timmy/v2-82-graft, novice/v2-101-chronist); 2x "Shard Cache missing finished copy" (e.g. spike/cf-100-breaker, spike/cf-68-breaker).
