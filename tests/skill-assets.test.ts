import { readFileSync, existsSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import {
  m1Config,
  skillArt,
  skillArtSchema,
  skillVisualStages,
} from '@volam/game-data';
describe('M3A skill asset contract', () => {
  it('maps all canonical skills to existing transparent atlas components and valid frames', () => {
    expect(Object.keys(skillVisualStages).sort()).toEqual(
      Object.keys(m1Config.skillCatalogue!).sort(),
    );
    let frames = 0;
    for (const a of skillArt.assets) {
      expect(existsSync(a.sheet)).toBe(true);
      expect(existsSync(a.atlas)).toBe(true);
      const atlas = JSON.parse(readFileSync(a.atlas, 'utf8')) as {
        frames: Record<
          string,
          { frame: { x: number; y: number; w: number; h: number } }
        >;
      };
      const png = readFileSync(a.sheet);
      expect(png.readUInt8(25)).toBe(6);
      const width = png.readUInt32BE(16),
        height = png.readUInt32BE(20);
      for (const tag of a.animations)
        for (const id of tag.frames) {
          const r = atlas.frames[id]!.frame;
          expect(r.x + r.w).toBeLessThanOrEqual(width);
          expect(r.y + r.h).toBeLessThanOrEqual(height);
          frames++;
        }
    }
    expect(frames).toBeGreaterThan(464);
    expect(
      skillArt.assets
        .filter((a) => a.sheet.includes('/cai-bang/'))
        .flatMap((a) => a.animations.flatMap((t) => t.frames)).length,
    ).toBe(464);
    for (const id of Object.keys(skillVisualStages)) {
      expect(skillArt.assets.some((a) => a.id === `${id}_character`)).toBe(
        true,
      );
      expect(skillArt.assets.some((a) => a.id === `${id}_vfx`)).toBe(true);
      const school = m1Config.progression!.skills[id]!.schoolId.replace(
        '_',
        '-',
      );
      expect(existsSync(`assets/exports/skills/${school}/${id}/icon.png`)).toBe(
        true,
      );
    }
  });
  it('rejects duplicate animation keys or inconsistent frame counts', () => {
    const duplicate = structuredClone(skillArt);
    duplicate.assets.push(duplicate.assets[0]!);
    expect(() => skillArtSchema.parse(duplicate)).toThrow();
    const bad = structuredClone(skillArt);
    bad.assets[0]!.animations[0]!.frameCount = 999;
    expect(() => skillArtSchema.parse(bad)).toThrow();
  });
});
