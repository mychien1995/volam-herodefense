export interface Point {
  x: number;
  y: number;
}
export interface Rect extends Point {
  width: number;
  height: number;
}
export type Pose = 'idle' | 'walk' | 'basic_attack' | 'cast' | 'hurt' | 'death';
export interface ProjectileEffect {
  mode: 'projectile';
  damage: number;
  speed: number;
  range: number;
  radius: number;
  count: number;
  spacingTicks: number;
  splashRadius: number;
  burnDamage: number;
  burnTicks: number;
}
export interface ArcEffect {
  mode: 'arc';
  damage: number;
  range: number;
  halfAngle: number;
  cleave: number;
}
export interface Ability {
  id: string;
  nameVi: string;
  cooldownTicks: number;
  manaCost: number;
  effect: ProjectileEffect | ArcEffect;
}
export interface SimulationConfig {
  tickRate: number;
  inputTimeoutTicks: number;
  width: number;
  height: number;
  collision: Rect[];
  spawn: Point;
  creepSpawns: Point[];
  speed: number;
  radius: number;
  maxHp: number;
  maxMana: number;
  manaRegen: number;
  hpPerLevel: number;
  attackPerLevel: number;
  xpPerLevel: number;
  maxLevel: number;
  critChance: number;
  critMultiplier: number;
  basics: Record<string, Ability>;
  skills: Ability[];
  creep: {
    hp: number;
    defense: number;
    speed: number;
    radius: number;
    damage: number;
    attackRange: number;
    detectionRange: number;
    attackCooldownTicks: number;
    respawnTicks: number;
    xp: number;
    gold: number;
    assistTicks: number;
  };
}
export type Command =
  | { kind: 'move'; x: number; y: number }
  | { kind: 'basic' }
  | { kind: 'cast'; slot: number }
  | { kind: 'select-basic'; id: string };
export interface Actor extends Point {
  id: string;
  hp: number;
  maxHp: number;
  fx: number;
  fy: number;
  pose: Pose;
  actionUntil: number;
  hurtUntil: number;
  cooldown: number;
}
export interface Hero extends Actor {
  nickname: string;
  mana: number;
  maxMana: number;
  xp: number;
  gold: number;
  level: number;
  skillPoints: number;
  basicId: string;
  moveX: number;
  moveY: number;
  lastMoveTick: number;
  lastSequence: number;
  skillCooldowns: number[];
}
export interface Creep extends Actor {
  spawn: Point;
  respawnAt: number;
  hits: Record<string, number>;
  burnSource: string;
  burnUntil: number;
  burnNext: number;
  burnDamage: number;
}
export interface Projectile extends Point {
  id: string;
  ownerId: string;
  abilityId: string;
  vx: number;
  vy: number;
  remaining: number;
  rawDamage: number;
  effect: ProjectileEffect;
}
export interface CombatEvent extends Point {
  id: number;
  kind: 'attack' | 'hit' | 'death' | 'cast';
  sourceId: string;
  targetId: string;
  abilityId: string;
  damage: number;
  critical: boolean;
}
export interface World {
  tick: number;
  heroes: Map<string, Hero>;
  creeps: Map<string, Creep>;
  projectiles: Map<string, Projectile>;
  events: CombatEvent[];
  nextId: number;
  nextEvent: number;
  random: () => number;
  pending: Array<{ heroId: string; command: Command }>;
  shots: Array<{
    tick: number;
    ownerId: string;
    ability: Ability;
    x: number;
    y: number;
    dx: number;
    dy: number;
    rawDamage: number;
  }>;
}
