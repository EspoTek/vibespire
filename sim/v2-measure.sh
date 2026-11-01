#!/bin/sh
# Focused v2 measurement (run from a snapshot: SCRIPT=sim/v2-measure.sh sh sim/snapshot.sh v2).
# Stages run one at a time (never overlapping), each with --workers $WORKERS:
#   1. personas spike,timmy,turtle,novice x $RUNS            4. relic counterfactuals: new/changed + baseline extremes, $CF_RELIC seeds
#   2. every johnny-<engine> x $JOHNNY                        5. card counterfactuals: new/changed cards, $CF_CARD seeds
#   3. spike topped up to $SPIKE seeds (stalemate check)      8. spike-v1 x $RUNS (the v1 run model, for comparison)
#   9. Fixed Star granted under johnny-clockwork, $FIXED seeds  6. global lever grid (enemyDamagePct/enemyHpPct .all = 85/100/115) with spike, $SWEEP seeds
#   7. report (docs/balance/report-$LABEL.md)          Stage order: 1 2 3 4 5 8 9 6 7.
# Skip a stage with SKIP="1 3 ..." . RELIC_IDS=a,b,... replaces stage 4's relic list. Logs: $OUT/*.log.
set -e
LABEL=${1:-v2}
OUT=${OUT:-sim/out/$LABEL}
DOCS=${DOCS:-docs/balance}
WORKERS=${WORKERS:-4}
RUNS=${RUNS:-200}
JOHNNY=${JOHNNY:-100}
SPIKE=${SPIKE:-1000}
CF_RELIC=${CF_RELIC:-40}
CF_CARD=${CF_CARD:-30}
SWEEP=${SWEEP:-100}
FIXED=${FIXED:-80}
V1RUNS=${V1RUNS:-$RUNS}
SKIP=${SKIP:-}
mkdir -p "$OUT"
skip() { case " $SKIP " in *" $1 "*) return 0;; esac; return 1; }
stamp() { echo "[v2-measure] $(date +%H:%M:%S) $*" >&2; }
npx tsx sim/bundle.ts
B=sim/out/bundle
skip 1 || { stamp "1 personas x $RUNS"; node $B/personas-batch.mjs --runs "$RUNS" --personas spike,timmy,turtle,novice --seed-prefix v2 --out "$OUT" --workers "$WORKERS" 2> "$OUT/personas.log"; }
skip 2 || { J=$(npx tsx sim/v2-ids.ts johnnies); stamp "2 johnnies x $JOHNNY: $J"; node $B/personas-batch.mjs --runs "$JOHNNY" --personas "$J" --seed-prefix v2 --out "$OUT" --workers "$WORKERS" 2> "$OUT/johnny.log"; }
skip 3 || { stamp "3 spike to $SPIKE"; node $B/personas-batch.mjs --runs "$SPIKE" --from "$RUNS" --personas spike --seed-prefix v2 --out "$OUT" --workers "$WORKERS" 2> "$OUT/spike-top.log"; }
skip 4 || { R=${RELIC_IDS:-$(npx tsx sim/v2-ids.ts changed-relics --extremes 15)}; stamp "4 relic cf x $CF_RELIC"; node $B/counterfactual.mjs --kind relic --runs "$CF_RELIC" --ids "$R" --out "$OUT/cf-relic.jsonl" --workers "$WORKERS" 2> "$OUT/cf-relic.log"; }
skip 5 || { C=$(npx tsx sim/v2-ids.ts changed-cards); stamp "5 card cf x $CF_CARD"; node $B/counterfactual.mjs --kind card --runs "$CF_CARD" --ids "$C" --out "$OUT/cf-card.jsonl" --workers "$WORKERS" 2> "$OUT/cf-card.log"; }
skip 8 || { stamp "8 spike-v1 x $V1RUNS (comparison with the designers' spot checks)"; node $B/personas-batch.mjs --runs "$V1RUNS" --personas spike-v1 --seed-prefix v2 --out "$OUT" --workers "$WORKERS" 2> "$OUT/spike-v1.log"; }
skip 9 || { stamp "9 Fixed Star under johnny-clockwork x $FIXED"; node $B/counterfactual.mjs --kind relic --class chronist --ids fixed_star --policy johnny-clockwork --runs "$FIXED" --seed-prefix cfx --out "$OUT/cf-fixed-star-clockwork.jsonl" --workers "$WORKERS" 2> "$OUT/cf-fixed.log"; }
skip 6 || { stamp "6 global lever grid x $SWEEP"; npx tsx sim/sweep.ts --runs "$SWEEP" --policy spike --workers "$WORKERS" --seed-prefix sweep --mode grid \
  --knob enemyDamagePct.all=85,100,115 --knob enemyHpPct.all=85,100,115 --out "$OUT/sweep.json" > "$OUT/sweep.txt" 2> "$OUT/sweep.log"; }
stamp "7 report"
node $B/attribution.mjs --in "$OUT" --label "$LABEL" --docs "$DOCS" 2> "$OUT/report.log"
stamp "done"
