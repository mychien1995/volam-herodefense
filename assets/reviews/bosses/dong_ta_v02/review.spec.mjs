import { test, expect } from '@playwright/test';
import { runReview } from './verify.mjs';
import {
  DEMO,
  random,
  radialPlan,
  petalPlan,
  fourSlashPlan,
  FACING,
  clawFrontContains,
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
    expect(petals.length).toBe(40);
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
  const patterns = new Set();
  for (let n = 0; n < 100; n++) {
    const plan = fourSlashPlan(Math.floor(next() * 4294967296));
    patterns.add(plan.kind);
    expect(plan.angles).toHaveLength(4);
    expect(
      plan.angles
        .slice(1)
        .every((a, i) => Math.abs(a - plan.angles[i] - Math.PI / 2) < 1e-10),
    ).toBeTruthy();
  }
  expect([...patterns].sort()).toEqual(['cross', 'x']);
  for (const facing of Object.keys(FACING)) {
    const [fx, fy] = FACING[facing],
      mai = DEMO.field;
    const strokes = clawStrokes(mai, facing);
    expect(
      strokes.every((s) =>
        [s.from, s.to].every(
          (p) => (p.x - mai.x) * fx + (p.y - mai.y + 20) * fy > 0,
        ),
      ),
    ).toBeTruthy();
    expect(
      clawFrontContains(mai, facing, {
        x: mai.x + fx * 78,
        y: mai.y + fy * 78,
      }),
    ).toBeTruthy();
    expect(
      clawFrontContains(mai, facing, {
        x: mai.x - fx * 78,
        y: mai.y - fy * 78,
      }),
    ).toBeFalsy();
    expect(
      clawFrontContains(mai, facing, {
        x: mai.x + fx * 78 - fy * 90,
        y: mai.y + fy * 78 + fx * 90,
      }),
    ).toBeFalsy();
  }
  expect(DEMO.thrust.range).toBeGreaterThan(
    Math.max(...Object.values(DEMO.referenceBasics)),
  );
  expect(DEMO.thrust.angle).toBe(Math.PI);
});
test('Dong Ta feedback 02 sprite and VFX preview only', async () => {
  await runReview();
});
