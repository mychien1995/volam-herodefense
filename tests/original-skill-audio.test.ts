import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
it('keeps original MP3s and validates every converted clip and runtime import', () => {
  const manifest = JSON.parse(
    readFileSync(
      'assets/sounds/skills/original-four-schools-ogg/manifest.json',
      'utf8',
    ),
  );
  expect(manifest.clips).toHaveLength(44);
  for (const clip of manifest.clips) {
    for (const [key, hash] of [
      ['source', 'sourceSha256'],
      ['wav', 'wavSha256'],
      ['ogg', 'oggSha256'],
    ])
      expect(
        createHash('sha256').update(readFileSync(clip[key!])).digest('hex'),
        clip[key!],
      ).toBe(clip[hash!]);
    expect(clip.correlation).toBeGreaterThan(0.97);
  }
  const source = readFileSync('apps/game-client/src/skill-sounds.ts', 'utf8');
  expect(source).not.toContain('.mp3?url');
  expect(source.match(/original-four-schools-ogg\//g)).toHaveLength(43);
  expect(source).toContain('seek: 0.6');
});
