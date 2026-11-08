import type { EquipmentAttack } from './economy-types.js';
import type { CampaignDefinition, CampaignRuntime } from './campaign.js';
import type {
  CreepCombatDefinition,
  CreepCombatRuntime,
} from './creep-abilities-types.js';
import type { BossBanterClock, BossBanterDefinition } from './boss-banter.js';
import type { ChuEncounter } from './chu-types.js';
import type { WaveBossTestRuntime } from './wave-boss-test.js';
import type { DragonDiveDefinition } from './dragon-dive.js';
import type { EllipseBounds } from './dong-ta-types.js';
import type { NamDeKey, NamDeRuntime } from './nam-de-types.js';
import type { BacCaiEncounter } from './bac-cai.js';
import type { KimLootContext } from './kim-types.js';
import type { EconomyDefinition, HeroInventory } from './economy-types.js';
import type {
  HeroProgression,
  ProgressionDefinition,
} from './progression-types.js';
import type {
  BossEncounterDefinition,
  BossLootClaim,
  BossRuntime,
} from './boss-types.js';
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
  dragonDive?: DragonDiveDefinition | undefined;
  windupTicks?: number | undefined;
  recoveryTicks?: number | undefined;
  laneOffsets?: number[] | undefined;
  knockbackChance?: number | undefined;
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
  piercing?: boolean | undefined;
  useFacing?: boolean | undefined;
  knockback?: number | undefined;
  statuses?: StatusSpec[] | undefined;
  spreadAngle?: number | undefined;
  boomerang?: boolean | undefined;
  manaRefund?: number | undefined;
  slowedBonus?: number | undefined;
  radial?: boolean | undefined;
  attackPowerScale?: number | undefined;
  blinkWindowTicks?: number | undefined;
}
export interface ArcEffect {
  lineWidth?: number | undefined;
  knockbackChance?: number | undefined;
  residualArea?: AreaEffect | undefined;
  mode: 'arc';
  damage: number;
  range: number;
  halfAngle: number;
  cleave: number;
  singleTarget?: boolean | undefined;
  statuses?: StatusSpec[] | undefined;
  pull?: number | undefined;
  armorPenetration?: number | undefined;
  slowedBonus?: number | undefined;
  manaRefund?: number | undefined;
  projectileProc?: { chance: number; effect: ProjectileEffect } | undefined;
  windupTicks?: number | undefined;
  durationTicks?: number | undefined;
  originOffset?: number | undefined;
  knockback?: number | undefined;
}
export interface ComboSpec {
  id: 'phat_dong_a' | 'phat_dong_b';
  step: 1 | 2 | 3;
  windowTicks: number;
  multiplier: number;
}
export interface AllyEffect {
  radius: number;
  heal?: number | undefined;
  statuses?: StatusSpec[] | undefined;
}
export interface SupportEffect extends AllyEffect {
  mode: 'support';
  durationTicks: number;
  tickInterval: number;
}
export type StatusKind =
  | 'burn'
  | 'poison'
  | 'root'
  | 'slow'
  | 'attack_slow'
  | 'attack_break'
  | 'mana_shield'
  | 'damage_reduction'
  | 'defense_buff'
  | 'interrupt_resist'
  | 'support_aura'
  | 'stun'
  | 'silence'
  | 'disarm'
  | 'defense_break'
  | 'crit_buff'
  | 'speed_buff'
  | 'cooldown_buff'
  | 'counter'
  | 'guard_counter'
  | 'dash'
  | 'dash_guard'
  | 'dash_lock'
  | 'channel';
export interface StatusSpec {
  kind: StatusKind;
  durationTicks: number;
  magnitude: number;
  secondary?: number | undefined;
  evade?: boolean | undefined;
  toggle?: boolean | undefined;
}
export interface StatusEffect extends StatusSpec {
  sourceId: string;
  abilityId: string;
  until: number;
  receivedDamage?: number;
  thresholdFraction?: number;
}
export interface BuffEffect {
  burnAura?:
    | {
        radius: number;
        damage: number;
        tickInterval: number;
        attackPowerScale?: number | undefined;
      }
    | undefined;
  mode: 'buff';
  durationTicks: number;
  critChance: number;
  critMultiplier: number;
  movementSpeed?: number | undefined;
  attackSpeed?: number | undefined;
  cooldownReduction?: number | undefined;
}
export interface ManaShieldEffect {
  mode: 'mana_shield';
  durationTicks: number;
  absorbFraction: number;
  manaPerDamage: number;
  toggle?: boolean | undefined;
}
export interface CounterEffect {
  mode: 'counter';
  durationTicks: number;
  damage: number;
  range: number;
  evade: boolean;
}
export interface GuardCounterEffect {
  mode: 'guard_counter';
  durationTicks: number;
  reduction: number;
  thresholdFraction: number;
  range: number;
}
export interface AreaEffect {
  oncePerTarget?: boolean | undefined;
  mode: 'area';
  durationTicks: number;
  tickInterval: number;
  radius: number;
  damage: number;
  statuses?: StatusSpec[] | undefined;
  confines?: boolean | undefined;
  protectOwner?: boolean | undefined;
  followOwner?: boolean | undefined;
  volley?: { speed: number; projectileRadius: number } | undefined;
  ownerRegenFraction?: number | undefined;
}
export interface DashEffect {
  mode: 'dash';
  distance: number;
  speed: number;
  radius: number;
  damage: number;
  stunTicks: number;
  invulnerable?: boolean | undefined;
  backward?: boolean | undefined;
  counter?:
    { durationTicks: number; damage: number; range: number } | undefined;
}
export interface MultiHitEffect {
  attackPowerScale?: number | undefined;
  comboBurstOnly?: boolean | undefined;
  mode: 'multi_hit';
  range: number;
  damage: number;
  hits: number;
  spacingTicks: number;
  finisherDamage: number;
  finisherRange: number;
  halfAngle?: number | undefined;
  slowedBonus?: number | undefined;
  projectileBurst?: ProjectileEffect | undefined;
  projectileBurstEvery?: number | undefined;
  guard?: number | undefined;
  durationTicks?: number | undefined;
}
export interface Ability {
  equipmentAttack?: EquipmentAttack | undefined;
  manualChain?:
    | {
        idleTicks: number;
        cooldownTicks: number;
        finisherProjectile: ProjectileEffect;
      }
    | undefined;
  id: string;
  nameVi: string;
  cooldownTicks: number;
  manaCost: number;
  minIntervalTicks?: number | undefined;
  basicComboEndRecoveryTicks?: number | undefined;
  basicCombo?:
    | Array<{
        stage: string;
        damageMultiplier: number;
        halfAngle?: number | undefined;
        splashRadius?: number | undefined;
      }>
    | undefined;
  combo?: ComboSpec | undefined;
  selfStatuses?: StatusSpec[] | undefined;
  allies?: AllyEffect | undefined;
  effect:
    | ProjectileEffect
    | ArcEffect
    | BuffEffect
    | DashEffect
    | MultiHitEffect
    | ManaShieldEffect
    | CounterEffect
    | GuardCounterEffect
    | AreaEffect
    | SupportEffect;
}
export interface SimulationConfig {
  campaign?: CampaignDefinition;
  creepCombat?: CreepCombatDefinition;
  personalCraftLoot?: boolean;
  bossBanter?: BossBanterDefinition | undefined;
  /** Temporary server-owned arena confinement, independent of status immunity. */
  heroBounds?: EllipseBounds | undefined;
  waveArena?:
    | {
        center: Point;
        bounds: EllipseBounds;
        retryTicks: number;
        openingTicks: number;
      }
    | undefined;

  mobility?:
    | {
        charges: number;
        rechargeTicks: number;
        distance: number;
        speed: number;
      }
    | undefined;
  dungeonAggro?: boolean | undefined;
  bossEncounter?: BossEncounterDefinition | undefined;
  economy?: EconomyDefinition | undefined;
  progression?: ProgressionDefinition | undefined;
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
  skillCatalogue?: Record<string, Ability> | undefined;
  caiBangPassive?:
    | {
        damagePerLevel: number;
        critChancePerLevel: number;
        critMultiplierPerLevel: number;
      }
    | undefined;
  /** Arena practice creeps respawn; dungeon waves replace them only on clear. */
  creepRespawn?: boolean;
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
  | { kind: 'nam-de-key'; castId: string; index: number; key: NamDeKey }
  | { kind: 'move'; x: number; y: number }
  | { kind: 'basic' }
  | { kind: 'dash' }
  | { kind: 'gear-skill' }
  | { kind: 'cast'; slot: number }
  | { kind: 'dev-loadout'; ids: string[] }
  | { kind: 'select-basic'; id: string };
export interface Actor extends Point {
  invulnerable?: boolean;
  namDeLocked?: boolean;
  controlResistance?: number;
  id: string;
  hp: number;
  maxHp: number;
  fx: number;
  fy: number;
  pose: Pose;
  actionUntil: number;
  hurtUntil: number;
  cooldown: number;
  statuses?: StatusEffect[];
  castAbilityId?: string;
  /** Future boss adapters can opt out of forced movement without inventing a boss system. */
  forcedMovementImmune?: boolean;
  crowdControlScale?: number;
}
export interface Hero extends Actor {
  campaignClears?: string[];
  dragonBonus?: number;
  farmXpRemainder?: number;
  farmGoldRemainder?: number;
  comboFinisher?: {
    slot: number;
    abilityId: string;
    chain: ComboSpec['id'];
    fx: number;
    fy: number;
    until: number;
  };
  actionStartedAt?: number;
  basicStage?: string | undefined;
  basicChainDeadline?: { abilityId: string; until: number };
  bossSpectator?: boolean;
  dashCharges?: number;
  dashRechargeAt?: number;

  inventory?: HeroInventory;
  bossItems?: string[];
  bossLoot?: BossLootClaim[];
  progression?: HeroProgression | undefined;
  schoolId: string;
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
  skillIds?: string[];
  abilityCooldowns?: Record<string, number>;
  basicChains?: Record<string, number>;
}
export interface Creep extends Actor {
  campaignPlayers?: number;
  damagedBy?: Set<string>;
  needlePoison?: { sourceId: string; until: number; next: number };
  waveBossActor?: boolean;

  rangedAttack?: ProjectileEffect;
  navigation?: {
    targetId: string;
    gx: number;
    gy: number;
    repathAt: number;
    waypoints: Point[];
  };
  aggroTargetId?: string;
  neverRespawn?: boolean;
  /** A rescue cage rejects damage from its own captive, using the common hit pipeline. */
  rescueTargetId?: string;
  bossEncounter?: boolean;
  controlled?: boolean;
  encounterAction?: { startedAt: number; activeAt: number; endsAt: number };
  encounterBoss?: boolean;
  summonedBy?: string;
  expiresAt?: number;
  /** Server-selected presentation identity; does not grant extra abilities. */
  archetypeId?: string;
  stats?: SimulationConfig['creep'];
  invasion?: {
    wave: number;
    lane: 'west' | 'east' | 'north' | 'south';
    targetId: string;
    chaseOrigin: Point;
    reacquireAt: number;
    chaseRange: number;
    aggroRestTicks: number;
  };
  spawn: Point;
  respawnAt: number;
  hits: Record<string, number>;
  burnSource: string;
  burnUntil: number;
  burnNext: number;
  burnDamage: number;
}
export interface Projectile extends Point {
  equipmentAttack?: EquipmentAttack | undefined;
  dragonFlight?: { origin: Point; target: Point; fx: number; fy: number };
  spawnedAt?: number;
  combo?: ComboSpec;
  comboTargets?: Record<string, boolean>;
  lingerUntil?: number;
  hostile?: boolean;
  targetId?: string;
  id: string;
  ownerId: string;
  abilityId: string;
  vx: number;
  vy: number;
  remaining: number;
  rawDamage: number;
  effect: ProjectileEffect;
  hitIds?: string[];
  critChance?: number;
  critMultiplier?: number;
  leg?: 'outbound' | 'return';
  refund?: { amount: number; used: boolean };
  stage?: string;
}
export interface CombatEvent extends Point {
  tick?: number | undefined;
  id: number;
  kind: 'attack' | 'hit' | 'death' | 'cast' | 'effect' | 'pulse';
  sourceId: string;
  targetId: string;
  abilityId: string;
  damage: number;
  critical: boolean;
  fx?: number | undefined;
  fy?: number | undefined;
  radius?: number | undefined;
  stage?: string | undefined;
}
export interface SkillAction {
  startedAt?: number;
  id: string;
  ownerId: string;
  abilityId: string;
  kind: 'dash' | 'multi_hit' | 'arc' | 'projectile';
  until: number;
  nextTick: number;
  remaining: number;
  fx: number;
  fy: number;
  hitIds: string[];
  effect: DashEffect | MultiHitEffect | ArcEffect | ProjectileEffect;
  ability?: Ability | undefined;
  comboTargets?: Record<string, boolean> | undefined;
  rawDamage: number;
  finisherDamage: number;
  critChance: number;
  critMultiplier: number;
}
export interface CombatArea extends Point {
  hitIds?: string[];
  id: string;
  ownerId: string;
  abilityId: string;
  until: number;
  nextTick: number;
  effect: AreaEffect;
  rawDamage: number;
  critChance: number;
  critMultiplier: number;
  trappedIds?: string[];
}
export interface World {
  campaign?: CampaignRuntime;
  invasionPending?: Set<number>;
  creepCombat?: CreepCombatRuntime;
  /** Cosmetic randomness must never advance the authoritative combat RNG. */
  banterSeed?: number;
  bossBanter?: Map<string, BossBanterClock>;
  waveBossTest?: WaveBossTestRuntime;
  namDe?: NamDeRuntime;
  bacCai?: Pick<BacCaiEncounter, keyof BacCaiEncounter>;
  vuong?: Pick<VuongEncounter, keyof VuongEncounter>;
  kim?: { rewards: KimLootContext };
  chu?: ChuEncounter;
  boss?: BossRuntime;
  combos?: Array<{
    sourceId: string;
    targetId: string;
    id: string;
    step: number;
    until: number;
  }>;
  supports?: Array<{
    ownerId: string;
    abilityId: string;
    until: number;
    nextTick: number;
    effect: SupportEffect;
  }>;
  statue?: Actor & { radius: number; collision?: Rect };
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
    dragonTarget?: Point | undefined;
    comboTargets?: Record<string, boolean>;
    tick: number;
    ownerId: string;
    ability: Ability;
    x: number;
    y: number;
    dx: number;
    dy: number;
    rawDamage: number;
    critChance?: number;
    critMultiplier?: number;
    refund?: { amount: number; used: boolean };
    stage?: string;
  }>;
  actions?: SkillAction[];
  areas?: CombatArea[];
}
import type { VuongEncounter } from './vuong-trung-duong.js';
