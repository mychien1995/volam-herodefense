import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { copyIfChanged, writeIfChanged } from './asset-files.mjs';

/** Copies retained raster exports for the isolated art viewer; no live encounter registration. */
export function prepareBacCaiPreview() {
  const root = new URL('../', import.meta.url);
  const dest = new URL('apps/game-client/public/assets/bac-cai-preview/', root);
  mkdirSync(dest, { recursive: true });
  const entries = [
    [
      'bac_cai_beam_v03',
      'assets/sprites/bosses/main/bac-cai/rework-v03/bac_cai_beam_v03',
    ],
    ['boss_bac_cai', 'assets/sprites/bosses/main/bac-cai/boss_bac_cai'],
    ...['staff', 'dragon-palms', 'ultimate', 'shared'].map((f) => [
      'bac_cai_' + f.replace('-', '_'),
      `assets/effects/bosses/main/bac-cai/${f}/bac_cai_${f.replace('-', '_')}`,
    ]),
    ...[
      ['character', 'bac_cai_rework_character'],
      ['dog', 'bac_cai_black_dog'],
      ['vfx', 'bac_cai_rework_vfx'],
    ].map(([f, id]) => [
      id,
      `assets/sprites/bosses/main/bac-cai/rework-v02/${f}/${id}`,
    ]),
  ];
  const assets = [];
  for (const [id, path] of entries) {
    const meta = JSON.parse(
      readFileSync(new URL(path + '.animations.json', root), 'utf8'),
    );
    for (const ext of ['png', 'json'])
      copyIfChanged(
        new URL(path + '.' + ext, root),
        new URL(id + '.' + ext, dest),
      );
    assets.push({
      id,
      origin: meta.origin,
      animations: meta.animations.map((t) => ({
        name: t.name,
        frames: t.frames,
        durations: t.frames.map(() => t.durationMs),
        repeat: t.repeat,
      })),
      source: path,
    });
  }
  for (const id of [
    'hero_cai_bang',
    'hero_thien_son',
    'hero_vo_dang',
    'hero_thieu_lam',
  ]) {
    const path = `assets/exports/characters/${id}`;
    const meta = JSON.parse(
      readFileSync(new URL(path + '.json', root), 'utf8'),
    );
    for (const ext of ['png', 'json'])
      copyIfChanged(
        new URL(path + '.' + ext, root),
        new URL(id + '.' + ext, dest),
      );
    const all = Object.keys(meta.frames);
    const animations = meta.meta.frameTags.map((t) => ({
      name: t.name,
      frames: all.slice(t.from, t.to + 1),
      durations: all
        .slice(t.from, t.to + 1)
        .map((n) => meta.frames[n].duration ?? 120),
      repeat: -1,
    }));
    assets.push({ id, origin: [0.5, 0.8], animations, source: path });
  }
  for (const [name, path] of [
    ['ground', 'assets/exports/arena_v2/ground.png'],
    ['portrait', 'assets/icons/bosses/bac-cai/portrait_256.png'],
    ['statue', 'assets/exports/arena_art01/statue_male.png'],
  ])
    copyIfChanged(new URL(path, root), new URL(name + '.png', dest));
  writeIfChanged(
    new URL('manifest.json', dest),
    JSON.stringify({ scope: 'ART_PREVIEW_ONLY', assets }, null, 2) + '\n',
  );
  console.info(
    `Bắc Cái preview: ${assets.length} retained atlases → ${fileURLToPath(dest)}`,
  );
}
