import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { randomUUID } from 'node:crypto';
import { qaPreflight, formatPreflight } from '../tools/qa-preflight.mjs';
import { qaEvidenceDirectory } from '../tools/qa-session.mjs';
import { coreTestExecution } from '../tools/core-test-execution.mjs';
import {
  acquireCoreLock,
  fileSnapshot,
  prepareCoreArtifacts,
  pureCoreTests,
} from '../tools/core-test-cache.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const args = process.argv.slice(2),
  started = performance.now(),
  runId = randomUUID();
const directory = resolve(root, qaEvidenceDirectory('.cache/check-core'));
mkdirSync(resolve(directory, runId), { recursive: true });
const reportPath = resolve(directory, 'core-timings.json');
const report = {
  runId,
  mode: 'core',
  args,
  startedAt: new Date().toISOString(),
  status: 'RUNNING',
  stages: [],
};
function save() {
  const text =
    JSON.stringify(
      {
        ...report,
        totalSeconds: Number(((performance.now() - started) / 1000).toFixed(3)),
      },
      null,
      2,
    ) + '\n';
  writeFileSync(reportPath, text);
  writeFileSync(resolve(directory, runId, 'report.json'), text);
}
function run(label, script, parameters = []) {
  const start = performance.now();
  const path = resolve(
    directory,
    runId,
    `${report.stages.length}-${label.replace(/[^a-z0-9]+/gi, '-')}.log`,
  );
  const fd = openSync(path, 'w');
  console.info(`[core] ${label}`);
  let result;
  try {
    result = spawnSync(process.execPath, [script, ...parameters], {
      cwd: root,
      env: process.env,
      stdio: ['ignore', fd, fd],
      windowsHide: true,
    });
  } finally {
    closeSync(fd);
  }
  const seconds = Number(((performance.now() - start) / 1000).toFixed(3));
  report.stages.push({
    label,
    seconds,
    status: result.error || result.status !== 0 ? 'FAIL' : 'PASS',
    exitCode: result.status,
    logPath: path,
    outputBytes: statSync(path).size,
  });
  save();
  console.info(`[core] ${label}: ${seconds}s`);
  if (result.error || result.status !== 0) {
    console.error(readFileSync(path, 'utf8').slice(-2500));
    throw Error(
      result.error?.message ??
        `${label} failed (${result.status}); full log: ${path}`,
    );
  }
}

save();
let lock;
try {
  report.execution = coreTestExecution();
  console.info(`[core] isolated file workers: ${report.execution.maxWorkers}`);
  const preflight = await qaPreflight({ mode: 'quick', args, root });
  report.stages.push({
    label: 'environment preflight',
    status: preflight.status,
    seconds: preflight.milliseconds / 1000,
    checks: preflight.checks,
  });
  save();
  console.info(formatPreflight(preflight));
  if (preflight.status !== 'PASS') throw Error('Preflight failed');
  const selectionStart = performance.now();
  const selection = pureCoreTests(root, args, { allowMissingGenerated: true });
  report.stages.push({
    label: 'pure-core import boundary',
    status: 'PASS',
    seconds: (performance.now() - selectionStart) / 1000,
    tests: selection.tests,
    modules: selection.files.length,
  });
  lock = acquireCoreLock(root);
  const artifacts = prepareCoreArtifacts({
    root,
    cache: lock.cache,
    run,
    record(label, details) {
      report.stages.push({ label, status: 'PASS', ...details });
      console.info(
        `[core] ${label}: ${details.hit ? 'HIT (input + output SHA-256 match)' : 'MISS (fresh artifacts)'}`,
      );
      save();
    },
  });
  // Preparation may legitimately refresh generated JSON. Validate the graph
  // again against the exact candidate that will be tested, after preparation.
  const candidate = pureCoreTests(root, args);
  process.env.VOLAM_CORE_TEST_FILES = JSON.stringify(candidate.tests);
  run(
    'fresh pure-core tests',
    resolve(dirname(require.resolve('vitest/package.json')), 'vitest.mjs'),
    ['run', '--config', 'vitest.core.config.ts'],
  );
  artifacts.assertFresh();
  if (fileSnapshot(root, candidate.files).digest !== candidate.input)
    throw Error('Test/module inputs changed during this run');
  report.status = 'PASS';
} catch (error) {
  report.status = 'FAIL';
  report.error = error.message;
  console.error(`[core] ${error.message}`);
  process.exitCode = 1;
} finally {
  try {
    lock?.release();
  } catch (error) {
    report.status = 'FAIL';
    report.error = error.message;
    process.exitCode = 1;
  }
  save();
  console.info(
    `[core] ${report.status} in ${((performance.now() - started) / 1000).toFixed(3)}s; report: ${reportPath}`,
  );
}
