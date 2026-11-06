import type { Point, StatusSpec } from './types.js';

export interface CreepAttack {
  extentScale?: number | undefined;
  statusChance?: number | undefined;
  mode: 'arc' | 'projectile' | 'area' | 'dash' | 'guard' | 'counter' | 'buff';
  nameVi: string;
  range: number;
  radius: number;
  damage: number;
  windup: number;
  cooldown: number;
  halfAngle?: number | undefined;
  speed?: number | undefined;
  count?: number | undefined;
  spread?: number | undefined;
  piercing?: boolean | undefined;
  hits?: number | undefined;
  spacing?: number | undefined;
  duration?: number | undefined;
  interval?: number | undefined;
  statuses?: StatusSpec[] | undefined;
  lifesteal?: number | undefined;
  knockback?: number | undefined;
  field?: CreepAttack | undefined;
  trail?: CreepAttack | undefined;
  pattern?: 'line' | 'fan' | 'cross' | 'ring' | undefined;
  suicide?: boolean | undefined;
  burrow?: boolean | undefined;
  graphic: string;
}
export interface CreepProfile {
  reflectChance?: number | undefined;
  reflectFraction?: number | undefined;
  id: string;
  nameVi: string;
  basic: CreepAttack;
  special?: CreepAttack | undefined;
  death?: CreepAttack | undefined;
}
export interface CreepCombatDefinition {
  profiles: Record<string, CreepProfile>;
  waveIds: string[];
  maxNearbyCasts: number;
  castGroupRadius: number;
  dotCapFraction: number;
}
export interface CreepCue extends Point {
  id: string;
  castId: string;
  ownerId: string;
  abilityId: string;
  kind: string;
  fx: number;
  fy: number;
  length: number;
  radius: number;
  speed: number;
  startedAt: number;
  activeAt: number;
  expiresAt: number;
  damageUntil: number;
  maxRadius: number;
  previousRadius: number;
  // Private simulation fields; never copied to the network schema.
  spec: CreepAttack;
  damage: number;
  nextHit: number;
  remaining: number;
  hitIds: Set<string>;
  special: boolean;
  released: boolean;
  allowStatue: boolean;
}
export interface CreepActorRuntime {
  nextSpecial: number;
  busyUntil: number;
  deathHandled: boolean;
  guardUntil: number;
  counterUntil: number;
  counter?: CreepAttack;
}
export interface CreepCombatRuntime {
  actors: Map<string, CreepActorRuntime>;
  effects: Map<string, CreepCue>;
}
