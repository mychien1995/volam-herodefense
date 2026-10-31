import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  writeFileSync,
  readdirSync,
  existsSync,
  copyFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

// Isolated, ignored snapshot; never switches branches or edits approved assets.
const out = 'artifacts/feedback-baseline/';
const req = createRequire(resolve('packages/game-data/package.json'));
const zod = pathToFileURL(req.resolve('zod')).href;
const serverRequire = createRequire(resolve('apps/game-server/package.json'));
const { transformSync } = createRequire(serverRequire.resolve('tsx'))(
  'esbuild',
);
const files = execFileSync(
  'git',
  [
    'ls-tree',
    '-r',
    '--name-only',
    'HEAD',
    'packages/game-core/src',
    'packages/game-data/src',
  ],
  { encoding: 'utf8' },
)
  .trim()
  .split(/\r?\n/);
for (const file of files) {
  if (!/\.(ts|json)$/.test(file)) continue;
  const text = execFileSync('git', ['show', 'HEAD:' + file], {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
  const dest = out + file.replace(/\.ts$/, '.js');
  mkdirSync(dirname(dest), { recursive: true });
  const source = text.replaceAll("from 'zod'", "from '" + zod + "'");
  writeFileSync(
    dest,
    file.endsWith('.json')
      ? text
      : transformSync(source, { loader: 'ts', format: 'esm', target: 'es2022' })
          .code,
  );
}
writeFileSync(out + 'package.json', JSON.stringify({ type: 'module' }));
const preparedJson = [];
for (const name of readdirSync('packages/game-data/src')) {
  const dest = out + 'packages/game-data/src/' + name;
  if (name.endsWith('.json') && !existsSync(dest)) {
    copyFileSync('packages/game-data/src/' + name, dest);
    preparedJson.push(name);
  }
}
writeFileSync(
  out + 'baseline.json',
  JSON.stringify(
    {
      commit: execFileSync('git', ['rev-parse', 'HEAD'], {
        encoding: 'utf8',
      }).trim(),
      preparedJson,
      source:
        'Unmodified git HEAD core/data TypeScript plus unchanged prepared map/art JSON in an ignored artifact directory; no checkout or historical evidence changed.',
    },
    null,
    2,
  ),
);
console.log('Prepared actual Git HEAD baseline: ' + out);
