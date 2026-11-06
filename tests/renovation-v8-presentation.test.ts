import { it, expect } from 'vitest';
import { staffContact } from '../apps/game-client/src/renovation-followup-model.js';
it.each([
  [1, 0, 190],
  [-1, 0, 190],
  [0, 1, 120],
  [0, -1, 120],
])('retains the old long-staff strike footprint (%s,%s)', (fx, fy, min) => {
  const tip = staffContact(fx!, fy!);
  expect(Math.hypot(tip.x, tip.y)).toBeGreaterThanOrEqual(min!);
});
