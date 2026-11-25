import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { copyIfChanged } from './asset-files.mjs';
const root = new URL('../', import.meta.url);
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
/** Copy retained candidate exports; preparation never redraws or changes approved art. */
export function prepareM4dBossVfx() {
  preparePack(
    'bac_cai_m4d_v04',
    ['dragon-beam.png', 'dragon-palm.png', 'fire-ring.png'],
    'bac-cai-m4d-v04',
  );
  preparePack('bac_cai_m4d_v05', ['dragon-palm.png'], 'bac-cai-m4d-v05');
}
function preparePack(pack, names, folder) {
  const source = new URL('assets/source/effects/' + pack + '/', root);
  const exports = new URL('assets/exports/effects/' + pack + '/', root);
  const manifest = JSON.parse(
    readFileSync(new URL('manifest.json', exports), 'utf8'),
  );
  for (const [name, expected] of [
    [manifest.source, manifest.sourceSha256],
    ...(manifest.beamSource
      ? [[manifest.beamSource, manifest.beamSourceSha256]]
      : []),
  ])
    if (hash(readFileSync(new URL(name, source))) !== expected)
      throw Error('M4D boss VFX master mismatch: ' + name);
  if (Object.keys(manifest.exports).length !== names.length)
    throw Error('M4D boss VFX export count');
  for (const name of names) {
    const file = new URL(name, exports),
      bytes = readFileSync(file),
      spec = manifest.exports[name];
    if (
      bytes.toString('hex', 0, 8) !== '89504e470d0a1a0a' ||
      bytes[25] !== 6 ||
      bytes.readUInt32BE(16) !== spec.size[0] ||
      bytes.readUInt32BE(20) !== spec.size[1] ||
      hash(bytes) !== spec.sha256
    )
      throw Error('M4D boss VFX export mismatch: ' + name);
    copyIfChanged(
      file,
      new URL('apps/game-client/public/assets/' + folder + '/' + name, root),
    );
  }
}
