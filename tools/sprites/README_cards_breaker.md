# Breaker card art

`prompts_cards_breaker.json` contains all 56 parsed `card` blocks (id, name,
type, text), 4–10 word icon subjects, and the allocation made before generation:
three sheets of 16 cards, then eight cards plus eight planned alternates.
One 16-cell fill-up sheet retries failed and borderline subjects once.
Exact built-in imagegen prompts are in
`preview/cards/breaker-generation-prompts.json`.

Native generator files are preserved under ignored `raw/cards/native/`.
`ingest.py` explicitly normalizes them to 1024×1024 in `raw/cards/`;
these normalized inputs are not untouched originals. Source paths and dimensions
are recorded in the manifest.

Run from the repository root with a writable uv cache:

```sh
export UV_CACHE_DIR=/private/tmp/vibespire-uv-cache
uv run --project tools/sprites tools/sprites/build_cards_breaker.py breaker_01
uv run --project tools/sprites tools/sprites/build_cards_breaker.py breaker_02
uv run --project tools/sprites tools/sprites/build_cards_breaker.py breaker_03
uv run --project tools/sprites tools/sprites/build_cards_breaker.py breaker_04
uv run --project tools/sprites tools/sprites/build_cards_breaker.py breaker_fillup
uv run --project tools/sprites tools/sprites/finalize_cards_breaker.py
```

Each sheet has its own `preview/cards/<sheet>/contact.png` at exactly 4×,
plus the native-size view, processing report, and build log. The final labelled
contact is `preview/cards/breaker-contact.png`. Review decisions and remaining
weak ids are in the manifest. Production contains only the 56 chosen card ids;
alternates, retries and contacts stay in previews.

Finalization validates 32×24 RGBA, binary alpha, nonempty silhouettes,
≤16 opaque colours, exact SMS RGB channels and absence of magenta, then checks
every atlas frame pixel-for-pixel. Results:
`preview/cards/breaker-validation.json`.

Rebuild the card atlas from ALL current top-level production card PNGs:

```sh
uv run --project tools/sprites tools/sprites/atlas.py public/assets/sprites/cards public/assets/sprites/cards-atlas.png public/assets/sprites/cards-atlas.json --cell-w 32 --cell-h 24
```

The nonrecursive enumeration excludes `cards/test/`. Atlas output is RGBA PNG
and JSON `{frames: {card_id: {x,y,w,h}}, cell_w:32, cell_h:24}`.
Enemy, relic and shared sprite atlases are outside this batch.

Validation logs: `preview/cards/breaker-typecheck.log` (passed),
`breaker-repo-tests.log` (290 tests passed), `breaker-pipeline-tests.log`
(11/12 passed; the old delivered-enemy assertion expects the four original
enemies and fails against concurrent enemy additions). Scripts also pass `ty`.
