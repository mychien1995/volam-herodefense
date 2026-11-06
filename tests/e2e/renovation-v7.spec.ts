import { test, expect } from '@playwright/test';
import { verifyRenovationV6 } from '../../tools/verify-renovation-v6.mjs';
test('V7 red dragon coils at a shortened endpoint, rises/dives; staff trail and ground crack align in four facings and six-client combat', async ({
  browser,
}) => {
  const r = await verifyRenovationV6(browser, {
    players: 6,
    development: false,
    skills: ['hang_long_hoa_vu', 'pha_giap_bong'],
    evidenceDir: 'docs/evidence/renovation-v7',
  });
  expect(r.status).toBe('PASS');
  expect(r.cases).toHaveLength(8);
  expect(r.party?.peerDamageAgreement).toBe(true);
});
