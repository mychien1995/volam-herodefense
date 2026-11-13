export const duongMon = {
  school: 'duong_mon',
  coQuan: 'duong_mon_co_quan',
  amKhi: 'duong_mon_am_khi',
  passive: 'tu_tuyet_khi',
  arrows: 'truy_tam_tu_tien',
  flight: 'thiet_duc_hoanh_khong',
  laser: 'luu_tinh_truc_nguyet',
  shell: 'thien_co_thiet_duc',
  flowers: 'man_thien_hoa_vu',
  trap: 'dia_diem_hoa',
  knives: 'cuu_cung_phi_tinh',
  evade: 'nhiep_hon_nguyet_anh',
  elements: 'ngu_hanh_cach_the_thuat',
  storm: 'bao_vu_le_hoa_cham',
} as const;

export const duongMonFan = [
  { stage: 'water', angle: 0 },
  { stage: 'wood', angle: -0.23 },
  { stage: 'metal', angle: 0.23 },
  { stage: 'earth', angle: -0.47 },
  { stage: 'fire', angle: 0.47 },
] as const;
