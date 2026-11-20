import { it, expect } from 'vitest';
import { unifiedBodySample as sample } from '../apps/game-client/src/unified-hero-policy.js';
const c = {
  tick: 100,
  startedAt: 100,
  until: 101,
  ability: 'thien_son_phien',
  basicStage: '',
  visualDurationTicks: 12,
};
it('finishes fan open/throw/catch from the accepted clock despite short idle patches', () => {
  expect(
    [0, 3, 6, 9].map(
      (age) =>
        sample('thien_son_phien', 'idle', 0, 0, { ...c, tick: 100 + age })
          ?.pose,
    ),
  ).toEqual(['windup', 'fan_open', 'fan_throw', 'fan_catch']);
  expect(
    sample('thien_son_phien', 'idle', 0, 0, { ...c, tick: 115 })?.pose,
  ).toBe('idle_0');
});
it('retains each Tam Lien basic contact from the native tick-driven controller', () => {
  for (const [row, p] of ['sweep_right', 'sweep_left', 'overhead'].entries())
    expect(
      sample('thien_son_dao', 'basic_attack', 0, 0, {
        ...c,
        ability: 'thien_son_dao',
        nativeBodyCue: 'dao:' + (row * 4 + 2),
      })?.pose,
    ).toBe(p);
  expect(
    [13, 14, 15].map(
      (n) =>
        sample('thien_son_dao', 'cast', 0, 0, {
          ...c,
          ability: 'tam_lien_tram',
          nativeBodyCue: 'dao:' + n,
        })?.pose,
    ),
  ).toEqual(['cross_0', 'cross_1', 'cross_2']);
});
it('keeps overhead hilt / contact / recovery on the retained heavy-slam clock', () => {
  expect(
    [
      'liet_phong_gather_hold_right',
      'liet_phong_slash_right',
      'liet_phong_recover_right',
    ].map(
      (phase) =>
        sample('thien_son_dao', 'cast', 0, 0, {
          ...c,
          ability: 'liet_phong_dao',
          phase,
        })?.pose,
    ),
  ).toEqual(['blade_raise', 'slam_contact', 'recover']);
  expect(
    sample('thien_son_dao', 'cast', 0, 0, {
      ...c,
      ability: 'liet_phong_dao',
      phase: 'liet_phong_slash_left',
    })?.cardinal,
  ).toBe(true);
});
it('retreat and the two cuts keep distinct body poses', () => {
  expect(
    sample('thien_son_dao', 'cast', 0, 0, {
      ...c,
      ability: 'phong_anh_hoan_vi',
    })?.pose,
  ).toBe('retreat');
  expect(
    [1, 4].map(
      (age) =>
        sample('thien_son_dao', 'cast', 0, 0, {
          ...c,
          tick: 100 + age,
          ability: 'truy_hon_dao',
        })?.pose,
    ),
  ).toEqual(['cut_first', 'cut_second']);
});
it('death/hurt/walk interrupt retained contact cues and idle requests no fade', () => {
  for (const basic of ['thien_son_phien', 'thien_son_dao']) {
    expect(sample(basic, 'death', 300, 0, c)?.pose).toBe('death_1');
    expect(sample(basic, 'hurt', 100, 0, c)?.pose).toBe('hurt_1');
    expect(sample(basic, 'walk', 0, 220, c)?.pose).toBe('walk_2');
    expect(
      [0, 800, 1600, 2150].map(
        (now) => sample(basic, 'idle', 0, now, { ...c, ability: '' })?.pose,
      ),
    ).toEqual(['idle_0', 'idle_1', 'idle_2', 'idle_3']);
  }
});

it('uses each canonical neutral body for the matching portrait', async () => {
  const { heroPortraitUrl, heroBodyUrl } =
    await import('../apps/game-client/src/hero-portraits.js');
  expect(heroPortraitUrl('hero_thien_son')).toBe(
    '/assets/thien-son-phien-unified-v1/avatar.png',
  );
  expect(heroBodyUrl('hero_thien_son_dao')).toBe(
    '/assets/thien-son-dao-unified-v2/avatar-body.png',
  );
});

it('retains the native visual-loop duration for authored fan spin facings', () => {
  expect(
    [0, 3, 6, 9].map(
      (age) =>
        sample('thien_son_phien', 'cast', 0, 0, {
          ...c,
          tick: 100 + age,
          ability: 'luc_duong_chuong',
        })?.turns,
    ),
  ).toEqual([0, 2, 4, 6]);
});
