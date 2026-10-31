import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const port = Number(process.argv[2] ?? 8768);
const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
};
const server = createServer((req, res) => {
  try {
    const u = new URL(req.url, 'http://localhost');
    const name =
      u.pathname === '/'
        ? '/assets/reviews/skills/thieu-lam/index.html'
        : decodeURIComponent(u.pathname);
    const path = resolve(root, '.' + name);
    if (!path.startsWith(root + sep)) throw Error('Path');
    res.setHeader(
      'Content-Type',
      mime[extname(path)] ?? 'application/octet-stream',
    );
    res.end(readFileSync(path));
  } catch {
    res.writeHead(404);
    res.end();
  }
});
server.listen(port, '127.0.0.1', () =>
  console.log(
    'Thiếu Lâm art review: http://127.0.0.1:' +
      port +
      '/assets/reviews/skills/thieu-lam/index.html',
  ),
);
