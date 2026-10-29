# Slay the Spire design brief: what makes it work, the numbers, and what not to copy

Research brief for the design and engineering team building a browser-based (three.js) spiritual successor: three classes with separate decks, colourless cards, unique relics, and **new** stats/mechanics that appear in neither Slay the Spire 1 (STS1) nor Slay the Spire 2 (STS2).

**How to read the sources.** Mega Crit has published very little primary design writing. The primary sources here are Anthony Giovannetti's GDC 2019 talk ("Slay the Spire: Metrics Driven Design and Balance", [GDC Vault](https://www.gdcvault.com/browse/gdc-19/play/1025731), [YouTube](https://www.youtube.com/watch?v=7rqfbvnO_H0)), the 2018 Game Developer interview on data-driven balance ([gamedeveloper.com](https://www.gamedeveloper.com/design/how-i-slay-the-spire-i-s-devs-use-data-to-balance-their-roguelike-deck-builder)), the Road to the IGF interview ([gamedeveloper.com](https://www.gamedeveloper.com/game-platforms/road-to-the-igf-mega-crit-games-i-slay-the-spire-i-)), the Ars Technica "War Stories" episode on the interface (summarised on [Wikipedia](https://en.wikipedia.org/wiki/Slay_the_Spire)), and Mega Crit's STS2 announcement ([megacrit.com](https://www.megacrit.com/news/2026-03-05-early-access-launch/)). The exact numbers come from the community wiki ([slaythespire.wiki.gg](https://slaythespire.wiki.gg)), which was built largely from the decompiled game. Where this brief interprets the design rather than reporting it, it says so ("Analysis:").

---

## 1. Why it is fun: the design decisions behind "building your deck as you go"

### 1.1 The core loop
The player fights a combat, picks 1 of 3 cards (or skips), and chooses the next node on a branching map. Within about 50 decisions the starter deck turns into an engine. Each decision is small, and they compound. Giovannetti summarised the core design as "risk versus reward" ([Think Like A Game Designer podcast notes](https://justingarydesign.substack.com/p/anthony-giovannetti-crafting-slay)). Mega Crit also stated they "wanted a wide gamut of enemies that would challenge different strategies in unique ways" and that "there would not just be a single dominant strategy" ([Road to the IGF](https://www.gamedeveloper.com/game-platforms/road-to-the-igf-mega-crit-games-i-slay-the-spire-i-)).

### 1.2 The 3-card reward, and why you can skip it
- Every normal combat offers **3 cards from the class pool**, and you may take one or **skip**. Skipping costs nothing except the card. The rare-pity counter advances when cards are *rolled*, not when they are taken ([wiki: Cards](https://slaythespire.wiki.gg/wiki/Cards)). The relic Singing Bowl turns a skip into +2 Max HP, so skipping becomes a positive choice.
- **Why skipping matters.** Draws are random from a shuffled pile, so every added card lowers the chance of drawing every other card. A "fine" card that is off-plan makes the deck worse. Skipping is therefore a real strategic option, and that is what turns the reward screen from "collect loot" into "edit a deck". The community phrases the test as "does this card beat the card it would displace in a typical draw?" ([metabot guide](https://metabot.gg/en/slay-the-spire-2/guides/deck-thinning-and-deck-size)). Analysis: without the skip, and without the dilution cost that gives it meaning, the screen is a slot machine. With it, every reward is an evaluation of your current deck.
- **Why exactly 3.** Three options is enough to make "none of these" a common outcome while still offering a real chance of a synergy piece. STS2 kept 3 and added a custom-mode modifier called "Binary" (only 2 cards offered) as a difficulty knob ([spire-codex reference](https://spire-codex.com/reference)). This confirms the developers treat the number of options as a difficulty lever.

### 1.3 Energy economy: 3 per turn, most cards cost 0-2
- 3 energy per turn and 5 cards drawn, with most cards costing 1. The starting budget is therefore about "play 3 of your 5 cards", and the remaining 2 are the dilemma. Cost-0 cards, cost-2 cards and X-cost cards bend this. Energy relics (most of the 30 boss relics give +1 energy with a drawback) are the biggest single power jump in a run, which is why they come with a real cost. Examples: Ectoplasm (no more gold), Sozu (no more potions), Busted Crown (2 fewer card choices), Coffee Dripper (cannot rest), Fusion Hammer (cannot smith), Runic Dome (enemy intents hidden), Velvet Choker (maximum 6 cards per turn), Philosopher's Stone (enemies start with +1 Strength), Mark of Pain (2 Wounds added each combat), Cursed Key (curse from every chest). ([wiki: Relics](https://slaythespire.wiki.gg/wiki/Relics))
- Analysis: energy is the denominator of every card's value. Strike is 6 damage per energy and Defend is 5 Block per energy. Every other card is implicitly priced against those two rates.

### 1.4 Small starting decks, and why deck size and thinning matter
- Starter decks have 10-12 cards (e.g. Ironclad has 5 Strike, 4 Defend, 1 Bash). With 5 drawn per turn, a 10-card deck cycles every 2 turns, so a single good pickup shows up almost immediately. That is the source of the "my deck changed" feeling.
- Starter cards are deliberately weak (6 damage / 5 Block for 1 energy), which makes **card removal** (shop: 75 gold, +25 each time; events; Neow; Peace Pipe; Empty Cage) a real upgrade in its own right. Removing a Strike raises the density of everything else. This is why Mega Crit made removal a priced, escalating shop service and not a free action.
- STS2 adds the **Eternal** keyword, which marks cards that can never be removed or transformed (e.g. Tezcatara's Ember enchantment on Strikes) ([wiki: STS2 Keywords](https://slaythespire.wiki.gg/wiki/Slay_the_Spire_2:Keywords)). Analysis: the designers see removal as strong enough to need counter-pressure.

### 1.5 Draw 5, discard all, reshuffle
- At the end of a turn you discard your whole hand (unless a card has Retain). When the draw pile is empty, the discard pile is shuffled back in. As a result:
  1. Each turn is a fresh hand-sized puzzle, and you cannot hoard.
  2. Retain, draw and discard become valuable *because* they break the default (Watcher's Retain, Silent's discard synergies, Well-Laid Plans, Runic Pyramid).
  3. The deck is a probability distribution you are shaping. Thin decks are consistent and big decks are resilient, so the choice is a real axis.
- Giovannetti credited the discard mechanic to deck-building board games ([GDC talk summary](https://briefread.pages.dev/en-GB/summary/slay-the-spire-metrics-driven-design)).

### 1.6 Enemy intents: a puzzle every turn
- Enemies show their next action above their heads, with exact numbers for attacks. The first prototype hid enemy actions. Testers felt it clashed with permadeath, because you died to information you never had. A "Next Turn" preview (select a target to see its move) worked but was unreadable with several enemies. An icon "Intents" system followed. At first it showed damage *ranges*, but exact numbers tested as more engaging and enabled new strategies ([Wikipedia: Development](https://en.wikipedia.org/wiki/Slay_the_Spire); Ars Technica War Stories, May 2019).
- The result is that each turn is a solvable optimisation problem: "they hit for 18, I have 3 energy; do I Block 15 and take 3, or kill the small one so the hit never happens?" The fun is in the solving, not in guessing. Intent types include Attack (and multi-hit), Defend, Buff, Debuff, Strong Debuff, Escape, Sleep, Stun, Unknown and combinations. STS2 adds explicit "Malicious" (applies Afflictions to your cards), "Death Blow", "Summon" and "Status" intents ([spire-codex](https://spire-codex.com/reference)).
- Hiding intent is used sparingly and as a cost: the boss relic Runic Dome gives +1 energy but hides intents.

### 1.7 Enemies that "ask a question" of your deck
This is the most important and most copyable *structural* idea. Each elite and boss is a test of one dimension of a deck. Mega Crit stated the goal directly: enemies "that would challenge different strategies in unique ways" ([Road to the IGF](https://www.gamedeveloper.com/game-platforms/road-to-the-igf-mega-crit-games-i-slay-the-spire-i-)).

| Enemy (act) | Mechanic | Question asked |
|---|---|---|
| **Gremlin Nob** (A1 elite) | Turn 1 Bellow: Enrage 2 (gains +2 Strength whenever you play a Skill). Rush 14, Skull Bash 6 + 2 Vulnerable. 82-86 HP | "Can you kill with Attacks alone, without defending?" Punishes Skill-heavy decks. |
| **Lagavulin** (A1 elite) | Asleep with Metallicize 8 for 3 turns (or until damaged). Attack 18, Siphon Soul (-1 Str, -1 Dex). 109-111 HP | "Can you burst ~110 HP before the Strength/Dexterity drain wins?" Rewards setting up while it sleeps. |
| **3 Sentries** (A1 elite) | 38-42 HP each, Artifact 1, alternate Beam (9) and Bolt (2 Dazed into discard) | "Can your deck function while filled with junk statuses, and can you deal AoE?" |
| **Slime Boss** (A1) | 140 HP. Goop Spray (3 Slimed), Prepare, Slam 35. Splits at 50% HP into two Large slimes that keep its current HP | "Do you have front-loaded damage, and can you handle a split?" Timing matters: hitting it to just over 50% is better than overshooting. |
| **The Guardian** (A1) | 240 HP. Mode Shift: after taking 30 damage (+10 per shift) it enters Defensive Mode (20 Block, Sharp Hide 3 thorns); Fierce Bash 32, Whirlwind 5x4 | "Can you control *when* you deal damage?" Punishes multi-hit attacks while it has thorns. |
| **Hexaghost** (A1) | 250 HP. Divider = (your current HP / 12 + 1) x 6; adds Burns, Inferno upgrades the Burns | "Does your deck scale over a long fight?" High-HP players are punished by Divider. |
| **Book of Stabbing** (A2 elite) | Multi-stab that gains +1 hit each use; Painful Stabs adds a Wound per unblocked hit | "Can you Block multi-hit attacks every turn?" |
| **Gremlin Leader** (A2 elite) | Summons gremlins and buffs them | "Do you have AoE, or the focus to kill the leader?" |
| **Bronze Automaton** (A2) | Hyper Beam 45 on a fixed schedule; Bronze Orbs Stasis (steal) your best card | "Can you survive a known big hit, and does your deck work if your best card is taken?" |
| **The Champ** (A2) | At 50% HP: removes debuffs, gains triple Strength, Execute | "Can you burst through the second half?" |
| **The Collector** (A2) | Summons Torch Heads; Mega Debuff (3 Weak/Vulnerable/Frail) | "AoE versus focus fire, and can you handle debuffs?" |
| **Awakened One** (A3) | Curiosity: +1 Strength whenever you play a Power. Revives at 300 HP in phase 2 | "Can you win without leaning on Powers?" |
| **Time Eater** (A3) | Time Warp: every 12 cards you play, it ends your turn and gains +2 Strength | "Can you win without playing many cards?" Punishes Shiv and cheap-card spam. |
| **Donu & Deca** (A3) | Two bosses with Artifact 2. Deca adds Dazed and gives Block; Donu gives Strength | "Can you scale, and handle statuses, in a long double-target fight?" |
| **Transient / Giant Head / Nemesis / Reptomancer** (A3) | Transient: 999 HP but leaves after a few turns (a damage race). Giant Head: "It Is Time", escalating damage. Nemesis: periodic Intangible. Reptomancer: daggers that explode | Each tests one axis: race, scaling, timing, or AoE. |
| **Corrupt Heart** (A4) | 750 HP. Beat of Death (1 damage per card you play), Invincible (damage cap of 300 per turn), Blood Shots 2x12, Echo 40 | "A final exam on everything: burst, defence, scaling and card-play discipline." |

Analysis: none of these punishes a deck at random. Each one tells you, the first time you meet it, what it will punish. That gives the player a reason to *plan the deck against the enemy roster* (e.g. "I need AoE before Act 2"), which in turn gives the card-reward screen a forward-looking purpose.

### 1.8 Difficulty pacing across acts
- Act 1 draws its first 3 combats from a "weak" pool (Act 2 and 3 use 2). The starter deck can win those, so early picks are about *direction*, not survival.
- Each act raises enemy HP by roughly 2-3x and damage per hit by roughly 1.5-2x (see section 2), and changes *what* is asked. Act 1 checks front-loaded damage. Act 2 checks multi-enemy fights, statuses and Block against multi-hit attacks. Act 3 checks scaling and anti-synergy (Time Eater, Awakened One). This pushes the deck to evolve, not just grow.
- Win rate by floor reached rises in steps just after floors 17 and 34, the Act 1 and Act 2 bosses ([Foxrow analysis of Mega Crit's 2020 data dump](https://foxrow.com/slay-the-spire-statistical-analysis)). Bosses are the real gates.

### 1.9 Elites as opt-in risk and reward
- Elites (marked on the map) drop a **relic** plus better card odds (10% rare versus 3%). In Act 1 they are the main way to get relics early. The map is the throttle: the player decides how many elites to fight based on HP, potions and deck strength. Ascension 1 raises elite frequency by about 60%. The Emerald Key (needed for Act 4) requires killing a "burning" elite with buffs.

### 1.10 The boss relic choice
- After each boss in Acts 1 and 2 you choose 1 of 3 **boss relics** (or skip, in STS1). Most are +1 energy with a run-defining drawback (see 1.3). This is the run's biggest pivot: Snecko Eye (draw +2, costs randomised) or Runic Pyramid (keep your hand) can reorganise the whole deck. STS2 replaced this with **Ancients** (section 3), and their offer *cannot be skipped* ([wiki: STS2 Ancients](https://slaythespire.wiki.gg/wiki/Slay_the_Spire_2:Ancients)).

### 1.11 The map as information plus choice
- You see the whole act map at the start: about 15 rows, 7 columns, 6 overlapping paths. Room types are visible (monster, elite, rest, shop, ? event, treasure), and the floors are fixed: floor 1 is always a monster, floor 9 is always treasure, and the floor before the boss is always a rest site. The boss's identity is shown on the map. Giovannetti: "it is valuable to have layered decision-making in a strategy game ... choosing a path based on the meta strategy elements adds a lot of richness" ([Road to the IGF](https://www.gamedeveloper.com/game-platforms/road-to-the-igf-mega-crit-games-i-slay-the-spire-i-)). The branching map came from FTL ([Wikipedia](https://en.wikipedia.org/wiki/Slay_the_Spire)).
- Analysis: because the boss is known, the player has a target to build toward for the whole act.

### 1.12 Rest versus upgrade (smith)
- At a rest site you choose **one** action: Rest (heal 30% of Max HP) or Smith (upgrade one card). Relics add more options: Lift (Girya), Toke (Peace Pipe), Dig (Shovel), Recall (Ruby Key). Healing and power compete for the same action, so HP is converted into deck strength. A healthy player upgrades; a hurt player rests. Coffee Dripper and Fusion Hammer each remove one of the two options in exchange for energy.

### 1.13 Limited healing: HP as a resource that carries between fights
- HP carries between combats. Healing is scarce: Burning Blood (Ironclad, 6 HP after each combat), rest sites, some events and potions, and a full heal after each boss (A5 and above: 75% of missing HP). Damage taken in one fight is therefore a *cost paid in a later fight*. That makes chip damage meaningful and makes "take 6 to play a stronger turn" a real calculation. Paying HP is a deliberate currency in many places: Ironclad's Offering, Hemokinesis and Bloodletting; events; the Neow drawback "take damage equal to 3 per 10 current HP" ([wiki: Neow](https://slaythespire.wiki.gg/wiki/Neow)).

### 1.14 Shop and card-removal economy
- Gold comes from combats (normal 10-20, elite 25-35, boss about 100) and events. The shop sells 5 class cards (always 2 Attacks, 2 Skills and 1 Power; one of them on 50% sale), 2 colourless cards (one uncommon, one rare, at a 20% markup), 3 potions, 3 relics (the rightmost is always a Shop-rarity relic), and **one card removal**, which starts at 75 gold and rises 25 each time ([wiki: Merchant](https://slaythespire.wiki.gg/wiki/Merchant)). Removal is often the best purchase, which is why its price escalates and why Smiling Mask (removal fixed at 50) is a relic.

### 1.15 Potions as tempo
- 3 slots (2 at A11+). The drop chance after a combat starts at 40% and moves ±10% depending on whether one dropped. Potions are free (no energy), immediate, and expendable. They convert a *future* reward into a *present* emergency answer, which is what makes "fight the elite while at 40% HP" a defensible gamble. A full slot bar wastes drops, which pushes the player to use them, not hoard.

### 1.16 Relics as build-defining engines
- 180 relics in STS1 ([wiki: Relics](https://slaythespire.wiki.gg/wiki/Relics)). Most are small passives (Vajra +1 Strength, Anchor 10 Block on turn 1), but the high-impact ones *change the rules* and redirect the build:
  - Dead Branch: exhausting a card adds a random card to your hand, which makes Corruption decks.
  - Kunai/Shuriken/Ornamental Fan: rewards for playing 3 Attacks in a turn, which makes Shiv decks.
  - Snecko Eye: +2 draw, random costs, so the deck wants expensive cards.
  - Runic Pyramid: never discard your hand.
  - Ice Cream: energy carries over between turns.
  - Unceasing Top: draw a card whenever your hand is empty.
  - Pen Nib: every 10th attack deals double damage.
- Analysis: relics are the second axis of build identity. A good relic changes how you evaluate the *next* card reward.

### 1.17 Synergies and archetypes (STS1)
Each class has 3-4 archetypes, built from overlapping cards so a deck can pivot between them:
- **Ironclad**: Strength scaling (Inflame, Spot Weakness, Limit Break, Demon Form, Heavy Blade, Sword Boomerang); Exhaust (Corruption, Feel No Pain, Dark Embrace, Second Wind, Fiend Fire, Sentinel); self-damage (Rupture, Combust, Hemokinesis, Brutality, Offering); Block/Barricade (Barricade, Entrench, Body Slam, Juggernaut).
- **Silent**: Poison (Deadly Poison, Noxious Fumes, Catalyst, Bouncing Flask, Corpse Explosion); Shivs (Blade Dance, Cloak and Dagger, Accuracy, After Image, Infinite Blades); discard (Tactician, Reflex, Eviscerate, Prepared, Acrobatics); Weak/defence (Leg Sweep, Malaise, Wraith Form).
- **Defect**: Lightning/Frost orbs with Focus (Defragment, Glacier, Coolheaded, Electrodynamics); Dark orbs; 0-cost "Claw" (Claw permanently +2 damage to all Claws each play; All for One returns 0-cost cards); Powers (Storm, Heatsinks, Creative AI, Echo Form); energy-for-junk trades (Turbo adds Void, Overclock adds Burn).
- **Watcher**: stances (Wrath: deal and take 2x damage; Calm: +2 energy on exit; Divinity: 3x damage and +3 energy, entered at 10 Mantra), Retain (Establishment, Windmill Strike, Sands of Time), Scry (Third Eye, Foresight, Nirvana, Weave), Mantra/Divinity (Prostrate, Worship, Devotion, Blasphemy).
- Analysis: archetypes share "glue" cards (draw, Block, energy) so a run can follow whatever the RNG offers. A Strength card is still good in an Exhaust deck. That overlap is why decks feel discovered rather than chosen at character select.

### 1.18 Every card is a trade-off
- Efficiency is priced against Strike/Defend. Anything better pays somewhere else:
  - Exhaust: Impervious (30 Block, Exhaust).
  - Ethereal: Carnage (20 damage, Ethereal).
  - A condition: Clash (14 damage, playable only if your hand is all Attacks).
  - HP: Hemokinesis (lose 2 HP, 15 damage).
  - A curse or status: Wild Strike (shuffles a Wound in), Power Through (2 Wounds).
  - Setup time: every Power.
  - A future penalty: Bullet Time (No Draw).
- Rarity carries power. Rares are allowed to be build-defining (Corruption, Echo Form, Wraith Form) because they appear rarely and late.

### 1.19 Upgrades
- Each card upgrades once (except Searing Blow, which upgrades without limit). An upgrade is usually +30-50% on the numbers, -1 cost, or removing a drawback (Exhaust/Ethereal), and sometimes it changes the card's role (e.g. Armaments+ upgrades your whole hand, not just one card). Upgrades come from rest sites, some events and relics, and upgraded card rewards (0% in Act 1, rising in Acts 2-3; halved at A12). Analysis: because upgrades are scarce, choosing *which* card to upgrade is a real decision. A good upgrade (Bash+ to 3 Vulnerable; Apotheosis cost 2 to 1) can change how the card is used.

### 1.20 Rarity distribution
- Pools have about 20 commons, 33-36 uncommons and 16-19 rares per class in STS1, and 20/35/25 in STS2. Normal-combat odds are 60% common / 37% uncommon / 3% rare, plus a pity counter (starts at -5%, +1% per common rolled, resets when a rare appears). Elites are 50/40/10 and bosses are 100% rare ([wiki: Cards](https://slaythespire.wiki.gg/wiki/Cards)). Commons are the reliable glue. Uncommons are where archetypes become distinct. Rares are payoffs and rule-breakers.
- Giovannetti chose about 75 cards per class because it gave strategic variety without the "chaotic" deck-building he saw in Netrunner ([Wikipedia](https://en.wikipedia.org/wiki/Slay_the_Spire)).

### 1.21 Metrics-driven balance
From the GDC 2019 talk and the 2018 interview:
- **What they logged.** An in-house metric server recorded anonymous data on every death or win: enemies, cards, relics, events and choices ([talk summary](https://briefread.pages.dev/en-GB/summary/slay-the-spire-metrics-driven-design)). They grew "from three graphs to at least 90" ([Game Developer 2018](https://www.gamedeveloper.com/design/how-i-slay-the-spire-i-s-devs-use-data-to-balance-their-roguelike-deck-builder)).
- **Key metrics.**
  - **Pick rate**: how often a card is taken when offered. Very low means the card is "effectively absent from the game".
  - **Appearance in winning decks**: very high means overpowered.
  - What players took *instead*.
  - **Average damage taken from specific enemies by decks containing a given card.** This per-encounter, per-card damage metric is how they tied enemy design to card design.
- **Examples.**
  - Dual Wield had a low pick rate, so they buffed it. It was then "totally broken" because it allowed infinites, so they restricted it.
  - Awakened One data showed that Power-heavy decks struggled, so they slowed its Curiosity Strength gain and raised its base damage instead, and the win rate against it improved.
  - Madness *looked* overpowered only because players picked it late in already-winning runs. This is selection bias; the metric must be read in context ([talk summary](https://briefread.pages.dev/en-GB/summary/slay-the-spire-metrics-driven-design)).
  - "Super playtesters" with very many runs skew averages, so they weight by player.
- **Principles.**
  - "Going infinite is the number one thing we try to make really rare."
  - "The numbers are really useful but they're not telling us how things feel."
  - "A single well-reasoned post is a lot more useful than lots of players saying 'nerf this'" ([Game Developer 2018](https://www.gamedeveloper.com/design/how-i-slay-the-spire-i-s-devs-use-data-to-balance-their-roguelike-deck-builder)).
  - Balance means every card has a role (a build-around or a staple). It does not mean equal power ([talk summary](https://briefread.pages.dev/en-GB/summary/slay-the-spire-metrics-driven-design)).
  - Strong combos are acceptable in single player if they are rare and hard to assemble ([Road to the IGF](https://www.gamedeveloper.com/game-platforms/road-to-the-igf-mega-crit-games-i-slay-the-spire-i-)).
- **Ascension as a balance tool.** Ascension let them tune difficulty for expert players without making the base game harder for newcomers ([talk summary](https://briefread.pages.dev/en-GB/summary/slay-the-spire-metrics-driven-design)).
- **Win rates.** I found no published *target* win rate from Mega Crit. Observed figure: about 9% of all runs in Mega Crit's 2020 data dump (about 18M runs) were wins ([Foxrow](https://foxrow.com/slay-the-spire-statistical-analysis)). That includes every ascension level and abandoned runs.
- **Process.** About 2.5 years of development before Early Access; weekly patches; a beta branch with daily builds; more than 18,000 pieces of feedback through a Discord bot; expert Netrunner players recruited to break the game; the third character (Defect) was the fastest to build because the metrics pipeline already existed.

### 1.22 "No card is bad in every deck" versus trap cards
- The stated goal is that every card has a place, as a build-around or a staple ([talk summary](https://briefread.pages.dev/en-GB/summary/slay-the-spire-metrics-driven-design)). In practice the community considers a handful of STS1 cards near-unpickable (Clash, Reckless Charge, Searing Blow outside niche relic setups, Spot Weakness in many decks; for Silent, Grand Finale, Distraction and Setup). I found **no** Mega Crit statement that trap cards were intentional. The pick-rate metric exists precisely to find and buff these cards (the Dual Wield story). Treat "deliberate trap cards" as an anti-goal. "Narrow cards that are great in one deck" are a goal.

### 1.23 Randomness that is informed (seeded and fair)
- Each run has a seed, with separate RNG streams for card rewards, map, events, potions, shuffles and so on. Daily Climb gives everyone the same seed ([Wikipedia](https://en.wikipedia.org/wiki/Slay_the_Spire)), and players share seeds. Separate streams mean (for example) that taking a different path does not reroll your card rewards, so the game is fair and replayable.
- Randomness is mostly **input** randomness: what is offered and what you draw. It is rarely **output** randomness: there are no hit chances or damage rolls, and the few random-target effects (Lightning orbs, Sword Boomerang) are cheap to compensate. Intent shows the enemy's move, so there is no "random enemy crit" death. Analysis: the player always loses to a known threat they failed to prepare for.

### 1.24 Run length
- About 50 floors in 45-90 minutes. Average *winning* run times in 2020 were Ironclad 58:32, Silent 1:09:11, Defect 1:06:44 and Watcher 1:07:36, and at A1-20 runs lasting 60-80 minutes had the highest win rate ([Foxrow](https://foxrow.com/slay-the-spire-statistical-analysis)). Analysis: an hour is long enough for a deck to grow up and short enough that a loss doesn't hurt. Players keep saying "one more run".

### 1.25 Unlocks and Ascension drive replay
- STS1 unlocks cards and relics per character through score, and unlocks characters by beating the game with the previous one. Ascension 1-20 stacks one penalty per level (section 2). STS2 replaces score unlocks with a **Timeline of "Epochs"**: narrative-history entries unlocked by achievements such as "beat Act 1", "kill 15 elites" or "kill 15 bosses", each unlocking specific cards, relics or potions ([wiki: STS2 Regent](https://slaythespire.wiki.gg/wiki/Slay_the_Spire_2:Regent); [Wikipedia STS2](https://en.wikipedia.org/wiki/Slay_the_Spire_II)). Ascension is cut to 10 levels.

---

## 2. The numbers: STS1's quantitative skeleton (A0 unless stated)

Sources: [wiki.gg](https://slaythespire.wiki.gg) pages Cards, Merchant, Relics, Ascension, Neow, and the individual enemy pages. Enemy values are standard decompile-derived wiki values. Where Ascension changes a number it is shown as "A#: value".

### 2.1 Characters and starters
| | Ironclad | Silent | Defect | Watcher |
|---|---|---|---|---|
| Max HP (A14: -5/-4/-4/-4) | 80 | 70 | 75 | 72 |
| Starting gold | 99 | 99 | 99 | 99 |
| Starter relic | Burning Blood: heal 6 HP at end of combat | Ring of the Snake: draw 2 extra cards on turn 1 | Cracked Core: Channel 1 Lightning at start of combat | Pure Water: add a Miracle (0 cost, Retain, Exhaust, +1 energy) to hand at start of combat |
| Starter deck | 5 Strike, 4 Defend, Bash | 5 Strike, 5 Defend, Neutralize, Survivor | 4 Strike, 4 Defend, Zap, Dualcast | 4 Strike, 4 Defend, Eruption, Vigilance |
| Card pool (Basic/C/U/R) | 3/20/36/16 = 75 | 4/19/33/19 = 75 | 4/18/36/17 = 75 | 4/19/35/17 = 75 |

**Starter card values** (base → upgraded):
- Strike: 1 energy, 6 → 9 damage.
- Defend: 1 energy, 5 → 8 Block.
- Bash: 2 energy, 8 damage + 2 Vulnerable → 10 + 3.
- Neutralize: 0 energy, 3 damage + 1 Weak → 4 + 2.
- Survivor: 1 energy, 8 Block, discard 1 → 11 Block.
- Zap: 1 energy, Channel Lightning → cost 0.
- Dualcast: 1 energy, Evoke your next Orb twice → cost 0.
- Eruption: 2 energy, 9 damage, enter Wrath → cost 1.
- Vigilance: 2 energy, 8 Block, enter Calm → 12 Block.

**Core debuff maths**:
- Vulnerable: target takes +50% attack damage.
- Weak: target deals -25% attack damage.
- Frail: target gains -25% Block from cards.
- Strength / Dexterity: +1 damage per hit / +1 Block per card, per stack.

### 2.2 Turn economy
- Energy: 3 per turn. Unspent energy is lost (Ice Cream keeps it).
- Draw: 5 cards per turn.
- Hand size: maximum 10 cards. Cards drawn beyond that go to the discard pile.
- End of turn: discard the hand (except Retain), lose Block (except with Barricade, Calipers or Blur).

### 2.3 Card pools, rarities, other card types
- Colourless cards:
  - **20 Uncommon**: Bandage Up, Blind, Dark Shackles, Deep Breath, Discovery, Dramatic Entrance, Enlightenment, Finesse, Flash of Steel, Forethought, Good Instincts, Impatience, Jack of All Trades, Madness, Mind Blast, Panacea, Panic Button, Purity, Swift Strike, Trip.
  - **15 Rare**: Apotheosis, Chrysalis, Hand of Greed, Magnetism, Master of Strategy, Mayhem, Metamorphosis, Panache, Sadistic Nature, Secret Technique, Secret Weapon, The Bomb, Thinking Ahead, Transmutation, Violence.
  - About 15 **Special** (generated only): Shiv, Miracle, Smite, Safety, Insight, Through Violence, Expunger, Beta, Omega, Bite, Apparition, J.A.X., Ritual Dagger, Become Almighty, Fame and Fortune, Live Forever.
- **Curses (14)**: Ascender's Bane, Clumsy, Curse of the Bell, Decay, Doubt, Injury, Necronomicurse, Normality, Pain, Parasite, Pride, Regret, Shame, Writhe.
- **Statuses (5)**: Burn, Dazed, Slimed, Void, Wound.
- Card reward odds (base, before the pity offset) ([wiki: Cards](https://slaythespire.wiki.gg/wiki/Cards)):

| Source | Common | Uncommon | Rare |
|---|---|---|---|
| Normal combat | 60% | 37% | 3% |
| Elite | 50% | 40% | 10% |
| Shop | 54% | 37% | 9% |
| Boss | n/a | n/a | 100% |

- **Rare pity**: the effective rare chance starts at base - 5%. Each **Common rolled** adds +1%, taken from the common share. It resets to -5% when a rare is rolled. Only card rewards move the counter.
- **Upgraded card rewards**: 0% in Act 1, rising in Act 2 and Act 3 (community figures: about 25% and 50%). Halved at A12.
- Reward size: 3 cards (Question Card +1, Busted Crown -2, Prayer Wheel adds a second reward from normal fights).

### 2.4 Relics (STS1 total 180, plus 13 Blights in the Endless mode)
| Rarity | Count | Of which class-specific |
|---|---|---|
| Starter | 4 | 4 |
| Common | 36 | 4 |
| Uncommon | 36 | 8 |
| Rare | 34 | 9 |
| Boss | 30 | 11 (includes the 4 starter upgrades: Black Blood, Ring of the Serpent, Frozen Core, Holy Water) |
| Shop | 20 | 4 |
| Event | 18 | 0 |
| Special | 2 | 0 |

Drop weights: general 50% common / 33% uncommon / 17% rare. Small chest 75/25/0. Medium chest 35/50/15. Large chest 0/75/25 ([wiki: Relics](https://slaythespire.wiki.gg/wiki/Relics)). Elites always drop one relic (Black Star: two).

### 2.5 Gold, shop, removal
- Gold income: normal combat 10-20, elite 25-35, boss about 100 (95-105; A13: -25%). Events and chests vary.
- Shop prices (gold, base; A16: +10%) ([wiki: Merchant](https://slaythespire.wiki.gg/wiki/Merchant)):

| Item | Price |
|---|---|
| Common card | 45-55 |
| Uncommon card | 68-83 |
| Rare card | 135-165 |
| Colourless uncommon | 81-99 |
| Colourless rare | 162-198 |
| Common / Shop relic | 143-158 |
| Uncommon relic | 238-263 |
| Rare relic | 285-315 |
| Common potion | 48-53 |
| Uncommon potion | 71-79 |
| Rare potion | 95-105 |
| **Card removal** | **75, +25 per previous removal** (Smiling Mask: fixed 50) |

- Shop layout: 5 class cards (2 Attacks, 2 Skills, 1 Power; one at 50% off), 2 colourless cards, 3 relics (the rightmost always Shop-rarity), 3 potions (65/25/10 common/uncommon/rare), 1 removal.

### 2.6 Map and act structure
- Acts 1-3: 15 floors of rooms plus the boss on floor 16 (17 counting the boss chest). Act 4 (optional, needs 3 keys): rest, shop, elite (Spire Shield 110 HP + Spire Spear 160 HP), then the Corrupt Heart. Floors numbered 1-55 including Act 4.
- Map: 7 columns x 15 rows, 6 generated paths (they merge and split).
- Fixed floors: floor 1 is a Monster, floor 9 a Treasure, floor 15 a Rest Site, then the Boss.
- Restrictions: no Elites or Rest Sites in the first 5 floors; no Rest Site on floor 14; the same special room type cannot appear twice in a row on a path.
- Approximate room weights for the remaining slots: Monster about 53%, Event (?) 22%, Rest 12%, Elite 8% (A1: x1.6), Shop 5%.
- "?" rooms: roughly 10% Monster, 3% Shop, 2% Treasure, otherwise an Event. The Monster/Shop/Treasure chance grows each time it doesn't trigger.
- **Typical rooms per act** on a single path (analysis from the weights): about 5-8 normal fights, 1-3 elites (2-4 at A1+), 1 boss, 3-5 rest sites (one fixed), 0-2 shops, 2-5 events. Act 1 uses a "weak" pool for its first 3 normal fights (Acts 2-3: 2).
- Healing: rest = 30% of Max HP. After each boss, full heal (A5+: 75% of missing HP).
- Potions: 3 slots (A11+: 2). After-combat drop chance starts at 40%, -10% when one drops, +10% when none drops. Elites and bosses use the same roll.
- Max HP sources: Neow (+8/6/7/7 small, +16/12/14/14 large, Ironclad/Silent/Defect/Watcher); Feed (+3, upgraded +4 on kill); Strawberry +7; Pear +10; Mango +14; Lee's Waffle +7 and full heal; various events; Singing Bowl +2 per skipped reward.

### 2.7 Neow's blessing (run start) ([wiki: Neow](https://slaythespire.wiki.gg/wiki/Neow))
If the previous run reached the Act 1 boss, Neow offers 4 choices, one from each row:
1. **Card row**: remove a card / transform a card / upgrade a card / choose 1 of 3 class cards / choose a colourless uncommon / random rare card.
2. **Small row**: Max HP / Neow's Lament (enemies in your next 3 combats have 1 HP) / random common relic / 100 gold / 3 random potions.
3. **Trade row** (a drawback plus a larger reward):
   - Drawbacks: lose Max HP / take damage (3 per 10 current HP) / gain a curse / lose all gold.
   - Rewards: remove 2 cards / transform 2 cards / 250 gold / choose a rare card / choose a colourless rare / random rare relic / large Max HP.
4. **Boss swap**: replace your starter relic with a random boss relic.

If the previous run did not reach the Act 1 boss, there are only 2 choices: Max HP or Neow's Lament.

### 2.8 Ascension (STS1, cumulative) ([wiki: Ascension](https://slaythespire.wiki.gg/wiki/Ascension))
| Level | Effect |
|---|---|
| 1 | About 60% more elites |
| 2 | Normal enemies deal more damage |
| 3 | Elites deal more damage |
| 4 | Bosses deal more damage |
| 5 | Heal only 75% of missing HP after bosses |
| 6 | Start the run at 90% HP |
| 7 | Normal enemies have more HP (and sometimes more Block) |
| 8 | Elites have more HP |
| 9 | Bosses have more HP |
| 10 | Start with Ascender's Bane (an unremovable, Ethereal, unplayable curse) |
| 11 | One fewer potion slot |
| 12 | Upgraded card rewards half as often |
| 13 | Bosses drop 25% less gold |
| 14 | Lower Max HP (-5 Ironclad, -4 others) |
| 15 | Events are harsher |
| 16 | Shops cost 10% more |
| 17 | Normal enemies get harder movesets |
| 18 | Elites get harder movesets |
| 19 | Bosses get harder movesets |
| 20 | Two bosses at the end of Act 3 |

Pattern: damage first, then economy, then HP, then AI. Each level touches exactly one lever, so data can attribute difficulty to that lever.

### 2.9 Enemy HP and damage by act (A0)
| | Act 1 | Act 2 | Act 3 |
|---|---|---|---|
| Weak / small normals | Louse 10-17, small slimes 8-16, Gremlins 8-24 | Byrds 25-31 (x3), Spheric Guardian 20 HP + 40 Block | Repulsor 29-35, Exploder 30, Spiker 42-56 |
| Normals | Jaw Worm 40-44, Cultist 48-54, Looter 44-48, Slavers 46-50, Fungi Beast 22-28 | Chosen 95-99, Shelled Parasite 68-72, Snake Plant 75-79, Snecko 114-120, Centurion 76-80 + Mystic 48-56 | Darklings 48-56 (x3), Orb Walker 90-96, Writhing Mass 160, Spire Growth 170, Maw 300, Transient 999 (leaves after 5 turns) |
| Elites | Gremlin Nob 82-86, Lagavulin 109-111, Sentries 3x 38-42 | Gremlin Leader 140-148 (+ gremlins), Book of Stabbing 160-162, Slavers (Taskmaster 54-60 + 2x 46-50) | Giant Head 500, Nemesis 185 (Intangible every other turn), Reptomancer 180-190 (+ daggers) |
| Bosses | Slime Boss 140, Guardian 240, Hexaghost 250 | Bronze Automaton 300, Collector 282, Champ 420 | Awakened One 300 + 300, Time Eater 456, Donu & Deca 250 each |
| Typical single hit | 5-14 (elites 14-18; boss peaks 32-35) | 10-20 (Automaton Hyper Beam 45; Champ Execute 10x2) | 15-35 (Giant Head escalates 30+; Nemesis Scythe 45; Awakened One Dark Echo 40) |

Act 4: Corrupt Heart 750 HP (A9: 800). Beat of Death (1 damage per card played), Invincible (at most 300 damage per turn), Blood Shots 2x12, Echo 40, then +2 Strength each cycle.

Rule of thumb (analysis): each act raises total enemy HP about 2-2.5x and expected incoming damage per turn about 1.5-2x. The player's deck has to scale faster than that.

### 2.10 Act 1 move sets (A0; Ascension values in brackets)
- **Jaw Worm** (40-44 HP): always opens with Chomp 11 (A2: 12). Then Thrash 7 + 5 Block, or Bellow (+3 Strength, A2: +4; A17: +5 and 9 Block; +6 Block base). Weighted random with no repeats.
- **Cultist** (48-54): turn 1 Incantation, gaining Ritual 3 (A2: 4; A17: 5), which means +3 Strength at the end of each of its turns. Then Dark Strike 6 every turn, so it hits 6, 9, 12, ... A pure "kill it fast" scaling test.
- **Louse, red/green** (10-15 / 11-17): Bite 5-7 (the value is rolled per louse at combat start). Curl Up: the first time it is hit it gains 3-7 Block. Red: Grow (+3 Strength). Green: Spit Web (2 Weak). Usually come in pairs.
- **Gremlin Nob** (82-86): Bellow, gaining Enrage 2 (A18: 3), then Rush 14 (A3: 16) and Skull Bash 6 + 2 Vulnerable (A3: 8).
- **Lagavulin** (109-111): Asleep with Metallicize 8. Wakes after 3 turns or when it takes HP damage. Pattern: Attack 18 (A3: 20), Attack, Siphon Soul (-1 Strength, -1 Dexterity; A18: -2/-2).
- **Sentries** (3x 38-42, Artifact 1): the outer two start with Bolt (add 2 Dazed; A18: 3), the middle one starts with Beam 9 (A3: 10). They alternate, so the pattern is staggered.
- **Slime Boss** (140; A9: 150): Goop Spray (3 Slimed; A19: 5), Preparing, Slam 35 (A4: 38). At 50% HP or less it Splits into an Acid Slime (L) and a Spike Slime (L), each at its current HP.
- **The Guardian** (240; A9: 250): Charging Up (9 Block), Fierce Bash 32 (A4: 36), Vent Steam (2 Weak + 2 Vulnerable), Whirlwind 5x4. Mode Shift after 30 damage (A9: 35, A19: 40), +10 per shift. Defensive Mode: +20 Block, Sharp Hide 3 (A19: 4), Roll Attack 9, Twin Slam 8x2, then back to offence.
- **Hexaghost** (250; A9: 264): Activate (turn 1, no action), Divider ((your current HP / 12 + 1) x 6), Sear 6 + 1 Burn (A19: 2), Tackle 5x2 (A4: 6x2), Inflame (+2 Strength, A19: +3; +12 Block), Inferno (2x6; A4: 3x6; upgrades all Burns). A fixed 7-move cycle.

---

## 2b. STS2 numbers worth knowing (Early Access, launched 5 March 2026)
- Characters: Ironclad **80 HP**, Silent **70**, Defect **75**, Regent **75**, Necrobinder **66**.
- Starting gold 99.
- Starter decks: Ironclad 5 Strike / 4 Defend / Bash; Silent 5/5 + Neutralize + Survivor; Defect 4/4 + Zap + Dualcast; Regent 4/4 + Falling Star + Venerate; Necrobinder 4/4 + Bodyguard + Unleash. ([wiki.gg STS2 character pages](https://slaythespire.wiki.gg/wiki/Slay_the_Spire_2:Ironclad))
- Every class pool is **80 cards: 20 common / 35 uncommon / 25 rare**, plus 5 multiplayer-only cards and 2 Ancient-only cards. That is more rares and fewer uncommons than STS1.
- Removal: 75 + 25 (A6: 100 + 50). Potion slots: 3 (A4: 2). ([wiki: STS2 Mechanics](https://slaythespire.wiki.gg/wiki/Slay_the_Spire_2:Mechanics))
- Ascension cut to **10 levels** ([wiki: STS2 Ascension](https://slaythespire.wiki.gg/wiki/Slay_the_Spire_2:Ascension)):
  1. Swarming Elites (+60% elites)
  2. Weary Traveler (Ancients heal only 80% of missing HP)
  3. Poverty (-25% gold)
  4. Tight Belt (-1 potion slot)
  5. Ascender's Bane
  6. Inflation (removal 100, +50 each)
  7. Scarcity (rare and upgraded cards half as often)
  8. Tough Enemies
  9. Deadly Enemies
  10. Double Boss
- Note: healing between acts now comes from the **Ancient** encounter, not the boss.

---

## 3. Catalogue of existing mechanics to avoid copying

**How to use this list.** A new mechanic is a "copy" if it has the same *trigger + effect + resource shape* as an entry below, even under a new name. Example: "Fury: +1 damage per stack to every hit" is just Strength. Test a candidate against three questions:
1. Does it change damage, Block or draw by a flat or percentage amount per stack? That is Strength, Dexterity, Vulnerable, Weak or Frail.
2. Does it persist and tick down each turn? That is Poison, Regen or Plating.
3. Does it store something that fires on later turns? That is Orbs, Dark orb, Lock-On or The Bomb.

STS1 entries come from the wiki ([slaythespire.wiki.gg](https://slaythespire.wiki.gg)) plus general knowledge of the game; they are high confidence. STS2 entries carry a confidence tag:
- **[H]**: wiki.gg STS2 pages, the game-file-derived [spire-codex](https://spire-codex.com/reference), Mega Crit, or two or more agreeing sources.
- **[M]**: one decent secondary source.
- **[L]**: one weak or contradicted source.

### 3.1 STS1: combat stats, buffs and debuffs (player and/or enemy)
- **Stat-like stacks**:
  - Strength (+X damage per hit), Dexterity (+X Block per card), Focus (+X orb output).
  - Temporary versions: Flex/Shackle-style "gain/lose X this turn" Strength.
  - Ritual (gain X Strength each turn); Strength Down; Dexterity Down; Focus loss (Biased Cognition).
- **Multipliers**: Vulnerable (+50% damage taken), Weak (-25% damage dealt), Frail (-25% Block), Double Damage (Phantasmal Killer), Pen Nib (every 10th attack doubles), Wrath/Divinity damage multipliers.
- **Defence**:
  - Block, which expires at the start of your turn.
  - Keeping Block: Barricade, Blur, Calipers (keep all but 15).
  - Plated Armor (Block each turn; lost when you take unblocked damage), Metallicize (flat Block each turn).
  - Thorns (damage attackers), Flame Barrier.
  - Artifact (negates the next debuff), Buffer (prevents the next HP loss), Intangible (all damage reduced to 1).
  - Invincible (Heart's damage cap per turn), Malleable (gains growing Block each time it is hit), Curl Up (one-time Block when first hit), Reactive (changes intent when hit), Shifting (loses Strength when damaged), Sharp Hide.
- **Damage over time / delayed effects**:
  - Poison (lose X HP each turn, then X-1). Corpse Explosion (on death, deals damage equal to Max HP to all). Envenom (unblocked damage applies Poison). Noxious Fumes.
  - Constricted (lose X HP each turn). Choked (lose HP per card played this turn).
  - The Bomb (delayed AoE). Combust. Lock-On (Lightning/Dark orbs deal +50% to the target). Mark (Pressure Points: Mark deals damage to all marked).
  - Fading (dies after X turns). Explosive (explodes after X turns). Beat of Death (Heart: damage per card you play).
- **Healing**: Regen (heal X then X-1), Repair/Self Repair (heal at combat end), Feed, Reaper (heal for unblocked damage), Bite.
- **Action economy and card flow**:
  - Energized / next-turn energy, Draw Card next turn, Draw Reduction, No Draw (Bullet Time, Battle Trance).
  - Entangled (cannot play Attacks this turn; Red Slaver), Confused (random card costs; Snecko Eye/Snecko enemy).
  - Hex (Chosen: playing a non-Attack shuffles in a Dazed), Slow (Giant Head: +10% damage taken per card played), Time Warp (Time Eater: every 12 cards played ends your turn).
  - Stasis (Bronze Orb steals a card), Thievery (steals gold).
  - Vigor (next attack +X; Watcher), Mantra (10 → Divinity), Free Attack (next Attack costs 0).
- **Copy / replay**: Double Tap (next Attack played twice), Burst (next Skill twice), Amplify (next Power twice), Duplication (next card twice), Echo Form (first card each turn twice), Necronomicon (2+ cost Attack twice, once per turn).
- **Signature powers (the effect itself is the mechanic)**:
  - Ironclad: Demon Form (+Strength each turn), Corruption (Skills cost 0 and Exhaust), Dark Embrace (draw on Exhaust), Feel No Pain (Block on Exhaust), Juggernaut (damage on gaining Block), Rage (Block when playing Attacks), Rupture (Strength when losing HP from cards), Brutality, Berserk, Combust, Evolve (draw on Status), Fire Breathing (damage on Status/Curse draw), Barricade, Metallicize, Inflame, Limit Break, Entrench.
  - Silent: Wraith Form (Intangible, lose Dexterity each turn), After Image (Block per card), A Thousand Cuts (damage per card), Infinite Blades, Accuracy, Tools of the Trade, Well-Laid Plans, Caltrops, Footwork, Nightmare (copy a card 3 times next turn), Envenom.
  - Defect: Storm, Static Discharge, Heatsinks, Loop, Hello World, Creative AI, Electrodynamics, Machine Learning, Self Repair, Echo Form, Buffer, Biased Cognition.
  - Watcher: Mental Fortress (Block on stance change), Rushdown (draw on entering Wrath), Like Water, Nirvana (Block on Scry), Foresight (Scry each turn), Study (add Insight), Establishment (retained cards cost less), Deva Form (energy ramp), Devotion (Mantra each turn), Master Reality (created cards upgraded), Battle Hymn (add Smites), Wave of the Hand (Block applies Weak), Fasting (+Strength/Dexterity, -energy), Blasphemy (Divinity, die next turn), Omega.
  - Colourless: Magnetism, Mayhem (auto-play top card), Panache (damage every 5 cards), Sadistic Nature (damage on debuff), The Bomb.

### 3.2 STS1: card keywords, card types and card-flow rules
- **Types**: Attack, Skill, Power, Status, Curse.
- **Keywords**: Exhaust, Ethereal, Innate, Retain, Unplayable, X-cost.
- **Operations**: Upgrade (once; Searing Blow unlimited), Transform, Remove/Purge, Scry X (look at the top X, discard any), Discard (with on-discard triggers: Reflex, Tactician, Sneaky Strike/Eviscerate cost changes), "Shuffle into draw pile", "put on top of draw pile" (Headbutt, Hologram/Seek-style tutors).
- **Generated tokens**: Shiv (0 cost, 4 damage, Exhaust), Miracle (+energy), Smite, Safety, Insight (draw), Through Violence, Expunger, Beta → Omega chain, Bite, Apparition (Intangible), J.A.X.
- **Statuses**: Wound, Dazed (Ethereal), Burn (end-of-turn damage), Slimed (1 energy, Exhaust), Void (lose 1 energy on draw, Ethereal).
- **Curses (14)**:
  - Ascender's Bane: unremovable.
  - Pain: lose HP per card played.
  - Normality: maximum 3 cards per turn.
  - Regret: lose HP per card in hand.
  - Decay, Doubt, Shame: end-of-turn penalties.
  - Writhe: Innate. Parasite: lose Max HP if removed. Necronomicurse: returns when exhausted. Curse of the Bell: unremovable. Pride: Innate, copies itself.
  - Clumsy, Injury: dead draws.
- **Cost manipulation**: random cost (Snecko), "costs 0 this turn" (Enlightenment, Madness), cost decreasing per turn in hand or per play (Streamline, Eviscerate, Masterful Stab increases), Claw-style permanent combat-long growth (Claw, Rampage, Ritual Dagger, Genetic Algorithm and Feed growth that persists across combats).

### 3.3 STS1: class resources and subsystems
- **Ironclad**: Strength scaling; Exhaust as a resource; HP as a resource (self-damage); Block retention.
- **Silent**: Poison stacks; Shivs (0-cost token attacks); discard as a resource; Weak; Intangible.
- **Defect**: **Orbs** with Channel/Evoke and Orb Slots (3 base). Lightning (passive 3 to a random enemy, Evoke 8), Frost (passive 2 Block, Evoke 5), Dark (gains 6 stored damage per turn, Evoke to the lowest-HP enemy), Plasma (passive 1 energy, Evoke 2). Focus. Also: 0-cost Claw synergies; Power-count payoffs.
- **Watcher**: **Stances**:
  - Wrath: deal and take 2x.
  - Calm: +2 energy on exit.
  - Divinity: 3x damage, +3 energy, ends next turn.
  - Neutral.
  - Mantra (reach 10 to enter Divinity), Scry, Retain, Vigor, "end your turn" cards (Vault, Conclude), Miracle.

### 3.4 STS1: enemy mechanics
Intents (with exact damage); Split (slimes); Mode Shift (Guardian); Enrage (Nob, Skills → Strength); Angry (Mad Gremlin, Strength when hit); Curiosity (Awakened One, Powers → Strength); Unawakened/Rebirth (second phase); Time Warp; Invincible + Beat of Death (Heart); Malleable (Snake Plant); Reactive (Writhing Mass); Spore Cloud (Vulnerable to you when it dies); Explosive; Fading (Transient); Shifting; Stasis (Bronze Orb); Minion (dies with its leader); Flight (Byrds: damage halved, Flight lost after several hits, then grounded/stunned); Regrow / Life Link (Darklings revive unless all are killed together); Back Attack / Surrounded (Shield and Spear: attacking the one behind you deals +50%); Painful Stabs (Wound per unblocked hit); Sharp Hide; Thievery and escape (Looter, Mugger); Entangle (Red Slaver net: cannot play Attacks); Hex (Chosen); Slow (Giant Head); Constricted (Spire Growth); Asleep (Lagavulin) with wake triggers; "burning" buffed elites (Emerald Key); summoners (Gremlin Leader, Collector, Reptomancer, Automaton).

### 3.5 STS1: run and meta systems
- Neow's 4-row blessing (section 2.7).
- Map with visible room icons and visible boss.
- Floor rules (treasure on 9, rest before boss).
- Card reward of 3 with skip; rare pity offset.
- Elites drop relics; boss rare-card reward; boss relic choice of 3 (skippable); boss relics that upgrade the starter relic.
- Rest site Rest/Smith plus relic actions: Lift (Girya), Toke (Peace Pipe), Dig (Shovel), Recall (Ruby Key).
- Shop with escalating removal; ? rooms with escalating non-event odds; one-time events with cost/benefit choices; Match and Keep (memory game); A Note For Yourself (pass a card to your next run).
- Potions with slot limit and drop pity.
- Act 4 behind 3 keys:
  - Ruby: Recall at a rest site instead of resting.
  - Emerald: kill a burning elite.
  - Sapphire: skip a chest relic.
- Ascension 0-20; Daily Climb (seeded with modifiers); Custom mode modifiers (Draft, Sealed Deck, Insanity, Specialized, Shiny, Vintage, Allstar, Diverse, Hoarder, Binary, Big Game Hunter, Midas, Night Terrors, Terminal, Flight, Lethality, Time Dilation, Cursed Run, Deadly Events, Controlled Chaos, Inception, Uncertain/Certain Future, Heirloom, colour-card modes); Endless mode with Blights; score-based unlocks per character.

### 3.6 STS2: characters and character-defining mechanics
**Roster**: Ironclad, Silent, Defect, Regent, Necrobinder. Watcher is **not** in STS2 Early Access, and two more characters are confirmed as in development [H] ([Wikipedia STS2](https://en.wikipedia.org/wiki/Slay_the_Spire_II)). STS2 entered Early Access on **5 March 2026** [H] ([Mega Crit](https://www.megacrit.com/news/2026-03-05-early-access-launch/)). It moved to the Godot engine [M].

**Necrobinder** (66 HP; starter relic Bound Phylactery: Summon 1 at the start of each turn) [H] ([wiki](https://slaythespire.wiki.gg/wiki/Slay_the_Spire_2:Necrobinder), [Osty](https://slaythespire.wiki.gg/wiki/Slay_the_Spire_2:Osty)):
- **Osty** [H], a skeletal-hand companion:
  - Absorbs **all unblocked attack damage** aimed at the player before it reaches her. Overflow passes through when he dies. Non-attack HP loss bypasses him.
  - Has his own HP pool and can attack. His attacks **ignore the player's Strength and Weak**, and he cannot be buffed or debuffed except by "Die for You". Enemies and potions cannot target him.
  - Some cards deliberately kill him for value: Sacrifice, Bone Shards.
- **Summon X** [H]: revive Osty with X HP, or raise his Max HP by X while alive.
- **Doom** [H]: a debuff. At the end of the creature's turn, it dies if Doom ≥ its current HP. Doom ignores Block, Slippery and Intangible. Sources: Countdown (apply 6 Doom to a random enemy each turn), Reaper Form (attack damage applies 2x as Doom), Oblivion (each card played adds Doom), Shroud (Block when applying Doom). Neurosurge applies Doom to *yourself*.
- **Soul** [H]: a 0-cost colourless token Skill, "Draw 2. Exhaust." Created by Grave Warden, Reave, Dirge, Capture Spirit, Severance, Seance and Funerary Mask. Payoffs: Haunt (enemy loses HP per Soul played), Devour Life (Summon per Soul), Soul Storm (damage per Soul in the Exhaust pile). Fan sites' claims of a "Graveyard" zone are **false**: the wiki lists only Draw, Hand, Discard and Exhaust piles [H] ([wiki: Soul](https://slaythespire.wiki.gg/wiki/Slay_the_Spire_2:Soul)).
- An **Ethereal**-payoff archetype (Spirit of Ash: Block per Ethereal played; Pagestorm: draw on Ethereal draw; Veilpiercer; Call of the Void), a Retain package (Reap, Eradicate, Snap gives Retain), and energy cards (Friendship, Demesne, Borrowed Time) [H].
- **Regent** (75 HP; starter relic Divine Right: +3 Stars at the start of combat) [H] ([wiki](https://slaythespire.wiki.gg/wiki/Slay_the_Spire_2:Regent)):
  - **Stars** [H]: a second resource, *not passively generated*, that **persists between turns**. Star-cost cards are cheap in Energy. Convert Stars with Alignment (Stars → Energy) and Stardust (X-cost Stars → damage). Related: Black Hole (damage when spending or gaining Stars), Genesis (+1 Star per turn), Child of the Stars (Block per Star spent), The Sealed Throne (Star per card played).
  - **Forge X / Sovereign Blade** [H]: the first Forge each combat creates the Sovereign Blade, a 2-cost Retain Attack dealing 10 + the total Forged amount. It is shown as a floating sword that grows. Related: Summon Forth (return it to hand), Seeking Edge (AoE), Sword Sage (Replay), Furnace (Forge each turn), Conqueror (Blade deals double to the target), Parry (Blade grants Block).
  - **Card creation** [H]: Spectrum Shift (random colourless each turn), Bundle of Joy, payoffs Arsenal (Strength per created card), Pillar of Creation (Block per created card), Supermassive. Minion cards BEGONE!, CHARGE!!, GUARDS!!! (one-use, transform cards in combat); Vitruvian Minion relic doubles them.
  - Others: Monarch's Gaze (attacked enemy loses Strength this turn), Orbit (every 4 Energy spent gives +1), Pale Blue Dot, Royalties (+25 gold after combat) [H].
- **Silent (STS2)**: **Sly** [H], a card that is *discarded* during your turn is played for free. One fan site describes Sly as "cards played first get enhanced" [L]; that description is wrong. Master Planner (Skills gain Sly), Accelerant (Poison triggers an extra time), Outbreak (AoE every 3 Poison applications), Phantom Blades, Fan of Knives (Shivs hit all), Corrosive Wave, Serpent Form [H].
- **Ironclad (STS2)**: a Vulnerable archetype (Dominate, Colossus: take 50% less from Vulnerable enemies), Inferno (HP lost on your turn deals AoE), Crimson Mantle, Tear Asunder, Molten Fist, Expect a Fight, Hellraiser (drawn Strikes auto-play), Stampede, Cruelty (Vulnerable enemies take more), Tank / Intercept (multiplayer) [H].
- **Defect (STS2)**: a **Glass** orb [H] (passive 4 damage to all enemies, decreasing by 1 per use; Evoke deals double the passive to all). Plus Spinner (Channel Glass each turn), Hailstorm, Coolant, Consuming Shadow, Iteration, Smokestack (damage when you create Statuses), Trash to Treasure, Automation (energy every 10 draws), Thunder [H].

### 3.7 STS2: new card keywords and card systems
- **Eternal** [H]: cannot be removed or transformed (replaces STS1's "cannot be removed" text on curses).
- **Fatal** [H]: triggers when the card kills a non-minion enemy.
- **Replay X** [H]: the card is played an extra X times. Sources stack: Glam, Spiral, Sword Sage, Hidden Gem. A fan site says Replay returns the card to the top of the draw pile [L]; that is contradicted.
- **Sly** [H] (above). **Unplayable** [H] (exists in STS1, now formalised).
- **Enchantments** [H]: permanent per-card modifiers that stack with upgrades, one per card. 22 are known ([spire-codex guide](https://spire-codex.com/guides/enchantments-guide)):
  - Adroit (+Block), Clone (duplicate at a rest site), Corrupted (+50% damage, costs HP), Glam (Replay once per combat), Goopy (Exhaust; +1 Block permanently per play).
  - Imbued (auto-plays at the start of combat), Inky (+1 damage, 1 Weak), Instinct (double attack damage), Momentum (+damage each play this combat), Nimble (+Block), Perfect Fit (goes to the top of the draw pile).
  - Royally Approved (Innate + Retain), Sharp (+damage), Slither (random 0-3 cost on draw), Slumbering Essence (cost -1 each turn held), Soul's Power (removes Exhaust), Sown (first play gives energy), Spiral (Replay 1).
  - Steady (Retain), Swift (first play draws X), Tezcatara's Ember (Strikes become 0 cost, +3 damage, Eternal), Vigorous (first play each combat +X damage).
- **Afflictions** [H]: *enemy-applied*, temporary per-card debuffs that clear after combat:
  - Bound: only one Bound card can be played per turn.
  - Entangled: +1 cost.
  - Galvanized: take X damage when played.
  - Hexed: becomes Ethereal.
  - Ringing: only one card this turn.
  - Smog: no more Skills this turn.
  - Tainted: playing it gives you Tainted.
  - There is an enemy intent for this, "Malicious".
- **Quest cards** [H] ([patch v0.109.0](https://slaythespire2.net/changelog/v0.109.0), [PC Gamer](https://www.pcgamer.com/games/roguelike/slay-the-spire-2-byrdonis-egg)): unplayable deck cards that turn into a reward when a condition is met. Byrdonis Egg (an event gives it; hatching it uses a rest-site action and turns it into Byrd Swoop, 0 cost, 14 damage); Dowsing (after 5 more ? rooms it becomes Abundance).
- **Ancient cards** [H]: character cards (e.g. Defect's Quadcast and Biased Cognition, Necrobinder's Protector and Forbidden Grimoire, Regent's Meteor Shower and The Sealed Throne) available only through Ancients, such as Darv's Dusty Tome.
- **Multiplayer-only cards** [H]: 5 per character, e.g. Tank, Intercept, Beacon of Hope, Huddle Up, Hammer Time, Tag Team, Flanking.
- **"Cursed Powers"** (a full-art rare Power type with a big drawback) [L]: one fan source only.
- **Downgraded cards** [H]: the enemy power Dampen downgrades all your cards while the Magi Knight lives.
- **Wither** [H]: a status from the Act 3 boss Aeonglass. It deals end-of-turn damage, and its behaviour was patched repeatedly in 0.106 ([Kotaku](https://kotaku.com/slay-the-spire-2-patch-update-nerfs-buffs-elite-tainted-aeonglass-wither-2000698644)).
- **Transform in combat** [H]: e.g. Primal Force turns Attacks into Giant Rocks; Entropy.

### 3.8 STS2: new buffs and debuffs (selected; spire-codex lists about 257 powers [H], [spire-codex powers](https://spire-codex.com/powers))
- **Renamed or reshaped STS1 ideas** (still off-limits): Plating (was Plated Armor), Slippery (next X HP losses reduced to 1), Hard to Kill / Hardened Shell (damage caps, like Heart's Invincible), Tangled (Attacks cost +1), Smoggy (only one Skill per turn), Sloth (at most 3 cards per turn; like Normality/Velvet Choker), Mind Rot (draw 1 fewer), Waste Away (-1 energy per turn), Shrink (-30% attack damage), Tender (each card played: lose Strength/Dexterity), Debilitate (Vulnerable and Weak twice as strong), Strangle (enemy loses HP per card you play), Slow, Free Attack/Skill/Power, Shadowmeld (double Block), Unmovable.
- **Genuinely new shapes** (do not reuse these either):
  - Paper Cuts: unblocked damage costs **Max HP**.
  - Imbalanced: an enemy becomes Stunned if its attacks are fully Blocked.
  - Plow/Shriek: an enemy is stunned when it reaches an HP threshold.
  - Burrowed: Block persists; stunned if the Block is broken.
  - Soar/Flutter: halves Attack damage; hits stun it.
  - Personal Hive: hitting it adds Dazed.
  - Sandpit: eaten and dies in 2 turns.
  - Ravenous: Corpse Slug eats dead allies.
  - Reattach: segments revive.
  - Illusion: revives at full HP.
  - Hatch / Infested / Stock: summons on death or on a timer.
  - Escape Artist; Heist / Possess Strength / Swipe: steals gold, stats or a card, returned on kill.
  - Magic Bomb (take 20 at end of turn unless the caster dies); Disintegration; Time Limit (kill the dummy within X turns).
  - Covered / Intercept (attack redirection); Flanking, Knockdown, Tag Team (multiplayer focus-fire markers).
  - Back Attack / Surrounded (existed in STS1 on Shield/Spear).
- **New intents** [H]: Malicious (afflict cards), Death Blow (attack then die), Summon, Status, Cowardly (escape).

### 3.9 STS2: run, map, meta and economy systems
- **Ancients** [H] ([wiki](https://slaythespire.wiki.gg/wiki/Slay_the_Spire_2:Ancients)):
  - They replace STS1's boss-relic screen. The roster is Neow (Act 1 start), Orobas / Pael / Tezcatara (Act 2), Nonupeipe / Tanx / Vakuu (Act 3), and Darv (Act 2 or 3 once unlocked).
  - Each offers themed blessings or relics, often with drawbacks. The choice **cannot be skipped**. Meeting one also heals you (A2: 80% of missing HP).
  - Examples: Orobas's Archaic Tooth (upgrades a starter card into a class-specific card), Darv's Dusty Tome (Ancient cards), Tezcatara's Heap of Coals (Strikes become Eternal and empowered), Toy Box, The Golden Path.
- **Wax relics** [M]: temporary relics from Tezcatara's Toy Box. The leftmost melts after every 3 combats ([allthings.how](https://allthings.how/how-wax-relics-work-in-slay-the-spire-2-and-why-theyre-worth-picking)).
- **Alternate acts** [H]: each act slot has variants chosen per run. Act 1 is Overgrowth or Underdocks; Act 2 is the Hive; Act 3 is the Glory. Bosses include Vantom, Ceremonial Beast and Kin Priest (Overgrowth); Soul Fysh, Waterfall Giant and Lagavulin Matriarch (Underdocks); Kaiser Crab, The Insatiable and Knowledge Demon (Hive); Queen, Test Subject, Aeonglass and formerly Doormaker (Glory) [M; names vary by patch] ([sportskeeda](https://www.sportskeeda.com/esports/all-bosses-slay-spire-2)).
- **Timeline / Epochs** [H]: a unified, lore-framed progression track. Achievements unlock cards, relics, potions, Ancients, characters and acts, replacing STS1's per-character score unlocks.
- **4-player co-op** [H]: shared enemy debuffs, enemy HP that scales with player count, separate rewards per player, a shared treasure pool, voted map moves, downed players revive at 1 HP after combat. Multiplayer cards exist ([wiki: Mechanics](https://slaythespire.wiki.gg/wiki/Slay_the_Spire_2:Mechanics)).
- **Event overhaul** [M]: Mega Crit reportedly removed consequence-free event options, so every option has a cost and rewards are larger ([wiz.jock.pl](https://wiz.jock.pl/sts2/mechanics/)). Events appear once per run, with per-act and shared pools [H].
- **Rest-site actions from relics and cards** [H]: e.g. Clone (enchantment, duplicate a card at rest), egg hatching, Mend (co-op heal).
- **Custom-mode modifiers** [H]: All Star, Big Game Hunter, Binary, Cursed Run, Deadly Events, Draft, Flight, Hoarder, Insanity, Midas, Murderous (everyone starts with 3 Strength), Night Terrors, Sealed Deck, Specialized, Terminal, Vintage.
- **Ascension 1-10** [H] (section 2b).
- **Badges, Bestiary, Phobia Mode** [M].

### 3.10 Items in the brief that I could NOT verify; treat as false unless proven
- **"Favor"** as an STS2 resource: no evidence found.
- **Regent "Immolate"**: Immolate is an STS1 Ironclad card (21 AoE damage, adds a Burn). The Regent's resources are Stars and Forge.
- **Regent "Grandeur"**: no evidence found.
- **STS2 "Stance changes"**: Watcher, and with it stances, is absent from STS2 Early Access. No stance system was found.
- **A Necrobinder "Graveyard" zone**: contradicted by the wiki.
- **Necrobinder "ghost" mechanics**: the ghost flavour is expressed through Soul tokens, Ethereal synergies, Haunt and Banshee's Cry. There is no separate "ghost" keyword.

### 3.11 Design-space implication (analysis)
Between them, STS1 and STS2 cover nearly every *simple* layer:
- flat or percentage stat modifiers;
- damage over time and delayed execute (Poison, Doom);
- a second persistent resource (Stars, Mantra);
- a companion that soaks damage (Osty);
- a growing summoned weapon (Sovereign Blade);
- slot-based passive emitters (Orbs);
- stances;
- per-card permanent modifiers (Enchantments) and per-card temporary debuffs (Afflictions);
- cards that transform when a condition is met (Quests).

To be genuinely new, a mechanic probably needs a new **axis**, not a new number. Unused or underused axes:
- **Spatial**: board position or lanes. Cobalt Core and Monster Train use these, so avoid copying them too.
- **Order and sequence within a turn**: e.g. adjacency in hand.
- **Information**: hidden or partial intents as a resource the player spends to reveal.
- **Enemy-turn interaction**: reactions or interrupts.
- **Cross-combat state on enemies**: an act-level nemesis.
- **Deck-composition-as-stat**: values computed from deck contents.
- **Tempo and clock**: a shared timeline like Wildfrost counters, which are also taken.

The team should log every candidate mechanic against sections 3.1-3.9.

---

## 4. Known failure modes of STS-likes, and the positive lessons

### 4.1 Generic failure modes (each with the STS mechanism that prevents it)
1. **Too much healing.** If HP refills between fights (or heals are cheap), damage taken stops mattering and every fight becomes a separate, low-stakes puzzle. The run loses its attrition arc and elites lose their risk. *STS answer*: 30% rest that competes with upgrading, a 6-HP Burning Blood, scarce heal potions, and a full heal only at act boundaries (and STS2 cuts even that to 80% at A2).
2. **No reason to skip.** If adding a card is never bad (no dilution, deck size rewarded, or a "best N cards" draw), the reward screen is never a decision. *STS answer*: random draw from the whole deck and a 5-card hand; removal costs gold. Roguebook deliberately *inverted* this by unlocking hero talents at deck-size thresholds (about 14/18/22/26/30/34 cards; [gamepretty](https://gamepretty.com/roguebook-all-talents-list-how-to-unlock/)), which turns bloat into a cost-free choice. Analysis: if you reward size, you must make it a real trade-off.
3. **No deck thinning.** Without removal or transform, starter Strikes dominate every draw forever and decks converge. *STS answer*: shop removal (escalating), Neow removal, events, Exhaust as in-combat thinning, and a starter deck small enough that each removal matters (10-12 cards). Vault of the Void takes the alternative route: a **fixed 20-card deck**, so every pickup is a *swap*, and dilution is replaced by opportunity cost ([Turn Based Lovers](https://turnbasedlovers.com/review/vault-of-the-void)).
4. **Bloated card pools.** These dilute synergies, so archetypes never come together. Giovannetti chose about 75 cards per class specifically to avoid Netrunner-style chaos ([Wikipedia](https://en.wikipedia.org/wiki/Slay_the_Spire)). Monster Train's team called balancing 400+ cards their key challenge ([GamingBolt](https://gamingbolt.com/?p=616305)), and they solved it with *two-clan pairing per run* so the active pool is only two-fifths of the total. Lesson: the **active** pool per run is the metric that matters. Keep it at about 75-90 cards plus a small colourless pool.
5. **Uninformative enemies.** Hidden actions and random crits make deaths feel arbitrary. STS's own first prototype failed for exactly this reason ([Wikipedia: intent origin](https://en.wikipedia.org/wiki/Slay_the_Spire)). Reviewers cite telegraphing as why they "never feel cheated" ([PC PowerPlay via PressReader](https://www.pressreader.com/australia/pcpowerplay/20190513/281616716802637)).
6. **Enemies that ask no question, or a question with no answer.** Stat-stick enemies (just more HP and damage) make acts feel the same. The opposite failure: STS2's first balance beta drew heavy criticism because the Act 3 boss Doormaker was felt to have "almost no reliable counterplay" ([dlcompare summary](https://www.dlcompare.com/gaming-news/mega-crit-comments-on-slay-the-spire-2-s-first-patch)), and it was later replaced by Aeonglass. Lesson: every elite or boss must punish *one* strategy, and there must be at least two common deck shapes that answer it.
7. **Linear power creep with no ceiling.** The player's scaling outpaces enemy HP, so the end of every run is a formality. Monster Train late runs are widely described as solved snowballs. Across the Obelisk players report that "scaling damage seems much more powerful than frontloaded damage", which pushes a dominant build ([Steam review thread](https://steamcommunity.com/app/1385380/discussions/0/3124912256617174527)). *STS answer*: Act 3 bosses check scaling *and* anti-synergy (Time Eater caps card spam; Awakened One taxes Powers; the Heart's Invincible caps damage at 300 per turn). Balatro's answer: the target grows *exponentially* (300 → 800 → 2,000 → 5,000 → 11,000 → 20,000 → 35,000 → 50,000 chips over 8 antes), so linear upgrades fall behind by design and the player is forced into multiplicative engines ([Wikipedia: Balatro](https://en.wikipedia.org/wiki/Balatro)).
8. **Block strictly better than attack** (or the reverse). If defence costs the same as offence but avoids damage that carries between fights, turtling wins. *STS answer*: Block expires each turn, enemies scale (Ritual, Strength gain, Hexaghost Inferno) so stalling loses, and the chip damage you accept is a price you pay to end fights faster. Rule: every defence-only deck must eventually lose to a clock.
9. **Snowball with no comeback.** If early wins compound (more gold, more elites, more relics), the run is decided by floor 10. If early losses compound, the run is dead but not over. *STS answer*: weak-pool opening fights; the boss heal; potions as emergency equalisers; Neow's options scaled by the previous run; elites optional. Analysis: a bad run should fail **fast** or recover, not drag on.
10. **Too many "OK" cards.** A pool of balanced, flavourless 1-energy "deal 8" variants makes every reward screen "take nothing" or "take anything". Mega Crit's rule is that every card is either a staple or a build-around, not equal power ([talk summary](https://briefread.pages.dev/en-GB/summary/slay-the-spire-metrics-driven-design)). Watch pick-rate outliers in *both* directions.
11. **Rewards that are never a decision.** These include auto-picked best options, upgrades with no opportunity cost, and relics without drawbacks at the top tier. Note that STS2 made Ancient choices non-skippable and made every event option carry a cost ([wiki: Ancients](https://slaythespire.wiki.gg/wiki/Slay_the_Spire_2:Ancients); [M] [wiz.jock.pl](https://wiz.jock.pl/sts2/mechanics/)). Mega Crit is moving *toward* "everything is a trade".
12. **Acts that don't change what is asked of the deck.** If Act 3 is Act 1 with higher numbers, the deck has no reason to evolve. STS changes the questions: Act 1 front-load, Act 2 AoE / multi-hit / statuses, Act 3 scaling plus anti-synergy, Act 4 everything. STS2 adds alternate acts so the *question set* varies per run.
13. **Infinite combos that are trivially easy.** "Going infinite is the number one thing we try to make really rare" ([Game Developer 2018](https://www.gamedeveloper.com/design/how-i-slay-the-spire-i-s-devs-use-data-to-balance-their-roguelike-deck-builder)). The flip side: STS2's first patch, which nerfed infinite enablers (Prepared, Expect a Fight, Stoke, Glow, Alignment), triggered a review bomb. Mega Crit described infinites as "a fundamental part of the StS 2 power curve" and said the goal was to make them harder, not impossible ([PCGamesN](https://www.pcgamesn.com/slay-the-spire-2/patch-notes-infinites-nerfed); [PC Gamer](https://www.pcgamer.com/games/card-games/mega-crit-responds-to-the-panic-over-slay-the-spire-2s-1st-balance-pass-saying-these-changes-are-the-first-of-many-no-change-is-necessarily-permanent)). Lesson: design the *rarity and assembly cost* of loops up front. Retroactive nerfs to fan-favourite combos are expensive.
14. **Forced deck additions the player didn't choose.** Griftlands' story and negotiations add cost-bearing cards to your deck; players describe this as "feel bad" even when the cost is small ([Klei forums](https://kleiforums.com/forums/topic/108820-great-game-already-some-feelbad-mechanics/)). STS curses are mostly *chosen* (an event trade, Neow's drawback row, a boss-relic drawback). Status cards forced in by enemies are combat-only.
15. **Parallel subsystems that are the same game twice.** Griftlands' negotiation is "mechanically almost identical" to combat in the eyes of reviewers ([bit-tech](https://bit-tech.net/reviews/griftlands-review/1)). A second mode must ask different questions.
16. **Runs too long, or progression as grind.** Across the Obelisk reviewers call its runs "way too long" and say its upgrades "artificially increase playtime" ([Backloggd](https://backloggd.com/reviews/everyone/eternity/liked/across-the-obelisk/)). STS's 45-90 minutes and unlocks that add *options* rather than raw power keep losses cheap. Wildfrost: "short runs of 30-60 minutes reduce the frustration of losing" ([MCV](https://mcvuk.com/business-news/when-we-made-wildfrost/)).
17. **Front-loaded difficulty spikes.** Wildfrost's developers said in hindsight they would "create a smoother difficulty curve and have the game be more forgiving of mistakes early on" ([MCV](https://mcvuk.com/business-news/when-we-made-wildfrost/)). STS's weak-pool opening fights exist for this reason.
18. **Metrics without context.** Madness looked overpowered in win-rate data only because it was picked late in runs that were already winning. Super-users skew averages ([talk summary](https://briefread.pages.dev/en-GB/summary/slay-the-spire-metrics-driven-design)). Control for floor picked and for player.

### 4.2 Positive lessons from the genre (each is taken; learn the principle, not the mechanic)
- **Wildfrost: counters.** Every unit (yours and the enemy's) has a visible countdown to its next action, and many cards manipulate counters. The guiding rules were "simplicity and consistency": strict terminology ("what counts as a hit") and UI features cut if they don't add meaning, such as a skip-turn button ([MCV](https://mcvuk.com/business-news/when-we-made-wildfrost/)). Principle: *time itself* can be the resource, and readable time beats hidden time.
- **Monster Train: visible, layered combat.** Three floors plus a Pyre (the Pyre's HP is the run's HP), units with visible stats, a short combat preview, and clan pairing. A primary plus a secondary clan gives combinatorial identity with a small active pool ([GamingBolt](https://gamingbolt.com/?p=616305)). Principle: combinatorial class identity from *pairs* multiplies replay without multiplying content.
- **Balatro: an escalating target.** A known, exponentially rising score requirement, and boss blinds that each *disable* one thing (a suit, a hand type). Principle: a visible target that outpaces linear growth forces engine-building. Rule-breaking bosses play the role of STS's "questions".
- **Vault of the Void: low RNG and a fixed deck size.** Fixed outcomes for events; Purge (discard a card for energy) as a core economy ([Turn Based Lovers](https://turnbasedlovers.com/review/vault-of-the-void)). Principle: a deck cap turns every reward into a swap.
- **Cobalt Core: one spatial axis.** A single-axis dodge/position system; the deck is built from 3 chosen crew. PC Gamer credits it with building *on* the formula instead of imitating it ([PC Gamer](https://www.pcgamer.com/cobalt-core-review/)). Principle: one new axis (position) refreshes every card in the design space.
- **Inscryption: a novel cost and victory condition.** Sacrifice-your-units "blood" costs and a damage scale (tip it 5 to win), so fights are short tug-of-wars. Analysis (no primary source pulled): the Act 1 framing is widely praised and the later acts less so. Principle: a different win condition changes how every card is valued.
- **STS2's own experiments.** Enchantments and Afflictions treat the *individual card* as a persistent object. Quest cards turn deck slots into objectives. Ancients turn relic choice into a characterful, non-skippable trade. Alternate acts vary the question set. All of these are now taken (section 3).

---

## 5. Design commandments (checklist for every card, relic and enemy)

1. **Price everything against the baseline.** State each card's value in "Strike-equivalents per energy" (6 damage / 5 Block per energy at common). Anything above the rate must pay with a drawback, a condition, rarity or setup time.
2. **Every reward screen must make skipping plausible.** Deck dilution must be real: draw randomly from the whole deck, 5-card hand, no "best card" tutoring by default.
3. **Small starter deck, weak starter cards.** 10-12 cards of plainly mediocre basics, so that removal is a reward and the first good pickup changes the next fight.
4. **Make removal a priced, escalating service** (STS uses 75 +25). Give at least one more thinning path inside combat (an Exhaust-like mechanic, *our own version*).
5. **HP carries between fights, and healing is scarce and contested.** Rest must compete with upgrading. Full heals only at act boundaries, if at all.
6. **Telegraph every enemy action with exact numbers.** Hidden information is only allowed as a cost the *player* chose (e.g. a relic drawback).
7. **Every elite and boss asks one named question.** Write it on the design doc ("punishes X; answered by Y or Z"). There must be at least two common deck shapes that answer it. No "no counterplay" bosses.
8. **Each act asks different questions.** Act 1: front-loaded damage. Act 2: width (AoE, multi-hit, statuses). Act 3: scaling and anti-synergy. Do not just raise numbers.
9. **Enemy scaling must out-pace pure defence.** Every turtle deck eventually loses to a clock. Every glass cannon deck eventually loses to a spike.
10. **Unbounded player scaling must meet a ceiling check** (a damage cap, a card-count tax, a clock) in the final fights. Otherwise the last act is a formality.
11. **The top-tier power jump (an extra energy, or equivalent) always comes with a real, build-shaping drawback.**
12. **Every card is a staple or a build-around.** No deliberate trap cards. If pick rate is in the bottom 5%, buff it or cut it. If it appears in winning decks far above its offer rate, check for selection bias (floor picked) before nerfing.
13. **Archetypes share glue.** Each class has 3-4 archetypes, and at least 30% of its commons fit 2 or more of them, so runs can pivot to what the RNG offers.
14. **Keep the active card pool per run to about 75-90 class cards plus about 30 colourless.** Grow content by adding *runs-level variety* (alternate acts, pairings), not pool size.
15. **Rarity carries rule-breaking.** Commons are efficient and simple. Uncommons define archetypes. Rares may break a rule. Bosses always offer rares.
16. **Relics should change how you evaluate the next card reward.** If a relic doesn't change a decision, it is a stat stick. Allow a few stat sticks, but not many.
17. **Infinite loops must be rare and expensive to assemble** (rare plus uncommon plus relic). Design the assembly cost up front, and never ship a loop from commons. Retroactive nerfs cost goodwill.
18. **Randomness goes on inputs, not outputs.** No hit chances or damage rolls. Seed every stream separately so a different path doesn't reroll rewards. Support shared seeds.
19. **Every new keyword must pass the "not in STS1/STS2" test (section 3).** It must not be the same trigger and effect shape as an existing one under a new name. Prefer new *axes* (position, sequence, information, enemy-turn interaction) over new numbers.
20. **One lever per difficulty level.** Ascension-style tiers each change exactly one thing (damage, then HP, then economy, then AI) so data can attribute difficulty.
21. **Runs last 45-75 minutes; acts last 15-25.** Measure it. Losses must be cheap enough to restart immediately.
22. **Readability is a mechanic.** Consistent terms ("hit", "lose HP" versus "take damage"), and no hidden triggers. If a rule needs a tooltip inside a tooltip, simplify it (Wildfrost's "simplicity and consistency").
23. **Instrument from day one.** Log every offer, pick, skip, purchase, removal, damage taken per encounter per card, and floor of death. Weight by player and by floor picked. Pair numbers with a few well-reasoned human reports ("the numbers ... are not telling us how things feel").
24. **Opt-in risk everywhere.** Elites, event trades and drawback relics are chosen, never forced. Forced deck pollution is combat-only (status cards), never permanent without a choice.

---

*End of brief. Primary-source gaps: no transcript of the GDC talk's charts was accessible (findings come from third-party summaries and the 2018 Game Developer interview); Mega Crit has published no explicit win-rate targets; STS2 numbers reflect Early Access patches up to about v0.109 (July 2026) and may have changed.*
