import { cpSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const dest = new URL('apps/game-client/public/assets/', root);
mkdirSync(dest, { recursive: true });
cpSync(new URL('assets/exports/', root), dest, { recursive: true });
cpSync(new URL('assets/manifest.json', root), new URL('manifest.json', dest));
cpSync(new URL('maps/arena.tmj', root), new URL('arena.tmj', dest));
cpSync(
  new URL('maps/arena.tmj', root),
  new URL('packages/game-data/src/arena-map.json', root),
);
console.info(`Prepared M1 assets and shared map in ${fileURLToPath(dest)}`);
