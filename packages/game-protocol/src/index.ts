import { schema, t, type SchemaType } from '@colyseus/schema';
import { lobbyConfig } from '@volam/game-data';
import { z } from 'zod';

export const PROTOCOL_VERSION = 18;
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
        'Chỉ dùng chữ, số, khoảng trắng hoặc dấu câu đơn giản.',
      ),
  );

export const joinOptionsSchema = z.strictObject({
  nickname: nicknameSchema,
  protocolVersion: z.literal(PROTOCOL_VERSION),
});
export type JoinOptions = z.infer<typeof joinOptionsSchema>;

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
  }),
  z.strictObject({
    protocolVersion: z.literal(PROTOCOL_VERSION),
    sequence: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    kind: z.literal('cast'),
    slot: z.number().int().min(0).max(3),
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
    access: z.enum(['private', 'shared']),
    destination: z
      .enum([
        'forest',
        'desert',
        'sea',
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
    action: z.literal('exit'),
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
export const rejectionSchema = z.strictObject({
  protocolVersion: z.literal(PROTOCOL_VERSION),
  sequence: z.number().int().positive(),
  reason: z.string(),
});
export type ServerMessages = {
  'connection-ack': z.infer<typeof connectionAckSchema>;
  'combat-event': z.infer<typeof combatEventSchema>;
  'command-rejected': z.infer<typeof rejectionSchema>;
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
    stats: t.ref(CharacterStatsState).default(() => new CharacterStatsState()),
    sources: t.string().default('{}'),
  },
  'CharacterBuild',
);
export const LobbyPlayer = schema(
  {
    build: t.ref(BuildState).default(() => new BuildState()),
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
    bossItems: t.string().default('[]'),
    nickname: t.string(),
    schoolId: t.string().default(''),
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
    qCooldown: t.number().default(0),
    wCooldown: t.number().default(0),
    eCooldown: t.number().default(0),
    rCooldown: t.number().default(0),
    qSkill: t.string().default('hoa_van_chuong'),
    wSkill: t.string().default('cuong_long_loan_vu'),
    eSkill: t.string().default(''),
    rSkill: t.string().default(''),
    bossLoot: t.string().default('[]'),
  },
  'ArenaPlayer',
);
export type LobbyPlayer = SchemaType<typeof LobbyPlayer>;
export const CreepState = schema(
  {
    ...actorFields,
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
    x: t.number(),
    y: t.number(),
    radius: t.number(),
    ticks: t.number(),
    ownerId: t.string(),
    abilityId: t.string(),
    zoneId: t.string(),
  },
  'CombatArea',
);
export type DungeonState = SchemaType<typeof DungeonState>;
export const DefenseState = schema(
  {
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
export const LobbyState = schema(
  {
    protocolVersion: t.number().default(PROTOCOL_VERSION),
    phase: t.string().default('WAITING_LOBBY'),
    hostId: t.string().default(''),
    matchElapsedMs: t.number().default(0),
    maxPlayers: t.number().default(lobbyConfig.maxPlayers),
    devSkillLoadout: t.boolean().default(false),
    tick: t.number().default(0),
    players: t.map(LobbyPlayer),
    creeps: t.map(CreepState).view(),
    projectiles: t.map(ProjectileState).view(),
    areas: t.map(AreaState).view(),
    bossEffects: t.map(BossEffectState).view(),
    dungeons: t.map(DungeonState).view(),
    defense: t.ref(DefenseState).default(() => new DefenseState()),
    tayDoc: t.map(TayDocState).view(),
  },
  'ArenaState',
);
export type LobbyState = SchemaType<typeof LobbyState>;

export const schoolIdSchema = z.enum([
  'cai_bang',
  'thien_son',
  'vo_dang',
  'thieu_lam',
]);
export const lobbyActionSchema = z.discriminatedUnion('action', [
  z.strictObject({ action: z.literal('start') }),
  z.strictObject({ action: z.literal('select'), schoolId: schoolIdSchema }),
  z.strictObject({ action: z.literal('confirm') }),
]);
export type LobbyAction = z.infer<typeof lobbyActionSchema>;
