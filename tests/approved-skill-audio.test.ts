import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
it('preserves all director-approved audio source and export bytes', () => {
  const lock = JSON.parse(
    readFileSync('assets/approved_skill_audio_v01.lock.json', 'utf8'),
  );
  expect(Object.keys(lock.files)).toHaveLength(261);
  for (const [path, hash] of Object.entries(lock.files))
    expect(
      createHash('sha256').update(readFileSync(path)).digest('hex'),
      path,
    ).toBe(hash);
});
