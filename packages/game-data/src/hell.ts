import { blocked, type CreepDungeonDefinition } from '@volam/game-core';
import raw from './creep-hell-map.json' with { type: 'json' };
import { creepDungeon, creepDungeonSchema } from './dungeon.js';
import { m1Config } from './m1.js';
import { renovationCollision } from './renovation-navigation.js';
export const hellRoster = [
  'hell_xich_quy',
  'hell_dia_nguc_khuyen',
  'hell_dung_nham_linh',
  'hell_hac_viem_phap_su',
  'hell_hac_dien_nguu_ma',
  'hell_dung_nham_cu_nhan',
] as const;
export const hellMapObjects = raw.layers.find(
  (l) => l.name === 'markers',
)!.objects!;
const marker = (name: string) => {
  const p = hellMapObjects.find((o) => o.name === name);
  if (!p) throw Error(`Missing Hell marker: ${name}`);
  return { x: p.x, y: p.y };
};
/** Existing generic M2A tuning, unchanged; species abilities are not supplied. */
export const hellDungeon: CreepDungeonDefinition = creepDungeonSchema.parse({
  ...creepDungeon,
  id: 'hell',
  width: raw.width * raw.tilewidth,
  height: raw.height * raw.tileheight,
  collision: renovationCollision(
    'hell',
    raw.width * raw.tilewidth,
    raw.height * raw.tileheight,
    raw.layers
      .find((l) => l.name === 'collision')!
      .objects!.map(({ x, y, width, height }) => ({ x, y, width, height })),
  ),
  spawn: marker('hero_spawn'),
  exit: marker('exit_portal'),
  creepSpawns: hellMapObjects
    .filter((o) => o.name.startsWith('creep_spawn_'))
    .map(({ x, y }) => ({ x, y })),
  creepRoster: [...hellRoster],
});
for (const p of [
  hellDungeon.exit,
  ...hellDungeon.creepSpawns,
  ...Array.from({ length: 6 }, (_, i) => ({
    x: hellDungeon.spawn.x,
    y: hellDungeon.spawn.y + 24 * i,
  })),
])
  if (
    blocked(
      p,
      m1Config.radius,
      hellDungeon.width,
      hellDungeon.height,
      hellDungeon.collision,
    )
  )
    throw Error(`Hell marker outside walkable bounds: ${JSON.stringify(p)}`);
