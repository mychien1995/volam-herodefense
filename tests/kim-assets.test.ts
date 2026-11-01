import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { it, expect } from 'vitest';
const read = (p: string) =>
  JSON.parse(readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const hash = (p: string) =>
  createHash('sha256')
    .update(readFileSync(new URL('../' + p, import.meta.url)))
    .digest('hex');
it('retains246 approved hashes and selected184frames/53clips, copies PNG byte-for-byte, excludes24 candidates', () => {
  const lock = read('assets/approved_kim_luan_phap_vuong.lock.json'),
    runtime = read('apps/game-client/src/kim-playback.json'),
    d = read('assets/reviews/bosses/kim_luan_phap_vuong_v01/data.json');
  expect(lock.status).toBe(
    'approved_visual_preview_feedback_02_for_phaser_integration',
  );
  expect(Object.keys(lock.files)).toHaveLength(246);
  for (const [p, h] of Object.entries(lock.files)) expect(hash(p), p).toBe(h);
  let frames = 0,
    clips = 0;
  for (const [id, selected] of Object.entries(lock.selectedFrames) as [
    string,
    string[],
  ][]) {
    const atlas = read(
      'apps/game-client/public/assets/kim_luan/' + id + '.json',
    );
    expect(Object.keys(atlas.frames).sort()).toEqual(selected.slice().sort());
    frames += selected.length;
    expect(hash('apps/game-client/public/assets/kim_luan/' + id + '.png')).toBe(
      hash(d.bundles[id].image),
    );
    for (const c of runtime.bundles[id].clips) {
      clips++;
      for (const f of c.frames) expect(selected).toContain(f);
    }
  }
  expect(frames).toBe(184);
  expect(clips).toBe(53);
});
