import { describe, it, expect } from 'vitest';
import { actionBodyPose } from '../apps/game-client/src/hero-finish-policy.js';
describe('diagonal action clock regression', () => {
  it('keeps fist impacts distinct from authored foot poses in both Shaolin stances', () => {
    const base = {
      tick: 105,
      startedAt: 100,
      until: 112,
      ability: 'thieu_lam_quyen',
      basicStage: 'right_fist',
    };
    expect(actionBodyPose(base, base.ability)).toBe('strike');
    expect(
      actionBodyPose({ ...base, basicStage: 'front_kick' }, base.ability),
    ).toBe('alternate');
    for (const ability of ['toan_phong_thoai', 'hoanh_tao_cuoc', 'vo_anh_cuoc'])
      expect(actionBodyPose({ ...base, ability }, base.ability)).toBe(
        'alternate',
      );
  });
  it('uses the existing presentation duration for an accepted instant manual attack without extending server lock', () => {
    const clock = {
      startedAt: 781,
      until: 781,
      visualDurationTicks: 9,
      ability: 'thieu_lam_quyen',
      basicStage: 'left_fist',
    };
    expect(
      [782, 785, 789].map((tick) =>
        actionBodyPose({ ...clock, tick }, clock.ability),
      ),
    ).toEqual(['windup', 'strike', 'recover']);
    expect(clock.until).toBe(781);
  });
  it('continues through anticipation, contact and recovery with legacy renderer phase labels', () => {
    for (const phase of [
      'travel',
      'staff-slam',
      'flurry',
      'ground-punch',
      'release',
    ]) {
      const base = {
        startedAt: 896,
        until: 908,
        ability: 'nhan_kiem_hop_nhat',
        basicStage: '',
        phase,
      };
      expect(
        [897, 901, 907].map((tick) =>
          actionBodyPose({ ...base, tick }, 'vo_dang_kiem'),
        ),
      ).toEqual(['charge', 'release', 'recover']);
    }
  });
  it('keeps the accepted basic beat and action boundaries through repeated state patches', () => {
    const base = {
      startedAt: 100,
      until: 112,
      ability: 'con_luan_thien_su',
      basicStage: 'sweep',
    };
    expect(actionBodyPose({ ...base, tick: 101 }, base.ability)).toBe('windup');
    expect(actionBodyPose({ ...base, tick: 105 }, base.ability)).toBe(
      'alternate',
    );
    expect(actionBodyPose({ ...base, tick: 105 }, base.ability)).toBe(
      'alternate',
    );
    expect(actionBodyPose({ ...base, tick: 112 }, base.ability)).toBe(
      'recover',
    );
  });
});
