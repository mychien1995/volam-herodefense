import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { copyIfChanged, writeIfChanged } from './asset-files.mjs';
const root = new URL('../', import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
export function prepareDesertAssets() {
  const dest = 'apps/game-client/public/assets/desert/';
  const source = read('assets/source/desert/asset_manifest.json');
  const recipe = read('assets/source/desert/export_recipe.json');
  const assets = [];
  const pack = [];
  const files = {};
  const copy = (from, to) => {
    const bytes = readFileSync(new URL(from, root));
    files[from] = createHash('sha256').update(bytes).digest('hex');
    copyIfChanged(new URL(from, root), new URL(dest + to, root));
  };
  for (const [folder, name] of [
    ['assets/tilesets/desert/', 'terrain'],
    ['assets/sprites/environment/desert/', 'scenery'],
  ]) {
    const base = name === 'terrain' ? 'desert-terrain' : 'desert-scenery';
    copy(folder + base + '.png', name + '.png');
    copy(folder + base + '.json', name + '.json');
  }
  for (const actor of source.verification.actors) {
    const folder = `assets/sprites/creeps/dungeons/desert/${actor.id}/`;
    const meta = read(folder + 'animations.json');
    const atlas = read(folder + 'atlas.json');
    const names = Object.keys(atlas.frames);
    const animations = meta.tags.map((tag) => {
      const cut = tag.name.lastIndexOf('_');
      const state = tag.name.slice(0, cut);
      const frames = names.slice(tag.from, tag.to + 1);
      const durations = frames.map((frame) => atlas.frames[frame].duration);
      if (
        !frames.length ||
        durations.some((ms) => !Number.isFinite(ms) || ms < 1)
      )
        throw new Error(`Invalid desert timing: ${actor.id}/${tag.name}`);
      return {
        state:
          state === 'attack'
            ? 'basic_attack'
            : state === 'hit'
              ? 'hurt'
              : state,
        direction: tag.name.slice(cut + 1),
        frames,
        durations,
        frameRate: 1000,
        repeat: ['idle', 'walk'].includes(state) ? -1 : 0,
      };
    });
    const id = 'desert_' + actor.id;
    assets.push({
      id,
      archetypeId: actor.id,
      wave: 0,
      slug: actor.id,
      nameVi: meta.nameVi,
      status: 'prototype',
      bodyHeight: meta.bodyHeightTarget,
      footPivot: meta.pivot.map((v, i) => v / meta.frameSize[i]),
      animations,
      sourceConcept: `assets/concepts/dungeon-creeps/desert/${actor.id}-concept.png`,
      sourceConceptSha256: createHash('sha256')
        .update(
          readFileSync(
            new URL(
              `assets/concepts/dungeon-creeps/desert/${actor.id}-concept.png`,
              root,
            ),
          ),
        )
        .digest('hex'),
    });
    copy(folder + 'spritesheet.png', actor.id + '.png');
    copy(folder + 'atlas.json', actor.id + '.json');
    copy(folder + 'animations.json', actor.id + '.animations.json');
    pack.push({
      type: 'atlas',
      key: id,
      textureURL: `/assets/desert/${actor.id}.png`,
      atlasURL: `/assets/desert/${actor.id}.json`,
    });
  }
  copyIfChanged(
    new URL('maps/creep_desert.tmj', root),
    new URL('apps/game-client/public/assets/creep_desert.tmj', root),
  );
  copyIfChanged(
    new URL('maps/creep_desert.tmj', root),
    new URL('packages/game-data/src/creep-desert-map.json', root),
  );
  const manifest = {
    status: 'integrated_pending_runtime_director_review',
    provenance: source.provenance,
    sourceManifest: 'assets/source/desert/asset_manifest.json',
    gameplay:
      'Existing M2A common creep profiles; no species abilities or archer projectiles supplied.',
    assets,
    effects: [],
    scenery: recipe.environment,
    files,
  };
  writeIfChanged(
    new URL(dest + 'manifest.json', root),
    JSON.stringify(manifest, null, 2) + '\n',
  );
  writeIfChanged(
    new URL('assets/desert_dungeon.manifest.json', root),
    JSON.stringify(manifest, null, 2) + '\n',
  );
  writeIfChanged(
    new URL(dest + 'pack.json', root),
    JSON.stringify(
      {
        desert: {
          files: [
            ...pack,
            {
              type: 'json',
              key: 'desert_manifest',
              url: '/assets/desert/manifest.json',
            },
          ],
        },
      },
      null,
      2,
    ) + '\n',
  );
}
