import { z } from 'zod';
import type {
  CreepAttack,
  CreepProfile,
  CreepCombatDefinition,
  StatusSpec,
} from '@volam/game-core';

const slow = (m = 0.2): StatusSpec[] => [
  { kind: 'slow', magnitude: m, durationTicks: 60 },
];
const poison: StatusSpec[] = [
  { kind: 'poison', magnitude: 2, durationTicks: 90 },
];
const burn: StatusSpec[] = [{ kind: 'burn', magnitude: 2, durationTicks: 90 }];
const arc = (
  nameVi: string,
  extra: Partial<CreepAttack> = {},
): CreepAttack => ({
  mode: 'arc',
  nameVi,
  range: 42,
  radius: 8,
  damage: 0.75,
  windup: 6,
  cooldown: 48,
  halfAngle: Math.PI / 3,
  graphic: 'metal',
  ...extra,
});
const shot = (
  nameVi: string,
  extra: Partial<CreepAttack> = {},
): CreepAttack => ({
  ...arc(nameVi),
  mode: 'projectile',
  range: 300,
  radius: 5,
  speed: 240,
  graphic: 'arrow',
  ...extra,
});
const skill = (nameVi: string, extra: Partial<CreepAttack> = {}): CreepAttack =>
  arc(nameVi, { damage: 1.5, windup: 24, cooldown: 195, range: 90, ...extra });
const pool = (
  nameVi: string,
  graphic: string,
  extra: Partial<CreepAttack> = {},
): CreepAttack =>
  skill(nameVi, {
    mode: 'area',
    range: 280,
    radius: 46,
    duration: 90,
    interval: 30,
    damage: 0.3,
    graphic,
    ...extra,
  });
const dash = (nameVi: string, extra: Partial<CreepAttack> = {}): CreepAttack =>
  skill(nameVi, {
    mode: 'dash',
    range: 150,
    radius: 18,
    speed: 360,
    graphic: 'slash',
    ...extra,
  });
const ranged = (nameVi: string, graphic: string): CreepAttack =>
  shot(nameVi, { graphic });
const rows: CreepProfile[] = [];
const add = (
  id: string,
  nameVi: string,
  basic: CreepAttack,
  special?: CreepAttack,
  death?: CreepAttack,
) =>
  rows.push({
    id,
    nameVi,
    basic,
    ...(special ? { special } : {}),
    ...(death ? { death } : {}),
  });

add(
  'wave_01',
  'Chó Hoang',
  arc('Cắn', { range: 30, cooldown: 36, graphic: 'bite' }),
);
add(
  'wave_02',
  'Thổ Phỉ',
  arc('Đập'),
  skill('Đập mạnh', { range: 64, halfAngle: 0.5, graphic: 'stone' }),
);
add(
  'wave_03',
  'Sơn Tặc Đao',
  arc('Chém đao'),
  skill('Hoành trảm', { range: 96, halfAngle: 1.5, graphic: 'slash' }),
);
add(
  'wave_04',
  'Cung Thủ Sơn Tặc',
  ranged('Bắn tên', 'arrow'),
  skill('Tam tiễn', {
    mode: 'projectile',
    range: 360,
    radius: 5,
    speed: 260,
    count: 3,
    spread: 0.35,
    graphic: 'arrow',
  }),
);
add(
  'wave_05',
  'Hắc Y Sát Thủ',
  arc('Đâm dao', { range: 34 }),
  dash('Đột kích'),
);
add(
  'wave_06',
  'Tà Tăng',
  arc('Đánh trượng'),
  skill('Hấp huyết chưởng', { lifesteal: 0.4, graphic: 'blood' }),
);
add(
  'wave_07',
  'Khô Lâu Kiếm Sĩ',
  arc('Chém kiếm'),
  skill('Liên kích', { hits: 2, spacing: 14, range: 64, graphic: 'slash' }),
);
add(
  'wave_08',
  'Khô Lâu Cung Thủ',
  ranged('Bắn tên', 'arrow'),
  shot('Hàn tiễn', {
    windup: 24,
    cooldown: 195,
    damage: 1.2,
    statuses: slow(0.18),
    graphic: 'ice',
  }),
);
add(
  'wave_09',
  'Cương Thi',
  arc('Cào', { cooldown: 60, graphic: 'poison' }),
  undefined,
  pool('Thi độc', 'poison', {
    range: 0,
    radius: 44,
    windup: 18,
    statuses: poison,
  }),
);
add(
  'wave_10',
  'Oán Linh',
  ranged('Linh cầu', 'spirit'),
  pool('Oán khí', 'spirit', { damage: 0.45 }),
);
add(
  'wave_11',
  'Thiết Giáp Khô Lâu',
  arc('Chém kiếm', { cooldown: 60 }),
  skill('Thủ thế', {
    mode: 'guard',
    damage: 0,
    duration: 60,
    graphic: 'metal',
  }),
);
add(
  'wave_12',
  'Thạch Nhân',
  arc('Đấm', { cooldown: 66, graphic: 'stone' }),
  skill('Chấn địa', {
    mode: 'area',
    range: 0,
    radius: 110,
    duration: 24,
    interval: 1,
    pattern: 'ring',
    graphic: 'stone',
  }),
);
add(
  'wave_13',
  'Ma Khuyển',
  arc('Cắn', { range: 30, cooldown: 36, graphic: 'fire' }),
  dash('Hỏa vồ', { statuses: burn, graphic: 'fire' }),
);
add(
  'wave_14',
  'Tiểu Hỏa Quỷ',
  arc('Cào', { damage: 0.45, graphic: 'fire' }),
  skill('Tự bạo', {
    mode: 'area',
    range: 0,
    radius: 76,
    duration: 1,
    windup: 30,
    damage: 2.3,
    suicide: true,
    graphic: 'fire',
  }),
);
add(
  'wave_15',
  'Hỏa Pháp Sư',
  ranged('Hỏa cầu', 'fire'),
  pool('Hỏa trận', 'fire', { damage: 0.45 }),
);
add(
  'wave_16',
  'Ngưu Ma',
  arc('Quét', { range: 58, graphic: 'stone' }),
  dash('Húc', { range: 190, knockback: 28, graphic: 'stone' }),
);
add(
  'wave_17',
  'Ảnh Ma',
  arc('Chém', { cooldown: 39, graphic: 'shadow' }),
  dash('Ảnh tập', {
    trail: pool('Vệt ảnh', 'shadow', {
      range: 0,
      radius: 22,
      windup: 18,
      duration: 1,
      damage: 0.7,
    }),
    graphic: 'shadow',
  }),
);
add(
  'wave_18',
  'Ma Tướng Thiết Giáp',
  arc('Bổ', { cooldown: 60 }),
  skill('Hiệu lệnh', {
    mode: 'buff',
    range: 0,
    radius: 135,
    damage: 0,
    duration: 75,
    graphic: 'blood',
  }),
);
add(
  'wave_19',
  'Huyết Ma Pháp Sư',
  ranged('Huyết cầu', 'blood'),
  pool('Huyết ấn', 'blood', { damage: 0.5, lifesteal: 0.4 }),
);
add(
  'wave_20',
  'Ma Vương Tiên Phong',
  arc('Chém', { range: 64, halfAngle: 1.2, graphic: 'shadow' }),
  skill('Ma trảm', {
    mode: 'area',
    range: 0,
    radius: 16,
    pattern: 'cross',
    hits: 2,
    spacing: 18,
    duration: 1,
    graphic: 'shadow',
  }),
);

add(
  'truc_xa',
  'Trúc Xà',
  arc('Cắn', { graphic: 'poison' }),
  shot('Phun độc', {
    windup: 24,
    cooldown: 195,
    damage: 1,
    statuses: poison,
    graphic: 'poison',
  }),
);
add(
  'doc_chu',
  'Độc Chu',
  arc('Cắn', { graphic: 'poison' }),
  shot('Tơ nhện', {
    windup: 24,
    cooldown: 195,
    damage: 0.4,
    graphic: 'web',
    field: pool('Tơ nhện', 'web', {
      range: 0,
      statuses: slow(0.25),
      damage: 0,
    }),
  }),
);
add(
  'son_vien',
  'Sơn Viên',
  arc('Đấm', { graphic: 'stone' }),
  pool('Ném đá', 'stone', { windup: 27, duration: 1, damage: 1.5 }),
);
add(
  'truc_lam_kiem_khach',
  'Trúc Lâm Kiếm Khách',
  arc('Chém kiếm'),
  skill('Phản kiếm', {
    mode: 'counter',
    duration: 45,
    range: 80,
    graphic: 'slash',
  }),
);
add(
  'moc_linh',
  'Mộc Linh',
  arc('Quật cành', { graphic: 'wood' }),
  pool('Rễ trồi', 'wood', {
    pattern: 'line',
    duration: 1,
    radius: 24,
    statuses: slow(0.2),
  }),
);
add(
  'truc_yeu',
  'Trúc Yêu',
  arc('Quất trúc', { graphic: 'wood' }),
  shot('Trúc thích', {
    windup: 24,
    cooldown: 195,
    count: 3,
    spread: 0.35,
    damage: 1,
    graphic: 'wood',
  }),
);

add(
  'bo_cap_cat',
  'Bọ Cạp Cát',
  arc('Kẹp càng', { graphic: 'sand' }),
  skill('Độc châm', {
    range: 70,
    halfAngle: 0.55,
    statuses: poison,
    graphic: 'poison',
  }),
);
add(
  'sa_xa',
  'Sa Xà',
  arc('Cắn', { graphic: 'sand' }),
  dash('Độn cát', { burrow: true, range: 160, graphic: 'sand' }),
);
add(
  'sa_tac',
  'Sa Tặc',
  arc('Chém đao'),
  skill('Phá giáp', {
    statuses: [{ kind: 'defense_break', magnitude: 12, durationTicks: 60 }],
    graphic: 'slash',
  }),
);
add(
  'cung_thu_sa_mac',
  'Cung Thủ Sa Mạc',
  ranged('Bắn tên', 'arrow'),
  shot('Xuyên sa tiễn', {
    windup: 30,
    cooldown: 210,
    damage: 1.6,
    piercing: true,
    range: 420,
    graphic: 'sand',
  }),
);
add(
  'xac_uop',
  'Xác Ướp',
  arc('Cào', { cooldown: 60, graphic: 'sand' }),
  skill('Cát nguyền', {
    range: 110,
    statuses: [{ kind: 'attack_slow', magnitude: 0.2, durationTicks: 60 }],
    graphic: 'sand',
  }),
);
add(
  'cu_nhan_sa_thach',
  'Cự Nhân Sa Thạch',
  arc('Đấm', { cooldown: 66, graphic: 'stone' }),
  pool('Sa thạch bộc phá', 'sand', {
    pattern: 'line',
    duration: 1,
    radius: 28,
    damage: 1.2,
  }),
);

add(
  'cua_khong_lo',
  'Cua Khổng Lồ',
  arc('Kẹp càng', { graphic: 'water' }),
  skill('Song càng', {
    range: 82,
    hits: 2,
    spacing: 12,
    statuses: slow(0.2),
    graphic: 'water',
  }),
);
add(
  'hai_xa',
  'Hải Xà',
  arc('Cắn', { graphic: 'water' }),
  shot('Độc thủy', {
    windup: 24,
    cooldown: 210,
    damage: 1,
    graphic: 'poison',
    statuses: poison,
    field: pool('Vệt độc thủy', 'poison', {
      range: 0,
      radius: 30,
      statuses: slow(0.15),
    }),
  }),
);
add(
  'hai_tac',
  'Hải Tặc',
  arc('Chém đao'),
  dash('Liên đao', { range: 65, hits: 2, spacing: 14, graphic: 'slash' }),
);
add(
  'hai_tac_hoa_phao',
  'Hải Tặc Hỏa Pháo',
  shot('Bắn pháo', { speed: 180, radius: 8, graphic: 'cannon' }),
  pool('Pháo kích', 'cannon', {
    windup: 30,
    duration: 1,
    radius: 54,
    damage: 1.8,
  }),
);
add(
  'thuy_quy',
  'Thủy Quỷ',
  arc('Cào', { graphic: 'water' }),
  pool('Vũng nước quỷ', 'water', {
    range: 0,
    damage: 0.2,
    statuses: slow(0.25),
  }),
);
add(
  'hai_vu',
  'Hải Vu',
  ranged('Thủy cầu', 'water'),
  shot('Triều dâng', {
    windup: 27,
    cooldown: 210,
    radius: 26,
    speed: 150,
    range: 340,
    damage: 1.2,
    piercing: true,
    knockback: 20,
    graphic: 'water',
  }),
);

add(
  'hell_xich_quy',
  'Xích Quỷ',
  arc('Chém móng', { graphic: 'fire' }),
  skill('Hỏa trảo', { statuses: burn, graphic: 'fire' }),
);
add(
  'hell_dia_nguc_khuyen',
  'Địa Ngục Khuyển',
  arc('Cắn', { cooldown: 36, graphic: 'fire' }),
  dash('Hỏa hành', {
    trail: pool('Đường lửa', 'fire', { range: 0, radius: 20, windup: 6 }),
    graphic: 'fire',
  }),
);
add(
  'hell_dung_nham_linh',
  'Dung Nham Linh',
  ranged('Bắn dung nham', 'lava'),
  undefined,
  pool('Dung bạo', 'lava', {
    range: 0,
    radius: 72,
    windup: 27,
    duration: 1,
    damage: 1.8,
  }),
);
add(
  'hell_hac_viem_phap_su',
  'Hắc Viêm Pháp Sư',
  ranged('Hắc hỏa cầu', 'black_fire'),
  pool('Hắc viêm trì', 'black_fire', { damage: 0.5 }),
);
add(
  'hell_hac_dien_nguu_ma',
  'Hắc Diện Ngưu Ma',
  arc('Quét', { range: 58, graphic: 'shadow' }),
  dash('Hắc lôi xung', {
    range: 180,
    trail: pool('Hắc lôi', 'shadow', {
      range: 0,
      radius: 22,
      windup: 24,
      duration: 1,
      damage: 0.8,
    }),
    graphic: 'shadow',
  }),
);
add(
  'hell_dung_nham_cu_nhan',
  'Dung Nham Cự Nhân',
  arc('Đấm', { cooldown: 66, graphic: 'lava' }),
  pool('Dung nham liệt địa', 'lava', {
    pattern: 'fan',
    duration: 45,
    radius: 20,
    damage: 0.65,
  }),
);

add(
  'mongol_infantry',
  'Bộ binh Mông Cổ',
  arc('Đâm giáo', { range: 55 }),
  skill('Trường thương', { range: 105, halfAngle: 0.4, graphic: 'slash' }),
);
add('mongol_archer', 'Cung thủ Mông Cổ', ranged('Bắn tên', 'arrow'));
add(
  'co_mo_am_binh',
  'Cổ Mộ Âm Binh',
  shot('Ngân châm', {
    range: 360,
    speed: 300,
    damage: 1,
    cooldown: 30,
    graphic: 'needle',
  }),
  shot('Tam châm', {
    windup: 24,
    cooldown: 210,
    damage: 0.7,
    count: 3,
    spread: 0.4,
    graphic: 'needle',
  }),
);
add('chu_wine_disciple', 'Đệ tử đưa rượu', arc('Đưa rượu', { damage: 0 }));
add(
  'bc_dog',
  'Ác khuyển',
  arc('Cắn', { range: 30, graphic: 'bite' }),
  dash('Vồ', { range: 85, damage: 1.1, windup: 24, graphic: 'bite' }),
);

const status = z.strictObject({
  kind: z.enum(['slow', 'attack_slow', 'defense_break', 'poison', 'burn']),
  magnitude: z.number().finite().nonnegative(),
  durationTicks: z.number().int().positive(),
});
const attack: z.ZodType<CreepAttack> = z.lazy(() =>
  z.strictObject({
    mode: z.enum([
      'arc',
      'projectile',
      'area',
      'dash',
      'guard',
      'counter',
      'buff',
    ]),
    nameVi: z.string().min(1),
    range: z.number().finite().nonnegative(),
    radius: z.number().finite().positive(),
    damage: z.number().finite().nonnegative(),
    windup: z.number().int().nonnegative(),
    cooldown: z.number().int().positive(),
    graphic: z.string().min(1),
    halfAngle: z.number().positive().max(Math.PI).optional(),
    speed: z.number().positive().optional(),
    count: z.number().int().min(1).max(5).optional(),
    spread: z.number().min(0).max(1).optional(),
    piercing: z.boolean().optional(),
    hits: z.number().int().min(1).max(4).optional(),
    spacing: z.number().int().positive().optional(),
    duration: z.number().int().positive().optional(),
    interval: z.number().int().positive().optional(),
    statuses: z.array(status).optional(),
    lifesteal: z.number().min(0).max(1).optional(),
    knockback: z.number().nonnegative().optional(),
    field: attack.optional(),
    trail: attack.optional(),
    pattern: z.enum(['line', 'fan', 'cross', 'ring']).optional(),
    suicide: z.boolean().optional(),
    burrow: z.boolean().optional(),
  }),
);
export const creepProfileSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9_]+$/),
  nameVi: z.string().min(1),
  basic: attack,
  special: attack.optional(),
  death: attack.optional(),
});
export const creepProfiles: Record<string, CreepProfile> = Object.fromEntries(
  rows.map((row) => {
    const p = creepProfileSchema.parse(row);
    return [p.id, p];
  }),
);
if (rows.length !== 49 || Object.keys(creepProfiles).length !== 49)
  throw Error('Creep catalogue must contain exactly 49 distinct profiles');
export const creepCombatDefinition: CreepCombatDefinition = {
  profiles: creepProfiles,
  waveIds: Array.from(
    { length: 20 },
    (_, i) => `wave_${String(i + 1).padStart(2, '0')}`,
  ),
  maxNearbyCasts: 3,
  castGroupRadius: 320,
  dotCapFraction: 0.025,
};
