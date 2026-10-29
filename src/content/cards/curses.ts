import type { CardDef } from '../../engine/types';

const JOINT = { tax: 1 };
const CHILL = { draw_loss: 1 };
const DEBT = { gold_loss: 5 };
const ECHO = { guard: 4 };
const VINE = { hp_loss: 2, draw: 1 };

export const CURSES: CardDef[] = [
  { id: 'curse_burden', name: 'Burden', cls: 'curse', type: 'curse', rarity: 'special', cost: null, target: 'none', keywords: ['unplayable'], bound: true,
    text: "Unplayable. Only Purge (rest site) can remove Burden; shops, events and Prune away can't. It can't be Transmuted.", effects: [], upgrade: {}, icon: 'card_curse_burden' },
  { id: 'curse_seized_joint', name: 'Seized Joint', cls: 'curse', type: 'curse', rarity: 'special', cost: null, target: 'none', keywords: ['unplayable'], values: JOINT,
    text: 'Unplayable. While this is in your hand, the first card you play each turn costs {tax} more.', effects: [], upgrade: {},
    hooks: { handModifiers: { modifyCardCost: (ctx, _card, cost) => ctx.combat?.cardsPlayedThisTurn.length === 0 ? cost + JOINT.tax : cost } }, icon: 'card_curse_seized_joint' },
  { id: 'curse_static_ghost', name: 'Static Ghost', cls: 'curse', type: 'curse', rarity: 'special', cost: null, target: 'none', keywords: ['unplayable'],
    text: 'Unplayable. When you draw this, add a Jitter to your hand.', effects: [], upgrade: {},
    hooks: { onDraw: (ctx) => ctx.queue([{ type: 'add_card', card: 'status_jitter', to: 'hand' }]) }, icon: 'card_curse_static_ghost' },
  { id: 'curse_guilt', name: 'Guilt', cls: 'curse', type: 'curse', rarity: 'special', cost: 2, target: 'none', keywords: ['exhaust'],
    text: 'Scrap. (Does nothing.)', effects: [], upgrade: {}, icon: 'card_curse_guilt' },
  { id: 'curse_vacuum_chill', name: 'Vacuum Chill', cls: 'curse', type: 'curse', rarity: 'special', cost: null, target: 'none', keywords: ['unplayable', 'retain'], values: CHILL,
    text: 'Unplayable. Keep. While this is in your hand, you draw {draw_loss} fewer card at the start of your turn.', effects: [], upgrade: {},
    hooks: { handModifiers: { drawPerTurn: (_ctx, n) => n - CHILL.draw_loss } }, icon: 'card_curse_vacuum_chill' },
  { id: 'curse_debt_mark', name: 'Debt Mark', cls: 'curse', type: 'curse', rarity: 'special', cost: null, target: 'none', keywords: ['unplayable'], values: DEBT,
    text: 'Unplayable. When you draw this, lose {gold_loss} gold.', effects: [], upgrade: {},
    hooks: { onDraw: (ctx) => ctx.queue([{ type: 'gold', amount: -DEBT.gold_loss }]) }, icon: 'card_curse_debt_mark' },
  { id: 'curse_hollow_echo', name: 'Hollow Echo', cls: 'curse', type: 'curse', rarity: 'special', cost: null, target: 'none', keywords: ['unplayable'], values: ECHO,
    text: 'Unplayable. When you draw this, the enemy with the lowest HP gains {guard} Guard.', effects: [], upgrade: {},
    hooks: { onDraw: (ctx) => {
      const enemies = ctx.combat?.enemies.filter((enemy) => enemy.alive);
      if (!enemies || enemies.length === 0) return; // No enemy remains when combat is finishing.
      const lowest = enemies.reduce((a, b) => b.hp < a.hp ? b : a);
      // Guard's target only accepts self/all_allies; a targeted frame with enemy self uses
      // the standard Guard primitive and that enemy's modifiers, cap and gain hooks.
      ctx.queue([{ type: 'custom', fn: 'echo_guard' }], { target: lowest.uid });
    } },
    custom: { echo_guard: (ctx) => {
      if (typeof ctx.frame.target !== 'number' || !ctx.combat) throw new Error('Hollow Echo missing target');
      ctx.combat.queue.unshift({ kind: 'effect', effect: { type: 'guard', amount: ECHO.guard }, frame: { ...ctx.frame, self: ctx.frame.target } });
    } }, icon: 'card_curse_hollow_echo' },
  { id: 'curse_parasite_vine', name: 'Parasite Vine', cls: 'curse', type: 'curse', rarity: 'special', cost: null, target: 'none', keywords: ['unplayable'], values: VINE,
    text: 'Unplayable. When you draw this, lose {hp_loss} HP and draw {draw} card.', effects: [], upgrade: {},
    hooks: { onDraw: (ctx) => ctx.queue([{ type: 'lose_hp', amount: VINE.hp_loss }, { type: 'draw', n: VINE.draw }]) }, icon: 'card_curse_parasite_vine' },
];
