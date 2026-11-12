import { prepareWaveBossFeedback } from './prepare-wave-boss-feedback.mjs';
import { prepareTayDocAssets } from './prepare-tay-doc-assets.mjs';
import { validateCharacterRevision } from './prepare-character-revision.mjs';
import './prepare-nam-de.mjs';
import { prepareKimAssets } from './prepare-kim-assets.mjs';
import { prepareDongTa } from './prepare-dong-ta.mjs';

import { prepareM3dFeedbackArt } from './prepare-m3d-feedback-art.mjs';
import { prepareM3dR3Art } from './prepare-m3d-r3-art.mjs';
import { prepareBacCaiPreview } from './prepare-bac-cai-preview.mjs';
import { prepareChuAssets } from './prepare-chu-assets.mjs';
import { prepareM3dFollowup } from './prepare-m3d-followup.mjs';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { prepareArenaCreeps } from './prepare-arena-creeps.mjs';
import { prepareForestCreepReview } from './prepare-forest-creep-review.mjs';
import { prepareDesertAssets } from './prepare-desert-assets.mjs';
import { prepareBeachAssets } from './prepare-beach-assets.mjs';
import { prepareLyMacSau } from './prepare-ly-mac-sau.mjs';
import { prepareHellAssets } from './prepare-hell-assets.mjs';
import { prepareFeedbackV2Art } from './prepare-feedback-v2-art.mjs';
import { prepareApprovedAnimationArt } from './prepare-approved-animation-art.mjs';
import {
  assetWrites,
  copyIfChanged,
  copyTreeIfChanged,
  writeIfChanged,
} from './asset-files.mjs';
import { prepareHongLietAssets } from './prepare-hong-liet-assets.mjs';
const root = new URL('../', import.meta.url);
const caiBangIcons = new URL('assets/exports/skills/cai-bang-icons-v2/', root);
const iconManifest = JSON.parse(
  readFileSync(new URL('manifest.json', caiBangIcons), 'utf8'),
);
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const iconSource = readFileSync(new URL(iconManifest.source, root));
if (
  hash(iconSource) !== iconManifest.sourceSha256 ||
  Object.keys(iconManifest.icons).length !== 13
)
  throw Error('Invalid Cái Bang icon atlas provenance');
const iconHashes = new Set();
for (const [id, icon] of Object.entries(iconManifest.icons)) {
  if (!/^[a-z_]+$/.test(id)) throw Error('Invalid Cái Bang icon identity');
  const png = readFileSync(new URL(id + '.png', caiBangIcons));
  const fingerprint = hash(png);
  if (
    png.readUInt32BE(16) !== 64 ||
    png.readUInt32BE(20) !== 64 ||
    fingerprint !== icon.sha256 ||
    iconHashes.has(fingerprint)
  )
    throw Error('Invalid Cái Bang icon export ' + id);
  iconHashes.add(fingerprint);
}
validateCharacterRevision();
const approvedArt = JSON.parse(
  readFileSync(
    new URL('apps/game-client/src/approved-art.generated.json', root),
  ),
);
const approvedUrls = new Set();
for (const entry of approvedArt.assets) {
  if (approvedUrls.has(entry.url))
    throw Error('Duplicate approved artwork URL: ' + entry.url);
  approvedUrls.add(entry.url);
  if (!entry.candidateUrl.startsWith('/assets/visual-improvement-approved/'))
    throw Error('Invalid approved artwork URL: ' + entry.candidateUrl);
  const path = entry.candidateUrl.replace(/^\/assets\//, 'assets/exports/');
  const actual = createHash('sha256')
    .update(readFileSync(new URL(path, root)))
    .digest('hex');
  if (actual !== entry.sha256)
    throw Error('Approved artwork hash mismatch: ' + path);
}
for (const [name, label] of [
  ['approved_chu_ba_thong.lock.json', 'Chu Bá Thông'],
  [
    'approved_renovation_v1.lock.json',
    'Renovation v1 idle/walk and scene artwork',
  ],
  ['approved_bac_cai.lock.json', 'Bắc Cái visual v03'],
  ['approved_cai_bang.lock.json', 'Cai Bang'],
  ['approved_thien_son.lock.json', 'Thien Son'],
  ['approved_vo_dang.lock.json', 'Vo Dang'],
  ['approved_bamboo_forest.lock.json', 'Bamboo Forest environment'],
  ['approved_forest_creeps.lock.json', 'Bamboo Forest creep artwork'],
  ['approved_vo_dang_skills.lock.json', 'Vo Dang skills'],
  ['approved_thieu_lam.lock.json', 'Thieu Lam'],
  ['approved_diamond_palm_v05.lock.json', 'Đại Lực Kim Cương Chưởng v05'],
  ['approved_shaolin_quyen_rework.lock.json', 'Thiếu Lâm Quyền rework'],
  ['approved_shaolin_dao.lock.json', 'Thiếu Lâm Đao rework'],
  ['approved_m3d_hit_continuity.lock.json', 'M3D hit continuity'],
  ['approved_arena_creeps_13_16.lock.json', 'arena creeps Waves 13–16'],
]) {
  // Thiếu Lâm remains a prototype until the separate final director approval.
  if (
    name === 'approved_thieu_lam.lock.json' &&
    !existsSync(new URL('assets/' + name, root))
  )
    continue;
  const lock = JSON.parse(readFileSync(new URL('assets/' + name, root)));
  for (const [file, expected] of Object.entries(lock.files)) {
    const actual = createHash('sha256')
      .update(readFileSync(new URL(file, root)))
      .digest('hex');
    if (actual !== expected)
      throw new Error('Approved ' + label + ' baseline changed: ' + file);
  }
}
const dest = new URL('apps/game-client/public/assets/', root);
copyTreeIfChanged(
  new URL('assets/exports/m3d-hit-continuity/', root),
  new URL('m3d-hit-continuity/', dest),
);
prepareWaveBossFeedback();
prepareKimAssets();
prepareDongTa();

prepareM3dFeedbackArt();
prepareM3dR3Art();
prepareChuAssets();
prepareM3dFollowup();
prepareFeedbackV2Art();
const skills = JSON.parse(
  readFileSync(
    new URL('assets/exports/skills/cai-bang/production_manifest_v1.json', root),
    'utf8',
  ),
);
const windSkills = JSON.parse(
  readFileSync(
    new URL(
      'assets/exports/skills/thien-son/production_manifest_v01.json',
      root,
    ),
    'utf8',
  ),
);
skills.assets.push(...windSkills.assets);
const yinYangSkills = JSON.parse(
  readFileSync(
    new URL('assets/exports/skills/vo-dang/production_manifest_v01.json', root),
    'utf8',
  ),
);
skills.assets.push(...yinYangSkills.assets);
const goldSkills = JSON.parse(
  readFileSync(
    new URL(
      'assets/exports/skills/thieu-lam/production_manifest_v01.json',
      root,
    ),
    'utf8',
  ),
);
skills.assets.push(...goldSkills.assets);
const animationKeys = new Set();
for (const a of skills.assets) {
  for (const file of [a.sheet, a.atlas])
    if (!existsSync(new URL(file, root)))
      throw new Error(`Missing required skill asset: ${file}`);
  const png = readFileSync(new URL(a.sheet, root)),
    atlas = JSON.parse(readFileSync(new URL(a.atlas, root), 'utf8'));
  const width = png.readUInt32BE(16),
    height = png.readUInt32BE(20);
  for (const tag of a.animations) {
    const key = a.id + ':' + tag.name;
    if (animationKeys.has(key))
      throw new Error(`Duplicate skill animation ${key}`);
    animationKeys.add(key);
    if (tag.frames.length !== tag.frameCount)
      throw new Error(`Skill frame count mismatch: ${key}`);
    for (const name of tag.frames) {
      const f = atlas.frames[name]?.frame;
      if (!f || f.x < 0 || f.y < 0 || f.x + f.w > width || f.y + f.h > height)
        throw new Error(`Invalid skill frame: ${key}:${name}`);
    }
  }
  if (
    a.kind === 'vfx' &&
    a.skillId !== 'shared_fire' &&
    !existsSync(
      new URL(
        `assets/exports/skills/${a.sheet.split('/')[3]}/${a.skillId}/icon.png`,
        root,
      ),
    )
  )
    throw new Error(
      `Missing derived icon for ${a.skillId}; run python scripts/prepare-skill-assets.py`,
    );
}
writeIfChanged(
  new URL('packages/game-data/src/skill-art.json', root),
  JSON.stringify(skills, null, 2) + '\n',
);
mkdirSync(dest, { recursive: true });
copyTreeIfChanged(new URL('assets/exports/', root), dest);
copyIfChanged(
  new URL('assets/manifest.json', root),
  new URL('manifest.json', dest),
);
copyIfChanged(new URL('maps/arena.tmj', root), new URL('arena.tmj', dest));
copyIfChanged(
  new URL('maps/creep_forest.tmj', root),
  new URL('creep_forest.tmj', dest),
);
copyIfChanged(
  new URL('maps/creep_forest.tmj', root),
  new URL('packages/game-data/src/creep-forest-map.json', root),
);
copyIfChanged(
  new URL('maps/arena.tmj', root),
  new URL('packages/game-data/src/arena-map.json', root),
);
prepareArenaCreeps();
prepareForestCreepReview();
prepareDesertAssets();
prepareBeachAssets();
prepareHongLietAssets();
// Retained review references include generated public atlases: verify after copies.
prepareApprovedAnimationArt();
prepareLyMacSau();
prepareHellAssets();
prepareTayDocAssets();
prepareBacCaiPreview();
console.info(
  `Prepared assets in ${fileURLToPath(dest)} (${assetWrites.changed} written, ${assetWrites.unchanged} unchanged)`,
);
