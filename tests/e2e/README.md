# Vibespire real-browser e2e harness

Plays the real game in headless Chromium, at many times real speed, through the same screens a player
uses, and checks after every step that the screen shows what the engine says.

## Run it

| command | what |
|---|---|
| `npm run e2e:smoke` | 3 short action runs (120 steps), the act 1 boss + shop / reward / old-save scenarios, 3 input runs (mouse, keyboard, pad) |
| `npm run e2e:scenarios` | every boss of every act forced onto the map, plus the shop / reward / old-save scenarios |
| `npm run e2e:bosses` | the boss scenarios for every boss and every class (27) |
| `npm run e2e:actions` | 30 full action-level runs (classes rotate) |
| `npm run e2e:input` | 3 input-level runs (mouse / keyboard / gamepad), 400 steps each |
| `npm run e2e` | full: scenarios, 30 full runs, 3 reload runs and 3 input runs |

**Resource limits** (`docs/v2/BRIEF.md`) are the defaults: one Chromium, at most 2 pages (`--pages`
above 2 is refused), and a 45-minute budget after which no new job starts. On an idle machine a full
run takes about 15 to 30 minutes on 2 pages. Times grow several-fold when other agents' simulators
saturate the CPU; game time drives the idle timeout, so slow is not a failure.

Cleanup: Ctrl-C, `kill` and SIGHUP close the browser and the vite server before exiting, and `cli.ts`
forwards them to a `--snapshot` run and deletes the copy. Chromium talks to Playwright over a pipe, so
it exits on its own if the runner is SIGKILLed. Check with `ps aux | grep -c enable-unsafe-swiftshader`.

Flags (after `--`, e.g. `npm run e2e -- --runs 60 --class graft`):

- `--runs N` number of runs for the suite; `--class breaker,graft` restrict classes;
- `--pages P` parallel tabs in the one browser (default and maximum 2);
- `--budget-min M` stop starting jobs after M minutes (default 45);
- `--speed S` sim ticks per animation frame (default 40, i.e. ~40x real time; 1 = real time);
- `--steps N` cap every run at N actions;
- `--seed-prefix X` seeds are `X0`, `X1`... (default `E2E`), so runs are reproducible;
- `--headed` watch it in a visible Chromium window;
- `--snapshot` run from a copy of the tree taken at start (in a temp dir outside the repo; waits until
  the copy loads). Use it for long batches while other agents edit the repo;
- `--only <text>` keep only jobs whose label contains it (e.g. `--only orchid`, `--only shop-`);
- `--replay <failure dir>` replay a failure's action log (see below).

Exit code: 0 all passed, 1 something failed, 2 the game does not boot at all (preflight).
Progress prints every 5 s: jobs done, failures, wins, and what each page is doing.

The harness starts its **own** vite dev server on a free port (never 4173 or 5173) with HMR and the
file watcher off, and its **own** Playwright Chromium (`chromium.executablePath()`, else the older
`chromium-1234` download, else `$VIBE_CHROME`). It never touches the user's Chrome or dev server.
If no Chromium is found: `npx playwright install chromium`.

## Failures

Each failure writes `tests/e2e/out/<time>-<kind>-<class>-<seed>/` (gitignored):

- `failure.json` seed, class, reason, the violations, the dispatched action log and the fixture save;
- `screen.png` the screen at the failure;
- `snapshot.json` what the page showed (labels, buttons, enemy views, hand...);
- `state.json` the engine state (also a valid save: put it in `localStorage['vibespire.run']`);
- `console.txt` page errors plus the last 200 console lines.

`npm run e2e -- --replay tests/e2e/out/<dir>` replays the action log in a fresh page, then lets the
policy continue. The engine is deterministic, so the same seed and actions reach the same state.
Every suite run also writes `tests/e2e/out/summary-<suite>.json`.

## How it works

`?e2e=1` makes `src/main.ts` load `src/render/debug/e2e.ts`, which installs `window.__vibe`.
Without the flag none of that code is loaded (in a production build it is a separate ~6 kB chunk that
is never fetched). The harness runs against the dev server: widget kinds come from class names, which a
minified build would mangle.

| `window.__vibe` | |
|---|---|
| `setTimeScale(n)` | replace the frame loop: n fixed 1/60 s ticks per animation frame, with a macrotask yield between ticks so every tween, animation and Scheduler promise chain advances, then one render. Tweens, animations, timers and audio calls all run through the real code. `0` restores the real-time loop. |
| `idle()` | no screen transition, no Scheduler step, no tween, no combat animation |
| `snapshot()` | screen name/class, modal depth, focused widget, every visible label and button, relic/potion icons, HUD texts, and in combat every EnemyView (rect, visible, sprite frame, opaque pixels in its texture, drawn) and the hand frames |
| `legal()`, `stateJson()` | the engine's legal actions and RunState |
| `dispatch(action)` | `RunScreen.uiDispatch`: the same `act()` / `perform()` path the screen's own controls call, so it animates and refreshes as for a player. A `resolve_choice` closes the open choice modal first; a `choice_toggle` (one step of a multi-pick answer) only updates the engine's selection, as the modal does at confirm. |
| `widgets()` | every navigable widget of the top focus scope: kind, label, rect, list membership, and a point where a click really hit-tests to it (`click`, `clientClick`) |
| `activate(id)` | focus + activate a widget (what confirm does) |
| `startRun(seed, class)`, `writeSave(json)` | start a run as BEGIN CLIMB does; write the save slot |
| `takeApplied()` | every action any screen applied since the last call, including UI-initiated ones (the reward screen's gold pickup) |

### Drivers

- **Action level** (`drivers/action.ts`): the simulator's greedy policy (`sim/policies/greedy.ts`)
  runs in Node on the page's own state and picks a legal action; the page dispatches it through the
  UI path. Whole runs, all three acts when the bot is good enough.
- **Input level** (`drivers/input.ts`): starts at the gate and uses only real input: Playwright
  mouse and keyboard, and a virtual standard-mapping gamepad (`navigator.getGamepads` is replaced
  before the game loads; a tap lasts exactly two game ticks so it can't key-repeat at high speed).
  The policy picks an action; the driver must find the widget for it and reach it: a mouse click at
  a hit-tested point, or keyboard/pad navigation that explores the focus graph (known moves first,
  then untried directions from the nearest widget) and presses confirm. Keyboard play uses the 1-0
  slot keys and E, the pad uses X for END TURN. Unreachable widgets and focus traps fail the run.
  After each action, the page must have applied exactly that action.
- **Scenarios** (`scenarios.ts`): fixture saves built headless (`lib/fixtures.ts`: greedy with huge
  HP until a point, then a mutation) and loaded with the title's CONTINUE:
  - `boss-a<act>-<boss>`: every boss forced onto the map. The row-14 map shows a clickable boss node;
    a mouse click starts that boss fight with the boss on screen; reload + CONTINUE mid-fight shows it
    again; the fight is played out through the boss relic and act transition.
  - `shop-writ`, `shop-rack`: price-changing relics bought in a shop re-price that shop (BUG-2), and the
    new potion slot works.
  - `reward-skip`: the skip button shows the Shards a skip really pays, and clicking it pays them (BUG-3).
  - `reward-relic`: an elite relic picked on the reward screen reaches the HUD at once.
  - `heroic-tier`: starts a run with the class-select tier toggle set to Heroic (by mouse) and plays to
    the first fight. It checks the run state, the HUD's "· HEROIC", and every enemy's HP against a
    headless Standard run with the same actions (one HP roll must explain both).
  - Action and input runs alternate tiers: odd-numbered jobs are Heroic, and the input runs toggle the
    tier with their own device.
  - `old-save`: a real save of the live v1 build (`tests/bugs/fixtures/v1-saves.json`) in the slot: the
    game boots, tells the player the run can't be continued, empties the slot and greys CONTINUE (BUG-11).

### Invariants (`lib/invariants.ts`), after every step

- no console error, page error, failed request (favicon excepted) or crash screen (a screen whose
  build throws reaches the crash screen too, see BUG-8);
- the game settles: not idle after 120 s of *game* time is a soft-lock (an animation that never ends),
  and no game time passing for 5 real minutes means a hung page;
- the screen matches the engine phase (`act-transition` allowed on the map phase);
- HUD: HP, max HP, gold, Shards, act/floor text; potion belt slots and held potions; relic icons;
- combat: every living enemy has a visible, drawn, in-bounds EnemyView whose sprite frame has opaque
  pixels, and its plate shows its HP; no view for a dead enemy; a boss fight has its boss on screen and
  matches the map's boss; the rendered hand is the engine hand (uids, order, names, visible); the
  energy orb and player HP match; END TURN is enabled exactly when `end_turn` is legal;
- shop: every item's price label is the engine's price; the removal buttons show the engine's prices;
  those prices equal what the current relics/statuses make them (catches stale prices);
- reward: shown cards / potion / relic match the reward; the skip button shows the engine's Shards;
- map: one visible, clickable node per legal travel;
- soft-lock: an enabled, visible widget exists; a pending choice has its modal open;
- legal-action parity: the page's legal actions equal the engine's on the same state;
- the input driver: the page applied exactly the intended action (a multi-pick answer: its toggles,
  then the confirm);
- a fight longer than 100 turns ends the run as `stalemate`, as in the simulator (a balance
  matter, not a failure);
- at the end of every run: replaying every applied action headless from the same start gives the
  identical final state (determinism and the save/load round trip; reload runs CONTINUE mid-run).

### What it does not cover

- How things look: it checks presence, bounds, text and non-empty sprites, not layout quality, overlaps
  between widgets (other than click hit-testing), colours or animation feel.
- Audio output (the audio code runs, nothing listens to it).
- Tooltip / keyword-box contents beyond their text existing.
- Real-time behaviour: at speed 40 a frame-rate-dependent bug may hide; run with `--speed 1` to check.
- Touch input, browser zoom / resize, other browsers.
- The policy's choices: options it never takes (some event options, potions out of combat) get only
  the generic per-step checks when another path reaches them.
