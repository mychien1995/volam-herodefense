import { z } from 'zod';
import { blocked, type CreepDungeonDefinition } from '@volam/game-core';
import raw from './creep-forest-map.json' with { type: 'json' };
import forestRosterData from './forest-creep-roster.json' with { type: 'json' };
import { mapObjects } from './arena.js';
import { m1Config } from './m1.js';
import { renovationCollision } from './renovation-navigation.js';

const point = z.strictObject({
  x: z.number().finite(),
  y: z.number().finite(),
});
const rect = point.extend({
  width: z.number().positive(),
  height: z.number().positive(),
});
const object = z.object({
  name: z.string(),
  type: z.string(),
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().nonnegative(),
  height: z.number().nonnegative(),
});
const map = z
  .object({
    orientation: z.literal('orthogonal'),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    tilewidth: z.literal(32),
    tileheight: z.literal(32),
    layers: z.array(
      z.object({ name: z.string(), objects: z.array(object).optional() }),
    ),
  })
  .parse(raw);
export const dungeonMapObjects = map.layers.find(
  (l) => l.name === 'markers',
)!.objects!;
const marker = (name: string) => {
  const found = dungeonMapObjects.find((o) => o.name === name);
  if (!found) throw new Error(`Missing dungeon marker: ${name}`);
  return { x: found.x, y: found.y };
};
const arenaReturn = mapObjects('spawns').find(
  (o) => o.name === 'dungeon_return',
);
if (!arenaReturn)
  throw new Error('Missing authoritative dungeon return marker.');
export const creepDungeonSchema = z
  .strictObject({
    id: z.string().regex(/^[a-z_]+$/),
    width: z.number().positive(),
    height: z.number().positive(),
    collision: z.array(rect),
    spawn: point,
    creepSpawns: z.array(point).min(12),
    exit: point,
    arenaReturn: point,
    exitRange: z.number().positive(),
    capacity: z.literal(6),
    restTicks: z.number().int().positive(),
    respawnTicks: z.number().int().positive(),
    baseCount: z.number().int().positive(),
    rewardBaseCount: z.number().int().positive(),
    countPerAdditionalPlayer: z.number().nonnegative(),
    hpPerWave: z.number().nonnegative(),
    damagePerWave: z.number().nonnegative(),
    hpPerAdditionalPlayer: z.number().nonnegative(),
    damagePerAdditionalPlayer: z.number().nonnegative(),
    creepRoster: z
      .array(z.string().regex(/^[a-z_]+$/))
      .min(1)
      .optional(),
  })
  .superRefine((d, ctx) => {
    if (
      Math.ceil(
        d.baseCount * (1 + d.countPerAdditionalPlayer * (d.capacity - 1)),
      ) > d.creepSpawns.length
    )
      ctx.addIssue({
        code: 'custom',
        message:
          'Dungeon needs unique spawn slots for its maximum scaled wave.',
      });
  });
/** Director-authorized visual roster; all species retain the common M2A profile. */
export const forestRoster: readonly string[] = forestRosterData;
/** M2A prototype tuning, separate from mechanics and not a final balance claim. */
export const creepDungeon: CreepDungeonDefinition = creepDungeonSchema.parse({
  id: 'forest',
  creepRoster: [...forestRoster],
  width: map.width * 32,
  height: map.height * 32,
  collision: renovationCollision(
    'forest',
    map.width * 32,
    map.height * 32,
    map.layers
      .find((l) => l.name === 'collision')!
      .objects!.map(({ x, y, width, height }) => ({ x, y, width, height })),
  ),
  spawn: marker('hero_spawn'),
  creepSpawns: dungeonMapObjects
    .filter((o) => o.name.startsWith('creep_spawn_'))
    .map(({ x, y }) => ({ x, y })),
  exit: marker('exit_portal'),
  arenaReturn: { x: arenaReturn.x, y: arenaReturn.y },
  exitRange: 64,
  capacity: 6,
  restTicks: m1Config.tickRate * 2,
  respawnTicks: m1Config.tickRate * 5,
  baseCount: 10,
  rewardBaseCount: 6,
  countPerAdditionalPlayer: 0,
  hpPerWave: 0.15,
  damagePerWave: 0.1,
  hpPerAdditionalPlayer: 0.16,
  damagePerAdditionalPlayer: 0.08,
});
for (const p of [
  creepDungeon.spawn,
  creepDungeon.exit,
  ...creepDungeon.creepSpawns,
]) {
  if (
    blocked(
      p,
      m1Config.radius,
      creepDungeon.width,
      creepDungeon.height,
      creepDungeon.collision,
    )
  )
    throw new Error('Dungeon marker outside walkable map bounds.');
}
