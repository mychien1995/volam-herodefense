import { it, expect } from 'vitest';
import { unifiedBodySample as s } from '../apps/game-client/src/unified-hero-policy.js';
const c = {
  tick: 106,
  startedAt: 100,
  until: 112,
  ability: 'duong_mon_co_quan',
  basicStage: '',
  progress: 0.5,
};
it('keeps the same gear through flight, shell and their reaction poses without sprite scale changes', () => {
  const fly = { ...c, statuses: ['duong_mon_flight'] };
  expect(s('duong_mon_co_quan', 'idle', 0, 0, fly)?.pose).toBe('hover_0');
  expect(s('duong_mon_co_quan', 'walk', 0, 140, fly)?.pose).toBe('flight_1');
  expect(s('duong_mon_co_quan', 'hurt', 0, 0, fly)?.pose).toBe('flight_hurt');
  const shell = { ...c, tick: 110, statuses: ['duong_mon_shell'] };
  expect(s('duong_mon_co_quan', 'idle', 0, 0, shell)?.pose).toBe('shell_0');
  expect(s('duong_mon_co_quan', 'stun', 0, 0, shell)?.pose).toBe('shell_hurt');
  expect(s('duong_mon_co_quan', 'death', 300, 0, shell)?.pose).toBe('death_1');
});
it('retains laser windup and scatter spin bodies on the accepted clock', () => {
  expect(
    s('duong_mon_co_quan', 'cast', 0, 0, {
      ...c,
      ability: 'luu_tinh_truc_nguyet',
    })?.pose,
  ).toBe('laser_charge');
  expect(
    s('duong_mon_co_quan', 'cast', 0, 0, {
      ...c,
      tick: 114,
      ability: 'luu_tinh_truc_nguyet',
    })?.pose,
  ).toBe('laser_release');
  expect(
    s('duong_mon_co_quan', 'cast', 0, 0, {
      ...c,
      tick: 110,
      ability: 'man_thien_hoa_vu',
    })?.pose,
  ).toBe('spin');
});
it('keeps private trap/dash/knife/storm gestures and does not manufacture a passive R cast', () => {
  for (const [ability, pose] of [
    ['dia_diem_hoa', 'trap'],
    ['nhiep_hon_nguyet_anh', 'dash'],
    ['cuu_cung_phi_tinh', 'release'],
    ['bao_vu_le_hoa_cham', 'ready'],
  ] as const)
    expect(s('duong_mon_am_khi', 'cast', 0, 0, { ...c, ability })?.pose).toBe(
      pose,
    );
  expect(
    s('duong_mon_am_khi', 'idle', 0, 0, {
      ...c,
      ability: 'ngu_hanh_cach_the_thuat',
    })?.pose,
  ).toBe('idle_0');
});
