import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['dong-ta.spec.ts', 'dungeons.spec.ts'],
  workers: 1,
  fullyParallel: false,
  timeout: 240000,
  expect: { timeout: 15000 },
  reporter: 'list',
  outputDir: 'test-results/dong-ta',
  globalSetup: './tests/e2e/dong-ta-setup.ts',
  use: {
    baseURL: 'http://127.0.0.1:5316',
    browserName: 'chromium',
    channel: 'msedge',
    headless: true,
    viewport: { width: 1280, height: 720 },
    video: 'off',
    trace: 'off',
  },
});
