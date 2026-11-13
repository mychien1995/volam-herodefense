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
    'con_luan_chaos',
    'duong_mon_shell',
    'duong_mon_evade',
    'hp_regen_buff',
    'dash_lock',
  ]),
  blocksMovementSkills: z.boolean().optional(),
  durationTicks: count.min(1),
  magnitude: z.number().finite().nonnegative(),
  secondary: z.number().finite().nonnegative().optional(),
  evade: z.boolean().optional(),
  toggle: z.boolean().optional(),
});
const dash = z.strictObject({
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
});
const projectile = z.strictObject({
  explodeAtEnd: z.boolean().optional(),
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
  scatter: z
    .strictObject({
      count: count.min(1).max(20),
      appearanceTicks: count,
      delayTicks: count.min(1),
      innerRadius: positive,
      outerRadius: positive,
      radius: positive,
      damage: positive,
      attackPowerScale: z.number().min(0).max(1),
    })
    .refine(
      (effect) => effect.outerRadius > effect.innerRadius,
      'Invalid scatter radii',
    )
    .optional(),
  recoveryTicks: count.optional(),
  laneOffsets: z.array(z.number().finite()).min(1).max(8).optional(),
  comboEmpoweredRadius: positive.optional(),
  comboDash: dash.optional(),
  oncePerCast: z.boolean().optional(),
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
  forwardOnly: z.boolean().optional(),
  knockback: z.number().nonnegative().optional(),
  statuses: z.array(status).optional(),
  spreadAngle: z.number().finite().min(0).max(Math.PI).optional(),
  radial: z.boolean().optional(),
  attackPowerScale: z.number().finite().min(0).max(1).optional(),
  blinkWindowTicks: count.min(1).optional(),
  recallDrain: z
    .strictObject({
      intervalTicks: count.min(1),
      mana: positive,
      cooldownSeconds: count.min(1),
    })
    .optional(),
  boomerang: z.boolean().optional(),
  manaRefund: z.number().finite().nonnegative().optional(),
  slowedBonus: z.number().finite().nonnegative().optional(),
});
const area = z.strictObject({
  radiusY: positive.optional(),
  pentagon: z.boolean().optional(),
  occupantStatuses: z.array(status).optional(),
  passiveField: z.boolean().optional(),
  expandTicks: count.min(1).optional(),
  nearestRange: positive.optional(),
  forwardOffset: positive.optional(),
  stunOnOpenTicks: count.min(1).optional(),
  windupTicks: count.min(1).optional(),
  skyfall: z
    .strictObject({
      range: positive,
      fallbackDistance: positive,
      halfAngle: positive.max(Math.PI),
      blades: count.min(2).max(64),
      aimTicks: count.min(1),
      riseTicks: count.min(1),
      quietTicks: count.min(1),
      firstFallTicks: count.min(1),
      fallTicks: count.min(1),
    })
    .optional(),
  mode: z.literal('area'),
  durationTicks: count.min(1),
  tickInterval: count.min(1),
  radius: positive,
  damage: z.number().finite().nonnegative(),
  statuses: z.array(status).optional(),
  confines: z.boolean().optional(),
  ownerDamageReduction: z.number().finite().gt(0).max(0.85).optional(),
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
  lifesteal: z.number().min(0).max(1).optional(),
  projectileProc: z
    .strictObject({ chance: z.number().min(0).max(1), effect: projectile })
    .optional(),
  windupTicks: count.min(1).optional(),
  durationTicks: count.min(1).optional(),
  originOffset: z.number().finite().nonnegative().optional(),
  originStartOffset: z.number().finite().nonnegative().optional(),
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
    cooldownTicks: count,
    manaCost: z.number().nonnegative(),
    charges: count.min(2).max(8).optional(),
    manualChain: z
      .strictObject({
        idleTicks: count.min(1),
        cooldownTicks: count,
        finisherProjectile: projectile,
      })
      .optional(),
    minIntervalTicks: count.min(1).optional(),
    basicPoseTicks: count.min(1).optional(),
    basicDamageBonus: z.number().nonnegative().optional(),
    basicVariants: z
      .array(z.string().regex(/^[a-z_]+$/))
      .min(2)
      .max(8)
      .optional(),
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
        mode: z.literal('fortune'),
        durationTicks: count.min(1),
        cycleTicks: count.min(1),
        buffTicks: count.min(1),
        stunTicks: count.min(1),
        healFraction: positive.max(1),
        manaFraction: positive.max(1),
        hpRegen: positive,
        manaRegen: positive,
        damageMultiplier: positive.max(1),
        critMultiplier: positive.max(1),
        movementSpeed: positive.max(1),
        lossFraction: positive.max(1),
        blastDamage: positive,
        blastRadius: positive,
      }),
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
      dash,
      z.strictObject({
        mode: z.literal('multi_hit'),
        statuses: z.array(status).optional(),
        attackPowerScale: z.number().min(0).max(1).optional(),
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
        inwardBurst: z
          .strictObject({
            offsetX: positive,
            offsetY: positive,
            launchOffset: z.number().nonnegative(),
            bends: z.array(z.number().finite()).length(4),
            windupTicks: count,
            intervalTicks: positive,
          })
          .optional(),
        guard: z.number().finite().min(0).max(0.85).optional(),
        finisherHealFraction: positive.max(1).optional(),
        durationTicks: count.min(1).optional(),
      }),
    ]),
  })
  .superRefine((a, c) => {
    if (
      a.basicVariants &&
      (a.basicCombo || new Set(a.basicVariants).size !== a.basicVariants.length)
    )
      c.addIssue({
        code: 'custom',
        message: 'Basic variants must be distinct and independent of a combo',
      });
    if (a.charges && a.cooldownTicks === 0)
      c.addIssue({
        code: 'custom',
        message: 'Charged skills require a recharge interval',
      });
    if (a.effect.mode === 'area' && a.effect.skyfall) {
      const sky = a.effect.skyfall;
      if (
        sky.fallbackDistance > sky.range ||
        sky.aimTicks > sky.riseTicks ||
        sky.firstFallTicks >= sky.fallTicks ||
        a.effect.durationTicks <=
          sky.riseTicks + sky.quietTicks + sky.fallTicks ||
        a.effect.tickInterval < a.effect.durationTicks ||
        a.effect.windupTicks ||
        a.effect.followOwner ||
        a.effect.volley ||
        a.effect.confines
      )
        c.addIssue({
          code: 'custom',
          message: 'Skyfall requires one stationary, timed impact',
        });
    }
    if (
      a.effect.mode === 'projectile' &&
      a.effect.recallDrain &&
      (!a.effect.piercing ||
        a.effect.count !== 1 ||
        a.effect.boomerang ||
        a.effect.blinkWindowTicks)
    )
      c.addIssue({
        code: 'custom',
        message: 'Recall requires one independent piercing projectile',
      });
    if (a.effect.mode === 'multi_hit' && a.effect.inwardBurst) {
      const { offsetX, offsetY, launchOffset } = a.effect.inwardBurst;
      const crossing = Math.hypot(offsetX, offsetY) - launchOffset;
      if (
        !a.effect.projectileBurst ||
        crossing <= 0 ||
        a.effect.projectileBurst.range <= crossing
      )
        c.addIssue({
          code: 'custom',
          message: 'Inward projectiles must travel through the center',
        });
    }
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
      a.effect.ownerDamageReduction === undefined &&
      !a.effect.passiveField
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
