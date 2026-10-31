import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['small-gameplay.spec.ts', 'ui.spec.ts', 'phase1.spec.ts'],
  globalSetup: './tests/e2e/small-gameplay-setup.ts',
  outputDir: './artifacts/playwright-small-gameplay',
  workers: 1,
  expect: { timeout: 15000 },
  timeout: 90000,
  reporter: [
    ['list'],
    [
      'json',
      { outputFile: 'docs/evidence/small-gameplay/playwright-results.json' },
    ],
  ],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:5207',
    video: 'off',
    trace: 'off',
  },
});
