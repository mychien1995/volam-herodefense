export const conLuan = {
  school: 'con_luan',
  monk: 'con_luan_thien_su',
  sword: 'con_luan_kiem_ton',
  passive: 'huyen_thien_vo_cuc_cong',
  stance: 'ngu_loi_chinh_phap_the',
  slam: 'cuong_loi_chan_dia',
  ring: 'ngu_loi_chinh_phap_vong',
  hammer: 'thien_loi_tran_nhac',
  chaos: 'vo_cuc_phong_loi_quyet',
  plant: 'kinh_loi',
  detonate: 'loi_dong_thien_dia',
  dash: 'dien_quang_loi_anh',
  fan: 'bao_loi_kiem_canh',
  dragon: 'loi_long_thien_tuong',
  star: 'con_luan_kiem_tran',
  bolt: 'con_luan_thien_loi',
} as const;

export function fiveSwordPoints(x: number, y: number, rx: number, ry: number) {
  return Array.from({ length: 5 }, (_, index) => {
    const angle = -Math.PI / 2 + index * ((2 * Math.PI) / 5);
    return { x: x + rx * Math.cos(angle), y: y + ry * Math.sin(angle) };
  });
}
