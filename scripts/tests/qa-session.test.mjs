import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import {
  qaSession,
  qaWorkflowSession,
  qaEvidenceDirectory,
  requireFreePorts,
  verifyQaIdentity,
  qaIdentityPlugin,
  ownedQaServices,
} from '../../tools/qa-session.mjs';
import { arenaCreepQaOptions } from '../../tools/arena-creep-qa-options.mjs';

const listen = async (server) => {
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  return server.address().port;
};
const close = (server) => new Promise((done) => server.close(done));

test('defaults and independent session overrides preserve profile contracts', () => {
  const original = qaSession({}, {});
  assert.equal(original.serverPort, 2567);
  assert.equal(original.clientPort, 5173);
  assert.equal(original.outputDir, 'test-results');
  assert.equal(original.cacheDir, undefined);
  const options = {
    VOLAM_QA_SESSION: 'process-improvement',
    VOLAM_QA_SERVER_PORT: '2767',
    VOLAM_QA_CLIENT_PORT: '5373',
    VOLAM_QA_RUN_ID: 'owned',
  };
  const session = qaSession({}, options);
  assert.equal(session.serverUrl, 'http://127.0.0.1:2767');
  assert.match(session.cacheDir, /vite-process-improvement-gameplay$/);
  assert.equal(session.runId, 'owned');
  assert.notEqual(session.runId, qaSession({}, {}).runId);
  const custom = qaSession(
    {},
    {
      ...options,
      VITE_SERVER_URL: 'http://localhost:2767',
      VOLAM_QA_VITE_CACHE: '.cache/custom',
      VOLAM_QA_PLAYWRIGHT_OUTPUT: 'artifacts/custom',
    },
  );
  assert.equal(custom.cacheDir, resolve('.cache/custom'));
  assert.equal(custom.outputDir, 'artifacts/custom');
  const art = qaSession(
    { profile: 'arena-creeps', serverPort: 2588, clientPort: 5186 },
    {},
  );
  assert.equal(art.serverPort, 2588);
  assert.equal(art.clientPort, 5186);
  assert.equal(
    qaEvidenceDirectory('docs/evidence/frames', {}),
    'docs/evidence/frames',
  );
  assert.equal(
    qaEvidenceDirectory('docs/evidence/frames', {
      VOLAM_QA_EVIDENCE_DIR: 'custom',
    }),
    resolve('custom/frames'),
  );
  assert.match(
    arenaCreepQaOptions(['--mode', 'frames'], options).evidenceDirectory,
    /process-improvement[\\/]frames-2-players-minimal$/,
  );
});

test('invalid ports and contradictory or remote endpoints fail before preparation', () => {
  for (const env of [
    { VOLAM_QA_SERVER_PORT: '0' },
    { VOLAM_QA_CLIENT_PORT: '65536' },
    { VOLAM_QA_SERVER_PORT: '3.5' },
    { VOLAM_QA_SERVER_PORT: '' },
    { VOLAM_QA_CLIENT_PORT: '2567' },
    { VOLAM_QA_SESSION: '../other' },
    { VITE_SERVER_URL: 'http://127.0.0.1:9999' },
    { VITE_SERVER_URL: 'http://example.com:2567' },
    { VITE_SERVER_URL: 'http://127.0.0.1:2567/wrong' },
  ])
    assert.throws(() => qaSession({}, env));
});

test('a healthy occupied service is never borrowed or stopped', async () => {
  let requests = 0;
  const foreign = createServer((_req, res) => {
    requests++;
    res.end('still running');
  });
  const port = await listen(foreign);
  try {
    await assert.rejects(
      requireFreePorts({ serverPort: port, clientPort: port + 1 }),
      /unavailable.*not be reused or stopped/,
    );
    assert.equal(
      await (await fetch(`http://127.0.0.1:${port}`)).text(),
      'still running',
    );
    assert.equal(requests, 1);
  } finally {
    await close(foreign);
  }
});

test('identity rejects wrong run, endpoint, HTTP failures and non-JSON health pages', async () => {
  let body = {
    service: 'volam-game-server',
    runId: 'mine',
    protocolVersion: 11,
  };
  let status = 200;
  const server = createServer((_req, res) => {
    res.statusCode = status;
    res.end(typeof body === 'string' ? body : JSON.stringify(body));
  });
  const port = await listen(server);
  const url = `http://127.0.0.1:${port}`;
  try {
    await verifyQaIdentity(url, { runId: 'mine', protocolVersion: 11 });
    await assert.rejects(
      verifyQaIdentity(url, { runId: 'someone-else' }),
      /Wrong QA service/,
    );
    body = { serverUrl: 'http://localhost:2567' };
    await verifyQaIdentity(url, { serverUrl: 'http://127.0.0.1:2567' });
    await assert.rejects(
      verifyQaIdentity(url, { serverUrl: 'http://127.0.0.1:2767' }),
      /Wrong QA service/,
    );
    body = 'healthy';
    await assert.rejects(verifyQaIdentity(url, {}), /unavailable/);
    status = 503;
    await assert.rejects(verifyQaIdentity(url, {}), /HTTP 503/);
  } finally {
    await close(server);
  }
});

test('client middleware identifies the actual owned run and cleanup attempts all owners once', async () => {
  const session = qaSession({}, { VOLAM_QA_RUN_ID: 'fixture' });
  let middleware;
  const postHook = qaIdentityPlugin(session).configureServer({
    middlewares: {
      use(path, handler) {
        assert.equal(path, '/__volam_qa_identity');
        middleware = handler;
        return () => {
          throw Error('connect return must not become a Vite post hook');
        };
      },
    },
  });
  assert.equal(postHook, undefined);
  let response;
  middleware(
    {},
    {
      setHeader() {},
      end(body) {
        response = JSON.parse(body);
      },
    },
  );
  assert.deepEqual(response, {
    service: 'volam-qa-client',
    runId: 'fixture',
    serverUrl: session.serverUrl,
  });
  const owned = ownedQaServices();
  const calls = [];
  owned.add(() => calls.push('server'));
  owned.add(() => {
    calls.push('client');
    throw Error('close failure');
  });
  await assert.rejects(owned.close(), /cleanup failed/);
  await assert.rejects(owned.close(), /cleanup failed/);
  assert.deepEqual(calls, ['client', 'server']);
});

test('workflow selects the managed profile rather than forcing every run to gameplay ports', () => {
  const uiCamera = qaWorkflowSession(
    'final',
    ['--config', 'playwright.ui-camera.config.ts'],
    {
      VOLAM_QA_SERVER_PORT: '28771',
      VOLAM_QA_CLIENT_PORT: '28772',
      VITE_SERVER_URL: 'http://localhost:28771',
    },
  );
  assert.equal(uiCamera.serverPort, 28771);
  assert.equal(uiCamera.clientPort, 28772);
  assert.throws(
    () =>
      qaWorkflowSession(
        'browser',
        ['--config=playwright.ui-camera.config.ts'],
        {
          VITE_SERVER_URL: 'https://independent.example:8443',
        },
      ),
    /configured local server port/,
  );
  const env = { VITE_SERVER_URL: 'http://localhost:2588' };
  for (const args of [
    ['--config', 'playwright.arena-creeps.config.ts'],
    ['--config=playwright.arena-creeps.config.ts'],
    ['-c', 'C:\\repo\\playwright.arena-creeps.config.ts'],
  ]) {
    const session = qaWorkflowSession('browser', args, env);
    assert.equal(session.serverPort, 2588);
    assert.equal(session.clientPort, 5186);
    assert.equal(session.serverUrl, env.VITE_SERVER_URL);
  }
  for (const [mode, args] of [
    ['quick', ['tests/forest-creep-art.test.ts']],
    ['browser', ['--config', 'playwright.forest.config.ts']],
    ['final', ['--config=playwright.unregistered.config.ts']],
  ]) {
    assert.doesNotThrow(() =>
      qaWorkflowSession(mode, args, {
        VITE_SERVER_URL: 'https://independent.example:8443',
      }),
    );
  }
  assert.throws(
    () => qaWorkflowSession('browser', [], env),
    /configured local server port/,
  );
  assert.throws(
    () =>
      qaWorkflowSession(
        'final',
        ['--config=playwright.arena-creeps.config.ts'],
        { VITE_SERVER_URL: 'http://localhost:2567' },
      ),
    /configured local server port/,
  );
  assert.throws(
    () => qaWorkflowSession('browser', ['--config'], {}),
    /requires a path/,
  );
});
