import { it, expect } from 'vitest';
import { unifiedBodySample as s } from '../apps/game-client/src/unified-hero-policy.js';
import { heroPortraitUrl } from '../apps/game-client/src/hero-portraits.js';
const c = {
  tick: 106,
  startedAt: 100,
  until: 112,
  ability: 'ngu_doc_ta_hiep',
  basicStage: '',
  progress: 0.5,
};
it('keeps poisonous palm gestures, toggles and field casting on the same body', () => {
  for (const [ability, pose] of [
    ['ngu_doc_ta_hiep', 'palm_release'],
    ['ngu_doc_chuong', 'poison_charge'],
    ['doc_sa_chuong', 'pool_press'],
    ['am_ta_hap_hon_khi', 'aura_spread'],
    ['am_phong_thuc_cot', 'hands_up'],
  ] as const)
    expect(s('ngu_doc_ta_hiep', 'cast', 0, 0, { ...c, ability })?.pose).toBe(
      pose,
    );
  expect(
    s('ngu_doc_ta_hiep', 'cast', 0, 0, {
      ...c,
      tick: 111,
      ability: 'am_phong_thuc_cot',
    })?.pose,
  ).toBe('swarm_release');
});
it('keeps the staff through skull/worm/summon/mark/ritual actions', () => {
  for (const [ability, pose] of [
    ['ngu_doc_co_su', 'skull_release'],
    ['van_co_thuc_thien', 'worm_release'],
    ['yeu_co', 'summon_call'],
    ['tam_hinh_co', 'mark_point'],
    ['thi_quy_phong_tan', 'ritual_touch'],
  ] as const)
    expect(s('ngu_doc_co_su', 'cast', 0, 0, { ...c, ability })?.pose).toBe(
      pose,
    );
  expect(s('ngu_doc_co_su', 'death', 300, 0, c)?.pose).toBe('death_1');
  expect(s('ngu_doc_ta_hiep', 'stun', 0, 0, c)?.pose).toBe('hurt_1');
});
it('all fourteen branch portraits resolve to their own canonical body family', () => {
  for (const basic of [
    'cai_bang_chuong',
    'cai_bang_bong',
    'vo_dang_quyen',
    'vo_dang_kiem',
    'thien_son_phien',
    'thien_son_dao',
    'thieu_lam_quyen',
    'thieu_lam_dao',
    'con_luan_thien_su',
    'con_luan_kiem_ton',
    'duong_mon_co_quan',
    'duong_mon_am_khi',
    'ngu_doc_ta_hiep',
    'ngu_doc_co_su',
  ])
    expect(heroPortraitUrl(basic)).toBe(
      '/assets/' + basic.replaceAll('_', '-') + '-unified-v1/avatar.png',
    );
});
