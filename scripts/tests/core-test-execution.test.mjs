import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { coreTestExecution } from '../../tools/core-test-execution.mjs';
import { pureCoreTests } from '../../tools/core-test-cache.mjs';

test('core workers are bounded; serial escape hatch retains isolation and ignores Vitest environment overrides', () => {
  for (const value of ['0', '5', '-1', '1.5', '50%', '', '2x'])
    assert.throws(
      () => coreTestExecution({ VOLAM_CORE_WORKERS: value }),
      /1 to 4/,
    );
  assert.deepEqual(coreTestExecution({ VITEST_MAX_WORKERS: '100' }), {
    pool: 'forks',
    isolate: true,
    fileParallelism: true,
    maxWorkers: 2,
  });
  assert.equal(
    coreTestExecution({ VOLAM_CORE_WORKERS: '1' }).fileParallelism,
    false,
  );
});

test('real workers overlap but each file gets fresh module state; failures propagate', () => {
  const cache = resolve('.cache');
  mkdirSync(cache, { recursive: true });
  const root = mkdtempSync(resolve(cache, 'core-worker-probe-'));
  const put = (name, text) => writeFileSync(resolve(root, name), text);
  try {
    mkdirSync(resolve(root, 'tests'));
    put(
      'tests/counter.ts',
      'let count = 0; export const next = () => ++count;',
    );
    const files = Array.from(
      { length: 4 },
      (_, i) => `tests/probe-${i}.test.ts`,
    );
    const source = (i, expected = 1) =>
      `import {test,expect} from 'vitest';import {next} from './counter.js';test('probe ${i}',async()=>{const start=Date.now();expect(next()).toBe(${expected});await new Promise(done=>setTimeout(done,750));console.log('CORE_WORKER_PROBE '+JSON.stringify({start,end:Date.now()}));});`;
    files.forEach((name, i) => put(name, source(i)));
    assert.equal(pureCoreTests(root, files).tests.length, 4);
    put(
      'vitest.config.mjs',
      `import {coreTestExecution} from ${JSON.stringify(pathToFileURL(resolve('tools/core-test-execution.mjs')).href)};export default {test:{disableConsoleIntercept:true,include:${JSON.stringify(files.map((f) => relative(process.cwd(), resolve(root, f)).replaceAll('\\', '/')))},...coreTestExecution()}};`,
    );
    const require = createRequire(import.meta.url);
    const cli = resolve(
      dirname(require.resolve('vitest/package.json')),
      'vitest.mjs',
    );
    for (const workers of ['1', '2']) {
      const result = spawnSync(
        process.execPath,
        [cli, 'run', '--config', resolve(root, 'vitest.config.mjs')],
        {
          env: { ...process.env, VOLAM_CORE_WORKERS: workers },
          encoding: 'utf8',
          windowsHide: true,
          timeout: 60000,
        },
      );
      assert.equal(result.status, 0, result.stdout + result.stderr);
      const intervals = [
        ...result.stdout.matchAll(/CORE_WORKER_PROBE (\{[^\n]+?\})/g),
      ].map((m) => JSON.parse(m[1]));
      assert.equal(intervals.length, 4, result.stdout);
      const overlap = intervals.some((a, i) =>
        intervals.some((b, j) => j > i && a.start < b.end && b.start < a.end),
      );
      assert.equal(overlap, workers === '2');
    }
    put(files[3], source(3, 2));
    const failed = spawnSync(
      process.execPath,
      [cli, 'run', '--config', resolve(root, 'vitest.config.mjs')],
      {
        env: { ...process.env, VOLAM_CORE_WORKERS: '2' },
        encoding: 'utf8',
        windowsHide: true,
        timeout: 60000,
      },
    );
    assert.equal(failed.status, 1, failed.stdout + failed.stderr);
  } finally {
    assert.equal(dirname(root), cache);
    assert.ok(root.startsWith(resolve(cache, 'core-worker-probe-')));
    rmSync(root, { recursive: true, force: true });
  }
});
