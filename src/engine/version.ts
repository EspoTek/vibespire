/**
 * Save-format / state-shape version. Bump on any breaking RunState change: saves of any other version
 * are "incompatible" (discarded with a notice, see serialize.ts).
 *  - 2: the v1 release (live at vibespire.56bits.com.au).
 *  - 3: v2: PendingChoice.picked (step-wise multi-pick choices) and the content redesign.
 *  - 4: RunState.difficulty (ruling 71). A version 3 save loads as a Standard run (serialize.ts).
 */
export const ENGINE_VERSION = 4;
