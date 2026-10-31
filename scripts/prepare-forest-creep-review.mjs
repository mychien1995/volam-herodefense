import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { copyIfChanged, writeIfChanged } from './asset-files.mjs';
import { createHash } from 'node:crypto';
const root = new URL('../', import.meta.url);
export function prepareForestCreepReview() {
  const source = new URL(
    'assets/sprites/creeps/dungeons/forest/forest_manifest_v01.json',
    root,
  );
  if (!existsSync(source)) return;
  const manifest = JSON.parse(readFileSync(source, 'utf8'));
  const dest = new URL(
    'apps/game-client/public/assets/forest_creep_review/',
    root,
  );
  copyIfChanged(source, new URL('manifest.json', dest));
  const expected = [
    'truc_xa',
    'doc_chu',
    'son_vien',
    'truc_lam_kiem_khach',
    'moc_linh',
    'truc_yeu',
  ];
  const assets = [],
    effectsList = [],
    pack = [],
    files = {};
  const read = (path) => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
  const hash = (path) => {
    files[path] = createHash('sha256')
      .update(readFileSync(new URL(path, root)))
      .digest('hex');
  };
  if (
    manifest.assets.length !== 6 ||
    new Set(manifest.assets.map((a) => a.typeId)).size !== 6
  )
    throw Error('Expected exactly six forest candidates');
  for (const asset of manifest.assets) {
    if (
      !expected.includes(asset.typeId) ||
      asset.id !== 'forest_' + asset.typeId
    )
      throw Error('Invalid forest review ID');
    const atlas = read(asset.atlas);
    const animations = asset.animations.map((anim) => {
      const durations = anim.frames.map((name) => atlas.frames[name]?.duration);
      if (durations.some((ms) => !Number.isFinite(ms) || ms <= 0))
        throw Error('Invalid forest timing');
      return { ...anim, frameRate: 1000, durations };
    });
    assets.push({
      ...asset,
      archetypeId: asset.typeId,
      slug: asset.typeId,
      wave: 0,
      bodyHeight: asset.bodyTargetPixels,
      sourceConceptSha256: createHash('sha256')
        .update(readFileSync(new URL(asset.sourceConcept, root)))
        .digest('hex'),
      animations,
    });
    pack.push({
      type: 'atlas',
      key: asset.id,
      textureURL: `/assets/forest_creep_review/${asset.typeId}/spritesheet.png`,
      atlasURL: `/assets/forest_creep_review/${asset.typeId}/atlas.json`,
    });
    for (const path of [
      asset.sheet,
      asset.atlas,
      `assets/sprites/creeps/dungeons/forest/${asset.typeId}/manifest.json`,
    ])
      hash(path);
    copyIfChanged(
      new URL(asset.sheet, root),
      new URL(asset.typeId + '/spritesheet.png', dest),
    );
    copyIfChanged(
      new URL(asset.atlas, root),
      new URL(asset.typeId + '/atlas.json', dest),
    );
  }
  const effects = new URL('assets/effects/dungeons/forest/manifest.json', root);
  if (existsSync(effects)) {
    const fx = JSON.parse(readFileSync(effects, 'utf8'));
    const atlas = read(fx.atlas);
    for (const seq of fx.sequences) {
      const durations = seq.frames.map((name) => atlas.frames[name]?.duration);
      if (durations.some((ms) => !Number.isFinite(ms) || ms <= 0))
        throw Error('Invalid forest effect timing');
      // Full phase metadata is retained; flight/release does not imply a server binding.
      effectsList.push({
        ...seq,
        id: 'forest_fx:' + seq.name,
        texture: 'forest_creep_fx',
        durations,
        frameRate: 1000,
        kind: seq.stage === 'flight' ? 'projectile' : 'contact',
      });
    }
    copyIfChanged(effects, new URL('effects/manifest.json', dest));
    copyIfChanged(
      new URL(fx.sheet, root),
      new URL('effects/spritesheet.png', dest),
    );
    copyIfChanged(new URL(fx.atlas, root), new URL('effects/atlas.json', dest));
    for (const path of [
      fx.sheet,
      fx.atlas,
      'assets/effects/dungeons/forest/manifest.json',
    ])
      hash(path);
    pack.push({
      type: 'atlas',
      key: 'forest_creep_fx',
      textureURL: '/assets/forest_creep_review/effects/spritesheet.png',
      atlasURL: '/assets/forest_creep_review/effects/atlas.json',
    });
  }
  pack.push({
    type: 'json',
    key: 'forest_creeps_manifest',
    url: '/assets/forest_creep_review/runtime-manifest.json',
  });
  writeIfChanged(
    new URL('runtime-manifest.json', dest),
    JSON.stringify(
      {
        status: 'candidate',
        directorApproved: false,
        normalForestRosterIntegrated: false,
        assets,
        effects: effectsList,
        files,
      },
      null,
      2,
    ) + '\n',
  );
  writeIfChanged(
    new URL('pack.json', dest),
    JSON.stringify({ forest: { files: pack } }, null, 2) + '\n',
  );
}
if (process.argv[1] === fileURLToPath(import.meta.url))
  prepareForestCreepReview();
