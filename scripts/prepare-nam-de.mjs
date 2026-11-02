import {
  readFileSync,
  mkdirSync,
  copyFileSync,
  writeFileSync,
  existsSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
const root = new URL('../', import.meta.url),
  read = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
const lock = read('assets/approved_nam_de_feedback03.lock.json');
for (const [path, expected] of Object.entries(lock.files))
  if (
    createHash('sha256')
      .update(readFileSync(new URL(path, root)))
      .digest('hex') !== expected
  )
    throw Error('Reviewed Nam De input changed: ' + path);
const data = read('assets/reviews/nam_de_v02/data.json');
const bundles = {};
const provenance = [];
for (const p of data.packages) {
  const base = p.base.slice(1);
  const atlas = read(base + '.json');
  for (const ext of ['png', 'json']) {
    const src = new URL(base + '.' + ext, root),
      dest = new URL(
        'apps/game-client/public/assets/nam_de/' + p.key + '.' + ext,
        root,
      );
    mkdirSync(new URL('.', dest), { recursive: true });
    const bytes = readFileSync(src),
      hash = createHash('sha256').update(bytes).digest('hex');
    if (!existsSync(dest) || !readFileSync(dest).equals(bytes))
      copyFileSync(src, dest);
    provenance.push({ source: base + '.' + ext, sha256: hash });
  }
  bundles[p.key] = { ...p, frames: atlas.frames };
}
if (Object.keys(bundles.boss.frames).length !== 208)
  throw Error('Nam De 208-frame contract');
const dest = new URL('apps/game-client/src/nam-de-art.generated.json', root),
  text = JSON.stringify({ bundles, provenance }, null, 2) + '\n';
if (!existsSync(dest) || readFileSync(dest, 'utf8') !== text)
  writeFileSync(dest, text);
console.info(
  'Nam De: retained feedback03 raster bytes / 208 actor cels / 4 facings',
);
