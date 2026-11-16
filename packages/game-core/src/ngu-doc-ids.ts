export const nguDoc = {
  school: 'ngu_doc',
  taiHiep: 'ngu_doc_ta_hiep',
  coSu: 'ngu_doc_co_su',
  innate: 'ngu_doc_tam_kinh',
  palm: 'ngu_doc_chuong',
  pool: 'doc_sa_chuong',
  aura: 'am_ta_hap_hon_khi',
  counter: 'vo_hinh_doc',
  hands: 'am_phong_thuc_cot',
  worms: 'van_co_thuc_thien',
  jiangshi: 'yeu_co',
  mark: 'tam_hinh_co',
  zombie: 'vo_hinh_ma_co',
  reaper: 'thi_quy_phong_tan',
  reaperSweep: 'ngu_doc_reaper_sweep',
  reaperWave: 'ngu_doc_reaper_wave',
  reaperSlam: 'ngu_doc_reaper_slam',
} as const;

export const nguDocSummonKinds = ['jiangshi', 'zombie', 'reaper'] as const;
export type NguDocSummonKind = (typeof nguDocSummonKinds)[number];
export const nguDocSummonPrefix = 'ngu_doc_minion_';

export const nguDocDefense = [0, 4, 6, 8, 10] as const;
export const nguDocSummonRules = {
  gearShare: 0.18,
  zombieCap: 4,
  zombieChance: [0, 0.14, 0.18, 0.22, 0.26],
  followDistance: 64,
  leash: 285,
  catchUp: 385,
  aggro: 230,
  jiangshi: {
    hp: 86,
    rankHp: 23,
    damage: 14,
    rankDamage: 4,
    defense: 4,
    speed: 155,
    reach: 43,
    interval: 32,
    lifetime: 20,
  },
  zombie: {
    hp: 58,
    rankHp: 13,
    damage: 9,
    rankDamage: 3,
    defense: 2,
    speed: 143,
    reach: 41,
    interval: 36,
    lifetime: 13,
  },
  reaper: {
    hp: 290,
    rankHp: 85,
    damage: 49,
    rankDamage: 14,
    defense: 14,
    speed: 181,
    reach: 78,
    interval: 32,
    lifetime: 0,
  },
  reaperWaveSeconds: 5,
  reaperSlamSeconds: 8,
} as const;

export const nguDocPoisonRules = {
  palm: { damage: 5, rankDamage: 2, seconds: 3, slow: 0.13 },
  counter: { damage: 4, rankDamage: 1.5, seconds: 3, slow: 0.11 },
  hands: { damage: 10, rankDamage: 3, seconds: 4, slow: 0 },
  mark: {
    damage: 63,
    rankDamage: 19,
    attackScale: 0.38,
    radius: 82,
    stunTicks: 24,
    heal: 0.3,
    delaySeconds: 3,
  },
} as const;
