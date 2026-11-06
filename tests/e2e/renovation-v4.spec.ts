import { test, expect } from '@playwright/test';
import { verifyRenovationV4 } from '../../tools/verify-renovation-v4.mjs';
test('school left/right geometry, eight revised skills in four facings, real max-rank clocks and six-client combat', async ({
  browser,
}) => {
  const r = await verifyRenovationV4(browser);
  expect(r.status).toBe('PASS');
  expect(r.cases).toHaveLength(43 * 2 + 8 * 2);
  expect(r.party.peerDamageAgreement).toBe(true);
});
