import { schema, t, type SchemaType } from '@colyseus/schema';
import { lobbyConfig } from '@volam/game-data';
import { z } from 'zod';

export const PROTOCOL_VERSION = 5;
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
        'Use letters, numbers, spaces or simple punctuation.',
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
    id: z.enum(['cai_bang_bong', 'cai_bang_chuong']),
  }),
]);
export type InputMessage = z.infer<typeof inputSchema>;
export const combatEventSchema = z.strictObject({
  protocolVersion: z.literal(PROTOCOL_VERSION),
  id: z.number().int().positive(),
  kind: z.enum(['attack', 'hit', 'death', 'cast']),
  sourceId: z.string(),
  targetId: z.string(),
  abilityId: z.string(),
  x: z.number().finite(),
  y: z.number().finite(),
  damage: z.number().nonnegative(),
  critical: z.boolean(),
  zoneId: z.string().min(1),
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
  }),
  z.strictObject({
    protocolVersion: z.literal(PROTOCOL_VERSION),
    sequence: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    action: z.literal('exit'),
  }),
]);
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
};
export const LobbyPlayer = schema(
  {
    ...actorFields,
    x: t.number().default(0).view(),
    y: t.number().default(0).view(),
    fx: t.number().default(1).view(),
    fy: t.number().default(0).view(),
    pose: t.string().default('idle').view(),
    zoneId: t.string().default('arena'),
    respawnTicks: t.number().default(0),
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
  },
  'ArenaPlayer',
);
export type LobbyPlayer = SchemaType<typeof LobbyPlayer>;
export const CreepState = schema(
  {
    ...actorFields,
    zoneId: t.string().default('arena'),
    invasionWave: t.number().default(0),
    lane: t.string().default(''),
    targetId: t.string().default(''),
  },
  'ArenaCreep',
);
export type CreepState = SchemaType<typeof CreepState>;
export const ProjectileState = schema(
  {
    x: t.number().default(0),
    y: t.number().default(0),
    vx: t.number().default(0),
    vy: t.number().default(0),
    ownerId: t.string().default(''),
    abilityId: t.string().default(''),
    zoneId: t.string().default('arena'),
  },
  'ArenaProjectile',
);
export const DungeonState = schema(
  {
    id: t.string(),
    access: t.string(),
    ownerId: t.string(),
    wave: t.number(),
    occupants: t.number(),
    paused: t.boolean(),
    tick: t.number(),
    living: t.number(),
    spawnPlayerCount: t.number(),
    nextWaveTicks: t.number(),
  },
  'CreepDungeon',
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
export const LobbyState = schema(
  {
    protocolVersion: t.number().default(PROTOCOL_VERSION),
    phase: t.string().default('WAITING_LOBBY'),
    hostId: t.string().default(''),
    matchElapsedMs: t.number().default(0),
    maxPlayers: t.number().default(lobbyConfig.maxPlayers),
    tick: t.number().default(0),
    players: t.map(LobbyPlayer),
    creeps: t.map(CreepState).view(),
    projectiles: t.map(ProjectileState).view(),
    dungeons: t.map(DungeonState).view(),
    defense: t.ref(DefenseState).default(() => new DefenseState()),
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
