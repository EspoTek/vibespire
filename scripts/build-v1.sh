#!/bin/sh
# Build the archived v1 release (commit V1_REF) into dist/v1, served at /v1/.
# Runs after `vite build` (which empties dist/). v1 shares the origin with v2, so its
# localStorage keys are renamed (vibespire.* -> vibespire.v1.*): v1's strict save
# parser must never read a v2 save, and v2 must never see a v1 one.
set -eu
V1_REF=${V1_REF:-8ecf0e2}
ROOT=$(cd "$(dirname "$0")/.." && pwd)
OUT=${V1_OUT:-$ROOT/dist/v1}
WT=$(mktemp -d "${TMPDIR:-/tmp}/vibespire-v1-XXXXXX")
cleanup() { git -C "$ROOT" worktree remove --force "$WT"; }
trap cleanup EXIT

echo "[build-v1] checking out $V1_REF into $WT"
git -C "$ROOT" worktree add --detach "$WT" "$V1_REF" >/dev/null
ln -s "$ROOT/node_modules" "$WT/node_modules"

echo "[build-v1] namespacing localStorage keys"
for f in src/engine/serialize.ts src/render/storage.ts; do
  sed -i '' -e "s/'vibespire\.run'/'vibespire.v1.run'/" -e "s/'vibespire\.settings\.v1'/'vibespire.v1.settings'/" "$WT/$f"
done
if git -C "$WT" grep -n "'vibespire\.\(run\|settings\.v1\)'" -- src; then
  echo "[build-v1] un-namespaced storage key left in v1 source" >&2; exit 1
fi

echo "[build-v1] vite build --base=/v1/"
(cd "$WT" && npx vite build --base=/v1/ --outDir "$OUT" --emptyOutDir --logLevel warn)
test -f "$OUT/index.html"
echo "[build-v1] done: $(du -sh "$OUT" | cut -f1) in $OUT"
