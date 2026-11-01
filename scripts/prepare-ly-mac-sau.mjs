import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { copyIfChanged, writeIfChanged } from './asset-files.mjs';
const root = new URL('../', import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
const hash = (p) =>
  createHash('sha256')
    .update(readFileSync(new URL(p, root)))
    .digest('hex');
const save = (p, value) =>
  writeIfChanged(new URL(p, root), JSON.stringify(value, null, 2) + '\n');

export function prepareLyMacSau() {
  const approval = read('assets/reviews/ly_mac_sau_v02/art_approval_v02.json');
  if (approval.status !== 'art_preview_approved')
    throw Error('Lý Mạc Sầu art is not approved');
  for (const file of approval.files)
    if (hash(file.path) !== file.sha256)
      throw Error(`Approved Lý Mạc Sầu input changed: ${file.path}`);
  const dest = 'apps/game-client/public/assets/co_mo/';
  const copy = (src, name) =>
    copyIfChanged(new URL(src, root), new URL(dest + name, root));
  const pack = [],
    actors = [],
    effects = [];
  for (const [id, folder, archetypeId, bodyHeight] of [
    ['boss_ly_mac_sau', 'assets/sprites/bosses/ly-mac-sau', 'ly_mac_sau', 56],
    [
      'summon_co_mo_am_binh',
      'assets/sprites/summons/co-mo-am-binh',
      'co_mo_am_binh',
      44,
    ],
  ]) {
    const meta = read(folder + '/manifest.json'),
      clips = read(folder + '/animations.json').animations;
    actors.push({
      id,
      archetypeId,
      bodyHeight,
      wave: 0,
      slug: archetypeId,
      nameVi: archetypeId === 'ly_mac_sau' ? 'Lý Mạc Sầu' : 'Cổ Mộ Âm Binh',
      status: 'art_preview_approved_runtime_pending',
      footPivot: meta.origin,
      sourceConcept: '',
      sourceConceptSha256: '',
      animations: Object.entries(clips).map(([name, a]) => ({
        state: name.slice(0, name.lastIndexOf('_')),
        direction: name.slice(name.lastIndexOf('_') + 1),
        frames: a.frames,
        durations: a.durationsMs,
        frameRate: 1000 / a.durationsMs[0],
        repeat: a.loop ? -1 : 0,
      })),
    });
    copy(folder + '/spritesheet.png', id + '.png');
    copy(folder + '/atlas.json', id + '.json');
    pack.push({
      type: 'atlas',
      key: id,
      textureURL: `/assets/co_mo/${id}.png`,
      atlasURL: `/assets/co_mo/${id}.json`,
    });
  }
  for (const [id, folder] of [
    ['co_mo_fx', 'assets/effects/bosses/ly-mac-sau'],
    ['co_mo_purple', 'assets/effects/bosses/ly-mac-sau/purple_v02'],
  ]) {
    copy(folder + '/spritesheet.png', id + '.png');
    copy(folder + '/atlas.json', id + '.json');
    pack.push({
      type: 'atlas',
      key: id,
      textureURL: `/assets/co_mo/${id}.png`,
      atlasURL: `/assets/co_mo/${id}.json`,
    });
    for (const [name, a] of Object.entries(
      read(folder + '/animations.json').animations,
    )) {
      if (id === 'co_mo_fx' && name.startsWith('palm_')) continue;
      effects.push({
        id: `co_mo:${name}`,
        texture: id,
        frames: a.frames,
        durations: a.durationsMs,
        frameRate: 1000 / a.durationsMs[0],
        repeat: a.loop ? -1 : 0,
        origin: [0.5, 0.5],
      });
    }
  }
  const env = 'assets/sprites/environment/co-mo-phai';
  copy(env + '/terrain.png', 'terrain.png');
  copy(env + '/spritesheet.png', 'scenery.png');
  copy(env + '/atlas.json', 'scenery.json');
  const scenery = read(env + '/manifest.json').props.map((p) => ({
    id: p.id,
    size: p.canvas,
    pivot: p.pivotPx,
    layer: 'feet_sorted',
  }));
  save(dest + 'manifest.json', {
    assets: actors,
    effects,
    scenery,
    approval: 'Art preview approved; runtime review pending',
  });
  pack.push({
    type: 'json',
    key: 'co_mo_manifest',
    url: '/assets/co_mo/manifest.json',
  });
  save(dest + 'pack.json', { co_mo: { files: pack } });
  copyIfChanged(
    new URL('maps/boss_co_mo.tmj', root),
    new URL('packages/game-data/src/boss-co-mo-map.json', root),
  );
  copyIfChanged(
    new URL('maps/boss_co_mo.tmj', root),
    new URL('apps/game-client/public/assets/boss_co_mo.tmj', root),
  );
}
