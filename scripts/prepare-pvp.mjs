import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { copyIfChanged } from './asset-files.mjs';
export function preparePvpAssets() {
  const root = new URL('../', import.meta.url);
  const hash = (p) =>
    createHash('sha256')
      .update(readFileSync(new URL(p, root)))
      .digest('hex');
  const lock = JSON.parse(
    readFileSync(
      new URL('assets/approved_pvp_concepts.lock.json', root),
      'utf8',
    ),
  );
  for (const [path, digest] of Object.entries(lock.files))
    if (hash(path) !== digest)
      throw Error('Approved PvP concept changed: ' + path);
  const path = 'assets/exports/pvp/';
  const manifest = JSON.parse(
    readFileSync(new URL(path + 'manifest.json', root), 'utf8'),
  );
  for (const [source, digest] of Object.entries(manifest.sources))
    if (hash(source) !== digest) throw Error('PvP source changed: ' + source);
  for (const file of manifest.files) {
    if (hash(path + file.file) !== file.sha256)
      throw Error('PvP export changed: ' + file.file);
    copyIfChanged(
      new URL(path + file.file, root),
      new URL('apps/game-client/public/assets/pvp/' + file.file, root),
    );
  }
  copyIfChanged(
    new URL(path + 'manifest.json', root),
    new URL('apps/game-client/public/assets/pvp/manifest.json', root),
  );
}
