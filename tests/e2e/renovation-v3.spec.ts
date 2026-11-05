import { test, expect } from '@playwright/test';
import { verifyRenovationV3 } from '../../tools/verify-renovation-v3.mjs';
test('all school skills and boss casts use renovated art in a real six-client match', async ({
  browser,
}) => {
  const report = await verifyRenovationV3(browser, {
    players: 6,
    development: false,
    full: true,
  });
  expect(report.status).toBe('PASS');
  expect(report.skills).toHaveLength(43 * 4);
  expect(report.basics).toHaveLength(8 * 4);
  expect(report.party.peerDamageAgreement).toBe(true);
});
