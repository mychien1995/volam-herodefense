const forms: Record<string, string> = {
  hero_cai_bang: 'cai_bang_bong',
  hero_cai_bang_chuong: 'cai_bang_chuong',
  hero_thien_son: 'thien_son_phien',
  hero_thien_son_dao: 'thien_son_dao',
  hero_vo_dang: 'vo_dang_quyen',
  hero_vo_dang_kiem: 'vo_dang_kiem',
  hero_thieu_lam: 'thieu_lam_quyen',
  hero_thieu_lam_dao: 'thieu_lam_dao',
  hero_con_luan_thien_su: 'con_luan_thien_su',
  hero_con_luan_kiem_ton: 'con_luan_kiem_ton',
  'duong-mon-tuan-sa-walk': 'duong_mon_co_quan',
  'duong-mon-da-hanh-walk': 'duong_mon_am_khi',
  'ngu-doc-bich-co': 'ngu_doc_ta_hiep',
  'ngu-doc-am-linh': 'ngu_doc_co_su',
};
const defaults: Record<string, string> = {
  cai_bang: 'cai_bang_bong',
  thien_son: 'thien_son_phien',
  vo_dang: 'vo_dang_quyen',
  thieu_lam: 'thieu_lam_quyen',
  con_luan: 'con_luan_thien_su',
  duong_mon: 'duong_mon_co_quan',
  ngu_doc: 'ngu_doc_ta_hiep',
};
export const schoolHeroBasic = (school: string): string =>
  defaults[school] ?? defaults.cai_bang!;
const coherentFolders: Record<string, string> = {
  thien_son_phien: 'thien-son-phien-unified-v1',
  thien_son_dao: 'thien-son-dao-unified-v1',
  cai_bang_chuong: 'cai-bang-chuong-unified-v1',
  cai_bang_bong: 'cai-bang-bong-unified-v1',
  vo_dang_quyen: 'vo-dang-quyen-unified-v1',
  vo_dang_kiem: 'vo-dang-kiem-unified-v1',
};
export const heroBodyUrl = (form: string): string => {
  const basic = forms[form] ?? form,
    folder = coherentFolders[basic];
  return folder
    ? '/assets/' + folder + '/avatar-body.png'
    : '/assets/player-portraits-v1/' + basic + '-body.png';
};
export const heroPortraitUrl = (form: string): string => {
  const basic = forms[form] ?? form,
    folder = coherentFolders[basic];
  return folder
    ? '/assets/' + folder + '/avatar.png'
    : '/assets/player-portraits-v1/' + basic + '.png';
};
