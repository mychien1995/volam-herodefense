import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['ly-mac-sau.spec.ts', 'dungeons.spec.ts'],
  workers: 1,
  fullyParallel: false,
  timeout: 300000,
  expect: { timeout: 15000 },
  reporter: 'list',
  outputDir: 'test-results/ly-mac-sau',
  use: {
    baseURL: 'http://127.0.0.1:5309',
    browserName: 'chromium',
    channel: 'msedge',
    headless: true,
    viewport: { width: 1280, height: 720 },
    video: 'off',
    trace: 'off',
  },
  globalSetup: './tests/e2e/ly-mac-sau-setup.ts',
});
