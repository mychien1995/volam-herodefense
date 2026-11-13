import type { CreepDungeonDefinition, Point, Rect } from '@volam/game-core';
/** Latest director decision: +10% in each dimension from the pre-feedback arena. */
export const bossArenaScale = 1.1;
export function scaleBossArena(
  d: CreepDungeonDefinition,
  scale = bossArenaScale,
): CreepDungeonDefinition {
  const point = (p: Point): Point => ({ x: p.x * scale, y: p.y * scale });
  const rect = (p: Rect): Rect => ({
    ...point(p),
    width: p.width * scale,
    height: p.height * scale,
  });
  d.width *= scale;
  d.height *= scale;
  d.spawn = point(d.spawn);
  d.exit = point(d.exit);
  d.collision = d.collision.map(rect);
  d.creepSpawns = d.creepSpawns.map(point);
  if (d.boss) {
    d.boss.spawn = point(d.boss.spawn);
    d.boss.bounds = rect(d.boss.bounds);
    d.boss.cannonRows = d.boss.cannonRows.map((y) => y * scale);
    d.boss.cannonColumns = d.boss.cannonColumns.map((x) => x * scale);
  }
  if (d.kimBoss) {
    for (const actor of Object.values(d.kimBoss.actors))
      Object.assign(actor, point(actor));
    d.kimBoss.bounds = rect(d.kimBoss.bounds);
    d.kimBoss.elephants.top *= scale;
    d.kimBoss.elephants.bottom *= scale;
  }
  if (d.chuBoss) d.chuBoss.spawn = point(d.chuBoss.spawn);
  if (d.bossEncounter) {
    const b = d.bossEncounter;
    b.spawn = point(b.spawn);
    b.summonSpawns = b.summonSpawns.map(point);
    b.edgeEmitters = b.edgeEmitters.map((p) => ({
      ...p,
      ...point(p),
    }));
  }
  return d;
}
