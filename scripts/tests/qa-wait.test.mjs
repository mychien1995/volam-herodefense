import { test } from 'node:test';
import assert from 'node:assert/strict';
import { waitForQa, requireQaActor } from '../../tools/qa-wait.mjs';

test('observation waits finish on acknowledgement without spending the deadline', async () => {
  let observations = 0;
  await waitForQa(() => ++observations === 3, 'input sequence', {
    timeout: 1000,
    interval: 1,
  });
  assert.equal(observations, 3);
});

test('impossible prerequisites and read errors fail on their first observation', async () => {
  for (const [actor, message] of [
    [undefined, /Missing/],
    [{ hp: 0, zoneId: 'arena' }, /Dead/],
    [{ hp: 10, zoneId: 'forest' }, /Wrong zone/],
  ]) {
    let observations = 0;
    await assert.rejects(
      waitForQa(() => {
        observations++;
        requireQaActor(actor, 'hero', 'arena');
        return false;
      }, 'A accepted'),
      message,
    );
    assert.equal(observations, 1);
  }
  await assert.rejects(
    waitForQa(() => {
      throw Error('browser disconnected');
    }, 'event'),
    /browser disconnected/,
  );
  assert.equal(
    requireQaActor({ hp: 1, zoneId: 'arena' }, 'hero', 'arena').hp,
    1,
  );
});

test('missing acknowledgements retain the failed label and compact authoritative diagnostics', async () => {
  await assert.rejects(
    waitForQa(() => false, 'cast event newer than 42', {
      timeout: 5,
      interval: 1,
      diagnostics: () => ({
        tick: 12,
        hp: 8,
        zoneId: 'arena',
        lastSequence: 7,
      }),
    }),
    /Timeout: cast event newer than 42.*"lastSequence":7/,
  );
  await assert.rejects(
    waitForQa(() => false, 'frame cycle', {
      timeout: 1,
      interval: 1,
      diagnostics: () => {
        throw Error('page closed');
      },
    }),
    /diagnosticError.*page closed/,
  );
});

test('core worlds supply zone membership separately from actor data', () => {
  assert.equal(requireQaActor({ hp: 1 }, 'core-hero', 'arena', 'arena').hp, 1);
  assert.throws(
    () => requireQaActor({ hp: 1 }, 'core-hero', 'arena', 'forest'),
    /Wrong zone/,
  );
});
