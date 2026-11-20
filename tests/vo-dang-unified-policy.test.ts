import { it, expect } from 'vitest';
import { unifiedBodySample as sample } from '../apps/game-client/src/unified-hero-policy.js';
const clock = {
  tick: 105,
  startedAt: 100,
  until: 108,
  ability: 'vo_dang_quyen',
  basicStage: 'left_palm',
};
it('keeps the two real palm contacts and recovery', () => {
  expect(sample('vo_dang_quyen', 'basic_attack', 0, 0, clock)?.pose).toBe(
    'palm_left',
  );
  expect(
    sample('vo_dang_quyen', 'basic_attack', 0, 0, {
      ...clock,
      basicStage: 'right_palm',
    })?.pose,
  ).toBe('palm_right');
  expect(
    sample('vo_dang_quyen', 'basic_attack', 0, 0, { ...clock, tick: 107 })
      ?.pose,
  ).toBe('recover');
});
it('retains native taichi choreography through all six keyposes', () => {
  expect(
    [0, 1, 2, 3, 4, 5].map(
      (i) =>
        sample('vo_dang_quyen', 'cast', 0, 0, {
          ...clock,
          ability: 'thai_cuc_tran',
          nativeBodyCue: 'taichi_' + i,
        })?.pose,
    ),
  ).toEqual([
    'charge',
    'taichi_open',
    'taichi_cross',
    'taichi_sweep',
    'taichi_hold',
    'recover',
  ]);
});
it('retains a short-lived confirmed sword contact even between pose patches', () => {
  for (const p of ['thrust', 'cut_up', 'cut_down', 'cut_left', 'cut_right'])
    expect(
      sample('vo_dang_kiem', 'idle', 0, 0, {
        ...clock,
        ability: 'vo_dang_kiem',
        nativeBodyCue: p,
      })?.pose,
    ).toBe(p);
});
it('keeps seven-cut order on the existing six-tick rhythm', () => {
  expect(
    Array.from(
      { length: 7 },
      (_, i) =>
        sample('vo_dang_kiem', 'cast', 0, 0, {
          ...clock,
          ability: 'that_tinh_kiem',
          tick: 100 + i * 6,
        })?.pose,
    ),
  ).toEqual([
    'cut_up',
    'cut_down',
    'cut_right',
    'cut_down',
    'cut_up',
    'cut_left',
    'cut_right',
  ]);
});
it('retains the skyfall pointing pose and defensive guard', () => {
  expect(
    sample('vo_dang_kiem', 'cast', 0, 0, {
      ...clock,
      ability: 'van_kiem_quy_tong',
    })?.pose,
  ).toBe('aim');
  expect(
    sample('vo_dang_kiem', 'cast', 0, 0, {
      ...clock,
      ability: 'toa_sat_bac_do',
    })?.pose,
  ).toBe('guard');
});
it('does not put a held sword back during flight idle, movement, attacks or hurt', () => {
  const c = {
    ...clock,
    weaponAway: true,
    tick: 130,
    ability: 'nhan_kiem_hop_nhat',
    actorPose: 'idle',
  };
  expect(sample('vo_dang_kiem', 'action', 0, 800, c)?.pose).toBe('idle_away_1');
  expect(
    sample('vo_dang_kiem', 'action', 0, 220, { ...c, actorPose: 'walk' })?.pose,
  ).toBe('walk_away_2');
  expect(sample('vo_dang_kiem', 'hurt', 20, 0, c)?.pose).toBe('hurt_away_0');
  expect(
    sample('vo_dang_kiem', 'basic_attack', 0, 0, {
      ...c,
      actorPose: 'basic_attack',
      tick: 103,
    })?.pose,
  ).toBe('release_away');
});
it('death wins over transient weapon state; idle never requests alpha fading', () => {
  for (const b of ['vo_dang_quyen', 'vo_dang_kiem']) {
    expect(
      sample(b, 'death', 400, 0, { ...clock, weaponAway: true })?.pose,
    ).toBe('death_1');
    expect(
      [0, 800, 1600, 2150].map((t) => sample(b, 'idle', t, t)?.pose),
    ).toEqual(['idle_0', 'idle_1', 'idle_2', 'idle_3']);
  }
});

it('uses the same canonical neutral art for Wudang portraits', async () => {
  const { heroPortraitUrl, heroBodyUrl } =
    await import('../apps/game-client/src/hero-portraits.js');
  expect(heroPortraitUrl('hero_vo_dang')).toBe(
    '/assets/vo-dang-quyen-unified-v1/avatar.png',
  );
  expect(heroBodyUrl('hero_vo_dang_kiem')).toBe(
    '/assets/vo-dang-kiem-unified-v1/avatar-body.png',
  );
});
