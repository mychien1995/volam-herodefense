import { spawnSync } from 'node:child_process';
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  copyFileSync,
} from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const here = dirname(fileURLToPath(import.meta.url)),
  root = resolve(here, '../../../..');
const binary =
  process.env.ASEPRITE_PATH ?? 'C:/Program Files/Aseprite/Aseprite.exe';
const json = (p) => JSON.parse(readFileSync(resolve(root, p), 'utf8'));
const hash = (p) =>
  createHash('sha256')
    .update(readFileSync(resolve(root, p)))
    .digest('hex');
const write = (p, v) =>
  writeFileSync(resolve(root, p), JSON.stringify(v, null, 2) + '\n');
const lock = json('assets/approved_vo_dang.lock.json');
function baseline() {
  for (const [p, h] of Object.entries(lock.files))
    if (hash(p) !== h) throw Error('Approved character changed: ' + p);
}
function run(args) {
  const r = spawnSync(binary, args, {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true,
  });
  if (r.error) throw r.error;
  if (r.status !== 0) throw Error(r.stdout + r.stderr);
  if (r.stdout) process.stdout.write(r.stdout);
}
if (!existsSync(binary)) throw Error('Aseprite missing; set ASEPRITE_PATH');
baseline();
const output = 'assets/exports/skills/vo-dang/production_manifest_v01.json';
if (existsSync(resolve(root, output)) && json(output).productionArtApproved)
  throw Error('Approved skill production is locked; use a reviewed revision.');
const recipe = json('assets/source/skills/vo-dang/recipe.json');
const only = process.argv.find((x) => x.startsWith('--asset='))?.slice(8);
const retainedIcons = only ? json(output).icons : null;
if (only && !recipe.assets.some((a) => a.id === only))
  throw Error('Unknown component ' + only);
const assembly = only
  ? { assets: recipe.assets.filter((a) => a.id === only), icons: [] }
  : recipe;
write('assets/source/skills/vo-dang/recipe_selected.json', assembly);
if (process.argv.includes('--assemble'))
  run([
    '-b',
    '--script-param',
    'root=' + root.replaceAll('\\', '/'),
    '--script-param',
    'recipe=' + resolve(here, 'recipe_selected.json').replaceAll('\\', '/'),
    '--script',
    resolve(here, 'assemble.lua'),
  ]);
const assets = [];
for (const a of recipe.assets) {
  if (only && a.id !== only) {
    assets.push(json(a.exportFolder + '/' + a.id + '.animations.json'));
    continue;
  }
  const source = a.sourceFolder + '/' + a.id + '.aseprite',
    sheet = a.exportFolder + '/' + a.id + '.png',
    atlas = a.exportFolder + '/' + a.id + '.json';
  run([
    '-b',
    resolve(root, source),
    '--list-tags',
    '--list-slices',
    '--sheet-type',
    'rows',
    '--sheet-columns',
    '8',
    '--filename-format',
    '{tag}_{tagframe}',
    '--format',
    'json-hash',
    '--sheet',
    resolve(root, sheet),
    '--data',
    resolve(root, atlas),
  ]);
  const packed = json(atlas);
  packed.meta.image = basename(sheet);
  write(atlas, packed);
  const animations = a.animations.map((anim) => ({
    name: anim.name,
    frames: anim.frames.map((_, i) => anim.name + '_' + i),
    frameDimensions: a.canvas,
    frameCount: anim.frames.length,
    frameRate: 1000 / anim.durationMs,
    durationMsPerFrame: anim.durationMs,
    loop: anim.loop,
    repeat: anim.loop ? -1 : 0,
    direction: anim.direction,
    origin: [a.pivot[0] / a.canvas[0], a.pivot[1] / a.canvas[1]],
    pivot: a.pivot,
    stage: anim.stage,
    placement: anim.placement,
    effectPlacementOffset: anim.effectPlacementOffset,
    timingAuthority:
      'Presentation cadence only. Lifetime, hit, resource return, counter trigger and cleanup require authoritative events. No gameplay implemented.',
  }));
  const frameDir = resolve(root, a.exportFolder, a.kind, 'frames');
  mkdirSync(frameDir, { recursive: true });
  // Retain edits made in the actual editable source when exporting individual cels.
  run([
    '-b',
    resolve(root, source),
    '--filename-format',
    '{tag}_{tagframe}',
    '--save-as',
    resolve(root, a.sourceFolder, 'frames', '{tag}_{tagframe}.png'),
  ]);
  for (const anim of a.animations)
    for (const p of anim.frames)
      copyFileSync(resolve(root, p), resolve(frameDir, basename(p)));
  const component = {
    id: a.id,
    skillId: a.skillId,
    kind: a.kind,
    status: 'prototype_pending_final_approval',
    source,
    sheet,
    atlas,
    sourceSha256: hash(source),
    sheetSha256: hash(sheet),
    atlasSha256: hash(atlas),
    rawSource: a.rawSource,
    frameDimensions: a.canvas,
    pivot: a.pivot,
    origin: [a.pivot[0] / a.canvas[0], a.pivot[1] / a.canvas[1]],
    animations,
    provenance: a.artMethod,
    reuseNotes: a.reuseNotes ?? [],
    runtimeIntegrated: false,
    productionArtApproved: false,
  };
  write(a.exportFolder + '/' + a.id + '.animations.json', component);
  assets.push(component);
}
for (const icon of recipe.icons) {
  if (only) continue;
  run([
    '-b',
    resolve(root, icon.editableSource),
    '--save-as',
    resolve(root, icon.path),
  ]);
  icon.sha256 = hash(icon.path);
  icon.sourceSha256 = hash(icon.editableSource);
}
const concepts = json(
  'assets/concepts/skills/vo-dang/concept_manifest_v02.json',
);
const entries = concepts.records.map((r) => ({
  id: r.id,
  nameVi: r.name,
  kind: r.kind,
  approvedConcept: r.kind === 'active' ? r.concept : r.approvedConcept,
  approvedIconConcept: r.icon,
  characterAsset:
    r.kind === 'active'
      ? r.id + '_character'
      : r.kind === 'basic'
        ? r.id === 'vo_dang_kiem'
          ? 'hero_vo_dang_kiem'
          : 'hero_vo_dang'
        : null,
  vfxAsset:
    r.kind === 'active'
      ? r.id + '_vfx'
      : r.id === 'vo_dang_kiem'
        ? 'nhan_kiem_hop_nhat_vfx'
        : null,
  vfxReuse:
    r.id === 'vo_dang_kiem'
      ? 'Optional preview-only qi uses the new approved-direction straight travel component at half display size. No guaranteed proc, chance RNG or basic mechanic implemented.'
      : null,
  icon: recipe.icons.find((i) => i.id === r.id).path,
  finalArtApproval: 'pending',
  exportStatus: 'produced_prototype',
  phaserVerification: 'pending',
  gameplayIntegration:
    'pending; visual preview only; existing authoritative gameplay unchanged',
}));
const manifest = {
  schemaVersion: 1,
  createdOn: '2026-10-31',
  schoolId: 'vo_dang',
  scope:
    'Skill character/VFX/icon production prototypes and isolated Phaser art preview only',
  conceptApproval: {
    source: 'User message in this chat',
    text: 'all approved',
    scope: '10 selected active concepts and13 selected icon concepts',
    record: 'assets/source/skills/vo-dang/concept_approval_v01.json',
  },
  productionArtApproved: false,
  runtimeIntegrated: false,
  baseline: {
    lock: 'assets/approved_vo_dang.lock.json',
    unchanged: true,
    protectedFileCount: Object.keys(lock.files).length,
  },
  provenance: {
    method:
      'OpenAI built-in image_gen.imagegen original transparent raster animation sources; measured PNG preparation and Aseprite1.3.18.6 editable-source export.',
    prompts: [
      'assets/source/skills/vo-dang/generation_prompts_v01.json',
      'assets/source/skills/vo-dang/generation_prompts_v02.json',
      'assets/source/skills/vo-dang/generation_prompts_v03.json',
    ],
    placements: 'assets/source/skills/vo-dang/frame_placements_v01.json',
    license:
      'Original AI-assisted project assets and explicitly disclosed reused project pixels. No external sprite pack, human hand-pixelled authorship or exclusive copyright claim. Director references are direction only.',
  },
  limitations: [
    'No Võ Đang mechanics, damage, cooldowns, costs, targeting, rank/loadout or server code changed.',
    'Shield lifetime mode and numerical counts/radii/cadence remain undecided.',
    'Preview choreography is presentation-only; basic qi reuse is an optional demonstration, not a gameplay proc.',
  ],
  assets,
  icons: retainedIcons ?? recipe.icons,
  entries,
};
write(output, manifest);
baseline();
console.log(
  `Exported ${only ? 1 : assets.length} character/VFX components; retained ${assets.length} components and13 icons in manifest; approved89-file baseline unchanged.`,
);
