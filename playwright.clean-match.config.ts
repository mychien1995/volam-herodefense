import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'clean-match.spec.ts',
  globalSetup: './tests/e2e/clean-match-setup.ts',
  outputDir: './artifacts/playwright-clean-match',
  workers: 1,
  timeout: 90000,
  reporter: [
    ['list'],
    [
      'json',
      { outputFile: 'docs/evidence/clean-match/playwright-results.json' },
    ],
  ],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:5196',
    video: 'off',
    trace: 'off',
  },
});
