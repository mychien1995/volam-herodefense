import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'renovation-runtime.spec.ts',
  workers: 1,
  timeout: 240000,
  reporter: [['list']],
  use: {
    video: 'off',
    trace: 'off',
    launchOptions: process.env['VOLAM_REVIEW_CHROMIUM']
      ? { executablePath: process.env['VOLAM_REVIEW_CHROMIUM'] }
      : {},
  },
});
