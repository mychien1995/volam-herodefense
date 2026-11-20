export interface ChuongBodyClock {
  tick: number;
  startedAt: number;
  until: number;
  ability: string;
  basicStage: string;
  visualDurationTicks?: number | undefined;
  phase?: string | undefined;
  progress?: number | undefined;
}
export function chuongBodyPose(
  pose: string,
  elapsedMs: number,
  nowMs: number,
  clock?: ChuongBodyClock,
): string {
  if (pose === 'death') return elapsedMs < 220 ? 'death_0' : 'death_1';
  if (pose === 'stun') return 'hurt_1';
  if (pose === 'hurt') return elapsedMs < 90 ? 'hurt_0' : 'hurt_1';
  if (pose === 'walk') return 'walk_' + (Math.floor(nowMs / 110) % 4);
  if (['action', 'cast', 'basic_attack'].includes(pose) && clock) {
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
    const basic = clock.ability === 'cai_bang_chuong';
    if (p < 0.22) return basic ? 'windup' : 'charge';
    if (p >= 0.79) return 'recover';
    if (basic)
      return /palm_[246]|double/.test(clock.basicStage)
        ? 'alternate'
        : 'strike';
    if (clock.ability === 'khang_long_huu_hoi') return 'channel';
    if (
      clock.ability === 'phi_long_tai_thien' ||
      clock.ability === 'hang_long_hoa_vu'
    )
      return 'rise';
    return 'release';
  }
  const phase = nowMs % 2800;
  return phase < 700
    ? 'idle_0'
    : phase < 1400
      ? 'idle_1'
      : phase < 2100
        ? 'idle_2'
        : phase < 2250
          ? 'idle_3'
          : 'idle_0';
}
