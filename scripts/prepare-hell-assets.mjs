import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { copyIfChanged, writeIfChanged } from './asset-files.mjs';
const root = new URL('../', import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
const hash = (p) =>
  createHash('sha256')
    .update(readFileSync(new URL(p, root)))
    .digest('hex');
export function prepareHellAssets() {
  const sourceManifest =
    'assets/concepts/dungeon-environments/hell/hell_asset_manifest.json';
  const master = read(sourceManifest);
  for (const f of master.inventory)
    if (hash(f.path) !== f.sha256)
      throw Error(`Hell retained provenance mismatch: ${f.path}`);
  const dest = 'apps/game-client/public/assets/hell/';
  const files = {},
    pack = [],
    assets = [];
  const copy = (src, target) => {
    files[src] = hash(src);
    copyIfChanged(new URL(src, root), new URL(dest + target, root));
  };
  copy('assets/tilesets/hell/terrain.png', 'terrain.png');
  copy('assets/tilesets/hell/terrain.tsj', 'terrain.json');
  copy('assets/sprites/environment/hell/props_atlas.png', 'scenery.png');
  copy('assets/sprites/environment/hell/props_atlas.json', 'scenery.json');
  for (const actor of master.enemies) {
    const meta = read(actor.manifest),
      folder = actor.manifest.replace(/manifest.json$/, '');
    const atlas = read(folder + meta.atlas);
    assets.push({
      id: meta.id,
      archetypeId: meta.id,
      wave: 0,
      slug: meta.id,
      nameVi: meta.nameVi,
      status: 'prototype',
      bodyHeight: meta.bodyHeight,
      footPivot: meta.footPivot,
      frameSize: [meta.frameWidth, meta.frameHeight],
      groundAnchorPx: meta.groundAnchorPx,
      sharedStates: meta.sharedStates,
      animations: meta.animations.map((a) => ({
        ...a,
        durations: a.frames.map((f) => atlas.frames[f].duration),
      })),
      sourceConcept: meta.sourceConcept,
      sourceConceptSha256: hash(meta.sourceConcept),
      sourceRasters: meta.sources.map((p) => folder + p),
      editableSource:
        'Retained source PNG rasters; no layered Aseprite source supplied.',
    });
    copy(folder + meta.sheet, meta.id + '.png');
    copy(folder + meta.atlas, meta.id + '.json');
    pack.push({
      type: 'atlas',
      key: meta.id,
      textureURL: `/assets/hell/${meta.id}.png`,
      atlasURL: `/assets/hell/${meta.id}.json`,
    });
  }
  copy('assets/effects/dungeons/hell/spritesheet.png', 'effects.png');
  copy('assets/effects/dungeons/hell/atlas.json', 'effects.json');
  pack.push({
    type: 'atlas',
    key: 'hell_fx',
    textureURL: '/assets/hell/effects.png',
    atlasURL: '/assets/hell/effects.json',
  });
  const effects = read(master.effects.metadata).effects.map((e) => ({
    ...e,
    texture: 'hell_fx',
  }));
  const scenery = read(master.environment.props).assets.map((p) => ({
    id: p.id.slice(5),
    size: p.dimensions,
    pivot: p.groundAnchorPx,
    layer: p.layer,
    originalFile: p.file,
  }));
  const manifest = {
    status: 'prototype_pending_runtime_director_review',
    sourceManifest,
    provenance: master.provenance,
    gameplay:
      'Existing generic M2A melee tuning. No lava damage, fireball, curse, summon, flight or boss mechanics.',
    assets,
    effects,
    scenery,
    files,
  };
  for (const p of [dest + 'manifest.json', 'assets/hell_dungeon.manifest.json'])
    writeIfChanged(new URL(p, root), JSON.stringify(manifest, null, 2) + '\n');
  pack.push(
    { type: 'json', key: 'hell_manifest', url: '/assets/hell/manifest.json' },
    {
      type: 'json',
      key: 'hell_terrain_metadata',
      url: '/assets/hell/terrain.json',
    },
  );
  writeIfChanged(
    new URL(dest + 'pack.json', root),
    JSON.stringify({ hell: { files: pack } }, null, 2) + '\n',
  );
  for (const p of [
    'apps/game-client/public/assets/creep_hell.tmj',
    'packages/game-data/src/creep-hell-map.json',
  ])
    copyIfChanged(new URL('maps/creep_hell.tmj', root), new URL(p, root));
}
