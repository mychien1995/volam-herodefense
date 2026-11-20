import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import {
  qaPreflight,
  supportsNode,
  qaBrowserEnvironment,
  managedQaProfile,
  formatPreflight,
  verifyQaBuild,
} from '../../tools/qa-preflight.mjs';

function fixture() {
  const root = mkdtempSync(resolve(tmpdir(), 'volam-preflight-'));
  const write = (path, value) => {
    const dest = resolve(root, path);
    mkdirSync(resolve(dest, '..'), { recursive: true });
    writeFileSync(
      dest,
      typeof value === 'string' ? value : JSON.stringify(value),
    );
  };
  write('package.json', {
    name: 'volam-hero-defense',
    packageManager: 'pnpm@11.25.0',
    engines: { node: '^22.12.0 || ^24.0.0 || >=26.0.0' },
    devDependencies: { typescript: '7.0.2', vitest: '5.0.0' },
  });
  write('pnpm-lock.yaml', 'same-lock');
  write('node_modules/.pnpm/lock.yaml', 'same-lock');
  write('node_modules/.modules.yaml', { packageManager: 'pnpm@11.25.0' });
  for (const [name, version] of [
    ['typescript', '7.0.2'],
    ['vitest', '5.0.0'],
  ])
    write(`node_modules/${name}/package.json`, { name, version });
  return {
    root,
    write,
    close: () => {
      assert.ok(root.startsWith(resolve(tmpdir(), 'volam-preflight-')));
      rmSync(root, { recursive: true, force: true });
    },
  };
}

test('Node engine minimums, browser environment and legacy profile boundaries', () => {
  const range = '^22.12.0 || ^24.0.0 || >=26.0.0';
  for (const version of ['22.12.0', '22.14.0', '24.0.0', '26.0.0', '27.0.0'])
    assert.equal(supportsNode(version, range), true);
  for (const version of ['20.19.0', '22.11.9', '23.0.0', '25.0.0'])
    assert.equal(supportsNode(version, range), false);
  assert.throws(() => supportsNode('26.0.0', 'unknown'), /Unsupported/);
  assert.equal(
    managedQaProfile('browser', ['--config=playwright.arena-creeps.config.ts']),
    true,
  );
  assert.equal(managedQaProfile('quick'), false);
  assert.equal(
    managedQaProfile('browser', ['--config', 'playwright.skills.config.ts']),
    true,
  );
  assert.equal(
    qaBrowserEnvironment({}, '/repo').PLAYWRIGHT_BROWSERS_PATH,
    resolve('/repo', '.cache/ms-playwright'),
  );
  assert.equal(
    qaBrowserEnvironment({ PLAYWRIGHT_BROWSERS_PATH: '0' }, '/repo')
      .PLAYWRIGHT_BROWSERS_PATH,
    '0',
  );
});

test('fresh lock/dependency observations detect edits, missing installs and manager mismatch', async () => {
  const f = fixture();
  try {
    const run = () =>
      qaPreflight({
        root: f.root,
        mode: 'quick',
        env: {},
        nodeVersion: '26.0.0',
      });
    assert.equal((await run()).status, 'PASS');
    f.write('node_modules/.pnpm/lock.yaml', 'other-lok');
    assert.match(formatPreflight(await run()), /Installed lockfile differs/);
    f.write('node_modules/.pnpm/lock.yaml', 'same-lock');
    assert.equal((await run()).status, 'PASS');
    f.write('node_modules/typescript/package.json', {
      name: 'typescript',
      version: '0.0.0',
    });
    assert.match(formatPreflight(await run()), /typescript: installed 0.0.0/);
    f.write('node_modules/.modules.yaml', { packageManager: 'pnpm@10.0.0' });
    assert.match(formatPreflight(await run()), /Installed pnpm@10/);
  } finally {
    f.close();
  }
  assert.equal(
    (await qaPreflight({ root: f.root, mode: 'quick' })).status,
    'FAIL',
  );
});

test('occupied ports fail before preparation and never touch the foreign service', async () => {
  const server = createServer((_req, res) => res.end('foreign service intact'));
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  const port = server.address().port;
  try {
    const env = {
      VOLAM_QA_SERVER_PORT: String(port),
      VOLAM_QA_CLIENT_PORT: String(port === 65535 ? port - 1 : port + 1),
    };
    const report = await qaPreflight({ env });
    assert.equal(report.status, 'FAIL');
    assert.match(formatPreflight(report), /QA port.*unavailable/);
    assert.equal(
      report.checks.some((check) => check.id === 'chromium'),
      false,
    );
    assert.equal(
      await (await fetch(`http://127.0.0.1:${port}`)).text(),
      'foreign service intact',
    );
  } finally {
    await new Promise((done) => server.close(done));
  }
});

test('runner rejects a missing browser before any asset, compilation or build stage', async () => {
  const f = fixture();
  try {
    const env = {
      ...process.env,
      VOLAM_QA_SESSION: 'preflight-missing-browser-test',
      VOLAM_QA_EVIDENCE_DIR: f.root,
      PLAYWRIGHT_BROWSERS_PATH: resolve(f.root, 'missing-browser'),
    };
    const ports = [];
    for (let n = 0; n < 2; n++) {
      const probe = createServer();
      await new Promise((done) => probe.listen(0, '127.0.0.1', done));
      ports.push(probe.address().port);
      await new Promise((done) => probe.close(done));
    }
    env.VOLAM_QA_SERVER_PORT = String(ports[0]);
    env.VOLAM_QA_CLIENT_PORT = String(ports[1]);
    env.VITE_SERVER_URL = `http://127.0.0.1:${ports[0]}`;
    let output = '';
    const child = spawn(
      process.execPath,
      [
        'scripts/check-workflow.mjs',
        'browser',
        'tests/e2e/gameplay.spec.ts',
        '--grep',
        'ranged projectile',
      ],
      { env, windowsHide: true },
    );
    for (const stream of [child.stdout, child.stderr])
      stream.on('data', (chunk) => (output += chunk));
    const code = await new Promise((done, reject) => {
      child.once('error', reject);
      child.once('close', done);
    });
    assert.equal(code, 1);
    assert.match(output, /Missing Chromium/);
    const report = JSON.parse(
      readFileSync(
        resolve(f.root, 'check-workflow/browser-timings.json'),
        'utf8',
      ),
    );
    assert.deepEqual(
      report.stages.map((stage) => stage.label),
      ['environment preflight'],
    );
    assert.equal(report.status, 'FAIL');
  } finally {
    f.close();
  }
});

test('ready checks reject stale protocol and wrong built endpoints without accepting health from another service', () => {
  const f = fixture();
  const session = { serverUrl: 'http://127.0.0.1:2799' };
  try {
    assert.throws(
      () => verifyQaBuild(f.root, session),
      /Missing compiled server/,
    );
    f.write(
      'apps/game-server/dist/app.config.js',
      'export const ready = true;',
    );
    f.write(
      'packages/game-protocol/src/index.ts',
      'export const PROTOCOL_VERSION = 46;',
    );
    f.write(
      'packages/game-protocol/dist/index.js',
      'export const PROTOCOL_VERSION = 45;',
    );
    assert.throws(() => verifyQaBuild(f.root, session), /protocol mismatch/);
    f.write(
      'packages/game-protocol/dist/index.js',
      'export const PROTOCOL_VERSION = 46;',
    );
    f.write('apps/game-client/dist/volam-build-endpoint.json', {
      serverUrl: 'http://127.0.0.1:9999',
    });
    assert.throws(() => verifyQaBuild(f.root, session), /endpoint differs/);
    f.write('apps/game-client/dist/volam-build-endpoint.json', {
      serverUrl: 'http://localhost:2799',
    });
    assert.deepEqual(verifyQaBuild(f.root, session), {
      protocol: '46',
      serverUrl: session.serverUrl,
    });
  } finally {
    f.close();
  }
});

test('ready respects static, preview-only and development fixtures without weakening protocol guards', () => {
  const f = fixture();
  const session = (clientMode, services) => ({
    serverUrl: 'http://127.0.0.1:2799',
    contract: { clientMode, services },
  });
  try {
    assert.match(
      verifyQaBuild(f.root, session('static', [{ clientPort: 5413 }])).client,
      /static review/,
    );
    assert.throws(
      () => verifyQaBuild(f.root, session('preview', [{ clientPort: 5557 }])),
      /Missing built preview/,
    );
    f.write('apps/game-client/dist/index.html', '<html></html>');
    assert.match(
      verifyQaBuild(f.root, session('preview', [{ clientPort: 5557 }])).client,
      /preview-only/,
    );
    const development = session('development', [
      { serverPort: 2799, clientPort: 5399 },
    ]);
    assert.throws(
      () => verifyQaBuild(f.root, development),
      /Missing compiled server/,
    );
    f.write(
      'apps/game-server/dist/app.config.js',
      'export const ready = true;',
    );
    f.write(
      'packages/game-protocol/src/index.ts',
      'export const PROTOCOL_VERSION = 46;',
    );
    f.write(
      'packages/game-protocol/dist/index.js',
      'export const PROTOCOL_VERSION = 45;',
    );
    assert.throws(
      () => verifyQaBuild(f.root, development),
      /protocol mismatch/,
    );
    f.write(
      'packages/game-protocol/dist/index.js',
      'export const PROTOCOL_VERSION = 46;',
    );
    assert.match(
      verifyQaBuild(f.root, development).client,
      /development client/,
    );
    assert.throws(
      () =>
        verifyQaBuild(
          f.root,
          session('preview', development.contract.services),
        ),
      /ENOENT/,
    );
  } finally {
    f.close();
  }
});

test('custom sprite preview verifies its actual bundle instead of the default dist', () => {
  const f = fixture(),
    session = { serverUrl: 'http://127.0.0.1:2799' };
  try {
    f.write(
      'apps/game-server/dist/app.config.js',
      'export const ready = true;',
    );
    f.write(
      'packages/game-protocol/src/index.ts',
      'export const PROTOCOL_VERSION = 46;',
    );
    f.write(
      'packages/game-protocol/dist/index.js',
      'export const PROTOCOL_VERSION = 46;',
    );
    f.write('apps/game-client/dist/volam-build-endpoint.json', {
      serverUrl: 'http://127.0.0.1:9999',
    });
    f.write('.cache/sprite-dist/volam-build-endpoint.json', {
      serverUrl: session.serverUrl,
    });
    assert.equal(
      verifyQaBuild(f.root, session, '.cache/sprite-dist').serverUrl,
      session.serverUrl,
    );
    assert.throws(() => verifyQaBuild(f.root, session), /endpoint differs/);
    f.write('.cache/sprite-dist/volam-build-endpoint.json', {
      serverUrl: 'http://127.0.0.1:9998',
    });
    assert.throws(
      () => verifyQaBuild(f.root, session, '.cache/sprite-dist'),
      /endpoint differs/,
    );
    f.write(
      'packages/game-protocol/dist/index.js',
      'export const PROTOCOL_VERSION = 45;',
    );
    assert.throws(
      () => verifyQaBuild(f.root, session, '.cache/sprite-dist'),
      /protocol mismatch/,
    );
  } finally {
    f.close();
  }
});
