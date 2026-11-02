/** Isolated read-only local review server; no gameplay/server process. */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const here = dirname(fileURLToPath(import.meta.url)),
  root = resolve(here, '../../..');
const flag = process.argv.indexOf('--dependency-root');
const deps = flag < 0 ? root : resolve(process.argv[flag + 1]);
const require = createRequire(resolve(deps, 'apps/game-client/package.json'));
const phaser = resolve(
  dirname(require.resolve('phaser/package.json')),
  'dist/phaser.js',
);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
};
const port = Number(process.env.TAY_DOC_REVIEW_PORT || 5397);
http
  .createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1'),
        path = decodeURIComponent(url.pathname);
      const file =
        path === '/vendor/phaser.js'
          ? phaser
          : path.startsWith('/assets/')
            ? resolve(root, '.' + path)
            : resolve(here, '.' + (path === '/' ? '/index.html' : path));
      if (file !== phaser && !file.startsWith(root + sep)) {
        res.writeHead(403);
        res.end();
        return;
      }
      const data = await readFile(file);
      res.writeHead(200, {
        'Content-Type': types[extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  })
  .listen(port, '127.0.0.1', () =>
    console.log('Tay Doc sprite/VFX review: http://127.0.0.1:' + port),
  );
