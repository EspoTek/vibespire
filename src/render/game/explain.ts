/**
 * Tooltip texts for combat readouts (markup). Every number comes from the engine state or its text
 * helpers (renderStatusText, renderMoveText, renderKeywordText); nothing is recomputed here.
 * Shown by InfoLayer, which adds keyword boxes for the terms each text uses.
 */
import { getCardDef, getEnemyDef, getPotionDef, getRelicDef, getStatusDef } from '../../content/index.ts';
import {
  FLEE_MOVE, renderCardText, renderKeywordText, renderMoveText, renderPotionText, renderRelicText, renderStatusText, TUNING,
  type CombatState, type EnemyState, type Intent, type RunState,
} from '../../engine/index.ts';
import { formatIntent, isAttackKind } from './intents.ts';

const KIND_WORDS: Readonly<Record<string, string>> = {
  attack: 'Attack', attack_defend: 'Attack and defend', attack_buff: 'Attack and buff itself', attack_debuff: 'Attack and debuff you',
  defend: 'Defend (gain Block or Guard)', defend_buff: 'Defend and buff itself', buff: 'Buff itself', debuff: 'Debuff you',
  unknown: 'Unknown', sleep: 'Asleep: does nothing', escape: 'Escape', special: 'Special move',
};

function combatOf(state: RunState): CombatState {
  const c = state.combat;
  if (!c) throw new Error('explain: no combat');
  return c;
}

function enemyOf(state: RunState, uid: number): EnemyState {
  const e = combatOf(state).enemies.find((x) => x.uid === uid);
  if (!e) throw new Error(`explain: no enemy ${uid}`);
  return e;
}

/** One intent (current or forecast) as text: "SLAM: Attack for 6×2 = 12 (after your Stagger...)". */
export function intentLine(state: RunState, e: EnemyState, intent: Intent, base: number | null): string {
  if (intent.hidden || intent.moveId === '') return "[grey]Hidden: this move can't be foreseen.[/]"; // ASCII apostrophe: the 4x6 font has no curly one
  // the engine's flee intent (its leader died) is not one of the enemy's moves (BUG-5)
  if (intent.moveId === FLEE_MOVE) return '[yellow]FLEE[/]: Escape. Its leader is gone: it leaves the fight on its turn.';
  const move = getEnemyDef(e.id).moves[intent.moveId];
  if (!move) throw new Error(`intent move ${intent.moveId} not on enemy ${e.id}`);
  const v = formatIntent(intent, base);
  const kind = KIND_WORDS[intent.kind];
  if (kind === undefined) throw new Error(`explain: unknown intent kind ${intent.kind}`);
  let line = `[yellow]${move.name.toUpperCase()}[/]: ${kind}`;
  if (isAttackKind(intent.kind)) {
    if (intent.damage === undefined) throw new Error(`attack intent ${intent.moveId} without damage`);
    const hits = intent.hits ?? 1; // absent = one hit (the engine omits 1)
    line += ` for [pink]${intent.damage}[/]${hits > 1 ? ` × ${hits} = [pink]${intent.damage * hits}[/]` : ''} damage`;
    if (v.adjusted && base !== null) line += ` [grey](printed ${base}${hits > 1 ? ` × ${hits}` : ''}; modifiers applied)[/]`;
  }
  line += '.';
  const body = renderMoveText(state, e.uid, intent.moveId); // null = the move has no extra text
  if (body) line += `\n${body}`;
  return line;
}

/** The intent box tooltip: the current intent, then Augury's forecast. */
export function intentHint(state: RunState, uid: number, base: (i: Intent) => number | null, forecast: boolean): string {
  const e = enemyOf(state, uid);
  const lines = [`[cyan]INTENT[/] (next turn)\n${intentLine(state, e, e.intent, base(e.intent))}`];
  if (forecast) e.forecast.forEach((f, i) => {
    lines.push(`[cyan]${i === 0 ? 'AFTER THAT' : `THEN (+${i + 1})`}[/] [grey](Augury)[/]\n${intentLine(state, e, f, base(f))}`);
  });
  return lines.join('\n');
}

/** Enemy tooltip: name, HP and defence, intent(s), then every status and passive with its rules. */
export function enemyHint(state: RunState, uid: number, base: (i: Intent) => number | null, forecast: boolean): string {
  const e = enemyOf(state, uid);
  const def = getEnemyDef(e.id);
  const passives = new Set(Object.keys(def.spawnStatuses ?? {}));
  const head = `[yellow]${def.name.toUpperCase()}[/]${def.boss ? ' [pink]BOSS[/]' : ''}\nHP ${e.hp}/${e.maxHp}${e.block > 0 ? `  [skyBlue]BLOCK ${e.block}[/]` : ''}${e.guard > 0 ? `  [amber]GUARD ${e.guard}[/]` : ''}`;
  const parts = [head, intentHint(state, uid, base, forecast)];
  for (const [id, stacks] of Object.entries(e.statuses)) {
    if (stacks === 0) continue;
    const s = getStatusDef(id);
    const tag = passives.has(id) ? '[magenta]PASSIVE[/] ' : '';
    parts.push(`${tag}[${s.isDebuff ? 'pink' : 'lime'}]${s.name.toUpperCase()}${s.stacks === 'flag' ? '' : ` ${stacks}`}[/]: ${renderStatusText(id, stacks, uid, state)}`);
  }
  return parts.join('\n');
}

export function defenceHint(block: number, guard: number, hp: number, maxHp: number): string {
  const halved = Math.floor(guard / 2);
  return [
    `[yellow]HP ${hp}/${maxHp}[/]   [skyBlue]BLOCK ${block}[/]   [amber]GUARD ${guard}[/]`,
    `Hits use up Block first, then Guard, then HP.`,
    `Start of your turn: Block → 0, Guard ${guard} → ${halved}.`,
  ].join('\n');
}

export function onslaughtHint(stacks: number, keep: number): string {
  const kept = keep > 0 ? `\nAt the end of your turn you keep up to ${keep} (it resets to ${Math.min(stacks, keep)}).` : `\nAt the end of your turn it resets to 0.`;
  return `[pink]ONSLAUGHT ${stacks}[/]\n${renderKeywordText('onslaught')}${kept}`;
}

export function bloomCounterHint(cards: number, total: number): string {
  return `[lime]BLOOM ${cards}/${total}[/]\n${cards} Bloom card${cards === 1 ? '' : 's'} in your deck, ${total} Bloom in total.\n${renderKeywordText('bloom')}`;
}

/** Cadence metronome: where the count is and when the next beat lands. */
export function cadenceHint(played: number, positions: readonly number[]): string {
  const next = played + 1;
  const nextBeat = positions.find((b) => b >= next);
  const when = nextBeat === undefined ? 'No beat is left this turn.'
    : nextBeat === next ? '[yellow]The next card you play is ON THE BEAT.[/]'
    : `The next beat is card ${nextBeat} (${nextBeat - played} more card${nextBeat - played === 1 ? '' : 's'}).`;
  return `[yellow]ON BEAT[/]\nCards played this turn: ${played}.\n${when}\nBeats: card ${positions.join(', ')}.`;
}

export function energyHint(energy: number, max: number): string {
  return `[yellow]ENERGY ${energy}/${max}[/]\nCards cost energy to play. Refills to ${max} at the start of your turn; unspent energy is lost.`;
}

/** A primed rack chip (GDD §2.2). */
export function primedHint(state: RunState, cardUid: number, charges: number): string {
  const c = combatOf(state);
  const p = c.primed.find((x) => x.card.uid === cardUid);
  const card = p ? p.card : null;
  if (!card) return `[cyan]PRIMED[/]\nFires at the next enemy that attacks you.`;
  const def = getCardDef(card.id, card.upgraded);
  return `[cyan]PRIMED: ${def.name.toUpperCase()}[/]${charges > 1 ? ` ×${charges}` : ''}\n${renderCardText(card, state)}\nFires at the next enemy that attacks you, before its hits land.`;
}

/** A Timeline chip (GDD §2.8). */
export function timelineHint(state: RunState, cardUid: number): string {
  const c = combatOf(state);
  const t = c.timeline.find((x) => x.card.uid === cardUid);
  if (!t) throw new Error(`timelineHint: card ${cardUid} not on the Timeline`);
  const def = getCardDef(t.card.id, t.card.upgraded);
  const turns = Math.max(1, t.dueTurn - c.turn);
  return `[iceBlue]${def.name.toUpperCase()}[/] on the Timeline\nResolves at the start of ${turns === 1 ? 'your next turn' : `your turn in ${turns} turns`}${t.onBeat ? ', [yellow]on the beat[/]' : ''}.\n${renderCardText(t.card, state)}`;
}

export function timelineHeaderHint(state: RunState): string {
  const c = combatOf(state);
  // every entry by column (the window shows two per column)
  const cols = [0, 1, 2].map((i) => c.timeline.filter((t) => Math.min(3, Math.max(1, t.dueTurn - c.turn)) - 1 === i).map((t) => getCardDef(t.card.id, t.card.upgraded).name.toUpperCase()));
  const list = cols.map((names, i) => `${i === 0 ? 'NEXT TURN' : `IN ${i + 1} TURNS`}: ${names.length ? names.join(', ') : '-'}`).join('\n');
  return `[iceBlue]TIMELINE[/] (${c.timeline.length}/${TUNING.caps.timeline})\n${list}\n${renderKeywordText('timeline')}`;
}

export function pileHint(kind: 'draw' | 'discard' | 'exhaust', n: number): string {
  if (kind === 'draw') return `[yellow]DRAW PILE ${n}[/]\nYou draw ${TUNING.drawPerTurn} cards from it each turn. When it is empty, the discard pile is shuffled in. Select to look (shown sorted).`;
  if (kind === 'discard') return `[yellow]DISCARD PILE ${n}[/]\nPlayed and discarded cards. Shuffled back into the draw pile when that runs out. Select to look.`;
  return `[yellow]SCRAPHEAP ${n}[/]\nCards Scrapped this combat. They return to your deck after the fight. Select to look.`;
}

/** Potion tooltip: name, live text, and how and where to use it. */
export function potionHint(id: string, state: RunState | null, inCombat: boolean): string {
  const def = getPotionDef(id);
  const how = def.target === 'enemy' ? 'Select it, then choose an enemy, to drink it.' : 'Select it to drink it.';
  const where = def.combatOnly ? (inCombat ? 'Combat only.' : 'Combat only: carry it into a fight.') : 'Usable anywhere, in or out of combat.';
  return `[magenta]${def.name.toUpperCase()}[/] [grey](potion)[/]\n${renderPotionText(id, state)}\n[grey]${how} ${where} Single use.[/]`;
}

/** Relic tooltip: name, rarity, live text and its counter. */
export function relicHint(id: string, state: RunState | null, counter: number | null): string {
  const def = getRelicDef(id);
  const ctr = def.counterMax !== undefined && counter !== null ? `\n[grey]Counter ${counter}/${def.counterMax}[/]` : '';
  return `[cyan]${def.name.toUpperCase()}[/] [grey](${def.rarity} relic)[/]\n${renderRelicText(id, state)}${ctr}`;
}

export interface EndOfTurnTag { text: string; color: 'iceBlue' | 'lime' | 'pink' | 'amber'; hint: string }

/**
 * What happens to a hand card when you end the turn, if it is not just discarded: primed (Riposte),
 * kept (Keep), Scrapped (Ethereal) or its own end-of-turn rule (Status / Curse hooks). null = discarded.
 * `prime` is the renderer's prime forecast (view.primeForecast).
 */
export function endOfTurnTag(card: { id: string; upgraded: boolean; uid: number }, prime: { uids: readonly number[]; choose: boolean }): EndOfTurnTag | null {
  const def = getCardDef(card.id, card.upgraded);
  const kw = def.keywords ?? [];
  if (prime.uids.includes(card.uid)) {
    return prime.choose
      ? { text: 'MAY PRIME', color: 'iceBlue', hint: 'END OF TURN: more Riposte cards than you can prime. You choose which to prime; the rest are discarded.' }
      : { text: 'PRIMES AT END', color: 'iceBlue', hint: 'END OF TURN: this card is primed. It fires its Riposte at the next enemy that attacks you.' };
  }
  if (kw.includes('retain')) return { text: 'STAYS IN HAND', color: 'lime', hint: 'END OF TURN: Keep. This card stays in your hand.' };
  if (kw.includes('ethereal')) return { text: 'SCRAPPED AT END', color: 'pink', hint: 'END OF TURN: Ethereal. If still in your hand, this card is Scrapped.' };
  if (def.hooks?.onTurnEndInHand) return { text: 'ACTS AT END', color: 'amber', hint: 'END OF TURN: if this is still in your hand, its own rule happens (see its text).' };
  return null;
}
