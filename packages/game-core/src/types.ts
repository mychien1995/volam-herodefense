import type { EquipmentAttack } from './economy-types.js';
import type { NguDocSummonKind } from './ngu-doc-ids.js';
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
  explodeAtEnd?: boolean | undefined;
  scatter?: ProjectileScatter | undefined;
  dragonDive?: DragonDiveDefinition | undefined;
  windupTicks?: number | undefined;
  recoveryTicks?: number | undefined;
  laneOffsets?: number[] | undefined;
  /** A same-target combo in this wider center lane replaces the normal volley. */
  comboEmpoweredRadius?: number | undefined;
  comboDash?: DashEffect | undefined;
  oncePerCast?: boolean | undefined;
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
  forwardOnly?: boolean | undefined;
  knockback?: number | undefined;
  statuses?: StatusSpec[] | undefined;
  spreadAngle?: number | undefined;
  boomerang?: boolean | undefined;
  manaRefund?: number | undefined;
  slowedBonus?: number | undefined;
  radial?: boolean | undefined;
  attackPowerScale?: number | undefined;
  blinkWindowTicks?: number | undefined;
  /** Persistent, mana-draining spin with same-slot recall. */
  recallDrain?:
    | { intervalTicks: number; mana: number; cooldownSeconds: number }
    | undefined;
}
export interface ProjectileScatter {
  replaceProjectiles?: boolean | undefined;
  centerOnTarget?: boolean | undefined;
  stage?: string | undefined;
  statuses?: StatusSpec[] | undefined;
  count: number;
  appearanceTicks: number;
  delayTicks: number;
  innerRadius: number;
  outerRadius: number;
  radius: number;
  damage: number;
  attackPowerScale: number;
}
export interface FortuneEffect {
  mode: 'fortune';
  durationTicks: number;
  cycleTicks: number;
  buffTicks: number;
  stunTicks: number;
  healFraction: number;
  manaFraction: number;
  hpRegen: number;
  manaRegen: number;
  damageMultiplier: number;
  critMultiplier: number;
  movementSpeed: number;
  lossFraction: number;
  blastDamage: number;
  blastRadius: number;
}
export interface ArcEffect {
  manaSteal?: { amount: number; manaLessRefund: number } | undefined;
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
  lifesteal?: number | undefined;
  projectileProc?: { chance: number; effect: ProjectileEffect } | undefined;
  windupTicks?: number | undefined;
  durationTicks?: number | undefined;
  originOffset?: number | undefined;
  /** Sweep the arc footprint from this forward offset to originOffset. */
  originStartOffset?: number | undefined;
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
  selfHeal?: number | undefined;
  mode: 'support';
  durationTicks: number;
  tickInterval: number;
}
export type StatusKind =
  | 'concealed'
  | 'staff_charge'
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
  | 'attack_buff'
  | 'hp_regen_buff'
  | 'mana_regen_buff'
  | 'fortune_roll'
  | 'fortune_result'
  | 'speed_buff'
  | 'cooldown_buff'
  | 'counter'
  | 'guard_counter'
  | 'dash'
  | 'dash_guard'
  | 'dash_lock'
  | 'con_luan_ranged'
  | 'ngu_doc_palm'
  | 'ngu_doc_aura'
  | 'ngu_doc_mark'
  | 'duong_mon_flight'
  | 'duong_mon_shell'
  | 'duong_mon_evade'
  | 'con_luan_chaos'
  | 'channel';
export interface StatusSpec {
  delayTicks?: number | undefined;
  blocksMovementSkills?: boolean | undefined;
  kind: StatusKind;
  durationTicks: number;
  magnitude: number;
  secondary?: number | undefined;
  evade?: boolean | undefined;
  toggle?: boolean | undefined;
}
export interface StatusEffect extends StatusSpec {
  startsAt?: number | undefined;
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
  expireBurst?: { damage: number; radius: number } | undefined;
  volleyDamageMultiplier?: number | undefined;
  radiusY?: number | undefined;
  pentagon?: boolean | undefined;
  passiveField?: boolean | undefined;
  expandTicks?: number | undefined;
  nearestRange?: number | undefined;
  forwardOffset?: number | undefined;
  stunOnOpenTicks?: number | undefined;
  windupTicks?: number | undefined;
  skyfall?:
    | {
        range: number;
        fallbackDistance: number;
        halfAngle: number;
        blades: number;
        aimTicks: number;
        riseTicks: number;
        quietTicks: number;
        firstFallTicks: number;
        fallTicks: number;
      }
    | undefined;
  oncePerTarget?: boolean | undefined;
  occupantStatuses?: StatusSpec[] | undefined;
  mode: 'area';
  durationTicks: number;
  tickInterval: number;
  radius: number;
  damage: number;
  statuses?: StatusSpec[] | undefined;
  confines?: boolean | undefined;
  ownerDamageReduction?: number | undefined;
  followOwner?: boolean | undefined;
  volley?: { speed: number; projectileRadius: number } | undefined;
  ownerRegenFraction?: number | undefined;
}
export interface DashEffect {
  windupTicks?: number | undefined;
  damageOffset?: number | undefined;
  endBlast?: { damage: number; radius: number } | undefined;
  gather?:
    { range: number; halfAngle: number; centerOffset: number } | undefined;
  afterProjectile?:
    | {
        damage: number;
        range: number;
        speed: number;
        radius: number;
        count: number;
        delayTicks: number;
        radial: boolean;
        stage: string;
        attackPowerScale: number;
      }
    | undefined;
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
  targetArea?:
    | {
        range: number;
        radius: number;
        scatterRadius: number;
        fallTicks: number;
      }
    | undefined;
  detached?: boolean | undefined;
  finisherStatuses?: StatusSpec[] | undefined;
  statuses?: StatusSpec[] | undefined;
  attackPowerScale?: number | undefined;
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
  inwardBurst?:
    | {
        offsetX: number;
        offsetY: number;
        launchOffset: number;
        bends: number[];
        windupTicks: number;
        intervalTicks: number;
      }
    | undefined;
  guard?: number | undefined;
  finisherHealFraction?: number | undefined;
  durationTicks?: number | undefined;
}
export interface Ability {
  airborneEffect?: ProjectileEffect | DashEffect | undefined;
  targeting?: 'facing' | 'nearestEnemyAtCast' | undefined;
  focusRange?: number | undefined;
  passive?: boolean | undefined;
  reactiveBlock?:
    { chance: number; damage: number; stunTicks: number } | undefined;
  consumeStaffChargeScale?: number | undefined;
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
  charges?: number | undefined;
  minIntervalTicks?: number | undefined;
  basicPoseTicks?: number | undefined;
  basicDamageBonus?: number | undefined;
  basicVariants?: string[] | undefined;
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
    | FortuneEffect
    | SupportEffect;
}
export interface SimulationConfig {
  bossesWaitForHit?: boolean;
  combatCollision?: Rect[] | undefined;
  campaign?: CampaignDefinition;
  creepCombat?: CreepCombatDefinition;
  dungeonId?: string;
  dungeonExit?: Point;
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
  dungeonEnemyDamageMultiplier?: number | undefined;
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
  | { kind: 'tam-lien-tram' }
  | { kind: 'nam-de-key'; castId: string; index: number; key: NamDeKey }
  | { kind: 'move'; x: number; y: number }
  | {
      kind: 'move-to';
      x: number;
      y: number;
      zoneId: string;
      targetId?: string | undefined;
    }
  | { kind: 'auto-basic'; enabled: boolean }
  | { kind: 'basic'; targetId?: string | undefined }
  | { kind: 'dash' }
  | { kind: 'cast'; slot: number }
  | { kind: 'dev-loadout'; ids: string[] }
  | { kind: 'select-basic'; id: string };
export interface Actor extends Point {
  nguDocVenom?: NguDocVenom[];
  invulnerable?: boolean;
  duongMonPoison?: {
    sourceId: string;
    abilityId: string;
    damage: number;
    next: number;
    until: number;
  };
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
  statuses?: StatusEffect[] | undefined;
  castAbilityId?: string;
  /** Future boss adapters can opt out of forced movement without inventing a boss system. */
  forcedMovementImmune?: boolean;
  crowdControlScale?: number;
}
export interface NguDocSummon extends Actor {
  ownerId: string;
  kind: NguDocSummonKind;
  rank: number;
  damage: number;
  defense: number;
  radius: number;
  expiresAt: number;
  waveAt: number;
  slamAt: number;
}
export interface NguDocVenom {
  ownerId: string;
  abilityId: string;
  next: number;
  until: number;
  damage: number;
}
export interface Hero extends Actor {
  staffCharges?: { targetId: string; count: number };
  nguDocSummons?: NguDocSummon[];
  nguDocSummonSerial?: number;
  nguDocTargetId?: string;
  duelBurn?: {
    sourceId: string;
    abilityId: string;
    damage: number;
    next: number;
    until: number;
  };
  fortune?: {
    id: string;
    start: number;
    offset: number;
    effect: FortuneEffect;
  };
  lastBasicTick?: number;
  tamLien?: {
    group: string;
    targetId: string;
    charges: number;
    readyUntil: number;
  };
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
  moveDestination?: { point: Point; waypoints?: Point[] };
  autoBasic?: boolean;
  moveX: number;
  moveY: number;
  lastMoveTick: number;
  lastSequence: number;
  skillCooldowns: number[];
  chargeCooldowns?: Record<string, number[]>;
  skillIds?: string[];
  abilityCooldowns?: Record<string, number>;
  basicChains?: Record<string, number>;
}
export interface Creep extends Actor {
  provoked?: boolean;
  campaignPlayers?: number;
  damagedBy?: Set<string>;
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
    approach?: Point;
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
  burnAbilityId?: string;
  burnUntil: number;
  burnNext: number;
  burnDamage: number;
}
export interface ProjectileCurve {
  origin: Point;
  dx: number;
  dy: number;
  bend: number;
  crossing: number;
}
export interface Projectile extends Point {
  nextDrainTick?: number;
  equipmentAttack?: EquipmentAttack | undefined;
  dragonFlight?: { origin: Point; target: Point; fx: number; fy: number };
  spawnedAt?: number;
  combo?: ComboSpec;
  comboTargets?: Record<string, boolean>;
  lingerUntil?: number;
  curve?: ProjectileCurve;
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
  stage?: string | undefined;
}
export interface CombatEvent extends Point {
  tick?: number | undefined;
  /** Server-resolved strike phase. Distinct from status cues such as empowered. */
  hitPhase?: string | undefined;
  /** Attack target index on arc hits. Pulse events can use it for strike order. */
  hitIndex?: number | undefined;
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
  gatherCenter?: Point | undefined;
  gatherIds?: string[] | undefined;
  endTriggered?: boolean | undefined;
  impactPoints?: Point[] | undefined;
  detached?: boolean | undefined;
  strikePhase?: string | undefined;
  areaCenter?: Point;
  tamLien?: { center: Point; targetId: string };
  tamLienCharged?: boolean;
  origin?: Point;
  startedAt?: number;
  id: string;
  ownerId: string;
  abilityId: string;
  kind: 'dash' | 'multi_hit' | 'arc' | 'projectile' | 'area';
  until: number;
  nextTick: number;
  remaining: number;
  fx: number;
  fy: number;
  hitIds: string[];
  effect:
    DashEffect | MultiHitEffect | ArcEffect | ProjectileEffect | AreaEffect;
  ability?: Ability | undefined;
  comboTargets?: Record<string, boolean> | undefined;
  rawDamage: number;
  finisherDamage: number;
  critChance: number;
  critMultiplier: number;
}
export interface CombatArea extends Point {
  expireRawDamage?: number | undefined;
  stage?: string | undefined;
  launch?: (Point & { fx: number; fy: number }) | undefined;
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
  /** Server-only private practice targets: hittable but cannot die or grant rewards. */
  practiceTargets?: ReadonlySet<string>;
  nguDocMarks?: (Point & {
    ownerId: string;
    targetId: string;
    rank: number;
    until: number;
  })[];
  /** Present only in the isolated Lôi Đài world. */
  duel?: ReadonlySet<string>;
  /** Standalone team PvP only; absent preserves the historical 1v1 duel. */
  duelTeams?: ReadonlyMap<string, string>;
  duelWalkWalls?: Rect[];
  pendingScatters?: Array<{
    center?: Point;
    launch?: Point & { fx: number; fy: number };
    tick: number;
    ownerId: string;
    abilityId: string;
    effect: ProjectileScatter;
    rawDamage: number;
    critChance: number;
    critMultiplier: number;
  }>;
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
  kim?: { rewards: KimLootContext; rockCollision(tick: number): Rect[] };
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
    curve?: ProjectileCurve;
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
    stage?: string | undefined;
  }>;
  actions?: SkillAction[];
  areas?: CombatArea[];
}
import type { VuongEncounter } from './vuong-trung-duong.js';
