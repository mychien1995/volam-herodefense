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

const escapeXml = (value) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;',
      })[c],
  );

const stage = process.argv[2];
if (!stage)
  throw Error(
    'Usage: node scripts/stage-runtime-assets.mjs <new staging directory>',
  );
const source = resolve(
  import.meta.dirname,
  '../apps/game-client/public/assets',
);
const output = resolve(stage, 'runtime-public/assets');
const repo = resolve(import.meta.dirname, '..');
const selection = validateSelection(
  JSON.parse(
    readFileSync(resolve(repo, 'assets/deploy-runtime-assets.json'), 'utf8'),
  ),
  deploymentInputs(repo),
);
mkdirSync(resolve(stage), { recursive: true });
mkdirSync(dirname(output));
mkdirSync(output);
const aliases = {};
const runtime = [];
const rasters = new Map();
let sourceBytes = 0,
  runtimeBytes = 0;
const excluded = [];
for (const path of [...files(source)].sort()) {
  const from = join(source, path);
  const size = statSync(from).size;
  sourceBytes += size;
  if (!isRuntime(path)) continue;
  if (!keepDeploymentAsset(path, selection)) {
    excluded.push({ path: '/assets/' + path, bytes: size });
    continue;
  }
  if (extname(path) === '.png') {
    const bytes = readFileSync(from);
    const hash = createHash('sha256').update(bytes).digest('hex');
    const first = rasters.get(hash);
    if (first && bytes.equals(readFileSync(join(source, first)))) {
      aliases['/assets/' + path] = '/assets/' + first;
      continue;
    }
    rasters.set(hash, path);
  }
  const target = join(output, path);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(from, target);
  runtime.push('/assets/' + path);
  runtimeBytes += size;
}
const summary = {
  sourceBytes,
  runtimeBytes,
  files: runtime.length,
  aliases: Object.keys(aliases).length,
  unusedAtlasFiles: excluded.length,
  unusedAtlasBytes: excluded.reduce((sum, file) => sum + file.bytes, 0),
};
writeFileSync(
  resolve(stage, 'runtime-assets.json'),
  JSON.stringify({ runtime, aliases, summary, excluded }),
);
writeFileSync(
  resolve(stage, 'runtime-assets-iis.xml'),
  [
    '      <rewriteMaps>',
    '        <rewriteMap name="VolamRasterAliases" defaultValue="">',
    ...Object.entries(aliases).map(
      ([from, to]) =>
        `          <add key="${escapeXml(from.slice(1))}" value="${escapeXml(to.slice(1))}" />`,
    ),
    '        </rewriteMap>',
    '      </rewriteMaps>',
  ].join('\n'),
);
console.info(JSON.stringify(summary));
