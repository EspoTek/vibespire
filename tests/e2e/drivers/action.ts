// Action-level driver: plays a whole run by choosing legal actions with the simulator's greedy policy
// and dispatching them through the screens' own code path (window.__vibe.dispatch → uiDispatch), so
// every screen builds, animates and refreshes exactly as for a player. After every step it waits for
// the game to settle and checks the invariants (lib/invariants.ts).

import { type Difficulty, getNode, type Action, type RunState } from '../../../src/engine/index.ts';
import { saveFailure } from '../lib/artifacts.ts';
import { replayParity } from '../lib/parity.ts';
import { checkLegalParity, checkSnapshot, type Violation } from '../lib/invariants.ts';
import { Brain, describe } from '../lib/policy.ts';
import type { VibePage } from '../lib/vibe.ts';

export interface RunJob {
  kind: string;
  seed: string;
  classId: string;
  /** Start from this engine save (title → CONTINUE) instead of a fresh run. */
  startSave?: string;
  /**
   * Replay this applied-action log (a failure's `actions`) instead of asking the policy, then let the
   * policy take over. Actions the UI applies itself (the reward's gold pickup) are matched, not re-sent.
   */
  replay?: Action[];
  /** Stop after this many actions (smoke runs); default: play to the end. */
  maxSteps?: number;
  /** Reload the page and CONTINUE from the save every N actions (save/continue path), 0 = never. */
  reloadEvery?: number;
  /** Also reload + CONTINUE right after entering every boss fight. */
  reloadAtBoss?: boolean;
  /** Difficulty tier of a fresh run (absent: Standard, the game's default). */
  difficulty?: Difficulty;
  /** At the end, replay every applied action headless and require the identical final state (default on). */
  parity?: boolean;
  /** The page is already in this run (a scenario drove it here): don't start or load anything. */
  attached?: boolean;
  /** Actions the scenario applied before handing over (they count for the replay parity check). */
  priorApplied?: Action[];
  /** Stop (status 'stopped') as soon as this holds on an idle, checked state. */
  stopWhen?: (s: RunState) => boolean;
}

export interface RunOutcome {
  job: RunJob;
  /** stalemate: a fight passed MAX_COMBAT_TURNS (the bot can't win or lose it; a balance/policy matter, as in the sim). */
  status: 'victory' | 'defeat' | 'stopped' | 'stalemate' | 'failed';
  act: number;
  floor: number;
  steps: number;
  ms: number;
  bossFights: string[];
  violations: Violation[];
  error: string | null;
  artifacts: string | null;
  /** Every action the page applied, from the start save (action-level runs; absent for other drivers). */
  applied?: Action[];
}


/** From the gate / title, press CONTINUE with the mouse (the player's path to a saved run). */
/** Same limit as the simulator's maxCombatTurns (sim/run.ts). */
const MAX_COMBAT_TURNS = 100;

export async function continueFromTitle(vp: VibePage): Promise<void> {
  for (let i = 0; i < 200; i++) {
    const snap = await vp.snapshot();
    const name = snap.screen?.name;
    if (name === 'gate') { await vp.press('Enter'); continue; }
    if (name === 'title' && snap.idle) {
      const w = (await vp.widgets()).find((x) => x.label === 'CONTINUE');
      if (!w || !w.clientClick || !w.enabled) throw new Error(`title: CONTINUE is not clickable (${JSON.stringify(w)})`);
      await vp.click(w.clientClick);
      await vp.waitIdle();
      return;
    }
    await vp.frames(2);
  }
  throw new Error('continueFromTitle: never reached the title screen');
}

/** Press a Button on the current (non-run) screen by its caption, through activate (= confirm). */
async function pressButton(vp: VibePage, caption: string): Promise<void> {
  const w = (await vp.widgets()).find((x) => x.kind === 'Button' && x.label === caption && x.enabled);
  if (!w) throw new Error(`no enabled "${caption}" button on this screen`);
  await vp.activate(w.id);
}

function isBossTravel(s: RunState, a: Action): boolean {
  return a.type === 'travel' && getNode(s.map, a.to).type === 'boss';
}

export async function playRun(vp: VibePage, job: RunJob, onStep?: (steps: number, s: RunState) => void): Promise<RunOutcome> {
  const t0 = Date.now();
  const brain = new Brain(job.seed);
  const actions: Action[] = [];
  const applied: Action[] = [];
  const bossFights: string[] = [];
  let violations: Violation[] = [];
  let steps = 0;
  let last: RunState | null = null;
  let expectBoss = false;
  const out = (status: RunOutcome['status'], error: string | null = null, artifacts: string | null = null): RunOutcome => ({
    job, status, act: last?.act ?? 0, floor: last?.floor ?? 0, steps, ms: Date.now() - t0, bossFights, violations, error, artifacts, applied,
  });
  const fail = async (reason: string): Promise<RunOutcome> => {
    // the full applied log (UI-initiated actions included) from the start save: what --replay feeds back
    applied.push(...await vp.takeApplied().catch(() => []));
    const dir = await saveFailure(vp, { kind: job.kind, seed: job.seed, classId: job.classId, actions: applied, startSave: job.startSave ?? null, reason, violations });
    return out('failed', reason, dir);
  };

  applied.push(...(job.priorApplied ?? []));
  try {
    if (job.attached) {
      // a scenario already loaded the run and acted on it
    } else if (job.startSave) {
      await vp.writeSave(job.startSave);
      await vp.boot();
      await continueFromTitle(vp);
    } else {
      await vp.startRun(job.seed, job.classId, job.difficulty ?? 'standard');
    }
    const replay = job.replay ?? [];
    let replayAt = 0; // replay[0..replayAt) have been applied by the page
    for (;;) {
      await vp.waitIdle();
      if (vp.errors.length) return await fail(`console/page error: ${vp.errors[0] ?? ''}`);
      const fatal = await vp.fatalText();
      if (fatal) return await fail(`crash screen: ${fatal.slice(0, 400)}`);
      const got = await vp.takeApplied();
      applied.push(...got);
      for (const g of got) {
        if (replayAt >= replay.length) break;
        const want = replay[replayAt] as Action;
        if (describe(g) !== describe(want)) return await fail(`replay diverged at #${replayAt}: the page applied ${describe(g)}, the log has ${describe(want)}`);
        replayAt++;
      }
      const snap = await vp.snapshot();
      const s = await vp.state();
      if (!s) return await fail('no run state');
      last = s;
      onStep?.(steps, s);
      if (snap.screen?.name === 'act-transition') { await pressButton(vp, 'CLIMB'); continue; }
      if (expectBoss) {
        expectBoss = false;
        if (s.phase !== 'combat' || s.combat?.kind !== 'boss') {
          violations = [{ code: 'boss-node', msg: `travelled to the boss node but phase is ${s.phase}${s.combat ? ` (${s.combat.kind} ${s.combat.encounterId})` : ''}` }];
          return await fail('boss did not spawn');
        }
        bossFights.push(s.combat.encounterId);
        if (job.reloadAtBoss) {
          applied.push(...await vp.takeApplied());
          await vp.boot();
          await continueFromTitle(vp);
          continue;
        }
      }
      const legal = s.phase === 'victory' || s.phase === 'defeat' ? [] : await vp.legal();
      const widgets = await vp.widgets();
      violations = [...checkSnapshot(snap, s, legal, widgets), ...(legal.length ? checkLegalParity(s, legal) : [])];
      if (violations.length) return await fail(`${violations.length} invariant violation(s): ${violations[0]?.code ?? ''}`);
      const ended = s.phase === 'victory' || s.phase === 'defeat';
      const stalemate = (s.combat?.turn ?? 0) > MAX_COMBAT_TURNS;
      if (ended || stalemate || (job.maxSteps !== undefined && steps >= job.maxSteps) || job.stopWhen?.(s)) {
        if (job.parity !== false) {
          violations = replayParity({ save: job.startSave ?? null, seed: job.seed, classId: job.classId, difficulty: job.difficulty ?? 'standard' }, applied, s);
          if (violations.length) return await fail('page state differs from a headless replay');
        }
        return out(ended ? (s.phase as 'victory' | 'defeat') : stalemate ? 'stalemate' : 'stopped');
      }
      const a = replayAt < replay.length ? replay[replayAt] as Action : brain.choose(s, legal);
      expectBoss = isBossTravel(s, a);
      actions.push(a);
      steps++;
      try {
        await vp.dispatch(a);
      } catch (e) {
        return await fail(`dispatch ${describe(a)} threw: ${e instanceof Error ? e.message : String(e)}`);
      }
      if (job.reloadEvery && steps % job.reloadEvery === 0) {
        await vp.waitIdle();
        const after = await vp.state();
        if (after && after.phase !== 'victory' && after.phase !== 'defeat') {
          applied.push(...await vp.takeApplied());
          await vp.boot();
          await continueFromTitle(vp);
        }
      }
    }
  } catch (e) {
    return await fail(e instanceof Error ? `${e.message}\n${e.stack ?? ''}` : String(e));
  }
}
