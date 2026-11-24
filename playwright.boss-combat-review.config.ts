import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'boss-combat-review.spec.ts',
  workers: 1,
  timeout: 120000,
  reporter: 'list',
  outputDir: 'artifacts/boss-readiness/combat-browser',
  use: {
    baseURL: 'http://127.0.0.1:59761',
    viewport: { width: 1440, height: 900 },
    video: 'off',
    trace: 'off',
  },
});
