import { blocked, type CreepDungeonDefinition } from '@volam/game-core';
import raw from './creep-beach-map.json' with { type: 'json' };
import { creepDungeon, creepDungeonSchema } from './dungeon.js';
import { m1Config } from './m1.js';
export const beachRoster = [
  'cua_khong_lo',
  'hai_xa',
  'hai_tac',
  'hai_tac_hoa_phao',
  'thuy_quy',
  'hai_vu',
] as const;
export const beachMapObjects = raw.layers.find(
  (l) => l.name === 'markers',
)!.objects!;
const marker = (name: string) => {
  const p = beachMapObjects.find((o) => o.name === name);
  if (!p) throw Error(`Missing Beach marker: ${name}`);
  return { x: p.x, y: p.y };
};
/** Existing generic M2A tuning, unchanged; species abilities are not supplied. */
export const beachDungeon: CreepDungeonDefinition = creepDungeonSchema.parse({
  ...creepDungeon,
  id: 'sea',
  width: raw.width * raw.tilewidth,
  height: raw.height * raw.tileheight,
  collision: raw.layers
    .find((l) => l.name === 'collision')!
    .objects!.map(({ x, y, width, height }) => ({ x, y, width, height })),
  spawn: marker('hero_spawn'),
  exit: marker('exit_portal'),
  creepSpawns: beachMapObjects
    .filter((o) => o.name.startsWith('creep_spawn_'))
    .map(({ x, y }) => ({ x, y })),
  creepRoster: [...beachRoster],
});
for (const p of [
  beachDungeon.exit,
  ...beachDungeon.creepSpawns,
  ...Array.from({ length: 6 }, (_, i) => ({
    x: beachDungeon.spawn.x,
    y: beachDungeon.spawn.y + 24 * i,
  })),
])
  if (
    blocked(
      p,
      m1Config.radius,
      beachDungeon.width,
      beachDungeon.height,
      beachDungeon.collision,
    )
  )
    throw Error(`Beach marker outside walkable bounds: ${JSON.stringify(p)}`);
