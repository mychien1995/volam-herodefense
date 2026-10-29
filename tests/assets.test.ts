import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { arena } from '@volam/game-data';
interface Atlas {
  frames: Record<
    string,
    { frame: { x: number; y: number; w: number; h: number } }
  >;
  meta: { size: { w: number; h: number } };
}
it('has real original PNG/JSON frames for every required state and facing', () => {
  const manifest = JSON.parse(readFileSync('assets/manifest.json', 'utf8')) as {
    assets: Array<{
      id: string;
      source: string;
      status: string;
      license: string;
      sheet: string;
      atlas?: string;
    }>;
  };
  for (const asset of manifest.assets) {
    expect(asset.status).toBe('prototype');
    expect(asset.license).toContain('Original');
    expect(readFileSync(asset.source).length).toBeGreaterThan(0);
    const png = readFileSync(`assets/exports/${asset.sheet}`);
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    if (!asset.atlas) continue;
    const atlas = JSON.parse(
      readFileSync(`assets/exports/${asset.atlas}`, 'utf8'),
    ) as Atlas;
    expect(png.readUInt32BE(16)).toBe(atlas.meta.size.w);
    expect(png.readUInt32BE(20)).toBe(atlas.meta.size.h);
    for (const state of [
      'idle',
      'walk',
      'basic_attack',
      'cast',
      'hurt',
      'death',
    ])
      for (const direction of ['up', 'down', 'left', 'right'])
        for (let i = 0; i < 4; i++) {
          const frame = atlas.frames[`${state}_${direction}_${i}`]!.frame;
          expect(frame.w).toBe(48);
          expect(frame.h).toBe(48);
          expect(frame.x + frame.w).toBeLessThanOrEqual(atlas.meta.size.w);
          expect(frame.y + frame.h).toBeLessThanOrEqual(atlas.meta.size.h);
        }
  }
});
it('uses an orthogonal square-tile map and the same collision objects on the server', () => {
  const raw = JSON.parse(readFileSync('maps/arena.tmj', 'utf8')) as {
    orientation: string;
    tilewidth: number;
    tileheight: number;
    layers: Array<{
      name: string;
      objects?: Array<{ x: number; y: number; width: number; height: number }>;
    }>;
  };
  expect(raw.orientation).toBe('orthogonal');
  expect(raw.tilewidth).toBe(raw.tileheight);
  expect(arena.collision).toEqual(
    raw.layers
      .find((layer) => layer.name === 'collision')
      ?.objects?.map(({ x, y, width, height }) => ({ x, y, width, height })),
  );
});
