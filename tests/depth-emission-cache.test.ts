import { describe, expect, it, vi, afterEach } from 'vitest';
import { DepthEmissionPoints } from '../apps/game-client/src/world-depth-emission.js';
afterEach(() => vi.unstubAllGlobals());
describe('loading-time light cache', () => {
  it('shares all prepared tones between light systems and releases only scratch on clear', () => {
    let reads = 0;
    const data = new Uint8ClampedArray(48 * 48 * 4),
      i = (20 * 48 + 24) * 4;
    data[i] = 255;
    data[i + 1] = 155;
    data[i + 3] = 255;
    const context = {
      clearRect() {},
      drawImage() {},
      getImageData() {
        reads++;
        return { data };
      },
    };
    vi.stubGlobal('document', {
      createElement: () => ({
        width: 48,
        height: 48,
        getContext: () => context,
      }),
    });
    const frame = {
      x: 4,
      y: 6,
      cutX: 0,
      cutY: 0,
      cutWidth: 96,
      cutHeight: 144,
      realWidth: 110,
      realHeight: 160,
      source: { image: {} },
    } as any;
    const source = {
      frame,
      flipX: false,
      flipY: false,
      displayOriginX: 55,
      displayOriginY: 120,
      getWorldTransformMatrix: () => ({
        transformPoint: (x: number, y: number) => ({ x: x + 100, y: y + 200 }),
      }),
    } as any;
    const loading = new DepthEmissionPoints();
    loading.prepare(frame);
    expect(reads).toBe(1);
    loading.clear();
    const effects = new DepthEmissionPoints(),
      environment = new DepthEmissionPoints();
    const point = effects.world(source, 'warm');
    expect(point).toEqual({
      x: 100 + 4 + (22.5 / 48) * 96 - 55,
      y: 200 + 6 + (18.5 / 48) * 144 - 120,
      strength: 410 / 7000,
    });
    for (const tone of ['warm', 'cool', 'poison'])
      environment.world(source, tone);
    expect(reads).toBe(1);
    // Same atlas name/coordinates, new retained Frame after replacement: must sample again.
    const replacement = { ...frame };
    environment.world({ ...source, frame: replacement }, 'warm');
    expect(reads).toBe(2);
    source.flipX = true;
    source.flipY = true;
    const flipped = effects.world(source, 'warm');
    expect(flipped.x).toBe(100 + 110 - (4 + (22.5 / 48) * 96) - 55);
    expect(flipped.y).toBe(200 + 160 - (6 + (18.5 / 48) * 144) - 120);
  });
});
