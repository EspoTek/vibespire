# Vibespire — design direction (lead's brief, v2)

This is the creative frame the full GDD must expand. It is deliberately opinionated; the GDD may push back on specifics with reasons, but not on the pillars. v2 renames/redesigns after checking `docs/research/sts-design.md` §3 (STS2 has a "Momentum" enchantment; STS1 has a "Foresight" card; per-play card growth is adjacent to Claw/Rampage/Forge).

## Pillars

1. **The deck is the character, and it keeps changing.** Every reward, shop, rest and event should pose a deck question ("does this card make my deck better *at the thing it's trying to do*?"), and the correct answer should flip depending on what you already have. Skipping must be a real, rewarded choice (see Shards).
2. **Every fight asks a question, and every question has an answer.** Each enemy, elite and boss is designed around a question of the deck (burst? sustained scaling? AoE? multi-hit? a 3-turn clock?). Acts escalate which questions are asked. No boss without reliable counterplay (STS2's Doormaker lesson).
3. **Perfect information at the table, hidden information in the future.** Intents are shown with exact numbers, pre-computed with all modifiers. Randomness is seeded and fair.
4. **Decide the infinite policy up front:** no true infinites. Any loop must be bounded (per-turn caps on cost reduction, card return, energy gain). The GDD lists the caps.
5. **Pixel-crisp, snappy, readable.** Phantasy Star (SMS) front-on battle screen; a hand of cards along the bottom; keyboard, mouse and controller all first-class.
6. **A run is 40–70 minutes.** Three acts, 15 floors + boss each.

## Setting

The Spire is a derelict orbital elevator on a dying colony world (sci-fantasy, Phantasy Star tone: swords and lasers, bright saturated palette). Climbing it is the only way off-world. Acts:

- **Act 1 — The Verdant Decks.** Lower decks overgrown with alien flora/fauna. Greens, cyans, purple blooms. Enemies: beasts, spore things, feral drones.
- **Act 2 — The Foundry.** Machine levels, still half-running. Rust orange, steel blue, furnace red. Enemies: constructs, assemblers, welded horrors, the cult of the engine.
- **Act 3 — The Crown.** The observatory and tether in orbit: void blue/black, ice white, prism colours. Enemies: starlight echoes, void geometry, the Spire's own immune system.

## The three classes

All mechanics below were checked against `docs/research/sts-design.md` §3; the GDD must re-verify anything it adds.

### 1. The Breaker (melee duelist) — *Onslaught · Riposte · Guard*
- **Onslaught** (player counter, per turn): +1 each time you play an Attack this turn. Breaker cards read "Deal X damage. +Y per Onslaught" or "If Onslaught ≥ 3: …". Resets to 0 at end of turn (a few rares bank part of it). Skills do not reset it; it is a count, not a streak, so there is no feel-bad for weaving a block in.
- **Riposte** (keyword, new design space: acting during the enemy's turn): a Riposte card can be played normally for its printed effect, **or held**: if it is still in your hand at end of turn it is *primed* (it is not discarded) and the **first time an enemy attacks you before your next turn, its Riposte effect triggers** (e.g. "Riposte: deal 9 damage to the attacker and gain 5 Guard"), then it is discarded. Primed cards are shown face-up above the hand. Only one card can be primed per turn by default (a power raises it). This gives the Breaker a genuine "play now or hold" decision every turn and makes enemy multi-attack intents a resource.
- **Guard** (block variant, also used by a few colourless/relic effects): Block gained as Guard carries over to the next turn, halving (round down) each turn. Shares the block pool for absorbing damage but is tracked separately so the renderer can show it. Lets the Breaker bank defence to buy an all-attack turn.
- Archetypes: all-Attack Onslaught turns with a finisher that consumes Onslaught; Riposte "duellist" that wants to be attacked; Guard-bank alternating turns; Stagger lockdown (universal debuff) against multi-hit enemies.
- Fantasy/visual: armoured, heavy blade, Phantasy Star's Odin energy.

### 2. The Graft (biomancer/symbiote) — *Bloom · Prune · Rot*
- **Bloom** (permanent, per card copy): Bloom cards carry a Bloom counter on that specific copy for the whole run (cap 10) and their numbers scale with it ("Deal 6 (+3 per Bloom) damage"). Upgrading a Bloom card raises the per-Bloom increment, not the base. **Bloom grows through Prune, not through play** (that is what separates it from Claw/Rampage/Forge-style growth).
- **Prune** (keyword): "Prune: exhaust another card from your hand; then a Bloom card you choose in hand gains +1 Bloom permanently" (variants: random Bloom card in deck, +2 for exhausting an Attack, etc.). The Graft thins her deck *in combat* to grow her engine, so her deck gets leaner and stronger as the run goes — the "dynamically building your deck" pillar made literal. Exhausted-by-Prune starter cards are gone for the run (it uses the normal exhaust rule: exhaust in combat does not remove from the deck — **decision: Prune exhausts for the combat only; permanent removal comes only from "Prune away" cards that explicitly say they remove the card from your deck**, so the player opts into permanence).
- **Rot** (enemy debuff): at the end of the enemy's turn it takes damage equal to its Rot, then Rot **increases by 1** (cap 15). On death, half the Rot (round down) spreads to a random living enemy. Slow at first, lethal later: the Graft's clock. Different maths from Poison (which decays) and Doom (execute threshold).
- Several Graft cards compute values from **deck contents** ("Gain block equal to the number of Bloom cards in your deck", "Deal damage equal to the highest Bloom in your deck") — an under-used design axis that makes deck composition matter beyond draw odds.
- Archetypes: Rot clock + stall; hyper-growth of 2–3 key Bloom cards; deck-count scaling; symbiont powers that trigger on Prune.
- Fantasy/visual: lithe, vine/chitin growths, bio-weapons.

### 3. The Chronist (seer/tempo) — *Cadence · Delay · Augury*
- **Cadence**: the 3rd, 6th and 9th card you play each turn is **on the beat**. Chronist cards read "On beat: …" (extra effect). The counter is shown prominently as a 3-step metronome. Ordering plays is the whole game for this class; cheap cards and draw make beats reachable. Cap: effects that trigger "on beat" cannot themselves advance the beat more than once per card (no loops).
- **Delay** (keyword): "Delay N" cards don't resolve when played; they go onto the **Timeline** (a visible strip of upcoming turns) and resolve at the start of your turn N turns later, typically with 2–3× a normal card's value. Some cards advance the timeline ("all Delayed cards resolve 1 turn sooner"). Delayed cards are not in any pile while waiting.
- **Augury**: the Chronist sees each enemy's **next two** intents (everyone else sees one). Cards/relics exploit it ("if the enemy's intent after next is an attack, gain 8 block", "Delay 2: deal 24 damage" timed against the big hit). A universal relic/event can grant one-combat Augury to other classes (information you pay for).
- Archetypes: beat-perfect combo turns; Delay burst timed with Augury; "stopwatch" control with cheap cycling; a few powerful 0-cost rares.
- Fantasy/visual: robed navigator with an astrolabe/chrono-lens.

## Universal mechanics (new to the genre)

- **Shards** (skip economy): skipping a card reward grants **1 Shard**. Shards are spent at rest sites: *Purge* (remove a card, 2 Shards) or *Transmute* (1 Shard), or at shops on a discounted removal (1 Shard + 25 gold). Skip is an active, visible choice that keeps decks lean. Tune so a disciplined player earns about 3–5 Shards per act.
- **Exposed** (debuff on anyone): each stack adds **+1 damage taken per hit** (flat, additive, applied after multipliers); loses 1 stack at the end of the affected side's turn. Multi-hit loves it; STS's Vulnerable was ×1.5.
- **Stagger** (debuff on anyone): each stack reduces outgoing attack damage by a flat 1 per hit (min 0); loses 1 stack at the end of the affected side's turn. Multi-hit enemies get wrecked by it; big single hits don't — a different texture from Weak (×0.75).
- **Guard** (above).
- **Rest site** has four options: Rest (heal 30% max HP), Smith (upgrade), Purge (2 Shards), Transmute (1 Shard).
- **Boss relics** exist (choose 1 of 3, each with a downside). **Ascent Pact** at run start: 3 trade-offs (e.g. "lose 7 max HP, gain a rare card", "start with 2 Shards", "a random uncommon relic, but your first elite is buffed", "100 gold", "remove 2 cards", "transform a card and upgrade it").

## Numbers to start from (tune via simulator)

- Starting HP: Breaker 80, Graft 70, Chronist 66. Energy 3. Draw 5. Hand max 10. Potion slots 3. Starting gold 99.
- Starter decks: 5 Strike-equivalents (6 dmg), 4 Defend-equivalents (5 block), plus two class starters (Breaker: *Shoulder Check* 1-cost 8 dmg, Riposte: 6 dmg to attacker; *Brace* 1-cost 5 Guard. Graft: *Seed Bite* 1-cost Bloom card 4 (+3/Bloom) dmg; *Graft Hide* 1-cost 5 block, Prune. Chronist: *Tick* 0-cost 3 dmg, on beat draw 1; *Tock* 1-cost 5 block, Delay 1: 5 block). GDD finalises.
- Card pool per class: 56 (20 common, 20 uncommon, 12 rare, 4 starters incl. Strike/Defend variants). Colourless 20. Curses 8. Status cards 4.
- Relics: ~70 total (starter ×3, common 18, uncommon 18, rare 12, boss 12, shop 5, event 4).
- Enemies: per act 3 weak encounters + 7 normal + 3 elites + 3 bosses (1 per run). ~14 unique enemies per act incl. bosses.
- Events: 18 total (6 per act) + 4 shared. Potions: 16.
- Rewards: 3 cards; rarity odds common 60 / uncommon 37 / rare 3 (+1% rare pity per non-rare reward; elites 10/40/50 style; bosses offer 3 rares). Colourless cards appear in shops and events (plus one event that offers 3 colourless).
- Shop: 5 class cards + 2 colourless, 3 relics, 3 potions, removal 75 gold (+25 each time) or 1 Shard + 25 gold.
- Act transition: heal 75% of missing HP after act 1 and 2 bosses.
- Enemy HP/damage scaling across acts: follow STS1's skeleton in `docs/research/sts-design.md` §2.9 (HP ×2–3 per act, damage ×1.5–2 per act).

## What the GDD must deliver

1. Final mechanic definitions with exact maths and timing for every keyword above (plus any extra the designer needs), written so the engine can implement them with the generic status/hook system in `docs/ENGINE_SPEC.md`. Include the infinite-prevention caps.
2. Complete card lists for the three classes and colourless/curses/statuses with: name, type, rarity, cost, target, text template, effects in the engine DSL, upgrade, tags (archetype), and a one-line designer note ("why would you pick this / what deck wants it").
3. Relic list (hooks described in engine terms).
4. Enemy roster per act: HP ranges, move list with exact numbers and the AI pattern (STS-style "cannot repeat X twice", conditional moves), the question each enemy asks AND the answer the player can have, and a 1-line visual description for the sprite generator. Elites and bosses with phases.
5. Events with options and outcomes. Potions. Ascent Pact options. Map weights.
6. A balance rationale: expected damage per turn per class per act, expected enemy damage per turn per act, how Rot/Onslaught/Cadence/Delay scale against enemy HP, and the intended win rate for a competent player (~35–45% baseline, no ascension).
