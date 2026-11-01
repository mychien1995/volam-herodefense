import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { copyIfChanged, writeIfChanged } from './asset-files.mjs';
const root = new URL('../', import.meta.url);
export function prepareChuAssets() {
  const lock = JSON.parse(
    readFileSync(
      new URL('assets/approved_chu_ba_thong.lock.json', root),
      'utf8',
    ),
  );
  for (const [p, expected] of Object.entries(lock.files))
    if (
      !existsSync(new URL(p, root)) ||
      createHash('sha256')
        .update(readFileSync(new URL(p, root)))
        .digest('hex') !== expected
    )
      throw Error('Approved Chu Bá Thông artwork/choreography changed: ' + p);
  const data = JSON.parse(
    readFileSync(
      new URL('apps/game-client/src/chu-art.generated.json', root),
      'utf8',
    ),
  );
  data.map = JSON.parse(
    readFileSync(new URL('maps/boss_chu_ba_thong.tmj', root), 'utf8'),
  );
  data.scenery = data.map.layers.find((l) => l.name === 'scenery').objects;
  writeIfChanged(
    new URL('apps/game-client/src/chu-art.generated.json', root),
    JSON.stringify(data, null, 2) + '\n',
  );
  const dest = new URL('apps/game-client/public/assets/chu/', root);
  for (const [key, b] of Object.entries(data.bundles))
    copyIfChanged(new URL(b.image, root), new URL(key + '.png', dest));
  copyIfChanged(
    new URL('assets/sprites/bosses/chu-ba-thong/frames/idle_down_0.png', root),
    new URL('boss_idle.png', dest),
  );
  const paths = new Set(
    data.scenery.map((o) => o.properties.find((p) => p.name === 'asset').value),
  );
  paths.add(
    'assets/tilesets/boss-arenas/toan-chan-truc-lam/ancient_path_material.png',
  );
  paths.add(
    'assets/tilesets/boss-arenas/toan-chan-truc-lam/bamboo_ground_material.png',
  );
  paths.add('assets/icons/bosses/chu-ba-thong/toan_chan_tien_tuu_icon.png');
  for (const p of paths)
    copyIfChanged(new URL(p, root), new URL(p.split('/').at(-1), dest));
  writeIfChanged(
    new URL('packages/game-data/src/chu-ba-thong-map.json', root),
    JSON.stringify(data.map, null, 2) + '\n',
  );
}
if (
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].replaceAll('\\', '/'))
)
  prepareChuAssets();
