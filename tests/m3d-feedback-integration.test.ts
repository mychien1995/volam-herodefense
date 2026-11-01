import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { m3dSkillIds } from '../apps/game-client/src/m3d-feedback-policy.js';
const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const base = 'assets/m3d-feedback-visual/';
test('r2 runtime is the exact selected subset, preserving ordered cels, pivots and approved bytes', () => {
  const approval = read(base + 'director_approval_r2.json'),
    lock = read(base + 'approved_visual_r2.lock.json');
  expect(approval.visualApproved).toBe(true);
  expect(
    createHash('sha256')
      .update(readFileSync(base + 'approved_visual_r2.lock.json'))
      .digest('hex'),
  ).toBe(approval.lockSha256);
  for (const [file, hash] of Object.entries(lock.files))
    expect(
      createHash('sha256').update(readFileSync(file)).digest('hex'),
      file,
    ).toBe(hash);
  const runtime = read('apps/game-client/src/m3d-feedback-art.generated.json');
  for (const c of lock.components) {
    const a = runtime.assets.find((a: { id: string }) => a.id === c.id);
    expect(a.animations.map((t: { name: string }) => t.name)).toEqual(
      c.approvedTags.map((t: { name: string }) => t.name),
    );
    for (const selected of c.approvedTags)
      expect(
        a.animations.find((t: { name: string }) => t.name === selected.name)
          .frames,
      ).toEqual(selected.frames);
    for (const t of a.animations)
      expect(t.frames.length).toBe(t.frameDurationsMs.length);
    const exported = base + 'exported/' + c.id + '/' + c.id;
    const runtimePng = readFileSync('apps/game-client/public/' + a.sheet);
    const runtimeAtlas = readFileSync('apps/game-client/public/' + a.atlas);
    expect(runtimePng.equals(readFileSync(exported + '.png'))).toBe(true);
    expect(runtimeAtlas.equals(readFileSync(exported + '.json'))).toBe(true);
  }
  expect(
    runtime.assets.find(
      (a: { id: string }) => a.id === 'm3d_vo_dang_quyen_character',
    ).origin,
  ).toEqual([0.5, 0.8]);
  expect(
    runtime.assets.find(
      (a: { id: string }) => a.id === 'm3d_khang_long_burn_vfx',
    ).origin,
  ).toEqual([0.5, 0.59375]);
  expect(m3dSkillIds.size).toBe(15);
});
