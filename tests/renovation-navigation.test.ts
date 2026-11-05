import { expect, it } from 'vitest';
import { arena, creepDungeon, creepDungeons, m1Config } from '@volam/game-data';
import { blocked, moveCircle } from '@volam/game-core';
it('lets real movement cross the clearing and reach the south of Bamboo Forest', () => {
  const p = { ...creepDungeon.spawn };
  for (const target of [
    { x: 480, y: 320 },
    { x: 480, y: 616 },
    { x: 224, y: 616 },
  ]) {
    for (let n = 0; n < 200; n++) {
      const dx = target.x - p.x,
        dy = target.y - p.y,
        d = Math.hypot(dx, dy);
      if (d < 0.01) break;
      moveCircle(
        p,
        { x: (dx / d) * Math.min(8, d), y: (dy / d) * Math.min(8, d) },
        m1Config.radius,
        creepDungeon.width,
        creepDungeon.height,
        creepDungeon.collision,
      );
    }
    expect(p.x).toBeCloseTo(target.x);
    expect(p.y).toBeCloseTo(target.y);
  }
});
it('keeps sparse visible rocks and removes obsolete arena barriers', () => {
  expect(arena.collision).toHaveLength(0);
  for (const d of creepDungeons.filter((d) =>
    ['forest', 'desert', 'sea', 'hell'].includes(d.id),
  )) {
    const interior = d.collision.filter(
      (b) =>
        b.x > 0 &&
        b.y > 0 &&
        b.x + b.width < d.width &&
        b.y + b.height < d.height,
    );
    expect(interior.length, d.id).toBeLessThanOrEqual(2);
    for (const p of [d.spawn, d.exit, ...d.creepSpawns])
      expect(
        blocked(p, m1Config.radius, d.width, d.height, d.collision),
        d.id + JSON.stringify(p),
      ).toBe(false);
  }
});
