// Public engine API (renderer + simulator import from here).

export * from './types';
export { Game, IllegalActionError, legalActions, actionKey, type GameOptions } from './game';
export { serialize, deserialize, ENGINE_VERSION, SAVE_KEY } from './serialize';
export { RNG_STREAMS, hashString, createStreams, xmur3, nextU32, nextInt, nextFloat, nextChance, pickFrom, shuffleInPlace, weightedPick, rngApi, singleRng } from './rng';
export { generateMap, getNode, findNode, nextNodes, parentsOf, bossNode } from './map';
export { TUNING, CAP_NAMES } from './tuning';
export { computeDamage, computeBlock, FLEE_MOVE } from './damage';
export { getCardCost, canPlayCard, getPlayableCards, cardDef, isUpgradable, hasKeyword, isBloomCard, bloomOf, bloomCapFor, matchesFilter } from './cards';
export { nextBeat } from './combat';
export { computeIntent, computeForecast, forecastDepth, aiCtx, isAttackIntent, riposteWillTrigger } from './enemies';
export { primeCapacity, isRiposteCard } from './riposte';
export { resolveAmount, evalCondition, amountCtx, sourceTables } from './effects';
export { choiceActions } from './queue';
export {
  renderTemplate,
  templateParts,
  effectTextValues,
  cardTextValues,
  renderCardText,
  renderCardTextParts,
  computeDamagePreview,
  renderRelicText,
  renderStatusText,
  renderPotionText,
  renderEventText,
  renderEventOptionLabel,
  getEventOptions,
  renderBoonText,
  renderRestOptionText,
  renderMoveText,
  type TextValue,
  type TextPart,
  type TextCtx,
  type CardRef,
  type EventOptionView,
} from './text';
export { restOptionFor, restOptionAvailable, restOptionShardCost, currentEventOptions, rewardPool } from './run';
export { shardsOf } from './runeffects';
export { validateEffects, validateAllContent } from './validate';
