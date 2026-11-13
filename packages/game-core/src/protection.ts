import { distance } from './geometry.js';
import type { Actor, World } from './types.js';

/** A planted owner-only field. Always query authoritative feet, including for DOT. */
export function ownerProtection(world: World, actor: Actor) {
  if (actor.hp <= 0) return undefined;
  return (world.areas ?? [])
    .filter(
      (a) =>
        a.ownerId === actor.id &&
        a.effect.ownerDamageReduction !== undefined &&
        a.until > world.tick &&
        distance(a, actor) <= a.effect.radius,
    )
    .sort(
      (a, b) =>
        (b.effect.ownerRegenFraction ?? 0) - (a.effect.ownerRegenFraction ?? 0),
    )[0];
}
