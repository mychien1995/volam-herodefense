import { test, expect } from '@playwright/test';
import { verifyRenovationV5 } from '../../tools/verify-renovation-v5.mjs';
import { verifyRenovationWaveMode } from '../../tools/verify-renovation-v5-wave-mode.mjs';
test('V5 four-direction school art and six-player authoritative combat', async ({
  browser,
}) => {
  const r = await verifyRenovationV5(browser, {
    players: 6,
    development: false,
    full: true,
    scope: 'schools',
  });
  expect(r.status).toBe('PASS');
  expect(r.cases).toHaveLength(17 * 4);
  expect(r.party!.peerDamageAgreement).toBe(true);
});

test('Shaolin distinct four-strike bodies and correctly facing travelling finisher in four directions', async ({
  browser,
}) => {
  const r = await verifyRenovationV5(browser, {
    players: 2,
    development: false,
    full: true,
    scope: 'basics',
  });
  expect(r.status).toBe('PASS');
  expect(r.basics).toHaveLength(4);
});

test('restored M3D boss casts, renovated needle exception and original founder statues', async ({
  browser,
}) => {
  const r = await verifyRenovationV5(browser, {
    players: 2,
    development: false,
    full: true,
    bosses: true,
    scope: 'bosses',
  });
  expect(r.status).toBe('PASS');
  expect(r.bosses!.cases.length).toBeGreaterThan(35);
});
test('wave-boss mode uses level30, full skills, zero cooldown and real first/fifth encounters', async ({
  browser,
}) => {
  expect((await verifyRenovationWaveMode(browser)).status).toBe('PASS');
});
