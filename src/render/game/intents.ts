/**
 * Intent display (pure). Engine intents already carry the final per-hit damage with every modifier
 * (Exposed on the player, the enemy's Stagger, ...). When the unmodified move number is known we
 * show both, so the player sees what their debuffs did: "4×4 → 1×4" (GDD §2.10, §2.11).
 */

export type IntentKindView =
  | 'attack' | 'attack_defend' | 'attack_buff' | 'attack_debuff'
  | 'defend' | 'defend_buff' | 'buff' | 'debuff' | 'unknown' | 'sleep' | 'escape' | 'special';

export interface IntentLike {
  kind: IntentKindView;
  damage?: number;
  hits?: number;
  hidden?: boolean;
}

export interface IntentView {
  /** Main icon frame name in the UI icon atlas. */
  icon: string;
  /** Secondary icon for combined intents (attack + defend/buff/debuff), else null. */
  icon2: string | null;
  /** Number text, e.g. "6", "4×4", "4×4 → 1×4", "?" ('' when the intent has no number). */
  label: string;
  /** Total damage this intent deals if nothing changes (damage × hits), 0 for non-attacks. */
  total: number;
  isAttack: boolean;
  /** The shown number differs from the move's printed number. */
  adjusted: boolean;
}

const ATTACKS: ReadonlySet<IntentKindView> = new Set(['attack', 'attack_defend', 'attack_buff', 'attack_debuff']);

export function isAttackKind(k: IntentKindView): boolean { return ATTACKS.has(k); }

function hitText(d: number, hits: number): string { return hits > 1 ? `${d}×${hits}` : String(d); }

/**
 * `baseDamage` = the move's printed per-hit number before modifiers (null when unknown, e.g. a
 * scaling move). Throws if an attack intent has no damage: the engine must always provide it.
 */
export function formatIntent(intent: IntentLike, baseDamage: number | null): IntentView {
  if (intent.hidden) return { icon: 'unknown', icon2: null, label: '?', total: 0, isAttack: false, adjusted: false };
  const k = intent.kind;
  const second: Partial<Record<IntentKindView, string>> = {
    attack_defend: 'intent_defend', attack_buff: 'intent_buff', attack_debuff: 'intent_debuff', defend_buff: 'intent_buff',
  };
  if (isAttackKind(k)) {
    if (intent.damage === undefined) throw new Error(`formatIntent: ${k} intent without damage`);
    const hits = intent.hits ?? 1; // absent hits = a single hit (engine omits it for 1)
    const shown = hitText(intent.damage, hits);
    const adjusted = baseDamage !== null && baseDamage !== intent.damage;
    return {
      icon: 'intent_attack', icon2: second[k] ?? null,
      label: adjusted ? `${hitText(baseDamage, hits)} → ${shown}` : shown,
      total: intent.damage * hits, isAttack: true, adjusted,
    };
  }
  const icons: Record<IntentKindView, string> = {
    attack: 'intent_attack', attack_defend: 'intent_attack', attack_buff: 'intent_attack', attack_debuff: 'intent_attack',
    defend: 'intent_defend', defend_buff: 'intent_defend', buff: 'intent_buff', debuff: 'intent_debuff',
    unknown: 'intent_unknown', sleep: 'intent_sleep', escape: 'intent_escape', special: 'intent_special',
  };
  return { icon: icons[k], icon2: second[k] ?? null, label: k === 'unknown' ? '?' : '', total: 0, isAttack: false, adjusted: false };
}
