# Phase C: data-driven tuning (targets for all agents)

Source data: `docs/balance/report-v2-baseline.md`, plus the CSVs `docs/balance/v2-baseline-{cards,relics}.csv`. The data measures **v1** content. A reworked card's v1 numbers say only that the old version was weak; they say nothing about the new version.

**Headline problem.** Turtle (defence-first) is the strongest bot and greed is punished: timmy wins 3–14%, novice 0–11%. A game about engines must pay off greed. Engines must come online and win; defence-only decks must be pressured over long fights by scaling enemies, stall-breakers and enrage timers on elites and bosses, the way STS does.

## v2 targets, measured by the sim's phase 2 bots after the redesign

| Metric | Target |
|---|---|
| spike win rate per class | 30–45% |
| class spread under spike | ≤ 8 pts |
| johnny bot on every engine | ≥ 25% (every engine viable) |
| timmy | ≥ 15% (big plays should win sometimes) |
| novice | ≥ 8% (new players can reach Act 2 boss) |
| turtle | no more than 10 pts above spike |
| stalemates | 0 in 1000 runs per class |
| relic Δwin (floor-1 grant) | no non-boss relic > +12; no relic < −8 (traps) |
| card cf | no card significantly negative across all personas; no "never played" cards |

## Owners

| Area | Owner |
|---|---|
| Class pools | class designers |
| Relics, colourless, potions | shared designer |
| Enemies, encounters, act curve | encounters agent |
| Bots and measurement | sim agent |
| Engine bugs | bugs agent |
