import { blocked, type CreepDungeonDefinition } from '@volam/game-core';
import raw from './creep-desert-map.json' with { type: 'json' };
import { creepDungeon, creepDungeonSchema } from './dungeon.js';
import { m1Config } from './m1.js';
import { renovationCollision } from './renovation-navigation.js';

export const desertRoster = [
  'bo_cap_cat',
  'sa_xa',
  'sa_tac',
  'cung_thu_sa_mac',
  'xac_uop',
  'cu_nhan_sa_thach',
] as const;
export const desertMapObjects = raw.layers.find(
  (l) => l.name === 'markers',
)!.objects!;
const marker = (name: string) => {
  const p = desertMapObjects.find((o) => o.name === name);
  if (!p) throw new Error(`Missing desert marker: ${name}`);
  return { x: p.x, y: p.y };
};
/** Existing M2A tuning, unchanged. Per-species stats/abilities have not been supplied. */
export const desertDungeon: CreepDungeonDefinition = creepDungeonSchema.parse({
  ...creepDungeon,
  id: 'desert',
  width: raw.width * raw.tilewidth,
  height: raw.height * raw.tileheight,
  collision: renovationCollision(
    'desert',
    raw.width * raw.tilewidth,
    raw.height * raw.tileheight,
    raw.layers
      .find((l) => l.name === 'collision')!
      .objects!.map(({ x, y, width, height }) => ({ x, y, width, height })),
  ),
  spawn: marker('hero_spawn'),
  exit: marker('exit_portal'),
  creepSpawns: desertMapObjects
    .filter((o) => o.name.startsWith('creep_spawn_'))
    .map(({ x, y }) => ({ x, y })),
  creepRoster: [...desertRoster],
});
for (const p of [
  desertDungeon.exit,
  ...desertDungeon.creepSpawns,
  ...Array.from({ length: 6 }, (_, i) => ({
    x: desertDungeon.spawn.x,
    y: desertDungeon.spawn.y + 24 * i,
  })),
]) {
  if (
    blocked(
      p,
      m1Config.radius,
      desertDungeon.width,
      desertDungeon.height,
      desertDungeon.collision,
    )
  )
    throw new Error('Desert marker outside walkable map bounds.');
}
