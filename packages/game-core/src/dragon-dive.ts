import { distance, segmentRect, direction } from './geometry.js';
import { emit, hurt } from './combat.js';
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
};
export const dragonDiveDuration = (d: DragonDiveDefinition) =>
  d.forwardTicks + d.orbitTicks + d.riseTicks + d.diveTicks;
/** Cast-time, server-owned point. The later orbit/dive never follows a moving target. */
export function dragonDiveTarget(
  w: World,
  origin: Point,
  fx: number,
  fy: number,
  e: ProjectileEffect,
  c: SimulationConfig,
): Point {
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
  const entry = {
    x: target.x + fx * d.loopRadius,
    y: target.y + fy * d.loopRadius,
  };
  if (age < d.forwardTicks) {
    const t = Math.max(0, age) / d.forwardTicks;
    x = origin.x + (entry.x - origin.x) * t;
    y = origin.y + (entry.y - origin.y) * t;
    const v = direction(entry.x - origin.x, entry.y - origin.y);
    dx = v.x;
    dy = v.y;
  } else if (age < d.forwardTicks + d.orbitTicks) {
    stage = 'dragon_orbit';
    const a = (Math.PI * 2 * (age - d.forwardTicks)) / d.orbitTicks,
      ca = Math.cos(a),
      sa = Math.sin(a);
    x = target.x + d.loopRadius * (fx * ca - fy * sa);
    y = target.y + d.loopRadius * (fy * ca + fx * sa);
    dx = -fx * sa - fy * ca;
    dy = -fy * sa + fx * ca;
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
    dx = 0;
    dy = 1;
  }
  return { x, y, height, dx, dy, stage };
}
export function advanceDragonDive(
  w: World,
  p: Projectile,
  c: SimulationConfig,
) {
  const d = p.effect.dragonDive!,
    flight = p.dragonFlight!;
  const age = w.tick - p.spawnedAt!;
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
  if (age < dragonDiveDuration(d)) return;
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
  for (const enemy of [...w.creeps.values()])
    if (
      enemy.hp > 0 &&
      distance(enemy, flight.target) <=
        d.impactRadius + (enemy.stats ?? c.creep).radius &&
      !c.collision.some(
        (r) => segmentRect(flight.target, enemy, r) !== undefined,
      )
    )
      hurt(w, enemy, p.ownerId, p.abilityId, p.rawDamage, c, {
        critChance: p.critChance ?? 0,
        critMultiplier: p.critMultiplier ?? c.critMultiplier,
        fx: flight.fx,
        fy: flight.fy,
      });
  w.projectiles.delete(p.id);
}
