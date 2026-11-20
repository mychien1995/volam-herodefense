import { describe, it, expect } from 'vitest';
import {
  heroPortraitUrl,
  heroBodyUrl,
} from '../apps/game-client/src/hero-portraits.js';
import { unifiedBodySample } from '../apps/game-client/src/unified-hero-policy.js';
const c = {
  tick: 105,
  startedAt: 100,
  until: 110,
  ability: 'cai_bang_bong',
  basicStage: 'thrust',
};
describe('coherent Bổng body preserves accepted choreography', () => {
  it('does not handle approved Chưởng or other schools', () => {
    expect(unifiedBodySample('cai_bang_chuong', 'idle', 0, 0)).toBeUndefined();
    expect(
      unifiedBodySample('unregistered_school', 'cast', 0, 0, c),
    ).toBeUndefined();
  });
  it('keeps four authored A beats distinct on the server clock', () => {
    for (const [serverStage, stage] of [
      ['thrust', 'thrust'],
      ['sweep', 'sweep'],
      ['lift', 'rising'],
      ['smash', 'overhead'],
    ] as const) {
      expect(
        unifiedBodySample('cai_bang_bong', 'action', 0, 0, {
          ...c,
          basicStage: serverStage,
        })?.pose,
      ).toBe(stage);
      expect(
        unifiedBodySample('cai_bang_bong', 'action', 0, 0, {
          ...c,
          basicStage: serverStage,
          tick: 109,
        })?.pose,
      ).toBe('recover');
    }
  });
  it('does not lose Phá Giáp raise/contact/recovery or the ultimate finisher', () => {
    for (const [phase, pose] of [
      ['raise', 'slam_raise'],
      ['strike', 'slam_contact'],
      ['recovery', 'recover'],
    ])
      expect(
        unifiedBodySample('cai_bang_bong', 'cast', 0, 0, {
          ...c,
          ability: 'pha_giap_bong',
          phase,
        })?.pose,
      ).toBe(pose);
    expect(
      unifiedBodySample('cai_bang_bong', 'cast', 0, 0, {
        ...c,
        ability: 'thien_ha_vo_cau',
        phase: 'bong_finisher_raise',
      })?.pose,
    ).toBe('finisher_raise');
    expect(
      unifiedBodySample('cai_bang_bong', 'cast', 0, 0, {
        ...c,
        ability: 'thien_ha_vo_cau',
        phase: 'ending',
      })?.pose,
    ).toBe('stomp');
  });
  it('uses actual authored hit/death cels and stable non-fading idle', () => {
    expect(unifiedBodySample('cai_bang_bong', 'death', 600, 600)?.pose).toBe(
      'death_1',
    );
    expect(unifiedBodySample('cai_bang_bong', 'stun', 500, 500)?.pose).toBe(
      'hurt_1',
    );
    expect(
      [0, 800, 1500, 2150].map(
        (t) => unifiedBodySample('cai_bang_bong', 'idle', t, t)?.pose,
      ),
    ).toEqual(['idle_0', 'idle_1', 'idle_2', 'idle_3']);
  });
});

it('uses the matching canonical portrait without changing another school', () => {
  expect(heroPortraitUrl('hero_cai_bang')).toBe(
    '/assets/cai-bang-bong-unified-v1/avatar.png',
  );
  expect(heroBodyUrl('cai_bang_bong')).toBe(
    '/assets/cai-bang-bong-unified-v1/avatar-body.png',
  );
  expect(heroPortraitUrl('hero_cai_bang_chuong')).toBe(
    '/assets/cai-bang-chuong-unified-v1/avatar.png',
  );
  expect(heroPortraitUrl('hero_thieu_lam_dao')).toBe(
    '/assets/thieu-lam-dao-unified-v1/avatar.png',
  );
});
it('samples the live spin phase beyond the short generic server pose clock', () => {
  for (const ability of ['hoanh_tao_bong', 'thien_ha_vo_cau']) {
    const turns = Array.from({ length: 8 }, (_, i) =>
      unifiedBodySample('cai_bang_bong', 'cast', 2000, 2000, {
        ...c,
        tick: 180,
        ability,
        phase: 'whirl',
        progress: i / 8,
      }),
    );
    expect(turns.map((s) => s?.turns)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(turns.every((s) => s?.pose === 'sweep')).toBe(true);
  }
});
