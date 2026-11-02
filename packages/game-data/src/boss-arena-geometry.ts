import type { CreepDungeonDefinition, Point, Rect } from '@volam/game-core';
/** Latest director decision: +10% in each dimension from the pre-feedback arena. */
export const bossArenaScale = 1.1;
export const bossArenaPoint = (p: Point): Point => ({
  x: p.x * bossArenaScale,
  y: p.y * bossArenaScale,
});
export const bossArenaRect = (p: Rect): Rect => ({
  ...bossArenaPoint(p),
  width: p.width * bossArenaScale,
  height: p.height * bossArenaScale,
});
export function enlargeBossArena(
  d: CreepDungeonDefinition,
): CreepDungeonDefinition {
  d.width *= bossArenaScale;
  d.height *= bossArenaScale;
  d.spawn = bossArenaPoint(d.spawn);
  d.exit = bossArenaPoint(d.exit);
  d.collision = d.collision.map(bossArenaRect);
  d.creepSpawns = d.creepSpawns.map(bossArenaPoint);
  if (d.boss) {
    d.boss.spawn = bossArenaPoint(d.boss.spawn);
    d.boss.bounds = bossArenaRect(d.boss.bounds);
    d.boss.cannonRows = d.boss.cannonRows.map((y) => y * bossArenaScale);
    d.boss.cannonColumns = d.boss.cannonColumns.map((x) => x * bossArenaScale);
  }
  if (d.kimBoss) {
    for (const actor of Object.values(d.kimBoss.actors))
      Object.assign(actor, bossArenaPoint(actor));
    d.kimBoss.bounds = bossArenaRect(d.kimBoss.bounds);
    d.kimBoss.elephants.top *= bossArenaScale;
    d.kimBoss.elephants.bottom *= bossArenaScale;
  }
  if (d.chuBoss) d.chuBoss.spawn = bossArenaPoint(d.chuBoss.spawn);
  if (d.bossEncounter) {
    const b = d.bossEncounter;
    b.spawn = bossArenaPoint(b.spawn);
    b.summonSpawns = b.summonSpawns.map(bossArenaPoint);
    b.edgeEmitters = b.edgeEmitters.map((p) => ({
      ...p,
      ...bossArenaPoint(p),
    }));
  }
  return d;
}
