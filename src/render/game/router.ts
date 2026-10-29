/**
 * Phase → screen routing. One screen per phase; act changes go through the act-transition card.
 * Run screens replace each other; the Title stays at the bottom of the stack, so leaving a run
 * (abandon, summary → TITLE) is a pop.
 */
import type { GameEvent, RunState } from '../../engine/index.ts';
import type { App } from '../app.ts';
import type { Screen } from '../screens/Screen.ts';
import type { RunSession } from './session.ts';
import { ActTransitionScreen } from './screens/ActTransitionScreen.ts';
import { BossRewardScreen } from './screens/BossRewardScreen.ts';
import { CombatScreen } from './screens/CombatScreen.ts';
import { EventScreen } from './screens/EventScreen.ts';
import { MapScreen } from './screens/MapScreen.ts';
import { PactScreen } from './screens/PactScreen.ts';
import { RestScreen } from './screens/RestScreen.ts';
import { RewardScreen } from './screens/RewardScreen.ts';
import { ShopScreen } from './screens/ShopScreen.ts';
import { SummaryScreen } from './screens/SummaryScreen.ts';
import { TreasureScreen } from './screens/TreasureScreen.ts';

export function screenKind(s: RunState): string { return s.phase; }

/** The screen for the run's current phase. `events` = what the last action produced (combat animates its opening). */
export function screenFor(app: App, session: RunSession, events: readonly GameEvent[] = []): Screen {
  const s = session.state;
  switch (s.phase) {
    case 'start': return new PactScreen(app, session);
    case 'map': return new MapScreen(app, session);
    case 'combat': return new CombatScreen(app, session, events);
    case 'reward': return new RewardScreen(app, session);
    case 'shop': return new ShopScreen(app, session);
    case 'rest': return new RestScreen(app, session);
    case 'event': return new EventScreen(app, session);
    case 'treasure': return new TreasureScreen(app, session);
    case 'boss_reward': return new BossRewardScreen(app, session);
    case 'victory':
    case 'defeat': return new SummaryScreen(app, session);
  }
}

/** After an action moved the run to another phase (or act): show the right screen. */
export function routeAfter(app: App, session: RunSession, prev: RunState, events: readonly GameEvent[]): void {
  const s = session.state;
  if (s.act !== prev.act && s.phase !== 'victory' && s.phase !== 'defeat') {
    const heal = events.reduce((a, e) => (e.t === 'heal' && e.target === 'player' ? a + e.amount : a), 0);
    void app.screens.replace(new ActTransitionScreen(app, session, heal));
    return;
  }
  void app.screens.replace(screenFor(app, session, events));
}
