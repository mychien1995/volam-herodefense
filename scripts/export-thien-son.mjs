import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const sourceFolder = 'assets/source/characters/thien_son_v01';
const binary =
  process.env.ASEPRITE_PATH ?? 'C:/Program Files/Aseprite/Aseprite.exe';
if (!existsSync(binary)) throw new Error('Set ASEPRITE_PATH to Aseprite.');
const manifestPath = new URL('../assets/manifest.json', import.meta.url);
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const ids = ['hero_thien_son', 'hero_thien_son_dao'];
if (manifest.assets.some((a) => ids.includes(a.id) && a.status === 'approved'))
  throw new Error(
    'Approved Thiên Sơn assets are locked. Create a separate revision.',
  );
function run(args) {
  const r = spawnSync(binary, args, {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true,
  });
  if (r.error) throw r.error;
  if (r.status !== 0)
    throw new Error(r.stderr || r.stdout || 'Aseprite export failed');
  if (r.stdout) process.stdout.write(r.stdout);
}
if (process.argv.includes('--assemble'))
  run([
    '-b',
    '--script-param',
    'root=' + root.replaceAll('\\', '/'),
    '--script',
    sourceFolder + '/assemble.lua',
  ]);
for (const id of ids) {
  const source = sourceFolder + '/' + id + '.aseprite';
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
    'assets/exports/characters/' + id + '.png',
    '--data',
    'assets/exports/characters/' + id + '.json',
  ]);
  run([
    '-b',
    source,
    '--frame-range',
    '0,0',
    '--save-as',
    'assets/exports/characters/' + id + '_idle.png',
  ]);
  const framesDir =
    'assets/exports/characters/thien_son_v01/' +
    (id.endsWith('_dao') ? 'dao' : 'fan') +
    '/frames';
  mkdirSync(new URL('../' + framesDir + '/', import.meta.url), {
    recursive: true,
  });
  run([
    '-b',
    source,
    '--filename-format',
    '{tag}_{tagframe}',
    '--save-as',
    framesDir + '/{tag}_{tagframe}.png',
  ]);
  const atlasPath = new URL(
    '../assets/exports/characters/' + id + '.json',
    import.meta.url,
  );
  const atlas = JSON.parse(readFileSync(atlasPath, 'utf8'));
  atlas.meta.image = id + '.png';
  writeFileSync(atlasPath, JSON.stringify(atlas, null, 2) + '\n');
  const names = Object.keys(atlas.frames);
  const animations = atlas.meta.frameTags.map((tag) => {
    const match = /^(idle|walk|basic_attack)_(down|left|right|up)$/.exec(
      tag.name,
    );
    if (!match) throw new Error('Unexpected tag ' + tag.name);
    const frames = names.slice(tag.from, tag.to + 1);
    if (frames.some((name, i) => name !== tag.name + '_' + i))
      throw new Error('Invalid tag names');
    return {
      state: match[1],
      direction: match[2],
      frames,
      frameRate: 1000 / atlas.frames[frames[0]].duration,
      repeat: match[1] === 'basic_attack' ? 0 : -1,
    };
  });
  for (const direction of ['down', 'left', 'right', 'up'])
    for (const [state, fallback] of [
      ['cast', 'basic_attack'],
      ['hurt', 'idle'],
      ['death', 'idle'],
    ]) {
      const original = animations.find(
        (a) => a.state === fallback && a.direction === direction,
      );
      animations.push({ ...original, state, repeat: 0, fallbackFor: fallback });
    }
  const entry = {
    id,
    category: 'character',
    status: 'prototype',
    reviewStatus: 'PENDING FINAL IN-GAME ART APPROVAL',
    source,
    sheet: 'characters/' + id + '.png',
    atlas: 'characters/' + id + '.json',
    frameWidth: 80,
    frameHeight: 80,
    footPivot: [0.5, 0.8],
    authoredStates: ['idle', 'walk', 'basic_attack'],
    directions: ['down', 'left', 'right', 'up'],
    animations,
    weapon: id.endsWith('_dao') ? 'curved_dao' : 'folding_fan',
    license:
      'Original AI-assisted project artwork; generated with built-in OpenAI image_gen using the director-approved Thiên Sơn concept as reference. No third-party sprite pack imported; no exclusive copyright asserted.',
    attribution:
      'Original generated poses, connected-alpha cleanup and nearest-neighbour alignment in Aseprite. All four directions separately authored; no mirrored weapon hands.',
    provenance: sourceFolder + '/production_manifest_v01.json',
    approvedConcept:
      'assets/concepts/heroes/thien-son/thien-son-concept-v01.png',
  };
  const i = manifest.assets.findIndex((a) => a.id === id);
  if (i < 0) manifest.assets.push(entry);
  else manifest.assets[i] = entry;
  console.info(
    'Exported ' +
      id +
      ': ' +
      names.length +
      ' frames, 12 authored tags, prototype.',
  );
}
writeFileSync(manifestPath, JSON.stringify(manifest) + '\n');
