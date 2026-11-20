import type {
  UnifiedHeroClock,
  UnifiedBodySample,
} from './unified-hero-policy.js';
export function nguDocUnifiedSample(
  basic: string | undefined,
  pose: string,
  elapsed: number,
  now: number,
  c?: UnifiedHeroClock,
): UnifiedBodySample | undefined {
  if (basic !== 'ngu_doc_ta_hiep' && basic !== 'ngu_doc_co_su') return;
  const cel = (pose: string): UnifiedBodySample => ({ pose, turns: 0 });
  if (pose === 'death') return cel(elapsed < 220 ? 'death_0' : 'death_1');
  if (pose === 'hurt' || pose === 'stun')
    return cel('hurt_' + (pose === 'stun' || elapsed >= 90 ? 1 : 0));
  if (pose === 'walk') return cel('walk_' + (Math.floor(now / 110) % 4));
  if (['action', 'cast', 'basic_attack'].includes(pose) && c) {
    const age = Math.max(0, c.tick - c.startedAt),
      p =
        c.progress ??
        Math.min(
          1,
          age / Math.max(1, c.visualDurationTicks || c.until - c.startedAt),
        );
    if (basic === 'ngu_doc_ta_hiep') {
      if (c.ability === basic)
        return cel(p < 0.18 ? 'windup' : p > 0.9 ? 'recover' : 'palm_release');
      const poses: Record<string, string> = {
        ngu_doc_chuong: 'poison_charge',
        doc_sa_chuong: 'pool_press',
        am_ta_hap_hon_khi: 'aura_spread',
        am_phong_thuc_cot: age < 9 ? 'hands_up' : 'swarm_release',
      };
      return cel(poses[c.ability] ?? 'channel');
    }
    if (c.ability === basic)
      return cel(
        p < 0.18 ? 'staff_windup' : p > 0.9 ? 'recover' : 'skull_release',
      );
    if (c.ability === 'van_co_thuc_thien') return cel('worm_release');
    if (c.ability === 'yeu_co')
      return cel(p < 0.3 ? 'summon_raise' : 'summon_call');
    if (c.ability === 'tam_hinh_co')
      return cel(p < 0.75 ? 'mark_point' : 'mark_return');
    if (c.ability === 'thi_quy_phong_tan')
      return cel(
        p < 0.22
          ? 'ritual_bend'
          : p < 0.5
            ? 'ritual_kneel'
            : p < 0.8
              ? 'ritual_touch'
              : 'ritual_rise',
      );
    return cel('channel');
  }
  const t = now % 2800;
  return cel(
    'idle_' + (t < 700 ? 0 : t < 1400 ? 1 : t < 2100 ? 2 : t < 2250 ? 3 : 0),
  );
}
