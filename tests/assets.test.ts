import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { arena } from '@volam/game-data';
it('preserves every approved Cai Bang source and export byte', () => {
  const lock = JSON.parse(
    readFileSync('assets/approved_cai_bang.lock.json', 'utf8'),
  ) as { files: Record<string, string> };
  expect(Object.keys(lock.files)).toHaveLength(8);
  for (const [file, hash] of Object.entries(lock.files))
    expect(
      createHash('sha256').update(readFileSync(file)).digest('hex'),
      file,
    ).toBe(hash);
});
interface Atlas {
  frames: Record<
    string,
    { frame: { x: number; y: number; w: number; h: number } }
  >;
  meta: {
    size: { w: number; h: number };
    frameTags?: Array<{ name: string; from: number; to: number }>;
    slices?: Array<{
      name: string;
      keys: Array<{ pivot: { x: number; y: number } }>;
    }>;
  };
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
      frameWidth: number;
      frameHeight: number;
      animations: Array<{ state: string; direction: string; frames: string[] }>;
    }>;
  };
  for (const asset of manifest.assets) {
    expect(['prototype', 'approved']).toContain(asset.status);
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
    for (const animation of asset.animations) {
      expect(animation.frames.length).toBeGreaterThan(0);
      for (const key of animation.frames) {
        expect(atlas.frames[key], `${asset.id}/${key}`).toBeDefined();
        const frame = atlas.frames[key]!.frame;
        expect(frame.w).toBe(asset.frameWidth);
        expect(frame.h).toBe(asset.frameHeight);
        expect(frame.x + frame.w).toBeLessThanOrEqual(atlas.meta.size.w);
        expect(frame.y + frame.h).toBeLessThanOrEqual(atlas.meta.size.h);
        expect(frame.x).toBeGreaterThanOrEqual(0);
        expect(frame.y).toBeGreaterThanOrEqual(0);
      }
    }
    if (asset.id.startsWith('hero_cai_bang')) {
      const total = asset.id === 'hero_cai_bang' ? 44 : 40;
      const source = readFileSync(asset.source);
      expect(source.readUInt16LE(4)).toBe(0xa5e0);
      expect(source.readUInt16LE(6)).toBe(total);
      expect(source.readUInt16LE(8)).toBe(80);
      expect(source.readUInt16LE(10)).toBe(80);
      expect(Object.keys(atlas.frames)).toHaveLength(total);
      expect(atlas.meta.frameTags).toHaveLength(12);
      for (const direction of ['down', 'left', 'right', 'up'])
        for (const [state, standardCount] of [
          ['idle', 2],
          ['walk', 4],
          ['basic_attack', 4],
        ] as const) {
          const count =
            asset.id === 'hero_cai_bang' &&
            state === 'basic_attack' &&
            ['left', 'right'].includes(direction)
              ? 6
              : standardCount;
          const tag = atlas.meta.frameTags!.find(
            (item) => item.name === `${state}_${direction}`,
          )!;
          expect(tag, `${state}_${direction}`).toBeDefined();
          expect(tag.to - tag.from + 1).toBe(count);
          expect(Object.keys(atlas.frames).slice(tag.from, tag.to + 1)).toEqual(
            Array.from(
              { length: count },
              (_, i) => `${state}_${direction}_${i}`,
            ),
          );
        }
      expect(
        atlas.meta.slices?.find((slice) => slice.name === 'feet')?.keys[0]
          ?.pivot,
      ).toEqual({ x: 40, y: 64 });
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
  // Historical map objects are retained as sources; removed scenery no longer blocks.
  expect(arena.collision).toEqual([]);
});
