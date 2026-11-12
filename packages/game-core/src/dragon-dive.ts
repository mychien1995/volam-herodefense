import { opponents, targetRadius } from './opponents.js';
import { distance, segmentRect, direction } from './geometry.js';
import { emit, hurt } from './combat.js';
import { applyStatus } from './status.js';
import type {
  Point,
  Projectile,
  ProjectileEffect,
  SimulationConfig,
  World,
} from './types.js';
export type DragonDiveDefinition = {
  forwardTicks: number;
  orbitTicks: number;
  riseTicks: number;
  diveTicks: number;
  loopRadius: number;
  impactRadius: number;
  height: number;
  coilTurns?: number | undefined;
  coilDamageScale?: number | undefined;
};
export const dragonDiveDuration = (d: DragonDiveDefinition) =>
  d.forwardTicks + d.orbitTicks + d.riseTicks + d.diveTicks;
/** Initial server-owned ground anchor. A self-centered dive follows its caster. */
export function dragonDiveTarget(
  w: World,
  origin: Point,
  fx: number,
  fy: number,
  e: ProjectileEffect,
  c: SimulationConfig,
): Point {
  if (e.dragonDive!.forwardTicks === 0) return { x: origin.x, y: origin.y };
  const target = [...w.creeps.values()]
    .filter(
      (t) =>
        t.hp > 0 &&
        distance(origin, t) <= e.range &&
        (t.x - origin.x) * fx + (t.y - origin.y) * fy >= 0 &&
        !c.collision.some((r) => segmentRect(origin, t, r) !== undefined),
    )
    .sort(
      (a, b) =>
        distance(origin, a) - distance(origin, b) ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    )[0];
  const margin =
    Math.max(e.dragonDive!.loopRadius, e.dragonDive!.impactRadius) + 1;
  return {
    x: Math.max(
      margin,
      Math.min(c.width - margin, target?.x ?? origin.x + fx * e.range),
    ),
    y: Math.max(
      margin,
      Math.min(c.height - margin, target?.y ?? origin.y + fy * e.range),
    ),
  };
}
/** Shared deterministic geometry; rendering adds no targeting or damage decisions. */
export function dragonDivePose(
  origin: Point,
  target: Point,
  fx: number,
  fy: number,
  age: number,
  d: DragonDiveDefinition,
) {
  let stage = 'dragon_forward',
    x = origin.x,
    y = origin.y,
    height = 0,
    dx = fx,
    dy = fy;
  const entry = d.forwardTicks > 0 ? target : origin;
  if (age < d.forwardTicks) {
    const t = Math.max(0, age) / d.forwardTicks;
    x = origin.x + (entry.x - origin.x) * t;
    y = origin.y + (entry.y - origin.y) * t;
    const v = direction(entry.x - origin.x, entry.y - origin.y);
    dx = v.x;
    dy = v.y;
  } else if (age < d.forwardTicks + d.orbitTicks) {
    stage = 'dragon_coil';
    x = entry.x;
    y = entry.y;
    dx = d.forwardTicks === 0 ? fx : 0;
    dy = d.forwardTicks === 0 ? fy : 0;
  } else if (age < d.forwardTicks + d.orbitTicks + d.riseTicks) {
    stage = 'dragon_rise';
    const t = (age - d.forwardTicks - d.orbitTicks) / d.riseTicks;
    x = entry.x + (target.x - entry.x) * t;
    y = entry.y + (target.y - entry.y) * t;
    height = d.height * t;
    dx = fx * 0.15;
    dy = -1;
  } else {
    stage = 'dragon_dive';
    const t = Math.min(
      1,
      (age - d.forwardTicks - d.orbitTicks - d.riseTicks) / d.diveTicks,
    );
    x = target.x;
    y = target.y;
    height = d.height * (1 - t);
    dx = d.forwardTicks === 0 ? fx * 0.15 : 0;
    dy = 1;
  }
  return { x, y, height, dx, dy, stage };
}
function hitDragonArea(
  world: World,
  shot: Projectile,
  config: SimulationConfig,
  center: Point,
  radius: number,
  damageScale: number,
  landing: boolean,
): void {
  const { fx, fy } = shot.dragonFlight!;
  for (const enemy of opponents(world, shot.ownerId)) {
    if (
      enemy.hp <= 0 ||
      distance(enemy, center) > radius + targetRadius(world, enemy, config) ||
      config.collision.some(
        (wall) => segmentRect(center, enemy, wall) !== undefined,
      )
    )
      continue;
    const hit = hurt(
      world,
      enemy,
      shot.ownerId,
      shot.abilityId,
      shot.rawDamage * damageScale,
      config,
      {
        critChance: shot.critChance ?? 0,
        critMultiplier: shot.critMultiplier ?? config.critMultiplier,
        fx,
        fy,
      },
    );
    if (landing && hit && enemy.hp > 0)
      for (const status of shot.effect.statuses ?? [])
        applyStatus(enemy, status, shot.ownerId, shot.abilityId, world.tick);
  }
}
export function advanceDragonDive(
  w: World,
  p: Projectile,
  c: SimulationConfig,
) {
  const d = p.effect.dragonDive!,
    flight = p.dragonFlight!;
  const age = w.tick - p.spawnedAt!;
  const owner = w.heroes.get(p.ownerId);
  if (!owner || owner.hp <= 0) {
    w.projectiles.delete(p.id);
    return;
  }
  if (d.forwardTicks === 0) {
    const center = { x: owner.x, y: owner.y };
    flight.origin = center;
    flight.target = center;
  }
  const pose = dragonDivePose(
    flight.origin,
    flight.target,
    flight.fx,
    flight.fy,
    age,
    d,
  );
  Object.assign(p, {
    x: pose.x,
    y: pose.y,
    vx: pose.dx * p.effect.speed,
    vy: pose.dy * p.effect.speed,
    stage: pose.stage,
  });
  if (age < dragonDiveDuration(d)) {
    if (
      d.coilDamageScale &&
      age === d.forwardTicks + Math.floor(d.orbitTicks / 2)
    )
      hitDragonArea(w, p, c, pose, d.loopRadius, d.coilDamageScale, false);
    return;
  }
  emit(w, {
    kind: 'pulse',
    sourceId: p.ownerId,
    targetId: '',
    abilityId: p.abilityId,
    x: flight.target.x,
    y: flight.target.y,
    fx: flight.fx,
    fy: flight.fy,
    radius: d.impactRadius,
    stage: 'dragon_impact',
    damage: 0,
    critical: false,
  });
  hitDragonArea(w, p, c, flight.target, d.impactRadius, 1, true);
  w.projectiles.delete(p.id);
}
