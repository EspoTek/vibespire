# Character revision 2 validation — 30 October 2026

The character work passes its asset checks. Broader checks fail in the current shared working tree outside this task's allowed area. Those files were left untouched.

| Check | Result |
|---|---|
| `uv run python -m unittest -v chars_validate` | **6/6 pass**, after final portrait edits |
| `ty check --python tools/sprites/.venv/bin/python tools/sprites/chars_*.py` | **All seven character scripts pass** |
| `uv run chars_atlas.py` | **46/46** atlas crops match source RGBA pixels; nine 96×96 bosses, 37 64×64 enemies |
| Atlas metadata | Exact same JSON bytes as round 1; `{frames:{id:{x,y,w,h}},cell:96}` |
| Seven rejected enemies + four small-enemy cleanups | Exact original alpha and structural black pixels retained; binary alpha, continuous black exterior edges, SMS palette, 9–13 opaque colours, no detached one/two-pixel alpha scraps |
| Three HUD portraits | 32×32; 12 colours each; every opaque colour belongs to that character's accepted 64px master |
| Accepted nine enemies | Exact same PNG bytes as the saved start-of-round snapshot |
| Three 64px masters and five already-readable small enemies | Exact same PNG bytes as the saved start-of-round snapshot |
| Scope against the round 1 snapshot | Eleven enemy PNGs, three HUD PNGs and the atlas PNG changed; docs and character pipeline updated; no src edits or Git index/history changes by this task |
| Visual review | All 46 enemies and all six portrait files at 1×/4×; act backdrops; nine-icon native row; four-enemy and boss-plus-three-minion composites; original/final detail inventory |

The portable suite checks all source canvases, transparency, palette and colour budgets, outline continuity, preserved original silhouettes and structural ink, actual atlas crops, all nine boss rectangles, HUD palette inheritance and selected-file scope against the original session baseline when available. The revision's separate saved snapshot was also compared directly to verify that the accepted nine remained byte-identical during this round. Their final SHA-256 values are in [characters-accepted-hashes.json](characters-accepted-hashes.json).

`uv run python -m unittest -v test_pipeline`: **6 pass, 1 fail**. The shared delivered-assets fixture still expects only `armoured-scorpion`, `jellyfish-spirit`, `goblin` and `stone-golem`. Its expected roster conflicts with the game's current 46 enemies. The current mixed-size atlas is checked by the passing character suite. The shared fixture was not edited.

`npm run typecheck`: **fails outside character work**. Diagnostics cover sim policy union narrowing and missing returns; engine event/damage payload fields (`x`, `batch`, `staggerPrevented`) and effect return types; and matching content-test payload shapes. These occur in `sim/policies/lib/cards.ts`, `sim/policies/lib/choices.ts`, `src/engine/combat.ts`, `src/engine/damage.ts`, `src/engine/effects.ts` and `tests/content/smoke.test.ts`.

`npm test`: **2,029 passed, 10 failed**, 51 files, 351.80 seconds. Failures:

- Engine determinism, random-policy fuzz, legal-action fuzz and map seed sweep timeouts.
- Render action-binding coverage and non-ASCII glyph coverage.
- Greedy policy determinism timeout and 200-run performance budget.
- Planner persona-run timeout.
- Oracle custom-picker card eligibility assertion.

No browser verification was needed to inspect the delivered native sprite pixels. The crowded-line images are explicitly offline composites on the act backdrops, not gameplay screenshots. Scores and detail-density judgements remain visual self-assessments for the lead's review; pixel preservation and palette/atlas claims are mechanically verified.
