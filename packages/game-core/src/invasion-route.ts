import type { Actor, Creep } from './types.js';

/** Stay in the paired entry lanes until reaching the plaza; real aggro may divert. */
export function invasionApproach(
  enemy: Creep,
  target: Actor,
  chasing: boolean,
): Actor {
  const route = enemy.invasion?.approach;
  if (!route || chasing) return target;
  const lane = enemy.invasion!.lane;
  const passed =
    lane === 'west'
      ? enemy.x >= route.x - 8
      : lane === 'east'
        ? enemy.x <= route.x + 8
        : lane === 'north'
          ? enemy.y >= route.y - 8
          : enemy.y <= route.y + 8;
  if (passed) {
    delete enemy.invasion!.approach;
    return target;
  }
  return { ...target, ...route, id: target.id + ':entry' };
}
