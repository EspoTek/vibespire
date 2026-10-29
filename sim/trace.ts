/// <reference types="node" />
// Trace one run: prints every decision (combat turns with hand, intents and the chosen action; map,
// reward, shop, rest and event picks). For eyeballing what a policy does.
// Usage: npx tsx sim/trace.ts --seed sim-3-test_class --class test_class --content test [--policy greedy]
//        [--from-floor 10] [--combat-only]

import { useTestPack } from './content';
import { getCardDef } from '../src/content';
import { Game, hashString, nextU32, type Action, type RunState } from '../src/engine';
import { POLICIES } from './batch';

function arg(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0) return null;
  const v = process.argv[i + 1];
  if (v === undefined || v.startsWith('--')) throw new Error(`--${name} needs a value`);
  return v;
}

function cardName(s: RunState, uid: number): string {
  const c = s.combat;
  const all = c ? [...c.hand, ...c.draw, ...c.discard] : [];
  const card = all.find((x) => x.uid === uid) ?? s.player.deck.find((x) => x.uid === uid);
  if (!card) return `#${uid}`;
  const b = card.vars?.bloom ? `(b${card.vars.bloom})` : '';
  return `${getCardDef(card.id, card.upgraded).name}${b}`;
}

function describe(s: RunState, a: Action): string {
  switch (a.type) {
    case 'play_card':
      return `play ${cardName(s, a.uid)}${a.target !== undefined ? ` -> e${a.target}` : ''}`;
    case 'resolve_choice':
      return `choose [${a.uids.map((u) => (s.combat?.pendingChoice?.from === null ? String(u) : cardName(s, u))).join(', ')}]`;
    default:
      return JSON.stringify(a);
  }
}

function main(): void {
  const content = arg('content') ?? 'real';
  if (content === 'test') useTestPack();
  const seed = arg('seed') ?? 'sim-0';
  const cls = arg('class') ?? 'test_class';
  const policy = POLICIES[arg('policy') ?? 'greedy'];
  if (!policy) throw new Error('unknown policy');
  const fromFloor = Number(arg('from-floor') ?? '0');
  const combatOnly = process.argv.includes('--combat-only');
  const g = Game.newRun(seed, cls, { atomic: false });
  const prng = hashString(`policy:${policy.name}:${seed}`);
  let lastTurn = -1;
  while (g.state.phase !== 'victory' && g.state.phase !== 'defeat') {
    const s = g.state;
    const legal = g.legalActions();
    const a = policy.choose(g, legal, nextU32(prng));
    const show = s.floor >= fromFloor && (!combatOnly || s.phase === 'combat');
    if (show) {
      const c = s.combat;
      if (s.phase === 'combat' && c && c.turn !== lastTurn && !c.pendingChoice) {
        lastTurn = c.turn;
        const enemies = c.enemies
          .filter((e) => e.alive)
          .map((e) => {
            const st = Object.entries(e.statuses).filter(([, n]) => n !== 0).map(([k, n]) => `${k}${n}`).join(',');
            const it = e.intent;
            const dmg = it.damage !== undefined ? ` ${it.damage}x${it.hits ?? 1}` : '';
            return `e${e.uid}:${e.id} ${e.hp}/${e.maxHp}${e.block ? ` b${e.block}` : ''}${st ? ` [${st}]` : ''} <${it.kind}${dmg}>`;
          })
          .join(' | ');
        const pst = Object.entries(c.player.statuses).filter(([, n]) => n !== 0).map(([k, n]) => `${k}${n}`).join(',');
        console.log(`  F${s.floor} ${c.encounterId} T${c.turn} hp=${s.player.hp}/${s.player.maxHp} blk=${c.player.block} grd=${c.player.guard} E=${c.energy}${pst ? ` [${pst}]` : ''}`);
        console.log(`    enemies: ${enemies}`);
        console.log(`    hand: ${c.hand.map((x) => cardName(s, x.uid)).join(', ')}`);
      }
      console.log(`${s.phase === 'combat' ? '      ' : `F${s.floor} ${s.phase}: `}${describe(s, a)}`);
    }
    g.apply(a);
  }
  const s = g.state;
  console.log(`== ${s.phase} on floor ${s.floor} (act ${s.act}), hp ${s.player.hp}/${s.player.maxHp}, deck ${s.player.deck.length}: ${s.player.deck.map((c) => getCardDef(c.id, c.upgraded).name).join(', ')}`);
}

main();
