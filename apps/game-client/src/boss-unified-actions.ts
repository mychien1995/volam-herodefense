export type BossActionPhases = readonly [string, string, string];
/** Presentation roles keyed by the encounter's existing ability IDs. */
export const bossActionPoses: Readonly<
  Record<string, Readonly<Record<string, BossActionPhases>>>
> = {
  dong_ta: {
    '': ['windup', 'slash', 'recover'],
    dan_chi_than_cong: ['finger_prepare', 'finger_release', 'recover'],
    lac_anh_kiem_phap: ['windup', 'flurry', 'recover'],
    lac_anh_normal: ['windup', 'slash', 'recover'],
    ta_kiem_lien_kich: ['windup', 'thrust', 'recover'],
    ngoc_tieu_hoi_phong: ['flute_raise', 'flute_play', 'flute_turn'],
    trieu_hon_dong_hai: ['summon_raise', 'summon_release', 'channel'],
  },
  tay_doc: {
    '': ['windup', 'attack_1', 'recover'],
    tay_doc_staff: ['windup', 'attack_2', 'recover'],
    tay_doc_gas: ['cast_0', 'cast_1', 'recover'],
    van_doc_phi_cham: ['cast_2', 'cast_3', 'recover'],
    doc_vu_me_hon: ['cast_0', 'cast_1', 'channel'],
    co_doc_khoan_tam: ['cast_2', 'cast_3', 'recover'],
    hon_thien_phuc_long_chan: ['cast_4', 'cast_5', 'cast_6'],
  },
  tay_doc_cap_mo: {
    '': ['windup', 'attack_1', 'recover'],
    doc_chuong: ['cast_0', 'cast_1', 'recover'],
    cap_mo_chan_kich: ['windup', 'attack_1', 'attack_2'],
    ngu_doc_than_chuong: ['cast_2', 'cast_3', 'recover'],
    van_doc_bao_phat: ['cast_4', 'cast_5', 'cast_6'],
  },
  nam_de: {
    '': ['windup', 'attack_1', 'recover'],
    nhat_duong_chi: ['windup', 'attack_1', 'recover'],
    lien_hoan_nhat_duong_chi: ['cast_0', 'cast_1', 'channel'],
    nam_de_small_finger: ['windup', 'attack_1', 'recover'],
    dai_ly_phong_huyet: ['cast_2', 'cast_3', 'recover'],
    nhat_duong_quy_tong: ['cast_4', 'cast_5', 'cast_6'],
    nam_de_palm: ['attack_2', 'attack_3', 'recover'],
    nam_de_aura: ['cast_6', 'cast_7', 'channel'],
    phat_quang_pho_chieu: ['cast_6', 'cast_7', 'channel'],
  },
  bac_cai: {
    '': ['windup', 'attack_1', 'recover'],
    spiral: ['windup', 'attack_2', 'recover'],
    palms: ['cast_0', 'cast_1', 'recover'],
    field: ['cast_2', 'cast_3', 'channel'],
    vortex: ['cast_4', 'cast_5', 'cast_6'],
    tether: ['cast_6', 'cast_7', 'channel'],
  },
};
