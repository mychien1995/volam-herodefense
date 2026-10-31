import { defineConfig, devices } from '@playwright/test';
process.env['VOLAM_FEEDBACK_REVIEW'] = '1';
export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './artifacts/playwright-feedback',
  globalSetup: './tests/e2e/feedback-setup.ts',
  workers: 1,
  fullyParallel: false,
  timeout: 180000,
  reporter: [
    ['list'],
    [
      'json',
      { outputFile: 'docs/evidence/m3c3-feedback/playwright-results.json' },
    ],
  ],
  use: { video: 'off', trace: 'off' },
  projects: [
    {
      name: 'feedback-preview',
      testMatch: ['feedback.spec.ts'],
      use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:5212' },
    },
    {
      name: 'feedback-natural',
      testMatch: ['m3c3.spec.ts', 'gameplay.spec.ts', 'dungeons.spec.ts'],
      use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:5210' },
    },
  ],
});
