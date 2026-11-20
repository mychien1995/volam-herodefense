import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { startQaStatic } from '../../tools/qa-static.mjs';
import { requireQaPorts } from '../../tools/qa-session.mjs';

test('static PID identity and awaited repeated cleanup retain foreign services and reject wrong identity', async () => {
  const cache = resolve('.cache');
  mkdirSync(cache, { recursive: true });
  const root = mkdtempSync(resolve(cache, 'qa-static-probe-'));
  const script = resolve(root, 'server.mjs');
  writeFileSync(
    script,
    `import{createServer}from'node:http';const s=createServer((_q,r)=>r.end(JSON.stringify({pid:process.env.BAD_STATIC_PID?-1:process.pid})));s.listen(Number(process.env.STATIC_PORT),'127.0.0.1');process.on('SIGTERM',()=>s.close(()=>process.exit(0)));`,
  );
  const probe = createServer();
  await new Promise((done) => probe.listen(0, '127.0.0.1', done));
  const port = probe.address().port;
  await new Promise((done) => probe.close(done));
  const options = {
    script,
    port,
    environment: { STATIC_PORT: String(port) },
    directory: root,
  };
  try {
    const cleanup = await startQaStatic(options);
    const a = cleanup(),
      b = cleanup();
    assert.equal(a, b);
    await Promise.all([a, b]);
    await requireQaPorts([port]);
    await assert.rejects(
      startQaStatic({
        ...options,
        environment: { ...options.environment, BAD_STATIC_PID: '1' },
      }),
      /Wrong static QA process identity/,
    );
    await requireQaPorts([port]);
    const foreign = createServer((_q, r) => r.end('foreign'));
    await new Promise((done) => foreign.listen(port, '127.0.0.1', done));
    try {
      await assert.rejects(startQaStatic(options), /unavailable/);
      assert.equal(
        await (await fetch(`http://127.0.0.1:${port}`)).text(),
        'foreign',
      );
    } finally {
      await new Promise((done) => foreign.close(done));
    }
  } finally {
    assert.equal(dirname(root), cache);
    assert.ok(root.startsWith(resolve(cache, 'qa-static-probe-')));
    rmSync(root, { recursive: true, force: true });
  }
});
