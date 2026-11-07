import type { CreepAttack } from '@volam/game-core';

/** Contact rasters are hit feedback, never a generic burst at the caster. */
export function creepBodyVisible(
  kind: string,
  slot: string,
  spec: CreepAttack,
): boolean {
  if (kind === 'creep_projectile') return true;
  if (kind !== 'creep_area') return false;
  return (
    slot === 'death' ||
    spec.suicide === true ||
    ((spec.duration ?? 1) > 1 && spec.pattern !== 'ring') ||
    ['purple_burst', 'drain', 'poison_pool', 'ground_pool'].includes(
      spec.presentation?.style ?? '',
    )
  );
}
