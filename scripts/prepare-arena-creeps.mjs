import { mkdirSync, readFileSync } from 'node:fs';
import { copyIfChanged, writeIfChanged } from './asset-files.mjs';
import { createHash } from 'node:crypto';
const root = new URL('../', import.meta.url),
  sha = (p) =>
    createHash('sha256')
      .update(readFileSync(new URL(p, root)))
      .digest('hex');
const slugs = [
  'wild-dog',
  'bandit-grunt',
  'bandit-swordsman',
  'bandit-archer',
  'black-clad-assassin',
  'corrupted-monk',
  'skeleton-swordsman',
  'skeleton-archer',
  'jiangshi-zombie',
  'vengeful-spirit',
  'armored-skeleton',
  'stone-golem',
  'ma-khuyen',
  'tieu-hoa-quy',
  'hoa-phap-su',
  'nguu-ma',
  'anh-ma',
  'ma-tuong-thiet-giap',
  'huyet-ma-phap-su',
  'ma-vuong-tien-phong',
];
const heights = [
    27, 42, 44, 43, 42, 46, 44, 42, 44, 52, 54, 66, 34, 32, 48, 66, 48, 58, 52,
    66,
  ],
  impacts = [
    'undead_contact',
    'spectral_contact',
    'metal_contact',
    'stone_contact',
    'demon_hound_contact',
    'fire_imp_contact',
    'fire_cultist_contact',
    'horned_brute_contact',
    'shadow_contact',
    'general_contact',
    'blood_contact',
    'vanguard_contact',
  ];
export function prepareArenaCreeps() {
  const dest = new URL('apps/game-client/public/assets/arena_creeps/', root);
  mkdirSync(dest, { recursive: true });
  const assets = slugs.map((slug, i) => {
    const folder =
        (i < 12 ? 'sprites/creeps/arena/' : 'assets/sprites/creeps/arena/') +
        slug +
        '/',
      m = JSON.parse(readFileSync(new URL(folder + 'manifest.json', root)));
    if (sha(m.sourceConcept) !== m.sourceConceptSha256)
      throw Error('Changed concept ' + slug);
    if (m.animations.length !== 20)
      throw Error('Missing animation set ' + slug);
    const target = new URL(slug + '/', dest);
    mkdirSync(target, { recursive: true });
    for (const n of ['spritesheet.png', 'atlas.json'])
      copyIfChanged(new URL(folder + n, root), new URL(n, target));
    return {
      id: m.id,
      wave: i + 1,
      slug,
      nameVi: m.nameVi,
      status: m.status,
      bodyHeight: heights[i],
      footPivot: m.footPivot,
      animations: m.animations,
      source: m.source,
      sourceConcept: m.sourceConcept,
      sourceConceptSha256: m.sourceConceptSha256,
      sourceManifest: folder + 'manifest.json',
      sourceFolder: folder,
      sheetSha256: sha(folder + 'spritesheet.png'),
      atlasSha256: sha(folder + 'atlas.json'),
      runtimeIntegration: true,
      ...(i >= 8 ? { impact: impacts[i - 8] } : {}),
      ...(i === 12 ? { ambient: 'demon_hound_embers' } : {}),
      ...(i === 13 ? { projectile: 'fire_imp_projectile' } : {}),
      ...(i === 14 ? { projectile: 'fire_cultist_projectile' } : {}),
      ...(i === 16 ? { ambient: 'shadow_trail' } : {}),
      ...(i === 18 ? { projectile: 'blood_projectile' } : {}),
      ...(i === 19 ? { ambient: 'vanguard_aura' } : {}),
      ...(i >= 16
        ? {
            textureKey: m.id,
            animationKeys: m.animations.map(
              (a) => m.id + ':' + a.state + ':' + a.direction,
            ),
          }
        : {}),
    };
  });
  const fx = 'assets/exports/effects/arena_creep_impacts/',
    effectManifest = JSON.parse(
      readFileSync(new URL(fx + 'manifest.json', root)),
    );
  for (const n of ['spritesheet.png', 'atlas.json'])
    copyIfChanged(new URL(fx + n, root), new URL('impacts_' + n, dest));
  const demonFx = 'assets/sprites/creeps/arena/waves-13-16-production/effects/';
  const demonEffects = JSON.parse(
    readFileSync(new URL(demonFx + 'manifest.json', root)),
  );
  for (const n of ['spritesheet.png', 'atlas.json'])
    copyIfChanged(new URL(demonFx + n, root), new URL('demon_fx_' + n, dest));
  const finalFx = 'assets/sprites/creeps/arena/waves-17-20-production/effects/';
  const finalEffects = JSON.parse(
    readFileSync(new URL(finalFx + 'manifest.json', root)),
  );
  for (const n of ['spritesheet.png', 'atlas.json'])
    copyIfChanged(new URL(finalFx + n, root), new URL('final_fx_' + n, dest));
  const manifest = {
    schemaVersion: 1,
    phase: '1J',
    status: 'integrated',
    scope:
      'Presentation bindings for approved arena Waves1–20 concepts. No gameplay/stat recipe changes.',
    assets,
    effects: [
      ...effectManifest.animations,
      ...demonEffects.animations,
      ...finalEffects.animations,
    ],
    effectSource: fx + 'manifest.json',
    demonEffectSource: demonFx + 'manifest.json',
    finalEffectSource: finalFx + 'manifest.json',
  };
  writeIfChanged(
    new URL('assets/arena_creeps.manifest.json', root),
    JSON.stringify(manifest, null, 2) + '\n',
  );
  writeIfChanged(
    new URL('manifest.json', dest),
    JSON.stringify(manifest, null, 2) + '\n',
  );
  writeIfChanged(
    new URL('packages/game-data/src/arena-wave-names.json', root),
    JSON.stringify(
      assets.map((a) => ({ wave: a.wave, nameVi: a.nameVi })),
      null,
      2,
    ) + '\n',
  );
  const files = [
    {
      type: 'json',
      key: 'arena_creeps_manifest',
      url: '/assets/arena_creeps/manifest.json',
    },
    ...assets.map((a) => ({
      type: 'atlas',
      key: a.id,
      textureURL: '/assets/arena_creeps/' + a.slug + '/spritesheet.png',
      atlasURL: '/assets/arena_creeps/' + a.slug + '/atlas.json',
    })),
    {
      type: 'atlas',
      key: 'arena_creep_impacts',
      textureURL: '/assets/arena_creeps/impacts_spritesheet.png',
      atlasURL: '/assets/arena_creeps/impacts_atlas.json',
    },
    {
      type: 'atlas',
      key: 'arena_creep_demon_fx',
      textureURL: '/assets/arena_creeps/demon_fx_spritesheet.png',
      atlasURL: '/assets/arena_creeps/demon_fx_atlas.json',
    },
    {
      type: 'atlas',
      key: 'arena_creep_final_fx',
      textureURL: '/assets/arena_creeps/final_fx_spritesheet.png',
      atlasURL: '/assets/arena_creeps/final_fx_atlas.json',
    },
  ];
  writeIfChanged(
    new URL('pack.json', dest),
    JSON.stringify({ arena_creeps: { files } }, null, 2) + '\n',
  );
}
