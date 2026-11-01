#!/bin/sh
# Measure a snapshot of the working tree (no commit needed; other agents keep editing the real tree).
# Usage: sh sim/snapshot.sh <label> [extra env for sim/v2-baseline.sh, e.g. RUNS=300]
#   1. rsync the repo (excluding node_modules, .git, dist, sim/out) to a scratch dir;
#   2. symlink node_modules back;
#   3. record a content hash of src/ (sim/srchash.ts), which every report generated there prints;
#   4. run sim/v2-baseline.sh from the snapshot, writing results back to this repo's sim/out/<label>
#      and docs/balance.
# The snapshot dir is printed; delete it when the report is done.
set -e
LABEL=${1:?usage: sh sim/snapshot.sh <label>}
REPO=$(pwd)
SNAP=${SNAP_DIR:-${TMPDIR:-/tmp}/vibespire-snap-$LABEL}
mkdir -p "$SNAP"
rsync -a --delete --exclude node_modules --exclude .git --exclude dist --exclude sim/out "$REPO/" "$SNAP/"
ln -sfn "$REPO/node_modules" "$SNAP/node_modules"
HASH=$(cd "$SNAP" && npx tsx sim/srchash.ts)
echo "[snapshot] $SNAP  src/ content hash $HASH" >&2
echo "$HASH" > "$SNAP/.srchash"
for f in docs/balance/v2-priors.json docs/balance/v2-baseline-priors.json; do
  [ -f "$SNAP/$f" ] || { echo "[snapshot] missing $f in the snapshot: spike would have no priors" >&2; exit 1; }
done
# SCRIPT: the chain to run (default the full baseline; sim/v2-measure.sh is the focused v2 measurement;
# none = only prepare the snapshot and its bundle, then run batches from it yourself).
if [ "${SCRIPT:-}" = none ]; then
  (cd "$SNAP" && npx tsx sim/bundle.ts)
  echo "$SNAP"
  exit 0
fi
cd "$SNAP" && OUT="$REPO/sim/out/$LABEL" DOCS="$REPO/docs/balance" sh "${SCRIPT:-sim/v2-baseline.sh}" "$LABEL"
