import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'ngu-doc-preview.spec.ts',
  outputDir: 'artifacts/ngu-doc-preview',
  workers: 1,
  timeout: 45000,
  reporter: 'list',
  globalSetup: './tests/e2e/ngu-doc-preview-setup.ts',
  use: {
    baseURL: 'http://127.0.0.1:5535',
    video: 'off',
    trace: 'off',
    launchOptions: process.env['VOLAM_REVIEW_CHROMIUM']
      ? { executablePath: process.env['VOLAM_REVIEW_CHROMIUM'] }
      : {},
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
