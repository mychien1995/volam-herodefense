import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { runQaFixture } from '../../tools/qa-fixture.mjs';
import { startQaHttpFixture } from '../../tools/qa-http-fixture.mjs';
import { ownedQaServices } from '../../tools/qa-session.mjs';

async function fixture() {
  const ports = [];
  for (let i = 0; i < 2; i++) {
    const s = createServer();
    await new Promise((done) => s.listen(0, '127.0.0.1', done));
    ports.push(s.address().port);
    await new Promise((done) => s.close(done));
  }
  const session = {
    serverPort: ports[0],
    clientPort: ports[1],
    serverUrl: `http://127.0.0.1:${ports[0]}`,
    clientUrl: `http://127.0.0.1:${ports[1]}`,
    runId: 'owned-test',
  };
  const calls = [],
    handles = [];
  const close = async (s, label) => {
    calls.push(label);
    if (s.listening)
      await new Promise((done, reject) =>
        s.close((e) => (e ? reject(e) : done())),
      );
  };
  const options = {
    session,
    protocolVersion: 48,
    environment: { VOLAM_QA_OWNER_PROBE: 'fixture' },
    createServer() {
      calls.push('create-server');
      const s = createServer((_req, res) =>
        res.end(
          JSON.stringify({
            service: 'volam-game-server',
            runId: process.env.VOLAM_QA_RUN_ID,
            protocolVersion: 48,
          }),
        ),
      );
      handles.push(s);
      return {
        listen: (port) =>
          new Promise((done, reject) =>
            s.once('error', reject).listen(port, '127.0.0.1', done),
          ),
        gracefullyShutdown: () => close(s, 'close-server'),
      };
    },
    async createClient() {
      calls.push('create-client');
      const s = createServer((_req, res) =>
        res.end(
          JSON.stringify({
            service: 'volam-qa-client',
            runId: session.runId,
            serverUrl: session.serverUrl,
          }),
        ),
      );
      handles.push(s);
      return {
        listen: () =>
          new Promise((done, reject) =>
            s
              .once('error', reject)
              .listen(session.clientPort, '127.0.0.1', done),
          ),
        close: () => close(s, 'close-client'),
      };
    },
  };
  return { options, calls, handles };
}
const environment = () =>
  Object.fromEntries(
    ['NODE_ENV', 'VOLAM_QA_RUN_ID', 'VOLAM_QA_OWNER_PROBE'].map((key) => [
      key,
      process.env[key],
    ]),
  );

test('fixture verifies identities, awaits one LIFO cleanup and restores only its environment', async () => {
  const f = await fixture(),
    before = environment();
  const cleanup = await runQaFixture(f.options);
  assert.equal(process.env.VOLAM_QA_OWNER_PROBE, 'fixture');
  const a = cleanup(),
    b = cleanup();
  assert.equal(a, b);
  await Promise.all([a, b]);
  assert.deepEqual(f.calls, [
    'create-server',
    'create-client',
    'close-client',
    'close-server',
  ]);
  assert.deepEqual(environment(), before);
  assert.ok(f.handles.every((s) => !s.listening));
});

test('startup failures close allocated owners and restore env, preserving startup and cleanup errors', async () => {
  for (const stage of ['listen', 'configure', 'client', 'both']) {
    const f = await fixture(),
      before = environment();
    if (stage === 'listen') {
      const create = f.options.createServer;
      f.options.createServer = () => ({
        ...create(),
        listen: async () => {
          throw Error('listen failure');
        },
      });
    } else if (stage === 'configure')
      f.options.configure = () => {
        throw Error('configure failure');
      };
    else {
      f.options.createClient = async () => {
        throw Error('client failure');
      };
      if (stage === 'both') {
        const create = f.options.createServer;
        f.options.createServer = () => {
          const server = create();
          return {
            ...server,
            gracefullyShutdown: async () => {
              await server.gracefullyShutdown();
              throw Error('cleanup failure');
            },
          };
        };
      }
    }
    await assert.rejects(
      runQaFixture(f.options),
      stage === 'both'
        ? (e) =>
            e instanceof AggregateError &&
            e.errors.length === 2 &&
            e.cause.message === 'client failure'
        : /failure/,
    );
    assert.ok(f.calls.includes('close-server'));
    assert.ok(f.handles.every((s) => !s.listening));
    assert.deepEqual(environment(), before);
  }
});

test('wrong protocol or client run cannot satisfy fixture readiness; all handles close', async () => {
  for (const stage of ['protocol', 'client-identity']) {
    const f = await fixture(),
      before = environment();
    if (stage === 'protocol') f.options.protocolVersion = 47;
    else {
      // The fake HTTP client must retain the actual created identity.
      const expected = f.options.session.runId;
      const s = createServer((_req, res) =>
        res.end(
          JSON.stringify({
            service: 'volam-qa-client',
            runId: expected,
            serverUrl: f.options.session.serverUrl,
          }),
        ),
      );
      f.handles.push(s);
      f.options.createClient = async () => ({
        listen: () =>
          new Promise((done) =>
            s.listen(f.options.session.clientPort, '127.0.0.1', done),
          ),
        close: async () => {
          await new Promise((done) => s.close(done));
        },
      });
      f.options.session.runId = 'new-run';
    }
    await assert.rejects(runQaFixture(f.options), /Wrong QA service/);
    assert.ok(f.handles.every((s) => !s.listening));
    assert.deepEqual(environment(), before);
  }
});

test('cleanup awaits LIFO, rejects late owners and preserves the same failure for every caller', async () => {
  const owned = ownedQaServices(),
    calls = [];
  let release;
  const gate = new Promise((done) => {
    release = done;
  });
  owned.add(async () => {
    calls.push('server');
    throw Error('server close');
  });
  owned.add(async () => {
    calls.push('client-start');
    await gate;
    calls.push('client-end');
  });
  const first = owned.close(),
    second = owned.close();
  assert.equal(first, second);
  assert.throws(() => owned.add(() => {}), /already started/);
  await Promise.resolve();
  assert.deepEqual(calls, ['client-start']);
  release();
  await assert.rejects(first, /cleanup failed/);
  await assert.rejects(second, /cleanup failed/);
  await assert.rejects(owned.close(), /cleanup failed/);
  assert.deepEqual(calls, ['client-start', 'client-end', 'server']);
});

test('HTTP bridge retains existing routes, serves identity and closes owned incomplete requests', async () => {
  const f = await fixture(),
    owned = ownedQaServices();
  const identity = {
    port: f.options.session.clientPort,
    runId: 'bridge-owner',
    serverUrl: f.options.session.serverUrl,
    protocolVersion: 48,
  };
  let accepted;
  const arrived = new Promise((done) => {
    accepted = done;
  });
  const server = await startQaHttpFixture(owned, identity, (req, res) => {
    if (req.url === '/wait') accepted();
    else res.end('original-fixture-response');
  });
  try {
    const url = f.options.session.clientUrl;
    assert.equal(
      await (await fetch(url + '/fixture', { method: 'POST' })).text(),
      'original-fixture-response',
    );
    assert.deepEqual(await (await fetch(url + '/__volam_qa_identity')).json(), {
      service: 'volam-qa-fixture',
      runId: identity.runId,
      serverUrl: identity.serverUrl,
      protocolVersion: 48,
    });
    const pending = fetch(url + '/wait').catch(() => null);
    await arrived;
    await owned.close();
    await pending;
    assert.equal(server.listening, false);
  } finally {
    await owned.close();
  }
});

test('client-only fixture does not claim or probe an unused game server', async () => {
  const f = await fixture();
  delete f.options.createServer;
  f.options.session.contract = { ports: [f.options.session.clientPort] };
  const foreign = createServer((_q, r) => r.end('unrelated-backend'));
  await new Promise((done) =>
    foreign.listen(f.options.session.serverPort, '127.0.0.1', done),
  );
  try {
    const close = await runQaFixture(f.options);
    await close();
    assert.deepEqual(f.calls, ['create-client', 'close-client']);
    assert.equal(
      await (await fetch(f.options.session.serverUrl)).text(),
      'unrelated-backend',
    );
  } finally {
    await new Promise((done) => foreign.close(done));
  }
});

test('foreign listener and stale preview fail before environment mutation or creating owners', async () => {
  const f = await fixture(),
    before = environment();
  const foreign = createServer((_req, res) => res.end('foreign-intact'));
  await new Promise((done) =>
    foreign.listen(f.options.session.clientPort, '127.0.0.1', done),
  );
  try {
    await assert.rejects(runQaFixture(f.options), /unavailable/);
    assert.equal(
      await (await fetch(f.options.session.clientUrl)).text(),
      'foreign-intact',
    );
    assert.deepEqual(f.calls, []);
    assert.deepEqual(environment(), before);
  } finally {
    await new Promise((done) => foreign.close(done));
  }
  f.options.preview = true;
  f.options.verifyBuild = () => {
    throw Error('stale build');
  };
  await assert.rejects(runQaFixture(f.options), /stale build/);
  assert.deepEqual(f.calls, []);
  assert.deepEqual(environment(), before);
});
