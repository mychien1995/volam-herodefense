import { z } from 'zod';
const positive = z.number().finite().positive();
const count = z.number().int().nonnegative();
const status = z.strictObject({
  kind: z.enum([
    'slow',
    'attack_slow',
    'attack_break',
    'mana_shield',
    'damage_reduction',
    'defense_buff',
    'interrupt_resist',
    'support_aura',
    'stun',
    'silence',
    'disarm',
    'defense_break',
    'crit_buff',
    'speed_buff',
    'counter',
    'dash',
    'channel',
  ]),
  durationTicks: count.min(1),
  magnitude: z.number().finite().nonnegative(),
  secondary: z.number().finite().nonnegative().optional(),
  evade: z.boolean().optional(),
});
const projectile = z.strictObject({
  mode: z.literal('projectile'),
  damage: positive,
  speed: positive,
  range: positive,
  radius: positive,
  count: count.min(1).max(5),
  spacingTicks: count,
  splashRadius: z.number().nonnegative(),
  burnDamage: z.number().nonnegative(),
  burnTicks: count,
  piercing: z.boolean().optional(),
  useFacing: z.boolean().optional(),
  knockback: z.number().nonnegative().optional(),
  statuses: z.array(status).optional(),
  spreadAngle: z.number().finite().min(0).max(Math.PI).optional(),
});
const arc = z.strictObject({
  mode: z.literal('arc'),
  damage: z.number().nonnegative(),
  range: positive,
  halfAngle: positive.max(Math.PI),
  cleave: z.number().min(0).max(1),
  singleTarget: z.boolean().optional(),
  statuses: z.array(status).optional(),
  pull: z.number().nonnegative().optional(),
  armorPenetration: z.number().min(0).max(1).optional(),
  slowedBonus: z.number().nonnegative().optional(),
  manaRefund: z.number().finite().nonnegative().optional(),
  projectileProc: z
    .strictObject({ chance: z.number().min(0).max(1), effect: projectile })
    .optional(),
  windupTicks: count.min(1).optional(),
});
const allies = z.strictObject({
  radius: positive,
  heal: positive.optional(),
  statuses: z.array(status).optional(),
});
export const abilitySchema = z.strictObject({
  id: z.string().regex(/^[a-z_]+$/),
  nameVi: z.string().min(1),
  cooldownTicks: count.min(1),
  manaCost: z.number().nonnegative(),
  combo: z
    .strictObject({
      id: z.enum(['phat_dong_a', 'phat_dong_b']),
      step: z.union([z.literal(1), z.literal(2), z.literal(3)]),
      windowTicks: count.min(1),
      multiplier: positive.min(1),
    })
    .optional(),
  selfStatuses: z.array(status).optional(),
  allies: allies.optional(),
  effect: z.discriminatedUnion('mode', [
    projectile,
    arc,
    z.strictObject({
      mode: z.literal('support'),
      radius: positive,
      heal: positive.optional(),
      statuses: z.array(status).optional(),
      durationTicks: count.min(1),
      tickInterval: count.min(1),
    }),
    z.strictObject({
      mode: z.literal('mana_shield'),
      durationTicks: count.min(1),
      absorbFraction: positive.max(1),
      manaPerDamage: positive,
    }),
    z.strictObject({
      mode: z.literal('area'),
      durationTicks: count.min(1),
      tickInterval: count.min(1),
      radius: positive,
      damage: positive,
      statuses: z.array(status).optional(),
    }),
    z.strictObject({
      mode: z.literal('counter'),
      durationTicks: count.min(1),
      damage: positive,
      range: positive,
      evade: z.boolean(),
    }),
    z.strictObject({
      mode: z.literal('buff'),
      durationTicks: count.min(1),
      critChance: z.number().min(0).max(1),
      critMultiplier: z.number().nonnegative(),
      movementSpeed: z.number().min(0).max(1).optional(),
      attackSpeed: z.number().min(0).max(2).optional(),
    }),
    z.strictObject({
      mode: z.literal('dash'),
      distance: positive,
      speed: positive,
      radius: positive,
      damage: z.number().nonnegative(),
      stunTicks: count,
      counter: z
        .strictObject({
          durationTicks: count.min(1),
          damage: positive,
          range: positive,
        })
        .optional(),
    }),
    z.strictObject({
      mode: z.literal('multi_hit'),
      range: positive,
      damage: positive,
      hits: count.min(1).max(12),
      spacingTicks: count.min(1),
      finisherDamage: z.number().nonnegative(),
      finisherRange: positive,
      halfAngle: positive.max(Math.PI).optional(),
      slowedBonus: z.number().nonnegative().optional(),
    }),
  ]),
});
