import {
  m1Config,
  dongTaDefinition,
  kimLuanDefinition,
  hongLietDefinition,
  lyMacSauEncounter,
  tayDocDefinition,
  bossSkillNames,
} from '@volam/game-data';
import { namDeAbilities, tayDocAbilities } from '@volam/game-core';

export interface ArtCase {
  id: string;
  name: string;
  group: string;
  kind: 'hero' | 'boss';
  basic?: string;
  skill?: string;
  actor?: string;
  ability?: string;
  destination?: string;
  description: string;
}
const basics: Record<string, string> = {
  'cai_bang:Chưởng': 'cai_bang_chuong',
  'cai_bang:Bổng': 'cai_bang_bong',
  'thien_son:Phiến': 'thien_son_phien',
  'thien_son:Đao': 'thien_son_dao',
  'vo_dang:Quyền': 'vo_dang_quyen',
  'thieu_lam:Quyền': 'thieu_lam_quyen',
  'thieu_lam:Đao': 'thieu_lam_dao',
};
export const runtimeArtCases: ArtCase[] = [];
for (const [label, basic] of Object.entries(basics)) {
  runtimeArtCases.push({
    id: basic,
    name: 'A · ' + basic,
    group: label,
    kind: 'hero',
    basic,
    description:
      'Đánh thường hiện hành; nhấn A, giữ nguyên chuỗi đòn của server.',
  });
  for (const s of Object.values(m1Config.progression!.skills)) {
    if (s.schoolId + ':' + s.style !== label) continue;
    runtimeArtCases.push({
      id: s.id,
      name: s.ranks[0]!.nameVi,
      group: label,
      kind: 'hero',
      basic,
      skill: s.id,
      description: s.descriptionVi,
    });
  }
}
function add(
  actor: string,
  ability: string,
  name: string,
  destination?: string,
  description = 'Server hiện hành điều khiển toàn bộ cast, vùng cảnh báo, đường bay và thời gian tồn tại.',
) {
  runtimeArtCases.push({
    id: actor + ':' + ability,
    name,
    group: actor,
    kind: 'boss',
    actor,
    ability,
    ...(destination ? { destination } : {}),
    description,
  });
}
for (const a of lyMacSauEncounter.attacks)
  add('ly_mac_sau', a.id, a.nameVi, 'co_mo');
for (const [id, a] of Object.entries(hongLietDefinition.abilities))
  add('hong_liet', id, a.nameVi, 'hong_liet');
const chu: Record<string, string> = {
  palm: 'Bắn chưởng',
  sweep: 'Phong kình',
  fists: 'Quyền trái / phải',
  hands: 'Song Thủ Hỗ Bác',
  trap: 'Thái Cực Âm Dương Trận',
  spin: 'Túy Tiên Bộ',
  reflect: 'Càn Khôn Phản Chấn',
  ultimate: 'Âm Dương Nghịch Chuyển',
  drink: 'Tiểu đồng đưa rượu',
};
for (const [id, name] of Object.entries(chu))
  add('chu_ba_thong', id, name, 'chu_ba_thong');
for (const [id, a] of Object.entries(kimLuanDefinition.abilities)) {
  const actor = [
    'thiet_phien_lien_hoan',
    'cuong_phong_tan_loi_cong',
    'phien_trung_doc_dinh',
    'cuong_phong_van_nhan',
  ].includes(id)
    ? 'hoac_do'
    : [
          'dat_sweep',
          'dai_luc_pha_son',
          'bat_dong_kim_cang',
          'dai_luc_pha_son_boulder',
          'hang_ma_tam_lien_chan',
        ].includes(id)
      ? 'dat_nhi_ba'
      : 'kim_luan_phap_vuong';
  add(actor, id, a.nameVi, 'kim_luan');
}
for (const [id, a] of Object.entries(dongTaDefinition.abilities)) {
  const actor = [
    'bach_cot_trao',
    'ma_anh_troc_hon',
    'am_phong_hap_luc',
    'doc_cot_bao',
  ].includes(id)
    ? 'mai_sieu_phong'
    : ['thanh_am_ho_tro', 'linh_xa_bo'].includes(id)
      ? 'hoang_dung'
      : 'dong_ta';
  add(actor, id, a.nameVi);
}
for (const id of tayDocAbilities)
  add('tay_doc', id, tayDocDefinition.attacks[id].nameVi);
for (const id of namDeAbilities)
  add('nam_de', id, (bossSkillNames as Record<string, string>)[id] ?? id);
for (const id of [
  'staff',
  'palms',
  'beam',
  'dogs',
  'clones',
  'vortex',
  'tether',
  'field',
  'spiral',
])
  add(
    'bac_cai',
    id,
    (
      {
        staff: 'Đả Cẩu Bổng Pháp',
        palms: 'Hàng Long 18 Chưởng',
        beam: 'Đả Cẩu Bổng Kích',
        dogs: 'Bổng Đả Ác Khuyển',
        clones: 'Mục Hạ Vô Nhân',
        vortex: 'Thiên Hạ Vô Cẩu',
        tether: 'Kháng Long Hữu Hối',
        field: 'Kiến Long Tại Điền',
        spiral: 'Phi Long Tại Thiên',
      } as Record<string, string>
    )[id]!,
  );
