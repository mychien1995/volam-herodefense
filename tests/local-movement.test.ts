import { m1Config } from '@volam/game-data';
import { expect, it } from 'vitest';
import { LocalMovement } from '../apps/game-client/src/local-movement.js';

it('predicts a bounded diagonal lead and rebases it on the latest server position', () => {
  const movement = new LocalMovement();
  const origin = { x: 800, y: 675 };
  movement.patch(1000);
  movement.move(1, 1, 1000);
  const first = movement.project(origin, 120, [], 1016)!;
  expect(first.x - origin.x).toBeCloseTo(120 * 0.016 * Math.SQRT1_2);
  expect(first.y - origin.y).toBeCloseTo(first.x - origin.x);
  movement.patch(1100);
  const rebased = { x: 804, y: 679 };
  const lead = movement.project(rebased, 120, [], 1134)!;
  expect(Math.hypot(lead.x - rebased.x, lead.y - rebased.y)).toBeCloseTo(
    (2 * 120) / m1Config.tickRate,
  );
  expect(movement.project(rebased, 120, [], 1300)).toBeUndefined();
});

it('uses the arena boundary and stops prediction for movement locks, release and reset', () => {
  const movement = new LocalMovement();
  const origin = { x: m1Config.radius, y: 675 };
  movement.patch(1000);
  movement.move(-1, 0, 1000);
  expect(movement.project(origin, 120, [], 1033)).toBeUndefined();
  movement.move(1, 0, 1000);
  expect(
    movement.project(origin, 120, [{ kind: 'root' }], 1033),
  ).toBeUndefined();
  movement.move(0, 0, 1033);
  expect(movement.project(origin, 120, [], 1050)).toBeUndefined();
  movement.move(1, 0, 1050);
  movement.reset();
  movement.patch(1051);
  expect(movement.project(origin, 120, [], 1070)).toBeUndefined();
});

it('honors the selected arena movement-only obstacles without predicting through water', () => {
  const movement = new LocalMovement(),
    origin = { x: 100, y: 100 };
  movement.patch(1000);
  movement.move(1, 0, 1000);
  expect(
    movement.project(origin, 120, [], 1033, [
      { x: 100 + m1Config.radius, y: 50, width: 80, height: 100 },
    ]),
  ).toBeUndefined();
  expect(movement.project(origin, 120, [], 1033, [])!.x).toBeGreaterThan(
    origin.x,
  );
});
