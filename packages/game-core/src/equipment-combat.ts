import { emit, hurt } from './combat.js';
import { distance, segmentRect } from './geometry.js';
import { perform } from './skills.js';
import {
  applyStatus,
  displace,
  hasStatus,
  movementSkillLocked,
} from './status.js';
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

export function useEquipmentSkill(
  world: World,
  hero: Hero,
  config: SimulationConfig,
): void {
  const inventory = hero.inventory;
  const branch = inventory?.crafted?.boots;
  const tuning = config.economy?.craftedCombat;
  if (
    !inventory ||
    !branch ||
    !tuning ||
    world.tick < (inventory.auxiliaryReadyAt ?? 0) ||
    hero.namDeLocked ||
    hasStatus(hero, 'stun', world.tick) ||
    (branch === 'blink' && movementSkillLocked(hero, world.tick)) ||
    hasStatus(hero, 'silence', world.tick) ||
    hasStatus(hero, 'dash', world.tick) ||
    world.actions?.some((action) => action.ownerId === hero.id)
  )
    return;
  if (branch === 'needle') {
    perform(
      world,
      hero,
      {
        id: 'gear_needle',
        nameVi: 'Phi châm',
        manaCost: 0,
        cooldownTicks: 0,
        effect: {
          mode: 'projectile',
          damage: tuning.needleDamage,
          range: tuning.needleRange,
          speed: tuning.needleSpeed,
          radius: 4,
          count: 1,
          spacingTicks: 0,
          splashRadius: 0,
          burnDamage: 0,
          burnTicks: 0,
          attackPowerScale: 0,
          useFacing: true,
          statuses: [
            {
              kind: 'slow',
              durationTicks: 2 * config.tickRate,
              magnitude: tuning.needleSlow,
            },
          ],
        },
      },
      config,
      'cast',
    );
  } else {
    if (branch === 'cleanse') {
      hero.statuses = (hero.statuses ?? []).filter(
        (status) => !['slow', 'poison', 'burn'].includes(status.kind),
      );
    } else if (branch === 'blink') {
      displace(
        hero,
        hero.fx * tuning.blinkRange,
        hero.fy * tuning.blinkRange,
        config.radius,
        config,
      );
    } else return;
    emit(world, {
      kind: 'effect',
      sourceId: hero.id,
      targetId: hero.id,
      abilityId: 'gear_' + branch,
      x: hero.x,
      y: hero.y,
      damage: 0,
      critical: false,
    });
  }
  inventory.auxiliaryReadyAt =
    world.tick + tuning.auxiliaryCooldownSeconds * config.tickRate;
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
    const poison = enemy.needlePoison;
    if (poison && world.tick > poison.until) delete enemy.needlePoison;
    else if (poison && world.tick >= poison.next) {
      poison.next += config.tickRate;
      if (world.heroes.get(poison.sourceId)?.hp)
        hurt(
          world,
          enemy,
          poison.sourceId,
          'gear_needle_poison',
          tuning.needlePoisonDamage,
          config,
          { critChance: 0, critMultiplier: 1, periodic: true },
        );
    }
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
