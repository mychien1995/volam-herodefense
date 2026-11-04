import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root = new URL('../', import.meta.url);
// Validate retained exports; preparation must never regenerate artwork.
export function validateCharacterRevision() {
  const manifest = JSON.parse(
    readFileSync(
      new URL(
        'assets/exports/characters/visual_improvement_v02/manifest.json',
        root,
      ),
    ),
  );
  if (manifest.assets.length !== 6)
    throw Error('Expected six revised hero variants');
  for (const asset of manifest.assets) {
    for (const [file, expected] of Object.entries(asset.files)) {
      const actual = createHash('sha256')
        .update(readFileSync(new URL(file, root)))
        .digest('hex');
      if (actual !== expected)
        throw Error('Revised art hash mismatch: ' + file);
    }
    const atlas = JSON.parse(readFileSync(new URL(asset.atlas, root)));
    if (Object.keys(atlas.frames).length !== 40)
      throw Error('Incomplete revised hero: ' + asset.id);
    for (const animation of asset.animations)
      for (const frame of animation.frames)
        if (!atlas.frames[frame])
          throw Error('Missing revised frame: ' + asset.id + '/' + frame);
  }
}
