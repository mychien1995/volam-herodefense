import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'chu-ba-thong.spec.ts',
  workers: 1,
  fullyParallel: false,
  timeout: 300000,
  expect: { timeout: 20000 },
  reporter: 'list',
  outputDir: 'test-results/chu-ba-thong',
  use: {
    baseURL: 'http://127.0.0.1:5399',
    viewport: { width: 1280, height: 720 },
    video: 'off',
    trace: 'off',
    channel: 'msedge',
  },
  globalSetup: './tests/e2e/chu-setup.ts',
});
