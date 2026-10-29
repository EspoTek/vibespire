# Graft and colourless card art

Delivered 56 Graft and 20 colourless 32x24 RGBA cards. The existing prompt
manifest was verified against every source card block before generation.
`../../prompts_cards.json` records subjects, original allocations, exact built-in
image_gen prompts, source paths, alternatives and final selections.

Five initial sheets contain 76 cards and four Graft alternatives. One fill-up
sheet retries eight weak subjects with two variants each. All six sheet contacts
and both final class contacts were visually inspected at 4x. Three initial
alternatives and eight fill-up icons were selected. Unselected art stays here,
outside the production card directory and atlas.

Remaining weak IDs: `death_cap` (more spearhead than mushroom), `excise` (thin
root silhouette). No final icons have observed gutter bleed or near-duplicates.
Sources are preserved at their native generator resolution under
`../../raw/cards/graft-colorless/`; that raw directory is locally ignored.

Rebuild selected cards, labelled contacts and atlas from the repository root:

```sh
UV_CACHE_DIR=/private/tmp/vibespire-uv-cache uv run --project tools/sprites tools/sprites/finalize_cards.py
```

Repack all currently installed production cards, excluding the test subfolder:

```sh
UV_CACHE_DIR=/private/tmp/vibespire-uv-cache uv run --project tools/sprites tools/sprites/atlas.py public/assets/sprites/cards public/assets/sprites/cards-atlas.png public/assets/sprites/cards-atlas.json --cell-w 32 --cell-h 24
```

Atlas JSON uses `frames[card_id] = {x,y,w,h}`, `cell_w:32`, `cell_h:24`.
Square atlas callers retain their original API and metadata. The finalizer
checks all 76 cards for dimensions, binary alpha, SMS channels and <=16 opaque
colours, and compares every packed frame pixel-for-pixel against its source.
At verification time the atlas included 132 cards (384x264), including other
installed batches. Later batches can change that count.

Python diagnostics passed. Six synthetic pipeline tests passed; the existing
enemy delivery fixture failed because it expects the old four enemy names,
while the concurrently rebuilt enemy atlas has new names. Repository typecheck
and tests also fail in existing/concurrent engine, content and renderer work
outside this task. These files and the enemy/shared atlases were not changed.
