import { it, expect } from 'vitest';
import {
  retainM3dBody,
  retainM3dRaster,
  renovationRevisionEnabled,
} from '../apps/game-client/src/renovation-policy.js';
it('keeps requested M3D cast bodies and preserves new idle/walk through the normal presenter', () => {
  for (const actor of ['chu_ba_thong', 'kim_luan', 'hoac_do', 'dat_nhi_ba'])
    expect(retainM3dBody(actor, 'test')).toBe(true);
  expect(retainM3dBody('ly_mac_sau', 'xich_luyen_chuong')).toBe(true);
  expect(retainM3dBody('ly_mac_sau', 'bang_phach_ngan_cham')).toBe(false);
  expect(retainM3dBody('hero_vo_dang', 'luong_nghi_thu')).toBe(false);
  expect(retainM3dBody('hero_cai_bang', 'thien_ha_vo_cau')).toBe(true);
  expect(retainM3dBody('hero_thieu_lam_dao', 'tam_gioi_quy_thien')).toBe(true);
});
it('restores only selected raster families, retaining unrelated spells', () => {
  for (const key of [
    'chu_dual',
    'kl_kim_luan_fx',
    'co_mo_purple',
    'review3_r3_lion_head',
    'review3_vo_cau_projectile',
    'retained_m3d_vo_dang_hands_v2_projectile',
  ])
    expect(retainM3dRaster(key)).toBe(true);
  for (const key of [
    'vo_dang_hands_v2_projectile',
    'hoa_van_chuong_vfx',
    'review3_tru_ta_vfx',
  ])
    expect(retainM3dRaster(key)).toBe(false);
});
it('keeps explicit historical comparison modes available', () => {
  for (const mode of ['old', 'v2', 'v3', 'v4'])
    expect(renovationRevisionEnabled('?renovationSkills=' + mode)).toBe(false);
  expect(renovationRevisionEnabled('?debug=1')).toBe(true);
  expect(renovationRevisionEnabled('?runtimeArtReview=1')).toBe(false);
});
