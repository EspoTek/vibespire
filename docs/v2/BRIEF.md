# Vibespire v2 — team brief (read this first)

v1 is live at https://vibespire.56bits.com.au. The user played it and gave this verdict (paraphrased, quotes verbatim):

**Kept — do not regress these:**
- Game feel: attacks and card motion are dynamic and fun.
- Art, SFX and music capture the Master System style.
- Mechanics are unique; text has "DND vibes". Relic descriptions are great.

**Fix:**
1. **Conveyance.** "I don't know what Riposte is, or what the cards upgrade to, my status effects, or anything like that. The original STS1 was careful to tell you the exact mechanics before you made an action, no matter what screen you were on."
2. **Balance.** "Some cards are really useless, and some relics are incredibly OP." Needs more advanced bots with different "personalities" to see where they win/lose and why.
3. **Bugs.** Minor: the relic that makes Shard removal free does not make the price zero when bought in the shop; only the next shop shows zero. **Major: the first boss did not spawn.** Needs thorough real-browser playtests, ideally at superhuman frame rate.
4. **Cards are not exciting and don't combo.** STS1 lets you build a Rupture deck (Rupture + self-damage like Hemokinesis, Combust) or a Poison deck that goes hard on Catalyst. Nothing similar exists in Vibespire. Appeal to Timmy, Johnny and Spike. Relic synergies too: "Dead Branch + Corruption go HARD in STS1."
5. **Art coherence.** Some smaller character sprites don't look great; the whole set needs a more coherent style.
6. **Audio-visual sync.** SFX and music should feel more intertwined with the visual animations.
7. **"Make the game a LOT more fun!"**

## Team and file ownership

Several agents edit this repo at once. Stay in your area. If you must touch someone else's file, make the smallest possible edit, re-read before editing, and name it in your report.

| Agent | Owns | Also may touch |
|---|---|---|
| bugs | `tests/e2e/**`, `src/render/debug/**` (new), bug fixes anywhere (narrow) | `src/render/app.ts` loop (time scale), `package.json` scripts |
| conveyance | `src/render/ui/Tooltip.ts`, `src/render/ui/CardFrame.ts`, new `src/render/ui/Keyword*.ts`, `src/content/keywords.ts` (new), tooltip hooks in every screen | engine `text.ts` (text generation only) |
| sim | `sim/**`, `docs/balance/**` | none; report content problems to the lead, don't edit content |
| design-breaker / design-graft / design-chronist | `src/content/cards/<class>.ts`, `docs/cards/<class>.md`, `tests/content/<class>*` | engine hooks needed for new mechanics: add narrowly, report them |
| design-shared | `src/content/cards/colorless.ts`, `src/content/relics.ts`, `src/content/potions.ts`, `docs/cards/colorless.md`, relic docs | same |
| juice | `src/render/audio.ts`, `music.ts`, `psg.ts`, `tween.ts`, animation/event handlers in `CombatScreen.ts`, new `src/render/fx/**` | other screens' transitions |
| codex-art-* | `public/assets/**`, `tools/sprites/**`, `docs/art/**` (new) | nothing in `src/` |

`git` is the lead's job. **Never run `git commit`, `git push`, `git stash`, `git checkout -- <file>`, `git reset` or anything else that rewrites the working tree**: other agents' uncommitted work is there. `git diff`, `git log`, `git show` and `git worktree add` (for an isolated read-only copy) are fine.

`npm run typecheck` and `npm test` must pass for your area before you report done. Other agents may break the build briefly while mid-edit. If a failure is clearly in someone else's area, note it and carry on; don't "fix" their files.

## Design framework for fun (cards, relics, potions)

v1 cards were designed "at rate": every card's value is close to a reference line, and archetypes add up linearly. That gives fair, balanced, flat play, with no moment where a deck "comes online". v2 must give each class **engines**: combinations whose value is multiplicative, not additive.

**Psychographics (Mark Rosewater, MTG).** Every class and the shared pool must have content for all three:
- **Timmy/Tammy — the power gamer.** Wants a big, splashy, memorable moment: hit for 80, gain 60 Block, a card that's an event. Give Timmy rares with huge ceilings, X-cost cards, "double your X" multipliers and visible numbers that climb.
- **Johnny/Jenny — the combo player.** Wants to discover an interaction the game didn't spell out, and build a deck around it. Give Johnny rule-breaking Powers (Corruption, Barricade, Snecko Eye style) and cards that are weak alone but absurd together. Make sure the combo is *discoverable*: the keywords should hint at partners.
- **Spike — the optimiser.** Wants to win and values efficiency, consistency, deck thinning and tight choices. Give Spike clean, efficient commons and uncommons, card draw and filtering, energy, and hard choices where the best pick depends on the deck.

**STS synergy patterns to learn from (don't copy them).** Each archetype should have:
- an **enabler** (common or uncommon) that produces a resource: self-damage, Poison, Exhaust, Shivs, Block;
- a **payoff** that converts it: Rupture, Catalyst, Feel No Pain, Accuracy, Body Slam;
- a **multiplier or rule-breaker** at uncommon or rare: Catalyst doubles Poison, Limit Break doubles Strength, Corruption makes Skills free, Barricade keeps Block, Echo Form, Burst.

Relics should include build-arounds that make a mediocre card into a deck: Dead Branch (Exhaust → random card), Kunai/Shuriken (3 Attacks → stat), Ink Bottle, Unceasing Top (draw on empty hand), Snecko Eye (random cost + draw), Runic Pyramid (keep hand), Ice Cream (keep energy) + X costs, Charon's Ashes (Exhaust → damage), Tingsha (discard → damage), Paper Krane/Phrog.

Combos should cross types: card+card, card+relic, card+potion and relic+relic.

**Vibespire's own resources.** Build the engines from these, with new mechanics where needed:
- Breaker: Onslaught, Riposte, Guard.
- Graft: Bloom, Prune, Rot.
- Chronist: Cadence beats, the Delay timeline, Augury.
- Shared: Shards, Exposed, Stagger.

Each class needs **at least 3 distinct engines**. Each engine needs 2–4 key pieces, so a deck comes online around floor 15–25 when drafted with intent. Assembled engines may be strong; that's the reward for drafting. Conditional infinites are acceptable if they need a rare and at least 2 other pieces.

**Useless cards must go.** Cut or rework every card that never makes a good deck better. The sim's v2-baseline report (`docs/balance/report-v2-baseline.md`) will list them with numbers.

**Conveyance rules for every new card and keyword.**
- Card text stays generated from engine numbers.
- Every new keyword needs an entry in the keyword glossary (`src/content/keywords.ts`, owned by conveyance) so tooltips can explain it. Coordinate through the lead if it doesn't exist yet.
- Keep text short: the keyword carries the rules, the card carries the numbers.

## Quality bar

The lead reviews everything and sends back weak work. "Done" means all of:
- it works in the real browser, not just in tests;
- it's in the style of the rest of the game;
- your report says plainly what you didn't finish.

## Resource limits (mandatory, added 2026-10-31)

The machine has 16 GB RAM and 10 cores, and several agents share it. The lead's session was force-killed for running out of RAM.

- **Sim batches:** at most `--workers 2`.
- **Playwright/e2e:** at most 1 browser with 2 pages. Close the browser in a `finally` block.
- **Vitest:** run targeted files, or the full suite with `--maxWorkers=2`.
- **No overlapping jobs:** never start a long job while another long job of yours is running.
- **Clean up:** no background job may outlive your turn. Before you report, kill every process you started (vite servers, browsers, sim workers) and check with `ps`.
- **Port 4173 is off-limits:** it's the user's preview server.
