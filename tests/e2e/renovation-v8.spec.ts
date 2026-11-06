import { test, expect } from '@playwright/test';
import { verifyRenovationV6 } from '../../tools/verify-renovation-v6.mjs';
test('V8 retains long held-staff reach and full forward fissure; multi-target dragon landing has one explosion and no legacy dragon heads', async ({
  browser,
}) => {
  const r = await verifyRenovationV6(browser, {
    players: 6,
    development: false,
    skills: ['hang_long_hoa_vu', 'pha_giap_bong'],
    evidenceDir: 'docs/evidence/renovation-v8',
  });
  expect(r.status).toBe('PASS');
  expect(r.cases).toHaveLength(8);
  expect(r.party?.peerDamageAgreement).toBe(true);
});
