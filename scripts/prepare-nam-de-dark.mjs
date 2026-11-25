import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { copyIfChanged } from './asset-files.mjs';
const root = new URL('../', import.meta.url);
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
export function prepareNamDeDark() {
  for (const [source, folder, target] of [
    [
      'assets/source/boss-nam-de-dark-v1/',
      'assets/exports/boss-nam-de-dark-v1/',
      'boss-nam-de-dark-v1',
    ],
    [
      'assets/source/effects/nam_de_dark_v01/',
      'assets/exports/effects/nam_de_dark_v01/',
      'nam-de-dark-v1',
    ],
  ]) {
    const manifest = JSON.parse(
      readFileSync(new URL(folder + 'manifest.json', root), 'utf8'),
    );
    for (const [name, expected] of Object.entries(manifest.exports)) {
      const file = new URL(folder + name, root),
        bytes = readFileSync(file);
      if (hash(bytes) !== expected)
        throw Error('Nam De dark export changed: ' + name);
      copyIfChanged(
        file,
        new URL('apps/game-client/public/assets/' + target + '/' + name, root),
      );
    }
    const sourceNames =
      target === 'boss-nam-de-dark-v1'
        ? Object.fromEntries(
            Object.entries(manifest.sourceHashes).map(
              ([direction, expected]) => [
                'raw/' +
                  (direction === 'reactions' ? 'reactions' : direction) +
                  '.png',
                expected,
              ],
            ),
          )
        : manifest.sourceHashes;
    for (const [name, expected] of Object.entries(sourceNames))
      if (hash(readFileSync(new URL(source + name, root))) !== expected)
        throw Error('Nam De dark source mismatch: ' + name);
  }
}
