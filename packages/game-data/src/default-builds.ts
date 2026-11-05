import type { DefaultBranch, FixedBranch } from '@volam/game-core';
/** Canonical catalogue order, four regular actives per branch. Thiếu Lâm Quyền starts with combo A. */
export const defaultBranches: Record<string, DefaultBranch> = {
  cai_bang_bong: {
    schoolId: 'cai_bang',
    style: 'Bổng',
    skillIds: [
      'hoanh_tao_bong',
      'pha_giap_bong',
      'cam_long_cong',
      'truy_phong_bong',
    ],
  },
  cai_bang_chuong: {
    schoolId: 'cai_bang',
    style: 'Chưởng',
    skillIds: [
      'hoa_van_chuong',
      'cuong_long_loan_vu',
      'phi_long_tai_thien',
      'khang_long_huu_hoi',
    ],
  },
  thien_son_phien: {
    schoolId: 'thien_son',
    style: 'Phiến',
    skillIds: [
      'lien_hoa_phien',
      'luc_duong_chuong',
      'luu_phong_bo',
      'chiet_mai_thu',
    ],
  },
  thien_son_dao: {
    schoolId: 'thien_son',
    style: 'Đao',
    skillIds: [
      'phi_anh_tram',
      'truy_hon_dao',
      'phong_anh_hoan_vi',
      'liet_phong_dao',
    ],
  },
  vo_dang_quyen: {
    schoolId: 'vo_dang',
    style: 'Quyền',
    skillIds: [
      'luong_nghi_thu',
      'huyen_am_chuong',
      'duong_khi_kich',
      'thai_cuc_than_cong',
    ],
  },
  vo_dang_kiem: {
    schoolId: 'vo_dang',
    style: 'Kiếm',
    skillIds: [
      'that_tinh_kiem',
      'nhan_kiem_hop_nhat',
      'bat_quai_kiem_tran',
      'toa_sat_bac_do',
    ],
  },
  thieu_lam_quyen: {
    schoolId: 'thieu_lam',
    style: 'Quyền',
    skillIds: [
      'la_han_quyen',
      'vi_da_quyen',
      'dai_luc_kim_cuong_chuong',
      'toan_phong_thoai',
    ],
  },
  thieu_lam_dao: {
    schoolId: 'thieu_lam',
    style: 'Đao',
    skillIds: [
      'tru_ta',
      'kim_quang_ho_tran',
      'tam_gioi_quy_thien',
      'bat_dong_minh_vuong',
    ],
  },
};

const ultimates: Record<string, string> = {
  cai_bang_bong: 'thien_ha_vo_cau',
  cai_bang_chuong: 'hang_long_hoa_vu',
  thien_son_phien: 'bach_phien_phong_bao',
  thien_son_dao: 'bach_liet_thien_kich',
  vo_dang_quyen: 'thai_cuc_tran',
  vo_dang_kiem: 'van_kiem_quy_tong',
  thieu_lam_quyen: 'nhu_lai_niet_ban',
  thieu_lam_dao: 'nhu_lai_thien_diep',
};
export const fixedBranches: Record<string, FixedBranch> = Object.fromEntries(
  Object.entries(defaultBranches).map(([id, branch]) => [
    id,
    id === 'thieu_lam_quyen'
      ? {
          skillIds: [
            ...branch.skillIds.slice(0, 3),
            'kim_cang_bat_hoai',
            ultimates[id]!,
          ],
          alternateSkillIds: [
            'toan_phong_thoai',
            'hoanh_tao_cuoc',
            'vo_anh_cuoc',
            'kim_cang_bat_hoai',
            ultimates[id]!,
          ],
        }
      : { skillIds: [...branch.skillIds, ultimates[id]!] },
  ]),
);
