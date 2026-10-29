// Content selection for simulator entry points.
// --content test: the test pack ONLY (registered and every listing / random pool restricted to it,
// like tests/testpack-only.ts), so test-pack runs do not depend on the real packs in flux.
// --content real: the real packs registered by src/content/index.ts (nothing else to do).

import { restrictListingsTo } from '../src/content';
import { registerTestPack } from '../src/content/testpack';

export function useTestPack(): void {
  registerTestPack();
  restrictListingsTo(['test']);
}
