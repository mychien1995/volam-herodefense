import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, extname, isAbsolute, relative, resolve } from 'node:path';
import { parseSync } from 'vite';

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const slash = (name) => name.replaceAll('\\', '/');
const inside = (root, path) => {
  const name = relative(root, path);
  return name === '' || (!name.startsWith('..') && !isAbsolute(name));
};
export const generatedCoreData = [
  'arena-map',
  'creep-forest-map',
  'creep-desert-map',
  'creep-beach-map',
  'creep-hell-map',
  'chu-ba-thong-map',
  'hong-liet-map',
  'kim-map',
  'boss-co-mo-map',
  'arena-wave-names',
  'skill-art',
  'skill-icon-schools',
].map((name) => `packages/game-data/src/${name}.json`);

// Audited value dependencies of the twelve JSON outputs above. Art PNGs and
// approval results are deliberately outside this simulation-only cache.
// Update this inventory when changing a preparation recipe's data dependencies.
export const coreDataInputPaths = [
  'maps',
  'assets/exports/skills/cai-bang/production_manifest_v1.json',
  'assets/exports/skills/thien-son/production_manifest_v01.json',
  'assets/exports/skills/vo-dang/production_manifest_v01.json',
  'assets/exports/skills/thieu-lam/production_manifest_v01.json',
  'sprites/creeps/arena',
  'assets/sprites/creeps/arena',
  'assets/reviews/bosses/kim_luan_phap_vuong_v01/data.json',
  'apps/game-client/src/chu-art.generated.json',
  'packages/game-data/src',
];

/** Hash names + actual bytes, including additions/removals; never trust size/mtime. */
export function fileSnapshot(root, paths, accept = () => true) {
  const files = new Map();
  function visit(path, entry) {
    const name = slash(relative(root, path));
    if (!inside(root, path)) throw Error('Input escapes checkout: ' + name);
    if (!entry && !existsSync(path)) {
      files.set(name, null);
      return;
    }
    const stat = entry ?? lstatSync(path);
    if (stat.isSymbolicLink())
      throw Error('Symlink is not a cache input: ' + name);
    if (stat.isDirectory()) {
      for (const child of readdirSync(path, { withFileTypes: true }).sort(
        (a, b) => a.name.localeCompare(b.name),
      ))
        visit(resolve(path, child.name), child);
    } else if (stat.isFile() && accept(name))
      files.set(name, hash(readFileSync(path)));
  }
  for (const path of paths) visit(resolve(root, path));
  const entries = [...files].sort(([a], [b]) => a.localeCompare(b));
  return { digest: hash(JSON.stringify(entries)), entries };
}

/** An import-boundary check, not a sandbox for untrusted JavaScript. */
export function pureCoreTests(
  root,
  args,
  { allowMissingGenerated = false } = {},
) {
  if (!args.length)
    throw Error('check:core requires explicit tests/*.test.ts files');
  const tests = [...new Set(args.map(slash))];
  for (const name of tests)
    if (
      !/^tests\/[a-zA-Z0-9_/-]+\.test\.ts$/.test(name) ||
      name.startsWith('tests/e2e/') ||
      !existsSync(resolve(root, name))
    )
      throw Error('Expected an existing explicit pure-core test file: ' + name);
  const visited = new Set();
  const readHashes = new Map();
  function follow(name) {
    const path = resolve(root, name);
    if (
      allowMissingGenerated &&
      generatedCoreData.includes(name) &&
      !existsSync(path)
    ) {
      if (!inside(root, path) || !inside(root, realpathSync(dirname(path))))
        throw Error('Unsafe generated module path: ' + name);
      visited.add(name);
      readHashes.set(name, null);
      return;
    }
    if (
      !inside(root, path) ||
      !inside(root, realpathSync(path)) ||
      lstatSync(path).isSymbolicLink()
    )
      throw Error('Unsafe module path: ' + name);
    if (visited.has(name)) return;
    visited.add(name);
    const bytes = readFileSync(path);
    readHashes.set(name, hash(bytes));
    if (extname(name) === '.json') return;
    const raw = bytes.toString('utf8');
    if (/\/\/\/\s*<reference\b/.test(raw))
      throw Error('Triple-slash references are unsupported: ' + name);
    const ast = parseSync(path, raw, { lang: 'ts' });
    if (ast.errors.length)
      throw Error('Cannot parse pure-core module: ' + name);
    function dependency(specifier) {
      if (specifier === 'vitest' || specifier === 'zod') return;
      if (
        specifier === '@volam/game-core' ||
        specifier === '@volam/game-data'
      ) {
        follow(`packages/${specifier.slice(7)}/src/index.ts`);
        return;
      }
      if (!specifier.startsWith('.'))
        throw Error(
          `Not a pure-core dependency: ${name} -> ${specifier}; use check:quick`,
        );
      const target = slash(
        relative(
          root,
          resolve(dirname(path), specifier.replace(/\.js$/, '.ts')),
        ),
      );
      if (
        !/^(?:tests\/(?!e2e\/)|packages\/game-(?:core|data)\/src\/)/.test(
          target,
        )
      )
        throw Error(
          `Not a pure-core dependency: ${name} -> ${specifier}; use check:quick`,
        );
      follow(target);
    }
    function walk(node) {
      if (!node || typeof node !== 'object') return;
      if (
        [
          'ImportDeclaration',
          'ExportNamedDeclaration',
          'ExportAllDeclaration',
        ].includes(node.type) &&
        node.source
      )
        dependency(node.source.value);
      if (
        node.type === 'TSImportEqualsDeclaration' ||
        node.type === 'MetaProperty'
      )
        throw Error('Unsupported module mechanism: ' + name);
      if (node.type === 'ImportExpression') {
        if (
          node.source.type !== 'Literal' ||
          typeof node.source.value !== 'string'
        )
          throw Error('Computed import is unsupported: ' + name);
        dependency(node.source.value);
      }
      if (
        ['CallExpression', 'NewExpression'].includes(node.type) &&
        node.callee?.type === 'Identifier' &&
        [
          'require',
          'eval',
          'Function',
          'fetch',
          'WebSocket',
          'Worker',
        ].includes(node.callee.name)
      )
        throw Error('Unsupported runtime dependency in ' + name);
      if (
        node.type === 'Identifier' &&
        [
          'process',
          'window',
          'document',
          'globalThis',
          'global',
          '__dirname',
          '__filename',
        ].includes(node.name)
      )
        throw Error(
          'Environment/IO-dependent module in pure-core graph: ' + name,
        );
      for (const value of Object.values(node)) {
        if (Array.isArray(value)) value.forEach(walk);
        else if (value && typeof value === 'object') walk(value);
      }
    }
    walk(ast.program);
  }
  for (const name of tests) follow(name);
  const files = [...visited].sort();
  const input = hash(
    JSON.stringify([...readHashes].sort(([a], [b]) => a.localeCompare(b))),
  );
  if (fileSnapshot(root, files).digest !== input)
    throw Error('Module graph changed while checking pure-core boundary');
  return { tests, files, input };
}

export function acquireCoreLock(root) {
  const cache = resolve(root, '.cache/pure-core');
  mkdirSync(cache, { recursive: true });
  if (!inside(realpathSync(root), realpathSync(cache)))
    throw Error('Cache escapes checkout');
  const lock = resolve(cache, 'lock'),
    token = randomUUID();
  try {
    mkdirSync(lock);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    throw Error(
      'Pure-core cache is locked by another run; do not reuse or remove an active lock: ' +
        lock,
    );
  }
  writeFileSync(
    resolve(lock, 'owner.json'),
    JSON.stringify({ pid: process.pid, token }),
  );
  return {
    cache,
    release() {
      if (JSON.parse(readFileSync(resolve(lock, 'owner.json'))).token !== token)
        throw Error('Cache lock ownership changed');
      unlinkSync(resolve(lock, 'owner.json'));
      rmdirSync(lock);
    },
  };
}

function readStamp(path) {
  try {
    const value = JSON.parse(readFileSync(path, 'utf8'));
    return value.schema === 1 ? value : undefined;
  } catch {
    return undefined;
  }
}
function writeStamp(path, value) {
  const temp = path + '.' + randomUUID() + '.tmp';
  writeFileSync(temp, JSON.stringify({ schema: 1, ...value }, null, 2) + '\n');
  renameSync(temp, path);
}

/** Reuse data/compiled artifacts only. This never caches or replays a test result. */
export function prepareCoreArtifacts({
  root,
  cache,
  run,
  record = () => {},
  toolchain,
}) {
  const require = createRequire(resolve(root, 'package.json'));
  const dataRequire = createRequire(
    resolve(root, 'packages/game-data/package.json'),
  );
  const identityFiles = [
    'package.json',
    'pnpm-lock.yaml',
    'pnpm-workspace.yaml',
    'tsconfig.base.json',
    'node_modules/.modules.yaml',
    'node_modules/.pnpm/lock.yaml',
    'packages/game-core/package.json',
    'packages/game-core/tsconfig.json',
    'packages/game-data/package.json',
    'packages/game-data/tsconfig.json',
    'tools/core-test-cache.mjs',
    'tools/core-test-execution.mjs',
    'scripts/check-core.mjs',
    'vitest.core.config.ts',
    'vitest.config.ts',
  ];
  if (!toolchain) {
    const expected = JSON.parse(
      readFileSync(resolve(root, 'package.json')),
    ).devDependencies;
    const tools = ['typescript', 'vitest', 'vite'].map((name) => {
      const version = JSON.parse(
        readFileSync(require.resolve(name + '/package.json')),
      ).version;
      if (version !== expected[name])
        throw Error('Installed tool version mismatch: ' + name);
      return [name, version];
    });
    const zod = JSON.parse(
      readFileSync(dataRequire.resolve('zod/package.json')),
    ).version;
    if (
      zod !==
      JSON.parse(readFileSync(resolve(root, 'packages/game-data/package.json')))
        .dependencies.zod
    )
      throw Error('Installed zod version mismatch');
    tools.push(['zod', zod]);
    toolchain = {
      tools,
      tsc: resolve(
        dirname(require.resolve('typescript/package.json')),
        'bin/tsc',
      ),
    };
  }
  const identity = {
    root: realpathSync(root),
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    tools: toolchain.tools,
    nodeOptions: process.env.NODE_OPTIONS ?? '',
  };
  const fingerprint = (files) => hash(JSON.stringify([identity, files]));
  const metadata = (name) =>
    /\.(?:json|tmj|tsj|mjs|js|py|ts|yaml|yml)$/.test(name) &&
    !generatedCoreData.includes(name);
  const dataInputs = () =>
    fingerprint(
      fileSnapshot(
        root,
        [...identityFiles, 'scripts', ...coreDataInputPaths],
        (name) =>
          metadata(name) &&
          (!name.startsWith('packages/game-data/src/') ||
            name.endsWith('.json')),
      ).digest,
    );
  const dataOutputs = () => fileSnapshot(root, generatedCoreData);
  const dataStampPath = resolve(cache, 'data.json');
  let dataInput = dataInputs(),
    dataOutput = dataOutputs();
  const dataStamp = readStamp(dataStampPath);
  let dataHit =
    dataStamp?.input === dataInput &&
    dataStamp?.output === dataOutput.digest &&
    dataOutput.entries.every(([, value]) => value !== null);
  if (!dataHit) {
    // A preparation recipe may update its own metadata. Require a stable pass,
    // rather than stamping inputs it may not actually have consumed.
    for (let attempt = 0; ; attempt++) {
      run(
        'prepare data (full guarded preparation)',
        resolve(root, 'scripts/prepare-assets.mjs'),
      );
      const after = dataInputs();
      if (after === dataInput) break;
      if (attempt === 1)
        throw Error(
          'Preparation inputs changed during the run; no cache published',
        );
      dataInput = after;
    }
    dataOutput = dataOutputs();
    if (dataOutput.entries.some(([, value]) => value === null))
      throw Error('Preparation did not produce all required simulation JSON');
    writeStamp(dataStampPath, { input: dataInput, output: dataOutput.digest });
  }
  record('prepared simulation data', {
    hit: !!dataHit,
    input: dataInput,
    output: dataOutput.digest,
  });

  const compileInputs = () =>
    fingerprint(
      fileSnapshot(root, [
        ...identityFiles,
        'packages/game-core/src',
        'packages/game-data/src',
      ]).digest,
    );
  const build = resolve(cache, 'build');
  const compileOutputs = () =>
    fileSnapshot(root, [slash(relative(root, build))]);
  const compileStampPath = resolve(cache, 'compile.json');
  const compileInput = compileInputs();
  let compileOutput = compileOutputs();
  const compileStamp = readStamp(compileStampPath);
  const compileHit =
    compileStamp?.input === compileInput &&
    compileStamp?.output === compileOutput.digest &&
    existsSync(resolve(build, 'core/index.js')) &&
    existsSync(resolve(build, 'data/index.js'));
  if (!compileHit) {
    // Delete only this runner's fixed build directory, after verifying its real
    // absolute target stays inside the checkout-owned cache and has no symlinks.
    if (!inside(realpathSync(cache), resolve(build)))
      throw Error('Unsafe build cache path');
    compileOutputs();
    rmSync(build, { recursive: true, force: true });
    mkdirSync(build, { recursive: true });
    for (const name of ['core', 'data']) {
      const config = {
        extends: resolve(root, `packages/game-${name}/tsconfig.json`),
        compilerOptions: {
          rootDir: resolve(root, `packages/game-${name}/src`),
          outDir: resolve(build, name),
          tsBuildInfoFile: resolve(build, name + '.tsbuildinfo'),
          ...(name === 'data'
            ? {
                paths: {
                  '@volam/game-core': [resolve(build, 'core/index.d.ts')],
                },
              }
            : {}),
        },
        include: [
          slash(relative(build, resolve(root, `packages/game-${name}/src`))) +
            '/**/*.ts',
          ...(name === 'data'
            ? [
                slash(
                  relative(build, resolve(root, 'packages/game-data/src')),
                ) + '/**/*.json',
              ]
            : []),
        ],
        references:
          name === 'data'
            ? [{ path: resolve(build, 'core.tsconfig.json') }]
            : [],
      };
      writeFileSync(
        resolve(build, name + '.tsconfig.json'),
        JSON.stringify(config, null, 2),
      );
    }
    run('compile pure-core artifacts (force)', toolchain.tsc, [
      '-b',
      resolve(build, 'core.tsconfig.json'),
      resolve(build, 'data.tsconfig.json'),
      '--force',
    ]);
    if (
      compileInputs() !== compileInput ||
      dataInputs() !== dataInput ||
      dataOutputs().digest !== dataOutput.digest
    )
      throw Error(
        'Inputs changed during compilation; no compiled cache published',
      );
    if (
      !existsSync(resolve(build, 'core/index.js')) ||
      !existsSync(resolve(build, 'data/index.js'))
    )
      throw Error('Compiler did not produce required core/data entries');
    compileOutput = compileOutputs();
    writeStamp(compileStampPath, {
      input: compileInput,
      output: compileOutput.digest,
    });
  }
  record('compiled pure-core artifacts', {
    hit: !!compileHit,
    input: compileInput,
    output: compileOutput.digest,
  });
  return {
    assertFresh() {
      if (
        dataInputs() !== dataInput ||
        dataOutputs().digest !== dataOutput.digest ||
        compileInputs() !== compileInput ||
        compileOutputs().digest !== compileOutput.digest
      )
        throw Error(
          'Inputs/outputs changed during tests; this run cannot report PASS',
        );
    },
  };
}
