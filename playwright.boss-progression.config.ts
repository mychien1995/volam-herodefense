import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'boss-progression.spec.ts',
  globalSetup: './tests/e2e/boss-progression-setup.ts',
  workers: 1,
  timeout: 120000,
  expect: { timeout: 15000 },
  reporter: 'list',
  outputDir: 'artifacts/boss-progression-browser',
  use: {
    baseURL: `http://127.0.0.1:${process.env['VOLAM_QA_CLIENT_PORT'] ?? 5559}`,
    viewport: { width: 1280, height: 900 },
    video: 'off',
    trace: 'off',
    screenshot: 'only-on-failure',
    launchOptions: {
      args: [
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
      ],
    },
  },
});
