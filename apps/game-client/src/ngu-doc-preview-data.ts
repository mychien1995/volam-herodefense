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
  flame: ['hand_flame_1', 'hand_flame_2', 'hand_flame_3'],
  pool: ['poison_cloud_1', 'poison_cloud_2', 'poison_cloud_3'],
  ring: ['ring_one', 'ring_two'],
  grasp: ['hand_seed', 'hand_open', 'hand_grasp', 'hand_open'],
  burst: ['burst_seed', 'burst_open', 'burst_fade'],
} as const;

// Palm centers measured on the Bích Cổ atlas relative to the (88, 118) foot pivot.
type Palm = readonly [x: number, y: number, behind?: boolean];
export const bichCoPalms: Readonly<Record<string, readonly [Palm, Palm]>> = {
  idle_down_0: [
    [-16, -37],
    [17, -37],
  ],
  walk_down_0: [
    [-9, -37],
    [15, -39],
  ],
  walk_down_1: [
    [-13, -35],
    [13, -35],
  ],
  walk_down_2: [
    [-9, -36],
    [14, -38],
  ],
  walk_down_3: [
    [-9, -34],
    [14, -36],
  ],
  cast_down_0: [
    [-14, -39],
    [20, -49],
  ],
  idle_up_0: [
    [-13, -34],
    [12, -34],
  ],
  walk_up_0: [
    [-13, -35],
    [12, -34, true],
  ],
  walk_up_1: [
    [-11, -34],
    [13, -36],
  ],
  walk_up_2: [
    [-13, -38],
    [13, -36],
  ],
  walk_up_3: [
    [-12, -37],
    [12, -36],
  ],
  cast_up_0: [
    [-9, -34],
    [27, -49],
  ],
  idle_left_0: [
    [-19, -32],
    [12, -32, true],
  ],
  walk_left_0: [
    [-17, -35],
    [12, -32, true],
  ],
  walk_left_1: [
    [-17, -33],
    [-7, -32, true],
  ],
  walk_left_2: [
    [-18, -39],
    [15, -33, true],
  ],
  walk_left_3: [
    [-6, -33],
    [6, -33, true],
  ],
  cast_left_0: [
    [-33, -45],
    [11, -32],
  ],
  idle_right_0: [
    [-11, -32, true],
    [19, -31],
  ],
  walk_right_0: [
    [-13, -32, true],
    [17, -36],
  ],
  walk_right_1: [
    [6, -32, true],
    [17, -33],
  ],
  walk_right_2: [
    [-14, -33, true],
    [17, -38],
  ],
  walk_right_3: [
    [4, -34, true],
    [16, -34],
  ],
  cast_right_0: [
    [-10, -32],
    [32, -45],
  ],
};
