import { test, expect } from '@playwright/test';
import { verifyRenovationV9 } from '../../tools/verify-renovation-v9.mjs';
test('Cai Bang palm basic keeps M3D art for six real A presses in four facings; Phi Long has a dragon head without the old hand', async ({
  browser,
}) => {
  const r = await verifyRenovationV9(browser, {
    players: 6,
    development: false,
  });
  expect(r.status).toBe('PASS');
  expect(r.cases).toHaveLength(9);
  expect(r.party?.peerDamageAgreement).toBe(true);
});
