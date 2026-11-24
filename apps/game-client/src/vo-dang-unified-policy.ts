import type {
  UnifiedHeroClock,
  UnifiedBodySample,
} from './unified-hero-policy.js';
const taichi = [
  'charge',
  'taichi_open',
  'taichi_cross',
  'taichi_sweep',
  'taichi_hold',
  'recover',
];
const idle = (now: number) => {
  const t = now % 2800;
  return t < 700 ? 0 : t < 1400 ? 1 : t < 2100 ? 2 : t < 2250 ? 3 : 0;
};
/** Samples only body cels. Existing native presentation cues retain their server/event choreography. */
export function voDangUnifiedSample(
  basic: string | undefined,
  pose: string,
  elapsed: number,
  now: number,
  clock?: UnifiedHeroClock,
): UnifiedBodySample | undefined {
  if (basic !== 'vo_dang_quyen' && basic !== 'vo_dang_kiem') return undefined;
  const cel = (p: string) => ({ pose: p, turns: 0 });
  if (pose === 'death') return cel(elapsed < 220 ? 'death_0' : 'death_1');
  const away = basic === 'vo_dang_kiem' && clock?.weaponAway;
  if (pose === 'hurt' || pose === 'stun')
    return cel(
      (away ? 'hurt_away_' : 'hurt_') +
        (pose === 'stun' || elapsed >= 90 ? 1 : 0),
    );
  const walking = pose === 'walk' || (away && clock?.actorPose === 'walk');
  if (walking)
    return cel((away ? 'walk_away_' : 'walk_') + (Math.floor(now / 110) % 4));
  const age = clock ? Math.max(0, clock.tick - clock.startedAt) : 0;
  const acting = ['action', 'cast', 'basic_attack'].includes(pose);
  if (away) {
    if (acting && clock?.actorPose === 'basic_attack')
      return cel(
        age < 2
          ? 'windup_away'
          : age < 5
            ? 'release_away'
            : 'idle_away_' + idle(now),
      );
    if (acting && age < 12) return cel('release_away');
    return cel('idle_away_' + idle(now));
  }
  const cue = clock?.nativeBodyCue;
  if (basic === 'vo_dang_quyen') {
    if (cue?.startsWith('taichi_'))
      return cel(taichi[Number(cue.split('_').at(-1))] ?? 'recover');
    if (acting && clock) {
      if (clock.ability === basic) {
        const index = cue
          ? Number(cue.split('_').at(-1))
          : age < 2
            ? 0
            : age < 6
              ? clock.basicStage === 'right_palm'
                ? 2
                : 1
              : 3;
        return cel(
          index === 0
            ? 'windup'
            : index === 1
              ? 'palm_left'
              : index === 2
                ? 'palm_right'
                : 'recover',
        );
      }
      if (clock.ability === 'luong_nghi_thu')
        return cel(age < 5 ? 'charge' : age < 9 ? 'palm_release' : 'recover');
      if (clock.ability === 'huyen_am_chuong')
        return cel(
          age < 4
            ? 'charge'
            : age < 9
              ? 'taichi_hold'
              : age < 13
                ? 'palm_release'
                : 'recover',
        );
      if (clock.ability === 'duong_khi_kich') return cel('channel');
      if (clock.ability === 'thai_cuc_than_cong') return cel('guard');
      if (clock.ability === 'thai_cuc_tran')
        return cel(
          taichi[
            age < 4
              ? 0
              : age < 9
                ? 1
                : age < 14
                  ? 2
                  : age < 19
                    ? 3
                    : age < 24
                      ? 4
                      : 5
          ]!,
        );
    }
  } else {
    if (
      cue &&
      ['thrust', 'cut_left', 'cut_right', 'cut_down', 'cut_up', 'aim'].includes(
        cue,
      )
    )
      return cel(cue === 'aim' && clock?.ability === basic ? 'recover' : cue);
    if (acting && clock) {
      if (clock.ability === basic)
        return cel(
          age >= 4
            ? 'recover'
            : age < 1
              ? 'windup'
              : [
                    'thrust',
                    'cut_left',
                    'cut_right',
                    'cut_down',
                    'cut_up',
                  ].includes(clock.basicStage)
                ? clock.basicStage
                : 'thrust',
        );
      if (clock.ability === 'that_tinh_kiem')
        return cel(age < 4 ? 'charge' : age < 28 ? 'aim' : 'recover');
      if (clock.ability === 'van_kiem_quy_tong') return cel('aim');
      if (clock.ability === 'nhan_kiem_hop_nhat')
        return cel(age < 3 ? 'charge' : 'palm_release');
      if (clock.ability === 'bat_quai_kiem_tran')
        return cel(age < 4 ? 'charge' : 'sword_raise');
      if (clock.ability === 'toa_sat_bac_do') return cel('guard');
    }
  }
  if (acting) return cel('channel');
  return cel('idle_' + idle(now));
}
