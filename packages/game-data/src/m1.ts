import { bossBanterDefinition } from './boss-banter.js';
import {
  thieuLamBasics,
  thieuLamSkills,
  addThieuLamProgression,
} from './thieu-lam.js';
import { z } from 'zod';
import { economySchema, economyTrial } from './economy.js';
import { defaultBranches, fixedBranches } from './default-builds.js';
import type { SimulationConfig } from '@volam/game-core';
import { arena } from './arena.js';
import {
  caiBangBongBeatTicks,
  caiBangChuongBasicTuning,
  caiBangExtraSkills,
  caiBangPassive,
} from './cai-bang.js';
import {
  thienSonBasics,
  thienSonSkills,
  addThienSonProgression,
} from './thien-son.js';
import { abilitySchema } from './ability-schema.js';
import { voDangBasics, voDangSkills, addVoDangProgression } from './vo-dang.js';
import { createProgression, progressionSchema } from './progression-data.js';
export { abilitySchema } from './ability-schema.js';
const positive = z.number().finite().positive();
const count = z.number().int().nonnegative();
const rect = z.strictObject({
  x: z.number().finite(),
  y: z.number().finite(),
  width: positive,
  height: positive,
});
const point = z.strictObject({
  x: z.number().finite(),
  y: z.number().finite(),
});
export const simulationConfigSchema = z.strictObject({
  bossBanter: z
    .strictObject({
      openingTicks: positive.int(),
      intervalTicks: positive.int(),
      jitterTicks: count,
      pools: z.record(z.string(), z.array(z.string().min(1)).length(20)),
      farewells: z.record(z.string(), z.string().min(1)),
      farewellTicks: positive.int(),
    })
    .optional(),
  waveArena: z
    .strictObject({
      center: z.strictObject({
        x: z.number().finite(),
        y: z.number().finite(),
      }),
      bounds: z.strictObject({
        x: z.number().finite(),
        y: z.number().finite(),
        radiusX: positive,
        radiusY: positive,
      }),
      retryTicks: positive,
      openingTicks: positive,
    })
    .optional(),
  mobility: z
    .strictObject({
      charges: count.min(1).max(2),
      rechargeTicks: count.min(1),
      distance: positive,
      speed: positive,
    })
    .optional(),
  dungeonAggro: z.boolean().optional(),
  progression: progressionSchema.optional(),
  tickRate: count.min(10).max(60),
  inputTimeoutTicks: count.min(1),
  width: positive,
  height: positive,
  collision: z.array(rect),
  spawn: point,
  creepSpawns: z.array(point).min(1),
  speed: positive,
  radius: positive,
  maxHp: positive,
  maxMana: positive,
  manaRegen: z.number().nonnegative(),
  hpPerLevel: z.number().nonnegative(),
  attackPerLevel: z.number().nonnegative(),
  xpPerLevel: count.min(1),
  maxLevel: z.literal(30),
  critChance: z.number().min(0).max(1),
  critMultiplier: positive,
  basics: z.record(z.string(), abilitySchema),
  skills: z.array(abilitySchema).length(2),
  skillCatalogue: z.record(z.string(), abilitySchema).optional(),
  caiBangPassive: z
    .strictObject({
      damagePerLevel: z.number().nonnegative(),
      critChancePerLevel: z.number().nonnegative(),
      critMultiplierPerLevel: z.number().nonnegative(),
    })
    .optional(),
  creepRespawn: z.boolean().default(true),
  economy: economySchema.optional(),
  creep: z.strictObject({
    hp: positive,
    defense: z.number().nonnegative(),
    speed: z.number().nonnegative(),
    radius: positive,
    damage: positive,
    attackRange: positive,
    detectionRange: positive,
    attackCooldownTicks: count.min(1),
    respawnTicks: count.min(30),
    xp: count,
    gold: count,
    assistTicks: count.min(1),
  }),
});
const shot = {
  mode: 'projectile' as const,
  damage: 22,
  speed: 360,
  range: 320,
  radius: 4,
  count: 1,
  spacingTicks: 0,
  splashRadius: 0,
  burnDamage: 0,
  burnTicks: 0,
};
/** M1 playable tuning only. No final school balance, dungeon or invasion recipes. */
const initialConfig: SimulationConfig = simulationConfigSchema.parse({
  mobility: { charges: 2, rechargeTicks: 240, distance: 120, speed: 720 },
  tickRate: 30,
  inputTimeoutTicks: 15,
  width: arena.width,
  height: arena.height,
  collision: arena.collision,
  spawn: arena.spawn,
  creepSpawns: arena.creepSpawns,
  speed: 160,
  radius: 10,
  maxHp: 160,
  maxMana: 100,
  manaRegen: 6,
  hpPerLevel: 8,
  attackPerLevel: 2,
  xpPerLevel: 60,
  maxLevel: 30,
  critChance: 0.1,
  critMultiplier: 1.5,
  basics: {
    cai_bang_bong: {
      id: 'cai_bang_bong',
      nameVi: 'Cái Bang Bổng',
      cooldownTicks: caiBangBongBeatTicks,
      manaCost: 0,
      minIntervalTicks: caiBangBongBeatTicks,
      basicCombo: [
        { stage: 'thrust', damageMultiplier: 1, halfAngle: Math.PI / 5 },
        { stage: 'sweep', damageMultiplier: 1, halfAngle: Math.PI / 2 },
        { stage: 'lift', damageMultiplier: 1.05, halfAngle: Math.PI / 3 },
        { stage: 'smash', damageMultiplier: 1.2, halfAngle: Math.PI / 4 },
      ],
      effect: {
        mode: 'arc',
        damage: 28,
        range: 105,
        halfAngle: Math.PI / 3,
        cleave: 0.5,
      },
    },
    cai_bang_chuong: {
      id: 'cai_bang_chuong',
      nameVi: 'Cái Bang Chưởng',
      cooldownTicks: caiBangChuongBasicTuning.cooldownTicks,
      manaCost: 0,
      minIntervalTicks: caiBangChuongBasicTuning.minIntervalTicks,
      basicCombo: Array.from({ length: 6 }, (_, i) => ({
        stage: i === 5 ? 'dragon' : 'palm',
        damageMultiplier: i === 5 ? 1.25 : 1,
        splashRadius: i === 5 ? 48 : 0,
      })),
      effect: { ...shot, range: caiBangChuongBasicTuning.range },
    },
  },
  skills: [
    {
      id: 'hoa_van_chuong',
      nameVi: 'Hỏa Vân Chưởng',
      cooldownTicks: 90,
      manaCost: 18,
      effect: {
        ...shot,
        damage: 18,
        count: 3,
        spacingTicks: 0,
        spreadAngle: Math.PI / 3,
      },
    },
    {
      id: 'cuong_long_loan_vu',
      nameVi: 'Cuồng Long Loạn Vũ',
      cooldownTicks: 150,
      manaCost: 25,
      effect: {
        ...shot,
        damage: 32,
        speed: 300,
        splashRadius: 58,
        burnDamage: 4,
        burnTicks: 90,
      },
    },
  ],
  creep: {
    hp: 120,
    defense: 5,
    speed: 28,
    radius: 10,
    damage: 6,
    attackRange: 26,
    detectionRange: 160,
    attackCooldownTicks: 45,
    respawnTicks: 240,
    xp: 60,
    gold: 12,
    assistTicks: 300,
  },
});

export const m1Config: SimulationConfig = simulationConfigSchema.parse({
  economy: economyTrial,
  bossBanter: bossBanterDefinition,
  waveArena: {
    center: { x: 800, y: 616 },
    bounds: { x: 800, y: 616, radiusX: 324, radiusY: 294 },
    retryTicks: 90,
    openingTicks: 30,
  },
  ...initialConfig,
  basics: {
    ...initialConfig.basics,
    ...thienSonBasics,
    ...voDangBasics,
    ...thieuLamBasics,
  },
  skillCatalogue: Object.fromEntries(
    [
      ...initialConfig.skills,
      ...caiBangExtraSkills,
      ...thienSonSkills,
      ...voDangSkills,
      ...thieuLamSkills,
    ].map((s) => [s.id, s]),
  ),
  caiBangPassive,
});

// Validate all rank variants before exposing progression to a room.
m1Config.progression = createProgression(
  Object.fromEntries(
    [...initialConfig.skills, ...caiBangExtraSkills].map((s) => [s.id, s]),
  ),
);
addThienSonProgression(m1Config.progression);
addVoDangProgression(m1Config.progression);
addThieuLamProgression(m1Config.progression);
m1Config.progression.defaultBranches = defaultBranches;
m1Config.progression.fixedBranches = fixedBranches;
progressionSchema.parse(m1Config.progression);
