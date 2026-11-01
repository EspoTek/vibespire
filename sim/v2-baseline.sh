#!/bin/sh
# v2 balance baseline, one command: bundle, persona batches, counterfactual relic/card tests
# (first passes, then top-ups on the same paired seeds), then the report.
# Usage: sh sim/v2-baseline.sh [label]   (env: RUNS=250 CF_RELIC=60 CF_CARD=40 TOP_RELIC=150 TOP_CARD=120 OUT=sim/out/v2 DOCS=docs/balance SKIP_PERSONAS=1)
# To baseline a fixed commit while other agents edit the tree: git worktree add --detach <dir> <commit>,
# copy sim/ into it, symlink node_modules, and run this script there with OUT and DOCS pointing back.
# Every stage prints progress to stderr; logs are in $OUT/*.log. Stop at any point: the report can
# be rendered from whatever finished (`node sim/out/bundle/attribution.mjs`).
set -e
LABEL=${1:-v2-baseline}
OUT=${OUT:-sim/out/v2}
DOCS=${DOCS:-docs/balance}
RUNS=${RUNS:-250}
CF_RELIC=${CF_RELIC:-60}
CF_CARD=${CF_CARD:-40}
TOP_RELIC=${TOP_RELIC:-150}
TOP_CARD=${TOP_CARD:-120}
mkdir -p "$OUT"
npx tsx sim/bundle.ts
if [ -z "$SKIP_PERSONAS" ]; then
  echo "[v2] personas: $RUNS seeds per persona x class" >&2
  node sim/out/bundle/personas-batch.mjs --runs "$RUNS" --seed-prefix v2 --out "$OUT" 2> "$OUT/personas.log"
fi
echo "[v2] counterfactual relics: seeds 0..$CF_RELIC" >&2
node sim/out/bundle/counterfactual.mjs --kind relic --runs "$CF_RELIC" --out "$OUT/cf-relic.jsonl" 2> "$OUT/cf-relic.log"
echo "[v2] counterfactual cards: seeds 0..$CF_CARD" >&2
node sim/out/bundle/counterfactual.mjs --kind card --runs "$CF_CARD" --out "$OUT/cf-card.jsonl" 2> "$OUT/cf-card.log"
node sim/out/bundle/attribution.mjs --in "$OUT" --label "$LABEL" --docs "$DOCS" 2> "$OUT/report.log" || echo "[v2] report failed (see $OUT/report.log)" >&2
if [ "$TOP_RELIC" -gt "$CF_RELIC" ]; then
  echo "[v2] top-up relics: seeds $CF_RELIC..$TOP_RELIC" >&2
  node sim/out/bundle/counterfactual.mjs --kind relic --runs "$TOP_RELIC" --from "$CF_RELIC" --out "$OUT/cf-relic.jsonl" 2> "$OUT/cf-relic-top.log"
fi
if [ "$TOP_CARD" -gt "$CF_CARD" ]; then
  echo "[v2] top-up cards: seeds $CF_CARD..$TOP_CARD" >&2
  node sim/out/bundle/counterfactual.mjs --kind card --runs "$TOP_CARD" --from "$CF_CARD" --out "$OUT/cf-card.jsonl" 2> "$OUT/cf-card-top.log"
fi
node sim/out/bundle/attribution.mjs --in "$OUT" --label "$LABEL" --docs "$DOCS" 2> "$OUT/report.log"
echo "[v2] done" >&2
