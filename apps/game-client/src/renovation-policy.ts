/** Explicit director reversions. Retained M3D sources remain immutable. */
export function renovationRevisionEnabled(
  search = typeof location === 'undefined' ? '' : location.search,
) {
  const q = new URLSearchParams(search);
  return (
    !['old', 'v2', 'v3', 'v4'].includes(q.get('renovationSkills') ?? '') &&
    q.get('runtimeArtReview') !== '1'
  );
}
export const restoredSkillArt = new Set([
  'thien_ha_vo_cau',
  'luong_nghi_thu',
  'tam_gioi_quy_thien',
]);
export function retainM3dBody(actor: string, ability: string) {
  if (!renovationRevisionEnabled()) return false;
  return (
    (ability !== 'luong_nghi_thu' && restoredSkillArt.has(ability)) ||
    [
      'chu_ba_thong',
      'toan_chan_disciple',
      'kim_luan',
      'hoac_do',
      'dat_nhi_ba',
    ].includes(actor) ||
    (actor === 'ly_mac_sau' && ability !== 'bang_phach_ngan_cham') ||
    (actor === 'hoan_nhan_hong_liet' &&
      ['hong_liet_a2', 'liet_diem_phong_toa'].includes(ability))
  );
}
export function retainM3dRaster(id: string) {
  if (!renovationRevisionEnabled()) return false;
  return (
    /^retained_m3d_|^chu_|^kl_|^co_mo_|^review3_r3_whisk_ring$/.test(id) ||
    /vo_cau|luong_nghi_thu_vfx|r3_lion_head|r3_roar_wave|tam_gioi_quy_thien_vfx/.test(
      id,
    ) ||
    id === 'review3_shaolin_a_fx'
  );
}
