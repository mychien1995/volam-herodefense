import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'wave-boss-test.spec.ts',
  workers: 1,
  fullyParallel: false,
  timeout: 300000,
  reporter: 'list',
  outputDir: './artifacts/wave-boss-test',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: `http://127.0.0.1:${process.env['VOLAM_QA_CLIENT_PORT'] ?? 5496}`,
    viewport: { width: 1280, height: 900 },
    video: 'off',
    trace: 'off',
    launchOptions: {
      args: [
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
      ],
    },
  },
  globalSetup: './tests/e2e/wave-boss-test-setup.ts',
});
