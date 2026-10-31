import type { ComboSpec, World } from './types.js';

/** A sequence belongs to one attacker, one target and one chain. Never to a slot. */
export function comboHit(
  world: World,
  sourceId: string,
  targetId: string,
  spec: ComboSpec,
): boolean {
  world.combos ??= [];
  const old = world.combos.find(
    (c) =>
      c.sourceId === sourceId &&
      c.targetId === targetId &&
      c.id === spec.id &&
      c.until > world.tick,
  );
  world.combos = world.combos.filter(
    (c) =>
      !(c.sourceId === sourceId && c.targetId === targetId && c.id === spec.id),
  );
  const valid = spec.step === 1 || old?.step === spec.step - 1;
  if (valid && spec.step < 3)
    world.combos.push({
      sourceId,
      targetId,
      id: spec.id,
      step: spec.step,
      until: world.tick + spec.windowTicks,
    });
  return valid && spec.step === 3;
}

export function expireCombos(world: World): void {
  world.combos = (world.combos ?? []).filter(
    (c) =>
      c.until > world.tick &&
      (world.heroes.get(c.sourceId)?.hp ?? 0) > 0 &&
      (world.creeps.get(c.targetId)?.hp ?? 0) > 0,
  );
}
