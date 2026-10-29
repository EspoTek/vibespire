// Tests check rules and the designers' raw numbers, so the global balance levers run neutral here.
// Shipping values live in src/engine/tuning.ts and are measured by the simulator (docs/balance/).
import { TUNING } from '../src/engine/tuning';

for (const act of [1, 2, 3] as const) {
  TUNING.enemyDamagePct[act] = 100;
  TUNING.enemyHpPct[act] = 100;
}
