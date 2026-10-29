/** Small, reproducible RNG starter. No clock, rendering, networking or I/O. */
export function createSeededRandom(seed: number): () => number {
  if (!Number.isInteger(seed) || seed < 1 || seed > 0xffff_ffff) {
    throw new RangeError('Seed must be an integer from 1 to 4294967295.');
  }

  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
}
