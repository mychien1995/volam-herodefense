import { schema, t, type SchemaType } from '@colyseus/schema';
import { lobbyConfig, arenaIds } from '@volam/game-data';
import { z } from 'zod';

export const PROTOCOL_VERSION = 49;
export { StateView } from '@colyseus/schema';
export const MATCH_ROOM = 'match';

export const nicknameSchema = z
  .string()
  .transform((name) => name.normalize('NFC').trim())
  .pipe(
    z
      .string()
      .min(1)
      .max(lobbyConfig.nicknameMaxLength)
      .regex(
        /^[\p{L}\p{M}\p{N} _.'-]+$/u,
        'Chá»‰ dÃ¹ng chá»¯, sá»‘, khoáº£ng tráº¯ng hoáº·c dáº¥u cÃ¢u Ä‘Æ¡n giáº£n.',
      ),
  );

export const portalCountSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);
export const arenaIdSchema = z.enum(arenaIds);
export const joinOptionsSchema = z.strictObject({
  creepPreview: z.boolean().optional(),
  portalCount: portalCountSchema.optional(),
  arenaId: arenaIdSchema.optional(),
  nickname: nicknameSchema,
  protocolVersion: z.literal(PROTOCOL_VERSION),
});
export type JoinOptions = z.infer<typeof joinOptionsSchema>;
export const bossRetryActionSchema = z.discriminatedUnion('action', [
  z.strictObject({
    action: z.literal('vote'),
    id: z.number().int().positive(),
    accept: z.boolean(),
    sequence: z.number().int().positive(),
    protocolVersion: z.literal(PROTOCOL_VERSION),
  }),
  z.strictObject({
    action: z.literal('call'),
    id: z.number().int().positive(),
    sequence: z.number().int().positive(),
    protocolVersion: z.literal(PROTOCOL_VERSION),
  }),
]);

export const creepPreviewActionSchema = z.discriminatedUnion('action', [
  z.strictObject({
    action: z.literal('select'),
    id: z.string().min(1).max(64),
    sequence: z.number().int().positive(),
  }),
  z.strictObject({
    action: z.enum(['reset', 'special', 'death', 'heal']),
    sequence: z.number().int().positive(),
  }),
  z.strictObject({
    action: z.literal('options'),
    basicOnly: z.boolean(),
    stationary: z.boolean(),
    autoHeal: z.boolean(),
    sequence: z.number().int().positive(),
  }),
]);
export type CreepPreviewAction = z.infer<typeof creepPreviewActionSchema>;
export const creepPreviewViewSchema = z.strictObject({
  id: z.string(),
  basicOnly: z.boolean(),
  stationary: z.boolean(),
  autoHeal: z.boolean(),
});
export type CreepPreviewView = z.infer<typeof creepPreviewViewSchema>;

export const connectionCheckSchema = z.strictObject({
  protocolVersion: z.literal(PROTOCOL_VERSION),
  sequence: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
});
export type ConnectionCheck = z.infer<typeof connectionCheckSchema>;

export const connectionAckSchema = z.strictObject({
  protocolVersion: z.literal(PROTOCOL_VERSION),
  sequence: z.number().int().positive(),
  checks: z.number().int().positive(),
});
export const inputSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    protocolVersion: z.literal(PROTOCOL_VERSION),
    sequence: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    kind: z.literal('tam-lien-tram'),
  }),
  z.strictObject({
    protocolVersion: z.literal(PROTOCOL_VERSION),
    sequence: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    kind: z.literal('nam-de-key'),
    castId: z
      .string()
      .regex(/^(nam_de_|vtd:)[0-9]+$/)
      .max(64),
    index: z.number().int().min(0).max(9),
    key: z.enum(['up', 'right', 'down', 'left']),
  }),
  z.strictObject({
    protocolVersion: z.literal(PROTOCOL_VERSION),
    sequence: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    kind: z.literal('dev-loadout'),
    ids: z.array(z.string().regex(/^[a-z_]*$/)).length(4),
  }),
  z.strictObject({
    protocolVersion: z.literal(PROTOCOL_VERSION),
    sequence: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    kind: z.literal('move'),
    x: z.number().int().min(-1).max(1),
    y: z.number().int().min(-1).max(1),
  }),
  z.strictObject({
    protocolVersion: z.literal(PROTOCOL_VERSION),
    sequence: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    kind: z.literal('basic'),
    targetId: z.string().min(1).max(128).optional(),
  }),
  z.strictObject({
    protocolVersion: z.literal(PROTOCOL_VERSION),
    sequence: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    kind: z.literal('move-to'),
    zoneId: z.string().min(1).max(128),
    x: z.number().min(0).max(16384),
    y: z.number().min(0).max(16384),
    targetId: z.string().min(1).max(128).optional(),
  }),
  z.strictObject({
    protocolVersion: z.literal(PROTOCOL_VERSION),
    sequence: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    kind: z.literal('auto-basic'),
    enabled: z.boolean(),
  }),
  z.strictObject({
    protocolVersion: z.literal(PROTOCOL_VERSION),
    sequence: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    kind: z.literal('dash'),
  }),
  z.strictObject({
    protocolVersion: z.literal(PROTOCOL_VERSION),
    sequence: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    kind: z.literal('cast'),
    slot: z.number().int().min(0).max(4),
  }),
  z.strictObject({
    protocolVersion: z.literal(PROTOCOL_VERSION),
    sequence: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    kind: z.literal('select-basic'),
    id: z.enum([
      'cai_bang_bong',
      'cai_bang_chuong',
      'thien_son_phien',
      'thien_son_dao',
      'vo_dang_quyen',
      'vo_dang_kiem',
      'thieu_lam_quyen',
      'thieu_lam_dao',
      'con_luan_thien_su',
      'con_luan_kiem_ton',
      'duong_mon_co_quan',
      'duong_mon_am_khi',
      'ngu_doc_ta_hiep',
      'ngu_doc_co_su',
    ]),
  }),
]);
export type InputMessage = z.infer<typeof inputSchema>;
const buildBase = {
  protocolVersion: z.literal(PROTOCOL_VERSION),
  sequence: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  revision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
};
const assetId = z
  .string()
  .regex(/^[a-z_]+$/)
  .max(80);
export const buildActionSchema = z.discriminatedUnion('action', [
  z.strictObject({
    ...buildBase,
    action: z.literal('mode'),
    mode: z.enum(['default', 'custom']),
  }),
  z.strictObject({
    ...buildBase,
    action: z.literal('branch'),
    basicId: assetId,
  }),
  z.strictObject({
    ...buildBase,
    action: z.literal('loadout'),
    ids: z.array(z.union([assetId, z.literal('')])).length(4),
  }),
  z.strictObject({
    ...buildBase,
    action: z.literal('upgrade'),
    skillId: assetId,
  }),
  z.strictObject({
    ...buildBase,
    action: z.literal('upgrade-slot'),
    slot: z.number().int().min(0).max(4),
  }),
  z.strictObject({ ...buildBase, action: z.literal('stance') }),
  z.strictObject({ ...buildBase, action: z.literal('reset') }),
  z.strictObject({
    ...buildBase,
    action: z.literal('basic'),
    basicId: assetId,
  }),
]);
export type BuildAction = z.infer<typeof buildActionSchema>;
export const skillPreviewActionSchema = z.strictObject({
  action: z.enum(['targets', 'attacker', 'clear']),
});
export const combatEventSchema = z.strictObject({
  tick: z.number().int().nonnegative().optional(),
  hitIndex: z.number().int().nonnegative().optional(),
  hitPhase: z.string().min(1).max(64).optional(),
  protocolVersion: z.literal(PROTOCOL_VERSION),
  id: z.number().int().positive(),
  kind: z.enum(['attack', 'hit', 'death', 'cast', 'effect', 'pulse']),
  sourceId: z.string(),
  targetId: z.string(),
  abilityId: z.string(),
  x: z.number().finite(),
  y: z.number().finite(),
  damage: z.number().nonnegative(),
  critical: z.boolean(),
  zoneId: z.string().min(1),
  fx: z.number().finite().optional(),
  fy: z.number().finite().optional(),
  radius: z.number().nonnegative().optional(),
  stage: z.string().optional(),
});
export const loiDaiActionSchema = z.strictObject({
  protocolVersion: z.literal(PROTOCOL_VERSION),
  sequence: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  action: z.enum(['enter', 'exit']),
});
export const dungeonActionSchema = z.discriminatedUnion('action', [
  z.strictObject({
    protocolVersion: z.literal(PROTOCOL_VERSION),
    sequence: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    action: z.literal('open'),
  }),
  z.strictObject({
    protocolVersion: z.literal(PROTOCOL_VERSION),
    sequence: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    action: z.literal('enter'),
    access: z.enum(['private', 'shared']).optional(),
    summonHelp: z.boolean().optional(),
    destination: z
      .enum([
        'forest',
        'desert',
        'sea',
        'hell',
        'chu_ba_thong',
        'hong_liet',
        'kim_luan',
        'co_mo',
      ])
      .optional(),
  }),
  z.strictObject({
    protocolVersion: z.literal(PROTOCOL_VERSION),
    sequence: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    action: z.enum(['exit', 'interact']),
  }),
  z.strictObject({
    protocolVersion: z.literal(PROTOCOL_VERSION),
    sequence: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    action: z.literal('summon-help'),
  }),
  z.strictObject({
    protocolVersion: z.literal(PROTOCOL_VERSION),
    sequence: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    action: z.literal('reply-invitation'),
    invitationId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    accept: z.boolean(),
  }),
]);
export const bossLootActionSchema = z.strictObject({
  protocolVersion: z.literal(PROTOCOL_VERSION),
  sequence: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  lootId: z.number().int().positive(),
  action: z.enum(['roll', 'pass', 'pickup']),
});
export const bossItemActionSchema = z.strictObject({
  protocolVersion: z.literal(PROTOCOL_VERSION),
  sequence: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  index: z.number().int().min(0),
  itemId: z.enum(['toan_chan_tien_tuu', 'kim_luan_tan_phien']),
  action: z.enum(['sell', 'drop']),
});
export type DungeonAction = z.infer<typeof dungeonActionSchema>;
const merchantBase = z.strictObject({
  protocolVersion: z.literal(PROTOCOL_VERSION),
  sequence: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  revision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
});
const potionIdSchema = z.enum([
  'hp_small',
  'hp_medium',
  'hp_large',
  'mp_small',
  'mp_medium',
  'mp_large',
]);
export const merchantActionSchema = z.discriminatedUnion('action', [
  merchantBase.extend({
    action: z.literal('buy-basic'),
    slot: z.enum(['weapon', 'armor', 'hat', 'boots']),
  }),
  merchantBase.extend({
    action: z.literal('craft'),
    slot: z.enum(['weapon', 'armor', 'hat', 'boots']),
    branch: z.enum([
      'cleave',
      'lifesteal',
      'penetration',
      'reflect',
      'slow_aura',
      'burn_aura',
      'recovery',
      'fortitude',
      'assault',
      'cleanse',
      'haste',
      'spring',
    ]),
  }),
  merchantBase.extend({
    action: z.literal('buy-potion'),
    potionId: potionIdSchema,
    quantity: z.number().int().min(1).max(20),
  }),
  merchantBase.extend({
    action: z.literal('use-potion'),
    potionId: potionIdSchema,
  }),
]);
export const merchantResultSchema = z.strictObject({
  protocolVersion: z.literal(PROTOCOL_VERSION),
  sequence: z.number().int().positive(),
  revision: z.number().int().nonnegative(),
  message: z.string(),
});
export const rejectionSchema = z.strictObject({
  protocolVersion: z.literal(PROTOCOL_VERSION),
  sequence: z.number().int().positive(),
  reason: z.string(),
});
export type InputTimingSample = {
  sequence: number;
  tick: number;
  inputToStepMs: number;
  stepToPatchMs: number;
};
export type ServerMessages = {
  'merchant-result': z.infer<typeof merchantResultSchema>;
  'connection-ack': z.infer<typeof connectionAckSchema>;
  'combat-event': z.infer<typeof combatEventSchema>;
  'command-rejected': z.infer<typeof rejectionSchema>;
  'input-timing': InputTimingSample;
  'dungeon-menu': { protocolVersion: typeof PROTOCOL_VERSION };
};

// Network representation only; core simulation remains independent of schemas.
const actorFields = {
  x: t.number().default(0),
  y: t.number().default(0),
  hp: t.number().default(0),
  maxHp: t.number().default(0),
  fx: t.number().default(1),
  fy: t.number().default(0),
  pose: t.string().default('idle'),
  statuses: t.string().default('[]'),
  castAbilityId: t.string().default(''),
};
export const CharacterStatsState = schema(
  {
    maxHp: t.number(),
    maxMana: t.number(),
    attackPower: t.number(),
    defense: t.number(),
    attackSpeed: t.number(),
    movementSpeed: t.number(),
    critChance: t.number(),
    critMultiplier: t.number(),
    manaRegen: t.number(),
    cooldownReduction: t.number(),
    hpRegen: t.number(),
  },
  'CharacterStats',
);
export const SkillChargeState = schema(
  {
    count: t.number(),
    capacity: t.number(),
    rechargeTicks: t.number(),
  },
  'SkillCharge',
);
export const BuildState = schema(
  {
    enabled: t.boolean().default(false),
    mode: t.string().default('custom'),
    branchId: t.string().default(''),
    slotSkills: t.array('string'),
    revision: t.number().default(0),
    earned: t.number().default(1),
    allocated: t.number().default(0),
    available: t.number().default(1),
    surplus: t.number().default(0),
    ranks: t.map('number'),
    charges: t.map(SkillChargeState),
    stats: t.ref(CharacterStatsState).default(() => new CharacterStatsState()),
    sources: t.string().default('{}'),
  },
  'CharacterBuild',
);
export const MerchantInventoryState = schema(
  {
    tamLienReadyTicks: t.number().default(0),
    campaign: t.string().default(''),
    levels: t.map('number'),
    potions: t.map('number'),
    materials: t.map('number'),
    crafted: t.map('string'),
    auxiliaryCooldownTicks: t.number().default(0),
    revision: t.number().default(0),
    potionCooldownTicks: t.number().default(0),
  },
  'MerchantInventory',
);
export const LobbyPlayer = schema(
  {
    build: t.ref(BuildState).default(() => new BuildState()),
    inventory: t
      .ref(MerchantInventoryState)
      .default(() => new MerchantInventoryState()),
    ...actorFields,
    x: t.number().default(0).view(),
    y: t.number().default(0).view(),
    fx: t.number().default(1).view(),
    fy: t.number().default(0).view(),
    pose: t.string().default('idle').view(),
    statuses: t.string().default('[]').view(),
    castAbilityId: t.string().default('').view(),
    combos: t.string().default('[]').view(),
    zoneId: t.string().default('arena'),
    respawnTicks: t.number().default(0),
    loiDaiFighter: t.boolean().default(false),
    bossSpectator: t.boolean().default(false),
    bossRevivalUsed: t.boolean().default(false),
    bossAttempt: t.number().default(0),
    bossInvitation: t.string().default(''),
    actionState: t.string().default('').view(),
    actionUntil: t.number().default(0).view(),
    actionStartedAt: t.number().default(0).view(),
    basicStage: t.string().default('').view(),
    bossItems: t.string().default('[]'),
    nickname: t.string(),
    schoolId: t.string().default(''),
    selectedBranch: t.string().default(''),
    confirmed: t.boolean().default(false),
    connected: t.boolean().default(true),
    checks: t.number().default(0),
    mana: t.number().default(0),
    maxMana: t.number().default(0),
    level: t.number().default(1),
    xp: t.number().default(0),
    gold: t.number().default(0),
    skillPoints: t.number().default(1),
    basicId: t.string().default('cai_bang_bong'),
    lastSequence: t.number().default(0),
    basicCooldown: t.number().default(0),
    dashCharges: t.number().default(2),
    dashRechargeTicks: t.number().default(0),
    blinkTicks: t.number().default(0),
    qCooldown: t.number().default(0),
    wCooldown: t.number().default(0),
    eCooldown: t.number().default(0),
    rCooldown: t.number().default(0),
    tCooldown: t.number().default(0),
    qSkill: t.string().default('hoa_van_chuong'),
    wSkill: t.string().default('cuong_long_loan_vu'),
    eSkill: t.string().default(''),
    rSkill: t.string().default(''),
    tSkill: t.string().default(''),
    bossLoot: t.string().default('[]'),
  },
  'ArenaPlayer',
);
export type LobbyPlayer = SchemaType<typeof LobbyPlayer>;
export const CreepState = schema(
  {
    ...actorFields,
    ownerId: t.string().default(''),
    castTicks: t.number().default(0),
    castTargetId: t.string().default(''),
    archetypeId: t.string().default(''),
    actionStartedAt: t.number(),
    actionActiveAt: t.number(),
    actionEndsAt: t.number(),
    zoneId: t.string().default('arena'),
    invasionWave: t.number().default(0),
    lane: t.string().default(''),
    targetId: t.string().default(''),
  },
  'ArenaCreep',
);
export type CreepState = SchemaType<typeof CreepState>;
export const BossEffectState = schema(
  {
    originX: t.number().default(0),
    originY: t.number().default(0),
    targetId: t.string().default(''),
    speed: t.number().default(0),
    index: t.number().default(0),
    maxRadius: t.number().default(0),
    previousRadius: t.number().default(0),
    zoneId: t.string(),
    kind: t.string(),
    castId: t.string(),
    ownerId: t.string(),
    abilityId: t.string(),
    x: t.number(),
    y: t.number(),
    fx: t.number(),
    fy: t.number(),
    length: t.number(),
    radius: t.number(),
    startedAt: t.number(),
    activeAt: t.number(),
    expiresAt: t.number(),
    damageUntil: t.number(),
  },
  'HongLietEffect',
);
export type BossEffectState = SchemaType<typeof BossEffectState>;
export const ProjectileState = schema(
  {
    startedAt: t.number().default(0),
    x: t.number().default(0),
    y: t.number().default(0),
    vx: t.number().default(0),
    vy: t.number().default(0),
    ownerId: t.string().default(''),
    abilityId: t.string().default(''),
    zoneId: t.string().default('arena'),
    radius: t.number().default(0),
    stage: t.string().default(''),
    leg: t.string().default(''),
    lingerTicks: t.number().default(0),
  },
  'ArenaProjectile',
);
export const DungeonState = schema(
  {
    id: t.string(),
    access: t.string(),
    ownerId: t.string(),
    wave: t.number(),
    encounter: t.string().default(''),
    occupants: t.number(),
    paused: t.boolean(),
    tick: t.number(),
    living: t.number(),
    spawnPlayerCount: t.number(),
    nextWaveTicks: t.number(),
    bossHp: t.number(),
    bossMaxHp: t.number(),
    bossRespawnTicks: t.number(),
    respawnTicks: t.number().default(0),
  },
  'CreepDungeon',
);
export const AreaState = schema(
  {
    stage: t.string().default(''),
    startedAt: t.number().default(0),
    launchX: t.number().default(0),
    launchY: t.number().default(0),
    launchFx: t.number().default(0),
    launchFy: t.number().default(0),
    x: t.number(),
    y: t.number(),
    radius: t.number(),
    radiusY: t.number().default(0),
    ticks: t.number(),
    ownerId: t.string(),
    abilityId: t.string(),
    zoneId: t.string(),
  },
  'CombatArea',
);
export type AreaState = SchemaType<typeof AreaState>;
export type DungeonState = SchemaType<typeof DungeonState>;
export const DefenseState = schema(
  {
    creepPreview: t.string().default(''),
    portalCount: t.number().default(2),
    arenaId: t.string().default('dao_hoa_dao'),
    streamUntilTick: t.number().default(0),
    devCreepTest: t.boolean().default(false),
    devWaveBosses: t.boolean().default(false),
    devFinalBoss: t.boolean().default(false),
    devWaveBossStage: t.string().default(''),
    dongTa: t.string().default(''),
    waveArena: t.string().default(''),

    paused: t.boolean().default(false),
    namDe: t.string().default(''),
    enabled: t.boolean().default(false),
    statueHp: t.number().default(0),
    statueMaxHp: t.number().default(0),
    x: t.number().default(800),
    y: t.number().default(576),
    wave: t.number().default(0),
    nextWaveTick: t.number().default(0),
    intervalTicks: t.number().default(5400),
    spawnPlayerCount: t.number().default(0),
    noticeId: t.number().default(0),
    noticeKind: t.string().default(''),
    noticeWave: t.number().default(0),
    noticeLeadTicks: t.number().default(0),
    noticeUntilTick: t.number().default(0),
    defeated: t.boolean().default(false),
    defeatTick: t.number().default(0),
  },
  'StatueDefense',
);
export const TayDocState = schema(
  { json: t.string().default('') },
  'TayDocArenaProjection',
);
export const NamDeControlState = schema(
  { heroId: t.string(), payload: t.string() },
  'NamDeControl',
);
export const BacCaiState = schema(
  { snapshot: t.string().default('') },
  'BacCaiArenaEncounter',
);
export const VuongState = schema(
  { snapshot: t.string().default('') },
  'VuongArenaEncounter',
);
export const PvpState = schema(
  { enabled: t.boolean().default(false), json: t.string().default('') },
  'StandaloneLoiDaiState',
);
export const PracticeState = schema(
  { enabled: t.boolean().default(false) },
  'PracticeState',
);
export const LobbyState = schema(
  {
    protocolVersion: t.number().default(PROTOCOL_VERSION),
    pvp: t.ref(PvpState).default(() => new PvpState()),
    practice: t.ref(PracticeState).default(() => new PracticeState()),
    phase: t.string().default('WAITING_LOBBY'),
    hostId: t.string().default(''),
    matchElapsedMs: t.number().default(0),
    maxPlayers: t.number().default(lobbyConfig.maxPlayers),
    devSkillLoadout: t.boolean().default(false),
    requiresBranch: t.boolean().default(true),
    tick: t.number().default(0),
    loiDaiTick: t.number().default(0),
    loiDaiGateTicks: t.number().default(0),
    loiDaiFighters: t.number().default(0),
    players: t.map(LobbyPlayer),
    creeps: t.map(CreepState).view(),
    projectiles: t.map(ProjectileState).view(),
    areas: t.map(AreaState).view(),
    bossEffects: t.map(BossEffectState).view(),
    namDeControls: t.map(NamDeControlState).view(),
    dungeons: t.map(DungeonState).view(),
    defense: t.ref(DefenseState).default(() => new DefenseState()),
    tayDoc: t.map(TayDocState).view(),
    bacCai: t.map(BacCaiState).view(),
    vuong: t.map(VuongState).view(),
  },
  'ArenaState',
);
export type LobbyState = SchemaType<typeof LobbyState>;

export const schoolIdSchema = z.enum([
  'cai_bang',
  'thien_son',
  'vo_dang',
  'thieu_lam',
  'con_luan',
  'duong_mon',
  'ngu_doc',
]);
export const lobbyActionSchema = z.discriminatedUnion('action', [
  z.strictObject({ action: z.literal('start') }),
  z.strictObject({ action: z.literal('select'), schoolId: schoolIdSchema }),
  z.strictObject({ action: z.literal('branch'), basicId: assetId }),
  z.strictObject({ action: z.literal('confirm') }),
]);
export type LobbyAction = z.infer<typeof lobbyActionSchema>;

export const PRACTICE_ROOM = 'practice';
export const practiceJoinOptionsSchema = joinOptionsSchema
  .pick({ nickname: true, protocolVersion: true })
  .extend({ schoolId: schoolIdSchema, branchId: assetId });
export type PracticeJoinOptions = z.infer<typeof practiceJoinOptionsSchema>;
export const practiceSelectSchema = z.strictObject({
  protocolVersion: z.literal(PROTOCOL_VERSION),
  sequence: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  schoolId: schoolIdSchema,
  branchId: assetId,
});
export type PracticeSelection = z.infer<typeof practiceSelectSchema>;

export const PVP_ROOM = 'loi_dai';
export const pvpMapIdSchema = z.enum([
  'hong_moc',
  'rung_truc',
  'dia_nguc',
  'tuong_duong',
  'kiem_ho',
]);
export const pvpJoinOptionsSchema = joinOptionsSchema.extend({
  pvp: z.literal(true),
  mapId: pvpMapIdSchema.optional(),
});
export type PvpJoinOptions = z.infer<typeof pvpJoinOptionsSchema>;
const pvpActionBase = {
  protocolVersion: z.literal(PROTOCOL_VERSION),
  sequence: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
};
export const pvpActionSchema = z.discriminatedUnion('action', [
  z.strictObject({
    ...pvpActionBase,
    action: z.literal('choose'),
    schoolId: schoolIdSchema,
    branchId: assetId,
  }),
  z.strictObject({
    ...pvpActionBase,
    action: z.literal('assign'),
    playerId: z.string().min(1).max(128),
    team: z.enum(['chinh', 'ta', 'spectator']),
  }),
  z.strictObject({
    ...pvpActionBase,
    action: z.literal('settings'),
    mapId: pvpMapIdSchema,
    hazardsEnabled: z.boolean(),
  }),
  z.strictObject({ ...pvpActionBase, action: z.literal('start') }),
]);
export type PvpAction = z.infer<typeof pvpActionSchema>;
