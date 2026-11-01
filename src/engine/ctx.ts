// Hook/effect context factories. Contexts are throwaway objects built per call; they are never stored in state.

import { emit, enqueue, type Env } from './core';
import { nextBeat } from './combat';
import { setEnemyIntent } from './enemies';
import { isRipe } from './cards';
import { runNow } from './queue';
import { rngApi } from './rng';
import type {
  CardInstance,
  Effect,
  EffectCtx,
  EffectFrame,
  EffectSource,
  EntityRef,
  ModifierCtx,
  QueueItem,
  RelicState,
  RunState,
} from './types';

export function effectItems(effects: readonly Effect[], frame: EffectFrame): QueueItem[] {
  return effects.map((effect) => ({ kind: 'effect', effect, frame }));
}

export interface CtxOpts {
  source: EffectSource;
  owner: EntityRef;
  /** Status stacks (status hooks only). */
  stacks: number;
  relic: RelicState | null;
  target: EntityRef | null;
  card: CardInstance | null;
  x: number;
  /** Stamp frame.onBeat (card-played hooks of an on-beat play). */
  onBeat?: boolean;
}

export function frameOf(o: Pick<CtxOpts, 'source' | 'owner' | 'target' | 'x' | 'onBeat'>): EffectFrame {
  const f: EffectFrame = { src: o.source, self: o.owner, target: o.target, x: o.x };
  if (o.onBeat === true) f.onBeat = true;
  return f;
}

export function makeEffectCtx(env: Env, o: CtxOpts): EffectCtx {
  const frame = frameOf(o);
  const retarget = (opts?: { target?: EntityRef | null }): EffectFrame =>
    opts && opts.target !== undefined ? { ...frame, target: opts.target } : frame;
  return {
    state: env.state,
    get combat() {
      return env.state.combat;
    },
    source: o.source,
    owner: o.owner,
    stacks: o.stacks,
    relic: o.relic,
    frame,
    card: o.card,
    rng: rngApi(env.state.rng),
    emit: (e) => emit(env, e),
    queue: (effects, opts) => enqueue(env, effectItems(effects, retarget(opts))),
    now: (effects, opts) => runNow(env, effectItems(effects, retarget(opts))),
    flash: () => {
      if (o.source.kind === 'relic') emit(env, { t: 'relic_trigger', relic: o.source.id });
    },
    nextBeat: () => nextBeat(env.state),
    setIntent: (moveId) => {
      if (o.owner === 'player') throw new Error('setIntent: owner is the player, not an enemy');
      setEnemyIntent(env, o.owner, moveId);
    },
    isRipe: (card) => isRipe(env.state, card),
  };
}

export function makeModifierCtx(
  state: RunState,
  o: { source: EffectSource; owner: EntityRef; stacks: number; relic: RelicState | null },
  preview: boolean,
): ModifierCtx {
  return { state, combat: state.combat, source: o.source, owner: o.owner, stacks: o.stacks, relic: o.relic, preview, nextBeat: () => nextBeat(state) };
}
