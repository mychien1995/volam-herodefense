/** Read-only art review server; no game server, room or websocket. */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const here = dirname(fileURLToPath(import.meta.url)),
  root = resolve(here, '../../..');
const require = createRequire(resolve(root, 'apps/game-client/package.json'));
const phaser = resolve(
  dirname(require.resolve('phaser/package.json')),
  'dist/phaser.js',
);
const port = Number(process.env.WAVE_VFX_REVIEW_PORT || 5461);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
};
const server = http.createServer(async (req, res) => {
  try {
    const name = decodeURIComponent(
      new URL(req.url, 'http://localhost').pathname,
    );
    if (name === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(
        JSON.stringify({
          kind: 'wave-vfx-preview-v02',
          root,
          pid: process.pid,
          scope: 'VISUAL_PREVIEW_ONLY',
        }),
      );
      return;
    }
    if (name === '/favicon.ico') {
      res.writeHead(204).end();
      return;
    }
    const file =
      name === '/vendor/phaser.js'
        ? phaser
        : name.startsWith('/wave_boss_feedback_v01/')
          ? resolve(root, 'assets/reviews' + name)
          : name.startsWith('/assets/')
            ? resolve(root, '.' + name)
            : resolve(here, '.' + (name === '/' ? '/index.html' : name));
    if (file !== phaser && !file.startsWith(root + sep)) {
      res.writeHead(403).end();
      return;
    }
    const content = await readFile(file);
    res
      .writeHead(200, {
        'Content-Type': types[extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      })
      .end(content);
  } catch {
    res.writeHead(404).end('Not found');
  }
});
server.listen(port, '127.0.0.1', () =>
  console.log(`Wave boss VFX review: http://127.0.0.1:${port}`),
);
server.on('error', (e) => {
  console.error(e.message);
  process.exitCode = 1;
});
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => server.close(() => process.exit()));
