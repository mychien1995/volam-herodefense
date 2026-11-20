import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import {
  qaProfileContracts,
  qaConfigName,
  qaProfilePorts,
} from '../../tools/qa-profiles.mjs';
import { qaWorkflowSession, requireQaPorts } from '../../tools/qa-session.mjs';

const session = (name, env = {}) =>
  qaWorkflowSession(
    'browser',
    ['--config', `playwright.${name}.config.ts`],
    env,
  );

test('all tracked Playwright profiles have explicit preflight contracts; WIP configs are excluded', () => {
  const tracked = execFileSync('git', ['ls-files', 'playwright*.config.ts'], {
    encoding: 'utf8',
    windowsHide: true,
  })
    .trim()
    .split(/\r?\n/);
  for (const name of tracked)
    assert.ok(qaProfileContracts[name], `Missing ${name}`);
  for (const [name, contract] of Object.entries(qaProfileContracts)) {
    assert.ok(existsSync(name));
    if (contract.setup) assert.ok(existsSync(contract.setup));
    assert.ok(['shared', 'fixed', 'alias'].includes(contract.ports));
    assert.ok(
      ['preview', 'development', 'static'].includes(contract.clientMode),
    );
    assert.ok(contract.channels.length);
    assert.ok(qaProfilePorts({ name, ...contract }, {}).ports.length);
  }
  for (const name of [
    'boss-combat-review',
    'hong-liet-vfx-review',
    'kim-xiangyang-review',
  ])
    assert.equal(qaProfileContracts[`playwright.${name}.config.ts`], undefined);
});

test('legacy contracts preserve fixed, shared, alias, multi-service and extra fixture ports', () => {
  assert.deepEqual(session('skills').contract.ports, [2572, 5176]);
  assert.deepEqual(
    session('duong-mon-game', {
      VOLAM_QA_SERVER_PORT: '28791',
      VOLAM_QA_CLIENT_PORT: '28792',
    }).contract.ports,
    [28791, 28792],
  );
  assert.deepEqual(
    session('hong-liet', {
      HONG_LIET_QA_SERVER_PORT: '28791',
      HONG_LIET_QA_CLIENT_PORT: '28792',
    }).contract.ports,
    [28791, 28792],
  );
  assert.deepEqual(session('m3c3').contract.ports, [2588, 5192, 2586, 5190]);
  assert.deepEqual(
    session('m3d-r3', { VOLAM_QA_FIXTURE_PORT: '28791' }).contract.ports,
    [2567, 5173, 28791],
  );
  assert.equal(session('m3d-r3').contract.clientMode, 'preview');
  assert.equal(
    session('m3d-r3', { VOLAM_QA_DEV_CLIENT: '1' }).contract.clientMode,
    'development',
  );
  assert.equal(session('hell').contract.clientMode, 'development');
  assert.equal(
    qaWorkflowSession(
      'final',
      ['--config', 'playwright.arena-creeps.config.ts'],
      {},
    ).contract.clientMode,
    'preview',
  );
  assert.equal(
    session('arena-creeps', { VOLAM_QA_ARENA_PRODUCTION: '1' }).contract
      .clientMode,
    'preview',
  );
  assert.deepEqual(session('nam-de').contract.ports, [5413]);
  assert.deepEqual(session('kim-luan-m3d').contract.channels, [null, 'msedge']);
});

test('unsupported overrides, borrowed services, contradictory endpoints and malformed ports fail explicitly', async () => {
  assert.throws(
    () => session('kim-luan-m3d', { KIM_LUAN_QA_SERVER_PORT: '0' }),
    /does not support/,
  );
  assert.throws(
    () => session('skills', { VOLAM_QA_SERVER_PORT: '2800' }),
    /legacy ports/,
  );
  assert.throws(
    () => session('m3c3', { VOLAM_TEST_PORT_OFFSET: '40' }),
    /does not support/,
  );
  assert.throws(
    () => session('kim-luan-m3d', { KIM_LUAN_QA_SERVER_PORT: '3000' }),
    /does not support/,
  );
  assert.throws(
    () => session('ngu-doc-game', { VOLAM_NGU_DOC_USE_LIVE: '1' }),
    /owned services/,
  );
  assert.throws(
    () => session('duong-mon-game', { VOLAM_DUONG_MON_USE_LIVE: '1' }),
    /owned services/,
  );
  assert.throws(
    () => session('skills', { VITE_SERVER_URL: 'https://example.com' }),
    /configured local/,
  );
  assert.throws(
    () => session('hong-liet', { HONG_LIET_QA_CLIENT_PORT: '70000' }),
    /65535/,
  );
  assert.throws(
    () => session('m3d-r3', { VOLAM_QA_FIXTURE_PORT: '2567' }),
    /distinct/,
  );
  for (const p of [0, -1, 65536, 1.5, '2800'])
    await assert.rejects(requireQaPorts([p]), /integers/);
  assert.equal(
    qaConfigName(['--config=C:\\repo\\playwright.skills.config.ts']),
    'playwright.skills.config.ts',
  );
  assert.throws(() => qaConfigName(['-c']), /requires a path/);
});
