import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'kim-luan.spec.ts',
  workers: 1,
  fullyParallel: false,
  timeout: 240000,
  reporter: 'list',
  outputDir: './artifacts/kim-luan-browser',
  use: {
    baseURL: 'http://127.0.0.1:5394',
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
  globalSetup: './tests/e2e/kim-luan-setup.ts',
});
