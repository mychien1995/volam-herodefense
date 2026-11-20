import type {
  UnifiedHeroClock,
  UnifiedBodySample,
} from './unified-hero-policy.js';
/** Samples body cels only; accepted action/phase clocks retain the original combat choreography. */
export function shaolinUnifiedSample(
  basic: string | undefined,
  pose: string,
  elapsed: number,
  now: number,
  clock?: UnifiedHeroClock,
): UnifiedBodySample | undefined {
  if (basic !== 'thieu_lam_quyen' && basic !== 'thieu_lam_dao') return;
  const cel = (pose: string): UnifiedBodySample => ({ pose, turns: 0 });
  if (pose === 'death') return cel(elapsed < 220 ? 'death_0' : 'death_1');
  if (pose === 'hurt' || pose === 'stun')
    return cel('hurt_' + (pose === 'stun' || elapsed >= 90 ? 1 : 0));
  if (pose === 'walk') return cel('walk_' + (Math.floor(now / 110) % 4));
  if (['action', 'cast', 'basic_attack'].includes(pose) && clock) {
    const age = Math.max(0, clock.tick - clock.startedAt),
      duration = Math.max(
        1,
        clock.visualDurationTicks || clock.until - clock.startedAt,
      );
    const p = clock.progress ?? Math.min(1, age / duration),
      phase = clock.phase ?? '',
      ability = clock.ability;
    if (basic === 'thieu_lam_quyen') {
      if (ability === basic) {
        const stage =
          ['roundhouse', 'front_kick', 'right_fist', 'left_fist'].find(
            (s) => clock.basicStage.includes(s) || phase.includes(s),
          ) ?? 'left_fist';
        return cel(p < 0.18 ? 'windup' : p > 0.88 ? 'recover' : stage);
      }
      if (ability === 'la_han_quyen') return cel(p < 0.2 ? 'windup' : 'la_han');
      if (ability === 'vi_da_quyen')
        return cel(p < 0.2 ? 'windup' : 'ground_punch');
      if (ability === 'dai_luc_kim_cuong_chuong')
        return cel(
          age < 12
            ? 'palm_charge'
            : clock.basicStage.includes('empower')
              ? 'palm_combo'
              : 'palm_release',
        );
      if (ability === 'toan_phong_thoai')
        return cel(p < 0.2 ? 'windup' : 'spin_kick');
      if (ability === 'hoanh_tao_cuoc')
        return cel(
          /anticipation|raise/.test(phase)
            ? 'front_kick'
            : /recovery/.test(phase)
              ? 'recover'
              : 'stomp',
        );
      if (ability === 'vo_anh_cuoc')
        return cel(
          phase.startsWith('fly') || clock.basicStage === 'empowered_dash'
            ? 'flying_kick'
            : 'kick_release',
        );
      if (ability === 'kim_cang_bat_hoai') return cel('guard');
      if (ability === 'nhu_lai_niet_ban')
        return cel(p < 0.3 ? 'channel' : p < 0.6 ? 'sky_raise' : 'sky_release');
      return cel('channel');
    }
    if (ability === basic)
      return cel(p < 0.2 ? 'windup' : p > 0.88 ? 'recover' : 'sweep');
    if (ability === 'tru_ta') return cel(p < 0.22 ? 'blade_raise' : 'release');
    if (ability === 'kim_quang_ho_tran') return cel('guard');
    if (ability === 'tam_gioi_quy_thien') return cel('roar');
    if (ability === 'bat_dong_minh_vuong') return cel('buddha');
    if (ability === 'nhu_lai_thien_diep')
      return cel(p < 0.25 ? 'channel' : p < 0.55 ? 'blade_raise' : 'release');
    return cel('channel');
  }
  const t = now % 2800;
  return cel(
    'idle_' + (t < 700 ? 0 : t < 1400 ? 1 : t < 2100 ? 2 : t < 2250 ? 3 : 0),
  );
}
