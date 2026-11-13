import { z } from 'zod';
import {
  blocked,
  hongLietAbilities,
  type CreepDungeonDefinition,
  type HongLietDefinition,
} from '@volam/game-core';
import map from './hong-liet-map.json' with { type: 'json' };
import { creepDungeon } from './dungeon.js';
import { m1Config } from './m1.js';
import { bossArenaScale, scaleBossArena } from './boss-arena-geometry.js';
import { bossCadence, cadenceTicks } from './boss-cadence.js';
const marker = (name: string) => {
  const p = map.layers
    .find((l) => l.name === 'markers')!
    .objects!.find((o) => o.name === name);
  if (!p) throw Error('Missing boss marker ' + name);
  return p;
};
const ticks = (s: number) => Math.round(s * m1Config.tickRate);
const profile = (
  nameVi: string,
  damage: number,
  range: number,
  radius: number,
  windup: number,
  duration: number,
  recovery = 0.5,
  cooldown = 7,
  interval = 0.5,
) => ({
  nameVi,
  damage,
  range,
  radius,
  windupTicks: ticks(windup),
  durationTicks: Math.max(1, ticks(duration)),
  recoveryTicks: ticks(recovery),
  cooldownTicks: ticks(cooldown),
  intervalTicks: Math.max(1, ticks(interval)),
});
/** Approved geometry; damage/HP/cooldowns are explicit provisional integration tuning. */
export const hongLietDefinition: HongLietDefinition = {
  id: 'hoan_nhan_hong_liet',
  spawn: { x: marker('boss_spawn').x, y: marker('boss_spawn').y },
  bounds: {
    x: marker('arena_combat_bounds').x,
    y: marker('arena_combat_bounds').y,
    width: marker('arena_combat_bounds').width,
    height: marker('arena_combat_bounds').height,
  },
  hp: 3600,
  defense: 18,
  radius: 22,
  speed: 130,
  xp: 900,
  gold: 240,
  emptyResetTicks: ticks(30),
  respawnTicks: ticks(30),
  restTicks: ticks(0.35),
  initialRestTicks: ticks(2),
  stunScale: 0.2,
  summonLimit: 8,
  summonCount: 4,
  summonLifetimeTicks: ticks(25),
  minion: {
    ...m1Config.creep,
    hp: 1140,
    defense: 5,
    speed: 100,
    radius: 12,
    damage: 9,
    attackRange: 42,
    detectionRange: 1500,
    attackCooldownTicks: ticks(1.5),
    xp: 0,
    gold: 0,
  },
  projectileSpeed: 600,
  projectileRadius: 8,
  a1Spread: Math.PI / 10,
  a1ForwardOffset: 0,
  lavaDistance: 550,
  lavaDashTicks: ticks(0.8),
  lavaFadeTicks: ticks(1.6),
  cannonRows: [430, 590, 750, 910],
  cannonColumns: [350, 550, 750, 950],
  abilities: {
    hong_liet_a1: profile('Ngũ Lộ Đao Khí', 22, 720, 13, 0.4, 0.35, 0.2, 1.4),
    hong_liet_a2: profile('Hoành Tảo Đại Đao', 26, 242, 0, 0.4, 0.35, 0.2, 1.4),
    dung_nham_liet_dia: profile(
      'Dung Nham Liệt Địa',
      24,
      0,
      220,
      1,
      0.25,
      0.6,
      9,
    ),
    hoa_son_bao_phat: profile('Hỏa Sơn Bạo Phát', 27, 0, 80, 1.1, 0.8, 0.6, 10),
    liet_diem_phong_toa: profile(
      'Liệt Diễm Phong Tỏa',
      9,
      550,
      45,
      1,
      11,
      0.25,
      13,
      0.5,
    ),
    hoa_tien_te_phat: profile('Hỏa Tiễn Tề Phát', 0, 0, 0, 1, 0.1, 0.4, 15),
    thiet_ky_trieu_binh: profile(
      'Thiết Kỵ Triệu Binh',
      0,
      0,
      0,
      1,
      0.1,
      0.4,
      15,
    ),
    van_ly_nham_hoa: profile('Vạn Lý Nham Hỏa', 32, 0, 110, 1.2, 4.8, 0.7, 18),
    hoa_phao_thien_la: profile(
      'Hỏa Pháo Thiên La',
      17,
      0,
      8,
      1.6,
      4.2,
      0.5,
      18,
      0.65,
    ),
  },
};
const burningHit = [
  { kind: 'slow', magnitude: 0.45, durationTicks: ticks(1.5) },
  { kind: 'burn', magnitude: 8, durationTicks: ticks(3) },
] as const;
for (const id of [
  'hong_liet_a1',
  'hoa_son_bao_phat',
  'liet_diem_phong_toa',
  'hoa_tien_te_phat',
  'van_ly_nham_hoa',
  'hoa_phao_thien_la',
] as const)
  hongLietDefinition.abilities[id].statuses = burningHit.map((s) => ({ ...s }));
hongLietDefinition.abilities.hong_liet_a2.statuses = [
  { kind: 'stun', magnitude: 1, durationTicks: ticks(0.65) },
];
for (const id of [
  'dung_nham_liet_dia',
  'hoa_son_bao_phat',
  'van_ly_nham_hoa',
] as const) {
  const ability = hongLietDefinition.abilities[id];
  ability.statuses = [
    ...(ability.statuses ?? []),
    { kind: 'stun', magnitude: 1, durationTicks: ticks(2) },
  ];
}
hongLietDefinition.restTicks = cadenceTicks(bossCadence.hong_liet.restSeconds);
hongLietDefinition.initialRestTicks = cadenceTicks(
  bossCadence.hong_liet.initialRestSeconds,
);
for (const [id, a] of Object.entries(hongLietDefinition.abilities)) {
  const t = bossCadence.hong_liet.abilities[id];
  if (!t) throw Error('Missing HHL cadence ' + id);
  a.windupTicks = cadenceTicks(t.windupSeconds);
  a.recoveryTicks = cadenceTicks(t.recoverySeconds);
  a.cooldownTicks = cadenceTicks(t.cooldownSeconds);
  a.intervalTicks = cadenceTicks(t.intervalSeconds);
}
const positive = z.number().finite().positive(),
  nonnegative = z.number().finite().nonnegative();
const ability = z.object({
  nameVi: z.string().min(1),
  damage: nonnegative,
  range: nonnegative,
  radius: nonnegative,
  windupTicks: positive.int(),
  durationTicks: positive.int(),
  recoveryTicks: positive.int(),
  cooldownTicks: positive.int(),
  intervalTicks: positive.int(),
  statuses: z
    .array(
      z.object({
        kind: z.enum(['slow', 'burn', 'stun']),
        magnitude: positive,
        durationTicks: positive.int(),
      }),
    )
    .optional(),
});
export function validateHongLietDefinition(d: HongLietDefinition): void {
  const point = z.object({ x: nonnegative, y: nonnegative }),
    count = positive.int();
  z.object({
    id: z.literal('hoan_nhan_hong_liet'),
    spawn: point,
    bounds: point.extend({ width: positive, height: positive }),
    hp: positive,
    defense: nonnegative,
    radius: positive,
    speed: positive,
    xp: nonnegative.int(),
    gold: nonnegative.int(),
    emptyResetTicks: z.literal(ticks(30)),
    respawnTicks: count,
    restTicks: count,
    initialRestTicks: count,
    stunScale: positive.max(1),
    summonLimit: count,
    summonCount: count,
    summonLifetimeTicks: count,
    projectileSpeed: positive,
    projectileRadius: positive,
    a1Spread: positive,
    lavaDashTicks: count,
    lavaFadeTicks: count,
    lavaDistance: positive,
    a1ForwardOffset: nonnegative,
    cannonRows: z.array(positive).length(4),
    cannonColumns: z.array(positive).length(4),
    minion: z.object({
      hp: positive,
      defense: nonnegative,
      speed: positive,
      radius: positive,
      damage: positive,
      attackRange: positive,
      detectionRange: positive,
      attackCooldownTicks: count,
      xp: nonnegative,
      gold: nonnegative,
    }),
  }).parse(d);
  for (const key of hongLietAbilities) ability.parse(d.abilities[key]);
  if (
    d.abilities.hong_liet_a1.range !== 720 ||
    Math.abs(d.a1Spread - Math.PI / 10) > 1e-9
  )
    throw Error('Approved M3D feedback A1 geometry changed.');
  if (
    d.summonCount > d.summonLimit ||
    new Set(d.cannonRows).size !== 4 ||
    new Set(d.cannonColumns).size !== 4
  )
    throw Error('Invalid summon/cannon pattern.');
  if (
    d.cannonRows.some(
      (y) => y < d.bounds.y || y > d.bounds.y + d.bounds.height,
    ) ||
    d.cannonColumns.some(
      (x) => x < d.bounds.x || x > d.bounds.x + d.bounds.width,
    )
  )
    throw Error('Cannon lane outside arena markers.');
}
validateHongLietDefinition(hongLietDefinition);
export const hongLietMap = map;
const collision = map.layers
  .find((l) => l.name === 'collision')!
  .objects!.map(({ x, y, width, height }) => ({ x, y, width, height }));
export const hongLietArenaScale = bossArenaScale * Math.sqrt(0.7);
export const hongLietDungeon: CreepDungeonDefinition = scaleBossArena(
  {
    ...creepDungeon,
    id: 'hong_liet',
    width: map.width * 32,
    height: map.height * 32,
    collision,
    boss: hongLietDefinition,
    spawn: { x: marker('hero_spawn').x, y: marker('hero_spawn').y },
    exit: { x: marker('exit_portal').x, y: marker('exit_portal').y },
    creepSpawns: [],
    baseCount: 1,
    countPerAdditionalPlayer: 0,
    hpPerWave: 0,
    damagePerWave: 0,
    hpPerAdditionalPlayer: 0,
    damagePerAdditionalPlayer: 0,
  },
  hongLietArenaScale,
);
for (const p of [
  hongLietDungeon.spawn,
  hongLietDungeon.exit,
  hongLietDefinition.spawn,
])
  if (
    blocked(
      p,
      22,
      hongLietDungeon.width,
      hongLietDungeon.height,
      hongLietDungeon.collision,
    )
  )
    throw Error('Boss map marker blocked.');
