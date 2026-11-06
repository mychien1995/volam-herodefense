import { test, expect } from '@playwright/test';
import { verifyRenovationV6 } from '../../tools/verify-renovation-v6.mjs';
test('V6 four-facing original palms, turning dragon, held staff slam, larger flurry, no hand/dome and six-player combat', async ({
  browser,
}) => {
  const r = await verifyRenovationV6(browser, {
    players: 6,
    development: false,
  });
  expect(r.status).toBe('PASS');
  expect(r.cases).toHaveLength(24);
  expect(r.party!.peerDamageAgreement).toBe(true);
});
test('V6 five wave-boss families restore M3D with only requested new-art exceptions', async ({
  browser,
}) => {
  const r = await verifyRenovationV6(browser, {
    players: 2,
    development: false,
    scope: 'bosses',
  });
  expect(r.status).toBe('PASS');
  expect(r.bosses!.cases.length).toBeGreaterThan(35);
});
