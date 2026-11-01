// Keyword glossary (src/content/keywords.ts): every rules term a player can read on a card, relic,
// potion or status must have a glossary entry, and every entry's text must render from engine numbers.
// Real content only (the test pack is not registered here).
import { describe, expect, it } from 'vitest';
import {
  KEYWORDS,
  allCards,
  allEnemies,
  allEvents,
  allPotions,
  allRelics,
  allStatuses,
  getKeyword,
  keywordsFor,
  keywordsInText,
  scanKeywordTerms,
  structuralKeywords,
} from '../../src/content';
import { renderKeywordText } from '../../src/engine/text';

/**
 * Capitalised words that are plain English or plain game nouns, not rules jargon. A capitalised
 * word in rules text that is not here, not a glossary term and not a content name fails the test:
 * add a glossary entry (src/content/keywords.ts) or, if it really is plain English, add it here.
 */
const PLAIN = new Set(
  (
    'A After All ALL An And Apply Arm At Attack Attacks Boss Bosses Can Can\'t Card Cards Choose Combat Counted Counts Damage ' +
    'Deal Does Double Draw During Each Elite Elites Else Enemies Enemy Energy Entered Event Gain Gains Has Heal Hits HP If In Is It Its ' +
    'Lose Loses Max Move Never Next No Once On Only Or Potion Potions Power Powers Prepare Put Remove Rest Resets Shop Skill Skills Skips ' +
    'Start Starts Takes That The Then They This Treasure When Whenever While You Your Add Gold Card Later Playable Ages Ripe'
  ).split(' '),
);

function contentNames(): string[] {
  const names: string[] = [];
  for (const c of allCards()) names.push(c.name);
  for (const r of allRelics()) names.push(r.name);
  for (const p of allPotions()) names.push(p.name);
  for (const s of allStatuses()) names.push(s.name);
  for (const e of allEvents()) names.push(e.name);
  for (const e of allEnemies()) {
    names.push(e.name);
    for (const m of Object.values(e.moves)) names.push(m.name);
  }
  // Singular forms too ("a Page" for the status "Pages").
  const all = names.flatMap((n) => (n.endsWith('s') && n.length > 3 ? [n, n.slice(0, -1)] : [n]));
  return all.filter((n) => n.length > 0).sort((a, b) => b.length - a.length);
}

/** Capitalised words left in `text` after removing glossary terms, content names and placeholders. */
function unexplainedTerms(text: string, names: readonly string[]): string[] {
  let t = text.replace(/\{[a-zA-Z_][a-zA-Z0-9_]*\}/g, ' ');
  const hits = scanKeywordTerms(t);
  const chars = [...t];
  for (const h of hits) for (let i = h.index; i < h.index + h.length; i++) chars[i] = ' ';
  t = chars.join('');
  for (const n of names) t = t.split(n).join(' ');
  const left: string[] = [];
  for (const m of t.matchAll(/[A-Z][A-Za-z']*/g)) {
    const w = m[0].replace(/'s$/, '');
    if (!PLAIN.has(w)) left.push(w);
  }
  return left;
}

describe('keyword glossary', () => {
  it('every entry renders its rules text from engine numbers', () => {
    for (const k of KEYWORDS) {
      const text = renderKeywordText(k.id);
      expect(text, k.id).not.toMatch(/[{}]/);
      expect(text.length, k.id).toBeGreaterThan(10);
    }
  });

  it('getKeyword throws on an unknown id', () => {
    expect(() => getKeyword('no_such_keyword')).toThrow(/unknown keyword/);
    expect(() => getKeyword('card:no_such_card')).toThrow();
  });

  it('keywordsFor resolves for every card, base and upgraded', () => {
    for (const c of allCards()) {
      for (const up of [false, true]) {
        for (const id of keywordsFor(c, up)) expect(() => getKeyword(id), `${c.id}${up ? '+' : ''} -> ${id}`).not.toThrow();
      }
    }
  });

  it('keywordsFor lists text terms in reading order, then structure', () => {
    const def = allCards().find((c) => c.riposte !== undefined && c.effects.some((e) => e.type === 'damage'));
    if (!def) throw new Error('no Riposte attack card in content');
    const ids = keywordsFor(def, false);
    expect(ids).toContain('riposte');
    expect(ids.indexOf('riposte')).toBeLessThanOrEqual(ids.length - 1);
    expect(keywordsInText('Bloom. Wild Prune. Gain 4 Block.')).toEqual(['bloom', 'wild_prune', 'block']);
    expect(keywordsInText('Deal 3 damage. On beat: apply 1 Exposed.')).toEqual(['beat', 'exposed']);
  });

  it('structural keywords: engine keywords, X cost, Delay and status ids map to entries', () => {
    for (const c of allCards()) {
      const s = structuralKeywords(c);
      if (c.keywords?.includes('exhaust')) expect(s, c.id).toContain('scrap');
      if (c.keywords?.includes('retain')) expect(s, c.id).toContain('keep');
      if (c.cost === 'X') expect(s, c.id).toContain('x_cost');
      if (c.delay) expect(s, c.id).toContain('delay');
    }
  });

  it('no card, relic, potion or status text uses a term without a glossary entry', () => {
    const names = contentNames();
    const problems: string[] = [];
    const check = (where: string, text: string): void => {
      const left = unexplainedTerms(text, names);
      if (left.length) problems.push(`${where}: ${[...new Set(left)].join(', ')}  ("${text}")`);
    };
    for (const c of allCards()) {
      check(`card ${c.id}`, c.text);
      if (c.upgrade.text !== undefined) check(`card ${c.id}+`, c.upgrade.text);
    }
    for (const r of allRelics()) check(`relic ${r.id}`, r.text);
    for (const p of allPotions()) check(`potion ${p.id}`, p.text);
    for (const s of allStatuses()) check(`status ${s.id}`, s.text);
    expect(problems).toEqual([]);
  });

  it('every status a card, relic or potion names in its text has a glossary entry or a card of that name', () => {
    const problems: string[] = [];
    const cardNames = new Set(allCards().filter((c) => c.cls === 'status' || c.cls === 'curse').map((c) => c.name));
    const texts: [string, string][] = [
      ...allCards().map((c): [string, string] => [`card ${c.id}`, c.text]),
      ...allRelics().map((r): [string, string] => [`relic ${r.id}`, r.text]),
      ...allPotions().map((p): [string, string] => [`potion ${p.id}`, p.text]),
    ];
    for (const s of allStatuses().filter((x) => !x.hidden)) {
      const re = new RegExp(`(?<![A-Za-z])${s.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z])`);
      const explained = KEYWORDS.some((k) => (k.terms ?? [k.name]).includes(s.name)) || cardNames.has(s.name);
      for (const [where, text] of texts) {
        // A Power naming its own status describes itself; that is not jargon.
        if (where === `card ${s.id}` || !re.test(text) || explained) continue;
        problems.push(`${where} names status '${s.name}' (${s.id}), which has no glossary entry`);
      }
    }
    expect(problems).toEqual([]);
  });
});
