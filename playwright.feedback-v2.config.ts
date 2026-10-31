import { defineConfig, devices } from '@playwright/test';
process.env['VOLAM_FEEDBACK_V2_REVIEW'] = '1';
export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './artifacts/playwright-feedback-v2',
  globalSetup: './tests/e2e/feedback-v2-setup.ts',
  workers: 1,
  fullyParallel: false,
  timeout: 240000,
  reporter: [
    ['list'],
    [
      'json',
      {
        outputFile:
          'docs/evidence/m3c3-feedback-v2-runtime/playwright-results.json',
      },
    ],
  ],
  use: { video: 'off', trace: 'off' },
  projects: [
    {
      name: 'feedback-v2-preview',
      testMatch: ['feedback-v2.spec.ts'],
      use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:5232' },
    },
    {
      name: 'feedback-v2-natural',
      testMatch: ['m3c3.spec.ts', 'gameplay.spec.ts'],
      use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:5230' },
    },
  ],
});
