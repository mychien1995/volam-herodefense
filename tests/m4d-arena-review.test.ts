import { describe, expect, it } from 'vitest';
import {
  arenaIds,
  arenaVariants,
  arenaProps,
  arenaPropCollision,
  createInvasionDefinition,
  m1Config,
} from '@volam/game-data';
import { createWorld, InvasionDirector, stepWorld } from '@volam/game-core';
import {
  blocked,
  moveCircle,
  segmentRect,
} from '../packages/game-core/src/geometry.js';
import { findWalkPath } from '../packages/game-core/src/dungeon-navigation.js';
describe('M4D arena prop feet and painted entry registration', () => {
  for (const id of arenaIds) {
    it(`${id}: feet are solid, walk/dash cannot tunnel, all paired gates reach plaza`, () => {
      const v = arenaVariants[id];
      const [first] = arenaProps[id]!;
      const walls = arenaPropCollision(id);
      const foot = walls[0]!;
      expect(
        blocked(
          { x: foot.x + foot.width / 2, y: foot.y + foot.height / 2 },
          10,
          1600,
          1152,
          walls,
        ),
      ).toBe(true);
      for (const length of [90, 240]) {
        const h = { x: foot.x - 35, y: foot.y + foot.height / 2 };
        moveCircle(h, { x: length, y: 0 }, 10, 1600, 1152, v.collision);
        expect(h.x).toBeLessThanOrEqual(foot.x - 9.9);
      }
      const center = v.roadCenter;
      for (const row of [-18, 18])
        for (const start of [
          { x: 96, y: center.y + row },
          { x: 1504, y: center.y + row },
          { x: center.x + row, y: 320 },
          { x: center.x + row, y: 1056 },
        ]) {
          expect(blocked(start, 8, 1600, 1152, v.collision)).toBe(false);
          const path = findWalkPath(
            start,
            { x: 800, y: 680 },
            8,
            { width: 1600, height: 1152 },
            v.collision,
          );
          expect(path.length).toBeGreaterThan(0);
          for (let n = 1; n < path.length; n++)
            expect(
              v.collision.some(
                (w) => segmentRect(path[n - 1]!, path[n]!, w, 8) !== undefined,
              ),
            ).toBe(false);
        }
      // A roof/canopy is foreground, not a full sprite-sized invisible wall.
      if (id === 'dao_hoa_dao')
        expect(
          blocked(
            { x: first!.x - 80, y: first!.y - 65 },
            10,
            1600,
            1152,
            walls,
          ),
        ).toBe(false);
    });
    it(`${id}: actual creep AI keeps two rows centered until the plaza`, () => {
      const c = {
        ...structuredClone(m1Config),
        creepSpawns: [],
        collision: arenaVariants[id].collision,
      };
      const w = createWorld(c, 22),
        d = createInvasionDefinition(120, 2000, {
          portalCount: 4,
          rowsPerGate: 2,
        });
      const rc = arenaVariants[id].roadCenter;
      d.lanes.west.y = d.lanes.east.y = rc.y;
      d.lanes.north!.x = d.lanes.south!.x = rc.x;
      const director = new InvasionDirector(d, w);
      director.beforeStep(w, c, d.intervalTicks, 1);
      const west = [...w.creeps.values()].filter(
        (e) => e.invasion?.lane === 'west',
      );
      for (let i = 0; i < 90; i++) stepWorld(w, c);
      expect(west).toHaveLength(2);
      expect(west[0]!.y).toBeCloseTo(rc.y - 18, 5);
      expect(west[1]!.y).toBeCloseTo(rc.y + 18, 5);
      expect(west[0]!.x).toBeGreaterThan(west[0]!.spawn.x + 80);
    });
  }
});
