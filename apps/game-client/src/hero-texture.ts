const artQuery = new URLSearchParams(location.search);
const reviewDao =
  artQuery.has('debug') && artQuery.get('thienSonWeapon') === 'dao';
const reviewKiem =
  artQuery.has('debug') && artQuery.get('voDangWeapon') === 'kiem';
const reviewThieuLamDao =
  artQuery.has('debug') && artQuery.get('thieuLamWeapon') === 'dao';
export function heroTexture(
  basicId?: string,
  schoolId?: string,
):
  | 'hero_cai_bang'
  | 'hero_cai_bang_chuong'
  | 'hero_thien_son'
  | 'hero_thien_son_dao'
  | 'hero_vo_dang'
  | 'hero_vo_dang_kiem'
  | 'hero_thieu_lam'
  | 'hero_thieu_lam_dao'
  | 'hero_con_luan_thien_su'
  | 'hero_con_luan_kiem_ton'
  | 'duong-mon-tuan-sa-walk'
  | 'duong-mon-da-hanh-walk' {
  if (schoolId === 'duong_mon' || basicId?.startsWith('duong_mon_'))
    return basicId === 'duong_mon_am_khi'
      ? 'duong-mon-da-hanh-walk'
      : 'duong-mon-tuan-sa-walk';
  if (schoolId === 'con_luan' || basicId?.startsWith('con_luan_'))
    return basicId === 'con_luan_kiem_ton'
      ? 'hero_con_luan_kiem_ton'
      : 'hero_con_luan_thien_su';
  if (schoolId === 'thieu_lam' || basicId?.startsWith('thieu_lam_'))
    return basicId === 'thieu_lam_dao' || reviewThieuLamDao
      ? 'hero_thieu_lam_dao'
      : 'hero_thieu_lam';
  if (schoolId === 'vo_dang' || basicId?.startsWith('vo_dang_'))
    return basicId === 'vo_dang_kiem' || reviewKiem
      ? 'hero_vo_dang_kiem'
      : 'hero_vo_dang';
  if (schoolId === 'thien_son' || basicId?.startsWith('thien_son_'))
    return basicId === 'thien_son_dao' || reviewDao
      ? 'hero_thien_son_dao'
      : 'hero_thien_son';
  return basicId === 'cai_bang_chuong'
    ? 'hero_cai_bang_chuong'
    : 'hero_cai_bang';
}
