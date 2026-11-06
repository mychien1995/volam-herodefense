import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'vuong-trung-duong.spec.ts',
  globalSetup: './tests/e2e/vuong-trung-duong-setup.ts',
  workers: 1,
  timeout: 220_000,
  expect: { timeout: 15_000 },
  reporter: 'list',
  outputDir:
    process.env['VOLAM_QA_PLAYWRIGHT_OUTPUT'] ??
    'test-results/vuong-trung-duong',
  use: {
    baseURL: `http://127.0.0.1:${process.env['VOLAM_QA_CLIENT_PORT'] ?? 5532}`,
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
