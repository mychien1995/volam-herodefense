import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { copyIfChanged, writeIfChanged } from './asset-files.mjs';
const root = new URL('../', import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
export function prepareTayDocAssets() {
  const approval = read('assets/reviews/tay_doc_v02/director_approval.json');
  if (approval.status !== 'approved_visual_design_and_feedback03_choreography')
    throw Error('Missing Tay Doc feedback03 approval');
  const hash = (p) =>
    createHash('sha256')
      .update(readFileSync(new URL(p, root)))
      .digest('hex');
  for (const item of approval.frozenInputsNotBlanketCelApproval)
    if (hash(item.path) !== item.sha256)
      throw Error('Approved Tay Doc input changed: ' + item.path);
  const directions = read('assets/runtime/tay_doc_directions_v01.json');
  for (const item of [...directions.files, ...directions.sources])
    if (hash(item.path) !== item.sha256)
      throw Error('Tay Doc directional input changed: ' + item.path);
  const packages = read('assets/reviews/tay_doc_v02/packages.json');
  delete packages.hero;
  const dir = 'assets/exports/bosses/tay_doc_runtime_v01';
  packages.directions = {
    path: '/' + dir,
    image: 'spritesheet.png',
    atlas: 'atlas.json',
    ...read(dir + '/animations.json'),
  };
  const bounds = JSON.parse(
    execFileSync(
      'python',
      [
        '-c',
        `import json,sys
from PIL import Image
from pathlib import Path
r=Path(sys.argv[1]);data=json.load(sys.stdin);out={}
for key,p in data.items():
 folder=r/p['path'].lstrip('/');atlas=json.loads((folder/p['atlas']).read_text(encoding='utf8'));sheet=Image.open(folder/p['image']).convert('RGBA');out[key]={}
 for name,f in atlas['frames'].items():
  v=f['frame'];im=sheet.crop((v['x'],v['y'],v['x']+v['w'],v['y']+v['h']));out[key][name]=list(im.getbbox() or [0,0,v['w'],v['h']])
print(json.dumps(out))`,
        fileURLToPath(root),
      ],
      { input: JSON.stringify(packages), encoding: 'utf8' },
    ),
  );
  const playback = {};
  for (const [key, p] of Object.entries(packages)) {
    const base = p.path.replace(/^\//, '');
    const dest = 'apps/game-client/public/assets/tay_doc/' + key;
    copyIfChanged(
      new URL(base + '/' + p.image, root),
      new URL(dest + '.png', root),
    );
    copyIfChanged(
      new URL(base + '/' + p.atlas, root),
      new URL(dest + '.json', root),
    );
    playback[key] = {
      origin: p.origin,
      animations: p.animations,
      bounds: bounds[key],
    };
  }
  writeIfChanged(
    new URL('apps/game-client/src/tay-doc-playback.json', root),
    JSON.stringify(playback) + '\n',
  );
  console.log(
    'Tay Doc: ' +
      approval.frozenInputsNotBlanketCelApproval.length +
      ' approved input hashes;60 new candidate directional cels retained.',
  );
}
