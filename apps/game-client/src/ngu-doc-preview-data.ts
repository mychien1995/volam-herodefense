export const skills = {
  'bich-co': {
    P: 'Ngũ Độc Tâm Kinh',
    A: 'Chưởng thường',
    Q: 'Ngũ Độc Chưởng',
    W: 'Độc Sa Chưởng',
    E: 'Âm Tà Hấp Hồn Khí',
    R: 'Vô Hình Độc',
    T: 'Âm Phong Thực Cốt',
  },
  'am-linh': {
    P: 'Ngũ Độc Tâm Kinh',
    A: 'Đạn đầu lâu',
    Q: 'Vạn Cổ Thực Thiên',
    W: 'Yêu Cổ',
    E: 'Tâm Hình Cổ',
    R: 'Vô Hình Ma Cổ',
    T: 'Thi Quỷ Phong Tận',
  },
} as const;

export type Branch = keyof typeof skills;
export type Skill = keyof (typeof skills)['bich-co'];
export type TargetMode = 'boss' | 'creep' | 'none';
export type Point = { x: number; y: number };
export const facings = ['down', 'up', 'left', 'right'] as const;
export type Facing = (typeof facings)[number];
export const directions: Record<Facing, Point> = {
  down: { x: 0, y: 1 },
  up: { x: 0, y: -1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
export const demoTargets = [
  { type: 'boss', x: 924, y: 625, name: 'Boss' },
  { type: 'creep', x: 896, y: 715, name: 'Creep' },
  { type: 'creep', x: 1025, y: 582, name: 'Creep' },
] as const;
export const minionClips = {
  jiangshi: {
    idle: 'jiangshi_idle',
    walk: ['jiangshi_hop', 'jiangshi_land'],
    attack: ['jiangshi_idle', 'jiangshi_attack'],
  },
  zombie: {
    idle: 'zombie_idle',
    walk: ['zombie_step_l', 'zombie_step_r'],
    attack: ['zombie_idle', 'zombie_attack'],
  },
  reaper: {
    idle: 'reaper_idle',
    walk: ['reaper_idle', 'reaper_glide'],
    attack: ['reaper_windup', 'reaper_sweep'],
  },
} as const;
export type Minion = keyof typeof minionClips;
export const effectClips = {
  flame: ['flame_low', 'flame_high'],
  pool: ['pool_seed', 'pool_dense', 'pool_thin', 'pool_dense'],
  ring: ['ring_one', 'ring_two'],
  grasp: ['hand_seed', 'hand_open', 'hand_grasp', 'hand_open'],
  burst: ['burst_seed', 'burst_open', 'burst_fade'],
} as const;
