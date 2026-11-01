/**
 * Difficulty tier names and their explanation (ruling 71). Every number comes from
 * TUNING.difficulty, so the text follows whatever the simulator tunes the tiers to.
 */
import { getClassDef } from '../../content/index.ts';
import { classMaxHpBonus, TUNING, type Difficulty } from '../../engine/index.ts';

export const DIFFICULTY_NAMES: Readonly<Record<Difficulty, string>> = { standard: 'STANDARD', heroic: 'HEROIC' };

type Lever = 'enemyHpPct' | 'enemyDamagePct';

const pctOf = (t: Difficulty, lever: Lever): [number, number, number] => {
  const p = TUNING.difficulty[t][lever];
  return [p[1], p[2], p[3]];
};

/** "110%" when every act agrees, else "act 1 105%, act 2 110%, act 3 115%". */
function perAct(values: readonly number[], fmt: (v: number) => string): string {
  return values.every((v) => v === values[0]) ? fmt(values[0] as number) : values.map((v, i) => `act ${i + 1} ${fmt(v)}`).join(', ');
}

/** Heroic relative to Standard, per act, in whole percent (+ = more). */
function relative(lever: Lever): number[] {
  const std = pctOf('standard', lever);
  return pctOf('heroic', lever).map((h, i) => Math.round((h / (std[i] as number) - 1) * 100));
}

/** "29% more HP" / "13% harder" style phrases; "the same" at 0. */
function more(values: readonly number[], what: 'HP' | 'damage'): string {
  if (values.every((v) => v === 0)) return what === 'HP' ? 'the same HP' : 'hit just as hard';
  const body = perAct(values, (v) => `${Math.abs(v)}%`);
  const up = values.every((v) => v >= 0);
  if (what === 'HP') return `${body} ${up ? 'more' : 'less'} HP`;
  return `hit ${body} ${up ? 'harder' : 'softer'}`;
}

/**
 * Tooltip text (markup) for a tier, in plain words, from the tuning levers (rulings 71, 74, 76).
 * `classId`: the class shown beside it; its starting max-HP bonus is named only when it isn't 0
 * (null: no class shown).
 */
export function difficultyHint(t: Difficulty, classId: string | null): string {
  const bonus = classId === null ? 0 : classMaxHpBonus(t, classId);
  const extra = bonus !== 0 ? ` ${getClassDef(classId as string).name} starts with ${bonus > 0 ? '+' : ''}${bonus} max HP.` : '';
  const hp = pctOf(t, 'enemyHpPct');
  const dmg = pctOf(t, 'enemyDamagePct');
  const pct = (v: number) => `${v}%`;
  if (t === 'standard') {
    return `[yellow]STANDARD[/]\nThe recommended climb. Enemies have ${perAct(hp, pct)} of their printed HP and deal ${perAct(dmg, pct)} of their printed damage.${extra}`;
  }
  return `[yellow]HEROIC[/]\nEnemies have ${more(relative('enemyHpPct'), 'HP')} and ${more(relative('enemyDamagePct'), 'damage')} than on Standard (${perAct(hp, pct)} of their printed HP, ${perAct(dmg, pct)} of their printed damage).${extra} For climbers who have beaten Standard.`;
}
