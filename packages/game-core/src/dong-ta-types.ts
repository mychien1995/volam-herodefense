import type { Point, SimulationConfig } from './types.js';

export type DongAbility =
  | 'ta_kiem_lien_kich'
  | 'lac_anh_normal'
  | 'dan_chi_than_cong'
  | 'lac_anh_kiem_phap'
  | 'ngoc_tieu_hoi_phong'
  | 'trieu_hon_dong_hai'
  | 'bach_cot_trao'
  | 'ma_anh_troc_hon'
  | 'am_phong_hap_luc'
  | 'doc_cot_bao'
  | 'thanh_am_ho_tro'
  | 'linh_xa_bo';
export interface EllipseBounds extends Point {
  radiusX: number;
  radiusY: number;
}
export interface DongProfile {
  nameVi: string;
  damage: number;
  windup: number;
  duration: number;
  cooldown: number;
}
export interface DongDefinition {
  difficulty?: 'easy' | 'hard';
  center: Point;
  entry: Point;
  bounds: EllipseBounds;
  gateWave: number;
  restTicks: number;
  entryTicks: number;
  retryTicks: number;
  actors: Record<
    'dong_ta' | 'mai_sieu_phong' | 'hoang_dung',
    { hp: number; defense: number; speed: number }
  >;
  hpPerAdditionalPlayer: number;
  controlResistance: number;
  xp: number;
  gold: number;
  openingTicks: number;
  thrust: { range: number; hits: number; halfWidth: number };
  fan: { range: number; halfAngle: number };
  normalDash: {
    approachTicks: number;
    segmentTicks: number;
    halfWidth: number;
    paths: number[][][];
  };
  beads: {
    min: number;
    max: number;
    speed: number;
    range: number;
    radius: number;
  };
  slash: { range: number; halfWidth: number; travelTicks: number };
  petals: {
    count: number;
    separation: number;
    delayTicks: number;
    radius: number;
  };
  claws: {
    range: number;
    halfWidth: number;
    gapTicks: number;
    speed: number;
    radius: number;
  };
  pull: {
    range: number;
    speed: number;
    stopDistance: number;
    lockTicks: number;
    followupTicks: number;
  };
  poison: {
    radius: number;
    flightTicks: number;
    poolTicks: number;
    intervalTicks: number;
  };
  heal: { amount: number; speed: number; radius: number; range: number };
  sprintMultiplier: number;
  abilities: Record<DongAbility, DongProfile>;
}
export interface DongCast extends Point {
  id: string;
  actorId: string;
  abilityId: DongAbility;
  startedAt: number;
  activeAt: number;
  endsAt: number;
  fx: number;
  fy: number;
  targetId: string;
  released: boolean;
  nextPulse: number;
  pulse: number;
  pattern: 'plus' | 'x';
  path?: Point[];
  telegraphHalfWidth?: number;
  hitIds?: string[];
}
export interface DongEffect extends Point {
  id: string;
  ownerId: string;
  abilityId: DongAbility;
  kind:
    | 'thrust'
    | 'fan'
    | 'bead'
    | 'slash'
    | 'petal'
    | 'claw'
    | 'pull'
    | 'pouch'
    | 'poison'
    | 'heal'
    | 'summon'
    | 'sprint';
  startedAt: number;
  activeAt: number;
  expiresAt: number;
  fx: number;
  fy: number;
  speed: number;
  length: number;
  radius: number;
  damage: number;
  hits: string[];
  targetId: string;
  nextTick: number;
  origin: Point;
}
export interface DongView {
  kind: 'dong_ta';
  phase: 'waiting' | 'rest' | 'entry' | 'fighting' | 'retry' | 'cleared';
  tick: number;
  attempt: number;
  phaseUntil: number;
  locked: boolean;
  summoned: boolean;
  bounds: EllipseBounds;
  casts: DongCast[];
  effects: Array<Omit<DongEffect, 'hits' | 'damage' | 'nextTick'>>;
  targetId: string;
  bossHp: number;
  bossMaxHp: number;
}
export type DongHooks = { recall: () => void; lock: (locked: boolean) => void };
export type DongStats = SimulationConfig['creep'];
