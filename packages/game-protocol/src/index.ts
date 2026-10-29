import { schema, t, type SchemaType } from '@colyseus/schema';
import { lobbyConfig } from '@volam/game-data';
import { z } from 'zod';

export const PROTOCOL_VERSION = 2;
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
});
export const rejectionSchema = z.strictObject({
  protocolVersion: z.literal(PROTOCOL_VERSION),
  sequence: z.number().int().positive(),
  reason: z.string(),
});
export type ServerMessages = {
  'connection-ack': z.infer<typeof connectionAckSchema>;
  'combat-event': z.infer<typeof combatEventSchema>;
  'command-rejected': z.infer<typeof rejectionSchema>;
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
    nickname: t.string(),
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
export const CreepState = schema({ ...actorFields }, 'ArenaCreep');
export type CreepState = SchemaType<typeof CreepState>;
export const ProjectileState = schema(
  {
    x: t.number().default(0),
    y: t.number().default(0),
    vx: t.number().default(0),
    vy: t.number().default(0),
    ownerId: t.string().default(''),
    abilityId: t.string().default(''),
  },
  'ArenaProjectile',
);
export const LobbyState = schema(
  {
    protocolVersion: t.number().default(PROTOCOL_VERSION),
    phase: t.string().default('arena'),
    maxPlayers: t.number().default(lobbyConfig.maxPlayers),
    tick: t.number().default(0),
    players: t.map(LobbyPlayer),
    creeps: t.map(CreepState),
    projectiles: t.map(ProjectileState),
  },
  'ArenaState',
);
export type LobbyState = SchemaType<typeof LobbyState>;
