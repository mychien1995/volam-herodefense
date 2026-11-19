import type {
  UnifiedHeroClock,
  UnifiedBodySample,
} from './unified-hero-policy.js';
export function conLuanUnifiedSample(
  basic: string | undefined,
  pose: string,
  elapsed: number,
  now: number,
  c?: UnifiedHeroClock,
): UnifiedBodySample | undefined {
  if (basic !== 'con_luan_thien_su' && basic !== 'con_luan_kiem_ton') return;
  const monk = basic === 'con_luan_thien_su',
    chaos = monk && pose !== 'death' && c?.statuses?.includes('con_luan_chaos');
  const cel = (pose: string): UnifiedBodySample => ({
    pose: chaos && !pose.startsWith('chaos_') ? 'chaos_' + pose : pose,
    turns: 0,
    ...(chaos ? { bodyWidthScale: 1.34 } : {}),
  });
  if (pose === 'death') return cel(elapsed < 220 ? 'death_0' : 'death_1');
  if (pose === 'hurt' || pose === 'stun')
    return cel('hurt_' + (pose === 'stun' || elapsed >= 90 ? 1 : 0));
  if (pose === 'walk')
    return cel((chaos ? 'chaos_' : '') + 'walk_' + (Math.floor(now / 110) % 4));
  if (['action', 'cast', 'basic_attack'].includes(pose) && c) {
    const age = Math.max(0, c.tick - c.startedAt),
      p =
        c.progress ??
        Math.min(
          1,
          age / Math.max(1, c.visualDurationTicks || c.until - c.startedAt),
        );
    if (monk) {
      if (c.ability === basic) {
        const stage =
          ['thrust', 'sweep', 'rising', 'overhead'].find(
            (s) => c.basicStage === s,
          ) ?? 'thrust';
        return cel(p < 0.18 ? 'windup' : p > 0.9 ? 'recover' : stage);
      }
      if (c.ability === 'con_luan_thien_loi')
        return cel(p < 0.25 ? 'ranged_charge' : 'ranged_release');
      if (c.ability === 'cuong_loi_chan_dia')
        return cel(p < 0.3 ? 'windup' : 'overhead');
      if (c.ability === 'ngu_loi_chinh_phap_vong') return cel('ranged_release');
      if (c.ability === 'thien_loi_tran_nhac')
        return cel(
          p < 0.22 ? 'windup' : p < 0.8 ? 'hammer_throw' : 'hammer_return',
        );
      return cel(c.ability === 'ngu_loi_chinh_phap_the' ? 'guard' : 'channel');
    }
    const poses: Record<string, string> = {
      con_luan_kiem_ton: 'sword_point',
      kinh_loi: 'plant',
      loi_dong_thien_dia: 'detonate',
      dien_quang_loi_anh: 'dash',
      bao_loi_kiem_canh: 'fan',
      loi_long_thien_tuong: 'dragon',
      con_luan_kiem_tran: p < 0.35 ? 'star_raise' : 'star_hold',
    };
    return cel(poses[c.ability] ?? 'cast_hold');
  }
  const t = now % 2800;
  return cel(
    (chaos ? 'chaos_' : '') +
      'idle_' +
      (t < 700 ? 0 : t < 1400 ? 1 : t < 2100 ? 2 : t < 2250 ? 3 : 0),
  );
}
