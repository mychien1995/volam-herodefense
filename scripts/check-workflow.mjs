import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync } from 'node:fs';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const [mode, ...args] = process.argv.slice(2);
const developmentClient = args.includes('--dev-client');
if (!['quick', 'browser', 'final'].includes(mode)) {
  console.error(
    'Usage: check-workflow.mjs quick <test files> | browser [Playwright args] | final [Playwright args]',
  );
  process.exit(1);
}
if (developmentClient) {
  if (
    mode !== 'browser' ||
    !args.some((arg) => arg.endsWith('playwright.arena-creeps.config.ts'))
  ) {
    console.error(
      '--dev-client is restricted to the arena frame fixture in browser mode; final checks always build production.',
    );
    process.exit(1);
  }
  args.splice(args.indexOf('--dev-client'), 1);
}
if (
  mode === 'quick' &&
  !args.some(
    (arg) => arg.endsWith('.test.ts') && existsSync(resolve(root, arg)),
  )
) {
  console.error(
    'Quick checks require an explicit .test.ts file; use pnpm test for the full suite.',
  );
  process.exit(1);
}
if (
  mode === 'final' &&
  args.some((arg) => arg.endsWith('playwright.arena-creeps.config.ts')) &&
  ((process.env.ARENA_CREEP_QA_MODE ?? 'full') !== 'full' ||
    (process.env.ARENA_CREEP_QA_PLAYERS ?? '6') !== '6')
) {
  console.error(
    'Final arena art validation requires the full six-player profile; use check:art:frames for iteration.',
  );
  process.exit(1);
}

// Use installed package binaries directly: no nested pnpm build/preparation hooks.
function binary(name, command) {
  const manifest = require.resolve(`${name}/package.json`);
  const pkg = JSON.parse(readFileSync(manifest, 'utf8'));
  return resolve(
    dirname(manifest),
    typeof pkg.bin === 'string' ? pkg.bin : pkg.bin[command],
  );
}
const elapsed = performance.now();
function run(label, command, commandArgs, cwd = root) {
  const start = performance.now();
  console.info(`\n[check] ${label}`);
  const result = spawnSync(command, commandArgs, {
    cwd,
    stdio: 'inherit',
    shell: false,
  });
  console.info(
    `[check] ${label}: ${((performance.now() - start) / 1000).toFixed(2)}s`,
  );
  if (result.error) console.error(result.error);
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}
const node = (label, script, scriptArgs = [], cwd) =>
  run(label, process.execPath, [script, ...scriptArgs], cwd);
node('prepare assets (once)', 'scripts/prepare-assets.mjs');
node(
  'compile TypeScript',
  binary('typescript', 'tsc'),
  mode === 'quick'
    ? [
        '-b',
        'packages/game-core',
        'packages/game-data',
        'packages/game-protocol',
      ]
    : ['-b'],
);

if (mode !== 'browser') {
  if (mode === 'final') {
    node('typecheck tests and tools', binary('typescript', 'tsc'), [
      '-p',
      'tsconfig.tools.json',
      '--noEmit',
    ]);
    node('workflow regression checks', '--test', [
      'scripts/tests/asset-files.test.mjs',
      'scripts/tests/arena-creep-qa-options.test.mjs',
    ]);
  }
  node(
    mode === 'quick' ? 'focused tests' : 'all unit/integration tests',
    binary('vitest', 'vitest'),
    ['run', ...(mode === 'quick' ? args : [])],
  );
}
if (mode !== 'quick') {
  // Default browser setup serves dist; dedicated art setups serve the client directly.
  if (!developmentClient)
    node(
      'production client build',
      binary('vite', 'vite'),
      ['build'],
      resolve(root, 'apps/game-client'),
    );
  else
    console.info(
      '[check] development-client fixture: production build deferred to final verification',
    );
  if (mode === 'final') {
    const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
    // One canonical validator list shared with pnpm verify:assets. Refuse unknown commands.
    for (const command of pkg.scripts['verify:assets'].split(' && ')) {
      const match = /^python (scripts\/[\w-]+\.py)$/.exec(command);
      if (!match)
        throw new Error(`Unsupported asset validator command: ${command}`);
      run(match[1], 'python', ['-X', 'utf8', match[1]]);
    }
  }
  node('browser verification', 'tools/run-playwright.mjs', ['test', ...args]);
}
console.info(
  `\n[check] ${mode} passed in ${((performance.now() - elapsed) / 1000).toFixed(2)}s`,
);
