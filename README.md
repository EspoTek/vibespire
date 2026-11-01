# Vibespire

A roguelike deckbuilder in the spirit of Slay the Spire, built for the browser in three.js with 8-bit Sega Master System art.

**Play it:**
- **v2 (current):** https://vibespire.56bits.com.au
- **v1 (first release):** https://vibespire.56bits.com.au/v1/

## What this is

This is an experiment to see how good a game a modern LLM system can make without (much) human guidance.

The human wrote every prompt quoted below and nothing else: no code, art, music, design or balance numbers. Everything in this repository was produced by Claude Code:
- a lead model managing a team of Claude Opus 5.5 subagents for design, engine, rendering, balance simulation, bug-hunting and conveyance;
- Codex instances (GPT-6.1 Sol) for the pixel art.

The lead's job was to research, write briefs, review the subagents' and Codex's output, reject bad work and decide disputed rulings (`docs/RULINGS.md`).

- **v1** is commit [`8ecf0e2`](../../commit/8ecf0e2). It was produced from the first prompt, in about 14 hours of unattended work.
- **v2** is everything after it. It was produced from the human's playtest feedback (the second prompt) plus the short interjections listed below.

## The v1 prompt

> I want you to make a spiritual successor to Slay the Spire, from scratch, using three.js.
>
> We want three classes, with separate decks, as well as colourless cards and a variety of unique relics.  You should have unique stats/mechanics that were not present in sts1 or sts2.
>
> Your job is primarily to manage a team of Opus 5.5 subagents, as well as spin up and communicate with Codex instances running Astra 6 (or Sol 6.1), and evaluate their outputs.
>
> It's important that you make the game dynamically fun in the way that the original STS was.  ie - it should be balanced in such a way that you are dynamically building your deck as you go.  Before building anything, perform research about the specific game design decisions that made the original sts so great, and make sure it's encoded in the prompts you pass off to the opus/codex subagents.  You will probably need a subagent to create a playtester that can be used for balance.
>
> For art style, I'd _LOVE_ something 8-bit and front-on, like the original Phantasy Star on the Master System (again, research it to see what it looks like).  The cards should be at the bottom of the screen and it should work with keyboard, mouse and controller.  That said, if this art style/viewpoint doesn't look good in your opinion, you're welcome to toss away that subagent's work and try again.  For the pixel art, I suspect GPT-6.1 Sol XHigh  will produce good work, but please feel free to research what prompts others have used that got good results online.
>
> Make sure that the output of the subagents/codex is high quality, and please push back or discard if it's bad.
>
> When ready, deploy to vibespire.56bits.com.au.
>
> This is a test to see what you're capable of doing, working independently over a multi-hour span.  I will not help any more from here on out.  Good luck!

## The v2 prompt (playtest feedback on v1)

> Holy shit, you passed the test.  This could be submitted to a Game Jam, it works well.
>
> A few things you did well:
> - Gamefeel.  Attacking the enemies feels great, the way the cards move etc is really dynamic and fun.
> - Art, SFX and music is great, really captures that master system style.
> - Mechanics are unique and interesting, feels like Slay the Spire and the words/descriptions have the "DND vibes" to them.
>
> Things that you did poorly:
> - Conveyance.  I don't know what Riposte is, or what the cards upgrade to, my status effects, or anything like that.  The original STS1 was careful to tell you the exact mechanics before you made an action, no matter what screen you were on.  The relic descriptions are great
> - Balance.  Some cards are really useless, and some relics are incredibly OP.  I think you need to playtest more thoroughly with more advanced bots that have different "personalities", so you can see where they win/lose and why.
> - Bugs.  I found some minor ones (e.g. the relic that makes the shard removal free not actually reducing the gold cost to zero when you purchase it from the shop; only on the next shop does it cost zero), but also some _very_ major issues.  Notably, the first boss did not spawn.  You need more thorough real-browser playtests, ideally at a superhuman framerate or similar.
> - The cards themselves are not super exciting, and don't combo/interact in interesting ways.  In STS1 I can build a “Rupture Deck”, for example, synergising the power Rupture with self-damage cards like Hemokinesis and combust.  Or a “Poison desk” that goes hard on catalyst.  There is nothing similar in Vibespire.  Look up the MTG concepts of Timmy, Johnny and Spike.  There should be something to appeal to all of these archetypes.  (Look into relics at the same time, synergies like Dead Branch + Corruption go HARD in STS1)
>
> Can you spin up subagents again to fix the issues:
> - Conveyance, Balance, Bugs, Cards.
>
> Also spin up some Codex co-agents to improve/critique the art assets a bit more.  Some things like the smaller character sprites don't look great, and more effort could be put into making sure everything has a more coherent style.  SFX, Music should feel more intertwined with the visual animations.  You did well but I want to see if you can do even better.
>
> And of course, make the game a LOT more fun!

## Every other human message, verbatim

These are the only other words the human typed in the build session. None of them is game direction.

- During v1: *"Opus, can you take over from Fable?"* The lead model was switched mid-build. Later: *"(I was playing it for fun, just continue)"*.
- During v2: *"I had to force crash you because you were using too much RAM. Could you please continue but be mindful of your memory footprint?"* Then: *"You had a bunch of subagents open, possibly some codex ones too. You'll need to spin them up again. Check again for orphaned resources in general"*.
- *"It looks like you might have stopped overnight? Is that correct?"* It hadn't; it was waiting on long simulation batches.
- At the end, the deploy and publishing instructions:
  - *"When all of the jobs are done, I want you to deploy the final build to vibespire.56bits.com.au. Deploy the v1 build to vibespire.56bits.com.au/v1."*
  - *"Make a public repo on GitHub. In the readme.md, show the prompts for v1 and v2, plus links to the game itself at both points in the build."*

The human also ran a few "keep the laptop awake" commands in separate sessions, so the machine wouldn't sleep overnight.

## What changed from v1 to v2

- **Conveyance.**
  - Every keyword has a glossary entry, shown as hover and focus tooltips on cards, relics, potions, statuses and intents, on every screen.
  - "View upgrade" works anywhere a card is shown, and one-time tips explain new mechanics.
  - Also added: a Compendium, procedural status icons, and a Timeline window for the Chronist's delayed effects.
- **Engines, for Timmy, Johnny and Spike.** Each class now has several build-around engines, with enablers, multipliers and payoffs. Every card is tagged by engine and role in a table that is checked when the game loads.
  - **Shared engines** use colourless cards and relics: Redline, Scrapheap, Overflow and Reprise.
  - **Card rewards and shops** lean toward engines you've started.
- **Balance**, from a simulator with bot "personalities":
  - **spike:** full-turn search on a cloned engine state, plus rollout drafting with measured card priors;
  - **timmy, turtle and novice** play styles;
  - **a johnny per engine.**

  Each was measured over thousands of seeded runs with paired-seed counterfactuals for every card and relic. See `docs/balance/`.
- **Difficulty tiers.** Standard (the default) is tuned so casual-style bots win some runs: timmy 32%, novice 11% in the release measurement.
  - Heroic was tuned toward a 30–45% win rate for the search bot.
  - The release measurement retrained the bot's card priors on every card, which made it a much better drafter. It now wins 59% on Breaker, 37% on Chronist and 65% on Graft, so Heroic is easier than intended for strong Breaker and Graft drafters.
  - See `docs/balance/report-v2-release.md`. That is the next balance job.
- **Bugs.** A Playwright harness plays the real game in a browser at high speed, through actions and through real input (mouse, keyboard, gamepad), checking invariants every step. It found the missing boss node and other bugs (`docs/v2/bugs.md`).
- **Art, music and feel.**
  - A second Codex art pass for coherence: character sprites, noise cleanup and icon fill.
  - New art for every v2 card, relic and status.
  - A cue system that syncs SFX to animation keyframes, and music that reacts to combat on the beat.

## Running it

```sh
npm install
npm run dev          # http://localhost:5173
npm test             # vitest: engine, content and render invariants
npm run e2e:smoke    # Playwright browser playtests
npm run typecheck
npx tsx sim/personas-batch.ts --help   # headless balance simulator
npm run deploy       # v2 build + v1 build (scripts/build-v1.sh) + Cloudflare Worker deploy
```

Start with `CLAUDE.md`, `docs/GDD.md` (game design), `docs/ENGINE_SPEC.md` (engine contract) and `docs/RULINGS.md` (design decisions made along the way).
