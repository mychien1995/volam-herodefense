import { it, expect } from 'vitest';
import { unifiedBodySample as s } from '../apps/game-client/src/unified-hero-policy.js';
const c = {
  tick: 106,
  startedAt: 100,
  until: 112,
  ability: 'con_luan_thien_su',
  basicStage: '',
  progress: 0.5,
};
it('retains each hammer beat and spell body on the accepted clock', () => {
  for (const stage of ['thrust', 'sweep', 'rising', 'overhead'])
    expect(
      s('con_luan_thien_su', 'action', 0, 0, { ...c, basicStage: stage })?.pose,
    ).toBe(stage);
  for (const [ability, pose] of [
    ['con_luan_thien_loi', 'ranged_release'],
    ['cuong_loi_chan_dia', 'overhead'],
    ['ngu_loi_chinh_phap_the', 'guard'],
    ['thien_loi_tran_nhac', 'hammer_throw'],
  ] as const)
    expect(s('con_luan_thien_su', 'cast', 0, 0, { ...c, ability })?.pose).toBe(
      pose,
    );
});
it('keeps the intentional Chaos growth with authored idle/walk and canonical reaction cels', () => {
  const a = { ...c, statuses: ['con_luan_chaos'] };
  expect(s('con_luan_thien_su', 'idle', 0, 0, a)).toEqual({
    pose: 'chaos_idle_0',
    turns: 0,
    bodyWidthScale: 1.34,
  });
  expect(s('con_luan_thien_su', 'walk', 0, 220, a)?.pose).toBe('chaos_walk_2');
  expect(s('con_luan_thien_su', 'hurt', 100, 0, a)).toEqual({
    pose: 'chaos_hurt_1',
    turns: 0,
    bodyWidthScale: 1.34,
  });
  expect(s('con_luan_thien_su', 'death', 300, 0, a)).toEqual({
    pose: 'death_1',
    turns: 0,
  });
});
it('keeps S plant / Q detonate and all sword spell gestures distinct without baking a second sword into the body', () => {
  for (const [ability, pose] of [
    ['con_luan_kiem_ton', 'sword_point'],
    ['kinh_loi', 'plant'],
    ['loi_dong_thien_dia', 'detonate'],
    ['dien_quang_loi_anh', 'dash'],
    ['bao_loi_kiem_canh', 'fan'],
    ['loi_long_thien_tuong', 'dragon'],
    ['con_luan_kiem_tran', 'star_hold'],
  ] as const)
    expect(s('con_luan_kiem_ton', 'cast', 0, 0, { ...c, ability })?.pose).toBe(
      pose,
    );
});
