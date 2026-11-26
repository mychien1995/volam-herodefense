import { createHash } from 'node:crypto';
import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import {
  deploymentInputs,
  validateSelection,
  keepDeploymentAsset,
} from './deploy-asset-selection.mjs';

// Phaser uses assembled PNG/JSON atlases. The skill frame directories are
// individual authoring cels, kept in the normal development and review build.
const runtimeExtensions = new Set(['.png', '.json', '.tmj', '.svg']);
const isRuntime = (path) =>
  runtimeExtensions.has(extname(path)) &&
  !(path.startsWith('skills/') && /\/(?:frames|[^/]+_frames)\//.test(path));

function* files(root, prefix = '') {
  for (const entry of readdirSync(join(root, prefix), {
    withFileTypes: true,
  })) {
    const path = prefix + entry.name;
    if (entry.isDirectory()) yield* files(root, path + '/');
    else if (entry.isFile()) yield path;
    else throw Error(`Unsupported public asset: ${path}`);
  }
}

const defaultSource = resolve(
  import.meta.dirname,
  '../apps/game-client/public/assets',
);
export function stageRuntimeAssets(
  stage,
  {
    source = defaultSource,
    cache = process.env['VOLAM_RASTER_CACHE'] ??
      resolve(import.meta.dirname, '../artifacts/runtime-rasters-v1'),
  } = {},
) {
  const repo = resolve(import.meta.dirname, '..');
  const selection =
    source === defaultSource
      ? validateSelection(
          JSON.parse(
            readFileSync(
              resolve(repo, 'assets/deploy-runtime-assets.json'),
              'utf8',
            ),
          ),
          deploymentInputs(repo),
        )
      : undefined;
  const excluded = [];
  const output = resolve(stage, 'runtime-public/assets');
  mkdirSync(resolve(stage), { recursive: true });
  mkdirSync(dirname(output));
  mkdirSync(output);
  const aliases = {};
  const runtime = [];
  const rasters = new Map();
  const pngs = new Map();
  let sourceBytes = 0,
    runtimeBytes = 0;
  for (const path of [...files(source)].sort()) {
    const from = join(source, path);
    const size = statSync(from).size;
    sourceBytes += size;
    if (!isRuntime(path)) continue;
    if (selection && !keepDeploymentAsset(path, selection)) {
      excluded.push({ path: '/assets/' + path, bytes: size });
      continue;
    }
    if (extname(path) === '.png') {
      const bytes = readFileSync(from);
      const hash = createHash('sha256').update(bytes).digest('hex');
      rasters.set(hash, rasters.get(hash) ?? path);
      pngs.set(path, hash);
      continue;
    }
    const deliveredPath =
      extname(path) === '.svg'
        ? 'immutable/' +
          createHash('sha256').update(readFileSync(from)).digest('hex') +
          '.svg'
        : path;
    if (extname(path) === '.svg')
      aliases['/assets/' + path] = '/assets/' + deliveredPath;
    if (runtime.includes('/assets/' + deliveredPath)) continue;
    const target = join(output, deliveredPath);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(from, target);
    runtime.push('/assets/' + deliveredPath);
    runtimeBytes += size;
  }
  const compiled = spawnSync(
    process.env['PYTHON'] ?? 'python',
    [
      '-X',
      'utf8',
      resolve(import.meta.dirname, 'runtime-rasters.py'),
      '--source',
      source,
      '--output',
      resolve(output, 'immutable'),
      '--cache',
      cache,
    ],
    {
      input: JSON.stringify(
        [...rasters].map(([hash, path]) => ({ hash, path })),
      ),
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  if (compiled.error || compiled.status !== 0)
    throw Error(
      `Runtime lossless raster preparation failed: ${compiled.error ?? compiled.stderr}`,
    );
  const delivery = JSON.parse(compiled.stdout);
  const deliveredFiles = [
    ...new Map(
      Object.values(delivery).map((entry) => [entry.url, entry]),
    ).values(),
  ];
  for (const [path, hash] of pngs)
    aliases['/assets/' + path] = delivery[hash].url;
  for (const entry of deliveredFiles) {
    runtime.push(entry.url);
    runtimeBytes += entry.bytes;
  }
  const summary = {
    sourceBytes,
    runtimeBytes,
    unusedAtlasFiles: excluded.length,
    unusedAtlasBytes: excluded.reduce((sum, file) => sum + file.bytes, 0),
    files: runtime.length,
    aliases: Object.keys(aliases).length,
    uniquePngBytes: [...rasters].reduce(
      (sum, [hash]) => sum + delivery[hash].sourceBytes,
      0,
    ),
    deliveredRasterBytes: deliveredFiles.reduce(
      (sum, entry) => sum + entry.bytes,
      0,
    ),
    webpFiles: deliveredFiles.filter((entry) => entry.format === 'webp').length,
  };
  writeFileSync(
    resolve(stage, 'runtime-assets.json'),
    JSON.stringify({ runtime, aliases, summary, excluded }),
  );
  return { runtime, aliases, summary };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  if (!process.argv[2])
    throw Error(
      'Usage: node scripts/stage-runtime-assets.mjs <new staging directory>',
    );
  console.info(
    'Preparing lossless, pixel-verified runtime rasters (approved sources unchanged)...',
  );
  console.info(JSON.stringify(stageRuntimeAssets(process.argv[2]).summary));
}
