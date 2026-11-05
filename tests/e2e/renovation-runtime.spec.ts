import { test, expect } from '@playwright/test';
import { verifyRenovationRuntime } from '../../tools/verify-renovation-runtime.mjs';
test('approved renovation in normal six-player Phaser match', async ({
  browser,
}) => {
  const report = await verifyRenovationRuntime(browser);
  expect(report.status).toBe('PASS');
  expect(report.players).toBe(6);
  expect(report.development).toBe(false);
});
