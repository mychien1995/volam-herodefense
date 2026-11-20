import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  existsSync,
} from 'node:fs';
import { resolve, dirname } from 'node:path';
import { QaPreviewBuild } from '../../tools/qa-preview-build.mjs';

test('private preview outputs reused only for matching input/output bytes and correct endpoint', async () => {
  const parent = resolve('.cache');
  mkdirSync(parent, { recursive: true });
  const root = mkdtempSync(resolve(parent, 'qa-preview-test-'));
  let builds = 0;
  const owner = new QaPreviewBuild(
    root,
    'http://127.0.0.1:2886',
    async (dir) => {
      builds++;
      writeFileSync(
        resolve(dir, 'index.html'),
        '<main>real build placeholder only in isolated unit fixture</main>',
      );
      writeFileSync(
        resolve(dir, 'volam-build-endpoint.json'),
        JSON.stringify({ serverUrl: 'http://127.0.0.1:2886' }),
      );
    },
  );
  try {
    const first = await owner.ensure('input-a'),
      second = await owner.ensure('input-a');
    assert.equal(first.reused, false);
    assert.equal(second.reused, true);
    assert.equal(first.directory, second.directory);
    assert.equal(builds, 1);
    writeFileSync(resolve(first.directory, 'index.html'), 'corrupted');
    assert.equal((await owner.ensure('input-a')).reused, false);
    assert.equal(builds, 2);
    rmSync(resolve(first.directory, 'index.html'));
    await owner.ensure('input-a');
    assert.equal(builds, 3);
    await owner.ensure('input-b');
    assert.equal(builds, 4);
    assert.ok(readFileSync(resolve(first.directory, 'index.html')).length);
    await owner.close();
    assert.equal(existsSync(first.directory), false);
    await owner.close();
    const bad = new QaPreviewBuild(root, 'http://127.0.0.1:2886', async (dir) =>
      writeFileSync(resolve(dir, 'volam-build-endpoint.json'), '{}'),
    );
    try {
      await assert.rejects(bad.ensure('x'), /endpoint mismatch/);
    } finally {
      await bad.close();
    }
  } finally {
    await owner.close();
    assert.equal(dirname(root), parent);
    assert.ok(root.startsWith(resolve(parent, 'qa-preview-test-')));
    rmSync(root, { recursive: true, force: true });
  }
});
