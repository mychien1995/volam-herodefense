import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'tay-doc.spec.ts',
  workers: 1,
  fullyParallel: false,
  timeout: 300000,
  reporter: 'list',
  outputDir: './artifacts/tay-doc-browser',
  use: {
    baseURL: 'http://127.0.0.1:5399',
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
  globalSetup: './tests/e2e/tay-doc-setup.ts',
});
