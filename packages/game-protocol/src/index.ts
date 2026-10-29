import { schema, t, type SchemaType } from '@colyseus/schema';
import { lobbyConfig } from '@volam/game-data';
import { z } from 'zod';

export const PROTOCOL_VERSION = 1;
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
export type ServerMessages = {
  'connection-ack': z.infer<typeof connectionAckSchema>;
};

// Network representation only. Simulation entities belong in game-core later.
export const LobbyPlayer = schema(
  {
    nickname: t.string(),
    checks: t.number().default(0),
  },
  'LobbyPlayer',
);
export type LobbyPlayer = SchemaType<typeof LobbyPlayer>;

export const LobbyState = schema(
  {
    protocolVersion: t.number().default(PROTOCOL_VERSION),
    phase: t.string().default('lobby'),
    maxPlayers: t.number().default(lobbyConfig.maxPlayers),
    players: t.map(LobbyPlayer),
  },
  'LobbyState',
);
export type LobbyState = SchemaType<typeof LobbyState>;
