import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const read = (p: string) =>
  JSON.parse(readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
const hash = (p: string) =>
  createHash('sha256').update(readFileSync(p)).digest('hex');
it('retains every approved input byte and ships only selected atlas frames/clips with original feet pivots', () => {
  const lock = read('assets/approved_dong_ta.lock.json'),
    approval = read(lock.approvalRecord),
    source = read('assets/reviews/bosses/dong_ta_v02/data.json'),
    playback = read('apps/game-client/src/dong-playback.json');
  for (const [p, h] of Object.entries(lock.files)) expect(hash(p), p).toBe(h);
  let clips = 0,
    frames = 0;
  expect(Object.keys(playback.bundles).sort()).toEqual(
    Object.keys(approval.selectedBundles).sort(),
  );
  for (const [id, s] of Object.entries(approval.selectedBundles) as Array<
    [string, { image: string; clips: string[]; origin: number[] }]
  >) {
    const extra =
      id === 'dong'
        ? read('assets/approved_wave_boss_feedback_v01.lock.json')
            .additionalDongClips
        : [];
    const expectedClips = source.bundles[id].clips
      .filter((c: { name: string }) => [...s.clips, ...extra].includes(c.name))
      .map((c: { name: string }) => c.name);
    const b = source.bundles[id],
      p = playback.bundles[id],
      atlas = read(`apps/game-client/public/assets/dong_ta/${id}.json`),
      png = readFileSync(s.image),
      width = png.readUInt32BE(16),
      height = png.readUInt32BE(20);
    expect(hash(`apps/game-client/public/assets/dong_ta/${id}.png`)).toBe(
      hash(s.image),
    );
    expect(p.origin).toEqual(s.origin);
    expect(p.clips.map((c: { name: string }) => c.name)).toEqual(expectedClips);
    const selected = new Set<string>();
    for (const c of p.clips) {
      clips++;
      for (const frame of c.frames) {
        selected.add(frame);
        const f = atlas.frames[frame].frame;
        expect(atlas.frames[frame]).toEqual(b.frames[frame]);
        expect(f.x).toBeGreaterThanOrEqual(0);
        expect(f.y).toBeGreaterThanOrEqual(0);
        expect(f.x + f.w).toBeLessThanOrEqual(width);
        expect(f.y + f.h).toBeLessThanOrEqual(height);
      }
    }
    expect(Object.keys(atlas.frames).sort()).toEqual([...selected].sort());
    frames += selected.size;
  }
  expect(clips).toBe(113);
  expect(frames).toBe(452);
  for (const excluded of ['dash', 'hero', 'cai', 'thien'])
    expect(playback.bundles[excluded]).toBeUndefined();
});
