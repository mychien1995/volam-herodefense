import { hurt } from './combat.js';
import { distance, segmentRect } from './geometry.js';
import { applyStatus } from './status.js';
import type { Ability, Hero, SimulationConfig, World } from './types.js';

export function withBasicEquipment(
  ability: Ability,
  hero: Hero,
  config: SimulationConfig,
): Ability {
  const tuning = config.economy?.craftedCombat;
  const branch = hero.inventory?.crafted?.weapon;
  if (!tuning || !branch) return ability;
  if (branch === 'penetration')
    return { ...ability, equipmentAttack: { penetration: tuning.penetration } };
  if (branch === 'lifesteal')
    return {
      ...ability,
      equipmentAttack: {
        lifesteal: { fraction: tuning.lifesteal, used: false },
      },
    };
  if (branch !== 'cleave') return ability;
  const effect = ability.effect;
  if (effect.mode === 'arc')
    return {
      ...ability,
      effect: {
        ...effect,
        range: effect.range * tuning.meleeRangeMultiplier,
        halfAngle: Math.min(Math.PI, effect.halfAngle + tuning.meleeAngleBonus),
        ...(effect.lineWidth === undefined
          ? {}
          : { lineWidth: effect.lineWidth * tuning.meleeRangeMultiplier }),
      },
    };
  if (effect.mode === 'projectile')
    return {
      ...ability,
      equipmentAttack: {
        spread: { sideDamage: tuning.sideShotDamage, hitTargets: new Set() },
      },
      effect: {
        ...effect,
        count: 3,
        spacingTicks: 0,
        spreadAngle: tuning.spreadRadians,
      },
    };
  return ability;
}

export function stepEquipmentCombat(
  world: World,
  config: SimulationConfig,
): void {
  const tuning = config.economy?.craftedCombat;
  if (!tuning) return;
  const auraPulse = world.tick % config.tickRate === 0;
  const wearers = auraPulse
    ? [...world.heroes.values()].filter(
        (hero) =>
          hero.hp > 0 &&
          ['slow_aura', 'burn_aura'].includes(
            hero.inventory?.crafted?.armor ?? '',
          ),
      )
    : [];
  for (const enemy of world.creeps.values()) {
    if (enemy.hp <= 0) continue;
    if (!wearers.length || enemy.hp <= 0 || enemy.invulnerable) continue;
    let burner: Hero | undefined;
    for (const wearer of wearers) {
      if (
        distance(enemy, wearer) > tuning.auraRadius ||
        config.collision.some(
          (wall) => segmentRect(wearer, enemy, wall) !== undefined,
        )
      )
        continue;
      if (wearer.inventory?.crafted?.armor === 'slow_aura')
        applyStatus(
          enemy,
          {
            kind: 'slow',
            magnitude: tuning.auraSlow,
            durationTicks: config.tickRate + 1,
          },
          wearer.id,
          'gear_slow_aura',
          world.tick,
        );
      else if (!burner || wearer.id < burner.id) burner = wearer;
    }
    if (burner)
      hurt(
        world,
        enemy,
        burner.id,
        'gear_burn_aura',
        tuning.auraDamage,
        config,
        { critChance: 0, critMultiplier: 1, periodic: true },
      );
  }
}
