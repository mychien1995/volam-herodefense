import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'campaign.spec.ts',
  globalSetup: './tests/e2e/campaign-setup.ts',
  workers: 1,
  timeout: 150000,
  expect: { timeout: 15000 },
  reporter: 'list',
  outputDir: 'artifacts/campaign-browser',
  use: {
    baseURL: `http://127.0.0.1:${process.env['VOLAM_QA_CLIENT_PORT'] ?? 5546}`,
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
