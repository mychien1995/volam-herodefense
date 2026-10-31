import { blocked, distance, segmentRect } from './geometry.js';
import { hasStatus } from './status.js';
import type { Actor, Point, SimulationConfig, World } from './types.js';

function immune(actor: Actor, tick: number): boolean {
  return (
    !!actor.forcedMovementImmune || hasStatus(actor, 'interrupt_resist', tick)
  );
}

/** Entry is sampled every simulation tick, independently of the area's damage pulse. */
export function captureConfinement(
  world: World,
  config: SimulationConfig,
): void {
  for (const area of world.areas ?? []) {
    if (
      !area.effect.confines ||
      area.until <= world.tick ||
      (world.heroes.get(area.ownerId)?.hp ?? 0) <= 0
    )
      continue;
    area.trappedIds ??= [];
    for (const enemy of world.creeps.values()) {
      if (
        enemy.hp > 0 &&
        !immune(enemy, world.tick) &&
        distance(area, enemy) <= area.effect.radius &&
        !config.collision.some(
          (w) => segmentRect(area, enemy, w) !== undefined,
        ) &&
        !area.trappedIds.includes(enemy.id)
      )
        area.trappedIds.push(enemy.id);
    }
  }
}

/** Clip a movement segment at every enclosing boundary, preserving terrain collision.
 * Actors can still move, attack and cast inside. Overlaps never teleport an actor. */
export function confineMovement(
  world: World,
  actor: Actor,
  from: Point,
  config: SimulationConfig,
): void {
  if (immune(actor, world.tick)) return;
  const areas = (world.areas ?? []).filter(
    (a) =>
      a.effect.confines &&
      a.until > world.tick &&
      (world.heroes.get(a.ownerId)?.hp ?? 0) > 0 &&
      a.trappedIds?.includes(actor.id) &&
      distance(from, a) <= a.effect.radius + 0.001,
  );
  if (areas.every((a) => distance(actor, a) <= a.effect.radius)) return;
  const dx = actor.x - from.x,
    dy = actor.y - from.y;
  let lo = 0,
    hi = 1;
  for (let i = 0; i < 30; i++) {
    const t = (lo + hi) / 2;
    if (
      areas.every(
        (a) =>
          distance({ x: from.x + dx * t, y: from.y + dy * t }, a) <=
          a.effect.radius,
      )
    )
      lo = t;
    else hi = t;
  }
  actor.x = from.x + dx * lo;
  actor.y = from.y + dy * lo;
  const radius =
    world.creeps.get(actor.id)?.stats?.radius ?? config.creep.radius;
  if (blocked(actor, radius, config.width, config.height, config.collision)) {
    actor.x = from.x;
    actor.y = from.y;
  }
}
