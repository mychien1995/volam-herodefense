import type { CombatEvent } from '@volam/game-core';

const single = new Map<string, string>([
  ['hoanh_tao_bong', 'staff-radial'],
  ['phi_long_tai_thien', 'palm-dragon-touch'],
  ['khang_long_huu_hoi', 'palm-aura-ember'],
  ['luc_duong_chuong', 'fan-palms'],
  ['luu_phong_bo', 'fan-recall-touch'],
  ['bach_phien_phong_bao', 'fan-storm-tick'],
  ['thien_son_dao', 'sabre-score'],
  ['bach_liet_thien_kich', 'sabre-flurry'],
  ['vo_dang_quyen', 'fist-pressure'],
  ['luong_nghi_thu', 'fist-polar-touch'],
  ['thai_cuc_tran', 'fist-formation-tick'],
  ['vo_dang_kiem', 'sword-score'],
  ['that_tinh_kiem', 'sword-seven-tick'],
  ['nhan_kiem_hop_nhat', 'sword-pierce-touch'],
  ['thieu_lam_dao', 'sabre-gold-point'],
  ['tru_ta', 'sabre-gold-petal'],
  ['nhu_lai_thien_diep', 'sabre-lotus-blade'],
  ['dien_quang_loi_anh', 'sword-violet-dash'],
  ['bao_loi_kiem_canh', 'sword-violet-edge'],
]);

const phases = new Map<string, ReadonlyMap<string, string>>([
  [
    'cai_bang_bong',
    new Map([
      ['thrust', 'staff-point'],
      ['lift', 'staff-point'],
      ['sweep', 'staff-drop'],
      ['smash', 'staff-drop'],
    ]),
  ],
  ['thien_ha_vo_cau', new Map([['sweep', 'staff-whirl-tick']])],
  ['burn', new Map([['cuong_long_loan_vu', 'palm-afterburn']])],
  ['hang_long_hoa_vu', new Map([['dragon_coil', 'palm-coil-tick']])],
  ['phong_anh_hoan_vi', new Map([['counter', 'sabre-counter']])],
  [
    'tam_lien_tram',
    new Map([
      ['cross_0', 'sabre-peach-cross'],
      ['cross_1', 'sabre-peach-cross'],
      ['cross_2', 'sabre-peach-last'],
    ]),
  ],
  [
    'huyen_am_chuong',
    new Map([
      ['travel_0', 'fist-wave-first'],
      ['travel_1', 'fist-wave-second'],
    ]),
  ],
  [
    'thieu_lam_quyen',
    new Map([
      ['left_fist', 'fist-knuckle'],
      ['right_fist', 'fist-knuckle'],
      ['front_kick', 'fist-front-kick'],
      ['roundhouse_kick', 'fist-roundhouse'],
    ]),
  ],
  ['vi_da_quyen', new Map([['near', 'fist-vida-near']])],
  [
    'con_luan_thien_su',
    new Map([
      ['thrust', 'hammer-point'],
      ['sweep', 'hammer-sweep'],
      ['rising', 'hammer-sweep'],
    ]),
  ],
]);

const soft = new Set([
  'staff-whirl-tick',
  'palm-aura-ember',
  'palm-afterburn',
  'palm-coil-tick',
  'fan-palms',
  'fan-storm-tick',
  'sabre-flurry',
  'fist-formation-tick',
  'sword-seven-tick',
  'sword-violet-edge',
]);
const low = new Set(['palm-aura-ember', 'palm-afterburn']);
const upright = new Set([
  'palm-aura-ember',
  'palm-afterburn',
  'sabre-peach-last',
]);

export function contactClip(event: CombatEvent) {
  if (
    event.kind !== 'hit' ||
    event.damage <= 0 ||
    !event.targetId ||
    event.targetId === 'statue'
  )
    return;
  const id =
    single.get(event.abilityId) ??
    phases.get(event.abilityId)?.get(event.hitPhase ?? '');
  if (!id) return;
  return { id, soft: soft.has(id), low: low.has(id), upright: upright.has(id) };
}
