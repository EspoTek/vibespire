// Difficulty tiers (docs/RULINGS.md rulings 71, 74 and 76): Standard (default) and Heroic, chosen at run
// start, stored in the run state. Each tier holds both enemy levers: TUNING.difficulty[tier].enemyHpPct
// (rolled HP) and .enemyDamagePct (pipeline step 3 on enemy hits, intents and previews included).
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getClassDef, getEnemyDef } from '../../src/content';
import { classMaxHpBonus, computeIntent, ENGINE_VERSION, Game, parseSaveOrIncompatible, deserialize, renderMoveText, TUNING, type Difficulty } from '../../src/engine';
import { scaledEnemyHp } from '../../src/engine/enemies';
import { applyOverrides, difficultyArg } from '../../sim/overrides';
import { difficultyHint } from '../../src/render/game/difficulty';

const tiers = TUNING.difficulty;
const LEVELS = { standard: { hp: 85, dmg: 75 }, heroic: { hp: 110, dmg: 85 } } as const;
let saved: string;
beforeEach(() => {
  saved = JSON.stringify(tiers);
  for (const t of ['standard', 'heroic'] as const) {
    for (const act of [1, 2, 3] as const) { tiers[t].enemyHpPct[act] = LEVELS[t].hp; tiers[t].enemyDamagePct[act] = LEVELS[t].dmg; }
  }
});
afterEach(() => {
  const back = JSON.parse(saved) as typeof tiers;
  for (const t of ['standard', 'heroic'] as const) {
    for (const act of [1, 2, 3] as const) { tiers[t].enemyHpPct[act] = back[t].enemyHpPct[act]; tiers[t].enemyDamagePct[act] = back[t].enemyDamagePct[act]; }
  }
});

/** Same seed, same choices (first pact, leftmost path) until the first fight. */
function firstFight(difficulty: Difficulty): Game {
  const g = Game.newRun('tiers', 'breaker', { difficulty });
  for (let i = 0; i < 50 && g.state.phase !== 'combat'; i++) g.apply(g.legalActions()[0] as Parameters<Game['apply']>[0]);
  if (g.state.phase !== 'combat') throw new Error('no fight reached');
  return g;
}

/** An attack move of the first enemy with a fixed printed damage (in its first damage effect), and that damage. */
function printedAttack(g: Game): { uid: number; moveId: string; printed: number } {
  const e = g.state.combat?.enemies[0];
  if (!e) throw new Error('no enemy');
  for (const [moveId, move] of Object.entries(getEnemyDef(e.id).moves)) {
    const hit = move.effects.find((x) => x.type === 'damage' && typeof x.amount === 'number');
    if (hit && hit.type === 'damage' && typeof hit.amount === 'number' && hit.amount > 0) return { uid: e.uid, moveId, printed: hit.amount };
  }
  throw new Error(`${e.id} has no fixed-damage attack`);
}

describe('difficulty tiers (rulings 71, 74)', () => {
  it('Standard is the default; Heroic is chosen at run start and stored in the state', () => {
    expect(Game.newRun('t', 'graft').state.difficulty).toBe('standard');
    expect(Game.newRun('t', 'graft', { difficulty: 'heroic' }).state.difficulty).toBe('heroic');
  });

  it('enemy HP follows the tier: same rolls, 85% vs 110%', () => {
    expect(scaledEnemyHp({ difficulty: 'standard', act: 1 }, 100)).toBe(85);
    expect(scaledEnemyHp({ difficulty: 'heroic', act: 2 }, 100)).toBe(110);
    expect(scaledEnemyHp({ difficulty: 'heroic', act: 3 }, 1)).toBe(1);
    const std = firstFight('standard').state.combat?.enemies ?? [];
    const her = firstFight('heroic').state.combat?.enemies ?? [];
    expect(her.map((e) => e.id)).toEqual(std.map((e) => e.id));
    expect(std.length).toBeGreaterThan(0);
    std.forEach((s, i) => {
      const h = her[i];
      if (!h) throw new Error('enemy missing');
      const [lo, hi] = getEnemyDef(s.id).hp;
      // one raw roll explains both: the tiers only rescale it
      const raws = Array.from({ length: hi - lo + 1 }, (_, k) => lo + k).filter((r) => Math.round(r * 0.85) === s.maxHp && Math.round(r * 1.1) === h.maxHp);
      expect(raws.length, `${s.id}: ${s.maxHp} vs ${h.maxHp}`).toBeGreaterThan(0);
    });
  });

  it('enemy damage follows the tier, and the intent and its text show the scaled number', () => {
    for (const t of ['standard', 'heroic'] as const) {
      const g = firstFight(t);
      const { uid, moveId, printed } = printedAttack(g);
      const e = g.state.combat?.enemies.find((x) => x.uid === uid);
      if (!e) throw new Error('enemy');
      const c = g.state.combat; // nothing else on either side
      if (!c) throw new Error('combat');
      c.player.statuses = {};
      e.statuses = {};
      const want = Math.floor((printed * LEVELS[t].dmg) / 100);
      expect(computeIntent(g.state, e, moveId).damage, `${t} ${e.id}.${moveId}`).toBe(want);
      expect(renderMoveText(g.state, uid, moveId) ?? '', `${t} move text`).toContain(String(want));
    }
  });

  it('saves keep the tier; a version 3 save loads as Standard; a bad tier is malformed', () => {
    const heroic = Game.newRun('t', 'chronist', { difficulty: 'heroic' }).save();
    expect(deserialize(heroic).difficulty).toBe('heroic');
    const v3 = JSON.parse(Game.newRun('t', 'chronist').save()) as Record<string, unknown>;
    delete v3.difficulty;
    v3.version = 3;
    const r = parseSaveOrIncompatible(JSON.stringify(v3));
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.state.difficulty).toBe('standard'); expect(r.state.version).toBe(ENGINE_VERSION); }
    expect(() => deserialize(JSON.stringify({ ...JSON.parse(heroic), difficulty: 'nightmare' }))).toThrow(/difficulty/);
  });
});

describe('sim levers and flags', () => {
  it('--set enemyDamagePct.all / enemyHpPct.all set both tiers; difficulty.<tier>.<lever> one', () => {
    const undo = applyOverrides({ 'enemyDamagePct.all': 60, 'enemyHpPct.2': 70 });
    expect([tiers.standard.enemyDamagePct[1], tiers.heroic.enemyDamagePct[3]]).toEqual([60, 60]);
    expect([tiers.standard.enemyHpPct[2], tiers.heroic.enemyHpPct[2], tiers.heroic.enemyHpPct[1]]).toEqual([70, 70, 110]);
    undo();
    expect([tiers.standard.enemyDamagePct[1], tiers.heroic.enemyHpPct[2]]).toEqual([75, 110]);
    const undoOne = applyOverrides({ 'difficulty.heroic.enemyDamagePct.all': 90 });
    expect([tiers.heroic.enemyDamagePct[2], tiers.standard.enemyDamagePct[2]]).toEqual([90, 75]);
    undoOne();
  });

  it('--difficulty picks the tier (default standard, anything else throws)', () => {
    expect(difficultyArg(['--runs', '5'])).toBe('standard');
    expect(difficultyArg(['--difficulty', 'heroic'])).toBe('heroic');
    expect(() => difficultyArg(['--difficulty', 'hard'])).toThrow(/standard or heroic/);
  });
});

describe('Standard max-HP bonus by class (ruling 76)', () => {
  it('Standard Chronist starts with +10 max HP and HP; Heroic and the other classes get nothing', () => {
    for (const cls of ['breaker', 'graft', 'chronist']) {
      const base = getClassDef(cls).maxHp;
      const std = Game.newRun('bonus', cls).state.player;
      const her = Game.newRun('bonus', cls, { difficulty: 'heroic' }).state.player;
      const bonus = cls === 'chronist' ? 10 : 0;
      expect([std.maxHp, std.hp], `${cls} standard`).toEqual([base + bonus, base + bonus]);
      expect([her.maxHp, her.hp], `${cls} heroic`).toEqual([base, base]);
    }
    expect(classMaxHpBonus('standard', 'chronist')).toBe(10);
  });

  it('a class missing from a tier is a bug: the lookup throws', () => {
    expect(() => classMaxHpBonus('standard', 'no_such_class')).toThrow(/classMaxHpBonus has no entry for class 'no_such_class'/);
  });

  it('--set difficulty.standard.classMaxHpBonus.chronist=N reaches run creation', () => {
    const undo = applyOverrides({ 'difficulty.standard.classMaxHpBonus.chronist': 4 });
    expect(Game.newRun('bonus', 'chronist').state.player.maxHp).toBe(getClassDef('chronist').maxHp + 4);
    undo();
    expect(classMaxHpBonus('standard', 'chronist')).toBe(10);
  });
});

describe('difficulty text (class-select tooltip)', () => {
  it('names the bonus only when the shown class has one', () => {
    expect(difficultyHint('standard', 'chronist')).toContain('The Chronist starts with +10 max HP.');
    expect(difficultyHint('standard', 'breaker')).not.toContain('max HP');
    expect(difficultyHint('heroic', 'chronist')).not.toContain('max HP');
    expect(difficultyHint('standard', null)).not.toContain('max HP');
  });

  it('is generated from both levers', () => {
    expect(difficultyHint('heroic', 'breaker')).toContain('Enemies have 29% more HP and hit 13% harder than on Standard (110% of their printed HP, 85% of their printed damage)');
    expect(difficultyHint('standard', 'breaker')).toContain('85% of their printed HP and deal 75% of their printed damage');
    tiers.heroic.enemyHpPct[3] = 120;
    expect(difficultyHint('heroic', 'breaker')).toContain('act 3 41% more HP');
    tiers.heroic.enemyDamagePct[1] = 75; tiers.heroic.enemyDamagePct[2] = 75; tiers.heroic.enemyDamagePct[3] = 75;
    expect(difficultyHint('heroic', 'breaker')).toContain('hit just as hard');
  });
});
