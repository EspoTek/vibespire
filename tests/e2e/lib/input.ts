// Reach and press a widget with real input only: mouse (move + click where a hit-test lands on it),
// keyboard (arrow keys + Enter) or the virtual gamepad (D-pad + A). Keyboard/pad navigation steers
// by geometry from the focused widget toward the target; a target it cannot reach within MAX_PRESSES
// (or a widget no direction leaves) is reported as unreachable / a focus trap.

import type { WidgetInfo } from '../../../src/render/debug/e2e.ts';
import type { VibePage } from './vibe.ts';

export type Device = 'mouse' | 'keyboard' | 'gamepad';
type Dir = 'up' | 'down' | 'left' | 'right';

const MAX_PRESSES = 250;
const KEYS: Record<Dir | 'confirm' | 'cancel', string> = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', confirm: 'Enter', cancel: 'Escape' };
const PAD: Record<Dir | 'confirm' | 'cancel' | 'endTurn' | 'nextTarget', number> = { up: 12, down: 13, left: 14, right: 15, confirm: 0, cancel: 1, endTurn: 2, nextTarget: 5 };

export class InputError extends Error {}

const centre = (w: WidgetInfo) => ({ x: w.rect.x + w.rect.w / 2, y: w.rect.y + w.rect.h / 2 });

export async function pressSemantic(vp: VibePage, device: Device, what: Dir | 'confirm' | 'cancel'): Promise<void> {
  if (device === 'gamepad') await vp.padPress(PAD[what]);
  else await vp.press(KEYS[what]);
}

/** Directions to try from `cur` toward `target`, best first. */
function directions(cur: WidgetInfo, target: WidgetInfo): Dir[] {
  const a = centre(cur), b = centre(target);
  const dx = b.x - a.x, dy = b.y - a.y;
  const h: Dir = dx >= 0 ? 'right' : 'left';
  const v: Dir = dy >= 0 ? 'down' : 'up';
  // same list (hand, map row, menus): walk it in list order along its axis
  if (cur.list && target.list && cur.list.key === target.list.key) {
    const fwd = target.list.index > cur.list.index;
    const along: Dir = cur.list.axis === 'x' ? (fwd ? 'right' : 'left') : (fwd ? 'down' : 'up');
    return [along, ...(['up', 'down', 'left', 'right'] as Dir[]).filter((d) => d !== along)];
  }
  const primary = Math.abs(dx) > Math.abs(dy) * 1.5 ? [h, v] : [v, h];
  const rest = (['up', 'down', 'left', 'right'] as Dir[]).filter((d) => !primary.includes(d));
  return [...primary, ...rest];
}

/**
 * Focus the widget `pick` selects (re-evaluated after every press, since screens rebuild) and press
 * confirm, or click it. Returns the widget pressed.
 */
export async function activate(vp: VibePage, device: Device, what: string, pick: (w: WidgetInfo, all: readonly WidgetInfo[]) => boolean): Promise<WidgetInfo> {
  let ws = await vp.widgets();
  const find = () => ws.find((w) => pick(w, ws));
  let target = find();
  if (!target) throw new InputError(`${what}: no such widget on screen (navigable: ${ws.map((w) => `${w.kind}:${w.label.slice(0, 24)}`).join(' | ')})`);
  if (!target.enabled) throw new InputError(`${what}: "${target.label}" is disabled`);
  if (device === 'mouse') {
    if (!target.clientClick) throw new InputError(`${what}: "${target.label}" (${target.kind} at ${JSON.stringify(target.rect)}) cannot be clicked: hidden or covered`);
    await vp.click(target.clientClick);
    return target;
  }
  // Explore the focus graph like a patient player: follow known moves toward the target, and when no
  // known route exists, try an untested direction (geometric best first) from the nearest widget that
  // still has one. Only when every reachable widget has had every direction tried is it a trap.
  const edges = new Map<string, Map<Dir, string>>();
  const byId = (id: string) => ws.find((w) => w.id === id);
  const route = (from: string, goal: (id: string) => boolean): { dir: Dir; to: string } | null => {
    // BFS over known edges; returns the first step of the shortest route
    const seen = new Map<string, { dir: Dir; to: string } | null>([[from, null]]);
    const queue = [from];
    while (queue.length) {
      const id = queue.shift() as string;
      if (id !== from && goal(id)) return seen.get(id) ?? null;
      for (const [d, to] of edges.get(id) ?? []) {
        if (seen.has(to)) continue;
        seen.set(to, seen.get(id) ?? { dir: d, to });
        queue.push(to);
      }
    }
    return null;
  };
  for (let i = 0; i < MAX_PRESSES; i++) {
    const cur = ws.find((w) => w.focused);
    if (cur && cur.id === target.id) {
      await pressSemantic(vp, device, 'confirm');
      return target;
    }
    let dir: Dir;
    const goal: WidgetInfo = target;
    if (!cur) dir = 'down'; // nothing focused: any direction focuses the first widget
    else {
      const untried = (id: string): Dir[] => {
        const w = byId(id);
        const known = edges.get(id);
        return w ? directions(w, goal).filter((d) => !known?.has(d)) : [];
      };
      const toTarget = route(cur.id, (id) => id === goal.id);
      const here = untried(cur.id);
      if (toTarget) dir = toTarget.dir;
      else if (here.length) dir = here[0] as Dir;
      else {
        const toFrontier = route(cur.id, (id) => untried(id).length > 0);
        if (!toFrontier) throw new InputError(`${what}: focus trap: every direction from every widget reachable from "${cur.label.slice(0, 40)}" (${cur.kind}) was tried; "${target.label.slice(0, 40)}" (${target.kind}) is never reached`);
        dir = toFrontier.dir;
      }
    }
    await pressSemantic(vp, device, dir);
    ws = await vp.widgets();
    const after = ws.find((w) => w.focused);
    if (cur && after) {
      const m = edges.get(cur.id) ?? new Map<Dir, string>();
      m.set(dir, after.id);
      edges.set(cur.id, m);
    }
    const next = find();
    if (!next) throw new InputError(`${what}: the target vanished while navigating`);
    target = next;
  }
  throw new InputError(`${what}: not reached with ${MAX_PRESSES} ${device} presses (focused: ${ws.find((w) => w.focused)?.label.slice(0, 40) ?? 'nothing'})`);
}
