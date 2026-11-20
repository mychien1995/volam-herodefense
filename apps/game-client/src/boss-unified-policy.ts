import { bossActionPoses } from './boss-unified-actions.js';
export type BossBodyClock = {
  elapsedMs?: number;
  beat?: 0 | 1 | 2;
  progress?: number;
  phase?: string;
};
/** Cổ Mộ names native animation clips rather than generic cast states. */
export function bossNativePose(id: string, pose: string): string {
  return id === 'ly_mac_sau' &&
    ['needle_cast', 'palm_channel', 'fast_sweep', 'summon_cast'].includes(pose)
    ? 'action'
    : pose;
}
/** Native transition releases the staff first, then retains frog form through death. */
export function tayDocBodyForm(
  phase: string,
  transitionAt: number,
  tick: number,
): 'tay_doc' | 'tay_doc_cap_mo' {
  return phase === 'phase2' ||
    (phase === 'dead' && transitionAt > 0) ||
    (phase === 'transition' && tick - transitionAt >= 18)
    ? 'tay_doc_cap_mo'
    : 'tay_doc';
}
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
  if (id === 'bac_cai' && /^(drink|sleep)_/.test(ability)) {
    const rest = ability.startsWith('drink_') ? 'drink' : 'sleep';
    return rest + '_' + Math.min(3, Math.floor(elapsed / 380));
  }
  if (pose === 'walk') return 'walk_' + (Math.floor(now / 110) % 4);
  if (['action', 'cast', 'basic_attack'].includes(pose)) {
    const beat =
      clock?.beat ??
      ((clock?.progress ?? 0.5) < 0.3
        ? 0
        : (clock?.progress ?? 0.5) < 0.72
          ? 1
          : 2);
    if (
      id === 'bac_cai' &&
      ability === 'vortex' &&
      (beat === 1 || clock?.phase === 'sustain')
    )
      return ['attack_2', 'attack_3', 'windup', 'attack_1'][
        Math.floor(elapsed / 110) % 4
      ];
    if (id === 'chu_ba_thong' && ability === 'spin')
      return ['cast_4', 'cast_5', 'attack_2', 'step'][
        Math.floor(elapsed / 110) % 4
      ];
    return (actions[ability] ?? actions['']!)[beat];
  }
  const t = now % 2800;
  return (
    'idle_' + (t < 700 ? 0 : t < 1400 ? 1 : t < 2100 ? 2 : t < 2250 ? 3 : 0)
  );
}
