import { moveCircle } from './geometry.js';
import type {
  Actor,
  SimulationConfig,
  StatusKind,
  StatusSpec,
  World,
} from './types.js';

export function statusValue(
  actor: Actor,
  kind: StatusKind,
  tick: number,
): number {
  return Math.max(
    0,
    ...(actor.statuses ?? [])
      .filter((s) => s.kind === kind && s.until > tick)
      .map((s) => s.magnitude),
  );
}
export function hasStatus(
  actor: Actor,
  kind: StatusKind,
  tick: number,
): boolean {
  return (actor.statuses ?? []).some((s) => s.kind === kind && s.until > tick);
}
/** Strongest nonstacking magnitude; repeated same-source application refreshes, never adds. */
export function applyStatus(
  actor: Actor,
  spec: StatusSpec,
  sourceId: string,
  abilityId: string,
  tick: number,
): void {
  if (spec.kind === 'stun' && hasStatus(actor, 'interrupt_resist', tick))
    return;
  actor.statuses ??= [];
  const old = actor.statuses.find(
    (s) =>
      s.kind === spec.kind &&
      s.sourceId === sourceId &&
      s.abilityId === abilityId,
  );
  if (old) {
    Object.assign(old, spec);
    old.until = tick + spec.durationTicks;
  } else
    actor.statuses.push({
      ...spec,
      sourceId,
      abilityId,
      until: tick + spec.durationTicks,
    });
}
export function expireStatuses(world: World): void {
  for (const a of [...world.heroes.values(), ...world.creeps.values()])
    a.statuses = (a.statuses ?? []).filter(
      (s) => a.hp > 0 && s.until > world.tick,
    );
}
export function cancelOwnedEffects(world: World, id: string): void {
  const owner = world.heroes.get(id);
  if (owner) owner.basicChains = {};
  world.combos = (world.combos ?? []).filter(
    (c) => c.sourceId !== id && c.targetId !== id,
  );
  world.supports = (world.supports ?? []).filter((a) => a.ownerId !== id);
  world.actions = (world.actions ?? []).filter((a) => a.ownerId !== id);
  world.areas = (world.areas ?? []).filter((a) => a.ownerId !== id);
  world.shots = world.shots.filter((a) => a.ownerId !== id);
  for (const [key, p] of world.projectiles)
    if (p.ownerId === id) world.projectiles.delete(key);
  for (const a of [...world.heroes.values(), ...world.creeps.values()]) {
    if (a.id === id) a.statuses = [];
    else
      a.statuses = (a.statuses ?? []).filter(
        (s) =>
          !(
            s.sourceId === id &&
            ['defense_buff', 'damage_reduction', 'interrupt_resist'].includes(
              s.kind,
            )
          ),
      );
  }
}
/** Small swept steps keep pull/knockback/dash from tunnelling through terrain. */
export function displace(
  actor: Actor,
  dx: number,
  dy: number,
  radius: number,
  config: SimulationConfig,
  tick?: number,
): void {
  if (
    tick !== undefined &&
    (actor.forcedMovementImmune || hasStatus(actor, 'interrupt_resist', tick))
  )
    return;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 4));
  for (let i = 0; i < steps; i++)
    moveCircle(
      actor,
      { x: dx / steps, y: dy / steps },
      radius,
      config.width,
      config.height,
      config.collision,
    );
}
