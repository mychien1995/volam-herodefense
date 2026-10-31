import { spawnSync } from 'node:child_process';
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  copyFileSync,
  readdirSync,
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
function baseline() {
  let count = 0;
  for (const n of readdirSync(resolve(root, 'assets')).filter((n) =>
    /^approved_.*\.lock\.json$/.test(n),
  )) {
    for (const [p, h] of Object.entries(json('assets/' + n).files)) {
      if (hash(p) !== h) throw Error('Protected character changed: ' + p);
      count++;
    }
  }
  return count;
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
if (!existsSync(binary)) throw Error('Aseprite missing');
const protectedCount = baseline(),
  recipe = json('assets/source/skills/thieu-lam/recipe.json'),
  brief = json('assets/source/skills/thieu-lam/production_brief_v01.json');
if (process.argv.includes('--assemble'))
  run([
    '-b',
    '--script-param',
    'root=' + root.replaceAll('\\', '/'),
    '--script-param',
    'recipe=' + resolve(here, 'recipe.json').replaceAll('\\', '/'),
    '--script',
    resolve(here, 'assemble.lua'),
  ]);
const assets = [];
for (const a of recipe.assets) {
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
      'Presentation only. Authoritative events determine hit, lifetime, healing, defense and same-target combo eligibility. No gameplay implementation.',
  }));
  const frameDir = resolve(root, a.exportFolder, a.kind, 'frames');
  mkdirSync(frameDir, { recursive: true });
  for (const anim of a.animations)
    for (const p of anim.frames)
      copyFileSync(resolve(root, p), resolve(frameDir, basename(p)));
  const component = {
    id: a.id,
    skillId: a.skillId,
    kind: a.kind,
    status: 'prototype_approval_gate_waived',
    approvalGate: 'approval gate waived by user',
    source,
    sheet,
    atlas,
    sourceSha256: hash(source),
    sheetSha256: hash(sheet),
    atlasSha256: hash(atlas),
    rawSource: a.rawSource,
    correctionSources: a.correctionSources ?? [],
    frameDimensions: a.canvas,
    pivot: a.pivot,
    origin: [a.pivot[0] / a.canvas[0], a.pivot[1] / a.canvas[1]],
    animations,
    provenance: a.artMethod,
    reuseNotes: a.reuseNotes,
    gameplayIntegrated: false,
    previewIntegrated: true,
    productionArtApproved: false,
  };
  write(a.exportFolder + '/' + a.id + '.animations.json', component);
  assets.push(component);
}
for (const icon of recipe.icons) {
  run([
    '-b',
    resolve(root, icon.editableSource),
    '--save-as',
    resolve(root, icon.path),
  ]);
  icon.sha256 = hash(icon.path);
  icon.sourceSha256 = hash(icon.editableSource);
}
const entries = brief.skills.map((s) => ({
  id: s.id,
  nameVi: s.nameVi,
  kind: 'active',
  style: s.style,
  concept:
    'assets/concepts/skills/thieu-lam/' +
    s.id +
    '/' +
    s.id +
    '_concept_v01.png',
  characterAsset: s.id + '_character',
  vfxAsset: s.id + '_vfx',
  icon: recipe.icons.find((i) => i.id === s.id)?.path,
  stages: s.stages,
  approvalGate: 'approval gate waived by user',
  phaserVerification: 'pending',
  gameplayIntegration: 'Presentation-only preview; mechanics unchanged',
}));
if (recipe.icons.some((i) => i.id === 'dich_can_kinh'))
  entries.push({
    id: 'dich_can_kinh',
    nameVi: 'Dịch Cân Kinh',
    kind: 'passive',
    style: 'quyen',
    concept:
      'assets/concepts/skills/thieu-lam/dich_can_kinh/dich_can_kinh_concept_v01.png',
    characterAsset: null,
    vfxAsset: null,
    icon: recipe.icons.find((i) => i.id === 'dich_can_kinh').path,
    approvalGate: 'approval gate waived by user',
    note: 'Automatic HP/defense/regeneration growth; no activation animation or permanent aura.',
  });
const prompts = readdirSync(resolve(here, 'prompts'))
  .filter((n) => n.endsWith('.json'))
  .map((n) => 'assets/source/skills/thieu-lam/prompts/' + n);
write('assets/exports/skills/thieu-lam/production_manifest_v01.json', {
  schemaVersion: 1,
  date: '2026-10-31',
  schoolId: 'thieu_lam',
  scope:
    '13 active skill artworks plus passive icon; presentation-only Phaser integration',
  status: 'prototype_approval_gate_waived',
  approvalGate: 'approval gate waived by user',
  approvalEvidence: brief.approvalEvidence,
  independentlyReviewedApproval: false,
  productionArtApproved: false,
  gameplayIntegrated: false,
  previewIntegrated: true,
  baseline: {
    lock: 'assets/approved_thieu_lam.lock.json',
    allSchoolProtectedFileCount: protectedCount,
    unchanged: true,
  },
  provenance: {
    method:
      'Original built-in OpenAI image_gen raster concepts and new action/VFX drawings; measured preparation and editable Aseprite export.',
    prompts,
    placements: 'assets/source/skills/thieu-lam/frame_placements_v01.json',
    references: brief.referenceNotes,
    license:
      'Original AI-assisted project assets; supplied school references guide style only. No proprietary game sprite extraction; no claim of human hand-pixelled authorship or independently reviewed approval.',
  },
  normalAttackReuse: {
    quyen: 'assets/exports/characters/hero_thieu_lam.json',
    dao: 'assets/exports/characters/hero_thieu_lam_dao.json',
    policy: 'Approved normal clips reused unchanged, never regenerated.',
  },
  limitations: [
    'Phaser preview only; live skill mechanics unavailable and unchanged.',
    'Bất Động Minh Vương healing artwork follows current documentation; possible mitigation redesign remains open.',
    'Empowered finishers are optional target-specific presentations; no global combo rule.',
    'Effect timing, radius and counts are illustrative; client visuals never determine damage or eligibility.',
  ],
  assets,
  icons: recipe.icons,
  entries,
});
baseline();
console.log(
  'Exported ' +
    assets.length +
    ' components and ' +
    recipe.icons.length +
    ' icons; ' +
    protectedCount +
    ' protected files unchanged.',
);
