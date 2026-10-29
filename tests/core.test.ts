import { describe, expect, it } from 'vitest';
import { createSeededRandom } from '@volam/game-core';

describe('headless seeded RNG starter', () => {
  it('matches the xorshift32 sequence for seed 1', () => {
    const next = createSeededRandom(1);
    expect(Array.from({ length: 5 }, () => next() * 0x1_0000_0000)).toEqual([
      270369, 67634689, 2647435461, 307599695, 2398689233,
    ]);
  });
  it('replays an independent seed stream and stays in [0, 1)', () => {
    const a = createSeededRandom(42);
    const b = createSeededRandom(42);
    for (let i = 0; i < 1000; i++) {
      const n = a();
      expect(n).toBe(b());
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
    expect(a()).not.toBe(createSeededRandom(43)());
  });
  it.each([0, -1, 1.5, NaN, Infinity, 0x1_0000_0000])(
    'rejects invalid seed %s',
    (seed) => {
      expect(() => createSeededRandom(seed)).toThrow(RangeError);
    },
  );
});
