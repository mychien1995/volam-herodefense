import { m1Config } from '@volam/game-data';
import type {
  UnifiedHeroClock,
  UnifiedBodySample,
} from './unified-hero-policy.js';
const idle = (now: number) => {
  const t = now % 2800;
  return t < 700 ? 0 : t < 1400 ? 1 : t < 2100 ? 2 : t < 2250 ? 3 : 0;
};
const swings = ['sweep_right', 'sweep_left', 'overhead'];
const fan = ['windup', 'fan_open', 'fan_throw', 'fan_catch'];
const spin = ['fan_sweep_left', 'spin_front', 'fan_sweep_right', 'spin_back'];
const slash = m1Config.skillCatalogue!['liet_phong_dao']!.effect;
const heavyWindup = slash.mode === 'arc' ? (slash.windupTicks ?? 18) : 18;
/** Body-only sample. Server clocks and retained native cues own action timing. */
export function thienSonUnifiedSample(
  basic: string | undefined,
  pose: string,
  elapsed: number,
  now: number,
  clock?: UnifiedHeroClock,
): UnifiedBodySample | undefined {
  if (basic !== 'thien_son_phien' && basic !== 'thien_son_dao') return;
  const cel = (p: string, turns = 0, cardinal = false) => ({
    pose: p,
    turns,
    cardinal,
  });
  if (pose === 'death') return cel(elapsed < 220 ? 'death_0' : 'death_1');
  if (pose === 'hurt' || pose === 'stun')
    return cel('hurt_' + (pose === 'stun' || elapsed >= 90 ? 1 : 0));
  if (pose === 'walk') return cel('walk_' + (Math.floor(now / 110) % 4));
  const age = clock ? Math.max(0, clock.tick - clock.startedAt) : 0;
  const acting = ['action', 'cast', 'basic_attack'].includes(pose);
  const cue = clock?.nativeBodyCue;
  if (basic === 'thien_son_phien') {
    // Native fan cels were driven by Sprite.anims; changing the final atlas resets that animator.
    // Sample its retained visual duration from the accepted server action, including recovery patches.
    const duration = Math.max(8, clock?.visualDurationTicks ?? 8);
    const spinFrame =
      clock?.progress !== undefined
        ? Math.max(0, Math.min(3, Math.floor(clock.progress * 4)))
        : Math.floor(((age % duration) * 4) / duration);
    if (clock?.ability === basic && (acting || age < duration))
      return cel(fan[Math.min(3, Math.floor((age * 4) / duration))]!);
    if (acting && clock) {
      if (clock.ability === 'lien_hoa_phien')
        return cel(age < 5 ? 'lotus_open' : 'lotus_hold');
      if (clock.ability === 'luc_duong_chuong')
        return cel(spin[spinFrame]!, spinFrame * 2);
      if (clock.ability === 'luu_phong_bo')
        return cel(age < 3 ? 'windup' : age < 7 ? 'fan_throw' : 'fan_catch');
      if (clock.ability === 'chiet_mai_thu')
        return cel(age < 4 ? 'palm_charge' : 'palm_release');
      if (clock.ability === 'bach_phien_phong_bao')
        return age < 6
          ? cel('storm_raise')
          : age < 12
            ? cel('storm_release')
            : cel(spin[spinFrame]!, spinFrame * 2);
    }
  } else {
    if (clock?.ability === 'liet_phong_dao' && acting) {
      const phase = clock.phase ?? '';
      return cel(
        phase.includes('recover')
          ? 'recover'
          : phase.includes('slash')
            ? 'slam_contact'
            : phase.includes('gather_hold')
              ? 'blade_raise'
              : phase.includes('gather')
                ? (clock.progress ?? 0) < 0.5
                  ? 'charge'
                  : 'blade_raise'
                : age < heavyWindup / 2
                  ? 'charge'
                  : age < heavyWindup
                    ? 'blade_raise'
                    : age < heavyWindup + 7
                      ? 'slam_contact'
                      : 'recover',
        0,
        true,
      );
    }
    if (cue?.startsWith('dao:')) {
      const n = Number(cue.split(':')[1]);
      if (clock?.ability === 'tam_lien_tram')
        return cel('cross_' + Math.max(0, Math.min(2, n - 13)));
      const row = Math.floor(n / 4),
        col = n % 4;
      return cel(
        col < 2
          ? 'windup'
          : col === 2
            ? (swings[row] ?? 'sweep_right')
            : 'recover',
      );
    }
    if (acting && clock) {
      if (clock.ability === basic) {
        const n = Number(clock.basicStage.at(-1));
        return cel(
          age < 4
            ? 'windup'
            : age < 7
              ? (swings[n] ?? 'sweep_right')
              : 'recover',
        );
      }
      if (clock.ability === 'tam_lien_tram')
        return cel('cross_' + Math.min(2, Math.floor(age / 5)));
      if (clock.ability === 'phi_anh_tram') return cel('dash_slash');
      if (clock.ability === 'truy_hon_dao')
        return cel(age < 3 ? 'cut_first' : 'cut_second');
      if (clock.ability === 'phong_anh_hoan_vi') return cel('retreat');
      if (clock.ability === 'bach_liet_thien_kich')
        return cel(
          age < 6
            ? 'ready'
            : age < 9
              ? 'windup'
              : Math.floor((age - 9) / 3) % 2
                ? 'follow'
                : 'flurry_sweep',
        );
    }
  }
  return cel(acting ? 'channel' : 'idle_' + idle(now));
}
