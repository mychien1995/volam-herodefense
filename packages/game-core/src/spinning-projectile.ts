import { hurt } from './combat.js';
import { blocked, direction, distance, segmentRect } from './geometry.js';
import { applyStatus } from './status.js';
import type { Hero, Projectile, SimulationConfig, World } from './types.js';

export function recallSpinningProjectile(shot: Projectile): void {
  shot.leg = 'return';
  shot.stage = 'fan_return';
}

export function stepSpinningProjectile(
  world: World,
  shot: Projectile,
  config: SimulationConfig,
): void {
  const owner = world.heroes.get(shot.ownerId);
  if (!owner || owner.hp <= 0) {
    world.projectiles.delete(shot.id);
    return;
  }
  const drain = shot.effect.recallDrain!;
  if (shot.leg === 'return') {
    const reach = distance(shot, owner);
    const stride = shot.effect.speed / config.tickRate;
    if (reach <= config.radius + stride) {
      finishRecall(world, shot, owner, config);
      return;
    }
    const aim = direction(owner.x - shot.x, owner.y - shot.y);
    shot.vx = aim.x * shot.effect.speed;
    shot.vy = aim.y * shot.effect.speed;
    shot.x += aim.x * stride;
    shot.y += aim.y * stride;
  } else if (shot.remaining > 0) {
    const stride = Math.min(
      shot.remaining,
      shot.effect.speed / config.tickRate,
    );
    const aim = direction(shot.vx, shot.vy);
    const end = { x: shot.x + aim.x * stride, y: shot.y + aim.y * stride };
    const wall = config.collision.reduce(
      (closest, rect) =>
        Math.min(
          closest,
          segmentRect(shot, end, rect, shot.effect.radius) ?? Infinity,
        ),
      Infinity,
    );
    const fraction = wall === Infinity ? 1 : Math.max(0, wall - 0.01);
    const next = {
      x: shot.x + aim.x * stride * fraction,
      y: shot.y + aim.y * stride * fraction,
    };
    const inBounds = !blocked(
      next,
      shot.effect.radius,
      config.width,
      config.height,
      [],
    );
    if (inBounds) {
      shot.x = next.x;
      shot.y = next.y;
    }
    shot.remaining =
      wall === Infinity && inBounds ? shot.remaining - stride : 0;
    if (shot.remaining <= 0) {
      shot.vx = shot.vy = 0;
      shot.stage = 'fan_hold';
    }
  }
  if (world.tick < (shot.nextDrainTick ?? 0)) return;
  shot.nextDrainTick = world.tick + drain.intervalTicks;
  if (owner.mana < drain.mana) {
    recallSpinningProjectile(shot);
    return;
  }
  owner.mana -= drain.mana;
  for (const target of world.creeps.values()) {
    if (
      target.hp <= 0 ||
      distance(shot, target) >
        shot.effect.radius + (target.stats ?? config.creep).radius ||
      config.collision.some(
        (wall) => segmentRect(shot, target, wall) !== undefined,
      )
    )
      continue;
    if (
      hurt(world, target, owner.id, shot.abilityId, shot.rawDamage, config, {
        critChance: shot.critChance ?? 0,
        critMultiplier: shot.critMultiplier ?? config.critMultiplier,
        periodic: true,
      }) &&
      target.hp > 0
    )
      for (const status of shot.effect.statuses ?? [])
        applyStatus(target, status, owner.id, shot.abilityId, world.tick);
  }
}

function finishRecall(
  world: World,
  shot: Projectile,
  hero: Hero,
  config: SimulationConfig,
): void {
  world.projectiles.delete(shot.id);
  const readyAt =
    world.tick + shot.effect.recallDrain!.cooldownSeconds * config.tickRate;
  (hero.abilityCooldowns ??= {})[shot.abilityId] = readyAt;
  hero.skillCooldowns = hero.skillCooldowns.map((old, slot) =>
    (hero.skillIds?.[slot] ?? config.skills[slot]?.id) === shot.abilityId
      ? readyAt
      : old,
  );
}
