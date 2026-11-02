import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['nam-de-gameplay.spec.ts', 'nam-de-visual.spec.ts'],
  workers: 1,
  fullyParallel: false,
  timeout: 240000,
  expect: { timeout: 15000 },
  reporter: 'list',
  outputDir: 'test-results/nam-de-gameplay',
  use: {
    baseURL: 'http://127.0.0.1:5415',
    viewport: { width: 1280, height: 720 },
    channel: 'msedge',
    video: 'off',
    trace: 'off',
  },
  globalSetup: './tests/e2e/nam-de-setup.ts',
});
