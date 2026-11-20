import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  statSync,
  utimesSync,
} from 'node:fs';
import { resolve, dirname } from 'node:path';
import {
  prepareOutputObserver,
  preparedObservation,
} from '../../tools/qa-prepared-observation.mjs';
import { fileSnapshot } from '../../tools/core-test-cache.mjs';
import { IterationLease } from '../../tools/qa-iteration-state.mjs';
import { observeAssetOutputs, writeIfChanged } from '../asset-files.mjs';

function fixture() {
  const parent = resolve('.cache');
  mkdirSync(parent, { recursive: true });
  const root = mkdtempSync(resolve(parent, 'qa-prepared-test-')),
    publicName = 'apps/game-client/public';
  mkdirSync(resolve(root, publicName), { recursive: true });
  const output = resolve(root, publicName, 'image.bin'),
    observer = prepareOutputObserver(root, 'owned');
  const stop = observeAssetOutputs(observer.observe);
  writeIfChanged(output, Buffer.from([1, 2, 3]));
  stop();
  const receipt = observer.receipt(0);
  return {
    root,
    output,
    publicName,
    receipt,
    remove() {
      assert.equal(dirname(root), parent);
      assert.ok(root.startsWith(resolve(parent, 'qa-prepared-test-')));
      rmSync(root, { recursive: true, force: true });
    },
  };
}

test('fresh output receipt produces the exact original snapshot digest and is single-use', () => {
  const f = fixture();
  try {
    writeFileSync(
      resolve(f.root, f.publicName, 'not-prepared.bin'),
      'fresh fallback',
    );
    const expected = fileSnapshot(f.root, [f.publicName]);
    const observed = preparedObservation(f.root, f.receipt, 'owned');
    assert.equal(observed.outputs, 1);
    assert.deepEqual(observed.snapshot([f.publicName, f.publicName]), expected);
    assert.throws(() => observed.snapshot([f.publicName]), /only.*once/);
    assert.deepEqual(readFileSync(f.output), Buffer.from([1, 2, 3]));
  } finally {
    f.remove();
  }
});

test('reject stale/failed/foreign receipts, escapes, duplicate names, missing files and changed types', () => {
  const f = fixture();
  try {
    for (const patch of [
      { complete: false },
      { exitCode: 1 },
      { nonce: 'foreign' },
      { root: f.root + '-foreign' },
      { entries: [['../escape', 'a'.repeat(64)]] },
      { entries: [...f.receipt.entries, ...f.receipt.entries] },
    ])
      assert.throws(() =>
        preparedObservation(f.root, { ...f.receipt, ...patch }, 'owned'),
      );
    rmSync(f.output);
    assert.throws(
      () =>
        preparedObservation(f.root, f.receipt, 'owned').snapshot([
          f.publicName,
        ]),
      /missing/,
    );
    mkdirSync(f.output);
    assert.throws(
      () =>
        preparedObservation(f.root, f.receipt, 'owned').snapshot([
          f.publicName,
        ]),
      /missing/,
    );
  } finally {
    f.remove();
  }
});

test('same-size edits with original mtime before/during execution cannot produce PASS', async () => {
  for (const when of ['before', 'during']) {
    const f = fixture(),
      lease = new IterationLease();
    let first = true,
      closed = 0;
    try {
      const old = statSync(f.output),
        observation = preparedObservation(f.root, f.receipt, 'owned');
      const mutate = () => {
        writeFileSync(f.output, Buffer.from([7, 8, 9]));
        utimesSync(f.output, old.atime, old.mtime);
      };
      if (when === 'before') mutate();
      await assert.rejects(
        lease.round({
          fingerprint: () => {
            if (first) {
              first = false;
              return observation.snapshot([f.publicName]).digest;
            }
            return fileSnapshot(f.root, [f.publicName]).digest;
          },
          start: async () => ({
            close: async () => {
              closed++;
            },
          }),
          verify: async () => {},
          reset: async () => ({ remaining: 0 }),
          execute: async () => {
            if (when === 'during') mutate();
          },
        }),
        /changed during iteration/,
      );
      assert.equal(closed, 1);
    } finally {
      await lease.close();
      f.remove();
    }
  }
});
