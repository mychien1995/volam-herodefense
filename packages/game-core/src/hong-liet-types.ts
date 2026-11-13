import type { Point, Rect, SimulationConfig, StatusSpec } from './types.js';
export const hongLietAbilities = [
  'hong_liet_a1',
  'hong_liet_a2',
  'dung_nham_liet_dia',
  'hoa_son_bao_phat',
  'liet_diem_phong_toa',
  'hoa_tien_te_phat',
  'thiet_ky_trieu_binh',
  'van_ly_nham_hoa',
  'hoa_phao_thien_la',
] as const;
export type HongLietAbility = (typeof hongLietAbilities)[number];
export interface BossAbilityProfile {
  nameVi: string;
  windupTicks: number;
  recoveryTicks: number;
  cooldownTicks: number;
  damage: number;
  range: number;
  radius: number;
  durationTicks: number;
  intervalTicks: number;
  statuses?: StatusSpec[] | undefined;
}
export interface HongLietDefinition {
  id: 'hoan_nhan_hong_liet';
  spawn: Point;
  bounds: Rect;
  hp: number;
  defense: number;
  radius: number;
  speed: number;
  xp: number;
  gold: number;
  emptyResetTicks: number;
  respawnTicks: number;
  restTicks: number;
  initialRestTicks: number;
  stunScale: number;
  summonLimit: number;
  summonCount: number;
  summonLifetimeTicks: number;
  minion: SimulationConfig['creep'];
  projectileSpeed: number;
  projectileRadius: number;
  a1Spread: number;
  a1ForwardOffset: number;
  lavaDistance: number;
  lavaDashTicks: number;
  lavaFadeTicks: number;
  cannonRows: number[];
  cannonColumns: number[];
  abilities: Record<HongLietAbility, BossAbilityProfile>;
}
export type BossCueKind =
  | 'line'
  | 'arc'
  | 'stomp'
  | 'volcano'
  | 'meteor'
  | 'lava'
  | 'projectile'
  | 'cannon';
export interface BossCue extends Point {
  id: string;
  castId: string;
  ownerId: string;
  abilityId: HongLietAbility;
  kind: BossCueKind;
  fx: number;
  fy: number;
  length: number;
  radius: number;
  startedAt: number;
  activeAt: number;
  expiresAt: number;
  damageUntil: number;
  /** Combat-only fields are never accepted from clients. */
  damage: number;
  nextHit: number;
  hitIds: Set<string>;
  speed: number;
  remaining: number;
  previous?: Point;
  groupHits?: Set<string>;
}
export interface BossCast {
  id: string;
  abilityId: HongLietAbility;
  startedAt: number;
  activeAt: number;
  endsAt: number;
  origin: Point;
  fx: number;
  fy: number;
  fired: boolean;
  nextVolley: number;
  dashOrigin: Point;
  dashLength: number;
}
