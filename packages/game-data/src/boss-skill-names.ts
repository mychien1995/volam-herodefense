import { dongTaDefinition } from './dong-ta.js';
import { tayDocDefinition } from './tay-doc.js';
import { namDeAbilityNames } from './nam-de.js';
import { lyMacSauEncounter } from './ly-mac-sau.js';
import { hongLietDefinition } from './hong-liet.js';
import { kimLuanDefinition } from './kim-luan.js';

/** Exact localized names; ASCII cast IDs remain unchanged. */
export const bossSkillNames: Record<string, string> = {
  vtd_nhat_khi_hoa_tam_thanh: 'Nhất Khí Hóa Tam Thanh',
  vtd_cuu_am_ho_the: 'Cửu Âm Hộ Thể',
  vtd_toan_chan_phan_kiem: 'Toàn Chân Phản Kiếm',
  vtd_ngu_hanh_kiem_tran: 'Ngũ Hành Kiếm Trận',
  vtd_bac_dau_kiem_tran: 'Bắc Đẩu Kiếm Trận',
  vtd_tam_thanh_pha_tran: 'Tam Thanh Phá Trận',
  vtd_tien_thien_chan_mach: 'Tiên Thiên Chấn Mạch',
  vtd_huyen_vu_kiem_tran: 'Huyền Vũ Kiếm Trận',
  vtd_nhat_duong_chi: 'Nhất Dương Chỉ',
  vtd_pha_the_vo_hinh_kiem: 'Phá Thể Vô Hình Kiếm',
  vtd_that_tuyet_loi_am: 'Thất Tuyệt Lôi Âm',
  ...Object.fromEntries(
    Object.entries(dongTaDefinition.abilities).map(([id, p]) => [id, p.nameVi]),
  ),
  ...Object.fromEntries(
    Object.entries(tayDocDefinition.attacks).map(([id, p]) => [id, p.nameVi]),
  ),
  ...namDeAbilityNames,
  ...Object.fromEntries(lyMacSauEncounter.attacks.map((p) => [p.id, p.nameVi])),
  ...Object.fromEntries(
    Object.entries(hongLietDefinition.abilities).map(([id, p]) => [
      id,
      p.nameVi,
    ]),
  ),
  ...Object.fromEntries(
    Object.entries(kimLuanDefinition.abilities).map(([id, p]) => [
      id,
      p.nameVi,
    ]),
  ),
  cap_mo_cong: 'Cáp Mô Công',
  hands: 'Song Thủ Hỗ Bác',
  trap: 'Thái Cực Âm Dương Trận',
  spin: 'Túy Tiên Bộ',
  reflect: 'Càn Khôn Phản Chấn',
  ultimate: 'Âm Dương Nghịch Chuyển',
  drink: 'Tiểu đồng đưa rượu',
  bc_beam: 'Đả Cẩu Bổng Kích',
  bc_dogs: 'Bổng Đả Ác Khuyển',
  bc_clones: 'Mục Hạ Vô Nhân',
  bc_vortex: 'Thiên Hạ Vô Cẩu',
  bc_tether: 'Kháng Long Hữu Hối',
  bc_field: 'Kiến Long Tại Điền',
  bc_spiral: 'Phi Long Tại Thiên',
};
