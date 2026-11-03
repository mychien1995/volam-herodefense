import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'wave-boss-feedback.spec.ts',
  workers: 1,
  fullyParallel: false,
  timeout: 360_000,
  expect: { timeout: 15_000 },
  reporter: 'list',
  outputDir: 'test-results/wave-boss-feedback',
  globalSetup: './tests/e2e/wave-boss-feedback-setup.ts',
  use: {
    baseURL: `http://127.0.0.1:${process.env['VOLAM_QA_CLIENT_PORT'] ?? 5504}`,
    viewport: { width: 1280, height: 720 },
    video: 'off',
    trace: 'off',
    screenshot: 'off',
    launchOptions: {
      args: [
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
      ],
    },
  },
});
