import { test, expect } from '@playwright/test';
import { verifyRenovationV9 } from '../../tools/verify-renovation-v9.mjs';
test('Cai Bang uses the renovated body for normal and sixth A while retaining M3D effects and head-only Phi Long', async ({
  browser,
}) => {
  const r = await verifyRenovationV9(browser, {
    players: 6,
    development: false,
    evidenceDir: 'docs/evidence/renovation-v10',
  });
  expect(r.status).toBe('PASS');
  expect(r.cases).toHaveLength(9);
  expect(r.party?.peerDamageAgreement).toBe(true);
});
