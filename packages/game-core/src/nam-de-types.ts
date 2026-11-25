import type {
  NamDeDarkDefinition,
  NamDeDarkState,
  NamDeDarkView,
} from './nam-de-dark.js';
import type { EllipseBounds } from './dong-ta-types.js';
import type { Point, SimulationConfig } from './types.js';

export const NAM_DE_ID = 'boss_nam_de';
export const namDeAbilities = [
  'tien_thien_canh_khi',
  'tien_thien_bang_dao',
  'dai_ly_hoang_quyen',
  'nam_de_palm',
  'nam_de_aura',
  'nam_de_small_finger',
  'nhat_duong_chi',
  'lien_hoan_nhat_duong_chi',
  'dai_ly_phong_huyet',
  'phat_quang_pho_chieu',
  'nhat_duong_quy_tong',
  'nam_de_dash',
] as const;
export type NamDeAbility = (typeof namDeAbilities)[number];
export type NamDeKey = 'up' | 'right' | 'down' | 'left';
export const namDeKeys: NamDeKey[] = ['up', 'right', 'down', 'left'];
export interface NamDeDefinition {
  dark: NamDeDarkDefinition;
  wave: number;
  restTicks: number;
  spawn: Point;
  entrance: Point;
  stats: SimulationConfig['creep'];
  controlResistance: number;
  moveSpeed: number;
  dashSpeed: number;
  behindDistance: number;
  dashChance: number;
  dashTicks: number;
  actionRestTicks: number;
  openingTicks: number;
  rotation: NamDeAbility[];
  damage: {
    palm: number;
    aura: number;
    small: number;
    barrage: number;
    sky: number;
  };
  palmRange: number;
  palmRadius: number;
  palmSpeed: number;
  auraRadius: number;
  auraDurationTicks: number;
  dashAuraChance: number;
  smallSpeed: number;
  smallBurstMax: number;
  smallBurstIntervalTicks: number;
  smallWindupTicks: number;
  smallRecoveryTicks: number;
  smallCooldownTicks: number;
  arenaBounds: EllipseBounds;
  skyDashTicks: number;
  corpseTicks: number;
  smallRadius: number;
  rayRange: number;
  rayRadius: number;
  beamWarningTicks: number;
  beamActiveTicks: number;
  beamHpFraction: number;
  barrageWarningTicks: number;
  barrageIntervalTicks: number;
  barrageVolleys: number;
  barrageDirections: number;
  barrageTurnTicks: number;
  barrageStartupTicks: number;
  qteTicks: number;
  qteLength: number;
  backlashFraction: number;
  healFraction: number;
  stunTicks: number;
  pressureDashTicks: number;
  confusionTicks: number;
  skyCount: number;
  skyWarningTicks: number;
  skySpacingTicks: number;
  skyRadius: number;
  skyStartupTicks: number;
}
export interface NamDeEffect extends Point {
  id: string;
  kind: 'beam' | 'ring' | 'palm' | 'finger' | 'sky' | 'backlash';
  ownerId: string;
  castId: string;
  abilityId: NamDeAbility;
  fx: number;
  fy: number;
  length: number;
  radius: number;
  speed: number;
  startedAt: number;
  activeAt: number;
  expiresAt: number;
  damageUntil: number;
  index: number;
  damage: number;
  hpFraction?: number;
  hitIds: string[];
  traveled: number;
}
export interface NamDeChallenge {
  id: string;
  keys: NamDeKey[];
  index: number;
  until: number;
  state: 'pending' | 'success' | 'wrong' | 'timeout' | 'cancelled';
  anchor: Point;
}
export interface NamDeControl {
  qte?: NamDeChallenge;
  confusion?: { mapping: Record<NamDeKey, NamDeKey>; until: number };
  stunUntil: number;
}
export interface NamDeCast {
  id: string;
  ability: NamDeAbility;
  startedAt: number;
  releaseAt: number;
  until: number;
  targetId: string;
  fx: number;
  fy: number;
  released: boolean;
  origin: Point;
  target: Point;
  rotation: number;
  nextVolley: number;
  burstCount?: number;
}
export interface NamDeRuntime {
  dark?: NamDeDarkState;
  definition: NamDeDefinition;
  phase: 'waiting' | 'rest' | 'enter' | 'idle' | 'defeated' | NamDeAbility;
  spawnAt: number;
  spawnCount: number;
  serial: number;
  defeatedAt?: number;
  rotationIndex: number;
  nextActionAt: number;
  cast?: NamDeCast;
  smallCast?: NamDeCast;
  nextSmallAt: number;
  effects: Map<string, NamDeEffect>;
  controls: Map<string, NamDeControl>;
}
export interface NamDeView {
  dark: NamDeDarkView | null;
  actorId: string;
  phase: NamDeRuntime['phase'];
  spawnAt: number;
  spawnCount: number;
  defeatedAt: number;
  cast: NamDeCast | null;
  smallCast: NamDeCast | null;
  nextActionAt: number;
  targets: Array<{
    id: string;
    qteUntil: number;
    confusionUntil: number;
    stunUntil: number;
  }>;
}
