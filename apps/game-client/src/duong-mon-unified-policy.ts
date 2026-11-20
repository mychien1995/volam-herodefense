import type {
  UnifiedHeroClock,
  UnifiedBodySample,
} from './unified-hero-policy.js';
/** Body only. Flight lift, private traps, projectiles and immunity stay in the existing owners. */
export function duongMonUnifiedSample(
  basic: string | undefined,
  pose: string,
  elapsed: number,
  now: number,
  c?: UnifiedHeroClock,
): UnifiedBodySample | undefined {
  if (basic !== 'duong_mon_co_quan' && basic !== 'duong_mon_am_khi') return;
  const cq = basic === 'duong_mon_co_quan',
    flight = cq && c?.statuses?.includes('duong_mon_flight'),
    shell = cq && c?.statuses?.includes('duong_mon_shell');
  const cel = (pose: string): UnifiedBodySample => ({ pose, turns: 0 }),
    age = c ? Math.max(0, c.tick - c.startedAt) : 0;
  if (pose === 'death') return cel(elapsed < 220 ? 'death_0' : 'death_1');
  if (pose === 'hurt' || pose === 'stun')
    return cel(
      shell
        ? 'shell_hurt'
        : flight
          ? 'flight_hurt'
          : 'hurt_' + (pose === 'stun' || elapsed >= 90 ? 1 : 0),
    );
  if (shell)
    return cel(age < 7 ? 'fold' : 'shell_' + (Math.floor(now / 700) % 2));
  const acting = ['action', 'cast', 'basic_attack'].includes(pose),
    ability = c?.ability;
  if (
    flight &&
    (!acting || ability === basic || ability === 'thiet_duc_hoanh_khong')
  )
    return cel(
      (pose === 'walk' || (ability === basic && acting)
        ? 'flight_'
        : 'hover_') +
        (Math.floor(now / 140) % 2),
    );
  if (pose === 'walk') return cel('walk_' + (Math.floor(now / 110) % 4));
  if (acting && c) {
    const p =
      c.progress ??
      Math.min(
        1,
        age / Math.max(1, c.visualDurationTicks || c.until - c.startedAt),
      );
    if (cq) {
      if (ability === 'man_thien_hoa_vu') return cel(age < 9 ? 'coil' : 'spin');
      if (ability === 'luu_tinh_truc_nguyet')
        return cel(age < 13 ? 'laser_charge' : 'laser_release');
      if (ability === 'thiet_duc_hoanh_khong')
        return cel(age < 7 ? 'wing_lower' : 'recover');
      if (ability === 'thien_co_thiet_duc') return cel('fold');
      return cel(p < 0.18 ? 'windup' : p > 0.9 ? 'recover' : 'release');
    }
    if (ability === 'dia_diem_hoa') return cel('trap');
    if (ability === 'cuu_cung_phi_tinh')
      return cel(Math.floor(age / 3) % 2 ? 'alternate' : 'release');
    if (ability === 'nhiep_hon_nguyet_anh') return cel('dash');
    if (ability === 'bao_vu_le_hoa_cham')
      return cel(
        age < 9
          ? 'ready'
          : age < 25
            ? 'spin'
            : age < 48
              ? 'alternate'
              : 'lunge',
      );
    if (ability === 'ngu_hanh_cach_the_thuat') return cel('channel');
    return cel(p < 0.18 ? 'windup' : p > 0.9 ? 'recover' : 'release');
  }
  const t = now % 2800;
  return cel(
    'idle_' + (t < 700 ? 0 : t < 1400 ? 1 : t < 2100 ? 2 : t < 2250 ? 3 : 0),
  );
}
