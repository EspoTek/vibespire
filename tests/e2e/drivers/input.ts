// Input-level driver: plays only through real input events (mouse, keyboard, or the virtual gamepad),
// starting at the gate: title → NEW RUN → class select → seed field → BEGIN CLIMB → the run.
// The policy picks an engine action; the driver then has to *reach* it like a player: find the widget
// for it, navigate focus there (or click it) and press. After every step:
//   - the page applied exactly the intended action (window.__vibe.takeApplied), so the input did what
//     it should and nothing else (the reward's automatic gold pickup is the one allowed extra);
//   - the invariants hold (lib/invariants.ts).
// A widget it cannot reach, a modal it cannot answer or a screen with no way forward fails the run.

import { getCardDef, getPotionDef } from '../../../src/content/index.ts';
import { actionKey, choiceStep, getNode, isMultiPick, type Action, type Difficulty, type CardInstance, type PendingChoice, type RunState } from '../../../src/engine/index.ts';
import { answerChoice as heuristicAnswer } from '../../../sim/policies/lib/choices.ts';
import type { WidgetInfo } from '../../../src/render/debug/e2e.ts';
import { saveFailure } from '../lib/artifacts.ts';
import { activate, InputError, pressSemantic, type Device } from '../lib/input.ts';
import { checkSnapshot, type Violation } from '../lib/invariants.ts';
import { replayParity } from '../lib/parity.ts';
import { Brain } from '../lib/policy.ts';
import type { VibePage } from '../lib/vibe.ts';
import type { RunJob, RunOutcome } from './action.ts';

export interface InputJob extends RunJob { device: Device }

type Pick = (w: WidgetInfo, all: readonly WidgetInfo[]) => boolean;
const inList = (key: string, index: number): Pick => (w) => w.list?.key === key && w.list.index === index;
const button = (caption: string | RegExp): Pick => (w) => w.kind === 'Button' && (typeof caption === 'string' ? w.label === caption : caption.test(w.label));
const labelled = (prefix: string): Pick => (w) => w.label.toUpperCase().startsWith(prefix.toUpperCase());
/** The i-th widget of `kind` in the modal's own order (deck-view grids list cards in pile order). */
const nthOf = (kind: string, i: number): Pick => (w, all) => all.filter((x) => x.kind === kind)[i] === w;

function pileFor(s: RunState, pc: PendingChoice): readonly CardInstance[] {
  const c = s.combat;
  switch (pc.from) {
    case 'deck': return s.player.deck;
    case 'hand': if (!c) throw new Error('hand choice outside combat'); return c.hand;
    case 'draw': if (!c) throw new Error('draw choice outside combat'); return [...c.draw].reverse();
    case 'discard': if (!c) throw new Error('discard choice outside combat'); return c.discard;
    case 'exhaust': if (!c) throw new Error('exhaust choice outside combat'); return c.exhaust;
    case null: throw new Error(`cards choice "${pc.prompt}" has no source pile`);
  }
}

/** The step sequence (toggles, then the confirm) that answers `pc` with `uids` from its current selection. */
function planChoice(pc: PendingChoice, uids: readonly number[]): Action[] {
  const out: Action[] = [];
  let cur: PendingChoice = { ...pc, picked: [...pc.picked] };
  for (let i = 0; i <= uids.length * 2 + 1; i++) {
    const step = choiceStep(cur, uids);
    out.push(step);
    if (step.type === 'resolve_choice') return out;
    if (step.type !== 'choice_toggle') throw new Error('planChoice: unexpected step');
    const next = cur.picked.includes(step.uid) ? cur.picked.filter((x) => x !== step.uid) : [...cur.picked, step.uid];
    cur = { ...cur, picked: cur.choices.filter((c) => next.includes(c)) };
  }
  throw new Error('planChoice: no confirm');
}

/** Potion icon `index` (belt slot): the icon labelled with that potion's name, by slot order among equals. */
function potionPick(s: RunState, index: number): Pick {
  const id = s.player.potions[index];
  if (id === undefined) throw new Error(`no potion in slot ${index}`);
  const name = getPotionDef(id).name;
  const nth = s.player.potions.slice(0, index).filter((p) => p === id).length;
  return (w, all) => all.filter((x) => x.kind === 'HintIcon' && x.label.startsWith(`${name}:`)).sort((a, b) => a.rect.x - b.rect.x)[nth] === w;
}

class Realizer {
  constructor(private readonly vp: VibePage, private readonly device: Device) {}

  private press(what: string, pick: Pick): Promise<WidgetInfo> { return activate(this.vp, this.device, what, pick); }

  private async settle(): Promise<void> { await this.vp.waitIdle(); }

  /** Answer a deck-view card pick: select each card, then the confirm button. */
  private async pickCards(s: RunState, pile: readonly CardInstance[], uids: readonly number[], confirm: RegExp): Promise<void> {
    for (const uid of uids) {
      const i = pile.findIndex((c) => c.uid === uid);
      if (i < 0) throw new Error(`card ${uid} not in the pile`);
      await this.press(`pick card ${getCardDef(pile[i]?.id ?? '').name}`, nthOf('CardFrame', i));
      await this.settle();
    }
    await this.press('confirm the pick', button(confirm));
    void s;
  }

  async realize(s: RunState, a: Action, legal: readonly Action[]): Promise<void> {
    const pc = s.pendingChoice ?? s.combat?.pendingChoice ?? null;
    switch (a.type) {
      case 'choose_start_boon': await this.press('pact', inList('pacts', a.index)); return;
      case 'travel': {
        const cols = legal.filter((x): x is Extract<Action, { type: 'travel' }> => x.type === 'travel').map((x) => x.to.col).sort((x, y) => x - y);
        await this.press(`map node ${getNode(s.map, a.to).type} r${a.to.row}c${a.to.col}`, inList('map-next', cols.indexOf(a.to.col)));
        return;
      }
      case 'play_card': {
        const c = s.combat;
        if (!c) throw new Error('play_card outside combat');
        const i = c.hand.findIndex((h) => h.uid === a.uid);
        const card = c.hand[i];
        if (!card) throw new Error(`card ${a.uid} not in hand`);
        const name = getCardDef(card.id, card.upgraded).name;
        if (this.device === 'keyboard' && i < 10) {
          await this.vp.press(i === 9 ? 'Digit0' : `Digit${i + 1}`); // the 1-0 slot keys
          await this.vp.press('Enter');
        } else await this.press(`hand card ${name}`, inList('hand', i));
        const targets = legal.filter((x): x is Extract<Action, { type: 'play_card' }> => x.type === 'play_card' && x.uid === a.uid).map((x) => x.target);
        if (targets.length > 1 && a.target !== undefined) {
          await this.settle();
          await this.press(`target for ${name}`, inList('targets', targets.indexOf(a.target)));
        }
        return;
      }
      case 'use_potion': {
        await this.press('potion', potionPick(s, a.index));
        await this.settle();
        if (s.phase !== 'combat') { await this.press('drink', button('DRINK')); return; }
        const targets = legal.filter((x): x is Extract<Action, { type: 'use_potion' }> => x.type === 'use_potion' && x.index === a.index).map((x) => x.target);
        if (targets.length > 1 && a.target !== undefined) await this.press('potion target', inList('targets', targets.indexOf(a.target)));
        return;
      }
      case 'end_turn':
        if (this.device === 'keyboard') await this.vp.press('KeyE');
        else if (this.device === 'gamepad') await this.vp.padPress(2);
        else await this.press('END TURN', button('END TURN'));
        return;
      case 'resolve_choice': {
        if (!pc) throw new Error('resolve_choice without a pending choice');
        if (pc.kind === 'options') {
          const c = a.uids[0];
          if (c === undefined) throw new Error('options choice needs one answer');
          await this.press(`option ${pc.labels[pc.choices.indexOf(c)] ?? c}`, (w, all) => w.kind === 'ListRow' && all.filter((x) => x.kind === 'ListRow').indexOf(w) === pc.choices.indexOf(c));
          return;
        }
        if (pc.kind === 'offers') {
          const c = a.uids[0];
          if (c === undefined) await this.press('skip the offer', button('SKIP'));
          else await this.press('offer', inList('offers', pc.choices.indexOf(c)));
          return;
        }
        await this.pickCards(s, pileFor(s, pc), a.uids, a.uids.length === 0 ? /^(SKIP|CONFIRM|CHOOSE)$/ : /^(CONFIRM|CHOOSE)$/);
        // Prune away asks to confirm the permanent removal
        if (pc.resume.op === 'prune_scrap' && pc.resume.spec.variant === 'away' && a.uids.length > 0) {
          await this.settle();
          await this.press('confirm removal', button('REMOVE'));
        }
        return;
      }
      case 'pick_reward':
        if (a.kind === 'card') await this.press('reward card', inList('reward-cards', a.index ?? -1));
        else if (a.kind === 'potion') await this.press('reward potion', labelled('POTION:'));
        else if (a.kind === 'relic') await this.press('reward relic', labelled('RELIC:'));
        else throw new Error('gold is picked up automatically by the reward screen');
        return;
      case 'skip_reward': await this.press('skip', button(/^SKIP \+/)); return;
      case 'proceed':
        if (s.phase === 'shop') await this.press('leave', button('LEAVE'));
        else await this.press('proceed', button(/^PROCEED/));
        return;
      case 'shop_buy': {
        const sh = s.shop;
        if (!sh) throw new Error('no shop');
        if (a.kind === 'card') await this.press('shop card', inList('shop-cards', a.index));
        else await this.press(`shop ${a.kind}`, inList('shop-goods', a.kind === 'relic' ? a.index : sh.relics.length + a.index));
        return;
      }
      case 'shop_remove': {
        const sh = s.shop;
        if (!sh) throw new Error('no shop');
        await this.press('removal service', button(a.pay === 'gold' ? `${sh.removePrice} GOLD` : `1 ◆ + ${sh.removeShardGold} GOLD`));
        await this.settle();
        await this.pickCards(s, s.player.deck, [a.uid], /^REMOVE$/);
        return;
      }
      case 'rest': await this.press('rest', inList('rest', 0)); return;
      case 'smith':
        await this.press('smith', inList('rest', 1));
        await this.settle();
        await this.pickCards(s, s.player.deck, [a.uid], /^UPGRADE$/);
        return;
      case 'rest_special': await this.press('rest option', inList('rest', 2 + a.index)); return;
      case 'event_choice': await this.press('event option', inList('event-options', a.index)); return;
      case 'choose_boss_relic': await this.press('boss relic', inList('boss-relics', a.index)); return;
      case 'skip_boss_relic': await this.press('skip boss relic', button(/^SKIP \+/)); return;
      case 'open_treasure': await this.press('open chest', button('OPEN CHEST')); return;
      case 'choice_toggle': throw new Error('choice_toggle: multi-pick answers are realized whole (playInputRun)');
    }
  }
}

/** Gate → title → NEW RUN → class select (pick the class, type the seed) → BEGIN CLIMB, by input only. */
export async function startByInput(vp: VibePage, device: Device, seed: string, classId: string, difficulty: Difficulty = 'standard'): Promise<void> {
  const press = (what: string, pick: Pick) => activate(vp, device, what, pick);
  // the gate wants a key or a click (a pad press passes it with sound off); wait for its fade-in first
  await vp.waitIdle();
  if (device === 'gamepad') await vp.padPress(0); else if (device === 'mouse') await vp.click({ x: 320, y: 180 }); else await vp.press('Enter');
  await vp.waitIdle();
  await press('NEW RUN', (w) => w.kind === 'ListRow' && w.label === 'NEW RUN');
  await vp.waitIdle();
  await press(`class ${classId}`, (w) => w.kind === 'ClassCard' && w.label.toUpperCase().startsWith(classId.toUpperCase()));
  await vp.waitIdle();
  // the seed field is typed on the keyboard whatever the device (a pad player would leave it random)
  await activate(vp, device === 'mouse' ? 'mouse' : 'keyboard', 'seed field', (w) => w.label.startsWith('Seed:'));
  await vp.page.keyboard.type(seed);
  await vp.press('Enter');
  await vp.waitIdle();
  // difficulty tier (ruling 71): the toggle starts on Standard
  if (difficulty === 'heroic') {
    await press('tier toggle', (w) => w.kind === 'Button' && w.label.startsWith('TIER:'));
    await vp.waitIdle();
    const t = (await vp.widgets()).find((w) => w.kind === 'Button' && w.label.startsWith('TIER:'));
    if (!t?.label.startsWith('TIER: HEROIC.')) throw new InputError(`the tier toggle shows "${t?.label ?? 'nothing'}" after one press, want TIER: HEROIC`);
  }
  await press('BEGIN CLIMB', (w) => w.kind === 'Button' && w.label === 'BEGIN CLIMB');
  await vp.waitIdle();
}

export async function playInputRun(vp: VibePage, job: InputJob, onStep?: (n: number, s: RunState) => void): Promise<RunOutcome> {
  const t0 = Date.now();
  const actions: Action[] = [];
  const applied: Action[] = [];
  const bossFights: string[] = [];
  let violations: Violation[] = [];
  let steps = 0;
  let last: RunState | null = null;
  const out = (status: RunOutcome['status'], error: string | null = null, artifacts: string | null = null): RunOutcome => ({
    job, status, act: last?.act ?? 0, floor: last?.floor ?? 0, steps, ms: Date.now() - t0, bossFights, violations, error, artifacts,
  });
  const fail = async (reason: string): Promise<RunOutcome> => out('failed', reason, await saveFailure(vp, { kind: `input-${job.device}`, seed: job.seed, classId: job.classId, actions: applied, startSave: null, reason, violations }));
  const realizer = new Realizer(vp, job.device);
  try {
    await startByInput(vp, job.device, job.seed, job.classId, job.difficulty ?? 'standard');
    const first = await vp.state();
    if (!first) return await fail('BEGIN CLIMB did not start a run');
    const seed = first.seed;
    if (seed !== job.seed.toUpperCase()) return await fail(`typed seed ${job.seed} but the run's seed is ${seed}`);
    if (first.classId !== job.classId) return await fail(`picked class ${job.classId} but the run is ${first.classId}`);
    if (first.difficulty !== (job.difficulty ?? 'standard')) return await fail(`picked tier ${job.difficulty ?? 'standard'} but the run is ${first.difficulty}`);
    applied.push(...await vp.takeApplied());
    const brain = new Brain(seed);
    for (;;) {
      await vp.waitIdle();
      if (vp.errors.length) return await fail(`console/page error: ${vp.errors[0] ?? ''}`);
      const snap = await vp.snapshot();
      const s = await vp.state();
      if (!s) return await fail('no run state');
      last = s;
      onStep?.(steps, s);
      const got = await vp.takeApplied();
      applied.push(...got);
      if (snap.screen?.name === 'act-transition') { await activate(vp, job.device, 'CLIMB', button('CLIMB')); continue; }
      const legal = s.phase === 'victory' || s.phase === 'defeat' ? [] : await vp.legal();
      const widgets = await vp.widgets();
      violations = checkSnapshot(snap, s, legal, widgets);
      if (violations.length) return await fail(`${violations.length} invariant violation(s): ${violations[0]?.code ?? ''}`);
      if (s.phase === 'victory' || s.phase === 'defeat' || (job.maxSteps !== undefined && steps >= job.maxSteps)) {
        violations = replayParity({ save: null, seed, classId: job.classId, difficulty: job.difficulty ?? 'standard' }, applied, s);
        if (violations.length) return await fail('page state differs from a headless replay');
        return out(s.phase === 'victory' || s.phase === 'defeat' ? s.phase : 'stopped');
      }
      let a = brain.choose(s, legal);
      // A multi-pick answer is a run of choice_toggle steps, but a player builds it inside the modal
      // (select cards, then confirm) and the UI applies the steps at confirm. So take the policy's whole
      // answer, realize that, and expect the toggles plus the confirm.
      const pcNow = s.combat?.pendingChoice ?? s.pendingChoice;
      let multi: Action[] | null = null;
      if (pcNow && isMultiPick(pcNow)) {
        const uids = heuristicAnswer(s, pcNow);
        a = { type: 'resolve_choice', uids: pcNow.choices.filter((c) => uids.includes(c)) };
        multi = planChoice(pcNow, uids);
      }
      actions.push(a);
      steps++;
      try {
        await realizer.realize(s, a, legal);
      } catch (e) {
        if (e instanceof InputError) return await fail(`input: ${e.message}`);
        throw e;
      }
      await vp.waitIdle();
      // the input must have applied exactly `a` (the reward screen's gold pickup may follow it)
      const now = await vp.takeApplied();
      applied.push(...now);
      const keys = now.map(actionKey);
      const extraOk = (k: string) => k === actionKey({ type: 'pick_reward', kind: 'gold' });
      const want = multi ? multi.map(actionKey) : [actionKey(a)];
      if (keys.slice(0, want.length).join('|') !== want.join('|') || !keys.slice(want.length).every(extraOk)) {
        // an event's first press finishes the typewriter text: press once more
        if (keys.length === 0 && s.phase === 'event') {
          await realizer.realize(s, a, legal);
          await vp.waitIdle();
          const again = await vp.takeApplied();
          applied.push(...again);
          if (again[0] && actionKey(again[0]) === actionKey(a)) continue;
        }
        violations = [{ code: 'input-mismatch', msg: `wanted [${want.join(', ')}], the input applied [${keys.join(', ')}]` }];
        return await fail('the input did not apply the intended action');
      }
      if (a.type === 'travel' && getNode(s.map, a.to).type === 'boss') {
        const after = await vp.state();
        if (after?.phase !== 'combat' || after.combat?.kind !== 'boss') {
          violations = [{ code: 'boss-node', msg: `clicked/pressed the boss node but phase is ${after?.phase ?? 'none'}` }];
          return await fail('boss did not spawn');
        }
        bossFights.push(after.combat.encounterId);
      }
    }
  } catch (e) {
    return await fail(e instanceof Error ? `${e.message}\n${e.stack ?? ''}` : String(e));
  }
}

/** Escape out of whatever is open (used by scenarios that open overlays). */
export async function backOut(vp: VibePage, device: Device): Promise<void> { await pressSemantic(vp, device, 'cancel'); }
