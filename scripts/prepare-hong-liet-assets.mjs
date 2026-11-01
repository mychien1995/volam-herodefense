import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { copyIfChanged, writeIfChanged } from './asset-files.mjs';
const root = new URL('../', import.meta.url),
  read = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
export function prepareHongLietAssets() {
  const approval = read(
    'assets/reviews/bosses/hoan_nhan_hong_liet_v01/director_approval.json',
  );
  const pins = new Set();
  function verify(v) {
    if (Array.isArray(v)) v.forEach(verify);
    else if (v && typeof v === 'object') {
      if (v.path && v.sha256) {
        const b = readFileSync(new URL(v.path, root));
        if (createHash('sha256').update(b).digest('hex') !== v.sha256)
          throw Error('Approved Hong Liet input changed: ' + v.path);
        pins.add(v.path);
      }
      Object.values(v).forEach(verify);
    }
  }
  verify(approval);
  if (
    approval.status !== 'approved_visual_preview_v04_for_phaser_integration' ||
    pins.size < 30
  )
    throw Error('Missing current v04 approval');
  const runtime = read('assets/runtime/hoan_nhan_hong_liet_v04.json');
  for (const [path, expected] of Object.entries(runtime.files))
    if (
      createHash('sha256')
        .update(readFileSync(new URL(path, root)))
        .digest('hex') !== expected
    )
      throw Error('Boss runtime provenance changed: ' + path);
  const manifest = read(
    'assets/exports/bosses/hoan_nhan_hong_liet_v01/manifest.json',
  );
  for (const a of manifest.assets) {
    const png = readFileSync(new URL(a.sheet, root)),
      atlas = read(a.atlas),
      w = png.readUInt32BE(16),
      h = png.readUInt32BE(20);
    for (const [name, v] of Object.entries(atlas.frames)) {
      const f = v.frame;
      if (f.x < 0 || f.y < 0 || f.x + f.w > w || f.y + f.h > h)
        throw Error('Bad boss frame ' + name);
    }
  }
  for (const [id, frames] of Object.entries(runtime.selectedFrames)) {
    const atlas = read(
      'assets/exports/bosses/hoan_nhan_hong_liet_v01/' + id + '.json',
    );
    for (const frame of frames)
      if (!atlas.frames[frame])
        throw Error('Missing selected boss cel ' + id + ':' + frame);
  }
  const base = 'apps/game-client/public/assets/hong_liet/';
  for (const [source, dest] of [
    [
      'assets/sprites/environment/mongolian-headquarters/spritesheet.png',
      'scenery.png',
    ],
    [
      'assets/sprites/environment/mongolian-headquarters/atlas.json',
      'scenery.json',
    ],
    [
      'assets/tilesets/boss-arenas/mongolian-headquarters/terrain.png',
      'terrain.png',
    ],
    ['maps/boss_hong_liet.tmj', 'map.tmj'],
  ])
    copyIfChanged(new URL(source, root), new URL(base + dest, root));
  copyIfChanged(
    new URL('maps/boss_hong_liet.tmj', root),
    new URL('packages/game-data/src/hong-liet-map.json', root),
  );
  writeIfChanged(
    new URL(base + 'manifest.json', root),
    JSON.stringify(
      {
        approval: approval.status,
        pins: pins.size,
        assets: manifest.assets.map((a) => ({
          id: a.id,
          origin: a.origin,
          frames: a.frames,
        })),
      },
      null,
      2,
    ) + '\n',
  );
  console.info(
    'Hoan Nhan Hong Liet v04: ' +
      pins.size +
      ' pinned inputs; ' +
      manifest.assets.length +
      ' atlases validated.',
  );
}
