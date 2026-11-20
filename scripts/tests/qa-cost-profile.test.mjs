import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs, { readFileSync } from 'node:fs';
import crypto from 'node:crypto';
import { resolve, dirname } from 'node:path';
import {
  profileSync,
  beginSyncCostProfile,
} from '../../tools/qa-cost-profile.mjs';
import { fileSnapshot } from '../../tools/core-test-cache.mjs';
import { iterationSnapshot } from '../../tools/qa-iteration-state.mjs';
import QaCostReporter from '../../tools/qa-cost-reporter.mjs';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { profileQaPage } from '../../tools/qa-page-cost.mjs';

test('profiling keeps sync IO/hash bytes, errors, return values and ESM bindings; restores on failure', () => {
  const parent = resolve('.cache');
  fs.mkdirSync(parent, { recursive: true });
  const root = fs.mkdtempSync(resolve(parent, 'qa-cost-test-'));
  const originalRead = fs.readFileSync,
    originalHash = crypto.createHash;
  try {
    fs.writeFileSync(resolve(root, 'input'), 'võ lâm');
    const expected = fileSnapshot(root, ['input']);
    const result = profileSync(() => {
      assert.equal(readFileSync(resolve(root, 'input'), 'utf8'), 'võ lâm');
      assert.throws(
        () => fs.readFileSync(resolve(root, 'missing')),
        (e) => e.code === 'ENOENT',
      );
      return fileSnapshot(root, ['input']);
    }, root);
    assert.deepEqual(result.value, expected);
    assert.ok(result.cost.hashes.created > 0);
    assert.ok(result.cost.hashes.bytes > 0);
    assert.ok(
      result.cost.io.some(
        (r) => r.method === 'readFileSync' && r.failures === 1,
      ),
    );
    assert.equal(fs.readFileSync, originalRead);
    assert.equal(readFileSync, originalRead);
    assert.equal(crypto.createHash, originalHash);
    const error = Error('original failure');
    assert.throws(
      () =>
        profileSync(() => {
          throw error;
        }, root),
      (e) => e === error,
    );
    assert.equal(fs.readFileSync, originalRead);
    const observer = beginSyncCostProfile(root);
    assert.throws(() => beginSyncCostProfile(root), /Nested/);
    const first = observer.stop();
    assert.equal(observer.stop(), first);
    let cost;
    assert.equal(
      iterationSnapshot(root, 'input', (data) => (cost = data)),
      iterationSnapshot(root, 'input'),
    );
    assert.equal(cost.kind, 'input');
    assert.ok(cost.wallMilliseconds >= 0);
  } finally {
    assert.equal(dirname(root), parent);
    assert.ok(root.startsWith(resolve(parent, 'qa-cost-test-')));
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('reporter observes original statuses and never changes test selection or outcome', () => {
  const parent = resolve('.cache'),
    root = fs.mkdtempSync(resolve(parent, 'qa-reporter-test-'));
  const before = process.env.VOLAM_QA_BROWSER_COST_OUTPUT;
  try {
    const output = resolve(root, 'cost.json');
    process.env.VOLAM_QA_BROWSER_COST_OUTPUT = output;
    const reporter = new QaCostReporter();
    assert.equal(reporter.preprocess, undefined);
    reporter.onBegin();
    reporter.onTestBegin({ title: 'fails' }, { startTime: new Date() });
    reporter.onStepEnd(null, null, {
      category: 'fixture',
      title: 'browser',
      duration: 23,
    });
    reporter.onTestEnd(null, { status: 'failed', duration: 50 });
    assert.equal(reporter.onEnd({ status: 'failed' }), undefined);
    const report = JSON.parse(fs.readFileSync(output));
    assert.equal(report.status, 'failed');
    assert.equal(report.tests[0].status, 'failed');
    assert.equal(report.steps[0].milliseconds, 23);
  } finally {
    if (before === undefined) delete process.env.VOLAM_QA_BROWSER_COST_OUTPUT;
    else process.env.VOLAM_QA_BROWSER_COST_OUTPUT = before;
    assert.equal(dirname(root), parent);
    assert.ok(root.startsWith(resolve(parent, 'qa-reporter-test-')));
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('preload works with Windows file URLs and retains original failure exit status', () => {
  const parent = resolve('.cache'),
    root = fs.mkdtempSync(resolve(parent, 'qa-preload-test-'));
  try {
    const script = resolve(root, 'probe.mjs'),
      report = resolve(root, 'cost.json');
    fs.writeFileSync(
      script,
      `import { readFileSync } from 'node:fs'; import { createHash } from 'node:crypto'; createHash('sha256').update(readFileSync(${JSON.stringify(script)})).digest('hex'); process.exitCode = 7;`,
    );
    const result = spawnSync(
      process.execPath,
      [
        '--import',
        pathToFileURL(resolve('tools/qa-cost-preload.mjs')).href,
        script,
      ],
      {
        env: { ...process.env, VOLAM_QA_COST_OUTPUT: report },
        encoding: 'utf8',
        windowsHide: true,
      },
    );
    assert.equal(result.status, 7, result.stderr);
    const data = JSON.parse(fs.readFileSync(report));
    assert.equal(data.exitCode, 7);
    assert.ok(data.hashes.bytes > 0);
    assert.ok(data.io.some((r) => r.method === 'readFileSync'));
  } finally {
    assert.equal(dirname(root), parent);
    assert.ok(root.startsWith(resolve(parent, 'qa-preload-test-')));
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('page cost keeps bounded query-free resource evidence after page close', async () => {
  let listener,
    removed = false;
  const page = {
    addInitScript: async () => {},
    on: (_event, callback) => (listener = callback),
    off: (_event, callback) => {
      assert.equal(callback, listener);
      removed = true;
    },
    evaluate: async () => {
      throw Error('page closed');
    },
  };
  const stop = await profileQaPage(page);
  for (let i = 0; i < 20; i++)
    listener({
      timing: () => ({ responseEnd: i }),
      url: () => `http://localhost/assets/test-${i}.png?private=value`,
      resourceType: () => 'image',
    });
  const result = await stop();
  assert.equal(result.groups.image.count, 20);
  assert.equal(result.slowest.length, 10);
  assert.equal(result.slowest[0].milliseconds, 19);
  assert.equal(result.navigation.error, 'page closed');
  assert.equal(removed, true);
  assert.equal(JSON.stringify(result).includes('private'), false);
});
