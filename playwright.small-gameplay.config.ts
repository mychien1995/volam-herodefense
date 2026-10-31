import { defineConfig, devices } from '@playwright/test';
import { qaEvidenceDirectory } from './tools/qa-session.mjs';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['small-gameplay.spec.ts', 'ui.spec.ts', 'phase1.spec.ts'],
  globalSetup: './tests/e2e/small-gameplay-setup.ts',
  outputDir:
    process.env['VOLAM_QA_PLAYWRIGHT_OUTPUT'] ??
    './artifacts/playwright-small-gameplay',
  workers: 1,
  expect: { timeout: 15000 },
  timeout: 90000,
  reporter: [
    ['list'],
    [
      'json',
      {
        outputFile: `${qaEvidenceDirectory('docs/evidence/small-gameplay')}/playwright-results.json`,
      },
    ],
  ],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:5207',
    video: 'off',
    trace: 'off',
  },
});
