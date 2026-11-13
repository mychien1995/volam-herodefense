import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'duong-mon.spec.ts',
  outputDir: 'artifacts/duong-mon',
  workers: 1,
  timeout: 60_000,
  globalSetup: './tests/e2e/duong-mon-setup.ts',
  use: {
    baseURL: 'http://127.0.0.1:5557',
    browserName: 'chromium',
    channel: 'chrome',
    viewport: { width: 1280, height: 720 },
    video: 'off',
    trace: 'off',
  },
});
