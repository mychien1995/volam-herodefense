import { z } from 'zod';
import type { DongDefinition } from '@volam/game-core';
import { m1Config } from './m1.js';
const rate = m1Config.tickRate;
const profile = z.strictObject({
  nameVi: z.string().min(1),
  damage: z.number().nonnegative(),
  windup: z.number().int().positive(),
  duration: z.number().int().positive(),
  cooldown: z.number().int().positive(),
});
const actor = z.strictObject({
  hp: z.number().positive(),
  defense: z.number().nonnegative(),
  speed: z.number().positive(),
});
const point = z.strictObject({
  x: z.number().finite(),
  y: z.number().finite(),
});
const positive = z.number().positive(),
  ticks = z.number().int().positive();
export const dongTaDefinitionSchema = z
  .strictObject({
    center: point,
    entry: point,
    bounds: point.extend({ radiusX: positive, radiusY: positive }),
    gateWave: z.literal(5),
    restTicks: ticks,
    entryTicks: ticks,
    retryTicks: ticks,
    actors: z.strictObject({
      dong_ta: actor,
      mai_sieu_phong: actor,
      hoang_dung: actor,
    }),
    hpPerAdditionalPlayer: z.number().nonnegative(),
    controlResistance: z.number().min(0).max(1),
    xp: z.number().int().nonnegative(),
    gold: z.number().int().nonnegative(),
    openingTicks: ticks,
    thrust: z.strictObject({
      range: positive,
      hits: ticks,
      halfWidth: positive,
    }),
    fan: z.strictObject({
      range: positive,
      halfAngle: z.number().positive().max(Math.PI),
    }),
    beads: z.strictObject({
      min: z.literal(8),
      max: z.literal(14),
      speed: positive,
      range: positive,
      radius: positive,
    }),
    slash: z.strictObject({
      range: positive,
      halfWidth: positive,
      travelTicks: ticks,
    }),
    petals: z.strictObject({
      count: z.literal(40),
      separation: positive,
      delayTicks: ticks,
      radius: positive,
    }),
    claws: z.strictObject({
      range: positive,
      halfWidth: positive,
      gapTicks: ticks,
      speed: positive,
      radius: positive,
    }),
    pull: z.strictObject({ range: positive, speed: positive }),
    poison: z.strictObject({
      radius: positive,
      flightTicks: ticks,
      poolTicks: ticks,
      intervalTicks: ticks,
    }),
    heal: z.strictObject({
      amount: positive,
      speed: positive,
      radius: positive,
      range: positive,
    }),
    sprintMultiplier: positive,
    abilities: z.strictObject(
      Object.fromEntries(
        [
          'ta_kiem_lien_kich',
          'lac_anh_normal',
          'dan_chi_than_cong',
          'lac_anh_kiem_phap',
          'ngoc_tieu_hoi_phong',
          'trieu_hon_dong_hai',
          'bach_cot_trao',
          'ma_anh_troc_hon',
          'am_phong_hap_luc',
          'doc_cot_bao',
          'thanh_am_ho_tro',
          'linh_xa_bo',
        ].map((id) => [id, profile]),
      ),
    ),
  })
  .superRefine((d, ctx) => {
    if (
      d.center.x !== d.bounds.x ||
      d.center.y !== d.bounds.y ||
      d.entry.x <= d.center.x ||
      d.entry.y !== d.center.y
    )
      ctx.addIssue({
        code: 'custom',
        message: 'East entry must align with the court center.',
      });
    if (
      d.thrust.range < 320 ||
      d.slash.travelTicks > d.abilities['lac_anh_kiem_phap']!.duration
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Invalid approved reach/travel timing.',
      });
  });
const p = (
  nameVi: string,
  damage: number,
  windup: number,
  duration: number,
  cooldown: number,
) => ({
  nameVi,
  damage,
  windup: Math.round(windup * rate),
  duration: Math.round(duration * rate),
  cooldown: Math.round(cooldown * rate),
});
/** PROPOSED combat coefficients; approved V04 geometry/counts are kept separate. */
export const dongTaDefinition = dongTaDefinitionSchema.parse({
  center: { x: 800, y: 616 },
  entry: { x: 1420, y: 616 },
  bounds: { x: 800, y: 616, radiusX: 324, radiusY: 294 },
  gateWave: 5,
  restTicks: 10 * rate,
  entryTicks: 3 * rate,
  retryTicks: 3 * rate,
  openingTicks: rate,
  actors: {
    dong_ta: { hp: 6200, defense: 30, speed: 105 },
    mai_sieu_phong: { hp: 1800, defense: 18, speed: 135 },
    hoang_dung: { hp: 1200, defense: 12, speed: 90 },
  },
  hpPerAdditionalPlayer: 0.45,
  controlResistance: 0.75,
  xp: 650,
  gold: 360,
  thrust: { range: 380, hits: 13, halfWidth: 24 },
  fan: { range: 180, halfAngle: Math.PI / 3 },
  beads: { min: 8, max: 14, speed: 680, range: 700, radius: 9 },
  slash: { range: 280, halfWidth: 68, travelTicks: Math.round(0.5 * rate) },
  petals: {
    count: 40,
    separation: 48,
    delayTicks: Math.round(2.8 * rate),
    radius: 32,
  },
  claws: { range: 112, halfWidth: 56, gapTicks: 8, speed: 560, radius: 20 },
  pull: { range: 400, speed: 160 },
  poison: {
    radius: 86,
    flightTicks: rate,
    poolTicks: 6 * rate,
    intervalTicks: rate,
  },
  heal: { amount: 48, speed: 380, radius: 12, range: 700 },
  sprintMultiplier: 3,
  abilities: {
    ta_kiem_lien_kich: p('Tà Kiếm Liên Kích', 12, 0.45, 0.9, 2.6),
    lac_anh_normal: p('Lạc Anh Kiếm Pháp', 26, 0.45, 0.5, 2.2),
    dan_chi_than_cong: p('Đàn Chỉ Thần Công', 28, 0.6, 0.5, 9),
    lac_anh_kiem_phap: p('Lạc Anh Kiếm Pháp', 35, 0.7, 0.7, 11),
    ngoc_tieu_hoi_phong: p('Ngọc Tiêu Hồi Phong', 40, 1.1, 0.8, 17),
    trieu_hon_dong_hai: p('Triệu Hồn Đông Hải', 0, 0.8, 0.6, 1),
    bach_cot_trao: p('Bạch Cốt Trảo', 16, 0.35, 0.55, 1.7),
    ma_anh_troc_hon: p('Ma Ảnh Tróc Hồn', 18, 0.55, 1, 8),
    am_phong_hap_luc: p('Âm Phong Hấp Lực', 0, 0.7, 1.2, 12),
    doc_cot_bao: p('Độc Cốt Bạo', 27, 0.6, 0.5, 13),
    thanh_am_ho_tro: p('Thanh Âm Hộ Trợ', 0, 0.25, 0.35, 1.8),
    linh_xa_bo: p('Linh Xà Bộ', 0, 0.15, 0.8, 7),
  },
}) as DongDefinition;
