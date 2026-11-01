/// <reference types="node" />
// Id lists for a focused v2 measurement, against the priors of a previous baseline
// (docs/balance/<label>-priors.json via lib/priors.ts):
//   npx tsx sim/v2-ids.ts changed-relics [--extremes 15]   relics whose definition matches no prior file, plus
//                                                          the baseline's top and bottom N by pooled win Δ
//   npx tsx sim/v2-ids.ts changed-cards                    class and colourless cards new or changed since
//   npx tsx sim/v2-ids.ts johnnies                         every johnny-<engine> persona name, all classes
// Prints one comma-separated list on stdout.

import { allCards, allClasses, allRelics } from '../src/content';
import { cardDefHash, priorFile, priorFiles, relicDefHash } from './policies/lib/priors';
import { engineNames } from './policies/personas';

const what = process.argv[2];
const p = priorFile();
if (!p) throw new Error('v2-ids: no priors file (run sim/priors.ts on the baseline first)');
const exAt = process.argv.indexOf('--extremes');
const ex = exAt < 0 ? 15 : Number(process.argv[exAt + 1]);
if (!Number.isInteger(ex) || ex < 0) throw new Error('--extremes needs a non-negative integer');

if (what === 'changed-relics') {
  const live = allRelics().filter((r) => r.rarity !== 'starter');
  // Changed = no prior file (newest or older) holds this relic with its current hash.
  const changed = live.filter((r) => !priorFiles().some((f) => f.relics[r.id]?.hash === relicDefHash(r))).map((r) => r.id);
  const pooled = Object.entries(p.relics).map(([id, e]) => {
    const vs = Object.values(e.byClass);
    const n = vs.reduce((a, v) => a + v.n, 0);
    return { id, win: vs.reduce((a, v) => a + v.win * v.n, 0) / Math.max(1, n) };
  });
  pooled.sort((a, b) => b.win - a.win);
  const liveIds = new Set(live.map((r) => r.id));
  const extremes = [...pooled.slice(0, ex), ...pooled.slice(-ex)].map((x) => x.id).filter((id) => liveIds.has(id));
  console.log([...new Set([...changed, ...extremes])].join(','));
} else if (what === 'changed-cards') {
  const ids = allCards()
    .filter((c) => (c.cls === 'colorless' || allClasses().some((k) => k.id === c.cls)) && (c.rarity === 'common' || c.rarity === 'uncommon' || c.rarity === 'rare'))
    .filter((c) => !priorFiles().some((f) => f.cards[c.id]?.hash === cardDefHash(c)))
    .map((c) => c.id);
  console.log(ids.join(','));
} else if (what === 'johnnies') {
  console.log([...new Set(allClasses().flatMap((c) => engineNames(c.id).map((e) => `johnny-${e}`)))].join(','));
} else throw new Error(`v2-ids: unknown list '${String(what)}' (changed-relics | changed-cards | johnnies)`);
