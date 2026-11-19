import { qaPreflight, formatPreflight } from '../tools/qa-preflight.mjs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  readFileSync,
  existsSync,
  readdirSync,
  mkdirSync,
  writeFileSync,
  openSync,
  closeSync,
  statSync,
} from 'node:fs';
import { randomUUID } from 'node:crypto';
import {
  qaWorkflowSession,
  qaEvidenceDirectory,
} from '../tools/qa-session.mjs';

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
process.env.VOLAM_QA_RUN_ID = randomUUID();
if (process.env.VOLAM_QA_SERVER_PORT) {
  process.env.VITE_SERVER_URL ??= `http://127.0.0.1:${process.env.VOLAM_QA_SERVER_PORT}`;
}
const elapsed = performance.now();
const reportDirectory = resolve(
  root,
  qaEvidenceDirectory('.cache/check-workflow'),
);
mkdirSync(reportDirectory, { recursive: true });
const reportPath = resolve(reportDirectory, `${mode}-timings.json`);
const report = {
  runId: process.env.VOLAM_QA_RUN_ID,
  mode,
  args,
  startedAt: new Date().toISOString(),
  status: 'RUNNING',
  stages: [],
};
const saveReport = () =>
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        ...report,
        totalSeconds: Number(((performance.now() - elapsed) / 1000).toFixed(2)),
      },
      null,
      2,
    ) + '\n',
  );
saveReport();
const preflight = await qaPreflight({ mode, args, root });
report.stages.push({
  label: 'environment preflight',
  seconds: preflight.milliseconds / 1000,
  status: preflight.status,
  checks: preflight.checks,
});
if (preflight.status !== 'PASS') report.status = 'FAIL';
saveReport();
console.info(formatPreflight(preflight));
if (preflight.status !== 'PASS') {
  console.error(`[check] failure timings: ${reportPath}`);
  process.exit(1);
}
// Validate overrides before asset preparation; no cached stage success is consumed.
const session = qaWorkflowSession(mode, args);
if (mode === 'final' && session.profile === 'arena-creeps') {
  process.env.VITE_SERVER_URL ??= session.serverUrl;
  process.env.VOLAM_QA_ARENA_PRODUCTION = '1';
}
if (session.cacheDir) process.env.VOLAM_QA_VITE_CACHE ??= session.cacheDir;
function run(label, command, commandArgs, cwd = root) {
  const start = performance.now();
  console.info(`\n[check] ${label}`);
  const logs = resolve(reportDirectory, report.runId);
  mkdirSync(logs, { recursive: true });
  const logPath = resolve(
    logs,
    `${report.stages.length}-${label.replace(/[^a-z0-9]+/gi, '-')}.log`,
  );
  // Stream both channels to an owned file. Long runs remain tail-able without
  // filling a pipe buffer or sending successful compiler/test output to context.
  const descriptor = openSync(logPath, 'wx');
  let result;
  try {
    result = spawnSync(command, commandArgs, {
      cwd,
      stdio: ['ignore', descriptor, descriptor],
      windowsHide: true,
      shell: false,
    });
  } finally {
    closeSync(descriptor);
  }
  const outputBytes = statSync(logPath).size;
  const output =
    process.env.VOLAM_QA_VERBOSE === '1' || result.error || result.status !== 0
      ? readFileSync(logPath, 'utf8')
      : '';
  if (process.env.VOLAM_QA_VERBOSE === '1') console.info(output);
  else if (result.error || result.status !== 0) {
    console.error(output.slice(-2500));
    console.error(`[check] full log: ${logPath}`);
  }
  console.info(
    `[check] ${label}: ${((performance.now() - start) / 1000).toFixed(2)}s`,
  );
  report.stages.push({
    label,
    seconds: Number(((performance.now() - start) / 1000).toFixed(2)),
    status: result.error || result.status !== 0 ? 'FAIL' : 'PASS',
    exitCode: result.status,
    logPath,
    outputBytes,
    ...(result.error ? { error: String(result.error) } : {}),
  });
  if (result.error || result.status !== 0) report.status = 'FAIL';
  saveReport();
  if (result.error) console.error(result.error);
  if (result.error || result.status !== 0) {
    console.error(`[check] failure timings: ${reportPath}`);
    process.exit(result.status || 1);
  }
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
      ...readdirSync(resolve(root, 'scripts/tests'))
        .filter((name) => name.endsWith('.test.mjs'))
        .map((name) => `scripts/tests/${name}`),
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
report.status = 'PASS';
saveReport();
console.info(`[check] timings: ${reportPath}`);
console.info(
  `\n[check] ${mode} passed in ${((performance.now() - elapsed) / 1000).toFixed(2)}s`,
);
