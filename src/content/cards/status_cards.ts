import type { CardDef } from '../../engine/types';

const JITTER = { tax: 1 };
const BACKLASH = { extra_damage: 4 };
const TANGLE = { tax: 1 };
const DRIFT = { energy_loss: 1 };

export const STATUS_CARDS: CardDef[] = [
  { id: 'status_jitter', name: 'Jitter', cls: 'status', type: 'status', rarity: 'special', cost: 0, target: 'none', keywords: ['exhaust'],
    values: JITTER, text: 'Scrap. The next card you play this turn costs {tax} more.',
    effects: [{ type: 'status', target: 'self', id: 'cost_tax', amount: JITTER.tax }], upgrade: {}, icon: 'card_status_jitter' },
  { id: 'status_backlash', name: 'Backlash', cls: 'status', type: 'status', rarity: 'special', cost: null, target: 'none', keywords: ['unplayable'], values: BACKLASH,
    text: 'If this is in your hand at the end of your turn, it is primed (uses no Riposte capacity). The next enemy hit on you before your next turn deals +{extra_damage} damage. Then Scrap this.',
    effects: [], upgrade: {}, hooks: { onTurnEndInHand: (ctx) => {
      const c = ctx.combat;
      const card = ctx.card;
      if (!c || !card) throw new Error('Backlash outside a combat card');
      const at = c.hand.findIndex((copy) => copy.uid === card.uid);
      if (at < 0) throw new Error('Backlash missing from hand');
      // The rack only supports Riposte (consumed at attack declaration). Keep this
      // resolving copy inPlay until backlash_primed fires/expires, without using capacity.
      c.hand.splice(at, 1);
      c.inPlay.push(card);
      ctx.emit({ t: 'card_primed', uid: card.uid });
      ctx.queue([{ type: 'status', target: 'self', id: 'backlash_primed', amount: 1 },
        { type: 'status', target: 'self', id: 'backlash_cards', amount: 1 }]);
    } }, icon: 'card_status_backlash' },
  { id: 'status_tangle', name: 'Tangle', cls: 'status', type: 'status', rarity: 'special', cost: null, target: 'none', keywords: ['unplayable'], values: TANGLE,
    text: 'While this is in your hand, the cards directly left and right of it cost {tax} more.', effects: [], upgrade: {},
    hooks: { handModifiers: { modifyCardCost: (ctx, card, cost) => {
      if (!ctx.combat || ctx.source.kind !== 'card') return cost;
      const sourceUid = ctx.source.uid;
      const sourceAt = ctx.combat.hand.findIndex((copy) => copy.uid === sourceUid);
      const cardAt = ctx.combat.hand.findIndex((copy) => copy.uid === card.uid);
      return sourceAt >= 0 && cardAt >= 0 && Math.abs(sourceAt - cardAt) === 1 ? cost + TANGLE.tax : cost;
    } } }, icon: 'card_status_tangle' },
  { id: 'status_drift', name: 'Drift', cls: 'status', type: 'status', rarity: 'special', cost: 1, target: 'none', keywords: ['exhaust'], values: DRIFT,
    text: 'Scrap. If this is in your hand at the end of your turn, you have {energy_loss} less energy next turn (then Scrap it).', effects: [], upgrade: {},
    hooks: { onTurnEndInHand: (ctx) => ctx.queue([
      { type: 'status', target: 'self', id: 'drift_energy', amount: DRIFT.energy_loss }, { type: 'exhaust', from: 'hand', self: true },
    ]) }, icon: 'card_status_drift' },
];
