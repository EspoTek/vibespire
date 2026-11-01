// Scenarios: targeted real-browser checks built on fixture saves (lib/fixtures.ts), each loaded the
// way a returning player loads a run (gate → title → CONTINUE).
//
//  boss-a<act>-<boss>  every boss of every act forced onto the map: the boss node is drawn and
//                      clickable from row 14, clicking it starts that boss fight with the boss on
//                      screen, a reload + CONTINUE mid-fight shows it again, then the fight is played
//                      out (boss relic, act transition) until the next act's map or victory.
//  shop-writ           Shard Writ bought in a shop makes that shop's Shard removal free at once (BUG-2).
//  shop-rack           Vial Rack bought with a full belt: +1 slot shown, potions cheaper at once (BUG-2).
//  reward-skip         the skip button's Shards are what a skip pays (BUG-3), clicked with the mouse.
//  reward-relic        an elite's relic picked on the reward screen shows up in the HUD at once.
//  old-save            a real save of the live v1 build: discarded with a notice, no crash (BUG-11).

import fs from 'node:fs';
import path from 'node:path';
import { allPotions, encountersFor, getEncounterDef, getEnemyDef } from '../../src/content/index.ts';
import { Game, skipRewardShards, TUNING, type Act, type Action, type RunState } from '../../src/engine/index.ts';
import { continueFromTitle, playRun, type RunJob, type RunOutcome } from './drivers/action.ts';
import { saveFailure } from './lib/artifacts.ts';
import { REPO } from './lib/env.ts';
import { normalHp, playUntil, saveOf } from './lib/fixtures.ts';
import { activate, type Device } from './lib/input.ts';
import { startByInput } from './drivers/input.ts';
import { checkSnapshot, type Violation } from './lib/invariants.ts';
import type { VibePage } from './lib/vibe.ts';

export interface Scenario {
  kind: string;
  classId: string;
  run(vp: VibePage, progress: (msg: string) => void): Promise<RunOutcome>;
}

/** Shared scaffolding: load the fixture, run UI steps with invariant checks, hand over to the policy. */
class Ctx {
  readonly applied: Action[] = [];
  violations: Violation[] = [];
  readonly bossFights: string[] = [];
  private readonly t0 = Date.now();
  constructor(readonly vp: VibePage, readonly job: RunJob, readonly progress: (m: string) => void) {}

  async load(): Promise<void> {
    if (!this.job.startSave) throw new Error('scenario without a fixture save');
    await this.vp.writeSave(this.job.startSave);
    await this.vp.boot();
    await continueFromTitle(this.vp);
  }

  async state(): Promise<RunState> {
    const s = await this.vp.state();
    if (!s) throw new Error('no run state');
    return s;
  }

  /** Wait idle, collect applied actions, check every invariant plus `extra`; throws ScenarioFail on any. */
  async check(what: string, extra: (s: RunState) => string[] = () => []): Promise<RunState> {
    await this.vp.waitIdle();
    if (this.vp.errors.length) throw new ScenarioFail(`${what}: console/page error: ${this.vp.errors[0] ?? ''}`);
    this.applied.push(...await this.vp.takeApplied());
    const s = await this.state();
    const snap = await this.vp.snapshot();
    const legal = s.phase === 'victory' || s.phase === 'defeat' ? [] : await this.vp.legal();
    const v = [...checkSnapshot(snap, s, legal, await this.vp.widgets()), ...extra(s).map((msg) => ({ code: 'scenario', msg }))];
    if (v.length) { this.violations = v; throw new ScenarioFail(`${what}: ${v.length} violation(s): ${v[0]?.code ?? ''}`); }
    this.progress(`${what} ok (act ${s.act} floor ${s.floor} ${s.phase})`);
    return s;
  }

  press(device: Device, what: string, pick: Parameters<typeof activate>[3]): Promise<unknown> { return activate(this.vp, device, what, pick); }

  outcome(status: RunOutcome['status'], s: RunState | null, error: string | null = null, artifacts: string | null = null): RunOutcome {
    return { job: this.job, status, act: s?.act ?? 0, floor: s?.floor ?? 0, steps: this.applied.length, ms: Date.now() - this.t0, bossFights: this.bossFights, violations: this.violations, error, artifacts };
  }

  async fail(reason: string): Promise<RunOutcome> {
    const dir = await saveFailure(this.vp, { kind: this.job.kind, seed: this.job.seed, classId: this.job.classId, actions: this.applied, startSave: this.job.startSave ?? null, reason, violations: this.violations });
    return this.outcome('failed', await this.vp.state().catch(() => null), reason, dir);
  }

  /** Play on with the policy (action driver, same invariants) until `stop` holds or the run ends. */
  async handOver(stop: (s: RunState) => boolean): Promise<RunOutcome> {
    const r = await playRun(this.vp, { ...this.job, attached: true, priorApplied: [...this.applied, ...await this.vp.takeApplied()], stopWhen: stop });
    return { ...r, bossFights: [...this.bossFights, ...r.bossFights], ms: Date.now() - this.t0 };
  }
}

class ScenarioFail extends Error {}

function scenario(kind: string, classId: string, seed: string, build: () => string, body: (c: Ctx) => Promise<RunOutcome>): Scenario {
  return {
    kind, classId,
    async run(vp, progress) {
      let save: string;
      try { save = build(); } catch (e) {
        return { job: { kind, seed, classId }, status: 'failed', act: 0, floor: 0, steps: 0, ms: 0, bossFights: [], violations: [], error: `fixture: ${e instanceof Error ? e.message : String(e)}`, artifacts: null };
      }
      const c = new Ctx(vp, { kind, seed, classId, startSave: save }, progress);
      try {
        return await body(c);
      } catch (e) {
        return await c.fail(e instanceof Error ? `${e.message}${e instanceof ScenarioFail ? '' : `\n${e.stack ?? ''}`}` : String(e));
      }
    },
  };
}

const goods = (index: number) => (w: { list: { key: string; index: number } | null }) => w.list?.key === 'shop-goods' && w.list.index === index;

function bossScenario(act: Act, boss: string, classId: string): Scenario {
  const seed = `BOSS${act}${boss}${classId}`.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return scenario(`boss-a${act}-${boss}`, classId, seed,
    () => saveOf(playUntil({ seed, classId, god: true, until: (s) => s.act === act && s.phase === 'map' && s.mapPos?.row === 14 && s.pendingChoice === null }), (s) => {
      s.map.bossEncounter = boss;
      normalHp(s, 400);
    }),
    async (c) => {
      await c.load();
      await c.check('map at row 14 (loaded with CONTINUE)', (s) => (s.phase === 'map' && s.mapPos?.row === 14 ? [] : [`expected the row-14 map, got ${s.phase}`]));
      await c.press('mouse', 'click the boss node', (w) => w.kind === 'MapNodeWidget' && w.label.startsWith('BOSS'));
      const s = await c.check('boss fight after the click', (st) =>
        st.phase === 'combat' && st.combat?.kind === 'boss' && st.combat.encounterId === boss ? [] : [`clicking the boss node gave ${st.phase} ${st.combat?.kind ?? ''} ${st.combat?.encounterId ?? ''}, want boss ${boss}`]);
      c.bossFights.push(s.combat?.encounterId ?? '?');
      // the save / continue path in the middle of the boss fight
      c.applied.push(...await c.vp.takeApplied());
      await c.vp.boot();
      await continueFromTitle(c.vp);
      await c.check('boss fight after reload + CONTINUE', (st) => (st.combat?.kind === 'boss' ? [] : [`after CONTINUE the phase is ${st.phase}`]));
      return c.handOver((st) => st.act !== act || st.phase === 'victory');
    });
}

function shopFixture(seed: string, classId: string, mutate: (s: RunState) => void): () => string {
  return () => saveOf(playUntil({ seed, classId, god: true, until: (s) => s.phase === 'shop' && s.shop !== null && s.pendingChoice === null }), (s) => {
    normalHp(s, 80);
    s.player.gold = 999;
    s.player.counters['shards'] = 3;
    mutate(s);
  });
}

function shopWrit(classId: string): Scenario {
  const seed = `SHOPWRIT${classId.toUpperCase()}`;
  return scenario('shop-writ', classId, seed, shopFixture(seed, classId, (s) => {
    if (!s.shop) throw new Error('no shop');
    s.player.relics = s.player.relics.filter((r) => r.id !== 'shard_writ');
    s.shop.relics[0] = { id: 'shard_writ', price: 150, sold: false };
  }), async (c) => {
    await c.load();
    await c.check('shop loaded', (s) => (s.shop?.removeShardGold === TUNING.shop.removeShardGold ? [] : [`Shard removal costs ${s.shop?.removeShardGold} before Shard Writ`]));
    await c.press('mouse', 'buy Shard Writ', goods(0));
    const after = await c.check('Shard Writ bought', (s) => [
      ...(s.player.relics.some((r) => r.id === 'shard_writ') ? [] : ['Shard Writ was not bought']),
      ...(s.shop?.removeShardGold === 0 ? [] : [`Shard removal still costs ${s.shop?.removeShardGold} gold in the shop it was bought in`]),
    ]);
    const gold = after.player.gold;
    await c.press('mouse', 'Shard removal', (w) => w.kind === 'Button' && w.label === '1 ◆ + 0 GOLD');
    await c.vp.waitIdle();
    await c.press('mouse', 'pick the first card', (w, all) => all.filter((x) => x.kind === 'CardFrame')[0] === w);
    await c.vp.waitIdle();
    await c.press('mouse', 'REMOVE', (w) => w.kind === 'Button' && w.label === 'REMOVE');
    const s = await c.check('card removed with a Shard', (st) => [
      ...(st.player.gold === gold ? [] : [`the Shard removal cost gold (${gold} → ${st.player.gold})`]),
      ...(st.shop?.removeUsed === false ? [] : ['the Shard removal used up the shop service']),
    ]);
    return c.outcome('stopped', s);
  });
}

function shopRack(classId: string): Scenario {
  const seed = `SHOPRACK${classId.toUpperCase()}`;
  let before: number[] = [];
  return scenario('shop-rack', classId, seed, shopFixture(seed, classId, (s) => {
    if (!s.shop) throw new Error('no shop');
    s.player.relics = s.player.relics.filter((r) => r.id !== 'vial_rack');
    s.shop.relics[0] = { id: 'vial_rack', price: 150, sold: false };
    const filler = allPotions().find((p) => p.cls === undefined);
    if (!filler) throw new Error('no shared potion');
    s.player.potions = Array.from({ length: s.player.potionSlots }, () => filler.id);
    before = s.shop.potions.map((p) => p.price);
  }), async (c) => {
    await c.load();
    const s0 = await c.check('shop loaded with a full belt');
    await c.press('mouse', 'buy Vial Rack', goods(0));
    const s = await c.check('Vial Rack bought', (st) => {
      const want = before.map((p) => Math.floor((p * 75) / 100));
      const got = st.shop?.potions.map((p) => p.price) ?? [];
      return [
        ...(st.player.potionSlots === s0.player.potionSlots + 1 ? [] : [`potion slots ${s0.player.potionSlots} → ${st.player.potionSlots}`]),
        ...(got.join(',') === want.join(',') ? [] : [`potion prices ${got.join(',')} after Vial Rack, want ${want.join(',')}`]),
      ];
    });
    // a potion is buyable now that the belt has room
    await c.press('mouse', 'buy a potion', goods(s.shop?.relics.length ?? 3));
    const s2 = await c.check('potion bought into the new slot', (st) => (st.player.potions.length === st.player.potionSlots ? [] : [`belt ${st.player.potions.length}/${st.player.potionSlots}`]));
    return c.outcome('stopped', s2);
  });
}

function rewardSkip(classId: string): Scenario {
  const seed = `SKIP${classId.toUpperCase()}`;
  return scenario('reward-skip', classId, seed,
    () => saveOf(playUntil({ seed, classId, god: true, until: (s) => s.phase === 'reward' && s.reward?.cardStatus === 'pending' && (s.reward.cards.length ?? 0) > 0 && s.pendingChoice === null }), (s) => {
      normalHp(s, 80);
      s.player.relics = s.player.relics.filter((r) => r.id !== 'binding_contract'); // it forbids skipping
      s.player.counters['shards'] = 0;
    }),
    async (c) => {
      await c.load();
      const s0 = await c.check('reward screen');
      const pay = skipRewardShards(s0);
      await c.press('mouse', 'skip the card', (w) => w.kind === 'Button' && w.label === `SKIP +${pay} ◆`);
      const s = await c.check('skipped', (st) => (st.player.counters['shards'] === pay ? [] : [`the skip button promised +${pay}; Shards went 0 → ${st.player.counters['shards'] ?? 'none'}`]));
      return c.outcome('stopped', s);
    });
}

function rewardRelic(classId: string): Scenario {
  const seed = `ELITE${classId.toUpperCase()}`;
  return scenario('reward-relic', classId, seed,
    () => saveOf(playUntil({ seed, classId, god: true, until: (s) => s.phase === 'reward' && s.reward?.relic !== null && s.reward?.relicTaken === false && s.pendingChoice === null }), (s) => normalHp(s, 80)),
    async (c) => {
      await c.load();
      await c.check('elite reward');
      await c.press('mouse', 'take the relic', (w) => w.label.startsWith('RELIC:'));
      await c.check('relic taken');
      return c.handOver((st) => st.phase === 'map');
    });
}

/**
 * old-save: a real save of the live v1 build (tests/bugs/fixtures/v1-saves.json, mid-combat) in the
 * save slot. Booting must not crash: the title says the run can't be continued, CONTINUE is grey,
 * the save is gone, and NEW RUN still works (BUG-11).
 */
function oldSave(classId: string): Scenario {
  const v1 = (JSON.parse(fs.readFileSync(path.join(REPO, 'tests/bugs/fixtures/v1-saves.json'), 'utf8')) as Record<string, string>)[classId];
  return scenario('old-save', classId, 'V1', () => {
    if (v1 === undefined) throw new Error(`no v1 save for ${classId}`);
    return v1;
  }, async (c) => {
    if (!c.job.startSave) throw new Error('no save');
    await c.vp.writeSave(c.job.startSave);
    await c.vp.boot();
    await c.vp.waitIdle();
    await c.vp.press('Enter'); // the gate
    await c.vp.waitIdle();
    const snap = await c.vp.snapshot();
    if (c.vp.errors.length) throw new ScenarioFail(`booting with a v1 save: ${c.vp.errors[0] ?? ''}`);
    const problems: string[] = [];
    if (snap.screen?.name !== 'title') problems.push(`screen ${snap.screen?.name ?? 'none'}, want the title`);
    if (!snap.labels.some((l) => l.includes("can't be continued"))) problems.push(`no notice (labels: ${snap.labels.join(' | ')})`);
    const slot = await c.vp.page.evaluate("localStorage.getItem('vibespire.run')");
    if (slot !== null) problems.push('the old save is still in the slot');
    await c.press('mouse', 'OK', (w) => w.kind === 'Button' && w.label === 'OK');
    await c.vp.waitIdle();
    const cont = (await c.vp.widgets()).find((w) => w.label.startsWith('CONTINUE'));
    if (!cont || cont.enabled) problems.push(`CONTINUE should be disabled (${JSON.stringify(cont)})`);
    await c.press('mouse', 'NEW RUN', (w) => w.kind === 'ListRow' && w.label === 'NEW RUN');
    await c.vp.waitIdle();
    const after = await c.vp.snapshot();
    if (after.screen?.name !== 'class-select') problems.push(`NEW RUN led to ${after.screen?.name ?? 'none'}`);
    if (problems.length) { c.violations = problems.map((msg) => ({ code: 'old-save', msg })); throw new ScenarioFail(problems.join('; ')); }
    c.progress('v1 save discarded with a notice');
    return c.outcome('stopped', null);
  });
}

/**
 * heroic-tier: start a run through the class-select UI with the mouse, Heroic toggled on (ruling 71),
 * play to the first fight, and check the tier: the run state, the HUD, and every enemy's HP against
 * a headless Standard run with the same actions (one HP roll must explain both tiers' numbers).
 */
function heroicTier(classId: string): Scenario {
  const seed = `HEROIC${classId.toUpperCase()}`;
  const job: RunJob = { kind: 'heroic-tier', seed, classId, difficulty: 'heroic' };
  return {
    kind: 'heroic-tier', classId,
    async run(vp, progress) {
      const c = new Ctx(vp, job, progress);
      try {
        await startByInput(vp, 'mouse', seed, classId, 'heroic');
        const s0 = await c.check('Heroic run started from the class-select toggle', (st) => (st.difficulty === 'heroic' ? [] : [`the run is ${st.difficulty}`]));
        const hud = (await vp.snapshot()).hud;
        if (!hud?.texts.some((t) => t.endsWith('· HEROIC'))) throw new ScenarioFail(`the HUD does not show HEROIC (${JSON.stringify(hud?.texts)})`);
        const r = await c.handOver((st) => st.phase === 'combat');
        if (r.status === 'failed') return r;
        const s = await c.state();
        if (s.phase !== 'combat' || !s.combat) throw new ScenarioFail(`no fight reached (${s.phase})`);
        // the same actions on a headless Standard run of the same seed
        const std = Game.newRun(seed, classId, { difficulty: 'standard' });
        if (!r.applied) throw new Error('playRun returned no applied log');
        const applied = r.applied; // includes the actions applied before the hand-over (priorApplied)
        for (const a of applied) std.apply(a);
        const stdEnemies = std.state.combat?.enemies ?? [];
        const sp = TUNING.difficulty.standard.enemyHpPct[s.act], hp = TUNING.difficulty.heroic.enemyHpPct[s.act];
        const problems: string[] = [];
        s.combat.enemies.forEach((e, i) => {
          const o = stdEnemies[i];
          if (!o || o.id !== e.id) { problems.push(`enemy ${i}: ${e.id} vs standard ${o?.id ?? 'none'}`); return; }
          const [lo, hi] = getEnemyDef(e.id).hp;
          const ok = Array.from({ length: hi - lo + 1 }, (_, k) => lo + k).some((raw) => Math.max(1, Math.round((raw * hp) / 100)) === e.maxHp && Math.max(1, Math.round((raw * sp) / 100)) === o.maxHp);
          if (!ok) problems.push(`${e.id}: Heroic ${e.maxHp} HP vs Standard ${o.maxHp} HP is not one roll scaled by ${hp}% / ${sp}%`);
        });
        if (problems.length) { c.violations = problems.map((msg) => ({ code: 'heroic-hp', msg })); throw new ScenarioFail(problems.join('; ')); }
        progress(`Heroic enemy HP ${s.combat.enemies.map((e) => e.maxHp).join('/')} vs Standard ${stdEnemies.map((e) => e.maxHp).join('/')}`);
        void s0;
        return c.outcome('stopped', s);
      } catch (e) {
        return await c.fail(e instanceof Error ? e.message : String(e));
      }
    },
  };
}

export function scenarioJobs(o: { acts: readonly number[]; classes: readonly string[]; everyClass?: boolean }): Scenario[] {
  const out: Scenario[] = [];
  let k = 0;
  for (const act of o.acts as Act[]) {
    for (const enc of encountersFor(act, 'boss')) {
      const classes = o.everyClass ? o.classes : [o.classes[k++ % o.classes.length] as string];
      for (const cls of classes) out.push(bossScenario(act, enc.id, cls));
      getEncounterDef(enc.id); // registry check: throws on a broken pack
    }
  }
  const cls = o.classes[0] as string;
  out.push(shopWrit(cls), shopRack(o.classes[1 % o.classes.length] as string), rewardSkip(o.classes[2 % o.classes.length] as string), rewardRelic(cls), oldSave(cls), heroicTier(o.classes[1 % o.classes.length] as string));
  return out;
}
