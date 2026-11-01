# Vibespire — Enemies and encounters (v2)

Status: v2 encounter pass (2026-10-31) on top of v1. Every v2 change is marked "(v2; was …)" in place, and §4.5 explains the new shared mechanics and the data behind them. Encounter designer. This file owns every enemy, minion, encounter and encounter pool. Mechanic rules (Exposed, Stagger, Rot, Riposte, Guard, Augury, the damage pipeline, the turn order) are owned by `docs/GDD.md`; where this file needs a rule, it cites the GDD section and does not restate it differently. The engine contract is `docs/ENGINE_SPEC.md`; the few additions this roster needs are collected in §5.

Numbers follow STS1's A0 skeleton (`docs/research/sts-design.md` §2.9): Act 1 normals 10–55 HP with 5–14 single hits; Act 2 about ×2–2.5 HP and ×1.5–2 damage; Act 3 again. Everything here is a starting point for the simulator, not a final tune.

---

## 0. Conventions (read once)

### 0.1 How each enemy is written

- **id** is `snake_case` and stable. **HUD** is the ≤8-character name shown in the Phantasy Star enemy-name window (`docs/research/art-style.md` §1.1).
- **HP** is a closed range, rolled at spawn from the enemy's own rng stream (`EnemyState.rng`, seeded from `enemy`).
- **Spawn** lists statuses the enemy has at spawn. A **passive** is an enemy-only status with `stacks: 'flag'` and hooks. It is shown as an icon on the enemy with its full rule in the tooltip, so nothing is hidden.
- **Moves table**: `move id` · display name · intent kind (from `IntentKind` in `src/engine/types.ts`: `attack`, `attack_defend`, `attack_buff`, `attack_debuff`, `defend`, `defend_buff`, `buff`, `debuff`, `unknown`, `sleep`, `escape`, `special`) · exact effect, in effect order. "A×B" means `damage {amount: A, times: B}` against the player. Summons use intent `special`.
- **AI** is deterministic pseudo-code (§0.3). **Question / answers / difficulty** follow commandment 7: one named question, at least two deck shapes that answer it.

### 0.2 Timing facts this roster leans on (from GDD §2.0, §2.10–2.11, §2.15)

- A hit = `max(0, base + flat − attacker Stagger + target Exposed)`. Stagger and Exposed are summed in one step (GDD §0.3.7).
- **Exposed or Stagger applied to the player during the enemy phase** affects the rest of that enemy phase at full value, then loses 1 at the end of the player's next turn. So "apply 2 Exposed" means +2 per hit for any enemy still to act this phase, then +1 per hit through the whole next enemy phase. That is why enemies here apply Exposed in 2s and 3s. Each encounter lists its enemies in **action order**, and markers are listed first on purpose.
- **Stagger the player has** reduces each hit of your Attacks (and Riposte hits) by 1 per stack. Rot, Timeline-resolved damage that isn't a hit, and other HP loss ignore it. Stagger 2 applied during the enemy phase gives −2 on your next turn and −1 on the turn after.
- **Enemy Block resets at the start of that enemy's own turn**, so Block an enemy gains during its move protects it through your whole next turn. **Rot is HP loss and ignores Block and Guard** (GDD §2.6). Several designs below (Shellback Titan, Boiler Tyrant, Leukarch) count on this.
- **Riposte fires when an attack is declared, before its first hit, and cancels the attack if it kills the attacker** (GDD §2.2). "If this attack triggers a Riposte" is therefore known before the hits resolve.
- Enemy **Guard** (GDD §2.3) is a separate pool that halves at the start of the enemy's own turn. Enemies that bank defence use Guard; enemies that "shell up" for one turn use Block.

### 0.3 AI pseudo-code conventions and the Augury contract

GDD §2.9 is binding. `chooseMove` is a pure function of the enemy's own rng, `history`, `turn`, `aiState`, its own HP/statuses, and **which allies are alive**. It never reads player state or ally HP. Anything that reacts to the player (cards held, draw pile, Riposte) lives in the **move's effects or amounts at resolve time**, and the intent preview computes it live. This roster contains no AI branch that breaks the contract.

- `T` is the turn the move is being chosen *for* (turn 1 = the first enemy phase). **[ask §5.6: expose `forTurn` on `EnemyAiCtx`]**.
- `last` = the last move in history (including the current intent when the forecast is computed). `inARow(m)` = `timesInARow(m)`.
- `pick({a: 45, b: 30, c: 25})` draws from the enemy's rng. Any rule written "never X twice in a row" removes X from the table when `last == X`, and the remaining weights are renormalised. "At most N in a row" removes X when `inARow(X) == N`.
- `allies(id)` = living allies with that id. `phase` = `aiState.phase` (default 1). It is set by `onDamaged` when an HP threshold is crossed.
- **Phase changes never rewrite the current intent.** They only change what the enemy chooses next, so a phase change can't ambush a planned turn. The forecast flickers and updates (GDD §2.9.4). The only intents that are ever replaced mid-turn are the three listed overrides: Bramble Ram's *Charge broken*, Boiler Tyrant's *Blowout* and Gnasher pack *flee*. Each is shown live, with its trigger on a meter.
- **Hidden information only as a telegraphed ability.** Loom Oracle's forecast shows "?" (GDD `MoveDef.augury = 'hidden'`), and its passive states the pattern it hides within. Prism Seer's Refraction re-rolls forecasts, and it is a visible move on its own intent.

### 0.4 Enemy-only statuses defined here

| id | Name | Stacks | Decay | Rule |
|---|---|---|---|---|
| `might` | Might | amount | never | +1 damage per hit on this enemy's attacks, per stack (pipeline step 2, enemy-only per GDD §2.15). Used only where an enemy buffs **another** enemy; enemies scale their own moves through `aiState` escalation shown in the intent. |
| passives | (per enemy) | flag | never | Rules given in each enemy entry. They are hooks on the status: `onCardPlayed`, `onShuffle`, `onDamaged`, `onTurnStart`, and so on. |

No enemy here grants Artifact-like debuff immunity, thorns, a damage cap, Intangible or a Strength-per-turn ritual.

### 0.5 Status cards enemies add

Status cards are GDD §7's (`status_tangle`, `status_jitter`, `status_backlash`, `status_vacuum_chill`). This file only decides **who adds which, how many and where**. Act 1 adds Tangle (clog; Prune fodder). Act 2 adds Jitter and Backlash. Act 3 adds Vacuum Chill, sparingly. All of them are combat-only (commandment 24). Where a mechanic counts them, it says "Status cards", meaning any card of type `status` in your hand, draw pile and discard pile (not the Scrapheap). Prune Scrapping them is an intended answer.

### 0.6 Minions and summons

A summoned enemy is appended to `combat.enemies`, so it acts after everything already on the field, and it does not act in the enemy phase it was summoned in. It carries `leaderUid` = its summoner and one of two explicit flags **[ask §5.1]**:

- `dies_with_leader`: when the leader dies, the minion dies at once. It counts as a death, so Rot spreads from it and on-kill relics fire.
- `flees_with_leader`: when the leader dies, the minion's intent becomes `escape` immediately and it leaves at the start of its own slot. A fled enemy is not a death (no Rot spread, no on-kill effects). Combat is won when every enemy is dead or fled.

Summoning caps are listed per enemy and count only living minions.

---

## 1. Act 1 — The Verdant Decks

**Act question: front-loaded damage.** Can your deck kill a thing before its turn-3 plan lands? Secondary themes: learning Exposed and Stagger, and target priority (markers, a support, a pack leader). Palette: saturated blues, purples, cyans and greens, with one warm accent per sprite (pollen yellow, ember eyes).

| id | Name | HUD | Role | HP | Pools |
|---|---|---|---|---|---|
| `gnasher` | Gnasher | GNASHER | weak pack beast, multi-hit | 13–17 | easy, hard, elite minion |
| `sporepuff` | Sporepuff | SPOREPUF | weak debuffer (Stagger, Tangle) | 10–13 | easy, hard |
| `scrap_drone` | Scrap Drone | S.DRONE | weak marker (Exposed) | 15–19 | easy, hard |
| `thornback` | Thornback | THORNBAK | bruiser, telegraphed spike | 42–46 | easy, hard |
| `vinelash` | Vinelash | VINELASH | multi-hit + Stagger | 48–54 | hard |
| `flitterfang` | Flitterfang | FLITTER | **clock** (Exposed on you) | 24–28 | hard |
| `sickle_mantis` | Sickle Mantis | MANTIS | **anti-Riposte pressure** | 40–44 | hard |
| `pollen_wisp` | Pollen Wisp | P.WISP | **healer/buffer**, dangerous if left | 20–24 | hard |
| `gnasher_alpha` | Gnasher Alpha | ALPHA | elite, **summoner** | 62–66 | elite |
| `dreadcap` | Dreadcap | DREADCAP | elite, status clock | 100–106 | elite |
| `shellback_titan` | Shellback Titan | TITAN | elite, **rewards burst windows / Rot** | 80–86 | elite |
| `bramble_ram` | Bramble Ram | RAM | boss | 200–210 | boss |
| `mother_orchid` | Mother Orchid | ORCHID | boss, **summoner** | 165–175 | boss |
| `orchid_bud` | Orchid Bud | BUD | minion, **dangerous if left** | 8–10 | (summoned) |
| `gloam_empress` | Gloam Empress | EMPRESS | boss, Stagger on you | 195–205 | boss |

### 1.1 Weak and normal enemies

#### `gnasher` — Gnasher (GNASHER)
- **Visual**: a knee-high cyan lizard-pup with an oversized purple-gummed jaw, a green neck frill and stubby claws.
- **HP** 15–19 (v2; was 13–17). **Spawn**: none.

| move | name | intent | effect |
|---|---|---|---|
| `nip` | Nip | attack | 3×2 |
| `lunge` | Lunge | attack | 8 (v2; was 7) |

- **AI**: `T == 1: pick({nip: 50, lunge: 50})`; else `pick({nip: 55, lunge: 45})`, at most 2 in a row of either.
- **Question**: none on its own (a weak-pool body). In packs it teaches that Stagger 1 removes a third of a Nip, and that a 3-hit Exposed stack on you turns a 3×2 into a 5×2.
- **Answers**: anything that deals 15 in a turn. **Difficulty**: trivial alone; the floor-1 check for a starter deck when paired.

#### `sporepuff` — Sporepuff (SPOREPUF)
- **Visual**: a floating violet puffball with cyan spots, two stubby leaf-fins and one sleepy half-lidded eye.
- **HP** 14–17 (v2; was 10–13). **Spawn**: none. `aiState.slot` = how many Sporepuffs spawned before it.

| move | name | intent | effect |
|---|---|---|---|
| `puff` | Puff | debuff | Shuffle 1 `status_tangle` into your draw pile. |
| `sting` | Sting | attack | 7 (v2; was 5) |
| `dust` | Spore Dust | debuff | Apply 2 Stagger to you, unless you already have 2 or more (v2). |

- **AI**: `T == 1`: if `allies('sporepuff') ≥ 1` then `[sting, dust, sting][slot % 3]` (v2; was `[puff, sting, dust]`); else `sting` if any other enemy is alive (v2), `puff` if it is truly alone. Afterwards `pick({sting: 50, dust: 25, puff: 25})`, never the same twice in a row.
- **Question**: (weak) "Do you notice what Stagger does to your hits?" It is the first enemy that blunts you.
- **v2 cap**: in v1 a Spore Cluster could stack your Stagger to 20 while its Puffs buried your deck in Tangles: a Block-only Breaker turtle stalemated it for 3,000+ turns (seed `v2-67-breaker`). Dust now tops you up to 2 and no further.
- **Answers**: kill it first (11 HP); or ignore the Stagger and play Skills that turn. **Difficulty**: trivial; in a trio it is a mini AoE check.

#### `scrap_drone` — Scrap Drone (S.DRONE)
- **Visual**: a hovering salvaged drone in cyan and green plating with a single red lens, a rotor ring on top and two dangling manipulator claws.
- **HP** 19–23 (v2; was 15–19). **Spawn**: none.

| move | name | intent | effect |
|---|---|---|---|
| `zap` | Zap | attack | 7 (v2; was 6) |
| `target_lock` | Target Lock | debuff | Apply 2 Exposed to you. |

- **AI**: `T == 1`: `target_lock` if two or more allies are alive (v2; was any ally), else `zap`. Afterwards `pick({zap: 60, target_lock: 40})`, never `target_lock` twice in a row.
- **Question**: "Do you kill the marker before it marks?" You act first, so 17 damage on turn 1 erases the turn-1 lock entirely. Encounters list it **first**, so its lock boosts every ally that phase.
- **Answers**: turn-1 front-load on the drone, or Block heavily on lock turns (Exposed adds per hit, so it punishes the multi-hitters it travels with). **Difficulty**: low; it is a priority lesson.
- **Tiering**: returns in Act 2 as `furnace_drone` (§2.1).

#### `thornback` — Thornback (THORNBAK)
- **Visual**: a squat teal boar with a ridge of purple bramble spines, two forward-curling tusks and glowing green eyes.
- **HP** 42–46. **Spawn**: none.

| move | name | intent | effect |
|---|---|---|---|
| `gore` | Gore | attack | 11 + `aiState.bristle`; then `bristle = 0`. (v2; was 13: Gore alone dealt 9.7% of all HP lost in the v1 sim.) |
| `bristle` | Bristle | defend_buff | Gain 9 Block. `aiState.bristle = 4` (its next Gore deals 15). |
| `trample` | Trample | attack | 5×2 |

- **AI**: `T == 1: gore`. If `last == bristle`: `gore`. Otherwise `pick({gore: 40, bristle: 30, trample: 30})`, never `gore` twice in a row and never `bristle` twice in a row.
- **Question**: "Can you put 44 damage in before the 15-damage Gore lands?" The Bristle → Gore pair is always visible one turn ahead (two with Augury).
- **Answers**: front-loaded Attacks (two good turns kill it), or a Block/Guard turn timed to the boosted Gore. Riposte loves it: every move is a single attack. **Difficulty**: the Act 1 "Jaw Worm" slot. It is an easy-pool body and a hard-pool anchor.

#### `vinelash` — Vinelash (VINELASH)
- **Visual**: a rooted green pitcher-plant with three whip vines, a purple fanged maw and cyan bioluminescent buds along its stem.
- **HP** 44–50 (v2; was 48–54). **Spawn** (v2): passive `facets` 2: *Each hit on it deals 1 less damage per Facet. A hit of yours that still deals 10 or more shatters a Facet, and you gain 1 Shard.* Armour that Shards off: it blunts many small hits and pays big hits in the shared Shard currency. **Spawn**: none.

| move | name | intent | effect |
|---|---|---|---|
| `lash` | Lash | attack | 4×3 |
| `ensnare` | Ensnare | debuff | Apply 2 Stagger to you. Gain 6 Block. |
| `strangle` | Strangle | attack | 11 |

- **AI**: `T == 1: ensnare`. Afterwards `pick({lash: 50, strangle: 30, ensnare: 20})`, never `ensnare` twice in a row, at most 2 `lash` in a row.
- **Question**: "Can your offence work while blunted, and can you blunt it back?" This is a hallway rehearsal for the Gloam Empress.
- **Answers**: big single hits (Stagger 2 takes 2 off a 14-damage hit, but 4 off two 6s); applying Stagger yourself (Stagger 2 turns Lash into 2×3); Rot (unaffected by Stagger). **Difficulty**: medium; the longest Act 1 hallway fight.

#### `flitterfang` — Flitterfang (FLITTER) — *clock; many small hits*
- **Visual**: a blue bat with oversized cyan ear-fans, purple membrane wings spread wide and tiny yellow fangs.
- **HP** 24–28. **Spawn**: passive `frenzy` (v2, replaces `shrill`): *Each Frenzied Bite hits 1 more time than the one before, for the rest of the fight.*

| move | name | intent | effect |
|---|---|---|---|
| `frenzied_bite` | Frenzied Bite | attack | 3 × (2 + `aiState.frenzy`); then `frenzy += 1`. |
| `swoop` | Swoop | attack | 7 |

- **v2 rework**: the v1 Shrill Exposed clock stacked with every multi-hitter and made the fight a 4 HP non-event for the planner bots while being swingy for players. Frenzy is a readable clock on its own attack (3×2, 3×3, 3×4, …) and the Act 1 target for Riposte cards that scale with the attack's hits (Breaker `trigger_hits` cards) and for Stagger (each stack removes a point per hit).

- **AI**: `T == 1: frenzied_bite`. Afterwards `pick({frenzied_bite: 70, swoop: 30})`, never `swoop` twice in a row.
- **Design rule**: at most one Flitterfang per encounter.
- **The clock**: every Bite adds a hit, so its Bites read 6 → 9 → 12 → 15. Kill it in two turns and it never gets going.
- **Question**: "Will you kill the thing that's making everything else worse?" (The clock / dangerous-if-left-alive slot.)
- **Answers**: kill it in two turns (26 HP); Stagger it (each stack removes one per hit); or prime a hit-scaling Riposte into a long Bite. **Difficulty**: medium; harder in pairs with multi-hitters.

#### `sickle_mantis` — Sickle Mantis (MANTIS) — *anti-Riposte pressure*
- **Visual**: a tall emerald mantis with two oversized cyan scythe-arms crossed in an X, violet compound eyes and a wasp-thin waist.
- **HP** 40–44. **Spawn**: passive `reads_the_guard`: *Twin Sickle gains +1 hit if it triggers one of your Riposte cards.*

| move | name | intent | effect |
|---|---|---|---|
| `twin_sickle` | Twin Sickle | attack | 5 × (2 + `trigger`) where `trigger` = 1 if this attack triggered a Riposte at declaration, else 0. Then add `aiState.honed` per hit and set `honed = 0`. |
| `preen` | Preen | defend_buff | Gain 10 Block. `aiState.honed = 2` (its next attack +2 per hit). |
| `scissor_cut` | Scissor Cut | attack | 14 + `honed`; then `honed = 0`. |

- **Rule phrasing (exact)**: the check is made when the attack is declared, right after the Riposte check (GDD §2.2). If the Riposte kills the Mantis, the attack is cancelled as usual. The intent shows "5×2 (5×3 if parried)" while you have a primed card or a Riposte card in hand, so you always know the price before you end your turn.
- **AI**: `T == 1: twin_sickle`. Afterwards `pick({twin_sickle: 45, scissor_cut: 30, preen: 25})`, never the same twice in a row.
- **Question**: "Do you hold your answer, or spend it now?" Holding a Riposte into Twin Sickle costs one more 5-damage hit. Holding into Scissor Cut (a single hit) is free.
- **Answers**: (1) Breaker reads the intent: on Twin Sickle turns she plays Shoulder Check for face value or Guards the extra hit; on Scissor Cut turns she primes. (2) Any deck that front-loads 42 damage in three turns. Graft and Chronist simply fight a bruiser. **Difficulty**: medium. It taxes holding without banning it (the extra hit is 5 damage; Shoulder Check's Riposte still deals 6).

#### `pollen_wisp` — Pollen Wisp (P.WISP) — *support; dangerous if left*
- **Visual**: a floating dandelion-headed fairy-moth with a cyan seed-crown halo, two purple petal wings and a glowing yellow core.
- **HP** 20–24. **Spawn**: none.

| move | name | intent | effect |
|---|---|---|---|
| `pollinate` | Pollinate | buff | Every other living enemy gains 1 Might. |
| `dewdrop` | Dewdrop | buff | Heal the other living enemy with the lowest HP (resolve time; ties: leftmost) by 8. |
| `seed_flick` | Seed Flick | attack | 4 |

- **AI**: if no other ally is alive: `seed_flick`. `T == 1: pollinate`. Afterwards `pick({pollinate: 45, dewdrop: 30, seed_flick: 25})`, never the same twice in a row. (The AI never looks at ally HP, per §0.3. A Dewdrop into full-HP allies is a visible wasted turn.)
- **Might** is permanent, so a Wisp left alive for 5 turns adds +2 to +3 per hit to its partner.
- **Question**: "Will you swat the support first?" **Answers**: 22 damage of single-target front-load on turn 1–2; or AoE; or ignoring it with Rot on the main body (Might does nothing to Rot's maths and Riposte cancels big hits). **Difficulty**: low alone, medium with a multi-hitter.

### 1.2 Act 1 elites

Each elite drops one relic by the GDD's elite roll. "Relic bias" names the existing GDD relic that best rewards beating it. It is a suggestion if the systems designer wants per-elite drop bias **[ask §5.7]**.

#### `gnasher_alpha` — Gnasher Alpha (ALPHA) — *summoner*
- **Visual**: a hulking blue-scaled lizard-wolf twice a Gnasher's size, with a purple crest of spines, a scarred jaw and one torn frill.
- **HP** 64–68 (v2; was 62–66). **Spawn**: none. Comes with 2 `gnasher`s that have `leaderUid` = Alpha and **`flees_with_leader`**.

| move | name | intent | effect |
|---|---|---|---|
| `rend` | Rend | attack | 6×2 (v2; was 5×2) |
| `maul` | Maul | attack | 15 (v2; was 14) |
| `rally_howl` | Rally Howl | defend_buff | Every living Gnasher gains 1 Might. The Alpha gains 8 Block. |
| `call_pack` | Call the Pack | special | Summon Gnashers until 2 are alive (`flees_with_leader`). |

- **AI**: `T == 1: rally_howl`. If `allies('gnasher') == 0` and `T ≥ 4` and `call_pack` not in history: `call_pack` (once per combat). Otherwise `pick({rend: 40, maul: 35, rally_howl: 25})`, never the same twice in a row.
- **Question (sharp)**: "Can you put 64 damage into one target through a screen?" Kill the Alpha and the pups flee at once; the fight ends.
- **Answers**: (1) single-target burst: an Onslaught chain into a finisher, a grown Seed Bite, or a Delay strike timed with Augury to the Alpha's Rally Howl turn (8 Block); (2) wide decks that clear the pups (13–17 HP) before the Howls stack, then grind. Rot spreading from dead pups lands on the Alpha. **Difficulty**: the Gremlin Nob slot. It punishes decks that can only chip. The pups flee rather than die, so killing the Alpha early forfeits nothing.
- **Relic bias**: `overwatch_drone`.

#### `dreadcap` — Dreadcap (DREADCAP) — *status clock*
- **Visual**: a towering purple toadstool-beast with a cyan-spotted cap worn like a cloak, stubby clawed legs and a gaping green-lit gill mouth under the cap.
- **HP** 100–106. **Spawn**: passive `mycelial_bond`: *Its attacks deal +1 damage per hit for each Status card in your hand, draw pile and discard pile (not the Scrapheap).* The intent shows the live total.

| move | name | intent | effect |
|---|---|---|---|
| `sporefall` | Sporefall | debuff | Shuffle 3 `status_tangle` into your draw pile. |
| `cap_crush` | Cap Crush | attack | 10 (+bond) (v2; was 8) |
| `gill_lash` | Gill Lash | attack | 3×3 (+bond per hit) |
| `hunker` | Hunker | defend | Gain 14 Block. Shuffle 1 `status_tangle` into your discard pile. |

- **AI**: `T == 1: sporefall`; `T == 2: cap_crush`. Afterwards `pick({gill_lash: 35, cap_crush: 30, sporefall: 20, hunker: 15})`, never the same twice in a row, and never `sporefall` if it appears in the last 2 moves.
- **Maths**: with 3 Tangles about, Cap Crush is 11 and Gill Lash is 6×3. With 7, it is 15 and 10×3. Every Tangle you Scrap lowers every future hit.
- **Question (sharp)**: "Can you keep your deck clean while you race it?"
- **Answers**: (1) race it: about 103 HP in five turns; (2) thin it: Prune Scraps Tangles and grows Bloom off them (Grafting Knife doubles down), and any Scrap effect works. (3) Stagger blunts Gill Lash's three hits. **Difficulty**: hard for fat, slow decks; easy for Graft. The status pressure is combat-only (commandment 24).
- **Relic bias**: `scrap_magnet`.

#### `shellback_titan` — Shellback Titan (TITAN) — *rewards burst windows and Rot*
- **Visual**: a wide azure armoured beetle with a domed purple shell split down the middle, cyan glowing seams, four stubby legs and huge hooked mandibles.
- **HP** 86–92 (v2; was 80–86). **Spawn**: passive `soft_underbelly`: *While it has no Block, each hit on it deals +3 damage* (pipeline step 4; it never decays).

| move | name | intent | effect |
|---|---|---|---|
| `clamp` | Clamp Shut | attack_defend | Gain 16 + 4 × `aiState.clamps` Block. Deal 8 + 2 × `clamps` (v2; was a flat 6). Then `clamps += 1`. |
| `grind` | Mandible Grind | attack | 9×2 (v2; was 8×2) |

- **AI**: strict alternation: `T` odd → `clamp`, `T` even → `grind`. It needs no rng, so the whole fight is visible from turn 1.
- **Rhythm**: after a Clamp it sits behind 16 / 20 / 24… Block for your whole turn. After a Grind it has none, and every hit gains +3. Breaking the Clamp Block mid-turn also switches the Underbelly on for the rest of that turn.
- **Question (sharp)**: "Can you time your damage?"
- **Answers**: (1) **burst-window decks**: Breaker Guard-banks on Clamp turns and spends a full Onslaught chain on open turns; Chronist plays Delay 1 strikes on Clamp turns so they resolve on the open turn; multi-hit cards gain +3 per hit when it is open; (2) **Rot**: Rot is HP loss and ignores the shell completely, so a Graft just keeps the clock running. A deck that does the same thing every turn loses about half its damage. **Difficulty**: the Lagavulin slot. It is gentle on HP (about 11 per turn) and punishing on fight length, and the growing Clamp (Block and, from v2, its snap) makes stalling lose.
- **Relic bias**: `slow_temper`.

### 1.3 Act 1 bosses (one per run)

#### `bramble_ram` — Bramble Ram (RAM) — boss — **"Can you hit hard on cue?"**
- **Visual**: a massive ram-beast with a crown of curling bramble horns, mossy blue-green hide, purple flowers in its mane and glowing cyan eyes; head lowered, front hooves planted.
- **HP** 200–210. **Spawn**: passive `charge_meter`: *While its current intent is Bramble Charge, it counts the HP it loses during your turn (Timeline resolutions at your turn start included; Block-absorbed damage does not count). At 20 (phase 2: 24; v2, was 22 / 26) the charge **breaks**: its intent becomes Stumble at once and `aiState.broken += 1`.* A meter "BREAK 0/20" sits under its HP bar while the charge is pending.

| move | name | intent | effect |
|---|---|---|---|
| `stomp` | Stomp | attack_debuff | 9 (+rage); then apply 3 Exposed to you. |
| `thorn_volley` | Thorn Volley | attack | 4×4 (+rage per hit) |
| `lower_head` | Lower Head | special | No effect. Telegraph: its next move is Bramble Charge. |
| `bramble_charge` | Bramble Charge | attack | 27 + 4 × `aiState.unbroken` (+rage); then `unbroken += 1`. (v2; was 30 + 6×: the Ram killed 5.4% of spike fights and 14% of all personas' fights.) |
| `stumble` | Stumble | sleep | Does nothing. (Only reached by breaking a charge.) |

- **Phases**: phase 1 above 50% HP. Phase 2 ("Bloodbloom") at ≤ 50%: `aiState.rage = 2` (+2 per hit on all its attacks, shown in intents) and the break threshold becomes 24. The flowers in its mane open (a sprite palette swap).
- **AI** (no rng):
  - Phase 1 by `last`: none → `stomp`; `stomp` → `thorn_volley`; `thorn_volley` → `lower_head`; `lower_head` → `bramble_charge`; `bramble_charge`/`stumble` → `stomp`.
  - Phase 2 by `last`: `lower_head` → `bramble_charge`; `bramble_charge`/`stumble` → `thorn_volley`; anything else → `lower_head`.
- **The window**: Lower Head is its *current* intent on your turn N, so you know the Charge is coming. The break window is your turn N+1, while Charge is the current intent. Augury sees it one turn earlier still.
- **Question**: "Can you hit hard on cue?" Each unbroken Charge grows by 4 (27, 31, 35…), so bracing forever loses.
- **Answers**: (1) **break it**: an Onslaught swing turn; a grown Bloom card; Delay 1 cards played on the Lower Head turn resolve inside the window and count; Stomp's Exposed on you is irrelevant to this. (2) **Brace it**: a Guard bank of 30+ (Breaker) or a heavy Block hand, plus Riposte (one big single attack is the ideal Riposte target). Rot helps the HP race but not the meter, because it ticks on its turn. Thorn Volley's 4 hits are where Stagger pays.
- **Difficulty**: the Guardian slot: about 16 raw per turn if you never break, about 9 if you always do. A deck with no burst at all must have 40 HP of Block on demand by phase 2.

#### `mother_orchid` — Mother Orchid (ORCHID) — boss, summoner — **"Can you keep the garden mowed while you cut the root?"**
- **Visual**: a colossal violet orchid with a slender pistil-figure at its heart, cyan petal-arms, a skirt of roots and glowing yellow pollen drifting from its crown.
- **HP** 165–175. **Spawn** (Phase D): passive `seed_bank` 10: *10 Buds left to sow. Each Bud she summons spends one; once the bank is empty she sows no more. Each Nectar Feast heals 3 less.* The AI never picks Sow or Full Bloom with an empty bank. **Stall breaker**: the Phase D report traced a Breaker stalemate (`v2-70-breaker`) to endless Buds plus a 10-HP heal every 4 moves. Now the garden runs out after 10 Buds, the heal wilts to 0, and Vine Crush keeps growing (+1 per use). She never seethes (§4.5).

| move | name | intent | effect |
|---|---|---|---|
| `sow` | Sow | special | Summon 2 `orchid_bud` from the Seed Bank (cap: 4 living Buds). |
| `vine_crush` | Vine Crush | attack | 15 + 1 × earlier Vine Crushes (v2: a scaling attack; a Block-only Breaker stalemated it 4 times in 400 runs). |
| `pollen_storm` | Pollen Storm | attack_debuff | 6×2; then apply 2 Stagger to you. |
| `nectar` | Nectar Feast | buff | Heal 10 − 3 × earlier Feasts (10, 7, 4, 1, then 0; Phase D, was always 10). Every living Bud's remaining Ripening −1. |
| `full_bloom` | Full Bloom | special | Summon 3 `orchid_bud` that ripen after 1 turn (cap 4). Phase 2 only, once. |

- **Phases**: phase 2 at ≤ 50% HP. Its next choice is `full_bloom`; it then loses Nectar.
- **AI** (no rng):
  - Phase 1 by `last`: none → `sow`; `sow` → `vine_crush`; `vine_crush` → `pollen_storm`; `pollen_storm` → `nectar`; `nectar` → (`allies('orchid_bud') ≤ 2` ? `sow` : `vine_crush`).
  - Phase 2: first choice `full_bloom`; then by `last`: `full_bloom`/`sow` → `vine_crush`; `vine_crush` → `pollen_storm`; `pollen_storm` → (`allies('orchid_bud') ≤ 2` ? `sow` : `vine_crush`).
- **Question**: "Can you keep the garden mowed while you cut the root?" Four ripe Buds hit for 48 a turn. The Mother alone hits for about 8.
- **Answers**: (1) **wide**: AoE or multi-target attacks kill 9-HP Buds in one sweep (and each dead Bud spreads half its Rot to the Mother); (2) **narrow**: burst the Mother through 170 HP; every Bud dies with her. A deck that does neither drowns by turn 7. **Difficulty**: the Slime Boss slot. It is easy for AoE, a real race for single-target decks, and lethal for stallers.

#### `orchid_bud` — Orchid Bud (BUD) — minion — *dangerous only if left alive*
- **Visual**: a fist-sized closed flower bud on a coiled cyan stem, purple sepals wrapped tight and a yellow glow seeping from the seam.
- **HP** 8–10. **Flags**: `leaderUid` = Mother Orchid, **`dies_with_leader`**. **Spawn**: passive `ripening` with stacks = turns until ripe (2; Full Bloom buds: 1). It is shown on the sprite as 1–2 seed pips.

| move | name | intent | effect |
|---|---|---|---|
| `ripen` | Ripening | sleep | Ripening −1. |
| `ripe_lash` | Ripe Lash | attack | 6×2 |

- **AI**: `own Ripening > 0 ? ripen : ripe_lash`. Ripening is its own status, so the contract holds. Nectar lowering it triggers a forecast recompute.
- **Question**: it is the clock inside the Mother's question. It does nothing for 2 turns, then 12 per turn forever.

#### `gloam_empress` — Gloam Empress (EMPRESS) — boss — **"Can your damage survive being blunted?"**
- **Visual**: an enormous moth queen with four wide indigo-and-cyan eye-spotted wings, a furry white-lilac thorax, a crown of feathered antennae and a glowing amber jewel at her abdomen.
- **HP** 205–215 (v2; was 195–205). **Spawn**: none.

| move | name | intent | effect |
|---|---|---|---|
| `scale_dust` | Scale Dust | debuff | Apply 2 Stagger to you. Gain 12 Block. |
| `wing_buffet` | Wing Buffet | attack | 5 × (3 + `aiState.cocooned`). (v2: no longer resets.) |
| `mothlight` | Mothlight | attack_debuff | 14 (v2; was 13); then apply 2 Exposed to you. |
| `silk_cocoon` | Silk Cocoon | defend_buff | Gain 18 Block. `cocooned += 1` (v2: permanent, a scaling attack: every Cocoon adds a Wing Buffet hit for the rest of the fight). |
| `dust_storm` | Dust Storm | attack_debuff | 4×3; then apply 2 Stagger to you. (Phase 2 only.) |

- **Phases**: phase 2 ("Eclipse") at ≤ 50% HP. Her wings darken to void-blue.
- **AI** (no rng):
  - Phase 1 by `last`: none/`silk_cocoon` → `scale_dust`; `scale_dust` → `wing_buffet`; `wing_buffet` → `mothlight`; `mothlight` → `silk_cocoon`.
  - Phase 2 by `last`: `dust_storm` → `mothlight`; `mothlight` → `wing_buffet`; anything else → `dust_storm`.
- **The rhythm**: in phase 1 your Stagger after each Dust reads −2, −1, 0, 0, so there are two clean turns every four (Augury sees them coming). In phase 2 Dust comes every 3 turns and every turn attacks: −2, −1, 0, so one clean turn in three.
- **Question**: "Can your damage survive being blunted?" A deck of 6-damage hits loses a third to a half of its output. A deck of 20-damage hits loses a tenth.
- **Answers**: (1) **few big hits**: Breaker finishers that spend Onslaught in one hit, a grown Bloom card, heavy Attacks; (2) **damage that isn't your hit**: Rot ticks, which Stagger never touches, plus anything the GDD makes HP loss; (3) **timing**: save the big turn for the clean turns in phase 1, and Stagger her back (Wing Buffet is 3–4 hits). **Difficulty**: the Hexaghost slot. She deals only about 11 per turn but makes the fight long, so a deck that can only make many small hits suffers attrition.

### 1.4 Act 1 encounters

Action order = list order. HP shown is the sum of ranges.

| id | Pool | Enemies (in order) | Total HP | Weight | Note |
|---|---|---|---|---|---|
| `enc_a1_gnasher_pair` | easy | gnasher, gnasher | 30–38 | 1 | Floor-1 check. |
| `enc_a1_drone_puff` | easy | scrap_drone, sporepuff | 33–40 | 1 | Learn to Block: Zap and Sting on turn 1 (v2). |
| `enc_a1_thornback` | easy | thornback | 42–46 | 1 | Telegraphed spike. |
| `enc_a1_mantis` | hard | sickle_mantis | 40–44 | 15 | Hold or spend. |
| `enc_a1_vine_puff` | hard | sporepuff, vinelash | 62–71 | 15 | Double Stagger: big hits win. |
| `enc_a1_flitter_gnasher` | hard | flitterfang, gnasher | 39–47 | 15 | Frenzy clock + partner. |
| `enc_a1_drone_pack` | hard | scrap_drone, gnasher, gnasher | 49–61 | 14 | Kill the marker turn 1. |
| `enc_a1_thornback_wisp` | hard | pollen_wisp, thornback | 62–70 | 14 | Support priority. |
| `enc_a1_spore_cluster` | hard | sporepuff, sporepuff, sporepuff | 42–51 | 12 | Mini AoE check: Sting, Dust, Sting on turn 1 (v2). |
| `enc_a1_thornback_drone` | hard | scrap_drone, thornback | 61–69 | 15 | Exposed + boosted Gore. |
| `enc_a1_alpha` | elite | gnasher_alpha, gnasher, gnasher | 94–106 | 1 | |
| `enc_a1_dreadcap` | elite | dreadcap | 100–106 | 1 | |
| `enc_a1_titan` | elite | shellback_titan | 86–92 | 1 | |
| `enc_a1_ram` / `enc_a1_orchid` / `enc_a1_empress` | boss | one boss | — | 1 each | Boss shown on the map from act start (GDD §4.9). |

---

## 2. Act 2 — The Foundry

**Act question: width.** Multi-enemy fights, multi-hit barrages, status cards and Block/Guard walls. Expect 2–3 bodies per hallway fight and two attacks per enemy phase, so a deck that can only hit one thing hard, or only Block one big hit, is outclassed. Palette: rust orange, steel blue and furnace red, plus a hot-yellow accent.

| id | Name | HUD | Role | HP | Pools |
|---|---|---|---|---|---|
| `furnace_drone` | Furnace Drone | F.DRONE | marker + buffer (tier of `scrap_drone`) | 34–40 | easy, hard |
| `rivet_gnasher` | Rivet Gnasher | R.GNASHR | multi-hit pack (tier of `gnasher`) | 30–34 | easy, hard |
| `cog_acolyte` | Cog Acolyte | ACOLYTE | **healer/buffer** | 46–52 | hard |
| `riveter` | Riveter | RIVETER | **multi-hit** barrage | 64–70 | easy, hard |
| `slag_golem` | Slag Golem | S.GOLEM | statuses + Block | 80–86 | hard |
| `loom_oracle` | Loom Oracle | ORACLE | **hides its forecast** (Augury tension) | 58–64 | hard |
| `the_auditor` | The Auditor | AUDITOR | elite, **rewards lean decks** (Graft tension) | 140–148 | elite |
| `anvil_warden` / `hammer_warden` | Anvil / Hammer | ANVIL / HAMMER | paired elite | 88–94 / 72–78 | elite |
| `boiler_tyrant` | Boiler Tyrant | BOILER | elite, **rewards sustained Rot/Delay** | 150–158 | elite |
| `grand_assembler` | Grand Assembler | ASSEMBLR | boss, **summoner** | 290–300 | boss |
| `assembly_frame` / `welded_horror` | Assembly Frame / Welded Horror | FRAME / HORROR | minions, **dangerous if left** | 18–22 / 38–42 | (summoned) |
| `furnace_heart` | Furnace Heart | FURNACE | boss, status + **clock** | 370–390 | boss |
| `trihammer` / `trihammer_arm` | Trihammer / Trihammer Arm | TRIHAMMR / ARM | boss + 3 parts | 240–250 / 32–36 | boss |

### 2.1 Tiered returns from Act 1 (Phantasy Star palette tiers)

Phantasy Star scales its roster by re-using a design in a new palette (`art-style.md` §4.1). Two Act 1 designs return this way. The silhouette is identical and the AI nearly so (the tougher drone locks on turn 2, not 1); the stats and one move change, so a returning player reads them instantly and feels the act's jump in numbers.

| Tier | From | HP | Moves (Act 1 → Act 2) | New |
|---|---|---|---|---|
| `furnace_drone` | `scrap_drone` | 19–23 → **34–40** | Zap 7 → **Scorch 10**; Target Lock 2 → **2 Exposed** (v2; was 3) | `overclock` (buff): the other living enemy with the highest HP gains 2 Might. |
| `rivet_gnasher` | `gnasher` | 15–19 → **28–32** (v2; was 30–34) | Nip 3×2 → **3×3** (+1 hit); Lunge 8 → **9** (v2; was 10) | none |

- **Furnace Drone AI**: `aiState.slot` = Furnace Drones spawned before it. `T == 1`: `[scorch, overclock, target_lock][slot % 3]` (`overclock` → `scorch` if no ally). `T == 2` and `slot == 0` and any ally alive: `target_lock`. Afterwards `pick({scorch: 50, target_lock: 30, overclock: 20})`, never the same twice in a row; `overclock` is removed if no ally is alive. Its question is unchanged ("kill the marker"), but at 37 HP it needs two turns, so its first lock comes on turn 2 rather than 1: kill it by the end of your turn 2. Exposed 2 before a Riveter's 3×4 is +8 that phase, which is the lesson (v2; v1's 3 × 5 = +15 made Drone and Riveter an 11.6% killer).
- **Rivet Gnasher AI**: as `gnasher`. A pair deals about 19 per turn and is the Act 2 easy-pool check for Stagger and AoE.
- **Visuals**: Furnace Drone is the same drone frame repainted rust and steel, with a burning orange lens and welding nozzles for claws. Rivet Gnasher is the same lizard-pup with riveted steel back-plates, rust hide and an iron trap-jaw.

### 2.2 Normal enemies

#### `cog_acolyte` — Cog Acolyte (ACOLYTE) — *healer/buffer*
- **Visual**: a hooded cultist in rust-red robes, a brass cog halo bolted behind its head, steel-blue mechanical arms swinging an oil censer, two orange eye-lights under the hood.
- **HP** 46–52. **Spawn**: passive `scour_rite` (v2): *Its Anoint washes up to 4 Rot off every other enemy. It never scours itself.*

| move | name | intent | effect |
|---|---|---|---|
| `anoint` | Anoint | buff | Every other living enemy loses up to 4 Rot, then heals 6 (v2; was heal 8, no scour). |
| `litany` | Litany of Iron | defend | Every living enemy gains 9 Block. |
| `zeal` | Zeal | buff | The other living enemy with the highest HP gains 2 Might. |
| `censer` | Censer Swing | attack | 9 |

- **AI**: if no other ally is alive, alternate `censer` / `litany` (odd `T` = censer). Otherwise `T == 1` or `T % 4 == 1`: `litany`; else `pick({zeal: 35, anoint: 35, censer: 30})`, never the same twice in a row.
- **Question**: "Kill the priest first?" (v2: and for the Graft, "Rot the priest first?": it cleans its allies but never itself.) **Answers**: 49 single-target damage in two turns; or AoE that out-damages 6 heal per ally; or Rot on the Acolyte, which spreads to the pack when it dies. Litany's Block lasts through your turn, so AoE decks plan a turn without Litany (it is on a fixed every-4th-turn schedule). **Difficulty**: low alone, it lengthens every fight it joins.

#### `riveter` — Riveter (RIVETER) — *multi-hit*
- **Visual**: a barrel-chested steel construct with a rotary rivet gun for a right arm, a rust-stained ammo hopper on its back and a small domed head with one orange slit.
- **HP** 64–70. **Spawn**: none.

| move | name | intent | effect |
|---|---|---|---|
| `rivet_burst` | Rivet Burst | attack | 3 × (4 + `aiState.loaded`); then `loaded = 0`. (v2; was 5 base hits: the #2 damage source in the v1 sim.) |
| `reload` | Reload | defend_buff | Gain 12 Block. `loaded = 2` (next Burst 3×6). |
| `pin_down` | Pin Down | attack_debuff | 7; then apply 2 Stagger to you. |

- **AI**: `T == 1: rivet_burst`. If `last == reload`: `rivet_burst`. Else `pick({rivet_burst: 45, pin_down: 30, reload: 25})`, never the same twice in a row.
- **Question**: "Can you blunt a barrage?" **Answers**: Stagger (2 stacks turn 3×5 into 1×5); a 15-Block turn; Riposte (one fire per attack; Riven Gauntlet's 3 Guard soaks the first hit, and a Stagger-applying Riposte blunts all five). Exposed on you is its best friend: a Drone's lock in front of it turns Burst into 6×5. **Difficulty**: medium; the Act 2 multi-hit teacher.

#### `slag_golem` — Slag Golem (S.GOLEM) — *statuses + Block*
- **Visual**: a hulking golem of stacked iron ingots with a furnace chest dripping glowing orange slag and steel-blue riveted arms ending in ladle hands.
- **HP** 80–86. **Spawn**: none.

| move | name | intent | effect |
|---|---|---|---|
| `pour_slag` | Pour Slag | debuff | Shuffle 2 `status_backlash` into your draw pile. Gain 8 Block. |
| `ingot_slam` | Ingot Slam | attack | 15 (v2; was 17) |
| `cool_harden` | Cool and Harden | defend | Gain 18 Block. |
| `spatter` | Spatter | attack_debuff | 6×2; then add 1 `status_jitter` to your discard pile. |

- **AI**: `T == 1: pour_slag`. Afterwards `pick({ingot_slam: 35, spatter: 30, cool_harden: 20, pour_slag: 15})`, never the same twice in a row; `pour_slag` not if used in the last 2 moves.
- **Question**: "Can your deck spend tempo on junk and still win?" **Answers**: Scrap/Prune the Status cards (Graft turns them into Bloom); draw-heavy decks that push past them; or race 83 HP of mostly single hits behind Block. **Difficulty**: medium; it is the Act 2 status teacher, and the Furnace Heart's rehearsal.

#### `loom_oracle` — Loom Oracle (ORACLE) — *hides its forecast*
- **Visual**: a cult prophet fused into a steel weaving-loom frame, copper threads running from its many-fingered hands, a punch-card scroll unspooling from its chest and a furnace-orange third eye.
- **HP** 58–64. **Spawn**: passive `sealed_pattern`: *Its forecast is always hidden ("?"). It always alternates: an attack on odd turns, a non-attack on even turns. Weave Ward gives 2 more Block per card on your Timeline* (v2). All its moves are `augury: 'hidden'` (GDD §2.9). Its **current** intent is always shown exactly, like every enemy's.

| move | name | intent | effect |
|---|---|---|---|
| `shuttle_strike` | Shuttle Strike | attack | 6×2 |
| `unravel` | Unravel | attack | 14 (v2; was 16) |
| `weave_ward` | Weave Ward | defend | Every living enemy gains 6 + 2 per card on your Timeline Block (v2; was a flat 8). Reacts to the Timeline: the Chronist can empty her Timeline before an even (Ward) turn. |
| `thread_snare` | Thread Snare | debuff | Apply 2 Stagger and 2 Exposed to you. |

- **AI**: `T` odd: `pick({shuttle_strike: 50, unravel: 50})`; `T` even: `pick({weave_ward: 50, thread_snare: 50})`.
- **Question** (for the Chronist): "Can you plan for the worst case?" Augury still tells her the *kind* of turn (from the passive), so she plans Block for 16 rather than for a known 12. For every other class it is a plain mid-threat support-attacker. **Answers**: plan for the maximum; or kill it (61 HP), which returns full Augury on the fight. **Difficulty**: low-medium. It is a tax on information, never a lockout.

### 2.3 Act 2 elites

#### `the_auditor` — The Auditor (AUDITOR) — *rewards lean decks*
- **Visual**: a tall steel-blue ledger-machine on four spindly legs with a rust-orange abacus of glowing beads across its chest, a rubber-stamp arm and one round monocle lens burning orange.
- **HP** 150–158 (v2; was 140–148). **Spawn**: passive `inventory`: *Ledger Lash hits once per 4 cards in your draw pile (round down; min 2, max 8; v2 min was 1), counted when it resolves.* Passive `seething` 15 (v2, §4.5). The intent shows the live count, so every card you draw this turn visibly removes a quarter of a hit.

| move | name | intent | effect |
|---|---|---|---|
| `ledger_lash` | Ledger Lash | attack | 5 × clamp(floor(draw pile / 4), 2, 8) (v2; was 4 × clamp(…, 1, 8)) |
| `requisition` | Requisition | debuff | Shuffle 3 `status_jitter` into your draw pile. |
| `stamp` | Stamp | attack_debuff | 16 (v2; was 15); then apply 2 Exposed to you. |
| `recount` | Recount | defend | Gain 20 Block. |

- **AI**: `T == 1: requisition`; `T == 2: ledger_lash`. Afterwards `pick({ledger_lash: 40, stamp: 30, requisition: 15, recount: 15})`, never the same twice in a row; `requisition` not if used in the last 2 moves.
- **Maths**: a 25-card deck with 20 in the draw pile takes 5×4 = 20. A 14-card Graft deck that has Pruned to 8 in the draw pile takes 2×4 = 8. Right after a reshuffle every deck is fat, so a smart player times the reshuffle.
- **Question (sharp)**: "How lean is your deck, or how deep can you dig before you end your turn?"
- **Answers**: (1) **lean decks**: removal, Purge and Prune (the Graft's in-combat thinning is exactly this); (2) **draw decks**: Chronist cycling or Breaker draw empties the draw pile before the Lash resolves; (3) Stagger 2 halves every 4-damage hit. A fat deck with no draw takes 20+ per Lash. **Difficulty**: hard for bloated decks, easy for lean ones, which rewards the skip economy (Shards). Its mirror image is the Star Archivist (Act 3), which taxes decks that cycle too fast.
- **Relic bias**: `tally_stick`.

#### `anvil_warden` + `hammer_warden` — Anvil and Hammer (ANVIL / HAMMER) — *paired elite*
- **Visuals**: **Anvil**, a squat four-legged iron anvil-golem with a steel-blue face plate, glowing orange rivets and a broad flat back. **Hammer**, a lanky rust-red construct whose torso is a sledgehammer head on a piston spine, with two long arms ending in spiked knuckles.
- **HP** Anvil 88–94, Hammer 72–78. **Spawn**: passive `bonded` on both: *If its partner dies, it switches to its alone moves.* (Reads `allies`, which the contract allows.)

| enemy | move | name | intent | effect |
|---|---|---|---|---|
| Anvil | `temper` | Temper | defend | Anvil and Hammer each gain 10 **Guard**. |
| Anvil | `ring_out` | Ring Out | attack_debuff | 10; then apply 2 Stagger to you. |
| Anvil (alone) | `bulwark` | Bulwark | defend | Gain 20 Guard. |
| Anvil (alone) | `crush` | Crush | attack_debuff | 18; then apply 2 Exposed to you. |
| Hammer | `hammerfall` | Hammerfall | attack | 18 + `aiState.rage` |
| Hammer | `rapid_strikes` | Rapid Strikes | attack | (4 + `rage`) × 4 (alone: × 6) |
| Hammer | `wind_up` | Wind Up | buff | `rage += 2` (permanent, shown in intents). |

- **AI, Anvil**: paired: `T == 1: temper`, then alternate `ring_out` / `temper`. Alone: alternate `crush` / `bulwark`, starting `crush`.
- **AI, Hammer**: paired: `T == 1: wind_up`; then `pick({hammerfall: 40, rapid_strikes: 40, wind_up: 20})`, never the same twice in a row, `wind_up` not within the last 3 moves. Alone ("Unbound"): never `wind_up`; alternate `rapid_strikes` / `hammerfall`.
- **Guard** halves at each of their turns, so Temper every other turn keeps about 10–15 Guard on each.
- **Question (sharp)**: "Wide or focused, and in which order?"
- **Answers**: (1) **Hammer first**: the Anvil alone hits 18 every other turn, which is safe but slow; (2) **Anvil first**: the Guard stops, but the Hammer goes Unbound (4×6 plus rage), which Stagger answers; (3) **AoE plus Rot**: Rot ignores Guard, so Plague Bloom / spreading Rot erodes both while AoE chips. A deck that splits single-target damage at random fights both at full strength for 9 turns. **Difficulty**: the Slavers slot.
- **Relic bias**: `concussion_rig`.

#### `boiler_tyrant` — Boiler Tyrant (BOILER) — *rewards sustained Rot/Delay; punishes careless burst*
- **Visual**: a pot-bellied boiler colossus with a rust-red iron belly, two pressure gauges for eyes, a smokestack crown venting white steam and steel-blue pipe arms with valve-wheel fists.
- **HP** 150–158. **Spawn**: passive `seething` 12 (v2, §4.5) and passive `overpressure`: *Counts the HP it loses during your turn (Timeline resolutions at your turn start count; Rot, which ticks on its turn, does not). The first time the count reaches 30 (v2; was 25) in a turn, its current intent is replaced by Blowout, shown at once.* A pressure gauge "30" fills under its HP bar. **v2 window**: with Seething 12 below and Overpressure 30 above, the right turn deals between 12 and 29: a readable pressure-gauge puzzle that a turtle (under 12) and a careless burst (30+) both lose.

| move | name | intent | effect |
|---|---|---|---|
| `piston_punch` | Piston Punch | attack | 14 + `rage` |
| `steam_jet` | Steam Jet | attack | (5 + `rage`) × 3 |
| `stoke` | Stoke | defend_buff | Gain 14 Block. `rage += 2`. |
| `blowout` | Blowout | attack | 24 + `rage`. (Only via Overpressure; at most once per turn.) |

- **AI**: `T == 1: stoke`. Afterwards `pick({piston_punch: 40, steam_jet: 40, stoke: 20})`, never the same twice in a row; `stoke` not within the last 3 moves.
- **Question (sharp)**: "Can you deal your damage steadily instead of all at once?" A 60-damage swing turn turns a 14-damage punch into a 24-damage Blowout. 24 per turn kills it in 7 turns for free.
- **Answers**: (1) **sustained**: Rot is uncounted, steady 20–24 damage turns, and Delay cards spread over several turns; (2) **burst and brace**: accept the Blowout behind banked Guard, or prime a Riposte into it (it is one big single attack). A burst deck that does neither takes about +10 per swing. **Difficulty**: medium-hard. It is the only Act 2 fight where the "right" turn is a medium turn.
- **Relic bias**: `bulwark_rivets`.

### 2.4 Act 2 bosses

#### `grand_assembler` — Grand Assembler (ASSEMBLR) — boss, summoner — **"Can you scrap the line while cutting the foreman?"**
- **Visual**: a four-armed gantry-crane titan of steel girders with rust-orange welding torches on each arm, a cracked furnace-glass dome head with one orange eye and a conveyor-belt skirt.
- **HP** 290–300. **Spawn**: none. Its Frame timer is its clock (§4.5).

| move | name | intent | effect |
|---|---|---|---|
| `lay_frame` | Lay Frame | special | Summon 2 `assembly_frame` (cap: 3 living minions, Frames + Horrors). |
| `weld` | Weld | defend_buff | Every living Frame gains 1 Progress (phase 2: 2). Gain 12 Block. Frames at 3 Progress transform at the end of this move. |
| `torch_sweep` | Torch Sweep | attack | 7×2 |
| `girder_drop` | Girder Drop | attack | 20 |
| `rush_order` | Rush Order | special | Summon Frames until 3 minions are alive. Phase 2 only, once. |

- **Phases**: phase 2 at ≤ 50%. Its next choice is `rush_order`, and Weld gives +2 Progress from then on.
- **AI** (no rng). Phase 1 by `last`: none → `lay_frame`; `lay_frame` → `torch_sweep`; `torch_sweep` → `weld`; `weld` → `girder_drop`; `girder_drop` → (`allies('assembly_frame') + allies('welded_horror') ≤ 1` ? `lay_frame` : `weld`). Phase 2 by `last`: `rush_order`/`girder_drop` → `weld`; `weld` → `torch_sweep`; `torch_sweep` → `girder_drop`.
- **Clock** (v2 timer): a Frame also builds itself, +1 Progress on each of its own turns, so an untouched Frame is a Horror 3 of its turns after it is laid, sooner with Welds. Progress shows as "x of 3" on each Frame. (v1: Welds only, about 6 turns; the Assembler was a free boss: 0% deaths, 4 HP per fight.)
- **Answers**: (1) **wide**: AoE kills 20-HP Frames as they are laid; dead minions spread Rot to the Assembler; (2) **narrow**: 295 HP of single-target burst on the Assembler, and every minion dies with it. A deck that ignores the Frames faces 3 Horrors at 12 damage per turn each. **Difficulty**: the Collector slot.

#### `assembly_frame` (FRAME) → `welded_horror` (HORROR) — minions
- **Frame visual**: an unfinished steel skeleton-frame of a construct, half-welded joints glowing orange, a bare socket where the head should be. **Horror visual**: the same frame completed into a hunched, mismatched welded beast with a furnace mouth, one hydraulic claw and one welding-torch arm.
- **Frame**: HP 18–22, `dies_with_leader`. **Spawn**: passive `assembly_line`, and `progress` (0–3). Move `idle` "Assembling" (buff, v2): +1 Progress. At 3 Progress, at the end of its own move or the Assembler's, it **transforms** **[ask §5.2]** into a Welded Horror at full HP (38–42). The new form's first move is planned for the next enemy phase.
- **Horror**: HP 38–42, `dies_with_leader`. Moves `weld_claw` 6×2 (attack) and `sear` (attack_debuff: 11, then shuffle 1 `status_backlash` into your discard pile). AI: alternate, starting `weld_claw`.
- **Role**: dangerous only if left alive. A Frame is free to kill early and costly late.

#### `furnace_heart` — Furnace Heart (FURNACE) — boss — **"Can your deck run hot?"**
- **Visual**: a colossal iron furnace with a molten orange core visible through a ribcage grille, two bellows-lungs at its sides, chain arms ending in crucible hooks and a crown of four smokestacks.
- **HP** 340–360 (v2; was 370–390). **Spawn**: passive `heat` (0–15, a gauge): *Heat +2 at the end of each of its turns (phase 2: +3; v2, was +4). Whenever you play or Scrap a Status card, Heat −1.*

| move | name | intent | effect |
|---|---|---|---|
| `slag_tide` | Slag Tide | debuff | Shuffle 2 `status_backlash` into your draw pile and put 1 `status_jitter` into your hand. (Phase 2: 3 + 1.) |
| `crucible_swing` | Crucible Swing | attack | 9×2 (phase 2: 11×2) (v2; was 10×2 / 12×2) |
| `bellows_blast` | Bellows Blast | attack_defend | 14; gain 15 Block; Heat +2. |
| `meltdown` | Meltdown | attack | 3 × Heat (live in the intent); then Heat = 0. |

- **AI** (no rng; `aiState.step` advances on each choice). Phase 1 cycle: `[slag_tide, crucible_swing, bellows_blast, crucible_swing, meltdown]`. Phase 2 (≤ 50%, "White-Hot"): `step` restarts on the next choice with cycle `[slag_tide, crucible_swing, bellows_blast, meltdown]`.
- **Maths**: with no venting, phase 1 Meltdown is 3 × 10 = 30 and phase 2 about 3 × 12 = 36 (cap 45). Each Status card you play or Scrap takes 3 off the next Meltdown.
- **Answers**: (1) **clear the junk**: Prune/Scrap (the Graft), or spend draw and energy playing Jitter (a cheap card also lands a Chronist beat); (2) **brace the schedule**: the Meltdown turn is fixed and visible from turn 1 (two turns early with Augury), so Guard-banks, Delay-Block or primed Ripostes land exactly on it; (3) burst 380 HP faster than five cycles. A deck with none of these takes 30–45 every 4–5 turns plus Backlash. **Difficulty**: the Automaton slot: a known big hit and a deck-function test.

#### `trihammer` + `trihammer_arm` ×3 — Trihammer (TRIHAMMR / ARM) — boss — **"Disarm or decapitate?"**
- **Visual (body)**: a hunched foundry-foreman colossus with a steel-blue barrel torso, a furnace-red visor eye, chains on its shoulders and three empty piston sockets. **Visual (arm)**: a detached rust-red piston arm hanging from a chain, ending in a squared trip-hammer head with glowing seams.
- **HP**: body 240–250; each arm 32–36 (about 350 in total), `dies_with_leader`, `aiState.slot` = 0/1/2. Encounter order: arm 0, arm 1, arm 2, body.

| enemy | move | name | intent | effect |
|---|---|---|---|---|
| Arm | `piston` | Piston Hammer | attack | 4×2 |
| Arm | `brace_frame` | Brace Frame | buff | The Trihammer gains 8 Block. |
| Body | `overtime` | Overtime | defend_buff | Every living Arm gains 1 Might. Gain 10 Block. |
| Body | `trip_hammer` | Trip-Hammer | attack | 4 × (1 + living Arms) |
| Body | `ground_quake` | Ground Quake | attack_debuff | 14; then apply 2 Exposed to you. |
| Body (no Arms) | `grapple` | Grapple | attack | 20 |
| Body (no Arms) | `steam_vent` | Steam Vent | attack_defend | 5×3; gain 15 Block. |

- **AI, Arm**: `(T + slot) % 3 == 0 ? brace_frame : piston`, so two Arms hammer each turn and one braces.
- **AI, body**: if `allies('trihammer_arm') == 0`: alternate `grapple` / `steam_vent`, starting `grapple`. Otherwise `T == 1: overtime`, then by `last`: `overtime` → `trip_hammer` → `ground_quake` → `overtime`.
- **Clock**: Might from Overtime is permanent. With 3 Arms the phase deals about 26; after two Overtimes each Arm hits 6×2 and it is over 30.
- **Answers**: (1) **disarm**: AoE, Stagger on two Arms, Rot spread (each Arm is 34 HP and its death spreads Rot to the body); each dead Arm removes about 10 damage per turn and a Trip-Hammer hit; (2) **decapitate**: burst the 245-HP body, and the Arms die with it. Riposte shines here: 3–4 attacks per phase, so each primed card has a target. **Difficulty**: the Champ slot. It is the act's purest width test.

### 2.5 Act 2 encounters

| id | Pool | Enemies (in order) | Total HP | Weight | Note |
|---|---|---|---|---|---|
| `enc_a2_rivet_pair` | easy | rivet_gnasher, rivet_gnasher | 56–64 | 1 | Stagger/AoE check. |
| `enc_a2_drone_gnasher` | easy | furnace_drone, rivet_gnasher | 62–72 | 1 | Marker + multi-hit. |
| `enc_a2_riveter` | easy | riveter | 64–70 | 1 | Barrage teacher. |
| `enc_a2_drone_riveter` | hard | furnace_drone, riveter | 98–110 | 14 | Exposed 2 × 4 hits (v2; was 3 × 5). |
| `enc_a2_acolyte_golem` | hard | cog_acolyte, slag_golem | 126–138 | 16 | Heals + statuses. |
| `enc_a2_oracle_pack` | hard | loom_oracle, rivet_gnasher, rivet_gnasher | 114–128 | 11 | Width + sealed forecast (v2 weight 11; was 15, the deadliest v1 hallway). |
| `enc_a2_drone_trio` | hard | furnace_drone, furnace_drone, furnace_drone | 102–120 | 16 | Overclock chains; AoE. |
| `enc_a2_acolyte_pack` | hard | cog_acolyte, rivet_gnasher, rivet_gnasher | 102–116 | 16 | Kill (or Rot) the priest. |
| `enc_a2_golem_riveter` | hard | slag_golem, riveter | 144–156 | 14 | Junk + barrage. |
| `enc_a2_oracle_golem` | hard | loom_oracle, slag_golem | 138–150 | 13 | Hidden plan + statuses. |
| `enc_a2_auditor` | elite | the_auditor | 150–158 | 1 | |
| `enc_a2_anvil_hammer` | elite | anvil_warden, hammer_warden | 160–172 | 1 | |
| `enc_a2_boiler` | elite | boiler_tyrant | 150–158 | 1 | |
| `enc_a2_assembler` / `enc_a2_furnace` / `enc_a2_trihammer` | boss | one boss (+ parts) | — | 1 each | |

---

## 3. Act 3 — The Crown

**Act question: scaling and anti-synergy.** Fights are long enough that a deck with no engine falls behind clocks (Pyrexia Node, Phage Mother, Leukarch). Several enemies tax exactly the thing a finished engine does too much of: playing many cards (Echo Cantor), one giant hit (Mirror Knight), hoarding defence (Event Horizon), leaning on the forecast (Prism Seer), and cycling the deck (Star Archivist). The ceiling check (commandment 10) is the Tether Sovereign's Overflow. It delays a burst kill; it never caps total damage. Palette: void blue and black, ice white and prism highlights, with one gold accent.

| id | Name | HUD | Role | HP | Pools |
|---|---|---|---|---|---|
| `void_mote` | Void Mote | V.MOTE | weak geometry | 34–40 | easy, hard |
| `shardling` | Shardling | SHARDLNG | **multi-hit** | 48–54 | easy, hard |
| `prism_seer` | Prism Seer | P.SEER | **re-rolls forecasts** (Augury tension) | 76–82 | easy, hard |
| `echo_cantor` | Echo Cantor | CANTOR | **punishes many cards** (Cadence tension) | 110–118 | hard |
| `lymph_warden` | Lymph Warden | WARDEN | **healer/cleanser** | 66–72 | hard |
| `pyrexia_node` | Pyrexia Node | PYREXIA | **buffer clock**, dangerous if left | 52–58 | hard |
| `void_geometer` | Void Geometer | GEOMETER | big single hits | 130–140 | hard |
| `mirror_knight` | Mirror Knight | M.KNIGHT | elite, anti-burst | 190–200 | elite |
| `phage_mother` / `phage` | Phage Mother / Phage | PHAGE.M / PHAGE | elite **summoner** / growing minion | 180–190 / 15–17 | elite |
| `event_horizon` | Event Horizon | HORIZON | elite, anti-hoarding | 220–230 | elite |
| `tether_sovereign` | Tether Sovereign | SOVREIGN | boss, **ceiling check** | 550–570 | boss |
| `star_archivist` | Star Archivist | ARCHIVST | boss, loop tax | 510–530 | boss |
| `leukarch` / `antibody` | Leukarch / Antibody | LEUKARCH / ANTIBODY | boss **summoner** + **clock** | 470–490 / 20–24 | boss |

### 3.1 Normal enemies

#### `void_mote` — Void Mote (V.MOTE)
- **Visual**: a floating black-violet octahedron with a single ice-white eye at its centre, prism-bright edges and two small cyan shards orbiting it.
- **HP** 34–40.

| move | name | intent | effect |
|---|---|---|---|
| `null_pulse` | Null Pulse | attack | 10 (v2; was 11) + `aiState.folded`; then `folded = 0`. |
| `fold` | Fold | defend_buff | Gain 12 Block. `folded = 4`. |
| `flicker` | Flicker | attack | 4×3 |

- **AI**: `T == 1: null_pulse`. If `last == fold`: `null_pulse`. Else `pick({null_pulse: 45, flicker: 35, fold: 20})`, never the same twice in a row.
- **Question**: (weak) the Act 3 baseline: 11–15 per turn per body. **Answers**: any deck that arrived here.

#### `shardling` — Shardling (SHARDLNG) — *multi-hit*
- **Visual**: a cluster of jagged ice-white and prism crystals forming a crouching many-legged insect, with a rainbow refracting core and deep void-blue between the shards.
- **HP** 48–54.

| move | name | intent | effect |
|---|---|---|---|
| `splinter_storm` | Splinter Storm | attack | (3 + `aiState.refracted`) × 5 (v2; was × 6); then `refracted = 0`. |
| `refract` | Refract | defend_buff | Gain 14 Block. `refracted = 1`. |
| `lance` | Lance | attack_debuff | 15; then apply 2 Exposed to you. |

- **AI**: `T == 1: lance` (it marks, then storms). Afterwards `pick({splinter_storm: 50, refract: 25, lance: 25})`, never the same twice in a row.
- **Design rule**: at most one Shardling per encounter (two Lances stack Exposed onto two 6-hit Storms).
- **Question**: "Six hits: blunted or Blocked?" The Exposed from its own Lance turns the next Storm into 4×6. **Answers**: Stagger 3 makes it 0×6; Block 18–24; kill it (51 HP). **Difficulty**: low alone; dangerous behind a Pyrexia Node.

#### `prism_seer` — Prism Seer (P.SEER) — *re-rolls forecasts*
- **Visual**: a floating faceted crystal head the size of a boulder, with a crown of rainbow prism spikes, one huge ice-blue iris and trailing ribbons of black void-light.
- **HP** 76–82.

| move | name | intent | effect |
|---|---|---|---|
| `glare` | Glare | debuff | Apply 2 Exposed to you. |
| `prism_lance` | Prism Lance | attack | 16 |
| `spectrum_burst` | Spectrum Burst | attack | 4×4 |
| `refraction` | Refraction | special | Gain 12 Block. Then **re-roll the forecast of every other living enemy**: advance each one's AI rng by one draw, so the move each will choose at the end of its turn is re-drawn. Forecasts recompute at once **[ask §5.3]**. |

- **AI**: `T == 1: glare`. `T % 3 == 0: refraction`. Otherwise `pick({prism_lance: 45, spectrum_burst: 55})`, never the same twice in a row.
- **Rule phrasing (exact)**: Refraction never changes any current intent. It changes only moves not yet chosen. Because it is the Seer's own current intent, you know during your turn that every forecast you are looking at will be re-drawn this enemy phase. Enemies on fixed cycles (no rng) are unaffected, and the tooltip says so.
- **Question** (for Augury): "Can you adapt when the future moves?" A Delay 2 aimed at a forecast attack may land on a re-rolled turn. Everyone else just sees a 16/4×4 attacker that occasionally Blocks. **Answers**: kill it first (79 HP); or play Refraction turns on current intents only and use Delay 1 rather than Delay 2 that turn. **Difficulty**: low-medium; a tension, not a lockout.

#### `echo_cantor` — Echo Cantor (CANTOR) — *punishes playing many cards*
- **Visual**: a tall hollow robed figure made of starlight, its face an empty ice-white ring, a halo of floating crystal tuning forks and choir robes of void blue with prism trim.
- **HP** 110–118. **Spawn**: passive `resonance`: *While its current intent is Chime, each card you play after your 5th card this turn gives it 1 Resonance (max 5). Chime gains 1 hit per Resonance. Resonance resets to 0 when Chime resolves.* The intent updates live: 6×1 → 6×2 → … → 6×6.

| move | name | intent | effect |
|---|---|---|---|
| `chime` | Chime | attack | 6 × (1 + Resonance); then Resonance = 0. |
| `toll` | Toll | attack | 20 |
| `hush` | Hush | debuff | Apply 2 Stagger to you. Gain 15 Block. |

- **AI**: `T` odd: `chime`. `T` even: `pick({toll: 60, hush: 40})`, never the same as the previous even-turn choice.
- **Shape check (C19)**: this is not Time Warp (every 12 cards: end turn + Strength), not Beat of Death (1 damage per card) and not a per-card tax on you. Card count beyond 5 adds **hits to a visible attack**, on alternate turns only. Those hits are Blockable and Staggerable, and the attack fires a primed Riposte like any other.
- **Question**: "Can you win while playing five cards a turn?" (Cadence and Onslaught tension, Act 3 only.)
- **Answers**: (1) **plan the long turns**: big beat-9 or Onslaught-6 turns go on Toll/Hush turns, and ≤5 cards on Chime turns (the intent alternates, and Augury shows the next one); (2) **Stagger it**: Stagger 3 turns 6×6 into 3×6; (3) **high value per card**: grown Bloom cards, Delay's double value and finishers do more in five cards. **Difficulty**: medium. It caps nothing; a beat-9 Chronist simply takes about 30 Blockable damage if she spams into a Chime.

#### `lymph_warden` — Lymph Warden (WARDEN) — *healer/cleanser*
- **Visual**: a pale white jellyfish-angel of the Spire's immune system, with an ice-white bell, a cross-shaped cyan nucleus, long trailing cilia and two thin tendrils holding a glowing gold antibody orb.
- **HP** 66–72.

| move | name | intent | effect |
|---|---|---|---|
| `cleanse` | Cleanse | buff | Every other living enemy loses half (round down) of each debuff's stacks (Rot, Exposed, Stagger, …), then heals 10. |
| `mend` | Mend | buff | Heal the other living enemy with the lowest HP by 18 (resolve time). |
| `antigen_tag` | Antigen Tag | attack_debuff | 9; then apply 2 Exposed to you. |
| `membrane` | Membrane | defend | Every living enemy gains 12 Block. |

- **AI**: alone: alternate `antigen_tag` / `membrane`. With allies: `T == 1: membrane`; `T % 3 == 0: cleanse`; otherwise `pick({antigen_tag: 40, mend: 35, membrane: 25})`, never the same twice in a row.
- **Question**: "Kill the healer?" Cleanse is on a fixed every-3rd-turn schedule, so a Rot player knows exactly when her stacks halve and can kill the Warden or re-apply after. It halves, never clears, so Rot is taxed, not countered. **Answers**: focus it (69 HP); or out-damage the heals with AoE. **Difficulty**: medium; it doubles the length of the fight it joins.

#### `pyrexia_node` — Pyrexia Node (PYREXIA) — *buffer clock; dangerous if left*
- **Visual**: a hovering ring of interlocking ice-crystal hexagons around a pulsing gold fever-core, cyan veins radiating outwards like a frost-cracked sun.
- **HP** 52–58.

| move | name | intent | effect |
|---|---|---|---|
| `fever` | Fever | buff | Every living enemy, including itself, gains 1 Might. |
| `fever_spike` | Fever Spike | attack | 5 (+Might) |

- **AI**: if any other ally is alive: `fever` every turn. Alone: alternate `fever_spike` / `fever`, starting `fever_spike`.
- **Clock**: a Shardling behind it gains +6 per Storm for every Fever; a Void Mote's Flicker gains +3.
- **Question**: "Will you put out the fever first?" **Answers**: 55 single-target damage on turns 1–2; or AoE; or Stagger on the multi-hitters it feeds (Might is per hit; so is Stagger). **Difficulty**: trivial alone; the most dangerous support in the game in a pack.

#### `void_geometer` — Void Geometer (GEOMETER) — *big single hits*
- **Visual**: a towering figure built from impossible black-violet cubes with ice-white wireframe edges, a floating tesseract for a head, two long triangular blade-arms and prism glints at its joints.
- **HP** 130–140.

| move | name | intent | effect |
|---|---|---|---|
| `hyperedge` | Hyperedge | attack | 27 + `aiState.folded`; then `folded = 0`. |
| `acute_angle` | Acute Angle | attack_debuff | 12; then apply 2 Stagger to you. |
| `fold_space` | Fold Space | defend_buff | Gain 20 Block. `folded = 6` (next Hyperedge 33). |

- **AI**: `T == 1: acute_angle`. If `last == fold_space`: `hyperedge`. Else `pick({hyperedge: 40, acute_angle: 35, fold_space: 25})`, never `hyperedge` twice in a row.
- **Question**: "Can you take one huge hit, or end it first?" Stagger barely dents a 27. **Answers**: Block/Guard banking; Riposte (a single attacker with single hits is the Breaker's dream); or burst 135 HP in three turns. **Difficulty**: medium; the mirror image of the Shardling.

### 3.2 Act 3 elites

#### `mirror_knight` — Mirror Knight (M.KNIGHT) — *anti-burst*
- **Visual**: a hollow suit of crystalline armour that mirrors starlight, an ice-white faceless helm with a prism visor, a long mirrored greatsword held point-down and a cape of black starfield.
- **HP** 190–200. **Spawn**: passive `seething` 22 (v2, §4.5) and passive `reflection`: *Tracks the most damage any single card of yours dealt this turn (all hits and all targets of that one card, after Block; cards resolving from your Timeline count; Riposte triggers, Rot and relics do not). Mirror Slash deals that much: minimum 12, maximum 40.* Live in the intent.

| move | name | intent | effect |
|---|---|---|---|
| `mirror_slash` | Mirror Slash | attack | clamp(reflection, 12, 40) |
| `shatter_lunge` | Shatter Lunge | attack_debuff | 7×3; then apply 2 Exposed to you. |
| `silvered_guard` | Silvered Guard | defend | Gain 20 Guard. |

- **AI**: `T == 1: shatter_lunge`. `T` even: `mirror_slash`. `T` odd ≥ 3: `pick({shatter_lunge: 70, silvered_guard: 30})`.
- **Question (sharp)**: "Can you win without one giant hit?" A 60-damage finisher comes back as 40. Five 12s come back as 12.
- **Answers**: (1) **spread damage**: many mid-size cards, Rot, and Riposte hits on its turn; (2) **eat the mirror**: it is a single hit, so bank Guard or prime a Riposte for it; (3) Exposed on you from Lunge adds only +1 to one Mirror Slash hit. Hyper-grown Bloom cards and Onslaught finishers still work. They simply cost HP. **Difficulty**: hard for one-card engines, moderate otherwise.
- **Relic bias**: `glass_spurs`.

#### `phage_mother` + `phage` — Phage Mother (PHAGE.M) — *summoner; minions grow*
- **Visual (Mother)**: a vast translucent ice-white cell-sac floating upright, a dark violet nucleus with a gold glowing core, crowned by whip-like flagella, with unborn phages visible inside. **Visual (Phage)**: a small spiked icosahedral virus-crawler with a cyan head on six spindly white legs.
- **HP**: Mother 190–200 (v2; was 180–190), passive `seething` 10 (v2, §4.5); Phage 18–21 (v2; was 15–17), `dies_with_leader`. (v2: Lyse 10×2, was 8×2; Latch 5 + 3 per Age, was 4 + 3. v1 was a free elite: 0% deaths, 2.4 HP per fight.) **Phage spawn**: passive `replicating`: *`age +1` at the end of each of its turns.*

| enemy | move | name | intent | effect |
|---|---|---|---|---|
| Mother | `bud_phages` | Bud | special | Summon 2 `phage` (cap 4 living). |
| Mother | `lyse` | Lyse | attack | 8×2 |
| Mother | `enzyme_wash` | Enzyme Wash | debuff | Apply 2 Exposed and 2 Stagger to you. |
| Mother | `incubate` | Incubate | defend_buff | Every living Phage `age +1`. Gain 15 Block. |
| Phage | `latch` | Latch | attack | 4 + 3 × age |

- **AI, Mother** (no rng) by `last`: none → `bud_phages`; `bud_phages` → `lyse`; `lyse` → `enzyme_wash`; `enzyme_wash` → (`allies('phage') ≤ 2` ? `bud_phages` : `incubate`); `incubate` → `lyse`. **Phage**: always `latch`.
- **Clock**: Latch reads 4, 7, 10, 13, 16… Four Phages at age 3 deal 52 per turn.
- **Question (sharp)**: "Can you stop the swarm before it grows up?"
- **Answers**: (1) AoE that kills 16-HP Phages young (Rot spread from Phages lands on the Mother); (2) single-target burst through 185 HP, and every Phage dies with her. **Difficulty**: the Reptomancer slot, plus a scaling twist. Its clock is age, not summon count.
- **Relic bias**: `hairline_saw`.

#### `event_horizon` — Event Horizon (HORIZON) — *anti-hoarding*
- **Visual**: a spherical black void ringed by a bright ice-white accretion disc tilted towards the viewer, with prism light bending around its rim and a single gold pinpoint at its centre.
- **HP** 200–210 (v2; was 220–230: it cost 40% of max HP per fight in v1). **Spawn**: passive `event_horizon`: *At the start of its turn, before it acts, any of your Block plus Guard above 15 is pulled into it: you lose the excess (Guard first, then Block) and it gains that much Block.* Your defence counter shows the line at 15.

| move | name | intent | effect |
|---|---|---|---|
| `tidal_pull` | Tidal Pull | attack | (5 + `aiState.mass`) × 4 (v2; was 6) |
| `crush_depth` | Crush Depth | attack | 24 + `mass` (v2; was 28) |
| `accrete` | Accrete | buff | Heal 12. `mass += 2` (permanent, shown). |

- **AI**: `T == 1: tidal_pull`. Afterwards `pick({crush_depth: 40, tidal_pull: 40, accrete: 20})`, never the same twice in a row; `accrete` only if `T ≥ 3` and not in the last 3 moves.
- **Question (sharp)**: "Can you defend without hoarding?" A 40-Block turn becomes 15 Block for you and 25 Block for it.
- **Answers**: (1) **defence it can't steal**: Stagger (3 stacks turn Tidal Pull into 3×4, which 15 Block covers) and Riposte (fires before the hits); (2) **kill it**: 225 HP with a scaling offence before the mass stacks. Pure Guard-bank turtles lose by design (commandment 9). **Difficulty**: hard for turtles, fair for everyone else.
- **Relic bias**: `dampener_coil`.

### 3.3 Act 3 bosses

#### `tether_sovereign` — Tether Sovereign (SOVREIGN) — boss, **ceiling check** — **"Can you finish what you start?"**
- **Visual**: a crowned colossus in ice-white and void-blue plate with a ring-shaped prism crown, a torso like a cracked window full of stars, and four gold anchors orbiting on cable tethers.
- **HP** 530–550 (v2; was 550–570: the deadliest boss in the v2 baseline, 15–17% of spike fights). **Spawn**: passive `overflow`: *During each of your turns, at most 60 of the HP it would lose is actually lost (phase 3: 40). The rest is stored as Overflow, shown as a hatched segment on its HP bar, and is lost at the end of its next turn, after its move and Rot.* Overflow is never healed, Blocked or reduced. Rot (on its turn) and Riposte (during the enemy phase) are outside the line.

| move | name | intent | effect |
|---|---|---|---|
| `decree` | Decree of Gravity | debuff | Apply 2 Exposed and 2 Stagger to you. Gain 25 Block. |
| `tether_lash` | Tether Lash | attack | (6 + Crown Rage) × 4 |
| `anchor_drop` | Anchor Drop | attack | 25 (v2; was 28) + `rage`; in phase 3 then `rage += 2`. |
| `crownlight` | Crownlight | buff | Crown Rage +3 (+3 per hit on all its attacks). Phase 1 only. **Phase D**: Rage is now a visible status, `crown_rage`, capped at 12 (it was hidden `aiState.rage`, unbounded), so a slow deck's worst Tether Lash is (6 + 12) × 4 and is readable on hover. Phase 3 Anchor Drops add 2, also within the cap. |
| `starfall` | Starfall | attack_debuff | (9 + `rage`) × 3; then apply 2 Exposed to you. (Phase 2+.) |

- **Phases**: 2 at ≤ 50% HP; 3 at ≤ 20% (the line drops to 40).
- **AI** (no rng) by `last`. Phase 1: none/`crownlight` → `decree` → `tether_lash` → `anchor_drop` → `crownlight`. Phase 2: cycle `[starfall, anchor_drop, decree, tether_lash]` from the next choice. Phase 3: alternate `starfall` / `anchor_drop`.
- **Why it is a ceiling check, not a cap**: no damage is lost. A 300-damage turn deals 60 now and 240 at the end of its next turn, so a one-turn kill becomes a "kill after one more enemy action". Unbounded scaling still wins, but it must also survive the turn after its peak. Its lethal turns are telegraphed.
- **Answers**: (1) **steady pressure**: about 60 per turn, every turn, plus Rot ticking on its own turn outside the line, plus Delay cards spread across turns; (2) **burst and hold**: after the big turn, the defence is already banked (Guard, a primed Riposte, Delay-Block on the Timeline) for the one action before the Overflow lands. A glass cannon that spends everything on one turn dies to the Starfall that follows. **Difficulty**: the Awakened One slot.

#### `star_archivist` — Star Archivist (ARCHIVST) — boss, loop tax — **"Can your deck afford to loop?"**
- **Visual**: a towering hooded figure in black robes covered in ice-white constellation glyphs, six arms each holding a floating crystal tome, a gold astrolabe-ring halo and a face that is a single prism lens.
- **HP** 510–530. **Spawn**: passive `catalogue`: *Each time your discard pile is shuffled into your draw pile (not the combat-start shuffle), it writes a Page (max 6; phase 2: max 8). Index Barrage hits 2 + Pages times. Each Redact also writes a Page* (v2: a scaling attack, so a deck that never reshuffles still faces a growing Barrage; v1 was a free boss: 0% deaths, 3.6 HP). Shown as a page counter. Hook: `onShuffle`.

| move | name | intent | effect |
|---|---|---|---|
| `redact` | Redact | debuff | Apply 2 Exposed to you. Gain 20 Block. Write 1 Page (v2). |
| `index_barrage` | Index Barrage | attack | 5 × (2 + Pages) |
| `footnote` | Footnote | attack | 20 (v2; was 18) |
| `errata` | Errata | attack | 12×2 (phase 2 only) |

- **Phases**: 2 at ≤ 50% HP ("Final Chapter"): the Page cap rises to 8 and the cycle tightens.
- **AI** (no rng) by `last`. Phase 1: none/`footnote` → `redact` → `index_barrage` → `footnote`. Phase 2: cycle `[redact, index_barrage, errata, index_barrage]` from the next choice.
- **Maths**: a 25-card deck drawing 5–7 per turn reshuffles about every 4 turns, so the Barrage is 5×4 to 5×5. A 12-card cycling deck reshuffles every 1–2 turns, so 5×8 (+1 per hit from Redact's Exposed) by the mid-fight.
- **Shape check (C19)**: not Time Eater (card count) and not Time Warp. The counted event is the **reshuffle**, a deck-composition axis the GDD made central. It is bounded (max 8 Pages) and visible.
- **Answers**: (1) **decks with high value per card** that reshuffle rarely: 22+ cards, heavy hitters; (2) **cycling decks that pack Stagger or Block for the Barrage turn**: it is every 3rd turn and visible from turn 1; Stagger 3 removes 3 × 10 hits; (3) **slow the loop**: cards waiting on the Timeline and Kept cards are in no pile. This is the Auditor's mirror: lean wins Act 2's elite, and lean pays here, so neither shape is free. **Difficulty**: the Time Eater slot (an anti-synergy check).

#### `leukarch` + `antibody` — Leukarch, the White Throne (LEUKARCH / ANTIBODY) — boss, summoner + clock — **"Can your scaling outpace the response?"**
- **Visual (Leukarch)**: an enthroned colossal white immune-cell king with a crown of glassy cilia, an ice-white membrane body around a void-blue nucleus heart, gold antibody orbs orbiting and two vast pseudopod arms resting on its throne. **Visual (Antibody)**: a Y-shaped crystalline antibody drone, ice-white with cyan tips and a gold binding-site glow.
- **HP**: Leukarch 450–470 (v2; was 470–490); Antibody 20–24, `dies_with_leader`. **Spawn** (v2): passive `seething` 12 (§4.5), the stall breaker: in v1 a Block-only Breaker deck stalemated it in 12 of 200 runs (seed `v2-8-breaker`). Calcify Guard grows by 5 per use (v2; was 10).

| enemy | move | name | intent | effect |
|---|---|---|---|---|
| Leukarch | `muster` | Muster | special | Summon Antibodies until 2 are alive (phase 2: 3). |
| Leukarch | `cilia_storm` | Cilia Storm | attack | (4 + `fever`) × (3 + phase) |
| Leukarch | `engulf` | Engulf | attack | 24 + `fever` |
| Leukarch | `calcify` | Calcify | defend | Gain 20 + 10 × `aiState.calcifies` **Guard**; `calcifies += 1`. (Phase 2.) |
| Leukarch | `consume` | Consume | buff | Every living Antibody dies; Fever +2 per Antibody consumed. (Phase 3 entry, once.) |
| Leukarch | `fever_pitch` | Fever Pitch | defend_buff | Fever +3. Gain 20 Block. (Phase 3.) **Phase D**: Fever is now a visible status, `white_fever`, capped at 9 (it was hidden `aiState.fever`, unbounded). A slow deck's worst Cilia Storm is (4 + 9 + Might) × 6, telegraphed a turn early by Fever Pitch. |
| Antibody | `tag` | Tag | attack_debuff | 5; then apply 1 Exposed to you. |
| Antibody | `opsonize` | Opsonize | buff | The Leukarch loses up to 4 debuff stacks (largest stack first). |

- **Phases**: 2 at ≤ 320 HP ("Response"), 3 at ≤ 160 HP ("Fever").
- **AI, Leukarch** (no rng) by `last`. Phase 1: none → `muster`; `muster` → `cilia_storm`; `cilia_storm` → `engulf`; `engulf` → (`allies('antibody') < 2` ? `muster` : `cilia_storm`). Phase 2: `muster`/other → `calcify` → `cilia_storm` → `engulf` → (`allies('antibody') < 3` ? `muster` : `calcify`). Phase 3: first `consume`, then `fever_pitch` → `cilia_storm` → `engulf` → `fever_pitch`.
- **AI, Antibody**: alternate `tag` / `opsonize`, starting `tag`. Several Antibodies' Exposed 1 stacks within one phase.
- **Why it is the scaling check**: Calcify's Guard grows +10 each use and banks (halving), Antibodies strip debuffs, and phase 3's Fever adds +3 per hit every 3 turns to a 6-hit storm. Phase 3 opens with two non-attacks (Consume, Fever Pitch), so a deck dealing about 55 per turn kills it before the first 6-hit storm (about 54) lands, and a flat deck eats it. A deck whose damage per turn is flat at 40 stalls in phase 2 and dies in phase 3.
- **Answers**: (1) **an engine that peaks by phase 3**: Rot is HP loss, so it ignores Calcify's Guard (kill the Antibodies to stop Opsonize), grown Bloom cards and Onslaught chains; (2) **front-load through phase 3**: 160 HP in two turns skips the Fever entirely; (3) Stagger is strong against the 6-hit storm. Killing Antibodies before 160 HP also shrinks the Consume bonus. **Difficulty**: the Donu & Deca slot (a long scaling fight).

### 3.4 Act 3 encounters

| id | Pool | Enemies (in order) | Total HP | Weight | Note |
|---|---|---|---|---|---|
| `enc_a3_mote_pair` | easy | void_mote, void_mote | 68–80 | 1 | |
| `enc_a3_shard_mote` | easy | shardling, void_mote | 78–90 | 1 | |
| `enc_a3_seer` | easy | prism_seer | 76–82 | 1 | |
| `enc_a3_cantor` | hard | echo_cantor | 110–118 | 15 | Card-count tension. |
| `enc_a3_geometer` | hard | void_geometer | 130–140 | 15 | Big hits. |
| `enc_a3_fever_pack` | hard | pyrexia_node, shardling, void_mote | 130–148 | 14 | Kill the fever. (v1: 18.7% deaths per fight; Splinter Storm now 5 hits.) |
| `enc_a3_warden_geometer` | hard | lymph_warden, void_geometer | 196–212 | 14 | Healer + bruiser. |
| `enc_a3_warden_cantor` | hard | lymph_warden, echo_cantor | 176–190 | 14 | |
| `enc_a3_prism_motes` | hard | void_mote, void_mote, prism_seer | 144–162 | 14 | Forecast churn. v2: the Motes act first, so the Seer's opening Glare no longer lands on their first Null Pulses (v1: 13.4% deaths per fight). |
| `enc_a3_warden_shard` | hard | lymph_warden, shardling | 110–122 | 14 | Membrane + mend on a Faceted 5-hitter. |
| `enc_a3_mirror_knight` | elite | mirror_knight | 190–200 | 1 | |
| `enc_a3_phage_mother` | elite | phage_mother | 190–200 | 1 | Phages summoned turn 1. |
| `enc_a3_event_horizon` | elite | event_horizon | 200–210 | 1 | |
| `enc_a3_sovereign` / `enc_a3_archivist` / `enc_a3_leukarch` | boss | one boss (+ parts) | — | 1 each | |

---

## 4. Tables

### 4.1 Expected damage taken by a baseline deck

**Model (crude, for HP-budget checks; the simulator replaces it).** The baseline is a competent player with an average deck for that point in the act. It kills in a sensible order (markers and supports first, minions first when the leader is far from dead) and spends its Block evenly. HP lost per enemy phase ≈ max(raw incoming − B, raw ÷ 4), where the ÷4 floor stands for spikes and bad draws. "Raw" includes Exposed/Might effects on the hits and excludes the player's own Stagger.

| Baseline | Damage per turn (single target) | Block per turn | Used for |
|---|---|---|---|
| Act 1 hallway | 16 | 6 | easy, hard |
| Act 1 late | 22 | 9 | elites, boss |
| Act 2 hallway | 28 (6 of it AoE) | 12 | easy, hard |
| Act 2 late | 36 | 16 | elites, boss |
| Act 3 hallway | 42 | 18 | easy, hard |
| Act 3 late | 55 | 24 | elites, boss |

**Per encounter** (raw incoming per enemy phase averaged over the fight · enemy phases survived · HP lost):

| Act 1 | raw | phases | lost | | Act 2 | raw | phases | lost | | Act 3 | raw | phases | lost |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| gnasher_pair | 7 | 1–2 | 3 | | rivet_pair | 10 | 1–2 | 4 | | mote_pair | 10 | 1 | 3 |
| drone_puff | 5 | 1–2 | 2 | | drone_gnasher | 15 | 2 | 10 | | shard_mote | 13 | 1–2 | 5 |
| thornback | 11 | 2 | 11 | | riveter | 11 | 2 | 5 | | seer | 8 | 1 | 2 |
| mantis | 10 | 2 | 9 | | drone_riveter | 16 | 3–4 | 18 | | cantor | 13 | 2 | 6 (spam: 20) |
| vine_puff | 9 | 4 | 17 | | acolyte_golem | 10 | 5 | 14 | | geometer | 17 | 3 | 18 |
| flitter_gnasher | 13 | 2–3 | 15 | | oracle_pack | 18 | 4 | 20 | | fever_pack | 22 | 3 | 15 |
| drone_pack | 10 | 2–3 | 9 | | drone_trio | 14 | 4 | 16 | | warden_geometer | 19 | 5 | 25 |
| thornback_wisp | 11 | 3–4 | 20 | | acolyte_pack | 15 | 4 | 20 | | warden_cantor | 16 | 4 | 18 |
| spore_cluster | 6 | 2 | 4 | | golem_riveter | 18 | 5 | 24 | | prism_motes | 18 | 3 | 12 |
| thornback_drone | 11 | 3 | 12 | | oracle_golem | 15 | 5 | 20 | | warden_shard | 13 | 3 | 12 |
| **alpha** | 21 | 2–3 | 24 | | **auditor** | 13 | 4 | 15 (fat deck: 28) | | **mirror_knight** | 19 | 3 | 15 (one-card engine: 30) |
| **dreadcap** | 12 | 5 | 20 | | **anvil_hammer** | 19 | 5–6 | 28 | | **phage_mother** | 18 | 3–4 | 18 |
| **titan** | 11 | 4 | 17 | | **boiler** | 13 (steady) / 22 (burst) | 5–6 | 24 | | **event_horizon** | 22 | 4 | 36 (turtle: 50) |
| *ram* | 13 | 9 | 40 | | *assembler* | 13 | 10 | 35 | | *sovereign* | 20 | 10 | 58 |
| *orchid* | 10 | 10 | 35 | | *furnace* | 18 | 11 | 38 | | *archivist* | 18 | 9 | 30 (cycling: 50) |
| *empress* | 11 | 11 | 39 | | *trihammer* | 20 | 10 | 40 | | *leukarch* | 22 | 10 | 37 |

**Per act summary** (pool means; path = Act 1: 3 easy + 4 hard + 2 elites + boss; Acts 2–3: 2 easy + 5 hard + 2 elites + boss, per GDD §4.9):

| Act | raw/phase hallway | raw/phase elite | raw/phase boss | HP lost: easy / hard / elite / boss | Path total |
|---|---|---|---|---|---|
| 1 | 9.5 | 15 | 11.5 | 5 / 12 / 20 / 38 | ≈ 141 |
| 2 | 15 | 18 | 17 | 6 / 19 / 22 / 38 | ≈ 189 |
| 3 | 16 | 20 | 20 | 3 / 15 / 23 / 42 | ≈ 169 |

**Notes for the systems designer.**
- Raw incoming per phase rises about ×1.5 from Act 1 to Act 2 and ×1.15 into Act 3 hallways. Act 3 asks for scaling through length and anti-synergy rather than raw per-hit numbers. Its single hits (Hyperedge 27–33, Mirror Slash ≤40, Anchor Drop 28+, a 6×6 Chime) carry the STS 15–35 band.
- **Budget flag**: the path totals assume no in-combat healing and a deck that never improves within the act. Against GDD healing (Rest 30%, act transition 75% of missing, Field Dressing, potions), Act 1 looks about 15–25 HP too expensive for a 66-HP Chronist on an elite-heavy path. If the simulator agrees, the **one lever** to pull first is Act 1 hard-pool damage −15% (Thornback Gore 13→11, Vinelash Lash 4×3→3×3, Flitterfang Shrill 2→ every other turn). Elites and bosses should stay put.
- Class skew to watch in the simulator: the Graft's lean decks make the Auditor easy (≈6) and the Archivist harder (≈40). The Breaker's Riposte makes single-attacker fights (Thornback, Geometer, Boiler Blowout) cheaper than this table. The Chronist's Augury makes scheduled bosses (Ram, Furnace Heart, Titan) cheaper.

### 4.2 Encounter weights and pool rules

- **easy**: the first 3 monster fights of Acts 1 and 2 and the first 2 of Act 3 (`TUNING.easyFights`; v2 raised Act 2 from 2 to 3: a gentler Act 2 opening for the new-player curve). Uniform among the 3.
- **hard**: weighted as listed in §1.4 / §2.5 / §3.4. Each act's hard weights sum to 100, so a weight is a percentage before the no-repeat rule. **No repeat of the last 2 encounters** (ENGINE_SPEC §4).
- **elite**: uniform among the act's 3, pre-assigned to elite nodes at map generation (GDD §4.9), and no elite twice in an act until all 3 have appeared.
- **boss**: one of 3, uniform, chosen at act start and shown on the map.
- Hard-pool spread per act: Act 1 = 2 solo / 4 pairs / 1 trio (supports and markers); Act 2 = 0 solo / 4 pairs / 3 trios (width); Act 3 = 2 solo / 3 pairs / 2 trios (long fights, engines tested).

### 4.3 Commandments 6–10 checklist

| # | Commandment | Satisfied by |
|---|---|---|
| 6 | Telegraph every action with exact numbers; hidden only as a chosen cost or telegraphed ability | Every move has exact numbers in its intent (live: Auditor hits, Dreadcap bond, Mantis parry hit, Cantor Resonance, Mirror reflection, Furnace Meltdown = 3×Heat). Every passive is a visible status with a meter where it matters (Ram BREAK, Boiler gauge, Furnace Heat, Archivist Pages, Horizon line, Sovereign Overflow). No `chooseMove` reads player state (§0.3). The two hidden-info designs are Loom Oracle, whose forecast is hidden but whose pattern is stated, and Prism Seer, whose Refraction is its own current intent. Neither ever hides a current intent. |
| 7 | Every elite/boss asks one named question; ≥2 deck shapes answer it | Alpha "one target through a screen" (burst / wide); Dreadcap "clean while racing" (race / thin); Titan "time your damage" (burst windows / Rot); Ram "hit hard on cue" (break / brace); Orchid "mow and cut" (wide / narrow); Empress "survive being blunted" (big hits / non-hit damage + timing); Auditor "how lean" (lean / draw); Anvil+Hammer "wide or focused, which order" (Hammer-first / Anvil-first / AoE+Rot); Boiler "steady not all at once" (sustained / burst-and-brace); Assembler "scrap the line" (wide / narrow); Furnace "run hot" (clear junk / brace schedule); Trihammer "disarm or decapitate" (AoE / burst); Mirror Knight "without one giant hit" (spread / eat it); Phage Mother "before it grows up" (AoE / burst); Event Horizon "defend without hoarding" (Stagger+Riposte / kill fast); Sovereign "finish what you start" (steady / burst-and-hold); Archivist "afford to loop" (value decks / Stagger+Block cyclers / Timeline slowing); Leukarch "outpace the response" (engine / front-load skip). |
| 8 | Each act asks different questions | **Act 1, front-load**: Thornback's Gore, Flitterfang clock, Drone turn-1 kill, Alpha burst, Titan windows, Ram break, Orchid race. **Act 2, width**: every hard fight has 2–3 bodies; multi-hit (Riveter, Rivet Gnasher, Hammer, Trihammer); statuses (Golem, Auditor, Furnace Heart); Block/Guard walls (Acolyte, Anvil, Assembler Weld). **Act 3, scaling + anti-synergy**: clocks (Pyrexia, Phage age, Leukarch Fever/Calcify, Sovereign rage); anti-synergy (Cantor vs card spam, Mirror vs one big card, Horizon vs hoarding, Seer vs forecast reliance, Archivist vs cycling). |
| 9 | Enemy scaling out-paces pure defence; every glass cannon meets a spike | **Turtles lose to**: Ram (+6 per unbroken Charge), Titan (+4 Clamp), Hammer Wind Up, Boiler Stoke, Trihammer Overtime Might, Furnace Heat, Phage age, Horizon (steals Block over 15, +mass), Sovereign rage, Leukarch Fever. **Glass cannons meet**: Ram Charge 30+, Meltdown 30–45, Hyperedge 33, Mirror Slash 40, Boiler Blowout, Sovereign's post-burst turn, Leukarch's phase-3 storm. |
| 10 | Unbounded scaling meets a ceiling check in the final fights | **Tether Sovereign Overflow** is the main one: a tempo ceiling that defers HP loss beyond 60 (40) per turn to after its next action, and never deletes damage (not a flat cap). **Star Archivist** taxes loops by reshuffle count (bounded, visible). In Act 3 hallways and elites, **Echo Cantor** taxes card spam, **Mirror Knight** taxes one-card engines and **Event Horizon** taxes defence stacking. None is Time Warp, Beat of Death, Invincible or Curiosity in trigger+effect shape (C19 notes inline). |

### 4.4 Must-have checklist

| Requirement | Where |
|---|---|
| Exposed on the player | Scrap/Furnace Drone, Flitterfang (clock), Ram Stomp, Empress Mothlight, Loom Snare, Auditor Stamp, Anvil Crush, Trihammer Quake, Shardling, Prism Seer, Lymph Warden, Mirror Knight, Phage Mother, Sovereign, Archivist, Antibody. |
| Stagger on the player | Sporepuff, Vinelash, Orchid Pollen Storm, Empress (the boss question), Riveter Pin, Anvil Ring Out, Loom Snare, Cantor Hush, Geometer, Phage Mother, Sovereign. |
| Punishes holding cards (anti-Riposte pressure) | `sickle_mantis` (+1 hit if its attack triggers a Riposte; free to hold into Scissor Cut). |
| Punishes large decks / rewards lean (Graft tension) | `the_auditor` (hits per 4 cards in your draw pile), mirrored by `star_archivist` (Pages per reshuffle) so lean is not free. |
| Re-rolls or hides the second intent (Augury tension) | `loom_oracle` (forecast hidden; attack/non-attack pattern stated), `prism_seer` (Refraction re-rolls forecasts, telegraphed). |
| Punishes playing many cards (Cadence tension), Act 3 only | `echo_cantor` (cards beyond the 5th add hits to Chime, only while Chime is the intent). |
| Rewards burst | `bramble_ram`, `shellback_titan`, `gnasher_alpha`, `mother_orchid` (narrow answer), Leukarch phase-3 skip. |
| Rewards sustained Rot/Delay | `boiler_tyrant` (Rot uncounted, spread damage), `shellback_titan` (Rot ignores the shell; Delay into open turns), `tether_sovereign` (Rot outside the line), Leukarch (Rot ignores Calcify Guard). |
| Multi-hit attackers every act | A1 Gnasher, Vinelash, Flitterfang, Thornback Trample, Empress; A2 Rivet Gnasher, Riveter, Hammer, Trihammer + Arms, Welded Horror; A3 Shardling, Cantor Chime, Mote Flicker, Seer Spectrum, Sovereign Lash, Archivist Barrage, Leukarch Storm. |
| Healer/buffer support per act | A1 `pollen_wisp`; A2 `cog_acolyte` (+ Furnace Drone Overclock); A3 `lymph_warden`, `pyrexia_node`. |
| Summoner | A1 `gnasher_alpha`, `mother_orchid`; A2 `grand_assembler`; A3 `phage_mother`, `leukarch`. |
| Clock (escalates each turn) | A1 `flitterfang`; A2 `furnace_heart` (Heat); A3 `pyrexia_node`, `phage`, `leukarch`. |
| Dangerous only if left alive | `orchid_bud`, `pollen_wisp`, `assembly_frame`, `phage`, `pyrexia_node`. |
| Minion flags | `dies_with_leader`: Orchid Bud, Assembly Frame, Welded Horror, Trihammer Arm, Phage, Antibody. `flees_with_leader`: Alpha's Gnashers. |
| Act 1 → Act 2 palette tiers with deltas | `scrap_drone` → `furnace_drone`, `gnasher` → `rivet_gnasher` (§2.1). |

### 4.5 v2 encounter pass: anti-stall pressure and class gimmicks

**Why.** The v1 paired-seed sim (`docs/balance/report-v2-baseline.md`) found the defence-first bot (turtle) the strongest player by 25–37 points, a Leukarch stalemate in 12 of 200 Block-only Breaker runs, Act 1 hallways that cost a starter deck under 1 HP, Act 2 hallway packs that ended most runs, and bosses that were either free (Assembler, Archivist) or brutal (Ram, Furnace Heart). v2 pressures long fights through enemies that scale, a timer and a passivity punisher, mostly on elites and bosses. The pressure rewards killing faster; it never punishes Block itself.

**Seething N** (shared passive, `src/content/enemies/bosses.ts`). *At the end of its turn, if it took less than N damage since its last turn, it gains 1 Might. Hits soaked by its Block or Guard still count.* Every hit counts in full (your attacks, Riposte, Timeline), plus non-hit HP loss (Rot, Harvest). **Phase D fairness fix**: v2 counted only HP lost, so the enemy's own Block turns (Leukarch's Calcify and Fever Pitch, the Auditor's Recount, the Boiler's Stoke) fed it even while you were attacking. The threshold is the status's stacks, so one glossary entry covers every holder:

| enemy | N | why |
|---|---|---|
| `the_auditor` (A2 elite) | 15 | v1 free elite (1.3 HP per fight). |
| `boiler_tyrant` (A2 elite) | 12 | Pairs with Overpressure 30: deal 12–29 a turn. |
| `mirror_knight` (A3 elite) | 22 | Anti-burst *and* anti-stall: spread your damage. |
| `phage_mother` (A3 elite) | 10 | v1 free elite (2.4 HP per fight); a turtle stalemate in the v2 baseline. |
| `leukarch` (A3 boss) | 12 | The stall breaker. A deck that never makes it lose 12 HP a turn feeds +1 Might per hit on a 4–6-hit Cilia Storm every turn. |

**Not on the other bosses.** An iteration put Seething on Mother Orchid (10), Grand Assembler, Furnace Heart, Trihammer (15) and Star Archivist (20). On paired seeds it turned Orchid from 2% to 47% Breaker deaths and Trihammer from 6% to 26% Chronist deaths: on summoners, killing minions is a correct answer that doesn't hurt the boss, so it seethed; on Furnace Heart and the Archivist the Block turns (Bellows, Redact) fed it. It was removed from all five. Their stall risk is small (v2 baseline: 4 stalemates in 1,800 runs among them, all Block-only Breaker) and left to the Breaker designer's sustain numbers.

Bosses and elites without Seething already have a clock of their own: Bramble Ram (+4 per unbroken Charge), Mother Orchid (Vine Crush +1 per use, v2), Grand Assembler (the Frame timer, v2), Star Archivist (Redact Pages, v2), Furnace Heart (Heat), Trihammer (Overtime Might), Gloam Empress (Cocoon hits), Tether Sovereign (Crownlight Rage), Gnasher Alpha (Rally Might), Dreadcap (Status clog), Shellback Titan (Clamp grows), Anvil and Hammer (Wind Up), Event Horizon (Mass). Every elite and Leukarch now escalate. The v2 baseline (current tree, 150 seeds × 4 personas × 3 classes) had 11 stalemates, all Breaker: Leukarch ×6, Furnace Heart ×2, Mother Orchid, Star Archivist, Phage Mother and one Spore Cluster.

Might shows live in every intent, so the escalation is always visible. A deck that deals the threshold every turn ends the fight in at most HP ÷ N turns, so no Seething fight can stall.

**Scaling attacks.** Gloam Empress: every Silk Cocoon adds a Wing Buffet hit for the rest of the fight. Star Archivist: every Redact writes a Page (Index Barrage +1 hit), on top of reshuffles. Flitterfang: every Frenzied Bite adds a hit.

**A timer.** Assembly Frames build themselves (+1 Progress on each of their turns), so every Frame is a visible 3-turn countdown to a Welded Horror.

**Class gimmicks** (each one is an enemy passive with a status tooltip and a glossary entry in `src/content/keywords.ts`):

| gimmick | enemy | interacts with |
|---|---|---|
| Many small hits that grow | Flitterfang (`frenzy`) | Breaker Riposte that scales with the attack's hits; Stagger. |
| Cleanses Rot | Cog Acolyte (`scour_rite`): Anoint removes up to 4 Rot from each other enemy, never from itself | Graft Rot: Rot the Acolyte first. |
| Reacts to the Timeline | Loom Oracle (`sealed_pattern`): Weave Ward +2 Block per card on your Timeline | Chronist Delay: empty the Timeline before its even (Ward) turns. |
| Armour that Shards off | Shardling (`facets` 2): −1 damage per hit per Facet; a hit that still deals 10+ shatters one and pays 1 Shard | Big hits (Timmy) and the shared Shard economy; taxes many small hits. |

No new enemies were added, so no new sprites. The four new passives have placeholder 12x12 icons in `src/render/ui/statusIconArt.ts`; their concepts are in `docs/v2/art-needed.md`.

---

## 5. Engine and GDD asks (minimal)

Already requested by the GDD and relied on here: the forecast (`EnemyState.forecast`, `MoveDef.augury = 'hidden'`), the `end_own_turn` tick, enemy Guard, and the Riposte declaration hook. New from this roster:

1. **Minions** (`ENGINE_SPEC` §3): `EnemyState.leaderUid?: number`; `EnemyDef.onLeaderDeath?: 'die' | 'flee'`; a fled state (`alive: false, fled: true`, no `onDeath`); combat is won when every enemy is dead or fled. Effect `summon { enemy, n? | fillTo?, cap, leader: 'self' }` (appends to `combat.enemies`; no action in the phase it was summoned). Summon intents use the existing `special` kind.
2. **`transform { into }`** (self): replace this enemy's id in place, keeping its uid and position, at the new form's full HP, and re-plan its intent. Used only by Assembly Frame → Welded Horror.
3. **`reroll_forecast { target: 'other_enemies' }`**: advance each target's AI rng by one draw, then recompute forecasts. Used by Prism Seer.
4. **Intent override from a hook**: `HookCtx.setIntent(moveId)` (emits `enemy_intent`), allowed only for the three listed cases: Ram charge broken, Boiler Blowout, flee.
5. **HP-loss deferral**: a target hook `modifyHpLoss(ctx, info) → number` at pipeline step 7 (before `onHpLost`), plus content scheduling the stored amount as `lose_hp` at the end of its own turn. Used only by Tether Sovereign's Overflow; it can be done with `custom` if you prefer not to add a hook.
6. **`EnemyAiCtx.forTurn`**: the turn the move is being chosen for, so "`T == 1`" means the same thing at combat start and in the forecast.
7. **Live amounts in moves**: `damage.times` must accept an Amount (the same `resolveAmount`), plus scales `ai:<key>`, `player_draw_pile`, `player_status_cards` (hand + draw + discard), `best_card_damage_this_turn` and `triggered_riposte` (0/1, the sibling of the GDD's `trigger_hits`). Intent previews already recompute live.
8. **`MoveDef.text?`**: a template for the intent tooltip, filled from the move's effects, so Block, status amounts and card additions show exact numbers (commandment 6), not just damage.
9. (Optional, GDD) **`EncounterDef.relicBias?: RelicId`** if the systems designer wants each elite's "Relic bias" line to be real.
