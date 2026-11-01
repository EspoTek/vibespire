// BUG-3 (docs/v2/bugs.md): the reward screen printed TUNING's +1 Shard for a skip even when a
// skipShards modifier changes it (v1's Ascendant Prism made it 0). The screen now shows
// skipRewardShards(state), the number a skip really pays.
import { describe, expect, it } from 'vitest';
import { registerPack } from '../../src/content/registry';
import { Game, skipRewardShards, TUNING } from '../../src/engine';
import { makeEnv } from '../../src/engine/core';
import { gainRelic } from '../../src/engine/items';
import { drain } from '../../src/engine/queue';

registerPack({
  relics: [{ id: 'bugs_no_skip_shards', name: 'No Skip Shards', rarity: 'event', text: 'Skipping a card reward gives no Shards.', icon: 'fx', hooks: { skipShards: () => 0 } }],
}, 'bugs-test');

describe('BUG-3: skip Shards come from the engine', () => {
  it('is the tuning value normally and follows a skipShards modifier', () => {
    const g = Game.newRun('skip-shards', 'graft');
    expect(skipRewardShards(g.state)).toBe(TUNING.shards.skipReward);
    const env = makeEnv(g.state);
    gainRelic(env, 'bugs_no_skip_shards');
    drain(env);
    expect(skipRewardShards(g.state)).toBe(0);
  });
});
