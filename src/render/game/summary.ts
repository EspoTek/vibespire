/**
 * Run summary (victory / defeat screen), pure: names come from an injected resolver so this runs
 * in tests without the content registry.
 */

export interface SummaryFloor {
  floor: number; act: number; room: string; encounterId: string | null; enemies: readonly string[];
  turns: number; damageTaken: number; shardsGained: number; shardsSpent: number;
  /** null: not recorded for this floor (a save migrated from engine v1). */
  damageDealt: number | null;
}

export interface SummaryInput {
  phase: 'victory' | 'defeat';
  classId: string;
  /** Difficulty tier name (ruling 71), e.g. 'HEROIC'. */
  tier: string;
  seed: string;
  act: number;
  floor: number;
  hp: number;
  maxHp: number;
  gold: number;
  deck: readonly { id: string; upgraded: boolean; vars?: Readonly<Record<string, number>> }[];
  relics: readonly { id: string }[];
  floors: readonly SummaryFloor[];
}

export interface SummaryNames {
  className(id: string): string;
  cardName(id: string, upgraded: boolean): string;
  relicName(id: string): string;
  encounterName(id: string): string;
}

export interface RunSummary {
  title: string;
  rows: [string, string][];
  /** Deck lines "Seed Bite ✿4", grouped with counts: "3× Hew". */
  deck: string[];
  /** The same groups for the card-art strip, in the same order. */
  deckCards: SummaryCard[];
  relics: string[];
}

export interface SummaryCard { id: string; upgraded: boolean; bloom: number; count: number }

/** "412", or "412+" when some floors predate damage tracking (migrated save), or "n/a" if none were tracked. */
export function formatDamageDealt(floors: readonly SummaryFloor[]): string {
  const known = floors.filter((f): f is SummaryFloor & { damageDealt: number } => f.damageDealt !== null);
  if (known.length === 0) return 'n/a';
  const sum = known.reduce((a, f) => a + f.damageDealt, 0);
  return known.length === floors.length ? String(sum) : `${sum}+`;
}

export function summarizeRun(s: SummaryInput, n: SummaryNames): RunSummary {
  const turns = s.floors.reduce((a, f) => a + f.turns, 0);
  const taken = s.floors.reduce((a, f) => a + f.damageTaken, 0);
  const gained = s.floors.reduce((a, f) => a + f.shardsGained, 0);
  const spent = s.floors.reduce((a, f) => a + f.shardsSpent, 0);
  const lastFight = [...s.floors].reverse().find((f) => f.encounterId !== null);
  const cause = s.phase === 'victory' ? '-' : lastFight?.encounterId ? n.encounterName(lastFight.encounterId) : 'unknown';
  const rows: [string, string][] = [
    ['CLASS', n.className(s.classId)],
    ['TIER', s.tier],
    ['SEED', s.seed],
    ['REACHED', `ACT ${s.act}  FLOOR ${s.floor}`],
    [s.phase === 'victory' ? 'HP LEFT' : 'FELL TO', s.phase === 'victory' ? `${s.hp}/${s.maxHp}` : cause],
    ['TURNS', String(turns)],
    ['DAMAGE TAKEN', String(taken)],
    ['DAMAGE DEALT', formatDamageDealt(s.floors)],
    ['SHARDS', `+${gained} / -${spent}`],
    ['GOLD', String(s.gold)],
  ];
  const groups = new Map<string, SummaryCard>();
  for (const c of s.deck) {
    const bloom = c.vars?.['bloom'] ?? 0; // absent = not a Bloom card / never grown
    const label = `${n.cardName(c.id, c.upgraded)}${bloom > 0 ? ` ✿${bloom}` : ''}`;
    const g = groups.get(label);
    if (g) g.count++;
    else groups.set(label, { id: c.id, upgraded: c.upgraded, bloom, count: 1 });
  }
  const sorted = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const deck = sorted.map(([label, g]) => (g.count > 1 ? `${g.count}× ${label}` : label));
  return { title: s.phase === 'victory' ? 'VICTORY' : 'DEFEAT', rows, deck, deckCards: sorted.map(([, g]) => g), relics: s.relics.map((r) => n.relicName(r.id)) };
}
