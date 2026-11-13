import type { Point, Rect, StatusSpec } from './types.js';
import type { ChuLoot } from './chu-types.js';
export const kimAbilities = [
  'thiet_phien_lien_hoan',
  'cuong_phong_tan_loi_cong',
  'phien_trung_doc_dinh',
  'cuong_phong_van_nhan',
  'dat_sweep',
  'dai_luc_pha_son',
  'bat_dong_kim_cang',
  'dai_luc_pha_son_boulder',
  'hang_ma_tam_lien_chan',
  'kim_sweep',
  'kim_hand_chop',
  'kim_luan_truy_hon',
  'ngu_luan_ho_the',
  'ngu_luan_phong_toa',
  'long_tuong_chan_thien',
  'long_tuong_bat_nha_cong',
  'long_tuong_bat_nha_thap_tang',
] as const;
export type KimAbility = (typeof kimAbilities)[number];
export interface KimProfile {
  nameVi: string;
  damage: number;
  warning: number;
  duration: number;
  cooldown: number;
  statuses?: StatusSpec[] | undefined;
}
export interface KimDefinition {
  wheelCount: number;
  basicWheelSpeed: number;
  actionRestSeconds: number;
  crescent: { speed: number; radius: number; lifetime: number };
  actors: Record<
    'hoac_do' | 'dat_nhi_ba' | 'kim_luan_phap_vuong',
    Point & { hp: number; defense: number; speed: number }
  >;
  bounds: Rect;
  emptyResetTicks: number;
  respawnTicks: number;
  xp: number;
  gold: number;
  rollTicks: number;
  loot: Array<{ id: string; nameVi: string; sellGold: number }>;
  wardReduction: number;
  wardSeconds: number;
  cageHp: number;
  cageSeconds: number;
  soloReleaseSeconds: number;
  stunSeconds: number;
  slowSeconds: number;
  slowFraction: number;
  knockback: number;
  triple: {
    rays: number;
    gap: number;
    speed: number;
    lifetime: number;
    radius: number;
    halfWidth: number;
  };
  gust: { rays: number; spread: number; speed: number; radius: number };
  nails: { speed: number; radius: number };
  orbit: {
    radius: number;
    angularSpeed: number;
    seconds: number;
    releaseSpeed: number;
  };
  stomp: {
    radius: number;
    speed: number;
    gap: number;
    thickness: number;
    ellipseY: number;
  };
  enrage: {
    threshold: number;
    speedMultiplier: number;
    interval: number;
    wheelSpeed: number;
  };
  elephants: {
    stunSeconds: number;
    rocks: number;
    speed: number;
    halfWidth: number;
    rockHalfWidth: number;
    rockHalfDepth: number;
    top: number;
    bottom: number;
    normal: {
      lanes: number;
      rows: number;
      rowGap: number;
      volleyGap: number;
      warning: number;
    };
    enrage: {
      lanes: number;
      rows: number;
      rowGap: number;
      volleyGap: number;
      warning: number;
    };
  };
  abilities: Record<KimAbility, KimProfile>;
}
export interface KimLootContext {
  definition: Pick<KimDefinition, 'rollTicks'>;
  loot: ChuLoot[];
  kill: number;
}
export interface KimEffect extends Point {
  id: string;
  castId: string;
  ownerId: string;
  abilityId: KimAbility;
  kind:
    'shot' | 'ring' | 'line' | 'arc' | 'orbit' | 'elephant' | 'rock' | 'cage';
  startedAt: number;
  activeAt: number;
  expiresAt: number;
  fx: number;
  fy: number;
  speed: number;
  radius: number;
  length: number;
  damage: number;
  hits: Record<string, number>;
  bounce?: boolean;
  poison?: boolean;
  index?: number;
  maxRadius?: number;
  previousRadius?: number;
}
export interface KimCast {
  id: string;
  actorId: string;
  abilityId: KimAbility;
  startedAt: number;
  activeAt: number;
  endsAt: number;
  origin: Point;
  fx: number;
  fy: number;
  next: number;
  pulse: number;
  targetId: string;
}
export interface KimView {
  kind: 'kim_luan';
  phase: 'disciples' | 'boss' | 'defeated';
  enraged: boolean;
  wardId: string;
  tick: number;
  casts: KimCast[];
  effects: Omit<KimEffect, 'hits' | 'damage'>[];
  loot: ChuLoot[];
  bossHp: number;
  bossMaxHp: number;
  bossX: number;
  bossY: number;
  bossId: string;
  cageTarget: string;
}
