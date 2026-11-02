import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { copyIfChanged, writeIfChanged } from './asset-files.mjs';
const root = new URL('../', import.meta.url);
export function prepareM3dFollowup() {
  const manifest = JSON.parse(
    readFileSync(
      new URL('assets/m3d-playtest-followup/import-manifest.json', root),
      'utf8',
    ).replace(/^\uFEFF/, ''),
  );
  for (const f of manifest.files) {
    const hash = createHash('sha256')
      .update(readFileSync(new URL(f.path, root)))
      .digest('hex');
    if (hash !== f.sha256) throw Error('Followup import changed: ' + f.path);
  }
  const copy = (p, name) =>
    copyIfChanged(
      new URL(p, root),
      new URL('apps/game-client/public/assets/m3d_followup/' + name, root),
    );
  copy(
    'assets/m3d-playtest-followup/su_tu_hong-icon.png',
    'su_tu_hong-icon.png',
  );
  copy('assets/reviews/chu_ba_thong_v02/arena_assembly.png', 'chu_arena.png');
  const base = 'assets/effects/bosses/chu-ba-thong/wine-mechanic/';
  copy(base + 'vfx_wine_mechanic.png', 'wine.png');
  copy(
    'assets/icons/bosses/chu-ba-thong/toan_chan_tien_tuu_world.png',
    'wine_bottle.png',
  );
  const read = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
  const a = read(base + 'vfx_wine_mechanic.animations.json');
  const wine = {
    image: base + 'vfx_wine_mechanic.png',
    url: '/assets/m3d_followup/wine.png',
    origin: a.origin,
    frames: read(base + 'vfx_wine_mechanic.json').frames,
    animations: a.animations,
  };
  writeIfChanged(
    new URL('apps/game-client/src/chu-wine-art.generated.json', root),
    JSON.stringify(wine, null, 2) + '\n',
  );
}
