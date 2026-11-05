import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'renovation-preview.spec.ts',
  outputDir: 'artifacts/renovation-v1',
  workers: 1,
  timeout: 180000,
  reporter: [['list']],
  globalSetup: './tests/e2e/renovation-setup.ts',
  use: {
    baseURL: 'http://127.0.0.1:5528',
    viewport: { width: 1366, height: 768 },
    video: 'off',
    trace: 'off',
    launchOptions: process.env['VOLAM_REVIEW_CHROMIUM']
      ? { executablePath: process.env['VOLAM_REVIEW_CHROMIUM'] }
      : {},
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1366, height: 768 },
      },
    },
  ],
});
