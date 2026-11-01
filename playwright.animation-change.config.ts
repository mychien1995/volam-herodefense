import { defineConfig, devices } from '@playwright/test';
process.env['VOLAM_ANIMATION_CHANGE'] = '1';
export default defineConfig({
  testDir: './tests/e2e',
  outputDir: 'artifacts/animation-change',
  globalSetup: './tests/e2e/animation-change-setup.ts',
  workers: 1,
  fullyParallel: false,
  timeout: 300000,
  reporter: [
    ['list'],
    [
      'json',
      {
        outputFile:
          process.env['VOLAM_ANIMATION_REPORT'] ??
          'docs/evidence/animation-change/playwright-results.json',
      },
    ],
  ],
  use: {
    ...devices['Desktop Chrome'],
    video: 'off',
    trace: 'off',
    actionTimeout: 30000,
  },
  projects: [
    {
      name: 'approved-animation-live',
      testMatch: 'animation-change.spec.ts',
      use: { baseURL: 'http://127.0.0.1:5442' },
    },
    {
      name: 'approved-animation-natural',
      testMatch: 'm3c3.spec.ts',
      grep: /six-player natural/,
      use: { baseURL: 'http://127.0.0.1:5440' },
    },
  ],
});
