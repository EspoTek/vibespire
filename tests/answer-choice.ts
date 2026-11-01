// Answer the pending choice with `uids`, the way policies and the UI do: a multi-pick choice is built
// one choice_toggle at a time, then confirmed with resolve_choice (engine choiceStep). Returns the
// events of the confirming step.
import { choiceStep, type Game, type GameEvent } from '../src/engine';

export function answerChoice(g: Game, uids: readonly number[]): GameEvent[] {
  for (let i = 0; i <= uids.length * 2 + 2; i++) {
    const pc = g.state.combat?.pendingChoice ?? g.state.pendingChoice;
    if (!pc) throw new Error('answerChoice: no pending choice');
    const step = choiceStep(pc, uids);
    const events = g.apply(step);
    if (step.type === 'resolve_choice') return events;
  }
  throw new Error(`answerChoice: [${uids.join(', ')}] never confirmed`);
}
