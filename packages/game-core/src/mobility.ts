import { duongMon } from './duong-mon-ids.js';
import { blocked, direction, segmentRect, insideEllipse } from './geometry.js';
import { emit } from './combat.js';
import { hasStatus, movementSkillLocked } from './status.js';
import { perform } from './skills.js';
import { confineMovement } from './confinement.js';
import type { Hero, SimulationConfig, World } from './types.js';

export function dashCapacity(hero: Hero, config: SimulationConfig): number {
  const capacity = config.mobility?.charges ?? 0;
  return (
    capacity +
    (capacity && hero.basicId === duongMon.amKhi ? 2 : 0) +
    (capacity && hero.inventory?.crafted?.boots === 'haste' ? 2 : 0)
  );
}

/** Recharge debt is sequential and survives travel, death and build edits. */
export function rechargeDash(
  hero: Hero,
  tick: number,
  config: SimulationConfig,
): void {
  const tuning = config.mobility;
  if (!tuning) return;
  const capacity = dashCapacity(hero, config);
  hero.dashCharges ??= capacity;
  while (
    hero.dashCharges < capacity &&
    hero.dashRechargeAt !== undefined &&
    tick >= hero.dashRechargeAt
  ) {
    hero.dashCharges++;
    if (hero.dashCharges < capacity)
      hero.dashRechargeAt += tuning.rechargeTicks;
    else delete hero.dashRechargeAt;
  }
}
export function dash(world: World, hero: Hero, config: SimulationConfig): void {
  rechargeDash(hero, world.tick, config);
  const t = config.mobility;
  if (
    !t ||
    world.chu?.phase === 'reflect' ||
    !hero.dashCharges ||
    hasStatus(hero, 'dash_lock', world.tick) ||
    hasStatus(hero, 'root', world.tick) ||
    hasStatus(hero, 'stun', world.tick) ||
    (world.actions ?? []).some((a) => a.ownerId === hero.id)
  )
    return;
  hero.dashCharges--;
  hero.dashRechargeAt ??= world.tick + t.rechargeTicks;
  const heading = direction(hero.moveX, hero.moveY);
  if (heading.x || heading.y) {
    hero.fx = heading.x;
    hero.fy = heading.y;
  }
  perform(
    world,
    hero,
    {
      id: 'universal_dash',
      nameVi: 'Lướt',
      manaCost: 0,
      cooldownTicks: 1,
      effect: {
        mode: 'dash',
        distance: t.distance,
        speed: t.speed,
        radius: config.radius,
        damage: 0,
        stunTicks: 0,
      },
    },
    config,
    'cast',
    'dash',
  );
}
/** Recast has no second mana/cooldown cost. Never accept a client destination. */
export function blink(
  world: World,
  hero: Hero,
  abilityId: string,
  config: SimulationConfig,
): boolean {
  const shot = [...world.projectiles.values()].find(
    (p) =>
      p.ownerId === hero.id &&
      p.abilityId === abilityId &&
      p.effect.blinkWindowTicks &&
      (p.lingerUntil === undefined || world.tick < p.lingerUntil),
  );
  if (!shot) return false;
  if (movementSkillLocked(hero, world.tick)) return true;
  if (
    config.heroBounds &&
    !insideEllipse(shot, config.heroBounds, config.radius)
  )
    return true;
  if (
    blocked(
      shot,
      config.radius,
      config.width,
      config.height,
      config.collision,
    ) ||
    config.collision.some(
      (w) => segmentRect(hero, shot, w, config.radius) !== undefined,
    )
  )
    return true;
  const old = { x: hero.x, y: hero.y };
  hero.x = shot.x;
  hero.y = shot.y;
  confineMovement(world, hero, old, config);
  // A confinement boundary may clip the move: reject the blink rather than spending it.
  if (Math.hypot(hero.x - shot.x, hero.y - shot.y) > 0.01) {
    hero.x = old.x;
    hero.y = old.y;
    return true;
  }
  world.projectiles.delete(shot.id);
  emit(world, {
    kind: 'pulse',
    sourceId: hero.id,
    targetId: '',
    abilityId,
    x: old.x,
    y: old.y,
    fx: hero.fx,
    fy: hero.fy,
    stage: 'blink_depart',
    damage: 0,
    critical: false,
  });
  emit(world, {
    kind: 'pulse',
    sourceId: hero.id,
    targetId: '',
    abilityId,
    x: hero.x,
    y: hero.y,
    fx: hero.fx,
    fy: hero.fy,
    stage: 'blink_arrive',
    damage: 0,
    critical: false,
  });
  return true;
}
