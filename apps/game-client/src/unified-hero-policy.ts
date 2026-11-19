import { thienSonUnifiedSample } from './thien-son-unified-policy.js';
import { voDangUnifiedSample } from './vo-dang-unified-policy.js';
import type { HeroActionClock } from './hero-finish-policy.js';
export interface UnifiedHeroClock extends HeroActionClock {
  phase?: string | undefined;
  actorPose?: string | undefined;
  weaponAway?: boolean | undefined;
  nativeBodyCue?: string | undefined;
  progress?: number | undefined;
}
export interface UnifiedBodySample {
  pose: string;
  turns: number;
  cardinal?: boolean;
}
/** Body-only sampling. Server commands, motion, damage and VFX stay in their existing owners. */
export function unifiedBodySample(
  basic: string | undefined,
  pose: string,
  elapsed: number,
  now: number,
  clock?: UnifiedHeroClock,
): UnifiedBodySample | undefined {
  const thienSon = thienSonUnifiedSample(basic, pose, elapsed, now, clock);
  if (thienSon) return thienSon;
  const voDang = voDangUnifiedSample(basic, pose, elapsed, now, clock);
  if (voDang) return voDang;
  if (basic !== 'cai_bang_bong') return undefined;
  const still = (name: string) => ({ pose: name, turns: 0 });
  if (pose === 'death') return still(elapsed < 220 ? 'death_0' : 'death_1');
  if (pose === 'stun') return still('hurt_1');
  if (pose === 'hurt') return still(elapsed < 90 ? 'hurt_0' : 'hurt_1');
  if (pose === 'walk') return still('walk_' + (Math.floor(now / 110) % 4));
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
    const phase = clock.phase ?? '';
    const ability = clock.ability;
    if (ability === basic) {
      const stage =
        clock.basicStage === 'lift'
          ? 'rising'
          : clock.basicStage === 'smash'
            ? 'overhead'
            : (['thrust', 'sweep', 'rising', 'overhead'].find(
                (s) => clock.basicStage === s || phase.includes('combo_' + s),
              ) ?? 'thrust');
      const body =
        p < 0.22
          ? stage === 'rising'
            ? 'windup'
            : stage + '_windup'
          : p >= 0.79
            ? 'recover'
            : stage;
      return { pose: body, turns: 0 };
    }
    if (ability === 'pha_giap_bong') {
      if (/raise|windup|anticipation/.test(phase))
        return { pose: 'slam_raise', turns: 0, cardinal: true };
      if (/strike|contact/.test(phase))
        return { pose: 'slam_contact', turns: 0, cardinal: true };
      if (/recover/.test(phase))
        return { pose: 'recover', turns: 0, cardinal: true };
      return {
        pose: p < 0.4 ? 'slam_raise' : p < 0.76 ? 'slam_contact' : 'recover',
        turns: 0,
        cardinal: true,
      };
    }
    if (ability === 'cam_long_cong')
      return still(p < 0.18 ? 'charge' : p < 0.84 ? 'pull' : 'recover');
    if (ability === 'truy_phong_bong') {
      if (/stomp|contact|ending|land/.test(phase)) return still('stomp');
      return still(p < 0.18 ? 'thrust_windup' : p < 0.82 ? 'thrust' : 'stomp');
    }
    if (ability === 'thien_ha_vo_cau') {
      if (phase === 'bong_finisher_raise') return still('finisher_raise');
      if (phase === 'ending') return still('stomp');
      if (phase === 'opening' || p < 0.12) return still('charge');
      return {
        pose: 'sweep',
        turns:
          Math.floor(
            (Number.isFinite(clock.progress) ? clock.progress! : p) * 8,
          ) % 8,
      };
    }
    if (ability === 'hoanh_tao_bong') {
      if (/ending|recover/.test(phase) || (!phase && p > 0.9))
        return still('recover');
      if (/opening|raise/.test(phase) || p < 0.12) return still('charge');
      return {
        pose: 'sweep',
        turns:
          Math.floor(
            (Number.isFinite(clock.progress) ? clock.progress! : p) * 8,
          ) % 8,
      };
    }
    return still(p < 0.22 ? 'charge' : p > 0.79 ? 'recover' : 'channel');
  }
  const t = now % 2800;
  return still(
    t < 700
      ? 'idle_0'
      : t < 1400
        ? 'idle_1'
        : t < 2100
          ? 'idle_2'
          : t < 2250
            ? 'idle_3'
            : 'idle_0',
  );
}
