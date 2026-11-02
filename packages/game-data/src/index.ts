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
export * from './desert.js';
export * from './beach.js';
export * from './ly-mac-sau.js';
export * from './dungeon-registry.js';
export * from './invasion.js';
export * from './cai-bang.js';
export * from './thien-son.js';
export * from './vo-dang.js';
export * from './skill-art.js';
export * from './progression-data.js';

export * from './thieu-lam.js';

export * from './wave-presentation.js';

export * from './chu-ba-thong.js';
export * from './hong-liet.js';
export * from './kim-luan.js';
export * from './bac-cai.js';
