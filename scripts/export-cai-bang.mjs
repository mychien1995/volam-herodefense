import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const chuong = process.argv.includes('--chuong');
const id = chuong ? 'hero_cai_bang_chuong' : 'hero_cai_bang';
const source = `assets/source/characters/cai_bang_v1_6/${id}.aseprite`;
const approval = JSON.parse(
  readFileSync(new URL('../assets/manifest.json', import.meta.url)),
);
if (
  approval.assets.some(
    (asset) => asset.id === id && asset.status === 'approved',
  )
)
  throw new Error(
    `Approved baseline ${id} is locked; create a separately reviewed revision instead of overwriting it.`,
  );
const binary =
  process.env.ASEPRITE_PATH ?? 'C:/Program Files/Aseprite/Aseprite.exe';
if (!existsSync(binary))
  throw new Error('Set ASEPRITE_PATH to your installed Aseprite executable.');
function run(args) {
  const result = spawnSync(binary, args, {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) throw new Error(`Aseprite exited ${result.status}`);
}
// Default export preserves manual edits. Rebuild generated cels only when explicit.
if (process.argv.includes('--assemble'))
  run([
    '-b',
    '--script-param',
    `root=${root.replaceAll('\\', '/')}`,
    '--script',
    `assets/source/characters/cai_bang_v1_6/${chuong ? 'assemble_chuong' : 'assemble'}.lua`,
  ]);
run([
  '-b',
  source,
  '--list-tags',
  '--list-slices',
  '--sheet-type',
  'rows',
  '--sheet-columns',
  '10',
  '--filename-format',
  '{tag}_{tagframe}',
  '--format',
  'json-hash',
  '--sheet',
  `assets/exports/characters/${id}.png`,
  '--data',
  `assets/exports/characters/${id}.json`,
]);
run([
  '-b',
  source,
  '--frame-range',
  '0,0',
  '--save-as',
  `assets/exports/characters/${id}_idle.png`,
]);
const atlas = JSON.parse(
  readFileSync(
    new URL(`../assets/exports/characters/${id}.json`, import.meta.url),
  ),
);
// Aseprite embeds its invocation path; keep runtime metadata portable.
atlas.meta.image = `${id}.png`;
writeFileSync(
  new URL(`../assets/exports/characters/${id}.json`, import.meta.url),
  JSON.stringify(atlas, null, 2) + '\n',
);
const names = Object.keys(atlas.frames);
const animations = atlas.meta.frameTags.map((tag) => {
  const match = /^(idle|walk|basic_attack)_(down|left|right|up)$/.exec(
    tag.name,
  );
  if (!match) throw new Error(`Unexpected tag ${tag.name}`);
  const frames = names.slice(tag.from, tag.to + 1);
  if (frames.some((name, i) => name !== `${tag.name}_${i}`))
    throw new Error(`Invalid tag frames ${tag.name}`);
  return {
    state: match[1],
    direction: match[2],
    frames,
    frameRate: 1000 / atlas.frames[frames[0]].duration,
    repeat: match[1] === 'basic_attack' ? 0 : -1,
  };
});
// Outside this art request: preserve all protocol poses without inventing new art.
for (const direction of ['down', 'left', 'right', 'up'])
  for (const [state, fallback] of [
    ['cast', 'basic_attack'],
    ['hurt', 'idle'],
    ['death', 'idle'],
  ]) {
    const original = animations.find(
      (anim) => anim.direction === direction && anim.state === fallback,
    );
    animations.push({ ...original, state, repeat: 0, fallbackFor: fallback });
  }
const manifestPath = new URL('../assets/manifest.json', import.meta.url);
const manifest = JSON.parse(readFileSync(manifestPath));
let entry = manifest.assets.find((asset) => asset.id === id);
if (!entry) {
  entry = { id, category: 'character' };
  manifest.assets.push(entry);
}
Object.assign(entry, {
  status: 'prototype',
  reviewStatus: 'NEEDS REVISION',
  source,
  sheet: `characters/${id}.png`,
  atlas: `characters/${id}.json`,
  basicStyle: chuong ? 'cai_bang_chuong' : 'cai_bang_bong',
  frameWidth: 80,
  frameHeight: 80,
  footPivot: [0.5, 0.8],
  authoredStates: ['idle', 'walk', 'basic_attack'],
  directions: ['down', 'left', 'right', 'up'],
  animations,
  license:
    'Original AI-generated project artwork; generated with built-in OpenAI image_gen; director reference used as design guidance only; no third-party pack imported',
  attribution:
    'Generated original raster poses, Aseprite assembly and alpha cleanup; right-facing poses mirror left; unapproved candidate',
  provenance: 'assets/source/characters/cai_bang_v1_6/README.md',
});
writeFileSync(manifestPath, JSON.stringify(manifest) + '\n');
console.info(
  `Exported ${id}: ${names.length} frames, ${atlas.meta.frameTags.length} authored tags, 80x80, foot pivot 40,64.`,
);
