# Vibespire — Game Design Document (systems)

Status: v1, systems designer. This document is the source of truth for mechanic rules, economy, relics, events, potions, statuses/curses, balance targets and every id. It does **not** contain the class card pools or colourless cards (written from this document by the card designers) or the enemy roster (`docs/ENEMIES.md`). Where this document and `docs/DESIGN_DIRECTION.md` disagree, this document wins; every override is listed in §0.3.

Every rule number here that the engine owns (not a single content definition) belongs in `src/engine/tuning.ts` under the key given in brackets, e.g. `[TUNING.caps.bonusEnergy]`, so the simulator can sweep it.

## 0. Conventions

### 0.1 Terms (defined once; card text must use exactly these)

| Term | Meaning |
|---|---|
| **hit** | One application of a `damage` effect to one target. `damage {amount: 4, times: 3}` on one enemy is 3 hits; an all-enemies damage effect is 1 hit on each enemy. Only hits go through the damage pipeline (§2.15). |
| **deal damage / take damage** | A hit, after the pipeline. Block, then Guard, absorb it. |
| **lose HP** | Direct HP reduction. Skips the whole pipeline: no Exposed, no Stagger, no Block, no Guard. Rot and HP costs are HP loss. Engine: `lose_hp`, event `damage.kind = 'hp_loss'`. |
| **unblocked damage** | The HP actually lost from a hit after Block and Guard. |
| **Attack** | A card of type `attack`. |
| **enemy attack** | An enemy move whose intent kind is `attack`, `attack_defend`, `attack_buff` or `attack_debuff`. "An enemy attacks you" = such a move begins resolving against you. One move = one attack, however many hits it has. |
| **play** | Paying a card's cost from hand and resolving it, or an effect that says "play". Timeline resolutions, Riposte triggers, potions and relic effects are **not** plays. |
| **Scrap** | Move a card to the **Scrapheap** for the rest of this combat (our name for exhaust; engine keyword id stays `exhaust`). |
| **remove** | Delete a card from your run deck permanently. |
| **in your deck** | During combat this means your **run deck** (the permanent card list), whatever pile each copy is in, including the Scrapheap, the Timeline and the primed rack. Cards created during combat are not in your deck. |
| **your turn / the enemy turn** | Player turn; enemy phase (every enemy acts once, in list order). "Each enemy's turn" = that enemy's own slot in the enemy phase. |

### 0.2 Id rules
- All ids are `snake_case`, stable, and never reused. Display names may change; ids may not.
- Prefixes: relics none; potions `pot_`; events `ev_`; event encounters `enc_event_`; Ascent Pact boons `pact_`; Ascent levels `asc_`; status cards `status_`; curses `curse_`; rest options `rest_`; caps `cap_`. Statuses and keywords have bare ids (`rot`, `riposte`).
- Classes: `breaker`, `graft`, `chronist`.

### 0.3 Overrides of the direction brief (with reasons)
1. **Seed Bite scales +2 per Bloom (upgraded +3), not +3.** At +3 the starter card reaches 19 damage for 1 energy by the Act 1 boss in simulation-free arithmetic (§8.4). +2 keeps it at about 14 there and lets upgraded copies reach 34 at the cap.
2. **Standard Prune grows a Bloom card in your hand only; if you hold none, no Bloom is gained.** The brief allowed a fallback to the deck. With a fallback the starter grows its only Bloom card on every Prune, which reaches the cap of 10 by about floor 7. Losing the Bloom when you hold no Bloom card turns "play Graft Hide now or wait for Seed Bite" into a real sequencing decision. "Wild Prune" (a named variant) keeps the deck-wide fallback for cards that pay for it.
3. **Prune's Scrap is optional ("you may").** A forced Scrap would make the starter Graft Hide sometimes eat a card you need. With "you may", Prune is never a trap.
4. **No Strength/Dexterity-like stat on the player.** Class mechanics (Onslaught, Bloom, Rot, Cadence, Delay) do the scaling. Enemies scale through escalating move numbers (§2.15 note), which the intent shows exactly.
5. **No Ethereal keyword.** Its trigger and effect are STS's exactly, and none of our three classes needs it. The engine keyword stays, but content must not use it.
6. **Augury is a class trait, not a starter relic**, so the Chronist starter relic can carry a Cadence hook.
7. **Exposed and Stagger are summed in one pipeline step.** Hit = max(0, after-multipliers − attacker's Stagger + target's Exposed). They cancel exactly and the order never surprises anyone.
8. **Riposte fires when the attack is declared, before its first hit.** If the Riposte kills the attacker, the attack is cancelled. This is the "parry" fantasy, and it lets defensive Riposte effects (Guard, Stagger) apply to the attack that triggered them.
9. Event count is **22** (6 per act + 4 any-act), per this task, not the brief's "18 total".

---

## 1. Vision and class identities

### 1.1 Vision (≤150 words)
Vibespire is a 40–70 minute climb up a dying colony's orbital elevator, told in bright 8-bit Phantasy Star colours. Like its genre, it lives on small, compounding deck decisions. It adds one new axis per class, and each axis is something STS never made central: **when you act** (Breaker: acting during the enemy's turn), **what your deck is made of** (Graft: the deck shrinks in combat and specific copies grow permanently), and **what you know about the future** (Chronist: order within a turn, a visible Timeline, and enemy intents two moves ahead). Skipping is rewarded with Shards, so a lean deck is a choice you can always afford. Intents are exact, randomness is seeded and shown, there are no infinites, and every boss asks one question with at least two answers.

### 1.2 The Breaker (80 HP) — Onslaught · Riposte · Guard
The Breaker plays a rhythm of two kinds of turn. On a **swing turn** she chains Attacks: every Attack raises Onslaught, so the fourth Attack hits much harder than the first, and finishers spend the count. On a **hold turn** she banks Guard, which halves each turn instead of vanishing, and keeps a Riposte card back. If an enemy attacks before her next turn, the held card fires at the attacker before the first hit lands. Multi-hit enemies feed her Riposte and lose most of their damage to Stagger. Big single hits are what she fears. Every turn asks "play it now, or hold it for their turn?"

### 1.3 The Graft (70 HP) — Bloom · Prune · Rot
The Graft gardens her own deck. Prune cards Scrap other cards for the rest of the fight and permanently grow a chosen Bloom card. Over a run, a few specific copies (this Seed Bite, not that one) become her engine, and in-combat thinning keeps her draws dense. Her clock is Rot. It deals little at first, rises by 1 every enemy turn up to 15, and spreads when its host dies. Some of her cards read the deck itself ("Block equal to the number of Bloom cards in your deck"). She is slow on turn 1 and inevitable by turn 6. Her reward-screen question is "does this card deserve to be grown, or is it compost?"

### 1.4 The Chronist (66 HP) — Cadence · Delay · Augury
The Chronist plays the sequence and the clock. The 3rd, 6th and 9th card she plays each turn is **on the beat**, so ordering cheap cards to land payoffs on beats is her turn-by-turn puzzle. Delay cards go onto a visible Timeline and resolve on a later turn for roughly double value. She sees every enemy's next **two** intents, so she can time a Delay 2 strike to land the turn the boss charges and a Delay 1 wall to arrive with the big hit. She is fragile and spiky: her bad turns are weak and her planned turns are huge. Her question is "what will the board look like in two turns, and what do I want waiting there?"

---
## 2. Keywords and statuses — exact rules

Each entry gives: the rule, stacking, decay timing, `isDebuff`, the engine hooks that implement it (existing names from `src/engine/types.ts`; new ones are flagged **[ask]** and collected in §9), a one-line UI note, and a commandment-19 line (the nearest STS1/STS2 mechanic and why ours differs in trigger or effect shape).

### 2.0 Turn structure (authoritative order)
Every timing below refers to these steps.

**Combat start**: shuffle the deck into the draw pile → apply class traits (Chronist: `augury`) → relic `onCombatStart` (Heartseed fetch happens here) → enemies `onSpawn` → choose first intents and forecasts → player turn 1.

**Player turn start** (`player_turn_start`):
1. Player Block → 0 (minus `keepBlock`). Player Guard halves, rounding down (§2.3).
2. Unfired primed cards **fizzle** into the discard pile (§2.2).
3. Energy = max energy. Per-turn counters reset (§3).
4. `onTurnStart` hooks: statuses, then relics. Status ticks `start_player_turn`.
5. **Timeline resolution**: cards due this turn resolve in the order they were played (§2.8).
6. Draw 5 (`drawPerTurn`).

**Player acts.**

**Player turn end** (`player_turn_end`):
1. `onTurnEnd` hooks: statuses, then relics. Status ticks `end_player_turn` (for example, Rot on the player).
2. **Prime step** (§2.2): Riposte cards in hand are primed, up to your capacity.
3. Hand end-of-turn: `onTurnEndInHand` card hooks (Backlash, Vacuum Chill). Keep cards stay in hand.
4. The rest of the hand is discarded.
5. Player status decay `end_player_turn`: Onslaught (to 0 or the kept amount), and Exposed and Stagger on the player (−1 each).

**Enemy phase**, for each living enemy in list order:
1. Enemy Block → 0. Enemy Guard halves (round down). Enemy `onTurnStart`.
2. Move resolves. If it is an enemy attack, the **Riposte check** runs before any of its effects (§2.2). If the enemy dies, its move stops.
3. **That enemy's turn end**: Rot ticks (§2.6), then Exposed and Stagger on it decay by 1, then it chooses its next intent and the engine recomputes its forecast (§2.9).

**Round end** → turn + 1 → player turn start.

### 2.1 Onslaught (`onslaught`) — Breaker
- **Rule**: a player status counter. **+1 after each Attack you play finishes resolving.** The Attack being played therefore does not count itself: the first Attack of a turn sees Onslaught 0, the second sees 1. This holds for Attacks played by effects too. Skills, Powers, Riposte triggers and Timeline resolutions do not add Onslaught (cards and relics may grant it explicitly: "Gain 2 Onslaught").
- **Reset**: at player turn end step 5, Onslaught → 0, or → `min(onslaught, keep)` where `keep` is the highest `onslaught_keep` value among your sources (Kept Fury relic, banking rares). **Onslaught gained during the enemy phase (for example from a Riposte trigger) is not reset until the end of your next turn**, so it carries into that turn. This is the Breaker's cross-mechanic bridge.
- **Card text forms** (card designers use exactly these):
  - "Deal {damage} damage, +{per} per Onslaught." Amount `{base, per, scale:{status:'onslaught'}}`. The preview shows the live value.
  - "If Onslaught ≥ N: …" Condition `has_status {who:'self', id:'onslaught', min:N}`. Does not spend.
  - "Spend N Onslaught: …" If Onslaught ≥ N, lose N Onslaught and do the effect. Otherwise skip the whole clause. **[ask]** effect `spend_status {id, n | 'all', effects}`.
  - "Spend all Onslaught: … {x} per Onslaught spent." Uses the same primitive; `spent` is available as an amount scale.
- **Stacking**: amount, additive. Cap 30 `[TUNING.caps.onslaught]` (display and safety; normal play peaks around 8).
- **Decay**: `end_player_turn`, `decayBy: 'all'` with the keep modifier **[ask: `keepStatus` modifier hook, generalising `keepBlock`]**.
- **isDebuff**: false. Enemies never have Onslaught.
- **Hooks**: status `afterCardPlayed` (type attack → +1).
- **UI**: a red chevron counter with a number beside the player portrait. It pulses on each increment. Card numbers update live in hand.
- **C19**: nearest is STS Finisher ("6 per Attack played this turn") and the per-turn counters behind Kunai/Shuriken. Ours is a **spendable, bankable class resource**. It can be gained off-turn (Riposte), carried over by rules and relics, and consumed by finishers. It is not a one-card count.

### 2.2 Riposte (`riposte`) — Breaker (also a few colourless cards)
A Riposte card has two effect lists: `effects`, used when played normally, and **`riposte`**, used when it fires from the primed rack **[ask: `CardDef.riposte?: Effect[]`]**. Text: "Deal 7 damage. **Riposte:** deal 6 damage to the attacker and gain 1 Onslaught."

**Priming** (player turn end, step 2):
- Your **prime capacity** is 1. `riposte_capacity` stacks add to it (Parry Charm +1). Cap 3 `[TUNING.caps.primeCapacity]`.
- Let R be the number of Riposte cards in your hand. If R ≤ capacity, all R are primed automatically; priming has no downside, because the card would otherwise be discarded. If R > capacity, the engine raises a `pendingChoice` ("Prime which Riposte cards?", min = max = capacity, from hand). The Breaker therefore always gets the choice when it matters.
- Primed cards leave the hand for a new zone, the **primed rack** **[ask: `CombatState.primed: CardInstance[]`]**, in the order they were primed. Hand effects cannot reach them: no discard, no Scrap, no Prune, and they don't count as "cards in hand".
- A Riposte card with Keep that is **not** primed (capacity full) stays in hand as usual. A primed card is never also kept.
- Some Riposte cards may be the last card in your hand. Priming happens at the end of your turn, so this changes nothing about the card. Effects that care about an empty hand at end of turn see the hand after priming, so it is empty.

**Triggering** (enemy phase, step 2):
- When an enemy attack begins resolving against you, before any of its effects, the **leftmost primed card fires**: its `riposte` effects run with `target` = the attacker. Fired cards then go to the discard pile, or to the Scrapheap if the card has Scrap. A Riposte trigger is **not a play**: no Onslaught, no Cadence, no `onCardPlayed`. It **is** "resolving a card", so Scrap applies. Hook **[ask]**: `onEnemyAttackDeclared {uid, intent}` for relics and statuses, and `onRiposteTriggered {card, attacker}`.
- **One primed card per enemy attack.** With 2 primed cards and 2 attacking enemies, each enemy's attack fires one card. With 2 primed cards and 1 attacking enemy, one fires and the other fizzles at your next turn start.
- **Multi-hit attacks trigger once** (at declaration). Riposte effects may scale with the triggering attack's hit count through amount scale `trigger_hits` **[ask]** ("deal 3 damage to the attacker for each hit of its attack").
- **If the Riposte kills the attacker, its move is cancelled.** No hits, and none of its other effects. If the Riposte applies Stagger or grants Guard, that applies to the attack that triggered it.
- Riposte damage is a hit by the player and goes through the full pipeline (the attacker's Exposed applies; your Stagger applies).
- Non-attack moves (buff, debuff, defend, special) never trigger Riposte, even if they cause HP loss.
- **Fizzle**: at player turn start step 2, unfired primed cards go to the discard pile. Event `prime_fizzled`.
- **Combat end** (for example a Riposte kills the last enemy): primed cards simply return with the deck; nothing fires.
- **Discard and Scrap effects**: a Riposte card in hand can be discarded or Scrapped like any card. That does not trigger Riposte.

- **Stacking**: `riposte_capacity` is amount, `decay: never`, combat-long.
- **isDebuff**: n/a (a card keyword).
- **UI**: the primed rack is a row of face-up mini-cards above the hand with a crossed-blades glint. During the enemy phase, the intent of the enemy that will fire the leftmost primed card gets a small parry marker. That is the first attacking enemy in order, and the marker is computable from the intents. When it fires, the card flies to the attacker and flashes before the attack animation. Events: `card_primed {uid}`, `riposte_triggered {uid, attacker}`, `prime_fizzled {uid}`.
- **C19**: nearest are Thorns/Flame Barrier (passive damage when hit) and Watcher's Retain. Ours is a **held card that resolves its own effect list on the enemy's turn**, chosen by the player and consumed on the first attack. The axis is a per-card play-now-or-hold decision with interrupt timing that can cancel the attack. This is not a passive aura.

### 2.3 Guard (`guard`) — Breaker, colourless, relics; enemies may have it
- **Rule**: a second defence pool beside Block. "Gain N Guard" adds to it. Block-gain modifiers apply to Guard gains too (relics such as Bulwark Rivets add a Guard-only flat bonus).
- **Absorption order**: a hit is absorbed by **Block first, then Guard, then HP**. Block would vanish at your next turn start anyway, so using it first is always what the player wants.
- **Decay**: at the start of its owner's turn, Guard halves (round down): 13 → 6 → 3 → 1 → 0. For the player this happens at player turn start step 1, together with the Block reset. For enemies it happens at enemy turn step 1.
- **Cap**: 50 per entity `[TUNING.caps.guard]`. Excess is lost.
- **Pool maths, worked example**: the player has 6 Block and 10 Guard, and the enemy hits 3 × 5. Hit 1: Block 6 → 1. Hit 2: Block 1 → 0, Guard 10 → 6. Hit 3: Guard 6 → 1. No HP lost. Next turn start: Block 0, Guard 1 → 0.
- **"Block" in card text means Block only.** "Your defence" means Block + Guard (for example "Deal damage equal to your defence"). Effects that remove Block remove Block only, unless the text says "Block and Guard".
- **Engine**: `guard: number` on `CombatPlayerState` and `EnemyState` **[ask]**, plus effect `guard {amount, target?}` **[ask]**. Guard is a field, not a status, because the pipeline consumes it (§2.15). Event `block` gains `pool: 'block' | 'guard'` **[ask]**.
- **isDebuff**: false.
- **UI**: Block is a blue shield with a number; Guard is a gold shield beside it. The HP bar shows a combined overlay: Block in blue, then Guard in gold. At turn start the Guard number visibly halves (a "13 → 6" tick).
- **C19**: nearest are Barricade/Blur (keep all Block), Calipers (keep all but 15) and Plated Armor (fixed Block each turn, lost on unblocked damage). Ours is a **separate pool with geometric decay that is consumed after Block**, so a Breaker deliberately splits defence between "this turn" (Block) and "bank" (Guard).

### 2.4 Bloom (`bloom` keyword; `bloom` per-copy var) — Graft
- **Rule**: a card with the `bloom` keyword is a **Bloom card**. Each copy stores `CardInstance.vars.bloom`, starting at 0. Its text scales with it: "Deal {damage} damage" where damage = `{base: 4, per: 2, scale: {cardVar: 'bloom'}}`, shown as "Deal 4 (+2 per Bloom) damage" with the current Bloom on the card frame.
- **Persistence**: Bloom belongs to the deck copy. It persists across combats, acts and saves. The engine already syncs combat-copy `vars` back to the deck copy at combat end. A Bloom card **created** during combat (`add_card`) starts at 0 and its Bloom is lost when combat ends.
- **How it grows**: only through Prune (§2.5), Bloom-granting relics and potions, and explicit "gains N Bloom" card effects. **Never by being played.**
- **Cap**: 10 per copy `[TUNING.caps.bloom]` (Elder Seed: 15). Bloom beyond the cap is lost. Bloom never goes below 0. Enemy and curse effects may remove it ("loses 1 Bloom").
- **Upgrades**: upgrading a Bloom card raises its **per-Bloom increment** and never its base. The card's Bloom value is kept. Bloom card upgrades may also lower cost, on rares only.
- **Transmute/transform**: Bloom carries over if the result is also a Bloom card (§4.8). Otherwise it is lost.
- **Deck-count effects**: "Bloom cards in your deck" counts deck copies with the keyword, at any Bloom including 0 (amount scale **[ask]** `bloom_cards_in_deck`). "Total Bloom in your deck" (`bloom_total_in_deck`) and "highest Bloom in your deck" (`bloom_max_in_deck`) read the deck copies' vars.
- **isDebuff**: n/a. **Stacking**: per copy, additive.
- **Engine**: effect **[ask]** `bloom {amount, target: 'choose_hand' | 'random_bloom_in_piles' | 'all_hand' | 'self' | 'min_in_deck' | 'max_in_deck'}`, hook **[ask]** `onBloomGained {card, delta}`, event **[ask]** `bloom {uid, delta, now}`.
- **UI**: a small leaf counter "✿4" on the card's frame in every view (hand, deck list, reward screen). Capped copies show a gold leaf. Prune target pickers grey out capped copies.
- **C19**: nearest are Claw/Rampage/Ritual Dagger/Genetic Algorithm/Feed (cards that grow when played or on kill) and STS2 enchantments (per-card permanent modifiers). Ours is **grown by thinning other cards, onto a copy the player chooses**, and never by playing the card itself. The decision is which copy to invest in and what to sacrifice for it.

### 2.5 Prune (`prune`) — Graft
**Standard text and exact rule**: "**Prune:** you may Scrap another card from your hand. If you do, choose a Bloom card in your hand; it gains 1 Bloom."
1. The choice is "another card in your hand": min 0, max 1 (`pendingChoice`). The Prune card itself is in play and cannot be chosen.
2. If you Scrap nothing, Prune ends. If you Scrapped a card, `onPrune {scrapped}` fires **[ask]** and `prunesThisCombat += 1`.
3. Bloom target: choose a Bloom card in your hand that is not at its cap (`pendingChoice`; auto-chosen if exactly one is eligible). The card just Scrapped is no longer in hand. **If no eligible Bloom card is in your hand, no Bloom is gained** (the Scrap still happened).
4. Prune resolves at its position in the card's effect list, like any effect.
- **Empty hand / no other card**: nothing happens and the card's other effects still resolve. Card text greys "Prune" when no other card is in hand.
- You may Scrap a Bloom card with Prune. It keeps its Bloom; it is only gone for this combat.
- Bound cards (Burden) can be Scrapped by Prune but never Pruned away.

**Named variants** (card designers use only these):

| Variant | Text | Difference |
|---|---|---|
| `prune` | Prune | As above, +1 Bloom. |
| Prune N | Prune 2 | +N Bloom to the chosen card. |
| Wild Prune | Wild Prune | The Bloom goes to a random eligible Bloom card in your hand, draw pile or discard pile (`misc` stream). |
| Spread Prune | Spread Prune | Every eligible Bloom card in your hand gains 1 Bloom. |
| rider | "Prune. If you Scrapped an Attack, +1 Bloom." | Condition **[ask]** `pruned_type {type}` on the last Prune. |
| **Prune away** | Prune away | Same as Prune, but the Scrapped card is **also removed from your deck permanently** (event `card_removed`). Rules: the card must not be Bound; at most 1 Prune away per turn `[TUNING.caps.pruneAwayPerTurn]`; a card with Prune away always has Scrap itself. The renderer asks for confirmation ("Remove Lash from your deck?"). |

- **Prune** (Scrap for this combat) **vs Prune away** (permanent): permanence is always opt-in. It is printed as "Prune away" and confirmed on use.
- **isDebuff / stacking / decay**: n/a (an effect keyword). `prunesThisCombat` lives in `combat.counters.prunes`.
- **UI**: a two-step picker (Scrap → Bloom target) with a leaf sprite flying from the Scrapped card to the target, then a "+1 ✿" pop.
- **C19**: nearest are True Grit/Burning Pact (exhaust a card for Block/draw) and Feel No Pain/Dark Embrace (payoffs on exhaust). Ours turns the exhausted card into **permanent growth of a chosen other copy**. The payoff is cross-combat and targeted, not an in-combat resource.

### 2.6 Rot (`rot`) — Graft (enemies may apply it to the player sparingly)
- **Rule**: at **the end of the afflicted creature's own turn**, it **loses HP** equal to its Rot, **then Rot increases by 1**. Cap 15 `[TUNING.caps.rot]` (Mycelial Net: 20). Increases and new applications beyond the cap are lost. Rot never decays by itself.
- **Timing**: enemy Rot ticks at enemy-turn step 3, right after that enemy's move. Player Rot (if an enemy applies it) ticks at player turn end step 1. The engine needs a per-entity "end of own turn" tick phase **[ask: `RoundPhase 'end_own_turn'`]**, because Rot must tick between enemies, not after the whole enemy phase.
- **Block interaction**: **Rot is HP loss and ignores Block and Guard.** Reasons: (a) Rot ticks at the end of the enemy's turn, right after a Defend-intent enemy gains Block. If Block soaked Rot, Rot would be blanked by exactly the turns where the Graft needs her clock. (b) The genre's damage-over-time convention (Poison, Doom) is HP loss, so players read it correctly. (c) It keeps the rule to one line with no tooltip-inside-tooltip. Exposed does not apply (Rot is not a hit).
- **Spread**: when a creature with Rot dies, floor(Rot / 2) is applied to a random living enemy of the dead creature (`misc` stream), as a normal application (cap applies). Rot Censer: all of it. If no other enemy is alive, nothing happens.
- **Stacking**: amount, additive. Applying Rot to a rotting target raises its level; the +1 per tick continues.
- **Value maths** (for pricing): applying N Rot to a clean target that lives T more of its turns deals N·T + T(T−1)/2. Adding N to an existing stack adds N·T. The first application is worth the most because it starts the clock. See §8.6.
- **isDebuff**: true. **Decay**: never. **Tick**: `end_own_turn`, `onTick` = `lose_hp {amount: stacks, target: self}` then `+1` (clamped at the cap).
- **Hooks**: status `onTick`, status death hook for spread **[ask: statuses on a dying entity receive `onDeath`]**.
- **UI**: a green-purple skull icon with the number. At each tick the number drops off as purple HP loss, then the icon pulses "+1". The intent area shows "−{rot} at end of turn" under the HP bar, so lethal is readable.
- **C19**: nearest are Poison (lose X at the start of turn, then X−1, no cap) and Doom (an execute threshold). Ours **grows (+1 per tick) to a cap and spreads on death**. Its maths is "start early" rather than "stack high", and it is a capped clock, not a burst.

### 2.7 Cadence and "on the beat" — Chronist
- **Rule**: count the cards you play this turn. The **beat count** is that number plus `beatOffset` (from Tempo Draught). A card is **on the beat** if, counting itself, the beat count when it is played is 3, 6 or 9 `[TUNING.cadence.beats = [3, 6, 9]]`. Metronome Heart adds 12. Fixed Star leaves only 3.
- **Increment timing**: the count increases **when the card is played** (cost paid, before its effects). An "On beat:" clause inside the card therefore checks its own position. **[ask]**: `cardsPlayedThisTurn` must be appended at pay-cost time, before effects. Add effect wrapper `on_beat {effects}` and Condition `on_beat`.
- **What counts as a card played**: every card played from hand, including Status and Curse cards that have a cost (Jitter, Guilt). It also counts a card played by another card's effect, and a Delay card at the moment you play it.
- **What does not count**: Timeline resolutions, Riposte triggers, potions, relic effects, and cards discarded or Scrapped without being played.
- **Delayed cards and the beat**: a Delay card counts when you play it. Its "On beat:" status is **stamped at play time** and applies when it resolves later (`TimelineEntry.onBeat`).
- **Loop cap**: at most 3 on-beat plays per turn (4 with Metronome Heart), because beats exist only at those positions. If an effect plays another card, that card counts as one play. **Cards played by that card's effects do not count** (one level deep only) `[TUNING.caps.playDepth = 1]`. This is the brief's "an on-beat effect cannot advance the beat more than once".
- **Stacking/decay**: counter resets at player turn start. Not a status; derived from `cardsPlayedThisTurn.length + combat.counters.beatOffset`.
- **isDebuff**: n/a.
- **UI**: a 3-pip metronome above the energy orb. Pips light as you play, and the full bar flashes on each beat. The card that **would** be on the beat if played next gets a gold border in hand, and its "On beat" text lights up.
- **C19**: nearest are Kunai/Shuriken/Ornamental Fan/Letter Opener ("every 3 Attacks/Skills: a global bonus"), Panache (every 5 cards) and Time Eater (every 12 cards). Ours is a **positional condition printed on the card itself**: each card has its own payoff for landing on a beat, so ordering matters card by card. It is not a counter that fires an external effect.

### 2.8 Delay and the Timeline (`delay`) — Chronist
- **Card shape**: `delay: {turns: N, effects: Effect[]}` **[ask: `CardDef.delay`]**. N ∈ {1, 2, 3} `[TUNING.caps.delayMax = 3]`. Text: "Delay N: …". A card may also have immediate `effects` (a "split" card: "Gain 3 Block. Delay 1: gain 5 Block.").
- **Playing a Delay card**: pay its cost, resolve its immediate `effects`, then the card itself goes onto the **Timeline** (not the discard pile) as an entry **[ask]**:
  `TimelineEntry { card: CardInstance; dueTurn: combat.turn + N; seq: number /* play order */; onBeat: boolean; target: EntityRef | null; x: number; advancedThisTurn: boolean }` in `CombatState.timeline` (max 10 entries `[TUNING.caps.timeline]`; a Delay card is unplayable while the Timeline is full).
- **Resolution**: at player turn start step 5, every entry with `dueTurn ≤ combat.turn` resolves in `seq` order. It runs its `delay.effects` with the stamped `onBeat`, `x` and `target`. **Amounts are computed at resolution time** (current Onslaught, Bloom and statuses). Then the card goes to the discard pile, or the Scrapheap if it has Scrap. Hook **[ask]** `onDelayResolved {card}`. Resolution happens **before the turn's draw**, so delayed draw adds to your hand before the normal 5, and delayed Block lasts through your turn and the coming enemy phase.
- **Dead target**: if the stamped target is dead, retarget to the **leftmost living enemy** (deterministic, readable). If no enemy is alive, combat is already over.
- **Advance N** ("all Delayed cards resolve N turns sooner"): every entry's `dueTurn −= N`. Entries now ≤ the current turn resolve immediately, mid-turn, in `seq` order. Cap: total Advance per player turn ≤ 2 `[TUNING.caps.advancePerTurn]`; excess Advance does nothing (greyed text). A card that resolved this turn cannot be put onto the Timeline again this turn `[cap_relay]`. Effect **[ask]** `advance {n}`.
- **Postpone N** (enemy or status effect): `dueTurn += N`, max N = 3. Effect **[ask]** `postpone {n}`.
- **While on the Timeline**, a card is in no pile. It cannot be drawn, discarded, Scrapped, Pruned or counted as "in hand". It does count as "in your deck".
- **Combat ends with cards on the Timeline**: nothing resolves. The cards are part of the deck as always.
- **Keep/discard interactions**: none while on the Timeline. A Delay card kept in hand (Keep) is a normal card until played.
- **Powers cannot have Delay.**
- **UI**: a horizontal strip above the enemy line with columns "next turn / +2 / +3". Each entry is a mini-card showing its live resolution value and target marker. On-beat-stamped entries have a gold rim. Advance slides entries left; resolution flips the card and fires its effect.
- **C19**: nearest are The Bomb (fixed 3-turn AoE), Dark orb (stored damage) and Wildfrost counters. Ours is a **generic keyword any card can carry**. The card leaves the draw cycle while waiting (a tempo/thinning trade), the Timeline is manipulable (Advance/Postpone), and it pairs with Augury to aim at a known future turn.

### 2.9 Augury (`augury`) — Chronist trait; one-combat for others
- **Rule**: a player flag status. While you have it, each enemy shows its **next intent and the one after it** (the forecast). Without it, only the next intent shows. Prophet Glass raises the depth to 3.
- **Determinism contract (binding on `ENEMIES.md` and the engine)**:
  1. `chooseMove(ctx)` must be a **pure function** of: the enemy's own rng state, `history`, `turn`, `aiState`, the enemy's own HP/maxHp/statuses, and which allies are alive. **It must not read player state** (HP, Block, Guard, hand, deck, statuses).
  2. Enemies react to the player only inside **move effects** at resolve time (for example "deal 8; if you have Guard, deal 12 instead"). Intents already compute numbers live, so the current intent stays exact.
  3. The engine computes the forecast by calling `chooseMove` on a **cloned** rng with history + [current move] and turn + 1. The forecast is stored in **[ask]** `EnemyState.forecast: Intent[]` (length = depth − 1). It is computed for every enemy whether or not anyone has Augury, so cards can always query it.
  4. The forecast is recomputed whenever enemy-side state changes: HP thresholds, an ally dies, a status changes on the enemy.
- **Conditional moves — decision: show the default, live.** The forecast shows the move the enemy *would* choose given the enemy-side state *as it is now*. If that changes (you drop it below 50% and it will now Split), the forecast updates instantly with a flicker. Because of rule 1 nothing depends on the player's future choices, so the forecast is exact unless the enemy-side state changes. Moves designed to be unknowable (a reactive enemy whose next move depends on what hits it during its own turn) set `MoveDef.augury = 'hidden'` **[ask]** and show "?".
- **Card queries**: Condition **[ask]** `forecast_is_attack {who: 'target' | 'any' | 'all', depth: 1}` ("if the enemy's intent after next is an attack…"), and amount scale `forecast_damage` (total forecast attack damage of the target).
- **Stacking**: flag. **Decay**: never (combat-long). `oracle_pebble` and potions apply it at combat start or on use. **isDebuff**: false.
- **UI**: the forecast intent sits behind and to the right of the main intent, at 60% size and alpha 0.7, labelled "NEXT" in 8×8 font. "?" for hidden moves. A flicker when it changes.
- **C19**: nearest is the inverse of Runic Dome (which hides intents). STS has no mechanic that reveals future enemy turns. Information is research §3.11's named unused axis.

### 2.10 Exposed (`exposed`) — universal debuff
- **Rule**: each hit on a creature with Exposed deals **+1 damage per stack**. This is flat and additive, applied **after multipliers** in pipeline step 4 (§2.15). It affects hits only; HP loss is unaffected.
- **Decay**: −1 stack at the end of the affected creature's own turn: for enemies, the end of that enemy's turn; for the player, player turn end step 5. So Exposed 1 that you apply to an enemy lasts for the rest of your turn; Exposed 2 lasts for this turn and your next.
- **Note for `ENEMIES.md`**: Exposed applied to the player during the enemy phase decays at the end of the player's next turn. Exposed 1 therefore only affects the remaining enemy moves in that phase. Use ≥2 to threaten a full next enemy turn.
- **Stacking**: amount, additive. Cap 20 `[TUNING.caps.exposed]`. **isDebuff**: true. **Hooks**: built-in pipeline step **[ask]** (needs both attacker and target in one step).
- **UI**: a cracked-armour icon with the number. Intent and card damage previews include it (for example "5×3" becomes "7×3").
- **C19**: nearest is Vulnerable (×1.5 to all attack damage). Ours is **per hit and flat**, so it scales with hit count, not hit size. Multi-hit and Riposte decks love it and one big hit barely notices.

### 2.11 Stagger (`stagger`) — universal debuff
- **Rule**: each hit dealt by a creature with Stagger deals **−1 damage per stack**, minimum 0, in the same pipeline step 4 as Exposed (`final = max(0, multiplied − attackerStagger + targetExposed)`).
- **Decay**: −1 stack at the end of the affected creature's own turn. Stagger 1 applied to an enemy on your turn affects its next turn. Stagger 3 gives −3, −2, −1 over three of its turns.
- **Stacking**: amount, additive. Cap 20 `[TUNING.caps.stagger]`. **isDebuff**: true. **Hooks**: built-in pipeline step **[ask]**.
- **UI**: a dizzy-star icon. Intents show the reduced per-hit number, so a "4×4" can become "1×4".
- **C19**: nearest are Weak (×0.75) and Shackles/Strength Down (flat Strength loss before multipliers). Ours is **applied after multipliers per hit and decays one per turn**. It mirrors Exposed exactly, so multi-hit enemies are crippled and a single 30-damage hit is barely dented.

### 2.12 Shards (`shards`) — universal run currency
- **Rule**: a run counter `player.counters.shards`. Cap 10 `[TUNING.shards.cap]`; Shards beyond the cap are lost (shown). Sources and sinks are in §4.5. Hook **[ask]** `onShardGain {amount}`. Effect **[ask]** `shards {amount}`.
- **UI**: a prism icon with a number in the top bar beside gold. On the reward screen the Skip button reads "SKIP +1 ◆".
- **C19**: nearest are Singing Bowl (skip → +2 Max HP) and STS2's skip choices. Ours is a **spendable currency** whose sinks are deck surgery (Purge/Transmute/discounted removal). Skipping buys future deck quality, not stats.

### 2.13 Baseline keywords we keep (genre baselines; justified)

| Keyword (display) | Engine id | Rule | Why keep / nearest |
|---|---|---|---|
| Block | `block` | Absorbs hit damage before Guard. Resets at the start of its owner's turn. | Genre baseline (Hearthstone armour, Monster Train shields). Without it there is no defence economy. |
| Energy | — | 3 per turn, refilled at turn start, unspent is lost. | The denominator of all pricing. |
| Draw | `draw` | Take the top card of the draw pile. An empty pile shuffles the discard pile in. Hand limit 10: cards that would exceed it stay in the draw pile. | Baseline. |
| **Scrap** | `exhaust` | After resolving, the card goes to the Scrapheap for this combat. | Genre baseline thinning (Monster Train "Consume", MTG exile). Commandment 4 wants our own in-combat thinning **path**: that is Prune, and Scrap is the plumbing. |
| **Opening** | `innate` | Starts combat in your opening hand (counts toward the 5). | Baseline (opening-hand rules exist in every card game). Budget: ≤2 cards per class pool. |
| **Keep** | `retain` | Not discarded at end of turn. | Baseline. Riposte is the Breaker's own hold mechanic, so Keep is budgeted at ≤3 cards per class pool, plus colourless. |
| Unplayable | `unplayable` | Cannot be played. | Baseline. |
| X | cost `'X'` | Spend all energy; X = the energy spent. | Baseline. |

**Not used**: Ethereal (§0.3). **Bound** is not a keyword. The one unremovable-by-normal-means curse (Burden) carries its rule as plain text (§7.3).

### 2.14 Other statuses defined here

| id | Name | Stacks | Decay / tick | isDebuff | Rule | UI |
|---|---|---|---|---|---|---|
| `onslaught_keep` | (hidden) | amount, max-of-sources | never | false | At reset, Onslaught → min(Onslaught, keep). | Shown as a lock pip on the Onslaught counter. |
| `riposte_capacity` | Parry Stance | amount | never | false | +N prime capacity (cap 3 total). | Rack shows N empty slots. |
| `augury` | Augury | flag | never | false | §2.9. | Eye icon. |
| `elite_hunted` | Hunted | flag | never | false | (Enemy, from `pact_hunted`) +25% Max HP at spawn; its hits deal +2 (pipeline step 2). | Red eye on the enemy. |
| `backlash_primed` | Backlash | amount | removed when it fires or at player turn start | true | The next enemy hit on you deals +4 per stack (step 4), then this is removed. | A cracked icon in the primed rack. |
| `cost_tax` | Jitter Tax | amount | `end_player_turn`, all | true | The next card you play costs +1 per stack; removed when used. | Small "+1" on the hand. |

### 2.15 The damage pipeline (per hit, authoritative)
For each hit from attacker A to target T:
1. **Base**: the effect's resolved amount (card number including "+per Onslaught" / "+per Bloom", or the enemy move number including its own escalation).
2. **+ Flat**: A's `damageDealtFlat` hooks (relics, `elite_hunted`, enemy-only buffs defined in `ENEMIES.md`).
3. **× Multipliers**: A's `damageDealtMult` × T's `damageTakenMult` (integer percent, multiplied together), then floor. (No base status uses these. They exist for boss phases and a few relics.)
4. **Stagger / Exposed**: `d = max(0, d − A.stagger + T.exposed (+2 per stack with Fracture Engine for player hits) + T.backlash)`.
5. **Final adjustments**: T's `modifyDamageTaken` (damage caps, Intangible-likes in `ENEMIES.md`).
6. **Absorb**: T's Block, then T's Guard.
7. **HP loss**: remaining → `onHpLost`; Tender Plating +1 here. Then the death check (on death: the dying creature's statuses fire `onDeath`, so Rot spreads; then `onEnemyDied`).

Riposte firing (§2.2) happens **before step 1 of the first hit of an enemy attack**. **Lose HP** skips steps 1–6. `computeDamage(preview=true)` runs steps 1–5 for all previews (card text, intents, the Timeline strip).

**Note to `ENEMIES.md`**: enemy damage scaling should be written as **move escalation** (for example "Gnaw: 7, +2 each time it is used", via `aiState`), so the intent shows it. If you need an enemy buff status, it must act in step 2 (flat) or step 3 (multiplier) and be enemy-only.

---
## 3. Infinite-prevention caps

Policy: **no true infinites**. Every loop hits one of these caps. Caps are engine-enforced per player turn (counters in `combat.counters`, reset at player turn start step 3). When an effect is cut by a cap, it does nothing and the engine emits `text` "{cap name} reached". The simulator logs every cap hit (§8.8); in a healthy build a cap is hit in under 1% of turns.

| id | Rule | Number `[TUNING.caps.*]` |
|---|---|---|
| `cap_bonus_energy` | Energy gained during your turn from any source other than the turn-start refill (cards, relics, potions). | 4 per turn (`bonusEnergy`) |
| `cap_to_hand` | Cards **put into** your hand by effects other than draw: return from discard or Scrapheap, fetch from the draw pile, copies, generated cards. | 4 per turn (`toHand`) |
| `cap_draw` | Cards drawn by effects during your turn (the turn-start 5 excluded). | 15 per turn (`effectDraw`) |
| `cap_cost_reduction` | Costs never go below 0. A given card instance may be played at **below its printed cost at most once per turn**; later plays that turn pay printed cost. Combat-long cost reductions (`costOverride`) are at most −2 below printed. | once per instance per turn; −2 (`costReductionMax`) |
| `cap_beats` | On-beat positions are 3/6/9 only (12 with Metronome Heart). Cards played by an effect of a card that was itself played by an effect do not count as plays (depth 1). | 3 beats (4 max); depth 1 |
| `cap_advance` | Total Advance N applied per turn. | 2 per turn (`advancePerTurn`) |
| `cap_relay` | A card that resolved from the Timeline this turn cannot be put on the Timeline again this turn. | — |
| `cap_timeline` | Entries on the Timeline. | 10 (`timeline`) |
| `cap_primes` | Total prime capacity. Each primed card fires once (Duelist's Oath: twice). | 3 (`primeCapacity`) |
| `cap_prune_away` | Prune away resolutions. | 1 per turn (`pruneAwayPerTurn`) |
| `cap_plays` | Card plays per turn (backstop; after this, cards are unplayable this turn). | 40 (`playsPerTurn`) |
| `cap_stacks` | Onslaught 30 · Guard 50 · Rot 15 (20) · Exposed 20 · Stagger 20 · Bloom 10 (15) per copy · Shards 10. | as listed |
| `cap_hand` | Hand limit. | 10 |

Content rule for the card designers: **no common may gain energy, return a card to hand, or reduce a cost** unless it also has Scrap. Loops must need an uncommon plus a rare (or a rare plus a relic) to assemble (commandment 17).

---

## 4. Run structure and economy

### 4.1 Classes and starting state `[ClassDef]`

| | Breaker | Graft | Chronist |
|---|---|---|---|
| Max HP | 80 | 70 | 66 |
| Energy / draw / hand limit | 3 / 5 / 10 | 3 / 5 / 10 | 3 / 5 / 10 |
| Gold / potion slots / Shards | 99 / 3 / 0 | 99 / 3 / 0 | 99 / 3 / 0 |
| Starter relic | `riven_gauntlet` | `heartseed` | `chrono_lens` |
| Trait | — | — | `augury` at combat start |
| Deck (11) | 5 `hew`, 4 `bulwark`, `shoulder_check`, `brace` | 5 `lash`, 4 `husk`, `seed_bite`, `graft_hide` | 5 `pulse_shot`, 4 `ward`, `tick`, `tock` |

**Starter cards (final; these are 4 of each class's 56; the card designers write the other 52):**

| id | Class | Type | Cost | Text (base → upgraded) |
|---|---|---|---|---|
| `hew` | breaker | attack | 1 | Deal 6 damage. → 9 |
| `bulwark` | breaker | skill | 1 | Gain 5 Block. → 8 |
| `shoulder_check` | breaker | attack | 1 | Deal 6 damage, +2 per Onslaught. Riposte: deal 6 damage to the attacker. → 8 (+2) / Riposte 9 |
| `brace` | breaker | skill | 1 | Gain 6 Guard. → 9 |
| `lash` | graft | attack | 1 | Deal 6 damage. → 9 |
| `husk` | graft | skill | 1 | Gain 5 Block. → 8 |
| `seed_bite` | graft | attack | 1 | Bloom. Deal 4 (+2 per Bloom) damage. → (+3 per Bloom) |
| `graft_hide` | graft | skill | 1 | Gain 5 Block. Prune. → 7 Block |
| `pulse_shot` | chronist | attack | 1 | Deal 6 damage. → 9 |
| `ward` | chronist | skill | 1 | Gain 5 Block. → 8 |
| `tick` | chronist | attack | 0 | Deal 3 damage. On beat: draw 1 card. → 4, On beat: draw 2 |
| `tock` | chronist | skill | 1 | Gain 3 Block. Delay 1: gain 5 Block. → 4 / 7 |

### 4.2 Card rewards `[TUNING.cardOdds]`

| Source | Common | Uncommon | Rare | Cards offered |
|---|---|---|---|---|
| Normal combat | 60 | 37 | 3 + pity | 3 |
| Elite | 50 | 40 | 10 + pity | 3 |
| Boss (acts 1–2) | 0 | 0 | 100 | 3 |
| Event combat | 50 | 40 | 10 + pity | 3 |
| Shop (class cards) | 54 | 37 | 9 | 5 (2 Attack, 2 Skill, 1 Power) |

- **Rare pity** `[rarePityStart = 0, rarePityStep = 1]`: +1% to the rare chance for each normal or elite card reward screen that showed **no** rare. It resets to 0 when a rare is shown. The pity percentage comes out of the common share. Shops and bosses don't move it.
- **Duplicates**: no duplicate ids within one screen.
- **Upgraded offers** (per non-rare card offered): Act 1 0%, Act 2 15%, Act 3 30% `[TUNING.upgradedOffer]`. Rares are offered upgraded at half those rates.
- **Colourless sources**: shops (2 per shop), `ev_assembly_line` (3), `pact_wanderer` (1 of 3). Colourless never appear in combat card rewards. Colourless rarity split: 14 uncommon / 6 rare (of 20).
- **Skipping**: skipping any card reward screen (normal, elite, boss, event combat) grants **1 Shard**. Proceeding without picking counts as a skip.

### 4.3 Potions `[TUNING.potion]`
Drop chance after any won combat: starts at 40%; −10 after a drop, +10 after no drop; clamped 10–90. Elites and bosses use the same roll. Rarity of a dropped potion is 65/25/10 (common/uncommon/rare). Class potions only drop for their class. If your slots are full, the potion is offered with a "discard one to take" prompt. It is never silently lost (an override of the engine comment). **[ask]**

### 4.4 Gold `[TUNING.gold]`

| Encounter | Act 1 | Act 2 | Act 3 |
|---|---|---|---|
| Normal | 10–18 | 13–21 | 16–24 |
| Elite | 25–35 | 30–40 | 35–45 |
| Boss | 90–110 | 90–110 | — (victory) |
| Treasure (with relic) | 25–40 | 25–40 | 25–40 |
| Event combat | 20–30 | 25–35 | 30–40 |

Expected income per act ≈ 320 gold (6 normals, 2 elites, boss, events, treasure), enough for one removal and one card or potion per shop visit.

### 4.5 Shards — sources and sinks

**Sources**

| Source | Shards |
|---|---|
| Skip a card reward screen | +1 |
| Skip the boss relic screen (acts 1–2) | +2 |
| `pact_shards` | +2 |
| Events: `ev_singing_geode` (+2), `ev_lost_climber` (+1), `ev_tether_merchant` (buy), `ev_immune_scan` (+1) | varies |
| Potion `pot_shard_tincture` | +1 |
| Relics: `crown_fragment`, `shard_debt`, `ascendant_prism` | varies |

Target: a disciplined player ends each act with 3–5 Shards earned (about 3 skips plus one event or potion). The simulator tracks this as metric `shards_earned_per_act` and `shards_spent_per_act`.

**Sinks**

| Sink | Price | Notes |
|---|---|---|
| Rest: **Purge** (`rest_purge`) | 2 Shards | Remove a card from your deck. Uses the rest action. Shard Loupe: 1. |
| Rest: **Transmute** (`rest_transmute`) | 1 Shard | See §4.8. Uses the rest action. Crystal Spine: first per act free. |
| Shop: **Shard removal** | 1 Shard + 25 gold | Uses the shop's one removal service, but does **not** raise the gold-removal price. Shard Writ: no gold, and doesn't use the service. |
| Event options | listed per event | — |

### 4.6 Shop `[TUNING.shop]`

| Item | Count | Price (gold) |
|---|---|---|
| Class cards (2 Attack, 2 Skill, 1 Power; 1 random card at 50% off) | 5 | common 45–55, uncommon 68–82, rare 135–165 |
| Colourless (1 uncommon, 1 rare) | 2 | 120% of the class price for that rarity |
| Relics (2 by general odds 50/33/17 + rightmost always shop rarity) | 3 | common/shop 143–158, uncommon 238–262, rare 285–315 |
| Potions (65/25/10) | 3 | 48–53 / 71–79 / 95–105 |
| Card removal (one per shop visit) | 1 | **75 gold, +25 per previous gold removal**, OR **1 Shard + 25 gold** (no escalation) |

### 4.7 Rest site
One action per visit (Shard Crucible lets Purge and Transmute also happen alongside the main action).

| id | Option | Effect |
|---|---|---|
| `rest_rest` | Rest | Heal 30% of Max HP, rounded down `[restHealPct]`. |
| `rest_smith` | Smith | Upgrade 1 card. |
| `rest_purge` | Purge | Pay 2 Shards: remove 1 card of your choice. Unavailable with < 2 Shards (reason shown). |
| `rest_transmute` | Transmute | Pay 1 Shard: Transmute 1 card (§4.8). Unavailable with 0 Shards. |

### 4.8 Transmute (exact)
1. Choose a card in your deck (any card, including curses; Burden cannot be chosen).
2. The engine generates **2 offers** from **your class pool** at the **same rarity** as the chosen card. Starter → common, curse → common, colourless → colourless of the same rarity. Offers never include the chosen id or duplicates (`reward` stream).
3. Choose 1 of the 2. It replaces the chosen card. If the chosen card was upgraded, the new card is upgraded. If both are Bloom cards, the Bloom value carries over (capped by the new card's cap). Otherwise Bloom is lost.
4. You cannot decline once the offers are shown (the Shard is spent when you choose the card in step 1).

Engine: effect **[ask]** `transmute {choose: true, offers: 2}` with a new `ChoiceResume` op `transmute_pick`. **C19**: STS Transform is a single random card of any rarity. Ours is a same-rarity choice of 2, a guided swap that keeps upgrades and Bloom.

### 4.9 Treasure, events, map
- **Treasure** (row 8 and `?` resolutions): 1 relic at common 50 / uncommon 35 / rare 15 `[TUNING.treasureRelicOdds]`, plus 25–40 gold.
- **`?` nodes** resolve on entry (`event` stream), fixed odds: event 65 / monster 20 / shop 8 / treasure 7 `[TUNING.unknownRoomOdds]`. If the act's event pool and the any-act pool are both empty, the node is a monster.
- **Events**: each event appears at most once per run. The pool is the 6 act events plus the 4 any-act events not yet seen. The pick is uniform among eligible events (some have conditions, §6).
- **Map** (ENGINE_SPEC §9, confirmed with these weights `[TUNING.map]`):

| Rows (0-based) | Monster | Event | Elite | Rest | Shop |
|---|---|---|---|---|---|
| 0 | 100 | — | — | — | — |
| 1–4 | 62 | 30 | 0 | 0 | 8 |
| 5–7, 9–12 | 45 | 22 | 13 | 12 | 8 |
| 8 | Treasure (fixed) | | | | |
| 13 | 52 | 25 | 15 | 0 | 8 |
| 14 | Rest (fixed) | | | | |

Rules as spec §9, plus: no Rest on row 13; no two Elites, Rests or Shops consecutive on a path; at least 2 Elites and 1 Shop reachable. **Elite encounters are pre-assigned to elite nodes at map generation** (`map` stream) **[ask: `MapNode.encounterId?`]**. This makes rewards path-independent and lets Surveyor's Ink display them. The boss is shown on the map from the start of the act.
- **Encounter pools**: the first 3 normal fights of Act 1 (2 in Acts 2–3) use the `easy` pool. No repeat of the last 2 encounters.

### 4.10 Bosses and act transitions
- **Boss rewards** (acts 1–2): gold, a 3-rare card reward (skip = +1 Shard), then the **boss relic screen**: 3 boss relics not owned, from the class + any pool. Choose 1 or skip for +2 Shards **[ask: `skip_boss_relic` action]**.
- **Act transition**: heal 75% of **missing** HP `[actHealMissingPct]` after the act 1 and act 2 bosses. Act 3 boss → victory.

### 4.11 Ascent Pact (run start; our start boon)
At run start the engine offers **3 pacts**: **1 from the safe list and 2 from the trade list** (`reward` stream, no duplicates). Choose exactly one. (Engine: these are `StartBoonDef`s.)

| id | List | Text | Effects |
|---|---|---|---|
| `pact_hardy` | safe | Gain 8 Max HP. | `max_hp 8` (heals 8) |
| `pact_shards` | safe | Start with 2 Shards. | `shards 2` |
| `pact_purse` | safe | Gain 100 gold. | `gold 100` |
| `pact_blood_rare` | trade | Lose 7 Max HP. Choose 1 of 3 rare cards from your class. | `max_hp −7`; `offer_cards {pool: class, rarity: rare, n: 3, pick: 1}` |
| `pact_hunted` | trade | Gain a random uncommon relic. The first elite you fight is Hunted (+25% Max HP; its hits deal +2 damage). | `gain_relic {rarity: uncommon}`; run flag `hunted_pending` → `elite_hunted` on spawn of the first elite **[ask: `onEnemySpawn` run hook]** |
| `pact_lean_start` | trade | Remove 2 cards from your deck. Lose all your gold. | `remove_card {n: 2, choose}`; `gold −all` |
| `pact_reforged` | trade | Transmute a card into an **uncommon** (choose 1 of 2) and upgrade it. Add a Seized Joint to your deck. | `transmute {choose, offers: 2, rarity: 'uncommon', upgrade: true}`; `add_card curse_seized_joint deck` |
| `pact_wanderer` | trade | Choose 1 of 3 colourless cards (uncommon or rare). Your next 3 card rewards offer 2 cards instead of 3. | `offer_cards {pool: colorless, n: 3, pick: 1}`; run counter `lean_rewards = 3` |

### 4.12 Ascent levels (later feature; levers defined now)
These are cumulative, and each level changes **exactly one lever** (commandment 20). Ids are stored in `RunState.ascent` (0–10) **[ask]**.

| Level | id | Lever |
|---|---|---|
| 1 | `asc_elite_surge` | Elite map weight ×1.6. |
| 2 | `asc_sharp_foes` | Normal-encounter enemies deal +10% per hit (round up; min +1). |
| 3 | `asc_lean_purse` | All gold gains −25% (round down). |
| 4 | `asc_tight_belt` | −1 potion slot. |
| 5 | `asc_burden` | Start with `curse_burden`. |
| 6 | `asc_weary` | Act transition heals 50% of missing HP (from 75%). |
| 7 | `asc_scarcity` | Rare chance and upgraded-offer chance halved in card rewards. |
| 8 | `asc_tough_foes` | All enemies +10% Max HP (round up). |
| 9 | `asc_deadly_foes` | Elite and boss enemies deal +10% per hit (round up; min +1). |
| 10 | `asc_twin_crown` | Act 3 ends with two bosses in a row (the second at full HP; no rest between). |

---
## 5. Relics (72)

Distribution: starter 3 · common 18 · uncommon 18 · rare 12 · boss 12 · shop 5 · event 4. Pure stat sticks (marked **stat**): 4. Relic drop pools exclude relics of other classes and relics marked "not chronist" for the Chronist. Starter relics cannot be lost. Hooks in *italics* are **[ask]** items (§9). Every relic was checked against STS1's 180 relics and STS2's known relics: a relic that only renames an STS trigger and effect pair was cut.

### 5.1 Starter (3)

| id | Name | Class | Text | Hook sketch | Tags | Designer note |
|---|---|---|---|---|---|---|
| `riven_gauntlet` | Riven Gauntlet | breaker | Whenever one of your Riposte effects triggers, gain 1 Onslaught and 3 Guard. | *onRiposteTriggered* → `status onslaught +1`; `guard 3` | riposte, onslaught, guard | Holding Shoulder Check now also starts your next turn at Onslaught 1, and the Guard soaks the hit it parried. All three Breaker mechanics in one line. |
| `heartseed` | Heartseed | graft | At the start of each combat, put the Bloom card in your draw pile with the most Bloom into your hand (it counts toward your opening 5; ties: random). | onCombatStart → *fetch_card {from: draw, select: max_bloom, countsAsDraw: true}* | bloom, consistency | Your best-grown copy is always there to receive Prune, so "which copy do I invest in" becomes a run plan. |
| `chrono_lens` | Chrono Lens | chronist | The first card you play on the beat each turn also draws 1 card. | onCardPlayed: if *on_beat* and `counters.lens == 0` → `draw 1`; set flag | cadence, draw | Makes beat 6 reachable with a starter deck; rewards cheap cards. |

### 5.2 Common (18)

| id | Name | Class | Text | Hook sketch | Tags | Designer note |
|---|---|---|---|---|---|---|
| `glass_spurs` | Glass Spurs | any | The first time one card play hits the same enemy 3 times, apply 1 Exposed to it. | onDamageDealt: count hits per (card uid, target) in `counters`; at 3 → `status exposed 1` | exposed, multihit | Multi-hit commons beat single big hits on the reward screen. |
| `dampener_coil` | Dampener Coil | any | Whenever an enemy finishes an attack on you and you lost no HP from it, apply 1 Stagger to it. | *onEnemyMoveEnd {uid, hpLostThisMove}* → `status stagger 1` | stagger, block | Full-block turns are rewarded over chip-tanking. |
| `cracked_prism` | Cracked Prism | any | Whenever you gain a Shard, gain 15 gold. | *onShardGain* → `gold 15 × amount` | shards, economy | Gives every skip a gold floor, which tips marginal-common skips. |
| `geode_heart` | Geode Heart | any | At the start of each combat, gain 1 Block per Shard you hold (max 10). | onCombatStart → `block {scale: fn shards}` | shards, block | Holding Shards becomes a small defensive stance against spending them. |
| `bulwark_rivets` | Bulwark Rivets | any | Whenever you gain Guard, gain 1 more. | *guardFlat* modifier → +1 | guard | **stat** |
| `stim_patch` | Stim Patch | any | Whenever you use a potion, gain 4 Guard. | *onPotionUsed* → `guard 4` | potion, guard | **stat** |
| `scrap_magnet` | Scrap Magnet | any | Whenever a Status card is put into your hand, gain 3 Guard. | onCardDrawn and *onCardToHand* (type status) → `guard 3` | status, guard | Act 2 status spam hurts less; Jitter becomes fodder. |
| `surveyor_ink` | Surveyor's Ink | any | Elite nodes on the map show which elite they hold. Elites drop 15 more gold. | renderer reads `MapNode.encounterId`; onCombatEnd (elite) → `gold 15` | map, economy | Path choice by matchup, not by count. |
| `field_dressing` | Field Dressing | any | After you win an elite or boss combat, heal 8 HP. | onCombatEnd (won, elite or boss) → `heal 8` | heal | **stat** |
| `tally_stick` | Tally Stick | any | Whenever you skip a card reward, your next card reward offers 4 cards. | *onRewardSkipped* → run counter `wide_rewards = 1` | shards, rewards | Skipping now also improves the next screen. |
| `notched_buckler` | Notched Buckler | breaker | At the end of your turn, if you have a primed card, gain 4 Guard. | *onPrimed* (after prime step, if `primed.length > 0`) → `guard 4` | riposte, guard | Holding becomes defensive even when the enemy doesn't attack. |
| `chain_wraps` | Chain Wraps | breaker | At the end of your turn, gain Guard equal to half your Onslaught (round down). | onTurnEnd (before decay) → `guard {fn: floor(onslaught / 2)}` | onslaught, guard | All-Attack turns are no longer defenceless. |
| `seed_pouch` | Seed Pouch | graft | Bloom cards you take from card rewards start with 2 Bloom. | *onCardAdded {source: reward}* (bloom keyword) → `vars.bloom = 2` | bloom, rewards | Bloom cards rise in the reward ranking. |
| `pollen_sac` | Pollen Sac | graft | Whenever a card gains Bloom, apply 1 Rot to a random enemy. | *onBloomGained* → `status random_enemy rot 1` | bloom, rot | Bridges the growth and Rot archetypes. |
| `compost_heap` | Compost Heap | graft | The first time you Prune each combat, draw 2 cards. | *onPrune* (counter == 1) → `draw 2` | prune, draw | Makes early Prune a tempo play, not just an investment. |
| `tuning_fork` | Tuning Fork | chronist | At the end of your turn, if you played exactly 3, 6 or 9 cards this turn, gain 5 Block. | onTurnEnd: beat count ∈ beats → `block 5` | cadence, block | Stopping on a beat is worth as much as one more card. |
| `sandglass_bead` | Sandglass Bead | chronist | The first card you put on the Timeline each combat resolves 1 turn sooner (it still waits at least until your next turn). | *onTimelineAdd* → `dueTurn = max(turn + 1, dueTurn − 1)` | delay | Delay 2 openers become Delay 1. |
| `star_pip` | Star Pip | chronist | At the start of your turn, gain 3 Block for each enemy whose next two intents are both attacks. | onTurnStart: count enemies with intent and forecast[0] attacking → `block 3 × n` | augury, block | Augury pays a defensive dividend against aggressive packs. |

Common pool: any 10 · breaker 2 · graft 3 · chronist 3 = 18.

### 5.3 Uncommon (18)

| id | Name | Class | Text | Hook sketch | Tags | Designer note |
|---|---|---|---|---|---|---|
| `parry_charm` | Parry Charm | breaker | You can prime 1 additional Riposte card. | onCombatStart → `status riposte_capacity 1` | riposte | Picking a second Riposte card becomes correct. |
| `kept_fury` | Kept Fury | breaker | At the end of your turn, keep up to 2 Onslaught. | onCombatStart → `status onslaught_keep 2` | onslaught | Lets you weave a Skill turn without losing the swing. |
| `crowd_breaker` | Crowd Breaker | breaker | Whenever one of your Attacks hits 2 or more enemies, gain 1 Onslaught. | afterCardPlayed: distinct targets hit ≥ 2 → `status onslaught 1` | onslaught, aoe | AoE Attacks join the Onslaught plan. |
| `concussion_rig` | Concussion Rig | any | Whenever an enemy with Stagger hits you, gain 1 Guard. | onDamageTaken: source has stagger → `guard 1` | stagger, guard | Stagger against multi-hit becomes defence twice over. |
| `slow_temper` | Slow-Temper Alloy | any | At the start of your turn, your Guard loses a third (round down) instead of half. | *guardDecay* modifier → `floor(g / 3)` lost | guard | The Guard-bank plan doubles its horizon. |
| `pocket_star_chart` | Pocket Star Chart | any (not chronist) | In elite and boss combats, you have Augury. | onCombatStart (elite or boss) → `status augury` | augury | Lets non-Chronists plan for big hits. |
| `overwatch_drone` | Overwatch Drone | any | The first time an enemy attacks you each combat, deal 8 damage to it before its attack. | *onEnemyAttackDeclared* (once) → `damage 8` to attacker | riposte, damage | A Riposte taste for every class; can kill weak openers. |
| `shard_lens` | Shard Loupe | any | Purge costs 1 Shard instead of 2. | rest option cost modifier | shards | Doubles removal throughput from skips. |
| `crystal_spine` | Crystal Spine | any | Your first Transmute each act costs no Shards. | rest option cost modifier + act counter | shards, transmute | Starter-swap value without skipping. |
| `hairline_saw` | Hairline Saw | any | When an enemy with Exposed dies, apply its Exposed to the living enemy with the lowest HP. | *onDeath info carries statuses* → `status exposed n` | exposed | Exposed stacks carry across a pack. |
| `wayfinder_needle` | Wayfinder Needle | any | At the start of each act, a random `?` node in rows 1–7 becomes a Treasure node. | *onActStart* → mutate the map (`map` stream) | map, relic | An extra early relic on any path that has a `?`. |
| `rot_censer` | Rot Censer | graft | When an enemy with Rot dies, all of its Rot spreads instead of half. | rot spread reads relic flag | rot | Pack fights become Rot chains. |
| `grafting_knife` | Grafting Knife | graft | When you Prune a Status or Curse, the Bloom card gains 1 more Bloom. | *modifyPruneBloom* (+1 if scrapped type ∈ {status, curse}) | prune, bloom, status | Statuses and curses become fertiliser. |
| `heartwood_ring` | Heartwood Ring | graft | At the start of each combat, the Bloom card in your deck with the least Bloom gains 1 Bloom (ties: random). | onCombatStart → *bloom {target: min_in_deck, amount: 1}* | bloom | Feeds the wide deck-count plan rather than one hyper card. |
| `mycelial_net` | Mycelial Net | graft | Rot on enemies can reach 20. | *modifyStatusCap (rot, 20)* | rot | Raises the late-fight ceiling of the Rot clock. |
| `offbeat_drum` | Offbeat Drum | chronist | On-beat effects of 0-cost cards trigger twice. | *on_beat* wrapper reads relic → repeat 2 if card cost 0 | cadence | Cheap cards become beat payoffs. |
| `timeline_spool` | Timeline Spool | chronist | Whenever a card on your Timeline resolves, deal 3 damage to the enemy with the lowest HP. | *onDelayResolved* → `damage 3` (lowest HP) | delay, damage | Many small Delay cards beat one big one. |
| `seers_veil` | Seer's Veil | chronist | At the start of your turn, if any enemy's intent after next is not an attack, draw 1 card. | onTurnStart: any forecast[0] not attack → `draw 1` | augury, draw | Rewards reading the forecast for safe windows. |

### 5.4 Rare (12)

| id | Name | Class | Text | Hook sketch | Tags | Designer note |
|---|---|---|---|---|---|---|
| `duelists_oath` | Duelist's Oath | breaker | Each primed card can trigger its Riposte twice (on two different enemy attacks) before it is discarded. | prime-entry `charges = 2` | riposte | Pack fights become a Riposte feast. |
| `stormbreak_gem` | Stormbreak Gem | breaker | The first time your Onslaught reaches 6 in a turn, gain 1 energy and draw 2 cards. | onStatusApplied (onslaught ≥ 6, once per turn) → `energy 1`, `draw 2` | onslaught | A payoff for 0-cost Attack density; capped by `cap_bonus_energy`. |
| `bastion_core` | Bastion Core | breaker | At the start of your turn, the Guard you lose to halving is dealt as damage to a random enemy. | *onGuardDecay {lost}* → `damage lost` to random_enemy | guard, damage | The Guard bank becomes a weapon; it counts as a hit, so Exposed applies. |
| `elder_seed` | Elder Seed | graft | Your Bloom cards can grow to 15 Bloom. | *bloomCap 15* | bloom | Raises the hyper-growth ceiling. |
| `hollow_bough` | Hollow Bough | graft | Once per combat, when you Prune, you may make it Prune away instead. | *onPrune* choice (options: keep / remove from deck) | prune, removal | In-combat permanent thinning. |
| `plague_bloom` | Plague Bloom | graft | Whenever you apply Rot to an enemy, every other enemy gains half that much Rot (round down). | onStatusApplied (rot, source player) → others `rot floor(n / 2)` (no recursion) | rot, aoe | Rot answers packs. |
| `metronome_heart` | Metronome Heart | chronist | The 12th card you play each turn is also on the beat. | *beatPositions* modifier → [3, 6, 9, 12] | cadence | A fourth beat for long chains (cap 4). |
| `prophet_glass` | Prophet Glass | chronist | You see each enemy's next 3 intents. | forecast depth 3 | augury | Delay 3 cards become aimable. |
| `paradox_coil` | Paradox Coil | chronist | Once per turn, when a card on your Timeline resolves, you may put it back on the Timeline with Delay 2. Each card can return only once per combat. | *onDelayResolved* choice → re-add (exempt from `cap_relay` only by this rule) | delay | Repeats a big Delay card once; bounded. |
| `shard_crucible` | Shard Crucible | any | At Rest sites, Purge and Transmute no longer use up your rest action (once each per visit; Shards still paid). | RestState allows Purge and Transmute in addition to the main action | shards, rest | Turns Shard hoarding into big rest-site turns. |
| `fracture_engine` | Fracture Engine | any | Exposed on enemies adds 2 damage per stack to your hits instead of 1. | pipeline step 4 reads relic | exposed | Makes Exposed a build-around. |
| `void_compass` | Void Compass | any | Elite card rewards offer one common, one uncommon and one rare card. | reward generation override for elites | rewards | A rare from every elite, at the cost of choice depth. |

### 5.5 Boss (12) — chosen 1 of 3 after the act 1 and act 2 bosses; each has a real drawback

| id | Name | Class | Text | Hook sketch | Tags | Designer note |
|---|---|---|---|---|---|---|
| `binding_contract` | Binding Contract | any | +1 energy each turn. You must take a card from every card reward (no skipping, no Shards from skipping). | maxEnergy +1; reward `skip` not legal | energy, shards | Ends lean-deck play; every reward becomes "least bad card". |
| `cracked_hourglass` | Cracked Hourglass | any | +1 energy each turn. In every combat, enemies take a full turn before your first turn. | maxEnergy +1; combat start enqueues an enemy phase first | energy | Your opening is always on the back foot; Guard and Riposte from a prior turn don't exist yet. |
| `exposed_core` | Exposed Core | any | +1 energy each turn. Start each combat with 4 Exposed. | onCombatStart → `status self exposed 4` | energy, exposed | Punishes multi-hit early turns; wants turn-1 defence. |
| `stasis_engine` | Stasis Engine | any | +1 energy each turn. Draw 1 fewer card each turn. | maxEnergy +1; drawPerTurn −1 | energy, draw | Wants expensive, dense cards. |
| `ghost_lantern` | Ghost Lantern | any | +1 energy each turn. Enemies start each combat with 10 Guard. | onEnemySpawn → `guard 10` | energy, guard | Taxes burst openers; Rot ignores it. |
| `tender_plating` | Tender Plating | any | +1 energy each turn. Whenever you lose HP from an enemy hit, lose 1 more. | onHpLost (source enemy hit) → `lose_hp 1` | energy | Multi-hit enemies get much scarier; Stagger and Block value up. |
| `fixed_star` | Fixed Star | chronist | +1 energy each turn. Only the 3rd card you play each turn is on the beat. | *beatPositions* → [3] | energy, cadence | Rebuilds the deck around one huge beat per turn. |
| `heavy_heart` | Heavy Heart | breaker | Your Onslaught halves (round down) at the end of your turn instead of resetting. You can't prime Riposte cards. | Onslaught `decayBy: half`; prime capacity → 0 | onslaught, riposte | Pure-swing Breaker; gives up the duellist. |
| `wild_growth` | Wild Growth | graft | Prune grants 1 additional Bloom. At the start of each combat, shuffle 2 Tangles into your draw pile. | *modifyPruneBloom* +1; onCombatStart → `add_card status_tangle draw ×2` | prune, bloom, status | Faster growth; the Tangles are both clog and Prune fodder. |
| `ascendant_prism` | Ascendant Prism | any | When you pick this up, gain 4 Shards. You no longer gain Shards from skipping card rewards. | onPickup → `shards 4`; skip yields 0 | shards | Cash now, discipline later. |
| `gravity_loom` | Gravity Loom | any | Draw 2 more cards each turn. Your hand limit is 7. | drawPerTurn +2; handLimit 7 | draw | Big hands but no room to Keep, hold or generate. |
| `star_atlas` | Star Atlas | any (not chronist) | You have Augury. Enemies have 10% more Max HP (round up). | onCombatStart → `augury`; *onEnemySpawn* → maxHp ×1.1 | augury | Information for longer fights. |

### 5.6 Shop (5)

| id | Name | Class | Text | Hook sketch | Tags | Designer note |
|---|---|---|---|---|---|---|
| `shard_writ` | Shard Writ | any | At shops, removing a card with a Shard costs no gold and doesn't use up the shop's removal service. | shop removal rules | shards, removal | Two removals per shop. |
| `vial_rack` | Vial Rack | any | +1 potion slot. Potions in shops cost 25% less. | `potion_slots 1`; price modifier | potion | **stat** |
| `practice_dummy` | Practice Dummy | breaker | At the start of each combat, a random Riposte card from your draw pile starts primed. | onCombatStart → move to primed rack | riposte | A free parry on enemy turn 1. |
| `nursery_tray` | Nursery Tray | graft | Whenever you Smith a Bloom card, it also gains 2 Bloom. | onRest (smith target bloom) → `vars.bloom += 2` | bloom, rest | Smith versus Rest tilts toward Smith. |
| `timeline_clamp` | Timeline Clamp | chronist | Damage and Block from cards resolving on your Timeline are increased by 25% (round down). | damageDealtMult 125 for tag `delayed`; *blockMult with source info* | delay | Delay becomes the main plan. |

### 5.7 Event (4) — only from events

| id | Name | Class | Text | Hook sketch | Tags | Source |
|---|---|---|---|---|---|---|
| `oracle_pebble` | Oracle Pebble | any (not chronist) | You have Augury in your next 3 combats. | counter 3; onCombatStart → `augury`, counter −1 | augury | `ev_oracle_terminal` |
| `engine_tooth` | Engine Tooth | any | Your first Attack each combat applies 2 Stagger to each enemy it hits. | onDamageDealt (first attack card, per target) → `stagger 2` | stagger | `ev_engine_cult` |
| `shard_debt` | Shard Debt | any | When you pick this up, gain 3 Shards. Your next 3 card rewards offer 2 cards. | onPickup → `shards 3`, `lean_rewards 3` | shards | `ev_singing_geode` |
| `crown_fragment` | Crown Fragment | any | Whenever you win a combat by the end of your 3rd turn, gain 1 Shard. | onCombatEnd (won, turn ≤ 3) → `shards 1` | shards | `ev_crown_vault` |

Mechanic coverage check: Shards 12 relics; Riposte 7; Bloom 7; Rot 5; Cadence 5; Delay 5; Augury 7; Guard 9; Exposed 4; Stagger 4; Prune 4; Onslaught 5; economy/map 6.

---
## 6. Events (22)

Notation: effects in DSL-ish form; **[ask]** primitives are in §9 (`shards`, `offer_cards`, `start_combat`, `gamble`, `transmute`, `duplicate_card`, `lose_potion`, `lose_relic`, `run_flag`). A condition in brackets disables the option and shows the reason. **Event combats** use encounter ids `enc_event_*`. Their composition is owned by `ENEMIES.md`, at the strength given here, and they pay the "event combat" rewards (§4.2/§4.4) plus the listed extra. Gambles roll on the `event` stream **when the option is chosen**, and their odds are printed on the button.

### Act 1 — The Verdant Decks

**`ev_spore_choir` — Spore Choir** (combat event)
*In a flooded hydroponics bay, a ring of glowing fungal bells hums in unison. Something large sleeps beneath the chorus. The air tastes of copper and sugar.*

| Option | Outcome |
|---|---|
| Silence them | `start_combat enc_event_spore_choir` (2 Act-1 normal enemies, +20% HP). Win: event rewards + `gain_relic {rarity: common}`. |
| Harvest a bell | `lose_hp 6`; `gain_potion` |
| Tiptoe past | nothing |

Question: is my deck strong enough to take an extra fight for a relic?

**`ev_drowned_shrine` — Drowned Shrine** (removal for a cost)
*A maintenance shrine half-sunk in luminous water. Rusted tools ring the altar as offerings. The attendant drone still blinks, waiting.*

| Option | Outcome |
|---|---|
| Offer blood | `lose_hp 10`; `remove_card {choose, n: 1}` |
| Offer coin [gold ≥ 50] | `gold −50`; `remove_card {choose, n: 1}` |
| Pray | `heal 8` |

Question: right now, which matters most: HP, gold or deck quality?

**`ev_flickering_medpod` — Flickering Med-Pod** (seeded gamble)
*An emergency med-pod flickers between green and red. Its screen offers two cycles in cheerful, broken text.*

| Option | Outcome |
|---|---|
| Full cycle (65% / 35%) | `gamble [{65: heal to full}, {35: max_hp −6}]` |
| Quick cycle | `heal 12` |
| Leave | nothing |

Question: how much Max HP will I risk for a full heal?

**`ev_hydroponic_bay` — Hydroponic Bay** (upgrade / transform)
*Grafted fruit hangs in rows under failing lamps. A splicing arm twitches, still loaded with samples from a hundred species.*

| Option | Outcome |
|---|---|
| Cultivate | `upgrade {where: deck, random, n: 2}` |
| Splice | `transmute {choose, offers: 2}` (free) |
| Feed the grafts [graft; has a Bloom card] | `lose_hp 8`; `bloom {target: choose_deck, amount: 3}` |

Question: improve two random cards, or fix my worst card?

**`ev_scavenger_drone` — Wounded Scavenger Drone**
*A six-legged salvage drone lies on its back, legs still cycling. Its cargo pod is dented but sealed.*

| Option | Outcome |
|---|---|
| Repair it [gold ≥ 30] | `gold −30`; `gain_potion`; `shards 1` |
| Strip it | `gain_relic {rarity: common}`; `add_card curse_static_ghost deck` |
| Leave | nothing |

Question: is a relic now worth a curse for the rest of the run?

**`ev_singing_geode` — Singing Geode** (Shards)
*A crystal the size of a shuttle grows up through the deck plating. It rings faintly when you breathe near it.*

| Option | Outcome |
|---|---|
| Chip it | `lose_hp 7`; `shards 2` |
| Attune [Shards ≥ 2] | `shards −2`; `upgrade {where: deck, choose, n: 2}` |
| Take the heart | `gain_relic shard_debt` |

Question: Shards now (future removal) or upgrades now, and how lean do I need to be?

### Act 2 — The Foundry

**`ev_assembly_line` — The Assembly Line** (3 colourless cards)
*A conveyor still running after a century, stamping out the same three tools over and over for nobody.*

| Option | Outcome |
|---|---|
| Take one | `offer_cards {pool: colorless, n: 3, pick: 1}` (each 70% uncommon / 30% rare) |
| Take all three | add all 3 shown cards to your deck; `add_card curse_seized_joint deck` |
| Leave | nothing |

Question: the colourless glue I'm missing, or no dilution at all?

**`ev_engine_cult` — Cult of the Engine** (combat event)
*Robed figures chant to a turbine that hasn't turned in decades. They welcome you warmly. Their hands are oil-black to the elbow.*

| Option | Outcome |
|---|---|
| Join the litany | `max_hp −6`; `gain_relic engine_tooth` |
| Smash the idol | `start_combat enc_event_engine_cult` (3 cultists, Act-2 normal strength). Win: event rewards + `gain_relic {rarity: uncommon}`. |
| Leave | nothing |

Question: pay with Max HP, or with the risk of a fight?

**`ev_smelter` — The Smelter**
*A furnace that accepts any offering. Behind the grate, something that was once a smith keeps working.*

| Option | Outcome |
|---|---|
| Melt a card | `remove_card {choose, n: 1}`; `lose_hp 8` |
| Temper [gold ≥ 60] | `gold −60`; `upgrade {where: deck, choose, n: 2}` |
| Leave | nothing |

Question: is my deck held back by a bad card or by unupgraded good ones?

**`ev_oracle_terminal` — Oracle Terminal** (Augury trade)
*A predictive-maintenance terminal, still forecasting failures for machines long dead. It turns its lens on you and starts predicting.*

| Option | Outcome |
|---|---|
| Jack in [not chronist] | `lose_hp 6`; `gain_relic oracle_pebble` |
| Single forecast [not chronist; gold ≥ 40] | `gold −40`; `run_flag augury_combats += 1` (Augury in your next combat) |
| Recalibrate [chronist] | `lose_hp 5`; `upgrade {where: deck, choose, n: 1, filter: delay or on_beat}` |
| Leave | nothing |

Question: is seeing a second intent worth HP for my deck (does it have answers to time)?

**`ev_rigged_conveyor` — Rigged Conveyor** (seeded gamble)
*A prize dispenser welded into the conveyor line. Its odds are painted on the side in honest, faded numerals.*

| Option | Outcome |
|---|---|
| Pull the lever [gold ≥ 30] | `gold −30`; `gamble [{35: gain_relic uncommon}, {40: gold +60}, {25: add_card curse_debt_mark deck}]`. The event stays open for one more pull at 50 gold. |
| Leave | nothing |

Question: is a 35% relic worth a 25% curse?

**`ev_salvage_heap` — Salvage Heap**
*Mountains of machine carcasses. Somewhere in here is something worth keeping.*

| Option | Outcome |
|---|---|
| Haul the heavy scrap | `gold +90`; `add_card curse_guilt deck` |
| Pick carefully | `gold +35` |
| Search for parts | `lose_hp 5`; `gain_potion` ×2 |

Question: gold for the next shop, against a permanent dead draw.

### Act 3 — The Crown

**`ev_your_echo` — Your Own Echo** (combat event)
*A figure of starlight wearing your face steps out of the observatory glass. It moves as you move, a heartbeat early.*

| Option | Outcome |
|---|---|
| Duel it | `start_combat enc_event_echo` (one Act-3 enemy at 70% elite strength). Win: event rewards + `upgrade {where: deck, random, n: 3}`. |
| Reach out | `max_hp −8`; `duplicate_card {choose}` (a copy of a Bloom card starts at 0 Bloom) |
| Look away | nothing |

Question: what is my best card, and do I want two of it?

**`ev_void_lens` — The Void Lens**
*A telescope pointed at nothing. When you look through it, nothing looks back, and it already knows your next three heartbeats.*

| Option | Outcome |
|---|---|
| Gaze [not chronist] | `max_hp −5`; `run_flag augury_rest_of_act` |
| Gaze deeper [chronist] | `max_hp −5`; `run_flag forecast_depth_3_rest_of_act` |
| Pry out the lens | `gold +60` |
| Leave | nothing |

Question: does information win the next boss for me?

**`ev_tether_merchant` — Tether Merchant** (Shards)
*A courier rides the tether cable up and down forever, trading in crystal and favours.*

| Option | Outcome |
|---|---|
| Sell Shards [Shards ≥ 1] | choose 1..all Shards: `shards −n`; `gold +45 × n` |
| Buy Shards [gold ≥ 70] | `gold −70` per Shard, up to 2 |
| Trade a relic [has a non-starter relic] | `lose_relic {choose, not starter}`; `shards 3` |
| Leave | nothing |

Question: late in the run, are Shards still worth more than gold?

**`ev_crown_vault` — Sealed Vault**
*A vault door marked with the Spire builders' crest. The seal is warm, and it hums your name.*

| Option | Outcome |
|---|---|
| Break the seal | `gain_relic {rarity: rare}`; `add_card curse_vacuum_chill deck` |
| Take the fragment | `gain_relic crown_fragment` |
| Leave | nothing |

Question: a rare relic now, or a reward for winning fast?

**`ev_prism_garden` — Prism Garden** (transform + upgrade)
*Crystal flowers split the light of a dead sun into every colour the palette allows.*

| Option | Outcome |
|---|---|
| Refract | `lose_hp 12`; `transmute {choose, offers: 2, n: up to 3, upgrade: true}` |
| Bask | `heal 20` |

Question: how many of my cards would I swap, and at what HP?

**`ev_immune_scan` — Immune Scan** (combat event)
*The Spire's own defences finally notice you. A white lattice of light sweeps the corridor, cataloguing everything that doesn't belong.*

| Option | Outcome |
|---|---|
| Submit | remove all curses except Burden from your deck; `lose_hp 15` |
| Resist | `start_combat enc_event_antibodies` (Act-3 normal strength). Win: event rewards + `shards 1`. |
| Hide [gold ≥ 25] | `gold −25` |

Question: are my curses costing more than 15 HP?

### Any act

**`ev_wandering_artificer` — Wandering Artificer**
*A tinkerer with a cart of glowing tools, climbing the Spire one floor a year.*

| Option | Outcome |
|---|---|
| Tune | `upgrade {where: deck, choose, n: 1}` |
| Overhaul [Shards ≥ 1] | `shards −1`; `upgrade {where: deck, choose, n: 3}` |
| Leave | nothing |

**`ev_lost_climber` — Lost Climber**
*Another climber, out of supplies and luck, sits beside a dead terminal.*

| Option | Outcome |
|---|---|
| Share a potion [has a potion] | `lose_potion {choose}`; `shards 1`; `gold +25` |
| Give coin [gold ≥ 40] | `gold −40`; `gain_relic {rarity: common}` |
| Rob them | `gold +60`; `add_card curse_guilt deck` |

**`ev_memory_pool` — Memory Pool** (removal for a cost)
*A pool of silver data-fluid. Your reflection in it is missing a few things.*

| Option | Outcome |
|---|---|
| Forget | `max_hp −5`; `remove_card {choose, n: 2}` |
| Remember | `offer_cards {pool: class, rarity: uncommon, n: 3, pick: 1}` |
| Leave | nothing |

**`ev_quiet_bench` — A Quiet Bench**
*A bench facing a window. The view is the whole world you're leaving.*

| Option | Outcome |
|---|---|
| Sit | `heal 25% Max HP` |
| Whittle | `transmute {choose, offers: 2}` (free) |

---

## 7. Potions, status cards, curses

### 7.1 Potions (16) — combat-only unless marked "anywhere"

| id | Name | Rarity | Class | Target | Effect |
|---|---|---|---|---|---|
| `pot_flare_cell` | Flare Cell | common | any | enemy | Deal 20 damage. |
| `pot_shield_gel` | Shield Gel | common | any | none | Gain 12 Block. |
| `pot_bastion_tonic` | Bastion Tonic | common | any | none | Gain 10 Guard. |
| `pot_quicksilver` | Quicksilver | common | any | none | Draw 3 cards. |
| `pot_charge_cell` | Charge Cell | common | any | none | Gain 2 energy (counts toward `cap_bonus_energy`). |
| `pot_fault_dust` | Fault Dust | common | any | none | Apply 3 Exposed to ALL enemies. |
| `pot_concussion_gas` | Concussion Gas | common | any | none | Apply 3 Stagger to ALL enemies. |
| `pot_shard_tincture` | Shard Tincture | common | any | none | Gain 1 Shard. (anywhere) |
| `pot_blight_vial` | Blight Vial | uncommon | any | enemy | Apply 6 Rot. |
| `pot_seers_draught` | Seer's Draught | uncommon | any | none | Gain Augury this combat. Draw 2 cards. |
| `pot_fury_draught` | Fury Draught | uncommon | breaker | none | Gain 4 Onslaught. |
| `pot_growth_sap` | Growth Sap | uncommon | graft | none | Choose a Bloom card in your hand; it gains 2 Bloom (permanent). |
| `pot_tempo_draught` | Tempo Draught | uncommon | chronist | none | Advance the beat by 1 (`beatOffset +1`; your next card is one step later in the count). |
| `pot_mending_ampoule` | Mending Ampoule | rare | any | none | Heal 25% of Max HP. (anywhere) |
| `pot_rewind_phial` | Rewind Phial | rare | any | none | Put up to 3 cards from your discard pile into your hand; they cost 0 this turn (counts toward `cap_to_hand`). |
| `pot_halt_ampoule` | Halt Ampoule | rare | any | enemy | That enemy skips its next move (its intent becomes Sleep; its forecast shifts one move later). |

### 7.2 Status cards (4) — combat-only, created by enemies or effects

| id | Name | Cost | Text | Mechanic it touches | C19 |
|---|---|---|---|---|---|
| `status_jitter` | Jitter | 0 | Scrap. The next card you play this turn costs 1 more. | Cadence: playing it counts as a play, so the Chronist can turn it into beat progress at a tax. | Slimed/Dazed are energy or turn sinks with no choice. Jitter is free to clear but taxes your next card, so whether and when to play it is a sequencing choice. |
| `status_backlash` | Backlash | — (Unplayable) | If this is in your hand at the end of your turn, it is primed (uses no Riposte capacity). The next enemy hit on you before your next turn deals +4 damage. Then Scrap this. | Riposte rack and Guard. A Prune/Scrap target. | No STS status acts during the enemy turn. |
| `status_tangle` | Tangle | — (Unplayable) | While this is in your hand, the cards directly left and right of it cost 1 more. | Hand order (the spatial axis); Prune fodder. | No STS status affects neighbouring cards. |
| `status_drift` | Drift | 1 | Scrap. If this is in your hand at the end of your turn, you have 1 less energy next turn (then Scrap it). | Tempo: pay 1 now or 1 later. | Void drains energy on draw with no choice; Drift makes clearing it a timing choice. |

Hand order rule (needed by Tangle): drawn and created cards are appended to the right end of the hand. The player cannot reorder. The renderer always shows true order.

### 7.3 Curses (8) — permanent deck cards, always from a choice (events, pacts, Ascent)

| id | Name | Cost | Text | Source |
|---|---|---|---|---|
| `curse_burden` | Burden | — | Unplayable. Only Purge (rest site) can remove Burden; shops, events and Prune away can't. It can't be Transmuted. | `asc_burden` |
| `curse_seized_joint` | Seized Joint | — | Unplayable. While this is in your hand, the first card you play each turn costs 1 more. | `pact_reforged`, `ev_assembly_line` |
| `curse_static_ghost` | Static Ghost | — | Unplayable. When you draw this, add a Jitter to your hand. | `ev_scavenger_drone` |
| `curse_guilt` | Guilt | 2 | Scrap. (Does nothing.) | `ev_salvage_heap`, `ev_lost_climber` |
| `curse_vacuum_chill` | Vacuum Chill | — | Unplayable. Keep. While this is in your hand, you draw 1 fewer card at the start of your turn. | `ev_crown_vault` |
| `curse_debt_mark` | Debt Mark | — | Unplayable. When you draw this, lose 5 gold. | `ev_rigged_conveyor` |
| `curse_hollow_echo` | Hollow Echo | — | Unplayable. When you draw this, the enemy with the lowest HP gains 4 Guard. | reserved for `ENEMIES.md` / future events |
| `curse_parasite_vine` | Parasite Vine | — | Unplayable. When you draw this, lose 2 HP and draw 1 card. | reserved for `ENEMIES.md` / future events |

None of these copies an STS curse's trigger and effect pair. Pain (HP per card played), Normality (3-card cap), Regret/Decay/Doubt/Shame (end-of-turn penalties), Writhe/Pride (Innate/copying) and Necronomicurse (returns) were all avoided. All curses can be Scrapped by Prune (a Graft upside). Burden is the only one with removal limits.

---
## 8. Balance model

All values are A0 targets for the simulator to confirm (commandment 23). "Competent deck" means about 2 good picks per act per archetype, 2–3 removals by Act 3 and 4–6 upgrades.

### 8.1 Enemy targets per act (follows research §2.9; `ENEMIES.md` must land inside these bands)

| Encounter | Act 1 total HP | Act 1 dmg/turn | Act 2 total HP | Act 2 dmg/turn | Act 3 total HP | Act 3 dmg/turn |
|---|---|---|---|---|---|---|
| Weak (easy pool) | 20–35 | 5–8 | 50–75 | 10–14 | 90–120 | 16–22 |
| Normal | 40–60 | 8–13 | 90–140 | 14–22 | 140–200 | 20–30 |
| Elite | 80–120 | 14–20 (peak 25) | 140–180 (+adds) | 22–30 | 200–280 | 28–38 |
| Boss | 200–260 | avg 18, peak 32–36 | 300–420 | avg 26, peak 45 | 420–500 | avg 32, peak 50–55 |

"dmg/turn" is the expected incoming damage per enemy phase before player defence, averaged over the fight. Per-hit size: Act 1 5–14, Act 2 10–20, Act 3 15–35, with multi-hit moves at most 6 hits (it is the Stagger/Riposte question).

### 8.2 Player throughput targets (average per turn over a fight, competent deck)

| Floor | Breaker dmg / block+guard | Graft dmg (+Rot) / block | Chronist dmg / block |
|---|---|---|---|
| 1 (starter) | 13 / 6 | 11 (+0) / 6 | 12 / 6 |
| 8 | 18 / 9 | 15 (+4) / 9 | 17 / 9 (swing ±50%) |
| 15 (A1 boss) | 24 / 13 | 18 (+8) / 13 | 22 / 12 |
| 30 (A2 boss) | 38 / 20 | 26 (+12) / 20 | 36 / 18 |
| 45 (A3) | 55 / 28 | 35 (+20, spread) / 28 | 55 / 25 |

Implied fight lengths (turns): Act 1 normal 3–4, elite 5–6, boss 8–10. Act 2 normal 3–5, elite 5–7, boss 8–10. Act 3 normal 3–4, elite 5–7, boss 8–10. Expected HP lost: Act 1 normal 4–10, elite 15–25, boss 30–45 (of 66–80 Max HP).

### 8.3 How the class mechanics scale against those HP targets
- **Onslaught.** The expected Onslaught when a "+per Onslaught" card is played is 1.0 at floor 1, 1.5 at floor 15, 2.5 at floor 30 and 3.5 at floor 45. Breaker damage is front-loaded: a finisher turn spends 4–6 Onslaught for 25–45 damage. It answers Act 1 burst checks best, and needs Guard/Riposte to survive Act 3 spikes.
- **Bloom.** Prunes that land on a given focus card average about 0.6 per combat in a starter-plus deck and about 1.2 in a Prune-built deck. Seed Bite is about Bloom 5 by floor 15 (14 damage), about 10 (the cap) by floor 30 (24, or 34 upgraded). A Prune deck with 3 focus cards caps two of them by floor 40. The arithmetic behind §0.3 override 1: with +3 per Bloom, floor 15 is already 19 damage for 1 energy.
- **Rot.** Applying R Rot per turn to one target gives cumulative ticks of R, 2R+1, 3R+3, … up to 15 per turn. With R = 2 the per-turn tick runs 2, 5, 8, 11, 14, 15, 15… so about 100 HP over a 9-turn boss fight (≈25–30% of an Act 2–3 boss). The cap stops Rot from soloing bosses, and spread plus Plague Bloom make it the Graft's pack answer. A Rot-only deck must lose to a 6-turn Act 3 clock boss (commandment 9).
- **Cadence.** Beats per turn: about 0.8 at floor 1 (Tick helps), 1.2 at floor 15, 1.8 at floor 45. Each beat payoff is worth about 0.6 energy, so +0.5 to +1.1 effective energy per turn. The 3-beat cap means beyond about 9 plays a turn only raw card value matters.
- **Delay.** By floor 15 about 1 Timeline resolution per turn; at the Delay multipliers that is about +25% throughput, concentrated on planned turns. Augury plus Delay 2 lands a big hit on the forecast vulnerable turn. Act 3 bosses must include a clock (commandment 10) that Delay alone cannot outrun.
- **Ceiling checks** (commandment 10, for `ENEMIES.md`): one Act 3 boss caps damage per turn (punishes Breaker swings and Chronist beat turns). One punishes card-play count or the Timeline (Postpone). One is a race (Rot and Guard stall lose).

### 8.4 Win-rate targets
- Competent human, A0: **35–45%** per class.
- Reference bot `greedy_v1` (ENGINE_SPEC §10): **25–35% per class, with the spread between classes ≤ 8 points.**
- Bot milestones: reach the A1 boss ≥ 90%; beat the A1 boss ≥ 75%; beat the A2 boss ≥ 50%; win 25–35%. Death share by act ≈ 30/40/30.
- Run time 40–70 minutes, measured as 55 ± 10 for wins (proxy: about 1,100 actions; time a human sample).

### 8.5 Pricing table for content designers (commandment 1)

**Base rate per energy** (one plain effect, no condition):

| Rarity | Damage | Block | Guard | Notes |
|---|---|---|---|---|
| starter | 6 | 5 | 6 | Deliberately weak. |
| common | 7 | 6 | 7 | Simple, efficient, 30%+ fit 2 archetypes. |
| uncommon | 8–9 | 7 | 8 | Archetype definers. |
| rare | 10+ | 8+ | 10+ | Or rule-breaking at common rate. |

A 0-cost card is worth 0.5 energy (3–4 damage at common). An X-cost card is worth X × rate × 1.1.

**Conversion values** (in common damage-equivalents, "d"):

| Element | Value |
|---|---|
| Draw 1 | 3 d |
| +1 energy (uncommon+, or with Scrap) | 7 d |
| Exposed 1 (on an enemy) | 3 d (4 d on multi-hit-tagged cards) |
| Stagger 1 (on an enemy) | 2 Block-equivalent (3 against multi-hit) |
| Rot N, first application | N·3 + 3 (Rot 1 = 6, 2 = 9, 3 = 12); price commons with T = 3 |
| Rot N, added to existing Rot | N·3 |
| Guard N | 1.2 × Block N |
| "+Y per Onslaught" | Y × 1.5 on commons; Y × 3 on finishers (cost ≥ 2 or "Spend") |
| "Gain N Onslaught" | 2 d per Onslaught |
| "Spend N Onslaught: X" | X must be worth ≥ 2N d more than the card without the clause |
| "+Y per Bloom" | Price the card at Bloom 2: base + 2Y = rate. The Bloom-0 base may be as low as 60% of rate. Y ≈ ⅓ of base (common), ½ (rare). An upgrade adds +1 to Y. |
| Prune (on a card) | 3 d (Prune 2: 5 d; Wild Prune: 4 d; Prune away: 10 d and must Scrap) |
| "On beat: X" | 0.6 × X's face value. A card whose main payload is on beat may pay out 1.6 × rate on the beat. |
| Delay N (total delayed value vs immediate) | Delay 1 ×1.5 · Delay 2 ×2.0 · Delay 3 ×2.5. Split cards: price the immediate part ×1 and the delayed part at the multiplier. |
| Riposte effect | 1.0–1.3 × the card's played value. A Riposte that scales with `trigger_hits` is priced at 2 hits. |
| "Forecast" conditions (Augury) | +40% on the conditional payload (the Chronist sees it; others rarely do) |
| Deck-count scaling | Price at the expected count for that act (Bloom cards in deck: 2 / 4 / 6 by act) |

**Drawback values**:

| Drawback | Worth |
|---|---|
| Scrap (non-Power) | +35% (+50% if you would only want it once) |
| Lose N HP | 1.5 d per HP |
| Add a status card to your discard / draw pile | −3 d / −4 d |
| Playable only if a condition holds | +50% |
| Keep / Opening (upsides) | −10% rate each |
| Power setup | per-turn value × 3 turns ≈ cost × rate (pays back by turn 4) |

### 8.6 Simulator metrics to collect (research §1.21, commandment 23)
Per run and aggregated, by class and by act, weighted by seed. Card metrics are also controlled for **floor picked**.
1. Win rate; floor of death; death encounter heatmap; HP at each boss entry; run length in actions.
2. Card offer rate, pick rate, skip rate per screen, pick-vs-what-else; card win-rate delta (runs containing it vs not, bucketed by floor picked); average damage taken per encounter by decks containing each card.
3. Relic win-rate delta; boss relic pick rates and skip rate; event option pick rates and outcome deltas; pact pick rate and win delta.
4. Economy: gold earned and spent by category; removals per act (gold, Shard, rest, event); **Shards earned / spent / held per act** (target 3–5 earned); upgrades per act; deck size per act.
5. Mechanic telemetry: Onslaught at play (distribution); Riposte triggers per primed card, fizzle rate, attack cancels; Guard absorbed share of damage prevented; Bloom distribution (max, total, number of Bloom cards) at death or win; Prunes per combat; Rot's share of total damage dealt; beats per turn; Timeline resolutions per combat and the percentage landing on a living stamped target; Exposed bonus damage; Stagger damage prevented.
6. **Cap hits by cap id** (should be < 1% of turns; a spike means a loop exists).
7. Turns per combat by encounter vs §8.2; damage taken per combat by encounter vs §8.1.

---

## 9. Engine asks (minimal additions to ENGINE_SPEC / `types.ts`)

Each is the smallest addition that expresses a rule above. They are grouped by owner mechanic.

**Combat state and zones**
1. `CombatState.primed: CardInstance[]` (+ `charges` per entry for Duelist's Oath). TurnStep `prime` between `player_turn_end` hooks and `hand_end_of_turn`, raising a `pendingChoice` when Riposte cards > capacity. Fizzle at player turn start step 2.
2. `CombatState.timeline: TimelineEntry[]` (§2.8). TurnStep `timeline_resolve` between `onTurnStart` and `player_draw`.
3. `guard: number` on `CombatPlayerState` and `EnemyState`. Pipeline absorption Block → Guard. Halving at the owner's turn start. Event `block.pool`. Event `guard_decay {target, lost}`.
4. `EnemyState.forecast: Intent[]` computed by calling `chooseMove` on a cloned enemy rng with extended history (§2.9), and recomputed on enemy-side state change. `MoveDef.augury?: 'hidden'`. The purity contract on `chooseMove` is written into ENGINE_SPEC §6.
5. `combat.counters` keys owned by the engine: `prunes`, `beatOffset`, and per-turn cap counters (`bonusEnergy`, `toHand`, `effectDraw`, `advance`, `pruneAway`, `plays`, plus a reduced-cost-play set of uids). Reset at player turn start.

**Card definition fields**
6. `CardDef.riposte?: Effect[]`; `CardDef.delay?: { turns: 1 | 2 | 3; effects: Effect[] }`; keywords `riposte`, `bloom`, `prune` (display only), `delay` (display only).
7. `cardsPlayedThisTurn` appended at pay-cost time, before effects (Cadence). Plays made by effects carry a depth; depth > 1 doesn't count.

**Effect primitives**
8. `guard {amount, target?}` · `spend_status {id, n | 'all', effects}` (exposes `spent`) · `bloom {amount, target}` · `prune {bloom, variant: 'standard' | 'wild' | 'spread' | 'away', bonusIf?}` (a resumable two-step choice) · `advance {n}` · `postpone {n}` · `on_beat {effects}` (wrapper; relics may repeat it) · `fetch_card {from, select, to, countsAsDraw?}` · `shards {amount}` · `transmute {choose, offers, n?, rarity?, upgrade?}` + ChoiceResume `transmute_pick` · `offer_cards {pool, rarity?, n, pick}` + ChoiceResume `offer_pick` · `duplicate_card {choose}` · `lose_potion {choose}` · `lose_relic {choose, notStarter}` · `start_combat {encounterId}` (event combat; resumes the event's reward afterwards) · `gamble {outcomes: {weight, effects}[]}` (rolled on `event`, odds rendered in the label) · `run_flag {key, delta}`.

**Amount scales and conditions**
9. Scales: `trigger_hits`, `spent`, `bloom_cards_in_deck`, `bloom_total_in_deck`, `bloom_max_in_deck`, `forecast_damage`, `shards`. Conditions: `on_beat`, `forecast_is_attack {who, depth}`, `pruned_type {type}`.

**Hooks**
10. Event hooks: `onEnemyAttackDeclared {uid, intent}`, `onRiposteTriggered {card, attacker}`, `onPrimed {count}`, `onEnemyMoveEnd {uid, hpLostThisMove}`, `onPrune {scrapped}`, `onBloomGained {card, delta}`, `onDelayResolved {card}`, `onTimelineAdd {entry}`, `onGuardDecay {lost}`, `onShardGain {amount}`, `onPotionUsed {potion}`, `onCardToHand {card}`, `onRewardSkipped`, `onCardAdded {card, source}` (run level), `onActStart`, `onEnemySpawn {uid}` (relics and run flags). Statuses on a dying entity receive `onDeath` **before** removal, and `onEnemyDied` info includes the dead enemy's final `statuses`.
11. Modifier hooks: `keepStatus(id, stacks) → kept` (Onslaught banking; generalises `keepBlock`), `guardFlat`, `guardDecay(guard) → lost`, `modifyStatusCap(id, cap)`, `bloomCap`, `modifyPruneBloom(amount, scrapped)`, `beatPositions(list) → list`. Damage and block info gain tag `delayed` when the source card resolves from the Timeline.

**Tick phases and pipeline**
12. `RoundPhase 'end_own_turn'` (per entity: after that enemy's move, or at player turn end), used by Rot and by Exposed/Stagger decay.
13. A built-in pipeline step 4 (`− attacker.stagger + target.exposed + backlash`, min 0) between `damageTakenMult` and `modifyDamageTaken`. Before the first hit of an enemy attack move, run the Riposte check. If the attacker dies, abort the rest of its move.

**Run level**
14. `RunState.ascent: number`; `PlayerState.counters.shards`, owned by the engine with cap 10. Action `skip_boss_relic` (+2 Shards). `shop_remove {uid, pay: 'gold' | 'shard'}`. Rest options `rest_purge`, `rest_transmute` with `available()`. `MapNode.encounterId?` for pre-assigned elites. Run counters `lean_rewards`, `wide_rewards`, `augury_combats`, `hunted_pending`. Class trait `ClassDef.combatStartStatuses?: Record<StatusId, number>` (Chronist: `{augury: 1}`).
15. Potion pickup with full slots raises a discard-to-take choice instead of silently losing the potion.

Nothing else is required: Bloom uses the existing `CardInstance.vars` sync, Shards use `PlayerState.counters`, and the Ascent Pact uses `StartBoonDef`.

---

## 10. Id glossary

**Classes**: `breaker` · `graft` · `chronist`

**Keywords** (engine id → display): `exhaust` → Scrap · `innate` → Opening · `retain` → Keep · `unplayable` · `riposte` · `bloom` · `prune` · `delay` · (`ethereal`: unused)

**Statuses**: `onslaught` · `onslaught_keep` · `riposte_capacity` · `rot` · `exposed` · `stagger` · `augury` · `elite_hunted` · `backlash_primed` · `cost_tax` · (fields, not statuses: `guard`, card var `bloom`, counter `shards`)

**Effect variants / named rules**: Prune · Prune N · Wild Prune · Spread Prune · Prune away · Spend N Onslaught · On beat · Delay N · Advance N · Postpone N

**Caps**: `cap_bonus_energy` · `cap_to_hand` · `cap_draw` · `cap_cost_reduction` · `cap_beats` · `cap_advance` · `cap_relay` · `cap_timeline` · `cap_primes` · `cap_prune_away` · `cap_plays` · `cap_stacks` · `cap_hand`

**Starter cards**: `hew` · `bulwark` · `shoulder_check` · `brace` · `lash` · `husk` · `seed_bite` · `graft_hide` · `pulse_shot` · `ward` · `tick` · `tock`

**Status cards**: `status_jitter` · `status_backlash` · `status_tangle` · `status_drift`

**Curses**: `curse_burden` · `curse_seized_joint` · `curse_static_ghost` · `curse_guilt` · `curse_vacuum_chill` · `curse_debt_mark` · `curse_hollow_echo` · `curse_parasite_vine`

**Relics — starter**: `riven_gauntlet` · `heartseed` · `chrono_lens`
**Relics — common**: `glass_spurs` · `dampener_coil` · `cracked_prism` · `geode_heart` · `bulwark_rivets` · `stim_patch` · `scrap_magnet` · `surveyor_ink` · `field_dressing` · `tally_stick` · `notched_buckler` · `chain_wraps` · `seed_pouch` · `pollen_sac` · `compost_heap` · `tuning_fork` · `sandglass_bead` · `star_pip`
**Relics — uncommon**: `parry_charm` · `kept_fury` · `crowd_breaker` · `concussion_rig` · `slow_temper` · `pocket_star_chart` · `overwatch_drone` · `shard_lens` · `crystal_spine` · `hairline_saw` · `wayfinder_needle` · `rot_censer` · `grafting_knife` · `heartwood_ring` · `mycelial_net` · `offbeat_drum` · `timeline_spool` · `seers_veil`
**Relics — rare**: `duelists_oath` · `stormbreak_gem` · `bastion_core` · `elder_seed` · `hollow_bough` · `plague_bloom` · `metronome_heart` · `prophet_glass` · `paradox_coil` · `shard_crucible` · `fracture_engine` · `void_compass`
**Relics — boss**: `binding_contract` · `cracked_hourglass` · `exposed_core` · `stasis_engine` · `ghost_lantern` · `tender_plating` · `fixed_star` · `heavy_heart` · `wild_growth` · `ascendant_prism` · `gravity_loom` · `star_atlas`
**Relics — shop**: `shard_writ` · `vial_rack` · `practice_dummy` · `nursery_tray` · `timeline_clamp`
**Relics — event**: `oracle_pebble` · `engine_tooth` · `shard_debt` · `crown_fragment`

**Potions**: `pot_flare_cell` · `pot_shield_gel` · `pot_bastion_tonic` · `pot_quicksilver` · `pot_charge_cell` · `pot_fault_dust` · `pot_concussion_gas` · `pot_shard_tincture` · `pot_blight_vial` · `pot_seers_draught` · `pot_fury_draught` · `pot_growth_sap` · `pot_tempo_draught` · `pot_mending_ampoule` · `pot_rewind_phial` · `pot_halt_ampoule`

**Events**: Act 1 `ev_spore_choir` · `ev_drowned_shrine` · `ev_flickering_medpod` · `ev_hydroponic_bay` · `ev_scavenger_drone` · `ev_singing_geode` — Act 2 `ev_assembly_line` · `ev_engine_cult` · `ev_smelter` · `ev_oracle_terminal` · `ev_rigged_conveyor` · `ev_salvage_heap` — Act 3 `ev_your_echo` · `ev_void_lens` · `ev_tether_merchant` · `ev_crown_vault` · `ev_prism_garden` · `ev_immune_scan` — Any `ev_wandering_artificer` · `ev_lost_climber` · `ev_memory_pool` · `ev_quiet_bench`

**Event encounters** (composition in `ENEMIES.md`): `enc_event_spore_choir` · `enc_event_engine_cult` · `enc_event_echo` · `enc_event_antibodies`

**Rest options**: `rest_rest` · `rest_smith` · `rest_purge` · `rest_transmute`

**Ascent Pact**: `pact_hardy` · `pact_shards` · `pact_purse` · `pact_blood_rare` · `pact_hunted` · `pact_lean_start` · `pact_reforged` · `pact_wanderer`

**Ascent levels**: `asc_elite_surge` · `asc_sharp_foes` · `asc_lean_purse` · `asc_tight_belt` · `asc_burden` · `asc_weary` · `asc_scarcity` · `asc_tough_foes` · `asc_deadly_foes` · `asc_twin_crown`

**Run flags / counters**: `shards` · `lean_rewards` · `wide_rewards` · `augury_combats` · `augury_rest_of_act` · `forecast_depth_3_rest_of_act` · `hunted_pending` · `beatOffset` · `prunes`

**Tuning keys** (new): `TUNING.caps.*` · `TUNING.cadence.beats` · `TUNING.shards.cap` · `TUNING.upgradedOffer` · `TUNING.treasureRelicOdds` · `rarePityStart = 0` · `unknownRoomOdds = {event 65, monster 20, shop 8, treasure 7}` · `map.weights` per row band (§4.9) · `gold` per act (§4.4)
