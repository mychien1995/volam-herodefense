import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'hong-liet.spec.ts',
  workers: 1,
  fullyParallel: false,
  timeout: 240000,
  reporter: 'list',
  outputDir: './artifacts/hong-liet-browser',
  use: {
    baseURL: `http://127.0.0.1:${process.env['HONG_LIET_QA_CLIENT_PORT'] ?? 5391}`,
    viewport: { width: 1440, height: 1000 },
    video: 'off',
    trace: 'off',
    launchOptions: {
      channel: 'msedge',
      args: [
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
      ],
    },
  },
  projects: [
    {
      name: 'edge',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 1000 },
      },
    },
  ],
  globalSetup: './tests/e2e/hong-liet-setup.ts',
});
