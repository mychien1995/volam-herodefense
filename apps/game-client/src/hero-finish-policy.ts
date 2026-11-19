export type HeroActionClock = {
  tick: number;
  startedAt: number;
  until: number;
  ability: string;
  basicStage: string;
  visualDurationTicks?: number | undefined;
};
/** Body-only phase sampling; never starts a command or owns combat timing. */
export function actionBodyPose(clock: HeroActionClock, basic: string): string {
  const p = Math.max(
    0,
    Math.min(
      1,
      (clock.tick - clock.startedAt) /
        Math.max(
          1,
          clock.until > clock.startedAt
            ? clock.until - clock.startedAt
            : (clock.visualDurationTicks ?? 1),
        ),
    ),
  );
  if (p < 0.24) return clock.ability === basic ? 'windup' : 'charge';
  if (p >= 0.76) return 'recover';
  if (basic === 'thieu_lam_quyen') {
    if (clock.ability === basic)
      return clock.basicStage.includes('kick') ? 'alternate' : 'strike';
    if (
      ['toan_phong_thoai', 'hoanh_tao_cuoc', 'vo_anh_cuoc'].includes(
        clock.ability,
      )
    )
      return 'alternate';
  }
  if (clock.ability !== basic) return 'release';
  return /right|double|sweep|rising|kick|overhead|palm_2|palm_4|palm_6/.test(
    clock.basicStage,
  )
    ? 'alternate'
    : 'strike';
}
