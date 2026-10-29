import { z } from 'zod';

export const lobbyConfigSchema = z.strictObject({
  maxPlayers: z.literal(6), // Confirmed rule, never supplied by a joining client.
  nicknameMaxLength: z.number().int().min(1).max(40),
  maxMessagesPerSecond: z.number().int().min(1).max(60),
});

// M0 technical defaults only; no unapproved combat or progression tuning.
export const lobbyConfig = Object.freeze(
  lobbyConfigSchema.parse({
    maxPlayers: 6,
    nicknameMaxLength: 20,
    maxMessagesPerSecond: 10,
  }),
);

/** Canonical future controls. M0 does not handle gameplay input yet. */
export const inputBindings = Object.freeze({
  movement: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'] as const,
  basicAttack: 'KeyA',
  activeSkills: ['KeyQ', 'KeyW', 'KeyE', 'KeyR'] as const,
});
