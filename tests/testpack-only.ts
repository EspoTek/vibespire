// Import first in engine tests: registers the test pack and restricts every listing / random pool to
// the test pack (statuses and rest options stay fully listed), so engine tests never depend on the real packs (in flux).
import { restrictListingsTo } from '../src/content';
import { registerTestPack } from '../src/content/testpack';

registerTestPack();
restrictListingsTo(['test']);
