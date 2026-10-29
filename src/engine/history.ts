// Per-floor run history (consumed by the simulator and stats screens).

import type { FloorRecord, RoomType, RunState } from './types';

export function newFloorRecord(state: RunState, room: RoomType): FloorRecord {
  return {
    floor: state.floor,
    act: state.act,
    room,
    hpBefore: state.player.hp,
    hpAfter: state.player.hp,
    maxHp: state.player.maxHp,
    goldBefore: state.player.gold,
    goldAfter: state.player.gold,
    encounterId: null,
    enemies: [],
    turns: 0,
    damageTaken: 0,
    cardsOffered: [],
    cardPicked: null,
    cardSkipped: false,
    cardsAdded: [],
    cardsRemoved: [],
    cardsUpgraded: [],
    relicsGained: [],
    potionsGained: [],
    potionsUsed: [],
    eventId: null,
    eventChoice: null,
    boonId: null,
    deckSize: state.player.deck.length,
    shardsGained: 0,
    shardsSpent: 0,
    capHits: {},
  };
}

export function currentFloor(state: RunState): FloorRecord {
  const rec = state.history.floors[state.history.floors.length - 1];
  if (!rec) throw new Error('run history has no floor record');
  return rec;
}

/** Refresh the "after" fields of the current floor record (called after every apply). */
export function syncFloorRecord(state: RunState): void {
  const rec = currentFloor(state);
  rec.hpAfter = state.player.hp;
  rec.goldAfter = state.player.gold;
  rec.maxHp = state.player.maxHp;
  rec.deckSize = state.player.deck.length;
}
