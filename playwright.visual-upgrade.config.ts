import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'visual-upgrade-2.spec.ts',
  outputDir: 'artifacts/visual-upgrade-2',
  workers: 1,
  timeout: 60000,
  reporter: [['list']],
  globalSetup: './tests/e2e/visual-upgrade-setup.ts',
  use: {
    baseURL: 'http://127.0.0.1:5527',
    video: 'off',
    trace: 'off',
    launchOptions: process.env['VOLAM_REVIEW_CHROMIUM']
      ? { executablePath: process.env['VOLAM_REVIEW_CHROMIUM'] }
      : {},
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
