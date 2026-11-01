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
