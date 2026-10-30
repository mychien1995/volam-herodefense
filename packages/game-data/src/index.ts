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
    maxMessagesPerSecond: 60,
  }),
);

/** Canonical gameplay controls. */
export const inputBindings = Object.freeze({
  movement: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'] as const,
  basicAttack: 'KeyA',
  activeSkills: ['KeyQ', 'KeyW', 'KeyE', 'KeyR'] as const,
});

export * from './arena.js';
export * from './m1.js';
export * from './schools.js';
export * from './dungeon.js';
export * from './invasion.js';
