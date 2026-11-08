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
    'cooldown_buff',
    'counter',
    'guard_counter',
    'dash',
    'dash_guard',
    'channel',
  ]),
  durationTicks: count.min(1),
  magnitude: z.number().finite().nonnegative(),
  secondary: z.number().finite().nonnegative().optional(),
  evade: z.boolean().optional(),
  toggle: z.boolean().optional(),
});
const projectile = z.strictObject({
  dragonDive: z
    .strictObject({
      forwardTicks: count,
      orbitTicks: count.min(1),
      riseTicks: count.min(1),
      diveTicks: count.min(1),
      loopRadius: positive,
      impactRadius: positive,
      height: positive,
      coilTurns: count.min(1).optional(),
      coilDamageScale: z.number().positive().max(1).optional(),
    })
    .optional(),
  windupTicks: count.min(1).optional(),
  recoveryTicks: count.optional(),
  laneOffsets: z.array(z.number().finite()).min(1).max(8).optional(),
  knockbackChance: z.number().min(0).max(1).optional(),
  mode: z.literal('projectile'),
  damage: positive,
  speed: positive,
  range: positive,
  radius: positive,
  count: count.min(1).max(8),
  spacingTicks: count,
  splashRadius: z.number().nonnegative(),
  burnDamage: z.number().nonnegative(),
  burnTicks: count,
  piercing: z.boolean().optional(),
  useFacing: z.boolean().optional(),
  knockback: z.number().nonnegative().optional(),
  statuses: z.array(status).optional(),
  spreadAngle: z.number().finite().min(0).max(Math.PI).optional(),
  radial: z.boolean().optional(),
  attackPowerScale: z.number().finite().min(0).max(1).optional(),
  blinkWindowTicks: count.min(1).optional(),
  boomerang: z.boolean().optional(),
  manaRefund: z.number().finite().nonnegative().optional(),
  slowedBonus: z.number().finite().nonnegative().optional(),
});
const area = z.strictObject({
  mode: z.literal('area'),
  durationTicks: count.min(1),
  tickInterval: count.min(1),
  radius: positive,
  damage: z.number().finite().nonnegative(),
  statuses: z.array(status).optional(),
  confines: z.boolean().optional(),
  protectOwner: z.boolean().optional(),
  followOwner: z.boolean().optional(),
  volley: z
    .strictObject({ speed: positive, projectileRadius: positive })
    .optional(),
  ownerRegenFraction: z.number().finite().positive().max(1).optional(),
  oncePerTarget: z.boolean().optional(),
});
const arc = z.strictObject({
  lineWidth: positive.optional(),
  knockbackChance: z.number().min(0).max(1).optional(),
  residualArea: area.optional(),
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
  durationTicks: count.min(1).optional(),
  originOffset: z.number().finite().nonnegative().optional(),
  knockback: z.number().finite().nonnegative().optional(),
});
const allies = z.strictObject({
  radius: positive,
  heal: positive.optional(),
  statuses: z.array(status).optional(),
});
export const abilitySchema = z
  .strictObject({
    id: z.string().regex(/^[a-z_]+$/),
    nameVi: z.string().min(1),
    cooldownTicks: count.min(1),
    manaCost: z.number().nonnegative(),
    manualChain: z
      .strictObject({
        idleTicks: count.min(1),
        cooldownTicks: count.min(1),
        finisherProjectile: projectile,
      })
      .optional(),
    minIntervalTicks: count.min(1).optional(),
    basicComboEndRecoveryTicks: count.min(1).optional(),
    basicCombo: z
      .array(
        z.strictObject({
          stage: z.string().min(1),
          damageMultiplier: positive,
          halfAngle: positive.max(Math.PI).optional(),
          splashRadius: z.number().finite().nonnegative().optional(),
        }),
      )
      .min(2)
      .max(8)
      .optional(),
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
        toggle: z.boolean().optional(),
      }),
      area,
      z.strictObject({
        mode: z.literal('guard_counter'),
        durationTicks: count.min(1),
        reduction: z.number().min(0).max(0.85),
        thresholdFraction: z.number().positive().max(1),
        range: positive,
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
        burnAura: z
          .strictObject({
            radius: positive,
            damage: positive,
            tickInterval: count.min(1),
            attackPowerScale: z.number().finite().min(0).max(1).optional(),
          })
          .optional(),
        durationTicks: count.min(1),
        critChance: z.number().min(0).max(1),
        critMultiplier: z.number().nonnegative(),
        movementSpeed: z.number().min(0).max(1).optional(),
        attackSpeed: z.number().min(0).max(2).optional(),
        cooldownReduction: z.number().min(0).max(0.8).optional(),
      }),
      z.strictObject({
        mode: z.literal('dash'),
        distance: positive,
        speed: positive,
        radius: positive,
        damage: z.number().nonnegative(),
        stunTicks: count,
        invulnerable: z.boolean().optional(),
        backward: z.boolean().optional(),
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
        attackPowerScale:z.number().min(0).max(1).optional(),
        range: positive,
        damage: z.number().finite().nonnegative(),
        hits: count.min(1).max(16),
        spacingTicks: count.min(1),
        finisherDamage: z.number().nonnegative(),
        finisherRange: positive,
        halfAngle: positive.max(Math.PI).optional(),
        slowedBonus: z.number().nonnegative().optional(),
        projectileBurst: projectile.optional(),
        projectileBurstEvery: count.min(1).max(12).optional(),
        comboBurstOnly: z.boolean().optional(),
        guard: z.number().finite().min(0).max(0.85).optional(),
        durationTicks: count.min(1).optional(),
      }),
    ]),
  })
  .superRefine((a, c) => {
    if (
      a.effect.mode === 'arc' &&
      a.effect.durationTicks !== undefined &&
      a.effect.durationTicks <= (a.effect.windupTicks ?? 0)
    )
      c.addIssue({
        code: 'custom',
        message: 'Arc duration must exceed windup',
      });
    if (
      a.effect.mode === 'projectile' &&
      a.effect.blinkWindowTicks &&
      (!a.effect.piercing || a.effect.count !== 1 || a.effect.boomerang)
    )
      c.addIssue({
        code: 'custom',
        message: 'Blink requires one piercing non-returning projectile',
      });
    if (
      a.effect.mode === 'area' &&
      a.effect.damage === 0 &&
      !a.effect.protectOwner
    )
      c.addIssue({
        code: 'custom',
        message: 'A zero-damage area requires owner protection',
      });
    if (
      a.effect.mode === 'multi_hit' &&
      a.effect.damage === 0 &&
      !a.effect.projectileBurst
    )
      c.addIssue({
        code: 'custom',
        message: 'A zero-damage channel requires a projectile burst',
      });
  });
