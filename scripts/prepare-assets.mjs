import { cpSync, mkdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const lock = JSON.parse(
  readFileSync(new URL('assets/approved_cai_bang.lock.json', root)),
);
for (const [file, expected] of Object.entries(lock.files)) {
  const actual = createHash('sha256')
    .update(readFileSync(new URL(file, root)))
    .digest('hex');
  if (actual !== expected)
    throw new Error(`Approved Cai Bang baseline changed: ${file}`);
}
const dest = new URL('apps/game-client/public/assets/', root);
mkdirSync(dest, { recursive: true });
cpSync(new URL('assets/exports/', root), dest, { recursive: true });
cpSync(new URL('assets/manifest.json', root), new URL('manifest.json', dest));
cpSync(new URL('maps/arena.tmj', root), new URL('arena.tmj', dest));
cpSync(
  new URL('maps/creep_forest.tmj', root),
  new URL('creep_forest.tmj', dest),
);
cpSync(
  new URL('maps/creep_forest.tmj', root),
  new URL('packages/game-data/src/creep-forest-map.json', root),
);
cpSync(
  new URL('maps/arena.tmj', root),
  new URL('packages/game-data/src/arena-map.json', root),
);
console.info(`Prepared M1 assets and shared map in ${fileURLToPath(dest)}`);
