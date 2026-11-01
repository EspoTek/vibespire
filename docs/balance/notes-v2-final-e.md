### Phase E final confirm run (2026-11-01, sim agent)

**Run.** Snapshot `v2-final-e`, `src/` `9c9eea790ec3c309`, 4 workers, one batch at a time, about 75 minutes of wall time. Every batch's tier is stamped in its `meta-*.json`.

| Tier | Data | Location |
|---|---|---|
| Heroic (HP 110 / damage 85) | spike 300 per class; turtle 150; every johnny engine 60 per class (24 engine × class combinations); relic and card counterfactuals at 40 paired seeds | `sim/out/v2-final-e/` |
| Heroic top-up | the outliers on seeds 40–99, with their own baseline arm | `sim/out/v2-final-e-top/` |
| Standard 85/75 (the default) | timmy, novice and spike, 150 per class each | `sim/out/v2-final-e-std85/` |
| Standard 90/75 | the same three | `sim/out/v2-final-e-std90/` |

No run threw. The run had **0 stalemates in 5,490 runs**: 2,790 Heroic and 2,700 Standard. Phase D had 2, both from Scrap floods.

#### Targets, by tier

**Heroic: spike.**
- All three classes are in the 30–45% band: Breaker 43.7, Chronist 40.0, Graft 31.3, each ±5.5.
- Compared with Phase D at the same levers: Breaker +11.4, Chronist −5.7, Graft −2.4.
- Breaker now sits near the top of the band, and Graft near the bottom.
- The class spread is 12.3 points against a target of ≤ 8, so it misses. Lifting Graft is the cheaper fix.

**Heroic: turtle.** Within 10 points of spike in every class (Breaker −15, Chronist −4, Graft −1), so it is met.

**Heroic: johnny engines** (≥ 25% each; 60 seeds, so each rate is about ±11 points).

| Class | Meets 25% | Under 25% | Change since Phase D |
|---|---|---|---|
| Breaker | counter 33 | bastion 23, furnace 22, crazing 20, redline 20, overflow 17, reprise 15, scrapheap 8 | every engine but scrapheap went up |
| Chronist | clockwork 27, conjunction 25 | calendar 20, storm 20, redline 13, reprise 13, overflow 13, scrapheap 10 | mixed |
| Graft | ripe 25 | harvest 23, overflow 22, redline 22, compost 20, reprise 20, scrapheap 18, canopy 12 | compost (3) and harvest (0) recovered; canopy, overflow, redline and reprise fell |

- The shared engines are the weakest group in every class: Scrapheap is 8–18%, and Overflow, Redline and Reprise are 13–22%.
- The ruling 72 Scrap floor likely cost Scrapheap its payoff.
- **Shared engines are now the biggest johnny gap.** Graft canopy (12%) is the weakest class engine.

**Standard: timmy and novice** (scored on the shipped 85/75).

| Persona | Pooled | Breaker | Chronist | Graft | Target |
|---|---|---|---|---|---|
| timmy | 22.2 ±3.8 | 31.3 | 15.3 | 20.0 | ≥ 15: met in every class |
| novice | 10.7 ±2.9 | 11.3 | **3.3** | 17.3 | ≥ 8: met pooled, missed for Chronist |

Spike at Standard is 81.6%.

#### Standard 85/75 vs 90/75: keep 85/75

| Persona | 85/75 | 90/75 |
|---|---|---|
| timmy | 22.2 ±3.8 | 17.6 ±3.5 |
| novice | 10.7 ±2.9 | **5.8 ±2.2** |

- At 90/75, timmy still passes, but novice's whole interval sits below 8%. The difference from 85/75 is −4.9 points, about 2σ.
- Only 85/75 meets both targets, and novice's lower bound there (7.8%) only just reaches 8.
- **Do not switch to 90/75.**
- If 85/75 should become more robust, the lever is damage, not HP. In the earlier pass, damage moved novice far more than HP did, for example 80→75 damage at HP 85 took novice from 3.8 to 10.7.

**Chronist is the novice outlier:** 3.3% at 85/75 and 1.3% at 90/75. The class plays well at spike's skill level (88% Standard, 40% Heroic) but punishes misplays. That is a class-design question, not a tier lever.

#### Relics (Heroic counterfactuals, paired)

| Relic | Δwin (points) | Δprogress (floors) | Seeds | Verdict |
|---|---|---|---|---|
| Refrain Pin | +6 ±11 | +0.4 | 100 | back under the +12 target. The 40-seed pass read +15 ±18. |
| Star Pip (Chronist) | +7 ±13 | +3.5 ±3.2 | 100 | strong for its rarity (a common), not out of line |
| Exposed Core (boss) | −1 ±14 | +4.1 ±3.5 | 40 | fine |
| Fracture Engine | +5.8 ±8 | +0.5 | 40 | fixed (Phase D +13) |
| Slow-Temper Alloy | +2.5 ±9 | +0.4 | 40 | fixed (Phase D +18) |
| Gravity Loom | +10.6 ±9.1 (raw paired, pooled) | — | 60 | on the edge of the +12 target |

- Gravity Loom's figure comes from the shared designer's `sim/out/shared-e/cf-loom5.jsonl`, measured on this same `src/` hash at Heroic, so I did not re-run it.
- Gravity Loom by class: Breaker +15 ±16, Graft +10 ±16, Chronist +7 ±15.
- The relic CSV covers only these relics. The other relics were unchanged in Phase E (definition hashes match the Phase D snapshot).

#### Cards (Heroic counterfactuals: one extra copy in the starting deck)

The pass covered all **54 cards changed in Phase E** plus Heave To. A card counts as changed when its definition hash differs between the Phase D final snapshot and this tree. No designer had run card counterfactuals.

Results that held up on 100 paired seeds (raw paired Δ):

| Card | Δwin (points) | Δprogress (floors) | Verdict |
|---|---|---|---|
| **Molt (Graft)** | **+39 ±11.5** | **+12.2 ±3.3** | **the strongest card measured in v2** (see below) |
| Breaker Loosen Straps | −19 ±13 | −5.5 ±3.2 | significantly negative |
| Breaker Crazing | −18 ±11 | −6.0 ±2.9 | significantly negative |
| Breaker Bellows | −17 ±12 | −6.2 ±3.3 | significantly negative |
| Breaker Molten Shell | −16 ±11 | −5.3 ±3.4 | significantly negative |
| Breaker Iron Rhythm | −11 ±12 | −5.3 ±3.3 | significantly negative (floors) |
| Breaker Black Box | −10 ±11 | −3.0 ±2.7 | significantly negative (floors) |
| Black Box (Graft) | +13 ±12 | +5.1 ±3.5 | positive |
| Black Box (Chronist) | −2 ±14 | — | neutral |

Not significant at 100 seeds: Kindle (−1), Shed Plating (−5), Clear Cut (−2).

**Molt.** It costs 1 energy and gives 4 Block, 3 Chaff and a draw. Phase E2 raised Chaff from 2 to 3 Block, so one Molt is now 13 Block plus three free Scrap-fuel cards.
- The extra copy took Graft from 27% to 66% win on the same seeds.
- Spike picks it only 10% of the time because Molt has no usable prior, so spike Graft is underselling the class.
- **Recommendation:** cut Chaff back to 2 Block, or make Molt add 2 Chaff.

**The Breaker group.** All six are Phase E (Breaker E5) cards around Shed, Onslaught and Exposed. Other changed Breaker cards are neutral to positive (Fault Line +1.7 floors, Read the Blow +2.1, Answer in Kind +2.1), so this is not general deck dilution.
- An early extra copy of a Power (Bellows, Crazing, Molten Shell) costs tempo against Act 1 attackers. Loosen Straps' Shed may strip Guard the bot needed.
- Either way, these cards make the starting deck worse with the bot as it is. The Breaker designer should look at them, starting with Loosen Straps: a 0-cost draw card should not be −5 floors.
- Spike's real picks of these cards (pick rates 6–75%) carry the same risk.

**Never picked** (offered ≥ 20 times, all personas): mostly colourless. Bait Flare (changed in Phase E; 0% pick in all classes), Relay Ping, Shardfall, Arc Lattice, Gyro Jammer, Overdraft Cell, Clean Manifest, Prism Resonance, Mirror Tether, Encore.

**Zero-value flags** for Salvage Kit, Encore and Propagate predate Phase E (they are in both Phase D reports). The value accounting cannot credit a modal choice or a buff on the next card, so these are not new bugs.

#### Priors: regenerate them

- 44.8% of spike's card offers and **51.6% of its picks** had no usable prior: the drafter scored them by the heuristic alone.
- 14.9% of screens were pure-heuristic picks.
- The cost is visible: Molt (+39 win as one copy) is picked only 10% of the time.
- **Recommendation:** once content is frozen, regenerate the priors with a full `sim/v2-measure.sh` pass, then `sim/priors.ts`. It needs card counterfactuals on every card, not only the changed ones.
- Expect the spike numbers to move after regeneration, Graft up in particular. Re-check the Heroic band and the class spread after that, not before.
