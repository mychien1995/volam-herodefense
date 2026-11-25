import type { Pvp1v1Tuning } from '@volam/game-core';

/** Director-authorized 1v1 trial; the original PvE catalogue stays unchanged. */
export const pvp1v1Tuning: Pvp1v1Tuning = {
  damageMultiplier: 0.75,
  branchDamageMultipliers: { thieu_lam_quyen: 0.85 },
  control: {
    durationMultiplier: 0.65,
    stunRootMaxSeconds: 1.2,
    silenceDisarmMaxSeconds: 1.6,
  },
  abilities: {
    thieu_lam_quyen: { basicMinimumSeconds: 0.4 },
    vo_dang_quyen: { basicMinimumSeconds: 0.3 },
    vo_dang_kiem: { basicMinimumSeconds: 0.3 },
    kim_cang_bat_hoai: { maxSelfStatusSeconds: 3.5, cooldownSeconds: 12 },
    ngu_loi_chinh_phap_the: { reactiveBlockChanceMultiplier: 0.75 },
    vo_cuc_phong_loi_quyet: {
      selfStatusMagnitudeMultipliers: { con_luan_chaos: 0.8 },
    },
    nhan_kiem_hop_nhat: { projectileSpeed: 240 },
    that_tinh_kiem: { targetAreaRadius: 48 },
    kinh_loi: { cooldownSeconds: 3 },
    phi_anh_tram: { manaCostMultiplier: 0.9 },
    truy_hon_dao: { manaCostMultiplier: 0.9 },
    phong_anh_hoan_vi: { manaCostMultiplier: 0.9 },
    liet_phong_dao: { manaCostMultiplier: 0.9 },
    bach_liet_thien_kich: { manaCostMultiplier: 0.9 },
  },
};
