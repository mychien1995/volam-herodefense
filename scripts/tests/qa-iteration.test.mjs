import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import {
  IterationLease,
  iterationSnapshot,
} from '../../tools/qa-iteration-state.mjs';

test('live lease reuses only matching inputs, resets each fresh test and invalidates on changed bytes', async () => {
  const lease = new IterationLease();
  let digest = 'a',
    starts = 0,
    closes = 0,
    tests = 0,
    rooms = 9;
  const options = {
    fingerprint: () => digest,
    start: async () => {
      starts++;
      return {
        close: async () => {
          closes++;
        },
      };
    },
    verify: async () => {},
    reset: async () => {
      const disposed = rooms;
      rooms = 0;
      return disposed;
    },
    execute: async () => {
      assert.equal(rooms, 0);
      tests++;
      rooms = 3;
      return tests;
    },
  };
  const a = await lease.round(options),
    b = await lease.round(options);
  assert.equal(a.reused, false);
  assert.equal(b.reused, true);
  assert.equal(a.before, 9);
  assert.equal(b.after, 3);
  assert.equal(tests, 2);
  assert.equal(starts, 1);
  digest = 'b';
  await lease.round(options);
  assert.equal(starts, 2);
  assert.equal(closes, 1);
  await lease.close();
  await lease.close();
  assert.equal(closes, 2);
});

test('no cached PASS after execution/reset/identity failure or mutation; failed owner always closes', async () => {
  for (const stage of ['verify', 'reset', 'execute', 'mutation']) {
    const lease = new IterationLease();
    let closes = 0,
      digest = 'a';
    const options = {
      fingerprint: () => digest,
      start: async () => ({
        close: async () => {
          closes++;
        },
      }),
      verify: async () => {},
      reset: async () => 0,
      execute: async () => 0,
    };
    if (stage === 'mutation')
      options.execute = async () => {
        digest = 'b';
      };
    else
      options[stage] = async () => {
        throw Error(stage);
      };
    await assert.rejects(lease.round(options));
    assert.equal(closes, 1);
    assert.equal(lease.current, undefined);
  }
});

test('parallel requests rejected and startup/cleanup errors kept', async () => {
  const lease = new IterationLease();
  let release;
  const options = {
    fingerprint: () => 'a',
    start: async () => ({
      close: async () => {
        throw Error('cleanup');
      },
    }),
    verify: async () => {},
    reset: async () => 0,
    execute: () =>
      new Promise((done) => {
        release = done;
      }),
  };
  const first = lease.round(options);
  await new Promise((done) => setImmediate(done));
  await assert.rejects(lease.round(options), /already running/);
  release();
  await first;
  await assert.rejects(
    lease.round({
      ...options,
      execute: async () => {
        throw Error('test failed');
      },
    }),
    (e) => e instanceof AggregateError && e.errors.length === 2,
  );
  const failed = new IterationLease();
  await assert.rejects(
    failed.round({
      ...options,
      start: async () => {
        throw Error('start');
      },
    }),
    /start/,
  );
  assert.equal(failed.current, undefined);
});

test('fingerprint includes actual bytes, added/removed sources, configs and compiled output', () => {
  const parent = resolve('.cache');
  const root = mkdtempSync(resolve(parent, 'qa-iteration-hash-'));
  try {
    const before = iterationSnapshot(root, 'service');
    writeFileSync(resolve(root, 'tsconfig.base.json'), '{}');
    assert.notEqual(iterationSnapshot(root, 'service'), before);
    const next = iterationSnapshot(root, 'service');
    writeFileSync(resolve(root, 'tsconfig.base.json'), '[]');
    assert.notEqual(iterationSnapshot(root, 'service'), next);
    rmSync(resolve(root, 'tsconfig.base.json'));
    assert.equal(iterationSnapshot(root, 'service'), before);
  } finally {
    assert.equal(dirname(root), parent);
    assert.ok(root.startsWith(resolve(parent, 'qa-iteration-hash-')));
    rmSync(root, { recursive: true, force: true });
  }
});
