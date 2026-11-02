import type { Point, SimulationConfig, ProjectileEffect } from './types.js';

export type BossAbilityId =
  | 'ly_mac_sau_basic'
  | 'bang_phach_ngan_cham'
  | 'xich_luyen_chuong'
  | 'phat_tran_cong'
  | 'co_mo_kiem_phap'
  | 'ngu_doc_chuong';
export interface BossAttackDefinition {
  id: BossAbilityId;
  nameVi: string;
  windupTicks: number;
  recoveryTicks: number;
  damage: number;
  range: number;
  speed: number;
  radius: number;
  halfAngle: number;
}
export interface BossEncounterDefinition {
  id: string;
  spawn: Point;
  stats: SimulationConfig['creep'];
  controlResistance: number;
  openingTicks: number;
  intervalTicks: number;
  emptyResetTicks: number;
  respawnTicks: number;
  attacks: BossAttackDefinition[];
  rotation: BossAbilityId[];
  summonCount: number;
  summonCountChoices?: number[];
  summonProjectile?: ProjectileEffect;
  summonLimit: number;
  summonLifetimeTicks: number;
  summonStats: SimulationConfig['creep'];
  summonSpawns: Point[];
  edgeEmitters: Array<Point & { fx: number; fy: number }>;
  loot: Array<{ id: string; nameVi: string }>;
}
export interface CoMoBossCast {
  id: BossAbilityId;
  startedAt: number;
  releaseAt: number;
  until: number;
  targetId: string;
  fx: number;
  fy: number;
  origin: Point;
  released: boolean;
}
export interface BossRuntime {
  actorId: string;
  instanceId: string;
  killSerial: number;
  rewarded: boolean;
  rotation: number;
  nextActionAt: number;
  cast?: CoMoBossCast | undefined;
}
export interface BossLootClaim {
  id: string;
  itemId: string;
  nameVi: string;
  winnerId: string;
  rolls: Array<{ playerId: string; roll: number }>;
}
