// Design expectations the balance report compares against.
// ENEMIES.md §4.1 "Per encounter": raw incoming per enemy phase, enemy phases survived, HP lost by a
// baseline deck. GDD §8.4 win-rate / milestone targets, §4.5 Shard target.

export interface EncounterExpectation {
  raw: number;
  /** Enemy phases survived, [min, max]. */
  phases: [number, number];
  /** HP lost by the baseline deck. */
  lost: number;
}

const T = (raw: number, lo: number, hi: number, lost: number): EncounterExpectation => ({ raw, phases: [lo, hi], lost });

export const ENCOUNTER_EXPECTATIONS: Record<string, EncounterExpectation> = {
  // Act 1
  enc_a1_gnasher_pair: T(7, 1, 2, 3),
  enc_a1_drone_puff: T(5, 1, 2, 2),
  enc_a1_thornback: T(11, 2, 2, 11),
  enc_a1_mantis: T(10, 2, 2, 9),
  enc_a1_vine_puff: T(9, 4, 4, 17),
  enc_a1_flitter_gnasher: T(13, 2, 3, 15),
  enc_a1_drone_pack: T(10, 2, 3, 9),
  enc_a1_thornback_wisp: T(11, 3, 4, 20),
  enc_a1_spore_cluster: T(6, 2, 2, 4),
  enc_a1_thornback_drone: T(11, 3, 3, 12),
  enc_a1_alpha: T(21, 2, 3, 24),
  enc_a1_dreadcap: T(12, 5, 5, 20),
  enc_a1_titan: T(11, 4, 4, 17),
  enc_a1_ram: T(13, 9, 9, 40),
  enc_a1_orchid: T(10, 10, 10, 35),
  enc_a1_empress: T(11, 11, 11, 39),
  // Act 2
  enc_a2_rivet_pair: T(10, 1, 2, 4),
  enc_a2_drone_gnasher: T(15, 2, 2, 10),
  enc_a2_riveter: T(11, 2, 2, 5),
  enc_a2_drone_riveter: T(16, 3, 4, 18),
  enc_a2_acolyte_golem: T(10, 5, 5, 14),
  enc_a2_oracle_pack: T(18, 4, 4, 20),
  enc_a2_drone_trio: T(14, 4, 4, 16),
  enc_a2_acolyte_pack: T(15, 4, 4, 20),
  enc_a2_golem_riveter: T(18, 5, 5, 24),
  enc_a2_oracle_golem: T(15, 5, 5, 20),
  enc_a2_auditor: T(13, 4, 4, 15),
  enc_a2_anvil_hammer: T(19, 5, 6, 28),
  enc_a2_boiler: T(13, 5, 6, 24),
  enc_a2_assembler: T(13, 10, 10, 35),
  enc_a2_furnace: T(18, 11, 11, 38),
  enc_a2_trihammer: T(20, 10, 10, 40),
  // Act 3
  enc_a3_mote_pair: T(10, 1, 1, 3),
  enc_a3_shard_mote: T(13, 1, 2, 5),
  enc_a3_seer: T(8, 1, 1, 2),
  enc_a3_cantor: T(13, 2, 2, 6),
  enc_a3_geometer: T(17, 3, 3, 18),
  enc_a3_fever_pack: T(22, 3, 3, 15),
  enc_a3_warden_geometer: T(19, 5, 5, 25),
  enc_a3_warden_cantor: T(16, 4, 4, 18),
  enc_a3_prism_motes: T(18, 3, 3, 12),
  enc_a3_warden_shard: T(13, 3, 3, 12),
  enc_a3_mirror_knight: T(19, 3, 3, 15),
  enc_a3_phage_mother: T(18, 3, 4, 18),
  enc_a3_event_horizon: T(22, 4, 4, 36),
  enc_a3_sovereign: T(20, 10, 10, 58),
  enc_a3_archivist: T(18, 9, 9, 30),
  enc_a3_leukarch: T(22, 10, 10, 37),
};

/** GDD §8.4 targets for the reference bot. */
export const BOT_TARGETS = {
  winRate: [0.25, 0.35] as [number, number],
  classSpread: 0.08,
  reachA1Boss: 0.9,
  beatA1Boss: 0.75,
  beatA2Boss: 0.5,
  deathShareByAct: [0.3, 0.4, 0.3],
  /** GDD §4.5: Shards earned per act by a disciplined player. */
  shardsPerAct: [3, 5] as [number, number],
  /** GDD §3: a cap is hit in under 1% of turns. */
  capHitsPerTurn: 0.01,
};
