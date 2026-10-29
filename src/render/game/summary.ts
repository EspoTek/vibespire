/**
 * Run summary (victory / defeat screen), pure: names come from an injected resolver so this runs
 * in tests without the content registry.
 */

export interface SummaryFloor {
  floor: number; act: number; room: string; encounterId: string | null; enemies: readonly string[];
  turns: number; damageTaken: number; shardsGained: number; shardsSpent: number;
}

export interface SummaryInput {
  phase: 'victory' | 'defeat';
  classId: string;
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
  /** Damage dealt is not in RunHistory; the renderer passes what it saw this session, or null. */
  damageDealt: number | null;
}

export interface RunSummary {
  title: string;
  rows: [string, string][];
  /** Deck lines "Seed Bite ✿4", grouped with counts: "3× Hew". */
  deck: string[];
  relics: string[];
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
    ['SEED', s.seed],
    ['REACHED', `ACT ${s.act}  FLOOR ${s.floor}`],
    [s.phase === 'victory' ? 'HP LEFT' : 'FELL TO', s.phase === 'victory' ? `${s.hp}/${s.maxHp}` : cause],
    ['TURNS', String(turns)],
    ['DAMAGE TAKEN', String(taken)],
    ['DAMAGE DEALT', n.damageDealt === null ? 'n/a' : String(n.damageDealt)],
    ['SHARDS', `+${gained} / -${spent}`],
    ['GOLD', String(s.gold)],
  ];
  const groups = new Map<string, number>();
  for (const c of s.deck) {
    const bloom = c.vars?.['bloom']; // absent = not a Bloom card / never grown
    const label = `${n.cardName(c.id, c.upgraded)}${bloom !== undefined && bloom > 0 ? ` ✿${bloom}` : ''}`;
    groups.set(label, (groups.get(label) ?? 0) + 1);
  }
  const deck = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([label, k]) => (k > 1 ? `${k}× ${label}` : label));
  return { title: s.phase === 'victory' ? 'VICTORY' : 'DEFEAT', rows, deck, relics: s.relics.map((r) => n.relicName(r.id)) };
}
