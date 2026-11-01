/**
 * Vibespire bootstrap: build the renderer App, show the gate, start the frame loop.
 * Any uncaught error (startup or later) is shown on screen as well as in the console: a loud
 * failure beats a silently frozen canvas.
 */
import { AI_PURITY } from './engine/index.ts';
import { App } from './render/app.ts';
import { GALLERY_PAGES, GalleryScreen, isGalleryPage } from './render/screens/GalleryScreen.ts';
import { GateScreen } from './render/screens/GateScreen.ts';
import { TitleScreen } from './render/screens/TitleScreen.ts';
import { testContentActive } from './render/game/view.ts';
import { RunSession } from './render/game/session.ts';
import { screenFor } from './render/game/router.ts';
import { Label } from './render/ui/Label.ts';
import { Z } from './render/ui/Widget.ts';
import { fonts } from './render/fonts.ts';
import { C } from './render/palette.ts';
import { W } from './render/layout.ts';

function showFatal(err: unknown): void {
  const el = document.getElementById('fatal');
  if (!el) throw new Error('index.html is missing #fatal');
  const msg = err instanceof Error ? `${err.name}: ${err.message}\n\n${err.stack ?? ''}` : String(err);
  el.textContent = `VIBESPIRE CRASHED\n\n${msg}`;
  el.hidden = false;
}

window.addEventListener('error', (e) => showFatal(e.error ?? e.message));
window.addEventListener('unhandledrejection', (e) => showFatal(e.reason));

// Dev content switch: ?content=test registers the engine's test pack (src/content/testpack/) when it
// exists. Looked up with a glob so the build doesn't depend on a module another agent is adding.
// Dev builds (and so the e2e harness) check enemy AI purity strictly: deep-frozen snapshots throw on any
// write. Production uses the cheaper copies (src/engine/enemies.ts AI_PURITY).
if (import.meta.env.DEV) AI_PURITY.mode = 'frozen';

const params = new URLSearchParams(location.search);
if (params.get('content') === 'test') {
  const mods = import.meta.glob<{ registerTestPack?: () => void }>('/src/content/testpack/index.ts');
  const load = mods['/src/content/testpack/index.ts'];
  if (!load) console.info('[content] ?content=test: src/content/testpack/index.ts does not exist; using what src/content/index.ts registers');
  else {
    const mod = await load();
    if (typeof mod.registerTestPack !== 'function') throw new Error('src/content/testpack/index.ts does not export registerTestPack()');
    mod.registerTestPack();
  }
}

const root = document.getElementById('app');
if (!root) throw new Error('index.html is missing #app');
const app = await App.create(root);
// Dev deep links: ?screen=gallery[&page=palette|sprites|widgets|procedural] and ?screen=continue
// (resume the saved run) skip the gate (sound unlocks on the first key/click). Anything else, or no param, starts at the gate.
const screen = params.get('screen');
if (screen === 'gallery') {
  const page = params.get('page');
  if (page !== null && !isGalleryPage(page)) throw new Error(`?page=${page}: expected one of ${GALLERY_PAGES.join(', ')}`);
  void app.screens.push(new TitleScreen(app)).then(() => app.screens.push(new GalleryScreen(app, page ?? 'palette')));
} else if (screen === 'continue') {
  const slot = RunSession.open(app.storage);
  if (slot.kind === 'none') throw new Error('?screen=continue: there is no saved run');
  // an incompatible save was discarded by open(): the title tells the player (its enter() finds none now, so say it here)
  if (slot.kind === 'incompatible') void app.screens.push(new TitleScreen(app)).then(() => app.toasts.show('OLD SAVE DISCARDED', 4000));
  else void app.screens.push(new TitleScreen(app)).then(() => app.screens.push(screenFor(app, slot.session)));
} else if (screen !== null) {
  throw new Error(`?screen=${screen}: expected gallery or continue`);
} else {
  void app.screens.push(new GateScreen(app));
}
if (testContentActive()) {
  const mark = new Label(W / 2, 1, 'TEST CONTENT', { font: fonts.small, align: 'center', color: C.pink, outline: C.black });
  mark.setZ(Z.TOAST + 10);
  app.toasts.root.add(mark.node);
  app.toasts.topY = 10; // toasts start below the watermark instead of covering it
}
app.start();

// e2e test hook (tests/e2e): only with ?e2e=1; the module is not even loaded otherwise.
if (params.get('e2e') === '1') {
  const { installE2E } = await import('./render/debug/e2e.ts');
  installE2E(app);
}

// Debug handle for the browser console / automated checks (renderer-only, no game state).
Object.assign(window, { vibespire: app });
