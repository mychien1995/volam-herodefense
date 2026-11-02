import { test, expect } from '@playwright/test';
import { runReview } from './verify.mjs';
import {
  DEMO,
  PATHS,
  random,
  radialPlan,
  petalPlan,
  dashPath,
  constrain,
  fieldDistance,
  clawStrokes,
} from './choreography.mjs';

test('Requested preview geometry stays bounded and genuinely varies between seeded casts', () => {
  const counts = new Set(),
    next = random(23898412);
  for (let n = 0; n < 150; n++) {
    const seed = Math.floor(next() * 4294967296),
      radial = radialPlan(seed),
      petals = petalPlan(seed);
    counts.add(radial.count);
    expect(radial.count).toBeGreaterThanOrEqual(8);
    expect(radial.count).toBeLessThanOrEqual(14);
    const gaps = radial.angles.slice(1).map((v, i) => v - radial.angles[i]);
    expect(
      gaps.every((v) => Math.abs(v - (Math.PI * 2) / radial.count) < 1e-10),
    ).toBeTruthy();
    expect(petals.length).toBe(48);
    expect(
      petals.every(
        (p) =>
          fieldDistance(p) < 1 && Math.abs(p.blast - p.arrival - 2.8) < 1e-9,
      ),
    ).toBeTruthy();
    expect(
      petals.every((p, i) =>
        petals
          .slice(i + 1)
          .every(
            (q) =>
              Math.hypot(p.x - q.x, p.y - q.y) >= DEMO.petals.minSeparation,
          ),
      ),
    ).toBeTruthy();
    expect(
      fieldDistance(
        constrain({ x: next() * 6000 - 3000, y: next() * 6000 - 3000 }),
      ),
    ).toBeLessThanOrEqual(1.000001);
  }
  expect([...counts].sort((a, b) => a - b)).toEqual([8, 9, 10, 11, 12, 13, 14]);
  for (const name of Object.keys(PATHS))
    for (const facing of ['up', 'down', 'left', 'right'])
      expect(
        dashPath(name, facing).every((p) => fieldDistance(p) <= 1),
      ).toBeTruthy();
  const strokes = clawStrokes(DEMO.field);
  expect(strokes[0].from.y).toBeLessThan(strokes[0].to.y);
  expect(strokes[1].from.y).toBeGreaterThan(strokes[1].to.y);
  expect(DEMO.thrust.range).toBeGreaterThan(
    Math.max(...Object.values(DEMO.referenceBasics)),
  );
  expect(DEMO.thrust.angle).toBe(Math.PI);
});
test('Dong Ta feedback 01 sprite and VFX preview only', async () => {
  await runReview();
});
