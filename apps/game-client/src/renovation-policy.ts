/** Explicit director reversions. Retained M3D sources remain immutable. */
let cachedSearch: string | undefined;
let cachedPolicy: {
  actions: boolean;
  feedback: boolean;
  revision: boolean;
  followup: boolean;
};

function renovationPolicy(
  search = typeof location === 'undefined' ? '' : location.search,
) {
  if (cachedSearch !== search) {
    const query = new URLSearchParams(search);
    const mode = query.get('renovationSkills');
    const actions =
      query.get('runtimeArtReview') !== '1' && mode !== 'old' && mode !== 'v2';
    const feedback = actions && mode !== 'v3';
    const revision = feedback && mode !== 'v4';
    cachedPolicy = {
      actions,
      feedback,
      revision,
      followup: revision && mode !== 'v5',
    };
    cachedSearch = search;
  }
  return cachedPolicy;
}
export const renovationActionsEnabled = (search?: string) =>
  renovationPolicy(search).actions;
export const renovationFeedbackEnabled = (search?: string) =>
  renovationPolicy(search).feedback;
export const renovationRevisionEnabled = (search?: string) =>
  renovationPolicy(search).revision;
/** V6 is a presentation-only follow-up; keep the V5 comparison available. */
export const renovationFollowupEnabled = (search?: string) =>
  renovationPolicy(search).followup;

export const restoredSkillArt = new Set([
  'thien_ha_vo_cau',
  'luong_nghi_thu',
  'tam_gioi_quy_thien',
]);
export function followupRestoresBody(actor: string, ability: string) {
  return (
    [
      'dong_ta',
      'bac_cai',
      'bac_cai_black_dog',
      'vuong_trung_duong_p1',
      'vuong_trung_duong_p2',
    ].includes(actor) ||
    (actor === 'mai_sieu_phong' && ability === 'doc_cot_bao') ||
    (['tay_doc', 'tay_doc_cap_mo', 'tay_doc_snake'].includes(actor) &&
      ability !== 'van_doc_phi_cham') ||
    (actor === 'nam_de' &&
      !['nam_de_aura', 'phat_quang_pho_chieu'].includes(ability))
  );
}
export function retainM3dBody(actor: string, ability: string) {
  if (!renovationRevisionEnabled()) return false;
  return (
    (renovationFollowupEnabled() && followupRestoresBody(actor, ability)) ||
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
    (renovationFollowupEnabled() &&
      (/^(tay[:_]|nd_|bac_cai_|boss_bac_cai$|vtd[-_])/.test(id) ||
        /^wave_(feedback(?:_v02)?[:_])?(tay_doc|snake_bolt|poison_bolt|gold_bolt)/.test(
          id,
        ))) ||
    /^retained_m3d_|^chu_|^kl_|^co_mo_|^review3_r3_whisk_ring$/.test(id) ||
    /vo_cau|luong_nghi_thu_vfx|r3_lion_head|r3_roar_wave|tam_gioi_quy_thien_vfx/.test(
      id,
    ) ||
    id === 'review3_shaolin_a_fx'
  );
}
