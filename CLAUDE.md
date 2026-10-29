# Vibespire — project conventions

Vibespire is a from-scratch Slay-the-Spire-style roguelike deckbuilder for the browser: three.js front end, 8-bit front-on Phantasy Star (Sega Master System) art direction, three classes with separate decks, colourless cards, unique relics, and mechanics that do not exist in Slay the Spire 1 or 2. Deployed to https://vibespire.56bits.com.au as a Cloudflare Worker serving static assets (`npm run deploy`).

Read `docs/ENGINE_SPEC.md` (the engine contract) and `docs/GDD.md` (the game design) before touching code. `docs/research/` holds the research briefs behind those decisions.

## Layout

```
src/engine/    pure TypeScript game core. NO DOM, NO three.js, NO browser globals. Runs in Node.
src/content/   cards / relics / enemies / events / potions / map tables. Pure data + effect hooks. Also Node-safe.
src/render/    three.js renderer, screens, input (keyboard / mouse / gamepad), audio.
sim/           headless playtester bot + balance reports (node scripts, worker_threads).
tools/         asset pipeline (sprite post-processing, atlas packing). Python via uv or node.
public/assets/ sprites, atlases, fonts, generated data.
docs/          GDD, engine spec, research, balance reports.
tests/         vitest tests (engine + content invariants).
```

## Hard rules

- TypeScript strict. No `any`, no `as unknown as`, no `// @ts-ignore`. `npm run typecheck` and `npm test` must pass before you report done.
- `src/engine` and `src/content` must import nothing from `src/render`, `three`, or the DOM. Vitest runs them in Node.
- Determinism: all randomness goes through the seeded RNG streams in the run state (see ENGINE_SPEC). Never call `Math.random()` outside `src/render` cosmetics.
- Never suppress errors. Lookups throw on miss (`getCardDef('nope')` throws, it does not return undefined). No bare `catch`, no `catch {}` that swallows, no defaults papering over missing data in a content table. A loud failure beats a silent wrong answer.
- State is plain JSON-serialisable data. Functions live in content definitions keyed by id, never in state.
- Card/relic/enemy text must be generated from the same numbers the engine uses (no hand-written numbers in descriptions that can drift).
- Every new mechanic gets a unit test. Every card gets at least a smoke test that it can be played without throwing.
- Commit messages are not your job: do NOT run `git commit` / `git push`. Leave changes in the working tree and report what changed.
- Use `uv` for any Python (never `pip`/`python3` directly). Node scripts run with `node` (v26) or `npx tsx`.
- Long-running scripts (sims, asset batches) print progress (phase, counts, elapsed) every few seconds.

## Pixel conventions

- Logical resolution 640x360 (16:9), rendered to a render target and integer-upscaled, nearest-neighbour. Everything snaps to integer logical pixels.
- Palette: Sega Master System 64-colour master palette (each RGB channel is one of 00/55/AA/FF). Sprites: magenta (#FF00FF) is the transparency key in source art; atlases are RGBA.
- Enemy sprites 64x64 (bosses 96x96), card icons 32x24, relic/potion icons 16x16, font 8x8.

## Working with other agents

Several agents (Claude subagents and Codex instances) edit this repo concurrently, each on an assigned area. Stay inside your assigned directories unless the task says otherwise; if you must change a shared file (`src/engine/types.ts`, `docs/ENGINE_SPEC.md`), say so explicitly in your report.
