import { z } from 'zod';
import {
  blocked,
  type BossEncounterDefinition,
  type BossAttackDefinition,
  type CreepDungeonDefinition,
} from '@volam/game-core';
import raw from './boss-co-mo-map.json' with { type: 'json' };
import { creepDungeon } from './dungeon.js';
import { m1Config } from './m1.js';
import { enlargeBossArena } from './boss-arena-geometry.js';
const hz = m1Config.tickRate;
const markers = raw.layers.find((l) => l.name === 'markers')!
  .objects! as Array<{
  name: string;
  x: number;
  y: number;
  properties?: Array<{ name: string; value: number }>;
}>;
const marker = (name: string) => {
  const p = markers.find((p) => p.name === name);
  if (!p) throw Error(`Missing Cổ Mộ marker: ${name}`);
  return { x: p.x, y: p.y };
};
const stats = {
  ...m1Config.creep,
  hp: 1800,
  defense: 12,
  speed: 115,
  radius: 18,
  damage: 12,
  attackRange: 70,
  detectionRange: 1600,
  attackCooldownTicks: hz,
  xp: 600,
  gold: 120,
};
const attack = (
  id: BossAttackDefinition['id'],
  nameVi: string,
  windup: number,
  damage: number,
  range: number,
  speed = 0,
): BossAttackDefinition => ({
  id,
  nameVi,
  windupTicks: Math.ceil(hz * windup),
  recoveryTicks: Math.ceil(hz * 0.4),
  damage,
  range,
  speed,
  radius: id === 'bang_phach_ngan_cham' ? 7 : 16,
  halfAngle: id === 'phat_tran_cong' ? Math.PI / 3 : Math.PI / 4,
});
/** Encounter trial tuning; fixed strength for solo/shared, never inferred from art. */
export const lyMacSauEncounter: BossEncounterDefinition = {
  id: 'ly_mac_sau',
  spawn: marker('boss_spawn'),
  stats,
  controlResistance: 0.8,
  openingTicks: hz * 2,
  intervalTicks: Math.ceil(hz * 0.65),
  emptyResetTicks: hz * 30,
  respawnTicks: hz * 30,
  attacks: [
    {
      ...attack('ly_mac_sau_basic', 'Phất trần', 0.3, 12, 144),
      halfAngle: Math.PI,
    },
    attack('bang_phach_ngan_cham', 'Băng Phách Ngân Châm', 0.6, 14, 864, 480),
    attack('xich_luyen_chuong', 'Xích Luyện Chưởng', 0.9, 18, 620, 300),
    attack('phat_tran_cong', 'Phất Trần Công', 0.4, 18, 120),
    attack('co_mo_kiem_phap', 'Cổ Mộ Kiếm Pháp', 0.75, 0, 0),
    attack('ngu_doc_chuong', 'Ngũ Độc Chưởng', 1, 16, 1100, 250),
  ],
  rotation: [
    'bang_phach_ngan_cham',
    'xich_luyen_chuong',
    'co_mo_kiem_phap',
    'ngu_doc_chuong',
    'phat_tran_cong',
  ],
  summonCount: 4,
  summonLimit: 8,
  summonCountChoices: [4, 6, 8],
  summonProjectile: {
    mode: 'projectile',
    damage: 5,
    speed: 300,
    range: 500,
    radius: 6,
    count: 1,
    spacingTicks: 0,
    splashRadius: 0,
    burnDamage: 0,
    burnTicks: 0,
  },
  summonLifetimeTicks: hz * 16,
  summonStats: {
    ...m1Config.creep,
    hp: 60,
    damage: 5,
    speed: 70,
    attackRange: 360,
    attackCooldownTicks: hz,
    detectionRange: 1600,
    xp: 0,
    gold: 0,
  },
  summonSpawns: [0, 1, 2, 3].map((i) => marker('summon_spawn_' + i)),
  edgeEmitters: markers
    .filter((p) => p.name.startsWith('emitter_'))
    .map((p) => ({
      x: p.x,
      y: p.y,
      fx: p.properties!.find((v) => v.name === 'fx')!.value,
      fy: p.properties!.find((v) => v.name === 'fy')!.value,
    })),
  loot: [
    { id: 'co_mo_ngoc_boi', nameVi: 'Cổ Mộ Ngọc Bội' },
    { id: 'ngan_cham_nang', nameVi: 'Ngân Châm Nang' },
  ],
};
const positive = z.number().finite().positive();
const nonnegative = z.number().finite().nonnegative();
const pointSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});
const statsSchema = z.object({
  hp: positive,
  defense: nonnegative,
  speed: nonnegative,
  radius: positive,
  damage: nonnegative,
  attackRange: positive,
  detectionRange: positive,
  attackCooldownTicks: positive.int(),
  respawnTicks: positive.int(),
  xp: nonnegative.int(),
  gold: nonnegative.int(),
  assistTicks: positive.int(),
});
z.object({
  stats: statsSchema,
  summonStats: statsSchema,
  spawn: pointSchema,
  summonSpawns: z.array(pointSchema).length(4),
  edgeEmitters: z
    .array(
      pointSchema
        .extend({ fx: z.number().finite(), fy: z.number().finite() })
        .refine((p) => Math.abs(p.fx) + Math.abs(p.fy) === 1),
    )
    .length(12),
  openingTicks: positive.int(),
  intervalTicks: positive.int(),
  emptyResetTicks: z.literal(hz * 30),
  respawnTicks: positive.int(),
  controlResistance: nonnegative.max(0.95),
  summonCount: positive.int().max(4),
  summonLimit: positive.int().max(8),
  summonLifetimeTicks: positive.int(),
  attacks: z
    .array(
      z.object({
        id: z.string(),
        nameVi: z.string(),
        windupTicks: positive.int(),
        recoveryTicks: positive.int(),
        damage: nonnegative,
        range: nonnegative,
        speed: nonnegative,
        radius: positive,
        halfAngle: positive.max(Math.PI),
      }),
    )
    .length(6),
  loot: z.array(z.object({ id: z.string(), nameVi: z.string() })).min(1),
}).parse(lyMacSauEncounter);
if (
  new Set(lyMacSauEncounter.attacks.map((a) => a.id)).size !== 6 ||
  lyMacSauEncounter.rotation.some(
    (id) => !lyMacSauEncounter.attacks.some((a) => a.id === id),
  ) ||
  lyMacSauEncounter.summonCount > lyMacSauEncounter.summonLimit
)
  throw Error('Invalid Lý Mạc Sầu rotation/summon tuning');
export const coMoDungeon: CreepDungeonDefinition = enlargeBossArena({
  ...creepDungeon,
  id: 'co_mo',
  width: raw.width * 32,
  height: raw.height * 32,
  collision: raw.layers
    .find((l) => l.name === 'collision')!
    .objects!.map(({ x, y, width, height }) => ({ x, y, width, height })),
  spawn: marker('hero_spawn'),
  exit: marker('exit_portal'),
  creepSpawns: [marker('boss_spawn')],
  baseCount: 1,
  countPerAdditionalPlayer: 0,
  hpPerAdditionalPlayer: 0,
  damagePerAdditionalPlayer: 0,
  hpPerWave: 0,
  damagePerWave: 0,
  creepRoster: undefined,
  bossEncounter: lyMacSauEncounter,
});
for (const p of [
  ...Array.from({ length: 6 }, (_, i) => ({
    x: coMoDungeon.spawn.x,
    y: coMoDungeon.spawn.y + i * 24,
  })),
  coMoDungeon.exit,
  lyMacSauEncounter.spawn,
  ...lyMacSauEncounter.summonSpawns,
  ...lyMacSauEncounter.edgeEmitters,
])
  if (
    blocked(p, 18, coMoDungeon.width, coMoDungeon.height, coMoDungeon.collision)
  )
    throw Error('Cổ Mộ marker intersects collision: ' + JSON.stringify(p));
