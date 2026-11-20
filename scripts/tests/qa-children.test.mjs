import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { startQaChildren } from '../../tools/qa-children.mjs';
import { requireQaPorts } from '../../tools/qa-session.mjs';
import { waitForQa } from '../../tools/qa-wait.mjs';

async function ports(count) {
  const values = [];
  for (let i = 0; i < count; i++) {
    const server = createServer();
    await new Promise((done) => server.listen(0, '127.0.0.1', done));
    values.push(server.address().port);
    await new Promise((done) => server.close(done));
  }
  return values;
}

test('owned child identities, failed sibling and timeout all release only owned handles', async () => {
  const cache = resolve('.cache');
  mkdirSync(cache, { recursive: true });
  const root = mkdtempSync(resolve(cache, 'qa-child-probe-'));
  const script = resolve(root, 'child.mjs');
  writeFileSync(
    script,
    `import {createServer} from 'node:http';
import {runQaFixture} from ${JSON.stringify(pathToFileURL(resolve('tools/qa-fixture.mjs')).href)};
import {serveQaChild} from ${JSON.stringify(pathToFileURL(resolve('tools/qa-children.mjs')).href)};
const serverPort=Number(process.env.PROBE_SERVER),clientPort=Number(process.env.PROBE_CLIENT),runId=process.env.VOLAM_QA_RUN_ID;
const session={serverPort,clientPort,runId,serverUrl:'http://127.0.0.1:'+serverPort,clientUrl:'http://127.0.0.1:'+clientPort};
if(process.env.PROBE_BAD){const send=process.send.bind(process);process.send=message=>send(message.type==='ready'?{...message,runId:'foreign-run'}:message);}
function native(port,identity){const s=createServer((_q,r)=>r.end(JSON.stringify(identity)));return {listen:()=>new Promise((done,reject)=>s.once('error',reject).listen(port,'127.0.0.1',done)),close:()=>new Promise((done,reject)=>s.close(e=>e?reject(e):done()))};}
await serveQaChild(session,48,()=>process.env.PROBE_HANG?new Promise(()=>{}):runQaFixture({session,protocolVersion:48,
createServer:()=>{const s=native(serverPort,{service:'volam-game-server',runId,protocolVersion:48});return{listen:s.listen,gracefullyShutdown:s.close};},
createClient:async()=>native(clientPort,{service:'volam-qa-client',runId,serverUrl:session.serverUrl})}));
if(process.env.PROBE_DISCONNECT)setTimeout(()=>process.disconnect(),100);
`,
  );
  try {
    const allocated = await ports(4),
      [a, b, c, d] = allocated;
    const service = (name, serverPort, clientPort, extra = {}) => ({
      name,
      script,
      serverPort,
      clientPort,
      environment: {
        PROBE_SERVER: String(serverPort),
        PROBE_CLIENT: String(clientPort),
        ...extra,
      },
    });
    const options = {
      services: [service('one', a, b), service('two', c, d)],
      directory: root,
      protocolVersion: 48,
      readyTimeout: 3000,
      stopTimeout: 1500,
    };
    const close = await startQaChildren(options);
    const one = close(),
      two = close();
    assert.equal(one, two);
    await Promise.all([one, two]);
    await requireQaPorts(allocated);
    await assert.rejects(
      startQaChildren({
        ...options,
        services: [
          service('one', a, b),
          service('bad', c, d, { PROBE_BAD: '1' }),
        ],
      }),
      (e) => /Wrong QA child identity/.test(String(e.cause ?? e)),
    );
    await requireQaPorts(allocated);
    const disconnected = await startQaChildren({
      ...options,
      services: [service('disconnect', a, b, { PROBE_DISCONNECT: '1' })],
    });
    await waitForQa(
      async () => {
        try {
          await requireQaPorts([a, b]);
          return true;
        } catch {
          return false;
        }
      },
      'disconnected child releases its ports',
      { timeout: 2000, interval: 30 },
    );
    await assert.rejects(
      disconnected(),
      (error) =>
        error instanceof AggregateError &&
        error.errors.some((e) => /Owned QA child/.test(String(e))),
    );
    await requireQaPorts(allocated);
    await assert.rejects(
      startQaChildren({
        ...options,
        services: [service('hung', a, b, { PROBE_HANG: '1' })],
        readyTimeout: 500,
        stopTimeout: 250,
      }),
      (e) => /readiness timeout/.test(String(e.cause ?? e)),
    );
    await requireQaPorts(allocated);
    const foreign = createServer((_q, r) => r.end('foreign'));
    await new Promise((done) => foreign.listen(a, '127.0.0.1', done));
    try {
      await assert.rejects(startQaChildren(options), /unavailable/);
      assert.equal(
        await (await fetch(`http://127.0.0.1:${a}`)).text(),
        'foreign',
      );
    } finally {
      await new Promise((done) => foreign.close(done));
    }
  } finally {
    assert.equal(dirname(root), cache);
    assert.ok(root.startsWith(resolve(cache, 'qa-child-probe-')));
    rmSync(root, { recursive: true, force: true });
  }
});
