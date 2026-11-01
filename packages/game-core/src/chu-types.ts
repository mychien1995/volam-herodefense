import type { Point, SimulationConfig } from './types.js';
export type ChuPhase =
  | 'idle'
  | 'sweep'
  | 'fists'
  | 'palm'
  | 'hands'
  | 'trap'
  | 'spin'
  | 'reflect'
  | 'ultimate'
  | 'drink';
export interface ChuDefinition {
  spawn: Point;
  hp: number;
  defense: number;
  xp: number;
  gold: number;
  phases: Array<{ id: ChuPhase; ticks: number }>;
  damage: {
    sweep: number;
    fist: number;
    palm: number;
    hand: number;
    spin: number;
    ultimate: number;
  };
  sweepFootRadius: number;
  sweepFrontRadius: number;
  sweepFrontOffset: number;
  fistReach: number;
  fistHalfWidth: number;
  spinSpeedX: number;
  spinSpeedY: number;
  spinRadius: number;
  pullRadius: number;
  pullSpeed: number;
  handsScale: number;
  trapRadius: number;
  trapTicks: number;
  emptyResetTicks: number;
  bossRespawnTicks: number;
  rollTicks: number;
  loot: Array<{ id: string; nameVi: string; sellGold: number }>;
}
export interface ChuMissile extends Point {
  id: number;
  vx: number;
  vy: number;
  radius: number;
  remaining: number;
  hitIds: string[];
}
export interface ChuHand extends Point {
  id: number;
  from: Point;
  target: Point;
  fx: number;
  fy: number;
  hitIds: string[];
}
export interface ChuLoot {
  id: number;
  itemId: string;
  nameVi: string;
  eligible: string[];
  rolls: Record<string, number>;
  until: number;
  state: 'rolling' | 'claimed' | 'ground';
  ownerId: string;
  x: number;
  y: number;
}
export interface ChuEncounter {
  definition: ChuDefinition;
  phase: ChuPhase;
  phaseIndex: number;
  started: number;
  until: number;
  cycle: number;
  fx: number;
  fy: number;
  missiles: ChuMissile[];
  hands: ChuHand[];
  trap?: {
    targetId: string;
    x: number;
    y: number;
    until: number;
    required: string[];
    inside: number;
    released: boolean;
    reason: string;
  };
  spinOrigin?: Point;
  spinHits?: Record<string, number>;
  loot: ChuLoot[];
  kill: number;
  deadAt?: number;
  nextAction: number;
}
export interface ChuView {
  phase: ChuPhase;
  elapsed: number;
  duration: number;
  cycle: number;
  fx: number;
  fy: number;
  bossId: string;
  bossX: number;
  bossY: number;
  bossHp: number;
  bossMaxHp: number;
  hands: Array<ChuHand & { stage: string }>;
  missiles: ChuMissile[];
  trap: ChuEncounter['trap'] | null;
  disciples: Array<{
    id: number;
    x: number;
    y: number;
    direction: string;
    tag: string;
  }>;
  fields: Array<Point & { id: number; radius: number; active: boolean }>;
  waves: Array<
    Point & { radius: number; thickness: number; scale: number; alpha: number }
  >;
  loot: ChuLoot[];
  spinRadius: number;
  sweepFootRadius: number;
  sweepFrontRadius: number;
  sweepFrontOffset: number;
  fistReach: number;
  fistHalfWidth: number;
  handsScale: number;
}
export const CHU_BOSS_ID = 'chu_ba_thong';
export function validateChuDefinition(
  d: ChuDefinition,
  c: SimulationConfig,
): void {
  for (const n of [
    d.hp,
    d.defense,
    d.xp,
    d.gold,
    d.spinRadius,
    d.fistReach,
    d.trapTicks,
    d.emptyResetTicks,
    d.bossRespawnTicks,
    d.rollTicks,
    ...Object.values(d.damage),
  ])
    if (!Number.isFinite(n) || n <= 0)
      throw Error('Invalid Chu Bá Thông tuning');
  if (
    d.phases.length !== 10 ||
    new Set(d.phases.map((p) => p.id)).size !== 10 ||
    d.phases.some((p) => !Number.isInteger(p.ticks) || p.ticks <= 0) ||
    d.trapTicks !== 30 * c.tickRate ||
    d.emptyResetTicks !== 30 * c.tickRate ||
    !d.loot.length
  )
    throw Error('Invalid Chu Bá Thông lifecycle');
}
