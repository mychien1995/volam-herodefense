import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const hash = (p: string) =>
  createHash('sha256').update(readFileSync(p)).digest('hex');
describe('r3 production import contract', () => {
  it('imports only approved selected cels and preserves every protected source byte', () => {
    const root = 'assets/m3d-feedback-review-r3/';
    const pack = read('apps/game-client/src/m3d-r3-art.generated.json');
    expect(pack.assets).toHaveLength(71);
    expect(
      pack.assets.reduce((n: number, c: any) => n + c.animations.length, 0),
    ).toBe(346);
    for (const file of [
      'director_approval_ca_diep_batch01.json',
      'batch02-pha-giap-bong/director_approval_pha_giap_review3.json',
      'batch03-remaining/director_approval_review6.json',
    ]) {
      const approval = read(root + file),
        lock = read(approval.lock);
      expect(hash(approval.lock)).toBe(approval.lockSha256);
      for (const [path, sha] of Object.entries(lock.files))
        expect(hash(path), path).toBe(sha);
      const selections =
        lock.components ??
        Object.entries(lock.selectedTags).map(([id, tags]: [string, any]) => ({
          id,
          approvedTags: tags.map((name: string) => ({ name })),
        }));
      for (const selected of selections) {
        const c = pack.assets.find((c: any) => c.sourceId === selected.id);
        expect(c.animations.map((a: any) => a.name)).toEqual(
          selected.approvedTags.map((a: any) => a.name),
        );
        const atlas = read('apps/game-client/public/' + c.atlas);
        for (const a of c.animations)
          for (const f of a.frames) expect(atlas.frames[f], f).toBeDefined();
      }
    }
  });
  it('keeps production scenery original/transparent and separate from flattened concepts', () => {
    const root = 'assets/m3d-r3-arena-production/';
    const p = read(root + 'provenance.json'),
      atlas = read(root + 'scenery.json');
    expect(hash(root + p.source)).toBe(p.sourceSha256);
    expect(
      hash('apps/game-client/public/assets/m3d_r3/arena_scenery.png'),
    ).toBe(p.sourceSha256);
    const png = readFileSync(root + p.source);
    expect(png[25]).toBe(6); // RGBA source, not a flattened JPEG/floor illustration.
    expect(Object.keys(atlas.frames)).toHaveLength(16);
    for (const f of Object.values(atlas.frames) as any[]) {
      expect(f.frame.x + f.frame.w).toBeLessThanOrEqual(png.readUInt32BE(16));
      expect(f.frame.y + f.frame.h).toBeLessThanOrEqual(png.readUInt32BE(20));
      expect(f.frame.w).toBeGreaterThan(0);
      expect(f.frame.h).toBeGreaterThan(0);
    }
  });
});
