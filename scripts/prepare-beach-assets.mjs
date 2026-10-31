import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { copyIfChanged, writeIfChanged } from './asset-files.mjs';
const root = new URL('../', import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
const hash = (p) =>
  createHash('sha256')
    .update(readFileSync(new URL(p, root)))
    .digest('hex');
export function prepareBeachAssets() {
  const master = read(
    'assets/sprites/creeps/dungeons/beach/beach_manifest_v01.json',
  );
  // Retained production inventory remains an independent guard, including the
  // narrowly documented Thuy Quy correction. Never silently recalculate it.
  for (const file of master.files)
    if (hash(file.path) !== file.sha256)
      throw Error(
        `Beach retained asset changed without provenance update: ${file.path}`,
      );
  const dest = 'apps/game-client/public/assets/beach/';
  const pack = [],
    assets = [],
    files = {};
  const copy = (src, out) => {
    files[src] = hash(src);
    copyIfChanged(new URL(src, root), new URL(dest + out, root));
  };
  copy('assets/tilesets/beach/terrain.png', 'terrain.png');
  copy('assets/tilesets/beach/terrain.json', 'terrain.json');
  copy('assets/sprites/environment/beach/scenery.png', 'scenery.png');
  copy('assets/sprites/environment/beach/atlas.json', 'scenery.json');
  for (const actor of master.enemies) {
    const meta = read(actor.manifest),
      atlas = read(meta.atlas);
    const id = meta.id;
    const animations = meta.animations.map((a) => ({
      ...a,
      durations: a.frames.map((f) => atlas.frames[f].duration),
    }));
    assets.push({
      id,
      archetypeId: actor.id,
      wave: 0,
      slug: actor.id,
      nameVi: meta.nameVi,
      status: 'prototype',
      bodyHeight: 48,
      footPivot: meta.footPivot,
      animations,
      sourceConcept: meta.sourceConcept,
      sourceConceptSha256: hash(meta.sourceConcept),
    });
    copy(meta.sheet, meta.id + '.png');
    copy(meta.atlas, meta.id + '.json');
    pack.push({
      type: 'atlas',
      key: id,
      textureURL: `/assets/beach/${meta.id}.png`,
      atlasURL: `/assets/beach/${meta.id}.json`,
    });
  }
  const fx = read('assets/effects/dungeons/beach/manifest.json');
  copy(fx.sheet, 'effects.png');
  copy(fx.atlas, 'effects.json');
  pack.push({
    type: 'atlas',
    key: 'beach_fx',
    textureURL: '/assets/beach/effects.png',
    atlasURL: '/assets/beach/effects.json',
  });
  const effects = fx.sequences.map((s) => ({
    id: 'beach_fx:' + s.name,
    texture: 'beach_fx',
    frames: s.frames,
    frameRate: 1000 / s.durationMs,
    repeat: s.repeat,
    origin: fx.origin,
  }));
  const scenery = master.props.map((p) => ({
    id: p.id,
    size: [208, 208],
    pivot: [104, 196],
    layer: 'feet',
    originalFile: p.file,
    originalDimensions: p.dimensions,
    originalPivot: p.footPivot,
  }));
  const manifest = {
    status: 'prototype_pending_runtime_director_review',
    provenance: master.provenance,
    sourceManifest:
      'assets/sprites/creeps/dungeons/beach/beach_manifest_v01.json',
    gameplay:
      'Retained M2A generic melee profiles; no cannon, water spell, poison or aquatic movement mechanics supplied.',
    assets,
    effects,
    scenery,
    files,
  };
  for (const p of [
    dest + 'manifest.json',
    'assets/beach_dungeon.manifest.json',
  ])
    writeIfChanged(new URL(p, root), JSON.stringify(manifest, null, 2) + '\n');
  pack.push({
    type: 'json',
    key: 'beach_manifest',
    url: '/assets/beach/manifest.json',
  });
  pack.push({
    type: 'json',
    key: 'beach_terrain_metadata',
    url: '/assets/beach/terrain.json',
  });
  writeIfChanged(
    new URL(dest + 'pack.json', root),
    JSON.stringify({ beach: { files: pack } }, null, 2) + '\n',
  );
  copyIfChanged(
    new URL('maps/creep_beach.tmj', root),
    new URL('apps/game-client/public/assets/creep_beach.tmj', root),
  );
  copyIfChanged(
    new URL('maps/creep_beach.tmj', root),
    new URL('packages/game-data/src/creep-beach-map.json', root),
  );
}
