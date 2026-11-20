import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import {
  observeQa,
  pressQaAndWait,
  acknowledgeQaLobby,
} from '../../tools/qa-browser.mjs';

test('observation disposes handles and retains compact failure context', async () => {
  let disposed = 0;
  const page = {
    waitForFunction: async () => ({
      jsonValue: async () => ({ tick: 21 }),
      dispose: async () => disposed++,
    }),
  };
  assert.deepEqual(await observeQa(page, () => true), { tick: 21 });
  assert.equal(disposed, 1);
  page.waitForFunction = async () => ({
    jsonValue: async () => {
      throw Error('target closed');
    },
    dispose: async () => disposed++,
  });
  page.evaluate = async () => ({ tick: 20, ready: false });
  await assert.rejects(
    observeQa(page, () => true, undefined, { label: 'A hit' }),
    /QA A hit: Error.*"tick":20/,
  );
  assert.equal(disposed, 2);
});

test('combat input is focused, observed before pressing and dispatched exactly once on failure', async () => {
  const calls = [];
  let waits = 0;
  const page = {
    waitForFunction: async () => {
      calls.push('observe');
      waits++;
      if (waits === 1)
        return { jsonValue: async () => true, dispose: async () => {} };
      throw Error('no server acknowledgement');
    },
    evaluate: async () => ({ tick: 3 }),
    bringToFront: async () => calls.push('front'),
    locator: () => ({ focus: async () => calls.push('focus') }),
    keyboard: { press: async (key) => calls.push(key) },
  };
  await assert.rejects(
    pressQaAndWait(page, 'KeyA', () => false),
    /no server acknowledgement|QA authoritative observation/,
  );
  assert.deepEqual(calls, ['observe', 'front', 'focus', 'observe', 'KeyA']);
  await assert.rejects(
    acknowledgeQaLobby(page, 'attack'),
    /Unsupported lobby action/,
  );
  assert.equal(calls.filter((call) => call === 'KeyA').length, 1);
});

test('a dead authoritative actor fails before any combat input is sent', async () => {
  let presses = 0;
  const page = {
    waitForFunction: async () => ({
      jsonValue: async () => true,
      dispose: async () => {},
    }),
    evaluate: async (fn) =>
      runInNewContext(`(${fn.toString()})()`, {
        window: {
          __VOLAM__: {
            snapshot: () => ({
              sessionId: 'dead',
              state: { players: { dead: { hp: 0 } } },
            }),
          },
        },
      }),
    keyboard: { press: async () => presses++ },
  };
  await assert.rejects(
    pressQaAndWait(page, 'KeyA', () => true),
    /living authoritative actor: dead hp=0/,
  );
  assert.equal(presses, 0);
});
