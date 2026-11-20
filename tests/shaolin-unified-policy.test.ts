import { it, expect } from 'vitest';
import { unifiedBodySample as sample } from '../apps/game-client/src/unified-hero-policy.js';
const c = {
  tick: 106,
  startedAt: 100,
  until: 112,
  visualDurationTicks: 12,
  ability: 'thieu_lam_quyen',
  basicStage: '',
  progress: 0.5,
};
it('keeps all four accepted Shaolin basic contacts distinct', () => {
  for (const [stage, cel] of [
    ['left_fist', 'left_fist'],
    ['right_fist', 'right_fist'],
    ['front_kick', 'front_kick'],
    ['roundhouse_kick', 'roundhouse'],
  ] as const)
    expect(
      sample('thieu_lam_quyen', 'action', 0, 0, { ...c, basicStage: stage })
        ?.pose,
    ).toBe(cel);
});
it('retains Quyền and Cước choreography including actual flying finisher cue', () => {
  for (const [ability, cel] of [
    ['la_han_quyen', 'la_han'],
    ['vi_da_quyen', 'ground_punch'],
    ['toan_phong_thoai', 'spin_kick'],
    ['hoanh_tao_cuoc', 'stomp'],
    ['vo_anh_cuoc', 'kick_release'],
    ['kim_cang_bat_hoai', 'guard'],
  ] as const)
    expect(
      sample('thieu_lam_quyen', 'cast', 0, 0, { ...c, ability })?.pose,
    ).toBe(cel);
  expect(
    sample('thieu_lam_quyen', 'cast', 0, 0, {
      ...c,
      ability: 'vo_anh_cuoc',
      phase: 'fly_right',
    })?.pose,
  ).toBe('flying_kick');
  expect(
    sample('thieu_lam_quyen', 'cast', 0, 0, {
      ...c,
      ability: 'hoanh_tao_cuoc',
      phase: 'raise_down',
    })?.pose,
  ).toBe('front_kick');
  expect(
    sample('thieu_lam_quyen', 'cast', 0, 0, {
      ...c,
      ability: 'dai_luc_kim_cuong_chuong',
      tick: 105,
    })?.pose,
  ).toBe('palm_charge');
  expect(
    sample('thieu_lam_quyen', 'cast', 0, 0, {
      ...c,
      ability: 'dai_luc_kim_cuong_chuong',
      tick: 113,
    })?.pose,
  ).toBe('palm_release');
});
it('retains long Dao attack, roar and defensive body poses', () => {
  for (const [ability, cel] of [
    ['thieu_lam_dao', 'sweep'],
    ['tru_ta', 'release'],
    ['kim_quang_ho_tran', 'guard'],
    ['tam_gioi_quy_thien', 'roar'],
    ['bat_dong_minh_vuong', 'buddha'],
    ['nhu_lai_thien_diep', 'blade_raise'],
  ] as const)
    expect(sample('thieu_lam_dao', 'cast', 0, 0, { ...c, ability })?.pose).toBe(
      cel,
    );
});
it('reactions override casts; locomotion has four cel gait and four unequal idle timings', () => {
  for (const b of ['thieu_lam_quyen', 'thieu_lam_dao']) {
    expect(sample(b, 'hurt', 0, 0, c)?.pose).toBe('hurt_0');
    expect(sample(b, 'stun', 0, 0, c)?.pose).toBe('hurt_1');
    expect(sample(b, 'death', 300, 0, c)?.pose).toBe('death_1');
    expect(
      [0, 110, 220, 330].map((t) => sample(b, 'walk', 0, t, c)?.pose),
    ).toEqual(['walk_0', 'walk_1', 'walk_2', 'walk_3']);
    expect(
      [0, 700, 1400, 2100, 2250].map((t) => sample(b, 'idle', 0, t, c)?.pose),
    ).toEqual(['idle_0', 'idle_1', 'idle_2', 'idle_3', 'idle_0']);
  }
  expect(sample('unknown', 'idle', 0, 0, c)).toBeUndefined();
});
