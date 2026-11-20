import { bossActionPoses } from './boss-unified-actions.js';
export type BossBodyClock = {
  elapsedMs?: number;
  beat?: 0 | 1 | 2;
  progress?: number;
  phase?: string;
};
/** Preserve a visible contact when rendering jumps from windup straight to recovery. */
export function bossContactBeat(
  clock: BossBodyClock | undefined,
  previous?: 0 | 1 | 2,
): 0 | 1 | 2 {
  const next =
    clock?.beat ??
    ((clock?.progress ?? 0.5) < 0.3
      ? 0
      : (clock?.progress ?? 0.5) < 0.72
        ? 1
        : 2);
  return previous === 0 && next === 2 ? 1 : next;
}
/** Body-only sampling; encounter clocks and effect owners are unchanged. */
export function bossBodyPose(
  id: string,
  pose: string,
  elapsed: number,
  now: number,
  ability: string,
  clock?: BossBodyClock,
): string | undefined {
  const actions = bossActionPoses[id];
  if (!actions) return;
  if (pose === 'death') return elapsed < 220 ? 'death_0' : 'death_1';
  if (pose === 'hurt' || pose === 'stun')
    return 'hurt_' + (pose === 'stun' || elapsed >= 90 ? 1 : 0);
  if (pose === 'walk') return 'walk_' + (Math.floor(now / 110) % 4);
  if (['action', 'cast', 'basic_attack'].includes(pose)) {
    const beat =
      clock?.beat ??
      ((clock?.progress ?? 0.5) < 0.3
        ? 0
        : (clock?.progress ?? 0.5) < 0.72
          ? 1
          : 2);
    return (actions[ability] ?? actions['']!)[beat];
  }
  const t = now % 2800;
  return (
    'idle_' + (t < 700 ? 0 : t < 1400 ? 1 : t < 2100 ? 2 : t < 2250 ? 3 : 0)
  );
}
