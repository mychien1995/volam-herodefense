import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const hash = (p: string) =>
  createHash('sha256').update(readFileSync(p)).digest('hex');
it('ships the exact director-approved wave PNGs and frame rectangles, durations and feet pivots', () => {
  const lock = read('assets/approved_wave_boss_feedback_v01.lock.json');
  expect(lock.status).toBe('APPROVED_PREVIEW_VFX');
  for (const [p, h] of Object.entries(lock.files)) expect(hash(p), p).toBe(h);
  const source = read('assets/reviews/wave_boss_feedback_v02/data.json');
  const v2 = read('assets/approved_wave_boss_feedback_v02.lock.json');
  for (const [p, h] of Object.entries(v2.files)) expect(hash(p), p).toBe(h);
  const runtime = read(
    'apps/game-client/src/wave-boss-feedback-art.generated.json',
  );
  for (const [id, b] of Object.entries(runtime.bundles) as [string, any][]) {
    for (const field of ['frames', 'clips', 'origin'])
      expect(b[field], id + ':' + field).toEqual(source.bundles[id][field]);
    if (
      ![
        'nam_de_ring',
        'tay_doc_cloud_v2',
        'tay_doc_impact',
        'snake_bolt',
        'poison_bolt',
        'gold_bolt',
        'spotlight',
      ].includes(id)
    )
      continue;
    const folder = 'apps/game-client/public/assets/wave-boss-feedback/';
    expect(hash(folder + id + '.png')).toBe(
      hash(
        'assets/reviews/wave_boss_feedback_' +
          (['snake_bolt', 'poison_bolt', 'gold_bolt', 'spotlight'].includes(id)
            ? 'v02'
            : 'v01') +
          '/exports/' +
          id +
          '.png',
      ),
    );
    expect(read(folder + id + '.json').frames).toEqual(b.frames);
    const png = readFileSync(folder + id + '.png');
    for (const f of Object.values(b.frames) as any[]) {
      expect(f.frame.x + f.frame.w).toBeLessThanOrEqual(png.readUInt32BE(16));
      expect(f.frame.y + f.frame.h).toBeLessThanOrEqual(png.readUInt32BE(20));
    }
  }
  const dong = read('apps/game-client/src/dong-playback.json').bundles.dong;
  for (const name of lock.additionalDongClips) {
    const c = dong.clips.find((c: any) => c.name === name);
    expect(c.frames).toEqual(source.bundles.dt_dong.clips[name].frames);
    expect(1000 / c.fps).toBeCloseTo(
      source.bundles.dt_dong.clips[name].durations[0],
    );
  }
});
