// Tests check rules and the designers' raw numbers, so the global balance levers run neutral here.
// Shipping values live in src/engine/tuning.ts and are measured by the simulator (docs/balance/).
import { TUNING } from '../src/engine/tuning';

for (const act of [1, 2, 3] as const) {
  for (const tier of [TUNING.difficulty.standard, TUNING.difficulty.heroic]) {
    tier.enemyHpPct[act] = 100; // both tiers neutral: tests pin the tier and levers they need
    tier.enemyDamagePct[act] = 100;
  }
}

// Enemy AI purity: tests run chooseMove on deep-frozen copies, so any write by content AI throws here
// (the simulator and production use the cheaper copy mode, src/engine/enemies.ts AI_PURITY).
import { AI_PURITY } from '../src/engine/enemies';
AI_PURITY.mode = 'frozen';
