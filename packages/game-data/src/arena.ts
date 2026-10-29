import { z } from 'zod';
import raw from './arena-map.json' with { type: 'json' };
const objectSchema = z.object({
  id: z.number().int(),
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
      z.object({
        name: z.string(),
        type: z.string(),
        objects: z.array(objectSchema).optional(),
      }),
    ),
  })
  .parse(raw);
export const mapObjects = (layer: string) =>
  map.layers.find((item) => item.name === layer)?.objects ?? [];
const spawns = mapObjects('spawns');
const spawn = spawns.find((item) => item.name === 'hero_spawn');
if (!spawn) throw new Error('Arena needs a hero spawn.');
export const arena = Object.freeze({
  width: map.width * map.tilewidth,
  height: map.height * map.tileheight,
  tileSize: 32,
  spawn: { x: spawn.x, y: spawn.y },
  creepSpawns: spawns
    .filter((item) => item.name.startsWith('creep_'))
    .map(({ x, y }) => ({ x, y })),
  collision: mapObjects('collision').map(({ x, y, width, height }) => ({
    x,
    y,
    width,
    height,
  })),
  scenery: mapObjects('scenery'),
});
